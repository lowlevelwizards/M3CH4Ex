/** Stage 08 kinematic articulation — lab-local, pure data.
 * Degrees-of-freedom: 1-axis flexion/extension for hip, knee, ankle.
 * Angles are degrees and intentionally do not imply powered locomotion.
 */
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';
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
export function validatePose(input){
  const errors=[];
  if(!input||typeof input!=='object'||Array.isArray(input))
    return {valid:false,errors:['Pose must be an object']};
  const keys=Object.keys(neutralPose());
  if(Object.keys(input).some(k=>!keys.includes(k)))errors.push('Unknown pose channel');
  for(const key of keys){
    const v=input[key],joint=key.split(':')[1],limit=JOINT_LIMITS[joint];
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
  if(!Number.isFinite(degrees)||degrees<JOINT_LIMITS[joint].min||degrees>JOINT_LIMITS[joint].max)
    return {ok:false,reason:'Joint exceeds authored mechanical limits'};
  const next={...currentPose(assembly),[signature(side,joint)]:degrees};
  const verdict=validatePose(next);
  if(!verdict.valid)return {ok:false,reason:verdict.errors.join('; ')};
  assembly.labPose=next;
  return {ok:true,angle:degrees};
}
export function applyPosePreset(assembly,name){
  try{
    const pose=posePreset(name),check=validatePose(pose);
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
export function actuatorEndpoints(side,kneeAngle){
  if(!ARTICULATION_SIDES.includes(side)||!Number.isFinite(kneeAngle))
    throw new Error('Invalid actuator configuration');
  const leg=YARDWALKER_LAYOUT.legs.find(l=>l.side===(side==='left'?-1:1));
  const upper=[...leg.actuatorTop];
  const local=[leg.side*ACTUATOR_SPEC.lowerOutboardM,
    ACTUATOR_SPEC.lowerFromKnee[1],ACTUATOR_SPEC.lowerFromKnee[2]];
  const lower=add(leg.knee,rotatedX(local,kneeAngle));
  return {upper,lower,lengthM:Math.hypot(...sub(lower,upper))};
}
export function actuatorStrokeCheck(side,angle){
  const data=actuatorEndpoints(side,angle);
  return {...data,valid:data.lengthM>=ACTUATOR_SPEC.minLengthM-1e-6&&
    data.lengthM<=ACTUATOR_SPEC.maxLengthM+1e-6,
    extensionM:data.lengthM-ACTUATOR_SPEC.housingLengthM};
}
export function articulationReport(assembly){
  const pose=currentPose(assembly),joints=validatePose(pose),warnings=[],stroke=[];
  for(const side of ARTICULATION_SIDES){
    const angle=pose[signature(side,'knee')];
    const test=actuatorStrokeCheck(side,angle);
    stroke.push({side,angle,lengthM:test.lengthM,extensionM:test.extensionM,valid:test.valid});
    if(!test.valid)warnings.push(side+' knee: actuator outside stroke envelope');
  }
  return {valid:joints.valid&&warnings.length===0,errors:joints.errors,warnings,stroke,
    collisionStatus:'Conservative clearance visualization only; precise swept-mesh collision not evaluated'};
}
