import test from 'node:test';
import assert from 'node:assert/strict';
import {
 GB_VERSION,MANDATORY,FRAMES,CABS,MOBILITY,COMBAT,POWER,SUPPORT,
 emptyBuild,defaultBuild,install,addSupport,removeSupport,changeFrame,inspect,
 validSockets,loadGraybox,exportGraybox,recipe,RECIPES,PAINTS,socketsForFrame
} from '../grayboxCore.js';

test('Five stations are mandatory, and none of them is collapsed into optional supports',()=>{
 const state=emptyBuild();
 assert.deepEqual(MANDATORY,['frame','cab','combat','mobility','power']);
 assert.equal(inspect(state).complete,false);
 assert.equal(inspect(state).valid,false);
 const ready=defaultBuild();
 assert.equal(inspect(ready).complete,true);
 assert.equal(inspect(ready).valid,true,inspect(ready).issues.join('; '));
 assert.equal(inspect(ready).experimental,false);
});
test('Starter catalogue is intentionally small but spans every fundamentally distinct assembly family',()=>{
 assert.equal(FRAMES.length,4);assert.equal(CABS.length,4);
 assert.equal(MOBILITY.length,4);assert.equal(COMBAT.length,5);
 assert.equal(POWER.length,3);assert.equal(SUPPORT.length,6);
 assert.equal(new Set(FRAMES.map(x=>x.shape)).size,4);
 assert.equal(new Set(CABS.map(x=>x.form)).size,4);
 assert.equal(new Set(MOBILITY.map(x=>x.form)).size,4);
 assert.equal(MOBILITY.filter(x=>x.experimental).length,1);
 assert.ok(COMBAT.every(x=>x.source==='existing'),'Retain live game weapon IDs');
 assert.ok(POWER.every(x=>x.source==='existing'),'Retain generator IDs');
});
test('Each frame has distinct typed usable socket geometry and required service positions',()=>{
 const layouts=FRAMES.map(x=>socketsForFrame(x.id));
 assert.ok(layouts.every(list=>new Set(list.map(x=>x.id)).size===list.length));
 for(const slots of layouts)for(const station of ['cab','combat','mobility','power'])
  assert.ok(slots.some(x=>x.station===station),station);
 assert.ok(new Set(layouts.map(l=>l.map(x=>x.id).sort().join('/'))).size>=3);
});
test('Player can choose front vs roof cabs when they fit, but armored cab is deliberately front-only',()=>{
 const rig=defaultBuild();
 assert.equal(validSockets(rig,'cab','cab-armored').some(x=>x.id==='cab-top'),false);
 assert.equal(install(rig,'cab','cab-armored','cab-top').ok,false);
 assert.equal(install(rig,'cab','cab-armored','cab-front').ok,true);
 assert.equal(inspect(rig).complete,true);
 assert.equal(install(rig,'cab','cab-bubble-gb','cab-front').ok,false);
 assert.equal(install(rig,'cab','cab-bubble-gb','cab-top').ok,true);
 assert.equal(changeFrame(rig,'frame-wedge').ok,true);
 assert.equal(rig.installed.cab,null,'Unsupported bubble-cab cannot falsely mount on wedge');
 assert.equal(inspect(rig).complete,false);
});
test('Same weapon mounts at distinct compatible positions without changing its definition',()=>{
 const rig=defaultBuild(),id=rig.installed.combat.id;
 for(const socket of ['combat-left','combat-right','combat-top']){
  assert.equal(install(rig,'combat',id,socket).ok,true);
  assert.equal(rig.installed.combat.id,id);
  assert.equal(rig.installed.combat.socket,socket);
 }
 const changed=changeFrame(rig,'frame-utility');
 assert.equal(changed.ok,true);
 assert.equal(changed.moved.includes('combat'),true);
 assert.equal(rig.installed.combat.id,id);
});
test('Optional support utilities can be asymmetric but cannot silently occupy required weapon sockets',()=>{
 const rig=defaultBuild();
 assert.equal(addSupport(rig,'support-arm','combat-right').ok,false);
 assert.equal(addSupport(rig,'support-arm','support-left').ok,true);
 assert.equal(addSupport(rig,'support-shield','support-right').ok,true);
 assert.equal(addSupport(rig,'support-shield','support-roof').ok,false);
 assert.equal(addSupport(rig,'support-sensor','support-roof').ok,true);
 assert.equal(Object.keys(rig.support).length,3);
 assert.equal(removeSupport(rig,'support-left').ok,true);
 assert.equal(inspect(rig).complete,true);
});
test('Heavy loads and generator deficits are visible consequences, not hidden automatic rewrites',()=>{
 const rig=defaultBuild();
 assert.equal(install(rig,'mobility','legs-hauler').ok,true);
 assert.equal(install(rig,'power','power-air').ok,true);
 const verdict=inspect(rig);
 assert.ok(verdict.issues.some(x=>x.startsWith('POWER SHORTFALL')),verdict.issues);
 assert.equal(install(rig,'power','power-forge').ok,true);
 assert.ok(!inspect(rig).issues.some(x=>x.startsWith('POWER SHORTFALL')));
});
test('Armor and color can differentiate identical mechanical structures without extra catalogue parts',()=>{
 const rig=defaultBuild(),original=inspect(rig).mass;
 rig.armor.cab=2;rig.armor.mobility=2;
 rig.paint.main=PAINTS.safety;rig.accentByAssembly['combat-right']=PAINTS.red;
 assert.equal(inspect(rig).mass,original+160);
 assert.deepEqual(loadGraybox(exportGraybox(rig)),rig);
});
test('Ten references can be approximated entirely through reusable catalogue entries and sockets',()=>{
 assert.equal(RECIPES.length,10);
 for(let i=0;i<10;i++){
  const rig=recipe(i),check=inspect(rig);
  assert.equal(check.complete,true,'reference '+i+': '+check.issues.join('; '));
  assert.ok(FRAMES.some(f=>f.id===rig.frame));
  for(const type of ['cab','combat','mobility','power'])
   assert.ok(validSockets({...rig,installed:{...rig.installed,[type]:null}},type,rig.installed[type].id)
    .some(s=>s.id===rig.installed[type].socket));
  assert.deepEqual(loadGraybox(exportGraybox(rig)),rig);
 }
});
test('Graybox save files are independent, validated, and reject out-of-catalog mounting IDs',()=>{
 const rig=recipe(4),serialized=exportGraybox(rig);
 assert.equal(serialized.version,GB_VERSION);
 const bad=structuredClone(serialized);bad.installed.combat.socket='free-floating';
 assert.throws(()=>loadGraybox(bad));
 const paint=structuredClone(serialized);paint.paint.main='transparent';
 assert.throws(()=>loadGraybox(paint));
 const version=structuredClone(serialized);version.version=9000;
 assert.throws(()=>loadGraybox(version));
});
