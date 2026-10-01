import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { paintHall, releaseHallArt } from "./hall.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "STATION"  ·  code: EXIT  ·  observation + ordering
//
// An empty station hall at night. Hanging from the girder on two chains, a
// split-flap departures board still updates itself for trains that will
// never come. Four rows are somehow still BOARDING — and the board's old
// flaps have worn: each of those four cities carries one letter that does not
// belong (its flap jams and settles crooked). Read the wrong letters in order
// of departure time:
//
//   21:03  P[E]RIS   →  E
//   22:07  MO[X]COW  →  X
//   22:24  L[I]NDON  →  I
//   22:41  GENE[T]A  →  T
//
// Row order on the board is scrambled, so the times matter.
// Clicking a row flips it again — the bad letter always stutters.
//
// The hall is painted once per screen size (hall.js); the letters, the
// lamp's light, the clock's second hand and the dust are live. Lifecycle
// provided by BasePuzzleScene.
// ─────────────────────────────────────────────────────────────────────────────

const STATION_ROWS = [
  {
    time: "22:41",
    dest: "GENETA",
    track: "4",
    remark: "BOARDING",
    wrongIdx: 4,
  },
  { time: "21:26", dest: "VIENNA", track: "7", remark: "CANCELLED" },
  {
    time: "22:07",
    dest: "MOXCOW",
    track: "2",
    remark: "BOARDING",
    wrongIdx: 2,
  },
  { time: "21:03", dest: "PERIS", track: "9", remark: "BOARDING", wrongIdx: 1 },
  { time: "23:19", dest: "LISBON", track: "3", remark: "DELAYED" },
  { time: "21:48", dest: "MADRID", track: "6", remark: "CANCELLED" },
  {
    time: "22:24",
    dest: "LINDON",
    track: "1",
    remark: "BOARDING",
    wrongIdx: 1,
  },
  { time: "23:52", dest: "PRAGUE", track: "5", remark: "NO SERVICE" },
];

// board geometry: cells per column group
const ST_TIME_CELLS = 5;
const ST_DEST_CELLS = 8;
const ST_TRACK_CELLS = 1;
const ST_REMARK_CELLS = 10;
const ST_COLS =
  ST_TIME_CELLS + ST_DEST_CELLS + ST_TRACK_CELLS + ST_REMARK_CELLS;

const ST_FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:";

// the flaps' lettering: a condensed grotesque, as on the real boards
const FLAP_FONT =
  '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif';
const INK = { time: "#dedbd2", dest: "#f5f2ea", track: "#dedbd2" };
const REMARK_INK = {
  BOARDING: "#f2c54e",
  CANCELLED: "#df6450",
  DELAYED: "#eda13c",
};

export default class StationScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Station" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();

    this._entered = false; // first build plays the flipping cascade
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _randChar() {
    return ST_FLAP_CHARS[Math.floor(Math.random() * ST_FLAP_CHARS.length)];
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._cells = []; // [row][col] = { txt, finalChar, anomalous, baseY }
    this._rowSpinning = STATION_ROWS.map(() => false);

    const L = this._layout(W, H);
    const art = paintHall(this, L);
    this.add.image(0, 0, art.room).setOrigin(0, 0).setDepth(-14);
    this._makeLight(art);
    this._makeRows(L);
    // the split across each flap lies over its letter
    this.add.image(0, 0, art.splits).setOrigin(0, 0).setDepth(3);
    this._makeSecondHand(L, art.hand);
    this._drawTexts(W, H);
    this._spawnDust(W, H, art.mote);

    if (!this._entered) {
      this._entered = true;
      this._cascade(); // opening ripple: the board flips itself in
    }
  }

  // where everything on the board goes (as it always has)
  _layout(W, H) {
    // cell size: fit 8 rows vertically and 24 columns horizontally
    let ch = Math.min(H * 0.056, 44) * 0.8;
    let cw = ch * 0.78;
    const cellGap = 2;
    const groupGap = () => cw * 0.7;
    const innerW = () =>
      ST_COLS * cw + (ST_COLS - 1) * cellGap + 3 * groupGap();
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
    const bw = gW + pad * 2;
    const bh = gH + pad * 1.6;
    const bx = W / 2 - bw / 2;
    const by = H * 0.55 - bh / 2;
    const x0 = bx + pad;
    const headY = by + pad * 0.55;
    const colHeadY = headY + headH + colHeadH * 0.4 + colHeadH * 0.25;
    const rowsY = headY + headH + colHeadH * 1.4;

    const groups = [];
    let gx = x0;
    for (const n of [
      ST_TIME_CELLS,
      ST_DEST_CELLS,
      ST_TRACK_CELLS,
      ST_REMARK_CELLS,
    ]) {
      groups.push(gx);
      gx += n * cw + (n - 1) * cellGap + groupGap();
    }
    const sizes = [
      ST_TIME_CELLS,
      ST_DEST_CELLS,
      ST_TRACK_CELLS,
      ST_REMARK_CELLS,
    ];
    const rowY = (r) => rowsY + r * (ch + rowGap);
    const cellsOf = (r) => {
      const out = [];
      sizes.forEach((n, g) => {
        for (let i = 0; i < n; i++)
          out.push({
            x: groups[g] + i * (cw + cellGap),
            y: rowY(r),
            group: g,
            i,
          });
      });
      return out;
    };

    // the clock hangs above the board's left corner, clear of it
    const rad = Math.min(Math.min(W, H) * 0.05, (by - 30) / 2.6);
    const clock = {
      cx: bx + rad + 10,
      cy: Math.max(rad + 18, by - rad - 26),
      rad,
    };

    return {
      W,
      H,
      S: Math.min(W, H),
      floorY: H * 0.925,
      board: { x: bx, y: by, w: bw, h: bh, headY, colHeadY },
      x0,
      gW,
      headH,
      colHeadH,
      cw,
      ch,
      cellGap,
      rowGap,
      groups,
      rows: STATION_ROWS.length,
      rowY,
      cellsOf,
      chains: [bx + bw * 0.18, bx + bw * 0.82],
      clock,
    };
  }

  // the lamp in the board's hood: its light breathes, and now and then the
  // old tube stutters — an old tube, not a haunted one
  _makeLight(art) {
    this._glow = this.add
      .image(0, 0, art.glow)
      .setOrigin(0, 0)
      .setDepth(-9)
      .setBlendMode("ADD");
    this.ambientTween({
      targets: this._glow,
      alpha: 0.75,
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.time.addEvent({
      delay: 9000,
      loop: true,
      callback: () => {
        if (!this.ambientMotion || Math.random() < 0.5 || !this._glow) return;
        this.ambientTween({
          targets: this._glow,
          alpha: 0.5,
          duration: 70,
          yoyo: true,
          repeat: 1,
        });
      },
    });
  }

  _makeRows(L) {
    const { ch, cw, x0, gW } = L;
    for (let r = 0; r < STATION_ROWS.length; r++) {
      const row = STATION_ROWS[r];
      const rowY = L.rowY(r);
      const boarding = row.remark === "BOARDING";
      const text = [
        [row.time, ST_TIME_CELLS, INK.time, -1],
        [row.dest, ST_DEST_CELLS, INK.dest, row.wrongIdx],
        [row.track, ST_TRACK_CELLS, INK.track, -1],
        [row.remark, ST_REMARK_CELLS, REMARK_INK[row.remark] || "#8a8d93", -1],
      ];
      const rowCells = [];
      for (const cell of L.cellsOf(r)) {
        const [str, n, color, anomalyAt] = text[cell.group];
        const ch2 = str.padEnd(n, " ").slice(0, n)[cell.i];
        const txt = this.add
          .text(cell.x + cw / 2, rowY + ch / 2, "", {
            fontFamily: FLAP_FONT,
            fontStyle: "bold",
            fontSize: Math.round(ch * 0.66) + "px",
            color,
          })
          .setOrigin(0.5)
          .setDepth(2);
        rowCells.push({
          txt,
          finalChar: ch2 === " " ? "" : ch2,
          anomalous: anomalyAt === cell.i,
          baseY: rowY + ch / 2,
        });
      }
      this._cells.push(rowCells);
      void boarding;

      // hover: a line of light under the row · click flips it again
      const zone = this.add
        .zone(x0, rowY, gW, ch)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);
      const hl = this.add.graphics().setDepth(4);
      zone.on("pointerover", () => {
        hl.clear();
        const y = rowY + ch + Math.min(3, L.rowGap * 0.4);
        hl.lineStyle(Math.max(3, ch * 0.1), 0xf3e7c8, 0.12).lineBetween(
          x0 - 4,
          y,
          x0 + gW + 4,
          y,
        );
        hl.lineStyle(1.2, 0xf6edd4, 0.6).lineBetween(x0 - 4, y, x0 + gW + 4, y);
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
    void cw;
  }

  // the clock stopped calm at 20:47 — only its red second hand goes round
  _makeSecondHand(L, hand) {
    const { cx, cy } = L.clock;
    const sec = this.add
      .image(cx, cy, hand.key)
      .setOrigin(0.5, hand.originY)
      .setDepth(-2);
    this.ambientTween({
      targets: sec,
      angle: 360,
      duration: 60000,
      repeat: -1,
    });
  }

  _drawTexts(W) {
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
      .text(W / 2, 68, "click a row to flip it again", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);

    this.levelText = this.add
      .text(
        W - 30,
        28,
        "Level " +
          (this.services.levels.definitions.findIndex(
            (l) => l.key === this.scene.key,
          ) +
            1),
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

  // slow dust motes drifting through the lamp's light
  _spawnDust(W, H, mote) {
    const rnd = this._rng(4242);
    for (let i = 0; i < 14; i++) {
      const x = W * 0.3 + rnd() * W * 0.4;
      const y = H * 0.12 + rnd() * H * 0.5;
      const r = 0.8 + rnd() * 1.1;
      const dot = this.add
        .image(x, y, mote)
        .setDisplaySize(r * 5, r * 5)
        .setBlendMode("ADD")
        .setAlpha(0.08 + rnd() * 0.12)
        .setDepth(-8);
      this.ambientObject(dot);
      this.ambientTween({
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

  // opening ripple: every flap flips itself in, left to right
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
    if (this.reducedMotion) {
      txt.setText(cell.finalChar).setScale(1, 1);
      if (cell.anomalous) this._seatCrooked(cell);
      onLanded?.();
      return;
    }
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

  // the bad letter: its flap catches mid-fall, drops with a dull knock and
  // jams crooked
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
    cell.txt.y = cell.baseY + Math.max(1.8, cell.txt.height * 0.04);
    cell.txt.setAlpha(0.88);
  }

  // ── sound: mechanical clack, filtered noise burst ──────────────────────────

  _clack(freq, vol) {
    try {
      const ac = this.sound.context;
      if (!ac || (this.services.audio.state && this.services.audio.state.muted))
        return;
      const t = ac.currentTime;
      const dur = 0.05;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
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
      g.gain.value =
        (this.services.audio.state ? this.services.audio.state.sfxVol : 0.8) *
        vol;
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
    this.time.removeAllEvents();
    // destroy rather than just detach: removeAll(true) only took objects off
    // the display list, and the old rows went on catching clicks after a resize
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseHallArt(this.textures);
    this._cells = [];
    this._glow = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseHallArt(this.textures);
  }
}
