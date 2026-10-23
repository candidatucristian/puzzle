// The manual's pencil: everything in its pictures drawn the way the game's
// own pointers are (shared/cursors.js) — in a warm white on the dark paper,
// each line gone over twice, a little off the second time, as a quick hand
// draws. A few things keep their colour: what glints, gold; wax, red; a
// right answer, green.

import { CURSOR_SHAPES, CURSOR_ARROWS } from "../../shared/cursors.js";

export const INK = "#ebe5d6";
export const DIM = "rgba(235,229,214,0.42)";
export const FAINT = "rgba(235,229,214,0.16)";
export const GOLD = "#dcb768";
export const RED = "#a8372c";
export const GREEN = "#93c08c";
export const PAPER = "#1c1b19";

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** how far through [a, b] the time t is, 0 to 1 */
export const span = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = (k) => k * k * (3 - 2 * k);
export const lerp = (a, b, k) => a + (b - a) * k;

/** where something is that moves through `stops` ([time, x, y], in order),
 *  easing from each to the next */
export function track(t, stops) {
  if (t <= stops[0][0]) return { x: stops[0][1], y: stops[0][2] };
  for (let i = 1; i < stops.length; i++) {
    const [t1, x1, y1] = stops[i];
    if (t <= t1) {
      const [t0, x0, y0] = stops[i - 1];
      const k = ease(span(t, t0, t1));
      return { x: lerp(x0, x1, k), y: lerp(y0, y1, k) };
    }
  }
  const last = stops.at(-1);
  return { x: last[1], y: last[2] };
}

// the hand's own small unsteadiness, the same each time a line is drawn
function shake(seed) {
  let s = (Math.abs(seed) * 2654435761) >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
}

function trace(ctx, pts, close) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

// a line of points, cut to `progress` of its length
function cut(pts, progress) {
  if (progress >= 1) return pts;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = total * Math.max(0, progress);
  const out = [pts[0]];
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], d = Math.hypot(x1 - x0, y1 - y0);
    if (d <= left) { out.push(pts[i]); left -= d; } else { const k = left / d; out.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]); left = 0; }
  }
  return out;
}

/** a pencil line through `pts`, gone over twice */
export function stroke(ctx, pts, { color = INK, width = 2.4, alpha = 1, seed = 1, close = false, progress = 1, dash = null } = {}) {
  if (alpha <= 0 || pts.length < 2) return;
  const r = shake(seed);
  const line = cut(close ? [...pts, pts[0]] : pts, progress);
  if (line.length < 2) return;
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  if (dash) ctx.setLineDash(dash);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  trace(ctx, line, false); ctx.stroke();
  // gone over once more, lightly, a little off
  ctx.globalAlpha = alpha * 0.45;
  ctx.lineWidth = width * 0.5;
  trace(ctx, line.map(([x, y]) => [x + 0.9 + r() * 1.2, y - 0.7 + r() * 1.2]), false); ctx.stroke();
  ctx.restore();
}

/** a straight line, a little bowed */
export function line(ctx, x1, y1, x2, y2, opts = {}) {
  const r = shake((opts.seed ?? 1) * 7 + x1 + y2), bow = r() * 3;
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8, s = Math.sin(k * Math.PI) * bow;
    pts.push([x1 + (x2 - x1) * k - ((y2 - y1) / 300) * s, y1 + (y2 - y1) * k + ((x2 - x1) / 300) * s]);
  }
  stroke(ctx, pts, opts);
}

/** a box, its corners drawn just past */
export function box(ctx, x, y, w, h, opts = {}) {
  const o = 4;
  line(ctx, x - o, y, x + w + o * 0.5, y, opts);
  line(ctx, x + w, y - o * 0.5, x + w, y + h + o, { ...opts, seed: (opts.seed ?? 1) + 1 });
  line(ctx, x + w + o * 0.5, y + h, x - o, y + h, { ...opts, seed: (opts.seed ?? 1) + 2 });
  line(ctx, x, y + h + o * 0.5, x, y - o, { ...opts, seed: (opts.seed ?? 1) + 3 });
}

/** a filled box (for a dark inside, a panel), no pencil line */
export function fill(ctx, x, y, w, h, color, alpha = 1, radius = 0) {
  ctx.save();
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  if (radius) ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.restore();
}

/** a rounded box, drawn in one line */
export function roundBox(ctx, x, y, w, h, r, opts = {}) {
  const pts = [];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + (i / 4) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  stroke(ctx, pts, { ...opts, close: true });
}

/** an ellipse, gone round once and a little past */
export function ring(ctx, cx, cy, rx, ry = rx, opts = {}) {
  const pts = [], n = 36, start = opts.start ?? -Math.PI / 2;
  for (let i = 0; i <= n + 2; i++) { const a = start + (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  stroke(ctx, pts, opts);
}

/** an SVG path (in its own units), drawn at (x, y) `scale` times its size, gone over twice */
export function svgPath(ctx, d, x, y, scale, { color = INK, width = 1.3, alpha = 1, fillColor = null } = {}) {
  if (alpha <= 0) return;
  const p = new Path2D(d);
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(p); }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(p);
  ctx.globalAlpha = alpha * 0.45; ctx.lineWidth = width * 0.5;
  ctx.translate(0.35, -0.3); ctx.stroke(p);
  ctx.restore();
}

/** one of the game's pointers, its point at (x, y) */
export function pointer(ctx, name, x, y, { scale = 2.3, alpha = 1 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (name === "arrow") {
    // the plain pointer, over nothing to be done
    const d = "M0 0 L0 24 L6.5 18 L11 28 L15 26 L10.5 16.5 L19 16.5 Z";
    ctx.translate(x, y); ctx.scale(scale * 0.95, scale * 0.95);
    ctx.fillStyle = "#0b0b0c"; ctx.fill(new Path2D(d));
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.stroke(new Path2D(d));
    ctx.restore();
    return;
  }
  const [d, hx, hy] = CURSOR_SHAPES[name];
  ctx.translate(x - hx * scale, y - hy * scale); ctx.scale(scale, scale);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (d) {
    const p = new Path2D(d);
    ctx.strokeStyle = "#0b0b0c"; ctx.lineWidth = 2.9; ctx.globalAlpha = alpha * 0.85; ctx.stroke(p);
    ctx.strokeStyle = "#f1ece0"; ctx.lineWidth = 1.2; ctx.globalAlpha = alpha; ctx.stroke(p);
  }
  const arrow = CURSOR_ARROWS[name];
  if (arrow) { const a = new Path2D(arrow[0]); ctx.fillStyle = "#0b0b0c"; ctx.globalAlpha = alpha * 0.8; ctx.fill(a); ctx.fillStyle = "#ece7db"; ctx.globalAlpha = alpha; ctx.fill(a); }
  ctx.restore();
}

/** the ring a click leaves, spreading and gone */
export function click(ctx, x, y, k) {
  if (k <= 0 || k >= 1) return;
  ring(ctx, x, y, 10 + k * 34, 10 + k * 34, { alpha: (1 - k) * 0.8, width: 2, seed: 5 });
}

/** a glint: the game's four-pointed star (shared/movableSparkles.js) */
export function star(ctx, x, y, r, alpha) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffe8b5"; ctx.globalAlpha = alpha; ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
  ctx.strokeStyle = "#ffffff"; ctx.globalAlpha = alpha * 0.7; ctx.lineWidth = Math.max(0.6, r * 0.12);
  const d = r * 0.62;
  ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
  ctx.restore();
}

/** glints about a box, as the game has them about a thing that may be touched:
 *  a few at a time, each rising a little and gone */
export function glints(ctx, x, y, w, h, t, { strength = 1, count = 9, seed = 3 } = {}) {
  if (strength <= 0) return;
  const r = shake(seed);
  for (let i = 0; i < count; i++) {
    const life = 1.1 + r() * 0.8, phase = r() + 0.5;
    const k = ((t / life + phase) % 1 + 1) % 1, cycle = Math.floor(t / life + phase);
    const q = shake(seed * 31 + i * 97 + cycle * 13);
    // somewhere about its edge
    const side = Math.floor((q() + 0.5) * 4), along = q() + 0.5;
    const px = side === 0 ? x + along * w : side === 1 ? x + w : side === 2 ? x + along * w : x;
    const py = side === 0 ? y : side === 1 ? y + along * h : side === 2 ? y + h : y + along * h;
    const size = (7 + (q() + 0.5) * 9) * Math.sin(k * Math.PI);
    star(ctx, px + q() * 14, py - k * 18 + q() * 10, size, strength * Math.sin(k * Math.PI));
  }
}

/** a key on the keyboard, its letter on it */
export function keycap(ctx, x, y, letter, { size = 64, alpha = 1, pressed = 0, wide = 1 } = {}) {
  const w = size * wide, h = size, dy = pressed * 4;
  fill(ctx, x, y + dy, w, h, "#0f0f0e", alpha * 0.9, 9);
  roundBox(ctx, x, y + dy, w, h, 9, { alpha, width: 2.2, seed: letter.charCodeAt(0) });
  if (!pressed) line(ctx, x + 8, y + h + 7, x + w - 8, y + h + 7, { alpha: alpha * 0.4, width: 1.6, seed: 9 });
  write(ctx, letter, x + w / 2, y + dy + h * 0.66, { size: size * 0.42, font: "IBM Plex Mono", weight: 500, align: "center", alpha });
}

/** words written: in a hand (`hand`), or set in type */
export function write(ctx, text, x, y, { size = 30, font = "IBM Plex Sans", weight = 400, color = INK, alpha = 1, align = "left", hand = false, italic = false, spacing = 0 } = {}) {
  if (alpha <= 0 || !text) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = `${italic ? "italic " : ""}${weight} ${size}px "${hand ? "Architects Daughter" : font}"`;
  if (spacing && "letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** a line of writing too small to read: dashes of a hand */
export function scribbleLine(ctx, x, y, w, { alpha = 1, seed = 1, width = 2, color = INK, progress = 1 } = {}) {
  const r = shake(seed);
  let at = x;
  const words = [];
  while (at < x + w - 10) {
    const len = Math.min(x + w - at, 24 + (r() + 0.5) * 60);
    words.push([at, len]);
    at += len + 12 + (r() + 0.5) * 8;
  }
  const end = x + w * progress;
  for (const [wx, len] of words) {
    if (wx > end) break;
    const pts = [];
    const stop = Math.min(wx + len, end);
    for (let px = wx; px <= stop; px += 4) pts.push([px, y + Math.sin(px * 0.35 + seed) * 3 + r() * 1.5]);
    if (pts.length > 1) stroke(ctx, pts, { alpha, width, seed: seed + wx, color });
  }
}

/** the corner of the picture where what a click will do is written (the game's own) */
export function cue(ctx, text, x, y, alpha = 1) {
  if (!text || alpha <= 0) return;
  ctx.save();
  ctx.font = `400 26px "IBM Plex Sans"`;
  const w = ctx.measureText(text).width + 30;
  ctx.restore();
  fill(ctx, x, y - 42, w, 56, "#141414", 0.93 * alpha, 6);
  roundBox(ctx, x, y - 42, w, 56, 6, { color: "#6a6a64", width: 1.4, alpha, seed: 11 });
  write(ctx, text, x + 15, y - 5, { size: 26, alpha });
}

/** the gilt key, its bow at (x, y), pointing right */
export function key(ctx, x, y, scale = 1, alpha = 1) {
  svgPath(ctx, "M0 0a11 11 0 1 0 22 0a11 11 0 1 0-22 0zM22 0H62M52 0v9M60 0v7M6 0h6", x - 11 * scale, y, scale, { color: GOLD, width: 2.6, alpha });
}

/** a seal of red wax, pressed */
export function seal(ctx, x, y, r, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = RED;
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2, k = r * (1 + 0.08 * Math.sin(i * 2.7)); ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * k, y + Math.sin(a) * k); }
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(255,210,190,0.35)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.4, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  ctx.restore();
}

/** a padlock; `open` lifts its shackle */
export function padlock(ctx, x, y, s = 1, { alpha = 1, open = 0 } = {}) {
  line(ctx, x - 14 * s, y, x + 14 * s, y, { alpha, seed: 21 });
  box(ctx, x - 16 * s, y, 32 * s, 26 * s, { alpha, width: 2.2, seed: 22 });
  const lift = open * 10 * s;
  const pts = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; pts.push([x + Math.cos(a) * 10 * s + (i > 6 ? open * 6 * s : 0), y - 2 * s - lift + Math.sin(a) * 12 * s]); }
  pts.unshift([x - 10 * s, y - lift * 0.2]);
  stroke(ctx, pts, { alpha, width: 2.4, seed: 23 });
  ring(ctx, x, y + 12 * s, 3 * s, 3 * s, { alpha, width: 1.6, seed: 24 });
}
