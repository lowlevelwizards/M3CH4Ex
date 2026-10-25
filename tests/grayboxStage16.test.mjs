import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultBuild,recipe,exportGraybox} from '../grayboxCore.js';
import {
 planTestYardDeployment,storeTestYardDeployment,
 TEST_YARD_PRESET_KEY,TEST_YARD_URL
} from '../grayboxDeployment.js';
import {
 assessPhysicalContacts,pointToBoxDistance,nearestMaterialGap
} from '../grayboxPhysicalAudit.js';

test('Stage 16 stock constructor build hands off exact production station IDs',()=>{
 const source=defaultBuild(),before=JSON.stringify(exportGraybox(source));
 const plan=planTestYardDeployment(source);
 assert.equal(plan.ok,true,plan.reason);
 assert.deepEqual(plan.parts,{
  structure:'frame-sr',command:'cab-utility',combat:'gun-short',
  mobility:'legs-yard',power:'power-dynamo'
 });
 assert.deepEqual(plan.substitutions,[]);
 assert.equal(JSON.stringify(exportGraybox(source)),before,'Deployment must never mutate the workshop blueprint');
 assert.ok(plan.omissions.includes('armor'));
 const saved=new Map();
 const url=storeTestYardDeployment(plan,{setItem:(k,v)=>saved.set(k,v)});
 assert.equal(url,TEST_YARD_URL);
 assert.deepEqual(JSON.parse(saved.get(TEST_YARD_PRESET_KEY)).parts,plan.parts);
 assert.equal(saved.size,1,'Only the isolated Test Yard key may be written');
});
test('Reference prototype parts have explicit substitutions, never silent identity claims',()=>{
 const r=recipe(2),original=r.installed.mobility.id;
 const plan=planTestYardDeployment(r);
 if(plan.ok){
  assert.ok(plan.substitutions.some(s=>s.original===original&&s.live==='legs-compact'));
  assert.ok(plan.substitutions.some(s=>s.original==='cab-bubble-gb'));
  assert.ok(plan.notice.includes('not yet rendered'));
 }else{
  assert.ok(plan.reason.startsWith('Live test-yard fit failed:')||
   plan.reason.startsWith('Live assembly check failed:'));
 }
 assert.equal(r.installed.mobility.id,original);
});
test('Incomplete machines are blocked before any sandbox save can occur',()=>{
 const rig=defaultBuild();rig.installed.power=null;
 const p=planTestYardDeployment(rig);
 assert.equal(p.ok,false);
 assert.throws(()=>storeTestYardDeployment(p,{setItem:()=>{throw Error('must not write')}}));
});
test('Stage 16 contact diagnostics measure material, not hierarchy',()=>{
 const cube={min:[-.1,-.1,-.1],max:[.1,.1,.1]};
 assert.equal(pointToBoxDistance([0,0,0],cube),0);
 assert.equal(Number(pointToBoxDistance([.4,0,0],cube).toFixed(3)),.3);
 assert.equal(nearestMaterialGap([0,0,0],[]),Infinity);
 const good={station:'cab',socket:'cab-top',target:[0,0,0],
  parentMeshes:[cube],childMeshes:[cube]};
 const displaced={...good,station:'combat',socket:'combat-right',
  childMeshes:[{min:[1,1,1],max:[2,2,2]}]};
 const checked=assessPhysicalContacts([good,displaced]);
 assert.equal(checked.checked,2);
 assert.equal(checked.connected,1);
 assert.equal(checked.ok,false);
 assert.ok(checked.issues.some(x=>x.includes('unsupported mate')));
 assert.equal(assessPhysicalContacts([{...good,station:'mobility',groundMin:.2}]).ok,false);
 assert.equal(assessPhysicalContacts([good]).ok,true);
});
