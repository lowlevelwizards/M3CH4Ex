/** Standalone laboratory state. Reuses production parts, serials and graph validation.
 * No DOM, Three.js, savegame or campaign dependencies. The lab never mutates
 * the main game's persistent machine and never claims arbitrary socket editing.
 */
import {
  SLOTS, BY_ID, makeTestAssembly, equip, inspectAssembly, assemblyGraph,
  setGeneratorMount, generatorMount, validateGraph
} from './components.js';
import {
  LEG_SIDES, YARD_LEG_IDS, YARD_LEG_KG,
  installedLeg,yardLegSupported,captureLegInstallations
} from './constructionLegs.js';
import {
  ANATOMY_ORDER,anatomyId,sectionStatus,anatomyReadiness,rigAnatomyMass,
  installedLimbGeometry,
  installDefaultAnatomy,detachAnatomyBranch,installAnatomyBranch,
  replaceAnatomyComponent,swapShin,
  detachWholeLeg,restoreWholeLeg,temporarilyStripLegs,reinstateLegs,partStowList,
  restoreAnatomyBlueprint
} from './constructionAnatomy.js';
import {
  currentPose,setJointAngle,applyPosePreset,validatePose,articulationReport
} from './constructionArticulation.js';
import {
  neutralGrounding,groundedTargets,applyGrounding,returnToManual,
  validateGrounding,solveGroundedRig,contactWalkFrame
} from './constructionGroundedPose.js';

export const LAB_BLUEPRINT_VERSION=7;
export const LAB_SLOTS=Object.freeze([...SLOTS]);
export const LAB_PARTS=Object.freeze([...BY_ID.values()]);
export const DEFAULT_LAB_SELECTION=Object.freeze({slot:'structure',tab:'catalog'});

export function createLabMachine(){
  const machine=makeTestAssembly();
  for(const side of LEG_SIDES){
    const result=restoreWholeLeg(machine,side);
    if(!result.ok)throw new Error('Could not assemble '+side+' leg: '+result.reason);
  }
  return machine;
}

export function labInspection(assembly){
  const graph=assemblyGraph(assembly);
  const graphCheck=validateGraph(graph,assembly,BY_ID);
  const rawCheck=inspectAssembly(assembly);
  const legs=LEG_SIDES.filter(side=>installedLeg(assembly,side)).length;
  const mobility={legs,complete:anatomyReadiness(assembly)};
  const articulation=articulationReport(assembly);
  const machineCheck={...rawCheck,
    massKg:rigAnatomyMass(assembly,rawCheck.massKg),
    ready:rawCheck.ready&&mobility.complete&&articulation.valid};
  return {graph,graphCheck,machineCheck,mobility,articulation,
    valid:graphCheck.valid&&articulation.errors.length===0,ready:machineCheck.ready};
}

/** Stage 02–05: slot swaps remain transactions through existing production rules.
 * Later bespoke construction code will use proposeAttachment on generic child nodes.
 */
export function labEquip(assembly,slot,definitionId){
  if(!LAB_SLOTS.includes(slot)) return {ok:false,reason:'Unknown station.'};
  const def=BY_ID.get(definitionId);
  if(!def || def.slot!==slot) return {ok:false,reason:'Part cannot occupy this station.'};
  const prior=generatorMount(assembly);
  // Snapshot must precede *all* mutations, including moving the outrigger.
  const snapshot=structuredClone(assembly);
  try {
    const previousLegs=captureLegInstallations(assembly);
    if(yardLegSupported(assembly))temporarilyStripLegs(assembly);
    if(prior==='offset') {
      const reset=setGeneratorMount(assembly,'standard');
      if(!reset.ok) throw new Error(reset.reason);
    }
    equip(assembly,slot,definitionId);
    const verdict=labInspection(assembly);
    if(!verdict.valid) throw new Error(verdict.graphCheck.errors.join(' '));
    if(prior==='offset' && slot!=='power') {
      const restore=setGeneratorMount(assembly,'offset');
      if(!restore.ok) throw new Error(restore.reason);
    }
    // A newly installed Yardwalker receives both of its owned legs by default.
    // Otherwise restore exactly the prior left/right detach state.
    reinstateLegs(assembly,
      slot==='mobility'&&definitionId==='legs-yard'&&!yardLegSupported(snapshot)
        ? {left:true,right:true} : previousLegs);
    const final=labInspection(assembly);
    if(!final.valid)throw new Error(final.graphCheck.errors.join(' '));
    return {ok:true,assembly};
  }catch(error){
    Object.keys(assembly).forEach(key=>delete assembly[key]);
    Object.assign(assembly,snapshot);
    return {ok:false,reason:error.message};
  }
}
export function labSetGeneratorMount(assembly,position){
  if(!['standard','offset'].includes(position))return {ok:false,reason:'Unknown generator mount.'};
  const snapshot=structuredClone(assembly);
  try {
    const installed=captureLegInstallations(assembly);
    if(yardLegSupported(assembly))temporarilyStripLegs(assembly);
    const result=setGeneratorMount(assembly,position);
    if(!result.ok)throw new Error(result.reason);
    reinstateLegs(assembly,installed);
    return {ok:true,position};
  }catch(error){
    Object.keys(assembly).forEach(key=>delete assembly[key]);
    Object.assign(assembly,snapshot);
    return {ok:false,reason:error.message};
  }
}
export function labLegAction(assembly,side,action){
  if(!LEG_SIDES.includes(side))return {ok:false,reason:'Unknown hip side'};
  if(!['attach','detach'].includes(action))return {ok:false,reason:'Unknown leg action'};
  const snapshot=structuredClone(assembly);
  const result=action==='attach'?restoreWholeLeg(assembly,side):detachWholeLeg(assembly,side);
  if(!result.ok || !labInspection(assembly).valid){
    Object.keys(assembly).forEach(key=>delete assembly[key]);
    Object.assign(assembly,snapshot);
    return {ok:false,reason:result.reason||'Resulting assembly is invalid'};
  }
  return result;
}
export function labSectionDetails(assembly){
  return LEG_SIDES.map(side=>sectionStatus(assembly,side));
}
export function labStowed(assembly){return partStowList(assembly);}
export function labSectionAction(assembly,side,section,action,options={}){
  if(!LEG_SIDES.includes(side)||!ANATOMY_ORDER.includes(section))
    return {ok:false,reason:'Unknown anatomical section'};
  if(action==='detach')return detachAnatomyBranch(assembly,side,section,
    {cascade:!!options.cascade});
  if(action==='attach')return installAnatomyBranch(assembly,side,section,
    {variant:options.variant||'original'});
  if(action==='swap'){
    const snapshot=structuredClone(assembly);
    const wasGrounded=assembly.labGrounding?.mode==='grounded';
    const result=replaceAnatomyComponent(assembly,side,section,options.variant||'original');
    if(!result.ok)return result;
    // Generic swapping affects geometry and/or sole contact height.
    // If the assembled leg can stand, recompute grounded IK using only new
    // component metadata; the caller cannot replace foot placement by eye.
    if(anatomyReadiness(assembly)&&(wasGrounded||options.variant!=='original')){
      const pose=wasGrounded&&snapshot.labGrounding?.bodyDropM>0?'crouch':'neutral';
      const grounded=labAssistedPreset(assembly,pose);
      if(!grounded.ok){
        Object.keys(assembly).forEach(key=>delete assembly[key]);
        Object.assign(assembly,snapshot);
        return {ok:false,reason:'Mechanical interfaces fit but no valid grounded stance: '+grounded.reason};
      }
      return {...result,grounded,stanceAdjusted:grounded.limited};
    }
    return result;
  }
  return {ok:false,reason:'Unsupported anatomical operation'};
}
export function labJointAction(assembly,side,joint,degrees){
  const snapshot=structuredClone(assembly);
  // Direct hinge manipulation deliberately leaves foot-target IK mode.
  if(assembly.labGrounding?.mode==='grounded')returnToManual(assembly);
  const result=setJointAngle(assembly,side,joint,degrees);
  if(!result.ok)return result;
  const verdict=articulationReport(assembly);
  if(!verdict.valid){
    Object.keys(assembly).forEach(key=>delete assembly[key]);
    Object.assign(assembly,snapshot);
    return {ok:false,reason:verdict.errors.concat(verdict.warnings).join('; ')};
  }
  assembly.labManualPose=structuredClone(assembly.labPose);
  return result;
}
export function labPosePreset(assembly,name){
  const snapshot=structuredClone(assembly);
  if(assembly.labGrounding?.mode==='grounded')returnToManual(assembly);
  const result=applyPosePreset(assembly,name);
  if(!result.ok)return result;
  const report=articulationReport(assembly);
  if(!report.valid){
    Object.keys(assembly).forEach(key=>delete assembly[key]);
    Object.assign(assembly,snapshot);
    return {ok:false,reason:report.errors.concat(report.warnings).join('; ')};
  }
  assembly.labManualPose=structuredClone(assembly.labPose);
  return result;
}
export function labPose(assembly){return currentPose(assembly);}
export function labGrounding(assembly){return structuredClone(assembly.labGrounding||neutralGrounding());}
/** A failed kinematic request is never silently clipped. When the user requests
 * a preset the controller reports its attainable scaled travel explicitly.
 * Its target remains an actual, shared world-space ankle reference.
 */
export function labSolveGrounded(assembly,targets){
  return solveGroundedRig(targets,{upperLowerForSide:side=>installedLimbGeometry(assembly,side)});
}
export function labAssistedPreset(assembly,name){
  const snapshot=structuredClone(assembly);
  try{
    if(!yardLegSupported(assembly)||!anatomyReadiness(assembly))
      return {ok:false,reason:'Serviceable Yardwalker legs must be installed for grounded posing.'};
    const requested=groundedTargets(name);
    let chosen=null,solved=null,scale=1;
    // Scale motion about grounded support anchors, NOT independently per foot.
    // The requested values are shown to the player if reduced.
    for(let i=0;i<=60;i++){
      scale=1-i/60;
      const g=structuredClone(requested);
      g.bodyDropM=Math.round(requested.bodyDropM*scale*10000)/10000;
      for(const side of LEG_SIDES){
        g.feet[side].y=Math.round(requested.feet[side].y*scale*10000)/10000;
        g.feet[side].z=Math.round(requested.feet[side].z*scale*10000)/10000;
      }
      solved=labSolveGrounded(assembly,g);
      if(solved.ok){chosen=g;break;}
    }
    if(!chosen)throw Error('No grounded stance is reachable with the installed mechanical lengths and joint limits.');
    const result=applyGrounding(assembly,chosen,
      {upperLowerForSide:side=>installedLimbGeometry(assembly,side)});
    if(!result.ok)throw Error(result.reason);
    return {ok:true,mode:'grounded',contacts:result.contacts,
      requestedDropM:requested.bodyDropM,achievedDropM:chosen.bodyDropM,
      movementScale:scale,limited:scale<.999};
  }catch(error){
    Object.keys(assembly).forEach(key=>delete assembly[key]);
    Object.assign(assembly,snapshot);
    return {ok:false,reason:error.message};
  }
}
/** A single fixed stride envelope per build avoids changing the planted
 * foot's target mid-step and therefore prevents adaptive foot sliding.
 */
export function labMotionEnvelope(assembly){
  const mechanics=LEG_SIDES.map(side=>installedLimbGeometry(assembly,side));
  const extra=Math.max(0,...mechanics.map(x=>x?.extraReachM||0));
  const candidate={liftM:Math.max(.025,.10-extra*.46),
    stepDistanceM:Math.max(.16,.25-extra*.35),
    bodyDropM:Math.max(.02,.04-extra*.08)};
  for(let scale=1;scale>=.35;scale-=.05){
    const cfg={liftM:candidate.liftM*scale,
      stepDistanceM:candidate.stepDistanceM*scale,bodyDropM:candidate.bodyDropM*scale};
    let valid=true;
    for(let i=0;i<=40;i++){
      const report=labSolveGrounded(assembly,contactWalkFrame(i/40,cfg));
      if(!report.ok){valid=false;break;}
    }
    if(valid)return {ok:true,...cfg,scale:Math.round(scale*100)/100};
  }
  return {ok:false,reason:'No continuous two-step envelope is compatible with installed joint limits.'};
}
export function labGuidedWalkFrame(assembly,phase,envelope=null){
  if(!Number.isFinite(phase))return {ok:false,reason:'Invalid step progress'};
  if(!yardLegSupported(assembly)||!anatomyReadiness(assembly))
    return {ok:false,reason:'Both serviceable legs required'};
  const fit=envelope||labMotionEnvelope(assembly);
  if(!fit.ok)return fit;
  return applyGrounding(assembly,contactWalkFrame(phase,fit),
    {upperLowerForSide:side=>installedLimbGeometry(assembly,side)});
}
export function labViability(assembly){
  const inspection=labInspection(assembly);
  const connected=inspection.graphCheck.valid;
  if(!yardLegSupported(assembly))
    return {structure:connected,ground:false,reason:'Serviceable stance study requires Yardwalker',
      clearance:'UNVERIFIED'};
  if(!anatomyReadiness(assembly))
    return {structure:connected,ground:false,reason:'A leg or a supported assembly is detached',
      clearance:'UNVERIFIED'};
  const stand=labSolveGrounded(assembly,groundedTargets('neutral'));
  const crouch=labSolveGrounded(assembly,groundedTargets('crouch'));
  const stride=labMotionEnvelope(assembly);
  const legs=Object.fromEntries(LEG_SIDES.map(side=>[side,installedLimbGeometry(assembly,side)]));
  return {structure:connected,ground:stand.ok,standReason:stand.reason||null,
    fullCrouch:crouch.ok,crouchReason:crouch.reason||null,
    walkPreview:stride.ok,walkReason:stride.reason||null,
    stride:stride.ok?stride:null,legs,
    clearance:'UNVERIFIED: broad-phase overlap hints only',
    status:!stand.ok?'CANNOT STAND':crouch.ok?'GROUNDABLE':'LIMITED CROUCH'};
}
export function labReturnManual(assembly){return returnToManual(assembly);}
export function labLegDetails(assembly){
  return LEG_SIDES.map(side=>{
    const part=assembly.owned.find(p=>p.definitionId===YARD_LEG_IDS[side]);
    return {side,serial:part?.serial||null,definitionId:YARD_LEG_IDS[side],
      installed:installedLeg(assembly,side),socket:'hip-'+side,
      massKg:YARD_LEG_KG,parentSerial:assembly.installed.mobility};
  });
}
export function labBlueprint(assembly){
  const inspection=labInspection(assembly);
  if(!inspection.valid)throw new Error('Invalid assembly graph cannot be exported.');
  const stations={};
  for(const slot of LAB_SLOTS) {
    const part=assembly.owned.find(p=>p.serial===assembly.installed[slot]);
    stations[slot]=part?.definitionId || null;
  }
  return {format:'m3ch4-construction-lab',version:LAB_BLUEPRINT_VERSION,
    stations,generatorMount:generatorMount(assembly),
    legs:Object.fromEntries(LEG_SIDES.map(side=>[side,installedLeg(assembly,side)])),
    anatomy:{
      nodes:Object.values(inspection.graph.nodes)
        .filter(node=>BY_ID.get(node.definitionId)?.assemblyRole==='anatomy')
        .map(n=>({...n})).sort((a,b)=>a.serial.localeCompare(b.serial)),
      stowed:structuredClone(assembly.labStowed||{})
    },
    pose:currentPose(assembly),
    grounding:labGrounding(assembly),
    manualPose:structuredClone(assembly.labManualPose||currentPose(assembly))};
}
export function loadLabBlueprint(input){
  if(!input||input.format!=='m3ch4-construction-lab'||![1,2,3,4,5,6,LAB_BLUEPRINT_VERSION].includes(input.version)
    ||!input.stations||typeof input.stations!=='object'
    ||Object.keys(input.stations).some(k=>!LAB_SLOTS.includes(k)))
      throw new Error('Unsupported or invalid lab blueprint.');
  const machine=createLabMachine();
  // Fixed stage 1–5 format: all five stations are required.
  for(const slot of LAB_SLOTS){
    if(typeof input.stations[slot]!=='string')
      throw new Error('Blueprint must declare all five current stations.');
    const r=labEquip(machine,slot,input.stations[slot]);
    if(!r.ok)throw new Error(r.reason);
  }
  if(input.generatorMount==='offset'){
    const r=labSetGeneratorMount(machine,'offset');
    if(!r.ok)throw new Error(r.reason);
  }else if(input.generatorMount!=='standard')
    throw new Error('Unsupported generator mount.');
  if(input.version>=2){
    if(!input.legs||LEG_SIDES.some(side=>typeof input.legs[side]!=='boolean'))
      throw new Error('Blueprint requires explicit left and right leg states.');
    if(input.version===2){
      if(yardLegSupported(machine))for(const side of LEG_SIDES) {
        const r=labLegAction(machine,side,input.legs[side]?'attach':'detach');
        if(!r.ok)throw new Error(r.reason);
      } else if(LEG_SIDES.some(side=>input.legs[side]))
        throw new Error('Only Yardwalker hips currently support independent legs.');
    } else {
      const restored=restoreAnatomyBlueprint(machine,input.anatomy,input.legs);
      if(!restored.ok)throw new Error(restored.reason);
    }
  }
  if(input.version>=4){
    const tested=validatePose(input.pose);
    if(!tested.valid)throw new Error(tested.errors.join('; '));
    machine.labPose={...input.pose};
    const articulated=articulationReport(machine);
    if(!articulated.valid)throw new Error(articulated.errors.concat(articulated.warnings).join('; '));
  }
  if(input.version>=5){
    const validated=validateGrounding(input.grounding),manual=validatePose(input.manualPose);
    if(!validated.valid||!manual.valid)
      throw new Error([...validated.errors,...manual.errors].join('; '));
    machine.labManualPose={...input.manualPose};
    if(input.grounding.mode==='grounded'){
      const computed=labSolveGrounded(machine,input.grounding);
      if(!computed.ok)throw new Error(computed.reason);
      for(const [key,value] of Object.entries(computed.pose))
        if(Math.abs(value-machine.labPose[key])>.003)
          throw new Error('Grounded foot targets disagree with stored joint positions');
    }
    machine.labGrounding=structuredClone(input.grounding);
  }
  const result=labInspection(machine);
  if(!result.valid)throw new Error(result.graphCheck.errors.concat(result.articulation.errors).join(' '));
  return machine;
}
export function labNodeList(assembly){
  const graph=assemblyGraph(assembly);
  const output=[];
  const seen=new Set();
  function visit(serial,depth){
    if(seen.has(serial))return;
    const node=graph.nodes[serial];
    if(!node)return;
    seen.add(serial);
    const def=BY_ID.get(node.definitionId);
    output.push({serial,definitionId:node.definitionId,
      name:def?.name || (node.definitionId==='hip-h2-u1'?'H2/U1 hip conversion ring':'Generator offset bracket'),
      parentSerial:node.parentSerial,parentSocket:node.parentSocket,
      virtual:!!node.virtual,depth});
    Object.values(graph.nodes).filter(n=>n.parentSerial===serial)
      .forEach(child=>visit(child.serial,depth+1));
  }
  if(graph.root)visit(graph.root,0);
  return output;
}
