// Level 7 — "CHALK LAYERS"
// Drag four circular glass discs to numbered slots on a chalk blackboard.
// A faint chalk sequence on the board reveals the correct disc order.
// Answer: DUST

class SpectralScene extends Phaser.Scene {
  constructor() {
    super({ key: "Spectral" });
  }

  init(data) {
    this.skipFadeIn = data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    this.isSolved = false;
    this._discs = [];
    this._slots = [];
    this._audioCtx = null;
    this._W = this.cameras.main.width;
    this._H = this.cameras.main.height;

    this._build(this._W, this._H);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._W = width;
      this._H = height;
      this._fullReset();
    });
  }

  _fullReset() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._discs = [];
    this._slots = [];
    this._dustGfx = null;
    this.children.removeAll(true);
    this._build(this._W, this._H);
  }

  // ── Audio helpers ──────────────────────────────────────────────────────────

  _ac() {
    if (!this._audioCtx)
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return this._audioCtx;
  }

  _playChalkSqueak() {
    if (window.GameAudio && window.GameAudio.muted) return;
    try {
      const ac = this._ac();
      const vol = (window.GameAudio ? window.GameAudio.sfxVol : 1) * 0.32;
      const dur = 0.11;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.9;
      const src = ac.createBufferSource();
      const bpf = ac.createBiquadFilter();
      bpf.type = "bandpass";
      bpf.frequency.value = 2900 + Math.random() * 1400;
      bpf.Q.value = 7;
      const g = ac.createGain();
      g.gain.value = vol;
      src.buffer = buf;
      src.connect(bpf);
      bpf.connect(g);
      g.connect(ac.destination);
      src.start();
    } catch (e) {}
  }

  _playThud() {
    if (window.GameAudio && window.GameAudio.muted) return;
    try {
      const ac = this._ac();
      const vol = (window.GameAudio ? window.GameAudio.sfxVol : 1) * 0.22;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g);
      g.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(190, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(52, ac.currentTime + 0.13);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.13);
      osc.start();
      osc.stop(ac.currentTime + 0.13);
    } catch (e) {}
  }

  _playSolveChime() {
    if (window.GameAudio && window.GameAudio.muted) return;
    try {
      const ac = this._ac();
      const vol = (window.GameAudio ? window.GameAudio.sfxVol : 1) * 0.45;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g);
        g.connect(ac.destination);
        osc.type = "sine";
        const t = ac.currentTime + i * 0.13;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(vol * 0.45, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    } catch (e) {}
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build(W, H) {
    this._drawBoard(W, H);
    this._drawDecor(W, H);
    this._drawHiddenCode(W, H);
    this._drawSlots(W, H);
    this._drawDiscs(W, H);
    this._startDust(W, H);
  }

  // ── Blackboard ────────────────────────────────────────────────────────────

  _drawBoard(W, H) {
    const fw = 28;

    // Board surface — dark green chalkboard
    const board = this.add.graphics().setDepth(-10);
    board.fillStyle(0x0c1c0e, 1);
    board.fillRect(0, 0, W, H);

    // Chalk grain texture
    const grain = this.add.graphics().setDepth(-9).setAlpha(0.055);
    grain.fillStyle(0xffffff, 1);
    const rng = Phaser.Math.RND;
    for (let i = 0; i < 2800; i++) {
      grain.fillRect(
        rng.realInRange(fw, W - fw),
        rng.realInRange(fw, H - fw - 22),
        rng.between(1, 3), 1
      );
    }

    // Wooden frame
    const frame = this.add.graphics().setDepth(-8);
    frame.fillStyle(0x2c1a0c, 1);
    frame.fillRect(0, 0, W, fw);
    frame.fillRect(0, H - fw, W, fw);
    frame.fillRect(0, 0, fw, H);
    frame.fillRect(W - fw, 0, fw, H);

    // Frame wood grain lines
    frame.lineStyle(1, 0x3a2210, 0.55);
    for (let y = 3; y < fw - 3; y += 5) {
      frame.lineBetween(fw, y, W - fw, y);
      frame.lineBetween(fw, H - y, W - fw, H - y);
    }

    // Inner bevel
    frame.lineStyle(2.5, 0x48300f, 1);
    frame.strokeRect(fw, fw, W - fw * 2, H - fw * 2);
    frame.lineStyle(1, 0x6a4520, 0.7);
    frame.strokeRect(fw + 3, fw + 3, W - fw * 2 - 6, H - fw * 2 - 6);

    // Chalk tray
    const tray = this.add.graphics().setDepth(-7);
    tray.fillStyle(0x3a2210, 1);
    tray.fillRect(fw, H - fw - 20, W - fw * 2, 20);
    tray.lineStyle(1, 0x563318, 1);
    tray.lineBetween(fw, H - fw - 20, W - fw, H - fw - 20);

    // Chalk sticks on tray
    const stickCols = [0xd8d4cc, 0xccb890, 0xe0cce0, 0xcce0cc, 0xe0d0cc, 0xc8c8e0];
    [0.22, 0.30, 0.40, 0.50, 0.60, 0.70, 0.78].forEach((px, i) => {
      const cx = W * px;
      const cy = H - fw - 10;
      tray.fillStyle(stickCols[i % stickCols.length], 1);
      tray.fillRoundedRect(cx - 14, cy - 4, 28 + (i % 3) * 6, 8, 2);
    });
  }

  // ── Atmospheric decor ─────────────────────────────────────────────────────

  _drawDecor(W, H) {
    const fw = 28;
    const sc = Math.min(W / 700, H / 500);

    // Faint erased lines
    const g = this.add.graphics().setDepth(-5).setAlpha(0.09);
    g.lineStyle(1, 0x88aa88, 1);
    [0.12, 0.77].forEach(py => {
      g.lineBetween(fw + 12, H * py, W - fw - 12, H * py);
    });

    // Faint chalk equations — atmospheric only
    [
      { px: 0.07, py: 0.09, t: "∂²u/∂t² = c²∇²u", sz: 9, a: 0.10 },
      { px: 0.70, py: 0.08, t: "λ · ν = c", sz: 11, a: 0.09 },
      { px: 0.06, py: 0.66, t: "R = ρL / A", sz: 9, a: 0.08 },
      { px: 0.74, py: 0.69, t: "∮ E·dA = Q/ε₀", sz: 9, a: 0.09 },
    ].forEach(({ px, py, t, sz, a }) => {
      this.add.text(px * W, py * H, t, {
        fontFamily: "monospace",
        fontSize: Math.max(7, Math.round(sz * sc)) + "px",
        color: "#b0c8b0",
      }).setAlpha(a).setDepth(-5);
    });

    // Board title
    this.add.text(W / 2, fw + 14, "C H A L K   L A Y E R S", {
      fontFamily: "monospace",
      fontSize: Math.max(8, Math.round(10 * sc)) + "px",
      color: "#3a6a3a",
    }).setOrigin(0.5).setDepth(-4).setAlpha(0.55);
  }

  // ── Hidden sequence code ──────────────────────────────────────────────────

  _drawHiddenCode(W, H) {
    const fw = 28;
    const sc = Math.min(W / 700, H / 500);

    // Code: "[2] [3] [4] [1]" under "I  II  III  IV"
    // → disc-2(D) in slot I, disc-3(U) in II, disc-4(S) in III, disc-1(T) in IV → DUST
    const bx = fw + 16;
    const by = H - fw - 88;

    this.add.text(bx, by, "sequence:", {
      fontFamily: "monospace",
      fontSize: Math.max(6, Math.round(7 * sc)) + "px",
      color: "#7a9a7a",
    }).setAlpha(0.20).setDepth(-4);

    this.add.text(bx, by + Math.round(18 * sc), "[2]  [3]  [4]  [1]", {
      fontFamily: "monospace",
      fontSize: Math.max(9, Math.round(12 * sc)) + "px",
      color: "#a8c8a8",
    }).setAlpha(0.26).setDepth(-4);

    this.add.text(bx, by + Math.round(38 * sc), " I    II   III   IV", {
      fontFamily: "monospace",
      fontSize: Math.max(6, Math.round(8 * sc)) + "px",
      color: "#6a8a6a",
    }).setAlpha(0.18).setDepth(-4);
  }

  // ── Drop slots ────────────────────────────────────────────────────────────

  _drawSlots(W, H) {
    const fw = 28;
    const sc = Math.min(W / 700, H / 500);
    const slotR = Math.min((W - fw * 2) * 0.086, (H - fw * 2) * 0.135, 56);
    const slotY = H * 0.5 + H * 0.04;
    const spacing = slotR * 2.65;
    const startX = W / 2 - spacing * 1.5;
    const romanNums = ["I", "II", "III", "IV"];

    for (let i = 0; i < 4; i++) {
      const sx = startX + i * spacing;

      const g = this.add.graphics().setDepth(2);

      // Ghost circle
      g.lineStyle(2.5, 0x2a5a2a, 0.85);
      g.strokeCircle(sx, slotY, slotR);

      // Dashed inner ring
      g.lineStyle(1, 0x1c3c1c, 0.55);
      for (let a = 0; a < 360; a += 22) {
        const r1 = (a * Math.PI) / 180;
        const r2 = ((a + 12) * Math.PI) / 180;
        g.beginPath();
        g.arc(sx, slotY, slotR - 7, r1, r2, false);
        g.strokePath();
      }

      // Crosshair
      g.lineStyle(1, 0x1c3c1c, 0.4);
      g.lineBetween(sx - slotR * 0.3, slotY, sx + slotR * 0.3, slotY);
      g.lineBetween(sx, slotY - slotR * 0.3, sx, slotY + slotR * 0.3);

      // Roman numeral label
      this.add.text(sx, slotY + slotR + 14, romanNums[i], {
        fontFamily: "monospace",
        fontSize: Math.max(8, Math.round(10 * sc)) + "px",
        color: "#3a6a3a",
      }).setOrigin(0.5).setDepth(2).setAlpha(0.75);

      this._slots.push({ x: sx, y: slotY, r: slotR, disc: null, index: i });
    }
  }

  // ── Glass discs ───────────────────────────────────────────────────────────

  _drawDiscs(W, H) {
    const fw = 28;
    const sc = Math.min(W / 700, H / 500);
    const discR = Math.min((W - fw * 2) * 0.082, (H - fw * 2) * 0.130, 53);

    // id, letter, label — shuffled so player has to find the order
    // Code "2 3 4 1" → D U S T
    const defs = [
      { id: 1, letter: "T", label: "[1]" }, // → slot IV
      { id: 2, letter: "D", label: "[2]" }, // → slot I
      { id: 3, letter: "U", label: "[3]" }, // → slot II
      { id: 4, letter: "S", label: "[4]" }, // → slot III
    ];

    const trayTop = H - fw - 20;
    const safeBottom = trayTop - discR - 10;
    const safeTop = fw + discR + 10;

    const positions = [
      { x: W * 0.10 + fw, y: Math.min(H * 0.24, safeBottom) },
      { x: W - fw - W * 0.10, y: Math.min(H * 0.21, safeBottom) },
      { x: W * 0.09 + fw, y: Math.max(H * 0.70, safeTop) },
      { x: W - fw - W * 0.09, y: Math.max(H * 0.67, safeTop) },
    ];
    // Clamp to safe bounds
    positions.forEach(p => {
      p.y = Math.min(Math.max(p.y, safeTop), safeBottom);
      p.x = Math.min(Math.max(p.x, fw + discR + 4), W - fw - discR - 4);
    });

    defs.forEach((def, i) => {
      const disc = this._makeDisc(positions[i].x, positions[i].y, discR, def, sc);
      this._discs.push(disc);
    });
  }

  _makeDisc(homeX, homeY, r, def, sc) {
    const { id, letter, label } = def;
    const container = this.add.container(homeX, homeY).setDepth(10);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillCircle(3, 5, r);
    container.add(shadow);

    // Glass body
    const bg = this.add.graphics();
    bg.fillStyle(0x88ffcc, 0.06);
    bg.fillCircle(0, 0, r);
    bg.lineStyle(2.8, 0xc0e8c0, 0.80);
    bg.strokeCircle(0, 0, r);
    bg.lineStyle(1.2, 0x78c878, 0.35);
    bg.strokeCircle(0, 0, r * 0.80);
    // Glass reflection arc
    bg.lineStyle(2, 0xeeffee, 0.28);
    bg.beginPath();
    bg.arc(0, 0, r * 0.68, -2.4, -0.9, false);
    bg.strokePath();
    container.add(bg);

    // Chalk letter
    const letterTxt = this.add.text(0, -2, letter, {
      fontFamily: "'Courier New', monospace",
      fontSize: Math.max(16, Math.round(r * 0.88)) + "px",
      color: "#ddf2dd",
      fontStyle: "bold",
    }).setOrigin(0.5);
    container.add(letterTxt);

    // Disc number
    const labelTxt = this.add.text(r * 0.52, -r * 0.60, label, {
      fontFamily: "monospace",
      fontSize: Math.max(7, Math.round(r * 0.26)) + "px",
      color: "#68b868",
    }).setOrigin(0.5);
    container.add(labelTxt);

    // Interactivity
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, r),
      Phaser.Geom.Circle.Contains
    );
    this.input.setDraggable(container);

    const disc = { container, id, homeX, homeY, r, slotIndex: -1 };

    container.on("pointerover", () => {
      if (disc.slotIndex === -1)
        this.tweens.add({ targets: container, scaleX: 1.07, scaleY: 1.07, duration: 110, ease: "Sine.easeOut" });
    });
    container.on("pointerout", () => {
      if (disc.slotIndex === -1)
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 110, ease: "Sine.easeOut" });
    });

    container.on("dragstart", () => {
      this._playChalkSqueak();
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 60 });
      container.setDepth(20);
      if (disc.slotIndex !== -1) {
        this._slots[disc.slotIndex].disc = null;
        disc.slotIndex = -1;
      }
    });

    container.on("drag", (_, dragX, dragY) => {
      container.setPosition(dragX, dragY);
    });

    container.on("dragend", () => {
      let snapped = false;
      for (const slot of this._slots) {
        const dist = Phaser.Math.Distance.Between(container.x, container.y, slot.x, slot.y);
        if (dist < slot.r * 1.55 && slot.disc === null) {
          this.tweens.add({ targets: container, x: slot.x, y: slot.y, scaleX: 1, scaleY: 1, duration: 170, ease: "Back.easeOut" });
          slot.disc = disc;
          disc.slotIndex = slot.index;
          container.setDepth(5 + slot.index);
          this._playThud();
          snapped = true;
          this.time.delayedCall(200, () => this._checkSolution());
          break;
        }
      }
      if (!snapped) {
        this.tweens.add({ targets: container, x: disc.homeX, y: disc.homeY, scaleX: 1, scaleY: 1, duration: 210, ease: "Back.easeOut" });
        container.setDepth(10);
      }
    });

    return disc;
  }

  // ── Solution check ────────────────────────────────────────────────────────

  _checkSolution() {
    if (this.isSolved) return;
    // Correct: slot 0→disc2(D), 1→disc3(U), 2→disc4(S), 3→disc1(T)
    const expected = [2, 3, 4, 1];
    for (const slot of this._slots) {
      if (!slot.disc || slot.disc.id !== expected[slot.index]) return;
    }
    this._onSolve();
  }

  _onSolve() {
    if (this.isSolved) return;
    this.isSolved = true;
    this._playSolveChime();

    const W = this._W;
    const H = this._H;
    const sc = Math.min(W / 700, H / 500);

    // Green flash
    const flash = this.add.graphics().setDepth(60).setAlpha(0);
    flash.fillStyle(0x00ff66, 1);
    flash.fillRect(0, 0, W, H);
    this.tweens.add({ targets: flash, alpha: 0.13, duration: 320, yoyo: true });

    // Word reveal on board
    const reveal = this.add.text(W / 2, H * 0.20, "D  U  S  T", {
      fontFamily: "monospace",
      fontSize: Math.max(18, Math.round(30 * sc)) + "px",
      color: "#88ee88",
    }).setOrigin(0.5).setDepth(61).setAlpha(0);
    this.tweens.add({ targets: reveal, alpha: 1, duration: 750, ease: "Sine.easeInOut" });
  }

  // ── Chalk dust particles ──────────────────────────────────────────────────

  _startDust(W, H) {
    const fw = 28;
    this._dustParticles = [];
    const dustGfx = this.add.graphics().setDepth(90);
    this._dustGfx = dustGfx;

    for (let i = 0; i < 28; i++) {
      this._dustParticles.push({
        x: fw + Math.random() * (W - fw * 2),
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.3,
        vy: -(Math.random() * 0.22 + 0.04),
        vx: (Math.random() - 0.5) * 0.11,
        alpha: Math.random() * 0.09 + 0.02,
      });
    }

    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this._dustGfx || !this._dustGfx.scene) return;
        this._dustGfx.clear();
        this._dustParticles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -4) { p.y = H + 4; p.x = fw + Math.random() * (W - fw * 2); }
          this._dustGfx.fillStyle(0xc8dcc8, 1);
          this._dustGfx.setAlpha(p.alpha);
          this._dustGfx.fillCircle(p.x, p.y, p.r);
        });
      },
    });
  }

  // ── Scene lifecycle ───────────────────────────────────────────────────────

  replay() {
    this._fullReset();
  }

  transitionToLevel(levelKey, skipFade = false) {
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (!this.isSolved && window.playSuccess) window.playSuccess(this);
    this.isSolved = true;

    const W = this._W;
    const H = this._H;
    const overlay = this.add.rectangle(0, 0, W, H, 0x000000)
      .setOrigin(0, 0).setDepth(200).setAlpha(0);
    const idx = window.GAME_LEVELS.findIndex(l => l.key === levelKey);
    const label = this.add.text(W / 2, H / 2, "Level " + (idx + 1) + "...", {
      fontFamily: "monospace",
      fontSize: "42px",
      color: "#00ff44",
    }).setOrigin(0.5).setDepth(201).setAlpha(0);

    this.tweens.add({
      targets: [overlay, label],
      alpha: 1,
      duration: 1000,
      onComplete: () => this.scene.start(levelKey, { skipFade: false }),
    });
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._dustGfx = null;
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch (e) {}
      this._audioCtx = null;
    }
  }
}
