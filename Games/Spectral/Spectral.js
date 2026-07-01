// Level 7 — "THE MECHANISM"
// Three concentric glass dials. Drag each dial's knob around to rotate it.
// A faint diagram hidden on the back wall shows the target position for each ring.
// Align all three → the mechanism opens and the word is revealed.
// Answer: OMEN

class SpectralScene extends Phaser.Scene {
  constructor() {
    super({ key: "Spectral" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("click",     "assets/sounds/global/click.mp3");
    this.load.audio("ui_click",  "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error",     "assets/sounds/global/error.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.isSolved = false;

    // Target positions (in "clock hours", 0 = top) for each ring — this is the solution.
    // Outer → 2, Middle → 9, Inner → 5
    this.targets = [2, 9, 5];

    // ── Background gradient (identical to Level 1) ─────────────────────────
    this.bgGfx = this.add.graphics().setDepth(-10);
    this.drawBg = (w, h) => {
      this.bgGfx.clear();
      this.bgGfx.fillGradientStyle(0x222233, 0x222233, 0x0a0a10, 0x0a0a10, 1);
      this.bgGfx.fillRect(0, 0, w, h);
    };
    this.drawBg(W, H);

    // ── Sketched 3D room (identical to Level 1) ────────────────────────────
    this.roomGfx = this.add.graphics().setDepth(-5);
    this.drawRoom(this.roomGfx, W, H);

    // ── Hidden code diagram on the wall ────────────────────────────────────
    this.codeGfx = this.add.graphics().setDepth(-4);
    this.drawWallDiagram(W, H);

    // ── Status text ────────────────────────────────────────────────────────
    this.statusText = this.add
      .text(W / 2, 50,
        "Turn the three dials until the mechanism aligns.",
        {
          fontFamily: '"Special Elite", monospace',
          fontSize: "18px",
          color: "#ffffff",
          letterSpacing: 1,
          wordWrap: { width: W * 0.7 },
          align: "center",
        })
      .setOrigin(0.5);

    // ── The dials ──────────────────────────────────────────────────────────
    this.dialGfx = this.add.graphics().setDepth(6);
    this.centerGfx = this.add.graphics().setDepth(7);
    this.dials = [];
    this.buildDials(W, H);

    // ── Ambient drone for immersion (not part of the puzzle) ───────────────
    this.startDrone();

    // ── Resize ─────────────────────────────────────────────────────────────
    this.events.on("canvas_resized", (size) => {
      const w = size.width;
      const h = size.height;
      this.drawBg(w, h);
      this.drawRoom(this.roomGfx, w, h);
      this.drawWallDiagram(w, h);
      this.statusText.setPosition(w / 2, 50).setWordWrapWidth(w * 0.7);
      this.layoutDials(w, h);
      this.redrawDials();
    });
  }

  // ── Angle helpers (clock hours ↔ radians, 0 = top) ─────────────────────────

  hourToRad(hour) {
    return Phaser.Math.DegToRad(hour * 30 - 90);
  }

  radToHour(rad) {
    let h = Math.round((Phaser.Math.RadToDeg(rad) + 90) / 30);
    return ((h % 12) + 12) % 12;
  }

  // ── Build dials ────────────────────────────────────────────────────────────

  buildDials(w, h) {
    const startHours = [7, 3, 11]; // deliberately wrong starting positions

    for (let i = 0; i < 3; i++) {
      const knob = this.add.container(0, 0).setDepth(9);
      const kGfx = this.add.graphics();
      knob.add(kGfx);
      knob.setSize(40, 40);
      knob.setInteractive(
        new Phaser.Geom.Circle(0, 0, 20),
        Phaser.Geom.Circle.Contains,
        { cursor: "grab" }
      );
      this.input.setDraggable(knob);

      const dial = {
        ring: i,
        angle: this.hourToRad(startHours[i]),
        target: this.targets[i],
        locked: false,
        knob,
        kGfx,
        r: 0, cx: 0, cy: 0,
      };

      knob.on("dragstart", () => {
        if (this.isSolved) return;
        this.children.bringToTop(knob);
        if (window.playClick) window.playClick(this);
      });

      knob.on("drag", (pointer, dragX, dragY) => {
        if (this.isSolved || dial.locked) return;
        dial.angle = Math.atan2(dragY - dial.cy, dragX - dial.cx);
        this.positionKnob(dial);
        this.redrawDials();
      });

      knob.on("dragend", () => {
        if (this.isSolved || dial.locked) return;
        const hr = this.radToHour(dial.angle);
        dial.angle = this.hourToRad(hr);
        this.positionKnob(dial);
        this.playTick();

        if (hr === dial.target) {
          dial.locked = true;
          this.playLockTone();
        }
        this.redrawDials();
        this.checkWin();
      });

      this.dials.push(dial);
    }

    this.layoutDials(w, h);
    this.redrawDials();
  }

  layoutDials(w, h) {
    const cx = w / 2;
    const cy = h / 2 + h * 0.07;
    const base = Math.min(w, h);
    const radii = [base * 0.21, base * 0.145, base * 0.08];
    this._center = { cx, cy };

    this.dials.forEach((d, i) => {
      d.cx = cx;
      d.cy = cy;
      d.r = radii[i];
      this.positionKnob(d);
    });
  }

  positionKnob(dial) {
    dial.knob.setPosition(
      dial.cx + Math.cos(dial.angle) * dial.r,
      dial.cy + Math.sin(dial.angle) * dial.r
    );
  }

  // ── Draw dials ─────────────────────────────────────────────────────────────

  redrawDials() {
    const g = this.dialGfx;
    g.clear();
    const { cx, cy } = this._center;

    this.dials.forEach((d) => {
      const alpha = d.locked ? 0.9 : 0.4;

      // Rough sketched ring
      this.roughCircle(g, cx, cy, d.r, alpha * 0.7);

      // Tick marks (12 positions)
      for (let hgt = 0; hgt < 12; hgt++) {
        const a = this.hourToRad(hgt);
        const inr = d.r - (hgt % 3 === 0 ? 9 : 5);
        g.lineStyle(1, 0xffffff, 0.22 * (d.locked ? 1.6 : 1));
        g.lineBetween(
          cx + Math.cos(a) * inr, cy + Math.sin(a) * inr,
          cx + Math.cos(a) * d.r, cy + Math.sin(a) * d.r
        );
      }

      // Bold pointer from center toward the knob (Level-1 style thick stroke)
      const sl = this.sketchLineFn(g);
      const px = cx + Math.cos(d.angle) * d.r;
      const py = cy + Math.sin(d.angle) * d.r;
      const ix = cx + Math.cos(d.angle) * (d.r * 0.32);
      const iy = cy + Math.sin(d.angle) * (d.r * 0.32);
      sl(ix, iy, px, py, d.locked ? 1.0 : 0.6, d.locked ? 4.5 : 3.5);

      // Knob visual
      d.kGfx.clear();
      d.kGfx.fillStyle(0xffffff, d.locked ? 0.12 : 0.05);
      d.kGfx.fillCircle(0, 0, 13);
      d.kGfx.lineStyle(2.2, 0xffffff, d.locked ? 0.95 : 0.6);
      d.kGfx.strokeCircle(0, 0, 13);
    });

    // Center hub
    const c = this.centerGfx;
    c.clear();
    const allLocked = this.dials.every((d) => d.locked);
    this.roughCircle(c, cx, cy, this.dials[2].r * 0.42, allLocked ? 1.0 : 0.45);
    if (allLocked) {
      c.fillStyle(0x1aaf7a, 0.25);
      c.fillCircle(cx, cy, this.dials[2].r * 0.42);
    }
  }

  // ── Wall diagram (the hidden code) ─────────────────────────────────────────

  drawWallDiagram(w, h) {
    const g = this.codeGfx;
    g.clear();

    // Place a small clock-like diagram on the back wall (upper-left area).
    const vx = w / 2;
    const vy = h * 0.4;
    const bwW = w * 0.7;
    const bwH = h * 0.55;
    const dx = vx - bwW * 0.30;
    const dy = vy - bwH * 0.08;
    const dr = Math.min(w, h) * 0.055;

    // Faint circle
    this.roughCircle(g, dx, dy, dr, 0.16);

    // Top reference tick (12 o'clock marker)
    g.lineStyle(1, 0xffffff, 0.16);
    g.lineBetween(dx, dy - dr, dx, dy - dr + 6);

    // Three dots at the target hours — dot SIZE encodes which ring
    // big = outer(0), medium = middle(1), small = inner(2)
    const dotSizes = [4.2, 3.0, 1.9];
    this.targets.forEach((hour, i) => {
      const a = this.hourToRad(hour);
      const ddx = dx + Math.cos(a) * (dr - 4);
      const ddy = dy + Math.sin(a) * (dr - 4);
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(ddx, ddy, dotSizes[i]);
    });

    // Tiny faint caption
    this.add.text(dx, dy + dr + 10, "◦ align ◦", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffffff",
    }).setOrigin(0.5).setAlpha(0.13).setDepth(-4);
  }

  // ── Win handling ───────────────────────────────────────────────────────────

  checkWin() {
    if (this.isSolved) return;
    if (!this.dials.every((d) => d.locked)) return;

    this.isSolved = true;
    if (window.playSuccess) window.playSuccess(this);

    this.statusText.setText("The mechanism opens.").setColor("#1aaf7a");

    const { cx, cy } = this._center;
    const base = Math.min(this.cameras.main.width, this.cameras.main.height);

    const reveal = this.add
      .text(cx, cy, "O M E N", {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.max(20, Math.round(base * 0.05)) + "px",
        color: "#88ee88",
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);

    this.tweens.add({ targets: reveal, alpha: 1, duration: 900, ease: "Sine.easeInOut" });

    this.dials.forEach((d, i) => {
      this.tweens.add({
        targets: d.knob,
        scaleX: 1.15, scaleY: 1.15,
        duration: 260, yoyo: true, delay: i * 90, ease: "Sine.easeInOut",
      });
    });
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  ac() {
    if (!this._audioCtx)
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return this._audioCtx;
  }

  playTick() {
    if (window.playClick) window.playClick(this);
  }

  playLockTone() {
    if (window.GameAudio && window.GameAudio.muted) return;
    try {
      const ac = this.ac();
      const vol = (window.GameAudio ? window.GameAudio.sfxVol : 1) * 0.3;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ac.currentTime + 0.12);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
      osc.start(); osc.stop(ac.currentTime + 0.22);
    } catch (e) {}
  }

  startDrone() {
    if (window.GameAudio && window.GameAudio.muted) return;
    try {
      const ac = this.ac();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = 58;
      g.gain.value = 0.03 * (window.GameAudio ? window.GameAudio.sfxVol : 1);
      osc.connect(g); g.connect(ac.destination);
      osc.start();
      this._drone = { osc, g };
    } catch (e) {}
  }

  stopDrone() {
    if (this._drone) {
      try { this._drone.osc.stop(); } catch (e) {}
      this._drone = null;
    }
  }

  // ── Sketch drawing helpers (identical style to Level 1) ────────────────────

  sketchLineFn(gfx) {
    return (x0, y0, x1, y1, alphaMod = 1, thickness = 1.2) => {
      const passes = thickness > 2 ? 3 : 2;
      for (let p = 0; p < passes; p++) {
        gfx.lineStyle(thickness, 0xffffff, (0.8 - p * 0.2) * alphaMod);
        gfx.beginPath();
        gfx.moveTo(x0, y0);
        const steps = thickness > 2 ? 8 : 5;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const jx = i < steps ? Phaser.Math.Between(-1, 1) : 0;
          const jy = i < steps ? Phaser.Math.Between(-1, 1) : 0;
          gfx.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
        }
        gfx.strokePath();
      }
    };
  }

  roughCircle(g, cx, cy, r, alpha) {
    const segs = 30;
    g.lineStyle(1.4, 0xffffff, 0.55 * alpha);
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const jr = r + Phaser.Math.Between(-1, 1);
      const x = cx + Math.cos(a) * jr;
      const y = cy + Math.sin(a) * jr;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
  }

  // ── Room sketch (copied verbatim from Level 1) ─────────────────────────────

  drawRoom(g, w, h) {
    g.clear();

    const sketchLine = (x0, y0, x1, y1, alphaMod = 1) => {
      const drawPass = (ox, oy, noise) => {
        g.lineStyle(1.2, 0xffffff, 0.25 * alphaMod);
        g.beginPath();
        g.moveTo(x0 + ox, y0 + oy);
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const jx = i < steps ? Phaser.Math.Between(-noise, noise) : 0;
          const jy = i < steps ? Phaser.Math.Between(-noise, noise) : 0;
          g.lineTo(x0 + (x1 - x0) * t + ox + jx, y0 + (y1 - y0) * t + oy + jy);
        }
        g.strokePath();
      };
      drawPass(0, 0, 0);
      drawPass(-1, 1, 1);
      drawPass(1, -1, 1);
    };

    const vx = w / 2;
    const vy = h * 0.4;

    const bwW = w * 0.7;
    const bwH = h * 0.55;
    const bwL = vx - bwW / 2;
    const bwR = vx + bwW / 2;
    const bwT = vy - bwH * 0.35;
    const bwB = vy + bwH * 0.65;

    const ext = (px, py) => {
      const dx = px - vx;
      const dy = py - vy;
      return { x: vx + dx * 15, y: vy + dy * 15 };
    };

    sketchLine(bwL, bwT, bwR, bwT, 0.8);
    sketchLine(bwL, bwB, bwR, bwB, 0.8);
    sketchLine(bwL, bwT, bwL, bwB, 0.8);
    sketchLine(bwR, bwT, bwR, bwB, 0.8);

    const tl = ext(bwL, bwT);
    const tr = ext(bwR, bwT);
    const bl = ext(bwL, bwB);
    const br = ext(bwR, bwB);

    sketchLine(bwL, bwT, tl.x, tl.y, 0.5);
    sketchLine(bwR, bwT, tr.x, tr.y, 0.5);
    sketchLine(bwL, bwB, bl.x, bl.y, 0.5);
    sketchLine(bwR, bwB, br.x, br.y, 0.5);

    const boardH = h * 0.04;
    sketchLine(bwL, bwB - boardH, bwR, bwB - boardH, 1.5);

    const baseBl = ext(bwL, bwB - boardH);
    const baseBr = ext(bwR, bwB - boardH);
    sketchLine(bwL, bwB - boardH, baseBl.x, baseBl.y, 1.2);
    sketchLine(bwR, bwB - boardH, baseBr.x, baseBr.y, 1.2);

    const numBoards = 8;
    for (let i = 1; i < numBoards; i++) {
      const t = i / numBoards;
      const px = bwL + bwW * t;
      const pExt = ext(px, bwB);
      sketchLine(px, bwB, pExt.x, pExt.y, 0.25);
    }
  }

  // ── Transition & lifecycle ─────────────────────────────────────────────────

  transitionToLevel(levelKey, skipFade = false) {
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (!this.isSolved && window.playSuccess) window.playSuccess(this);

    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    const fadeOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0, 0).setDepth(100).setAlpha(0);

    const idx = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const nextLvlText = this.add
      .text(width / 2, height / 2, "Level " + (idx + 1) + "...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5).setDepth(101).setAlpha(0);

    this.tweens.add({
      targets: [fadeOverlay, nextLvlText],
      alpha: 1,
      duration: 1000,
      onComplete: () => this.scene.start(levelKey, { skipFade: false }),
    });
  }

  shutdown() {
    this.stopDrone();
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch (e) {}
      this._audioCtx = null;
    }
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
