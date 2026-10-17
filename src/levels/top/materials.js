import { makeCanvas, soft } from "../../shared/paint.js";

const ASSETS = {
  surfaces: { key: "physics_surface_atlas", url: "assets/images/Physics/surface-atlas.png" },
  window: { key: "physics_window_photo", url: "assets/images/Physics/arched-window.png" },
  telescope: { key: "physics_scope_photo", url: "assets/images/Physics/observatory-telescope.png" },
  fixtures: { key: "physics_fixtures_photo", url: "assets/images/Physics/observatory-fixtures.png" },
};
const cache = new WeakMap();

export function loadPhysicsMaterials(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function physicsMaterials(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.surfaces)) {
    const crop = (source, x, y, w, h, brightness = 1) => {
      const c = makeCanvas(w, h), g = c.getContext("2d");
      g.filter = `brightness(${brightness}) saturate(0.75)`;
      g.drawImage(source, x, y, w, h, 0, 0, w, h);
      return c;
    };
    const atlas = sources.surfaces, w = atlas.width / 3, h = atlas.height / 2;
    const tile = (col, row, brightness) => crop(atlas, col * w + 3, row * h + 3, w - 6, h - 6, brightness);
    const oak = tile(1, 0, 0.63), across = makeCanvas(oak.height, oak.width), g = across.getContext("2d");
    g.translate(0, across.height); g.rotate(-Math.PI / 2); g.drawImage(oak, 0, 0);
    const planks = Array.from({ length: 8 }, (_, i) => crop(atlas, w * 2 + 3, 4 + i * 61, w - 6, 60, 0.55));
    cache.set(atlas, {
      paper: tile(0, 0, 0.57), oak, across, planks,
      dome: tile(0, 1, 0.6), frame: tile(1, 1, 0.72), stone: tile(2, 1, 0.78),
      window: crop(sources.window, 14, 150, 1509, 700, 0.86),
      telescope: crop(sources.telescope, 130, 10, 770, 1490, 0.82),
      sconce: crop(sources.fixtures, 250, 20, 383, 970, 0.85),
      pendulum: crop(sources.fixtures, 992, 22, 302, 952, 0.85),
    });
  }
  return cache.get(sources.surfaces);
}

// The original opening bounds and low elliptical arch are kept exactly.
// The photograph supplies glass, curtains and timber inside that silhouette.
export function paintPhysicsWindow(ctx, L) {
  const image = L.physicsMaterials?.window;
  if (!image) return false;
  const w = L.win, rx = w.width / 2, rise = rx * 0.495, cx = w.x + rx, cy = w.y + rise;
  soft(ctx, cx, w.y + w.height * 0.62, rx * 1.04, w.height * 0.53, "0,0,0", 0.4);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w.x, w.y + w.height);
  ctx.lineTo(w.x, cy);
  ctx.ellipse(cx, cy, rx, rise, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(w.x + w.width, w.y + w.height);
  ctx.closePath();
  ctx.fillStyle = "#1e160e"; ctx.fill(); ctx.clip();
  ctx.drawImage(image, w.x, w.y, w.width, w.height);
  ctx.restore();
  return true;
}

export function paintPhysicsTelescope(ctx, L) {
  const image = L.physicsMaterials?.telescope;
  if (!image) return false;
  const { x, y, h } = L.scope, height = h * 1.02, width = height * image.width / image.height;
  soft(ctx, x, y, h * 0.33, h * 0.045, "0,0,0", 0.7);
  ctx.drawImage(image, x - width / 2, y - height, width, height);
  return true;
}
