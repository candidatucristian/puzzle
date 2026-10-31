// The Lit Tree (room_drawing.py --view tree → .artifacts/tree-level) into the
// game: the plate; one atlas of the parcel opened and the three instruments;
// and where it all falls in the picture (src/levels/pi/treeLevel.json).
//
//   node art/blender/tree_level_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/tree-level"), target = path("public/assets/images/Pi");
mkdirSync(target, { recursive: true });
const level = JSON.parse(readFileSync(`${source}/treeLevel.json`, "utf8"));
const v = level.version;
await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/tree-plate-v${v}.webp`);
console.log(`tree-plate-v${v}.webp`);

const items = [{ name: "open", file: `${source}/open.png`, crop: level.gift.crop }]
  .concat(level.instruments.map((it, i) => ({ name: `instrument-${i}`, file: `${source}/instrument-${i}.png`, crop: it.crop })));
let x = 0, height = 0;
for (const it of items) { it.frame = [x, 0, it.crop[2], it.crop[3]]; x += it.crop[2] + 2; height = Math.max(height, it.crop[3]); }
await sharp({ create: { width: x, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(items.map((it) => ({ input: it.file, left: it.frame[0], top: 0 })))
  .webp({ quality: 92, alphaQuality: 100 }).toFile(`${target}/tree-pieces-v${v}.webp`);
console.log(`tree-pieces-v${v}.webp`, `${x}×${height}`);

level.gift.frame = items[0].frame; delete level.gift.crop;
level.instruments.forEach((it, i) => { it.frame = items[i + 1].frame; delete it.crop; });
writeFileSync(path("src/levels/pi/treeLevel.json"), JSON.stringify({ ...level, atlas: [x, height] }, null, 1) + "\n");
console.log("treeLevel.json");
