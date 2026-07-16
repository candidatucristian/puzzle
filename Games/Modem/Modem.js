class ModemScene extends Phaser.Scene {
  constructor() {
    super({ key: "Modem" });
  }

  init(data) {
    this.skipFadeIn =
      data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
    this.load.audio("hardware", "assets/sounds/Modem/hardwaresound.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    this.isSolved = false;
    this._timerEvents = [];
    this._ledDots = null;

    // Dark background only
    this._bgGfx = this.add.graphics().setDepth(0);
    this._drawBg(this.cameras.main.width, this.cameras.main.height);

    this._buildScene(this.cameras.main.width, this.cameras.main.height);
    this._startAnimation();
    this._startHardwareHum();

    this.events.on("canvas_resized", ({ width, height }) => {
      this._drawBg(width, height);
      this._cancelAnimation();
      this._destroyRouter();
      this._buildScene(width, height);
      this._startAnimation();
    });
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

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
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, mag), width, color, alpha);
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
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = 12;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.2;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── Background: dark air, full of signals ───────────────────────────────────
  // No room, no furniture — just the transmission itself: radio pulses
  // rippling out of the antennas, stray binary drifting through the dark,
  // a live waveform trembling low across the floor, and short packet blips.
  // Rebuilt cleanly on every resize.

  _drawBg(W, H) {
    const g = this._bgGfx;
    g.clear();

    // clear everything from the previous build (rings, digits, texts)
    if (this._roomObjs) {
      for (const o of this._roomObjs) {
        this.tweens.killTweensOf(o);
        o.destroy();
      }
    }
    this._roomObjs = [];
    if (this._ambientTimers) {
      for (const t of this._ambientTimers) t.remove(false);
    }
    this._ambientTimers = [];

    // deep signal-black
    g.fillGradientStyle(0x07090c, 0x090b10, 0x030405, 0x040506, 1);
    g.fillRect(0, 0, W, H);

    // vignette
    const v = Math.min(W, H) * 0.2;
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    g.fillRect(0, 0, W, v);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    g.fillRect(0, H - v, W, v);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0, 0.45, 0);
    g.fillRect(0, 0, v, H);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.45, 0, 0.45);
    g.fillRect(W - v, 0, v, H);

    // the live waveform, redrawn every frame in update()
    if (this._waveGfx) this._waveGfx.destroy();
    this._waveGfx = this.add.graphics().setDepth(1);
    this._waveGeom = { W, H };

    // the line idles almost flat, then a burst of chatter shakes it
    this._burst = { level: 0 };
    this._ambientTimers.push(
      this.time.addEvent({
        delay: 900,
        loop: true,
        callback: () => {
          if (this._burst.level < 0.05 && Math.random() < 0.28) {
            this.tweens.add({
              targets: this._burst,
              level: 1,
              duration: 130,
              ease: "Quad.easeIn",
              onComplete: () => {
                this.tweens.add({
                  targets: this._burst,
                  level: 0,
                  duration: 850,
                  ease: "Quad.easeOut",
                });
              },
            });
          }
        },
      }),
    );

    // antenna tips (same maths as _drawRouter) — where the pulses are born
    const dW = Math.min(W * 0.78, 520);
    const dH = dW * (224.68 / 300);
    const ry = (H - dH) / 2 - H * 0.04;
    this._tips = [
      { x: W / 2 - dW * 0.24, y: ry + dH * 0.14 },
      { x: W / 2, y: ry + dH * 0.2 },
      { x: W / 2 + dW * 0.24, y: ry + dH * 0.14 },
    ];

    // rhythm of the transmission: pulses, blips, drifting binary
    this._ambientTimers.push(
      this.time.addEvent({
        delay: 1400,
        loop: true,
        callback: () => this._spawnRing(),
      }),
    );
    this._spawnRing();

    this._ambientTimers.push(
      this.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => {
          if (Math.random() < 0.65) this._spawnBlip(W, H);
        },
      }),
    );

    for (let i = 0; i < 26; i++) this._spawnDigit(W, H);

    // texts, matching the other chambers
    const status = this.add
      .text(W / 2, 40, "It never stopped transmitting.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this._roomObjs.push(status);

    const lvl = this.add
      .text(W - 30, 28, "Level 6", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: lvl, alpha: 1, duration: 2000 });
    this._roomObjs.push(lvl);
  }

  // a radio pulse rippling out of a random antenna — hair-thin: the radius
  // is tweened (not the scale), so the stroke never fattens as it grows
  _spawnRing() {
    if (!this._tips) return;
    const t = this._tips[Math.floor(Math.random() * this._tips.length)];
    const ring = this.add
      .circle(t.x, t.y, 10)
      .setStrokeStyle(0.6, 0xd8e8dc, 0.24)
      .setDepth(1);
    this._roomObjs.push(ring);
    this.tweens.add({
      targets: ring,
      radius: 55 + Math.random() * 32,
      alpha: 0,
      duration: 2400 + Math.random() * 800,
      ease: "Quad.easeOut",
      onComplete: () => {
        const i = this._roomObjs.indexOf(ring);
        if (i >= 0) this._roomObjs.splice(i, 1);
        ring.destroy();
      },
    });
  }

  // stray binary, drifting up through the dark and dissolving
  _spawnDigit(W, H) {
    const digit = this.add
      .text(
        Math.random() * W,
        H * 0.08 + Math.random() * H * 0.8,
        Math.random() < 0.5 ? "0" : "1",
        {
          fontFamily: "monospace",
          fontSize: Math.round(10 + Math.random() * 8) + "px",
          color: "#7fae8c",
        },
      )
      .setAlpha(0.05 + Math.random() * 0.11)
      .setDepth(1);
    this._roomObjs.push(digit);
    this.tweens.add({
      targets: digit,
      y: digit.y - (40 + Math.random() * 70),
      alpha: 0,
      duration: 7000 + Math.random() * 9000,
      delay: Math.random() * 4000,
      repeat: -1,
      onRepeat: () => {
        digit.x = Math.random() * W;
        digit.y = H * 0.08 + Math.random() * H * 0.8;
        digit.setText(Math.random() < 0.5 ? "0" : "1");
        digit.setAlpha(0.05 + Math.random() * 0.11);
      },
    });
  }

  // a short packet blip: a dot and its tiny shockwave
  _spawnBlip(W, H) {
    const x = W * 0.08 + Math.random() * W * 0.84;
    const y = H * 0.08 + Math.random() * H * 0.78;
    const dot = this.add.circle(x, y, 1.6, 0xd8e8dc, 0.55).setDepth(1);
    const halo = this.add
      .circle(x, y, 3)
      .setStrokeStyle(1, 0xd8e8dc, 0.3)
      .setDepth(1);
    this._roomObjs.push(dot, halo);
    const done = (o) => {
      const i = this._roomObjs.indexOf(o);
      if (i >= 0) this._roomObjs.splice(i, 1);
      o.destroy();
    };
    this.tweens.add({
      targets: dot,
      alpha: 0,
      duration: 420,
      onComplete: () => done(dot),
    });
    this.tweens.add({
      targets: halo,
      scale: 4,
      alpha: 0,
      duration: 520,
      ease: "Quad.easeOut",
      onComplete: () => done(halo),
    });
  }

  // the radio line low across the screen: near-flat carrier hiss, shaken
  // by a burst of chatter every few seconds
  update(time) {
    const g = this._waveGfx;
    if (!g || !this._waveGeom) return;
    const { W, H } = this._waveGeom;
    const b = this._burst ? this._burst.level : 0;
    const y0 = H * 0.875;
    g.clear();
    g.lineStyle(1, 0x8fd4a8, 0.1 + b * 0.14);
    let px = 0;
    let py = y0;
    for (let x = 10; x <= W; x += 10) {
      const y =
        y0 +
        // calm carrier: barely breathing
        Math.sin(x * 0.02 + time * 0.0012) * (0.9 + b * 1.6) +
        (Math.random() - 0.5) * (0.9 + b * 2.4) +
        // the burst: fast, angry vibration
        Math.sin(x * 0.13 + time * 0.02) * 9 * b +
        Math.sin(x * 0.31 - time * 0.013) * 5 * b;
      g.lineBetween(px, py, x, y);
      px = x;
      py = y;
    }
    // a fainter echo below
    g.lineStyle(1, 0x8fd4a8, 0.04 + b * 0.05);
    px = 0;
    py = y0 + 9;
    for (let x = 14; x <= W; x += 14) {
      const y =
        y0 +
        9 +
        Math.sin(x * 0.017 - time * 0.0011) * (0.7 + b * 4.5) +
        (Math.random() - 0.5) * (0.7 + b * 1.6);
      g.lineBetween(px, py, x, y);
      px = x;
      py = y;
    }
  }

  // ── Scene Build ─────────────────────────────────────────────────────────────

  _buildScene(W, H) {
    this._drawRouter(W, H);
  }

  replay() {
    this._startAnimation();
  }

  // ── The router, hand-sketched in pencil ─────────────────────────────────────
  // Same footprint the old SVG used, so the antenna pulses still line up.
  // The 13 LEDs are the only living colour — they carry the puzzle.

  _drawRouter(W, H) {
    const SK = 0xd8d2c4;
    const dW = Math.min(W * 0.78, 520);
    const dH = dW * (224.68 / 300);
    const x = (W - dW) / 2;
    const y = (H - dH) / 2 - H * 0.04; // slightly above center

    const objs = [];
    this._routerObjs = objs;
    const g = this.add.graphics().setDepth(2);
    objs.push(g);
    const rnd = this._rng(6006);

    // ── the first version's flat face, lowered, with a receding top:
    // front face wide, back edge shorter (a trapeze top seen from above),
    // round LEDs, engraved name, and the wifi mark hanging over it all ──
    const bx = x + dW * 0.08;
    const bw = dW * 0.84;
    const byTop = y + dH * 0.52;
    const bh = dH * 0.34; // lower than before — a slab, not a radio
    const inset = bw * 0.07; // how much the back edge pulls in, per side
    const ddy = -dH * 0.11; // how far the top face recedes upward

    // top face — a trapeze: full-width at the front, shorter at the back
    g.fillStyle(0x1a1e25, 0.96);
    g.fillPoints(
      [
        { x: bx, y: byTop },
        { x: bx + bw, y: byTop },
        { x: bx + bw - inset, y: byTop + ddy },
        { x: bx + inset, y: byTop + ddy },
      ],
      true,
    );
    g.fillStyle(SK, 0.055);
    g.fillPoints(
      [
        { x: bx, y: byTop },
        { x: bx + bw, y: byTop },
        { x: bx + bw - inset, y: byTop + ddy },
        { x: bx + inset, y: byTop + ddy },
      ],
      true,
    );
    // front face
    g.fillStyle(0x14171d, 0.97);
    g.fillRect(bx, byTop, bw, bh);
    g.fillStyle(SK, 0.04);
    g.fillRect(bx, byTop, bw, bh);

    // pencil edges — front rectangle + the two receding sides + back edge
    this._pencilRect(g, rnd, bx, byTop, bw, bh, 1.7, SK, 0.55, 2);
    this._pencilSeg(g, rnd, bx, byTop, bx + inset, byTop + ddy, 1.3, SK, 0.45, 1);
    this._pencilSeg(g, rnd, bx + bw, byTop, bx + bw - inset, byTop + ddy, 1.3, SK, 0.45, 1);
    this._pencilSeg(g, rnd, bx + inset, byTop + ddy, bx + bw - inset, byTop + ddy, 1.5, SK, 0.5, 1.6);

    // vent hatching on the top face, right side
    for (let i = 0; i < 6; i++) {
      const t0 = 0.25 + i * 0.11;
      const vx = bx + bw * 0.68 + i * (bw * 0.028);
      this._pencilSeg(g, rnd, vx, byTop - 3, vx - inset * 0.5, byTop + ddy + 3, 1, SK, 0.16, 0.6);
    }

    // the engraved model name — the clue stays, on the front face
    const label = this.add
      .text(bx + bw / 2, byTop + bh * 0.74, "W .   L E I B N I Z", {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.max(12, Math.round(dH * 0.05)) + "px",
        color: "#8f8974",
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(3);
    objs.push(label);

    // feet
    this._pencilSeg(g, rnd, bx + bw * 0.14, byTop + bh, bx + bw * 0.14, byTop + bh + 8, 1.4, SK, 0.45, 0.6);
    this._pencilSeg(g, rnd, bx + bw * 0.86, byTop + bh, bx + bw * 0.86, byTop + bh + 8, 1.4, SK, 0.45, 0.6);
    this._pencilSeg(g, rnd, bx + bw * 0.10, byTop + bh + 8, bx + bw * 0.18, byTop + bh + 8, 1.2, SK, 0.4, 0.6);
    this._pencilSeg(g, rnd, bx + bw * 0.82, byTop + bh + 8, bx + bw * 0.90, byTop + bh + 8, 1.2, SK, 0.4, 0.6);

    // ── two rod antennas on the back edge, and the wifi mark between them ──
    const backY = byTop + ddy;
    const tips = [
      { x: W / 2 - dW * 0.24, y: y + dH * 0.14 },
      { x: W / 2 + dW * 0.24, y: y + dH * 0.14 },
    ];
    const bases = [
      { x: bx + inset + (bw - 2 * inset) * 0.16, y: backY },
      { x: bx + inset + (bw - 2 * inset) * 0.84, y: backY },
    ];
    for (let i = 0; i < 2; i++) {
      const b = bases[i];
      const t = tips[i];
      this._pencilRect(g, rnd, b.x - 5, b.y - 8, 10, 9, 1.1, SK, 0.4, 0.7);
      this._pencilSeg(g, rnd, b.x - 1.6, b.y - 7, t.x - 1.6, t.y + 4, 1.5, SK, 0.55, 1.2);
      this._pencilSeg(g, rnd, b.x + 1.6, b.y - 7, t.x + 1.6, t.y + 4, 1.2, SK, 0.35, 1.2);
      this._pencilCircle(g, rnd, t.x, t.y, 3.2, 1.2, SK, 0.5);
    }

    // the wireless mark: a dot and three arcs opening upward, breathing —
    // hangs in the air over the router's centre
    const wx = W / 2;
    const wy = y + dH * 0.2;
    g.fillStyle(SK, 0.6);
    g.fillCircle(wx, wy, 2.6);
    for (let a = 0; a < 3; a++) {
      const arcG = this.add.graphics().setDepth(2);
      const rr = 12 + a * 11;
      const steps = 10;
      const rndA = this._rng(3000 + a * 71);
      let prev = null;
      for (let i = 0; i <= steps; i++) {
        const ang = Math.PI * 1.25 + (Math.PI * 0.5 * i) / steps; // -135°..-45°
        const jr = rr + (rndA() - 0.5) * 1.4;
        const p = { x: wx + Math.cos(ang) * jr, y: wy + Math.sin(ang) * jr };
        if (prev) {
          arcG.lineStyle(1.4, SK, 1);
          arcG.lineBetween(prev.x, prev.y, p.x, p.y);
        }
        prev = p;
      }
      arcG.setAlpha(0.2);
      objs.push(arcG);
      // each arc brightens in turn — the signal climbing outward
      this.tweens.add({
        targets: arcG,
        alpha: 0.6,
        duration: 700,
        delay: a * 380,
        yoyo: true,
        repeat: -1,
        repeatDelay: 1200,
        ease: "Sine.easeInOut",
      });
    }

    // ── the 13 LEDs — tiny points, the size the old SVG used: ~2.5px dots
    // with a soft halo; too small for a sketched socket, so just a hair-thin
    // ring holds each one ──
    const ledY = byTop + bh * 0.42;
    const r = Math.max(2.2, dW * 0.005);
    const mk = (cx) => {
      g.lineStyle(1, SK, 0.22);
      g.strokeCircle(cx, ledY, r + 2);
      const glow = this.add.circle(cx, ledY, r + 5, 0x3a3e46, 0).setDepth(2);
      const dot = this.add.circle(cx, ledY, r, 0x3a3e46, 0.9).setDepth(3);
      objs.push(glow, dot);
      return { dot, glow };
    };
    this._ledDots = [];
    const cStart = bx + bw * 0.12;
    const cGap = bw * 0.034;
    for (let i = 0; i < 5; i++) this._ledDots.push(mk(cStart + i * cGap));
    const sStart = bx + bw * 0.52;
    for (let i = 0; i < 8; i++) this._ledDots.push(mk(sStart + i * cGap));
  }

  _destroyRouter() {
    if (this._routerObjs) {
      for (const o of this._routerObjs) {
        this.tweens.killTweensOf(o);
        o.destroy();
      }
    }
    this._routerObjs = null;
    this._ledDots = null;
  }

  // ── LED Style ───────────────────────────────────────────────────────────────

  _setLed(index, state) {
    if (!this._ledDots || !this._ledDots[index]) return;
    const L = this._ledDots[index];
    const map = {
      off: { c: 0x3a3e46, a: 0.9, glow: 0 },
      green: { c: 0x00ff44, a: 1, glow: 0.22 },
      orange: { c: 0xff8800, a: 1, glow: 0.24 },
      red: { c: 0xff2200, a: 1, glow: 0.24 },
    };
    const m = map[state] || map.off;
    L.dot.setFillStyle(m.c, m.a);
    L.glow.setFillStyle(m.c, m.glow);
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

    const WORD = "HTTPS";
    const BINARY = {
      H: "01001000",
      T: "01010100",
      P: "01010000",
      S: "01010011",
    };

    // Timing (ms)
    const T_BIT = 600; // how long the active LED stays lit for one bit (50% slower)
    const GAP_BIT = 330; // dark gap between consecutive bit flashes (50% slower)
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
      // H(li=0)→idx0, T(li=1)→idx1, T(li=2)→idx2, P(li=3)→idx3, S(li=4)→idx4
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

  // Looping modem hardware hum — background ambience while on this level
  _startHardwareHum() {
    try {
      if (this.cache.audio.exists("hardware")) {
        this._hwSound = this.sound.add("hardware", {
          loop: true,
          volume: (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.35,
        });
        this._hwSound.play();
      }
    } catch (e) {}
  }

  shutdown() {
    if (this._hwSound) {
      try { this._hwSound.stop(); this._hwSound.destroy(); } catch (e) {}
      this._hwSound = null;
    }
    this._cancelAnimation();
    this._destroyRouter();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
