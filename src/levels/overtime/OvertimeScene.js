import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { PENCIL } from "../../shared/theme.js";
import {
  OVERTIME_CLOCKS,
  CALCULATOR_DIGITS,
  SEGMENTS,
  createCalculator,
  pressKey,
} from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "OVERTIME"  ·  code: SOIL  ·  add up the hours
//
// Drawn in the game's pencil-sketch idiom: a small office late at night. Four
// electronic clocks hang on the wall, each stopped on its own time (the colon
// blinks, the hours do not move). On the desk below them sits a pocket adding
// calculator that really works: digits, 00, +, = and C.
//
// Read each clock as a plain number and add them up on the calculator:
//
//   22:03 + 14:11 + 11:47 + 23:44  →  2203 + 1411 + 1147 + 2344  =  7105
//
// Turn the display upside down and 7105 reads SOIL. The game never says so:
// no legend, no arrow, no turning the calculator for you.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws; the calculator's state survives a resize and starts fresh on replay.
// Canvas-drawn, with lifecycle provided by BasePuzzleScene.
// ─────────────────────────────────────────────────────────────────────────────

const OT_INK = PENCIL; // the pencil itself
const OT_WARM = 0xffdf9e; // lamplight
const LED_RED = 0xff6a4d; // two kinds of clock, two kinds of LED
const LED_AMBER = 0xffb45a;
const LCD_GREEN = 0x91ad6f; // the calculator's display: the same green as the phone's
const LCD_INK = 0x22301a; // and the dark digits on it

// The four clocks, each in its own place and of its own kind: one screwed flat
// to the wall, one standing on the shelf, two on the desk. The times come from
// puzzle.js in this order; where they sit is only scenery. Sizes are for a
// canvas about 900 px wide and scale with it.
const CLOCK_LOOKS = [
  { type: "mounted", x: 0.19, y: 0.2, w: 132, h: 58, led: LED_RED },
  { type: "shelf", x: 0.7, w: 112, h: 64, led: LED_AMBER },
  { type: "alarm", x: 0.19, base: 0.695, w: 108, h: 68, led: LED_RED },
  { type: "wedge", x: 0.31, base: 0.79, w: 118, h: 52, led: LED_AMBER },
];

export default class OvertimeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Overtime" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();

    // a fresh visit: nothing typed yet. A resize redraws from this same state.
    this.calc = createCalculator();
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._layout(W, H);

    this._drawWall(W, H);
    this._drawWindow(W, H);
    this._drawShelf(W, H);
    this._drawCables(W, H);
    this._drawClocks(W, H);
    this._drawTable(W, H);
    this._drawMug(W, H);
    this._drawPencil(W, H);
    this._drawLamp(W, H);
    this._drawCalculator(W, H);
    this._drawLampLight(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
  }

  // Everything is placed off these few numbers, so a resize only recomputes them.
  _layout(W, H) {
    const s = Math.max(0.55, Math.min(W / 900, H / 820, 1.25));
    this._s = s;
    this._tableFar = H * 0.64; // far edge of the desk top
    this._tableNear = H * 0.9; // near edge of the desk top
    this._calcBox = { w: 204 * s, h: 330 * s, cx: W * 0.5, bottom: H * 0.875 };
    // the wall shelf the second clock stands on
    this._shelf = { x0: W * 0.55, x1: W * 0.91, y: H * 0.335, thick: 9 * s };
  }

  // ── the wall ───────────────────────────────────────────────────────────────

  _drawWall(W, H) {
    const g = this.add.graphics().setDepth(-20);
    const rnd = this._rng(1811);
    const far = this._tableFar;
    g.fillGradientStyle(0x151924, 0x151924, 0x0d0f14, 0x0d0f14, 1);
    g.fillRect(0, 0, W, far);
    // faint wallpaper stripes, and a scatter of pencil hatching
    const step = 46 * this._s;
    for (let x = step / 2; x < W; x += step) {
      g.lineStyle(1, OT_INK, 0.028);
      g.lineBetween(x, 0, x, far);
    }
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W;
      const y = rnd() * far * 0.92;
      const len = 10 + rnd() * 22;
      g.lineStyle(1, OT_INK, 0.03 + rnd() * 0.03);
      g.lineBetween(x, y, x + len * 0.6, y + len);
    }
    // the skirting board where the wall meets the desk
    const sk = H * 0.045;
    g.fillStyle(0x0b0d11, 1);
    g.fillRect(0, far - sk, W, sk);
    this._pencilSeg(g, rnd, 0, far - sk, W, far - sk, 1.4, OT_INK, 0.3, 1.6);
    this._pencilSeg(g, rnd, 0, far - sk + 6, W, far - sk + 6, 1, OT_INK, 0.12, 1.4);
  }

  // the wall clock's power cord, down behind the desk
  _drawCables(W, H) {
    const g = this.add.graphics().setDepth(-14);
    const s = this._s;
    const look = CLOCK_LOOKS[0];
    const x0 = W * look.x + look.w * s * 0.3;
    const y0 = H * look.y + look.h * s * 0.5;
    const pts = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      pts.push({
        x: x0 + Math.sin(t * Math.PI) * 26 * s + t * 64 * s,
        y: y0 + (this._tableFar - y0) * t,
      });
    }
    g.lineStyle(3, 0x050608, 0.85);
    for (let k = 0; k < pts.length - 1; k++) g.lineBetween(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
    this._drawPath(g, pts, 1, OT_INK, 0.18);
  }

  // a night window between the wall clock and the shelf
  _drawWindow(W, H) {
    const s = this._s;
    const g = this.add.graphics().setDepth(-18);
    const rnd = this._rng(3121);
    const ww = 150 * s;
    const wh = 190 * s;
    const x = W * 0.45 - ww / 2;
    const y = H * 0.215 - wh / 2;
    const fr = 9 * s; // the frame's width
    g.fillStyle(0x16110d, 1);
    g.fillRect(x, y, ww, wh);
    g.fillGradientStyle(0x0d1322, 0x0d1322, 0x06080f, 0x06080f, 1);
    g.fillRect(x + fr, y + fr, ww - 2 * fr, wh - 2 * fr);
    // a few stars and a thin moon
    for (let i = 0; i < 16; i++) {
      g.fillStyle(0xffffff, 0.15 + rnd() * 0.35);
      g.fillCircle(x + fr + rnd() * (ww - 2 * fr), y + fr + rnd() * (wh - 2 * fr) * 0.8, 0.6 + rnd() * 0.9);
    }
    const mx = x + ww * 0.68;
    const my = y + wh * 0.26;
    g.fillStyle(0xe8e2d2, 0.16);
    g.fillCircle(mx, my, 12 * s);
    g.fillStyle(0x0b101d, 1);
    g.fillCircle(mx + 5 * s, my - 2 * s, 11 * s);
    // the crossbars, and the frame in pencil
    g.fillStyle(0x16110d, 1);
    g.fillRect(x + ww / 2 - 3 * s, y, 6 * s, wh);
    g.fillRect(x, y + wh * 0.42 - 3 * s, ww, 6 * s);
    g.lineStyle(1.4, OT_INK, 0.5);
    g.strokeRect(x, y, ww, wh);
    g.lineStyle(1, OT_INK, 0.28);
    g.strokeRect(x + fr, y + fr, ww - 2 * fr, wh - 2 * fr);
    g.lineBetween(x + ww / 2 - 3 * s, y + fr, x + ww / 2 - 3 * s, y + wh - fr);
    g.lineBetween(x + ww / 2 + 3 * s, y + fr, x + ww / 2 + 3 * s, y + wh - fr);
    g.lineBetween(x + fr, y + wh * 0.42 - 3 * s, x + ww - fr, y + wh * 0.42 - 3 * s);
    g.lineBetween(x + fr, y + wh * 0.42 + 3 * s, x + ww - fr, y + wh * 0.42 + 3 * s);
    // the sill, sticking out a little
    g.fillStyle(0x1d1611, 1);
    g.fillRect(x - 8 * s, y + wh, ww + 16 * s, 8 * s);
    this._pencilSeg(g, rnd, x - 8 * s, y + wh, x + ww + 8 * s, y + wh, 1.4, OT_INK, 0.45, 0.8);
    this._pencilSeg(g, rnd, x - 8 * s, y + wh + 8 * s, x + ww + 8 * s, y + wh + 8 * s, 1.2, OT_INK, 0.3, 0.8);
  }

  // a wall shelf on two brackets, with a few books and a little plant
  _drawShelf(W) {
    const s = this._s;
    const { x0, x1, y, thick } = this._shelf;
    const rnd = this._rng(2249);
    const g = this.add.graphics().setDepth(-13);
    // the shadow it throws on the wall, then the brackets
    g.fillStyle(0x000000, 0.28);
    g.fillRect(x0 + 4 * s, y + thick, x1 - x0, 12 * s);
    g.fillStyle(0x000000, 0.14);
    g.fillRect(x0 + 8 * s, y + thick + 12 * s, x1 - x0 - 8 * s, 10 * s);
    for (const bx of [x0 + (x1 - x0) * 0.1, x1 - (x1 - x0) * 0.16]) {
      g.fillStyle(0x121419, 1);
      g.fillTriangle(bx, y + thick, bx + 22 * s, y + thick, bx, y + thick + 28 * s);
      g.lineStyle(1.2, OT_INK, 0.4);
      g.lineBetween(bx + 22 * s, y + thick, bx, y + thick + 28 * s);
      g.lineBetween(bx, y + thick, bx, y + thick + 28 * s);
    }
    // the plank
    g.fillStyle(0x2a1f16, 1);
    g.fillRect(x0, y, x1 - x0, thick);
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(x0, y, x1 - x0, 2 * s);
    this._pencilSeg(g, rnd, x0, y, x1, y, 1.5, OT_INK, 0.5, 0.8);
    this._pencilSeg(g, rnd, x0, y + thick, x1, y + thick, 1.4, OT_INK, 0.4, 0.8);
    this._pencilSeg(g, rnd, x0, y, x0, y + thick, 1.2, OT_INK, 0.4, 0.4);
    this._pencilSeg(g, rnd, x1, y, x1, y + thick, 1.2, OT_INK, 0.4, 0.4);

    // three books, lying flat at the right end
    let by = y;
    for (const [bw, tone, off] of [[64, 0x26313b, 0], [58, 0x3a2b26, 5], [62, 0x2b3427, -3]]) {
      const bh = 11 * s;
      by -= bh;
      const bx = x1 - 72 * s + off * s;
      g.fillStyle(tone, 1);
      g.fillRect(bx, by, bw * s, bh);
      g.fillStyle(0xd8d2c4, 0.14);
      g.fillRect(bx + bw * s - 4 * s, by + 2 * s, 3 * s, bh - 4 * s); // the pages
      g.lineStyle(1.1, OT_INK, 0.5);
      g.strokeRect(bx, by, bw * s, bh);
      g.lineStyle(1, OT_INK, 0.25);
      g.lineBetween(bx + 8 * s, by, bx + 8 * s, by + bh);
    }

    // a small plant in a pot, at the left end
    const px = x0 + 34 * s;
    g.fillStyle(0x2b2019, 1);
    g.fillPoints(
      [
        { x: px - 13 * s, y: y - 22 * s },
        { x: px + 13 * s, y: y - 22 * s },
        { x: px + 9 * s, y },
        { x: px - 9 * s, y },
      ],
      true,
    );
    this._pencilSeg(g, rnd, px - 13 * s, y - 22 * s, px - 9 * s, y, 1.2, OT_INK, 0.45, 0.4);
    this._pencilSeg(g, rnd, px + 13 * s, y - 22 * s, px + 9 * s, y, 1.2, OT_INK, 0.45, 0.4);
    this._pencilSeg(g, rnd, px - 14 * s, y - 22 * s, px + 14 * s, y - 22 * s, 1.3, OT_INK, 0.5, 0.4);
    for (const [ang, len] of [[-95, 34], [-60, 28], [-125, 28], [-30, 20], [-150, 20]]) {
      const a = (ang * Math.PI) / 180;
      const lx = px + Math.cos(a) * len * s;
      const ly = y - 22 * s + Math.sin(a) * len * s;
      g.lineStyle(1.4, 0x1c2b20, 1);
      g.lineBetween(px, y - 22 * s, lx, ly);
      g.fillStyle(0x1d2b20, 1);
      g.fillEllipse(lx, ly, 9 * s, 5 * s);
      g.lineStyle(1, OT_INK, 0.3);
      g.strokeEllipse(lx, ly, 9 * s, 5 * s);
    }
  }

  // ── the pencil's rounded shapes, the way the phone level draws them ────────


  _pencilRoundRect(g, rnd, x, y, w, h, r, width, color, alpha, mag = 0.8) {
    const pts = this._roundRectPts(x, y, w, h, r);
    for (let i = 1; i < pts.length; i++) {
      this._pencilSeg(g, rnd, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, width, color, alpha, mag);
    }
  }

  // ── the desk ───────────────────────────────────────────────────────────────

  _drawTable(W, H) {
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(4423);
    const far = this._tableFar;
    const near = this._tableNear;
    const apron = H * 0.055;

    // legs first, so the top and apron overlap them
    for (const lx of [W * 0.045, W * 0.905]) {
      g.fillStyle(0x100c09, 1);
      g.fillRect(lx, near, W * 0.05, H - near);
      this._pencilSeg(g, rnd, lx, near + apron, lx, H, 1.2, OT_INK, 0.25, 1);
      this._pencilSeg(g, rnd, lx + W * 0.05, near + apron, lx + W * 0.05, H, 1.2, OT_INK, 0.2, 1);
    }

    // the top: a trapezoid, narrower at the far edge
    const top = [
      [W * 0.07, far],
      [W * 0.93, far],
      [W * 1.03, near],
      [-W * 0.03, near],
    ];
    g.fillStyle(0x261b13, 1);
    g.beginPath();
    g.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) g.lineTo(top[i][0], top[i][1]);
    g.closePath();
    g.fillPath();
    // wood grain: long lines running toward the far edge
    for (let i = 0; i < 26; i++) {
      const t = rnd();
      const xn = -W * 0.03 + t * W * 1.06;
      const xf = W * 0.07 + t * W * 0.86 + (rnd() - 0.5) * 8;
      g.lineStyle(1, OT_INK, 0.03 + rnd() * 0.05);
      g.lineBetween(xn, near - rnd() * 8, xf, far + rnd() * 6);
    }
    for (let i = 0; i < 5; i++) {
      g.lineStyle(1, 0x000000, 0.1);
      const y = far + ((near - far) * (i + 1)) / 6;
      g.lineBetween(W * (0.07 - (0.1 * (y - far)) / (near - far)), y, W * (0.93 + (0.1 * (y - far)) / (near - far)), y);
    }
    this._pencilSeg(g, rnd, W * 0.07, far, W * 0.93, far, 1.5, OT_INK, 0.35, 1.6);

    // the front edge and apron
    g.fillStyle(0x1a130e, 1);
    g.fillRect(-W * 0.03, near, W * 1.06, apron);
    this._pencilSeg(g, rnd, -W * 0.03, near, W * 1.03, near, 1.8, OT_INK, 0.5, 1.6);
    this._pencilSeg(g, rnd, -W * 0.03, near + apron, W * 1.03, near + apron, 1.4, OT_INK, 0.3, 1.6);
    for (let i = 0; i < 18; i++) {
      const x = rnd() * W;
      g.lineStyle(1, OT_INK, 0.05 + rnd() * 0.05);
      g.lineBetween(x, near + 4, x + (rnd() - 0.5) * 30, near + apron - 3);
    }
  }

  // ── seven-segment digits (the clocks and the calculator share them) ────────

  // the seven segments of one digit, as polygons in a w × h box, t thick
  _segmentShapes(x, y, w, h, t) {
    const gap = t * 0.14;
    const mid = y + h / 2;
    const hx0 = x + t * 0.45 + gap;
    const hx1 = x + w - t * 0.45 - gap;
    const horiz = (yy) => [
      [hx0, yy + t / 2], [hx0 + t / 2, yy], [hx1 - t / 2, yy],
      [hx1, yy + t / 2], [hx1 - t / 2, yy + t], [hx0 + t / 2, yy + t],
    ];
    const vert = (xx, ya, yb) => [
      [xx + t / 2, ya], [xx + t, ya + t / 2], [xx + t, yb - t / 2],
      [xx + t / 2, yb], [xx, yb - t / 2], [xx, ya + t / 2],
    ];
    const up = [y + t * 0.5 + gap, mid - gap];
    const low = [mid + gap, y + h - t * 0.5 - gap];
    return {
      a: horiz(y),
      g: horiz(mid - t / 2),
      d: horiz(y + h - t),
      f: vert(x, up[0], up[1]),
      b: vert(x + w - t, up[0], up[1]),
      e: vert(x, low[0], low[1]),
      c: vert(x + w - t, low[0], low[1]),
    };
  }

  // one glyph: its lit segments at litAlpha, the rest faintly at ghostAlpha
  _drawGlyph(g, ch, x, y, w, h, t, color, litAlpha, ghostAlpha) {
    const shapes = this._segmentShapes(x, y, w, h, t);
    const on = SEGMENTS[ch] ?? "";
    for (const key of "abcdefg") {
      const alpha = on.includes(key) ? litAlpha : ghostAlpha;
      if (alpha <= 0) continue;
      g.fillStyle(color, alpha);
      g.fillPoints(shapes[key].map(([px, py]) => ({ x: px, y: py })), true);
    }
  }

  // ── the four clocks ────────────────────────────────────────────────────────

  _drawClocks(W, H) {
    this._colons = [];
    this._tick = 0;
    OVERTIME_CLOCKS.forEach((time, i) => this._drawClock(W, H, time, CLOCK_LOOKS[i], i));
    // the colons blink, the hours never move; the clocks are not in step
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this._tick++;
        this._colons.forEach((colon, i) => colon.setAlpha((this._tick + i) % 2 ? 0.08 : 1));
      },
    });
  }

  // where a clock's middle is, and how far in front of the rest it draws
  _clockPlace(look, W, H) {
    const h = look.h * this._s;
    if (look.type === "mounted") return { x: W * look.x, y: H * look.y, depth: -12 };
    if (look.type === "shelf") return { x: W * look.x, y: this._shelf.y - h / 2, depth: -11 };
    return { x: W * look.x, y: H * look.base - h / 2, depth: -7 }; // on the desk
  }

  // a dark case with a pencil outline, drawn the way the phone's body is
  _clockCase(g, rnd, x, y, w, h, r) {
    const s = this._s;
    g.fillStyle(0x15181d, 1);
    g.fillRoundedRect(x, y, w, h, r);
    g.fillStyle(OT_INK, 0.03);
    g.fillRoundedRect(x, y, w, h, r);
    this._pencilRoundRect(g, rnd, x, y, w, h, r, 1.6, OT_INK, 0.62, 0.8);
    this._pencilRoundRect(g, rnd, x + 4 * s, y + 4 * s, w - 8 * s, h - 8 * s, Math.max(2, r - 3 * s), 1, OT_INK, 0.2, 0.5);
  }

  // Draws one clock's case, shadow and glow, and returns its display window.
  // Four kinds: screwed to the wall, standing on the shelf, an alarm clock, and
  // a flat travel clock on the desk.
  _clockBody(g, rnd, look, w, h, s) {
    // the LED's glow, soft, on whatever the clock hangs on or stands on
    for (let k = 0; k < 5; k++) {
      g.fillStyle(look.led, 0.011);
      g.fillEllipse(0, 0, w * (1.7 - k * 0.15), h * (2.1 - k * 0.25));
    }
    if (look.type === "mounted") {
      // flat on the wall: a shadow offset down and to the right, and four screws
      g.fillStyle(0x000000, 0.4);
      g.fillRoundedRect(-w / 2 + 4 * s, -h / 2 + 6 * s, w, h, 7 * s);
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(-w / 2 + 8 * s, -h / 2 + 11 * s, w, h, 7 * s);
      this._clockCase(g, rnd, -w / 2, -h / 2, w, h, 7 * s);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = sx * (w / 2 - 8 * s);
        const cy = sy * (h / 2 - 7 * s);
        g.fillStyle(0x0b0d10, 1);
        g.fillCircle(cx, cy, 2.4 * s);
        g.lineStyle(1, OT_INK, 0.4);
        g.strokeCircle(cx, cy, 2.4 * s);
        g.lineBetween(cx - 1.6 * s, cy - 0.6 * s, cx + 1.6 * s, cy + 0.6 * s);
      }
      return { x: -w / 2 + w * 0.07, y: -h / 2 + h * 0.17, w: w * 0.86, h: h * 0.66 };
    }

    // the others stand on something: a shadow under them
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(0, h / 2 + 1.5 * s, w * 1.08, 9 * s);
    if (look.type === "shelf") {
      g.fillStyle(0x0b0d10, 1); // two rubber feet
      g.fillRect(-w * 0.36, h / 2 - 3 * s, 13 * s, 4 * s);
      g.fillRect(w * 0.36 - 13 * s, h / 2 - 3 * s, 13 * s, 4 * s);
      this._clockCase(g, rnd, -w / 2, -h / 2, w, h - 3 * s, 8 * s);
      g.fillStyle(0xffffff, 0.05);
      g.fillRoundedRect(-w / 2 + 2 * s, -h / 2 + 2 * s, w - 4 * s, h * 0.1, 5 * s);
      for (const bx of [-w * 0.26, 0, w * 0.26]) {
        // buttons along the top edge
        g.fillStyle(0x0d0f13, 1);
        g.fillRoundedRect(bx - 7 * s, -h / 2 - 3 * s, 14 * s, 4.5 * s, 2 * s);
        g.lineStyle(1, OT_INK, 0.4);
        g.strokeRoundedRect(bx - 7 * s, -h / 2 - 3 * s, 14 * s, 4.5 * s, 2 * s);
      }
      return { x: -w / 2 + w * 0.08, y: -h / 2 + h * 0.2, w: w * 0.84, h: h * 0.6 };
    }
    if (look.type === "alarm") {
      for (const fx of [-w * 0.3, w * 0.3]) {
        // splayed feet
        g.fillStyle(0x0b0d10, 1);
        g.fillPoints(
          [
            { x: fx - 8 * s, y: h / 2 - 6 * s },
            { x: fx + 8 * s, y: h / 2 - 6 * s },
            { x: fx + 12 * s, y: h / 2 },
            { x: fx - 12 * s, y: h / 2 },
          ],
          true,
        );
        g.lineStyle(1, OT_INK, 0.4);
        g.lineBetween(fx - 12 * s, h / 2, fx + 12 * s, h / 2);
      }
      this._clockCase(g, rnd, -w / 2, -h / 2, w, h - 5 * s, 18 * s);
      for (const bx of [-w * 0.27, w * 0.27]) {
        // snooze and alarm tabs on top
        g.fillStyle(0x0d0f13, 1);
        g.fillRoundedRect(bx - 9 * s, -h / 2 - 5 * s, 18 * s, 6.5 * s, 2.5 * s);
        g.lineStyle(1, OT_INK, 0.42);
        g.strokeRoundedRect(bx - 9 * s, -h / 2 - 5 * s, 18 * s, 6.5 * s, 2.5 * s);
      }
      for (let k = 0; k < 6; k++) {
        // the speaker holes under the display
        g.fillStyle(OT_INK, 0.3);
        g.fillCircle(-w * 0.16 + k * w * 0.064, h / 2 - 14 * s, 1.3 * s);
      }
      return { x: -w / 2 + w * 0.1, y: -h / 2 + h * 0.15, w: w * 0.8, h: h * 0.55 };
    }
    // "wedge": a low travel clock with a lip at its foot and a tiny alarm LED
    g.fillStyle(0x0d0f13, 1);
    g.fillRoundedRect(-w / 2 - 3 * s, h / 2 - 7 * s, w + 6 * s, 7 * s, 3 * s);
    g.lineStyle(1.1, OT_INK, 0.42);
    g.strokeRoundedRect(-w / 2 - 3 * s, h / 2 - 7 * s, w + 6 * s, 7 * s, 3 * s);
    this._clockCase(g, rnd, -w / 2, -h / 2, w, h - 4 * s, 7 * s);
    g.fillStyle(look.led, 0.9);
    g.fillCircle(-w / 2 + 10 * s, -h / 2 + 8 * s, 1.7 * s);
    return { x: -w / 2 + w * 0.07, y: -h / 2 + h * 0.2, w: w * 0.86, h: h * 0.58 };
  }

  _drawClock(W, H, time, look, index) {
    const s = this._s;
    const w = look.w * s;
    const h = look.h * s;
    const rnd = this._rng(6100 + index * 53);
    const at = this._clockPlace(look, W, H);
    const box = this.add.container(at.x, at.y).setDepth(at.depth);

    // ── the case, and the dark window that holds the digits ──
    const body = this.add.graphics();
    const win = this._clockBody(body, rnd, look, w, h, s);
    body.fillStyle(0x060708, 1);
    body.fillRoundedRect(win.x, win.y, win.w, win.h, 3.5 * s);
    body.lineStyle(1.2, OT_INK, 0.32);
    body.strokeRoundedRect(win.x, win.y, win.w, win.h, 3.5 * s);

    // ── HH:MM in seven-segment LEDs, with the unlit segments faintly there ──
    const digits = this.add.graphics();
    const dh = win.h * 0.8;
    const dw = Math.min((win.w * 0.92) / 5.44, dh * 0.58);
    const gap = dw * 0.28;
    const colonW = dw * 0.32;
    const total = 4 * dw + colonW + 4 * gap;
    const t = Math.max(1.5, dh * 0.13);
    const top = win.y + (win.h - dh) / 2;
    let x = win.x + (win.w - total) / 2;
    const chars = time.replace(":", "");
    for (let k = 0; k < 4; k++) {
      // a soft halo, then the crisp segments over it
      this._drawGlyph(digits, chars[k], x - t * 0.4, top - t * 0.4, dw + t * 0.8, dh + t * 0.8, t * 1.8, look.led, 0.09, 0);
      this._drawGlyph(digits, chars[k], x, top, dw, dh, t, look.led, 0.96, 0.07);
      x += dw + gap;
      if (k === 1) x += colonW + gap; // room for the colon after the second digit
    }

    const colon = this.add.graphics();
    const colonX = win.x + (win.w - total) / 2 + 2 * dw + 2 * gap;
    for (const cyy of [top + dh * 0.32, top + dh * 0.68]) {
      colon.fillStyle(look.led, 0.12);
      colon.fillRect(colonX - t * 0.4, cyy - t * 0.9, colonW * 0.7 + t * 0.8, t * 1.8);
      colon.fillStyle(look.led, 0.96);
      colon.fillRect(colonX, cyy - t / 2, colonW * 0.7, t);
    }
    this._colons.push(colon);

    // a little gloss across the glass
    const gloss = this.add.graphics();
    gloss.fillStyle(0xffffff, 0.035);
    gloss.fillPoints(
      [
        { x: win.x + win.w * 0.08, y: win.y },
        { x: win.x + win.w * 0.34, y: win.y },
        { x: win.x + win.w * 0.2, y: win.y + win.h },
        { x: win.x, y: win.y + win.h },
      ],
      true,
    );

    box.add([body, digits, colon, gloss]);
  }

  // ── the calculator ─────────────────────────────────────────────────────────
  // Drawn like the phone on level 6: a near-black body with a double pencil
  // outline and very round corners, a black bezel round a green scanlined LCD,
  // and outlined keys that dip and flash when pressed. C is the red one.

  // Where every key sits on the keypad: column, row, and how many of each it
  // spans. "+" is the tall one, "0" the wide one, as on an adding machine.
  static get KEYPAD() {
    return [
      { key: "7", c: 0, r: 0 }, { key: "8", c: 1, r: 0 }, { key: "9", c: 2, r: 0 }, { key: "C", c: 3, r: 0 },
      { key: "4", c: 0, r: 1 }, { key: "5", c: 1, r: 1 }, { key: "6", c: 2, r: 1 }, { key: "+", c: 3, r: 1, rs: 2 },
      { key: "1", c: 0, r: 2 }, { key: "2", c: 1, r: 2 }, { key: "3", c: 2, r: 2 },
      { key: "0", c: 0, r: 3, cs: 2 }, { key: "00", c: 2, r: 3 }, { key: "=", c: 3, r: 3 },
    ];
  }

  _drawCalculator(W, H) {
    const { w, h, cx, bottom } = this._calcBox;
    const s = this._s;
    const left = cx - w / 2;
    const top = bottom - h;
    const rnd = this._rng(7331);
    const r = 34 * s; // corners as round as the phone's
    const pad = 18 * s;
    this._keys = {};

    // its shadow on the desk, in two layers, as under the phone
    const shadow = this.add.graphics().setDepth(-5);
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillEllipse(cx + 10 * s, bottom + 7 * s, w * 1.32, 32 * s);
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillEllipse(cx + 6 * s, bottom + 4 * s, w * 1.12, 19 * s);

    // the body: its thickness, the near-black face, and the pencil over both
    const body = this.add.graphics().setDepth(-4);
    body.fillStyle(0x0b0d10, 1);
    body.fillRoundedRect(left + 2 * s, top + 8 * s, w, h, r);
    body.fillStyle(0x171a1f, 1);
    body.fillRoundedRect(left, top, w, h, r);
    body.fillStyle(OT_INK, 0.03);
    body.fillRoundedRect(left, top, w, h, r);
    this._pencilRoundRect(body, rnd, left, top, w, h, r, 2, OT_INK, 0.72, 1.2);
    this._pencilRoundRect(body, rnd, left + 7 * s, top + 7 * s, w - 14 * s, h - 14 * s, r - 6 * s, 1, OT_INK, 0.26, 1);
    // gloss: a few hatch strokes down the left edge
    for (let i = 0; i < 9; i++) {
      const yy = top + 100 * s + i * 14 * s;
      this._pencilSeg(body, rnd, left + 8 * s, yy + 9 * s, left + 14 * s, yy, 1, OT_INK, 0.14, 0.3);
    }

    // a brand plate and a solar strip, as pills above the display
    const py = top + 15 * s;
    body.fillStyle(0x0f1115, 1);
    body.fillRoundedRect(left + pad, py, w * 0.3, 11 * s, 5.5 * s);
    this._pencilRoundRect(body, rnd, left + pad, py, w * 0.3, 11 * s, 5.5 * s, 1.1, OT_INK, 0.4, 0.4);
    const solarX = left + w - pad - w * 0.34;
    body.fillStyle(0x211a17, 1);
    body.fillRoundedRect(solarX, py, w * 0.34, 11 * s, 5.5 * s);
    this._pencilRoundRect(body, rnd, solarX, py, w * 0.34, 11 * s, 5.5 * s, 1.1, OT_INK, 0.4, 0.4);
    for (let i = 1; i < 4; i++) {
      body.lineStyle(1, OT_INK, 0.22);
      body.lineBetween(solarX + (w * 0.34 * i) / 4, py + 2 * s, solarX + (w * 0.34 * i) / 4, py + 9 * s);
    }

    // the display: the phone's bezel, the phone's green, its scanlines and gloss
    const lcd = { x: left + pad, y: top + 38 * s, w: w - 2 * pad, h: 52 * s };
    this._lcdBox = lcd;
    body.fillStyle(0x0a0c0f, 1);
    body.fillRoundedRect(lcd.x - 8 * s, lcd.y - 8 * s, lcd.w + 16 * s, lcd.h + 16 * s, 11 * s);
    this._pencilRoundRect(body, rnd, lcd.x - 8 * s, lcd.y - 8 * s, lcd.w + 16 * s, lcd.h + 16 * s, 11 * s, 1.6, OT_INK, 0.6, 0.7);
    this._pencilRoundRect(body, rnd, lcd.x - 3 * s, lcd.y - 3 * s, lcd.w + 6 * s, lcd.h + 6 * s, 7 * s, 1, OT_INK, 0.28, 0.5);
    body.fillStyle(LCD_GREEN, 1);
    body.fillRoundedRect(lcd.x, lcd.y, lcd.w, lcd.h, 5 * s);
    body.fillStyle(0xb9cc92, 0.18);
    body.fillRoundedRect(lcd.x + 3 * s, lcd.y + 3 * s, lcd.w - 6 * s, 11 * s, 4 * s);
    const line = Math.max(3, 4 * s);
    for (let row = 0; row < lcd.h; row += line) {
      body.lineStyle(1, 0x334420, 0.18);
      body.lineBetween(lcd.x + 1, lcd.y + row, lcd.x + lcd.w - 1, lcd.y + row);
    }
    for (let col = 0; col < lcd.w; col += line) {
      body.lineStyle(1, 0x334420, 0.07);
      body.lineBetween(lcd.x + col, lcd.y + 1, lcd.x + col, lcd.y + lcd.h - 1);
    }
    body.fillStyle(0xffffff, 0.1);
    body.fillTriangle(lcd.x, lcd.y, lcd.x + lcd.w * 0.5, lcd.y, lcd.x, lcd.y + lcd.h * 0.52);

    this._lcd = this.add.graphics().setDepth(-3);
    this._drawLcd();

    // the keypad
    const gx = 9 * s;
    const gy = 9 * s;
    const kw = (w - 2 * pad - 3 * gx) / 4;
    const kTop = lcd.y + lcd.h + 22 * s;
    const kh = (bottom - pad - kTop - 3 * gy) / 4;
    for (const spec of OvertimeScene.KEYPAD) {
      const cs = spec.cs ?? 1;
      const rs = spec.rs ?? 1;
      const width = kw * cs + gx * (cs - 1);
      const height = kh * rs + gy * (rs - 1);
      const x = left + pad + spec.c * (kw + gx) + width / 2;
      const y = kTop + spec.r * (kh + gy) + height / 2;
      this._makeKey(spec.key, x, y, width, height, rnd);
    }
  }

  // one key, the phone's way: a shadow, a dark cap, a pencil outline, a light
  // line along its top, and a flash that answers every press
  _makeKey(key, x, y, width, height, rnd) {
    const s = this._s;
    const isC = key === "C";
    const r = Math.min(height * 0.3, width * 0.3);
    const cap = this.add.container(x, y).setDepth(-3);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(-width / 2 + 2 * s, -height / 2 + 4 * s, width, height, r);
    g.fillStyle(isC ? 0x3a1b21 : 0x1d2127, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, r);
    g.fillStyle(OT_INK, 0.04);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, r);
    this._pencilRoundRect(g, rnd, -width / 2, -height / 2, width, height, r, 1.3, isC ? 0xd89aa4 : OT_INK, 0.6, 0.6);
    this._pencilSeg(g, rnd, -width / 2 + r * 0.8, -height / 2 + 6 * s, width / 2 - r * 0.8, -height / 2 + 6 * s, 1, OT_INK, 0.14, 0.3);
    const flash = this.add.graphics().setAlpha(0);
    flash.fillStyle(OT_INK, 0.16);
    flash.fillRoundedRect(-width / 2, -height / 2, width, height, r);
    const base = Math.min(width, height);
    const label = this.add
      .text(0, 0, key, {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.round(base * (key === "00" ? 0.4 : key === "+" || key === "=" ? 0.64 : 0.56)) + "px",
        color: isC ? "#f0c9cf" : "#e8dcc0",
      })
      .setOrigin(0.5);
    cap.add([g, flash, label]);

    const zone = this.add.zone(x, y, width, height).setDepth(10);
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this._press(key));
    zone.on("pointerover", () => g.setAlpha(0.82));
    zone.on("pointerout", () => g.setAlpha(1));
    this._keys[key] = { cap, flash, zone, x, y };
  }

  _press(key) {
    this.calc = pressKey(this.calc, key);
    this.services.audio.playClick(this);
    this._drawLcd();
    const k = this._keys[key];
    if (k) {
      this.tweens.add({ targets: k.cap, y: k.y + 3 * this._s, duration: 50, yoyo: true, ease: "Power1" });
      k.flash.setAlpha(1);
      this.tweens.add({ targets: k.flash, alpha: 0, duration: 240, ease: "Sine.easeOut" });
    }
  }

  // the display: eight digits, right-aligned, unlit segments faintly there
  _drawLcd() {
    if (!this._lcd || !this._lcdBox) return;
    const lcd = this._lcdBox;
    const g = this._lcd;
    g.clear();
    const inner = lcd.w - 14 * this._s;
    const cell = inner / CALCULATOR_DIGITS;
    const dh = lcd.h * 0.66;
    const dw = Math.min(cell * 0.74, dh * 0.56);
    const t = dh * 0.13;
    const y = lcd.y + (lcd.h - dh) / 2 + 1;
    const text = this.calc.display.padStart(CALCULATOR_DIGITS, " ");
    for (let i = 0; i < CALCULATOR_DIGITS; i++) {
      const x = lcd.x + 7 * this._s + i * cell + (cell - dw) / 2;
      this._drawGlyph(g, text[i] === " " ? "" : text[i], x, y, dw, dh, t, LCD_INK, 0.92, 0.07);
    }
  }

  // where a key is on the canvas — used by the tests to press it like a player
  keyCenter(key) {
    const k = this._keys?.[key];
    return k ? { x: k.x, y: k.y } : null;
  }

  // ── things on the desk ─────────────────────────────────────────────────────

  // a mug of something hot, with a little steam
  _drawMug(W, H) {
    const s = this._s;
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(8117);
    const mx = W * 0.14;
    const base = this._tableFar + (this._tableNear - this._tableFar) * 0.62;
    const mw = 56 * s;
    const mh = 62 * s;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(mx + 6 * s, base + 3 * s, mw * 1.35, 12 * s);
    g.lineStyle(6 * s, 0x20242b, 1); // the handle
    g.beginPath();
    g.arc(mx + mw / 2 - 2 * s, base - mh * 0.5, mh * 0.24, -Math.PI / 2, Math.PI / 2);
    g.strokePath();
    g.lineStyle(1.1, OT_INK, 0.4);
    g.beginPath();
    g.arc(mx + mw / 2 - 2 * s, base - mh * 0.5, mh * 0.24 + 3 * s, -Math.PI / 2, Math.PI / 2);
    g.strokePath();
    g.fillStyle(0x20242b, 1);
    g.fillRoundedRect(mx - mw / 2, base - mh, mw, mh, { tl: 3 * s, tr: 3 * s, bl: 9 * s, br: 9 * s });
    g.fillStyle(0xffffff, 0.05);
    g.fillRect(mx - mw / 2 + 4 * s, base - mh + 4 * s, 7 * s, mh - 12 * s);
    this._pencilSeg(g, rnd, mx - mw / 2, base - mh, mx - mw / 2, base - 8 * s, 1.3, OT_INK, 0.5, 0.6);
    this._pencilSeg(g, rnd, mx + mw / 2, base - mh, mx + mw / 2, base - 8 * s, 1.3, OT_INK, 0.5, 0.6);
    this._pencilSeg(g, rnd, mx - mw / 2 + 8 * s, base, mx + mw / 2 - 8 * s, base, 1.3, OT_INK, 0.5, 0.6);
    g.fillStyle(0x0b0d10, 1);
    g.fillEllipse(mx, base - mh, mw, 12 * s); // the rim, seen from a little above
    g.fillStyle(0x2c1b10, 1);
    g.fillEllipse(mx, base - mh + 1.5 * s, mw - 7 * s, 8 * s); // the coffee
    g.lineStyle(1.3, OT_INK, 0.5);
    g.strokeEllipse(mx, base - mh, mw, 12 * s);

    // steam: slow puffs that rise, spread and fade
    for (let i = 0; i < 4; i++) {
      const puff = this.add.circle(mx + (rnd() - 0.5) * 12 * s, base - mh - 4 * s, (5 + rnd() * 4) * s, OT_INK, 0.06).setDepth(-5.9);
      const dur = 4600 + rnd() * 2200;
      const dx = (rnd() - 0.5) * 26 * s;
      this.tweens.add({
        targets: puff,
        y: puff.y - (58 + rnd() * 22) * s,
        x: puff.x + dx,
        scale: 2.4,
        alpha: 0,
        duration: dur,
        delay: i * (dur / 4),
        repeat: -1,
        onRepeat: () => {
          puff.setPosition(mx + (rnd() - 0.5) * 12 * s, base - mh - 4 * s);
          puff.setScale(1);
          puff.setAlpha(0.06);
        },
      });
    }
  }

  // a graphite pencil left lying in front of the calculator
  _drawPencil(W, H) {
    const s = this._s;
    const x0 = W * 0.65;
    const y0 = this._tableNear - H * 0.02;
    const x1 = W * 0.82;
    const y1 = this._tableNear - H * 0.05;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const shadow = this.add.graphics().setDepth(-6);
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillEllipse((x0 + x1) / 2 + 4 * s, (y0 + y1) / 2 + 6 * s, len * 0.96, 9 * s);
    const g = this.add.graphics().setDepth(-5.8);
    g.setPosition(x0, y0);
    g.setRotation(Math.atan2(y1 - y0, x1 - x0));
    const pw = 8 * s;
    const eraser = 12 * s;
    const ferrule = 14 * s;
    const tip = 30 * s;
    g.fillStyle(0x8c5a52, 1);
    g.fillRect(0, -pw / 2, eraser, pw); // eraser
    g.fillStyle(0x8f949b, 0.75);
    g.fillRect(eraser, -pw / 2, ferrule, pw); // the metal band
    g.fillStyle(0x393c42, 1);
    g.fillRect(eraser + ferrule, -pw / 2, len - eraser - ferrule - tip, pw); // the body
    g.fillStyle(0x6b5a45, 1); // bare wood, then the graphite point
    g.fillTriangle(len - tip, -pw / 2, len - tip, pw / 2, len, 0);
    g.fillStyle(0x15171b, 1);
    g.fillTriangle(len - tip * 0.32, -pw * 0.16, len - tip * 0.32, pw * 0.16, len, 0);
    g.lineStyle(1.1, OT_INK, 0.5);
    g.strokeRect(0, -pw / 2, len - tip, pw);
    g.lineBetween(len - tip, -pw / 2, len, 0);
    g.lineBetween(len - tip, pw / 2, len, 0);
    g.lineStyle(1, OT_INK, 0.2);
    g.lineBetween(eraser + ferrule + 6 * s, -pw * 0.15, len - tip - 4 * s, -pw * 0.15);
    for (let i = 0; i < 3; i++) {
      const x = eraser + 2 * s + i * 4.4 * s;
      g.lineStyle(1, OT_INK, 0.28);
      g.lineBetween(x, -pw / 2, x, pw / 2); // the ferrule's ridges
    }
  }

  // a desk lamp on the right, its shade turned toward the calculator
  _drawLamp(W, H) {
    const s = this._s;
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(5051);
    const bx = W * 0.875;
    const by = this._tableNear - H * 0.03;
    const elbow = { x: bx - 26 * s, y: by - 196 * s };
    const head = { x: bx - 150 * s, y: by - 262 * s };

    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(bx + 8 * s, by + 5 * s, 116 * s, 16 * s);
    g.fillStyle(0x121419, 1);
    g.fillEllipse(bx, by, 96 * s, 18 * s);
    g.lineStyle(1.3, OT_INK, 0.5);
    g.strokeEllipse(bx, by, 96 * s, 18 * s);
    // two arms, each a pair of rods
    const rod = (x1, y1, x2, y2) => {
      g.lineStyle(4.5 * s, 0x1a1d22, 1);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(1, OT_INK, 0.4);
      g.lineBetween(x1 - 2.4 * s, y1, x2 - 2.4 * s, y2);
      g.lineBetween(x1 + 2.4 * s, y1, x2 + 2.4 * s, y2);
    };
    rod(bx - 4 * s, by - 6 * s, elbow.x, elbow.y);
    rod(elbow.x, elbow.y, head.x, head.y);
    g.fillStyle(0x121419, 1);
    g.fillCircle(elbow.x, elbow.y, 6 * s);
    g.lineStyle(1.2, OT_INK, 0.5);
    g.strokeCircle(elbow.x, elbow.y, 6 * s);

    // the shade: a cone, narrow at the joint, wide at the mouth, aimed at the desk
    const target = { x: this._calcBox.cx - 6 * s, y: this._calcBox.bottom - this._calcBox.h * 0.35 };
    const theta = Math.atan2(target.y - head.y, target.x - head.x);
    const u = { x: Math.cos(theta), y: Math.sin(theta) };
    const n = { x: -u.y, y: u.x };
    const mouth = { x: head.x + u.x * 72 * s, y: head.y + u.y * 72 * s };
    const shade = [
      [head.x + n.x * 13 * s, head.y + n.y * 13 * s],
      [mouth.x + n.x * 34 * s, mouth.y + n.y * 34 * s],
      [mouth.x - n.x * 34 * s, mouth.y - n.y * 34 * s],
      [head.x - n.x * 13 * s, head.y - n.y * 13 * s],
    ];
    g.fillStyle(0x181b21, 1);
    g.beginPath();
    g.moveTo(shade[0][0], shade[0][1]);
    for (let i = 1; i < shade.length; i++) g.lineTo(shade[i][0], shade[i][1]);
    g.closePath();
    g.fillPath();
    for (let i = 0; i < shade.length; i++) {
      const a = shade[i];
      const b = shade[(i + 1) % shade.length];
      this._pencilSeg(g, rnd, a[0], a[1], b[0], b[1], 1.5, OT_INK, 0.5, 0.8);
    }
    // the bulb inside the mouth, and its glow
    const bulb = { x: mouth.x - u.x * 8 * s, y: mouth.y - u.y * 8 * s };
    this._lamp = { bulb, mouth, u, n, target, head };
    g.fillStyle(OT_WARM, 0.08);
    g.fillCircle(bulb.x, bulb.y, 46 * s);
    g.fillStyle(OT_WARM, 0.14);
    g.fillCircle(bulb.x, bulb.y, 24 * s);
    g.fillStyle(OT_WARM, 0.95);
    g.fillCircle(bulb.x, bulb.y, 8.5 * s);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(bulb.x, bulb.y, 4 * s);

    // the wall behind catches a little of it
    const spill = this.add.graphics().setDepth(-15);
    for (let k = 0; k < 7; k++) {
      spill.fillStyle(OT_WARM, 0.008);
      spill.fillEllipse(head.x + 10 * s, head.y - 20 * s, (360 - k * 44) * s, (280 - k * 34) * s);
    }
  }

  // the lamp's cone, in layers, falling across the calculator and the desk
  _drawLampLight(W, H) {
    const s = this._s;
    const { bulb, mouth, n, target } = this._lamp;
    const g = this.add.graphics().setDepth(6);
    const dx = target.x - bulb.x;
    const dy = target.y - bulb.y;
    const d = Math.hypot(dx, dy) || 1;
    const tn = { x: -dy / d, y: dx / d };
    for (const [half, alpha] of [[210, 0.009], [170, 0.011], [134, 0.013], [100, 0.015], [70, 0.017], [44, 0.02]]) {
      g.fillStyle(OT_WARM, alpha);
      g.fillTriangle(
        mouth.x + n.x * 30 * s, mouth.y + n.y * 30 * s,
        mouth.x - n.x * 30 * s, mouth.y - n.y * 30 * s,
        target.x + dx * 0.55 + tn.x * half * s, target.y + dy * 0.55 + tn.y * half * s,
      );
      g.fillTriangle(
        mouth.x - n.x * 30 * s, mouth.y - n.y * 30 * s,
        target.x + dx * 0.55 + tn.x * half * s, target.y + dy * 0.55 + tn.y * half * s,
        target.x + dx * 0.55 - tn.x * half * s, target.y + dy * 0.55 - tn.y * half * s,
      );
    }
    // the pool it makes on the desk top
    const pool = this.add.graphics().setDepth(-7.5);
    const py = this._calcBox.bottom + 4 * s;
    pool.fillStyle(OT_WARM, 0.035);
    pool.fillEllipse(this._calcBox.cx + 10 * s, py, this._calcBox.w * 3.1, 92 * s);
    pool.fillStyle(OT_WARM, 0.045);
    pool.fillEllipse(this._calcBox.cx + 10 * s, py, this._calcBox.w * 2, 56 * s);
  }

  // ── on top of everything ───────────────────────────────────────────────────

  _drawTexts(W) {
    const levelNumber =
      this.services.levels.definitions.findIndex((l) => l.key === this.scene.key) + 1;
    const levelText = this.add
      .text(W - 30, 28, "Level " + levelNumber, {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: levelText, alpha: 1, duration: 2000 });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  // a resize: everything is drawn again from scratch, the calculator's state stays
  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._keys = {};
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
