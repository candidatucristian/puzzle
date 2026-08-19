// ─────────────────────────────────────────────────────────────────────────────
// Level — "WORKBENCH"  ·  code: 1801040915 (alt: RADIO)  ·  chamber XIX
//
// Drawn in the game's pencil-sketch idiom: a repairman's bench, abandoned
// mid-job. A pegboard of tools, a soldering iron still warm in its stand,
// and an old wireless set open on the bench, its back off. On a schematic
// sheet, five resistors are laid in a series line, left to right — and
// their paint is the only colour in the room.
//
// Each resistor carries two digit bands and a gold tolerance band (the gold
// marks the reading direction, exactly as the real colour code does):
//
//   brown·gray  black·brown  black·yellow  black·white  brown·green
//       18           01            04           09           15
//
// Read in circuit order the digits form the code: 1801040915. Whoever
// carries the decoding one step further (A=1…Z=26) finds the word the
// bench has been trying to say all along — RADIO — accepted as well.
//
// Nothing on screen names the colour code; the access code is the proof.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, same scene contract as the other levels:
// GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const WB_SKETCH = 0xd8d2c4; // the pencil itself

// the resistor colour code, muted to sit inside the sketch idiom
const WB_BAND = {
  0: 0x141518, // black
  1: 0x6b3f22, // brown
  2: 0xb23b30, // red
  3: 0xd07a2c, // orange
  4: 0xdcc233, // yellow
  5: 0x2f7d46, // green
  6: 0x28539c, // blue
  7: 0x7a4b9c, // violet
  8: 0x8a8f96, // grey
  9: 0xe7e1d1, // white
};
const WB_GOLD = 0xc9a227;

// the five parts, in circuit order — digits spell 18 01 04 09 15 → RADIO
const WB_RESISTORS = [
  [1, 8],
  [0, 1],
  [0, 4],
  [0, 9],
  [1, 5],
];

class WorkbenchScene extends Phaser.Scene {
  constructor() {
    super({ key: "Workbench" });
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
    const o = 4; // corner overshoot
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 14, mag = 1.2) {
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
    this._benchY = H * 0.58; // the bench surface line

    this._drawRoom(W, H);
    this._drawPegboard(W, H);
    this._drawRadio(W, H);
    this._drawSchematic(W, H);
    this._drawIron(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  // the workshop wall and the bench itself
  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x121310, 0x131411, 0x0a0b09, 0x0b0c0a, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(6110);
    const by = this._benchY;

    // the bench top: a thick plank edge, then its face falling to the floor
    g.fillStyle(0x14120e, 0.95);
    g.fillRect(0, by, W, H - by);
    this._pencilSeg(g, rnd, 0, by, W, by, 1.8, WB_SKETCH, 0.4, 2);
    this._pencilSeg(g, rnd, 0, by + 9, W, by + 9, 1.2, WB_SKETCH, 0.2, 2);
    // wood grain along the top
    for (let i = 0; i < 5; i++) {
      const y = by + 20 + i * ((H - by) / 6);
      this._pencilSeg(g, rnd, W * 0.03, y, W * 0.97, y + (rnd() - 0.5) * 8, 1, WB_SKETCH, 0.05, 2.4);
    }
    // old scorch rings and scratches on the bench
    for (let i = 0; i < 4; i++) {
      this._pencilCircle(g, rnd, rnd() * W, by + 24 + rnd() * (H - by - 40), 8 + rnd() * 8, 1, WB_SKETCH, 0.07, 10, 1.6);
    }
    // stray wall scribbles
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = rnd() * by * 0.5;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 26, y + (rnd() - 0.5) * 8, 1, WB_SKETCH, 0.04, 1.6);
    }
  }

  // pegboard of sketched tools above the bench
  _drawPegboard(W, H) {
    const g = this.add.graphics().setDepth(-10);
    const rnd = this._rng(8448);
    const bx = W * 0.56;
    const bw = W * 0.36;
    const by = H * 0.1;
    const bh = H * 0.3;

    g.fillStyle(WB_SKETCH, 0.02);
    g.fillRect(bx, by, bw, bh);
    this._pencilRect(g, rnd, bx, by, bw, bh, 1.4, WB_SKETCH, 0.4, 2);
    // peg holes
    g.fillStyle(WB_SKETCH, 0.1);
    for (let r = 1; r < 4; r++) {
      for (let c = 1; c < 8; c++) {
        g.fillCircle(bx + (bw * c) / 8, by + (bh * r) / 4, 1.4);
      }
    }
    // pliers: two crossed arms with round jaws
    const px = bx + bw * 0.18;
    const py = by + bh * 0.4;
    this._pencilSeg(g, rnd, px - 8, py - 22, px + 10, py + 24, 1.4, WB_SKETCH, 0.45, 1.2);
    this._pencilSeg(g, rnd, px + 8, py - 22, px - 10, py + 24, 1.4, WB_SKETCH, 0.45, 1.2);
    this._pencilCircle(g, rnd, px, py - 2, 3.5, 1.2, WB_SKETCH, 0.4, 10, 0.6);
    // screwdriver: shaft, blade, hatched grip
    const sx = bx + bw * 0.45;
    this._pencilSeg(g, rnd, sx, by + bh * 0.2, sx, by + bh * 0.72, 1.5, WB_SKETCH, 0.5, 1);
    this._pencilRect(g, rnd, sx - 5, by + bh * 0.16, 10, bh * 0.18, 1.2, WB_SKETCH, 0.45, 0.8);
    for (let i = 0; i < 3; i++) {
      this._pencilSeg(g, rnd, sx - 5, by + bh * (0.2 + i * 0.04), sx + 5, by + bh * (0.2 + i * 0.04), 1, WB_SKETCH, 0.25, 0.5);
    }
    // a coil of solder hanging off a peg
    const cx = bx + bw * 0.74;
    const cy = by + bh * 0.46;
    for (let i = 0; i < 3; i++) {
      this._pencilCircle(g, rnd, cx, cy, 16 - i * 4, 1.3, WB_SKETCH, 0.35 - i * 0.07, 14, 1.6);
    }
    this._pencilSeg(g, rnd, cx, cy - 16, cx, by + bh * 0.28, 1, WB_SKETCH, 0.3, 0.8);
  }

  // the patient: an old wireless set, back panel off, leaning on the bench
  _drawRadio(W, H) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(3993);
    const rw = Math.min(W * 0.24, 330);
    const rh = rw * 0.68;
    const rx = W * 0.06;
    const by = this._benchY;
    const ry = by - rh + 4;

    // shadow on the bench
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(rx + rw / 2, by + 8, rw * 1.05, 16);

    // cathedral-ish cabinet: body with a rounded top
    g.fillStyle(0x171410, 0.97);
    g.fillRect(rx, ry + rh * 0.2, rw, rh * 0.8);
    g.fillEllipse(rx + rw / 2, ry + rh * 0.22, rw, rh * 0.44);
    g.fillStyle(WB_SKETCH, 0.03);
    g.fillRect(rx, ry + rh * 0.2, rw, rh * 0.8);
    // pencil outline: sides, base, and the arched crown
    this._pencilSeg(g, rnd, rx, ry + rh * 0.24, rx, by, 1.5, WB_SKETCH, 0.5, 1.6);
    this._pencilSeg(g, rnd, rx + rw, ry + rh * 0.24, rx + rw, by, 1.5, WB_SKETCH, 0.5, 1.6);
    this._pencilSeg(g, rnd, rx - 4, by, rx + rw + 4, by, 1.6, WB_SKETCH, 0.5, 1.4);
    const arc = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i / 14) * Math.PI;
      arc.push({
        x: rx + rw / 2 + Math.cos(a) * rw * 0.5,
        y: ry + rh * 0.24 + Math.sin(a) * rh * 0.22 + (rnd() - 0.5) * 1.6,
      });
    }
    this._drawPath(g, arc, 1.5, WB_SKETCH, 0.5);

    // the speaker cloth: hatched arch with a sunburst of spokes
    const scx = rx + rw / 2;
    const scy = ry + rh * 0.34;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 1.1 + (i / 4) * Math.PI * 0.8;
      this._pencilSeg(g, rnd, scx, scy + rh * 0.12, scx + Math.cos(a) * rw * 0.3, scy + Math.sin(a) * rh * 0.3, 1.1, WB_SKETCH, 0.3, 1);
    }
    // the dial — dark, dead
    const dy2 = ry + rh * 0.72;
    this._pencilCircle(g, rnd, scx, dy2, rw * 0.09, 1.4, WB_SKETCH, 0.5, 16, 1);
    g.fillStyle(0x0a0b0d, 1);
    g.fillCircle(scx, dy2, rw * 0.075);
    this._pencilSeg(g, rnd, scx, dy2, scx + rw * 0.05, dy2 - rw * 0.04, 1.2, WB_SKETCH, 0.45, 0.5);
    // two knobs
    for (const t of [0.2, 0.8]) {
      this._pencilCircle(g, rnd, rx + rw * t, dy2, rw * 0.045, 1.2, WB_SKETCH, 0.45, 10, 0.7);
    }
    // the back panel leaning against the cabinet, tubes exposed: a few
    // pencil valves peeking from the open back
    for (let i = 0; i < 3; i++) {
      const vx = rx + rw + 16 + i * 14;
      this._pencilSeg(g, rnd, vx, by, vx, by - 16 - i * 4, 1.2, WB_SKETCH, 0.35, 0.8);
      this._pencilCircle(g, rnd, vx, by - 20 - i * 4, 4, 1.1, WB_SKETCH, 0.35, 10, 0.6);
    }
  }

  // the schematic sheet with the five resistors in a series line
  _drawSchematic(W, H) {
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(7557);
    const by = this._benchY;

    const sw = Math.min(W * 0.46, 640);
    const sh = Math.min(H * 0.26, 220);
    const sx = W * 0.48;
    const sy = by + (H - by) * 0.5 - sh / 2;

    // the sheet: pale paper, slightly askew, curled corner
    const sheet = this.add.container(sx + sw / 2, sy + sh / 2).setDepth(-4).setAngle(-1.4);
    const pg = this.add.graphics();
    pg.fillStyle(0x000000, 0.35);
    pg.fillRect(-sw / 2 + 5, -sh / 2 + 7, sw, sh);
    pg.fillStyle(0xd9cfb4, 0.16);
    pg.fillRect(-sw / 2, -sh / 2, sw, sh);
    this._pencilRect(pg, rnd, -sw / 2, -sh / 2, sw, sh, 1.3, WB_SKETCH, 0.45, 1.8);
    // fold crease
    this._pencilSeg(pg, rnd, 0, -sh / 2 + 8, 0, sh / 2 - 8, 1, WB_SKETCH, 0.12, 2);
    // curled corner
    this._pencilSeg(pg, rnd, sw / 2 - 26, sh / 2, sw / 2, sh / 2 - 22, 1.1, WB_SKETCH, 0.3, 1);

    // ── the series circuit: wire in, five parts, wire out ──
    const wireY = 0;
    const margin = sw * 0.06;
    const usable = sw - margin * 2;
    const n = WB_RESISTORS.length;
    const bodyW = Math.min(usable / (n + 1.4), 86);
    const gap = (usable - n * bodyW) / (n + 1);
    const bodyH = Math.max(16, bodyW * 0.3);

    // terminals at both ends of the run
    this._pencilCircle(pg, rnd, -sw / 2 + margin * 0.55, wireY, 3.4, 1.2, WB_SKETCH, 0.5, 10, 0.6);
    this._pencilCircle(pg, rnd, sw / 2 - margin * 0.55, wireY, 3.4, 1.2, WB_SKETCH, 0.5, 10, 0.6);

    let x = -sw / 2 + margin;
    for (let i = 0; i < n; i++) {
      // lead wire into the part
      this._pencilSeg(pg, rnd, x, wireY, x + gap, wireY, 1.3, WB_SKETCH, 0.5, 0.8);
      x += gap;
      this._drawResistor(pg, rnd, x, wireY - bodyH / 2, bodyW, bodyH, WB_RESISTORS[i]);
      x += bodyW;
    }
    // lead wire out
    this._pencilSeg(pg, rnd, x, wireY, sw / 2 - margin * 0.4, wireY, 1.3, WB_SKETCH, 0.5, 0.8);

    // pencil marginalia: an arrow tracing the flow, left to right
    const ay = sh * 0.32;
    this._pencilSeg(pg, rnd, -sw * 0.18, ay, sw * 0.18, ay, 1.1, WB_SKETCH, 0.3, 1.4);
    this._pencilSeg(pg, rnd, sw * 0.18, ay, sw * 0.13, ay - 4, 1.1, WB_SKETCH, 0.3, 0.8);
    this._pencilSeg(pg, rnd, sw * 0.18, ay, sw * 0.13, ay + 4, 1.1, WB_SKETCH, 0.3, 0.8);

    sheet.add(pg);

    // a pencil stub resting on the sheet's corner
    const stub = this.add.graphics().setDepth(-3);
    const px = sx + sw * 0.88;
    const py2 = sy + sh * 1.02;
    this._pencilSeg(stub, rnd, px, py2, px + 44, py2 - 7, 2.2, WB_SKETCH, 0.5, 1);
    this._pencilSeg(stub, rnd, px + 44, py2 - 7, px + 52, py2 - 8.5, 1.4, WB_SKETCH, 0.55, 0.5);
  }

  // one resistor: beige body, two digit bands, a breath of space, gold band
  _drawResistor(g, rnd, x, y, w, h, digits) {
    // body — pale ceramic, the one bright object on the sheet
    g.fillStyle(0xcdb98e, 0.92);
    g.fillRoundedRect(x, y, w, h, h * 0.45);
    // shading along the underside
    g.fillStyle(0x000000, 0.18);
    g.fillRoundedRect(x, y + h * 0.55, w, h * 0.45, { tl: 0, tr: 0, bl: h * 0.45, br: h * 0.45 });
    this._pencilRect(g, rnd, x, y, w, h, 1.2, WB_SKETCH, 0.35, 1);

    // bands: two digits toward the left, gold alone at the right end —
    // the gap tells the reader which way round to hold it
    const bandW = w * 0.11;
    const positions = [x + w * 0.18, x + w * 0.36, x + w * 0.82];
    const colors = [WB_BAND[digits[0]], WB_BAND[digits[1]], WB_GOLD];
    for (let i = 0; i < 3; i++) {
      g.fillStyle(colors[i], 1);
      g.fillRect(positions[i] - bandW / 2, y + 1, bandW, h - 2);
      // a hairline so even the black band reads against the body
      g.lineStyle(1, 0x000000, 0.35);
      g.strokeRect(positions[i] - bandW / 2, y + 1, bandW, h - 2);
    }
    // glaze highlight across the top
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(x + 3, y + 2, w - 6, h * 0.22, h * 0.2);
  }

  // the soldering iron in its stand, a thread of smoke still rising
  _drawIron(W, H) {
    const g = this.add.graphics().setDepth(-5);
    const rnd = this._rng(2244);
    const by = this._benchY;
    const ix = W * 0.4;
    const iy = by + (H - by) * 0.16;

    // the stand: a sketched spring cradle on a base
    this._pencilSeg(g, rnd, ix - 26, iy + 14, ix + 30, iy + 14, 1.4, WB_SKETCH, 0.45, 1);
    for (let i = 0; i < 4; i++) {
      this._pencilCircle(g, rnd, ix - 4 + i * 8, iy + 2, 7, 1, WB_SKETCH, 0.3, 10, 0.8);
    }
    // the iron: handle, shaft, tip — angled up out of the cradle
    this._pencilSeg(g, rnd, ix - 30, iy + 6, ix - 6, iy - 2, 2.4, WB_SKETCH, 0.5, 0.8);
    this._pencilSeg(g, rnd, ix - 6, iy - 2, ix + 26, iy - 8, 1.4, WB_SKETCH, 0.5, 0.8);
    this._pencilSeg(g, rnd, ix + 26, iy - 8, ix + 34, iy - 10, 1.1, WB_SKETCH, 0.55, 0.5);
    // its cable trailing off the bench edge
    const cable = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      cable.push({
        x: ix - 30 - t * W * 0.05,
        y: iy + 6 + Math.sin(t * Math.PI) * 10 + t * (H - iy) * 0.4,
      });
    }
    this._drawPath(g, cable, 1.2, WB_SKETCH, 0.3);

    // smoke: two slow puffs off the tip
    for (let i = 0; i < 2; i++) {
      const puff = this.add
        .circle(ix + 34, iy - 14, 3 + i, WB_SKETCH, 0.08)
        .setDepth(-5);
      const dur = 5200 + i * 1800;
      this.tweens.add({
        targets: puff,
        y: iy - 60 - i * 14,
        x: ix + 40 + i * 10,
        scale: 2.4,
        alpha: 0,
        duration: dur,
        delay: i * (dur / 2),
        repeat: -1,
        onRepeat: () => {
          puff.setPosition(ix + 34, iy - 14);
          puff.setScale(1);
          puff.setAlpha(0.08);
        },
      });
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "THE REPAIR STOPPED MID-SOLDER.", {
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
    const rnd = this._rng(9229);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.1 + rnd() * W * 0.8;
      const dy = H * 0.12 + rnd() * H * 0.6;
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
          dot.y = H * 0.12 + rnd() * H * 0.5;
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
