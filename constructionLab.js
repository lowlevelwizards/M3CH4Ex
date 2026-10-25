/** M3CH4 white-room construction laboratory. Stage 08:
 * Real mechanical single-axis hinges, two-ended actuators and pose inspection.
 * Controlled kinematics only; not dynamics, balance or gait locomotion.
 */
import * as THREE from 'three';
import { CATALOG, BY_ID, SLOT_CENTERS, graphWorldPoses } from './components.js';
import { SHARED_PART_IDS, buildPartVisual } from './partVisuals.js';
import { buildFitFixture } from './chassisFitVisuals.js';
import { fitFixtureFor } from './chassisFitFixtures.js';
import { rotatedY } from './assemblyGraph.js';
import { extractYardwalkerLeg, extractYardwalkerAnatomy, buildRookSparShin, buildPylonExtendedShin } from './yardwalkerVisual.js';
import {ARTICULATION_SIDES,ARTICULATION_JOINTS,JOINT_LIMITS,PRESET_NAMES,articulationReport} from './constructionArticulation.js';
import {applyArticulatedModels,createActiveActuator,updateActiveActuator,coarseClearanceHints} from './constructionArticulationVisual.js';
import {
  createLabMachine, labInspection, labEquip, labSetGeneratorMount, labBlueprint,
  loadLabBlueprint, labNodeList, labLegAction, labLegDetails,
  labSectionAction, labSectionDetails, labStowed,
  labJointAction,labPosePreset,labPose,
  labGrounding,labAssistedPreset,labGuidedWalkFrame,labReturnManual,
  labViability,labMotionEnvelope,LAB_SLOTS
} from './constructionLabCore.js';

const $=id=>document.getElementById(id);
const stage=$('viewport'), slots=$('slots'), catalog=$('catalog'), tree=$('tree');
const status=$('verdict'), inspect=$('inspection'), stats=$('stats');
const socketToggle=$('socket-toggle'), gridToggle=$('grid-toggle'),explode=$('explode');
const slotLabels={structure:'FRAME',mobility:'MOBILITY',power:'POWER',command:'CAB',combat:'WEAPON'};
let machine=createLabMachine(), selectedSlot='structure', selectedSerial=machine.installed.structure;
let selectedSocket=null;
let currentTab='catalog', isolate=false, rayTargets=[], sockets=[],partRoots=new Map(), nodeWorldPoses=new Map();
let actuators=[],poseAnimation=null,animationToken=0,neutralGroupY=0;
let clearance={warnings:[],status:'Not yet checked'};
const viewMap={quarter:[2.42,.22],front:[Math.PI,.08],side:[Math.PI/2,.10],top:[Math.PI,1.47]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let azimuth=viewMap.quarter[0], elevation=viewMap.quarter[1], distance=8;
const focus=new THREE.Vector3(0,1.75,0);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
renderer.setClearColor(0xfafbf9);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
renderer.shadowMap.enabled=false;
stage.append(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xfafbf9);
scene.add(new THREE.HemisphereLight(0xffffff,0xc5cbc4,2.4));
const key=new THREE.DirectionalLight(0xffffff,3.15);key.position.set(-4,8,-5);scene.add(key);
const fill=new THREE.DirectionalLight(0xe1e8e5,1.25);fill.position.set(6,4,2);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.96,metalness:0}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.035;scene.add(floor);
const grid=new THREE.GridHelper(30,60,0xd8dfd9,0xecf0eb);grid.position.y=-.025;grid.visible=false;scene.add(grid);
const guideMat=new THREE.MeshBasicMaterial({color:0x336c66,depthTest:true});
const usedMat=new THREE.MeshBasicMaterial({color:0xd89d57,depthTest:true});
const partGroup=new THREE.Group();scene.add(partGroup);
const markerGroup=new THREE.Group();scene.add(markerGroup);
const outline=new THREE.BoxHelper(new THREE.Object3D(),0x267c79);outline.visible=false;scene.add(outline);
const camera=new THREE.PerspectiveCamera(38,1,.06,160);
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
function setMessage(message,error=false){status.textContent=message;status.classList.toggle('error',error)}
function button(label,click,extra=''){
  const el=document.createElement('button');el.type='button';el.textContent=label;
  if(extra)el.className=extra;el.addEventListener('click',click);return el;
}
function renderSlots(){
  slots.replaceChildren();
  LAB_SLOTS.forEach(slot=>{
    const b=button(slotLabels[slot],()=>{selectedSlot=slot;renderSlots();renderCatalog();});
    b.setAttribute('aria-pressed',String(selectedSlot===slot));slots.append(b);
  });
}
function renderCatalog(){
  catalog.replaceChildren();
  const installed=machine.owned.find(p=>p.serial===machine.installed[selectedSlot])?.definitionId;
  CATALOG.filter(p=>p.slot===selectedSlot).forEach(def=>{
    const real=SHARED_PART_IDS.includes(def.id)||['power-dynamo'].includes(def.id);
    const entry=button('',()=>{
      const result=labEquip(machine,selectedSlot,def.id);
      if(!result.ok){setMessage(result.reason,true);return;}
      selectedSerial=machine.installed[selectedSlot];selectedSocket=null;
      rebuild(true);setMessage('Installed '+def.name);
    },'catalog-entry');
    if(def.id===installed)entry.classList.add('active');
    const text=document.createElement('span'),name=document.createElement('strong'),meta=document.createElement('small');
    name.textContent=def.name;meta.textContent=def.massKg+' kg · '+(def.mountSize||'FRAME')+(real?'':' · ENVELOPE PREVIEW');
    text.append(name,meta);const indicator=document.createElement('b');
    indicator.textContent=def.id===installed?'FITTED':'+ FIT';entry.append(text,indicator);catalog.append(entry);
  });
  if(selectedSlot==='mobility'){
    const workbench=document.createElement('section');workbench.className='card';
    const title=document.createElement('h2');title.textContent='STAGE 08E / VARIABLE GEOMETRY';
    workbench.append(title);
    const note=document.createElement('p');note.className='meta';
    note.textContent=installed==='legs-yard'
      ?'Shin variants now have independent knee-to-ankle lengths. Try one extended Pylon L1 leg, then inspect the stance and reach report.'
      :'Serviceable anatomy is authored for Yardwalker only. Choose Yardwalker above to test.';
    workbench.append(note);
    for(const leg of labLegDetails(machine)){
      const b=button(leg.side.toUpperCase()+' · '+(leg.installed?'DETACH':'INSTALL'),
        ()=>doLegAction(leg.side,leg.installed?'detach':'attach'));
      b.disabled=installed!=='legs-yard';
      b.style.width='100%';b.style.marginBottom='6px';workbench.append(b);
      const check=labSectionDetails(machine).find(x=>x.side===leg.side);
      if(leg.installed&&check){
        const shin=check.sections.shin;
        const variants=[['original','YARDWALKER'],['rook','ROOK S2'],['extended','PYLON L1 · +160 MM']];
        const div=document.createElement('p');div.className='meta';
        div.textContent=leg.side.toUpperCase()+' / ACTIVE '+(shin.variant||'UNINSTALLED').toUpperCase();
        workbench.append(div);
        for(const [variant,label] of variants){
          const t=button((shin.variant===variant?'✓ ':'')+label,()=>{
            if(shin.variant===variant)return;
            doSectionAction(leg.side,'shin',shin.installed?'swap':'attach',{variant});
          });
          t.disabled=shin.variant===variant;
          t.style.marginRight='5px';t.style.marginBottom='7px';workbench.append(t);
        }
      }
    }
    catalog.prepend(workbench);
  }
}
function own(serial){return machine.owned.find(p=>p.serial===serial);}
function showTree(){
  tree.replaceChildren();
  labNodeList(machine).forEach(node=>{
    const row=button('',()=>{
      selectedSerial=node.serial;selectedSocket=null;refreshSelection();showTree();renderInspection();switchTab('inspect');
    },'tree-row tree-depth-'+Math.min(2,node.depth));
    row.setAttribute('aria-pressed',String(selectedSerial===node.serial));
    const content=document.createElement('span');content.className='tree-label';
    const nm=document.createElement('strong'),sub=document.createElement('small');
    nm.textContent=node.name;
    sub.textContent=node.serial+(node.parentSocket?' · '+node.parentSocket:' · ROOT')+(node.virtual?' · ADAPTER':'');
    content.append(nm,sub);row.append(content);tree.append(row);
  });
  // Detached owned legs remain visible and recoverable in the laboratory tray.
  const detached=labLegDetails(machine).filter(leg=>!leg.installed);
  if(detached.length){
    const tray=document.createElement('section');tray.className='card';
    const h=document.createElement('h2');h.textContent='DETACHED LEG TRAY';tray.append(h);
    for(const leg of detached){
      const b=button(leg.side.toUpperCase()+' LEG · INSTALL ON '+leg.socket.toUpperCase(),
        ()=>doLegAction(leg.side,'attach'));
      b.style.width='100%';b.style.marginBottom='5px';tray.append(b);
    }
    tree.append(tray);
  }
  const stored=labStowed(machine);
  if(stored.length){
    const tray=document.createElement('section');tray.className='card';
    const heading=document.createElement('h2');heading.textContent='OWNED / PARKED ASSEMBLIES';
    tray.append(heading);
    for(const entry of stored){
      const p=document.createElement('p');p.className='meta';
      p.textContent=entry.name+' · '+entry.serial+
        (entry.descendants?' · '+entry.descendants+' supported parts':'');
      tray.append(p);
      const part=own(entry.serial),def=BY_ID.get(part?.definitionId);
      if(def?.assemblyRole==='anatomy'){
        const active=labSectionDetails(machine).find(x=>x.side===def.side)?.sections?.[def.section];
        const replacing=def.section==='shin'&&active?.installed;
        const select=button((replacing?'SWAP TO ':'INSTALL ')+
          (def.variant==='rook'?'ROOK S2 ':def.section.toUpperCase()+' ')+
          '· '+def.side.toUpperCase(),
          ()=>doSectionAction(def.side,def.section,replacing?'swap':'attach',{variant:def.variant}));
        select.style.width='100%';select.style.marginBottom='5px';tray.append(select);
      }else if(def?.assemblyRole==='leg'){
        const select=button('REINSTALL '+def.side.toUpperCase()+' LEG',
          ()=>doLegAction(def.side,'attach'));
        select.style.width='100%';select.style.marginBottom='5px';tray.append(select);
      }
    }
    tree.append(tray);
  }
  const mount=$('mount-control');mount.replaceChildren();
  const power=machine.installed.power && own(machine.installed.power);
  if(power){
    const card=document.createElement('section');card.className='card';
    const title=document.createElement('h2');title.textContent='PHYSICAL GENERATOR MOUNT';
    const help=document.createElement('p');help.className='meta';
    help.textContent='Existing graph-backed mount experiment: direct rear station or +85 kg left outrigger.';
    card.append(title,help);
    for(const [id,label] of [['standard','REAR / DIRECT'],['offset','LEFT / OUTRIGGER']]){
      const b=button(label,()=>{
        const r=labSetGeneratorMount(machine,id);
        if(!r.ok){setMessage(r.reason,true);return;}
        rebuild(false);setMessage(id==='offset'?'Outrigger installed':'Direct mount restored');
      });
      b.style.marginRight='5px';card.append(b);
    }mount.append(card);
  }
}
function doLegAction(side,action){
  const result=labLegAction(machine,side,action);
  if(!result.ok){setMessage(result.reason,true);return;}
  const leg=labLegDetails(machine).find(l=>l.side===side);
  selectedSerial=action==='detach'?machine.installed.mobility:leg.serial;
  selectedSocket=action==='detach'
    ?{parentSerial:machine.installed.mobility,socketId:leg.socket}:null;
  rebuild(false);switchTab('inspect');
  setMessage('Yardwalker '+side+' leg '+(action==='attach'?'installed':'detached')+
    ' · original geometry and serial retained.');
}
function doSectionAction(side,section,action,options={}){
  const previous=labSectionDetails(machine).find(x=>x.side===side);
  const priorSerial=previous?.sections?.[section]?.serial;
  const result=labSectionAction(machine,side,section,action,options);
  if(!result.ok){setMessage(result.reason,true);return;}
  const current=labSectionDetails(machine).find(x=>x.side===side);
  if(action==='detach'){
    const i=['hip','thigh','knee','shin','ankle','foot'].indexOf(section);
    selectedSerial=current?.sections?.[['hip','thigh','knee','shin','ankle','foot'][i-1]]?.serial||
      current?.legSerial||machine.installed.mobility;
    selectedSocket=null;
  }else{
    selectedSerial=current?.sections?.[section]?.serial||machine.installed.mobility;
    selectedSocket=null;
  }
  rebuild(false);switchTab('inspect');
  setMessage(side+' '+section+' '+(action==='swap'?'replaced':
    action==='detach'?'removed to owned tray':'installed')+' · assembly graph validated.');
}
function renderInspection(){
  inspect.replaceChildren();
  const node=labNodeList(machine).find(n=>n.serial===selectedSerial);
  const selectedLeg=labLegDetails(machine).find(l=>l.serial===selectedSerial);
  const selectedDef=node&&BY_ID.get(node.definitionId);
  const selectedSection=selectedDef?.assemblyRole==='anatomy'?selectedDef:null;
  const card=document.createElement('section');card.className='card';
  const heading=document.createElement('h2');
  heading.textContent=node?.name||(selectedLeg?'Yardwalker '+selectedLeg.side+' leg · DETACHED':'SELECT A PART');
  card.append(heading);
  if(node){
    const def=BY_ID.get(node.definitionId);
    const data=[
      ['Identity',node.serial],
      ['Type',def?.slot?.toUpperCase()||'STRUCTURAL ADAPTER'],
      ['Attached to',node.parentSerial||'ROOT'],
      ['Socket',node.parentSocket||'—'],
      ['Mount',def?.mountSize||'—'],
      ['Mass',def?.id==='legs-yard'
        ?'240 kg carriage + '+labInspection(machine).mobility.legs+' modular leg(s)'
        :(def?def.massKg+' kg':'—')],
      ['Condition',own(node.serial)?Math.round((own(node.serial).condition||0)*100)+'%':'Structural adapter']
    ];
    data.forEach(([title,value])=>{
      const line=document.createElement('div');line.className='metric';
      const a=document.createElement('span'),b=document.createElement('strong');
      a.textContent=title;b.textContent=value;line.append(a,b);card.append(line);
    });
    const description=document.createElement('p');description.className='meta';
    description.textContent=def?.description||'Adapter defined in the shared structural graph.';
    card.append(description);
    if(def&&!SHARED_PART_IDS.includes(def.id)&&def.id!=='power-dynamo'&&
       !['leg','anatomy'].includes(def.assemblyRole)){
      const note=document.createElement('p');note.className='meta';
      note.textContent='The shared standalone visual registry has not yet migrated this mesh. A labeled envelope placeholder is displayed.';
      card.append(note);
    }
  }
  if(selectedLeg){
    const action=selectedLeg.installed?'detach':'attach';
    const b=button(action==='detach'?'DETACH '+selectedLeg.side.toUpperCase()+' LEG':
      'REINSTALL '+selectedLeg.side.toUpperCase()+' LEG',
      ()=>doLegAction(selectedLeg.side,action));
    b.style.width='100%';card.append(b);
    if(!selectedLeg.installed){
      const note=document.createElement('p');note.className='meta';
      note.textContent='Owned part '+selectedLeg.serial+' remains in the detached tray. It is not rendered as attached geometry.';
      card.append(note);
    }
  }
  if(selectedSection){
    const side=selectedSection.side,section=selectedSection.section;
    const index=['hip','thigh','knee','shin','ankle','foot'].indexOf(section);
    const descendants=labNodeList(machine).filter(n=>n.parentSerial===node.serial);
    const note=document.createElement('p');note.className='meta';
    note.textContent=descendants.length
      ?'Supports '+descendants.map(n=>n.name).join(', ')+'. Removing this part requires a dependency-aware operation.'
      :'This section has no attached children.';
    card.append(note);
    if(ARTICULATION_JOINTS.includes(section))jointControl(side,section,card);
    if(section==='shin'){
      const mechanics=selectedSection.mechanical;
      if(mechanics){
        const size=document.createElement('p');size.className='meta';
        size.textContent='KNEE → ANKLE '+Math.round(mechanics.spanM*1000)+' mm'+
          ' · EXTRA VERTICAL REACH '+Math.round(mechanics.nominalExtraReachM*1000)+' mm'+
          ' · standard '+mechanics.upperStandard+'/'+mechanics.lowerStandard;
        card.append(size);
      }
      for(const [variant,label] of [['original','YARDWALKER'],['rook','ROOK S2'],['extended','PYLON L1']]){
        if(variant===selectedSection.variant)continue;
        const replace=button('REPLACE SHIN → '+label,
          ()=>doSectionAction(side,'shin','swap',{variant}));
        replace.style.width='100%';replace.style.marginBottom='5px';card.append(replace);
      }
    }
    const detach=button('DETACH '+section.toUpperCase()+
      (descendants.length?' WITH SUPPORTED ASSEMBLIES':''),
      ()=>doSectionAction(side,section,'detach',{cascade:true}));
    detach.style.width='100%';detach.style.marginTop='8px';card.append(detach);
    if(descendants.length){
      const strict=button('REMOVE ONLY THIS PART (CHECK SUPPORTS)',
        ()=>doSectionAction(side,section,'detach',{cascade:false}));
      strict.style.width='100%';strict.style.marginTop='5px';card.append(strict);
    }
  }
  inspect.append(card);
  if(selectedSocket){
    const owner=labNodeList(machine).find(n=>n.serial===selectedSocket.parentSerial);
    const socket=BY_ID.get(owner?.definitionId)?.sockets?.find(s=>s.id===selectedSocket.socketId);
    if(socket){
      const graph=labInspection(machine).graph;
      const occupying=Object.values(graph.nodes).find(n=>n.parentSerial===owner.serial&&n.parentSocket===socket.id);
      const panel=document.createElement('section');panel.className='card';
      const h=document.createElement('h2');h.textContent='ATTACHMENT · '+socket.id.toUpperCase();panel.append(h);
      const rows=[
        ['Owner',owner.name],['Standard',socket.standard],
        ['Position (m)',socket.position.map(n=>n.toFixed(3)).join(', ')],
        ['Face normal',socket.normal?.join(', ')||'not specified'],
        ['Load rating',socket.maxLoadKg+' kg'],
        ['Occupied by',occupying?.serial||'EMPTY']
      ];
      for(const [label,value] of rows){
        const row=document.createElement('div');row.className='metric';
        const a=document.createElement('span'),b=document.createElement('strong');
        a.textContent=label;b.textContent=value;row.append(a,b);panel.append(row);
      }
      const leg=labLegDetails(machine).find(l=>l.socket===socket.id);
      if(leg){
        const compatible=leg.definitionId==='yardwalker-leg-'+leg.side;
        const line=document.createElement('p');line.className='meta';
        line.textContent=compatible?'Compatible: owned Yardwalker '+leg.side+
          ' leg · same medium interface · 500 kg / 650 kg capacity.':
          'No authored compatible components';
        panel.append(line);
        const action=leg.installed?'detach':'attach';
        const b=button((action==='attach'?'INSTALL':'DETACH')+' '+leg.side.toUpperCase()+' LEG',
          ()=>doLegAction(leg.side,action));
        b.style.width='100%';panel.append(b);
      } else {
        const note=document.createElement('p');note.className='meta';
        note.textContent='This socket is inspectable. Only the authored, compatible components are available; universal free placement is deferred.';
        panel.append(note);
      }
      inspect.append(panel);
    }
  }
  const info=document.createElement('p');info.className='explain';
  info.textContent='Stage 08E: shin-specific reach, authored joint anchors and compatible geometry. Mismatched legs can require reduced crouch or step travel; full balance physics remains deferred.';
  inspect.append(info);
}
/** A joint belongs to the bearing, not to the meshes being rotated.
 * The hip drives the thigh branch, knee the shin branch and ankle the foot.
 */
function jointControl(side,joint,container){
  const limits=JOINT_LIMITS[joint];
  const card=document.createElement('div');card.className='joint-control';
  const heading=document.createElement('div');heading.className='metric';
  const title=document.createElement('strong'),value=document.createElement('strong');
  title.textContent=side.toUpperCase()+' / '+joint.toUpperCase();
  value.dataset.poseValue=side+':'+joint;
  value.textContent=labPose(machine)[side+':'+joint]+'°';
  heading.append(title,value);card.append(heading);
  const slider=document.createElement('input');slider.type='range';
  slider.min=String(limits.min);slider.max=String(limits.max);
  slider.value=String(labPose(machine)[side+':'+joint]);slider.step='1';
  slider.dataset.poseSlider=side+':'+joint;
  const exists=labSectionDetails(machine).find(x=>x.side===side)?.sections?.[joint]?.installed;
  slider.disabled=!exists;slider.setAttribute('aria-label',side+' '+joint+' mechanical joint');
  slider.addEventListener('input',()=>{
    stopSweep(true);
    const next=Number(slider.value);
    const result=labJointAction(machine,side,joint,next);
    if(!result.ok){setMessage(result.reason,true);slider.value=String(labPose(machine)[side+':'+joint]);return;}
    applyExplode();
    setMessage(side+' '+joint+' = '+next+'° · one-axis mechanical pose');
  });
  card.append(slider);
  const note=document.createElement('p');note.className='meta';
  note.textContent=limits.min+'° → '+limits.max+'° · '+limits.description;
  card.append(note);
  container.append(card);
}
function updatePoseDiagnostics(){
  const pose=labPose(machine),grounding=labGrounding(machine);
  document.querySelectorAll('[data-pose-value]').forEach(el=>{
    const key=el.dataset.poseValue;
    el.textContent=pose[key]+'°';
  });
  document.querySelectorAll('[data-pose-slider]').forEach(el=>{
    if(document.activeElement!==el)el.value=String(pose[el.dataset.poseSlider]||0);
  });
  const panel=$('pose-diagnostics');
  if(!panel)return;
  panel.replaceChildren();
  const report=articulationReport(machine);
  const headline=document.createElement('h2');headline.textContent='MECHANICAL STATUS';panel.append(headline);
  const mode=document.createElement('p');mode.className='meta';
  mode.textContent=grounding.mode==='grounded'
    ?'ASSISTED · FOOT TARGETS / LIVE IK · body drop '+Math.round(grounding.bodyDropM*100)+' cm'
    :'MANUAL · HINGE ANGLES (feet are not constrained)';
  panel.append(mode);
  if(grounding.mode==='grounded'){
    for(const side of ARTICULATION_SIDES){
      const item=grounding.feet[side],p=document.createElement('p');p.className='meta';
      p.textContent=side.toUpperCase()+' CONTACT · '+(item.planted?'PLANTED':'SWING')+
        ' · z '+item.z.toFixed(2)+' m · lift '+Math.round(item.y*100)+' cm';
      panel.append(p);
    }
  }
  for(const item of report.stroke){
    const line=document.createElement('div');line.className='metric';
    const a=document.createElement('span'),b=document.createElement('strong');
    a.textContent=item.side.toUpperCase()+' hydraulic stroke';
    b.textContent=Math.round(item.extensionM*1000)+' mm · '+(item.valid?'IN RANGE':'OUT OF RANGE');
    b.style.color=item.valid?'#4e7c67':'#b44736';line.append(a,b);panel.append(line);
  }
  const note=document.createElement('p');note.className='meta';
  note.textContent=clearance.warnings.length
    ?'COARSE CLEARANCE WARNINGS: '+clearance.warnings.join('; ')
    :'Coarse non-adjacent foot/thigh boxes: no overlap detected';
  panel.append(note);
  const caveat=document.createElement('p');caveat.className='meta';
  caveat.textContent='Clearance checks are conservative AABB hints, not exact swept-geometry collision, balance or walking simulation.';
  panel.append(caveat);
}
function renderPosePanel(){
  const panel=$('pose-controls');
  if(!panel)return;
  panel.replaceChildren();
  const intro=document.createElement('section');intro.className='card';
  const h=document.createElement('h2');h.textContent='GROUNDED POSE · LIVE M3CH4 IK';intro.append(h);
  const helper=document.createElement('p');helper.className='meta';
  helper.textContent='Assisted poses target the feet and lower the body. Joint angles are solved from the installed mechanical anchors.';
  intro.append(helper);
  const row=document.createElement('div');row.className='pose-presets';
  const titles={neutral:'NEUTRAL',crouch:'PLANTED CROUCH','step-left':'LIFT LEFT','step-right':'LIFT RIGHT',asymmetric:'WEIGHT SHIFT'};
  for(const preset of PRESET_NAMES){
    const b=button(titles[preset],()=>{
      stopSweep(true);
      const result=labAssistedPreset(machine,preset);
      if(!result.ok){setMessage(result.reason,true);return;}
      applyExplode();renderPosePanel();
      setMessage('Assisted · '+titles[preset]+
        (result.limited?' · LIMITED TO '+Math.round(result.movementScale*100)+'% OF REQUESTED TRAVEL':' · FULL TARGET REACHED'));
    });
    row.append(b);
  }
  intro.append(row);
  const viability=labViability(machine);
  const reportBox=document.createElement('section');reportBox.className='card';
  const reportTitle=document.createElement('h2');reportTitle.textContent='CONSTRUCTION VIABILITY';reportBox.append(reportTitle);
  const metrics=[
    ['Structural connections',viability.structure?'VALID':'INVALID'],
    ['Ground contact',viability.ground?'BOTH FEET REACH':'NOT SUPPORTED'],
    ['Full 15 cm crouch',viability.fullCrouch?'REACHABLE':'REQUIRES REDUCED DROP'],
    ['Two-step preview',viability.walkPreview?'REACHABLE':'LIMITED / UNREACHABLE'],
    ['Collision clearance','UNVERIFIED (BROAD PHASE ONLY)']
  ];
  for(const [name,value] of metrics){
    const line=document.createElement('div');line.className='metric';
    const key=document.createElement('span'),data=document.createElement('strong');
    key.textContent=name;data.textContent=value;line.append(key,data);reportBox.append(line);
  }
  for(const side of ARTICULATION_SIDES){
    const leg=viability.legs?.[side];
    if(!leg)continue;
    const p=document.createElement('p');p.className='meta';
    p.textContent=side.toUpperCase()+' / '+leg.variant.toUpperCase()+
      ' · SHIN '+Math.round(leg.lowerLengthM*1000)+' mm · REACH +'+
      Math.round(leg.extraReachM*1000)+' mm';
    reportBox.append(p);
  }
  if(viability.walkPreview){
    const p=document.createElement('p');p.className='meta';
    p.textContent='Test gait: '+Math.round(viability.stride.stepDistanceM*100)+' cm step, '+
      Math.round(viability.stride.liftM*100)+' cm lift';
    reportBox.append(p);
  }
  if(viability.crouchReason&&!viability.fullCrouch){
    const p=document.createElement('p');p.className='meta';
    p.textContent='Full crouch limit: '+viability.crouchReason;reportBox.append(p);
  }
  panel.append(reportBox);
  const walk=button(poseAnimation?'STOP TWO-STEP DEMO':'TEST PLANTED TWO-STEP MOTION',()=>{
    if(poseAnimation){stopSweep(true);return;}
    startGuidedWalk();
  });
  walk.style.width='100%';walk.style.marginTop='10px';intro.append(walk);
  const manual=button('MANUAL JOINT MODE · UNCONSTRAINED',()=>{
    stopSweep(true);labReturnManual(machine);applyExplode();renderPosePanel();
    setMessage('Manual joint inspection · foot placement not constrained');
  });
  manual.style.width='100%';manual.style.marginTop='8px';intro.append(manual);
  const sweep=button('MANUAL TWO-KNEE HINGE SWEEP',()=>{
    stopSweep(true);labReturnManual(machine);startSweep();
  });
  sweep.style.width='100%';sweep.style.marginTop='6px';intro.append(sweep);
  panel.append(intro);
  for(const side of ARTICULATION_SIDES){
    const group=document.createElement('section');group.className='card';
    const h=document.createElement('h2');h.textContent=side.toUpperCase()+' LEG · HINGE AXES';group.append(h);
    for(const joint of ARTICULATION_JOINTS)jointControl(side,joint,group);
    panel.append(group);
  }
  const diagnostics=document.createElement('section');
  diagnostics.className='card';diagnostics.id='pose-diagnostics';panel.append(diagnostics);
  updatePoseDiagnostics();
}
function stopSweep(restore=true){
  if(!poseAnimation)return;
  const prior=poseAnimation;
  cancelAnimationFrame(prior.request);
  poseAnimation=null;animationToken++;
  if(restore){
    if(prior.kind==='guided'){
      machine.labPose=structuredClone(prior.before.pose);
      machine.labGrounding=structuredClone(prior.before.grounding);
      machine.labManualPose=structuredClone(prior.before.manualPose);
    }else{
      for(const side of ARTICULATION_SIDES)
        labJointAction(machine,side,'knee',prior.initial[side]);
    }
    applyExplode();
  }
  renderPosePanel();
}
function startGuidedWalk(){
  if(poseAnimation||!labInspection(machine).mobility.complete)return;
  const envelope=labMotionEnvelope(machine);
  if(!envelope.ok){setMessage('Cannot step: '+envelope.reason,true);return;}
  const before={pose:labPose(machine),grounding:labGrounding(machine),
    manualPose:structuredClone(machine.labManualPose||labPose(machine))};
  const started=performance.now(),token=++animationToken;
  poseAnimation={kind:'guided',request:0,before,envelope};
  const tick=now=>{
    if(!poseAnimation||token!==animationToken)return;
    const t=Math.min(1,Math.max(0,(now-started)/3800));
    const result=labGuidedWalkFrame(machine,t,envelope);
    if(!result.ok){
      stopSweep(true);setMessage('Step preview stopped: '+result.reason,true);return;
    }
    applyExplode();
    if(t<1)poseAnimation.request=requestAnimationFrame(tick);
    else{
      const prior=poseAnimation;
      poseAnimation=null;animationToken++;
      machine.labPose=structuredClone(prior.before.pose);
      machine.labGrounding=structuredClone(prior.before.grounding);
      machine.labManualPose=structuredClone(prior.before.manualPose);
      applyExplode();renderPosePanel();
      setMessage('Planted two-step completed · original foot anchors and pose restored');
    }
  };
  renderPosePanel();poseAnimation.request=requestAnimationFrame(tick);
}
function startSweep(){
  if(poseAnimation||!labInspection(machine).mobility.complete)return;
  const initial=Object.fromEntries(ARTICULATION_SIDES.map(side=>[side,labPose(machine)[side+':knee']]));
  const token=++animationToken,started=performance.now();
  poseAnimation={kind:'manual',initial,request:0};
  const tick=now=>{
    if(!poseAnimation||token!==animationToken)return;
    const elapsed=Math.max(0,now-started),duration=2600;
    const progress=Math.min(1,elapsed/duration);
    const angle=Math.round(90*Math.sin(progress*Math.PI)**2);
    for(const side of ARTICULATION_SIDES)labJointAction(machine,side,'knee',angle);
    applyExplode();
    if(progress<1)poseAnimation.request=requestAnimationFrame(tick);
    else{
      for(const side of ARTICULATION_SIDES)labJointAction(machine,side,'knee',initial[side]);
      poseAnimation=null;applyExplode();renderPosePanel();
      setMessage('Two-knee motion sweep complete · original pose restored');
    }
  };
  renderPosePanel();
  poseAnimation.request=requestAnimationFrame(tick);
}
function switchTab(which){
  currentTab=which;
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===which)));
  for(const tab of ['catalog','tree','inspect','pose'])$(tab+'-panel').hidden=which!==tab;
  refreshSelection();
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
function makeProxy(def){
  // Deliberate technical placeholder, never an invented replacement model.
  const root=new THREE.Group(),size=def.envelope||[.8,.8,.8];
  const shell=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({
    color:0xaab7af,transparent:true,opacity:.22,roughness:1,depthWrite:false
  }));
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),new THREE.LineBasicMaterial({color:0x648078,transparent:true,opacity:.75}));
  root.add(shell,edge);root.userData.proxy=true;return root;
}
function makeVisual(def){
  const actual=buildPartVisual(def.id,{mode:'preview'});
  if(actual){
    // The imported visual kit includes a hidden full-envelope audit wire.
    // It is useful in chassis audits but falsely enlarges bounds after one
    // physical leg is detached. The lab computes bounds from real meshes.
    const debug=actual.userData.outline;
    if(debug){debug.parent?.remove(debug);debug.geometry?.dispose?.();delete actual.userData.outline;}
    return actual;
  }
  if(def.id==='power-dynamo'){
    const fixture=fitFixtureFor(def.id);
    if(fixture)return buildFitFixture(fixture);
  }
  return makeProxy(def);
}
function makeAdapterVisual(node){
  const group=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x788f86,metalness:.3,roughness:.68});
  const shape=node.definitionId==='hip-h2-u1'?
    new THREE.CylinderGeometry(.40,.40,.11,14):new THREE.BoxGeometry(.65,.12,.24);
  group.add(new THREE.Mesh(shape,m));group.userData.proxy=true;return group;
}
function clearGeometry(parent){
  for(const object of [...parent.children]){
    parent.remove(object);
    object.traverse(obj=>{
      obj.geometry?.dispose?.();
      // Don't dispose imported shared materials from the production visual kit.
      if(obj.material?.userData?.constructionLabOwned)obj.material.dispose();
    });
  }
}
function buildModels(){
  clearGeometry(partGroup);clearGeometry(markerGroup);
  partGroup.position.set(0,0,0);neutralGroupY=0;
  partRoots.clear();rayTargets=[];sockets=[];actuators=[];
  const inspection=labInspection(machine),graph=inspection.graph;
  const frame=own(graph.root),frameDef=BY_ID.get(frame?.definitionId);
  if(!frameDef){setMessage('Missing structural frame.',true);return;}
  nodeWorldPoses=graphWorldPoses(graph,BY_ID,frameDef.center);
  const nodes=labNodeList(machine);
  let yardwalkerLegVisuals=null,anatomyVisuals=null;
  nodes.forEach(node=>{
    const pose=nodeWorldPoses.get(node.serial);if(!pose)return;
    const def=BY_ID.get(node.definitionId);
    let model;
    if(def?.id==='legs-yard'){
      model=makeVisual(def);
      // These are the exact original authored leg groups, not replicated
      // primitive stand-ins. The parent mesh becomes the bare carriage.
      yardwalkerLegVisuals={
        left:extractYardwalkerLeg(model,'left'),
        right:extractYardwalkerLeg(model,'right')
      };
      anatomyVisuals={
        left:extractYardwalkerAnatomy(yardwalkerLegVisuals.left,'left'),
        right:extractYardwalkerAnatomy(yardwalkerLegVisuals.right,'right')
      };
      // The original fixed decorative piston cannot track a rotating knee.
      // Hide it and draw one continuous, two-ended dynamic actuator below.
      for(const side of ARTICULATION_SIDES){
        const old=anatomyVisuals[side].thigh.getObjectByName(
          'Y6-'+side+'-practical-linear-drive');
        if(old)old.visible=false;
      }
    } else if(def?.assemblyRole==='leg'){
      if(!yardwalkerLegVisuals?.[def.side])
        throw new Error('A leg cannot render without the owning Yardwalker carriage');
      model=yardwalkerLegVisuals[def.side];
    } else if(def?.assemblyRole==='anatomy'){
      if(!anatomyVisuals?.[def.side])
        throw new Error('No source Yardwalker anatomy available');
      model=def.variant==='rook'?buildRookSparShin(def.side):
        def.variant==='extended'?buildPylonExtendedShin(def.side,def.mechanical.ankleReceiver):
        anatomyVisuals[def.side][def.section];
      if(!model)throw new Error('Missing original '+def.side+' '+def.section+' geometry');
    } else model=def?makeVisual(def):makeAdapterVisual(node);
    model.name='lab:'+node.serial;
    model.userData.labSerial=node.serial;
    model.position.set(...pose.position);model.rotation.y=pose.rotationQuarterTurns*Math.PI/2;
    partGroup.add(model);partRoots.set(node.serial,model);
    model.traverse(obj=>{if(obj.isMesh){obj.userData.labSerial=node.serial;rayTargets.push(obj);}});
  });
  if(yardwalkerLegVisuals){
    for(const side of ARTICULATION_SIDES){
      const actuator=createActiveActuator(side);
      actuator.group.userData.mechanicalSide=side;
      partGroup.add(actuator.group);actuators.push(actuator);
      const knee=nodes.find(n=>BY_ID.get(n.definitionId)?.assemblyRole==='anatomy'&&
        BY_ID.get(n.definitionId)?.side===side&&BY_ID.get(n.definitionId)?.section==='knee');
      if(knee)actuator.group.traverse(obj=>{
        if(obj.isMesh){obj.userData.labSerial=knee.serial;rayTargets.push(obj);}
      });
    }
  }
  let bounds=new THREE.Box3().setFromObject(partGroup);
  if(!bounds.isEmpty()){
    partGroup.position.y-=bounds.min.y;
    const extra=labViability(machine).legs
      ?Math.max(0,...Object.values(labViability(machine).legs).map(l=>l?.extraReachM||0)):0;
    // Align the lab floor to the ORIGINAL neutral sole datum. An extended
    // shin must bend to reach that shared plane, not move the entire mech
    // upward just because its unposed mesh reaches below the floor.
    neutralGroupY=partGroup.position.y-extra;
    bounds=new THREE.Box3().setFromObject(partGroup);
    // Keep existing frame coordinates; only shift the whole assembled machine.
  }
  for(const node of nodes){
    const pose=nodeWorldPoses.get(node.serial);
    const def=BY_ID.get(node.definitionId);
    if(!pose||!def?.sockets)continue;
    for(const socket of def.sockets){
      const taken=Object.values(graph.nodes).some(n=>n.parentSerial===node.serial&&n.parentSocket===socket.id);
      const orb=new THREE.Mesh(new THREE.SphereGeometry(.085,9,7),taken?usedMat:guideMat);
      const relative=rotatedY(socket.position,pose.rotationQuarterTurns);
      orb.position.set(pose.position[0]+relative[0],pose.position[1]+relative[1]+partGroup.position.y,pose.position[2]+relative[2]);
      orb.userData.socketParent=node.serial;orb.userData.socketId=socket.id;
      orb.userData.socketOffset=[...socket.position];
      markerGroup.add(orb);sockets.push(orb);
    }
  }
  markerGroup.visible=socketToggle.checked;
  applyExplode();applyIsolation();
  return bounds;
}
function applyExplode(){
  const grounding=labGrounding(machine);
  partGroup.position.y=neutralGroupY-(grounding.mode==='grounded'?grounding.bodyDropM:0);
  partGroup.position.z=grounding.mode==='grounded'?grounding.bodyTravelZM:0;
  const fraction=Number(explode.value)/100;
  const report=labInspection(machine),graph=report.graph;
  const cache=applyArticulatedModels(graph,nodeWorldPoses,machine,partRoots,fraction);
  // Keep socket inspection markers at their articulated interfaces.
  for(const marker of sockets){
    const base=cache.get(marker.userData.socketParent);
    if(!base)continue;
    marker.position.copy(new THREE.Vector3(...marker.userData.socketOffset).applyMatrix4(base.matrix));
    marker.position.y+=partGroup.position.y;
    marker.position.z+=partGroup.position.z;
  }
  for(const actuator of actuators){
    const status=updateActiveActuator(actuator,machine,cache,graph,nodeWorldPoses);
    const focusDef=BY_ID.get(graph.nodes[selectedSerial]?.definitionId);
    actuator.group.visible=status.visible&&fraction<.01&&
      (!isolate||(focusDef?.assemblyRole==='anatomy'&&focusDef.side===actuator.side));
  }
  partGroup.updateMatrixWorld(true);
  clearance=fraction===0?coarseClearanceHints(graph,partRoots):
    {warnings:[],status:'Hide exploded view to inspect coarse clearance'};
  markerGroup.visible=!isolate&&socketToggle.checked&&fraction<.01;
  refreshSelection();
  updatePoseDiagnostics();
}
function applyIsolation(){
  for(const [serial,model] of partRoots)model.visible=!isolate||serial===selectedSerial;
  // Re-evaluate actuator ownership each time; never latch an actuator hidden
  // after leaving isolation mode.
  applyExplode();
}
function refreshSelection(){
  // Highlight the selected mechanical component in ASSEMBLY/INSPECT only.
  // The broad teal BoxHelper obstructed the sterile studio during posing.
  if(!['tree','inspect'].includes(currentTab)){outline.visible=false;return;}
  const part=partRoots.get(selectedSerial);
  if(!part||!part.visible){outline.visible=false;return;}
  outline.setFromObject(part);outline.visible=true;
}
function reframe(){
  const bounds=new THREE.Box3().setFromObject(partGroup);
  if(bounds.isEmpty())return;
  const center=bounds.getCenter(new THREE.Vector3()), size=bounds.getSize(new THREE.Vector3());
  focus.copy(center);
  distance=clamp(Math.max(size.x,size.y,size.z)*2.0+1.8,3.2,26);
  updateCamera();
}
function rebuild(fit=true){
  const bounds=buildModels();
  renderSlots();renderCatalog();showTree();renderInspection();renderPosePanel();
  const verdict=labInspection(machine);
  const nr=labNodeList(machine).length;
  const absent=LAB_SLOTS.filter(s=>!machine.installed[s]).length;
  const yard=verdict.mobility;
  stats.textContent=nr+' NODES · '+Math.round(verdict.machineCheck.massKg)+' KG'+
    (yard.legs?' · '+yard.legs+'/2 LEGS':'');
  $('stageMode').textContent=absent?'INCOMPLETE':yard.complete?'STAGE 08E · GEOMETRY':'STAGE 08E · INCOMPLETE';
  if(!verdict.valid)setMessage(verdict.graphCheck.errors.join(' | '),true);
  else if(!verdict.ready)setMessage(verdict.mobility.complete?
    'Structurally valid · not combat-ready in live rules':
    'Structurally valid · serviceable mobility incomplete',false);
  else setMessage('Assembly graph valid · '+nr+' nodes');
  if(bounds&&fit)reframe();
  applyExplode();refreshSelection();
}
function updateCamera(){
  const cp=Math.cos(elevation);
  camera.position.set(
    focus.x+Math.sin(azimuth)*cp*distance,
    focus.y+Math.sin(elevation)*distance,
    focus.z+Math.cos(azimuth)*cp*distance
  );
  camera.lookAt(focus);
}
function pick(x,y){
  const rect=renderer.domElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const marker=markerGroup.visible?raycaster.intersectObjects(sockets,false)[0]:null;
  if(marker){
    selectedSerial=marker.object.userData.socketParent;
    selectedSocket={parentSerial:selectedSerial,socketId:marker.object.userData.socketId};
    setMessage('Socket '+marker.object.userData.socketId+' on '+selectedSerial);
  }else{
    const hit=raycaster.intersectObjects(rayTargets,false).find(h=>h.object.visible);
    if(!hit)return;
    selectedSerial=hit.object.userData.labSerial;selectedSocket=null;
  }
  refreshSelection();showTree();renderInspection();switchTab('inspect');
}
function cameraPreset(name){
  [azimuth,elevation]=viewMap[name];reframe();
}
$('view-reset').addEventListener('click',()=>cameraPreset('quarter'));
$('view-front').addEventListener('click',()=>cameraPreset('front'));
$('view-side').addEventListener('click',()=>cameraPreset('side'));
$('view-top').addEventListener('click',()=>cameraPreset('top'));
$('reset').addEventListener('click',()=>{
  machine=createLabMachine();selectedSlot='structure';selectedSerial=machine.installed.structure;selectedSocket=null;isolate=false;
  $('isolate').setAttribute('aria-pressed','false');explode.value='0';rebuild(true);setMessage('Clean test rig restored');
});
$('isolate').addEventListener('click',()=>{
  isolate=!isolate;$('isolate').setAttribute('aria-pressed',String(isolate));applyIsolation();
});
explode.addEventListener('input',applyExplode);
socketToggle.addEventListener('change',applyIsolation);
gridToggle.addEventListener('change',()=>{grid.visible=gridToggle.checked;});
$('export').addEventListener('click',()=>{
  try{
    const data=JSON.stringify(labBlueprint(machine),null,2);
    const objectUrl=URL.createObjectURL(new Blob([data],{type:'application/json'}));
    const link=document.createElement('a');link.href=objectUrl;link.download='m3ch4-construction-lab.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),250);
    setMessage('Blueprint exported · laboratory format v1');
  }catch(error){setMessage(error.message,true);}
});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(file.size>250000){setMessage('Blueprint exceeds 250 KB limit.',true);return;}
  try{
    const next=loadLabBlueprint(JSON.parse(await file.text()));
    machine=next;selectedSerial=machine.installed.structure;selectedSocket=null;rebuild(true);
    setMessage('Blueprint imported and validated.');
  }catch(error){setMessage('Import blocked: '+error.message,true);}
});
const pointers=new Map();let gesture=null;
function multiCenter(){
  const a=[...pointers.values()];return {x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,
    spread:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};
}
stage.addEventListener('pointerdown',e=>{
  if(e.target!==renderer.domElement)return;
  stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});
  if(pointers.size===2)gesture=multiCenter();
});
stage.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;
  old.x=e.clientX;old.y=e.clientY;
  if(Math.hypot(old.x-old.startX,old.y-old.startY)>7)old.moved=true;
  if(pointers.size===2){
    const now=multiCenter();
    if(gesture){
      distance=clamp(distance*gesture.spread/Math.max(now.spread,5),2,40);
      // Parallel two-finger motion pans the orbit target.
      const rect=stage.getBoundingClientRect();
      const scale=distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*2/Math.max(1,rect.height);
      const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
      const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
      focus.addScaledVector(right,-(now.x-gesture.x)*scale);
      focus.addScaledVector(up,(now.y-gesture.y)*scale);
    }
    gesture=now;
  }else if(pointers.size===1){
    if(e.shiftKey){
      const scale=distance*.0018;
      const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
      const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
      focus.addScaledVector(right,-dx*scale);focus.addScaledVector(up,dy*scale);
    }else{
      azimuth-=dx*.009;elevation=clamp(elevation+dy*.007,-.75,1.48);
    }
  }
  updateCamera();
});
stage.addEventListener('pointerup',e=>{
  const old=pointers.get(e.pointerId);
  if(old&&!old.moved&&pointers.size===1)pick(e.clientX,e.clientY);
  pointers.delete(e.pointerId);gesture=pointers.size===2?multiCenter():null;
});
stage.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});
stage.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),2,40);updateCamera();},{passive:false});
function resize(){
  const width=stage.clientWidth,height=stage.clientHeight;
  if(!width||!height)return;
  camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
}
new ResizeObserver(resize).observe(stage);
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}
renderSlots();rebuild(true);resize();animate();
