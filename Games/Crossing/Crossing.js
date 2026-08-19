// ─────────────────────────────────────────────────────────────────────────────
// Level — "CROSSING"  ·  code: WALK  ·  chamber XV  ·  read the stripes
//
// Drawn in the game's pencil-sketch idiom: standing at the curb at night,
// about to cross. One tall block on the left, one on the right — a café
// glowing under its awning at the far sidewalk — and open sky between them,
// moon and stars over a distant skyline. The signals still cycle.
//
// The crossing runs straight away from you, up the screen: wide at your
// feet, narrow at the far curb. Its stripes — the rungs of the zebra — are
// stacked in depth, and they run wide and narrow like the barcode on a
// packet. The bars and gaps are real Code 39 glyphs (no * sentinels — just
// the letters), read from where you stand, bottom to top:
//
//   G O   →   GO
//
// Only ten stripes, so at a glance it is just a slightly worn crossing.
// Nothing on screen says "barcode." The walk signal's green and a few warm
// windows are the only living colours; the code is the proof.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, same scene contract as the other levels:
// GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const CR_SKETCH = 0xd8d2c4; // the pencil itself
const CR_PAINT = 0xdcd6c8; // road paint — worn cream
const CR_GREEN = 0x3ad06a; // the walk signal's living colour
const CR_WARM = 0xffdf9e; // lit windows and lamplight
const CR_WORD = "GO";
const CR_WIDE = 2.6; // wide : narrow stripe ratio (Code 39)
const CR_PERSP = 0.9; // foreshortening: how hard the far stripes compress

// Code 39 — each glyph is 9 elements (bar,space,bar,…,bar), 3 of them wide
const CR_CODE39 = {
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw",
  E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn",
  I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww",
  M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn",
  Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw",
  Y: "wwnnwnnnn", Z: "nwwnwnnnn", "0": "nnnwwnwnn", "1": "wnnwnnnnw",
  "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn",
  "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  "*": "nwnnwnwnn",
};

class CrossingScene extends Phaser.Scene {
  constructor() {
    super({ key: "Crossing" });
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

  // ── the pencil: jittered hand-drawn primitives (shared idiom) ──────────────

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
    const o = 4;
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 16, mag = 1.4) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * mag;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ordered element list for a Code 39 string — bare letters, no sentinels,
  // so the crossing keeps a plausible stripe count
  _code39(word) {
    const full = word.toUpperCase();
    const els = [];
    for (let k = 0; k < full.length; k++) {
      const pat = CR_CODE39[full[k]];
      if (!pat) continue;
      for (let i = 0; i < 9; i++) {
        els.push({ bar: i % 2 === 0, w: pat[i] === "w" ? CR_WIDE : 1 });
      }
      if (k < full.length - 1) els.push({ space: true, bar: false, w: 1 });
    }
    return els;
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    // the far sidewalk: buildings stand on it, the road runs from it to us
    this._baseY = H * 0.5; // building bases / far sidewalk top
    this._curbY = H * 0.565; // far curb — the road begins here

    this._drawSky(W, H);
    this._drawMoon(W, H);
    this._drawFarRooftops(W, H);
    this._drawBuilding(W, H, "left");
    this._drawBuilding(W, H, "right");
    this._drawSidewalkAndRoad(W, H);
    this._drawBarcodeCrossing(W, H);
    this._drawStreetlamp(W * 0.06, 1);
    this._drawStreetlamp(W * 0.94, -1);
    this._drawTrafficLight(W * 0.315);
    this._drawPedSignal(W * 0.685);
    this._drawParkedCar(W, H);
    this._makeSteam(W * 0.88, H * 0.845);
    this._drawCat(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
  }

  _drawSky(W, H) {
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(0x0b0d12, 0x0d0f15, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    // twinkling stars, Pi-style
    const rnd = this._rng(7551);
    for (let i = 0; i < 30; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.4;
      const dot = this.add
        .circle(x, y, 0.6 + rnd() * 1, 0xffffff, 1)
        .setAlpha(0.12 + rnd() * 0.25)
        .setDepth(-19);
      this.tweens.add({
        targets: dot,
        alpha: 0.55 + rnd() * 0.3,
        duration: 1400 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // two thin drifting cloud strokes
    const cg = this.add.graphics().setDepth(-18);
    const rndC = this._rng(919);
    for (const cy of [H * 0.09, H * 0.2]) {
      const cx = W * (0.3 + rndC() * 0.35);
      const cw = W * (0.1 + rndC() * 0.12);
      this._pencilSeg(cg, rndC, cx, cy, cx + cw, cy + (rndC() - 0.5) * 6, 1.2, CR_SKETCH, 0.08, 2);
      this._pencilSeg(cg, rndC, cx + cw * 0.2, cy + 6, cx + cw * 0.85, cy + 5, 1, CR_SKETCH, 0.05, 2);
    }
  }

  _drawMoon(W, H) {
    const g = this.add.graphics().setDepth(-17);
    const rnd = this._rng(3113);
    const mx = W * 0.5;
    const my = H * 0.15;
    const r = Math.min(W, H) * 0.052;

    g.fillStyle(0xffffff, 0.03);
    g.fillCircle(mx, my, r * 2.1);
    g.fillStyle(0xffffff, 0.05);
    g.fillCircle(mx, my, r * 1.4);
    g.fillStyle(0xe8e2d2, 0.12);
    g.fillCircle(mx, my, r);
    this._pencilCircle(g, rnd, mx, my, r, 1.4, CR_SKETCH, 0.5);
    this._pencilCircle(g, rnd, mx - r * 0.3, my - r * 0.25, r * 0.22, 1, CR_SKETCH, 0.3);
    this._pencilCircle(g, rnd, mx + r * 0.35, my + r * 0.2, r * 0.16, 1, CR_SKETCH, 0.25);
    this._pencilCircle(g, rnd, mx - r * 0.05, my + r * 0.42, r * 0.12, 1, CR_SKETCH, 0.22);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.75 + i * 0.1);
      this._pencilSeg(
        g, rnd,
        mx + Math.cos(a) * r * 0.55, my + Math.sin(a) * r * 0.55,
        mx + Math.cos(a) * r * 0.92, my + Math.sin(a) * r * 0.92,
        1, CR_SKETCH, 0.12, 0.8,
      );
    }
  }

  // the distant skyline across the middle gap — pure silhouette
  _drawFarRooftops(W, H) {
    const g = this.add.graphics().setDepth(-13);
    const rnd = this._rng(6446);
    const base = this._baseY;
    let x = -10;
    g.fillStyle(0x0b0d11, 1);
    g.beginPath();
    g.moveTo(-10, base);
    while (x < W + 10) {
      const w = Math.max(24, W * (0.05 + rnd() * 0.09));
      const top = base - H * (0.1 + rnd() * 0.13);
      g.lineTo(x, top);
      g.lineTo(x + w, top);
      x += w;
    }
    g.lineTo(W + 10, base);
    g.closePath();
    g.fillPath();
    // a few far windows still awake
    for (let i = 0; i < 3; i++) {
      const wx = W * (0.36 + rnd() * 0.28);
      const wy = base - H * (0.04 + rnd() * 0.11);
      const dot = this.add.rectangle(wx, wy, 3, 4, CR_WARM, 0.5).setDepth(-12);
      this.tweens.add({
        targets: dot, alpha: 0.2, duration: 2000 + rnd() * 2000,
        delay: rnd() * 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    }
  }

  // one tall block per side, in Pi's sleeping-city treatment
  _drawBuilding(W, H, side) {
    const left = side === "left";
    const o = left
      ? { x0: -0.02, x1: 0.3, top: 0.07, seed: 11, lit: 0.24, cols: 4, chimney: true, fireEscape: true }
      : { x0: 0.7, x1: 1.02, top: 0.11, seed: 77, lit: 0.24, cols: 4, cornice: true, cafe: true };

    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(o.seed * 977 + 5);
    const base = this._baseY;
    const bx = W * o.x0;
    const bw = W * (o.x1 - o.x0);
    const by = H * o.top;
    const bh = base - by;

    // body: near-black fill, faint graphite wash, pencil frame
    g.fillStyle(0x14171d, 0.97);
    g.fillRect(bx, by, bw, bh);
    g.fillStyle(CR_SKETCH, 0.03);
    g.fillRect(bx, by, bw, bh);
    this._pencilRect(g, rnd, bx, by, bw, bh, 1.6, CR_SKETCH, 0.5, 2);

    // roofline
    if (o.cornice) {
      this._pencilSeg(g, rnd, bx - 8, by, bx + bw + 8, by, 1.6, CR_SKETCH, 0.55, 1.6);
      this._pencilSeg(g, rnd, bx - 5, by + 6, bx + bw + 5, by + 6, 1.1, CR_SKETCH, 0.3, 1.4);
      for (let x = bx + 8; x < bx + bw - 6; x += 14) {
        g.lineStyle(1, CR_SKETCH, 0.2);
        g.lineBetween(x, by + 6, x, by + 10);
      }
    } else {
      this._pencilSeg(g, rnd, bx - 6, by, bx + bw + 6, by, 1.5, CR_SKETCH, 0.5, 1.6);
    }

    // rooftop props
    if (o.chimney) {
      const chx = bx + bw * 0.55;
      const chw = bw * 0.08;
      const chh = H * 0.045;
      g.fillStyle(0x101216, 1);
      g.fillRect(chx, by - chh, chw, chh + 2);
      this._pencilRect(g, rnd, chx, by - chh, chw, chh, 1.2, CR_SKETCH, 0.4, 1);
      this._makeSmoke(chx + chw / 2, by - chh);
    } else {
      // a rooftop water tank on the right block
      const tx = bx + bw * 0.2;
      const tw = bw * 0.16;
      const th = H * 0.05;
      const ty = by - th - 8;
      g.lineStyle(1.2, CR_SKETCH, 0.4);
      g.lineBetween(tx + 3, ty + th, tx + 1, by);
      g.lineBetween(tx + tw - 3, ty + th, tx + tw - 1, by);
      g.fillStyle(0x101216, 1);
      g.fillRect(tx, ty, tw, th);
      this._pencilRect(g, rnd, tx, ty, tw, th, 1.2, CR_SKETCH, 0.45, 1);
      this._pencilSeg(g, rnd, tx - 2, ty, tx + tw / 2, ty - 8, 1.1, CR_SKETCH, 0.4, 0.8);
      this._pencilSeg(g, rnd, tx + tw / 2, ty - 8, tx + tw + 2, ty, 1.1, CR_SKETCH, 0.4, 0.8);
    }

    // ground floor: café (right) or a doorway with a lamp (left)
    const groundH = Math.min(H * 0.075, bh * 0.24);
    if (o.cafe) {
      this._drawCafe(g, rnd, bx, bw, groundH);
    } else {
      const doorW = bw * 0.12;
      const doorX = bx + bw * 0.72;
      this._pencilRect(g, rnd, doorX, base - groundH * 0.85, doorW, groundH * 0.85, 1.3, CR_SKETCH, 0.4, 1);
      const lx = doorX + doorW / 2;
      const ly = base - groundH * 0.85 - 8;
      this.add.circle(lx, ly, 12, CR_WARM, 0.06).setDepth(-7);
      this.add.circle(lx, ly, 2.6, CR_WARM, 0.75).setDepth(-7);
    }

    // upper windows — mostly asleep, a few warm and breathing
    const floors = Math.max(3, Math.round((bh - groundH) / (H * 0.08)));
    const cols = o.cols;
    const mX = bw * 0.12;
    const winW = (bw - mX * 2) / (cols * 1.6 - 0.6);
    const areaH = bh - groundH - 16;
    const floorH = areaH / floors;
    const winH = Math.min(floorH * 0.52, H * 0.04);
    const litRng = this._rng(o.seed * 431 + 3);
    for (let f = 0; f < floors; f++) {
      const rowY = by + 14 + f * floorH + floorH * 0.2;
      for (let c = 0; c < cols; c++) {
        const wx = bx + mX + c * winW * 1.6;
        const cx = wx + winW / 2;
        const cy = rowY + winH / 2;
        if (cx < -winW || cx > W + winW) continue;
        if (litRng() < o.lit) {
          const glow = this.add.circle(cx, cy, winW * 1.3, CR_WARM, 0.05).setDepth(-7);
          const pane = this.add.rectangle(cx, cy, winW, winH, CR_WARM, 0.75).setDepth(-6);
          pane.setAlpha(0.6 + litRng() * 0.2);
          this.tweens.add({
            targets: [pane, glow],
            alpha: { from: pane.alpha, to: pane.alpha - 0.14 },
            duration: 2200 + litRng() * 2600,
            delay: litRng() * 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        } else {
          const pane = this.add.rectangle(cx, cy, winW, winH, 0x14171d, 0).setDepth(-6);
          pane.setStrokeStyle(1, CR_SKETCH, 0.13);
          if (litRng() < 0.5) {
            const mg = this.add.graphics().setDepth(-6);
            mg.lineStyle(1, CR_SKETCH, 0.08);
            mg.lineBetween(cx - winW / 2, cy, cx + winW / 2, cy);
            mg.lineBetween(cx, cy - winH / 2, cx, cy + winH / 2);
          }
        }
      }
    }

    // fire escape: a narrow ladder of landings down the street-facing edge
    if (o.fireEscape) {
      const fg = this.add.graphics().setDepth(-7);
      const fx0 = bx + bw * 0.84;
      const fx1 = bx + bw * 0.97;
      let fy = by + bh * 0.16;
      const step = (bh * 0.62) / 5;
      for (let i = 0; i < 5; i++) {
        // landing with a thin rail above it
        this._pencilSeg(fg, rnd, fx0, fy, fx1, fy, 1.1, CR_SKETCH, 0.3, 0.8);
        fg.lineStyle(1, CR_SKETCH, 0.16);
        fg.lineBetween(fx0, fy - 4, fx1, fy - 4);
        fg.lineBetween(fx0, fy, fx0, fy - 4);
        fg.lineBetween(fx1, fy, fx1, fy - 4);
        // shallow stair diagonal to the next landing
        const a = i % 2 === 0 ? fx1 : fx0;
        const b = i % 2 === 0 ? fx0 : fx1;
        fg.lineStyle(1, CR_SKETCH, 0.2);
        fg.lineBetween(a, fy, b, fy + step);
        fy += step;
      }
    }
  }

  _drawCafe(g, rnd, bx, bw, groundH) {
    const base = this._baseY;
    const top = base - groundH;

    // glowing shopfront window with mullions
    const winX = bx + bw * 0.1;
    const winW = bw * 0.42;
    const winY = top + groundH * 0.24;
    const winH = groundH * 0.6;
    this.add.rectangle(winX + winW / 2, winY + winH / 2, winW, winH, CR_WARM, 0.35).setDepth(-7);
    this.add.circle(winX + winW / 2, winY + winH / 2, winW * 0.6, CR_WARM, 0.05).setDepth(-7);
    this._pencilRect(g, rnd, winX, winY, winW, winH, 1.3, CR_SKETCH, 0.5, 1);
    g.lineStyle(1, CR_SKETCH, 0.3);
    g.lineBetween(winX + winW / 3, winY, winX + winW / 3, winY + winH);
    g.lineBetween(winX + (2 * winW) / 3, winY, winX + (2 * winW) / 3, winY + winH);

    // the door beside it
    const doorX = bx + bw * 0.58;
    const doorW = bw * 0.14;
    this._pencilRect(g, rnd, doorX, winY, doorW, winH + groundH * 0.14, 1.3, CR_SKETCH, 0.45, 1);

    // scalloped awning over the shopfront
    const awnY = top + groundH * 0.16;
    const awnX0 = bx + bw * 0.06;
    const awnX1 = bx + bw * 0.76;
    g.fillStyle(0x1a1d24, 1);
    g.fillTriangle(awnX0, awnY, awnX1, awnY, awnX1, awnY - 11);
    g.fillTriangle(awnX0, awnY, awnX1, awnY - 11, awnX0, awnY - 11);
    this._pencilSeg(g, rnd, awnX0 - 2, awnY - 11, awnX1 + 2, awnY - 11, 1.3, CR_SKETCH, 0.5, 1.2);
    const scallops = 6;
    const sw = (awnX1 - awnX0) / scallops;
    for (let i = 0; i < scallops; i++) {
      const sx = awnX0 + i * sw;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        pts.push({ x: sx + sw * t, y: awnY + Math.sin(t * Math.PI) * 5 });
      }
      this._drawPath(g, pts, 1.2, CR_SKETCH, 0.45);
    }

    // a small hanging sign that sways
    const sx = bx + bw * 0.8;
    const sy = top + groundH * 0.2;
    const sign = this.add.container(sx, sy).setDepth(-7);
    const sg = this.add.graphics();
    sg.lineStyle(1.2, CR_SKETCH, 0.5);
    sg.lineBetween(0, 0, 0, 9);
    sg.fillStyle(0x1a1d24, 1);
    sg.fillRect(-14, 9, 28, 15);
    sg.lineStyle(1.2, CR_SKETCH, 0.55);
    sg.strokeRect(-14, 9, 28, 15);
    sign.add(sg);
    const txt = this.add
      .text(0, 16.5, "CAFE", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "9px",
        color: "#c9bfa4",
      })
      .setOrigin(0.5);
    sign.add(txt);
    this.tweens.add({
      targets: sign, angle: 3, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    // lamplight spilling onto the far sidewalk
    this.add
      .ellipse(winX + winW / 2, base + 5, winW * 1.3, 12, CR_WARM, 0.05)
      .setDepth(-7);
  }

  _makeSmoke(x, y) {
    const rnd = this._rng(Math.round(x));
    for (let i = 0; i < 3; i++) {
      const puff = this.add.circle(x, y, 3 + rnd() * 2, CR_SKETCH, 0.1).setDepth(-9);
      const drift = (rnd() - 0.3) * 24;
      const dur = 5200 + rnd() * 2400;
      this.tweens.add({
        targets: puff,
        y: y - 34 - rnd() * 16,
        x: x + drift,
        scale: 2.2,
        alpha: 0,
        duration: dur,
        delay: i * (dur / 3),
        repeat: -1,
        onRepeat: () => {
          puff.setPosition(x, y);
          puff.setScale(1);
          puff.setAlpha(0.1);
        },
      });
    }
  }

  // ── far sidewalk, curb, and the road running toward the viewer ─────────────

  _drawSidewalkAndRoad(W, H) {
    const g = this.add.graphics().setDepth(-10);
    const rnd = this._rng(2233);
    const base = this._baseY;
    const curb = this._curbY;

    // far sidewalk slab
    g.fillStyle(0x181a1f, 1);
    g.fillRect(0, base, W, curb - base);
    this._pencilSeg(g, rnd, 0, base, W, base, 1.4, CR_SKETCH, 0.35, 2);
    g.lineStyle(1, CR_SKETCH, 0.12);
    for (let x = 30; x < W; x += 85) {
      g.lineBetween(x, base + 2, x + 4, curb - 2);
    }
    // far curb: doubled edge
    this._pencilSeg(g, rnd, 0, curb, W, curb, 1.6, CR_SKETCH, 0.4, 1.6);
    this._pencilSeg(g, rnd, 0, curb + 4, W, curb + 4, 1, CR_SKETCH, 0.2, 1.6);

    // asphalt, all the way down to our feet
    g.fillStyle(0x121419, 1);
    g.fillRect(0, curb + 5, W, H - curb - 5);
    // worn patches, bigger near the viewer
    for (let i = 0; i < 9; i++) {
      const t = rnd();
      const y = curb + 20 + t * (H - curb - 30);
      g.fillStyle(0x000000, 0.05 + rnd() * 0.05);
      g.fillCircle(rnd() * W, y, (10 + rnd() * 16) * (0.6 + t));
    }
    // a manhole cover off to the right
    const mhX = W * 0.88;
    const mhY = H * 0.86;
    this._pencilCircle(g, rnd, mhX, mhY, 15, 1.2, CR_SKETCH, 0.3, 14, 1);
    this._pencilCircle(g, rnd, mhX, mhY, 10, 1, CR_SKETCH, 0.2, 12, 0.8);
    g.lineStyle(1, CR_SKETCH, 0.15);
    for (let i = -1; i <= 1; i++) g.lineBetween(mhX - 7, mhY + i * 5, mhX + 7, mhY + i * 5);
  }

  // the crossing: runs from our feet to the far curb, wide → narrow,
  // its stacked rungs spelling *WALK* in Code 39, read bottom to top
  _drawBarcodeCrossing(W, H) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(4848);
    const cx = W / 2;
    const yBot = H * 1.0; // at our feet, off the frame's edge
    const yTop = this._curbY + 5; // the far curb
    const halfBot = W * 0.17; // wide where we stand
    const halfTop = W * 0.062; // narrow at the far side

    // projective foreshortening: world t ∈ [0,1] (near → far) to screen s
    const p = CR_PERSP;
    const s = (t) => ((1 + p) * t) / (1 + p * t);

    const els = this._code39(CR_WORD);
    const totalW = els.reduce((sum, e) => sum + e.w, 0);

    let u = 0;
    for (const e of els) {
      const t0 = u / totalW;
      const t1 = (u + e.w) / totalW;
      u += e.w;
      if (!e.bar) continue;
      const s0 = s(t0);
      const s1 = s(t1);
      const y0 = yBot + (yTop - yBot) * s0;
      const y1 = yBot + (yTop - yBot) * s1;
      const hw0 = halfBot + (halfTop - halfBot) * s0;
      const hw1 = halfBot + (halfTop - halfBot) * s1;
      g.fillStyle(CR_PAINT, 0.85);
      g.beginPath();
      g.moveTo(cx - hw0, y0);
      g.lineTo(cx + hw0, y0);
      g.lineTo(cx + hw1, y1);
      g.lineTo(cx - hw1, y1);
      g.closePath();
      g.fillPath();
      // a worn scuff across the rung
      g.fillStyle(0x000000, 0.05);
      const sy = (y0 + y1) / 2;
      g.fillRect(cx - hw0 * 0.4 + rnd() * hw0 * 0.5, Math.min(y0, y1), hw0 * 0.3, Math.abs(y1 - y0) * 0.5);
    }

    // faint pencil edges tracing the crossing's sides
    this._pencilSeg(g, rnd, cx - halfBot, yBot - 2, cx - halfTop, yTop, 1.1, CR_SKETCH, 0.14, 1.4);
    this._pencilSeg(g, rnd, cx + halfBot, yBot - 2, cx + halfTop, yTop, 1.1, CR_SKETCH, 0.14, 1.4);
  }

  _drawStreetlamp(px, dir) {
    const H = this._H;
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(Math.round(px) * 7 + 1);
    const base = this._curbY + 2;
    const top = H * 0.24;

    this._pencilSeg(g, rnd, px, base, px, top + 14, 1.8, CR_SKETCH, 0.45, 1.2);
    this._pencilSeg(g, rnd, px, top + 14, px + 10 * dir, top + 4, 1.5, CR_SKETCH, 0.45, 0.8);
    this._pencilSeg(g, rnd, px + 10 * dir, top + 4, px + 22 * dir, top, 1.5, CR_SKETCH, 0.45, 0.8);

    const lx = px + 24 * dir;
    const ly = top + 2;
    g.fillStyle(CR_WARM, 0.05);
    g.fillCircle(lx, ly, 26);
    g.fillStyle(CR_WARM, 0.1);
    g.fillCircle(lx, ly, 13);
    g.fillStyle(CR_WARM, 0.85);
    g.fillCircle(lx, ly, 4.5);
    this._pencilSeg(g, rnd, lx - 7, ly - 5, lx + 7, ly - 5, 1.3, CR_SKETCH, 0.5, 0.6);

    g.fillStyle(CR_WARM, 0.028);
    g.fillTriangle(lx, ly, lx - 34, base + 12, lx + 34, base + 12);
    g.fillStyle(CR_WARM, 0.05);
    g.fillEllipse(lx, base + 10, 74, 14);

    this._pencilSeg(g, rnd, px - 5, base, px + 5, base, 1.5, CR_SKETCH, 0.4, 0.6);
  }

  _drawTrafficLight(px) {
    const H = this._H;
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(5252);
    const base = this._curbY + 2;
    const top = H * 0.33;

    this._pencilSeg(g, rnd, px, base, px, top, 1.5, CR_SKETCH, 0.42, 1);
    this._pencilSeg(g, rnd, px - 4, base, px + 4, base, 1.4, CR_SKETCH, 0.4, 0.5);

    const hw = 22;
    const hh = 56;
    const hx = px - hw / 2;
    const hy = top - hh;
    g.fillStyle(0x0c0e12, 0.97);
    g.fillRoundedRect(hx, hy, hw, hh, 5);
    this._pencilRect(g, rnd, hx, hy, hw, hh, 1.3, CR_SKETCH, 0.45, 1);
    const lamps = [0xd0483a, 0xe0a63a, CR_GREEN];
    for (let i = 0; i < 3; i++) {
      const cyL = hy + 11 + i * 17;
      const live = i === 2;
      this._pencilSeg(g, rnd, hx + 2, cyL - 7, hx + hw - 2, cyL - 7, 1, CR_SKETCH, 0.25, 0.5);
      if (live) {
        g.fillStyle(lamps[i], 0.16);
        g.fillCircle(px, cyL, 12);
      }
      g.fillStyle(lamps[i], live ? 0.9 : 0.16);
      g.fillCircle(px, cyL, 5.5);
      this._pencilCircle(g, rnd, px, cyL, 5.5, 1, CR_SKETCH, 0.25, 10, 0.5);
    }
  }

  _drawPedSignal(px) {
    const H = this._H;
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(6363);
    const base = this._curbY + 2;
    const top = H * 0.37;

    this._pencilSeg(g, rnd, px, base, px, top, 1.5, CR_SKETCH, 0.42, 1);
    this._pencilSeg(g, rnd, px - 4, base, px + 4, base, 1.4, CR_SKETCH, 0.4, 0.5);

    const bw = 30;
    const bh = 36;
    const bx = px - bw / 2;
    const by = top - bh;
    g.fillStyle(0x0c0e12, 0.97);
    g.fillRoundedRect(bx, by, bw, bh, 5);
    this._pencilRect(g, rnd, bx, by, bw, bh, 1.3, CR_SKETCH, 0.45, 1);
    g.fillStyle(CR_GREEN, 0.15);
    g.fillCircle(px, by + bh / 2, 19);

    const wg = this.add.graphics().setDepth(-3);
    const fx = px;
    const fy = by + bh / 2;
    wg.lineStyle(2.2, CR_GREEN, 0.95);
    wg.fillStyle(CR_GREEN, 0.95);
    wg.fillCircle(fx + 1, fy - 9, 2.3);
    wg.lineBetween(fx + 1, fy - 7, fx - 1, fy + 2);
    wg.lineBetween(fx - 1, fy + 2, fx - 6, fy + 9);
    wg.lineBetween(fx - 1, fy + 2, fx + 6, fy + 8);
    wg.lineBetween(fx, fy - 4, fx - 5, fy - 1);
    wg.lineBetween(fx, fy - 4, fx + 6, fy - 7);
    this.tweens.add({
      targets: wg, alpha: 0.5, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }

  _drawParkedCar(W, H) {
    const g = this.add.graphics().setDepth(-5);
    const rnd = this._rng(5885);
    const cw = W * 0.085;
    const ch = H * 0.042;
    const cxx = W * 0.115;
    const y0 = this._curbY + 12;
    const x0 = cxx - cw / 2;

    g.fillStyle(0x101216, 1);
    g.fillRoundedRect(x0, y0, cw, ch, ch * 0.35);
    g.fillRoundedRect(x0 + cw * 0.22, y0 - ch * 0.5, cw * 0.5, ch * 0.6, ch * 0.25);
    this._pencilSeg(g, rnd, x0 + 2, y0, x0 + cw - 2, y0, 1.2, CR_SKETCH, 0.4, 1);
    this._pencilSeg(g, rnd, x0 + cw * 0.22, y0 - ch * 0.5 + 2, x0 + cw * 0.72, y0 - ch * 0.5 + 2, 1.1, CR_SKETCH, 0.4, 0.8);
    g.lineStyle(1, CR_SKETCH, 0.3);
    g.strokeRect(x0 + cw * 0.28, y0 - ch * 0.38, cw * 0.38, ch * 0.38);
    const wy = y0 + ch * 0.92;
    for (const wx of [x0 + cw * 0.22, x0 + cw * 0.78]) {
      g.fillStyle(0x0a0b0e, 1);
      g.fillCircle(wx, wy, ch * 0.28);
      this._pencilCircle(g, rnd, wx, wy, ch * 0.28, 1.1, CR_SKETCH, 0.4, 10, 0.6);
    }
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(cxx, wy + ch * 0.3, cw * 1.05, ch * 0.3);
  }

  // slow steam breathing out of the manhole grate
  _makeSteam(x, y) {
    const rnd = this._rng(Math.round(x) * 3 + 7);
    for (let i = 0; i < 4; i++) {
      const puff = this.add
        .circle(x + (rnd() - 0.5) * 10, y, 5 + rnd() * 4, CR_SKETCH, 0.06)
        .setDepth(-5);
      const drift = (rnd() - 0.5) * 30;
      const dur = 6400 + rnd() * 3000;
      this.tweens.add({
        targets: puff,
        y: y - 60 - rnd() * 30,
        x: x + drift,
        scale: 2.6,
        alpha: 0,
        duration: dur,
        delay: i * (dur / 4),
        repeat: -1,
        onRepeat: () => {
          puff.setPosition(x + (rnd() - 0.5) * 10, y);
          puff.setScale(1);
          puff.setAlpha(0.06);
        },
      });
    }
  }

  // a cat sitting on the far sidewalk, tail swaying, eyes blinking
  _drawCat(W, H) {
    const cx = W * 0.62;
    const cy = this._curbY - 2; // sitting on the far sidewalk, at the curb
    const s = H * 0.03; // body height scale
    const cont = this.add.container(cx, cy).setDepth(-9);
    const g = this.add.graphics();

    // seated silhouette: haunches, chest, head, ears
    g.fillStyle(0x0a0b0e, 1);
    g.fillEllipse(0, -s * 0.5, s * 1.3, s * 1.05); // haunches
    g.fillEllipse(s * 0.42, -s * 0.85, s * 0.75, s * 1.25); // upright chest
    g.fillCircle(s * 0.5, -s * 1.62, s * 0.42); // head
    g.fillTriangle(s * 0.24, -s * 1.82, s * 0.38, -s * 2.12, s * 0.52, -s * 1.9); // ear
    g.fillTriangle(s * 0.52, -s * 1.92, s * 0.66, -s * 2.16, s * 0.76, -s * 1.78); // ear
    // faint pencil rim so it reads against the dark slab
    g.lineStyle(1, CR_SKETCH, 0.22);
    g.strokeCircle(s * 0.5, -s * 1.62, s * 0.42);
    cont.add(g);

    // the tail: its own graphics so it can sway
    const tail = this.add.graphics();
    tail.lineStyle(2.2, 0x0a0b0e, 1);
    tail.beginPath();
    tail.arc(-s * 1.1, -s * 0.16, s * 0.62, -0.3, Math.PI * 0.8, false);
    tail.strokePath();
    tail.setPosition(s * 0.0, 0);
    cont.add(tail);
    this.tweens.add({
      targets: tail,
      angle: 14,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // two warm eyes that blink shut now and then
    const eyes = this.add.container(0, 0);
    for (const ex of [s * 0.38, s * 0.6]) {
      eyes.add(this.add.rectangle(ex, -s * 1.64, s * 0.11, s * 0.09, CR_WARM, 0.9));
    }
    cont.add(eyes);
    const blink = () => {
      this.tweens.add({
        targets: eyes,
        scaleY: 0.08,
        duration: 90,
        yoyo: true,
        onComplete: () => {
          this.time.delayedCall(2200 + Math.random() * 3800, blink);
        },
      });
    };
    this.time.delayedCall(1600, blink);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "THE LIGHTS STILL CHANGE FOR NO ONE.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level " + (window.GAME_LEVELS.findIndex((l) => l.key === this.scene.key) + 1), {
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

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
