/** Stage 07: six real serviceable anatomical assemblies per Yardwalker leg.
 * Pure graph/state, no visual or combat dependencies. A shim is not a cosmetic
 * overlay: changing it changes the actual node and its mass / interface.
 */
import {CATALOG,BY_ID,assemblyGraph,proposeAttachment,proposeRemoval,validateGraph} from './components.js';
import {LEG_SIDES,YARD_LEG_IDS,ownedLeg,yardLegSupported,YARD_LEG_KG} from './constructionLegs.js';
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';
import {proposeComponentReplacement} from './assemblyGraph.js';

export const ANATOMY_ORDER=Object.freeze(['hip','thigh','knee','shin','ankle','foot']);
export const ANATOMY_MASS=Object.freeze({hip:80,thigh:140,knee:65,shin:110,ankle:45,foot:60});
export const ROOK_SHIN_KG=90;
export const PYLON_SHIN_KG=135;
export const PYLON_EXTENSION_M=.16;
export const FORGE_THIGH_SHORTEN_M=.075;
export const DOCKPAD_EXTRA_SOLE_M=.04;
export const SHIN_VARIANTS=Object.freeze(['original','rook','extended']);
export const THIGH_VARIANTS=Object.freeze(['original','compact']);
export const FOOT_VARIANTS=Object.freeze(['original','stabilizer']);
export const SECTION_VARIANTS=Object.freeze({
  hip:['original'],thigh:THIGH_VARIANTS,knee:['original'],
  shin:SHIN_VARIANTS,ankle:['original'],foot:FOOT_VARIANTS
});
/** Structural joint coordinates are owned by the *installed component*.
 * Both game visualization and grounded IK use these same definitions.
 */
export const ANATOMY_SOCKET=Object.freeze({hip:'hip-core',thigh:'thigh',knee:'knee',shin:'shin',ankle:'ankle',foot:'foot'});
const offset=(a,b)=>a.map((x,i)=>x-b[i]);
export const anatomyId=(side,section,variant='original')=>
  section==='shin' && variant==='rook'?'rook-s2-shin-'+side:
  section==='shin' && variant==='extended'?'pylon-l1-shin-'+side:
  section==='thigh' && variant==='compact'?'forge-t2-thigh-'+side:
  section==='foot' && variant==='stabilizer'?'dockpad-f2-foot-'+side:
  'yard-'+section+'-'+side;
export const alternativeShinId=side=>anatomyId(side,'shin','rook');
export const standardShinId=side=>anatomyId(side,'shin');

for(const side of LEG_SIDES){
  const layout=YARDWALKER_LAYOUT.legs.find(x=>x.side===(side==='left'?-1:1));
  if(!layout)throw new Error('Missing '+side+' authored leg anchors');
  const delta={knee:offset(layout.knee,layout.hip),
    ankle:offset(layout.ankle,layout.knee),
    foot:offset(layout.foot,layout.ankle)};
  const sockets={
    hip:{id:'thigh',position:[0,0,0],maxLoadKg:465},
    thigh:{id:'knee',position:delta.knee,maxLoadKg:325},
    knee:{id:'shin',position:[0,0,0],maxLoadKg:260},
    shin:{id:'ankle',position:delta.ankle,maxLoadKg:120},
    ankle:{id:'foot',position:delta.foot,maxLoadKg:70},
    foot:null
  };
  const leg=BY_ID.get(YARD_LEG_IDS[side]);
  leg.includedChildMassKg=YARD_LEG_KG;
  leg.sockets=[{id:ANATOMY_SOCKET.hip,standard:'medium',
    position:[0,0,0],maxLoadKg:540,normal:[side==='left'?-1:1,0,0],
    acceptsRole:'hip',roleHint:'leg-anatomy',description:'Authoritative hip-assembly connection'}];
  for(const section of ANATOMY_ORDER){
    const variants=SECTION_VARIANTS[section];
    for(const variant of variants){
      const id=anatomyId(side,section,variant);
      const kg=variant==='rook'?ROOK_SHIN_KG:
        variant==='extended'?PYLON_SHIN_KG:
        variant==='compact'?125:
        variant==='stabilizer'?88:ANATOMY_MASS[section];
      const attach=section==='shin'?{
        ...sockets.shin,
        position:variant==='extended'?
          [delta.ankle[0],delta.ankle[1]-PYLON_EXTENSION_M,delta.ankle[2]]
          :[...delta.ankle]
      }:section==='thigh'?{
        ...sockets.thigh,
        position:variant==='compact'?
          [delta.knee[0],delta.knee[1]+FORGE_THIGH_SHORTEN_M,delta.knee[2]]
          :[...delta.knee]
      }:sockets[section];
      const def={
        id,name:variant==='rook'?'Rook Industrial S2 / '+side+' narrow-spar shin':
          variant==='extended'?'Pylon L1 / '+side+' extended-load shin':
          variant==='compact'?'Forge T2 / '+side+' compact-geometry thigh':
          variant==='stabilizer'?'Dockpad F2 / '+side+' broad stabilizer foot':
          'Yardwalker '+side+' '+section,slot:'anatomy',side,
        section,variant,assemblyRole:'anatomy',massKg:kg,mountSize:'medium',
        mountInterface:{kind:section,standard:'medium',
          orientation:[0,1,0],family:'Yardwalker anatomy'},
        mechanical:section==='thigh'?{
          hipReceiver:[0,0,0],kneeReceiver:[...attach.position],
          spanM:Math.hypot(...attach.position),
          nominalExtraReachM:variant==='compact'?-FORGE_THIGH_SHORTEN_M:0,
          upperStandard:'medium',lowerStandard:'medium'
        }:section==='foot'?{
          ankleReceiver:[0,0,0],
          groundContactDropM:variant==='stabilizer'?DOCKPAD_EXTRA_SOLE_M:0,
          footprintM:variant==='stabilizer'?[.84,1.02]:[.60,.76],
          contactStandard:'medium'
        }:section==='shin'?{
          kneeReceiver:[0,0,0],ankleReceiver:[...attach.position],
          spanM:Math.hypot(...attach.position),
          nominalExtraReachM:variant==='extended'?PYLON_EXTENSION_M:0,
          upperStandard:'medium',lowerStandard:'medium'
        }:undefined,
        sockets:attach?[{...attach,standard:'medium',
          acceptsRole:section==='hip'?'thigh':section==='thigh'?'knee':
            section==='knee'?'shin':section==='shin'?'ankle':'foot',
          roleHint:'anatomy',normal:[0,1,0]}]:[],
        description:variant==='rook'
          ?'Narrow twin load spars and exposed axial drive. Uses the original knee and ankle interface geometry.'
          :variant==='extended'
          ?'160 mm longer knee-to-ankle span; dual load spars, braced central drive and service collars.'
          :variant==='compact'
          ?'75 mm shorter hip-to-knee linkage with twin offset compression spars. Compatible medium knee interface.'
          :variant==='stabilizer'
          ?'Broad outriggers and 40 mm deeper contact sole; changes actual ground-contact height.'
          :'Original authored '+section+' assembly, separable at mechanical interface.',
      };
      if(!BY_ID.has(id)){CATALOG.push(def);BY_ID.set(id,def);}
    }
  }
}
const ownedFor=(assembly,id)=>assembly.owned.find(x=>x.definitionId===id);
const getNode=(assembly,id)=>{const x=ownedFor(assembly,id);return x&&assemblyGraph(assembly).nodes[x.serial]};
const activeNode=(assembly,side,section)=>{
  const graph=assemblyGraph(assembly);
  return Object.values(graph.nodes).find(n=>{
    const def=BY_ID.get(n.definitionId);
    return def?.assemblyRole==='anatomy'&&def.side===side&&def.section===section;
  })||null;
};
export function sectionStatus(assembly,side){
  if(!LEG_SIDES.includes(side))throw new Error('Unknown leg side');
  const leg=ownedLeg(assembly,side),graph=assemblyGraph(assembly);
  return {side,legSerial:leg?.serial,legInstalled:!!graph.nodes[leg?.serial],
    sections:Object.fromEntries(ANATOMY_ORDER.map(section=>{
      const node=activeNode(assembly,side,section);
      return [section,node?{installed:true,serial:node.serial,id:node.definitionId,
        variant:BY_ID.get(node.definitionId).variant,
        massKg:BY_ID.get(node.definitionId).massKg}
        :{installed:false,serial:null,id:null,variant:null,massKg:0}];
    }))};
}
/** Installed geometry is the ONLY source used for foot reach.
 * No pair-specific gait or hardcoded alternate ankle offsets.
 */
export function installedLimbGeometry(assembly,side){
  if(!LEG_SIDES.includes(side))return null;
  const shin=activeNode(assembly,side,'shin'),thigh=activeNode(assembly,side,'thigh'),
    foot=activeNode(assembly,side,'foot');
  if(!shin||!thigh||!foot)return null;
  const shinDef=BY_ID.get(shin.definitionId);
  const thighDef=BY_ID.get(thigh.definitionId);
  const footDef=BY_ID.get(foot.definitionId);
  const layout=YARDWALKER_LAYOUT.legs.find(l=>l.side===(side==='left'?-1:1));
  const upperSocket=thighDef?.sockets?.find(s=>s.id==='knee');
  const lowerSocket=shinDef?.sockets?.find(s=>s.id==='ankle');
  if(!upperSocket||!lowerSocket)return null;
  const upper=[upperSocket.position[1],upperSocket.position[2]];
  const lower=[lowerSocket.position[1],lowerSocket.position[2]];
  return {side,shinId:shinDef.id,variant:shinDef.variant,
    thighId:thighDef.id,thighVariant:thighDef.variant,
    footId:footDef.id,footVariant:footDef.variant,
    footContactDropM:footDef.mechanical?.groundContactDropM||0,
    footprintM:footDef.mechanical?.footprintM||[.60,.76],
    upper,lower,
    upperLengthM:Math.hypot(...upper),lowerLengthM:Math.hypot(...lower),
    kneeToAnkle:[...lowerSocket.position],
    referenceAnkleY:layout.ankle[1]-layout.hip[1],
    referenceAnkleZ:layout.ankle[2]-layout.hip[2],
    extraReachM:(shinDef.mechanical?.nominalExtraReachM||0)+
      (thighDef.mechanical?.nominalExtraReachM||0)+
      (footDef.mechanical?.groundContactDropM||0),
    massKg:shinDef.massKg};
}
export function anatomyReadiness(assembly){
  if(!yardLegSupported(assembly))return true;
  return LEG_SIDES.every(side=>{
    const check=sectionStatus(assembly,side);
    return check.legInstalled&&ANATOMY_ORDER.every(role=>check.sections[role].installed);
  });
}
export function actualAnatomyMass(assembly){
  return Object.values(assemblyGraph(assembly).nodes).reduce((sum,node)=>{
    const def=BY_ID.get(node.definitionId);
    return sum+(def?.assemblyRole==='anatomy'?def.massKg:0);
  },0);
}
export function rigAnatomyMass(assembly,rawMassKg){
  if(!yardLegSupported(assembly))return rawMassKg;
  // The pre-existing published 1240 kg includes two 500 kg original legs.
  return rawMassKg-2*YARD_LEG_KG+actualAnatomyMass(assembly);
}
function transaction(assembly,runner){
  const snapshot=structuredClone(assembly);
  try{
    const result=runner();
    const report=validateGraph(assemblyGraph(assembly),assembly,BY_ID);
    if(!report.valid)throw new Error(report.errors.join('; '));
    return {ok:true,...(result||{})};
  }catch(error){
    Object.keys(assembly).forEach(key=>delete assembly[key]);
    Object.assign(assembly,snapshot);
    return {ok:false,reason:error.message};
  }
}
function stow(assembly,serial,nodes){
  if(!assembly.labStowed)assembly.labStowed={};
  assembly.labStowed[serial]=nodes.map(node=>({...node}));
}
function descendants(graph,serial){
  const result=[];const visit=id=>{
    const node=graph.nodes[id];if(!node)return;
    result.push({...node});
    for(const child of Object.values(graph.nodes).filter(n=>n.parentSerial===id))visit(child.serial);
  };visit(serial);return result;
}
function addNode(assembly,serial,parentSerial,socket){
  const p=proposeAttachment(assembly,BY_ID,serial,parentSerial,socket);
  if(!p.ok)throw new Error(p.reason);
  assembly.graph=p.graph;
}
function installStowed(assembly,rootSerial,parentSerial,socket){
  const saved=assembly.labStowed?.[rootSerial];
  if(!saved?.length){addNode(assembly,rootSerial,parentSerial,socket);return;}
  for(let i=0;i<saved.length;i++){
    const node=saved[i];
    addNode(assembly,node.serial,i===0?parentSerial:node.parentSerial,
      i===0?socket:node.parentSocket);
  }
  delete assembly.labStowed[rootSerial];
}
export function installDefaultAnatomy(assembly,side){
  return transaction(assembly,()=>{
    if(!yardLegSupported(assembly))throw new Error('Yardwalker required');
    const leg=ownedLeg(assembly,side);
    if(!assemblyGraph(assembly).nodes[leg?.serial])throw new Error('Install leg before anatomy');
    let parent=leg.serial;
    for(const section of ANATOMY_ORDER){
      const own=ownedFor(assembly,anatomyId(side,section));
      if(!own)throw new Error('Missing owned '+side+' '+section);
      const existing=activeNode(assembly,side,section);
      if(existing){parent=existing.serial;continue;}
      addNode(assembly,own.serial,parent,ANATOMY_SOCKET[section]);
      parent=own.serial;
    }
    return {side};
  });
}
/** Detaching keeps descendants with their parent in an owned, stowed branch.
 * No supported ankle or foot is ever orphaned or silently destroyed.
 */
export function detachAnatomyBranch(assembly,side,section,{cascade=false}={}){
  if(!LEG_SIDES.includes(side)||!ANATOMY_ORDER.includes(section))
    return {ok:false,reason:'Unknown anatomical target'};
  return transaction(assembly,()=>{
    const node=activeNode(assembly,side,section);
    if(!node)throw new Error('Section is not installed');
    const graph=assemblyGraph(assembly);
    const subset=descendants(graph,node.serial);
    if(subset.length>1&&!cascade)throw new Error(
      'Supports '+(subset.length-1)+' child assemblies. Remove them first or choose detach with dependents.');
    const removal=proposeRemoval(graph,node.serial,{cascade});
    if(!removal.ok)throw new Error(removal.reason);
    stow(assembly,node.serial,subset);
    assembly.graph=removal.graph;
    return {side,section,detached:subset.map(n=>n.serial)};
  });
}
export function installAnatomyBranch(assembly,side,section,{variant='original'}={}){
  if(!LEG_SIDES.includes(side)||!ANATOMY_ORDER.includes(section))
    return {ok:false,reason:'Unknown anatomical target'};
  return transaction(assembly,()=>{
    if(activeNode(assembly,side,section))throw new Error('Socket already occupied by '+section);
    const index=ANATOMY_ORDER.indexOf(section);
    const parentSerial=index===0?ownedLeg(assembly,side)?.serial:
      activeNode(assembly,side,ANATOMY_ORDER[index-1])?.serial;
    if(!parentSerial||!assemblyGraph(assembly).nodes[parentSerial])
      throw new Error('Install the upstream '+(index===0?'leg':ANATOMY_ORDER[index-1])+' first');
    const part=ownedFor(assembly,anatomyId(side,section,variant));
    if(!part)throw new Error('Owned component not found');
    installStowed(assembly,part.serial,parentSerial,ANATOMY_SOCKET[section]);
    return {side,section,serial:part.serial};
  });
}
/** Generic service-part swap: same replacement primitive for thigh, shin,
 * foot or any future typed interface. Unsupported descendants must explicitly
 * be removed first, rather than teleporting or orphaning them.
 */
export function replaceAnatomyComponent(assembly,side,section,variant){
  if(!LEG_SIDES.includes(side)||!ANATOMY_ORDER.includes(section)||
     !SECTION_VARIANTS[section]?.includes(variant))
    return {ok:false,reason:'Unknown replacement side, section or variant'};
  return transaction(assembly,()=>{
    const old=activeNode(assembly,side,section);
    if(!old)throw Error('Install the '+section+' before replacing it');
    const next=ownedFor(assembly,anatomyId(side,section,variant));
    if(!next)throw Error('No owned replacement component');
    if(next.serial===old.serial)return {unchanged:true,side,section,variant};
    if(assembly.labStowed?.[next.serial]?.length>1)
      throw Error('Replacement carries stored descendants. Reinstall or disassemble that branch first.');
    const proposal=proposeComponentReplacement(assembly,BY_ID,old.serial,next.serial);
    if(!proposal.ok)throw Error(proposal.reason);
    stow(assembly,old.serial,[old]);
    if(assembly.labStowed)delete assembly.labStowed[next.serial];
    assembly.graph=proposal.graph;
    return {side,section,variant,serial:next.serial,
      replaced:old.serial,retainedDescendants:proposal.retainedDescendants};
  });
}
/** Backwards-compatible stage-08 API, now delegating to the generic swap. */
export function swapShin(assembly,side,variant='rook'){
  return replaceAnatomyComponent(assembly,side,'shin',variant);
}
/** Entire attached leg + its own section graph can be stowed and reinstalled
 * intact. This deliberately supersedes Stage 06's flat leg-node removal.
 */
export function detachWholeLeg(assembly,side){
  if(!LEG_SIDES.includes(side))return {ok:false,reason:'Unknown side'};
  return transaction(assembly,()=>{
    const leg=ownedLeg(assembly,side);
    const g=assemblyGraph(assembly);
    if(!g.nodes[leg?.serial])return {unchanged:true};
    const subset=descendants(g,leg.serial);
    const out=proposeRemoval(g,leg.serial,{cascade:true});
    if(!out.ok)throw new Error(out.reason);
    stow(assembly,leg.serial,subset);
    assembly.graph=out.graph;
    return {detached:out.detached};
  });
}
export function restoreWholeLeg(assembly,side){
  if(!LEG_SIDES.includes(side))return {ok:false,reason:'Unknown side'};
  return transaction(assembly,()=>{
    if(!yardLegSupported(assembly))throw new Error('Yardwalker required');
    const leg=ownedLeg(assembly,side);
    if(!leg)throw new Error('Missing leg');
    if(assemblyGraph(assembly).nodes[leg.serial])return {unchanged:true};
    installStowed(assembly,leg.serial,assembly.installed.mobility,'hip-'+side);
    // Older v2 plans have no stored descendants: restore six default sections.
    if(!activeNode(assembly,side,'hip')){
      const result=installDefaultAnatomy(assembly,side);
      if(!result.ok)throw new Error(result.reason);
    }
    return {serial:leg.serial};
  });
}
export function temporarilyStripLegs(assembly){
  for(const side of LEG_SIDES){
    const r=detachWholeLeg(assembly,side);
    if(!r.ok)throw new Error(r.reason);
  }
}
/** Recover already-owned geometry after replacing a major station.
 * Current configurations are serialized in labStowed, not fabricated by UI.
 */
export function reinstateLegs(assembly,prior){
  if(!yardLegSupported(assembly))return;
  for(const side of LEG_SIDES){
    if(!prior[side])continue;
    const r=restoreWholeLeg(assembly,side);
    if(!r.ok)throw new Error(r.reason);
  }
}
export function partStowList(assembly){
  return Object.entries(assembly.labStowed||{}).map(([serial,nodes])=>({
    serial,descendants:nodes.length-1,
    name:BY_ID.get(nodes[0]?.definitionId)?.name||'Unknown assembly'
  }));
}

/** Strict v3 blueprint restore. The slot map remains authoritative for the
 * five existing stations; only owned anatomical nodes can be reconstructed
 * here. Reject foreign serials, wrong-side parenting and duplicate ownership.
 */
export function restoreAnatomyBlueprint(assembly,anatomy,legStates){
  if(!anatomy||!Array.isArray(anatomy.nodes)||
      !anatomy.stowed||typeof anatomy.stowed!=='object'||Array.isArray(anatomy.stowed))
    return {ok:false,reason:'Malformed Stage 07 anatomy payload'};
  return transaction(assembly,()=>{
    if(anatomy.nodes.length>12||Object.keys(anatomy.stowed).length>18)
      throw new Error('Anatomy payload exceeds expected component count');
    // Stage 07 default assembly is now replaced by exactly the imported nodes.
    temporarilyStripLegs(assembly);
    for(const side of LEG_SIDES)if(legStates[side]){
      if(!yardLegSupported(assembly))throw new Error('Only Yardwalker supports serviceable legs');
      const leg=ownedLeg(assembly,side);
      addNode(assembly,leg.serial,assembly.installed.mobility,'hip-'+side);
    }
    if(!yardLegSupported(assembly)&&anatomy.nodes.length)
      throw new Error('Cannot mount Yardwalker anatomy on other mobility family');
    const seen=new Set();
    const sorted=[...anatomy.nodes].sort((a,b)=>{
      const da=BY_ID.get(a?.definitionId),db=BY_ID.get(b?.definitionId);
      return ANATOMY_ORDER.indexOf(da?.section)-ANATOMY_ORDER.indexOf(db?.section);
    });
    for(const record of sorted){
      const def=BY_ID.get(record?.definitionId);
      if(def?.assemblyRole!=='anatomy'||!LEG_SIDES.includes(def.side)||
          !legStates[def.side]||record.serial!==ownedFor(assembly,def.id)?.serial||
          seen.has(record.serial)||!ANATOMY_ORDER.includes(def.section))
        throw new Error('Invalid or duplicate anatomy serial');
      const i=ANATOMY_ORDER.indexOf(def.section);
      const parentId=i===0?YARD_LEG_IDS[def.side]:null;
      const actualParent=i===0?ownedLeg(assembly,def.side)?.serial:
        activeNode(assembly,def.side,ANATOMY_ORDER[i-1])?.serial;
      if(!actualParent||record.parentSerial!==actualParent||
          record.parentSocket!==ANATOMY_SOCKET[def.section])
        throw new Error('Anatomy connection does not match authored parent/socket');
      if(i===0 && !assemblyGraph(assembly).nodes[actualParent])
        throw new Error('Leg is detached');
      if(activeNode(assembly,def.side,def.section))
        throw new Error('Two components occupy one anatomical station');
      addNode(assembly,record.serial,actualParent,record.parentSocket);
      seen.add(record.serial);
    }
    // Preserve parked assemblies as a constrained inventory tree, never as
    // executable graph instructions. The validator checks all owned serials,
    // definition IDs, tree ordering, sides and duplicates against active nodes.
    const parked=new Set();
    const clean={};
    for(const [serial,nodes] of Object.entries(anatomy.stowed)){
      if(!Array.isArray(nodes)||nodes.length<1||nodes.length>7||nodes[0]?.serial!==serial)
        throw new Error('Malformed stored assembly branch');
      const branch=new Set();
      let side=null;
      for(let i=0;i<nodes.length;i++){
        const node=nodes[i],own=assembly.owned.find(p=>p.serial===node.serial);
        const def=BY_ID.get(node.definitionId);
        if(!own||own.definitionId!==node.definitionId||
          !['leg','anatomy'].includes(def?.assemblyRole)||
          branch.has(node.serial)||parked.has(node.serial)||
          assemblyGraph(assembly).nodes[node.serial])
          throw new Error('Stored anatomy conflicts with installed or unowned component');
        if(def.side&&!side)side=def.side;
        if(def.side!==side)throw new Error('Mixed-side stored anatomy');
        if(i>0 && !branch.has(node.parentSerial))
          throw new Error('Stored branch is not ordered parent-first');
        if(i>0){
          const parent=BY_ID.get(nodes.find(n=>n.serial===node.parentSerial)?.definitionId);
          const expectedParent=ANATOMY_ORDER.indexOf(def.section)===0?'leg':
            ANATOMY_ORDER[ANATOMY_ORDER.indexOf(def.section)-1];
          if(expectedParent==='leg'?parent?.assemblyRole!=='leg':
             parent?.section!==expectedParent)
            throw new Error('Stored anatomy has invalid support chain');
          if(node.parentSocket!==ANATOMY_SOCKET[def.section])
            throw new Error('Stored anatomical socket mismatch');
        }
        branch.add(node.serial);parked.add(node.serial);
      }
      clean[serial]=nodes.map(n=>({
        serial:n.serial,definitionId:n.definitionId,parentSerial:n.parentSerial,
        parentSocket:n.parentSocket,rotationQuarterTurns:0
      }));
    }
    assembly.labStowed=clean;
    return {imported:true,activeNodes:seen.size,stowedBranches:Object.keys(clean).length};
  });
}
