import { COMPASS_BEARINGS } from "./puzzle.js";

/** The captain's cabin for COMPASS, painted like the rest of the game's
 *  storybook nights, and seen whole, as from its door: the hull curving up
 *  on either side on its great ribs, the deck beams overhead, and at the far
 *  end the stern window, wide open on the moonlit sea, its curtains tied
 *  back. A cannon stands at its port, barrels and rope against the other
 *  side, the ship's colours hang from a beam, a lantern swings near us.
 *
 *  In the middle, the chart table, in proper perspective: the compass in its
 *  box, the folded map, a candle, an hourglass, an inkpot and quill, a little
 *  gold, a spyglass, each standing on the table with its shadow.
 *
 *  One-point perspective: everything is placed in the room by (x, y, s) —
 *  across, down from the eye, and how near (s = 1 at the table's front, the
 *  far wall at 0.27) — and comes to the screen at VP + (x, y) · s.
 *
 *  Painted once per screen size: the cabin (`room`, the window left open);
 *  the night behind the window (it rolls with the ship), the lantern (it
 *  swings), the candle flame, the compass needle, its shadow and the glass,
 *  the glows, the folded map (it leaves the table when opened) and the map
 *  unfolded. The scene moves them; this returns where everything is. */

export const MAP_FONT = '"Architects Daughter", "Special Elite", cursive';
const K = {
  room: "cp_room",
  view: "cp_view",
  glitter: "cp_glitter",
  needle: "cp_needle",
  shade: "cp_needle_shadow",
  glass: "cp_glass",
  lantern: "cp_lantern",
  flame: "cp_flame",
  glow: "cp_glow",
  sheet: "cp_sheet",
  folded: "cp_folded",
};
const WARM = "255,190,110";
const MOON = "150,180,235";
const R = 2; // small things are painted at twice their size

// ── where everything is ─────────────────────────────────────────────────────

export function layoutCabin(W, H) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, S, u };
  L.vp = { x: W / 2, y: H * 0.3 }; // the eye's height: the sea's horizon
  L.f = H * 0.88; // how deep things look
  // the cabin's cross-section: the deck overhead, the floor, the hull's sides
  // bowed out between them (a curve from the floor up to the deck)
  L.ceilY = -0.62 * H;
  L.floorY = 1.1 * H;
  L.hull = { floor: 0.72 * W, ceil: 0.86 * W, cx: 1.21 * W, cy: 0.06 * H };
  L.backS = 0.27;
  L.ribs = [0.3, 0.38, 0.48, 0.62, 0.8];
  // the chart table
  L.topY = 0.66 * H;
  L.table = { hw: Math.min(0.3 * W, 0.42 * H), nearS: 0.96, farS: 0.485, thick: 0.05 * H };
  // the stern window, square to us on the far wall; the horizon at the eye
  const hw = Math.min(W * 0.18, H * 0.27);
  L.win = { x: W / 2, top: H * 0.185, sill: H * 0.5, hw };
  L.win.spring = L.win.top + hw * 0.55;
  L.win.cy = (L.win.top + L.win.sill) / 2;
  // the compass in its box, a little right of the middle
  const tw = L.table.hw; // things on the table are placed by its width
  const c = { x: 0.24 * tw, s: 0.74, rho: 0.19 * H, half: 0.23 * H };
  c.z = L.f / c.s;
  c.boxTop = L.topY - 0.07 * H;
  c.cardY = L.topY - 0.055 * H;
  L.cmp = c;
  const card = ellipseAt(L, c.x, c.cardY, c.z, c.rho);
  L.compass = { x: card.x, y: card.y, rw: card.rx, rh: card.ry };
  L.glassEl = ellipseAt(L, c.x, c.boxTop, c.z, c.rho * 1.02);
  // the folded map, front left
  const m = { x: -0.68 * tw, s: 0.88, w: 0.24 * H, d: 0.16 * H };
  const mz = L.f / m.s;
  const mn = P(L, m.x, L.topY, L.f / (mz - m.d / 2));
  const mf = P(L, m.x, L.topY, L.f / (mz + m.d / 2));
  const mm = P(L, m.x, L.topY, m.s);
  L.map = { x: mm.x, y: (mn.y + mf.y) / 2, w: m.w * mm.s, h: mn.y - mf.y, flatW: m.w, flatH: m.d };
  // the candle, far left on the table
  const cb = P(L, -0.66 * tw, L.topY, 0.54);
  const ch = 0.19 * H * cb.s;
  L.candle = { x: cb.x, y: cb.y, s: cb.s, flameY: cb.y - ch, size: 0.06 * H * cb.s };
  // the lantern, hanging near us, top left
  L.lantern = { x: W * 0.14, y: -H * 0.01, len: H * 0.17, s: 1.7 * u };
  return L;
}

// a point in the room on the screen
function P(L, x, y, s) {
  return { x: L.vp.x + x * s, y: L.vp.y + y * s, s };
}

// a circle lying flat in the room, at height y, across x, depth z — on the
// screen, an ellipse
function ellipseAt(L, x, y, z, r) {
  const near = P(L, x, y, L.f / (z - r));
  const far = P(L, x, y, L.f / (z + r));
  const mid = P(L, x, y, L.f / z);
  return { x: mid.x, y: (near.y + far.y) / 2, rx: r * mid.s, ry: (near.y - far.y) / 2, s: mid.s };
}

// the hull's side, from the floor (t = 0) up to the deck (t = 1)
function hullPoint(L, t) {
  const h = L.hull;
  const a = (1 - t) * (1 - t);
  const b = 2 * t * (1 - t);
  const c = t * t;
  return [a * h.floor + b * h.cx + c * h.ceil, a * L.floorY + b * h.cy + c * L.ceilY];
}

// how far out the hull is at a height
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
  paintShell(ctx, L);
  paintStern(ctx, L);
  // the ribs and what stands between them, from the far end forward
  const things = L.ribs.map((s) => ({ s, draw: () => paintRib(ctx, L, s) }));
  things.push({ s: 0.32, draw: () => paintBarrel(ctx, L, 0.56 * W, 0.32, false) });
  things.push({ s: 0.345, draw: () => paintCannon(ctx, L) });
  things.push({ s: 0.381, draw: () => paintColours(ctx, L) });
  things.push({ s: 0.42, draw: () => paintBarrel(ctx, L, 0.55 * W, 0.42, true) });
  things.sort((a, b) => a.s - b.s).forEach((th) => th.draw());
  paintTable(ctx, L);
  // what stands on the table, from the far side forward
  const T = L.topY;
  const tw = L.table.hw;
  const on = [
    { s: 0.52, draw: () => paintCoins(ctx, L, P(L, 0.8 * tw, T, 0.52)) },
    { s: 0.52, draw: () => paintHourglass(ctx, L, P(L, 0.05 * tw, T, 0.52)) },
    { s: 0.54, draw: () => paintCandle(ctx, L) },
    { s: 0.68, draw: () => paintInk(ctx, L, P(L, -0.8 * tw, T, 0.68)) },
    { s: L.cmp.s, draw: () => paintCompassBox(ctx, L) },
    // the spyglass lies beside the box: drawn before it, so the box's raised
    // top may hide its edge
    { s: 0.7, draw: () => paintSpyglass(ctx, L, P(L, 0.91 * tw, T - 0.027 * H, 0.93), P(L, 0.89 * tw, T - 0.027 * H, 0.66)) },
  ];
  on.sort((a, b) => a.s - b.s).forEach((th) => th.draw());
  paintLight(ctx, L);
  finish(ctx, L);
  add(t, K.room, c);

  // the folded map is its own picture: it leaves the table when it is opened
  add(t, K.folded, paintFolded(L));
  const view = paintView(L);
  add(t, K.view, view.sky);
  add(t, K.glitter, view.glitter);
  const r = L.compass.rw;
  const needle = paintNeedle(r, false);
  add(t, K.needle, needle.canvas);
  add(t, K.shade, paintNeedle(r, true).canvas);
  add(t, K.glass, paintGlass(L.glassEl));
  const lantern = paintLantern(L.lantern);
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
  const sheet = paintSheet(L);
  add(t, K.sheet, sheet.canvas);
  return {
    keys: K,
    res: R,
    needle: { oy: needle.oy },
    lantern: { oy: lantern.oy, flameDrop: lantern.flameDrop },
    view: { w: view.w, h: view.h },
    sheet: { w: sheet.w, h: sheet.h, lines: sheet.lines, textX: sheet.textX },
  };
}

export function releaseCabinArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// ── the cabin ───────────────────────────────────────────────────────────────

const NEAR = 2.4; // far enough forward to be off the screen

// deck planks overhead, the hull's planks down both sides, the floor; every
// seam running away to the far end
function paintShell(ctx, L) {
  const { W, H } = L;
  ctx.fillStyle = "#1a0d06";
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
  // the deck overhead and the floor: boards running away from us
  for (const [y, half, n, base, seed] of [
    [L.ceilY, L.hull.ceil, 14, [70, 42, 22], 11],
    [L.floorY, L.hull.floor, 12, [92, 56, 30], 13],
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
      g.addColorStop(1, rgb(base[0] * k * 0.45, base[1] * k * 0.45, base[2] * k * 0.45));
      strip([a, P(L, x1, y, NEAR), P(L, x1, y, sb), d], g);
      seam(a, d, Math.max(1, H * 0.002), "rgba(12,5,1,0.8)");
    }
  }
  // the hull's sides: planks following its curve
  for (const side of [-1, 1]) {
    const rnd = lcg(side > 0 ? 31 : 37);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = hullPoint(L, i / n);
      const [bx, by] = hullPoint(L, (i + 1) / n);
      const k = 0.78 + rnd() * 0.32;
      const back = P(L, side * ax, ay, sb);
      const g = ctx.createLinearGradient(side < 0 ? 0 : W, 0, back.x, 0);
      g.addColorStop(0, rgb(118 * k, 72 * k, 40 * k));
      g.addColorStop(1, rgb(46 * k, 27 * k, 14 * k));
      const a = P(L, side * ax, ay, NEAR);
      strip([a, P(L, side * bx, by, NEAR), P(L, side * bx, by, sb), back], g);
      seam(a, back, Math.max(1, H * 0.0022), "rgba(12,5,1,0.85)");
      // a little grain along the plank
      for (let j = 0; j < 2; j++) {
        const tt = (i + 0.3 + rnd() * 0.4) / n;
        const [gx, gy] = hullPoint(L, tt);
        seam(P(L, side * gx, gy, NEAR), P(L, side * gx, gy, sb), 0.7, rnd() < 0.5 ? "rgba(30,14,4,0.25)" : "rgba(255,210,150,0.05)");
      }
    }
    // treenails where the planks meet each rib
    ctx.fillStyle = "rgba(14,6,2,0.6)";
    for (const s of [0.34, 0.43, 0.55]) {
      for (let i = 1; i < n; i += 2) {
        const [x, y] = hullPoint(L, i / n);
        const p = P(L, side * x, y, s);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, H * 0.004 * s), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// the far wall, the stern: upright panelling, the great window open on the
// night, its frame and sill, the moonlight round it, its curtains tied back
function paintStern(ctx, L) {
  const { W, H, win } = L;
  const sb = L.backS;
  // the wall, in the hull's own section
  const outline = [];
  for (let i = 0; i <= 20; i++) {
    const [x, y] = hullPoint(L, i / 20);
    outline.push(P(L, -x, y, sb));
  }
  for (let i = 20; i >= 0; i--) {
    const [x, y] = hullPoint(L, i / 20);
    outline.push(P(L, x, y, sb));
  }
  ctx.save();
  ctx.beginPath();
  outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, outline[20].y, 0, outline[0].y);
  g.addColorStop(0, "#2a170b");
  g.addColorStop(1, "#3e2412");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const x0 = Math.min(...outline.map((p) => p.x));
  const x1 = Math.max(...outline.map((p) => p.x));
  const rnd = lcg(77);
  const boards = 16;
  for (let i = 0; i < boards; i++) {
    const bx = x0 + ((x1 - x0) * i) / boards;
    const k = 0.85 + rnd() * 0.3;
    ctx.fillStyle = `rgba(${Math.round(120 * k)},${Math.round(74 * k)},${Math.round(40 * k)},0.18)`;
    ctx.fillRect(bx, 0, (x1 - x0) / boards, H);
    ctx.fillStyle = "rgba(10,4,1,0.7)";
    ctx.fillRect(bx, 0, Math.max(1, W * 0.0015), H);
  }
  // a rail along the wall at the height of the sill
  ctx.fillStyle = "rgba(20,8,2,0.7)";
  ctx.fillRect(x0, win.sill + H * 0.012, x1 - x0, H * 0.012);
  ctx.fillStyle = "rgba(255,210,160,0.12)";
  ctx.fillRect(x0, win.sill + H * 0.012, x1 - x0, H * 0.003);
  // the moon's light, spilling round the window onto the wall
  soft(ctx, win.x + win.hw * 0.3, win.cy, win.hw * 2.4, (win.sill - win.top) * 1.3, MOON, 0.22, "lighter");
  ctx.restore();

  // the frame: a broad moulded surround, a lit inner edge, a deep sill
  const fw = win.hw * 0.13;
  windowPath(ctx, win, fw);
  const fg = ctx.createLinearGradient(win.x - win.hw, 0, win.x + win.hw, 0);
  fg.addColorStop(0, "#5a3418");
  fg.addColorStop(0.5, "#7a4824");
  fg.addColorStop(1, "#4a2a12");
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.strokeStyle = "rgba(14,6,2,0.8)";
  ctx.lineWidth = Math.max(1.5, fw * 0.12);
  ctx.stroke();
  windowPath(ctx, win, fw * 0.45);
  ctx.strokeStyle = "rgba(255,214,160,0.18)";
  ctx.lineWidth = Math.max(1, fw * 0.1);
  ctx.stroke();
  // the window's depth: the inside of the opening, lit by the moon on one side
  windowPath(ctx, win, fw * 0.12);
  ctx.fillStyle = "#24140a";
  ctx.fill();
  // a keystone at the top of the arch
  ctx.fillStyle = "#6a3c1c";
  ctx.beginPath();
  ctx.moveTo(win.x - fw * 0.55, win.top - fw * 1.05);
  ctx.lineTo(win.x + fw * 0.55, win.top - fw * 1.05);
  ctx.lineTo(win.x + fw * 0.4, win.top + fw * 0.1);
  ctx.lineTo(win.x - fw * 0.4, win.top + fw * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(14,6,2,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // and the opening itself, left open: the night is the scene's, behind
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  windowPath(ctx, win, -fw * 0.1);
  ctx.fill();
  ctx.restore();
  // the sill: we look down on its top
  const sy = win.sill;
  const sx0 = win.x - win.hw - fw * 1.4;
  const sx1 = win.x + win.hw + fw * 1.4;
  const sd = H * 0.03;
  const sg = ctx.createLinearGradient(0, sy - sd * 0.2, 0, sy + sd);
  sg.addColorStop(0, "#9a6a40");
  sg.addColorStop(0.5, "#6a4020");
  sg.addColorStop(1, "#2a160a");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(sx0 + sd * 0.8, sy - sd * 0.15);
  ctx.lineTo(sx1 - sd * 0.8, sy - sd * 0.15);
  ctx.lineTo(sx1, sy + sd * 0.45);
  ctx.lineTo(sx1, sy + sd);
  ctx.lineTo(sx0, sy + sd);
  ctx.lineTo(sx0, sy + sd * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(200,220,255,0.18)";
  ctx.fillRect(sx0 + sd, sy - sd * 0.1, sx1 - sx0 - sd * 2, Math.max(1, sd * 0.12));

  paintCurtains(ctx, L, fw);
}

// the window's outline: straight sides, a rounded head
function windowPath(ctx, win, grow) {
  const x0 = win.x - win.hw - grow;
  const x1 = win.x + win.hw + grow;
  ctx.beginPath();
  ctx.moveTo(x0, win.sill + Math.max(0, grow) * 0.2);
  ctx.lineTo(x0, win.spring);
  ctx.ellipse(win.x, win.spring, win.hw + grow, win.spring - win.top + grow, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(x1, win.sill + Math.max(0, grow) * 0.2);
  ctx.closePath();
}

// heavy red curtains on a brass rod, gathered and tied back with gold cord
function paintCurtains(ctx, L, fw) {
  const { H, win } = L;
  const rodY = win.top - fw * 1.6;
  const reach = win.hw + fw * 2.6;
  // the rod
  ctx.strokeStyle = "#c9973c";
  ctx.lineWidth = Math.max(2, H * 0.006);
  ctx.beginPath();
  ctx.moveTo(win.x - reach, rodY);
  ctx.lineTo(win.x + reach, rodY);
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#e0b050";
    ctx.beginPath();
    ctx.arc(win.x + side * reach, rodY, H * 0.008, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const side of [-1, 1]) {
    const outer = win.x + side * reach * 0.97; // the curtain's outer edge
    const inner = win.x + side * (win.hw * 0.72); // where it reaches in at the top
    const tieY = win.spring + (win.sill - win.spring) * 0.42;
    const tieX = win.x + side * (win.hw + fw * 0.6);
    const foot = win.sill + H * 0.07;
    const footIn = win.x + side * (win.hw + fw * 0.2);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(outer, rodY);
      ctx.lineTo(inner, rodY);
      ctx.bezierCurveTo(inner, rodY + (tieY - rodY) * 0.5, tieX - side * fw * 0.2, tieY - H * 0.05, tieX, tieY);
      ctx.bezierCurveTo(tieX + side * fw * 0.3, tieY + H * 0.05, footIn, foot - H * 0.08, footIn, foot);
      ctx.quadraticCurveTo((footIn + outer) / 2, foot + H * 0.012, outer + side * fw * 0.3, foot);
      ctx.closePath();
    };
    soft(ctx, (outer + tieX) / 2 + side * fw, (rodY + foot) / 2, Math.abs(outer - inner) * 0.7, (foot - rodY) * 0.6, "0,0,0", 0.45);
    path();
    const left = Math.min(outer, inner);
    const right = Math.max(outer, inner);
    const g = ctx.createLinearGradient(left, 0, right, 0);
    const folds = 6;
    for (let i = 0; i <= folds; i++) {
      g.addColorStop(i / folds, i % 2 ? "#4e0a12" : "#9a2430");
    }
    ctx.fillStyle = g;
    ctx.fill();
    // the moon on its inner edge
    ctx.save();
    ctx.clip();
    soft(ctx, tieX - side * fw * 0.2, tieY, fw * 1.2, (foot - rodY) * 0.5, "190,200,255", 0.2, "lighter");
    const shade = ctx.createLinearGradient(0, rodY, 0, foot);
    shade.addColorStop(0, "rgba(0,0,0,0.35)");
    shade.addColorStop(0.3, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = shade;
    ctx.fillRect(left - fw, rodY, right - left + fw * 2, foot - rodY);
    ctx.restore();
    // the gold cord round the gathered cloth, knotted, its tassel hanging
    const cx = (tieX + outer) / 2;
    const cw = Math.abs(outer - tieX) / 2 + fw * 0.15;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#7a5410";
    ctx.lineWidth = Math.max(3, H * 0.011);
    ctx.beginPath();
    ctx.ellipse(cx, tieY, cw, H * 0.012, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.strokeStyle = "#e8bc58";
    ctx.lineWidth = Math.max(2, H * 0.007);
    ctx.stroke();
    ctx.fillStyle = "#e8bc58";
    ctx.beginPath();
    ctx.arc(cx, tieY + H * 0.012, H * 0.009, 0, Math.PI * 2);
    ctx.fill();
    const tg = ctx.createLinearGradient(cx - fw * 0.4, 0, cx + fw * 0.4, 0);
    tg.addColorStop(0, "#9a7020");
    tg.addColorStop(0.5, "#f0c868");
    tg.addColorStop(1, "#8a6018");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(cx - fw * 0.12, tieY + H * 0.018);
    ctx.lineTo(cx + fw * 0.12, tieY + H * 0.018);
    ctx.quadraticCurveTo(cx + fw * 0.5, tieY + H * 0.05, cx + fw * 0.45, tieY + H * 0.07);
    ctx.lineTo(cx - fw * 0.45, tieY + H * 0.07);
    ctx.quadraticCurveTo(cx - fw * 0.5, tieY + H * 0.05, cx - fw * 0.12, tieY + H * 0.018);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = "butt";
  }
}

// a rib of the hull standing out of the planks on both sides, and the deck
// beam it carries across overhead, with its knees
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
    ctx.strokeStyle = "#1c0e06";
    ctx.lineWidth = w * 1.15;
    ctx.stroke();
    ctx.save();
    ctx.translate(-side * w * 0.12, 0);
    path();
    ctx.strokeStyle = "#5a341a";
    ctx.lineWidth = w * 0.8;
    ctx.stroke();
    ctx.translate(-side * w * 0.22, 0);
    path();
    ctx.strokeStyle = "rgba(255,200,140,0.12)";
    ctx.lineWidth = w * 0.18;
    ctx.stroke();
    ctx.restore();
  }
  // the beam
  const bh = 0.13 * H;
  const half = hullAt(L, L.ceilY + bh / 2);
  const a = P(L, -half, L.ceilY, s);
  const b = P(L, half, L.ceilY + bh, s);
  if (b.y < 0) return;
  const g = ctx.createLinearGradient(0, a.y, 0, b.y);
  g.addColorStop(0, "#1a0c05");
  g.addColorStop(0.75, "#4a2a14");
  g.addColorStop(1, "#5e3820");
  ctx.fillStyle = g;
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.fillStyle = "rgba(255,200,140,0.14)";
  ctx.fillRect(a.x, b.y - Math.max(1, (b.y - a.y) * 0.06), b.x - a.x, Math.max(1, (b.y - a.y) * 0.06));
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(a.x, b.y, b.x - a.x, Math.max(1, (b.y - a.y) * 0.12));
  // the knees, where beam meets rib
  for (const side of [-1, 1]) {
    const ex = side < 0 ? a.x : b.x;
    const kw = (b.y - a.y) * 1.3;
    ctx.fillStyle = "#3e2210";
    ctx.beginPath();
    ctx.moveTo(ex, b.y);
    ctx.lineTo(ex - side * kw, b.y);
    ctx.quadraticCurveTo(ex - side * kw * 0.25, b.y + kw * 0.25, ex - side * w * 0.2, b.y + kw);
    ctx.lineTo(ex, b.y + kw);
    ctx.closePath();
    ctx.fill();
  }
}

// an upright barrel on the floor, hooped in iron, a coil of rope on the
// lid of the nearer one
function paintBarrel(ctx, L, x, s, rope) {
  const { H } = L;
  const base = P(L, x, L.floorY, s);
  const r = 0.176 * H * s; // its widest
  const h = 0.5 * H * s;
  const kb = (L.floorY * s) / L.f; // how flat its rims look, foot and head
  const kt = ((L.floorY - 0.5 * H) * s) / L.f;
  const topY = base.y - h;
  const rr = r * 0.86; // at the rims
  soft(ctx, base.x + r * 0.2, base.y, r * 1.4, r * kb * 1.2, "0,0,0", 0.6);
  // the body, bulging
  ctx.beginPath();
  ctx.moveTo(base.x - rr, topY);
  ctx.quadraticCurveTo(base.x - r * 1.14, topY + h / 2, base.x - rr, base.y);
  ctx.ellipse(base.x, base.y, rr, rr * kb, 0, Math.PI, 0, true);
  ctx.quadraticCurveTo(base.x + r * 1.14, topY + h / 2, base.x + rr, topY);
  ctx.closePath();
  const g = ctx.createLinearGradient(base.x - r, 0, base.x + r, 0);
  g.addColorStop(0, "#2a1408");
  g.addColorStop(0.3, "#8a5428");
  g.addColorStop(0.55, "#6a3c1a");
  g.addColorStop(1, "#1e0e05");
  ctx.fillStyle = g;
  ctx.fill();
  // the staves
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(20,8,2,0.55)";
  ctx.lineWidth = Math.max(0.8, r * 0.03);
  for (let i = 1; i < 7; i++) {
    const f = -1 + (2 * i) / 7;
    ctx.beginPath();
    ctx.moveTo(base.x + f * rr, topY);
    ctx.quadraticCurveTo(base.x + f * r * 1.12, topY + h / 2, base.x + f * rr, base.y);
    ctx.stroke();
  }
  // its hoops, curving round it
  for (const hy of [0.12, 0.3, 0.7, 0.88]) {
    const yy = topY + h * hy;
    const bulge = 1 + 0.14 * Math.sin(Math.PI * hy);
    const k = kt + (kb - kt) * hy;
    ctx.strokeStyle = "#1a1612";
    ctx.lineWidth = Math.max(1.5, h * 0.04);
    ctx.beginPath();
    ctx.ellipse(base.x, yy, rr * bulge, rr * bulge * k, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "rgba(200,190,170,0.25)";
    ctx.lineWidth = Math.max(0.6, h * 0.008);
    ctx.beginPath();
    ctx.ellipse(base.x, yy - h * 0.012, rr * bulge, rr * bulge * k, 0, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.restore();
  // the head
  ctx.fillStyle = "#4a2a14";
  ctx.beginPath();
  ctx.ellipse(base.x, topY, rr, rr * kt, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1612";
  ctx.lineWidth = Math.max(1.5, h * 0.03);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,200,140,0.1)";
  ctx.beginPath();
  ctx.ellipse(base.x - rr * 0.1, topY - rr * kt * 0.1, rr * 0.8, rr * kt * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!rope) return;
  // a coil of rope lying on it
  const rw = Math.max(2, h * 0.032);
  for (let i = 0; i < 4; i++) {
    const cr = rr * (0.8 - i * 0.17);
    const cy = topY - rw * 0.5 - i * rw * 0.45;
    ctx.strokeStyle = "#2a1a0a";
    ctx.lineWidth = rw * 1.25;
    ctx.beginPath();
    ctx.ellipse(base.x, cy, cr, cr * kt, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#a07a44";
    ctx.lineWidth = rw;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,236,190,0.45)";
    ctx.lineWidth = Math.max(0.8, rw * 0.3);
    ctx.beginPath();
    ctx.ellipse(base.x, cy - rw * 0.25, cr, cr * kt, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  // its end, hanging over the side
  ctx.strokeStyle = "#6a4a26";
  ctx.lineWidth = Math.max(2, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(base.x - rr * 0.6, topY + rr * kt * 0.5);
  ctx.quadraticCurveTo(base.x - r * 1.15, topY + h * 0.15, base.x - r * 1.05, topY + h * 0.42);
  ctx.stroke();
}

// the gun port in the hull, shut, and the cannon run up to it on its
// carriage
function paintCannon(ctx, L) {
  const { H } = L;
  const s = 0.345;
  const axis = 0.72 * H; // the barrel's height in the room
  // the port: a square lid in the planking, hinged at the top
  const half = 0.17 * H;
  const corner = (y, ss) => P(L, -hullAt(L, y), y, ss);
  const tf = corner(axis - half, 0.33);
  const tn = corner(axis - half, 0.362);
  const bn = corner(axis + half, 0.362);
  const bf = corner(axis + half, 0.33);
  // a point on the lid: u from its far edge to its near, v from top to foot
  const at = (u, v) => ({
    x: (1 - u) * (1 - v) * tf.x + u * (1 - v) * tn.x + u * v * bn.x + (1 - u) * v * bf.x,
    y: (1 - u) * (1 - v) * tf.y + u * (1 - v) * tn.y + u * v * bn.y + (1 - u) * v * bf.y,
  });
  const quad = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
  quad([at(-0.12, -0.1), at(1.12, -0.1), at(1.12, 1.1), at(-0.12, 1.1)]);
  ctx.fillStyle = "#24120a";
  ctx.fill();
  quad([tf, tn, bn, bf]);
  const lg = ctx.createLinearGradient(tf.x, 0, tn.x, 0);
  lg.addColorStop(0, "#4a2a14");
  lg.addColorStop(1, "#7a4a24");
  ctx.fillStyle = lg;
  ctx.fill();
  ctx.strokeStyle = "rgba(14,6,2,0.7)";
  ctx.lineWidth = 1;
  for (const u of [0.33, 0.66]) {
    const a = at(u, 0);
    const b = at(u, 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // its iron hinges and ring
  for (const v of [0.18, 0.82]) {
    const a = at(0, v);
    const b = at(0.85, v);
    ctx.strokeStyle = "#141210";
    ctx.lineWidth = Math.max(2, H * 0.012 * s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const ring = at(0.5, 0.5);
  ctx.strokeStyle = "#141210";
  ctx.lineWidth = Math.max(1.5, H * 0.008 * s);
  ctx.beginPath();
  ctx.ellipse(ring.x, ring.y, H * 0.012, H * 0.02, 0, 0, Math.PI * 2);
  ctx.stroke();

  // the cannon, side on, its muzzle at the port
  const px = (x) => L.vp.x + x * s;
  const py = (y) => L.vp.y + y * s;
  const mx = -hullAt(L, axis) + 0.03 * H;
  const len = 0.52 * H;
  const wr = 0.075 * H; // its wheels
  const floor = L.floorY;
  soft(ctx, px(mx + len * 0.55), py(floor), len * s * 0.65, H * 0.02, "0,0,0", 0.65);
  // the carriage: stepped cheeks
  const c0 = mx + 0.1 * H;
  const c1 = mx + len * 0.86;
  const cheek = [
    [c0, axis + 0.02 * H],
    [c0 + 0.12 * H, axis + 0.02 * H],
    [c0 + 0.12 * H, axis + 0.07 * H],
    [c0 + 0.22 * H, axis + 0.07 * H],
    [c0 + 0.22 * H, axis + 0.12 * H],
    [c1, axis + 0.12 * H],
    [c1, floor - wr * 0.7],
    [c0, floor - wr * 0.7],
  ];
  ctx.beginPath();
  cheek.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
  ctx.closePath();
  const cg = ctx.createLinearGradient(0, py(axis), 0, py(floor));
  cg.addColorStop(0, "#7a4a24");
  cg.addColorStop(1, "#3a1e0c");
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = "rgba(14,6,2,0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // the barrel: iron, swelling to the breech, ringed, the knob behind
  const br = (f) => (0.045 + 0.028 * f) * H; // its radius along it, muzzle to breech
  ctx.beginPath();
  ctx.moveTo(px(mx), py(axis - br(0)));
  ctx.lineTo(px(mx + len), py(axis - br(1)));
  ctx.quadraticCurveTo(px(mx + len + 0.05 * H), py(axis), px(mx + len), py(axis + br(1)));
  ctx.lineTo(px(mx), py(axis + br(0)));
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, py(axis - br(1)), 0, py(axis + br(1)));
  bg.addColorStop(0, "#5a606a");
  bg.addColorStop(0.3, "#2a2e36");
  bg.addColorStop(1, "#0a0b0e");
  ctx.fillStyle = bg;
  ctx.fill();
  for (const [f, k] of [
    [0.02, 1.22],
    [0.38, 1.12],
    [0.72, 1.1],
    [0.97, 1.08],
  ]) {
    const rr = br(f) * k;
    ctx.fillStyle = bg;
    ctx.fillRect(px(mx + len * f - 0.012 * H), py(axis - rr), 0.024 * H * s, rr * 2 * s);
  }
  ctx.fillStyle = "#1a1c22";
  ctx.beginPath();
  ctx.arc(px(mx + len + 0.07 * H), py(axis), 0.028 * H * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,220,170,0.25)";
  ctx.fillRect(px(mx), py(axis - br(0) * 0.7), len * s, Math.max(1, H * 0.006 * s));
  // the trunnion and its cap square
  ctx.fillStyle = "#16181c";
  ctx.beginPath();
  ctx.arc(px(mx + len * 0.48), py(axis + 0.01 * H), 0.03 * H * s, 0, Math.PI * 2);
  ctx.fill();
  // the wheels
  for (const wx of [c0 + wr * 0.9, c1 - wr * 0.9]) {
    const cx = px(wx);
    const cy = py(floor - wr);
    const r = wr * s;
    const wg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    wg.addColorStop(0, "#6a4022");
    wg.addColorStop(1, "#24120a");
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#141210";
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.stroke();
    ctx.fillStyle = "#141210";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  // a few balls stacked by it
  for (const [dx, dy] of [
    [0, 0],
    [0.065, 0],
    [0.0325, -0.055],
  ]) {
    const cx = px(c1 + 0.06 * H + dx * H);
    const cy = py(floor - 0.032 * H + dy * H);
    const r = 0.032 * H * s;
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx, cy, r);
    g.addColorStop(0, "#6a707a");
    g.addColorStop(1, "#0c0d10");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the ship's colours, hung from a beam: black cloth, the skull and bones
function paintColours(ctx, L) {
  const { W, H } = L;
  const s = 0.381;
  const top = P(L, 0.47 * W, L.ceilY + 0.13 * H, s);
  const right = P(L, 0.78 * W, L.ceilY + 0.13 * H, s);
  const fw = right.x - top.x;
  const fh = 0.43 * H * s;
  const x0 = top.x;
  const y0 = top.y;
  const wave = (f) => Math.sin(f * Math.PI * 2.2) * fh * 0.025;
  soft(ctx, x0 + fw * 0.55, y0 + fh * 0.6, fw * 0.6, fh * 0.6, "0,0,0", 0.4);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + fw, y0);
  for (let i = 0; i <= 10; i++) {
    const f = i / 10;
    ctx.lineTo(x0 + fw - wave(f) * 0.6 + fw * 0.01 * f, y0 + fh * f);
  }
  for (let i = 10; i >= 0; i--) {
    const f = i / 10;
    ctx.lineTo(x0 + fw * f, y0 + fh + wave(f) + (i % 2 ? fh * 0.02 : 0));
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x0, 0, x0 + fw, 0);
  g.addColorStop(0, "#16161a");
  g.addColorStop(0.35, "#26262c");
  g.addColorStop(0.6, "#121216");
  g.addColorStop(1, "#1e1e24");
  ctx.fillStyle = g;
  ctx.fill();
  // the skull, round and friendly, and the bones crossed under it
  const cx = x0 + fw * 0.5;
  const cy = y0 + fh * 0.4;
  const r = fw * 0.17;
  const ivory = "#e8e2d0";
  ctx.strokeStyle = ivory;
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.32;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.5, cy + r * 0.95 + d * r * 0.7);
    ctx.lineTo(cx + r * 1.5, cy + r * 0.95 - d * r * 0.7);
    ctx.stroke();
    for (const e of [-1, 1]) {
      ctx.fillStyle = ivory;
      ctx.beginPath();
      ctx.arc(cx + e * r * 1.55, cy + r * 0.95 - e * d * r * 0.72 - r * 0.12, r * 0.2, 0, Math.PI * 2);
      ctx.arc(cx + e * r * 1.55, cy + r * 0.95 - e * d * r * 0.72 + r * 0.14, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = ivory;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - r * 0.55, cy + r * 0.5, r * 1.1, r * 0.65, r * 0.18);
  ctx.fill();
  ctx.fillStyle = "#16161a";
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + e * r * 0.38, cy + r * 0.05, r * 0.24, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.32);
  ctx.lineTo(cx + r * 0.1, cy + r * 0.5);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, r * 0.07);
  ctx.strokeStyle = "#16161a";
  for (const e of [-0.2, 0, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(cx + e * r, cy + r * 0.82);
    ctx.lineTo(cx + e * r, cy + r * 1.1);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // the nails it hangs by
  for (const f of [0.06, 0.94]) {
    ctx.fillStyle = "#c9973c";
    ctx.beginPath();
    ctx.arc(x0 + fw * f, y0 + fh * 0.03, Math.max(1.2, H * 0.004), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── the chart table ─────────────────────────────────────────────────────────

// its top running away from us, a rail round three sides to keep things on
// it in a sea, its thick front edge, its legs
function paintTable(ctx, L) {
  const { H } = L;
  const t = L.table;
  const y = L.topY;
  const nl = P(L, -t.hw, y, t.nearS);
  const nr = P(L, t.hw, y, t.nearS);
  const fl = P(L, -t.hw, y, t.farS);
  const fr = P(L, t.hw, y, t.farS);
  const th = t.thick * t.nearS;
  // its shadow on the floor, and the legs
  soft(ctx, (nl.x + nr.x) / 2, nl.y + th + H * 0.06, (nr.x - nl.x) * 0.6, H * 0.08, "0,0,0", 0.7);
  for (const p of [nl, nr]) {
    const lw = H * 0.045;
    const x = p.x + (p === nl ? lw * 0.9 : -lw * 0.9);
    const lg = ctx.createLinearGradient(x - lw / 2, 0, x + lw / 2, 0);
    lg.addColorStop(0, "#1e0e05");
    lg.addColorStop(0.35, "#6a3c1c");
    lg.addColorStop(1, "#1a0b04");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - lw * 0.5, p.y);
    ctx.lineTo(x + lw * 0.5, p.y);
    ctx.lineTo(x + lw * 0.32, H * 1.02);
    ctx.lineTo(x - lw * 0.32, H * 1.02);
    ctx.closePath();
    ctx.fill();
    for (const ry of [0.06, 0.1]) {
      ctx.fillStyle = "rgba(10,4,1,0.6)";
      ctx.fillRect(x - lw * 0.5, p.y + th + H * ry, lw, H * 0.006);
    }
  }
  // the top
  ctx.beginPath();
  ctx.moveTo(fl.x, fl.y);
  ctx.lineTo(fr.x, fr.y);
  ctx.lineTo(nr.x, nr.y);
  ctx.lineTo(nl.x, nl.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, fl.y, 0, nl.y);
  g.addColorStop(0, "#4a2612");
  g.addColorStop(1, "#7a4220");
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
      ctx.strokeStyle = "rgba(20,8,2,0.6)";
      ctx.lineWidth = Math.max(1, H * 0.002);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // the grain of each board
    for (let j = 0; j < 5 && i < n; j++) {
      const gx = x + (2 * t.hw * (0.15 + rnd() * 0.7)) / n;
      const p0 = P(L, gx, y, t.nearS);
      const p1 = P(L, gx + (rnd() - 0.5) * H * 0.02, y, t.farS);
      ctx.strokeStyle = rnd() < 0.6 ? "rgba(30,12,4,0.22)" : "rgba(255,210,160,0.07)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  ctx.restore();
  // the rail round the far end and the sides
  const rail = 0.022 * H;
  const rf = P(L, -t.hw, y - rail, t.farS);
  const rfr = P(L, t.hw, y - rail, t.farS);
  ctx.fillStyle = "#3a1e0c";
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
    ctx.fillStyle = "#6a3a1a";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,210,160,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    // a brass cap on the corner
    ctx.fillStyle = "#c9973c";
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.max(1.5, H * 0.006 * b.s), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,210,160,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rf.x, rf.y);
  ctx.lineTo(rfr.x, rfr.y);
  ctx.stroke();
  // the front edge: thick, moulded, its top catching the light
  const fg = ctx.createLinearGradient(0, nl.y, 0, nl.y + th);
  fg.addColorStop(0, "#b07a48");
  fg.addColorStop(0.15, "#6a3a1a");
  fg.addColorStop(0.6, "#4a2810");
  fg.addColorStop(1, "#24120a");
  ctx.fillStyle = fg;
  ctx.fillRect(nl.x, nl.y, nr.x - nl.x, th);
  ctx.fillStyle = "rgba(10,4,1,0.55)";
  ctx.fillRect(nl.x, nl.y + th * 0.55, nr.x - nl.x, Math.max(1, th * 0.06));
  ctx.fillStyle = "rgba(255,210,160,0.12)";
  ctx.fillRect(nl.x, nl.y + th * 0.62, nr.x - nl.x, Math.max(1, th * 0.04));
}

// a soft shadow where a thing stands on the table, thrown back and to the
// right, away from the lantern
function contact(ctx, p, r, k, a = 0.6) {
  soft(ctx, p.x + r * 0.35, p.y - r * k * 0.25, r * 1.5, r * k * 1.4, "0,0,0", a);
}

// a squat glass inkpot, nearly black with ink, a white quill standing in it
function paintInk(ctx, L, p) {
  const s = 0.065 * L.H * p.s;
  const { x, y } = p;
  contact(ctx, p, s, 0.45);
  const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
  g.addColorStop(0, "#0c0e18");
  g.addColorStop(0.3, "#2a3048");
  g.addColorStop(1, "#05060a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.9, y);
  ctx.quadraticCurveTo(x - s, y - s * 0.8, x - s * 0.45, y - s * 0.9);
  ctx.lineTo(x + s * 0.45, y - s * 0.9);
  ctx.quadraticCurveTo(x + s, y - s * 0.8, x + s * 0.9, y);
  ctx.ellipse(x, y, s * 0.9, s * 0.3, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,220,170,0.45)";
  ctx.fillRect(x - s * 0.6, y - s * 0.75, s * 0.12, s * 0.5);
  ctx.fillStyle = "#3a2a10";
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.95, s * 0.42, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - s * 0.42, y - s * 1.1, s * 0.84, s * 0.15);
  // the quill, leaning back over the inkpot
  ctx.save();
  ctx.translate(x, y - s * 1.05);
  ctx.rotate(-0.45);
  ctx.strokeStyle = "#b8a888";
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -s * 3.2);
  ctx.stroke();
  const vane = ctx.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
  vane.addColorStop(0, "#d8d0c0");
  vane.addColorStop(1, "#fffaf0");
  ctx.fillStyle = vane;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.8);
  ctx.quadraticCurveTo(-s * 0.55, -s * 2.0, -s * 0.1, -s * 3.4);
  ctx.quadraticCurveTo(s * 0.35, -s * 2.4, 0, -s * 0.8);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,100,70,0.5)";
  ctx.lineWidth = 0.7;
  for (let k = 0; k < 9; k++) {
    const yy = -s * (1.0 + k * 0.26);
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(-s * 0.32, yy - s * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

// a little gold: a short stack and a few loose coins
function paintCoins(ctx, L, p) {
  const cr = 0.032 * L.H * p.s;
  const k = (L.topY * p.s) / L.f;
  const coin = (cx, cy, m = 1) => {
    soft(ctx, cx + cr * 0.3, cy + cr * k * 0.3, cr * 1.3, cr * k * 1.2, "0,0,0", 0.5);
    const g = ctx.createLinearGradient(cx - cr, cy - cr, cx + cr, cy + cr);
    g.addColorStop(0, "#fff0a8");
    g.addColorStop(0.5, "#e0a830");
    g.addColorStop(1, "#7a4c08");
    ctx.fillStyle = "#6a4006";
    ctx.beginPath();
    ctx.ellipse(cx, cy + cr * 0.12, cr * m, cr * k * m, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cr * m, cr * k * m, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,56,6,0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cr * 0.7 * m, cr * 0.7 * k * m, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  for (let i = 0; i < 5; i++) coin(p.x, p.y - i * cr * 0.22);
  coin(p.x + cr * 2.3, p.y + cr * 0.5);
  coin(p.x - cr * 2.1, p.y + cr * 0.7, 0.92);
  coin(p.x + cr * 0.9, p.y + cr * 1.2, 0.95);
}

// a brass spyglass lying across the table, from a to b
function paintSpyglass(ctx, L, a0, b0) {
  const ang = Math.atan2(b0.y - a0.y, b0.x - a0.x);
  const len = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const w = 0.045 * L.H * (a0.s + b0.s) * 0.5;
  ctx.save();
  ctx.translate(a0.x, a0.y);
  ctx.rotate(ang);
  soft(ctx, len / 2 + w * 0.3, w * 0.9, len * 0.58, w * 0.7, "0,0,0", 0.6);
  const tube = (from, to, r0, r1, base) => {
    const g = ctx.createLinearGradient(0, -r0, 0, r0);
    g.addColorStop(0, base[0]);
    g.addColorStop(0.35, base[1]);
    g.addColorStop(1, base[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(from, -r0);
    ctx.lineTo(to, -r1);
    ctx.lineTo(to, r1);
    ctx.lineTo(from, r0);
    ctx.closePath();
    ctx.fill();
  };
  const brass = ["#fff0b8", "#c9973c", "#4a300a"];
  // the near end is the bigger: it is nearer
  tube(0, len * 0.42, w * 0.6, w * 0.55, ["#6a3a18", "#3a1c0a", "#140802"]);
  tube(len * 0.42, len * 0.74, w * 0.5, w * 0.46, brass);
  tube(len * 0.74, len, w * 0.42, w * 0.38, brass);
  for (const f of [0, 0.42, 0.74]) tube(len * f, len * f + w * 0.28, w * 0.68 * (1 - f * 0.25), w * 0.66 * (1 - f * 0.25), brass);
  ctx.restore();
}

// an hourglass: two turned wooden ends, three posts, the glass, the sand
// half run through
function paintHourglass(ctx, L, p) {
  const s = p.s;
  const h = 0.3 * L.H * s;
  const r = 0.06 * L.H * s;
  const k = (L.topY * s) / L.f;
  const { x, y } = p;
  contact(ctx, p, r * 1.3, k, 0.55);
  const top = y - h;
  const disc = (cy) => {
    const g = ctx.createLinearGradient(x - r * 1.2, 0, x + r * 1.2, 0);
    g.addColorStop(0, "#3a1e0c");
    g.addColorStop(0.35, "#9a6034");
    g.addColorStop(1, "#24120a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, cy, r * 1.25, r * 1.25 * k, 0, 0, Math.PI);
    ctx.lineTo(x - r * 1.25, cy - h * 0.06);
    ctx.ellipse(x, cy - h * 0.06, r * 1.25, r * 1.25 * k, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7a4a24";
    ctx.beginPath();
    ctx.ellipse(x, cy - h * 0.06, r * 1.25, r * 1.25 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  disc(y);
  // the glass: two bulbs meeting at a waist
  const g0 = top + h * 0.08;
  const g1 = y - h * 0.08;
  const mid = (g0 + g1) / 2;
  const bulb = () => {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, g0);
    ctx.bezierCurveTo(x - r * 1.05, mid - h * 0.18, x - r * 0.1, mid - h * 0.05, x - r * 0.08, mid);
    ctx.bezierCurveTo(x - r * 0.1, mid + h * 0.05, x - r * 1.05, mid + h * 0.18, x - r * 0.9, g1);
    ctx.lineTo(x + r * 0.9, g1);
    ctx.bezierCurveTo(x + r * 1.05, mid + h * 0.18, x + r * 0.1, mid + h * 0.05, x + r * 0.08, mid);
    ctx.bezierCurveTo(x + r * 0.1, mid - h * 0.05, x + r * 1.05, mid - h * 0.18, x + r * 0.9, g0);
    ctx.closePath();
  };
  bulb();
  ctx.fillStyle = "rgba(170,200,230,0.18)";
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the sand: a little left above, a heap below, a thread between
  ctx.fillStyle = "#d8b070";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, mid - h * 0.1);
  ctx.quadraticCurveTo(x, mid - h * 0.12, x + r * 0.6, mid - h * 0.1);
  ctx.lineTo(x, mid);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r, g1);
  ctx.quadraticCurveTo(x, g1 - h * 0.3, x + r, g1);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - Math.max(0.6, r * 0.04), mid, Math.max(1.2, r * 0.08), g1 - mid - h * 0.12);
  ctx.restore();
  bulb();
  ctx.strokeStyle = "rgba(220,235,255,0.45)";
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, g0 + h * 0.06);
  ctx.quadraticCurveTo(x - r * 0.75, mid - h * 0.16, x - r * 0.35, mid - h * 0.07);
  ctx.stroke();
  // the posts: one behind, two in front
  ctx.fillStyle = "#4a2810";
  for (const f of [-1, 1]) {
    ctx.fillRect(x + f * r * 1.05 - r * 0.09, top + h * 0.04, r * 0.18, h * 0.9);
  }
  disc(top + h * 0.06);
}

// a fat candle on a brass saucer, wax run down its side; its flame is the
// scene's
function paintCandle(ctx, L) {
  const c = L.candle;
  const s = c.s;
  const k = (L.topY * s) / L.f;
  const r = 0.03 * L.H * s;
  const sr = r * 2.3;
  contact(ctx, c, sr, k, 0.55);
  // the saucer, its handle ring
  ctx.fillStyle = "#6a4810";
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, sr, sr * k, 0, 0, Math.PI * 2);
  ctx.fill();
  const sg = ctx.createLinearGradient(c.x - sr, 0, c.x + sr, 0);
  sg.addColorStop(0, "#8a6420");
  sg.addColorStop(0.35, "#f0d080");
  sg.addColorStop(1, "#6a4810");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r * 0.2, sr * 0.96, sr * k * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a8802c";
  ctx.lineWidth = Math.max(1.5, r * 0.22);
  ctx.beginPath();
  ctx.ellipse(c.x + sr * 1.15, c.y - r * 0.3, r * 0.55, r * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // the candle
  const top = c.flameY + r * 0.5;
  const cg = ctx.createLinearGradient(c.x - r, 0, c.x + r, 0);
  cg.addColorStop(0, "#c8b48a");
  cg.addColorStop(0.35, "#fff4d8");
  cg.addColorStop(1, "#a08860");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(c.x - r, top);
  ctx.lineTo(c.x - r, c.y - r * 0.3);
  ctx.ellipse(c.x, c.y - r * 0.3, r, r * k, 0, Math.PI, 0, true);
  ctx.lineTo(c.x + r, top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff8e6";
  ctx.beginPath();
  ctx.ellipse(c.x, top, r, r * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // drips
  ctx.fillStyle = "#fff4d8";
  for (const [dx, len] of [
    [-0.7, 0.5],
    [0.35, 0.8],
  ]) {
    ctx.beginPath();
    ctx.roundRect(c.x + dx * r - r * 0.12, top, r * 0.24, (c.y - top) * len * 0.5, r * 0.12);
    ctx.fill();
  }
  // the wick
  ctx.strokeStyle = "#1a1008";
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(c.x, top);
  ctx.lineTo(c.x + r * 0.05, top - r * 0.45);
  ctx.stroke();
  // the light it sheds
  soft(ctx, c.x, c.y, L.W * 0.12, L.H * 0.06, WARM, 0.25, "lighter");
}

// the compass in its box: a square mahogany case with brass corners, the
// brass bowl sunk in its top, the card inside it; the needle and the glass
// are the scene's
function paintCompassBox(ctx, L) {
  const { H } = L;
  const c = L.cmp;
  const q = (dx, y, dz) => P(L, c.x + dx, y, L.f / (c.z + dz));
  const h = c.half;
  const tnl = q(-h, c.boxTop, -h);
  const tnr = q(h, c.boxTop, -h);
  const tfl = q(-h, c.boxTop, h);
  const tfr = q(h, c.boxTop, h);
  const bnl = q(-h, L.topY, -h);
  const bnr = q(h, L.topY, -h);
  // its shadow on the table
  const mid = q(0, L.topY, 0);
  soft(ctx, mid.x + (tnr.x - tnl.x) * 0.12, (bnl.y + tfl.y) / 2 + H * 0.01, (tnr.x - tnl.x) * 0.7, (bnl.y - tfl.y) * 0.62, "0,0,0", 0.7);
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
  // the front
  poly([tnl, tnr, bnr, bnl]);
  const fg = ctx.createLinearGradient(0, tnl.y, 0, bnl.y);
  fg.addColorStop(0, "#7a3a1c");
  fg.addColorStop(1, "#3a160a");
  ctx.fillStyle = fg;
  ctx.fill();
  // a little brass plate on it
  const pw = (tnr.x - tnl.x) * 0.22;
  const ph = (bnl.y - tnl.y) * 0.34;
  ctx.fillStyle = "#c9973c";
  ctx.fillRect((tnl.x + tnr.x) / 2 - pw / 2, (tnl.y + bnl.y) / 2 - ph / 2, pw, ph);
  ctx.fillStyle = "rgba(255,240,190,0.5)";
  ctx.fillRect((tnl.x + tnr.x) / 2 - pw / 2, (tnl.y + bnl.y) / 2 - ph / 2, pw, Math.max(1, ph * 0.18));
  // the top
  poly([tfl, tfr, tnr, tnl]);
  const tg = ctx.createLinearGradient(0, tfl.y, 0, tnl.y);
  tg.addColorStop(0, "#5a2814");
  tg.addColorStop(1, "#8a4624");
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,200,150,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(tnl.x, tnl.y);
  ctx.lineTo(tnr.x, tnr.y);
  ctx.stroke();
  // an inlaid line round the top
  const inset = h * 0.1;
  poly([q(-h + inset, c.boxTop, h - inset), q(h - inset, c.boxTop, h - inset), q(h - inset, c.boxTop, -h + inset), q(-h + inset, c.boxTop, -h + inset)]);
  ctx.strokeStyle = "rgba(230,190,120,0.4)";
  ctx.lineWidth = Math.max(1, H * 0.002);
  ctx.stroke();
  // brass corners
  for (const p of [tfl, tfr, tnl, tnr]) {
    ctx.fillStyle = "#d8a848";
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2, H * 0.008 * p.s), 0, Math.PI * 2);
    ctx.fill();
  }
  // the bowl: its rim, its inside, the card down in it
  const rim = ellipseAt(L, c.x, c.boxTop, c.z, c.rho * 1.14);
  const lip = ellipseAt(L, c.x, c.boxTop, c.z, c.rho * 1.02);
  const card = L.compass;
  ctx.fillStyle = "#3a2406";
  ctx.beginPath();
  ctx.ellipse(rim.x, rim.y + H * 0.004, rim.rx, rim.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const rg = ctx.createLinearGradient(rim.x - rim.rx, rim.y - rim.ry, rim.x + rim.rx, rim.y + rim.ry);
  rg.addColorStop(0, "#fbe3a2");
  rg.addColorStop(0.45, "#c9973c");
  rg.addColorStop(1, "#6a4410");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.ellipse(rim.x, rim.y, rim.rx, rim.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(lip.x, lip.y, lip.rx, lip.ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const ig = ctx.createLinearGradient(0, lip.y - lip.ry, 0, lip.y + lip.ry);
  ig.addColorStop(0, "#8a6420");
  ig.addColorStop(1, "#3a2406");
  ctx.fillStyle = ig;
  ctx.fillRect(lip.x - lip.rx, lip.y - lip.ry, lip.rx * 2, lip.ry * 2);
  const flat = paintCardFlat(card.rw);
  ctx.drawImage(flat, card.x - card.rw, card.y - card.rh, card.rw * 2, card.rh * 2);
  // the rim's shadow on the card's near edge
  soft(ctx, lip.x, lip.y + lip.ry * 0.95, lip.rx, lip.ry * 0.25, "40,24,6", 0.5);
  ctx.restore();
  // the lubber line: the mark at the bowl's head
  ctx.strokeStyle = "#1a1008";
  ctx.lineWidth = Math.max(1.5, H * 0.004);
  ctx.beginPath();
  ctx.moveTo(lip.x, lip.y - lip.ry - (rim.ry - lip.ry) * 0.2);
  ctx.lineTo(lip.x, lip.y - rim.ry * 1.02);
  ctx.stroke();
  // the gimbal's pivots either side
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#e0b050";
    ctx.beginPath();
    ctx.arc(rim.x + side * rim.rx * 1.04, rim.y, Math.max(2, rim.rx * 0.045), 0, Math.PI * 2);
    ctx.fill();
  }
}

// the compass card painted flat, as a round card of radius r
function paintCardFlat(r) {
  const size = Math.ceil(r * 2 * R);
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.scale(R, R);
  paintCard(g, { compass: { x: r, y: r, r } });
  return c;
}

// the lights over everything: the lantern's warmth over the table, the
// moonlight falling in from the window
function paintLight(ctx, L) {
  const { W, H, win } = L;
  soft(ctx, L.lantern.x + W * 0.04, H * 0.32, W * 0.5, H * 0.5, WARM, 0.16, "lighter");
  soft(ctx, W * 0.42, H * 0.8, W * 0.34, H * 0.16, WARM, 0.2, "lighter");
  // the moonlight: a faint shaft through the air from the window, and where
  // it comes down, a cool pool on the table
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.moveTo(win.x - win.hw * 0.6, win.spring);
  ctx.lineTo(win.x + win.hw * 0.9, win.spring);
  ctx.lineTo(win.x + win.hw * 0.1, H * 0.86);
  ctx.lineTo(win.x - win.hw * 1.9, H * 0.86);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, win.spring, 0, H * 0.86);
  g.addColorStop(0, `rgba(${MOON},0)`);
  g.addColorStop(0.45, `rgba(${MOON},0.05)`);
  g.addColorStop(1, `rgba(${MOON},0)`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  soft(ctx, win.x - win.hw * 0.7, H * 0.76, win.hw * 1.5, H * 0.1, MOON, 0.13, "lighter");
}

// a soft vignette over the whole cabin (only where it is painted: the
// window stays open)
function finish(ctx, L) {
  const { W, H } = L;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const R0 = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(W * 0.5, H * 0.5, R0 * 0.35, W * 0.5, H * 0.5, R0 * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(4,2,0,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03);
  ctx.restore();
}

// The compass card: ivory, ruled every degree round its edge — every five
// longer, every ten longer still — numbered every thirty, 0 to 330, with a
// sixteen-point rose in the middle and the four winds lettered N E S W.
function paintCard(ctx, L) {
  const { x, y, r } = L.compass;
  const card = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  card.addColorStop(0, "#fbf4e2");
  card.addColorStop(0.8, "#efe1bf");
  card.addColorStop(1, "#d9c495");
  ctx.fillStyle = card;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const ink = "#2a1a10";
  const navy = "#1f2f5a";
  const red = "#a8231c";
  const at = (deg, rr) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
  };
  // the ruling
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
  // the numbers, every thirty degrees, standing on the ring as on a real card
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
  // the little numbers between, every ten
  ctx.font = `${Math.round(r * 0.05)}px Georgia, "Times New Roman", serif`;
  for (let d = 10; d < 360; d += 10) {
    if (d % 30 === 0) continue;
    const [nx, ny] = at(d, r * 0.79);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate((d * Math.PI) / 180);
    ctx.fillStyle = "rgba(42,26,16,0.75)";
    ctx.fillText(String(d), 0, 0);
    ctx.restore();
  }
  // the rose: eight small points, four middling, the four winds the longest,
  // each point a light half and a dark half
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
  for (let d = 22.5; d < 360; d += 45) point(d, r * 0.3, r * 0.04, "#d8c08a", "#9c7a3a");
  for (let d = 45; d < 360; d += 90) point(d, r * 0.4, r * 0.06, "#e8edf6", navy);
  for (let d = 0; d < 360; d += 90) point(d, r * 0.54, r * 0.08, d === 0 ? "#e06048" : "#f4f1e8", d === 0 ? red : navy);
  ctx.strokeStyle = "rgba(42,26,16,0.5)";
  ctx.lineWidth = Math.max(0.6, r * 0.004);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  // the four winds
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
  // a fleur-de-lis over the north point, as old cards have
  const [fx, fy] = at(0, r * 0.715);
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.moveTo(fx, fy - r * 0.045);
  ctx.quadraticCurveTo(fx + r * 0.02, fy - r * 0.01, fx, fy + r * 0.01);
  ctx.quadraticCurveTo(fx - r * 0.02, fy - r * 0.01, fx, fy - r * 0.045);
  ctx.fill();
  // the card's shadow from the bowl's rim, and the age of it
  const sh = ctx.createRadialGradient(x, y, r * 0.8, x, y, r);
  sh.addColorStop(0, "rgba(60,36,10,0)");
  sh.addColorStop(1, "rgba(60,36,10,0.32)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// The map, folded in three and lying a little askew: old parchment with torn
// edges, a coast showing faintly through it, a twine tied round it, and where
// the last fold closes, a blob of red wax.
function paintFoldedMap(ctx, m) {
  const { x, y, w, h } = m;
  const hw = w / 2;
  const hh = h / 2;
  const rnd = lcg(515);
  soft(ctx, x + w * 0.05, y + h * 0.16, w * 0.62, h * 0.68, "0,0,0", 0.65);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.07);
  // a torn piece of parchment between two x's, the whole height
  const piece = (xa, xb, tornLeft) => {
    const pts = [];
    const jag = () => (rnd() - 0.5) * h * 0.035;
    for (let k = 0; k <= 10; k++) pts.push([xa + ((xb - xa) * k) / 10, -hh + jag()]);
    for (let k = 1; k <= 6; k++) pts.push([xb + jag() * 0.5, -hh + (h * k) / 6]);
    for (let k = 10; k >= 0; k--) pts.push([xa + ((xb - xa) * k) / 10, hh + jag()]);
    for (let k = 5; k >= 1; k--) pts.push([xa + (tornLeft ? jag() : jag() * 0.4), -hh + (h * k) / 6]);
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
  };
  const parchment = (k) => {
    const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
    g.addColorStop(0, rgb(226 * k, 200 * k, 148 * k));
    g.addColorStop(0.55, rgb(204 * k, 168 * k, 108 * k));
    g.addColorStop(1, rgb(156 * k, 118 * k, 66 * k));
    return g;
  };
  piece(-hw, hw, true);
  ctx.fillStyle = parchment(1);
  ctx.fill();
  ctx.strokeStyle = "rgba(96,60,22,0.55)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  for (let k = 0; k < 6; k++) {
    soft(ctx, (rnd() - 0.5) * w, (rnd() - 0.5) * h, w * (0.08 + rnd() * 0.12), h * (0.1 + rnd() * 0.2), "110,70,24", 0.14);
  }
  // a coast drawn on the inside, faint through the paper
  ctx.strokeStyle = "rgba(80,48,18,0.16)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k <= 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    const rr = h * 0.24 * (0.8 + 0.2 * Math.sin(a * 3 + 2));
    const px = -hw * 0.45 + Math.cos(a) * rr * 1.4;
    const py = h * 0.08 + Math.sin(a) * rr;
    if (k) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  // the crease of the first fold
  ctx.strokeStyle = "rgba(90,56,20,0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-hw / 3, -hh);
  ctx.lineTo(-hw / 3 + 1, hh);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,200,0.3)";
  ctx.beginPath();
  ctx.moveTo(-hw / 3 + 2, -hh);
  ctx.lineTo(-hw / 3 + 3, hh);
  ctx.stroke();
  ctx.restore();
  // the last third folded over, lighter where it lifts, its torn edge
  // throwing a little shadow
  soft(ctx, hw / 3 - w * 0.01, 0, w * 0.035, hh * 1.05, "40,20,4", 0.5);
  piece(hw / 3, hw * 1.01, true);
  ctx.fillStyle = parchment(1.06);
  ctx.fill();
  ctx.strokeStyle = "rgba(96,60,22,0.55)";
  ctx.stroke();
  // the twine round it, twisted
  ctx.strokeStyle = "#7a5a30";
  ctx.lineWidth = Math.max(1.5, h * 0.03);
  ctx.beginPath();
  ctx.moveTo(-hw * 1.02, h * 0.02);
  ctx.quadraticCurveTo(0, -h * 0.03, hw * 1.02, h * 0.01);
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,24,8,0.6)";
  ctx.lineWidth = 1;
  for (let k = -12; k <= 12; k++) {
    const px = (k / 12) * hw;
    const py = h * 0.02 - (1 - (px / hw) ** 2) * h * 0.025;
    ctx.beginPath();
    ctx.moveTo(px - h * 0.012, py - h * 0.014);
    ctx.lineTo(px + h * 0.012, py + h * 0.014);
    ctx.stroke();
  }
  // the seal
  const sr = Math.min(w, h) * 0.12;
  const sx = hw / 3;
  const sy = 0;
  const sg = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr);
  sg.addColorStop(0, "#e04a38");
  sg.addColorStop(0.7, "#9a1c14");
  sg.addColorStop(1, "#4a0806");
  ctx.fillStyle = sg;
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = sr * (0.92 + (i % 2) * 0.1);
    if (i) ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    else ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(255,200,180,0.35)";
  ctx.lineWidth = Math.max(0.8, sr * 0.08);
  ctx.beginPath();
  ctx.arc(sx, sy, sr * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// the folded map as it lies on the table: painted flat, then laid down in
// the table's perspective
function paintFolded(L) {
  const m = L.map;
  const fw = m.flatW * 1.4;
  const fh = m.flatH * 1.7;
  const flat = makeCanvas(fw * R, fh * R);
  const g = flat.getContext("2d");
  g.scale(R, R);
  paintFoldedMap(g, { x: fw / 2, y: fh / 2, w: m.flatW, h: m.flatH });
  const c = makeCanvas(fw * (m.w / m.flatW) * R, fh * (m.h / m.flatH) * R);
  c.getContext("2d").drawImage(flat, 0, 0, c.width, c.height);
  return c;
}

// ── the moving things ───────────────────────────────────────────────────────

// The night through the stern window, a little larger than the window so it
// can roll: the sky with its stars and a few moonlit clouds, the moon, an
// island far off with its palms, the sea from the horizon (at the eye) to
// us. The moon's road on the water is a picture of its own, to glitter.
function paintView(L) {
  const { win, vp } = L;
  const w = win.hw * 2 * 1.3;
  const h = (win.sill - win.top) * 1.4;
  const hy = vp.y - (win.cy - h / 2); // the horizon, at the eye
  const sky = makeCanvas(w, h);
  const g = sky.getContext("2d");
  const sg = g.createLinearGradient(0, 0, 0, hy);
  sg.addColorStop(0, "#081430");
  sg.addColorStop(0.6, "#16305a");
  sg.addColorStop(1, "#2e5280");
  g.fillStyle = sg;
  g.fillRect(0, 0, w, hy + 1);
  const rnd = lcg(2024);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(235,240,255,${(0.3 + rnd() * 0.6).toFixed(2)})`;
    g.beginPath();
    g.arc(rnd() * w, rnd() * hy * 0.85, 0.5 + rnd() * 1.1, 0, Math.PI * 2);
    g.fill();
  }
  // the moon
  const mx = w * 0.64;
  const my = hy * 0.6;
  const mr = win.hw * 0.15;
  soft(g, mx, my, mr * 6, mr * 6, "200,215,255", 0.35);
  const mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, "#fffdf2");
  mg.addColorStop(1, "#e8e0c4");
  g.fillStyle = mg;
  g.beginPath();
  g.arc(mx, my, mr, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(190,180,150,0.35)";
  for (const [dx, dy, rr] of [
    [-0.3, -0.2, 0.22],
    [0.25, 0.15, 0.16],
    [-0.05, 0.4, 0.12],
  ]) {
    g.beginPath();
    g.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, Math.PI * 2);
    g.fill();
  }
  // clouds, lit from beneath by the moon
  for (const [cx, cy, cw, ch] of [
    [0.22, 0.32, 0.2, 0.06],
    [0.84, 0.66, 0.16, 0.05],
    [0.45, 0.14, 0.12, 0.035],
  ]) {
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * w * cw * 0.32;
      soft(g, w * cx + ox, hy * cy - Math.abs(ox) * 0.08, w * cw * 0.45, hy * ch * 1.5, "40,60,110", 0.55);
    }
    soft(g, w * cx, hy * cy + hy * ch * 0.6, w * cw, hy * ch * 0.6, "170,190,235", 0.25);
  }
  // the island far off, its palms
  const ix = w * 0.25;
  const iw = w * 0.22;
  const ih = hy * 0.09;
  g.fillStyle = "#0b1730";
  g.beginPath();
  g.moveTo(ix - iw / 2, hy + 1);
  g.bezierCurveTo(ix - iw * 0.32, hy - ih * 1.2, ix + iw * 0.05, hy - ih * 1.5, ix + iw / 2, hy + 1);
  g.closePath();
  g.fill();
  const palm = (px, k, lean) => {
    const top = { x: px + lean * ih * 0.6, y: hy - ih * (1.05 + k) };
    g.strokeStyle = "#0b1730";
    g.lineWidth = Math.max(1.2, ih * 0.1);
    g.beginPath();
    g.moveTo(px, hy - ih * 0.9);
    g.quadraticCurveTo(px + lean * ih * 0.1, top.y + ih * 0.4, top.x, top.y);
    g.stroke();
    g.fillStyle = "#0b1730";
    for (const a of [-2.7, -2.1, -1.4, -0.9, -0.3]) {
      g.beginPath();
      g.moveTo(top.x, top.y);
      g.quadraticCurveTo(top.x + Math.cos(a) * ih * 0.5, top.y + Math.sin(a) * ih * 0.5 - ih * 0.12, top.x + Math.cos(a) * ih * 0.85, top.y + Math.sin(a) * ih * 0.55 + ih * 0.25);
      g.quadraticCurveTo(top.x + Math.cos(a) * ih * 0.4, top.y + Math.sin(a) * ih * 0.3, top.x, top.y);
      g.fill();
    }
  };
  palm(ix - iw * 0.08, 0.55, -1);
  palm(ix + iw * 0.06, 0.35, 1);
  // the sea
  const seaG = g.createLinearGradient(0, hy, 0, h);
  seaG.addColorStop(0, "#1c3a66");
  seaG.addColorStop(1, "#06122a");
  g.fillStyle = seaG;
  g.fillRect(0, hy, w, h - hy);
  g.fillStyle = "rgba(190,210,250,0.4)";
  g.fillRect(0, hy - 0.5, w, 1.2);
  for (let i = 0; i < 80; i++) {
    const f = Math.pow(rnd(), 1.4);
    const yy = hy + 3 + f * (h - hy - 3);
    const len = 3 + f * w * 0.08;
    const xx = rnd() * w;
    g.strokeStyle = `rgba(140,175,235,${(0.12 + rnd() * 0.18).toFixed(2)})`;
    g.lineWidth = 0.6 + f * 1.2;
    g.beginPath();
    g.moveTo(xx, yy);
    g.quadraticCurveTo(xx + len / 2, yy - 1 - f * 2, xx + len, yy);
    g.stroke();
  }
  // the moon's road, on its own
  const glitter = makeCanvas(w, h);
  const gg = glitter.getContext("2d");
  soft(gg, mx, hy + (h - hy) * 0.4, w * 0.07, (h - hy) * 0.5, "220,230,255", 0.25);
  for (let i = 0; i < 90; i++) {
    const f = Math.pow(rnd(), 1.2);
    const yy = hy + 2 + f * (h - hy - 4);
    const spread = w * (0.01 + f * 0.09);
    const xx = mx + (rnd() - 0.5) * spread * 2;
    gg.fillStyle = `rgba(255,250,225,${(0.35 + rnd() * 0.55).toFixed(2)})`;
    gg.fillRect(xx, yy, 2 + f * 10 * rnd(), 0.8 + f * 1.4);
  }
  return { sky, glitter, w, h };
}

// a candle flame: white at the heart, gold, a little orange at its tip;
// origin at its foot
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

// the glass over the card, as it lies in the bowl (an ellipse): the lantern
// caught in it, a broad soft sheen
function paintGlass(el) {
  const r = el.rx;
  const size = Math.ceil(r * 2 * R);
  const flat = makeCanvas(size, size);
  const g = flat.getContext("2d");
  g.scale(R, R);
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.clip();
  const sheen = g.createLinearGradient(0, 0, r * 2, r * 2);
  sheen.addColorStop(0, "rgba(255,250,235,0.24)");
  sheen.addColorStop(0.35, "rgba(255,250,235,0.04)");
  sheen.addColorStop(1, "rgba(255,250,235,0)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, r * 2, r * 2);
  g.strokeStyle = "rgba(255,240,210,0.45)";
  g.lineWidth = r * 0.035;
  g.lineCap = "round";
  g.beginPath();
  g.arc(r, r, r * 0.9, Math.PI * 1.08, Math.PI * 1.38);
  g.stroke();
  const spot = g.createRadialGradient(r * 0.45, r * 0.4, 0, r * 0.45, r * 0.4, r * 0.18);
  spot.addColorStop(0, "rgba(255,226,170,0.6)");
  spot.addColorStop(1, "rgba(255,226,170,0)");
  g.fillStyle = spot;
  g.fillRect(0, 0, r * 2, r * 2);
  const c = makeCanvas(el.rx * 2 * R, el.ry * 2 * R);
  c.getContext("2d").drawImage(flat, 0, 0, c.width, c.height);
  return c;
}

// The needle: long and slender, its north half red and its south half
// steel-blue, a brass cap on its pivot. Painted pointing up, its origin on
// the pivot; `shadow` paints it as its soft dark shadow instead.
function paintNeedle(r, shadow) {
  const len = r * 0.8;
  const tail = r * 0.6;
  const wid = r * 0.075;
  const pad = r * 0.06;
  const w = Math.ceil((wid * 2 + pad * 2) * R);
  const h = Math.ceil((len + tail + pad * 2) * R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = wid + pad;
  const cy = len + pad;
  if (shadow) {
    g.filter = `blur(${(r * 0.012).toFixed(1)}px)`;
    g.fillStyle = "rgba(20,10,4,0.45)";
    g.beginPath();
    g.moveTo(cx, cy - len);
    g.lineTo(cx + wid, cy);
    g.lineTo(cx, cy + tail);
    g.lineTo(cx - wid, cy);
    g.closePath();
    g.fill();
    return { canvas: c, oy: cy / (len + tail + pad * 2) };
  }
  const half = (dir, light, dark) => {
    // each half a lozenge, lit on its left side
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
  g.strokeStyle = "rgba(30,10,4,0.6)";
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(cx, cy - len);
  g.lineTo(cx + wid, cy);
  g.lineTo(cx, cy + tail);
  g.lineTo(cx - wid, cy);
  g.closePath();
  g.stroke();
  const cap = g.createRadialGradient(cx - wid * 0.3, cy - wid * 0.3, 0, cx, cy, wid * 0.85);
  cap.addColorStop(0, "#fff0b8");
  cap.addColorStop(0.6, "#c9973c");
  cap.addColorStop(1, "#5a3a0c");
  g.fillStyle = cap;
  g.beginPath();
  g.arc(cx, cy, wid * 0.85, 0, Math.PI * 2);
  g.fill();
  return { canvas: c, oy: cy / (len + tail + pad * 2) };
}

// A ship's lantern on a short chain: tank, a glass chimney full of flame
// behind its wire guards, a ventilated cap and a ring. Origin on the hook.
function paintLantern(lan) {
  const s = lan.s;
  const chain = lan.len;
  const bw = 34 * s; // the body's width
  const w = Math.ceil((bw * 1.6) * R);
  const h = Math.ceil((chain + 80 * s) * R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = (bw * 1.6) / 2;
  // the chain
  g.strokeStyle = "#2c2418";
  g.lineWidth = Math.max(1.2, 2 * s);
  for (let y = 4 * s; y < chain - 4 * s; y += 7 * s) {
    g.beginPath();
    g.ellipse(cx, y, 2.2 * s, 3.6 * s, 0, 0, Math.PI * 2);
    g.stroke();
  }
  const top = chain;
  // the ring and the cap
  g.strokeStyle = "#3a3020";
  g.lineWidth = 2.4 * s;
  g.beginPath();
  g.arc(cx, top + 2 * s, 5 * s, 0, Math.PI * 2);
  g.stroke();
  const metal = (x0, x1) => {
    const mg = g.createLinearGradient(x0, 0, x1, 0);
    mg.addColorStop(0, "#1a1410");
    mg.addColorStop(0.35, "#5a4630");
    mg.addColorStop(0.55, "#b8925a");
    mg.addColorStop(1, "#1a1008");
    return mg;
  };
  g.fillStyle = metal(cx - bw * 0.5, cx + bw * 0.5);
  g.beginPath();
  g.moveTo(cx - bw * 0.2, top + 6 * s);
  g.lineTo(cx + bw * 0.2, top + 6 * s);
  g.lineTo(cx + bw * 0.55, top + 18 * s);
  g.lineTo(cx - bw * 0.55, top + 18 * s);
  g.closePath();
  g.fill();
  // the glass and its flame
  const gy0 = top + 18 * s;
  const gy1 = top + 56 * s;
  const glass = g.createRadialGradient(cx, (gy0 + gy1) / 2, 1, cx, (gy0 + gy1) / 2, bw * 0.6);
  glass.addColorStop(0, "#fff6d8");
  glass.addColorStop(0.35, "#ffcf7a");
  glass.addColorStop(1, "#b0602a");
  g.fillStyle = glass;
  g.beginPath();
  g.moveTo(cx - bw * 0.4, gy0);
  g.bezierCurveTo(cx - bw * 0.62, gy0 + 10 * s, cx - bw * 0.62, gy1 - 10 * s, cx - bw * 0.4, gy1);
  g.lineTo(cx + bw * 0.4, gy1);
  g.bezierCurveTo(cx + bw * 0.62, gy1 - 10 * s, cx + bw * 0.62, gy0 + 10 * s, cx + bw * 0.4, gy0);
  g.closePath();
  g.fill();
  g.fillStyle = "#fffdf0";
  g.beginPath();
  g.ellipse(cx, (gy0 + gy1) / 2 + 4 * s, 2.2 * s, 6 * s, 0, 0, Math.PI * 2);
  g.fill();
  // the wire guards
  g.strokeStyle = "#2a2018";
  g.lineWidth = 1.4 * s;
  for (const f of [-0.42, 0, 0.42]) {
    g.beginPath();
    g.moveTo(cx + bw * f, gy0);
    g.quadraticCurveTo(cx + bw * f * 1.45, (gy0 + gy1) / 2, cx + bw * f, gy1);
    g.stroke();
  }
  // the tank
  g.fillStyle = metal(cx - bw * 0.55, cx + bw * 0.55);
  g.beginPath();
  g.moveTo(cx - bw * 0.48, gy1);
  g.lineTo(cx + bw * 0.48, gy1);
  g.lineTo(cx + bw * 0.55, gy1 + 14 * s);
  g.lineTo(cx - bw * 0.55, gy1 + 14 * s);
  g.closePath();
  g.fill();
  const flameDrop = (gy0 + gy1) / 2 + 2 * s; // from the hook down to the flame
  return { canvas: c, oy: 0, flameDrop };
}

// The map, unfolded: old parchment with its fold creases and stains, a
// little island drawn in the corner with a dotted way to an X and a chest,
// a compass mark in the corner; the lines of bearings are the scene's text,
// written on it where `lines` says.
function paintSheet(L) {
  const { W, H } = L;
  const w = Math.min(W * 0.72, H * 1.05, 820);
  const h = w * 0.68;
  const c = makeCanvas(w * R, h * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const rnd = lcg(4242);
  // the paper, its edges torn
  const edge = [];
  const jag = () => (rnd() - 0.5) * w * 0.012;
  for (let x = 0; x <= w; x += w / 40) edge.push([x, h * 0.02 + jag()]);
  for (let y = 0; y <= h; y += h / 28) edge.push([w * 0.985 + jag(), y]);
  for (let x = w; x >= 0; x -= w / 40) edge.push([x, h * 0.98 + jag()]);
  for (let y = h; y >= 0; y -= h / 28) edge.push([w * 0.015 + jag(), y]);
  g.beginPath();
  edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  const paper = g.createRadialGradient(w * 0.45, h * 0.45, w * 0.1, w * 0.5, h * 0.5, w * 0.62);
  paper.addColorStop(0, "#f4e6c2");
  paper.addColorStop(0.7, "#e2c995");
  paper.addColorStop(1, "#b8955c");
  g.fillStyle = paper;
  g.fill();
  g.save();
  g.clip();
  // stains and age
  for (let i = 0; i < 14; i++) {
    soft(g, rnd() * w, rnd() * h, w * (0.04 + rnd() * 0.1), h * (0.03 + rnd() * 0.08), "140,96,40", 0.08 + rnd() * 0.07);
  }
  // the fold creases, a cross
  for (const [x0, y0, x1, y1] of [
    [w / 2, 0, w / 2, h],
    [0, h / 2, w, h / 2],
  ]) {
    g.strokeStyle = "rgba(110,76,34,0.35)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.strokeStyle = "rgba(255,248,226,0.4)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0 + 1.5, y0 + 1.5);
    g.lineTo(x1 + 1.5, y1 + 1.5);
    g.stroke();
  }
  // the island, bottom right: a coast, palms, a dotted way to an X and a chest
  const ix = w * 0.78;
  const iy = h * 0.74;
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
  // the sea's lines round it
  g.strokeStyle = "rgba(70,44,18,0.35)";
  g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const wx = ix - ir * 1.6 + rnd() * ir * 3.2;
    const wy = iy - ir * 0.9 + rnd() * ir * 1.8;
    if (Math.hypot((wx - ix) / 1.25, (wy - iy) / 0.7) < ir * 1.05) continue;
    g.beginPath();
    g.moveTo(wx, wy);
    g.quadraticCurveTo(wx + 5, wy - 3, wx + 10, wy);
    g.quadraticCurveTo(wx + 15, wy + 3, wx + 20, wy);
    g.stroke();
  }
  // a palm
  const palm = (px, py, k) => {
    g.strokeStyle = "rgba(70,44,18,0.9)";
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(px, py);
    g.quadraticCurveTo(px + 3 * k, py - 10 * k, px + 1 * k, py - 20 * k);
    g.stroke();
    for (const a of [-2.6, -2.0, -1.2, -0.5]) {
      g.beginPath();
      g.moveTo(px + 1 * k, py - 20 * k);
      g.quadraticCurveTo(px + 1 * k + Math.cos(a) * 7 * k, py - 20 * k + Math.sin(a) * 7 * k - 3 * k, px + 1 * k + Math.cos(a) * 12 * k, py - 20 * k + Math.sin(a) * 12 * k + 2 * k);
      g.stroke();
    }
  };
  palm(ix - ir * 0.7, iy - ir * 0.05, w / 700);
  palm(ix - ir * 0.45, iy + ir * 0.15, w / 820);
  // the ship, out at sea: a hull, three sails, a pennant, its waves
  const sx = w * 0.4;
  const sy = h * 0.83;
  const k = w / 700;
  g.strokeStyle = "rgba(70,44,18,0.9)";
  g.fillStyle = "rgba(196,160,96,0.5)";
  g.lineWidth = 1.4;
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(sx - 26 * k, sy - 8 * k);
  g.lineTo(sx + 28 * k, sy - 8 * k);
  g.quadraticCurveTo(sx + 20 * k, sy + 4 * k, sx + 14 * k, sy + 5 * k);
  g.lineTo(sx - 18 * k, sy + 5 * k);
  g.quadraticCurveTo(sx - 24 * k, sy, sx - 26 * k, sy - 8 * k);
  g.fill();
  g.stroke();
  for (const [mx, top, sw] of [
    [-10, 40, 11],
    [4, 48, 13],
    [16, 34, 9],
  ]) {
    g.beginPath();
    g.moveTo(sx + mx * k, sy - 8 * k);
    g.lineTo(sx + mx * k, sy - top * k);
    g.stroke();
    g.beginPath();
    g.moveTo(sx + (mx - sw * 0.5) * k, sy - (top - 4) * k);
    g.quadraticCurveTo(sx + (mx + sw * 0.9) * k, sy - top * 0.62 * k, sx + (mx - sw * 0.5) * k, sy - 13 * k);
    g.lineTo(sx + (mx + sw * 0.5) * k, sy - 13 * k);
    g.quadraticCurveTo(sx + (mx + sw * 1.3) * k, sy - top * 0.62 * k, sx + (mx + sw * 0.5) * k, sy - (top - 4) * k);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = "rgba(160,28,20,0.85)";
  g.beginPath();
  g.moveTo(sx + 4 * k, sy - 48 * k);
  g.lineTo(sx + 16 * k, sy - 45 * k);
  g.lineTo(sx + 4 * k, sy - 42 * k);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(70,44,18,0.45)";
  for (const [dx, dy] of [
    [-38, 9],
    [-6, 11],
    [26, 9],
  ]) {
    g.beginPath();
    g.moveTo(sx + dx * k, sy + dy * k);
    g.quadraticCurveTo(sx + (dx + 6) * k, sy + (dy - 4) * k, sx + (dx + 12) * k, sy + dy * k);
    g.quadraticCurveTo(sx + (dx + 18) * k, sy + (dy + 4) * k, sx + (dx + 24) * k, sy + dy * k);
    g.stroke();
  }
  // the dotted way from the ship to the X
  g.setLineDash([3, 4]);
  g.strokeStyle = "rgba(90,30,16,0.85)";
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(sx + 32 * k, sy - 2 * k);
  g.bezierCurveTo(ix - ir * 1.2, iy + ir * 0.9, ix - ir * 0.6, iy + ir * 0.1, ix - ir * 0.25, iy + ir * 0.05);
  g.bezierCurveTo(ix + ir * 0.05, iy, ix + ir * 0.15, iy - ir * 0.35, ix + ir * 0.42, iy - ir * 0.08);
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
  // the chest beside the X
  const chx = xx + ir * 0.42;
  const chy = xy + ir * 0.02;
  const cw = ir * 0.42;
  const chh = cw * 0.6;
  g.fillStyle = "#8a4a1c";
  g.strokeStyle = "rgba(50,24,8,0.9)";
  g.lineWidth = 1.2;
  g.fillRect(chx - cw / 2, chy - chh / 2, cw, chh);
  g.strokeRect(chx - cw / 2, chy - chh / 2, cw, chh);
  g.beginPath();
  g.moveTo(chx - cw / 2, chy - chh / 2);
  g.quadraticCurveTo(chx, chy - chh * 1.2, chx + cw / 2, chy - chh / 2);
  g.closePath();
  g.fillStyle = "#a35a24";
  g.fill();
  g.stroke();
  g.fillStyle = "#e0b040";
  g.fillRect(chx - cw * 0.08, chy - chh * 0.55, cw * 0.16, chh * 0.4);
  for (const [dx, dy] of [
    [-0.25, -0.62],
    [0.1, -0.75],
    [0.3, -0.6],
  ]) {
    g.fillStyle = "#f0c84a";
    g.beginPath();
    g.arc(chx + cw * dx, chy + chh * dy, cw * 0.07, 0, Math.PI * 2);
    g.fill();
  }
  // a compass mark, top right: an arrow and N
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
  g.fillStyle = "rgba(70,44,18,0.85)";
  g.beginPath();
  g.moveTo(nx, ny + nr * 1.25);
  g.lineTo(nx + nr * 0.3, ny);
  g.lineTo(nx - nr * 0.3, ny);
  g.closePath();
  g.fill();
  g.font = `700 ${Math.round(nr * 0.8)}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("N", nx, ny - nr * 1.75);
  g.restore();
  // the edges a little darker, burnt with age
  g.strokeStyle = "rgba(110,70,28,0.5)";
  g.lineWidth = 2;
  g.beginPath();
  edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.stroke();
  // where the scene writes the lines: one under another, on the left
  const lines = COMPASS_BEARINGS.map((_, i) => ({ y: h * (0.17 + i * 0.13) }));
  return { canvas: c, w, h, lines, textX: w * 0.08 };
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
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgbs},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

// painted on the CPU: drawn once and handed to WebGL as a plain copy, where
// a GPU canvas would stall to sync
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
