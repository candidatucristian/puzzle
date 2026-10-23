import GATE from './hallGate.json';
import { renderBox } from './hallRender.js';

const SHEET = { key: 'hall_botany_gate_motion_v2', url: 'assets/images/Botany/hall-gate-motion-v2.webp' };

export function loadIronGate(scene) {
  if (!scene.textures.exists(SHEET.key)) {
    scene.load.spritesheet(SHEET.key, SHEET.url, {
      frameWidth: GATE.frameWidth, frameHeight: GATE.frameHeight, endFrame: GATE.frames - 1,
    });
  }
}

// Each pose is rendered from the real hinges in Blender, including the
// changing perspective, thickness, back faces and reflections of both leaves.
export function createIronGate(scene, L) {
  if (!L.render || !scene.textures.exists(SHEET.key)) return null;
  const b = renderBox(L, GATE.box);
  const image = scene.add.image(b.x, b.y, SHEET.key, 0).setOrigin(0, 0)
    .setDisplaySize(b.width, b.height).setDepth(-9);
  return {
    amount: 0,
    draw() { image.setFrame(Math.round(Math.max(0, Math.min(1, this.amount)) * (GATE.frames - 1))); },
  };
}
