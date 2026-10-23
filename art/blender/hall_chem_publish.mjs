// The chemist's hall's renders (hall_chem.py → .artifacts/hall-chem) into
// the game (levels/hall/hallRender.js):
//   hall-chem-render-v1        the hall, the bulb dark
//   hall-chem-lit-render-v1    the hall, the bulb alight
//   hall-chem-doors-render-v1  the same with nothing stood in it (their
//                              shadows kept), for a door to swing open with
//   hall-chem-front-render-v1  what stands in it, alone: the hall's own pixels
//                              where the front pass has something, so a
//                              swinging door slides under them unchanged
//   hall-chem-switch-render-v1 the knife switch's blades, a frame for every
//                              angle from fallen open to shut, and shut again
//                              with the bulb alight, side by side; and where
//                              the game lays them (levels/hall/hallSwitch.json)
//
//   node art/blender/hall_chem_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const IN = (name) => path(`.artifacts/hall-chem/${name}.png`);
const OUT = (name) => path(`public/assets/images/Chemistry/${name}.webp`);
mkdirSync(path("public/assets/images/Chemistry"), { recursive: true });

await sharp(IN("plate")).webp({ quality: 90 }).toFile(OUT("hall-chem-render-v1"));
await sharp(IN("lit")).webp({ quality: 90 }).toFile(OUT("hall-chem-lit-render-v1"));
await sharp(IN("doors")).webp({ quality: 90 }).toFile(OUT("hall-chem-doors-render-v1"));
// (sharp takes an alpha off last of all, so the colour is taken off first)
const alpha = await sharp(IN("front")).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
const colour = await sharp(IN("plate")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
await sharp(colour.data, { raw: colour.info }).joinChannel(alpha.data, { raw: alpha.info }).webp({ quality: 90, alphaQuality: 100 }).toFile(OUT("hall-chem-front-render-v1"));
// the switch's frames, in a row
const at = JSON.parse(readFileSync(path(".artifacts/hall-chem/switch.json"), "utf8"));
const names = [...Array.from({ length: at.frames }, (_, i) => `switch-${String(i).padStart(2, "0")}`), "switch-lit"];
const { width: fw, height: fh } = await sharp(IN(names[0])).metadata();
await sharp({ create: { width: fw * names.length, height: fh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(names.map((name, i) => ({ input: IN(name), left: i * fw, top: 0 })))
  .webp({ quality: 92, alphaQuality: 100 }).toFile(OUT("hall-chem-switch-render-v1"));
writeFileSync(path("src/levels/hall/hallSwitch.json"), JSON.stringify({ frameWidth: fw, frameHeight: fh, ...at }, null, 2) + "\n");
console.log("published; the switch in", names.length, "frames of", fw, "×", fh);
