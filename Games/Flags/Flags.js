// ─────────────────────────────────────────────────────────────────────────────
// Level — "FLAGS"  ·  code: DEBRIEFING  ·  chamber XVII  ·  dress the ship
//
// Drawn in the game's pencil-sketch idiom: a rope of signal bunting strung
// across a quiet harbour office — five national flags pegged to a sagging
// line, swaying a little in the draught.
//
// Read left to right. Each flag is a country; each country has its two-letter
// code. Concatenate the codes in hanging order:
//
//   Germany DE · Brazil BR · Ireland IE · Finland FI · Nigeria NG
//                                                    →  DEBRIEFING
//
// Nothing on screen names a country or a code, and nothing snaps. The access
// code is the proof. Colour survives the scene's grayscale wash just enough
// to read the flags; the shapes carry the rest.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const FL_SKETCH = 0xd8d2c4; // the pencil itself

// hanging order — the initials of the countries spell the code
const FL_FLAGS = ["DE", "BR", "IE", "FI", "NG"];

// a small, muted palette that still reads under the grayscale wash
const FL_COL = {
  black: 0x20242b,
  red: 0xb23b30,
  gold: 0xd7a828,
  green: 0x2f7d46,
  yellow: 0xdcc233,
  blue: 0x28539c,
  navy: 0x1d3b7a,
  white: 0xe7e1d1,
  orange: 0xd07a2c,
};

class FlagsScene extends Phaser.Scene {
  constructor() {
    super({ key: "Flags" });
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
    this.input.mouse.disableContextMenu();

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
    const o = 3;
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 16, mag = 1.4) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * mag;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    this._drawRoom(W, H);
    this._drawClock(W, H);
    this._drawBunting(W, H);
    this._drawPodium(W, H);
    this._drawChairs(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x11141a, 0x0f1319, 0x080a0e, 0x090b0f, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(4413);
    // wainscot rail along the back wall
    this._floorY = H * 0.78;
    this._pencilSeg(g, rnd, 0, H * 0.62, W, H * 0.62, 1, FL_SKETCH, 0.07, 2);
    // the floor: a darker plane with receding boards
    g.fillStyle(0x0a0c10, 0.85);
    g.fillRect(0, this._floorY, W, H - this._floorY);
    this._pencilSeg(g, rnd, 0, this._floorY, W, this._floorY, 1.4, FL_SKETCH, 0.25, 2);
    // floorboard seams fanning gently toward the viewer
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const xTop = W * t;
      const xBot = W * 0.5 + (t - 0.5) * W * 1.3;
      g.lineStyle(1, FL_SKETCH, 0.06);
      g.lineBetween(xTop, this._floorY, xBot, H);
    }
    // a couple of stray pencil marks on the wall
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.55;
      this._pencilSeg(
        g, rnd, x, y, x + 14 + rnd() * 26, y + (rnd() - 0.5) * 8,
        1, FL_SKETCH, 0.04, 1.6,
      );
    }
  }

  // a wall clock, stopped hands, pendulum still keeping its own time
  _drawClock(W, H) {
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(8123);
    const cx = W * 0.09;
    const cy = H * 0.3;
    const r = Math.min(W, H) * 0.045;

    g.fillStyle(0x0d0f13, 0.9);
    g.fillCircle(cx, cy, r);
    this._pencilCircle(g, rnd, cx, cy, r, 1.6, FL_SKETCH, 0.5, 20, 1.2);
    this._pencilCircle(g, rnd, cx, cy, r * 0.85, 1, FL_SKETCH, 0.2, 18, 1);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.lineStyle(1, FL_SKETCH, 0.35);
      g.lineBetween(
        cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75,
        cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85,
      );
    }
    // hands, stopped somewhere in the small hours
    this._pencilSeg(g, rnd, cx, cy, cx + r * 0.36, cy - r * 0.3, 1.6, FL_SKETCH, 0.55, 0.6);
    this._pencilSeg(g, rnd, cx, cy, cx - r * 0.14, cy - r * 0.55, 1.3, FL_SKETCH, 0.5, 0.6);
    // the case below, and a pendulum that still swings
    this._pencilRect(g, rnd, cx - r * 0.34, cy + r, r * 0.68, r * 1.5, 1.2, FL_SKETCH, 0.35, 1);
    const pend = this.add.container(cx, cy + r).setDepth(-9);
    const pg = this.add.graphics();
    pg.lineStyle(1.4, FL_SKETCH, 0.4);
    pg.lineBetween(0, 0, 0, r * 1.2);
    pg.fillStyle(FL_SKETCH, 0.35);
    pg.fillCircle(0, r * 1.2, r * 0.16);
    pend.add(pg);
    pend.setAngle(-9);
    this.tweens.add({
      targets: pend,
      angle: 9,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // the lectern the debrief was read from, still facing the empty chairs
  _drawPodium(W, H) {
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(5511);
    const cx = W * 0.5;
    const baseY = H * 0.9;
    const ph = H * 0.24; // lectern height
    const topW = W * 0.13;
    const botW = W * 0.095;
    const topY = baseY - ph;

    // shadow pooling at its feet
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(cx, baseY + 4, botW * 2.6, ph * 0.16);

    // tapered body
    g.fillGradientStyle(0x191c22, 0x15181d, 0x0d0f13, 0x0e1014, 1);
    g.beginPath();
    g.moveTo(cx - topW, topY);
    g.lineTo(cx + topW, topY);
    g.lineTo(cx + botW, baseY);
    g.lineTo(cx - botW, baseY);
    g.closePath();
    g.fillPath();
    this._pencilSeg(g, rnd, cx - topW, topY, cx + topW, topY, 1.6, FL_SKETCH, 0.5, 1.4);
    this._pencilSeg(g, rnd, cx + topW, topY, cx + botW, baseY, 1.5, FL_SKETCH, 0.45, 1.4);
    this._pencilSeg(g, rnd, cx + botW, baseY, cx - botW, baseY, 1.4, FL_SKETCH, 0.4, 1.4);
    this._pencilSeg(g, rnd, cx - botW, baseY, cx - topW, topY, 1.5, FL_SKETCH, 0.45, 1.4);
    // slanted reading top
    g.fillStyle(0x20242b, 1);
    g.beginPath();
    g.moveTo(cx - topW, topY);
    g.lineTo(cx + topW, topY);
    g.lineTo(cx + topW * 0.92, topY - ph * 0.07);
    g.lineTo(cx - topW * 0.92, topY - ph * 0.09);
    g.closePath();
    g.fillPath();
    this._pencilSeg(g, rnd, cx - topW * 0.92, topY - ph * 0.09, cx + topW * 0.92, topY - ph * 0.07, 1.6, FL_SKETCH, 0.55, 1.2);
    // a sheet of notes left on the lectern, corner lifted
    g.fillStyle(0xe7e1d1, 0.22);
    g.fillRect(cx - topW * 0.5, topY - ph * 0.07, topW * 0.9, ph * 0.05);
    // a small reading lamp, its warm pool breathing
    const lampX = cx + topW * 0.62;
    const lampY = topY - ph * 0.08;
    this._pencilSeg(g, rnd, lampX, lampY, lampX, lampY - 16, 1.3, FL_SKETCH, 0.5, 0.8);
    this._pencilSeg(g, rnd, lampX, lampY - 16, lampX - 9, lampY - 20, 1.3, FL_SKETCH, 0.5, 0.6);
    const glow = this.add.circle(lampX - 11, lampY - 18, 16, 0xe6b458, 0.1).setDepth(-4);
    this.add.circle(lampX - 11, lampY - 18, 3, 0xe6b458, 0.75).setDepth(-4);
    this.tweens.add({
      targets: glow,
      alpha: 0.55,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // rows of empty chairs facing the lectern, backs to the viewer
  _drawChairs(W, H) {
    const g = this.add.graphics().setDepth(-3);
    const rnd = this._rng(6644);
    const rows = [
      { y: H * 0.93, s: 1.0, n: 3 },
      { y: H * 0.99, s: 1.18, n: 2 },
    ];
    for (const row of rows) {
      for (let i = 0; i < row.n; i++) {
        const t = (i + 1) / (row.n + 1);
        const cx = W * 0.14 + (W * 0.72) * t + (rnd() - 0.5) * W * 0.02;
        const s = H * 0.055 * row.s;
        // seat back: an open rectangle with two uprights
        this._pencilRect(g, rnd, cx - s * 0.7, row.y - s * 1.5, s * 1.4, s * 0.9, 1.4, FL_SKETCH, 0.35, 1.2);
        this._pencilSeg(g, rnd, cx - s * 0.55, row.y - s * 0.6, cx - s * 0.6, row.y, 1.2, FL_SKETCH, 0.3, 0.8);
        this._pencilSeg(g, rnd, cx + s * 0.55, row.y - s * 0.6, cx + s * 0.6, row.y, 1.2, FL_SKETCH, 0.3, 0.8);
      }
    }
  }

  // the sagging line and the five hanging flags
  _drawBunting(W, H) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(1701);

    // the rope: a shallow catenary from one wall peg to the other
    const x0 = W * 0.1;
    const x1 = W * 0.9;
    const yTop = H * 0.2;
    const sag = H * 0.1;
    const rope = (x) => {
      const t = (x - x0) / (x1 - x0);
      return yTop + Math.sin(t * Math.PI) * sag;
    };

    // wall pegs
    this._pencilCircle(g, rnd, x0, yTop, 5, 1.6, FL_SKETCH, 0.5, 12, 0.8);
    this._pencilCircle(g, rnd, x1, yTop, 5, 1.6, FL_SKETCH, 0.5, 12, 0.8);

    // draw the rope as a chain of short pencil segments
    const N = 40;
    let px = x0;
    let py = rope(x0);
    for (let i = 1; i <= N; i++) {
      const x = x0 + (x1 - x0) * (i / N);
      const y = rope(x);
      this._pencilSeg(g, rnd, px, py, x, y, 1.6, FL_SKETCH, 0.55, 1);
      px = x;
      py = y;
    }

    // five flags, evenly spaced along the span
    this._flags = [];
    const fw = Math.min(W * 0.12, 128);
    const fh = fw * 0.66;
    for (let i = 0; i < FL_FLAGS.length; i++) {
      const t = (i + 1) / (FL_FLAGS.length + 1);
      const fx = x0 + (x1 - x0) * t;
      const fy = rope(fx);
      this._makeFlag(FL_FLAGS[i], fx, fy, fw, fh, i);
    }
  }

  _makeFlag(code, x, y, w, h, index) {
    const cont = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    const rnd = this._rng(3300 + index * 137);

    // the clip/ring that pegs the flag to the rope
    this._pencilCircle(g, rnd, 0, -2, 4, 1.4, FL_SKETCH, 0.6, 10, 0.6);
    this._pencilSeg(g, rnd, -w / 2, 4, w / 2, 4, 1.4, FL_SKETCH, 0.5, 1);

    // the cloth: national design, then a pencil border and a fold
    this._paintFlag(g, code, -w / 2, 4, w, h);
    this._pencilRect(g, rnd, -w / 2, 4, w, h, 1.6, FL_SKETCH, 0.6, 1.4);
    // a soft diagonal fold-shadow across the cloth
    g.fillStyle(0x000000, 0.12);
    g.fillTriangle(-w / 2, 4 + h, -w / 2 + w * 0.4, 4 + h, -w / 2, 4 + h * 0.4);

    cont.add(g);
    this._flags.push(cont);

    // a lazy pendulum sway, each flag slightly out of phase
    cont.setAngle(-2);
    this.tweens.add({
      targets: cont,
      angle: 2,
      duration: 2600 + index * 180,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: index * 200,
    });
  }

  // paint a specific national flag inside the rect (x,y,w,h)
  _paintFlag(g, code, x, y, w, h) {
    switch (code) {
      case "DE": { // Germany — black / red / gold, horizontal
        g.fillStyle(FL_COL.black, 1); g.fillRect(x, y, w, h / 3);
        g.fillStyle(FL_COL.red, 1); g.fillRect(x, y + h / 3, w, h / 3);
        g.fillStyle(FL_COL.gold, 1); g.fillRect(x, y + (2 * h) / 3, w, h / 3);
        break;
      }
      case "BR": { // Brazil — green field, yellow lozenge, blue globe
        g.fillStyle(FL_COL.green, 1); g.fillRect(x, y, w, h);
        const cx = x + w / 2;
        const cy = y + h / 2;
        g.fillStyle(FL_COL.yellow, 1);
        g.fillPoints(
          [
            { x: cx, y: y + h * 0.12 },
            { x: x + w * 0.9, y: cy },
            { x: cx, y: y + h * 0.88 },
            { x: x + w * 0.1, y: cy },
          ],
          true,
        );
        g.fillStyle(FL_COL.navy, 1);
        g.fillCircle(cx, cy, h * 0.2);
        // the pale banner arcing across the globe
        g.fillStyle(FL_COL.white, 0.85);
        g.fillRect(cx - h * 0.19, cy - h * 0.035, h * 0.38, h * 0.07);
        break;
      }
      case "IE": { // Ireland — green / white / orange, vertical
        g.fillStyle(FL_COL.green, 1); g.fillRect(x, y, w / 3, h);
        g.fillStyle(FL_COL.white, 1); g.fillRect(x + w / 3, y, w / 3, h);
        g.fillStyle(FL_COL.orange, 1); g.fillRect(x + (2 * w) / 3, y, w / 3, h);
        break;
      }
      case "FI": { // Finland — white field, blue Nordic cross (offset to hoist)
        g.fillStyle(FL_COL.white, 1); g.fillRect(x, y, w, h);
        g.fillStyle(FL_COL.blue, 1);
        const barX = x + w * 0.3;
        g.fillRect(barX - w * 0.09, y, w * 0.18, h); // vertical bar
        g.fillRect(x, y + h * 0.5 - h * 0.13, w, h * 0.26); // horizontal bar
        break;
      }
      case "NG": { // Nigeria — green / white / green, vertical
        g.fillStyle(FL_COL.green, 1); g.fillRect(x, y, w / 3, h);
        g.fillStyle(FL_COL.white, 1); g.fillRect(x + w / 3, y, w / 3, h);
        g.fillStyle(FL_COL.green, 1); g.fillRect(x + (2 * w) / 3, y, w / 3, h);
        break;
      }
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "THE LAST BRIEFING ENDED. NOBODY TOOK THE COLOURS DOWN.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level " + (window.GAME_LEVELS.findIndex((l) => l.key === this.scene.key) + 1), {
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
    const rnd = this._rng(9091);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.1 + rnd() * W * 0.8;
      const dy = H * 0.15 + rnd() * H * 0.6;
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
          dot.x = W * 0.1 + rnd() * W * 0.8;
          dot.y = H * 0.15 + rnd() * H * 0.5;
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
    this._flags = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
