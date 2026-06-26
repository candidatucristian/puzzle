class Level4 extends Phaser.Scene {
  constructor() {
    super({ key: "Level4" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("phone_vib", "assets/sounds/level4/vibrate.mp3");
    this.load.audio("key_press", "assets/sounds/level4/keypress.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── Background ──
    this.bgGfx = this.add.graphics().setDepth(-10);
    this.drawBg = (w, h) => {
      this.bgGfx.clear();
      this.bgGfx.fillGradientStyle(0x1a1a2a, 0x1a1a2a, 0x080810, 0x080810, 1);
      this.bgGfx.fillRect(0, 0, w, h);
    };
    this.drawBg(width, height);

    // ── Status Text ──
    this.statusText = this.add
      .text(width / 2, 50, "Answer the call.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#ffffff",
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

    // ── State ──
    this.isSolved = false;
    this.userInput = "";
    this.lastChar = "";
    this.lastKey = null;
    this.keyPressCount = 0;
    this.keyTimeout = null;

    this.keymap = {
      1: ".,?!",
      2: "ABC",
      3: "DEF",
      4: "GHI",
      5: "JKL",
      6: "MNO",
      7: "PQRS",
      8: "TUV",
      9: "WXYZ",
      0: "+0",
    };

    // ── Phone Container ──
    this.phoneContainer = this.add.container(0, 0); // Poziția va fi setată de funcția de scalare

    // ── Phone Body ──
    const phoneBody = this.add.graphics();
    this.drawPhoneBody(phoneBody);
    this.phoneContainer.add(phoneBody);

    // Adăugăm logo-ul deasupra carcasei, dar sub ecran
    const logo = this.add
      .text(0, -162, "NOKIA", {
        fontFamily: "Arial Black",
        fontSize: "18px",
        color: "#dfefff",
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.phoneContainer.add(logo);

    // ── Screen ──
    this.screenContainer = this.add.container(0, -95);
    this.phoneContainer.add(this.screenContainer);

    this.drawScreen();

    // Repozitionare texte pe noul ecran
    this.callerText = this.add
      .text(0, -15, "Someone is calling", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#20311b",
      })
      .setOrigin(0.5);
    this.callerNumber = this.add
      .text(0, 5, "555-88-444-8-2-7777", {
        fontFamily: "monospace",
        fontSize: "11px", // Mărime ajustată pentru a încăpea
        color: "#20311b",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.screenInput = this.add
      .text(0, 30, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#20311b",
      })
      .setOrigin(0.5);

    this.screenContainer.add([
      this.callerText,
      this.callerNumber,
      this.screenInput,
    ]);

    // ── Keypad ──
    this.keypadContainer = this.add.container(0, 45);
    this.phoneContainer.add(this.keypadContainer);
    this.createKeypad();

    this.setPhoneScale(); // Calculăm și aplicăm scara și poziția corectă

    // ── Ringing Animation ──
    this.vibrationSound = this.sound.add("phone_vib", {
      loop: true,
      volume: 0.7,
    });
    if (!this.sound.locked) {
      this.vibrationSound.play();
    } else {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.vibrationSound.play();
      });
    }

    this.ringTween = this.tweens.add({
      targets: this.phoneContainer,
      x: "+=1",
      y: "+=1",
      duration: 50,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Resize ──
    this.events.on("canvas_resized", (size) => {
      this.drawBg(size.width, size.height);
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.setPhoneScale(); // Recalculăm la redimensionare
    });

    // ── Fade-in ──
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

  setPhoneScale() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    // Asigurăm că telefonul încape mereu pe ecran, folosind 90% din dimensiunea disponibilă
    const PADDING = 0.9;
    const PHONE_ART_WIDTH = 220; // Lățimea reală a carcasei desenate
    const PHONE_ART_HEIGHT = 440; // Înălțimea reală a carcasei desenate

    const scaleX = (w * PADDING) / PHONE_ART_WIDTH;
    const scaleY = (h * PADDING) / PHONE_ART_HEIGHT;
    // Alegem scara cea mai mică pentru a încăpea pe ambele axe
    const scale = Math.min(scaleX, scaleY);

    this.phoneContainer.setScale(scale);
    // Centram telefonul pe ecran
    this.phoneContainer.setPosition(w / 2, h / 2);
  }

  drawPhoneBody(g) {
    const bodyW = 220;
    const bodyH = 440;
    const bodyX = -bodyW / 2;
    const bodyY = -bodyH / 2;
    const cornerRadius = 50;

    // Carcasa exterioară (ca în mockup)
    g.fillStyle(0x102447);
    g.fillRoundedRect(bodyX, bodyY, bodyW, bodyH, cornerRadius);

    // Corpul principal frontal
    g.fillStyle(0x1d3f73);
    g.fillRoundedRect(
      bodyX + 8,
      bodyY + 8,
      bodyW - 16,
      bodyH - 16,
      cornerRadius - 5,
    );

    // Placa frontală interioară
    g.fillStyle(0x2f5d96);
    g.fillRoundedRect(
      bodyX + 18,
      bodyY + 20,
      bodyW - 36,
      bodyH - 50,
      cornerRadius - 15,
    );

    // Zona superioară mai deschisă
    g.fillStyle(0x4e77a7);
    g.fillRoundedRect(
      bodyX + 25,
      bodyY + 25,
      bodyW - 50,
      140,
      cornerRadius - 25,
    );

    // Zona inferioară a tastaturii
    g.fillStyle(0x21456f);
    g.fillRoundedRect(
      bodyX + 25,
      bodyY + 170,
      bodyW - 50,
      bodyH - 210,
      cornerRadius - 25,
    );

    // Difuzor
    g.fillStyle(0x06101f);
    g.fillRoundedRect(-40, bodyY + 40, 80, 18, 9);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0xb2c5d4, 0.55);
      g.fillRoundedRect(-30 + i * 12, bodyY + 45, 7, 8, 3);
    }

    // Contururi pentru realism
    g.lineStyle(2, 0x071426, 0.9);
    g.strokeRoundedRect(bodyX, bodyY, bodyW, bodyH, cornerRadius);
    g.lineStyle(1.5, 0x78a1cc, 0.25);
    g.strokeRoundedRect(
      bodyX + 8,
      bodyY + 8,
      bodyW - 16,
      bodyH - 16,
      cornerRadius - 5,
    );
  }

  drawScreen() {
    const g = this.add.graphics();
    this.screenContainer.add(g);

    const w = 150;
    const h = 105;
    const x = -w / 2;
    const y = -h / 2;

    // Rama ecranului
    g.fillStyle(0x08101c);
    g.fillRoundedRect(x - 10, y - 10, w + 20, h + 20, 20);
    g.fillStyle(0x182233);
    g.fillRoundedRect(x - 5, y - 5, w + 10, h + 10, 14);

    // Sticla ecranului
    g.fillStyle(0xa4b878);
    g.fillRoundedRect(x, y, w, h, 8);

    // Efect de gradient LCD
    g.fillGradientStyle(0xc1d28d, 0xc1d28d, 0xa4b878, 0xa4b878, 0.7);
    g.fillRoundedRect(x + 5, y + 5, w - 10, h - 10, 6);

    // Linii de pixeli LCD
    g.lineStyle(1, 0x607040, 0.18);
    for (let i = 0; i < h; i += 3) {
      g.lineBetween(x, y + i, x + w, y + i);
    }

    // Bara de status
    const signalBars = this.add
      .text(x + 12, y + 8, "▮▮▮▯▯", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#25351f",
      })
      .setOrigin(0);
    const batteryIcon = this.add
      .text(x + w - 12, y + 8, "▰▰▰", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#25351f",
      })
      .setOrigin(1, 0);
    this.screenContainer.add([signalBars, batteryIcon]);

    // Reflexia sticlei
    g.fillStyle(0xffffff, 0.09);
    const path = new Phaser.Geom.Polygon([
      x + 7,
      y + 7,
      x + 90,
      y + 7,
      x + 40,
      y + h - 7,
      x + 7,
      y + h - 7,
    ]);
    g.fillPoints(path.points, true);

    // Contur final
    g.lineStyle(1.5, 0x000000, 0.45);
    g.strokeRoundedRect(x, y, w, h, 8);
  }

  createKeypad() {
    const createKey = (config) => {
      const { x, y, w, h, label, subLabel, labelStyle, subLabelStyle } = config;
      const keyContainer = this.add.container(x, y);
      const g = this.add.graphics();
      keyContainer.add(g);

      // Umbra
      g.fillStyle(0x071426, 0.95);
      g.fillRoundedRect(-w / 2 - 1, -h / 2 + 1, w + 2, h + 2, 13);
      // Baza
      g.fillStyle(0xd6dce3);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 13);
      // Interior
      g.fillStyle(0xaab2bd);
      g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w - 4, h - 5, 12);
      // Lumina
      g.fillStyle(0xf3f5f7, 0.28);
      g.fillRoundedRect(-w / 2 + 5, -h / 2 - 2, w - 10, 10, 8);
      // Contur
      g.lineStyle(1, 0x2a3240, 0.55);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 13);

      const labelText = this.add
        .text(0, subLabel ? -5 : 0, label, labelStyle)
        .setOrigin(0.5);
      keyContainer.add(labelText);
      if (subLabel) {
        const subLabelText = this.add
          .text(0, 8, subLabel, subLabelStyle)
          .setOrigin(0.5);
        keyContainer.add(subLabelText);
      }
      return keyContainer;
    };

    // --- Buton central de navigare (aspect îmbunătățit) ---
    const navBtnGfx = this.add.graphics();
    this.keypadContainer.add(navBtnGfx);

    const navY = -28;
    const navW = 60;
    const navH = 48;

    // Umbra butonului
    navBtnGfx.fillStyle(0x071426, 0.95);
    navBtnGfx.fillEllipse(0, navY + 2, navW, navH);
    // Baza butonului (albastru închis)
    navBtnGfx.fillStyle(0x2d4f78);
    navBtnGfx.fillEllipse(0, navY, navW, navH);
    // Contur luminos
    navBtnGfx.lineStyle(1.5, 0x91b4d5, 0.25);
    navBtnGfx.strokeEllipse(0, navY, navW, navH);
    // Butonul interior (OK)
    navBtnGfx.fillStyle(0x172842);
    navBtnGfx.fillEllipse(0, navY, 24, 22);
    // Textul "OK"
    const okText = this.add
      .text(0, navY, "OK", {
        fontFamily: "Arial Black",
        fontSize: "10px",
        color: "#dcecff",
      })
      .setOrigin(0.5);
    this.keypadContainer.add(okText);

    // --- Soft Keys (doar vizual, pentru atmosferă) ---
    const softKeyStyle = {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#dfefff",
    };
    const leftSoftKey = this.add
      .text(-65, -5, "Select", softKeyStyle)
      .setOrigin(0.5);
    const rightSoftKey = this.add
      .text(65, -5, "Back", softKeyStyle)
      .setOrigin(0.5);
    this.keypadContainer.add([leftSoftKey, rightSoftKey]);

    // --- Tastatura numerică ---
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
    const keyLabels = {
      1: ".,?!",
      2: "ABC",
      3: "DEF",
      4: "GHI",
      5: "JKL",
      6: "MNO",
      7: "PQRS",
      8: "TUV",
      9: "WXYZ",
      0: "+0",
      "*": " ",
      "#": "Del",
    };

    const keyWidth = 54;
    const keyHeight = 31;
    const xSpacing = 62;
    const ySpacing = 40;
    const yOffset = 35;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = (col - 1) * xSpacing;
      const y = row * ySpacing + yOffset;

      const keyContainer = createKey({
        x: x,
        y: y,
        w: keyWidth,
        h: keyHeight,
        label: key,
        subLabel: keyLabels[key],
        labelStyle: {
          fontFamily: "Arial Black",
          fontSize: "16px",
          color: "#18202b",
        },
        subLabelStyle: {
          fontFamily: "Arial",
          fontSize: "8px",
          color: "#303846",
        },
      });

      this.keypadContainer.add(keyContainer);
      keyContainer
        .setSize(keyWidth, keyHeight)
        .setInteractive({ cursor: "pointer" });

      keyContainer.on("pointerdown", () => {
        if (this.isSolved) return;
        this.tweens.add({
          targets: keyContainer,
          scale: 0.9,
          duration: 50,
          yoyo: true,
          ease: "Sine.easeInOut",
        });
        if (this.cache.audio.exists("key_press")) {
          this.sound.play("key_press", { volume: 0.8 });
        } else if (window.playUIClick) {
          window.playUIClick();
        }
        this.handleKeyPress(key);
      });
    }
  }

  handleKeyPress(key) {
    clearTimeout(this.keyTimeout);
    if (key === "*" || key === "#") {
      this.confirmChar();
      if (key === "#") {
        // Delete
        this.userInput = this.userInput.slice(0, -1);
      } else if (key === "*") {
        // Space
        this.userInput += " ";
      }
      this.lastKey = null;
      this.keyPressCount = 0;
    } else {
      if (this.lastKey !== key) {
        this.confirmChar();
        this.lastKey = key;
        this.keyPressCount = 1;
      } else {
        this.keyPressCount++;
      }

      const chars = this.keymap[key];
      const charIndex = (this.keyPressCount - 1) % chars.length;
      this.lastChar = chars[charIndex];

      this.keyTimeout = setTimeout(() => this.confirmChar(), 800);
    }
    this.updateScreen();
  }

  confirmChar() {
    if (this.lastChar) {
      this.userInput += this.lastChar;
      this.lastChar = "";
      this.lastKey = null;
      this.keyPressCount = 0;
      this.updateScreen();
    }
  }

  updateScreen() {
    this.screenInput.setText((this.userInput + this.lastChar).slice(-10));
    if (this.userInput.toUpperCase() === "LUITAS") {
      this.solve();
    }
  }

  solve() {
    if (this.isSolved) return;
    this.isSolved = true;

    this.confirmChar();
    clearTimeout(this.keyTimeout);

    this.vibrationSound.stop();
    this.ringTween.stop();

    this.phoneContainer.setPosition(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
    );

    this.callerText.setText("CALL ENDED");
    this.callerNumber.setText("Keyword Found");
    this.screenInput.setText("LUITAS");

    this.statusText.setText("You found the keyword. Use it to proceed.");
    this.statusText.setColor("#1aaf7a");

    if (window.playSuccess) window.playSuccess(this);

    // Disable keys
    this.keypadContainer.list.forEach((keyObj) => {
      keyObj.disableInteractive();
    });
  }

  transitionToLevel(levelNumber, skipFade = false) {
    if (levelNumber === 4 && skipFade) {
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

  shutdown() {
    if (this.vibrationSound) {
      this.vibrationSound.stop();
    }
  }
}
