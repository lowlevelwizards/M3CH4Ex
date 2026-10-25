import test from 'node:test';
import assert from 'node:assert/strict';
import {recipe,socketsForBuild} from '../grayboxCore.js';
import {authoredMatingFace,matingFaceOpposesSocket} from '../grayboxMatingFaces.js';

test('Stage 16B production modules provide child-owned contact faces independent of armor',()=>{
 const fixtures=[
  ['cab-utility','cab','roof',[0,-1,0]],
  ['cab-cyclops','cab','front',[0,0,1]],
  ['cab-bubble-gb','cab','roof',[0,-1,0]],
  ['gun-short','combat','right',[-1,0,0]],
  ['gun-rivet','combat','left',[1,0,0]],
  ['gun-cannon','combat','roof',[0,-1,0]],
  ['power-dynamo','power','rear',[0,0,-1]],
  ['power-forge','power','core',[0,0,-1]]
 ];
 for(const [id,category,role,normal] of fixtures){
  const a=authoredMatingFace(id,category,role);
  assert.ok(a,id+' '+role);
  assert.deepEqual(a.normal,normal);
  assert.ok(a.depth>0&&a.point.length===3&&a.point.every(Number.isFinite));
  assert.deepEqual(authoredMatingFace(id,category,role),a);
 }
 assert.equal(authoredMatingFace('gun-short','combat','left','heavy'),null,
  'Two-link weapon carrier requires a separate authored arm pivot');
 assert.equal(authoredMatingFace('power-air','power','rear'),null,
  'Unmigrated modules should not invent approved interfaces');
});
test('Stage 16B ten references have consistent opposing receiver/contact orientations',()=>{
 for(let i=0;i<10;i++){
  const rig=recipe(i),sockets=socketsForBuild(rig);
  for(const [category,mount] of Object.entries(rig.installed)){
   if(!mount||category==='mobility')continue;
   const s=sockets.find(x=>x.id===mount.socket);
   const data=authoredMatingFace(mount.id,category,s.role,
    category==='combat'?rig.form.carrier:'direct');
   if(!data)continue;
   assert.equal(matingFaceOpposesSocket(data,s.normal),true,
    i+': '+mount.id+' on '+s.id);
  }
 }
});
test('Stage 16B parent-facing gun trunnions retain forward muzzle orientation',()=>{
 const left=authoredMatingFace('gun-short','combat','left');
 const right=authoredMatingFace('gun-short','combat','right');
 assert.equal(left.point[0],-right.point[0]);
 assert.deepEqual(left.normal,[1,0,0]);
 assert.deepEqual(right.normal,[-1,0,0]);
 assert.equal(matingFaceOpposesSocket(left,[-1,0,0]),true);
 assert.equal(matingFaceOpposesSocket(right,[1,0,0]),true);
});
