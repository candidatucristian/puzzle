// Before Sunrise into the game and into Room IV: the picture (dawn_country.py)
// is what the room hangs — it becomes .artifacts/rooms/painting.png, which
// room_counting.py reads; and the picture framed on the wall (dawn_frame.py)
// is the level's plate (src/levels/wires/dawnFrame.json beside it).
//
//   node art/blender/dawn_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const target = path("public/assets/images/Wires");
mkdirSync(target, { recursive: true });
copyFileSync(path(".artifacts/dawn-country/picture.png"), path(".artifacts/rooms/painting.png"));
console.log("painting.png (for Room IV)");
const frame = JSON.parse(readFileSync(path(".artifacts/dawn-frame/dawnFrame.json"), "utf8"));
await sharp(path(".artifacts/dawn-frame/plate.png")).webp({ quality: 90 }).toFile(`${target}/dawn-frame-v${frame.version}.webp`);
console.log(`dawn-frame-v${frame.version}.webp`);
writeFileSync(path("src/levels/wires/dawnFrame.json"), JSON.stringify(frame, null, 1) + "\n");
console.log("dawnFrame.json");
