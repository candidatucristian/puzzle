import { makeCanvas, soft } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

const ASSETS = {
  surfaces: { key: "botany_hall_finishes_v2", url: "assets/images/Botany/hall-finishes-v2.png" },
  plants: { key: "botany_hall_greenery_v2", url: "assets/images/Botany/hall-greenery-v2.png" },
  door: { key: "botany_hall_walnut_door_v2", url: "assets/images/Botany/walnut-door-v2.png" },
  herbarium: { key: "botany_hall_herbarium_photo", url: "assets/images/Botany/herbarium-frames.png" },
  sconces: { key: "hall_sconces_photo", url: "assets/images/Physics/observatory-fixtures.png" },
};
const cache = new WeakMap();
const FLOOR_PHOTO = { key: "botany_hall_floor_photographic_v3", url: "assets/images/Botany/hall-floor-photographic-v3.png" };

export function loadBotanicHallMaterials(scene) {
  for (const { key, url } of [...Object.values(ASSETS), FLOOR_PHOTO]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function botanicHallMaterials(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.surfaces)) {
    const crop = (source, x, y, w, h, brightness = 1) => {
      const c = makeCanvas(w, h), g = c.getContext("2d");
      g.filter = `brightness(${brightness})`;
      g.drawImage(source, x, y, w, h, 0, 0, w, h);
      return c;
    };
    // Keep real leaf colour and alpha; do not stack the laboratory's muted
    // colour grade on top of botanical photographs.
    const trim = (source, box) => {
      const raw = crop(source, ...box), g = raw.getContext("2d");
      const { data } = g.getImageData(0, 0, raw.width, raw.height);
      let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
      for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) {
        if (data[(y * raw.width + x) * 4 + 3] <= 12) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      return x1 < x0 ? raw : crop(raw, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    };
    const atlas = sources.surfaces, w = atlas.width / 3, h = atlas.height / 2;
    const tile = (col, row, brightness) => crop(atlas, col * w + 3, row * h + 3, w - 6, h - 6, brightness);
    const rowEnd = Math.round(sources.plants.height * 0.545);
    // Actual clear gap in this photograph lies below the equal-cell midpoint;
    // the three pot bases must stay attached to their plants.
    const plants = Array.from({ length: 6 }, (_, i) => {
      const boundaries = i < 3 ? [0, 0.338, 0.691, 1] : [0, 0.39, 0.62, 1], col = i % 3;
      const left = Math.round(boundaries[col] * sources.plants.width), right = Math.round(boundaries[col + 1] * sources.plants.width);
      return trim(sources.plants, [left, i < 3 ? 0 : rowEnd, right - left, i < 3 ? rowEnd : sources.plants.height - rowEnd]);
    });
    const oak = tile(1, 0, 1), across = makeCanvas(oak.height, oak.width), g = across.getContext("2d");
    g.translate(0, across.height); g.rotate(-Math.PI / 2); g.drawImage(oak, 0, 0);
    const grass = tile(0, 1, 0.94);
    const grassTiles = Array.from({ length: 4 }, (_, i) => {
      const c = makeCanvas(grass.width, grass.height), g = c.getContext("2d");
      // Adjacent edges share the same photo pixels, avoiding lawn squares.
      g.translate(i % 2 ? c.width : 0, i > 1 ? c.height : 0);
      g.scale(i % 2 ? -1 : 1, i > 1 ? -1 : 1);
      g.drawImage(grass, 0, 0);
      return c;
    });
    const door = crop(sources.door, 0, 0, sources.door.width, sources.door.height, 0.94);
    let photographicFloor = null;
    if (scene.textures.exists(FLOOR_PHOTO.key)) {
      const photo = scene.textures.get(FLOOR_PHOTO.key).getSourceImage();
      photographicFloor = makeCanvas(photo.width, photo.height);
      const g = photographicFloor.getContext("2d");
      g.filter = "brightness(0.9) saturate(0.84)";
      // Match the grass to the existing runner width, independent of the scan.
      // All three surfaces share their original photographed contact edges.
      const source = [0, 0.326, 0.676, 1], destination = [0, 0.3538, 0.6462, 1];
      for (let i = 0; i < 3; i++) {
        g.drawImage(photo, source[i] * photo.width, 0, (source[i + 1] - source[i]) * photo.width, photo.height,
          destination[i] * photo.width, 0, (destination[i + 1] - destination[i]) * photo.width, photo.height);
      }
    }
    cache.set(atlas, {
      paper: tile(0, 0, 0.84), oak, across, floor: tile(2, 0, 0.92),
      grass, grassTiles, door, photographicFloor,
      panel: crop(door, door.width * 0.08, door.height * 0.4, door.width * 0.39, door.height * 0.28),
      carpet: tile(0, 0, 0.7), plaster: tile(1, 1, 0.48), glass: tile(2, 1, 0.8),
      palm: plants[0], fern: plants[1], flowers: plants[2], hanging: plants[3], ivy: plants[4], tools: plants[5],
      specimens: [0, 1].map(i => trim(sources.herbarium, [sources.herbarium.width / 2 * i, 0, sources.herbarium.width / 2, sources.herbarium.height])),
      sconce: crop(sources.sconces, 250, 20, 383, 970, 0.85),
      stubHolder: crop(sources.sconces, 250, 470, 383, 520, 0.66),
      wax: crop(sources.sconces, 478, 150, 65, 135, 0.65),
    });
  }
  return cache.get(sources.surfaces);
}

// One continuous floor scan replaces the repeated plank and lawn patches.
// Its perspective follows the same floor plane as door sills and gate shadows.
export function paintBotanicFloor(ctx, L, far = 4.7) {
  const photo = L.botanicMaterials?.photographicFloor;
  if (L.theme !== "botanic" || !photo) return false;
  const { P, wall, floor } = L, near = 0.7;
  paintProjectedMaterial(ctx, photo, (u, v) => P(-wall + 2 * wall * u, floor, near + (far - near) * v), 1, 8, 64);
  return true;
}

// Living grass occupies the existing runner footprint. Its small photo tiles
// follow the floor's perspective, so distant blades shrink naturally.
export function paintBotanicGrass(ctx, L) {
  const materials = L.botanicMaterials;
  if (!materials?.grass) return false;
  const { P, wall, floor, H } = L, half = wall * 0.34 * 0.86;
  const grassY = floor - H * 0.003;
  for (const side of [-1, 1]) {
    paintProjectedMaterial(ctx, materials.across, (u, v) => P(side * (half + wall * (0.008 + 0.022 * u)), floor, 0.7 + 4 * v), 1, 2, 18);
  }
  for (let row = 0, z = 0.7; z < 4.7; row++, z += 0.4) {
    const end = Math.min(4.7, z + 0.4);
    for (let col = 0; col < 4; col++) {
      const x = -half + col * half / 2;
      paintProjectedMaterial(ctx, materials.grassTiles[(row % 2) * 2 + col % 2], (u, v) => P(x + half / 2 * u, grassY, z + (end - z) * v), 1, 2, 4);
    }
  }
  return true;
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
