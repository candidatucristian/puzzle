import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, zoomInto, zoomOutFrom } from "../../shared/house.js";
import { layoutRotunda, paintRotunda, releaseRotundaArt } from "./rotunda.js";

// ─────────────────────────────────────────────────────────────────────────────
// The top floor: the last, and not a hall at all but a round room under the
// dome, as long shut up as the floor below — three doors set round its wall,
// two candles still alight between them, a tall window facing us with the
// moon in it, and the telescope before the window. Like the halls below it is a way to things and has no code of its
// own: the telescope glints until its puzzle is solved, and a click walks up
// to it; a door glints once there is something behind it to be found.
//
// On the left a doorway with nothing hung in it any more opens on a gallery
// gone to ruin, with three doors more; a click goes down it.
//
// The room is painted (rotunda.js). Live over it: the candles, the light
// under a door that calls, dust in the moonlight, the glints.
// ─────────────────────────────────────────────────────────────────────────────

export default class TopScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Top" });
  }

  create(data) {
    this.beginScene();
    this._sparkles = [];
    this._leaving = false;
    this.input.enabled = true;
    this._build(this.cameras.main.width, this.cameras.main.height);
    // come out of one of the rooms: draw back from its door
    const n = this.services.levels.rooms.findIndex((room) => room.key && room.key === data?.from?.place);
    const door = n < 0 ? null : this._L.doors[n];
    if (door) zoomOutFrom(this, door.box);
    // come away from the telescope: draw back from it
    else if (data?.from?.level === this._L.thing.level) zoomOutFrom(this, this._L.thing.box);
    // come back out of the passage: draw back from its doorway
    else if (data?.from?.place === "TopHall") zoomOutFrom(this, this._L.passage.box);

    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  _build(W, H) {
    const L = (this._L = layoutRotunda(W, H));
    const k = paintRotunda(this, L).keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the candles in the sconces, never quite still
    this._candles = L.sconces.filter((s) => !s.dead).map((s) =>
      this.add
        .image(s.x, s.y - 21 * s.s, k.glow)
        .setDisplaySize(120 * s.s, 120 * s.s)
        .setTint(0xffc078)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.2)
        .setDepth(-8),
    );

    // the doors: one with something still behind it has the light of its
    // room breathing under it and a glint on it; one that opens takes a click
    const rooms = this.services.levels.rooms;
    L.doors.forEach((d, n) => {
      const room = rooms[n];
      if (!room || room.locked) return;
      const calling = !room.completed;
      const zone = this.add.zone(0, 0, W, H).setOrigin(0, 0).setDepth(5);
      if (room.open) {
        const shape = new Phaser.Geom.Polygon(d.quad.flatMap((p) => [p.x, p.y]));
        zone
          .setInteractive({ hitArea: shape, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
          .setData("interactionLabel", room.completed ? "Open the door — completed" : "Open the door");
        zone.on("pointerdown", () => this._go(d.box, { place: room.key }));
      }
      if (!calling) return;
      const sill = { x: (d.quad[2].x + d.quad[3].x) / 2, y: (d.quad[2].y + d.quad[3].y) / 2 };
      const glow = this.add
        .image(sill.x, sill.y, k.glow)
        .setDisplaySize(d.box.width * 1.5, d.box.height * 0.16)
        .setTint(0xffc078)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-8);
      this.ambientTween({ targets: glow, alpha: { from: 0.22, to: 0.5 }, duration: 2200 + n * 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this._sparkles.push(attachMovableSparkles(this, zone, { padding: 2, bounds: () => d.box }));
    });

    this._passage(L);

    // the telescope: it glints until its puzzle is solved
    const levels = this.services.levels, thing = L.thing;
    if (!levels.isCompleted(levels.indexOf(thing.level))) {
      const zone = this.add
        .zone(thing.box.x, thing.box.y, thing.box.width, thing.box.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .setData("interactionLabel", thing.label)
        .setDepth(5);
      zone.on("pointerdown", () => this._go(thing.box, { level: thing.level }));
      this._sparkles.push(attachMovableSparkles(this, zone, { padding: 3, bounds: () => thing.box }));
    }

    // dust turning in the moonlight before the window
    const w = L.win;
    for (let i = 0; i < 16; i++) {
      const x0 = w.x + w.width / 2 + (Math.random() - 0.5) * w.width * 2.4;
      const y0 = w.y + w.height * (0.3 + Math.random() * 1.1);
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

  // The doorway on the left: it glints, and a click goes down the passage.
  _passage(L) {
    const p = L.passage;
    const shape = new Phaser.Geom.Polygon(p.quad.flatMap((q) => [q.x, q.y]));
    const zone = this.add.zone(0, 0, L.W, L.H).setOrigin(0, 0).setDepth(5)
      .setInteractive({ hitArea: shape, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
      .setData("interactionLabel", "Go down the passage");
    zone.on("pointerdown", () => this._go(p.box, { place: "TopHall" }));
    this._sparkles.push(attachMovableSparkles(this, zone, { padding: 2, bounds: () => p.box }));
  }

  // walk up to what was clicked, and ask to be taken through it
  _go(box, where) {
    if (this._leaving) return;
    this._leaving = true;
    this.input.enabled = false;
    zoomInto(this, box);
    this.game.events.emit(HOUSE_GO, where);
  }

  update(time) {
    if (!this._L || !this.ambientMotion || this.reducedMotion) return;
    const t = time / 1000;
    this._candles.forEach((g, i) => g.setAlpha(0.17 + 0.04 * Math.sin(t * 9 + i * 2.1) + Math.random() * 0.03));
  }

  _teardown() {
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseRotundaArt(this.textures);
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this._sparkles?.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseRotundaArt(this.textures);
    this._L = null;
  }
}
