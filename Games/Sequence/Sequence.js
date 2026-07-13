// ─────────────────────────────────────────────────────────────────────────────
// Level — "SEQUENCE"  ·  code: 19334488111  ·  chamber I  ·  sort, then read
//
// Drawn in the game's pencil-sketch idiom: six numbered cards pinned out
// of order over six dashed slots. Drag a card onto another and they swap.
//
// Sorted smallest-first —  11 19 23 24 28 31  — they fuse into one long
// number, written live beneath the row:  111923242831.
//
// The cipher is look-and-say, taught by the sketched note in the corner
// ( 25 → 55 · "how many, then what" ): read the long number in pairs,
// each pair saying HOW MANY times to write WHICH digit:
//
//   11→1 · 19→9 · 23→33 · 24→44 · 28→88 · 31→111
//
// …which spells the access code:  19334488111
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the
// other levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const SEQ_SORTED = [11, 19, 23, 24, 28, 31];
// starting arrangement — no card begins in its correct slot
const SEQ_START = [23, 31, 11, 28, 19, 24];

const SEQ_SKETCH = 0xd8d2c4; // the pencil itself

class SequenceScene extends Phaser.Scene {
  constructor() {
    super({ key: "Sequence" });
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
    this.input.mouse.disableContextMenu();

    // slot order + solved state survive resizes
    this._order = SEQ_START.slice();
    this._solved = false;

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

  _dashedRect(g, x, y, w, h, color, alpha) {
    g.lineStyle(1, color, alpha);
    const step = 10;
    for (let dx = x; dx < x + w - 4; dx += step) {
      g.lineBetween(dx, y, dx + 5, y);
      g.lineBetween(dx, y + h, dx + 5, y + h);
    }
    for (let dy = y; dy < y + h - 4; dy += step) {
      g.lineBetween(x, dy, x, dy + 5);
      g.lineBetween(x + w, dy, x + w, dy + 5);
    }
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const deskY = H * 0.74;
    // the row of slots
    const cw = Math.min(W * 0.09, 124);
    const chh = cw * 0.72;
    const gap = cw * 0.26;
    const total = 6 * cw + 5 * gap;
    this._slots = [];
    const x0 = W / 2 - total / 2;
    const sy = H * 0.32;
    for (let i = 0; i < 6; i++) {
      this._slots.push({ x: x0 + i * (cw + gap) + cw / 2, y: sy, w: cw, h: chh });
    }
    this._slotRow = { x: x0, y: sy - chh / 2, w: total, h: chh };

    this._drawRoom(W, H, deskY);
    this._drawSlots();
    this._drawNote(W, H, deskY);
    this._drawTexts(W, H);

    // the fused number, written live beneath the row
    this._fusedText = this.add
      .text(W / 2, sy + chh / 2 + 74, "", {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.round(cw * 0.42) + "px",
        color: "#c9bfa4",
        letterSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(8);
    const und = this.add.graphics().setDepth(7);
    const rndU = this._rng(9911);
    this._pencilSeg(
      und,
      rndU,
      W / 2 - total * 0.36,
      sy + chh / 2 + 100,
      W / 2 + total * 0.36,
      sy + chh / 2 + 100,
      1.2,
      SEQ_SKETCH,
      0.25,
      2,
    );

    this._makeCards();
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    this._refreshFused();
    if (this._solved) this._applySolved(true);
  }

  // the sketched room: wireframe pencil box, like the old plans
  _drawRoom(W, H, deskY) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(6161);
    const cwx1 = W * 0.09;
    const cwx2 = W * 0.91;
    this._pencilSeg(g, rnd, cwx1, H * 0.06, cwx1, deskY, 1, SEQ_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, cwx2, H * 0.06, cwx2, deskY, 1, SEQ_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, 0, H * 0.035, cwx1, H * 0.06, 1, SEQ_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, W, H * 0.035, cwx2, H * 0.06, 1, SEQ_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, 0, H * 0.995, cwx1 * 1.6, deskY, 1, SEQ_SKETCH, 0.09, 2);
    this._pencilSeg(g, rnd, W, H * 0.995, W - cwx1 * 1.6, deskY, 1, SEQ_SKETCH, 0.09, 2);
    this._pencilSeg(g, rnd, 0, deskY, W, deskY, 1.4, SEQ_SKETCH, 0.22, 2);
    this._pencilSeg(g, rnd, 0, deskY + 5, W, deskY + 5, 1, SEQ_SKETCH, 0.1, 2);
    for (let i = 0; i < 4; i++) {
      const y = deskY + 26 + i * ((H - deskY) / 4.6);
      this._pencilSeg(g, rnd, W * 0.04, y, W * 0.96, y + (rnd() - 0.5) * 6, 1, SEQ_SKETCH, 0.05, 2.4);
    }
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = rnd() * deskY * 0.4;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 30, y + (rnd() - 0.5) * 10, 1, SEQ_SKETCH, 0.05, 1.6);
    }
  }

  _drawSlots() {
    const g = this.add.graphics().setDepth(-6);
    for (const s of this._slots) {
      this._dashedRect(g, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, SEQ_SKETCH, 0.3);
    }
    // a small ascending arrow under the row: smallest first
    const rnd = this._rng(4477);
    const r = this._slotRow;
    const ay = r.y + r.h + 22;
    this._pencilSeg(g, rnd, r.x + 6, ay, r.x + 74, ay, 1.2, SEQ_SKETCH, 0.4, 1.4);
    this._pencilSeg(g, rnd, r.x + 74, ay, r.x + 64, ay - 5, 1.2, SEQ_SKETCH, 0.4, 1);
    this._pencilSeg(g, rnd, r.x + 74, ay, r.x + 64, ay + 5, 1.2, SEQ_SKETCH, 0.4, 1);
    this.add
      .text(r.x + 84, ay, "small → large", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "12px",
        color: "#8f8974",
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.75)
      .setDepth(-5);
  }

  // the sketched corner note that teaches the cipher: 25 → 55
  _drawNote(W, H, deskY) {
    const nw = 240;
    const nh = 92;
    const nx = W * 0.79;
    const ny = deskY + (H - deskY) / 2 - nh / 2;
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(3939);

    this._pencilRect(g, rnd, nx, ny, nw, nh, 1.3, SEQ_SKETCH, 0.4, 2);
    // pinned corner
    g.fillStyle(SEQ_SKETCH, 0.5);
    g.fillCircle(nx + 9, ny + 9, 1.8);

    this.add
      .text(nx + nw / 2, ny + nh * 0.36, "25 → 55", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "24px",
        color: "#c9bfa4",
      })
      .setOrigin(0.5)
      .setDepth(-5);
    this.add
      .text(nx + nw / 2, ny + nh * 0.72, "how many, then what", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#8f8974",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(-5);
  }

  // ── cards ──────────────────────────────────────────────────────────────────

  _makeCards() {
    this._cards = [];
    const rndA = this._rng(5151);
    for (let slot = 0; slot < this._order.length; slot++) {
      const value = this._order[slot];
      const s = this._slots[slot];
      const cont = this.add.container(s.x, s.y).setDepth(10);
      cont.setAngle((rndA() - 0.5) * 4); // hand-pinned, slightly crooked
      cont.cardValue = value;
      cont.slotIndex = slot;
      cont.homeAngle = cont.angle;

      const g = this.add.graphics();
      const rnd = this._rng(2000 + value * 37); // stable per card
      g.fillStyle(0x14171c, 0.9);
      g.fillRect(-s.w / 2 + 3, -s.h / 2 + 3, s.w - 6, s.h - 6);
      g.fillStyle(SEQ_SKETCH, 0.03);
      g.fillRect(-s.w / 2 + 3, -s.h / 2 + 3, s.w - 6, s.h - 6);
      this._pencilRect(g, rnd, -s.w / 2, -s.h / 2, s.w, s.h, 1.5, SEQ_SKETCH, 0.6, 1.8);
      // corner glint
      this._pencilSeg(g, rnd, -s.w / 2 + 7, -s.h / 2 + 14, -s.w / 2 + 17, -s.h / 2 + 5, 1, SEQ_SKETCH, 0.4, 1);
      cont.add(g);

      const txt = this.add
        .text(0, 1, String(value), {
          fontFamily: '"Special Elite", monospace',
          fontSize: Math.round(s.h * 0.5) + "px",
          color: "#e8dcc0",
        })
        .setOrigin(0.5);
      cont.add(txt);
      cont.numText = txt;

      const zone = this.add
        .zone(0, 0, s.w, s.h)
        .setOrigin(0.5)
        .setInteractive({ draggable: true, useHandCursor: true });
      cont.add(zone);

      // follow the pointer's world position — dragX/dragY are mapped into
      // the container's local space and would drift under rotation/scale
      zone.on("dragstart", (p) => {
        if (this._solved) return;
        cont.setDepth(16);
        cont.setScale(1.07);
        cont.setAngle(0);
        cont.dragOffX = cont.x - p.worldX;
        cont.dragOffY = cont.y - p.worldY;
        this._paperTick(0.1);
      });
      zone.on("drag", (p) => {
        if (this._solved) return;
        cont.x = p.worldX + cont.dragOffX;
        cont.y = p.worldY + cont.dragOffY;
      });
      zone.on("dragend", (p) => {
        if (this._solved) return;
        cont.setDepth(10);
        cont.setScale(1);
        const target = this._slotAt(p.x, p.y);
        if (target !== -1 && target !== cont.slotIndex) {
          this._swap(cont.slotIndex, target);
        } else {
          this._settle(cont);
        }
      });

      this._cards.push(cont);
    }
  }

  _slotAt(px, py) {
    const r = this._slotRow;
    if (py < r.y - 30 || py > r.y + r.h + 30) return -1;
    for (let i = 0; i < this._slots.length; i++) {
      const s = this._slots[i];
      if (Math.abs(px - s.x) <= (s.w + 14) / 2) return i;
    }
    return -1;
  }

  _cardInSlot(idx) {
    return this._cards.find((c) => c.slotIndex === idx);
  }

  _swap(a, b) {
    const ca = this._cardInSlot(a);
    const cb = this._cardInSlot(b);
    if (!ca || !cb) return;
    ca.slotIndex = b;
    cb.slotIndex = a;
    const t = this._order[a];
    this._order[a] = this._order[b];
    this._order[b] = t;
    this._settle(ca);
    this._settle(cb);
    this._paperTick(0.16);
    this._refreshFused();
    this._checkSolved();
  }

  _settle(cont) {
    const s = this._slots[cont.slotIndex];
    this.tweens.add({
      targets: cont,
      x: s.x,
      y: s.y,
      angle: this._solved ? 0 : cont.homeAngle,
      duration: 170,
      ease: "Quad.easeOut",
    });
  }

  // ── the fused number · solving ─────────────────────────────────────────────

  _refreshFused() {
    this._fusedText.setText(this._order.join(""));
  }

  _checkSolved() {
    if (this._solved) return;
    for (let i = 0; i < this._order.length; i++) {
      if (this._order[i] !== SEQ_SORTED[i]) return;
    }
    this._solved = true;
    this._chime();
    this._applySolved();
  }

  _applySolved(instant) {
    // cards straighten, the fused number catches the light
    for (const c of this._cards) {
      if (instant) c.setAngle(0);
      else this.tweens.add({ targets: c, angle: 0, duration: 260 });
      c.numText.setColor("#d9c9a0");
    }
    this._fusedText.setColor("#d9c9a0");
    if (!instant) {
      this.tweens.add({
        targets: this._fusedText,
        scale: { from: 1, to: 1.08 },
        yoyo: true,
        duration: 260,
        ease: "Quad.easeOut",
      });
    }
    this.statusText.setText("One number. Now read it aloud.");
    this.statusText.setColor("#d9c9a0");
    this.subText.setAlpha(0);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "Six numbers, out of order.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.subText = this.add
      .text(W / 2, 68, "drag a card onto another to swap them", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 1", {
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
    const rnd = this._rng(8484);
    const r = this._slotRow;
    for (let i = 0; i < 12; i++) {
      const dx = r.x - 40 + rnd() * (r.w + 80);
      const dy = H * 0.08 + rnd() * H * 0.5;
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
          dot.x = r.x - 40 + rnd() * (r.w + 80);
          dot.y = H * 0.08 + rnd() * H * 0.4;
          dot.setAlpha(0.08 + rnd() * 0.1);
        },
      });
    }
  }

  // ── sounds ─────────────────────────────────────────────────────────────────

  _paperTick(vol) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const dur = 0.05;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 1.6;
      const g = ac.createGain();
      g.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * vol;
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  _chime() {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const master = ac.createGain();
      master.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.35;
      master.connect(ac.destination);
      const partials = [
        [523.3, 0.9, 2.0],
        [659.3, 0.6, 1.8],
        [784.0, 0.45, 1.6],
      ];
      let delay = 0;
      for (const [f, amp, dur] of partials) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t + delay);
        g.gain.linearRampToValueAtTime(amp, t + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        o.connect(g);
        g.connect(master);
        o.start(t + delay);
        o.stop(t + delay + dur + 0.1);
        delay += 0.09;
      }
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._cards = [];
    this._fusedText = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
