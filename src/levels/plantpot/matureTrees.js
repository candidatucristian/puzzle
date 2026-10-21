import { makeCanvas, soft } from "../../shared/paint.js";

export const GARDEN_TREES = {
  key: "pp_mature_trees",
  url: "assets/images/PlantPot/mature-trees.webp",
};

// The two cutouts share the same scale and ground line. Keep their original
// leaf transparency while grading the photographic textures for moonlight.
const graded = new WeakMap();
function sprites(source) {
  if (graded.has(source)) return graded.get(source);
  const width = source.width / 2, height = source.height;
  const images = [0, 1].map(i => {
    const canvas = makeCanvas(width, height), g = canvas.getContext("2d");
    g.filter = "brightness(0.48) saturate(0.62)";
    g.drawImage(source, i * width, 0, width, height, 0, 0, width, height);
    g.filter = "none";
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(67,88,115,0.09)";
    g.fillRect(0, 0, width, height);
    return canvas;
  });
  graded.set(source, images);
  return images;
}

export function paintMatureTree(g, source, x, y, height, kind, light = 1) {
  const image = sprites(source)[kind];
  const h = height / 0.87, w = h * image.width / image.height * 1.16;
  const anchor = kind === 0 ? 0.46 : 0.615;
  soft(g, x - height * 0.025, y + 1, w * 0.22, height * 0.028, "0,5,5", 0.7);
  g.save();
  g.filter = `brightness(${light})`;
  g.drawImage(image, x - w * anchor, y - h * 0.916, w, h);
  g.restore();
}
