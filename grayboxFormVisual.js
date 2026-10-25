/** Stage 14 — authored structural accessories. Visual construction only.
 * Housing and arm carriers are assemblies, not new fighting stations.
 */
import * as THREE from 'three';
import {fromId,HOUSINGS,CARRIERS,FEET} from './grayboxArchitecture.js';
const material=(color,metal=.27)=>{
 const mat=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:.74,flatShading:true});
 mat.userData.grayboxOwned=true;return mat;
};
function box(g,name,p,d,m){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...d),m);
 mesh.name=name;mesh.position.set(...p);g.add(mesh);return mesh;
}
function cyl(g,name,a,b,r,m){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),
  delta=end.clone().sub(start);
 const obj=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),m);
 obj.position.copy(start.add(end).multiplyScalar(.5));
 obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 obj.name=name;g.add(obj);return obj;
}
function bearing(g,name,p,r,m){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.12,12),m);
 mesh.rotation.z=Math.PI/2;mesh.position.set(...p);mesh.name=name;g.add(mesh);return mesh;
}
export function buildFrameExtensions(original,id,paint){
 const b=new THREE.Box3().setFromObject(original,true);
 const c=b.getCenter(new THREE.Vector3()),d=b.getSize(new THREE.Vector3());
 const g=new THREE.Group(),steel=material(paint.secondary,.5),accent=material(paint.main);
 const heavy=id==='frame-sr',open=id==='frame-utility';
 // Separate load-bearing superstructure; these frame families no longer read
 // merely as a short torso shell. The original frame remains inside.
 if(heavy||open){
  const span=heavy?.88:.77;
  const upper=b.max.y+(heavy?.27:.31),lower=b.min.y+.16;
  for(const side of [-1,1]){
   const x=side*d.x*span*.5,front=c.z-d.z*.30,back=c.z+d.z*.24;
   cyl(g,'reusable frame upright '+side,[x,lower,back],[x,upper,back],heavy?.095:.068,steel);
   cyl(g,'load-braced shoulder outrigger '+side,
    [side*d.x*.24,upper-.18,front],[x,upper-.16,back],.072,steel);
   bearing(g,'outer shoulder clevis '+side,[x,upper-.14,front],heavy?.155:.12,steel);
   box(g,'replaceable shoulder cap '+side,[x,upper-.075,front],
    [.22,.16,.34],accent);
  }
  cyl(g,'top load beam',[-d.x*.39,upper,c.z],[d.x*.39,upper,c.z],.09,steel);
  cyl(g,'low hip rail',[-d.x*.34,lower,c.z+.15],[d.x*.34,lower,c.z+.15],.09,steel);
 }
 if(id==='frame-spire-gb'){
  for(const sign of [-1,1]){
   cyl(g,'spar torsion brace '+sign,
    [sign*d.x*.3,b.min.y+.1,c.z+.23],
    [sign*d.x*.4,b.max.y-.12,c.z-.22],.072,steel);
  }
 }
 original.add(g);
 return original;
}
export function buildBodyHousing(id,frameBounds,paint){
 const g=new THREE.Group(),choice=fromId(HOUSINGS,id);
 if(!choice||choice.id==='none')return g;
 const b=frameBounds,c=b.getCenter(new THREE.Vector3()),d=b.getSize(new THREE.Vector3());
 const shell=material(paint.main),sub=material(paint.secondary,.35),dark=material('#343d3c');
 const width=Math.min(1.9,d.x*.84),height=Math.min(1.12,d.y*.93),
  depth=Math.min(1.25,d.z*.80),y=c.y;
 if(id==='angular'){
  const x=width*.48;
  for(const side of [-1,1]){
   box(g,'bolt-on angular flank '+side,[side*x,y+.02,c.z+.09],
    [.13,height*.69,depth*.76],shell);
   box(g,'separate service cap '+side,[side*x,y+height*.20,c.z-depth*.22],
    [.17,.17,depth*.45],sub);
  }
  box(g,'serviceable front angular shell',[c.x,y+.04,b.min.z-.035],
   [width*.65,height*.50,.10],shell);
  box(g,'removable dorsal spine',[0,b.max.y+.03,c.z],
   [width*.69,.095,depth*.63],sub);
 }else if(id==='drum'){
  // Horizontal industrial pressure casing, bolted end rings and a roof hatch.
  const radius=Math.max(.34,Math.min(width*.48,height*.48));
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,16),shell);
  drum.rotation.x=Math.PI/2;drum.position.set(0,y,c.z+.08);
  drum.name='cylindrical protective drum';g.add(drum);
  for(const zz of [-1,1]){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(radius+.018,.056,6,16),sub);
   ring.position.set(0,y,c.z+.08+zz*depth*.48);
   ring.name='bolted drum end ring';g.add(ring);
  }
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(radius*.60,radius*.60,.10,16),sub);
  lid.position.set(0,y+radius+.04,c.z+.08);lid.name='circular access hatch';g.add(lid);
  box(g,'forward service plate',[0,y,b.min.z-.10],[width*.64,height*.30,.09],dark);
 }else{
  // Rounded machinery housings rather than a falsely enlarged spherical cab.
  box(g,'central transfer casing',[0,y,c.z+.10],
   [width*.63,height*.63,depth*.71],sub);
  for(const side of [-1,1]){
   const pod=new THREE.Mesh(new THREE.SphereGeometry(width*.31,12,10),shell);
   pod.scale.set(.71,1,1);pod.position.set(side*width*.34,y+.03,c.z+.05);
   pod.name='round machine pod '+side;g.add(pod);
   bearing(g,'round transfer hub '+side,[side*width*.41,y-.19,c.z-.22],.16,dark);
  }
 }
 return g;
}
export function buildWeaponCarrier(id,weapon,paint,side=1){
 const item=fromId(CARRIERS,id),g=new THREE.Group();
 if(!item||id==='direct')return weapon;
 const frame=material(paint.secondary,.47),primary=material(paint.main),
  pivot=material('#65726f',.55);
 const target=new THREE.Group();
 g.userData.grayboxVisualSource='stage14-articulated-weapon-carrier';
 const armSign=side<0?-1:1;
 const start=[0,0,0],a=[armSign*.16,-.25,-.18],
  b=[armSign*.18,-(id==='heavy'?.65:.44),id==='offset'?-.05:-.34];
 bearing(g,'carrier shoulder rotary joint',start,id==='heavy'?.20:.14,pivot);
 cyl(g,'carrier primary structural link',start,a,id==='heavy'?.15:.11,frame);
 bearing(g,'carrier elbow rotary joint',a,id==='heavy'?.145:.105,pivot);
 cyl(g,'carrier distal arm',a,b,id==='heavy'?.14:.09,frame);
 box(g,'terminal receiver',b,[.29,.28,.25],primary);
 if(id==='heavy'){
  cyl(g,'load-bearing diagonal actuator',
   [0,.04,.20],[armSign*.16,-.40,-.12],.057,pivot);
  box(g,'removable carrier armor',[armSign*.15,-.42,-.24],
   [.34,.37,.19],primary);
 }else if(id==='offset'){
  cyl(g,'elevated weapon pintle',[0,0,0],[0,.30,-.02],.085,pivot);
  b[1]=.31;
  box(g,'offset shield plate',[armSign*.25,.24,-.36],[.09,.49,.61],primary);
 }
 const bb=new THREE.Box3().setFromObject(weapon,true),center=bb.getCenter(new THREE.Vector3());
 weapon.position.set(b[0]-center.x,b[1]-center.y,b[2]-bb.max.z+.08);
 g.add(weapon);
 return g;
}
export function buildFeetAccessory(id,mobilityBounds,paint){
 const g=new THREE.Group();
 if(id==='stock'||!fromId(FEET,id))return g;
 const b=mobilityBounds,d=b.getSize(new THREE.Vector3()),
  steel=material(paint.secondary),shell=material(paint.main);
 const span=Math.min(.93,d.x*.29),ground=b.min.y+.085;
 for(const side of [-1,1]){
  const x=side*span;
  if(id==='skid'){
   box(g,'wide detachable skid '+side,[x,ground,b.min.z+.11],
    [.40,.13,.79],steel);
   box(g,'skid upper retainer '+side,[x,ground+.115,b.min.z+.29],
    [.23,.09,.32],shell);
  }else{
   for(const toe of [-1,1]){
    box(g,'split replaceable toe '+side+' / '+toe,
      [x+toe*.125,ground,b.min.z-.05],[.135,.14,.48],steel);
   }
   bearing(g,'claw toe hinge '+side,[x,ground+.07,b.min.z+.24],.10,shell);
  }
 }
 return g;
}
export function buildFrameRiser(frameBounds,drop,paint){
 const g=new THREE.Group();
 if(drop>=0)return g;
 const d=Math.abs(drop),b=frameBounds,steel=material(paint.secondary,.45);
 for(const side of [-1,1]){
  const x=side*.42;
  cyl(g,'frame height-adjusting rigid spacer '+side,
   [x,b.min.y-.01,0],[x,b.min.y-d+.02,0],.12,steel);
 }
 return g;
}

/** Independent bolt-on limb shells, preserving actual shared mobility meshes.
 * Does not imply arbitrary left/right locomotion replacements in live gameplay.
 */
export function buildIndependentLegPlating(limbPlating={},bounds,paint,overrides={}){
 const g=new THREE.Group(),b=bounds,d=b.getSize(new THREE.Vector3());
 for(const [side,sign] of [['left',-1],['right',1]]){
  const level=limbPlating[side]||0;if(!level)continue;
  const color=overrides['leg-'+side]||paint.main,
   shell=material(color),dark=material(paint.secondary,.42);
  const x=sign*Math.min(d.x*.28,.82),z=b.min.z+d.z*.50;
  // Two separate serviceable subassemblies: thigh and shin coverage.
  box(g,side+' independent thigh armor',
   [x,b.max.y-d.y*.28,z-.11],
   [Math.max(.23,d.x*.15),Math.max(.21,d.y*.26),.23],shell);
  box(g,side+' thigh bearing band',
   [x,b.max.y-d.y*.45,z-.09],[.27,.10,.24],dark);
  if(level>=2){
   box(g,side+' independent shin armor',
    [x,b.min.y+d.y*.33,z-.08],
    [.28,Math.max(.24,d.y*.24),.26],shell);
   box(g,side+' replaceable ankle cuff',
    [x,b.min.y+d.y*.16,z-.08],[.30,.11,.30],dark);
  }
 }
 return g;
}
