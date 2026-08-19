// ─────────────────────────────────────────────────────────────────────────────
// Level — "TAPCODE"  ·  code: ESCAPE  ·  chamber XX  ·  count the knocks
//
// The corner of an abandoned cell, drawn in the game's pencil-sketch idiom:
// a wall of coursed ashlar blocks, a deep barred window with night sky
// behind it, and one shaft of cold moonlight that throws the bars across
// the floor. A wooden cot, a shackle and chain, straw, a tin cup — and on
// one great slab of the wall, a message gouged in the old prisoner's tap
// code — a 5×5 grid of letters (K borrows C's square), each letter two
// numbers: row of marks, then column of marks.
//
//        1 2 3 4 5
//     1  A B C D E
//     2  F G H I J
//     3  L M N O P
//     4  Q R S T U
//     5  V W X Y Z
//
//   (1,5)(4,3)(1,3)(1,1)(3,5)(1,5)   →   E S C A P E
//
// Six lines, two clusters of marks each. Nothing names the cipher; the
// longest cluster is five, which gives the grid away to anyone who knows
// it, and someone began numbering the window panes — 1 over the first
// column, 1 beside the first row — and stopped. The code is the proof.
//
// All static jitter is deterministic (seeded), so the sketch holds still
// across redraws. Canvas-drawn, same scene contract as the other levels:
// GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const TC_SKETCH = 0xd8d2c4; // the scratch / the pencil
const TC_LIGHT = 0x9fb4d6; // cold moonlight — the one living tint
const TC_WORD = "ESCAPE";
const TC_GRID = ["ABCDE", "FGHIJ", "LMNOP", "QRSTU", "VWXYZ"]; // K → C

class TapCodeScene extends Phaser.Scene {
  constructor() {
    super({ key: "TapCode" });
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

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 14, mag = 1) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * mag;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _fillPoly(g, pts, color, alpha) {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
  }

  // char → [row, col] (1-based) in the tap-code grid; K maps to C
  _pair(ch) {
    const c = ch === "K" ? "C" : ch;
    for (let r = 0; r < 5; r++) {
      const i = TC_GRID[r].indexOf(c);
      if (i >= 0) return [r + 1, i + 1];
    }
    return null;
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._floorY = H * 0.76;
    // window placement drives all the lighting
    this._win = {
      x: W * 0.25, // centre
      y: H * 0.12, // top of opening
      w: Math.min(W * 0.15, 240),
      h: H * 0.24,
    };

    this._drawWallBlocks(W, H);
    this._drawFloor(W, H);
    this._drawWindow(W, H);
    this._drawLightShaft(W, H);
    this._drawSlab(W, H);
    this._drawCot(W, H);
    this._drawChain(W, H);
    this._drawSkeleton(W, H);
    this._drawProps(W, H);
    this._spawnMotes(W, H);
    this._spawnDrip(W, H);
    this._spawnRat(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
  }

  // the wall: real coursed blocks, each its own stone
  _drawWallBlocks(W, H) {
    const g = this.add.graphics().setDepth(-14);
    const rnd = this._rng(2001);
    const floorY = this._floorY;

    // base darkness behind the joints
    g.fillStyle(0x07080a, 1);
    g.fillRect(0, 0, W, floorY + 4);

    const tones = [0x14161b, 0x16181d, 0x121419, 0x171a20, 0x131518, 0x15171c];
    const rows = 6;
    const bh = floorY / rows;

    for (let r = 0; r < rows; r++) {
      const y0 = r * bh;
      let x = r % 2 === 0 ? 0 : -W * 0.06;
      while (x < W) {
        const bw = W * (0.1 + rnd() * 0.07);
        const inset = 2.2; // mortar gap
        const jx = (rnd() - 0.5) * 2;
        const jy = (rnd() - 0.5) * 2;

        // the stone face
        const tone = tones[Math.floor(rnd() * tones.length)];
        g.fillStyle(tone, 1);
        g.fillRect(x + inset + jx, y0 + inset + jy, bw - inset * 2, bh - inset * 2);

        // top+left catches the ambient light, bottom+right falls to mortar
        g.lineStyle(1, TC_SKETCH, 0.09 + rnd() * 0.05);
        g.lineBetween(x + inset, y0 + inset, x + bw - inset, y0 + inset);
        g.lineBetween(x + inset, y0 + inset, x + inset, y0 + bh - inset);
        g.lineStyle(2, 0x050607, 0.8);
        g.lineBetween(x + inset, y0 + bh - inset, x + bw - inset, y0 + bh - inset);
        g.lineBetween(x + bw - inset, y0 + inset, x + bw - inset, y0 + bh - inset);

        // occasional chipped corner or scar on the face
        if (rnd() < 0.3) {
          g.fillStyle(0x000000, 0.18 + rnd() * 0.14);
          const chW = 6 + rnd() * 14;
          g.fillTriangle(
            x + bw - inset, y0 + inset,
            x + bw - inset - chW, y0 + inset,
            x + bw - inset, y0 + inset + chW * 0.8,
          );
        }
        if (rnd() < 0.35) {
          this._pencilSeg(
            g, rnd,
            x + bw * 0.25, y0 + bh * (0.3 + rnd() * 0.4),
            x + bw * (0.55 + rnd() * 0.3), y0 + bh * (0.3 + rnd() * 0.4),
            1, TC_SKETCH, 0.07, 1.6,
          );
        }
        x += bw;
      }
    }

    // damp bleeding up from the floor and down from the vault
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.4, 0.4);
    g.fillRect(0, floorY - H * 0.14, W, H * 0.14);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    g.fillRect(0, 0, W, H * 0.1);

    // a hint of the vault: two low pencil arcs across the ceiling line
    const vg = this.add.graphics().setDepth(-13);
    const arc = (cy, r, a0, a1, alpha) => {
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const a = a0 + (i / 20) * (a1 - a0);
        pts.push({ x: W / 2 + Math.cos(a) * r + (rnd() - 0.5) * 2, y: cy + Math.sin(a) * r });
      }
      this._drawPath(vg, pts, 1.4, TC_SKETCH, alpha);
    };
    arc(H * 0.55, H * 0.52, Math.PI * 1.18, Math.PI * 1.82, 0.1);
    arc(H * 0.58, H * 0.54, Math.PI * 1.16, Math.PI * 1.84, 0.05);
  }

  // flagstone floor in shallow perspective
  _drawFloor(W, H) {
    const g = this.add.graphics().setDepth(-11);
    const rnd = this._rng(3311);
    const fy = this._floorY;

    g.fillGradientStyle(0x101115, 0x101115, 0x08090b, 0x08090b, 1);
    g.fillRect(0, fy, W, H - fy);
    // the wall/floor junction — a hard dark line then a lit skirting edge
    g.lineStyle(3, 0x050607, 1);
    g.lineBetween(0, fy, W, fy);
    this._pencilSeg(g, rnd, 0, fy + 2, W, fy + 2, 1.2, TC_SKETCH, 0.18, 1.4);

    // flagstone seams fanning toward the viewer
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      const xTop = W * t;
      const xBot = W * 0.5 + (t - 0.5) * W * 1.45;
      g.lineStyle(1.4, 0x050607, 0.7);
      g.lineBetween(xTop, fy + 3, xBot, H);
      g.lineStyle(1, TC_SKETCH, 0.05);
      g.lineBetween(xTop + 2, fy + 3, xBot + 2, H);
    }
    // two horizontal seams, compressed by the perspective
    for (const [ty, a] of [[0.32, 0.6], [0.68, 0.7]]) {
      const y = fy + (H - fy) * ty;
      g.lineStyle(1.4, 0x050607, a);
      g.lineBetween(0, y, W, y + (rnd() - 0.5) * 4);
    }
    // worn patches
    for (let i = 0; i < 7; i++) {
      g.fillStyle(0x000000, 0.06 + rnd() * 0.06);
      g.fillEllipse(rnd() * W, fy + 14 + rnd() * (H - fy - 20), 30 + rnd() * 60, 10 + rnd() * 14);
    }
  }

  // the window: a deep splayed reveal, night sky, bars, and the pane index
  _drawWindow(W, H) {
    const g = this.add.graphics().setDepth(-10);
    const rnd = this._rng(3003);
    const { x: wx, y: wy, w: ww, h: wh } = this._win;
    const rev = ww * 0.16; // depth of the reveal

    // splayed reveal: four trapezoid faces, lit toward the opening
    const oL = wx - ww / 2;
    const oR = wx + ww / 2;
    const oT = wy;
    const oB = wy + wh;
    // outer mouth of the recess
    const mL = oL - rev;
    const mR = oR + rev;
    const mT = oT - rev * 0.8;
    const mB = oB + rev * 0.7;
    this._fillPoly(g, [{ x: mL, y: mT }, { x: mR, y: mT }, { x: oR, y: oT }, { x: oL, y: oT }], 0x0b0c10, 1); // top face
    this._fillPoly(g, [{ x: mL, y: mT }, { x: oL, y: oT }, { x: oL, y: oB }, { x: mL, y: mB }], 0x101218, 1); // left face
    this._fillPoly(g, [{ x: mR, y: mT }, { x: oR, y: oT }, { x: oR, y: oB }, { x: mR, y: mB }], 0x161a22, 1); // right face — catches moon
    this._fillPoly(g, [{ x: mL, y: mB }, { x: oL, y: oB }, { x: oR, y: oB }, { x: mR, y: mB }], 0x1a1f28, 1); // sill — the brightest face
    g.fillStyle(TC_LIGHT, 0.08);
    this._fillPoly(g, [{ x: mL, y: mB }, { x: oL, y: oB }, { x: oR, y: oB }, { x: mR, y: mB }], TC_LIGHT, 0.07);

    // pencil edges of the recess
    this._pencilSeg(g, rnd, mL, mT, mR, mT, 1.4, TC_SKETCH, 0.35, 1.4);
    this._pencilSeg(g, rnd, mL, mB, mR, mB, 1.4, TC_SKETCH, 0.4, 1.4);
    this._pencilSeg(g, rnd, mL, mT, mL, mB, 1.3, TC_SKETCH, 0.3, 1.4);
    this._pencilSeg(g, rnd, mR, mT, mR, mB, 1.3, TC_SKETCH, 0.3, 1.4);
    this._pencilSeg(g, rnd, mL, mT, oL, oT, 1.1, TC_SKETCH, 0.25, 1);
    this._pencilSeg(g, rnd, mR, mT, oR, oT, 1.1, TC_SKETCH, 0.25, 1);
    this._pencilSeg(g, rnd, mL, mB, oL, oB, 1.1, TC_SKETCH, 0.3, 1);
    this._pencilSeg(g, rnd, mR, mB, oR, oB, 1.1, TC_SKETCH, 0.3, 1);

    // a great lintel stone over the mouth
    g.fillStyle(0x181b21, 1);
    g.fillRect(mL - 8, mT - 16, mR - mL + 16, 14);
    this._pencilSeg(g, rnd, mL - 8, mT - 16, mR + 8, mT - 16, 1.3, TC_SKETCH, 0.3, 1.4);
    this._pencilSeg(g, rnd, mL - 8, mT - 2, mR + 8, mT - 2, 1.6, 0x050607, 0.9, 1);

    // the night beyond: deep blue, a low moon, two stars that live
    g.fillStyle(0x0c1420, 1);
    g.fillRect(oL, oT, ww, wh);
    g.fillStyle(0xe8ecf2, 0.75);
    g.fillCircle(oL + ww * 0.72, oT + wh * 0.26, ww * 0.09);
    g.fillStyle(0x0c1420, 1);
    g.fillCircle(oL + ww * 0.66, oT + wh * 0.23, ww * 0.075); // waning crescent
    for (const [sx, sy] of [[0.24, 0.18], [0.4, 0.55], [0.85, 0.62]]) {
      const star = this.add
        .circle(oL + ww * sx, oT + wh * sy, 1.1, 0xffffff, 0.7)
        .setDepth(-10);
      this.tweens.add({
        targets: star,
        alpha: 0.15,
        duration: 1600 + sx * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    // haze where the moonlight meets the opening
    g.fillStyle(TC_LIGHT, 0.1);
    g.fillRect(oL, oT, ww, wh);

    // the bars: round iron, each with a cold highlight
    const bars = 3;
    for (let i = 1; i <= bars; i++) {
      const bx = oL + (ww * i) / (bars + 1);
      g.fillStyle(0x07080a, 1);
      g.fillRect(bx - 2.6, oT - 2, 5.2, wh + 4);
      g.lineStyle(1.2, TC_LIGHT, 0.35);
      g.lineBetween(bx + 1.4, oT, bx + 1.4, oB);
    }
    g.fillStyle(0x07080a, 1);
    g.fillRect(oL - 2, oT + wh / 2 - 2.4, ww + 4, 4.8);
    g.lineStyle(1.1, TC_LIGHT, 0.3);
    g.lineBetween(oL, oT + wh / 2 + 1.6, oR, oT + wh / 2 + 1.6);

    // someone indexed the panes like a grid: a scratched "1" above the
    // first column, another "1" beside the first row — and stopped.
    // Row-number and column-number, exactly how the wall counts.
    const idxStyle = {
      fontFamily: '"Special Elite", monospace',
      fontSize: "13px",
      color: "#8f9aa8",
    };
    this.add
      .text(oL + ww / 8, oT - 6, "1", idxStyle)
      .setOrigin(0.5, 1)
      .setAlpha(0.6)
      .setAngle(-4)
      .setDepth(-9);
    this.add
      .text(oL - 6, oT + wh / 4, "1", idxStyle)
      .setOrigin(1, 0.5)
      .setAlpha(0.6)
      .setAngle(3)
      .setDepth(-9);
  }

  // the moonlight: a volumetric shaft and the bars laid across the floor
  _drawLightShaft(W, H) {
    const { x: wx, y: wy, w: ww, h: wh } = this._win;
    const fy = this._floorY;
    const oB = wy + wh;

    // where the light lands: a skewed panel on the floor, right of the window
    const p = {
      nearL: { x: wx + W * 0.02, y: H * 0.97 },
      nearR: { x: wx + W * 0.3, y: H * 0.94 },
      farR: { x: wx + ww * 0.9, y: fy + 6 },
      farL: { x: wx - ww * 0.55, y: fy + 10 },
    };

    // the airborne shaft, two nested layers
    const g = this.add.graphics().setDepth(-4);
    this._fillPoly(
      g,
      [{ x: wx - ww / 2, y: oB - wh * 0.6 }, { x: wx + ww / 2, y: oB - wh * 0.7 }, p.nearR, p.nearL],
      TC_LIGHT, 0.045,
    );
    this._fillPoly(
      g,
      [{ x: wx - ww * 0.3, y: oB - wh * 0.5 }, { x: wx + ww * 0.34, y: oB - wh * 0.55 }, { x: wx + W * 0.24, y: H * 0.94 }, { x: wx + W * 0.05, y: H * 0.96 }],
      TC_LIGHT, 0.05,
    );

    // the lit patch on the flagstones
    const fg = this.add.graphics().setDepth(-8);
    this._fillPoly(fg, [p.farL, p.farR, p.nearR, p.nearL], TC_LIGHT, 0.1);
    this._fillPoly(
      fg,
      [
        { x: p.farL.x + 14, y: p.farL.y + 3 },
        { x: p.farR.x - 8, y: p.farR.y + 3 },
        { x: p.nearR.x - 18, y: p.nearR.y - 4 },
        { x: p.nearL.x + 20, y: p.nearL.y - 4 },
      ],
      TC_LIGHT, 0.07,
    );

    // the shadows of the bars, stretched long by the low moon
    const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const far = lerp(p.farL, p.farR, t);
      const near = lerp(p.nearL, p.nearR, t);
      const wFar = 3;
      const wNear = 7;
      this._fillPoly(
        fg,
        [
          { x: far.x - wFar, y: far.y },
          { x: far.x + wFar, y: far.y },
          { x: near.x + wNear, y: near.y },
          { x: near.x - wNear, y: near.y },
        ],
        0x000000, 0.34,
      );
    }
    // the crossbar's shadow, one broad band across the middle
    const a = lerp(p.farL, p.nearL, 0.48);
    const b = lerp(p.farR, p.nearR, 0.48);
    this._fillPoly(
      fg,
      [
        { x: a.x, y: a.y - 4 },
        { x: b.x, y: b.y - 5 },
        { x: b.x, y: b.y + 7 },
        { x: a.x, y: a.y + 6 },
      ],
      0x000000, 0.3,
    );

    // the shaft breathes, barely — clouds crossing the moon
    this.tweens.add({
      targets: [g, fg],
      alpha: 0.7,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // the message: six lines of gouged marks on one great slab of the wall
  _drawSlab(W, H) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(5115);
    const n = TC_WORD.length;

    const markGap = Math.min(W * 0.014, 17);
    const clusterGap = markGap * 3.4;
    const cx = W * 0.66; // slab centre, clear of the window
    const slabW = 8 * markGap + clusterGap + W * 0.075;
    const slabH = H * 0.5;
    const slabX = cx - slabW / 2;
    const slabY = H * 0.16;
    const lineH = slabH / (n + 0.6);
    const markH = Math.min(lineH * 0.5, 30);

    // the slab: one oversized stone in the coursing, faintly lighter
    g.fillStyle(0x1b1e24, 1);
    g.fillRect(slabX, slabY, slabW, slabH);
    g.fillGradientStyle(0x21252c, 0x1d2027, 0x171a1f, 0x181b21, 1);
    g.fillRect(slabX + 3, slabY + 3, slabW - 6, slabH - 6);
    // deep mortar seam around it + lit top edge
    g.lineStyle(4, 0x050607, 0.95);
    g.strokeRect(slabX, slabY, slabW, slabH);
    this._pencilSeg(g, rnd, slabX, slabY + 2, slabX + slabW, slabY + 2, 1.3, TC_SKETCH, 0.3, 1.4);
    this._pencilSeg(g, rnd, slabX + 2, slabY, slabX + 2, slabY + slabH, 1.1, TC_SKETCH, 0.16, 1.4);
    this._pencilSeg(g, rnd, slabX, slabY + slabH, slabX + slabW, slabY + slabH, 1.2, TC_SKETCH, 0.1, 1.4);

    // age: a chipped corner, a crack, pocks, a damp stain
    this._pencilSeg(g, rnd, slabX + slabW - 30, slabY, slabX + slabW - 8, slabY + 20, 1.2, TC_SKETCH, 0.25, 1.6);
    this._pencilSeg(g, rnd, slabX + 18, slabY + slabH, slabX + 40, slabY + slabH - 30, 1, TC_SKETCH, 0.15, 2.2);
    for (let i = 0; i < 10; i++) {
      g.fillStyle(0x000000, 0.12 + rnd() * 0.12);
      g.fillCircle(slabX + 10 + rnd() * (slabW - 20), slabY + 8 + rnd() * (slabH - 16), 1 + rnd() * 2);
    }
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(slabX + slabW * 0.78, slabY + slabH * 0.85, slabW * 0.3, slabH * 0.22);

    // the six lines, centred on the slab
    const top = slabY + lineH * 0.9;
    for (let i = 0; i < n; i++) {
      const pair = this._pair(TC_WORD[i]);
      if (!pair) continue;
      const [row, col] = pair;
      const y = top + i * lineH;
      const rndR = this._rng(7000 + i * 53);

      const wRow = (row - 1) * markGap;
      const wCol = (col - 1) * markGap;
      const totalW = wRow + clusterGap + wCol;
      let x = cx - totalW / 2;

      for (let k = 0; k < row; k++) {
        this._carve(g, rndR, x, y, markH);
        x += markGap;
      }
      x += clusterGap - markGap;
      for (let k = 0; k < col; k++) {
        this._carve(g, rndR, x, y, markH);
        x += markGap;
      }
    }
  }

  // a single gouged mark: dark groove, a lit lip on the side away from the
  // window, and a breath of stone dust settled beneath it
  _carve(g, rnd, x, y, h) {
    const lean = (rnd() - 0.5) * 4;
    const x1 = x - lean;
    const y1 = y - h / 2;
    const x2 = x + lean;
    const y2 = y + h / 2;
    // the groove itself — a wedge of darkness, deeper in the middle
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, 1.2), 3.4, 0x000000, 0.82);
    this._drawPath(g, this._sketchSeg(rnd, x1, y1 + 2, x2, y2 - 2, 0.8), 1.6, 0x000000, 0.92);
    // the lit lip along the right edge of the cut (moonlight from the left)
    this._drawPath(g, this._sketchSeg(rnd, x1 + 1.9, y1 + 2, x2 + 1.9, y2, 1), 1.1, TC_SKETCH, 0.55);
    this._drawPath(g, this._sketchSeg(rnd, x1 + 2.7, y1 + h * 0.35, x2 + 2.7, y2 - 1, 0.8), 0.8, TC_SKETCH, 0.22);
    // dust at the foot of the groove
    g.fillStyle(TC_SKETCH, 0.1);
    g.fillEllipse(x + 1, y2 + 3, 5 + rnd() * 3, 1.6);
  }

  // a low wooden cot under the window, blanket long gone cold
  _drawCot(W, H) {
    const g = this.add.graphics().setDepth(-7);
    const rnd = this._rng(4242);
    const fy = this._floorY;
    const x0 = W * 0.05;
    const x1 = W * 0.38;
    const topY = fy + (H - fy) * 0.22;
    const legB = fy + (H - fy) * 0.62;

    // shadow it throws away from the window light
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse((x0 + x1) / 2 + 20, legB + 8, (x1 - x0) * 1.05, 18);

    // frame rail + legs
    g.fillStyle(0x15130f, 1);
    g.fillRect(x0, topY, x1 - x0, 9);
    this._pencilSeg(g, rnd, x0, topY, x1, topY, 1.5, TC_SKETCH, 0.4, 1.4);
    this._pencilSeg(g, rnd, x0, topY + 9, x1, topY + 9, 1.2, 0x050607, 0.8, 1);
    for (const lx of [x0 + 6, x1 - 6]) {
      g.fillStyle(0x121009, 1);
      g.fillRect(lx - 3, topY + 9, 6, legB - topY - 9);
      this._pencilSeg(g, rnd, lx - 3, topY + 9, lx - 3, legB, 1.2, TC_SKETCH, 0.3, 0.8);
    }
    // cross-brace
    this._pencilSeg(g, rnd, x0 + 6, legB - 4, x1 - 6, topY + 22, 1.1, TC_SKETCH, 0.2, 1);

    // the blanket: a sagging mass with a few heavy folds
    g.fillStyle(0x1a1c21, 1);
    g.beginPath();
    g.moveTo(x0 + 2, topY);
    g.lineTo(x1 - 2, topY);
    g.lineTo(x1 - 8, topY - 12);
    g.lineTo(x0 + (x1 - x0) * 0.55, topY - 17);
    g.lineTo(x0 + (x1 - x0) * 0.2, topY - 20);
    g.lineTo(x0 + 4, topY - 10);
    g.closePath();
    g.fillPath();
    this._pencilSeg(g, rnd, x0 + 4, topY - 10, x0 + (x1 - x0) * 0.2, topY - 20, 1.2, TC_SKETCH, 0.35, 1.2);
    this._pencilSeg(g, rnd, x0 + (x1 - x0) * 0.2, topY - 20, x0 + (x1 - x0) * 0.55, topY - 17, 1.2, TC_SKETCH, 0.35, 1.4);
    this._pencilSeg(g, rnd, x0 + (x1 - x0) * 0.55, topY - 17, x1 - 8, topY - 12, 1.2, TC_SKETCH, 0.3, 1.4);
    // fold shadows
    for (const fx of [0.3, 0.5, 0.72]) {
      this._pencilSeg(
        g, rnd,
        x0 + (x1 - x0) * fx, topY - 14,
        x0 + (x1 - x0) * (fx + 0.05), topY - 2,
        1.1, 0x050607, 0.6, 1.2,
      );
    }
    // the pillow end, a pale lump catching window light
    g.fillStyle(0x23262c, 1);
    g.fillEllipse(x0 + 22, topY - 14, 34, 13);
    this._pencilCircle(g, rnd, x0 + 22, topY - 14, 15, 1.1, TC_SKETCH, 0.3, 12, 2);
  }

  // an iron ring in the wall and a taut run of chain — something still
  // hangs from the shackle at the end of it
  _drawChain(W, H) {
    const rnd = this._rng(6006);
    const ax = W * 0.895;
    const ay = H * 0.34;

    const g = this.add.graphics().setDepth(-8);
    // mounting plate + ring
    g.fillStyle(0x0c0d10, 1);
    g.fillRect(ax - 8, ay - 8, 16, 16);
    this._pencilSeg(g, rnd, ax - 8, ay - 8, ax + 8, ay - 8, 1.2, TC_SKETCH, 0.35, 0.8);
    this._pencilSeg(g, rnd, ax - 8, ay + 8, ax + 8, ay + 8, 1.2, 0x050607, 0.8, 0.8);
    this._pencilCircle(g, rnd, ax, ay, 6.5, 2, TC_SKETCH, 0.45, 12, 0.8);

    // seven links, pulled almost straight by the weight they once held
    let ly = ay + 8;
    for (let i = 0; i < 7; i++) {
      const hLink = i % 2 === 0 ? 11 : 9;
      const jx = (rnd() - 0.5) * 2.4;
      this._pencilCircle(g, rnd, ax + jx, ly + hLink / 2, hLink / 2, 1.6, TC_SKETCH, 0.4, 10, 0.6);
      g.lineStyle(1, 0x050607, 0.6);
      g.strokeEllipse(ax + jx, ly + hLink / 2, i % 2 === 0 ? 5 : 8, hLink);
      ly += hLink - 2;
    }
    // the closed manacle at the end — the wrist bones are still in it
    this._shackle = { x: ax, y: ly + 8 };
    this._pencilCircle(g, rnd, ax, ly + 8, 8, 2.2, TC_SKETCH, 0.5, 12, 0.8);
    this._pencilCircle(g, rnd, ax, ly + 8, 5.5, 1.1, 0x050607, 0.7, 10, 0.5);
    // rivet on the manacle, a cold glint from the window
    g.fillStyle(TC_LIGHT, 0.4);
    g.fillCircle(ax - 6, ly + 5, 1.2);
  }

  // the last tenant never left: he hangs from the manacle, both wrists
  // bound above his head, knees buckled to the floor. Drawn in the pencil
  // idiom — bone strokes, moonlit on the window side, no more than remains.
  _drawSkeleton(W, H) {
    const g = this.add.graphics().setDepth(-7);
    const rnd = this._rng(6789);
    const BONE = 0xcfc7b2;
    const fy = this._floorY;
    const sh = this._shackle;

    // everything scales off the drop from the shackle to where the feet
    // trail on the floor: wrists + arms + torso + folded legs ≈ 11 units
    const base = fy + (H - fy) * 0.14;
    const u = (base - sh.y) / 11;
    const R = u * 0.8; // skull radius

    // pooled shadow where the body meets the floor
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(sh.x - u * 1.6, base + u * 0.3, u * 6.5, u * 1.6);

    // ── both arms, raised together into the iron ──
    const shL = { x: sh.x - u * 1.15, y: sh.y + u * 2.8 }; // far shoulder
    const shR = { x: sh.x - u * 0.1, y: sh.y + u * 2.7 }; // near shoulder
    // far arm
    this._boneSeg(g, rnd, shL.x, shL.y, sh.x - u * 0.55, sh.y + u * 1.35, 2.2, BONE, 0.55); // humerus
    this._boneSeg(g, rnd, sh.x - u * 0.55, sh.y + u * 1.35, sh.x - 2, sh.y + 3, 1.8, BONE, 0.55); // radius
    // near arm
    this._boneSeg(g, rnd, shR.x, shR.y, sh.x + u * 0.25, sh.y + u * 1.3, 2.2, BONE, 0.6); // humerus
    this._boneSeg(g, rnd, sh.x + u * 0.25, sh.y + u * 1.3, sh.x + 2, sh.y + 3, 1.8, BONE, 0.6); // radius
    this._boneSeg(g, rnd, sh.x + u * 0.32, sh.y + u * 1.28, sh.x + 4, sh.y + 4, 1.1, BONE, 0.35); // ulna
    // hands: phalanges spilling over the top of the manacle
    for (let i = -2; i <= 2; i++) {
      this._boneSeg(
        g, rnd,
        sh.x + i * 2.2, sh.y - 4,
        sh.x + i * 3.2, sh.y - 9 - (2 - Math.abs(i)),
        1, BONE, 0.5,
      );
    }
    // collarbones joining the shoulders under the skull
    this._boneSeg(g, rnd, shL.x, shL.y, shR.x, shR.y, 1.4, BONE, 0.4);

    // ── the skull, fallen forward between the raised arms ──
    const skX = sh.x - u * 0.75;
    const skY = sh.y + u * 2.05;
    g.fillStyle(0x11130f, 1);
    g.fillCircle(skX, skY, R);
    this._pencilCircle(g, rnd, skX, skY, R, 1.6, BONE, 0.65, 14, 1);
    // jaw dropped toward the chest
    this._pencilSeg(g, rnd, skX - R * 0.7, skY + R * 0.5, skX + R * 0.25, skY + R * 1.1, 1.4, BONE, 0.5, 0.8);
    this._pencilSeg(g, rnd, skX + R * 0.25, skY + R * 1.1, skX + R * 0.78, skY + R * 0.55, 1.3, BONE, 0.45, 0.8);
    // sockets + nasal hollow, tipped down
    g.fillStyle(0x000000, 0.85);
    g.fillEllipse(skX - R * 0.34, skY + R * 0.2, R * 0.36, R * 0.3);
    g.fillEllipse(skX + R * 0.22, skY + R * 0.24, R * 0.34, R * 0.28);
    g.fillTriangle(
      skX - R * 0.08, skY + R * 0.48,
      skX + R * 0.1, skY + R * 0.48,
      skX, skY + R * 0.68,
    );
    // moonlight rims the cranium on the window side
    const rim = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * 1.05 + (k / 8) * Math.PI * 0.55;
      rim.push({ x: skX + Math.cos(a) * R * 0.92, y: skY + Math.sin(a) * R * 0.92 });
    }
    this._drawPath(g, rim, 1.3, TC_LIGHT, 0.4);

    // ── spine: sagging from the neck down to the pelvis ──
    const neck = { x: (shL.x + shR.x) / 2, y: (shL.y + shR.y) / 2 + u * 0.2 };
    const hip = { x: neck.x - u * 0.55, y: neck.y + u * 3.1 };
    const spine = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      spine.push({
        x: neck.x + (hip.x - neck.x) * t - Math.sin(t * Math.PI) * u * 0.35,
        y: neck.y + (hip.y - neck.y) * t,
      });
    }
    for (let i = 0; i < spine.length - 1; i++) {
      this._boneSeg(g, rnd, spine[i].x, spine[i].y, spine[i + 1].x, spine[i + 1].y, 2.2, BONE, 0.55);
      g.fillStyle(BONE, 0.4);
      g.fillCircle(spine[i].x, spine[i].y, 1.6);
    }

    // ── ribcage: nested arcs hanging off the upper spine ──
    for (let i = 0; i < 4; i++) {
      const t = 0.18 + i * 0.16;
      const cxR = neck.x + (hip.x - neck.x) * t - Math.sin(t * Math.PI) * u * 0.35;
      const cyR = neck.y + (hip.y - neck.y) * t;
      const rw = u * (1.5 - i * 0.2);
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI * 0.1 + (k / 10) * Math.PI * 0.8;
        pts.push({
          x: cxR - Math.cos(a) * rw + (rnd() - 0.5) * 1.2,
          y: cyR + Math.sin(a) * rw * 0.5 + (rnd() - 0.5) * 1.2,
        });
      }
      this._drawPath(g, pts, 1.4, BONE, 0.45);
    }

    // ── pelvis ──
    this._pencilCircle(g, rnd, hip.x, hip.y, u * 0.6, 1.5, BONE, 0.5, 10, 1);
    g.fillStyle(0x08090b, 0.5);
    g.fillEllipse(hip.x, hip.y, u * 0.55, u * 0.4);

    // ── legs: knees buckled, feet trailing on the flagstones ──
    const kneeN = { x: hip.x - u * 0.9, y: hip.y + u * 1.9 };
    const footN = { x: kneeN.x + u * 1.3, y: base };
    this._boneSeg(g, rnd, hip.x, hip.y, kneeN.x, kneeN.y, 2.4, BONE, 0.6); // femur
    this._boneSeg(g, rnd, kneeN.x, kneeN.y, footN.x, footN.y, 2, BONE, 0.55); // tibia
    this._boneSeg(g, rnd, kneeN.x + 2.5, kneeN.y + 1, footN.x + 2, footN.y - 1, 1.2, BONE, 0.3); // fibula
    // the other leg, slid out sideways
    const kneeF = { x: hip.x - u * 1.9, y: hip.y + u * 1.6 };
    this._boneSeg(g, rnd, hip.x, hip.y, kneeF.x, kneeF.y, 2.2, BONE, 0.45);
    this._boneSeg(g, rnd, kneeF.x, kneeF.y, kneeF.x - u * 0.6, base, 1.8, BONE, 0.4);
    // scattered foot bones at both ends
    for (let i = 0; i < 3; i++) {
      this._boneSeg(g, rnd, footN.x + i * 4, footN.y + 1, footN.x + 7 + i * 4, footN.y + 2, 1, BONE, 0.35);
      this._boneSeg(g, rnd, kneeF.x - u * 0.6 - i * 4, base + 1, kneeF.x - u * 0.6 - 7 - i * 4, base + 2, 1, BONE, 0.3);
    }

    // ── what is left of the clothes: tatters clinging to ribs and hips ──
    g.fillStyle(0x0d0e11, 0.85);
    g.fillTriangle(
      hip.x - u * 1.3, hip.y + u * 0.3,
      hip.x + u * 0.8, hip.y + u * 0.4,
      hip.x - u * 0.2, hip.y - u * 1.2,
    );
    g.fillTriangle(
      neck.x - u * 1.1, neck.y + u * 0.9,
      neck.x + u * 0.6, neck.y + u * 0.7,
      neck.x - u * 0.3, neck.y + u * 2.5,
    );
    this._pencilSeg(g, rnd, hip.x - u * 1.3, hip.y + u * 0.3, hip.x - u * 0.2, hip.y - u * 1.2, 1, TC_SKETCH, 0.2, 1.4);
  }

  // a bone: a straight shaft with slightly swollen ends
  _boneSeg(g, rnd, x1, y1, x2, y2, width, color, alpha) {
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, 1), width, color, alpha);
    g.fillStyle(color, alpha * 0.8);
    g.fillCircle(x1, y1, width * 0.8);
    g.fillCircle(x2, y2, width * 0.8);
  }

  // straw, a tin cup, small truths of the room
  _drawProps(W, H) {
    const g = this.add.graphics().setDepth(-7);
    const rnd = this._rng(7722);
    const fy = this._floorY;

    // straw drifted against the cot and the right corner
    for (let i = 0; i < 26; i++) {
      const corner = i < 15;
      const sx = corner
        ? W * 0.04 + rnd() * W * 0.3
        : W * 0.78 + rnd() * W * 0.18;
      const sy = fy + (H - fy) * (0.55 + rnd() * 0.4);
      const a = (rnd() - 0.5) * 1.2;
      const len = 7 + rnd() * 13;
      g.lineStyle(1, 0xa89a72, 0.14 + rnd() * 0.12);
      g.lineBetween(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len * 0.4);
    }

    // the tin cup, on its side near the slab, a cold glint on its rim
    const cx = W * 0.56;
    const cy = fy + (H - fy) * 0.5;
    g.fillStyle(0x101216, 1);
    g.fillEllipse(cx, cy, 22, 9);
    g.fillRect(cx - 11, cy - 9, 22, 9);
    g.fillStyle(0x0a0b0e, 1);
    g.fillEllipse(cx, cy - 9, 22, 8);
    this._pencilCircle(g, rnd, cx, cy - 9, 10, 1.2, TC_SKETCH, 0.4, 12, 0.8);
    g.lineStyle(1.1, TC_LIGHT, 0.3);
    g.lineBetween(cx - 8, cy - 12, cx - 1, cy - 13);
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(cx + 8, cy + 4, 26, 6);
  }

  // dust motes drifting down through the shaft of window light
  _spawnMotes(W, H) {
    const rnd = this._rng(8181);
    const { x: wx } = this._win;
    for (let i = 0; i < 12; i++) {
      const t = rnd();
      const dx = wx - W * 0.04 + t * W * 0.2;
      const dy = H * 0.34 + rnd() * H * 0.42;
      const dot = this.add
        .circle(dx, dy, 0.6 + rnd() * 1, TC_LIGHT, 0.12 + rnd() * 0.14)
        .setDepth(-3);
      this.tweens.add({
        targets: dot,
        x: dx + 16 + rnd() * 22, // the shaft leans right, so does the dust
        y: dy + 50 + rnd() * 60,
        alpha: 0,
        duration: 9000 + rnd() * 7000,
        delay: rnd() * 5000,
        repeat: -1,
        onRepeat: () => {
          dot.x = wx - W * 0.04 + rnd() * W * 0.2;
          dot.y = H * 0.32 + rnd() * H * 0.4;
          dot.setAlpha(0.12 + rnd() * 0.14);
        },
      });
    }
  }

  // a drop of damp gathering on the vault, falling into a small pool
  _spawnDrip(W, H) {
    const dx = W * 0.47;
    const dy = H * 0.2;
    const fy = this._floorY + (H - this._floorY) * 0.55;

    // the standing pool it has made over the years
    const pool = this.add.graphics().setDepth(-8);
    pool.fillStyle(TC_LIGHT, 0.07);
    pool.fillEllipse(dx, fy + 2, 34, 8);
    pool.lineStyle(1, TC_LIGHT, 0.14);
    pool.strokeEllipse(dx, fy + 2, 34, 8);

    const drop = this.add.circle(dx, dy, 1.6, TC_LIGHT, 0).setDepth(-5);
    const fall = () => {
      drop.setPosition(dx, dy);
      this.tweens.add({
        targets: drop,
        alpha: { from: 0, to: 0.5 },
        duration: 1600,
        onComplete: () => {
          this.tweens.add({
            targets: drop,
            y: fy,
            duration: 430,
            ease: "Quad.easeIn",
            onComplete: () => {
              drop.setAlpha(0);
              // the ripple where it lands — drawn at its own origin so the
              // scale-up stays centred on the pool
              const ring = this.add.graphics().setDepth(-5);
              ring.setPosition(dx, fy + 2);
              ring.lineStyle(1.2, TC_LIGHT, 0.4);
              ring.strokeEllipse(0, 0, 6, 2.2);
              this.tweens.add({
                targets: ring,
                scaleX: 4,
                scaleY: 4,
                alpha: 0,
                duration: 900,
                ease: "Quad.easeOut",
                onComplete: () => ring.destroy(),
              });
              this.time.delayedCall(2400 + Math.random() * 3200, fall);
            },
          });
        },
      });
    };
    this.time.delayedCall(1400, fall);
  }

  // now and then, something small crosses the dark side of the floor
  _spawnRat(W, H) {
    const fy = this._floorY;
    const y = fy + (H - fy) * 0.82;
    const rat = this.add.container(-40, y).setDepth(-6).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0x08090b, 1);
    g.fillEllipse(0, 0, 26, 10); // body
    g.fillEllipse(10, -2, 10, 7); // head
    g.fillTriangle(12, -6, 15, -9, 17, -5); // ear
    g.lineStyle(1.4, 0x08090b, 1);
    g.beginPath();
    g.moveTo(-13, 0);
    g.lineTo(-24, -3);
    g.lineTo(-30, 2);
    g.strokePath();
    rat.add(g);

    const scurry = () => {
      const leftToRight = Math.random() < 0.5;
      const fromX = leftToRight ? -40 : W + 40;
      const toX = leftToRight ? W * 0.42 : W * 0.6;
      rat.setPosition(fromX, y);
      rat.setScale(leftToRight ? 1 : -1, 1);
      rat.setAlpha(0.9);
      this.tweens.add({
        targets: rat,
        x: toX,
        duration: 1500,
        ease: "Sine.easeIn",
        onComplete: () => {
          // it bolts the last stretch and is gone
          this.tweens.add({
            targets: rat,
            x: leftToRight ? W + 40 : -40,
            alpha: 0,
            duration: 700,
            ease: "Quad.easeIn",
            onComplete: () => {
              this.time.delayedCall(9000 + Math.random() * 14000, scurry);
            },
          });
        },
      });
    };
    this.time.delayedCall(5000 + Math.random() * 6000, scurry);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "THE LAST TENANT LEFT A MESSAGE IN THE STONE.", {
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
