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
    this.load.image("leaf", "assets/images/leaf.png");
    this.load.audio("wateringplant", "assets/sounds/wateringplant.mp3");
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
      .text(width / 2, 50, "Thirsty flower", {
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
    this.canPour = true; // Flag pentru a preveni udarea repetată din greșeală

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
    const nBR2 = { x: 75, y: -360 }; // crengă dreapta sus (mai lungă, mult mai în sus)

    this.segments = [
      { from: n0, to: nMid, cp: { x: -5, y: n0.y } }, // seg0
      { from: nMid, to: nT, cp: { x: 15, y: nMid.y } }, // seg1
      { from: nMid, to: nBR, cp: { x: 90, y: nMid.y } }, // seg2
      { from: nT, to: nBL, cp: { x: -80, y: nT.y } }, // seg3
      { from: nT, to: nBR2, cp: { x: 50, y: -270 } }, // seg4
    ];

    // Grosimea fiecărui segment (trunchiul e mai gros)
    this.segWidths = [9, 7, 5, 5, 5];

    // Graphics per segment
    this.segGfx = this.segments.map(() => this.add.graphics());

    // ── Plant Container (Draggable) - Mutat mult mai în stânga ─────────────
    this.plantContainer = this.add.container(-220, 0);
    // Setăm o zonă de hit generoasă care să acopere ghiveciul și ramurile
    this.plantContainer.setInteractive(
      new Phaser.Geom.Rectangle(-100, -380, 200, 550),
      Phaser.Geom.Rectangle.Contains,
    );
    this.plantContainer.input.cursor = "grab";
    this.input.setDraggable(this.plantContainer);

    this.potGfx = this.add.graphics();
    this.drawPot(this.potGfx);

    this.plantContainer.add([this.potGfx, ...this.segGfx]);

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

      // ── Udare 5 → 5 frunze pe seg4 (toate pe aceeași creangă) ──────
      [
        { segIdx: 4, t: 0.18, ox: 0, oy: 0, angle: 20, scale: 0.75 },
        { segIdx: 4, t: 0.38, ox: 0, oy: 0, angle: -15, scale: 0.75 },
        { segIdx: 4, t: 0.58, ox: 0, oy: 0, angle: 35, scale: 0.75 },
        { segIdx: 4, t: 0.78, ox: 0, oy: 0, angle: -5, scale: 0.75 },
        { segIdx: 4, t: 0.96, ox: 0, oy: 0, angle: 45, scale: 0.75 },
      ],
    ];

    // ── Galeată ──────────────────────────────────────────────────────────
    // Mutăm găleata mult mai în dreapta, departe de ghiveci
    this.bucketContainer = this.add.container(260, 30);
    this.bucketContainer.setSize(100, 100).setInteractive({ cursor: "grab" });
    this.bucketGfx = this.add.graphics();
    this.waterFillGfx = this.add.graphics();
    this.drawBucket(this.bucketGfx, this.waterFillGfx, 1.0);
    this.bucketContainer.add([this.waterFillGfx, this.bucketGfx]);
    this.input.setDraggable(this.bucketContainer);

    // Asamblăm containerul
    this.mainContainer.add([this.plantContainer, this.bucketContainer]);

    // ── Drag Handlers ─────────────────────────────────────────────────────
    this.input.on("dragstart", (pointer, gameObject) => {
      if (this.isSolved || this.isAnimating) return;
      this.mainContainer.bringToTop(gameObject); // Aduce obiectul selectat deasupra
      if (window.playUIClick) window.playUIClick();
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
      gameObject.x = dragX;
      gameObject.y = dragY;

      // Verificăm distanța pentru a porni udarea (Snap area)
      let dist = Phaser.Math.Distance.Between(
        this.bucketContainer.x,
        this.bucketContainer.y,
        this.plantContainer.x + 130,
        this.plantContainer.y - 20, // Punctul perfect unde trebuie să ajungă găleata
      );

      // Jucătorul trebuie să îndepărteze găleata la cel puțin 100px ca să o poată folosi din nou
      if (dist > 100) {
        this.canPour = true;
      }

      if (dist < 60 && this.canPour) {
        this.canPour = false;
        this.triggerPour();
      }
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
  triggerPour() {
    if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
    this.isAnimating = true;

    // Oprim drag-ul în timpul udării ca să nu se blocheze interacțiunea
    this.input.setDraggable(this.bucketContainer, false);
    this.input.setDraggable(this.plantContainer, false);

    if (this.cache.audio.exists("wateringplant")) {
      this.sound.play("wateringplant", {
        volume: 1,
      });
    }

    this.pourAndGrow();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ghiveci gol, contur alb
  // ─────────────────────────────────────────────────────────────────────────
  drawPot(g) {
    g.clear();

    // ── Ghiveci Simplificat (Design 2D Minimalist) ──
    g.lineStyle(4, 0xffffff, 1); // Linie puțin mai groasă pentru claritate

    // Buza de sus (Rim plat)
    g.strokeRect(-60, 50, 120, 12);

    // Corpul principal (Trapez curat)
    g.beginPath();
    g.moveTo(-52, 62); // Pornește imediat de sub buză
    g.lineTo(52, 62);
    g.lineTo(35, 150);
    g.lineTo(-35, 150);
    g.closePath();
    g.strokePath();

    // Pământul (O singură linie orizontală unde intră tulpina)
    g.lineStyle(2, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(-58, 56);
    g.lineTo(58, 56);
    g.strokePath();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Găleată Clasică cu Apă (Classic Water Bucket)
  // ─────────────────────────────────────────────────────────────────────────
  drawBucket(gOutline, gWater, waterRatio) {
    gOutline.clear();
    gWater.clear();

    const drawQuadCurve = (g, x0, y0, cx, cy, x1, y1) => {
      g.moveTo(x0, y0);
      for (let i = 1; i <= 16; i++) {
        let t = i / 16;
        let xt = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
        let yt = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
        g.lineTo(xt, yt);
      }
    };

    gOutline.lineStyle(2, 0xffffff, 1); // Linii mult mai fine (2px)

    // ── Mânerul (Handle) ──
    gOutline.beginPath();
    drawQuadCurve(gOutline, -35, -35, 0, -90, 35, -35);
    gOutline.strokePath();

    // ── Corpul Găleții (Body) ──
    gOutline.beginPath();
    gOutline.moveTo(-35, -35); // Marginea stânga-sus
    gOutline.lineTo(-25, 40); // Baza stânga-jos
    gOutline.lineTo(25, 40); // Baza dreapta-jos
    gOutline.lineTo(35, -35); // Marginea dreapta-sus
    gOutline.strokePath();

    // ── Fundul Găleții (Curbură inferioară) ──
    gOutline.beginPath();
    drawQuadCurve(gOutline, -25, 40, 0, 50, 25, 40);
    gOutline.strokePath();

    // ── Gura Găleții (Deschiderea de sus) ──
    gOutline.beginPath();
    drawQuadCurve(gOutline, -35, -35, 0, -20, 35, -35); // Buza din față
    gOutline.strokePath();

    gOutline.lineStyle(1.5, 0xffffff, 0.5); // Buza din spate mai fină
    gOutline.beginPath();
    drawQuadCurve(gOutline, -35, -35, 0, -50, 35, -35);
    gOutline.strokePath();

    // ── Apa din interior ──
    if (waterRatio > 0.02) {
      let wH = 75 * waterRatio; // Înălțimea totală a apei (de la 40 până la -35)
      let wY = 40 - wH;
      let t = (40 - wY) / 75; // Procentul înălțimii
      let wX = 25 + t * 10; // Lățimea apei în funcție de con

      gWater.fillStyle(0x00e5ff, 0.6);
      gWater.beginPath();
      gWater.moveTo(-wX, wY);
      gWater.lineTo(wX, wY);
      gWater.lineTo(25, 40);
      gWater.lineTo(-25, 40);
      gWater.closePath();
      gWater.fillPath();

      // Efect de suprafață a apei
      gWater.fillStyle(0x00e5ff, 0.9);
      gWater.fillEllipse(0, wY, wX * 2, wX * 0.35);
    }
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

    // Animăm nivelul apei scăzând fluid din carafă
    this.tweens.addCounter({
      from: 1 - step / 5,
      to: 1 - (step + 1) / 5,
      duration: 1200,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        this.drawBucket(this.bucketGfx, this.waterFillGfx, tween.getValue());
      },
    });

    // Găleata se ridică, se apleacă și toarnă apa!
    this.tweens.add({
      targets: this.bucketContainer,
      angle: -80, // Înclinată puternic pentru a curge de pe buză
      x: this.plantContainer.x + 130, // Snap precis raportat la plantă
      y: this.plantContainer.y - 20,
      duration: 400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        // Așteptăm 1 secundă cât curge apa, apoi o trimitem înapoi în siguranță
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: this.bucketContainer,
            angle: 0,
            x: this.plantContainer.x + 380, // Se retrage mult mai departe în dreapta
            y: this.plantContainer.y + 30,
            duration: 400,
            ease: "Sine.easeInOut",
            onComplete: () => {
              this.canPour = true; // Resetăm permisiunea de udare
            },
          });
        });
      },
    });

    // Cascadă (Stream Continuu): Zeci de particule care curg una după alta rapid
    this.time.delayedCall(400, () => {
      let dropsPoured = 0;
      this.time.addEvent({
        delay: 15, // Viteza super mare a șuvoiului
        repeat: 55, // Creează 56 de particule total (durata 825ms)
        callback: () => {
          // Calculăm rotația vârfului sticlei din spațiul local în cel global
          let rad = Phaser.Math.DegToRad(this.bucketContainer.angle);
          let cos = Math.cos(rad);
          let sin = Math.sin(rad);

          // Punctul buzei găleții de unde curge apa (stânga sus: -35, -35)
          let lipX = this.bucketContainer.x + (-35 * cos - -35 * sin);
          let lipY = this.bucketContainer.y + (-35 * sin + -35 * cos);

          const dropGfx = this.add.graphics();
          dropGfx.fillStyle(0x00e5ff, 0.9); // Neon cyan water
          dropGfx.fillEllipse(
            0,
            0,
            Phaser.Math.Between(3, 5),
            Phaser.Math.Between(6, 12),
          );

          // Dispersie restrânsă (șuvoi de găleată)
          dropGfx.setPosition(
            lipX + Phaser.Math.Between(-5, 5),
            lipY + Phaser.Math.Between(-5, 5),
          );
          dropGfx.rotation = Phaser.Math.DegToRad(
            -15 + Phaser.Math.Between(-5, 5),
          );
          this.mainContainer.add(dropGfx);

          const targetX = this.plantContainer.x + Phaser.Math.Between(-15, 15); // Un șuvoi mai direcționat raportat la plantă
          const targetY = this.plantContainer.y + 65;

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
                this.growCurrentSegment(step, leavesToSpawn);
              }
            },
          });
        },
      });
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

      // Încărcăm imaginea leaf.png în loc de grafica desenată
      const leafImg = this.add.image(pos.x + d.ox, pos.y + d.oy, "leaf");

      const BASE_SCALE = 0.17; // Frunze cu 15% mai mici față de versiunea anterioară
      const ANGLE_OFFSET = -45; // Compensăm orientarea stânga-jos -> dreapta-sus

      // Tulpina este în stânga-jos. Setăm originea (pivotul) exact acolo!
      leafImg.setOrigin(0.05, 0.95);

      leafImg.setAngle(d.angle + ANGLE_OFFSET);
      leafImg.baseAngle = d.angle + ANGLE_OFFSET; // Salvăm unghiul inițial pentru animație
      leafImg.setScale(0); // Pornește invizibilă

      // ── Setăm Frunza Interactivă ──
      leafImg.setInteractive({ cursor: "pointer" });

      // Animație de swing (clătinare) la Click
      leafImg.on("pointerdown", () => {
        if (leafImg.isSwinging) return;
        leafImg.isSwinging = true;

        this.tweens.add({
          targets: leafImg,
          angle: leafImg.baseAngle + Phaser.Math.Between(12, 22),
          duration: 150,
          yoyo: true,
          repeat: 1, // Se duce, se întoarce de 2 ori (clătinare)
          ease: "Sine.easeInOut",
          onComplete: () => {
            leafImg.angle = leafImg.baseAngle; // Reset exact la loc
            leafImg.isSwinging = false;
          },
        });
      });

      // SECRETUL pentru un aspect natural: Adăugăm frunza la indexul 0 (în SPATELE ramurilor).
      // Astfel, capătul tăiat al codiței este acoperit de grosimea ramurii, părând că a crescut direct din ea!
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
      // Reactivăm posibilitatea de a trage de obiecte la finalul animației
      this.input.setDraggable(this.bucketContainer, true);
      this.input.setDraggable(this.plantContainer, true);
      onDone();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  finishLevel() {
    this.isSolved = true;
    if (window.playSuccess) window.playSuccess(this);

    this.statusText.setText(
      "Count the leaves of each branch. Name the sequence.",
    );
    this.statusText.setColor("#1aaf7a");
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
