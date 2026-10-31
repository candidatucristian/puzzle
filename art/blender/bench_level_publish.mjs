// The Apothecary's Bench (room_lab.py --view bench → .artifacts/bench-level)
// into the game: the plate; the cloth with the glass off it; the bottles three
// times the size, for the lens; and where it all falls in the picture
// (src/levels/chemistry/benchLevel.json).
//
//   node art/blender/bench_level_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/bench-level"), target = path("public/assets/images/Chemistry");
mkdirSync(target, { recursive: true });
const level = JSON.parse(readFileSync(`${source}/benchLevel.json`, "utf8"));
const v = level.version;
await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/bench-plate-v${v}.webp`);
await sharp(`${source}/cloth.png`).webp({ quality: 92 }).toFile(`${target}/bench-cloth-v${v}.webp`);
await sharp(`${source}/zoom.png`).webp({ quality: 90 }).toFile(`${target}/bench-zoom-v${v}.webp`);
delete level.loupe.crop; delete level.zoom.crop;
writeFileSync(path("src/levels/chemistry/benchLevel.json"), JSON.stringify(level, null, 1) + "\n");
console.log(`bench-plate/cloth/zoom-v${v}.webp`, "benchLevel.json");
