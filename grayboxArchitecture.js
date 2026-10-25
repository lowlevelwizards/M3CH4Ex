/** Stage 14: a deliberately small vocabulary of architectural assemblies.
 * Form is separate from the five mandatory operational stations.
 * Values are workshop preview rules, NOT new live-game component definitions.
 */
export const HOUSINGS=Object.freeze([
 {id:'none',name:'EXPOSED / Naked Structure',mass:0,form:'none',description:'Bare frame and equipment'},
 {id:'angular',name:'ANGULAR / Welded Fairings',mass:90,form:'angular',description:'Removable flat panels over a rigid cage'},
 {id:'drum',name:'DRUM / Cylindrical Shell',mass:135,form:'drum',description:'Enclosing industrial casing with service hatch'},
 {id:'rounded',name:'ROUNDED / Machine Pods',mass:110,form:'rounded',description:'Circular side tanks and structural equipment casings'}
]);
export const CARRIERS=Object.freeze([
 {id:'direct',name:'DIRECT / Receiver Block',mass:0,draw:0,length:0,form:'direct'},
 {id:'short',name:'COMPACT / Articulated Cradle',mass:105,draw:-11,length:.55,form:'short'},
 {id:'heavy',name:'HEAVY / Two-Link Carrier',mass:260,draw:-22,length:.92,form:'heavy'},
 {id:'offset',name:'OFFSET / High Gun Pintle',mass:125,draw:-8,length:.36,form:'offset'}
]);
export const STANCES=Object.freeze([
 {id:'normal',name:'STANDARD / Stock Assembly',drop:0},
 {id:'low',name:'LOW / Compact Hip Integration',drop:.16},
 {id:'tall',name:'RAISED / Frame Riser',drop:-.22}
]);
export const FEET=Object.freeze([
 {id:'stock',name:'STOCK / Original Feet'},
 {id:'skid',name:'SKID / Wide Ground Pads'},
 {id:'claw',name:'CLAW / Split Industrial Toes'}
]);
export const DEFAULT_FORM=Object.freeze({
 housing:'none',carrier:'direct',stance:'normal',feet:'stock'
});
export const fromId=(array,id)=>array.find(x=>x.id===id);
export function normalizeForm(form={}){
 const result={...DEFAULT_FORM,...form};
 for(const [key,collection] of [['housing',HOUSINGS],['carrier',CARRIERS],
  ['stance',STANCES],['feet',FEET]]){
  if(!fromId(collection,result[key]))throw new Error('Unknown '+key+' assembly');
 }
 return result;
}
/** A socket is a pair of authored rigid attachment frames.
 * This is geometry-neutral, suitable for preview and future Three.js transforms.
 */
export function matingTransform(parent,child){
 if(!parent||!child||![parent.position,parent.rotation,child.position,child.rotation]
  .every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))
  throw Error('Both mating faces require position and Euler rotation');
 return {parent:parent.position.slice(),parentEuler:parent.rotation.slice(),
  child:child.position.slice(),childEuler:child.rotation.slice()};
}
export const ROOT_MATES=Object.freeze({
 frame:{position:[0,0,0],rotation:[0,0,0]},
 cabTop:{position:[0,-.30,0],rotation:[0,0,0]},
 cabFront:{position:[0,0,.30],rotation:[0,0,0]},
 combatRear:{position:[0,0,.38],rotation:[0,0,0]},
 powerFront:{position:[0,0,-.34],rotation:[0,0,0]},
 sideRoot:{position:[0,0,.20],rotation:[0,0,0]}
});
