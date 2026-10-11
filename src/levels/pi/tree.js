import { createMoonCanvas } from "../../shared/moon.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The Christmas tree for PI, in the drawing room at night: a tall fir in a
 *  wooden tub, nine tiers of boughs, a brass star on its top, glass balls
 *  hung here and there, a few parcels under it. Along each tier a string of
 *  small lamps — more holders than lamps alight; which are alight is the
 *  scene's business, so here every holder has its lamp dark. Beside the
 *  tree, the room's tall window with the moon in it, and the moon's light
 *  on the boards.
 *
 *  Painted once per screen size: the room with the tree; a lamp, alight; a
 *  glow. */

const K = { room: "pt_room", lamp: "pt_lamp", glow: "pt_glow" };
const MOON = "150,178,232";
// how many holders each tier's string has, top to bottom — always more than
// are ever alight on it, so a light has somewhere to go
const HOLDERS = [4, 4, 6, 6, 8, 11, 10, 11, 12];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutTree(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, S: Math.min(W, H) };
  L.floorY = H * 0.86;
  const cx = W * 0.4, top = H * 0.115, base = L.floorY - 46 * u;
  const tiers = HOLDERS.length, th = (base - top) / tiers;
  const reach = Math.min(W * 0.21, (base - top) * 0.44);
  L.tree = { cx, top, base, th, reach, tiers };
  L.half = (i) => reach * (0.13 + (0.87 * (i + 1)) / tiers);
  // the strings: each sags a little between the tree's two sides
  const rnd = lcg(3141);
  L.rows = HOLDERS.map((n, i) => {
    const y = top + (i + 0.8) * th, hw = L.half(i) * 0.88;
    return Array.from({ length: n }, (_, j) => {
      const t = (j + 0.5) / n, e = t * 2 - 1;
      return { x: cx + e * hw + (rnd() - 0.5) * 4 * u, y: y + (1 - e * e) * th * 0.17 + (rnd() - 0.5) * 3 * u };
    });
  });
  L.lamp = { w: 9 * u, h: 13 * u };
  // the window, and the moon in it
  const wx0 = W * 0.69, wx1 = W * 0.89, wy0 = H * 0.09, wy1 = H * 0.63;
  L.win = { x0: wx0, x1: wx1, y0: wy0, y1: wy1 };
  L.moon = { x: wx0 + (wx1 - wx0) * 0.6, y: wy0 + (wy1 - wy0) * 0.26, r: Math.min(W, H) * 0.06 };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintTree(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintRoom(ctx, L);
  paintWindow(ctx, L);
  paintParcels(ctx, L, false);
  paintTub(ctx, L);
  for (let i = L.tree.tiers - 1; i >= 0; i--) paintTier(ctx, L, i);
  paintStar(ctx, L);
  paintBalls(ctx, L);
  paintStrings(ctx, L);
  paintParcels(ctx, L, true);
  // the room's dark, away from the window
  const dark = ctx.createLinearGradient(L.win.x0, 0, 0, 0);
  dark.addColorStop(0, "rgba(3,3,5,0.1)");
  dark.addColorStop(1, "rgba(3,3,5,0.5)");
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, H);
  vignette(ctx, W, H, 0.8);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.lamp, paintLamp());
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K };
}

/** The tree by itself — tub, boughs, star, glass balls, strings (every lamp
 *  dark), parcels — on a clear sheet W by H, for a room to stand it in.
 *  Gives the sheet and where everything on it is. */
export function paintTreeAlone(W, H) {
  const L = layoutTree(W, H);
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  paintParcels(ctx, L, false);
  paintTub(ctx, L);
  for (let i = L.tree.tiers - 1; i >= 0; i--) paintTier(ctx, L, i);
  paintStar(ctx, L);
  paintBalls(ctx, L);
  paintStrings(ctx, L);
  paintParcels(ctx, L, true);
  return { canvas, L };
}

export function releaseTreeArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// the drawing room behind it: red paper over a dark dado, parquet
function paintRoom(ctx, L) {
  const { W, H, u, floorY } = L;
  const rnd = lcg(55);
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, "#160a0d");
  wall.addColorStop(1, "#22101a");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, floorY);
  ctx.fillStyle = "rgba(230,170,170,0.03)";
  for (let x = 0; x < W; x += 26 * u) ctx.fillRect(x, 0, 9 * u, floorY);
  // the dado and its rail, the skirting
  const dy = H * 0.66;
  const dado = ctx.createLinearGradient(0, dy, 0, floorY);
  dado.addColorStop(0, "#22140c");
  dado.addColorStop(1, "#120a06");
  ctx.fillStyle = dado;
  ctx.fillRect(0, dy, W, floorY - dy);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = Math.max(1, 1.4 * u);
  for (let x = 20 * u; x < W; x += 150 * u) ctx.strokeRect(x, dy + 16 * u, 130 * u, floorY - dy - 34 * u);
  ctx.fillStyle = "#33200f";
  ctx.fillRect(0, dy - 4 * u, W, 8 * u);
  ctx.fillStyle = "rgba(255,206,160,0.12)";
  ctx.fillRect(0, dy - 4 * u, W, 1.2 * u);
  ctx.fillStyle = "#0c0704";
  ctx.fillRect(0, floorY - 12 * u, W, 12 * u);
  // the parquet: boards end on, each its own shade
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, "#1c120a");
  floor.addColorStop(1, "#33200f");
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, W, H - floorY);
  const vx = W * 0.5, vy = H * 0.4, k = (H - vy) / (floorY - vy);
  for (let i = -16; i <= 16; i++) {
    const xb = vx + i * W * 0.05;
    if (rnd() < 0.5) {
      ctx.fillStyle = `rgba(0,0,0,${(rnd() * 0.22).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(xb, floorY); ctx.lineTo(xb + W * 0.05, floorY); ctx.lineTo(vx + (xb + W * 0.05 - vx) * k, H); ctx.lineTo(vx + (xb - vx) * k, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(4,2,1,0.7)";
    ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath(); ctx.moveTo(xb, floorY); ctx.lineTo(vx + (xb - vx) * k, H); ctx.stroke();
  }
}

// The window: a tall sash between dark curtains, the night and the moon in
// it, and its light lying on the boards.
function paintWindow(ctx, L) {
  const { H, u, floorY } = L;
  const { x0, x1, y0, y1 } = L.win, m = L.moon;
  const rnd = lcg(808);
  ctx.fillStyle = "#0a0605";
  ctx.fillRect(x0 - 10 * u, y0 - 10 * u, x1 - x0 + 20 * u, y1 - y0 + 22 * u);
  const sky = ctx.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, "#050914");
  sky.addColorStop(0.7, "#101c3a");
  sky.addColorStop(1, "#1e2c50");
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  for (let i = 0; i < 46; i++) {
    const sx = x0 + rnd() * (x1 - x0), sy = y0 + rnd() * (y1 - y0) * 0.8;
    if (Math.hypot(sx - m.x, sy - m.y) < m.r * 2) continue;
    ctx.fillStyle = `rgba(226,234,255,${(0.2 + rnd() * 0.6).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(sx, sy, (0.6 + rnd() * 0.9) * u, 0, Math.PI * 2); ctx.fill();
  }
  // the moon: the disc is 0.36 of its picture
  const size = m.r / 0.36;
  ctx.drawImage(createMoonCanvas(), m.x - size / 2, m.y - size / 2, size, size);
  // the far trees, low
  ctx.fillStyle = "#070c18";
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  for (let i = 0; i <= 16; i++) ctx.lineTo(x0 + ((x1 - x0) * i) / 16, y1 - (y1 - y0) * (0.07 + 0.03 * Math.sin(i * 1.7) + 0.02 * Math.sin(i * 4.1)));
  ctx.lineTo(x1, y1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // its bars
  ctx.fillStyle = "#17100b";
  ctx.fillRect((x0 + x1) / 2 - 3 * u, y0, 6 * u, y1 - y0);
  ctx.fillRect(x0, (y0 + y1) / 2 - 4 * u, x1 - x0, 8 * u);
  ctx.fillStyle = "rgba(170,190,236,0.3)";
  ctx.fillRect((x0 + x1) / 2 + 3 * u, y0, 1.2 * u, y1 - y0);
  ctx.fillRect(x0, (y0 + y1) / 2 + 4 * u, x1 - x0, 1.2 * u);
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(x0 - 16 * u, y1, x1 - x0 + 32 * u, 9 * u);
  // the curtains, drawn back
  for (const s of [-1, 1]) {
    const cx = s < 0 ? x0 : x1, cw = (x1 - x0) * 0.24;
    const g = ctx.createLinearGradient(cx - cw, 0, cx + cw, 0);
    g.addColorStop(0, "#1a070b");
    g.addColorStop(0.5, "#3a1118");
    g.addColorStop(1, "#16060a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - cw, y0 - 22 * u); ctx.lineTo(cx + cw, y0 - 22 * u);
    ctx.lineTo(cx + s * cw * 0.9, y1 + 40 * u); ctx.lineTo(cx - s * cw * 0.1, y1 + 40 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2 * u;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - cw + (cw * 2 * i) / 5, y0 - 22 * u); ctx.lineTo(cx - s * cw * 0.1 + (s * cw * i) / 5, y1 + 40 * u); ctx.stroke(); }
  }
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(x0 - (x1 - x0) * 0.3, y0 - 30 * u, (x1 - x0) * 1.6, 10 * u);
  // the moon on the wall round it and on the floor
  soft(ctx, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 1.5, (y1 - y0) * 0.9, MOON, 0.1, "lighter");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${Math.round(6 * u)}px)`;
  ctx.fillStyle = `rgba(${MOON},0.13)`;
  ctx.beginPath();
  ctx.moveTo(x0 - (x1 - x0) * 0.5, floorY + 8 * u); ctx.lineTo(x1 - (x1 - x0) * 0.4, floorY + 8 * u);
  ctx.lineTo(x1 - (x1 - x0) * 1.1, H); ctx.lineTo(x0 - (x1 - x0) * 1.5, H);
  ctx.closePath();
  ctx.fill();
  ctx.filter = "none";
  ctx.restore();
}

// the tub the tree stands in: staves and two hoops, the trunk going into it
function paintTub(ctx, L) {
  const { u, floorY } = L;
  const { cx, base } = L.tree;
  soft(ctx, cx, floorY + 6 * u, 150 * u, 16 * u, "0,0,0", 0.7);
  ctx.fillStyle = "#1c120a";
  ctx.fillRect(cx - 11 * u, base - 30 * u, 22 * u, 50 * u);
  const y0 = base + 6 * u, y1 = floorY + 4 * u, w0 = 62 * u, w1 = 50 * u;
  const g = ctx.createLinearGradient(cx - w0, 0, cx + w0, 0);
  g.addColorStop(0, "#150d07");
  g.addColorStop(0.45, "#3e2a18");
  g.addColorStop(0.7, "#4a3420");
  g.addColorStop(1, "#110a05");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w0, y0); ctx.lineTo(cx + w0, y0); ctx.lineTo(cx + w1, y1); ctx.lineTo(cx - w1, y1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(cx + (i * w0) / 5, y0); ctx.lineTo(cx + (i * w1) / 5, y1); ctx.stroke(); }
  for (const f of [0.18, 0.78]) {
    const y = y0 + (y1 - y0) * f, w = w0 + (w1 - w0) * f;
    const ig = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    ig.addColorStop(0, "#08080a");
    ig.addColorStop(0.6, "#4e525c");
    ig.addColorStop(1, "#08080a");
    ctx.fillStyle = ig;
    ctx.fillRect(cx - w - u, y - 4 * u, w * 2 + 2 * u, 8 * u);
  }
  ctx.fillStyle = "#0a0806";
  ctx.beginPath(); ctx.ellipse(cx, y0, w0, 6 * u, 0, 0, Math.PI * 2); ctx.fill();
}

// One tier of boughs: wide and drooping, its lower edge in tips; dark fir
// green, the tier above throwing its shadow down it, the moon along the side
// toward the window.
function paintTier(ctx, L, i) {
  const { u } = L;
  const { cx, top, th } = L.tree;
  const rnd = lcg(900 + i * 31);
  const ya = top + (i - 0.35) * th, yb = top + (i + 1.16) * th, hw = L.half(i) * 1.1;
  const tips = 5 + i;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(cx, ya);
    ctx.quadraticCurveTo(cx + hw * 0.5, ya + (yb - ya) * 0.62, cx + hw, yb - th * 0.16);
    for (let k = tips; k > 0; k--) {
      const xr = cx + hw * ((k / tips) * 2 - 1), xl = cx + hw * (((k - 1) / tips) * 2 - 1);
      const dip = th * (0.1 + 0.14 * Math.sin((k / tips) * Math.PI));
      ctx.quadraticCurveTo((xr + xl) / 2 + (xr - xl) * 0.2, yb - th * 0.34, xl, yb - th * 0.16 + (k > 1 ? dip : 0));
    }
    ctx.quadraticCurveTo(cx - hw * 0.5, ya + (yb - ya) * 0.62, cx, ya);
    ctx.closePath();
  };
  // its shadow on the tier below
  ctx.save();
  ctx.translate(0, th * 0.14);
  shape();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, ya, 0, yb);
  g.addColorStop(0, "#0a1810");
  g.addColorStop(0.6, "#12281a");
  g.addColorStop(1, "#0b1c12");
  shape();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // needles: short strokes, down and outward, dark and light
  for (let k = 0; k < 520 + i * 150; k++) {
    const y = ya + Math.sqrt(rnd()) * (yb - ya), w = hw * ((y - ya) / (yb - ya));
    const x = cx + (rnd() * 2 - 1) * w, out = (x - cx) / hw;
    const len = (5 + rnd() * 9) * u;
    ctx.strokeStyle = rnd() < 0.55 ? `rgba(4,12,7,${(0.3 + rnd() * 0.4).toFixed(2)})` : `rgba(${Math.round(50 + rnd() * 40)},${Math.round(96 + rnd() * 50)},${Math.round(62 + rnd() * 30)},${(0.14 + rnd() * 0.3).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.7, (0.8 + rnd() * 0.8) * u);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + out * len * 0.9 + (rnd() - 0.5) * 3 * u, y + len * (0.5 + rnd() * 0.5)); ctx.stroke();
  }
  // the moon down its window side, the dark down the other
  const side = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  side.addColorStop(0, "rgba(0,0,0,0.4)");
  side.addColorStop(0.55, "rgba(0,0,0,0)");
  side.addColorStop(1, `rgba(${MOON},0.14)`);
  ctx.fillStyle = side;
  ctx.fillRect(cx - hw, ya, hw * 2, yb - ya);
  ctx.restore();
}

// the star on the top: five points of brass, the moon on one side of it
function paintStar(ctx, L) {
  const { u } = L;
  const { cx, top, th } = L.tree;
  const y = top - th * 0.2, R = 24 * u, r = 10 * u;
  ctx.fillStyle = "#1c120a";
  ctx.fillRect(cx - 2 * u, y, 4 * u, th * 0.4);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R;
    if (i) ctx.lineTo(cx + Math.cos(a) * q, y + Math.sin(a) * q); else ctx.moveTo(cx + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
  g.addColorStop(0, "#3a2a10");
  g.addColorStop(0.55, "#8a6c34");
  g.addColorStop(1, "#d0b068");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(20,12,4,0.7)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke();
  }
}

// glass balls, hung between the strings: deep colours, the window small in each
function paintBalls(ctx, L) {
  const { u } = L;
  const { cx, top, th, tiers } = L.tree;
  const rnd = lcg(271);
  const glass = [["#5a0e14", "#e06a70"], ["#6a5216", "#f0d890"], ["#10244e", "#7a9ae0"], ["#3c3e46", "#d8dce6"]];
  for (let i = 1; i < tiers; i++) {
    for (let n = 0; n < (i < 4 ? 1 : 2); n++) {
      const x = cx + (rnd() * 2 - 1) * L.half(i) * 0.7, y = top + (i + 0.36 + rnd() * 0.12) * th, r = (6.5 + rnd() * 3.5) * u;
      const [deep, shine] = glass[Math.floor(rnd() * glass.length)];
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = Math.max(0.7, 0.8 * u);
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y - r - 9 * u); ctx.stroke();
      ctx.fillStyle = "#8a6c34";
      ctx.fillRect(x - 2 * u, y - r - 2.6 * u, 4 * u, 3.4 * u);
      const g = ctx.createRadialGradient(x + r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, shine);
      g.addColorStop(0.4, deep);
      g.addColorStop(1, "#050506");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(220,230,255,0.55)";
      ctx.fillRect(x + r * 0.28, y - r * 0.5, r * 0.22, r * 0.36);
    }
  }
}

// The strings of lamps: a cord along each tier from side to side, a brass
// holder wherever a lamp goes, and in each holder its little glass lamp,
// dark — the scene lights the ones that are alight.
function paintStrings(ctx, L) {
  const { u } = L;
  const { w, h } = L.lamp;
  for (const row of L.rows) {
    ctx.strokeStyle = "#060b07";
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.beginPath();
    row.forEach((p, j) => {
      if (!j) { ctx.moveTo(p.x - 14 * u, p.y - h * 0.9 - 5 * u); ctx.lineTo(p.x, p.y - h * 0.9); return; }
      const q = row[j - 1];
      ctx.quadraticCurveTo((p.x + q.x) / 2, Math.max(p.y, q.y) - h * 0.9 + 5 * u, p.x, p.y - h * 0.9);
    });
    const last = row[row.length - 1];
    ctx.lineTo(last.x + 14 * u, last.y - h * 0.9 - 5 * u);
    ctx.stroke();
    for (const p of row) {
      ctx.fillStyle = "#6a5226";
      ctx.fillRect(p.x - w * 0.3, p.y - h * 0.95, w * 0.6, h * 0.36);
      const g = ctx.createRadialGradient(p.x - w * 0.15, p.y - h * 0.1, 0.5, p.x, p.y, h * 0.6);
      g.addColorStop(0, "#5a5446");
      g.addColorStop(0.5, "#2a2620");
      g.addColorStop(1, "#0c0a08");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(220,230,255,0.3)";
      ctx.beginPath(); ctx.ellipse(p.x + w * 0.14, p.y - h * 0.16, w * 0.09, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// a few parcels under the tree: brown paper and ribbon — `front` the ones before the tub
function paintParcels(ctx, L, front) {
  const { u, floorY } = L;
  const { cx } = L.tree;
  const parcels = front
    ? [[-128, 20, 96, 56, "#3a2a1a", "#6a1a1e"], [86, 24, 70, 70, "#1e2a3a", "#b08c44"]]
    : [[-70, 4, 84, 78, "#2a3324", "#b08c44"], [128, 6, 104, 48, "#3c1a1e", "#c8c0a8"]];
  for (const [dx, dy, w, h, paper, ribbon] of parcels) {
    const x = cx + dx * u, y1 = floorY + dy * u, pw = w * u, ph = h * u;
    soft(ctx, x + 6 * u, y1, pw * 0.62, 7 * u, "0,0,0", 0.6);
    const g = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
    g.addColorStop(0, "#0a0806");
    g.addColorStop(0.5, paper);
    g.addColorStop(1, paper);
    ctx.fillStyle = g;
    ctx.fillRect(x - pw / 2, y1 - ph, pw, ph);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x - pw / 2, y1 - ph, pw, 2 * u);
    ctx.fillStyle = ribbon;
    ctx.fillRect(x - 4 * u, y1 - ph, 8 * u, ph);
    ctx.fillRect(x - pw / 2, y1 - ph * 0.56, pw, 7 * u);
    // the bow
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 9 * u, y1 - ph - 4 * u, 9 * u, 5 * u, s * -0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x - pw / 2, y1 - ph, pw * 0.2, ph);
  }
}

// one lamp alight: the glass full of light, white at its heart
function paintLamp() {
  const w = 36, h = 52;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const body = g.createRadialGradient(w / 2, h * 0.52, 1, w / 2, h * 0.5, h * 0.48);
  body.addColorStop(0, "#fffdf2");
  body.addColorStop(0.4, "#ffe6a0");
  body.addColorStop(0.8, "#ffb040");
  body.addColorStop(1, "rgba(255,150,40,0)");
  g.fillStyle = body;
  g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.46, h * 0.47, 0, 0, Math.PI * 2); g.fill();
  return c;
}
