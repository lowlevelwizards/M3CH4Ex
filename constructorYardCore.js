/** M3CH4Ex Stage 17. A single isolated world for constructing AND piloting
 * the exact same Graybox assembly. Collision and travel state stay independent
 * of rendering, experimental part topology, career saves and the live game.
 */
export const YARD_BOUNDS=Object.freeze({minX:-32,maxX:32,minZ:-48,maxZ:36});
export const YARD_OBSTACLES=Object.freeze([
 {id:'lane-wall-west',minX:-31,maxX:-29,minZ:-46,maxZ:34,height:3},
 {id:'lane-wall-east',minX:29,maxX:31,minZ:-46,maxZ:34,height:3},
 {id:'cover-left-near',minX:-22,maxX:-17,minZ:8,maxZ:10,height:1.7},
 {id:'cover-right-near',minX:17,maxX:22,minZ:8,maxZ:10,height:1.7},
 {id:'cover-left-mid',minX:-24,maxX:-19,minZ:-8,maxZ:-6,height:2.4},
 {id:'cover-right-mid',minX:19,maxX:24,minZ:-8,maxZ:-6,height:2.4},
 {id:'slalom-left',minX:-17,maxX:-15,minZ:-21,maxZ:-18,height:2.7},
 {id:'slalom-right',minX:15,maxX:17,minZ:-30,maxZ:-27,height:2.7},
 {id:'backstop',minX:-27,maxX:27,minZ:-46,maxZ:-44,height:5.8}
]);
export const GARAGE_START=Object.freeze({x:0,z:26,yaw:0});
export const YARD_TARGETS=Object.freeze([
 {id:'dummy-18',x:-7,z:7,hp:6},
 {id:'dummy-31',x:0,z:-13,hp:6},
 {id:'dummy-51',x:8,z:-33,hp:6}
]);
export const MOBILITY_PROFILES=Object.freeze({
 'legs-yard':{speed:4.2,turn:1.55,acceleration:8.5,gait:1.25},
 'legs-compact':{speed:5.5,turn:2.0,acceleration:11,gait:1.55},
 'legs-hauler':{speed:3.2,turn:1.18,acceleration:6.4,gait:.86},
 'mobility-low-gb':{speed:3.9,turn:1.5,acceleration:8,gait:1.1},
 'mobility-quad-gb':{speed:2.9,turn:1.05,acceleration:5.6,gait:.78}
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const profileFor=id=>MOBILITY_PROFILES[id]||MOBILITY_PROFILES['legs-yard'];
export function insideObstacle(x,z,obstacles=YARD_OBSTACLES,radius=1.05){
 return obstacles.some(o=>
  x>o.minX-radius&&x<o.maxX+radius&&z>o.minZ-radius&&z<o.maxZ+radius);
}
export function initialYardPilot(){
 return {...GARAGE_START,velocityX:0,velocityZ:0,travel:0};
}
/** Forward is -Z (same basis as every authored weapon/mobility fixture).
 * Inputs are normalized throttle/strafe/turn in [-1,1], dt in seconds.
 * Separately swept axes allow a broad collision slide rather than tunneling.
 */
export function advanceYardPilot(old,input,dt,mobilityId,obstacles=YARD_OBSTACLES){
 const p=profileFor(mobilityId),sec=clamp(Number(dt)||0,0,.05);
 const f=clamp(Number(input.forward)||0,-1,1),s=clamp(Number(input.strafe)||0,-1,1),
  turn=clamp(Number(input.turn)||0,-1,1);
 const yaw=old.yaw+turn*p.turn*sec;
 const magnitude=Math.max(1,Math.hypot(f,s));
 const vx=(s*Math.cos(yaw)-f*Math.sin(yaw))/magnitude*p.speed,
  vz=(-s*Math.sin(yaw)-f*Math.cos(yaw))/magnitude*p.speed;
 const response=1-Math.exp(-p.acceleration*sec);
 const velocityX=(old.velocityX||0)+(vx-(old.velocityX||0))*response,
  velocityZ=(old.velocityZ||0)+(vz-(old.velocityZ||0))*response;
 const tryStep=(x,z)=>x>=YARD_BOUNDS.minX+2&&x<=YARD_BOUNDS.maxX-2&&
  z>=YARD_BOUNDS.minZ+2&&z<=YARD_BOUNDS.maxZ-2&&!insideObstacle(x,z,obstacles);
 let x=old.x,z=old.z,blocked=false;
 const candidateX=x+velocityX*sec;
 if(tryStep(candidateX,z))x=candidateX;else blocked=true;
 const candidateZ=z+velocityZ*sec;
 if(tryStep(x,candidateZ))z=candidateZ;else blocked=true;
 const moved=Math.hypot(x-old.x,z-old.z);
 return {x,z,yaw,velocityX:blocked&&x===old.x?0:velocityX,
  velocityZ:blocked&&z===old.z?0:velocityZ,
  travel:(old.travel||0)+moved,blocked,speed:sec>0?moved/sec:0};
}
