// The rooms' flat things, drawn in code for the rooms' Blender scenes:
//   study-paper.png   a green damask, a tile of it: ferns and acanthus scrolls
//   study-print.png   three plants pressed and drawn, foxed, labelled in Latin
//   cipher.png        the cipher wheel's brass face: two rings of letters
//   spines.png        leather book spines, 8 across, 4 down, gilt and titled
//   library-rug.png   the library's rug: deep green, a paler border, a medallion
//   cabin-chart.png   the captain's sea chart: a coast, soundings, a compass rose
//
//   node art/blender/room_boards.mjs  →  .artifacts/rooms/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const out = decodeURIComponent(new URL("../../.artifacts/rooms/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(out, { recursive: true });
let seed = 9187;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const write = (name, svg) => sharp(Buffer.from(svg)).png().toFile(`${out}${name}.png`);

// ── a fern frond, drawn: its stem curving, its pinnae paired along it ────────
function frond(x, y, length, lean, ink, width = 2.2, leaflet = 0.2) {
  let s = "";
  const pts = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    return [x + Math.sin(t * 1.2) * lean * length * 0.25, y - t * length];
  });
  s += `<path d="M${pts.map((p) => p.join(",")).join(" L")}" stroke="${ink}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;
  for (let i = 2; i < 29; i += 1.6) {
    const k = Math.floor(i), t = k / 29, [px, py] = pts[k], l = length * leaflet * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 3;
    for (const side of [-1, 1]) {
      const ex = px + side * l, ey = py - l * 0.35;
      s += `<path d="M${px},${py} Q${px + side * l * 0.5},${py - l * 0.45} ${ex},${ey} Q${px + side * l * 0.55},${py + l * 0.05} ${px},${py}" fill="${ink}" opacity=".9"/>`;
    }
  }
  return s;
}
// a flowering stem: leaves alternate up it, a head of flowers at its top
function flowering(x, y, length, ink, flower) {
  let s = `<path d="M${x},${y} C${x + 8},${y - length * 0.4} ${x - 10},${y - length * 0.7} ${x + 4},${y - length}" stroke="${ink}" stroke-width="2.2" fill="none"/>`;
  for (let i = 1; i < 8; i++) {
    const t = i / 9, py = y - length * t, side = i % 2 ? 1 : -1, l = 34 * (1 - t * 0.5);
    s += `<path d="M${x},${py} Q${x + side * l * 0.6},${py - l * 0.6} ${x + side * l},${py - l * 0.2} Q${x + side * l * 0.5},${py + l * 0.15} ${x},${py}" fill="${ink}" opacity=".85"/>`;
    s += `<path d="M${x},${py} L${x + side * l * 0.85},${py - l * 0.22}" stroke="#e6dcc0" stroke-width=".8" opacity=".6"/>`;
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, r = 14;
    s += `<ellipse cx="${x + 4 + Math.cos(a) * r}" cy="${y - length - 8 + Math.sin(a) * r * 0.8}" rx="7" ry="4" transform="rotate(${(a * 180) / Math.PI} ${x + 4 + Math.cos(a) * r} ${y - length - 8 + Math.sin(a) * r * 0.8})" fill="${flower}"/>`;
  }
  return s + `<circle cx="${x + 4}" cy="${y - length - 8}" r="5" fill="#6a4a10"/>`;
}

// ── the study's paper ───────────────────────────────────────────────────────
{
  const S = 512, ground = "#173523", ink = "#1f4630";
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="${ground}"/>`;
  // the motif twice in the tile, a half-drop, each mirrored about its own upright
  for (const [cx, cy] of [[S * 0.25, S * 0.3], [S * 0.75, S * 0.8], [S * 0.75, -S * 0.2], [S * 0.25, S * 1.3]]) {
    s += `<g transform="translate(${cx},${cy})">`;
    for (const m of [1, -1]) {
      s += `<g transform="scale(${m},1)">`;
      s += `<path d="M0,90 C30,70 60,40 50,0 C42,-30 10,-40 8,-70 C30,-60 70,-30 74,10 C78,50 40,90 0,110 Z" fill="${ink}"/>`;
      s += `<path d="M8,-70 C18,-100 40,-110 58,-104 C44,-96 30,-86 26,-70" fill="${ink}"/>`;
      s += `<path d="M20,40 C40,30 52,10 46,-10" stroke="${ground}" stroke-width="5" fill="none"/>`;
      s += `<path d="M10,60 C-2,30 30,10 20,-30" stroke="#28553a" stroke-width="2.5" fill="none" opacity=".7"/>`;
      s += `</g>`;
    }
    s += `<ellipse cx="0" cy="-118" rx="10" ry="18" fill="${ink}"/><circle cx="0" cy="118" r="7" fill="${ink}"/></g>`;
  }
  s += `</svg>`;
  await write("study-paper", s);
}

// ── the botanical print ─────────────────────────────────────────────────────
{
  const W = 1200, H = 860;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><radialGradient id="age" cx="50%" cy="50%" r="75%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#5a3c12" stop-opacity=".5"/></radialGradient>
<radialGradient id="fox"><stop offset="0" stop-color="#7a5020" stop-opacity=".55"/><stop offset="1" stop-color="#7a5020" stop-opacity="0"/></radialGradient>
<filter id="tooth"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .1  0 0 0 .22 0"/></filter></defs>
<rect width="${W}" height="${H}" fill="#d9ccaa"/><rect width="${W}" height="${H}" filter="url(#tooth)"/>
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#5a4a30" stroke-width="2"/>`;
  s += frond(260, 720, 560, 0.6, "#3c4a26", 3, 0.24);
  s += flowering(600, 720, 470, "#40502a", "#8a5a8a");
  s += frond(930, 720, 520, -0.5, "#4a4a22", 2.6, 0.17);
  for (const [x, t] of [[260, "Polypodium vulgare"], [600, "Digitalis purpurea"], [930, "Asplenium filix"]]) {
    s += `<text x="${x}" y="790" font-family="Georgia, serif" font-style="italic" font-size="26" text-anchor="middle" fill="#3a2c18">${t}</text>`;
  }
  for (let i = 0; i < 40; i++) s += `<circle cx="${rnd() * W}" cy="${rnd() * H}" r="${3 + rnd() * 22}" fill="url(#fox)"/>`;
  s += `<rect width="${W}" height="${H}" fill="url(#age)"/></svg>`;
  await write("study-print", s);
}

// ── the cipher wheel ────────────────────────────────────────────────────────
{
  const S = 1024, C = 512, A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs><radialGradient id="b" cx="42%" cy="38%" r="75%"><stop offset="0" stop-color="#e8c878"/><stop offset=".6" stop-color="#b08a3e"/><stop offset="1" stop-color="#6a4a18"/></radialGradient></defs>
<rect width="${S}" height="${S}" fill="#000"/><circle cx="${C}" cy="${C}" r="500" fill="url(#b)"/>
<g fill="none" stroke="#2a1a06" stroke-width="5"><circle cx="${C}" cy="${C}" r="490"/><circle cx="${C}" cy="${C}" r="380"/><circle cx="${C}" cy="${C}" r="372"/><circle cx="${C}" cy="${C}" r="262"/><circle cx="${C}" cy="${C}" r="110"/></g>`;
  const ring = (r, shift, size) => [...A].map((ch, i) => {
    const a = ((i + shift) / 26) * Math.PI * 2, x = C + Math.sin(a) * r, y = C - Math.cos(a) * r;
    const t = ((i + shift) / 26) * 360;
    return `<line x1="${C + Math.sin(a + Math.PI / 26) * (r + 54)}" y1="${C - Math.cos(a + Math.PI / 26) * (r + 54)}" x2="${C + Math.sin(a + Math.PI / 26) * (r - 52)}" y2="${C - Math.cos(a + Math.PI / 26) * (r - 52)}" stroke="#2a1a06" stroke-width="3"/>` +
      `<text x="${x}" y="${y}" transform="rotate(${t} ${x} ${y})" font-family="Georgia, serif" font-weight="bold" font-size="${size}" text-anchor="middle" dominant-baseline="central" fill="#1e1204">${ch}</text>`;
  }).join("");
  s += ring(435, 0, 58) + ring(318, 7, 50);
  // the hub, and a pointer at the top
  s += `<circle cx="${C}" cy="${C}" r="70" fill="#5a3c10"/><circle cx="${C}" cy="${C}" r="34" fill="#d8b868"/><path d="M${C - 18},${C - 495} L${C + 18},${C - 495} L${C},${C - 440} Z" fill="#2a1a06"/></svg>`;
  await write("cipher", s);
}

// ── book spines ─────────────────────────────────────────────────────────────
{
  const cw = 128, ch = 512, cols = 8, rows = 4;
  const leathers = ["#7a2a20", "#8a3c22", "#2e5a3a", "#2a4268", "#5e3a20", "#4a3020", "#9a7038", "#2a2e34", "#8a2c38", "#405a30", "#6a5434", "#a05a28"];
  const titles = ["FLORA", "HORTUS", "FILICES", "BOTANY", "MOSSES", "HERBAL", "SEEDS", "ROSES", "LICHENS", "ORCHIDS", "BULBS", "TREES", "PALMS", "VOL. II", "VOL. III", "INDEX"];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw * cols}" height="${ch * rows}">
<defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0"/></filter>
<linearGradient id="round" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity=".08"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient></defs>`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw, y = r * ch, leather = leathers[Math.floor(rnd() * leathers.length)], gilt = rnd() < 0.8;
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${leather}"/>`;
    // raised bands, the panels between them, a label in one
    const bands = [0.12, 0.3, 0.48, 0.66, 0.84];
    for (const b of bands) s += `<rect x="${x}" y="${y + ch * b - 7}" width="${cw}" height="14" fill="#000" opacity=".35"/><rect x="${x}" y="${y + ch * b - 7}" width="${cw}" height="3" fill="#fff" opacity=".1"/>`;
    if (gilt) for (const b of bands) for (const dy of [-11, 10]) s += `<rect x="${x + 6}" y="${y + ch * b + dy}" width="${cw - 12}" height="2.5" fill="#c8a050" opacity=".8"/>`;
    const label = rnd() < 0.7;
    if (label) s += `<rect x="${x + 10}" y="${y + ch * 0.18}" width="${cw - 20}" height="${ch * 0.1}" fill="${rnd() < 0.5 ? "#14100c" : "#5a1a12"}"/>`;
    s += `<text x="${x + cw / 2}" y="${y + ch * 0.245}" font-family="Georgia, serif" font-weight="bold" font-size="18" text-anchor="middle" fill="#d8b060">${titles[Math.floor(rnd() * titles.length)]}</text>`;
    if (rnd() < 0.5) s += `<text x="${x + cw / 2}" y="${y + ch * 0.58}" font-family="Georgia, serif" font-size="16" text-anchor="middle" fill="#c8a050">${["I", "II", "III", "IV", "V"][Math.floor(rnd() * 5)]}</text>`;
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="url(#round)"/><rect x="${x}" y="${y}" width="${cw}" height="${ch}" filter="url(#grain)"/>`;
    // wear at the head and the foot
    s += `<rect x="${x}" y="${y}" width="${cw}" height="10" fill="#c8b090" opacity=".18"/><rect x="${x}" y="${y + ch - 10}" width="${cw}" height="10" fill="#c8b090" opacity=".18"/>`;
  }
  s += `</svg>`;
  await write("spines", s);
}
// ── the library's rug: deep green, a paler border, a medallion, lozenges ────
{
  const W = 1600, H = 1040;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#0e221c"/>
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="#6a6440"/>
<rect x="90" y="90" width="${W - 180}" height="${H - 180}" fill="#18382e"/>
<rect x="110" y="110" width="${W - 220}" height="${H - 220}" fill="none" stroke="#8a7a48" stroke-width="6"/>`;
  // the border's running ornament
  for (let x = 70; x < W - 60; x += 46) for (const y of [65, H - 65]) s += `<path d="M${x},${y} l14,-14 l14,14 l-14,14 Z" fill="#2a3a28"/>`;
  for (let y = 70; y < H - 60; y += 46) for (const x of [65, W - 65]) s += `<path d="M${x},${y} l14,-14 l14,14 l-14,14 Z" fill="#2a3a28"/>`;
  // the field: rows of small lozenges, a medallion in the middle
  for (let y = 170; y < H - 150; y += 70) for (let x = 170; x < W - 150; x += 70) s += `<path d="M${x},${y - 12} l12,12 l-12,12 l-12,-12 Z" fill="#24483a"/><circle cx="${x}" cy="${y}" r="3" fill="#7a6a40"/>`;
  const cx = W / 2, cy = H / 2;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="300" ry="190" fill="#6a2a22"/><ellipse cx="${cx}" cy="${cy}" rx="250" ry="150" fill="#14302a"/>`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    s += `<path d="M${cx},${cy} L${cx + Math.cos(a - 0.12) * 220},${cy + Math.sin(a - 0.12) * 130} L${cx + Math.cos(a) * 245},${cy + Math.sin(a) * 146} L${cx + Math.cos(a + 0.12) * 220},${cy + Math.sin(a + 0.12) * 130} Z" fill="${i % 2 ? "#5a5a36" : "#7a3428"}" opacity=".85"/>`;
  }
  s += `<ellipse cx="${cx}" cy="${cy}" rx="70" ry="44" fill="#8a7a48"/><ellipse cx="${cx}" cy="${cy}" rx="40" ry="24" fill="#5a1c18"/>`;
  for (const [x, y] of [[170, 170], [W - 170, 170], [170, H - 170], [W - 170, H - 170]]) s += `<path d="M${x - 70},${y} L${x},${y - 60} L${x + 70},${y} L${x},${y + 60} Z" fill="#5a2a22" opacity=".9"/>`;
  s += `</svg>`;
  await write("library-rug", s);
}
// ── the captain's sea chart: a coast, soundings, a compass rose, rhumb lines ─
{
  const W = 1600, H = 1100;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><radialGradient id="cage" cx="50%" cy="50%" r="75%"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#5a3c12" stop-opacity=".55"/></radialGradient>
<radialGradient id="cfox"><stop offset="0" stop-color="#7a5020" stop-opacity=".5"/><stop offset="1" stop-color="#7a5020" stop-opacity="0"/></radialGradient>
<filter id="ctooth"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="12"/><feColorMatrix type="matrix" values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .1  0 0 0 .24 0"/></filter></defs>
<rect width="${W}" height="${H}" fill="#d8c8a0"/><rect width="${W}" height="${H}" filter="url(#ctooth)"/>
<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#3a2c18" stroke-width="5"/>
<rect x="46" y="46" width="${W - 92}" height="${H - 92}" fill="none" stroke="#3a2c18" stroke-width="1.5"/>`;
  // the land: a coast that wanders in and out, shaded along its edge
  const coast = [];
  let x = 46, y = 260;
  while (x < W - 46) { coast.push([x, y]); x += 18 + rnd() * 26; y = Math.max(120, Math.min(520, y + (rnd() - 0.5) * 70 + Math.sin(x / 140) * 12)); }
  coast.push([W - 46, y]);
  const land = `M46,46 L${coast.map((p) => p.join(",")).join(" L")} L${W - 46},46 Z`;
  s += `<path d="${land}" fill="#c8b483"/>`;
  for (let k = 1; k <= 4; k++) s += `<path d="M${coast.map(([px, py]) => `${px},${py + k * 9}`).join(" L")}" fill="none" stroke="#5a7090" stroke-width="1.2" opacity="${0.5 - k * 0.1}"/>`;
  s += `<path d="M${coast.map((p) => p.join(",")).join(" L")}" fill="none" stroke="#2a2014" stroke-width="3"/>`;
  // hills inland, a town, a lighthouse
  for (let i = 0; i < 26; i++) { const hx = 80 + rnd() * (W - 160), hy = 70 + rnd() * 120; s += `<path d="M${hx - 14},${hy} q14,-16 28,0" fill="none" stroke="#5a4a30" stroke-width="2"/>`; }
  s += `<text x="${W * 0.32}" y="150" font-family="Georgia, serif" font-style="italic" font-size="34" fill="#3a2c18">Ashcombe Head</text>`;
  // soundings across the water
  for (let i = 0; i < 160; i++) {
    const sx = 70 + rnd() * (W - 140), sy = 300 + rnd() * (H - 380);
    s += `<text x="${sx}" y="${sy}" font-family="Georgia, serif" font-size="${15 + rnd() * 5}" fill="#3a3a40" opacity=".8">${Math.floor(3 + rnd() * 40)}</text>`;
  }
  // the compass rose, its rhumb lines across the whole chart
  const cx = W * 0.68, cy = H * 0.66, R = 180;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    s += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * 2000}" y2="${cy + Math.sin(a) * 2000}" stroke="${i % 4 ? "#7a6a50" : "#8a3a2a"}" stroke-width="${i % 4 ? 0.8 : 1.4}" opacity=".55"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#e4d6b0" stroke="#3a2c18" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${R - 26}" fill="none" stroke="#3a2c18" stroke-width="1.5"/>`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2, long = i % 4 === 0, r = long ? R - 10 : i % 2 ? R * 0.5 : R * 0.72;
    const l = a - (long ? 0.12 : 0.1), rr = a + (long ? 0.12 : 0.1), w = R * 0.16;
    s += `<path d="M${cx},${cy} L${cx + Math.cos(l) * w},${cy + Math.sin(l) * w} L${cx + Math.cos(a) * r},${cy + Math.sin(a) * r} Z" fill="${long ? "#2a2014" : "#6a5a40"}"/>`;
    s += `<path d="M${cx},${cy} L${cx + Math.cos(rr) * w},${cy + Math.sin(rr) * w} L${cx + Math.cos(a) * r},${cy + Math.sin(a) * r} Z" fill="${long ? "#8a3a2a" : "#c8b483"}" stroke="#2a2014" stroke-width=".6"/>`;
  }
  s += `<text x="${cx}" y="${cy - R - 14}" font-family="Georgia, serif" font-weight="bold" font-size="40" text-anchor="middle" fill="#2a2014">N</text>`;
  // a ship under sail, drawn small, and the title in its cartouche
  const shx = W * 0.25, shy = H * 0.72;
  s += `<path d="M${shx - 60},${shy} Q${shx},${shy + 26} ${shx + 66},${shy} Z" fill="#3a2c18"/>`;
  for (const [mx, mh] of [[-34, 90], [0, 110], [34, 84]]) {
    s += `<line x1="${shx + mx}" y1="${shy}" x2="${shx + mx}" y2="${shy - mh}" stroke="#2a2014" stroke-width="2.5"/>`;
    for (let k = 0; k < 3; k++) s += `<path d="M${shx + mx - 20 + k * 3},${shy - mh + 8 + k * 26} Q${shx + mx},${shy - mh + 2 + k * 26} ${shx + mx + 20 - k * 3},${shy - mh + 8 + k * 26} L${shx + mx + 18 - k * 3},${shy - mh + 28 + k * 26} Q${shx + mx},${shy - mh + 34 + k * 26} ${shx + mx - 18 + k * 3},${shy - mh + 28 + k * 26} Z" fill="#efe4c4" stroke="#2a2014" stroke-width="1.2"/>`;
  }
  s += `<rect x="${W * 0.06}" y="${H - 250}" width="440" height="170" fill="#e4d6b0" stroke="#3a2c18" stroke-width="3"/>
<text x="${W * 0.06 + 220}" y="${H - 190}" font-family="Georgia, serif" font-size="40" letter-spacing="4" text-anchor="middle" fill="#2a2014">A NEW CHART</text>
<text x="${W * 0.06 + 220}" y="${H - 145}" font-family="Georgia, serif" font-style="italic" font-size="26" text-anchor="middle" fill="#3a2c18">of the Approaches</text>
<text x="${W * 0.06 + 220}" y="${H - 105}" font-family="Georgia, serif" font-size="20" text-anchor="middle" fill="#3a2c18">Soundings in Fathoms</text>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${rnd() * W}" cy="${rnd() * H}" r="${4 + rnd() * 26}" fill="url(#cfox)"/>`;
  s += `<rect width="${W}" height="${H}" fill="url(#cage)"/></svg>`;
  await write("cabin-chart", s);
}
console.log("room boards");
