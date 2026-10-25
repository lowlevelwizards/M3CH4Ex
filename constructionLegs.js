/** Stage 06 — real, individually owned Yardwalker legs on authored hip sockets.
 * Lab-only definitions; never imported by the production game.
 * The parent catalogue mobility mass (1240 kg) is an aggregate rating, so the
 * two 500 kg limbs are sub-masses, NOT extra mass added on top of it.
 */
import {CATALOG,BY_ID,assemblyGraph,proposeAttachment,proposeRemoval,validateGraph} from './components.js';
import {YARDWALKER_LAYOUT} from './mobilityDefinitions.js';

export const LEG_SIDES=Object.freeze(['left','right']);
export const YARD_CARRIAGE_KG=240;
export const YARD_LEG_KG=500;
export const YARD_LEG_MOUNT='medium';
export const YARD_LEG_IDS=Object.freeze({left:'yardwalker-leg-left',right:'yardwalker-leg-right'});
export const YARD_SOCKET_IDS=Object.freeze({left:'hip-left',right:'hip-right'});

for(const side of LEG_SIDES){
  const sign=side==='left'?-1:1;
  const authored=YARDWALKER_LAYOUT.legs.find(l=>l.side===sign);
  if(!authored)throw new Error('Missing authored Yardwalker '+side+' hip');
  const id=YARD_LEG_IDS[side];
  if(!BY_ID.has(id)){
    const def={
      id,name:'Yardwalker '+side+' leg',slot:'limb',
      mountSize:YARD_LEG_MOUNT,massKg:YARD_LEG_KG,
      envelope:[.65,1.55,.82],sockets:[],
      description:'Independently mounted original Yardwalker leg: hip bearing, thigh, knee, shin, ankle and work boot. Internal components remain fixed in Stage 06.',
      assemblyRole:'leg',side
    };
    CATALOG.push(def); BY_ID.set(id,def);
  }
  const parent=BY_ID.get('legs-yard');
  if(!parent)throw new Error('Yardwalker carrier missing');
  parent.includedChildMassKg=YARD_LEG_KG*2;
  parent.carriageMassKg=YARD_CARRIAGE_KG;
  if(!parent.sockets.some(s=>s.id===YARD_SOCKET_IDS[side]))
    parent.sockets.push({
      id:YARD_SOCKET_IDS[side],standard:YARD_LEG_MOUNT,roleHint:'limb',
      position:[...authored.hip],rotation:[0,0,0],rotationQuarterTurns:0,
      normal:[sign,0,0],maxLoadKg:650,
      authoredFrom:'YARDWALKER_LAYOUT.legs[].hip',
      description:'Real hip bearing centre; owns the entire '+side+' mechanical leg.'
    });
}
export function ownedLeg(assembly,side){
  const id=YARD_LEG_IDS[side];
  return assembly?.owned?.find(p=>p.definitionId===id)||null;
}
export function installedLeg(assembly,side){
  const leg=ownedLeg(assembly,side);
  return !!(leg && assemblyGraph(assembly).nodes[leg.serial]);
}
export function yardLegSupported(assembly){
  const id=assembly?.owned?.find(p=>p.serial===assembly.installed.mobility)?.definitionId;
  return id==='legs-yard';
}
export function attachYardLeg(assembly,side){
  if(!LEG_SIDES.includes(side))return {ok:false,reason:'Unknown hip side'};
  if(!yardLegSupported(assembly))return {ok:false,reason:'Yardwalker carriage required'};
  const part=ownedLeg(assembly,side);
  if(!part)return {ok:false,reason:'Owned '+side+' leg not found'};
  if(installedLeg(assembly,side))return {ok:true,unchanged:true};
  const proposal=proposeAttachment(assembly,BY_ID,part.serial,assembly.installed.mobility,YARD_SOCKET_IDS[side]);
  if(!proposal.ok)return proposal;
  assembly.graph=proposal.graph;
  return {ok:true,serial:part.serial};
}
export function detachYardLeg(assembly,side){
  if(!LEG_SIDES.includes(side))return {ok:false,reason:'Unknown hip side'};
  if(!yardLegSupported(assembly))return {ok:false,reason:'Yardwalker carriage required'};
  const part=ownedLeg(assembly,side);
  if(!part||!installedLeg(assembly,side))return {ok:true,unchanged:true};
  const removal=proposeRemoval(assemblyGraph(assembly),part.serial);
  if(!removal.ok)return removal;
  const verdict=validateGraph(removal.graph,assembly,BY_ID);
  if(!verdict.valid)return {ok:false,reason:verdict.errors.join(' ')};
  assembly.graph=removal.graph;
  return {ok:true,serial:part.serial};
}
export function captureLegInstallations(assembly){
  return Object.fromEntries(LEG_SIDES.map(side=>[side,installedLeg(assembly,side)]));
}
export function removeLegNodesForLegacyOperation(assembly){
  const before=captureLegInstallations(assembly);
  for(const side of LEG_SIDES){
    const part=ownedLeg(assembly,side);
    if(part&&assemblyGraph(assembly).nodes[part.serial]){
      const result=detachYardLeg(assembly,side);
      if(!result.ok)throw new Error(result.reason);
    }
  }
  return before;
}
export function restoreLegInstallations(assembly,prior){
  if(!yardLegSupported(assembly))return;
  for(const side of LEG_SIDES)if(prior[side]){
    const result=attachYardLeg(assembly,side);
    if(!result.ok)throw new Error(result.reason);
  }
}
export function effectiveLabMassKg(assembly,legacyMassKg){
  if(!yardLegSupported(assembly))return legacyMassKg;
  return legacyMassKg-YARD_LEG_KG*LEG_SIDES.filter(side=>!installedLeg(assembly,side)).length;
}
export function legReadiness(assembly){
  if(!yardLegSupported(assembly))return {legs:0,complete:true};
  const legs=LEG_SIDES.filter(side=>installedLeg(assembly,side)).length;
  return {legs,complete:legs===2};
}
