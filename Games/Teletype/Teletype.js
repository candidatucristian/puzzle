// ─────────────────────────────────────────────────────────────────────────────
// Level — "TELETYPE"  ·  code: SIGNAL  ·  chamber XV  ·  ASCII
//
// Drawn in the game's pencil-sketch idiom: an old teleprinter on a desk,
// typing the same report every night onto a tall strip of paper. Six
// numbers, one per line, typed digit by digit with a blinking cursor,
// then a long silence — and it starts the page again:
//
//   83 · 73 · 71 · 78 · 65 · 76
//
// The numbers are decimal ASCII. Nothing on screen says so — the only
// quiet nudge is the builder's plate on the machine: "MOD. 1963", the
// year the code was standardised. Decoded:  S I G N A L
//
// There is no in-scene solve detection — the access code is the proof.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const TT_SKETCH = 0xd8d2c4; // the pencil itself
const TT_CODES = ["83", "73", "71", "78", "65", "76"]; // → SIGNAL

class TeletypeScene extends Phaser.Scene {
  constructor() {
    super({ key: "Teletype" });
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
    this.events.once("shutdown", () => this.shutdown());

    this._typeTimers = [];

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
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

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const deskY = H * 0.8;
    this._drawRoom(W, H, deskY);
    this._drawMachineAndPaper(W, H, deskY);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    this._startTyping();
  }

  _drawRoom(W, H, deskY) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(9339);
    // wireframe walls
    this._pencilSeg(g, rnd, W * 0.07, H * 0.05, W * 0.07, deskY, 1, TT_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, W * 0.93, H * 0.05, W * 0.93, deskY, 1, TT_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, 0, H * 0.03, W * 0.07, H * 0.05, 1, TT_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, W, H * 0.03, W * 0.93, H * 0.05, 1, TT_SKETCH, 0.08, 2);
    // stray scribbles
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = rnd() * deskY * 0.5;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 30, y + (rnd() - 0.5) * 10, 1, TT_SKETCH, 0.04, 1.6);
    }
    // the desk
    this._pencilSeg(g, rnd, 0, deskY, W, deskY, 1.4, TT_SKETCH, 0.22, 2);
    this._pencilSeg(g, rnd, 0, deskY + 5, W, deskY + 5, 1, TT_SKETCH, 0.1, 2);
    for (let i = 0; i < 3; i++) {
      const y = deskY + 24 + i * ((H - deskY) / 3.6);
      this._pencilSeg(g, rnd, W * 0.04, y, W * 0.96, y + (rnd() - 0.5) * 6, 1, TT_SKETCH, 0.05, 2.4);
    }
  }

  // the teleprinter and the tall strip of paper rising from its platen
  _drawMachineAndPaper(W, H, deskY) {
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(6116);

    const mw = Math.min(W * 0.34, 430);
    const mh = H * 0.17;
    const mx = W / 2 - mw / 2;
    const myTop = deskY - mh;

    // ── the paper: a tall sheet standing out of the machine ──
    const pw = mw * 0.46;
    const px = W / 2 - pw / 2;
    const ph = H * 0.36;
    const pTop = myTop - 14 - ph;
    g.fillStyle(0x1a1d23, 0.97);
    g.fillRect(px, pTop, pw, ph + 20);
    g.fillStyle(TT_SKETCH, 0.05);
    g.fillRect(px, pTop, pw, ph + 20);
    // pencil edges — the sheet's sides run into the machine
    this._pencilSeg(g, rnd, px, pTop, px, myTop - 2, 1.4, TT_SKETCH, 0.5, 1.6);
    this._pencilSeg(g, rnd, px + pw, pTop, px + pw, myTop - 2, 1.4, TT_SKETCH, 0.5, 1.6);
    this._pencilSeg(g, rnd, px, pTop, px + pw, pTop - 2, 1.4, TT_SKETCH, 0.5, 1.6);
    // sprocket holes down both margins, like real teletype paper
    for (let i = 0; i < 8; i++) {
      const hy = pTop + 18 + i * ((ph - 20) / 7);
      this._pencilCircle(g, rnd, px + 9, hy, 2.2, 1, TT_SKETCH, 0.3);
      this._pencilCircle(g, rnd, px + pw - 9, hy, 2.2, 1, TT_SKETCH, 0.3);
    }
    // faint ruled lines where the report gets typed
    this._lineYs = [];
    const lineH = (ph - 40) / 6.4;
    for (let i = 0; i < 6; i++) {
      const ly = pTop + 34 + i * lineH;
      this._lineYs.push(ly);
      this._pencilSeg(g, rnd, px + 22, ly + lineH * 0.34, px + pw - 22, ly + lineH * 0.34, 1, TT_SKETCH, 0.1, 1.2);
    }
    this._paperGeom = { px, pw, lineH };

    // ── the machine ──
    g.fillStyle(0x14171d, 0.97);
    g.fillRect(mx, myTop, mw, mh);
    g.fillStyle(TT_SKETCH, 0.04);
    g.fillRect(mx, myTop, mw, mh);
    this._pencilRect(g, rnd, mx, myTop, mw, mh, 1.7, TT_SKETCH, 0.55, 2);
    this._pencilRect(g, rnd, mx + 7, myTop + 7, mw - 14, mh - 14, 1, TT_SKETCH, 0.16, 2);

    // the platen: a long roller across the top, knobs at both ends
    const platY = myTop - 6;
    this._pencilSeg(g, rnd, mx + mw * 0.08, platY, mx + mw * 0.92, platY, 2, TT_SKETCH, 0.5, 1.6);
    this._pencilSeg(g, rnd, mx + mw * 0.08, platY - 8, mx + mw * 0.92, platY - 8, 1.2, TT_SKETCH, 0.35, 1.6);
    this._pencilCircle(g, rnd, mx + mw * 0.05, platY - 4, 7, 1.3, TT_SKETCH, 0.5);
    this._pencilCircle(g, rnd, mx + mw * 0.95, platY - 4, 7, 1.3, TT_SKETCH, 0.5);

    // three rows of round keys
    for (let row = 0; row < 3; row++) {
      const n = 10 - row;
      const ky = myTop + mh * 0.42 + row * (mh * 0.17);
      const span = mw * (0.62 - row * 0.05);
      const kx0 = W / 2 - span / 2;
      for (let i = 0; i < n; i++) {
        this._pencilCircle(g, rnd, kx0 + (span * i) / (n - 1), ky, mh * 0.055, 1, TT_SKETCH, 0.4);
      }
    }

    // the builder's plate — the one quiet nudge
    const plate = this.add
      .text(mx + mw / 2, myTop + mh * 0.16, "MOD. 1963", {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.max(11, Math.round(mh * 0.13)) + "px",
        color: "#8f8974",
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(-3);
    this._pencilRect(
      g, rnd,
      mx + mw / 2 - plate.width / 2 - 8, myTop + mh * 0.16 - plate.height / 2 - 4,
      plate.width + 16, plate.height + 8,
      1, TT_SKETCH, 0.3, 1,
    );

    // ── the six report lines, typed in by _startTyping ──
    this._lineTexts = [];
    const fs = Math.round(lineH * 0.58);
    for (let i = 0; i < 6; i++) {
      const t = this.add
        .text(px + pw * 0.3, this._lineYs[i], "", {
          fontFamily: '"Special Elite", monospace',
          fontSize: fs + "px",
          color: "#d9cfae",
        })
        .setOrigin(0, 0.5)
        .setDepth(-3);
      this._lineTexts.push(t);
    }
    // the cursor
    this._cursor = this.add
      .text(px + pw * 0.3, this._lineYs[0], "_", {
        fontFamily: '"Special Elite", monospace',
        fontSize: fs + "px",
        color: "#d9cfae",
      })
      .setOrigin(0, 0.5)
      .setDepth(-3);
    this.tweens.add({
      targets: this._cursor,
      alpha: 0.1,
      duration: 420,
      yoyo: true,
      repeat: -1,
    });
  }

  // ── the typing loop ─────────────────────────────────────────────────────────

  _cancelTyping() {
    for (const ev of this._typeTimers) {
      try {
        ev.remove(false);
      } catch (_) {}
    }
    this._typeTimers = [];
  }

  _startTyping() {
    this._cancelTyping();
    for (const t of this._lineTexts) t.setText("");
    this._moveCursor(0);

    const events = [];
    const sched = (absT, fn) => events.push(this.time.delayedCall(absT, fn));
    let t = 1200;

    for (let li = 0; li < TT_CODES.length; li++) {
      const code = TT_CODES[li];
      for (let di = 0; di < code.length; di++) {
        const part = code.slice(0, di + 1);
        const capLi = li;
        sched(t, () => {
          if (!this._lineTexts[capLi]) return;
          this._lineTexts[capLi].setText(part);
          this._moveCursor(capLi);
          this._clack(1300 + Math.random() * 500, 0.1);
        });
        t += 300 + Math.random() * 120;
      }
      // carriage return to the next line
      t += 260;
      const nextLi = li + 1;
      sched(t, () => {
        this._clack(480, 0.18);
        if (nextLi < 6) this._moveCursor(nextLi);
      });
      t += 620;
    }

    // the report sits a while, then the machine starts the page over
    t += 4200;
    sched(t, () => this._startTyping());

    this._typeTimers = events;
  }

  _moveCursor(lineIdx) {
    if (!this._cursor || !this._lineTexts[lineIdx]) return;
    const lt = this._lineTexts[lineIdx];
    this._cursor.x = lt.x + lt.width + 3;
    this._cursor.y = lt.y;
  }

  // ── texts, vignette, dust ───────────────────────────────────────────────────

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "It types the same line, every night.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 15", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  _drawVignette(W, H) {
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0, 0.45, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.45, 0, 0.45);
    vg.fillRect(W - v, 0, v, H);
  }

  _spawnDust(W, H) {
    const rnd = this._rng(2828);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.08 + rnd() * W * 0.84;
      const dy = H * 0.08 + rnd() * H * 0.55;
      const dot = this.add
        .circle(dx, dy, 0.7 + rnd() * 1, 0xffffff, 0.08 + rnd() * 0.1)
        .setDepth(-2);
      this.tweens.add({
        targets: dot,
        x: dx + (rnd() * 44 - 22),
        y: dy + 24 + rnd() * 40,
        alpha: 0,
        duration: 8000 + rnd() * 8000,
        delay: rnd() * 5000,
        repeat: -1,
        onRepeat: () => {
          dot.x = W * 0.08 + rnd() * W * 0.84;
          dot.y = H * 0.08 + rnd() * H * 0.5;
          dot.setAlpha(0.08 + rnd() * 0.1);
        },
      });
    }
  }

  // ── sound: the typebar strike ───────────────────────────────────────────────

  _clack(freq, vol) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const dur = 0.045;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 2.2;
      const g = ac.createGain();
      g.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * vol;
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._cancelTyping();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._lineTexts = [];
    this._cursor = null;
  }

  shutdown() {
    this._cancelTyping();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
