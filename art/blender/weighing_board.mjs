// The chemist's blackboard, for room_weighing.py: black slate with the ghosts
// of old wiping on it, and three lines of his writing in chalk — joined-up
// hand, a plus, an arrow, a few figures — seen from the door, not read: the
// reactions themselves are the equations puzzle's, on its own board.
//
//   node art/blender/weighing_board.mjs  →  .artifacts/rooms/weighing-board.png
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/rooms/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
let seed = 1869;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const W = 2048, H = 1500;

// a word in a quick joined-up hand: loops and strokes along a baseline
function word(x, y, len, size) {
  let d = `M${x.toFixed(1)},${y.toFixed(1)}`, cx = x;
  while (cx < x + len) {
    const w = size * (0.35 + rnd() * 0.45), up = size * (rnd() < 0.22 ? 1.5 : 0.6 + rnd() * 0.35), dip = rnd() < 0.12 ? size * 0.7 : 0;
    d += ` C${(cx + w * 0.2).toFixed(1)},${(y - up).toFixed(1)} ${(cx + w * 0.75).toFixed(1)},${(y - up).toFixed(1)} ${(cx + w * 0.55).toFixed(1)},${(y + dip * 0.3).toFixed(1)}`;
    d += ` S${(cx + w).toFixed(1)},${(y + dip).toFixed(1)} ${(cx + w * 1.05).toFixed(1)},${(y - size * 0.05).toFixed(1)}`;
    cx += w;
  }
  return `<path d="${d}"/>`;
}
const sign = {
  plus: (x, y, s) => `<path d="M${x},${y - s * 0.4} L${x},${y + s * 0.4} M${x - s * 0.4},${y} L${x + s * 0.4},${y}"/>`,
  arrow: (x, y, s) => `<path d="M${x - s},${y} L${x + s},${y} M${x + s * 0.6},${y - s * 0.3} L${x + s},${y} L${x + s * 0.6},${y + s * 0.3}"/>`,
};
let chalk = "";
for (let line = 0; line < 3; line++) {
  const y = H * (0.28 + line * 0.21) + (rnd() - 0.5) * 18, size = 54 + rnd() * 8;
  let x = W * 0.08 + rnd() * 30;
  const pieces = ["w", "plus", "w", "arrow", "w", "plus", "w"];
  for (const p of pieces) {
    if (p === "w") { const len = 120 + rnd() * 170; chalk += word(x, y, len, size); x += len + 50; }
    else { chalk += sign[p](x + 30, y - size * 0.3, size * 0.55); x += 110; }
    if (x > W * 0.92) break;
  }
}
// the ghosts of old writing wiped off, and the duster's arcs
let ghosts = "";
for (let i = 0; i < 26; i++) {
  const x = rnd() * W, y = rnd() * H, r = 120 + rnd() * 260;
  ghosts += `<path d="M${x - r},${y} A${r},${r * 0.6} 0 0 1 ${x + r},${y}" stroke-width="${60 + rnd() * 90}" opacity="${(0.008 + rnd() * 0.016).toFixed(3)}"/>`;
}
for (let i = 0; i < 6; i++) ghosts += word(rnd() * W * 0.7, rnd() * H, 300 + rnd() * 400, 50).replace("<path", `<path opacity="0.07"`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5"/>
      <feComponentTransfer><feFuncA type="discrete" tableValues="0 0.6 0.85 1 1"/></feComponentTransfer>
    </filter>
    <filter id="slate"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.02" numOctaves="4" seed="3"/><feColorMatrix values="0 0 0 0 0.05  0 0 0 0 0.075  0 0 0 0 0.07  0 0 0 0.55 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#0d1512"/>
  <rect width="${W}" height="${H}" filter="url(#slate)"/>
  <g fill="none" stroke="#d8d8cf" stroke-linecap="round">${ghosts}</g>
  <g fill="none" stroke="#e2e1d8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#chalk)" opacity="0.86">${chalk}</g>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(`${out}weighing-board.png`);
console.log("weighing-board.png");
