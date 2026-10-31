// The counting frame (counting_frame.py → .artifacts/counting-frame) into the
// game: the plate without its blocks; every block at each of its three places
// cut out of the block renders, shadow and all, into one atlas — a column a
// block, a row a place; and where they all fall in the picture
// (src/levels/abacus/countingFrame.json).
//
//   node art/blender/counting_frame_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/counting-frame"), target = path("public/assets/images/Abacus");
mkdirSync(target, { recursive: true });
const layout = JSON.parse(readFileSync(`${source}/countingFrame.json`, "utf8"));
const v = layout.version;

await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/counting-frame-plate-v${v}.webp`);
console.log(`counting-frame-plate-v${v}.webp`);

const [width, height] = layout.atlas;
const pieces = [];
for (const block of layout.blocks) {
  for (const [place, at] of block.places.entries()) {
    const [left, top, w, h] = at.crop;
    const input = await sharp(`${source}/blocks-${place}.png`).extract({ left, top, width: w, height: h }).png().toBuffer();
    pieces.push({ input, left: at.frame[0], top: at.frame[1] });
    delete at.crop;
  }
}
await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(pieces).webp({ quality: 92, alphaQuality: 100 }).toFile(`${target}/counting-frame-blocks-v${v}.webp`);
console.log(`counting-frame-blocks-v${v}.webp`, `${width}×${height}`);

writeFileSync(path("src/levels/abacus/countingFrame.json"), JSON.stringify(layout, null, 1) + "\n");
console.log("countingFrame.json");
