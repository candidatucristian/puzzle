class Level5 extends Phaser.Scene {
  constructor() {
    super({ key: "Level5" });
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
      .text(width / 2, 50, "Chain reactions enabled. Build a 64 tile.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#aaaaaa",
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    this.levelText = this.add
      .text(width - 30, 30, "Level 5", {
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

    this.boardSize = 4;
    this.tileSize = 70;
    this.gap = 10;

    this.board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    this.boardContainer = this.add.container(width / 2, height / 2 + 20);
    this.tileGroup = this.add.group();

    this.drawBackground();

    // Layout pre-setat pentru a demonstra "Reacția în lanț" instant jucătorului (apăsând LEFT)
    this.board[0][0] = 8;
    this.board[0][1] = 4;
    this.board[0][2] = 2;
    this.board[0][3] = 2;

    this.isSolved = false;
    this.isAnimating = false;
    this.drawBoard();

    this.input.keyboard.on("keydown-UP", () => this.handleMove("UP"));
    this.input.keyboard.on("keydown-DOWN", () => this.handleMove("DOWN"));
    this.input.keyboard.on("keydown-LEFT", () => this.handleMove("LEFT"));
    this.input.keyboard.on("keydown-RIGHT", () => this.handleMove("RIGHT"));
    this.input.keyboard.on("keydown-W", () => this.handleMove("UP"));
    this.input.keyboard.on("keydown-S", () => this.handleMove("DOWN"));
    this.input.keyboard.on("keydown-A", () => this.handleMove("LEFT"));
    this.input.keyboard.on("keydown-D", () => this.handleMove("RIGHT"));

    this.input.on("pointerup", (pointer) => {
      if (this.isSolved || this.isAnimating) return;
      let dx = pointer.upX - pointer.downX;
      let dy = pointer.upY - pointer.downY;
      if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.handleMove(dx > 0 ? "RIGHT" : "LEFT");
        } else {
          this.handleMove(dy > 0 ? "DOWN" : "UP");
        }
      }
    });

    this.events.on("canvas_resized", (size) => {
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.boardContainer.setPosition(size.width / 2, size.height / 2 + 20);
    });

    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(width / 2, height / 2, "Level 5...", {
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

  drawBackground() {
    const bg = this.add.graphics();
    const totalSize =
      this.boardSize * this.tileSize + (this.boardSize - 1) * this.gap;
    const offset = -totalSize / 2;

    bg.fillStyle(0x2d1b33, 1);
    bg.fillRoundedRect(
      offset - 15,
      offset - 15,
      totalSize + 30,
      totalSize + 30,
      10,
    );

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let x = offset + c * (this.tileSize + this.gap) + this.tileSize / 2;
        let y = offset + r * (this.tileSize + this.gap) + this.tileSize / 2;
        bg.fillStyle(0x1a1025, 1);
        bg.fillRoundedRect(
          x - this.tileSize / 2,
          y - this.tileSize / 2,
          this.tileSize,
          this.tileSize,
          8,
        );
      }
    }
    this.boardContainer.add(bg);
  }

  drawBoard() {
    this.tileGroup.clear(true, true);
    const totalSize =
      this.boardSize * this.tileSize + (this.boardSize - 1) * this.gap;
    const offset = -totalSize / 2;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let val = this.board[r][c];
        if (val > 0) {
          let x = offset + c * (this.tileSize + this.gap) + this.tileSize / 2;
          let y = offset + r * (this.tileSize + this.gap) + this.tileSize / 2;

          let color = this.getTileColor(val);
          let tileBg = this.add
            .rectangle(x, y, this.tileSize, this.tileSize, color.bg)
            .setStrokeStyle(3, color.border);
          let tileText = this.add
            .text(x, y, val.toString(), {
              fontFamily: '"Special Elite", monospace',
              fontSize: val >= 100 ? "24px" : "32px",
              color: color.text,
              fontStyle: "bold",
            })
            .setOrigin(0.5);

          this.tileGroup.add(tileBg);
          this.tileGroup.add(tileText);
          this.boardContainer.add(tileBg);
          this.boardContainer.add(tileText);

          this.tweens.add({
            targets: [tileBg, tileText],
            scale: { from: 0.8, to: 1 },
            duration: 120,
            ease: "Back.easeOut",
          });
        }
      }
    }
  }

  getTileColor(val) {
    const colors = {
      2: { bg: 0x2d1b33, border: 0x4a2b4d, text: "#ff88ff" },
      4: { bg: 0x4a2b4d, border: 0x6b3366, text: "#ff99ff" },
      8: { bg: 0x6b3366, border: 0x96356d, text: "#ffbbee" },
      16: { bg: 0x96356d, border: 0xc43360, text: "#ffccdd" },
      32: { bg: 0xc43360, border: 0xff3355, text: "#ffddcc" },
      64: { bg: 0xff3355, border: 0xff7799, text: "#ffffff" },
    };
    return colors[val] || { bg: 0xff3355, border: 0xffffff, text: "#ffffff" };
  }

  async handleMove(dir) {
    if (this.isSolved || this.isAnimating) return;
    this.isAnimating = true;

    let moved = this.slideOnce(dir);
    if (!moved) {
      this.isAnimating = false;
      return;
    }

    if (window.playClick) window.playClick(this);
    this.drawBoard();

    // Logica de reacție în lanț (cascade loop)
    await new Promise((resolve) => setTimeout(resolve, 200));

    while (this.slideOnce(dir)) {
      if (window.playClick) window.playClick(this);
      this.drawBoard();
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    this.spawnTile();
    this.drawBoard();
    this.checkWin();
    this.isAnimating = false;
  }

  slideOnce(dir) {
    let lines = [];
    // Extragem liniile de la extremitatea mutării către centrul tablei
    if (dir === "UP") {
      for (let c = 0; c < 4; c++)
        lines.push([
          [0, c],
          [1, c],
          [2, c],
          [3, c],
        ]);
    } else if (dir === "DOWN") {
      for (let c = 0; c < 4; c++)
        lines.push([
          [3, c],
          [2, c],
          [1, c],
          [0, c],
        ]);
    } else if (dir === "LEFT") {
      for (let r = 0; r < 4; r++)
        lines.push([
          [r, 0],
          [r, 1],
          [r, 2],
          [r, 3],
        ]);
    } else if (dir === "RIGHT") {
      for (let r = 0; r < 4; r++)
        lines.push([
          [r, 3],
          [r, 2],
          [r, 1],
          [r, 0],
        ]);
    }

    let moved = false;
    for (let lineCoords of lines) {
      let vals = lineCoords.map((c) => this.board[c[0]][c[1]]);
      let newVals = this.processLine(vals);
      for (let i = 0; i < 4; i++) {
        if (this.board[lineCoords[i][0]][lineCoords[i][1]] !== newVals[i]) {
          this.board[lineCoords[i][0]][lineCoords[i][1]] = newVals[i];
          moved = true;
        }
      }
    }
    return moved;
  }

  processLine(line) {
    let nonZero = line.filter((v) => v !== 0);
    let res = [];
    let i = 0;
    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        res.push(nonZero[i] * 2);
        i += 2;
      } else {
        res.push(nonZero[i]);
        i++;
      }
    }
    while (res.length < 4) res.push(0);
    return res;
  }

  spawnTile() {
    let empty = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (this.board[r][c] === 0) empty.push({ r, c });
    if (empty.length > 0) {
      let cell = Phaser.Math.RND.pick(empty);
      this.board[cell.r][cell.c] = Math.random() > 0.8 ? 4 : 2;
    }
  }

  checkWin() {
    let maxVal = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (this.board[r][c] > maxVal) maxVal = this.board[r][c];

    if (maxVal >= 64 && !this.isSolved) {
      this.isSolved = true;
      if (window.playSuccess) window.playSuccess(this);
      this.statusText.setText("Chain reaction critical. Code revealed.");
      this.statusText.setColor("#00ffff");

      const finalWord = this.add
        .text(0, 180, "CHAIN", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
          fontStyle: "bold",
          shadow: { blur: 15, color: "#ff3355", fill: true },
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.boardContainer.add(finalWord);
      this.tweens.add({
        targets: finalWord,
        alpha: 1,
        scale: 1.2,
        duration: 800,
        ease: "Power2",
      });
    }
  }

  transitionToLevel(levelNumber, skipFade = false) {
    // Păstrează logica standard de tranziție pe care o folosim la toate nivelele
    if (skipFade) {
      this.scene.start("Level" + levelNumber, { skipFade: true });
      return;
    }
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
