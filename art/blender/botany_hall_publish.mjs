// The botanic hall's Blender renders (botany_hall.py → .artifacts/botany-hall)
// laid out as the hall reads them (levels/hall/botanicMaterials.js) and
// written into the game:
//   hall-finishes-render-v1   the six 512 squares, 3 across, 2 down
//   hall-greenery-render-v1   six cut-outs: three over 0–0.545 of the height,
//                             split at 0.338 and 0.691; three under, split
//                             at 0.39 and 0.62 — each trimmed, fitted, set
//                             on its row's foot
//   walnut-door-render-v1, herbarium-frames-render-v1, hall-floor-render-v1
//                             as rendered
//   hall-sconce-render-v1     the sconce in the box the hall crops it from
//                             (250, 20, 383 × 970), its candle 0.68 across
//
//   node art/blender/botany_hall_publish.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const IN = (name) => path(`.artifacts/botany-hall/${name}`);
const OUT = (name) => path(`public/assets/images/Botany/${name}.webp`);
const clear = { r: 0, g: 0, b: 0, alpha: 0 };

// the finishes
const cells = await Promise.all([0, 1, 2, 3, 4, 5].map(async (k) => ({ input: await sharp(IN(`finish-${k}.png`)).resize(512, 512).toBuffer(), left: (k % 3) * 512, top: Math.floor(k / 3) * 512 })));
await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#000" } }).composite(cells).webp({ quality: 92 }).toFile(OUT("hall-finishes-render-v1"));

// the greenery, each in its own place
const W = 1536, H = 1024, rowEnd = Math.round(H * 0.545);
const places = [
  ...[[0, 0.338], [0.338, 0.691], [0.691, 1]].map(([a, b]) => ({ x0: a * W, x1: b * W, y0: 0, y1: rowEnd })),
  ...[[0, 0.39], [0.39, 0.62], [0.62, 1]].map(([a, b]) => ({ x0: a * W, x1: b * W, y0: rowEnd, y1: H })),
];
const parts = [];
for (let k = 0; k < 6; k++) {
  const cut = await sharp(IN(`plant-${k}.png`)).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const p = places[k], room = { w: (p.x1 - p.x0) * 0.9, h: (p.y1 - p.y0) * 0.92 };
  const s = Math.min(room.w / cut.info.width, room.h / cut.info.height);
  const w = Math.round(cut.info.width * s), h = Math.round(cut.info.height * s);
  parts.push({ input: await sharp(cut.data).resize(w, h).toBuffer(), left: Math.round((p.x0 + p.x1) / 2 - w / 2), top: Math.round(p.y1 - (p.y1 - p.y0) * 0.03 - h) });
}
await sharp({ create: { width: W, height: H, channels: 4, background: clear } }).composite(parts).webp({ quality: 92, alphaQuality: 100 }).toFile(OUT("hall-greenery-render-v1"));

// the door, the herbarium, the floor, as rendered
await sharp(IN("door.png")).webp({ quality: 92 }).toFile(OUT("walnut-door-render-v1"));
await sharp(IN("herbarium.png")).webp({ quality: 92, alphaQuality: 100 }).toFile(OUT("herbarium-frames-render-v1"));
await sharp(IN("floor.png")).webp({ quality: 92 }).toFile(OUT("hall-floor-render-v1"));

// the sconce, fitted to the box the hall crops, its candle where the hall
// draws the flame
const sc = JSON.parse(readFileSync(IN("sconce.json"), "utf8"));
const cut = await sharp(IN("sconce.png")).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
const box = { x: 250, y: 20, w: 383, h: 970 };
const s = Math.min(box.w / cut.info.width, box.h / cut.info.height);
const w = Math.round(cut.info.width * s), h = Math.round(cut.info.height * s);
const candleAt = (0 - sc.lo_x) / (sc.hi_x - sc.lo_x);
const left = Math.round(box.x + box.w * 0.68 - w * candleAt);
await sharp({ create: { width: 1536, height: 1024, channels: 4, background: clear } })
  .composite([{ input: await sharp(cut.data).resize(w, h).toBuffer(), left, top: box.y }])
  .webp({ quality: 92, alphaQuality: 100 }).toFile(OUT("hall-sconce-render-v1"));
console.log("published; the candle", candleAt.toFixed(3), "across its own width, at x", Math.round(left + w * candleAt), "of the box's", box.x + box.w * 0.68);
