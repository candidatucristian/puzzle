import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { OVERTIME_CLOCKS } from "../overtime/puzzle.js";
import { writingDesk, greenLamp } from "../house/furniture.js";
import {
  WARM, BACK, roomLayout, roomStyle, chestAt, thingAt, fillPoly, block, paintShell, paintWindowWall, paintMoonlight,
  paintChest, gloom,
} from "../house/roomKit.js";
import { paintWallBookcase } from "../house/wallBookcase.js";
import { alignRoom2Photography, alignRoom2Objects, paintRoom2Photography } from "./photographicRoom.js";

/** The second room off the hall, at night: the library, where the house kept
 *  its books and its accounts. Seen from just inside the door.
 *  Down the left-hand wall the bookshelves, five books on one shelf standing
 *  a little out with a marker in each, a standard lamp in the corner beyond
 *  them. Against the back wall on the left the clerk's desk: an alarm clock,
 *  a clock radio, a folding travel clock and a calculator on it under a
 *  small lamp, and a red LED clock on the wall over it — every one of them
 *  stopped. To the right the window and the moon, its light lying on the
 *  rug in the middle of the room; beyond it a writing desk with an old
 *  router on it under a green-shaded lamp. The gilt chest is on that desk's
 *  far end.
 *
 *  Three puzzles are found here — the books, the clocks, the router; in the
 *  room they are only themselves, small, enough to know them by. Each has its own light, which burns until its puzzle is solved.
 *
 *  The room is panelled in walnut to a coffered ceiling, its floor parquet,
 *  its window a tall sash between heavy red curtains.
 *
 *  Measured and seen as every room is (house/roomKit.js). Painted once per
 *  screen size: the room; a glow; the chest, shut and open; the key. */

const K = { room: "r2_room", glow: "r2_glow", shut: "r2_chest_shut", open: "r2_chest_open", key: "r2_key" };

// ── where everything is ─────────────────────────────────────────────────────

/** `on` says which of the room's three lights still burn: `shelf` the
 *  standard lamp by the bookshelves, `clock` the lamp on the clerk's desk
 *  and the clocks' own digits, `desk` the lamp over the router. */
export function layoutRoom2(W, H, on = { shelf: true, desk: true, clock: true }, { photographic = false } = {}) {
  const L = roomLayout(W, H);
  if (photographic) alignRoom2Photography(L);
  // panelled in walnut to a coffered ceiling, parquet underfoot, a tall sash
  // window between heavy red curtains
  L.style = roomStyle({
    wall: "panel", near: "#2c1b10", far: "#130b06", back: "#1c110a", rail: 0,
    dado: { near: "#26170d", far: "#110905", back: "#170e08", rail: "#3c2616", railFar: "#190f08", railBack: "#2c1a0f" },
    skirt: "#120a06", skirtBack: "#0a0504",
    floor: "herringbone", floorNear: "#35220f", floorFar: "#190f08",
    ceiling: "coffers", ceilingCol: "#0f0a06", window: "sash",
  });
  L.on = on;
  const { Q, half: hx } = L;
  // the window in the back wall, right of the middle
  const wc = Q(0.24 * hx, 0, BACK);
  L.win = { cx: wc.x, rx: 0.15 * hx * wc.s, top: Q(0, 266, BACK).y, sill: Q(0, 104, BACK).y, x: 0.24 * hx, hw: 0.15 * hx };
  // the bookshelves down the left-hand wall; the standard lamp in the corner beyond them
  const c = (L.shelf = { d0: 366, d1: 548, y0: 0, y1: 236 });
  L.stand = { x: -0.8 * hx, d: 574, shade: 152 };
  // the clerk's desk against the back wall, left: the clocks on it and over it
  const o = (L.office = { x0: -0.6 * hx, x1: -0.2 * hx, d0: 505, d1: 562, h: 76 });
  const ow = o.x1 - o.x0;
  L.officeLamp = { x: o.x0 + ow * 0.12, d: 540, y: o.h };
  // the desk beyond the window: lamp, router, chest; the clock on the wall over it
  const k = (L.desk = { x0: 0.5 * hx, x1: 0.92 * hx, d0: 505, d1: 562, h: 76 });
  const kw = k.x1 - k.x0;
  L.deskLamp = { x: k.x0 + kw * 0.13, d: 538, y: k.h };
  const r = (L.router = { x0: k.x0 + kw * 0.28, x1: k.x0 + kw * 0.62, d0: 524, d1: 546, y0: k.h, y1: k.h + 7.5 });
  L.chest = { x0: k.x0 + kw * 0.72, x1: k.x0 + kw * 0.92, d0: 524, d1: 539, y0: k.h + 1, y1: k.h + 8.5, lid: 5.5 };
  chestAt(L);
  const ck = (L.clock = { x: o.x0 + ow * 0.56, y0: 150, y1: 172, w: 54 });

  // what opens a puzzle
  L.things = [
    thingAt("bookshelf", "Look at the bookshelves", [Q(-hx, c.y1, c.d0), Q(-hx, c.y1, c.d1), Q(-hx, 0, c.d1), Q(-hx, 0, c.d0)]),
    thingAt("modem", "Look at the router", [Q(r.x0 - 2, r.y1 + 17, r.d0), Q(r.x1 + 2, r.y1 + 17, r.d0), Q(r.x1 + 2, r.y0, r.d0), Q(r.x0 - 2, r.y0, r.d0)]),
    thingAt("overtime", "Look at the clocks", [Q(o.x0, ck.y1 + 2, BACK), Q(o.x1, ck.y1 + 2, BACK), Q(o.x1, o.h, o.d0), Q(o.x0, o.h, o.d0)]),
  ];
  // what burns, for the scene to keep alive
  const sp = Q(L.stand.x, L.stand.shade + 12, L.stand.d);
  const dp = Q(L.deskLamp.x, L.deskLamp.y + 22, L.deskLamp.d);
  const op = Q(L.officeLamp.x, L.officeLamp.y + 20, L.officeLamp.d);
  L.glows = { stand: { x: sp.x, y: sp.y, r: 150 * sp.s }, desk: { x: dp.x, y: dp.y, r: 90 * dp.s }, office: { x: op.x, y: op.y, r: 90 * op.s } };
  // the two lights of the router that tell, and the clock's colon
  const led = (i) => Q(r.x0 + (r.x1 - r.x0) * (0.14 + i * 0.06), r.y0 + 2.6, r.d0);
  L.leds = [led(8), led(9)];
  L.colon = Q(ck.x, (ck.y0 + ck.y1) / 2, BACK - 2);
  if (photographic) alignRoom2Objects(L);
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintRoom2(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  if (!paintRoom2Photography(ctx, scene, L, showTime)) {
    paintShell(ctx, L);
    paintWindowWall(ctx, L);
    paintBookcase(ctx, L);
    paintRug(ctx, L);
    paintMoonlight(ctx, L);
    paintStandLamp(ctx, L);
    paintOffice(ctx, L);
    paintDesk(ctx, L);
    paintGloom(ctx, L);
    vignette(ctx, W, H, 0.7);
    grain(ctx, W, H, 0.035);
  }
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, paintChest(L, false));
  addCanvasTexture(t, K.open, paintChest(L, true));
  addCanvasTexture(t, K.key, paintKey());
  return { keys: K };
}

export function releaseRoom2Art(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// Four lit digits and a colon, in seven bars each, as digital clocks show
// the time: `glass` is where, `lit` and `dim` the colours of a bar that is
// on and of one that is not.
const BARS = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
function showTime(ctx, time, glass, lit, dim, on = true) {
  const { x, y, w, h } = glass;
  const dw = w * 0.17, dh = h, th = Math.max(0.8, dh * 0.13);
  const text = time.replace(":", "");
  [0.02, 0.24, 0.57, 0.79].forEach((fx, i) => {
    const x0 = x + w * fx;
    for (const bar of "abcdefg") {
      ctx.fillStyle = on && BARS[text[i]].includes(bar) ? lit : dim;
      if (bar === "a") ctx.fillRect(x0 + th, y, dw - th * 2, th);
      if (bar === "g") ctx.fillRect(x0 + th, y + (dh - th) / 2, dw - th * 2, th);
      if (bar === "d") ctx.fillRect(x0 + th, y + dh - th, dw - th * 2, th);
      if (bar === "f") ctx.fillRect(x0, y + th * 0.6, th, dh / 2 - th * 0.9);
      if (bar === "b") ctx.fillRect(x0 + dw - th, y + th * 0.6, th, dh / 2 - th * 0.9);
      if (bar === "e") ctx.fillRect(x0, y + dh / 2 + th * 0.3, th, dh / 2 - th * 0.9);
      if (bar === "c") ctx.fillRect(x0 + dw - th, y + dh / 2 + th * 0.3, th, dh / 2 - th * 0.9);
    }
  });
  ctx.fillStyle = on ? lit : dim;
  for (const fy of [0.3, 0.7]) ctx.fillRect(x + w * 0.5 - th / 2, y + h * fy - th / 2, th, th);
}

// The clerk's desk, and the clocks: an LED clock on the wall over it, and on
// it an alarm clock, a clock radio, a folding travel clock and a calculator
// under a small lamp. Each is stopped at the hour the puzzle's own is
// stopped at. Solved, their digits are out and so is the lamp.
function paintOffice(ctx, L) {
  const { Q } = L;
  const o = L.office, on = L.on.clock, ow = o.x1 - o.x0;
  // ── the clock on the wall: an aluminium case, smoked red acrylic
  {
    const ck = L.clock;
    const a = Q(ck.x - ck.w / 2, ck.y1, BACK), b = Q(ck.x + ck.w / 2, ck.y0, BACK), s = a.s;
    const w = b.x - a.x, h = b.y - a.y;
    if (on) soft(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2, w * 1.3, h * 2, "255,55,30", 0.16, "lighter");
    // its lead, down the wall to behind the desk
    ctx.strokeStyle = "#050506";
    ctx.lineWidth = Math.max(1, 0.5 * s);
    ctx.beginPath();
    ctx.moveTo(b.x - 4 * s, b.y);
    ctx.bezierCurveTo(b.x - 2 * s, b.y + 20 * s, b.x + 3 * s, b.y + 44 * s, b.x - 1 * s, Q(0, 76, BACK).y);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(a.x + 1.4 * s, a.y + 1.8 * s, w, h);
    const alu = ctx.createLinearGradient(0, a.y, 0, b.y);
    alu.addColorStop(0, "#9aa0aa");
    alu.addColorStop(1, "#5a5e68");
    ctx.fillStyle = alu;
    ctx.beginPath(); ctx.roundRect(a.x, a.y, w, h, 1.4 * s); ctx.fill();
    const face = ctx.createLinearGradient(0, a.y, 0, b.y);
    face.addColorStop(0, "#1e0907");
    face.addColorStop(1, "#0b0303");
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.roundRect(a.x + 2 * s, a.y + 2 * s, w - 4 * s, h - 4 * s, 0.8 * s); ctx.fill();
    showTime(ctx, OVERTIME_CLOCKS[0], { x: a.x + w * 0.12, y: a.y + h * 0.22, w: w * 0.76, h: h * 0.56 }, "#ff3a22", "rgba(90,18,12,0.5)", on);
  }
  writingDesk(ctx, L, o);
  // ── the lamp: a small brass one with a black tin shade
  const lm = L.officeLamp, lb = Q(lm.x, lm.y, lm.d), u = lb.s;
  if (on) {
    const pool = Q(lm.x + 30, o.h, lm.d - 8);
    ctx.save();
    fillPoly(ctx, [Q(o.x0 - 3, o.h, o.d0 - 3), Q(o.x1 + 3, o.h, o.d0 - 3), Q(o.x1 + 3, o.h, o.d1), Q(o.x0 - 3, o.h, o.d1)], "rgba(0,0,0,0)");
    ctx.clip();
    soft(ctx, pool.x, pool.y, 66 * pool.s, 20 * pool.s, WARM, 0.5, "lighter");
    ctx.restore();
    soft(ctx, lb.x + 12 * u, lb.y - 20 * u, 100 * u, 80 * u, WARM, 0.13, "lighter");
  }
  ctx.fillStyle = "#120c05";
  ctx.beginPath(); ctx.ellipse(lb.x, lb.y, 7 * u, 2.1 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = on ? "#b8944a" : "#5a4a26";
  ctx.lineWidth = Math.max(1, 1.3 * u);
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(lb.x, lb.y - 1 * u); ctx.lineTo(lb.x - 2 * u, lb.y - 14 * u); ctx.lineTo(lb.x + 6 * u, lb.y - 23 * u); ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = "#0c0d10";
  ctx.beginPath();
  ctx.moveTo(lb.x + 2 * u, lb.y - 25 * u); ctx.lineTo(lb.x + 9 * u, lb.y - 27 * u);
  ctx.lineTo(lb.x + 15 * u, lb.y - 19 * u); ctx.lineTo(lb.x + 3 * u, lb.y - 16.5 * u);
  ctx.closePath();
  ctx.fill();
  if (on) {
    ctx.fillStyle = "#fff0c4";
    ctx.beginPath(); ctx.ellipse(lb.x + 9 * u, lb.y - 17.8 * u, 5.4 * u, 1.4 * u, -0.2, 0, Math.PI * 2); ctx.fill();
    soft(ctx, lb.x + 10 * u, lb.y - 14 * u, 26 * u, 22 * u, WARM, 0.36, "lighter");
  }
  // something standing on the desk: its place, and how big a centimetre is there
  const at = (fx, d = 536) => Q(o.x0 + ow * fx, o.h, d);
  const cased = (p, w, h, fill, r = 0.8) => {
    soft(ctx, p.x, p.y + 0.4 * p.s, w * 0.6 * p.s, 1.6 * p.s, "0,0,0", 0.7);
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(p.x - (w / 2) * p.s, p.y - h * p.s, w * p.s, h * p.s, r * p.s); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(p.x - (w / 2) * p.s, p.y - h * p.s, w * p.s, Math.max(1, 0.5 * p.s));
  };
  // ── the alarm clock: a black cube with an amber face and a bar to stop it
  {
    const p = at(0.36), s = p.s;
    cased(p, 13, 10, "#141518", 1.6);
    ctx.fillStyle = "#3a3d44";
    ctx.fillRect(p.x - 4.4 * s, p.y - 11 * s, 8.8 * s, 1.3 * s);
    ctx.fillStyle = "#120a02";
    ctx.fillRect(p.x - 5.4 * s, p.y - 8.4 * s, 10.8 * s, 5.6 * s);
    if (on) soft(ctx, p.x, p.y - 5.6 * s, 9 * s, 6 * s, "255,150,40", 0.2, "lighter");
    showTime(ctx, OVERTIME_CLOCKS[2], { x: p.x - 4.6 * s, y: p.y - 7.5 * s, w: 9.2 * s, h: 3.8 * s }, "#ffa530", "rgba(90,50,10,0.5)", on);
  }
  // ── the clock radio: a long walnut-sided set, a green display, a speaker grille
  {
    const p = at(0.62, 540), s = p.s;
    cased(p, 27, 10.5, "#2a1a10", 1);
    ctx.fillStyle = "#0c0d0f";
    ctx.fillRect(p.x - 12.4 * s, p.y - 9.4 * s, 24.8 * s, 8.2 * s);
    ctx.fillStyle = "#020805";
    ctx.fillRect(p.x - 11.4 * s, p.y - 8.4 * s, 12.4 * s, 5.4 * s);
    if (on) soft(ctx, p.x - 5.2 * s, p.y - 5.8 * s, 10 * s, 6 * s, "60,255,140", 0.16, "lighter");
    showTime(ctx, OVERTIME_CLOCKS[1], { x: p.x - 10.4 * s, y: p.y - 7.6 * s, w: 10.4 * s, h: 3.8 * s }, "#5cff9e", "rgba(14,60,34,0.6)", on);
    ctx.fillStyle = "rgba(120,126,136,0.35)";
    for (let i = 0; i < 6; i++) ctx.fillRect(p.x + 2.4 * s, p.y - (8.2 - i * 1.1) * s, 9 * s, Math.max(0.6, 0.4 * s));
    ctx.fillStyle = "#6a6e78";
    ctx.beginPath(); ctx.arc(p.x - 8.6 * s, p.y - 1.9 * s, 0.7 * s, 0, Math.PI * 2); ctx.arc(p.x - 5.8 * s, p.y - 1.9 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();
  }
  // ── the travel clock: a little folding one, standing open in its leather lid
  {
    const p = at(0.86), s = p.s;
    soft(ctx, p.x, p.y + 0.4 * s, 7 * s, 1.5 * s, "0,0,0", 0.7);
    fillPoly(ctx, [{ x: p.x - 5.2 * s, y: p.y }, { x: p.x + 5.2 * s, y: p.y }, { x: p.x + 6.6 * s, y: p.y - 2.2 * s }, { x: p.x - 3.8 * s, y: p.y - 2.2 * s }], "#3a2014");
    fillPoly(ctx, [{ x: p.x - 4.4 * s, y: p.y - 0.6 * s }, { x: p.x + 4.6 * s, y: p.y - 0.6 * s }, { x: p.x + 3.6 * s, y: p.y - 8 * s }, { x: p.x - 5.2 * s, y: p.y - 8 * s }], "#22140c");
    ctx.fillStyle = on ? "#a9b49a" : "#4a5046";
    ctx.fillRect(p.x - 3.9 * s, p.y - 7 * s, 6.9 * s, 4 * s);
    showTime(ctx, OVERTIME_CLOCKS[3], { x: p.x - 3.4 * s, y: p.y - 6.4 * s, w: 5.9 * s, h: 2.8 * s }, "#141a12", "rgba(20,26,18,0.12)", on);
  }
  // ── the calculator, lying flat toward us: a grey slab, its keys, its window
  {
    const x0 = o.x0 + ow * 0.44, x1 = o.x0 + ow * 0.62, d0 = 512, d1 = 527;
    const q = (fx, fd) => Q(x0 + (x1 - x0) * fx, o.h + 0.6, d0 + (d1 - d0) * fd);
    fillPoly(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], "#3c4048");
    fillPoly(ctx, [q(0.08, 0.72), q(0.92, 0.72), q(0.92, 0.94), q(0.08, 0.94)], on ? "#9aa890" : "#454a42");
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        fillPoly(ctx, [q(0.08 + c * 0.22, 0.06 + r * 0.16), q(0.26 + c * 0.22, 0.06 + r * 0.16), q(0.26 + c * 0.22, 0.17 + r * 0.16), q(0.08 + c * 0.22, 0.17 + r * 0.16)], c === 3 ? "#8a4a2a" : "#1a1c20");
      }
    }
  }
}

// The bookshelves down the left-hand wall: oak, five shelves of old books
// packed close, here and there one leaning into a gap; on the third shelf
// five standing a little out, a paper marker in each.
function paintBookcase(ctx, L) {
  paintWallBookcase(ctx, L, {
    at: L.shelf, side: -1, seed: 521,
    marked: (r, n) => r === 2 && n >= 8 && n < 18 && n % 2 === 0, // five, with one between each
    lit: L.on.shelf ? "far" : null,
  });
}


// the rug in the middle of the room: deep green, a paler border, worn
function paintRug(ctx, L) {
  const { Q, half: hx } = L;
  const rnd = lcg(87);
  const mid = 0.09 * hx, hw = hx * 0.36;
  const strip = (w, d0, d1, col) => fillPoly(ctx, [Q(mid - w, 0, d0), Q(mid + w, 0, d0), Q(mid + w, 0, d1), Q(mid - w, 0, d1)], col);
  strip(hw, 336, 526, "#0e1f1a");
  strip(hw - 7, 342, 520, "#5a583a");
  strip(hw - 11, 346, 516, "#14302a");
  for (let i = 0; i < 700; i++) {
    const p = Q(mid + (rnd() * 2 - 1) * hw, 0, 338 + rnd() * 186);
    ctx.fillStyle = rnd() < 0.6 ? "rgba(0,0,0,0.2)" : "rgba(210,255,230,0.05)";
    ctx.fillRect(p.x, p.y, 3 * p.s, 0.9 * p.s);
  }
}

// the standard lamp: a turned post on a round foot, a fringed silk shade
function paintStandLamp(ctx, L) {
  const st = L.stand, on = L.on.shelf;
  const f = L.Q(st.x, 0, st.d), u = f.s;
  const y = (cm) => f.y - cm * u;
  soft(ctx, f.x, f.y, 26 * u, 6 * u, "0,0,0", 0.6);
  if (on) soft(ctx, f.x, y(st.shade + 8), 190 * u, 170 * u, WARM, 0.16, "lighter");
  const br = ctx.createLinearGradient(f.x - 3 * u, 0, f.x + 3 * u, 0);
  br.addColorStop(0, "#1e1408"); br.addColorStop(0.45, on ? "#b89448" : "#5a4a26"); br.addColorStop(1, "#160e06");
  ctx.fillStyle = "#120c05";
  ctx.beginPath(); ctx.ellipse(f.x, f.y, 17 * u, 4.4 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = br;
  ctx.beginPath(); ctx.ellipse(f.x, f.y - 1.4 * u, 16 * u, 4 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(f.x - 1.5 * u, y(st.shade), 3 * u, st.shade * u);
  for (const h of [30, 78, 118]) { ctx.beginPath(); ctx.ellipse(f.x, y(h), 3.4 * u, 2.4 * u, 0, 0, Math.PI * 2); ctx.fill(); }
  // the shade
  const y0 = y(st.shade + 30), y1 = y(st.shade - 2), w0 = 14 * u, w1 = 25 * u;
  const shade = () => {
    ctx.beginPath();
    ctx.moveTo(f.x - w0, y0); ctx.lineTo(f.x + w0, y0); ctx.lineTo(f.x + w1, y1);
    ctx.quadraticCurveTo(f.x, y1 + 5 * u, f.x - w1, y1);
    ctx.closePath();
  };
  shade();
  const g = ctx.createRadialGradient(f.x, y1 - 8 * u, 1, f.x, y1 - 8 * u, 32 * u);
  g.addColorStop(0, on ? "#fff0c4" : "#7c6a48");
  g.addColorStop(0.45, on ? "#eeb26a" : "#4e3a22");
  g.addColorStop(1, on ? "#94582a" : "#28190e");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  shade();
  ctx.clip();
  ctx.strokeStyle = "rgba(80,40,14,0.3)";
  ctx.lineWidth = Math.max(0.5, 0.5 * u);
  for (let i = -7; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(f.x + (i / 7) * w0, y0); ctx.lineTo(f.x + (i / 7) * w1, y1 + 5 * u); ctx.stroke(); }
  ctx.restore();
  // its fringe
  ctx.strokeStyle = on ? "rgba(230,180,110,0.7)" : "rgba(90,70,46,0.7)";
  ctx.lineWidth = Math.max(0.6, 0.6 * u);
  for (let i = -12; i <= 12; i++) {
    const x = f.x + (i / 12) * w1, yy = y1 + 5 * u * (1 - Math.pow(i / 12, 2));
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy + 3.4 * u); ctx.stroke();
  }
  if (on) soft(ctx, f.x, y1 - 10 * u, 60 * u, 52 * u, WARM, 0.36, "lighter");
}

// The router's desk. On it a brass lamp with a green glass shade; the router,
// two aerials up and a row of lights along its face; the chest (which has
// its own canvas).
function paintDesk(ctx, L) {
  const { Q } = L;
  const k = L.desk, on = L.on.desk;
  writingDesk(ctx, L, k);

  greenLamp(ctx, L, L.deskLamp, k, on);

  // ── the router: a flat dark box, a row of thirteen lights, two aerials
  const r = L.router;
  const f0 = Q(r.x0, r.y1, r.d0), f1 = Q(r.x1, r.y0, r.d0), v = f0.s;
  for (const x of [r.x0 + 3, r.x1 - 3]) {
    const p = Q(x, r.y1, r.d1 - 2), q = Q(x + (x < (r.x0 + r.x1) / 2 ? -3 : 3), r.y1 + 17, r.d1 - 2);
    ctx.strokeStyle = "#0a0b0d";
    ctx.lineWidth = Math.max(1.4, 1.5 * v);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.lineCap = "butt";
  }
  soft(ctx, (f0.x + f1.x) / 2, f1.y + 1 * v, (r.x1 - r.x0) * 0.6 * v, 2.4 * v, "0,0,0", 0.7);
  block(ctx, L, r, { side: "#0c0d10", top: "#24262c", front: "#16181c" });
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(f0.x, f0.y, f1.x - f0.x, Math.max(1, 0.4 * v));
  // its name plate, and the lights: five on the left dark, eight alight
  ctx.fillStyle = "rgba(170,176,190,0.35)";
  ctx.fillRect(f0.x + (f1.x - f0.x) * 0.72, f0.y + (f1.y - f0.y) * 0.3, (f1.x - f0.x) * 0.2, Math.max(1, 0.7 * v));
  for (let i = 0; i < 13; i++) {
    const p = Q(r.x0 + (r.x1 - r.x0) * (0.14 + i * 0.06), r.y0 + 2.6, r.d0);
    ctx.fillStyle = i < 5 ? "#1c2420" : "#5cff8e";
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.9, 0.5 * v), 0, Math.PI * 2); ctx.fill();
    if (i >= 5) soft(ctx, p.x, p.y, 2 * v, 2 * v, "40,255,110", 0.4, "lighter");
  }
}

// the dark, lifted where the room's lights are — and only by those still burning
function paintGloom(ctx, L) {
  const { Q } = L;
  const w = L.win, on = L.on, g = L.glows;
  const floor = Q(w.x - 30, 0, 470);
  const ds = Q(0, 0, L.desk.d0).s;
  gloom(ctx, L, [
    { x: g.stand.x + 10 * (g.stand.r / 150), y: g.stand.y + 40 * (g.stand.r / 150), rx: g.stand.r * 1.7, ry: g.stand.r * 1.7, k: on.shelf ? 1 : 0.38 },
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
    { x: g.desk.x + 34 * ds, y: g.desk.y + 10 * ds, rx: 150 * ds, ry: 100 * ds, k: on.desk ? 0.95 : 0.32 },
    { x: g.office.x + 44 * ds, y: g.office.y - 16 * ds, rx: 160 * ds, ry: 130 * ds, k: on.clock ? 0.95 : 0.32 },
  ]);
}
