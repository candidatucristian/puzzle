class BinaryRouterScene extends Phaser.Scene {
  constructor() {
    super({ key: "BinaryRouter" });
  }

  init(data) {
    this.skipFadeIn =
      data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
    // Load SVG as text so we can inline it and manipulate individual LED elements
    this.load.text(
      "router_svg",
      "assets/images/BinaryRouter/wireless-router.svg",
    );
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    this.isSolved = false;
    this._timerEvents = [];
    this._svgContainer = null;
    this._ledEls = null;

    // Dark background only
    this._bgGfx = this.add.graphics().setDepth(0);
    this._drawBg(this.cameras.main.width, this.cameras.main.height);

    this._buildScene(this.cameras.main.width, this.cameras.main.height);
    this._startAnimation();

    this.events.on("canvas_resized", ({ width, height }) => {
      this._drawBg(width, height);
      this._cancelAnimation();
      this._destroySVG();
      this._buildScene(width, height);
      this._startAnimation();
    });
  }

  // ── Background ──────────────────────────────────────────────────────────────

  _drawBg(W, H) {
    this._bgGfx.clear();
    this._bgGfx.fillGradientStyle(0x050508, 0x050508, 0x020204, 0x020204, 1);
    this._bgGfx.fillRect(0, 0, W, H);
  }

  // ── Scene Build ─────────────────────────────────────────────────────────────

  _buildScene(W, H) {
    this._injectSVG(W, H);
  }

  replay() {
    this._startAnimation();
  }

  // ── SVG Injection ───────────────────────────────────────────────────────────

  _injectSVG(W, H) {
    const svgText = this.cache.text.get("router_svg");
    if (!svgText) return;

    // SVG native dimensions from viewBox
    const SVG_W = 300;
    const SVG_H = 224.68;

    // Fit SVG responsively inside the canvas
    const displayW = Math.min(W * 0.78, 520);
    const displayH = displayW * (SVG_H / SVG_W);
    const x = (W - displayW) / 2;
    const y = (H - displayH) / 2 - H * 0.04; // slightly above center

    const wrap = document.createElement("div");
    wrap.id = "br-svg-wrap";
    wrap.className = "scene-dom-overlay";
    wrap.innerHTML = svgText;

    const svg = wrap.querySelector("svg");
    svg.setAttribute("width", displayW);
    svg.setAttribute("height", displayH);

    // Add LEIBNIZ label directly to SVG DOM (on the router body, y≈131-175 in viewBox)
    const modelLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    modelLabel.setAttribute("x", "150");
    modelLabel.setAttribute("y", "155");
    modelLabel.setAttribute("text-anchor", "middle");
    modelLabel.setAttribute("font-family", "monospace");
    modelLabel.setAttribute("font-size", "9");
    modelLabel.setAttribute("letter-spacing", "3");
    modelLabel.setAttribute("fill", "#9abaa0");
    modelLabel.textContent = "W. LEIBNIZ";
    svg.appendChild(modelLabel);

    Object.assign(wrap.style, {
      position: "absolute",
      left: x + "px",
      top: y + "px",
      width: displayW + "px",
      height: displayH + "px",
      pointerEvents: "none",
    });

    const container = document.getElementById("game-container");
    container.appendChild(wrap);
    this._svgContainer = wrap;
    this._svgLayout = { x, y, w: displayW, h: displayH };

    // LED IDs left-to-right as they appear in the SVG (13 total)
    // 0-4  → letter counter (light up RED left-to-right as each letter completes)
    // 5-12 → binary signal  (light up GREEN right-to-left for each bit)
    const LED_IDS = [
      "path5155",
      "path5239",
      "path5241",
      "path5243",
      "path5245", // 0-4  letter counter
      "path5247",
      "path5249",
      "path5251",
      "path5253", // 5-8  binary bits 7→4
      "path5255",
      "path5257",
      "path5259",
      "path5261", // 9-12 binary bits 3→0
    ];

    this._ledEls = LED_IDS.map((id) => {
      const el = wrap.querySelector("#" + id);
      if (el) this._applyLedStyle(el, "off");
      return el;
    });
  }

  _destroySVG() {
    if (this._svgContainer) {
      this._svgContainer.remove();
      this._svgContainer = null;
    }
    this._ledEls = null;
  }

  // ── LED Style ───────────────────────────────────────────────────────────────

  _applyLedStyle(el, state) {
    if (!el) return;
    switch (state) {
      case "off":
        el.style.fill = "#888";
        el.style.stroke = "#888";
        el.style.opacity = "0.75";
        el.style.filter = "none";
        break;
      case "green":
        el.style.fill = "#00ff44";
        el.style.stroke = "#00ff44";
        el.style.opacity = "1";
        el.style.filter =
          "drop-shadow(0 0 6px #00ff44) drop-shadow(0 0 3px #00cc33)";
        break;
      case "orange":
        // bit = 0 → brief orange blink, clearly different from green (bit = 1)
        el.style.fill = "#ff8800";
        el.style.stroke = "#ff8800";
        el.style.opacity = "1";
        el.style.filter =
          "drop-shadow(0 0 6px #ff6600) drop-shadow(0 0 3px #cc4400)";
        break;
      case "red":
        el.style.fill = "#ff2200";
        el.style.stroke = "#ff2200";
        el.style.opacity = "1";
        el.style.filter =
          "drop-shadow(0 0 6px #ff2200) drop-shadow(0 0 3px #cc1100)";
        break;
    }
  }

  _setLed(index, state) {
    if (!this._ledEls || !this._ledEls[index]) return;
    this._applyLedStyle(this._ledEls[index], state);
  }

  _resetAllLeds() {
    for (let i = 0; i < 13; i++) this._setLed(i, "off");
  }

  // ── Animation ───────────────────────────────────────────────────────────────

  _cancelAnimation() {
    this._timerEvents.forEach((ev) => {
      try {
        ev.remove(false);
      } catch (_) {}
    });
    this._timerEvents = [];
  }

  _startAnimation() {
    this._cancelAnimation();
    this._resetAllLeds();

    // LEDs 7-12 are green decoration — always lit, never change
    for (let i = 7; i <= 12; i++) this._setLed(i, "green");

    const WORD = "NIGHT";
    const BINARY = {
      N: "01001110",
      I: "01001001",
      G: "01000111",
      H: "01001000",
      T: "01010100",
    };

    // Timing (ms)
    const T_BIT = 400; // how long the active LED stays lit for one bit
    const GAP_BIT = 220; // dark gap between consecutive bit flashes
    const GAP_AFTER = 500; // pause after last bit before letter counter lights up
    const LETTER_HOLD = 850; // pause after letter counter LED lights up
    const LOOP_PAUSE = 3500; // pause at end of word before restart

    const events = [];
    let t = 500;

    const sched = (absT, fn) => events.push(this.time.delayedCall(absT, fn));

    for (let li = 0; li < WORD.length; li++) {
      const bits = BINARY[WORD[li]];
      const capLi = li;

      // For each bit: LED index 5 (leftmost binary LED) blinks for bit=0
      //               LED index 6 (second binary LED)  blinks for bit=1
      // The other 6 binary LEDs (7-12) stay green as decoration
      for (let bi = 0; bi < 8; bi++) {
        if (bi > 0) t += GAP_BIT;

        const bit = parseInt(bits[bi]);
        const ledIdx = bit === 0 ? 5 : 6;

        sched(t, () => this._setLed(ledIdx, "green"));
        t += T_BIT;
        sched(t, () => this._setLed(ledIdx, "off"));
      }

      // Letter counter lights up RED from LEFT to RIGHT
      // N(li=0)→idx0, I(li=1)→idx1, G(li=2)→idx2, H(li=3)→idx3, T(li=4)→idx4
      t += GAP_AFTER;
      const counterIdx = capLi;
      sched(t, () => this._setLed(counterIdx, "red"));
      t += LETTER_HOLD;
    }

    t += LOOP_PAUSE;
    sched(t, () => this._startAnimation());

    this._timerEvents = events;
  }

  // ── Transition & Shutdown ────────────────────────────────────────────────────

  transitionToLevel(levelKey, skipFade = false) {
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (!this.isSolved && window.playSuccess) window.playSuccess(this);
    this.isSolved = true;

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const overlay = this.add
      .rectangle(0, 0, W, H, 0x000000)
      .setOrigin(0, 0)
      .setDepth(200)
      .setAlpha(0);
    const idx = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const label = this.add
      .text(W / 2, H / 2, "Level " + (idx + 1) + "...", {
        fontFamily: "monospace",
        fontSize: "42px",
        color: "#00ff44",
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setAlpha(0);
    this.tweens.add({
      targets: [overlay, label],
      alpha: 1,
      duration: 1000,
      onComplete: () => this.scene.start(levelKey, { skipFade: false }),
    });
  }

  shutdown() {
    this._cancelAnimation();
    this._destroySVG();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
