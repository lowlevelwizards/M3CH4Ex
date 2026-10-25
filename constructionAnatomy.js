/** Stage 07: six real serviceable anatomical assemblies per Yardwalker leg.
 * Pure graph/state, no visual or combat dependencies. A shim is not a cosmetic
 * overlay: changing it changes the actual node and its mass / interface.
 */
import {CATALOG,BY_ID,assemblyGraph,proposeAttachment,proposeRemoval,validateGraph} from './components.js';
import {LEG_SIDES,YARD_LEG_IDS,ownedLeg,yardLegSupported,YARD_LEG_KG} from './constructionLegs.js';
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';

export const ANATOMY_ORDER=Object.freeze(['hip','thigh','knee','shin','ankle','foot']);
export const ANATOMY_MASS=Object.freeze({hip:80,thigh:140,knee:65,shin:110,ankle:45,foot:60});
export const ROOK_SHIN_KG=90;
export const ANATOMY_SOCKET=Object.freeze({hip:'hip-core',thigh:'thigh',knee:'knee',shin:'shin',ankle:'ankle',foot:'foot'});
const offset=(a,b)=>a.map((x,i)=>x-b[i]);
export const anatomyId=(side,section,variant='original')=>
  section==='shin' && variant==='rook'
    ? 'rook-s2-shin-'+side : 'yard-'+section+'-'+side;
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
    roleHint:'leg-anatomy',description:'Authoritative hip-assembly connection'}];
  for(const section of ANATOMY_ORDER){
    const ids=section==='shin'?[anatomyId(side,section),alternativeShinId(side)]:[anatomyId(side,section)];
    for(const id of ids){
      const variant=id===alternativeShinId(side)?'rook':'original';
      const kg=variant==='rook'?ROOK_SHIN_KG:ANATOMY_MASS[section];
      const attach=sockets[section];
      const def={
        id,name:variant==='rook'?'Rook Industrial S2 / '+side+' narrow-spar shin':
          'Yardwalker '+side+' '+section,slot:'anatomy',side,
        section,variant,assemblyRole:'anatomy',massKg:kg,mountSize:'medium',
        sockets:attach?[{...attach,standard:'medium',roleHint:'anatomy',
          normal:[0,1,0]}]:[],
        description:variant==='rook'
          ?'Narrow twin load spars and exposed axial drive. Uses the original knee and ankle interface geometry.'
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
/** Atomic true part substitution; the original ankle+foot remain installed.
 * A queued alternative with descendants must be disassembled first.
 */
export function swapShin(assembly,side,variant='rook'){
  if(!LEG_SIDES.includes(side)||!['rook','original'].includes(variant))
    return {ok:false,reason:'Unsupported side or shin'};
  return transaction(assembly,()=>{
    const old=activeNode(assembly,side,'shin');
    const next=ownedFor(assembly,anatomyId(side,'shin',variant));
    if(!next)throw new Error('Alternate shin not owned');
    if(old?.serial===next.serial)return {unchanged:true};
    if(assemblyGraph(assembly).nodes[next.serial])throw new Error('Shin already attached elsewhere');
    if(assembly.labStowed?.[next.serial]?.length>1)
      throw new Error('Target shin has its own stored ankle/foot. Reinstall or disassemble them first.');
    const knee=activeNode(assembly,side,'knee');
    if(!knee)throw new Error('Install a knee before a shin');
    const graph=structuredClone(assemblyGraph(assembly));
    if(old){
      const dependents=Object.values(graph.nodes).filter(n=>n.parentSerial===old.serial);
      for(const dependent of dependents)dependent.parentSerial=next.serial;
      delete graph.nodes[old.serial];
      stow(assembly,old.serial,[old]);
    }
    graph.nodes[next.serial]={serial:next.serial,definitionId:next.definitionId,
      parentSerial:knee.serial,parentSocket:'shin',rotationQuarterTurns:0};
    delete assembly.labStowed?.[next.serial];
    const report=validateGraph(graph,assembly,BY_ID);
    if(!report.valid)throw new Error(report.errors.join('; '));
    assembly.graph=graph;
    return {side,variant,serial:next.serial,replaced:old?.serial||null};
  });
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
