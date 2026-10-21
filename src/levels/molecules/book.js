import { soft, grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { MOLECULES } from "./puzzle.js";

/** Silas's laboratory notebook, open on his desk under the lamp: an old
 *  green cloth binding, the block of pages thick at either side, the paper
 *  aged and faintly squared. On each page one molecule, drawn in ink — the
 *  atoms as shaded spheres, the bonds between them, those behind fainter —
 *  and under it a few words of his; nothing names it. The page's number at
 *  its foot.
 *
 *  Painted once per screen size: the desk with the book's cover and page
 *  block on it; each of the four pages, apart, to be turned (shared/
 *  pageFlip.js turns them); the shading the pages take where they curve
 *  into the spine. */

export const BOOK = { desk: "mo_desk", light: "mo_light", flip: "mo_flip" };
export const NOTEBOOK_PHOTO = "mo_open_book_photo";
export const MOLECULAR_MODELS = "mo_molecular_models";
const R = 2; // the pages are painted at twice their size, for crisp ink
const _INK = "#2a1f14";
const HAND = '"Cormorant Garamond", Georgia, "Times New Roman", serif'; // his hand: an old book's italic

// The photographed notebook's own measure, in its pixels (1536 x 1024): the
// spine, where the leaves are sewn; how far a leaf can reach from it, and
// from how high to how low; the box his pages were laid out in; and the top
// sheet on each side, traced just inside its edge — the camera was not quite
// overhead, so each is a little narrower at its head than at its foot, its
// head and foot bowing down into the spine.
const NOTEBOOK = {
  spine: 768, top: 54, leaf: 652, height: 872,
  box: { left: 82, right: 770, top: 67, w: 684, h: 850 },
  sheet: [
    [[765, 95], [757, 84], [745, 74], [720, 64], [680, 58], [600, 57], [450, 63], [300, 67], [220, 70],
      [188, 74], [170, 82], [160, 98], [156, 160], [150, 500], [143, 860], [145, 880], [153, 893], [168, 898],
      [200, 900], [300, 898], [450, 895], [600, 894], [680, 898], [730, 905], [755, 914], [765, 919]],
    [[772, 95], [780, 83], [795, 72], [830, 64], [900, 59], [950, 58], [1150, 64], [1250, 67], [1320, 70],
      [1343, 76], [1357, 84], [1365, 100], [1372, 160], [1395, 500], [1411, 860], [1409, 884], [1400, 894], [1384, 899],
      [1300, 904], [1150, 901], [950, 896], [850, 901], [800, 909], [780, 917], [772, 921]],
  ],
};

// ── where everything is ─────────────────────────────────────────────────────

// The book as it lies once it has been brought `near` times nearer than it
// is first seen — as far as the screen still holds all of it. `zoom` is how
// much nearer that came to; `view`, the desk as far as it is seen before.
export function layoutBook(W, H, near = 1) {
  const u = Math.min(W / 1000, H / 650);
  const first = Math.min(W * 0.8, H * 1.32);
  const bw = Math.max(first, Math.min(first * near, W, H * 1.5)), bh = bw / 1.5;
  const zoom = bw / first;
  const cx = W / 2, cy = Math.min(Math.max(H * 0.52, bh / 2), H - bh / 2);
  const k = bw / 1536; // screen pixels to the photograph's
  return {
    W, H, u, cx, cy, zoom,
    view: { x: (W - W * zoom) / 2, y: (H - H * zoom) / 2, w: W * zoom, h: H * zoom },
    book: { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh },
    pw: NOTEBOOK.leaf * k, ph: NOTEBOOK.height * k,
    top: cy - bh / 2 + NOTEBOOK.top * k, spine: cx - bw / 2 + NOTEBOOK.spine * k,
  };
}

// ── painting ────────────────────────────────────────────────────────────────

// the desk is a texture; the pages and the spine's shading are canvases,
// handed to the page turner, which draws them
export function paintBook(textures, L, photo, models) {
  addCanvasTexture(textures, BOOK.desk, paintDesk(L, photo));
  addCanvasTexture(textures, BOOK.light, paintLight(L));
  return { shade: paintShade(L), faces: MOLECULES.map((m, i) => paintPage(L, m, i, photo, models)) };
}

export function releaseBook(textures) {
  for (const key of Object.values(BOOK)) if (textures.exists(key)) textures.remove(key);
}

// the desk under the lamp: dark walnut, an ink bottle and a pencil by the
// book, a flask at the back; the book's cloth cover and the thick block of
// its pages, on which the pages will lie (painted as far as the desk is seen
// while the book is still further off, in the screen's own coordinates)
function paintDesk(L, photo) {
  const { W, H, u, book: b, view: v } = L;
  const c = makeCanvas(Math.ceil(v.w), Math.ceil(v.h));
  const g = c.getContext("2d");
  g.translate(-v.x, -v.y);
  const wood = g.createLinearGradient(0, v.y, 0, v.y + v.h);
  wood.addColorStop(0, "#1a110a"); wood.addColorStop(1, "#0c0704");
  g.fillStyle = wood; g.fillRect(v.x, v.y, v.w, v.h);
  const rnd = lcg(61);
  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const y = v.y + rnd() * v.h, x0 = v.x;
    g.strokeStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "120,80,45"},${(0.05 + rnd() * 0.08).toFixed(2)})`;
    g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + v.w * 0.3, y + (rnd() - 0.5) * 8 * u, x0 + v.w * 0.7, y + (rnd() - 0.5) * 8 * u, x0 + v.w, y + (rnd() - 0.5) * 6 * u); g.stroke();
  }
  // the lamp's warm light, from above on the left
  soft(g, W * 0.3, H * 0.2, W * 0.6, H * 0.7, "255,190,110", 0.22, "lighter");
  // The photographed cloth binding, layered paper edges and ruled pages sit
  // naturally in the lamplight, with the interactive page surfaces above it.
  soft(g, L.cx + 10 * u, L.cy + 16 * u, b.w * 0.56, b.h * 0.58, "0,0,0", 0.75);
  g.imageSmoothingQuality = "high";
  g.drawImage(photo, b.x, b.y, b.w, b.h);
  // A glass ink bottle, a flask and a pencil sit just beyond the page edges.
  paintInkBottle(g, b.x - 40 * u, b.y + 40 * u, u);
  paintFlask(g, b.x + b.w + 46 * u, b.y + 30 * u, u);
  paintPencil(g, b.x + b.w * 0.82, b.y + b.h + 26 * u, u);
  return c;
}

// the falling-off of the light toward the edges, and the grain of the
// picture, laid over everything — the pages, and a leaf as it turns, as much
// as the desk — so nothing lifted from the book is lit apart from it
function paintLight(L) {
  const c = makeCanvas(Math.ceil(L.view.w), Math.ceil(L.view.h)), g = c.getContext("2d");
  vignette(g, c.width, c.height, 0.7, "source-over");
  grain(g, c.width, c.height, 0.03);
  return c;
}

// the shading of the open pages: dark into the spine where they curve down,
// a soft rise either side, the outer edges a little in shadow
function paintShade(L) {
  const { pw, ph } = L;
  const w = Math.round(pw * 2), h = Math.round(ph);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const s = g.createLinearGradient(0, 0, w, 0);
  s.addColorStop(0, "rgba(0,0,0,0.22)");
  s.addColorStop(0.08, "rgba(0,0,0,0)");
  s.addColorStop(0.36, "rgba(255,250,235,0.05)");
  s.addColorStop(0.46, "rgba(0,0,0,0.12)");
  s.addColorStop(0.5, "rgba(0,0,0,0.42)");
  s.addColorStop(0.54, "rgba(0,0,0,0.12)");
  s.addColorStop(0.64, "rgba(255,250,235,0.05)");
  s.addColorStop(0.92, "rgba(0,0,0,0)");
  s.addColorStop(1, "rgba(0,0,0,0.25)");
  g.fillStyle = s; g.fillRect(0, 0, w, h);
  // on the two top sheets only, not the edges of the pages under them
  const N = NOTEBOOK, k = w / (N.leaf * 2), x0 = N.spine - N.leaf;
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  for (const sheet of N.sheet) {
    sheet.forEach(([x, y], i) => (i ? g.lineTo((x - x0) * k, (y - N.top) * k) : g.moveTo((x - x0) * k, (y - N.top) * k)));
    g.closePath();
  }
  g.fillStyle = "#000"; g.fill();
  return c;
}

// one page: aged paper, faintly squared; the molecule in ink; its formula in
// his hand; his few words; the page's number at its outer foot. Painted as a
// leaf is turned: the whole reach of a leaf from the spine, out of the
// photograph, cut to the top sheet's own shape — so a leaf lifted is one
// sheet, and the edges of the pages under it stay where they are.
function paintPage(L, m, index, photo, models) {
  const lw = Math.round(L.pw * R), lh = Math.round(L.ph * R);
  const c = makeCanvas(lw, lh);
  const g = c.getContext("2d");
  const right = index % 2 === 1, N = NOTEBOOK;
  const k = lw / N.leaf, x0 = right ? N.spine : N.spine - N.leaf;
  // the real page surface, from the open-book photograph: the fine grid,
  // foxing, soft paper curl and worn edges remain beneath the live art
  g.imageSmoothingQuality = "high";
  g.drawImage(photo, x0, N.top, N.leaf, N.height, 0, 0, lw, lh);
  // what he put on it, laid out in the page's box as he laid it out
  const pw = N.box.w * k, ph = N.box.h * k;
  g.save();
  g.translate(((right ? N.box.right : N.box.left) - x0) * k, (N.box.top - N.top) * k);
  // Real molecular-model cutouts replace the old pencil-style illustrations.
  const cx = pw / 2, cy = ph * 0.44, size = pw * 0.3;
  if (m.symbol === "S") drawCrown(g, cx, cy, size, m.color);
  else drawModelCutout(g, models, m.symbol, pw, ph);
  // A short, story-like observation sits below each model, without naming it.
  drawDescription(g, m.description, pw, ph);
  g.restore();
  // the page's number, at the outer foot, a little in from the sheet's edge
  g.font = `400 ${Math.round(ph * 0.036)}px Georgia, "Times New Roman", serif`;
  g.fillStyle = "rgba(42,31,20,0.6)";
  g.textAlign = right ? "right" : "left";
  g.fillText(String(index + 1), ((right ? 1384 : 172) - x0) * k, (879 - N.top) * k);
  g.textAlign = "left";
  // everything outside the top sheet cleared
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  N.sheet[right ? 1 : 0].forEach(([x, y], i) => (i ? g.lineTo((x - x0) * k, (y - N.top) * k) : g.moveTo((x - x0) * k, (y - N.top) * k)));
  g.closePath();
  g.fillStyle = "#000"; g.fill();
  g.restore();
  return c;
}

function drawModelCutout(g, models, symbol, pw, ph) {
  const cell = 627;
  const source = {
    H: { x: cell, y: 0 },
    I: { x: 0, y: cell },
    P: { x: cell, y: cell },
  }[symbol];
  if (!source) return;
  g.imageSmoothingQuality = "high";
  g.drawImage(models, source.x, source.y, cell, cell, pw * 0.06, ph * 0.15, pw * 0.88, ph * 0.58);
}

function drawDescription(g, text, pw, ph) {
  const x = pw * 0.13;
  const maxWidth = pw * 0.74;
  const fontSize = Math.max(18 * R, Math.round(ph * 0.039));
  g.fillStyle = "rgba(48,35,24,0.88)";
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.font = `italic 500 ${fontSize}px ${HAND}`;
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && g.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  const lineHeight = fontSize * 1.22;
  const firstY = ph * 0.76;
  lines.slice(0, 3).forEach((part, i) => g.fillText(part, x, firstY + i * lineHeight, maxWidth));
}

// ── the molecules ───────────────────────────────────────────────────────────

// Smooth, glossy molecular-model spheres in familiar laboratory colors.
function atom(g, x, y, r, color, back = false) {
  g.save();
  g.globalAlpha = back ? 0.68 : 1;
  g.shadowColor = "rgba(20,15,10,0.32)";
  g.shadowBlur = r * 0.16;
  g.shadowOffsetX = r * 0.08;
  g.shadowOffsetY = r * 0.1;
  const s = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x + r * 0.12, y + r * 0.12, r * 1.08);
  s.addColorStop(0, "#fffdf4");
  s.addColorStop(0.12, tint(color, 1.18));
  s.addColorStop(0.55, color);
  s.addColorStop(0.84, tint(color, 0.68));
  s.addColorStop(1, tint(color, 0.38));
  g.fillStyle = s; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.shadowColor = "transparent";
  g.strokeStyle = "rgba(255,248,227,0.42)"; g.lineWidth = Math.max(0.8 * R, r * 0.018);
  g.beginPath(); g.arc(x, y, r * 0.985, 0, Math.PI * 2); g.stroke();
  const glint = g.createRadialGradient(x - r * 0.38, y - r * 0.42, 0, x - r * 0.32, y - r * 0.35, r * 0.43);
  glint.addColorStop(0, "rgba(255,255,255,0.92)");
  glint.addColorStop(0.24, "rgba(255,255,255,0.45)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glint; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.34, r * 0.32, r * 0.23, -0.6, 0, Math.PI * 2); g.fill();
  g.restore();
}
function tint(hex, factor) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((value >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((value >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((value & 255) * factor));
  return `rgb(${r},${g},${b})`;
}
function bond(g, a, b, back = false) {
  g.save();
  g.globalAlpha = back ? 0.62 : 1;
  g.lineCap = "round";
  g.strokeStyle = "rgba(29,34,34,0.64)"; g.lineWidth = 8 * R;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  const shine = g.createLinearGradient(a[0], a[1] - 3 * R, b[0], b[1] + 3 * R);
  shine.addColorStop(0, "#d3cdb7"); shine.addColorStop(0.45, "#797f78"); shine.addColorStop(1, "#e8e0c8");
  g.strokeStyle = shine; g.lineWidth = 4.3 * R;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.34)"; g.lineWidth = 0.85 * R;
  g.beginPath(); g.moveTo(a[0], a[1] - 1.1 * R); g.lineTo(b[0], b[1] - 1.1 * R); g.stroke();
  g.restore();
}

// sulfur: eight atoms in a puckered ring, a crown seen a little from above
function drawCrown(g, cx, cy, R0, color) {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x: cx + Math.cos(a) * R0, y: cy + Math.sin(a) * R0 * 0.42 + (i % 2 ? -R0 * 0.24 : R0 * 0.24), depth: Math.sin(a) };
  });
  const r = R0 * 0.2;
  for (let i = 0; i < 8; i++) {
    const p = pts[i], q = pts[(i + 1) % 8];
    bond(g, [p.x, p.y], [q.x, q.y], (p.depth + q.depth) / 2 < 0);
  }
  for (const p of [...pts].sort((a, b) => a.depth - b.depth)) atom(g, p.x, p.y, r, color, p.depth < -0.3);
}

// hydrogen, iodine: two atoms held together — small or large
function _drawPair(g, cx, cy, r, color) {
  const d = r * 0.95;
  bond(g, [cx - d, cy], [cx + d, cy]);
  atom(g, cx - d, cy, r, color);
  atom(g, cx + d, cy, r, color);
}

// phosphorus: four atoms at the corners of a pyramid, the bonds behind dashed
function _drawTetra(g, cx, cy, R0, color) {
  const A = [cx - R0 * 0.95, cy + R0 * 0.5], B = [cx + R0 * 0.95, cy + R0 * 0.5], C = [cx + R0 * 0.2, cy + R0 * 0.02], D = [cx - R0 * 0.05, cy - R0 * 0.9];
  bond(g, A, C, true); bond(g, B, C, true); bond(g, C, D, true);
  atom(g, C[0], C[1], R0 * 0.24, color, true);
  bond(g, A, B); bond(g, A, D); bond(g, B, D);
  for (const p of [A, B, D]) atom(g, p[0], p[1], R0 * 0.26, color);
}

// ── on the desk ─────────────────────────────────────────────────────────────

function paintInkBottle(g, x, y, u) {
  soft(g, x + 6 * u, y + 30 * u, 26 * u, 10 * u, "0,0,0", 0.7);
  const glass = g.createLinearGradient(x - 22 * u, 0, x + 22 * u, 0);
  glass.addColorStop(0, "#05070a"); glass.addColorStop(0.35, "#1a2230"); glass.addColorStop(1, "#04050a");
  g.fillStyle = glass; roundRect(g, x - 22 * u, y - 8 * u, 44 * u, 40 * u, 6 * u); g.fill();
  g.fillStyle = "#1a1410"; g.fillRect(x - 9 * u, y - 20 * u, 18 * u, 13 * u);
  g.fillStyle = "rgba(255,230,190,0.35)"; g.fillRect(x - 15 * u, y - 4 * u, 2.5 * u, 28 * u);
}
function paintFlask(g, x, y, u) {
  soft(g, x + 6 * u, y + 46 * u, 34 * u, 10 * u, "0,0,0", 0.6);
  g.fillStyle = "rgba(180,210,200,0.18)";
  g.beginPath(); g.arc(x, y + 20 * u, 30 * u, 0, Math.PI * 2); g.fill();
  g.fillRect(x - 7 * u, y - 34 * u, 14 * u, 30 * u);
  g.fillStyle = "rgba(90,160,110,0.55)";
  g.beginPath(); g.arc(x, y + 20 * u, 28 * u, 0.25, Math.PI - 0.25); g.fill();
  g.strokeStyle = "rgba(230,245,240,0.45)"; g.lineWidth = 1.2 * u;
  g.beginPath(); g.arc(x, y + 20 * u, 30 * u, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(x - 18 * u, y + 2 * u, 3 * u, 14 * u);
}
function paintPencil(g, x, y, u) {
  g.save(); g.translate(x, y); g.rotate(-0.28);
  soft(g, 6 * u, 6 * u, 70 * u, 6 * u, "0,0,0", 0.6);
  const body = g.createLinearGradient(0, -4 * u, 0, 4 * u);
  body.addColorStop(0, "#c8902a"); body.addColorStop(0.5, "#e8b84a"); body.addColorStop(1, "#8a5a14");
  g.fillStyle = body; g.fillRect(-60 * u, -4 * u, 110 * u, 8 * u);
  g.fillStyle = "#d8b890";
  g.beginPath(); g.moveTo(50 * u, -4 * u); g.lineTo(66 * u, 0); g.lineTo(50 * u, 4 * u); g.closePath(); g.fill();
  g.fillStyle = "#2a2a2c"; g.beginPath(); g.moveTo(61 * u, -1.4 * u); g.lineTo(66 * u, 0); g.lineTo(61 * u, 1.4 * u); g.closePath(); g.fill();
  g.fillStyle = "#9a9aa0"; g.fillRect(-66 * u, -4.4 * u, 7 * u, 8.8 * u);
  g.fillStyle = "#b04a4a"; g.fillRect(-74 * u, -4 * u, 8 * u, 8 * u);
  g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
