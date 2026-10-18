import { makeCanvas } from "../../shared/paint.js";

const ASSETS = {
  backdrop: { key: "attic_passage_wood_v3", url: "assets/images/Attic/narrow-passage-wood-v3.png" },
  details: { key: "attic_details_photo", url: "assets/images/Attic/details.png" },
  door: { key: "attic_worn_door_photo_v1", url: "assets/images/Attic/walnut-door-worn-v1.png" },
};
const cache = new WeakMap();

export function loadAtticMaterials(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function atticMaterials(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.backdrop)) {
    const crop = (source, x, y, w, h, brightness = 1) => {
      const c = makeCanvas(w, h), g = c.getContext("2d");
      g.filter = `brightness(${brightness}) saturate(0.92)`;
      g.drawImage(source, x, y, w, h, 0, 0, c.width, c.height);
      return c;
    };
    const trim = (source, box) => {
      const raw = crop(source, ...box), g = raw.getContext("2d");
      const { data } = g.getImageData(0, 0, raw.width, raw.height);
      let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
      for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) {
        if (data[(y * raw.width + x) * 4 + 3] <= 12) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      return x1 < x0 ? raw : crop(raw, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0.9);
    };
    const wood = sources.door;
    const oak = crop(wood, 6, 6, wood.width * 0.068, wood.height - 12, 0.43);
    const across = makeCanvas(oak.height, oak.width), g = across.getContext("2d");
    g.translate(0, across.height); g.rotate(-Math.PI / 2); g.drawImage(oak, 0, 0);
    const lantern = trim(sources.details, [sources.details.width * 0.72, 0, sources.details.width * 0.28, sources.details.height]);
    cache.set(sources.backdrop, {
      backdrop: sources.backdrop, oak, across, lantern,
      door: crop(wood, 0, 0, wood.width, wood.height, 0.48),
    });
  }
  return cache.get(sources.backdrop);
}
