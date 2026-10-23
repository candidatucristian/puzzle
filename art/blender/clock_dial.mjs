// Procedural textures drawn in code (SVG → PNG via sharp) for the ground-floor
// Botany hall (art/blender/hall_ground.py):
//   dial.png             the long-case clock's enamelled & engraved brass face
//   botanic-paper.png    deep Victorian botanical damask wallpaper tile
//   herbarium-0..3.png   four pressed botanical herbarium plates on foxed rag paper
//   botanic-runner.png   woven dark moss-green & umber hall runner carpet pattern
//
//   node art/blender/clock_dial.mjs  →  .artifacts/hall/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/hall/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });

let seed = 4819;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const write = (name, svg) => sharp(Buffer.from(svg)).png().toFile(`${out}${name}.png`);

// ── 1. The long-case clock's dial ───────────────────────────────────────────
{
  const S = 1024, C = 512, R = 400;
  const roman = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs>
  <radialGradient id="enamel" cx="45%" cy="40%" r="70%">
    <stop offset="0" stop-color="#dfd2b5"/>
    <stop offset=".7" stop-color="#c4b392"/>
    <stop offset="1" stop-color="#968362"/>
  </radialGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8c6b2c"/>
    <stop offset=".5" stop-color="#584016"/>
    <stop offset="1" stop-color="#785a22"/>
  </linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#brass)"/>`;
  for (const [x, y, a] of [[0, 0, 0], [S, 0, 90], [S, S, 180], [0, S, 270]]) {
    s += `<g transform="translate(${x},${y}) rotate(${a})" fill="none" stroke="#2e1f08" stroke-width="7" opacity=".8">
      <path d="M26,160 C55,65 118,42 168,28"/>
      <path d="M56,125 q32,-42 74,-32"/>
      <circle cx="72" cy="72" r="28"/>
      <circle cx="72" cy="72" r="12" fill="#3a280c"/>
      <path d="M38,38 l54,54"/>
    </g>`;
  }
  s += `<circle cx="${C}" cy="${C}" r="${R + 22}" fill="#3e2c0d"/>
<circle cx="${C}" cy="${C}" r="${R}" fill="url(#enamel)"/>
<circle cx="${C}" cy="${C}" r="${R - 148}" fill="none" stroke="#3a2c1a" stroke-width="2" opacity=".6"/>`;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, r0 = R - 20, r1 = R - (i % 5 ? 34 : 46);
    s += `<line x1="${C + Math.sin(a) * r0}" y1="${C - Math.cos(a) * r0}" x2="${C + Math.sin(a) * r1}" y2="${C - Math.cos(a) * r1}" stroke="#1c150e" stroke-width="${i % 5 ? 3 : 6}"/>`;
  }
  s += `<circle cx="${C}" cy="${C}" r="${R - 20}" fill="none" stroke="#1c150e" stroke-width="2.5"/>
<circle cx="${C}" cy="${C}" r="${R - 46}" fill="none" stroke="#1c150e" stroke-width="2"/>`;
  roman.forEach((t, i) => {
    const a = (i / 12) * Math.PI * 2, r = R - 100;
    const x = C + Math.sin(a) * r, y = C - Math.cos(a) * r;
    s += `<text x="${x}" y="${y}" transform="rotate(${(i / 12) * 360} ${x} ${y})" font-family="Georgia, serif" font-size="64" text-anchor="middle" dominant-baseline="central" fill="#18120c">${t}</text>`;
  });
  const hand = (deg, len, w) => `<path transform="rotate(${deg} ${C} ${C})" d="M${C - w},${C + 38} L${C - w * 0.45},${C - len + 28} L${C},${C - len} L${C + w * 0.45},${C - len + 28} L${C + w},${C + 38} Z" fill="#12161f"/>`;
  s += hand(-58, 220, 12) + hand(48, 320, 8) + `<circle cx="${C}" cy="${C}" r="16" fill="#12161f"/></svg>`;
  await write("dial", s);
}

// ── 2. Victorian botanical damask wallpaper tile ────────────────────────────
{
  const S = 1024, ground = "#13261b", motif = "#1a3325", highlight = "#213f2e";
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs>
  <filter id="weave">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="17"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.11  0 0 0 0 0.08  0 0 0 0.18 0"/>
  </filter>
</defs>
<rect width="${S}" height="${S}" fill="${ground}"/>`;
  const centers = [
    [S * 0.25, S * 0.25], [S * 0.75, S * 0.75],
    [S * 0.75, -S * 0.25], [S * 0.25, S * 1.25],
    [-S * 0.25, S * 0.75], [S * 1.25, S * 0.25],
  ];
  for (const [cx, cy] of centers) {
    s += `<g transform="translate(${cx},${cy})">`;
    for (const m of [1, -1]) {
      s += `<g transform="scale(${m},1)">
        <path d="M0,180 C65,140 125,80 105,-5 C88,-68 24,-85 16,-145 C64,-125 145,-62 152,22 C160,104 82,184 0,224 Z" fill="${motif}"/>
        <path d="M16,-145 C36,-205 84,-224 118,-212 C90,-195 62,-176 52,-142 Z" fill="${motif}"/>
        <path d="M40,82 C82,62 106,20 94,-22" stroke="${ground}" stroke-width="9" fill="none"/>
        <path d="M22,122 C-4,62 62,20 42,-62" stroke="${highlight}" stroke-width="4.5" fill="none" opacity=".75"/>
        <path d="M12,30 C48,12 72,-20 62,-58" stroke="${highlight}" stroke-width="3.5" fill="none" opacity=".65"/>
      </g>`;
    }
    s += `<ellipse cx="0" cy="-236" rx="18" ry="34" fill="${motif}"/>
    <circle cx="0" cy="236" r="13" fill="${motif}"/>
    <path d="M0,-190 L-16,-140 L0,-105 L16,-140 Z" fill="${highlight}" opacity=".6"/>
    </g>`;
  }
  s += `<rect width="${S}" height="${S}" filter="url(#weave)"/></svg>`;
  await write("botanic-paper", s);
}

// ── 3. Four pressed botanical herbarium plates on foxed rag paper ───────────
function drawFrond(x, y, length, lean, ink, stemW = 2.6, leafletScale = 0.22, pairs = 24) {
  let s = "";
  const pts = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33;
    return [x + Math.sin(t * 1.35) * lean * length * 0.24, y - t * length];
  });
  s += `<path d="M${pts.map((p) => p.join(",")).join(" L")}" stroke="${ink}" stroke-width="${stemW}" fill="none" stroke-linecap="round"/>`;
  for (let i = 3; i < 32; i += 30 / pairs) {
    const k = Math.floor(i), t = k / 33;
    const [px, py] = pts[k];
    const l = length * leafletScale * Math.sin(Math.PI * Math.min(1, t * 1.12)) + 4;
    for (const side of [-1, 1]) {
      const ex = px + side * l, ey = py - l * 0.34;
      s += `<path d="M${px},${py} Q${px + side * l * 0.52},${py - l * 0.44} ${ex},${ey} Q${px + side * l * 0.56},${py + l * 0.06} ${px},${py}" fill="${ink}" opacity=".88"/>`;
      s += `<line x1="${px}" y1="${py}" x2="${ex * 0.92 + px * 0.08}" y2="${ey * 0.92 + py * 0.08}" stroke="#242918" stroke-width="0.7" opacity=".55"/>`;
    }
  }
  // root rhizome at base
  s += `<path d="M${x - 18},${y + 8} Q${x},${y - 2} ${x + 22},${y + 12}" stroke="#342617" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  for (let r = -12; r <= 16; r += 7) {
    s += `<path d="M${x + r},${y + 6} Q${x + r - 6},${y + 28} ${x + r + 4},${y + 46}" stroke="#3e2e1c" stroke-width="1.4" fill="none"/>`;
  }
  // paper mounting straps
  for (const [tx, ty, ang] of [[x, y - length * 0.18, -6], [x + lean * 18, y - length * 0.62, 8]]) {
    s += `<rect x="${tx - 24}" y="${ty - 4}" width="48" height="9" transform="rotate(${ang} ${tx} ${ty})" fill="#cbb994" stroke="#8c7956" stroke-width="0.8" opacity=".92"/>`;
  }
  return s;
}

function drawFloweringSpecimen(x, y, length, lean, leafInk, petalInk) {
  let s = `<path d="M${x},${y} C${x + lean * 45},${y - length * 0.38} ${x - lean * 35},${y - length * 0.72} ${x + lean * 18},${y - length}" stroke="#384224" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  for (let i = 1; i <= 8; i++) {
    const t = i / 9.5, py = y - length * t, px = x + Math.sin(t * 2.4) * lean * 18;
    const side = i % 2 ? 1 : -1, l = (68 - t * 34);
    s += `<path d="M${px},${py} Q${px + side * l * 0.58},${py - l * 0.52} ${px + side * l},${py - l * 0.16} Q${px + side * l * 0.48},${py + l * 0.22} ${px},${py}" fill="${leafInk}" opacity=".86"/>`;
    s += `<path d="M${px},${py} L${px + side * l * 0.86},${py - l * 0.15}" stroke="#c8ba98" stroke-width="0.9" opacity=".5"/>`;
  }
  for (let b = 0; b < 5; b++) {
    const bt = 0.68 + b * 0.075, by = y - length * bt, bx = x + lean * 14 + (b % 2 ? 18 : -18);
    s += `<ellipse cx="${bx}" cy="${by + 10}" rx="9" ry="16" transform="rotate(${b % 2 ? -28 : 28} ${bx} ${by + 10})" fill="${petalInk}" opacity=".84"/>`;
  }
  for (const [tx, ty] of [[x, y - length * 0.22], [x + lean * 10, y - length * 0.55]]) {
    s += `<rect x="${tx - 24}" y="${ty - 4}" width="48" height="9" fill="#cbb994" stroke="#8c7956" stroke-width="0.8" opacity=".92"/>`;
  }
  return s;
}

const plates = [
  { title: "Polypodium vulgare L.", fam: "Filices — Ashcombe Wood, Oct. 1889", kind: "fern1" },
  { title: "Asplenium trichomanes", fam: "Herbarium Manerii Ashcombe — No. XIV", kind: "fern2" },
  { title: "Digitalis purpurea L.", fam: "Scrophulariaceae — West Conservatory", kind: "flower1" },
  { title: "Dryopteris filix-mas", fam: "Filices — North Stone Grotto, 1891", kind: "fern3" },
];

for (let idx = 0; idx < plates.length; idx++) {
  const W = 720, H = 960, p = plates[idx];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
  <radialGradient id="age${idx}" cx="50%" cy="50%" r="74%">
    <stop offset=".45" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#4a3110" stop-opacity=".55"/>
  </radialGradient>
  <radialGradient id="fox${idx}">
    <stop offset="0" stop-color="#6e471b" stop-opacity=".48"/>
    <stop offset="1" stop-color="#6e471b" stop-opacity="0"/>
  </radialGradient>
  <filter id="paper${idx}">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="${30 + idx}"/>
    <feColorMatrix type="matrix" values="0 0 0 0 .28  0 0 0 0 .21  0 0 0 0 .11  0 0 0 .22 0"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="#cbbba0"/>
<rect width="${W}" height="${H}" filter="url(#paper${idx})"/>
<rect x="34" y="34" width="${W - 68}" height="${H - 68}" fill="none" stroke="#4d3d26" stroke-width="2.5"/>
<rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="none" stroke="#6b5638" stroke-width="1"/>`;

  if (p.kind === "fern1") {
    s += drawFrond(330, 770, 620, 0.45, "#2f3d1e", 3.0, 0.23, 24);
    s += drawFrond(430, 780, 440, -0.55, "#3b4623", 2.2, 0.19, 18);
  } else if (p.kind === "fern2") {
    s += drawFrond(270, 775, 560, -0.4, "#354222", 2.4, 0.16, 28);
    s += drawFrond(390, 765, 630, 0.35, "#2c391c", 2.8, 0.18, 30);
    s += drawFrond(475, 780, 390, 0.65, "#424a28", 2.0, 0.15, 20);
  } else if (p.kind === "flower1") {
    s += drawFloweringSpecimen(345, 780, 620, 0.4, "#334222", "#683c54");
    s += drawFrond(465, 785, 360, -0.45, "#3d4827", 2.0, 0.16, 16);
  } else {
    s += drawFrond(360, 775, 640, -0.32, "#2d3b1d", 3.2, 0.25, 26);
    s += drawFrond(255, 785, 420, 0.58, "#3e4726", 2.1, 0.18, 18);
  }

  // Herbarium collector's label in lower right
  s += `<rect x="${W - 295}" y="${H - 165}" width="235" height="104" fill="#d8cab0" stroke="#5a472e" stroke-width="1.5"/>
  <rect x="${W - 289}" y="${H - 159}" width="223" height="92" fill="none" stroke="#7a6344" stroke-width="0.8"/>
  <text x="${W - 177}" y="${H - 122}" font-family="Georgia, serif" font-style="italic" font-size="20" text-anchor="middle" fill="#261b0e">${p.title}</text>
  <text x="${W - 177}" y="${H - 92}" font-family="Georgia, serif" font-size="13" text-anchor="middle" fill="#463520">${p.fam}</text>`;

  for (let i = 0; i < 36; i++) {
    s += `<circle cx="${rnd() * W}" cy="${rnd() * H}" r="${3 + rnd() * 24}" fill="url(#fox${idx})"/>`;
  }
  s += `<rect width="${W}" height="${H}" fill="url(#age${idx})"/></svg>`;
  await write(`herbarium-${idx}`, s);
}

// ── 4. Woven dark moss-green & umber hall runner carpet ─────────────────────
{
  const W = 1024, H = 2048;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#132017"/>
<rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="#3b2f1e"/>
<rect x="46" y="46" width="${W - 92}" height="${H - 92}" fill="#2b1914"/>
<rect x="86" y="86" width="${W - 172}" height="${H - 172}" fill="#16281d"/>
<rect x="104" y="104" width="${W - 208}" height="${H - 208}" fill="none" stroke="#57472c" stroke-width="6"/>
<rect x="122" y="122" width="${W - 244}" height="${H - 244}" fill="none" stroke="#3d3220" stroke-width="3"/>`;
  // Border geometric vine motif
  for (let y = 66; y < H - 60; y += 44) {
    for (const x of [66, W - 66]) {
      s += `<path d="M${x},${y - 14} l14,14 l-14,14 l-14,-14 Z" fill="#4f3f27" opacity=".85"/>`;
      s += `<circle cx="${x}" cy="${y}" r="4" fill="#1b2c20"/>`;
    }
  }
  // Field lattice of botanical lozenges
  for (let y = 180; y < H - 160; y += 96) {
    for (let x = 180; x < W - 160; x += 96) {
      s += `<path d="M${x},${y - 22} l18,22 l-18,22 l-18,-22 Z" fill="#1e3526" opacity=".9"/>`;
      s += `<path d="M${x},${y - 10} l8,10 l-8,10 l-8,-10 Z" fill="#3a2f1d" opacity=".75"/>`;
    }
  }
  // Repeating medallions down the runner
  for (const cy of [H * 0.22, H * 0.5, H * 0.78]) {
    const cx = W / 2;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="230" ry="180" fill="#2c1b15" stroke="#524229" stroke-width="5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="185" ry="140" fill="#13241a" stroke="#3d311e" stroke-width="3"/>
    <ellipse cx="${cx}" cy="${cy}" rx="72" ry="56" fill="#463722"/>
    <ellipse cx="${cx}" cy="${cy}" rx="38" ry="28" fill="#1c2f22"/>`;
  }
  s += `</svg>`;
  await write("botanic-runner", s);
}

console.log("Botany procedural textures generated in", out);
