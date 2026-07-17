// ─────────────────────────────────────────────────────────────────────────────
// Level — "LIBRARY"  ·  code: SHELF  ·  chamber XV  ·  ASCII barcode
//
// Drawn in the game's pencil-sketch idiom: a massive bookcase in a quiet
// reading room. Each shelf reads like a REAL 1D barcode: a fixed module
// width, book-ink = 1, empty space = 0 — a double-width book is "11", a
// triple gap is "000". Two heavy bookends close each shelf like the guard
// bars of a barcode, so the leading/trailing spaces are measurable.
// One byte per shelf, top to bottom:
//
//   01010011 · 01001000 · 01000101 · 01001100 · 01000110
//      83         72         69         76         70
//       S          H          E          L          F
//
// (e.g. the top shelf: space·book·space·book·space,space·double-book)
//
// Nothing on screen explains any of this. The only quiet nudge is the
// brass plate on the bookcase: "EST. 1963" — the year ASCII was born
// (the same whisper W. LEIBNIZ gives the binary level).
//
// There is no in-scene solve detection — the access code is the proof.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, same scene contract as the other levels:
// GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const LB_SKETCH = 0xd8d2c4; // the pencil itself
// one byte per shelf, top to bottom — spells SHELF
const LB_BYTES = ["01010011", "01001000", "01000101", "01001100", "01000110"];

class LibraryScene extends Phaser.Scene {
  constructor() {
    super({ key: "Library" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    this.events.once("shutdown", () => this.shutdown());

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

  _sketchSeg(rnd, x1, y1, x2, y2, mag) {
    const pts = [{ x: x1, y: y1 }];
    const steps = 3;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const off = (rnd() - 0.5) * 2 * mag;
      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  _drawPath(g, pts, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < pts.length - 1; i++) {
      g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
  }

  _pencilSeg(g, rnd, x1, y1, x2, y2, width, color, alpha, mag = 2) {
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, mag), width, color, alpha);
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1 + 1.2, y1 + 1, x2 + 1.2, y2 + 1, mag),
      width * 0.6,
      color,
      alpha * 0.35,
    );
  }

  _pencilRect(g, rnd, x, y, w, h, width, color, alpha, mag = 2) {
    const o = 4; // corner overshoot
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const floorY = H * 0.88;
    this._drawRoom(W, H, floorY);
    this._drawBookcase(W, H, floorY);
    this._drawProps(W, H, floorY);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  _drawRoom(W, H, floorY) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(4884);
    // wireframe walls
    this._pencilSeg(g, rnd, W * 0.06, H * 0.045, W * 0.06, floorY, 1, LB_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, W * 0.94, H * 0.045, W * 0.94, floorY, 1, LB_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, 0, H * 0.025, W * 0.06, H * 0.045, 1, LB_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, W, H * 0.025, W * 0.94, H * 0.045, 1, LB_SKETCH, 0.08, 2);
    // floor with plank hints
    this._pencilSeg(g, rnd, 0, floorY, W, floorY, 1.4, LB_SKETCH, 0.22, 2);
    this._pencilSeg(g, rnd, 0, floorY + 5, W, floorY + 5, 1, LB_SKETCH, 0.1, 2);
    for (let i = 0; i < 2; i++) {
      const y = floorY + 24 + i * ((H - floorY) / 2.8);
      this._pencilSeg(g, rnd, W * 0.04, y, W * 0.96, y + (rnd() - 0.5) * 6, 1, LB_SKETCH, 0.05, 2.4);
    }
    // stray scribbles high on the wall
    for (let i = 0; i < 4; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.2;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 30, y + (rnd() - 0.5) * 10, 1, LB_SKETCH, 0.04, 1.6);
    }
  }

  // the bookcase: five shelves, eight books each — the barcode
  _drawBookcase(W, H, floorY) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(7117);

    const cw = Math.min(W * 0.52, 680);
    const cx = W / 2 - cw / 2;
    const chTop = H * 0.14;
    const chH = floorY - 10 - chTop;
    const shelfH = chH / 5;

    // case sides, top, bottom — a heavy old cabinet, doubled strokes
    g.fillStyle(0x101216, 0.9);
    g.fillRect(cx - 14, chTop - 14, cw + 28, chH + 24);
    g.fillStyle(LB_SKETCH, 0.025);
    g.fillRect(cx - 14, chTop - 14, cw + 28, chH + 24);
    this._pencilRect(g, rnd, cx - 14, chTop - 14, cw + 28, chH + 24, 1.8, LB_SKETCH, 0.55, 2.2);
    this._pencilRect(g, rnd, cx - 6, chTop - 6, cw + 12, chH + 8, 1, LB_SKETCH, 0.2, 2);
    // crown moulding
    this._pencilSeg(g, rnd, cx - 22, chTop - 14, cx + cw + 22, chTop - 14, 1.6, LB_SKETCH, 0.45, 1.8);
    this._pencilSeg(g, rnd, cx - 18, chTop - 20, cx + cw + 18, chTop - 20, 1.2, LB_SKETCH, 0.3, 1.8);

    // the brass plate — the one quiet nudge
    const plate = this.add
      .text(W / 2, chTop - 34, "EST. 1963", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#8f8974",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(-5);
    this._pencilRect(
      g, rnd,
      W / 2 - plate.width / 2 - 8, chTop - 34 - plate.height / 2 - 4,
      plate.width + 16, plate.height + 8,
      1, LB_SKETCH, 0.3, 1,
    );

    // shelves + books
    const rndB = this._rng(3553);
    for (let s = 0; s < 5; s++) {
      const shelfY = chTop + (s + 1) * shelfH; // the board the books stand on
      if (s < 4) {
        this._pencilSeg(g, rnd, cx - 6, shelfY, cx + cw + 6, shelfY, 1.5, LB_SKETCH, 0.45, 1.8);
        this._pencilSeg(g, rnd, cx - 6, shelfY + 4, cx + cw + 6, shelfY + 4, 1, LB_SKETCH, 0.18, 1.8);
      }

      // ── the shelf as a true 1D barcode ──
      // fixed module width · book-ink = 1 · space = 0; runs of 1s merge
      // into wider books, runs of 0s into wider gaps; two heavy bookends
      // are the guard bars that make the margins measurable
      const bits = LB_BYTES[s];
      const M = cw * 0.062; // one module
      const guardW = cw * 0.024;
      const total = 8 * M + 2 * guardW + M * 0.6; // small breath beside guards
      let bx = cx + (cw - total) / 2;
      const y1 = shelfY - 2;

      // run-length encode the byte: [bit, count] pairs
      const runs = [];
      for (const b of bits) {
        if (runs.length && runs[runs.length - 1][0] === b) runs[runs.length - 1][1]++;
        else runs.push([b, 1]);
      }

      const bookend = (bex) => {
        const beH = shelfH * 0.52;
        g.fillStyle(0x1d2129, 0.97);
        g.fillRect(bex, y1 - beH, guardW, beH);
        g.fillStyle(LB_SKETCH, 0.07);
        g.fillRect(bex, y1 - beH, guardW, beH);
        this._pencilRect(g, rndB, bex, y1 - beH, guardW, beH, 1.3, LB_SKETCH, 0.55, 1);
        // the little foot plate sliding under the row
        this._pencilSeg(g, rndB, bex - 2, y1, bex + guardW + 8, y1 - 1, 1.1, LB_SKETCH, 0.4, 0.6);
      };

      bookend(bx);
      bx += guardW + M * 0.3;

      for (const [bit, count] of runs) {
        const wRun = M * count;
        if (bit === "0") {
          bx += wRun; // space — part of the code, left empty
          continue;
        }
        // a book of `count` modules: 1 = thin spine, 2 = the thick volume
        const wBook = wRun - M * 0.14; // hair of air so books never touch
        const hBook = shelfH * (0.6 + rndB() * 0.22); // chaotic heights
        const lean = rndB() < 0.18 ? (rndB() - 0.5) * M * 0.4 : 0;
        const x0 = bx + M * 0.07;
        const y0 = y1 - hBook;

        g.fillStyle(0x171a20, 0.95);
        g.fillPoints(
          [
            { x: x0 + lean, y: y0 },
            { x: x0 + wBook + lean, y: y0 },
            { x: x0 + wBook, y: y1 },
            { x: x0, y: y1 },
          ],
          true,
        );
        g.fillStyle(LB_SKETCH, 0.04 + rndB() * 0.02);
        g.fillPoints(
          [
            { x: x0 + lean, y: y0 },
            { x: x0 + wBook + lean, y: y0 },
            { x: x0 + wBook, y: y1 },
            { x: x0, y: y1 },
          ],
          true,
        );
        this._pencilSeg(g, rndB, x0, y1, x0 + lean, y0, 1.2, LB_SKETCH, 0.5, 0.8);
        this._pencilSeg(g, rndB, x0 + wBook, y1, x0 + wBook + lean, y0, 1.2, LB_SKETCH, 0.5, 0.8);
        this._pencilSeg(g, rndB, x0 + lean, y0, x0 + wBook + lean, y0, 1.2, LB_SKETCH, 0.5, 0.6);
        // spine decoration: a band or two
        if (rndB() < 0.75) {
          const by1 = y0 + hBook * (0.18 + rndB() * 0.15);
          this._pencilSeg(g, rndB, x0 + 2 + lean * 0.8, by1, x0 + wBook - 2 + lean * 0.8, by1, 1, LB_SKETCH, 0.25, 0.5);
        }
        if (rndB() < 0.5) {
          const by2 = y1 - hBook * (0.14 + rndB() * 0.1);
          this._pencilSeg(g, rndB, x0 + 2, by2, x0 + wBook - 2, by2, 1, LB_SKETCH, 0.2, 0.5);
        }

        bx += wRun;
      }

      bookend(cx + (cw - total) / 2 + total - guardW);
    }
  }

  // a rolling ladder and a forgotten stack of books — the room lived once
  _drawProps(W, H, floorY) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(9229);

    // ladder leaning on the right edge of the case
    const lx0 = W * 0.795;
    const ly0 = floorY;
    const lx1 = W * 0.755;
    const ly1 = H * 0.24;
    const off = W * 0.022;
    this._pencilSeg(g, rnd, lx0, ly0, lx1, ly1, 1.5, LB_SKETCH, 0.4, 2);
    this._pencilSeg(g, rnd, lx0 + off, ly0, lx1 + off, ly1, 1.5, LB_SKETCH, 0.4, 2);
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const rx1 = lx0 + (lx1 - lx0) * t;
      const ry1 = ly0 + (ly1 - ly0) * t;
      this._pencilSeg(g, rnd, rx1, ry1, rx1 + off, ry1, 1.2, LB_SKETCH, 0.35, 0.8);
    }

    // a small stack of books left on the floor, bottom-left
    const sx = W * 0.16;
    let sy = floorY - 8;
    const rndS = this._rng(6446);
    for (let i = 0; i < 3; i++) {
      const bw = W * (0.045 - i * 0.006);
      const bh = 9;
      const bxx = sx - bw / 2 + (rndS() - 0.5) * 10;
      this._pencilRect(g, rndS, bxx, sy - bh, bw, bh, 1.1, LB_SKETCH, 0.35, 1);
      sy -= bh + 2;
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "No one has borrowed a book in years.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 15", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  _drawVignette(W, H) {
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0, 0.45, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.45, 0, 0.45);
    vg.fillRect(W - v, 0, v, H);
  }

  _spawnDust(W, H) {
    const rnd = this._rng(1771);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.08 + rnd() * W * 0.84;
      const dy = H * 0.08 + rnd() * H * 0.55;
      const dot = this.add
        .circle(dx, dy, 0.7 + rnd() * 1, 0xffffff, 0.08 + rnd() * 0.1)
        .setDepth(-2);
      this.tweens.add({
        targets: dot,
        x: dx + (rnd() * 44 - 22),
        y: dy + 24 + rnd() * 40,
        alpha: 0,
        duration: 8000 + rnd() * 8000,
        delay: rnd() * 5000,
        repeat: -1,
        onRepeat: () => {
          dot.x = W * 0.08 + rnd() * W * 0.84;
          dot.y = H * 0.08 + rnd() * H * 0.5;
          dot.setAlpha(0.08 + rnd() * 0.1);
        },
      });
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
