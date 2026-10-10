import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { paintParlour, releaseParlourArt, releasePieceArt } from "./parlour.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "CHESSBOARD"  ·  code: HEADACHE  ·  expert  ·  TOOL (chess notation)
//
// An abandoned game in a quiet parlour, painted like a storybook still life:
// a board of maple and walnut on a walnut table in a dark room, late light
// falling across it through sheer curtains. The coordinates are cut
// into the frame (a–h, 1–8). Eight pieces remain on the board — one on every
// rank, both kings present, as chess law demands:
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
// The pieces are painted, not set in a font, so they look the same on every
// computer: turned boxwood for white, ebony for black.
//
// No halos, no pulsing, no animated lighting — still life, museum-quiet;
// only a few motes of dust turning in the window's light.
// ─────────────────────────────────────────────────────────────────────────────

const CH_FONT = '"Special Elite", monospace';
const DENIED_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="#171717" fill-opacity=".85" stroke="#e45454" stroke-width="2.5"/><path d="m6 6 12 12" stroke="#e45454" stroke-width="2.5"/></svg>')}") 12 12, not-allowed`;

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

export default class ChessboardScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Chessboard" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();

    this.isSolved = false;
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.input.on("pointerup", this._restorePieceCursor, this);
    this.input.on("pointerupoutside", this._restorePieceCursor, this);
    this.input.on("gameout", this._restorePieceCursor, this);

    // kept as a reference so shutdown() can remove it (otherwise every
    // restart of the level would add one more listener)
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const art = paintParlour(this, W, H, CHESS_PIECES);
    this.add.image(0, 0, art.room).setOrigin(0, 0).setDepth(-10);
    this._placePieces(art);
    this._makeMotes(art);
    this._drawTexts(W, H);
  }

  _placePieces(art) {
    this._pieces = [];
    for (const p of art.pieces) {
      // pieces nearer to us stand in front of the ones behind
      const c = this.add.container(p.x, p.y).setDepth(5 + (8 - p.rank) * 0.01);
      const shadow = this.add
        .image(0, 0, p.shadowKey)
        .setOrigin(p.shadowOrigin.x, p.shadowOrigin.y)
        .setScale(p.shadowScale)
        .setAlpha(0.55);
      const body = this.add
        .image(0, 0, p.key)
        .setOrigin(p.originX, p.originY)
        .setScale(p.scale);
      c.add([shadow, body]);

      // pieces can be picked up and set down — they always settle back
      c.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(
          -p.sq * 0.46,
          -p.height,
          p.sq * 0.92,
          p.height + p.sq * 0.12,
        ),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        cursor: "pointer",
      });
      c.on("pointerdown", () => {
        if (c._lifted) return;
        if (this._cursorBeforeHold === undefined) {
          this._cursorBeforeHold = this.input.manager.defaultCursor;
        }
        for (const piece of this._pieces) piece.input.cursor = DENIED_CURSOR;
        this.input.setDefaultCursor(DENIED_CURSOR);
        c._lifted = true;
        body.y = -p.lift;
        shadow.setPosition(p.lift * 0.5, p.lift * 0.18).setAlpha(0.32);
        this._knock(340);
      });
      const settle = () => {
        if (!c._lifted) return;
        c._lifted = false;
        body.y = 0;
        shadow.setPosition(0, 0).setAlpha(0.55);
        this._knock(170);
      };
      c.on("pointerup", settle);
      c.on("pointerout", settle);

      this._pieces.push(c);
    }
  }

  _restorePieceCursor() {
    if (this._cursorBeforeHold === undefined) return;
    for (const piece of this._pieces || []) {
      if (piece.input) piece.input.cursor = "pointer";
    }
    this.input.setDefaultCursor(this._cursorBeforeHold);
    this._cursorBeforeHold = undefined;
  }

  // a few motes of dust, turning slowly in the window's light
  _makeMotes(art) {
    const { A0, A1, B0, B1 } = art.band;
    const H = this._H;
    const rnd = this._rng(4242);
    const inBand = (s, t) => {
      const l = A0.x + (A1.x - A0.x) * s;
      const r = B0.x + (B1.x - B0.x) * s;
      return l + (r - l) * t;
    };
    for (let i = 0; i < 12; i++) {
      const s = 0.1 + rnd() * 0.7;
      const t = 0.15 + rnd() * 0.7;
      const x = inBand(s, t);
      const y = s * H;
      const size =
        (1.5 + rnd() * 2.5) * Math.max(1, Math.min(this._W, H) / 700);
      const dot = this.add
        .image(x, y, art.mote)
        .setDisplaySize(size * 3, size * 3)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(12);
      const drift = 20 + rnd() * 40;
      this.ambientObject(dot);
      this.ambientTween({
        targets: dot,
        x: x + drift * 0.45,
        y: y + drift,
        duration: 9000 + rnd() * 9000,
        delay: rnd() * 5000,
        repeat: -1,
        onUpdate: (tw) => dot.setAlpha(Math.sin(Math.PI * tw.progress) * 0.35),
      });
    }
  }

  _drawTexts(W, H) {
    this.levelText = drawLevelLabel(this, W, H, {
      y: 30,
      font: CH_FONT,
      color: "#f0e2c4",
      shadow: "rgba(10,4,2,0.9)",
    });
  }

  // soft wooden knock — a piece lifted (higher) or set down (lower)
  _knock(freq) {
    try {
      const ac = this.sound.context;
      if (!ac || (this.services.audio.state && this.services.audio.state.muted))
        return;
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
      g.gain.value =
        (this.services.audio.state ? this.services.audio.state.sfxVol : 0.8) *
        0.5;
      src.connect(bp);
      bp.connect(g);
      g.connect(this.sound.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._restorePieceCursor();
    this.tweens.killAll();
    // destroy rather than just detach: removeAll(true) only took objects off
    // the display list, and the old pieces went on catching clicks after a
    // resize
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseParlourArt(this.textures);
    this._pieces = null;
  }

  shutdown() {
    this._restorePieceCursor();
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseParlourArt(this.textures);
    releasePieceArt(this.textures);
  }
}
