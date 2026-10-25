/** Stage 11 authoring — modest, engineered workshop manipulator components.
 * Different mechanisms reuse the *exact same* production-local catalogue
 * bearing and hydraulic geometry rendered on the Yardwalker knees.
 */
import * as THREE from 'three';
const metals={
  iron:new THREE.MeshStandardMaterial({color:0x535f5c,roughness:.71,metalness:.40,flatShading:true}),
  dark:new THREE.MeshStandardMaterial({color:0x344642,roughness:.82,metalness:.22,flatShading:true}),
  green:new THREE.MeshStandardMaterial({color:0x78866c,roughness:.83,metalness:.22,flatShading:true}),
  stripe:new THREE.MeshStandardMaterial({color:0xc49b57,roughness:.80,metalness:.19,flatShading:true}),
  steel:new THREE.MeshStandardMaterial({color:0x819e9d,roughness:.56,metalness:.49,flatShading:true})
};
const P=xyz=>new THREE.Vector3(...xyz);
const up=new THREE.Vector3(0,1,0);
function member(group,name,a,b,width,depth,material){
  const v=P(b).sub(P(a)),len=v.length(),m=new THREE.Mesh(
    new THREE.BoxGeometry(width,len,depth),metals[material]||metals.iron);
  m.name=name;m.position.copy(P(a).add(P(b)).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(up,v.normalize());group.add(m);return m;
}
function block(group,name,origin,size,metal){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),metals[metal]||metals.iron);
 m.position.set(...origin);m.name=name;group.add(m);return m;
}
function pin(group,name,at,radius,material='steel'){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.12,12),metals[material]);
 m.rotation.z=Math.PI/2;m.position.set(...at);m.name=name;group.add(m);return m;
}
export function buildUniversalLinkVisual(def){
 const root=new THREE.Group(),tip=def.mechanical?.end||[0,-.4,-.1];
 root.name=def.name;
 root.userData={assemblyRole:'rigid-link',partId:def.id};
 for(const sign of [-1,1]){
   const a=[sign*.105,0,0],b=[sign*.105+tip[0],tip[1],tip[2]];
   member(root,sign<0?'left load spar':'right load spar',a,b,.112,.12,'dark');
 }
 member(root,'continuous steel inner drive spine',[0,-.035,.015],
   [tip[0],tip[1]+.025,tip[2]],.10,.12,'iron');
 block(root,'load spreader at joint root',[0,-.028,-.015],[.34,.11,.21],'green');
 block(root,'machined distal connection carrier',
   [tip[0],tip[1],tip[2]],[.30,.14,.23],'iron');
 pin(root,'distal trunnion bore',tip,.10,'steel');
 if(def.mechanical?.driveOriginRelativeToEnd){
   const drive=def.sockets.find(s=>s.id==='drive-mount').position;
   member(root,'welded upper actuator clevis cradle',
     [0,-.045,-.06],drive,.075,.10,'stripe');
   pin(root,'upper clevis pin',drive,.065,'steel');
 }
 if(def.mechanical?.driveAnchors){
   const anchor=def.mechanical.driveAnchors.utility;
   member(root,'lower clevis integrated boss',[0,-.19,-.035],anchor,.08,.08,'green');
   pin(root,'lower clevis pin',anchor,.06,'steel');
   block(root,'working end tool shoe',tip.map((v,i)=>v+(i===1?-.045:0)),
     [.34,.15,.28],'stripe');
 }
 return root;
}
export function buildManipulatorBracketVisual(def){
 const root=new THREE.Group();root.name=def.name;
 const socket=def.sockets[0].position;
 block(root,'chassis welded mounting flange',[0,0,0],[.48,.25,.29],'iron');
 for(const x of [-.16,.16]){
   member(root,'braced cantilever web', [x,.035,.05],
     [x+socket[0],socket[1],socket[2]],.080,.090,'green');
 }
 block(root,'universal link receiver',socket,[.31,.18,.23],'dark');
 pin(root,'mounting retainer',socket,.11);
 return root;
}
