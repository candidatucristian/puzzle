import native from "./nativeCot.json";
import { makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { TOYS } from "./puzzle.js";

export const KEYS = { room: "cot_native_room", front: "cot_native_front", materials: "cot_native_materials" };
export { native };

export function loadCotArt(scene) {
  for (const name of Object.keys(KEYS)) {
    if (!scene.textures.exists(KEYS[name])) scene.load.image(KEYS[name], `assets/images/Cot/native-v1/${name}.webp`);
  }
}

/** Fill the game viewport without stretching the plate. The live camera
 * uses the same centred crop, so toys and pointer targets stay aligned. */
export function layoutCot(W, H) {
  const s = Math.max(W / native.width, H / native.height);
  const x = (W - native.width * s) / 2, y = (H - native.height * s) / 2;
  const u = native.height * s / 620;
  const { height, distance, pitch } = native.camera;
  const focal = native.height / (2 * Math.tan(native.fov * Math.PI / 360));
  const at = (a, b) => {
    const z = (b - .5) * native.sheetDepth, t = distance - z;
    const depth = height * Math.sin(pitch) + t * Math.cos(pitch);
    const up = -height * Math.cos(pitch) + t * Math.sin(pitch);
    return { x: x + s * (native.width / 2 + focal * (a - .5) * native.sheetWidth / depth),
      y: y + s * (native.height / 2 - focal * up / depth) };
  };
  const boxes = { pillow: [.235,.046], bootees: [.080,.060], teddy: [.090,.150], rabbit: [.08,.20],
    rattle: [.09,.04], blanket: [.18,.04], duck: [.13,.12], train: [.16,.11], rockingHorse: [.15,.16],
    blocks: [.08,.08], ball: [.09,.09], rings: [.09,.14], top: [.08,.09], firetruck: [.15,.09], elephant: [.10,.15] };
  const belongings = native.belongings.map(t => {
    const [width, height] = boxes[t.id], p = at(t.a,t.b);
    return { ...t, ...p, w: width * focal * s / 1.4, h: height * focal * s / 1.4, origin: .97 };
  });
  const toys = TOYS.map(t => ({ ...t, ...at(t.a,t.b) }));
  return { W, H, u, s, x, y, native, at, toys, belongings, all: [...toys, ...belongings],
    frontTop: y + native.frontTop * s };
}

export function paintCot(scene, L) {
  // The plate already contains all fifteen fixed belongings, their real
  // contact shadows and reflected light. There are no decoration hit areas.
  scene.add.rectangle(0, 0, L.W, L.H, 0x101713).setOrigin(0).setDepth(-12);
  const room = scene.add.image(L.x, L.y, KEYS.room).setOrigin(0).setScale(L.s).setDepth(-10);
  scene.add.image(L.x, L.y, KEYS.front).setOrigin(0).setScale(L.s).setDepth(10);
  // A subtle vignette stays over the full viewport as its crop changes.
  const canvas = makeCanvas(L.W, L.H), g = canvas.getContext("2d");
  const gradient = g.createRadialGradient(L.W*.5,L.H*.48,L.H*.3,L.W*.5,L.H*.48,Math.max(L.W,L.H)*.69);
  gradient.addColorStop(0,"transparent");gradient.addColorStop(1,"rgba(3,6,7,.38)");
  g.fillStyle=gradient;g.fillRect(0,0,L.W,L.H);
  addCanvasTexture(scene.textures,"cot_native_falloff",canvas);
  scene.add.image(0,0,"cot_native_falloff").setOrigin(0).setDepth(11);
  return room;
}

export function releaseCot(textures) {
  if (textures.exists("cot_native_falloff")) textures.remove("cot_native_falloff");
}
