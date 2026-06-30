class PhoneScene extends Phaser.Scene {
  constructor() {
    super({ key: "Phone" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("phone_vib", "assets/sounds/Phone/vibration.mp3");
    this.load.audio("keypad", "assets/sounds/Phone/keypad.mp3");
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

    this.bgGfx = this.add.graphics().setDepth(-10);
    this.drawBg = (w, h) => {
      this.bgGfx.clear();
      this.bgGfx.fillGradientStyle(0x1a1a2a, 0x1a1a2a, 0x080810, 0x080810, 1);
      this.bgGfx.fillRect(0, 0, w, h);
    };
    this.drawBg(width, height);

    this.statusText = this.add
      .text(width / 2, 50, "Unknown number is calling you", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#ffffff",
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

    this.isSolved = false;
    this.isCallAnswered = false;
    this.waitingForAudioUnlock = false;

    this.userInput = "";
    this.lastChar = "";
    this.lastKey = null;
    this.keyPressCount = 0;
    this.keyTimeout = null;

    this.vibrationTimer = null;
    this.signalTimer = null;
    this.callBlinkTween = null;

    this.navContainer = null;
    this.navG = null;
    this.menuText = null;
    this.rightSoftKey = null;

    this.vibrationSound = null;
    this.keySound = null;

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

    this.phoneContainer = this.add.container(0, 0);

    const phoneBody = this.add.graphics();
    this.drawPhoneBody(phoneBody);
    this.phoneContainer.add(phoneBody);

    this.drawScreen();

    this.callerText = this.add
      .text(0, -30, "CALLING YOU...", {
        fontFamily: "'Courier New', monospace",
        fontSize: "14px",
        color: "#263b16",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.callerNumber = this.add
      .text(0, 0, "(433)-666-777-433", {
        fontFamily: "'Courier New', monospace",
        fontSize: "16px",
        color: "#17260c",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setY(5);

    this.screenInput = this.add
      .text(0, 44, "", {
        fontFamily: "'Courier New', monospace",
        fontSize: "20px",
        color: "#1c2b12",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.screenContainer.add([
      this.callerText,
      this.callerNumber,
      this.screenInput,
    ]);

    this.startCallingBlink();
    this.startSignalAnimation();

    this.keypadContainer = this.add.container(0, 70);
    this.phoneContainer.add(this.keypadContainer);
    this.createKeypad();

    this.setPhoneScale();

    this.vibrationSound = this.sound.add("phone_vib", {
      volume: 0.25,
      loop: false,
    });

    this.keySound = this.sound.add("keypad", {
      volume: 0.62,
      loop: false,
    });

    this.startVibrationSoundLoop();

    this.events.on("canvas_resized", (size) => {
      this.drawBg(size.width, size.height);
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      this.setPhoneScale();
    });

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

  setPhoneScale() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const PADDING = 0.8;
    const PHONE_ART_WIDTH = 380;
    const PHONE_ART_HEIGHT = 790;

    const scaleX = (w * PADDING) / PHONE_ART_WIDTH;
    const scaleY = (h * PADDING) / PHONE_ART_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    this.phoneContainer.setScale(scale);
    this.phoneContainer.setPosition(w / 2, h / 2 + 14);
  }

  drawPhoneBody(g) {
    g.clear();

    const bodyW = 340;
    const bodyH = 720;
    const bodyX = -bodyW / 2;
    const bodyY = -bodyH / 2;

    g.fillStyle(0x000000, 0.18).fillRoundedRect(
      bodyX - 20,
      bodyY + 22,
      bodyW + 40,
      bodyH + 34,
      66,
    );

    g.fillStyle(0x000000, 0.34).fillRoundedRect(
      bodyX - 8,
      bodyY + 10,
      bodyW + 16,
      bodyH + 18,
      60,
    );

    const antX = bodyX + bodyW - 62;
    const antY = bodyY - 62;

    g.fillStyle(0x101316).fillRoundedRect(antX - 5, antY - 7, 24, 10, 4);
    g.fillStyle(0x303840).fillRoundedRect(antX, antY, 15, 64, 5);
    g.fillStyle(0x0f1114, 0.42).fillRoundedRect(antX + 11, antY + 5, 3, 52, 3);
    g.fillStyle(0xffffff, 0.16).fillRoundedRect(antX + 3, antY + 6, 2, 48, 2);

    g.fillStyle(0x555f69).fillRoundedRect(bodyX, bodyY, bodyW, bodyH, 62);

    g.fillStyle(0xe2e7ec).fillRoundedRect(
      bodyX + 6,
      bodyY + 6,
      bodyW - 12,
      bodyH - 12,
      56,
    );

    g.fillStyle(0x7d8791).fillRoundedRect(
      bodyX + 14,
      bodyY + 14,
      bodyW - 28,
      bodyH - 28,
      50,
    );

    g.fillStyle(0xffffff, 0.16).fillRoundedRect(
      bodyX + 22,
      bodyY + 34,
      12,
      bodyH - 92,
      9,
    );

    g.fillStyle(0x000000, 0.18).fillRoundedRect(
      bodyX + bodyW - 34,
      bodyY + 38,
      11,
      bodyH - 100,
      9,
    );

    const faceX = bodyX + 12;
    const faceY = bodyY + 12;
    const faceW = bodyW - 24;
    const faceH = bodyH - 24;

    g.fillStyle(0x151a1f).fillRoundedRect(faceX, faceY, faceW, faceH, 46);

    g.fillStyle(0x2c343c).fillRoundedRect(
      faceX + 5,
      faceY + 5,
      faceW - 10,
      faceH - 10,
      38,
    );

    g.fillStyle(0xffffff, 0.06).fillRoundedRect(
      faceX + 18,
      faceY + 12,
      faceW - 36,
      28,
      14,
    );

    const logoY = bodyY + 42;

    g.fillStyle(0x8d98a3).fillRoundedRect(-50, logoY, 100, 15, 7);
    g.fillStyle(0x293038).fillRoundedRect(-45, logoY + 4, 90, 7, 3);

    const speakerY = bodyY + 74;

    g.fillStyle(0x0b0e11).fillRoundedRect(-56, speakerY, 112, 24, 12);
    g.fillStyle(0x20262c).fillRoundedRect(-50, speakerY + 6, 100, 12, 6);

    for (let i = 0; i < 12; i++) {
      g.fillStyle(0x030405).fillCircle(-40 + i * 7.3, speakerY + 12, 1.9);
    }

    g.fillStyle(0x444e58).fillRoundedRect(bodyX - 5, bodyY + 160, 5, 50, 3);
    g.fillStyle(0x444e58).fillRoundedRect(bodyX - 5, bodyY + 230, 5, 38, 3);
    g.fillStyle(0x444e58).fillRoundedRect(bodyX + bodyW, bodyY + 185, 5, 58, 3);

    const chinY = bodyY + bodyH - 78;

    g.fillStyle(0x20262c).fillRoundedRect(-92, chinY, 184, 46, 20);
    g.fillStyle(0xffffff, 0.05).fillRoundedRect(-78, chinY + 7, 156, 11, 8);

    const micY = bodyY + bodyH - 40;

    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x07090b).fillCircle(-18 + i * 9, micY, 2.3);
    }
  }

  drawScreen() {
    this.screenContainer = this.add.container(0, -218);
    this.phoneContainer.add(this.screenContainer);

    const g = this.add.graphics();
    this.screenContainer.add(g);

    const w = 210;
    const h = 148;
    const x = -w / 2;
    const y = -h / 2;

    g.fillStyle(0x050607).fillRoundedRect(x - 16, y - 16, w + 32, h + 32, 19);
    g.fillStyle(0x59636e).fillRoundedRect(x - 11, y - 11, w + 22, h + 22, 15);
    g.fillStyle(0x101316).fillRoundedRect(x - 5, y - 5, w + 10, h + 10, 11);

    g.fillStyle(0x91ad6f).fillRoundedRect(x, y, w, h, 8);
    g.fillStyle(0xb9cc92, 0.18).fillRoundedRect(x + 4, y + 4, w - 8, 18, 5);

    for (let row = 0; row < h; row += 4) {
      g.lineStyle(1, 0x334420, 0.18);
      g.lineBetween(x + 1, y + row, x + w - 1, y + row);
    }

    for (let col = 0; col < w; col += 4) {
      g.lineStyle(1, 0x334420, 0.07);
      g.lineBetween(x + col, y + 1, x + col, y + h - 1);
    }

    g.fillStyle(0xffffff, 0.1).fillTriangle(
      x,
      y,
      x + w * 0.5,
      y,
      x,
      y + h * 0.52,
    );

    this.signalGfx = this.add.graphics();
    this.screenContainer.add(this.signalGfx);

    this.signalBaseX = x + 11;
    this.signalBaseY = y + 11;
    this.drawSignalBars(1);

    const statusY = y + 11;
    const statusColor = 0x31461d;

    g.lineStyle(1.5, statusColor).strokeRect(x + w - 36, statusY, 20, 9);
    g.fillStyle(statusColor).fillRect(x + w - 16, statusY + 3, 3, 4);
    g.fillStyle(statusColor).fillRect(x + w - 33, statusY + 3, 15, 4);
  }

  drawSignalBars(activeBars = 1) {
    if (!this.signalGfx) return;
    const color = 0x31461d;
    const x = this.signalBaseX;
    const y = this.signalBaseY;
    this.signalGfx.clear();
    for (let i = 0; i < 5; i++) {
      const alpha = i < activeBars ? 1 : 0.2;
      this.signalGfx
        .fillStyle(color, alpha)
        .fillRect(x + i * 6, y + (12 - (i + 1) * 2), 4, (i + 1) * 2);
    }
  }

  startSignalAnimation() {
    if (this.signalTimer) {
      this.signalTimer.remove(false);
      this.signalTimer = null;
    }
    let bars = 1;
    this.signalTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.drawSignalBars(bars);
        bars++;
        if (bars > 5) {
          bars = 1;
        }
      },
    });
  }

  startCallingBlink() {
    if (this.callBlinkTween) {
      this.callBlinkTween.stop();
      this.callBlinkTween = null;
    }
    this.callBlinkTween = this.tweens.add({
      targets: this.callerText,
      alpha: 0.28,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createKeypad() {
    const createSoftButton = ({
      x,
      y,
      w,
      h,
      text,
      baseColor = 0x414a53,
      shadowColor = 0x1b2025,
      onDown = null,
    }) => {
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      g.fillStyle(0x07090b, 0.62).fillRoundedRect(
        -w / 2,
        -h / 2 + 4,
        w,
        h,
        h / 2,
      );
      g.fillStyle(shadowColor).fillRoundedRect(-w / 2, -h / 2 + 2, w, h, h / 2);
      g.fillStyle(baseColor).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.fillStyle(0xffffff, 0.08).fillRoundedRect(
        -w / 2 + 6,
        -h / 2 + 3,
        w - 12,
        5,
        4,
      );
      g.lineStyle(1, 0x111519).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      const label = this.add
        .text(0, 0, text, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#f2f5f8",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      c.add(label);
      if (onDown) {
        const baseY = y;
        c.setInteractive(
          new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
          Phaser.Geom.Rectangle.Contains,
        );
        c.on("pointerdown", () => {
          if (this.isSolved) return;
          this.tweens.add({
            targets: c,
            y: baseY + 2,
            duration: 50,
            yoyo: true,
            ease: "Power1",
          });
          this.playKeySound();
          onDown();
        });
      }
      return c;
    };

    const createNumberKey = ({ x, y, label, subLabel }) => {
      const w = 84;
      const h = 52;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      g.fillStyle(0x07090b, 0.6).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 13);
      g.fillStyle(0x1b2025).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 13);
      g.fillStyle(0x424b55).fillRoundedRect(-w / 2, -h / 2, w, h, 13);
      g.fillStyle(0xffffff, 0.11).fillRoundedRect(
        -w / 2 + 8,
        -h / 2 + 5,
        w - 16,
        8,
        5,
      );
      g.lineStyle(1, 0x111519).strokeRoundedRect(-w / 2, -h / 2, w, h, 13);
      const main = this.add
        .text(0, subLabel ? -10 : 0, label, {
          fontFamily: "Arial, sans-serif",
          fontSize: label === "*" || label === "#" ? "26px" : "28px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(0, 14, subLabel, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#dce4ec",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      c.add([main, sub]);
      const baseY = y;
      c.setInteractive(
        new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains,
      );
      c.on("pointerdown", () => {
        if (this.isSolved) return;
        this.tweens.add({
          targets: c,
          y: baseY + 3,
          duration: 50,
          yoyo: true,
          ease: "Power1",
        });
        this.playKeySound();
        this.handleKeyPress(label);
      });
      return c;
    };

    const leftSoftKey = createSoftButton({
      x: -92,
      y: -112,
      w: 84,
      h: 25,
      text: "SELECT",
    });
    this.rightSoftKey = createSoftButton({
      x: 92,
      y: -112,
      w: 84,
      h: 25,
      text: "BACK",
      baseColor: 0x9f3a4e,
      shadowColor: 0x5e1f2a,
      onDown: () => this.handleKeyPress("#"),
    });
    this.keypadContainer.add([leftSoftKey, this.rightSoftKey]);
    this.navContainer = this.add.container(0, -48);
    this.navG = this.add.graphics();
    this.navContainer.add(this.navG);
    this.navG.fillStyle(0x1d2329).fillEllipse(0, 0, 108, 54);
    this.navG.fillStyle(0x56616d).fillEllipse(0, -1, 88, 42);
    this.navG.fillStyle(0x242b32).fillEllipse(0, 0, 58, 32);
    this.navG.fillStyle(0x07090b).fillCircle(0, 1, 32);
    this.navG.fillStyle(0x8795a3).fillCircle(0, -1, 27);
    this.navG.fillStyle(0x3e4750).fillCircle(0, 0, 22);
    this.navG.fillStyle(0xffffff, 0.18).fillEllipse(-5, -8, 20, 9);
    this.menuText = this.add
      .text(0, 0, "MENU", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.navContainer.add(this.menuText);
    this.keypadContainer.add(this.navContainer);
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
      "*": "spc",
      "#": "del",
    };
    const xSpacing = 100;
    const ySpacing = 60;
    const startY = 40;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const row = Math.floor(i / 3);
      const col = i % 3;
      const keyObj = createNumberKey({
        x: (col - 1) * xSpacing,
        y: startY + row * ySpacing,
        label: key,
        subLabel: keyLabels[key],
      });
      this.keypadContainer.add(keyObj);
    }
  }

  startVibrationSoundLoop() {
    if (this.vibrationTimer) {
      this.vibrationTimer.remove(false);
      this.vibrationTimer = null;
    }
    this.playVibrationSoundPulse();
    this.vibrationTimer = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        this.playVibrationSoundPulse();
      },
    });
  }

  playVibrationSoundPulse() {
    if (this.isSolved) {
      if (this.vibrationSound && this.vibrationSound.isPlaying) {
        this.vibrationSound.stop();
      }
      return;
    }
    if (!this.vibrationSound) return;
    if (this.vibrationSound.isPlaying) return;
    if (this.sound.locked) {
      if (!this.waitingForAudioUnlock) {
        this.waitingForAudioUnlock = true;
        this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
          this.waitingForAudioUnlock = false;
          this.playVibrationSoundPulse();
        });
      }
      return;
    }
    this.vibrationSound.play({ volume: 0.25 });
  }

  playKeySound() {
    if (!this.keySound) return;
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        if (!this.isSolved && this.keySound) {
          this.keySound.play({ volume: 0.62 });
        }
      });
      return;
    }
    this.keySound.play({ volume: 0.62 });
  }

  handleKeyPress(key) {
    clearTimeout(this.keyTimeout);
    if (key === "*" || key === "#") {
      this.confirmChar();
      if (key === "#") {
        this.userInput = this.userInput.slice(0, -1);
      } else if (key === "*") {
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
    const currentInput = (this.userInput + this.lastChar).slice(-12);
    this.screenInput.setText(currentInput);
    if (!this.isCallAnswered && currentInput.toUpperCase() === "GEORGE") {
      this.showAnswerButton();
    }
  }

  showAnswerButton() {
    if (this.isCallAnswered) return;
    this.isCallAnswered = true;
    clearTimeout(this.keyTimeout);
    this.userInput = "";
    this.lastChar = "";
    this.lastKey = null;
    this.keyPressCount = 0;
    this.screenInput.setText("");
    this.menuText.setText("ANSWER").setFontSize("16px").setColor("#e2f0d6");
    this.navG.clear();
    const btnW = 120,
      btnH = 50,
      btnR = 20;
    this.navG
      .fillStyle(0x1a2620)
      .fillRoundedRect(-btnW / 2, -btnH / 2 + 5, btnW, btnH, btnR);
    this.navG
      .fillStyle(0x31461d)
      .fillRoundedRect(-btnW / 2, -btnH / 2 + 2, btnW, btnH, btnR);
    this.navG
      .fillStyle(0x4d7c28)
      .fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnR);
    this.navG.fillStyle(0xffffff, 0.15).fillRoundedRect(-45, -20, 90, 10, 8);
    this.navContainer
      .setInteractive(
        new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      )
      .on("pointerdown", () => this.revealRealClue());
  }

  revealRealClue() {
    this.playKeySound();
    this.solve();
  }

  solve() {
    if (this.isSolved) return;
    this.isSolved = true;
    this.confirmChar();
    clearTimeout(this.keyTimeout);
    if (this.vibrationTimer) {
      this.vibrationTimer.remove(false);
      this.vibrationTimer = null;
    }
    if (this.signalTimer) {
      this.signalTimer.remove(false);
      this.signalTimer = null;
    }
    if (this.callBlinkTween) {
      this.callBlinkTween.stop();
      this.callBlinkTween = null;
    }
    if (this.vibrationSound && this.vibrationSound.isPlaying) {
      this.vibrationSound.stop();
    }
    this.callerText.setAlpha(1);
    this.callerNumber.setAlpha(1);
    this.callerText.setText("CALLER IDENTIFIED");
    this.callerNumber.setText("GEORGE");
    this.screenInput.setText("");
    this.drawSignalBars(5);
    this.statusText.setText("You have revealed the name. Execute it.");
    this.statusText.setColor("#1aaf7a");
    if (window.playSuccess) window.playSuccess(this);
    this.keypadContainer.list.forEach((keyObj) => {
      if (keyObj.disableInteractive) {
        keyObj.disableInteractive();
      }
    });
    if (this.navContainer) {
      this.navContainer.disableInteractive();
    }
  }

  transitionToLevel(levelKey, skipFade = false) {
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
    this.time.removeAllEvents();
    this.tweens.killAll();
    clearTimeout(this.keyTimeout);

    if (this.vibrationSound) {
      this.vibrationSound.stop();
    }
  }
}
