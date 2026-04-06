class Level4 extends Phaser.Scene {
  constructor() {
    super({ key: "Level4" });
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
      .text(width / 2, 50, "Opposites attract. Form 3 neutral cores.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#aaaaaa",
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    this.levelText = this.add
      .text(width - 30, 30, "Level 4", {
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

    // Board cu obiecte { val: number, type: '+', '-', sau 'N', used: boolean }
    this.board = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];

    this.boardContainer = this.add.container(width / 2, height / 2 + 20);
    this.tileGroup = this.add.group();

    this.drawBackground();

    // Stare inițială
    this.spawnTile("+");
    this.spawnTile("-");
    this.spawnTile("+");
    this.spawnTile("-");

    this.isSolved = false;
    this.drawBoard();

    // Input
    this.input.keyboard.on("keydown-UP", () => this.handleMove("UP"));
    this.input.keyboard.on("keydown-DOWN", () => this.handleMove("DOWN"));
    this.input.keyboard.on("keydown-LEFT", () => this.handleMove("LEFT"));
    this.input.keyboard.on("keydown-RIGHT", () => this.handleMove("RIGHT"));
    this.input.keyboard.on("keydown-W", () => this.handleMove("UP"));
    this.input.keyboard.on("keydown-S", () => this.handleMove("DOWN"));
    this.input.keyboard.on("keydown-A", () => this.handleMove("LEFT"));
    this.input.keyboard.on("keydown-D", () => this.handleMove("RIGHT"));

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
        .text(width / 2, height / 2, "Level 4...", {
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

    bg.fillStyle(0x1e1e24, 1);
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
        bg.fillStyle(0x2a2a32, 1);
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
        let tile = this.board[r][c];
        if (tile) {
          let x = offset + c * (this.tileSize + this.gap) + this.tileSize / 2;
          let y = offset + r * (this.tileSize + this.gap) + this.tileSize / 2;

          let color = this.getTileColor(tile);
          let tileBg = this.add
            .rectangle(x, y, this.tileSize, this.tileSize, color.bg)
            .setStrokeStyle(3, color.border);

          let prefix = tile.type === "+" ? "+" : tile.type === "-" ? "-" : "";
          let displayVal = prefix + tile.val;
          if (tile.type === "N")
            displayVal = tile.used ? `[${tile.val}]` : `N${tile.val}`;

          let tileText = this.add
            .text(x, y, displayVal, {
              fontFamily: '"Special Elite", monospace',
              fontSize: tile.type === "N" ? "22px" : "28px",
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

  getTileColor(tile) {
    if (tile.type === "+")
      return { bg: 0x1a334c, border: 0x3388ff, text: "#33bbff" };
    if (tile.type === "-")
      return { bg: 0x4c1a1a, border: 0xff3333, text: "#ff6666" };

    // Core-urile neutre (N)
    if (!tile.used) return { bg: 0xdddddd, border: 0xffffff, text: "#000000" };
    return { bg: 0x444444, border: 0x666666, text: "#888888" }; // Neutru consumat
  }

  handleMove(dir) {
    if (this.isSolved) return;
    let lines = [];

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
      let values = lineCoords.map((c) => this.board[c[0]][c[1]]);
      let newValues = this.slideLine(values);
      for (let i = 0; i < lineCoords.length; i++) {
        let r = lineCoords[i][0];
        let c = lineCoords[i][1];
        // Comparăm superficial pentru a detecta mișcarea
        let oldVal = this.board[r][c]
          ? this.board[r][c].val + this.board[r][c].type
          : "null";
        let newVal = newValues[i]
          ? newValues[i].val + newValues[i].type
          : "null";

        if (oldVal !== newVal) {
          this.board[r][c] = newValues[i];
          moved = true;
        }
      }
    }

    if (moved) {
      if (window.playClick) window.playClick(this);
      this.spawnTile();
      this.drawBoard();
      this.checkWin();
    }
  }

  slideLine(line) {
    let nonNull = line.filter((v) => v !== null);
    let merged = [];
    let i = 0;

    while (i < nonNull.length) {
      if (i + 1 < nonNull.length) {
        let t1 = nonNull[i];
        let t2 = nonNull[i + 1];

        let canMerge = false;
        let newUsed = false;

        // + și - se atrag
        if (
          (t1.type === "+" && t2.type === "-") ||
          (t1.type === "-" && t2.type === "+")
        ) {
          canMerge = true;
          newUsed = false;
        }
        // Neutru absoarbe un + sau un - o singură dată
        else if (
          t1.type === "N" &&
          !t1.used &&
          (t2.type === "+" || t2.type === "-")
        ) {
          canMerge = true;
          newUsed = true;
        } else if (
          t2.type === "N" &&
          !t2.used &&
          (t1.type === "+" || t1.type === "-")
        ) {
          canMerge = true;
          newUsed = true;
        }

        if (canMerge) {
          merged.push({ val: t1.val + t2.val, type: "N", used: newUsed });
          i += 2;
          continue;
        }
      }
      merged.push(nonNull[i]);
      i++;
    }

    while (merged.length < 4) merged.push(null);
    return merged;
  }

  spawnTile(forcedType = null) {
    let emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!this.board[r][c]) emptyCells.push({ r, c });
      }
    }

    if (emptyCells.length > 0) {
      let cell = Phaser.Math.RND.pick(emptyCells);
      let type = forcedType || (Math.random() > 0.5 ? "+" : "-");
      let val = Math.random() > 0.8 ? 4 : 2;
      this.board[cell.r][cell.c] = { val, type, used: false };
    }
  }

  checkWin() {
    let neutralCount = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.board[r][c] && this.board[r][c].type === "N") {
          neutralCount++;
        }
      }
    }

    if (neutralCount >= 3 && !this.isSolved) {
      this.isSolved = true;
      if (window.playSuccess) window.playSuccess(this);

      this.statusText.setText("Equilibrium reached. Code revealed.");
      this.statusText.setColor("#ffffff");

      const finalWord = this.add
        .text(0, 180, "POLAR", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
          fontStyle: "bold",
          shadow: { blur: 15, color: "#ffffff", fill: true },
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
