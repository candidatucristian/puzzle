// The laboratory's flat things, drawn in code for room_lab.py:
//   lab-periodic.png   the periodic table pinned over his bench: an old
//                      printed sheet gone pale, its cells tinted by family,
//                      every element in its place
//   lab-tag.png        the paper tag on the phials' rack, in his hand
//   lab-scale-<i>.png  the scale printed in white enamel up the front of each
//                      of the five bottles on his bench, from the puzzle's own
//                      (src/levels/chemistry/puzzle.js SCALES, BOTTLES): fine
//                      divisions, numbered at the long ones; lab-scales.json
//                      says how big each is and where its liquid stands
//
//   node art/blender/lab_boards.mjs  →  .artifacts/rooms/
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { SCALES, BOTTLES } from "../../src/levels/chemistry/puzzle.js";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/rooms/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
let seed = 1869;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// [symbol, period, group] for the main table; the f-block in its two rows
const MAIN = [
  ["H", 1, 1], ["He", 1, 18],
  ["Li", 2, 1], ["Be", 2, 2], ["B", 2, 13], ["C", 2, 14], ["N", 2, 15], ["O", 2, 16], ["F", 2, 17], ["Ne", 2, 18],
  ["Na", 3, 1], ["Mg", 3, 2], ["Al", 3, 13], ["Si", 3, 14], ["P", 3, 15], ["S", 3, 16], ["Cl", 3, 17], ["Ar", 3, 18],
  ...["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"].map((s, i) => [s, 4, i + 1]),
  ...["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"].map((s, i) => [s, 5, i + 1]),
  ["Cs", 6, 1], ["Ba", 6, 2], ["La", 6, 3], ...["Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"].map((s, i) => [s, 6, i + 4]),
  ["Fr", 7, 1], ["Ra", 7, 2], ["Ac", 7, 3],
];
const F_ROWS = [["Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"], ["Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"]];
const family = (s, g) => {
  if (s === "H") return "#c9a88a";
  if (g === 1) return "#d08a6e"; if (g === 2) return "#d6aa6c"; if (g >= 3 && g <= 12) return "#b9b28a";
  if (g === 18) return "#8fb3bf"; if (g === 17) return "#a6c18e";
  if (["B", "Si", "Ge", "As", "Sb", "Te", "Po"].includes(s)) return "#b8a7c6";
  if (["C", "N", "O", "P", "S", "Se"].includes(s)) return "#9fc19a";
  return "#c4b48c";
};
const NO = Object.fromEntries([...MAIN.map(([s]) => s), ...F_ROWS.flat()].map((s) => [s, 0]));
// atomic numbers, for the little figure over each symbol
const ORDER = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"];
ORDER.forEach((s, i) => { NO[s] = i + 1; });

const W = 2400, H = 1600, cw = 118, ch = 118, ox = (W - 18 * cw) / 2, oy = 190;
let cells = "";
const cell = (s, x, y, fill) => {
  const fade = 0.55 + rnd() * 0.25;
  cells += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" fill="${fill}" opacity="${fade.toFixed(2)}"/>`;
  cells += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" fill="none" stroke="#3c2c1c" stroke-width="2" opacity=".55"/>`;
  cells += `<text x="${x + 10}" y="${y + 26}" font-size="20" fill="#3a2a1a" opacity=".7">${NO[s]}</text>`;
  cells += `<text x="${x + cw / 2}" y="${y + 82}" font-size="48" text-anchor="middle" fill="#2a1c10" opacity=".82" font-weight="bold">${s}</text>`;
};
for (const [s, p, g] of MAIN) cell(s, ox + (g - 1) * cw, oy + (p - 1) * ch, family(s, g));
F_ROWS.forEach((row, r) => row.forEach((s, i) => cell(s, ox + (i + 3) * cw, oy + (7.5 + r) * ch, "#c7a99a")));
let foxing = "";
for (let i = 0; i < 140; i++) foxing += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${(3 + rnd() * 26).toFixed(0)}" fill="#6a4a22" opacity="${(0.03 + rnd() * 0.08).toFixed(3)}"/>`;
const periodic = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Georgia, 'Times New Roman', serif">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#cfc29c"/><stop offset="0.75" stop-color="#b3a477"/><stop offset="1" stop-color="#8c7a50"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="${W / 2}" y="110" font-size="72" text-anchor="middle" fill="#3a2a18" opacity=".75" letter-spacing="8">TABLE OF THE ELEMENTS</text>
  <line x1="${W * 0.2}" y1="140" x2="${W * 0.8}" y2="140" stroke="#3a2a18" stroke-width="3" opacity=".5"/>
  ${cells}${foxing}
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#5a4426" stroke-width="6" opacity=".5"/>
</svg>`;
await sharp(Buffer.from(periodic)).png().toFile(`${out}lab-periodic.png`);

// the tag on the phials' rack: "For my sister." in a quick, small hand
const tag = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256">
  <rect width="512" height="256" rx="18" fill="#d8ccb0"/>
  <circle cx="44" cy="128" r="16" fill="#2a2016"/><circle cx="44" cy="128" r="22" fill="none" stroke="#9c8a62" stroke-width="5"/>
  <text x="290" y="146" font-family="'Segoe Script', 'Brush Script MT', cursive" font-size="50" fill="#2a2a44" opacity=".85" text-anchor="middle" textLength="400" lengthAdjust="spacingAndGlyphs">For my sister.</text>
  <circle cx="300" cy="80" r="60" fill="#7a5a2a" opacity=".07"/>
</svg>`;
await sharp(Buffer.from(tag)).png().toFile(`${out}lab-tag.png`);
console.log("lab-periodic.png lab-tag.png");

// ── the bottles' scales: a spine, divisions to its left, the long ones
// numbered, "ml" at its head; laid out in millimetres, 16 px to the mm ──────
{
  const PXMM = 16, SPINE = 15, W = 23, LONG = 7, MID = 4.5, SHORT = 2.6, FS = 4.0;
  const scales = [];
  for (const [i, sc] of SCALES.entries()) {
    const H = [22, 25, 18, 32, 17][i] * (sc.top - 0.08) * 10;   // how tall the scale runs, mm (room_lab.py BOTTLES' heights, cm)
    const y = (value) => H + 4 - (H * value) / sc.capacity;   // (4 mm spare at the head for "ml")
    const enamel = (a) => `rgba(250,252,242,${a})`;
    let body = "";
    const line = (x0, y0, x1, y1, w, a) => {
      body += `<line x1="${x0 + 0.22}" y1="${y0 + 0.22}" x2="${x1 + 0.22}" y2="${y1 + 0.22}" stroke="rgba(4,10,12,0.5)" stroke-width="${w}"/>`;
      body += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${enamel(a)}" stroke-width="${w}"/>`;
    };
    line(SPINE, y(0), SPINE, y(sc.capacity), 0.34, 0.9);
    const steps = Math.round(sc.capacity / sc.step);
    for (let k = 0; k <= steps; k++) {
      const value = k * sc.step, major = k % sc.major === 0, mid = k % sc.mid === 0;
      const len = major ? LONG : mid ? MID : SHORT;
      line(SPINE, y(value), SPINE - len, y(value), major ? 0.42 : 0.3, major ? 0.95 : mid ? 0.88 : 0.75);
      if (major && k > 0) {
        const text = String(value), tx = SPINE - len - 0.8;
        body += `<text x="${tx + 0.25}" y="${y(value) + FS * 0.36 + 0.25}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${FS}" fill="rgba(4,10,12,0.55)" text-anchor="end">${text}</text>`;
        body += `<text x="${tx}" y="${y(value) + FS * 0.36}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${FS}" fill="${enamel(0.96)}" text-anchor="end">${text}</text>`;
      }
    }
    body += `<text x="${SPINE + 1}" y="${y(sc.capacity) + FS * 0.3}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${FS * 0.86}" fill="${enamel(0.88)}">ml</text>`;
    const Hmm = H + 8;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * PXMM}" height="${Hmm * PXMM}" viewBox="0 0 ${W} ${Hmm}">${body}</svg>`))
      .png().toFile(`${out}lab-scale-${i}.png`);
    // (the scale's zero 4 mm above the picture's foot; its top 4 mm below its head)
    scales.push({ file: `lab-scale-${i}.png`, w: W, h: Hmm, zero: 4, span: H, level: BOTTLES[i] / sc.capacity });
  }
  writeFileSync(`${out}lab-scales.json`, JSON.stringify(scales, null, 1));
  console.log("lab-scale-0..4.png lab-scales.json");
}
