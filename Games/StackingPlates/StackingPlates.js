class StackingPlatesScene extends Phaser.Scene {
  constructor() {
    super({ key: "StackingPlates" });
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

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── Gradient de fundal procedural ──
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
      .text(width / 2, 50, "Stack the plates to reveal the hidden figure.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    this.levelText = this.add
      .text(width - 30, 30, "Level 1", {
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

    // ── Puzzle State ──
    this.isSolved = false;
    this.pieces = [];

    const cx = width / 2;
    const cy = height / 2 + 40;
    this.targetPos = { x: cx, y: cy };

    this.dropZoneGfx = this.add.graphics();
    this.drawDropZone();

    // Răspândim cele 5 piese în jurul centrului
    const angles = [0, 72, 144, 216, 288];
    for (let i = 0; i < 5; i++) {
      let rad = Phaser.Math.DegToRad(angles[i] + Phaser.Math.Between(-15, 15));
      let dist = Phaser.Math.Between(160, 220);
      let px = cx + Math.cos(rad) * dist;
      let py = cy + Math.sin(rad) * dist;

      // Le ținem în limitele ecranului
      px = Phaser.Math.Clamp(px, 80, width - 80);
      py = Phaser.Math.Clamp(py, 120, height - 80);

      this.createPiece(i, px, py);
    }

    // ── Drag Logic ──
    this.input.on("dragstart", (pointer, gameObject) => {
      if (this.isSolved || gameObject.isSnapped) return;
      this.children.bringToTop(gameObject);
      if (window.playClick) window.playClick(this);
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this.isSolved || gameObject.isSnapped) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on("dragend", (pointer, gameObject) => {
      if (this.isSolved || gameObject.isSnapped) return;
      const dist = Phaser.Math.Distance.Between(
        gameObject.x,
        gameObject.y,
        this.targetPos.x,
        this.targetPos.y,
      );

      if (dist < 50) {
        gameObject.isSnapped = true;
        this.input.setDraggable(gameObject, false);
        this.tweens.add({
          targets: gameObject,
          x: this.targetPos.x,
          y: this.targetPos.y,
          duration: 150,
          ease: "Power2",
          onComplete: () => {
            if (window.playClick) window.playClick(this);
            this.checkWin();
          },
        });
      }
    });

    // ── RESIZE ──
    this.events.on("canvas_resized", (size) => {
      const w = size.width;
      const h = size.height;
      this.drawBg(w, h);
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.drawRoom(this.roomGfx, w, h);

      this.targetPos = { x: w / 2, y: h / 2 + 40 };
      this.drawDropZone();

      this.pieces.forEach((p) => {
        if (p.isSnapped) {
          p.setPosition(this.targetPos.x, this.targetPos.y);
        } else {
          p.x = Phaser.Math.Clamp(p.x, 80, w - 80);
          p.y = Phaser.Math.Clamp(p.y, 120, h - 80);
        }
      });
    });
  }

  checkWin() {
    const allSnapped = this.pieces.every((p) => p.isSnapped);
    if (allSnapped && !this.isSolved) {
      this.isSolved = true;

      this.statusText.setText("The fragments align. Code revealed.");
      this.statusText.setColor("#1aaf7a");

      this.pieces.forEach((p, i) => {
        this.tweens.add({
          targets: p,
          scale: 1.05,
          duration: 300,
          yoyo: true,
          delay: i * 100,
          ease: "Sine.easeInOut",
        });
      });
    }
  }

  createPiece(index, x, y) {
    const container = this.add.container(x, y);
    container.setSize(140, 140);
    container.setInteractive({ cursor: "grab" });
    this.input.setDraggable(container);

    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.01);
    gfx.fillRect(-70, -70, 140, 140);

    this.drawPiece(gfx, index);
    container.add(gfx);

    container.isSnapped = false;
    this.pieces.push(container);
  }

  drawPiece(gfx, index) {
    const sketchLine = (x0, y0, x1, y1, alphaMod = 1, thickness = 1.2) => {
      const passes = thickness > 2 ? 3 : 2;
      for (let p = 0; p < passes; p++) {
        gfx.lineStyle(thickness, 0xffffff, (0.8 - p * 0.2) * alphaMod);
        gfx.beginPath();
        gfx.moveTo(x0, y0);
        let steps = thickness > 2 ? 8 : 5;
        for (let i = 1; i <= steps; i++) {
          let t = i / steps;
          let jx = i < steps ? Phaser.Math.Between(-1, 1) : 0;
          let jy = i < steps ? Phaser.Math.Between(-1, 1) : 0;
          gfx.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
        }
        gfx.strokePath();
      }
    };

    // Conturul pătratului
    sketchLine(-70, -70, 70, -70, 0.5, 1.5);
    sketchLine(70, -70, 70, 70, 0.5, 1.5);
    sketchLine(70, 70, -70, 70, 0.5, 1.5);
    sketchLine(-70, 70, -70, -70, 0.5, 1.5);

    // Liniile abstracte subțiri ("zgomot") ca distragere
    for (let i = 0; i < 4; i++) {
      sketchLine(
        Phaser.Math.Between(-60, 60),
        Phaser.Math.Between(-60, 60),
        Phaser.Math.Between(-60, 60),
        Phaser.Math.Between(-60, 60),
        0.2,
        1.2,
      );
    }

    // Elementele groase ce compun numărul 5 (când sunt suprapuse)
    const s = 25;
    const t = 4.5;
    const a = 1.0;
    if (index === 0)
      sketchLine(-s, -s * 1.5, s, -s * 1.5, a, t); // Top
    else if (index === 1)
      sketchLine(-s, -s * 1.5, -s, 0, a, t); // Stânga-Sus
    else if (index === 2)
      sketchLine(-s, 0, s, 0, a, t); // Mijloc
    else if (index === 3)
      sketchLine(s, 0, s, s * 1.5, a, t); // Dreapta-Jos
    else if (index === 4) sketchLine(s, s * 1.5, -s, s * 1.5, a, t); // Baza
  }

  drawDropZone() {
    this.dropZoneGfx.clear();
    const sketchLine = (x0, y0, x1, y1) => {
      this.dropZoneGfx.lineStyle(2, 0xffffff, 0.2);
      this.dropZoneGfx.beginPath();
      this.dropZoneGfx.moveTo(x0, y0);
      let steps = 4;
      for (let i = 1; i <= steps; i++) {
        let t = i / steps;
        let jx = i < steps ? Phaser.Math.Between(-2, 2) : 0;
        let jy = i < steps ? Phaser.Math.Between(-2, 2) : 0;
        this.dropZoneGfx.lineTo(
          x0 + (x1 - x0) * t + jx,
          y0 + (y1 - y0) * t + jy,
        );
      }
      this.dropZoneGfx.strokePath();
    };

    const cx = this.targetPos.x;
    const cy = this.targetPos.y;
    sketchLine(cx - 75, cy - 75, cx + 75, cy - 75);
    sketchLine(cx + 75, cy - 75, cx + 75, cy + 75);
    sketchLine(cx + 75, cy + 75, cx - 75, cy + 75);
    sketchLine(cx - 75, cy + 75, cx - 75, cy - 75);
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
