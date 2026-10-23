// The chemist's floor's flat things, drawn in code for hall_chem.py:
//   blackboard.png  the slate, greyed by years of chalk wiped across it, and
//                   on it the chemist's working (as chemical.js draws it)
//   elements.png    a table of the elements, printed, foxed
//   apparatus.png   a chart of laboratory glass, line-engraved
//   gauge.png       the gas main's pressure gauge
//   labels.png      eight apothecary labels, 4 across, 2 down
//
//   node art/blender/chem_boards.mjs  →  .artifacts/chem/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/chem/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
let seed = 4040;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const write = (name, svg) => sharp(Buffer.from(svg)).png().toFile(`${out}${name}.png`);
// chemistry, with its figures set below the line: "H_2O" → H₂O
const formula = (text, size) => text.replace(/_(\d+)/g, (_, n) => `<tspan dy="${size * 0.22}" font-size="${size * 0.68}">${n}</tspan><tspan dy="${-size * 0.22}">​</tspan>`);

// ── the blackboard ──────────────────────────────────────────────────────────
{
  const W = 2048, H = 1150, sx = W / 1400, sy = sx; // (drawn 1400 × 640, as chemical.js draws it)
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
<filter id="chalk" x="-2%" y="-2%" width="104%" height="104%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.6 0 0 0 -0.7" result="grain"/>
  <feComposite in="SourceGraphic" in2="grain" operator="in" result="g"/>
  <feDisplacementMap in="g" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="smear"><feGaussianBlur stdDeviation="30"/></filter>
<radialGradient id="dust"><stop offset="0" stop-color="#d2d6ce" stop-opacity="1"/><stop offset="1" stop-color="#d2d6ce" stop-opacity="0"/></radialGradient>
</defs>
<rect width="100%" height="100%" fill="#181d1b"/>`;
  // years of wiping: clouds of chalk, the swing of a duster
  for (let i = 0; i < 30; i++) {
    const r = (60 + rnd() * 240) * sx;
    s += `<circle cx="${rnd() * W}" cy="${rnd() * H}" r="${r}" fill="url(#dust)" opacity="${(0.04 + rnd() * 0.07).toFixed(3)}"/>`;
  }
  for (let i = 0; i < 22; i++) {
    const x = rnd() * W, y = rnd() * H + 300, R = (200 + rnd() * 160) * sx, a0 = -Math.PI * (0.68 + rnd() * 0.1), a1 = -Math.PI * (0.32 - rnd() * 0.1);
    s += `<path d="M${x + Math.cos(a0) * R},${y + Math.sin(a0) * R} A${R},${R} 0 0 1 ${x + Math.cos(a1) * R},${y + Math.sin(a1) * R}" stroke="#dcded6" stroke-opacity="0.045" stroke-width="${(30 + rnd() * 50) * sx}" fill="none" stroke-linecap="round"/>`;
  }
  s += `<g transform="translate(0,${(H - 640 * sy) / 2}) scale(${sx},${sy})" fill="none" stroke="#ecece2" stroke-linecap="round" stroke-linejoin="round" filter="url(#chalk)">`;
  const chalk = (d, a = 0.82, w = 3.4) => { s += `<path d="${d}" stroke-opacity="${a}" stroke-width="${w}"/><path d="${d}" transform="translate(0.9,-0.6)" stroke-opacity="${a * 0.45}" stroke-width="${w}"/>`; };
  const circle = (cx, cy, r, a = 0.82, w = 3.4) => { s += `<circle cx="${cx}" cy="${cy}" r="${r}" stroke-opacity="${a}" stroke-width="${w}"/><circle cx="${cx + 0.9}" cy="${cy - 0.6}" r="${r}" stroke-opacity="${a * 0.45}" stroke-width="${w}"/>`; };
  const text = (t, x, y, size, a = 0.85, angle = 0) => {
    s += `<text x="${x}" y="${y}" font-family="Segoe Print, Comic Sans MS, cursive" font-size="${size}" fill="#ecece2" fill-opacity="${a}" stroke="none" transform="rotate(${angle * 57.3} ${x} ${y})">${formula(t, size)}</text>`;
  };
  // a benzene ring, its hydrogens round it
  const bx = 190, by = 210, br = 78, ring = (k, r) => [bx + Math.cos(Math.PI / 6 + (k / 6) * Math.PI * 2) * r, by + Math.sin(Math.PI / 6 + (k / 6) * Math.PI * 2) * r];
  chalk(`M${[0, 1, 2, 3, 4, 5, 6].map((k) => ring(k, br).join(",")).join(" L")}`);
  circle(bx, by, br * 0.55);
  for (let k = 0; k < 6; k++) { chalk(`M${ring(k, br).join(",")} L${ring(k, br + 34).join(",")}`); const [x, y] = ring(k, br + 52); text("H", x - 9, y + 10, 28); }
  text("C_6H_6", bx - 42, by + 170, 34);
  // the equations, one struck through and done again
  text("2H_2 + O_2  →  2H_2O", 430, 120, 42);
  text("CH_4 + O_2  →  CO_2 + H_2O", 430, 200, 40, 0.55);
  chalk("M420,186 L860,176", 0.6, 2.6);
  text("CH_4 + 2O_2  →  CO_2 + 2H_2O", 430, 270, 40);
  chalk("M430,296 Q650,306 900,292", 0.5, 2.4);
  text("NaCl + AgNO_3  →  AgCl↓ + NaNO_3", 430, 350, 32, 0.75);
  text("ΔH &lt; 0", 440, 420, 36);
  // a flask over a flame, bubbles rising in it, its tripod
  const fx = 1130, fy = 300;
  chalk(`M${fx - 18},${fy - 150} L${fx - 18},${fy - 90} L${fx - 70},${fy} Q${fx - 76},${fy + 12} ${fx - 60},${fy + 12} L${fx + 60},${fy + 12} Q${fx + 76},${fy + 12} ${fx + 70},${fy} L${fx + 18},${fy - 90} L${fx + 18},${fy - 150}`);
  chalk(`M${fx - 56},${fy - 22} Q${fx},${fy - 30} ${fx + 56},${fy - 22}`);
  for (const [x, y, r] of [[-20, -8, 6], [10, -16, 4], [26, -4, 5], [-4, -40, 3.5], [6, -64, 3]]) circle(fx + x, fy + y, r, 0.7, 2.6);
  chalk(`M${fx - 16},${fy + 70} Q${fx - 18},${fy + 40} ${fx},${fy + 24} Q${fx + 18},${fy + 40} ${fx + 16},${fy + 70}`);
  chalk(`M${fx - 70},${fy + 18} L${fx - 86},${fy + 110} M${fx + 70},${fy + 18} L${fx + 86},${fy + 110} M${fx - 80},${fy + 18} L${fx + 80},${fy + 18}`);
  text("Δ", fx + 40, fy + 70, 34);
  // water, as balls and sticks, and its angle
  const wx = 1190, wy = 500;
  circle(wx, wy, 26);
  for (const d of [-1, 1]) {
    const hx = wx + d * 78, hy = wy + 52;
    chalk(`M${wx + d * 18},${wy + 18} L${hx - d * 12},${hy - 8}`);
    circle(hx, hy, 16);
  }
  chalk(`M${wx + Math.cos(Math.PI * 0.2) * 58},${wy + Math.sin(Math.PI * 0.2) * 58} A58,58 0 0 1 ${wx + Math.cos(Math.PI * 0.8) * 58},${wy + Math.sin(Math.PI * 0.8) * 58}`, 0.7, 2.4);
  text("O", wx - 10, wy + 10, 26); text("H", wx - 88, wy + 62, 22); text("H", wx + 70, wy + 62, 22);
  text("104.5°", wx - 40, wy + 108, 26, 0.7);
  // a molar mass worked out, underlined twice; a rule; a word rubbed half out
  text("M(H_2O) = 2·1 + 16", 90, 450, 32, 0.78);
  text("= 18 g/mol", 230, 500, 32, 0.78);
  chalk("M222,512 L410,508 M222,520 L404,518", 0.6, 2.2);
  text("pH = −log[H⁺]", 600, 540, 34, 0.62, -0.02);
  text("valence", 820, 470, 30, 0.22);
  s += `</g></svg>`;
  await write("blackboard", s);
}

// ── paper, printed and kept a century ───────────────────────────────────────
const paper = (W, H, tone = "#d2c6a2") => {
  let s = `<defs><radialGradient id="fox"><stop offset="0" stop-color="#7a5a2a" stop-opacity=".5"/><stop offset="1" stop-color="#7a5a2a" stop-opacity="0"/></radialGradient>
<radialGradient id="age" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#4a3410" stop-opacity=".45"/></radialGradient>
<filter id="tooth"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 .25 0"/></filter></defs>
<rect width="${W}" height="${H}" fill="${tone}"/><rect width="${W}" height="${H}" filter="url(#tooth)"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${rnd() * W}" cy="${rnd() * H}" r="${4 + rnd() * 26}" fill="url(#fox)" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`;
  return { s, end: `<rect width="${W}" height="${H}" fill="url(#age)"/>` };
};

// ── the table of the elements ───────────────────────────────────────────────
{
  const W = 1600, H = 1120, p = paper(W, H);
  const SYMBOLS = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe".split(" ");
  const cell = (n) => {
    if (n === 1) return [1, 1]; if (n === 2) return [1, 18];
    const period = n <= 10 ? 2 : n <= 18 ? 3 : n <= 36 ? 4 : 5, first = { 2: 3, 3: 11, 4: 19, 5: 37 }[period], k = n - first;
    if (period <= 3) return [period, k < 2 ? k + 1 : k + 11];
    return [period, k + 1];
  };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${p.s}
<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#2a2418" stroke-width="5"/>
<rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="none" stroke="#2a2418" stroke-width="1.5"/>
<text x="${W / 2}" y="130" font-family="Georgia, serif" font-size="64" letter-spacing="8" text-anchor="middle" fill="#221c12">TABLE OF THE ELEMENTS</text>
<text x="${W / 2}" y="180" font-family="Georgia, serif" font-style="italic" font-size="28" text-anchor="middle" fill="#3a3020">arranged according to their atomic weights</text>
<line x1="200" y1="205" x2="${W - 200}" y2="205" stroke="#3a3020" stroke-width="2"/>`;
  const cw = 80, ch = 150, x0 = (W - 18 * cw) / 2, y0 = 260;
  SYMBOLS.forEach((sym, i) => {
    const [r, c] = cell(i + 1), x = x0 + (c - 1) * cw, y = y0 + (r - 1) * ch;
    const tint = [1, 2, 3, 4, 11, 12, 19, 20, 37, 38].includes(i + 1) ? "#c8b48a" : i + 1 >= 21 && i + 1 <= 30 || i + 1 >= 39 && i + 1 <= 48 ? "#bdb79a" : "#cbc2a0";
    s += `<rect x="${x + 3}" y="${y + 3}" width="${cw - 6}" height="${ch - 6}" fill="${tint}" stroke="#2a2418" stroke-width="2"/>
<text x="${x + 10}" y="${y + 30}" font-family="Georgia, serif" font-size="22" fill="#2a2418">${i + 1}</text>
<text x="${x + cw / 2}" y="${y + 98}" font-family="Georgia, serif" font-weight="bold" font-size="${sym.length > 1 ? 40 : 48}" text-anchor="middle" fill="#16120c">${sym}</text>`;
  });
  s += `<text x="${W / 2}" y="${H - 80}" font-family="Georgia, serif" font-size="24" text-anchor="middle" fill="#3a3020">PRINTED FOR THE USE OF STUDENTS · LONDON</text>${p.end}</svg>`;
  await write("elements", s);
}

// ── the chart of apparatus ──────────────────────────────────────────────────
{
  const W = 1100, H = 1500, p = paper(W, H, "#d6ccab");
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${p.s}
<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="#2a2418" stroke-width="4"/>
<text x="${W / 2}" y="120" font-family="Georgia, serif" font-size="50" letter-spacing="5" text-anchor="middle" fill="#221c12">LABORATORY</text>
<text x="${W / 2}" y="180" font-family="Georgia, serif" font-size="50" letter-spacing="5" text-anchor="middle" fill="#221c12">APPARATUS</text>
<line x1="180" y1="210" x2="${W - 180}" y2="210" stroke="#3a3020" stroke-width="2"/>
<g fill="none" stroke="#2a2418" stroke-width="4" stroke-linejoin="round">`;
  const fig = (cx, cy, d, label, hatch = "") => {
    s += `<g transform="translate(${cx},${cy})"><path d="${d}"/>${hatch}</g>`;
    s += `<text x="${cx}" y="${cy + 210}" font-family="Georgia, serif" font-style="italic" font-size="30" text-anchor="middle" fill="#2a2418" stroke="none">${label}</text>`;
  };
  const lines = (n, x0, y0, x1, y1) => Array.from({ length: n }, (_, i) => `<line x1="${x0 + i * 9}" y1="${y0}" x2="${x0 + i * 9 + (x1 - x0) * 0.2}" y2="${y1}" stroke-width="1.6"/>`).join("");
  fig(290, 470, "M-20,-170 L-20,-60 A90,90 0 1 0 20,-60 L20,-170 M-28,-170 L28,-170", "Florence flask", lines(10, -60, 40, -20, 90));
  fig(810, 470, "M-20,-170 L-20,-70 L-110,150 Q-115,165 -95,165 L95,165 Q115,165 110,150 L20,-70 L20,-170 M-28,-170 L28,-170", "Conical flask", lines(12, -80, 110, -40, 160));
  fig(290, 1030, "M-60,-150 L60,-150 L60,-130 L80,-110 L80,160 Q80,170 70,170 L-70,170 Q-80,170 -80,160 L-80,-110 L-60,-130 Z M-40,-150 L-40,-185 L40,-185 L40,-150 M-50,-20 L50,-20 L50,60 L-50,60 Z", "Reagent bottle");
  fig(810, 1030, "M10,-60 L230,10 M30,-20 L230,24 M-200,170 L60,170 M-70,170 L-70,140", "Retort", `<circle cx="-70" cy="40" r="95"/>${lines(12, -150, 70, -110, 120)}`);
  s += `</g>${p.end}</svg>`;
  await write("apparatus", s);
}

// ── the pressure gauge ──────────────────────────────────────────────────────
{
  const S = 512, C = 256, R = 230;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs><radialGradient id="e" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#f2ecda"/><stop offset="1" stop-color="#cfc4a6"/></radialGradient></defs>
<rect width="${S}" height="${S}" fill="#6a5020"/><circle cx="${C}" cy="${C}" r="${R}" fill="url(#e)"/>`;
  for (let i = 0; i <= 30; i++) {
    const a = (-135 + i * 9) * Math.PI / 180, r0 = R - 18, r1 = R - (i % 5 ? 36 : 52);
    s += `<line x1="${C + Math.sin(a) * r0}" y1="${C - Math.cos(a) * r0}" x2="${C + Math.sin(a) * r1}" y2="${C - Math.cos(a) * r1}" stroke="#1a1410" stroke-width="${i % 5 ? 3 : 6}"/>`;
    if (i % 5 === 0) { const r = R - 90; s += `<text x="${C + Math.sin(a) * r}" y="${C - Math.cos(a) * r + 14}" font-family="Georgia, serif" font-size="38" text-anchor="middle" fill="#16110c">${i * 2}</text>`; }
  }
  s += `<path d="M${C - 9},${C + 30} L${C},${C - 190} L${C + 9},${C + 30} Z" fill="#1a1410" transform="rotate(-62 ${C} ${C})"/><circle cx="${C}" cy="${C}" r="18" fill="#2a2016"/>
<text x="${C}" y="${C + 100}" font-family="Georgia, serif" font-size="30" text-anchor="middle" fill="#2a2016">GAS</text>
<text x="${C}" y="${C + 135}" font-family="Georgia, serif" font-style="italic" font-size="24" text-anchor="middle" fill="#2a2016">lbs. per sq. in.</text></svg>`;
  await write("gauge", s);
}

// ── apothecary labels ───────────────────────────────────────────────────────
{
  const names = [["ACID.", "SULPH."], ["AMMON.", "CHLOR."], ["SOD.", "CHLOR."], ["CUPRI", "SULPH."], ["AQ.", "DEST."], ["SPT.", "VINI RECT."], ["POT.", "NITR."], ["ACID.", "HYDROCHL."]];
  const cw = 512, ch = 320;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw * 4}" height="${ch * 2}">`;
  names.forEach(([a, b], i) => {
    const x = (i % 4) * cw, y = Math.floor(i / 4) * ch, tone = ["#e2d6b2", "#d8c9a0", "#e6dcc0"][i % 3];
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${tone}"/>
<rect x="${x + 22}" y="${y + 22}" width="${cw - 44}" height="${ch - 44}" fill="none" stroke="#1c1610" stroke-width="7"/>
<rect x="${x + 36}" y="${y + 36}" width="${cw - 72}" height="${ch - 72}" fill="none" stroke="#1c1610" stroke-width="2.5"/>
<text x="${x + cw / 2}" y="${y + 140}" font-family="Georgia, serif" font-weight="bold" font-size="66" text-anchor="middle" fill="#16120c">${a}</text>
<text x="${x + cw / 2}" y="${y + 225}" font-family="Georgia, serif" font-weight="bold" font-size="${b.length > 7 ? 54 : 66}" text-anchor="middle" fill="#16120c">${b}</text>`;
    for (let k = 0; k < 14; k++) s += `<circle cx="${x + rnd() * cw}" cy="${y + rnd() * ch}" r="${3 + rnd() * 16}" fill="#6a4a1a" opacity="${(0.08 + rnd() * 0.2).toFixed(2)}"/>`;
  });
  s += `</svg>`;
  await write("labels", s);
}
console.log("boards");
