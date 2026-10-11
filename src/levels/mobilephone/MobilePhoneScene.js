import { CALLER_NUMBER, CALLER_NAME, PHONE_COMMIT_MS, createPhoneInput, pressPhoneKey, commitPhoneInput, phoneDisplay } from "./puzzle.js";
import DeskView from "./DeskView.js";
import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { DESK_ART, PHONE_ART, phonePoint } from "./art.js";

// An old handset on the manor's desk. The caller number encodes GEORGE using
// multi-tap input; the screen and physical keys stay live over the photo assets.
const MP_FONT = '"Special Elite", monospace';
const MP_BUZZ_EVERY = 5000; // ms between two vibrations of the phone

export default class MobilePhoneScene extends BasePuzzleScene {
  constructor() {
    super({ key: "MobilePhone" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.image(DESK_ART.key, DESK_ART.url);
    this.load.image(PHONE_ART.key, PHONE_ART.url);
    this.load.audio("phone_vib", "assets/sounds/MobilePhone/vibration.mp3");
    this.load.audio("keypad", "assets/sounds/MobilePhone/keypad.mp3");
  }

  create() {
    this.beginScene();
    this._audioUnlockHandlers = new Set();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── state ──────────────────────────────────────────────────────────────
    this.isSolved = false;
    this.isCallAnswered = false;
    this.waitingForAudioUnlock = false;

    this.phoneInput = createPhoneInput();
    this.keyTimeout = null;

    this.vibrationTimer = null;
    this.signalTimer = null;
    this.callBlinkTween = null;
    this._answerPulse = null;

    this.navContainer = null;
    this.navG = null;
    this.menuText = null;
    this.rightSoftKey = null;

    this.vibrationSound = null;
    this.keySound = null;

    // the desk around the phone, and the vibration effects
    this.desk = new DeskView(this);
    this._ripples = [];
    this._buzzStart = 0;
    this._buzzUntil = 0;
    this._phoneBase = null;
    this.desk.mug = null;

    this.desk.build(width, height, this._phoneLayout(width, height));

    this.levelText = drawLevelLabel(this, width, height, {
      y: 30,
      font: MP_FONT,
      ease: "Power2",
    });

    // ── the phone ──────────────────────────────────────────────────────────
    this.phoneContainer = this.add.container(0, 0);

    this.phoneContainer.add([
      this.add.image(0, 0, "mp_contact_shadow"),
      this.add.image(0, 0, PHONE_ART.key).setScale(PHONE_ART.scale),
    ]);

    this.drawScreen();

    this.callerText = this.add
      .text(0, -20, "CALLING YOU...", {
        fontFamily: "'Courier New', monospace",
        fontSize: "14px",
        color: "#263b16",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.callerNumber = this.add
      .text(0, 0, CALLER_NUMBER, {
        fontFamily: "'Courier New', monospace",
        fontSize: "16px",
        color: "#17260c",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setY(5);

    this.screenInput = this.add
      .text(0, 32, "", {
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

    this.keypadContainer = this.add.container(0, 0);
    this.phoneContainer.add(this.keypadContainer);
    this.createKeypad();

    this.setPhoneScale();
    this._phoneSparkleCleanup = attachMovableSparkles(this, this.phoneContainer, {
      bounds: () => {
        const { x, y, s } = this._phoneBase;
        const topLeft = phonePoint(100, 280);
        return { x: x + topLeft.x * s, y: y + topLeft.y * s, width: 288 * s, height: 660 * s };
      },
      enabled: () => !this.isSolved,
      padding: 5,
    });

    this.vibrationSound = this.services.audio.addSceneSound(this, "phone_vib", {
      gain: 0.25,
      loop: false,
    });

    this.keySound = this.services.audio.addSceneSound(this, "keypad", {
      gain: 0.62,
      loop: false,
    });
    this.startVibrationSoundLoop();

    // kept as a reference so shutdown() can remove it (otherwise every
    // restart of the level would add one more listener)
    this._onResize = (size) => {
      this.levelText.setPosition(size.width - 30, 30);
      this.setPhoneScale();
      this.desk.build(size.width, size.height, this._phoneLayout(size.width, size.height));
    };
    this.listenToResize(this._onResize);

    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(
          width / 2,
          height / 2,
          "Level " +
            (this.services.levels.definitions.findIndex((l) => l.key === this.scene.key) +
              1) +
            "...",
          {
            fontFamily: MP_FONT,
            fontSize: "48px",
            color: "#ffffff",
          },
        )
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

  // Physical vibration, subtle coffee ripples and the LCD glow.
  update(time, delta) {
    if (!this.phoneContainer || !this._phoneBase) return;
    const b = this._phoneBase;
    if (this.ambientMotion && !this.isSolved && time < this._buzzUntil) {
      const span = this._buzzUntil - this._buzzStart || 1;
      const k = Math.sin(
        Phaser.Math.Clamp((time - this._buzzStart) / span, 0, 1) * Math.PI,
      );
      const amp = 2.4 * k;
      this.phoneContainer.setPosition(
        b.x + (Math.random() - 0.5) * 2 * amp,
        b.y + (Math.random() - 0.5) * 2 * amp,
      );
      this.phoneContainer.setRotation((Math.random() - 0.5) * 0.008 * k);
    } else if (
      this.phoneContainer.x !== b.x ||
      this.phoneContainer.y !== b.y ||
      this.phoneContainer.rotation !== 0
    ) {
      this.phoneContainer.setPosition(b.x, b.y).setRotation(0);
    }

    if (!this.ambientMotion && this.callerText) this.callerText.setAlpha(1);
    this._updateRipples(Math.min(delta || 16, 100));

    if (this.desk.screenGlow && this.callerText) {
      const a = this.isSolved
        ? 1
        : 0.55 + 0.45 * ((this.callerText.alpha - 0.28) / 0.72);
      this.desk.screenGlow.setAlpha(Phaser.Math.Clamp(a, 0, 1));
    }
  }

  _buzz() {
    if (this.isSolved) return;
    const now = this.game.loop.time;
    this._buzzStart = now;
    this._buzzUntil = now + 750;
    if (this.ambientMotion && this.desk.mug) this._ripples.push({ age: 0 }, { age: -150 }, { age: -320 });
  }

  _updateRipples(dt) {
    const g = this.desk.rippleGfx;
    if (!g) return;
    g.clear();
    const m = this.desk.mug;
    if (!m) {
      this._ripples.length = 0;
      return;
    }
    for (let i = this._ripples.length - 1; i >= 0; i--) {
      const rp = this._ripples[i];
      rp.age += dt;
      if (rp.age < 0) continue;
      const p = rp.age / 1100;
      if (p >= 1) {
        this._ripples.splice(i, 1);
        continue;
      }
      g.lineStyle(0.8, 0xe8c9a0, 0.2 * (1 - p));
      g.strokeCircle(m.cx, m.cy, m.r * 0.8 * (0.12 + 0.88 * p));
    }
  }

  _phoneLayout(W, H) {
    const s = Math.min((W * 0.82) / 424, (H * 0.9) / 846);
    return { x: W / 2, y: H / 2, s };
  }

  setPhoneScale() {
    const L = this._phoneLayout(
      this.cameras.main.width,
      this.cameras.main.height,
    );
    this.phoneContainer.setScale(L.s);
    this.phoneContainer.setPosition(L.x, L.y).setRotation(0);
    this._phoneBase = L;
  }

  drawScreen() {
    const screen = PHONE_ART.screen;
    const p = phonePoint(screen.x, screen.y);
    this.screenContainer = this.add.container(p.x, p.y);
    this.phoneContainer.add(this.screenContainer);
    const g = this.add.graphics();
    this.screenContainer.add(g);
    const w = screen.width * PHONE_ART.scale;
    const h = screen.height * PHONE_ART.scale;
    const x = -w / 2, y = -h / 2;

    // Preserve the photographed glass, its reflections and the inset bezel.
    g.fillStyle(0xb8ce83, 0.1).fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 4);
    g.lineStyle(0.45, 0x203211, 0.065);
    for (let row = 3; row < h - 2; row += 3)
      g.lineBetween(x + 2, y + row, x + w - 2, y + row);

    this.signalGfx = this.add.graphics();
    this.screenContainer.add(this.signalGfx);
    this.signalBaseX = x + 11;
    this.signalBaseY = y + 7;
    this.drawSignalBars(1);
    const statusColor = 0x31461d;
    g.lineStyle(1.2, statusColor).strokeRect(x + w - 33, y + 9, 19, 8);
    g.fillStyle(statusColor).fillRect(x + w - 14, y + 11, 2, 4);
    g.fillStyle(statusColor).fillRect(x + w - 30, y + 11, 13, 4);
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
    this.callBlinkTween = this.ambientTween({
      targets: this.callerText,
      alpha: 0.28,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createKeypad() {
    const art = PHONE_ART;
    const texture = this.textures.get(art.key);
    const font = "Arial, sans-serif";

    // Each cap uses pixels from the handset itself. Its image, lettering and
    // hit area share one container, including during presses and vibration.
    const createCap = (frame, sx, sy, sw, sh) => {
      if (!texture.has(frame))
        texture.add(frame, 0, Math.round(sx - sw / 2), Math.round(sy - sh / 2), sw, sh);
      const p = phonePoint(sx, sy);
      const c = this.add.container(p.x, p.y);
      const cap = this.add.image(0, 0, art.key, frame).setScale(art.scale);
      const w = sw * art.scale, h = sh * art.scale;
      const shade = this.add.graphics().setAlpha(0);
      shade.fillStyle(0x000000, 0.24).fillRoundedRect(-w / 2, -h / 2, w, h, h * 0.3);
      c.add([cap, shade]);
      return { c, cap, shade, w, h, baseY: p.y };
    };

    const makeInteractive = (key, onDown) => {
      const { c, cap, shade, w, h, baseY } = key;
      c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        Phaser.Geom.Rectangle.Contains);
      c.input.cursor = "pointer";
      c.on("pointerover", () => { if (!this.isSolved) cap.setTint(0xfff1d4); });
      c.on("pointerout", () => cap.clearTint());
      c.on("pointerdown", () => {
        if (this.isSolved) return;
        this.tweens.killTweensOf([c, shade]);
        c.setY(baseY);
        this.tweens.add({ targets: c, y: baseY + 1.2, duration: 60, yoyo: true, ease: "Sine.easeOut" });
        shade.setAlpha(1);
        this.tweens.add({ targets: shade, alpha: 0, duration: 180, ease: "Sine.easeOut" });
        this.playKeySound();
        onDown();
      });
    };

    const soft = art.softKeys;
    for (let i = 0; i < 2; i++) {
      const key = createCap("soft-" + i, soft.x[i], soft.y, soft.width, soft.height);
      key.c.add(this.add.text(0, 0, i === 0 ? "SELECT" : "BACK", {
        fontFamily: font, fontSize: "10.5px", fontStyle: "bold",
        color: i === 0 ? "#e0e1d6" : "#dfb9ad",
      }).setOrigin(0.5).setShadow(0, 1, "#141611", 1));
      if (i === 1) {
        makeInteractive(key, () => this.handleKeyPress("#"));
        this.rightSoftKey = key.c;
      }
      this.keypadContainer.add(key.c);
    }

    const rocker = art.rocker;
    const nav = createCap("rocker", rocker.x, rocker.y, rocker.width, rocker.height);
    this.navContainer = nav.c;
    this.navG = this.add.graphics();
    this.navG.fillStyle(0xdedbce, 0.65)
      .fillTriangle(-58, -3, -62, 0, -58, 3)
      .fillTriangle(58, -3, 62, 0, 58, 3);
    this.menuText = this.add.text(0, 0, "MENU", {
      fontFamily: font, fontSize: "11px", fontStyle: "bold", color: "#e4e3d7",
    }).setOrigin(0.5).setShadow(0, 1, "#141611", 1);
    this.navContainer.add([this.navG, this.menuText]);
    this.keypadContainer.add(this.navContainer);

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
    const subLabels = [".,?!", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ", "spc", "+0", "del"];
    keys.forEach((label, index) => {
      const grid = art.keys;
      const key = createCap("number-" + index, grid.x[index % 3],
        grid.y[Math.floor(index / 3)], grid.width, grid.height);
      key.c.add([
        this.add.text(0, -7, label, {
          fontFamily: font, fontSize: "22px", color: "#edece1",
        }).setOrigin(0.5).setShadow(0, 1, "#141611", 1),
        this.add.text(0, 10, subLabels[index], {
          fontFamily: font, fontSize: "9.5px", fontStyle: "bold", color: "#c8c9bc",
        }).setOrigin(0.5).setShadow(0, 1, "#141611", 1),
      ]);
      makeInteractive(key, () => this.handleKeyPress(label));
      this.keypadContainer.add(key.c);
    });
  }

  startVibrationSoundLoop() {
    if (this.vibrationTimer) {
      this.vibrationTimer.remove(false);
      this.vibrationTimer = null;
    }
    this.playVibrationSoundPulse();
    this.vibrationTimer = this.time.addEvent({
      delay: MP_BUZZ_EVERY,
      loop: true,
      callback: () => {
        this.playVibrationSoundPulse();
      },
    });
  }

  _afterAudioUnlock(callback) {
    const handler = () => {
      this._audioUnlockHandlers.delete(handler);
      if (this._sceneOpen) callback();
    };
    this._audioUnlockHandlers.add(handler);
    this.sound.once(Phaser.Sound.Events.UNLOCKED, handler);
  }

  playVibrationSoundPulse() {
    if (this.isSolved) {
      if (this.vibrationSound && this.vibrationSound.isPlaying) {
        this.vibrationSound.stop();
      }
      return;
    }
    // the phone shakes on the desk even while the browser keeps audio muted
    this._buzz();
    if (!this.vibrationSound) return;
    if (this.vibrationSound.isPlaying) return;
    if (this.sound.locked) {
      if (!this.waitingForAudioUnlock) {
        this.waitingForAudioUnlock = true;
        this._afterAudioUnlock(() => {
          this.waitingForAudioUnlock = false;
          if (this.isSolved || !this.vibrationSound) return;
          this.vibrationSound.play();
        });
      }
      return;
    }
    this.vibrationSound.play();
  }

  playKeySound() {
    if (!this.keySound) return;
    if (this.sound.locked) {
      this._afterAudioUnlock(() => {
        if (!this.isSolved && this.keySound) {
          this.keySound.play();
        }
      });
      return;
    }
    this.keySound.play();
  }

  handleKeyPress(key) {
    this.clearSceneTimeout(this.keyTimeout);
    this.phoneInput = pressPhoneKey(this.phoneInput, key);
    if (this.phoneInput.pending) {
      this.keyTimeout = this.setSceneTimeout(() => this.confirmChar(), PHONE_COMMIT_MS);
    }
    this.updateScreen();
  }

  confirmChar() {
    if (!this.phoneInput.pending) return;
    this.phoneInput = commitPhoneInput(this.phoneInput);
    this.updateScreen();
  }

  updateScreen() {
    const currentInput = phoneDisplay(this.phoneInput);
    this.screenInput.setText(currentInput);
    if (!this.isCallAnswered && currentInput.toUpperCase() === CALLER_NAME) {
      this.showAnswerButton();
    }
  }

  showAnswerButton() {
    if (this.isCallAnswered) return;
    this.isCallAnswered = true;
    this.clearSceneTimeout(this.keyTimeout);
    this.phoneInput = createPhoneInput();
    this.screenInput.setText("");

    // A backlit answer key appears on the existing physical rocker.
    this.menuText.setText("ANSWER").setFontSize("14px").setColor("#e2f0d6");
    this.navG.clear();
    const btnW = 104;
    const btnH = 36;
    this.navG.fillStyle(0x182716, 0.96).fillRoundedRect(-52, -18, btnW, btnH, 16);
    this.navG.lineStyle(1, 0xa9c18d, 0.55).strokeRoundedRect(-52, -18, btnW, btnH, 16);
    this.navG.fillStyle(0xd2e4ae, 0.12).fillRoundedRect(-43, -14, 86, 8, 5);

    // it breathes, so the player notices it
    this._answerPulse = this.ambientTween({
      targets: this.navContainer,
      scale: 1.035,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.navContainer
      .setInteractive(
        new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      )
      .on("pointerdown", () => this.revealRealClue());
    this.navContainer.input.cursor = "pointer";
  }

  revealRealClue() {
    this.playKeySound();
    this.solve();
  }

  solve() {
    if (this.isSolved) return;
    this.isSolved = true;
    this.confirmChar();
    this.clearSceneTimeout(this.keyTimeout);
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
    if (this._answerPulse) {
      this._answerPulse.stop();
      this._answerPulse = null;
      this.navContainer.setScale(1);
    }
    if (this.vibrationSound && this.vibrationSound.isPlaying) {
      this.vibrationSound.stop();
    }
    this.callerText.setAlpha(1);
    this.callerNumber.setAlpha(1);
    this.callerText.setText("CALLER IDENTIFIED");
    this.callerNumber.setText(CALLER_NAME);
    this.screenInput.setText("");
    this.drawSignalBars(5);
    this.keypadContainer.list.forEach((keyObj) => {
      if (keyObj.disableInteractive) {
        keyObj.disableInteractive();
      }
    });
    if (this.navContainer) {
      this.navContainer.disableInteractive();
    }
  }

  shutdown() {
    this._phoneSparkleCleanup?.();
    this._phoneSparkleCleanup = null;
    for (const handler of this._audioUnlockHandlers) {
      this.sound.off(Phaser.Sound.Events.UNLOCKED, handler);
    }
    this._audioUnlockHandlers.clear();
    this.waitingForAudioUnlock = false;
    this._onResize = null;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.clearSceneTimeout(this.keyTimeout);

    if (this.vibrationSound) {
      this.vibrationSound.stop();
    }
    this.vibrationSound = null;
    this.keySound = null;
    this.desk.destroy();
    this._ripples = [];
    this.desk.mug = null;
    this._phoneBase = null;
  }
}
