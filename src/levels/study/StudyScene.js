import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, zoomInto } from "../../shared/house.js";
import { layoutStudy, paintStudy, releaseStudyArt } from "./study.js";

// ─────────────────────────────────────────────────────────────────────────────
// The study: the first room off the hall. Not a level, and with no code of
// its own — it is where three of them are found. A glass case of earth under
// the lamp, the window on the moonlit garden, a cipher wheel beside it:
// each glints until its puzzle has been solved, and a click on it opens the
// puzzle. Solved, it stops glinting and is no longer to be opened from here.
//
// The room is painted (study.js). Live over it: the lamp, the candle, dust
// in the moonbeam, the glints.
// ─────────────────────────────────────────────────────────────────────────────

// the puzzle the table lamp is lit for
const LAMP_FOR = "binarytree";

export default class StudyScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Study" });
  }

  create() {
    this.beginScene();
    this._sparkles = [];
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  _build(W, H) {
    const levels = this.services.levels;
    // the lamp burns over the glass case until the case has been solved
    const lampOn = !levels.isCompleted(levels.indexOf(LAMP_FOR));
    const L = (this._L = layoutStudy(W, H, { lampOn }));
    const k = paintStudy(this, L).keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    const glow = (at, alpha) =>
      this.add
        .image(at.x, at.y, k.glow)
        .setDisplaySize(at.r * 2, at.r * 2)
        .setTint(0xffc078)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(alpha)
        .setDepth(-8);
    // the lamp, breathing very slightly; the candle, never still
    const lit = lampOn ? 1 : 0.2;
    this._lamp = glow(L.lampGlow, 0.2 * lit);
    this.ambientTween({ targets: this._lamp, alpha: { from: 0.17 * lit, to: 0.25 * lit }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this._flame = glow(L.flame, 0.4);

    // the things that open puzzles; one already solved is only furniture
    for (const thing of L.things) {
      if (levels.isCompleted(levels.indexOf(thing.level))) continue;
      const shape = new Phaser.Geom.Polygon(thing.quad.flatMap((p) => [p.x, p.y]));
      const zone = this.add
        .zone(0, 0, W, H)
        .setOrigin(0, 0)
        .setInteractive({ hitArea: shape, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
        .setData("interactionLabel", thing.label)
        .setDepth(5);
      zone.on("pointerdown", () => {
        // walk up to it, and ask for its puzzle
        zoomInto(this, thing.box);
        this.game.events.emit(HOUSE_GO, { level: thing.level });
      });
      this._sparkles.push(attachMovableSparkles(this, zone, { padding: 3, bounds: () => thing.box }));
    }

    // dust turning in the moonbeam
    const w = L.win;
    for (let i = 0; i < 14; i++) {
      const x0 = w.cx + (Math.random() - 0.6) * w.rx * 3;
      const y0 = w.top + Math.random() * (H * 0.8 - w.top);
      const mote = this.add
        .image(x0, y0, k.glow)
        .setDisplaySize(4 * L.u, 4 * L.u)
        .setTint(0xc8d8ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-7);
      this.ambientObject(mote);
      this.ambientTween({
        targets: mote,
        x: x0 + (Math.random() - 0.5) * 50 * L.u,
        y: y0 + (10 + Math.random() * 40) * L.u,
        alpha: { from: 0, to: 0.25 + Math.random() * 0.35 },
        duration: 4000 + Math.random() * 4000,
        delay: Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  update(time) {
    if (!this._L || !this.ambientMotion || this.reducedMotion) return;
    const t = time / 1000;
    this._flame.setAlpha(0.36 + 0.06 * Math.sin(t * 9) + Math.random() * 0.05);
  }

  _teardown() {
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseStudyArt(this.textures);
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this._sparkles?.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseStudyArt(this.textures);
    this._L = null;
  }
}
