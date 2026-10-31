// The counting room's two clues, drawn in code from the game's own data, for
// room_counting.py:
//   cards.png     the six index cards pinned on the board, side by side, each
//                 with its number in ink (levels/room4/room4.js CARDS — the
//                 sequence puzzle's own: levels/sequence SEQ_START)
// (painting.png, the picture on the back wall, is no longer drawn here: it is
// the Blender render of dawn_country.py, put there by dawn_publish.mjs)
//
//   node art/blender/counting_boards.mjs  →  .artifacts/rooms/
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
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

console.log("counting boards", CARDS.join(" "));
