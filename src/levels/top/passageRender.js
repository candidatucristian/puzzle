import data from './passageRender.json';

const PLATE = 'top_passage_native_v1';
const BASE = 'assets/images/Attic/';
const doorKey = number => `passage_door_${number}_native_v1`;
const OPEN = 78 * Math.PI / 180;

export function loadPassageRender(scene) {
  if (!scene.textures.exists(PLATE)) scene.load.image(PLATE, `${BASE}top-passage-native-v1.webp`);
  for (const door of data.doors) {
    const key = doorKey(door.number);
    if (!scene.textures.exists(key)) scene.load.spritesheet(key, `${BASE}passage-door-${door.number}-native-v1.webp`, {
      frameWidth: door.frameWidth, frameHeight: door.frameHeight, endFrame: door.frames + door.latchFrames - 1,
    });
  }
}

export function passageRender(scene) {
  if (data.doors.length !== 2 || !scene.textures.exists(PLATE)
    || data.doors.some(d => !scene.textures.exists(doorKey(d.number)))) return null;
  return { plate: scene.textures.get(PLATE).getSourceImage() };
}

function frame(L) {
  const r = data.reference, scale = Math.min(L.W * 0.56, L.H * 1.02) / r.focal;
  return { x: L.W / 2 - r.cx * scale, y: L.H * 0.46 - r.cy * scale, scale };
}

function point(L, [x, y]) {
  const f = frame(L);
  return { x: f.x + x * f.scale, y: f.y + y * f.scale };
}

function box(L, b) {
  const f = frame(L);
  return { x: f.x + b.x * f.scale, y: f.y + b.y * f.scale,
    width: b.width * f.scale, height: b.height * f.scale };
}

export function alignPassageLayout(L) {
  L.vp = { x: L.W / 2, y: L.H * 0.46 };
  L.ambientLight = 0.23;
  L.leak = null;
  for (const d of L.doors) {
    const native = data.doors.find(n => n.number === d.number);
    d.quad = native.quad.map(p => point(L, p));
    const xs = d.quad.map(p => p.x), ys = d.quad.map(p => p.y);
    d.box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    d.sill = point(L, native.sill);
    d.keyhole = point(L, native.keyhole);
  }
  L.sconces = data.lamps.map(lamp => {
    const flame = point(L, lamp.flame);
    return { side: lamp.side, z: 1.67, dead: false, ...flame, flame };
  });
}

export function paintPassageRender(ctx, L) {
  const b = box(L, { x: 0, y: 0, width: data.reference.width, height: data.reference.height });
  ctx.drawImage(L.passageRender.plate, b.x, b.y, b.width, b.height);
}

// The pose replaces a small region with the same camera, exposure and
// foreground occlusion as the room. Door thickness, hinges, latch, shadows
// and the anteroom beyond the jamb are rendered together in Blender.
export function createPassageDoorArt(scene, L, d) {
  if (!L.passageRender) return null;
  const native = data.doors.find(n => n.number === d.number);
  const key = doorKey(d.number), b = box(L, native.box);
  let image, pose = 0;
  return {
    native: true, key, box: b,
    attach(target) { image = target; image.setFrame(pose); },
    draw(angle, handle = 0) {
      if (angle < OPEN / (native.frames - 1) / 2 && handle > 0) {
        pose = native.frames + Math.max(0, Math.min(native.latchFrames - 1, Math.round(handle * native.latchFrames) - 1));
      } else pose = Math.round(Math.max(0, Math.min(1, angle / OPEN)) * (native.frames - 1));
      image?.setFrame(pose);
      return { aperture: Math.sin(angle) };
    },
  };
}
