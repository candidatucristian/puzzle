import { makeCanvas, vignette } from "../../shared/paint.js";

export const CABIN_PHOTOGRAPH = "compass_photographic_cabin_solid_oak_v2";
const PROPS = "compass_photographic_props_v1";
const cache = new WeakMap();

export function loadCabinPhotography(scene) {
  for (const [key, file] of [[CABIN_PHOTOGRAPH, "cabin-solid-oak-v2.webp"], [PROPS, "nautical-props-v1.webp"]]) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Compass/${file}`);
  }
}

function cell(image, col, row) {
  const w = Math.floor(image.width / 2), h = Math.floor(image.height / 2);
  const canvas = makeCanvas(w, h), ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, col * w, row * h, w, h, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let left = w, right = -1, top = h, bottom = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] < 24) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return canvas;
  const cut = makeCanvas(right - left + 1, bottom - top + 1);
  cut.getContext("2d").drawImage(canvas, left, top, cut.width, cut.height, 0, 0, cut.width, cut.height);
  return cut;
}

export function cabinPhotography(scene) {
  if (![CABIN_PHOTOGRAPH, PROPS].every(key => scene.textures.exists(key))) return null;
  const image = scene.textures.get(PROPS).getSourceImage();
  if (cache.has(image)) return cache.get(image);
  const art = { compass: cell(image, 0, 0), lantern: cell(image, 1, 0), candle: cell(image, 0, 1) };
  cache.set(image, art);
  return art;
}

export function alignCabinPhotography(L, art) {
  if (!art) return;
  const sx = L.W / 1659, sy = L.H / 948;
  L.nauticalPhoto = art;
  L.candle = { ...L.candle, x: 681 * sx, y: 617 * sy, flameY: 543 * sy, size: 22 * sy };
  L.map = { ...L.map, x: 650 * sx, y: 740 * sy, w: 220 * sx, h: 80 * sy };
}

export function paintCabinPhotography(ctx, scene, L) {
  if (!L.nauticalPhoto) return false;
  ctx.drawImage(scene.textures.get(CABIN_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  // The solid oak wall stays opaque; no exterior layer shows through it.
  vignette(ctx, L.W, L.H, 0.15);
  return true;
}

export function paintPhotographicCompass(ctx, L, cx, cy) {
  const source = L.nauticalPhoto?.compass;
  if (!source) return false;
  // Calibrate the blank paper's radius to the native degree scale. Side
  // pivots and the hook make the photographed silhouette wider than its dial.
  const scale = L.compass.r / (source.width * 0.279);
  const centreY = source.height - source.width * 0.445;
  ctx.drawImage(source, cx - source.width * scale / 2, cy - centreY * scale, source.width * scale, source.height * scale);
  return true;
}

export function paintPhotographicLantern(lan, source) {
  if (!source) return null;
  const u = 2.2 * lan.s, chain = lan.len, w = 24 * u, bodyH = 36 * u;
  const canvas = makeCanvas(w * 2, (chain + bodyH) * 2), g = canvas.getContext("2d");
  g.scale(2, 2);
  for (let y = 2 * lan.s; y < chain; y += 6 * lan.s) {
    const shine = g.createLinearGradient(w / 2 - 2 * lan.s, 0, w / 2 + 2 * lan.s, 0);
    shine.addColorStop(0, "#2a2114"); shine.addColorStop(0.4, "#a28b55"); shine.addColorStop(1, "#3c301c");
    g.strokeStyle = shine; g.lineWidth = Math.max(1, 1.3 * lan.s);
    g.beginPath(); g.ellipse(w / 2, y, 1.7 * lan.s, 3.2 * lan.s, 0, 0, Math.PI * 2); g.stroke();
  }
  const width = Math.min(w * 0.88, bodyH * source.width / source.height), height = width * source.height / source.width;
  g.drawImage(source, (w - width) / 2, chain, width, height);
  return { canvas, oy: 0, flameDrop: chain + height * 0.65 };
}
