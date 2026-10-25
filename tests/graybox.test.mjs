import test from 'node:test';
import assert from 'node:assert/strict';
import {
 GB_VERSION,MANDATORY,FRAMES,CABS,MOBILITY,COMBAT,POWER,SUPPORT,
 emptyBuild,defaultBuild,install,addSupport,removeSupport,changeFrame,inspect,
 validSockets,loadGraybox,exportGraybox,recipe,RECIPES,PAINTS,socketsForFrame,
 socketsForBuild,setLimbPlating
} from '../grayboxCore.js';
import {setForm} from '../grayboxCore.js';
import {HOUSINGS,CARRIERS,STANCES,FEET,normalizeForm,matingTransform} from '../grayboxArchitecture.js';

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
 assert.equal(MOBILITY.length,5);assert.equal(COMBAT.length,5);
 assert.equal(POWER.length,3);assert.equal(SUPPORT.length,8);
 assert.equal(new Set(FRAMES.map(x=>x.shape)).size,4);
 assert.equal(new Set(CABS.map(x=>x.form)).size,4);
 assert.equal(new Set(MOBILITY.map(x=>x.form)).size,5);
 assert.equal(MOBILITY.filter(x=>x.experimental).length,2);
 assert.ok(COMBAT.every(x=>x.source==='existing'),'Retain live game weapon IDs');
 assert.ok(POWER.every(x=>x.source==='existing'),'Retain generator IDs');
});
test('Each frame has distinct typed usable socket geometry and required service positions',()=>{
 const layouts=FRAMES.map(x=>socketsForFrame(x.id));
 assert.ok(layouts.every(list=>new Set(list.map(x=>x.id)).size===list.length));
 for(const slots of layouts)for(const station of ['cab','combat','mobility','power'])
  assert.ok(slots.some(x=>x.station===station),station);
 assert.ok(new Set(layouts.map(l=>l.map(x=>x.id+':'+x.pos.join(',')).sort().join('/'))).size===4);
});
test('Player can swap front/roof cabs on the Cradle instead of imposing old Wedge limits',()=>{
 const rig=defaultBuild();
 assert.equal(validSockets(rig,'cab','cab-armored').some(x=>x.id==='cab-top'),true);
 assert.equal(install(rig,'cab','cab-armored','cab-top').ok,true);
 assert.equal(install(rig,'cab','cab-armored','cab-front').ok,true);
 assert.equal(inspect(rig).complete,true);
 assert.equal(install(rig,'cab','cab-bubble-gb','cab-front').ok,true);
 assert.equal(install(rig,'cab','cab-bubble-gb','cab-top').ok,true);
 assert.equal(changeFrame(rig,'frame-wedge').ok,true);
 assert.equal(rig.installed.cab.id,'cab-bubble-gb','Cradle must support bubble canopy');
 assert.equal(inspect(rig).complete,true);
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
 assert.equal(rig.installed.combat.socket,'combat-top');
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
  assert.equal(check.valid,true,'reference '+i+' must be structurally and electrically valid: '+check.issues.join('; '));
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

test('Every node carries explicit position, orientation, normal and load rules',()=>{
 for(const frame of FRAMES){
  const slots=socketsForFrame(frame.id);
  for(const slot of slots){
   assert.equal(slot.pos.length,3);
   assert.equal(slot.rotation.length,3);
   assert.equal(slot.normal.length,3);
   assert.ok(Number.isFinite(slot.capacity)&&slot.capacity>0);
   assert.ok(slot.standard);
  }
  for(const slot of slots.filter(s=>s.role==='side'))
   assert.equal(slot.normal[0],Math.sign(slot.pos[0]));
  for(const slot of slots.filter(s=>s.role==='rear'))
   assert.equal(slot.rotation[1],Math.PI);
 }
});

test('Stage 14: independently interchangeable machine housings, articulated combat carriers, stance and feet',()=>{
 const rig=defaultBuild();
 assert.equal(HOUSINGS.length,4);
 assert.equal(CARRIERS.length,4);
 assert.equal(STANCES.length,3);
 assert.equal(FEET.length,3);
 assert.deepEqual(rig.form,normalizeForm());
 const initial=inspect(rig);
 assert.equal(setForm(rig,'housing','drum').ok,true);
 assert.equal(setForm(rig,'carrier','heavy').ok,true);
 assert.equal(setForm(rig,'stance','low').ok,true);
 assert.equal(setForm(rig,'feet','skid').ok,true);
 assert.equal(inspect(rig).mass,initial.mass+135+260);
 assert.equal(inspect(rig).complete,true);
 assert.equal(rig.installed.combat.id,'gun-short','Carrier should not replace combat station');
 assert.deepEqual(loadGraybox(exportGraybox(rig)),rig);
 assert.equal(setForm(rig,'housing','nonexistent').ok,false);
 assert.equal(rig.form.housing,'drum','Rejected configuration change must be atomic');
});
test('Stage 14: reference reinterpretations share a small stable module vocabulary',()=>{
 const builds=Array.from({length:10},(_,i)=>recipe(i));
 assert.equal(builds[2].installed.cab.id,'cab-bubble-gb');
 assert.equal(builds[2].installed.mobility.id,'mobility-low-gb');
 assert.equal(builds[4].form.housing,'rounded');
 assert.equal(builds[8].form.housing,'drum');
 assert.equal(builds[1].form.carrier,'heavy');
 assert.equal(builds[5].form.carrier,'offset');
 assert.ok(builds.filter(x=>x.form.carrier!=='direct').length>=7);
 assert.ok(builds.filter(x=>x.form.feet!=='stock').length>=5);
 for(let i=0;i<10;i++){
  const check=inspect(builds[i]);
  assert.equal(check.valid,true,i+': '+check.issues.join('; '));
 }
});
test('Stage 14: rigid mating faces are explicit positions and orientations',()=>{
 const input={position:[0,.3,-.1],rotation:[0,0,0]},
  output={position:[.12,-.2,0],rotation:[0,Math.PI,0]};
 const mate=matingTransform(input,output);
 assert.deepEqual(mate.parent,[0,.3,-.1]);
 assert.equal(mate.childEuler[1],Math.PI);
 assert.throws(()=>matingTransform({},output));
});
test('Stage 14: older graybox v1 blueprints migrate form controls without losing required stations',()=>{
 const old=exportGraybox(defaultBuild());
 delete old.form;
 const restored=loadGraybox(old);
 assert.deepEqual(restored.form,normalizeForm());
 assert.equal(inspect(restored).valid,true);
 assert.equal(restored.installed.combat.id,old.installed.combat.id);
});

test('Stage 14 nested cab and weapon sockets exist only while their parent assemblies are installed',()=>{
 const rig=defaultBuild();
 const nested=socketsForBuild(rig);
 const cab=nested.find(x=>x.id==='cab-accessory-top');
 const weapon=nested.find(x=>x.id==='weapon-shield');
 assert.equal(cab.parent,'cab');
 assert.equal(weapon.parent,'combat');
 assert.ok(validSockets(rig,'support','support-sensor').some(x=>x.id===cab.id));
 assert.ok(validSockets(rig,'support','support-shield').some(x=>x.id===weapon.id));
 assert.equal(addSupport(rig,'support-sensor','cab-accessory-top').ok,true);
 assert.equal(addSupport(rig,'support-shield','weapon-shield').ok,true);
 assert.equal(inspect(rig).valid,true,inspect(rig).issues.join('; '));
 assert.deepEqual(loadGraybox(exportGraybox(rig)),rig);
 delete rig.installed.combat;
 assert.equal(inspect(rig).valid,false,'Orphaned weapon shield must not be considered valid');
});
test('Stage 14 independent left/right mechanical leg armor preserves asymmetry and module identities',()=>{
 const rig=defaultBuild(),original=inspect(rig).mass;
 assert.equal(setLimbPlating(rig,'left',2).ok,true);
 assert.equal(setLimbPlating(rig,'right',0).ok,true);
 assert.equal(inspect(rig).mass,original+70);
 rig.accentByAssembly['leg-left']=PAINTS.red;
 assert.deepEqual(loadGraybox(exportGraybox(rig)),rig);
 assert.equal(setLimbPlating(rig,'right',4).ok,false);
 assert.equal(rig.limbPlating.right,0);
 const old=exportGraybox(rig);delete old.limbPlating;
 assert.deepEqual(loadGraybox(old).limbPlating,{left:0,right:0});
});
