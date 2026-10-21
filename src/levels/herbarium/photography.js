import { makeCanvas } from "../../shared/paint.js";
import { PAGES } from "./puzzle.js";

export const HERBARIUM_COVER = { key: "herbarium_cloth_cover_v1", url: "assets/images/Herbarium/cloth-cover-v1.webp" };

export const HERBARIUM_PHOTOS = {
  book: "herbarium_open_album_v1",
  desk: "herbarium_walnut_table_v1",
  specimens: ["herbarium_pressed_plants_a_v1", "herbarium_pressed_plants_b_v1"],
};
const FILES = [
  [HERBARIUM_PHOTOS.book, "open-album-v1.webp"],
  [HERBARIUM_PHOTOS.desk, "walnut-table-v1.webp"],
  [HERBARIUM_PHOTOS.specimens[0], "pressed-plants-a-v1.webp"],
  [HERBARIUM_PHOTOS.specimens[1], "pressed-plants-b-v1.webp"],
];
const sheets = new WeakMap();

export function loadHerbariumPhotography(scene) {
  for (const [key, file] of FILES) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Herbarium/${file}`);
  }
}

function specimenSheet(image) {
  if (sheets.has(image)) return sheets.get(image);
  const cells = Array.from({ length: 12 }, (_, index) => {
    const sw = image.width / 3, sh = image.height / 4;
    // Some leaf tips extend beyond the nominal atlas cell. Keep them, then
    // discard disconnected fragments belonging to neighbouring specimens.
    const pad = Math.ceil(Math.min(sw, sh) * .12);
    const cell = makeCanvas(Math.floor(sw) + pad * 2, Math.floor(sh) + pad * 2), g = cell.getContext("2d");
    g.drawImage(image, (index % 3) * sw - pad, Math.floor(index / 3) * sh - pad,
      sw + pad * 2, sh + pad * 2, 0, 0, cell.width, cell.height);
    const data = g.getImageData(0, 0, cell.width, cell.height);
    isolateSpecimen(data);
    g.putImageData(data, 0, 0);
    const pixels = data.data;
    let x0 = cell.width, y0 = cell.height, x1 = -1, y1 = -1;
    for (let y = 0; y < cell.height; y++) for (let x = 0; x < cell.width; x++) {
      if (pixels[(y * cell.width + x) * 4 + 3] < 24) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (x1 < x0) return null;
    const crop = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
    crop.getContext("2d").drawImage(cell, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
    return crop;
  });
  sheets.set(image, cells);
  return cells;
}

function isolateSpecimen(image) {
  const { width: W, height: H, data } = image, N = W * H;
  const mask = new Uint8Array(N), labels = new Uint32Array(N), queue = new Uint32Array(N);
  // A two-pixel bridge keeps fine stalks, leaf veins and dry petals together.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] < 24) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H) mask[(y + dy) * W + x + dx] = 1;
    }
  }
  const parts = [];
  for (let seed = 0; seed < N; seed++) {
    if (!mask[seed] || labels[seed]) continue;
    const id = parts.length + 1;
    let read = 0, write = 1;
    queue[0] = seed; labels[seed] = id;
    while (read < write) {
      const p = queue[read++], x = p % W, y = Math.floor(p / W);
      for (const next of [x > 0 ? p - 1 : -1, x + 1 < W ? p + 1 : -1, y > 0 ? p - W : -1, y + 1 < H ? p + W : -1]) {
        if (next < 0 || !mask[next] || labels[next]) continue;
        labels[next] = id; queue[write++] = next;
      }
    }
    parts.push({ id, size: write });
  }
  const main = parts.reduce((best, p) => !best || p.size > best.size ? p : best, null);
  if (!main) return;
  for (let p = 0; p < N; p++) if (labels[p] !== main.id) data[p * 4 + 3] = 0;
}

export function herbariumPhotography(scene) {
  const source = key => scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null;
  const atlases = HERBARIUM_PHOTOS.specimens.map(source).map(image => image ? specimenSheet(image) : []);
  return {
    book: source(HERBARIUM_PHOTOS.book), desk: source(HERBARIUM_PHOTOS.desk),
    specimens: new Map(PAGES.flat().map((spec, index) => [spec.name, atlases[Math.floor(index / 12)][index % 12]])),
  };
}
