// ─────────────────────────────────────────────────────────────────────────────
// Level — "CONSTELLATION"  ·  code: NOVA  ·  chamber I  ·  the star chart
//
// A new first level to replace "Sequence".
//
//  THE STAR CHART
//  An old, hand-drawn star chart is presented. Most stars are faint background
//  elements. Four stars are brighter and interactive.
//
//  PUZZLE:
//  1. The player must click the four bright stars in the correct order.
//  2. The correct order is determined by a faint, numbered sequence (1-4)
//     sketched next to the bright stars.
//  3. When a star is clicked correctly, a "pencil-drawn" line connects it
//     to the previous star, and a letter appears next to it.
//  4. Clicking the stars in the sequence N -> O -> V -> A will draw the
//     constellation and reveal the code word.
//  5. If the player clicks out of order, the sequence resets.
//
//  The implementation will reuse the pencil-sketch drawing functions from
//  other levels to maintain a consistent theme.
// ─────────────────────────────────────────────────────────────────────────────

const CONSTELLATION_SKETCH = 0xd8d2c4;
const CONSTELLATION_STAR_BRIGHT = 0xfff2c4;
const CONSTELLATION_STAR_FAINT = 0x8a8370;

class ConstellationScene extends Phaser.Scene {
  constructor() {
    super({ key: "Constellation" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    // No new assets needed, everything is drawn procedurally.
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    this.events.once("shutdown", () => this.shutdown());
    this.input.mouse.disableContextMenu();

    this._clickIndex = 0;
    this._lines = [];
    this._letters = [];

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) {
      this.cameras.main.fadeIn(600, 0, 0, 0);
    }
  }

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ── Drawing Primitives (adapted from other levels) ───────────────────────

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

  _pencilSeg(g, rnd, x1, y1, x2, y2, width, color, alpha, mag = 1.5) {
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, mag), width, color, alpha);
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1 + 1.2, y1 + 1, x2 + 1.2, y2 + 1, mag),
      width * 0.6,
      color,
      alpha * 0.35
    );
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = 12;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.2;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── Scene Construction ───────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._drawBackground(W, H);
    this._drawConstellationStars(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
  }

  _drawBackground(W, H) {
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    // Faint background stars
    const rnd = this._rng(1234);
    for (let i = 0; i < 150; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const r = rnd() * 0.8 + 0.2;
      const a = rnd() * 0.4 + 0.1;
      g.fillStyle(CONSTELLATION_STAR_FAINT, a);
      g.fillCircle(x, y, r);
    }
  }

  _drawConstellationStars(W, H) {
    this.stars = [
      { x: W * 0.3, y: H * 0.6, letter: "N", order: 1 },
      { x: W * 0.45, y: H * 0.3, letter: "O", order: 2 },
      { x: W * 0.6, y: H * 0.6, letter: "V", order: 3 },
      { x: W * 0.75, y: H * 0.3, letter: "A", order: 4 },
    ];

    const g = this.add.graphics().setDepth(-5);
    const rnd = this._rng(5678);

    this.stars.forEach((star, index) => {
      // Draw star
      const starGraphic = this.add.graphics().setDepth(0);
      starGraphic.fillStyle(CONSTELLATION_STAR_BRIGHT, 0.9);
      starGraphic.fillCircle(star.x, star.y, 6);
      starGraphic.lineStyle(1, CONSTELLATION_STAR_BRIGHT, 0.5);
      this._pencilSeg(g, rnd, star.x - 10, star.y, star.x + 10, star.y, 0.5, CONSTELLATION_STAR_BRIGHT, 0.3);
      this._pencilSeg(g, rnd, star.x, star.y - 10, star.x, star.y + 10, 0.5, CONSTELLATION_STAR_BRIGHT, 0.3);

      // Draw order number
      this.add
        .text(star.x + 15, star.y + 15, star.order, {
          fontFamily: '"Special Elite", monospace',
          fontSize: "14px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setAlpha(0.4)
        .setDepth(-5);

      // Make star clickable
      const zone = this.add
        .zone(star.x, star.y, 30, 30)
        .setCircleDropZone(15)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerdown", () => {
        this._starClicked(index);
      });
    });
  }

  _starClicked(index) {
    const star = this.stars[index];

    // Check if it's the correct star in the sequence
    if (star.order - 1 === this._clickIndex) {
      playClick(this);
      
      // Reveal letter
      const letterText = this.add.text(star.x, star.y - 25, star.letter, {
          fontFamily: '"Special Elite", monospace',
          fontSize: "32px",
          color: "#d9c9a0",
        }).setOrigin(0.5).setDepth(5).setAlpha(0);
      this._letters.push(letterText);

      this.tweens.add({ targets: letterText, alpha: 1, duration: 500 });
      
      // Draw line from previous star
      if (this._clickIndex > 0) {
        const prevStar = this.stars.find(s => s.order - 1 === this._clickIndex - 1);
        const line = this.add.graphics().setDepth(-1);
        this._lines.push(line);
        
        const rnd = this._rng(star.order * 100);
        this._pencilSeg(line, rnd, prevStar.x, prevStar.y, star.x, star.y, 1.5, CONSTELLATION_SKETCH, 0.6);
      }

      this._clickIndex++;

      if (this._clickIndex === this.stars.length) {
        this.statusText.setText("A new word has formed.");
        playSuccess(this);
      }

    } else {
      // Wrong order, reset
      playErrorSound();
      this._clickIndex = 0;
      this._lines.forEach(l => l.destroy());
      this._lines = [];
      this._letters.forEach(l => l.destroy());
      this._letters = [];
      this.statusText.setText("The stars fade. Try again.");
      this.time.delayedCall(1500, () => {
        if(this.statusText) this.statusText.setText("Connect the brightest points.");
      });
    }
  }


  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "Connect the brightest points.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 1", {
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

  // ── Lifecycle ───────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
  }

  shutdown() {
    this._teardown();
  }
}
