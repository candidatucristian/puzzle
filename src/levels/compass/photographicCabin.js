import { makeCanvas, polygon, vignette } from "../../shared/paint.js";

export const CABIN_PHOTOGRAPH = "compass_photographic_cabin_v1";
const PROPS = "compass_photographic_props_v1";
const cache = new WeakMap();

export function loadCabinPhotography(scene) {
  for (const [key, file] of [[CABIN_PHOTOGRAPH, "cabin-photographic-v1.webp"], [PROPS, "nautical-props-v1.webp"]]) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Compass/${file}`);
  }
}

function cell(image, col, row, trim = true) {
  const w = Math.floor(image.width / 2), h = Math.floor(image.height / 2);
  const canvas = makeCanvas(w, h), ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, col * w, row * h, w, h, 0, 0, w, h);
  if (!trim) return canvas;
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
  const art = { compass: cell(image, 0, 0), lantern: cell(image, 1, 0), candle: cell(image, 0, 1), sea: cell(image, 1, 1, false) };
  cache.set(image, art);
  return art;
}

export function alignCabinPhotography(L, art) {
  if (!art) return;
  const sx = L.W / 1659, sy = L.H / 948;
  L.nauticalPhoto = art;
  L.win = { ...L.win, x: 830 * sx, top: 208 * sy, spring: 208 * sy, sill: 466 * sy, hw: 268 * sx, cy: 337 * sy };
  L.beam.top = {
    x0: L.win.x - L.win.hw * 0.9, x1: L.win.x + L.win.hw * 0.85,
    y: L.win.sill - (L.win.sill - L.win.top) * 0.1,
  };
  L.candle = { ...L.candle, x: 681 * sx, y: 617 * sy, flameY: 543 * sy, size: 22 * sy };
  L.map = { ...L.map, x: 650 * sx, y: 740 * sy, w: 220 * sx, h: 80 * sy };
}

export function paintCabinPhotography(ctx, scene, L) {
  if (!L.nauticalPhoto) return false;
  ctx.drawImage(scene.textures.get(CABIN_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  // Only the glass openings are transparent. The photographed timber, bolts,
  // curtains and mullions stay in front of the moving photographic sea.
  const panes = [
    [[580, 208], [716, 208], [716, 466], [562, 466]],
    [[747, 208], [912, 208], [912, 466], [747, 466]],
    [[943, 208], [1078, 208], [1097, 466], [943, 466]],
  ];
  ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "#000";
  for (const pane of panes) {
    polygon(ctx, pane.map(([x, y]) => ({ x: x * L.W / 1659, y: y * L.H / 948 }))); ctx.fill();
  }
  ctx.restore(); vignette(ctx, L.W, L.H, 0.15);
  return true;
}

export function paintPhotographicSea(L) {
  if (!L.nauticalPhoto) return null;
  const w = Math.ceil(L.win.hw * 2.6), h = Math.ceil((L.win.sill - L.win.top) * 1.4);
  const sky = makeCanvas(w, h), g = sky.getContext("2d", { willReadFrequently: true });
  const image = L.nauticalPhoto.sea, cropH = Math.min(image.height, image.width * h / w);
  g.drawImage(image, 0, (image.height - cropH) * 0.3, image.width, cropH, 0, 0, w, h);
  const glitter = makeCanvas(w, h), gc = glitter.getContext("2d"), pixels = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, luma = pixels.data[i] * 0.25 + pixels.data[i + 1] * 0.5 + pixels.data[i + 2] * 0.25;
    pixels.data[i + 3] = y < h * 0.5 ? 0 : Math.min(56, Math.max(0, luma - 45));
  }
  gc.putImageData(pixels, 0, 0);
  return { sky, glitter };
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
