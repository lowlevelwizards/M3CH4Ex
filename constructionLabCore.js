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
  installDefaultAnatomy,detachAnatomyBranch,installAnatomyBranch,swapShin,
  detachWholeLeg,restoreWholeLeg,temporarilyStripLegs,reinstateLegs,partStowList,
  restoreAnatomyBlueprint
} from './constructionAnatomy.js';

export const LAB_BLUEPRINT_VERSION=3;
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
  const machineCheck={...rawCheck,
    massKg:rigAnatomyMass(assembly,rawCheck.massKg),
    ready:rawCheck.ready&&mobility.complete};
  return {graph,graphCheck,machineCheck,mobility,
    valid:graphCheck.valid,ready:machineCheck.ready};
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
  if(action==='swap'&&section==='shin')return swapShin(assembly,side,options.variant||'rook');
  return {ok:false,reason:'Unsupported anatomical operation'};
}
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
        .map(n=>({...n})),
      stowed:structuredClone(assembly.labStowed||{})
    }};
}
export function loadLabBlueprint(input){
  if(!input||input.format!=='m3ch4-construction-lab'||![1,2,LAB_BLUEPRINT_VERSION].includes(input.version)
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
  const result=labInspection(machine);
  if(!result.valid)throw new Error(result.graphCheck.errors.join(' '));
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
