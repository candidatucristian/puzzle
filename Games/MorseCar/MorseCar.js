class MorseCarScene extends Phaser.Scene {
  constructor() {
    super({ key: "MorseCar" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  // ── Morse data ─────────────────────────────────────────────────────────────
  // SUMMER = S U M M E R  =>  S=...  U=..-  M=--  E=.  R=.-.
  get MORSE_WORD() { return "SUMMER"; }
  get MORSE_MAP()  { return { S: "...", U: "..-", M: "--", E: ".", R: ".-." }; }
  get DIT()   { return 130; }
  get DAH()   { return 340; }
  get T_GAP() { return 90;  }   // gap between symbols of the same letter
  get L_GAP() { return 380; }   // gap between letters
  get W_GAP() { return 1000; }  // pause before sequence repeats

  preload() {
    this.load.audio("rain_loop", "assets/sounds/MorseCar/rain_loop.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.isSolved    = false;
    this._hornActive = false;
    this._carX       = -220;
    this._carY       = H * 0.635;
    this._carStopX   = W * 0.16;
    this._audioCtx   = null;
    this._rainDrops  = null;

    // ── Graphics layers ───────────────────────────────────────────────────────
    this._bgGfx       = this.add.graphics().setDepth(-10);
    this._roadGfx     = this.add.graphics().setDepth(-9);
    this._buildingGfx = this.add.graphics().setDepth(-8);
    this._lampGfx     = this.add.graphics().setDepth(-7);
    this._pudleGfx    = this.add.graphics().setDepth(-6);
    this._carGfx      = this.add.graphics().setDepth(5);
    this._dogGfx      = this.add.graphics().setDepth(6);
    this._rainGfx     = this.add.graphics().setDepth(20);

    this._drawBackground(W, H);
    this._drawRoad(W, H);
    this._drawBuildings(W, H);
    this._drawLamps(W, H);
    this._drawPuddles(W, H);
    this._drawDog(W, H);
    this._drawCar(this._carX, this._carY, false);

    // ── Rain particles ────────────────────────────────────────────────────────
    this._rainDrops = Array.from({ length: 280 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      len: 9  + Math.random() * 15,
      spd: 14 + Math.random() * 10,
      a:   0.2 + Math.random() * 0.35,
      w:   0.6 + Math.random() * 0.8,
    }));

    // ── Rain sound ────────────────────────────────────────────────────────────
    this.rainSound = null;
    if (this.cache.audio.exists("rain_loop")) {
      this.rainSound = this.sound.add("rain_loop", { loop: true, volume: 0.35 });
      this._playWhenReady(this.rainSound);
    }

    // ── Level label ───────────────────────────────────────────────────────────
    this.levelText = this.add
      .text(W - 30, 30, "Level 4", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setAlpha(0);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });

    // ── Status text (visible only after solve) ────────────────────────────────
    this.statusText = this.add
      .text(W / 2, 50, "", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#1aaf7a",
      })
      .setOrigin(0.5);

    // ── Drive-in tween, then start Morse ─────────────────────────────────────
    this.tweens.addCounter({
      from: -220,
      to: this._carStopX,
      duration: 2800,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        this._carX = tween.getValue();
        if (!this._hornActive) {
          this._drawCar(this._carX, this._carY, false);
        }
      },
      onComplete: () => {
        this._startMorseSequence();
      },
    });

    // ── Resize handler ────────────────────────────────────────────────────────
    this.events.on("canvas_resized", (size) => {
      const w = size.width;
      const h = size.height;
      this._bgGfx.clear();
      this._roadGfx.clear();
      this._buildingGfx.clear();
      this._lampGfx.clear();
      this._pudleGfx.clear();
      this._dogGfx.clear();
      this._drawBackground(w, h);
      this._drawRoad(w, h);
      this._drawBuildings(w, h);
      this._drawLamps(w, h);
      this._drawPuddles(w, h);
      this._drawDog(w, h);
      this._carY      = h * 0.635;
      this._carStopX  = w * 0.16;
      this._drawCar(this._carX, this._carY, this._hornActive);
      this.levelText.setPosition(w - 30, 30);
      this.statusText.setPosition(w / 2, 50);
    });

    // ── Fade-in overlay ───────────────────────────────────────────────────────
    if (!this.skipFadeIn) {
      const overlay = this.add
        .rectangle(0, 0, W, H, 0x000000)
        .setOrigin(0)
        .setDepth(200);
      const label = this.add
        .text(W / 2, H / 2, "Level 4...", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(201);
      this.tweens.add({
        targets: [overlay, label],
        alpha: 0,
        duration: 1000,
        delay: 500,
        onComplete: () => {
          overlay.destroy();
          label.destroy();
        },
      });
    }
  }

  // ── Procedural scene drawing ──────────────────────────────────────────────

  _drawBackground(W, H) {
    const g = this._bgGfx;
    g.fillGradientStyle(0x080c16, 0x080c16, 0x04060e, 0x04060e, 1);
    g.fillRect(0, 0, W, H);
  }

  _drawRoad(W, H) {
    const g = this._roadGfx;
    g.clear();
    const roadTop = H * 0.52;
    const roadH   = H * 0.3;

    // Asphalt
    g.fillStyle(0x191c25).fillRect(0, roadTop, W, roadH);

    // Sidewalk above road
    g.fillStyle(0x22252f).fillRect(0, 0, W, roadTop);
    // Sidewalk below road
    g.fillStyle(0x22252f).fillRect(0, roadTop + roadH, W, H - roadTop - roadH);

    // Kerb lines
    g.lineStyle(2, 0x555870, 0.5).lineBetween(0, roadTop, W, roadTop);
    g.lineStyle(2, 0x555870, 0.5).lineBetween(0, roadTop + roadH, W, roadTop + roadH);

    // Subtle asphalt texture lines
    for (let i = 0; i < 8; i++) {
      const ty = roadTop + (roadH / 8) * i;
      g.lineStyle(1, 0xffffff, 0.03).lineBetween(0, ty, W, ty);
    }

    // Center road dashes (white)
    const midY   = roadTop + roadH / 2;
    const dashW  = 44;
    const dashH  = 5;
    const gap    = 60;
    g.fillStyle(0xffffff, 0.45);
    for (let x = 0; x < W; x += dashW + gap) {
      g.fillRect(x, midY - dashH / 2, dashW, dashH);
    }

    // Crosswalk stripes (white, left of centre)
    const cwX = W * 0.33;
    const stripeW = W * 0.012;
    const stripeGap = W * 0.018;
    g.fillStyle(0xffffff, 0.65);
    for (let i = 0; i < 5; i++) {
      g.fillRect(cwX + i * (stripeW + stripeGap), roadTop, stripeW, roadH);
    }
  }

  _drawBuildings(W, H) {
    const g   = this._buildingGfx;
    const roadTop = H * 0.52;
    g.clear();
    this._drawBuilding(g, W * 0.01, H * 0.04, W * 0.28, roadTop - H * 0.04);
    this._drawBuilding(g, W * 0.68, H * 0.06, W * 0.31, roadTop - H * 0.06);
  }

  _drawBuilding(g, x, y, w, h) {
    g.fillStyle(0x0e1118).fillRect(x, y, w, h);
    g.lineStyle(1, 0x3a3f50, 0.6).strokeRect(x, y, w, h);

    const cols = Math.max(1, Math.floor(w / 32));
    const rows = Math.max(1, Math.floor(h / 40));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 8 + c * 32;
        const wy = y + 10 + r * 40;
        if (wx + 18 > x + w || wy + 22 > y + h) continue;
        const lit = (r * 7 + c * 11) % 4 !== 0;
        if (lit) {
          g.fillStyle(0xf0b860, 0.55).fillRect(wx, wy, 18, 22);
          g.fillStyle(0xffffff, 0.12).fillRect(wx, wy, 18, 6);
        } else {
          g.fillStyle(0x07090f).fillRect(wx, wy, 18, 22);
        }
      }
    }
  }

  _drawLamps(W, H) {
    const g       = this._lampGfx;
    const roadTop = H * 0.52;
    g.clear();

    [W * 0.3, W * 0.55, W * 0.8].forEach((lx) => {
      const postH = roadTop * 0.22;
      const postY = roadTop - postH;

      // Post
      g.fillStyle(0x505868).fillRect(lx - 3, postY, 6, postH);
      // Head
      g.fillStyle(0x3e4654).fillRect(lx - 22, postY - 12, 44, 12);
      // Bulb
      g.fillStyle(0xffe080, 0.95).fillCircle(lx, postY - 6, 5);

      // Orange cone glow
      g.fillStyle(0xff9a30, 0.06);
      g.beginPath();
      g.moveTo(lx, postY);
      g.lineTo(lx - 90, roadTop + H * 0.1);
      g.lineTo(lx + 90, roadTop + H * 0.1);
      g.closePath();
      g.fillPath();

      // Cone edge
      g.lineStyle(1, 0xff9a30, 0.09);
      g.lineBetween(lx, postY, lx - 90, roadTop + H * 0.1);
      g.lineBetween(lx, postY, lx + 90, roadTop + H * 0.1);
    });
  }

  _drawPuddles(W, H) {
    const g       = this._pudleGfx;
    const roadTop = H * 0.52;
    const roadH   = H * 0.3;
    g.clear();
    const puddles = [
      { x: W * 0.42, y: roadTop + roadH * 0.35, rx: W * 0.065, ry: H * 0.022 },
      { x: W * 0.7,  y: roadTop + roadH * 0.7,  rx: W * 0.045, ry: H * 0.016 },
      { x: W * 0.22, y: roadTop + roadH * 0.62, rx: W * 0.035, ry: H * 0.012 },
    ];
    puddles.forEach(({ x, y, rx, ry }) => {
      g.fillStyle(0x1e2a40, 0.7).fillEllipse(x, y, rx * 2, ry * 2);
      g.lineStyle(1, 0x4a6080, 0.3).strokeEllipse(x, y, rx * 2, ry * 2);
    });
  }

  _drawCar(x, y, hornActive) {
    const g  = this._carGfx;
    const w  = 165;
    const bh = 62;   // body height
    const rh = 32;   // roof extra height
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.22).fillEllipse(x + w * 0.5, y + 4, w * 0.85, 10);

    // Wheel arches
    g.fillStyle(0x5a0a0a).fillCircle(x + 35,      y - 2, 17);
    g.fillStyle(0x5a0a0a).fillCircle(x + w - 35,  y - 2, 17);

    // Body
    g.fillStyle(0x8b1515).fillRoundedRect(x, y - bh, w, bh, 8);
    g.lineStyle(1, 0x000000, 0.4).strokeRoundedRect(x, y - bh, w, bh, 8);

    // Body highlight
    g.fillStyle(0xffffff, 0.06).fillRoundedRect(x + 6, y - bh + 4, w - 12, 8, 4);

    // Roof
    g.fillStyle(0x6b1010).fillRoundedRect(x + 28, y - bh - rh, w - 55, rh + 6, 7);

    // Windshield
    g.fillStyle(0x1a2a3e, 0.85).fillRoundedRect(x + 30, y - bh - rh + 2, w - 62, rh + 2, 5);
    g.fillStyle(0xaaccee, 0.18).fillRect(x + 32, y - bh - rh + 3, w - 66, 10);

    // Headlights
    const hlColor = hornActive ? 0xffffff : 0xffee80;
    const hlAlpha = hornActive ? 1 : 0.85;
    g.fillStyle(hlColor, hlAlpha).fillRoundedRect(x + w - 14, y - bh + 8,  14, 14, 3);
    g.fillStyle(hlColor, hlAlpha).fillRoundedRect(x + w - 14, y - 26,      14, 10, 3);

    // Headlight glow when horn active
    if (hornActive) {
      g.fillStyle(0xffffff, 0.12).fillEllipse(x + w + 35, y - bh / 2, 75, 30);
    }

    // Tail lights
    g.fillStyle(0xdd2222, 0.9).fillRoundedRect(x, y - bh + 10, 10, 12, 2);
    g.fillStyle(0xdd2222, 0.9).fillRoundedRect(x, y - 24,       10, 10, 2);

    // Wheels
    [x + 35, x + w - 35].forEach((wx) => {
      g.fillStyle(0x111111).fillCircle(wx, y, 16);
      g.lineStyle(1, 0x444444, 0.8).strokeCircle(wx, y, 16);
      g.fillStyle(0x888888, 0.5).fillCircle(wx, y, 7);
      g.fillStyle(0xaaaaaa, 0.3).fillCircle(wx, y, 3);
    });

    // Horn sound-waves (visual indicator)
    if (hornActive) {
      const hx = x + w + 8;
      const hy = y - bh / 2 - 4;
      for (let i = 0; i < 3; i++) {
        g.lineStyle(2 - i * 0.3, 0xffff66, 0.75 - i * 0.2);
        g.beginPath();
        g.arc(hx, hy, 10 + i * 11, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50));
        g.strokePath();
      }
    }
  }

  _drawDog(W, H) {
    const g       = this._dogGfx;
    const roadTop = H * 0.52;
    const roadH   = H * 0.3;
    const dx      = W * 0.43;
    const dy      = roadTop + roadH * 0.55;
    g.clear();

    // Body (sitting, back to viewer)
    g.fillStyle(0x8b6914).fillEllipse(dx, dy - 20, 34, 46);

    // Head
    g.fillStyle(0x9b7920).fillEllipse(dx + 2, dy - 52, 26, 24);

    // Ears
    g.fillStyle(0x7a5810).fillEllipse(dx - 9,  dy - 59, 11, 16);
    g.fillStyle(0x7a5810).fillEllipse(dx + 12, dy - 59, 11, 16);

    // Tail (slightly wagging to the left)
    g.lineStyle(5, 0x9b7920, 0.85);
    g.beginPath();
    g.moveTo(dx - 14, dy - 18);
    g.lineTo(dx - 26, dy - 38);
    g.strokePath();

    // Subtle wet-fur lines
    g.lineStyle(1, 0x6a4e0e, 0.4);
    g.lineBetween(dx - 5, dy - 30, dx - 8, dy - 14);
    g.lineBetween(dx + 5, dy - 30, dx + 8, dy - 14);
  }

  // ── Rain particle update (called every frame) ─────────────────────────────
  _updateRain() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const g = this._rainGfx;
    g.clear();
    this._rainDrops.forEach((d) => {
      g.lineStyle(d.w, 0xaac8ff, d.a);
      g.beginPath();
      g.moveTo(d.x, d.y);
      g.lineTo(d.x + 3, d.y + d.len);
      g.strokePath();
      d.y += d.spd;
      d.x += 2;
      if (d.y > H + 20) {
        d.y = -d.len;
        d.x = Math.random() * W;
      }
    });
  }

  // ── Morse sequence ────────────────────────────────────────────────────────
  _startMorseSequence() {
    if (this.isSolved) return;
    this._playMorseWord(() => {
      this.time.delayedCall(this.W_GAP, () => this._startMorseSequence());
    });
  }

  _playMorseWord(onComplete) {
    let delay = 0;
    const letters = this.MORSE_WORD.split("");

    letters.forEach((letter, li) => {
      const code = this.MORSE_MAP[letter];
      [...code].forEach((sym) => {
        const dur = sym === "." ? this.DIT : this.DAH;
        this.time.delayedCall(delay, () => this._setHorn(true, sym));
        delay += dur;
        this.time.delayedCall(delay, () => this._setHorn(false, sym));
        delay += this.T_GAP;
      });
      if (li < letters.length - 1) delay += this.L_GAP - this.T_GAP;
    });

    this.time.delayedCall(delay, () => onComplete && onComplete());
  }

  _setHorn(on, sym) {
    if (this.isSolved) return;
    this._hornActive = on;
    this._drawCar(this._carX, this._carY, on);
    if (on) {
      this._playHornBeep(sym === "." ? this.DIT : this.DAH);
    }
  }

  // ── Car horn via Web Audio API ─────────────────────────────────────────────
  _playHornBeep(durationMs) {
    if (window.GameAudio && window.GameAudio.muted) return;
    const vol = window.GameAudio ? window.GameAudio.sfxVol : 1;
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this._audioCtx;
      if (ctx.state === "suspended") ctx.resume();

      const dSec = Math.min(durationMs, 380) / 1000;

      // Two harmonics for a realistic car horn timbre
      [370, 466].forEach((freq) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.22 * vol, ctx.currentTime);
        gain.gain.setValueAtTime(0.22 * vol, ctx.currentTime + dSec - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dSec + 0.04);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dSec + 0.06);
      });
    } catch (e) {}
  }

  // ── Solve state (called after correct answer is submitted) ────────────────
  solve() {
    if (this.isSolved) return;
    this.isSolved = true;
    this._setHorn(false, "");
    if (this.rainSound) this.rainSound.stop();
    this.time.removeAllEvents();
    this.statusText.setText("The signal has been decoded. Execute the keyword.");
    if (window.playSuccess) window.playSuccess(this);
  }

  // ── Level transition ──────────────────────────────────────────────────────
  transitionToLevel(levelKey, skipFade = false) {
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (window.playSuccess) window.playSuccess(this);
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const levelIndex = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const levelNumber = levelIndex !== -1 ? levelIndex + 1 : "?";
    const overlay = this.add
      .rectangle(0, 0, W, H, 0x000000)
      .setOrigin(0)
      .setDepth(100)
      .setAlpha(0);
    const label = this.add
      .text(W / 2, H / 2, "Level " + levelNumber + "...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setAlpha(0);
    this.tweens.add({
      targets: [overlay, label],
      alpha: 1,
      duration: 1000,
      onComplete: () => this.scene.start(levelKey, { skipFade: false }),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _playWhenReady(sound) {
    if (!this.sound.locked) {
      sound.play();
    } else {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => sound.play());
    }
  }

  // ── Update loop ───────────────────────────────────────────────────────────
  update() {
    if (this._rainDrops) this._updateRain();
  }

  shutdown() {
    if (this.rainSound) this.rainSound.stop();
    this.time.removeAllEvents();
    this.tweens.killAll();
    if (this._audioCtx) {
      this._audioCtx.close();
      this._audioCtx = null;
    }
  }
}
