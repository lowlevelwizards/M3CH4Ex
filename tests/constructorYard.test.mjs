import test from 'node:test';
import assert from 'node:assert/strict';
import {
 YARD_OBSTACLES,YARD_TARGETS,initialYardPilot,
 advanceYardPilot,insideObstacle,profileFor
} from '../constructorYardCore.js';
import {recipe,exportGraybox} from '../grayboxCore.js';

test('Stage 17 range takes all ten experimental constructor rigs without substitutions',()=>{
 for(let i=0;i<10;i++){
  const rig=recipe(i),stored=JSON.stringify(exportGraybox(rig));
  assert.ok(rig.installed.mobility?.id);
  assert.ok(profileFor(rig.installed.mobility.id).speed>0);
  let player=initialYardPilot();
  for(let n=0;n<40;n++)player=advanceYardPilot(player,{forward:1},.025,
    rig.installed.mobility.id);
  assert.ok(player.z<26,'reference '+i+' should travel downrange');
  assert.equal(JSON.stringify(exportGraybox(rig)),stored,'piloting cannot rewrite blueprint '+i);
 }
});
test('Moving the exact rig moves -Z by its installed mobility and preserves typed input',()=>{
 const idle=initialYardPilot(),input={forward:1,strafe:0,turn:0};
 const kestrel=advanceYardPilot(idle,input,.04,'legs-compact'),
  hauler=advanceYardPilot(idle,input,.04,'legs-hauler');
 assert.ok(kestrel.z<hauler.z,'Kestrel must initially accelerate more');
 assert.equal(kestrel.x,0);
 assert.deepEqual(input,{forward:1,strafe:0,turn:0});
 assert.deepEqual(idle,initialYardPilot());
});
test('Collision blocks the frame at real obstacles and world bounds',()=>{
 const obstacle=YARD_OBSTACLES.find(o=>o.id==='backstop');
 assert.equal(insideObstacle(0,-45),true);
 let p={...initialYardPilot(),x:0,z:-41,velocityX:0,velocityZ:-9};
 for(let t=0;t<90;t++)p=advanceYardPilot(p,{forward:1},.04,'legs-hauler');
 assert.ok(p.z>obstacle.maxZ+1,'backstop should stop the mech at a safe radius');
 assert.ok(p.blocked,'collision feedback should be available');
});
test('Yaw rotates forward drive and enables strafing with camera-independent controls',()=>{
 let p=initialYardPilot();
 for(let t=0;t<30;t++)p=advanceYardPilot(p,{turn:1},.035,'legs-yard');
 assert.ok(p.yaw>.1);
 const moved=advanceYardPilot(p,{forward:1},.04,'legs-yard');
 assert.ok(moved.x<p.x,'turning right rotates forward drive toward -X');
 const side=advanceYardPilot(initialYardPilot(),{strafe:1},.04,'legs-yard');
 assert.ok(side.x>0);
});
test('Target distribution and range obstacles remain disjoint from garage start',()=>{
 assert.equal(YARD_TARGETS.length,3);
 assert.equal(YARD_TARGETS.map(t=>t.id).length,3);
 assert.ok(!insideObstacle(0,26));
 for(const target of YARD_TARGETS)assert.ok(target.z<26&&target.hp>0);
});
