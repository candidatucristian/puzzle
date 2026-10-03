import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { noiseBurst, chime } from "../../shared/paint.js";
import { layoutBench, paintBench, releaseBenchArt } from "./bench.js";
import { RESISTORS, readFirstBands } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "RESISTORS"  ·  code: 1024  ·  the colour code, first bands
//
// A workshop at night, a bench under a magnifier lamp, and in its ring of
// light a green circuit board with four big resistors soldered in a row,
// R1 to R4, four colour bands on each:
//
//   R1 brown black red gold · R2 black brown black gold
//   R3 red red orange gold · R4 yellow violet red gold
//
// Pinned to the bench, the colour code: ten swatches black to white, a digit
// under each (black 0, brown 1, red 2, orange 3, yellow 4 …). The first band
// of each resistor, in order: brown black red yellow — 1 0 2 4.
//
// A tap on a resistor holds a loupe over it, its bands big and clear; the
// soldering iron's tip glows, the ring light hums.
// ─────────────────────────────────────────────────────────────────────────────

const LOUPE_MS = 3200; // how long the loupe stays over a resistor

export default class ResistorsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Resistors" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  static resistors() {
    return RESISTORS.map((bands) => bands.slice());
  }

  static code() {
    return readFirstBands();
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const L = (this._L = layoutBench(W, H));
    const art = paintBench(this, L);
    const k = art.keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the ring light's glow on the board, humming a little
    const l = L.lens;
    this._ring = this.add
      .image(l.x, l.y, k.glow)
      .setDisplaySize(l.r * 4.5, l.r * 4.5)
      .setTint(0xfff0cc)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.16)
      .setDepth(-9);
    this.ambientTween({
      targets: this._ring,
      alpha: { from: 0.16, to: 0.11 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // the iron's tip, hot
    const it = L.iron;
    const tip = this.add
      .image(it.x + 48 * it.s, it.y - 26 * it.s, k.glow)
      .setDisplaySize(30 * it.s, 30 * it.s)
      .setTint(0xff8a30)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5)
      .setDepth(-9);
    this.ambientTween({
      targets: tip,
      alpha: { from: 0.5, to: 0.25 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // the loupe over each resistor, held up on a tap
    this._loupes = art.loupes.map((lp) => {
      const img = this.add
        .image(lp.x, lp.y - L.resistors[lp.i].r * 1.2, lp.key)
        .setOrigin(0.5, 0.78)
        .setScale(0.3)
        .setAlpha(0)
        .setDepth(6);
      const r = L.resistors[lp.i];
      this.add
        .zone(r.x, r.y, r.len * 1.5, r.r * 5)
        .setInteractive({ useHandCursor: true })
        .setData("interactionLabel", `Look closer at R${lp.i + 1}`)
        .setDepth(5)
        .on("pointerdown", () => this._look(lp.i));
      return img;
    });
    this._looking = null;

    this.levelText = drawLevelLabel(this, W, H);
  }

  // the loupe comes down over a resistor, holds, and lifts; another tap
  // moves it on
  _look(i) {
    if (this._looking === i) {
      this._lift(i);
      return;
    }
    if (this._looking !== null) this._lift(this._looking);
    this._looking = i;
    const img = this._loupes[i];
    this.tweens.killTweensOf(img);
    this.tweens.add({ targets: img, scale: 1, alpha: 1, duration: 260, ease: "Back.easeOut" });
    chime(this, [[1800, 0.03]], 0.25);
    noiseBurst(this, { dur: 0.06, type: "highpass", freq: 3000, q: 0.7, gain: 0.08, env: (x) => Math.exp(-x * 5) });
    if (this._loupeTimer) this._loupeTimer.remove(false);
    this._loupeTimer = this.time.delayedCall(LOUPE_MS, () => {
      if (this._looking === i) this._lift(i);
    });
  }

  _lift(i) {
    const img = this._loupes[i];
    if (this._looking === i) this._looking = null;
    if (!img || !img.active) return;
    this.tweens.killTweensOf(img);
    this.tweens.add({ targets: img, scale: 0.3, alpha: 0, duration: 220, ease: "Quad.easeIn" });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseBenchArt(this.textures);
    this._loupes = [];
    this._looking = null;
    this._loupeTimer = null;
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseBenchArt(this.textures);
    this._L = null;
  }
}
