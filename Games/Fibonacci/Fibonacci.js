class FibonacciScene extends Phaser.Scene {
  constructor() {
    super({ key: "Fibonacci" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.image("leaf", "assets/images/Fibonacci/leaf.png");
    this.load.audio("wateringplant", "assets/sounds/Fibonacci/wateringplant.mp3");
    this.load.audio("click",         "assets/sounds/global/click.mp3");
    this.load.audio("ui_click",      "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel",     "assets/sounds/global/nextlevel.wav");
    this.load.audio("error",         "assets/sounds/global/error.mp3");
    this.load.audio("bgm",           "assets/sounds/global/background.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.bgGfx = this.add.graphics().setDepth(-10);
    this.drawBg = (w, h) => {
      this.bgGfx.clear();
      this.bgGfx.fillGradientStyle(0x222233, 0x222233, 0x0a0a10, 0x0a0a10, 1);
      this.bgGfx.fillRect(0, 0, w, h);
    };
    this.drawBg(width, height);

    // ── Room Background (Sketched) ──
    this.roomGfx = this.add.graphics().setDepth(-5);
    this.drawRoom(this.roomGfx, width, height);

    this.statusText = this.add
      .text(width / 2, 50, "I forgot my name ...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    this.levelText = this.add
      .text(width - 30, 30, "Level 3", {
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
    this.canPour = true;

    // ── Scale factor ────────────────────────────────────────────────────────
    let scaleFactor = Math.min(1, height / 600) * 0.85;

    // ── mainContainer lăsat mai jos ───────────────────────────────────────
    this.mainContainer = this.add.container(width / 2, height / 2 + 110);
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
    // Plantat la (-130, 60) pentru a fi coborât mai mult pe ecran
    this.PLANT_LOCAL_X = -130;
    this.PLANT_LOCAL_Y = 60;

    this.plantContainer = this.add.container(
      this.PLANT_LOCAL_X,
      this.PLANT_LOCAL_Y,
    );

    this.potGfx = this.add.graphics();
    this.drawPot(this.potGfx);
    this.plantContainer.add([this.potGfx, ...this.segGfx]);

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
    // Aliniem vizual baza găleții cu baza ghiveciului pe o linie dreaptă
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
      if (window.playClick) window.playClick(this);
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
      let localMouseX =
        (pointer.x - this.mainContainer.x) / this.mainContainer.scaleX;
      let localMouseY =
        (pointer.y - this.mainContainer.y) / this.mainContainer.scaleY;
      gameObject.x = localMouseX + gameObject.dragOffsetX;
      gameObject.y = localMouseY + gameObject.dragOffsetY;
      const pourTargetX = this.plantContainer.x + 45;
      const pourTargetY = this.plantContainer.y - 15;
      const dist = Phaser.Math.Distance.Between(
        this.bucketContainer.x,
        this.bucketContainer.y,
        pourTargetX,
        pourTargetY,
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
    this.events.on("canvas_resized", (size) => {
      this.drawBg(size.width, size.height);
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.mainContainer.setPosition(size.width / 2, size.height / 2 + 110);
      let newScale = Math.min(1, size.height / 600) * 0.85;
      this.mainContainer.setScale(newScale);
      this.drawRoom(this.roomGfx, size.width, size.height);
    });

    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(width / 2, height / 2, "Level 3...", {
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

  triggerPour() {
    if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
    this.isAnimating = true;
    this.input.setDraggable(this.bucketContainer, false);
    if (this.cache.audio.exists("wateringplant")) {
      this.sound.play("wateringplant", { volume: 1 });
    }
    this.pourAndGrow();
  }

  drawRoom(g, w, h) {
    g.clear();
    const sketchLine = (x0, y0, x1, y1, alphaMod = 1) => {
      const drawPass = (ox, oy, noise) => {
        g.lineStyle(1.2, 0xffffff, 0.25 * alphaMod);
        g.beginPath();
        g.moveTo(x0 + ox, y0 + oy);
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          let t = i / steps;
          let jx = i < steps ? Phaser.Math.Between(-noise, noise) : 0;
          let jy = i < steps ? Phaser.Math.Between(-noise, noise) : 0;
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
      let dx = px - vx;
      let dy = py - vy;
      return { x: vx + dx * 15, y: vy + dy * 15 };
    };
    sketchLine(bwL, bwT, bwR, bwT, 0.8);
    sketchLine(bwL, bwB, bwR, bwB, 0.8);
    sketchLine(bwL, bwT, bwL, bwB, 0.8);
    sketchLine(bwR, bwT, bwR, bwB, 0.8);
    let tl = ext(bwL, bwT);
    let tr = ext(bwR, bwT);
    let bl = ext(bwL, bwB);
    let br = ext(bwR, bwB);
    sketchLine(bwL, bwT, tl.x, tl.y, 0.5);
    sketchLine(bwR, bwT, tr.x, tr.y, 0.5);
    sketchLine(bwL, bwB, bl.x, bl.y, 0.5);
    sketchLine(bwR, bwB, br.x, br.y, 0.5);
    let boardH = h * 0.04;
    sketchLine(bwL, bwB - boardH, bwR, bwB - boardH, 1.5);
    let baseBl = ext(bwL, bwB - boardH);
    let baseBr = ext(bwR, bwB - boardH);
    sketchLine(bwL, bwB - boardH, baseBl.x, baseBl.y, 1.2);
    sketchLine(bwR, bwB - boardH, baseBr.x, baseBr.y, 1.2);
    const numBoards = 8;
    for (let i = 1; i < numBoards; i++) {
      let t = i / numBoards;
      let px = bwL + bwW * t;
      let pExt = ext(px, bwB);
      sketchLine(px, bwB, pExt.x, pExt.y, 0.25);
    }
    let winL = vx - bwW * 0.2;
    let winR = vx + bwW * 0.2;
    let winT = bwT + bwH * 0.15;
    let winB = bwT + bwH * 0.5;
    sketchLine(winL, winT, winR, winT, 0.35);
    sketchLine(winL, winB, winR, winB, 0.35);
    sketchLine(winL, winT, winL, winB, 0.35);
    sketchLine(winR, winT, winR, winB, 0.35);
    sketchLine(vx, winT, vx, winB, 0.15);
    sketchLine(winL, (winT + winB) / 2, winR, (winT + winB) / 2, 0.15);
  }

  drawPot(g) {
    g.clear();
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
    const pourLocalX = this.plantContainer.x + 45;
    const pourLocalY = this.plantContainer.y - 15;
    this.tweens.add({
      targets: this.bucketContainer,
      angle: -80,
      x: pourLocalX,
      y: pourLocalY,
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
          const targetX = this.plantContainer.x + Phaser.Math.Between(-15, 15);
          const targetY = this.plantContainer.y + 55;
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
    if (window.playSuccess) window.playSuccess(this);
    this.statusText.setText(
      "Nature's sequence is complete. Whose name does it bear?",
    );
    this.statusText.setColor("#1aaf7a");
  }

  transitionToLevel(levelKey, skipFade = false) {
    if (levelKey === this.scene.key && skipFade) {
      this.scene.restart({ skipFade: true });
      return;
    }
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (!this.isSolved && window.playSuccess) window.playSuccess(this);
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
