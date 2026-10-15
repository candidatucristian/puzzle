import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintDesign } from "./flagDesigns.js";

/** The trophy wall for FLAGS, painted like the game's storybook nights: a
 *  quiet room in the house, green walls over walnut panelling. High on the
 *  wall a brass rod runs the room's width, and from it hang the five flags
 *  on their rings. Under them a shelf of small cups and a shield, medals
 *  hanging from its edge on their ribbons; under that a long walnut
 *  sideboard with the big cups standing on it. Warm light from lamps out of
 *  the picture falls on the flags and the silver.
 *
 *  Painted once per screen size: the room; each flag, stirring, in frames;
 *  each medal on its ribbon; a glint and a glow. The scene moves them. */

export const FLAG_FRAMES = 10;
const FRAME_COLS = 5;
const R = 2; // the flags and medals are painted at twice their size

const K = { room: "fl_room", glow: "fl_glow", glint: "fl_glint" };
const flagKey = (i) => `fl_flag_${i}`;
const medalKey = (i) => `fl_medal_${i}`;

// what is won: gold, silver, bronze — dark, light, the shine, light, dark
const METAL = {
  gold: ["#5a3e0c", "#c89a32", "#fff0b8", "#d8aa44", "#4a320a"],
  silver: ["#3e444c", "#a8b0b8", "#ffffff", "#bcc4cc", "#363c44"],
  bronze: ["#4a2410", "#b06a34", "#ffd0a0", "#c07a40", "#3a1c0c"],
};

// ── where everything is ─────────────────────────────────────────────────────

export function layoutTrophies(W, H, codes) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  L.floor = H * 0.88;
  L.dado = H * 0.66;
  L.rod = { y: H * 0.1, x0: W * 0.07, x1: W * 0.93 };
  const fw = Math.min(W * 0.13, H * 0.3);
  const fh = fw * (2 / 3);
  const n = codes.length;
  L.flags = codes.map((code, i) => ({ code, x: W * (0.5 + (i - (n - 1) / 2) * 0.17), y: L.rod.y + 7 * u, w: fw, h: fh }));
  L.shelf = { x0: W * 0.2, x1: W * 0.8, y: H * 0.45, t: 8 * u };
  L.board = { x0: W * 0.12, x1: W * 0.88, top: H * 0.66, bottom: L.floor };
  // medals on their ribbons, hung from the shelf's edge, each between two
  // of the big cups below
  L.medals = [
    { x: 0.27, metal: "gold", ribbon: "#a81e22" },
    { x: 0.42, metal: "silver", ribbon: "#1c3a7a" },
    { x: 0.58, metal: "bronze", ribbon: "#1e5a3a" },
    { x: 0.73, metal: "gold", ribbon: "#5a2a7a" },
  ].map((m) => ({ ...m, x: W * m.x, y: L.shelf.y + L.shelf.t, len: 36 * u, r: 11 * u }));
  // the cups: on the shelf, small; on the sideboard, big
  L.cups = [
    { x: 0.29, y: L.shelf.y, s: 0.55, metal: "silver", kind: "goblet" },
    { x: 0.44, y: L.shelf.y, s: 0.6, metal: "bronze", kind: "loving" },
    { x: 0.56, y: L.shelf.y, s: 0.62, metal: "silver", kind: "shield" },
    { x: 0.7, y: L.shelf.y, s: 0.58, metal: "gold", kind: "star" },
    { x: 0.2, y: L.board.top, s: 0.95, metal: "silver", kind: "loving" },
    { x: 0.34, y: L.board.top, s: 1.05, metal: "bronze", kind: "star" },
    { x: 0.5, y: L.board.top, s: 1.35, metal: "gold", kind: "loving" },
    { x: 0.66, y: L.board.top, s: 1.0, metal: "silver", kind: "goblet" },
    { x: 0.8, y: L.board.top, s: 0.95, metal: "gold", kind: "goblet" },
  ].map((c) => ({ ...c, x: W * c.x, s: c.s * 100 * u }));
  // where the silver catches the light now and then
  L.glints = L.cups.map((c) => ({ x: c.x - c.s * 0.14, y: c.y - c.s * (c.kind === "star" ? 0.9 : 0.62), s: c.s }));
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintTrophies(scene, W, H, codes) {
  const L = layoutTrophies(W, H, codes);
  const t = scene.textures;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  paintWall(g, L);
  paintRod(g, L);
  paintShelf(g, L);
  paintBoard(g, L);
  for (const cup of L.cups) paintCup(g, cup);
  paintLight(g, L);
  vignette(g, W, H, 0.62);
  grain(g, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.glint, paintGlint());
  const flags = L.flags.map((f, i) => {
    const art = paintFlagFrames(f.code, f.w, f.h);
    const tex = addCanvasTexture(t, flagKey(i), art.canvas);
    for (let k = 0; k < FLAG_FRAMES; k++) tex.add(k, 0, (k % FRAME_COLS) * art.cw, Math.floor(k / FRAME_COLS) * art.ch, art.cw, art.ch);
    return { key: flagKey(i), x: f.x, y: f.y, oy: art.oy };
  });
  const medals = L.medals.map((m, i) => {
    addCanvasTexture(t, medalKey(i), paintMedal(m));
    return { key: medalKey(i), x: m.x, y: m.y };
  });
  return { L, keys: K, res: R, flags, medals };
}

export function releaseTrophyArt(textures) {
  const keys = [...Object.values(K)];
  for (let i = 0; i < 8; i++) keys.push(flagKey(i), medalKey(i));
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

const grad = (g, x0, y0, x1, y1, stops) => {
  const r = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((col, i) => r.addColorStop(Array.isArray(col) ? col[0] : i / (stops.length - 1), Array.isArray(col) ? col[1] : col));
  return r;
};

// The wall: deep green paper with a faint stripe, walnut panelling below a
// rail, a skirting, the boards.
function paintWall(g, L) {
  const { W, H, u } = L;
  g.fillStyle = grad(g, 0, 0, 0, L.dado, ["#16231f", "#1f302a", "#1a2823"]);
  g.fillRect(0, 0, W, L.dado);
  for (let x = 0; x < W; x += 22 * u) { g.fillStyle = "rgba(200,230,210,0.025)"; g.fillRect(x, 0, 9 * u, L.dado); }
  // the panelling
  g.fillStyle = grad(g, 0, L.dado, 0, L.floor, ["#2e1c10", "#24160c"]);
  g.fillRect(0, L.dado, W, L.floor - L.dado);
  const pw = 150 * u;
  for (let x = -pw * 0.3; x < W; x += pw) {
    const x0 = x + 14 * u, y0 = L.dado + 22 * u, w = pw - 28 * u, h = L.floor - L.dado - 50 * u;
    g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(x0, y0, w, h);
    g.fillStyle = "rgba(255,200,150,0.06)"; g.fillRect(x0, y0 + h - 2 * u, w, 2 * u); g.fillRect(x0 + w - 2 * u, y0, 2 * u, h);
    g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(x0, y0, w, 2 * u); g.fillRect(x0, y0, 2 * u, h);
  }
  // the dado rail
  g.fillStyle = grad(g, 0, L.dado - 6 * u, 0, L.dado + 6 * u, ["#5a3820", "#3a2414", "#1e1208"]);
  g.fillRect(0, L.dado - 6 * u, W, 12 * u);
  // the skirting and the boards
  g.fillStyle = "#1a0f08"; g.fillRect(0, L.floor - 16 * u, W, 16 * u);
  g.fillStyle = grad(g, 0, L.floor, 0, H, ["#2a1a0f", "#3a2616"]);
  g.fillRect(0, L.floor, W, H - L.floor);
  for (let y = L.floor + 8 * u, k = 1; y < H; y += 8 * u * k, k *= 1.35) { g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(0, y, W, Math.max(1, u)); }
}

// The brass rod the flags hang from, on two brackets, a ball at either end.
function paintRod(g, L) {
  const { u } = L, r = L.rod, th = 6 * u;
  for (const x of [r.x0 + 30 * u, r.x1 - 30 * u]) {
    g.fillStyle = "#3a2a10"; g.fillRect(x - 3 * u, r.y - 18 * u, 6 * u, 18 * u);
    g.fillStyle = "#6a5020"; g.fillRect(x - 7 * u, r.y - 20 * u, 14 * u, 4 * u);
  }
  soft(g, (r.x0 + r.x1) / 2, r.y + th * 1.5, (r.x1 - r.x0) / 2, th * 1.2, "0,0,0", 0.5);
  g.fillStyle = grad(g, 0, r.y - th / 2, 0, r.y + th / 2, ["#4a3410", "#f0d88a", "#a87e30", "#3a2808"]);
  g.fillRect(r.x0, r.y - th / 2, r.x1 - r.x0, th);
  for (const x of [r.x0, r.x1]) {
    const b = g.createRadialGradient(x - 3 * u, r.y - 3 * u, 1, x, r.y, 9 * u);
    b.addColorStop(0, "#fff0b8"); b.addColorStop(0.5, "#c89a32"); b.addColorStop(1, "#4a320a");
    g.fillStyle = b; g.beginPath(); g.arc(x, r.y, 8 * u, 0, Math.PI * 2); g.fill();
  }
}

// The wall shelf: a walnut board on two carved brackets.
function paintShelf(g, L) {
  const { u } = L, s = L.shelf;
  soft(g, (s.x0 + s.x1) / 2, s.y + s.t + 8 * u, (s.x1 - s.x0) / 2, 10 * u, "0,0,0", 0.55);
  for (const x of [s.x0 + 40 * u, s.x1 - 40 * u]) {
    g.fillStyle = "#24160c";
    g.beginPath(); g.moveTo(x - 6 * u, s.y + s.t); g.lineTo(x + 6 * u, s.y + s.t); g.lineTo(x + 6 * u, s.y + s.t + 10 * u); g.quadraticCurveTo(x, s.y + s.t + 36 * u, x - 6 * u, s.y + s.t + 40 * u); g.closePath(); g.fill();
  }
  g.fillStyle = grad(g, 0, s.y - 3 * u, 0, s.y + s.t, ["#7a5030", "#4a2e18", "#2a1a0c"]);
  g.fillRect(s.x0, s.y - 3 * u, s.x1 - s.x0, s.t + 3 * u);
  g.fillStyle = "rgba(255,220,170,0.28)"; g.fillRect(s.x0, s.y - 3 * u, s.x1 - s.x0, 1.4 * u);
}

// The sideboard: a long walnut cabinet, its top lit, four panelled doors,
// two brass pulls to each pair.
function paintBoard(g, L) {
  const { u } = L, b = L.board;
  const top = 12 * u;
  soft(g, (b.x0 + b.x1) / 2, b.bottom, (b.x1 - b.x0) / 2 + 20 * u, 14 * u, "0,0,0", 0.7);
  g.fillStyle = grad(g, b.x0, 0, b.x1, 0, ["#2a180c", "#4a2e18", "#3a2412", "#24140a"]);
  g.fillRect(b.x0, b.top + top, b.x1 - b.x0, b.bottom - b.top - top);
  const n = 4, dw = (b.x1 - b.x0 - 40 * u) / n;
  for (let i = 0; i < n; i++) {
    const x0 = b.x0 + 20 * u + i * dw + 4 * u, w = dw - 8 * u, y0 = b.top + top + 16 * u, h = b.bottom - y0 - 18 * u;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x0, y0, w, h);
    g.fillStyle = "rgba(255,200,150,0.07)"; g.fillRect(x0 + 10 * u, y0 + 10 * u, w - 20 * u, h - 20 * u);
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x0 + 10 * u, y0 + 10 * u, w - 20 * u, 2 * u);
    const px = i % 2 ? x0 + 12 * u : x0 + w - 12 * u;
    g.fillStyle = "#c8a050"; g.beginPath(); g.arc(px, y0 + h * 0.45, 3.2 * u, 0, Math.PI * 2); g.fill();
  }
  // the top, overhanging, its front edge catching the light
  g.fillStyle = grad(g, 0, b.top, 0, b.top + top, ["#8a5c34", "#5a3a1e", "#2a180c"]);
  g.fillRect(b.x0 - 10 * u, b.top, b.x1 - b.x0 + 20 * u, top);
  g.fillStyle = "rgba(255,226,180,0.35)"; g.fillRect(b.x0 - 10 * u, b.top, b.x1 - b.x0 + 20 * u, 1.6 * u);
}

// A cup, standing on its base at (x, y), s pixels to its unit: a wooden
// plinth, then the metal — a two-handled loving cup, a tall goblet, a column
// with a star on it, or a shield on its stand.
function paintCup(g, c) {
  const { x, y, s } = c, m = METAL[c.metal];
  const metal = (x0, x1) => grad(g, x0, 0, x1, 0, m);
  soft(g, x, y, s * 0.5, s * 0.06, "0,0,0", 0.6);
  // the plinth: dark wood, a blank brass plate
  const pw = s * 0.42, ph = s * 0.16;
  g.fillStyle = grad(g, x - pw / 2, 0, x + pw / 2, 0, ["#1a0e06", "#3a2210", "#120a04"]);
  g.fillRect(x - pw / 2, y - ph, pw, ph);
  g.fillStyle = "#2a180a"; g.fillRect(x - pw * 0.42, y - ph - s * 0.05, pw * 0.84, s * 0.05);
  g.fillStyle = metal(x - pw * 0.25, x + pw * 0.25); g.fillRect(x - pw * 0.24, y - ph * 0.72, pw * 0.48, ph * 0.42);
  const base = y - ph - s * 0.05;
  if (c.kind === "shield") {
    g.fillStyle = metal(x - s * 0.04, x + s * 0.04); g.fillRect(x - s * 0.03, base - s * 0.18, s * 0.06, s * 0.18);
    const sy = base - s * 0.18;
    g.fillStyle = metal(x - s * 0.24, x + s * 0.24);
    g.beginPath(); g.moveTo(x - s * 0.24, sy - s * 0.52); g.lineTo(x + s * 0.24, sy - s * 0.52); g.lineTo(x + s * 0.24, sy - s * 0.24); g.quadraticCurveTo(x + s * 0.2, sy - s * 0.02, x, sy + s * 0.06); g.quadraticCurveTo(x - s * 0.2, sy - s * 0.02, x - s * 0.24, sy - s * 0.24); g.closePath(); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = Math.max(1, s * 0.012);
    g.beginPath(); g.moveTo(x - s * 0.19, sy - s * 0.47); g.lineTo(x + s * 0.19, sy - s * 0.47); g.lineTo(x + s * 0.19, sy - s * 0.25); g.quadraticCurveTo(x + s * 0.16, sy - s * 0.07, x, sy - s * 0.01); g.quadraticCurveTo(x - s * 0.16, sy - s * 0.07, x - s * 0.19, sy - s * 0.25); g.closePath(); g.stroke();
    return;
  }
  // the foot and the stem
  g.fillStyle = metal(x - s * 0.16, x + s * 0.16);
  g.beginPath(); g.moveTo(x - s * 0.15, base); g.lineTo(x + s * 0.15, base); g.lineTo(x + s * 0.05, base - s * 0.07); g.lineTo(x - s * 0.05, base - s * 0.07); g.closePath(); g.fill();
  const stem = c.kind === "goblet" ? 0.3 : c.kind === "star" ? 0.42 : 0.14;
  g.fillStyle = metal(x - s * 0.035, x + s * 0.035);
  g.fillRect(x - s * 0.03, base - s * (0.07 + stem), s * 0.06, s * stem);
  g.beginPath(); g.ellipse(x, base - s * (0.07 + stem * 0.5), s * 0.06, s * 0.025, 0, 0, Math.PI * 2); g.fill();
  const top = base - s * (0.07 + stem);
  if (c.kind === "star") {
    // a column, a ball, a star
    g.fillStyle = metal(x - s * 0.06, x + s * 0.06); g.beginPath(); g.arc(x, top - s * 0.04, s * 0.05, 0, Math.PI * 2); g.fill();
    g.fillStyle = metal(x - s * 0.16, x + s * 0.16);
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.065 : s * 0.16; g.lineTo(x + Math.cos(a) * r, top - s * 0.24 + Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = Math.max(1, s * 0.01); g.stroke();
    return;
  }
  // the bowl, its lip, and the handles of a loving cup
  const bw = c.kind === "goblet" ? s * 0.16 : s * 0.24, bh = c.kind === "goblet" ? s * 0.42 : s * 0.38;
  if (c.kind === "loving") {
    g.strokeStyle = metal(x - bw * 1.5, x + bw * 1.5); g.lineWidth = Math.max(2, s * 0.035);
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * bw * 0.85, top - bh * 0.85); g.bezierCurveTo(x + d * bw * 1.65, top - bh * 0.95, x + d * bw * 1.6, top - bh * 0.25, x + d * bw * 0.55, top - bh * 0.22); g.stroke(); }
  }
  g.fillStyle = metal(x - bw, x + bw);
  g.beginPath(); g.moveTo(x - bw, top - bh); g.bezierCurveTo(x - bw, top - bh * 0.3, x - bw * 0.35, top, x, top); g.bezierCurveTo(x + bw * 0.35, top, x + bw, top - bh * 0.3, x + bw, top - bh); g.closePath(); g.fill();
  g.fillStyle = metal(x - bw * 1.05, x + bw * 1.05); g.fillRect(x - bw * 1.06, top - bh - s * 0.025, bw * 2.12, s * 0.03);
  g.fillStyle = "rgba(20,12,4,0.55)"; g.beginPath(); g.ellipse(x, top - bh - s * 0.01, bw * 0.98, s * 0.022, 0, 0, Math.PI * 2); g.fill();
  // a long highlight down the bowl
  g.fillStyle = "rgba(255,255,255,0.32)"; g.beginPath(); g.ellipse(x - bw * 0.45, top - bh * 0.55, bw * 0.12, bh * 0.32, 0.1, 0, Math.PI * 2); g.fill();
}

// The lamps out of the picture: warm light on the flags, the shelf and the
// sideboard, the corners left in the dark.
function paintLight(g, L) {
  const { W, H, u } = L;
  soft(g, W / 2, L.rod.y + L.flags[0].h * 0.6, W * 0.5, H * 0.22, "255,196,130", 0.2, "lighter");
  soft(g, W / 2, L.shelf.y - 30 * u, W * 0.34, H * 0.12, "255,196,130", 0.14, "lighter");
  soft(g, W / 2, L.board.top - 40 * u, W * 0.42, H * 0.16, "255,196,130", 0.16, "lighter");
}

// A flag hung from the rod by its rings, stirring a little in a draught: its
// folds lit from the front and to the left. FLAG_FRAMES frames, FRAME_COLS
// to a row; each frame's origin is the middle of its top edge, `oy` down.
function paintFlagFrames(code, fw, fh) {
  const dw = Math.ceil(fw * R), dh = Math.ceil(fh * R);
  const d = makeCanvas(dw, dh);
  paintDesign(d.getContext("2d"), code, dw, dh);
  const top = Math.ceil(dh * 0.12), side = Math.ceil(dw * 0.03);
  const cw = dw + side * 2, ch = dh + top + Math.ceil(dh * 0.05);
  const rows = Math.ceil(FLAG_FRAMES / FRAME_COLS);
  const c = makeCanvas(cw * FRAME_COLS, ch * rows);
  const g = c.getContext("2d");
  const fold = (q, ph) => 0.6 * Math.sin(q * Math.PI * 4 + ph) + 0.25 * Math.sin(q * Math.PI * 7.5 - ph * 1.3 + 1.1);
  for (let f = 0; f < FLAG_FRAMES; f++) {
    const ph = (f / FLAG_FRAMES) * Math.PI * 2;
    const ox = (f % FRAME_COLS) * cw + side, oy = Math.floor(f / FRAME_COLS) * ch + top;
    g.save();
    g.beginPath(); g.rect(ox - side, oy - top, cw, ch); g.clip();
    // its shadow on the wall behind
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(ox + dw * 0.03, oy + dh * 0.05, dw, dh);
    const step = 2;
    for (let x = 0; x < dw; x += step) {
      const q = x / dw, k = fold(q, ph);
      const slope = (fold(q + 0.01, ph) - fold(q - 0.01, ph)) / 0.02 / 14;
      const colH = dh * (0.97 + 0.03 * (0.5 + 0.5 * k));
      g.drawImage(d, x, 0, step, dh, ox + x, oy, step, colH);
      const s = Math.max(-1, Math.min(1, slope));
      g.fillStyle = s > 0 ? `rgba(255,236,200,${(0.18 * s).toFixed(3)})` : `rgba(10,8,20,${(0.32 * -s).toFixed(3)})`;
      g.fillRect(ox + x, oy, step, colH);
    }
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(255,190,120,0.06)"; g.fillRect(ox, oy, dw, dh);
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(ox, oy, dw, Math.max(2, dh * 0.04));
    g.globalCompositeOperation = "source-over";
    // the rings it hangs by
    for (const px of [0.06, 0.5, 0.94]) {
      g.strokeStyle = "#c8a050"; g.lineWidth = Math.max(2, dw * 0.012);
      g.beginPath(); g.arc(ox + dw * px, oy - top * 0.45, top * 0.42, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
  return { canvas: c, cw, ch, oy: (top * 0.1) / ch };
}

// A medal on its ribbon: the ribbon folded to a V, a little clasp, the
// disc with a raised rim and a laurel round it. Its origin is the top of
// the ribbon.
function paintMedal(m) {
  const r = m.r, len = m.len, w = Math.ceil(r * 2.6), h = Math.ceil(len + r * 2.4);
  const c = makeCanvas(w * R, h * R), g = c.getContext("2d");
  g.scale(R, R);
  const cx = w / 2, met = METAL[m.metal];
  // the ribbon
  const rw = r * 0.95;
  g.fillStyle = m.ribbon;
  g.beginPath(); g.moveTo(cx - rw, 0); g.lineTo(cx + rw, 0); g.lineTo(cx + rw * 0.35, len); g.lineTo(cx - rw * 0.35, len); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(cx - rw, 0); g.lineTo(cx - rw * 0.4, 0); g.lineTo(cx - rw * 0.1, len); g.lineTo(cx - rw * 0.35, len); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.moveTo(cx + rw * 0.4, 0); g.lineTo(cx + rw, 0); g.lineTo(cx + rw * 0.35, len); g.lineTo(cx + rw * 0.1, len); g.closePath(); g.fill();
  // the clasp
  g.fillStyle = met[1]; g.fillRect(cx - rw * 0.45, len - 2, rw * 0.9, 4);
  // the disc
  const cy = len + r * 1.1;
  const disc = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  disc.addColorStop(0, met[2]); disc.addColorStop(0.5, met[3]); disc.addColorStop(1, met[0]);
  g.fillStyle = disc; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = Math.max(1, r * 0.08);
  g.beginPath(); g.arc(cx, cy, r * 0.78, 0, Math.PI * 2); g.stroke();
  // a laurel: two sprays of leaves up its sides
  g.fillStyle = "rgba(0,0,0,0.28)";
  for (const d of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + d * (0.5 + i * 0.36);
      g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.13, r * 0.06, a + d * 0.8, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.ellipse(cx - r * 0.35, cy - r * 0.42, r * 0.22, r * 0.1, -0.6, 0, Math.PI * 2); g.fill();
  return c;
}

// a small four-pointed glint for the silver
function paintGlint() {
  const s = 32, m = s / 2, c = makeCanvas(s, s), g = c.getContext("2d");
  const grd = g.createRadialGradient(m, m, 0, m, m, m);
  grd.addColorStop(0, "rgba(255,255,255,0.9)"); grd.addColorStop(0.2, "rgba(255,248,220,0.4)"); grd.addColorStop(1, "rgba(255,248,220,0)");
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.beginPath(); g.moveTo(m, 0); g.lineTo(m + 1.4, m); g.lineTo(m, s); g.lineTo(m - 1.4, m); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(0, m); g.lineTo(m, m - 1.4); g.lineTo(s, m); g.lineTo(m, m + 1.4); g.closePath(); g.fill();
  return c;
}
