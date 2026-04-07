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
    this.load.image("bg", "assets/images/background.png");
    this.load.image("book", "assets/images/book.png");
    this.load.image("key", "assets/images/key.png");
    this.load.image("safe", "assets/images/safe.png");

    this.load.audio("click", "assets/sounds/click.mp3");
    this.load.audio("nextlevel", "assets/sounds/nextlevel.wav");
    this.load.audio("bgm", "assets/sounds/background.mp3");
    this.load.audio("ui_click", "assets/sounds/mouseclick.wav");
    this.load.audio("error", "assets/sounds/error.mp3");
  }

  create() {
    window.mainScene = this; // Conectăm nivelul la HTML
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Imaginea de fundal
    this.add
      .image(width / 2, height / 2, "bg")
      .setDisplaySize(width, height)
      .setDepth(-10);

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
