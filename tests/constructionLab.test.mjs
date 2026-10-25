import {BY_ID} from '../components.js';
import {proposeComponentReplacement,proposeAttachment} from '../assemblyGraph.js';
import {installedDevice,mechanismValidation} from '../constructionMechanisms.js';
import {jointWorkingRange} from '../constructionArticulation.js';
import {JOINT_LIMITS,PRESET_NAMES,articulationReport,actuatorStrokeCheck} from '../constructionArticulation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLabMachine, labEquip, labInspection, labBlueprint, loadLabBlueprint,
  labNodeList, labSetGeneratorMount, labLegAction, labLegDetails,
  labSectionAction, labSectionDetails, labStowed,
  labJointAction,labPosePreset,labPose,
  labAssistedPreset,labGuidedWalkFrame,labGrounding,labReturnManual,
  labViability,labMotionEnvelope,labSolveGrounded,
  labMechanismDetails,labMechanismAction,
  labManipulatorDetails,labManipulatorAction,manipulatorPosePresets
} from '../constructionLabCore.js';

test('default lab rig is an authentic, graph-valid five-station machine',()=>{
  const rig=createLabMachine();
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labNodeList(rig).filter(n=>!n.virtual).length,23); // five stations, two legs, twelve anatomy sections and four physical mechanism nodes
});
test('catalogue swaps use actual definitions and maintain graph consistency',()=>{
  const rig=createLabMachine();
  assert.equal(labEquip(rig,'mobility','legs-compact').ok,true);
  assert.equal(labEquip(rig,'command','cab-armored').ok,true);
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labBlueprint(rig).stations.mobility,'legs-compact');
});
test('H2 installs its real adapter and graph remains valid',()=>{
  const rig=createLabMachine();
  assert.equal(labEquip(rig,'mobility','legs-hauler').ok,true);
  assert.equal(labNodeList(rig).some(n=>n.definitionId==='hip-h2-u1'),true);
  assert.equal(labInspection(rig).valid,true);
});
test('impossible slot/definition combinations cannot change machine',()=>{
  const rig=createLabMachine(),before=JSON.stringify(labBlueprint(rig));
  assert.equal(labEquip(rig,'power','legs-yard').ok,false);
  assert.equal(JSON.stringify(labBlueprint(rig)),before);
});
test('generator offset uses real child mounting and survives station swap',()=>{
  const rig=createLabMachine();
  assert.equal(labSetGeneratorMount(rig,'offset').ok,true);
  assert.equal(labEquip(rig,'combat','gun-short').ok,true);
  assert.equal(labBlueprint(rig).generatorMount,'offset');
  assert.equal(labInspection(rig).valid,true);
});
test('blueprint roundtrip is isolated and validated',()=>{
  const a=createLabMachine();
  assert.equal(labEquip(a,'mobility','legs-compact').ok,true);
  assert.equal(labSetGeneratorMount(a,'offset').ok,true);
  const blueprint=labBlueprint(a);
  const b=loadLabBlueprint(blueprint);
  assert.deepEqual(labBlueprint(b),blueprint);
  assert.notStrictEqual(a,b);
  assert.throws(()=>loadLabBlueprint({...blueprint,stations:{...blueprint.stations,mobility:'fake'}}));
});

test('Stage 06 creates two distinct physical child nodes at authored hip sockets',()=>{
  const rig=createLabMachine();
  const legs=labLegDetails(rig);
  assert.equal(legs.length,2);
  assert.notEqual(legs[0].serial,legs[1].serial);
  assert.ok(legs.every(leg=>leg.installed));
  const graph=labInspection(rig).graph;
  for(const leg of legs){
    const node=graph.nodes[leg.serial];
    assert.equal(node.parentSerial,rig.installed.mobility);
    assert.equal(node.parentSocket,leg.socket);
    assert.equal(node.definitionId,leg.definitionId);
  }
  assert.equal(labInspection(rig).valid,true);
});
test('Stage 06 can detach either leg and reinstall it without losing ownership',()=>{
  const rig=createLabMachine(),original=labInspection(rig).machineCheck.massKg;
  const before=labLegDetails(rig);
  assert.equal(labLegAction(rig,'left','detach').ok,true);
  assert.equal(labLegDetails(rig)[0].installed,false);
  assert.equal(labLegDetails(rig)[1].installed,true);
  assert.equal(labInspection(rig).machineCheck.massKg,original-500);
  assert.equal(labInspection(rig).ready,false);
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labLegAction(rig,'right','detach').ok,true);
  assert.equal(labInspection(rig).machineCheck.massKg,original-1000);
  assert.equal(labLegAction(rig,'left','attach').ok,true);
  assert.equal(labLegAction(rig,'right','attach').ok,true);
  assert.deepEqual(labLegDetails(rig).map(x=>x.serial),before.map(x=>x.serial));
  assert.equal(labInspection(rig).machineCheck.massKg,original);
  assert.equal(labInspection(rig).ready,true);
});
test('leg attachments survive other station changes and offset mount operations',()=>{
  const rig=createLabMachine();
  assert.equal(labLegAction(rig,'right','detach').ok,true);
  assert.equal(labEquip(rig,'combat','gun-short').ok,true);
  assert.equal(labSetGeneratorMount(rig,'offset').ok,true);
  assert.equal(labSetGeneratorMount(rig,'standard').ok,true);
  assert.equal(labLegDetails(rig)[0].installed,true);
  assert.equal(labLegDetails(rig)[1].installed,false);
  assert.equal(labInspection(rig).valid,true);
});
test('switching mobility families does not create floating Yardwalker leg nodes',()=>{
  const rig=createLabMachine();
  assert.equal(labEquip(rig,'mobility','legs-compact').ok,true);
  assert.equal(labLegDetails(rig).every(l=>!l.installed),true);
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labEquip(rig,'mobility','legs-yard').ok,true);
  assert.equal(labLegDetails(rig).every(l=>l.installed),true);
  assert.equal(labInspection(rig).valid,true);
});
test('Stage 06 blueprint preserves asymmetrical legs and validates installation states',()=>{
  const rig=createLabMachine();
  assert.equal(labLegAction(rig,'left','detach').ok,true);
  const saved=labBlueprint(rig);
  assert.deepEqual(saved.legs,{left:false,right:true});
  const read=loadLabBlueprint(saved);
  assert.deepEqual(labBlueprint(read),saved);
  assert.throws(()=>loadLabBlueprint({...saved,legs:{left:'false',right:true}}));
});
test('invalid leg swaps and unknown hip sides fail without mutating graph',()=>{
  const rig=createLabMachine(),before=JSON.stringify(labBlueprint(rig));
  assert.equal(labLegAction(rig,'rear','detach').ok,false);
  assert.equal(labLegAction(rig,'left','replace-shin').ok,false);
  assert.equal(JSON.stringify(labBlueprint(rig)),before);
});

test('Stage 07 stock limbs contain authored six-section component chains',()=>{
  const rig=createLabMachine(),graph=labInspection(rig).graph;
  const groups=labSectionDetails(rig);
  assert.equal(groups.length,2);
  for(const limb of groups){
    assert.equal(limb.legInstalled,true);
    const names=['hip','thigh','knee','shin','ankle','foot'];
    let parent=limb.legSerial;
    for(const name of names){
      const section=limb.sections[name];
      assert.equal(section.installed,true);
      assert.equal(graph.nodes[section.serial].parentSerial,parent);
      parent=section.serial;
    }
    assert.equal(limb.sections.shin.variant,'original');
  }
  assert.equal(labInspection(rig).mobility.complete,true);
  assert.equal(labInspection(rig).valid,true);
});
test('Stage 07 shin swap keeps ankle and foot and changes mass by authored delta',()=>{
  const rig=createLabMachine(),before=labInspection(rig).machineCheck.massKg;
  const prior=labSectionDetails(rig)[0].sections;
  const first=labSectionAction(rig,'left','shin','swap',{variant:'rook'});
  assert.equal(first.ok,true,first.reason);
  const current=labSectionDetails(rig)[0].sections;
  assert.equal(current.shin.variant,'rook');
  assert.equal(current.ankle.serial,prior.ankle.serial);
  assert.equal(current.foot.serial,prior.foot.serial);
  assert.notEqual(current.shin.serial,prior.shin.serial);
  assert.equal(labInspection(rig).machineCheck.massKg,before-20);
  assert.equal(labInspection(rig).ready,true);
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labSectionAction(rig,'left','shin','swap',{variant:'original'}).ok,true);
  assert.equal(labInspection(rig).machineCheck.massKg,before);
});
test('Stage 07 supported shin cannot be removed as an orphan-only mutation',()=>{
  const rig=createLabMachine();
  const before=JSON.stringify(labBlueprint(rig));
  const failed=labSectionAction(rig,'left','shin','detach');
  assert.equal(failed.ok,false);
  assert.match(failed.reason,/Supports 2 child assemblies/);
  assert.equal(JSON.stringify(labBlueprint(rig)),before);
  const removed=labSectionAction(rig,'left','shin','detach',{cascade:true});
  assert.equal(removed.ok,true,removed.reason);
  const left=labSectionDetails(rig)[0];
  assert.equal(left.sections.shin.installed,false);
  assert.equal(left.sections.ankle.installed,false);
  assert.equal(left.sections.foot.installed,false);
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labInspection(rig).ready,false);
  assert.equal(labStowed(rig).some(x=>x.descendants===2),true);
  const restored=labSectionAction(rig,'left','shin','attach',{variant:'original'});
  assert.equal(restored.ok,true,restored.reason);
  assert.equal(labSectionDetails(rig)[0].sections.foot.installed,true);
  assert.equal(labInspection(rig).ready,true);
});
test('Stage 07 whole leg can be stowed with complete nested anatomy and restored',()=>{
  const rig=createLabMachine();
  assert.equal(labSectionAction(rig,'right','shin','swap',{variant:'rook'}).ok,true);
  const before=labSectionDetails(rig)[1].sections;
  assert.equal(labLegAction(rig,'right','detach').ok,true);
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labLegAction(rig,'right','attach').ok,true);
  const after=labSectionDetails(rig)[1].sections;
  assert.equal(after.shin.variant,'rook');
  assert.equal(after.shin.serial,before.shin.serial);
  assert.equal(after.foot.serial,before.foot.serial);
  assert.equal(labInspection(rig).ready,true);
});
test('Stage 07 module swaps and offset generator preserve shin configuration',()=>{
  const rig=createLabMachine();
  assert.equal(labSectionAction(rig,'left','shin','swap',{variant:'rook'}).ok,true);
  assert.equal(labEquip(rig,'combat','gun-short').ok,true);
  assert.equal(labSetGeneratorMount(rig,'offset').ok,true);
  assert.equal(labSectionDetails(rig)[0].sections.shin.variant,'rook');
  assert.equal(labInspection(rig).valid,true);
});
test('Stage 07 blueprint roundtrip preserves mixed shins and stowed supported branches',()=>{
  const rig=createLabMachine();
  assert.equal(labSectionAction(rig,'left','shin','swap',{variant:'rook'}).ok,true);
  assert.equal(labSectionAction(rig,'right','shin','detach',{cascade:true}).ok,true);
  const bp=labBlueprint(rig);
  assert.equal(bp.version,9);
  const saved=JSON.stringify(bp);
  const restored=loadLabBlueprint(bp);
  assert.equal(JSON.stringify(labBlueprint(restored)),saved);
  assert.equal(labSectionDetails(restored)[0].sections.shin.variant,'rook');
  assert.equal(labSectionDetails(restored)[1].sections.foot.installed,false);
  assert.equal(labSectionAction(restored,'right','shin','attach',{variant:'original'}).ok,true);
  assert.equal(labInspection(restored).ready,true);
});
test('Stage 07 rejects a wrong-side hip/socket and malformed stored inventory',()=>{
  const rig=createLabMachine(),bp=labBlueprint(rig);
  const corrupted=structuredClone(bp);
  const left=corrupted.anatomy.nodes.find(n=>n.definitionId==='yard-shin-left');
  left.parentSerial=corrupted.anatomy.nodes.find(n=>n.definitionId==='yard-knee-right').serial;
  assert.throws(()=>loadLabBlueprint(corrupted));
  const foreign=structuredClone(bp);
  foreign.anatomy.stowed['bogus']=[{serial:'bogus',definitionId:'unknown'}];
  assert.throws(()=>loadLabBlueprint(foreign));
});

test('Stage 08 has independently addressable joint channels with authored limits',()=>{
  const machine=createLabMachine();
  assert.equal(Object.keys(labPose(machine)).length,6);
  assert.equal(labJointAction(machine,'left','knee',60).ok,true);
  assert.equal(labPose(machine)['left:knee'],60);
  assert.equal(labPose(machine)['right:knee'],0);
  assert.equal(labJointAction(machine,'left','hip',25).ok,true);
  assert.equal(labPose(machine)['left:hip'],25);
  const before=JSON.stringify(labPose(machine));
  assert.equal(labJointAction(machine,'left','knee',101).ok,false);
  assert.equal(labJointAction(machine,'right','ankle',-90).ok,false);
  assert.equal(labJointAction(machine,'rear','hip',0).ok,false);
  assert.equal(JSON.stringify(labPose(machine)),before);
});
test('Stage 08 knee actuator strokes remain inside declared limits at hinge extrema',()=>{
  for(const side of ['left','right']){
    const {min,max}=JOINT_LIMITS.knee;
    for(let angle=min;angle<=max;angle+=5){
      const check=actuatorStrokeCheck(side,angle);
      assert.ok(check.valid,side+' knee '+angle+'° stroke '+check.lengthM+' m out of range');
      assert.ok(check.extensionM>0);
    }
  }
});
test('Stage 08 presets pose both sides independently and preserve valid stroke',()=>{
  const machine=createLabMachine();
  for(const name of PRESET_NAMES){
    const result=labPosePreset(machine,name);
    assert.equal(result.ok,true,name+': '+result.reason);
    assert.equal(articulationReport(machine).valid,true);
  }
  assert.notEqual(labPose(machine)['left:knee'],labPose(machine)['right:knee']);
  assert.equal(labPosePreset(machine,'unknown').ok,false);
  assert.equal(labPosePreset(machine,'neutral').ok,true);
  assert.ok(Object.values(labPose(machine)).every(x=>x===0));
});
test('Stage 08 blueprint persists six mechanical degrees of freedom with v3 compatibility',()=>{
  const machine=createLabMachine();
  assert.equal(labJointAction(machine,'left','knee',70).ok,true);
  assert.equal(labJointAction(machine,'right','hip',-20).ok,true);
  assert.equal(labSectionAction(machine,'left','shin','swap',{variant:'rook'}).ok,true);
  const bp=labBlueprint(machine);
  assert.equal(bp.version,9);
  const restored=loadLabBlueprint(bp);
  assert.deepEqual(labPose(restored),labPose(machine));
  assert.deepEqual(labBlueprint(restored),bp);
  const malformed=structuredClone(bp);malformed.pose['left:knee']=200;
  assert.throws(()=>loadLabBlueprint(malformed));
  const foreign=structuredClone(bp);foreign.pose['left:unknown']=5;
  assert.throws(()=>loadLabBlueprint(foreign));
  const v3=structuredClone(bp);v3.version=3;delete v3.pose;delete v3.grounding;delete v3.manualPose;
  const migrated=loadLabBlueprint(v3);
  assert.ok(Object.values(labPose(migrated)).every(x=>x===0));
});
test('Stage 08 pose state persists through equipment changes and independent shin swaps',()=>{
  const machine=createLabMachine();
  labPosePreset(machine,'crouch');
  const before=labPose(machine);
  assert.equal(labSectionAction(machine,'left','shin','swap',{variant:'rook'}).ok,true);
  assert.equal(labEquip(machine,'combat','gun-short').ok,true);
  assert.equal(labSetGeneratorMount(machine,'offset').ok,true);
  assert.deepEqual(labPose(machine),before);
  assert.equal(labInspection(machine).valid,true);
});

test('08D reuses the same solver for grounded crouch on existing legs and Rook shin',()=>{
  const rig=createLabMachine();
  let check=labAssistedPreset(rig,'crouch');
  assert.equal(check.ok,true,check.reason);
  assert.equal(labGrounding(rig).bodyDropM,.15);
  assert.equal(labGrounding(rig).feet.left.planted,true);
  assert.equal(labGrounding(rig).feet.right.planted,true);
  assert.ok(labPose(rig)['left:knee']>20,'knee compresses while body descends');
  const before=labPose(rig);
  assert.equal(labSectionAction(rig,'left','shin','swap',{variant:'rook'}).ok,true);
  check=labAssistedPreset(rig,'crouch');
  assert.equal(check.ok,true,check.reason);
  assert.deepEqual(labPose(rig),before,'shared interfaces yield identical kinematics');
  assert.equal(labInspection(rig).valid,true);
});
test('08D assisted step presets keep the supporting foot planted',()=>{
  const rig=createLabMachine();
  for(const name of ['neutral','step-left','step-right','asymmetric']){
    const r=labAssistedPreset(rig,name);
    assert.equal(r.ok,true,name+': '+r.reason);
  }
  assert.equal(labGrounding(rig).mode,'grounded');
  assert.equal(labAssistedPreset(rig,'bogus').ok,false);
});
test('08D manual controls are distinct from planted-foot pose controls',()=>{
  const rig=createLabMachine();
  assert.equal(labAssistedPreset(rig,'crouch').ok,true);
  assert.equal(labGrounding(rig).mode,'grounded');
  assert.equal(labJointAction(rig,'left','knee',25).ok,true);
  assert.equal(labGrounding(rig).mode,'manual');
  assert.equal(labPose(rig)['left:knee'],25);
  assert.equal(labAssistedPreset(rig,'neutral').ok,true);
  assert.equal(labReturnManual(rig).ok,true);
  assert.equal(labGrounding(rig).mode,'manual');
});
test('08D lab can replay deterministic two-step targets without a foot skating',()=>{
  const rig=createLabMachine();
  const all=[];
  for(let i=0;i<=20;i++){
    const t=i/20,result=labGuidedWalkFrame(rig,t);
    assert.equal(result.ok,true,'t='+t+' '+result.reason);
    all.push(labGrounding(rig));
  }
  assert.ok(all.slice(1,10).every(g=>g.feet.right.planted));
  assert.ok(all.slice(11,19).every(g=>g.feet.left.planted&&g.feet.left.z===-.25));
  assert.equal(labGrounding(rig).mode,'grounded');
});
test('08D v5 blueprint stores foot targets and rejects mismatched joint data',()=>{
  const rig=createLabMachine();
  const result=labAssistedPreset(rig,'step-left');
  assert.equal(result.ok,true,result.reason);
  const blueprint=labBlueprint(rig);
  assert.equal(blueprint.version,9);
  const imported=loadLabBlueprint(blueprint);
  assert.deepEqual(labBlueprint(imported),blueprint);
  const corrupted=structuredClone(blueprint);
  corrupted.pose['left:knee']=0;
  assert.throws(()=>loadLabBlueprint(corrupted));
  const floating=structuredClone(blueprint);
  floating.grounding.feet.right={z:0,y:.2,planted:true};
  assert.throws(()=>loadLabBlueprint(floating));
  const v4=structuredClone(blueprint);v4.version=4;
  delete v4.grounding;delete v4.manualPose;
  assert.equal(labGrounding(loadLabBlueprint(v4)).mode,'manual');
});

test('08D restoring manual mode returns to prior hinge pose and neutral body transform',()=>{
  const rig=createLabMachine();
  assert.equal(labJointAction(rig,'right','hip',12).ok,true);
  const original=labPose(rig);
  assert.equal(labAssistedPreset(rig,'crouch').ok,true);
  assert.notDeepEqual(labPose(rig),original);
  assert.equal(labReturnManual(rig).ok,true);
  assert.deepEqual(labPose(rig),original);
  assert.equal(labGrounding(rig).bodyDropM,0);
  assert.equal(labJointAction(rig,'left','knee',20).ok,true);
  const changed=labPose(rig);
  assert.equal(labAssistedPreset(rig,'step-right').ok,true);
  labReturnManual(rig);
  assert.deepEqual(labPose(rig),changed);
});

test('08E Pylon L1 owns a genuinely longer shin and retains ankle interface graph parentage',()=>{
  const rig=createLabMachine(),starting=labInspection(rig).machineCheck.massKg;
  const before=labSectionDetails(rig).find(x=>x.side==='left').sections;
  const installed=labSectionAction(rig,'left','shin','swap',{variant:'extended'});
  assert.equal(installed.ok,true,installed.reason);
  const after=labSectionDetails(rig).find(x=>x.side==='left').sections;
  assert.equal(after.shin.variant,'extended');
  assert.equal(after.ankle.serial,before.ankle.serial);
  assert.equal(after.foot.serial,before.foot.serial);
  assert.equal(labInspection(rig).machineCheck.massKg,starting+25);
  assert.equal(labInspection(rig).graph.nodes[after.ankle.serial].parentSerial,after.shin.serial);
  assert.equal(labGrounding(rig).mode,'grounded');
  const check=labViability(rig);
  assert.equal(check.structure,true);
  assert.equal(check.ground,true,check.standReason);
  assert.equal(check.legs.left.variant,'extended');
  assert.ok(check.legs.left.lowerLengthM>check.legs.right.lowerLengthM+.14);
  assert.equal(check.legs.left.extraReachM,.16);
  assert.equal(check.legs.right.extraReachM,0);
});
test('08E asymmetric Pylon crouch is adapted with an explicit attainable motion scale',()=>{
  const rig=createLabMachine();
  assert.equal(labSectionAction(rig,'right','shin','swap',{variant:'extended'}).ok,true);
  const stance=labAssistedPreset(rig,'crouch');
  assert.equal(stance.ok,true,stance.reason);
  assert.ok(stance.achievedDropM>0,'crouch should lower body');
  assert.ok(stance.achievedDropM<=.15,'must not exceed request');
  assert.equal(stance.limited,true,'full stock crouch should be too deep for extended leg');
  assert.ok(stance.movementScale<1);
  const g=labGrounding(rig);
  assert.equal(g.feet.left.planted,true);
  assert.equal(g.feet.right.planted,true);
  assert.equal(labInspection(rig).valid,true);
});
test('08E Pylon can exchange sides, revert to stock geometry, and roundtrip blueprint',()=>{
  const rig=createLabMachine();
  assert.equal(labSectionAction(rig,'left','shin','swap',{variant:'extended'}).ok,true);
  assert.equal(labSectionAction(rig,'right','shin','swap',{variant:'rook'}).ok,true);
  const first=labBlueprint(rig);
  assert.equal(first.version,9);
  const copy=loadLabBlueprint(first);
  assert.deepEqual(labBlueprint(copy),first);
  assert.equal(labSectionDetails(copy)[0].sections.shin.variant,'extended');
  assert.equal(labSectionDetails(copy)[1].sections.shin.variant,'rook');
  assert.equal(labSectionAction(copy,'left','shin','swap',{variant:'original'}).ok,true);
  assert.equal(labSectionDetails(copy)[0].sections.shin.variant,'original');
});
test('08E continuous grounded step envelope is derived from installed shin lengths',()=>{
  const stock=createLabMachine(),extended=createLabMachine();
  assert.equal(labSectionAction(extended,'left','shin','swap',{variant:'extended'}).ok,true);
  const a=labMotionEnvelope(stock),b=labMotionEnvelope(extended);
  assert.equal(a.ok,true,a.reason);
  assert.equal(b.ok,true,b.reason);
  assert.ok(b.stepDistanceM<a.stepDistanceM);
  assert.ok(b.liftM<a.liftM);
  for(let i=0;i<=40;i++){
    const result=labGuidedWalkFrame(extended,i/40,b);
    assert.equal(result.ok,true,'frame '+i+' '+result.reason);
  }
});
test('08E impossible reference reach is rejected without silently clipping an assembly',()=>{
  const rig=createLabMachine();
  const before=JSON.stringify(labBlueprint(rig));
  const target=labGrounding(rig);target.mode='grounded';target.bodyDropM=.22;
  target.feet.left={z:-.55,y:.3,planted:false};
  const result=labSolveGrounded(rig,target);
  assert.equal(result.ok,false);
  assert.equal(JSON.stringify(labBlueprint(rig)),before);
});

test('Stage 09 generic replacement preserves everything below a different-sized thigh',()=>{
  const rig=createLabMachine(),mass=labInspection(rig).machineCheck.massKg;
  const before=labSectionDetails(rig)[0].sections;
  const r=labSectionAction(rig,'left','thigh','swap',{variant:'compact'});
  assert.equal(r.ok,true,r.reason);
  const after=labSectionDetails(rig)[0].sections;
  assert.equal(after.thigh.variant,'compact');
  assert.notEqual(after.thigh.serial,before.thigh.serial);
  for(const part of ['knee','shin','ankle','foot'])
    assert.equal(after[part].serial,before[part].serial,part+' serial should survive');
  assert.equal(labInspection(rig).graph.nodes[after.knee.serial].parentSerial,after.thigh.serial);
  assert.equal(labInspection(rig).machineCheck.massKg,mass-15);
  assert.equal(labInspection(rig).valid,true);
  const g=labViability(rig);
  assert.equal(g.ground,true,g.standReason);
  assert.ok(g.legs.left.upperLengthM<g.legs.right.upperLengthM-.06);
  assert.equal(labSectionAction(rig,'left','thigh','swap',{variant:'original'}).ok,true);
});
test('Stage 09 stabilizer foot changes actual sole ground datum and mass',()=>{
  const rig=createLabMachine();
  const before=labInspection(rig).machineCheck.massKg;
  const old=labSectionDetails(rig)[1].sections.ankle.serial;
  const result=labSectionAction(rig,'right','foot','swap',{variant:'stabilizer'});
  assert.equal(result.ok,true,result.reason);
  const after=labSectionDetails(rig)[1].sections;
  assert.equal(after.foot.variant,'stabilizer');
  assert.equal(after.ankle.serial,old);
  assert.equal(labInspection(rig).machineCheck.massKg,before+9);
  assert.equal(labViability(rig).legs.right.footContactDropM,.04);
  assert.equal(labGrounding(rig).mode,'grounded');
});
test('Stage 09 incompatible or unsupported substitutions reject atomically',()=>{
  const rig=createLabMachine(),parts=labSectionDetails(rig)[0].sections;
  const other=rig.owned.find(o=>o.definitionId==='dockpad-f2-foot-left');
  const proposal=proposeComponentReplacement(rig,BY_ID,parts.thigh.serial,other.serial);
  assert.equal(proposal.ok,false);
  const old=JSON.stringify(labBlueprint(rig));
  assert.equal(labSectionAction(rig,'left','thigh','swap',{variant:'extended'}).ok,false);
  assert.equal(JSON.stringify(labBlueprint(rig)),old);
  const mountedRight=labSectionDetails(rig)[1].sections.thigh.serial;
  const wrongSide=proposeComponentReplacement(rig,BY_ID,parts.thigh.serial,mountedRight);
  assert.equal(wrongSide.ok,false);
  assert.equal(JSON.stringify(labBlueprint(rig)),old);
});
test('Stage 09 complete asymmetric thigh/shin/foot mix stands, crouches, steps and exports',()=>{
  const rig=createLabMachine(),original=labInspection(rig).machineCheck.massKg;
  for(const [section,variant] of [
    ['thigh','compact'],['shin','extended'],['foot','stabilizer']
  ]){
    const r=labSectionAction(rig,'left',section,'swap',{variant});
    assert.equal(r.ok,true,section+' '+r.reason);
  }
  const geom=labViability(rig);
  assert.equal(geom.structure,true);
  assert.equal(geom.ground,true,geom.standReason);
  assert.equal(geom.legs.left.thighVariant,'compact');
  assert.equal(geom.legs.left.variant,'extended');
  assert.equal(geom.legs.left.footVariant,'stabilizer');
  assert.equal(labInspection(rig).machineCheck.massKg,original+19);
  const crouch=labAssistedPreset(rig,'crouch');
  assert.equal(crouch.ok,true,crouch.reason);
  const envelope=labMotionEnvelope(rig);
  assert.equal(envelope.ok,true,envelope.reason);
  for(let i=0;i<=20;i++){
    const frame=labGuidedWalkFrame(rig,i/20,envelope);
    assert.equal(frame.ok,true,'step '+i+' '+frame.reason);
  }
  const blueprint=labBlueprint(rig);
  assert.equal(blueprint.version,9);
  const loaded=loadLabBlueprint(blueprint);
  assert.deepEqual(labBlueprint(loaded),blueprint);
  assert.equal(labSectionDetails(loaded)[0].sections.foot.variant,'stabilizer');
  assert.equal(labSectionAction(loaded,'left','foot','swap',{variant:'original'}).ok,true);
  assert.equal(labSectionAction(loaded,'left','shin','swap',{variant:'rook'}).ok,true);
  assert.equal(labSectionAction(loaded,'left','thigh','swap',{variant:'original'}).ok,true);
  assert.equal(labInspection(loaded).valid,true);
});
test('Stage 09 parked originals and attached children keep identity across equipment swap',()=>{
  const rig=createLabMachine();
  for(const [section,variant] of [['thigh','compact'],['shin','rook'],['foot','stabilizer']])
    assert.equal(labSectionAction(rig,'right',section,'swap',{variant}).ok,true);
  const installed=labSectionDetails(rig)[1].sections;
  assert.equal(labEquip(rig,'combat','gun-short').ok,true);
  assert.equal(labSetGeneratorMount(rig,'offset').ok,true);
  const next=labSectionDetails(rig)[1].sections;
  for(const section of ['thigh','shin','foot'])
    assert.equal(next[section].serial,installed[section].serial);
  assert.equal(labInspection(rig).valid,true);
});

test('Stage 10 portable rotary and linear hardware are individually serial-owned',()=>{
 const rig=createLabMachine(),mechs=labMechanismDetails(rig);
 assert.equal(mechs.left.bearing.definition.id,mechs.right.bearing.definition.id);
 assert.equal(mechs.left.actuator.definition.id,mechs.right.actuator.definition.id);
 assert.notEqual(mechs.left.bearing.serial,mechs.right.bearing.serial);
 assert.notEqual(mechs.left.actuator.serial,mechs.right.actuator.serial);
 assert.equal(mechs.left.linkage.targetSerial,
   labSectionDetails(rig)[0].sections.shin.serial);
 assert.equal(mechs.right.linkage.fromSerial,
   labSectionDetails(rig)[1].sections.thigh.serial);
 assert.equal(rig.owned.find(o=>o.serial===mechs.left.bearing.serial).condition,1);
 assert.equal(mechanismValidation(rig).valid,true);
});
test('Stage 10 identical limb structures have different actual knee limits',()=>{
 const rig=createLabMachine();
 const original=jointWorkingRange(rig,'left','knee');
 const originalMass=labInspection(rig).machineCheck.massKg;
 assert.equal(original.max,100);
 const changed=labMechanismAction(rig,'left','bearing','install','wide');
 assert.equal(changed.ok,true,changed.reason);
 assert.equal(labMechanismDetails(rig).left.bearing.definition.variant,'wide');
 const upgraded=jointWorkingRange(rig,'left','knee');
 assert.ok(upgraded.max>=original.max);
 assert.equal(labInspection(rig).machineCheck.massKg,originalMass+7);
 const upgradedDrive=labMechanismAction(rig,'left','actuator','install','travel');
 assert.equal(upgradedDrive.ok,true,upgradedDrive.reason);
 const better=jointWorkingRange(rig,'left','knee');
 assert.equal(better.max,120);
 assert.ok(better.max>original.max);
 assert.equal(labJointAction(rig,'left','knee',115).ok,true);
 assert.equal(labJointAction(rig,'right','knee',115).ok,false);
});
test('Stage 10 cylinder stroke is a real coupled constraint, not only a slider clamp',()=>{
 const rig=createLabMachine();
 assert.equal(labMechanismAction(rig,'left','bearing','install','wide').ok,true);
 const limited=jointWorkingRange(rig,'left','knee');
 assert.ok(limited.max<120,'Utility cylinder cannot use full wider bearing');
 assert.equal(labJointAction(rig,'left','knee',120).ok,false);
 assert.equal(labMechanismAction(rig,'left','actuator','install','travel').ok,true);
 const restored=jointWorkingRange(rig,'left','knee');
 assert.equal(restored.max,120,'Long stroke now permits full bearing');
 const atEnd=actuatorStrokeCheck('left',120,rig);
 assert.equal(atEnd.valid,true);
 assert.equal(atEnd.serial,labMechanismDetails(rig).left.actuator.serial);
});
test('Stage 10 removed actuator remains owned but powers no grounded walk',()=>{
 const rig=createLabMachine(),serial=labMechanismDetails(rig).left.actuator.serial;
 const previousMass=labInspection(rig).machineCheck.massKg;
 const result=labMechanismAction(rig,'left','actuator','remove');
 assert.equal(result.ok,true,result.reason);
 assert.equal(labMechanismDetails(rig).left.actuator,null);
 assert.equal(labInspection(rig).valid,true,'Unpowered but structurally valid');
 assert.equal(labInspection(rig).ready,false);
 assert.equal(labInspection(rig).machineCheck.massKg,previousMass-14);
 assert.ok(rig.owned.some(p=>p.serial===serial));
 assert.equal(labAssistedPreset(rig,'crouch').ok,false);
 assert.equal(labMechanismAction(rig,'left','actuator','install','utility').ok,true);
 assert.equal(labMechanismDetails(rig).left.actuator.serial,serial);
 assert.equal(labAssistedPreset(rig,'crouch').ok,true);
});
test('Stage 10 functional interfaces can accept the same bearing at a future elbow port',()=>{
 const rig=createLabMachine();
 const source=labMechanismDetails(rig).left.bearing.serial;
 assert.equal(labMechanismAction(rig,'left','bearing','remove').ok,true);
 const frame=rig.installed.structure;
 const def=BY_ID.get('frame-sr'),mock={...def,sockets:[
   ...def.sockets,{id:'elbow-bearing-test',standard:'light',position:[.2,.2,.2],
     normal:[1,0,0],maxLoadKg:40,acceptsRole:'rotary-bearing'}
 ]};
 const byId=new Map(BY_ID);byId.set('frame-sr',mock);
 const target=proposeAttachment(rig,byId,source,frame,'elbow-bearing-test');
 assert.equal(target.ok,true,target.reason);
 assert.equal(target.graph.nodes[source].parentSocket,'elbow-bearing-test');
 assert.equal(BY_ID.get('mechanism-bearing-plain').side,undefined);
 assert.ok(BY_ID.get('mechanism-bearing-plain').compatibleApplications.includes('elbow'));
});
test('Stage 10 version eight preserves independent bearing and drive identities',()=>{
 const rig=createLabMachine();
 assert.equal(labMechanismAction(rig,'left','bearing','install','wide').ok,true);
 assert.equal(labMechanismAction(rig,'right','actuator','install','travel').ok,true);
 const bp=labBlueprint(rig);
 assert.equal(bp.version,9);
 const clone=loadLabBlueprint(bp);
 assert.deepEqual(labBlueprint(clone),bp);
 const bad=structuredClone(bp);
 bad.mechanisms.left.targetSerial=bad.mechanisms.right.targetSerial;
 assert.throws(()=>loadLabBlueprint(bad));
 const foreign=structuredClone(bp);
 foreign.mechanisms.left.bearing='FOREIGN';
 assert.throws(()=>loadLabBlueprint(foreign));
 const legacy=structuredClone(bp);legacy.version=7;delete legacy.mechanisms;
 const fromOld=loadLabBlueprint(legacy);
 assert.equal(labMechanismDetails(fromOld).left.bearing.definition.variant,'plain');
});
test('Stage 10 mechanisms remain owned through complete leg detach and restoration',()=>{
 const rig=createLabMachine();
 const original=labMechanismDetails(rig).left;
 assert.equal(labLegAction(rig,'left','detach').ok,true);
 assert.equal(labInspection(rig).valid,true);
 assert.equal(labLegAction(rig,'left','attach').ok,true);
 assert.equal(labInspection(rig).valid,true);
 assert.equal(labMechanismDetails(rig).left.bearing.serial,original.bearing.serial);
 assert.equal(labMechanismDetails(rig).left.actuator.serial,original.actuator.serial);
 assert.equal(labMechanismDetails(rig).left.linkage.targetSerial,
   labSectionDetails(rig)[0].sections.shin.serial);
});
test('Stage 10 swapped shin rebinds physical linkage target to replacement branch',()=>{
 const rig=createLabMachine(),orig=labMechanismDetails(rig).left;
 assert.equal(labSectionAction(rig,'left','shin','swap',{variant:'rook'}).ok,true);
 const now=labMechanismDetails(rig).left;
 assert.equal(now.actuator.serial,orig.actuator.serial);
 assert.equal(now.linkage.targetSerial,labSectionDetails(rig)[0].sections.shin.serial);
 assert.equal(labInspection(rig).valid,true);
});

test('Stage 10 saved parked leg retains mechanism serial assignments when reinstalled',()=>{
 const rig=createLabMachine();
 assert.equal(labMechanismAction(rig,'right','actuator','install','travel').ok,true);
 const before=labMechanismDetails(rig).right;
 assert.equal(labLegAction(rig,'right','detach').ok,true);
 const bp=labBlueprint(rig);
 assert.equal(bp.mechanisms.right.actuator,before.actuator.serial);
 assert.equal(bp.mechanisms.right.targetSerial,null);
 const next=loadLabBlueprint(bp);
 assert.deepEqual(labBlueprint(next),bp);
 assert.equal(labLegAction(next,'right','attach').ok,true);
 assert.equal(labMechanismDetails(next).right.actuator.serial,before.actuator.serial);
 assert.equal(labMechanismDetails(next).right.bearing.serial,before.bearing.serial);
 assert.equal(labInspection(next).valid,true);
});
test('Stage 10 structural links are application-neutral but still require physical child interfaces',()=>{
 const upper=BY_ID.get('forge-t2-thigh-left');
 const lower=BY_ID.get('pylon-l1-shin-left');
 assert.equal(upper.mountInterface.kind,'structural-link');
 assert.equal(lower.mountInterface.kind,'structural-link');
 for(const role of ['thigh','forearm','upper-arm']){
   assert.ok(upper.mountInterface.applications.includes(role));
 }
 const rig=createLabMachine(),part=rig.owned.find(x=>x.definitionId===lower.id);
 const target=labSectionDetails(rig)[0].sections.thigh.serial;
 const attempt=proposeComponentReplacement(rig,BY_ID,target,part.serial);
 assert.equal(attempt.ok,false,'Structural mounting fits, but knee-supporting child port differs');
});
test('Stage 10 actuator endpoints originate from the actual compatible link definitions',()=>{
 const rig=createLabMachine();
 const first=labMechanismDetails(rig).left;
 const thigh=BY_ID.get(labSectionDetails(rig)[0].sections.thigh.id);
 const shin=BY_ID.get(labSectionDetails(rig)[0].sections.shin.id);
 assert.deepEqual(first.linkage.fromLocal,
   thigh.sockets.find(x=>x.id==='drive-mount').position);
 assert.deepEqual(first.linkage.targetLocal,shin.mechanical.driveAnchors.utility);
 assert.equal(labMechanismAction(rig,'left','actuator','install','travel').ok,true);
 const second=labMechanismDetails(rig).left;
 assert.deepEqual(second.linkage.targetLocal,shin.mechanical.driveAnchors.travel);
 assert.notDeepEqual(second.linkage.targetLocal,first.linkage.targetLocal);
});

test('Stage 10 removing a rotary bearing is distinct from removing a drive',()=>{
 const rig=createLabMachine(),serial=labMechanismDetails(rig).right.bearing.serial;
 const removed=labMechanismAction(rig,'right','bearing','remove');
 assert.equal(removed.ok,true,removed.reason);
 assert.equal(labInspection(rig).valid,true,'Structural frame remains valid');
 assert.equal(labInspection(rig).ready,false,'Bearingless mechanism cannot drive a leg');
 assert.equal(jointWorkingRange(rig,'right','knee').limiter,'rotary bearing absent');
 assert.equal(labJointAction(rig,'right','knee',20).ok,false);
 assert.equal(labAssistedPreset(rig,'crouch').ok,false);
 const restored=labMechanismAction(rig,'right','bearing','install','plain');
 assert.equal(restored.ok,true,restored.reason);
 assert.equal(labMechanismDetails(rig).right.bearing.serial,serial);
 assert.equal(labInspection(rig).ready,true);
});

test('Stage 11 assembles a separate industrial arm using the SAME B-40/P-48 IDs as legs',()=>{
  const rig=createLabMachine(),leg=labMechanismDetails(rig).left;
  const originalCount=labNodeList(rig).length;
  const result=labManipulatorAction(rig,'install');
  assert.equal(result.ok,true,result.reason);
  const arm=labManipulatorDetails(rig);
  assert.equal(arm.valid,true,arm.errors?.join('; '));
  assert.equal(arm.attached,true);
  assert.equal(arm.bearing.id,leg.bearing.definition.id);
  assert.equal(arm.actuator.id,leg.actuator.definition.id);
  assert.notEqual(arm.bearingSerial,leg.bearing.serial);
  assert.notEqual(arm.actuatorSerial,leg.actuator.serial);
  assert.equal(labNodeList(rig).length,originalCount+5);
  assert.ok(arm.range.ok);
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labInspection(rig).ready,true);
});
test('Stage 11 generic structural topology has exactly one parent per part and a separate double-ended actuator',()=>{
 const rig=createLabMachine();
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 const arm=labManipulatorDetails(rig),g=labInspection(rig).graph.nodes;
 assert.equal(g[arm.bracketSerial].parentSerial,rig.installed.structure);
 assert.equal(g[arm.upperSerial].parentSerial,arm.bracketSerial);
 assert.equal(g[arm.bearingSerial].parentSerial,arm.upperSerial);
 assert.equal(g[arm.lowerSerial].parentSerial,arm.bearingSerial);
 assert.equal(g[arm.actuatorSerial].parentSerial,arm.upperSerial);
 assert.equal(g[arm.actuatorSerial].parentSocket,'drive-mount');
 assert.equal(arm.linkage.targetSerial,arm.lowerSerial);
 assert.equal(g[arm.lowerSerial].parentSerial,arm.bearingSerial);
 assert.equal(labInspection(rig).graphCheck.valid,true);
});
test('Stage 11 replacing the manipulator bearing and cylinder changes attainable movement',()=>{
 const rig=createLabMachine();
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 const original=labManipulatorDetails(rig),originalRange=original.range;
 assert.equal(labManipulatorAction(rig,'bearing',{variant:'wide'}).ok,true);
 const wider=labManipulatorDetails(rig);
 assert.equal(wider.bearing.variant,'wide');
 assert.equal(wider.actuator.id,original.actuator.id);
 assert.equal(labManipulatorAction(rig,'actuator',{variant:'travel'}).ok,true);
 const extended=labManipulatorDetails(rig);
 assert.equal(extended.actuator.variant,'travel');
 assert.ok(extended.range.max>originalRange.max+30);
 assert.equal(extended.range.max,120);
 assert.equal(labManipulatorAction(rig,'pose',{angle:115}).ok,true);
 assert.equal(labManipulatorDetails(rig).angle,115);
 assert.equal(labManipulatorAction(rig,'pose',{angle:150}).ok,false);
 // Leg hardware still controls leg knee independently.
 assert.equal(labMechanismDetails(rig).left.bearing.definition.variant,'plain');
 assert.equal(labJointAction(rig,'left','knee',115).ok,false);
});
test('Stage 11 preserves installed arm pose when other leg limbs or weapon change',()=>{
 const rig=createLabMachine();
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 assert.equal(labManipulatorAction(rig,'pose',{angle:12}).ok,true);
 const before=labManipulatorDetails(rig);
 assert.equal(labSectionAction(rig,'left','shin','swap',{variant:'rook'}).ok,true);
 assert.equal(labEquip(rig,'combat','gun-short').ok,true);
 assert.equal(labManipulatorDetails(rig).angle,before.angle);
 assert.equal(labManipulatorDetails(rig).bearingSerial,before.bearingSerial);
 assert.equal(labInspection(rig).valid,true);
});
test('Stage 11 removing manipulator returns exact owned serials and protects the legacy legs',()=>{
 const rig=createLabMachine();
 const legs=labMechanismDetails(rig);
 const original=labInspection(rig).machineCheck.massKg;
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 const arm=labManipulatorDetails(rig),added=labInspection(rig).machineCheck.massKg-original;
 assert.equal(added,35+70+9+56+14);
 const detached=labManipulatorAction(rig,'remove');
 assert.equal(detached.ok,true,detached.reason);
 assert.equal(labManipulatorDetails(rig).attached,false);
 assert.equal(labInspection(rig).machineCheck.massKg,original);
 for(const serial of [arm.bracketSerial,arm.upperSerial,arm.bearingSerial,
   arm.lowerSerial,arm.actuatorSerial]){
   assert.ok(rig.owned.some(x=>x.serial===serial));
   assert.equal(labInspection(rig).graph.nodes[serial],undefined);
 }
 assert.equal(labMechanismDetails(rig).left.bearing.serial,legs.left.bearing.serial);
 assert.equal(labInspection(rig).ready,true);
});
test('Stage 11 v9 blueprint roundtrips manipulator mechanism IDs, pose and graph',()=>{
 const rig=createLabMachine();
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 assert.equal(labManipulatorAction(rig,'bearing',{variant:'wide'}).ok,true);
 assert.equal(labManipulatorAction(rig,'actuator',{variant:'travel'}).ok,true);
 assert.equal(labManipulatorAction(rig,'pose',{angle:90}).ok,true);
 const bp=labBlueprint(rig);
 assert.equal(bp.version,9);
 const loaded=loadLabBlueprint(bp);
 assert.deepEqual(labBlueprint(loaded),bp);
 const invalid=structuredClone(bp);
 invalid.manipulator.lowerSerial=bp.manipulator.upperSerial;
 assert.throws(()=>loadLabBlueprint(invalid));
 const old=structuredClone(bp);
 old.version=8;delete old.manipulator;
 assert.equal(labManipulatorDetails(loadLabBlueprint(old)).attached,false);
});
test('Stage 11 rejects over-rated, missing or duplicate link hardware atomically',()=>{
 const rig=createLabMachine();
 const before=structuredClone(rig);
 const invalid=labManipulatorAction(rig,'install',{bearingVariant:'bogus'});
 assert.equal(invalid.ok,false);
 assert.deepEqual(rig,before);
 assert.equal(labManipulatorAction(rig,'install').ok,true);
 const mounted=structuredClone(rig),arm=labManipulatorDetails(rig);
 const again=labManipulatorAction(rig,'install');
 assert.equal(again.ok,false);
 assert.deepEqual(rig,mounted);
 assert.equal(labManipulatorAction(rig,'pose',{angle:999}).ok,false);
 assert.equal(labManipulatorDetails(rig).bearingSerial,arm.bearingSerial);
});
