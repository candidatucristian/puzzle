import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { paintTrophies, releaseTrophyArt, FLAG_FRAMES } from "./trophies.js";
import { FLAG_CODES } from "./flagDesigns.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "FLAGS"  ·  code: DEBRIEFING   ·  the trophy wall
//
// A quiet room in the house at night: green walls over walnut panelling, and
// all that was ever won set out on show — the big cups on a long sideboard,
// small ones and a shield on a shelf over it, medals hanging from the
// shelf's edge on their ribbons. High on the wall a brass rod runs the
// room's width, and from it hang five national flags on their rings,
// stirring a little in a draught.
//
// Read left to right. Each flag is a country; each country has its two-letter
// code. Concatenate the codes in hanging order:
//
//   Germany DE · Brazil BR · Ireland IE · Finland FI · Nigeria NG
//                                                    →  DEBRIEFING
//
// Nothing on screen names a country or a code, and nothing snaps. The access
// code is the proof. The cups and the medals are only what was won.
//
// The wall is painted once per screen size (trophies.js); what moves is
// driven from here: the flags' folds and their sway, the medals turning a
// little on their ribbons, the light catching the silver now and then.
// ─────────────────────────────────────────────────────────────────────────────

export default class FlagsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Flags" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    // (there is no mouse manager on a touch-only setup)
    if (this.input.mouse) this.input.mouse.disableContextMenu();
    this._flagPhase = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const art = (this._art = paintTrophies(this, W, H, FLAG_CODES));
    const L = (this._L = art.L);
    const K = art.keys;
    this.add.image(0, 0, K.room).setOrigin(0, 0).setDepth(-10);
    this._flags = art.flags.map((f, i) => ({
      img: this.add.image(f.x, f.y, f.key, 0).setOrigin(0.5, f.oy).setScale(1 / art.res).setDepth(2 + i * 0.01),
      ph: i * 1.7,
    }));
    this._medals = art.medals.map((m, i) => ({
      img: this.add.image(m.x, m.y, m.key).setOrigin(0.5, 0).setScale(1 / art.res).setDepth(3),
      ph: i * 2.1,
    }));
    this._glints = L.glints.map((p, i) => ({
      img: this.add
        .image(p.x, p.y, K.glint)
        .setDisplaySize(p.s * 0.22, p.s * 0.22)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(4),
      ph: i * 2.9,
      sp: 0.35 + (i % 4) * 0.12,
    }));
    this._built = true;
  }

  // ── what moves ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._built || !this.ambientMotion) return;
    const t = time / 1000;
    const dt = Math.min(delta || 16, 100) / 1000;
    const draught = 0.5 + 0.5 * Math.sin(t * 0.31) * Math.sin(t * 0.19 + 1);
    // the flags: their folds run slowly with the draught, the phase added up
    // frame by frame, and they sway a little on their rings
    this._flagPhase += dt * (2 + 2 * draught);
    for (const f of this._flags) {
      f.img.setFrame(Math.floor(this._flagPhase + f.ph * 3) % FLAG_FRAMES);
      f.img.rotation = 0.012 * draught * Math.sin(t * 0.9 + f.ph);
    }
    // the medals, turning a little on their ribbons
    for (const m of this._medals) m.img.rotation = 0.05 * Math.sin(t * 0.8 + m.ph) * (0.4 + 0.6 * draught);
    // the light catching the silver, now and then
    for (const g of this._glints) {
      const a = Math.sin(t * g.sp + g.ph);
      g.img.setAlpha(a > 0.86 ? ((a - 0.86) / 0.14) * 0.85 : 0);
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._flags = this._medals = this._glints = null;
    releaseTrophyArt(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._flags = this._medals = this._glints = null;
    releaseTrophyArt(this.textures);
  }
}
