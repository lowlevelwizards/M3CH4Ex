import {createLabMachine,labJointAction,labSectionAction,labInspection,labSectionDetails} from '../constructionLabCore.js';
import {BY_ID,graphWorldPoses} from '../components.js';
import {calculateArticulatedMatrices,createActiveActuator,updateActiveActuator} from '../constructionArticulationVisual.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildPartVisual} from '../partVisuals.js';
import {extractYardwalkerLeg,extractYardwalkerAnatomy,buildRookSparShin} from '../yardwalkerVisual.js';
import {YARDWALKER_LAYOUT} from '../mobilityDefinitions.js';

function boundsOf(object) {
  object.updateMatrixWorld(true);
  const bounds=new THREE.Box3();
  object.traverse(o=>{
    if(!o.isMesh)return;
    const box=new THREE.Box3().setFromObject(o,true);
    bounds.union(box);
  });
  return bounds;
}
function almostEqual(a,b,epsilon=.00001){
  return a.distanceTo(b)<epsilon;
}

test('Yardwalker leg extraction retains every authored mesh at its original hip transform',()=>{
  const model=buildPartVisual('legs-yard',{mode:'preview'});
  assert.ok(model);
  const perSide={};
  for(const side of ['left','right']){
    const original=model.getObjectByName('yard-leg-'+side);
    assert.ok(original,side+' group must be authored by the source model');
    const before=boundsOf(original);
    const countBefore=original.children.length;
    const extracted=extractYardwalkerLeg(model,side);
    assert.equal(extracted.parent,null);
    assert.equal(extracted.position.length(),0);
    const datum=YARDWALKER_LAYOUT.legs.find(l=>l.side===(side==='left'?-1:1)).hip;
    extracted.position.set(...datum);
    const after=boundsOf(extracted);
    assert.ok(almostEqual(before.min,after.min),side+' minimum changed');
    assert.ok(almostEqual(before.max,after.max),side+' maximum changed');
    assert.equal(extracted.children.length,countBefore);
    assert.ok(extracted.getObjectByName(side+'Hip'));
    perSide[side]=extracted;
  }
  assert.equal(model.getObjectByName('yard-leg-left'),undefined);
  assert.equal(model.getObjectByName('yard-leg-right'),undefined);
  assert.notEqual(perSide.left,perSide.right);
});

test('Stage 07 six anatomy sections retain the exact original assembled silhouette',()=>{
  for(const side of ['left','right']){
    const source=buildPartVisual('legs-yard',{mode:'preview'});
    const original=source.getObjectByName('yard-leg-'+side);
    const before=boundsOf(original);
    const legRoot=extractYardwalkerLeg(source,side);
    const pieces=extractYardwalkerAnatomy(legRoot,side);
    const rest=YARDWALKER_LAYOUT.legs.find(l=>l.side===(side==='left'?-1:1));
    const positions={
      hip:rest.hip,thigh:rest.hip,knee:rest.knee,
      shin:rest.knee,ankle:rest.ankle,foot:rest.foot
    };
    const together=new THREE.Box3();
    let meshes=0;
    for(const name of ['hip','thigh','knee','shin','ankle','foot']){
      const part=pieces[name];
      assert.ok(part,side+' '+name+' missing');
      part.position.set(...positions[name]);
      part.updateMatrixWorld(true);
      part.traverse(obj=>{if(obj.isMesh)meshes++});
      together.union(boundsOf(part));
    }
    assert.ok(meshes>=15,'Expected actual authored geometry, not empty proxy sections');
    assert.ok(almostEqual(before.min,together.min,.0001),side+' min bounds diverged: '+before.min.toArray()+' '+together.min.toArray());
    assert.ok(almostEqual(before.max,together.max,.0001),side+' max bounds diverged: '+before.max.toArray()+' '+together.max.toArray());
  }
});
test('Rook S2 lower leg mates with unchanged authored knee and ankle anchors',()=>{
  for(const side of ['left','right']){
    const layout=YARDWALKER_LAYOUT.legs.find(l=>l.side===(side==='left'?-1:1));
    const shin=buildRookSparShin(side);
    const upper=shin.getObjectByName('Rook-S2-knee-receiver');
    const lower=shin.getObjectByName('Rook-S2-ankle-receiver');
    assert.ok(upper&&lower);
    const expected=new THREE.Vector3(...layout.ankle).sub(new THREE.Vector3(...layout.knee));
    assert.ok(upper.position.length()<.00001);
    assert.ok(lower.position.distanceTo(expected)<.00001);
    let count=0;shin.traverse(o=>{if(o.isMesh)count++});
    assert.ok(count>=5);
  }
});

function activeGeometry(machine){
  const graph=labInspection(machine).graph;
  const frame=BY_ID.get(machine.owned.find(p=>p.serial===machine.installed.structure)?.definitionId);
  const poses=graphWorldPoses(graph,BY_ID,frame.center);
  return {graph,poses,matrix:calculateArticulatedMatrices(graph,poses,machine)};
}
test('Stage 08 knee rotates downstream shin and foot but never its upstream thigh',()=>{
  const rig=createLabMachine();
  const refs=labSectionDetails(rig);
  const left=refs.find(p=>p.side==='left').sections;
  const right=refs.find(p=>p.side==='right').sections;
  const before=activeGeometry(rig);
  assert.equal(labJointAction(rig,'left','knee',60).ok,true);
  const after=activeGeometry(rig);
  function origin(map,serial){return new THREE.Vector3().setFromMatrixPosition(map.get(serial).matrix)}
  assert.ok(origin(before.matrix,left.thigh.serial).distanceTo(origin(after.matrix,left.thigh.serial))<1e-7);
  assert.ok(origin(before.matrix,left.knee.serial).distanceTo(origin(after.matrix,left.knee.serial))<1e-7);
  assert.ok(origin(before.matrix,left.ankle.serial).distanceTo(origin(after.matrix,left.ankle.serial))>.15);
  assert.ok(origin(before.matrix,left.foot.serial).distanceTo(origin(after.matrix,left.foot.serial))>.15);
  assert.ok(origin(before.matrix,right.foot.serial).distanceTo(origin(after.matrix,right.foot.serial))<1e-7);
  const anchored=origin(after.matrix,left.shin.serial),hinge=origin(after.matrix,left.knee.serial);
  assert.ok(anchored.distanceTo(hinge)<1e-7,'shin must remain connected at knee pivot');
});
test('Stage 08 hip and ankle articulation move only supported descendant branches',()=>{
  const rig=createLabMachine();
  const parts=labSectionDetails(rig).find(p=>p.side==='left').sections;
  const base=activeGeometry(rig);
  assert.equal(labJointAction(rig,'left','hip',30).ok,true);
  const hip=activeGeometry(rig);
  const get=(map,serial)=>new THREE.Vector3().setFromMatrixPosition(map.get(serial).matrix);
  assert.ok(get(base.matrix,parts.knee.serial).distanceTo(get(hip.matrix,parts.knee.serial))>.1);
  assert.ok(get(base.matrix,parts.hip.serial).distanceTo(get(hip.matrix,parts.hip.serial))<1e-7);
  assert.equal(labJointAction(rig,'left','ankle',25).ok,true);
  const ankle=activeGeometry(rig);
  assert.ok(get(hip.matrix,parts.foot.serial).distanceTo(get(ankle.matrix,parts.foot.serial))>.03);
  assert.ok(get(hip.matrix,parts.ankle.serial).distanceTo(get(ankle.matrix,parts.ankle.serial))<1e-7);
});
test('Stage 08 two-end hydraulic actuators stay on actual thigh and shin mounts',()=>{
  for(const variant of ['original','rook']){
    const rig=createLabMachine();
    if(variant==='rook')assert.equal(labSectionAction(rig,'left','shin','swap',{variant}).ok,true);
    const actuator=createActiveActuator('left');
    const neutral=activeGeometry(rig);
    const start=updateActiveActuator(actuator,rig,neutral.matrix,neutral.graph,neutral.poses);
    assert.equal(start.visible,true);
    assert.equal(start.valid,true);
    const neutralLength=start.lengthM;
    assert.equal(labJointAction(rig,'left','knee',90).ok,true);
    const bent=activeGeometry(rig);
    const update=updateActiveActuator(actuator,rig,bent.matrix,bent.graph,bent.poses);
    assert.ok(update.valid,variant+' stroke exceeded');
    assert.ok(Math.abs(update.lengthM-neutralLength)>.05,variant+' actuator should telescope');
    const upper=actuator.upperCap.position,lower=actuator.lowerCap.position;
    assert.ok(Math.abs(upper.distanceTo(lower)-update.lengthM)<1e-7);
    assert.ok(Math.abs(actuator.housing.scale.y-.34)<1e-6);
    assert.ok(Math.abs(actuator.rod.scale.y-update.strokeM)<1e-6);
    assert.equal(actuator.group.children.length,4);
  }
});
