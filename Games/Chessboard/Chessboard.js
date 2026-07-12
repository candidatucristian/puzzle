// ─────────────────────────────────────────────────────────────────────────────
// Level — "CHESSBOARD"  ·  code: HEADACHE  ·  expert  ·  TOOL (chess notation)
//
// An abandoned game, seen from above. A walnut chessboard on a green baize
// mat, algebraic coordinates etched into the frame (a–h, 1–8). Eight pieces
// remain on the board — one on every rank, both kings present, as chess law
// demands:
//
//   ♖ h1  ♔ e2  ♙ a3  ♛ d4  ♚ a5  ♞ c6  ♗ h7  ♝ e8
//
// Read the FILES in rank order, 1 to 8, and the position itself spells the
// word:  h·e·a·d·a·c·h·e  →  HEADACHE.
// Nothing in the scene says so — the board's etched coordinates are the
// only tool. Pieces can be picked up and set down (they knock softly on
// the felt) but they always settle back on their square: the position is
// the message, and the message keeps itself.
//
// No halos, no pulsing, no animated lighting — still life, museum-quiet.
// Same scene contract as the other levels: GAME_LEVELS, initGlobalAudio,
// transitionToLevel(), canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const CHESS_FILES = "abcdefgh";

// the eight survivors — file+rank is the cipher, glyphs are just dressing.
// No pawns on back ranks, kings never adjacent, nobody left in check.
const CHESS_PIECES = [
  { sq: "h1", glyph: "♖", white: true },
  { sq: "e2", glyph: "♔", white: true },
  { sq: "a3", glyph: "♙", white: true },
  { sq: "d4", glyph: "♛", white: false },
  { sq: "a5", glyph: "♚", white: false },
  { sq: "c6", glyph: "♞", white: false },
  { sq: "h7", glyph: "♗", white: true },
  { sq: "e8", glyph: "♝", white: false },
];

const CHESS_GLYPH_FONT =
  '"Segoe UI Symbol", "DejaVu Sans", "Noto Sans Symbols 2", serif';

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

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // deterministic pseudo-random for wood grain and felt weave
  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  _lerpColor(c1, c2, t) {
    const a = Phaser.Display.Color.ValueToColor(c1);
    const b = Phaser.Display.Color.ValueToColor(c2);
    const o = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, t * 100);
    return Phaser.Display.Color.GetColor(o.r, o.g, o.b);
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
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.6, 0.6);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0, 0.5, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.5, 0, 0.5);
    vg.fillRect(W - v, 0, v, H);
  }

  _drawTable(W, H, cx, cy, inner, frame) {
    // mahogany table
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(0x2a1409, 0x30180b, 0x120802, 0x160a03, 1);
    bg.fillRect(0, 0, W, H);
    const rnd = this._rng(311);
    bg.lineStyle(1, 0x000000, 0.18);
    for (let i = 0; i < 26; i++) {
      const gy = rnd() * H;
      const gx = rnd() * W;
      bg.lineBetween(gx, gy, gx + 40 + rnd() * 110, gy + (rnd() * 4 - 2));
    }
    // one still shaft of window light across the table — painted, not animated
    bg.fillGradientStyle(0xffe9c0, 0x000000, 0x000000, 0x000000, 0.05, 0, 0.02, 0);
    bg.fillRect(0, 0, W, H);

    // green baize mat under the board
    const half = inner / 2 + frame;
    const matPad = Math.min(W, H) * 0.085;
    const mat = this.add.graphics().setDepth(-8);
    mat.fillStyle(0x000000, 0.4);
    mat.fillRoundedRect(
      cx - half - matPad + 5,
      cy - half - matPad + 7,
      (half + matPad) * 2,
      (half + matPad) * 2,
      14,
    );
    mat.fillGradientStyle(0x22402c, 0x1e3a28, 0x122417, 0x15291b, 1);
    mat.fillRoundedRect(
      cx - half - matPad,
      cy - half - matPad,
      (half + matPad) * 2,
      (half + matPad) * 2,
      14,
    );
    // stitched double border
    mat.lineStyle(1.4, 0x0c1a10, 0.9);
    mat.strokeRoundedRect(
      cx - half - matPad + 7,
      cy - half - matPad + 7,
      (half + matPad) * 2 - 14,
      (half + matPad) * 2 - 14,
      10,
    );
    mat.lineStyle(1, 0x3d5c46, 0.5);
    mat.strokeRoundedRect(
      cx - half - matPad + 10,
      cy - half - matPad + 10,
      (half + matPad) * 2 - 20,
      (half + matPad) * 2 - 20,
      9,
    );
    // felt weave — tiny stitches, deterministic
    const fr = this._rng(1259);
    mat.lineStyle(1, 0x0e2013, 0.25);
    for (let i = 0; i < 120; i++) {
      const fx = cx - half - matPad + 12 + fr() * ((half + matPad) * 2 - 24);
      const fy = cy - half - matPad + 12 + fr() * ((half + matPad) * 2 - 24);
      mat.lineBetween(fx, fy, fx + 2.5, fy + (fr() < 0.5 ? 0.8 : -0.8));
    }
  }

  _drawBoard(cx, cy, sq, inner, frame) {
    const half = inner / 2;
    const g = this.add.graphics().setDepth(-5);

    // board shadow on the felt
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(cx - half - frame + 4, cy - half - frame + 6, (half + frame) * 2, (half + frame) * 2, 10);

    // walnut frame
    g.fillGradientStyle(0x4a2c14, 0x54331a, 0x241206, 0x2c1709, 1);
    g.fillRoundedRect(cx - half - frame, cy - half - frame, (half + frame) * 2, (half + frame) * 2, 10);
    g.lineStyle(1.5, 0x1a0d04, 1);
    g.strokeRoundedRect(cx - half - frame, cy - half - frame, (half + frame) * 2, (half + frame) * 2, 10);
    // top edge catches the light
    g.fillStyle(0x8a5c30, 0.35);
    g.fillRoundedRect(cx - half - frame + 2, cy - half - frame + 2, (half + frame) * 2 - 4, 3, 3);
    // brass inner trim
    g.lineStyle(1.2, 0xa8894a, 0.55);
    g.strokeRect(cx - half - 2, cy - half - 2, inner + 4, inner + 4);

    // squares — maple and walnut, each with its own grain
    const rnd = this._rng(777);
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const x = cx - half + f * sq;
        const y = cy - half + r * sq;
        // a1 (f=0, bottom row) must be dark → (f + rank) even = dark
        const rank = 8 - r;
        const dark = (f + rank) % 2 === 0;
        const jitter = (rnd() - 0.5) * 0.14;
        const base = dark
          ? this._lerpColor(0x6b4526, 0x5a3a1e, 0.5 + jitter)
          : this._lerpColor(0xcdb282, 0xc0a470, 0.5 + jitter);
        g.fillStyle(base, 1);
        g.fillRect(x, y, sq + 0.5, sq + 0.5);
        // grain strokes
        g.lineStyle(1, dark ? 0x3a2410 : 0x9a8258, 0.22);
        for (let k = 0; k < 2; k++) {
          const gy = y + rnd() * sq;
          g.lineBetween(x + 2, gy, x + sq - 2 - rnd() * sq * 0.4, gy + (rnd() - 0.5) * 3);
        }
        // soft edge shading gives each square a hint of depth
        g.lineStyle(1, 0x000000, dark ? 0.16 : 0.08);
        g.lineBetween(x, y + sq - 0.5, x + sq, y + sq - 0.5);
      }
    }

    // etched coordinates — the only tool the level offers
    const coordStyle = {
      fontFamily: '"Special Elite", monospace',
      fontSize: Math.max(11, Math.round(sq * 0.26)) + "px",
      color: "#d9c9a0",
    };
    for (let f = 0; f < 8; f++) {
      const x = cx - half + (f + 0.5) * sq;
      this.add
        .text(x, cy + half + frame * 0.52, CHESS_FILES[f], coordStyle)
        .setOrigin(0.5)
        .setAlpha(0.6)
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
        .setAlpha(0.6)
        .setDepth(-4);
      this.add
        .text(cx + half + frame * 0.52, y, String(rank), coordStyle)
        .setOrigin(0.5)
        .setAlpha(0.35)
        .setDepth(-4);
    }
  }

  _pieceStyle(white, sq) {
    return {
      fontFamily: CHESS_GLYPH_FONT,
      fontSize: Math.round(sq * 0.82) + "px",
      color: white ? "#efe4c8" : "#221a10",
    };
  }

  _placePieces(cx, cy, sq, inner) {
    const half = inner / 2;
    this._pieces = [];

    for (const def of CHESS_PIECES) {
      const file = CHESS_FILES.indexOf(def.sq[0]);
      const rank = parseInt(def.sq[1], 10);
      const x = cx - half + (file + 0.5) * sq;
      const y = cy + half - (rank - 0.5) * sq;

      const t = this.add
        .text(x, y, def.glyph, this._pieceStyle(def.white, sq))
        .setOrigin(0.5, 0.58)
        .setDepth(5);
      t.setStroke(def.white ? "#241a0e" : "#8a7454", Math.max(1.5, sq * 0.035));
      t.setShadow(3, 5, "rgba(0,0,0,0.45)", 4, false, true);

      // pieces can be picked up and set down — they always settle back
      t.setInteractive({ cursor: "pointer" });
      t._homeY = y;
      t.on("pointerdown", () => {
        if (t._lifted) return;
        t._lifted = true;
        t.y = t._homeY - sq * 0.14;
        t.setShadow(6, 10, "rgba(0,0,0,0.35)", 7, false, true);
        this._knock(340);
      });
      const settle = () => {
        if (!t._lifted) return;
        t._lifted = false;
        t.y = t._homeY;
        t.setShadow(3, 5, "rgba(0,0,0,0.45)", 4, false, true);
        this._knock(170);
      };
      t.on("pointerup", settle);
      t.on("pointerout", settle);

      this._pieces.push(t);
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 42, "An abandoned game.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 30, "Level 9", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
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
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
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
      g.connect(ac.destination);
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
