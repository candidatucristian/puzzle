// The Ashcombes' arms, as a mason would cut them over the door: a shield
// with a chevron between three roses, a helm-less crest of oak leaves over
// it, a scroll beneath with the family's motto. Drawn in code as a height
// map (white stands proud), for manor.py to carve in stone.
//
//   node art/blender/arms.mjs  →  .artifacts/manor/arms.png
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/manor/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
const S = 1024, C = 512;

const rose = (x, y, r) => {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += `<circle cx="${(x + Math.cos(a) * r * 0.55).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.55).toFixed(1)}" r="${(r * 0.5).toFixed(1)}"/>`;
  }
  return s + `<circle cx="${x}" cy="${y}" r="${r * 0.32}" fill="#000"/><circle cx="${x}" cy="${y}" r="${r * 0.2}"/>`;
};
const leaf = (x, y, a, l) => `<ellipse cx="0" cy="${-l / 2}" rx="${l * 0.22}" ry="${l / 2}" transform="translate(${x},${y}) rotate(${a})"/>`;
let crest = "";
for (let i = 0; i < 9; i++) crest += leaf(C + (i - 4) * 34, 228 - Math.abs(i - 4) * 10, (i - 4) * 18, 92);
let mantling = "";
for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
  const x = C + s * (300 + i * 22), y = 330 + i * 92;
  mantling += `<path d="M${C + s * 250},${y - 40} C${x},${y - 80} ${x + s * 60},${y} ${x - s * 20},${y + 40}" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round"/>`;
}
const shield = `M${C - 230},290 L${C + 230},290 L${C + 230},560 C${C + 230},700 ${C + 120},780 ${C},830 C${C - 120},780 ${C - 230},700 ${C - 230},560 Z`;
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="100%" height="100%" fill="#000"/>${body}</svg>`);
const layer = async (body, blur) => {
  let p = sharp(svg(body)).greyscale(); if (blur) p = p.blur(blur);
  const { data, info } = await p.raw().toBuffer({ resolveWithObject: true });
  const a = new Float32Array(S * S); for (let i = 0; i < S * S; i++) a[i] = data[i * info.channels] / 255; return a;
};
// the shield's field, its rim; the chevron and the roses on it; the crest,
// the mantling, the scroll and its motto
const field = await layer(`<path d="${shield}" fill="#fff"/>`, 3);
const rim = await layer(`<path d="${shield}" fill="none" stroke="#fff" stroke-width="22"/>`, 2.5);
const charges = await layer(`<g fill="#fff"><path d="M${C - 230},640 L${C},420 L${C + 230},640 L${C + 230},720 L${C},500 L${C - 230},720 Z"/>${rose(C - 125, 380, 52)}${rose(C + 125, 380, 52)}${rose(C, 690, 52)}</g>`, 2.5);
const chargesDome = await layer(`<g fill="#fff"><path d="M${C - 230},640 L${C},420 L${C + 230},640 L${C + 230},720 L${C},500 L${C - 230},720 Z"/>${rose(C - 125, 380, 52)}${rose(C + 125, 380, 52)}${rose(C, 690, 52)}</g>`, 10);
const top = await layer(`<g fill="#fff">${crest}</g>${mantling}`, 4);
const scroll = await layer(`<path d="M${C - 330},880 Q${C},840 ${C + 330},880 L${C + 340},950 Q${C},910 ${C - 340},950 Z" fill="#fff"/><circle cx="${C - 345}" cy="915" r="34" fill="#fff"/><circle cx="${C + 345}" cy="915" r="34" fill="#fff"/>`, 3);
const motto = await layer(`<text x="${C}" y="925" font-family="Georgia, serif" font-weight="bold" font-size="46" letter-spacing="6" text-anchor="middle" fill="#fff">LUX · IN · TENEBRIS</text>`, 1.2);
const H = Buffer.alloc(S * S);
for (let i = 0; i < S * S; i++) {
  let h = 0.18 * field[i] + 0.22 * rim[i] + charges[i] * (0.12 + 0.2 * chargesDome[i]) + 0.32 * top[i] + 0.3 * scroll[i] - 0.12 * motto[i] * scroll[i];
  H[i] = Math.max(0, Math.min(255, Math.round(h * 255)));
}
await sharp(H, { raw: { width: S, height: S, channels: 1 } }).png().toFile(`${out}arms.png`);
console.log("arms", `${out}arms.png`);
