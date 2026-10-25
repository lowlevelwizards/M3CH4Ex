/** M3CH4 / Graybox 12 workshop.
 * Separate intentional-form builder. Production combat and detailed lab intact.
 */
import * as THREE from 'three';
import {FRAMES,CATALOG,BY_PART,PAINTS,RECIPES,defaultBuild,validSockets,
 install,addSupport,removeSupport,changeFrame,inspect,recipe,
 loadGraybox,exportGraybox,socketsForFrame} from './grayboxCore.js';
import {buildGrayboxScene} from './grayboxVisual.js';
const $=id=>document.getElementById(id);
const STORAGE='m3ch4-graybox-v1';
let model,activeCategory='frame',pending=null,socketVisible=false,paintTarget='all';
try{model=loadGraybox(JSON.parse(localStorage.getItem(STORAGE)||'null'));}
catch{model=defaultBuild();}
const stage=$('gb-viewport'),scene=new THREE.Scene();
scene.background=new THREE.Color('#f4f6f3');
const camera=new THREE.PerspectiveCamera(42,1,.08,75);
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
function updateCamera(){
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
 const poses={quarter:[-.75,.23,7.6],front:[0,.08,7.5],
  side:[Math.PI/2,.08,7.9],top:[-.38,1.4,7.9]};
 [azimuth,elevation,distance]=poses[which];updateCamera();
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
  if(o.material&&!Array.isArray(o.material)&&o.material.userData?.localDispose)o.material.dispose();
 });}
 const result=buildGrayboxScene(model,{socketVisible,
   highlightCategory:pending?.category,highlightPart:pending?.id});
 body=result.root;liveSockets=result.sockets;
 scene.add(body);
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
 if(chk.experimental){
  const warning=document.createElement('div');warning.className='subnote';
  warning.textContent='Crawler is a graybox topology prototype; not integrated into live locomotion.';
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
 const h=document.createElement('h3');h.textContent='PROTECTIVE COVERAGE';
 root.append(h);
 for(const cat of ['frame','cab','mobility','combat']){
  const wrap=document.createElement('div');wrap.className='armor-row';
  const label=document.createElement('strong');label.textContent=cat.toUpperCase();
  wrap.append(label);
  for(const [value,name] of [[0,'BARE'],[1,'LIGHT'],[2,'FULL']]){
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
 const note=document.createElement('p');note.className='subnote';
 note.textContent='Same mechanical assemblies can have different protective coverage, surface finishes and accents.';
 root.append(note);
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
function renderPanels(){
 renderStations();renderChoices();renderAppearance();renderRecipes();buildAssessment();
}
for(const buttonEl of document.querySelectorAll('.tab')){
 buttonEl.addEventListener('click',()=>{
  for(const b of document.querySelectorAll('.tab'))b.classList.toggle('active',b===buttonEl);
  for(const id of ['parts','looks','reference'])
   $(id+'-panel').hidden=buttonEl.dataset.tab!==id;
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
 if(e.target!==renderer.domElement)return;
 stage.setPointerCapture(e.pointerId);
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false});
 if(pointers.size===2)pinch=center();
});
stage.addEventListener('pointermove',e=>{
 const p=pointers.get(e.pointerId);if(!p)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 p.x=e.clientX;p.y=e.clientY;
 if(Math.hypot(p.x-p.sx,p.y-p.sy)>7)p.moved=true;
 if(pointers.size===2){
  const now=center();if(pinch)distance=Math.max(3,Math.min(16,
   distance*pinch.spread/Math.max(now.spread,1)));pinch=now;
 }else{
  azimuth-=dx*.009;elevation+=dy*.007;
 }
 updateCamera();
});
stage.addEventListener('pointerup',e=>{
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
 e.preventDefault();distance=Math.min(16,Math.max(3,distance*Math.exp(e.deltaY*.001)));
 updateCamera();
},{passive:false});
function resize(){
 const w=stage.clientWidth,h=stage.clientHeight;
 if(!w||!h)return;
 camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
new ResizeObserver(resize).observe(stage);
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}
renderPanels();refreshStage();resize();animate();
