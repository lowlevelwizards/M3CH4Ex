/** M3CH4 / Graybox 12 workshop.
 * Separate intentional-form builder. Production combat and detailed lab intact.
 */
import * as THREE from 'three';
import {FRAMES,CATALOG,BY_PART,PAINTS,RECIPES,defaultBuild,validSockets,
 install,addSupport,removeSupport,changeFrame,inspect,recipe,
 loadGraybox,exportGraybox,socketsForFrame} from './grayboxCore.js';
import {buildGrayboxScene} from './grayboxVisual.js';
import {createConstructorYard} from './constructorYard.js';
import {AUDIT_CATEGORIES,buildAuditScene,auditText} from './grayboxAudit.js';
import {HOUSINGS,CARRIERS,STANCES,FEET,DEFAULT_FORM} from './grayboxArchitecture.js';
import {setForm,setLimbPlating} from './grayboxCore.js';
const $=id=>document.getElementById(id);
const STORAGE='m3ch4-graybox-v1';
let model,activeCategory='frame',pending=null,socketVisible=false,paintTarget='all';
let currentTab='parts',auditCategory='frame',auditPart='frame-sr',
 auditLevel=1,auditCompare=false;
try{model=loadGraybox(JSON.parse(localStorage.getItem(STORAGE)||'null'));}
catch{model=defaultBuild();}
const stage=$('gb-viewport'),scene=new THREE.Scene();
scene.background=new THREE.Color('#f4f6f3');
const camera=new THREE.PerspectiveCamera(42,1,.12,180);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x87918a,2.0));
for(const [pos,intensity] of [[[-4,9,-5],2.7],[[5,7,5],1.45]]){
 const light=new THREE.DirectionalLight(0xffffff,intensity);light.position.set(...pos);scene.add(light);
}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),
 new THREE.MeshStandardMaterial({color:'#e5e9e5',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.04;scene.add(floor);
const grid=new THREE.GridHelper(20,20,0xbec6be,0xdde3dc);
grid.position.y=-.035;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
const focus=new THREE.Vector3(0,1.85,0);
let azimuth=-.7,elevation=.24,distance=7.2,body=null,liveSockets=[];
let currentView='quarter',userZoom=false,measuredFit=null;
let yard=null;
function updateCamera(){
 if(yard?.piloting){yard.positionCamera();return;}
 elevation=Math.max(-.30,Math.min(1.45,elevation));
 camera.position.copy(focus).add(new THREE.Vector3(
  Math.sin(azimuth)*Math.cos(elevation)*distance,
  Math.sin(elevation)*distance,
  Math.cos(azimuth)*Math.cos(elevation)*distance
 ));
 camera.lookAt(focus);
}
updateCamera();
function setView(which){
 currentView=which;userZoom=false;
 const poses={quarter:[-.75,.23],front:[0,.08],
  side:[Math.PI/2,.08],top:[-.38,1.4]};
 [azimuth,elevation]=poses[which];framePreview();
}
function framePreview(){
 if(yard?.piloting||!body)return;
 const bounds=new THREE.Box3().setFromObject(body,true);
 if(bounds.isEmpty())return;
 const size=bounds.getSize(new THREE.Vector3());
 focus.copy(bounds.getCenter(new THREE.Vector3()));
 focus.y=Math.max(.7,focus.y);
 const aspect=stage.clientWidth/Math.max(stage.clientHeight,1);
 const vert=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 const h=Math.max(size.y/2,1);
 const w=Math.max(size.x/2,size.z*.41,.85);
 const needed=Math.max(h/vert,w/(vert*Math.max(.68,aspect)));
 if(!userZoom)distance=Math.max(3.6,Math.min(10.2,needed*1.24));
 updateCamera();
}
function status(message,bad=false){
 $('status').textContent=message;$('status').style.color=bad?'#a84f37':'#537965';
}
function save(){
 try{localStorage.setItem(STORAGE,JSON.stringify(exportGraybox(model)));}
 catch(e){status('Local save unavailable: '+e.message,true);}
}
function refreshStage(){
 if(body){scene.remove(body);body.traverse(o=>{
  if(o.geometry)o.geometry.dispose();
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const material of mats){
   if(material?.userData?.grayboxOwned||material?.userData?.finishOrigin)
    material.dispose();
  }
 });}
 const result=currentTab==='audit'?
   buildAuditScene(auditCategory,auditPart,model.paint,auditLevel,auditCompare):
   buildGrayboxScene(model,{socketVisible,
     highlightCategory:pending?.category,highlightPart:pending?.id});
 body=result.root;liveSockets=result.sockets;measuredFit=result.fit||null;
 scene.add(body);
 yard?.setRig(body,result.objects||[],model.installed.combat?.id);
 framePreview();buildAssessment();
}
function button(label,callback,options={}){
 const b=document.createElement('button');b.type='button';
 b.textContent=label;b.addEventListener('click',callback);
 if(options.active)b.classList.add('active');
 if(options.disabled)b.disabled=true;
 if(options.title)b.title=options.title;
 return b;
}
function buildAssessment(){
 const chk=inspect(model),target=$('assessment');
 target.replaceChildren();
 const first=document.createElement('div');
 first.textContent=chk.complete?
  (chk.valid?'5 / 5 READY · '+Math.round(chk.mass)+' / '+chk.capacity+' KG · '+chk.powerDraw+'/'+chk.powerAvailable+' KW':
  '5 / 5 INSTALLED · '+chk.issues.length+' LIMIT'+(chk.issues.length>1?'S':'')):
  'INCOMPLETE · '+chk.issues.length+' ISSUES';
 target.append(first);
 if(chk.issues.length){
  const item=document.createElement('div');item.className='error';
  item.textContent=chk.issues.join(' · ');target.append(item);
 }
 if(measuredFit){
  const line=document.createElement('div');line.className='subnote';
  line.textContent='MEASURED CONTACT '+measuredFit.connected+' / '+measuredFit.checked+
   ' · '+(measuredFit.ok?'MATES NEAR SUPPORT MATERIAL':'PHYSICAL GAPS DETECTED')+
   ' · MESH-BOX CHECK ONLY';
  target.append(line);
  if(measuredFit.issues.length){
   const warning=document.createElement('div');warning.className='error';
   warning.textContent=measuredFit.issues.slice(0,3).join(' · ');
   target.append(warning);
  }
 }
 if(chk.experimental){
  const warning=document.createElement('div');warning.className='subnote';
  warning.textContent=model.installed.mobility?.id==='mobility-quad-gb'?
   'Crawler is a four-point topology prototype; not live locomotion.':
   'Stubber is a compact biped visual prototype; not live locomotion.';
  target.append(warning);
 }
 const state=$('pending');
 state.hidden=!pending;
 if(pending){
  const part=BY_PART.get(pending.id);
  state.textContent='PLACING '+part.name.toUpperCase()+
    ' · TAP A GOLD SOCKET IN THE VIEW OR CHOOSE AN ATTACHMENT BUTTON BELOW';
 }
}
function chooseCategory(category){
 activeCategory=category;pending=null;renderPanels();refreshStage();
}
function renderStations(){
 const root=$('stations');root.replaceChildren();
 const group=document.createElement('div');group.className='station-pills';
 const names={frame:'FRAME',cab:'CAB',combat:'COMBAT',
  mobility:'MOBILITY',power:'POWER',support:'SUPPORT'};
 for(const category of Object.keys(names)){
  group.append(button(names[category],()=>chooseCategory(category),{active:activeCategory===category}));
 }
 root.append(group);
}
function fitSelected(category,id,socket=null){
 let result;
 if(category==='frame')result=changeFrame(model,id);
 else if(category==='support')result=addSupport(model,id,socket);
 else result=install(model,category,id,socket);
 if(!result.ok){status(result.reason,true);return;}
 pending=null;
 if(result.moved?.length||result.removed?.length)
  status('Frame changed · repositioned '+result.moved.join(', ')+
   ' · disconnected '+result.removed.join(', '));
 else status(BY_PART.get(id)?.name+' installed at '+(result.socket||'frame'));
 save();renderPanels();refreshStage();
}
function requestPart(category,id){
 if(category==='frame'){fitSelected(category,id);return;}
 const sockets=validSockets(model,category,id);
 if(!sockets.length){status('No compatible available socket for '+BY_PART.get(id).name,true);return;}
 const current=model.installed[category];
 if(category!=='support'&&current?.id===id&&sockets.some(s=>s.id===current.socket)){
  pending={category,id};
 }else if(sockets.length===1){
  fitSelected(category,id,sockets[0].id);return;
 }else pending={category,id};
 status('Select a compatible mounting socket');
 renderPanels();refreshStage();
}
function renderChoices(){
 const root=$('choices');root.replaceChildren();
 const desc=document.createElement('div');desc.className='family-head';
 const title=document.createElement('strong');
 title.textContent=activeCategory.toUpperCase()+' ASSEMBLIES';
 const count=document.createElement('small');
 count.textContent=CATALOG[activeCategory].length+' reusable options';
 desc.append(title,count);root.append(desc);
 if(activeCategory==='support'){
  const owned=Object.entries(model.support);
  if(owned.length){
   const label=document.createElement('div');label.className='item-title';
   label.textContent='INSTALLED AUXILIARIES';root.append(label);
   for(const [socket,id] of owned){
    const wrap=document.createElement('div');wrap.className='row card';
    const p=document.createElement('span');p.textContent=socket+' · '+BY_PART.get(id).name;
    const remove=button('REMOVE',()=>{
     removeSupport(model,socket);pending=null;save();renderPanels();refreshStage();
    });
    wrap.append(p,remove);root.append(wrap);
   }
  }
 }
 if(pending?.category===activeCategory){
  const panel=document.createElement('div');panel.className='card';
  const label=document.createElement('div');label.className='item-title';
  label.textContent='SELECT MOUNT FOR '+BY_PART.get(pending.id).name;
  panel.append(label);
  const choices=document.createElement('div');choices.className='socket-options';
  for(const socket of validSockets(model,pending.category,pending.id)){
   choices.append(button(socket.label.toUpperCase(),()=>{
    fitSelected(pending.category,pending.id,socket.id);
   }));
  }
  panel.append(choices,button('CANCEL',()=>{pending=null;renderPanels();refreshStage();}));
  root.append(panel);
 }
 for(const p of CATALOG[activeCategory]){
  const current=activeCategory==='frame'?model.frame===p.id:
   activeCategory==='support'?Object.values(model.support).includes(p.id):
   model.installed[activeCategory]?.id===p.id;
  const b=document.createElement('button');
  b.className='part-choice'+(current?' active':'');
  const info=document.createElement('span');
  const name=document.createElement('strong');name.textContent=p.name;
  const detail=document.createElement('small');
  detail.textContent=Math.round(p.mass)+' kg'+
    (p.source==='graybox'?' · CONCEPT':'')+
    (p.experimental?' · NOT LIVE-READY':'')+
    (p.draw?' · '+(p.draw>0?'+':'')+p.draw+' kW':'');
  info.append(name,detail);
  const arrow=document.createElement('span');arrow.textContent=current?'✓':'＋';
  b.append(info,arrow);
  b.addEventListener('click',()=>requestPart(activeCategory,p.id));
  root.append(b);
 }
 if(activeCategory!=='frame'){
  const m=model.installed[activeCategory];
  if(m){
   const field=document.createElement('p');field.className='subnote';
   field.textContent='CURRENT '+m.socket+' · Change position by selecting the same assembly.';
   root.append(field);
  }
 }
}
function renderAppearance(){
 const root=$('appearance');root.replaceChildren();
 const architecture=document.createElement('h3');
 architecture.textContent='CONSTRUCTION ARRANGEMENT';root.append(architecture);
 const note=document.createElement('p');note.className='subnote';
 note.textContent='Change body shape, weapon carrier, stance and foot gear without replacing the five required stations.';
 root.append(note);
 for(const [key,options,label] of [
  ['housing',HOUSINGS,'Body housing'],
  ['carrier',CARRIERS,'Combat mount / arm'],
  ['stance',STANCES,'Frame-to-hip stance'],
  ['feet',FEET,'Ground-contact kit']]){
  const field=document.createElement('label');
  field.className='form-selector';field.textContent=label;
  const picker=document.createElement('select');picker.dataset.form=key;
  for(const opt of options){
   const item=document.createElement('option');item.value=opt.id;item.textContent=opt.name;
   picker.append(item);
  }
  picker.value=model.form?.[key]||DEFAULT_FORM[key];
  picker.addEventListener('change',()=>{
   const result=setForm(model,key,picker.value);
   if(!result.ok){status(result.reason,true);return;}
   save();refreshStage();buildAssessment();
   status(label+' updated · '+options.find(x=>x.id===picker.value)?.name);
  });
  field.append(picker);root.append(field);
 }
 const limbs=document.createElement('h3');limbs.textContent='INDEPENDENT LEG PLATING';
 root.append(limbs);
 for(const side of ['left','right']){
  const line=document.createElement('div');line.className='armor-row';
  const label=document.createElement('strong');label.textContent=side.toUpperCase()+' LEG';
  line.append(label);
  for(const [value,name] of [[0,'BARE'],[1,'THIGH'],[2,'FULL']]){
   line.append(button(name,()=>{
    const response=setLimbPlating(model,side,value);
    if(!response.ok){status(response.reason,true);return;}
    save();renderAppearance();refreshStage();buildAssessment();
   },{active:(model.limbPlating?.[side]||0)===value}));
  }
  root.append(line);
 }
 const h=document.createElement('h3');h.textContent='PROTECTIVE COVERAGE';
 root.append(h);
 for(const cat of ['frame','cab','mobility','combat']){
  const wrap=document.createElement('div');wrap.className='armor-row';
  const label=document.createElement('strong');label.textContent=cat.toUpperCase();
  wrap.append(label);
  for(const [value,name] of [[0,'BARE'],[1,'ARMOR'],[2,'ENCASED']]){
   const b=button(name,()=>{
    model.armor[cat]=value;save();renderPanels();refreshStage();
   },{active:model.armor[cat]===value});
   wrap.append(b);
  }
  root.append(wrap);
 }
 const h2=document.createElement('h3');h2.textContent='ASSEMBLY PAINT';root.append(h2);
 const lab=document.createElement('label');lab.textContent='Paint target';
 const pick=document.createElement('select');
 const targets=[['all','Entire machine'],['frame','Frame'],
  ['cab','Cab'],['mobility','Mobility'],['combat','Combat'],['power','Power'],
  ['leg-left','Left leg plates'],['leg-right','Right leg plates'],
  ...Object.keys(model.support).map(x=>[x,'Auxiliary / '+x])];
 for(const [id,title] of targets){
  const option=document.createElement('option');option.value=id;option.textContent=title;
  pick.append(option);
 }
 if(!targets.some(x=>x[0]===paintTarget))paintTarget='all';
 pick.value=paintTarget;pick.addEventListener('change',()=>{paintTarget=pick.value;renderAppearance();});
 lab.append(pick);root.append(lab);
 const row=document.createElement('div');row.className='socket-options';
 for(const key of ['main','secondary','accent']){
  row.append(button(key.toUpperCase(),()=>{
   root.dataset.channel=key;renderAppearance();
  },{active:(root.dataset.channel||'main')===key}));
 }
 root.append(row);
 const palette=document.createElement('div');palette.className='palette';
 const channel=root.dataset.channel||'main';
 const selected=paintTarget==='all'?model.paint[channel]:
  model.accentByAssembly[paintTarget]||model.paint.main;
 for(const [name,hex] of Object.entries(PAINTS)){
  const b=button('',()=>{
   if(paintTarget==='all')model.paint[channel]=hex;
   else model.accentByAssembly[paintTarget]=hex;
   save();renderAppearance();refreshStage();
  },{active:false,title:name.toUpperCase()});
  b.className='swatch'+(selected===hex?' selected':'');
  b.style.background=hex;b.title=name.toUpperCase();
  b.setAttribute('aria-label',name+' color');
  palette.append(b);
 }
 root.append(palette);
 const footer=document.createElement('p');footer.className='subnote';
 footer.textContent='This workshop previews geometry and mass/power consequences. New carriers, compact mobility and enclosures are not yet live combat hardware.';
 root.append(footer);
}
function renderRecipes(){
 const root=$('recipes');root.replaceChildren();
 const list=document.createElement('div');list.className='recipe-list';
 for(let i=0;i<RECIPES.length;i++){
  const preset=RECIPES[i],b=button('',()=>{
   try{model=recipe(i);pending=null;save();renderPanels();refreshStage();
    status('Loaded reference '+preset.name+' from the shared catalogue');}
   catch(e){status(e.message,true);}
  });
  const name=document.createElement('strong');name.textContent=preset.name;
  const sub=document.createElement('small');sub.textContent='One shared parts catalogue';
  b.append(name,sub);list.append(b);
 }
 root.append(list);
}
function renderAudit(){
 const root=$('audit-controls');root.replaceChildren();
 function picker(label,items,current,onChange){
  const el=document.createElement('label');el.textContent=label;
  const select=document.createElement('select');
  for(const option of items){
   const o=document.createElement('option');o.value=option.id;
   o.textContent=option.name;select.append(o);
  }
  select.value=current;
  select.addEventListener('change',()=>{
   onChange(select.value);renderAudit();refreshStage();
  });
  el.append(select);root.append(el);
 }
 picker('Assembly family',AUDIT_CATEGORIES.map(id=>({
  id,name:id.toUpperCase()})),auditCategory,id=>{
   auditCategory=id;auditPart=CATALOG[id][0].id;
 });
 picker('Individual assembly',CATALOG[auditCategory],
  auditPart,id=>{auditPart=id;});
 if(!auditCompare)picker('Protective coverage',
  [{id:'0',name:'BARE'},{id:'1',name:'ARMORED'},{id:'2',name:'ENCASED'}],
  String(auditLevel),v=>{auditLevel=Number(v);});
 root.append(button(auditCompare?'SHOW SINGLE ASSEMBLY':'COMPARE ALL 3 COVERAGE LEVELS',()=>{
  auditCompare=!auditCompare;renderAudit();refreshStage();
 }));
 $('audit-notes').textContent=auditText(auditCategory,auditPart);
}
function renderPanels(){
 renderStations();renderChoices();renderAppearance();renderRecipes();
 renderAudit();buildAssessment();
}
for(const buttonEl of document.querySelectorAll('.tab')){
 buttonEl.addEventListener('click',()=>{
  for(const b of document.querySelectorAll('.tab'))b.classList.toggle('active',b===buttonEl);
  currentTab=buttonEl.dataset.tab;
  for(const id of ['parts','looks','reference','audit'])
   $(id+'-panel').hidden=currentTab!==id;
  pending=null;refreshStage();buildAssessment();
 });
}
$('socket-toggle').addEventListener('click',()=>{
 socketVisible=!socketVisible;
 $('socket-toggle').setAttribute('aria-pressed',String(socketVisible));
 refreshStage();
});
for(const [id,name] of [['gb-quarter','quarter'],['gb-front','front'],
 ['gb-side','side'],['gb-top','top']]){
 $(id).addEventListener('click',()=>setView(name));
}
$('reset').addEventListener('click',()=>{
 model=defaultBuild();activeCategory='frame';pending=null;save();renderPanels();refreshStage();
 status('Stock graybox rig restored');
});
$('deploy').addEventListener('click',()=>{
 if(currentTab==='audit'){
  document.querySelector('.tab[data-tab="parts"]').click();
 }
 const evaluation=inspect(model);
 if(!evaluation.complete||!evaluation.valid){
  status('Complete a load-rated, powered rig before piloting: '+evaluation.issues.join('; '),true);
  return;
 }
 pending=null;socketVisible=false;
 // Refresh out of the audit and socket-marker views before piloting. This
 // exact same new full-mesh object is then kept while locomoting.
 refreshStage();
 const ready=yard.launch();
 if(!ready){status('The constructed rig did not initialize.',true);return;}
});
$('export').addEventListener('click',()=>{
 try{
  const blob=new Blob([JSON.stringify(exportGraybox(model),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='m3ch4-graybox-v1.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  status('Exported independent graybox v1 blueprint');
 }catch(e){status(e.message,true);}
});
$('import').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';
 if(!file)return;
 try{
  if(file.size>100000)throw Error('Blueprint too large');
  model=loadGraybox(JSON.parse(await file.text()));
  pending=null;save();renderPanels();refreshStage();
  status('Imported and validated graybox blueprint');
 }catch(error){status(error.message,true);}
});
const pickRay=new THREE.Raycaster(),cursor=new THREE.Vector2();
const pointers=new Map();let pinch=null;
function center(){
 const [a,b]=[...pointers.values()];
 return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,spread:Math.hypot(a.x-b.x,a.y-b.y)};
}
stage.addEventListener('pointerdown',e=>{
 if(yard?.piloting||e.target!==renderer.domElement)return;
 stage.setPointerCapture(e.pointerId);
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false});
 if(pointers.size===2)pinch=center();
});
stage.addEventListener('pointermove',e=>{
 if(yard?.piloting)return;
 const p=pointers.get(e.pointerId);if(!p)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 p.x=e.clientX;p.y=e.clientY;
 if(Math.hypot(p.x-p.sx,p.y-p.sy)>7)p.moved=true;
 if(pointers.size===2){
  userZoom=true;
  const now=center();if(pinch)distance=Math.max(3,Math.min(16,
   distance*pinch.spread/Math.max(now.spread,1)));pinch=now;
 }else{
  azimuth-=dx*.009;elevation+=dy*.007;
 }
 updateCamera();
});
stage.addEventListener('pointerup',e=>{
 if(yard?.piloting)return;
 const p=pointers.get(e.pointerId);
 if(p&&!p.moved&&pending&&pointers.size===1){
  const rect=stage.getBoundingClientRect();
  cursor.set((e.clientX-rect.left)/rect.width*2-1,
    -(e.clientY-rect.top)/rect.height*2+1);
  pickRay.setFromCamera(cursor,camera);
  const hits=pickRay.intersectObjects(liveSockets.map(x=>x.mesh),false);
  for(const hit of hits){
   const socket=hit.object.userData.socket;
   if(validSockets(model,pending.category,pending.id).some(x=>x.id===socket)){
    fitSelected(pending.category,pending.id,socket);break;
   }
  }
 }
 pointers.delete(e.pointerId);pinch=pointers.size===2?center():null;
});
stage.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);pinch=null;});
stage.addEventListener('wheel',e=>{
 if(yard?.piloting)return;
 e.preventDefault();userZoom=true;
 distance=Math.min(16,Math.max(3,distance*Math.exp(e.deltaY*.001)));
 updateCamera();
},{passive:false});
function resize(){
 const w=stage.clientWidth,h=stage.clientHeight;
 if(!w||!h)return;
 camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
new ResizeObserver(resize).observe(stage);
yard=createConstructorYard({scene,camera,stage,onMessage:message=>{
 if(!yard?.piloting)status(message);
},onGarage:()=>{userZoom=false;setView('quarter');}});
floor.visible=false;grid.visible=false;
let lastFrame=performance.now();
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000||0));lastFrame=now;
 yard.step(dt,model.installed.mobility?.id);
 renderer.render(scene,camera);
}
renderPanels();refreshStage();resize();requestAnimationFrame(animate);
