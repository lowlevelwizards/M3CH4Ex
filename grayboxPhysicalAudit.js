/** Stage 16: independent geometry contact probes.
 * Broad-phase mesh-bounds checks on real assembled world transforms, NOT graph
 * parenting checks. Deliberately do not claim exact triangle/swept clearance.
 * All distances are metres. Pure functions so badly positioned meshes can be
 * tested without WebGL.
 */
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
export function pointToBoxDistance(point,box){
 if(!finite3(point)||!finite3(box?.min)||!finite3(box?.max))
  throw Error('Invalid measured geometry box');
 return Math.hypot(...point.map((value,i)=>
  Math.max(box.min[i]-value,0,value-box.max[i])));
}
export function nearestMaterialGap(point,boxes){
 if(!Array.isArray(boxes)||boxes.length===0)return Infinity;
 return Math.min(...boxes.map(b=>pointToBoxDistance(point,b)));
}
export function assessPhysicalContacts(probes,{maxGap=.18,groundTolerance=.07}={}){
 const issues=[],connections=[];
 for(const probe of probes){
  const {station,socket,target,childMeshes,parentMeshes,groundMin}=probe;
  if(!finite3(target)){
   issues.push(station+': missing measured attachment face');
   connections.push({station,socket,ok:false,parentGap:Infinity,childGap:Infinity});
   continue;
  }
  const parentGap=nearestMaterialGap(target,parentMeshes);
  const childGap=nearestMaterialGap(target,childMeshes);
  const ok=parentGap<=maxGap&&childGap<=maxGap;
  connections.push({station,socket,ok,parentGap,childGap});
  if(!ok)issues.push(station+' / '+socket+': unsupported mate, parent gap '+
   (Number.isFinite(parentGap)?parentGap.toFixed(3):'N/A')+' m, child gap '+
   (Number.isFinite(childGap)?childGap.toFixed(3):'N/A')+' m');
  if(Number.isFinite(groundMin)&&Math.abs(groundMin)>groundTolerance)
   issues.push(station+': contact sole '+groundMin.toFixed(3)+' m from ground');
 }
 return {ok:issues.length===0,checked:connections.length,
  connected:connections.filter(x=>x.ok).length,connections,issues,
  method:'world-space visible mesh bounds; coarse contact only; dynamic clearance unverified'};
}
