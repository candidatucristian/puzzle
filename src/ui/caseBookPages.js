// What is written on the case book's pages (caseBook.js lays each on the top
// sheet's own paper, cut out of the Blender picture of the book, and turns
// them): laid out in a space 1000 wide and 1280 high, like the manual's
// (manual/pages.js), in dark brown ink taken into the paper, typed where the
// file is typed, in his hand where he wrote, the numbers stamped in red.
// A spread for each room he can go into — on the left the room, its number
// large and what he noted there in his own hand; on the right the evidence it
// has given up, each word typed on its line — then a spread for each letter
// filed, its words running on from the left page to the right.

import { PAGE } from "./manual/pages.js";
import { line, write } from "./manual/sketch.js";
import { canvasFontFamily, wrapCanvasText } from '../shared/textLayout.js';

export { PAGE };
const LEFT = 110, RIGHT = 890, WIDE = RIGHT - LEFT;
// the map's own inks
const INK = "#2a2118", DIM = "rgba(42,33,24,0.58)", FAINT = "rgba(42,33,24,0.22)", GOLD = "#7a2418";

function head(ctx, words) {
  write(ctx, String(words).toUpperCase(), PAGE.w / 2, 104, { size: 22, font: "Special Elite", color: DIM, align: "center", spacing: 3 });
}
function folio(ctx, n) {
  write(ctx, String(n), PAGE.w / 2, 1214, { size: 30, font: "Cormorant Garamond", italic: true, color: DIM, align: "center" });
}
const fontOf = (style, size) => `${style.italic ? "italic " : ""}${style.weight ?? 400} ${size}px ${canvasFontFamily(style.hand ? 'Architects Daughter' : style.font ?? 'Cormorant Garamond')}`;

// words broken into lines no wider than `width`, in the font set
function wrap(ctx, text, width) {
  return wrapCanvasText(ctx, text, width);
}

// a title set as large as fits the width, from `size` down
function fitted(ctx, text, size, min, font) {
  for (; size > min; size -= 2) {
    ctx.font = `400 ${size}px ${canvasFontFamily(font)}`;
    if (ctx.measureText(text).width <= WIDE) break;
  }
  return size;
}

/** the room's page: its number, its name, what he noted there */
export function roomPage(ctx, { head: words, numeral, name, notes, notEntered, n }) {
  head(ctx, words);
  let y = 230;
  if (numeral) { write(ctx, numeral, LEFT, 300, { size: 120, font: "DM Serif Display", color: GOLD }); y = 400; }
  const size = fitted(ctx, name, 64, 36, "DM Serif Display");
  write(ctx, name, LEFT, y, { size, font: "DM Serif Display", color: INK });
  line(ctx, LEFT, y + 36, RIGHT, y + 36, { color: FAINT, width: 1.6, seed: n });
  // his notes, in his hand: as large as they fit
  const top = y + 120, bottom = 1130;
  const lines = notes.length ? notes : [notEntered];
  const style = { hand: true };
  let laid, s = 40;
  for (; s >= 22; s -= 1) {
    ctx.font = fontOf(style, s);
    const leading = s * 1.45, gap = s * 0.8;
    let at = top;
    laid = lines.map((text) => { const ls = wrap(ctx, text, WIDE); const block = { ls, y: at, leading }; at += ls.length * leading + gap; return block; });
    if (at - gap <= bottom) break;
  }
  for (const block of laid) block.ls.forEach((l, i) => write(ctx, l, LEFT, block.y + i * block.leading, { hand: true, size: s, color: notes.length ? INK : DIM, alpha: notes.length ? 0.92 : 1 }));
  folio(ctx, n);
}

/** the room's evidence: a line for each puzzle in it — its number, its word
 *  typed (or not found yet), and where it was won */
export function evidencePage(ctx, { head: words, items, count, newWord, notFound, n }) {
  head(ctx, words);
  const top = 230, bottom = 1090, step = Math.min(300, (bottom - top) / Math.max(1, items.length));
  items.forEach((item, i) => {
    const y = top + i * step;
    write(ctx, String(item.number).padStart(2, "0"), LEFT, y + 30, { size: 28, font: "Special Elite", color: DIM });
    if (item.isNew) write(ctx, newWord.toUpperCase(), RIGHT, y + 30, { size: 24, font: "Special Elite", color: GOLD, align: "right", spacing: 2 });
    if (item.won) {
      const size = fitted(ctx, item.word, 72, 34, "Special Elite");
      write(ctx, item.word, LEFT, y + 118, { size, font: "Special Elite", color: INK });
      write(ctx, item.name, LEFT, y + 170, { size: 32, font: "Cormorant Garamond", italic: true, color: DIM });
    } else {
      write(ctx, notFound, LEFT, y + 110, { size: 40, font: "Special Elite", color: DIM, alpha: 0.75 });
    }
    if (i < items.length - 1) line(ctx, LEFT, y + step - 40, RIGHT, y + step - 40, { color: FAINT, width: 1.2, seed: n * 7 + i });
  });
  write(ctx, count, PAGE.w / 2, 1150, { size: 30, font: "Cormorant Garamond", italic: true, color: DIM, align: "center" });
  folio(ctx, n);
}

/** a letter over two pages: its number and title, where it was found, then
 *  its words running on from the left page to the right, set as small as
 *  they need to be to fit; under them, in pencil, his note on it */
export function letterSpread(left, right, { head: words, number, title, origin, letter, sign, n }) {
  head(left, words); head(right, title);
  write(left, number, LEFT, 210, { size: 32, font: "Special Elite", color: GOLD });
  const titleSize = fitted(left, title, 56, 34, "DM Serif Display");
  write(left, title, LEFT, 290, { size: titleSize, font: "DM Serif Display", color: INK });
  if (origin) write(left, origin, LEFT, 340, { size: 30, font: "Cormorant Garamond", italic: true, color: DIM });
  line(left, LEFT, 372, RIGHT, 372, { color: FAINT, width: 1.6, seed: n });
  // what is written, in order, each part its own way
  const parts = [
    letter.dateline && { text: letter.dateline, style: { font: "Special Elite" }, k: 0.72, color: DIM, gap: 0.9 },
    letter.salutation && { text: letter.salutation, style: { italic: true, weight: 500 }, k: 1, gap: 0.6 },
    ...(letter.body ?? []).map((text) => ({ text, style: { weight: 500 }, k: 1, gap: 0.55 })),
    letter.signature && { text: letter.signature, style: { hand: true }, k: 0.95, align: "right", gap: 0.5 },
    letter.postscript && { text: letter.postscript, style: { italic: true, weight: 500 }, k: 0.92, gap: 0.6 },
    letter.margin && { text: `${letter.margin}  ${sign}`, style: { hand: true }, k: 0.9, color: DIM, gap: 0.2, before: 0.8 },
  ].filter(Boolean);
  const columns = [{ ctx: left, top: 440, bottom: 1140 }, { ctx: right, top: 190, bottom: 1140 }];
  let laid = null, size = 36;
  for (; size >= 18; size -= 1) {
    laid = [];
    let col = 0, y = columns[0].top, fits = true;
    for (const part of parts) {
      const s = size * part.k, leading = s * 1.4;
      left.font = fontOf(part.style, s);
      if (part.before) y += size * part.before;
      for (const text of wrap(left, part.text, WIDE)) {
        if (y + leading > columns[col].bottom) {
          if (col === columns.length - 1) { fits = false; break; }
          col += 1; y = columns[col].top;
        }
        laid.push({ col, y: y + s, text, part, s });
        y += leading;
      }
      if (!fits) break;
      y += size * part.gap;
    }
    if (fits) break;
  }
  for (const l of laid) {
    const ctx = columns[l.col].ctx, x = l.part.align === "right" ? RIGHT : LEFT;
    write(ctx, l.text, x, l.y, { size: l.s, ...l.part.style, font: l.part.style.font ?? "Cormorant Garamond", color: l.part.color ?? INK, align: l.part.align ?? "left" });
  }
  folio(left, n); folio(right, n + 1);
}

