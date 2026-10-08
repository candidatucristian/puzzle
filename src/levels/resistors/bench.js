import { RESISTORS, BAND_PAINT, BAND_COLOURS, BAND_DIGITS } from "./puzzle.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The workbench for RESISTORS, seen from straight above like a photograph
 *  taken under the magnifier lamp: a walnut bench, a grey anti-static mat,
 *  and on it a green circuit board with everything a board has — copper
 *  under the solder mask, vias, silkscreen, a chip, capacitors, an LED —
 *  and across its middle four big resistors, R1 to R4, each with its four
 *  colour bands. Everything that stands off the board throws a shadow away
 *  from the lamp. Round it, the bench's company: the colour-code card taped
 *  to the mat, a multimeter with its leads on the board, the soldering iron
 *  in its stand, a reel of solder, tweezers.
 *
 *  Painted once per screen size: the bench with everything on it; a loupe
 *  view of each resistor, for a closer look; a wisp of smoke; the glow. */

const K = { room: "rs_room", glow: "rs_glow", smoke: "rs_smoke" };
const loupeKey = (i) => `rs_loupe_${i}`;
const LABEL_FONT = '"Courier New", Courier, monospace';
const SILK_FONT = "Arial, Helvetica, sans-serif";
const LAMP = "255,238,206";
// the lamp stands up and to the right: a thing `h` high throws its shadow
// this far, down and to the left
const SHADOW = { x: -0.42, y: 0.72 };

// ── where everything is ─────────────────────────────────────────────────────

export function layoutBench(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  // the board, a little left of the middle, 100 units wide by 66.7
  const bw = Math.min(W * 0.54, H * 0.7 * 1.5);
  const bh = bw / 1.5;
  L.board = { x: W * 0.43 - bw / 2, y: H * 0.44 - bh / 2, w: bw, h: bh };
  const b = L.board;
  const m = (L.m = bw / 100); // a board unit, in pixels
  L.at = (x, y) => ({ x: b.x + x * m, y: b.y + y * m });
  // the four resistors in a row across the board's middle
  const len = bw * 0.17;
  L.resistors = RESISTORS.map((bands, i) => ({
    i,
    bands,
    x: b.x + bw * (0.14 + i * 0.24),
    y: b.y + bh * 0.56,
    len,
    r: len * 0.17,
  }));
  // the magnifier lamp's lens over the board's corner, clear of the resistors
  L.lens = { x: b.x + bw * 0.9, y: b.y + bh * 0.1, r: Math.min(bw * 0.115, H * 0.1) };
  // the LED on the board, lit
  L.led = L.at(66, 13.5);
  // the colour code card, taped to the mat below the board
  const cw = Math.min(W * 0.44, bw * 0.86);
  L.card = { x: b.x + bw / 2 - cw / 2, y: b.y + bh + H * 0.03, w: cw, h: Math.min(H * 0.105, cw * 0.2) };
  if (L.card.y + L.card.h > H - 8 * u) L.card.y = H - 8 * u - L.card.h;
  // to the right of the board: the multimeter, and below it the iron
  const right = b.x + bw;
  const room = W - right;
  const ms = Math.min(u, room / 250);
  L.meter = { x: right + room * 0.56, y: H * 0.3, s: ms };
  L.meter.lcd = { x: L.meter.x, y: L.meter.y - 78 * ms, size: 30 * ms };
  L.iron = { x: right + room * 0.56, y: H * 0.78, s: Math.min(u, room / 260) };
  const it = L.iron;
  const ia = -0.5; // the iron lies at this slant in its stand
  it.a = ia;
  it.tip = { x: it.x + Math.cos(ia) * 96 * it.s, y: it.y + Math.sin(ia) * 96 * it.s };
  // to the left: the solder, the tweezers
  L.spool = { x: b.x * 0.48, y: H * 0.26, s: Math.min(u, b.x / 150) };
  L.tweezers = { x: b.x * 0.5, y: H * 0.66, s: Math.min(u, b.x / 150) };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintBench(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintWood(ctx, L);
  paintMat(ctx, L);
  paintSpool(ctx, L);
  paintTweezers(ctx, L);
  paintBoard(ctx, L);
  paintParts(ctx, L);
  for (const r of L.resistors) paintResistor(ctx, r.x, r.y, L.m, r.bands);
  paintCard(ctx, L);
  paintMeter(ctx, L);
  paintIron(ctx, L);
  paintLight(ctx, L);
  paintLamp(ctx, L);
  vignette(ctx, W, H, 0.72);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  const loupes = L.resistors.map((r) => {
    addCanvasTexture(t, loupeKey(r.i), paintLoupe(L, r));
    return { key: loupeKey(r.i), x: r.x, y: r.y, i: r.i };
  });
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.smoke, paintSmoke());
  return { keys: K, loupes };
}

export function releaseBenchArt(textures) {
  for (const key of [...Object.values(K), ...RESISTORS.map((_, i) => loupeKey(i))]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// the shadow a thing throws: its outline, moved away from the lamp by its
// height and softened
function shadow(ctx, h, alpha, blur, path) {
  ctx.save();
  ctx.translate(SHADOW.x * h, SHADOW.y * h);
  ctx.filter = `blur(${Math.max(0.5, blur).toFixed(1)}px)`;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
  path();
  ctx.restore();
}

// ── the bench ───────────────────────────────────────────────────────────────

// old walnut, planks running across, their grain, and what years of work
// leave: scratches, a burn or two, flux
function paintWood(ctx, L) {
  const { W, H, u } = L;
  const rnd = lcg(3303);
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(0, 0, W, H);
  const ph = 118 * u;
  for (let y = -ph * 0.3; y < H; y += ph) {
    const k = 0.82 + rnd() * 0.36;
    const g = ctx.createLinearGradient(0, y, 0, y + ph);
    g.addColorStop(0, `rgb(${Math.round(74 * k)},${Math.round(48 * k)},${Math.round(28 * k)})`);
    g.addColorStop(1, `rgb(${Math.round(58 * k)},${Math.round(36 * k)},${Math.round(20 * k)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, ph - 1.5 * u);
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, y + ph - 1.5 * u, W, 1.5 * u);
    ctx.fillStyle = "rgba(255,210,160,0.06)";
    ctx.fillRect(0, y, W, u);
    // the grain: long lines that wander, a knot here and there
    for (let i = 0; i < 26; i++) {
      const gy = y + rnd() * ph;
      ctx.strokeStyle = rnd() < 0.65 ? `rgba(20,10,4,${(0.12 + rnd() * 0.2).toFixed(2)})` : "rgba(255,200,150,0.05)";
      ctx.lineWidth = (0.5 + rnd() * 1.1) * u;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      let x = 0;
      while (x < W) {
        x += (120 + rnd() * 200) * u;
        ctx.lineTo(x, gy + (rnd() - 0.5) * 7 * u);
      }
      ctx.stroke();
    }
    if (rnd() < 0.6) {
      const kx = rnd() * W;
      const ky = y + ph * (0.3 + rnd() * 0.4);
      for (let i = 4; i > 0; i--) {
        ctx.strokeStyle = `rgba(16,8,3,${0.14 + i * 0.04})`;
        ctx.lineWidth = u;
        ctx.beginPath();
        ctx.ellipse(kx, ky, i * 7 * u, i * 3 * u, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = rnd() < 0.5 ? "rgba(0,0,0,0.22)" : "rgba(255,220,180,0.07)";
    ctx.lineWidth = (0.5 + rnd()) * u;
    const x = rnd() * W;
    const y = rnd() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 140 * u, y + (rnd() - 0.5) * 60 * u);
    ctx.stroke();
  }
  // burns from a dropped iron, drops of old flux
  for (let i = 0; i < 5; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    soft(ctx, x, y, (6 + rnd() * 12) * u, (4 + rnd() * 6) * u, "8,4,2", 0.6);
  }
  for (let i = 0; i < 14; i++) {
    soft(ctx, rnd() * W, rnd() * H, (2 + rnd() * 4) * u, (2 + rnd() * 4) * u, "190,140,60", 0.2);
  }
}

// the anti-static mat the work lies on: grey-blue rubber, a faint grid, a
// rule printed along its top edge
function paintMat(ctx, L) {
  const { H, u } = L;
  const b = L.board;
  const x = b.x - b.w * 0.075;
  const y = b.y - b.h * 0.11;
  const w = b.w * 1.15;
  const h = H - y + 40 * u;
  const rnd = lcg(515);
  shadow(ctx, 3 * u, 0.6, 5 * u, () => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14 * u);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14 * u);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#33434e");
  g.addColorStop(1, "#232f38");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const step = b.w / 20;
  ctx.strokeStyle = "rgba(190,215,230,0.07)";
  ctx.lineWidth = Math.max(0.6, 0.7 * u);
  for (let gx = x + step; gx < x + w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let gy = y + step; gy < y + h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }
  // the rule: ticks every fifth of a square, figures at each square
  ctx.fillStyle = "rgba(210,230,240,0.3)";
  ctx.font = `${Math.round(7 * u)}px ${SILK_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i * (step / 5) < w - 30 * u; i++) {
    const gx = x + 16 * u + i * (step / 5);
    ctx.fillRect(gx, y + 5 * u, Math.max(0.6, 0.7 * u), (i % 5 ? 3 : 6) * u);
    if (i % 5 === 0 && i > 0) ctx.fillText(String(i / 5), gx, y + 12 * u);
  }
  // the rubber's fine texture, cuts and solder splashes on it
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.1)" : "rgba(220,235,245,0.04)";
    ctx.fillRect(x + rnd() * w, y + rnd() * h, 1.4 * u, 1.4 * u);
  }
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = "rgba(10,16,20,0.35)";
    ctx.lineWidth = Math.max(0.6, 0.8 * u);
    const sx = x + rnd() * w;
    const sy = y + rnd() * h;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (rnd() - 0.5) * 70 * u, sy + (rnd() - 0.5) * 70 * u);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const sx = x + rnd() * w;
    const sy = y + rnd() * h;
    const r = (1.2 + rnd() * 2.2) * u;
    const sg = ctx.createRadialGradient(sx + r * 0.3, sy - r * 0.3, 0, sx, sy, r);
    sg.addColorStop(0, "#f4f6f8");
    sg.addColorStop(1, "#6a7078");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(200,225,240,0.12)";
  ctx.lineWidth = Math.max(1, u);
  ctx.beginPath();
  ctx.roundRect(x + u, y + u, w - 2 * u, h, 13 * u);
  ctx.stroke();
}

// ── the board ───────────────────────────────────────────────────────────────

// green solder mask over copper: the traces show a paler green, the vias
// and pads are tinned; white silkscreen names everything
function paintBoard(ctx, L) {
  const { u, m } = L;
  const b = L.board;
  const rnd = lcg(808);
  const P = L.at;
  const outline = () => {
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 2.2 * m);
  };
  shadow(ctx, 4 * u, 0.7, 4 * u, () => {
    outline();
    ctx.fill();
  });
  // the board's own thickness: a pale edge of glass-fibre on the lit sides
  ctx.save();
  ctx.translate(-0.5 * u, 0.9 * u);
  outline();
  ctx.fillStyle = "#b9a468";
  ctx.fill();
  ctx.restore();
  outline();
  const g = ctx.createLinearGradient(b.x, b.y + b.h, b.x + b.w, b.y);
  g.addColorStop(0, "#08301c");
  g.addColorStop(0.55, "#0e4428");
  g.addColorStop(1, "#145634");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();

  // the copper under the mask
  const COPPER = "rgba(96,190,122,0.34)";
  // a ground pour along the bottom, hatched
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x + 2 * m, b.y + 46.5 * m, b.w - 4 * m, 18 * m);
  ctx.clip();
  ctx.strokeStyle = "rgba(96,190,122,0.09)";
  ctx.lineWidth = 0.5 * m;
  for (let i = -70; i < 110; i += 1.6) {
    ctx.beginPath();
    ctx.moveTo(b.x + i * m, b.y + 46 * m);
    ctx.lineTo(b.x + (i + 20) * m, b.y + 66 * m);
    ctx.moveTo(b.x + (i + 20) * m, b.y + 46 * m);
    ctx.lineTo(b.x + i * m, b.y + 66 * m);
    ctx.stroke();
  }
  ctx.restore();
  const trace = (pts, w = 0.8) => {
    ctx.strokeStyle = COPPER;
    ctx.lineWidth = w * m;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const p = P(x, y);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
    // the mask's edge over the copper catches a little light
    ctx.strokeStyle = "rgba(190,255,205,0.1)";
    ctx.lineWidth = Math.max(0.5, 0.18 * m);
    ctx.save();
    ctx.translate(0.2 * m, -0.2 * m);
    ctx.stroke();
    ctx.restore();
  };
  const via = (x, y, r = 0.75) => {
    const p = P(x, y);
    const vg = ctx.createRadialGradient(p.x + r * m * 0.3, p.y - r * m * 0.3, 0, p.x, p.y, r * m);
    vg.addColorStop(0, "#f0f2f0");
    vg.addColorStop(1, "#8a9290");
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * m, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#06180e";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * m * 0.42, 0, Math.PI * 2);
    ctx.fill();
  };
  // the resistors in series, R1 to R4, and the rails they hang from
  const ry = 37.35;
  const ends = [0, 1, 2, 3].map((i) => [14 + i * 24 - 11.7, 14 + i * 24 + 11.7]);
  for (let i = 0; i < 3; i++) trace([[ends[i][1], ry], [ends[i + 1][0], ry]], 1);
  trace([[ends[0][0], ry], [ends[0][0], 29], [6, 29], [6, 12], [10, 8]], 1.1);
  trace([[ends[3][1], ry], [ends[3][1], 46], [92, 50], [92, 58]], 1.1);
  // taps between them up to the chip
  trace([[ends[0][1] + 0.3, ry], [26, 33], [26, 24], [29.4, 20.6], [29.4, 19.5]]);
  trace([[ends[1][1] + 0.3, ry], [50, 33], [50, 27], [42.2, 22], [42.2, 19.5]]);
  trace([[ends[2][1] + 0.3, ry], [74, 31], [58, 27], [48.6, 22.5], [48.6, 19.5]]);
  // the chip's other pins: out to the crystal, the LED, the capacitors
  trace([[32.6, 10.5], [32.6, 6], [56.8, 6], [56.8, 11]]);
  trace([[35.8, 10.5], [35.8, 7.6], [52, 7.6], [55, 4.4], [63.2, 4.4], [63.2, 11]]);
  trace([[45.4, 10.5], [45.4, 9], [60, 9], [62, 16], [64.6, 16], [64.6, 13.5]]);
  trace([[67.4, 13.5], [72, 13.5], [72, 24], [80, 24], [88, 16], [88, 10]]);
  trace([[32.6, 19.5], [32.6, 26], [20, 26], [12, 34], [12, 49.5]]);
  trace([[35.8, 19.5], [35.8, 28], [30, 33.8], [30, 44], [27, 47], [27, 51.8]]);
  trace([[39, 19.5], [39, 30], [44, 30], [44, 46], [50, 50], [50, 53.4]]);
  trace([[45.4, 19.5], [45.4, 24.5], [54, 24.5], [54, 44], [62, 50], [62, 57]]);
  trace([[65.6, 57], [65.6, 48], [69, 44.6], [80, 44.6], [83.4, 48], [83.4, 53]]);
  trace([[69.2, 57], [69.2, 51], [76.4, 51], [76.4, 57]]);
  trace([[80, 57], [80, 62], [88.6, 62], [88.6, 59]]);
  trace([[29.4, 10.5], [29.4, 4.4], [14, 4.4], [10, 8]]);
  trace([[42.2, 10.5], [42.2, 3], [78, 3], [82, 7], [85.6, 10]]);
  trace([[8, 55], [8, 47.5], [20, 47.5]], 1.3);
  for (const [x, y] of [
    [6, 29], [26, 24], [50, 27], [74, 31], [20, 26], [44, 46], [54, 44], [72, 24], [80, 24], [92, 50],
    [52, 7.6], [60, 9], [30, 44], [69, 44.6], [80, 62], [20, 47.5], [10, 8], [82, 7], [39, 30], [58, 27],
  ]) {
    via(x, y);
  }
  // the mask is never quite even: a mottle in it, and fine scratches
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(170,255,190,0.035)";
    ctx.fillRect(b.x + rnd() * b.w, b.y + rnd() * b.h, 1.3 * u, 1.3 * u);
  }
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = "rgba(200,255,215,0.06)";
    ctx.lineWidth = Math.max(0.5, 0.6 * u);
    const sx = b.x + rnd() * b.w;
    const sy = b.y + rnd() * b.h;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (rnd() - 0.5) * 20 * m, sy + (rnd() - 0.5) * 8 * m);
    ctx.stroke();
  }
  // the lamp lying on the varnish
  const hot = P(74, 20);
  soft(ctx, hot.x, hot.y, b.w * 0.42, b.h * 0.5, "200,255,215", 0.07, "lighter");
  ctx.restore();

  // gold fingers along the left edge: the board plugs into something
  for (let i = 0; i < 9; i++) {
    const p = P(0, 22 + i * 2.6);
    const fg = ctx.createLinearGradient(0, p.y, 0, p.y + 1.7 * m);
    fg.addColorStop(0, "#f6e09a");
    fg.addColorStop(1, "#a8802a");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.roundRect(p.x + 0.3 * m, p.y, 3.6 * m, 1.7 * m, [0, 0.85 * m, 0.85 * m, 0]);
    ctx.fill();
  }
  // mounting holes, each in its ring of bare copper
  for (const [x, y] of [
    [4, 4],
    [96, 4],
    [4, 62.7],
    [96, 62.7],
  ]) {
    const p = P(x, y);
    const rg = ctx.createRadialGradient(p.x + m * 0.5, p.y - m * 0.5, 0, p.x, p.y, 2.2 * m);
    rg.addColorStop(0, "#f2f4f2");
    rg.addColorStop(1, "#7e8684");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2 * m, 0, Math.PI * 2);
    ctx.fill();
    // through the hole: the mat below, in the board's shadow
    ctx.fillStyle = "#10181c";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.25 * m, 0, Math.PI * 2);
    ctx.fill();
  }

  // silkscreen
  const silk = (text, x, y, size = 2.1, align = "center") => {
    const p = P(x, y);
    ctx.fillStyle = "rgba(236,240,232,0.86)";
    ctx.font = `700 ${(size * m).toFixed(1)}px ${SILK_FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, p.x, p.y);
  };
  L.silk = silk;
  ctx.strokeStyle = "rgba(236,240,232,0.7)";
  ctx.lineWidth = Math.max(0.7, 0.24 * m);
  // each resistor's outline and name
  L.resistors.forEach((r, i) => {
    const cx = 14 + i * 24;
    ctx.beginPath();
    ctx.roundRect(b.x + (cx - 9.2) * m, b.y + (ry - 3.6) * m, 18.4 * m, 7.2 * m, 0.8 * m);
    ctx.stroke();
    silk(`R${i + 1}`, cx, 44.2, 3.1);
  });
  silk("DSC-24  REV B", 33, 61.4, 2, "left");
  silk("MADE IN W. GERMANY", 33, 64, 1.1, "left");
  silk("+5V", 64, 61.8, 1.4);
  silk("GND", 80, 61.8, 1.4);
}

// a solder pad with a lead through it: a ring of tin, a shining mound
function pad(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x + r * 0.35, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, "#c6ccd0");
  g.addColorStop(0.8, "#727a80");
  g.addColorStop(1, "#4a5258");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y - r * 0.34, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

// everything else soldered to the board
function paintParts(ctx, L) {
  const { m } = L;
  const P = L.at;
  const silk = L.silk;
  const rect = (x, y, w, h, r = 0) => {
    const p = P(x, y);
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, w * m, h * m, r * m);
  };

  // U1: a sixteen-pin chip in black epoxy, its legs splayed to their pads
  for (let i = 0; i < 8; i++) {
    for (const y of [10.5, 19.5]) {
      const p = P(29.4 + i * 3.2, y);
      pad(ctx, p.x, p.y, 0.95 * m);
      const lg = ctx.createLinearGradient(p.x - 0.5 * m, 0, p.x + 0.5 * m, 0);
      lg.addColorStop(0, "#8a9094");
      lg.addColorStop(0.5, "#eef0f2");
      lg.addColorStop(1, "#7a8084");
      ctx.fillStyle = lg;
      ctx.fillRect(p.x - 0.5 * m, Math.min(p.y, P(0, 15).y), m, Math.abs(P(0, 15).y - p.y));
    }
  }
  shadow(ctx, 1.6 * m, 0.6, 0.8 * m, () => {
    rect(26.6, 11.6, 28, 6.8, 0.4);
    ctx.fill();
  });
  rect(26.6, 11.6, 28, 6.8, 0.4);
  const ug = ctx.createLinearGradient(0, P(0, 11.6).y, 0, P(0, 18.4).y);
  ug.addColorStop(0, "#3a3c40");
  ug.addColorStop(0.12, "#1e2024");
  ug.addColorStop(0.9, "#121316");
  ug.addColorStop(1, "#050506");
  ctx.fillStyle = ug;
  ctx.fill();
  // its notch and the dot by pin 1, the type lasered on it
  const n = P(26.6, 15);
  ctx.fillStyle = "#08090a";
  ctx.beginPath();
  ctx.arc(n.x, n.y, 1.1 * m, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  const d = P(28.6, 17.2);
  ctx.beginPath();
  ctx.arc(d.x, d.y, 0.5 * m, 0, Math.PI * 2);
  ctx.fill();
  const tp = P(40.6, 14.3);
  ctx.fillStyle = "rgba(190,194,198,0.75)";
  ctx.font = `${(2.5 * m).toFixed(1)}px ${LABEL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HCF4017BE", tp.x, tp.y);
  ctx.font = `${(1.5 * m).toFixed(1)}px ${LABEL_FONT}`;
  ctx.fillStyle = "rgba(190,194,198,0.5)";
  ctx.fillText("8734  MALAYSIA", tp.x, tp.y + 2.3 * m);
  silk("U1", 24, 15, 2);

  // Y1: a crystal in its tin can
  for (const x of [56.8, 63.2]) pad(ctx, P(x, 11).x, P(x, 11).y, 0.95 * m);
  shadow(ctx, 1.4 * m, 0.55, 0.7 * m, () => {
    rect(55.6, 9.2, 8.8, 3.6, 1.8);
    ctx.fill();
  });
  rect(55.6, 9.2, 8.8, 3.6, 1.8);
  const cg = ctx.createLinearGradient(0, P(0, 9.2).y, 0, P(0, 12.8).y);
  cg.addColorStop(0, "#fafcfc");
  cg.addColorStop(0.3, "#c4cace");
  cg.addColorStop(0.7, "#98a0a6");
  cg.addColorStop(1, "#5a6268");
  ctx.fillStyle = cg;
  ctx.fill();
  const yt = P(60, 11);
  ctx.fillStyle = "rgba(40,46,52,0.75)";
  ctx.font = `${(1.4 * m).toFixed(1)}px ${LABEL_FONT}`;
  ctx.fillText("4.000", yt.x, yt.y);
  silk("Y1", 60, 14.4, 1.4);

  // D1: the LED, a red dome on its flat-sided collar
  for (const x of [64.6, 67.4]) pad(ctx, P(x, 13.5).x, P(x, 13.5).y, 0.85 * m);
  const led = L.led;
  shadow(ctx, 1.8 * m, 0.5, 0.8 * m, () => {
    ctx.beginPath();
    ctx.arc(led.x, led.y, 2.5 * m, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#7a1414";
  ctx.beginPath();
  ctx.arc(led.x, led.y, 2.5 * m, 0.35, Math.PI * 2 - 0.35);
  ctx.closePath();
  ctx.fill();
  const lg2 = ctx.createRadialGradient(led.x + 0.5 * m, led.y - 0.6 * m, 0, led.x, led.y, 2.1 * m);
  lg2.addColorStop(0, "#ffd6c8");
  lg2.addColorStop(0.25, "#ff5a48");
  lg2.addColorStop(0.8, "#c01c1c");
  lg2.addColorStop(1, "#7a1010");
  ctx.fillStyle = lg2;
  ctx.beginPath();
  ctx.arc(led.x, led.y, 2.1 * m, 0, Math.PI * 2);
  ctx.fill();
  silk("D1", 66, 18, 1.4);

  // C1, C2: electrolytics seen end on — the scored aluminium top, the
  // sleeve's stripe down the negative side
  const cap = (x, y, r, name) => {
    const p = P(x, y);
    shadow(ctx, 5 * m, 0.55, 1.4 * m, () => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * m, 0, Math.PI * 2);
      ctx.fill();
      // it stands tall: the shadow runs the length of its side
      ctx.lineWidth = r * m * 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - SHADOW.x * 4 * m, p.y - SHADOW.y * 4 * m);
      ctx.stroke();
    });
    ctx.fillStyle = "#14203e";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * m, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#c8ccd4";
    ctx.fillRect(p.x - r * m, p.y - r * m * 0.34, r * m * 0.34, r * m * 0.68);
    ctx.restore();
    const tg = ctx.createLinearGradient(p.x - r * m, p.y + r * m, p.x + r * m, p.y - r * m);
    tg.addColorStop(0, "#7c848c");
    tg.addColorStop(0.45, "#c8ced4");
    tg.addColorStop(0.62, "#f6f8fa");
    tg.addColorStop(1, "#a0a8b0");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * m * 0.82, 0, Math.PI * 2);
    ctx.fill();
    // the vent scored in the top
    ctx.strokeStyle = "rgba(60,66,74,0.7)";
    ctx.lineWidth = Math.max(0.6, 0.2 * m);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(a) * r * m * 0.7, p.y + Math.sin(a) * r * m * 0.7);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * m * 0.82, -1.2, 0.2);
    ctx.stroke();
    silk(name, x, y + r + 1.6, 1.6);
    silk("+", x + r + 1.2, y - r * 0.5, 1.8);
  };
  cap(12, 54, 4.6, "C1");
  cap(27, 55.4, 3.4, "C2");

  // C3: a ceramic disc, standing on edge
  for (const x of [48.2, 51.8]) pad(ctx, P(x, 53.4).x, P(x, 53.4).y, 0.9 * m);
  shadow(ctx, 2.6 * m, 0.5, 0.9 * m, () => {
    rect(47.2, 52.5, 5.6, 1.8, 0.9);
    ctx.fill();
  });
  rect(47.2, 52.5, 5.6, 1.8, 0.9);
  const dg = ctx.createLinearGradient(0, P(0, 52.5).y, 0, P(0, 54.3).y);
  dg.addColorStop(0, "#f0a85a");
  dg.addColorStop(1, "#9a5a1e");
  ctx.fillStyle = dg;
  ctx.fill();
  silk("C3", 50, 57, 1.4);

  // J1: a row of header pins in their black strip
  shadow(ctx, 2.2 * m, 0.5, 0.9 * m, () => {
    rect(60.2, 55.2, 21.6, 3.6, 0.3);
    ctx.fill();
  });
  rect(60.2, 55.2, 21.6, 3.6, 0.3);
  ctx.fillStyle = "#16171a";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(0.6, 0.16 * m);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const p = P(62 + i * 3.6, 57);
    const pg = ctx.createLinearGradient(p.x - 0.7 * m, p.y - 0.7 * m, p.x + 0.7 * m, p.y + 0.7 * m);
    pg.addColorStop(0, "#8a6a1e");
    pg.addColorStop(0.5, "#ffeeb0");
    pg.addColorStop(1, "#a8842e");
    ctx.fillStyle = pg;
    ctx.fillRect(p.x - 0.65 * m, p.y - 0.65 * m, 1.3 * m, 1.3 * m);
  }
  silk("J1", 57.6, 57, 1.4);

  // RV1: a trimmer, a blue box with a brass screw to turn
  shadow(ctx, 2.4 * m, 0.5, 0.9 * m, () => {
    rect(85, 49.4, 7.2, 7.2, 0.5);
    ctx.fill();
  });
  rect(85, 49.4, 7.2, 7.2, 0.5);
  const bg = ctx.createLinearGradient(P(85, 0).x, P(0, 56.6).y, P(92.2, 0).x, P(0, 49.4).y);
  bg.addColorStop(0, "#1c3c8a");
  bg.addColorStop(1, "#3a6ad0");
  ctx.fillStyle = bg;
  ctx.fill();
  const sc = P(88.6, 53);
  const sg = ctx.createRadialGradient(sc.x + 0.6 * m, sc.y - 0.6 * m, 0, sc.x, sc.y, 2 * m);
  sg.addColorStop(0, "#fff0b8");
  sg.addColorStop(1, "#8a6a22");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sc.x, sc.y, 2 * m, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2a08";
  ctx.lineWidth = 0.5 * m;
  ctx.beginPath();
  ctx.moveTo(sc.x - 1.3 * m, sc.y + 0.9 * m);
  ctx.lineTo(sc.x + 1.3 * m, sc.y - 0.9 * m);
  ctx.stroke();
  silk("RV1", 88.6, 47.6, 1.4);

  // Q1: a transistor, a black half-round on three legs
  for (const x of [85.6, 88, 90.4]) pad(ctx, P(x, 10).x, P(x, 10).y, 0.8 * m);
  const q = P(88, 10);
  shadow(ctx, 2.4 * m, 0.5, 0.9 * m, () => {
    ctx.beginPath();
    ctx.arc(q.x, q.y, 3 * m, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(q.x, q.y + 0.6 * m, 3 * m, Math.PI * 1.05, -Math.PI * 0.05);
  ctx.closePath();
  const qg = ctx.createLinearGradient(0, q.y - 3 * m, 0, q.y + m);
  qg.addColorStop(0, "#3a3c40");
  qg.addColorStop(1, "#0c0d0f");
  ctx.fillStyle = qg;
  ctx.fill();
  silk("Q1", 93.4, 11, 1.4);
}

// A resistor: a bone-shaped body in a glossy tan lacquer, its colour bands
// round it, on two tinned leads bent down into their pads. `s` is the size
// of a board unit; the body is 17 of them long.
function paintResistor(ctx, cx, cy, s, bands) {
  const len = 17 * s;
  const r = 2.9 * s;
  const reach = 11.7 * s; // each pad, from the middle
  // the leads' shadows, then the pads and the leads
  shadow(ctx, 2.4 * s, 0.55, 0.5 * s, () => {
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(cx - reach, cy);
    ctx.lineTo(cx + reach, cy);
    ctx.stroke();
  });
  for (const d of [-1, 1]) {
    pad(ctx, cx + d * reach, cy, 1.55 * s);
    const lg = ctx.createLinearGradient(0, cy - 0.45 * s, 0, cy + 0.45 * s);
    lg.addColorStop(0, "#ffffff");
    lg.addColorStop(0.45, "#c2c8cc");
    lg.addColorStop(1, "#5e666c");
    ctx.fillStyle = lg;
    const x0 = cx + d * (len / 2 - s);
    const x1 = cx + d * reach;
    ctx.beginPath();
    ctx.roundRect(Math.min(x0, x1), cy - 0.45 * s, Math.abs(x1 - x0) + 0.3 * s, 0.9 * s, 0.45 * s);
    ctx.fill();
    // the bend down into the board, seen as a bright knuckle
    ctx.fillStyle = "#f4f6f8";
    ctx.beginPath();
    ctx.arc(x1, cy, 0.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // the body's shadow on the board
  const body = () => {
    const cap = len * 0.24;
    const waist = r * 0.84;
    ctx.beginPath();
    ctx.moveTo(cx - len / 2 + r, cy - r);
    ctx.lineTo(cx - len / 2 + cap - r * 0.3, cy - r);
    ctx.quadraticCurveTo(cx - len / 2 + cap, cy - r, cx - len / 2 + cap + r * 0.4, cy - waist);
    ctx.lineTo(cx + len / 2 - cap - r * 0.4, cy - waist);
    ctx.quadraticCurveTo(cx + len / 2 - cap, cy - r, cx + len / 2 - cap + r * 0.3, cy - r);
    ctx.lineTo(cx + len / 2 - r, cy - r);
    ctx.arc(cx + len / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(cx + len / 2 - cap + r * 0.3, cy + r);
    ctx.quadraticCurveTo(cx + len / 2 - cap, cy + r, cx + len / 2 - cap - r * 0.4, cy + waist);
    ctx.lineTo(cx - len / 2 + cap + r * 0.4, cy + waist);
    ctx.quadraticCurveTo(cx - len / 2 + cap, cy + r, cx - len / 2 + cap - r * 0.3, cy + r);
    ctx.lineTo(cx - len / 2 + r, cy + r);
    ctx.arc(cx - len / 2 + r, cy, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
  };
  shadow(ctx, 3 * s, 0.6, 0.9 * s, () => {
    body();
    ctx.fill();
  });
  body();
  ctx.fillStyle = "#d8c198";
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the bands: three for the value at one end, the tolerance apart at the
  // other
  const bw = len * 0.078;
  [0.2, 0.34, 0.48, 0.8].forEach((f, i) => {
    ctx.fillStyle = BAND_PAINT[bands[i]];
    ctx.fillRect(cx - len / 2 + len * f - bw / 2, cy - r - 1, bw, r * 2 + 2);
  });
  // the roundness of it: lit along the top, dark under, the ends turning
  const round = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  round.addColorStop(0, "rgba(0,0,0,0.28)");
  round.addColorStop(0.16, "rgba(255,255,255,0.3)");
  round.addColorStop(0.3, "rgba(255,255,255,0.08)");
  round.addColorStop(0.55, "rgba(0,0,0,0.06)");
  round.addColorStop(0.82, "rgba(20,10,0,0.42)");
  round.addColorStop(1, "rgba(10,5,0,0.7)");
  ctx.fillStyle = round;
  ctx.fillRect(cx - len / 2, cy - r, len, r * 2);
  const endsG = ctx.createLinearGradient(cx - len / 2, 0, cx + len / 2, 0);
  endsG.addColorStop(0, "rgba(10,5,0,0.55)");
  endsG.addColorStop(0.07, "rgba(10,5,0,0)");
  endsG.addColorStop(0.93, "rgba(10,5,0,0)");
  endsG.addColorStop(1, "rgba(10,5,0,0.55)");
  ctx.fillStyle = endsG;
  ctx.fillRect(cx - len / 2, cy - r, len, r * 2);
  // the lacquer's gloss: the lamp, drawn out along it
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.roundRect(cx - len * 0.36, cy - r * 0.62, len * 0.72, r * 0.16, r * 0.08);
  ctx.fill();
  // the board's green, thrown back up under it
  const bounce = ctx.createLinearGradient(0, cy + r * 0.6, 0, cy + r);
  bounce.addColorStop(0, "rgba(80,200,120,0)");
  bounce.addColorStop(1, "rgba(80,200,120,0.25)");
  ctx.fillStyle = bounce;
  ctx.fillRect(cx - len / 2, cy + r * 0.6, len, r * 0.4);
  ctx.restore();
}

// ── round the board ─────────────────────────────────────────────────────────

// the colour code: a printed card under tape — ten swatches, black to
// white, a digit under each; gold and silver apart, as tolerances
function paintCard(ctx, L) {
  const { u } = L;
  const c = L.card;
  const rnd = lcg(77);
  ctx.save();
  ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
  ctx.rotate(-0.012);
  ctx.translate(-c.w / 2, -c.h / 2);
  shadow(ctx, 2 * u, 0.6, 3 * u, () => {
    ctx.fillRect(0, 0, c.w, c.h);
  });
  const g = ctx.createLinearGradient(0, 0, 0, c.h);
  g.addColorStop(0, "#f2ecda");
  g.addColorStop(1, "#d8ceb4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.w, c.h);
  // a printed rule round it, the heading set small in the corner
  ctx.strokeStyle = "rgba(60,50,36,0.45)";
  ctx.lineWidth = Math.max(0.6, 0.8 * u);
  ctx.strokeRect(c.h * 0.07, c.h * 0.07, c.w - c.h * 0.14, c.h * 0.86);
  const n = BAND_COLOURS.length;
  const sw = (c.w * 0.74) / n;
  const sx = c.w * 0.035;
  const top = c.h * 0.17;
  const sh = c.h * 0.42;
  const swatch = (x, w, colour) => {
    // each printed as a little band round a body, as on the part itself
    ctx.fillStyle = BAND_PAINT[colour];
    ctx.fillRect(x, top, w, sh);
    const gl = ctx.createLinearGradient(0, top, 0, top + sh);
    gl.addColorStop(0, "rgba(255,255,255,0.22)");
    gl.addColorStop(0.4, "rgba(255,255,255,0)");
    gl.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = gl;
    ctx.fillRect(x, top, w, sh);
    ctx.strokeStyle = "rgba(40,30,20,0.6)";
    ctx.lineWidth = Math.max(0.6, 0.8 * u);
    ctx.strokeRect(x, top, w, sh);
  };
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  BAND_COLOURS.forEach((colour, i) => {
    const x = sx + i * sw;
    swatch(x + sw * 0.08, sw * 0.84, colour);
    ctx.fillStyle = "#1e1a14";
    ctx.font = `bold ${Math.round(c.h * 0.25)}px ${LABEL_FONT}`;
    ctx.fillText(String(BAND_DIGITS[colour]), x + sw / 2, top + sh + c.h * 0.2);
  });
  [
    ["gold", "±5%"],
    ["silver", "±10%"],
  ].forEach(([colour, label], i) => {
    const x = sx + (n + 0.55 + i * 1.3) * sw;
    swatch(x, sw * 1.12, colour);
    ctx.fillStyle = "#3a3024";
    ctx.font = `${Math.round(c.h * 0.17)}px ${LABEL_FONT}`;
    ctx.fillText(label, x + sw * 0.56, top + sh + c.h * 0.2);
  });
  // thumbed and stained
  for (let i = 0; i < 6; i++) {
    soft(ctx, rnd() * c.w, rnd() * c.h, (10 + rnd() * 26) * u, (6 + rnd() * 12) * u, "120,90,40", 0.1);
  }
  // two strips of yellowed tape hold it to the mat
  for (const [tx, ta] of [
    [c.w * 0.02, -0.5],
    [c.w * 0.98, 0.45],
  ]) {
    ctx.save();
    ctx.translate(tx, c.h * 0.08);
    ctx.rotate(ta);
    ctx.fillStyle = "rgba(226,206,150,0.55)";
    ctx.fillRect(-26 * u, -8 * u, 52 * u, 16 * u);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(-26 * u, -8 * u, 52 * u, 3 * u);
    ctx.restore();
  }
  ctx.restore();
}

// the multimeter: a yellow rubber boot, a grey face, the display (its
// reading is the scene's), the big range switch, and its two leads running
// to the board
function paintMeter(ctx, L) {
  const t = L.meter;
  const k = t.s;
  const w = 150 * k;
  const h = 280 * k;
  // the leads first, so the meter lies on them: red to +5V, black to ground
  const jack = (dx) => ({ x: t.x + dx * k, y: t.y + h / 2 - 26 * k });
  const lead = (from, to, colour, bend) => {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(from.x + bend * k, from.y + 210 * k, to.x + 200 * k, to.y + 150 * k, to.x + 64 * k, to.y + 29.5 * k);
    };
    shadow(ctx, 3 * k, 0.5, 2 * k, () => {
      ctx.lineWidth = 5 * k;
      ctx.lineCap = "round";
      path();
      ctx.stroke();
    });
    ctx.lineCap = "round";
    ctx.strokeStyle = colour[0];
    ctx.lineWidth = 5 * k;
    path();
    ctx.stroke();
    ctx.strokeStyle = colour[1];
    ctx.lineWidth = 1.4 * k;
    ctx.save();
    ctx.translate(0.8 * k, -1.2 * k);
    path();
    ctx.stroke();
    ctx.restore();
    // the probe: a grip, a steel point resting on its pin
    const a = Math.atan2(12 * k, 26 * k);
    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.rotate(a);
    shadow(ctx, 3 * k, 0.5, 2 * k, () => {
      ctx.fillRect(8 * k, -4.5 * k, 62 * k, 9 * k);
    });
    const sg = ctx.createLinearGradient(0, -1.2 * k, 0, 1.2 * k);
    sg.addColorStop(0, "#ffffff");
    sg.addColorStop(1, "#70787e");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12 * k, -1.3 * k);
    ctx.lineTo(12 * k, 1.3 * k);
    ctx.closePath();
    ctx.fill();
    const gg = ctx.createLinearGradient(0, -5 * k, 0, 5 * k);
    gg.addColorStop(0, colour[1]);
    gg.addColorStop(0.4, colour[0]);
    gg.addColorStop(1, colour[2]);
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(11 * k, -2 * k);
    ctx.lineTo(22 * k, -4.6 * k);
    ctx.lineTo(70 * k, -4 * k);
    ctx.lineTo(70 * k, 4 * k);
    ctx.lineTo(22 * k, 4.6 * k);
    ctx.lineTo(11 * k, 2 * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i < 5; i++) ctx.fillRect((28 + i * 4) * k, -4.5 * k, 1.4 * k, 9 * k);
    ctx.restore();
  };
  lead(jack(34), L.at(62, 57), ["#c41e1e", "#ff8a80", "#6a0c0c"], 30);
  lead(jack(-2), L.at(80, 57), ["#18191c", "#6a6e74", "#000000"], -60);
  // the boot
  const boot = () => {
    ctx.beginPath();
    ctx.roundRect(t.x - w / 2, t.y - h / 2, w, h, 22 * k);
  };
  shadow(ctx, 16 * k, 0.6, 7 * k, () => {
    boot();
    ctx.fill();
  });
  boot();
  const bg = ctx.createLinearGradient(t.x - w / 2, t.y + h / 2, t.x + w / 2, t.y - h / 2);
  bg.addColorStop(0, "#a8780a");
  bg.addColorStop(0.5, "#e2aa1c");
  bg.addColorStop(1, "#f6cc4a");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,240,180,0.5)";
  ctx.lineWidth = 1.4 * k;
  ctx.stroke();
  // the face
  ctx.beginPath();
  ctx.roundRect(t.x - w / 2 + 11 * k, t.y - h / 2 + 11 * k, w - 22 * k, h - 22 * k, 12 * k);
  const fg = ctx.createLinearGradient(0, t.y - h / 2, 0, t.y + h / 2);
  fg.addColorStop(0, "#3c4046");
  fg.addColorStop(1, "#22252a");
  ctx.fillStyle = fg;
  ctx.fill();
  // the display: grey-green glass set in a bezel
  const lw = 104 * k;
  const lh = 46 * k;
  const lx = t.x - lw / 2;
  const ly = L.meter.lcd.y - lh / 2;
  ctx.fillStyle = "#0e1012";
  ctx.beginPath();
  ctx.roundRect(lx - 5 * k, ly - 5 * k, lw + 10 * k, lh + 10 * k, 5 * k);
  ctx.fill();
  const dg = ctx.createLinearGradient(0, ly, 0, ly + lh);
  dg.addColorStop(0, "#9aa88e");
  dg.addColorStop(1, "#b6c2a6");
  ctx.fillStyle = dg;
  ctx.fillRect(lx, ly, lw, lh);
  ctx.fillStyle = "rgba(30,40,26,0.75)";
  ctx.font = `bold ${Math.round(9 * k)}px ${SILK_FONT}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("V", lx + lw - 5 * k, ly + lh - 7 * k);
  ctx.textAlign = "left";
  ctx.font = `bold ${Math.round(6.5 * k)}px ${SILK_FONT}`;
  ctx.fillText("DC  AUTO", lx + 5 * k, ly + 10 * k);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx + lw * 0.5, ly);
  ctx.lineTo(lx + lw * 0.3, ly + lh);
  ctx.lineTo(lx, ly + lh);
  ctx.closePath();
  ctx.fill();
  // the range switch: its ring of positions, the knob, its white pointer
  const dc = { x: t.x, y: t.y + 22 * k };
  const marks = ["OFF", "V~", "V=", "mV", "Ω", "→|", "A", "mA"];
  ctx.fillStyle = "rgba(230,232,228,0.8)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(8.5 * k)}px ${SILK_FONT}`;
  marks.forEach((mk, i) => {
    const a = -Math.PI * 1.25 + (i / (marks.length - 1)) * Math.PI * 1.5;
    ctx.fillStyle = i === 2 ? "#ffd24a" : "rgba(230,232,228,0.75)";
    ctx.fillText(mk, dc.x + Math.cos(a) * 55 * k, dc.y + Math.sin(a) * 55 * k);
  });
  shadow(ctx, 9 * k, 0.55, 4 * k, () => {
    ctx.beginPath();
    ctx.arc(dc.x, dc.y, 38 * k, 0, Math.PI * 2);
    ctx.fill();
  });
  const kg = ctx.createRadialGradient(dc.x + 12 * k, dc.y - 14 * k, 2 * k, dc.x, dc.y, 40 * k);
  kg.addColorStop(0, "#5a5e66");
  kg.addColorStop(0.6, "#2a2c30");
  kg.addColorStop(1, "#0e0f11");
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.arc(dc.x, dc.y, 38 * k, 0, Math.PI * 2);
  ctx.fill();
  // the knob's grip, pointing at V=
  const pa = -Math.PI * 1.25 + (2 / (marks.length - 1)) * Math.PI * 1.5;
  ctx.save();
  ctx.translate(dc.x, dc.y);
  ctx.rotate(pa);
  const gg = ctx.createLinearGradient(0, -11 * k, 0, 11 * k);
  gg.addColorStop(0, "#6a6e76");
  gg.addColorStop(0.5, "#3a3c42");
  gg.addColorStop(1, "#16171a");
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.roundRect(-36 * k, -11 * k, 72 * k, 22 * k, 11 * k);
  ctx.fill();
  ctx.fillStyle = "#f2f2ee";
  ctx.fillRect(16 * k, -1.6 * k, 18 * k, 3.2 * k);
  ctx.restore();
  // the jacks along the bottom, the two in use plugged
  [-38, -2, 34].forEach((dx, i) => {
    const j = jack(dx);
    ctx.fillStyle = "#0a0a0c";
    ctx.beginPath();
    ctx.arc(j.x, j.y, 9.5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = i === 2 ? "#c41e1e" : "#5a5e66";
    ctx.lineWidth = 2 * k;
    ctx.stroke();
    if (i > 0) {
      const pg = ctx.createRadialGradient(j.x + 2 * k, j.y - 2 * k, 0, j.x, j.y, 7 * k);
      pg.addColorStop(0, i === 2 ? "#ff8a80" : "#6a6e74");
      pg.addColorStop(1, i === 2 ? "#8a1010" : "#0c0c0e");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(j.x, j.y, 7 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// the soldering iron in its stand: a heavy base with a damp sponge in its
// tray, a coil of spring wire, and the iron lying in it, tip still hot
function paintIron(ctx, L) {
  const it = L.iron;
  const k = it.s;
  ctx.save();
  ctx.translate(it.x, it.y);
  // the base
  const base = () => {
    ctx.beginPath();
    ctx.roundRect(-84 * k, -34 * k, 168 * k, 92 * k, 10 * k);
  };
  shadow(ctx, 8 * k, 0.6, 5 * k, () => {
    base();
    ctx.fill();
  });
  base();
  const bg = ctx.createLinearGradient(-84 * k, 58 * k, 84 * k, -34 * k);
  bg.addColorStop(0, "#1c1e22");
  bg.addColorStop(1, "#3c4048");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = Math.max(0.8, k);
  ctx.stroke();
  // the sponge in its tray, wet and scorched
  ctx.fillStyle = "#0c0d0f";
  ctx.beginPath();
  ctx.roundRect(-74 * k, 2 * k, 70 * k, 48 * k, 5 * k);
  ctx.fill();
  const sg = ctx.createLinearGradient(-70 * k, 46 * k, -8 * k, 6 * k);
  sg.addColorStop(0, "#a8861e");
  sg.addColorStop(1, "#e2c04a");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.roundRect(-70 * k, 6 * k, 62 * k, 40 * k, 6 * k);
  ctx.fill();
  const rnd = lcg(91);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = rnd() < 0.6 ? "rgba(70,50,6,0.45)" : "rgba(255,244,190,0.3)";
    ctx.beginPath();
    ctx.arc((-66 + rnd() * 54) * k, (10 + rnd() * 32) * k, (0.6 + rnd() * 1.6) * k, 0, Math.PI * 2);
    ctx.fill();
  }
  soft(ctx, -34 * k, 28 * k, 14 * k, 6 * k, "40,24,6", 0.55);
  ctx.rotate(it.a);
  // the iron: barrel and tip through the coil, the grip out behind, its flex
  shadow(ctx, 14 * k, 0.5, 5 * k, () => {
    ctx.fillRect(-120 * k, -9 * k, 216 * k, 18 * k);
  });
  ctx.strokeStyle = "#101114";
  ctx.lineWidth = 6 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-118 * k, 0);
  ctx.bezierCurveTo(-170 * k, -4 * k, -200 * k, 40 * k, -190 * k, 130 * k);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.4 * k;
  ctx.beginPath();
  ctx.moveTo(-118 * k, -2 * k);
  ctx.bezierCurveTo(-170 * k, -6 * k, -202 * k, 38 * k, -192 * k, 130 * k);
  ctx.stroke();
  const grip = ctx.createLinearGradient(0, -10 * k, 0, 10 * k);
  grip.addColorStop(0, "#5a8ad8");
  grip.addColorStop(0.35, "#2a55a8");
  grip.addColorStop(1, "#0e2050");
  ctx.fillStyle = grip;
  ctx.beginPath();
  ctx.moveTo(-120 * k, -6 * k);
  ctx.quadraticCurveTo(-80 * k, -12 * k, -42 * k, -9 * k);
  ctx.lineTo(-30 * k, -7 * k);
  ctx.lineTo(-30 * k, 7 * k);
  ctx.lineTo(-42 * k, 9 * k);
  ctx.quadraticCurveTo(-80 * k, 12 * k, -120 * k, 6 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (let i = 0; i < 6; i++) ctx.fillRect((-76 + i * 6) * k, -10 * k, 2 * k, 20 * k);
  ctx.fillStyle = "#16171a";
  ctx.fillRect(-32 * k, -8 * k, 8 * k, 16 * k);
  const steel = ctx.createLinearGradient(0, -5 * k, 0, 5 * k);
  steel.addColorStop(0, "#f2f4f6");
  steel.addColorStop(0.4, "#a8aeb4");
  steel.addColorStop(1, "#4a5056");
  ctx.fillStyle = steel;
  ctx.fillRect(-24 * k, -4.6 * k, 84 * k, 9.2 * k);
  // the barrel has blued with the heat toward the tip
  const blue = ctx.createLinearGradient(20 * k, 0, 60 * k, 0);
  blue.addColorStop(0, "rgba(90,70,150,0)");
  blue.addColorStop(0.6, "rgba(90,70,150,0.45)");
  blue.addColorStop(1, "rgba(170,110,50,0.5)");
  ctx.fillStyle = blue;
  ctx.fillRect(20 * k, -4.6 * k, 40 * k, 9.2 * k);
  const tipG = ctx.createLinearGradient(60 * k, 0, 98 * k, 0);
  tipG.addColorStop(0, "#8a8e94");
  tipG.addColorStop(0.7, "#d8dce0");
  tipG.addColorStop(1, "#ffd9a0");
  ctx.fillStyle = tipG;
  ctx.beginPath();
  ctx.moveTo(60 * k, -3.4 * k);
  ctx.lineTo(86 * k, -2.6 * k);
  ctx.lineTo(98 * k, 0);
  ctx.lineTo(86 * k, 2.6 * k);
  ctx.lineTo(60 * k, 3.4 * k);
  ctx.closePath();
  ctx.fill();
  // the coil round the barrel: each turn a bright loop with its dark side
  for (let i = 0; i < 11; i++) {
    const x = (-14 + i * 7.4) * k;
    const rr = (13 - i * 0.35) * k;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3.4 * k;
    ctx.beginPath();
    ctx.ellipse(x + 1.2 * k, 1.5 * k, 4.2 * k, rr, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#8a9096";
    ctx.lineWidth = 2.6 * k;
    ctx.beginPath();
    ctx.ellipse(x, 0, 4.2 * k, rr, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 0.9 * k;
    ctx.beginPath();
    ctx.ellipse(x, 0, 4.2 * k, rr, 0, -Math.PI * 0.85, -Math.PI * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

// a reel of solder: the wound wire bright between two flanges, a length of
// it pulled off across the bench
function paintSpool(ctx, L) {
  const sp = L.spool;
  const k = sp.s;
  const r = 62 * k;
  // the loose end first, under the reel
  const wire = () => {
    ctx.beginPath();
    ctx.moveTo(sp.x + r * 0.6, sp.y + r * 0.5);
    ctx.bezierCurveTo(sp.x + r * 1.6, sp.y + r * 1.4, sp.x - r * 0.4, sp.y + r * 2.0, sp.x + r * 0.9, sp.y + r * 2.9);
  };
  shadow(ctx, 2 * k, 0.5, 1.5 * k, () => {
    ctx.lineWidth = 3 * k;
    wire();
    ctx.stroke();
  });
  ctx.lineCap = "round";
  ctx.strokeStyle = "#8a9096";
  ctx.lineWidth = 3 * k;
  wire();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 0.9 * k;
  ctx.save();
  ctx.translate(0.6 * k, -0.8 * k);
  wire();
  ctx.stroke();
  ctx.restore();
  shadow(ctx, 20 * k, 0.6, 7 * k, () => {
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  // the flange: blue plastic, a paper label, the hole through the hub
  const fg = ctx.createRadialGradient(sp.x + r * 0.4, sp.y - r * 0.45, r * 0.1, sp.x, sp.y, r);
  fg.addColorStop(0, "#5a86c8");
  fg.addColorStop(1, "#1a3468");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
  ctx.fill();
  // the wire showing through the flange's windows
  for (let i = 0; i < 4; i++) {
    const a = 0.5 + (i * Math.PI) / 2;
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.roundRect(r * 0.5, -r * 0.12, r * 0.38, r * 0.24, r * 0.1);
    const wg = ctx.createLinearGradient(r * 0.5, 0, r * 0.88, 0);
    wg.addColorStop(0, "#5a6066");
    wg.addColorStop(0.5, "#e2e6ea");
    wg.addColorStop(1, "#70767c");
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#e8e0c8";
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a3226";
  ctx.font = `bold ${Math.round(r * 0.13)}px ${SILK_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("60/40", sp.x, sp.y - r * 0.24);
  ctx.fillText("0.8 mm", sp.x, sp.y + r * 0.26);
  ctx.fillStyle = "#0c0e12";
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.2 * k;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, r * 0.97, -1.3, 0.1);
  ctx.stroke();
}

// fine tweezers, their points just apart
function paintTweezers(ctx, L) {
  const tw = L.tweezers;
  const k = tw.s;
  ctx.save();
  ctx.translate(tw.x, tw.y);
  ctx.rotate(1.12);
  const arm = (d) => {
    ctx.beginPath();
    ctx.moveTo(-78 * k, 0);
    ctx.quadraticCurveTo(-30 * k, d * 13 * k, 20 * k, d * 8 * k);
    ctx.lineTo(80 * k, d * 1.6 * k);
    ctx.lineTo(80 * k, d * 0.4 * k);
    ctx.lineTo(18 * k, d * 2.4 * k);
    ctx.quadraticCurveTo(-30 * k, d * 6 * k, -78 * k, 0);
    ctx.closePath();
  };
  for (const d of [-1, 1]) {
    shadow(ctx, 3 * k, 0.5, 2 * k, () => {
      arm(d);
      ctx.fill();
    });
  }
  for (const d of [-1, 1]) {
    arm(d);
    const g = ctx.createLinearGradient(0, -12 * k, 0, 12 * k);
    g.addColorStop(0, "#f6f8fa");
    g.addColorStop(0.5, "#9aa0a6");
    g.addColorStop(1, "#4e545a");
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

// ── the light ───────────────────────────────────────────────────────────────

// the lamp's pool over the board, and the bench going dark away from it
function paintLight(ctx, L) {
  const { W, H, u } = L;
  const b = L.board;
  const cx = b.x + b.w * 0.56;
  const cy = b.y + b.h * 0.44;
  soft(ctx, cx, cy, b.w * 0.75, b.h * 0.9, LAMP, 0.06, "lighter");
  const step = Math.max(6, Math.round(10 * u));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const d = Math.hypot((x + step / 2 - cx) / (W * 0.62), (y + step / 2 - cy) / (H * 0.78));
      const a = Math.min(0.7, Math.max(0, d - 0.44) * 1.0);
      if (a <= 0.004) continue;
      ctx.fillStyle = `rgba(5,6,10,${a.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}

// the magnifier lamp, hanging over the board's corner on its arm: a ring of
// light round a lens, and in the lens what lies under it, larger
function paintLamp(ctx, L) {
  const { u } = L;
  const l = L.lens;
  // what the lens shows, taken before the lamp is drawn over it
  const zoom = 1.55;
  const view = makeCanvas(Math.ceil(l.r * 2), Math.ceil(l.r * 2));
  view
    .getContext("2d")
    .drawImage(ctx.canvas, l.x - l.r / zoom, l.y - l.r / zoom, (l.r * 2) / zoom, (l.r * 2) / zoom, 0, 0, l.r * 2, l.r * 2);
  // its shadow, far below it on the board and the mat
  shadow(ctx, 60 * u, 0.42, 16 * u, () => {
    ctx.lineWidth = l.r * 0.3;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 1.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 16 * u;
    ctx.beginPath();
    ctx.moveTo(l.x + l.r * 0.5, l.y - l.r * 1.1);
    ctx.lineTo(l.x + l.r * 1.4, -40 * u);
    ctx.stroke();
  });
  // the arm, down from the top of the picture, its spring beside it
  const ax = l.x + l.r * 1.5;
  const joint = { x: l.x + l.r * 0.62, y: l.y - l.r * 1.02 };
  ctx.lineCap = "round";
  for (const [w, col] of [
    [13 * u, "#16181c"],
    [9 * u, "#3e424a"],
    [2.4 * u, "#8a9098"],
  ]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax - (w < 3 * u ? 2.5 * u : 0), -30 * u);
    ctx.lineTo(joint.x - (w < 3 * u ? 2.5 * u : 0), joint.y);
    ctx.stroke();
  }
  ctx.fillStyle = "#1a1c20";
  ctx.beginPath();
  ctx.arc(joint.x, joint.y, 10 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aa0a8";
  ctx.beginPath();
  ctx.arc(joint.x, joint.y, 3.4 * u, 0, Math.PI * 2);
  ctx.fill();
  // the housing
  const hg = ctx.createLinearGradient(l.x - l.r, l.y + l.r, l.x + l.r, l.y - l.r);
  hg.addColorStop(0, "#1c1e22");
  hg.addColorStop(0.5, "#3a3e46");
  hg.addColorStop(1, "#5e646e");
  ctx.strokeStyle = hg;
  ctx.lineWidth = l.r * 0.3;
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r * 1.13, 0, Math.PI * 2);
  ctx.stroke();
  // the lens
  ctx.save();
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(view, l.x - l.r, l.y - l.r);
  const tint = ctx.createRadialGradient(l.x, l.y, l.r * 0.5, l.x, l.y, l.r);
  tint.addColorStop(0, "rgba(210,235,255,0.04)");
  tint.addColorStop(0.85, "rgba(170,210,240,0.12)");
  tint.addColorStop(1, "rgba(10,20,30,0.5)");
  ctx.fillStyle = tint;
  ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  // the ring light mirrored in the glass
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = l.r * 0.05;
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r * 0.86, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r * 0.86, Math.PI * 0.1, Math.PI * 0.35);
  ctx.stroke();
  ctx.restore();
  // the ring of light itself, a row of little lamps under a diffuser
  ctx.strokeStyle = `rgba(${LAMP},0.95)`;
  ctx.lineWidth = l.r * 0.085;
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r * 1.045, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = l.r * 0.025;
  ctx.setLineDash([l.r * 0.05, l.r * 0.07]);
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r * 1.045, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  soft(ctx, l.x, l.y, l.r * 1.7, l.r * 1.7, LAMP, 0.16, "lighter");
}

// ── a closer look ───────────────────────────────────────────────────────────

// a resistor seen through a loupe: big, on its bit of green board, in a
// round glass with a knurled rim; the texture the scene shows on a tap
function paintLoupe(L, r) {
  const R = Math.min(L.W, L.H) * 0.18;
  const rim = R * 0.13;
  const size = Math.ceil((R + rim) * 2 + 8);
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const s = (R * 1.5) / (17 * 1); // the size of a board unit under the glass
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy + R, size, cy - R);
  g.addColorStop(0, "#0e4226");
  g.addColorStop(1, "#1a6a3e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // the copper to and from it, under the mask
  ctx.strokeStyle = "rgba(96,190,122,0.34)";
  ctx.lineWidth = s;
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.lineTo(cx + R, cy);
  ctx.moveTo(cx - 11.7 * s, cy);
  ctx.lineTo(cx - 11.7 * s, cy - R);
  ctx.stroke();
  // its outline and name in silkscreen
  ctx.strokeStyle = "rgba(236,240,232,0.7)";
  ctx.lineWidth = 0.24 * s;
  ctx.beginPath();
  ctx.roundRect(cx - 9.2 * s, cy - 3.6 * s, 18.4 * s, 7.2 * s, 0.8 * s);
  ctx.stroke();
  ctx.fillStyle = "rgba(236,240,232,0.9)";
  ctx.font = `700 ${(3.1 * s).toFixed(1)}px ${SILK_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`R${r.i + 1}`, cx, cy + 6.9 * s);
  const rnd = lcg(40 + r.i);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(170,255,190,0.04)";
    ctx.fillRect(rnd() * size, rnd() * size, 2, 2);
  }
  paintResistor(ctx, cx, cy, s, r.bands);
  // the glass: darker toward its edge, the lamp across the top of it
  const tint = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
  tint.addColorStop(0, "rgba(255,255,255,0)");
  tint.addColorStop(0.85, "rgba(190,225,245,0.08)");
  tint.addColorStop(1, "rgba(0,10,20,0.55)");
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = R * 0.045;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.86, Math.PI * 1.1, Math.PI * 1.42);
  ctx.stroke();
  ctx.restore();
  // the rim: black anodised metal, knurled
  const rg = ctx.createLinearGradient(cx - R, cy + R, cx + R, cy - R);
  rg.addColorStop(0, "#0c0d0f");
  rg.addColorStop(0.5, "#2e3136");
  rg.addColorStop(1, "#5a5f68");
  ctx.strokeStyle = rg;
  ctx.lineWidth = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R + rim / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = rim * 0.5;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.arc(cx, cy, R + rim * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

// a wisp of smoke off the hot tip
function paintSmoke() {
  const c = makeCanvas(48, 140);
  const g = c.getContext("2d");
  g.lineCap = "round";
  for (const [w, a] of [
    [14, 0.05],
    [7, 0.1],
    [3, 0.16],
  ]) {
    g.strokeStyle = `rgba(226,232,240,${a})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(24, 134);
    g.bezierCurveTo(8, 100, 40, 74, 22, 40);
    g.quadraticCurveTo(12, 20, 26, 6);
    g.stroke();
  }
  return c;
}
