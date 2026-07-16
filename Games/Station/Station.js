// ─────────────────────────────────────────────────────────────────────────────
// Level — "STATION"  ·  code: EXIT  ·  observation + ordering
//
// Drawn in the game's pencil-sketch idiom: a hand-ruled departures board
// hangs from two sketched chains in an empty station. The ledger still
// updates itself for trains that will never come. Four rows are somehow
// still BOARDING — and the tired hand that keeps the board stopped caring
// about spelling: each of those four cities carries one letter that does
// not belong (it settles crooked, like a slipped pen stroke). Read the
// wrong letters in order of departure time:
//
//   21:03  P[E]RIS   →  E
//   22:07  MO[X]COW  →  X
//   22:24  L[I]NDON  →  I
//   22:41  GENE[T]A  →  T
//
// Row order on the board is scrambled, so the times matter.
// Clicking a row rewrites it — the bad letter always stutters.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const STATION_ROWS = [
  { time: "22:41", dest: "GENETA", track: "4", remark: "BOARDING", wrongIdx: 4 },
  { time: "21:26", dest: "VIENNA", track: "7", remark: "CANCELLED" },
  { time: "22:07", dest: "MOXCOW", track: "2", remark: "BOARDING", wrongIdx: 2 },
  { time: "21:03", dest: "PERIS", track: "9", remark: "BOARDING", wrongIdx: 1 },
  { time: "23:19", dest: "LISBON", track: "3", remark: "DELAYED" },
  { time: "21:48", dest: "MADRID", track: "6", remark: "CANCELLED" },
  { time: "22:24", dest: "LINDON", track: "1", remark: "BOARDING", wrongIdx: 1 },
  { time: "23:52", dest: "PRAGUE", track: "5", remark: "NO SERVICE" },
];

// board geometry: cells per column group
const ST_TIME_CELLS = 5;
const ST_DEST_CELLS = 8;
const ST_TRACK_CELLS = 1;
const ST_REMARK_CELLS = 10;
const ST_COLS = ST_TIME_CELLS + ST_DEST_CELLS + ST_TRACK_CELLS + ST_REMARK_CELLS;

const ST_FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:";
const ST_SKETCH = 0xd8d2c4; // the pencil itself

class StationScene extends Phaser.Scene {
  constructor() {
    super({ key: "Station" });
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

    this._entered = false; // first build plays the writing cascade
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

  _randChar() {
    return ST_FLAP_CHARS[Math.floor(Math.random() * ST_FLAP_CHARS.length)];
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
      const jr = r + (rnd() - 0.5) * 1.4;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _dashedSeg(g, x1, y1, x2, y2, color, alpha) {
    g.lineStyle(1, color, alpha);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const step = 10;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    for (let d = 0; d < len - 4; d += step) {
      g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * (d + 5), y1 + uy * (d + 5));
    }
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._cells = []; // [row][col] = { txt, finalChar, anomalous, cx, cy }
    this._rowSpinning = STATION_ROWS.map(() => false);

    // cell size: fit 8 rows vertically and 24 columns horizontally
    let ch = Math.min(H * 0.056, 44);
    let cw = ch * 0.78;
    const cellGap = 2;
    const groupGap = () => cw * 0.7;
    const innerW = () => ST_COLS * cw + (ST_COLS - 1) * cellGap + 3 * groupGap();
    if (innerW() > W * 0.8) {
      const k = (W * 0.8) / innerW();
      cw *= k;
      ch *= k;
    }
    const rowGap = Math.max(6, ch * 0.22);
    const gW = innerW();
    const headH = ch * 1.3;
    const colHeadH = ch * 0.72;
    const gH = headH + colHeadH + 8 * ch + 7 * rowGap;
    const pad = cw * 0.9;
    const bx = W / 2 - (gW + pad * 2) / 2;
    const by = H * 0.55 - (gH + pad * 1.6) / 2;

    this._drawRoom(W, H, bx, by, gW + pad * 2, gH + pad * 1.6);
    this._drawBoard(W, H, bx, by, gW, gH, pad, cw, ch, cellGap, rowGap, headH, colHeadH, groupGap());
    this._drawClock(W, H, bx, by);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    if (!this._entered) {
      this._entered = true;
      this._cascade(); // opening ripple: the board writes itself in
    }
  }

  // the sketched hall: wireframe walls, a bench, a suitcase left behind
  _drawRoom(W, H, bx, by, bw, bh) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(9091);
    const floorY = H * 0.925; // below the board's bottom edge — never through it
    const cwx1 = W * 0.07;
    const cwx2 = W * 0.93;
    // corner verticals + ceiling hints
    this._pencilSeg(g, rnd, cwx1, H * 0.05, cwx1, floorY, 1, ST_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, cwx2, H * 0.05, cwx2, floorY, 1, ST_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, 0, H * 0.03, cwx1, H * 0.05, 1, ST_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, W, H * 0.03, cwx2, H * 0.05, 1, ST_SKETCH, 0.08, 2);
    // floor
    this._pencilSeg(g, rnd, 0, floorY, W, floorY, 1.4, ST_SKETCH, 0.22, 2);
    this._pencilSeg(g, rnd, 0, floorY + 5, W, floorY + 5, 1, ST_SKETCH, 0.1, 2);
    // platform edge line, worn
    this._dashedSeg(g, 0, floorY + (H - floorY) * 0.5, W, floorY + (H - floorY) * 0.5, ST_SKETCH, 0.18);
    // faint tile joints on the wall, hand-ruled
    for (let i = 0; i < 4; i++) {
      const y = H * (0.18 + i * 0.16);
      this._pencilSeg(g, rnd, W * 0.03, y, W * 0.97, y + (rnd() - 0.5) * 8, 1, ST_SKETCH, 0.045, 2.6);
    }

    // a bench, bottom-left — seat, back, legs, a few slats
    const bxx = W * 0.035;
    const bwd = W * 0.095;
    const seatY = floorY - H * 0.055;
    this._pencilSeg(g, rnd, bxx, seatY, bxx + bwd, seatY, 1.5, ST_SKETCH, 0.35, 1.6);
    this._pencilSeg(g, rnd, bxx, seatY + 5, bxx + bwd, seatY + 5, 1, ST_SKETCH, 0.2, 1.6);
    this._pencilSeg(g, rnd, bxx + 4, seatY - H * 0.05, bxx + bwd - 4, seatY - H * 0.05, 1.3, ST_SKETCH, 0.3, 1.6); // backrest
    this._pencilSeg(g, rnd, bxx + 2, seatY, bxx + 4, seatY - H * 0.05, 1.1, ST_SKETCH, 0.25, 1);
    this._pencilSeg(g, rnd, bxx + bwd - 2, seatY, bxx + bwd - 4, seatY - H * 0.05, 1.1, ST_SKETCH, 0.25, 1);
    this._pencilSeg(g, rnd, bxx + 6, seatY, bxx + 6, floorY, 1.2, ST_SKETCH, 0.3, 1);
    this._pencilSeg(g, rnd, bxx + bwd - 6, seatY, bxx + bwd - 6, floorY, 1.2, ST_SKETCH, 0.3, 1);

    // a suitcase, bottom-right — someone stopped waiting
    const sx = W * 0.905;
    const sy = floorY - H * 0.06;
    const sw = W * 0.05;
    const shh = H * 0.055;
    this._pencilRect(g, rnd, sx, sy, sw, shh, 1.3, ST_SKETCH, 0.3, 1.6);
    this._pencilSeg(g, rnd, sx + sw * 0.38, sy, sx + sw * 0.36, sy - 8, 1.1, ST_SKETCH, 0.3, 0.6);
    this._pencilSeg(g, rnd, sx + sw * 0.62, sy, sx + sw * 0.64, sy - 8, 1.1, ST_SKETCH, 0.3, 0.6);
    this._pencilSeg(g, rnd, sx + sw * 0.36, sy - 8, sx + sw * 0.64, sy - 8, 1.1, ST_SKETCH, 0.3, 0.6);
    this._pencilSeg(g, rnd, sx, sy + shh * 0.5, sx + sw, sy + shh * 0.5, 1, ST_SKETCH, 0.15, 1);

    // a soft pool of light over the board — bone, not warm; it breathes
    this._glow = this.add.graphics().setDepth(-10);
    this._glow.fillGradientStyle(ST_SKETCH, ST_SKETCH, 0x000000, 0x000000, 0.06, 0.06, 0, 0);
    this._glow.fillRect(bx - 30, by - H * 0.08, bw + 60, bh * 0.9);
    this.tweens.add({
      targets: this._glow,
      alpha: 0.75,
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    // a rare, gentle double-dip — an old tube, not a haunted one
    this.time.addEvent({
      delay: 9000,
      loop: true,
      callback: () => {
        if (Math.random() < 0.5) return;
        this.tweens.add({
          targets: this._glow,
          alpha: 0.5,
          duration: 70,
          yoyo: true,
          repeat: 1,
        });
      },
    });
  }

  _drawBoard(W, H, bx, by, gW, gH, pad, cw, ch, cellGap, rowGap, headH, colHeadH, groupGap) {
    const bw = gW + pad * 2;
    const bh = gH + pad * 1.6;
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(3131);

    // hanging chains from the ceiling to the board's top corners
    for (const hx of [bx + bw * 0.18, bx + bw * 0.82]) {
      const links = 7;
      const topY = H * 0.035;
      for (let i = 0; i < links; i++) {
        const y1 = topY + ((by - topY) * i) / links;
        const y2 = topY + ((by - topY) * (i + 1)) / links;
        this._pencilCircle(g, rnd, hx + (i % 2 ? 1.5 : -1.5), (y1 + y2) / 2, (y2 - y1) * 0.32, 1, ST_SKETCH, 0.3);
      }
      // the ring bolted to the board
      this._pencilCircle(g, rnd, hx, by + 4, 4, 1.2, ST_SKETCH, 0.45);
    }

    // paper tint + doubled hand-drawn frame, slightly askew
    g.fillStyle(ST_SKETCH, 0.028);
    g.fillRect(bx, by, bw, bh);
    this._pencilRect(g, rnd, bx, by, bw, bh, 1.8, ST_SKETCH, 0.55, 2.2);
    this._pencilRect(g, rnd, bx + 8, by + 8, bw - 16, bh - 16, 1, ST_SKETCH, 0.22, 2);

    const x0 = bx + pad;
    let y = by + pad * 0.55;

    // header — DEPARTURES, hand-lettered, with a ruled line and a diamond
    this.add
      .text(x0 + gW / 2, y + headH / 2 - 4, "D E P A R T U R E S", {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.round(headH * 0.44) + "px",
        color: "#e8dcc0",
      })
      .setOrigin(0.5)
      .setDepth(-4);
    const ruleY = y + headH - 4;
    this._pencilSeg(g, rnd, x0 + gW * 0.06, ruleY, x0 + gW * 0.46, ruleY, 1.2, ST_SKETCH, 0.4, 1.6);
    this._pencilSeg(g, rnd, x0 + gW * 0.54, ruleY, x0 + gW * 0.94, ruleY, 1.2, ST_SKETCH, 0.4, 1.6);
    g.fillStyle(ST_SKETCH, 0.5);
    g.fillRect(x0 + gW / 2 - 2, ruleY - 2, 4, 4);

    y += headH + colHeadH * 0.4;

    // column group x-origins
    const gx = [];
    let cx = x0;
    gx.push(cx); // time
    cx += ST_TIME_CELLS * cw + (ST_TIME_CELLS - 1) * cellGap + groupGap;
    gx.push(cx); // destination
    cx += ST_DEST_CELLS * cw + (ST_DEST_CELLS - 1) * cellGap + groupGap;
    gx.push(cx); // track
    cx += ST_TRACK_CELLS * cw + (ST_TRACK_CELLS - 1) * cellGap + groupGap;
    gx.push(cx); // remarks

    // column headings, small and dim
    const heads = [
      ["TIME", gx[0], ST_TIME_CELLS],
      ["DESTINATION", gx[1], ST_DEST_CELLS],
      ["TRK", gx[2], ST_TRACK_CELLS],
      ["REMARKS", gx[3], ST_REMARK_CELLS],
    ];
    for (const [label, gxx, n] of heads) {
      const gw2 = n * cw + (n - 1) * cellGap;
      this.add
        .text(gxx + gw2 / 2, y + colHeadH * 0.25, label, {
          fontFamily: '"Special Elite", monospace',
          fontSize: Math.max(10, Math.round(colHeadH * 0.5)) + "px",
          color: "#8f8974",
        })
        .setOrigin(0.5, 0.5)
        .setAlpha(0.85)
        .setDepth(-4);
    }

    y += colHeadH;

    // rows — letters written on hand-ruled lines, no metal anywhere
    const lines = this.add.graphics().setDepth(-5);
    for (let r = 0; r < STATION_ROWS.length; r++) {
      const row = STATION_ROWS[r];
      const rowY = y + r * (ch + rowGap);
      const rowCells = [];

      const put = (str, nCells, gxx, color, anomalyAt) => {
        const chars = str.padEnd(nCells, " ").slice(0, nCells);
        for (let i = 0; i < nCells; i++) {
          const x = gxx + i * (cw + cellGap);
          const txt = this.add
            .text(x + cw / 2, rowY + ch / 2, "", {
              fontFamily: '"Special Elite", monospace',
              fontSize: Math.round(ch * 0.62) + "px",
              color,
            })
            .setOrigin(0.5)
            .setDepth(2);

          rowCells.push({
            txt,
            finalChar: chars[i] === " " ? "" : chars[i],
            anomalous: anomalyAt === i,
            baseY: rowY + ch / 2,
          });
        }
        // the ruled line each group is written on
        const gw2 = nCells * cw + (nCells - 1) * cellGap;
        this._dashedSeg(lines, gxx, rowY + ch * 0.92, gxx + gw2, rowY + ch * 0.92, ST_SKETCH, 0.22);
      };

      const boarding = row.remark === "BOARDING";
      put(row.time, ST_TIME_CELLS, gx[0], "#a9a390");
      put(row.dest, ST_DEST_CELLS, gx[1], "#e8dcc0", row.wrongIdx);
      put(row.track, ST_TRACK_CELLS, gx[2], "#a9a390");
      put(row.remark, ST_REMARK_CELLS, gx[3], boarding ? "#d9c9a0" : "#6a675c");

      this._cells.push(rowCells);

      // hover: a pencil underline slides under the row · click rewrites it
      const zone = this.add
        .zone(x0, rowY, gW, ch)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);
      const hl = this.add.graphics().setDepth(0);
      const rndH = this._rng(5000 + r * 17);
      zone.on("pointerover", () => {
        hl.clear();
        this._pencilSeg(hl, rndH, x0 - 4, rowY + ch + 2, x0 + gW + 4, rowY + ch + 2, 1.2, ST_SKETCH, 0.4, 1.6);
      });
      zone.on("pointerout", () => hl.clear());
      zone.on("pointerdown", () => this._respinRow(r));
    }

    // settled board immediately when rebuilt after a resize
    if (this._entered) {
      for (const rowCells of this._cells) {
        for (const cell of rowCells) {
          cell.txt.setText(cell.finalChar);
          if (cell.anomalous) this._seatCrooked(cell);
        }
      }
    }
  }

  // a pencil station clock, stopped-calm at 20:47, second hand alive
  _drawClock(W, H, bx, by) {
    // hangs above the board's left corner so it never collides with it
    const rad = Math.min(Math.min(W, H) * 0.05, (by - 30) / 2.6);
    const cx = bx + rad + 10;
    const cy = Math.max(rad + 18, by - rad - 26);

    const g = this.add.graphics().setDepth(-3);
    const rnd = this._rng(7722);
    // doubled sketched rim
    this._pencilCircle(g, rnd, cx, cy, rad + 5, 1.6, ST_SKETCH, 0.5);
    this._pencilCircle(g, rnd, cx, cy, rad + 1, 1, ST_SKETCH, 0.25);
    // hanging stem to the ceiling
    this._pencilSeg(g, rnd, cx, H * 0.03, cx, cy - rad - 5, 1.1, ST_SKETCH, 0.25, 1.6);
    // ticks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = rad * 0.88;
      const r2 = rad * (i % 3 === 0 ? 0.7 : 0.79);
      this._pencilSeg(
        g, rnd,
        cx + Math.cos(a) * r1, cy + Math.sin(a) * r1,
        cx + Math.cos(a) * r2, cy + Math.sin(a) * r2,
        i % 3 === 0 ? 1.6 : 1, ST_SKETCH, i % 3 === 0 ? 0.5 : 0.3, 0.5,
      );
    }
    // hands — 20:47, drawn like everything else
    const hourA = ((20 + 47 / 60) % 12) * (Math.PI / 6) - Math.PI / 2;
    const minA = (47 / 60) * Math.PI * 2 - Math.PI / 2;
    this._pencilSeg(g, rnd, cx, cy, cx + Math.cos(hourA) * rad * 0.45, cy + Math.sin(hourA) * rad * 0.45, 2, ST_SKETCH, 0.6, 0.8);
    this._pencilSeg(g, rnd, cx, cy, cx + Math.cos(minA) * rad * 0.68, cy + Math.sin(minA) * rad * 0.68, 1.4, ST_SKETCH, 0.55, 0.8);
    g.fillStyle(ST_SKETCH, 0.6);
    g.fillCircle(cx, cy, 2.2);

    // living second hand — a thin graphite needle
    const sec = this.add
      .rectangle(cx, cy, 1.2, rad * 0.74, ST_SKETCH, 0.5)
      .setOrigin(0.5, 0.92)
      .setDepth(-2);
    this.tweens.add({
      targets: sec,
      angle: 360,
      duration: 60000,
      repeat: -1,
    });
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "The last board still turns.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.subText = this.add
      .text(W / 2, 68, "click a row to rewrite it", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 10", {
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

  // slow dust motes drifting through the light
  _spawnDust(W, H) {
    const rnd = this._rng(4242);
    for (let i = 0; i < 14; i++) {
      const x = W * 0.3 + rnd() * W * 0.4;
      const y = H * 0.12 + rnd() * H * 0.5;
      const dot = this.add
        .circle(x, y, 0.8 + rnd() * 1.1, 0xffffff, 0.08 + rnd() * 0.12)
        .setDepth(-8);
      this.tweens.add({
        targets: dot,
        y: y - (30 + rnd() * 60),
        x: x + (rnd() * 40 - 20),
        alpha: 0,
        duration: 9000 + rnd() * 9000,
        delay: rnd() * 6000,
        repeat: -1,
        onRepeat: () => {
          dot.y = H * 0.15 + rnd() * H * 0.55;
          dot.x = W * 0.3 + rnd() * W * 0.4;
          dot.setAlpha(0.08 + rnd() * 0.12);
        },
      });
    }
  }

  // ── flap animation ─────────────────────────────────────────────────────────

  // opening ripple: every letter writes itself in, left to right
  _cascade() {
    for (let r = 0; r < this._cells.length; r++) {
      const rowCells = this._cells[r];
      this._rowSpinning[r] = true;
      let landed = 0;
      for (let i = 0; i < rowCells.length; i++) {
        const cell = rowCells[i];
        // starts as the transition veil lifts, so the ripple plays on-camera
        const delay = 1400 + i * 26 + r * 110 + Math.random() * 60;
        const cycles = 2 + Math.floor(Math.random() * 3);
        this._flipCell(cell, cycles, delay, () => {
          landed++;
          if (landed === rowCells.length) this._rowSpinning[r] = false;
        });
      }
    }
  }

  _respinRow(r) {
    if (this._rowSpinning[r]) return;
    this._rowSpinning[r] = true;
    const rowCells = this._cells[r];
    let landed = 0;
    for (let i = 0; i < rowCells.length; i++) {
      const cell = rowCells[i];
      // reset any crooked seating before the spin
      cell.txt.setAngle(0).setAlpha(1).setScale(1, 1);
      cell.txt.y = cell.baseY;
      const cycles = 1 + Math.floor(Math.random() * 2);
      this._flipCell(cell, cycles, i * 22 + Math.random() * 40, () => {
        landed++;
        if (landed === rowCells.length) this._rowSpinning[r] = false;
      });
    }
  }

  _flipCell(cell, cycles, startDelay, onLanded) {
    const txt = cell.txt;
    const step = (remaining) => {
      this.tweens.add({
        targets: txt,
        scaleY: 0.06,
        duration: 45,
        ease: "Quad.easeIn",
        onComplete: () => {
          txt.setText(remaining > 0 ? this._randChar() : cell.finalChar);
          if (Math.random() < 0.4) this._clack(950 + Math.random() * 450, 0.1);
          this.tweens.add({
            targets: txt,
            scaleY: 1,
            duration: 55,
            ease: "Quad.easeOut",
            onComplete: () => {
              if (remaining > 0) {
                step(remaining - 1);
              } else {
                if (cell.anomalous) this._stutter(cell);
                if (onLanded) onLanded();
              }
            },
          });
        },
      });
    };
    this.time.delayedCall(startDelay, () => step(cycles));
  }

  // the bad letter: catches mid-write, drops with a dull knock, seats crooked
  _stutter(cell) {
    const txt = cell.txt;
    this.tweens.add({
      targets: txt,
      scaleY: 0.5,
      duration: 80,
      delay: 140,
      ease: "Quad.easeIn",
      onComplete: () => {
        this._clack(430, 0.32);
        this.tweens.add({
          targets: txt,
          scaleY: 1,
          duration: 60,
          ease: "Back.easeOut",
          onComplete: () => this._seatCrooked(cell),
        });
      },
    });
  }

  _seatCrooked(cell) {
    cell.txt.setAngle(3.2);
    cell.txt.y = cell.baseY + 1.8;
    cell.txt.setAlpha(0.88);
  }

  // ── sound: mechanical clack, filtered noise burst ──────────────────────────

  _clack(freq, vol) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const dur = 0.05;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 2.4;
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
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._cells = [];
    this._glow = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
