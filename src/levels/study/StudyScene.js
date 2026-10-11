import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, WALK_MS, zoomInto, zoomOutFrom } from "../../shared/house.js";
import { chime } from "../../shared/paint.js";
import { layoutStudy, paintStudy, releaseStudyArt } from "./study.js";

// ─────────────────────────────────────────────────────────────────────────────
// The study: the first room off the hall. Not a level, and with no code of
// its own — it is where three of them are found. A glass case of earth under
// the lamp, the window on the moonlit garden, a cipher wheel beside it:
// each glints until its puzzle has been solved, and a click on it opens the
// puzzle. Solved, it stops glinting and is no longer to be opened from here.
//
// On the desk stands a small gilt chest, glinting very faintly. It cannot be
// opened — pointed at, it only says it is locked. It opens of itself once
// all three puzzles are solved, and a key comes up out of it and hangs
// there to be taken: the key to the next door along the hall. Taken, it
// goes to the index, where the keys are kept. The chest stands open, empty.
//
// The room is painted (study.js). Live over it: the lamp, the candle, dust
// in the moonbeam, the glints, the chest and its key.
// ─────────────────────────────────────────────────────────────────────────────

// the puzzles the table lamp and the desk's candle are lit for
const LAMP_FOR = "binarytree";
const CANDLE_FOR = "cryptex";

export default class StudyScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Study" });
  }

  create(data) {
    this.beginScene();
    this._sparkles = [];
    this._build(this.cameras.main.width, this.cameras.main.height);
    // come back from one of the room's puzzles: draw back from the thing it was
    const left = this._L.things.find((thing) => thing.level === data?.from?.level);
    if (left) zoomOutFrom(this, left.box);
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
    // and the candle by the cipher wheel until the wheel has
    const candleOn = !levels.isCompleted(levels.indexOf(CANDLE_FOR));
    const L = (this._L = layoutStudy(W, H, { lampOn, candleOn }));
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
    this._flame = candleOn ? glow(L.flame, 0.4) : null;

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

    // the chest: open if its key has been taken; otherwise shut — locked, and
    // saying so — and if the room is finished, about to open
    const waiting = levels.keyWaitingIn("Study");
    const c = L.chest;
    const taken = !waiting && L.things.every((thing) => levels.isCompleted(levels.indexOf(thing.level)));
    this._chest = this.add.image(c.box.x, c.box.y, taken ? k.open : k.shut).setOrigin(0, 0).setDepth(-6);
    // with the candle out there is only the moon on it
    if (!candleOn) this._chest.setTint(0x9aa0b8);
    if (!taken) {
      // gold, catching the candle: a glint now and then, no more
      this._glints = c.glints.map((p, n) => {
        const glint = this.add.image(p.x, p.y, k.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0).setAlpha(0).setDepth(-5);
        glint.setDisplaySize(11 * L.u, 11 * L.u);
        this.ambientObject(glint);
        this.ambientTween({ targets: glint, alpha: { from: 0, to: 0.7 }, duration: 900, hold: 120, yoyo: true, repeat: -1, repeatDelay: 1900 + n * 900, delay: 600 + n * 1300, ease: "Sine.easeInOut" });
        return glint;
      });
    }
    if (!taken && !waiting) {
      this._lock = this.add
        .zone(c.hit.x, c.hit.y, c.hit.width, c.hit.height)
        .setOrigin(0, 0)
        .setInteractive({ cursor: "not-allowed" })
        .setData("interactionLabel", "Locked")
        .setDepth(5);
    }
    // not before the room has been walked back into
    if (waiting) this.time.delayedCall(WALK_MS + 700, () => this._offerKey(waiting, k));

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

  // The chest opens and offers its key: light gathers on it, the lid goes
  // back, the key comes up out of it turning in its own light, and hangs
  // there. A click takes it: it goes off to the index, where keys are kept.
  _offerKey(key, k) {
    const L = this._L, levels = this.services.levels;
    if (!L) return;
    const m = L.chest.mouth, u = L.u;
    const still = this.reducedMotion;
    const halo = this.add.image(m.x, m.y, k.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd98a).setAlpha(0).setDepth(-5);
    halo.setDisplaySize(50 * u, 50 * u);
    this.tweens.add({ targets: halo, alpha: 0.55, displayWidth: 120 * u, displayHeight: 120 * u, duration: still ? 1 : 700, ease: "Sine.easeOut" });
    this.time.delayedCall(still ? 1 : 520, () => {
      this._chest.setTexture(k.open).clearTint();
      this._glints?.forEach((glint) => glint.destroy());
      chime(this, [[784, 0.05], [1175, 0.04], [1568, 0.03]], 1.1);
      const h = 50 * u;
      const item = this.add.image(m.x, m.y, k.key).setDepth(20).setAlpha(0);
      item.setDisplaySize(h * (96 / 220) * 0.3, h * 0.3);
      const up = m.y - 84 * u;
      this.tweens.add({ targets: item, y: up, alpha: 1, displayWidth: h * (96 / 220), displayHeight: h, duration: still ? 1 : 1100, ease: "Cubic.easeOut" });
      this.tweens.add({ targets: halo, y: up, duration: still ? 1 : 1100, ease: "Cubic.easeOut" });
      const sway = still ? null : this.tweens.add({ targets: item, angle: { from: -6, to: 6 }, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this._sparkles.push(attachMovableSparkles(this, item, { padding: 6 }));
      // there to be taken, once it has come up
      this.time.delayedCall(still ? 1 : 1100, () => {
        item.setInteractive({ useHandCursor: true }).setData("interactionLabel", "Take the key");
        item.once("pointerdown", () => {
          if (!levels.takeKey(key)) return;
          item.disableInteractive();
          // nothing is under the pointer any more
          this.game.events.emit("puzzle:interaction", { label: "" });
          this.game.canvas.style.cursor = "";
          sway?.stop();
          chime(this, [[1568, 0.04], [2093, 0.03]], 0.6);
          // off toward the index, on the right
          this.tweens.add({ targets: [item, halo], x: L.W + 30 * u, y: L.H * 0.42, alpha: 0, duration: still ? 1 : 700, ease: "Cubic.easeIn",
            onComplete: () => { item.setVisible(false); halo.destroy(); } });
        });
      });
    });
  }

  update(time) {
    if (!this._L || !this.ambientMotion || this.reducedMotion) return;
    const t = time / 1000;
    this._flame?.setAlpha(0.36 + 0.06 * Math.sin(t * 9) + Math.random() * 0.05);
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
