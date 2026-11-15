// Publishes decoder_icon.py's render for the game: the brass cipher wheel the
// hint drawer shows on the puzzles written in a code (hints.js).
//   public/assets/images/Interface/hint-decoder.webp   trimmed, 192px wide, transparent round it
//
//   node art/blender/decoder_icon_publish.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const root = fileURLToPath(new URL("../../", import.meta.url));
const trimmed = await sharp(`${root}.artifacts/decoder-icon/decoder.png`).trim({ threshold: 2 }).png().toBuffer();
await sharp(trimmed).resize({ width: 192 }).webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(`${root}public/assets/images/Interface/hint-decoder.webp`);
console.log("published hint-decoder.webp");
