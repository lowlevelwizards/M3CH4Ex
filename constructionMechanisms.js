/** Stage 10 — portable mechanism catalogue.
 * Hardware is named for its ENGINEERING FUNCTION rather than an anatomical
 * location. A compatible bearing station on an elbow, arm, knee or shoulder
 * can use these same parts; physical interface standards decide fit.
 */
import {CATALOG,BY_ID,assemblyGraph,proposeAttachment,proposeRemoval,validateGraph} from './components.js';
import {LEG_SIDES} from './constructionLegs.js';
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';

export const DEVICE_TYPES=Object.freeze({bearing:'rotary-bearing',actuator:'linear-actuator'});
export const DEVICE_OPTIONS=Object.freeze({
 bearing:['plain','wide'],actuator:['utility','travel']
});
const RAW=[
 {id:'mechanism-bearing-plain',name:'B-40 Utility Rotary Bearing',device:'bearing',
  massKg:9,range:{min:-10,max:100,axis:'x'},diameterM:.23,
  description:'Compact load-bearing single-axis rotary assembly. No limb-specific mounting restriction.'},
 {id:'mechanism-bearing-wide',name:'B-62 Wide-Swing Rotary Bearing',device:'bearing',
  massKg:16,range:{min:-12,max:120,axis:'x'},diameterM:.32,
  description:'Reinforced rotary assembly with a wider allowable angular range. Usable at any matching rotational port.'},
 {id:'mechanism-actuator-utility',name:'P-48 Utility Linear Drive',device:'actuator',
  massKg:14,stroke:{min:.48,max:.71,housing:.34},diameterM:.11,
  secondAnchorOffset:[0,-.23,.065],
  description:'Compact two-ended linear drive for matching anchor pairs, independent of a named limb.'},
 {id:'mechanism-actuator-travel',name:'P-70 Extended-Travel Drive',device:'actuator',
  massKg:22,stroke:{min:.32,max:.80,housing:.28},diameterM:.14,
  secondAnchorOffset:[0,-.275,.085],
  description:'Extended-stroke linear actuator, suitable for any load-compatible two-anchor mechanism.'}
];
for(const raw of RAW){
 const def={...raw,slot:'mechanism',assemblyRole:'mechanism',
   mountSize:'light',variant:raw.id.split('-').at(-1),
   mountInterface:{kind:DEVICE_TYPES[raw.device],standard:'light',
     orientation:[0,1,0],application:'universal'},
   sockets:[],compatibleApplications:['hip','knee','ankle','elbow','shoulder','wrist','tool-mount'],
   mechanical:raw.range?{...raw.range}:null};
 if(!BY_ID.has(def.id)){CATALOG.push(def);BY_ID.set(def.id,def);}
}
export const deviceId=(type,variant)=>'mechanism-'+type+'-'+variant;
export function installedSection(assembly,side,section){
 return Object.values(assemblyGraph(assembly).nodes).find(n=>{
  const def=BY_ID.get(n.definitionId);
  return def?.assemblyRole==='anatomy'&&def.side===side&&def.section===section;
 })||null;
}
function findOwned(assembly,id,exclude=[]){
 return assembly.owned.find(p=>p.definitionId===id&&!exclude.includes(p.serial));
}
export function ensureDeviceInventory(assembly){
 // makeTestAssembly adds one copy of each catalogue item; provision a second
 // copy of every universal mechanism so left/right use the exact SAME design.
 for(const def of RAW){
  const owned=assembly.owned.filter(p=>p.definitionId===def.id);
  if(owned.length===0)throw Error('Missing device '+def.id);
  for(let i=owned.length;i<3;i++)assembly.owned.push({
   serial:'LAB-MECH-'+(i+1)+'-'+def.id,
   definitionId:def.id,condition:1,wear:0,repairs:0
  });
 }
 if(!assembly.labMechanisms)assembly.labMechanisms={left:{},right:{}};
}
const parentFor=(assembly,side,type)=>installedSection(assembly,side,
 type==='bearing'?'knee':'thigh');
const socketFor=type=>type==='bearing'?'bearing-seat':'drive-mount';
export function installedDevice(assembly,side,type){
 if(!LEG_SIDES.includes(side)||!DEVICE_OPTIONS[type])return null;
 const serial=assembly.labMechanisms?.[side]?.[type];
 const graph=assemblyGraph(assembly),node=serial&&graph.nodes[serial];
 const parent=parentFor(assembly,side,type);
 if(!node||!parent||node.parentSerial!==parent.serial||
    node.parentSocket!==socketFor(type))return null;
 return {serial,node,definition:BY_ID.get(node.definitionId),side,type};
}
export function deviceBinding(assembly,side){
 const drive=installedDevice(assembly,side,'actuator');
 const thigh=installedSection(assembly,side,'thigh');
 const shin=installedSection(assembly,side,'shin');
 if(!drive||!thigh||!shin)return null;
 const target=assembly.labMechanisms?.[side]?.targetSerial;
 if(target!==shin.serial)return null;
 const thighDef=BY_ID.get(thigh.definitionId),shinDef=BY_ID.get(shin.definitionId);
 const mounting=thighDef?.sockets?.find(s=>s.id==='drive-mount'),
   pin=shinDef?.mechanical?.driveAnchors?.[drive.definition.variant];
 if(!mounting||!Array.isArray(pin)||pin.length!==3)return null;
 return {driveSerial:drive.serial,fromSerial:thigh.serial,
   targetSerial:shin.serial,fromAnchor:'upper-drive',
   targetAnchor:'lower-drive:'+drive.definition.variant,
   fromLocal:[...mounting.position],targetLocal:[...pin]};
}
function mutate(assembly,fn){
 const snapshot=structuredClone(assembly);
 try{
  const result=fn();
  const verdict=validateGraph(assemblyGraph(assembly),assembly,BY_ID);
  if(!verdict.valid)throw Error(verdict.errors.join('; '));
  return {ok:true,...result};
 }catch(error){
  for(const key of Object.keys(assembly))delete assembly[key];
  Object.assign(assembly,snapshot);
  return {ok:false,reason:error.message};
 }
}
export function installDevice(assembly,side,type,variant){
 if(!LEG_SIDES.includes(side)||!DEVICE_OPTIONS[type]?.includes(variant))
   return {ok:false,reason:'Unsupported mechanism/variant'};
 return mutate(assembly,()=>{
  ensureDeviceInventory(assembly);
  const parent=parentFor(assembly,side,type);
  if(!parent)throw Error('Required mechanical station is absent');
  const old=installedDevice(assembly,side,type);
  const desired=deviceId(type,variant);
  if(old?.definition.id===desired)return {unchanged:true,serial:old.serial};
  const next=findOwned(assembly,desired,[...Object.keys(assemblyGraph(assembly).nodes)]);
  if(!next)throw Error('No unmounted owned '+desired);
  if(old){
   const remove=proposeRemoval(assemblyGraph(assembly),old.serial);
   if(!remove.ok)throw Error(remove.reason);
   assembly.graph=remove.graph;
  }
  const attach=proposeAttachment(assembly,BY_ID,next.serial,parent.serial,socketFor(type));
  if(!attach.ok)throw Error(attach.reason);
  assembly.graph=attach.graph;
  assembly.labMechanisms[side][type]=next.serial;
  if(type==='actuator'){
   const shin=installedSection(assembly,side,'shin');
   if(!shin)throw Error('Actuator requires a second shin attachment');
   assembly.labMechanisms[side].targetSerial=shin.serial;
  }
  return {serial:next.serial,replaced:old?.serial||null,type,variant,
    link:type==='actuator'?deviceBinding(assembly,side):null};
 });
}
export function removeDevice(assembly,side,type){
 if(!LEG_SIDES.includes(side)||!DEVICE_OPTIONS[type])
  return {ok:false,reason:'Unknown mount'};
 return mutate(assembly,()=>{
  const installed=installedDevice(assembly,side,type);
  if(!installed)return {unchanged:true};
  const removal=proposeRemoval(assemblyGraph(assembly),installed.serial);
  if(!removal.ok)throw Error(removal.reason);
  assembly.graph=removal.graph;
  assembly.labMechanisms[side][type]=null;
  if(type==='actuator')assembly.labMechanisms[side].targetSerial=null;
  return {removed:installed.serial};
 });
}
export function refreshDeviceTarget(assembly,side){
 const drive=installedDevice(assembly,side,'actuator');
 if(drive&&assembly.labMechanisms?.[side])
  assembly.labMechanisms[side].targetSerial=
    installedSection(assembly,side,'shin')?.serial||null;
}
/** Reattach previously owned universal devices after temporarily lifting an
 * entire leg, changing stations, or restoring a serviceable anatomical branch.
 */
export function reconnectDevices(assembly,side){
 if(!LEG_SIDES.includes(side)||!assembly.labMechanisms?.[side])
  return {ok:true,unchanged:true};
 return mutate(assembly,()=>{
  for(const type of ['bearing','actuator']){
   const serial=assembly.labMechanisms[side][type];
   if(!serial)continue;
   const parent=parentFor(assembly,side,type);
   if(!parent||assemblyGraph(assembly).nodes[serial])continue;
   const owned=assembly.owned.find(p=>p.serial===serial);
   if(!owned||BY_ID.get(owned.definitionId)?.device!==type)
    throw Error('Stored mechanism serial is invalid');
   const result=proposeAttachment(assembly,BY_ID,serial,parent.serial,socketFor(type));
   if(!result.ok)throw Error(result.reason);
   assembly.graph=result.graph;
  }
  refreshDeviceTarget(assembly,side);
  return {side,restored:true};
 });
}
export function installDefaultDevices(assembly){
 ensureDeviceInventory(assembly);
 for(const side of LEG_SIDES){
  for(const [kind,variant] of [['bearing','plain'],['actuator','utility']]){
   const result=installDevice(assembly,side,kind,variant);
   if(!result.ok)throw Error(side+' '+kind+': '+result.reason);
  }
 }
}
/** Hardware devices are generic, but installed roles are real graph sockets.
 * Only one mounted copy may occupy a port; an actuator also requires its
 * SECOND mechanical target. The target never becomes another graph parent.
 */
export function mechanismValidation(assembly){
 const errors=[],graph=assemblyGraph(assembly),installed=new Set();
 for(const side of LEG_SIDES){
  for(const type of ['bearing','actuator']){
   const serial=assembly.labMechanisms?.[side]?.[type];
   if(serial==null)continue;
   if(installed.has(serial)){errors.push('Mechanism serial installed twice');continue;}
   installed.add(serial);
   const device=installedDevice(assembly,side,type);
   // When a complete leg is detached the device's graph node is also parked.
   const parent=parentFor(assembly,side,type);
   if(parent&&!device)errors.push(side+' '+type+' points to a nonexistent graph connection');
   if(device&&device.definition.device!==type)errors.push('Wrong type on '+side+' '+type);
  }
  const drive=installedDevice(assembly,side,'actuator');
  if(drive&&installedSection(assembly,side,'shin')&&!deviceBinding(assembly,side))
   errors.push(side+' actuator is missing its real second anchor');
 }
 // Other branches (manipulators, auxiliary hinges, tools) may use the SAME
 // hardware definitions through their own typed sockets. Registration follows
 // graph ownership, not the anatomical name of a knee.
 if(assembly.labManipulator?.attached){
  const arm=assembly.labManipulator;
  for(const serial of [arm.bearingSerial,arm.actuatorSerial]){
   if(installed.has(serial))errors.push('Mechanism serial used in multiple machines');
   installed.add(serial);
  }
 }
 for(const node of Object.values(graph.nodes)){
  const def=BY_ID.get(node.definitionId);
  if(def?.assemblyRole==='mechanism'&&!installed.has(node.serial))
   errors.push('Unregistered mechanism installed on structural graph');
 }
 return {valid:errors.length===0,errors};
}
export function mechanismsForBlueprint(assembly){
 return Object.fromEntries(LEG_SIDES.map(side=>[side,{
  bearing:assembly.labMechanisms?.[side]?.bearing||null,
  actuator:assembly.labMechanisms?.[side]?.actuator||null,
  targetSerial:deviceBinding(assembly,side)?.targetSerial||null
 }]));
}
export function restoreMechanisms(assembly,input){
 ensureDeviceInventory(assembly);
 if(!input||typeof input!=='object'||Object.keys(input).sort().join(',')!=='left,right')
  return {ok:false,reason:'Malformed mechanism binding data'};
 return mutate(assembly,()=>{
  for(const side of LEG_SIDES){
   const spec=input[side];
   if(!spec||typeof spec!=='object'||
      Object.keys(spec).sort().join(',')!=='actuator,bearing,targetSerial')
     throw Error('Mechanism blueprint has unknown fields');
   for(const type of ['bearing','actuator']){
    if(spec[type]!==null&&typeof spec[type]!=='string')throw Error('Bad hardware serial');
    const old=installedDevice(assembly,side,type);
    if(old){const removed=removeDevice(assembly,side,type);if(!removed.ok)throw Error(removed.reason);}
    if(spec[type]!==null){
      const owned=assembly.owned.find(p=>p.serial===spec[type]);
      const def=BY_ID.get(owned?.definitionId);
      if(!def||def.device!==type)throw Error('Mechanism is unowned or wrong type');
      const parent=parentFor(assembly,side,type);
      if(parent){
        const attach=proposeAttachment(assembly,BY_ID,spec[type],parent.serial,socketFor(type));
        if(!attach.ok)throw Error(attach.reason);
        assembly.graph=attach.graph;
      }
      // A detached leg keeps its assigned hardware in owned inventory. The
      // graph connection is restored when that physical branch is reinstalled.
      assembly.labMechanisms[side][type]=spec[type];
    }
   }
   const shin=installedSection(assembly,side,'shin');
   if(spec.actuator!=null&&shin&&spec.targetSerial!==shin.serial)
     throw Error('Second endpoint must match installed shin serial');
   if(spec.actuator!=null&&!shin&&spec.targetSerial!==null)
     throw Error('Parked shin may not be used as an active linkage target');
   if(spec.actuator===null&&spec.targetSerial!==null)
     throw Error('Detached actuator must not claim a second endpoint');
   assembly.labMechanisms[side].targetSerial=spec.targetSerial;
  }
  const verdict=mechanismValidation(assembly);
  if(!verdict.valid)throw Error(verdict.errors.join('; '));
  return {restored:true};
 });
}
