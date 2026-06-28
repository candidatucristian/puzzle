class MorseCarScene extends Phaser.Scene {
  constructor() {
    super({ key: "MorseCar" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  get MORSE_WORD() {
    return "SUMMER";
  }
  get MORSE_MAP() {
    return { S: "...", U: "..-", M: "--", E: ".", R: ".-." };
  }
  get DIT() {
    return 200;
  }
  get DAH() {
    return 520;
  }
  get T_GAP() {
    return 150;
  }
  get L_GAP() {
    return 620;
  }

  preload() {
    this.load.audio("rain_loop",    "assets/sounds/MorseCar/rain_loop.mp3");
    this.load.audio("getoutoftheway","assets/sounds/MorseCar/Getoutoftheway.mp3");
    this.load.audio("click",         "assets/sounds/global/click.mp3");
    this.load.audio("ui_click",      "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel",     "assets/sounds/global/nextlevel.wav");
    this.load.audio("error",         "assets/sounds/global/error.mp3");
    this.load.audio("bgm",           "assets/sounds/global/background.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.isSolved = false;
    this._hornActive = false;
    this._carX = -220;
    this._carY = H * 0.635;
    this._carStopX = W * 0.16;
    this._audioCtx = null;
    this._rainDrops = null;
    this._gotwSound = null;
    this._trafficColor = "green";
    this._personOffsetY = 0;
    this._carGone = false;
    this._carDomEl = null;
    this._tlClickEnabled = false;
    this._tlZone = null;
    this._tlPulseActive = false;

    // Only ~18% of windows lit, plus slow flicker
    this._windowStates = Array.from(
      { length: 200 },
      () => Math.random() > 0.82,
    );

    // ── Graphics layers (depth order) ─────────────────────────────────────────
    this._bgGfx = this.add.graphics().setDepth(-15);
    this._distantGfx = this.add.graphics().setDepth(-12); // faded distant city
    this._roadGfx = this.add.graphics().setDepth(-11);
    this._buildingGfx = this.add.graphics().setDepth(-10);
    this._windowGfx = this.add.graphics().setDepth(-9);
    this._lampGfx = this.add.graphics().setDepth(-8);
    this._trafficGfx = this.add.graphics().setDepth(-7);
    this._tlPulseGfx = this.add.graphics().setDepth(-6);
    this._pudleGfx = this.add.graphics().setDepth(-5);
    this._oncomingGfx = this.add.graphics().setDepth(4);
    this._carGfx = this.add.graphics().setDepth(5);
    this._personGfx = this.add.graphics().setDepth(6);
    this._rainGfx = this.add.graphics().setDepth(20);

    this._drawBackground(W, H);
    this._drawDistantCity(W, H);
    this._drawRoad(W, H);
    this._drawBuildings(W, H);
    this._drawWindows(W, H);
    this._drawLamps(W, H);
    this._drawTrafficLight(W, H, this._trafficColor);
    this._drawPuddles(W, H);
    this._drawPerson(W, H);
    this._createDOMCar();

    // Oncoming traffic
    this._initOncomingCars(W, H);

    // Rain drops
    this._rainDrops = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      len: Phaser.Math.Between(8, 22),
      spd: Phaser.Math.Between(9, 18),
      a: Phaser.Math.FloatBetween(0.2, 0.55),
      w: Phaser.Math.FloatBetween(0.8, 1.5),
    }));

    this._startWindowFlicker();

    // ── Sounds ────────────────────────────────────────────────────────────────
    this.rainSound = null;
    if (this.cache.audio.exists("rain_loop")) {
      this.rainSound = this.sound.add("rain_loop", {
        loop: true,
        volume: 0.35,
      });
      this._playWhenReady(this.rainSound);
    }
    if (this.cache.audio.exists("getoutoftheway")) {
      this._gotwSound = this.sound.add("getoutoftheway", { volume: 0.9 });
    }

    // ── Level label ───────────────────────────────────────────────────────────
    this.levelText = this.add
      .text(W - 30, 30, "Level 4", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setAlpha(0);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });

    this.statusText = this.add
      .text(W / 2, 50, "", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#1aaf7a",
      })
      .setOrigin(0.5);

    // ── Drive-in tween ────────────────────────────────────────────────────────
    this.tweens.addCounter({
      from: -220,
      to: this._carStopX,
      duration: 2800,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        this._carX = tween.getValue();
        this._updateDOMCarPos();
      },
      onComplete: () => {
        this._trafficColor = "red";
        this._drawTrafficLight(
          this.cameras.main.width,
          this.cameras.main.height,
          "red",
        );
        this._startMorseSequence();
      },
    });

    // Ensure cleanup runs when Phaser stops this scene (e.g. switching levels)
    this.events.on("shutdown", this.shutdown, this);

    // ── Resize ────────────────────────────────────────────────────────────────
    this.events.on("canvas_resized", (size) => {
      const w = size.width;
      const h = size.height;
      this._drawBackground(w, h);
      this._drawDistantCity(w, h);
      this._drawRoad(w, h);
      this._drawBuildings(w, h);
      this._drawWindows(w, h);
      this._drawLamps(w, h);
      this._drawTrafficLight(w, h, this._trafficColor);
      this._drawPuddles(w, h);
      this._drawPerson(w, h);
      this._carY = h * 0.635;
      this._carStopX = w * 0.16;
      if (!this._carGone) {
        this._updateDOMCarPos();
      }
      if (this._tlZone && this._tlClickEnabled) {
        const newRoadTop = h * 0.52;
        this._tlZone
          .setPosition(w * 0.46, newRoadTop - h * 0.19)
          .setSize(28, 76);
      }
      if (this._oncomingCars) {
        const newLaneY = h * 0.52 + h * 0.3 * 0.78;
        this._oncomingCars.forEach((car) => {
          car.y = newLaneY;
          car.el.style.top = Math.round(newLaneY - 66) + "px";
        });
      }
      this.levelText.setPosition(w - 30, 30);
      this.statusText.setPosition(w / 2, 50);
    });

    // ── Fade-in ───────────────────────────────────────────────────────────────
    if (!this.skipFadeIn) {
      const overlay = this.add
        .rectangle(0, 0, W, H, 0x000000)
        .setOrigin(0)
        .setDepth(200);
      const label = this.add
        .text(W / 2, H / 2, "Level 4...", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(201);
      this.tweens.add({
        targets: [overlay, label],
        alpha: 0,
        duration: 1000,
        delay: 500,
        onComplete: () => {
          overlay.destroy();
          label.destroy();
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRAWING
  // ─────────────────────────────────────────────────────────────────────────

  // ── Sky with warm NYC light-pollution glow ─────────────────────────────────
  _drawBackground(W, H) {
    const g = this._bgGfx;
    g.clear();
    const roadTop = H * 0.52;

    // Very dark blue-black night sky
    g.fillStyle(0x06061a).fillRect(0, 0, W, H);

    // Light pollution — layered warm amber fills fading toward horizon
    g.fillStyle(0x1a0c04, 0.28).fillRect(0, roadTop * 0.15, W, roadTop * 0.85);
    g.fillStyle(0x261205, 0.2).fillRect(0, roadTop * 0.38, W, roadTop * 0.62);
    g.fillStyle(0x301706, 0.14).fillRect(0, roadTop * 0.55, W, roadTop * 0.45);
  }

  // ── Distant faded city backdrop ────────────────────────────────────────────
  _drawDistantCity(W, H) {
    const g = this._distantGfx;
    g.clear();
    const roadTop = H * 0.52;

    // Two depth layers: far (barely visible) and mid (slightly more visible)
    const far = [{ x: 0.02, y: 0.3, w: 0.06, h: 0.7 }];

    // Draw far layer — low alpha, just silhouettes
    far.forEach((d) => {
      const bx = W * d.x;
      const by = roadTop * d.y;
      const bw = W * d.w;
      const bh = roadTop * d.h;

      g.fillStyle(0x141a2e, 0.72).fillRect(bx, by, bw, bh);

      // Slight lighter edge at top of each building
      g.fillStyle(0x1e2640, 0.4).fillRect(bx, by, bw, 3);

      // Scattered amber windows — sparse
      const cols = Math.max(1, Math.floor(bw / 14));
      const rows = Math.max(1, Math.floor(bh / 20));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r * 7 + c * 11 + Math.floor(bx)) % 13 !== 0) continue;
          const wx = bx + 3 + c * 14;
          const wy = by + 5 + r * 20;
          if (wx + 4 > bx + bw - 2 || wy + 6 > by + bh - 4) continue;
          g.fillStyle(0xe0902a, 0.28).fillRect(wx, wy, 4, 6);
        }
      }
    });

    // Warm haze band at horizon — the city glow bleeding into the sky
    g.fillStyle(0x3a1e08, 0.18).fillRect(0, roadTop * 0.78, W, roadTop * 0.22);
    g.fillStyle(0x4a2610, 0.1).fillRect(0, roadTop * 0.86, W, roadTop * 0.14);
  }

  // ── Road ──────────────────────────────────────────────────────────────────
  _drawRoad(W, H) {
    const g = this._roadGfx;
    g.clear();
    const roadTop = H * 0.52;
    const roadH = H * 0.3;

    g.fillStyle(0x1c1f2a).fillRect(0, 0, W, roadTop);
    g.fillStyle(0x14171f).fillRect(0, roadTop, W, roadH);
    g.fillStyle(0x1c1f2a).fillRect(0, roadTop + roadH, W, H - roadTop - roadH);

    g.lineStyle(2, 0x464960, 0.6).lineBetween(0, roadTop, W, roadTop);
    g.lineStyle(2, 0x464960, 0.6).lineBetween(
      0,
      roadTop + roadH,
      W,
      roadTop + roadH,
    );

    // Wet sheen
    g.fillStyle(0x1e2e48, 0.12).fillRect(0, roadTop, W, roadH * 0.4);

    // Double yellow center line (NYC style)
    const midY = roadTop + roadH / 2;
    g.fillStyle(0xeecc00, 0.58);
    for (let x = 0; x < W; x += 90) {
      g.fillRect(x, midY - 5, 55, 4);
      g.fillRect(x, midY + 1, 55, 4);
    }

    // Horizontal crosswalk — stripes run left-right, stacked top-to-bottom
    const cwLeft = W * 0.32;
    const cwW = W * 0.1;
    const numS = 7;
    const strH = (roadH / numS) * 0.5;
    const step = roadH / numS;
    g.fillStyle(0xffffff, 0.7);
    for (let i = 0; i < numS; i++) {
      const sy = roadTop + i * step + (step - strH) / 2;
      g.fillRect(cwLeft, sy, cwW, strH);
    }
  }

  // ── Buildings — NY skyline ─────────────────────────────────────────────────
  _buildingDefs(W, H) {
    const roadTop = H * 0.52;
    return [
      { x: 0, y: H * 0.02, w: W * 0.09, h: roadTop - H * 0.02 },
      { x: W * 0.08, y: H * 0.09, w: W * 0.08, h: roadTop - H * 0.09 },
      { x: W * 0.155, y: H * 0.04, w: W * 0.07, h: roadTop - H * 0.04 },
      { x: W * 0.22, y: H * 0.13, w: W * 0.07, h: roadTop - H * 0.13 },
      { x: W * 0.28, y: H * 0.07, w: W * 0.05, h: roadTop - H * 0.07 },
      { x: W * 0.58, y: H * 0.05, w: W * 0.08, h: roadTop - H * 0.05 },
      { x: W * 0.655, y: H * 0.1, w: W * 0.09, h: roadTop - H * 0.1 },
      { x: W * 0.74, y: H * 0.02, w: W * 0.09, h: roadTop - H * 0.02 },
      { x: W * 0.825, y: H * 0.12, w: W * 0.07, h: roadTop - H * 0.12 },
      { x: W * 0.89, y: H * 0.05, w: W * 0.11, h: roadTop - H * 0.05 },
    ];
  }

  _drawBuildings(W, H) {
    const g = this._buildingGfx;
    g.clear();
    this._buildingDefs(W, H).forEach((b) =>
      this._drawBuildingShape(g, b.x, b.y, b.w, b.h),
    );
  }

  _drawBuildingShape(g, x, y, w, h) {
    g.fillStyle(0x0c0f16).fillRect(x, y, w, h);
    g.lineStyle(1, 0x282d3e, 0.9).strokeRect(x, y, w, h);

    if (h > 160 && w > 55) {
      const sbW = w * 0.68;
      const sbH = h * 0.22;
      const sbX = x + (w - sbW) / 2;
      g.fillStyle(0x0f1218).fillRect(sbX, y, sbW, sbH);
      g.lineStyle(1, 0x282d3e, 0.7).strokeRect(sbX, y, sbW, sbH);
    }

    if (w > 50 && Math.floor(x / w) % 3 === 0) {
      this._drawWaterTower(g, x + w * 0.72, y);
    }

    if (h > 100) {
      this._drawFireEscape(g, x + w - 12, y + h * 0.08, h * 0.72);
    }
  }

  _drawWaterTower(g, x, y) {
    g.lineStyle(1.5, 0x3e3020, 0.85);
    g.lineBetween(x - 7, y, x, y + 12);
    g.lineBetween(x + 7, y, x, y + 12);
    g.lineBetween(x - 7, y, x + 7, y);
    g.fillStyle(0x2e231a).fillRect(x - 9, y - 8, 18, 12);
    g.fillStyle(0x3a2c1e).fillEllipse(x, y - 8, 18, 7);
    g.fillStyle(0x3a2c1e).fillEllipse(x, y + 4, 18, 6);
    g.fillStyle(0x18140e);
    g.beginPath();
    g.moveTo(x, y - 16);
    g.lineTo(x - 11, y - 8);
    g.lineTo(x + 11, y - 8);
    g.closePath();
    g.fillPath();
  }

  _drawFireEscape(g, x, y, totalH) {
    g.lineStyle(1.2, 0x303848, 0.75);
    const floors = Math.max(2, Math.floor(totalH / 40));
    const floorH = totalH / floors;
    for (let i = 0; i < floors; i++) {
      const fy = y + i * floorH;
      g.lineBetween(x - 11, fy, x, fy);
      g.lineBetween(x - 11, fy, x - 11, fy + 6);
      g.lineBetween(x, fy, x, fy + 6);
      if (i < floors - 1) {
        g.lineBetween(x - 5, fy + 6, x - 2, fy + floorH);
      }
    }
  }

  // ── Windows (separate layer — slow flicker) ───────────────────────────────
  _drawWindows(W, H) {
    const g = this._windowGfx;
    g.clear();
    let idx = 0;
    this._buildingDefs(W, H).forEach((b) => {
      idx = this._drawBuildingWindows(g, b.x, b.y, b.w, b.h, idx);
    });
  }

  _drawBuildingWindows(g, x, y, w, h, startIdx) {
    const colW = 10,
      rowH = 14,
      padX = 5,
      padY = 8,
      gapX = 5,
      gapY = 5;
    const cols = Math.max(1, Math.floor((w - padX * 2) / (colW + gapX)));
    const rows = Math.max(1, Math.floor((h - padY * 2) / (rowH + gapY)));
    let idx = startIdx;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + padX + c * (colW + gapX);
        const wy = y + padY + r * (rowH + gapY);
        if (wx + colW > x + w - 3 || wy + rowH > y + h - 8) {
          idx++;
          continue;
        }
        const lit = this._windowStates[idx % this._windowStates.length];
        if (lit) {
          g.fillStyle(0xf0b84a, 0.65).fillRect(wx, wy, colW, rowH);
          g.fillStyle(0xffffff, 0.15).fillRect(wx, wy, colW, rowH * 0.4);
        } else {
          g.fillStyle(0x050710, 0.9).fillRect(wx, wy, colW, rowH);
        }
        idx++;
      }
    }
    return idx;
  }

  // ── Street lamps ──────────────────────────────────────────────────────────
  _drawLamps(W, H) {
    const g = this._lampGfx;
    const roadTop = H * 0.52;
    const roadH = H * 0.3;
    g.clear();

    [W * 0.3, W * 0.52, W * 0.76].forEach((lx) => {
      const postH = roadTop * 0.26;
      const postY = roadTop - postH;

      g.lineStyle(3, 0x505868, 1);
      g.beginPath();
      g.moveTo(lx, roadTop);
      g.lineTo(lx, postY + 12);
      g.lineTo(lx + 16, postY);
      g.strokePath();

      g.fillStyle(0x3a4252).fillRect(lx + 8, postY - 10, 22, 10);
      g.fillStyle(0xffd060, 0.95).fillEllipse(lx + 19, postY - 5, 12, 7);

      g.fillStyle(0xff9a20, 0.05);
      g.beginPath();
      g.moveTo(lx + 19, postY);
      g.lineTo(lx - 75, roadTop + roadH * 0.18);
      g.lineTo(lx + 110, roadTop + roadH * 0.18);
      g.closePath();
      g.fillPath();
    });
  }

  // ── Traffic light — green before car arrives, red when car stops ──────────
  _drawTrafficLight(W, H, color) {
    const g = this._trafficGfx;
    const roadTop = H * 0.52;
    g.clear();

    const tlX = W * 0.46;
    const boxH = 76;
    const tlY = roadTop - H * 0.19;
    const postH = roadTop - (tlY + boxH);

    g.fillStyle(0x505868).fillRect(tlX - 2, tlY + boxH, 4, postH);
    g.fillStyle(0x141820).fillRoundedRect(tlX - 14, tlY, 28, boxH, 5);
    g.lineStyle(1.5, 0x30354a, 0.9).strokeRoundedRect(
      tlX - 14,
      tlY,
      28,
      boxH,
      5,
    );

    const isRed = color === "red";
    const isGreen = color === "green";
    g.fillStyle(isRed ? 0xff2200 : 0x2a0a08, isRed ? 1 : 0.5).fillCircle(
      tlX,
      tlY + 13,
      9,
    );
    g.fillStyle(0x3a2800, 0.6).fillCircle(tlX, tlY + 38, 9);
    g.fillStyle(isGreen ? 0x00ee44 : 0x071a0a, isGreen ? 1 : 0.5).fillCircle(
      tlX,
      tlY + 63,
      9,
    );

    if (isRed) {
      g.fillStyle(0xff2200, 0.1).fillCircle(tlX, tlY + 13, 20);
    }
    if (isGreen) {
      g.fillStyle(0x00ee44, 0.12).fillCircle(tlX, tlY + 63, 20);
      g.fillStyle(0x00ee44, 0.04).fillEllipse(tlX, roadTop + 12, 45, 18);
    }
  }

  // ── Puddles ───────────────────────────────────────────────────────────────
  _drawPuddles(W, H) {
    const g = this._pudleGfx;
    const roadTop = H * 0.52;
    const roadH = H * 0.3;
    g.clear();
    [
      { x: W * 0.5, y: roadTop + roadH * 0.28, rx: W * 0.052, ry: H * 0.016 },
      { x: W * 0.73, y: roadTop + roadH * 0.66, rx: W * 0.038, ry: H * 0.013 },
      { x: W * 0.2, y: roadTop + roadH * 0.58, rx: W * 0.028, ry: H * 0.01 },
    ].forEach(({ x, y, rx, ry }) => {
      g.fillStyle(0x182238, 0.72).fillEllipse(x, y, rx * 2, ry * 2);
      g.lineStyle(1, 0x3a5070, 0.28).strokeEllipse(x, y, rx * 2, ry * 2);
    });
  }

  // ── Car ───────────────────────────────────────────────────────────────────
  _drawCar(x, y, hornActive) {
    const g = this._carGfx;
    const w = 165;
    const bh = 62;
    const rh = 32;
    g.clear();

    g.fillStyle(0x000000, 0.22).fillEllipse(x + w * 0.5, y + 4, w * 0.85, 10);
    g.fillStyle(0x5a0a0a).fillCircle(x + 35, y - 2, 17);
    g.fillStyle(0x5a0a0a).fillCircle(x + w - 35, y - 2, 17);
    g.fillStyle(0x8b1515).fillRoundedRect(x, y - bh, w, bh, 8);
    g.lineStyle(1, 0x000000, 0.4).strokeRoundedRect(x, y - bh, w, bh, 8);
    g.fillStyle(0xffffff, 0.06).fillRoundedRect(
      x + 6,
      y - bh + 4,
      w - 12,
      8,
      4,
    );
    g.fillStyle(0x6b1010).fillRoundedRect(
      x + 28,
      y - bh - rh,
      w - 55,
      rh + 6,
      7,
    );
    g.fillStyle(0x1a2a3e, 0.85).fillRoundedRect(
      x + 30,
      y - bh - rh + 2,
      w - 62,
      rh + 2,
      5,
    );
    g.fillStyle(0xaaccee, 0.18).fillRect(x + 32, y - bh - rh + 3, w - 66, 10);

    const hlColor = hornActive ? 0xffffff : 0xffee80;
    const hlAlpha = hornActive ? 1 : 0.85;
    g.fillStyle(hlColor, hlAlpha).fillRoundedRect(
      x + w - 14,
      y - bh + 8,
      14,
      14,
      3,
    );
    g.fillStyle(hlColor, hlAlpha).fillRoundedRect(
      x + w - 14,
      y - 26,
      14,
      10,
      3,
    );
    if (hornActive)
      g.fillStyle(0xffffff, 0.12).fillEllipse(x + w + 35, y - bh / 2, 75, 30);

    g.fillStyle(0xdd2222, 0.9).fillRoundedRect(x, y - bh + 10, 10, 12, 2);
    g.fillStyle(0xdd2222, 0.9).fillRoundedRect(x, y - 24, 10, 10, 2);

    [x + 35, x + w - 35].forEach((wx) => {
      g.fillStyle(0x111111).fillCircle(wx, y, 16);
      g.lineStyle(1, 0x444444, 0.8).strokeCircle(wx, y, 16);
      g.fillStyle(0x888888, 0.5).fillCircle(wx, y, 7);
      g.fillStyle(0xaaaaaa, 0.3).fillCircle(wx, y, 3);
    });

    if (hornActive) {
      const hx = x + w + 8;
      const hy = y - bh / 2 - 4;
      for (let i = 0; i < 3; i++) {
        g.lineStyle(2 - i * 0.3, 0xffff66, 0.75 - i * 0.2);
        g.beginPath();
        g.arc(
          hx,
          hy,
          10 + i * 11,
          Phaser.Math.DegToRad(-50),
          Phaser.Math.DegToRad(50),
        );
        g.strokePath();
      }
    }
  }

  // ── Person with umbrella — back-view portrait ─────────────────────────────
  _drawPerson(W, H) {
    const g = this._personGfx;
    const roadTop = H * 0.52;
    const roadH = H * 0.3;
    const px = W * 0.375;
    const py = roadTop + roadH * 0.33 + (this._personOffsetY || 0);
    g.clear();

    // ── Umbrella ──────────────────────────────────────────────────────────────
    // Slightly off-center so the raised arm is natural
    const ux = px + 4;
    const uy = py - 95;
    const ur = 46;
    const NRIBS = 9;

    // Gradient via concentric semicircle layers (darkest at rim, lighter inward)
    // Layer 1 — outer rim, near-black
    g.fillStyle(0x080808, 1);
    g.beginPath();
    g.arc(ux, uy, ur, Math.PI, 0, false);
    g.lineTo(ux - ur, uy);
    g.closePath();
    g.fillPath();

    // Layer 2 — slightly lighter mid-tone
    g.fillStyle(0x131313, 0.75);
    g.beginPath();
    g.arc(ux, uy, ur * 0.74, Math.PI, 0, false);
    g.lineTo(ux - ur * 0.74, uy);
    g.closePath();
    g.fillPath();

    // Layer 3 — inner, slightly brighter (ambient bounce from street lamps)
    g.fillStyle(0x1e1e1e, 0.6);
    g.beginPath();
    g.arc(ux, uy, ur * 0.44, Math.PI, 0, false);
    g.lineTo(ux - ur * 0.44, uy);
    g.closePath();
    g.fillPath();

    // Wet specular highlight — top-left quadrant (street lamp reflection)
    g.fillStyle(0x3a3a3a, 0.35);
    g.fillEllipse(ux - ur * 0.22, uy - ur * 0.38, ur * 0.32, ur * 0.18);

    // Ribs — thin dark lines from center to edge
    g.lineStyle(1.1, 0x1c1c1c, 1);
    for (let i = 0; i <= NRIBS; i++) {
      const a = Math.PI + (i / NRIBS) * Math.PI;
      g.lineBetween(ux, uy, ux + Math.cos(a) * ur, uy + Math.sin(a) * ur);
    }

    // Outer arc border
    g.lineStyle(2.2, 0x050505, 1);
    g.beginPath();
    g.arc(ux, uy, ur, Math.PI, 0, false);
    g.strokePath();

    // Bottom flat edge of dome
    g.lineStyle(1.5, 0x111111, 0.8);
    g.lineBetween(ux - ur, uy, ux + ur, uy);

    // Scalloped hem — small downward arcs between each rib
    for (let i = 0; i < NRIBS; i++) {
      const a1 = Math.PI + (i / NRIBS) * Math.PI;
      const a2 = Math.PI + ((i + 1) / NRIBS) * Math.PI;
      const mx = ux + Math.cos((a1 + a2) / 2) * ur;
      const my = uy + Math.sin((a1 + a2) / 2) * ur;
      g.fillStyle(0x0a0a0a, 1).fillCircle(mx, my + 3.5, 4.5);
    }
    // Rib-end dots (reinforce scallop points)
    g.fillStyle(0x050505, 1);
    for (let i = 0; i <= NRIBS; i++) {
      const a = Math.PI + (i / NRIBS) * Math.PI;
      g.fillCircle(ux + Math.cos(a) * ur, uy + Math.sin(a) * ur, 3);
    }

    // Crown tip
    g.fillStyle(0x888888, 0.7).fillCircle(ux, uy - 2, 2.5);

    // Shaft — dark grey, slightly reflective
    g.lineStyle(3.5, 0x252525, 1);
    g.lineBetween(ux, uy, ux, py - 32);
    // Shaft highlight
    g.lineStyle(1, 0x444444, 0.6);
    g.lineBetween(ux + 1, uy + 5, ux + 1, py - 33);

    // J-hook handle — curves right
    g.lineStyle(3.5, 0x303030, 1);
    g.beginPath();
    g.arc(ux + 8, py - 32, 8, Math.PI, Math.PI * 0.5, true);
    g.strokePath();

    // Rainwater drips from hem
    g.lineStyle(1, 0x7090b8, 0.38);
    for (let i = 1; i < NRIBS; i++) {
      const a = Math.PI + (i / NRIBS) * Math.PI;
      const dx = ux + Math.cos(a) * ur;
      const dy = uy + Math.sin(a) * ur + 3.5;
      g.lineBetween(dx, dy, dx + 1, dy + 9);
    }

    // ── Silhouette (from behind) ───────────────────────────────────────────────
    const coat = 0x0b0d12;

    // Arm raised to hold shaft — draw before body so coat overlaps base
    g.lineStyle(7, coat, 1);
    g.lineBetween(px + 10, py - 56, ux + 1, py - 34);

    // Back of head — small dark circle just visible below umbrella canopy
    g.fillStyle(0x111318, 1).fillCircle(px, py - 74, 10);

    // Neck
    g.fillStyle(coat, 1).fillRect(px - 4, py - 66, 8, 10);

    // Shoulders + coat body from behind (wide trapezoid, coat flares at hem)
    g.fillStyle(coat, 1);
    g.beginPath();
    g.moveTo(px - 18, py - 64); // left shoulder
    g.lineTo(px + 18, py - 64); // right shoulder
    g.lineTo(px + 15, py - 40); // right waist
    g.lineTo(px + 17, py - 10); // right hem (slight flare)
    g.lineTo(px - 17, py - 10); // left hem
    g.lineTo(px - 15, py - 40); // left waist
    g.closePath();
    g.fillPath();

    // Coat centre seam (very subtle)
    g.lineStyle(1, 0x14161e, 0.5);
    g.lineBetween(px, py - 62, px, py - 12);

    // Coat hem — slight lighter edge so hem reads
    g.lineStyle(1.5, 0x1a1d26, 0.7);
    g.lineBetween(px - 17, py - 10, px + 17, py - 10);

    // Free arm — hanging at side, slightly bent
    g.lineStyle(7, coat, 1);
    g.lineBetween(px - 14, py - 58, px - 18, py - 38);
    g.lineBetween(px - 18, py - 38, px - 16, py - 22);

    // Dark glove / hand
    g.fillStyle(0x0d0f14, 1).fillCircle(px - 16, py - 20, 5);

    // Trouser legs
    g.fillStyle(0x090b0f, 1);
    g.fillRoundedRect(px - 11, py - 10, 9, 24, 3);
    g.fillRoundedRect(px + 2, py - 10, 9, 24, 3);

    // Trouser crease highlight
    g.lineStyle(1, 0x14161e, 0.4);
    g.lineBetween(px - 7, py - 9, px - 7, py + 13);
    g.lineBetween(px + 6, py - 9, px + 6, py + 13);

    // Shoes — wide dark ellipses
    g.fillStyle(0x06070a, 1);
    g.fillEllipse(px - 8, py + 16, 18, 7);
    g.fillEllipse(px + 8, py + 16, 18, 7);
    // Shoe highlight
    g.fillStyle(0x141618, 0.35);
    g.fillEllipse(px - 10, py + 14, 10, 3);
    g.fillEllipse(px + 5, py + 14, 10, 3);
  }

  // ── Oncoming traffic ──────────────────────────────────────────────────────
  _initOncomingCars(W, H) {
    const roadTop = H * 0.52;
    const roadH = H * 0.3;
    const laneY = roadTop + roadH * 0.78;
    const GAP = 480;
    const container = document.getElementById("game-container");
    const carHTML = `<div class="car-road">
      <div class="car">
        <div class="car-top"><div class="window"></div></div>
        <div class="car-base"></div>
        <div class="wheel-left wheel">
          <div class="wheel-spike"></div>
          <div class="wheel-center"></div>
        </div>
        <div class="wheel-right wheel">
          <div class="wheel-spike"></div>
          <div class="wheel-center"></div>
        </div>
        <div class="head-light"></div>
      </div>
    </div>`;
    const COLORS = [
      "#180303",
      "#151d18",
      "#14375e",
      "#3a1d42",
      "#572903",
      "#063e5f",
    ];
    // wheel centre ~47px from top; scale(1.4) on wrapper → visual offset = 47*1.4 ≈ 66
    this._oncomingCars = Array.from({ length: 3 }, (_, i) => {
      const color = COLORS[i % COLORS.length];
      const el = document.createElement("div");
      el.className = "mc-oncoming-wrapper";
      el.innerHTML = carHTML;
      el.style.setProperty("--car-color", color);
      container.appendChild(el);
      const x = W + 80 + i * GAP;
      el.style.left = x + "px";
      el.style.top = Math.round(laneY - 66) + "px";
      return { x, y: laneY, speed: 3.2, w: 154, el, colorIdx: i };
    });
  }

  _updateOncomingCars() {
    const W = this.cameras.main.width;
    const GAP = 480;
    const COLORS = [
      "#180303",
      "#151d18",
      "#14375e",
      "#3a1d42",
      "#572903",
      "#063e5f",
    ];

    this._oncomingCars.forEach((car) => {
      car.x -= car.speed;
    });

    let rightmostX = Math.max(...this._oncomingCars.map((c) => c.x));

    this._oncomingCars.forEach((car) => {
      if (car.x + car.w < -20) {
        rightmostX = Math.max(W + 80, rightmostX + GAP);
        car.x = rightmostX;
        car.colorIdx = (car.colorIdx + 1) % COLORS.length;
        car.el.style.setProperty("--car-color", COLORS[car.colorIdx]);
      }
      car.el.style.left = Math.round(car.x) + "px";
    });

    this._oncomingGfx.clear();
  }

  _drawOncomingCar(g, x, y, color, cw) {
    // Car faces LEFT (right→left traffic)
    const bh = 54;
    const rh = 28;

    // Shadow
    g.fillStyle(0x000000, 0.18).fillEllipse(x + cw * 0.5, y + 3, cw * 0.82, 8);

    // Wheels
    [x + 28, x + cw - 28].forEach((wx) => {
      g.fillStyle(0x111111).fillCircle(wx, y, 13);
      g.lineStyle(1, 0x444444, 0.7).strokeCircle(wx, y, 13);
      g.fillStyle(0x888888, 0.45).fillCircle(wx, y, 5.5);
    });

    // Body
    g.fillStyle(color).fillRoundedRect(x, y - bh, cw, bh, 7);
    g.lineStyle(1, 0x000000, 0.28).strokeRoundedRect(x, y - bh, cw, bh, 7);
    g.fillStyle(0xffffff, 0.05).fillRoundedRect(
      x + 5,
      y - bh + 3,
      cw - 10,
      7,
      3,
    );

    // Roof/cabin — slightly darker shade of body color
    const r2 = (((color >> 16) & 0xff) * 0.68) | 0;
    const g2 = (((color >> 8) & 0xff) * 0.68) | 0;
    const b2 = ((color & 0xff) * 0.68) | 0;
    const darkColor = (r2 << 16) | (g2 << 8) | b2;
    g.fillStyle(darkColor).fillRoundedRect(
      x + 22,
      y - bh - rh,
      cw - 44,
      rh + 5,
      6,
    );
    g.fillStyle(0x1a2a3e, 0.78).fillRoundedRect(
      x + 24,
      y - bh - rh + 2,
      cw - 48,
      rh + 1,
      4,
    );
    g.fillStyle(0xaaccee, 0.14).fillRect(x + 26, y - bh - rh + 3, cw - 52, 9);

    // Headlights on LEFT side (car faces left)
    g.fillStyle(0xffee80, 0.88).fillRoundedRect(x, y - bh + 8, 13, 12, 3);
    g.fillStyle(0xffee80, 0.88).fillRoundedRect(x, y - 24, 13, 9, 3);
    g.fillStyle(0xffffff, 0.08).fillEllipse(x - 30, y - bh / 2, 62, 20);

    // Taillights on RIGHT
    g.fillStyle(0xdd2222, 0.85).fillRoundedRect(
      x + cw - 13,
      y - bh + 10,
      13,
      11,
      2,
    );
    g.fillStyle(0xdd2222, 0.85).fillRoundedRect(x + cw - 13, y - 23, 13, 9, 2);

    // Taxi sign on roof for yellow cars
    if (color === 0xf5c518) {
      g.fillStyle(0xf5c518, 0.9).fillRoundedRect(
        x + cw * 0.38,
        y - bh - rh - 9,
        28,
        9,
        3,
      );
      g.fillStyle(0x333333, 0.7).fillRect(
        x + cw * 0.38 + 3,
        y - bh - rh - 7,
        22,
        5,
      );
    }
  }

  // ── Rain ──────────────────────────────────────────────────────────────────
  _updateRain() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const g = this._rainGfx;
    g.clear();
    this._rainDrops.forEach((d) => {
      g.lineStyle(d.w, 0xaac8ff, d.a);
      g.beginPath();
      g.moveTo(d.x, d.y);
      g.lineTo(d.x + 3, d.y + d.len);
      g.strokePath();
      d.y += d.spd;
      d.x += 2;
      if (d.y > H + 20) {
        d.y = -d.len;
        d.x = Math.random() * W;
      }
    });
  }

  // ── Morse sequence ────────────────────────────────────────────────────────
  _startMorseSequence() {
    if (this.isSolved) return;
    this._playGetOutOfTheWay();
    this.time.delayedCall(4000, () => {
      if (this.isSolved) return;
      this._playMorseWord(() => {
        // Enable traffic light click only after the FIRST complete Morse word
        if (!this._tlZone) {
          this._tlPulseActive = true;
          this._setupTrafficLightClick(
            this.cameras.main.width,
            this.cameras.main.height,
          );
        }
        this.time.delayedCall(5000, () => this._startMorseSequence());
      });
    });
  }

  _playMorseWord(onComplete) {
    let delay = 0;
    const letters = this.MORSE_WORD.split("");
    letters.forEach((letter, li) => {
      const code = this.MORSE_MAP[letter];
      [...code].forEach((sym) => {
        const dur = sym === "." ? this.DIT : this.DAH;
        this.time.delayedCall(delay, () => this._setHorn(true, sym));
        delay += dur;
        this.time.delayedCall(delay, () => this._setHorn(false, sym));
        delay += this.T_GAP;
      });
      if (li < letters.length - 1) delay += this.L_GAP - this.T_GAP;
    });
    this.time.delayedCall(delay, () => onComplete && onComplete());
  }

  _playGetOutOfTheWay() {
    if (this.isSolved) return;
    if (this._gotwSound) {
      if (this._gotwSound.isPlaying) this._gotwSound.stop();
      if (this.sound.locked) {
        this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
          if (!this.isSolved && this._gotwSound) this._gotwSound.play();
        });
      } else {
        this._gotwSound.play();
      }
    }
  }

  _setHorn(on, sym) {
    if (this.isSolved) return;
    this._hornActive = on;
    if (this._carDomEl) this._carDomEl.classList.toggle("mc-honking", on);
    if (on) this._playHornBeep(sym === "." ? this.DIT : this.DAH);
  }

  // ── Horn via Web Audio ────────────────────────────────────────────────────
  _playHornBeep(durationMs) {
    if (window.GameAudio && window.GameAudio.muted) return;
    const vol = window.GameAudio ? window.GameAudio.sfxVol : 1;
    try {
      if (!this._audioCtx)
        this._audioCtx = new (
          window.AudioContext || window.webkitAudioContext
        )();
      const ctx = this._audioCtx;
      if (ctx.state === "suspended") ctx.resume();
      const dSec = Math.min(durationMs, 380) / 1000;
      [370, 466].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.14 * vol, ctx.currentTime);
        gain.gain.setValueAtTime(0.14 * vol, ctx.currentTime + dSec - 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + dSec + 0.04,
        );
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dSec + 0.06);
      });
    } catch (e) {}
  }

  // ── Traffic light interaction ─────────────────────────────────────────────
  _setupTrafficLightClick(W, H) {
    const roadTop = H * 0.52;
    this._tlZone = this.add
      .zone(W * 0.46, roadTop - H * 0.19, 28, 76)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    this._tlZone.on("pointerdown", () => this._onTrafficLightClick());
    this._tlClickEnabled = true;
  }

  _onTrafficLightClick() {
    if (!this._tlClickEnabled) return;
    this._tlClickEnabled = false;
    if (this._tlZone) {
      this._tlZone.disableInteractive();
    }

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Stop pulse, morse, horn
    this._tlPulseActive = false;
    this._tlPulseGfx.clear();
    this.time.removeAllEvents();
    this._startWindowFlicker();
    this._setHorn(false, "");
    if (this._gotwSound && this._gotwSound.isPlaying) this._gotwSound.stop();

    // Traffic light → green
    this._trafficColor = "green";
    this._drawTrafficLight(W, H, "green");

    // Person walks UP first — clear of the car's lane
    const crossDist = -(H * 0.3 * 0.38);
    this.tweens.addCounter({
      from: 0,
      to: crossDist,
      duration: 1800,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        this._personOffsetY = tween.getValue();
        this._drawPerson(this.cameras.main.width, this.cameras.main.height);
      },
      // Person stays on upper sidewalk — no disappear
    });

    // Car drives through after 700ms (person has time to get out of the way)
    this.time.delayedCall(700, () => {
      const startX = this._carX;
      this.tweens.addCounter({
        from: startX,
        to: this.cameras.main.width + 320,
        duration: 4500,
        ease: "Cubic.easeIn",
        onUpdate: (tween) => {
          this._carX = tween.getValue();
          this._updateDOMCarPos();
        },
        onComplete: () => {
          if (this._carDomEl) this._carDomEl.style.display = "none";
          this._carGone = true;
        },
      });
    });
  }

  // ── Solve ─────────────────────────────────────────────────────────────────
  solve() {
    if (this.isSolved) return;
    this.isSolved = true;
    this._setHorn(false, "");
    if (this.rainSound) this.rainSound.stop();
    if (this._gotwSound && this._gotwSound.isPlaying) this._gotwSound.stop();
    this.time.removeAllEvents();
    this.statusText.setText("The signal has been decoded. Execute the keyword.");
  }

  // ── Transition ────────────────────────────────────────────────────────────
  transitionToLevel(levelKey, skipFade = false) {
    if (!this.isSolved) this.solve();
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (window.playSuccess) window.playSuccess(this);
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const levelIndex = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const levelNumber = levelIndex !== -1 ? levelIndex + 1 : "?";
    const overlay = this.add
      .rectangle(0, 0, W, H, 0x000000)
      .setOrigin(0)
      .setDepth(100)
      .setAlpha(0);
    const label = this.add
      .text(W / 2, H / 2, "Level " + levelNumber + "...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setAlpha(0);
    this.tweens.add({
      targets: [overlay, label],
      alpha: 1,
      duration: 1000,
      onComplete: () => this.scene.start(levelKey, { skipFade: false }),
    });
  }

  _startWindowFlicker() {
    this.time.addEvent({
      delay: 6000,
      loop: true,
      callback: () => {
        const idx = Math.floor(Math.random() * this._windowStates.length);
        this._windowStates[idx] = !this._windowStates[idx];
        this._drawWindows(this.cameras.main.width, this.cameras.main.height);
      },
    });
  }

  _playWhenReady(sound) {
    if (!this.sound.locked) {
      sound.play();
    } else {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => sound.play());
    }
  }

  update() {
    if (this._oncomingCars) this._updateOncomingCars();
    if (this._rainDrops) this._updateRain();
    if (this._tlPulseActive) this._drawTLPulse();
  }

  _drawTLPulse() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const roadTop = H * 0.52;
    const tlX = W * 0.46;
    const tlY = roadTop - H * 0.19;
    const pulse = 0.35 + 0.65 * Math.abs(Math.sin(this.time.now * 0.004));

    this._tlPulseGfx.clear();
    // Outer soft halo
    this._tlPulseGfx.fillStyle(0xff2200, pulse * 0.18);
    this._tlPulseGfx.fillCircle(tlX, tlY + 13, 30);
    // Sharp ring
    this._tlPulseGfx.lineStyle(2, 0xff5500, pulse * 0.85);
    this._tlPulseGfx.strokeCircle(tlX, tlY + 13, 18);
  }

  _createDOMCar() {
    if (this._carDomEl) {
      this._carDomEl.remove();
      this._carDomEl = null;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "mc-car-wrapper";
    wrapper.innerHTML = `<div class="car-road">
      <div class="car">
        <div class="car-top"><div class="window"></div></div>
        <div class="car-base"></div>
        <div class="wheel-left wheel">
          <div class="wheel-spike"></div>
          <div class="wheel-center"></div>
        </div>
        <div class="wheel-right wheel">
          <div class="wheel-spike"></div>
          <div class="wheel-center"></div>
        </div>
        <div class="head-light"></div>
      </div>
    </div>`;
    const container = document.getElementById("game-container");
    container.appendChild(wrapper);
    this._carDomEl = wrapper;
    this._updateDOMCarPos();
  }

  _updateDOMCarPos() {
    if (!this._carDomEl) return;
    // wheel centre ~47px from top; scale(1.5) on wrapper → visual offset = 47*1.5 ≈ 71
    this._carDomEl.style.left = Math.round(this._carX) + "px";
    this._carDomEl.style.top = Math.round(this._carY - 71) + "px";
  }

  shutdown() {
    if (this.rainSound) this.rainSound.stop();
    if (this._gotwSound && this._gotwSound.isPlaying) this._gotwSound.stop();
    this.time.removeAllEvents();
    this.tweens.killAll();
    if (this._audioCtx) {
      this._audioCtx.close();
      this._audioCtx = null;
    }
    if (this._carDomEl) {
      this._carDomEl.remove();
      this._carDomEl = null;
    }
    if (this._oncomingCars) {
      this._oncomingCars.forEach((car) => {
        if (car.el) car.el.remove();
      });
      this._oncomingCars = null;
    }
  }
}
