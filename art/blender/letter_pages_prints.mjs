// What is printed, pressed or smudged on the four found letters, drawn in code
// for letter_held.py (each multiplied onto its Blender paper, or laid on it):
//
//   silas-print.png   a laboratory note book's page: 5 mm squares, a double red
//                     margin, its printed head and number (No. 47)
//   orion-print.png   the back of a star chart: the chart showing through the
//                     card, reversed (circles of declination, hour lines,
//                     stars, the dotted figures, its title band)
//   orion-front.png   the chart's printed face, as it lies on the back's UVs (seen
//                     while the chart is still rolled)
//   ivy-print.png     a garden book's page: its printed number at the foot, a
//                     thumbprint of soil and a few crumbs of it
//   ivy-leaf.png      an ivy leaf, pressed and dried (RGBA)
//   last-emboss.png   Ashcombe House's note paper: the key blind-pressed into it
//                     (a height: white raised)
//   last-print.png    its laid lines and chain lines
//
//   node art/blender/letter_pages_prints.mjs  →  .artifacts/letter-pages/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/letter-pages/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
let seed = 40613;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const write = (name, svg) => sharp(Buffer.from(svg)).png().toFile(`${out}${name}.png`).then(() => console.log("wrote", name));
const f = (n) => n.toFixed(2);

// ── Silas: 200 × 280 mm at 8 px/mm ──────────────────────────────────────────
function silas() {
  const k = 8, W = 200 * k, H = 280 * k;
  const g0 = { x: 9, y: 24, x1: 191, y1: 271 }; // the squared field (mm)
  let lines = "";
  for (let x = g0.x; x <= g0.x1 + 0.01; x += 5) lines += `<line x1="${f(x * k)}" y1="${g0.y * k}" x2="${f(x * k)}" y2="${g0.y1 * k}"/>`;
  for (let y = g0.y; y <= g0.y1 + 0.01; y += 5) lines += `<line x1="${g0.x * k}" y1="${f(y * k)}" x2="${g0.x1 * k}" y2="${f(y * k)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#fff"/>
  <g stroke="#7f97ab" stroke-width="1.3" opacity=".62">${lines}</g>
  <g stroke="#b2483d" stroke-width="1.6" opacity=".8">
    <line x1="${29 * k}" y1="${19 * k}" x2="${29 * k}" y2="${H}"/>
    <line x1="${30.1 * k}" y1="${19 * k}" x2="${30.1 * k}" y2="${H}"/>
  </g>
  <line x1="${9 * k}" y1="${19 * k}" x2="${191 * k}" y2="${19 * k}" stroke="#4f6577" stroke-width="3.2" opacity=".85"/>
  <line x1="${9 * k}" y1="${20.1 * k}" x2="${191 * k}" y2="${20.1 * k}" stroke="#4f6577" stroke-width="1.1" opacity=".7"/>
  <g fill="#3f5568" font-family="Times New Roman" opacity=".88">
    <text x="${9 * k}" y="${15.2 * k}" font-size="${3.3 * k}" letter-spacing="${1.1 * k}">LABORATORY NOTE BOOK</text>
    <text x="${158 * k}" y="${15.2 * k}" font-size="${3.3 * k}" letter-spacing="${0.4 * k}">No.</text>
    <text x="${191 * k}" y="${15.6 * k}" font-size="${6.4 * k}" text-anchor="end" font-style="italic">47</text>
  </g>
</svg>`;
}

// ── Orion: 420 × 300 mm at 5 px/mm; drawn as the front reads, then reversed ──
function orion() {
  const k = 5, W = 420 * k, H = 300 * k, cx = 210 * k, cy = 140 * k;
  let g = "";
  // the polar chart: circles of declination, every ten degrees
  for (let i = 1; i <= 7; i++) g += `<circle cx="${cx}" cy="${cy}" r="${f(i * 17 * k)}" fill="none" stroke="#000" stroke-width="${i === 7 ? 5 : 1.6}"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f(7 * 17 * k + 7 * k)}" fill="none" stroke="#000" stroke-width="2"/>`;
  // the hours
  for (let h = 0; h < 24; h++) {
    const a = (h / 24) * Math.PI * 2, r0 = h % 6 ? 17 * k : 0, r1 = 7 * 17 * k;
    g += `<line x1="${f(cx + Math.cos(a) * r0)}" y1="${f(cy + Math.sin(a) * r0)}" x2="${f(cx + Math.cos(a) * r1)}" y2="${f(cy + Math.sin(a) * r1)}" stroke="#000" stroke-width="${h % 6 ? 1.1 : 1.8}"/>`;
    const rl = 7 * 17 * k + 3.6 * k;
    g += `<text x="${f(cx + Math.cos(a) * rl)}" y="${f(cy + Math.sin(a) * rl + 1.4 * k)}" font-size="${4 * k}" text-anchor="middle" font-family="Times New Roman">${["XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII"][h]}</text>`;
  }
  // the stars, more of the faint, a few bright, all inside the chart
  const stars = [];
  for (let i = 0; i < 520; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 7 * 17 * k * 0.98;
    const mag = rnd() ** 3.2;
    stars.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.9 + mag * 6.5]);
  }
  g += stars.map(([x, y, s]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#000"/>`).join("");
  // a few figures, dotted between bright stars
  const bright = stars.filter((s) => s[2] > 4).slice(0, 26);
  for (let i = 0; i + 1 < bright.length; i++) {
    if (i % 5 === 4) continue;
    const [a, b] = [bright[i], bright[i + 1]];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 60 * k) continue;
    g += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#000" stroke-width="1.3" stroke-dasharray="6 7"/>`;
  }
  // the border and the title band
  g += `<rect x="${12 * k}" y="${12 * k}" width="${396 * k}" height="${276 * k}" fill="none" stroke="#000" stroke-width="4"/>`;
  g += `<rect x="${14.5 * k}" y="${14.5 * k}" width="${391 * k}" height="${271 * k}" fill="none" stroke="#000" stroke-width="1.4"/>`;
  g += `<text x="${210 * k}" y="${279 * k}" font-size="${7.5 * k}" letter-spacing="${2.4 * k}" text-anchor="middle" font-family="Times New Roman">MAP OF THE NORTHERN HEAVENS</text>`;
  g += `<text x="${30 * k}" y="${279 * k}" font-size="${3.6 * k}" font-family="Times New Roman" font-style="italic">Epoch 1950</text>`;
  g += `<text x="${390 * k}" y="${279 * k}" font-size="${3.6 * k}" text-anchor="end" font-family="Times New Roman" font-style="italic">Sheet I</text>`;
  // seen through the card from its back, soft; and the printed face itself,
  // in its blue-black ink (both reversed: as they lie on the back's UVs)
  const svg = (inner, attrs) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><filter id="soft"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
  <rect width="100%" height="100%" fill="#fff"/>
  <g transform="translate(${W} 0) scale(-1 1)" ${attrs}>${inner}</g>
</svg>`;
  return [svg(g, 'filter="url(#soft)" opacity=".9"'), svg(g.replaceAll("#000", "#1d2a48"), "")];
}

// ── Ivy: 150 × 210 mm at 8 px/mm ────────────────────────────────────────────
function ivy() {
  const k = 8, W = 150 * k, H = 210 * k;
  // a thumb pressed on the page with soil on it: whorled ridges, broken here and there
  const tx = 30 * k, ty = 178 * k;
  let ridges = "";
  for (let i = 1; i < 19; i++) {
    const rx = i * 0.62 * k, ry = i * 0.86 * k, gaps = [];
    let a = rnd() * 6;
    while (a < 6.28 + 6) { const run = 0.6 + rnd() * 1.6; gaps.push([a, a + run]); a += run + 0.1 + rnd() * 0.35; }
    for (const [a0, a1] of gaps) {
      const p = (t) => [tx + Math.cos(t) * rx + Math.sin(t * 2) * 0.12 * k, ty + Math.sin(t) * ry];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      ridges += `<path d="M${f(x0)} ${f(y0)} A${f(rx)} ${f(ry)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)} ${f(y1)}"/>`;
    }
  }
  let crumbs = "";
  for (let i = 0; i < 26; i++) {
    const x = tx + (rnd() - 0.3) * 34 * k, y = ty + (rnd() - 0.6) * 22 * k, r = 0.5 + rnd() * 2.6;
    crumbs += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="thumb" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".7" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="m"><ellipse cx="${tx}" cy="${ty}" rx="${11.5 * k}" ry="${15.5 * k}" fill="url(#thumb)" transform="rotate(-24 ${tx} ${ty})"/></mask>
    <filter id="smudge"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="#fff"/>
  <g mask="url(#m)" filter="url(#smudge)"><g transform="rotate(-24 ${tx} ${ty})" fill="none" stroke="#6b4a2c" stroke-width="${0.32 * k}" opacity=".45">${ridges}</g></g>
  <g fill="#5e4128" opacity=".55" filter="url(#smudge)">${crumbs}</g>
  <text x="${75 * k}" y="${203 * k}" font-size="${3.4 * k}" text-anchor="middle" font-family="Times New Roman" fill="#4a3d2c" opacity=".8">— 112 —</text>
</svg>`;
}

// an ivy leaf: five pointed lobes about where the stalk joins it
function ivyLeaf() {
  const S = 900, cx = 450, cy = 540, lobes = [[-90, 250, 0.36], [-152, 185, 0.34], [-28, 185, 0.34], [160, 120, 0.36], [20, 120, 0.36]];
  const R = (t) => {
    let r = 40;
    for (const [deg, a, w] of lobes) {
      let d = Math.abs(t - (deg * Math.PI) / 180) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      r = Math.max(r, 135 + a * Math.exp(-((d / w) ** 1.6)));
    }
    return r;
  };
  const pts = [];
  for (let i = 0; i < 720; i++) {
    const t = -Math.PI + (i / 720) * Math.PI * 2;
    // a notch where the stalk comes in
    let r = R(t);
    const down = Math.abs(t - Math.PI / 2);
    if (down < 0.5) r *= 0.72 + 0.28 * (down / 0.5) ** 2;
    r *= 1 + (rnd() - 0.5) * 0.012;
    pts.push(`${f(cx + Math.cos(t) * r)},${f(cy + Math.sin(t) * r)}`);
  }
  let veins = "";
  for (const [deg, a] of lobes) {
    const t = (deg * Math.PI) / 180, L = 135 + a - 34;
    const ex = cx + Math.cos(t) * L, ey = cy + Math.sin(t) * L;
    veins += `<path d="M${cx} ${cy} Q${f(cx + Math.cos(t + 0.06) * L * 0.5)} ${f(cy + Math.sin(t + 0.06) * L * 0.5)} ${f(ex)} ${f(ey)}" stroke-width="7"/>`;
    for (let s = 0.25; s < 0.85; s += 0.17) {
      const bx = cx + Math.cos(t) * L * s, by = cy + Math.sin(t) * L * s;
      for (const side of [-1, 1]) {
        const tt = t + side * (0.75 + rnd() * 0.25), l = L * (0.32 - s * 0.22);
        veins += `<path d="M${f(bx)} ${f(by)} q${f(Math.cos(tt) * l * 0.5)} ${f(Math.sin(tt) * l * 0.5)} ${f(Math.cos(tt + side * 0.3) * l)} ${f(Math.sin(tt + side * 0.3) * l)}" stroke-width="2.6"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <radialGradient id="body" cx="50%" cy="58%" r="58%"><stop offset="0" stop-color="#7a6a36"/><stop offset=".55" stop-color="#5f5228"/><stop offset="1" stop-color="#3e3218"/></radialGradient>
    <filter id="mottle" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="4" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 .26  0 0 0 0 .16  0 0 0 0 .05  0 0 0 1.1 -.35" result="brown"/>
      <feComposite in="brown" in2="SourceGraphic" operator="atop"/>
    </filter>
    <clipPath id="leaf"><polygon points="${pts.join(" ")}"/></clipPath>
  </defs>
  <g clip-path="url(#leaf)">
    <polygon points="${pts.join(" ")}" fill="url(#body)" filter="url(#mottle)"/>
    <g fill="none" stroke="#9c8a55" stroke-linecap="round" opacity=".42">${veins}</g>
  </g>
  <polygon points="${pts.join(" ")}" fill="none" stroke="#32280f" stroke-width="3" opacity=".6"/>
  <path d="M${cx} ${cy} q-4 70 26 140" fill="none" stroke="#4e4020" stroke-width="12" stroke-linecap="round"/>
</svg>`;
}

// ── the last letter: 190 × 260 mm at 8 px/mm ────────────────────────────────
function lastEmboss() {
  const k = 8, W = 190 * k, H = 260 * k, cx = 95 * k, cy = 20 * k, u = 1.15 * k;
  // the house's key: a trefoil bow, a shank, its bit (shared/keyArt.js)
  const ring = (x, y) => `<circle cx="${f(cx + x * u)}" cy="${f(cy + y * u)}" r="${f(2.2 * u)}" fill="none" stroke="#fff" stroke-width="${f(1.25 * u)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><filter id="b"><feGaussianBlur stdDeviation="${f(0.45 * k)}"/></filter></defs>
  <rect width="100%" height="100%" fill="#000"/>
  <g filter="url(#b)" transform="rotate(-90 ${cx} ${cy})">
    ${ring(-7.6, 0)}${ring(-10.4, -2.4)}${ring(-10.4, 2.4)}
    <rect x="${f(cx - 5.6 * u)}" y="${f(cy - 0.8 * u)}" width="${f(17 * u)}" height="${f(1.6 * u)}" fill="#fff"/>
    <rect x="${f(cx + 8.4 * u)}" y="${f(cy + 0.6 * u)}" width="${f(1.6 * u)}" height="${f(3.6 * u)}" fill="#fff"/>
    <rect x="${f(cx + 5.6 * u)}" y="${f(cy + 0.6 * u)}" width="${f(1.4 * u)}" height="${f(2.6 * u)}" fill="#fff"/>
  </g>
</svg>`;
}
function lastPrint() {
  const k = 8, W = 190 * k, H = 260 * k;
  let laid = "", chain = "";
  for (let y = 0; y < 260; y += 0.9) laid += `<line x1="0" y1="${f(y * k)}" x2="${W}" y2="${f(y * k)}"/>`;
  for (let x = 8; x < 190; x += 24) chain += `<line x1="${f(x * k)}" y1="0" x2="${f(x * k)}" y2="${H}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#fff"/>
  <g stroke="#6e5a3c" stroke-width="1.4" opacity=".1">${laid}</g>
  <g stroke="#6e5a3c" stroke-width="3" opacity=".06">${chain}</g>
</svg>`;
}

await Promise.all([
  write("silas-print", silas()),
  ...((charts) => [write("orion-print", charts[0]), write("orion-front", charts[1])])(orion()),
  write("ivy-print", ivy()),
  write("ivy-leaf", ivyLeaf()),
  write("last-emboss", lastEmboss()),
  write("last-print", lastPrint()),
]);
