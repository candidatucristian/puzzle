import native from './nativeBottle.json';
import {glowCanvas,addCanvasTexture} from '../../shared/paint.js';

export const BOTTLE_KEYS={room:'compass_bottle_room_v1',needle:'compass_bottle_needle_v1',map:'compass_bottle_map_v1',glow:'compass_bottle_glow'};
const base='assets/images/Compass/native-bottle-v1/';

export function loadBottleCabin(scene){
  for(const name of ['room','map'])if(!scene.textures.exists(BOTTLE_KEYS[name]))scene.load.image(BOTTLE_KEYS[name],`${base}${name}.webp`);
  if(!scene.textures.exists(BOTTLE_KEYS.needle))scene.load.spritesheet(BOTTLE_KEYS.needle,`${base}needle.webp`,{
    frameWidth:native.needle.tile,frameHeight:native.needle.tile,endFrame:native.needle.count-1,
  });
}

/** The plate fills the canvas. Every click target and native needle crop
 * follows the same uniform camera crop, including after a resize. */
export function layoutBottleCabin(W,H){
  const s=Math.max(W/native.width,H/native.height),x=(W-native.width*s)/2,y=(H-native.height*s)/2;
  const at=([px,py])=>({x:x+px*s,y:y+py*s});
  const compass={...at(native.compass.centre),r:native.compass.radius*s};
  const quad=native.map.quad.map(at),xs=quad.map(p=>p.x),ys=quad.map(p=>p.y);
  const map={quad,x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2,
    w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
  const [left,top,tile]=native.needle.crop;
  return {W,H,s,x,y,u:Math.min(W/1000,H/620),compass,map,
    needle:{x:x+left*s,y:y+top*s,size:tile*s,count:native.needle.count,step:native.needle.step},
    lantern:at(native.lantern.flame)};
}

export function bottleGlow(scene){
  if(!scene.textures.exists(BOTTLE_KEYS.glow))addCanvasTexture(scene.textures,BOTTLE_KEYS.glow,glowCanvas());
}
