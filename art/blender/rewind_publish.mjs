// Rewind's windowsill (rewind_sill.py → .artifacts/rewind-sill) into the
// game: the plate as everything lies now; one atlas of what the game moves or
// reveals — the clock's two hands, the calendar's pages, the sand-glass with
// its sand gone back up, the candle grown back; and where it all falls in the
// picture (src/levels/rewind/rewindSill.json).
//
//   node art/blender/rewind_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/rewind-sill"), target = path("public/assets/images/Rewind");
mkdirSync(target, { recursive: true });
const sill = JSON.parse(readFileSync(`${source}/rewindSill.json`, "utf8"));
const PUZZLE = JSON.parse(readFileSync(path("src/levels/rewind/puzzle.json"), "utf8"));
const v = sill.version;

const plate = await sharp(`${source}/plate.png`).metadata();
const K = plate.width / sill.width;            // render pixels a reference pixel
await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/rewind-plate-v${v}.webp`);
console.log(`rewind-plate-v${v}.webp`);

// the pieces, each where its render was cut from
const pages = [];
for (let day = PUZZLE.calendar.from - 1; day >= PUZZLE.calendar.to; day--) pages.push(day);
const pieces = [
  ["hour", "hour"], ["minute", "minute"],
  ...pages.map((day) => [`page-${day}`, "page"]),
  ["glass", "glass"], ["candle", "candle"],
];
const items = [];
for (const [name, crop] of pieces) {
  const file = `${source}/${name}.png`, meta = await sharp(file).metadata();
  const [x, y] = sill.crops[crop];
  items.push({ name, file, w: meta.width, h: meta.height, box: [x / K, y / K, meta.width / K, meta.height / K].map((n) => +n.toFixed(3)) });
}
// packed in shelves, the tallest first
const ROW = 2048;
let cx = 0, cy = 0, shelf = 0, width = 0;
for (const it of [...items].sort((a, b) => b.h - a.h)) {
  if (cx + it.w > ROW) { cx = 0; cy += shelf + 2; shelf = 0; }
  it.frame = [cx, cy, it.w, it.h];
  cx += it.w + 2; shelf = Math.max(shelf, it.h); width = Math.max(width, cx);
}
const height = cy + shelf;
await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(items.map((it) => ({ input: it.file, left: it.frame[0], top: it.frame[1] })))
  .webp({ quality: 92, alphaQuality: 100 }).toFile(`${target}/rewind-pieces-v${v}.webp`);
console.log(`rewind-pieces-v${v}.webp`, `${width}×${height}`);

const piece = (name) => { const it = items.find((i) => i.name === name); return { box: it.box, frame: it.frame }; };
const layout = {
  version: v, width: sill.width, height: sill.height, safe: sill.safe, hit: sill.hit, atlas: [width, height],
  clock: { ...sill.clock, hour: piece("hour"), minute: piece("minute") },
  calendar: { box: piece(`page-${pages[0]}`).box, pages: Object.fromEntries(pages.map((day) => [day, piece(`page-${day}`).frame])) },
  glass: { ...sill.glass, ...piece("glass") },
  candle: { ...sill.candle, ...piece("candle") },
};
writeFileSync(path("src/levels/rewind/rewindSill.json"), JSON.stringify(layout, null, 1) + "\n");
console.log("rewindSill.json");
