// The counting room's two clues, drawn in code from the game's own data, for
// room_counting.py:
//   cards.png     the six index cards pinned on the board, side by side, each
//                 with its number in ink (levels/room4/room4.js CARDS — the
//                 sequence puzzle's own: levels/sequence SEQ_START)
//   painting.png  the painting on the left wall: a farmhouse at dawn, a
//                 telegraph pole, its five wires, and the six birds on them
//                 just where the wires puzzle has them (levels/wires/puzzle.js)
//
//   node art/blender/counting_boards.mjs  →  .artifacts/rooms/
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { WIRE_BIRDS, PICTURE, wireY } from "../../src/levels/wires/puzzle.js";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const root = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const out = root(".artifacts/rooms/");
mkdirSync(out, { recursive: true });
let seed = 4413;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const write = (name, svg) => sharp(Buffer.from(svg)).png().toFile(`${out}${name}.png`);

// the cards' numbers, as the room has them
const CARDS = JSON.parse(readFileSync(root("src/levels/room4/room4.js"), "utf8").match(/const CARDS = (\[[^\]]*\]);/)[1]);

// ── the six index cards ─────────────────────────────────────────────────────
{
  const cw = 300, ch = 480;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw * 6}" height="${ch}">
<defs><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .2  0 0 0 .18 0"/></filter>
<filter id="ink"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter></defs>`;
  CARDS.forEach((n, i) => {
    const x = i * cw, tone = ["#e4dcc4", "#ddd4b8", "#e8e0ca"][i % 3];
    s += `<rect x="${x}" y="0" width="${cw}" height="${ch}" fill="${tone}"/><rect x="${x}" y="0" width="${cw}" height="${ch}" filter="url(#paper)"/>`;
    // the ruling: a red line under the head, pale blue lines down the card
    s += `<line x1="${x + 12}" y1="78" x2="${x + cw - 12}" y2="78" stroke="#b0443a" stroke-width="2.5" opacity=".8"/>`;
    for (let y = 120; y < ch - 20; y += 38) s += `<line x1="${x + 12}" y1="${y}" x2="${x + cw - 12}" y2="${y}" stroke="#6a8ab0" stroke-width="1.6" opacity=".55"/>`;
    // the number, large, in ink; a pencilled tick in the corner
    s += `<text x="${x + cw / 2}" y="${ch * 0.6}" font-family="Segoe Print, Comic Sans MS, cursive" font-size="190" font-weight="bold" text-anchor="middle" fill="#1a1a2e" filter="url(#ink)">${n}</text>`;
    s += `<path d="M${x + cw - 54},${44} l10,12 l20,-26" stroke="#555" stroke-width="3" fill="none" opacity=".5"/>`;
    // handling: a soft thumb-mark, the corners darkened
    s += `<ellipse cx="${x + 40 + rnd() * 30}" cy="${ch - 60 - rnd() * 40}" rx="30" ry="22" fill="#8a7448" opacity=".12"/>`;
    s += `<rect x="${x}" y="0" width="${cw}" height="${ch}" fill="none" stroke="#8a7a5a" stroke-width="8" opacity=".35"/>`;
  });
  s += `</svg>`;
  await write("cards", s);
}

// ── the painting: a farmhouse at dawn, the birds on the wires ──────────────
{
  const W = PICTURE.width, H = PICTURE.height;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a5c"/><stop offset=".45" stop-color="#7a7a8a"/><stop offset=".7" stop-color="#d89a62"/><stop offset=".82" stop-color="#f0c27a"/></linearGradient>
<linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a2a"/><stop offset="1" stop-color="#22261a"/></linearGradient>
<radialGradient id="sun" cx="${0.3 * W}" cy="${0.78 * H}" r="${0.35 * W}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>
<filter id="brush"><feTurbulence type="fractalNoise" baseFrequency=".012 .05" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14"/></filter>
<filter id="canvas"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 .2  0 0 0 0 .16  0 0 0 0 .1  0 0 0 .22 0"/></filter>
</defs>
<g filter="url(#brush)">
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" fill="url(#sun)"/>`;
  // clouds lit from below
  for (let i = 0; i < 9; i++) s += `<ellipse cx="${rnd() * W}" cy="${H * (0.12 + rnd() * 0.3)}" rx="${120 + rnd() * 200}" ry="${16 + rnd() * 18}" fill="${["#c08a6a", "#9a7a7a", "#e0a878"][i % 3]}" opacity=".55"/>`;
  // the hills, the field, the farmhouse with a lit window, a tree
  const hz = H * 0.8;
  s += `<path d="M0,${hz} C${W * 0.2},${hz - 50} ${W * 0.4},${hz - 20} ${W * 0.6},${hz - 46} S${W * 0.9},${hz - 30} ${W},${hz - 40} L${W},${H} L0,${H} Z" fill="#3a3a30"/>`;
  s += `<path d="M0,${hz + 20} C${W * 0.3},${hz + 6} ${W * 0.6},${hz + 26} ${W},${hz + 10} L${W},${H} L0,${H} Z" fill="url(#field)"/>`;
  const fx = W * 0.72, fy = hz + 4;
  s += `<rect x="${fx}" y="${fy - 70}" width="150" height="70" fill="#2a2420"/><path d="M${fx - 12},${fy - 70} L${fx + 75},${fy - 125} L${fx + 162},${fy - 70} Z" fill="#1e1a18"/>`;
  s += `<rect x="${fx + 110}" y="${fy - 112}" width="14" height="30" fill="#1e1a18"/><rect x="${fx + 30}" y="${fy - 48}" width="18" height="16" fill="#f0b860"/>`;
  s += `<rect x="${fx + 180}" y="${fy - 50}" width="70" height="50" fill="#262220"/>`;
  s += `<ellipse cx="${W * 0.12}" cy="${hz - 60}" rx="70" ry="80" fill="#22261a"/><rect x="${W * 0.12 - 8}" y="${hz - 20}" width="16" height="40" fill="#1a1612"/>`;
  s += `</g>`;
  // the telegraph pole, its crossarm, the five wires sagging either way (crisp: the clue)
  const px = PICTURE.poleX;
  s += `<rect x="${px - 9}" y="${H * 0.08}" width="18" height="${H * 0.82}" fill="#1e1610"/>`;
  for (let w = 0; w < 5; w++) {
    const y = wireY(w, px);
    s += `<rect x="${px - 50}" y="${y - 4}" width="100" height="8" fill="#22180e"/>`;
    const pts = Array.from({ length: 65 }, (_, i) => { const x = (i / 64) * W; return `${x.toFixed(1)},${wireY(w, x).toFixed(1)}`; });
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="#141010" stroke-width="3.2"/>`;
  }
  // the birds: small dark sparrows, each with its feet on its wire
  for (const b of WIRE_BIRDS) {
    const x = b.x * W, y = wireY(b.pos, x), facing = b.x < 0.5 ? 1 : -1;
    s += `<g transform="translate(${x},${y}) scale(${facing},1)">
<ellipse cx="0" cy="-22" rx="20" ry="15" fill="#2a2018"/><circle cx="14" cy="-36" r="10" fill="#2a2018"/>
<path d="M22,-37 l9,3 l-9,2 Z" fill="#3a2a18"/><path d="M-18,-24 l-20,8 l4,-12 Z" fill="#241a12"/>
<path d="M-6,-30 q-8,-6 -18,-2" stroke="#4a3626" stroke-width="3" fill="none"/>
<line x1="-3" y1="-8" x2="-4" y2="0" stroke="#1a1410" stroke-width="2.5"/><line x1="5" y1="-8" x2="5" y2="0" stroke="#1a1410" stroke-width="2.5"/></g>`;
  }
  s += `<rect width="${W}" height="${H}" filter="url(#canvas)"/></svg>`;
  await write("painting", s);
}
console.log("counting boards", CARDS.join(" "));
