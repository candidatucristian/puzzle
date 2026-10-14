import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintHurricaneLantern } from "../../shared/hurricaneLantern.js";
import { paintKey } from "../../shared/keyArt.js";
import { writingDesk, greenLamp, candle, gamesTable } from "../house/furniture.js";
import {
  WARM, BACK, roomLayout, roomStyle, chestAt, thingAt, fillPoly, block, onWall, paintShell, paintWindowWall, paintMoonlight,
  footShadow, paintChest, gloom,
} from "../house/roomKit.js";

/** The third room off the hall, at night: the captain's room, where a man
 *  home from the sea kept what he had brought back. Seen from just inside
 *  the door. On a table to the left a ship in a bottle — a big one, a
 *  three-master under full sail on a painted sea, the bottle lying in its
 *  cradle — and a red storm lantern burning beside it. In the middle of
 *  the room, in the moon from the window, a games table with a chess game
 *  left unfinished on it and a candle at its corner. To the right a writing
 *  desk: an old mobile telephone standing on it, its little green screen
 *  alight, under a green-shaded lamp; the gilt chest on the desk's far end.
 *  A sea chart hangs on the left-hand wall.
 *
 *  Three puzzles are found here — the bottle, the board, the telephone; in
 *  the room they are only themselves, small, enough to know them by. Each
 *  has its own light, which burns until its puzzle is solved.
 *
 *  The room is fitted out like a cabin: limewashed boards over navy
 *  match-boarding, beams overhead, a deck of wide planks underfoot, and a
 *  round port for a window.
 *
 *  Measured and seen as every room is (house/roomKit.js). Painted once per
 *  screen size: the room; a glow; the chest, shut and open; the key. */

// The source image stays cached across room visits; viewport canvases in K
// are the resources rebuilt and released when the room changes size.
export const SHIP_BOTTLE = { key: "r3_ship_bottle", url: "assets/images/Room3/ship-in-bottle.png" };

const K = { room: "r3_room", glow: "r3_glow", shut: "r3_chest_shut", open: "r3_chest_open", key: "r3_key" };

// The game on the board, as the puzzle leaves it: [file a–h as 0–7, rank 1–8
// as 0–7, white?, how tall the piece is in centimetres].
const GAME = [[7, 0, true, 5.6], [4, 1, true, 9.6], [0, 2, true, 4.6], [3, 3, false, 8.8], [0, 4, false, 9.6], [2, 5, false, 6.6], [7, 6, true, 7.6], [4, 7, false, 7.6]];

// ── where everything is ─────────────────────────────────────────────────────

/** `on` says which of the room's three lights still burn: `ship` the lantern
 *  by the bottle, `chess` the candle on the games table, `phone` the lamp
 *  over the telephone and the telephone's own screen. */
export function layoutRoom3(W, H, on = { ship: true, chess: true, phone: true }) {
  const L = roomLayout(W, H);
  // fitted out like a cabin: limewashed boards over navy match-boarding,
  // beams overhead, a deck of wide planks, a round port for a window
  L.style = roomStyle({
    wall: "planks", near: "#2b333b", far: "#131a20", back: "#1b232a", rail: 0,
    dado: { kind: "boards", h: 100, near: "#13243c", far: "#08111e", back: "#0d192a", rail: "#2c3e58", railFar: "#121c2c", railBack: "#1d2d46" },
    skirt: "#0a1420", skirtBack: "#060c14",
    floor: "deck", floorNear: "#3c3226", floorFar: "#1c1610",
    ceiling: "beams", ceilingCol: "#151b20", window: "round",
  });
  L.on = on;
  const { Q, half: hx } = L;
  // the window in the back wall
  const wc = Q(0.06 * hx, 0, BACK);
  const port = 0.13 * hx; // the port's radius; its middle is 196 up
  L.win = { cx: wc.x, rx: port * wc.s, top: Q(0, 196 + port, BACK).y, sill: Q(0, 196 - port, BACK).y, x: 0.06 * hx, hw: port };
  // the table on the left: the bottle in its cradle, the lantern beside it
  const t = (L.table = { x0: -0.66 * hx, x1: -0.27 * hx, d0: 398, d1: 456, h: 72 });
  const tw = t.x1 - t.x0;
  const b = (L.bottle = { x0: t.x0 + tw * 0.26, x1: t.x0 + tw * 0.86, neck: 15, d: 428, y: t.h + 5, r: 16 });
  L.lantern = { x: t.x0 + tw * 0.13, d: 432, y: t.h };
  // the games table in the moon, the board on it, a candle at its corner
  const g = (L.games = { x0: -0.14 * hx, x1: 0.12 * hx, d0: 408, d1: 476, h: 70 });
  const gx = (g.x0 + g.x1) / 2, gd = (g.d0 + g.d1) / 2;
  const bd = (L.board = { x0: gx - 24, x1: gx + 24, d0: gd - 24, d1: gd + 24, y: g.h + 1.2 });
  L.candle = { x: g.x1 - 7, d: g.d1 - 9, y: g.h };
  // the desk on the right: lamp, telephone, chest
  const k = (L.desk = { x0: 0.46 * hx, x1: 0.88 * hx, d0: 505, d1: 562, h: 76 });
  const kw = k.x1 - k.x0;
  L.deskLamp = { x: k.x0 + kw * 0.13, d: 538, y: k.h };
  const ph = (L.phone = { x: k.x0 + kw * 0.46, d: 530, y: k.h, w: 9.5, h: 22 });
  L.chest = { x0: k.x0 + kw * 0.72, x1: k.x0 + kw * 0.92, d0: 524, d1: 539, y0: k.h + 1, y1: k.h + 8.5, lid: 5.5 };
  chestAt(L);
  // the chart on the left-hand wall
  L.chart = { d0: 386, d1: 520, y0: 108, y1: 200 };

  // what opens a puzzle
  L.things = [
    thingAt("compass", "Look into the bottle", [Q(b.x0 - 2, b.y + b.r * 2 + 3, b.d), Q(b.x1 + b.neck + 4, b.y + b.r * 2 + 3, b.d), Q(b.x1 + b.neck + 4, t.h, b.d), Q(b.x0 - 2, t.h, b.d)]),
    thingAt("chessboard", "Look at the chessboard", [Q(bd.x0, bd.y + 11, bd.d1), Q(bd.x1, bd.y + 11, bd.d1), Q(bd.x1 + 1, bd.y, bd.d0), Q(bd.x0 - 1, bd.y, bd.d0)]),
    thingAt("mobilephone", "Pick up the telephone", [Q(ph.x - ph.w / 2 - 2, ph.y + ph.h + 5, ph.d), Q(ph.x + ph.w / 2 + 2, ph.y + ph.h + 5, ph.d), Q(ph.x + ph.w / 2 + 2, ph.y, ph.d), Q(ph.x - ph.w / 2 - 2, ph.y, ph.d)]),
  ];
  // what burns, for the scene to keep alive
  const lp = Q(L.lantern.x, L.lantern.y + 13, L.lantern.d);
  const cp = Q(L.candle.x, L.candle.y + 20, L.candle.d);
  const dp = Q(L.deskLamp.x, L.deskLamp.y + 22, L.deskLamp.d);
  const sp = Q(ph.x, ph.y + ph.h * 0.72, ph.d);
  L.glows = {
    lantern: { x: lp.x, y: lp.y, r: 70 * lp.s }, flame: { x: cp.x, y: cp.y, r: 44 * cp.s },
    desk: { x: dp.x, y: dp.y, r: 90 * dp.s }, screen: { x: sp.x, y: sp.y, r: 14 * sp.s },
  };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintRoom3(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  paintShell(ctx, L);
  paintWindowWall(ctx, L);
  paintChart(ctx, L);
  paintRug(ctx, L);
  paintMoonlight(ctx, L);
  paintDesk(ctx, L);
  gamesTable(ctx, L, L.games, L.board, GAME);
  candle(ctx, L, L.candle, L.on.chess);
  paintBottleTable(ctx, L);
  paintGloom(ctx, L);
  vignette(ctx, W, H, 0.7);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, paintChest(L, false));
  addCanvasTexture(t, K.open, paintChest(L, true));
  addCanvasTexture(t, K.key, paintKey());
  return { keys: K };
}

export function releaseRoom3Art(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// a sea chart on the left-hand wall: yellowed paper under glass in a dark
// frame — a coast, soundings, a compass rose, rhumb lines running from it
function paintChart(ctx, L) {
  const at = L.chart;
  const R = 3, fw = (at.d1 - at.d0) * R, fh = (at.y1 - at.y0) * R;
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  const rnd = lcg(1492);
  g.fillStyle = "#20140c";
  g.fillRect(0, 0, fw, fh);
  g.fillStyle = "#3c2a18";
  g.fillRect(2 * R, 2 * R, fw - 4 * R, fh - 4 * R);
  const paper = g.createLinearGradient(0, 0, fw, fh);
  paper.addColorStop(0, "#8a7c5c");
  paper.addColorStop(1, "#5e5440");
  g.fillStyle = paper;
  g.fillRect(6 * R, 6 * R, fw - 12 * R, fh - 12 * R);
  g.save();
  g.beginPath(); g.rect(6 * R, 6 * R, fw - 12 * R, fh - 12 * R); g.clip();
  // the land: a coast down the left, an island
  g.fillStyle = "rgba(70,58,36,0.55)";
  g.beginPath();
  g.moveTo(6 * R, 6 * R);
  for (let y = 6 * R; y <= fh; y += 6 * R) g.lineTo(fw * (0.26 + 0.07 * Math.sin(y * 0.02) + 0.04 * Math.sin(y * 0.07)), y);
  g.lineTo(6 * R, fh);
  g.closePath();
  g.fill();
  g.beginPath(); g.ellipse(fw * 0.66, fh * 0.34, 14 * R, 8 * R, 0.4, 0, Math.PI * 2); g.fill();
  // rhumb lines from the rose
  const rx = fw * 0.72, ry = fh * 0.7;
  g.strokeStyle = "rgba(50,36,20,0.3)";
  g.lineWidth = 0.6;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + Math.cos(a) * fw, ry + Math.sin(a) * fw); g.stroke(); }
  // the rose itself
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, len = (i % 2 ? 6 : 11) * R;
    g.fillStyle = i % 2 ? "rgba(60,40,22,0.7)" : "rgba(120,40,30,0.75)";
    g.beginPath();
    g.moveTo(rx + Math.cos(a) * len, ry + Math.sin(a) * len);
    g.lineTo(rx + Math.cos(a + 1.3) * 2 * R, ry + Math.sin(a + 1.3) * 2 * R);
    g.lineTo(rx + Math.cos(a - 1.3) * 2 * R, ry + Math.sin(a - 1.3) * 2 * R);
    g.closePath();
    g.fill();
  }
  // soundings: small marks scattered over the sea
  g.fillStyle = "rgba(40,30,18,0.45)";
  for (let i = 0; i < 90; i++) g.fillRect(fw * (0.34 + rnd() * 0.6), fh * (0.1 + rnd() * 0.8), 1.4 * R, 0.5 * R);
  // age: foxing, a fold down the middle
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(90,60,30,0.14)"; g.beginPath(); g.arc(rnd() * fw, rnd() * fh, (1 + rnd() * 4) * R, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "rgba(30,20,10,0.25)";
  g.fillRect(fw * 0.5, 0, 0.8, fh);
  g.restore();
  g.fillStyle = "rgba(190,206,240,0.07)";
  g.fillRect(6 * R, 6 * R, fw - 12 * R, fh * 0.3);
  onWall(ctx, L, -1, at, flat);
}

// the rug in the middle of the room: a deep sea blue, a paler border, worn
function paintRug(ctx, L) {
  const { Q, half: hx } = L;
  const rnd = lcg(87);
  const mid = 0, hw = hx * 0.36;
  const strip = (w, d0, d1, col) => fillPoly(ctx, [Q(mid - w, 0, d0), Q(mid + w, 0, d0), Q(mid + w, 0, d1), Q(mid - w, 0, d1)], col);
  strip(hw, 336, 526, "#0c1626");
  strip(hw - 7, 342, 520, "#5a5440");
  strip(hw - 11, 346, 516, "#12223a");
  for (let i = 0; i < 700; i++) {
    const p = Q(mid + (rnd() * 2 - 1) * hw, 0, 338 + rnd() * 186);
    ctx.fillStyle = rnd() < 0.6 ? "rgba(0,0,0,0.2)" : "rgba(200,220,255,0.05)";
    ctx.fillRect(p.x, p.y, 3 * p.s, 0.9 * p.s);
  }
}

// The writing desk: a green-shaded lamp; an old mobile telephone standing in
// its cradle, a stub of an aerial, a small green screen, rows of keys; the
// chest (which has its own canvas).
function paintDesk(ctx, L) {
  const { Q } = L;
  const k = L.desk, on = L.on.phone;
  writingDesk(ctx, L, k);
  greenLamp(ctx, L, L.deskLamp, k, on);
  const ph = L.phone, p = Q(ph.x, ph.y, ph.d), s = p.s;
  const w = ph.w * s, h = ph.h * s;
  // the cradle it stands in, its lead going off the back of the desk
  soft(ctx, p.x, p.y + 0.4 * s, 9 * s, 2 * s, "0,0,0", 0.7);
  ctx.strokeStyle = "#07080a";
  ctx.lineWidth = Math.max(1, 0.5 * s);
  ctx.beginPath(); ctx.moveTo(p.x + 5 * s, p.y - 1 * s); ctx.quadraticCurveTo(p.x + 14 * s, p.y - 4 * s, p.x + 20 * s, p.y - 1.4 * s); ctx.stroke();
  ctx.fillStyle = "#101216";
  ctx.beginPath(); ctx.roundRect(p.x - 7.4 * s, p.y - 4.4 * s, 14.8 * s, 4.4 * s, 1.2 * s); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(p.x - 7.4 * s, p.y - 4.4 * s, 14.8 * s, Math.max(1, 0.4 * s));
  // the telephone: leaning back a little in it
  ctx.save();
  ctx.translate(p.x, p.y - 2.4 * s);
  ctx.rotate(-0.07);
  ctx.fillStyle = "#0a0b0e";
  ctx.fillRect(w * 0.22, -h - 3.4 * s, 1.5 * s, 4 * s); // the aerial
  const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  body.addColorStop(0, "#14171d");
  body.addColorStop(0.4, on ? "#3c4250" : "#262a33");
  body.addColorStop(1, "#0e1014");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 1.8 * s); ctx.fill();
  // the earpiece, the screen, the keys
  ctx.fillStyle = "#050608";
  ctx.fillRect(-w * 0.2, -h + 1.3 * s, w * 0.4, 0.6 * s);
  ctx.fillStyle = on ? "#9fe07a" : "#2c3a26";
  ctx.fillRect(-w * 0.36, -h + 3 * s, w * 0.72, h * 0.26);
  if (on) {
    ctx.fillStyle = "rgba(20,50,14,0.8)";
    ctx.fillRect(-w * 0.28, -h + 4.1 * s, w * 0.56, 0.5 * s);
    ctx.fillRect(-w * 0.28, -h + 5.6 * s, w * 0.38, 0.5 * s);
  }
  ctx.fillStyle = on ? "#8a909c" : "#4a4e58";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    ctx.beginPath(); ctx.roundRect(-w * 0.34 + c * w * 0.25, -h * 0.5 + r * h * 0.11, w * 0.18, h * 0.07, 0.3 * s); ctx.fill();
  }
  ctx.restore();
  if (on) soft(ctx, p.x, p.y - h * 0.72, 12 * s, 10 * s, "120,255,120", 0.2, "lighter");
}

// The oak table under the bottle, and the red storm lantern beside it.
function paintBottleTable(ctx, L) {
  const { Q } = L;
  const t = L.table, b = L.bottle, on = L.on.ship;
  const oak = { side: "#1a0f08", top: "#4e3220", front: "#2c1a0e" };
  footShadow(ctx, L, t, 0.6);
  for (const [d0, d1] of [[t.d1 - 6, t.d1], [t.d0, t.d0 + 6]]) {
    for (const [x0, x1] of [[t.x0 + 3, t.x0 + 9], [t.x1 - 9, t.x1 - 3]]) block(ctx, L, { x0, x1, d0, d1, y0: 0, y1: t.h - 4 }, oak);
  }
  block(ctx, L, { x0: t.x0 + 3, x1: t.x1 - 3, d0: t.d0 + 1, d1: t.d1 - 1, y0: t.h - 14, y1: t.h - 4 }, oak);
  block(ctx, L, { ...t, x0: t.x0 - 3, x1: t.x1 + 3, d0: t.d0 - 3, d1: t.d1 + 3, y0: t.h - 4, y1: t.h }, oak);

  // ── the lantern: a hurricane lamp, red tin and a glass globe
  const ln = L.lantern, lp = Q(ln.x, ln.y, ln.d), u = lp.s;
  if (on) {
    const pool = Q(ln.x + 20, t.h, ln.d);
    ctx.save();
    fillPoly(ctx, [Q(t.x0 - 3, t.h, t.d0 - 3), Q(t.x1 + 3, t.h, t.d0 - 3), Q(t.x1 + 3, t.h, t.d1 + 3), Q(t.x0 - 3, t.h, t.d1 + 3)], "rgba(0,0,0,0)");
    ctx.clip();
    soft(ctx, pool.x, pool.y, 70 * pool.s, 20 * pool.s, WARM, 0.5, "lighter");
    ctx.restore();
    soft(ctx, lp.x, lp.y - 13 * u, 150 * u, 120 * u, WARM, 0.15, "lighter");
  }
  soft(ctx, lp.x, lp.y + 0.5 * u, 9 * u, 2.6 * u, "0,0,0", 0.6);
  paintHurricaneLantern(ctx, lp.x, lp.y, u, on);

  // The high-resolution bottle itself is a separate scene image, so the
  // approach keeps its rigging and glass crisp. Its contact shadow belongs
  // to the table and follows the room's lighting.
  const c0 = Q(b.x0, b.y, b.d), s = c0.s;
  const x0 = c0.x, x1 = Q(b.x1, b.y, b.d).x;
  soft(ctx, (x0 + x1) / 2, c0.y + 5 * s, (x1 - x0) * 0.6, 3 * s, "0,0,0", 0.7);
}

// the dark, lifted where the room's lights are — and only by those still burning
function paintGloom(ctx, L) {
  const { Q } = L;
  const w = L.win, on = L.on, g = L.glows;
  const floor = Q(w.x - 30, 0, 470);
  const ds = Q(0, 0, L.desk.d0).s, ts = Q(0, 0, L.table.d0).s;
  gloom(ctx, L, [
    { x: g.lantern.x + 60 * ts, y: g.lantern.y + 4 * ts, rx: 230 * ts, ry: 170 * ts, k: on.ship ? 1 : 0.4 },
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
    { x: g.flame.x - 16 * (g.flame.r / 44), y: g.flame.y + 10 * (g.flame.r / 44), rx: g.flame.r * 2.9, ry: g.flame.r * 2.2, k: on.chess ? 0.9 : 0.34 },
    { x: g.desk.x + 34 * ds, y: g.desk.y + 10 * ds, rx: 150 * ds, ry: 100 * ds, k: on.phone ? 0.95 : 0.32 },
  ]);
}
