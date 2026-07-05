// ─────────────────────────────────────────────────────────────────────────────
// Level — "MOSAIC"  ·  code: EXIT  ·  finale  ·  pure deduction (nonogram)
//
// A ruined mosaic panel set into a stone alcove. The tiles fell out long
// ago — but the old masons left their tally: brass plates along each row
// and column count the runs of tiles that once sat there. This is the
// world-famous nonogram (picross): the numbers ARE the picture, and only
// logic — never guessing — puts the tiles back.
//
// The restored image spells the final word itself:  E X I T
//
// The grid is 15×7 and PROVABLY line-solvable with a unique solution
// (verified by constraint propagation alone — no trial and error needed).
//
// Left-click seats a tile, click again to take it out. Right-click chalks
// a small dot — the solver's note for "certainly empty". When the filled
// tiles exactly match the mosaic, the wall settles with a low stone gong.
//
// No halos, no pulsing, no animated lighting — still light, museum-quiet.
// Same scene contract as the other levels: GAME_LEVELS, initGlobalAudio,
// transitionToLevel(), canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const MOSAIC_BITMAP = [
  "...............",
  "###.#.#.###.###",
  "#...#.#..#...#.",
  "###..#...#...#.",
  "#...#.#..#...#.",
  "###.#.#.###..#.",
  "...............",
];

const MOSAIC_EMPTY = 0;
const MOSAIC_FILL = 1;
const MOSAIC_MARK = 2;

class MosaicScene extends Phaser.Scene {
  constructor() {
    super({ key: "Mosaic" });
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
    this.input.mouse.disableContextMenu();

    this.isSolved = false;
    this._done = false;

    const R = MOSAIC_BITMAP.length;
    const C = MOSAIC_BITMAP[0].length;
    this._R = R;
    this._C = C;
    this._target = MOSAIC_BITMAP.map((row) => [...row].map((ch) => ch === "#"));
    this._grid = Array.from({ length: R }, () => Array(C).fill(MOSAIC_EMPTY));

    this._rowClues = this._target.map((row) => this._clues(row));
    this._colClues = [];
    for (let c = 0; c < C; c++) {
      this._colClues.push(this._clues(this._target.map((row) => row[c])));
    }

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.input.on("pointerdown", (p) => {
      if (this._done || !this._geom) return;
      const g = this._geom;
      const c = Math.floor((p.x - g.x0) / g.cell);
      const r = Math.floor((p.y - g.y0) / g.cell);
      if (r < 0 || r >= this._R || c < 0 || c >= this._C) return;
      const right = p.rightButtonDown();
      const cur = this._grid[r][c];
      if (right) {
        this._grid[r][c] = cur === MOSAIC_MARK ? MOSAIC_EMPTY : MOSAIC_MARK;
        this._tick(520, 0.25);
      } else {
        this._grid[r][c] = cur === MOSAIC_FILL ? MOSAIC_EMPTY : MOSAIC_FILL;
        this._tick(cur === MOSAIC_FILL ? 170 : 260, 0.5);
      }
      this._redrawTiles();
      this._checkDone();
    });

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _clues(cells) {
    const out = [];
    let run = 0;
    for (const v of cells) {
      if (v) run++;
      else if (run) {
        out.push(run);
        run = 0;
      }
    }
    if (run) out.push(run);
    return out.length ? out : [0];
  }

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const cell = Math.floor(
      Math.min((W * 0.72) / this._C, (H * 0.42) / this._R),
    );
    const gw = cell * this._C;
    const gh = cell * this._R;
    // clue gutters: rows on the left, columns on top
    const x0 = W / 2 - gw / 2 + cell * 1.1;
    const y0 = H * 0.56 - gh / 2 + cell * 0.9;
    this._geom = { cell, x0, y0, gw, gh };

    this._drawRoom(W, H, x0, y0, gw, gh, cell);
    this._drawClues(x0, y0, gw, gh, cell);

    this._tileGfx = this.add.graphics().setDepth(6);
    this._redrawTiles();

    this._drawTexts(W, H);
    if (this._done) this._finishTexts();

    // quiet static vignette
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

  _drawRoom(W, H, x0, y0, gw, gh, cell) {
    // stone wall
    const bg = this.add.graphics().setDepth(-12);
    bg.fillGradientStyle(0x2e2a26, 0x34302a, 0x161412, 0x1a1815, 1);
    bg.fillRect(0, 0, W, H);
    // masonry joints — still, deterministic
    const rnd = this._rng(1717);
    bg.lineStyle(1, 0x000000, 0.25);
    const bh = H / 7;
    for (let row = 0; row < 7; row++) {
      const y = row * bh;
      bg.lineBetween(0, y, W, y);
      const off = (row % 2) * (W / 8);
      for (let k = -1; k < 5; k++) {
        bg.lineBetween(off + k * (W / 4), y, off + k * (W / 4), y + bh);
      }
    }
    bg.lineStyle(1, 0x5a5248, 0.12);
    for (let i = 0; i < 12; i++) {
      const sx = rnd() * W;
      const sy = rnd() * H;
      bg.lineBetween(sx, sy, sx + 20 + rnd() * 60, sy + rnd() * 8 - 4);
    }
    // still shaft of light from the upper left — painted once
    bg.fillGradientStyle(0xffe9c0, 0x000000, 0x000000, 0x000000, 0.05, 0, 0.02, 0);
    bg.fillRect(0, 0, W, H);

    // recessed alcove behind the panel
    const pad = cell * 1.7;
    const alc = this.add.graphics().setDepth(-8);
    alc.fillStyle(0x000000, 0.35);
    alc.fillRoundedRect(x0 - pad, y0 - pad, gw + pad * 2, gh + pad * 2, 14);
    alc.lineStyle(2, 0x0c0a08, 0.9);
    alc.strokeRoundedRect(x0 - pad, y0 - pad, gw + pad * 2, gh + pad * 2, 14);
    alc.lineStyle(1, 0x6b6156, 0.35);
    alc.strokeRoundedRect(x0 - pad + 3, y0 - pad + 3, gw + pad * 2 - 6, gh + pad * 2 - 6, 12);

    // bronze frame around the mosaic bed
    const fr = this.add.graphics().setDepth(-6);
    fr.fillGradientStyle(0x6b5426, 0x7a6230, 0x2e2410, 0x3a2c14, 1);
    fr.fillRoundedRect(x0 - 10, y0 - 10, gw + 20, gh + 20, 8);
    fr.lineStyle(1.5, 0x17110a, 1);
    fr.strokeRoundedRect(x0 - 10, y0 - 10, gw + 20, gh + 20, 8);
    fr.fillStyle(0xc9a55a, 0.35);
    fr.fillRoundedRect(x0 - 8, y0 - 8, gw + 16, 2.5, 2);

    // the mortar bed with empty sockets
    const bed = this.add.graphics().setDepth(-5);
    bed.fillStyle(0x241f1a, 1);
    bed.fillRect(x0, y0, gw, gh);
    for (let r = 0; r < this._R; r++) {
      for (let c = 0; c < this._C; c++) {
        const x = x0 + c * cell;
        const y = y0 + r * cell;
        // recessed socket: dark inset, light lower edge
        bed.fillStyle(0x171310, 1);
        bed.fillRoundedRect(x + 2, y + 2, cell - 4, cell - 4, 3);
        bed.lineStyle(1, 0x000000, 0.5);
        bed.lineBetween(x + 3, y + 3, x + cell - 3, y + 3);
        bed.lineBetween(x + 3, y + 3, x + 3, y + cell - 3);
        bed.lineStyle(1, 0x4a4238, 0.4);
        bed.lineBetween(x + 3, y + cell - 3, x + cell - 3, y + cell - 3);
      }
    }
  }

  _drawClues(x0, y0, gw, gh, cell) {
    const fsR = Math.max(11, Math.round(cell * 0.42));
    const style = {
      fontFamily: '"Special Elite", monospace',
      fontSize: fsR + "px",
      color: "#d9c9a0",
      align: "right",
    };

    // row tallies — etched to the left of each row
    for (let r = 0; r < this._R; r++) {
      this.add
        .text(
          x0 - 14,
          y0 + r * cell + cell / 2,
          this._rowClues[r].join("  "),
          style,
        )
        .setOrigin(1, 0.5)
        .setAlpha(0.8)
        .setDepth(2);
    }

    // column tallies — stacked above each column
    for (let c = 0; c < this._C; c++) {
      this.add
        .text(
          x0 + c * cell + cell / 2,
          y0 - 12,
          this._colClues[c].join("\n"),
          {
            fontFamily: '"Special Elite", monospace',
            fontSize: fsR + "px",
            color: "#d9c9a0",
            align: "center",
            lineSpacing: -2,
          },
        )
        .setOrigin(0.5, 1)
        .setAlpha(0.8)
        .setDepth(2);
    }
  }

  _redrawTiles() {
    const g = this._tileGfx;
    if (!g || !this._geom) return;
    const { cell, x0, y0 } = this._geom;
    g.clear();
    for (let r = 0; r < this._R; r++) {
      for (let c = 0; c < this._C; c++) {
        const st = this._grid[r][c];
        const x = x0 + c * cell;
        const y = y0 + r * cell;
        if (st === MOSAIC_FILL) {
          // a lapis tile seated in the socket
          g.fillGradientStyle(0x2e4470, 0x33497a, 0x131f38, 0x172440, 1);
          g.fillRoundedRect(x + 3, y + 3, cell - 6, cell - 6, 3);
          g.lineStyle(1, 0x090e1c, 1);
          g.strokeRoundedRect(x + 3, y + 3, cell - 6, cell - 6, 3);
          // glazed catch of light, upper-left
          g.fillStyle(0xaec4ea, 0.28);
          g.fillRoundedRect(x + 5, y + 5, cell * 0.42, 2.5, 2);
          g.fillRoundedRect(x + 5, y + 5, 2.5, cell * 0.34, 2);
        } else if (st === MOSAIC_MARK && !this._done) {
          // chalk dot — the mason's "nothing goes here"
          g.fillStyle(0xd8d2c4, 0.5);
          g.fillCircle(x + cell / 2, y + cell / 2, Math.max(2, cell * 0.08));
        }
      }
    }
  }

  _checkDone() {
    if (this._done) return;
    for (let r = 0; r < this._R; r++) {
      for (let c = 0; c < this._C; c++) {
        const filled = this._grid[r][c] === MOSAIC_FILL;
        if (filled !== this._target[r][c]) return;
      }
    }
    this._done = true;
    // chalk notes brush away, only the mosaic remains
    for (let r = 0; r < this._R; r++) {
      for (let c = 0; c < this._C; c++) {
        if (this._grid[r][c] === MOSAIC_MARK) this._grid[r][c] = MOSAIC_EMPTY;
      }
    }
    this._redrawTiles();
    this._gong();
    this._finishTexts();
  }

  _finishTexts() {
    if (this.statusText) {
      this.statusText.setText("The wall spells it out.");
      this.statusText.setColor("#1aaf7a");
    }
    if (this.subText) this.subText.setAlpha(0);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "The tiles fell out long ago.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.subText = this.add
      .text(W / 2, 68, "click seats a tile · right-click chalks a note", {
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

  // ── sounds ─────────────────────────────────────────────────────────────────

  // ceramic tick — seat a tile (higher), take it out (lower), chalk (soft)
  _tick(freq, vol) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const dur = 0.06;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 3;
      const g = ac.createGain();
      g.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * vol;
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // low stone gong when the mosaic is whole again
  _gong() {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const master = ac.createGain();
      master.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.55;
      master.connect(ac.destination);
      const partials = [
        [104, 1, 3.0],
        [156, 0.5, 2.4],
        [208, 0.3, 2.0],
        [312, 0.15, 1.5],
      ];
      for (const [f, amp, dur] of partials) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._tileGfx = null;
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
        fontFamily: '"Special Elite", monospace',
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
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
