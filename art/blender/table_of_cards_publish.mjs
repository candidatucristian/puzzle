// Publish the rendered Blender Cycles PNGs from .artifacts/sequence/
// into public/assets/images/Sequence/ as high-quality WebP files.
//
//   node art/blender/table_of_cards_publish.mjs

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");

const root = (rel) =>
  decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(
    /^\/(\w:)/,
    "$1",
  );

const srcDir = root(".artifacts/sequence");
const dstDir = root("public/assets/images/Sequence");
mkdirSync(dstDir, { recursive: true });

await sharp(`${srcDir}/study.png`)
  .resize(1920, 1080, { fit: "cover" })
  .webp({ quality: 92, effort: 6 })
  .toFile(`${dstDir}/study-background.webp`);

await sharp(`${srcDir}/index-card.png`)
  .webp({ quality: 94, alphaQuality: 100, effort: 6 })
  .toFile(`${dstDir}/index-card.webp`);

await sharp(`${srcDir}/note-card.png`)
  .webp({ quality: 94, alphaQuality: 100, effort: 6 })
  .toFile(`${dstDir}/sticky-note-cutout.webp`);

await sharp(`${srcDir}/note-card.png`)
  .webp({ quality: 94, alphaQuality: 100, effort: 6 })
  .toFile(`${dstDir}/sticky-note.webp`);

await sharp(`${srcDir}/ledger-strip.png`)
  .webp({ quality: 94, alphaQuality: 100, effort: 6 })
  .toFile(`${dstDir}/ledger-strip.webp`);

console.log("Published Sequence Blender Cycles assets to public/assets/images/Sequence/");

