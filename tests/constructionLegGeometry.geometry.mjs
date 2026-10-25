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
