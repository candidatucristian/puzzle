import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, zoomInto, zoomOutFrom } from "../../shared/house.js";
import { layoutHall, paintHall, releaseHallArt } from "./hall.js";

// ─────────────────────────────────────────────────────────────────────────────
// The hall: the ground floor of the manor, where the player stands on coming
// in. Night; three closed doors down either side, the stairs to the floor
// above at the far end. This is not a level and has no code: it is the way to them.
// A door with something still to be found behind it glints, and has the
// light on under it: the first, and any whose key has been found. A room
// that is finished goes dark and stops glinting, though its door still
// opens. The rest are dark, locked, with nothing to be done at them yet.
//
// The hall is painted (hall.js). Live over it: the sconces' candles, the
// light under the doors, dust in the moonbeams, the glints.
// ─────────────────────────────────────────────────────────────────────────────

export default class HallScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Hall" });
  }

  create(data) {
    this.beginScene();
    this._sparkles = [];
    this._build(this.cameras.main.width, this.cameras.main.height);
    // come out of one of the rooms: draw back from its door
    const n = this.services.levels.rooms.findIndex((room) => room.key && room.key === data?.from?.place);
    const door = this._L.doors.find((d) => d.number === n + 1);
    if (door) zoomOutFrom(this, door.box);
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

    // the doors: one with something still behind it has the light of its
    // room breathing under it and a glint on it; one that opens takes a click
    const rooms = this.services.levels.rooms;
    L.doors.forEach((d, n) => {
      const room = rooms[d.number - 1];
      const calling = Boolean(room) && !room.locked && !room.completed;
      const glow = this.add
        .image(d.sill.x, d.sill.y, k.glow)
        .setDisplaySize((L.wall * 0.42) / d.z, (H * 0.09) / d.z)
        .setTint(0xffc078)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(calling ? 0.3 : 0.06)
        .setDepth(-8);
      if (calling) {
        this.ambientTween({
          targets: glow,
          alpha: { from: 0.22, to: 0.5 },
          duration: 2200 + n * 260,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      if (!room || room.locked) return;
      const zone = this.add.zone(0, 0, W, H).setOrigin(0, 0).setDepth(5);
      if (room.open) {
        const shape = new Phaser.Geom.Polygon(d.quad.flatMap((p) => [p.x, p.y]));
        zone
          .setInteractive({ hitArea: shape, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
          .setData("interactionLabel", room.completed ? "Open the door — completed" : "Open the door");
        zone.on("pointerdown", () => this._go(d.box, { place: room.key }));
      }
      if (calling) this._sparkles.push(attachMovableSparkles(this, zone, { padding: 2, bounds: () => d.box }));
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

  // walk up to what was clicked, and ask to be taken through it
  _go(box, where) {
    zoomInto(this, box);
    this.game.events.emit(HOUSE_GO, where);
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
