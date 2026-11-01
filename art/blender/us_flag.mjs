// The flag on the farmhouse porch in Before Sunrise (dawn_folk.py): the
// Stars and Stripes as a cotton flag a few summers old — thirteen stripes,
// fifty stars in their nine rows, the red gone a little brick and the white a
// little cream, the weave and a soft soiling in it. Drawn, not photographed.
//
//   node art/blender/us_flag.mjs   → .artifacts/rooms/us-flag.png
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");

const W = 2280, H = 1200;                 // 1.9 : 1, as the flag is
const stripe = H / 13, cantonW = W * 0.4, cantonH = stripe * 7;
const RED = "#9a2a2c", WHITE = "#e9e0cc", BLUE = "#26304f";
const star = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.382 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${WHITE}"/>`;
};
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
for (let i = 0; i < 13; i++) svg += `<rect x="0" y="${(i * stripe).toFixed(2)}" width="${W}" height="${(stripe + 0.6).toFixed(2)}" fill="${i % 2 ? WHITE : RED}"/>`;
svg += `<rect x="0" y="0" width="${cantonW}" height="${cantonH}" fill="${BLUE}"/>`;
// fifty stars: nine rows, six and five by turns
const gx = cantonW / 12, gy = cantonH / 10, r = stripe * 0.616 * 0.5;
for (let row = 0; row < 9; row++) {
  const n = row % 2 ? 5 : 6;
  for (let k = 0; k < n; k++) svg += star(gx * (row % 2 ? 2 + 2 * k : 1 + 2 * k), gy * (row + 1), r);
}
// the weave, a soft soiling toward the fly and the hem, a fold's wear
svg += `<defs>
  <filter id="weave" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="4" result="a"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.9" numOctaves="2" seed="9" result="b"/>
    <feBlend in="a" in2="b" mode="multiply" result="c"/>
    <feColorMatrix in="c" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0.3 0"/>
  </filter>
  <filter id="soil" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="4" seed="21"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0.32 -0.12"/>
  </filter>
  <linearGradient id="fly" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0.55" stop-color="#3a2a18" stop-opacity="0"/><stop offset="1" stop-color="#3a2a18" stop-opacity="0.28"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" filter="url(#weave)"/>
<rect width="${W}" height="${H}" filter="url(#soil)"/>
<rect width="${W}" height="${H}" fill="url(#fly)"/>
</svg>`;
mkdirSync(path(".artifacts/rooms"), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(path(".artifacts/rooms/us-flag.png"));
console.log("us-flag.png");
