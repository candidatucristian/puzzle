// A room's renders (room_<name>.py → .artifacts/room-<name>) into the game
// (levels/house/roomRender.js): the room under its one light, its gilt chest
// shut and open, and the frames of anything in it that moves.
//
//   node art/blender/room_publish.mjs study Room1
//   node art/blender/room_publish.mjs library Room2
//   node art/blender/room_publish.mjs cabin Room3
//   node art/blender/room_publish.mjs counting Room4
//   node art/blender/room_publish.mjs drawing Room5
//   node art/blender/room_publish.mjs lab Room7
//   node art/blender/room_publish.mjs weighing Room8
//   node art/blender/room_publish.mjs nine Room9
//   node art/blender/room_publish.mjs ten Room10
//   node art/blender/room_publish.mjs physics Room11
//   node art/blender/room_publish.mjs archive Room12
//   node art/blender/room_publish.mjs workshop Room13
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
// (only what the game loads: the plate, the chest, a room's own frames)
const PUBLISHED = /^(lights-1|chest-(shut|open)|drawer-\d+|notebook-\d+)\.png$/;
for (const file of readdirSync(source).filter((f) => PUBLISHED.test(f))) {
  const stem = file.replace(/\.png$/, "");
  const alpha = stem.startsWith("chest");
  await sharp(`${source}/${file}`).webp(alpha ? { quality: 92, alphaQuality: 100 } : { quality: 88 }).toFile(`${target}/${prefix}-${stem}-render-v1.webp`);
  console.log(`${prefix}-${stem}-render-v1.webp`);
}
