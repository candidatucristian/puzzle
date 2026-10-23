// The library's four clocks' faces, from the puzzle's own times
// (src/levels/overtime/puzzle.js OVERTIME_CLOCKS), for room_library.py: each
// face's lit segments (glowing, while the clocks have their light) and its
// unlit ones (faint, always there behind the glass). Four digits and a colon,
// in seven bars each, laid out as the room's painting had them (room2.js
// showTime). The travel clock is a liquid-crystal one: dark figures on a pale
// face that is only lit while the clocks are.
//
//   node art/blender/clock_faces.mjs  →  .artifacts/rooms/clock-<n>-lit.png, -dim.png
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { OVERTIME_CLOCKS } from "../../src/levels/overtime/puzzle.js";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/rooms/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });

const BARS = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
// the faces: which time, its lit colour, its unlit colour, its ground, and
// whether its colon is drawn lit (the wall clock's goes on and off, live)
const FACES = [
  { time: OVERTIME_CLOCKS[0], lit: "#ff3a22", dim: "#3a0c08", ground: "#000000", colon: false },
  { time: OVERTIME_CLOCKS[1], lit: "#5cff9e", dim: "#0c2a18", ground: "#000000", colon: true },
  { time: OVERTIME_CLOCKS[2], lit: "#ffa530", dim: "#3a2408", ground: "#000000", colon: true },
  { time: OVERTIME_CLOCKS[3], lit: "#141a12", dim: "#141a12", ground: "#b4bea2", colon: true, lcd: true },
];
const W = 1024, H = 384;
// a bar, as a long hexagon with its ends drawn to points
function bar(x, y, len, th, upright) {
  const t = th / 2;
  if (upright) return `M${x},${y} L${x + t},${y + t} L${x + t},${y + len - t} L${x},${y + len} L${x - t},${y + len - t} L${x - t},${y + t} Z`;
  return `M${x},${y} L${x + t},${y - t} L${x + len - t},${y - t} L${x + len},${y} L${x + len - t},${y + t} L${x + t},${y + t} Z`;
}
function digitPaths(x0, digit, width, height, th, slant) {
  const on = BARS[digit], w = width, h = height, m = h / 2, paths = [];
  const k = (yy) => x0 + (h - yy) * slant;   // (leaning a little forward, as such figures do)
  const seg = { a: [k(0) + th * 0.6, 0, w - th * 1.2, false], g: [k(m) + th * 0.6, m, w - th * 1.2, false], d: [k(h) + th * 0.6, h, w - th * 1.2, false],
    f: [k(th * 0.6), th * 0.6, m - th * 1.2, true], e: [k(m + th * 0.6), m + th * 0.6, m - th * 1.2, true],
    b: [k(th * 0.6) + w, th * 0.6, m - th * 1.2, true], c: [k(m + th * 0.6) + w, m + th * 0.6, m - th * 1.2, true] };
  for (const name of "abcdefg") {
    const [sx, sy, len, up] = seg[name];
    paths.push({ d: bar(sx, sy, len, th, up), lit: on.includes(name) });
  }
  return paths;
}
function face(f, lit) {
  const pad = 40, dh = H - pad * 2, dw = W * 0.17, th = dh * 0.12, slant = 0.08;
  const text = f.time.replace(":", "");
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${lit ? (f.lcd ? f.ground : "#000") : "#000"}"/><g transform="translate(0,${pad})">`;
  [0.03, 0.25, 0.56, 0.78].forEach((fx, i) => {
    for (const p of digitPaths(W * fx, text[i], dw, dh, th, slant)) {
      // lit: only what glows (or, on the liquid-crystal face, the dark figures
      // on the pale ground); dim: every bar, faint, as an unlit display shows them
      if (lit && p.lit) s += `<path d="${p.d}" fill="${f.lit}"/>`;
      if (!lit && !f.lcd) s += `<path d="${p.d}" fill="${f.dim}"/>`;
    }
  });
  const cx = W * 0.5, r = th * 0.55;
  if ((lit && f.colon) || (!lit && !f.lcd)) for (const cy of [dh * 0.3, dh * 0.7]) s += `<circle cx="${cx + (dh - cy) * slant}" cy="${cy}" r="${r}" fill="${lit ? f.lit : f.dim}"/>`;
  return s + `</g></svg>`;
}
for (const [i, f] of FACES.entries()) {
  await sharp(Buffer.from(face(f, true))).png().toFile(`${out}clock-${i}-lit.png`);
  await sharp(Buffer.from(face(f, false))).png().toFile(`${out}clock-${i}-dim.png`);
}
console.log("clock faces", OVERTIME_CLOCKS.join(" "));
