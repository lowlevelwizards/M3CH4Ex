/** Stage 17. The workshop and firing range are ONE scene, ONE rig object,
 * and ONE save. This is intentionally not an import of the legacy Test Yard.
 * Experimental geometry (including prototype feet, claws, housings and armor)
 * remains visible while moving. Dynamic joints reuse the real authored
 * Yardwalker/Kestrel/Hauler pivots where available.
 */
import * as THREE from 'three';
import {advanceYardPilot,initialYardPilot,profileFor,
 YARD_OBSTACLES,YARD_TARGETS} from './constructorYardCore.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const material=(color,metalness=0)=>new THREE.MeshStandardMaterial({
 color,roughness:metalness?.69:1,metalness,flatShading:true});
const concrete=material('#878b81'),steel=material('#505b55',.32),
 bright=material('#d2a14b',.15),yellow=material('#d9ae55'),
 dark=material('#424845'),targetMat=()=>material('#c4bba1'),
 hitMat=material('#d66a44');
function cube(group,name,x,y,z,w,h,d,mat){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.position.set(x,y,z);mesh.name=name;group.add(mesh);return mesh;
}
function paintGround(group){
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,94),
  material('#b7b5a5'));
 floor.rotation.x=-Math.PI/2;floor.position.set(0,-.042,-6);group.add(floor);
 cube(group,'garage concrete slab',0,-.024,27,19,.06,17,concrete);
 for(let lane=-1;lane<=1;lane++)for(let z=-38;z<22;z+=5){
  cube(group,'painted lane stripe',lane*10,.002,z,.13,.012,2.5,bright);
 }
 cube(group,'garaging rear stop',0,.25,34,17,.5,.5,steel);
 for(const sign of [-1,1]){
  for(const z of [19,34]){
   cube(group,'gantry uprights',sign*9,2.5,z,.30,5,.38,steel);
   cube(group,'gantry painted footing',sign*9,.22,z,.68,.45,.76,bright);
  }
  cube(group,'garage overhead crossbar',sign*8.9,5.12,26,.25,.21,16,steel);
 }
 cube(group,'assembly gantry',0,5.12,19,18,.30,.36,steel);
 cube(group,'rear gantry',0,5.12,34,18,.30,.36,steel);
 cube(group,'bay yellow entry line',0,.014,19,17,.025,.16,bright);
 for(const x of [-6,6]){
  cube(group,'floor fixture bolt',x,.022,25,.16,.025,.16,dark);
 }
 for(const item of YARD_OBSTACLES){
  const w=item.maxX-item.minX,d=item.maxZ-item.minZ,
   x=(item.minX+item.maxX)/2,z=(item.minZ+item.maxZ)/2;
  cube(group,'collision '+item.id,x,item.height/2,z,w,item.height,d,concrete);
  if(w>2)cube(group,'warning band '+item.id,x,item.height-.13,z,w,.19,d,bright);
 }
 for(const x of [-26,26]){
  for(const z of [-21,16]){
   cube(group,'floodlight pole',x,3,z,.12,6,.12,steel);
   cube(group,'floodlight',x,6.1,z,.88,.38,.36,yellow);
  }
 }
}
function makeTarget(parent,definition){
 const root=new THREE.Group();
 root.position.set(definition.x,0,definition.z);
 root.userData.targetId=definition.id;
 const pale=targetMat();
 cube(root,'target broad foot',0,.12,0,1.5,.24,1.12,dark);
 cube(root,'target spine',0,1.5,.05,.20,2.4,.21,steel);
 cube(root,'target torso armor',0,2.17,-.03,1.05,.96,.22,pale);
 cube(root,'target optics',0,2.9,-.03,.49,.34,.28,dark);
 for(const side of [-1,1]){
  cube(root,'target leg',side*.32,.83,.06,.25,1.22,.32,dark);
  cube(root,'target shoulder',side*.74,2.10,.03,.38,.66,.33,steel);
 }
 root.userData.hp=definition.hp;
 root.userData.fullHp=definition.hp;
 root.userData.armorMesh=root.getObjectByName('target torso armor');
 parent.add(root);
 return root;
}
function rodBetween(group,a,b,r=.03){
 const dir=b.clone().sub(a),span=dir.length();
 if(span<.02)return null;
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,span,6),
  material('#f2c76d'));
 m.position.copy(a).addScaledVector(dir,.5);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
 group.add(m);return m;
}
function mountMovableJoints(root){
 const pivots=[];
 root.traverse(o=>{
  if(!o.userData?.joint||!Number.isFinite(o.userData.side))return;
  if(!['hip','knee','ankle','foot'].includes(o.userData.joint))return;
  pivots.push({node:o,side:o.userData.side,joint:o.userData.joint,
   rest:o.rotation.x});
 });
 return pivots;
}
export function createConstructorYard({scene,camera,stage,onMessage}){
 const world=new THREE.Group();world.name='M3CH4EX / Integrated physical test yard';
 scene.add(world);paintGround(world);
 const dummies=YARD_TARGETS.map(t=>makeTarget(world,t));
 const shootables=[],obstacles=[];
 world.traverse(o=>{
  if(!o.isMesh)return;
  if(o.name.startsWith('collision ')){obstacles.push(o);shootables.push(o);}
  else if(o.parent?.userData?.targetId)shootables.push(o);
 });
 const rigHud=document.getElementById('yard-hud'),
  controlPad=document.getElementById('yard-move-pad'),
  thumb=document.getElementById('yard-thumb'),
  fire=document.getElementById('yard-fire'),
  info=document.getElementById('yard-readout');
 const controls={forward:0,strafe:0,turn:0,fire:false};
 const keys=new Set(),raycaster=new THREE.Raycaster(),tracers=[];
 let rig=null,parts=[],joints=[],pilot=initialYardPilot(),mode='garage',
  lookPointer=null,lastX=0,lastY=0,pitch=.06,shots=0,hits=0,cooldown=0;
 let joystickPointer=null;
 const cameras=['CHASE','CAB'];let cameraMode=0;
 const status=message=>{
  if(info)info.textContent=message;
  onMessage?.(message);
 };
 function updateHud(){
  const speed=Math.round(Math.hypot(pilot.velocityX,pilot.velocityZ)*3.6);
  document.getElementById('yard-speed').textContent=speed+' KM/H';
  document.getElementById('yard-hits').textContent=
   hits+' HITS · '+dummies.filter(d=>d.userData.hp===0).length+'/3 TARGETS';
 }
 function setRig(root,objects=[]){
  rig=root;parts=objects;joints=mountMovableJoints(root);
  root.position.set(0,0,26);root.rotation.set(0,0,0);
  for(const p of joints)p.node.rotation.x=p.rest;
 }
 function resetTargets(){
  for(const d of dummies){
   d.userData.hp=d.userData.fullHp;
   d.userData.armorMesh.material.color.set('#c4bba1');
  }
  hits=shots=0;updateHud();
  status('Target armor restored');
 }
 function resetPilot(){
  pilot=initialYardPilot();
  if(rig){rig.position.set(pilot.x,0,pilot.z);rig.rotation.set(0,pilot.yaw,0);}
  for(const p of joints)p.node.rotation.x=p.rest;
  pitch=.06;cameraMode=0;updateHud();
 }
 function launch(){
  if(!rig)return false;
  resetPilot();mode='pilot';rigHud.hidden=false;
  document.body.classList.add('yard-driving');
  scene.background.set('#c7cac3');
  scene.fog=new THREE.Fog('#c7cac3',65,145);
  status('TEST YARD · SAME MACHINE · WASD or left stick to move · drag to aim · FIRE');
  updateHud();positionCamera(true);return true;
 }
 function garage(){
  mode='garage';controls.forward=0;controls.strafe=0;controls.turn=0;controls.fire=false;
  keys.clear();lookPointer=null;joystickPointer=null;
  thumb.style.transform='translate(0px,0px)';
  document.body.classList.remove('yard-driving');
  rigHud.hidden=true;scene.fog=null;
  scene.background.set('#f4f6f3');
  resetPilot();
  status('Back in the yard workshop. Your exact construction is unchanged.');
 }
 function positionCamera(immediate=false){
  if(mode!=='pilot'||!rig)return;
  const height=new THREE.Box3().setFromObject(rig,true).getSize(new THREE.Vector3()).y;
  const yaw=pilot.yaw;
  // CAB view uses the actual chassis/cab heading; chase view lets the
  // player inspect the complete built assembly under locomotion.
  if(cameraMode===0){
   const target=new THREE.Vector3(pilot.x+Math.sin(yaw)*7.4,
    Math.max(4.2,height+1.25)+pitch*3.5,pilot.z+Math.cos(yaw)*7.4);
   if(immediate)camera.position.copy(target);
   else camera.position.lerp(target,.22);
   camera.lookAt(pilot.x,Math.max(1.25,height*.63)+pitch*5,pilot.z-1.6);
  }else{
   // Camera at the cab's location. Hide ONLY the locally obstructing canopy
   // via near-clipping; the assembled mech remains the same live scene rig.
   const head=new THREE.Vector3(0,Math.max(1.5,height*.67),-.37)
    .applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
   camera.position.set(pilot.x+head.x,head.y,pilot.z+head.z);
   const direction=new THREE.Vector3(-Math.sin(yaw),pitch,-Math.cos(yaw));
   camera.lookAt(camera.position.clone().add(direction));
  }
 }
 function sweepInput(){
  const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-
    (keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  const s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  const t=(keys.has('ArrowRight')||keys.has('KeyE')?1:0)-
    (keys.has('ArrowLeft')||keys.has('KeyQ')?1:0);
  return {forward:clamp(f+controls.forward,-1,1),
   strafe:clamp(s+controls.strafe,-1,1),turn:clamp(t+controls.turn,-1,1)};
 }
 function step(dt,mobilityId){
  if(mode!=='pilot'||!rig)return;
  const sec=Math.min(.04,Math.max(0,dt));
  const input=sweepInput();
  pilot=advanceYardPilot(pilot,input,sec,mobilityId);
  const profile=profileFor(mobilityId);
  rig.position.set(pilot.x,0,pilot.z);
  rig.rotation.y=pilot.yaw;
  // Animate actual named and parented mechanical joint pivots. No substitute
  // geometry is spawned; prototypes without authored joints remain a rigid
  // locomotion preview until their mechanisms have been developed.
  const weight=clamp(pilot.speed/Math.max(1,profile.speed),0,1);
  const phase=pilot.travel/Math.max(.7,profile.gait)*Math.PI;
  for(const p of joints){
   const q=phase+(p.side>0?Math.PI:0);
   const hip=Math.sin(q)*.20*weight;
   const knee=Math.max(0,Math.sin(q))*.28*weight;
   const flex=p.joint==='hip'?hip:
    p.joint==='knee'?knee:
    p.joint==='ankle'?-hip*.7-knee*.5:
    -hip*.2-knee*.3;
   p.node.rotation.x=p.rest+flex;
  }
  rig.position.y=Math.sin(phase*2)*.009*weight;
  rig.updateMatrixWorld(true);
  cooldown=Math.max(0,cooldown-sec);
  if(controls.fire||keys.has('Space'))shoot(mobilityId);
  for(let i=tracers.length-1;i>=0;i--){
   const t=tracers[i];t.life-=sec;
   if(t.life<=0){world.remove(t.mesh);t.mesh.geometry.dispose();
    t.mesh.material.dispose();tracers.splice(i,1);}
  }
  positionCamera();updateHud();
 }
 function shoot(weapon){
  if(mode!=='pilot'||cooldown>0||!rig)return;
  const mount=parts.find(x=>x.category==='combat')?.group;
  if(!mount)return;
  cooldown=weapon==='gun-rivet'?.12:
   weapon==='gun-scatter'?.65:weapon==='gun-cannon'?.8:.40;
  shots++;
  rig.updateMatrixWorld(true);
  const from=mount.localToWorld(new THREE.Vector3(0,.04,-.75));
  const aim=new THREE.Vector3(-Math.sin(pilot.yaw),pitch*.65,-Math.cos(pilot.yaw)).normalize();
  raycaster.set(from,aim);raycaster.far=68;
  const impacts=raycaster.intersectObjects(shootables,false);
  const impact=impacts[0],point=impact?impact.point:
   from.clone().addScaledVector(aim,52);
  if(impact){
   let n=impact.object;
   while(n&&!n.userData?.targetId)n=n.parent;
   if(n&&n.userData.hp>0){
    n.userData.hp--;hits++;
    n.userData.armorMesh.material.color.set(
     n.userData.hp===0?'#8d5443':'#cc9a78');
    if(n.userData.hp===0)status(n.userData.targetId+' DESTROYED');
   }
  }
  const tracer=rodBetween(world,from,point,.018);
  if(tracer)tracers.push({mesh:tracer,life:.12});
 }
 // All input is local to the yard and disabled while assembling.
 function padMotion(event){
  const bounds=controlPad.getBoundingClientRect(),
   cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2,
   x=clamp((event.clientX-cx)/(bounds.width*.37),-1,1),
   y=clamp((event.clientY-cy)/(bounds.height*.37),-1,1);
  controls.strafe=x;controls.forward=-y;
  thumb.style.transform='translate('+Math.round(x*33)+'px,'+Math.round(y*33)+'px)';
 }
 controlPad.addEventListener('pointerdown',e=>{
  if(mode!=='pilot')return;
  e.preventDefault();joystickPointer=e.pointerId;
  controlPad.setPointerCapture(e.pointerId);padMotion(e);
 });
 controlPad.addEventListener('pointermove',e=>{
  if(joystickPointer===e.pointerId)padMotion(e);
 });
 function releasePad(e){
  if(joystickPointer!==e.pointerId)return;
  joystickPointer=null;controls.forward=controls.strafe=0;
  thumb.style.transform='translate(0px,0px)';
 }
 controlPad.addEventListener('pointerup',releasePad);
 controlPad.addEventListener('pointercancel',releasePad);
 fire.addEventListener('pointerdown',e=>{
  if(mode!=='pilot')return;
  e.preventDefault();fire.setPointerCapture(e.pointerId);
  controls.fire=true;shoot();
 });
 fire.addEventListener('pointerup',()=>{controls.fire=false;});
 fire.addEventListener('pointercancel',()=>{controls.fire=false;});
 stage.addEventListener('pointerdown',e=>{
  if(mode!=='pilot'||e.target.tagName!=='CANVAS')return;
  e.preventDefault();lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;
  stage.setPointerCapture(e.pointerId);
 });
 stage.addEventListener('pointermove',e=>{
  if(mode!=='pilot'||lookPointer!==e.pointerId)return;
  pilot.yaw-=(e.clientX-lastX)*.006;
  pitch=clamp(pitch+(e.clientY-lastY)*.002,-.27,.36);
  lastX=e.clientX;lastY=e.clientY;
 });
 const clearLook=e=>{if(e.pointerId===lookPointer)lookPointer=null;};
 stage.addEventListener('pointerup',clearLook);
 stage.addEventListener('pointercancel',clearLook);
 document.addEventListener('keydown',e=>{
  if(mode!=='pilot'||e.target instanceof HTMLInputElement||
   e.target instanceof HTMLSelectElement)return;
  if(/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|Space)$/.test(e.code)){
   e.preventDefault();keys.add(e.code);
  }
 });
 document.addEventListener('keyup',e=>keys.delete(e.code));
 document.getElementById('yard-garage').addEventListener('click',garage);
 document.getElementById('yard-reset').addEventListener('click',()=>{
  resetPilot();status('Machine reset to start line');
 });
 document.getElementById('yard-targets').addEventListener('click',resetTargets);
 document.getElementById('yard-camera').addEventListener('click',()=>{
  cameraMode=(cameraMode+1)%cameras.length;
  document.getElementById('yard-camera').textContent='VIEW: '+cameras[cameraMode];
  positionCamera(true);
 });
 return {get piloting(){return mode==='pilot';},setRig,launch,garage,
  step,positionCamera,resetTargets,resetPilot,
  get currentRig(){return rig;},
  get location(){return {...pilot};},
  get targets(){return dummies.map(d=>({id:d.userData.targetId,hp:d.userData.hp}));}};
}
