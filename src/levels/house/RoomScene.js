import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, WALK_MS, zoomInto, zoomOutFrom } from "../../shared/house.js";
import { chime } from "../../shared/paint.js";

/** A room off the hall. Not a level, and with no code of its own: it is where
 *  some of them are found. Each thing that opens a puzzle glints until the
 *  puzzle has been solved, and a click on it walks up to it and opens it;
 *  solved, it stops glinting and is only furniture.
 *
 *  Every room keeps a small gilt chest, glinting very faintly. It cannot be
 *  opened — pointed at, it only says it is locked. It opens of itself once
 *  everything in the room is solved, and a key comes up out of it and hangs
 *  there to be taken: the key to another door along the hall. Taken, the key
 *  goes to the index, and the chest stands open, empty.
 *
 *  A room says what it is by overriding:
 *    layout(W, H, levels)   where everything is — with `things` (see
 *                           roomKit's thingAt) and, if the room keeps a key,
 *                           `chest` (chestAt)
 *    paint(L)               paints it; returns the texture keys
 *                           { room, glow, shut, open, key }
 *    release()              lets those textures go
 *    live(L, k, glow)       optional: what is alive over the painting
 *    tick(t)                optional: each frame, t in seconds
 *    dustIn(L)              optional: { x, y, width, height } the moonbeam's
 *                           dust turns in
 *    chestTint(L)           optional: a tint for the chest in a darkened room
 *    open(thing, L, k, animate)
 *                           for a thing with a `first`: shows it opened —
 *                           animated or at once — and returns how long that
 *                           takes, in ms */
export default class RoomScene extends BasePuzzleScene {
  /** `place` is the room's key in the house (shared/house.js), and its scene's. */
  constructor(place) {
    super({ key: place });
    this.place = place;
  }

  create(data) {
    this.beginScene();
    this._sparkles = [];
    // what has been opened up in here: whatever was gone into is still open
    this._opened = new Set(data?.from?.level ? [data.from.level] : []);
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
    const L = (this._L = this.layout(W, H, levels));
    const k = this.paint(L);
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // a warm light over the painting, for whatever burns in the room
    const glow = (at, alpha, tint = 0xffc078) =>
      this.add
        .image(at.x, at.y, k.glow)
        .setDisplaySize(at.r * 2, at.r * 2)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(alpha)
        .setDepth(-8);
    this.live?.(L, k, glow);

    // the things that open puzzles; one already solved is only furniture. A
    // thing with a `first` (a drawer, shut) is opened by a first click, and
    // only then gone into
    for (const thing of L.things) {
      if (levels.isCompleted(levels.indexOf(thing.level))) continue;
      const shut = () => thing.first && !this._opened.has(thing.level);
      const now = () => (shut() ? thing.first : thing);
      if (!shut() && thing.first) this.open(thing, L, k, false);
      const zone = this.add
        .zone(0, 0, W, H)
        .setOrigin(0, 0)
        .setInteractive({ hitArea: new Phaser.Geom.Polygon(now().quad.flatMap((p) => [p.x, p.y])), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
        .setData("interactionLabel", now().label)
        .setDepth(5);
      zone.on("pointerdown", () => {
        if (zone.getData("opening")) return;
        if (shut()) {
          // open it, and let it be gone into once it is open
          this._opened.add(thing.level);
          zone.setData("opening", true);
          this.time.delayedCall(this.open(thing, L, k, !this.reducedMotion), () => {
            zone.input.hitArea = new Phaser.Geom.Polygon(thing.quad.flatMap((p) => [p.x, p.y]));
            zone.setData("interactionLabel", thing.label).setData("opening", false);
          });
          return;
        }
        // walk up to it, and ask for its puzzle
        zoomInto(this, thing.box);
        this.game.events.emit(HOUSE_GO, { level: thing.level });
      });
      this._sparkles.push(attachMovableSparkles(this, zone, { padding: 3, bounds: () => now().box }));
    }

    if (L.chest) this._setChest(L, k);

    // dust turning in the moonbeam
    const beam = this.dustIn?.(L);
    for (let i = 0; beam && i < 14; i++) {
      const x0 = beam.x + Math.random() * beam.width;
      const y0 = beam.y + Math.random() * beam.height;
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

  _setChest(L, k) {
    const levels = this.services.levels;
    // the chest: open if its key has been taken; otherwise shut — locked, and
    // saying so — and if the room is finished, about to open
    const waiting = levels.keyWaitingIn(this.place);
    const c = L.chest;
    const taken = !waiting && L.things.every((thing) => levels.isCompleted(levels.indexOf(thing.level)));
    this._chest = this.add.image(c.box.x, c.box.y, taken ? k.open : k.shut).setOrigin(0, 0).setDepth(-6);
    const tint = this.chestTint?.(L);
    if (tint) this._chest.setTint(tint);
    if (!taken) {
      // gold, catching what light there is: a glint now and then, no more
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
    if (waiting) this.time.delayedCall(WALK_MS + 150, () => this._offerKey(waiting, k));
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
    this.tweens.add({ targets: halo, alpha: 0.55, displayWidth: 120 * u, displayHeight: 120 * u, duration: still ? 1 : 420, ease: "Sine.easeOut" });
    this.time.delayedCall(still ? 1 : 300, () => {
      this._chest.setTexture(k.open).clearTint();
      this._glints?.forEach((glint) => glint.destroy());
      chime(this, [[784, 0.05], [1175, 0.04], [1568, 0.03]], 1.1);
      const h = 50 * u;
      const item = this.add.image(m.x, m.y, k.key).setDepth(20).setAlpha(0);
      item.setDisplaySize(h * (96 / 220) * 0.3, h * 0.3);
      const up = m.y - 84 * u;
      this.tweens.add({ targets: item, y: up, alpha: 1, displayWidth: h * (96 / 220), displayHeight: h, duration: still ? 1 : 750, ease: "Cubic.easeOut" });
      this.tweens.add({ targets: halo, y: up, duration: still ? 1 : 750, ease: "Cubic.easeOut" });
      const sway = still ? null : this.tweens.add({ targets: item, angle: { from: -6, to: 6 }, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this._sparkles.push(attachMovableSparkles(this, item, { padding: 6 }));
      // there to be taken, once it has come up
      this.time.delayedCall(still ? 1 : 750, () => {
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
    this.tick?.(time / 1000);
  }

  _teardown() {
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this.release();
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this._sparkles?.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.release();
    this._L = null;
  }
}
