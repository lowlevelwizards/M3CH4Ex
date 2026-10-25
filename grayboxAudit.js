/** Stage 15 workshop inspection station: every catalogued assembly can be
 * audited without other machine geometry obscuring its actual connections.
 */
import * as THREE from 'three';
import {CATALOG,BY_PART} from './grayboxCore.js';
import {visualFor} from './grayboxVisual.js';
import {buildFrameExtensions} from './grayboxFormVisual.js';
const steel=new THREE.MeshStandardMaterial({color:'#6a817a',roughness:.68,metalness:.38});
const amber=new THREE.MeshStandardMaterial({color:'#c69b43',roughness:.55,metalness:.33});
export const AUDIT_CATEGORIES=Object.freeze(['frame','cab','combat','mobility','power','support']);
export function buildAuditScene(category,id,paint,level=1,compare=false){
 const part=CATALOG[category]?.find(p=>p.id===id);
 if(!part||!Number.isInteger(level)||level<0||level>2)
  throw Error('Unknown isolated audit part or coverage level');
 const root=new THREE.Group(),objects=[],levels=compare?[0,1,2]:[level];
 for(let i=0;i<levels.length;i++){
  const degree=levels[i],partRoot=new THREE.Group(),body=visualFor(category,part,paint,degree);
  if(category==='frame')buildFrameExtensions(body,id,paint);
  const b=new THREE.Box3().setFromObject(body,true),size=b.getSize(new THREE.Vector3()),
    center=b.getCenter(new THREE.Vector3());
  body.position.set(-center.x,-b.min.y,-center.z);
  partRoot.add(body);
  const rootFace=new THREE.Group();rootFace.name='installed assembly input interface';
  const y=category==='mobility'?size.y:category==='support'?size.y*.50:0;
  rootFace.position.set(0,y,category==='support'?size.z*.40:size.z*.48);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.027,6,12),amber);
  ring.position.copy(rootFace.position);ring.name='input mating receiver visual';partRoot.add(ring);
  if(category==='frame'){
   const marker=new THREE.Mesh(new THREE.BoxGeometry(.23,.07,.25),steel);
   marker.position.set(0,size.y-.035,0);
   marker.name='cab load plate inspection marker';partRoot.add(marker);
  }
  partRoot.position.x=(i-(levels.length-1)/2)*(Math.max(1.20,size.x)+.43);
  partRoot.userData.coverage=degree;
  root.add(partRoot);objects.push({category,group:partRoot,coverage:degree});
 }
 root.userData.audit=true;
 root.userData.family=category;
 root.userData.partId=part.id;
 return {root,sockets:[],objects};
}
export function auditText(category,id){
 const p=BY_PART.get(id);
 if(!p||!AUDIT_CATEGORIES.includes(category))return '';
 const origin=p.source==='existing'?'Shared with live part catalogue':'Workshop prototype';
 return p.name+' · '+Math.round(p.mass)+' kg · '+origin+
   ' · Show each mounting flange and inspect the armor from 3/4, front and side.';
}
