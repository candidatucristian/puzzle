// ─────────────────────────────────────────────────────────────────────────────
// Level — "PI"  ·  code: PI  ·  chamber XIII  ·  count the windows
//
// Drawn in the game's pencil-sketch idiom: a sleeping city at night. A
// crescent of skyline, a moon with its craters, a suspension bridge over
// the river, a little boat drifting through — and ONE building whose
// lights are still on. Floor by floor, top to bottom, the number of lit
// windows is:
//
//   3 · 1 · 4 · 1 · 5 · 9 · 2 · 6 · 5
//
// The lit windows sit at random positions on each floor (seeded), so the
// building just looks awake — until someone counts. Nothing on screen
// explains anything; the access code is the name of the number:  PI
//
// The warm window light is the scene's only living colour, like the
// candle and the router LEDs elsewhere in the game.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, same scene contract as the other levels:
// GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const PI_SKETCH = 0xd8d2c4; // the pencil itself
const PI_DIGITS = [3, 1, 4, 1, 5, 9, 2, 6, 5]; // floors, top to bottom
const PI_COLS = 10; // windows per floor

class PiScene extends Phaser.Scene {
  constructor() {
    super({ key: "Pi" });
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

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = 16;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.5;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const groundY = H * 0.72; // where the city stands
    const waterY = H * 0.8; // the river begins

    this._drawSky(W, H);
    this._drawMoon(W, H);
    this._drawSkyline(W, H, groundY);
    this._drawHeroBuilding(W, H, groundY);
    this._drawRiverAndBridge(W, H, groundY, waterY);
    this._makeBoat(W, H, waterY);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
  }

  _drawSky(W, H) {
    const g = this.add.graphics().setDepth(-16);
    g.fillGradientStyle(0x0b0d12, 0x0d0f15, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    // a scatter of stars, breathing at their own pace
    const rnd = this._rng(7551);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.45;
      const dot = this.add
        .circle(x, y, 0.6 + rnd() * 1, 0xffffff, 1)
        .setAlpha(0.12 + rnd() * 0.25)
        .setDepth(-15);
      this.tweens.add({
        targets: dot,
        alpha: 0.55 + rnd() * 0.3,
        duration: 1400 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  _drawMoon(W, H) {
    const g = this.add.graphics().setDepth(-14);
    const rnd = this._rng(3113);
    const mx = W * 0.79;
    const my = H * 0.14;
    const r = Math.min(W, H) * 0.048;

    // soft halo
    g.fillStyle(0xffffff, 0.03);
    g.fillCircle(mx, my, r * 2.1);
    g.fillStyle(0xffffff, 0.05);
    g.fillCircle(mx, my, r * 1.4);
    // the disk, hatched lightly, with craters
    g.fillStyle(0xe8e2d2, 0.1);
    g.fillCircle(mx, my, r);
    this._pencilCircle(g, rnd, mx, my, r, 1.4, PI_SKETCH, 0.5);
    this._pencilCircle(g, rnd, mx - r * 0.3, my - r * 0.25, r * 0.22, 1, PI_SKETCH, 0.3);
    this._pencilCircle(g, rnd, mx + r * 0.35, my + r * 0.2, r * 0.16, 1, PI_SKETCH, 0.25);
    this._pencilCircle(g, rnd, mx - r * 0.05, my + r * 0.42, r * 0.12, 1, PI_SKETCH, 0.22);
    // light hatching along the shadowed limb
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.75 + i * 0.1);
      this._pencilSeg(
        g, rnd,
        mx + Math.cos(a) * r * 0.55, my + Math.sin(a) * r * 0.55,
        mx + Math.cos(a) * r * 0.92, my + Math.sin(a) * r * 0.92,
        1, PI_SKETCH, 0.12, 0.8,
      );
    }
  }

  // dark buildings, all asleep
  _drawSkyline(W, H, groundY) {
    const g = this.add.graphics().setDepth(-10);
    const rnd = this._rng(6226);
    const blocks = [
      { x: 0.06, w: 0.1, h: 0.3 },
      { x: 0.175, w: 0.08, h: 0.42 },
      { x: 0.56, w: 0.09, h: 0.34 },
      { x: 0.66, w: 0.11, h: 0.48 },
      { x: 0.86, w: 0.09, h: 0.38 },
    ];
    for (const b of blocks) {
      const bx = W * b.x;
      const bw = W * b.w;
      const bh = H * b.h;
      const by = groundY - bh;
      g.fillStyle(0x101216, 0.95);
      g.fillRect(bx, by, bw, bh);
      g.fillStyle(PI_SKETCH, 0.02);
      g.fillRect(bx, by, bw, bh);
      this._pencilRect(g, rnd, bx, by, bw, bh, 1.3, PI_SKETCH, 0.35, 1.8);
      // dead windows — barely-there outlines
      const cols = Math.max(3, Math.round(bw / 26));
      const rows = Math.max(4, Math.round(bh / 40));
      for (let r2 = 0; r2 < rows; r2++) {
        for (let c = 0; c < cols; c++) {
          if (rnd() < 0.24) continue; // some walls, not windows
          const wx = bx + bw * 0.12 + (bw * 0.76 * c) / (cols - 1 || 1) - 4;
          const wy = by + bh * 0.1 + (bh * 0.78 * r2) / (rows - 1 || 1) - 5;
          g.lineStyle(1, PI_SKETCH, 0.1);
          g.strokeRect(wx, wy, 8, 10);
        }
      }
      // a rooftop hint
      if (rnd() < 0.6) {
        this._pencilSeg(g, rnd, bx + bw * 0.3, by, bx + bw * 0.3, by - 10, 1, PI_SKETCH, 0.25, 0.6);
      }
    }
    // the ground line the city stands on
    this._pencilSeg(g, rnd, 0, groundY, W, groundY, 1.4, PI_SKETCH, 0.25, 2);
  }

  // the one building still awake — its lit windows count the digits
  _drawHeroBuilding(W, H, groundY) {
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(9449);

    const floors = PI_DIGITS.length;
    const bw = W * 0.23;
    const bx = W * 0.32;
    const floorH = H * 0.056;
    const bh = floors * floorH + H * 0.02;
    const by = groundY - bh;

    // body
    g.fillStyle(0x14171d, 0.97);
    g.fillRect(bx, by, bw, bh);
    g.fillStyle(PI_SKETCH, 0.035);
    g.fillRect(bx, by, bw, bh);
    this._pencilRect(g, rnd, bx, by, bw, bh, 1.7, PI_SKETCH, 0.55, 2);
    // roof ledge + a rooftop antenna
    this._pencilSeg(g, rnd, bx - 8, by, bx + bw + 8, by, 1.5, PI_SKETCH, 0.5, 1.6);
    this._pencilSeg(g, rnd, bx + bw * 0.72, by, bx + bw * 0.72, by - H * 0.035, 1.2, PI_SKETCH, 0.4, 1);
    this._pencilSeg(g, rnd, bx + bw * 0.72 - 5, by - H * 0.022, bx + bw * 0.72 + 5, by - H * 0.022, 1, PI_SKETCH, 0.3, 0.5);
    // entrance
    this._pencilRect(g, rnd, bx + bw * 0.44, groundY - H * 0.028, bw * 0.12, H * 0.028, 1.2, PI_SKETCH, 0.4, 1);

    // windows: PI_COLS per floor; the lit ones count the digit of π
    const rndPick = this._rng(2718);
    const winW = bw / (PI_COLS + 2.6);
    const winH = floorH * 0.48;
    const x0 = bx + (bw - PI_COLS * winW * 1.18) / 2 + winW * 0.09;

    for (let f = 0; f < floors; f++) {
      const rowY = by + H * 0.014 + f * floorH + floorH * 0.2;
      // choose which windows burn tonight — seeded, scattered
      const lit = new Set();
      while (lit.size < PI_DIGITS[f]) {
        lit.add(Math.floor(rndPick() * PI_COLS));
      }
      for (let c = 0; c < PI_COLS; c++) {
        const wx = x0 + c * winW * 1.18;
        if (lit.has(c)) {
          // the warm light — the only colour awake in the whole city
          // (a round halo: a square one reads as a ghost window and would
          // sabotage the counting)
          const glow = this.add
            .circle(wx + winW / 2, rowY + winH / 2, winW * 1.5, 0xffdf9e, 0.05)
            .setDepth(-8);
          const pane = this.add
            .rectangle(wx + winW / 2, rowY + winH / 2, winW, winH, 0xffdf9e, 0.8)
            .setDepth(-7);
          // each burns a little differently, and breathes
          pane.setAlpha(0.68 + rndPick() * 0.2);
          this.tweens.add({
            targets: [pane, glow],
            alpha: { from: pane.alpha, to: pane.alpha - 0.14 },
            duration: 2200 + rndPick() * 2600,
            delay: rndPick() * 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
          g.lineStyle(1, PI_SKETCH, 0.3);
          g.strokeRect(wx, rowY, winW, winH);
        } else {
          g.lineStyle(1, PI_SKETCH, 0.14);
          g.strokeRect(wx, rowY, winW, winH);
        }
      }
    }
  }

  // the river, its bank, a suspension bridge, the moon's shimmer
  _drawRiverAndBridge(W, H, groundY, waterY) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(5335);

    // embankment
    this._pencilSeg(g, rnd, 0, waterY, W, waterY, 1.4, PI_SKETCH, 0.3, 2);
    this._pencilSeg(g, rnd, 0, waterY + 4, W, waterY + 4, 1, PI_SKETCH, 0.14, 2);

    // still water: sparse drifting strokes
    for (let i = 0; i < 10; i++) {
      const y = waterY + 14 + rnd() * (H - waterY - 24);
      const x = rnd() * W * 0.9;
      this._pencilSeg(g, rnd, x, y, x + 30 + rnd() * 60, y + (rnd() - 0.5) * 3, 1, PI_SKETCH, 0.08, 1);
    }
    // the moon's reflection — broken shimmer under it
    const mx = W * 0.79;
    for (let i = 0; i < 5; i++) {
      const y = waterY + 12 + i * ((H - waterY) * 0.16);
      const wgl = 18 + rnd() * 22;
      this._pencilSeg(g, rnd, mx - wgl / 2 + (rnd() - 0.5) * 16, y, mx + wgl / 2, y, 1.1, PI_SKETCH, 0.16 - i * 0.02, 0.8);
    }

    // the suspension bridge, spanning the river on the right
    const bxA = W * 0.58;
    const bxB = W * 0.995;
    const deckY = waterY + (H - waterY) * 0.3;
    const t1 = W * 0.68;
    const t2 = W * 0.9;
    const towerTop = deckY - H * 0.085;
    // deck
    this._pencilSeg(g, rnd, bxA, deckY, bxB, deckY, 1.6, PI_SKETCH, 0.45, 1.6);
    this._pencilSeg(g, rnd, bxA, deckY + 5, bxB, deckY + 5, 1.1, PI_SKETCH, 0.25, 1.6);
    // towers with piers into the water
    for (const tx of [t1, t2]) {
      this._pencilSeg(g, rnd, tx - 3, towerTop, tx - 3, deckY + 16, 1.5, PI_SKETCH, 0.5, 1);
      this._pencilSeg(g, rnd, tx + 3, towerTop, tx + 3, deckY + 16, 1.5, PI_SKETCH, 0.5, 1);
      this._pencilSeg(g, rnd, tx - 6, towerTop, tx + 6, towerTop, 1.3, PI_SKETCH, 0.45, 0.6);
    }
    // main cables: sagging between the towers, anchored at the ends
    const cable = (xa, ya, xb, yb, sag) => {
      const steps = 12;
      let prev = null;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = xa + (xb - xa) * t;
        const y = ya + (yb - ya) * t + Math.sin(t * Math.PI) * sag;
        if (prev) this._pencilSeg(g, rnd, prev.x, prev.y, x, y, 1.1, PI_SKETCH, 0.35, 0.7);
        prev = { x, y };
      }
    };
    cable(bxA, deckY - 4, t1, towerTop, H * 0.028);
    cable(t1, towerTop, t2, towerTop, H * 0.055);
    cable(t2, towerTop, bxB, deckY - 6, H * 0.02);
    // hangers from the middle cable down to the deck
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      const x = t1 + (t2 - t1) * t;
      const y = towerTop + Math.sin(t * Math.PI) * H * 0.055;
      this._pencilSeg(g, rnd, x, y, x, deckY, 1, PI_SKETCH, 0.2, 0.5);
    }
  }

  // a little boat, drifting slowly across the river all night
  _makeBoat(W, H, waterY) {
    const cont = this.add.container(W * 1.06, waterY + (H - waterY) * 0.55).setDepth(-5);
    const g = this.add.graphics();
    const rnd = this._rng(8668);
    // hull
    g.fillStyle(0x14171d, 0.95);
    g.fillPoints(
      [
        { x: -26, y: 0 },
        { x: 26, y: 0 },
        { x: 16, y: 9 },
        { x: -18, y: 9 },
      ],
      true,
    );
    this._pencilSeg(g, rnd, -26, 0, 26, 0, 1.2, PI_SKETCH, 0.5, 0.8);
    this._pencilSeg(g, rnd, 26, 0, 16, 9, 1.1, PI_SKETCH, 0.45, 0.6);
    this._pencilSeg(g, rnd, 16, 9, -18, 9, 1.1, PI_SKETCH, 0.45, 0.8);
    this._pencilSeg(g, rnd, -18, 9, -26, 0, 1.1, PI_SKETCH, 0.45, 0.6);
    // a small cabin and a mast
    this._pencilRect(g, rnd, -8, -10, 14, 10, 1, PI_SKETCH, 0.4, 0.6);
    this._pencilSeg(g, rnd, 12, 0, 12, -18, 1.1, PI_SKETCH, 0.45, 0.6);
    // wake behind
    this._pencilSeg(g, rnd, -30, 6, -48, 7, 1, PI_SKETCH, 0.14, 0.8);
    this._pencilSeg(g, rnd, -32, 2, -44, 3, 1, PI_SKETCH, 0.1, 0.8);
    cont.add(g);

    // the long, slow crossing — then it comes back around
    this.tweens.add({
      targets: cont,
      x: -W * 0.08,
      duration: 75000,
      repeat: -1,
      onRepeat: () => {
        cont.x = W * 1.06;
      },
    });
    // a gentle bob
    this.tweens.add({
      targets: cont,
      y: cont.y - 2.5,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "The whole city sleeps. One building counts.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 13", {
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
