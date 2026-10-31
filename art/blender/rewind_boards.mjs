// What is drawn on the four things on Orion's windowsill (Rewind, Room XI;
// rewind_model.py): the brass clock's enamel dial, the tear-off calendar's
// pages — one a day, from where it lies now back to where it stops — and the
// hours painted up the candle-clock, every hour a ring, every other its
// number. The days and the candle's hours come from the puzzle's own file
// (src/levels/rewind/puzzle.json).
//
//   node art/blender/rewind_boards.mjs  →  .artifacts/rooms/rewind-dial.png,
//   rewind-page-<day>.png, rewind-candle.png
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const out = path(".artifacts/rooms/");
mkdirSync(out, { recursive: true });
const PUZZLE = JSON.parse(readFileSync(path("src/levels/rewind/puzzle.json"), "utf8"));
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

// ── the dial: old cream enamel, a minute track, the hours in a plain serif ─
{
  const S = 1024, c = S / 2;
  let body = `<defs><radialGradient id="g" cx="50%" cy="46%" r="60%"><stop offset="0" stop-color="#efe6d0"/><stop offset="0.85" stop-color="#e2d6b8"/><stop offset="1" stop-color="#c9b994"/></radialGradient></defs>`;
  body += `<circle cx="${c}" cy="${c}" r="${c}" fill="url(#g)"/>`;
  body += `<circle cx="${c}" cy="${c}" r="${c * 0.93}" fill="none" stroke="#2a241c" stroke-width="3"/>`;
  body += `<circle cx="${c}" cy="${c}" r="${c * 0.86}" fill="none" stroke="#2a241c" stroke-width="2"/>`;
  for (let m = 0; m < 60; m++) {
    const a = (m / 60) * Math.PI * 2, five = m % 5 === 0;
    const r0 = c * (five ? 0.84 : 0.865), r1 = c * 0.925;
    body += `<line x1="${c + Math.sin(a) * r0}" y1="${c - Math.cos(a) * r0}" x2="${c + Math.sin(a) * r1}" y2="${c - Math.cos(a) * r1}" stroke="#2a241c" stroke-width="${five ? 9 : 4}" stroke-linecap="round"/>`;
  }
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2, r = c * 0.66;
    body += `<text x="${c + Math.sin(a) * r}" y="${c - Math.cos(a) * r}" font-family="'Times New Roman', Times, serif" font-size="${c * 0.27}" fill="#211c15" text-anchor="middle" dominant-baseline="central">${h}</text>`;
  }
  // (a little star under the twelve: the maker's mark, an astronomer's clock)
  const sy = c - c * 0.34, sr = c * 0.045;
  const star = Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? sr * 0.42 : sr; return `${c + Math.sin(a) * rr},${sy - Math.cos(a) * rr}`; }).join(" ");
  body += `<polygon points="${star}" fill="#6d5326"/>`;
  await sharp(svg(S, S, body)).png().toFile(`${out}rewind-dial.png`);
}

// ── the calendar's pages: a printed band at the head, the day large ────────
{
  const W = 600, H = 788;
  const { from, to } = PUZZLE.calendar;
  for (let day = to; day <= from; day++) {
    let body = `<rect width="${W}" height="${H}" fill="#ebe3cf"/>`;
    body += `<rect y="34" width="${W}" height="96" fill="#7d2a1f"/>`;
    body += `<line x1="0" y1="24" x2="${W}" y2="24" stroke="#b9ad92" stroke-width="3" stroke-dasharray="6 7"/>`;
    for (let k = 0; k < 7; k++) {                // (a row of little stars in the band)
      const x = W / 2 + (k - 3) * 62, y = 82, r = 9;
      const pts = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.42 : r; return `${x + Math.sin(a) * rr},${y - Math.cos(a) * rr}`; }).join(" ");
      body += `<polygon points="${pts}" fill="#e8d6a8"/>`;
    }
    body += `<text x="${W / 2}" y="${H * 0.6}" font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="400" fill="#1d1a16" text-anchor="middle" dominant-baseline="central">${day}</text>`;
    body += `<line x1="70" y1="${H - 80}" x2="${W - 70}" y2="${H - 80}" stroke="#7d2a1f" stroke-width="4"/>`;
    await sharp(svg(W, H, body)).png().toFile(`${out}rewind-page-${day}.png`);
  }
}

// ── the candle's hours: painted round it, a ring an hour, every other hour
// its number on the side that faces the room (the middle of the picture) ──
{
  const { length, hours } = PUZZLE.candle;       // its length in cm, the hours marked on it
  const PX = 40, W = 1024, H = length * PX;
  let body = "";
  for (let h = 1; h <= hours; h++) {
    const y = H - (1 + h) * PX;                  // (ring h, an hour above the last; the first a cm above the foot)
    body += `<rect x="${W * 0.34}" y="${y - 2}" width="${W * 0.32}" height="4" fill="#7a2416" opacity="0.9"/>`;
    if (h % 2 === 0) body += `<text x="${W / 2}" y="${y + PX * 0.5}" font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="${PX * 1.05}" fill="#7a2416" text-anchor="middle" dominant-baseline="central">${h}</text>`;
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: "#e9dfc6" } })
    .composite([{ input: svg(W, H, body) }]).png().toFile(`${out}rewind-candle.png`);
}
console.log("rewind boards");
