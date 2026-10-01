import Candle from "./Candle.js";
import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { paintStudy, paintLetter, releaseStudyArt } from "./study.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "CIPHER WHEEL"  ·  code: ROTOR  ·  very hard  ·  decipher
//
// A quiet study, lit by one candle. On the wall: a brass cipher wheel on a
// walnut plaque — a fixed outer alphabet and a rotating inner disk, turning
// with the slow click of a clock. On the desk: a sealed envelope holding a
// letter enciphered with a Caesar shift of 3. Extinguishing the candle takes
// three clicks, providing the hint to the shift.
//
//   "HYHUB FLSKHU PDFKLQH / JXDUGV LWV VSLQQLQJ KHDUW / WKH URWRU"
//    →  EVERY CIPHER MACHINE GUARDS ITS SPINNING HEART — THE ROTOR
//
// Align the wheel, decode the message, and the word reveals itself: ROTOR.
//
// Interactions: drag the inner disk to turn it (it snaps letter by letter,
// like winding a clock), or scroll over the wheel. Click the envelope to
// read the letter. The wheel is a tool — the answer is typed into the code box.
//
// The wheel's letters are painted in luminous paint: while the candle burns
// they can't be seen and the disk is locked. Put out the candle and the
// letters light up one by one around the rings; only then does the disk turn.
//
// The room is painted (study.js) and lit by the candle alone: the candle's
// light is one layer whose brightness the candle drives, so the whole room —
// wall, desk, brass — flickers and dims with the flame. The candle itself is
// the wax is painted in the same camera; Candle.js animates its Phaser flame.
// ─────────────────────────────────────────────────────────────────────────────

// both rings read A→Z clockwise (left to right across the top); the cipher
// is unchanged, so the answer is still ROTOR
const CRYPTEX_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CRYPTEX_CIPHER = [
  "HYHUB FLSKHU PDFKLQH",
  "JXDUGV LWV VSLQQLQJ KHDUW",
  "WKH URWRU",
];

// the luminous paint: engraved Roman capitals filled with a pale green glow
const LUME_FONT = 'Georgia, "Times New Roman", serif';
const LUME_INK = "#e9fff0";
const LUME_GLOW = "rgba(120, 255, 165, 0.85)";

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

  // the candlelight trembles with the flame; the wheel's disk follows it
  update(time) {
    this.candle.update(time);
    this._followCandle();
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const deskY = H * 0.67;
    this._deskY = deskY;

    const art = paintStudy(this, W, H, deskY);
    this.candle.build(art.candle);
    const level = this.candle.lightState.level;
    this._art = art;
    // the room as it is with no candle at all...
    this.add.image(0, 0, art.room).setOrigin(0, 0).setDepth(-10);
    this.candle.wallLight = this.add
      .image(0, 0, art.light).setOrigin(0).setDepth(-9.9)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(level);

    this._buildTexts(W, H);
    if (this.candle.clicks === 3) this._lettersShown = true;
    this._buildWheel(W, H);
    this._buildParchment(W, H, deskY);
    this._followCandle();
  }

  _buildTexts(W, H) {
    this.levelText = this.add
      .text(
        W - 30,
        30,
        "Level " +
          (this.services.levels.definitions.findIndex(
            (l) => l.key === this.scene.key,
          ) +
            1),
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

  // The disk turns, so its light can't be painted on it: it is painted evenly
  // lit, and what the candle does to it — dimming it, the fall-off across
  // it, the shine on the brass — is laid over it here, following the candle.
  _followCandle() {
    if (!this._veil) return;
    const wl = this.candle.wallLight;
    let level = wl ? Phaser.Math.Clamp(wl.alpha, 0, 1) : 1;
    if (this._lettersShown) level = Math.min(level, 0.25); // the candle is out
    this._veil.setAlpha((1 - level) * this._veilMax);
    this._diskShade.setAlpha(level);
    this._diskSheen.setAlpha(level);
  }

  // ── the cipher wheel ───────────────────────────────────────────────────────

  _buildWheel(W, H) {
    const w = this._art.wheel;
    const { cx, cy, R } = w;
    this._wheel = { cx, cy, R };
    this.add.zone(cx, cy, R * 2, R * 2).setDepth(8)
      .setInteractive({ hitArea: new Phaser.Geom.Circle(R, R, R), hitAreaCallback: Phaser.Geom.Circle.Contains, cursor: 'grab' })
      .setData('interactionLabel', 'Drag to turn the wheel');
    this._step = 360 / 26;

    // every letter on both rings; hidden until the candle is out
    this._letters = [];
    const addLetter = (obj, alpha, ring, i) => {
      this._letters.push({ obj, alpha, ring, i });
      obj.setAlpha(this._lettersShown ? alpha : 0);
      return obj;
    };
    const lumeText = (x, y, ch, size, aDeg) =>
      this.add
        .text(x, y, ch, {
          fontFamily: LUME_FONT,
          fontStyle: "bold",
          fontSize: size + "px",
          color: LUME_INK,
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setShadow(0, 0, LUME_GLOW, Math.max(6, size * 0.45), false, true);

    // the glow the letters throw on the brass round them
    this._lume = this.add
      .image(cx, cy, w.lume)
      .setDepth(6.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(this._lettersShown ? 0.45 : 0);

    // outer letters — on the fixed ring
    const outSize = Math.max(13, Math.round(R * 0.1));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const face = lumeText(
        cx + Math.cos(a) * R * 0.885,
        cy + Math.sin(a) * R * 0.885,
        CRYPTEX_ALPHA[i],
        outSize,
        aDeg,
      ).setDepth(7);
      addLetter(face, 1, "outer", i);
    }

    // ── the rotating inner disk ──
    this._disk = this.add.container(cx, cy).setDepth(5);
    const plate = this.add.image(0, 0, w.disk);
    // how dark the brass goes when the candle does
    const veil = this.add.graphics();
    veil.fillStyle(0x000000, 1).fillCircle(0, 0, w.diskR + 0.5);
    veil.setAlpha(0);
    this._veil = veil;
    this._veilMax = w.veil;
    this._disk.add([plate, veil]);

    // inner letters — rotate with the disk
    const inSize = Math.max(12, Math.round(R * 0.088));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const face = lumeText(
        Math.cos(a) * R * 0.63,
        Math.sin(a) * R * 0.63,
        CRYPTEX_ALPHA[i],
        inSize,
        aDeg,
      );
      addLetter(face, 1, "inner", i);
      this._disk.add(face);
    }

    // the light on the disk that stays put while it turns
    this._diskShade = this.add.image(cx, cy, w.shade).setDepth(5.5);
    this._diskSheen = this.add
      .image(cx, cy, w.sheen)
      .setDepth(5.6)
      .setBlendMode(Phaser.BlendModes.ADD);

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
    if (this._lume) {
      this.tweens.add({
        targets: this._lume,
        alpha: 0.45,
        delay: 300,
        duration: 1800,
        ease: "Sine.easeInOut",
      });
    }
  }

  // While the candle burns the disk is locked: it only trembles a little.
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

  // ── the envelope and the letter ────────────────────────────────────────────

  _buildParchment(W, H) {
    // the envelope is painted on the desk; this is where it can be picked up
    const quad = this._art.envelope.quad;
    const xs = quad.map((q) => q.x);
    const ys = quad.map((q) => q.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const p = this.add
      .zone(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0)
      .setOrigin(0, 0)
      .setDepth(8);
    p.setInteractive({
      hitArea: new Phaser.Geom.Polygon(
        quad.map((q) => ({ x: q.x - x0, y: q.y - y0 })),
      ),
      hitAreaCallback: Phaser.Geom.Polygon.Contains,
      cursor: "pointer",
    });
    p.on("pointerdown", (ptr) => {
      if (ptr && ptr.event) ptr.event.stopPropagation();
      this._openOverlay();
    });
    this._parchment = p;
    p.setData('interactionLabel', 'Open the letter');

    // ── reading overlay: the letter, unfolded under the candle ──
    const ov = this.add.container(0, 0).setDepth(60).setVisible(false);
    const dark = this.add
      .rectangle(0, 0, W, H, 0x05030a, 0.78)
      .setOrigin(0, 0)
      .setInteractive();
    dark.on("pointerdown", () => this._closeOverlay());
    ov.add(dark);

    const bw = Math.min(W * 0.62, 540);
    const bhh = Math.min(H * 0.62, 430);
    const oy = H / 2 - bhh / 2;
    ov.add(this.add.image(W / 2, H / 2, paintLetter(this.textures, bw, bhh)));

    const fs = Math.max(16, Math.round(Math.min(W, H) * 0.028));
    const cipherText = this.add
      .text(W / 2, oy + bhh * 0.4, CRYPTEX_CIPHER.join("\n"), {
        fontFamily: '"Special Elite", monospace',
        fontSize: fs + "px",
        color: "#2c2217",
        align: "center",
        lineSpacing: 12,
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setAlpha(0.92);
    ov.add(cipherText);

    const closeHint = this.add
      .text(W / 2, oy + bhh - 18, "click anywhere to put it down", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "12px",
        color: "#6b5a44",
      })
      .setOrigin(0.5)
      .setAlpha(0.9);
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
    // destroy rather than just detach: removeAll(true) only took objects off
    // the display list, and a detached interactive object (the envelope, the
    // overlay's backdrop) goes on catching clicks after a resize
    for (const obj of this.children.list.slice()) obj.destroy();
    this.candle.removeDom();
    releaseStudyArt(this.textures);
    this._overlay = null;
    this._parchment = null;
    this.candle.wallLight = null;
    this._wheel = null;
    this._disk = null;
    this._veil = null;
    this._diskShade = null;
    this._diskSheen = null;
    this._lume = null;
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
    releaseStudyArt(this.textures);
  }
}
