// ─────────────────────────────────────────────────────────────────────────────
// Level — "UNKNOWN CALLER"  (MobilePhone)
//
// Late at night an old mobile phone lies on a wooden desk, buzzing. The
// caller's number is written the way you'd type a name on a keypad:
//   (433)-666-777-433  →  4 · 33 · 666 · 777 · 4 · 33  →  G E O R G E
// Type GEORGE on the keypad and the ANSWER button appears.
//
// Everything is drawn in pencil, like the rest of the game — only the green
// LCD screen is "real". Each vibration shakes the phone on the desk, draws
// buzz marks around it and sends ripples through the coffee in the mug.
// ─────────────────────────────────────────────────────────────────────────────

const MP_SKETCH = 0xd8d2c4; // the pencil itself
const MP_FONT = '"Special Elite", monospace';
const MP_BUZZ_EVERY = 5000; // ms between two vibrations of the phone

class MobilePhoneScene extends Phaser.Scene {
  constructor() {
    super({ key: "MobilePhone" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("phone_vib", "assets/sounds/MobilePhone/vibration.mp3");
    this.load.audio("keypad", "assets/sounds/MobilePhone/keypad.mp3");
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

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── state ──────────────────────────────────────────────────────────────
    this.isSolved = false;
    this.isCallAnswered = false;
    this.waitingForAudioUnlock = false;

    this.userInput = "";
    this.lastChar = "";
    this.lastKey = null;
    this.keyPressCount = 0;
    this.keyTimeout = null;

    this.vibrationTimer = null;
    this.signalTimer = null;
    this.callBlinkTween = null;
    this._answerPulse = null;

    this.navContainer = null;
    this.navG = null;
    this.menuText = null;
    this.rightSoftKey = null;

    this.vibrationSound = null;
    this.keySound = null;

    // the desk around the phone, and the vibration effects
    this._envObjs = [];
    this._ripples = [];
    this._buzzStart = 0;
    this._buzzUntil = 0;
    this._phoneBase = null;
    this._mug = null;

    this.keymap = {
      1: ".,?!",
      2: "ABC",
      3: "DEF",
      4: "GHI",
      5: "JKL",
      6: "MNO",
      7: "PQRS",
      8: "TUV",
      9: "WXYZ",
      0: "+0",
    };

    this._buildDesk(width, height);

    this.statusText = this.add
      .text(width / 2, 50, "", {
        fontFamily: MP_FONT,
        fontSize: "22px",
        color: "#e8dcc0",
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(
        width - 30,
        30,
        "Level " +
          (window.GAME_LEVELS.findIndex((l) => l.key === this.scene.key) + 1),
        {
          fontFamily: MP_FONT,
          fontSize: "28px",
          color: "#e8dcc0",
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);

    this.tweens.add({
      targets: this.levelText,
      alpha: 1,
      duration: 2000,
      ease: "Power2",
    });

    // ── the phone ──────────────────────────────────────────────────────────
    this.phoneContainer = this.add.container(0, 0);

    const phoneBody = this.add.graphics();
    this.drawPhoneBody(phoneBody);
    this.phoneContainer.add(phoneBody);

    this.drawScreen();

    this.callerText = this.add
      .text(0, -30, "CALLING YOU...", {
        fontFamily: "'Courier New', monospace",
        fontSize: "14px",
        color: "#263b16",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.callerNumber = this.add
      .text(0, 0, "(433)-666-777-433", {
        fontFamily: "'Courier New', monospace",
        fontSize: "16px",
        color: "#17260c",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setY(5);

    this.screenInput = this.add
      .text(0, 44, "", {
        fontFamily: "'Courier New', monospace",
        fontSize: "20px",
        color: "#1c2b12",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.screenContainer.add([
      this.callerText,
      this.callerNumber,
      this.screenInput,
    ]);

    this.startCallingBlink();
    this.startSignalAnimation();

    this.keypadContainer = this.add.container(0, 70);
    this.phoneContainer.add(this.keypadContainer);
    this.createKeypad();

    this.setPhoneScale();

    this.vibrationSound = this.sound.add("phone_vib", {
      volume: 0.25,
      loop: false,
    });

    this.keySound = this.sound.add("keypad", {
      volume: 0.62,
      loop: false,
    });

    this.refreshSfxVolume();
    this.startVibrationSoundLoop();

    // kept as a reference so shutdown() can remove it (otherwise every
    // restart of the level would add one more listener)
    this._onResize = (size) => {
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.setPhoneScale();
      this._buildDesk(size.width, size.height);
    };
    this.events.on("canvas_resized", this._onResize);

    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(
          width / 2,
          height / 2,
          "Level " +
            (window.GAME_LEVELS.findIndex((l) => l.key === this.scene.key) +
              1) +
            "...",
          {
            fontFamily: MP_FONT,
            fontSize: "48px",
            color: "#ffffff",
          },
        )
        .setOrigin(0.5)
        .setDepth(101);
      this.tweens.add({
        targets: [fadeOverlay, nextLvlText],
        alpha: 0,
        duration: 1000,
        delay: 500,
        onComplete: () => {
          fadeOverlay.destroy();
          nextLvlText.destroy();
        },
      });
    }
  }

  // ── every frame: the phone shaking on the desk, buzz marks, coffee ripples,
  //    and the screen's glow on the desk breathing with the blinking text ──
  update(time, delta) {
    if (!this.phoneContainer || !this._phoneBase) return;
    const b = this._phoneBase;
    let k = 0;
    if (!this.isSolved && time < this._buzzUntil) {
      const span = this._buzzUntil - this._buzzStart || 1;
      k = Math.sin(
        Phaser.Math.Clamp((time - this._buzzStart) / span, 0, 1) * Math.PI,
      );
      const amp = 2.4 * k;
      this.phoneContainer.setPosition(
        b.x + (Math.random() - 0.5) * 2 * amp,
        b.y + (Math.random() - 0.5) * 2 * amp,
      );
      this.phoneContainer.setRotation((Math.random() - 0.5) * 0.008 * k);
    } else if (
      this.phoneContainer.x !== b.x ||
      this.phoneContainer.y !== b.y ||
      this.phoneContainer.rotation !== 0
    ) {
      this.phoneContainer.setPosition(b.x, b.y).setRotation(0);
    }

    this._drawBuzzLines(k);
    this._updateRipples(Math.min(delta || 16, 100));

    if (this._screenGlow && this.callerText) {
      const a = this.isSolved
        ? 1
        : 0.55 + 0.45 * ((this.callerText.alpha - 0.28) / 0.72);
      this._screenGlow.setAlpha(Phaser.Math.Clamp(a, 0, 1));
    }
  }

  _buzz() {
    if (this.isSolved) return;
    const now = this.game.loop.time;
    this._buzzStart = now;
    this._buzzUntil = now + 750;
    if (this._mug) this._ripples.push({ age: 0 }, { age: -150 }, { age: -320 });
  }

  _drawBuzzLines(k) {
    const g = this._buzzGfx;
    if (!g) return;
    g.clear();
    if (k <= 0.02 || !this._phoneBase) return;
    const { x, y, s } = this._phoneBase;
    for (const side of [-1, 1]) {
      for (const cy of [y - 200 * s, y + 150 * s]) {
        for (let i = 0; i < 3; i++) {
          const r = (34 + i * 18) * s;
          const cx = x + side * 150 * s;
          const a0 = side > 0 ? -0.5 : Math.PI - 0.5;
          const pts = [];
          for (let j = 0; j <= 8; j++) {
            const a = a0 + j / 8;
            const jr = r + (Math.random() - 0.5) * 1.4;
            pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
          }
          this._drawPath(g, pts, 1.9, MP_SKETCH, k * (0.8 - i * 0.2));
        }
      }
    }
  }

  _updateRipples(dt) {
    const g = this._rippleGfx;
    if (!g) return;
    g.clear();
    const m = this._mug;
    if (!m) {
      this._ripples.length = 0;
      return;
    }
    for (let i = this._ripples.length - 1; i >= 0; i--) {
      const rp = this._ripples[i];
      rp.age += dt;
      if (rp.age < 0) continue;
      const p = rp.age / 1100;
      if (p >= 1) {
        this._ripples.splice(i, 1);
        continue;
      }
      g.lineStyle(1.2, 0xe8c9a0, 0.45 * (1 - p));
      g.strokeCircle(m.cx, m.cy, m.r * 0.8 * (0.12 + 0.88 * p));
    }
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  _sketchSeg(rnd, x1, y1, x2, y2, mag) {
    const pts = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      const off = (rnd() - 0.5) * 2 * mag;
      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  _drawPath(g, pts, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < pts.length - 1; i++)
      g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }

  // the main stroke plus a faint offset shadow, like a pencil going twice
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

  _roundRectPts(x, y, w, h, r, seg = 5) {
    r = Math.min(r, w / 2, h / 2);
    const pts = [];
    const arc = (cx, cy, a0) => {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (Math.PI / 2) * (i / seg);
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
    };
    arc(x + w - r, y + r, -Math.PI / 2);
    arc(x + w - r, y + h - r, 0);
    arc(x + r, y + h - r, Math.PI / 2);
    arc(x + r, y + r, Math.PI);
    pts.push({ ...pts[0] });
    return pts;
  }

  _pencilRoundRect(g, rnd, x, y, w, h, r, width, color, alpha, mag = 0.8) {
    const pts = this._roundRectPts(x, y, w, h, r);
    for (let i = 1; i < pts.length; i++)
      this._pencilSeg(
        g,
        rnd,
        pts[i - 1].x,
        pts[i - 1].y,
        pts[i].x,
        pts[i].y,
        width,
        color,
        alpha,
        mag,
      );
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = Math.max(18, Math.round(r * 0.5));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.4;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _pencilArc(g, rnd, cx, cy, r, a0, a1, width, color, alpha) {
    const steps = Math.max(8, Math.ceil((Math.abs(a1 - a0) * r) / 8));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const jr = r + (rnd() - 0.5) * 1.4;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _pencilEllipse(g, rnd, cx, cy, rx, ry, width, color, alpha) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const j = (rnd() - 0.5) * 1.2;
      pts.push({
        x: cx + Math.cos(a) * (rx + j),
        y: cy + Math.sin(a) * (ry + j),
      });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── the desk (rebuilt on resize) ───────────────────────────────────────────

  _phoneLayout(W, H) {
    const PADDING = 0.82;
    const PHONE_ART_WIDTH = 380;
    const PHONE_ART_HEIGHT = 790;
    const s = Math.min(
      (W * PADDING) / PHONE_ART_WIDTH,
      (H * PADDING) / PHONE_ART_HEIGHT,
    );
    return { x: W / 2, y: H / 2 + 14, s };
  }

  _buildDesk(W, H) {
    for (const o of this._envObjs) o.destroy();
    this._envObjs = [];
    const add = (o) => {
      this._envObjs.push(o);
      return o;
    };
    const P = this._phoneLayout(W, H);
    const u = H / 720;
    const rnd = this._rng(3131);

    // wooden desk, seen from above, under a lamp in the top-left corner
    const g = add(this.add.graphics().setDepth(-10));
    g.fillGradientStyle(0x1b1713, 0x1a1612, 0x0e0c0a, 0x0d0b09, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(0xffcf8a, 0.022);
      g.fillCircle(W * 0.02, -H * 0.05, Math.max(W, H) * (0.12 + i * 0.1));
    }
    // planks and wood grain
    const seams = [0.2, 0.5, 0.8];
    for (let p = 0; p < 4; p++) {
      const top = p === 0 ? 0 : H * seams[p - 1];
      const bot = p < 3 ? H * seams[p] : H;
      for (let k = 0; k < 5; k++) {
        const y0 = top + (bot - top) * (0.12 + k * 0.19) + (rnd() - 0.5) * 6;
        const amp = 2 + rnd() * 4;
        const freq = 0.004 + rnd() * 0.006;
        const ph = rnd() * 6.28;
        const pts = [];
        for (let x = -10; x <= W + 40; x += 40)
          pts.push({ x, y: y0 + Math.sin(x * freq + ph) * amp });
        this._drawPath(g, pts, 1, MP_SKETCH, 0.045 + rnd() * 0.03);
      }
    }
    for (const f of seams) {
      const y = H * f;
      this._pencilSeg(
        g,
        rnd,
        -10,
        y + 3,
        W + 10,
        y + 3,
        1.4,
        0x000000,
        0.35,
        1.5,
      );
      this._pencilSeg(
        g,
        rnd,
        -10,
        y,
        W + 10,
        y + (rnd() - 0.5) * 4,
        1.2,
        MP_SKETCH,
        0.16,
        2,
      );
    }
    for (const [kx, ky] of [
      [0.13, 0.62],
      [0.86, 0.36],
    ]) {
      for (let r = 1; r <= 3; r++)
        this._pencilEllipse(
          g,
          rnd,
          W * kx,
          H * ky,
          9 * r * u,
          4 * r * u,
          1,
          MP_SKETCH,
          0.07,
        );
    }

    // the things on the desk, only if there's room beside the phone
    const Lw = P.x - 200 * P.s;
    this._mug = null;
    if (Lw > 150) {
      const lx = Lw * 0.5;
      const rx = W - Lw * 0.5;
      const items = add(this.add.graphics().setDepth(-8));
      const mr = Math.min(Lw * 0.2, H * 0.1);
      this._mug = { cx: lx + Lw * 0.08, cy: H * 0.34, r: mr };
      this._drawMug(items, rnd, this._mug.cx, this._mug.cy, mr);
      this._drawPencil(
        items,
        rnd,
        rx - Lw * 0.04,
        H * 0.74,
        Math.min(Lw * 0.7, H * 0.5),
        -0.42,
      );
      this._drawNote(
        add,
        rx + Lw * 0.02,
        H * 0.32,
        Math.min(Lw * 0.42, H * 0.27),
      );
    }

    // coffee ripples, the screen's glow on the desk, buzz marks
    this._rippleGfx = add(this.add.graphics().setDepth(-7));
    const glow = add(this.add.graphics().setDepth(-6));
    const gy = P.y - 218 * P.s;
    for (let i = 6; i >= 1; i--) {
      glow.fillStyle(0xa8d67c, 0.025);
      glow.fillEllipse(P.x, gy, (220 + i * 55) * P.s, (160 + i * 45) * P.s);
    }
    this._screenGlow = glow;
    this._buzzGfx = add(this.add.graphics().setDepth(1));

    // vignette
    const vg = add(this.add.graphics().setDepth(15));
    const v = Math.min(W, H) * 0.24;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.7,
      0.7,
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
      0.8,
      0.8,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.55,
      0,
      0.55,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.7,
      0,
      0.7,
    );
    vg.fillRect(W - v, 0, v, H);
  }

  // a mug of coffee, seen from above (its surface ripples when the phone buzzes)
  _drawMug(g, rnd, cx, cy, R) {
    // shadows
    g.fillStyle(0x000000, 0.32).fillCircle(
      cx + R * 0.14,
      cy + R * 0.18,
      R * 1.03,
    );
    g.fillStyle(0x000000, 0.32).fillRoundedRect(
      cx - R * 1.36,
      cy - R * 0.16 + R * 0.18,
      R * 0.62,
      R * 0.32,
      R * 0.15,
    );
    // handle
    g.fillStyle(0x23272d).fillRoundedRect(
      cx - R * 1.5,
      cy - R * 0.16,
      R * 0.62,
      R * 0.32,
      R * 0.15,
    );
    this._pencilRoundRect(
      g,
      rnd,
      cx - R * 1.5,
      cy - R * 0.16,
      R * 0.62,
      R * 0.32,
      R * 0.15,
      1.3,
      MP_SKETCH,
      0.55,
      0.5,
    );
    // cup
    g.fillStyle(0x23272d).fillCircle(cx, cy, R);
    this._pencilCircle(g, rnd, cx, cy, R, 1.6, MP_SKETCH, 0.65);
    // coffee
    g.fillStyle(0x1f130b).fillCircle(cx, cy, R * 0.84);
    g.fillStyle(0x3b2616, 0.55).fillCircle(
      cx + R * 0.05,
      cy + R * 0.05,
      R * 0.6,
    );
    this._pencilCircle(g, rnd, cx, cy, R * 0.86, 1, MP_SKETCH, 0.35);
    g.fillStyle(0xffe0b0, 0.14).fillEllipse(
      cx - R * 0.32,
      cy - R * 0.42,
      R * 0.5,
      R * 0.14,
    );
    // an old coffee ring on the desk
    this._pencilArc(
      g,
      rnd,
      cx + R * 1.3,
      cy + R * 1.05,
      R * 0.78,
      0.4,
      5.3,
      1.2,
      0x8a6038,
      0.22,
    );
  }

  // a pencil lying on the desk
  _drawPencil(g, rnd, cx, cy, L, ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const T = (lx, ly) => ({
      x: cx + lx * c - ly * s,
      y: cy + lx * s + ly * c,
    });
    const w = L * 0.055;
    const x0 = -L / 2;
    const xE = x0 + L * 0.07; // eraser | ferrule
    const xF = xE + L * 0.06; // ferrule | body
    const xB = L / 2 - L * 0.16; // body | sharpened wood
    const xW = L / 2 - L * 0.035; // wood | graphite
    const poly = (pts, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillPoints(
        pts.map(([a, b]) => T(a, b)),
        true,
      );
    };
    const seg = (a, b, alpha = 0.6, width = 1.2) => {
      const p = T(...a);
      const q = T(...b);
      this._pencilSeg(g, rnd, p.x, p.y, q.x, q.y, width, MP_SKETCH, alpha, 0.5);
    };

    // shadow
    g.fillStyle(0x000000, 0.3);
    g.fillPoints(
      [
        [x0, -w / 2],
        [xB, -w / 2],
        [L / 2, 0],
        [xB, w / 2],
        [x0, w / 2],
      ].map(([a, b]) => {
        const p = T(a, b);
        return { x: p.x + 6, y: p.y + 8 };
      }),
      true,
    );
    poly(
      [
        [x0, -w / 2],
        [xE, -w / 2],
        [xE, w / 2],
        [x0, w / 2],
      ],
      0x6e4546,
    );
    poly(
      [
        [xE, -w / 2],
        [xF, -w / 2],
        [xF, w / 2],
        [xE, w / 2],
      ],
      0x5d6166,
    );
    poly(
      [
        [xF, -w / 2],
        [xB, -w / 2],
        [xB, w / 2],
        [xF, w / 2],
      ],
      0x5a4b22,
    );
    poly(
      [
        [xB, -w / 2],
        [xW, -w * 0.16],
        [xW, w * 0.16],
        [xB, w / 2],
      ],
      0x8a7456,
    );
    poly(
      [
        [xW, -w * 0.16],
        [L / 2, 0],
        [xW, w * 0.16],
      ],
      0x2b2b2b,
    );
    // outline and facets
    seg([x0, -w / 2], [xB, -w / 2]);
    seg([x0, w / 2], [xB, w / 2]);
    seg([x0, -w / 2], [x0, w / 2]);
    seg([xB, -w / 2], [L / 2, 0]);
    seg([xB, w / 2], [L / 2, 0]);
    seg([xE, -w / 2], [xE, w / 2], 0.5, 1);
    seg([xF, -w / 2], [xF, w / 2], 0.5, 1);
    seg([xE + (xF - xE) * 0.5, -w / 2], [xE + (xF - xE) * 0.5, w / 2], 0.3, 1);
    seg([xF, -w * 0.17], [xB, -w * 0.17], 0.22, 1);
    seg([xF, w * 0.17], [xB, w * 0.17], 0.22, 1);
    seg([xB, -w / 2], [xB, w / 2], 0.35, 1);
  }

  // a sticky note with a scribbled warning
  _drawNote(add, cx, cy, S) {
    const rnd = this._rng(777);
    const c = add(this.add.container(cx, cy).setDepth(-8).setAngle(6));
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRect(-S / 2 + 6, -S / 2 + 8, S, S);
    g.fillStyle(0x2c2921).fillRect(-S / 2, -S / 2, S, S);
    g.fillStyle(MP_SKETCH, 0.05).fillRect(-S / 2, -S / 2, S, S);
    g.fillStyle(0x000000, 0.14).fillRect(-S / 2, -S / 2, S, S * 0.13);
    this._pencilRect(g, rnd, -S / 2, -S / 2, S, S, 1.3, MP_SKETCH, 0.55, 1.2);
    c.add(g);

    const fs = Math.round(S * 0.1);
    const tx = -S * 0.38;
    const ty = -S * 0.3;
    const note = this.add
      .text(tx, ty, "don't answer\nif you don't\nknow who's\ncalling.", {
        fontFamily: MP_FONT,
        fontSize: fs + "px",
        color: "#d9cfb4",
        lineSpacing: Math.round(S * 0.035),
      })
      .setAlpha(0.85);
    c.add(note);
    // "don't" underlined twice, in a hurry
    const ul = this.add.graphics();
    this._pencilSeg(
      ul,
      rnd,
      tx,
      ty + fs * 1.15,
      tx + fs * 3,
      ty + fs * 1.2,
      1,
      MP_SKETCH,
      0.55,
      0.8,
    );
    this._pencilSeg(
      ul,
      rnd,
      tx + 2,
      ty + fs * 1.32,
      tx + fs * 2.8,
      ty + fs * 1.34,
      1,
      MP_SKETCH,
      0.4,
      0.8,
    );
    c.add(ul);
  }

  // ── the phone ──────────────────────────────────────────────────────────────

  setPhoneScale() {
    const L = this._phoneLayout(
      this.cameras.main.width,
      this.cameras.main.height,
    );
    this.phoneContainer.setScale(L.s);
    this.phoneContainer.setPosition(L.x, L.y).setRotation(0);
    this._phoneBase = L;
  }

  drawPhoneBody(g) {
    g.clear();
    const rnd = this._rng(4242);

    const bodyW = 340;
    const bodyH = 720;
    const bodyX = -bodyW / 2;
    const bodyY = -bodyH / 2;

    // shadow on the desk (the lamp is top-left)
    g.fillStyle(0x000000, 0.2).fillRoundedRect(
      bodyX + 24,
      bodyY + 32,
      bodyW,
      bodyH,
      66,
    );
    g.fillStyle(0x000000, 0.35).fillRoundedRect(
      bodyX + 12,
      bodyY + 18,
      bodyW,
      bodyH,
      62,
    );

    // antenna stub
    const antX = bodyX + bodyW - 62;
    const antY = bodyY - 62;
    g.fillStyle(0x13161b).fillRoundedRect(antX, antY, 15, 70, 6);
    this._pencilRoundRect(
      g,
      rnd,
      antX,
      antY,
      15,
      70,
      6,
      1.4,
      MP_SKETCH,
      0.6,
      0.4,
    );
    this._pencilSeg(
      g,
      rnd,
      antX + 4,
      antY + 8,
      antX + 4,
      antY + 52,
      1,
      MP_SKETCH,
      0.2,
      0.3,
    );

    // body
    g.fillStyle(0x171a1f).fillRoundedRect(bodyX, bodyY, bodyW, bodyH, 62);
    g.fillStyle(MP_SKETCH, 0.03).fillRoundedRect(
      bodyX,
      bodyY,
      bodyW,
      bodyH,
      62,
    );
    this._pencilRoundRect(
      g,
      rnd,
      bodyX,
      bodyY,
      bodyW,
      bodyH,
      62,
      2,
      MP_SKETCH,
      0.72,
      1.2,
    );
    this._pencilRoundRect(
      g,
      rnd,
      bodyX + 12,
      bodyY + 12,
      bodyW - 24,
      bodyH - 24,
      50,
      1,
      MP_SKETCH,
      0.26,
      1,
    );

    // gloss: a few hatch strokes along the left edge
    for (let i = 0; i < 10; i++) {
      const yy = bodyY + 110 + i * 15;
      this._pencilSeg(
        g,
        rnd,
        bodyX + 22,
        yy + 10,
        bodyX + 32,
        yy,
        1,
        MP_SKETCH,
        0.14,
        0.3,
      );
    }

    // earpiece, above the screen
    const speakerY = bodyY + 20;
    g.fillStyle(0x0b0d10).fillRoundedRect(-46, speakerY, 92, 16, 8);
    this._pencilRoundRect(
      g,
      rnd,
      -46,
      speakerY,
      92,
      16,
      8,
      1.2,
      MP_SKETCH,
      0.5,
      0.5,
    );
    for (let i = 0; i < 10; i++) {
      g.fillStyle(MP_SKETCH, 0.35).fillCircle(-33 + i * 7.3, speakerY + 8, 1.5);
    }

    // brand plate, under the screen (like the old phones)
    const logoY = -116;
    g.fillStyle(0x0f1115).fillRoundedRect(-40, logoY, 80, 13, 6);
    this._pencilRoundRect(
      g,
      rnd,
      -40,
      logoY,
      80,
      13,
      6,
      1.1,
      MP_SKETCH,
      0.4,
      0.4,
    );

    // side buttons
    for (const [x, y, w, h] of [
      [bodyX - 6, bodyY + 160, 6, 50],
      [bodyX - 6, bodyY + 230, 6, 38],
      [bodyX + bodyW, bodyY + 185, 6, 58],
    ]) {
      g.fillStyle(0x13161b).fillRoundedRect(x, y, w, h, 3);
      this._pencilRoundRect(g, rnd, x, y, w, h, 3, 1, MP_SKETCH, 0.45, 0.3);
    }

    // microphone holes, under the keypad
    const micY = bodyY + bodyH - 24;
    for (let i = 0; i < 5; i++) {
      g.fillStyle(MP_SKETCH, 0.3).fillCircle(-18 + i * 9, micY, 1.9);
    }
  }

  drawScreen() {
    this.screenContainer = this.add.container(0, -218);
    this.phoneContainer.add(this.screenContainer);

    const g = this.add.graphics();
    this.screenContainer.add(g);
    const rnd = this._rng(5151);

    const w = 210;
    const h = 148;
    const x = -w / 2;
    const y = -h / 2;

    // bezel, in pencil
    g.fillStyle(0x0a0c0f).fillRoundedRect(x - 16, y - 16, w + 32, h + 32, 19);
    this._pencilRoundRect(
      g,
      rnd,
      x - 16,
      y - 16,
      w + 32,
      h + 32,
      19,
      1.6,
      MP_SKETCH,
      0.6,
      0.7,
    );
    this._pencilRoundRect(
      g,
      rnd,
      x - 6,
      y - 6,
      w + 12,
      h + 12,
      11,
      1,
      MP_SKETCH,
      0.28,
      0.5,
    );

    // the LCD — unchanged
    g.fillStyle(0x91ad6f).fillRoundedRect(x, y, w, h, 8);
    g.fillStyle(0xb9cc92, 0.18).fillRoundedRect(x + 4, y + 4, w - 8, 18, 5);

    for (let row = 0; row < h; row += 4) {
      g.lineStyle(1, 0x334420, 0.18);
      g.lineBetween(x + 1, y + row, x + w - 1, y + row);
    }

    for (let col = 0; col < w; col += 4) {
      g.lineStyle(1, 0x334420, 0.07);
      g.lineBetween(x + col, y + 1, x + col, y + h - 1);
    }

    g.fillStyle(0xffffff, 0.1).fillTriangle(
      x,
      y,
      x + w * 0.5,
      y,
      x,
      y + h * 0.52,
    );

    this.signalGfx = this.add.graphics();
    this.screenContainer.add(this.signalGfx);

    this.signalBaseX = x + 11;
    this.signalBaseY = y + 11;
    this.drawSignalBars(1);

    const statusY = y + 11;
    const statusColor = 0x31461d;

    g.lineStyle(1.5, statusColor).strokeRect(x + w - 36, statusY, 20, 9);
    g.fillStyle(statusColor).fillRect(x + w - 16, statusY + 3, 3, 4);
    g.fillStyle(statusColor).fillRect(x + w - 33, statusY + 3, 15, 4);
  }

  drawSignalBars(activeBars = 1) {
    if (!this.signalGfx) return;
    const color = 0x31461d;
    const x = this.signalBaseX;
    const y = this.signalBaseY;
    this.signalGfx.clear();
    for (let i = 0; i < 5; i++) {
      const alpha = i < activeBars ? 1 : 0.2;
      this.signalGfx
        .fillStyle(color, alpha)
        .fillRect(x + i * 6, y + (12 - (i + 1) * 2), 4, (i + 1) * 2);
    }
  }

  startSignalAnimation() {
    if (this.signalTimer) {
      this.signalTimer.remove(false);
      this.signalTimer = null;
    }
    let bars = 1;
    this.signalTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.drawSignalBars(bars);
        bars++;
        if (bars > 5) {
          bars = 1;
        }
      },
    });
  }

  startCallingBlink() {
    if (this.callBlinkTween) {
      this.callBlinkTween.stop();
      this.callBlinkTween = null;
    }
    this.callBlinkTween = this.tweens.add({
      targets: this.callerText,
      alpha: 0.28,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createKeypad() {
    // a pencil-drawn key; the light "flash" answers every press
    const drawKeyShape = (g, rnd, w, h, r, fill, outline, outlineAlpha) => {
      g.fillStyle(0x000000, 0.45).fillRoundedRect(
        -w / 2 + 2,
        -h / 2 + 4,
        w,
        h,
        r,
      );
      g.fillStyle(fill).fillRoundedRect(-w / 2, -h / 2, w, h, r);
      g.fillStyle(MP_SKETCH, 0.04).fillRoundedRect(-w / 2, -h / 2, w, h, r);
      this._pencilRoundRect(
        g,
        rnd,
        -w / 2,
        -h / 2,
        w,
        h,
        r,
        1.3,
        outline,
        outlineAlpha,
        0.6,
      );
      this._pencilSeg(
        g,
        rnd,
        -w / 2 + r * 0.8,
        -h / 2 + 6,
        w / 2 - r * 0.8,
        -h / 2 + 6,
        1,
        MP_SKETCH,
        0.14,
        0.3,
      );
    };
    const addFlash = (c, w, h, r) => {
      const f = this.add.graphics().setAlpha(0);
      f.fillStyle(MP_SKETCH, 0.16).fillRoundedRect(-w / 2, -h / 2, w, h, r);
      c.add(f);
      return f;
    };
    const pressFx = (c, flash, baseY, dy) => {
      this.tweens.add({
        targets: c,
        y: baseY + dy,
        duration: 50,
        yoyo: true,
        ease: "Power1",
      });
      flash.setAlpha(1);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 240,
        ease: "Sine.easeOut",
      });
    };

    const createSoftButton = ({
      x,
      y,
      w,
      h,
      text,
      fill = 0x1d2127,
      outline = MP_SKETCH,
      textColor = "#e8dcc0",
      onDown = null,
    }) => {
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      drawKeyShape(g, this._rng(900 + x), w, h, h / 2, fill, outline, 0.6);
      const flash = addFlash(c, w, h, h / 2);
      const label = this.add
        .text(0, 0, text, {
          fontFamily: MP_FONT,
          fontSize: "12px",
          color: textColor,
        })
        .setOrigin(0.5);
      c.add(label);
      if (onDown) {
        const baseY = y;
        c.setInteractive(
          new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
          Phaser.Geom.Rectangle.Contains,
        );
        c.on("pointerdown", () => {
          if (this.isSolved) return;
          pressFx(c, flash, baseY, 2);
          this.playKeySound();
          onDown();
        });
      }
      return c;
    };

    const createNumberKey = ({ x, y, label, subLabel }) => {
      const w = 84;
      const h = 52;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      drawKeyShape(
        g,
        this._rng(100 + label.charCodeAt(0) * 7),
        w,
        h,
        14,
        0x1d2127,
        MP_SKETCH,
        0.6,
      );
      const flash = addFlash(c, w, h, 14);
      const main = this.add
        .text(0, subLabel ? -9 : 0, label, {
          fontFamily: MP_FONT,
          fontSize: label === "*" || label === "#" ? "24px" : "26px",
          color: "#e8dcc0",
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(0, 14, subLabel, {
          fontFamily: MP_FONT,
          fontSize: "12px",
          color: "#a8a08a",
        })
        .setOrigin(0.5);
      c.add([main, sub]);
      const baseY = y;
      c.setInteractive(
        new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains,
      );
      c.on("pointerdown", () => {
        if (this.isSolved) return;
        pressFx(c, flash, baseY, 3);
        this.playKeySound();
        this.handleKeyPress(label);
      });
      return c;
    };

    const leftSoftKey = createSoftButton({
      x: -92,
      y: -112,
      w: 84,
      h: 25,
      text: "SELECT",
    });
    this.rightSoftKey = createSoftButton({
      x: 92,
      y: -112,
      w: 84,
      h: 25,
      text: "BACK",
      fill: 0x3a1b21,
      outline: 0xd89aa4,
      textColor: "#f0c9cf",
      onDown: () => this.handleKeyPress("#"),
    });
    this.keypadContainer.add([leftSoftKey, this.rightSoftKey]);

    // navigation button
    this.navContainer = this.add.container(0, -48);
    this.navG = this.add.graphics();
    this.navContainer.add(this.navG);
    const rnd = this._rng(6060);
    this.navG.fillStyle(0x000000, 0.45).fillEllipse(2, 4, 108, 54);
    this.navG.fillStyle(0x14171b).fillEllipse(0, 0, 108, 54);
    this._pencilEllipse(this.navG, rnd, 0, 0, 54, 27, 1.3, MP_SKETCH, 0.55);
    this.navG.fillStyle(0x1d2127).fillCircle(0, 0, 27);
    this._pencilCircle(this.navG, rnd, 0, 0, 27, 1.3, MP_SKETCH, 0.6);
    // direction marks
    for (const [dx, dy] of [
      [-42, 0],
      [42, 0],
    ]) {
      const sx = Math.sign(dx);
      this._pencilSeg(
        this.navG,
        rnd,
        dx - sx * 3,
        dy - 4,
        dx + sx * 2,
        dy,
        1,
        MP_SKETCH,
        0.45,
        0.2,
      );
      this._pencilSeg(
        this.navG,
        rnd,
        dx + sx * 2,
        dy,
        dx - sx * 3,
        dy + 4,
        1,
        MP_SKETCH,
        0.45,
        0.2,
      );
    }
    this.menuText = this.add
      .text(0, 0, "MENU", {
        fontFamily: MP_FONT,
        fontSize: "12px",
        color: "#e8dcc0",
      })
      .setOrigin(0.5);
    this.navContainer.add(this.menuText);
    this.keypadContainer.add(this.navContainer);

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
    const keyLabels = {
      1: ".,?!",
      2: "ABC",
      3: "DEF",
      4: "GHI",
      5: "JKL",
      6: "MNO",
      7: "PQRS",
      8: "TUV",
      9: "WXYZ",
      0: "+0",
      "*": "spc",
      "#": "del",
    };
    const xSpacing = 100;
    const ySpacing = 60;
    const startY = 40;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const row = Math.floor(i / 3);
      const col = i % 3;
      const keyObj = createNumberKey({
        x: (col - 1) * xSpacing,
        y: startY + row * ySpacing,
        label: key,
        subLabel: keyLabels[key],
      });
      this.keypadContainer.add(keyObj);
    }
  }

  startVibrationSoundLoop() {
    if (this.vibrationTimer) {
      this.vibrationTimer.remove(false);
      this.vibrationTimer = null;
    }
    this.playVibrationSoundPulse();
    this.vibrationTimer = this.time.addEvent({
      delay: MP_BUZZ_EVERY,
      loop: true,
      callback: () => {
        this.playVibrationSoundPulse();
      },
    });
  }

  playVibrationSoundPulse() {
    if (this.isSolved) {
      if (this.vibrationSound && this.vibrationSound.isPlaying) {
        this.vibrationSound.stop();
      }
      return;
    }
    // the phone shakes on the desk even while the browser keeps audio muted
    this._buzz();
    if (!this.vibrationSound) return;
    if (this.vibrationSound.isPlaying) return;
    if (this.sound.locked) {
      if (!this.waitingForAudioUnlock) {
        this.waitingForAudioUnlock = true;
        this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
          this.waitingForAudioUnlock = false;
          if (this.isSolved || !this.vibrationSound) return;
          this.refreshSfxVolume();
          this.vibrationSound.play();
        });
      }
      return;
    }
    this.refreshSfxVolume();
    this.vibrationSound.play();
  }

  playKeySound() {
    if (!this.keySound) return;
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        if (!this.isSolved && this.keySound) {
          this.refreshSfxVolume();
          this.keySound.play();
        }
      });
      return;
    }
    this.refreshSfxVolume();
    this.keySound.play();
  }

  refreshSfxVolume() {
    const volume = window.GameAudio ? window.GameAudio.sfxVol : 0.8;
    if (this.vibrationSound) this.vibrationSound.setVolume(volume * 0.25);
    if (this.keySound) this.keySound.setVolume(volume * 0.62);
  }

  handleKeyPress(key) {
    clearTimeout(this.keyTimeout);
    if (key === "*" || key === "#") {
      this.confirmChar();
      if (key === "#") {
        this.userInput = this.userInput.slice(0, -1);
      } else if (key === "*") {
        this.userInput += " ";
      }
      this.lastKey = null;
      this.keyPressCount = 0;
    } else {
      if (this.lastKey !== key) {
        this.confirmChar();
        this.lastKey = key;
        this.keyPressCount = 1;
      } else {
        this.keyPressCount++;
      }
      const chars = this.keymap[key];
      const charIndex = (this.keyPressCount - 1) % chars.length;
      this.lastChar = chars[charIndex];
      this.keyTimeout = setTimeout(() => this.confirmChar(), 800);
    }
    this.updateScreen();
  }

  confirmChar() {
    if (this.lastChar) {
      this.userInput += this.lastChar;
      this.lastChar = "";
      this.lastKey = null;
      this.keyPressCount = 0;
      this.updateScreen();
    }
  }

  updateScreen() {
    const currentInput = (this.userInput + this.lastChar).slice(-12);
    this.screenInput.setText(currentInput);
    if (!this.isCallAnswered && currentInput.toUpperCase() === "GEORGE") {
      this.showAnswerButton();
    }
  }

  showAnswerButton() {
    if (this.isCallAnswered) return;
    this.isCallAnswered = true;
    clearTimeout(this.keyTimeout);
    this.userInput = "";
    this.lastChar = "";
    this.lastKey = null;
    this.keyPressCount = 0;
    this.screenInput.setText("");

    // the round MENU button turns into a green, pencil-drawn ANSWER button
    this.menuText.setText("ANSWER").setFontSize("16px").setColor("#e2f0d6");
    this.navG.clear();
    const rnd = this._rng(2468);
    const btnW = 120;
    const btnH = 50;
    const btnR = 20;
    this.navG
      .fillStyle(0x000000, 0.5)
      .fillRoundedRect(-btnW / 2 + 2, -btnH / 2 + 5, btnW, btnH, btnR);
    this.navG
      .fillStyle(0x2a4a1a)
      .fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnR);
    this.navG
      .fillStyle(0x9fd27a, 0.14)
      .fillRoundedRect(-btnW / 2 + 8, -btnH / 2 + 5, btnW - 16, 10, 6);
    this._pencilRoundRect(
      this.navG,
      rnd,
      -btnW / 2,
      -btnH / 2,
      btnW,
      btnH,
      btnR,
      1.6,
      0xbfe39a,
      0.8,
      0.8,
    );

    // it breathes, so the player notices it
    this._answerPulse = this.tweens.add({
      targets: this.navContainer,
      scale: 1.07,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.navContainer
      .setInteractive(
        new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      )
      .on("pointerdown", () => this.revealRealClue());
  }

  revealRealClue() {
    this.playKeySound();
    this.solve();
  }

  solve() {
    if (this.isSolved) return;
    this.isSolved = true;
    this.confirmChar();
    clearTimeout(this.keyTimeout);
    if (this.vibrationTimer) {
      this.vibrationTimer.remove(false);
      this.vibrationTimer = null;
    }
    if (this.signalTimer) {
      this.signalTimer.remove(false);
      this.signalTimer = null;
    }
    if (this.callBlinkTween) {
      this.callBlinkTween.stop();
      this.callBlinkTween = null;
    }
    if (this._answerPulse) {
      this._answerPulse.stop();
      this._answerPulse = null;
      this.navContainer.setScale(1);
    }
    if (this.vibrationSound && this.vibrationSound.isPlaying) {
      this.vibrationSound.stop();
    }
    this.callerText.setAlpha(1);
    this.callerNumber.setAlpha(1);
    this.callerText.setText("CALLER IDENTIFIED");
    this.callerNumber.setText("GEORGE");
    this.screenInput.setText("");
    this.drawSignalBars(5);
    this.statusText.setText("You have revealed the name. Execute it.");
    this.statusText.setColor("#1aaf7a");
    this.keypadContainer.list.forEach((keyObj) => {
      if (keyObj.disableInteractive) {
        keyObj.disableInteractive();
      }
    });
    if (this.navContainer) {
      this.navContainer.disableInteractive();
    }
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
        fontFamily: MP_FONT,
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
    if (this._onResize) this.events.off("canvas_resized", this._onResize);
    this._onResize = null;
    this.time.removeAllEvents();
    this.tweens.killAll();
    clearTimeout(this.keyTimeout);

    if (this.vibrationSound) {
      this.vibrationSound.stop();
    }
    this._envObjs = [];
    this._ripples = [];
    this._mug = null;
    this._phoneBase = null;
  }
}
