// ─────────────────────────────────────────────────────────────────────────────
// Level — "SAFEDIAL"  ·  code: SECRET  ·  chamber XVI  ·  listen closely
//
// Drawn in the game's pencil-sketch idiom: a close-up on an old, ornate
// safe dial. The player can rotate the dial left or right.
//
// The puzzle is entirely auditory. The combination is the word SECRET, with
// each letter corresponding to its number in the alphabet (A=1, B=2...).
// The sequence must be entered by alternating directions:
//
//   R → 19 (S) · L → 5 (E) · R → 3 (C) · L → 18 (R) · R → 5 (E) · L → 20 (T)
//
// A soft ticking sound accompanies the rotation. When a correct number in
// the sequence is hit IN THE CORRECT DIRECTION, a sharp, satisfying CLICK
// is heard, and the internal tumbler is considered set. If the player
// rotates the wrong way or overshoots, the tumblers reset.
//
// After the final correct number, a heavy CLUNK sound plays, and the
// puzzle is solved. The aesthetic is dark, focused, and minimalist.
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_SKETCH = 0xd8d2c4; // the pencil itself
const SAFE_NUMBERS = 40; // Dial has numbers 0-39

class SafeDialScene extends Phaser.Scene {
  constructor() {
    super({ key: "SafeDial" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    // All sounds are generated procedurally, no assets needed
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

    // The puzzle's core logic
    const cfg = (window.GAME_LEVELS || []).find((l) => l.key === "SafeDial");
    const answer = cfg && cfg.code ? cfg.code : "SECRET";
    this._combination = answer
      .split("")
      .map((char) => char.charCodeAt(0) - "A".charCodeAt(0) + 1);
    this._comboDirs = ["R", "L", "R", "L", "R", "L"]; // Alternating directions

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

  // ── Pencil Sketch Primitives (consistent with other levels) ────────────────

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
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1, y1, x2, y2, mag),
      width,
      color,
      alpha,
    );
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1 + 1.2, y1 + 1, x2 + 1.2, y2 + 1, mag),
      width * 0.6,
      color,
      alpha * 0.35,
    );
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 24, mag = 1.5) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * mag;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _pencilRect(g, rnd, x, y, w, h, width, color, alpha, mag = 2) {
    const o = 4; // corner overshoot
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(
      g,
      rnd,
      x + w,
      y - o,
      x + w,
      y + h + o,
      width,
      color,
      alpha,
      mag,
    );
    this._pencilSeg(
      g,
      rnd,
      x + w + o,
      y + h,
      x - o,
      y + h,
      width,
      color,
      alpha,
      mag,
    );
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  // Filled solid polygon (used for the 3D cube faces of the safe)
  _fillPoly(g, pts, color, alpha) {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
  }

  // Hand-drawn closed polygon outline in the pencil idiom
  _pencilPoly(g, rnd, pts, width, color, alpha, mag = 2) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      this._pencilSeg(g, rnd, a.x, a.y, b.x, b.y, width, color, alpha, mag);
    }
  }

  // Parallel pencil hatching that fills a quad from edge A→B toward C→D,
  // used to shade the receding cube faces so they read as 3D.
  _hatchQuad(g, rnd, a, b, c, d, lines, width, color, alpha) {
    for (let i = 1; i < lines; i++) {
      const t = i / lines;
      const p1 = { x: a.x + (d.x - a.x) * t, y: a.y + (d.y - a.y) * t };
      const p2 = { x: b.x + (c.x - b.x) * t, y: b.y + (c.y - b.y) * t };
      this._pencilSeg(g, rnd, p1.x, p1.y, p2.x, p2.y, width, color, alpha, 1.2);
    }
  }

  // A raised bolt stud — small double circle with a slit, sells "heavy metal"
  _bolt(g, rnd, px, py, r) {
    this._pencilCircle(g, rnd, px, py, r, 1.6, SAFE_SKETCH, 0.55, 12, 0.8);
    this._pencilCircle(g, rnd, px, py, r * 0.55, 1, SAFE_SKETCH, 0.35, 10, 0.6);
    this._pencilSeg(
      g,
      rnd,
      px - r * 0.5,
      py,
      px + r * 0.5,
      py,
      1,
      SAFE_SKETCH,
      0.3,
      0.6,
    );
  }

  // ── Scene Construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._solved = false;
    this._comboStep = 0;
    this._lastAngle = 0;
    this._currentNumber = 0;
    this._lastTickNum = -1;
    this._currentDirection = null;

    this._drawBackground(W, H);
    this._drawSafe(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._setupDrag();
  }

  _drawBackground(W, H) {
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(0x1a1c21, 0x15171b, 0x0c0e12, 0x0a0b0e, 1);
    g.fillRect(0, 0, W, H);

    // Faint texture
    const rnd = this._rng(1616);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const r = 10 + rnd() * 30;
      g.fillStyle(0xffffff, 0.01 + rnd() * 0.015);
      g.fillCircle(x, y, r);
    }
  }

  _drawSafe(W, H) {
    const cx = W / 2;
    const cy = H / 2;
    const dialRadius = Math.min(W, H) * 0.175;
    this._dialRadius = dialRadius;
    const g = this.add.graphics().setDepth(0);
    const rnd = this._rng(2077);

    // ── Cube geometry ──
    // The safe is drawn as a box seen from slightly front-left-above: a flat
    // front face (where the dial lives) plus a receding top and right face.
    // The dial stays centred on (cx, cy) so the drag hit-area is unchanged.
    const fw = dialRadius * 2.9; // front face width
    const fh = dialRadius * 3.5; // front face height
    const fx = cx - fw / 2;
    const fy = cy - fh / 2;

    // depth vector — receding up and to the right
    const dep = dialRadius * 0.55;
    const dvx = dep;
    const dvy = -dep * 0.62;

    // front face corners
    const TL = { x: fx, y: fy };
    const TR = { x: fx + fw, y: fy };
    const BR = { x: fx + fw, y: fy + fh };
    const BL = { x: fx, y: fy + fh };
    // back (offset) corners for the receding faces
    const TLb = { x: TL.x + dvx, y: TL.y + dvy };
    const TRb = { x: TR.x + dvx, y: TR.y + dvy };
    const BRb = { x: BR.x + dvx, y: BR.y + dvy };

    // ── Ground shadow ──
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(cx + dvx * 0.4, fy + fh + dep * 0.35, fw * 1.05, dep * 0.9);

    // ── Right side face (darkest — light comes from the front-left) ──
    this._fillPoly(g, [TR, BR, BRb, TRb], 0x0d0f13, 1);
    this._hatchQuad(g, rnd, TR, TRb, BRb, BR, 6, 1, SAFE_SKETCH, 0.06);
    this._pencilPoly(g, rnd, [TR, BR, BRb, TRb], 1.6, SAFE_SKETCH, 0.3, 1.5);

    // ── Top face (catches the light — lightest) ──
    this._fillPoly(g, [TL, TR, TRb, TLb], 0x2a2e36, 1);
    this._hatchQuad(g, rnd, TL, TLb, TRb, TR, 5, 1, SAFE_SKETCH, 0.08);
    this._pencilPoly(g, rnd, [TL, TR, TRb, TLb], 1.6, SAFE_SKETCH, 0.35, 1.5);

    // rivet studs running along the two visible top seams to sell the edges
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      this._bolt(
        g,
        rnd,
        TL.x + (TR.x - TL.x) * t,
        TL.y + (TR.y - TL.y) * t + 6,
        3,
      );
    }
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      this._bolt(
        g,
        rnd,
        TR.x + (BR.x - TR.x) * t - 6,
        TR.y + (BR.y - TR.y) * t,
        3,
      );
    }

    // ── Front face (a plain rectangle → use a gradient for lit metal) ──
    g.fillGradientStyle(0x272b33, 0x272b33, 0x121519, 0x14171c, 1);
    g.fillRect(fx, fy, fw, fh);
    this._pencilPoly(g, rnd, [TL, TR, BR, BL], 2.5, SAFE_SKETCH, 0.5, 2.5);

    // Recessed vault door within the front face
    const dm = dialRadius * 0.3; // door margin
    const doorX = fx + dm;
    const doorY = fy + dm;
    const doorW = fw - dm * 2;
    const doorH = fh - dm * 2;
    // recess shadow (offset up-left) then the door plate
    g.fillStyle(0x0a0c0f, 0.9);
    g.fillRect(doorX - 5, doorY - 5, doorW, doorH);
    g.fillGradientStyle(0x22262d, 0x1d2127, 0x1a1e24, 0x15181d, 1);
    g.fillRect(doorX, doorY, doorW, doorH);
    this._pencilRect(g, rnd, doorX, doorY, doorW, doorH, 2, SAFE_SKETCH, 0.45, 2);
    this._pencilRect(
      g,
      rnd,
      doorX + 10,
      doorY + 10,
      doorW - 20,
      doorH - 20,
      1.2,
      SAFE_SKETCH,
      0.22,
      1.8,
    );

    // Corner bolts on the door
    const cb = 20;
    this._bolt(g, rnd, doorX + cb, doorY + cb, 7);
    this._bolt(g, rnd, doorX + doorW - cb, doorY + cb, 7);
    this._bolt(g, rnd, doorX + cb, doorY + doorH - cb, 7);
    this._bolt(g, rnd, doorX + doorW - cb, doorY + doorH - cb, 7);

    // Maker's emblem near the top of the door (decorative, not a clue)
    const emY = doorY + dialRadius * 0.42;
    this._pencilCircle(g, rnd, cx, emY, dialRadius * 0.16, 1.4, SAFE_SKETCH, 0.3, 20, 1);
    this._pencilCircle(g, rnd, cx, emY, dialRadius * 0.1, 1, SAFE_SKETCH, 0.22, 16, 0.8);

    // Hinges on the left edge (the door swings on this side)
    const hinge = (hy) => {
      this._pencilRect(g, rnd, fx - 6, hy, 16, 34, 1.6, SAFE_SKETCH, 0.4, 1.5);
      this._bolt(g, rnd, fx + 2, hy + 8, 3);
      this._bolt(g, rnd, fx + 2, hy + 26, 3);
    };
    hinge(fy + fh * 0.22);
    hinge(fy + fh * 0.68);

    // ── Locking bolts along the right door seam (retract on solve) ──
    this._boltGfx = this.add.graphics().setDepth(2);
    const bx = doorX + doorW;
    const bl = dialRadius * 0.26; // bolt length
    const bh = dialRadius * 0.11; // bolt height
    [0.32, 0.5, 0.68].forEach((t) => {
      const by = doorY + doorH * t - bh / 2;
      this._boltGfx.fillStyle(0x1a1e24, 1);
      this._boltGfx.fillRect(bx - 4, by, bl, bh);
      this._pencilRect(
        this._boltGfx,
        rnd,
        bx - 4,
        by,
        bl,
        bh,
        1.4,
        SAFE_SKETCH,
        0.5,
        1,
      );
    });

    // ── Door seam glow (revealed on solve) ──
    this._doorSeam = this.add.graphics().setDepth(4).setAlpha(0);
    this._doorSeam.lineStyle(3, 0x00ff66, 0.9);
    this._doorSeam.strokeRect(doorX, doorY, doorW, doorH);

    // ── Static outer ring around the dial (mounting collar) ──
    this._pencilCircle(
      g,
      rnd,
      cx,
      cy,
      dialRadius + 30,
      2,
      SAFE_SKETCH,
      0.25,
      40,
      2,
    );
    this._pencilCircle(
      g,
      rnd,
      cx,
      cy,
      dialRadius + 35,
      1.5,
      SAFE_SKETCH,
      0.15,
      40,
      2.5,
    );
    // bolt studs around the collar
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this._bolt(
        g,
        rnd,
        cx + Math.cos(a) * (dialRadius + 33),
        cy + Math.sin(a) * (dialRadius + 33),
        4,
      );
    }

    // Top marker
    this._pencilSeg(
      g,
      rnd,
      cx,
      cy - dialRadius - 5,
      cx,
      cy - dialRadius - 25,
      3,
      0xff6666,
      0.8,
      1,
    );
    this._pencilSeg(
      g,
      rnd,
      cx - 1,
      cy - dialRadius - 5,
      cx - 1,
      cy - dialRadius - 25,
      1.5,
      0xffffff,
      0.4,
      1,
    );

    // Dial container
    this.dial = this.add.container(cx, cy).setDepth(5);
    const dialGfx = this.add.graphics();
    this.dial.add(dialGfx);

    // Solid metal disc so the dial reads as a raised part on the door
    dialGfx.fillGradientStyle(0x2b3038, 0x2b3038, 0x171a1f, 0x14171b, 1);
    dialGfx.fillCircle(0, 0, dialRadius);
    // recessed number channel
    dialGfx.fillStyle(0x0d1015, 0.4);
    dialGfx.fillCircle(0, 0, dialRadius * 0.62);
    // raised central grip hub
    dialGfx.fillGradientStyle(0x343a43, 0x343a43, 0x181b21, 0x15181d, 1);
    dialGfx.fillCircle(0, 0, dialRadius * 0.46);
    // center spindle cap
    dialGfx.fillStyle(0x0a0c0f, 1);
    dialGfx.fillCircle(0, 0, dialRadius * 0.08);

    // Dial body
    this._pencilCircle(
      dialGfx,
      rnd,
      0,
      0,
      dialRadius,
      2.5,
      SAFE_SKETCH,
      0.9,
      40,
      2.5,
    );
    this._pencilCircle(
      dialGfx,
      rnd,
      0,
      0,
      dialRadius - 5,
      1.5,
      SAFE_SKETCH,
      0.5,
      40,
      2,
    );
    this._pencilCircle(
      dialGfx,
      rnd,
      0,
      0,
      dialRadius * 0.6,
      1.5,
      SAFE_SKETCH,
      0.4,
      30,
      2,
    );
    this._pencilCircle(
      dialGfx,
      rnd,
      0,
      0,
      dialRadius * 0.55,
      1,
      SAFE_SKETCH,
      0.3,
      30,
      2,
    );

    // Dial numbers and ticks
    const numStyle = {
      fontFamily: '"Special Elite", monospace',
      fontSize: Math.round(dialRadius * 0.1) + "px",
      color: "#d8d2c4",
    };
    for (let i = 0; i < SAFE_NUMBERS; i++) {
      const angle = (i / SAFE_NUMBERS) * 360 - 90;
      const rad = Phaser.Math.DegToRad(angle);
      const tickRadius = dialRadius - 15;
      const numRadius = dialRadius - 30;

      // Ticks
      const isMajorTick = i % 5 === 0;
      const startR = tickRadius - (isMajorTick ? 5 : 0);
      const endR = tickRadius + (isMajorTick ? 5 : 2);
      dialGfx.lineStyle(
        isMajorTick ? 1.5 : 1,
        SAFE_SKETCH,
        isMajorTick ? 0.7 : 0.4,
      );
      dialGfx.lineBetween(
        Math.cos(rad) * startR,
        Math.sin(rad) * startR,
        Math.cos(rad) * endR,
        Math.sin(rad) * endR,
      );

      // Numbers
      if (isMajorTick) {
        const numX = Math.cos(rad) * numRadius;
        const numY = Math.sin(rad) * numRadius;
        const numText = this.add
          .text(numX, numY, String(i), numStyle)
          .setOrigin(0.5);
        numText.setRotation(rad + Math.PI / 2);
        this.dial.add(numText);
      }
    }

    // Mâner pe cadran
    const handleRadius = dialRadius * 0.75;
    const handleLength = dialRadius * 0.2;
    dialGfx.lineStyle(4, 0x1a1d21, 0.8);
    dialGfx.lineBetween(handleRadius, 0, handleRadius + handleLength, 0);
    this._pencilSeg(
      dialGfx,
      rnd,
      handleRadius,
      0,
      handleRadius + handleLength,
      0,
      2.5,
      SAFE_SKETCH,
      0.7,
      1.5,
    );
    this._pencilCircle(
      dialGfx,
      rnd,
      handleRadius + handleLength + 6,
      0,
      6,
      2,
      SAFE_SKETCH,
      0.6,
      12,
      1,
    );

    // Success indicator (initially hidden)
    this.successIndicator = this.add.graphics().setDepth(6);
    this.successIndicator.fillStyle(0x00ff44, 1);
    this.successIndicator.fillCircle(cx, cy - dialRadius - 15, 5);
    this.successIndicator.setAlpha(0);
  }

  _setupDrag() {
    // _build() runs again on every resize — drop the previous drag handlers
    // or each rebuild would stack another one (dial spinning 2x, double ticks)
    this.input.off("drag");
    this.input.off("dragstart");
    this.dial.setInteractive(
      new Phaser.Geom.Circle(0, 0, this._dialRadius),
      Phaser.Geom.Circle.Contains,
    );
    this.input.setDraggable(this.dial);

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this._solved) return;

      const newAngle = Phaser.Math.RadToDeg(
        Phaser.Math.Angle.Between(
          gameObject.x,
          gameObject.y,
          pointer.x,
          pointer.y,
        ),
      );

      let diff = newAngle - this._lastAngle;
      // Handle angle wrap around
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      if (Math.abs(diff) > 0.1) {
        // Threshold to prevent jitter
        gameObject.angle += diff * 0.35; // Senzație "mai grea"
        this._onDialDrag(diff > 0 ? "R" : "L");
      }

      this._lastAngle = newAngle;
    });

    this.input.on("dragstart", (pointer, gameObject) => {
      this._lastAngle = Phaser.Math.RadToDeg(
        Phaser.Math.Angle.Between(
          gameObject.x,
          gameObject.y,
          pointer.x,
          pointer.y,
        ),
      );
    });
  }

  _onDialDrag(direction) {
    // Normalize angle to be positive
    let currentAngle = ((this.dial.angle % 360) + 360) % 360;
    // Rotating the dial clockwise (angle up) carries the numbers PAST the
    // fixed top marker in decreasing order, so the number under the marker
    // runs opposite to the rotation angle.
    const step = 360 / SAFE_NUMBERS;
    this._currentNumber =
      (SAFE_NUMBERS - (Math.round(currentAngle / step) % SAFE_NUMBERS)) %
      SAFE_NUMBERS;

    if (this._currentNumber !== this._lastTickNum) {
      // A fast drag can jump several numbers in one event — walk every
      // number we passed so the combination can't skip its target.
      if (this._lastTickNum < 0) {
        this._checkCombination(direction, this._currentNumber);
      } else {
        const dirStep = direction === "R" ? -1 : 1; // R (clockwise) counts down
        let n = this._lastTickNum;
        let guard = 0;
        do {
          n = (n + dirStep + SAFE_NUMBERS) % SAFE_NUMBERS;
          this._checkCombination(direction, n);
          guard++;
        } while (n !== this._currentNumber && guard <= SAFE_NUMBERS);
      }
      this._soundTick();
      this._lastTickNum = this._currentNumber;
    }
  }

  _checkCombination(direction, passedNumber) {
    if (this._solved || this._comboStep >= this._combination.length) return;

    const targetNum = this._combination[this._comboStep];
    const targetDir = this._comboDirs[this._comboStep];

    // If we are starting a new step, any direction is fine to start
    if (this._currentDirection === null) {
      this._currentDirection = direction;
    }

    // If direction changes mid-turn, reset combo
    if (direction !== this._currentDirection) {
      this._resetCombo();
      this._currentDirection = direction;
      return;
    }

    // Check for match
    if (passedNumber === targetNum && direction === targetDir) {
      this._soundClick();
      this._comboStep++;
      this._currentDirection = null; // Allow next turn to be in a new direction

      // Check for solved state
      if (this._comboStep === this._combination.length) {
        this._solve();
      }
    }
  }

  _resetCombo() {
    if (this._comboStep > 0) {
      this._soundReset();
      this._comboStep = 0;
    }
  }

  _solve() {
    this._solved = true;
    this.dial.disableInteractive();
    this._soundClunk();
    this.tweens.add({
      targets: this.successIndicator,
      alpha: 1,
      duration: 200,
      ease: "Power2",
    });
    this.tweens.add({
      targets: this.dial,
      angle: "+=5",
      duration: 100,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
    // The heavy locking bolts slide back into the door...
    if (this._boltGfx) {
      this.tweens.add({
        targets: this._boltGfx,
        x: -this._dialRadius * 0.24,
        duration: 500,
        delay: 120,
        ease: "Back.easeIn",
      });
    }
    // ...and the door seam lights up as the vault releases.
    if (this._doorSeam) {
      this.tweens.add({
        targets: this._doorSeam,
        alpha: 1,
        duration: 600,
        delay: 200,
        yoyo: true,
        hold: 400,
        repeat: 1,
      });
    }
    this.statusText.setText("The mechanism yields. A secret is revealed.");
    this.statusText.setColor("#00ff44");
  }

  // ── Procedural Sounds ──────────────────────────────────────────────────────

  _playSound(freq, vol, dur, type = "sine", attack = 0.01, decay = 0.1) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(
        vol * (window.GameAudio ? window.GameAudio.sfxVol : 0.8),
        t + attack,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {}
  }

  _playNoiseClick(vol, dur, freq, Q) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      }

      const src = ac.createBufferSource();
      src.buffer = buf;

      const filter = ac.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = Q;

      const gain = ac.createGain();
      gain.gain.setValueAtTime(
        vol * (window.GameAudio ? window.GameAudio.sfxVol : 0.8),
        t,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  _soundTick() {
    // Un ticăit mecanic, subtil
    this._playNoiseClick(0.22, 0.05, 2500, 1.2);
  }

  _soundClick() {
    // Un clic ascuțit și satisfăcător, ca un zăvor care se fixează —
    // clar deasupra ticăitului, ca să se audă punctele-cheie
    this._playNoiseClick(1.0, 0.16, 3200, 1.6);
    this._playSound(210, 0.7, 0.2, "sine", 0.004, 0.12);
    this._playSound(105, 0.5, 0.25, "triangle", 0.004, 0.15);
  }

  _soundClunk() {
    // Zgomot greu, metalic, de deschidere
    this._playSound(150, 0.7, 0.3, "square");
    this._playSound(80, 0.8, 0.4, "square");
    this._playNoiseClick(0.9, 0.6, 800, 2);
    if (window.playSuccess) window.playSuccess(this);
  }

  _soundReset() {
    // Sunet de resetare, ca niște zăvoare care cad
    this._playNoiseClick(0.4, 0.2, 1500, 2);
    this.time.delayedCall(50, () => this._playNoiseClick(0.3, 0.15, 1800, 2));
  }

  // ── Texts & Vignette ───────────────────────────────────────────────────────

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "An old safe. The tumblers are listening.", {
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
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.5,
      0.5,
      0,
      0,
    );
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0,
      0.55,
      0.55,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.45,
      0,
      0.45,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.45,
      0,
      0.45,
    );
    vg.fillRect(W - v, 0, v, H);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this.dial = null;
    this.successIndicator = null;
    this._boltGfx = null;
    this._doorSeam = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
