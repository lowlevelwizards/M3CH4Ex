/** Stage 15: explicit local mating faces shared across preview assemblies.
 * Structural socket positions come from the frame catalogue, not the ever
 * changing outer-body / armor bounding box. -Z is machine forward.
 */
import * as THREE from 'three';
import {MOBILITY_LAYOUTS} from './mobilityDefinitions.js';
const V=v=>new THREE.Vector3(...v);
export const vec=V;
export function localSocket(frame,socket){
 const [w,h,d]=frame.size;
 // Socket definitions already describe local steel-bearing frame interfaces.
 // Do not shift sockets when an armor level or housing enlarges an AABB.
 const p=socket.pos.slice();
 if(socket.id==='mobility-bottom')p[1]=frame.id==='frame-spire-gb'?-h*.36:-h*.45;
 else if(socket.id==='cab-top')p[1]=h*.49;
 else if(socket.id==='cab-front')p[2]=-d*.44;
 else if(socket.id==='combat-left'||socket.id==='combat-right'
     ||socket.id==='support-left'||socket.id==='support-right')
   p[0]=Math.sign(p[0])*w*.49;
 else if(socket.id==='combat-top'||socket.id==='support-roof')
   p[1]=h*.49;
 else if(socket.id==='power-rear'||socket.id==='support-rear')
   p[2]=d*.46;
 return p;
}
export function attachFace(root,name,position,normal){
 const face=new THREE.Group();face.name=name;
 face.position.set(...position);
 face.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),V(normal).normalize());
 face.userData.matingFace=true;face.userData.socketNormal=normal.slice();
 root.add(face);return face;
}
function mat(hex,metalness=.42){
 const m=new THREE.MeshStandardMaterial({color:hex,metalness,roughness:.68,flatShading:true});
 m.userData.grayboxOwned=true;return m;
}
const steel=mat('#495854'),pins=mat('#84918b',.63);
export function socketHardware(root,socket,pos,frame){
 // Permanently visible receiver + bolted structural seat; not a debug marker.
 const name='structure receiver '+socket.id,group=new THREE.Group();
 group.name=name;group.position.set(...pos);root.add(group);
 const vertical=['cab-top','combat-top','support-roof','mobility-bottom'].includes(socket.id),
  side=['combat-left','combat-right','support-left','support-right'].includes(socket.id);
 const size=socket.station==='mobility'?.47:
   socket.station==='combat'?.34:socket.station==='cab'?.39:.23;
 const plate=new THREE.Mesh(new THREE.BoxGeometry(
  side?.09:size,vertical?.075:size*.70,side?size:.105),steel);
 plate.name='steel load spreader '+socket.id;
 group.add(plate);
 const face=attachFace(group,'outboard face '+socket.id,[0,0,0],socket.normal);
 for(const sign of [-1,1]){
  const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.065,8),pins);
  if(side){bolt.rotation.z=Math.PI/2;bolt.position.set(0,sign*size*.19,0);}
  else {bolt.rotation.x=Math.PI/2;bolt.position.set(sign*size*.32,0,-.066);}
  bolt.name='retainer '+socket.id+' '+sign;group.add(bolt);
 }
 return face;
}
export function makeMobilityAdapter(mobilityId,frameCenter,top,paint){
 const g=new THREE.Group();g.name='mobility-to-frame load bridge';
 const mx=mobilityId==='legs-hauler'?.62:mobilityId==='mobility-low-gb'?.39:.45,
  dark=mat(paint.secondary),primary=mat(paint.main);
 const delta=Math.max(.045,frameCenter-top);
 for(const sign of [-1,1]){
  const brace=new THREE.Mesh(new THREE.BoxGeometry(.13,delta+.10,.29),dark);
  brace.position.set(sign*mx,top+delta*.5,.04);
  brace.name='load-bearing hip side brace '+sign;g.add(brace);
 }
 const crown=new THREE.Mesh(new THREE.BoxGeometry(mx*2+.23,.105,.50),primary);
 crown.position.set(0,top+delta,.02);
 crown.name='mobility crown attachment saddle';g.add(crown);
 return g;
}
export function linkFace(layoutId,side,part){
 const layout=MOBILITY_LAYOUTS[layoutId];
 return layout?.legs?.find(l=>l.side===side)?.[part]||null;
}
export function markMechanicalChain(root,parts){
 // A diagnostic local-data summary without any visible debug graphics.
 const chain=parts.map(({name,start,end})=>({name,start:start.slice(),end:end.slice(),
  length:V(start).distanceTo(V(end))}));
 root.userData.mechanicalChain=chain;
 return chain;
}
export function mechanicalChainErrors(chain,tolerance=.0001){
 const problems=[];
 for(let i=0;i<chain.length;i++){
  const a=chain[i];if(a.length<.04)problems.push('Collapsed segment '+a.name);
  if(i>0&&V(chain[i-1].end).distanceTo(V(a.start))>tolerance)
   problems.push('Disconnected joint '+a.name);
 }
 return problems;
}
