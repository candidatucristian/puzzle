import GardenEnvironment from "./environment.js";
import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";

// PLANT POT: o grădină sub cerul nopții. Udă planta de 5 ori și ea crește
// după șirul lui Fibonacci (1, 1, 2, 3, 5 frunze).
//
// Decorul e desenat "cu creionul" și animat din update(): stelele sclipesc,
// trece din când în când o stea căzătoare, iarba și florile se
// leagănă în vânt, iar grădinarul respiră. Ghiveciul e colorat (teracotă închisă);
// găleata cu apă și planta sunt exact ca înainte.

export default class PlantPotScene extends BasePuzzleScene {
  constructor() {
    super({ key: "PlantPot" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.image("leaf", "assets/images/PlantPot/leaf.png");
    this.load.audio(
      "wateringplant",
      "assets/sounds/PlantPot/wateringplant.mp3",
    );
  }

  create() {
    this.beginScene();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── State ── (înaintea decorului: la restart scena păstrează valorile vechi)
    this.isSolved = false;
    this.isAnimating = false;
    this.currentStep = 0;
    this.fibSeq = [1, 1, 2, 3, 5];
    this.canPour = true;

    // ── Decorul animat ─────────────────────────────────────────────────────
    this.environment = new GardenEnvironment(this);
    this.environment._buildScenery(width, height);

    this.statusText = this.add
      .text(width / 2, 50, "Who am I? ...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(width - 30, 30, "Level " + this._levelNumber(this.scene.key), {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);

    this.tweens.add({
      targets: this.levelText,
      alpha: 1,
      duration: 2000,
      ease: "Power2",
    });

    // ── Scale factor ────────────────────────────────────────────────────────
    let scaleFactor = Math.min(1, height / 600) * 0.85;

    // ── mainContainer lăsat mai jos ───────────────────────────────────────
    this.mainContainer = this.add.container(
      width * 0.48,
      height * 0.89 - 215 * scaleFactor,
    );
    this.mainContainer.setScale(scaleFactor);

    // ── Noduri tree ───────────────────────────────────────────────────────
    const n0 = { x: 0, y: 55 };
    const nMid = { x: -12, y: -75 };
    const nT = { x: 15, y: -210 };
    const nBR = { x: 140, y: -130 };
    const nBL = { x: -130, y: -270 };
    const nBR2 = { x: 85, y: -370 };

    this.segments = [
      { from: n0, to: nMid, cp: { x: 25, y: -10 } },
      { from: nMid, to: nT, cp: { x: -40, y: -140 } },
      { from: nMid, to: nBR, cp: { x: 60, y: -80 } },
      { from: nT, to: nBL, cp: { x: -50, y: -200 } },
      { from: nT, to: nBR2, cp: { x: 30, y: -290 } },
    ];

    this.segWidths = [16, 10, 6, 6, 6];
    this.segGfx = this.segments.map(() => this.add.graphics());

    // ── plantContainer — poziție locală în mainContainer ─────────────────
    // The pot and the whole plant (stem, leaves) are drawn 30% smaller than
    // they were. The container is scaled about the middle of the pot's base, so
    // the pot keeps sitting exactly where it did on the table.
    this.PLANT_SCALE = 0.7;
    const POT_BASE_Y = 155; // the pot's bottom, in the pot's own drawing
    this.PLANT_LOCAL_X = -130;
    this.PLANT_LOCAL_Y = 60 + POT_BASE_Y * (1 - this.PLANT_SCALE);

    this.plantContainer = this.add.container(
      this.PLANT_LOCAL_X,
      this.PLANT_LOCAL_Y,
    );
    this.plantContainer.setScale(this.PLANT_SCALE);

    this.potGfx = this.add.graphics();
    this.drawPot(this.potGfx);
    this.potRimGfx = this.add.graphics();
    this.drawPotRim(this.potRimGfx);
    this.plantContainer.add([this.potGfx, ...this.segGfx, this.potRimGfx]);

    // ── Frunze ─────────────────────────────────────────────────────────────
    this.leafDefs = [
      [{ segIdx: 0, t: 0.6, ox: 0, oy: 0, angle: 35, scale: 1 }],
      [{ segIdx: 1, t: 0.4, ox: 0, oy: 0, angle: -35, scale: 1 }],
      [
        { segIdx: 2, t: 0.4, ox: 0, oy: 0, angle: 25, scale: 0.9 },
        { segIdx: 2, t: 0.85, ox: 0, oy: 0, angle: 55, scale: 0.9 },
      ],
      [
        { segIdx: 3, t: 0.3, ox: 0, oy: 0, angle: -20, scale: 0.85 },
        { segIdx: 3, t: 0.6, ox: 0, oy: 0, angle: -45, scale: 0.85 },
        { segIdx: 3, t: 0.9, ox: 0, oy: 0, angle: -70, scale: 0.85 },
      ],
      [
        { segIdx: 4, t: 0.18, ox: 0, oy: 0, angle: 20, scale: 0.75 },
        { segIdx: 4, t: 0.38, ox: 0, oy: 0, angle: -15, scale: 0.75 },
        { segIdx: 4, t: 0.58, ox: 0, oy: 0, angle: 35, scale: 0.75 },
        { segIdx: 4, t: 0.78, ox: 0, oy: 0, angle: -5, scale: 0.75 },
        { segIdx: 4, t: 0.96, ox: 0, oy: 0, angle: 45, scale: 0.75 },
      ],
    ];

    // ── bucketContainer — poziție locală în mainContainer ─────────────────
    this.BUCKET_HOME_X = 150;
    this.BUCKET_HOME_Y = 162;

    this.bucketContainer = this.add.container(
      this.BUCKET_HOME_X,
      this.BUCKET_HOME_Y,
    );
    this.bucketContainer.setSize(100, 100).setInteractive({ cursor: "grab" });
    this.bucketGfx = this.add.graphics();
    this.waterFillGfx = this.add.graphics();
    this.drawBucket(this.bucketGfx, this.waterFillGfx, 1.0);
    this.bucketContainer.add([this.waterFillGfx, this.bucketGfx]);
    this.input.setDraggable(this.bucketContainer);

    // Asamblăm containerul principal
    this.mainContainer.add([this.plantContainer, this.bucketContainer]);

    // ── Drag Handlers ──────────────────────────────────────────────────────
    this.input.on("dragstart", (pointer, gameObject) => {
      if (this.isSolved || this.isAnimating) return;
      this.mainContainer.bringToTop(gameObject);
      let localMouseX =
        (pointer.x - this.mainContainer.x) / this.mainContainer.scaleX;
      let localMouseY =
        (pointer.y - this.mainContainer.y) / this.mainContainer.scaleY;
      gameObject.dragOffsetX = gameObject.x - localMouseX;
      gameObject.dragOffsetY = gameObject.y - localMouseY;
      this.services.audio.playClick(this);
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
      let localMouseX =
        (pointer.x - this.mainContainer.x) / this.mainContainer.scaleX;
      let localMouseY =
        (pointer.y - this.mainContainer.y) / this.mainContainer.scaleY;
      gameObject.x = localMouseX + gameObject.dragOffsetX;
      gameObject.y = localMouseY + gameObject.dragOffsetY;
      const pour = this._pourPoint();
      const dist = Phaser.Math.Distance.Between(
        this.bucketContainer.x,
        this.bucketContainer.y,
        pour.x,
        pour.y,
      );
      if (dist > 100) {
        this.canPour = true;
      }
      if (dist < 60 && this.canPour) {
        this.canPour = false;
        this.triggerPour();
      }
    });

    // ── Resize ─────────────────────────────────────────────────────────────
    // păstrăm referința ca să scoatem listener-ul la shutdown
    this._onResize = (size) => {
      this.environment._buildScenery(size.width, size.height);
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      let newScale = Math.min(1, size.height / 600) * 0.85;
      this.mainContainer.setPosition(
        size.width * 0.48,
        size.height * 0.89 - 215 * newScale,
      );
      this.mainContainer.setScale(newScale);
    };
    this.listenToResize(this._onResize);

    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(
          width / 2,
          height / 2,
          "Level " + this._levelNumber(this.scene.key) + "...",
          {
            fontFamily: '"Special Elite", monospace',
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

  _levelNumber(key) {
    const i = this.services.levels.definitions
      ? this.services.levels.definitions.findIndex((l) => l.key === key)
      : -1;
    return i !== -1 ? i + 1 : "?";
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ANIMAȚIILE DECORULUI (rulează în fiecare cadru)
  // ══════════════════════════════════════════════════════════════════════════

  update(time, delta) {
    this.environment?.update(time, delta);
  }



  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = Math.max(14, Math.round(r * 0.9));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.2;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _pencilArc(g, rnd, cx, cy, r, a0, a1, width, color, alpha) {
    const steps = Math.max(6, Math.ceil((Math.abs(a1 - a0) * r) / 6));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const jr = r + (rnd() - 0.5) * 1.2;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  triggerPour() {
    if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
    this.isAnimating = true;
    this.input.setDraggable(this.bucketContainer, false);
    this.services.audio.playSfx("wateringplant", 1, this);
    this.pourAndGrow();
  }

  // puncte de-a lungul unei curbe Bézier pătratice
  _qPts(x0, y0, cx, cy, x1, y1, n = 14) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: this.qBez(t, x0, cx, x1), y: this.qBez(t, y0, cy, y1) });
    }
    return pts;
  }

  drawPot(g) {
    g.clear();

    // ── culoarea: lut ars, dar închis la culoare ca să se potrivească temei ──
    // corpul ghiveciului
    const body = [
      ...this._qPts(-55, 50, 0, 65, 55, 50),
      ...this._qPts(55, 50, 45, 110, 30, 150).slice(1),
      ...this._qPts(30, 150, 0, 160, -30, 150).slice(1),
      ...this._qPts(-30, 150, -45, 110, -55, 50).slice(1),
    ];
    g.fillStyle(0x50301f, 1);
    g.fillPoints(body, true);
    // umbră pe partea dreaptă, pentru volum
    g.fillStyle(0x2a170d, 0.6);
    g.fillPoints(
      [
        ...this._qPts(55, 50, 45, 110, 30, 150),
        ...this._qPts(18, 152, 32, 110, 40, 58),
      ],
      true,
    );
    // lumină pe partea stângă
    g.lineStyle(5, 0x8a5a3e, 0.26);
    const hi = this._qPts(-42, 72, -36, 110, -24, 144);
    for (let i = 1; i < hi.length; i++)
      g.lineBetween(hi[i - 1].x, hi[i - 1].y, hi[i].x, hi[i].y);
    // pământul din ghiveci
    g.fillStyle(0x2b1d15, 1);
    g.fillPoints(
      [
        ...this._qPts(-55, 50, 0, 35, 55, 50),
        ...this._qPts(55, 50, 0, 65, -55, 50).slice(1),
      ],
      true,
    );
    g.fillStyle(0x4a3526, 0.8);
    for (const [px, py] of [
      [-30, 48],
      [-12, 45],
      [22, 47],
      [36, 51],
      [-38, 52],
    ])
      g.fillCircle(px, py, 1.4);

    g.lineStyle(1.2, 0xffffff, 0.7);
    const sketchCurve = (x0, y0, cx, cy, x1, y1) => {
      const d = (ox, oy, dcx, dcy, alphaMod) => {
        g.lineStyle(1.2, 0xffffff, 0.7 * alphaMod);
        g.beginPath();
        g.moveTo(x0 + ox, y0 + oy);
        for (let i = 1; i <= 12; i++) {
          let t = i / 12;
          g.lineTo(
            this.qBez(t, x0 + ox, cx + dcx, x1 + ox),
            this.qBez(t, y0 + oy, cy + dcy, y1 + oy),
          );
        }
        g.strokePath();
      };
      d(0, 0, 0, 0, 1);
      d(-1, 1, 1, -1, 0.6);
      d(1, -1, -1, 1, 0.4);
    };
    sketchCurve(-55, 50, 0, 35, 55, 50);
    sketchCurve(-55, 50, 0, 65, 55, 50);
    sketchCurve(-45, 55, 0, 62, 45, 55);
    sketchCurve(-55, 50, -45, 110, -30, 150);
    sketchCurve(55, 50, 45, 110, 30, 150);
    sketchCurve(-30, 150, 0, 160, 30, 150);
  }

  // buza ghiveciului: stă în fața tulpinii, deci planta pare înfiptă în pământ
  drawPotRim(g) {
    g.clear();
    const band = [
      ...this._qPts(-55, 50, 0, 65, 55, 50),
      ...this._qPts(52.9, 62, 0, 77, -52.9, 62),
    ];
    g.fillStyle(0x63402b, 1);
    g.fillPoints(band, true);
    const stroke = (pts, alpha) => {
      g.lineStyle(1.2, 0xffffff, alpha);
      for (let i = 1; i < pts.length; i++)
        g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    };
    stroke(this._qPts(-55, 50, 0, 65, 55, 50), 0.7);
    stroke(this._qPts(-54, 51, 1, 64, 56, 49), 0.3);
    stroke(this._qPts(-52.9, 62, 0, 77, 52.9, 62), 0.45);
  }

  drawBucket(gOutline, gWater, waterRatio) {
    gOutline.clear();
    gWater.clear();
    gOutline.lineStyle(1.2, 0xffffff, 0.7);
    const sketchCurve = (x0, y0, cx, cy, x1, y1) => {
      const d = (ox, oy, dcx, dcy, alphaMod) => {
        gOutline.lineStyle(1.2, 0xffffff, 0.7 * alphaMod);
        gOutline.beginPath();
        gOutline.moveTo(x0 + ox, y0 + oy);
        for (let i = 1; i <= 12; i++) {
          let t = i / 12;
          gOutline.lineTo(
            this.qBez(t, x0 + ox, cx + dcx, x1 + ox),
            this.qBez(t, y0 + oy, cy + dcy, y1 + oy),
          );
        }
        gOutline.strokePath();
      };
      d(0, 0, 0, 0, 1);
      d(-1, 1, 1, -1, 0.6);
      d(1, -1, -1, 1, 0.4);
    };
    sketchCurve(-38, -35, 0, -100, 38, -35);
    gOutline.fillStyle(0xffffff, 0.8);
    gOutline.fillCircle(-38, -35, 3.5);
    gOutline.fillCircle(38, -35, 3.5);
    sketchCurve(-38, -35, 0, -20, 38, -35);
    sketchCurve(-38, -35, 0, -14, 38, -35);
    sketchCurve(-38, -35, 0, -50, 38, -35);
    sketchCurve(-38, -35, -34, 10, -26, 45);
    sketchCurve(38, -35, 34, 10, 26, 45);
    sketchCurve(-26, 45, 0, 58, 26, 45);
    sketchCurve(-26, 45, 0, 32, 26, 45);
    gOutline.lineStyle(1, 0xffffff, 0.3);
    sketchCurve(-28, -25, -24, 10, -18, 35);
    gOutline.lineStyle(1, 0xffffff, 0.15);
    sketchCurve(28, -25, 24, 10, 18, 35);

    if (waterRatio > 0.02) {
      let wH = 80 * waterRatio;
      let wY = 45 - wH;
      let t = (45 - wY) / 80;
      let wX = 26 + t * 12;
      gWater.fillStyle(0x00e5ff, 0.55);
      gWater.beginPath();
      gWater.moveTo(-wX, wY);
      gWater.lineTo(wX, wY);
      gWater.lineTo(26, 45);
      for (let i = 1; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(this.qBez(ct, 26, 0, -26), this.qBez(ct, 45, 58, 45));
      }
      gWater.closePath();
      gWater.fillPath();
      gWater.fillStyle(0x00e5ff, 0.9);
      gWater.beginPath();
      for (let i = 0; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(
          this.qBez(ct, -wX, 0, wX),
          this.qBez(ct, wY, wY + wX * 0.35, wY),
        );
      }
      for (let i = 0; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(
          this.qBez(ct, wX, 0, -wX),
          this.qBez(ct, wY, wY - wX * 0.35, wY),
        );
      }
      gWater.closePath();
      gWater.fillPath();
      gWater.lineStyle(1, 0xffffff, 0.4);
      gWater.beginPath();
      gWater.moveTo(-wX + 4, wY + wX * 0.1);
      for (let i = 1; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(
          this.qBez(ct, -wX + 4, 0, wX - 4),
          this.qBez(ct, wY + wX * 0.1, wY + wX * 0.3, wY + wX * 0.1),
        );
      }
      gWater.strokePath();
    }
  }

  qBez(t, p0, cp, p1) {
    const mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * cp + t * t * p1;
  }

  getSegPoint(seg, t) {
    const cp = seg.cp || { x: seg.to.x, y: seg.from.y };
    return {
      x: this.qBez(t, seg.from.x, cp.x, seg.to.x),
      y: this.qBez(t, seg.from.y, cp.y, seg.to.y),
    };
  }

  drawSegment(gfx, seg, progress, lineWidth) {
    gfx.clear();
    const cp = seg.cp || { x: seg.to.x, y: seg.from.y };
    const STEPS = 60;
    gfx.fillStyle(0x6d4c41, 1);
    for (let s = 0; s <= STEPS; s++) {
      const t = (s / STEPS) * progress;
      const x = this.qBez(t, seg.from.x, cp.x, seg.to.x);
      const y = this.qBez(t, seg.from.y, cp.y, seg.to.y);
      const currentWidth = lineWidth * (1 - t * 0.4);
      gfx.fillCircle(x, y, currentWidth / 2);
    }
  }

  // Where the bucket's middle goes to pour: its lip (about 41 px left of and
  // 31 px below its middle when tipped) sits just above the middle of the pot's
  // rim, whatever size the pot is drawn at.
  _pourPoint() {
    const k = this.PLANT_SCALE;
    return {
      x: this.plantContainer.x + 4 * k + 41,
      y: this.plantContainer.y + 16 * k - 31,
    };
  }

  pourAndGrow() {
    const step = this.currentStep;
    this.tweens.addCounter({
      from: 1 - step / 5,
      to: 1 - (step + 1) / 5,
      duration: 1200,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        this.drawBucket(this.bucketGfx, this.waterFillGfx, tween.getValue());
      },
    });
    const pour = this._pourPoint();
    this.tweens.add({
      targets: this.bucketContainer,
      angle: -80,
      x: pour.x,
      y: pour.y,
      duration: 400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: this.bucketContainer,
            angle: 0,
            x: this.BUCKET_HOME_X,
            y: this.BUCKET_HOME_Y,
            duration: 400,
            ease: "Sine.easeInOut",
            onComplete: () => {
              this.canPour = true;
            },
          });
        });
      },
    });
    this.time.delayedCall(400, () => {
      let dropsPoured = 0;
      this.time.addEvent({
        delay: 15,
        repeat: 55,
        callback: () => {
          let rad = Phaser.Math.DegToRad(this.bucketContainer.angle);
          let cos = Math.cos(rad);
          let sin = Math.sin(rad);
          let lipLocalX = this.bucketContainer.x + (-38 * cos - -35 * sin);
          let lipLocalY = this.bucketContainer.y + (-38 * sin + -35 * cos);
          const dropGfx = this.add.graphics();
          dropGfx.fillStyle(0x00e5ff, 0.9);
          dropGfx.fillEllipse(
            0,
            0,
            Phaser.Math.Between(3, 5),
            Phaser.Math.Between(6, 12),
          );
          dropGfx.setPosition(
            lipLocalX + Phaser.Math.Between(-5, 5),
            lipLocalY + Phaser.Math.Between(-5, 5),
          );
          dropGfx.rotation = Phaser.Math.DegToRad(
            -15 + Phaser.Math.Between(-5, 5),
          );
          this.mainContainer.add(dropGfx);
          // the drops land on the soil, which is smaller now too
          const k = this.PLANT_SCALE;
          const targetX =
            this.plantContainer.x + Phaser.Math.Between(-15, 15) * k;
          const targetY = this.plantContainer.y + 55 * k;
          this.tweens.add({
            targets: dropGfx,
            x: targetX,
            duration: 350 + Phaser.Math.Between(0, 100),
            ease: "Linear",
          });
          this.tweens.add({
            targets: dropGfx,
            y: targetY,
            duration: 350 + Phaser.Math.Between(0, 100),
            ease: "Quad.easeIn",
            alpha: { from: 1, to: 0 },
            onComplete: () => {
              dropGfx.destroy();
              dropsPoured++;
              if (dropsPoured === 56) {
                this.growCurrentSegment(step);
              }
            },
          });
        },
      });
    });
  }

  growCurrentSegment(step) {
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

  spawnLeaves(step, onDone) {
    const defs = this.leafDefs[step];
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const seg = this.segments[d.segIdx];
      const pos = this.getSegPoint(seg, d.t);
      const leafImg = this.add.image(pos.x + d.ox, pos.y + d.oy, "leaf");
      const BASE_SCALE = 0.17;
      const ANGLE_OFFSET = -45;
      leafImg.setOrigin(0.05, 0.95);
      leafImg.setAngle(d.angle + ANGLE_OFFSET);
      leafImg.baseAngle = d.angle + ANGLE_OFFSET;
      leafImg.setScale(0);
      leafImg.setInteractive({ cursor: "pointer" });
      leafImg.on("pointerdown", () => {
        if (leafImg.isSwinging) return;
        leafImg.isSwinging = true;
        this.tweens.add({
          targets: leafImg,
          angle: leafImg.baseAngle + Phaser.Math.Between(12, 22),
          duration: 150,
          yoyo: true,
          repeat: 1,
          ease: "Sine.easeInOut",
          onComplete: () => {
            leafImg.angle = leafImg.baseAngle;
            leafImg.isSwinging = false;
          },
        });
      });
      this.plantContainer.addAt(leafImg, 0);
      const finalScale = (d.scale || 1) * BASE_SCALE;
      this.tweens.add({
        targets: leafImg,
        scaleX: finalScale,
        scaleY: finalScale,
        duration: 500,
        delay: i * 220,
        ease: "Back.easeOut",
      });
    }
    const totalDelay = (defs.length - 1) * 220 + 510;
    this.time.delayedCall(totalDelay, () => {
      this.input.setDraggable(this.bucketContainer, true);
      onDone();
    });
  }

  finishLevel() {
    this.isSolved = true;
    this.statusText.setText(
      "Nature's sequence is complete. Whose name does it bear?",
    );
    this.statusText.setColor("#1aaf7a");
    // mică recompensă: trece o stea căzătoare
    this.environment.celebrate();
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.environment?.destroy();
    this.environment = null;
  }
}
