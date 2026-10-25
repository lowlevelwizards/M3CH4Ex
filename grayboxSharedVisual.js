/** Stage 13: reuse actual M3CH4 authored visual assets, not alternative
 * hand-imitations of their silhouettes. All edits are visual-only.
 */
import * as THREE from 'three';
import {buildPartVisual,SHARED_PART_IDS} from './partVisuals.js';
import {applyPartFinish} from './partFinish.js';
import {YARDWALKER_LAYOUT,KESTREL_LAYOUT,HAULER_LAYOUT} from './mobilityDefinitions.js';
export const LIVE_VISUAL_IDS=new Set(SHARED_PART_IDS);
const vec=p=>new THREE.Vector3(...p);
function clad(parent,name,center,size,material){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
 mesh.name=name;mesh.position.set(...center);parent.add(mesh);return mesh;
}
function segmentPanel(root,name,a,b,width,depth,material){
 const p=vec(a),q=vec(b),span=q.clone().sub(p);
 const length=span.length();if(length<.09)return;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,length*.76,depth),material);
 mesh.name=name;mesh.position.copy(p.add(q).multiplyScalar(.5));
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),span.normalize());
 root.add(mesh);
}
function protectMobility(root,id,paint,armor){
 const layout={'legs-yard':YARDWALKER_LAYOUT,'legs-compact':KESTREL_LAYOUT,
  'legs-hauler':HAULER_LAYOUT}[id],paintMat=new THREE.MeshStandardMaterial({
  color:paint.main,metalness:.22,roughness:.75,flatShading:true});
 paintMat.userData.grayboxOwned=true;
 for(const leg of layout.legs){
  const side=leg.side;
  // Deliberately link-based; the armor belongs to physical upper and lower
  // segments rather than hovering at a nominal global thigh/shin position.
  const hip=leg.hip,knee=leg.knee,ankle=leg.ankle;
  if(!hip||!knee||!ankle)continue;
  const thick=id==='legs-hauler'?.37:id==='legs-compact'?.17:.245;
  const outward=x=>[x[0]+side*.022,x[1],x[2]-.10];
  segmentPanel(root,'additional '+(side<0?'left':'right')+' thigh shell',
   outward(hip),outward(knee),thick,thick*.75,paintMat);
  segmentPanel(root,'additional '+(side<0?'left':'right')+' shin shell',
   outward(knee),outward(ankle),thick*(id==='legs-compact'?.90:1.12),
   thick*.89,paintMat);
 }
}
function additionalShells(root,category,id,paint){
 const bounds=new THREE.Box3().setFromObject(root);
 if(bounds.isEmpty())return;
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const mat=new THREE.MeshStandardMaterial({
  color:paint.main,metalness:.23,roughness:.8,flatShading:true});
 mat.userData.grayboxOwned=true;
 const front=bounds.min.z-.028;
 if(category==='mobility'){protectMobility(root,id,paint,2);return;}
 if(category==='cab'){
  for(const side of [-1,1]){
   clad(root,'enclosed cab side '+side,
    [center.x+side*(size.x/2+.025),center.y-.06,center.z+.08],
    [.115,Math.max(.27,size.y*.63),Math.max(.30,size.z*.73)],mat);
   // Two standoffs are held captive between cockpit structure and armor.
   for(const sign of [-1,1])clad(root,'cab shell bolted standoff '+side+' '+sign,
    [center.x+side*(size.x*.45),center.y+sign*size.y*.22,center.z+.08],
    [.14,.12,.17],mat);
  }
  clad(root,'enclosed roof rim',
   [center.x,bounds.max.y+.015,center.z+.03],
   [size.x*.89,.085,size.z*.76],mat);
  for(const side of [-1,1])clad(root,'enclosed cockpit roof support '+side,
    [center.x+side*size.x*.32,bounds.max.y-.027,center.z+.06],
    [.12,.13,size.z*.57],mat);
 }else if(category==='frame'){
  for(const side of [-1,1]){
   clad(root,'removable outboard shoulder fairing '+side,
    [center.x+side*(size.x*.40),center.y+.01,center.z-.03],
    [size.x*.19,size.y*.55,size.z*.46],mat);
   for(const sign of [-1,1])clad(root,'frame cover steel bracket '+side+' '+sign,
    [center.x+side*size.x*.30,center.y+sign*size.y*.21,center.z-.03],
    [size.x*.21,.095,.18],mat);
  }
  clad(root,'removable belly protection',[center.x,bounds.min.y+.17,front+.03],
   [size.x*.46,.27,.105],mat);
  for(const side of [-1,1])clad(root,'belly plate backing gusset '+side,
   [center.x+side*size.x*.18,bounds.min.y+.17,front+.15],
   [.13,.20,.26],mat);
 }else if(category==='combat'){
  clad(root,'breech upper armored shroud',
   [center.x,center.y+size.y*.28,center.z+size.z*.18],
   [size.x*.81,.13,size.z*.37],mat);
  for(const sign of [-1,1])clad(root,'upper breech clamp '+sign,
   [center.x+sign*size.x*.27,center.y+size.y*.18,center.z+size.z*.17],
   [.11,size.y*.23,.18],mat);
  clad(root,'sacrificial breech side armor',
   [center.x+size.x*.45,center.y,center.z+size.z*.22],
   [.095,size.y*.62,size.z*.32],mat);
  clad(root,'breech side backing frame',
   [center.x+size.x*.35,center.y,center.z+size.z*.22],
   [.21,size.y*.50,.17],mat);
 }
}
function stripNativeProtection(root,degree){
 // Bare: peel off removable protective coatings, but NEVER delete the
 // visible structural steel, transmission parts, shafts or cockpit glazing.
 // Coating IDs belong to the live visual kit.
 let hidden=0;
 root.traverse(node=>{
  if(!node.isMesh)return;
  const materials=Array.isArray(node.material)?node.material:[node.material];
  const armor=materials.some(m=>m?.userData?.materialRole==='protective-paint');
  if(armor&&degree===0){node.visible=false;hidden++;}
 });
 return hidden;
}
/** Core three levels:
 * 0 bare: exposed authored mechanical internals, cosmetic protection hidden.
 * 1 armored: original authored live part unchanged.
 * 2 encased: original protected assembly plus removable additional cladding.
 */
export function buildSharedVisual(category,id,paint,armor=1){
 if(!LIVE_VISUAL_IDS.has(id))return null;
 const root=buildPartVisual(id,{mode:'preview'});
 if(!root)return null;
 const debug=root.userData.outline;
 if(debug){debug.parent?.remove(debug);debug.geometry?.dispose?.();
  delete root.userData.outline;}
 applyPartFinish(root,id,{
  primary:paint.main,secondary:paint.secondary,
  armor:paint.main,accent:paint.accent
 });
 root.userData.grayboxVisualSource='live-game-authored';
 root.userData.armorCoverage=armor;
 const hidden=stripNativeProtection(root,armor);
 if(armor===2)additionalShells(root,category,id,paint);
 if(armor===0&&hidden===0){
  // Keep any untagged protective stock meshes rather than deleting
  // structural components by guessing from their names.
  root.userData.bareUnmodifiedStockProtection=true;
 }
 return root;
}
