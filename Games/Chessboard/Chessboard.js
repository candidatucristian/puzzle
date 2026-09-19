// ─────────────────────────────────────────────────────────────────────────────
// Level — "CHESSBOARD"  ·  code: HEADACHE  ·  expert  ·  TOOL (chess notation)
//
// An abandoned game, seen from above, drawn in pencil like the rest of the
// game. A chessboard on a felt mat, algebraic coordinates written along the
// frame (a–h, 1–8). Eight pieces remain on the board — one on every rank,
// both kings present, as chess law demands:
//
//   ♖ h1  ♔ e2  ♙ a3  ♛ d4  ♚ a5  ♞ c6  ♗ h7  ♝ e8
//
// Read the FILES in rank order, 1 to 8, and the position itself spells the
// word:  h·e·a·d·a·c·h·e  →  HEADACHE.
// Nothing in the scene says so — the coordinates on the frame are the only
// tool. Pieces can be picked up and set down (they knock softly on the
// board) but they always settle back on their square: the position is the
// message, and the message keeps itself.
//
// The pieces are drawn by hand (no font glyphs), so they look the same on
// every computer. White pieces are cream paper with a dark outline; black
// pieces are graphite with a pencil outline. Dark squares are hatched.
//
// No halos, no pulsing, no animated lighting — still life, museum-quiet.
// Same scene contract as the other levels: GAME_LEVELS, initGlobalAudio,
// transitionToLevel(), canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const CHESS_FILES = "abcdefgh";
const CH_SKETCH = 0xd8d2c4; // the pencil itself
const CH_FONT = '"Special Elite", monospace';

// the eight survivors — file+rank is the cipher, the pieces are dressing.
// No pawns on back ranks, kings never adjacent, nobody left in check.
const CHESS_PIECES = [
  { sq: "h1", kind: "R", white: true },
  { sq: "e2", kind: "K", white: true },
  { sq: "a3", kind: "P", white: true },
  { sq: "d4", kind: "Q", white: false },
  { sq: "a5", kind: "K", white: false },
  { sq: "c6", kind: "N", white: false },
  { sq: "h7", kind: "B", white: true },
  { sq: "e8", kind: "B", white: false },
];

// Hand-drawn piece silhouettes, in a 100-unit box: base at y = 0, up is -y.
// polys and circles are filled and outlined; lines are inner details.
const CHESS_SHAPES = {
  P: {
    polys: [
      [
        [-28, 0],
        [28, 0],
        [28, -6],
        [22, -10],
        [-22, -10],
        [-28, -6],
      ],
      [
        [-19, -10],
        [19, -10],
        [12, -22],
        [9, -41],
        [14, -44],
        [14, -48],
        [-14, -48],
        [-14, -44],
        [-9, -41],
        [-12, -22],
      ],
    ],
    circles: [[0, -61, 14]],
    lines: [],
  },
  R: {
    polys: [
      [
        [-32, 0],
        [32, 0],
        [32, -7],
        [26, -11],
        [-26, -11],
        [-32, -7],
      ],
      [
        [-22, -11],
        [22, -11],
        [17, -24],
        [15, -58],
        [21, -62],
        [21, -65],
        [-21, -65],
        [-21, -62],
        [-15, -58],
        [-17, -24],
      ],
      [
        [-21, -65],
        [21, -65],
        [21, -84],
        [13, -84],
        [13, -76],
        [4, -76],
        [4, -84],
        [-4, -84],
        [-4, -76],
        [-13, -76],
        [-13, -84],
        [-21, -84],
      ],
    ],
    circles: [],
    lines: [
      [
        [-15, -58],
        [15, -58],
      ],
      [
        [-16, -34],
        [16, -34],
      ],
    ],
  },
  N: {
    polys: [
      [
        [-30, 0],
        [30, 0],
        [30, -7],
        [24, -11],
        [-24, -11],
        [-30, -7],
      ],
      [
        [22, -11],
        [21, -30],
        [20, -48],
        [17, -62],
        [11, -75],
        [4, -85],
        [1, -94],
        [-4, -86],
        [-10, -81],
        [-19, -72],
        [-28, -61],
        [-32, -52],
        [-27, -46],
        [-17, -49],
        [-9, -45],
        [-13, -33],
        [-19, -21],
        [-22, -11],
      ],
    ],
    circles: [],
    dots: [
      [-9, -71, 2.6],
      [-26, -55, 1.6],
    ], // eye, nostril
    lines: [
      [
        [4, -85],
        [12, -71],
        [17, -55],
        [19, -40],
      ], // mane
      [
        [-31, -50],
        [-24, -49],
      ], // mouth
    ],
  },
  B: {
    polys: [
      [
        [-28, 0],
        [28, 0],
        [28, -6],
        [22, -10],
        [-22, -10],
        [-28, -6],
      ],
      [
        [-19, -10],
        [19, -10],
        [11, -24],
        [8, -44],
        [15, -47],
        [15, -51],
        [-15, -51],
        [-15, -47],
        [-8, -44],
        [-11, -24],
      ],
      [
        [-12, -51],
        [12, -51],
        [16, -62],
        [13, -73],
        [6, -82],
        [0, -86],
        [-6, -82],
        [-13, -73],
        [-16, -62],
      ],
    ],
    circles: [[0, -91, 5]],
    lines: [
      [
        [7, -76],
        [-3, -63],
      ],
    ], // the mitre's slit
  },
  Q: {
    polys: [
      [
        [-34, 0],
        [34, 0],
        [34, -7],
        [28, -11],
        [-28, -11],
        [-34, -7],
      ],
      [
        [-24, -11],
        [24, -11],
        [14, -26],
        [10, -50],
        [16, -54],
        [16, -58],
        [-16, -58],
        [-16, -54],
        [-10, -50],
        [-14, -26],
      ],
      [
        [-16, -58],
        [16, -58],
        [26, -84],
        [17, -71],
        [13, -89],
        [6, -72],
        [0, -92],
        [-6, -72],
        [-13, -89],
        [-17, -71],
        [-26, -84],
      ],
    ],
    circles: [
      [-26, -87, 4],
      [-13, -92, 4],
      [0, -96, 4],
      [13, -92, 4],
      [26, -87, 4],
    ],
    lines: [],
  },
  K: {
    polys: [
      [
        [-34, 0],
        [34, 0],
        [34, -7],
        [28, -11],
        [-28, -11],
        [-34, -7],
      ],
      [
        [-24, -11],
        [24, -11],
        [15, -26],
        [11, -50],
        [17, -54],
        [17, -58],
        [-17, -58],
        [-17, -54],
        [-11, -50],
        [-15, -26],
      ],
      [
        [-17, -58],
        [17, -58],
        [23, -68],
        [20, -78],
        [10, -83],
        [-10, -83],
        [-20, -78],
        [-23, -68],
      ],
      [
        [-3, -83],
        [3, -83],
        [3, -89],
        [9, -89],
        [9, -95],
        [3, -95],
        [3, -102],
        [-3, -102],
        [-3, -95],
        [-9, -95],
        [-9, -89],
        [-3, -89],
      ],
    ],
    circles: [],
    lines: [
      [
        [-18, -70],
        [18, -70],
      ],
    ],
  },
};

class ChessboardScene extends Phaser.Scene {
  constructor() {
    super({ key: "Chessboard" });
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
    this._build(this.cameras.main.width, this.cameras.main.height);

    // kept as a reference so shutdown() can remove it (otherwise every
    // restart of the level would add one more listener)
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.events.on("canvas_resized", this._onResize);

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

  // deterministic pseudo-random, so every stroke stays put between frames
  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  _sketchSeg(rnd, x1, y1, x2, y2, mag) {
    const pts = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      const off = (rnd() - 0.5) * 2 * mag;
      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  _drawPath(g, pts, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < pts.length - 1; i++)
      g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }

  // the main stroke plus a faint offset shadow, like a pencil going twice
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

  _pencilPoly(g, rnd, pts, closed, width, color, alpha, mag = 0.6) {
    const n = pts.length;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      this._pencilSeg(g, rnd, a.x, a.y, b.x, b.y, width, color, alpha, mag);
    }
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = Math.max(14, Math.round(r * 0.9));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * Math.min(1.2, r * 0.12);
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _roundRectPts(x, y, w, h, r, seg = 5) {
    r = Math.min(r, w / 2, h / 2);
    const pts = [];
    const arc = (cx, cy, a0) => {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (Math.PI / 2) * (i / seg);
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
    };
    arc(x + w - r, y + r, -Math.PI / 2);
    arc(x + w - r, y + h - r, 0);
    arc(x + r, y + h - r, Math.PI / 2);
    arc(x + r, y + r, Math.PI);
    return pts;
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const inner = Math.min(W, H) * 0.7; // playing surface, 8x8
    const sq = inner / 8;
    const frame = sq * 0.56;
    const cx = W / 2;
    const cy = H * 0.52;
    this._geom = { cx, cy, sq, inner, frame };

    this._drawTable(W, H, cx, cy, inner, frame);
    this._drawBoard(cx, cy, sq, inner, frame);
    this._placePieces(cx, cy, sq, inner);
    this._drawTexts(W, H);

    // still, gentle vignette — painted once, never animated
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.22;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.6,
      0.6,
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
      0.65,
      0.65,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.55,
      0,
      0.55,
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

  _drawTable(W, H, cx, cy, inner, frame) {
    // the dark table, pencil grain
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x14120f, 0x16130f, 0x0a0908, 0x0b0a08, 1);
    bg.fillRect(0, 0, W, H);
    const rnd = this._rng(311);
    for (let k = 0; k < 16; k++) {
      const y0 = (k + 0.5) * (H / 16) + (rnd() - 0.5) * 10;
      const amp = 2 + rnd() * 4;
      const freq = 0.004 + rnd() * 0.006;
      const ph = rnd() * 6.28;
      const pts = [];
      for (let x = -10; x <= W + 40; x += 40)
        pts.push({ x, y: y0 + Math.sin(x * freq + ph) * amp });
      this._drawPath(bg, pts, 1, CH_SKETCH, 0.03 + rnd() * 0.025);
    }

    // one still shaft of window light across the table — drawn, not animated
    bg.fillStyle(0xfff0d0, 0.025);
    bg.fillPoints(
      [
        { x: W * 0.02, y: 0 },
        { x: W * 0.3, y: 0 },
        { x: W * 0.72, y: H },
        { x: W * 0.42, y: H },
      ],
      true,
    );
    this._pencilSeg(bg, rnd, W * 0.02, 0, W * 0.42, H, 1, CH_SKETCH, 0.05, 3);
    this._pencilSeg(bg, rnd, W * 0.3, 0, W * 0.72, H, 1, CH_SKETCH, 0.05, 3);

    // the felt mat under the board, with a stitched edge
    const half = inner / 2 + frame;
    const matPad = Math.min(W, H) * 0.045;
    const mx = cx - half - matPad;
    const my = cy - half - matPad;
    const mw = (half + matPad) * 2;
    const mat = this.add.graphics().setDepth(-8);
    mat.fillStyle(0x000000, 0.4).fillRoundedRect(mx + 5, my + 8, mw, mw, 14);
    mat.fillStyle(0x0f1813, 1).fillRoundedRect(mx, my, mw, mw, 14);
    const mr = this._rng(1259);
    this._pencilPoly(
      mat,
      mr,
      this._roundRectPts(mx, my, mw, mw, 14),
      true,
      1.4,
      CH_SKETCH,
      0.45,
      0.8,
    );
    // stitches, a few pixels inside the edge
    const stitch = this._roundRectPts(mx + 9, my + 9, mw - 18, mw - 18, 9, 4);
    for (let i = 0; i < stitch.length; i++) {
      const a = stitch[i];
      const b = stitch[(i + 1) % stitch.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.floor(len / 9));
      for (let j = 0; j < n; j++) {
        const t0 = j / n;
        const t1 = t0 + 0.55 / n;
        mat.lineStyle(1, CH_SKETCH, 0.2);
        mat.lineBetween(
          a.x + (b.x - a.x) * t0,
          a.y + (b.y - a.y) * t0,
          a.x + (b.x - a.x) * t1,
          a.y + (b.y - a.y) * t1,
        );
      }
    }
    // felt weave — tiny stitches, deterministic
    for (let i = 0; i < 140; i++) {
      const fx = mx + 16 + mr() * (mw - 32);
      const fy = my + 16 + mr() * (mw - 32);
      mat.lineStyle(1, CH_SKETCH, 0.05);
      mat.lineBetween(fx, fy, fx + 2.5, fy + (mr() < 0.5 ? 0.8 : -0.8));
    }
  }

  _drawBoard(cx, cy, sq, inner, frame) {
    const half = inner / 2;
    const g = this.add.graphics().setDepth(-5);
    const rnd = this._rng(777);
    const ox = cx - half - frame;
    const oy = cy - half - frame;
    const ow = (half + frame) * 2;

    // board shadow on the felt
    g.fillStyle(0x000000, 0.45).fillRoundedRect(ox + 4, oy + 6, ow, ow, 10);

    // the frame: dark walnut, pencil grain along each bar
    g.fillStyle(0x19140f, 1).fillRoundedRect(ox, oy, ow, ow, 10);
    g.fillStyle(CH_SKETCH, 0.03).fillRoundedRect(ox, oy, ow, ow, 10);
    for (let k = 0; k < 3; k++) {
      const t = frame * (0.25 + k * 0.25);
      this._pencilSeg(
        g,
        rnd,
        ox + 12,
        oy + t,
        ox + ow - 12,
        oy + t + (rnd() - 0.5) * 2,
        1,
        CH_SKETCH,
        0.07,
        1.5,
      );
      this._pencilSeg(
        g,
        rnd,
        ox + 12,
        oy + ow - t,
        ox + ow - 12,
        oy + ow - t,
        1,
        CH_SKETCH,
        0.07,
        1.5,
      );
      this._pencilSeg(
        g,
        rnd,
        ox + t,
        oy + 12,
        ox + t,
        oy + ow - 12,
        1,
        CH_SKETCH,
        0.07,
        1.5,
      );
      this._pencilSeg(
        g,
        rnd,
        ox + ow - t,
        oy + 12,
        ox + ow - t,
        oy + ow - 12,
        1,
        CH_SKETCH,
        0.07,
        1.5,
      );
    }
    // mitred corners
    const ix = cx - half;
    const iy = cy - half;
    for (const [ax, ay, bx, by] of [
      [ox + 3, oy + 3, ix, iy],
      [ox + ow - 3, oy + 3, ix + inner, iy],
      [ox + 3, oy + ow - 3, ix, iy + inner],
      [ox + ow - 3, oy + ow - 3, ix + inner, iy + inner],
    ])
      this._pencilSeg(g, rnd, ax, ay, bx, by, 1, CH_SKETCH, 0.25, 0.6);
    // outer edge, drawn twice
    this._pencilPoly(
      g,
      rnd,
      this._roundRectPts(ox, oy, ow, ow, 10),
      true,
      1.8,
      CH_SKETCH,
      0.65,
      1,
    );
    this._pencilPoly(
      g,
      rnd,
      this._roundRectPts(ox + 5, oy + 5, ow - 10, ow - 10, 7),
      true,
      1,
      CH_SKETCH,
      0.2,
      1,
    );

    // squares: dark ones hatched in pencil, like a hand-drawn diagram
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const x = ix + f * sq;
        const y = iy + r * sq;
        // a1 (f=0, bottom row) must be dark → (f + rank) even = dark
        const rank = 8 - r;
        const dark = (f + rank) % 2 === 0;
        g.fillStyle(dark ? 0x12100d : 0x3a342a, 1);
        g.fillRect(x, y, sq + 0.5, sq + 0.5);
        if (dark) {
          const step = sq / 6.5;
          for (let d = step * 0.6; d < sq * 2; d += step) {
            const u0 = Math.max(0, d - sq);
            const u1 = Math.min(sq, d);
            if (u1 - u0 < 3) continue;
            this._pencilSeg(
              g,
              rnd,
              x + u0 + 1,
              y + d - u0 - 1,
              x + u1 - 1,
              y + d - u1 + 1,
              1,
              CH_SKETCH,
              0.13,
              0.6,
            );
          }
        } else {
          // a faint stroke of grain on the light squares
          const gy = y + sq * (0.3 + rnd() * 0.4);
          this._pencilSeg(
            g,
            rnd,
            x + sq * 0.15,
            gy,
            x + sq * (0.55 + rnd() * 0.3),
            gy + (rnd() - 0.5) * 3,
            1,
            CH_SKETCH,
            0.06,
            0.6,
          );
        }
      }
    }
    // hand-ruled grid
    for (let i = 0; i <= 8; i++) {
      const a = i === 0 || i === 8 ? 0.55 : 0.28;
      const w = i === 0 || i === 8 ? 1.5 : 1;
      this._pencilSeg(
        g,
        rnd,
        ix + i * sq,
        iy - 2,
        ix + i * sq,
        iy + inner + 2,
        w,
        CH_SKETCH,
        a,
        0.8,
      );
      this._pencilSeg(
        g,
        rnd,
        ix - 2,
        iy + i * sq,
        ix + inner + 2,
        iy + i * sq,
        w,
        CH_SKETCH,
        a,
        0.8,
      );
    }

    // coordinates along the frame — the only tool the level offers
    const coordStyle = {
      fontFamily: CH_FONT,
      fontSize: Math.max(11, Math.round(sq * 0.26)) + "px",
      color: "#e8dcc0",
    };
    for (let f = 0; f < 8; f++) {
      const x = ix + (f + 0.5) * sq;
      this.add
        .text(x, cy + half + frame * 0.52, CHESS_FILES[f], coordStyle)
        .setOrigin(0.5)
        .setAlpha(0.65)
        .setDepth(-4);
      this.add
        .text(x, cy - half - frame * 0.52, CHESS_FILES[f], coordStyle)
        .setOrigin(0.5)
        .setAlpha(0.35)
        .setDepth(-4);
    }
    for (let rank = 1; rank <= 8; rank++) {
      const y = cy + half - (rank - 0.5) * sq;
      this.add
        .text(cx - half - frame * 0.52, y, String(rank), coordStyle)
        .setOrigin(0.5)
        .setAlpha(0.65)
        .setDepth(-4);
      this.add
        .text(cx + half + frame * 0.52, y, String(rank), coordStyle)
        .setOrigin(0.5)
        .setAlpha(0.35)
        .setDepth(-4);
    }
  }

  // ── the pieces, drawn in pencil ────────────────────────────────────────────

  _pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x;
      const yi = pts[i].y;
      const xj = pts[j].x;
      const yj = pts[j].y;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }

  // draws one piece around its base point (0, 0); s = pixels per shape unit
  _drawPiece(g, shadow, rnd, kind, white, s) {
    const shape = CHESS_SHAPES[kind];
    const P = (pt) => ({ x: pt[0] * s, y: pt[1] * s });
    const polys = shape.polys.map((poly) => poly.map(P));
    const circles = shape.circles.map(([x, y, r]) => ({
      x: x * s,
      y: y * s,
      r: r * s,
    }));

    const fill = white ? 0xd9cfb6 : 0x131417;
    const ink = white ? 0x1d1812 : CH_SKETCH;
    const inkAlpha = white ? 0.9 : 0.8;
    const lw = Math.max(1.1, s * 1.9);

    // shadow on the board (light from the top-left window)
    shadow.fillStyle(0x000000, 0.4);
    for (const poly of polys)
      shadow.fillPoints(
        poly.map((p) => ({ x: p.x + 4 * s, y: p.y + 5 * s })),
        true,
      );
    for (const c of circles) shadow.fillCircle(c.x + 4 * s, c.y + 5 * s, c.r);

    // body
    g.fillStyle(fill, 1);
    for (const poly of polys) g.fillPoints(poly, true);
    for (const c of circles) g.fillCircle(c.x, c.y, c.r);

    // shading: graphite on the shadowed side of white pieces, a pale
    // highlight on the lit side of black ones — only inside the silhouette
    const inside = (x, y) =>
      polys.some((poly) => this._pointInPoly(x, y, poly)) ||
      circles.some((c) => Math.hypot(x - c.x, y - c.y) < c.r - 0.8);
    const shadeColor = white ? 0x6e6452 : CH_SKETCH;
    const shadeAlpha = white ? 0.45 : 0.24;
    const x0 = white ? 5 : -16;
    for (let yy = -6; yy > -104; yy -= 6.5) {
      for (const dx of [0, 6]) {
        const ax = (x0 + dx) * s;
        const ay = yy * s;
        const bx = (x0 + dx + 5) * s;
        const by = (yy - 5) * s;
        if (inside(ax, ay) && inside(bx, by))
          this._pencilSeg(
            g,
            rnd,
            ax,
            ay,
            bx,
            by,
            1,
            shadeColor,
            shadeAlpha,
            0.3,
          );
      }
    }

    // outlines, drawn twice like a pencil
    for (const poly of polys)
      this._pencilPoly(g, rnd, poly, true, lw, ink, inkAlpha, 0.5);
    for (const c of circles)
      this._pencilCircle(g, rnd, c.x, c.y, c.r, lw, ink, inkAlpha);
    for (const line of shape.lines)
      this._pencilPoly(
        g,
        rnd,
        line.map(P),
        false,
        lw * 0.85,
        ink,
        inkAlpha * 0.8,
        0.4,
      );
    for (const [x, y, r] of shape.dots || []) {
      g.fillStyle(ink, inkAlpha);
      g.fillCircle(x * s, y * s, Math.max(1, r * s));
    }
  }

  _placePieces(cx, cy, sq, inner) {
    const half = inner / 2;
    this._pieces = [];
    const s = (sq * 0.88) / 100; // the tallest piece is ~0.9 of a square

    for (const def of CHESS_PIECES) {
      const file = CHESS_FILES.indexOf(def.sq[0]);
      const rank = parseInt(def.sq[1], 10);
      const x = cx - half + (file + 0.5) * sq;
      const baseY = cy + half - (rank - 0.5) * sq + sq * 0.43;

      // pieces lower on the board overlap the ones behind them
      const c = this.add.container(x, baseY).setDepth(5 + (8 - rank) * 0.01);
      const shadow = this.add.graphics();
      const body = this.add.graphics();
      this._drawPiece(
        body,
        shadow,
        this._rng(1000 + file * 17 + rank * 131),
        def.kind,
        def.white,
        s,
      );
      c.add([shadow, body]);

      // pieces can be picked up and set down — they always settle back
      c.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(
          -sq * 0.46,
          -sq * 0.92,
          sq * 0.92,
          sq * 0.98,
        ),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        cursor: "pointer",
      });
      c.on("pointerdown", () => {
        if (c._lifted) return;
        c._lifted = true;
        body.y = -sq * 0.14;
        shadow.setPosition(sq * 0.05, sq * 0.02).setAlpha(0.6);
        this._knock(340);
      });
      const settle = () => {
        if (!c._lifted) return;
        c._lifted = false;
        body.y = 0;
        shadow.setPosition(0, 0).setAlpha(1);
        this._knock(170);
      };
      c.on("pointerup", settle);
      c.on("pointerout", settle);

      this._pieces.push(c);
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 42, "An abandoned game.", {
        fontFamily: CH_FONT,
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(
        W - 30,
        30,
        "Level " +
          (window.GAME_LEVELS.findIndex((l) => l.key === this.scene.key) + 1),
        {
          fontFamily: CH_FONT,
          fontSize: "28px",
          color: "#e8dcc0",
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // soft wooden knock — a piece lifted (higher) or set down (lower)
  _knock(freq) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const dur = 0.07;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 2.4;
      const g = ac.createGain();
      g.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.5;
      src.connect(bp);
      bp.connect(g);
      g.connect(this.sound.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.children.removeAll(true);
    this._pieces = null;
    this._geom = null;
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
        fontFamily: CH_FONT,
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
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
