import {createLabMachine,labJointAction,labSectionAction,labInspection,labSectionDetails,
  labAssistedPreset,labGrounding,labGuidedWalkFrame,labMotionEnvelope,
  labMechanismAction,labMechanismDetails,labManipulatorAction,labManipulatorDetails
} from '../constructionLabCore.js';
import {BY_ID,graphWorldPoses} from '../components.js';
import {calculateArticulatedMatrices,createActiveActuator,updateActiveActuator,
  createRotaryBearingVisual,updateLinkedActuator} from '../constructionArticulationVisual.js';
import {buildUniversalLinkVisual,buildManipulatorBracketVisual} from '../constructionManipulatorVisual.js';
import {linkedStrokeLength,mechanismJointDescriptors} from '../constructionKinematics.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildPartVisual} from '../partVisuals.js';
import {extractYardwalkerLeg,extractYardwalkerAnatomy,buildRookSparShin,
  buildPylonExtendedShin,buildForgeCompactThigh,buildDockpadStabilizerFoot
} from '../yardwalkerVisual.js';
import {YARDWALKER_LAYOUT} from '../mobilityDefinitions.js';
import {buildGrayboxScene,visualFor} from '../grayboxVisual.js';
import {buildSharedVisual,LIVE_VISUAL_IDS} from '../grayboxSharedVisual.js';
import {recipe,BY_PART,PAINTS,defaultBuild,CATALOG,FRAMES,socketsForFrame} from '../grayboxCore.js';
import {localSocket,mechanicalChainErrors} from '../grayboxRigging.js';
import {buildAuditScene,AUDIT_CATEGORIES} from '../grayboxAudit.js';
import {KESTREL_LAYOUT,HAULER_LAYOUT} from '../mobilityDefinitions.js';

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

function ankleWorld(machine,side){
  const geometry=activeGeometry(machine);
  const part=labSectionDetails(machine).find(l=>l.side===side).sections.ankle;
  const position=new THREE.Vector3().setFromMatrixPosition(geometry.matrix.get(part.serial).matrix);
  const grounding=labGrounding(machine);
  if(grounding.mode==='grounded'){
    position.y-=grounding.bodyDropM;
    position.z+=grounding.bodyTravelZM;
  }
  return position;
}
test('08D crouch lowers the chassis while both foot joints retain their world anchors',()=>{
  for(const variant of ['original','rook']){
    const rig=createLabMachine();
    if(variant==='rook')assert.equal(labSectionAction(rig,'left','shin','swap',{variant}).ok,true);
    const rest={left:ankleWorld(rig,'left'),right:ankleWorld(rig,'right')};
    const posed=labAssistedPreset(rig,'crouch');
    assert.equal(posed.ok,true,posed.reason);
    for(const side of ['left','right']){
      const after=ankleWorld(rig,side);
      assert.ok(Math.abs(after.y-rest[side].y)<.002,side+' ankle should stay grounded while chassis drops');
      assert.ok(Math.abs(after.z-rest[side].z)<.002,side+' ankle should retain world Z');
    }
    assert.equal(labGrounding(rig).bodyDropM,.15);
  }
});
test('08D assisted one-foot step preserves the planted side and lifts the swing side',()=>{
  const rig=createLabMachine();
  const base={left:ankleWorld(rig,'left'),right:ankleWorld(rig,'right')};
  const result=labAssistedPreset(rig,'step-left');
  assert.equal(result.ok,true,result.reason);
  const planted=ankleWorld(rig,'right'),swing=ankleWorld(rig,'left');
  assert.ok(Math.abs(planted.y-base.right.y)<.003,'supporting ankle Y remains fixed');
  assert.ok(Math.abs(planted.z-base.right.z)<.003,'supporting ankle Z remains fixed');
  assert.ok(swing.y-base.left.y>.07,'swing ankle is visibly raised');
  assert.ok(swing.z-base.left.z<-.16,'swing ankle advances forward');
});
test('08D two-step simulation pins supporting foot through both contact phases',()=>{
  const rig=createLabMachine();
  const original={left:ankleWorld(rig,'left'),right:ankleWorld(rig,'right')};
  for(let i=0;i<=20;i++){
    const t=i/20,r=labGuidedWalkFrame(rig,t);
    assert.equal(r.ok,true,r.reason);
    const g=labGrounding(rig);
    if(g.feet.right.planted&&t<=.5){
      const a=ankleWorld(rig,'right');
      assert.ok(Math.abs(a.z-original.right.z)<.003,'right support anchor slid at t='+t);
      assert.ok(Math.abs(a.y-original.right.y)<.003);
    }
    if(g.feet.left.planted&&t>=.55){
      const a=ankleWorld(rig,'left');
      assert.ok(Math.abs(a.z-(original.left.z-.25))<.003,'left landing anchor slid at t='+t);
      assert.ok(Math.abs(a.y-original.left.y)<.003);
    }
  }
});

test('08E authored Pylon geometry terminates precisely at the new ankle interface',()=>{
  for(const side of ['left','right']){
    const rig=createLabMachine();
    const result=labSectionAction(rig,side,'shin','swap',{variant:'extended'});
    assert.equal(result.ok,true,result.reason);
    const sections=labSectionDetails(rig).find(l=>l.side===side).sections;
    const def=BY_ID.get(sections.shin.id);
    const shin=buildPylonExtendedShin(side,def.mechanical.ankleReceiver);
    const upper=shin.getObjectByName('Pylon-L1-knee-interface');
    const lower=shin.getObjectByName('Pylon-L1-ankle-interface');
    assert.ok(upper&&lower,'Pylon must have identifiable true physical interfaces');
    assert.ok(upper.position.length()<1e-6);
    assert.ok(lower.position.distanceTo(new THREE.Vector3(...def.mechanical.ankleReceiver))<1e-6);
    const assembled=activeGeometry(rig);
    const shinPose=assembled.poses.get(sections.shin.serial);
    const anklePose=assembled.poses.get(sections.ankle.serial);
    assert.ok(Math.abs(anklePose.position[1]-shinPose.position[1]-def.mechanical.ankleReceiver[1])<1e-6);
    assert.equal(def.mechanical.nominalExtraReachM,.16);
    let meshes=0;shin.traverse(x=>{if(x.isMesh)meshes++});
    assert.ok(meshes>=8,'Extended shin needs actual load spars, drive, joints, shielding');
  }
});
test('08E mixed-length shin retains original planted ankle datum through neutral and crouch',()=>{
  const stock=createLabMachine(),mixed=createLabMachine();
  const reference={left:ankleWorld(stock,'left'),right:ankleWorld(stock,'right')};
  const original=activeGeometry(mixed);
  const before=labSectionDetails(mixed).find(x=>x.side==='left').sections.ankle.serial;
  assert.equal(labSectionAction(mixed,'left','shin','swap',{variant:'extended'}).ok,true);
  const unposed=activeGeometry(mixed);
  const after=labSectionDetails(mixed).find(x=>x.side==='left').sections.ankle.serial;
  assert.equal(before,after,'Ankle serial identity survives upstream replacement');
  assert.ok(Math.abs(unposed.poses.get(after).position[1]-original.poses.get(before).position[1]+.16)<1e-6);
  // Installing Pylon requests an actual neutral IK stance, placing the
  // articulated ankle back on the shared original ground-contact plane.
  for(const side of ['left','right']){
    const a=ankleWorld(mixed,side);
    assert.ok(a.distanceTo(reference[side])<.003,side+' must find shared standing ground');
  }
  const crouch=labAssistedPreset(mixed,'crouch');
  assert.equal(crouch.ok,true,crouch.reason);
  assert.equal(crouch.limited,true,'long leg restricts full 15 cm crouch');
  for(const side of ['left','right']){
    const a=ankleWorld(mixed,side);
    assert.ok(a.distanceTo(reference[side])<.003,side+' must retain ground contact during reduced crouch');
  }
});
test('08E extended side uses installed length IK through a reduced but continuous step cycle',()=>{
  const rig=createLabMachine();
  assert.equal(labSectionAction(rig,'right','shin','swap',{variant:'extended'}).ok,true);
  const neutral={left:ankleWorld(rig,'left'),right:ankleWorld(rig,'right')};
  const envelope=labMotionEnvelope(rig);
  assert.equal(envelope.ok,true,envelope.reason);
  for(let i=0;i<=40;i++){
    const t=i/40;
    const out=labGuidedWalkFrame(rig,t,envelope);
    assert.equal(out.ok,true,'t='+t+' '+out.reason);
    const g=labGrounding(rig);
    if(g.feet.right.planted&&t<=.5){
      const p=ankleWorld(rig,'right');
      assert.ok(Math.abs(p.z-neutral.right.z)<.004,'planted Pylon ankle moved');
    }
    if(g.feet.left.planted&&t>=.55){
      const p=ankleWorld(rig,'left');
      assert.ok(Math.abs(p.z-(neutral.left.z-envelope.stepDistanceM))<.004,'other contact slipped');
    }
  }
});

test('Stage 09 Forge thigh knee interface moves physical descendants by authored 75 mm',()=>{
  for(const side of ['left','right']){
    const rig=createLabMachine(),old=activeGeometry(rig);
    const previous=labSectionDetails(rig).find(x=>x.side===side).sections;
    const before=old.poses.get(previous.knee.serial).position;
    const result=labSectionAction(rig,side,'thigh','swap',{variant:'compact'});
    assert.equal(result.ok,true,result.reason);
    const parts=labSectionDetails(rig).find(x=>x.side===side).sections;
    const def=BY_ID.get(parts.thigh.id);
    const model=buildForgeCompactThigh(side,def.mechanical.kneeReceiver);
    const mount=model.getObjectByName('Forge-T2-knee-machined-receiver');
    assert.ok(mount,'Real authored knee flange expected');
    assert.ok(mount.position.distanceTo(new THREE.Vector3(...def.mechanical.kneeReceiver))<1e-6);
    const next=activeGeometry(rig);
    assert.ok(Math.abs(next.poses.get(parts.knee.serial).position[1]-before[1]-.075)<1e-6);
    assert.equal(parts.knee.serial,previous.knee.serial);
    assert.equal(parts.ankle.serial,previous.ankle.serial);
  }
});
test('Stage 09 Dockpad foot has wider geometry and deeper sole contact datum',()=>{
  const original=buildPartVisual('legs-yard',{mode:'preview'});
  const section=extractYardwalkerAnatomy(extractYardwalkerLeg(original,'left'),'left');
  const stockBox=boundsOf(section.foot);
  const variant=buildDockpadStabilizerFoot('left',.04);
  const dockBox=boundsOf(variant);
  assert.ok(dockBox.max.x-dockBox.min.x>stockBox.max.x-stockBox.min.x+.10);
  assert.ok(dockBox.max.z-dockBox.min.z>stockBox.max.z-stockBox.min.z+.10);
  assert.equal(variant.userData.contactDropM,.04);
  let count=0;variant.traverse(obj=>{if(obj.isMesh)count++});
  assert.ok(count>=6,'Stabilizer is real separate pad, outriggers, heel and socket housing');
});
test('Stage 09 mixed-component stance grounds soles with unlike thigh/shin/foot interfaces',()=>{
  const rig=createLabMachine(),reference={
    left:ankleWorld(rig,'left'),right:ankleWorld(rig,'right')
  };
  for(const [section,variant] of [['thigh','compact'],['shin','extended'],['foot','stabilizer']]){
    const res=labSectionAction(rig,'left',section,'swap',{variant});
    assert.equal(res.ok,true,res.reason);
  }
  for(const name of ['neutral','crouch','step-right']){
    const result=labAssistedPreset(rig,name);
    assert.equal(result.ok,true,name+' '+result.reason);
    const pose=labGrounding(rig),left=ankleWorld(rig,'left'),right=ankleWorld(rig,'right');
    // In a grounded pose, the ankle is higher by the authored Dockpad contact
    // depth, but the sole remains on the same real floor datum.
    if(name==='neutral'||name==='crouch'){
      assert.ok(Math.abs(left.y-.04-reference.left.y)<.004,'left Dockpad sole must be planted');
      assert.ok(Math.abs(right.y-reference.right.y)<.004,'right work boot must be planted');
      assert.ok(Math.abs(left.z-reference.left.z)<.004);
    }
  }
  const body=labGrounding(rig).bodyDropM;
  assert.ok(Number.isFinite(body));
});

test('Stage 10 portable rotary bearings have different real machined envelope sizes',()=>{
 const utility=BY_ID.get('mechanism-bearing-plain');
 const reinforced=BY_ID.get('mechanism-bearing-wide');
 assert.equal(utility.mountInterface.kind,reinforced.mountInterface.kind);
 assert.equal(utility.mountInterface.standard,reinforced.mountInterface.standard);
 const stock=createRotaryBearingVisual(utility),wide=createRotaryBearingVisual(reinforced);
 const a=boundsOf(stock),b=boundsOf(wide);
 assert.ok((b.max.y-b.min.y)>(a.max.y-a.min.y)+.07);
 assert.ok(stock.children.length>=4&&wide.children.length>=4);
 assert.equal(stock.userData.mechanicalAxis,'x');
});
test('Stage 10 active installed cylinder has physical alternate envelope and anchor motion',()=>{
 const rig=createLabMachine();
 assert.equal(labMechanismAction(rig,'left','bearing','install','wide').ok,true);
 assert.equal(labMechanismAction(rig,'left','actuator','install','travel').ok,true);
 const device=labMechanismDetails(rig).left.actuator;
 const actuator=createActiveActuator('left',device.definition);
 const resting=activeGeometry(rig);
 const neutral=updateActiveActuator(actuator,rig,resting.matrix,resting.graph,resting.poses);
 assert.equal(neutral.valid,true);
 assert.equal(neutral.deviceSerial,device.serial);
 assert.ok(Math.abs(actuator.housing.scale.y-.28)<1e-6);
 assert.equal(labJointAction(rig,'left','knee',115).ok,true);
 const flexed=activeGeometry(rig);
 const moved=updateActiveActuator(actuator,rig,flexed.matrix,flexed.graph,flexed.poses);
 assert.equal(moved.valid,true);
 assert.ok(Math.abs(moved.lengthM-neutral.lengthM)>.12);
 assert.ok(Math.abs(actuator.upperCap.position.distanceTo(actuator.lowerCap.position)-
   moved.lengthM)<1e-7);
 assert.equal(labMechanismAction(rig,'left','actuator','remove').ok,true);
 const removed=activeGeometry(rig);
 assert.equal(updateActiveActuator(actuator,rig,removed.matrix,removed.graph,removed.poses).visible,false);
});
test('Stage 10 two structural port parentages never duplicate a drive when it spans moving assemblies',()=>{
 const rig=createLabMachine(),mechanical=labMechanismDetails(rig).left,
  graph=labInspection(rig).graph;
 assert.equal(graph.nodes[mechanical.actuator.serial].parentSerial,
   labSectionDetails(rig)[0].sections.thigh.serial);
 assert.equal(mechanical.linkage.targetSerial,
   labSectionDetails(rig)[0].sections.shin.serial);
 assert.equal(graph.nodes[mechanical.actuator.serial].parentSocket,'drive-mount');
 assert.equal(Object.values(graph.nodes).filter(n=>n.serial===mechanical.actuator.serial).length,1);
});

test('Stage 11 articulated arm rotates the downstream structural link but not its upstream carrier',()=>{
 const rig=createLabMachine();
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 const arm=labManipulatorDetails(rig),before=activeGeometry(rig);
 assert.equal(labManipulatorAction(rig,'pose',{angle:12}).ok,true);
 const after=activeGeometry(rig);
 const origin=(cache,serial)=>new THREE.Vector3().setFromMatrixPosition(cache.get(serial).matrix);
 assert.ok(origin(before.matrix,arm.upperSerial).distanceTo(origin(after.matrix,arm.upperSerial))<1e-7);
 assert.ok(origin(before.matrix,arm.bearingSerial).distanceTo(origin(after.matrix,arm.bearingSerial))<1e-7);
 const rest=before.matrix.get(arm.lowerSerial).matrix,
   posed=after.matrix.get(arm.lowerSerial).matrix;
 const tail=new THREE.Vector3(0,-.42,-.10);
 const tipBefore=tail.clone().applyMatrix4(rest),tipAfter=tail.clone().applyMatrix4(posed);
 assert.ok(tipBefore.distanceTo(tipAfter)>.07,'distal arm tool must move');
 assert.ok(origin(before.matrix,arm.lowerSerial).distanceTo(origin(after.matrix,arm.lowerSerial))<1e-7,
   'bearing must not create a disconnected gap at the hinge');
 const knee=labSectionDetails(rig)[0].sections;
 assert.ok(origin(before.matrix,knee.foot.serial).distanceTo(origin(after.matrix,knee.foot.serial))<1e-7,
   'independent arm rotation must never perturb planted legs');
});
test('Stage 11 generalized joint registry includes same mechanical axis for knees and non-leg arm',()=>{
 const rig=createLabMachine();
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 const arm=labManipulatorDetails(rig),joints=mechanismJointDescriptors(rig);
 assert.ok(joints.some(x=>x.serial===arm.bearingSerial&&x.axis==='x'&&x.key===arm.bearingSerial));
 const knee=labSectionDetails(rig)[0].sections.knee.serial;
 assert.ok(joints.some(x=>x.serial===knee&&x.key==='left:knee'));
 assert.ok(joints.every(x=>x.axis==='x'));
});
test('Stage 11 tool arm graphics use real joint locations and identifiable mechanical links',()=>{
 const bracket=BY_ID.get('construction-manip-bracket'),
   upper=BY_ID.get('construction-link-530'),
   lower=BY_ID.get('construction-link-430');
 const a=buildManipulatorBracketVisual(bracket),
   b=buildUniversalLinkVisual(upper),c=buildUniversalLinkVisual(lower);
 assert.ok(a.children.length>=4&&b.children.length>=7&&c.children.length>=7);
 assert.ok(b.getObjectByName('upper clevis pin'));
 assert.ok(c.getObjectByName('lower clevis pin'));
 assert.ok(new THREE.Box3().setFromObject(b).min.z<-.40,
   'L-53 is a forward-projecting boom, not a vertical leg');
 assert.ok(new THREE.Box3().setFromObject(c).min.y<-.35);
});
test('Stage 11 physical P-series actuator endpoints follow the moving arm and honor actual stroke',()=>{
 const rig=createLabMachine();
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 assert.equal(labManipulatorAction(rig,'bearing',{variant:'wide'}).ok,true);
 assert.equal(labManipulatorAction(rig,'actuator',{variant:'travel'}).ok,true);
 const arm=labManipulatorDetails(rig);
 const drive=createActiveActuator('manipulator',arm.actuator);
 const before=activeGeometry(rig);
 const measured=updateLinkedActuator(drive,arm.linkage,before.matrix);
 assert.equal(measured.valid,true);
 assert.ok(Math.abs(measured.lengthM-arm.linkage.lengthM)<.00001);
 assert.ok(Math.abs(drive.housing.scale.y-arm.actuator.stroke.housing)<1e-6);
 assert.equal(labManipulatorAction(rig,'pose',{angle:45}).ok,true);
 const after=labManipulatorDetails(rig),transformed=activeGeometry(rig);
 const moved=updateLinkedActuator(drive,after.linkage,transformed.matrix);
 assert.equal(moved.valid,true);
 assert.ok(Math.abs(moved.lengthM-after.linkage.lengthM)<.00001);
 assert.ok(Math.abs(moved.lengthM-measured.lengthM)>.03);
 assert.ok(Math.abs(drive.upperCap.position.distanceTo(drive.lowerCap.position)-
   moved.lengthM)<1e-7);
});


test('Stage 13 uses existing authored game models instead of lookalike primitives',()=>{
 for(const id of ['frame-sr','frame-utility','frame-wedge',
   'cab-utility','cab-cyclops','cab-armored',
   'legs-compact','legs-yard','legs-hauler',
   'gun-cannon','gun-short','gun-rivet','gun-scatter','gun-rocket',
   'power-forge']){
  assert.equal(LIVE_VISUAL_IDS.has(id),true,id);
  const p=BY_PART.get(id),category=p.form?(['frame-sr','frame-utility','frame-wedge'].includes(id)?'frame':
    id.startsWith('cab-')?'cab':id.startsWith('legs-')?'mobility':
    id.startsWith('power-')?'power':'combat'):'frame';
  const model=buildSharedVisual(category,id,{
    main:PAINTS.mustard,secondary:PAINTS.charcoal,accent:PAINTS.safety
   },1);
  assert.ok(model,id+' did not build');
  assert.equal(model.userData.grayboxVisualSource,'live-game-authored');
  const meshes=[];
  model.traverse(n=>{if(n.isMesh)meshes.push(n);});
  assert.ok(meshes.length>=8,id+' lacks original authored structure');
  assert.ok(!model.userData.outline,id+' retained selection envelope');
 }
});
test('Stage 13 bare, original armored and fully encased levels remain independently visible',()=>{
 const paint={main:PAINTS.rust,secondary:PAINTS.slate,accent:PAINTS.mustard};
 for(const [type,id] of [['frame','frame-sr'],['cab','cab-utility'],
  ['mobility','legs-yard'],['combat','gun-short']]){
  const models=[0,1,2].map(a=>visualFor(type,BY_PART.get(id),paint,a));
  const metrics=models.map(m=>{
   let visible=0;
   m.traverse(node=>{if(node.isMesh&&node.visible)visible++;});
   return visible;
  });
  assert.ok(metrics[2]>metrics[1],id+' encasement must add actual panels');
  assert.ok(metrics[0]<=metrics[1],id+' bare cannot add armor');
 }
});
test('Stage 13 real mobility rests on ground and overlaps frame lower load interface',()=>{
 for(let i=0;i<10;i++){
  const rig=recipe(i),built=buildGrayboxScene(rig);
  const frame=built.objects.find(x=>x.category==='frame');
  const mobility=built.objects.find(x=>x.category==='mobility');
  assert.ok(frame&&mobility,'Reference '+i+' must draw all mandatory assemblies');
  const fb=boundsOf(frame.group),mb=boundsOf(mobility.group);
  assert.ok(Math.abs(mb.min.y)<.06,'Reference '+i+' foot floats '+mb.min.y);
  const gap=fb.min.y-mb.max.y;
  assert.ok(gap<.09&&gap>-.27,'Reference '+i+' hip/frame gap '+gap);
  for(const category of ['cab','combat','power']){
   const part=built.objects.find(x=>x.category===category);
   assert.ok(part,'Reference '+i+' missing drawn '+category);
   assert.ok(!boundsOf(part.group).isEmpty(),'Reference '+i+' invisible '+category);
  }
 }
});

test('Stage 14 four bare frames are mechanically distinct naked load skeletons',()=>{
 const frameIds=['frame-sr','frame-utility','frame-wedge','frame-spire-gb'];
 const bounds=frameIds.map(id=>{
  const rig=defaultBuild();rig.frame=id;rig.armor.frame=0;
  const scene=buildGrayboxScene(rig);
  const frame=scene.objects.find(o=>o.category==='frame').group;
  const box=boundsOf(frame),size=box.getSize(new THREE.Vector3());
  const labels=[];frame.traverse(o=>{if(o.name)labels.push(o.name);});
  assert.ok(labels.length>=5,id+' has no authored mechanical structure');
  return {id,size,labels};
 });
 assert.ok(bounds.find(b=>b.id==='frame-wedge').labels.some(x=>/cradle/i.test(x)));
 assert.ok(bounds.find(b=>b.id==='frame-sr').labels.some(x=>/shoulder/i.test(x)));
 assert.ok(bounds.find(b=>b.id==='frame-utility').labels.some(x=>/upright/i.test(x)));
 assert.ok(bounds.find(b=>b.id==='frame-spire-gb').labels.some(x=>/spar/i.test(x)));
 assert.ok(bounds.find(b=>b.id==='frame-sr').size.x>
   bounds.find(b=>b.id==='frame-spire-gb').size.x);
});
test('Stage 14 body housings change silhouette without replacing structural frame',()=>{
 const rig=defaultBuild();
 rig.armor.frame=0;
 const base=buildGrayboxScene(rig),original=base.objects.find(o=>o.category==='frame').group;
 const before=boundsOf(original).getSize(new THREE.Vector3());
 rig.form.housing='drum';
 const cylindrical=buildGrayboxScene(rig);
 const drum=cylindrical.objects.find(o=>o.category==='frame').group;
 const named=[];
 drum.traverse(x=>{if(x.name)named.push(x.name);});
 assert.ok(named.includes('cylindrical protective drum'));
 assert.ok(named.includes('circular access hatch'));
 assert.equal(cylindrical.objects.find(o=>o.category==='cab').group.userData.installedSocket,'cab-top');
 assert.ok(boundsOf(drum).getSize(new THREE.Vector3()).x>=before.x*.8);
 rig.form.housing='rounded';
 const rounded=buildGrayboxScene(rig).objects.find(o=>o.category==='frame').group;
 let pods=0;rounded.traverse(x=>{if(x.name.startsWith('round machine pod'))pods++});
 assert.equal(pods,2);
});
test('Stage 14 combat station attaches a genuinely structural heavy carrier with existing weapon at its terminal',()=>{
 const rig=defaultBuild();rig.form.carrier='heavy';
 const constructed=buildGrayboxScene(rig),weapon=constructed.objects.find(x=>x.category==='combat');
 assert.equal(weapon.source,'stage14-articulated-weapon-carrier');
 const names=[];weapon.group.traverse(o=>{if(o.name)names.push(o.name);});
 for(const label of ['carrier shoulder rotary joint','carrier primary structural link',
  'carrier elbow rotary joint','carrier distal arm','terminal receiver',
  'load-bearing diagonal actuator'])assert.ok(names.includes(label),label);
 assert.ok(weapon.group.userData.rootMateWorld);
 const pivot=new THREE.Vector3(...weapon.group.userData.rootMateWorld);
 assert.ok(weapon.group.position.distanceTo(pivot)<1e-6,'carrier root must mate directly to frame socket');
 assert.ok(names.length>12,'real gun mesh should be retained at terminal receiver');
});
test('Stage 14 low biped stands on ground and stance adjustment preserves root contact',()=>{
 const rig=recipe(2);
 assert.equal(rig.installed.mobility.id,'mobility-low-gb');
 const built=buildGrayboxScene(rig),mob=built.objects.find(o=>o.category==='mobility');
 assert.ok(Math.abs(boundsOf(mob.group).min.y)<.06);
 const legNames=[];mob.group.traverse(o=>{if(o.name)legNames.push(o.name);});
 assert.equal(legNames.filter(x=>x==='compact hip pivot').length,2);
 assert.equal(legNames.filter(x=>x==='broad planted boot').length,2);
 assert.equal(legNames.filter(x=>x.startsWith('split replaceable toe')).length,4);
 const frame=built.objects.find(o=>o.category==='frame');
 assert.ok(boundsOf(frame.group).min.y<boundsOf(mob.group).max.y+.09);
});
test('Stage 14 all ten recipes remain fully assembled from shared visual families',()=>{
 for(let i=0;i<10;i++){
  const state=recipe(i),built=buildGrayboxScene(state);
  assert.ok(built.objects.some(x=>x.category==='combat'));
  assert.ok(built.objects.some(x=>x.category==='power'));
  assert.ok(built.objects.some(x=>x.category==='cab'));
  assert.ok(built.objects.some(x=>x.category==='mobility'));
  const frame=built.objects.find(x=>x.category==='frame').group;
  assert.ok(!boundsOf(frame).isEmpty());
 }
});

test('Stage 14 weapon-mounted shield and cab accessory inherit the physical parent group',()=>{
 const rig=recipe(2);
 assert.equal(rig.support['weapon-shield'],'support-shield');
 const built=buildGrayboxScene(rig);
 const combat=built.objects.find(x=>x.category==='combat'),
  shield=built.objects.find(x=>x.socket==='weapon-shield');
 assert.ok(combat&&shield);
 assert.equal(shield.group.parent,combat.group,'Shield must attach to weapon scene node');
 const spec=recipe(7),specView=buildGrayboxScene(spec);
 const cab=specView.objects.find(x=>x.category==='cab'),
  sensor=specView.objects.find(x=>x.socket==='cab-accessory-top');
 assert.ok(cab&&sensor);
 assert.equal(sensor.group.parent,cab.group,'Sensor must move with installed cab');
});
test('Stage 14 one-sided protective plating and paint produce real asymmetrical geometry',()=>{
 const rig=defaultBuild();
 rig.limbPlating={left:2,right:0};
 rig.accentByAssembly['leg-left']=PAINTS.red;
 const built=buildGrayboxScene(rig),mob=built.objects.find(x=>x.category==='mobility').group;
 const names=[];
 mob.traverse(x=>{if(x.name)names.push(x.name);});
 assert.ok(names.includes('left independent thigh armor'));
 assert.ok(names.includes('left independent shin armor'));
 assert.ok(!names.includes('right independent shin armor'));
});

test('Stage 15 all 29 catalogue assemblies can be inspected bare, armored and encased on a physical input datum',()=>{
 let inspected=0;
 for(const category of AUDIT_CATEGORIES)for(const part of CATALOG[category]){
  for(const level of [0,1,2]){
   const audit=buildAuditScene(category,part.id,{
    main:PAINTS.mustard,secondary:PAINTS.charcoal,accent:PAINTS.cream
   },level);
   const group=audit.objects[0].group;
   assert.ok(group.getObjectByName('input mating receiver visual'),
    part.id+' lacks inspected input mating receiver');
   const box=boundsOf(group);
   assert.ok(!box.isEmpty()&&box.getSize(new THREE.Vector3()).length()>.15,part.id);
   assert.ok(Math.abs(box.min.y)<.6,part.id+' part should sit near inspection ground plane');
   inspected++;
  }
 }
 assert.equal(inspected,29*3);
 const trio=buildAuditScene('cab','cab-armored',{
  main:PAINTS.safety,secondary:PAINTS.rust,accent:PAINTS.cream
 },1,true);
 assert.deepEqual(trio.objects.map(x=>x.coverage),[0,1,2]);
 assert.ok(boundsOf(trio.root).getSize(new THREE.Vector3()).x>2);
});
test('Stage 15 arms form physically continuous shoulder-to-elbow-to-wrist-to-claw chains',()=>{
 const types=['support-arm','support-arm-light','support-arm-heavy'],
  paint={main:PAINTS.mustard,secondary:PAINTS.teal,accent:PAINTS.cream};
 for(const id of types){
  const a=visualFor('support',BY_PART.get(id),paint);
  const chain=a.userData.mechanicalChain;
  assert.equal(chain.length,3,id+' must have three attached links');
  assert.deepEqual(mechanicalChainErrors(chain),[],id+' has disconnected endpoints');
  const wrist=a.getObjectByName('actual wrist/end-effector socket');
  assert.ok(wrist,id+' missing wrist parent');
  assert.equal(wrist.children.filter(x=>x.name?.includes('attached service gripper jaw')).length,2);
  assert.ok(wrist.position.distanceTo(new THREE.Vector3(...a.userData.wristLocal))<.00001);
  assert.ok(a.getObjectByName('structural arm mounting bracket'));
 }
});
test('Stage 15 weapon mounts preserve structurally different elevated vs articulated load paths',()=>{
 const rig=defaultBuild();
 rig.form.carrier='offset';
 let gun=buildGrayboxScene(rig).objects.find(x=>x.category==='combat').group;
 assert.ok(gun.getObjectByName('offset mast steel column'));
 assert.equal(gun.getObjectByName('carrier distal arm'),undefined,
  'High pintle cannot secretly contain a hanging forearm');
 rig.form.carrier='heavy';
 gun=buildGrayboxScene(rig).objects.find(x=>x.category==='combat').group;
 assert.ok(gun.getObjectByName('carrier distal arm'));
 const shield=gun.getObjectByName('weapon-shield-mate');
 assert.ok(shield,'Weapon shields must have actual carrier-local mounting face');
});
test('Stage 15 sockets have fixed frame steel datums independent of housing appearance',()=>{
 for(const frame of FRAMES){
  const slots=socketsForFrame(frame.id);
  for(const socket of slots){
   const datum=localSocket(frame,socket);
   assert.ok(datum.every(Number.isFinite));
   assert.ok(Math.abs(datum[0])<frame.size[0]*.9);
  }
  const noArmor=defaultBuild();noArmor.frame=frame.id;
  noArmor.form.housing='none';noArmor.armor.frame=0;
  const a=buildGrayboxScene(noArmor);
  noArmor.form.housing='angular';noArmor.armor.frame=2;
  const b=buildGrayboxScene(noArmor);
  const ar=a.objects.find(x=>x.category==='combat').group.userData.rootMateWorld;
  const br=b.objects.find(x=>x.category==='combat').group.userData.rootMateWorld;
  assert.deepEqual(ar,br,frame.id+' weapon hardpoint drifted after installing a hull');
 }
});
test('Stage 15 true mobility anchor-based toe gear follows original installed boot centrelines',()=>{
 const rigs=[['legs-yard',YARDWALKER_LAYOUT],
   ['legs-compact',KESTREL_LAYOUT],['legs-hauler',HAULER_LAYOUT]];
 for(const [id,layout] of rigs){
  const rig=defaultBuild();rig.installed.mobility.id=id;
  rig.form.feet='claw';rig.limbPlating={left:2,right:0};
  const group=buildGrayboxScene(rig).objects.find(x=>x.category==='mobility').group;
  for(const leg of layout.legs){
   const toe=group.getObjectByName('split replaceable toe '+leg.side+' / -1');
   assert.ok(toe,id+' missing foot-linked toe');
   assert.ok(Math.abs(toe.position.x-leg.foot[0])<layout.footSize[0],
    id+' toe not under real foot');
  }
  assert.ok(group.getObjectByName('left independent shin armor'));
 }
});
test('Stage 15 drum now wraps the central body vertically and is not a large frontal disc',()=>{
 const rig=recipe(8),frame=buildGrayboxScene(rig).objects.find(x=>x.category==='frame').group;
 const drum=frame.getObjectByName('cylindrical protective drum');
 assert.ok(drum);
 assert.ok(Math.abs(drum.rotation.x)<.01,'Drum should have a true vertical body axis');
 assert.ok(frame.getObjectByName('drum lateral mounting lug -1'));
 assert.ok(frame.getObjectByName('circular access hatch'));
});
