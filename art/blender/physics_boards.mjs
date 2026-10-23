// Orion's physics study, its flat things drawn in code for room_physics.py:
//   physics-slate.png   the slate on his wall: a wave drawn and drawn again,
//                       its crests marked, and a pendulum swung out on its
//                       string, its arc, its bob, in chalk
//   galvanometer.png    the galvanometer's dial: a scale either side of zero,
//                       its needle
//
//   node art/blender/physics_boards.mjs  →  .artifacts/rooms/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/rooms/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
let seed = 1887;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const W = 2400, H = 1400;

const path = (pts) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
let chalk = "";
// two waves, one over the other, the second drawn faster; their axes
for (const [y0, amp, k, x0, x1] of [[380, 150, 3.2, 140, 1300], [820, 110, 5.4, 140, 1300]]) {
  chalk += `<path d="M${x0 - 30},${y0} L${x1 + 40},${y0} M${x1 + 10},${y0 - 16} L${x1 + 40},${y0} L${x1 + 10},${y0 + 16}"/>`;
  chalk += `<path d="${path(Array.from({ length: 160 }, (_, i) => { const t = i / 159; return [x0 + (x1 - x0) * t, y0 - Math.sin(t * Math.PI * k) * amp * (1 - t * 0.15) + (rnd() - 0.5) * 3]; }))}"/>`;
  // a crest and its wavelength marked
  const l = (x1 - x0) * 2 / k;
  chalk += `<path d="M${x0 + l * 0.25},${y0 - amp - 30} L${x0 + l * 1.25},${y0 - amp - 30} M${x0 + l * 0.25},${y0 - amp - 44} L${x0 + l * 0.25},${y0 - amp - 16} M${x0 + l * 1.25},${y0 - amp - 44} L${x0 + l * 1.25},${y0 - amp - 16}"/>`;
  chalk += `<text x="${x0 + l * 0.7}" y="${y0 - amp - 52}" font-size="62" font-style="italic">λ</text>`;
}
// the pendulum: its support, the string swung out, the arc, the bob
const px = 1820, py = 180, len = 820, a = 0.42;
chalk += `<path d="M${px - 160},${py} L${px + 160},${py}"/>`;
for (let i = 0; i < 7; i++) chalk += `<path d="M${px - 150 + i * 48},${py} L${px - 180 + i * 48},${py - 34}"/>`;
chalk += `<path d="M${px},${py} L${px},${py + len}" stroke-dasharray="26 20"/>`;
const bx = px + Math.sin(a) * len, by = py + Math.cos(a) * len;
chalk += `<path d="M${px},${py} L${bx},${by}"/><circle cx="${bx}" cy="${by}" r="46"/>`;
chalk += `<path d="${path(Array.from({ length: 40 }, (_, i) => { const t = -a + (2 * a * i) / 39; return [px + Math.sin(t) * (len + 90), py + Math.cos(t) * (len + 90)]; }))}"/>`;
chalk += `<path d="${path(Array.from({ length: 16 }, (_, i) => { const t = (a * i) / 15; return [px + Math.sin(t) * 220, py + Math.cos(t) * 220]; }))}"/>`;
chalk += `<text x="${px + 70}" y="${py + 290}" font-size="60" font-style="italic">θ</text>`;
chalk += `<text x="${px + 210}" y="${py + 520}" font-size="60" font-style="italic">l</text>`;
let ghosts = "";
for (let i = 0; i < 18; i++) {
  const x = rnd() * W, y = rnd() * H, r = 160 + rnd() * 300;
  ghosts += `<path d="M${x - r},${y} A${r},${r * 0.5} 0 0 1 ${x + r},${y}" stroke-width="${70 + rnd() * 90}" opacity="${(0.008 + rnd() * 0.015).toFixed(3)}"/>`;
}
const slate = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Georgia, serif">
  <defs>
    <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5"/>
      <feComponentTransfer><feFuncA type="discrete" tableValues="0 0.6 0.85 1 1"/></feComponentTransfer>
    </filter>
    <filter id="slate"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.02" numOctaves="4" seed="5"/><feColorMatrix values="0 0 0 0 0.05  0 0 0 0 0.065  0 0 0 0 0.07  0 0 0 0.55 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#101414"/>
  <rect width="${W}" height="${H}" filter="url(#slate)"/>
  <g fill="none" stroke="#d8d8cf" stroke-linecap="round">${ghosts}</g>
  <g fill="none" stroke="#e4e3da" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#chalk)" opacity="0.88">${chalk.replace(/<text /g, '<text fill="#e4e3da" stroke="none" ')}</g>
</svg>`;
await sharp(Buffer.from(slate)).png().toFile(`${out}physics-slate.png`);

// the galvanometer's dial
const D = 800, c = D / 2;
let scale = "";
for (let i = -30; i <= 30; i++) {
  const t = (i / 30) * 1.0, r0 = c * 0.72, r1 = c * (i % 5 === 0 ? 0.6 : 0.66);
  const x0 = c + Math.sin(t) * r0, y0 = c * 1.15 - Math.cos(t) * r0, x1 = c + Math.sin(t) * r1, y1 = c * 1.15 - Math.cos(t) * r1;
  scale += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#1a1612" stroke-width="${i % 5 === 0 ? 5 : 2.5}"/>`;
  if (i % 10 === 0) scale += `<text x="${c + Math.sin(t) * c * 0.5}" y="${c * 1.15 - Math.cos(t) * c * 0.5 + 14}" font-size="40" text-anchor="middle" fill="#1a1612">${Math.abs(i)}</text>`;
}
const galvo = `<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}" font-family="Georgia, serif">
  <circle cx="${c}" cy="${c}" r="${c}" fill="#d6ccb0"/>
  <circle cx="${c}" cy="${c}" r="${c * 0.96}" fill="none" stroke="#7a6a48" stroke-width="6"/>
  ${scale}
  <text x="${c}" y="${c * 1.48}" font-size="44" text-anchor="middle" fill="#2a2016" letter-spacing="4">GALVANOMETER</text>
  <line x1="${c}" y1="${c * 1.15}" x2="${c + Math.sin(-0.18) * c * 0.74}" y2="${c * 1.15 - Math.cos(-0.18) * c * 0.74}" stroke="#1a1410" stroke-width="7" stroke-linecap="round"/>
  <circle cx="${c}" cy="${c * 1.15}" r="22" fill="#5a4a2a"/>
  <circle cx="${c * 0.7}" cy="${c * 0.5}" r="${c * 0.35}" fill="#fff" opacity="0.05"/>
</svg>`;
await sharp(Buffer.from(galvo)).png().toFile(`${out}galvanometer.png`);
console.log("physics-slate.png galvanometer.png");
