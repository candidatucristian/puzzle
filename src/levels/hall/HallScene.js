import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, zoomInto, zoomOutFrom } from "../../shared/house.js";
import { chime } from "../../shared/paint.js";
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
// Across the foot of the stairs hangs an iron gate in two leaves. It glints,
// and a click swings it open; it stays open after that. With it open, the
// stairs glint in their turn — though there is nowhere up them to go yet.
//
// The same scene is the upper hall's too (UpperHallScene, below): the floor
// above, gone to seed — its doors locked, one sconce alight, and a bare bulb
// on a flex that is itself a puzzle to be opened.
//
// The hall is painted (hall.js). Live over it: the sconces' candles, the
// light under the doors, dust in the moonbeams, the glints.
// ─────────────────────────────────────────────────────────────────────────────

// the gate across the stairs is remembered open under this name, with the keys
const GATES = "HallGates";
// the puzzle the upper hall's bulb burns for
const BULB_FOR = "lightswitch";

export default class HallScene extends BasePuzzleScene {
  /** `key` is the hall's place in the house; `upper` whether it is the
   *  floor above's (see hall.js). */
  constructor(key = "Hall", upper = false) {
    super({ key });
    this.upper = upper;
  }

  create(data) {
    this.beginScene();
    this._sparkles = [];
    this._build(this.cameras.main.width, this.cameras.main.height);
    // come out of one of the rooms: draw back from its door
    const n = this.services.levels.rooms.findIndex((room) => room.key && room.key === data?.from?.place);
    const door = n < 0 ? null : this._L.doors[n];
    if (door) zoomOutFrom(this, door.box);
    // come back down from the floor above: draw back from the stairs
    else if (data?.from?.place === "Upper" && this._L.gate) zoomOutFrom(this, this._L.gate);
    // come away from the light: draw back from it
    else if (this._L.thing && data?.from?.level === this._L.thing.level) zoomOutFrom(this, this._L.thing.box);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  _build(W, H) {
    const levels = this.services.levels;
    const bulbOn = !levels.isCompleted(levels.indexOf(BULB_FOR));
    const L = (this._L = layoutHall(W, H, { upper: this.upper, bulbOn }));
    const art = paintHall(this, L);
    const k = art.keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the candles in the sconces, never quite still
    this._candles = L.sconces.filter((s) => !s.dead).map((s) =>
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
      const room = rooms[n];
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

    if (L.gate) this._gate(L, k);
    if (L.thing) this._light(L, k);

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

  // The gate across the stairs: its two leaves hang from the sides of the
  // opening. Shut, they glint and take a click; then each swings back on its
  // hinges — seen from here, it narrows to its own edge — and they stay so.
  _gate(L, k) {
    const levels = this.services.levels, g = L.gate;
    const OPEN = 0.13; // how much of a leaf's width shows when it stands open
    const leaves = [
      this.add.image(g.x, g.y, k.gateL).setOrigin(0, 0),
      this.add.image(g.x + g.width, g.y, k.gateR).setOrigin(1, 0),
    ];
    for (const leaf of leaves) leaf.setDisplaySize(g.width / 2, g.height).setDepth(-9);
    const shut = leaves[0].scaleX;
    // the stairs beyond, once the way to them is open
    const stairs = () => {
      const steps = this.add
        .zone(g.x, g.y, g.width, g.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .setData("interactionLabel", "Go up the stairs")
        .setDepth(5);
      steps.on("pointerdown", () => this._go(g, { place: "Upper" }));
      this._sparkles.push(attachMovableSparkles(this, steps, { padding: 2, bounds: () => g }));
    };
    if (levels.hasKey(GATES)) {
      for (const leaf of leaves) leaf.setScale(shut * OPEN, leaf.scaleY);
      stairs();
      return;
    }
    const zone = this.add
      .zone(g.x, g.y, g.width, g.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Open the gates")
      .setDepth(5);
    const glint = attachMovableSparkles(this, zone, { padding: 2, bounds: () => g });
    this._sparkles.push(glint);
    zone.once("pointerdown", () => {
      zone.disableInteractive();
      this.game.events.emit("puzzle:interaction", { label: "" });
      this.game.canvas.style.cursor = "";
      glint();
      levels.takeKey(GATES);
      // the latch, then the hinges
      chime(this, [[196, 0.05], [147, 0.04]], 0.5);
      this.time.delayedCall(260, () => chime(this, [[82, 0.05], [61, 0.04]], 1.6));
      this.tweens.add({
        targets: leaves,
        scaleX: shut * OPEN,
        duration: this.reducedMotion ? 1 : 1700,
        delay: this.reducedMotion ? 0 : 260,
        ease: "Sine.easeInOut",
        onComplete: stairs,
      });
    });
  }

  // The light of the upper hall: the bulb on its flex. Until its puzzle is
  // solved it burns, badly — dipping, catching, going out for a moment — and
  // glints, and a click walks up to it.
  _light(L, k) {
    const b = L.bulb, thing = L.thing;
    this._bulb = null;
    if (!L.bulbOn) return;
    this._bulb = this.add.image(b.x, b.y, k.glow).setDisplaySize(b.r * 16, b.r * 16).setTint(0xffc078).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(-8);
    this._dark = this.add.image(b.x, b.y, k.glow).setDisplaySize(b.r * 3, b.r * 3).setTint(0x000000).setAlpha(0).setDepth(-7.5);
    const zone = this.add
      .zone(thing.box.x, thing.box.y, thing.box.width, thing.box.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", thing.label)
      .setDepth(5);
    zone.on("pointerdown", () => this._go(thing.box, { level: thing.level }));
    this._sparkles.push(attachMovableSparkles(this, zone, { padding: 3, bounds: () => thing.box }));
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
    if (this._bulb) {
      // a bad connection: mostly on, with dips and short blackouts, to no rhythm
      const k = (t * 0.9) % 7;
      const out = (k > 2.1 && k < 2.24) || (k > 2.4 && k < 2.48) || (k > 5.3 && k < 5.75);
      const level = out ? 0 : 0.3 + 0.05 * Math.sin(t * 31) + (Math.sin(t * 2.3) > 0.93 ? -0.16 : 0);
      this._bulb.setAlpha(Math.max(0, level));
      this._dark.setAlpha(out ? 0.85 : 0);
    }
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

/** The hall of the floor above. */
export class UpperHallScene extends HallScene {
  constructor() {
    super("Upper", true);
  }
}
