class Level1 extends Phaser.Scene {
  constructor() {
    super({ key: "Level1" });
  }

  init(data) {
    // Verificăm dacă scena trebuie să apară instant sau prin "fade din negru"
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.image("book", "assets/images/level1/book.png");
    this.load.image("key", "assets/images/level1/key.png");
    this.load.image("safe", "assets/images/level1/safe.png");

    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
  }

  create() {
    window.mainScene = this; // Conectăm nivelul la HTML
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── Fundal procedural (Stil creion/Grafit întunecat) ──
    this.bgGfx = this.add.graphics().setDepth(-10);
    this.drawBg = (w, h) => {
      this.bgGfx.clear();
      // Un gradient mult mai întunecat, spre negru/cărbune
      this.bgGfx.fillGradientStyle(0x18181a, 0x18181a, 0x050508, 0x050508, 1);
      this.bgGfx.fillRect(0, 0, w, h);

      // Linii albe foarte fine (zgârieturi de hârtie/creion)
      this.bgGfx.lineStyle(1, 0xffffff, 0.02);
      for (let i = 0; i < 250; i++) {
        let x = Phaser.Math.Between(-50, w + 50);
        let y = Phaser.Math.Between(-50, h + 50);
        let len = Phaser.Math.Between(20, 100);
        let ang = Math.random() > 0.5 ? 0.4 : -0.4;
        this.bgGfx.strokeLineShape(
          new Phaser.Geom.Line(
            x,
            y,
            x + Math.cos(ang) * len,
            y + Math.sin(ang) * len,
          ),
        );
      }

      // Linii negre mai groase (hașură de grafit)
      this.bgGfx.lineStyle(2, 0x000000, 0.15);
      for (let i = 0; i < 150; i++) {
        let x = Phaser.Math.Between(-50, w + 50);
        let y = Phaser.Math.Between(-50, h + 50);
        let len = Phaser.Math.Between(50, 200);
        let ang = Math.random() > 0.5 ? 0.5 : -0.5;
        this.bgGfx.strokeLineShape(
          new Phaser.Geom.Line(
            x,
            y,
            x + Math.cos(ang) * len,
            y + Math.sin(ang) * len,
          ),
        );
      }
    };
    this.drawBg(width, height);

    this.statusText = this.add
      .text(width / 2, 100, "Open the safe to find the missing word", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "24px",
        color: "#ffffff",
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

    this.safe = this.add
      .image(width / 2, height - 180, "safe")
      .setScale(0.5)
      .setTint(0xdddddd);
    this.hintText = this.add
      .text(width / 2, height - 180, "337", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "64px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.puzzleKey = this.add
      .image(width / 2 - 100, height / 2 - 50, "key")
      .setScale(0.15);
    this.puzzleKey.setInteractive();
    this.input.setDraggable(this.puzzleKey);

    this.book = this.add
      .image(width / 2 - 100, height / 2 - 50, "book")
      .setScale(0.4)
      .setTint(0x555555);
    this.book.setInteractive();
    this.input.setDraggable(this.book);

    this.events.on("canvas_resized", (size) => {
      this.drawBg(size.width, size.height);
      this.statusText.setPosition(size.width / 2, 100);
      this.safe.setPosition(size.width / 2, size.height - 180);
      this.hintText.setPosition(size.width / 2, size.height - 180);
      this.levelText.setPosition(size.width - 30, 30);
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on("gameobjectdown", () => {
      if (window.playClick) window.playClick(this);
    });

    this.input.on("dragend", (pointer, gameObject) => {
      if (gameObject === this.puzzleKey) {
        if (
          Phaser.Geom.Intersects.RectangleToRectangle(
            this.puzzleKey.getBounds(),
            this.safe.getBounds(),
          )
        ) {
          this.statusText.setText("You found the clue, execute the hint!");
          this.safe.setVisible(false);
          this.hintText.setVisible(true);
          this.puzzleKey.setVisible(false);
        } else if (
          Phaser.Geom.Intersects.RectangleToRectangle(
            this.puzzleKey.getBounds(),
            this.book.getBounds(),
          )
        ) {
          this.statusText.setText("A secret is revealed: 337");
        }
      }
    });

    // Animația de la tranziția prin ecran negru (Fade In complet vizual)
    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(width / 2, height / 2, "Level 1...", {
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

  transitionToLevel(levelNumber, skipFade = false) {
    if (levelNumber === 1 && skipFade) {
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
