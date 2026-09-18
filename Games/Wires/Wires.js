// WIRES: a country porch under a starry sky. The birds on five wires
// still spell FACADE; the harmonica is atmosphere, not a required audio clue.
// Optional recording: assets/sounds/Wires/music.mp3.
//
// Animațiile continue (balansoarul, notele muzicale, clipitul păsărelelor)
// rulează din update(), nu din tween-uri. Vechiul cod folosea
// this.tweens.timeline(), care a fost scos în Phaser 3.60: eroarea aruncată la
// prima notă oprea bucla jocului, de aceea nici scaunul nu se mai legăna.

const WI_SKETCH = 0xd8d2c4; // the pencil itself
const WI_LAND = 0x0b0f0d; // dealul și siluetele copacilor
const WI_NOTE = 0xf4eedf; // notele muzicale
const WI_POLE_X = 0.52; // stâlpul stă pe cocoașa dealului
const WI_ROCK_R = 130; // raza tălpilor curbe ale balansoarului (unități locale)

// birds, left to right — every bird sits ON a wire (0 = bottom wire).
// wires read bottom→top as D F A C E, so these spell FACADE
const WI_BIRDS = [
  { note: "F", pos: 1 },
  { note: "A", pos: 2 },
  { note: "C", pos: 3 },
  { note: "A", pos: 2 },
  { note: "D", pos: 0 },
  { note: "E", pos: 4 },
];

// Dealul, în stilul wallpaperului "Bliss" din Windows XP: puncte alternante
// vârf / vale (x = fracție din lățime, y = fracție din înălțime). Între ele
// curba e netedă (smoothstep), deci fiecare punct devine o cocoașă sau o vale.
const WI_HILLS = [
  [0.0, 0.66],
  [0.09, 0.622],
  [0.2, 0.688],
  [0.32, 0.628],
  [0.42, 0.67],
  [WI_POLE_X, 0.598], // cocoașa pe care stă stâlpul
  [0.64, 0.682],
  [0.76, 0.614],
  [0.88, 0.684],
  [1.0, 0.636],
];

// copăcei, brazi și boschete pe coama dealului (h = înălțime, fracție din ecran)
const WI_TREES = [
  { x: 0.285, type: "round", h: 0.07 },
  { x: 0.325, type: "bush", h: 0.022 },
  { x: 0.42, type: "bush", h: 0.026 },
  { x: 0.6, type: "bush", h: 0.02 },
  { x: 0.665, type: "round", h: 0.082 },
  { x: 0.695, type: "round", h: 0.058 },
  { x: 0.785, type: "pine", h: 0.095 },
  { x: 0.81, type: "pine", h: 0.07 },
  { x: 0.88, type: "bush", h: 0.028 },
  { x: 0.945, type: "round", h: 0.075 },
];

class WiresScene extends Phaser.Scene {
  constructor() {
    super({ key: "Wires" });
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
    this.load.audio("wires_music", "assets/sounds/Wires/music.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    this.events.once("shutdown", () => this.shutdown());
    this.input.mouse.disableContextMenu();

    this._built = false;
    this._birds = [];
    this._notes = [];
    this._rock = null;

    this._music = null;
    this._pausedBgm = null;
    this._startMusic();

    this._build(this.cameras.main.width, this.cameras.main.height);

    // păstrăm referința ca să scoatem listener-ul la shutdown
    // (altfel, la fiecare restart al scenei s-ar mai adăuga unul)
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.events.on("canvas_resized", this._onResize);

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // toate animațiile continue ale scenei pornesc de aici
  update(time, delta) {
    if (!this._built) return;
    const dt = Math.min(delta || 16, 100); // fără salturi după un tab inactiv
    this._updateChair(time);
    this._updateNotes(dt);
    this._updateBirds(time, dt);
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
    const steps = 14;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.4;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _pencilArc(g, rnd, cx, cy, r, a0, a1, width, color, alpha) {
    const steps = Math.max(6, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 8)));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const jr = r + (rnd() - 0.5) * 1.2;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._notes = [];
    this._noteTimer = 500;

    // composition matched to the reference photo
    this._geo = {
      poleX: W * WI_POLE_X,
      poleTop: H * 0.13,
      poleBottom: 0, // calculat mai jos, exact pe coama dealului
      yPoleTop: H * 0.155,
      spPole: H * 0.009,
      yLeftTop: H * 0.125,
      yRightTop: H * 0.17,
      spEdge: H * 0.03,
    };
    this._geo.poleBottom = this._hillY(this._geo.poleX) + 2;

    this._drawRoom(W, H);
    this._drawTrees(W, H);
    this._drawPoleAndWires(W, H);
    this._makeBirds();
    this._drawCountryPorch(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    this._built = true;
  }

  // înălțimea dealului (în pixeli) la coordonata x
  _hillY(x) {
    const t = x / this._W;
    const k = WI_HILLS;
    if (t <= k[0][0]) return k[0][1] * this._H;
    for (let i = 0; i < k.length - 1; i++) {
      const [x0, y0] = k[i];
      const [x1, y1] = k[i + 1];
      if (t <= x1) {
        const u = (t - x0) / (x1 - x0);
        const e = u * u * (3 - 2 * u);
        return (y0 + (y1 - y0) * e) * this._H;
      }
    }
    return k[k.length - 1][1] * this._H;
  }

  _wireYAt(w, x) {
    const P = this._geo;
    const yPole = P.yPoleTop + (4 - w) * P.spPole;
    let yEdge, t;
    if (x <= P.poleX) {
      yEdge = P.yLeftTop + (4 - w) * P.spEdge;
      t = x / P.poleX;
    } else {
      yEdge = P.yRightTop + (4 - w) * P.spEdge;
      t = (this._W - x) / (this._W - P.poleX);
    }
    const y = yEdge + (yPole - yEdge) * t;
    return y + Math.sin(Math.PI * (1 - t)) * 2.5;
  }

  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const stars = this._rng(8123);
    for (let i = 0; i < 65; i++) {
      const sx = W * (0.035 + stars() * 0.93);
      const sy = H * (0.035 + stars() * 0.49);
      const radius = 0.5 + stars() * 0.9;
      g.fillStyle(0xd8deea, 0.22 + stars() * 0.45);
      g.fillCircle(sx, sy, radius);
      if (i % 13 === 0) {
        g.lineStyle(0.7, 0xd8deea, 0.35);
        g.lineBetween(sx - 3, sy, sx + 3, sy);
        g.lineBetween(sx, sy - 3, sx, sy + 3);
      }
    }

    // --- DEALUL: o singură linie de creion, cu mai multe văi (stil Bliss) ---
    const rnd = this._rng(6446);
    const hill = [];
    const segs = 72;
    for (let i = 0; i <= segs; i++) {
      const hx = -12 + ((W + 24) * i) / segs;
      hill.push({ x: hx, y: this._hillY(hx) });
    }

    // pământul de sub deal acoperă cerul
    g.fillStyle(WI_LAND, 1);
    g.fillPoints(
      [...hill, { x: W + 12, y: H + 12 }, { x: -12, y: H + 12 }],
      true,
    );

    // conturul dealului — o singură linie
    for (let i = 1; i < hill.length; i++) {
      this._pencilSeg(
        g,
        rnd,
        hill[i - 1].x,
        hill[i - 1].y,
        hill[i].x,
        hill[i].y,
        1.6,
        WI_SKETCH,
        0.5,
        0.8,
      );
    }

    // câteva fire de iarbă răzlețe pe coamă
    for (let i = 0; i < 14; i++) {
      const gx = W * (0.03 + rnd() * 0.94);
      const gy = this._hillY(gx) + 1.5;
      this._pencilSeg(g, rnd, gx, gy, gx - 3, gy - 6, 1, WI_SKETCH, 0.28, 0.3);
      this._pencilSeg(
        g,
        rnd,
        gx + 2,
        gy,
        gx + 4,
        gy - 8,
        1,
        WI_SKETCH,
        0.28,
        0.3,
      );
    }
  }

  // ── copăcei, brazi și boschete ─────────────────────────────────────────────

  _drawTrees(W, H) {
    const g = this.add.graphics().setDepth(-12);
    const rnd = this._rng(4242);
    for (const t of WI_TREES) {
      const bx = W * t.x;
      const by = this._hillY(bx) + 2;
      const h = H * t.h;
      if (t.type === "pine") this._drawPine(g, rnd, bx, by, h);
      else if (t.type === "bush") this._drawBush(g, rnd, bx, h);
      else this._drawRoundTree(g, rnd, bx, by, h);
    }
  }

  _drawRoundTree(g, rnd, bx, by, h) {
    const trunkH = h * 0.42;
    const tw = Math.max(2.5, h * 0.07);
    g.fillStyle(WI_LAND, 1);
    g.fillRect(bx - tw / 2, by - trunkH - 2, tw, trunkH + 2);
    this._pencilSeg(
      g,
      rnd,
      bx - tw / 2,
      by,
      bx - tw / 2 + 0.6,
      by - trunkH,
      1,
      WI_SKETCH,
      0.4,
      0.5,
    );
    this._pencilSeg(
      g,
      rnd,
      bx + tw / 2,
      by,
      bx + tw / 2 - 0.6,
      by - trunkH,
      1,
      WI_SKETCH,
      0.4,
      0.5,
    );

    // coroana: câteva "bucle" suprapuse; conturăm întâi, apoi umplem puțin
    // mai mic, ca liniile din interior să dispară și să rămână doar silueta
    const r0 = h * 0.25;
    const cy = by - trunkH - r0 * 0.6;
    const lobes = [
      [0, 0, r0],
      [-r0 * 0.78, r0 * 0.28, r0 * 0.7],
      [r0 * 0.8, r0 * 0.22, r0 * 0.74],
      [-r0 * 0.25, -r0 * 0.85, r0 * 0.72],
      [r0 * 0.45, -r0 * 0.7, r0 * 0.6],
    ];
    for (const [ox, oy, rr] of lobes)
      this._pencilCircle(g, rnd, bx + ox, cy + oy, rr, 1.1, WI_SKETCH, 0.45);
    g.fillStyle(WI_LAND, 1);
    for (const [ox, oy, rr] of lobes)
      g.fillCircle(bx + ox, cy + oy, Math.max(1, rr - 1.8));

    // câteva hașuri de frunziș
    for (let i = 0; i < 3; i++) {
      const hx = bx + (rnd() - 0.5) * r0 * 1.2;
      const hy = cy + (rnd() - 0.6) * r0 * 1.1;
      this._pencilSeg(
        g,
        rnd,
        hx - r0 * 0.25,
        hy,
        hx + r0 * 0.2,
        hy - r0 * 0.12,
        1,
        WI_SKETCH,
        0.15,
        0.6,
      );
    }
  }

  _drawPine(g, rnd, bx, by, h) {
    const trunkH = h * 0.14;
    const tw = Math.max(2, h * 0.05);
    g.fillStyle(WI_LAND, 1);
    g.fillRect(bx - tw / 2, by - trunkH - 2, tw, trunkH + 2);
    this._pencilSeg(
      g,
      rnd,
      bx - tw / 2,
      by,
      bx - tw / 2,
      by - trunkH,
      1,
      WI_SKETCH,
      0.4,
      0.4,
    );
    this._pencilSeg(
      g,
      rnd,
      bx + tw / 2,
      by,
      bx + tw / 2,
      by - trunkH,
      1,
      WI_SKETCH,
      0.4,
      0.4,
    );

    // trei etaje de crengi; fiecare etaj îl acoperă parțial pe cel de dedesubt
    for (let i = 0; i < 3; i++) {
      const baseY = by - trunkH - i * h * 0.25;
      const topY = baseY - h * (0.4 - i * 0.02);
      const hw = h * (0.25 - i * 0.055);
      g.fillStyle(WI_LAND, 1);
      g.fillTriangle(bx - hw, baseY, bx, topY, bx + hw, baseY);
      this._pencilSeg(
        g,
        rnd,
        bx - hw,
        baseY,
        bx,
        topY,
        1.1,
        WI_SKETCH,
        0.45,
        0.6,
      );
      this._pencilSeg(
        g,
        rnd,
        bx,
        topY,
        bx + hw,
        baseY,
        1.1,
        WI_SKETCH,
        0.45,
        0.6,
      );
      this._pencilSeg(
        g,
        rnd,
        bx - hw,
        baseY,
        bx + hw,
        baseY,
        1,
        WI_SKETCH,
        0.28,
        0.8,
      );
    }
  }

  _drawBush(g, rnd, bx, h) {
    // fiecare bucla stă pe panta dealului de sub ea
    const lobes = [
      [-h * 0.9, h * 0.25, h * 0.62],
      [0, h * 0.05, h * 0.88],
      [h * 0.85, h * 0.3, h * 0.58],
    ].map(([ox, oy, rr]) => ({
      x: bx + ox,
      y: this._hillY(bx + ox) + 2 + oy,
      r: rr,
      oy,
    }));
    for (const l of lobes) {
      const cut = Math.asin(Math.min(0.9, l.oy / l.r));
      this._pencilArc(
        g,
        rnd,
        l.x,
        l.y,
        l.r,
        Math.PI + cut,
        Math.PI * 2 - cut,
        1.1,
        WI_SKETCH,
        0.45,
      );
    }
    g.fillStyle(WI_LAND, 1);
    for (const l of lobes) g.fillCircle(l.x, l.y, Math.max(1, l.r - 1.6));
  }

  _drawPoleAndWires(W, H) {
    const P = this._geo;
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(5225);

    g.fillStyle(0x15181d, 0.96);
    g.fillPoints(
      [
        { x: P.poleX - 6, y: P.poleTop },
        { x: P.poleX + 6, y: P.poleTop },
        { x: P.poleX + 10, y: P.poleBottom },
        { x: P.poleX - 10, y: P.poleBottom },
      ],
      true,
    );
    this._pencilSeg(
      g,
      rnd,
      P.poleX - 6,
      P.poleTop,
      P.poleX - 10,
      P.poleBottom,
      1.4,
      WI_SKETCH,
      0.45,
      1.6,
    );
    this._pencilSeg(
      g,
      rnd,
      P.poleX + 6,
      P.poleTop,
      P.poleX + 10,
      P.poleBottom,
      1.4,
      WI_SKETCH,
      0.45,
      1.6,
    );
    this._pencilSeg(
      g,
      rnd,
      P.poleX - 6,
      P.poleTop,
      P.poleX + 6,
      P.poleTop,
      1.6,
      WI_SKETCH,
      0.5,
      0.8,
    );
    for (let i = 0; i < 4; i++) {
      const gy = P.poleTop + (P.poleBottom - P.poleTop) * (0.2 + i * 0.2);
      this._pencilSeg(
        g,
        rnd,
        P.poleX - 5,
        gy,
        P.poleX + 5,
        gy + 2,
        1,
        WI_SKETCH,
        0.12,
        0.8,
      );
    }

    // smoc de iarbă la baza stâlpului — pare înfipt în deal
    for (const [ox, lean, len] of [
      [-15, -3, 7],
      [-11, 2, 10],
      [-6, -1, 6],
      [7, 1, 7],
      [11, -2, 10],
      [15, 3, 6],
    ]) {
      const gx = P.poleX + ox;
      const gy = this._hillY(gx) + 2.5;
      this._pencilSeg(
        g,
        rnd,
        gx,
        gy,
        gx + lean,
        gy - len,
        1,
        WI_SKETCH,
        0.42,
        0.3,
      );
    }

    const barY = P.yPoleTop - 8;
    this._pencilSeg(
      g,
      rnd,
      P.poleX - 16,
      barY,
      P.poleX + 16,
      barY,
      1.5,
      WI_SKETCH,
      0.5,
      1,
    );
    for (let w = 0; w < 5; w++) {
      const y = P.yPoleTop + (4 - w) * P.spPole;
      const kx = P.poleX + (w % 2 === 0 ? -9 : 9);
      g.fillStyle(WI_SKETCH, 0.5);
      g.fillCircle(kx, y, 2);
    }

    this._wireGfx = g;
    for (let w = 0; w < 5; w++) {
      for (const [xa, xb] of [
        [0, P.poleX],
        [P.poleX, W],
      ]) {
        const segs = 12;
        let prev = { x: xa, y: this._wireYAt(w, xa) };
        for (let i = 1; i <= segs; i++) {
          const x = xa + ((xb - xa) * i) / segs;
          const p = { x, y: this._wireYAt(w, x) };
          this._pencilSeg(
            g,
            rnd,
            prev.x,
            prev.y,
            p.x,
            p.y,
            1.1,
            WI_SKETCH,
            0.36,
            0.7,
          );
          prev = p;
        }
      }
    }
  }

  // corpul păsării (capul și ochiul sunt separate, ca să se poată mișca)
  _drawBirdBody(g, rnd, flip) {
    const d = flip ? -1 : 1;
    g.fillStyle(0xece7d8, 0.95);
    g.fillEllipse(0, -9, 17, 13);
    g.fillEllipse(2 * d, -12, 12, 11);
    g.fillTriangle(-6 * d, -9, -17 * d, -2, -7 * d, -4);
    this._pencilSeg(g, rnd, -2 * d, -12, 5 * d, -7, 1, WI_SKETCH, 0.3, 0.8);
    this._pencilSeg(g, rnd, -2, -2, -2.5, 2, 1, WI_SKETCH, 0.55, 0.3);
    this._pencilSeg(g, rnd, 2, -2, 2.5, 2, 1, WI_SKETCH, 0.55, 0.3);
  }

  // capul, desenat în jurul gâtului (pivotul e la 4d, -14 față de picioare)
  _drawBirdHead(g, flip) {
    const d = flip ? -1 : 1;
    g.fillStyle(0xece7d8, 0.95);
    g.fillCircle(2 * d, -4, 4.6);
    g.fillTriangle(6 * d, -5.5, 6 * d, -3, 11.5 * d, -4);
  }

  _drawWing(g, rnd, s, flip) {
    const d = flip ? -1 : 1;
    g.fillStyle(0xece7d8, 0.95);
    g.fillTriangle(0, 0, -13 * s * d, -7 * s, -3 * s * d, -19 * s);
    g.fillTriangle(0, 0, -3 * s * d, -19 * s, 8 * s * d, -13 * s);
    this._pencilSeg(g, rnd, 0, 0, -3 * s * d, -19 * s, 1, WI_SKETCH, 0.5, 0.8);
    this._pencilSeg(
      g,
      rnd,
      -3 * s * d,
      -19 * s,
      8 * s * d,
      -13 * s,
      1,
      WI_SKETCH,
      0.4,
      0.8,
    );
  }

  _makeBirds() {
    this._birds = [];
    const rndX = this._rng(3663);
    const xs = [0.16, 0.27, 0.36, 0.62, 0.73, 0.85];

    for (let i = 0; i < WI_BIRDS.length; i++) {
      const b = WI_BIRDS[i];
      const x = this._W * xs[i] + (rndX() - 0.5) * 20;
      const y = this._wireYAt(b.pos, x) - 1;
      const cont = this.add.container(x, y).setDepth(-5);
      cont.setAngle((rndX() - 0.5) * 8);
      const rnd = this._rng(1000 + i * 733);
      const flip = rndX() < 0.45;
      const d = flip ? -1 : 1;

      const wFar = this.add.graphics().setVisible(false).setAlpha(0.65);
      this._drawWing(wFar, rnd, 0.85, flip);
      wFar.setPosition(-2 * d, -10);
      cont.add(wFar);

      // "rig" = corpul + capul; respiră și se mișcă, aripile rămân separate
      const rig = this.add.container(0, 0);
      cont.add(rig);

      const g = this.add.graphics();
      this._drawBirdBody(g, rnd, flip);
      rig.add(g);

      const head = this.add.container(4 * d, -14);
      rig.add(head);
      const hg = this.add.graphics();
      this._drawBirdHead(hg, flip);
      head.add(hg);

      // ochiul deschis, cu o mică sclipire
      const eye = this.add.graphics();
      eye.fillStyle(0x101216, 0.95);
      eye.fillCircle(0, 0, 1.6);
      eye.fillStyle(0xffffff, 0.85);
      eye.fillCircle(0.5 * d, -0.6, 0.45);
      eye.setPosition(3 * d, -4.6);
      head.add(eye);

      // ochiul închis: o liniuță curbată ‿
      const lid = this.add.graphics().setVisible(false);
      lid.lineStyle(1.1, 0x1a1c20, 0.95);
      lid.lineBetween(-2.1, -0.4, 0, 0.5);
      lid.lineBetween(0, 0.5, 2.1, -0.4);
      lid.setPosition(3 * d, -4.6);
      head.add(lid);

      const wNear = this.add.graphics().setVisible(false);
      this._drawWing(wNear, rnd, 1, flip);
      wNear.setPosition(1 * d, -11);
      cont.add(wNear);

      cont._wings = [wNear, wFar];
      cont._rig = rig;
      cont._head = head;
      cont._eye = eye;
      cont._lid = lid;
      cont._d = d;
      cont._nextBlink = null; // se stabilesc la primul update
      cont._nextHead = null;
      cont._blinkStart = 0;
      cont._doubles = 0;
      cont._headA = 0;
      cont._headT = 0;
      cont._breathP = 900 + rnd() * 500; // păsările mici respiră repede
      cont._breathPh = rnd() * Math.PI * 2;
      this._birds.push(cont);
    }
  }

  // Păsările respiră, mișcă din cap în smucituri scurte (ca păsările
  // adevărate) și clipesc lin: pleoapa coboară, stă o clipă, apoi urcă.
  _updateBirds(time, dt) {
    const snap = Math.min(1, dt * 0.018); // cât de repede ajunge capul la țintă
    for (const b of this._birds) {
      if (!b._eye) continue;
      if (b._nextBlink === null) {
        b._nextBlink = time + 300 + Math.random() * 2500;
        b._nextHead = time + 500 + Math.random() * 2500;
      }

      // respirație
      const br = Math.sin((time / b._breathP) * Math.PI * 2 + b._breathPh);
      b._rig.scaleY = 1 + 0.035 * br;
      b._rig.scaleX = 1 - 0.012 * br;

      // capul: din când în când se uită în altă parte
      if (time >= b._nextHead) {
        b._headT =
          Math.random() < 0.25 ? 0 : b._d * (-0.35 + Math.random() * 0.6);
        b._nextHead = time + 700 + Math.random() * 3000;
        // păsările clipesc des când întorc capul
        if (!b._blinkStart && Math.random() < 0.4) b._nextBlink = time + 40;
      }
      b._headA += (b._headT - b._headA) * snap;
      b._head.rotation = b._headA;

      // clipit
      if (!b._blinkStart && time >= b._nextBlink) b._blinkStart = time;
      if (b._blinkStart) {
        const t = time - b._blinkStart;
        let sy = 1;
        if (t < 60) sy = 1 - (t / 60) * 0.9;
        else if (t < 110) sy = 0.1;
        else if (t < 200) sy = 0.1 + ((t - 110) / 90) * 0.9;
        b._eye.scaleY = sy;
        b._lid.setVisible(sy < 0.4);
        if (t >= 200) {
          b._blinkStart = 0;
          b._eye.scaleY = 1;
          b._lid.setVisible(false);
          if (b._doubles > 0) {
            b._doubles--;
            b._nextBlink = time + 120;
          } else {
            b._nextBlink = time + 1600 + Math.random() * 3800;
            b._doubles = Math.random() < 0.3 ? 1 : 0;
          }
        }
      }
    }
  }

  // Country porch and harmonica player.
  _drawCountryPorch(W, H) {
    const s = Math.min(W / 980, H / 700) * 1.05;

    // casa în stânga jos
    const x = W * 0.02,
      y = H * 0.98 - 265 * s;
    const g = this.add.graphics().setPosition(x, y).setScale(s).setDepth(-3);
    const rnd = this._rng(9229);

    const line = (x1, y1, x2, y2, alpha = 0.55, width = 1.4) =>
      this._pencilSeg(g, rnd, x1, y1, x2, y2, width, WI_SKETCH, alpha, 0.8);
    const path = (points, alpha = 0.65, width = 1.5) => {
      for (let i = 1; i < points.length; i++)
        line(...points[i - 1], ...points[i], alpha, width);
    };

    // casa din lemn
    g.fillStyle(0x15171b, 1);
    g.fillRect(30, 92, 230, 150);
    g.fillStyle(0x101217, 1);
    g.fillTriangle(12, 95, 141, 17, 276, 95);
    g.fillStyle(0x1d2025, 1);
    g.fillRect(200, 25, 22, 47);
    path(
      [
        [200, 60],
        [200, 25],
        [222, 25],
        [222, 73],
      ],
      0.42,
    );
    line(196, 24, 226, 24, 0.6, 2);
    path(
      [
        [12, 95],
        [141, 17],
        [276, 95],
        [12, 95],
      ],
      0.7,
      2,
    );
    path(
      [
        [23, 96],
        [141, 27],
        [264, 96],
      ],
      0.28,
    );
    for (let i = 0; i < 7; i++)
      line(48 + i * 23, 84 - Math.min(i, 6 - i) * 13, 61 + i * 23, 94, 0.18);
    line(30, 98, 30, 244);
    line(260, 96, 260, 244);
    for (let yy = 111; yy < 238; yy += 14) line(32, yy, 258, yy, 0.18);

    // ușa și fereastra
    g.fillStyle(0x080a0d, 1);
    g.fillRect(170, 136, 46, 104);
    this._pencilRect(g, rnd, 170, 136, 46, 104, 1.3, WI_SKETCH, 0.5, 0.6);
    g.fillStyle(WI_SKETCH, 0.65);
    g.fillCircle(205, 191, 2);
    g.fillStyle(0xb6a276, 0.17);
    g.fillRect(69, 125, 52, 54);
    this._pencilRect(g, rnd, 69, 125, 52, 54, 1.4, WI_SKETCH, 0.7, 0.6);
    line(95, 126, 95, 178, 0.5);
    line(70, 152, 121, 152, 0.5);
    for (const xx of [52, 127]) {
      this._pencilRect(g, rnd, xx, 123, 12, 57, 1, WI_SKETCH, 0.35, 0.5);
      for (let yy = 132; yy < 175; yy += 8) line(xx + 2, yy, xx + 10, yy, 0.3);
    }

    // acoperișul verandei și stâlpii
    g.fillStyle(0x15171b, 1);
    g.fillTriangle(255, 91, 439, 120, 255, 120);
    path(
      [
        [255, 91],
        [439, 120],
        [255, 120],
      ],
      0.55,
      1.7,
    );
    line(428, 121, 428, 242, 0.6, 2.4);
    line(434, 123, 434, 243, 0.25);
    line(27, 242, 452, 242, 0.65, 2);
    path(
      [
        [21, 248],
        [451, 248],
        [467, 263],
        [15, 263],
      ],
      0.4,
    );
    for (let xx = 35; xx < 449; xx += 24) line(xx, 244, xx + 5, 260, 0.2);

    // --- steagul american ---
    const fx = 434,
      fy = 130,
      fw = 45,
      fh = 30;
    g.fillStyle(0x15171b, 0.9);
    g.fillRect(fx, fy, fw, fh);
    this._pencilRect(g, rnd, fx, fy, fw, fh, 1.2, WI_SKETCH, 0.7, 1);
    g.fillStyle(0x0a0c10, 1);
    g.fillRect(fx, fy, fw * 0.4, fh * 0.53);
    this._pencilRect(
      g,
      rnd,
      fx,
      fy,
      fw * 0.4,
      fh * 0.53,
      1,
      WI_SKETCH,
      0.5,
      0.5,
    );
    g.fillStyle(WI_SKETCH, 0.8);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        g.fillCircle(fx + 3 + c * 4, fy + 3 + r * 4.5, 0.6);
      }
    }
    for (let i = 0; i <= 6; i++) {
      let sy = fy + i * (fh / 6.0);
      let sx = i < 3 ? fx + fw * 0.4 : fx;
      line(sx, sy, fx + fw, sy + (rnd() - 0.5) * 2, 0.5, 1);
    }

    // pământ și iarbă
    line(-30, 267, 520, 267, 0.18);
    for (const xx of [-35, -9, 477, 506]) {
      line(xx, 265, xx - 5, 255, 0.3);
      line(xx, 265, xx + 3, 250, 0.3);
    }
    for (let xx = 480; xx < 610; xx += 32) line(xx, 224, xx, 258, 0.2);
    line(477, 234, 607, 234, 0.16);
    line(477, 248, 607, 248, 0.16);

    // --- PERSONAJUL ȘI BALANSOARUL ---
    const chairScale = s * 0.57;
    const chairX = x + 345 * s; // sub acoperișul verandei
    // talpa balansoarului (y local = 4) stă exact pe podeaua verandei (y = 242)
    const chairY = y + 242 * s - 4 * chairScale;

    const chair = this.add
      .graphics()
      .setPosition(chairX, chairY)
      .setScale(chairScale)
      .setDepth(-2);
    const r = this._rng(7441);
    const stroke = (points, width = 1.6, alpha = 0.7) => {
      for (let i = 1; i < points.length; i++)
        this._pencilSeg(
          chair,
          r,
          ...points[i - 1],
          ...points[i],
          width,
          WI_SKETCH,
          alpha,
          0.55,
        );
    };

    // tălpile curbe sunt un arc de cerc cu raza WI_ROCK_R, ca scaunul
    // să se poată rostogoli pe podea fără să intre în ea
    const R = WI_ROCK_R;
    const rockY = (xx, off = 0) => 4 - (R - Math.sqrt(R * R - xx * xx)) + off;
    const rocker = [];
    for (let xx = -60; xx <= 48; xx += 12) rocker.push([xx, rockY(xx)]);
    stroke(rocker, 2.3);
    const rockerIn = [];
    for (let xx = -54; xx <= 36; xx += 15) rockerIn.push([xx, rockY(xx, -6)]);
    stroke(rockerIn, 1.2, 0.35);

    stroke(
      [
        [-48, -112],
        [-26, -44],
        [22, -44],
      ],
      2.6,
    );
    stroke(
      [
        [-41, -110],
        [-20, -49],
      ],
      1.4,
    );
    for (let yy = -101; yy < -54; yy += 13)
      stroke(
        [
          [-45 + (yy + 101) * 0.3, yy],
          [-34 + (yy + 101) * 0.3, yy],
        ],
        1,
        0.45,
      );
    stroke(
      [
        [-25, -44],
        [-36, 0],
      ],
      2,
    );
    stroke(
      [
        [18, -44],
        [29, 0],
      ],
      2,
    );
    stroke(
      [
        [-38, -67],
        [20, -67],
      ],
      2,
    );
    stroke(
      [
        [13, -67],
        [16, -44],
      ],
      1.4,
    );

    chair.fillStyle(0x22252b, 1);
    chair.fillTriangle(-32, -105, -20, -49, 7, -55);
    stroke(
      [
        [-32, -105],
        [-35, -83],
        [-20, -51],
        [10, -53],
        [3, -78],
        [-15, -108],
      ],
      1.6,
    );
    stroke(
      [
        [-18, -52],
        [24, -48],
        [45, -22],
        [62, -14],
      ],
      3.2,
    );
    stroke(
      [
        [-8, -45],
        [20, -39],
        [35, -14],
        [56, -7],
      ],
      2.4,
      0.55,
    );

    stroke(
      [
        [44, -24],
        [51, -23],
        [56, -16],
        [69, -13],
        [71, -9],
        [57, -9],
        [51, -13],
      ],
      1.7,
    );
    stroke(
      [
        [34, -16],
        [40, -15],
        [44, -9],
        [62, -5],
        [64, -1],
        [44, -1],
        [37, -5],
      ],
      1.6,
    );

    chair.fillStyle(0x55534c, 0.45);
    chair.fillEllipse(-22, -123, 22, 29);
    stroke(
      [
        [-30, -133],
        [-16, -133],
        [-11, -124],
        [-6, -121],
        [-12, -118],
        [-12, -111],
        [-24, -108],
        [-29, -114],
      ],
      1.3,
    );
    stroke(
      [
        [-25, -108],
        [-24, -101],
      ],
      1.3,
    );
    chair.fillStyle(0x202329, 1);
    chair.fillEllipse(-26, -137, 58, 9);
    stroke(
      [
        [-54, -137],
        [-39, -140],
        [-37, -153],
        [-25, -157],
        [-14, -150],
        [-11, -139],
        [1, -134],
        [-21, -132],
        [-54, -137],
      ],
      1.5,
    );
    stroke(
      [
        [-38, -141],
        [-13, -140],
      ],
      1,
      0.45,
    );

    stroke(
      [
        [-29, -100],
        [-39, -81],
        [-26, -79],
        [-3, -112],
      ],
      2.3,
    );
    stroke(
      [
        [-13, -100],
        [10, -84],
        [16, -93],
        [6, -114],
      ],
      2.1,
    );
    // muzicuța
    chair.fillStyle(0x9e9c90, 0.55);
    chair.fillRoundedRect(-12, -119, 25, 7, 2);
    stroke(
      [
        [-13, -119],
        [13, -119],
        [13, -112],
        [-12, -112],
      ],
      1,
      0.8,
    );
    for (let xx = -8; xx < 11; xx += 4)
      stroke(
        [
          [xx, -117],
          [xx, -114],
        ],
        1,
        0.65,
      );
    stroke(
      [
        [-5, -112],
        [-7, -120],
        [0, -122],
        [6, -117],
      ],
      1.2,
    );

    // starea balansoarului; mișcarea se calculează în _updateChair()
    this._rock = {
      g: chair,
      baseX: chairX,
      baseY: chairY,
      scale: chairScale,
      sceneScale: s,
      amp: Phaser.Math.DegToRad(9), // cât de tare se leagănă
      bias: Phaser.Math.DegToRad(-2), // se lasă puțin mai mult pe spate
      period: 2600, // ms pentru un du-te-vino complet
    };
  }

  // Balansoarul se rostogolește pe tălpile curbe: se rotește cu θ, iar
  // centrul arcului tălpilor se deplasează orizontal cu R·θ. Așa talpa
  // atinge mereu podeaua, ca la un balansoar adevărat.
  _updateChair(time) {
    const k = this._rock;
    if (!k) return;
    const th = k.bias + k.amp * Math.sin((time / k.period) * Math.PI * 2);
    const cy = 4 - WI_ROCK_R; // centrul arcului, în coordonate locale (0, cy)
    k.g.rotation = th;
    k.g.x = k.baseX + (WI_ROCK_R * th + cy * Math.sin(th)) * k.scale;
    k.g.y = k.baseY + (cy - cy * Math.cos(th)) * k.scale;
  }

  // ── notele muzicale care ies din muzicuță ─────────────────────────────────

  _updateNotes(dt) {
    if (this._rock) {
      this._noteTimer -= dt;
      if (this._noteTimer <= 0) {
        this._spawnNote();
        this._noteTimer = 1800 + Math.random() * 1600; // puține, rare
      }
    }

    for (let i = this._notes.length - 1; i >= 0; i--) {
      const n = this._notes[i];
      n.age += dt;
      const p = n.age / n.life;
      if (p >= 1) {
        n.g.destroy();
        this._notes.splice(i, 1);
        continue;
      }
      const sec = n.age / 1000;
      const rise = 1 - Math.pow(1 - p, 1.5); // urcă repede, apoi plutește
      const wobble = Math.sin(sec * n.freq + n.phase);
      n.g.x = n.x0 + n.dx * p + wobble * n.sway * Math.min(1, p * 3);
      n.g.y = n.y0 - n.rise * rise;
      n.g.rotation = n.rot0 + (n.rot1 - n.rot0) * p + wobble * 0.1;
      const pop = p < 0.1 ? 0.6 + (p / 0.1) * 0.4 : 1;
      n.g.setScale(n.sc * pop);
      const a = p < 0.12 ? p / 0.12 : p > 0.5 ? (1 - p) / 0.5 : 1;
      n.g.setAlpha(a * 0.7);
    }
  }

  _spawnNote() {
    const k = this._rock;
    if (!k || this._notes.length >= 4) return;

    // capătul din dreapta al muzicuței, transformat prin rotația scaunului
    const lx = 14,
      ly = -116;
    const c = Math.cos(k.g.rotation),
      sn = Math.sin(k.g.rotation);
    const wx = k.g.x + (lx * c - ly * sn) * k.scale;
    const wy = k.g.y + (lx * sn + ly * c) * k.scale;
    const S = k.sceneScale;

    this._notes.push({
      g: this._makeNoteGfx(wx, wy),
      x0: wx,
      y0: wy,
      sc: S * (0.85 + Math.random() * 0.25),
      dx: (30 + Math.random() * 60) * S,
      rise: (90 + Math.random() * 80) * S,
      sway: (3 + Math.random() * 5) * S,
      freq: 2 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      rot0: (Math.random() - 0.5) * 0.3,
      rot1: (Math.random() - 0.5) * 0.9,
      life: 3000 + Math.random() * 1200,
      age: 0,
    });
  }

  // notă mică, desenată dintr-o singură linie fină de creion
  _makeNoteGfx(x, y) {
    const g = this.add.graphics().setPosition(x, y).setDepth(15).setAlpha(0);
    const rnd = this._rng(1 + Math.floor(Math.random() * 2147483000));

    const thin = (x1, y1, x2, y2, w = 1) =>
      this._drawPath(
        g,
        this._sketchSeg(rnd, x1, y1, x2, y2, 0.25),
        w,
        WI_NOTE,
        0.95,
      );
    const head = (hx, hy) => {
      const pts = [];
      const ct = Math.cos(-0.45),
        st = Math.sin(-0.45);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const ex = Math.cos(a) * 3,
          ey = Math.sin(a) * 2.1;
        pts.push({ x: hx + ex * ct - ey * st, y: hy + ex * st + ey * ct });
      }
      g.fillStyle(WI_NOTE, 0.95);
      g.fillPoints(pts, true);
    };

    if (Math.random() < 0.65) {
      // ♪
      head(-2.5, 5);
      thin(0.3, 4.5, 0.3, -8);
      thin(0.3, -8, 3.2, -5);
      thin(3.2, -5, 4.2, -2);
    } else {
      // ♫
      head(-5, 6);
      head(3.5, 4.2);
      thin(-2.2, 5.5, -2.2, -7);
      thin(6.3, 3.7, 6.3, -8.8);
      thin(-2.2, -7, 6.3, -8.8, 1.6);
    }
    return g;
  }

  _startMusic() {
    if (!this.cache.audio.exists("wires_music")) return;
    this._music = this.sound.add("wires_music", { loop: true, volume: 0 });
    this.refreshMusicVolume();
    const bgm = window.GameAudio?.bgmInstance;
    if (bgm?.isPlaying) {
      bgm.pause();
      this._pausedBgm = bgm;
    }
    this._music.play();
  }

  refreshMusicVolume() {
    this._music?.setVolume((window.GameAudio?.musicVol ?? 0.5) * 0.7);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "FIVE WIRES. SIX BIRDS.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(
        W - 30,
        28,
        "Level " +
          (window.GAME_LEVELS?.findIndex((l) => l.key === this.scene.key) + 1),
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

  _drawVignette(W, H) {
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.5,
      0.5,
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
      0.55,
      0.55,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.45,
      0,
      0.45,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.45,
      0,
      0.45,
    );
    vg.fillRect(W - v, 0, v, H);
  }

  _spawnDust(W, H) {
    const rnd = this._rng(7997);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.08 + rnd() * W * 0.84;
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
          dot.x = W * 0.08 + rnd() * W * 0.84;
          dot.y = H * 0.08 + rnd() * H * 0.45;
          dot.setAlpha(0.08 + rnd() * 0.1);
        },
      });
    }
  }

  _teardown() {
    this._built = false;
    for (const n of this._notes || []) n.g.destroy();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._birds = [];
    this._notes = [];
    this._rock = null;
  }

  shutdown() {
    this._built = false;
    if (this._onResize) this.events.off("canvas_resized", this._onResize);
    this._onResize = null;
    this._music?.destroy();
    this._music = null;
    if (this._pausedBgm?.isPaused) this._pausedBgm.resume();
    this._pausedBgm = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._birds = [];
    this._notes = [];
    this._rock = null;
  }
}
