/** M3CH4 / GRAYBOX 12 — breadth-first modular combat machine architecture.
 * A light-weight isolated proof layer built on existing catalogue definitions.
 * This is not a replacement for the detailed M3CH4Ex lab or combat save format.
 */
import {BY_ID} from './components.js';
import {HOUSINGS,CARRIERS,STANCES,FEET,DEFAULT_FORM,normalizeForm,fromId} from './grayboxArchitecture.js';
export const GB_VERSION=1;
export const MANDATORY=Object.freeze(['frame','cab','combat','mobility','power']);
const existing=(id,extra={})=>{
 const p=BY_ID.get(id);
 if(!p)throw Error('Missing established M3CH4 component '+id);
 return {id,name:p.name,mass:p.massKg,draw:p.powerKw||0,
  source:'existing',...extra};
};
export const FRAMES=Object.freeze([
 {id:'frame-sr',name:'BRUISER / Broad Industrial',mass:1580,capacity:5900,
  size:[2.04,1.20,1.42],shape:'broad',description:'Tall wide crossmembers with deep internal equipment bay and side trunnions'},
 {id:'frame-utility',name:'SKELETON / Open Utility',mass:1290,capacity:4700,
  size:[1.68,1.24,1.28],shape:'open',description:'Tall exposed cage with dual shoulder rails and open engine bays'},
 {id:'frame-wedge',name:'CRADLE / Compact Tub',mass:1450,capacity:5200,
  size:[1.42,.68,1.24],shape:'wedge',description:'Short understructure with forward and roof cab platforms'},
 {id:'frame-spire-gb',name:'SPAR / Tall Narrow',mass:1160,capacity:4400,
  size:[1.20,1.46,1.14],shape:'tall',description:'Compact vertical carrier; slim weapon and sensor mounts'}
]);
export const CABS=Object.freeze([
 {...existing('cab-utility'),name:'VISTA / Glazed Work Cab',form:'glass',positions:['cab-top','cab-front'],mass:295},
 {...existing('cab-cyclops'),name:'CYCLOPS / Optic Pilot Tub',form:'optic',positions:['cab-top','cab-front']},
 {...existing('cab-armored'),name:'HEARTH / Integrated Cab',form:'armored',positions:['cab-front','cab-top']},
 {id:'cab-bubble-gb',name:'BUBBLE / Rounded Canopy',mass:325,draw:-12,form:'bubble',
  positions:['cab-top','cab-front'],source:'graybox'}
]);
export const MOBILITY=Object.freeze([
 {...existing('legs-compact'),name:'KESTREL / Runner Pair',form:'runner'},
 {...existing('legs-yard'),name:'YARDWALKER / Work Pair',form:'work'},
 {...existing('legs-hauler'),name:'HAULER H2 / Heavy Pair',form:'heavy'},
 {id:'mobility-low-gb',name:'STUBBER / Compact Industrial Pair',mass:1040,draw:-82,
  form:'low',source:'graybox',experimental:true},
 {id:'mobility-quad-gb',name:'CRAWLER / Four-Point Rig',mass:1380,draw:-95,
  form:'quad',source:'graybox',experimental:true}
]);
export const COMBAT=Object.freeze([
 {...existing('gun-short'),name:'STUMP / Compact Cannon',form:'cannon'},
 {...existing('gun-rivet'),name:'RIVET / Rotary Repeater',form:'rotary'},
 {...existing('gun-scatter'),name:'S-6 / Scattergun',form:'scatter'},
 {...existing('gun-rocket'),name:'RACK / Scrap Rockets',form:'rocket'},
 {...existing('gun-cannon'),name:'TRAINING / Long Cannon',form:'long'}
]);
export const POWER=Object.freeze([
 {...existing('power-air'),name:'DRAFT / Compact Generator',form:'light'},
 {...existing('power-dynamo'),name:'DYNAMO / Standard Generator',form:'standard'},
 {...existing('power-forge'),name:'FORGE / Heavy Generator',form:'heavy'}
]);
export const SUPPORT=Object.freeze([
 {id:'support-arm',name:'UTILITY ARM / Service Manipulator',mass:120,draw:-16,form:'arm',roles:['side','roof']},
 {id:'support-arm-light',name:'LIGHT ARM / Slim Carrier + Claw',mass:95,draw:-12,form:'arm-light',roles:['side','roof']},
 {id:'support-arm-heavy',name:'HEAVY ARM / Industrial Carrier',mass:185,draw:-24,form:'arm-heavy',roles:['side','roof']},
 {id:'support-sensor',name:'OPTIC POD / Camera Cluster',mass:48,draw:-8,form:'sensor',roles:['side','roof','rear']},
 {id:'support-shield',name:'SHIELD / Impact Plate',mass:140,draw:0,form:'shield',roles:['side']},
 {id:'support-cooler',name:'COOLER / Exchanger',mass:105,draw:-6,form:'cooler',roles:['side','roof','rear']},
 {id:'support-ammo',name:'MAGAZINE / Reserve Pack',mass:135,draw:0,form:'ammo',roles:['side','rear']},
 {id:'support-light',name:'BEACON / Light Mast',mass:32,draw:-4,form:'light',roles:['roof','rear']}
]);
export const CATALOG=Object.freeze({frame:FRAMES,cab:CABS,combat:COMBAT,mobility:MOBILITY,power:POWER,support:SUPPORT});
export const BY_PART=new Map(Object.values(CATALOG).flat().map(x=>[x.id,x]));
const S=(id,label,station,role,pos,capacity=850,standard='M')=>{
 const normals={under:[0,-1,0],roof:[0,1,0],front:[0,0,-1],
  rear:[0,0,1],core:[0,0,1],left:[-1,0,0],right:[1,0,0]};
 const normal=role==='side'?[pos[0]<0?-1:1,0,0]:normals[role];
 return {id,label,station,role,pos,capacity,standard,
  normal:[...normal],rotation:role==='rear'?[0,Math.PI,0]:[0,0,0]};
};
/** Local frame coordinates, y-up and forward=-z; slot rotation is physical.
 * A station is required; a socket determines where its assembly is installed.
 */
export function socketsForFrame(frameId){
 const frame=FRAMES.find(x=>x.id===frameId);
 if(!frame)throw Error('Unknown frame');
 const [w,h,d]=frame.size;
 const side=w/2+.17,roof=h/2+.12,rear=d/2+.12,nose=-d/2-.09;
 const slots=[
  S('mobility-bottom','Undercarriage','mobility','under',[0,-h/2-.12,0],1900,'H'),
  S('cab-top','Roof cab','cab','roof',[0,roof,-.04],750),
  S('cab-front','Forward cab','cab','front',[0,.12,nose],750),
  S('power-rear','Rear engine','power','rear',[0,.10,rear],850),
  S('power-inner','Internal core','power','core',[0,0,.15],850),
  S('combat-right','Right weapon','combat','right',[side,.02,-.24],850),
  S('combat-left','Left weapon','combat','left',[-side,.02,-.24],850),
  S('combat-top','High weapon','combat','roof',[w*.24,roof+.07,-.20],850),
  S('support-left','Left auxiliary','support','side',[-side,-.20,.30],330),
  S('support-right','Right auxiliary','support','side',[side,-.20,.30],330),
  S('support-roof','Roof auxiliary','support','roof',[-w*.25,roof+.16,.23],200),
  S('support-rear','Rear auxiliary','support','rear',[-w*.28,.12,rear+.06],240)
 ];
 const allowed={
  'frame-sr':slots.map(x=>x.id),
  'frame-utility':slots.map(x=>x.id).filter(x=>!['power-inner'].includes(x)),
  'frame-wedge':slots.map(x=>x.id),
  'frame-spire-gb':slots.map(x=>x.id).filter(x=>!['power-inner'].includes(x))
 };
 return slots.filter(x=>allowed[frameId].includes(x.id));
}
/** Child sockets belong to installed assemblies, not just the central frame.
 * They keep the same typed load/role vocabulary as frame ports.
 */
export function socketsForBuild(state){
 const sockets=socketsForFrame(state.frame);
 if(state.installed?.cab)
  sockets.push({...S('cab-accessory-top','Cab equipment rail','support','roof',
    [0,.48,0],95),parent:'cab',parentSocket:state.installed.cab.socket});
 if(state.installed?.combat)
  sockets.push({...S('weapon-shield','Weapon carrier protection','support','side',
    [.25,0,-.20],175),parent:'combat',parentSocket:state.installed.combat.socket});
 return sockets;
}
function categoryPart(category,id){return CATALOG[category]?.find(x=>x.id===id)||null;}
export function fits(part,socket){
 if(!part||!socket)return false;
 if(socket.station==='cab'&&part.positions&&!part.positions.includes(socket.id))return false;
 if(socket.station==='support'&&(!part.roles||!part.roles.includes(socket.role)))return false;
 if(socket.station!=='support'&&socket.station!==part.station&&socket.station==='mobility')
   return socket.standard==='H';
 return true;
}
function used(state,socket,except){
 return Object.entries(state.installed).some(([category,m])=>category!==except&&m?.socket===socket) ||
   Boolean(state.support[socket]);
}
export function validSockets(state,category,id){
 const part=categoryPart(category,id);
 if(!part)return [];
 return socketsForBuild(state).filter(s=>s.station===category&&
  s.capacity>=part.mass&&fits(part,s)&&!used(state,s.id,category));
}
export function defaultBuild(){
 const state={version:GB_VERSION,name:'YARD SHOP / 01',frame:'frame-sr',
  installed:{cab:null,combat:null,mobility:null,power:null},
  support:{},armor:{frame:1,cab:1,mobility:1,combat:0},
  paint:{main:'#938b5e',secondary:'#475c56',accent:'#d69b4f'},
  accentByAssembly:{},form:{...DEFAULT_FORM},
  limbPlating:{left:0,right:0}};
 for(const [category,id,preferred] of [
  ['cab','cab-utility','cab-top'],['combat','gun-short','combat-right'],
  ['mobility','legs-yard','mobility-bottom'],['power','power-dynamo','power-rear']]){
   const r=install(state,category,id,preferred);if(!r.ok)throw Error(r.reason);
 }
 return state;
}
export function emptyBuild(frame='frame-sr'){
 if(!FRAMES.some(x=>x.id===frame))throw Error('Invalid frame');
 return {version:GB_VERSION,name:'UNTITLED RIG',frame,
  installed:{cab:null,combat:null,mobility:null,power:null},
  support:{},armor:{frame:0,cab:0,mobility:0,combat:0},
  paint:{main:'#938b5e',secondary:'#475c56',accent:'#d69b4f'},
  accentByAssembly:{},form:{...DEFAULT_FORM},
  limbPlating:{left:0,right:0}};
}
export function setLimbPlating(state,side,level){
 if(!['left','right'].includes(side)||!Number.isInteger(level)||level<0||level>2)
  return {ok:false,reason:'Invalid independent limb armor'};
 state.limbPlating={left:0,right:0,...state.limbPlating,[side]:level};
 return {ok:true};
}
export function setForm(state,key,id){
 if(!['housing','carrier','stance','feet'].includes(key))
  return {ok:false,reason:'Unknown architectural selection'};
 try{const update=normalizeForm({...state.form,[key]:id});
  state.form=update;return {ok:true};}
 catch(e){return {ok:false,reason:e.message};}
}
export function install(state,category,id,socketId=null){
 if(category==='frame')return changeFrame(state,id);
 if(category==='support')return addSupport(state,id,socketId);
 const part=categoryPart(category,id);
 if(!part||!['cab','combat','mobility','power'].includes(category))
  return {ok:false,reason:'Unknown required assembly'};
 const compatible=validSockets(state,category,id);
 const socket=socketId||compatible[0]?.id;
 if(!compatible.some(s=>s.id===socket))return {ok:false,reason:'No compatible unoccupied socket or capacity for '+part.name};
 state.installed[category]={id,socket};
 return {ok:true,socket};
}
export function addSupport(state,id,socket){
 const p=categoryPart('support',id),s=validSockets(state,'support',id);
 if(!p||!s.some(x=>x.id===socket))return {ok:false,reason:'This support does not fit an available auxiliary socket'};
 state.support[socket]=id;return {ok:true,socket};
}
export function removeSupport(state,socket){
 if(!state.support[socket])return {ok:false,reason:'No support at socket'};
 delete state.support[socket];return {ok:true};
}
export function changeFrame(state,id){
 if(!FRAMES.some(x=>x.id===id))return {ok:false,reason:'Unknown structural frame'};
 const snapshot=structuredClone(state),prior=snapshot.frame;
 state.frame=id;state.support={};
 const moved=[],removed=[];
 for(const category of ['cab','combat','mobility','power']){
  const p=snapshot.installed[category];state.installed[category]=null;
  if(!p)continue;
  let sockets=validSockets(state,category,p.id);
  const choice=sockets.find(x=>x.id===p.socket)||sockets[0];
  if(choice){state.installed[category]={id:p.id,socket:choice.id};
   if(choice.id!==p.socket)moved.push(category);
  }else removed.push(category);
 }
 for(const [socket,id] of Object.entries(snapshot.support)){
  if(validSockets(state,'support',id).some(s=>s.id===socket))state.support[socket]=id;
  else removed.push('support at '+socket);
 }
 return {ok:true,previous:prior,moved,removed};
}
export function inspect(state){
 const frame=FRAMES.find(x=>x.id===state.frame);
 if(!frame)return {valid:false,issues:['Invalid frame']};
 const issues=[],all=[frame],occupied=new Set();
 for(const category of ['cab','combat','mobility','power']){
  const mounted=state.installed[category];
  if(!mounted){issues.push('Missing '+category.toUpperCase());continue;}
  const p=categoryPart(category,mounted.id),s=socketsForBuild(state).find(s=>s.id===mounted.socket);
  if(!p||!s||s.station!==category||!fits(p,s)||p.mass>s.capacity||occupied.has(s.id))
   issues.push('Invalid '+category+' socket or mount capacity');
  else occupied.add(s.id);
  if(p)all.push(p);
 }
 for(const [socket,id] of Object.entries(state.support)){
  const p=categoryPart('support',id),s=socketsForBuild(state).find(s=>s.id===socket);
  if(!p||!s||s.station!=='support'||!fits(p,s)||p.mass>s.capacity||occupied.has(socket))
   issues.push('Invalid auxiliary mount at '+socket);
  else occupied.add(socket);
  if(p)all.push(p);
 }
 const baseMass=all.reduce((sum,x)=>sum+x.mass,0);
 const armorMass=Object.values(state.armor).reduce((n,level)=>n+Number(level)*80,0);
 const form=normalizeForm(state.form);
 const housing=fromId(HOUSINGS,form.housing),carrier=fromId(CARRIERS,form.carrier);
 const sidePlates=state.limbPlating||{left:0,right:0};
 const sideMass=(sidePlates.left+sidePlates.right)*35;
 const totalMass=baseMass+armorMass+housing.mass+carrier.mass+sideMass;
 const available=all.find(x=>POWER.includes(x))?.draw||0;
 // Arm actuators are not drawing continuously in a static workshop pose.
 // Record peak motion draw separately; never pretend a pose preview drives a servo.
 const consumption=-all.filter(x=>x.draw<0).reduce((n,x)=>n+x.draw,0);
 const carrierPeakKw=-carrier.draw;
 if(totalMass>frame.capacity)issues.push('FRAME OVERLOAD: '+Math.round(totalMass-frame.capacity)+' kg');
 if(available<consumption)issues.push('POWER SHORTFALL: '+(consumption-available)+' kW');
 const experimental=['mobility-quad-gb','mobility-low-gb'].includes(state.installed.mobility?.id);
 return {valid:issues.length===0,issues,mass:totalMass,capacity:frame.capacity,
  powerAvailable:available,powerDraw:consumption,carrierPeakKw,
  experimental,complete:MANDATORY.every(k=>k==='frame'||!!state.installed[k])};
}
export const PAINTS=Object.freeze({
 ochre:'#938b5e',teal:'#475c56',mustard:'#d6a23c',charcoal:'#414a4d',
 cream:'#c9c2a6',rust:'#995638',safety:'#df8533',slate:'#707a81',
 blue:'#5d7b96',white:'#d7d5c9',black:'#292b2b',red:'#a84735'
});
const variants=[
 ['01 / YELLOW UTILITY','frame-utility','cab-utility','legs-compact','gun-short','power-air','combat-right',[['support-left','support-arm'],['support-roof','support-sensor']],'mustard','teal'],
 ['02 / GRAY GUNFIGHTER','frame-sr','cab-utility','legs-hauler','gun-rivet','power-forge','combat-left',[['support-right','support-arm'],['support-roof','support-ammo']],'slate','charcoal'],
 ['03 / CANOPY ASSAULT','frame-wedge','cab-bubble-gb','mobility-low-gb','gun-scatter','power-dynamo','combat-right',[['support-left','support-shield']],'slate','mustard'],
 ['04 / ORANGE SERVICE','frame-utility','cab-cyclops','legs-yard','gun-short','power-dynamo','combat-right',[['support-left','support-arm'],['support-roof','support-light']],'safety','rust'],
 ['05 / ROUNDED INDUSTRIAL','frame-spire-gb','cab-armored','legs-yard','gun-scatter','power-dynamo','combat-top',[['support-right','support-sensor']],'mustard','charcoal'],
 ['06 / WALKING CANNON','frame-wedge','cab-armored','mobility-low-gb','gun-cannon','power-forge','combat-top',[['support-right','support-shield']],'cream','slate'],
 ['07 / MAINTENANCE WALKER','frame-sr','cab-cyclops','legs-yard','gun-short','power-dynamo','combat-right',[['support-left','support-arm'],['support-rear','support-cooler']],'cream','safety'],
 ['08 / COMPACT SCOUT','frame-wedge','cab-cyclops','mobility-low-gb','gun-short','power-air','combat-right',[['support-right','support-sensor']],'white','rust'],
 ['09 / SCRAPYARD DERBY','frame-sr','cab-armored','legs-yard','gun-rivet','power-forge','combat-left',[['support-right','support-shield'],['support-rear','support-ammo']],'slate','red'],
 ['10 / WORKING CLASS','frame-utility','cab-cyclops','legs-yard','gun-scatter','power-dynamo','combat-right',[['support-left','support-arm'],['support-roof','support-cooler']],'rust','cream']
];
export const RECIPES=variants.map(v=>({id:v[0].slice(0,2),name:v[0]}));
export function recipe(index){
 const data=variants[index];if(!data)throw Error('Unknown recipe');
 const [name,frame,cab,mobility,combat,power,weaponSocket,support,primary,secondary]=data;
 const s=emptyBuild(frame);s.name=name;
 for(const [type,id,preferred] of [
  ['cab',cab,null],['mobility',mobility,null],['power',power,null],['combat',combat,weaponSocket]]){
  const attempt=install(s,type,id,preferred);
  if(!attempt.ok){const fallback=install(s,type,id);if(!fallback.ok)throw Error(name+': '+fallback.reason);}
 }
 for(const [socket,id] of support){
  let valid=validSockets(s,'support',id),choose=valid.find(x=>x.id===socket)||valid[0];
  if(choose)addSupport(s,id,choose.id);
 }
 // Authored protection tradeoffs: compact and overloaded frames deliberately
 // expose structure rather than silently ignoring frame capacity constraints.
 const coverage=[
  [1,2,1,0],[1,2,1,0],[1,2,1,0],[0,2,1,0],[0,2,1,0],
  [0,1,1,0],[1,2,1,0],[1,2,1,0],[1,2,1,0],[0,1,0,0]
 ][index];
 s.armor=Object.fromEntries(['frame','cab','mobility','combat'].map((k,i)=>[k,coverage[i]]));
 s.paint.main=PAINTS[primary];s.paint.secondary=PAINTS[secondary];
 s.paint.accent=PAINTS.mustard;
 // Reference *recipes* configure real reusable assembly categories, not
 // custom geometry. Players can swap every selected element independently.
 const forms=[
  ['angular','short','low','claw'],
  ['angular','heavy','normal','skid'],
  ['none','heavy','low','claw'],
  ['angular','short','normal','stock'],
  ['rounded','direct','low','stock'],
  ['none','offset','low','skid'],
  ['angular','short','normal','skid'],
  ['none','short','low','claw'],
  ['drum','short','normal','stock'],
  ['angular','heavy','normal','stock']
 ][index];
 s.form=normalizeForm(Object.fromEntries(
  ['housing','carrier','stance','feet'].map((key,i)=>[key,forms[i]])));
 return s;
}
export function loadGraybox(input){
 if(!input||typeof input!=='object'||input.version!==GB_VERSION)
   throw Error('Not a compatible M3CH4 Graybox v1 file');
 const x=emptyBuild(input.frame);
 x.name=String(input.name||'CUSTOM RIG').slice(0,50);
 for(const category of ['cab','combat','mobility','power']){
  const mount=input.installed?.[category];
  if(mount!=null){const r=install(x,category,mount.id,mount.socket);
   if(!r.ok)throw Error('Invalid '+category+': '+r.reason);}
 }
 for(const [socket,id] of Object.entries(input.support||{})){
  const r=addSupport(x,id,socket);if(!r.ok)throw Error(r.reason);
 }
 for(const key of ['frame','cab','mobility','combat']){
  const value=input.armor?.[key];
  if(!Number.isInteger(value)||value<0||value>2)throw Error('Invalid armor '+key);
  x.armor[key]=value;
 }
 for(const key of ['main','secondary','accent']){
  if(!/^#[0-9a-f]{6}$/i.test(input.paint?.[key]))throw Error('Invalid paint '+key);
  x.paint[key]=input.paint[key];
 }
 x.form=normalizeForm(input.form);
 for(const side of ['left','right']){
  const value=input.limbPlating?.[side]??0;
  if(!Number.isInteger(value)||value<0||value>2)throw Error('Invalid '+side+' limb plating');
  x.limbPlating[side]=value;
 }
 x.accentByAssembly={};
 for(const [key,value] of Object.entries(input.accentByAssembly||{})){
  if(!['frame','cab','combat','mobility','power','leg-left','leg-right'].includes(key)&&
     !socketsForBuild(x).some(s=>s.id===key))throw Error('Unknown paint target');
  if(!/^#[0-9a-f]{6}$/i.test(value))throw Error('Invalid subassembly color');
  x.accentByAssembly[key]=value;
 }
 return x;
}
export function exportGraybox(state){return structuredClone(loadGraybox(state));}
