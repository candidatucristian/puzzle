import render from './physicsRender.json';

const PLATE = 'physics_observatory_native_v2';
const ARMILLARY = 'physics_armillary_native_v2';
const BASE = 'assets/images/Physics/';
const TAU = Math.PI * 2;

export function loadPhysicsRender(scene) {
  if (!scene.textures.exists(PLATE)) scene.load.image(PLATE, `${BASE}observatory-native-v2.webp`);
  const a = render.armillary;
  if (a && !scene.textures.exists(ARMILLARY)) {
    scene.load.spritesheet(ARMILLARY, `${BASE}armillary-native-v2.webp`, {
      frameWidth: a.frameWidth, frameHeight: a.frameHeight, endFrame: a.frames - 1,
    });
  }
}

// Same perspective as layoutRotunda, including its height-limited focal
// length on wider displays. The plate is overscanned and never stretched.
export function physicsRenderBox(L, box = { x: 0, y: 0, width: render.reference.width, height: render.reference.height }) {
  const r = render.reference;
  const scale = (L.P(100, 150, 100).x - L.W / 2) / r.focal;
  return {
    x: L.W / 2 + (box.x - r.cx) * scale,
    y: L.H * 0.46 + (box.y - r.cy) * scale,
    width: box.width * scale, height: box.height * scale,
  };
}

export function paintPhysicsPlate(scene, L, ctx) {
  if (!scene.textures.exists(PLATE)) return false;
  const b = physicsRenderBox(L);
  ctx.drawImage(scene.textures.get(PLATE).getSourceImage(), b.x, b.y, b.width, b.height);
  L.rendered = true;
  if (render.telescopeBox) L.thing.box = physicsRenderBox(L, render.telescopeBox);
  return true;
}

export function createPhysicsArmillary(scene, L, phase = 0) {
  const a = render.armillary;
  if (!a || !scene.textures.exists(ARMILLARY)) return null;
  const box = physicsRenderBox(L, a.box);
  const image = scene.add.image(box.x, box.y, ARMILLARY).setOrigin(0, 0)
    .setDisplaySize(box.width, box.height).setDepth(-9);
  const instrument = {
    image, box, native: true, phase,
    update(delta) {
      this.phase = (this.phase + Math.min(delta, 100) * TAU / a.period) % TAU;
      image.setFrame(Math.floor(this.phase / TAU * a.frames) % a.frames);
    },
  };
  image.setFrame(Math.floor(((phase % TAU) + TAU) % TAU / TAU * a.frames));
  return instrument;
}
