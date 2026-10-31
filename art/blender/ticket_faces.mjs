// What is printed on the railway tickets in Room IV's top drawer (The Ticket
// Drawer, levels/station; ticket_drawer.py lays them out and renders them).
//
// Eight card tickets of the old Edmondson size, 57 × 30 mm, one for each train
// of the puzzle (src/levels/station/rows.js), letterpress-printed in the
// railway's own DIN lettering: the class and the kind of fare, a serial number
// in red, where the ticket is for, when its train leaves and from which
// platform; the dating press's 13 OC 61 up one end; and, stamped across the
// foot by hand, what became of the train. In each destination still BOARDING
// one letter was struck from a slug that sat low in the forme: it prints a
// little lower than the rest, askew, and inked twice.
//
// Also the backs of the hundreds of others standing in the drawer behind them
// (only their edges and their backs are seen): plain card, the conditions in
// small print.
//
//   node art/blender/ticket_faces.mjs  →  .artifacts/rooms/tickets-faces.png
//   (colour), tickets-press.png (where the type bit into the card: dark is
//   pressed in), tickets-backs.png; and tickets.json (which cell is which)
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { STATION_ROWS } from "../../src/levels/station/rows.js";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const out = path(".artifacts/rooms/");
mkdirSync(out, { recursive: true });

const PX = 30;                                   // pixels a millimetre
const TW = 57, TH = 30;                          // the ticket, mm
const W = TW * PX, H = TH * PX;
const COLS = 2;
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w / PX} ${h / PX}">${body}</svg>`);
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// the card stocks: cream, a pale green, buff, a faded pink
const STOCK = { cream: "#e2d6b4", green: "#cad3ad", buff: "#dcc595", pink: "#e0c0ae" };
const STOCK_OF = ["cream", "green", "buff", "pink", "cream", "pink", "green", "buff"];
// the stamps' inks
const STAMP = { BOARDING: "#24336f", DELAYED: "#8f4f17", CANCELLED: "#8a231b", "NO SERVICE": "#8a231b" };
// the one ticket of the four that is a child's: the room's own story has
// three singles and one half-fare among them
const CHILD = "LINDON";
const INK = "#1c1813", RED = "#93281d", DATE = "#2b2436";
const DIN = "Bahnschrift, 'Arial Narrow', Arial, sans-serif";

// ── the age of a card: browned at its edges, foxed, handled ───────────────
function aged(stock, r) {
  let s = `<rect width="${TW}" height="${TH}" fill="${STOCK[stock]}"/>`;
  s += `<defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.35"/></filter>`;
  s += `<filter id="softer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>`;
  for (const [id, x1, y1, x2, y2] of [["eL", 0, 0, 1, 0], ["eR", 1, 0, 0, 0], ["eT", 0, 0, 0, 1], ["eB", 0, 1, 0, 0]])
    s += `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#6b4a22" stop-opacity="0.32"/><stop offset="0.07" stop-color="#6b4a22" stop-opacity="0.08"/><stop offset="0.2" stop-color="#6b4a22" stop-opacity="0"/></linearGradient>`;
  s += `</defs>`;
  for (const id of ["eL", "eR", "eT", "eB"]) s += `<rect width="${TW}" height="${TH}" fill="url(#${id})"/>`;
  // the handling: a grey thumb where it was held, a broad tea-brown cloud
  s += `<ellipse cx="${4 + r() * 8}" cy="${8 + r() * 14}" rx="${5 + r() * 3}" ry="${7 + r() * 3}" fill="#5a5040" opacity="${0.05 + r() * 0.04}" filter="url(#softer)"/>`;
  s += `<ellipse cx="${10 + r() * 37}" cy="${5 + r() * 20}" rx="${9 + r() * 9}" ry="${5 + r() * 6}" fill="#8a6430" opacity="${0.05 + r() * 0.05}" filter="url(#softer)"/>`;
  // foxing: a few brown spots, never on the destination
  const n = 3 + Math.floor(r() * 6);
  for (let k = 0; k < n; k++) {
    const x = 2 + r() * 53, y = r() < 0.5 ? 1 + r() * 9 : 20 + r() * 9, rad = 0.15 + r() * 0.5;
    s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#6e4518" opacity="${0.25 + r() * 0.3}" filter="url(#soft)"/>`;
  }
  // flecks in the card itself
  for (let k = 0; k < 220; k++) {
    const dark = r() < 0.75;
    s += `<rect x="${r() * TW}" y="${r() * TH}" width="${0.05 + r() * 0.18}" height="${0.04 + r() * 0.1}" fill="${dark ? "#4c3820" : "#f7f0dc"}" opacity="${dark ? 0.12 + r() * 0.2 : 0.3}"/>`;
  }
  return s;
}

// where the worn type and the dry rubber missed: ink taken out in specks
// (over x0…x0+w, y0…y0+h in the user space of what it masks)
function specks(id, r, count, size, cover = 1, [x0, y0, w, h] = [0, 0, TW, TH]) {
  let s = `<mask id="${id}" maskUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${w}" height="${h}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/>`;
  for (let k = 0; k < count; k++)
    s += `<circle cx="${x0 + r() * w}" cy="${y0 + r() * h}" r="${size * (0.3 + r())}" fill="#000" opacity="${(0.35 + r() * 0.65) * cover}"/>`;
  return s + `</mask>`;
}

// ── what the press printed: one forme for every ticket, the words changed ─
function printed(row, r, serial) {
  const child = row.dest === CHILD;
  let s = "";
  const text = (x, y, size, body, o = {}) =>
    `<text x="${x}" y="${y}" font-family="${DIN}" font-size="${size}" font-weight="${o.weight ?? 700}"${o.stretch ? ` font-stretch="${o.stretch}"` : ""} fill="${o.fill ?? INK}" text-anchor="${o.anchor ?? "start"}" letter-spacing="${o.spacing ?? 0}"${o.transform ? ` transform="${o.transform}"` : ""}>${body}</text>`;
  const rule = (y, t) => `<rect x="2.2" y="${y}" width="${TW - 4.4}" height="${t}" fill="${INK}"/>`;
  s += rule(1.45, 0.45) + rule(2.35, 0.16);
  s += text(3.0, 5.7, 2.35, "2ND CLASS", { spacing: 0.12 });
  s += text(TW / 2, 5.7, 2.35, child ? "HALF · CHILD" : "SINGLE", { anchor: "middle", spacing: 0.12, fill: child ? RED : INK });
  s += text(TW - 3.0, 5.8, 2.7, `N<tspan font-size="1.75" dy="-0.7" text-decoration="underline">o</tspan><tspan dy="0.7"> ${serial}</tspan>`, { anchor: "end", fill: RED, weight: 600 });
  s += rule(7.2, 0.16);
  s += text(3.0, 10.3, 1.9, "TO", { weight: 600, spacing: 0.15 });
  // the destination: each letter its own slug, at an even pitch
  const PITCH = 5.6, n = row.dest.length, x0 = TW / 2 - (PITCH * (n - 1)) / 2, BASE = 16.7, SIZE = 7.7;
  for (let k = 0; k < n; k++) {
    const x = x0 + k * PITCH;
    if (k !== row.wrongIdx) { s += text(x, BASE, SIZE, row.dest[k], { anchor: "middle", stretch: "condensed" }); continue; }
    // the low slug: down a little, turned a little, and inked twice
    const drop = SIZE * 0.1, turn = -5;
    const at = `translate(${x} ${BASE + drop}) rotate(${turn} 0 ${-SIZE * 0.35})`;
    s += text(0, 0, SIZE, row.dest[k], { anchor: "middle", stretch: "condensed", transform: at });
    s += text(0.13, 0, SIZE, row.dest[k], { anchor: "middle", stretch: "condensed", transform: at });
  }
  s += rule(18.6, 0.16);
  s += text(3.0, 21.7, 1.9, "DEP.", { weight: 600, spacing: 0.15 });
  s += text(2.8, 27.0, 6.4, row.time, { stretch: "semi-condensed" });
  s += text(22.6, 21.7, 1.9, "PLAT.", { weight: 600, spacing: 0.15 });
  s += text(22.4, 27.0, 6.4, row.track, { stretch: "semi-condensed" });
  s += rule(28.0, 0.16) + rule(28.55, 0.45);
  return s;
}

// the dating press, up the far end: the day the ticket was issued
function dated(r) {
  const y = 14.5 + (r() - 0.5) * 2, x = 56.05 + (r() - 0.5) * 0.15;
  return `<text x="0" y="0" font-family="${DIN}" font-size="1.85" font-weight="700" fill="${DATE}" text-anchor="middle" letter-spacing="0.12" transform="translate(${x} ${y}) rotate(${-90 + (r() - 0.5) * 3})" opacity="0.88">13 OC 61</text>`;
}

// the rubber stamp across its foot: the word in a box, unevenly inked
function stamped(word, r, id) {
  const cx = 41.3 + (r() - 0.5) * 1.6, cy = 23.7 + (r() - 0.5) * 0.8, turn = -7 + (r() - 0.5) * 5;
  const w = 23.2, h = 7.6, ink = STAMP[word];
  let s = `<defs>${specks(`${id}m`, r, 700, 0.09, 1, [-w / 2 - 1, -h / 2 - 1, w + 2, h + 2])}<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#fff" stop-opacity="${0.95 - r() * 0.15}"/><stop offset="1" stop-color="#fff" stop-opacity="${0.5 + r() * 0.25}"/></linearGradient>`;
  s += `<mask id="${id}f" maskUnits="userSpaceOnUse" x="0" y="0" width="${TW}" height="${TH}"><rect width="${TW}" height="${TH}" fill="url(#${id}g)"/></mask>`;
  s += `<filter id="${id}b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.06"/></filter></defs>`;
  s += `<g mask="url(#${id}f)"><g mask="url(#${id}m)" filter="url(#${id}b)" transform="translate(${cx} ${cy}) rotate(${turn})" opacity="0.86">`;
  s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.1" fill="none" stroke="${ink}" stroke-width="0.55"/>`;
  s += `<rect x="${-w / 2 + 0.9}" y="${-h / 2 + 0.9}" width="${w - 1.8}" height="${h - 1.8}" rx="0.6" fill="none" stroke="${ink}" stroke-width="0.18"/>`;
  const size = word.length > 8 ? 3.85 : 4.5;
  s += `<text x="0" y="${size * 0.36}" font-family="${DIN}" font-size="${size}" font-weight="700" font-stretch="condensed" fill="${ink}" text-anchor="middle" letter-spacing="0.25">${word}</text>`;
  return s + `</g></g>`;
}

// ── the faces ──────────────────────────────────────────────────────────────
const ROWS = Math.ceil(STATION_ROWS.length / COLS);
const faces = [], presses = [], cells = [];
for (const [i, row] of STATION_ROWS.entries()) {
  const r = rng(4127 + i * 977);
  const serial = String(Math.floor(1000 + r() * 8999)).padStart(5, "0");
  const stock = STOCK_OF[i % STOCK_OF.length];
  const id = `t${i}`;
  // the type, softened as ink spreads into card, worn in specks
  const type = `<defs>${specks(`${id}w`, r, 1400, 0.035, 0.8)}<filter id="${id}i" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.035"/></filter></defs>`
    + `<g mask="url(#${id}w)" filter="url(#${id}i)" opacity="0.93">${printed(row, r, serial)}</g>`;
  const face = aged(stock, r) + type + dated(r) + stamped(row.remark, r, id);
  // where the type bit in: the type alone, darker where the low slug struck
  // harder; everywhere else the card as it was
  const press = `<rect width="${TW}" height="${TH}" fill="#fff"/><defs><filter id="p" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.05"/></filter></defs>`
    + `<g filter="url(#p)">${printed(row, rng(4127 + i * 977 + 1), serial).replaceAll(INK, "#6a6a6a").replaceAll(RED, "#7a7a7a")}</g>`;
  faces.push({ input: await sharp(svg(W, H, face)).png().toBuffer(), left: (i % COLS) * W, top: Math.floor(i / COLS) * H });
  presses.push({ input: await sharp(svg(W, H, press)).png().toBuffer(), left: (i % COLS) * W, top: Math.floor(i / COLS) * H });
  cells.push({ dest: row.dest, time: row.time, remark: row.remark, stock, cell: [i % COLS, Math.floor(i / COLS)] });
}
const sheet = (list, file, bg) => sharp({ create: { width: W * COLS, height: H * ROWS, channels: 3, background: bg } }).composite(list).png().toFile(`${out}${file}`);
await sheet(faces, "tickets-faces.png", "#d8cca8");
await sheet(presses, "tickets-press.png", "#ffffff");

// ── the backs: the conditions in small print, a stock to each ─────────────
const BW = TW * 12, BH = TH * 12;                // (seen edge-on and far: coarser)
const backs = [];
for (const [k, stock] of Object.keys(STOCK).entries()) {
  const r = rng(77 + k * 31);
  let body = aged(stock, r);
  body += `<g fill="#3a3128" opacity="0.5">`;
  body += `<rect x="20" y="3" width="17" height="0.7"/>`;
  for (let y = 6; y < 26; y += 1.3) {
    let x = 4;
    while (x < 52) { const w = 0.8 + r() * 3.2; if (x + w > 53) break; body += `<rect x="${x}" y="${y}" width="${w}" height="0.42"/>`; x += w + 0.5; }
  }
  body += `</g>`;
  backs.push({ input: await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}" viewBox="0 0 ${TW} ${TH}">${body}</svg>`)).png().toBuffer(), left: (k % 2) * BW, top: Math.floor(k / 2) * BH });
}
await sharp({ create: { width: BW * 2, height: BH * 2, channels: 3, background: "#d8cca8" } }).composite(backs).png().toFile(`${out}tickets-backs.png`);

// ── a penny's face, as a height (light stands up): the rim and its beads,
// ONE PENNY round the top and its year under, a wreath round a large 1 —
// worn down, as everything that went from hand to hand for thirty years ──
{
  const S = 512, c = 50;
  let body = `<rect width="100" height="100" fill="#7a7a7a"/><defs><filter id="w" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.45"/></filter></defs><g filter="url(#w)">`;
  body += `<circle cx="${c}" cy="${c}" r="49" fill="none" stroke="#f2f2f2" stroke-width="4"/>`;
  for (let k = 0; k < 72; k++) { const a = (k / 72) * Math.PI * 2; body += `<circle cx="${c + Math.sin(a) * 43.2}" cy="${c - Math.cos(a) * 43.2}" r="0.95" fill="#c8c8c8"/>`; }
  const arc = (word, r, from, to, size, below) => {
    let s = "";
    [...word].forEach((ch, k) => {
      const a = from + ((to - from) * (k + 0.5)) / word.length;
      const x = c + Math.sin(a) * r, y = c - Math.cos(a) * r, turn = (a * 180) / Math.PI + (below ? 180 : 0);
      s += `<text x="0" y="0" font-family="Georgia, serif" font-weight="bold" font-size="${size}" fill="#e6e6e6" text-anchor="middle" dominant-baseline="central" transform="translate(${x} ${y}) rotate(${turn})">${ch}</text>`;
    });
    return s;
  };
  body += arc("ONE PENNY", 35.5, -1.25, 1.25, 9.5);
  body += arc("1937", 35.5, Math.PI + 0.55, Math.PI - 0.55, 9.5, true);
  for (const side of [-1, 1]) for (let k = 0; k < 7; k++) {
    const a = Math.PI + side * (0.55 + k * 0.32), x = c + Math.sin(a) * 22, y = c - Math.cos(a) * 22;
    body += `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="3.6" fill="#d6d6d6" transform="rotate(${(a * 180) / Math.PI + side * 35} ${x} ${y})"/>`;
  }
  body += `<text x="${c}" y="${c + 1}" font-family="Georgia, serif" font-weight="bold" font-size="34" fill="#eeeeee" text-anchor="middle" dominant-baseline="central">1</text>`;
  body += `</g>`;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 100 100">${body}</svg>`)).grayscale().png().toFile(`${out}penny.png`);
}

writeFileSync(`${out}tickets.json`, JSON.stringify({ mm: [TW, TH], cols: COLS, rows: ROWS, tickets: cells, backs: Object.keys(STOCK) }, null, 1));
console.log("tickets", STATION_ROWS.length, `${W * COLS}×${H * ROWS}`);
