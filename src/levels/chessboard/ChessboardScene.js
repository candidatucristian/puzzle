import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { glowCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintCandleFlame, addCandleFlame, flickerCandleFlame } from "../../shared/candleFlame.js";
import { fitRender } from "../../shared/renderFit.js";
import GAME from "./chessGame.json";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "CHESSBOARD"  ·  code: HEADACHE  ·  expert  ·  TOOL (chess notation)
//
// An abandoned game on the games table in Room III, the captain's cabin,
// looked down on from white's side by the light of a candle burnt half down
// at the table's far corner. A board of maple and walnut squares in a walnut
// frame, the coordinates inlaid round it in boxwood (a–h, 1–8). Eight pieces
// remain on it — one on every rank, both kings present, as chess law demands
// — turned boxwood for white, ebony for black:
//
//   ♖ h1  ♔ e2  ♙ a3  ♛ d4  ♚ a5  ♞ c6  ♗ h7  ♝ e8
//
// Read the FILES in rank order, 1 to 8, and the position itself spells the
// word:  h·e·a·d·a·c·h·e  →  HEADACHE.
// Nothing in the scene says so — the coordinates on the frame are the only
// tool. Pieces can be picked up (they lift off their square, their shadow
// thinning under them) and they knock softly back down on the same square:
// the position is the message, and the message keeps itself.
//
// The table is a Blender render (art/blender/chess_game.py, the set from
// chess_set.py, as Room III has it): the plate without its pieces, and each
// piece and each piece's shadow cut apart, laid back on here so a piece can
// be lifted. Live over it only the candle's flame.
// ─────────────────────────────────────────────────────────────────────────────

const DENIED_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="#171717" fill-opacity=".85" stroke="#e45454" stroke-width="2.5"/><path d="m6 6 12 12" stroke="#e45454" stroke-width="2.5"/></svg>')}") 12 12, not-allowed`;

// the eight survivors — file+rank is the cipher, the pieces are dressing.
// No pawns on back ranks, kings never adjacent, nobody left in check.
// (art/blender/chess_game.py renders exactly these.)
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

const PLATE = `chess_plate_v${GAME.version}`;
const PIECES = `chess_pieces_v${GAME.version}`;
const GLOW = "chess_glow";
const LIFT = 2.6; // cm a piece is lifted off its square

export default class ChessboardScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Chessboard" });
  }

  preload() {
    const url = (what) => `assets/images/Chessboard/chess-${what}-v${GAME.version}.webp`;
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, url("plate"));
    if (!this.textures.exists(PIECES)) this.load.image(PIECES, url("pieces"));
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#040406");
    this.isSolved = false;
    if (this.textures.exists(PIECES)) {
      const atlas = this.textures.get(PIECES);
      GAME.pieces.forEach((p, i) => {
        if (!atlas.has(`piece-${i}`)) atlas.add(`piece-${i}`, 0, ...p.frame);
        if (!atlas.has(`shadow-${i}`)) atlas.add(`shadow-${i}`, 0, ...p.shadowFrame);
      });
    }
    paintCandleFlame(this.textures);
    if (!this.textures.exists(GLOW)) addCanvasTexture(this.textures, GLOW, glowCanvas());
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
    const f = (this._f = fitRender(W, H, GAME));
    if (this.textures.exists(PLATE)) {
      this.add.image(f.x, f.y, PLATE).setOrigin(0, 0)
        .setDisplaySize(GAME.width * f.s, GAME.height * f.s).setDepth(0);
    }
    if (this.textures.exists(PIECES)) this._placePieces(f);
    // the candle's flame on its wick, and its light round it
    const at = f.at([GAME.flame.x, GAME.flame.y]);
    const s = GAME.flame.s * f.s;
    this._flame = addCandleFlame(this, { x: at.x, y: at.y, s }, 20);
    this._glow = this.add.image(at.x, at.y - 1.2 * s, GLOW).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffb066).setAlpha(0.3).setDepth(19).setDisplaySize(16 * s, 16 * s);
  }

  _placePieces(f) {
    this._pieces = [];
    const placed = (frame, box, depth) => {
      const at = f.at([box[0], box[1]]);
      return this.add.image(at.x, at.y, PIECES, frame).setOrigin(0, 0)
        .setDisplaySize(box[2] * f.s, box[3] * f.s).setDepth(depth);
    };
    GAME.pieces.forEach((p, i) => {
      // shadows under every piece; nearer pieces stand in front of those behind
      const shadow = placed(`shadow-${i}`, p.shadowBox, 1);
      const body = placed(`piece-${i}`, p.box, 5 + (8 - p.rank) * 0.01);
      const rest = { x: body.x, y: body.y };
      const lift = { x: p.up[0] * LIFT * f.s, y: p.up[1] * LIFT * f.s };

      // pieces can be picked up and set down — they always settle back
      const outline = p.hit.map((q) => f.at(q));
      const xs = outline.map((q) => q.x), ys = outline.map((q) => q.y);
      const x0 = Math.min(...xs), y0 = Math.min(...ys);
      const zone = this.add.zone(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0)
        .setOrigin(0, 0).setDepth(10 + (8 - p.rank) * 0.01);
      zone.setInteractive({
        hitArea: new Phaser.Geom.Polygon(outline.map((q) => ({ x: q.x - x0, y: q.y - y0 }))),
        hitAreaCallback: Phaser.Geom.Polygon.Contains,
        cursor: "pointer",
      });
      zone.on("pointerdown", () => {
        if (zone._lifted) return;
        if (this._cursorBeforeHold === undefined) {
          this._cursorBeforeHold = this.input.manager.defaultCursor;
        }
        for (const piece of this._pieces) piece.input.cursor = DENIED_CURSOR;
        this.input.setDefaultCursor(DENIED_CURSOR);
        zone._lifted = true;
        body.setPosition(rest.x + lift.x, rest.y + lift.y);
        shadow.setAlpha(0.45);
        this._knock(340);
      });
      const settle = () => {
        if (!zone._lifted) return;
        zone._lifted = false;
        body.setPosition(rest.x, rest.y);
        shadow.setAlpha(1);
        this._knock(170);
      };
      zone.on("pointerup", settle);
      zone.on("pointerout", settle);

      this._pieces.push(zone);
    });
  }

  _restorePieceCursor() {
    if (this._cursorBeforeHold === undefined) return;
    for (const piece of this._pieces || []) {
      if (piece.input) piece.input.cursor = "pointer";
    }
    this.input.setDefaultCursor(this._cursorBeforeHold);
    this._cursorBeforeHold = undefined;
  }

  update(time) {
    if (!this._flame || !this.ambientMotion || this.reducedMotion) return;
    const t = time / 1000;
    flickerCandleFlame(this._flame, t);
    this._glow?.setAlpha(0.3 + 0.04 * Math.sin(t * 9) + Math.random() * 0.03);
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
    // destroy rather than just detach: the old pieces would go on catching
    // clicks after a resize
    for (const obj of this.children.list.slice()) obj.destroy();
    this._pieces = null;
    this._flame = null;
    this._glow = null;
  }

  shutdown() {
    this._restorePieceCursor();
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._flame = null;
    this._glow = null;
  }
}

