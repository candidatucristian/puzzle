// ─────────────────────────────────────────────────────────────────────────────
// Level — "STATION"  ·  code: EXIT  ·  observation + ordering
//
// The last station. A split-flap departures board still turns for trains
// that will never come. Four rows are somehow still BOARDING — and the old
// machine has stopped caring about spelling: in each of those four cities
// one flap landed on a letter that does not belong (the flap visibly
// sticks and settles crooked). Read the wrong letters in order of
// departure time:
//
//   21:03  P[E]RIS   →  E
//   22:07  MO[X]COW  →  X
//   22:24  L[I]NDON  →  I
//   22:41  GENE[T]A  →  T
//
// Row order on the board is scrambled, so the times matter.
// Clicking a row spins its flaps again — the bad flap always stutters.
//
// Everything is drawn in canvas, deterministic, no assets. Same scene
// contract as the other levels: GAME_LEVELS, initGlobalAudio,
// canvas_resized, shutdown().
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

    this._entered = false; // first build plays the flap cascade
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

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._cells = []; // [row][col] = { txt, finalChar, anomalous, cx, cy }
    this._rowSpinning = STATION_ROWS.map(() => false);

    // cell size: fit 8 rows vertically and 24 columns horizontally
    let ch = Math.min(H * 0.058, 46);
    let cw = ch * 0.78;
    const cellGap = 3;
    const groupGap = () => cw * 0.6;
    const innerW = () => ST_COLS * cw + (ST_COLS - 1) * cellGap + 3 * groupGap();
    if (innerW() > W * 0.84) {
      const k = (W * 0.84) / innerW();
      cw *= k;
      ch *= k;
    }
    const rowGap = Math.max(6, ch * 0.2);
    const gW = innerW();
    const headH = ch * 1.35;
    const colHeadH = ch * 0.72;
    const gH = headH + colHeadH + 8 * ch + 7 * rowGap;
    const pad = cw * 0.85;
    const bx = W / 2 - (gW + pad * 2) / 2;
    const by = H * 0.53 - (gH + pad * 1.6) / 2;

    this._drawRoom(W, H, bx, by, gW + pad * 2, gH + pad * 1.6);
    this._drawBoard(W, H, bx, by, gW, gH, pad, cw, ch, cellGap, rowGap, headH, colHeadH, groupGap());
    this._drawClock(W, H, bx, by);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    if (!this._entered) {
      this._entered = true;
      this._cascade(); // opening ripple, flaps spin in from blank
    }
  }

  // dark tiled station wall, platform floor, hanging lamp glow
  _drawRoom(W, H, bx, by, bw, bh) {
    const bg = this.add.graphics().setDepth(-14);
    bg.fillGradientStyle(0x232220, 0x26241f, 0x121110, 0x151412, 1);
    bg.fillRect(0, 0, W, H);

    // glazed subway tiles — deterministic grid with worn joints
    const rnd = this._rng(9091);
    const tw = Math.max(54, W / 22);
    const th = tw * 0.42;
    bg.lineStyle(1, 0x000000, 0.22);
    const floorY = H * 0.82;
    for (let y = 0, row = 0; y < floorY; y += th, row++) {
      bg.lineBetween(0, y, W, y);
      const off = (row % 2) * (tw / 2);
      for (let x = -tw; x < W + tw; x += tw) {
        bg.lineBetween(x + off, y, x + off, Math.min(y + th, floorY));
      }
    }
    // faint tile sheen patches
    bg.fillStyle(0x3a3833, 0.14);
    for (let i = 0; i < 14; i++) {
      const x = rnd() * W;
      const y = rnd() * floorY * 0.9;
      bg.fillRect(x, y, tw * (0.4 + rnd() * 0.5), 2 + rnd() * 3);
    }

    // platform floor
    bg.fillGradientStyle(0x141311, 0x171512, 0x0b0a09, 0x0d0c0a, 1);
    bg.fillRect(0, floorY, W, H - floorY);
    // worn safety line along the platform edge
    bg.fillStyle(0xd8d2c4, 0.16);
    bg.fillRect(0, floorY + (H - floorY) * 0.42, W, 5);
    bg.lineStyle(1, 0x000000, 0.4);
    bg.lineBetween(0, floorY, W, floorY);

    // hanging lamp above the board — warm cone, painted once, breathes softly
    const lampX = W / 2;
    const lampY = by - Math.max(26, H * 0.05);
    const lamp = this.add.graphics().setDepth(-10);
    lamp.fillStyle(0x0a0a0a, 1);
    lamp.fillRect(lampX - 1.5, 0, 3, lampY - 8); // pendant stem
    lamp.fillStyle(0x1c1b18, 1);
    lamp.fillRoundedRect(lampX - 46, lampY - 10, 92, 12, 5); // shade
    lamp.fillStyle(0xffe9c0, 0.85);
    lamp.fillRoundedRect(lampX - 38, lampY - 2, 76, 4, 2); // tube

    this._glow = this.add.graphics().setDepth(-9);
    this._glow.fillGradientStyle(0xffe9c0, 0xffe9c0, 0x000000, 0x000000, 0.13, 0.13, 0, 0);
    this._glow.fillRect(bx - 30, lampY, bw + 60, by - lampY + bh * 0.8);
    this.tweens.add({
      targets: this._glow,
      alpha: 0.82,
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
          alpha: 0.55,
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

    // wall shadow behind the housing
    const sh = this.add.graphics().setDepth(-7);
    sh.fillStyle(0x000000, 0.45);
    sh.fillRoundedRect(bx + 8, by + 12, bw, bh, 16);

    // housing
    const hs = this.add.graphics().setDepth(-6);
    hs.fillGradientStyle(0x232630, 0x272a34, 0x101218, 0x13151b, 1);
    hs.fillRoundedRect(bx, by, bw, bh, 16);
    hs.lineStyle(2, 0x05060a, 1);
    hs.strokeRoundedRect(bx, by, bw, bh, 16);
    hs.lineStyle(1, 0x4a4f5c, 0.35);
    hs.strokeRoundedRect(bx + 3, by + 3, bw - 6, bh - 6, 13);
    // corner bolts
    hs.fillStyle(0x4e5461, 1);
    const bo = 14;
    for (const [cxx, cyy] of [
      [bx + bo, by + bo],
      [bx + bw - bo, by + bo],
      [bx + bo, by + bh - bo],
      [bx + bw - bo, by + bh - bo],
    ]) {
      hs.fillCircle(cxx, cyy, 3.4);
      hs.fillStyle(0x0a0b0f, 1);
      hs.fillCircle(cxx + 0.8, cyy + 0.9, 1.4);
      hs.fillStyle(0x4e5461, 1);
    }

    const x0 = bx + pad;
    let y = by + pad * 0.55;

    // header strip — DEPARTURES
    const hdr = this.add.graphics().setDepth(-5);
    hdr.fillStyle(0x0b0c10, 1);
    hdr.fillRoundedRect(x0, y, gW, headH, 6);
    hdr.lineStyle(1, 0x000000, 0.8);
    hdr.strokeRoundedRect(x0, y, gW, headH, 6);
    hdr.fillStyle(0xd9c9a0, 0.5);
    hdr.fillRect(x0 + 10, y + headH - 3, gW - 20, 1.5);
    this.add
      .text(x0 + gW / 2, y + headH / 2, "D E P A R T U R E S", {
        fontFamily: "Arial, sans-serif",
        fontSize: Math.round(headH * 0.42) + "px",
        fontStyle: "bold",
        color: "#e8e2d0",
      })
      .setOrigin(0.5)
      .setAlpha(0.92)
      .setDepth(-4);

    y += headH + colHeadH * 0.35;

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

    // column headings
    const colStyle = {
      fontFamily: "Arial, sans-serif",
      fontSize: Math.max(10, Math.round(colHeadH * 0.52)) + "px",
      color: "#8f8975",
      fontStyle: "bold",
      letterSpacing: 2,
    };
    const heads = [
      ["TIME", gx[0], ST_TIME_CELLS],
      ["DESTINATION", gx[1], ST_DEST_CELLS],
      ["TRK", gx[2], ST_TRACK_CELLS],
      ["REMARKS", gx[3], ST_REMARK_CELLS],
    ];
    for (const [label, gxx, n] of heads) {
      const gw2 = n * cw + (n - 1) * cellGap;
      this.add
        .text(gxx + gw2 / 2, y + colHeadH * 0.25, label, colStyle)
        .setOrigin(0.5, 0.5);
    }

    y += colHeadH;

    // cells — one flap per character
    const cellsGfx = this.add.graphics().setDepth(1);
    for (let r = 0; r < STATION_ROWS.length; r++) {
      const row = STATION_ROWS[r];
      const rowY = y + r * (ch + rowGap);
      const rowCells = [];

      const put = (str, nCells, gxx, color, anomalyAt) => {
        const chars = str.padEnd(nCells, " ").slice(0, nCells);
        for (let i = 0; i < nCells; i++) {
          const x = gxx + i * (cw + cellGap);
          // flap body
          cellsGfx.fillGradientStyle(0x2a2d36, 0x2d3039, 0x181a20, 0x1b1d24, 1);
          cellsGfx.fillRoundedRect(x, rowY, cw, ch, 3);
          cellsGfx.lineStyle(1, 0x05060a, 0.9);
          cellsGfx.strokeRoundedRect(x, rowY, cw, ch, 3);

          const txt = this.add
            .text(x + cw / 2, rowY + ch / 2, "", {
              fontFamily: "Arial, sans-serif",
              fontSize: Math.round(ch * 0.62) + "px",
              fontStyle: "bold",
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
        // split line across the group, over the letters
        const gw2 = nCells * cw + (nCells - 1) * cellGap;
        cellsGfx.lineStyle(1, 0x000000, 0.65);
        cellsGfx.lineBetween(gxx, rowY + ch / 2, gxx + gw2, rowY + ch / 2);
      };

      const boarding = row.remark === "BOARDING";
      put(row.time, ST_TIME_CELLS, gx[0], "#b7b1a0");
      put(row.dest, ST_DEST_CELLS, gx[1], "#e8e2d0", row.wrongIdx);
      put(row.track, ST_TRACK_CELLS, gx[2], "#b7b1a0");
      put(row.remark, ST_REMARK_CELLS, gx[3], boarding ? "#d9c9a0" : "#6a6d72");

      this._cells.push(rowCells);

      // hover highlight + click-to-respin
      const zone = this.add
        .zone(x0, rowY, gW, ch)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);
      const hl = this.add.graphics().setDepth(0);
      zone.on("pointerover", () => {
        hl.clear();
        hl.fillStyle(0xffe9c0, 0.045);
        hl.fillRoundedRect(x0 - 6, rowY - 3, gW + 12, ch + 6, 4);
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

  // station clock on the wall, stopped-calm at 20:47, second hand alive
  // hangs above the board's left corner so it never collides with it
  _drawClock(W, H, bx, by) {
    const rad = Math.min(Math.min(W, H) * 0.052, (by - 30) / 2.4);
    const cx = bx + rad + 10;
    const cy = Math.max(rad + 16, by - rad - 26);

    const g = this.add.graphics().setDepth(-3);
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(cx + 3, cy + 5, rad + 6); // shadow
    g.fillGradientStyle(0x2a2d34, 0x2e313a, 0x14161b, 0x171920, 1);
    g.fillCircle(cx, cy, rad + 6); // rim
    g.lineStyle(1.5, 0x05060a, 1);
    g.strokeCircle(cx, cy, rad + 6);
    g.fillStyle(0xdcd6c6, 1);
    g.fillCircle(cx, cy, rad); // face
    g.fillStyle(0x2a2721, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = rad * 0.86;
      const r2 = rad * (i % 3 === 0 ? 0.72 : 0.79);
      g.fillStyle(0x2a2721, 1);
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a) * r2;
      const y2 = cy + Math.sin(a) * r2;
      g.lineStyle(i % 3 === 0 ? 3 : 1.5, 0x2a2721, 1);
      g.lineBetween(x1, y1, x2, y2);
    }
    // hands — 20:47
    const hourA = ((20 + 47 / 60) % 12) * (Math.PI / 6) - Math.PI / 2;
    const minA = (47 / 60) * Math.PI * 2 - Math.PI / 2;
    g.lineStyle(4, 0x1c1914, 1);
    g.lineBetween(cx, cy, cx + Math.cos(hourA) * rad * 0.45, cy + Math.sin(hourA) * rad * 0.45);
    g.lineStyle(3, 0x1c1914, 1);
    g.lineBetween(cx, cy, cx + Math.cos(minA) * rad * 0.68, cy + Math.sin(minA) * rad * 0.68);

    // living second hand
    const sec = this.add
      .rectangle(cx, cy, 1.6, rad * 0.74, 0x8a2f2a, 0.9)
      .setOrigin(0.5, 0.92)
      .setDepth(-2);
    this.tweens.add({
      targets: sec,
      angle: 360,
      duration: 60000,
      repeat: -1,
    });
    const pin = this.add.graphics().setDepth(-1);
    pin.fillStyle(0x1c1914, 1);
    pin.fillCircle(cx, cy, 2.6);
    // glass catch-light
    pin.lineStyle(1.5, 0xffffff, 0.18);
    pin.beginPath();
    pin.arc(cx - rad * 0.25, cy - rad * 0.25, rad * 0.55, Math.PI * 0.9, Math.PI * 1.45);
    pin.strokePath();
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
      .text(W / 2, 68, "click a row to spin its flaps", {
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

  // slow dust motes drifting through the lamp light
  _spawnDust(W, H) {
    const rnd = this._rng(4242);
    for (let i = 0; i < 14; i++) {
      const x = W * 0.3 + rnd() * W * 0.4;
      const y = H * 0.12 + rnd() * H * 0.5;
      const dot = this.add
        .circle(x, y, 0.8 + rnd() * 1.1, 0xffe9c0, 0.1 + rnd() * 0.16)
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
          dot.setAlpha(0.1 + rnd() * 0.16);
        },
      });
    }
  }

  // ── flap animation ─────────────────────────────────────────────────────────

  // opening ripple: every flap spins in from blank, left to right
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

  // the bad flap: catches mid-turn, drops with a dull knock, seats crooked
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
