// ─────────────────────────────────────────────────────────────────────────────
// Level — "ELEVATOR"  ·  code: THIRTEEN  ·  hard  ·  buttons and deduction
//
// The whole level happens inside an elevator cab. A button panel: P, 1–12,
// 14, 15 (no 13, classically), a red STOP button, a floor display above the
// doors, and a framed inspection certificate whose fine print reads
// "Floors served: 15." Count the floor buttons: fourteen. First crack.
//
// The cab works PERFECTLY — that is the trap. Evidence hides in the rides:
//   · the 12 → 14 hop takes exactly twice as long as any other one-floor hop
//     (floor 13 physically exists in the shaft, so the double time emerges
//     naturally from the geometry — no special case in the code)
//   · in that gap a MUFFLED ding sounds, though the display jumps 12 → 14
//   · certificate says 15 floors served; someone removed a button, not a floor
//
// Solution: there is no button for 13 — but there is STOP. Ride toward 14
// (or down from 14) and press STOP in the window between floor 12's ding
// (14's, going down) and the muffled one. The cab screeches to a halt, the
// light stutters once, and the doors grind open onto a dark, sealed, dusty
// floor. Scrawled on the far wall: THIRTEEN.
//
// STOP pressed anywhere else = strident alarm, then the ride resumes — the
// button teaches that it does something, but rewards only the deduction.
// Every other hallway is identical and dead, exactly like in real life.
//
// Same scene contract as the other levels: GAME_LEVELS, initGlobalAudio,
// transitionToLevel(), canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const ELEV_FLOOR_MS = 800; // travel time per floor
const ELEV_FLOORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15];

class ElevatorScene extends Phaser.Scene {
  constructor() {
    super({ key: "Elevator" });
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
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    this.isSolved = false;
    this._h = 0; // current height in floors; P = 0, floor 13 exists at 13
    this._startH = 0;
    this._target = null;
    this._dir = 0;
    this._moving = false;
    this._lock = false; // during alarm / floor-13 sequence / door cycles
    this._doorT = 0; // 0 closed … 1 open
    this._overlayOpen = false;

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._rumbleStop();
      // settle to the nearest legitimate floor, doors closed
      this._h = Math.round(this._h);
      if (this._h === 13) this._h = 14;
      this._moving = false;
      this._lock = false;
      this._target = null;
      this._doorT = 0;
      this._teardown();
      this._build(width, height);
    });

    this.events.once("shutdown", () => this._rumbleStop());

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── movement ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._moving || this._lock) return;
    const prev = this._h;
    this._h += (this._dir * delta) / ELEV_FLOOR_MS;

    // floor crossings — a ding per floor, but 13 only murmurs
    if (this._dir > 0) {
      for (let m = Math.floor(prev) + 1; m <= this._h; m++) this._cross(m);
    } else {
      for (let m = Math.ceil(prev) - 1; m >= this._h; m--) this._cross(m);
    }

    const arrived =
      this._dir > 0 ? this._h >= this._target : this._h <= this._target;
    if (arrived) {
      this._h = this._target;
      this._moving = false;
      this._rumbleStop();
      this._setButtonLit(this._target, false);
      this._setDisplay(this._target, 0);
      this._doorCycle(false);
    }
  }

  _cross(m) {
    if (m === this._startH) return;
    if (m === 13) {
      this._dingMuffled(); // the most important sound in the level
    } else {
      this._ding();
      this._setDisplay(m, this._dir);
    }
  }

  _pressFloor(f) {
    if (this._lock || this._overlayOpen || this._doorT > 0) return;
    if (this._moving) {
      // a fresh call still wins while the cab has barely left — so mashing
      // 1 then 3 sends it serenely to 3, and nowhere special
      if (Math.abs(this._h - this._startH) < 0.35 && f !== 13) {
        this._setButtonLit(this._target, false);
        this._target = f;
        this._dir = Math.sign(f - this._h) || 1;
        this._setButtonLit(f, true);
      }
      return;
    }
    if (f === this._h) {
      this._doorCycle(false);
      return;
    }
    this._startH = this._h;
    this._target = f;
    this._dir = Math.sign(f - this._h);
    this._moving = true;
    this._setButtonLit(f, true);
    this._setDisplay(Math.round(this._h), this._dir);
    this._rumbleStart();
  }

  _pressStop() {
    if (this._lock || this._overlayOpen) return;
    if (!this._moving) return;
    // the deduced window: past 12 (or 14, going down) but BEFORE the muffled
    // ding — i.e. approaching the floor that is not on the panel
    const h = this._h;
    const win =
      (this._dir > 0 && h > 12.05 && h < 13.0) ||
      (this._dir < 0 && h < 13.95 && h > 13.0);
    if (win) this._stopAtThirteen();
    else this._emergencyStop();
  }

  // wrong guess: grinding halt between floors, an angry alarm, ride resumes
  _emergencyStop() {
    this._lock = true;
    this._moving = false;
    this._rumbleStop();
    this._screech(0.5);
    this._alarm();
    this.time.delayedCall(1700, () => {
      if (!this.scene || !this.sys.isActive()) return;
      this._lock = false;
      this._moving = true;
      this._rumbleStart();
    });
  }

  // the deduction pays off: the cab halts INSIDE the gap, at the sealed floor
  _stopAtThirteen() {
    this._lock = true;
    this._moving = false;
    this._rumbleStop();
    this._screech(1);

    const settle = this.tweens.addCounter({
      from: this._h,
      to: 13,
      duration: 420,
      ease: "Quad.easeOut",
      onUpdate: () => (this._h = settle.getValue()),
      onComplete: () => {
        this._h = 13;
        // the light stutters once — a scripted beat, then steady gloom
        const dim = this._dimRect;
        this.time.delayedCall(120, () => dim.setAlpha(0.4));
        this.time.delayedCall(210, () => dim.setAlpha(0.05));
        this.time.delayedCall(330, () => dim.setAlpha(0.45));
        this.time.delayedCall(430, () => dim.setAlpha(0.22));
        this.time.delayedCall(600, () => {
          this._drawHall(13);
          this._doorSwish();
          this._animDoors(1, 1700, () => {
            // hold the view of the sealed floor, then move on
            this.time.delayedCall(5200, () => {
              this._doorSwish();
              this._animDoors(0, 1000, () => {
                this._dimRect.setAlpha(0);
                this._lock = false;
                this._dir = Math.sign(this._target - 13) || 1;
                this._moving = true;
                this._rumbleStart();
              });
            });
          });
        });
      },
    });
  }

  // ordinary arrival: doors open on an identical, dead hallway
  _doorCycle() {
    this._lock = true;
    this._drawHall(Math.round(this._h));
    this._doorSwish();
    this._animDoors(1, 850, () => {
      this.time.delayedCall(1500, () => {
        this._doorSwish();
        this._animDoors(0, 850, () => {
          this._lock = false;
        });
      });
    });
  }

  _animDoors(to, dur, onDone) {
    const tw = this.tweens.addCounter({
      from: this._doorT,
      to,
      duration: dur,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this._doorT = tw.getValue();
        this._layoutDoors();
      },
      onComplete: () => {
        this._doorT = to;
        this._layoutDoors();
        if (onDone) onDone();
      },
    });
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  _build(W, H) {
    this._W = W;
    this._H = H;

    const dw = W * 0.4; // door opening width
    const doorTop = H * 0.28;
    const doorBot = H * 0.88;
    const cx = W / 2;
    this._door = { cx, dw, top: doorTop, bot: doorBot };

    this._drawCab(W, H, cx, dw, doorTop, doorBot);
    this._buildHallAndDoors(cx, dw, doorTop, doorBot);
    this._buildDisplay(cx, dw, doorTop);
    this._buildPanel(W, H, cx, dw, doorTop, doorBot);
    this._buildCertificate(W, H, cx, dw, doorTop, doorBot);
    this._drawTexts(W, H);

    // cabin dimmer — used only for the scripted stutter at floor 13
    this._dimRect = this.add
      .rectangle(0, 0, W, H, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(24)
      .setAlpha(0);

    // static vignette
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0.45, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0, 0.4, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.4, 0, 0.4);
    vg.fillRect(W - v, 0, v, H);

    this._setDisplay(Math.round(this._h), 0);
    this._layoutDoors();
  }

  _drawCab(W, H, cx, dw, doorTop, doorBot) {
    const g = this.add.graphics().setDepth(-10);

    // brushed steel walls
    g.fillGradientStyle(0x8a8f98, 0x9aa0a8, 0x565b64, 0x62676f, 1);
    g.fillRect(0, 0, W, H);
    // fine brushing
    const rnd = this._rng(808);
    g.lineStyle(1, 0xffffff, 0.03);
    for (let i = 0; i < 60; i++) {
      const y = rnd() * H;
      g.lineBetween(0, y, W, y);
    }
    // wall panel seams
    g.lineStyle(2, 0x3c4048, 0.55);
    for (const px of [W * 0.09, cx - dw / 2 - W * 0.035, cx + dw / 2 + W * 0.035, W * 0.91]) {
      g.lineBetween(px, H * 0.12, px, H * 0.94);
    }

    // ceiling with one static light bar
    g.fillGradientStyle(0xb8bcc4, 0xb8bcc4, 0x878c94, 0x878c94, 1);
    g.fillRect(0, 0, W, H * 0.1);
    g.fillStyle(0x2c3038, 1).fillRect(0, H * 0.1, W, 3);
    g.fillStyle(0xfff6dc, 0.9);
    g.fillRoundedRect(cx - W * 0.18, H * 0.03, W * 0.36, H * 0.035, 6);
    g.fillStyle(0xffffff, 0.5);
    g.fillRoundedRect(cx - W * 0.17, H * 0.036, W * 0.34, H * 0.012, 4);

    // floor
    g.fillGradientStyle(0x3c3a38, 0x44403c, 0x232120, 0x2a2725, 1);
    g.fillRect(0, H * 0.9, W, H * 0.1);
    g.fillStyle(0x1a1817, 1).fillRect(0, H * 0.9, W, 2.5);

    // handrails on the side walls
    for (const side of [-1, 1]) {
      const rx = cx + side * (dw / 2 + W * 0.13);
      const rw = W * 0.09;
      g.fillGradientStyle(0xd8dce2, 0x9aa0a8, 0xb0b5bc, 0x787d85, 1);
      g.fillRoundedRect(rx - rw / 2, H * 0.6, rw, 9, 4.5);
      g.fillStyle(0x4a4e56, 1);
      g.fillRect(rx - rw / 2 + 6, H * 0.6 + 9, 5, 12);
      g.fillRect(rx + rw / 2 - 11, H * 0.6 + 9, 5, 12);
    }

    // door frame
    g.fillStyle(0x2e3138, 1);
    g.fillRect(cx - dw / 2 - 12, doorTop - 12, dw + 24, 12); // header
    g.fillRect(cx - dw / 2 - 12, doorTop, 12, doorBot - doorTop); // jambs
    g.fillRect(cx + dw / 2, doorTop, 12, doorBot - doorTop);
    g.fillStyle(0x53565e, 1);
    g.fillRect(cx - dw / 2 - 12, doorTop - 12, dw + 24, 3);
    // sill
    g.fillStyle(0x1c1e22, 1);
    g.fillRect(cx - dw / 2 - 12, doorBot, dw + 24, 6);
  }

  _buildHallAndDoors(cx, dw, doorTop, doorBot) {
    // hallway behind the doors, revealed only through the opening
    this._hallGfx = this.add.graphics().setDepth(-6);
    this._hallText = this.add
      .text(cx, (doorTop + doorBot) / 2, "THIRTEEN", {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.round(dw * 0.115) + "px",
        color: "#cfc8ba",
      })
      .setOrigin(0.5)
      .setAngle(-3)
      .setDepth(-5)
      .setVisible(false);

    const maskG = this.add.graphics().setVisible(false);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(cx - dw / 2, doorTop, dw, doorBot - doorTop);
    const mask = maskG.createGeometryMask();
    this._hallGfx.setMask(mask);
    this._hallText.setMask(mask);

    // two sliding panels
    this._doorL = this.add.container(0, 0).setDepth(-2);
    this._doorR = this.add.container(0, 0).setDepth(-2);
    for (const [cont, side] of [
      [this._doorL, -1],
      [this._doorR, 1],
    ]) {
      const p = this.add.graphics();
      const pw = dw / 2;
      const x0 = side < 0 ? -pw : 0;
      p.fillGradientStyle(0x9aa0a8, 0x8a9098, 0x6a6f78, 0x5e636b, 1);
      p.fillRect(x0, 0, pw, doorBot - doorTop);
      p.lineStyle(1, 0xffffff, 0.08);
      for (let i = 1; i < 4; i++) {
        p.lineBetween(x0 + (pw / 4) * i, 4, x0 + (pw / 4) * i, doorBot - doorTop - 4);
      }
      p.lineStyle(2, 0x2c2f36, 0.9);
      p.strokeRect(x0 + 1, 1, pw - 2, doorBot - doorTop - 2);
      // rubber meeting edge
      p.fillStyle(0x17181c, 1);
      p.fillRect(side < 0 ? -3 : 0, 0, 3, doorBot - doorTop);
      cont.add(p);
    }
    this._drawHall(Math.round(this._h));
    this._layoutDoors();
  }

  _layoutDoors() {
    if (!this._doorL) return;
    const { cx, dw, top } = this._door;
    const off = (this._doorT * dw) / 2;
    this._doorL.setPosition(cx - off, top);
    this._doorR.setPosition(cx + off, top);
  }

  // every ordinary hallway is the same hallway. Floor 13 is not.
  _drawHall(floor) {
    const g = this._hallGfx;
    const { cx, dw, top, bot } = this._door;
    const hh = bot - top;
    g.clear();
    this._hallText.setVisible(false);

    if (floor === 13) {
      // sealed, dark, dust — and the name on the far wall
      g.fillGradientStyle(0x14110d, 0x17130e, 0x060504, 0x080605, 1);
      g.fillRect(cx - dw / 2, top, dw, hh);
      g.fillStyle(0x1e1811, 1).fillRect(cx - dw / 2, bot - hh * 0.14, dw, hh * 0.14);
      // dust motes settled as pale streaks, a fallen plank
      const rnd = this._rng(1313);
      g.lineStyle(1, 0x8a7f6a, 0.14);
      for (let i = 0; i < 9; i++) {
        const y = top + rnd() * hh * 0.8;
        const x = cx - dw / 2 + rnd() * dw * 0.8;
        g.lineBetween(x, y, x + 10 + rnd() * 30, y + rnd() * 4);
      }
      g.fillStyle(0x241c12, 1);
      g.save();
      g.translateCanvas(cx - dw * 0.3, bot - hh * 0.1);
      g.rotateCanvas(-0.32);
      g.fillRect(0, 0, dw * 0.42, 9);
      g.restore();
      this._hallText.setVisible(true);
    } else {
      // bland corridor: warm gloom, one distant door, two dead sconces
      g.fillGradientStyle(0x4a4238, 0x4e463a, 0x2a2620, 0x2e2a23, 1);
      g.fillRect(cx - dw / 2, top, dw, hh);
      g.fillGradientStyle(0x3a352c, 0x3a352c, 0x232019, 0x232019, 1);
      g.fillRect(cx - dw / 2, bot - hh * 0.16, dw, hh * 0.16);
      g.lineStyle(1, 0x18150f, 0.8);
      g.lineBetween(cx - dw / 2, bot - hh * 0.16, cx + dw / 2, bot - hh * 0.16);
      // distant door
      g.fillStyle(0x2c241a, 1);
      g.fillRect(cx + dw * 0.13, top + hh * 0.34, dw * 0.17, hh * 0.5);
      g.lineStyle(1, 0x171209, 0.9);
      g.strokeRect(cx + dw * 0.13, top + hh * 0.34, dw * 0.17, hh * 0.5);
      g.fillStyle(0x8a744a, 0.8);
      g.fillCircle(cx + dw * 0.165, top + hh * 0.6, 2);
      // dead sconces
      for (const sx of [cx - dw * 0.28, cx - dw * 0.02]) {
        g.fillStyle(0x5a5044, 1);
        g.fillEllipse(sx, top + hh * 0.3, 12, 18);
        g.fillStyle(0x6b6154, 0.5);
        g.fillEllipse(sx, top + hh * 0.28, 8, 10);
      }
      // skirting shadow
      g.fillStyle(0x000000, 0.25);
      g.fillRect(cx - dw / 2, top, dw, 8);
    }
  }

  // ── the display above the doors ────────────────────────────────────────────

  _buildDisplay(cx, dw, doorTop) {
    const g = this.add.graphics().setDepth(2);
    const w = dw * 0.34;
    const h = 38;
    const y = doorTop - 12 - h - 10;
    g.fillStyle(0x101216, 1);
    g.fillRoundedRect(cx - w / 2, y, w, h, 5);
    g.lineStyle(1.5, 0x3c4048, 1);
    g.strokeRoundedRect(cx - w / 2, y, w, h, 5);
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(cx - w / 2 + 3, y + 3, w - 6, h - 6, 3);

    this._dispText = this.add
      .text(cx, y + h / 2, "P", {
        fontFamily: "monospace",
        fontSize: Math.round(h * 0.62) + "px",
        fontStyle: "bold",
        color: "#ffb24a",
      })
      .setOrigin(0.5)
      .setDepth(3);
  }

  _setDisplay(floor, dir) {
    if (!this._dispText) return;
    const name = floor === 0 ? "P" : String(floor);
    const arrow = dir > 0 ? " ▲" : dir < 0 ? " ▼" : "";
    this._dispText.setText(name + arrow);
  }

  // ── the button panel ───────────────────────────────────────────────────────

  _buildPanel(W, H, cx, dw, doorTop, doorBot) {
    const px = cx + dw / 2 + (W - (cx + dw / 2)) * 0.52;
    const pw = Math.min(W * 0.15, 118);
    const ph = (doorBot - doorTop) * 0.94;
    const py = doorTop + (doorBot - doorTop) * 0.5;

    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(px - pw / 2 + 3, py - ph / 2 + 4, pw, ph, 9);
    g.fillGradientStyle(0xb0b5bc, 0xa6abb2, 0x787d85, 0x82878f, 1);
    g.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 9);
    g.lineStyle(1.5, 0x3c4048, 1);
    g.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 9);
    g.fillStyle(0xffffff, 0.14);
    g.fillRoundedRect(px - pw / 2 + 2, py - ph / 2 + 2, pw - 4, 4, 3);
    // corner screws
    g.fillStyle(0x50555c, 1);
    for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.fillCircle(px + ox * (pw / 2 - 8), py + oy * (ph / 2 - 8), 2.6);
    }

    this._btnGfx = this.add.graphics().setDepth(3);
    this._btnLit = {};
    this._btnPos = {};

    // 7 rows of floor pairs, top row = highest — P and STOP below
    const rows = [[14, 15], [11, 12], [9, 10], [7, 8], [5, 6], [3, 4], [1, 2]];
    const r = Math.min(pw * 0.16, 14);
    const rowH = (ph - r * 8) / 9;
    const colX = [px - pw * 0.22, px + pw * 0.22];

    let y = py - ph / 2 + rowH * 1.1;
    const addButton = (val, bx, by, red) => {
      this._btnPos[val] = { x: bx, y: by, r: red ? r * 1.18 : r };
      this._drawButton(val, false);
      const label = val === "STOP" ? "" : val === 0 ? "P" : String(val);
      if (val !== "STOP") {
        this.add
          .text(bx, by, label, {
            fontFamily: "Georgia, serif",
            fontSize: Math.round(r * 0.95) + "px",
            color: "#22242a",
          })
          .setOrigin(0.5)
          .setDepth(5);
      } else {
        this.add
          .text(bx, by, "STOP", {
            fontFamily: "Georgia, serif",
            fontSize: Math.round(r * 0.56) + "px",
            fontStyle: "bold",
            color: "#fff1f1",
          })
          .setOrigin(0.5)
          .setDepth(5);
      }
      const zone = this.add
        .zone(bx, by, r * 2.6, r * 2.6)
        .setOrigin(0.5)
        .setDepth(6)
        .setInteractive({ cursor: "pointer" });
      zone.on("pointerdown", () => {
        if (window.playUIClick) window.playUIClick();
        if (val === "STOP") this._pressStop();
        else this._pressFloor(val);
      });
    };

    for (const [a, b] of rows) {
      addButton(a, colX[0], y, false);
      addButton(b, colX[1], y, false);
      y += rowH + r * 0.9;
    }
    addButton(0, px, y, false); // P
    y += rowH + r * 1.05;
    addButton("STOP", px, y, true);
  }

  _drawButton(val, lit) {
    // buttons live on one graphics layer; redraw a single button by drawing
    // over its own footprint (they never overlap)
    const p = this._btnPos[val];
    if (!p) return;
    const g = this._btnGfx;
    const red = val === "STOP";
    // bezel
    g.fillStyle(0x50555c, 1);
    g.fillCircle(p.x, p.y, p.r + 2.5);
    g.fillGradientStyle(0xd8dce2, 0xb8bcc4, 0x8a8f98, 0x9aa0a8, 1);
    g.fillCircle(p.x, p.y, p.r + 1);
    // face
    if (red) {
      g.fillGradientStyle(0xc23c30, 0xb03028, 0x741812, 0x8a2019, 1);
      g.fillCircle(p.x, p.y, p.r);
    } else if (lit) {
      g.fillStyle(0xffc06a, 1);
      g.fillCircle(p.x, p.y, p.r);
      g.fillStyle(0xffe0ae, 1);
      g.fillCircle(p.x - p.r * 0.2, p.y - p.r * 0.25, p.r * 0.55);
    } else {
      g.fillGradientStyle(0xe6e9ee, 0xdadde2, 0xaeb3ba, 0xbcc1c8, 1);
      g.fillCircle(p.x, p.y, p.r);
    }
    g.lineStyle(1, 0x2e3138, 0.8);
    g.strokeCircle(p.x, p.y, p.r);
  }

  _setButtonLit(val, lit) {
    if (val === null || val === undefined) return;
    this._drawButton(val, lit);
  }

  // ── the inspection certificate ─────────────────────────────────────────────

  _buildCertificate(W, H, cx, dw, doorTop, doorBot) {
    const px = (cx - dw / 2) * 0.5;
    const py = doorTop + (doorBot - doorTop) * 0.3;
    const pw = Math.min(W * 0.13, 105);
    const ph = pw * 1.28;

    const c = this.add.container(px, py).setDepth(2).setAngle(-1.5);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-pw / 2 + 3, -ph / 2 + 4, pw, ph);
    g.fillGradientStyle(0x3a2c16, 0x42321a, 0x1e160a, 0x24190c, 1);
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    g.fillStyle(0xf0ead8, 1);
    g.fillRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12);
    // unreadable print — the real one opens on click
    g.fillStyle(0x2a2418, 0.85);
    g.fillRect(-pw * 0.3, -ph * 0.36, pw * 0.6, 5);
    g.lineStyle(1, 0x554a34, 0.6);
    for (let i = 0; i < 7; i++) {
      const ly = -ph * 0.2 + i * ph * 0.09;
      g.lineBetween(-pw * 0.32, ly, pw * (0.05 + (i % 3) * 0.09), ly);
    }
    // official stamp
    g.lineStyle(1.5, 0x4a5a9c, 0.5);
    g.strokeCircle(pw * 0.16, ph * 0.28, pw * 0.13);
    c.add(g);

    c.setSize(pw, ph);
    c.setInteractive({ cursor: "pointer" });
    c.on("pointerdown", (ptr) => {
      if (ptr.event) ptr.event.stopPropagation();
      this._openOverlay();
    });

    // ── zoomed certificate ──
    const ov = this.add.container(0, 0).setDepth(60).setVisible(false);
    const dark = this.add
      .rectangle(0, 0, W, H, 0x05030a, 0.78)
      .setOrigin(0, 0)
      .setInteractive();
    dark.on("pointerdown", () => this._closeOverlay());
    ov.add(dark);

    const bw = Math.min(W * 0.52, 430);
    const bh = Math.min(H * 0.66, 470);
    const ox = W / 2 - bw / 2;
    const oy = H / 2 - bh / 2;
    const og = this.add.graphics();
    og.fillStyle(0x000000, 0.55);
    og.fillRoundedRect(ox + 10, oy + 12, bw, bh, 6);
    og.fillGradientStyle(0xf2ecda, 0xeee7d2, 0xd2c9ae, 0xdad1b6, 1);
    og.fillRoundedRect(ox, oy, bw, bh, 6);
    og.lineStyle(2, 0x8a7d5c, 0.8);
    og.strokeRoundedRect(ox + 8, oy + 8, bw - 16, bh - 16, 4);
    // pale blue inspection stamp
    og.lineStyle(2, 0x4a5a9c, 0.4);
    og.strokeCircle(ox + bw * 0.76, oy + bh * 0.8, 34);
    og.lineStyle(1, 0x4a5a9c, 0.3);
    og.strokeCircle(ox + bw * 0.76, oy + bh * 0.8, 27);
    ov.add(og);

    const line = (ty, txt, size, color, alpha) =>
      ov.add(
        this.add
          .text(W / 2, oy + bh * ty, txt, {
            fontFamily: '"Special Elite", monospace',
            fontSize: size + "px",
            color: color || "#2e2818",
            align: "center",
          })
          .setOrigin(0.5)
          .setAlpha(alpha || 1),
      );

    line(0.12, "CERTIFICATE OF INSPECTION", 17);
    line(0.2, "Unit EL-113 · Otis-Braun · est. 1968", 12, "#4a4230", 0.9);
    line(0.32, "Cables ............ PASS", 13);
    line(0.39, "Brakes ............ PASS", 13);
    line(0.46, "Doors ............. PASS", 13);
    line(0.53, "Alarm ............. PASS", 13);
    line(0.64, "Floors served: 15.", 13);
    line(0.72, "Next inspection due:  —", 12, "#4a4230", 0.85);
    line(0.85, "for the Bureau — H. Ascher", 11, "#5a5240", 0.7);
    line(0.94, "click anywhere to step back", 11, "#6b573a", 0.7);

    this._overlay = ov;
  }

  _openOverlay() {
    if (this._overlayOpen || this._moving || this._lock) return;
    this._overlayOpen = true;
    if (window.playUIClick) window.playUIClick();
    this._overlay.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this._overlay, alpha: 1, duration: 220 });
  }

  _closeOverlay() {
    if (!this._overlayOpen) return;
    this.tweens.add({
      targets: this._overlay,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        this._overlay.setVisible(false);
        this._overlayOpen = false;
      },
    });
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 34, "An ordinary elevator.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "19px",
        color: "#23252b",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0.85);

    this.levelText = this.add
      .text(W - 26, 22, "Level 11", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "26px",
        color: "#2e3138",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 0.9, duration: 2000 });
  }

  // ── sounds (all synthesized, all mute-aware) ───────────────────────────────

  _ctx() {
    const ac = this.sound.context;
    if (!ac || (window.GameAudio && window.GameAudio.muted)) return null;
    return ac;
  }

  _vol(k) {
    return (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * k;
  }

  _rumbleStart() {
    try {
      if (this._rumble) return;
      const ac = this._ctx();
      if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 130;
      const g = ac.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(this._vol(0.35), ac.currentTime + 0.25);
      src.connect(lp);
      lp.connect(g);
      g.connect(ac.destination);
      src.start();
      this._rumble = { src, g, ac };
    } catch (e) {}
  }

  _rumbleStop() {
    try {
      if (!this._rumble) return;
      const { src, g, ac } = this._rumble;
      g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.2);
      setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {}
      }, 260);
    } catch (e) {}
    this._rumble = null;
  }

  _ding() {
    try {
      const ac = this._ctx();
      if (!ac) return;
      const t = ac.currentTime;
      for (const [f, a, dur] of [[988, 0.5, 0.5], [1319, 0.3, 0.35]]) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(this._vol(a * 0.5), t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(ac.destination);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    } catch (e) {}
  }

  // the most important sound in the level: a bell behind a sealed wall
  _dingMuffled() {
    try {
      const ac = this._ctx();
      if (!ac) return;
      const master = ac.createGain();
      master.gain.value = 1;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 560;
      lp.connect(master);
      master.connect(ac.destination);
      const hit = (t0, amp) => {
        for (const [f, a, dur] of [[622, amp, 1.3], [415, amp * 0.7, 1.5]]) {
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.type = "sine";
          o.frequency.value = f;
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(this._vol(a * 0.34), t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          o.connect(g);
          g.connect(lp);
          o.start(t0);
          o.stop(t0 + dur + 0.05);
        }
      };
      const t = ac.currentTime;
      hit(t, 1);
      hit(t + 0.16, 0.42); // the closed-room echo
    } catch (e) {}
  }

  _screech(k) {
    try {
      const ac = this._ctx();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.5;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 6;
      bp.frequency.setValueAtTime(1400, t);
      bp.frequency.exponentialRampToValueAtTime(280, t + dur * 0.9);
      const g = ac.createGain();
      g.gain.value = this._vol(0.5 * k);
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  _alarm() {
    try {
      const ac = this._ctx();
      if (!ac) return;
      const t = ac.currentTime;
      for (let i = 0; i < 4; i++) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "square";
        o.frequency.value = i % 2 ? 640 : 780;
        const t0 = t + i * 0.32;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(this._vol(0.16), t0 + 0.01);
        g.gain.setValueAtTime(this._vol(0.16), t0 + 0.2);
        g.gain.linearRampToValueAtTime(0, t0 + 0.24);
        o.connect(g);
        g.connect(ac.destination);
        o.start(t0);
        o.stop(t0 + 0.26);
      }
    } catch (e) {}
  }

  _doorSwish() {
    try {
      const ac = this._ctx();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.55;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 700;
      bp.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this._vol(0.12), t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._hallGfx = null;
    this._hallText = null;
    this._doorL = null;
    this._doorR = null;
    this._dispText = null;
    this._btnGfx = null;
    this._btnPos = {};
    this._overlay = null;
    this._dimRect = null;
    this._overlayOpen = false;
  }

  transitionToLevel(levelKey, skipFade = false) {
    this._rumbleStop();
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
    this._rumbleStop();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
