// To the Line (room_weighing.py --view measures → .artifacts/measures-level)
// into the game: the plate; the flask alone, clear glass; its shadow alone on
// the slate; and where it all fell, with the camera that saw it
// (src/levels/measures/measuresLevel.json).
//
//   node art/blender/measures_level_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/measures-level"), target = path("public/assets/images/Measures");
mkdirSync(target, { recursive: true });
const level = JSON.parse(readFileSync(`${source}/measuresLevel.json`, "utf8"));
const v = level.version;
await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/sink-plate-v${v}.webp`);
await sharp(`${source}/flask.png`).webp({ quality: 94, alphaQuality: 100 }).toFile(`${target}/flask-v${v}.webp`);
await sharp(`${source}/flask-shadow.png`).webp({ quality: 90, alphaQuality: 100 }).toFile(`${target}/flask-shadow-v${v}.webp`);
delete level.flask.crop; delete level.flask.shadow.crop;
writeFileSync(path("src/levels/measures/measuresLevel.json"), JSON.stringify(level, null, 1) + "\n");
console.log(`sink-plate/flask/flask-shadow-v${v}.webp`, "measuresLevel.json");
