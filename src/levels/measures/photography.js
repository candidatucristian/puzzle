import { makeCanvas, vignette } from "../../shared/paint.js";
import { onScreen } from "../../shared/phaserRain.js";

const ROOM = "measures_laboratory_photo_v1";
const GLASS = "measures_glass_photo_v1";
const glassCache = new WeakMap();
// Bounds in the 1536 × 1024 source atlas. The flask's bulb crosses the
// nominal third-column boundary, so equal-width cells would mix two vessels.
const GLASS_BOUNDS = [[96, 200, 385, 785], [594, 296, 337, 691], [1005, 10, 493, 981]];

export function loadMeasuresPhotography(scene) {
  for (const [key, file] of [[ROOM, "laboratory-sink-v1.webp"], [GLASS, "laboratory-glass-v1.webp"]]) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Measures/${file}`);
  }
}

// The window over the sink, in the photograph's pixels (1586 x 992): its four
// panes, the oil can standing on the sill in front of the last of them, and
// the foot of the window, which nothing carried is lifted past.
const PHOTO = { width: 1586, height: 992 };
const WINDOW_PANES = [
  [[597, 0], [737, 0], [737, 158], [597, 158]],
  [[748, 0], [890, 0], [890, 158], [748, 158]],
  [[900, 0], [1047, 0], [1047, 158], [900, 158]],
  [[1060, 0], [1201, 0], [1201, 158], [1060, 158]],
];
const OIL_CAN = [[1129, 111], [1136, 109], [1192, 121], [1203, 121], [1203, 162], [1166, 162], [1170, 150],
  [1184, 147], [1186, 132], [1130, 118]];
const SILL = 176;

export function alignMeasuresPhotography(scene, L) {
  if (!scene.textures.exists(ROOM)) return;
  L.photographic = true;
  L.tap = { x: L.W * .16, spout: { x: L.W * .201, y: L.H * .366 } };
  L.sink = { x0: L.W * .025, x1: L.W * .33, y: L.H * .53 };
  L.sink.drain = { x: L.W * .186, y: L.H * .723 };
  L.sink.hitY = L.H * .65;
  L.sink.hitH = L.H * .20;
  L.sill = L.H * SILL / PHOTO.height;
  L.rain = {
    panes: WINDOW_PANES.map((points) => onScreen(points, PHOTO, L.W, L.H)),
    cutouts: [onScreen(OIL_CAN, PHOTO, L.W, L.H)],
    drop: Math.max(0.5, (L.W / 1920) * 0.85), fog: 0.5, reach: 24, beyond: 0.5,
    // the moon, over the trees; the lamp on the wall, warm, on the right
    lights: [
      { dir: [-0.1, -0.75, 0.65], colour: [0.14, 0.18, 0.25] },
      { dir: [0.75, -0.15, 0.65], colour: [0.26, 0.17, 0.08] },
    ],
    seed: 9902,
  };
}

export function photographRoom(scene, L) {
  if (!L.photographic) return null;
  const canvas = makeCanvas(L.W, L.H), g = canvas.getContext("2d");
  g.filter = "brightness(.78) saturate(.8)";
  g.drawImage(scene.textures.get(ROOM).getSourceImage(), 0, 0, L.W, L.H);
  g.filter = "none";
  vignette(g, L.W, L.H, .22);
  return canvas;
}

export function photographGlass(scene, index) {
  if (!scene.textures.exists(GLASS)) return null;
  const image = scene.textures.get(GLASS).getSourceImage();
  if (!glassCache.has(image)) {
    const vessels = GLASS_BOUNDS.map(([x, y, w, h]) => {
      const sx = image.width / 1536, sy = image.height / 1024;
      const width = Math.ceil(w * sx), height = Math.ceil(h * sy);
      const cell = makeCanvas(width, height), g = cell.getContext("2d");
      g.drawImage(image, x * sx, y * sy, w * sx, h * sy, 0, 0, width, height);
      const data = g.getImageData(0, 0, width, height).data;
      let x0 = width, y0 = height, x1 = -1, y1 = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] < 18) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (x1 < x0) return null;
      const crop = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
      crop.getContext("2d").drawImage(cell, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
      return crop;
    });
    glassCache.set(image, vessels);
  }
  return glassCache.get(image)[index];
}
