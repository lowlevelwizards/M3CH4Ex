/** Stage 11: one real chassis-mounted non-leg manipulator, assembled from
 * general-purpose structural links, B-series rotary bearings and P-series
 * linear drives. The mechanisms are the *same BY_ID definitions* as knees.
 * Entirely separate from player locomotion.
 */
import {CATALOG,BY_ID,assemblyGraph,proposeAttachment,proposeRemoval,validateGraph} from './components.js';
import {ensureDeviceInventory,deviceId} from './constructionMechanisms.js';
import {linkedStrokeLength,jointStrokeRange,updateJointPose} from './constructionKinematics.js';

const PORT='utility-manipulator';
const KINEMATIC_LINK='structural-link';
const DEFS=[
 {id:'construction-manip-bracket',name:'Universal Utility Pivot Bracket',
  massKg:35,slot:'construction',assemblyRole:'manipulator',mountSize:'medium',
  mountInterface:{kind:'utility-bracket',standard:'medium',applications:['arm','crane','tool-carriage']},
  sockets:[{id:'link-base',standard:'medium',position:[.025,-.07,-.17],
    normal:[0,0,-1],maxLoadKg:215,acceptsRole:KINEMATIC_LINK}],
  description:'Chassis-mounted steel carriage for a generic mechanical link.'},
 {id:'construction-link-530',name:'L-53 Multipurpose Structural Link',
  massKg:70,slot:'construction',assemblyRole:'rigid-link',mountSize:'medium',
  mountInterface:{kind:KINEMATIC_LINK,standard:'medium',
    applications:['thigh','bicep','boom','brace','manipulator']},
  mechanical:{lengthM:.53,end:[0,-.13,-.50],driveOriginRelativeToEnd:[.10,.12,.36]},
  sockets:[
   {id:'bearing-seat',standard:'light',position:[0,-.13,-.50],normal:[1,0,0],
     maxLoadKg:120,acceptsRole:'rotary-bearing'},
   {id:'drive-mount',standard:'light',position:[.10,-.01,-.14],normal:[0,1,0],
     maxLoadKg:35,acceptsRole:'linear-actuator'}],
  description:'Generic load spar with standardized outer bearing and pressure-drive seats.'},
 {id:'construction-link-430',name:'L-43 Multipurpose Structural Link',
  massKg:56,slot:'construction',assemblyRole:'rigid-link',mountSize:'medium',
  mountInterface:{kind:KINEMATIC_LINK,standard:'medium',
    applications:['forearm','shin','brace','tool-carrier']},
  mechanical:{lengthM:.43,end:[0,-.42,-.10],
   driveAnchors:{utility:[0,-.33,-.12],travel:[0,-.33,-.12]}},
  sockets:[{id:'tool-end',standard:'light',position:[0,-.42,-.10],
    normal:[0,-1,0],maxLoadKg:35}],
  description:'Smaller universal member with moving rod-end clevis seats.'}
];
for(const part of DEFS)if(!BY_ID.has(part.id)){CATALOG.push(part);BY_ID.set(part.id,part);}
for(const frame of CATALOG.filter(d=>d.slot==='structure')){
 if(!frame.sockets.some(s=>s.id===PORT))frame.sockets.push({
   id:PORT,standard:'medium',position:[.81,-.07,-.24],
   rotation:[0,0,0],normal:[1,0,0],
   maxLoadKg:285,acceptsRole:'utility-bracket',roleHint:'industrial auxiliary'
 });
}
// The B-series bearing now offers an OUTGOING medium link socket as well as
// its light incoming bearing seat. The same B-series knee part is unchanged.
for(const variant of ['plain','wide']){
 const def=BY_ID.get(deviceId('bearing',variant));
 if(!def.sockets.some(s=>s.id==='link-out'))def.sockets.push({
   id:'link-out',standard:'medium',position:[0,0,0],normal:[0,-1,0],
   maxLoadKg:95,acceptsRole:KINEMATIC_LINK
 });
 if(!def.kinematic)def.kinematic={axis:'x',command:'serial'};
}
const owner=(a,serial)=>a.owned.find(p=>p.serial===serial);
const graphNode=(a,serial)=>assemblyGraph(a).nodes[serial]||null;
const selected=(a,definitionId,serial=null)=>{
 const nodes=assemblyGraph(a).nodes;
 return a.owned.find(p=>p.definitionId===definitionId&&
   (serial==null||serial===p.serial)&&!nodes[p.serial]);
};
const restore=(target,snapshot)=>{
 for(const k of Object.keys(target))delete target[k];
 Object.assign(target,snapshot);
};
const round=v=>Math.round(v*10000)/10000;
export const manipulatorPosePresets=Object.freeze({
 neutral:0,reach:12,fold:85,stow:100
});
export function manipulatorDescription(assembly){
 const s=assembly.labManipulator,graph=assemblyGraph(assembly);
 if(!s?.attached)return {attached:false,valid:true,
   bracketSerial:null,upperSerial:null,bearingSerial:null,
   lowerSerial:null,actuatorSerial:null};
 const {bracketSerial,upperSerial,bearingSerial,lowerSerial,actuatorSerial}=s,
  names=[bracketSerial,upperSerial,bearingSerial,lowerSerial,actuatorSerial],
  parts=names.map(key=>graphNode(assembly,key));
 const errors=[];
 if(parts.some(x=>!x))errors.push('Manipulator contains unattached hardware');
 if(parts.every(Boolean)){
   const [base,upper,bearing,lower,drive]=parts;
   if(base.parentSerial!==assembly.installed.structure||base.parentSocket!==PORT)
     errors.push('Manipulator lacks its structural chassis mount');
   if(upper.parentSerial!==bracketSerial||upper.parentSocket!=='link-base')
     errors.push('Upper structural link disconnected');
   if(bearing.parentSerial!==upperSerial||bearing.parentSocket!=='bearing-seat')
     errors.push('Hinge bearing disconnected');
   if(lower.parentSerial!==bearingSerial||lower.parentSocket!=='link-out')
     errors.push('Lower structural link disconnected');
   if(drive.parentSerial!==upperSerial||drive.parentSocket!=='drive-mount')
     errors.push('Actuator source connection missing');
   if(s.targetSerial!==lowerSerial)errors.push('Actuator target is not the installed lower link');
   if(parts[2].definitionId!==deviceId('bearing',BY_ID.get(parts[2].definitionId)?.variant))
     errors.push('Unsupported rotary bearing');
   if(parts[4].definitionId!==deviceId('actuator',BY_ID.get(parts[4].definitionId)?.variant))
     errors.push('Unsupported linear drive');
 }
 const drive=BY_ID.get(parts[4]?.definitionId),
  bearing=BY_ID.get(parts[2]?.definitionId);
 const top=BY_ID.get(parts[1]?.definitionId),
  bottom=BY_ID.get(parts[3]?.definitionId);
 const joint=top?.sockets?.find(socket=>socket.id==='bearing-seat'),
  upper=top?.sockets?.find(socket=>socket.id==='drive-mount'),
  anchor=bottom?.mechanical?.driveAnchors?.[drive?.variant];
 if(!joint||!upper||!anchor)errors.push('Missing manufacturer-authored mechanical linkage endpoints');
 const from=joint&&upper?upper.position.map((v,i)=>v-joint.position[i]):null;
 const range=from&&anchor?jointStrokeRange(from,anchor,drive,bearing):
   {ok:false,reason:'Incomplete linkage'};
 if(!range.ok)errors.push(range.reason);
 const angle=assembly.labJointAngles?.[bearingSerial]??0;
 if(range.ok&&(angle<range.min-.01||angle>range.max+.01))
   errors.push('Rotary command exceeds available hydraulic stroke');
 const lengthM=from&&anchor?linkedStrokeLength(from,anchor,angle):null;
 return {attached:true,valid:errors.length===0,errors,
  ...s,bearing,actuator:drive,angle,range,
  linkage:{sourceSerial:upperSerial,sourceSocket:'drive-mount',
    targetSerial:lowerSerial,targetAnchor:'driveAnchors',
    upperFromPivot:from,lowerFromPivot:anchor,
    sourceLocal:upper?[...upper.position]:null,
    targetLocal:anchor?[...anchor]:null,
    stroke:drive?.stroke?{...drive.stroke}:null,lengthM}};
}
export function installManipulator(assembly,{
 bearingVariant='plain',actuatorVariant='utility',serials={}
}={}){
 const before=structuredClone(assembly);
 try{
  if(assembly.labManipulator?.attached)throw Error('Remove existing manipulator before mounting');
  if(!['plain','wide'].includes(bearingVariant)||!['utility','travel'].includes(actuatorVariant))
    throw Error('Unknown mechanism variant');
  ensureDeviceInventory(assembly);
  const frame=assembly.installed.structure;
  if(!frame||!graphNode(assembly,frame))throw Error('A structural frame is required');
  const definitions=[
   'construction-manip-bracket','construction-link-530',
   deviceId('bearing',bearingVariant),'construction-link-430',
   deviceId('actuator',actuatorVariant)
  ];
  const slots=['bracketSerial','upperSerial','bearingSerial','lowerSerial','actuatorSerial'];
  const parents=[frame,null,null,null,null],ports=[PORT,'link-base','bearing-seat','link-out','drive-mount'];
  const serial={};
  for(let i=0;i<definitions.length;i++){
   const part=selected(assembly,definitions[i],serials[slots[i]]||null);
   if(!part)throw Error('Unavailable owned '+definitions[i]);
   if(i===1)parents[i]=serial.bracketSerial;
   if(i===2)parents[i]=serial.upperSerial;
   if(i===3)parents[i]=serial.bearingSerial;
   if(i===4)parents[i]=serial.upperSerial;
   const p=proposeAttachment(assembly,BY_ID,part.serial,parents[i],ports[i]);
   if(!p.ok)throw Error(p.reason);
   assembly.graph=p.graph;
   serial[slots[i]]=part.serial;
  }
  assembly.labManipulator={attached:true,...serial,targetSerial:serial.lowerSerial};
  if(!assembly.labJointAngles)assembly.labJointAngles={};
  assembly.labJointAngles[serial.bearingSerial]=0;
  const result=manipulatorDescription(assembly);
  if(!result.valid)throw Error(result.errors.join('; '));
  return {ok:true,manipulator:result};
 }catch(e){restore(assembly,before);return {ok:false,reason:e.message};}
}
export function removeManipulator(assembly){
 const before=structuredClone(assembly);
 try{
  const current=manipulatorDescription(assembly);
  if(!current.attached)return {ok:true,unchanged:true};
  const removed=proposeRemoval(assemblyGraph(assembly),current.bracketSerial,{cascade:true});
  if(!removed.ok)throw Error(removed.reason);
  assembly.graph=removed.graph;
  delete assembly.labJointAngles?.[current.bearingSerial];
  assembly.labManipulator={attached:false};
  const check=validateGraph(assemblyGraph(assembly),assembly,BY_ID);
  if(!check.valid)throw Error(check.errors.join('; '));
  return {ok:true,removed:removed.detached};
 }catch(e){restore(assembly,before);return {ok:false,reason:e.message};}
}
export function manipulatorJointAction(assembly,angle){
 const before=structuredClone(assembly);
 const arm=manipulatorDescription(assembly);
 if(!arm.attached||!arm.valid||!arm.range.ok||
    !Number.isFinite(angle)||angle<arm.range.min||angle>arm.range.max)
   return {ok:false,reason:arm.range?.reason||'Requested angle exceeds mounted mechanical limits'};
 const result=updateJointPose(assembly,arm.bearingSerial,angle);
 if(!result.ok)return result;
 const checked=manipulatorDescription(assembly);
 if(!checked.valid){restore(assembly,before);return {ok:false,reason:checked.errors.join('; ')};}
 return {ok:true,angle,lengthM:checked.linkage.lengthM};
}
export function replaceManipulatorMechanism(assembly,type,variant){
 const prior=manipulatorDescription(assembly);
 if(!prior.attached)return {ok:false,reason:'Mount the manipulator first'};
 const before=structuredClone(assembly);
 try{
  if(!['bearing','actuator'].includes(type))throw Error('Unknown mechanism');
  const id=deviceId(type,variant),field=type==='bearing'?'bearingSerial':'actuatorSerial';
  if(prior[field]&&BY_ID.get(owner(assembly,prior[field]).definitionId).id===id)
   return {ok:true,unchanged:true};
  const next=selected(assembly,id);
  if(!next)throw Error('No detached '+id+' remains in inventory');
  if(type==='bearing'){
   // Replacing a bearing with a carried structural child must preserve it.
   const old=graphNode(assembly,prior.bearingSerial);
   const graph=structuredClone(assemblyGraph(assembly));
   delete graph.nodes[prior.bearingSerial];
   graph.nodes[next.serial]={...old,serial:next.serial,definitionId:id};
   graph.nodes[prior.lowerSerial].parentSerial=next.serial;
   const v=validateGraph(graph,assembly,BY_ID);
   if(!v.valid)throw Error(v.errors.join('; '));
   assembly.graph=graph;
   const priorAngle=assembly.labJointAngles?.[prior.bearingSerial]??0;
   delete assembly.labJointAngles[prior.bearingSerial];
   assembly.labJointAngles[next.serial]=priorAngle;
  }else{
   const removed=proposeRemoval(assemblyGraph(assembly),prior.actuatorSerial);
   if(!removed.ok)throw Error(removed.reason);
   assembly.graph=removed.graph;
   const added=proposeAttachment(assembly,BY_ID,next.serial,prior.upperSerial,'drive-mount');
   if(!added.ok)throw Error(added.reason);
   assembly.graph=added.graph;
  }
  assembly.labManipulator[field]=next.serial;
  const changed=manipulatorDescription(assembly);
  if(!changed.range?.ok)throw Error(changed.range?.reason||'Unreachable actuator');
  // New mechanical limits may exclude the previous pose. Return to neutral
  // rather than silently clipping or pretending its prior angle remains legal.
  if(!changed.valid){
   // A different installed rotor/stroke may invalidate the prior pose.
   // Explicitly return to neutral and recheck the entire linked mechanism.
   assembly.labJointAngles[assembly.labManipulator.bearingSerial]=0;
  }
  const after=manipulatorDescription(assembly);
  if(!after.valid)throw Error(after.errors.join('; '));
  return {ok:true,serial:next.serial,replaced:prior[field],range:after.range};
 }catch(e){restore(assembly,before);return {ok:false,reason:e.message};}
}
export function manipulatorBlueprint(assembly){
 const arm=manipulatorDescription(assembly);
 if(!arm.attached)return {enabled:false};
 return {enabled:true,bracketSerial:arm.bracketSerial,upperSerial:arm.upperSerial,
   bearingSerial:arm.bearingSerial,lowerSerial:arm.lowerSerial,
   actuatorSerial:arm.actuatorSerial,angle:round(arm.angle)};
}
export function restoreManipulatorBlueprint(assembly,input){
 if(!input||typeof input!=='object'||typeof input.enabled!=='boolean')
   return {ok:false,reason:'Malformed manipulator blueprint'};
 if(!input.enabled)return {ok:true};
 const fields=['enabled','bracketSerial','upperSerial','bearingSerial','lowerSerial','actuatorSerial','angle'];
 if(Object.keys(input).sort().join(',')!==[...fields].sort().join(',')||
   ['bracketSerial','upperSerial','bearingSerial','lowerSerial','actuatorSerial']
     .some(field=>typeof input[field]!=='string')||!Number.isFinite(input.angle))
    return {ok:false,reason:'Invalid manipulator identity fields'};
 const bearing=owner(assembly,input.bearingSerial),drive=owner(assembly,input.actuatorSerial);
 const b=BY_ID.get(bearing?.definitionId),d=BY_ID.get(drive?.definitionId);
 if(b?.device!=='bearing'||d?.device!=='actuator')
    return {ok:false,reason:'Blueprint hardware IDs are not owned compatible mechanisms'};
 const installed=installManipulator(assembly,{bearingVariant:b.variant,actuatorVariant:d.variant,serials:input});
 if(!installed.ok)return installed;
 const positioned=manipulatorJointAction(assembly,input.angle);
 if(!positioned.ok){removeManipulator(assembly);return positioned;}
 return {ok:true};
}
