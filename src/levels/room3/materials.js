import { makeCanvas } from "../../shared/paint.js";

const ATLAS = "r3_surface_atlas", PORT = "r3_porthole_photo";
const cache = new WeakMap();

export function loadRoom3Materials(scene) {
  if (!scene.textures.exists(ATLAS)) scene.load.image(ATLAS, "assets/images/Room3/surface-atlas.png");
  if (!scene.textures.exists(PORT)) scene.load.image(PORT, "assets/images/Room3/porthole-real.png");
}

export function room3Materials(scene) {
  if (!scene.textures.exists(ATLAS)) return null;
  const atlas = scene.textures.get(ATLAS).getSourceImage();
  if (!cache.has(atlas)) {
    const w = atlas.width / 3, h = atlas.height / 2;
    const swatch = (col, row, filter) => {
      const canvas = makeCanvas(w - 6, h - 6), g = canvas.getContext("2d");
      g.filter = filter;
      g.drawImage(atlas, col * w + 3, row * h + 3, w - 6, h - 6, 0, 0, canvas.width, canvas.height);
      return canvas;
    };
    const wall = swatch(0, 0, "brightness(0.5) saturate(0.7)");
    const navy = swatch(1, 0, "brightness(0.78) saturate(0.8)");
    const oak = swatch(2, 0, "brightness(0.64) saturate(0.75)");
    const walnut = swatch(0, 1, "brightness(0.88) saturate(0.75)");
    const across = makeCanvas(walnut.height, walnut.width), g = across.getContext("2d");
    g.translate(0, across.height);
    g.rotate(-Math.PI / 2);
    g.drawImage(walnut, 0, 0);
    const deckPlanks = Array.from({ length: 8 }, (_, i) => {
      const canvas = makeCanvas(112, oak.height), g = canvas.getContext("2d");
      g.drawImage(oak, 8 + i * 48, 0, 112, oak.height, 0, 0, 112, oak.height);
      return canvas;
    });
    cache.set(atlas, {
      detailed: true,
      wallBoards: repeat(wall),
      dado: repeat(navy),
      wood: repeat(oak),
      furniture: walnut,
      beamWood: across,
      deckPlanks,
      plaster: repeat(swatch(0, 0, "brightness(0.22) saturate(0.5)")),
      rug: swatch(1, 1, "brightness(0.82) saturate(0.75)"),
      chart: swatch(2, 1, "brightness(0.76) saturate(0.72)"),
      porthole: scene.textures.exists(PORT) ? scene.textures.get(PORT).getSourceImage() : null,
    });
  }
  return cache.get(atlas);
}

// Mirrored joins retain the photographed grain without adding board seams;
// the room's existing geometry supplies the seams and the perspective.
function repeat(tile) {
  const { width: w, height: h } = tile;
  const canvas = makeCanvas(w * 2, h * 2), g = canvas.getContext("2d");
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    g.save();
    g.translate(col ? w * 2 : 0, row ? h * 2 : 0);
    g.scale(col ? -1 : 1, row ? -1 : 1);
    g.drawImage(tile, 0, 0);
    g.restore();
  }
  return canvas;
}
