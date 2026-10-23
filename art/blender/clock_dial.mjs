// The long-case clock's dial, drawn in code: an enamelled ring of Roman hours
// and a minute track inside a brass square with engraved spandrels, the
// hands at twenty to ten. For hall_ground.py.
//
//   node art/blender/clock_dial.mjs  →  .artifacts/hall/dial.png
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/hall/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
const S = 1024, C = 512, R = 400;
const roman = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs><radialGradient id="enamel" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#f4ecd8"/><stop offset="1" stop-color="#d9ccae"/></radialGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b08a3e"/><stop offset=".5" stop-color="#7a5a22"/><stop offset="1" stop-color="#a07c34"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#brass)"/>`;
// the spandrels: a scroll of leaves in each corner
for (const [x, y, a] of [[0, 0, 0], [S, 0, 90], [S, S, 180], [0, S, 270]]) {
  s += `<g transform="translate(${x},${y}) rotate(${a})" fill="none" stroke="#4a3410" stroke-width="7" opacity=".7">
    <path d="M30,150 C60,60 120,40 160,30"/><path d="M60,120 q30,-40 70,-30"/><circle cx="70" cy="70" r="26"/><path d="M40,40 l50,50"/></g>`;
}
s += `<circle cx="${C}" cy="${C}" r="${R + 20}" fill="#5a4214"/><circle cx="${C}" cy="${C}" r="${R}" fill="url(#enamel)"/>`;
// the minute track, the hours
for (let i = 0; i < 60; i++) {
  const a = (i / 60) * Math.PI * 2, r0 = R - 22, r1 = R - (i % 5 ? 34 : 44);
  s += `<line x1="${C + Math.sin(a) * r0}" y1="${C - Math.cos(a) * r0}" x2="${C + Math.sin(a) * r1}" y2="${C - Math.cos(a) * r1}" stroke="#1a1410" stroke-width="${i % 5 ? 3 : 6}"/>`;
}
s += `<circle cx="${C}" cy="${C}" r="${R - 22}" fill="none" stroke="#1a1410" stroke-width="2"/><circle cx="${C}" cy="${C}" r="${R - 46}" fill="none" stroke="#1a1410" stroke-width="2"/>`;
roman.forEach((t, i) => {
  const a = (i / 12) * Math.PI * 2, r = R - 102;
  const x = C + Math.sin(a) * r, y = C - Math.cos(a) * r;
  s += `<text x="${x}" y="${y}" transform="rotate(${(i / 12) * 360} ${x} ${y})" font-family="Georgia, serif" font-size="68" text-anchor="middle" dominant-baseline="central" fill="#16110c">${t}</text>`;
});
// the hands, blued steel
const hand = (deg, len, w) => `<path transform="rotate(${deg} ${C} ${C})" d="M${C - w},${C + 40} L${C - w * 0.5},${C - len + 30} L${C},${C - len} L${C + w * 0.5},${C - len + 30} L${C + w},${C + 40} Z" fill="#141a26"/>`;
s += hand(-58, 220, 12) + hand(48, 320, 8) + `<circle cx="${C}" cy="${C}" r="16" fill="#141a26"/>`;
s += `</svg>`;
await sharp(Buffer.from(s)).png().toFile(`${out}dial.png`);
console.log("dial");
