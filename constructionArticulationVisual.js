/** Physical visualization of Stage 08 articulation. Real graph parentage drives
 * the transforms; no special per-pair animations or baked leg model are used.
 */
import * as THREE from 'three';
import {BY_ID} from './components.js';
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';
import {rotatedY} from './assemblyGraph.js';
import {ARTICULATION_SIDES,ARTICULATION_JOINTS,JOINT_LIMITS,ACTUATOR_SPEC,currentPose} from './constructionArticulation.js';

const RAD=Math.PI/180;
const up=new THREE.Vector3(0,1,0);
const point=p=>new THREE.Vector3(...p);
const diff=(a,b)=>a.map((x,i)=>x-b[i]);
const t=new THREE.Matrix4(),tBack=new THREE.Matrix4(),yaw=new THREE.Matrix4(),spin=new THREE.Matrix4(),yawBack=new THREE.Matrix4();
const eye=new THREE.Matrix4();
const tmpPosition=new THREE.Vector3(),tmpQuaternion=new THREE.Quaternion(),tmpScale=new THREE.Vector3();
function hingeMatrix(pivot,angle,yawQuarterTurns){
  const p=point(pivot);
  const value=yawQuarterTurns*Math.PI/2;
  const orientation=yaw.makeRotationY(value);
  const inverse=yawBack.makeRotationY(-value);
  return t.makeTranslation(p.x,p.y,p.z).clone()
    .multiply(orientation)
    .multiply(spin.makeRotationX(angle*RAD))
    .multiply(inverse)
    .multiply(tBack.makeTranslation(-p.x,-p.y,-p.z));
}
function originalRestMatrix(pose){
  const angle=pose.rotationQuarterTurns*Math.PI/2;
  const m=new THREE.Matrix4().makeRotationY(angle);
  m.setPosition(...pose.position);
  return m;
}
/** Pose matrix for every component, including static primary modules. A knee
 * affects only descendant components, never the bearing housing itself.
 */
export function calculateArticulatedMatrices(graph,poses,assembly){
  const values=currentPose(assembly),cache=new Map();
  const visiting=new Set();
  function visit(serial){
    if(cache.has(serial))return cache.get(serial);
    const node=graph.nodes[serial],rest=poses.get(serial);
    if(!node||!rest) return null;
    if(visiting.has(serial))throw new Error('Mechanical graph cycle');
    visiting.add(serial);
    const parent=node.parentSerial?graph.nodes[node.parentSerial]:null;
    let delta=eye.clone();
    if(parent){
      const upstream=visit(parent.serial);
      if(upstream)delta.copy(upstream.delta);
      const def=BY_ID.get(parent.definitionId);
      if(def?.assemblyRole==='anatomy'&&ARTICULATION_JOINTS.includes(def.section)){
        const key=def.side+':'+def.section,angle=values[key]||0;
        if(Math.abs(angle)>1e-8) {
          const hinge=poses.get(parent.serial);
          if(hinge)delta.multiply(hingeMatrix(hinge.position,angle,hinge.rotationQuarterTurns));
        }
      }
    }
    const current=delta.clone().multiply(originalRestMatrix(rest));
    const out={matrix:current,delta,rest};
    cache.set(serial,out);visiting.delete(serial);return out;
  }
  for(const serial of Object.keys(graph.nodes))visit(serial);
  return cache;
}
export function applyArticulatedModels(graph,poses,assembly,partRoots,explosion=0){
  const cache=calculateArticulatedMatrices(graph,poses,assembly);
  const center=poses.get(graph.root)?.position||[0,0,0];
  for(const [serial,model] of partRoots){
    const entry=cache.get(serial);if(!entry)continue;
    entry.matrix.decompose(tmpPosition,tmpQuaternion,tmpScale);
    model.position.copy(tmpPosition);model.quaternion.copy(tmpQuaternion);
    if(explosion>0&&serial!==graph.root){
      const outward=tmpPosition.clone().sub(point(center));
      if(outward.length()<.15)outward.set(-1,1,.35);
      outward.normalize();
      model.position.addScaledVector(outward,explosion*.9);
    }
  }
  return cache;
}
const sharedMaterial={
  housing:new THREE.MeshStandardMaterial({color:0x596863,roughness:.73,metalness:.29,flatShading:true}),
  rod:new THREE.MeshStandardMaterial({color:0xb2bfb9,roughness:.37,metalness:.72,flatShading:true}),
  joint:new THREE.MeshStandardMaterial({color:0x71969a,roughness:.65,metalness:.42,flatShading:true}),
};
function cylinder(radius,material){
  return new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,1,10),material);
}
const sphere=(radius,mat)=>new THREE.Mesh(new THREE.SphereGeometry(radius,10,8),mat);
function placeSegment(mesh,start,end){
  const direction=end.clone().sub(start),length=direction.length();
  if(length<.0001){mesh.visible=false;return}
  mesh.visible=true;
  mesh.position.copy(start).addScaledVector(direction,.5);
  mesh.quaternion.setFromUnitVectors(up,direction.clone().normalize());
  mesh.scale.set(1,length,1);
}
export function createActiveActuator(side){
  const group=new THREE.Group();
  group.name=side.toUpperCase()+' articulated hydraulic actuator';
  const housing=cylinder(.058,sharedMaterial.housing),
    rod=cylinder(.029,sharedMaterial.rod),
    upperCap=sphere(.074,sharedMaterial.joint),
    lowerCap=sphere(.065,sharedMaterial.joint);
  housing.name='fixed-pressure-housing';
  rod.name='telescoping-chrome-piston';
  upperCap.name='thigh-clevis';
  lowerCap.name='shin-clevis';
  group.add(housing,rod,upperCap,lowerCap);
  group.userData={side,mechanism:'two-ended-telescoping-actuator',
    housingLengthM:ACTUATOR_SPEC.housingLengthM};
  return {side,group,housing,rod,upperCap,lowerCap};
}
/** Geometric endpoints are evaluated on the *currently posed* thigh and shin.
 * This mechanism is intentionally excluded from the service-parts inventory
 * until powered actuators become separately interchangeable objects.
 */
export function updateActiveActuator(actuator,assembly,cache,graph,poseMap){
  const {side,housing,rod,upperCap,lowerCap,group}=actuator;
  const entries=Object.values(graph.nodes);
  const section=(role)=>entries.find(n=>{
    const def=BY_ID.get(n.definitionId);
    return def?.assemblyRole==='anatomy'&&def.side===side&&def.section===role;
  });
  const thigh=section('thigh'),shin=section('shin');
  if(!thigh||!shin||!cache.has(thigh.serial)||!cache.has(shin.serial)){
    group.visible=false;return {visible:false};
  }
  const layout=YARDWALKER_LAYOUT.legs.find(l=>l.side===(side==='left'?-1:1));
  const upper=point(diff(layout.actuatorTop,layout.hip)).applyMatrix4(cache.get(thigh.serial).matrix);
  const lower=point([layout.side*ACTUATOR_SPEC.lowerOutboardM,
    ACTUATOR_SPEC.lowerFromKnee[1],ACTUATOR_SPEC.lowerFromKnee[2]])
    .applyMatrix4(cache.get(shin.serial).matrix);
  const vector=lower.clone().sub(upper),length=vector.length();
  const housingEnd=upper.clone().addScaledVector(vector,Math.min(1,ACTUATOR_SPEC.housingLengthM/length));
  placeSegment(housing,upper,housingEnd);
  placeSegment(rod,housingEnd,lower);
  upperCap.position.copy(upper);lowerCap.position.copy(lower);
  group.visible=true;
  return {visible:true,lengthM:length,strokeM:length-ACTUATOR_SPEC.housingLengthM,
    valid:length>=ACTUATOR_SPEC.minLengthM-.001&&length<=ACTUATOR_SPEC.maxLengthM+.001};
}
/** Coarse broad-phase only. Joint contact volumes deliberately overlap,
 * so check the foot against the upper thigh, not two adjacent bearing sections.
 */
export function coarseClearanceHints(graph,partRoots){
  const hints=[];
  for(const side of ARTICULATION_SIDES){
    const find=(role)=>Object.values(graph.nodes).find(n=>{
      const def=BY_ID.get(n.definitionId);
      return def?.side===side&&def?.section===role;
    });
    const foot=partRoots.get(find('foot')?.serial),thigh=partRoots.get(find('thigh')?.serial);
    if(!foot||!thigh)continue;
    const a=new THREE.Box3().setFromObject(foot,true),b=new THREE.Box3().setFromObject(thigh,true);
    if(a.intersectsBox(b))hints.push(side+' foot / thigh broad-phase overlap');
  }
  return {warnings:hints,status:'AABB hints only; articulation, bearing and armor swept collision not fully solved'};
}
