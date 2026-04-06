class Level2 extends Phaser.Scene {
  constructor() {
    super({ key: "Level2" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.image("bg", "assets/images/background.png");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add
      .image(width / 2, height / 2, "bg")
      .setDisplaySize(width, height)
      .setDepth(-10);

    this.statusText = this.add
      .text(width / 2, 50, "Water the plant to uncover its pattern.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#aaaaaa",
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    this.levelText = this.add
      .text(width - 30, 30, "Level 2", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setAlpha(0);

    this.tweens.add({
      targets: this.levelText,
      alpha: 1,
      duration: 2000,
      ease: "Power2",
    });

    // ── State ──────────────────────────────────────────────────────────────
    this.isSolved = false;
    this.isAnimating = false;
    this.currentStep = 0;
    this.fibSeq = [1, 1, 2, 3, 5];

    // ── Container centrat puțin mai jos ───────────────────────────────────
    this.mainContainer = this.add.container(width / 2, height / 2 + 80);

    // ══════════════════════════════════════════════════════════════════════
    // STRUCTURA ARBORELUI
    // Trunchi vertical + 4 crengi care pornesc din trunchi
    //
    //  Noduri (coordonate locale față de container):
    //
    //       [nT]  ← vârful trunchiului
    //        |
    //  [nBL] | [nBR2]   ← crengi sus
    //        |
    //  [nBL2]| [nBR]    ← crengi jos
    //        |
    //       [n0]  ← baza trunchiului (gura ghiveciului)
    //
    // Segmente (cresc în ordinea udărilor):
    //   seg0: n0 → nMid    (trunchi jos)         udare 1
    //   seg1: nMid → nT    (trunchi sus)          udare 2
    //   seg2: nMid → nBR   (crengă dreapta jos)   udare 3  → 2 frunze
    //   seg3: nT   → nBL   (crengă stânga sus)    udare 4  → 3 frunze
    //   seg4: nT   → nBR2  (crengă dreapta sus)   udare 5  → 5 frunze
    // ══════════════════════════════════════════════════════════════════════

    const n0 = { x: 0, y: 55 }; // baza
    const nMid = { x: -8, y: -75 }; // bifurcație trunchi
    const nT = { x: 10, y: -210 }; // vârf trunchi
    const nBR = { x: 130, y: -120 }; // crengă dreapta jos
    const nBL = { x: -120, y: -285 }; // crengă stânga sus
    const nBR2 = { x: 110, y: -295 }; // crengă dreapta sus

    this.segments = [
      { from: n0, to: nMid, cp: { x: -5, y: n0.y } }, // seg0
      { from: nMid, to: nT, cp: { x: 15, y: nMid.y } }, // seg1
      { from: nMid, to: nBR, cp: { x: 90, y: nMid.y } }, // seg2
      { from: nT, to: nBL, cp: { x: -80, y: nT.y } }, // seg3
      { from: nT, to: nBR2, cp: { x: 80, y: nT.y } }, // seg4
    ];

    // Grosimea fiecărui segment (trunchiul e mai gros)
    this.segWidths = [9, 7, 5, 5, 5];

    // Graphics per segment
    this.segGfx = this.segments.map(() => this.add.graphics());

    // ── Ghiveci ───────────────────────────────────────────────────────────
    this.potGfx = this.add.graphics();
    this.drawPot(this.potGfx);

    // ══════════════════════════════════════════════════════════════════════
    // FRUNZE — definite manual, niciuna nu se suprapune
    // Toate au vârful spre dreapta-sus (angle ~ 35-50°)
    // Format: { segIdx, t, ox, oy, angle, scale }
    // scale 1 = frunză mare (len=90px)
    // ══════════════════════════════════════════════════════════════════════
    this.leafDefs = [
      // ── Udare 1 → 1 frunză pe seg0 ───────────────────────────────────
      [{ segIdx: 0, t: 0.6, ox: 0, oy: 0, angle: 35, scale: 1 }],

      // ── Udare 2 → 1 frunză pe seg1 ───────────────────────────────────
      [{ segIdx: 1, t: 0.4, ox: 0, oy: 0, angle: -35, scale: 1 }],

      // ── Udare 3 → 2 frunze pe seg2 ───────────────────────────────────
      [
        { segIdx: 2, t: 0.4, ox: 0, oy: 0, angle: 25, scale: 0.9 },
        { segIdx: 2, t: 0.85, ox: 0, oy: 0, angle: 55, scale: 0.9 },
      ],

      // ── Udare 4 → 3 frunze pe seg3 ───────────────────────────────────
      [
        { segIdx: 3, t: 0.3, ox: 0, oy: 0, angle: -20, scale: 0.85 },
        { segIdx: 3, t: 0.6, ox: 0, oy: 0, angle: -45, scale: 0.85 },
        { segIdx: 3, t: 0.9, ox: 0, oy: 0, angle: -70, scale: 0.85 },
      ],

      // ── Udare 5 → 5 frunze pe seg4 + seg1 ───────────────────────────
      [
        { segIdx: 4, t: 0.25, ox: 0, oy: 0, angle: 20, scale: 0.8 },
        { segIdx: 4, t: 0.55, ox: 0, oy: 0, angle: 45, scale: 0.8 },
        { segIdx: 4, t: 0.85, ox: 0, oy: 0, angle: 70, scale: 0.8 },
        { segIdx: 1, t: 0.75, ox: 0, oy: 0, angle: -40, scale: 0.85 },
        { segIdx: 1, t: 0.95, ox: 0, oy: 0, angle: 25, scale: 0.85 },
      ],
    ];

    // ── Galeată ──────────────────────────────────────────────────────────
    this.bucketContainer = this.add.container(195, 10);
    this.bucketContainer
      .setSize(100, 100)
      .setInteractive({ cursor: "pointer" });
    this.bucketGfx = this.add.graphics();
    this.waterFillGfx = this.add.graphics();
    this.drawBucket(this.bucketGfx, this.waterFillGfx, 1.0);
    this.bucketContainer.add([this.waterFillGfx, this.bucketGfx]);

    // Asamblăm containerul
    this.mainContainer.add([this.potGfx, ...this.segGfx, this.bucketContainer]);

    // ── Click găleată ─────────────────────────────────────────────────────
    this.bucketContainer.on("pointerdown", () => {
      if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
      this.isAnimating = true;
      if (window.playUIClick) window.playUIClick();
      this.pourAndGrow();
    });

    // ── Resize ────────────────────────────────────────────────────────────
    this.events.on("canvas_resized", (size) => {
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.mainContainer.setPosition(size.width / 2, size.height / 2 + 80);
    });

    // ── Fade-in ───────────────────────────────────────────────────────────
    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(width / 2, height / 2, "Level 2...", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
        })
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

  // ─────────────────────────────────────────────────────────────────────────
  // Ghiveci gol, contur alb
  // ─────────────────────────────────────────────────────────────────────────
  drawPot(g) {
    g.clear();
    g.lineStyle(5, 0xffffff, 1);
    // Corp
    g.beginPath();
    g.moveTo(-58, 62);
    g.lineTo(58, 62);
    g.lineTo(40, 155);
    g.lineTo(-40, 155);
    g.closePath();
    g.strokePath();
    // Bordura de sus
    g.beginPath();
    g.moveTo(-65, 55);
    g.lineTo(65, 55);
    g.strokePath();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Galeată stil schiță
  // ─────────────────────────────────────────────────────────────────────────
  drawBucket(gOutline, gWater, waterRatio) {
    gOutline.clear();
    gWater.clear();
    const r = 34;
    const waterH = r * 2 * waterRatio;
    const waterTop = r - waterH;
    const pts = [];
    for (let a = 0; a <= 360; a += 8) {
      const rad = Phaser.Math.DegToRad(a);
      const px = Math.cos(rad) * r;
      const py = Math.sin(rad) * r;
      if (py >= waterTop) pts.push({ x: px, y: py });
    }
    if (pts.length > 1) {
      gWater.fillStyle(0x4488dd, 0.88);
      gWater.fillPoints(pts, true);
    }
    gOutline.lineStyle(4, 0xffffff, 1);
    gOutline.strokeCircle(0, 0, r);
    // Cioc
    gOutline.beginPath();
    gOutline.moveTo(-r + 5, -6);
    gOutline.lineTo(-r - 20, -20);
    gOutline.lineTo(-r - 28, -8);
    gOutline.strokePath();
    // Mâner
    gOutline.lineStyle(3, 0xffffff, 1);
    gOutline.beginPath();
    gOutline.moveTo(r - 4, -8);
    gOutline.lineTo(r + 20, -20);
    gOutline.lineTo(r + 24, -6);
    gOutline.lineTo(r + 16, 6);
    gOutline.strokePath();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bezier quadratic scalar
  // ─────────────────────────────────────────────────────────────────────────
  qBez(t, p0, cp, p1) {
    const mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * cp + t * t * p1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Punct pe segment la t ∈ [0,1] (cu punct de control custom)
  // ─────────────────────────────────────────────────────────────────────────
  getSegPoint(seg, t) {
    const cp = seg.cp || { x: seg.to.x, y: seg.from.y };
    return {
      x: this.qBez(t, seg.from.x, cp.x, seg.to.x),
      y: this.qBez(t, seg.from.y, cp.y, seg.to.y),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FRUNZĂ MARE — culoare teal/jade cu contur alb
  // len = 90px, lată și elegantă
  // angleDeg: 0 = vârf sus; 40 = vârf dreapta-sus
  // ─────────────────────────────────────────────────────────────────────────
  drawLeafAt(gfx, ox, oy, angleDeg, scale = 1) {
    const len = 90 * scale;
    const wide = 32 * scale;
    const STEPS = 24;

    const rad = Phaser.Math.DegToRad(angleDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const R = (lx, ly) => ({
      x: ox + lx * cos - ly * sin,
      y: oy + lx * sin + ly * cos,
    });

    const base = R(0, 0);
    const tip = R(0, -len);
    // Punct control asimetric: bombăm mai mult pe stânga (pare mai naturală)
    const cpL = R(-wide, -len * 0.42);
    const cpR = R(wide * 0.75, -len * 0.42);

    // Poligon
    const pts = [];
    for (let s = 0; s <= STEPS; s++) {
      const t = s / STEPS;
      pts.push({
        x: this.qBez(t, base.x, cpL.x, tip.x),
        y: this.qBez(t, base.y, cpL.y, tip.y),
      });
    }
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS;
      pts.push({
        x: this.qBez(t, tip.x, cpR.x, base.x),
        y: this.qBez(t, tip.y, cpR.y, base.y),
      });
    }

    // Fill: gradient simulat cu două straturi
    // Strat interior mai deschis (highlight)
    gfx.fillStyle(0x1aaf7a, 1); // jade / teal vibrant
    gfx.fillPoints(pts, true);

    // Contur alb gros — stilul hand-drawn
    gfx.lineStyle(4, 0xffffff, 1);
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.strokePath();

    // Nervul central alb
    const nv1 = R(0, -len * 0.7);
    gfx.lineStyle(2.5, 0xffffff, 0.7);
    gfx.beginPath();
    gfx.moveTo(base.x, base.y);
    gfx.lineTo(nv1.x, nv1.y);
    gfx.strokePath();

    // 2 nervuri laterale mici
    const nSideL1 = R(-wide * 0.35, -len * 0.3);
    const nSideL2 = R(-wide * 0.45, -len * 0.55);
    const nSideR1 = R(wide * 0.25, -len * 0.3);
    const nSideR2 = R(wide * 0.3, -len * 0.55);
    const nBase30 = R(0, -len * 0.28);
    const nBase52 = R(0, -len * 0.5);

    gfx.lineStyle(1.5, 0xffffff, 0.45);
    gfx.beginPath();
    gfx.moveTo(nBase30.x, nBase30.y);
    gfx.lineTo(nSideL1.x, nSideL1.y);
    gfx.strokePath();

    gfx.beginPath();
    gfx.moveTo(nBase52.x, nBase52.y);
    gfx.lineTo(nSideL2.x, nSideL2.y);
    gfx.strokePath();

    gfx.beginPath();
    gfx.moveTo(nBase30.x, nBase30.y);
    gfx.lineTo(nSideR1.x, nSideR1.y);
    gfx.strokePath();

    gfx.beginPath();
    gfx.moveTo(nBase52.x, nBase52.y);
    gfx.lineTo(nSideR2.x, nSideR2.y);
    gfx.strokePath();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Desenează un segment de ramură (cu punct de control custom)
  // ─────────────────────────────────────────────────────────────────────────
  drawSegment(gfx, seg, progress, lineWidth) {
    gfx.clear();
    gfx.lineStyle(lineWidth, 0xffffff, 1);
    gfx.beginPath();
    gfx.moveTo(seg.from.x, seg.from.y);

    const cp = seg.cp || { x: seg.to.x, y: seg.from.y };
    const STEPS = 28;
    for (let s = 1; s <= STEPS; s++) {
      const t = (s / STEPS) * progress;
      gfx.lineTo(
        this.qBez(t, seg.from.x, cp.x, seg.to.x),
        this.qBez(t, seg.from.y, cp.y, seg.to.y),
      );
    }
    gfx.strokePath();
  }

  // ─────────────────────────────────────────────────────────────────────────
  pourAndGrow() {
    const step = this.currentStep;
    const leavesToSpawn = this.fibSeq[step];

    // Apa scade
    const waterRatio = 1 - (step + 1) / 5;
    this.drawBucket(
      this.bucketGfx,
      this.waterFillGfx,
      Math.max(0.02, waterRatio),
    );

    // Picătură animată
    const dropGfx = this.add.graphics();
    dropGfx.fillStyle(0x88ccff, 1);
    dropGfx.fillCircle(0, 0, 8);
    dropGfx.setPosition(
      this.bucketContainer.x - 45,
      this.bucketContainer.y + 14,
    );
    this.mainContainer.add(dropGfx);

    this.tweens.add({
      targets: this.bucketContainer,
      angle: -52,
      x: this.bucketContainer.x - 50,
      y: this.bucketContainer.y - 10,
      duration: 220,
      yoyo: true,
      hold: 100,
    });

    this.tweens.add({
      targets: dropGfx,
      y: dropGfx.y + 140,
      alpha: 0,
      duration: 460,
      ease: "Power1",
      onComplete: () => {
        dropGfx.destroy();
        this.growCurrentSegment(step, leavesToSpawn);
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  growCurrentSegment(step, leavesToSpawn) {
    const seg = this.segments[step];
    const gfx = this.segGfx[step];
    const lw = this.segWidths[step];

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 800,
      ease: "Sine.easeOut",
      onUpdate: (tween) => {
        this.drawSegment(gfx, seg, tween.getValue(), lw);
      },
      onComplete: () => {
        this.drawSegment(gfx, seg, 1, lw);
        this.spawnLeaves(step, () => {
          this.currentStep++;
          if (this.currentStep >= 5) {
            this.finishLevel();
          } else {
            this.isAnimating = false;
          }
        });
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  spawnLeaves(step, onDone) {
    const defs = this.leafDefs[step];

    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const seg = this.segments[d.segIdx];
      const pos = this.getSegPoint(seg, d.t);

      const leafGfx = this.add.graphics();
      leafGfx.setPosition(pos.x + d.ox, pos.y + d.oy);
      this.drawLeafAt(leafGfx, 0, 0, d.angle, d.scale || 1);
      leafGfx.setScale(0);

      this.mainContainer.add(leafGfx);

      this.tweens.add({
        targets: leafGfx,
        scaleX: 1,
        scaleY: 1,
        duration: 500,
        delay: i * 220,
        ease: "Back.easeOut",
      });
    }

    const totalDelay = (defs.length - 1) * 220 + 510;
    this.time.delayedCall(totalDelay, onDone);
  }

  // ─────────────────────────────────────────────────────────────────────────
  finishLevel() {
    this.isSolved = true;
    if (window.playSuccess) window.playSuccess(this);

    this.statusText.setText("Fibonacci sequence complete. Code revealed.");
    this.statusText.setColor("#1aaf7a");

    const finalWord = this.add
      .text(60, -175, "FIBO", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "60px",
        color: "#ffffff",
        fontStyle: "bold",
        shadow: { blur: 22, color: "#1aaf7a", fill: true },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.6);

    this.mainContainer.add(finalWord);

    this.tweens.add({
      targets: finalWord,
      alpha: 1,
      scale: 1.1,
      duration: 1000,
      ease: "Back.easeOut",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  transitionToLevel(levelNumber, skipFade = false) {
    if (levelNumber === 2 && skipFade) {
      this.scene.restart({ skipFade: true });
      return;
    }
    if (skipFade) {
      this.scene.start("Level" + levelNumber, { skipFade: true });
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
        this.scene.start("Level" + levelNumber, { skipFade: false });
      },
    });
  }
}
