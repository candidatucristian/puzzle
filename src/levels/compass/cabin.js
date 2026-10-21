import { paintEnvelope } from "../../shared/envelope.js";
import { paintHurricaneLantern } from "../../shared/hurricaneLantern.js";
import { paintCabinPhotography, paintPhotographicCompass, paintPhotographicLantern } from "./photographicCabin.js";

/** The captain's enclosed timber cabin: solid oak hull and stern walls,
 *  curved ribs and low deck beams, lit by a swinging lantern and a candle.
 *  The compass, its needle, the lantern and the sealed map stay separate
 *  from the background so their animation and interactions remain live.
 *  The chart table uses one-point perspective; the compass faces us so
 *  north, east, south and west read as up, right, down and left. */

export const MAP_FONT = '"Architects Daughter", "Special Elite", cursive';
const K = {
  room: "cp_room",
  body: "cp_body",
  needle: "cp_needle",
  shade: "cp_needle_shadow",
  glass: "cp_glass",
  lantern: "cp_lantern",
  flame: "cp_flame",
  glow: "cp_glow",
  letter: "cp_letter",
  marks: "cp_marks",
  folded: "cp_folded",
};
const WARM = "255,186,100";
const GOLD = "232,184,96";
const R = 2; // the small things are painted at twice their size

// the telescope's gold: bright where it catches the light, deep in shadow
function gold(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#fff0b8");
  g.addColorStop(0.28, "#e8c06a");
  g.addColorStop(0.6, "#a8782e");
  g.addColorStop(1, "#4a3010");
  return g;
}

// ── where everything is ─────────────────────────────────────────────────────

export function layoutCabin(W, H) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, S, u };
  L.vp = { x: W / 2, y: H * 0.3 }; // the eye's height
  L.f = H * 0.88;
  L.ceilY = -0.62 * H;
  L.floorY = 1.1 * H;
  L.hull = { floor: 0.72 * W, ceil: 0.86 * W, cx: 1.21 * W, cy: 0.06 * H };
  L.backS = 0.27;
  L.ribs = [0.3, 0.38, 0.48, 0.62, 0.8];
  L.topY = 0.66 * H;
  L.table = {
    hw: Math.min(0.3 * W, 0.42 * H),
    nearS: 0.96,
    farS: 0.485,
    thick: 0.05 * H,
  };
  const tw = L.table.hw;
  // the envelope with the map in it, front left on the table
  const m = { x: -0.62 * tw, s: 0.88, w: 0.26 * H, d: 0.17 * H };
  const mz = L.f / m.s;
  const mn = P(L, m.x, L.topY, L.f / (mz - m.d / 2));
  const mf = P(L, m.x, L.topY, L.f / (mz + m.d / 2));
  const mm = P(L, m.x, L.topY, m.s);
  L.map = {
    x: mm.x,
    y: (mn.y + mf.y) / 2,
    w: m.w * mm.s,
    h: mn.y - mf.y,
    flatW: m.w,
    flatH: m.d,
  };
  // the candle, at the back of the table on the left
  const cb = P(L, -0.5 * tw, L.topY, 0.6);
  const ch = 0.19 * H * cb.s;
  L.candle = {
    x: cb.x,
    y: cb.y,
    s: cb.s,
    flameY: cb.y - ch,
    size: 0.06 * H * cb.s,
  };
  // the compass, hanging over the table on the right, square to us; it
  // swings from a point on the beam above the picture
  const cR = Math.min(H * 0.17, W * 0.12);
  L.compass = { x: W * 0.68, y: H * 0.4, R: cR, r: cR * 0.7 };
  L.pivot = { x: L.compass.x, y: -H * 0.08 };
  // the lantern, hanging near us, top left
  L.lantern = { x: W * 0.14, y: -H * 0.01, len: H * 0.17, s: 1.7 * u };
  return L;
}

function P(L, x, y, s) {
  return { x: L.vp.x + x * s, y: L.vp.y + y * s, s };
}

function hullPoint(L, t) {
  const h = L.hull;
  const a = (1 - t) * (1 - t);
  const b = 2 * t * (1 - t);
  const c = t * t;
  return [
    a * h.floor + b * h.cx + c * h.ceil,
    a * L.floorY + b * h.cy + c * L.ceilY,
  ];
}

function hullAt(L, y) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (hullPoint(L, m)[1] > y) lo = m;
    else hi = m;
  }
  return hullPoint(L, (lo + hi) / 2)[0];
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintCabin(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  if (!paintCabinPhotography(ctx, scene, L)) {
    paintShell(ctx, L);
    paintStern(ctx, L);
    for (const s of L.ribs) paintRib(ctx, L, s);
    paintTable(ctx, L);
    paintCandle(ctx, L);
    paintCompassShadow(ctx, L);
    paintLight(ctx, L);
    finish(ctx, L);
  }
  add(t, K.room, c);

  add(t, K.folded, paintFolded(L));
  const body = paintCompass(L);
  add(t, K.body, body.canvas);
  const needle = paintNeedle(L.compass.r, false);
  add(t, K.needle, needle.canvas);
  add(t, K.shade, paintNeedle(L.compass.r, true).canvas);
  add(t, K.glass, paintGlass(L.compass.r));
  const lantern = paintPhotographicLantern(L.lantern, L.nauticalPhoto?.lantern) || paintLantern(L.lantern);
  add(t, K.lantern, lantern.canvas);
  add(t, K.flame, paintFlame());
  add(
    t,
    K.glow,
    radial(128, "255,255,255", [
      [0, 0.95],
      [0.25, 0.4],
      [0.6, 0.1],
      [1, 0],
    ]),
  );
  return {
    keys: K,
    res: R,
    body: { oy: body.oy },
    needle: { oy: needle.oy },
    lantern: { oy: lantern.oy, flameDrop: lantern.flameDrop },
  };
}

export function releaseCabinArt(textures) {
  for (const key of Object.values(K))
    if (textures.exists(key)) textures.remove(key);
}

// ── the cabin ───────────────────────────────────────────────────────────────

const NEAR = 2.4;

// deck planks overhead, the hull's planks down both sides, the floor: dark
// old timber, every seam running away to the far end
function paintShell(ctx, L) {
  const { W, H } = L;
  ctx.fillStyle = "#0c0603";
  ctx.fillRect(0, 0, W, H);
  const sb = L.backS;
  const strip = (pts, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  const seam = (a, b, w, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  for (const [y, half, n, base, seed] of [
    [L.ceilY, L.hull.ceil, 14, [50, 30, 16], 11],
    [L.floorY, L.hull.floor, 12, [66, 40, 22], 13],
  ]) {
    const rnd = lcg(seed);
    for (let i = 0; i < n; i++) {
      const x0 = -half + (2 * half * i) / n;
      const x1 = -half + (2 * half * (i + 1)) / n;
      const k = 0.8 + rnd() * 0.3;
      const a = P(L, x0, y, NEAR);
      const d = P(L, x0, y, sb);
      const g = ctx.createLinearGradient(0, a.y < L.vp.y ? 0 : H, 0, d.y);
      g.addColorStop(0, rgb(base[0] * k, base[1] * k, base[2] * k));
      g.addColorStop(
        1,
        rgb(base[0] * k * 0.35, base[1] * k * 0.35, base[2] * k * 0.35),
      );
      strip([a, P(L, x1, y, NEAR), P(L, x1, y, sb), d], g);
      seam(a, d, Math.max(1, H * 0.002), "rgba(6,2,0,0.85)");
    }
  }
  for (const side of [-1, 1]) {
    const rnd = lcg(side > 0 ? 31 : 37);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = hullPoint(L, i / n);
      const [bx, by] = hullPoint(L, (i + 1) / n);
      const k = 0.78 + rnd() * 0.32;
      const back = P(L, side * ax, ay, sb);
      const g = ctx.createLinearGradient(side < 0 ? 0 : W, 0, back.x, 0);
      g.addColorStop(0, rgb(66 * k, 38 * k, 20 * k));
      g.addColorStop(1, rgb(24 * k, 13 * k, 7 * k));
      const a = P(L, side * ax, ay, NEAR);
      strip([a, P(L, side * bx, by, NEAR), P(L, side * bx, by, sb), back], g);
      seam(a, back, Math.max(1, H * 0.0022), "rgba(6,2,0,0.9)");
      for (let j = 0; j < 2; j++) {
        const tt = (i + 0.3 + rnd() * 0.4) / n;
        const [gx, gy] = hullPoint(L, tt);
        seam(
          P(L, side * gx, gy, NEAR),
          P(L, side * gx, gy, sb),
          0.7,
          rnd() < 0.5 ? "rgba(20,8,2,0.3)" : "rgba(255,200,140,0.04)",
        );
      }
    }
  }
}

// The stern is an uninterrupted timber wall in the procedural fallback too.
function paintStern(ctx, L) {
  const { W, H } = L, outline = [];
  for (let i = 0; i <= 20; i++) {
    const [x, y] = hullPoint(L, i / 20);
    outline.push(P(L, -x, y, L.backS));
  }
  for (let i = 20; i >= 0; i--) {
    const [x, y] = hullPoint(L, i / 20);
    outline.push(P(L, x, y, L.backS));
  }
  ctx.save();
  ctx.beginPath();
  outline.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath(); ctx.clip();
  const x0 = Math.min(...outline.map(p => p.x)), x1 = Math.max(...outline.map(p => p.x));
  const top = Math.min(...outline.map(p => p.y)), bottom = Math.max(...outline.map(p => p.y));
  const rnd = lcg(77), height = H * 0.035;
  for (let y = top; y < bottom; y += height) {
    const k = 0.8 + rnd() * 0.4;
    ctx.fillStyle = `rgb(${Math.round(53*k)},${Math.round(30*k)},${Math.round(15*k)})`;
    ctx.fillRect(x0, y, x1 - x0, height);
    ctx.fillStyle = "rgba(5,2,0,0.8)";
    ctx.fillRect(x0, y, x1 - x0, Math.max(1, H * 0.002));
    ctx.fillStyle = "rgba(195,138,74,0.08)";
    ctx.fillRect(x0, y + H * 0.003, x1 - x0, Math.max(0.5, H * 0.001));
  }
  for (const at of [0.25, 0.5, 0.75]) {
    const x = x0 + (x1 - x0) * at, width = W * 0.009;
    ctx.fillStyle = "#170c06"; ctx.fillRect(x, top, width, bottom - top);
    ctx.fillStyle = "rgba(182,124,65,0.12)"; ctx.fillRect(x, top, Math.max(1, width * 0.15), bottom - top);
  }
  ctx.restore();
}

// a rib of the hull standing out of the planks on both sides, a line of gilt
// along its edge, and the deck beam it carries overhead
function paintRib(ctx, L, s) {
  const { H } = L;
  const w = 0.085 * H * s;
  for (const side of [-1, 1]) {
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const [x, y] = hullPoint(L, i / 28);
        const p = P(L, side * x, y, s);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
    };
    ctx.lineCap = "butt";
    path();
    ctx.strokeStyle = "#0c0603";
    ctx.lineWidth = w * 1.15;
    ctx.stroke();
    ctx.save();
    ctx.translate(-side * w * 0.12, 0);
    path();
    ctx.strokeStyle = "#3e2412";
    ctx.lineWidth = w * 0.8;
    ctx.stroke();
    ctx.translate(-side * w * 0.36, 0);
    path();
    ctx.strokeStyle = `rgba(${GOLD},0.45)`;
    ctx.lineWidth = Math.max(1, w * 0.06);
    ctx.stroke();
    ctx.restore();
  }
  const bh = 0.13 * H;
  const half = hullAt(L, L.ceilY + bh / 2);
  const a = P(L, -half, L.ceilY, s);
  const b = P(L, half, L.ceilY + bh, s);
  if (b.y < 0) return;
  const g = ctx.createLinearGradient(0, a.y, 0, b.y);
  g.addColorStop(0, "#0c0603");
  g.addColorStop(0.75, "#30190a");
  g.addColorStop(1, "#40240f");
  ctx.fillStyle = g;
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.fillStyle = `rgba(${GOLD},0.5)`;
  ctx.fillRect(
    a.x,
    b.y - Math.max(1, (b.y - a.y) * 0.05),
    b.x - a.x,
    Math.max(1, (b.y - a.y) * 0.04),
  );
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(a.x, b.y, b.x - a.x, Math.max(1, (b.y - a.y) * 0.12));
}

// the chart table: its top running away from us, inlaid with a line of gold,
// a rail round three sides, its thick front edge, its legs
function paintTable(ctx, L) {
  const { H } = L;
  const t = L.table;
  const y = L.topY;
  const nl = P(L, -t.hw, y, t.nearS);
  const nr = P(L, t.hw, y, t.nearS);
  const fl = P(L, -t.hw, y, t.farS);
  const fr = P(L, t.hw, y, t.farS);
  const th = t.thick * t.nearS;
  soft(
    ctx,
    (nl.x + nr.x) / 2,
    nl.y + th + H * 0.06,
    (nr.x - nl.x) * 0.6,
    H * 0.08,
    "0,0,0",
    0.75,
  );
  for (const p of [nl, nr]) {
    const lw = H * 0.045;
    const x = p.x + (p === nl ? lw * 0.9 : -lw * 0.9);
    const lg = ctx.createLinearGradient(x - lw / 2, 0, x + lw / 2, 0);
    lg.addColorStop(0, "#120803");
    lg.addColorStop(0.35, "#4a2a12");
    lg.addColorStop(1, "#0e0602");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - lw * 0.5, p.y);
    ctx.lineTo(x + lw * 0.5, p.y);
    ctx.lineTo(x + lw * 0.32, H * 1.02);
    ctx.lineTo(x - lw * 0.32, H * 1.02);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(fl.x, fl.y);
  ctx.lineTo(fr.x, fr.y);
  ctx.lineTo(nr.x, nr.y);
  ctx.lineTo(nl.x, nl.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, fl.y, 0, nl.y);
  g.addColorStop(0, "#2e160a");
  g.addColorStop(1, "#5a2e14");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rnd = lcg(808);
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const x = -t.hw + (2 * t.hw * i) / n;
    const a = P(L, x, y, t.nearS);
    const b = P(L, x, y, t.farS);
    if (i > 0 && i < n) {
      ctx.strokeStyle = "rgba(10,4,1,0.6)";
      ctx.lineWidth = Math.max(1, H * 0.002);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let j = 0; j < 5 && i < n; j++) {
      const gx = x + (2 * t.hw * (0.15 + rnd() * 0.7)) / n;
      const p0 = P(L, gx, y, t.nearS);
      const p1 = P(L, gx + (rnd() - 0.5) * H * 0.02, y, t.farS);
      ctx.strokeStyle =
        rnd() < 0.6 ? "rgba(20,8,2,0.25)" : "rgba(255,200,150,0.06)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  // the gold line inlaid round its top
  const inset = t.hw * 0.08;
  const q = [
    P(L, -t.hw + inset, y, t.farS + 0.03),
    P(L, t.hw - inset, y, t.farS + 0.03),
    P(L, t.hw - inset, y, t.nearS - 0.05),
    P(L, -t.hw + inset, y, t.nearS - 0.05),
  ];
  ctx.beginPath();
  q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = `rgba(${GOLD},0.7)`;
  ctx.lineWidth = Math.max(1, H * 0.0025);
  ctx.stroke();
  ctx.restore();
  // the rail round the far end and the sides, gold caps on its corners
  const rail = 0.022 * H;
  const rf = P(L, -t.hw, y - rail, t.farS);
  const rfr = P(L, t.hw, y - rail, t.farS);
  ctx.fillStyle = "#24120a";
  ctx.beginPath();
  ctx.moveTo(fl.x, fl.y);
  ctx.lineTo(fr.x, fr.y);
  ctx.lineTo(rfr.x, rfr.y);
  ctx.lineTo(rf.x, rf.y);
  ctx.closePath();
  ctx.fill();
  for (const side of [-1, 1]) {
    const a = P(L, side * t.hw, y, t.nearS);
    const b = P(L, side * t.hw, y, t.farS);
    const c = P(L, side * t.hw, y - rail, t.farS);
    const d = P(L, side * t.hw, y - rail, t.nearS);
    ctx.fillStyle = "#42220e";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${GOLD},0.45)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    for (const p of [c, d]) {
      const cg = ctx.createRadialGradient(
        p.x - 1,
        p.y - 1,
        0,
        p.x,
        p.y,
        Math.max(2, H * 0.008 * p.s),
      );
      cg.addColorStop(0, "#fff0b8");
      cg.addColorStop(1, "#7a5418");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, H * 0.008 * p.s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the front edge: thick, moulded, a gilt bead along it
  const fg = ctx.createLinearGradient(0, nl.y, 0, nl.y + th);
  fg.addColorStop(0, "#8a5a32");
  fg.addColorStop(0.15, "#4a2810");
  fg.addColorStop(0.6, "#30180a");
  fg.addColorStop(1, "#140904");
  ctx.fillStyle = fg;
  ctx.fillRect(nl.x, nl.y, nr.x - nl.x, th);
  ctx.fillStyle = `rgba(${GOLD},0.55)`;
  ctx.fillRect(nl.x, nl.y + th * 0.42, nr.x - nl.x, Math.max(1, th * 0.06));
}

// a fat candle on a gold saucer, wax run down its side; its flame is the
// scene's
function paintCandle(ctx, L) {
  const c = L.candle;
  const s = c.s;
  const k = (L.topY * s) / L.f;
  const r = 0.03 * L.H * s;
  const sr = r * 2.3;
  soft(
    ctx,
    c.x + sr * 0.35,
    c.y - sr * k * 0.25,
    sr * 1.5,
    sr * k * 1.4,
    "0,0,0",
    0.55,
  );
  ctx.fillStyle = "#5a3c0c";
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, sr, sr * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold(ctx, c.x - sr, 0, c.x + sr, 0);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r * 0.2, sr * 0.96, sr * k * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  const top = c.flameY + r * 0.5;
  const cg = ctx.createLinearGradient(c.x - r, 0, c.x + r, 0);
  cg.addColorStop(0, "#b8a078");
  cg.addColorStop(0.35, "#fff2d0");
  cg.addColorStop(1, "#8a7050");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(c.x - r, top);
  ctx.lineTo(c.x - r, c.y - r * 0.3);
  ctx.ellipse(c.x, c.y - r * 0.3, r, r * k, 0, Math.PI, 0, true);
  ctx.lineTo(c.x + r, top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff6dc";
  ctx.beginPath();
  ctx.ellipse(c.x, top, r, r * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff2d0";
  for (const [dx, len] of [
    [-0.7, 0.5],
    [0.35, 0.8],
  ]) {
    ctx.beginPath();
    ctx.roundRect(
      c.x + dx * r - r * 0.12,
      top,
      r * 0.24,
      (c.y - top) * len * 0.5,
      r * 0.12,
    );
    ctx.fill();
  }
  ctx.strokeStyle = "#1a1008";
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(c.x, top);
  ctx.lineTo(c.x + r * 0.05, top - r * 0.45);
  ctx.stroke();
  soft(ctx, c.x, c.y, L.W * 0.14, L.H * 0.07, WARM, 0.3, "lighter");
}

// the compass's shadow, thrown down onto the table from the lantern
function paintCompassShadow(ctx, L) {
  const c = L.compass;
  const ty = L.topY * 0.62 + L.vp.y;
  soft(ctx, c.x + c.R * 0.3, ty, c.R * 1.1, c.R * 0.18, "0,0,0", 0.6);
}

// The lantern's warm light over the enclosed cabin.
function paintLight(ctx, L) {
  const { W, H } = L;
  soft(ctx, L.lantern.x, H * 0.2, W * 0.16, H * 0.2, WARM, 0.06, "lighter");
}

// A deep vignette keeps the cabin dark around its edges.
function finish(ctx, L) {
  const { W, H } = L;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const R0 = Math.hypot(W, H) / 2;
  ctx.fillStyle = "rgba(2,2,6,0.62)";
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(
    W * 0.5,
    H * 0.42,
    R0 * 0.2,
    W * 0.5,
    H * 0.5,
    R0 * 0.95,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(1,1,3,0.9)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03);
  ctx.restore();
}


// ── the compass ─────────────────────────────────────────────────────────────

// The ship's compass as it hangs: a gilded gimbal ring on its chain, the
// brass bowl pivoted in it, a thick bezel with six screws, the ivory card
// sunk inside; the needle and the glass go over it. The chain runs up out of
// the picture to the beam it swings from (the texture's origin is the
// compass's centre).
function paintCompass(L) {
  const { R: cR, r } = L.compass;
  const drop = L.compass.y - L.pivot.y;
  const ring = cR * 1.2;
  const chainTop = drop - ring - cR * 0.12;
  const pad = cR * 0.14;
  const w = (ring + pad) * 2;
  const h = drop + ring + pad;
  const c = makeCanvas(w * R, h * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = w / 2;
  const cy = drop;
  // the chain, from the beam down to the ring's shackle
  for (let y = 0; y < chainTop; y += cR * 0.07) {
    g.strokeStyle = "#1c160e";
    g.lineWidth = Math.max(2.5, cR * 0.03);
    g.beginPath();
    g.ellipse(cx, y, cR * 0.022, cR * 0.036, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = `rgba(${GOLD},0.45)`;
    g.lineWidth = Math.max(1, cR * 0.01);
    g.beginPath();
    g.ellipse(cx, y, cR * 0.022, cR * 0.036, 0, Math.PI * 1.1, Math.PI * 1.6);
    g.stroke();
  }
  // the shackle at the top of the gimbal ring
  if (paintPhotographicCompass(g, L, cx, cy)) {
    paintCard(g, { x: cx, y: cy, r, photographic: true });
    return { canvas: c, oy: cy / h };
  }
  g.strokeStyle = gold(
    g,
    cx - cR * 0.1,
    cy - ring - cR * 0.12,
    cx + cR * 0.1,
    cy - ring,
  );
  g.lineWidth = cR * 0.05;
  g.beginPath();
  g.arc(cx, cy - ring - cR * 0.05, cR * 0.08, Math.PI, 0);
  g.stroke();
  // the gimbal ring: a gilded band round the bowl, pivoted on either side
  g.save();
  g.shadowColor = "rgba(0,0,0,0.6)";
  g.shadowBlur = cR * 0.08;
  g.shadowOffsetX = cR * 0.03;
  g.shadowOffsetY = cR * 0.05;
  g.strokeStyle = gold(g, cx - ring, cy - ring, cx + ring, cy + ring);
  g.lineWidth = cR * 0.075;
  g.beginPath();
  g.arc(cx, cy, ring, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  g.strokeStyle = "rgba(255,240,190,0.5)";
  g.lineWidth = cR * 0.012;
  g.beginPath();
  g.arc(cx, cy, ring + cR * 0.02, Math.PI * 1.05, Math.PI * 1.7);
  g.stroke();
  g.strokeStyle = "rgba(40,20,4,0.6)";
  g.lineWidth = cR * 0.01;
  g.beginPath();
  g.arc(cx, cy, ring - cR * 0.035, 0, Math.PI * 2);
  g.stroke();
  // engraved rope-work round the ring
  g.strokeStyle = "rgba(70,40,8,0.45)";
  g.lineWidth = Math.max(0.8, cR * 0.006);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    g.beginPath();
    g.moveTo(
      cx + Math.cos(a) * (ring - cR * 0.03),
      cy + Math.sin(a) * (ring - cR * 0.03),
    );
    g.lineTo(
      cx + Math.cos(a + 0.05) * (ring + cR * 0.03),
      cy + Math.sin(a + 0.05) * (ring + cR * 0.03),
    );
    g.stroke();
  }
  // the pivots that hold the bowl in the ring, left and right
  for (const side of [-1, 1]) {
    const px = cx + side * (cR + (ring - cR) * 0.5);
    g.fillStyle = gold(
      g,
      px - cR * 0.08,
      cy - cR * 0.08,
      px + cR * 0.08,
      cy + cR * 0.08,
    );
    g.beginPath();
    g.ellipse(px, cy, (ring - cR) * 0.75, cR * 0.07, 0, 0, Math.PI * 2);
    g.fill();
    const kg = g.createRadialGradient(
      px - cR * 0.015,
      cy - cR * 0.015,
      0,
      px,
      cy,
      cR * 0.04,
    );
    kg.addColorStop(0, "#fff0b8");
    kg.addColorStop(1, "#5a3a0c");
    g.fillStyle = kg;
    g.beginPath();
    g.arc(px, cy, cR * 0.04, 0, Math.PI * 2);
    g.fill();
  }
  // the bowl's bezel: thick brass, rounded, bright along its top left
  g.save();
  g.shadowColor = "rgba(0,0,0,0.55)";
  g.shadowBlur = cR * 0.06;
  g.shadowOffsetY = cR * 0.03;
  g.fillStyle = gold(g, cx - cR, cy - cR, cx + cR, cy + cR);
  g.beginPath();
  g.arc(cx, cy, cR, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const bez = g.createRadialGradient(
    cx - cR * 0.35,
    cy - cR * 0.4,
    cR * 0.5,
    cx,
    cy,
    cR,
  );
  bez.addColorStop(0, "rgba(255,240,190,0)");
  bez.addColorStop(0.85, "rgba(255,240,190,0.2)");
  bez.addColorStop(1, "rgba(40,20,4,0.5)");
  g.fillStyle = bez;
  g.beginPath();
  g.arc(cx, cy, cR, 0, Math.PI * 2);
  g.fill();
  for (const [rr, col, lw] of [
    [0.985, "rgba(40,20,4,0.6)", 0.012],
    [0.9, "rgba(255,240,190,0.5)", 0.008],
    [0.86, "rgba(40,20,4,0.55)", 0.012],
  ]) {
    g.strokeStyle = col;
    g.lineWidth = cR * lw;
    g.beginPath();
    g.arc(cx, cy, cR * rr, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const sx = cx + Math.cos(a) * cR * 0.93;
    const sy = cy + Math.sin(a) * cR * 0.93;
    const sg = g.createRadialGradient(
      sx - cR * 0.008,
      sy - cR * 0.008,
      0,
      sx,
      sy,
      cR * 0.028,
    );
    sg.addColorStop(0, "#fff0b8");
    sg.addColorStop(1, "#5a3a0c");
    g.fillStyle = sg;
    g.beginPath();
    g.arc(sx, sy, cR * 0.026, 0, Math.PI * 2);
    g.fill();
  }
  // the bowl: a dark inner lip, the card in it, the lip's shadow over it
  g.fillStyle = "#1e1004";
  g.beginPath();
  g.arc(cx, cy, r * 1.07, 0, Math.PI * 2);
  g.fill();
  paintCard(g, { x: cx, y: cy, r });
  const lip = g.createRadialGradient(
    cx - r * 0.1,
    cy - r * 0.15,
    r * 0.78,
    cx,
    cy,
    r * 1.02,
  );
  lip.addColorStop(0, "rgba(40,24,6,0)");
  lip.addColorStop(1, "rgba(40,24,6,0.6)");
  g.fillStyle = lip;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // the lubber line at its head
  g.fillStyle = gold(g, cx - r * 0.04, 0, cx + r * 0.04, 0);
  g.beginPath();
  g.moveTo(cx - r * 0.04, cy - r * 1.08);
  g.lineTo(cx + r * 0.04, cy - r * 1.08);
  g.lineTo(cx, cy - r * 0.92);
  g.closePath();
  g.fill();
  return { canvas: c, oy: cy / h };
}

// The compass card: ivory, ruled every degree — every five longer, every ten
// longer still — numbered every thirty, a rose faded to sepia with age so
// the needle is what stands out, the four winds lettered.
function paintCard(ctx, card) {
  const { x, y, r } = card;
  const fill = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r,
  );
  fill.addColorStop(0, "#fbf2dc");
  fill.addColorStop(0.8, "#ecdcb6");
  fill.addColorStop(1, "#d2bc8a");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (!card.photographic) ctx.fill();
  const ink = "#2a1a10";
  const navy = "#1f2f5a";
  const red = "#a8231c";
  const at = (deg, rr) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
  };
  ctx.lineCap = "butt";
  for (let d = 0; d < 360; d++) {
    const long = d % 10 === 0;
    const mid = d % 5 === 0;
    const [x0, y0] = at(d, r * (long ? 0.86 : mid ? 0.9 : 0.94));
    const [x1, y1] = at(d, r * 0.985);
    ctx.strokeStyle = d % 90 === 0 ? red : ink;
    ctx.lineWidth = long ? Math.max(1.2, r * 0.011) : Math.max(0.6, r * 0.005);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  for (const rr of [0.985, 0.84, 0.72]) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.8, r * (rr === 0.72 ? 0.006 : 0.009));
    ctx.beginPath();
    ctx.arc(x, y, r * rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(r * 0.085)}px Georgia, "Times New Roman", serif`;
  for (let d = 0; d < 360; d += 30) {
    const [nx, ny] = at(d, r * 0.78);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate((d * Math.PI) / 180);
    ctx.fillStyle = d % 90 === 0 ? red : ink;
    ctx.fillText(String(d), 0, 0);
    ctx.restore();
  }
  const point = (deg, len, wid, light, dark) => {
    const [tx, ty] = at(deg, len);
    const [lx, ly] = at(deg - 90, wid);
    const [rx, ry] = at(deg + 90, wid);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(lx, ly);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(rx, ry);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
  };
  for (let d = 22.5; d < 360; d += 45)
    point(d, r * 0.3, r * 0.04, "#e6d8b8", "#c8b48a");
  for (let d = 45; d < 360; d += 90)
    point(d, r * 0.4, r * 0.06, "#ece2cc", "#b8a684");
  for (let d = 0; d < 360; d += 90)
    point(
      d,
      r * 0.54,
      r * 0.08,
      d === 0 ? "#ecd2c0" : "#efe6d2",
      d === 0 ? "#c09a84" : "#a8987a",
    );
  ctx.font = `700 ${Math.round(r * 0.11)}px Georgia, "Times New Roman", serif`;
  for (const [d, letter] of [
    [0, "N"],
    [90, "E"],
    [180, "S"],
    [270, "W"],
  ]) {
    const [lx, ly] = at(d, r * 0.63);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((d * Math.PI) / 180);
    ctx.fillStyle = d === 0 ? red : navy;
    ctx.fillText(letter, 0, 0);
    ctx.restore();
  }
  const sh = ctx.createRadialGradient(x, y, r * 0.8, x, y, r);
  sh.addColorStop(0, "rgba(60,36,10,0)");
  sh.addColorStop(1, "rgba(60,36,10,0.32)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// The needle: long and slender, its north half red and its south half
// steel-blue, a dark edge, a bright spine, a gold cap. Painted pointing up,
// its origin on the pivot; `shadow` paints its soft shadow instead.
function paintNeedle(r, shadow) {
  const len = r * 0.86;
  const tail = r * 0.66;
  const wid = r * 0.09;
  const pad = r * 0.06;
  const w = Math.ceil((wid * 2 + pad * 2) * R);
  const h = Math.ceil((len + tail + pad * 2) * R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = wid + pad;
  const cy = len + pad;
  const lozenge = () => {
    g.beginPath();
    g.moveTo(cx, cy - len);
    g.lineTo(cx + wid, cy);
    g.lineTo(cx, cy + tail);
    g.lineTo(cx - wid, cy);
    g.closePath();
  };
  if (shadow) {
    g.filter = `blur(${(r * 0.012).toFixed(1)}px)`;
    g.fillStyle = "rgba(20,10,4,0.45)";
    lozenge();
    g.fill();
    return { canvas: c, oy: cy / (len + tail + pad * 2) };
  }
  const half = (dir, light, dark) => {
    g.fillStyle = light;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx - wid, cy);
    g.lineTo(cx, cy + dir);
    g.closePath();
    g.fill();
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + wid, cy);
    g.lineTo(cx, cy + dir);
    g.closePath();
    g.fill();
  };
  half(-len, "#e8584a", "#a01c14");
  half(tail, "#6a7c9e", "#1e2a44");
  g.strokeStyle = "rgba(20,8,2,0.85)";
  g.lineWidth = Math.max(1, r * 0.008);
  lozenge();
  g.stroke();
  g.strokeStyle = "rgba(255,240,220,0.45)";
  g.lineWidth = Math.max(0.6, r * 0.004);
  g.beginPath();
  g.moveTo(cx, cy - len * 0.95);
  g.lineTo(cx, cy + tail * 0.9);
  g.stroke();
  const cap = g.createRadialGradient(
    cx - wid * 0.3,
    cy - wid * 0.3,
    0,
    cx,
    cy,
    wid * 0.85,
  );
  cap.addColorStop(0, "#fff0b8");
  cap.addColorStop(0.6, "#c9973c");
  cap.addColorStop(1, "#5a3a0c");
  g.fillStyle = cap;
  g.beginPath();
  g.arc(cx, cy, wid * 0.85, 0, Math.PI * 2);
  g.fill();
  return { canvas: c, oy: cy / (len + tail + pad * 2) };
}

// the glass over the card: a broad soft sheen, the lantern caught in it, a
// bright arc along its upper edge
function paintGlass(r) {
  const size = Math.ceil(r * 2 * R);
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.clip();
  const sheen = g.createLinearGradient(0, 0, r * 2, r * 2);
  sheen.addColorStop(0, "rgba(255,246,225,0.24)");
  sheen.addColorStop(0.35, "rgba(255,246,225,0.03)");
  sheen.addColorStop(1, "rgba(255,246,225,0)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, r * 2, r * 2);
  g.strokeStyle = "rgba(255,236,200,0.5)";
  g.lineWidth = r * 0.03;
  g.lineCap = "round";
  g.beginPath();
  g.arc(r, r, r * 0.9, Math.PI * 1.08, Math.PI * 1.4);
  g.stroke();
  const spot = g.createRadialGradient(
    r * 0.5,
    r * 0.42,
    0,
    r * 0.5,
    r * 0.42,
    r * 0.16,
  );
  spot.addColorStop(0, "rgba(255,220,160,0.55)");
  spot.addColorStop(1, "rgba(255,220,160,0)");
  g.fillStyle = spot;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
}

// ── the lantern, the flame, the map ────────────────────────────────────────


// a candle flame: white at the heart, gold, a little orange at its tip
function paintFlame() {
  const w = 32;
  const h = 72;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const path = (k) => {
    g.beginPath();
    g.moveTo(w / 2, h * (0.02 + (1 - k) * 0.3));
    g.bezierCurveTo(
      w * (0.5 + 0.42 * k),
      h * 0.45,
      w * (0.5 + 0.38 * k),
      h * 0.98,
      w / 2,
      h * 0.98,
    );
    g.bezierCurveTo(
      w * (0.5 - 0.38 * k),
      h * 0.98,
      w * (0.5 - 0.42 * k),
      h * 0.45,
      w / 2,
      h * (0.02 + (1 - k) * 0.3),
    );
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

// The house's storm lantern (shared/hurricaneLantern.js) on a short chain,
// hung by its bail; the scene swings it.
function paintLantern(lan) {
  const s = lan.s;
  const chain = lan.len;
  const u = 2.2 * s; // the house's storm lantern, a centimetre to u pixels
  const w = Math.ceil(24 * u * R);
  const h = Math.ceil((chain + 36 * u) * R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = 12 * u;
  // the chain down from the beam
  g.strokeStyle = "#2c2418";
  g.lineWidth = Math.max(1.2, 2 * s);
  for (let y = 4 * s; y < chain - 2 * s; y += 7 * s) {
    g.beginPath();
    g.ellipse(cx, y, 2.2 * s, 3.6 * s, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // and the lantern hung from it by its bail
  const foot = chain + 32 * u;
  paintHurricaneLantern(g, cx, foot, u, true, false);
  return { canvas: c, oy: 0, flameDrop: foot - 11.6 * u };
}

// The map, in its envelope — the house's envelope (shared/envelope.js),
// sealed in red wax — lying a little askew on the table. Painted flat, then
// laid down in the table's perspective.
function paintFolded(L) {
  const m = L.map;
  const fw = m.flatW * 1.4;
  const fh = m.flatH * 1.7;
  const flat = makeCanvas(fw * R, fh * R);
  const g = flat.getContext("2d");
  g.scale(R, R);
  // the envelope in centimetres, 17 by 11, filling the map's place
  const w = 17, d = 11, q = (m.flatW * 0.8) / w;
  const rot = -0.07, cs = Math.cos(rot), sn = Math.sin(rot);
  // set back a little from the table's near edge
  const at = (a, b) => ({ x: fw / 2 + (a * cs + (b + 3) * sn) * q, y: fh / 2 + (a * sn - (b + 3) * cs) * q });
  const seal = at(0, d * 0.14);
  paintEnvelope(g, { w, d, at, k: q, seal: { x: seal.x, y: seal.y - 0.5 * q, rx: 1.7 * q, ry: 1.7 * q } }, {
    left: "rgb(78,74,67)", right: "rgb(100,95,86)", wax: "rgb(84,16,12)", shadow: true, shine: true,
  });
  const c = makeCanvas(fw * (m.w / m.flatW) * R, fh * (m.h / m.flatH) * R);
  c.getContext("2d").drawImage(flat, 0, 0, c.width, c.height);
  return c;
}

// The map, written on the letter out of the envelope (shared/envelope.js
// paints the paper): an island in the corner with a dotted way to an X, a
// north mark. The bearings are the scene's text, written where MAP_LINES
// says. Added to `textures`, sized to the sheet (w × h), at R times over.
export const MAP_LINES = { x: 0.08, y: (i) => 0.17 + i * 0.13 };
export function addMapMarks(textures, w, h) {
  const c = makeCanvas(w * R, h * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const ix = w * 0.62;
  const iy = h * 0.75;
  const ir = w * 0.13;
  g.fillStyle = "rgba(196,160,96,0.55)";
  g.strokeStyle = "rgba(70,44,18,0.85)";
  g.lineWidth = 1.6;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = ir * (0.78 + 0.22 * Math.sin(a * 3 + 1) * Math.cos(a * 2));
    const px = ix + Math.cos(a) * rr * 1.25;
    const py = iy + Math.sin(a) * rr * 0.7;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.setLineDash([3, 4]);
  g.strokeStyle = "rgba(90,30,16,0.85)";
  g.beginPath();
  g.moveTo(ix - ir * 1.6, iy + ir * 0.6);
  g.bezierCurveTo(
    ix - ir * 1.0,
    iy + ir * 0.5,
    ix - ir * 0.5,
    iy + ir * 0.1,
    ix + ir * 0.4,
    iy - ir * 0.08,
  );
  g.stroke();
  g.setLineDash([]);
  const xx = ix + ir * 0.5;
  const xy = iy - ir * 0.05;
  const xs = ir * 0.16;
  g.strokeStyle = "#a01c14";
  g.lineWidth = Math.max(2, w * 0.006);
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(xx - xs, xy - xs);
  g.lineTo(xx + xs, xy + xs);
  g.moveTo(xx + xs, xy - xs);
  g.lineTo(xx - xs, xy + xs);
  g.stroke();
  const nx = w * 0.88;
  const ny = h * 0.16;
  const nr = w * 0.035;
  g.strokeStyle = "rgba(70,44,18,0.85)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(nx, ny, nr, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(160,28,20,0.9)";
  g.beginPath();
  g.moveTo(nx, ny - nr * 1.25);
  g.lineTo(nx + nr * 0.3, ny);
  g.lineTo(nx - nr * 0.3, ny);
  g.closePath();
  g.fill();
  g.font = `700 ${Math.round(nr * 0.8)}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "rgba(70,44,18,0.85)";
  g.fillText("N", nx, ny - nr * 1.75);
  add(textures, K.marks, c);
  return { key: K.marks, res: R };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function soft(ctx, cx, cy, rx, ry, rgbs, a, op = "source-over") {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgbs},${a})`);
  g.addColorStop(0.45, `rgba(${rgbs},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgbs},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

let NOISE = null;
function grain(ctx, W, H, alpha) {
  if (!NOISE) {
    NOISE = makeCanvas(128, 128);
    const g = NOISE.getContext("2d");
    const img = g.createImageData(128, 128);
    const rnd = lcg(90210);
    for (let i = 0; i < 128 * 128; i++) {
      const v = (rnd() * 255) | 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(NOISE, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function radial(size, rgbs, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgbs},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

const rgb = (r, g, b) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
  return c;
}

function add(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  return textures.addCanvas(key, canvas);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
