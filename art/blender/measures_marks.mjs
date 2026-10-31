// What is etched on the volumetric flask by the sink (room_weighing.py): its
// measure, 400 ml, and the temperature it is true at, frosted white into the
// glass of its bulb, to be laid round the bulb's front (the ring on its neck
// is the script's own).
//
//   node art/blender/measures_marks.mjs  →  .artifacts/rooms/measures-flask.png
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/rooms/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
const W = 1120, H = 600;   // (the patch on the bulb: as wide as it is round, as tall as it is high)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <g fill="rgba(240,244,244,0.92)" font-family="Georgia, 'Times New Roman', serif" text-anchor="middle">
    <text x="${W / 2}" y="${H * 0.46}" font-size="230" letter-spacing="4">400 ml</text>
    <text x="${W / 2}" y="${H * 0.82}" font-size="120" letter-spacing="3">20 °C</text>
  </g>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(`${out}measures-flask.png`);
console.log("measures-flask.png");
