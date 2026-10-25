/** Purposefully simple, differentiated workshop geometry. All stations
 * render from the same socket + category metadata: no whole-mech presets.
 */
import * as THREE from 'three';
import {BY_PART,socketsForFrame} from './grayboxCore.js';
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
const toColor=(hex,factor)=>new THREE.Color(hex).multiplyScalar(factor);
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
 const g=new THREE.Group(),[w,h,d]=frame.size,metal=mat(paint.secondary),main=mat(paint.main);
 if(frame.shape==='open'){
  for(const x of [-w*.40,w*.40])cylinder(g,[x,-h*.42,0],[x,h*.45,0],.065,DARK);
  cylinder(g,[-w*.48,h*.29,0],[w*.48,h*.29,0],.09,metal);
  cylinder(g,[-w*.38,-h*.20,0],[w*.38,-h*.20,0],.08,metal);
  box(g,[0,.04,0],[w*.36,h*.68,d*.56],main);
 }else if(frame.shape==='wedge'){
  box(g,[0,0,.12],[w,h*.72,d*.75],metal);
  const front=box(g,[0,h*.14,-d*.30],[w*.90,h*.38,d*.36],main);
  front.rotation.x=-.26;
  box(g,[0,-h*.34,.02],[w*.82,h*.12,d*.63],DARK);
 }else if(frame.shape==='tall'){
  box(g,[0,0,0],[w*.70,h*.94,d*.72],metal);
  box(g,[0,h*.22,-d*.12],[w,h*.29,d*.66],main);
  box(g,[0,-h*.35,.2],[w*.83,h*.13,d*.77],DARK);
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
 const g=new THREE.Group(),main=mat(paint.main),metal=mat(paint.secondary);
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
  box(g,[0,0,0],[1.15,.66,.90],metal);
  box(g,[0,.14,-.47],[.79,.135,.105],DARK);
  box(g,[0,-.08,-.5],[.91,.39,.10],main);
  for(const x of [-.55,.55])box(g,[x,-.01,0],[.13,.53,.76],main);
 }else{
  box(g,[0,-.26,.07],[.92,.23,.88],metal);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(.54,14,10,
   0,Math.PI*2,0,Math.PI*.68),GLASS);
  dome.position.set(0,-.05,-.12);g.add(dome);
  cylinder(g,[-.40,-.14,0],[.40,-.14,0],.056,DARK);
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
 const g=new THREE.Group(),primary=mat(paint.main),secondary=mat(paint.secondary);
 if(part.form!=='quad'){legPair(g,part.form,primary,secondary,armor);return g;}
 box(g,[0,-.18,0],[1.20,.34,1.30],secondary);
 for(const x of [-.68,.68])for(const z of [-.52,.52]){
  const hip=[x,-.1,z],knee=[x*1.58,-.61,z*1.32],ankle=[x*1.63,-1.43,z*1.48];
  sphere(g,hip,.14,JOINT);cylinder(g,hip,knee,.095,secondary);
  sphere(g,knee,.13,JOINT);cylinder(g,knee,ankle,.10,secondary);
  box(g,[ankle[0],-1.54,ankle[2]],[.37,.17,.48],DARK);
  if(armor>0)box(g,[hip[0]*1.2,-.28,hip[2]*1.08],[.26,.34,.29],primary);
 }
 return g;
}
function weaponVisual(part,paint,armor){
 const g=new THREE.Group(),primary=mat(paint.main),secondary=mat(paint.secondary);
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
 const g=new THREE.Group(),main=mat(paint.secondary),primary=mat(paint.main);
 const size=part.form==='heavy'?[1.05,.81,.82]:
  part.form==='light'?[.71,.85,.62]:[.84,.66,.75];
 box(g,[0,0,0],size,main);
 for(let x=-2;x<=2;x++){
  box(g,[x*(size[0]/6),size[1]/2+.065,0],[.056,.14,size[2]*.84],DARK);
 }
 if(part.form==='heavy'){
  for(const x of [-.36,.36])cylinder(g,[x,.02,-.42],[x,.02,.43],.10,JOINT);
 }else if(part.form==='light'){
  cylinder(g,[0,.36,0],[0,.77,0],.16,JOINT);
 }
 box(g,[0,0,-size[2]/2-.06],[size[0]*.5,size[1]*.4,.09],primary);
 return g;
}
function supportVisual(part,paint){
 const g=new THREE.Group(),main=mat(paint.main),secondary=mat(paint.secondary);
 switch(part.form){
  case 'arm':
   sphere(g,[0,0,0],.13,JOINT);
   cylinder(g,[0,0,0],[0,-.40,-.12],.085,secondary);
   sphere(g,[0,-.40,-.12],.105,JOINT);
   cylinder(g,[0,-.40,-.12],[0,-.77,-.42],.078,secondary);
   for(const x of [-.10,.10])box(g,[x,-.84,-.48],[.08,.23,.10],DARK);
   break;
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
   sphere(g,[0,.68,0],.13,mat('#ebb05b',.05,.85));
   break;
 }
 return g;
}
export function visualFor(type,part,paint,armor=0){
 if(type==='frame')return frameVisual(part,paint,armor);
 if(type==='cab')return cabVisual(part,paint,armor);
 if(type==='mobility')return mobilityVisual(part,paint,armor);
 if(type==='combat')return weaponVisual(part,paint,armor);
 if(type==='power')return powerVisual(part,paint);
 return supportVisual(part,paint);
}
export function buildGrayboxScene(state,{socketVisible=false,highlightCategory=null,highlightPart=null}={}){
 const root=new THREE.Group(),sockets=[],objects=[];
 const frame=BY_PART.get(state.frame);
 const paint=state.paint;
 const frameColor={...paint,main:state.accentByAssembly.frame||paint.main};
 const body=visualFor('frame',frame,frameColor,state.armor.frame);
 body.position.y=2.09;root.add(body);objects.push({category:'frame',group:body});
 const allSockets=socketsForFrame(state.frame);
 for(const s of allSockets){
  const p=[s.pos[0],s.pos[1]+2.09,s.pos[2]],matColor=mat('#9b9e8c',.13,.75);
  if(socketVisible||highlightCategory===s.station){
   const glyph=sphere(root,p,highlightCategory===s.station?.095:.055,
     highlightCategory===s.station?mat('#c7a254',.15,.88):matColor,'socket-'+s.id);
   glyph.userData.socket=s.id;sockets.push({mesh:glyph,socket:s});
  }
 }
 const attached=[
  ...Object.entries(state.installed).filter(([,mount])=>mount).map(([category,mount])=>({...mount,category})),
  ...Object.entries(state.support).map(([socket,id])=>({category:'support',socket,id}))
 ];
 for(const mount of attached){
  const part=BY_PART.get(mount.id),socket=allSockets.find(s=>s.id===mount.socket);
  if(!part||!socket)continue;
  const componentPaint={...paint,main:state.accentByAssembly[mount.socket]||
    state.accentByAssembly[mount.category]||paint.main};
  const armor=state.armor[mount.category]||0;
  const group=visualFor(mount.category,part,componentPaint,armor);
  group.position.set(socket.pos[0],2.09+socket.pos[1],socket.pos[2]);
  if(mount.category==='cab'){
   group.position.y+=.18;
   if(socket.id==='cab-front')group.position.z-=.19;
  }
  if(mount.category==='combat'){
   if(socket.role==='roof')group.position.y+=.15;
  }
  if(mount.category==='support'&&socket.role==='rear')group.rotation.y=Math.PI;
  root.add(group);objects.push({category:mount.category,group,socket:mount.socket});
 }
 return {root,sockets,objects};
}
