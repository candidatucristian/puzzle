import { makeCanvas, soft } from "../../shared/paint.js";
import { laboratoryFrames } from "../room7/laboratoryArt.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

const ASSETS = {
  surfaces: { key: "botany_hall_surfaces_photo", url: "assets/images/Botany/hall-materials.png" },
  plants: { key: "botany_hall_plants_photo", url: "assets/images/Botany/conservatory-plants-clean.png" },
  foliage: { key: "botany_hall_foliage_photo", url: "assets/images/Botany/foliage.png" },
  herbarium: { key: "botany_hall_herbarium_photo", url: "assets/images/Botany/herbarium-frames.png" },
  sconces: { key: "hall_sconces_photo", url: "assets/images/Physics/observatory-fixtures.png" },
};
const cache = new WeakMap();

export function loadBotanicHallMaterials(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function botanicHallMaterials(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.surfaces)) {
    const crop = (source, x, y, w, h, brightness = 1) => {
      const c = makeCanvas(w, h), g = c.getContext("2d");
      g.filter = `brightness(${brightness}) saturate(0.82)`;
      g.drawImage(source, x, y, w, h, 0, 0, w, h);
      return c;
    };
    const trim = (source, box) => laboratoryFrames(crop(source, ...box), [0, 1])[0];
    const atlas = sources.surfaces, w = atlas.width / 3, h = atlas.height / 2;
    const tile = (col, row, brightness) => crop(atlas, col * w + 3, row * h + 3, w - 6, h - 6, brightness);
    const pw = sources.plants.width / 2, ph = sources.plants.height / 2;
    // The finished pots extend below the atlas midpoint; include their bases.
    const rowEnd = Math.round(ph * 1.065);
    const plants = [[0, 0, pw, rowEnd], [pw, 0, pw, rowEnd], [0, rowEnd, pw, sources.plants.height - rowEnd], [pw, rowEnd, pw, sources.plants.height - rowEnd]].map(box => trim(sources.plants, box));
    const oak = tile(1, 0, 0.64), across = makeCanvas(oak.height, oak.width), g = across.getContext("2d");
    g.translate(0, across.height); g.rotate(-Math.PI / 2); g.drawImage(oak, 0, 0);
    cache.set(atlas, {
      paper: tile(0, 0, 0.63), oak, across, floor: tile(2, 0, 0.66),
      carpet: tile(0, 1, 0.7), plaster: tile(1, 1, 0.28), glass: tile(2, 1, 0.65),
      palm: plants[0], fern: plants[1], flowers: plants[2], tools: plants[3],
      ivy: trim(sources.foliage, [42, 0, 257, 1024]),
      hanging: trim(sources.foliage, [320, 13, 882, 991]),
      leaves: [[1194, 28, 315, 417], [1212, 456, 298, 261], [1285, 731, 234, 285]].map(box => trim(sources.foliage, box)),
      specimens: laboratoryFrames(sources.herbarium, [0, 0.5, 1]),
      sconce: crop(sources.sconces, 250, 20, 383, 970, 0.85),
      stubHolder: crop(sources.sconces, 250, 470, 383, 520, 0.66),
      wax: crop(sources.sconces, 478, 150, 65, 135, 0.65),
    });
  }
  return cache.get(sources.surfaces);
}

export function botanicProp(ctx, image, x, foot, height) {
  const width = height * image.width / image.height;
  soft(ctx, x, foot + 1, width * 0.46, height * 0.035, "0,0,0", 0.55);
  ctx.drawImage(image, x - width / 2, foot - height, width, height);
}

export function paintPhotographicIvy(ctx, L) {
  const image = L.botanicMaterials?.ivy;
  if (!image) return false;
  const { P, wall, ceil, H, doorTop } = L;
  const overDoor = (side, z) => L.doors.some(d => d.side === side && z > d.z - 0.06 && z < d.z + 0.56);
  for (const side of [-1, 1]) {
    const X = side * wall;
    for (let z = 0.78; z < 4.5; z += 0.52) {
      paintProjectedMaterial(ctx, image, (u, v) => P(X, ceil + H * (0.012 + 0.035 * u), z + 0.5 * v), 1, 2, 6);
    }
    const starts = side < 0 ? [0.94, 1.84, 2.14, 2.78, 3.72, 4.12] : [1.08, 1.91, 2.7, 3.19, 3.87];
    starts.forEach((z, i) => {
      const bottom = Math.min(ceil + H * (0.2 + (i % 3) * 0.045), overDoor(side, z) ? doorTop - H * 0.13 : ceil + H * 0.37);
      paintProjectedMaterial(ctx, image, (u, v) => P(X, ceil + H * 0.02 + (bottom - ceil - H * 0.02) * v, z - 0.035 + 0.07 * u), 1, 3, 4);
    });
  }
  return true;
}
