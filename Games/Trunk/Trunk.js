// ─────────────────────────────────────────────────────────────────────────────
// Level — "TRUNK"  ·  code: SEXTANT  ·  chamber XIII  ·  read the fences
//
// Drawn in the game's pencil-sketch idiom: a ship cabin's corner, and in the
// middle of it a captain's steamer trunk — wooden slats, brass corners, two
// leather straps, a heavy hanging padlock, faded port stickers. Beside it a
// coil of rope; on a crate, a lantern burns (the single living colour).
//
// Scratched into the front of the lid, small and crooked, runs a line of
// seven PIGPEN glyphs (the masonic cipher — standard chart: A–I grid,
// J–R dotted grid, S–V in the X, W–Z dotted X):
//
//   ∨ · □ · >̇ · > · ⌐ · □̇ · >   →   S E X T A N T
//
// Nothing names the cipher, nothing on screen decodes it. The stickers are
// flavour, the lock never opens — the access code is the proof.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, same scene contract as the other levels:
// GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const TR_SKETCH = 0xd8d2c4; // the pencil itself
const TR_WARM = 0xe6b458; // the lantern — the single living colour
const TR_WORD = "SEXTANT";

class TrunkScene extends Phaser.Scene {
  constructor() {
    super({ key: "Trunk" });
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

  // ── the pigpen glyph, scratched (standard chart: grids then X shapes) ──────

  _pigpen(g, rnd, ch, x, y, s, width, color, alpha) {
    const idx = ch.charCodeAt(0) - 65;
    const h = s / 2;
    const scratch = (x1, y1, x2, y2) =>
      this._pencilSeg(g, rnd, x1, y1, x2, y2, width, color, alpha, 0.9);

    if (idx < 18) {
      // A–I (plain) and J–R (dotted): the tic-tac-toe cell walls
      const dot = idx >= 9;
      const i = dot ? idx - 9 : idx;
      const r = Math.floor(i / 3);
      const c = i % 3;
      if (c > 0) scratch(x - h, y - h, x - h, y + h); // left wall
      if (c < 2) scratch(x + h, y - h, x + h, y + h); // right wall
      if (r > 0) scratch(x - h, y - h, x + h, y - h); // top wall
      if (r < 2) scratch(x - h, y + h, x + h, y + h); // bottom wall
      if (dot) {
        g.fillStyle(color, alpha);
        g.fillCircle(x, y, Math.max(1.4, s * 0.09));
      }
    } else {
      // S–V (plain X) and W–Z (dotted X): top, left, right, bottom wedges
      const dot = idx >= 22;
      const i = dot ? idx - 22 : idx - 18;
      if (i === 0) {
        scratch(x - h, y - h, x, y + h); // ∨
        scratch(x, y + h, x + h, y - h);
      } else if (i === 1) {
        scratch(x - h, y - h, x + h, y); // >
        scratch(x + h, y, x - h, y + h);
      } else if (i === 2) {
        scratch(x + h, y - h, x - h, y); // <
        scratch(x - h, y, x + h, y + h);
      } else {
        scratch(x - h, y + h, x, y - h); // ∧
        scratch(x, y - h, x + h, y + h);
      }
      if (dot) {
        // the dot sits in the compartment's opening, away from the apex
        const dx = i === 1 ? -h * 0.35 : i === 2 ? h * 0.35 : 0;
        const dy = i === 0 ? -h * 0.35 : i === 3 ? h * 0.35 : 0;
        g.fillStyle(color, alpha);
        g.fillCircle(x + dx, y + dy, Math.max(1.4, s * 0.09));
      }
    }
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._floorY = H * 0.78;

    this._drawRoom(W, H);
    this._drawTrunk(W, H);
    this._drawRope(W, H);
    this._drawCrateAndLantern(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  // the cabin corner: planked wall, a porthole, the floor
  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x101210, 0x121411, 0x08090a, 0x090b0a, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(4110);
    const floorY = this._floorY;

    // horizontal wall planking
    for (let i = 1; i < 6; i++) {
      const y = (floorY * i) / 6;
      this._pencilSeg(g, rnd, 0, y, W, y + (rnd() - 0.5) * 8, 1, TR_SKETCH, 0.06, 2.4);
    }
    // the floor, boards fanning toward the viewer
    g.fillStyle(0x0b0c0d, 0.85);
    g.fillRect(0, floorY, W, H - floorY);
    this._pencilSeg(g, rnd, 0, floorY, W, floorY, 1.4, TR_SKETCH, 0.25, 2);
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      g.lineStyle(1, TR_SKETCH, 0.05);
      g.lineBetween(W * t, floorY, W * 0.5 + (t - 0.5) * W * 1.35, H);
    }

    // a porthole high on the left — brass ring, night sea beyond
    const px = W * 0.14;
    const py = H * 0.24;
    const pr = Math.min(W, H) * 0.055;
    g.fillStyle(0x0a111a, 1);
    g.fillCircle(px, py, pr);
    this._pencilCircle(g, rnd, px, py, pr, 1.8, TR_SKETCH, 0.5, 20, 1.4);
    this._pencilCircle(g, rnd, px, py, pr * 1.18, 1.2, TR_SKETCH, 0.3, 20, 1.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      g.fillStyle(TR_SKETCH, 0.35);
      g.fillCircle(px + Math.cos(a) * pr * 1.18, py + Math.sin(a) * pr * 1.18, 1.6);
    }
    // the sea line through the glass, tilting as the ship leans
    const sea = this.add.graphics().setDepth(-13);
    const seaMask = this.make.graphics({ add: false });
    seaMask.fillCircle(px, py, pr - 2);
    sea.setMask(seaMask.createGeometryMask());
    sea.lineStyle(1.2, TR_SKETCH, 0.25);
    sea.lineBetween(px - pr, py + pr * 0.25, px + pr, py + pr * 0.05);
    sea.lineStyle(1, TR_SKETCH, 0.12);
    sea.lineBetween(px - pr, py + pr * 0.5, px + pr, py + pr * 0.34);
    this.tweens.add({
      targets: sea,
      angle: 1.6,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    // stray construction scribbles
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = rnd() * floorY * 0.5;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 26, y + (rnd() - 0.5) * 8, 1, TR_SKETCH, 0.04, 1.6);
    }
  }

  _drawTrunk(W, H) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(7337);

    const tw = Math.min(W * 0.44, 600);
    const lidH = tw * 0.16; // the lid band
    const bodyH = tw * 0.3; // the body below the seam
    const tx = W / 2 - tw / 2;
    const bodyBot = this._floorY + (H - this._floorY) * 0.18;
    const seamY = bodyBot - bodyH;
    const lidTop = seamY - lidH;
    this._trunk = { tx, tw, lidTop, seamY, bodyBot, lidH };

    // shadow pooling under it
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(W / 2, bodyBot + 8, tw * 1.06, lidH * 0.6);

    // lid: gently domed top
    g.fillStyle(0x191512, 0.97);
    g.beginPath();
    g.moveTo(tx - 6, seamY);
    g.lineTo(tx + 2, lidTop + 6);
    g.lineTo(tx + tw * 0.5, lidTop - lidH * 0.18);
    g.lineTo(tx + tw - 2, lidTop + 6);
    g.lineTo(tx + tw + 6, seamY);
    g.closePath();
    g.fillPath();
    g.fillStyle(TR_SKETCH, 0.03);
    g.fillRect(tx, lidTop, tw, seamY - lidTop);
    // body
    g.fillStyle(0x161310, 0.97);
    g.fillRect(tx, seamY, tw, bodyH);
    g.fillStyle(TR_SKETCH, 0.025);
    g.fillRect(tx, seamY, tw, bodyH);

    // pencil edges: lid dome, seam, body
    this._pencilSeg(g, rnd, tx - 6, seamY, tx + 2, lidTop + 6, 1.5, TR_SKETCH, 0.5, 1.4);
    this._pencilSeg(g, rnd, tx + 2, lidTop + 6, tx + tw * 0.5, lidTop - lidH * 0.18, 1.5, TR_SKETCH, 0.5, 1.8);
    this._pencilSeg(g, rnd, tx + tw * 0.5, lidTop - lidH * 0.18, tx + tw - 2, lidTop + 6, 1.5, TR_SKETCH, 0.5, 1.8);
    this._pencilSeg(g, rnd, tx + tw - 2, lidTop + 6, tx + tw + 6, seamY, 1.5, TR_SKETCH, 0.5, 1.4);
    this._pencilSeg(g, rnd, tx - 6, seamY, tx + tw + 6, seamY, 1.8, TR_SKETCH, 0.55, 1.6);
    this._pencilSeg(g, rnd, tx - 4, seamY + 4, tx + tw + 4, seamY + 4, 1, 0x050607, 0.8, 1);
    this._pencilRect(g, rnd, tx, seamY, tw, bodyH, 1.5, TR_SKETCH, 0.45, 1.8);

    // wooden slats down the body
    for (let i = 1; i < 6; i++) {
      const x = tx + (tw * i) / 6;
      this._pencilSeg(g, rnd, x, seamY + 3, x, bodyBot - 2, 1, TR_SKETCH, 0.14, 1.2);
    }
    // two leather straps over lid and body, with buckles at the seam
    for (const t of [0.2, 0.8]) {
      const x = tx + tw * t;
      g.fillStyle(0x0d0b09, 0.9);
      g.fillRect(x - 9, lidTop - lidH * 0.12, 18, bodyBot - lidTop + lidH * 0.1);
      this._pencilSeg(g, rnd, x - 9, lidTop - 2, x - 9, bodyBot, 1.2, TR_SKETCH, 0.35, 1.2);
      this._pencilSeg(g, rnd, x + 9, lidTop - 2, x + 9, bodyBot, 1.2, TR_SKETCH, 0.35, 1.2);
      // buckle
      this._pencilRect(g, rnd, x - 7, seamY + 8, 14, 12, 1.3, TR_SKETCH, 0.5, 0.8);
      g.fillStyle(TR_SKETCH, 0.3);
      g.fillRect(x - 1, seamY + 10, 2, 8);
    }
    // brass corner caps
    const cap = (cx, cy, dx, dy) => {
      this._pencilSeg(g, rnd, cx, cy + dy * 16, cx, cy, 1.6, TR_SKETCH, 0.55, 0.8);
      this._pencilSeg(g, rnd, cx, cy, cx + dx * 16, cy, 1.6, TR_SKETCH, 0.55, 0.8);
      this._pencilSeg(g, rnd, cx + dx * 3, cy + dy * 12, cx + dx * 12, cy + dy * 3, 1.1, TR_SKETCH, 0.35, 0.8);
    };
    cap(tx + 2, bodyBot - 2, 1, -1);
    cap(tx + tw - 2, bodyBot - 2, -1, -1);
    cap(tx + 2, seamY + 6, 1, 1);
    cap(tx + tw - 2, seamY + 6, -1, 1);

    // the hasp and hanging padlock, centre of the seam
    const hx = tx + tw / 2;
    g.fillStyle(0x0d0e10, 1);
    g.fillRect(hx - 12, seamY - 10, 24, 26);
    this._pencilRect(g, rnd, hx - 12, seamY - 10, 24, 26, 1.4, TR_SKETCH, 0.55, 1);
    // shackle + lock body
    this._pencilCircle(g, rnd, hx, seamY + 26, 9, 1.8, TR_SKETCH, 0.5, 12, 0.8);
    g.fillStyle(0x101113, 1);
    g.fillRoundedRect(hx - 11, seamY + 28, 22, 24, 4);
    this._pencilRect(g, rnd, hx - 11, seamY + 28, 22, 24, 1.5, TR_SKETCH, 0.55, 1);
    g.fillStyle(0x000000, 0.8);
    g.fillCircle(hx, seamY + 39, 2.4);
    g.fillRect(hx - 1, seamY + 39, 2, 6);

    // faded port stickers on the body — flavour, not clues
    const sticker = (t, label, tilt, wS) => {
      const x = tx + tw * t;
      const y = seamY + bodyH * (0.32 + (t * 7 % 1) * 0.3);
      const cont = this.add.container(x, y).setDepth(-5).setAngle(tilt);
      const sg = this.add.graphics();
      sg.fillStyle(TR_SKETCH, 0.07);
      sg.fillRect(-wS / 2, -12, wS, 24);
      const rndS = this._rng(Math.round(x));
      this._pencilRect(sg, rndS, -wS / 2, -12, wS, 24, 1, TR_SKETCH, 0.3, 1);
      cont.add(sg);
      cont.add(
        this.add
          .text(0, 0, label, {
            fontFamily: '"Special Elite", monospace',
            fontSize: "10px",
            color: "#9a9179",
          })
          .setOrigin(0.5)
          .setAlpha(0.55),
      );
    };
    sticker(0.34, "MARSEILLE", -4, 76);
    sticker(0.55, "ADEN", 3, 52);
    sticker(0.68, "LISBOA", -2, 60);

    // ── the scratched line of pigpen glyphs, across the front of the lid ──
    const sg2 = this.add.graphics().setDepth(-4);
    const rndP = this._rng(9119);
    const gs = Math.min(tw * 0.052, 30); // glyph size
    const gap = gs * 1.75;
    const total = (TR_WORD.length - 1) * gap;
    const gy = lidTop + (seamY - lidTop) * 0.52;
    for (let i = 0; i < TR_WORD.length; i++) {
      const gx = tx + tw / 2 - total / 2 + i * gap;
      const drift = (rndP() - 0.5) * 4;
      this._pigpen(sg2, rndP, TR_WORD[i], gx, gy + drift, gs, 1.4, TR_SKETCH, 0.6);
      // stone dust settled under the scratches
      sg2.fillStyle(TR_SKETCH, 0.08);
      sg2.fillEllipse(gx, gy + drift + gs * 0.75, gs * 0.8, 2);
    }
  }

  // a coil of rope resting against the trunk's left side
  _drawRope(W, H) {
    const g = this.add.graphics().setDepth(-5);
    const rnd = this._rng(2662);
    const t = this._trunk;
    const cx = t.tx - Math.min(W * 0.07, 90);
    const cy = this._floorY + (H - this._floorY) * 0.34;
    for (let i = 0; i < 4; i++) {
      this._pencilCircle(g, rnd, cx, cy, 34 - i * 7, 1.6, TR_SKETCH, 0.35 - i * 0.05, 18, 2.2);
    }
    // the loose end trailing off
    this._pencilSeg(g, rnd, cx + 26, cy + 14, cx + 74, cy + 22, 1.4, TR_SKETCH, 0.3, 2.2);
    this._pencilSeg(g, rnd, cx + 74, cy + 22, cx + 96, cy + 18, 1.2, TR_SKETCH, 0.2, 1.6);
  }

  // a crate to the right with the lantern on it — the one living colour
  _drawCrateAndLantern(W, H) {
    const g = this.add.graphics().setDepth(-5);
    const rnd = this._rng(5885);
    const t = this._trunk;
    const cw = Math.min(W * 0.09, 120);
    const cx = t.tx + t.tw + Math.min(W * 0.06, 80);
    const topY = this._floorY + (H - this._floorY) * 0.08;

    // the crate
    this._pencilRect(g, rnd, cx - cw / 2, topY, cw, cw * 0.72, 1.4, TR_SKETCH, 0.4, 1.6);
    this._pencilSeg(g, rnd, cx - cw / 2 + 4, topY + cw * 0.24, cx + cw / 2 - 4, topY + cw * 0.24, 1, TR_SKETCH, 0.2, 1.2);
    this._pencilSeg(g, rnd, cx - cw / 2, topY, cx + cw / 2, topY + cw * 0.72, 1, TR_SKETCH, 0.12, 1.6);

    // the lantern: base, glass cage, hoop handle
    const lx = cx;
    const ly = topY;
    this._pencilSeg(g, rnd, lx - 10, ly, lx + 10, ly, 1.4, TR_SKETCH, 0.5, 0.6);
    this._pencilSeg(g, rnd, lx - 8, ly, lx - 6, ly - 26, 1.2, TR_SKETCH, 0.45, 0.8);
    this._pencilSeg(g, rnd, lx + 8, ly, lx + 6, ly - 26, 1.2, TR_SKETCH, 0.45, 0.8);
    this._pencilSeg(g, rnd, lx - 7, ly - 26, lx + 7, ly - 26, 1.3, TR_SKETCH, 0.5, 0.6);
    // hoop
    this._pencilCircle(g, rnd, lx, ly - 34, 8, 1.2, TR_SKETCH, 0.4, 12, 0.8);
    // the flame and its breathing glow
    const glow = this.add.circle(lx, ly - 13, 30, TR_WARM, 0.1).setDepth(-5);
    const flame = this.add.circle(lx, ly - 12, 3.4, TR_WARM, 0.85).setDepth(-4);
    this.tweens.add({
      targets: glow,
      alpha: 0.5,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: flame,
      scaleY: 1.3,
      scaleX: 0.88,
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    // warm wash brushing the trunk's right flank
    this.add
      .circle(t.tx + t.tw * 0.92, t.seamY, Math.min(W, H) * 0.11, TR_WARM, 0.03)
      .setDepth(-5);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "PACKED FOR A VOYAGE THAT NEVER SAILED.", {
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
    const rnd = this._rng(3773);
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
    this._trunk = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
