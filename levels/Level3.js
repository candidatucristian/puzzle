class Level3 extends Phaser.Scene {
  constructor() {
    super({ key: "Level3" });
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

    // Imaginea de fundal
    this.add
      .image(width / 2, height / 2, "bg")
      .setDisplaySize(width, height)
      .setDepth(-10);

    this.statusText = this.add
      .text(width / 2, 50, "Mirror the grid. Build 32 on both sides.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#aaaaaa",
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

    // Starea asimetrică inițială forțează jucătorul să fie atent la fuziunile independente
    this.board[2][0] = 4;
    this.board[2][3] = 2;
    this.board[3][1] = 2;
    this.board[3][2] = 4;

    this.isSolved = false;
    this.drawBoard();

    // ── Suport Input Keyboard ──
    this.input.keyboard.on("keydown-UP", () => this.handleMove("UP"));
    this.input.keyboard.on("keydown-DOWN", () => this.handleMove("DOWN"));
    this.input.keyboard.on("keydown-LEFT", () => this.handleMove("LEFT"));
    this.input.keyboard.on("keydown-RIGHT", () => this.handleMove("RIGHT"));
    this.input.keyboard.on("keydown-W", () => this.handleMove("UP"));
    this.input.keyboard.on("keydown-S", () => this.handleMove("DOWN"));
    this.input.keyboard.on("keydown-A", () => this.handleMove("LEFT"));
    this.input.keyboard.on("keydown-D", () => this.handleMove("RIGHT"));

    // ── Suport Input Swipe (Touch/Mouse) ──
    this.input.on("pointerup", (pointer) => {
      if (this.isSolved) return;
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

    // ── RESIZE ──
    this.events.on("canvas_resized", (size) => {
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.boardContainer.setPosition(size.width / 2, size.height / 2 + 20);
    });

    // ── FADE IN ──
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

  drawBackground() {
    const bg = this.add.graphics();
    const totalSize =
      this.boardSize * this.tileSize + (this.boardSize - 1) * this.gap;
    const offset = -totalSize / 2;

    // Conturul panoului principal
    bg.fillStyle(0x1a1a24, 1);
    bg.fillRoundedRect(
      offset - 15,
      offset - 15,
      totalSize + 30,
      totalSize + 30,
      10,
    );

    // Desenăm celulele goale
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let x = offset + c * (this.tileSize + this.gap) + this.tileSize / 2;
        let y = offset + r * (this.tileSize + this.gap) + this.tileSize / 2;
        bg.fillStyle(0x2a2a36, 1);
        bg.fillRoundedRect(
          x - this.tileSize / 2,
          y - this.tileSize / 2,
          this.tileSize,
          this.tileSize,
          8,
        );
      }
    }

    // Linia despărțitoare neon (Oglinda)
    bg.lineStyle(4, 0x00ffff, 0.6);
    bg.beginPath();
    bg.moveTo(0, offset - 15);
    bg.lineTo(0, offset + totalSize + 15);
    bg.strokePath();

    // Efect de glow (blur optic peste linie)
    bg.lineStyle(10, 0x00ffff, 0.2);
    bg.strokePath();

    this.boardContainer.add(bg);
  }

  drawBoard() {
    if (this.tileGroup) {
      this.tileGroup.clear(true, true);
    } else {
      this.tileGroup = this.add.group();
    }

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

          // Animație rapidă de tip 'pop'
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
      2: { bg: 0x1e1e2c, border: 0x33334c, text: "#aaaaaa" },
      4: { bg: 0x2d2d44, border: 0x4a4a6e, text: "#cccccc" },
      8: { bg: 0x4c2a2a, border: 0x7c4444, text: "#ffaa88" },
      16: { bg: 0x6e2a2a, border: 0xad4444, text: "#ff8866" },
      32: { bg: 0x822438, border: 0xcc3355, text: "#ff6677" },
      64: { bg: 0x9b1b36, border: 0xff2255, text: "#ff4455" },
    };
    return colors[val] || { bg: 0x111111, border: 0x00ffff, text: "#00ffff" };
  }

  handleMove(dir) {
    if (this.isSolved) return;

    let lines = [];
    // Extragerea liniilor mapează direct oglindirea din puzzle (stânga vs dreapta)
    if (dir === "UP") {
      lines.push([
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ]);
      lines.push([
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ]);
      lines.push([
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ]);
      lines.push([
        [0, 3],
        [1, 3],
        [2, 3],
        [3, 3],
      ]);
    } else if (dir === "DOWN") {
      lines.push([
        [3, 0],
        [2, 0],
        [1, 0],
        [0, 0],
      ]);
      lines.push([
        [3, 1],
        [2, 1],
        [1, 1],
        [0, 1],
      ]);
      lines.push([
        [3, 2],
        [2, 2],
        [1, 2],
        [0, 2],
      ]);
      lines.push([
        [3, 3],
        [2, 3],
        [1, 3],
        [0, 3],
      ]);
    } else if (dir === "LEFT") {
      lines.push([
        [0, 0],
        [0, 1],
      ]);
      lines.push([
        [1, 0],
        [1, 1],
      ]);
      lines.push([
        [2, 0],
        [2, 1],
      ]);
      lines.push([
        [3, 0],
        [3, 1],
      ]);
      // Jumatatea dreaptă se mută RIGHT (spre marginea exterioară, oglindit)
      lines.push([
        [0, 3],
        [0, 2],
      ]);
      lines.push([
        [1, 3],
        [1, 2],
      ]);
      lines.push([
        [2, 3],
        [2, 2],
      ]);
      lines.push([
        [3, 3],
        [3, 2],
      ]);
    } else if (dir === "RIGHT") {
      // Jumatatea stângă se mută RIGHT (spre centru)
      lines.push([
        [0, 1],
        [0, 0],
      ]);
      lines.push([
        [1, 1],
        [1, 0],
      ]);
      lines.push([
        [2, 1],
        [2, 0],
      ]);
      lines.push([
        [3, 1],
        [3, 0],
      ]);
      // Jumatatea dreaptă se mută LEFT (spre centru, oglindit)
      lines.push([
        [0, 2],
        [0, 3],
      ]);
      lines.push([
        [1, 2],
        [1, 3],
      ]);
      lines.push([
        [2, 2],
        [2, 3],
      ]);
      lines.push([
        [3, 2],
        [3, 3],
      ]);
    }

    let moved = false;

    for (let lineCoords of lines) {
      let values = lineCoords.map((c) => this.board[c[0]][c[1]]);
      let newValues = this.slideLine(values);
      for (let i = 0; i < lineCoords.length; i++) {
        let r = lineCoords[i][0];
        let c = lineCoords[i][1];
        if (this.board[r][c] !== newValues[i]) {
          this.board[r][c] = newValues[i];
          moved = true;
        }
      }
    }

    if (moved) {
      if (window.playClick) window.playClick(this);
      this.spawnSymmetricPair();
      this.drawBoard();
      this.checkWin();
    }
  }

  slideLine(line) {
    let nonZero = line.filter((v) => v !== 0);
    let merged = [];
    for (let i = 0; i < nonZero.length; i++) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        merged.push(nonZero[i] * 2);
        i++;
      } else {
        merged.push(nonZero[i]);
      }
    }
    while (merged.length < line.length) merged.push(0);
    return merged;
  }

  spawnSymmetricPair() {
    let validPairs = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        // Verificăm doar jumătatea stângă pentru validitate simetrică
        if (this.board[r][c] === 0 && this.board[r][3 - c] === 0) {
          validPairs.push({ r, c });
        }
      }
    }

    if (validPairs.length > 0) {
      let pair = Phaser.Math.RND.pick(validPairs);
      let val1 = Math.random() < 0.8 ? 2 : 4;
      let val2 = Math.random() < 0.8 ? 2 : 4; // Lăsăm tile-urile noi să fie ușor asimetrice valoric
      this.board[pair.r][pair.c] = val1;
      this.board[pair.r][3 - pair.c] = val2;
    }
  }

  checkWin() {
    let maxLeft = 0;
    let maxRight = 0;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++)
        if (this.board[r][c] > maxLeft) maxLeft = this.board[r][c];
      for (let c = 2; c < 4; c++)
        if (this.board[r][c] > maxRight) maxRight = this.board[r][c];
    }

    if (maxLeft >= 32 && maxRight >= 32 && !this.isSolved) {
      this.isSolved = true;
      if (window.playSuccess) window.playSuccess(this);

      this.statusText.setText("Symmetry Achieved. Code revealed.");
      this.statusText.setColor("#00ffff");

      const finalWord = this.add
        .text(0, 180, "SYNC", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
          fontStyle: "bold",
          shadow: { blur: 15, color: "#00ffff", fill: true },
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
