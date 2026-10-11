import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { writingDesk, greenLamp } from "../house/furniture.js";
import {
  WARM, BACK, roomLayout, roomStyle, block, chestAt, thingAt, fillPoly, paintShell, paintWindowWall, paintMoonlight, paintChest, gloom,
} from "../house/roomKit.js";

/** The fourth room off the hall, at night: the counting room. Seen from just
 *  inside the door. On the back wall, to the left, a long cork board in an
 *  oak frame with six index cards pinned along it in a row, each with a
 *  number on it, a brass picture light over it; under it a writing desk
 *  with a green-shaded lamp, and the gilt chest on the desk's far end. To
 *  the right, set high and deep in the wall, a small leaded window and the
 *  moon, its light on the rug; in the corner beyond it an iron stove, a
 *  little fire still in it. A bare working room: plaster walls, stone
 *  flags underfoot, beams overhead.
 *
 *  One puzzle is found here so far — the cards; in the room they are only
 *  themselves, small, enough to know them by. Their lights burn until the
 *  puzzle is solved.
 *
 *  Measured and seen as every room is (house/roomKit.js). Painted once per
 *  screen size: the room; a glow; the chest, shut and open; the key. */

const K = { room: "r4_room", glow: "r4_glow", shut: "r4_chest_shut", open: "r4_chest_open", key: "r4_key" };

// what is written on the six cards, in the order the puzzle deals them
const CARDS = [23, 31, 11, 28, 19, 24];

// ── where everything is ─────────────────────────────────────────────────────

/** `on` says which of the room's lights still burn: `cards` the picture
 *  light over the board and the lamp on the desk under it. */
export function layoutRoom4(W, H, on = { cards: true }) {
  const L = roomLayout(W, H);
  // a bare working room: plaster walls, stone flags, a small leaded window
  // set high and deep, an iron stove in the corner
  L.style = roomStyle({
    wall: "plaster", near: "#2e2c26", far: "#161510", back: "#1e1d18", rail: 0, dado: null,
    skirt: "#1a1915", skirtBack: "#0e0d0a",
    floor: "flags", floorNear: "#2c2c2e", floorFar: "#141517",
    ceiling: "beams", ceilingCol: "#0d0d0c", window: "leaded",
  });
  L.on = on;
  const { Q, half: hx } = L;
  // the window in the back wall, to the right
  const wc = Q(0.4 * hx, 0, BACK);
  L.win = { cx: wc.x, rx: 0.1 * hx * wc.s, top: Q(0, 264, BACK).y, sill: Q(0, 186, BACK).y, x: 0.4 * hx, hw: 0.1 * hx };
  // the stove in the right-hand corner
  L.stove = { x: 0.76 * hx, d: 556 };
  // the desk on the left, the board on the wall over it
  const k = (L.desk = { x0: -0.52 * hx, x1: -0.08 * hx, d0: 505, d1: 562, h: 76 });
  const kw = k.x1 - k.x0;
  L.deskLamp = { x: k.x0 + kw * 0.12, d: 538, y: k.h };
  L.chest = { x0: k.x0 + kw * 0.72, x1: k.x0 + kw * 0.92, d0: 524, d1: 539, y0: k.h + 1, y1: k.h + 8.5, lid: 5.5 };
  chestAt(L);
  const b = (L.board = { x0: k.x0 - 6, x1: k.x1 + 6, y0: 122, y1: 180 });

  // what opens a puzzle
  L.things = [
    thingAt("sequence", "Look at the cards", [Q(b.x0, b.y1, BACK), Q(b.x1, b.y1, BACK), Q(b.x1, b.y0, BACK), Q(b.x0, b.y0, BACK)]),
  ];
  // what burns, for the scene to keep alive
  const dp = Q(L.deskLamp.x, L.deskLamp.y + 22, L.deskLamp.d);
  const pp = Q((b.x0 + b.x1) / 2, b.y1 + 8, BACK - 9);
  const sv = Q(L.stove.x, 34, L.stove.d - 22);
  L.glows = { desk: { x: dp.x, y: dp.y, r: 90 * dp.s }, picture: { x: pp.x, y: pp.y, r: 46 * pp.s }, stove: { x: sv.x, y: sv.y, r: 40 * sv.s } };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintRoom4(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  paintShell(ctx, L);
  paintWindowWall(ctx, L);
  paintBoard(ctx, L);
  paintRug(ctx, L);
  paintMoonlight(ctx, L);
  paintStove(ctx, L);
  writingDesk(ctx, L, L.desk);
  greenLamp(ctx, L, L.deskLamp, L.desk, L.on.cards);
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

export function releaseRoom4Art(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// The board: a long strip of cork in an oak frame, six slots ruled on it in
// pencil and an index card pinned over each, a little askew, its number in
// ink; over it a brass picture light on two arms.
function paintBoard(ctx, L) {
  const { Q } = L;
  const b = L.board, on = L.on.cards;
  const a = Q(b.x0, b.y1, BACK), z = Q(b.x1, b.y0, BACK), s = a.s;
  const R = 4, fw = Math.round((b.x1 - b.x0) * R), fh = Math.round((b.y1 - b.y0) * R);
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  const rnd = lcg(31);
  g.fillStyle = "#3e2716";
  g.fillRect(0, 0, fw, fh);
  g.fillStyle = "rgba(255,210,160,0.12)";
  g.fillRect(0, 0, fw, 1.2 * R);
  g.fillStyle = "#1a0f08";
  g.fillRect(4 * R, 4 * R, fw - 8 * R, fh - 8 * R);
  // the cork, lit from above by its lamp
  const ck = g.createLinearGradient(0, 0, 0, fh);
  ck.addColorStop(0, on ? "#a8845a" : "#544230");
  ck.addColorStop(0.5, on ? "#7e5e3c" : "#3e3022");
  ck.addColorStop(1, on ? "#4a3420" : "#281e14");
  g.fillStyle = ck;
  g.fillRect(5.5 * R, 5.5 * R, fw - 11 * R, fh - 11 * R);
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = rnd() < 0.55 ? "rgba(40,22,8,0.22)" : "rgba(255,226,180,0.1)";
    g.fillRect(5.5 * R + rnd() * (fw - 11 * R), 5.5 * R + rnd() * (fh - 11 * R), 0.8 + rnd() * 2, 0.8 + rnd() * 1.4);
  }
  const cw = 15 * R, ch = 24 * R, gap = (fw - 16 * R) / 6;
  for (let c = 0; c < 6; c++) {
    const x = 8 * R + gap * (c + 0.5), y = fh * 0.5;
    g.strokeStyle = "rgba(40,26,14,0.4)";
    g.lineWidth = 0.9;
    g.strokeRect(x - cw / 2 - 1.5 * R, y - ch / 2 - 1.5 * R, cw + 3 * R, ch + 3 * R);
    g.save();
    g.translate(x + (rnd() - 0.5) * 2 * R, y + (rnd() - 0.5) * 2.4 * R);
    g.rotate((rnd() - 0.5) * 0.12);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(-cw / 2 + 1.4 * R, -ch / 2 + 1.8 * R, cw, ch);
    const cg = g.createLinearGradient(0, -ch / 2, 0, ch / 2);
    cg.addColorStop(0, on ? "#f2ead2" : "#8e8a7c");
    cg.addColorStop(1, on ? "#c4b999" : "#6a665a");
    g.fillStyle = cg;
    g.fillRect(-cw / 2, -ch / 2, cw, ch);
    // an index card's blue rule, and its number in ink
    g.fillStyle = "rgba(90,120,170,0.4)";
    g.fillRect(-cw / 2, -ch / 2 + 6 * R, cw, 0.7);
    g.fillStyle = "rgba(28,22,18,0.9)";
    g.font = `700 ${9.5 * R}px "Special Elite", "Courier New", monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(CARDS[c]), 0, 3 * R);
    // its red pin, a spark of the lamp on its head
    g.fillStyle = "#a4281e";
    g.beginPath(); g.arc(0, -ch / 2 + 3 * R, 1.5 * R, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,220,200,0.8)";
    g.beginPath(); g.arc(-0.4 * R, -ch / 2 + 2.6 * R, 0.5 * R, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // the frame's inner edge, in shadow at the top
  const sh = g.createLinearGradient(0, 5.5 * R, 0, 13 * R);
  sh.addColorStop(0, "rgba(0,0,0,0.5)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sh;
  g.fillRect(5.5 * R, 5.5 * R, fw - 11 * R, 7.5 * R);
  // the lamp's light on the wall round the board, the board's shadow, the board
  if (on) soft(ctx, (a.x + z.x) / 2, a.y + 10 * s, (z.x - a.x) * 0.7, 80 * s, WARM, 0.2, "lighter");
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(a.x + 1.5 * s, a.y + 2.4 * s, z.x - a.x, z.y - a.y);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(flat, a.x, a.y, z.x - a.x, z.y - a.y);
  // the picture light: a brass tube on two arms over the frame
  const tube = (x) => Q(x, b.y1 + 9, BACK - 9);
  const p0 = tube(b.x0 + 22), p1 = tube(b.x1 - 22);
  ctx.strokeStyle = "#2a1e0c";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  for (const x of [b.x0 + 40, b.x1 - 40]) {
    const w = Q(x, b.y1 + 5, BACK), q = tube(x);
    ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = Math.max(2.4, 5.4 * s);
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  ctx.strokeStyle = on ? "#b08c44" : "#5a4a26";
  ctx.lineWidth = Math.max(1, 2.2 * s);
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y - 1.2 * s); ctx.lineTo(p1.x, p1.y - 1.2 * s); ctx.stroke();
  ctx.lineCap = "butt";
  if (on) soft(ctx, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + 5 * s, (p1.x - p0.x) * 0.5, 12 * s, "255,226,170", 0.5, "lighter");
}

// The stove: a pot-bellied one of black iron on three legs, its pipe going
// up and into the wall, a little fire still showing through the bars of
// its door. It is not one of the puzzle's lights: it stays in.
function paintStove(ctx, L) {
  const { Q } = L;
  const st = L.stove, f = Q(st.x, 0, st.d), u = f.s;
  const y = (cm) => f.y - cm * u;
  soft(ctx, f.x, f.y, 34 * u, 8 * u, "0,0,0", 0.7);
  // the stone it stands on, the embers' light on it
  block(ctx, L, { x0: st.x - 32, x1: st.x + 32, d0: st.d - 30, d1: st.d + 24, y0: 0, y1: 3 }, { side: "#0c0c0d", top: "#26262a", front: "#161618" });
  soft(ctx, f.x, y(2) + 8 * u, 40 * u, 9 * u, "255,120,40", 0.3, "lighter");
  const iron = ctx.createLinearGradient(f.x - 22 * u, 0, f.x + 22 * u, 0);
  iron.addColorStop(0, "#050506");
  iron.addColorStop(0.35, "#2c2d32");
  iron.addColorStop(1, "#08080a");
  ctx.fillStyle = iron;
  // the pipe, the legs, the belly, the top
  ctx.fillRect(f.x - 5 * u, y(L.top - 40), 10 * u, (L.top - 40 - 74) * u);
  ctx.fillRect(f.x - 5 * u, y(L.top - 30), 34 * u, 10 * u);
  for (const dx of [-15, 15]) { ctx.beginPath(); ctx.moveTo(f.x + (dx - 3) * u, y(16)); ctx.lineTo(f.x + (dx + 3) * u, y(16)); ctx.lineTo(f.x + dx * 1.3 * u, y(2)); ctx.closePath(); ctx.fill(); }
  ctx.beginPath();
  ctx.moveTo(f.x - 15 * u, y(74));
  ctx.bezierCurveTo(f.x - 30 * u, y(60), f.x - 30 * u, y(24), f.x - 17 * u, y(14));
  ctx.lineTo(f.x + 17 * u, y(14));
  ctx.bezierCurveTo(f.x + 30 * u, y(24), f.x + 30 * u, y(60), f.x + 15 * u, y(74));
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(f.x - 18 * u, y(79), 36 * u, 5 * u);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(f.x - 18 * u, y(79), 36 * u, 0.8 * u);
  // the door: its bars, and what is still burning behind them
  const dx0 = f.x - 11 * u, dy0 = y(48), dw = 22 * u, dh = 22 * u;
  const fire = ctx.createRadialGradient(f.x, dy0 + dh * 0.7, 1, f.x, dy0 + dh * 0.6, dw * 0.7);
  fire.addColorStop(0, "#ffd070");
  fire.addColorStop(0.4, "#ff7a20");
  fire.addColorStop(1, "#5a1206");
  ctx.fillStyle = fire;
  ctx.beginPath(); ctx.roundRect(dx0, dy0, dw, dh, 2 * u); ctx.fill();
  ctx.fillStyle = "#08080a";
  for (let i = 0; i <= 5; i++) ctx.fillRect(dx0 + (dw * i) / 5 - 0.9 * u, dy0, 1.8 * u, dh);
  ctx.strokeStyle = "#0a0a0c";
  ctx.lineWidth = Math.max(1, 1.6 * u);
  ctx.beginPath(); ctx.roundRect(dx0, dy0, dw, dh, 2 * u); ctx.stroke();
  soft(ctx, f.x, dy0 + dh * 0.6, 34 * u, 30 * u, "255,120,40", 0.3, "lighter");
}

// the rug in the middle of the room: deep red, a paler border, worn
function paintRug(ctx, L) {
  const { Q, half: hx } = L;
  const rnd = lcg(87);
  const mid = 0.1 * hx, hw = hx * 0.36;
  const strip = (w, d0, d1, col) => fillPoly(ctx, [Q(mid - w, 0, d0), Q(mid + w, 0, d0), Q(mid + w, 0, d1), Q(mid - w, 0, d1)], col);
  strip(hw, 336, 526, "#2e0c10");
  strip(hw - 7, 342, 520, "#6a5a3a");
  strip(hw - 11, 346, 516, "#3c1014");
  for (let i = 0; i < 700; i++) {
    const p = Q(mid + (rnd() * 2 - 1) * hw, 0, 338 + rnd() * 186);
    ctx.fillStyle = rnd() < 0.6 ? "rgba(0,0,0,0.2)" : "rgba(255,220,190,0.05)";
    ctx.fillRect(p.x, p.y, 3 * p.s, 0.9 * p.s);
  }
}

// the dark, lifted where the room's lights are — and only by those still burning
function paintGloom(ctx, L) {
  const { Q } = L;
  const w = L.win, on = L.on, g = L.glows;
  const floor = Q(w.x - 30, 0, 470);
  const ds = Q(0, 0, L.desk.d0).s, ps = Q(0, 0, BACK).s;
  gloom(ctx, L, [
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
    { x: g.desk.x + 40 * ds, y: g.desk.y + 10 * ds, rx: 170 * ds, ry: 110 * ds, k: on.cards ? 0.95 : 0.32 },
    { x: g.picture.x, y: g.picture.y + 40 * ps, rx: 130 * ps, ry: 90 * ps, k: on.cards ? 0.95 : 0.36 },
    { x: g.stove.x, y: g.stove.y + 20 * ps, rx: 110 * ps, ry: 100 * ps, k: 0.7 },
  ]);
}
