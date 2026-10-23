// The manual's pages, each drawn on a canvas of its own to be turned (shared/
// pageFlip.js). A page is laid out in a space 1000 wide and 1280 high,
// whatever size it is shown at: dark paper with a fine double rule round it,
// a running head, its number at the foot. Left-hand pages carry a chapter's
// picture in a frame with a line in hand under it (demos.js draws into the
// frame); right-hand pages its words, set as a book's are.

import { DIM, FAINT, GOLD, PAPER, keycap, line, write } from "./sketch.js";

export const PAGE = { w: 1000, h: 1280 };
/** where a chapter's picture is, on its page */
export const FRAME = { x: 70, y: 150, w: 860, h: 880 };

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const roman = (n) => ROMAN[n - 1] ?? String(n);

let grain = null;
function grainPattern(ctx) {
  if (!grain) {
    grain = document.createElement("canvas");
    grain.width = grain.height = 256;
    const g = grain.getContext("2d"), img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.random() < 0.5 ? 10 : 4;
    }
    g.putImageData(img, 0, 0);
  }
  return ctx.createPattern(grain, "repeat");
}

/** a canvas for one page, `scale` of its pixels to a page unit; drawn on in page units */
export function sheet(canvas, scale) {
  canvas.width = Math.round(PAGE.w * scale);
  canvas.height = Math.round(PAGE.h * scale);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
}

/** the paper: its dark, its grain, a little darker toward its edges, the double rule */
export function paper(ctx, side) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE.w, PAGE.h);
  ctx.save();
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, PAGE.w, PAGE.h);
  ctx.restore();
  const g = ctx.createRadialGradient(PAGE.w * (side < 0 ? 0.55 : 0.45), PAGE.h * 0.45, PAGE.h * 0.25, PAGE.w / 2, PAGE.h / 2, PAGE.h * 0.8);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PAGE.w, PAGE.h);
  ctx.save();
  ctx.strokeStyle = "rgba(235,229,214,0.18)"; ctx.lineWidth = 1.6;
  ctx.strokeRect(40, 40, PAGE.w - 80, PAGE.h - 80);
  ctx.strokeStyle = "rgba(235,229,214,0.08)"; ctx.lineWidth = 1;
  ctx.strokeRect(52, 52, PAGE.w - 104, PAGE.h - 104);
  ctx.restore();
}

function head(ctx, words) {
  write(ctx, words.toUpperCase(), PAGE.w / 2, 104, { size: 19, color: DIM, align: "center", spacing: 4, weight: 500 });
}
function folio(ctx, n) {
  write(ctx, String(n), PAGE.w / 2, 1214, { size: 30, font: "Cormorant Garamond", italic: true, color: DIM, align: "center" });
}

// words broken into lines no wider than `width`, in the font set
function lines(ctx, text, width) {
  const out = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const tryLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(tryLine).width > width && line) { out.push(line); line = word; } else line = tryLine;
  }
  if (line) out.push(line);
  return out;
}

/** a chapter's left-hand page: everything but its moving picture */
export function picturePage(ctx, words, chapter, n) {
  paper(ctx, -1);
  head(ctx, words.manual);
  const { x, y, w, h } = FRAME;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(235,229,214,0.3)"; ctx.lineWidth = 1.8;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = "rgba(235,229,214,0.1)"; ctx.lineWidth = 1;
  ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
  ctx.restore();
  // its line in hand, under it: fitted to the page's width
  let size = 34;
  ctx.font = `400 ${size}px "Architects Daughter"`;
  while (ctx.measureText(chapter.caption).width > 820 && size > 22) { size -= 2; ctx.font = `400 ${size}px "Architects Daughter"`; }
  write(ctx, chapter.caption, PAGE.w / 2, 1112, { hand: true, size, color: DIM, align: "center" });
  folio(ctx, n);
}

/** a chapter's words, on the right-hand page: set smaller if they would not fit */
export function textPage(ctx, words, chapter, number, n) {
  paper(ctx, 1);
  head(ctx, `${words.chapter} ${roman(number)}`);
  write(ctx, roman(number), 110, 258, { size: 110, font: "DM Serif Display", color: GOLD });
  ctx.font = `400 62px "DM Serif Display"`;
  let titleSize = 62;
  while (ctx.measureText(chapter.title).width > 780 && titleSize > 40) { titleSize -= 4; ctx.font = `400 ${titleSize}px "DM Serif Display"`; }
  write(ctx, chapter.title, 110, 356, { size: titleSize, font: "DM Serif Display" });
  line(ctx, 110, 392, 890, 392, { color: FAINT, width: 1.6, seed: number });
  // the paragraphs; one begun "[M] " has its key drawn in the margin
  const top = 462, bottom = 1150;
  const parts = chapter.text.map((p) => {
    const m = /^\[([^\]]+)\]\s*/.exec(p);
    return m ? { key: m[1], text: p.slice(m[0].length) } : { key: null, text: p };
  });
  let size = 44;
  let laid;
  for (; size >= 24; size -= 1) {
    const leading = size * 1.38, gap = size * 0.72;
    ctx.font = `500 ${size}px "Cormorant Garamond"`;
    let y = top;
    laid = parts.map((p) => {
      const x = p.key ? 210 : 110;
      const ls = lines(ctx, p.text, 890 - x);
      const at = y;
      y += ls.length * leading + gap;
      return { ...p, x, y: at, ls, leading };
    });
    if (y - gap <= bottom) break;
  }
  for (const p of laid) {
    if (p.key) keycap(ctx, 110, p.y - size * 0.95, p.key, { size: Math.max(52, size * 1.5), wide: p.key.length > 1 ? 1.5 : 1 });
    p.ls.forEach((l, i) => write(ctx, l, p.x, p.y + i * p.leading, { size, font: "Cormorant Garamond", weight: 500 }));
  }
  folio(ctx, n);
}

/** the spine's shading over the open pages: drawn once, stretched to the spread */
export function spineShade() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 4;
  const g = c.getContext("2d"), r = g.createLinearGradient(0, 0, 512, 0);
  r.addColorStop(0, "rgba(0,0,0,0)");
  r.addColorStop(0.4, "rgba(0,0,0,0)");
  r.addColorStop(0.485, "rgba(0,0,0,0.38)");
  r.addColorStop(0.5, "rgba(0,0,0,0.55)");
  r.addColorStop(0.505, "rgba(255,245,225,0.05)");
  r.addColorStop(0.52, "rgba(0,0,0,0.3)");
  r.addColorStop(0.6, "rgba(0,0,0,0)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, 512, 4);
  return c;
}

