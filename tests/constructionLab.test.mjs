import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLabMachine, labEquip, labInspection, labBlueprint, loadLabBlueprint,
  labNodeList, labSetGeneratorMount, labLegAction, labLegDetails
} from '../constructionLabCore.js';

test('default lab rig is an authentic, graph-valid five-station machine',()=>{
  const rig=createLabMachine();
  assert.equal(labInspection(rig).valid,true);
  assert.equal(labNodeList(rig).filter(n=>!n.virtual).length,5);
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
