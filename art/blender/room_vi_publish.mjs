// Room VI's live plates, from room_vi_live.py's renders (.artifacts/room-vi-live)
// into the game: webp, the depth losslessly (its bytes are a number).
//
//   node art/blender/room_vi_publish.mjs
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const root = new URL("../../", import.meta.url);
const from = (name) => new URL(`.artifacts/room-vi-live/${name}`, root);
const to = (name) => new URL(`public/assets/images/Room6/live/${name}`, root);
const path = (url) => decodeURIComponent(url.pathname).replace(/^\/(\w:)/, "$1");

for (const name of ["plate", "plate-dim"]) {
  await sharp(path(from(`${name}.png`))).webp({ quality: 90 }).toFile(path(to(`${name}.webp`)));
}
await sharp(path(from("glass.png"))).webp({ quality: 92 }).toFile(path(to("glass.webp")));
await sharp(path(from("depth.png"))).webp({ lossless: true }).toFile(path(to("depth.webp")));
console.log("published");
