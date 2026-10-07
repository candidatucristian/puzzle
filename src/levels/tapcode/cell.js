import { TAP_WORD, tapPair } from "./puzzle.js";
import { createMoonCanvas } from "../../shared/moon.js";
import {
  soft,
  grain,
  vignette,
  glowCanvas,
  rgb,
  makeCanvas,
  addCanvasTexture,
  lcg,
  polygon,
} from "../../shared/paint.js";

/** The tower cell for TAPCODE, painted like the game's storybook nights: a
 *  round-stoned wall, cold moonlight falling through a small square window
 *  barred five by five and laying the grille's shadow across the floor, and
 *  on the other side a candle burning on a stool, warm on a great smooth
 *  stone where a prisoner cut his message: six lines of tally marks, two
 *  clusters in each. A straw cot under the window with a patched blanket, an
 *  iron-bound door, a tin cup, and the bones of the last prisoner, still
 *  chained to the wall under the window.
 *
 *  Someone began numbering the window's squares — a 1 scratched over the
 *  first column, a 1 beside the first row — and stopped.
 *
 *  Painted once per screen size: the cell; the candle's flame and a glow are
 *  live in the scene. */

const K = { room: "tc_room", flame: "tc_flame", glow: "tc_glow", fog: "tc_fog" };
const WARM = "255,182,104";
const MOON = "150,178,232";

// ── where everything is ─────────────────────────────────────────────────────

export function layoutCell(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, S: Math.min(W, H) };
  L.floorY = H * 0.77;
  L.vp = { x: W * 0.5, y: H * 0.42 };
  const ww = Math.min(W * 0.15, H * 0.26, 240);
  L.win = { x0: W * 0.24 - ww / 2, y0: H * 0.13, w: ww, h: ww };
  L.win.x1 = L.win.x0 + ww;
  L.win.y1 = L.win.y0 + ww;
  // the message stone: sized to its marks, as the old one was
  const n = TAP_WORD.length;
  const gap = Math.min(W * 0.014, 17);
  const clusterGap = gap * 3.4;
  const sw = 8 * gap + clusterGap + W * 0.085;
  const sh = H * 0.5;
  L.slab = { cx: W * 0.6, x0: W * 0.6 - sw / 2, y0: H * 0.13, w: sw, h: sh, gap, clusterGap, n };
  L.slab.lineH = sh / (n + 0.6);
  L.slab.markH = Math.min(L.slab.lineH * 0.5, 30);
  L.door = { x0: W * 0.84, x1: W * 0.97, top: H * 0.27 };
  L.cot = { x0: W * 0.035, x1: W * 0.33 };
  L.stool = { x: W * 0.765, s: u };
  L.candle = { x: L.stool.x, y: L.floorY - 104 * u, s: u };
  L.skel = { x: W * 0.415, s: u * 1.1 };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintCell(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintWall(ctx, L);
  paintWindow(ctx, L);
  paintFloor(ctx, L);
  paintMoonlight(ctx, L);
  paintSlab(ctx, L);
  paintDoor(ctx, L);
  paintCot(ctx, L);
  paintStool(ctx, L);
  paintCup(ctx, L);
  paintSkeleton(ctx, L);
  paintCandleLight(ctx, L);
  paintFog(ctx, L);
  vignette(ctx, W, H, 0.8);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.flame, paintFlame());
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.fog, paintFogBank());
  return { keys: K };
}

export function releaseCellArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// The wall: courses of big rounded stones, each with its own shade, a soft
// light on its upper edge, set in dark mortar. Cool by the window, warm by
// the candle.
function paintWall(ctx, L) {
  const { W, H, u, floorY } = L;
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, W, floorY + 2);
  const rnd = lcg(2001);
  const rows = 7;
  const bh = floorY / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * bh;
    let x = -((r % 2) * 0.5 + rnd() * 0.3) * bh * 1.9;
    while (x < W) {
      const w = bh * (1.5 + rnd() * 0.9);
      const k = 0.82 + rnd() * 0.3;
      const pad = 2.4 * u;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, rgb(42 * k, 45 * k, 54 * k));
      g.addColorStop(1, rgb(26 * k, 28 * k, 34 * k));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, w - pad * 2, bh - pad * 2, bh * 0.06);
      ctx.fill();
      ctx.fillStyle = "rgba(170,180,200,0.04)";
      ctx.fillRect(x + pad * 2, y + pad * 1.4, w - pad * 4, Math.max(1, bh * 0.03));
      // its rough face: mottled, pitted
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + pad, y + pad, w - pad * 2, bh - pad * 2);
      ctx.clip();
      for (let j = 0; j < 5; j++) soft(ctx, x + w * rnd(), y + bh * rnd(), bh * (0.2 + rnd() * 0.4), bh * (0.15 + rnd() * 0.25), rnd() < 0.6 ? "0,0,0" : "150,150,140", 0.12);
      for (let j = 0; j < 14; j++) {
        ctx.fillStyle = `rgba(0,0,0,${(0.2 + rnd() * 0.3).toFixed(2)})`;
        ctx.fillRect(x + w * rnd(), y + bh * rnd(), (1 + rnd() * 2) * u, (1 + rnd() * 1.5) * u);
      }
      ctx.restore();
      // a chip or two, softly
      if (rnd() < 0.35) soft(ctx, x + w * rnd(), y + bh * (0.3 + rnd() * 0.5), bh * 0.18, bh * 0.1, "0,0,0", 0.25);
      x += w;
    }
  }
  // damp, run down the stone in streaks
  for (let i = 0; i < 9; i++) {
    const sx = W * rnd();
    const sl = floorY * (0.2 + rnd() * 0.5);
    const sy = floorY * rnd() * 0.4;
    const g = ctx.createLinearGradient(0, sy, 0, sy + sl);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.3, "rgba(10,12,8,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, (8 + rnd() * 26) * u, sl);
  }
  // the moon's cold spill round the window, the candle's warmth to the right
  const win = L.win;
  soft(ctx, (win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, win.w * 2.2, win.h * 2, MOON, 0.12, "lighter");
  soft(ctx, L.candle.x, L.candle.y - H * 0.05, W * 0.38, H * 0.45, WARM, 0.2, "lighter");
  // the wall's foot, in shadow
  const f = ctx.createLinearGradient(0, floorY - H * 0.08, 0, floorY);
  f.addColorStop(0, "rgba(0,0,0,0)");
  f.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = f;
  ctx.fillRect(0, floorY - H * 0.08, W, H * 0.08);
}

// The window: a deep splayed embrasure with a round head, its sill lit by
// the moon, an iron grille five squares by five, and the night beyond — the
// moon, a few stars, the tops of far trees. Two 1s scratched on the stone.
function paintWindow(ctx, L) {
  const { u } = L;
  const { x0, y0, x1, y1, w, h } = L.win;
  const rev = w * 0.2;
  const m = { x0: x0 - rev, x1: x1 + rev, y0: y0 - rev * 0.9, y1: y1 + rev * 0.7 };
  const arch = (box, lift) => {
    ctx.beginPath();
    ctx.moveTo(box.x0, box.y1);
    ctx.lineTo(box.x0, box.y0 + lift);
    ctx.quadraticCurveTo((box.x0 + box.x1) / 2, box.y0 - lift, box.x1, box.y0 + lift);
    ctx.lineTo(box.x1, box.y1);
    ctx.closePath();
  };
  // the embrasure's mouth and its faces: the left in shadow, the sill lit
  soft(ctx, (m.x0 + m.x1) / 2 + rev * 0.3, (m.y0 + m.y1) / 2 + rev * 0.4, (m.x1 - m.x0) * 0.62, (m.y1 - m.y0) * 0.6, "0,0,0", 0.5);
  arch(m, rev * 0.6);
  ctx.fillStyle = "#1a1e28";
  ctx.fill();
  polygon(ctx, [[m.x0, m.y1], [x0, y1], [x1, y1], [m.x1, m.y1]]);
  const sill = ctx.createLinearGradient(0, y1, 0, m.y1);
  sill.addColorStop(0, "#5a6680");
  sill.addColorStop(1, "#3a4258");
  ctx.fillStyle = sill;
  ctx.fill();
  polygon(ctx, [[m.x1, m.y0 + rev * 0.6], [x1, y0], [x1, y1], [m.x1, m.y1]]);
  ctx.fillStyle = "#2c3446";
  ctx.fill();
  polygon(ctx, [[m.x0, m.y0 + rev * 0.6], [x0, y0], [x0, y1], [m.x0, m.y1]]);
  ctx.fillStyle = "#141820";
  ctx.fill();
  // the stone arch over it, its voussoirs
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = Math.max(1.5, 2.4 * u);
  arch({ x0: m.x0 - rev * 0.35, x1: m.x1 + rev * 0.35, y0: m.y0 - rev * 0.35, y1: m.y1 }, rev * 0.7);
  ctx.stroke();
  ctx.strokeStyle = "rgba(190,205,235,0.12)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  arch(m, rev * 0.6);
  ctx.stroke();
  // the night beyond
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, "#050a1c");
  sky.addColorStop(0.7, "#132650");
  sky.addColorStop(1, "#1e3866");
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, w, h);
  const rnd = lcg(7319);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(230,236,255,${(0.35 + rnd() * 0.55).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x0 + rnd() * w, y0 + rnd() * h * 0.7, (0.5 + rnd() * 0.8) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  const moon = createMoonCanvas();
  const mr = w * 0.36;
  ctx.drawImage(moon, x0 + w * 0.7 - mr / 2, y0 + h * 0.28 - mr / 2, mr, mr);
  // treetops far below, dark against the sky
  ctx.fillStyle = "#070b16";
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  for (let i = 0; i <= 10; i++) {
    const tx = x0 + (w * i) / 10;
    ctx.lineTo(tx, y1 - h * (0.1 + 0.07 * Math.sin(i * 1.9) + 0.04 * Math.sin(i * 4.3)));
  }
  ctx.lineTo(x1, y1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // the grille: five squares by five, solid iron, rivets where bars cross
  const bar = Math.max(3, w * 0.035);
  ctx.fillStyle = "#0a0b10";
  for (let i = 0; i <= 5; i++) {
    ctx.fillRect(x0 + (w * i) / 5 - bar / 2, y0 - bar / 2, bar, h + bar);
    ctx.fillRect(x0 - bar / 2, y0 + (h * i) / 5 - bar / 2, w + bar, bar);
  }
  ctx.fillStyle = "rgba(170,190,230,0.32)";
  for (let i = 0; i <= 5; i++) {
    ctx.fillRect(x0 + (w * i) / 5 + bar / 2 - 1, y0, 1, h);
    ctx.fillRect(x0, y0 + (h * i) / 5 + bar / 2 - 1, w, 1);
  }
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      ctx.fillStyle = "#1a1c24";
      ctx.beginPath();
      ctx.arc(x0 + (w * i) / 5, y0 + (h * j) / 5, bar * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(190,205,235,0.4)";
      ctx.beginPath();
      ctx.arc(x0 + (w * i) / 5 - bar * 0.18, y0 + (h * j) / 5 - bar * 0.18, bar * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the two scratched 1s: over the first column, beside the first row
  const one = (cx, cy, sz, tilt) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.lineCap = "round";
    for (const [col, lw, dx] of [
      ["rgba(0,0,0,0.6)", 2.4, 0.6],
      ["rgba(205,214,232,0.75)", 1.3, 0],
    ]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw * u;
      ctx.beginPath();
      ctx.moveTo(dx - sz * 0.22, -sz * 0.3);
      ctx.lineTo(dx, -sz * 0.5);
      ctx.lineTo(dx, sz * 0.5);
      ctx.moveTo(dx - sz * 0.2, sz * 0.5);
      ctx.lineTo(dx + sz * 0.2, sz * 0.5);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineCap = "butt";
  };
  const sz = Math.max(9, w * 0.075);
  one(x0 + w / 10, y0 - rev * 0.45, sz, -0.07);
  one(x0 - rev * 0.45, y0 + h / 10, sz, 0.05);
}

// The floor: big flagstones running toward us, dark, worn smooth.
function paintFloor(ctx, L) {
  const { W, H, u, floorY, vp } = L;
  const g = ctx.createLinearGradient(0, floorY, 0, H);
  g.addColorStop(0, "#161a22");
  g.addColorStop(1, "#262a34");
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = Math.max(1, 1.4 * u);
  const k = (H - vp.y) / (floorY - vp.y);
  for (let i = -10; i <= 10; i++) {
    const xb = vp.x + i * W * 0.085;
    ctx.beginPath();
    ctx.moveTo(xb, floorY);
    ctx.lineTo(vp.x + (xb - vp.x) * k, H);
    ctx.stroke();
  }
  for (const f of [0.18, 0.42, 0.72]) {
    const y = floorY + (H - floorY) * f;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(190,205,235,0.04)";
  for (const f of [0.18, 0.42, 0.72]) ctx.fillRect(0, floorY + (H - floorY) * f + 1.5, W, 1);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, floorY - 1, W, Math.max(2, 3 * u));
}

// The moonlight: a faint shaft through the room, and on the floor the
// window's grille laid down in light, five by five.
function paintMoonlight(ctx, L) {
  const { H, floorY } = L;
  const { x0, x1, w } = L.win;
  const yN = floorY + (H - floorY) * 0.8; // the patch's near edge
  const yF = floorY + (H - floorY) * 0.14; // and far
  const A = { x: x0 + w * 0.75, y: yN };
  const B = { x: x1 + w * 1.6, y: yN };
  const C = { x: x1 + w * 1.05, y: yF };
  const D = { x: x0 + w * 0.5, y: yF };
  // a point of the patch, from the window's square (u across, v down)
  const at = (u, v) => {
    const top = { x: D.x + (C.x - D.x) * u, y: D.y };
    const bot = { x: A.x + (B.x - A.x) * u, y: A.y };
    // light through the window's top lands nearest us
    const t = 1 - v;
    return { x: top.x + (bot.x - top.x) * t, y: top.y + (bot.y - top.y) * t };
  };
  // the shaft through the air
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  polygon(ctx, [[x0, L.win.y0], [x1, L.win.y0], B, A]);
  const g = ctx.createLinearGradient(0, L.win.y0, 0, yN);
  g.addColorStop(0, `rgba(${MOON},0.11)`);
  g.addColorStop(1, `rgba(${MOON},0.04)`);
  ctx.fillStyle = g;
  ctx.fill();
  polygon(ctx, [[x0, L.win.y1], [x1, L.win.y1], C, D]);
  ctx.fillStyle = `rgba(${MOON},0.035)`;
  ctx.fill();
  // the squares of light between the bars' shadows
  const b = 0.05;
  ctx.filter = "blur(1.5px)";
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const u0 = i / 5 + b / 2;
      const u1 = (i + 1) / 5 - b / 2;
      const v0 = j / 5 + b / 2;
      const v1 = (j + 1) / 5 - b / 2;
      polygon(ctx, [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
      ctx.fillStyle = `rgba(${MOON},0.17)`;
      ctx.fill();
    }
  }
  ctx.filter = "none";
  ctx.restore();
  ctx.save();
  ctx.filter = "blur(8px)";
  soft(ctx, (A.x + C.x) / 2, (A.y + C.y) / 2, (B.x - A.x) * 0.7, (yN - yF) * 0.8, MOON, 0.08, "lighter");
  ctx.restore();
  ctx.filter = "none";
}

// The message stone: one great smooth slab set into the coursing, its edges
// worn round, the candle's light warm across it — and the six lines of marks
// cut into it, each two clusters: the row, then the column.
function paintSlab(ctx, L) {
  const { u } = L;
  const s = L.slab;
  const r = Math.min(s.w, s.h) * 0.05;
  soft(ctx, s.x0 + s.w / 2 + 6 * u, s.y0 + s.h / 2 + 8 * u, s.w * 0.58, s.h * 0.56, "0,0,0", 0.55);
  ctx.fillStyle = "#07080c";
  ctx.beginPath();
  ctx.roundRect(s.x0 - 5 * u, s.y0 - 5 * u, s.w + 10 * u, s.h + 10 * u, r * 1.3);
  ctx.fill();
  const g = ctx.createLinearGradient(s.x0, s.y0, s.x0 + s.w, s.y0 + s.h);
  g.addColorStop(0, "#343a4a");
  g.addColorStop(0.55, "#45434a");
  g.addColorStop(1, "#5a4a3c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(s.x0, s.y0, s.w, s.h, r);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // its worn face: soft mottling, a lit top edge, the candle's warmth
  const rnd = lcg(5115);
  for (let i = 0; i < 14; i++) {
    soft(ctx, s.x0 + rnd() * s.w, s.y0 + rnd() * s.h, s.w * (0.08 + rnd() * 0.14), s.h * (0.05 + rnd() * 0.1), rnd() < 0.5 ? "0,0,0" : "220,215,200", 0.07);
  }
  ctx.fillStyle = "rgba(220,225,240,0.14)";
  ctx.fillRect(s.x0, s.y0, s.w, Math.max(2, 3 * u));
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(s.x0, s.y0 + s.h - Math.max(3, 4 * u), s.w, Math.max(3, 4 * u));
  soft(ctx, s.x0 + s.w, s.y0 + s.h * 0.8, s.w * 0.9, s.h * 0.75, WARM, 0.22, "lighter");
  ctx.restore();
  // a chiselled bevel round its face: lit along the top and right
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = Math.max(2, 3 * u);
  ctx.beginPath();
  ctx.roundRect(s.x0 + 7 * u, s.y0 + 7 * u, s.w - 14 * u, s.h - 14 * u, r * 0.8);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,180,0.12)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.beginPath();
  ctx.roundRect(s.x0 + 9 * u, s.y0 + 9 * u, s.w - 18 * u, s.h - 18 * u, r * 0.7);
  ctx.stroke();
  // the marks, line by line, centred on the stone
  const top = s.y0 + s.lineH * 0.9;
  for (let i = 0; i < s.n; i++) {
    const pair = tapPair(TAP_WORD[i]);
    if (!pair) continue;
    const [row, col] = pair;
    const y = top + i * s.lineH;
    const mr = lcg(7000 + i * 53);
    const total = (row - 1) * s.gap + s.clusterGap + (col - 1) * s.gap;
    let x = s.cx - total / 2;
    for (let k = 0; k < row; k++) {
      carve(ctx, mr, x, y, s.markH, u);
      x += s.gap;
    }
    x += s.clusterGap - s.gap;
    for (let k = 0; k < col; k++) {
      carve(ctx, mr, x, y, s.markH, u);
      x += s.gap;
    }
  }
}

// one mark cut in the stone: a dark groove, its lip lit by the candle on the
// right, a little stone dust at its foot
function carve(ctx, rnd, x, y, h, u) {
  const lean = (rnd() - 0.5) * 3 * u;
  const a = { x: x - lean, y: y - h / 2 };
  const b = { x: x + lean, y: y + h / 2 };
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(10,10,14,0.92)";
  ctx.lineWidth = Math.max(2.4, 3.6 * u);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,214,160,0.55)";
  ctx.lineWidth = Math.max(0.8, 1.1 * u);
  ctx.beginPath();
  ctx.moveTo(a.x + 2 * u, a.y + 2 * u);
  ctx.lineTo(b.x + 2 * u, b.y - 1 * u);
  ctx.stroke();
  ctx.lineCap = "butt";
  soft(ctx, b.x + 1 * u, b.y + 3 * u, 4 * u, 1.6 * u, "210,205,190", 0.25);
}

// The door: oak planks under a round head, two iron straps riveted across,
// a little barred grate, a ring and keyhole; light from the passage under it.
function paintDoor(ctx, L) {
  const { u, floorY } = L;
  const d = L.door;
  const w = d.x1 - d.x0;
  const head = w * 0.5;
  const path = (k) => {
    ctx.beginPath();
    ctx.moveTo(d.x0 - k, floorY);
    ctx.lineTo(d.x0 - k, d.top + head);
    ctx.arc((d.x0 + d.x1) / 2, d.top + head, w / 2 + k, Math.PI, 0);
    ctx.lineTo(d.x1 + k, floorY);
    ctx.closePath();
  };
  path(w * 0.09);
  ctx.fillStyle = "#0c0e14";
  ctx.fill();
  path(0);
  ctx.save();
  ctx.clip();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const px = d.x0 + (w * i) / n;
    const k = 0.85 + ((i * 37) % 10) / 40;
    const g = ctx.createLinearGradient(px, 0, px + w / n, 0);
    g.addColorStop(0, rgb(70 * k, 44 * k, 26 * k));
    g.addColorStop(0.5, rgb(96 * k, 62 * k, 36 * k));
    g.addColorStop(1, rgb(58 * k, 36 * k, 20 * k));
    ctx.fillStyle = g;
    ctx.fillRect(px, d.top, w / n, floorY - d.top);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(px, d.top, Math.max(1, 1.4 * u), floorY - d.top);
  }
  // the iron straps and their rivets
  for (const f of [0.38, 0.8]) {
    const y = d.top + (floorY - d.top) * f;
    ctx.fillStyle = "#16171c";
    ctx.fillRect(d.x0, y, w, 9 * u);
    ctx.fillStyle = "rgba(200,205,220,0.18)";
    ctx.fillRect(d.x0, y, w, 1.5 * u);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "#2a2c34";
      ctx.beginPath();
      ctx.arc(d.x0 + w * (0.08 + i * 0.168), y + 4.5 * u, 2.2 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the grate, warm from the passage beyond
  const gx = (d.x0 + d.x1) / 2;
  const gy = d.top + head * 1.2;
  const gw = w * 0.36;
  const gh = gw * 0.75;
  ctx.fillStyle = "#e8a858";
  ctx.fillRect(gx - gw / 2, gy, gw, gh);
  soft(ctx, gx, gy + gh / 2, gw * 0.7, gh * 0.7, "255,230,170", 0.6, "lighter");
  ctx.fillStyle = "#121318";
  for (let i = 0; i <= 3; i++) ctx.fillRect(gx - gw / 2 + (gw * i) / 3 - 1.5 * u, gy, 3 * u, gh);
  ctx.strokeStyle = "#121318";
  ctx.lineWidth = 3 * u;
  ctx.strokeRect(gx - gw / 2, gy, gw, gh);
  ctx.restore();
  // ring, keyhole, the light under it
  const ry = d.top + (floorY - d.top) * 0.6;
  ctx.strokeStyle = "#2a2c34";
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.arc(d.x0 + w * 0.2, ry, 8 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#08080a";
  ctx.beginPath();
  ctx.arc(d.x0 + w * 0.2, ry + 22 * u, 3 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(d.x0 + w * 0.2 - 1.2 * u, ry + 22 * u, 2.4 * u, 7 * u);
  ctx.fillStyle = "rgba(255,200,120,0.55)";
  ctx.fillRect(d.x0, floorY - 2 * u, w, 2 * u);
  soft(ctx, (d.x0 + d.x1) / 2, floorY + 6 * u, w * 0.7, 10 * u, WARM, 0.25, "lighter");
}

// The cot under the window: a low wooden frame, a straw mattress, a patched
// red blanket thrown over it, a rolled pillow; in the moonlight.
function paintCot(ctx, L) {
  const { u, floorY } = L;
  const c = L.cot;
  const top = floorY - 64 * u;
  const w = c.x1 - c.x0;
  soft(ctx, (c.x0 + c.x1) / 2, floorY + 4 * u, w * 0.6, 10 * u, "0,0,0", 0.6);
  // legs and rail
  ctx.fillStyle = "#3a2414";
  for (const x of [c.x0 + 6 * u, c.x1 - 14 * u]) ctx.fillRect(x, top + 30 * u, 8 * u, floorY - top - 30 * u);
  const rail = ctx.createLinearGradient(0, top + 26 * u, 0, top + 42 * u);
  rail.addColorStop(0, "#7a5230");
  rail.addColorStop(1, "#3a2414");
  ctx.fillStyle = rail;
  ctx.fillRect(c.x0, top + 26 * u, w, 16 * u);
  // the straw mattress
  const mg = ctx.createLinearGradient(0, top, 0, top + 30 * u);
  mg.addColorStop(0, "#7e6a44");
  mg.addColorStop(1, "#4a3c24");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.roundRect(c.x0 + 2 * u, top + 4 * u, w - 4 * u, 26 * u, 12 * u);
  ctx.fill();
  const rnd = lcg(4242);
  ctx.strokeStyle = "rgba(200,170,110,0.3)";
  ctx.lineWidth = Math.max(0.8, u);
  for (let i = 0; i < 26; i++) {
    const x = c.x0 + rnd() * w;
    const y = top + 4 * u + rnd() * 24 * u;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 18 * u, y + (rnd() - 0.3) * 6 * u);
    ctx.stroke();
  }
  // the pillow
  ctx.fillStyle = "#86807a";
  ctx.beginPath();
  ctx.ellipse(c.x0 + 36 * u, top + 2 * u, 30 * u, 13 * u, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(c.x0 + 40 * u, top + 8 * u, 24 * u, 6 * u, -0.08, 0, Math.PI * 2);
  ctx.fill();
  // the blanket, draped over the far end and down the side
  const bx0 = c.x0 + w * 0.36;
  ctx.beginPath();
  ctx.moveTo(bx0, top + 2 * u);
  ctx.quadraticCurveTo(bx0 + w * 0.3, top - 6 * u, c.x1 - 4 * u, top + 4 * u);
  ctx.lineTo(c.x1 + 2 * u, top + 52 * u);
  ctx.quadraticCurveTo(bx0 + w * 0.4, top + 58 * u, bx0 + w * 0.06, top + 46 * u);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, top, 0, top + 56 * u);
  bg.addColorStop(0, "#6a2e30");
  bg.addColorStop(1, "#341416");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // patches, stitched
  for (const [fx, fy, pw, ph, col] of [
    [0.45, 0.25, 34, 20, "#323c48"],
    [0.72, 0.45, 30, 22, "#6e5c3c"],
    [0.55, 0.62, 26, 16, "#384432"],
  ]) {
    const px = bx0 + (c.x1 - bx0) * (fx - 0.36) / 0.64;
    const py = top + 56 * u * fy;
    ctx.fillStyle = col;
    ctx.fillRect(px, py, pw * u, ph * u);
    ctx.setLineDash([3 * u, 3 * u]);
    ctx.strokeStyle = "rgba(200,190,170,0.3)";
    ctx.lineWidth = Math.max(0.8, u);
    ctx.strokeRect(px + 2 * u, py + 2 * u, pw * u - 4 * u, ph * u - 4 * u);
    ctx.setLineDash([]);
  }
  // the moon along its top
  soft(ctx, bx0 + w * 0.3, top, w * 0.4, 14 * u, MOON, 0.25, "lighter");
  ctx.restore();
}

// a three-legged stool, the candle's saucer on it
function paintStool(ctx, L) {
  const { u, floorY } = L;
  const x = L.stool.x;
  const seat = floorY - 72 * u;
  soft(ctx, x + 6 * u, floorY + 2 * u, 46 * u, 8 * u, "0,0,0", 0.6);
  ctx.strokeStyle = "#4a2e18";
  ctx.lineWidth = 6 * u;
  ctx.lineCap = "round";
  for (const d of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * 18 * u, seat + 4 * u);
    ctx.lineTo(x + d * 30 * u, floorY + (d === 0 ? 4 : -1) * u);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(x, seat + 4 * u, 36 * u, 9 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x - 36 * u, 0, x + 36 * u, 0);
  g.addColorStop(0, "#6a4022");
  g.addColorStop(0.6, "#a06a3a");
  g.addColorStop(1, "#5a3418");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, seat, 36 * u, 9 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  // the candle in its saucer, wax run down
  const cy = L.candle.y;
  ctx.fillStyle = "#8a6a2a";
  ctx.beginPath();
  ctx.ellipse(x, seat - 2 * u, 15 * u, 4 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  const cg = ctx.createLinearGradient(x - 7 * u, 0, x + 7 * u, 0);
  cg.addColorStop(0, "#d8c49a");
  cg.addColorStop(0.4, "#fff4d8");
  cg.addColorStop(1, "#b09870");
  ctx.fillStyle = cg;
  ctx.fillRect(x - 7 * u, cy, 14 * u, seat - 3 * u - cy);
  ctx.fillStyle = "#fff8e6";
  ctx.beginPath();
  ctx.ellipse(x, cy, 7 * u, 2.2 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + 2 * u, cy, 3 * u, 14 * u, 1.5 * u);
  ctx.fill();
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + 0.5 * u, cy - 4 * u);
  ctx.stroke();
}

// a dented tin cup on the floor by the cot
function paintCup(ctx, L) {
  const { u, floorY } = L;
  const x = L.cot.x1 + 26 * u;
  const y = floorY + 30 * u;
  soft(ctx, x + 4 * u, y + 2 * u, 16 * u, 4 * u, "0,0,0", 0.6);
  const g = ctx.createLinearGradient(x - 10 * u, 0, x + 10 * u, 0);
  g.addColorStop(0, "#5a6070");
  g.addColorStop(0.35, "#c8d0dc");
  g.addColorStop(1, "#4a505c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 10 * u, y - 22 * u);
  ctx.lineTo(x + 10 * u, y - 22 * u);
  ctx.lineTo(x + 9 * u, y);
  ctx.lineTo(x - 9 * u, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2a2e38";
  ctx.beginPath();
  ctx.ellipse(x, y - 22 * u, 10 * u, 3 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a92a0";
  ctx.lineWidth = 2.4 * u;
  ctx.beginPath();
  ctx.arc(x + 12 * u, y - 12 * u, 5 * u, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
}

// The last prisoner, long since bones: slumped against the wall under the
// window, knees drawn up, one wrist still in the shackle bolted to the stone,
// the other arm fallen across a knee, the skull sunk on the chest. Old bone,
// stained and dull, lit only by the moon on the window side.
function paintSkeleton(ctx, L) {
  const { x, s: k } = L.skel;
  const y = L.floorY - 3 * k;
  const P = (dx, dy) => [x + dx * k, y + dy * k];
  const BONE = [168, 156, 128];
  const tone = (m) => rgb(BONE[0] * m, BONE[1] * m, BONE[2] * m);
  // a long bone: a shaft that narrows in the middle, swelling to its ends,
  // lit on the side toward the moon
  const bone = (a, b, w, m = 1) => {
    const [ax, ay] = P(...a);
    const [bx, by] = P(...b);
    const ang = Math.atan2(by - ay, bx - ax);
    const len = Math.hypot(bx - ax, by - ay);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    const hw = (w * k) / 2;
    const g = ctx.createLinearGradient(0, -hw * 1.6, 0, hw * 1.6);
    g.addColorStop(0, tone(1.05 * m));
    g.addColorStop(0.5, tone(0.8 * m));
    g.addColorStop(1, tone(0.42 * m));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -hw * 1.25);
    ctx.quadraticCurveTo(len * 0.5, -hw * 0.55, len, -hw * 1.25);
    ctx.quadraticCurveTo(len + hw * 1.3, 0, len, hw * 1.25);
    ctx.quadraticCurveTo(len * 0.5, hw * 0.55, 0, hw * 1.25);
    ctx.quadraticCurveTo(-hw * 1.3, 0, 0, -hw * 1.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(20,16,10,0.55)";
    ctx.lineWidth = Math.max(0.6, 0.7 * k);
    ctx.stroke();
    // the knuckle of the joint at each end
    ctx.fillStyle = "rgba(30,24,16,0.35)";
    for (const ex of [0, len]) {
      ctx.beginPath();
      ctx.ellipse(ex, hw * 0.3, hw * 0.5, hw * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  // its shadow on the floor and the wall behind
  soft(ctx, x + 6 * k, y + 2 * k, 58 * k, 9 * k, "0,0,0", 0.7);
  soft(ctx, x - 2 * k, y - 66 * k, 46 * k, 76 * k, "0,0,0", 0.45);
  // the shackle's bolt in the wall, the chain down to the wrist
  const [bx, by] = P(-34, -168);
  ctx.fillStyle = "#14151a";
  ctx.beginPath();
  ctx.arc(bx, by, 6 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(150,165,195,0.25)";
  ctx.beginPath();
  ctx.arc(bx - 1.5 * k, by - 1.5 * k, 2 * k, 0, Math.PI * 2);
  ctx.fill();
  soft(ctx, bx, by + 14 * k, 4 * k, 22 * k, "60,40,20", 0.35); // rust run down the stone
  for (let i = 0; i < 4; i++) {
    const [cx, cy] = P(-34 - i * 0.4, -161 + i * 4.6);
    const along = i % 2 === 0;
    for (const [col, lw] of [
      ["#0e0f12", 3.4],
      ["#4e4a46", 1.6],
    ]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw * k;
      ctx.beginPath();
      ctx.ellipse(cx, cy, (along ? 2.4 : 1.2) * k, 3.4 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // the spine, slumped against the wall: small vertebrae, each in shadow below
  for (let i = 0; i < 12; i++) {
    const [vx, vy] = P(-3 + i * 0.35, -30 - i * 5.4);
    ctx.fillStyle = tone(0.35);
    ctx.beginPath();
    ctx.ellipse(vx, vy + 1.2 * k, 3.4 * k, 2.2 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tone(0.72 + (i % 3) * 0.06);
    ctx.beginPath();
    ctx.ellipse(vx, vy, 3 * k, 1.8 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the ribs: six thin pairs curving round from the spine
  const [rx, ry] = P(0, -76);
  for (let i = 0; i < 6; i++) {
    const yy = ry - 16 * k + i * 5.6 * k;
    const rw = (13 - Math.abs(i - 2) * 1.3) * k;
    for (const d of [-1, 1]) {
      ctx.strokeStyle = "rgba(14,10,6,0.7)";
      ctx.lineWidth = 2.6 * k;
      ctx.beginPath();
      ctx.moveTo(rx + d * 2 * k, yy - 2 * k);
      ctx.bezierCurveTo(rx + d * rw * 1.25, yy - 3 * k, rx + d * rw * 1.3, yy + 6 * k, rx + d * rw * 0.45, yy + 8 * k);
      ctx.stroke();
      ctx.strokeStyle = tone(d < 0 ? 0.95 : 0.62);
      ctx.lineWidth = 1.5 * k;
      ctx.stroke();
    }
  }
  ctx.fillStyle = tone(0.7);
  ctx.beginPath();
  ctx.moveTo(rx - 2 * k, ry - 18 * k);
  ctx.lineTo(rx + 2 * k, ry - 18 * k);
  ctx.lineTo(rx + 1.4 * k, ry + 6 * k);
  ctx.lineTo(rx - 1.4 * k, ry + 6 * k);
  ctx.closePath();
  ctx.fill();
  // the pelvis: two winged hip bones round the base of the spine
  const [px, py] = P(0, -24);
  for (const d of [-1, 1]) {
    ctx.fillStyle = tone(0.35);
    ctx.beginPath();
    ctx.ellipse(px + d * 7 * k, py - 1 * k, 8.5 * k, 4.6 * k, d * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tone(d < 0 ? 0.88 : 0.6);
    ctx.beginPath();
    ctx.ellipse(px + d * 7 * k, py - 1.6 * k, 7.6 * k, 3.8 * k, d * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(10,8,6,0.8)";
    ctx.beginPath();
    ctx.ellipse(px + d * 4.5 * k, py + 0.5 * k, 1.8 * k, 2 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // collarbones, the chained arm raised to the shackle, its hand hanging
  bone([-18, -94], [-2, -90], 2.4, 0.9);
  bone([2, -90], [16, -93], 2.4, 0.7);
  bone([-19, -94], [-31, -122], 3.4);
  bone([-31, -122], [-33, -144], 2.8);
  const [wx, wy] = P(-33, -146);
  ctx.fillStyle = "#0e0f12";
  ctx.beginPath();
  ctx.roundRect(wx - 7 * k, wy - 3.6 * k, 14 * k, 7.2 * k, 2 * k);
  ctx.fill();
  ctx.fillStyle = "#4a4640";
  ctx.fillRect(wx - 5.5 * k, wy - 2.6 * k, 11 * k, 1.5 * k);
  for (const d of [-3, -1, 1, 3]) bone([-33 + d * 0.9, -150], [-33 + d * 1.3, -158 + Math.abs(d) * 0.8], 1.3, 0.85);
  // the skull, sunk forward on the chest: the cranium, the cheekbones, deep
  // sockets, the nose's hollow, the upper teeth, the jaw fallen a little open
  const [sx, sy] = P(6, -106);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(0.55);
  const sk = ctx.createRadialGradient(-5 * k, -6 * k, 1 * k, 0, 0, 15 * k);
  sk.addColorStop(0, tone(1.05));
  sk.addColorStop(0.65, tone(0.76));
  sk.addColorStop(1, tone(0.4));
  ctx.fillStyle = "rgba(10,8,6,0.6)";
  ctx.beginPath();
  ctx.ellipse(0.8 * k, 0.8 * k, 12.5 * k, 13.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = sk;
  ctx.beginPath();
  ctx.ellipse(0, -2 * k, 11.5 * k, 12.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // the face: narrower, the cheekbones flaring
  ctx.beginPath();
  ctx.moveTo(-9.5 * k, 2 * k);
  ctx.lineTo(-10.5 * k, 7 * k);
  ctx.lineTo(-6 * k, 12.5 * k);
  ctx.lineTo(6 * k, 12.5 * k);
  ctx.lineTo(10.5 * k, 7 * k);
  ctx.lineTo(9.5 * k, 2 * k);
  ctx.closePath();
  ctx.fill();
  // the sockets: deep, a little irregular, darkest at the top
  ctx.fillStyle = "#0a0806";
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * 1.5 * k, 1 * k);
    ctx.quadraticCurveTo(d * 3 * k, -2.5 * k, d * 7.5 * k, -1.5 * k);
    ctx.quadraticCurveTo(d * 9 * k, 2.5 * k, d * 7 * k, 6 * k);
    ctx.quadraticCurveTo(d * 3.5 * k, 7 * k, d * 1.5 * k, 4.5 * k);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, 6 * k);
  ctx.lineTo(1.8 * k, 9.5 * k);
  ctx.lineTo(0, 10.2 * k);
  ctx.lineTo(-1.8 * k, 9.5 * k);
  ctx.closePath();
  ctx.fill();
  // the upper teeth
  ctx.fillStyle = tone(0.9);
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.roundRect(i * 1.55 * k - 0.65 * k, 11.8 * k, 1.3 * k, 2.6 * k, 0.4 * k);
    ctx.fill();
  }
  // the jaw, hanging a little open
  ctx.fillStyle = tone(0.55);
  ctx.beginPath();
  ctx.moveTo(-8.5 * k, 9 * k);
  ctx.quadraticCurveTo(-7 * k, 19 * k, 0, 19.5 * k);
  ctx.quadraticCurveTo(7 * k, 19 * k, 8.5 * k, 9 * k);
  ctx.lineTo(6 * k, 11 * k);
  ctx.quadraticCurveTo(0, 16.5 * k, -6 * k, 11 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone(0.7);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.roundRect(i * 1.55 * k - 0.6 * k, 14.6 * k, 1.2 * k, 2 * k, 0.4 * k);
    ctx.fill();
  }
  // a crack across the crown, the stains of years
  ctx.strokeStyle = "rgba(30,20,12,0.55)";
  ctx.lineWidth = Math.max(0.6, 0.7 * k);
  ctx.beginPath();
  ctx.moveTo(-4 * k, -13 * k);
  ctx.lineTo(-1 * k, -9 * k);
  ctx.lineTo(-2.5 * k, -6 * k);
  ctx.stroke();
  soft(ctx, 4 * k, -6 * k, 6 * k, 5 * k, "70,50,26", 0.35);
  ctx.restore();
  // the legs, knees drawn up, and the bones of the feet
  bone([-8, -22], [-21, -55], 4.2);
  bone([-21, -55], [-25, -6], 3.4, 0.85);
  bone([8, -22], [28, -53], 4.2, 0.75);
  bone([28, -53], [37, -6], 3.4, 0.62);
  for (const [fx, d, m] of [
    [-25, -1, 0.85],
    [37, 1, 0.6],
  ]) {
    for (let t = 0; t < 4; t++) bone([fx, -5], [fx + d * (9 + t), -1 + t * 1.2], 1.4, m);
  }
  // the free arm, fallen across the right knee, its fingers hanging
  bone([16, -93], [24, -62], 3.2, 0.7);
  bone([24, -62], [40, -54], 2.6, 0.62);
  for (let t = 0; t < 4; t++) bone([40, -54], [44 + t * 0.8, -46 + t * 0.6], 1.2, 0.62);
  // the moon on its window side; the rest in the cell's dark
  soft(ctx, x - 16 * k, y - 84 * k, 26 * k, 66 * k, MOON, 0.12, "lighter");
  soft(ctx, x + 22 * k, y - 50 * k, 30 * k, 60 * k, "0,0,0", 0.25);
}

// the candle's light over everything near it
function paintCandleLight(ctx, L) {
  const { W, H, floorY } = L;
  const c = L.candle;
  soft(ctx, c.x, floorY + H * 0.06, W * 0.22, H * 0.09, WARM, 0.28, "lighter");
  soft(ctx, c.x, c.y, W * 0.12, H * 0.16, WARM, 0.18, "lighter");
}

// the candle's flame: white heart, gold, a touch of orange; origin at its foot
function paintFlame() {
  const w = 32;
  const h = 72;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const path = (k) => {
    g.beginPath();
    g.moveTo(w / 2, h * (0.02 + (1 - k) * 0.3));
    g.bezierCurveTo(w * (0.5 + 0.42 * k), h * 0.45, w * (0.5 + 0.38 * k), h * 0.98, w / 2, h * 0.98);
    g.bezierCurveTo(w * (0.5 - 0.38 * k), h * 0.98, w * (0.5 - 0.42 * k), h * 0.45, w / 2, h * (0.02 + (1 - k) * 0.3));
    g.closePath();
  };
  path(1);
  const og = g.createLinearGradient(0, 0, 0, h);
  og.addColorStop(0, "rgba(255,120,40,0)");
  og.addColorStop(0.35, "rgba(255,150,50,0.85)");
  og.addColorStop(1, "rgba(255,190,90,0.95)");
  g.fillStyle = og;
  g.fill();
  path(0.6);
  g.fillStyle = "rgba(255,236,170,0.95)";
  g.fill();
  path(0.3);
  g.fillStyle = "#fffdf4";
  g.fill();
  return c;
}

// The cold air of the cell: mist lying low along the floor, thickest where
// the moon shines through it, thinning up the walls; the room sunk in dark.
function paintFog(ctx, L) {
  const { W, H, floorY } = L;
  ctx.fillStyle = "rgba(4,6,10,0.28)";
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(9090);
  for (let i = 0; i < 16; i++) {
    const fx = W * rnd();
    const fy = floorY + (H - floorY) * (rnd() * 0.8 - 0.25);
    soft(ctx, fx, fy, W * (0.12 + rnd() * 0.18), H * (0.03 + rnd() * 0.05), "100,112,130", 0.06 + rnd() * 0.05);
  }
  const g = ctx.createLinearGradient(0, floorY - H * 0.25, 0, H);
  g.addColorStop(0, "rgba(110,122,142,0)");
  g.addColorStop(0.45, "rgba(100,112,130,0.07)");
  g.addColorStop(1, "rgba(70,80,96,0.1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY - H * 0.25, W, H);
  // the shaft's mist, lit
  soft(ctx, L.win.x1 + L.win.w * 0.4, floorY + (H - floorY) * 0.3, L.win.w * 1.8, (H - floorY) * 0.4, MOON, 0.12, "lighter");
}

// a bank of fog, soft-edged, for the scene to drift across the room
function paintFogBank() {
  const w = 512;
  const h = 160;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const rnd = lcg(3131);
  for (let i = 0; i < 40; i++) {
    const x = w * (0.1 + rnd() * 0.8);
    const y = h * (0.35 + rnd() * 0.35);
    soft(g, x, y, w * (0.08 + rnd() * 0.14), h * (0.12 + rnd() * 0.18), "120,130,148", 0.14);
  }
  return c;
}
