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
 const shell=material(paint.main),sub=material(paint.secondary,.38),
  dark=material('#343d3c',.52);
 const w=Math.min(1.95,d.x*.87),h=Math.min(1.28,d.y*.90),
  depth=Math.min(1.30,d.z*.82),y=c.y;
 const x=w*.43,z=c.z;
 g.name='removable '+id+' body housing';
 // All variants have transverse load brackets joining actual frame rails.
 for(const side of [-1,1]){
  cyl(g,'housing weld-on transverse bracket '+side,
   [side*w*.27,y-h*.22,z],[side*w*.46,y-h*.22,z],.083,sub);
  box(g,'housing locking boss '+side,[side*w*.43,y-h*.20,z],
   [.16,.21,.20],dark);
 }
 if(id==='angular'){
  // Panels wrap steel on brackets, instead of large unmounted rectangles.
  for(const side of [-1,1]){
   box(g,'bolt-on angular flank '+side,[side*x,y,z+.06],
    [.12,h*.71,depth*.74],shell);
   box(g,'side protective service panel '+side,
    [side*(x+.07),y+h*.22,z-.08],[.075,h*.26,depth*.47],sub);
   for(const yy of [-1,1])bearing(g,
    'flank captive fastener '+side+' '+yy,[side*(x+.125),y+yy*h*.21,z-.20],.043,dark);
  }
  box(g,'serviceable front angular shell',[0,y-h*.12,b.min.z-.03],
   [w*.66,h*.50,.115],shell);
  box(g,'removable dorsal spine',[0,b.max.y+.025,z+.16],
   [w*.64,.085,depth*.51],sub);
 }else if(id==='drum'){
  // Upright cylindrical industrial body. Previous horizontal cylinder looked
  // like a disk bolted to a square torso from the gameplay camera.
  const r=Math.max(.41,Math.min(w*.46,depth*.66));
  const central=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h*.88,20),shell);
  central.name='cylindrical protective drum';
  central.position.set(0,y,z+.04);g.add(central);
  for(const yy of [-1,1]){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(r+.005,.043,7,20),sub);
   ring.rotation.x=Math.PI/2;ring.position.set(0,y+yy*h*.39,z+.04);
   ring.name='drum structural circumferential seam '+yy;g.add(ring);
  }
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(r*.74,r*.74,.105,20),sub);
  lid.position.set(0,y+h*.46,z+.04);lid.name='circular access hatch';g.add(lid);
  bearing(g,'hatch central rotary lock',[0,y+h*.54,z+.04],.09,dark);
  // The front access panel follows the drum rather than floating on a disc.
  box(g,'forward service plate',[0,y-h*.08,z-r-.03],
   [r*1.27,h*.34,.115],dark);
  for(const side of [-1,1]){
   box(g,'drum lateral mounting lug '+side,[side*r*.93,y-.06,z],
    [.16,h*.37,.20],sub);
  }
 }else{
  // Rounded machines need dominant equipment mass, not two tiny ornamental
  // beads glued to a conventional rectangular torso.
  const r=Math.min(.42,Math.max(.28,w*.30));
  const core=new THREE.Mesh(new THREE.CylinderGeometry(r*.88,r*.88,h*.79,16),sub);
  core.name='central transfer casing';core.position.set(0,y,z+.06);g.add(core);
  for(const side of [-1,1]){
   const pod=new THREE.Mesh(new THREE.SphereGeometry(r,14,12),shell);
   pod.scale.set(.94,1.22,1.10);pod.position.set(side*w*.34,y,z-.08);
   pod.name='round machine pod '+side;g.add(pod);
   cyl(g,'pod structural transfer shaft '+side,
    [side*w*.13,y,z],[side*w*.36,y,z],.12,dark);
   bearing(g,'round transfer hub '+side,[side*w*.40,y-h*.14,z-r*.75],
    r*.34,dark);
  }
  box(g,'machine pod service guard',[0,y-h*.31,z-r*.80],
   [w*.47,h*.25,.11],sub);
 }
 // Hull does not cover the uppermost cab receiver or lower hip saddle.
 return g;
}
export function buildWeaponCarrier(id,weapon,paint,side=1){
 const item=fromId(CARRIERS,id),g=new THREE.Group();
 if(!item||id==='direct')return weapon;
 const frame=material(paint.secondary,.47),primary=material(paint.main),
  pivot=material('#65726f',.55),armSign=side<0?-1:1;
 g.name=id+' combat mounting assembly';
 g.userData.grayboxVisualSource='stage14-articulated-weapon-carrier';
 const shoulder=[0,0,0];
 let terminal;
 bearing(g,'carrier shoulder rotary joint',shoulder,id==='heavy'?.20:.14,pivot);
 if(id==='offset'){
  // A true rigid elevated pintle, NOT a downward elbow with a pillar added.
  terminal=[0,.43,-.17];
  cyl(g,'offset mast steel column',shoulder,[0,.40,0],.11,frame);
  box(g,'offset diagonal braced receiver',[0,.34,-.12],[.30,.19,.30],frame);
  cyl(g,'offset load diagonal',[-.12,.06,-.10],[0,.36,-.21],.055,pivot);
  bearing(g,'elevated pintle pivot',[0,.43,0],.13,pivot);
  box(g,'offset shield plate',[armSign*.30,.38,-.28],[.095,.43,.52],primary);
 }else{
  const elbow=[armSign*(id==='heavy'?.15:.11),id==='heavy'?-.49:-.33,-.19];
  terminal=[armSign*(id==='heavy'?.18:.12),id==='heavy'?-.89:-.59,-.36];
  cyl(g,'carrier primary structural link',shoulder,elbow,id==='heavy'?.15:.11,frame);
  bearing(g,'carrier elbow rotary joint',elbow,id==='heavy'?.15:.105,pivot);
  cyl(g,'carrier distal arm',elbow,terminal,id==='heavy'?.14:.10,frame);
  cyl(g,'carrier load strut', [0,.015,.10],
    [elbow[0],elbow[1]+.10,elbow[2]+.04],.065,pivot);
  if(id==='heavy'){
   cyl(g,'load-bearing diagonal actuator',[armSign*-.09,-.06,.17],
    [elbow[0],elbow[1]+.06,.04],.065,pivot);
   // Cover follows the upper structural link and clears the elbow.
   const cover=box(g,'removable carrier armor',
    [elbow[0]*.55,elbow[1]*.54,elbow[2]],[.34,.37,.26],primary);
   cover.rotation.x=-.26;
  }
 }
 box(g,'terminal receiver',terminal,[.30,.23,.28],primary);
 bearing(g,'terminal wrist swivel',
  [terminal[0],terminal[1],terminal[2]-.13],.11,pivot);
 // Place the ACTUAL gun breech against the rear of the terminal receiver.
 const bb=new THREE.Box3().setFromObject(weapon,true),center=bb.getCenter(new THREE.Vector3());
 weapon.position.set(terminal[0]-center.x,terminal[1]-center.y,
  terminal[2]-.13-bb.max.z+.07);
 g.add(weapon);
 // A real named carrier connection for nested shields. The shield attaches
 // to this structural mount, not an arbitrary barrel or an AABB center.
 const bracket=box(g,'shield mounting receiver',
  [terminal[0]+armSign*.22,terminal[1]+.12,terminal[2]-.16],
  [.13,.20,.26],pivot);
 const marker=new THREE.Group();marker.name='weapon-shield-mate';
 marker.position.copy(bracket.position);g.add(marker);
 g.userData.terminalLocal=terminal.slice();
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
