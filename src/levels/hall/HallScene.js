import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { layoutHall, paintHall, releaseHallArt } from "./hall.js";

// ─────────────────────────────────────────────────────────────────────────────
// The hall: the ground floor of the manor, where the player stands on coming
// in. Night; three closed doors down either side, the moon in the window at
// the far end. This is not a level and has no code: it is the way to them.
// Every door glints, and a click on any of them opens it — for now, all six
// lead to the first room.
//
// The hall is painted (hall.js). Live over it: the sconces' candles, the
// light under the doors, dust in the moonbeams, the glint on each door.
// ─────────────────────────────────────────────────────────────────────────────

export const HALL_DOOR = "hall:door";

export default class HallScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Hall" });
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
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  _build(W, H) {
    const L = (this._L = layoutHall(W, H));
    const art = paintHall(this, L);
    const k = art.keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the candles in the sconces, never quite still
    this._candles = L.sconces.map((s) =>
      this.add
        .image(s.x - s.side * (20 * L.u) / s.z, s.y - (24 * L.u) / s.z, k.glow)
        .setDisplaySize((150 * L.u) / s.z, (150 * L.u) / s.z)
        .setTint(0xffc078)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.3)
        .setDepth(-8),
    );

    // the doors: each with the light of its room breathing under it, a glint
    // on it, and a click that opens it
    this._doors = L.doors.map((d, n) => {
      const glow = this.add
        .image(d.sill.x, d.sill.y, k.glow)
        .setDisplaySize((L.wall * 0.42) / d.z, (H * 0.09) / d.z)
        .setTint(0xffc078)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.3)
        .setDepth(-8);
      this.ambientTween({
        targets: glow,
        alpha: { from: 0.22, to: 0.5 },
        duration: 2200 + n * 260,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      const shape = new Phaser.Geom.Polygon(d.quad.flatMap((p) => [p.x, p.y]));
      const zone = this.add
        .zone(0, 0, W, H)
        .setOrigin(0, 0)
        .setInteractive({ hitArea: shape, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
        .setData("interactionLabel", "Open the door")
        .setDepth(5);
      zone.on("pointerdown", () => this.game.events.emit(HALL_DOOR, n));
      this._sparkles.push(attachMovableSparkles(this, zone, { padding: 2, bounds: () => d.box }));
      return zone;
    });

    // dust turning in the moonlight down the middle of the hall
    for (let i = 0; i < 16; i++) {
      const x0 = L.vp.x + (Math.random() - 0.5) * L.wall * 0.4;
      const y0 = L.vp.y + (Math.random() - 0.2) * H * 0.3;
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
        alpha: { from: 0, to: 0.3 + Math.random() * 0.4 },
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
    this._candles.forEach((g, i) => g.setAlpha(0.26 + 0.05 * Math.sin(t * 9 + i * 2.1) + Math.random() * 0.04));
  }

  _teardown() {
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseHallArt(this.textures);
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this._sparkles?.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseHallArt(this.textures);
    this._L = null;
  }
}
