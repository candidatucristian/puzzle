import Candle from "./Candle.js";
import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { PENCIL } from "../../shared/theme.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "CIPHER WHEEL"  ·  code: ROTOR  ·  very hard  ·  decipher
//
// A quiet, candle-lit wall. Mounted on it: a brass cipher wheel — a fixed
// outer alphabet and a rotating inner disk, turning with the slow click of a
// clock. On the desk: a sealed envelope holding a letter enciphered with a
// Caesar shift of 3. Extinguishing the candle takes three clicks,
// providing the hint to the shift.
//
//   "HYHUB FLSKHU PDFKLQH / JXDUGV LWV VSLQQLQJ KHDUW / WKH URWRU"
//    →  EVERY CIPHER MACHINE GUARDS ITS SPINNING HEART — THE ROTOR
//
// Align the wheel, decode the message, and the word reveals itself: ROTOR.
//
// Interactions: drag the inner disk to turn it (it snaps letter by letter,
// like winding a clock), or scroll over the wheel. Click the parchment to
// read it. The wheel is a tool — the answer is typed into the code box.
//
// The wheel's letters are painted in luminous ink: while the candle burns
// they can't be seen and the disk is locked. Put out the candle and the
// letters light up one by one around the rings; only then does the disk turn.
//
// The candle is a CSS-art candle (DOM overlay, same pattern as the Modem/TV
// levels). Each click is a breath: the flame bends away from the click,
// nearly dies, and recovers smaller. The third breath tears the flame off,
// leaves a glowing ember on the wick and a curling thread of smoke. The
// candlelight on the wall and desk flickers with the flame and dims with it.
// ─────────────────────────────────────────────────────────────────────────────

// both rings read A→Z clockwise (left to right across the top); the cipher
// is unchanged, so the answer is still ROTOR
const CRYPTEX_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CX_SKETCH = PENCIL; // the pencil itself
const CRYPTEX_CIPHER = [
  "HYHUB FLSKHU PDFKLQH",
  "JXDUGV LWV VSLQQLQJ KHDUW",
  "WKH URWRU",
];

// markup of the CSS candle — the flame is built from layers, like a real one:
// orange body, white core, dark zone around the wick and a blue base

export default class CryptexScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Cryptex" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();

    this.isSolved = false;
    this.candle = new Candle(this, {
      isBlocked: () => this._overlayOpen || this.isSolved,
      onExtinguished: () => this._revealLetters(),
    });
    this._wheelAngle = 0; // degrees; 0 = A over A
    this._overlayOpen = false;
    this._draggingWheel = false;
    this._lettersShown = false; // the letters appear only in the dark

    this._build(this.cameras.main.width, this.cameras.main.height);

    // ── wheel input: drag to turn, ticking letter by letter ──
    this.input.on("pointerdown", (p) => {
      if (this._overlayOpen || !this._wheel) return;
      const { cx, cy, R } = this._wheel;
      if (Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > R * 0.78) return;
      if (!this._lettersShown) {
        this._jiggleLockedWheel();
        return;
      }
      this._draggingWheel = true;
      this._lastPointerDeg = Phaser.Math.RadToDeg(
        Math.atan2(p.y - cy, p.x - cx),
      );
    });

    this.input.on("pointermove", (p) => {
      if (!this._draggingWheel || !p.isDown || !this._wheel) return;
      const { cx, cy } = this._wheel;
      const deg = Phaser.Math.RadToDeg(Math.atan2(p.y - cy, p.x - cx));
      const delta = Phaser.Math.Angle.ShortestBetween(
        this._lastPointerDeg,
        deg,
      );
      this._lastPointerDeg = deg;
      this._setWheelAngle(this._wheelAngle + delta);
    });

    this.input.on("pointerup", () => {
      if (!this._draggingWheel) return;
      this._draggingWheel = false;
      this._snapWheel();
    });

    this.input.on("wheel", (p, objs, dx, dy) => {
      if (this._overlayOpen || !this._wheel) return;
      const { cx, cy, R } = this._wheel;
      if (Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > R * 1.1) return;
      if (!this._lettersShown) {
        this._jiggleLockedWheel();
        return;
      }
      this._stepWheel(dy > 0 ? 1 : -1);
    });

    // kept as a reference so shutdown() can remove it (otherwise every
    // restart of the level would add one more listener)
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);

if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // the candlelight on the wall and desk trembles with the flame
  update(time) {
    this.candle.update(time);
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const deskY = H * 0.78;
    this._deskY = deskY;

    // paper: the dark sketched room — only the candle's warmth is real
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    bg.fillRect(0, 0, W, H);
    // candlelight resting on the right half of the wall (the candle's, not ours)
    const wallLight = this.add.graphics().setDepth(-9.9);
    this.candle.wallLight = wallLight;
    wallLight.fillGradientStyle(
      0x000000,
      0x46290e,
      0x000000,
      0x341e08,
      0,
      0.12,
      0,
      0.08,
    );
    wallLight.setPosition(W * 0.86, deskY * 0.6);
    wallLight.fillRect(-W * 0.36, -deskY * 0.6, W * 0.5, deskY);

    const rnd = this._rng(8228);
    // wireframe room: corner verticals, ceiling hints
    this._pencilSeg(
      bg,
      rnd,
      W * 0.06,
      H * 0.05,
      W * 0.06,
      deskY,
      1,
      CX_SKETCH,
      0.1,
      2.4,
    );
    this._pencilSeg(
      bg,
      rnd,
      W * 0.94,
      H * 0.05,
      W * 0.94,
      deskY,
      1,
      CX_SKETCH,
      0.1,
      2.4,
    );
    this._pencilSeg(
      bg,
      rnd,
      0,
      H * 0.03,
      W * 0.06,
      H * 0.05,
      1,
      CX_SKETCH,
      0.08,
      2,
    );
    this._pencilSeg(
      bg,
      rnd,
      W,
      H * 0.03,
      W * 0.94,
      H * 0.05,
      1,
      CX_SKETCH,
      0.08,
      2,
    );
    // stray construction scribbles on the wall
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = rnd() * deskY * 0.5;
      this._pencilSeg(
        bg,
        rnd,
        x,
        y,
        x + 14 + rnd() * 30,
        y + (rnd() - 0.5) * 10,
        1,
        CX_SKETCH,
        0.04,
        1.6,
      );
    }
    // the desk: a hand-ruled edge, hatch lines below
    this._pencilSeg(bg, rnd, 0, deskY, W, deskY, 1.4, CX_SKETCH, 0.22, 2);
    this._pencilSeg(bg, rnd, 0, deskY + 5, W, deskY + 5, 1, CX_SKETCH, 0.1, 2);
    for (let i = 0; i < 3; i++) {
      const y = deskY + 24 + i * ((H - deskY) / 3.8);
      this._pencilSeg(
        bg,
        rnd,
        W * 0.04,
        y,
        W * 0.96,
        y + (rnd() - 0.5) * 6,
        1,
        CX_SKETCH,
        0.05,
        2.4,
      );
    }
    // the candle's pool of light on the desk — unchanged, it belongs to it
    const desk = this.add.graphics().setDepth(-8);
    this.candle.deskLight = desk;
    desk.setPosition(W * 0.86, deskY + (H - deskY) * 0.3);
    for (let i = 4; i >= 1; i--) {
      desk.fillStyle(0xffb45e, 0.03);
      desk.fillEllipse(0, 0, W * 0.1 * i, (H - deskY) * 0.4 * (i / 2.5));
    }

    this.candle.build(W, H, deskY);
    // instant: after a resize the light jumps straight to the right level
    this.candle.refresh(true);
    this._buildTexts(W, H);
    if (this.candle.clicks === 3) this._lettersShown = true;
    this._buildWheel(W, H);
    this._buildParchment(W, H, deskY);

    // vignette
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.26;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.85,
      0.85,
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
      0.85,
      0.85,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.7,
      0,
      0.7,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.55,
      0,
      0.55,
    );
    vg.fillRect(W - v, 0, v, H);
  }

  _buildTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 46, "Put out the light!", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.subText = this.add
      .text(W / 2, 74, "turn the wheel · read the letter", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);
    this.levelText = this.add
      .text(
        W - 30,
        30,
        "Level " +
          (this.services.levels.definitions.findIndex((l) => l.key === this.scene.key) + 1),
        {
          fontFamily: '"Special Elite", monospace',
          fontSize: "28px",
          color: "#e8dcc0",
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── the CSS-art candle, as a DOM overlay ───────────────────────────────────

  // one click = one breath on the candle

  // flame size, button state and room light for the current number of clicks

  // The breath: the flame bends away from the click, stretches thin, nearly
  // dies, then recovers smaller with a springy sway. The third breath tears
  // the flame off, leaves an ember on the wick and a thread of smoke.

  // the tip of the flame, torn off by the breath, drifts away and vanishes

  // the ember on the wick: flares, flickers once more, cools down

  // A thread of smoke: small overlapping wisps rising on the same wave, so
  // together they read as one ribbon curling upward. Pushed sideways by the
  // breath at first, then rising straight and thinning out.

  // ── the candlelight on the wall and desk ──
  // one light "level", tweened smoothly; update() adds a small flicker on top

  // the light drops with the breath, trembles, then returns (or dies)

  // ── the cipher wheel ───────────────────────────────────────────────────────

  _buildWheel(W, H) {
    const R = Phaser.Math.Clamp(Math.min(W, H) * 0.3, 120, 220);
    const cx = W * 0.44;
    const cy = H * 0.46;
    this._wheel = { cx, cy, R };
    this._step = 360 / 26;

    // ── fixed outer ring, hand-drawn ──
    const outer = this.add.graphics().setDepth(3);
    const rnd = this._rng(4114);
    // dark backing so the wall never shows through the instrument
    outer.fillStyle(0x101216, 0.97).fillCircle(cx, cy, R * 1.06);
    outer.fillStyle(CX_SKETCH, 0.03).fillCircle(cx, cy, R * 1.06);
    // doubled sketched rim + the groove separating ring from disk
    this._pencilCircle(outer, rnd, cx, cy, R * 1.05, 1.8, CX_SKETCH, 0.55);
    this._pencilCircle(outer, rnd, cx, cy, R * 1.0, 1, CX_SKETCH, 0.22);
    this._pencilCircle(outer, rnd, cx, cy, R * 0.77, 1.4, CX_SKETCH, 0.4);
    // tick marks, one per letter
    for (let i = 0; i < 26; i++) {
      const a = Phaser.Math.DegToRad(i * this._step - 90);
      this._pencilSeg(
        outer,
        rnd,
        cx + Math.cos(a) * R * 0.785,
        cy + Math.sin(a) * R * 0.785,
        cx + Math.cos(a) * R * 0.815,
        cy + Math.sin(a) * R * 0.815,
        1,
        CX_SKETCH,
        0.35,
        0.4,
      );
    }

    // every letter on both rings; hidden until the candle is out
    this._letters = [];
    const addLetter = (obj, alpha, ring, i) => {
      this._letters.push({ obj, alpha, ring, i });
      obj.setAlpha(this._lettersShown ? alpha : 0);
      return obj;
    };

    // outer letters — written in, fixed (a faint ghost stroke behind each)
    const outSize = Math.max(13, Math.round(R * 0.1));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const lx = cx + Math.cos(a) * R * 0.885;
      const ly = cy + Math.sin(a) * R * 0.885;
      const ghost = this.add
        .text(lx + 1.2, ly + 1, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: outSize + "px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setDepth(4);
      addLetter(ghost, 0.3, "outer", i);
      const face = this.add
        .text(lx, ly, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: outSize + "px",
          color: "#e8dcc0",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setShadow(0, 0, "rgba(240, 226, 186, 0.55)", 6, false, true)
        .setDepth(4);
      addLetter(face, 1, "outer", i);
    }

    // fixed reference pointer at 12 o'clock — a pencilled arrowhead
    const ptr = this.add.graphics().setDepth(6);
    const rndP = this._rng(6336);
    ptr.fillStyle(CX_SKETCH, 0.22);
    ptr.fillTriangle(
      cx - 7,
      cy - R * 1.05,
      cx + 7,
      cy - R * 1.05,
      cx,
      cy - R * 0.93,
    );
    this._pencilSeg(
      ptr,
      rndP,
      cx - 7,
      cy - R * 1.05,
      cx,
      cy - R * 0.93,
      1.3,
      CX_SKETCH,
      0.6,
      0.6,
    );
    this._pencilSeg(
      ptr,
      rndP,
      cx + 7,
      cy - R * 1.05,
      cx,
      cy - R * 0.93,
      1.3,
      CX_SKETCH,
      0.6,
      0.6,
    );
    this._pencilSeg(
      ptr,
      rndP,
      cx - 7,
      cy - R * 1.05,
      cx + 7,
      cy - R * 1.05,
      1.3,
      CX_SKETCH,
      0.6,
      0.6,
    );

    // ── rotating inner disk, hand-drawn ──
    this._disk = this.add.container(cx, cy).setDepth(5);
    const d = this.add.graphics();
    const rndD = this._rng(5225);
    const diskR = R * 0.745;
    d.fillStyle(0x171a20, 0.97).fillCircle(0, 0, diskR);
    d.fillStyle(CX_SKETCH, 0.045).fillCircle(0, 0, diskR);
    this._pencilCircle(d, rndD, 0, 0, diskR, 1.6, CX_SKETCH, 0.55);
    this._pencilCircle(d, rndD, 0, 0, diskR - 5, 1, CX_SKETCH, 0.18);
    // hub with a pencilled needle pointing at the disk's own "A"
    this._pencilCircle(d, rndD, 0, 0, R * 0.16, 1.3, CX_SKETCH, 0.45);
    this._pencilSeg(d, rndD, 0, -R * 0.14, 0, -R * 0.5, 1.6, CX_SKETCH, 0.6, 1);
    this._pencilSeg(
      d,
      rndD,
      -4,
      -R * 0.44,
      0,
      -R * 0.5,
      1.2,
      CX_SKETCH,
      0.55,
      0.5,
    );
    this._pencilSeg(
      d,
      rndD,
      4,
      -R * 0.44,
      0,
      -R * 0.5,
      1.2,
      CX_SKETCH,
      0.55,
      0.5,
    );
    d.fillStyle(CX_SKETCH, 0.5);
    d.fillCircle(0, 0, 3);
    this._disk.add(d);

    // inner letters — rotate with the disk
    const inSize = Math.max(12, Math.round(R * 0.088));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const lx = Math.cos(a) * R * 0.63;
      const ly = Math.sin(a) * R * 0.63;
      const ghost = this.add
        .text(lx + 1.2, ly + 1, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: inSize + "px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90));
      addLetter(ghost, 0.3, "inner", i);
      const face = this.add
        .text(lx, ly, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: inSize + "px",
          color: "#c9bfa4",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setShadow(0, 0, "rgba(220, 208, 170, 0.5)", 5, false, true);
      addLetter(face, 1, "inner", i);
      this._disk.add(ghost);
      this._disk.add(face);
    }

    this._disk.setAngle(this._wheelAngle);
    this._lastTick = Math.round(this._wheelAngle / this._step);
  }

  // the luminous letters light up one by one, clockwise from the top:
  // first the outer ring, then the inner disk
  _revealLetters() {
    if (this._lettersShown) return;
    this._lettersShown = true;
    for (const L of this._letters || []) {
      const delay = (L.ring === "outer" ? 0 : 520) + L.i * 38;
      L.obj.setScale(1.45).setAlpha(0);
      this.tweens.add({
        targets: L.obj,
        alpha: L.alpha,
        scale: 1,
        delay,
        duration: 460,
        ease: "Back.easeOut",
      });
    }
  }

  // while the candle burns the disk is locked: it only trembles a little,
  // and the instruction pulses to point at the candle
  _jiggleLockedWheel() {
    if (!this._disk || this._jiggling) return;
    this._jiggling = true;
    this.tweens.add({
      targets: this._disk,
      angle: this._wheelAngle + 2.5,
      duration: 55,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this._disk) this._disk.setAngle(this._wheelAngle);
        this._jiggling = false;
      },
    });
    if (this.statusText) {
      this.tweens.add({
        targets: this.statusText,
        scale: 1.1,
        duration: 130,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    }
  }

  _setWheelAngle(deg) {
    this._wheelAngle = deg;
    if (this._disk) this._disk.setAngle(deg);
    // tick like a clock every time a letter passes the pointer
    const tick = Math.round(deg / this._step);
    if (tick !== this._lastTick) {
      this._lastTick = tick;
      this.services.audio.playClick(this);
    }
  }

  _tweenWheelTo(target, onDone) {
    const proxy = { v: this._wheelAngle };
    this.tweens.add({
      targets: proxy,
      v: target,
      duration: 140,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this._wheelAngle = proxy.v;
        if (this._disk) this._disk.setAngle(proxy.v);
      },
      onComplete: () => {
        this._wheelAngle = target;
        if (this._disk) this._disk.setAngle(target);
        if (onDone) onDone();
      },
    });
  }

  _snapWheel() {
    const target = Math.round(this._wheelAngle / this._step) * this._step;
    this._tweenWheelTo(target);
  }

  _stepWheel(dir) {
    const target =
      (Math.round(this._wheelAngle / this._step) + dir) * this._step;
    this._tweenWheelTo(target, () => {
      this._lastTick = Math.round(this._wheelAngle / this._step);
      this.services.audio.playClick(this);
    });
  }

  // ── parchment ──────────────────────────────────────────────────────────────

  _buildParchment(W, H, deskY) {
    const px = W * 0.16;
    const py = deskY + (H - deskY) * 0.46;
    const pw = Math.min(W * 0.2, 165);
    const ph = pw * 0.62; // classic envelope proportions

    // ── a sealed envelope, back side up — sketched in pencil ──
    const p = this.add.container(px, py).setDepth(8).setAngle(-4);
    const g = this.add.graphics();
    const rndE = this._rng(7447);

    // body — dark paper with a graphite tint
    g.fillStyle(0x14171d, 0.95);
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    g.fillStyle(CX_SKETCH, 0.05);
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    this._pencilRect(
      g,
      rndE,
      -pw / 2,
      -ph / 2,
      pw,
      ph,
      1.4,
      CX_SKETCH,
      0.55,
      1.6,
    );

    // side + bottom folds meeting under the flap tip
    const tipY = ph * 0.16;
    this._pencilSeg(
      g,
      rndE,
      -pw / 2 + 2,
      ph / 2 - 2,
      0,
      tipY,
      1,
      CX_SKETCH,
      0.3,
      1,
    );
    this._pencilSeg(
      g,
      rndE,
      pw / 2 - 2,
      ph / 2 - 2,
      0,
      tipY,
      1,
      CX_SKETCH,
      0.3,
      1,
    );

    // the flap edges, drawn a touch harder — the crease that matters
    this._pencilSeg(
      g,
      rndE,
      -pw / 2,
      -ph / 2,
      0,
      tipY,
      1.3,
      CX_SKETCH,
      0.5,
      1.2,
    );
    this._pencilSeg(
      g,
      rndE,
      pw / 2,
      -ph / 2,
      0,
      tipY,
      1.3,
      CX_SKETCH,
      0.5,
      1.2,
    );
    p.add(g);

    // ── the wax seal on the flap tip, without a shift marking ──
    const sr = ph * 0.27;
    const sx = 0,
      sy = tipY;

    const blob = this.add.graphics();
    blob.fillStyle(0x6e150c, 1);
    blob.fillCircle(sx, sy, sr);
    blob.fillCircle(sx - sr * 0.72, sy + sr * 0.34, sr * 0.36);
    blob.fillCircle(sx + sr * 0.76, sy - sr * 0.22, sr * 0.3);
    blob.fillCircle(sx + sr * 0.42, sy + sr * 0.62, sr * 0.32);
    blob.fillStyle(0x8f271a, 1);
    blob.fillCircle(sx - sr * 0.05, sy - sr * 0.08, sr * 0.82);
    // impression ring
    blob.lineStyle(1.5, 0x4a0d06, 0.9);
    blob.strokeCircle(sx, sy, sr * 0.68);
    blob.lineStyle(1, 0xc46a50, 0.35);
    blob.strokeCircle(sx, sy + 1, sr * 0.68);
    // gloss
    blob.fillStyle(0xffffff, 0.16);
    blob.fillEllipse(sx - sr * 0.3, sy - sr * 0.46, sr * 0.52, sr * 0.2);
    p.add(blob);

    p.setSize(pw * 1.05, ph * 1.1);
    p.setInteractive({ cursor: "pointer" });
    p.on("pointerdown", (ptr) => {
      if (ptr.event) ptr.event.stopPropagation();
      this._openOverlay();
    });
    this._parchment = p;

    // ── reading overlay ──
    const ov = this.add.container(0, 0).setDepth(60).setVisible(false);
    const dark = this.add
      .rectangle(0, 0, W, H, 0x05030a, 0.78)
      .setOrigin(0, 0)
      .setInteractive();
    dark.on("pointerdown", () => this._closeOverlay());
    ov.add(dark);

    const bw = Math.min(W * 0.62, 540);
    const bhh = Math.min(H * 0.62, 430);
    const ox = W / 2 - bw / 2;
    const oy = H / 2 - bhh / 2;
    const og = this.add.graphics();
    const rnd = this._rng(909);
    // the unfolded letter: dark paper, doubled pencil frame, fold creases
    og.fillStyle(0x121419, 0.97);
    og.fillRect(ox, oy, bw, bhh);
    og.fillStyle(CX_SKETCH, 0.04);
    og.fillRect(ox, oy, bw, bhh);
    this._pencilRect(og, rnd, ox, oy, bw, bhh, 1.8, CX_SKETCH, 0.55, 2.2);
    this._pencilRect(
      og,
      rnd,
      ox + 8,
      oy + 8,
      bw - 16,
      bhh - 16,
      1,
      CX_SKETCH,
      0.2,
      2,
    );
    // fold creases where the letter was quartered
    this._pencilSeg(
      og,
      rnd,
      ox + bw * 0.5,
      oy + 10,
      ox + bw * 0.5,
      oy + bhh - 10,
      1,
      CX_SKETCH,
      0.12,
      2,
    );
    this._pencilSeg(
      og,
      rnd,
      ox + 10,
      oy + bhh * 0.48,
      ox + bw - 10,
      oy + bhh * 0.48,
      1,
      CX_SKETCH,
      0.12,
      2,
    );
    ov.add(og);

    const fs = Math.max(16, Math.round(Math.min(W, H) * 0.028));
    const cipherText = this.add
      .text(W / 2, oy + bhh * 0.4, CRYPTEX_CIPHER.join("\n"), {
        fontFamily: '"Special Elite", monospace',
        fontSize: fs + "px",
        color: "#d9cfae",
        align: "center",
        lineSpacing: 12,
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    ov.add(cipherText);

    // the same unmarked wax seal
    const sgx = ox + bw - 64;
    const sgy = oy + bhh - 60;
    const sg = this.add.graphics();
    sg.fillStyle(0x6e150c, 1);
    sg.fillCircle(sgx, sgy, 21);
    sg.fillCircle(sgx - 15, sgy + 8, 8);
    sg.fillCircle(sgx + 16, sgy - 6, 6.5);
    sg.fillCircle(sgx + 9, sgy + 14, 7);
    sg.fillStyle(0x8f271a, 1);
    sg.fillCircle(sgx - 1, sgy - 2, 17);
    sg.lineStyle(1.5, 0x4a0d06, 0.9);
    sg.strokeCircle(sgx, sgy, 14);
    sg.lineStyle(1, 0xc46a50, 0.3);
    sg.strokeCircle(sgx, sgy + 1, 14);
    sg.fillStyle(0xffffff, 0.14);
    sg.fillEllipse(sgx - 7, sgy - 9, 11, 4);
    ov.add(sg);

    const closeHint = this.add
      .text(W / 2, oy + bhh - 18, "click anywhere to put it down", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "12px",
        color: "#8f8974",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    ov.add(closeHint);

    this._overlay = ov;
  }

  _openOverlay() {
    if (this._overlayOpen) return;
    this._overlayOpen = true;
    this._draggingWheel = false;
    this.services.audio.playClick(this);
    this._overlay.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this._overlay, alpha: 1, duration: 220 });
  }

  _closeOverlay() {
    if (!this._overlayOpen) return;
    this.tweens.add({
      targets: this._overlay,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        this._overlay.setVisible(false);
        this._overlayOpen = false;
      },
    });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.candle.removeDom();
    this._overlay = null;
    this._parchment = null;
    this.candle.wallLight = null;
    this.candle.deskLight = null;
    this._wheel = null;
    this._disk = null;
    this._letters = [];
    this._jiggling = false;
    this._overlayOpen = false;
    this._draggingWheel = false;
  }

  shutdown() {
    this._onResize = null;
    this.candle.removeDom();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.candle.destroy();
  }
}
