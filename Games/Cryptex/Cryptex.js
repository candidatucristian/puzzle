// ─────────────────────────────────────────────────────────────────────────────
// Level — "CIPHER WHEEL"  ·  code: ROTOR  ·  very hard  ·  decipher
//
// A quiet, candle-lit wall. Mounted on it: a brass cipher wheel — a fixed
// outer alphabet and a rotating inner disk, turning with the slow click of a
// clock. On the desk: a sealed envelope holding a letter enciphered with a
// Caesar shift of 3. Extinguishing the candle takes three clicks,
// providing the hint to the shift.
//
//   "HYHUB FLSKHU PDFKLQH / JXDUGV LWV VSLQQLQJ KHDUW / WKH URWRU"
//    →  EVERY CIPHER MACHINE GUARDS ITS SPINNING HEART — THE ROTOR
//
// Align the wheel, decode the message, and the word reveals itself: ROTOR.
//
// Interactions: drag the inner disk to turn it (it snaps letter by letter,
// like winding a clock), or scroll over the wheel. Click the parchment to
// read it. The wheel is a tool — the answer is typed into the code box.
//
// The wheel's letters are painted in luminous ink: while the candle burns
// they can't be seen and the disk is locked. Put out the candle and the
// letters light up one by one around the rings; only then does the disk turn.
//
// The candle is a CSS-art candle (DOM overlay, same pattern as the Modem/TV
// levels). Each click is a breath: the flame bends away from the click,
// nearly dies, and recovers smaller. The third breath tears the flame off,
// leaves a glowing ember on the wick and a curling thread of smoke. The
// candlelight on the wall and desk flickers with the flame and dims with it.
// ─────────────────────────────────────────────────────────────────────────────

// both rings read A→Z clockwise (left to right across the top); the cipher
// is unchanged, so the answer is still ROTOR
const CRYPTEX_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CX_SKETCH = 0xd8d2c4; // the pencil itself
const CRYPTEX_CIPHER = [
  "HYHUB FLSKHU PDFKLQH",
  "JXDUGV LWV VSLQQLQJ KHDUW",
  "WKH URWRU",
];

// markup of the CSS candle — the flame is built from layers, like a real one:
// orange body, white core, dark zone around the wick and a blue base
const CRYPTEX_CANDLE_HTML =
  '<div class="holder">' +
  '<div class="candle"><div class="candle-pool"></div></div>' +
  '<div class="wick"><div class="wick-ember"></div></div>' +
  '<div class="candle-halo"><i></i></div>' +
  '<div class="candle-light"><div class="candle-size"><div class="flame-body">' +
  '<div class="flame-outer"></div>' +
  '<div class="flame-core"></div>' +
  '<div class="flame-dark"></div>' +
  '<div class="flame-blue"></div>' +
  "</div></div></div>" +
  '<div class="candle-smoke"></div>' +
  '<button type="button" class="candle-action" aria-label="Put out the candle"></button></div>';

class CryptexScene extends Phaser.Scene {
  constructor() {
    super({ key: "Cryptex" });
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
    this._candleClicks = 0;
    // the candlelight level on the wall/desk (tweened, flickered in update)
    this._candleFx = { level: 1, gustUntil: 0 };
    this._wheelAngle = 0; // degrees; 0 = A over A
    this._overlayOpen = false;
    this._draggingWheel = false;
    this._lettersShown = false; // the letters appear only in the dark

    this._build(this.cameras.main.width, this.cameras.main.height);

    // ── wheel input: drag to turn, ticking letter by letter ──
    this.input.on("pointerdown", (p) => {
      if (this._overlayOpen || !this._wheel) return;
      const { cx, cy, R } = this._wheel;
      if (Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > R * 0.78) return;
      if (!this._lettersShown) {
        this._jiggleLockedWheel();
        return;
      }
      this._draggingWheel = true;
      this._lastPointerDeg = Phaser.Math.RadToDeg(
        Math.atan2(p.y - cy, p.x - cx),
      );
    });

    this.input.on("pointermove", (p) => {
      if (!this._draggingWheel || !p.isDown || !this._wheel) return;
      const { cx, cy } = this._wheel;
      const deg = Phaser.Math.RadToDeg(Math.atan2(p.y - cy, p.x - cx));
      const delta = Phaser.Math.Angle.ShortestBetween(
        this._lastPointerDeg,
        deg,
      );
      this._lastPointerDeg = deg;
      this._setWheelAngle(this._wheelAngle + delta);
    });

    this.input.on("pointerup", () => {
      if (!this._draggingWheel) return;
      this._draggingWheel = false;
      this._snapWheel();
    });

    this.input.on("wheel", (p, objs, dx, dy) => {
      if (this._overlayOpen || !this._wheel) return;
      const { cx, cy, R } = this._wheel;
      if (Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > R * 1.1) return;
      if (!this._lettersShown) {
        this._jiggleLockedWheel();
        return;
      }
      this._stepWheel(dy > 0 ? 1 : -1);
    });

    // kept as a reference so shutdown() can remove it (otherwise every
    // restart of the level would add one more listener)
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.events.on("canvas_resized", this._onResize);

    this.events.once("shutdown", () => this._removeCandleDom());

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // the candlelight on the wall and desk trembles with the flame
  update(time) {
    this._tickCandleLights(time);
  }

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

  _sketchSeg(rnd, x1, y1, x2, y2, mag) {
    const pts = [{ x: x1, y: y1 }];
    const steps = 3;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const off = (rnd() - 0.5) * 2 * mag;
      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  _drawPath(g, pts, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < pts.length - 1; i++) {
      g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
  }

  _pencilSeg(g, rnd, x1, y1, x2, y2, width, color, alpha, mag = 2) {
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1, y1, x2, y2, mag),
      width,
      color,
      alpha,
    );
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1 + 1.2, y1 + 1, x2 + 1.2, y2 + 1, mag),
      width * 0.6,
      color,
      alpha * 0.35,
    );
  }

  _pencilRect(g, rnd, x, y, w, h, width, color, alpha, mag = 2) {
    const o = 4; // corner overshoot
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(
      g,
      rnd,
      x + w,
      y - o,
      x + w,
      y + h + o,
      width,
      color,
      alpha,
      mag,
    );
    this._pencilSeg(
      g,
      rnd,
      x + w + o,
      y + h,
      x - o,
      y + h,
      width,
      color,
      alpha,
      mag,
    );
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = 18;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.6;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const deskY = H * 0.78;
    this._deskY = deskY;

    // paper: the dark sketched room — only the candle's warmth is real
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    bg.fillRect(0, 0, W, H);
    // candlelight resting on the right half of the wall (the candle's, not ours)
    const wallLight = this.add.graphics().setDepth(-9.9);
    this._candleWallLight = wallLight;
    wallLight.fillGradientStyle(
      0x000000,
      0x46290e,
      0x000000,
      0x341e08,
      0,
      0.12,
      0,
      0.08,
    );
    wallLight.setPosition(W * 0.86, deskY * 0.6);
    wallLight.fillRect(-W * 0.36, -deskY * 0.6, W * 0.5, deskY);

    const rnd = this._rng(8228);
    // wireframe room: corner verticals, ceiling hints
    this._pencilSeg(
      bg,
      rnd,
      W * 0.06,
      H * 0.05,
      W * 0.06,
      deskY,
      1,
      CX_SKETCH,
      0.1,
      2.4,
    );
    this._pencilSeg(
      bg,
      rnd,
      W * 0.94,
      H * 0.05,
      W * 0.94,
      deskY,
      1,
      CX_SKETCH,
      0.1,
      2.4,
    );
    this._pencilSeg(
      bg,
      rnd,
      0,
      H * 0.03,
      W * 0.06,
      H * 0.05,
      1,
      CX_SKETCH,
      0.08,
      2,
    );
    this._pencilSeg(
      bg,
      rnd,
      W,
      H * 0.03,
      W * 0.94,
      H * 0.05,
      1,
      CX_SKETCH,
      0.08,
      2,
    );
    // stray construction scribbles on the wall
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = rnd() * deskY * 0.5;
      this._pencilSeg(
        bg,
        rnd,
        x,
        y,
        x + 14 + rnd() * 30,
        y + (rnd() - 0.5) * 10,
        1,
        CX_SKETCH,
        0.04,
        1.6,
      );
    }
    // the desk: a hand-ruled edge, hatch lines below
    this._pencilSeg(bg, rnd, 0, deskY, W, deskY, 1.4, CX_SKETCH, 0.22, 2);
    this._pencilSeg(bg, rnd, 0, deskY + 5, W, deskY + 5, 1, CX_SKETCH, 0.1, 2);
    for (let i = 0; i < 3; i++) {
      const y = deskY + 24 + i * ((H - deskY) / 3.8);
      this._pencilSeg(
        bg,
        rnd,
        W * 0.04,
        y,
        W * 0.96,
        y + (rnd() - 0.5) * 6,
        1,
        CX_SKETCH,
        0.05,
        2.4,
      );
    }
    // the candle's pool of light on the desk — unchanged, it belongs to it
    const desk = this.add.graphics().setDepth(-8);
    this._candleDeskLight = desk;
    desk.setPosition(W * 0.86, deskY + (H - deskY) * 0.3);
    for (let i = 4; i >= 1; i--) {
      desk.fillStyle(0xffb45e, 0.03);
      desk.fillEllipse(0, 0, W * 0.1 * i, (H - deskY) * 0.4 * (i / 2.5));
    }

    this._buildCandleDom(W, H, deskY);
    // instant: after a resize the light jumps straight to the right level
    this._updateCandleLight(true);
    this._buildTexts(W, H);
    this._buildWheel(W, H);
    this._buildParchment(W, H, deskY);

    // vignette
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.26;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.85,
      0.85,
      0,
      0,
    );
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0,
      0.85,
      0.85,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.7,
      0,
      0.7,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.55,
      0,
      0.55,
    );
    vg.fillRect(W - v, 0, v, H);
  }

  _buildTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 46, "Put out the light!", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.subText = this.add
      .text(W / 2, 74, "turn the wheel · read the letter", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);
    this.levelText = this.add
      .text(
        W - 30,
        30,
        "Level " +
          (window.GAME_LEVELS.findIndex((l) => l.key === this.scene.key) + 1),
        {
          fontFamily: '"Special Elite", monospace',
          fontSize: "28px",
          color: "#e8dcc0",
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── the CSS-art candle, as a DOM overlay ───────────────────────────────────

  _buildCandleDom(W, H, deskY) {
    this._removeCandleDom();
    const container = document.getElementById("game-container");
    if (!container) return;

    const s = Phaser.Math.Clamp((H * 0.4) / 400, 0.3, 0.8);
    const cx = W * 0.86;
    const bottomY = deskY + (H - deskY) * 0.3;

    const el = document.createElement("div");
    el.className = "scene-dom-overlay cryptex-candle";
    el.innerHTML = CRYPTEX_CANDLE_HTML;
    // the 100px-wide .candle sits at the LEFT edge of the 150px .holder,
    // so its visual center is at 50px — align that with the dish at cx
    el.style.left = cx - 50 * s + "px";
    el.style.top = bottomY - 400 * s + "px";
    el.style.transform = "scale(" + s + ")";
    el.style.transformOrigin = "top left";
    container.appendChild(el);
    this._candleDom = el;
    el.querySelector(".candle-action").addEventListener("click", (event) => {
      event.stopPropagation();
      this._dimCandle(event);
    });

    const g = this.add.graphics().setDepth(-7);
    g.fillStyle(0x000000, 0.5);
    g.fillEllipse(cx, bottomY + 4, 130 * s, 26 * s);
    g.fillStyle(0x3a2a10, 1);
    g.fillEllipse(cx, bottomY + 2, 124 * s, 20 * s);
    g.fillStyle(0x8a6a30, 0.9);
    g.fillEllipse(cx, bottomY - 1, 118 * s, 17 * s);
    g.fillStyle(0x54390f, 1);
    g.fillEllipse(cx, bottomY - 3, 104 * s, 13 * s);
  }

  // one click = one breath on the candle
  _dimCandle(event) {
    if (this._overlayOpen || this.isSolved || this._candleClicks >= 3) return;
    this._candleClicks++;
    if (window.playClick) window.playClick(this);
    this._updateCandleLight();
    this._playCandleGust(event);
    // once the flame and its light are gone, the luminous letters show up
    if (this._candleClicks >= 3) {
      this.time.delayedCall(900, () => this._revealLetters());
    }
  }

  // flame size, button state and room light for the current number of clicks
  _updateCandleLight(instant = false) {
    const strength = (3 - this._candleClicks) / 3;
    const dom = this._candleDom;
    if (dom) {
      dom.style.setProperty("--candle-strength", strength);
      dom.classList.toggle("is-out", strength === 0);
      const btn = dom.querySelector(".candle-action");
      if (btn) btn.disabled = strength === 0;
    }
    this._setCandleLightLevel(strength, instant);
  }

  // The breath: the flame bends away from the click, stretches thin, nearly
  // dies, then recovers smaller with a springy sway. The third breath tears
  // the flame off, leaves an ember on the wick and a thread of smoke.
  _playCandleGust(event) {
    const dom = this._candleDom;
    if (!dom) return;
    const clicks = this._candleClicks;
    const strength = (3 - clicks) / 3;
    const out = strength === 0;
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // the breath comes from the side you clicked on
    let dir = Math.random() < 0.5 ? -1 : 1;
    const wick = dom.querySelector(".wick");
    if (event && typeof event.clientX === "number" && wick) {
      const r = wick.getBoundingClientRect();
      dir = event.clientX < r.left + r.width / 2 ? 1 : -1;
    }

    const D = out ? 1000 : 1350;
    this._dipCandleLights(strength, out, reduce, D);

    if (reduce) {
      if (out) this._candleEmber(dom);
      return;
    }

    // no new breath while the flame is still fighting the last one
    const btn = dom.querySelector(".candle-action");
    if (btn && !out) {
      btn.disabled = true;
      setTimeout(() => {
        if (btn.isConnected) btn.disabled = (3 - this._candleClicks) / 3 === 0;
      }, D * 0.7);
    }

    const k = clicks <= 1 ? 0.85 : clicks === 2 ? 1 : 1.12; // each breath stronger
    const low = clicks <= 1 ? 0.42 : 0.28; // how small it gets mid-breath
    const R = (deg) => `${(deg * dir * k).toFixed(1)}deg`;

    const light = dom.querySelector(".candle-light");
    const halo = dom.querySelector(".candle-halo i");
    if (!light || !light.animate) return;
    if (light.getAnimations) light.getAnimations().forEach((a) => a.cancel());

    if (!out) {
      light.animate(
        [
          {
            offset: 0,
            transform: "rotate(0deg) scale(1, 1)",
            opacity: 1,
            easing: "cubic-bezier(.2,.7,.3,1)",
          },
          {
            offset: 0.07,
            transform: `rotate(${R(40)}) scale(0.8, 1.25)`,
            opacity: 0.95,
          },
          {
            offset: 0.15,
            transform: `rotate(${R(68)}) scale(0.55, 1.45)`,
            opacity: 0.85,
          },
          {
            offset: 0.22,
            transform: `rotate(${R(55)}) scale(0.62, 1.12)`,
            opacity: 0.9,
          },
          {
            offset: 0.3,
            transform: `rotate(${R(74)}) scale(${low + 0.1}, ${low + 0.3})`,
            opacity: 0.7,
          },
          {
            offset: 0.38,
            transform: `rotate(${R(60)}) scale(${low}, ${low})`,
            opacity: 0.55,
          },
          {
            offset: 0.44,
            transform: `rotate(${R(35)}) scale(${low * 0.9}, ${low * 1.2})`,
            opacity: 0.6,
          },
          {
            offset: 0.5,
            transform: `rotate(${R(12)}) scale(${low + 0.05}, ${low + 0.15})`,
            opacity: 0.65,
            easing: "cubic-bezier(.3,0,.2,1)",
          },
          {
            offset: 0.62,
            transform: `rotate(${R(-14)}) scale(0.78, 0.9)`,
            opacity: 0.9,
          },
          {
            offset: 0.73,
            transform: `rotate(${R(9)}) scale(0.96, 1.12)`,
            opacity: 1,
          },
          { offset: 0.84, transform: `rotate(${R(-4)}) scale(1.02, 0.96)` },
          { offset: 0.93, transform: `rotate(${R(1.5)}) scale(1, 1.02)` },
          { offset: 1, transform: "rotate(0deg) scale(1, 1)", opacity: 1 },
        ],
        { duration: D },
      );
      if (halo)
        halo.animate(
          [
            { opacity: 1 },
            { opacity: 0.55, offset: 0.15 },
            { opacity: 0.3, offset: 0.38 },
            { opacity: 0.45, offset: 0.5 },
            { opacity: 0.95, offset: 0.7 },
            { opacity: 1 },
          ],
          { duration: D },
        );
      return;
    }

    // ── the third breath: the flame goes out ──
    light.animate(
      [
        {
          offset: 0,
          transform: "rotate(0deg) scale(1, 1)",
          opacity: 1,
          easing: "cubic-bezier(.2,.7,.3,1)",
        },
        {
          offset: 0.1,
          transform: `rotate(${R(45)}) scale(0.75, 1.3)`,
          opacity: 0.95,
        },
        {
          offset: 0.2,
          transform: `rotate(${R(75)}) scale(0.5, 1.5)`,
          opacity: 0.8,
        },
        {
          offset: 0.3,
          transform: `rotate(${R(70)}) scale(0.35, 0.6)`,
          opacity: 0.6,
        },
        {
          offset: 0.4,
          transform: `rotate(${R(40)}) scale(0.22, 0.28)`,
          opacity: 0.55,
        },
        {
          offset: 0.47,
          transform: `rotate(${R(15)}) scale(0.25, 0.3)`,
          opacity: 0.5,
        },
        {
          offset: 0.58,
          transform: `rotate(${R(5)}) scale(0.08, 0.1)`,
          opacity: 0.2,
        },
        { offset: 1, transform: "rotate(0deg) scale(0, 0)", opacity: 0 },
      ],
      { duration: D },
    );
    if (halo)
      halo.animate(
        [
          { opacity: 1 },
          { opacity: 0.5, offset: 0.2 },
          { opacity: 0.2, offset: 0.45 },
          { opacity: 0, offset: 0.6 },
          { opacity: 0 },
        ],
        { duration: D },
      );

    this._candleGhost(dom, dir);
    setTimeout(() => this._candleEmber(dom), 430);
    setTimeout(() => this._candleSmoke(dom, dir), 480);
  }

  // the tip of the flame, torn off by the breath, drifts away and vanishes
  _candleGhost(dom, dir) {
    const holder = dom.querySelector(".holder");
    if (!holder) return;
    const f = 0.6; // flame size before the last breath
    const ghost = document.createElement("div");
    ghost.className = "flame-ghost";
    ghost.innerHTML = '<div class="flame-outer"></div>';
    holder.appendChild(ghost);
    const anim = ghost.animate(
      [
        {
          transform: `rotate(${75 * dir}deg) scale(${0.5 * f}, ${1.5 * f})`,
          opacity: 0,
        },
        {
          transform: `rotate(${80 * dir}deg) scale(${0.5 * f}, ${1.4 * f})`,
          opacity: 0.75,
          offset: 0.12,
        },
        {
          transform: `translate(${dir * 38}px, -46px) rotate(${95 * dir}deg) scale(${0.32 * f}, ${0.8 * f})`,
          opacity: 0.45,
          offset: 0.55,
        },
        {
          transform: `translate(${dir * 60}px, -78px) rotate(${110 * dir}deg) scale(${0.12 * f}, ${0.3 * f})`,
          opacity: 0,
        },
      ],
      {
        duration: 650,
        delay: 190,
        easing: "cubic-bezier(.25,.6,.4,1)",
        fill: "backwards",
      },
    );
    anim.onfinish = () => ghost.remove();
  }

  // the ember on the wick: flares, flickers once more, cools down
  _candleEmber(dom) {
    const ember = dom.querySelector(".wick-ember");
    if (!ember || !ember.isConnected) return;
    ember.animate(
      [
        { opacity: 0, transform: "scale(0.6)" },
        { opacity: 1, transform: "scale(1.15)", offset: 0.06 },
        { opacity: 0.8, transform: "scale(1)", offset: 0.22 },
        { opacity: 0.95, transform: "scale(1.05)", offset: 0.3 },
        { opacity: 0.6, transform: "scale(0.9)", offset: 0.55 },
        { opacity: 0.25, transform: "scale(0.75)", offset: 0.8 },
        { opacity: 0, transform: "scale(0.6)" },
      ],
      { duration: 3400, easing: "ease-out" },
    );
  }

  // A thread of smoke: small overlapping wisps rising on the same wave, so
  // together they read as one ribbon curling upward. Pushed sideways by the
  // breath at first, then rising straight and thinning out.
  _candleSmoke(dom, dir) {
    const box = dom.querySelector(".candle-smoke");
    if (!box || !box.isConnected) return;
    const start = performance.now();
    const LIFE = 3200;
    const spawn = () => {
      if (!box.isConnected) return;
      const age = performance.now() - start;
      if (age > LIFE) return;
      const fresh = 1 - age / LIFE; // the smoke thins out over time
      const phase = age * 0.0045; // shared wave → a ribbon
      const haze = Math.random() < 0.18;
      const w = document.createElement(haze ? "b" : "i");
      if (!haze && Math.random() < 0.5) w.className = "r";
      box.appendChild(w);

      const drift = dir * (18 + 30 * fresh);
      const sway = (s) => Math.sin(phase + s) * (8 + 10 * (1 - fresh));
      const op = (0.35 + 0.35 * fresh) * (haze ? 0.8 : 1);
      const rot = () => ((Math.random() - 0.5) * 50).toFixed(1);
      const anim = w.animate(
        [
          {
            transform: `translate(0px, 0px) rotate(${rot()}deg) scale(0.3, 0.45)`,
            opacity: op * 0.5,
          },
          {
            transform: `translate(${(drift * 0.12 + sway(0)).toFixed(1)}px, -16px) rotate(${rot()}deg) scale(0.7, 0.85)`,
            opacity: op,
            offset: 0.12,
          },
          {
            transform: `translate(${(drift * 0.55 + sway(1.4)).toFixed(1)}px, -80px) rotate(${rot()}deg) scale(1.4, 1.3)`,
            opacity: op * 0.6,
            offset: 0.48,
          },
          {
            transform: `translate(${(drift + sway(2.8)).toFixed(1)}px, -150px) rotate(${rot()}deg) scale(2.3, 1.8)`,
            opacity: 0,
          },
        ],
        {
          duration: 2400 + Math.random() * 900,
          easing: "cubic-bezier(.3,.55,.4,1)",
        },
      );
      anim.onfinish = () => w.remove();
      setTimeout(spawn, age < 700 ? 55 : 90 + 120 * (1 - fresh));
    };
    spawn();
  }

  // ── the candlelight on the wall and desk ──
  // one light "level", tweened smoothly; update() adds a small flicker on top

  _setCandleLightLevel(strength, instant = false) {
    const fx = this._candleFx;
    if (!fx) return;
    if (instant) {
      this.tweens.killTweensOf(fx);
      fx.level = strength;
      fx.gustUntil = 0;
      return;
    }
    // during a breath, the breath decides how the light comes back
    if (this.time.now < fx.gustUntil) return;
    this.tweens.killTweensOf(fx);
    this.tweens.add({
      targets: fx,
      level: strength,
      duration: 700,
      ease: "Sine.easeInOut",
    });
  }

  _tickCandleLights(time) {
    const fx = this._candleFx;
    if (!fx) return;
    const t = time / 1000;
    const flick =
      1 +
      0.045 * Math.sin(t * 5.3) +
      0.03 * Math.sin(t * 11.7 + 1.3) +
      0.02 * Math.sin(t * 23.1 + 0.4);
    const a = Math.max(0, Math.min(1, fx.level * flick));
    const s = Math.max(0, fx.level * (1 + (flick - 1) * 0.35));
    for (const light of [this._candleWallLight, this._candleDeskLight]) {
      if (light) light.setAlpha(a).setScale(s);
    }
  }

  // the light drops with the breath, trembles, then returns (or dies)
  _dipCandleLights(target, out, reduce, D) {
    const fx = this._candleFx;
    if (!fx) return;
    this.tweens.killTweensOf(fx);
    fx.gustUntil = this.time.now + D;
    if (reduce) {
      this.tweens.add({ targets: fx, level: target, duration: 600 });
      return;
    }
    const from = fx.level;
    const steps = out
      ? [
          [from * 0.55, 90],
          [from * 0.3, 160],
          [from * 0.42, 110],
          [from * 0.12, 180],
          [0, 350],
        ]
      : [
          [from * 0.55, 90],
          [from * 0.3, 190],
          [from * 0.4, 120],
          [from * 0.22, 150],
          [target * 0.9, 260],
          [target * 1.05, 200],
          [target, 250],
        ];
    const next = (i) => {
      if (i >= steps.length || this._candleFx !== fx) return;
      const [level, duration] = steps[i];
      this.tweens.add({
        targets: fx,
        level,
        duration,
        ease: "Sine.easeInOut",
        onComplete: () => next(i + 1),
      });
    };
    next(0);
  }

  _removeCandleDom() {
    if (this._candleDom && this._candleDom.parentNode) {
      this._candleDom.parentNode.removeChild(this._candleDom);
    }
    this._candleDom = null;
  }

  // ── the cipher wheel ───────────────────────────────────────────────────────

  _buildWheel(W, H) {
    const R = Phaser.Math.Clamp(Math.min(W, H) * 0.3, 120, 220);
    const cx = W * 0.44;
    const cy = H * 0.46;
    this._wheel = { cx, cy, R };
    this._step = 360 / 26;

    // ── fixed outer ring, hand-drawn ──
    const outer = this.add.graphics().setDepth(3);
    const rnd = this._rng(4114);
    // dark backing so the wall never shows through the instrument
    outer.fillStyle(0x101216, 0.97).fillCircle(cx, cy, R * 1.06);
    outer.fillStyle(CX_SKETCH, 0.03).fillCircle(cx, cy, R * 1.06);
    // doubled sketched rim + the groove separating ring from disk
    this._pencilCircle(outer, rnd, cx, cy, R * 1.05, 1.8, CX_SKETCH, 0.55);
    this._pencilCircle(outer, rnd, cx, cy, R * 1.0, 1, CX_SKETCH, 0.22);
    this._pencilCircle(outer, rnd, cx, cy, R * 0.77, 1.4, CX_SKETCH, 0.4);
    // tick marks, one per letter
    for (let i = 0; i < 26; i++) {
      const a = Phaser.Math.DegToRad(i * this._step - 90);
      this._pencilSeg(
        outer,
        rnd,
        cx + Math.cos(a) * R * 0.785,
        cy + Math.sin(a) * R * 0.785,
        cx + Math.cos(a) * R * 0.815,
        cy + Math.sin(a) * R * 0.815,
        1,
        CX_SKETCH,
        0.35,
        0.4,
      );
    }

    // every letter on both rings; hidden until the candle is out
    this._letters = [];
    const addLetter = (obj, alpha, ring, i) => {
      this._letters.push({ obj, alpha, ring, i });
      obj.setAlpha(this._lettersShown ? alpha : 0);
      return obj;
    };

    // outer letters — written in, fixed (a faint ghost stroke behind each)
    const outSize = Math.max(13, Math.round(R * 0.1));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const lx = cx + Math.cos(a) * R * 0.885;
      const ly = cy + Math.sin(a) * R * 0.885;
      const ghost = this.add
        .text(lx + 1.2, ly + 1, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: outSize + "px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setDepth(4);
      addLetter(ghost, 0.3, "outer", i);
      const face = this.add
        .text(lx, ly, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: outSize + "px",
          color: "#e8dcc0",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setShadow(0, 0, "rgba(240, 226, 186, 0.55)", 6, false, true)
        .setDepth(4);
      addLetter(face, 1, "outer", i);
    }

    // fixed reference pointer at 12 o'clock — a pencilled arrowhead
    const ptr = this.add.graphics().setDepth(6);
    const rndP = this._rng(6336);
    ptr.fillStyle(CX_SKETCH, 0.22);
    ptr.fillTriangle(
      cx - 7,
      cy - R * 1.05,
      cx + 7,
      cy - R * 1.05,
      cx,
      cy - R * 0.93,
    );
    this._pencilSeg(
      ptr,
      rndP,
      cx - 7,
      cy - R * 1.05,
      cx,
      cy - R * 0.93,
      1.3,
      CX_SKETCH,
      0.6,
      0.6,
    );
    this._pencilSeg(
      ptr,
      rndP,
      cx + 7,
      cy - R * 1.05,
      cx,
      cy - R * 0.93,
      1.3,
      CX_SKETCH,
      0.6,
      0.6,
    );
    this._pencilSeg(
      ptr,
      rndP,
      cx - 7,
      cy - R * 1.05,
      cx + 7,
      cy - R * 1.05,
      1.3,
      CX_SKETCH,
      0.6,
      0.6,
    );

    // ── rotating inner disk, hand-drawn ──
    this._disk = this.add.container(cx, cy).setDepth(5);
    const d = this.add.graphics();
    const rndD = this._rng(5225);
    const diskR = R * 0.745;
    d.fillStyle(0x171a20, 0.97).fillCircle(0, 0, diskR);
    d.fillStyle(CX_SKETCH, 0.045).fillCircle(0, 0, diskR);
    this._pencilCircle(d, rndD, 0, 0, diskR, 1.6, CX_SKETCH, 0.55);
    this._pencilCircle(d, rndD, 0, 0, diskR - 5, 1, CX_SKETCH, 0.18);
    // hub with a pencilled needle pointing at the disk's own "A"
    this._pencilCircle(d, rndD, 0, 0, R * 0.16, 1.3, CX_SKETCH, 0.45);
    this._pencilSeg(d, rndD, 0, -R * 0.14, 0, -R * 0.5, 1.6, CX_SKETCH, 0.6, 1);
    this._pencilSeg(
      d,
      rndD,
      -4,
      -R * 0.44,
      0,
      -R * 0.5,
      1.2,
      CX_SKETCH,
      0.55,
      0.5,
    );
    this._pencilSeg(
      d,
      rndD,
      4,
      -R * 0.44,
      0,
      -R * 0.5,
      1.2,
      CX_SKETCH,
      0.55,
      0.5,
    );
    d.fillStyle(CX_SKETCH, 0.5);
    d.fillCircle(0, 0, 3);
    this._disk.add(d);

    // inner letters — rotate with the disk
    const inSize = Math.max(12, Math.round(R * 0.088));
    for (let i = 0; i < 26; i++) {
      const aDeg = i * this._step - 90;
      const a = Phaser.Math.DegToRad(aDeg);
      const lx = Math.cos(a) * R * 0.63;
      const ly = Math.sin(a) * R * 0.63;
      const ghost = this.add
        .text(lx + 1.2, ly + 1, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: inSize + "px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90));
      addLetter(ghost, 0.3, "inner", i);
      const face = this.add
        .text(lx, ly, CRYPTEX_ALPHA[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: inSize + "px",
          color: "#c9bfa4",
        })
        .setOrigin(0.5)
        .setRotation(Phaser.Math.DegToRad(aDeg + 90))
        .setShadow(0, 0, "rgba(220, 208, 170, 0.5)", 5, false, true);
      addLetter(face, 1, "inner", i);
      this._disk.add(ghost);
      this._disk.add(face);
    }

    this._disk.setAngle(this._wheelAngle);
    this._lastTick = Math.round(this._wheelAngle / this._step);
  }

  // the luminous letters light up one by one, clockwise from the top:
  // first the outer ring, then the inner disk
  _revealLetters() {
    if (this._lettersShown) return;
    this._lettersShown = true;
    for (const L of this._letters || []) {
      const delay = (L.ring === "outer" ? 0 : 520) + L.i * 38;
      L.obj.setScale(1.45).setAlpha(0);
      this.tweens.add({
        targets: L.obj,
        alpha: L.alpha,
        scale: 1,
        delay,
        duration: 460,
        ease: "Back.easeOut",
      });
    }
  }

  // while the candle burns the disk is locked: it only trembles a little,
  // and the instruction pulses to point at the candle
  _jiggleLockedWheel() {
    if (!this._disk || this._jiggling) return;
    this._jiggling = true;
    this.tweens.add({
      targets: this._disk,
      angle: this._wheelAngle + 2.5,
      duration: 55,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this._disk) this._disk.setAngle(this._wheelAngle);
        this._jiggling = false;
      },
    });
    if (this.statusText) {
      this.tweens.add({
        targets: this.statusText,
        scale: 1.1,
        duration: 130,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    }
  }

  _setWheelAngle(deg) {
    this._wheelAngle = deg;
    if (this._disk) this._disk.setAngle(deg);
    // tick like a clock every time a letter passes the pointer
    const tick = Math.round(deg / this._step);
    if (tick !== this._lastTick) {
      this._lastTick = tick;
      if (window.playClick) window.playClick(this);
    }
  }

  _tweenWheelTo(target, onDone) {
    const proxy = { v: this._wheelAngle };
    this.tweens.add({
      targets: proxy,
      v: target,
      duration: 140,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this._wheelAngle = proxy.v;
        if (this._disk) this._disk.setAngle(proxy.v);
      },
      onComplete: () => {
        this._wheelAngle = target;
        if (this._disk) this._disk.setAngle(target);
        if (onDone) onDone();
      },
    });
  }

  _snapWheel() {
    const target = Math.round(this._wheelAngle / this._step) * this._step;
    this._tweenWheelTo(target);
  }

  _stepWheel(dir) {
    const target =
      (Math.round(this._wheelAngle / this._step) + dir) * this._step;
    this._tweenWheelTo(target, () => {
      this._lastTick = Math.round(this._wheelAngle / this._step);
      if (window.playClick) window.playClick(this);
    });
  }

  // ── parchment ──────────────────────────────────────────────────────────────

  _buildParchment(W, H, deskY) {
    const px = W * 0.16;
    const py = deskY + (H - deskY) * 0.46;
    const pw = Math.min(W * 0.2, 165);
    const ph = pw * 0.62; // classic envelope proportions

    // ── a sealed envelope, back side up — sketched in pencil ──
    const p = this.add.container(px, py).setDepth(8).setAngle(-4);
    const g = this.add.graphics();
    const rndE = this._rng(7447);

    // body — dark paper with a graphite tint
    g.fillStyle(0x14171d, 0.95);
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    g.fillStyle(CX_SKETCH, 0.05);
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    this._pencilRect(
      g,
      rndE,
      -pw / 2,
      -ph / 2,
      pw,
      ph,
      1.4,
      CX_SKETCH,
      0.55,
      1.6,
    );

    // side + bottom folds meeting under the flap tip
    const tipY = ph * 0.16;
    this._pencilSeg(
      g,
      rndE,
      -pw / 2 + 2,
      ph / 2 - 2,
      0,
      tipY,
      1,
      CX_SKETCH,
      0.3,
      1,
    );
    this._pencilSeg(
      g,
      rndE,
      pw / 2 - 2,
      ph / 2 - 2,
      0,
      tipY,
      1,
      CX_SKETCH,
      0.3,
      1,
    );

    // the flap edges, drawn a touch harder — the crease that matters
    this._pencilSeg(
      g,
      rndE,
      -pw / 2,
      -ph / 2,
      0,
      tipY,
      1.3,
      CX_SKETCH,
      0.5,
      1.2,
    );
    this._pencilSeg(
      g,
      rndE,
      pw / 2,
      -ph / 2,
      0,
      tipY,
      1.3,
      CX_SKETCH,
      0.5,
      1.2,
    );
    p.add(g);

    // ── the wax seal on the flap tip, without a shift marking ──
    const sr = ph * 0.27;
    const sx = 0,
      sy = tipY;

    const blob = this.add.graphics();
    blob.fillStyle(0x6e150c, 1);
    blob.fillCircle(sx, sy, sr);
    blob.fillCircle(sx - sr * 0.72, sy + sr * 0.34, sr * 0.36);
    blob.fillCircle(sx + sr * 0.76, sy - sr * 0.22, sr * 0.3);
    blob.fillCircle(sx + sr * 0.42, sy + sr * 0.62, sr * 0.32);
    blob.fillStyle(0x8f271a, 1);
    blob.fillCircle(sx - sr * 0.05, sy - sr * 0.08, sr * 0.82);
    // impression ring
    blob.lineStyle(1.5, 0x4a0d06, 0.9);
    blob.strokeCircle(sx, sy, sr * 0.68);
    blob.lineStyle(1, 0xc46a50, 0.35);
    blob.strokeCircle(sx, sy + 1, sr * 0.68);
    // gloss
    blob.fillStyle(0xffffff, 0.16);
    blob.fillEllipse(sx - sr * 0.3, sy - sr * 0.46, sr * 0.52, sr * 0.2);
    p.add(blob);

    p.setSize(pw * 1.05, ph * 1.1);
    p.setInteractive({ cursor: "pointer" });
    p.on("pointerdown", (ptr) => {
      if (ptr.event) ptr.event.stopPropagation();
      this._openOverlay();
    });
    this._parchment = p;

    // ── reading overlay ──
    const ov = this.add.container(0, 0).setDepth(60).setVisible(false);
    const dark = this.add
      .rectangle(0, 0, W, H, 0x05030a, 0.78)
      .setOrigin(0, 0)
      .setInteractive();
    dark.on("pointerdown", () => this._closeOverlay());
    ov.add(dark);

    const bw = Math.min(W * 0.62, 540);
    const bhh = Math.min(H * 0.62, 430);
    const ox = W / 2 - bw / 2;
    const oy = H / 2 - bhh / 2;
    const og = this.add.graphics();
    const rnd = this._rng(909);
    // the unfolded letter: dark paper, doubled pencil frame, fold creases
    og.fillStyle(0x121419, 0.97);
    og.fillRect(ox, oy, bw, bhh);
    og.fillStyle(CX_SKETCH, 0.04);
    og.fillRect(ox, oy, bw, bhh);
    this._pencilRect(og, rnd, ox, oy, bw, bhh, 1.8, CX_SKETCH, 0.55, 2.2);
    this._pencilRect(
      og,
      rnd,
      ox + 8,
      oy + 8,
      bw - 16,
      bhh - 16,
      1,
      CX_SKETCH,
      0.2,
      2,
    );
    // fold creases where the letter was quartered
    this._pencilSeg(
      og,
      rnd,
      ox + bw * 0.5,
      oy + 10,
      ox + bw * 0.5,
      oy + bhh - 10,
      1,
      CX_SKETCH,
      0.12,
      2,
    );
    this._pencilSeg(
      og,
      rnd,
      ox + 10,
      oy + bhh * 0.48,
      ox + bw - 10,
      oy + bhh * 0.48,
      1,
      CX_SKETCH,
      0.12,
      2,
    );
    ov.add(og);

    const fs = Math.max(16, Math.round(Math.min(W, H) * 0.028));
    const cipherText = this.add
      .text(W / 2, oy + bhh * 0.4, CRYPTEX_CIPHER.join("\n"), {
        fontFamily: '"Special Elite", monospace',
        fontSize: fs + "px",
        color: "#d9cfae",
        align: "center",
        lineSpacing: 12,
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    ov.add(cipherText);

    // the same unmarked wax seal
    const sgx = ox + bw - 64;
    const sgy = oy + bhh - 60;
    const sg = this.add.graphics();
    sg.fillStyle(0x6e150c, 1);
    sg.fillCircle(sgx, sgy, 21);
    sg.fillCircle(sgx - 15, sgy + 8, 8);
    sg.fillCircle(sgx + 16, sgy - 6, 6.5);
    sg.fillCircle(sgx + 9, sgy + 14, 7);
    sg.fillStyle(0x8f271a, 1);
    sg.fillCircle(sgx - 1, sgy - 2, 17);
    sg.lineStyle(1.5, 0x4a0d06, 0.9);
    sg.strokeCircle(sgx, sgy, 14);
    sg.lineStyle(1, 0xc46a50, 0.3);
    sg.strokeCircle(sgx, sgy + 1, 14);
    sg.fillStyle(0xffffff, 0.14);
    sg.fillEllipse(sgx - 7, sgy - 9, 11, 4);
    ov.add(sg);

    const closeHint = this.add
      .text(W / 2, oy + bhh - 18, "click anywhere to put it down", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "12px",
        color: "#8f8974",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    ov.add(closeHint);

    this._overlay = ov;
  }

  _openOverlay() {
    if (this._overlayOpen) return;
    this._overlayOpen = true;
    this._draggingWheel = false;
    if (window.playClick) window.playClick(this);
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

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.children.removeAll(true);
    this._removeCandleDom();
    this._overlay = null;
    this._parchment = null;
    this._candleWallLight = null;
    this._candleDeskLight = null;
    this._wheel = null;
    this._disk = null;
    this._letters = [];
    this._jiggling = false;
    this._overlayOpen = false;
    this._draggingWheel = false;
  }

  transitionToLevel(levelKey, skipFade = false) {
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
    if (this._onResize) this.events.off("canvas_resized", this._onResize);
    this._onResize = null;
    this._removeCandleDom();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._candleFx = null;
  }
}
