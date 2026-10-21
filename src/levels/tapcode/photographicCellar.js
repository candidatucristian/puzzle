import { makeCanvas } from "../../shared/paint.js";

const SURFACES = "tapcode_original_surfaces_v3", PROPS = "tapcode_original_props_v3";
const PHOTOGRAPH = "tapcode_cellar_photographic_v4";
const SOURCE = { width: 1660, height: 948 };
const cache = new WeakMap();

export function loadCellarPhotography(scene) {
  for (const [key, url] of [
    [PHOTOGRAPH, "assets/images/TapCode/cellar-photographic-v4.webp"],
    [SURFACES, "assets/images/TapCode/original-cellar-surfaces-v3.webp"],
    [PROPS, "assets/images/TapCode/original-cellar-props-v3.webp"],
  ]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

// The photograph follows the accepted composition. Only the live overlays
// need source landmarks; layoutCellar remains the original room layout.
export function paintCellarPhotography(ctx, scene, L) {
  if (!scene.textures.exists(PHOTOGRAPH)) return false;
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  ctx.drawImage(scene.textures.get(PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  L.photographic = true;
  L.slab = { ...L.slab, cx: 1004 * sx, x0: 909 * sx, y0: 245 * sy, w: 190 * sx, h: 303 * sy };
  L.slab.lineH = L.slab.h / (L.slab.n + 0.6);
  L.slab.markH = Math.min(L.slab.lineH * 0.42, 17);
  L.ladder = { ...L.ladder, x: 292 * sx };
  L.candle = { x: 1211 * sx, y: 567 * sy, s: 0.85 * sy };
  L.drip = { x: 797 * sx, y0: 145 * sy, y1: 760 * sy };
  return true;
}

export function cellarPhotographicMaterials(scene) {
  if (!scene.textures.exists(SURFACES) || !scene.textures.exists(PROPS)) return null;
  const atlas = scene.textures.get(SURFACES).getSourceImage();
  if (!cache.has(atlas)) {
    const source = scene.textures.get(PROPS).getSourceImage();
    const crop = (image, x, y, w, h, brightness = 1, trim = false) => {
      const canvas = makeCanvas(Math.round(w), Math.round(h)), g = canvas.getContext("2d");
      g.filter = `brightness(${brightness}) saturate(0.82)`;
      g.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
      if (!trim) return canvas;
      const pixels = g.getImageData(0, 0, canvas.width, canvas.height), data = pixels.data;
      let x0 = canvas.width, y0 = canvas.height, x1 = -1, y1 = -1;
      for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
        const at = (py * canvas.width + px) * 4, r = data[at], green = data[at + 1], b = data[at + 2];
        if ((r > 100 && r > green * 2.2 && r > b * 1.8) ||
            (green > 100 && green > r * 1.9 && green > b * 1.9) ||
            (r > 160 && green > 160 && b < 20)) data[at + 3] = 0;
        if (data[at + 3] <= 12) { data[at + 3] = 0; continue; }
        x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
      }
      g.putImageData(pixels, 0, 0);
      if (x1 < x0) return canvas;
      const result = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
      result.getContext("2d").drawImage(canvas, x0, y0, result.width, result.height, 0, 0, result.width, result.height);
      return result;
    };
    const tile = (col, row, light) => crop(atlas, col * atlas.width / 3 + 3, row * atlas.height / 2 + 3, atlas.width / 3 - 6, atlas.height / 2 - 6, light);
    const prop = box => crop(source, box[0] / 1280 * source.width, box[1] / 1280 * source.height,
      box[2] / 1280 * source.width, box[3] / 1280 * source.height, 0.68, true);
    cache.set(atlas, {
      brick: tile(0, 0, 0.52), oak: tile(1, 0, 0.63), iron: tile(2, 0, 0.75),
      stone: tile(0, 1, 0.6), flags: tile(1, 1, 0.5), plaster: tile(2, 1, 0.4),
      barrel: prop([0, 0, 430, 480]), crate: prop([430, 0, 400, 480]), maps: prop([830, 0, 450, 480]),
      stool: prop([0, 480, 430, 420]), rack: prop([430, 480, 400, 420]), slab: prop([830, 480, 450, 420]),
      chisel: prop([0, 900, 450, 380]), candle: prop([450, 900, 400, 380]),
    });
  }
  return cache.get(atlas);
}

export function paintCellarSurface(ctx, image, x, y, w, h, opacity = 1, blend = "source-over", variant = 0) {
  if (!image) return;
  // Match the crop's aspect to the existing face so stone pores and iron
  // grain stay natural on both narrow rails and broad bricks.
  const sw = Math.min(image.width * 0.85, image.height * 0.85 * w / h), sh = sw * h / w;
  const sx = (variant * 73) % (image.width - sw), sy = (variant * 47) % (image.height - sh);
  ctx.save(); ctx.globalAlpha *= opacity; ctx.globalCompositeOperation = blend;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}
