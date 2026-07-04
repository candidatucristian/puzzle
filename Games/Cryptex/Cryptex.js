// ─────────────────────────────────────────────────────────────────────────────
// Level — "CRYPTEX"  ·  code: CAESAR  ·  very hard  ·  decipher
//
// A candle-lit study. On the desk: a brass cryptex with SIX letter rings and
// a crumpled parchment. The parchment is enciphered with a Caesar shift of 3 —
// three tally scratches in its corner are the only hint to the shift:
//
//   "WKH HPSHURU ZKR QDPHG WKLV FLSKHU RSHQV WKH ORFN"
//    →  THE EMPEROR WHO NAMED THIS CIPHER OPENS THE LOCK
//
// The emperor who named the cipher: CAESAR. Spell it on the rings and the
// cylinder opens, revealing the engraved code.
//
// Interactions: drag a ring up/down, scroll the wheel over it, or click its
// upper/lower half. Click the parchment to read it.
//
// Same scene contract as the other levels: GAME_LEVELS, initGlobalAudio,
// transitionToLevel(), canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const CRYPTEX_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CRYPTEX_ANSWER = "CAESAR";
const CRYPTEX_CIPHER = ["WKH HPSHURU ZKR QDPHG", "WKLV FLSKHU", "RSHQV WKH ORFN"];

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

    this.isSolved = false;
    this._offsets = [];
    do {
      this._offsets = [];
      for (let i = 0; i < 6; i++) this._offsets.push(Phaser.Math.Between(0, 25));
    } while (this._word() === CRYPTEX_ANSWER);

    this._activeRing = null;
    this._overlayOpen = false;

    this._build(this.cameras.main.width, this.cameras.main.height);

    // ── scene-level input: ring dragging, clicking, wheel ──
    this.input.on("pointermove", (p) => {
      if (this._activeRing === null || !p.isDown) return;
      this._dragAcc += p.y - this._dragLastY;
      this._dragLastY = p.y;
      while (Math.abs(this._dragAcc) >= 24) {
        const d = this._dragAcc > 0 ? 1 : -1;
        this._dragAcc -= d * 24;
        this._dragMoved = true;
        this._rotate(this._activeRing, d);
      }
    });

    this.input.on("pointerup", (p) => {
      if (this._activeRing === null) return;
      const i = this._activeRing;
      this._activeRing = null;
      if (!this._dragMoved) {
        this._rotate(i, p.y < this._geom.cy ? -1 : 1);
      }
    });

    this.input.on("wheel", (p, objs, dx, dy) => {
      if (this.isSolved || this._overlayOpen || !this._geom) return;
      const g = this._geom;
      if (Math.abs(p.y - g.cy) > g.bh * 0.75) return;
      for (let i = 0; i < 6; i++) {
        if (Math.abs(p.x - g.ringX[i]) < g.rw / 2 + 4) {
          this._rotate(i, dy > 0 ? 1 : -1);
          return;
        }
      }
    });

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _word() {
    return this._offsets.map((o) => CRYPTEX_ALPHA[o]).join("");
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    // wall + vignette
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x241b2e, 0x241b2e, 0x0b0810, 0x0b0810, 1);
    bg.fillRect(0, 0, W, H);

    // desk
    const deskY = H * 0.62;
    const desk = this.add.graphics().setDepth(-8);
    desk.fillGradientStyle(0x2e1d0d, 0x2e1d0d, 0x140b04, 0x140b04, 1);
    desk.fillRect(0, deskY, W, H - deskY);
    desk.fillStyle(0x3d2a12, 1).fillRect(0, deskY, W, 6);
    desk.lineStyle(1, 0x1c1207, 0.8);
    for (let i = 1; i < 5; i++) {
      const y = deskY + 6 + ((H - deskY) / 5) * i;
      desk.lineBetween(0, y, W, y);
    }
    // wood grain
    desk.lineStyle(1, 0x000000, 0.15);
    for (let i = 0; i < 14; i++) {
      const gx = Math.random() * W;
      const gy = deskY + 10 + Math.random() * (H - deskY - 16);
      desk.lineBetween(gx, gy, gx + 30 + Math.random() * 60, gy + Phaser.Math.Between(-2, 2));
    }

    // candle light — redrawn every frame in update()
    this._flameGfx = this.add.graphics().setDepth(-6);
    this._candle = { x: W * 0.82, y: deskY + 8 };
    const candle = this.add.graphics().setDepth(-5);
    candle.fillStyle(0xd8cba8, 1);
    candle.fillRoundedRect(this._candle.x - 11, this._candle.y - 52, 22, 52, 4);
    candle.fillStyle(0xcabf9c, 1);
    candle.fillRoundedRect(this._candle.x - 6, this._candle.y - 46, 5, 18, 2);
    candle.fillStyle(0x2b241a, 1);
    candle.fillRect(this._candle.x - 1, this._candle.y - 58, 2, 7);
    // brass holder
    candle.fillStyle(0x4a3a1a, 1);
    candle.fillRoundedRect(this._candle.x - 18, this._candle.y - 4, 36, 8, 3);

    // vignette
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.24;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0.8, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.65, 0, 0.65, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.65, 0, 0.65);
    vg.fillRect(W - v, 0, v, H);

    // texts
    this.statusText = this.add
      .text(W / 2, 50, "Six rings guard an old word.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.subText = this.add
      .text(W / 2, 78, "drag or scroll the rings · read the parchment", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "14px",
        color: "#9a8fb0",
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(20);
    this.levelText = this.add
      .text(W - 30, 30, "Level 9", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });

    this._buildCryptex(W, H);
    this._buildParchment(W, H, deskY);

    if (this.isSolved) this._showOpened(true);
  }

  _buildCryptex(W, H) {
    const bw = Math.min(W * 0.72, 640);
    const bh = Phaser.Math.Clamp(bw * 0.24, 96, 170);
    const cx = W / 2;
    const cy = H * 0.42;
    const capW = bw * 0.085;
    const innerW = bw - capW * 2;
    const step = innerW / 6;
    const rw = step * 0.86;
    const ringX = [];
    for (let i = 0; i < 6; i++) ringX.push(cx - innerW / 2 + step * (i + 0.5));
    this._geom = { cx, cy, bw, bh, rw, ringX, capW };

    const g = this.add.graphics().setDepth(5);
    this._bodyGfx = g;

    // shadow on the desk
    g.fillStyle(0x000000, 0.5);
    g.fillEllipse(cx, cy + bh * 0.72, bw * 1.02, bh * 0.34);

    // barrel
    const r = bh / 2;
    g.fillGradientStyle(0x7a5f2c, 0x7a5f2c, 0x241808, 0x241808, 1);
    g.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, r * 0.55);
    // top sheen + bottom bounce light
    g.fillStyle(0xe8cf8e, 0.18);
    g.fillRoundedRect(cx - bw / 2 + 6, cy - bh / 2 + 6, bw - 12, bh * 0.16, 8);
    g.fillStyle(0xffdf9e, 0.05);
    g.fillRoundedRect(cx - bw / 2 + 8, cy + bh * 0.28, bw - 16, bh * 0.1, 6);

    // end caps
    for (const side of [-1, 1]) {
      const capX = cx + side * (bw / 2 - capW / 2);
      g.fillGradientStyle(0x4a3714, 0x4a3714, 0x17100a, 0x17100a, 1);
      g.fillRoundedRect(capX - capW / 2, cy - bh / 2 - 4, capW, bh + 8, 7);
      g.lineStyle(1.5, 0x8a6f34, 0.5);
      g.strokeRoundedRect(capX - capW / 2, cy - bh / 2 - 4, capW, bh + 8, 7);
      g.fillStyle(0xb99a54, 0.8);
      g.fillCircle(capX, cy - bh * 0.3, 2.2);
      g.fillCircle(capX, cy, 2.2);
      g.fillCircle(capX, cy + bh * 0.3, 2.2);
      // pointer notch aimed at the letter line
      g.fillStyle(0xffd98a, 0.9);
      if (side < 0)
        g.fillTriangle(capX + capW / 2 - 2, cy - 6, capX + capW / 2 - 2, cy + 6, capX + capW / 2 + 6, cy);
      else
        g.fillTriangle(capX - capW / 2 + 2, cy - 6, capX - capW / 2 + 2, cy + 6, capX - capW / 2 - 6, cy);
    }

    // rings
    for (let i = 0; i < 6; i++) {
      const x = ringX[i];
      g.fillGradientStyle(0x97783a, 0x97783a, 0x352610, 0x352610, 1);
      g.fillRoundedRect(x - rw / 2, cy - bh / 2 + 3, rw, bh - 6, 6);
      g.lineStyle(1.4, 0x120d06, 0.9);
      g.strokeRoundedRect(x - rw / 2, cy - bh / 2 + 3, rw, bh - 6, 6);
      // knurling on the ring edges
      g.lineStyle(1, 0x120d06, 0.35);
      for (let ky = cy - bh / 2 + 8; ky < cy + bh / 2 - 8; ky += 6) {
        g.lineBetween(x - rw / 2 + 2, ky, x - rw / 2 + 7, ky);
        g.lineBetween(x + rw / 2 - 7, ky, x + rw / 2 - 2, ky);
      }
    }

    // etched letter guide-line
    g.lineStyle(1, 0xffd98a, 0.22);
    g.lineBetween(cx - innerW / 2, cy, cx + innerW / 2, cy);

    // letters, masked to the barrel
    this._maskG = this.add.graphics().setVisible(false);
    this._maskG.fillStyle(0xffffff, 1);
    this._maskG.fillRoundedRect(cx - bw / 2 + capW, cy - bh / 2 + 4, bw - capW * 2, bh - 8, 6);
    const mask = this._maskG.createGeometryMask();

    this._ringTexts = [];
    const mainSize = Math.round(rw * 0.52);
    for (let i = 0; i < 6; i++) {
      const x = ringX[i];
      const mk = (dy, size, color, alpha) =>
        this.add
          .text(x, cy + dy, "A", {
            fontFamily: '"Special Elite", monospace',
            fontSize: size + "px",
            color,
          })
          .setOrigin(0.5)
          .setAlpha(alpha)
          .setDepth(6)
          .setMask(mask);
      this._ringTexts.push({
        up: mk(-bh * 0.34, Math.round(mainSize * 0.62), "#8a7038", 0.5),
        main: mk(0, mainSize, "#f2e3b3", 1),
        dn: mk(bh * 0.34, Math.round(mainSize * 0.62), "#8a7038", 0.5),
      });

      // interactive zone per ring
      const zone = this.add
        .zone(x, cy, rw + 6, bh + 10)
        .setOrigin(0.5)
        .setDepth(10)
        .setInteractive({ cursor: "ns-resize" });
      zone.on("pointerdown", (p) => {
        if (this.isSolved || this._overlayOpen) return;
        this._activeRing = i;
        this._dragLastY = p.y;
        this._dragAcc = 0;
        this._dragMoved = false;
      });
    }
    this._refreshLetters();
  }

  _refreshLetters() {
    for (let i = 0; i < 6; i++) {
      const o = this._offsets[i];
      const t = this._ringTexts[i];
      t.up.setText(CRYPTEX_ALPHA[(o + 25) % 26]);
      t.main.setText(CRYPTEX_ALPHA[o]);
      t.dn.setText(CRYPTEX_ALPHA[(o + 1) % 26]);
    }
  }

  _rotate(i, d) {
    if (this.isSolved || this._overlayOpen) return;
    this._offsets[i] = (this._offsets[i] + d + 26) % 26;
    this._refreshLetters();
    if (window.playClick) window.playClick(this);
    // small mechanical nudge
    const t = this._ringTexts[i].main;
    t.y = this._geom.cy - d * 9;
    this.tweens.add({ targets: t, y: this._geom.cy, duration: 110, ease: "Cubic.easeOut" });
    this._checkSolve();
  }

  // ── parchment ──────────────────────────────────────────────────────────────

  _buildParchment(W, H, deskY) {
    const px = W * 0.2;
    const py = deskY + (H - deskY) * 0.42;
    const pw = Math.min(W * 0.17, 150);
    const ph = pw * 0.68;

    const p = this.add.container(px, py).setDepth(8).setAngle(-6);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-pw / 2 + 4, -ph / 2 + 5, pw, ph, 6);
    g.fillStyle(0xcbb98a, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 6);
    g.fillStyle(0xb7a274, 0.6);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph * 0.16, 6);
    g.lineStyle(1, 0x8a744a, 0.8);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 6);
    // unreadable scribbles
    g.lineStyle(1.2, 0x4a3820, 0.55);
    for (let i = 0; i < 5; i++) {
      const ly = -ph * 0.28 + i * ph * 0.14;
      g.lineBetween(-pw * 0.38, ly, pw * (0.1 + Math.random() * 0.28), ly);
    }
    p.add(g);
    p.setSize(pw, ph);
    p.setInteractive({ cursor: "pointer" });
    p.on("pointerdown", (ptr) => {
      if (ptr.event) ptr.event.stopPropagation();
      this._openOverlay();
    });
    this._parchment = p;

    // gentle pulse until first read
    this._parchPulse = this.tweens.add({
      targets: p,
      scale: 1.05,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── reading overlay (hidden until clicked) ──
    const ov = this.add.container(0, 0).setDepth(60).setVisible(false);
    const dark = this.add
      .rectangle(0, 0, W, H, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setInteractive();
    dark.on("pointerdown", () => this._closeOverlay());
    ov.add(dark);

    const bw = Math.min(W * 0.64, 560);
    const bhh = Math.min(H * 0.6, 420);
    const og = this.add.graphics();
    og.fillStyle(0x1a1408, 0.9);
    og.fillRoundedRect(W / 2 - bw / 2 + 8, H / 2 - bhh / 2 + 9, bw, bhh, 10);
    og.fillStyle(0xd6c497, 1);
    og.fillRoundedRect(W / 2 - bw / 2, H / 2 - bhh / 2, bw, bhh, 10);
    og.fillStyle(0xbfa878, 0.5);
    og.fillRoundedRect(W / 2 - bw / 2, H / 2 - bhh / 2, bw, bhh * 0.1, 10);
    og.fillRoundedRect(W / 2 - bw / 2, H / 2 + bhh * 0.4, bw, bhh * 0.1, 10);
    og.lineStyle(2, 0x8a744a, 0.9);
    og.strokeRoundedRect(W / 2 - bw / 2, H / 2 - bhh / 2, bw, bhh, 10);
    ov.add(og);

    const fs = Math.max(16, Math.round(Math.min(W, H) * 0.028));
    const cipherText = this.add
      .text(W / 2, H / 2 - bhh * 0.08, CRYPTEX_CIPHER.join("\n"), {
        fontFamily: '"Special Elite", monospace',
        fontSize: fs + "px",
        color: "#3b2a12",
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5);
    ov.add(cipherText);

    // the shift hint: three tally scratches
    const tg = this.add.graphics();
    const tx = W / 2 + bw / 2 - 52;
    const ty = H / 2 + bhh / 2 - 46;
    tg.lineStyle(2.2, 0x5a4526, 0.9);
    for (let i = 0; i < 3; i++) {
      tg.lineBetween(tx + i * 9, ty - 12, tx + i * 9 - 3, ty + 12);
    }
    ov.add(tg);

    const closeHint = this.add
      .text(W / 2, H / 2 + bhh / 2 - 20, "click anywhere to put it down", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "12px",
        color: "#6b573a",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    ov.add(closeHint);

    this._overlay = ov;
  }

  _openOverlay() {
    if (this.isSolved || this._overlayOpen) return;
    this._overlayOpen = true;
    this._activeRing = null;
    if (this._parchPulse) {
      this._parchPulse.stop();
      this._parchment.setScale(1);
      this._parchPulse = null;
    }
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

  // ── solve ──────────────────────────────────────────────────────────────────

  _checkSolve() {
    if (this.isSolved || this._word() !== CRYPTEX_ANSWER) return;
    this.isSolved = true;
    this._activeRing = null;
    this._thunk();

    this.statusText.setText("The cylinder yields.");
    this.statusText.setColor("#1aaf7a");
    this.subText.setAlpha(0);

    this._ringTexts.forEach((t, i) => {
      t.main.setColor("#ffd98a");
      this.tweens.add({
        targets: t.main,
        scale: 1.25,
        duration: 260,
        yoyo: true,
        delay: i * 90,
        ease: "Sine.easeInOut",
      });
    });

    this.time.delayedCall(700, () => this._showOpened(false));
  }

  _showOpened(instant) {
    const { cx, cy, bw, bh } = this._geom;
    const sw = bw * 0.56;
    const sh = bh * 0.62;
    const targetY = cy - bh * 1.15;

    const sc = this.add.container(cx, instant ? targetY : cy).setDepth(25);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-sw / 2 + 3, -sh / 2 + 4, sw, sh, 8);
    g.fillStyle(0xd9c9a0, 1);
    g.fillRoundedRect(-sw / 2, -sh / 2, sw, sh, 8);
    g.lineStyle(1.5, 0x8a744a, 0.9);
    g.strokeRoundedRect(-sw / 2, -sh / 2, sw, sh, 8);
    // rolled ends
    g.fillStyle(0xbfa878, 1);
    g.fillRoundedRect(-sw / 2 - 7, -sh / 2 - 3, 14, sh + 6, 6);
    g.fillRoundedRect(sw / 2 - 7, -sh / 2 - 3, 14, sh + 6, 6);
    sc.add(g);

    const word = this.add
      .text(0, 0, CRYPTEX_ANSWER, {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.round(sh * 0.42) + "px",
        color: "#5a3c16",
        letterSpacing: 6,
      })
      .setOrigin(0.5);
    sc.add(word);

    if (!instant) {
      sc.setAlpha(0);
      this.tweens.add({
        targets: sc,
        y: targetY,
        alpha: 1,
        duration: 800,
        ease: "Cubic.easeOut",
      });
      // gold motes drifting up
      for (let i = 0; i < 16; i++) {
        const mote = this.add
          .circle(
            cx + Phaser.Math.Between(-bw / 3, bw / 3),
            cy + Phaser.Math.Between(-10, 30),
            Phaser.Math.Between(1, 3),
            0xffd98a,
          )
          .setDepth(26)
          .setAlpha(0);
        this.tweens.add({
          targets: mote,
          y: mote.y - Phaser.Math.Between(60, 140),
          alpha: { from: 0.9, to: 0 },
          duration: Phaser.Math.Between(900, 1700),
          delay: i * 70,
          ease: "Sine.easeOut",
          onComplete: () => mote.destroy(),
        });
      }
    }
  }

  // deep mechanical unlock sound, synthesized
  _thunk() {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const master = ac.createGain();
      master.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.7;
      master.connect(ac.destination);
      const dur = 0.28;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, t);
      lp.frequency.exponentialRampToValueAtTime(120, t + dur);
      src.connect(lp);
      lp.connect(master);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // ── candle flicker ─────────────────────────────────────────────────────────

  update() {
    if (!this._flameGfx || !this._candle) return;
    const t = this.time.now / 1000;
    const fl =
      0.75 +
      0.14 * Math.sin(t * 7.3) +
      0.08 * Math.sin(t * 13.7 + 1.4) +
      0.05 * Math.sin(t * 23.1 + 4.0);
    const g = this._flameGfx;
    const c = this._candle;
    const fy = c.y - 64;
    const sway = Math.sin(t * 3.1) * 1.6;
    g.clear();
    // halo
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(0xffb45e, 0.028 * i * fl);
      g.fillCircle(c.x + sway, fy, 90 * fl * (i / 1.6));
    }
    // flame body
    g.fillStyle(0xff8a2e, 0.85);
    g.fillEllipse(c.x + sway, fy, 11, 27 * fl);
    g.fillStyle(0xffd98a, 0.95);
    g.fillEllipse(c.x + sway * 0.8, fy + 3, 6.5, 17 * fl);
    g.fillStyle(0xfff6d8, 1);
    g.fillEllipse(c.x + sway * 0.6, fy + 6, 3, 8 * fl);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.children.removeAll(true);
    this._flameGfx = null;
    this._candle = null;
    this._ringTexts = null;
    this._overlay = null;
    this._parchment = null;
    this._parchPulse = null;
    this._maskG = null;
    this._bodyGfx = null;
    this._geom = null;
    this._activeRing = null;
    this._overlayOpen = false;
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
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
