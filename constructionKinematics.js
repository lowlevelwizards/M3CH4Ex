/** Stage 11: topology-independent joint commands and two-ended constraints.
 * The structural tree has one parent per part; a two-ended actuator is an
 * independently validated constraint rather than a second graph parent.
 */
import {BY_ID,assemblyGraph} from './components.js';

const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const rotX=(v,deg)=>{
  const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return [v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c];
};
const norm=p=>Math.hypot(...p);
export function mechanismJointDescriptors(assembly){
  const graph=assemblyGraph(assembly),out=[];
  for(const node of Object.values(graph.nodes)){
    const def=BY_ID.get(node.definitionId),kin=def?.kinematic;
    if(!kin||kin.axis!=='x')continue;
    const value=kin.command==='serial'
      ?assembly.labJointAngles?.[node.serial]??0
      :assembly.labPose?.[def.side+':'+def.section]??0;
    const range=def.range||kin.range||{min:-180,max:180};
    out.push({serial:node.serial,axis:'x',angle:value,
      key:kin.command==='serial'?node.serial:def.side+':'+def.section,
      min:range.min,max:range.max,role:def.section||null,
      device:def.device||null});
  }
  return out;
}
export function scalarJointPose(assembly,serial){
  const node=assemblyGraph(assembly).nodes[serial],def=BY_ID.get(node?.definitionId);
  if(!def?.kinematic)return null;
  return def.kinematic.command==='serial'?(assembly.labJointAngles?.[serial]??0):
    (assembly.labPose?.[def.side+':'+def.section]??0);
}
export function updateJointPose(assembly,serial,angle){
  const graph=assemblyGraph(assembly),node=graph.nodes[serial];
  const def=BY_ID.get(node?.definitionId),range=def?.range||def?.kinematic?.range;
  if(!def?.kinematic||def.kinematic.command!=='serial'||!Number.isFinite(angle)||
    !range||angle<range.min||angle>range.max)
    return {ok:false,reason:'Joint command outside mounted rotary limits'};
  if(!assembly.labJointAngles)assembly.labJointAngles={};
  assembly.labJointAngles[serial]=angle;
  return {ok:true,angle};
}
export function anchoredLink(assembly,{
  actuatorSerial,sourceSerial,sourceSocket,targetSerial,targetAnchors
}){
  const graph=assemblyGraph(assembly);
  const active=s=>graph.nodes[s]||null;
  const drive=active(actuatorSerial),source=active(sourceSerial),target=active(targetSerial);
  if(!drive||!source||!target||drive.parentSerial!==sourceSerial||
    drive.parentSocket!==sourceSocket)return {ok:false,reason:'Drive has no valid source'};
  const def=BY_ID.get(drive.definitionId),sourceDef=BY_ID.get(source.definitionId),
    targetDef=BY_ID.get(target.definitionId);
  if(def?.device!=='actuator')return {ok:false,reason:'Constraint requires a linear actuator'};
  const from=sourceDef?.sockets?.find(s=>s.id===sourceSocket);
  const to=targetDef?.mechanical?.[targetAnchors]?.[def.variant];
  if(!from||!Array.isArray(to)||to.length!==3||!Array.isArray(from.position))
    return {ok:false,reason:'Both endpoints must exist on installed parts'};
  return {ok:true,actuatorSerial,sourceSerial,targetSerial,
    sourceLocal:[...from.position],targetLocal:[...to],
    stroke:{...def.stroke},device:drive.definitionId};
}
export function referenceLinkLength(binding,sourceOrigin,targetOrigin,angle){
  if(!binding?.ok)return null;
  const top=sourceOrigin.map((v,i)=>v+binding.sourceLocal[i]);
  const lower=targetOrigin.map((v,i)=>v+rotX(binding.targetLocal,angle)[i]);
  return norm(sub(lower,top));
}
/** Relative joint-anchor space: the source mount and target pivot are both
 * specified relative to one joint rest pivot in the parent link's local frame.
 * The same calculation works on a knee, elbow or tool hinge.
 */
export function linkedStrokeLength(sourceFromPivot,targetFromPivot,angle){
  return norm(sub(rotX(targetFromPivot,angle),sourceFromPivot));
}
export function jointStrokeRange(sourceFromPivot,targetFromPivot,driveDef,rotorDef){
  if(!driveDef?.stroke||!rotorDef?.range)return {ok:false,reason:'Missing connected drive/bearing'};
  const {min,max}=rotorDef.range,spec=driveDef.stroke;
  const allowed=[];
  for(let angle=Math.ceil(min);angle<=Math.floor(max);angle++){
    const length=linkedStrokeLength(sourceFromPivot,targetFromPivot,angle);
    if(length>=spec.min-1e-6&&length<=spec.max+1e-6)allowed.push(angle);
  }
  if(!allowed.length)return {ok:false,reason:'Actuator stroke cannot reach rotary joint'};
  const zero=allowed.reduce((a,b)=>Math.abs(a)<Math.abs(b)?a:b,allowed[0]);
  let index=allowed.indexOf(zero),lo=index,hi=index;
  while(lo>0&&allowed[lo]-allowed[lo-1]===1)lo--;
  while(hi<allowed.length-1&&allowed[hi+1]-allowed[hi]===1)hi++;
  return {ok:true,min:allowed[lo],max:allowed[hi],
    limiter:allowed[lo]>min||allowed[hi]<max?'actuator stroke':'rotary bearing'};
}
