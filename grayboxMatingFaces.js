/** Stage 16B: child-owned functional mating faces, in PART LOCAL metres.
 * These ports come from production fixture dimensions and the builder's own
 * intentionally designed service surfaces. They are independent of armor and
 * auxiliary silhouettes; no AABB-derived assembly placement is permitted
 * for supported ports.
 *
 * +X right, +Y up, -Z forward. Normals point OUT OF the child assembly.
 */
import {fitFixtureFor} from './chassisFitFixtures.js';

const face=(point,normal,description)=>Object.freeze({
 point:Object.freeze(point),normal:Object.freeze(normal),
 depth:.085,description
});
export function authoredMatingFace(partId,category,role,carrier='direct'){
 if(category==='combat'&&carrier!=='direct')return null; // Carrier needs its own pivot port.
 const fixture=fitFixtureFor(partId);
 const dims=fixture?.envelope;
 if(category==='cab'){
  if(partId==='cab-bubble-gb'){
   return role==='roof'?face([0,-.43,.04],[0,-1,0],'Welded underside of canopy tub'):
    role==='front'?face([0,-.16,.51],[0,0,1],'Rear crash frame of canopy tub'):null;
  }
  if(!dims)return null;
  return role==='roof'?face([0,-dims[1]/2,0],[0,-1,0],'U1 underside cockpit ring'):
   role==='front'?face([0,-.02,dims[2]/2],[0,0,1],'Cab rear structural flange'):null;
 }
 if(category==='combat'&&dims){
  if(role==='right')return face([-dims[0]/2,0,0],[-1,0,0],'Left trunnion load path');
  if(role==='left')return face([dims[0]/2,0,0],[1,0,0],'Right trunnion load path');
  if(role==='roof')return face([0,-dims[1]/2,0],[0,-1,0],'Breech underside gun pintle');
 }
 if(category==='power'&&dims){
  if(role==='rear'||role==='core')
   return face([0,0,-dims[2]/2],[0,0,-1],'Generator forward mounting flange');
 }
 return null; // Port not yet authored: retain legacy fit and flag via geometry audit.
}
/** Face rotations are kept outside part placement, so no mounting condition
 * can silently turn the muzzle backwards or reorient the cockpit window.
 */
export function matingFaceOpposesSocket(faceData,socketNormal){
 if(!faceData||!Array.isArray(socketNormal)||socketNormal.length!==3)return false;
 return faceData.normal.reduce((acc,x,i)=>acc+x*socketNormal[i],0)<-.95;
}
