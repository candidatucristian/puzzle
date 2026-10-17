import Phaser from "phaser";
import RoomScene from "./RoomScene.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { paintFlatMaterial, paintProjectedMaterial } from "./drawingRoomMaterials.js";
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
 *    rug       the three colours of its rug: ground, border, field
 *
 *  A furnished subclass can add `things` and `detailLights` to its layout
 *  and implement paintDetails(ctx, L), painted before the room's lighting. */

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
    if (L.surfaceMaterials?.detailed) {
      paintProjectedMaterial(ctx, L.surfaceMaterials.wood, (u, v) => Q(tb.x0 - 2 + (tb.x1 - tb.x0 + 4) * u, tb.h, tb.d1 - (tb.d1 - tb.d0) * v), 0.82, 2, 2);
      paintProjectedMaterial(ctx, L.surfaceMaterials.wood, (u, v) => Q(tb.x0 - 2 + (tb.x1 - tb.x0 + 4) * u, tb.h - 3 * v, tb.d0), 0.5);
    }
  }
  scene.paintDetails?.(ctx, L);
  const w = L.win, floor = Q(w.x - 30, 0, 470);
  const lights = [
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
  ];
  if (L.embers) lights.push({ x: L.embers.x, y: L.embers.y - L.embers.r * 0.4, rx: L.embers.r * 3.4, ry: L.embers.r * 2.8, k: 0.8 });
  if (L.chest) lights.push({ x: L.chest.mouth.x, y: L.chest.mouth.y, rx: 90 * L.chest.mouth.s, ry: 70 * L.chest.mouth.s, k: 0.5 });
  lights.push(...(L.detailLights ?? []));
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

// The hearth: a chimneypiece of grey stone against the back wall — a plinth
// and a pilaster either side, a frieze with a raised tablet, a moulded
// mantelshelf, two brass candlesticks on it — and under its low arch the
// firebox, lined with firebrick gone black above and red below. In it, on a
// pair of iron dogs, the last of a fire: two charred logs, a bed of embers,
// a few small flames. A brass fender on the hearthstone before it.
//
// Drawn in centimetres about the middle of its foot (x across, y up).
function paintHearth(ctx, L) {
  const { Q } = L;
  const h = L.hearth, mid = (h.x0 + h.x1) / 2;
  const o = Q(mid, 0, BACK), s = o.s;
  const rnd = lcg(606);
  const grad = (x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [at, col] of stops) g.addColorStop(at, col);
    return g;
  };
  const box = (x0, y0, x1, y1, fill) => { ctx.fillStyle = fill; ctx.fillRect(x0, -y1, x1 - x0, y1 - y0); };
  const stoneBox = (x0, y0, x1, y1, fill) => {
    box(x0, y0, x1, y1, fill);
    if (!L.surfaceMaterials?.stone) return;
    paintFlatMaterial(ctx, L.surfaceMaterials.stone, x0, -y1, x1 - x0, y1 - y0, 0.33, 0.78);
    ctx.save();
    ctx.globalAlpha *= 0.24;
    box(x0, y0, x1, y1, fill);
    ctx.restore();
  };
  // its shadow on the wall
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(o.x - 60 * s, o.y - 118 * s, 126 * s, 118 * s);
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s, s);
  // ── the stone: the whole face of it, then what stands out
  const stone = grad(-62, 0, 62, 0, [[0, "#1a1a1d"], [0.3, "#34353a"], [0.62, "#2a2b30"], [1, "#141416"]]);
  stoneBox(-62, 0, 62, 108, stone);
  for (let i = 0; i < 2600; i++) {
    const dark = rnd() < 0.55;
    ctx.fillStyle = L.surfaceMaterials?.stone
      ? dark ? "rgba(0,0,0,0.05)" : "rgba(214,214,222,0.025)"
      : dark ? "rgba(0,0,0,0.2)" : "rgba(214,214,222,0.07)";
    ctx.fillRect(-62 + rnd() * 124, -rnd() * 108, 0.3 + rnd() * 0.9, 0.3 + rnd() * 0.6);
  }
  // the joints between its blocks
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 0.5;
  for (const y of [28, 56]) for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 62, -y); ctx.lineTo(side * 44, -y); ctx.stroke(); }
  // the pilasters: a plinth, a sunk panel up each, a cap
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -62 : 44, x1 = x0 + 18;
    stoneBox(x0 - 2, 0, x1 + 2, 10, grad(x0, 0, x1, 0, [[0, "#232428"], [0.4, "#3c3d43"], [1, "#18181b"]]));
    box(x0 - 2, 10, x1 + 2, 10.8, "rgba(214,220,236,0.16)");
    box(x0 + 4, 16, x1 - 4, 78, "rgba(0,0,0,0.28)");
    box(x0 + 4, 16, x0 + 4.7, 78, "rgba(0,0,0,0.4)");
    box(x1 - 4.7, 16, x1 - 4, 78, "rgba(214,220,236,0.12)");
    stoneBox(x0 - 1.5, 82, x1 + 1.5, 86, grad(0, -86, 0, -82, [[0, "#46474e"], [1, "#1e1e22"]]));
  }
  // the frieze over the opening, a raised tablet in the middle of it
  stoneBox(-62, 86, 62, 108, grad(0, -108, 0, -86, [[0, "#303136"], [1, "#222327"]]));
  stoneBox(-20, 90, 20, 104, grad(0, -104, 0, -90, [[0, "#3e3f46"], [1, "#2a2b30"]]));
  box(-20, 103.3, 20, 104, "rgba(214,220,236,0.2)");
  box(-20, 90, 20, 90.8, "rgba(0,0,0,0.5)");
  // the mantelshelf: three steps of moulding, the top one lit
  stoneBox(-64, 106, 64, 109, "#27282c");
  stoneBox(-67, 109, 67, 112, "#303136");
  stoneBox(-70, 112, 70, 117, grad(0, -117, 0, -112, [[0, "#4a4b53"], [1, "#2a2b30"]]));
  box(-70, 116.3, 70, 117, "rgba(190,204,240,0.3)");
  box(-64, 102.5, 64, 106, "rgba(0,0,0,0.45)");
  // two brass candlesticks on it, their candles burnt down
  for (const x of [-52, 52]) {
    box(x - 4, 117, x + 4, 118.6, "#5a4418");
    box(x - 1.2, 118.6, x + 1.2, 131, grad(x - 1.2, 0, x + 1.2, 0, [[0, "#3a2a10"], [0.5, "#a88848"], [1, "#2a1e0c"]]));
    box(x - 2.6, 124, x + 2.6, 125.4, "#7a5c26");
    box(x - 3, 131, x + 3, 132.4, "#7a5c26");
    box(x - 1.3, 132.4, x + 1.3, 137, "#b8b09a");
  }
  // ── the firebox: a low arch, its cheeks splayed in, its back
  const opening = () => {
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-38, -62);
    ctx.quadraticCurveTo(0, -86, 38, -62);
    ctx.lineTo(38, 0);
    ctx.closePath();
  };
  opening();
  ctx.fillStyle = "#050404";
  ctx.fill();
  ctx.save();
  ctx.clip();
  // firebrick: sooted black above, red in the fire's light below
  ctx.fillStyle = grad(0, -80, 0, 0, [[0, "#070605"], [0.45, "#1c0f0a"], [0.8, "#4e2010"], [1, "#8a3a14"]]);
  ctx.fillRect(-38, -86, 76, 86);
  ctx.strokeStyle = "rgba(4,2,1,0.7)";
  ctx.lineWidth = 0.5;
  for (let row = 0; row < 10; row++) {
    const y = -2 - row * 7.6;
    ctx.beginPath(); ctx.moveTo(-28, y); ctx.lineTo(28, y); ctx.stroke();
    for (let x = -34 + (row % 2) * 7; x < 30; x += 14) { if (Math.abs(x) > 28) continue; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 7.6); ctx.stroke(); }
  }
  // the cheeks, darker, their courses running in toward the back
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.moveTo(side * 38, 0); ctx.lineTo(side * 38, -70); ctx.lineTo(side * 28, -64); ctx.lineTo(side * 28, -3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(4,2,1,0.6)";
    for (let row = 1; row < 9; row++) { ctx.beginPath(); ctx.moveTo(side * 38, -row * 8.2); ctx.lineTo(side * 28, -2 - row * 7.6); ctx.stroke(); }
  }
  ctx.fillStyle = "#0c0705";
  ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(-28, -3); ctx.lineTo(28, -3); ctx.lineTo(38, 0); ctx.closePath(); ctx.fill();
  soft(ctx, 0, -14, 34, 26, "226,70,10", 0.34, "lighter");
  // the dogs: two iron bars running back, an upright with a knob at the front of each
  for (const x of [-17, 17]) {
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(x - 1, -8, 2, 6);
    ctx.fillRect(x - 1.2, -8.6, 2.4, 1.6);
  }
  // the logs across them, charred, splitting red
  for (const [x, y, len, angle] of [[-3, -12.5, 44, -0.05], [6, -18, 34, 0.1]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath(); ctx.roundRect(-len / 2, -3.6, len, 7.2, 2.4);
    ctx.fillStyle = grad(0, -3.6, 0, 3.6, [[0, "#35241a"], [0.5, "#120e0b"], [1, "#2a120a"]]);
    ctx.fill();
    for (let k = 0; k < 26; k++) {
      const xx = -len / 2 + 1 + rnd() * (len - 2);
      ctx.strokeStyle = rnd() < 0.55 ? "#6a280c" : "#d85c14";
      ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(xx, -2.8 + rnd() * 2); ctx.lineTo(xx + 0.6 + rnd() * 2, 2.8); ctx.stroke();
    }
    ctx.fillStyle = "#4a3828";
    ctx.beginPath(); ctx.ellipse(len / 2, 0, 1.6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // tongues of flame, low: translucent at the tip, a pale heart in each
  const flame = (x, y, w, tall, lean, core = false) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 1.4, y - tall * 0.24, x + lean - w * 0.7, y - tall * 0.41, x + lean * 0.5 - w * 0.2, y - tall * 0.69);
    ctx.bezierCurveTo(x + lean * 0.8, y - tall * 0.79, x + lean * 0.7 - w * 0.2, y - tall * 0.92, x + lean, y - tall);
    ctx.bezierCurveTo(x + lean * 0.45 + w * 0.6, y - tall * 0.75, x - lean * 0.4 + w * 0.2, y - tall * 0.48, x + w * 0.85, y - tall * 0.38);
    ctx.bezierCurveTo(x + w * 1.1, y - tall * 0.19, x + w * 0.7, y - tall * 0.03, x + w, y);
    ctx.closePath();
    ctx.fillStyle = grad(0, y - tall, 0, y, core
      ? [[0, "rgba(255,183,56,0)"], [0.5, "rgba(255,207,102,0.7)"], [1, "#ffe6b0"]]
      : [[0, "rgba(202,48,5,0)"], [0.2, "rgba(233,86,11,0.38)"], [0.55, "rgba(246,147,33,0.86)"], [1, "#ffcc76"]]);
    ctx.fill();
  };
  for (const [x, tall, w, lean] of [[-14, 15, 3.6, 3], [-5, 24, 4, -4], [5, 19, 3.8, 4], [13, 13, 3, -3], [-9, 11, 2.6, 2], [9, 10, 2.4, -2]]) {
    flame(x, -15, w, tall, lean);
    flame(x - 0.3, -15, w * 0.5, tall * 0.62, lean * 0.7, true);
  }
  // the embers under the logs, and the ash they lie in
  ctx.fillStyle = "#16100c";
  ctx.beginPath(); ctx.ellipse(0, -4, 27, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 70; i++) {
    const k = rnd();
    ctx.fillStyle = k < 0.3 ? "#ffc468" : k < 0.75 ? "#c0440e" : "#3a1408";
    ctx.beginPath(); ctx.ellipse((rnd() * 2 - 1) * 24, -4 - rnd() * 5, 0.7 + rnd() * 1.4, 0.4 + rnd() * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // the arch's edge, and the soot gone up the stone over it
  opening();
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,150,70,0.16)";
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-38.6, -2); ctx.lineTo(-38.6, -62); ctx.quadraticCurveTo(0, -86.6, 38.6, -62); ctx.lineTo(38.6, -2); ctx.stroke();
  soft(ctx, 0, -84, 34, 14, "0,0,0", 0.55);
  ctx.restore();
  // ── the hearthstone before it, the fire's light lying on it; the fender
  fillPoly(ctx, [Q(h.x0 - 6, 0.6, BACK), Q(h.x1 + 6, 0.6, BACK), Q(h.x1 + 12, 0.6, BACK - 42), Q(h.x0 - 12, 0.6, BACK - 42)], "#1c1c20");
  const st = Q(mid, 0.6, BACK - 18);
  soft(ctx, st.x, st.y, 58 * st.s, 13 * st.s, "255,120,40", 0.34, "lighter");
  const f0 = Q(h.x0 + 4, 0, BACK - 34), f1 = Q(h.x1 - 4, 0, BACK - 34), fs = f0.s;
  ctx.fillStyle = "#3a2a10";
  ctx.fillRect(f0.x, f0.y - 9 * fs, f1.x - f0.x, 9 * fs);
  ctx.fillStyle = "#050404";
  for (let x = f0.x + 4 * fs; x < f1.x - 3 * fs; x += 5 * fs) ctx.fillRect(x, f0.y - 7 * fs, 2.6 * fs, 5 * fs);
  ctx.fillStyle = "#b08c44";
  ctx.fillRect(f0.x - 1.5 * fs, f0.y - 10.4 * fs, f1.x - f0.x + 3 * fs, 1.8 * fs);
  ctx.fillStyle = "rgba(255,170,90,0.3)";
  ctx.fillRect(f0.x, f0.y - 1.4 * fs, f1.x - f0.x, 1.4 * fs);
  for (const p of [f0, f1]) { ctx.fillStyle = "#8a6c34"; ctx.beginPath(); ctx.arc(p.x, p.y - 11.6 * fs, 2.4 * fs, 0, Math.PI * 2); ctx.fill(); }
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
  paintProjectedMaterial(ctx, L.surfaceMaterials?.rug, (u, v) => Q(mid - hw + hw * 2 * u, 0, 526 - 190 * v), 0.96, 8, 8);
  for (let i = 0; i < 700; i++) {
    const p = Q(mid + (rnd() * 2 - 1) * hw, 0, 338 + rnd() * 186);
    const dark = rnd() < 0.6;
    ctx.fillStyle = L.surfaceMaterials?.rug
      ? dark ? "rgba(0,0,0,0.08)" : "rgba(255,230,210,0.025)"
      : dark ? "rgba(0,0,0,0.2)" : "rgba(255,230,210,0.05)";
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
