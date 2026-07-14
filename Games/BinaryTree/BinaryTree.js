// ─────────────────────────────────────────────────────────────────────────────
// Level — "BINARY TREE"  ·  code: BADGE  ·  chamber XII  ·  fork, then read
//
// Drawn in the game's pencil-sketch idiom: a tree of 8 leaves (A–H) reached
// from START by three forks each — left or right. A note pinned above the
// tree lists five paths:  LLR  LLL  LRR  RRL  RLL
//
// Tap a path to walk it — a pencilled point travels fork by fork and the
// leaf it lands on catches the light for a moment. Reading each leaf in the
// note's own order spells the access code:
//
//   LLR→B · LLL→A · LRR→D · RRL→G · RLL→E   →   BADGE
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const BT_CODES = ["LLR", "LLL", "LRR", "RRL", "RLL"];
const BT_SKETCH = 0xd8d2c4; // the pencil itself

class BinaryTreeScene extends Phaser.Scene {
  constructor() {
    super({ key: "BinaryTree" });
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

    // walked-path progress survives resizes
    this._traced = new Set();
    this._solved = false;
    this._tracing = false;

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
    const steps = 14;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.6;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const treeX0 = W * 0.1;
    const treeX1 = W * 0.9;
    const treeW = treeX1 - treeX0;
    const depthY = [H * 0.27, H * 0.44, H * 0.6, H * 0.77];

    // node[depth][index] = {x,y}
    this._nodes = [];
    for (let d = 0; d < 4; d++) {
      const count = Math.pow(2, d);
      const row = [];
      for (let i = 0; i < count; i++) {
        row.push({ x: treeX0 + (treeW * (i + 0.5)) / count, y: depthY[d] });
      }
      this._nodes.push(row);
    }

    this._drawRoom(W, H);
    this._drawEdges();
    this._drawNodes();
    this._drawNote(W, depthY[0]);
    this._drawTexts(W, H);
    this._makeChips(W, depthY[0]);
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    if (this._solved) this._applySolved(true);
  }

  // the sketched wall the tree is pinned to
  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(7171);
    const floorY = H * 0.9;
    const cwx1 = W * 0.09;
    const cwx2 = W * 0.91;
    this._pencilSeg(g, rnd, cwx1, H * 0.06, cwx1, floorY, 1, BT_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, cwx2, H * 0.06, cwx2, floorY, 1, BT_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, 0, H * 0.035, cwx1, H * 0.06, 1, BT_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, W, H * 0.035, cwx2, H * 0.06, 1, BT_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, 0, H * 0.995, cwx1 * 1.6, floorY, 1, BT_SKETCH, 0.09, 2);
    this._pencilSeg(g, rnd, W, H * 0.995, W - cwx1 * 1.6, floorY, 1, BT_SKETCH, 0.09, 2);
    this._pencilSeg(g, rnd, 0, floorY, W, floorY, 1.4, BT_SKETCH, 0.2, 2);
    for (let i = 0; i < 3; i++) {
      const y = floorY + 20 + i * ((H - floorY) / 3.4);
      this._pencilSeg(g, rnd, W * 0.04, y, W * 0.96, y + (rnd() - 0.5) * 6, 1, BT_SKETCH, 0.05, 2.4);
    }
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.9;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 30, y + (rnd() - 0.5) * 10, 1, BT_SKETCH, 0.04, 1.6);
    }
  }

  // straight-lined edges between forks, shortened to clear the node marks
  _drawEdges() {
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(2233);
    const radiusAt = [22, 8, 8, 15];
    for (let d = 0; d < 3; d++) {
      for (let p = 0; p < this._nodes[d].length; p++) {
        const a = this._nodes[d][p];
        for (const ci of [2 * p, 2 * p + 1]) {
          const b = this._nodes[d + 1][ci];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const ra = radiusAt[d];
          const rb = radiusAt[d + 1];
          this._pencilSeg(
            g,
            rnd,
            a.x + ux * ra,
            a.y + uy * ra,
            b.x - ux * rb,
            b.y - uy * rb,
            1.3,
            BT_SKETCH,
            0.32,
            1.6,
          );
        }
      }
    }
    this._edgeGfx = g;
  }

  _drawNodes() {
    const g = this.add.graphics().setDepth(-3);
    // root — a pinned tag reading START
    const root = this._nodes[0][0];
    const rndR = this._rng(9001);
    this._pencilRect(g, rndR, root.x - 44, root.y - 16, 88, 32, 1.4, BT_SKETCH, 0.55, 1.6);
    this.add
      .text(root.x, root.y, "START", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "14px",
        color: "#e8dcc0",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(-2);

    // forks at depth 1 and 2 — plain unlabeled knots
    const rndF = this._rng(4501);
    for (let d = 1; d <= 2; d++) {
      for (const n of this._nodes[d]) {
        this._pencilCircle(g, rndF, n.x, n.y, 6, 1.2, BT_SKETCH, 0.5);
      }
    }

    // leaves — round tags, lettered A..H left to right
    this._leafLabels = [];
    const rndL = this._rng(6601);
    for (let i = 0; i < 8; i++) {
      const n = this._nodes[3][i];
      this._pencilCircle(g, rndL, n.x, n.y, 15, 1.3, BT_SKETCH, 0.6);
      const letter = String.fromCharCode(65 + i);
      const t = this.add
        .text(n.x, n.y, letter, {
          fontFamily: '"Special Elite", monospace',
          fontSize: "17px",
          color: "#c9bfa4",
        })
        .setOrigin(0.5)
        .setDepth(-2);
      this._leafLabels.push(t);
    }
    this._nodeGfx = g;
  }

  // the pinned note above START, listing the five paths
  _drawNote(W, rootY) {
    const nw = Math.min(W * 0.46, 520);
    const nh = 58;
    const nx = W / 2 - nw / 2;
    const ny = rootY - 120;
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(3311);

    this._pencilRect(g, rnd, nx, ny, nw, nh, 1.3, BT_SKETCH, 0.42, 2);
    g.fillStyle(BT_SKETCH, 0.5);
    g.fillCircle(nx + 10, ny + 9, 1.8);
    g.fillCircle(nx + nw - 10, ny + 9, 1.8);

    this._noteRect = { x: nx, y: ny, w: nw, h: nh };
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "EVERY FORK REMEMBERS.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.subText = this.add
      .text(W / 2, 68, "tap a path above to walk it — left, then left, then right", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 12", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── the five clickable paths ────────────────────────────────────────────────

  _makeChips(W, rootY) {
    this._chips = [];
    const r = this._noteRect;
    const cx0 = r.x;
    const cw = r.w / BT_CODES.length;
    for (let i = 0; i < BT_CODES.length; i++) {
      const code = BT_CODES[i];
      const cx = cx0 + cw * (i + 0.5);
      const cy = r.y + r.h / 2;
      const t = this.add
        .text(cx, cy, code, {
          fontFamily: '"Special Elite", monospace',
          fontSize: "18px",
          color: "#c9bfa4",
          letterSpacing: 2,
        })
        .setOrigin(0.5)
        .setDepth(-2)
        .setInteractive({ useHandCursor: true });

      t.on("pointerover", () => {
        if (!this._traced.has(i)) t.setColor("#e8dcc0");
      });
      t.on("pointerout", () => {
        if (!this._traced.has(i)) t.setColor("#c9bfa4");
      });
      t.on("pointerdown", () => this._traceCode(i));

      this._chips.push(t);
    }
  }

  _chainForCode(code) {
    const chain = [this._nodes[0][0]];
    let idx = 0;
    for (let k = 0; k < code.length; k++) {
      idx = idx * 2 + (code[k] === "R" ? 1 : 0);
      chain.push(this._nodes[k + 1][idx]);
    }
    return chain;
  }

  _traceCode(i) {
    if (this._tracing) return;
    const code = BT_CODES[i];
    const chain = this._chainForCode(code);
    this._tracing = true;
    this._paperTick(0.12);

    const dot = this.add
      .circle(chain[0].x, chain[0].y, 5, 0xd9c9a0, 0.95)
      .setDepth(25);
    const glow = this.add
      .circle(chain[0].x, chain[0].y, 9, 0xd9c9a0, 0.25)
      .setDepth(24);

    let step = 0;
    const nextStep = () => {
      if (step >= chain.length - 1) {
        dot.destroy();
        glow.destroy();
        this._flashLeaf(this._leafIndexFor(code));
        this._tracing = false;
        this._traced.add(i);
        this._chips[i].setColor("#d9c9a0");
        this._checkAllTraced();
        return;
      }
      const to = chain[step + 1];
      this.tweens.add({
        targets: [dot, glow],
        x: to.x,
        y: to.y,
        duration: 260,
        ease: "Quad.easeInOut",
        onComplete: () => {
          step++;
          nextStep();
        },
      });
    };
    nextStep();
  }

  _leafIndexFor(code) {
    return parseInt(code.replace(/L/g, "0").replace(/R/g, "1"), 2);
  }

  _flashLeaf(leafIndex) {
    const t = this._leafLabels[leafIndex];
    if (!t) return;
    this._paperTick(0.16);
    this.tweens.add({
      targets: t,
      scale: { from: 1, to: 1.5 },
      duration: 180,
      yoyo: true,
      ease: "Quad.easeOut",
    });
    const prevColor = t.style.color;
    t.setColor("#f0e2ba");
    this.time.delayedCall(420, () => {
      if (!this._solved) t.setColor(prevColor);
    });
  }

  _checkAllTraced() {
    if (this._solved || this._traced.size < BT_CODES.length) return;
    this._solved = true;
    this._chime();
    this._applySolved();
  }

  _applySolved(instant) {
    for (const t of this._leafLabels) t.setColor("#d9c9a0");
    for (const t of this._chips) t.setColor("#d9c9a0");
    this.statusText.setText("Five paths walked. Read the leaves, in order.");
    this.statusText.setColor("#d9c9a0");
    if (!instant) {
      this.subText.setAlpha(0);
      this.tweens.add({
        targets: this._leafLabels,
        scale: { from: 1, to: 1.12 },
        yoyo: true,
        duration: 260,
        ease: "Quad.easeOut",
      });
    } else {
      this.subText.setAlpha(0);
    }
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
    const rnd = this._rng(8801);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.08 + rnd() * W * 0.84;
      const dy = H * 0.1 + rnd() * H * 0.6;
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
          dot.y = H * 0.1 + rnd() * H * 0.5;
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
    this._chips = [];
    this._leafLabels = [];
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
