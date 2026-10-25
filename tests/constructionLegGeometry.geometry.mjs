import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildPartVisual} from '../partVisuals.js';
import {extractYardwalkerLeg} from '../yardwalkerVisual.js';
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
