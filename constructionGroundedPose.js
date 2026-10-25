/** Stage 08D: foot-targeted posing on real serviceable components.
 * Port of the live game's grounded-foot design, not its combat movement.
 * - liveLegIK.js contains the original M3CH4 two-link solver.
 * - stationary stance anchors remain fixed in the lab's white-room world
 * - a lifted foot has a committed swing target and explicit ground height
 * - body lowers relative to the planted foot instead of folding in space
 * Kinematics only: no forces, torque, traction or gait physics.
 */
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';
import {solveLegIK,clamp} from './liveLegIK.js';
import {JOINT_LIMITS,ARTICULATION_SIDES,neutralPose,validatePose,articulationReport} from './constructionArticulation.js';
const RAD=180/Math.PI,round=v=>Math.round(v*10000)/10000;
const DEFAULT_FOOT=()=>({z:0,y:0,planted:true});
export const GUIDED_STATES=Object.freeze(['neutral','crouch','step-left','step-right','asymmetric']);
export function neutralGrounding(){
  return {mode:'manual',bodyDropM:0,bodyTravelZM:0,
    feet:{left:DEFAULT_FOOT(),right:DEFAULT_FOOT()}};
}
export function groundedTargets(name){
  const state=neutralGrounding();state.mode='grounded';
  switch(name){
    case 'neutral':break;
    case 'crouch':state.bodyDropM=.15;break;
    case 'step-left':state.bodyDropM=.035;state.feet.left={z:-.18,y:.09,planted:false};break;
    case 'step-right':state.bodyDropM=.035;state.feet.right={z:-.18,y:.09,planted:false};break;
    case 'asymmetric':state.bodyDropM=.04;state.feet.left={z:-.13,y:.075,planted:false};break;
    default:throw new Error('Unknown grounded movement '+name);
  }
  return state;
}
export function validateGrounding(g){
  const errors=[];
  if(!g||!['manual','grounded'].includes(g.mode))return {valid:false,errors:['Unknown pose control mode']};
  if(!Number.isFinite(g.bodyDropM)||g.bodyDropM<0||g.bodyDropM>.32)errors.push('Body drop must be 0..0.32m');
  if(!Number.isFinite(g.bodyTravelZM)||Math.abs(g.bodyTravelZM)>.48)errors.push('Body travel exceeds demonstration envelope');
  if(!g.feet||Object.keys(g.feet).sort().join(',')!=='left,right')errors.push('Both foot contacts required');
  else for(const side of ARTICULATION_SIDES){
    const f=g.feet[side];
    if(!f||!Number.isFinite(f.y)||!Number.isFinite(f.z)||Math.abs(f.z)>.55||f.y<0||f.y>.3||typeof f.planted!=='boolean')
      errors.push(side+' foot target is invalid');
    else if(f.planted&&f.y!==0)errors.push(side+' planted foot cannot be above ground');
  }
  return {valid:errors.length===0,errors};
}
function clampAngles(side,p,strict,limitsForSide=null){
  for(const joint of ['hip','knee','ankle']){
    const k=side+':'+joint,lim=limitsForSide?.(side,joint)||JOINT_LIMITS[joint];
    if(strict&&(p[k]<lim.min-.001||p[k]>lim.max+.001))return false;
    p[k]=round(clamp(p[k],lim.min,lim.max));
  }
  return true;
}
/** Derive a pose from the installed knee/shin interface rest coordinates.
 * Rook S2 has matching anchors, so its effective segment lengths are equal.
 * A future shin with new length can supply its own geometry via the graph.
 * The same analytic equation applies; no paired-parts special animation.
 */
export function solveGroundedRig(grounding,{
  upperLowerForSide=null,limitsForSide=null,validateCandidate=null,strict=true
}={}){
  const check=validateGrounding(grounding);
  if(!check.valid)return {ok:false,reason:check.errors.join('; ')};
  if(grounding.mode==='manual')return {ok:true,pose:null,grounding};
  const pose=neutralPose(),contacts=[];
  for(const side of ARTICULATION_SIDES){
    const leg=YARDWALKER_LAYOUT.legs.find(x=>x.side===(side==='left'?-1:1));
    const mechanics=upperLowerForSide?.(side);
    const upper=mechanics?.upper||[leg.knee[1]-leg.hip[1],leg.knee[2]-leg.hip[2]];
    const lower=mechanics?.lower||[leg.ankle[1]-leg.knee[1],leg.ankle[2]-leg.knee[2]];
    const foot=grounding.feet[side];
    // Reference ankle ground plane is shared across unequal leg lengths.
    // A long shin must *bend* to reach it; no virtual shortening/stretching.
    const restY=upper[0]+lower[0],restZ=upper[1]+lower[1];
    const referenceY=mechanics?.referenceAnkleY??restY;
    const referenceZ=mechanics?.referenceAnkleZ??restZ;
    // An oversized stabilizer sole contacts the floor BELOW the ankle.
    // Raise the ankle by the authored extra sole drop to keep that sole planted.
    const deltaY=referenceY-restY+grounding.bodyDropM+foot.y+
      (mechanics?.footContactDropM||0);
    const deltaZ=referenceZ-restZ+foot.z-grounding.bodyTravelZM;
    const solved=solveLegIK(upper,lower,deltaY,deltaZ);
    // Counter-rotation of the ankle leaves the sole close to its original pitch.
    // The original authored neutral pitch is preserved.
    pose[side+':hip']=round(solved.hip*RAD);
    pose[side+':knee']=round(solved.knee*RAD);
    pose[side+':ankle']=round(-(solved.hip+solved.knee)*RAD);
    if(!clampAngles(side,pose,strict,limitsForSide))
      return {ok:false,reason:side+' foot target exceeds a joint limit'};
    contacts.push({side,planted:foot.planted,worldZ:foot.z,
      groundY:foot.y,reachM:solved.reach,
      upperLengthM:Math.hypot(...upper),lowerLengthM:Math.hypot(...lower),
      referenceAnkleY:referenceY});
  }
  const limits=validatePose(pose);
  if(!limits.valid)return {ok:false,reason:limits.errors.join('; ')};
  const verdict=validateCandidate?.(pose);
  if(strict&&verdict&&!verdict.ok)return {ok:false,reason:verdict.reason};
  const report=validateCandidate?null:articulationReport({labPose:pose});
  if(strict&&report&&!report.valid)return {ok:false,reason:report.errors.concat(report.warnings).join('; ')};
  return {ok:true,pose,grounding:structuredClone(grounding),contacts,report};
}
export function applyGrounding(assembly,targets,opts={}){
  const result=solveGroundedRig(targets,opts);
  if(!result.ok)return result;
  if(targets.mode==='grounded'){
    if(!assembly.labGrounding||assembly.labGrounding.mode!=='grounded')
      assembly.labManualPose=structuredClone(assembly.labPose||neutralPose());
    assembly.labPose=result.pose;
  }else{
    assembly.labPose=structuredClone(assembly.labManualPose||neutralPose());
  }
  assembly.labGrounding=structuredClone(targets);
  return result;
}
export function returnToManual(assembly){
  // Manual mode owns its own joint state. A guided crouch must never leave the
  // body's translation reset with the legs still folded into the old IK pose.
  const pose=structuredClone(assembly.labManualPose||assembly.labPose||neutralPose());
  assembly.labGrounding=neutralGrounding();
  assembly.labPose=pose;
  assembly.labManualPose=structuredClone(pose);
  return {ok:true,pose};
}
const smooth=t=>t*t*(3-2*t);
/** Deterministic two-step demonstration with committed world anchors.
 * The supporting pad never chases the moving chassis. Each swing takes a
 * fixed launch/landing position and a clearance arc.
 */
export function contactWalkFrame(t,{liftM=.10,stepDistanceM=.25,bodyDropM=.04,supportDropM=0}={}){
  t=clamp(t,0,1);
  const g=groundedTargets('neutral');
  g.bodyDropM=bodyDropM+supportDropM;
  const step=(u,from,to)=>{
    const f=smooth(clamp(u,0,1));
    return {z:round(from+(to-from)*f),y:round(Math.sin(Math.PI*f)*liftM),
      planted:u<=0||u>=1};
  };
  if(t<.5){
    const u=t/.5;
    g.bodyTravelZM=round(-stepDistanceM*.42*smooth(u));
    g.feet.left=step(u,0,-stepDistanceM);
  }else{
    const u=(t-.5)/.5;
    g.bodyTravelZM=round(-stepDistanceM*.42-stepDistanceM*.48*smooth(u));
    g.feet.left={z:-stepDistanceM,y:0,planted:true};
    g.feet.right=step(u,0,-stepDistanceM*1.12);
  }
  return g;
}
