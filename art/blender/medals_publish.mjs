// The Trophy Wall's medals and ribbons (medals_real.py, medal_ribbons.py →
// .artifacts/medals-real) into the game (flags/trophies.js):
//   trophy-medal-faces-render-v2   the five medals in a strip of square cells,
//                                  left to right as they hang (DE BR IE FI NG)
//   trophy-brazil-medal-render-v2  the Brazilian one, enamelled
//   trophy-ribbon-<CODE>-render-v2 each ribbon in the box its medal hangs it in
//
//   node art/blender/medals_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const IN = (name) => path(`.artifacts/medals-real/${name}.png`);
const OUT = (name) => path(`public/assets/images/Flags/${name}.webp`);
mkdirSync(path("public/assets/images/Flags"), { recursive: true });

const CELL = 512, ORDER = ["de_leaf", "br_fern", "ie_shamrock", "fi_sprig", "ng_flower"];
const cells = await Promise.all(ORDER.map((n) => sharp(IN(n)).resize(CELL, CELL).png().toBuffer()));
await sharp({ create: { width: CELL * ORDER.length, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(cells.map((input, i) => ({ input, left: i * CELL, top: 0 })))
  .webp({ quality: 94, alphaQuality: 100 }).toFile(OUT("trophy-medal-faces-render-v2"));
await sharp(IN("br_flag")).resize(CELL, CELL).webp({ quality: 94, alphaQuality: 100 }).toFile(OUT("trophy-brazil-medal-render-v2"));
for (const code of ["DE", "BR", "IE", "FI", "NG"])
  await sharp(IN(`ribbon-${code}-render`)).webp({ quality: 93, alphaQuality: 100 }).toFile(OUT(`trophy-ribbon-${code}-render-v2`));
console.log("medals and ribbons: v2");
