// ─────────────────────────────────────────────────────────────────────────────
// Level — "ELEMENTS"  ·  code: CONCERNS  ·  chamber XVIII  ·  read the shelf
//
// Drawn in the game's pencil-sketch idiom: an apothecary's cabinet, five
// glass jars in a row, each with a handwritten label bearing ONLY a number.
// The numbers are atomic numbers; the periodic table turns them into
// symbols, and the symbols spell the code:
//
//   27→Co · 7→N · 58→Ce · 86→Rn · 16→S   →   CONCERNS
//
// No symbol is written anywhere — the player has to suspect chemistry on
// their own (the cobalt-blue and sulfur-yellow liquids are the only nudge)
// and look the numbers up. One jar — the radon — breathes a faint glow,
// the scene's single living colour. The access code is the proof.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const EL_SKETCH = 0xd8d2c4; // the pencil itself

// left-to-right order — the atomic numbers resolve to symbols that spell
// the code (27=Co, 7=N, 58=Ce, 86=Rn, 16=S). Only `num` is ever rendered.
const EL_JARS = [
  { num: 27, liquid: 0x2b5aa0, glow: false }, // cobalt blue
  { num: 7, liquid: 0x9fb0c4, glow: false }, // colourless gas
  { num: 58, liquid: 0x6f9f6a, glow: false }, // pale rare-earth
  { num: 86, liquid: 0x3f9f8c, glow: true }, // radon — faint glow
  { num: 16, liquid: 0xd8bf3a, glow: false }, // sulfur yellow
];

class ElementsScene extends Phaser.Scene {
  constructor() {
    super({ key: "Elements" });
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

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 16, mag = 1.2) {
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
    this._drawCabinet(W, H);
    this._drawJars(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x12130f, 0x14150f, 0x090a07, 0x0a0b08, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(2255);
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.9;
      this._pencilSeg(
        g, rnd, x, y, x + 14 + rnd() * 26, y + (rnd() - 0.5) * 8,
        1, EL_SKETCH, 0.04, 1.6,
      );
    }
  }

  // the wooden cabinet: a back panel and the shelf plank the jars stand on
  _drawCabinet(W, H) {
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(6161);

    const cx0 = W * 0.1;
    const cx1 = W * 0.9;
    const top = H * 0.16;
    const bot = H * 0.82;

    // back panel tint + frame
    g.fillStyle(EL_SKETCH, 0.02);
    g.fillRect(cx0, top, cx1 - cx0, bot - top);
    this._pencilRect(g, rnd, cx0, top, cx1 - cx0, bot - top, 1.6, EL_SKETCH, 0.4, 2);
    this._pencilRect(g, rnd, cx0 - 8, top - 8, cx1 - cx0 + 16, bot - top + 16, 1, EL_SKETCH, 0.18, 2);

    // vertical grain on the back panel
    g.lineStyle(1, EL_SKETCH, 0.05);
    for (let i = 1; i < 12; i++) {
      const x = cx0 + ((cx1 - cx0) * i) / 12;
      g.lineBetween(x, top + 4, x, bot - 4);
    }

    // the shelf plank the jars rest on
    this._shelfY = H * 0.62;
    const plankH = 16;
    g.fillStyle(0x1a1a14, 0.9);
    g.fillRect(cx0, this._shelfY, cx1 - cx0, plankH);
    this._pencilRect(g, rnd, cx0, this._shelfY, cx1 - cx0, plankH, 1.8, EL_SKETCH, 0.5, 1.6);
    // front lip shading
    this._pencilSeg(g, rnd, cx0, this._shelfY + plankH, cx1, this._shelfY + plankH, 1.4, EL_SKETCH, 0.3, 1.4);
  }

  _drawJars(W, H) {
    const cx0 = W * 0.1;
    const cx1 = W * 0.9;
    const baseY = this._shelfY; // jars stand on top of the plank
    const jw = Math.min((cx1 - cx0) / 6.2, 120);
    const jh = jw * 2.0;

    // glow layer sits behind the glass
    this._glowG = this.add.graphics().setDepth(0);

    for (let i = 0; i < EL_JARS.length; i++) {
      const t = (i + 1) / (EL_JARS.length + 1);
      const jx = cx0 + (cx1 - cx0) * t;
      this._drawJar(jx, baseY, jw, jh, EL_JARS[i], i);
    }
  }

  _drawJar(x, baseY, w, h, data, index) {
    const rnd = this._rng(7000 + index * 211);
    const g = this.add.graphics().setDepth(1);

    const left = x - w / 2;
    const top = baseY - h;
    const neckW = w * 0.42;
    const neckH = h * 0.16;

    // faint radioactive glow behind the radon jar
    if (data.glow) {
      const halo = this.add.graphics().setDepth(0);
      halo.fillStyle(data.liquid, 0.16);
      halo.fillCircle(x, baseY - h * 0.42, w * 0.95);
      halo.fillStyle(data.liquid, 0.1);
      halo.fillCircle(x, baseY - h * 0.42, w * 1.3);
      this.tweens.add({
        targets: halo,
        alpha: 0.35,
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // glass body (rounded), a dark translucent vessel
    g.fillStyle(0x0e1116, 0.55);
    g.fillRoundedRect(left, top + neckH, w, h - neckH, w * 0.16);

    // the liquid / contents filling the lower part of the body
    const liqTop = top + neckH + (h - neckH) * 0.42;
    g.fillStyle(data.liquid, 0.5);
    g.fillRoundedRect(left + 3, liqTop, w - 6, baseY - liqTop - 3, w * 0.12);
    // meniscus line
    g.lineStyle(1.4, data.liquid, 0.7);
    g.lineBetween(left + 5, liqTop, left + w - 5, liqTop);

    // glass vertical highlight
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(left + w * 0.18, top + neckH + 6, w * 0.1, h - neckH - 14);

    // neck + cork
    g.fillStyle(0x0e1116, 0.5);
    g.fillRect(x - neckW / 2, top, neckW, neckH + 4);
    g.fillStyle(0x5a4326, 0.9);
    g.fillRect(x - neckW / 2 - 2, top - h * 0.05, neckW + 4, h * 0.06);

    // pencil linework over the glass
    this._pencilRect(g, rnd, left, top + neckH, w, h - neckH, 1.6, EL_SKETCH, 0.55, 1.4);
    this._pencilSeg(g, rnd, x - neckW / 2, top, x - neckW / 2, top + neckH, 1.3, EL_SKETCH, 0.45, 1);
    this._pencilSeg(g, rnd, x + neckW / 2, top, x + neckW / 2, top + neckH, 1.3, EL_SKETCH, 0.45, 1);
    this._pencilRect(g, rnd, x - neckW / 2 - 2, top - h * 0.05, neckW + 4, h * 0.06, 1.3, EL_SKETCH, 0.5, 1);

    // ── the label: an aged card bearing nothing but a number ──
    const labW = w * 0.82;
    const labH = h * 0.34;
    const labX = x - labW / 2;
    const labY = top + neckH + (h - neckH) * 0.16;
    g.fillStyle(0xece4cf, 0.9);
    g.fillRect(labX, labY, labW, labH);
    this._pencilRect(g, rnd, labX, labY, labW, labH, 1.4, 0x4a4636, 0.5, 1.2);
    // foxing stains so the card reads as old inventory, not a clue card
    g.fillStyle(0x8a7a4e, 0.12);
    g.fillCircle(labX + labW * 0.2, labY + labH * 0.78, labW * 0.09);
    g.fillCircle(labX + labW * 0.85, labY + labH * 0.2, labW * 0.06);

    // the number, handwritten large in the centre — and nothing else
    this.add
      .text(x, labY + labH * 0.52, String(data.num), {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.round(labH * 0.46) + "px",
        color: "#23201a",
      })
      .setOrigin(0.5)
      .setDepth(3);

    // a faint underline, the way a stockkeeper closes an entry
    this._pencilSeg(
      g, rnd,
      labX + labW * 0.24, labY + labH * 0.82,
      labX + labW * 0.76, labY + labH * 0.8,
      1.1, 0x4a4636, 0.35, 1,
    );

    // slow bubbles rising through the liquid — the shelf still breathes
    const liqTopY = top + neckH + (h - neckH) * 0.42;
    const rndB = this._rng(9100 + index * 47);
    for (let b = 0; b < 3; b++) {
      const bx = x - w * 0.28 + rndB() * w * 0.56;
      const by = baseY - 6;
      const bub = this.add
        .circle(bx, by, 1 + rndB() * 1.4, 0xffffff, 0.18)
        .setDepth(2);
      const dur = 5200 + rndB() * 4200;
      this.tweens.add({
        targets: bub,
        y: liqTopY + 4,
        alpha: 0,
        duration: dur,
        delay: rndB() * 4000 + b * 1500,
        repeat: -1,
        onRepeat: () => {
          bub.x = x - w * 0.28 + rndB() * w * 0.56;
          bub.y = baseY - 6;
          bub.setAlpha(0.18);
        },
      });
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "THE CABINET WAS LOCKED, BUT THE LABELS WERE NOT.", {
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
    const rnd = this._rng(3391);
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
    this._glowG = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
