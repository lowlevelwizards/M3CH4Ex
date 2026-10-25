/** Stage 16 — safe bridge from the experimental five-station constructor to
 * the production sandbox. Both GitHub Pages projects live under the same
 * origin; only the test-yard preset key is written. Career saves are untouched.
 * Graybox-only geometry cannot be transported into the production renderer.
 */
import {loadGraybox, inspect} from './grayboxCore.js';
import {BY_ID, makeTestAssembly, inspectAssembly} from './components.js';
import {graphFromStations} from './assemblyGraph.js';

export const TEST_YARD_PRESET_KEY='m3ch4-test-yard-loadout-v1';
export const TEST_YARD_URL='/M3CH4/test-yard.html?from=m3ch4ex';
export const EXPERIMENTAL_EQUIVALENTS=Object.freeze({
 'frame-spire-gb':'frame-utility',
 'cab-bubble-gb':'cab-utility',
 'mobility-low-gb':'legs-compact',
 'mobility-quad-gb':'legs-hauler'
});
const STATIONS=Object.freeze({
 structure:'frame',command:'cab',combat:'combat',mobility:'mobility',power:'power'
});
const DRAW_ONLY=Object.freeze(['armor','limb plating','paint','housing','carrier','stance','feet',
 'mount placement','experimental auxiliary equipment']);

/** Validate both the experimental rules and the actual production graph.
 * A rejected production loadout cannot silently deploy factory defaults.
 */
export function planTestYardDeployment(input){
 let model;
 try{model=loadGraybox(input);}catch(error){
  return {ok:false,reason:'Invalid workshop blueprint: '+error.message};
 }
 const review=inspect(model);
 if(!review.complete||!review.valid)
  return {ok:false,reason:'Workshop machine is not ready: '+review.issues.join('; ')};
 const parts={},substitutions=[];
 for(const [production,workshop] of Object.entries(STATIONS)){
  const chosen=workshop==='frame'?model.frame:model.installed[workshop]?.id;
  const id=EXPERIMENTAL_EQUIVALENTS[chosen]||chosen;
  if(!BY_ID.has(id)||BY_ID.get(id).slot!==production)
   return {ok:false,reason:'No live '+production+' counterpart for '+chosen};
  if(id!==chosen)substitutions.push({station:production,original:chosen,live:id});
  parts[production]=id;
 }
 try{
  const rig=makeTestAssembly();
  for(const [station,id] of Object.entries(parts)){
   const instance=rig.owned.find(p=>p.definitionId===id);
   if(!instance)throw Error('Part '+id+' is unavailable in the live test inventory.');
   rig.installed[station]=instance.serial;
  }
  rig.graph=graphFromStations(rig,BY_ID);
  const check=inspectAssembly(rig);
  const failures=check.checks.filter(x=>!x.passes);
  if(failures.length)
   return {ok:false,reason:'Live test-yard fit failed: '+failures.map(x=>x.label+': '+x.reason).join('; '),
    parts,substitutions};
 }catch(error){
  return {ok:false,reason:'Live assembly check failed: '+error.message,parts,substitutions};
 }
 const supports=Object.values(model.support||{});
 return {ok:true,parts,substitutions,
  omissions:DRAW_ONLY.filter(x=>x!=='experimental auxiliary equipment'||supports.length>0),
  url:TEST_YARD_URL,
  notice:'The live range uses real gameplay and the corresponding production five-station rig. '
   +'Graybox mounts, geometry, colors and supports stay in your saved constructor blueprint; '
   +'they are not yet rendered or simulated in the live game.'};
}
export function storeTestYardDeployment(plan,storage){
 if(!plan?.ok||!plan.parts)throw Error('Only a validated rig may deploy.');
 storage.setItem(TEST_YARD_PRESET_KEY,JSON.stringify({
  version:1,source:'m3ch4ex',parts:plan.parts,equipment:{}
 }));
 return plan.url;
}
