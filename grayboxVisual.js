/** Purposefully simple, differentiated workshop geometry. All stations
 * render from the same socket + category metadata: no whole-mech presets.
 */
import * as THREE from 'three';
import {BY_PART,socketsForBuild} from './grayboxCore.js';
import {buildSharedVisual} from './grayboxSharedVisual.js';
import {localSocket,socketHardware,makeMobilityAdapter} from './grayboxRigging.js';
import {buildFrameExtensions,buildBodyHousing,buildWeaponCarrier,
 buildFeetAccessory,buildFrameRiser,buildIndependentLegPlating} from './grayboxFormVisual.js';
import './constructionManipulator.js';
import {BY_ID} from './components.js';
import {buildUniversalLinkVisual,buildManipulatorBracketVisual} from './constructionManipulatorVisual.js';
const mat=(color,metalness=.23,opacity=1)=>new THREE.MeshStandardMaterial({
 color,metalness,roughness:.76,flatShading:true,transparent:opacity<1,opacity,
 side:THREE.DoubleSide});
const DARK=mat('#303b3b'),JOINT=mat('#6d7571',.65),GOLD=mat('#b39551'),
 GLASS=mat('#657c7d',.15,.57);
const box=(g,position,size,m,name='')=>{
 const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);
 o.position.set(...position);o.name=name;g.add(o);return o;
};
const cylinder=(g,a,b,r,m,name='')=>{
 const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),length=v.length();
 const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,10),m);
 o.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));
 o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
 o.name=name;g.add(o);return o;
};
const sphere=(g,p,r,m,name='')=>{
 const o=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),m);
 o.position.set(...p);o.name=name;g.add(o);return o;
};
const localMat=(...args)=>{
 const material=mat(...args);
 material.userData.grayboxOwned=true;
 return material;
};
function tag(parent,text,color='#b59f66'){
 const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
 if(!canvas)return;
 canvas.width=160;canvas.height=64;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#20302b';ctx.fillRect(0,0,160,64);
 ctx.fillStyle=color;ctx.font='bold 36px sans-serif';ctx.textAlign='center';
 ctx.fillText(text,80,44);
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(.35,.14),
  new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,side:THREE.DoubleSide}));
 plane.position.set(0,.30,-.43);parent.add(plane);
}
function frameVisual(frame,paint,armor){
 const g=new THREE.Group(),[w,h,d]=frame.size,metal=localMat(paint.secondary),main=localMat(paint.main);
 if(frame.shape==='open'){
  for(const x of [-w*.40,w*.40])cylinder(g,[x,-h*.42,0],[x,h*.45,0],.065,DARK);
  cylinder(g,[-w*.48,h*.29,0],[w*.48,h*.29,0],.09,metal);
  cylinder(g,[-w*.38,-h*.20,0],[w*.38,-h*.20,0],.08,metal);
  box(g,[0,.04,0],[w*.36,h*.68,d*.56],main);
 }else if(frame.shape==='wedge'){
  // Cradle is a low load tub, not a giant opaque slab that hides the cockpit.
  box(g,[0,-h*.26,.04],[w*.81,h*.25,d*.76],metal,'cradle bottom load tray');
  box(g,[0,-h*.32,.05],[w*.72,.12,d*.89],DARK,'hip mounting bridge');
  for(const side of [-1,1]){
   const x=side*w*.40;
   cylinder(g,[x,-h*.31,-d*.33],[x,h*.40,-d*.33],.085,metal,'cradle forward post');
   cylinder(g,[x,-h*.31,d*.29],[x,h*.23,d*.29],.079,metal,'cradle rear post');
   box(g,[x,h*.30,-d*.09],[.16,.13,d*.69],main,'cradle dorsal rail');
   sphere(g,[x,h*.19,-d*.31],.14,JOINT,'shoulder load node');
  }
  box(g,[0,h*.40,-d*.14],[w*.69,.11,d*.58],main,'canopy load shelf');
 }else if(frame.shape==='tall'){
  // SPAR: tall load tower with exposed side rails, crossmembers and trunnions.
  // The proportions, mounting sockets and capacity are independent of its skin.
  for(const side of [-1,1]){
   cylinder(g,[side*w*.27,-h*.41,.22],[side*w*.31,h*.39,.16],
    .063,metal,'Spar load rail '+side);
   sphere(g,[side*w*.40,h*.26,-d*.21],.142,JOINT,'side trunnion '+side);
   box(g,[side*w*.36,h*.27,-d*.18],[.22,.31,.32],main,'equipment head '+side);
   box(g,[side*w*.26,-h*.26,.31],[.095,.27,.38],metal,'lower gusset '+side);
  }
  box(g,[0,-.035,0],[w*.46,h*.75,d*.50],metal,'structural spine');
  box(g,[0,h*.26,-.19],[w*.81,.22,d*.53],main,'top load cradle');
  box(g,[0,-h*.35,.14],[w*.73,.18,d*.64],DARK,'mobility bridge');
  cylinder(g,[-w*.28,-h*.34,.18],[w*.28,-h*.34,.18],.11,JOINT,'main lateral pin');
  for(const side of [-1,1])
   cylinder(g,[side*.13,h*.33,-.24],[side*.13,h*.33,.27],
    .060,DARK,'service channel '+side);
 }else{
  box(g,[0,0,.03],[w*.83,h*.82,d*.82],metal);
  box(g,[0,h*.24,-d*.13],[w,h*.30,d*.62],main);
  for(const x of [-1,1])box(g,[x*w*.42,-h*.07,.12],[w*.15,h*.72,d*.45],metal);
  box(g,[0,-h*.42,.0],[w*.72,h*.16,d*.80],DARK);
 }
 if(armor>=1)box(g,[0,.04,-d*.39],[w*.62,h*.49,.09],main,'frame cover');
 if(armor>=2){
  for(const x of [-1,1])box(g,[x*w*.47,.05,0],[w*.13,h*.59,d*.49],main);
  box(g,[0,h*.49,0],[w*.69,.09,d*.66],main);
 }
 return g;
}
function cabVisual(part,paint,armor){
 const g=new THREE.Group(),main=localMat(paint.main),metal=localMat(paint.secondary);
 if(part.form==='glass'){
  box(g,[0,0,.01],[.99,.57,.92],metal);
  const screen=box(g,[0,.11,-.49],[.79,.44,.055],GLASS);
  screen.rotation.x=-.19;box(g,[0,-.28,-.51],[.94,.13,.12],main);
  for(const x of [-.39,.39])box(g,[x,.06,-.44],[.065,.56,.10],DARK);
 }else if(part.form==='optic'){
  box(g,[0,0,0],[.91,.66,.84],main);
  const rim=cylinder(g,[0,.06,-.44],[0,.06,-.56],.245,DARK);
  sphere(g,[0,.06,-.57],.193,GLASS);
  box(g,[0,.31,.08],[1.03,.12,.77],metal);
 }else if(part.form==='armored'){
  // Protected operator tub is compact and can be wrapped in a larger hull.
  box(g,[0,-.07,.04],[.91,.53,.83],metal,'armored operator cell');
  box(g,[0,.20,.05],[.88,.10,.79],main,'removable upper crash lip');
  box(g,[0,.065,-.398],[.57,.105,.095],DARK,'narrow periscope vision slit');
  box(g,[0,-.13,-.405],[.67,.18,.085],main,'lower armored shutter');
  for(const sign of [-1,1]){
   box(g,[sign*.46,-.03,.02],[.09,.43,.71],main,'side armor flange');
   sphere(g,[sign*.43,.07,.21],.075,JOINT,'cab service hinge');
  }
  box(g,[0,-.36,.08],[.70,.12,.63],DARK,'underbody command receiver');
 }else{
  // Rounded cab: an actual operator tub and canopy ring, not a ball on a cube.
  box(g,[0,-.28,.035],[1.03,.24,.94],metal,'welded pilot tub');
  const lower=new THREE.Mesh(new THREE.CylinderGeometry(.55,.50,.13,16),
    DARK);lower.position.set(0,-.17,-.08);g.add(lower);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(.54,16,12,
   0,Math.PI*2,0,Math.PI*.68),GLASS);
  dome.name='curved canopy';dome.position.set(0,-.06,-.12);g.add(dome);
  for(const sign of [-1,1]){
   cylinder(g,[sign*.44,-.20,-.36],[sign*.37,.16,-.43],
    .035,metal,'front mullion '+sign);
   sphere(g,[sign*.47,-.18,.10],.11,JOINT,'canopy side hinge '+sign);
  }
  cylinder(g,[-.43,-.18,-.30],[.43,-.18,-.30],.06,metal,'forward locking bar');
  box(g,[0,-.36,-.43],[.78,.14,.13],main,'front crash rail');
  box(g,[0,-.32,.46],[.69,.22,.13],main,'rear cockpit service panel');
  box(g,[0,-.14,-.04],[.40,.28,.32],DARK,'pilot instrument binnacle');
 }
 if(armor>=1)box(g,[0,-.30,-.38],[.73,.13,.18],main);
 if(armor>=2){
  for(const x of [-.58,.58])box(g,[x,-.08,.01],[.13,.49,.66],main);
 }
 return g;
}
function legPair(g,form,primary,secondary,armor){
 const configs={
  runner:{hip:.60,knee:.53,foot:.62,step:.29,bend:.24,ankle:.57,shoe:.29},
  work:{hip:.75,knee:.71,foot:.76,step:.12,bend:.06,ankle:.61,shoe:.43},
  heavy:{hip:.97,knee:.97,foot:.94,step:.11,bend:-.05,ankle:.61,shoe:.63}
 };
 const c=configs[form],H=1.67;
 for(const sign of [-1,1]){
  const hip=[sign*c.hip,0,0],knee=[sign*c.knee,-.78,form==='runner'?.24:.13],
   ankle=[sign*c.foot,-1.51,form==='runner'?-.08:.04];
  sphere(g,hip,form==='heavy'?.23:.14,JOINT);
  cylinder(g,hip,knee,form==='heavy'?.165:.095,secondary);
  sphere(g,knee,form==='heavy'?.195:.13,JOINT);
  cylinder(g,knee,ankle,form==='runner'?.074:form==='heavy'?.19:.115,secondary);
  sphere(g,ankle,.11,JOINT);
  box(g,[ankle[0],-1.62,ankle[2]-.10],[c.shoe,.17,form==='heavy'?.78:.57],DARK);
  if(armor>0){
   const a=box(g,[sign*c.hip,-.35,.06],[form==='heavy'?.36:.25,.47,.30],primary);a.rotation.z=sign*.035;
   if(armor>=2)box(g,[sign*c.foot,-1.13,.08],[form==='heavy'?.41:.29,.43,.31],primary);
  }
 }
}
function mobilityVisual(part,paint,armor){
 const g=new THREE.Group(),primary=localMat(paint.main),secondary=localMat(paint.secondary);
 if(part.form==='low'){
  // Stubber: new low biped, not Kestrel merely scaled vertically.
  box(g,[0,-.10,.05],[1.13,.18,.77],secondary,'short hip load bridge');
  for(const sign of [-1,1]){
   const hip=[sign*.54,-.04,.04],knee=[sign*.62,-.43,.22],
    ankle=[sign*.64,-.92,-.08];
   sphere(g,hip,.15,JOINT,'compact hip pivot');
   cylinder(g,hip,knee,.125,secondary,'short link thigh');
   sphere(g,knee,.13,JOINT,'stout knee pivot');
   cylinder(g,knee,ankle,.13,secondary,'compressed load shin');
   sphere(g,ankle,.105,JOINT,'compact ankle');
   box(g,[ankle[0],-1.03,-.19],[.39,.17,.69],DARK,'broad planted boot');
   if(armor>=1)box(g,[sign*.59,-.33,.10],[.27,.38,.35],primary,'stub thigh guard');
   if(armor>=2)box(g,[sign*.64,-.73,.04],[.30,.32,.35],primary,'stub shin shell');
  }
  return g;
 }
 if(part.form!=='quad'){legPair(g,part.form,primary,secondary,armor);return g;}
 // Crawler: one square load deck and four equal independent outboard legs.
 // Greybox only; do not claim this has a fourth live locomotion solver.
 box(g,[0,-.17,0],[1.27,.24,1.42],secondary,'four-point load deck');
 for(const x of [-.68,.68]){
  cylinder(g,[x,-.12,-.57],[x,-.12,.57],.070,JOINT,'outboard longitudinal beam');
 }
 for(const x of [-.68,.68])for(const z of [-.54,.54]){
  const sign=Math.sign(x),
   hip=[x,-.09,z],
   knee=[x+sign*.43,-.60,z+Math.sign(z)*.20],
   ankle=[x+sign*.49,-1.44,z+Math.sign(z)*.28];
  sphere(g,hip,.165,JOINT,'crawler hip race');
  cylinder(g,hip,knee,.12,secondary,'crawler load upper');
  sphere(g,knee,.16,JOINT,'crawler knee pivot');
  cylinder(g,knee,ankle,.105,secondary,'crawler lower strut');
  sphere(g,ankle,.10,JOINT,'crawler ankle');
  box(g,[ankle[0],-1.53,ankle[2]-.04],[.39,.17,.52],DARK,'crawler pad');
  if(armor>=1)
   box(g,[hip[0]+sign*.13,-.32,hip[2]],[.27,.34,.32],
    primary,'crawler upper cover');
  if(armor>=2)
   box(g,[knee[0],-1.09,knee[2]],[.26,.37,.33],
    primary,'crawler shin sleeve');
 }
 return g;
}
function weaponVisual(part,paint,armor){
 const g=new THREE.Group(),primary=localMat(paint.main),secondary=localMat(paint.secondary);
 box(g,[0,0,.13],[.49,.39,.72],secondary);
 if(part.form==='rotary'){
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3;
   cylinder(g,[Math.cos(a)*.155,Math.sin(a)*.155,-.12],
    [Math.cos(a)*.155,Math.sin(a)*.155,-1.32],.041,DARK);
  }
  cylinder(g,[0,0,-1.29],[0,0,-1.36],.23,JOINT);
 }else if(part.form==='rocket'){
  for(const x of [-.19,0,.19])cylinder(g,[x,0,-.23],[x,0,-.79],.085,DARK);
  box(g,[0,.06,-.30],[.65,.42,.83],primary);
 }else if(part.form==='scatter'){
  for(const x of [-.115,.115])cylinder(g,[x,0,-.18],[x,0,-.90],.11,DARK);
 }else{
  cylinder(g,[0,0,-.12],[0,0,part.form==='long'?-1.84:-1.08],
    part.form==='long'?.085:.16,DARK);
  cylinder(g,[0,0,-.51],[0,0,-.61],part.form==='long'?.18:.22,JOINT);
 }
 if(armor>=1)box(g,[0,.24,.02],[.57,.15,.65],primary);
 if(armor>=2)box(g,[0,-.20,-.05],[.60,.11,.67],primary);
 return g;
}
function powerVisual(part,paint){
 const g=new THREE.Group(),main=localMat(paint.secondary),primary=localMat(paint.main);
 const size=part.form==='heavy'?[1.05,.81,.82]:
  part.form==='light'?[.71,.85,.62]:[.84,.66,.75];
 box(g,[0,0,0],size,main,'generator cast pressure case');
 box(g,[0,-size[1]*.48,0],[size[0]*.92,.10,size[2]*.90],DARK,'generator skid');
 for(const x of [-1,1]){
  cylinder(g,[x*size[0]*.43,-size[1]*.42,-size[2]*.45],
   [x*size[0]*.43,-size[1]*.42,size[2]*.43],.067,JOINT,'mounting skid rail');
  box(g,[x*size[0]*.42,-.01,0],[.08,size[1]*.58,size[2]*.69],
   primary,'removable service wall');
 }
 for(let x=-3;x<=3;x++){
  box(g,[x*(size[0]/8),size[1]/2+.10,.06],[.039,.20,size[2]*.76],
   DARK,'radiator blade');
 }
 if(part.form==='heavy'){
  for(const x of [-.36,.36])
   cylinder(g,[x,.02,-.42],[x,.02,.43],.10,JOINT,'heavy external manifold');
 }else if(part.form==='light'){
  cylinder(g,[0,.36,0],[0,.76,0],.14,JOINT,'air intake stack');
  cylinder(g,[0,.72,0],[0,.82,0],.19,DARK,'exhaust cap');
 }
 box(g,[0,-.02,-size[2]/2-.055],[size[0]*.55,size[1]*.47,.10],
  primary,'forward service shield');
 return g;
}
function supportVisual(part,paint){
 const g=new THREE.Group(),main=localMat(paint.main),secondary=localMat(paint.secondary);
 switch(part.form){
  case 'arm-light':
  case 'arm-heavy':
  case 'arm': {
   // Each Stage 11 link has its own ACTUAL mechanical tip. The next bearing
   // and every terminal component are computed from that tip, never from
   // guessed world offsets or a model-wide bounding box.
   const heavy=part.form==='arm-heavy',light=part.form==='arm-light',
    bracketDef=BY_ID.get('construction-manip-bracket'),
    upperDef=BY_ID.get('construction-link-530'),
    lowerDef=BY_ID.get('construction-link-430');
   const bracket=buildManipulatorBracketVisual(bracketDef);
   bracket.name='structural arm mounting bracket';g.add(bracket);
   const shoulder=bracketDef.sockets[0].position;
   const shoulderV=new THREE.Vector3(...shoulder);
   sphere(g,[...shoulder],heavy?.16:.12,JOINT,'real shoulder bearing');
   function link(parent,def,name,target){
    const mesh=buildUniversalLinkVisual(def);
    const tip=new THREE.Vector3(...(def.mechanical?.end||[0,-.42,-.09]));
    const pivot=new THREE.Group();pivot.name=name+' joint root';
    const desired=new THREE.Vector3(...target).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(tip.clone().normalize(),desired);
    pivot.quaternion.copy(q);pivot.add(mesh);parent.add(pivot);
    pivot.userData.linkEnd=[...tip];
    return {pivot,tip:tip.applyQuaternion(q)};
   }
   const upperRoot=new THREE.Group();upperRoot.name='shoulder articulated pivot';
   upperRoot.position.copy(shoulderV);g.add(upperRoot);
   const u=link(upperRoot,upperDef,'upper arm',[.04,-1,-.24]);
   const elbow=new THREE.Vector3(...shoulder).add(u.tip);
   const elbowJoint=new THREE.Group();
   elbowJoint.name='elbow articulated bearing';elbowJoint.position.copy(elbow);
   g.add(elbowJoint);sphere(elbowJoint,[0,0,0],heavy?.16:.12,JOINT,'elbow pin');
   const l=link(elbowJoint,lowerDef,'forearm',[-.05,-1,.11]);
   const wrist=elbow.clone().add(l.tip);
   const end=new THREE.Group();end.name='actual wrist/end-effector socket';
   end.position.copy(wrist);g.add(end);
   box(end,[0,0,0],[heavy?.36:.27,.19,.25],secondary,'wrist carrier flange');
   sphere(end,[0,-.085,0],.095,JOINT,'gripper swivel bearing');
   box(end,[0,-.16,-.01],[.27,.19,.23],secondary,'gripper palm');
   for(const sign of [-1,1]){
    // Each gripping jaw starts at its OWN palm hinge; nothing floats below.
    sphere(end,[sign*.115,-.25,-.06],.063,JOINT,'jaw hinge '+sign);
    box(end,[sign*.145,-.34,-.08],[.078,.21,.13],DARK,
     'attached service gripper jaw '+sign);
   }
   if(heavy){
    // Armour is parented to the corresponding articulated link.
    const upperCover=box(u.pivot,[0,-.25,-.07],[.38,.43,.25],main,
      'articulated upper-arm plate');
    upperCover.rotation.x=-.12;
    box(l.pivot,[0,-.20,-.055],[.34,.30,.25],main,
      'articulated forearm protection');
   }else if(!light){
    box(u.pivot,[0,-.22,-.08],[.26,.31,.18],main,
      'utility upper arm sleeve');
   }
   g.userData.mechanicalChain=[
    {name:'upper',start:[...shoulder],end:elbow.toArray()},
    {name:'lower',start:elbow.toArray(),end:wrist.toArray()},
    {name:'hand',start:wrist.toArray(),end:[wrist.x,wrist.y-.42,wrist.z-.08]}
   ];
   g.userData.shoulderLocal=[...shoulder];
   g.userData.wristLocal=wrist.toArray();
   g.userData.grayboxVisualSource='stage11-linked-service-arm';
   break;
  }
  case 'sensor':
   box(g,[0,.14,-.12],[.39,.36,.35],secondary);
   for(const x of [-.11,.11])sphere(g,[x,.15,-.33],.089,GLASS);
   break;
  case 'shield':
   box(g,[0,-.13,-.16],[.68,.80,.12],main);box(g,[0,-.12,-.24],[.51,.53,.045],secondary);
   break;
  case 'cooler':
   box(g,[0,0,.10],[.63,.63,.42],secondary);
   for(const x of [-2,-1,0,1,2])box(g,[x*.094,.03,-.15],[.045,.54,.055],DARK);
   break;
  case 'ammo':
   box(g,[0,0,.07],[.46,.64,.52],main);
   for(const x of [-.11,.11])box(g,[x,.02,-.23],[.12,.46,.12],DARK);
   break;
  case 'light':
   cylinder(g,[0,0,0],[0,.64,0],.037,DARK);
   sphere(g,[0,.68,0],.13,localMat('#ebb05b',.05,.85));
   break;
 }
 // Standardized physical attachment base, irrespective of its task.
 // Bolted mounting blocks make otherwise dissimilar support gear look seated
 // in the same attachment ecosystem.
 box(g,[0,.055,.23],[.33,.30,.16],secondary,'auxiliary mount flange');
 for(const sign of [-1,1]){
  sphere(g,[sign*.115,.055,.318],.040,JOINT,'retaining bolt '+sign);
 }
 return g;
}
export function visualFor(type,part,paint,armor=0){
 const source=(part.id==='frame-wedge'||part.id==='cab-armored')?null:
  buildSharedVisual(type,part.id,paint,armor);
 if(source)return source;
 if(type==='frame')return frameVisual(part,paint,armor);
 if(type==='cab')return cabVisual(part,paint,armor);
 if(type==='mobility')return mobilityVisual(part,paint,armor);
 if(type==='combat')return weaponVisual(part,paint,armor);
 if(type==='power')return powerVisual(part,paint);
 return supportVisual(part,paint);
}
/** Map a typed socket onto the actual authored frame's surface. Structural
 * positions remain normalized in the core for rules and save persistence;
 * geometry is authoritative for visual contact and no centered "floating parts".
 */
export function physicalSocketPosition(socket,bounds){
 const center=bounds.getCenter(new THREE.Vector3()),
  [x,y,z]=socket.pos,role=socket.role;
 const output=new THREE.Vector3(x,y,z);
 if(socket.id==='mobility-bottom')return [0,bounds.min.y+.055,.02];
 if(socket.id==='cab-top')return [0,bounds.max.y-.04,Math.min(0,center.z-.07)];
 if(socket.id==='cab-front')return [0,center.y+.10,bounds.min.z+.06];
 if(socket.id==='power-inner')return [0,center.y,center.z+.08];
 if(role==='rear')return [x,Math.max(bounds.min.y+.18,y),bounds.max.z-.055];
 if(role==='roof')return [x,bounds.max.y-.035,z];
 if(role==='left'||role==='right'||role==='side')
  return [x<0?bounds.min.x+.045:bounds.max.x-.045,
   center.y+y,Math.min(center.z,z)];
 return [x,y,z];
}
const actualBounds=group=>{
 group.updateWorldMatrix(true,true);
 return new THREE.Box3().setFromObject(group,true);
};
const definePosition=(mesh,x,y,z)=>{
 mesh.position.set(x,y,z);
};
function materialMount(root,a,b,r=.11,name='MECHANICAL MOUNT'){
 const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),
  axis=to.clone().sub(from),length=axis.length();
 if(length<.035)return;
 const mount=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,10),JOINT);
 mount.name=name;mount.position.copy(from.add(to).multiplyScalar(.5));
 mount.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
 root.add(mount);
}
/** Original joints are preserved; no size-normalizing stretches of detailed
 * geometry. Frame elevation follows actual mobility height, not fixed 2.09.
 */
export function buildGrayboxScene(state,{socketVisible=false,highlightCategory=null,highlightPart=null}={}){
 const root=new THREE.Group(),sockets=[],objects=[];
 const frame=BY_PART.get(state.frame),paint=state.paint,
  frameColor={...paint,main:state.accentByAssembly.frame||paint.main};
 const body=visualFor('frame',frame,frameColor,state.armor.frame);
 buildFrameExtensions(body,state.frame,frameColor);
 const frameBounds=actualBounds(body);
 const housing=state.form?.housing||'none';
 if(housing!=='none')body.add(buildBodyHousing(housing,frameBounds,frameColor));
 const mobMount=state.installed.mobility,
  mobilityPart=BY_PART.get(mobMount?.id),
  mobile=mobilityPart?visualFor('mobility',mobilityPart,{
   ...paint,main:state.accentByAssembly.mobility||paint.main
  },state.armor.mobility):null;
 let mobilityBounds=mobile?actualBounds(mobile):null;
 if(mobile&&state.form?.feet&&state.form.feet!=='stock'){
  mobile.add(buildFeetAccessory(state.form.feet,mobilityBounds,paint,mobilityPart.id));
  mobilityBounds=actualBounds(mobile);
 }
 if(mobile&&(state.limbPlating?.left||state.limbPlating?.right)){
  mobile.add(buildIndependentLegPlating(state.limbPlating,mobilityBounds,paint,
    state.accentByAssembly,mobilityPart.id));
  mobilityBounds=actualBounds(mobile);
 }
 // Foot underside == 0; the lowest load-bearing frame interface overlaps
 // the native mobility crown rather than sitting on a disconnected neck.
 const height=mobilityBounds?mobilityBounds.max.y-mobilityBounds.min.y:1.57;
 const stance=state.form?.stance||'normal';
 const drop=stance==='low'?.15:stance==='tall'?-.20:0;
 if(drop<0)body.add(buildFrameRiser(frameBounds,drop,paint));
 const frameY=height-.07-frameBounds.min.y-drop;
 body.position.y=frameY;root.add(body);
 objects.push({category:'frame',group:body,source:body.userData.grayboxVisualSource||'graybox'});
 const allSockets=socketsForBuild(state);
 const physical=new Map(allSockets.filter(socket=>!socket.parent).map(socket=>[
  socket.id,localSocket(frame,socket)
 ]));
 // Only installed receivers are drawn. Unused hardpoints stay uncluttered;
 // optional socket debug markers still reveal the complete interface graph.
 const occupied=new Set([
  ...Object.values(state.installed).filter(Boolean).map(x=>x.socket),
  ...Object.keys(state.support)
 ]);
 for(const socket of allSockets.filter(s=>!s.parent&&occupied.has(s.id))){
  socketHardware(body,socket,physical.get(socket.id),frame);
 }

 // Nested mounts are resolved after their parent has been physically placed.
 const worldFromNested=(socket)=>{
  const node=objects.find(o=>o.category===socket.parent);
  if(!node)return null;
  root.updateMatrixWorld(true);
  if(socket.parent==='combat'){
   const marker=node.group.getObjectByName('weapon-shield-mate');
   if(marker){
    const w=marker.getWorldPosition(new THREE.Vector3());
    return [w.x,w.y-frameY,w.z];
   }
   // Direct gun mounts use the rear structural receiver, never barrel tip.
   const w=node.group.localToWorld(new THREE.Vector3(.18,.06,.24));
   return [w.x,w.y-frameY,w.z];
  }
  const b=new THREE.Box3().setFromObject(node.group,true),
    c=b.getCenter(new THREE.Vector3());
  return [c.x,b.max.y-frameY,c.z];
 };
 const attached=[
  ...Object.entries(state.installed).filter(([,mount])=>mount)
   .map(([category,mount])=>({...mount,category})),
  ...Object.entries(state.support).map(([socket,id])=>({category:'support',socket,id}))
 ];
 for(const mount of attached){
  const part=BY_PART.get(mount.id),socket=allSockets.find(s=>s.id===mount.socket);
  if(!part||!socket)continue;
  const finish={...paint,main:state.accentByAssembly[mount.socket]||
    state.accentByAssembly[mount.category]||paint.main};
  const armor=state.armor[mount.category]??0;
  let group=mount.category==='mobility'?mobile:visualFor(mount.category,part,finish,armor);
  if(!group)continue;
  const carrier=mount.category==='combat'?(state.form?.carrier||'direct'):'direct';
  if(carrier!=='direct'){
   group=buildWeaponCarrier(carrier,group,finish,socket.role==='left'?-1:1);
  }
  const bb=mount.category==='mobility'?mobilityBounds:actualBounds(group),
   mid=bb.getCenter(new THREE.Vector3()),
   pt=socket.parent?worldFromNested(socket):physical.get(socket.id);
  if(!pt)continue;
  physical.set(socket.id,pt);
  let x=pt[0]-mid.x,y=frameY+pt[1]-mid.y,z=pt[2]-mid.z;
  if(mount.category==='combat'&&carrier!=='direct'){
   // Socket mates to the actual load-bearing shoulder pivot on the carrier.
   x=pt[0];y=frameY+pt[1];z=pt[2];
  }else if(mount.category==='mobility'){
   // Keep both actual shoes on the ground; allow the designed upper crown
   // to overlap the load bridge instead of inventing a floating hip block.
   x=-mid.x;y=-bb.min.y;z=-mid.z;
  }else if(mount.category==='cab'&&socket.role==='roof'){
   x=pt[0]-mid.x;y=frameY+pt[1]-bb.min.y-.045;z=pt[2]-mid.z;
  }else if(mount.category==='cab'&&socket.role==='front'){
   x=pt[0]-mid.x;y=frameY+pt[1]-mid.y;
   z=pt[2]-bb.max.z+.065;
  }else if(mount.category==='combat'&&(socket.role==='left'||socket.role==='right')){
   const right=socket.role==='right';
   x=pt[0]-(right?bb.min.x:bb.max.x)+(right?-.045:.045);
   y=frameY+pt[1]-mid.y;
   // Mount the real weapon's REAR receiver against the frame rather than
   // leaving a long unsupported bore sticking out sideways.
   z=pt[2]-bb.max.z+.11;
  }else if(mount.category==='combat'&&socket.role==='roof'){
   x=pt[0]-mid.x;y=frameY+pt[1]-bb.min.y+.025;z=pt[2]-bb.max.z+.06;
  }else if(mount.category==='power'&&socket.role==='rear'){
   x=pt[0]-mid.x;y=frameY+pt[1]-mid.y;z=pt[2]-bb.min.z-.06;
  }else if(mount.category==='support'&&socket.parent==='combat'){
   // Shield bracket is an explicit point on the actual carrier.
   x=pt[0]-mid.x;y=frameY+pt[1]-mid.y;z=pt[2]-mid.z;
  }else if(mount.category==='support'&&socket.role==='rear'){
   // Auxiliary flange is centered at local (0,.055,+.23).
   x=pt[0];y=frameY+pt[1]-.055;z=pt[2]-.23;
  }else if(mount.category==='support'&&socket.role==='roof'){
   x=pt[0]-mid.x;y=frameY+pt[1]-bb.min.y-.015;z=pt[2]-mid.z;
  }else if(mount.category==='support'&&socket.role==='side'){
   // Side flange faces the frame laterally; the arm hangs vertically.
   const right=pt[0]>0,sign=right?1:-1;
   x=pt[0]-sign*.23;y=frameY+pt[1]-.055;z=pt[2];
  }
  definePosition(group,x,y,z);
  // No implicit "every rear gun turns backwards": assemblies preserve -Z
  // forward, and authored socket orientation is applied only where relevant.
  group.rotation.set(...(socket.rotation||[0,0,0]));
  if(mount.category==='support'&&!socket.parent&&socket.role==='side')
   group.rotation.y=pt[0]>0?Math.PI/2:-Math.PI/2;
  if(mount.category==='support'&&!socket.parent&&socket.role==='rear')
   group.rotation.y=0;
  group.userData.installedSocket=socket.id;
  group.userData.rootMateWorld=[pt[0],pt[1]+frameY,pt[2]];
  group.userData.visualMateType=socket.parent?'nested-assembly':'frame-structure';
  root.add(group);
  if(socket.parent){
   const parent=objects.find(x=>x.category===socket.parent);
   if(parent){
    root.updateMatrixWorld(true);
    parent.group.attach(group);
   }
  }
  objects.push({category:mount.category,group,socket:mount.socket,
   source:group.userData.grayboxVisualSource||'graybox'});
 }
 for(const socket of allSockets){
  const pos=physical.get(socket.id)|| (socket.parent?worldFromNested(socket):null);
  if(!pos)continue;
  if(socketVisible||highlightCategory===socket.station){
   const world=[pos[0],pos[1]+frameY,pos[2]];
   const glyph=sphere(root,world,highlightCategory===socket.station?.095:.055,
     highlightCategory===socket.station?localMat('#d3a34b',.15,.90):
       localMat('#97a49a',.13,.76),'socket-'+socket.id);
   glyph.userData.socket=socket.id;sockets.push({mesh:glyph,socket});
  }
 }
 return {root,sockets,objects};
}
