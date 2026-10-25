/** Stage 08 kinematic articulation — lab-local, pure data.
 * Degrees-of-freedom: 1-axis flexion/extension for hip, knee, ankle.
 * Angles are degrees and intentionally do not imply powered locomotion.
 */
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';
import {installedDevice,installedSection,deviceBinding} from './constructionMechanisms.js';
import {BY_ID} from './components.js';
export const ARTICULATION_SIDES=Object.freeze(['left','right']);
export const ARTICULATION_JOINTS=Object.freeze(['hip','knee','ankle']);
export const JOINT_LIMITS=Object.freeze({
  hip:Object.freeze({min:-35,max:55,axis:'x',description:'Sagittal hip flexion'}),
  knee:Object.freeze({min:-10,max:100,axis:'x',description:'Knee compression'}),
  ankle:Object.freeze({min:-35,max:45,axis:'x',description:'Ankle pitch'})
});
export const ACTUATOR_SPEC=Object.freeze({
  housingLengthM:.34,
  minLengthM:.48,maxLengthM:.70,
  // Upper mount retained from original authored model. Bottom is intentionally
  // moved to the SHIN side of the knee so it crosses the movable joint.
  lowerFromKnee:[.0,-.23,.065],
  lowerOutboardM:.07
});
const signature=(side,joint)=>side+':'+joint;
export function neutralPose(){
  return Object.fromEntries(ARTICULATION_SIDES.flatMap(side=>
    ARTICULATION_JOINTS.map(joint=>[signature(side,joint),0])));
}
export const PRESET_NAMES=Object.freeze(['neutral','crouch','step-left','step-right','asymmetric']);
export function posePreset(name){
  const base=neutralPose();
  if(name==='neutral')return base;
  if(name==='crouch'){
    for(const side of ARTICULATION_SIDES){
      base[signature(side,'hip')]=18;
      base[signature(side,'knee')]=45;
      base[signature(side,'ankle')]=-20;
    }
  }else if(name==='step-left'||name==='step-right'){
    const lifted=name==='step-left'?'left':'right';
    base[signature(lifted,'hip')]=35;
    base[signature(lifted,'knee')]=70;
    base[signature(lifted,'ankle')]=-25;
    const planted=lifted==='left'?'right':'left';
    base[signature(planted,'hip')]=-8;
    base[signature(planted,'knee')]=10;
    base[signature(planted,'ankle')]=8;
  }else if(name==='asymmetric'){
    base['left:hip']=25;base['left:knee']=70;base['left:ankle']=-15;
    base['right:hip']=-15;base['right:knee']=20;base['right:ankle']=15;
  }else throw new Error('Unknown pose preset');
  return base;
}
export function jointLimitsFor(assembly,side,joint){
  if(joint!=='knee'||!assembly?.owned)return JOINT_LIMITS[joint];
  const bearing=installedDevice(assembly,side,'bearing');
  return bearing?.definition.range||{min:0,max:0,axis:'x',
    description:'Rotary bearing removed'};
}
export function jointWorkingRange(assembly,side,joint){
  const bearing=jointLimitsFor(assembly,side,joint);
  if(joint!=='knee'||!assembly?.owned)return {...bearing,powered:true,limiter:'joint'};
  const rotor=installedDevice(assembly,side,'bearing'),
    drive=installedDevice(assembly,side,'actuator');
  if(!rotor)return {...bearing,powered:false,limiter:'rotary bearing absent'};
  if(!drive||!deviceBinding(assembly,side))
    return {...bearing,powered:false,limiter:'actuator absent'};
  const angles=[];
  for(let angle=bearing.min;angle<=bearing.max;angle+=1){
    const check=actuatorStrokeCheck(side,angle,assembly);
    if(check.valid)angles.push(angle);
  }
  if(!angles.length)return {min:0,max:0,powered:false,
    limiter:'no stroke within bearing limits',axis:bearing.axis};
  // Only expose the continuous reachable interval encompassing neutral pose.
  const middle=angles.reduce((a,v)=>Math.abs(v)<Math.abs(a)?v:a,angles[0]);
  let start=angles.indexOf(middle),end=start;
  while(start>0&&angles[start]-angles[start-1]===1)start--;
  while(end<angles.length-1&&angles[end+1]-angles[end]===1)end++;
  return {min:angles[start],max:angles[end],powered:true,
    axis:bearing.axis,limiter:angles[start]>bearing.min||angles[end]<bearing.max
      ?'linear actuator stroke':'rotary bearing'};
}
export function validatePose(input,assembly=null){
  const errors=[];
  if(!input||typeof input!=='object'||Array.isArray(input))
    return {valid:false,errors:['Pose must be an object']};
  const keys=Object.keys(neutralPose());
  if(Object.keys(input).some(k=>!keys.includes(k)))errors.push('Unknown pose channel');
  for(const key of keys){
    const v=input[key],side=key.split(':')[0],joint=key.split(':')[1],
      limit=jointLimitsFor(assembly,side,joint);
    if(!Number.isFinite(v)||v<limit.min||v>limit.max)
      errors.push(key+' must remain in '+limit.min+'° to '+limit.max+'°');
  }
  return {valid:errors.length===0,errors};
}
export function currentPose(assembly){
  return assembly.labPose?{...assembly.labPose}:neutralPose();
}
export function setJointAngle(assembly,side,joint,degrees){
  if(!ARTICULATION_SIDES.includes(side)||!ARTICULATION_JOINTS.includes(joint))
    return {ok:false,reason:'Unknown mechanical joint'};
  const range=jointWorkingRange(assembly,side,joint);
  if(!Number.isFinite(degrees)||degrees<range.min||degrees>range.max)
    return {ok:false,reason:'Joint exceeds '+range.limiter+' range ('+range.min+'° to '+range.max+'°)'};
  const next={...currentPose(assembly),[signature(side,joint)]:degrees};
  const verdict=validatePose(next,assembly);
  if(!verdict.valid)return {ok:false,reason:verdict.errors.join('; ')};
  assembly.labPose=next;
  return {ok:true,angle:degrees};
}
export function applyPosePreset(assembly,name){
  try{
    const pose=posePreset(name),check=validatePose(pose,assembly);
    if(!check.valid)return {ok:false,reason:check.errors.join('; ')};
    assembly.labPose=pose;return {ok:true,pose};
  }catch(error){return {ok:false,reason:error.message};}
}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
function rotatedX(v,degrees){
  const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return [v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c];
}
/** Physical stroke is derived from both moving attachment points. This check
 * works independent of the browser's Three.js rendering.
 */
export function actuatorEndpoints(side,kneeAngle,assembly=null){
  if(!ARTICULATION_SIDES.includes(side)||!Number.isFinite(kneeAngle))
    throw new Error('Invalid actuator configuration');
  const leg=YARDWALKER_LAYOUT.legs.find(l=>l.side===(side==='left'?-1:1));
  const thigh=assembly?.owned&&installedSection(assembly,side,'thigh');
  const thighDef=BY_ID.get(thigh?.definitionId);
  const kneeRelative=thighDef?.sockets?.find(s=>s.id==='knee')?.position||
    sub(leg.knee,leg.hip);
  const drive=assembly?.owned&&installedDevice(assembly,side,'actuator');
  const shin=assembly?.owned&&installedSection(assembly,side,'shin');
  const shinDef=BY_ID.get(shin?.definitionId);
  const lowerOffset=shinDef?.mechanical?.driveAnchors?.[drive?.definition.variant]||
    [leg.side*ACTUATOR_SPEC.lowerOutboardM,
      ACTUATOR_SPEC.lowerFromKnee[1],ACTUATOR_SPEC.lowerFromKnee[2]];
  const upper=thighDef?.sockets?.find(s=>s.id==='drive-mount')?.position||
    sub(leg.actuatorTop,leg.hip);
  const lower=add(kneeRelative,rotatedX(lowerOffset,kneeAngle));
  return {upper,lower,lengthM:Math.hypot(...sub(lower,upper))};
}
export function actuatorStrokeCheck(side,angle,assembly=null){
  const data=actuatorEndpoints(side,angle,assembly);
  const drive=assembly?.owned&&installedDevice(assembly,side,'actuator');
  const stroke=drive?.definition.stroke||{min:ACTUATOR_SPEC.minLengthM,
    max:ACTUATOR_SPEC.maxLengthM,housing:ACTUATOR_SPEC.housingLengthM};
  return {...data,valid:data.lengthM>=stroke.min-1e-6&&
    data.lengthM<=stroke.max+1e-6,
    extensionM:data.lengthM-stroke.housing,
    mechanism:drive?.definition.name||'reference utility drive',
    serial:drive?.serial||null};
}
export function articulationReport(assembly){
  const pose=currentPose(assembly),joints=validatePose(pose,assembly),
    warnings=[],stroke=[],range=[],errors=[...joints.errors];
  for(const side of ARTICULATION_SIDES){
    const angle=pose[signature(side,'knee')],drive=assembly?.owned?
      installedDevice(assembly,side,'actuator'):null;
    const bearing=assembly?.owned?installedDevice(assembly,side,'bearing'):null;
    const limits=jointWorkingRange(assembly,side,'knee');
    range.push({side,...limits,bearing:bearing?.definition.name||'reference bearing'});
    if(assembly?.owned&&(!drive||!deviceBinding(assembly,side))){
      warnings.push(side+' knee: linear actuator disconnected; powered posing unavailable');
      stroke.push({side,angle,lengthM:0,extensionM:0,valid:false,unpowered:true});
      continue;
    }
    const test=actuatorStrokeCheck(side,angle,assembly);
    stroke.push({side,angle,lengthM:test.lengthM,extensionM:test.extensionM,
      valid:test.valid,serial:test.serial,mechanism:test.mechanism});
    if(!test.valid)errors.push(side+' '+test.mechanism+' exceeds physical stroke at '+angle+'°');
  }
  return {valid:errors.length===0,errors,warnings,stroke,range,
    powered:stroke.every(item=>item.valid)&&
      ARTICULATION_SIDES.every(side=>!assembly?.owned||
        !!installedDevice(assembly,side,'bearing')),
    collisionStatus:'Conservative clearance hints, not swept-mesh contact'};
}
