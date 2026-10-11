import Phaser from "phaser";
import RoomScene from "./RoomScene.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import {
  BACK, roomLayout, roomStyle, chestAt, fillPoly, block, paintShell, paintWindowWall, paintMoonlight, footShadow, paintChest, gloom,
} from "./roomKit.js";

/** A room of the house with nothing found in it yet: its walls, its window
 *  and the moon through it, a rug, a hearth with the last of a fire in it,
 *  and — if it keeps a key — a small table with the gilt chest on it. What
 *  is found there will be put in later; until then it is a room to stand in.
 *
 *  `plan` says how it is built and laid out:
 *    style     its own build (see roomKit's roomStyle)
 *    window    { x, hw, top, sill } of the window, x and hw as shares of half
 *              the room's width, top and sill in centimetres up the wall
 *    hearth    where along the back wall the fireplace stands (a share of
 *              half the width), or null for none
 *    chest     where the chest's table stands (the same), or null for none
 *    rug       the three colours of its rug: ground, border, field */

// ── where everything is ─────────────────────────────────────────────────────

function layoutPlain(W, H, plan) {
  const L = roomLayout(W, H);
  L.style = roomStyle(plan.style);
  L.plan = plan;
  L.things = [];
  const { Q, half: hx } = L;
  const w = plan.window, wc = Q(w.x * hx, 0, BACK);
  L.win = { cx: wc.x, rx: w.hw * hx * wc.s, top: Q(0, w.top, BACK).y, sill: Q(0, w.sill, BACK).y, x: w.x * hx, hw: w.hw * hx };
  if (plan.hearth !== null) {
    const x = plan.hearth * hx;
    L.hearth = { x0: x - 62, x1: x + 62, h: 118 };
    const e = Q(x, 20, BACK - 10);
    L.embers = { x: e.x, y: e.y, r: 46 * e.s };
  }
  if (plan.chest !== null) {
    const x = plan.chest * hx;
    const t = (L.table = { x0: x - 26, x1: x + 26, d0: 500, d1: 546, h: 66 });
    L.chest = { x0: x - 12, x1: x + 12, d0: 516, d1: 531, y0: t.h + 1, y1: t.h + 8.5, lid: 5.5 };
    chestAt(L);
  }
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

function paintPlain(scene, L, K) {
  const t = scene.textures;
  const { W, H, Q } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  paintShell(ctx, L);
  paintWindowWall(ctx, L);
  if (L.hearth) paintHearth(ctx, L);
  paintRug(ctx, L);
  paintMoonlight(ctx, L);
  if (L.table) {
    // a small table for the chest
    const tb = L.table, oak = { side: "#170e08", top: "#44291a", front: "#28170d" };
    footShadow(ctx, L, tb, 0.6);
    for (const [d0, d1] of [[tb.d1 - 5, tb.d1], [tb.d0, tb.d0 + 5]]) {
      for (const [x0, x1] of [[tb.x0 + 2, tb.x0 + 7], [tb.x1 - 7, tb.x1 - 2]]) block(ctx, L, { x0, x1, d0, d1, y0: 0, y1: tb.h - 3 }, oak);
    }
    block(ctx, L, { ...tb, x0: tb.x0 - 2, x1: tb.x1 + 2, y0: tb.h - 3, y1: tb.h }, oak);
  }
  const w = L.win, floor = Q(w.x - 30, 0, 470);
  const lights = [
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
  ];
  if (L.embers) lights.push({ x: L.embers.x, y: L.embers.y - L.embers.r * 0.4, rx: L.embers.r * 3.4, ry: L.embers.r * 2.8, k: 0.8 });
  if (L.chest) lights.push({ x: L.chest.mouth.x, y: L.chest.mouth.y, rx: 90 * L.chest.mouth.s, ry: 70 * L.chest.mouth.s, k: 0.5 });
  gloom(ctx, L, lights);
  vignette(ctx, W, H, 0.7);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  if (L.chest) {
    addCanvasTexture(t, K.shut, paintChest(L, false));
    addCanvasTexture(t, K.open, paintChest(L, true));
    addCanvasTexture(t, K.key, paintKey());
  }
  return K;
}

// The hearth: a stone surround and a deep mantelshelf against the back wall,
// a black opening with an iron basket in it, the last of a fire in the
// basket — a few coals still red, their light on the hearthstone.
function paintHearth(ctx, L) {
  const { Q } = L;
  const h = L.hearth;
  const a = Q(h.x0, h.h, BACK), b = Q(h.x1, 0, BACK), s = a.s;
  const mx = (a.x + b.x) / 2;
  const stone = ctx.createLinearGradient(a.x, 0, b.x, 0);
  stone.addColorStop(0, "#151517");
  stone.addColorStop(0.5, "#26272c");
  stone.addColorStop(1, "#121214");
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(a.x + 3 * s, a.y, b.x - a.x, b.y - a.y);
  ctx.fillStyle = stone;
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  // the mantelshelf, standing out over it
  ctx.fillStyle = "#303238";
  ctx.fillRect(a.x - 8 * s, a.y - 7 * s, b.x - a.x + 16 * s, 8 * s);
  ctx.fillStyle = "rgba(190,204,240,0.25)";
  ctx.fillRect(a.x - 8 * s, a.y - 7 * s, b.x - a.x + 16 * s, 1 * s);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(a.x, a.y + 1 * s, b.x - a.x, 5 * s);
  // its stones: a course line or two, a keystone over the arch
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(0.8, 0.5 * s);
  for (const fy of [0.3, 0.55, 0.8]) { ctx.beginPath(); ctx.moveTo(a.x, a.y + (b.y - a.y) * fy); ctx.lineTo(b.x, a.y + (b.y - a.y) * fy); ctx.stroke(); }
  // the opening, arched
  const ox = 34 * s, oh = 78 * s;
  ctx.fillStyle = "#040405";
  ctx.beginPath();
  ctx.moveTo(mx - ox, b.y);
  ctx.lineTo(mx - ox, b.y - oh + 16 * s);
  ctx.quadraticCurveTo(mx, b.y - oh - 10 * s, mx + ox, b.y - oh + 16 * s);
  ctx.lineTo(mx + ox, b.y);
  ctx.closePath();
  ctx.fill();
  // the embers' light inside it, the basket, the coals
  soft(ctx, mx, b.y - 14 * s, 40 * s, 34 * s, "255,110,30", 0.4, "lighter");
  const rnd = lcg(606);
  for (let i = 0; i < 26; i++) {
    const x = mx + (rnd() * 2 - 1) * 20 * s, y = b.y - (6 + rnd() * 12) * s, r = (1.6 + rnd() * 2.6) * s;
    ctx.fillStyle = rnd() < 0.4 ? "#ffb24a" : rnd() < 0.6 ? "#d8481a" : "#2a0c06";
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "#08080a";
  ctx.lineWidth = Math.max(1, 1.4 * s);
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(mx + i * 7 * s, b.y - 22 * s); ctx.lineTo(mx + i * 7.6 * s, b.y - 3 * s); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(mx - 24 * s, b.y - 13 * s); ctx.lineTo(mx + 24 * s, b.y - 13 * s); ctx.stroke();
  // the hearthstone before it, the fire's light lying on it
  fillPoly(ctx, [Q(h.x0 - 6, 0.6, BACK), Q(h.x1 + 6, 0.6, BACK), Q(h.x1 + 12, 0.6, BACK - 42), Q(h.x0 - 12, 0.6, BACK - 42)], "#1c1c20");
  const st = Q((h.x0 + h.x1) / 2, 0.6, BACK - 18);
  soft(ctx, st.x, st.y, 54 * st.s, 12 * st.s, "255,120,40", 0.3, "lighter");
}

// the rug in the middle of the room, worn
function paintRug(ctx, L) {
  const { Q, half: hx } = L;
  const [ground, border, field] = L.plan.rug;
  const rnd = lcg(87);
  const mid = L.win.x * 0.3, hw = hx * 0.36;
  const strip = (w, d0, d1, col) => fillPoly(ctx, [Q(mid - w, 0, d0), Q(mid + w, 0, d0), Q(mid + w, 0, d1), Q(mid - w, 0, d1)], col);
  strip(hw, 336, 526, ground);
  strip(hw - 7, 342, 520, border);
  strip(hw - 11, 346, 516, field);
  for (let i = 0; i < 700; i++) {
    const p = Q(mid + (rnd() * 2 - 1) * hw, 0, 338 + rnd() * 186);
    ctx.fillStyle = rnd() < 0.6 ? "rgba(0,0,0,0.2)" : "rgba(255,230,210,0.05)";
    ctx.fillRect(p.x, p.y, 3 * p.s, 0.9 * p.s);
  }
}

// ── the scene ───────────────────────────────────────────────────────────────

/** The scene of such a room: `place` its key in the house, `plan` as above. */
export default class PlainRoomScene extends RoomScene {
  constructor(place, plan) {
    super(place);
    this.plan = plan;
    const id = place.toLowerCase();
    this._keys = { room: `${id}_room`, glow: `${id}_glow`, shut: `${id}_chest_shut`, open: `${id}_chest_open`, key: `${id}_key` };
  }

  layout(W, H) {
    return layoutPlain(W, H, this.plan);
  }

  paint(L) {
    return paintPlain(this, L, this._keys);
  }

  release() {
    for (const key of Object.values(this._keys)) if (this.textures.exists(key)) this.textures.remove(key);
  }

  live(L, k) {
    // the coals in the hearth, glowing up and dying down
    this._embers = L.embers
      ? this.add.image(L.embers.x, L.embers.y, k.glow).setDisplaySize(L.embers.r * 2, L.embers.r * 2).setTint(0xff7a28).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(-8)
      : null;
  }

  tick(t) {
    this._embers?.setAlpha(0.26 + 0.07 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 7.3));
  }

  dustIn(L) {
    const w = L.win;
    return { x: w.cx - w.rx * 1.8, y: w.top, width: w.rx * 3, height: L.H * 0.8 - w.top };
  }
}
