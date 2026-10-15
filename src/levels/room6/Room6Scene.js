import PlainRoomScene from "../house/plainRoom.js";
import { soft, makeCanvas } from "../../shared/paint.js";
import { WARM, block, fillPoly, footShadow, onWall, thingAt } from "../house/roomKit.js";
import { FLAG_CODES, paintDesign } from "../flags/flagDesigns.js";
import { GAME_LIDS, polygonVertices } from "../kinetic/puzzle.js";
import { paintHurricaneLantern } from "../../shared/hurricaneLantern.js";

// ─────────────────────────────────────────────────────────────────────────────
// Room 6, the last along the hall: grey-green plaster under a coffered
// ceiling, bare boards, the tall arched window (see house/RoomScene.js for
// what every room does). Three puzzles are found in it. In the left-hand
// corner a pool table under its lamp, three green shades on a brass bar, and
// along the wall over it a long line of flags; by the window a tall games
// cupboard, its doors open, the storm lantern on top of it; and in the
// right-hand corner a staircase going up through the ceiling. Each puzzle has
// its light — the lamp over the table, the little brass light over the
// flags, the lantern on the cupboard — which burns until it is solved.
// ─────────────────────────────────────────────────────────────────────────────

export default class Room6Scene extends PlainRoomScene {
  constructor() {
    super("Room6", {
      style: {
        wall: "plaster", near: "#222a28", far: "#101514", back: "#161c1b", rail: 0,
        dado: { near: "#1c1814", far: "#0e0c0a", back: "#14110e", rail: "#2e2620", railFar: "#16120f", railBack: "#221c17" },
        floor: "boards", floorNear: "#2a2118", floorFar: "#14100b", ceiling: "coffers", ceilingCol: "#0d0f0f", window: "arch",
      },
      window: { x: -0.3, hw: 0.17, top: 288, sill: 104 },
      hearth: null,
      chest: null,
      rug: ["#1c1a12", "#6a6040", "#2a2616"],
    });
  }

  layout(W, H, levels) {
    const L = super.layout(W, H);
    const { Q, half: hx } = L;
    const lit = (id) => !levels.isCompleted(levels.indexOf(id));
    L.on = { pool: lit("billiards"), flags: lit("flags"), games: lit("kinetic") };
    // the pool table in the left-hand corner, and its lamp
    const t = (L.pool = { x0: -hx + 24, x1: -hx + 220, d0: 452, d1: 556, h: 82 });
    const tc = (t.x0 + t.x1) / 2;
    L.poolLamp = { y: 168, d: (t.d0 + t.d1) / 2, x: tc, xs: [tc - 58, tc, tc + 58] };
    // the flags in a long line along the left-hand wall, over the table
    L.flagLine = { d0: 392, d1: 598, y0: 146, y1: 212 };
    // the games cupboard between the window and the stairs, the lantern on it
    const gc = (L.games = { x0: 0.02 * hx, x1: 0.02 * hx + 104, d0: 556, d1: 598, h: 190 });
    L.lantern = { x: gc.x0 + 74, y: gc.h, d: (gc.d0 + gc.d1) / 2 };
    // the stairs in the right-hand corner, going up through the ceiling
    L.stairs = { x0: hx - 100, x1: hx, d0: 372, d1: 600, n: 15 };
    L.things = [
      thingAt("billiards", "Look at the pool table", [Q(t.x0, 48, t.d0), Q(t.x1, 48, t.d0), Q(t.x1 + 5, t.h + 1, t.d1 + 5), Q(t.x0 - 5, t.h + 1, t.d1 + 5)]),
      thingAt("kinetic", "Look in the games cupboard", [Q(gc.x0, 4, gc.d0), Q(gc.x1, 4, gc.d0), Q(gc.x1, gc.h, gc.d0), Q(gc.x0, gc.h, gc.d0)]),
      thingAt("flags", "Look at the flags", [Q(-hx, 148, 392), Q(-hx, 148, 598), Q(-hx, 210, 598), Q(-hx, 210, 392)]),
    ];
    // where the room's lights are, for the dark and for the scene; and the
    // warm light coming down the stairs from the floor above
    const st = L.stairs, sm = Q((st.x0 + st.x1) / 2, L.top * 0.55, (st.d0 + st.d1) / 2 + 30);
    const ln = Q(L.lantern.x, L.lantern.y + 11.6, L.lantern.d);
    const pl = Q(tc, 150, L.poolLamp.d), fl = Q(-hx + 4, 176, 480);
    L.glows = {
      pool: L.poolLamp.xs.map((x) => { const p = Q(x, L.poolLamp.y - 8, L.poolLamp.d); return { x: p.x, y: p.y, r: 46 * p.s }; }),
      flags: { x: fl.x, y: fl.y, r: 90 * fl.s },
      games: { x: ln.x, y: ln.y, r: 70 * ln.s },
    };
    const tp = Q(tc, t.h, L.poolLamp.d);
    L.detailLights = [
      { x: tp.x, y: tp.y - 20 * tp.s, rx: 180 * tp.s, ry: 90 * tp.s, k: L.on.pool ? 0.95 : 0.35 },
      { x: pl.x, y: pl.y, rx: 140 * pl.s, ry: 40 * pl.s, k: L.on.pool ? 0.6 : 0.2 },
      { x: fl.x, y: fl.y, rx: 110 * fl.s, ry: 70 * fl.s, k: L.on.flags ? 0.8 : 0.3 },
      { x: ln.x, y: ln.y + 50 * ln.s, rx: 110 * ln.s, ry: 150 * ln.s, k: L.on.games ? 0.85 : 0.3 },
      { x: sm.x, y: sm.y, rx: 160 * sm.s, ry: 260 * sm.s, k: 0.6 },
    ];
    return L;
  }

  paintDetails(ctx, L) {
    paintFlags(ctx, L);
    paintStairs(ctx, L);
    paintGamesCupboard(ctx, L);
    paintPoolTable(ctx, L);
    paintPoolLamp(ctx, L);
  }

  live(L, k, glow) {
    super.live(L, k);
    // each light while it burns, breathing very slightly
    const lights = [];
    if (L.on.pool) for (const g of L.glows.pool) lights.push([g, 0.2, 0xffd08a]);
    if (L.on.flags) lights.push([L.glows.flags, 0.14, 0xffc078]);
    if (L.on.games) lights.push([L.glows.games, 0.2, 0xffb070]);
    for (const [at, a, tint] of lights) {
      const lamp = glow(at, a, tint);
      this.ambientTween({ targets: lamp, alpha: { from: a * 0.85, to: a * 1.2 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }
}

// ── painting ────────────────────────────────────────────────────────────────

const grad = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};

// The pool table: six stout legs, a deep mahogany apron, broad polished
// rails with their sights, the green baize, six pockets; the balls racked at
// the far end and the white at the near; a cue lying along the rail.
function paintPoolTable(ctx, L) {
  const { Q } = L, t = L.pool, h = t.h, on = L.on.pool;
  const wood = { side: "#2a1208", top: "#6a3218", front: "#3e1a0c" };
  footShadow(ctx, L, t, 0.8);
  for (const d of [t.d1 - 14, t.d0 + 3]) {
    for (const x of [t.x0 + 4, (t.x0 + t.x1) / 2 - 7, t.x1 - 18]) {
      block(ctx, L, { x0: x - 1.5, x1: x + 15.5, y0: 0, y1: 5, d0: d - 1.5, d1: d + 12.5 }, wood);
      block(ctx, L, { x0: x, x1: x + 14, y0: 5, y1: 50, d0: d, d1: d + 11 }, wood);
    }
  }
  block(ctx, L, { x0: t.x0, x1: t.x1, y0: 48, y1: h - 6, d0: t.d0, d1: t.d1 }, wood);
  fillPoly(ctx, [Q(t.x0, 52, t.d0 - 0.2), Q(t.x1, 52, t.d0 - 0.2), Q(t.x1, 53.4, t.d0 - 0.2), Q(t.x0, 53.4, t.d0 - 0.2)], "rgba(255,190,140,0.12)");
  // the rails, the baize inside them
  const r = 7;
  block(ctx, L, { x0: t.x0 - 5, x1: t.x1 + 5, y0: h - 6, y1: h, d0: t.d0 - 5, d1: t.d1 + 5 }, { side: "#2e1409", top: "#5a2810", front: "#3a180a" });
  fillPoly(ctx, [Q(t.x0 + 2, h + 0.1, t.d0 + 2), Q(t.x1 - 2, h + 0.1, t.d0 + 2), Q(t.x1 - 2, h + 0.1, t.d1 - 2), Q(t.x0 + 2, h + 0.1, t.d1 - 2)], "#134a2a");
  const bz = Q((t.x0 + t.x1) / 2, h, (t.d0 + t.d1) / 2);
  ctx.save();
  ctx.beginPath();
  [Q(t.x0 + r, h + 0.2, t.d0 + r), Q(t.x1 - r, h + 0.2, t.d0 + r), Q(t.x1 - r, h + 0.2, t.d1 - r), Q(t.x0 + r, h + 0.2, t.d1 - r)].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = "#1d6a3c";
  ctx.fill();
  ctx.clip();
  if (on) soft(ctx, bz.x, bz.y, 110 * bz.s, 28 * bz.s, "120,220,140", 0.35, "lighter");
  ctx.restore();
  fillPoly(ctx, [Q(t.x0 - 5, h, t.d0 - 5), Q(t.x1 + 5, h, t.d0 - 5), Q(t.x1 + 5, h - 0.8, t.d0 - 5), Q(t.x0 - 5, h - 0.8, t.d0 - 5)], on ? "rgba(255,210,160,0.3)" : "rgba(255,210,160,0.12)");
  for (let i = 1; i < 8; i++) {
    const p = Q(t.x0 + ((t.x1 - t.x0) * i) / 8, h + 0.3, t.d0 - 1.5);
    ctx.fillStyle = "#e8dcc0"; ctx.beginPath(); ctx.arc(p.x, p.y, 0.7 * p.s, 0, Math.PI * 2); ctx.fill();
  }
  for (const [x, d] of [[t.x0 + 1, t.d0 + 1], [(t.x0 + t.x1) / 2, t.d0 - 0.5], [t.x1 - 1, t.d0 + 1], [t.x0 + 1, t.d1 - 1], [(t.x0 + t.x1) / 2, t.d1 + 0.5], [t.x1 - 1, t.d1 - 1]]) {
    const p = Q(x, h + 0.3, d), e = Q(x, h + 0.3, d + 4);
    ctx.fillStyle = "#050302";
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 4.6 * p.s, Math.max(1.2, Math.abs(p.y - e.y) * 1.15), 0, 0, Math.PI * 2); ctx.fill();
  }
  const ball = (x, d, col, stripe) => {
    const p = Q(x, h + 2.9, d), rr = 2.9 * p.s;
    soft(ctx, p.x + rr * 0.3, p.y + rr * 0.9, rr * 1.1, rr * 0.4, "0,0,0", 0.6);
    ctx.fillStyle = stripe ? "#efe8d8" : col;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
    if (stripe) { ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(p.x - rr, p.y - rr * 0.45, rr * 2, rr * 0.9); ctx.restore(); }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.arc(p.x - rr * 0.35, p.y - rr * 0.4, rr * 0.28, 0, Math.PI * 2); ctx.fill();
  };
  const cols = ["#e8b820", "#2a4ec0", "#c8281c", "#5a2a90", "#e0701c", "#1c7a3a", "#7a1e1a", "#151515"];
  const rack = [];
  for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) rack.push([t.x1 - 46 + row * 5.1, (t.d0 + t.d1) / 2 + (i - row / 2) * 5.9]);
  rack.sort((a, b) => b[1] - a[1]);
  rack.forEach(([x, d], i) => ball(x, d, cols[(i * 3) % 8], i % 3 === 1));
  ball(t.x0 + 48, (t.d0 + t.d1) / 2 + 6, "#f4efe2", false);
  const c0 = Q(t.x0 + 14, h + 1.2, t.d0 - 2.5), c1 = Q(t.x1 - 30, h + 1.2, t.d0 - 2.5);
  ctx.lineCap = "round";
  ctx.strokeStyle = grad(ctx, c0.x, 0, c1.x, 0, [[0, "#2a160a"], [0.4, "#8a5a2a"], [1, "#e0c896"]]);
  ctx.lineWidth = 1.6 * c0.s;
  ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.stroke();
  ctx.strokeStyle = "#3a6ab0"; ctx.lineWidth = 1.2 * c1.s;
  ctx.beginPath(); ctx.moveTo(c1.x - 1.5 * c1.s, c1.y); ctx.lineTo(c1.x, c1.y); ctx.stroke();
  ctx.lineCap = "butt";
}

// The lamp over the table: a brass bar on two chains from the ceiling, three
// green glass shades on it, lit under while its puzzle waits.
function paintPoolLamp(ctx, L) {
  const { Q } = L, lp = L.poolLamp, on = L.on.pool, y = lp.y;
  const a = Q(lp.x - 78, y + 10, lp.d), b = Q(lp.x + 78, y + 10, lp.d), s = a.s;
  ctx.strokeStyle = "#2c2418"; ctx.lineWidth = Math.max(1, 0.5 * s);
  for (const x of [lp.x - 66, lp.x + 66]) {
    const p = Q(x, y + 10, lp.d), q = Q(x, L.top, lp.d);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.strokeStyle = "#7a5a26"; ctx.lineWidth = 1.6 * s;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.strokeStyle = "rgba(255,226,150,0.5)"; ctx.lineWidth = 0.5 * s;
  ctx.beginPath(); ctx.moveTo(a.x, a.y - 0.6 * s); ctx.lineTo(b.x, b.y - 0.6 * s); ctx.stroke();
  for (const x of lp.xs) {
    const p = Q(x, y, lp.d), u = p.s;
    ctx.strokeStyle = "#5a4418"; ctx.lineWidth = 0.6 * u;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 10 * u); ctx.lineTo(p.x, p.y - 4 * u); ctx.stroke();
    ctx.fillStyle = grad(ctx, p.x - 15 * u, 0, p.x + 15 * u, 0, [[0, "#0c2a16"], [0.45, on ? "#2f8a4c" : "#1a4a2a"], [1, "#081a0e"]]);
    ctx.beginPath(); ctx.moveTo(p.x - 5 * u, p.y - 5 * u); ctx.lineTo(p.x + 5 * u, p.y - 5 * u); ctx.lineTo(p.x + 15 * u, p.y + 7 * u); ctx.lineTo(p.x - 15 * u, p.y + 7 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = on ? "#fff0c8" : "#3a3a34";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 7 * u, 15 * u, 2.2 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a8853e"; ctx.fillRect(p.x - 5.5 * u, p.y - 6 * u, 11 * u, 1.4 * u);
    if (on) soft(ctx, p.x, p.y + 8 * u, 30 * u, 14 * u, "255,236,190", 0.55, "lighter");
  }
  if (on) {
    const tp = Q(lp.x, L.pool.h, lp.d);
    soft(ctx, tp.x, tp.y, 130 * tp.s, 30 * tp.s, WARM, 0.22, "lighter");
  }
}

// The stairs in the right-hand corner: oak treads and risers going up
// toward the back, a red runner held by brass rods, the side closed in and
// panelled; on the open side a handrail on turned balusters, a newel post at
// the foot; at the top the dark of the floor above, through the ceiling.
function paintStairs(ctx, L) {
  const { Q } = L, s = L.stairs, n = s.n;
  const rise = L.top / n, run = (s.d1 - s.d0) / n;
  // the well in the ceiling the stairs go up into
  const well = s.d1 - run * 4.5;
  fillPoly(ctx, [Q(s.x0 - 4, L.top, well), Q(s.x1, L.top, well), Q(s.x1, L.top, s.d1), Q(s.x0 - 4, L.top, s.d1)], "#050505");
  const lit = Q((s.x0 + s.x1) / 2, L.top - 10, well + run * 2);
  soft(ctx, lit.x, lit.y + 60 * lit.s, 120 * lit.s, 200 * lit.s, WARM, 0.12, "lighter");
  const oak = { side: "#3a2616", top: "#8a6440", front: "#5a3c24" };
  for (let i = n - 1; i >= 0; i--) {
    const d0 = s.d0 + i * run, y1 = (i + 1) * rise;
    block(ctx, L, { x0: s.x0, x1: s.x1, y0: 0, y1, d0, d1: d0 + run + 0.5 }, oak);
    // the runner, up the riser and over the tread, a brass rod at its foot
    const rx0 = s.x0 + 20, rx1 = s.x1 - 18;
    fillPoly(ctx, [Q(rx0, y1 - rise, d0 - 0.1), Q(rx1, y1 - rise, d0 - 0.1), Q(rx1, y1, d0 - 0.1), Q(rx0, y1, d0 - 0.1)], "#4a1416");
    if (y1 < 150) fillPoly(ctx, [Q(rx0, y1 + 0.1, d0), Q(rx1, y1 + 0.1, d0), Q(rx1, y1 + 0.1, d0 + run), Q(rx0, y1 + 0.1, d0 + run)], "#6a2022");
    const b0 = Q(rx0 - 2, y1 - rise + 1, d0 - 0.4), b1 = Q(rx1 + 2, y1 - rise + 1, d0 - 0.4);
    ctx.strokeStyle = "#b8903e"; ctx.lineWidth = Math.max(0.8, 0.9 * b0.s);
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
    // the nosing's edge, catching a little light
    fillPoly(ctx, [Q(s.x0, y1 - 1, d0 - 0.2), Q(s.x1, y1 - 1, d0 - 0.2), Q(s.x1, y1, d0 - 0.2), Q(s.x0, y1, d0 - 0.2)], "rgba(255,210,170,0.12)");
  }
  // the closed side, panelled under the flight
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  for (let i = 2; i < n; i += 3) {
    const d = s.d0 + i * run, p = Q(s.x0 - 0.2, 6, d), q = Q(s.x0 - 0.2, i * rise - 6, d);
    ctx.lineWidth = Math.max(0.6, 0.5 * p.s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  // the balusters, the handrail over them, the newel post at the foot
  const bx = s.x0 + 3, top = (i) => (i + 1) * rise + 86;
  ctx.strokeStyle = "#3a2414";
  for (let i = 0; i < n; i++) {
    const d = s.d0 + (i + 0.5) * run, p = Q(bx, (i + 1) * rise, d), q = Q(bx, top(i), d);
    if (q.y < 0) continue;
    ctx.lineWidth = Math.max(1, 2.2 * p.s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  const h0 = Q(bx, 108, s.d0 + 2), h1 = Q(bx, L.top + 86, s.d1);
  for (const [w, col] of [[5, "#24140a"], [3.2, "#6a4428"], [1, "rgba(255,210,170,0.35)"]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w * h0.s;
    ctx.beginPath(); ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y); ctx.stroke();
  }
  block(ctx, L, { x0: bx - 5, x1: bx + 5, y0: 0, y1: 112, d0: s.d0 - 6, d1: s.d0 + 4 }, { side: "#2a1a0e", top: "#7a5634", front: "#4a2e1a" });
  const cap = Q(bx, 117, s.d0 - 1);
  ctx.fillStyle = grad(ctx, cap.x - 5 * cap.s, 0, cap.x + 5 * cap.s, 0, [[0, "#3a2414"], [0.5, "#8a6040"], [1, "#24160c"]]);
  ctx.beginPath(); ctx.arc(cap.x, cap.y, 5 * cap.s, 0, Math.PI * 2); ctx.fill();
}

// The games cupboard: tall oak, both doors standing open, games stacked
// flat on its top and bottom shelves and four boxes standing face out on
// the middle one, a piece painted on each lid; the house's storm lantern on
// top, lit while its puzzle waits.
function paintGamesCupboard(ctx, L) {
  const { Q } = L, c = L.games, on = L.on.games;
  const oak = { side: "#24160c", top: "#5a3c24", front: "#3a2616" };
  footShadow(ctx, L, c, 0.8);
  // the doors, swung open toward us, each a thin leaf from its hinge
  for (const x of [c.x0 - 3, c.x1]) block(ctx, L, { x0: x, x1: x + 3, y0: 8, y1: c.h - 8, d0: c.d0 - 48, d1: c.d0 }, { side: "#4a3020", top: "#5a3c24", front: "#2a1a0e" });
  block(ctx, L, { x0: c.x0, x1: c.x1, y0: 0, y1: c.h, d0: c.d0, d1: c.d1 }, oak);
  const face = (x0, x1, y0, y1, col, d = c.d0 - 0.2) => fillPoly(ctx, [Q(x0, y1, d), Q(x1, y1, d), Q(x1, y0, d), Q(x0, y0, d)], col);
  // the cornice, the dark inside, the shelves
  block(ctx, L, { x0: c.x0 - 3, x1: c.x1 + 3, y0: c.h - 6, y1: c.h, d0: c.d0 - 3, d1: c.d1 }, { side: "#2a1a0e", top: "#6a4a2c", front: "#4a3020" });
  const fx0 = c.x0 + 5, fx1 = c.x1 - 5, fy0 = 12, fy1 = c.h - 12;
  face(fx0, fx1, fy0, fy1, "#0c0806");
  const s0 = fy0 + (fy1 - fy0) * 0.32, s1 = fy0 + (fy1 - fy0) * 0.7;
  for (const y of [s0, s1]) face(fx0, fx1, y - 2, y, "#5a3c24", c.d0 - 0.3);
  // the stacks of games, only their spines showing
  const cols = ["#5a2a24", "#24365a", "#3e4a2a", "#6a5424", "#4a2a4a"];
  let k = 0;
  for (const [x0, x1, base, n] of [[fx0 + 4, fx0 + 40, fy0, 5], [fx1 - 42, fx1 - 6, fy0, 4], [fx0 + 6, fx0 + 44, s1, 3], [fx1 - 40, fx1 - 4, s1, 3]]) {
    for (let i = 0; i < n; i++) face(x0 + ((i * 7) % 5), x1 - ((i * 3) % 4), base + i * 5, base + i * 5 + 4.4, cols[k++ % cols.length], c.d0 - 0.4);
  }
  // the four boxes standing on the middle shelf, a piece on each lid
  const bw = (fx1 - fx0 - 10) / 4 - 2, bh = (s1 - s0) * 0.78;
  GAME_LIDS.forEach((lid, i) => {
    const x0 = fx0 + 5 + i * (bw + 2.7);
    face(x0, x0 + bw, s0, s0 + bh, lid.box, c.d0 - 0.5);
    const p = Q(x0 + bw / 2, s0 + bh * 0.5, c.d0 - 0.6), r = bw * 0.3 * p.s;
    ctx.fillStyle = lid.piece;
    ctx.beginPath();
    if (lid.sides === 0) ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    else polygonVertices(lid.sides, r).forEach((v, n) => (n ? ctx.lineTo(p.x + v.x, p.y + v.y) : ctx.moveTo(p.x + v.x, p.y + v.y)));
    ctx.closePath(); ctx.fill();
  });
  // the lantern on top
  const lp = Q(L.lantern.x, L.lantern.y, L.lantern.d);
  paintHurricaneLantern(ctx, lp.x, lp.y, lp.s, on, false);
  if (on) soft(ctx, lp.x, lp.y - 12 * lp.s, 40 * lp.s, 34 * lp.s, WARM, 0.25, "lighter");
}

// The flags along the left-hand wall: a long line from nail to nail,
// sagging between them, the five flags of FLAGS pegged to it with room
// between; a long brass picture light over them. Painted flat, then laid on
// the wall.
function paintFlags(ctx, L) {
  const at = L.flagLine, on = L.on.flags, PX = 3;
  const w = at.d1 - at.d0, h = at.y1 - at.y0;
  const flat = makeCanvas(Math.round(w * PX), Math.round(h * PX)), g = flat.getContext("2d");
  g.scale(PX, PX);
  // the picture light: a long brass hood on two arms
  g.fillStyle = "#3a2c14"; g.fillRect(w * 0.18, 2, w * 0.64, 3.2);
  g.fillStyle = on ? "#c8a050" : "#6e5a2c"; g.fillRect(w * 0.18, 2, w * 0.64, 1.4);
  g.strokeStyle = "#3a2c14"; g.lineWidth = 1;
  for (const x of [w * 0.3, w * 0.7]) { g.beginPath(); g.moveTo(x, 5); g.lineTo(x, 9); g.stroke(); }
  if (on) {
    g.save(); g.translate(w * 0.5, h * 0.4); g.scale(w * 0.48, h * 0.6);
    const lg = g.createRadialGradient(0, -0.3, 0, 0, 0, 1);
    lg.addColorStop(0, "rgba(255,206,140,0.3)"); lg.addColorStop(1, "rgba(255,206,140,0)");
    g.fillStyle = lg; g.fillRect(-1, -1, 2, 2); g.restore();
  }
  // the line, sagging between its nails
  const y0 = 16, sag = 9;
  const lineY = (x) => y0 + sag * (1 - Math.pow((2 * x) / w - 1, 2));
  g.strokeStyle = "#cfc4a8"; g.lineWidth = 0.5;
  g.beginPath();
  for (let x = 4; x <= w - 4; x += 2) (x === 4 ? g.moveTo(x, lineY(x)) : g.lineTo(x, lineY(x)));
  g.stroke();
  for (const x of [4, w - 4]) { g.fillStyle = "#3a3a3a"; g.beginPath(); g.arc(x, lineY(x), 1, 0, Math.PI * 2); g.fill(); }
  // the flags, each pegged at its two top corners
  const FW = 30, FH = 20;
  const n = FLAG_CODES.length, gap = (w - 20 - n * FW) / (n - 1);
  FLAG_CODES.forEach((code, i) => {
    const fx = 10 + i * (FW + gap), fy = lineY(fx + FW / 2) + 0.6;
    g.save();
    g.translate(fx + FW / 2, fy); g.rotate(((lineY(fx + FW) - lineY(fx)) / FW) * 0.8); g.translate(-(fx + FW / 2), -fy);
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(fx + 1.2, fy + 1.6, FW, FH);
    g.save(); g.translate(fx, fy); paintDesign(g, code, FW, FH); g.restore();
    const sh = g.createLinearGradient(fx, 0, fx + FW, 0);
    sh.addColorStop(0, "rgba(0,0,0,0.12)"); sh.addColorStop(0.45, "rgba(255,255,255,0.08)"); sh.addColorStop(0.6, "rgba(0,0,0,0.14)"); sh.addColorStop(1, "rgba(255,255,255,0.05)");
    g.fillStyle = sh; g.fillRect(fx, fy, FW, FH);
    for (const px of [fx + 3, fx + FW - 4.6]) { g.fillStyle = "#b89a6a"; g.fillRect(px, fy - 2.8, 1.6, 4.6); }
    g.restore();
  });
  onWall(ctx, L, -1, at, flat);
}
