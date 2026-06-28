class DeadAirScene extends Phaser.Scene {
  constructor() {
    super({ key: "DeadAir" });
  }

  init(data) {
    this.skipFadeIn =
      data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("click",     "assets/sounds/global/click.mp3");
    this.load.audio("ui_click",  "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error",     "assets/sounds/global/error.mp3");
    this.load.audio("bgm",       "assets/sounds/global/background.mp3");
  }

  // ── Broadcast content — each channel describes VOID without naming it ────────
  get _BROADCASTS() {
    return {
      3: {
        station: "◈ COSMOS NET — CH.3",
        lines: [
          "Astronomers confirmed the discovery:",
          "a supervoid spanning 300 million",
          "light-years. No galaxies. No dark",
          "matter. No signal returns.",
          "",
          "Dr. Eisner wrote in her report:",
          "'It is not darkness. Darkness at",
          "least implies the absence of light.",
          "This is the absence of absence",
          "itself. We have no word for it.'",
          "",
          "[ SIGNAL UNSTABLE ]",
        ],
        tint: 0x000a18,
        headerColor: "#4488ff",
      },
      7: {
        station: "⚖  LAWCOURT — CH.7",
        lines: [
          "The judge ruled the contract had",
          "never legally existed. It carries",
          "no weight. No obligation. No force.",
          "It was as if it were written in",
          "smoke.",
          "",
          "'An agreement without valid",
          "consideration,' said the court,",
          "'is not merely broken. It never",
          "was. The law has one precise word",
          "for this condition.'",
          "",
          "[ END OF BROADCAST ]",
        ],
        tint: 0x0a0a08,
        headerColor: "#ccccaa",
      },
      11: {
        station: "▶ CODE REVIEW — CH.11",
        lines: [
          "When a function performs work but",
          "has no value to return — not zero,",
          "not false, not an error — what",
          "type do we declare?",
          "",
          "Zero is a value. False is a value.",
          "Even null carries meaning.",
          "",
          "There is a keyword, present in C,",
          "C++, Java, Swift, and dozens more,",
          "reserved specifically for the",
          "complete absence of any return.",
          "",
          ">  type: ________",
        ],
        tint: 0x000a00,
        headerColor: "#00ff66",
      },
      15: {
        station: "⬡ SCIENCE FOUND. — CH.15",
        lines: [
          "Remove all matter. Remove all",
          "energy. Extract every photon.",
          "Lower temperature to absolute",
          "zero. Isolate completely.",
          "",
          "What remains?",
          "",
          "Physicists expected nothing.",
          "What they found: quantum foam,",
          "fluctuations in what should have",
          "been perfect absence.",
          "",
          "Even emptiness has structure.",
          "We still use the same old word.",
        ],
        tint: 0x040008,
        headerColor: "#cc88ff",
      },
    };
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.isSolved        = false;
    this._channel        = 1;
    this._maxChannel     = 20;
    this._signalStrength = 0;
    this._frameCount     = 0;
    this._hoverBtn       = null;
    this._tv             = {};
    this._noiseSource    = null;
    this._noiseGain      = null;
    this._broadcastObjs  = {}; // Phaser text objects per special channel

    // Graphics layers
    this._bgGfx        = this.add.graphics().setDepth(0);
    this._furnitureGfx = this.add.graphics().setDepth(1);
    this._tvBodyGfx    = this.add.graphics().setDepth(2);
    this._screenBgGfx  = this.add.graphics().setDepth(3);
    this._staticGfx    = this.add.graphics().setDepth(4);
    this._scanGfx      = this.add.graphics().setDepth(6);
    this._uiGfx        = this.add.graphics().setDepth(7);
    this._ledGfx       = this.add.graphics().setDepth(8);

    this._buildLayout(W, H);
    this._drawRoom(W, H);
    this._drawFurniture(W, H);
    this._drawTVBody();
    this._drawScanlines();
    this._createBroadcastTexts();
    this._drawButtons();
    this._initStaticNoise();

    this._keyLeft  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this._keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.input.on("pointerdown", (p) => this._handlePointerDown(p));
    this.input.on("pointermove", (p) => this._handlePointerMove(p));

    this._updateChannelDisplay();

    this.events.on("canvas_resized", ({ width: w, height: h }) =>
      this._onResize(w, h)
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  _buildLayout(W, H) {
    const tvW    = Math.min(W * 0.54, 560);
    const tvH    = tvW * 0.80;
    const tvX    = W / 2 - tvW / 2;
    const tvY    = H * 0.05;

    const screenW = tvW * 0.82;
    const screenH = screenW * 0.72;
    const screenX = tvX + (tvW - screenW) / 2;
    const screenY = tvY + tvH * 0.06;

    this._tv = { tvX, tvY, tvW, tvH, screenX, screenY, screenW, screenH };
  }

  // ── Room ───────────────────────────────────────────────────────────────────

  _drawRoom(W, H) {
    const g = this._bgGfx;
    g.clear();

    g.fillGradientStyle(0x090710, 0x090710, 0x0c0a14, 0x0c0a14, 1);
    g.fillRect(0, 0, W, H * 0.70);

    g.fillGradientStyle(0x100d18, 0x100d18, 0x080808, 0x080808, 1);
    g.fillRect(0, H * 0.70, W, H * 0.30);

    // Wallpaper grid
    g.lineStyle(1, 0x16102a, 0.45);
    for (let x = 0; x < W; x += 30) g.lineBetween(x, 0, x, H * 0.70);
    for (let y = 0; y < H * 0.70; y += 30) g.lineBetween(0, y, W, y);

    // Damask dots
    g.fillStyle(0x1e1530, 0.3);
    for (let x = 15; x < W; x += 30) {
      for (let y = 15; y < H * 0.70; y += 30) {
        g.fillCircle(x, y, 2);
      }
    }

    // Baseboard
    g.fillStyle(0x1c1526, 1);
    g.fillRect(0, H * 0.70, W, 5);

    // Edge vignette
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x000000, 0.07);
      g.fillRect(0, 0, (5 - i) * 16, H);
      g.fillRect(W - (5 - i) * 16, 0, (5 - i) * 16, H);
    }
  }

  // ── Furniture ──────────────────────────────────────────────────────────────

  _drawFurniture(W, H) {
    const g = this._furnitureGfx;
    g.clear();

    const { tvX, tvY, tvW, tvH } = this._tv;

    // Stand surface
    const standW = tvW * 0.88;
    const standH = 20;
    const standX = tvX + (tvW - standW) / 2;
    const standY = tvY + tvH + 2;

    g.fillStyle(0x1a1020, 1);
    g.fillRect(standX, standY, standW, standH);
    g.lineStyle(1, 0x2e2038, 1);
    g.strokeRect(standX, standY, standW, standH);

    // Cabinet body
    const cabH = H * 0.70 - (standY + standH);
    g.fillGradientStyle(0x130e1a, 0x130e1a, 0x0d0a14, 0x0d0a14, 1);
    g.fillRect(standX, standY + standH, standW, cabH);
    g.lineStyle(1, 0x221830, 0.7);
    g.strokeRect(standX, standY + standH, standW, cabH);

    // Cabinet inner panel
    g.lineStyle(1, 0x2e2040, 0.5);
    g.strokeRect(standX + 12, standY + standH + 10, standW - 24, cabH - 20);

    // Notepad (right)
    const padW = Math.min(standW * 0.24, 84);
    const padH = 62;
    const padX = standX + standW - padW - 16;
    const padY = standY - padH + 4;

    g.fillStyle(0xede0b5, 1);
    g.fillRect(padX, padY, padW, padH);
    g.fillStyle(0xc8b070, 1);
    g.fillRect(padX, padY, padW, 7);
    g.lineStyle(1, 0xbda87a, 1);
    for (let i = 1; i <= 5; i++) {
      const ly = padY + 7 + i * (padH - 7) / 6;
      g.lineBetween(padX + 6, ly, padX + padW - 6, ly);
    }
    g.lineStyle(1, 0xd08080, 0.7);
    g.lineBetween(padX + 14, padY + 7, padX + 14, padY + padH);
    g.lineStyle(1, 0xa09060, 1);
    g.strokeRect(padX, padY, padW, padH);

    // VHS tape (left)
    const vhsX = standX + 18;
    const vhsY = standY - 26 + 4;
    g.fillStyle(0x0d0a10, 1);
    g.fillRect(vhsX, vhsY, 52, 22);
    g.lineStyle(1, 0x25202e, 1);
    g.strokeRect(vhsX, vhsY, 52, 22);
    g.fillStyle(0x2a1f10, 1);
    g.fillRect(vhsX + 4, vhsY + 5, 44, 12);

    this._padX = padX;
    this._padY = padY;
    this._padW = padW;
    this._padH = padH;
  }

  // ── TV Body ────────────────────────────────────────────────────────────────

  _drawTVBody() {
    const g  = this._tvBodyGfx;
    const sg = this._screenBgGfx;
    g.clear();
    sg.clear();

    const { tvX, tvY, tvW, tvH, screenX, screenY, screenW, screenH } = this._tv;

    // Shadow
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(tvX + 9, tvY + 9, tvW, tvH, 16);

    // Body
    g.fillStyle(0x1c1820, 1);
    g.fillRoundedRect(tvX, tvY, tvW, tvH, 14);
    g.lineStyle(1, 0x30284a, 1);
    g.strokeRoundedRect(tvX, tvY, tvW, tvH, 14);
    g.lineStyle(1, 0x3e3460, 0.35);
    g.strokeRoundedRect(tvX + 2, tvY + 2, tvW - 4, tvH - 4, 12);

    // Screen bezel
    const bz = 9;
    g.fillStyle(0x080610, 1);
    g.fillRoundedRect(screenX - bz, screenY - bz, screenW + bz * 2, screenH + bz * 2, 10);

    // Screen
    sg.fillStyle(0x010208, 1);
    sg.fillRect(screenX, screenY, screenW, screenH);
    sg.lineStyle(2, 0x004418, 0.15);
    sg.strokeRect(screenX, screenY, screenW, screenH);

    // Control panel
    const cpY = screenY + screenH + 14;
    const cpH = tvY + tvH - cpY - 12;

    // Speaker grille
    const grillX = tvX + 18;
    const grillW = tvW * 0.25;
    g.fillStyle(0x100c18, 1);
    g.fillRect(grillX, cpY, grillW, cpH);
    g.lineStyle(1, 0x1c1528, 1);
    g.strokeRect(grillX, cpY, grillW, cpH);
    for (let i = 0; i < 8; i++) {
      const lx = grillX + 6 + i * (grillW - 12) / 7;
      g.lineStyle(2, 0x060410, 1);
      g.lineBetween(lx, cpY + 4, lx, cpY + cpH - 4);
    }

    // LCD display
    const dispW = tvW * 0.30;
    const dispH = Math.min(cpH * 0.72, 34);
    const dispX = tvX + tvW * 0.44;
    const dispY = cpY + (cpH - dispH) / 2;

    g.fillStyle(0x030208, 1);
    g.fillRect(dispX, dispY, dispW, dispH);
    g.lineStyle(1, 0x2a2040, 1);
    g.strokeRect(dispX, dispY, dispW, dispH);
    g.lineStyle(1, 0x003020, 0.4);
    g.strokeRect(dispX + 1, dispY + 1, dispW - 2, dispH - 2);

    this._dispX = dispX;
    this._dispY = dispY;
    this._dispW = dispW;
    this._dispH = dispH;

    // Buttons
    const btnH  = Math.min(cpH * 0.78, 28);
    const btnW  = Math.min(tvW * 0.065, 26);
    const btnY  = cpY + (cpH - btnH) / 2;

    this._btnLeft  = { x: dispX - btnW - 8, y: btnY, w: btnW, h: btnH };
    this._btnRight = { x: dispX + dispW + 8, y: btnY, w: btnW, h: btnH };

    // Power LED
    this._ledX = tvX + tvW - 20;
    this._ledY = cpY + cpH / 2;

    // Brand label
    this._brandX = tvX + tvW * 0.37;
    this._brandY = tvY + tvH - 10;

    // Antenna
    g.lineStyle(3, 0x28203a, 1);
    g.lineBetween(tvX + tvW / 2 - 12, tvY + 4, tvX + tvW / 2 - 46, tvY - 56);
    g.lineBetween(tvX + tvW / 2 + 12, tvY + 4, tvX + tvW / 2 + 40, tvY - 60);
    g.fillStyle(0x1a1428, 1);
    g.fillCircle(tvX + tvW / 2 - 12, tvY + 4, 4);
    g.fillCircle(tvX + tvW / 2 + 12, tvY + 4, 4);
  }

  _drawScanlines() {
    const g = this._scanGfx;
    g.clear();
    const { screenX, screenY, screenW, screenH } = this._tv;
    g.lineStyle(1, 0x000000, 0.26);
    for (let y = screenY; y < screenY + screenH; y += 3) {
      g.lineBetween(screenX, y, screenX + screenW, y);
    }
  }

  // ── Broadcast texts ────────────────────────────────────────────────────────

  _createBroadcastTexts() {
    const { screenX, screenY, screenW, screenH } = this._tv;
    const broadcasts = this._BROADCASTS;

    // Notepad hint text
    const noteSize = Math.max(Math.floor(this._padW * 0.115), 7);
    this._noteText = this.add
      .text(
        this._padX + this._padW / 2,
        this._padY + this._padH * 0.52,
        "4 CH\nread all",
        {
          fontFamily: '"Courier New", monospace',
          fontSize: noteSize + "px",
          color: "#2a1800",
          align: "center",
          lineSpacing: 2,
        }
      )
      .setOrigin(0.5)
      .setDepth(8);

    // Per-channel broadcast objects
    for (const [ch, data] of Object.entries(broadcasts)) {
      const padX = screenX + 10;
      const padY = screenY + 8;
      const maxW = screenW - 20;

      const header = this.add
        .text(padX, padY, data.station, {
          fontFamily: '"Courier New", monospace',
          fontSize: Math.max(Math.floor(screenW * 0.035), 10) + "px",
          color: data.headerColor,
          fontStyle: "bold",
        })
        .setAlpha(0)
        .setDepth(9);

      const sep = this.add
        .text(padX, padY + header.height + 3, "─".repeat(28), {
          fontFamily: '"Courier New", monospace',
          fontSize: Math.max(Math.floor(screenW * 0.028), 9) + "px",
          color: "#334433",
        })
        .setAlpha(0)
        .setDepth(9);

      const bodySize = Math.max(Math.floor(screenW * 0.031), 9);
      const body = this.add
        .text(padX, padY + header.height + sep.height + 6, data.lines.join("\n"), {
          fontFamily: '"Courier New", monospace',
          fontSize: bodySize + "px",
          color: "#a8c8a8",
          lineSpacing: 1,
          wordWrap: { width: maxW },
        })
        .setAlpha(0)
        .setDepth(9);

      this._broadcastObjs[ch] = { header, sep, body };
    }

    // Channel display text
    const chSize = Math.max(Math.floor(this._dispH * 0.52), 13);
    this._chText = this.add
      .text(
        this._dispX + this._dispW / 2,
        this._dispY + this._dispH / 2,
        "CH 01",
        {
          fontFamily: '"Courier New", monospace',
          fontSize: chSize + "px",
          color: "#00ee77",
        }
      )
      .setOrigin(0.5)
      .setDepth(8);

    // Brand text
    this._brandText = this.add
      .text(this._brandX, this._brandY, "SONUS · 84", {
        fontFamily: '"Courier New", monospace',
        fontSize: "9px",
        color: "#3a3058",
      })
      .setOrigin(0.5, 1)
      .setDepth(8);

    // Tune hint
    this._hintText = this.add
      .text(
        this._tv.screenX + this._tv.screenW / 2,
        this._tv.screenY + this._tv.screenH - 10,
        "← →  tune",
        {
          fontFamily: '"Courier New", monospace',
          fontSize: "10px",
          color: "#1a2a1a",
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(9);
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  _drawButtons() {
    const g   = this._uiGfx;
    const hov = this._hoverBtn;
    const { x: lx, y: ly, w: lw, h: lh } = this._btnLeft;
    const { x: rx, y: ry, w: rw, h: rh } = this._btnRight;
    g.clear();
    this._drawOneBtn(g, lx, ly, lw, lh, "left",  hov === "left");
    this._drawOneBtn(g, rx, ry, rw, rh, "right", hov === "right");
  }

  _drawOneBtn(g, x, y, w, h, dir, hovered) {
    g.fillStyle(hovered ? 0x2e2445 : 0x1a1430, 1);
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, hovered ? 0x8060cc : 0x3a2e54, 1);
    g.strokeRoundedRect(x, y, w, h, 4);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const aw = w * 0.28;
    g.fillStyle(hovered ? 0xccaaff : 0x887799, 1);
    if (dir === "left") {
      g.fillTriangle(cx - aw, cy, cx + aw, cy - aw * 0.8, cx + aw, cy + aw * 0.8);
    } else {
      g.fillTriangle(cx + aw, cy, cx - aw, cy - aw * 0.8, cx - aw, cy + aw * 0.8);
    }
  }

  // ── Static noise audio ─────────────────────────────────────────────────────

  _initStaticNoise() {
    try {
      const ac  = this.sound.context;
      const len = ac.sampleRate * 2;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const dat = buf.getChannelData(0);
      for (let i = 0; i < len; i++) dat[i] = (Math.random() * 2 - 1) * 0.18;

      this._noiseSource = ac.createBufferSource();
      this._noiseSource.buffer = buf;
      this._noiseSource.loop   = true;

      const bpf = ac.createBiquadFilter();
      bpf.type = "bandpass";
      bpf.frequency.value = 1800;
      bpf.Q.value = 0.4;

      this._noiseGain = ac.createGain();
      const vol = window.GameAudio && !window.GameAudio.muted
        ? (window.GameAudio.sfxVol || 0.8) * 0.3
        : 0;
      this._noiseGain.gain.value = vol;

      this._noiseSource.connect(bpf);
      bpf.connect(this._noiseGain);
      this._noiseGain.connect(ac.destination);
      this._noiseSource.start();
    } catch (e) {
      this._noiseGain = null;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _handlePointerDown(p) {
    const { x, y } = p;
    const { x: lx, y: ly, w: lw, h: lh } = this._btnLeft;
    const { x: rx, y: ry, w: rw, h: rh } = this._btnRight;
    if (x >= lx && x <= lx + lw && y >= ly && y <= ly + lh) this._changeChannel(-1);
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) this._changeChannel(+1);
  }

  _handlePointerMove(p) {
    const { x, y } = p;
    const { x: lx, y: ly, w: lw, h: lh } = this._btnLeft;
    const { x: rx, y: ry, w: rw, h: rh } = this._btnRight;
    const overL = x >= lx && x <= lx + lw && y >= ly && y <= ly + lh;
    const overR = x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
    const next  = overL ? "left" : overR ? "right" : null;
    if (next !== this._hoverBtn) {
      this._hoverBtn = next;
      this._drawButtons();
    }
  }

  _changeChannel(delta) {
    // Hide all broadcasts immediately
    for (const obj of Object.values(this._broadcastObjs)) {
      obj.header.setAlpha(0);
      obj.sep.setAlpha(0);
      obj.body.setAlpha(0);
    }
    this._channel = ((this._channel - 1 + delta + this._maxChannel) % this._maxChannel) + 1;
    this._signalStrength = 0;
    this._updateChannelDisplay();
    if (window.playClick) window.playClick(this);
  }

  _updateChannelDisplay() {
    if (this._chText) {
      this._chText.setText("CH " + String(this._channel).padStart(2, "0"));
    }
  }

  // ── Update loop ────────────────────────────────────────────────────────────

  update() {
    if (this.isSolved) return;
    this._frameCount++;

    if (Phaser.Input.Keyboard.JustDown(this._keyLeft))  this._changeChannel(-1);
    if (Phaser.Input.Keyboard.JustDown(this._keyRight)) this._changeChannel(+1);

    const broadcasts = this._BROADCASTS;
    const isSpecial  = !!broadcasts[this._channel];
    this._signalStrength = Phaser.Math.Linear(
      this._signalStrength,
      isSpecial ? 1 : 0,
      0.032
    );

    // Update broadcast text alpha
    const sig = this._signalStrength;
    for (const [ch, obj] of Object.entries(this._broadcastObjs)) {
      if (parseInt(ch) === this._channel) {
        // Slight flicker once mostly clear
        const flicker = sig > 0.85
          ? sig * (0.92 + Math.sin(this._frameCount * 0.07) * 0.08)
          : sig * 0.6;
        obj.header.setAlpha(flicker);
        obj.sep.setAlpha(flicker * 0.5);
        obj.body.setAlpha(flicker * 0.85);
      } else {
        obj.header.setAlpha(0);
        obj.sep.setAlpha(0);
        obj.body.setAlpha(0);
      }
    }

    // Screen background tint on special channels
    const sg = this._screenBgGfx;
    sg.clear();
    const { screenX, screenY, screenW, screenH } = this._tv;
    const tint = isSpecial ? broadcasts[this._channel].tint : 0x010208;
    const r = (tint >> 16) & 0xff;
    const g2 = (tint >> 8) & 0xff;
    const b  = tint & 0xff;
    // Lerp toward tint color based on signal
    const rr = Math.floor(1 + r * sig);
    const gr = Math.floor(2 + g2 * sig);
    const br = Math.floor(8 + b * sig);
    const blendedTint = Phaser.Display.Color.GetColor(rr, gr, br);
    sg.fillStyle(blendedTint, 1);
    sg.fillRect(screenX, screenY, screenW, screenH);
    sg.lineStyle(2, 0x004418, 0.12);
    sg.strokeRect(screenX, screenY, screenW, screenH);

    // Noise volume
    if (this._noiseGain) {
      const muted = window.GameAudio && window.GameAudio.muted;
      const vol   = window.GameAudio ? window.GameAudio.sfxVol : 0.8;
      const t     = muted ? 0 : (1 - sig * 0.90) * vol * 0.3;
      this._noiseGain.gain.value = Phaser.Math.Linear(
        this._noiseGain.gain.value, t, 0.05
      );
    }

    this._drawStatic();
    this._drawLED();
  }

  _drawStatic() {
    const g   = this._staticGfx;
    g.clear();

    const { screenX, screenY, screenW, screenH } = this._tv;
    const sig   = this._signalStrength;
    const count = Math.floor((1 - sig * 0.96) * 800);

    // Occasional horizontal tear bar
    if (Math.random() < 0.05) {
      const barY = screenY + Math.random() * screenH;
      const barH = 2 + Math.random() * 5;
      g.fillStyle(0xffffff, 0.04 + Math.random() * 0.08);
      g.fillRect(screenX, barY, screenW, barH);
    }

    for (let i = 0; i < count; i++) {
      const nx   = screenX + Math.random() * screenW;
      const ny   = screenY + Math.random() * screenH;
      const gray = Math.floor(Math.random() * 255);
      const sz   = Math.random() < 0.10 ? 4 : 2;
      if (Math.random() < 0.05) {
        const isC = Math.random() < 0.5;
        g.fillStyle(
          isC
            ? Phaser.Display.Color.GetColor(180, 50, gray)
            : Phaser.Display.Color.GetColor(40, gray, 170),
          0.5 + Math.random() * 0.4
        );
      } else {
        g.fillStyle(
          Phaser.Display.Color.GetColor(gray, gray, gray),
          0.5 + Math.random() * 0.4
        );
      }
      g.fillRect(nx, ny, sz, sz);
    }

    // CRT corner darkening
    for (let i = 0; i < 3; i++) {
      const pad = i * 14;
      g.fillStyle(0x000000, 0.05);
      g.fillRect(screenX, screenY, pad + 4, screenH);
      g.fillRect(screenX + screenW - pad - 4, screenY, pad + 4, screenH);
      g.fillRect(screenX, screenY, screenW, pad + 4);
      g.fillRect(screenX, screenY + screenH - pad - 4, screenW, pad + 4);
    }
  }

  _drawLED() {
    const g = this._ledGfx;
    g.clear();
    const broadcasts = this._BROADCASTS;
    const isSpecial = !!broadcasts[this._channel];
    const sig  = this._signalStrength;
    const f    = this._frameCount;

    if (isSpecial && sig > 0.1) {
      const pulse = 0.5 + 0.5 * Math.sin(f * 0.13);
      g.fillStyle(0x00ff44, 0.22 * pulse);
      g.fillCircle(this._ledX, this._ledY, 10);
      g.fillStyle(0x00cc33, 1);
      g.fillCircle(this._ledX, this._ledY, 4);
    } else {
      g.fillStyle(0x550000, 1);
      g.fillCircle(this._ledX, this._ledY, 4);
      g.fillStyle(0xaa2200, 0.12);
      g.fillCircle(this._ledX, this._ledY, 7);
    }
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  _onResize(W, H) {
    this._buildLayout(W, H);
    this._drawRoom(W, H);
    this._drawFurniture(W, H);
    this._drawTVBody();
    this._drawScanlines();
    this._drawButtons();

    const { screenX, screenY, screenW, screenH } = this._tv;

    // Reposition broadcast texts
    for (const [ch, obj] of Object.entries(this._broadcastObjs)) {
      const data = this._BROADCASTS[ch];
      const padX = screenX + 10;
      const padY = screenY + 8;
      const hs   = Math.max(Math.floor(screenW * 0.035), 10);
      const bs   = Math.max(Math.floor(screenW * 0.031), 9);
      obj.header.setPosition(padX, padY).setFontSize(hs);
      obj.sep.setPosition(padX, padY + obj.header.height + 3).setFontSize(Math.max(Math.floor(screenW * 0.028), 9));
      obj.body.setPosition(padX, padY + obj.header.height + obj.sep.height + 6)
        .setFontSize(bs)
        .setWordWrapWidth(screenW - 20);
    }

    if (this._chText) {
      this._chText
        .setPosition(this._dispX + this._dispW / 2, this._dispY + this._dispH / 2)
        .setFontSize(Math.max(Math.floor(this._dispH * 0.52), 13));
    }
    if (this._noteText) {
      const ns = Math.max(Math.floor(this._padW * 0.115), 7);
      this._noteText
        .setPosition(this._padX + this._padW / 2, this._padY + this._padH * 0.52)
        .setFontSize(ns);
    }
    if (this._brandText) {
      this._brandText.setPosition(this._brandX, this._brandY);
    }
    if (this._hintText) {
      this._hintText.setPosition(screenX + screenW / 2, screenY + screenH - 10);
    }

    this._updateChannelDisplay();
  }

  // ── Scene lifecycle ────────────────────────────────────────────────────────

  transitionToLevel(nextKey) {
    this.isSolved = true;
    this._stopNoise();
    if (window.playSuccess) window.playSuccess(this);
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
      this.scene.start(nextKey, { skipFade: true });
    });
  }

  shutdown() {
    this._stopNoise();
  }

  _stopNoise() {
    try { if (this._noiseSource) this._noiseSource.stop(); } catch (e) {}
    try { if (this._noiseGain) this._noiseGain.disconnect(); } catch (e) {}
  }
}
