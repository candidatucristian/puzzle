// Two Phials (room_lab.py --view phials → .artifacts/phials-level) into the
// game: the plate, the rack standing empty; one atlas of the three tubes and
// the rack's upper board; and where they all fall in the picture
// (src/levels/phials/phialsLevel.json).
//
//   node art/blender/phials_level_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/phials-level"), target = path("public/assets/images/Phials");
mkdirSync(target, { recursive: true });
const level = JSON.parse(readFileSync(`${source}/phialsLevel.json`, "utf8"));
const v = level.version;
await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/phials-plate-v${v}.webp`);
const items = level.tubes.map((t, i) => ({ file: `${source}/tube-${i}.png`, crop: t.crop, at: t }))
  .concat([{ file: `${source}/board.png`, crop: level.board.crop, at: level.board }]);
let x = 0, height = 0;
for (const it of items) { it.at.frame = [x, 0, it.crop[2], it.crop[3]]; x += it.crop[2] + 2; height = Math.max(height, it.crop[3]); delete it.at.crop; }
await sharp({ create: { width: x, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(items.map((it) => ({ input: it.file, left: it.at.frame[0], top: 0 })))
  .webp({ quality: 94, alphaQuality: 100 }).toFile(`${target}/phials-pieces-v${v}.webp`);
writeFileSync(path("src/levels/phials/phialsLevel.json"), JSON.stringify({ ...level, atlas: [x, height] }, null, 1) + "\n");
console.log(`phials-plate-v${v}.webp`, `phials-pieces-v${v}.webp`, "phialsLevel.json");
