import { makeCanvas, addCanvasTexture, glowCanvas, vignette, grain, soft } from "../../shared/paint.js";
import { TOYS } from "./puzzle.js";
import { COT_PHOTOS, cotPhotograph, cotObject, cotHotelLights } from "./photography.js";

export const KEYS = {
  room: "cot_room", light: "cot_light", front: "cot_front", shadow: "cot_shadow",
  toy: id => `cot_toy_${id}`, cast: id => `cot_cast_${id}`, dancers: "cot_dancers", windKey: "cot_wind_key", hat: "cot_hat",
  windows: "cot_windows", glint: "cot_glint", hoop: "cot_mobile_hoop", mobile: i => `cot_mobile_${i}`,
};
export const MOBILE = ["star", "cloud", "moon", "star", "cloud"];
export const PARTS = {
  dancers: { at: { x: 0, y: -160 }, ox: 0.5, oy: 1, w: 72, h: 114 },
  hat: { at: { x: 0, y: -188 }, ox: 0.5, oy: 0.7, w: 70, h: 50 },
  windows: { at: { x: 0, y: 0 }, ox: 0.5, oy: 0.97, w: 240, h: 270 },
};
const BOX = {
  musicbox: [220, 200], oscar: [84, 190], book: [260, 170], chaplin: [130, 214], hotel: [240, 270],
  pillow: [220, 145], blanket: [205, 110], bootees: [98, 85], teddy: [120, 142], rabbit: [98, 132], rattle: [93, 86],
  duck: [104, 108], train: [155, 110], rockingHorse: [135, 144], blocks: [110, 100], ball: [98, 98],
  rings: [80, 130], top: [90, 96], firetruck: [136, 104], elephant: [108, 125],
};
export const BELONGINGS = [
  { id:"pillow", a:.18, b:.04, origin:.5 },
  { id:"bootees", a:.42, b:.08, origin:.6 },
  { id:"teddy", a:.57, b:.06, origin:.93 },
  { id:"rabbit", a:.06, b:.89, origin:.94 },
  { id:"rattle", a:.34, b:.87, origin:.5 },
  { id:"blanket", a:.74, b:.87, origin:.5 },
  { id:"duck", a:.34, b:.60, origin:.97 },
  { id:"train", a:.20, b:.80, origin:.97 },
  { id:"rockingHorse", a:.92, b:.85, origin:.97 },
  { id:"blocks", a:.06, b:.07, origin:.97 },
  { id:"ball", a:.69, b:.73, origin:.97 },
  { id:"rings", a:.80, b:.04, origin:.97 },
  { id:"top", a:.49, b:.91, origin:.97 },
  { id:"firetruck", a:.25, b:.95, origin:.97 },
  { id:"elephant", a:.025, b:.58, origin:.97 },
];
export const toyOriginY = id => id === "book" ? .5 : .97;

export function layoutCot(W, H, scene) {
  const u = Math.min(W / 1000, H / 620), L = { W, H, u, photographic: true };
  L.frontTop = H * .855;
  L.at = (a,b) => ({ x: W * (.5 + (a-.5) * (.62+.36*b)), y: H * (.445+.41*b) });
  L.unproject = (x,y) => {
    const b = Math.max(.03,Math.min(.91,(y/H-.445)/.41));
    return { a: Math.max(.055,Math.min(.945,(x/W-.5)/(.62+.36*b)+.5)), b };
  };
  L.unit = b => u * .65 * (.9+.12*b);
  const thing = t => {
    const p=L.at(t.a,t.b), px=L.unit(t.b), photo=cotObject(scene,t.id), box=BOX[t.id];
    const scale=Math.min(box[0]*px/(photo?.width||box[0]),box[1]*px/(photo?.height||box[1]));
    return { ...t, ...p, px, w: (photo?.width||box[0])*scale, h:(photo?.height||box[1])*scale,
      origin:t.origin??toyOriginY(t.id) };
  };
  L.toys=TOYS.map(thing);
  L.belongings=BELONGINGS.map(thing);
  L.all=[...L.toys,...L.belongings];
  const hoop=cotObject(scene,"hoop"), R=104*u;
  L.mobile={x:W*.5,y:H*.085,R,ry:R*hoop.height/hoop.width,
    drop:[.12,.155,.13,.17,.145].map(d=>d*H),size:33*u};
  return L;
}

export function paintCot(scene, L) {
  const photo=cotPhotograph(scene,COT_PHOTOS.room);
  const room=makeCanvas(L.W,L.H), g=room.getContext("2d");
  g.filter="brightness(.87) saturate(.86)"; g.drawImage(photo,0,0,L.W,L.H);
  // Fixed belongings share the mattress painting, so they never acquire a
  // hover, drag cursor or click action. Only the five clues are live objects.
  for(const t of [...L.belongings].sort((a,b)=>a.b-b.b)) {
    g.save(); g.filter="none";
    soft(g,t.x+3*L.u,t.y+2*L.u,t.w*.52,t.origin<.8?t.h*.24:5*L.u,"0,0,0",.36);
    g.filter="brightness(.8) saturate(.82)";
    g.shadowColor="rgba(0,0,0,.35)"; g.shadowBlur=2*L.u; g.shadowOffsetX=2*L.u; g.shadowOffsetY=2*L.u;
    g.drawImage(cotObject(scene,t.id),t.x-t.w/2,t.y-t.h*t.origin,t.w,t.h);
    g.restore();
  }
  addCanvasTexture(scene.textures,KEYS.room,room);
  const front=makeCanvas(L.W,L.H), f=front.getContext("2d");
  f.drawImage(room,0,L.frontTop,L.W,L.H-L.frontTop,0,L.frontTop,L.W,L.H-L.frontTop);
  addCanvasTexture(scene.textures,KEYS.front,front);
  const light=makeCanvas(L.W,L.H), v=light.getContext("2d");
  vignette(v,L.W,L.H,.24,"source-over"); grain(v,L.W,L.H,.005);
  addCanvasTexture(scene.textures,KEYS.light,light);
  for (const t of L.toys) {
    addCanvasTexture(scene.textures,KEYS.toy(t.id),copy(cotObject(scene,t.id)));
    addCanvasTexture(scene.textures,KEYS.cast(t.id),silhouette(cotObject(scene,t.id)));
  }
  for (const [id,key] of [["dancers",KEYS.dancers],["key",KEYS.windKey],["hat",KEYS.hat]]) addCanvasTexture(scene.textures,key,copy(cotObject(scene,id)));
  addCanvasTexture(scene.textures,KEYS.windows,cotHotelLights(scene));
  addCanvasTexture(scene.textures,KEYS.shadow,glowCanvas());
  addCanvasTexture(scene.textures,KEYS.glint,glowCanvas());
  addCanvasTexture(scene.textures,KEYS.hoop,copy(cotObject(scene,"hoop")));
  MOBILE.forEach((id,i)=>addCanvasTexture(scene.textures,KEYS.mobile(i),copy(cotObject(scene,id))));
}

// the shadow a thing casts: its own shape in black, soft at the edges, with a
// margin round it for the softness (SHADOW_PAD of its larger side, each way)
export const SHADOW_PAD = .08;
function silhouette(source) {
  const pad=Math.ceil(Math.max(source.width,source.height)*SHADOW_PAD);
  const c=makeCanvas(source.width+pad*2,source.height+pad*2),g=c.getContext("2d");
  g.filter=`brightness(0) blur(${Math.max(2,Math.round(pad*.45))}px)`;g.drawImage(source,pad,pad);return c;
}

function copy(source) {
  const c=makeCanvas(source.width,source.height),g=c.getContext("2d");
  g.filter="brightness(.8) saturate(.82)";g.drawImage(source,0,0);return c;
}

export function releaseCot(textures) {
  const keys=[KEYS.room,KEYS.light,KEYS.front,KEYS.shadow,KEYS.dancers,KEYS.windKey,KEYS.hat,KEYS.windows,KEYS.glint,KEYS.hoop,
    ...TOYS.flatMap(t=>[KEYS.toy(t.id),KEYS.cast(t.id)]),...MOBILE.map((_,i)=>KEYS.mobile(i))];
  for(const key of keys)if(textures.exists(key))textures.remove(key);
}

export function paintToyAt(id, px = 1) {
  const box = BOX[id] || [100, 100];
  const w = Math.max(2, Math.round(box[0] * px * 0.4));
  const h = Math.max(2, Math.round(box[1] * px * 0.4));
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = id === "oscar" ? "#c8a452" : id === "musicbox" ? "#624a35" : id === "book" ? "#8c2e2e" : id === "hotel" ? "#4a5568" : "#2d3748";
  ctx.fillRect(0, 0, w, h);
  return { canvas, w, h, footY: toyOriginY(id) };
}

export function feltShape(kind, size = 16) {
  const w = Math.max(4, Math.round(size * 1.6)), h = w;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const cx = w / 2, cy = h / 2, r = w * 0.4;
  ctx.fillStyle = kind === "moon" ? "#e2d8a6" : kind === "star" ? "#e6cf78" : "#c4d1dc";
  if (kind === "star") {
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const angle = (p * Math.PI) / 5 - Math.PI / 2;
      const rad = p % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(angle) * rad, y = cy + Math.sin(angle) * rad;
      if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (kind === "moon") {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.3, Math.PI * 0.8);
    ctx.quadraticCurveTo(cx, cy, cx + Math.cos(-Math.PI * 0.3) * r, cy + Math.sin(-Math.PI * 0.3) * r);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy, r * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.3, cy, r * 0.5, 0, Math.PI * 2);
    ctx.arc(cx, cy - r * 0.2, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}
