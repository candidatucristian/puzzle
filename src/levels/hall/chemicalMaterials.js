import { makeCanvas, soft } from "../../shared/paint.js";
import { laboratoryFrames } from "../room7/laboratoryArt.js";

const ASSETS = {
  surfaces: { key: "chemhall_surfaces_photo", url: "assets/images/Chemistry/hall-surface-atlas.png" },
  apparatus: { key: "chemhall_apparatus_photo", url: "assets/images/Chemistry/hall-apparatus.png" },
  bulb: { key: "chemhall_bulb_photo", url: "assets/images/Chemistry/hall-bulb.png" },
  paper: { key: "hall_chart_paper_photo", url: "assets/images/CaseFile/letter-paper-v2.png" },
  sconces: { key: "hall_sconces_photo", url: "assets/images/Physics/observatory-fixtures.png" },
};
const cache = new WeakMap();

export function loadChemistryHallMaterials(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function chemistryHallMaterials(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.surfaces)) {
    const crop = (source, x, y, w, h, brightness = 1) => {
      const c = makeCanvas(w, h), g = c.getContext("2d");
      g.filter = `brightness(${brightness}) saturate(0.76)`;
      g.drawImage(source, x, y, w, h, 0, 0, w, h);
      return c;
    };
    const atlas = sources.surfaces, w = atlas.width / 3, h = atlas.height / 3;
    const tile = (col, row, brightness) => crop(atlas, col * w + 3, row * h + 3, w - 6, h - 6, brightness);
    const oak = tile(2, 1, 0.72), across = makeCanvas(oak.height, oak.width), g = across.getContext("2d");
    g.translate(0, across.height); g.rotate(-Math.PI / 2); g.drawImage(oak, 0, 0);
    cache.set(atlas, {
      plaster: tile(0, 0, 0.64), tile: tile(1, 0, 0.92), paleFloor: tile(2, 0, 0.66),
      darkFloor: tile(0, 1, 0.8), paint: tile(1, 1, 0.9), oak, across,
      copper: tile(0, 2, 0.7), slate: tile(1, 2, 0.58), ceiling: tile(2, 2, 0.36),
      apparatus: laboratoryFrames(sources.apparatus, [0, 0.5, 1]),
      bulb: laboratoryFrames(sources.bulb, [0, 1])[0],
      paper: crop(sources.paper, 31, 50, 964, 1425, 0.83),
      sconce: crop(sources.sconces, 250, 20, 383, 970, 0.85),
      stubHolder: crop(sources.sconces, 250, 470, 383, 520, 0.66),
      wax: crop(sources.sconces, 478, 150, 65, 135, 0.65),
    });
  }
  return cache.get(sources.surfaces);
}

export function paintHallApparatus(ctx, image, x, y, height) {
  const width = height * image.width / image.height;
  soft(ctx, x, y + 1, width * 0.48, height * 0.025, "0,0,0", 0.6);
  ctx.drawImage(image, x - width / 2, y - height, width, height);
}

export function paintChemistryBulb(ctx, L) {
  const image = L.chemicalMaterials?.bulb;
  if (!image) return false;
  const b = L.bulb;
  ctx.drawImage(image, b.x - b.r * 0.94, b.y - b.r * 2.02, b.r * 1.88, b.r * 3.02);
  return true;
}

export function paintHallSconcePhoto(ctx, L, s, materials) {
  if (!materials?.sconce) return false;
  const k = (L.u * 1.5) / s.z, x = s.x - s.side * 14 * k;
  const image = s.dead ? materials.stubHolder : materials.sconce;
  const height = (s.dead ? 22 : 42) * k, width = height * image.width / image.height;
  const top = s.y - (s.dead ? 1 : 13) * k;
  ctx.drawImage(image, x - width * 0.68, top, width, height);
  if (s.dead) ctx.drawImage(materials.wax, x - 2.4 * k, s.y - 5 * k, 4.8 * k, 5 * k);
  else {
    soft(ctx, x, s.y - 18 * k, 100 * k, 130 * k, "255,190,120", 0.22, "lighter");
    ctx.fillStyle = "#fff4cc"; ctx.beginPath(); ctx.ellipse(x, s.y - 18 * k, 2.6 * k, 6 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  return true;
}
