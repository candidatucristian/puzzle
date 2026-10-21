import { makeCanvas } from "../../shared/paint.js";

const MATERIALS = "cryptex_photographic_materials_v1";
const PROPS = "cryptex_photographic_props_v1";
const WHEEL = "cryptex_photographic_rotor_square_v2";
const BOOKS = "cryptex_photographic_books_v2";
const cache = new WeakMap();

export function loadCryptexPhotography(scene) {
  for (const [key, path] of [
    [MATERIALS, "assets/images/Cryptex/materials-photographic-v1.webp"],
    [PROPS, "assets/images/Cryptex/props-photographic-v1.webp"],
    [WHEEL, "assets/images/Cryptex/rotor-square-photographic-v2.webp"],
    [BOOKS, "assets/images/Cryptex/books-photographic-v2.webp"],
  ]) if (!scene.textures.exists(key)) scene.load.image(key, path);
}

function cell(image, column, row, trim = false, bounds) {
  const [x, y, width, height] = bounds || [column / 2, row / 2, 0.5, 0.5];
  const w = Math.floor(image.width * width), h = Math.floor(image.height * height);
  const canvas = makeCanvas(w, h), ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, image.width * x, image.height * y, w, h, 0, 0, w, h);
  if (!trim) return canvas;
  const { data } = ctx.getImageData(0, 0, w, h);
  let left = w, right = -1, top = h, bottom = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return canvas;
  const cut = makeCanvas(right - left + 1, bottom - top + 1);
  cut.getContext("2d").drawImage(canvas, left, top, cut.width, cut.height, 0, 0, cut.width, cut.height);
  return cut;
}

function material(canvas, target) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (!target) return { canvas, data: pixels.data, width: canvas.width, height: canvas.height };
  const mean = [0, 0, 0], count = pixels.data.length / 4;
  for (let i = 0; i < pixels.data.length; i += 4) for (let c = 0; c < 3; c++) mean[c] += pixels.data[i + c] / count;
  for (let i = 0; i < pixels.data.length; i += 4) for (let c = 0; c < 3; c++) {
    pixels.data[i + c] *= target[c] / Math.max(1, mean[c]);
  }
  ctx.putImageData(pixels, 0, 0);
  return { canvas, data: pixels.data, width: canvas.width, height: canvas.height };
}

export function cryptexPhotography(scene) {
  if (!scene.textures.exists(MATERIALS) || !scene.textures.exists(PROPS)) return null;
  const image = scene.textures.get(MATERIALS).getSourceImage();
  const props = scene.textures.get(PROPS).getSourceImage();
  if (cache.has(image)) return cache.get(image);
  const art = {
    brass: material(cell(image, 0, 0), [202, 163, 93]),
    desk: material(cell(image, 1, 0), [112, 73, 45]),
    plaster: material(cell(image, 0, 1), [75, 85, 70]),
    walnut: material(cell(image, 1, 1), [107, 66, 40]),
    // The tall candle and the books extend beyond an exact quadrant.
    // Isolate complete silhouettes using the atlas's transparent gutters.
    candles: [
      cell(props, 0, 0, true, [0, 0, 0.42, 0.55]),
      cell(props, 1, 0, true, [0.58, 0, 0.42, 0.55]),
      cell(props, 0, 1, true, [0, 0.6, 0.41, 0.4]),
    ],
    books: cell(props, 1, 1, true, [0.43, 0.55, 0.57, 0.45]),
  };
  if (scene.textures.exists(WHEEL)) {
    const source = scene.textures.get(WHEEL).getSourceImage();
    const canvas = makeCanvas(source.width, source.height);
    canvas.getContext("2d").drawImage(source, 0, 0);
    art.wheel = material(canvas, null);
  }
  if (scene.textures.exists(BOOKS)) {
    art.books = cell(scene.textures.get(BOOKS).getSourceImage(), 0, 0, true, [0, 0, 1, 1]);
  }
  cache.set(image, art);
  return art;
}

// Mirror the scan at its boundaries. World coordinates make the grain
// recede across the desk and keep it fixed to the rotating brass.
const mirror = value => 1 - Math.abs(((value % 2 + 2) % 2) - 1);
export function sampleMaterial(tile, x, y, spanX, spanY = spanX) {
  return sampleUV(tile, mirror(x / spanX + 0.5), mirror(y / spanY + 0.5));
}

export function sampleRotor(art, dx, dy, radius) {
  // Match the image's concentric faces to the native relief and letter rings.
  const diameter = rotorPhotoDiameter(radius);
  return sampleUV(art.wheel, 0.5 + dx / diameter, 0.5 + dy / diameter);
}

export function rotorPhotoDiameter(radius) {
  return radius * 1024 / 350;
}

function sampleUV(tile, x, y) {
  const u = Math.max(0, Math.min(1, x)) * (tile.width - 1);
  const v = Math.max(0, Math.min(1, y)) * (tile.height - 1);
  const ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
  const a = (iy * tile.width + ix) * 4;
  const b = (iy * tile.width + Math.min(ix + 1, tile.width - 1)) * 4;
  const c = (Math.min(iy + 1, tile.height - 1) * tile.width + ix) * 4;
  const d = (Math.min(iy + 1, tile.height - 1) * tile.width + Math.min(ix + 1, tile.width - 1)) * 4;
  const color = [];
  for (let channel = 0; channel < 3; channel++) color[channel] =
    (tile.data[a + channel] * (1 - fx) + tile.data[b + channel] * fx) * (1 - fy) +
    (tile.data[c + channel] * (1 - fx) + tile.data[d + channel] * fx) * fy;
  return color;
}

export function paintPhotographicDisk(ctx, tile, radius, bake, photoDiameter) {
  const image = makeCanvas(tile.width, tile.height), g = image.getContext("2d");
  const pixels = g.createImageData(tile.width, tile.height);
  const target = photoDiameter ? [210, 170, 96] : [202, 163, 93];
  for (let i = 0; i < tile.data.length; i += 4) {
    for (let c = 0; c < 3; c++) pixels.data[i + c] = tile.data[i + c] * bake[c] / target[c];
    pixels.data[i + 3] = 255;
  }
  g.putImageData(pixels, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.clip();
  const diameter = photoDiameter || radius * 2;
  ctx.drawImage(image, -diameter / 2, -diameter / 2, diameter, diameter);
  ctx.restore();
}

function drawExposure(ctx, source, box, exposure, warm = false) {
  ctx.save();
  ctx.filter = `brightness(${exposure})${warm ? " sepia(0.26) saturate(1.12)" : ""}`;
  ctx.drawImage(source, box.x, box.y, box.width, box.height);
  ctx.restore();
}

function occlude(ctx, source, box) {
  ctx.save(); ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(source, box.x, box.y, box.width, box.height);
  ctx.restore();
}

export function paintPhotographicBooks(rc, lc, cam, flame, shadePixel) {
  const source = cam.materials?.books;
  if (!source) return false;
  const centre = cam.deskToWorld(cam.W * 0.5, cam.deskY + (cam.H - cam.deskY) * 0.22);
  // These are the same physical dimensions and camera used in the image guide.
  // Project every corner, so the books rest on the desk instead of floating
  // across its back edge or inheriting a steep catalog-photo perspective.
  const corners = (w, d, base, height, angle, dx = 0, dz = 0) => {
    const points = [];
    for (const y of [base, base + height]) for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) {
      points.push(cam.P(centre.x + dx + x * Math.cos(angle) - z * Math.sin(angle), y, centre.z + dz + x * Math.sin(angle) + z * Math.cos(angle)));
    }
    return points;
  };
  const points = [...corners(20, 14, 0, 1.8, -0.045), ...corners(18.5, 12.8, 1.8, 1.3, 0.06, -0.5, 0.4)];
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  const foot = [[-10, -7], [10, -7], [10, 7], [-10, 7]].map(([x, z]) => cam.P(centre.x + x * Math.cos(-0.045) - z * Math.sin(-0.045), 0, centre.z + x * Math.sin(-0.045) + z * Math.cos(-0.045)));
  const unit = cam.kAt(centre.z);
  for (const ctx of [rc, lc]) {
    ctx.save();
    ctx.beginPath(); foot.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = unit * 0.7; ctx.shadowOffsetX = -unit * 0.25; ctx.shadowOffsetY = unit * 0.14;
    ctx.fill(); ctx.restore();
  }
  const ambient = [], candle = [];
  shadePixel([255, 255, 255], { x: centre.x, y: 2, z: centre.z }, { x: 0, y: 1, z: 0 }, 0, 1, 1, flame, ambient, candle, 0, 1, [1, 1, 1]);
  const base = tintedPhotograph(source, ambient), light = tintedPhotograph(source, candle);
  rc.drawImage(base, box.x, box.y, box.width, box.height);
  occlude(lc, source, box);
  lc.drawImage(light, box.x, box.y, box.width, box.height);
  return true;
}

function tintedPhotograph(source, tint) {
  const canvas = makeCanvas(source.width, source.height), ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    for (let c = 0; c < 3; c++) pixels.data[i + c] *= Math.max(0, tint[c]) / 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export function paintPhotographicCandle(rc, lc, cam, candle, under) {
  const { photo, foot, radius, wick, scale } = candle;
  const bottom = cam.P(foot.x, 0, foot.z);
  const wickOffset = candle.main ? 0.055 : candle.height > 8 ? 0.07 : 0.14;
  const height = (bottom.y - wick.y + radius * scale * 0.32) / (1 - wickOffset);
  const width = radius * 2.15 * scale;
  const box = { x: wick.x - width / 2, y: wick.y - height * wickOffset, width, height };
  drawExposure(rc, photo, box, 0.2);
  occlude(lc, photo, box);
  for (const layer of under.filter(Boolean)) {
    occlude(layer.canvas.getContext("2d"), photo, { ...box, x: box.x - layer.x, y: box.y - layer.y });
  }
  const x = Math.floor(box.x), y = Math.floor(box.y);
  const canvas = makeCanvas(Math.ceil(width) + 2, Math.ceil(height) + 2);
  const ctx = canvas.getContext("2d");
  drawExposure(ctx, photo, { ...box, x: box.x - x, y: box.y - y }, 0.72, true);
  // This pass belongs to this candle alone; Candle.js fades it with its flame.
  const falloff = ctx.createLinearGradient(0, 0, 0, height);
  falloff.addColorStop(0, "rgba(0,0,0,0)");
  falloff.addColorStop(0.24, "rgba(0,0,0,0.12)");
  falloff.addColorStop(1, "rgba(0,0,0,0.58)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = falloff; ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, x, y };
}
