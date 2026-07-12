// ─────────────────────────────────────────────────────────────────────────────
// Level — "CIPHER WHEEL"  ·  code: ROTOR  ·  very hard  ·  decipher
//
// A quiet, candle-lit wall. Mounted on it: a brass cipher wheel — a fixed
// outer alphabet and a rotating inner disk, turning with the slow click of a
// clock. On the desk: a sealed envelope holding a letter enciphered with a
// Caesar shift of 3. The wax seal is pressed with three plain bars — ||| —
// the only hint to the shift (they warm up like embers on hover; no halos,
// nothing pulses):
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
// The candle is the CSS-art candle from Games/Cryptex/Cryptex/ (DOM overlay,
// same pattern as the Modem/TV levels), without the blinking halo.
// ─────────────────────────────────────────────────────────────────────────────

const CRYPTEX_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CRYPTEX_CIPHER = [
  "HYHUB FLSKHU PDFKLQH",
  "JXDUGV LWV VSLQQLQJ KHDUW",
  "WKH URWRU",
];

// markup of the CSS candle (Games/Cryptex/Cryptex/Cryptex.html),
// minus the pulsing .blinking-glow halo
const CRYPTEX_CANDLE_HTML =
  '<div class="holder">' +
  '<div class="candle">' +
  '<div class="thread"></div>' +
  '<div class="glow"></div>' +
  '<div class="flame"></div>' +
  "</div>" +
  "</div>";

class CryptexScene extends Phaser.Scene {
  constructor() {
    super({ key: "Cryptex" });
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
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    this.isSolved = false;
    this._wheelAngle = 0; // degrees; 0 = A over A
    this._overlayOpen = false;
    this._draggingWheel = false;

    this._build(this.cameras.main.width, this.cameras.main.height);

    // ── wheel input: drag to turn, ticking letter by letter ──
    this.input.on("pointerdown", (p) => {
      if (this._overlayOpen || !this._wheel) return;
      const { cx, cy, R } = this._wheel;
      if (Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > R * 0.78) return;
      this._draggingWheel = true;
      this._lastPointerDeg = Phaser.Math.RadToDeg(
        Math.atan2(p.y - cy, p.x - cx),
      );
    });

    this.input.on("pointermove", (p) => {
      if (!this._draggingWheel || !p.isDown || !this._wheel) return;
      const { cx, cy } = this._wheel;
      const deg = Phaser.Math.RadToDeg(Math.atan2(p.y - cy, p.x - cx));
      const delta = Phaser.Math.Angle.ShortestBetween(this._lastPointerDeg, deg);
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
      this._stepWheel(dy > 0 ? 1 : -1);
    });

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    this.events.once("shutdown", () => this._removeCandleDom());

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const deskY = H * 0.78;
    this._deskY = deskY;

    // wall — clean, warm, quiet
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x201823, 0x281d28, 0x0c080e, 0x120c12, 1);
    bg.fillRect(0, 0, W, deskY);
    bg.fillGradientStyle(0x000000, 0x46290e, 0x000000, 0x341e08, 0, 0.14, 0, 0.1);
    bg.fillRect(W * 0.5, 0, W * 0.5, deskY);

    // desk — a single warm band, no clutter
    const desk = this.add.graphics().setDepth(-8);
    desk.fillGradientStyle(0x44290f, 0x4e3013, 0x1c0f05, 0x241407, 1);
    desk.fillRect(0, deskY, W, H - deskY);
    desk.fillStyle(0x6b4620, 0.9).fillRect(0, deskY, W, 3);
    desk.fillStyle(0xffd08a, 0.05).fillRect(0, deskY + 3, W, 8);
    const cx0 = W * 0.86;
    for (let i = 4; i >= 1; i--) {
      desk.fillStyle(0xffb45e, 0.03);
      desk.fillEllipse(cx0, deskY + (H - deskY) * 0.3, W * 0.1 * i, (H - deskY) * 0.4 * (i / 2.5));
    }

    this._buildCandleDom(W, H, deskY);
    this._buildTexts(W, H);
    this._buildWheel(W, H);
    this._buildParchment(W, H, deskY);

    // vignette
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.26;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.85, 0.85, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.7, 0, 0.7, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.55, 0, 0.55);
    vg.fillRect(W - v, 0, v, H);
  }

  _buildTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 46, "An old wheel. An older message.", {
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
      .text(W - 30, 30, "Level 8", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── the CSS-art candle, as a DOM overlay (no blinking halo) ────────────────

  _buildCandleDom(W, H, deskY) {
    this._removeCandleDom();
    const container = document.getElementById("game-container");
    if (!container) return;

    const s = Phaser.Math.Clamp((H * 0.4) / 400, 0.3, 0.8);
    const cx = W * 0.86;
    const bottomY = deskY + (H - deskY) * 0.3;

    const el = document.createElement("div");
    el.className = "scene-dom-overlay cryptex-candle";
    el.innerHTML = CRYPTEX_CANDLE_HTML;
    // the 100px-wide .candle sits at the LEFT edge of the 150px .holder,
    // so its visual center is at 50px — align that with the dish at cx
    el.style.left = cx - 50 * s + "px";
    el.style.top = bottomY - 400 * s + "px";
    el.style.transform = "scale(" + s + ")";
    el.style.transformOrigin = "top left";
    container.appendChild(el);
    this._candleDom = el;

    const g = this.add.graphics().setDepth(-7);
    g.fillStyle(0x000000, 0.5);
    g.fillEllipse(cx, bottomY + 4, 130 * s, 26 * s);
    g.fillStyle(0x3a2a10, 1);
    g.fillEllipse(cx, bottomY + 2, 124 * s, 20 * s);
    g.fillStyle(0x8a6a30, 0.9);
    g.fillEllipse(cx, bottomY - 1, 118 * s, 17 * s);
    g.fillStyle(0x54390f, 1);
    g.fillEllipse(cx, bottomY - 3, 104 * s, 13 * s);
  }

  _removeCandleDom() {
    if (this._candleDom && this._candleDom.parentNode) {
      this._candleDom.parentNode.removeChild(this._candleDom);
    }
    this._candleDom = null;
  }

  // ── the cipher wheel ───────────────────────────────────────────────────────

  _buildWheel(W, H) {
    const R = Phaser.Math.Clamp(Math.min(W, H) * 0.3, 120, 220);
    const cx = W * 0.44;
    const cy = H * 0.46;
    this._wheel = { cx, cy, R };
    this._step = 360 / 26;

    const lerpColor = (c1, c2, t) => {
      const a = Phaser.Display.Color.ValueToColor(c1);
      const b = Phaser.Display.Color.ValueToColor(c2);
      const o = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, t * 100);
      return Phaser.Display.Color.GetColor(o.r, o.g, o.b);
    };

    // wall shadow behind the wheel
    const sh = this.add.graphics().setDepth(2);
    sh.fillStyle(0x000000, 0.4);
    sh.fillCircle(cx + 9, cy + 13, R * 1.05);

    // ── fixed outer ring ──
    const outer = this.add.graphics().setDepth(3);
    outer.fillStyle(0x150d05, 1).fillCircle(cx, cy, R * 1.05);
    outer.lineStyle(2, 0xc9a55a, 0.25).strokeCircle(cx, cy, R * 1.05);
    // domed brass band, shaded ring by ring
    const bandR0 = R * 0.78;
    for (let rr = bandR0; rr <= R; rr += 2) {
      const t = (rr - bandR0) / (R - bandR0);
      const curve = Math.sin(t * Math.PI);
      outer.lineStyle(2.6, lerpColor(0x3a2a10, 0x9a7838, curve), 1);
      outer.strokeCircle(cx, cy, rr);
    }
    // soft top-left sheen
    outer.lineStyle(R * 0.1, 0xffe9b0, 0.07);
    outer.beginPath();
    outer.arc(cx, cy, R * 0.89, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(300));
    outer.strokePath();
    // clock-like tick marks
    for (let i = 0; i < 26; i++) {
      const a = Phaser.Math.DegToRad(i * this._step - 90);
      outer.lineStyle(1.5, 0x1c1206, 0.8);
      outer.lineBetween(
        cx + Math.cos(a) * R * 0.785,
        cy + Math.sin(a) * R * 0.785,
        cx + Math.cos(a) * R * 0.815,
        cy + Math.sin(a) * R * 0.815,
      );
    }
    // groove that separates the rings
    outer.fillStyle(0x0e0803, 1).fillCircle(cx, cy, R * 0.77);

    // outer letters — engraved, fixed
    const outSize = Math.max(13, Math.round(R * 0.1));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const lx = cx + Math.cos(a) * R * 0.885;
      const ly = cy + Math.sin(a) * R * 0.885;
      this.add
        .text(lx + 1, ly + 1, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: outSize + "px",
          color: "#140c02",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setAlpha(0.85)
        .setDepth(4);
      this.add
        .text(lx, ly, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: outSize + "px",
          color: "#ead9a8",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setDepth(4);
    }

    // fixed reference pointer at 12 o'clock
    const ptr = this.add.graphics().setDepth(6);
    ptr.fillStyle(0xffd98a, 0.95);
    ptr.fillTriangle(cx - 7, cy - R * 1.05, cx + 7, cy - R * 1.05, cx, cy - R * 0.93);
    ptr.lineStyle(1, 0x5a3c16, 0.9);
    ptr.strokeTriangle(cx - 7, cy - R * 1.05, cx + 7, cy - R * 1.05, cx, cy - R * 0.93);

    // ── rotating inner disk ──
    this._disk = this.add.container(cx, cy).setDepth(5);
    const d = this.add.graphics();
    const diskR = R * 0.745;
    for (let rr = diskR; rr > 0; rr -= 2) {
      const t = rr / diskR;
      const curve = Math.pow(Math.sin((1 - t) * Math.PI * 0.5 + 0.5), 1.4);
      d.fillStyle(lerpColor(0x4a3312, 0x8f6f30, 1 - t * 0.72), 1);
      d.fillCircle(0, 0, rr);
    }
    d.lineStyle(2, 0x1a1004, 1).strokeCircle(0, 0, diskR);
    d.lineStyle(1, 0xd9b878, 0.3).strokeCircle(0, 0, diskR - 2);
    // hub with a clock-hand needle pointing at the disk's own "A"
    d.fillStyle(0x241708, 1).fillCircle(0, 0, R * 0.16);
    d.lineStyle(1.5, 0xc9a55a, 0.5).strokeCircle(0, 0, R * 0.16);
    d.fillStyle(0xc9a55a, 0.9);
    d.fillTriangle(-5, -R * 0.13, 5, -R * 0.13, 0, -R * 0.5);
    d.fillCircle(0, 0, 4);
    this._disk.add(d);

    // inner letters — rotate with the disk
    const inSize = Math.max(12, Math.round(R * 0.088));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const lx = Math.cos(a) * R * 0.63;
      const ly = Math.sin(a) * R * 0.63;
      const shadow = this.add
        .text(lx + 1, ly + 1, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: inSize + "px",
          color: "#140c02",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setAlpha(0.8);
      const face = this.add
        .text(lx, ly, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: inSize + "px",
          color: "#f2e3b3",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90));
      this._disk.add(shadow);
      this._disk.add(face);
    }

    this._disk.setAngle(this._wheelAngle);
    this._lastTick = Math.round(this._wheelAngle / this._step);
  }

  _setWheelAngle(deg) {
    this._wheelAngle = deg;
    if (this._disk) this._disk.setAngle(deg);
    // tick like a clock every time a letter passes the pointer
    const tick = Math.round(deg / this._step);
    if (tick !== this._lastTick) {
      this._lastTick = tick;
      if (window.playClick) window.playClick(this);
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
      if (window.playClick) window.playClick(this);
    });
  }

  // ── parchment ──────────────────────────────────────────────────────────────

  _buildParchment(W, H, deskY) {
    const px = W * 0.16;
    const py = deskY + (H - deskY) * 0.46;
    const pw = Math.min(W * 0.2, 165);
    const ph = pw * 0.62; // classic envelope proportions

    // ── a sealed envelope, back side up ──
    const p = this.add.container(px, py).setDepth(8).setAngle(-4);
    const g = this.add.graphics();

    // contact shadow on the desk
    g.fillStyle(0x000000, 0.42);
    g.fillEllipse(3, ph * 0.42, pw * 1.06, ph * 0.6);

    // body — aged paper
    g.fillGradientStyle(0xe9dbb2, 0xe3d4a8, 0xbfa87a, 0xc6b083, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 5);
    g.lineStyle(1, 0x8a744a, 0.85);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 5);

    // aging blotches
    g.fillStyle(0x8a744a, 0.08);
    g.fillEllipse(-pw * 0.3, ph * 0.24, pw * 0.24, ph * 0.2);
    g.fillEllipse(pw * 0.34, ph * 0.1, pw * 0.16, ph * 0.14);

    // side + bottom folds meeting under the flap tip
    const tipY = ph * 0.16;
    g.fillStyle(0x000000, 0.05);
    g.fillTriangle(-pw / 2 + 2, ph / 2 - 2, pw / 2 - 2, ph / 2 - 2, 0, tipY);
    g.lineStyle(1, 0x9a835a, 0.7);
    g.lineBetween(-pw / 2 + 2, ph / 2 - 2, 0, tipY);
    g.lineBetween(pw / 2 - 2, ph / 2 - 2, 0, tipY);

    // the flap — a shade darker, lit along its folded edges
    g.fillGradientStyle(0xdccb9d, 0xd6c495, 0xb59e6f, 0xbca677, 1);
    g.fillTriangle(-pw / 2, -ph / 2, pw / 2, -ph / 2, 0, tipY);
    // shadow the flap casts on the body, just below its edges
    g.lineStyle(3, 0x000000, 0.09);
    g.lineBetween(-pw / 2 + 4, -ph / 2 + 6, 0, tipY + 4);
    g.lineBetween(pw / 2 - 4, -ph / 2 + 6, 0, tipY + 4);
    // crisp fold edges with a light catch
    g.lineStyle(1.2, 0x8a744a, 0.9);
    g.lineBetween(-pw / 2, -ph / 2, 0, tipY);
    g.lineBetween(pw / 2, -ph / 2, 0, tipY);
    g.lineStyle(1, 0xf4e9c6, 0.5);
    g.lineBetween(-pw / 2 + 2, -ph / 2 + 1, 0, tipY - 2);
    g.lineBetween(pw / 2 - 2, -ph / 2 + 1, 0, tipY - 2);
    p.add(g);

    // ── the wax seal on the flap tip, pressed with the numeral III ──
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

    // the shift mark: three plain bars — ||| — pressed into the wax
    const barH = sr * 0.66;
    const barW = Math.max(2, sr * 0.13);
    const barGap = sr * 0.3;
    const barsG = this.add.graphics();
    for (let i = -1; i <= 1; i++) {
      const bx = sx + i * barGap;
      barsG.lineStyle(barW, 0x2e0602, 1);
      barsG.lineBetween(bx, sy - barH / 2, bx, sy + barH / 2);
    }
    p.add(barsG);

    // on hover the bars heat up like embers — steady color, no halo, no pulse
    // (additive blend makes them truly incandescent, confined to the bars)
    const emberG = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let i = -1; i <= 1; i++) {
      const bx = sx + i * barGap;
      emberG.lineStyle(barW, 0xff4d14, 1);
      emberG.lineBetween(bx, sy - barH / 2, bx, sy + barH / 2);
      emberG.lineStyle(Math.max(1.4, barW * 0.55), 0xffb347, 1);
      emberG.lineBetween(bx, sy - barH / 2 + 1.2, bx, sy + barH / 2 - 1.2);
      // white-hot center of the ember
      emberG.lineStyle(Math.max(1, barW * 0.28), 0xffe9c2, 1);
      emberG.lineBetween(bx, sy - barH / 2 + 2.2, bx, sy + barH / 2 - 2.2);
    }
    emberG.setAlpha(0);
    p.add(emberG);
    this._sealGlow = [emberG];

    p.setSize(pw * 1.05, ph * 1.1);
    p.setInteractive({ cursor: "pointer" });
    p.on("pointerdown", (ptr) => {
      if (ptr.event) ptr.event.stopPropagation();
      this._openOverlay();
    });
    p.on("pointerover", () => this._sealGlowOn());
    p.on("pointerout", () => this._sealGlowOff());
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
    og.fillStyle(0x000000, 0.55);
    og.fillRoundedRect(ox + 10, oy + 12, bw, bhh, 8);
    og.fillGradientStyle(0xe0d0a4, 0xd8c69a, 0xb5a274, 0xc0ad7e, 1);
    og.fillRoundedRect(ox, oy, bw, bhh, 8);
    const rnd = this._rng(909);
    for (let i = 0; i < 7; i++) {
      og.fillStyle(0x8a744a, 0.07 + rnd() * 0.05);
      og.fillEllipse(
        ox + bw * (0.12 + rnd() * 0.76),
        oy + bhh * (0.12 + rnd() * 0.76),
        30 + rnd() * 70,
        20 + rnd() * 40,
      );
    }
    og.lineStyle(3, 0x6b5432, 0.5);
    og.strokeRoundedRect(ox + 2, oy + 2, bw - 4, bhh - 4, 7);
    og.lineStyle(1.5, 0x4a3820, 0.7);
    og.strokeRoundedRect(ox, oy, bw, bhh, 8);
    og.lineStyle(1, 0x8a744a, 0.35);
    og.lineBetween(ox + bw * 0.5, oy + 6, ox + bw * 0.5, oy + bhh - 6);
    og.lineBetween(ox + 6, oy + bhh * 0.48, ox + bw - 6, oy + bhh * 0.48);
    ov.add(og);

    const fs = Math.max(16, Math.round(Math.min(W, H) * 0.028));
    const cipherText = this.add
      .text(W / 2, oy + bhh * 0.4, CRYPTEX_CIPHER.join("\n"), {
        fontFamily: '"Special Elite", monospace',
        fontSize: fs + "px",
        color: "#3b2a12",
        align: "center",
        lineSpacing: 12,
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    ov.add(cipherText);

    // the shift hint lives in the wax: the same seal, pressed with III
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
    // the same three pressed bars — |||
    for (let i = -1; i <= 1; i++) {
      const bx = sgx + i * 6;
      sg.lineStyle(2.6, 0x2e0602, 1);
      sg.lineBetween(bx, sgy - 7, bx, sgy + 7);
    }
    ov.add(sg);

    const closeHint = this.add
      .text(W / 2, oy + bhh - 18, "click anywhere to put it down", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "12px",
        color: "#6b573a",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    ov.add(closeHint);

    this._overlay = ov;
  }

  // ember tint on the seal's bars while the cursor rests on the envelope —
  // a slow, steady warm-up, nothing pulses
  _sealGlowOn() {
    if (!this._sealGlow || this._overlayOpen) return;
    if (this._sealTween) this._sealTween.stop();
    this._sealTween = this.tweens.add({
      targets: this._sealGlow,
      alpha: 1,
      duration: 900,
      ease: "Sine.easeInOut",
    });
  }

  _sealGlowOff() {
    if (!this._sealGlow) return;
    if (this._sealTween) this._sealTween.stop();
    this._sealTween = this.tweens.add({
      targets: this._sealGlow,
      alpha: 0,
      duration: 700,
      ease: "Sine.easeInOut",
    });
  }

  _openOverlay() {
    if (this._overlayOpen) return;
    this._overlayOpen = true;
    this._draggingWheel = false;
    this._sealGlowOff();
    if (window.playUIClick) window.playUIClick();
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
    this._removeCandleDom();
    this._overlay = null;
    this._parchment = null;
    this._sealGlow = null;
    this._sealTween = null;
    this._wheel = null;
    this._disk = null;
    this._overlayOpen = false;
    this._draggingWheel = false;
  }

  transitionToLevel(levelKey, skipFade = false) {
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (window.playSuccess) window.playSuccess(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const fadeOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0, 0)
      .setDepth(100)
      .setAlpha(0);

    const levelIndex = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const levelNumber = levelIndex !== -1 ? levelIndex + 1 : "?";

    const nextLvlText = this.add
      .text(width / 2, height / 2, "Level " + levelNumber + "...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setAlpha(0);

    this.tweens.add({
      targets: [fadeOverlay, nextLvlText],
      alpha: 1,
      duration: 1000,
      onComplete: () => {
        this.scene.start(levelKey, { skipFade: false });
      },
    });
  }

  shutdown() {
    this._removeCandleDom();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
