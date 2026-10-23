// A room's renders (room_<name>.py → .artifacts/room-<name>) into the game
// (levels/house/roomRender.js): a plate for every way the room's lights can
// stand, and its gilt chest shut and open.
//
//   node art/blender/room_publish.mjs study Room1
//   node art/blender/room_publish.mjs library Room2
//   node art/blender/room_publish.mjs cabin Room3
//   node art/blender/room_publish.mjs counting Room4
//   node art/blender/room_publish.mjs drawing Room5
//   node art/blender/room_publish.mjs weighing Room8
import { createRequire } from "node:module";
import { mkdirSync, readdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const [name, folder] = process.argv.slice(2);
if (!name || !folder) throw new Error("usage: room_publish.mjs <room> <folder>");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(`.artifacts/room-${name}`), target = path(`public/assets/images/${folder}`);
mkdirSync(target, { recursive: true });
const prefix = folder.toLowerCase();
// (only what the game loads: the light plates, the chest, a room's own frames)
const PUBLISHED = /^(lights-[01]*|chest-(shut|open)|drawer-d+).png$/;
for (const file of readdirSync(source).filter((f) => PUBLISHED.test(f))) {
  const stem = file.replace(/\.png$/, "");
  const alpha = stem.startsWith("chest");
  await sharp(`${source}/${file}`).webp(alpha ? { quality: 92, alphaQuality: 100 } : { quality: 88 }).toFile(`${target}/${prefix}-${stem}-render-v1.webp`);
  console.log(`${prefix}-${stem}-render-v1.webp`);
}
