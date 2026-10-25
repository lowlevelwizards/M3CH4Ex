/** Adapted from live M3CH4/articulationMotion.js: analytic two-link IK.
 * The live file also imports weapon reload choreography, so we transplant
 * ONLY the leg solver rather than adding an unrelated combat dependency.
 * This uses rest-direction corrections rather than assuming vertical links,
 * preserving Yardwalker and future reverse-knee leg identities.
 */
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const shortestAngle=r=>Math.atan2(Math.sin(r),Math.cos(r));
export function solveLegIK(upper,lower,deltaY,deltaZ){
  const [uy,uz]=upper,[ly,lz]=lower;
  const l1=Math.hypot(uy,uz),l2=Math.hypot(ly,lz);
  if(l1<.05||l2<.05)return {hip:0,knee:0,reach:0};
  let dy=uy+ly+deltaY,dz=uz+lz+deltaZ;
  const original=Math.hypot(dy,dz);
  const reach=clamp(original,Math.abs(l1-l2)+.003,l1+l2-.004);
  if(original>1e-5){dy*=reach/original;dz*=reach/original;}
  else {dy=-reach;dz=0;}
  const phi=Math.atan2(dz,dy);
  const elbow=Math.acos(clamp((l1*l1+reach*reach-l2*l2)/(2*l1*reach),-1,1));
  const upperRest=Math.atan2(uz,uy),lowerRest=Math.atan2(lz,ly);
  let best=null;
  for(const sign of [-1,1]){
    const upperWorld=phi+sign*elbow;
    const ky=dy-l1*Math.cos(upperWorld),kz=dz-l1*Math.sin(upperWorld);
    const lowerWorld=Math.atan2(kz,ky);
    const hip=shortestAngle(upperWorld-upperRest);
    const knee=shortestAngle(lowerWorld-lowerRest-hip);
    const score=hip*hip*.9+knee*knee*.7;
    if(!best||score<best.score)best={hip,knee,reach,score};
  }
  // The original live model clamps to ~49° hip and ~69° knee; let
  // the CONSTRUCTION lab validate against its authored joint limits instead.
  return {hip:best.hip,knee:best.knee,reach,score:best.score};
}
