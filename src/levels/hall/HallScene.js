import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, HOUSE_SOLVED, zoomInto, zoomOutFrom } from "../../shared/house.js";
import { buildMorseSteps } from "../lightswitch/puzzle.js";
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
// above, gone to seed — its doors locked, one sconce alight — and there the
// hall is itself a puzzle's stage: a switch on the wall, a bare bulb on a
// flex, and the answer written in the box under the picture.
//
// The hall is painted (hall.js). Live over it: the sconces' candles, the
// light under the doors, dust in the moonbeams, the glints.
// ─────────────────────────────────────────────────────────────────────────────

// the gate across the stairs is remembered open under this name, with the keys
const GATES = "HallGates";

export default class HallScene extends BasePuzzleScene {
  /** `key` is the hall's place in the house; `floor` which hall it is —
   *  "ground" or "upper" (see hall.js). */
  constructor(key = "Hall", floor = "ground") {
    super({ key });
    this.upper = floor === "upper";
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
    // come back down from the top floor: draw back from the stairs at the side
    else if (data?.from?.place === "Top" && this._L.up) zoomOutFrom(this, this._L.up);

    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    // the puzzle played here has been answered: the hall is put right for it
    this._onSolved = () => { if (this.upper) { this._teardown(); this._build(this.cameras.main.width, this.cameras.main.height); } };
    this.game.events.on(HOUSE_SOLVED, this._onSolved);
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  _build(W, H) {
    // the bulb is painted dark: it is lit from here, when the switch is pressed
    const L = (this._L = layoutHall(W, H, { upper: this.upper, bulbOn: false }));
    const art = (this._art = paintHall(this, L));
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
    if (L.thing && this.upper) this._light(L, k);
    if (L.up) this._stairsUp(L);

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

  // The stairs at the side of the upper hall: they glint, and a click goes up them.
  _stairsUp(L) {
    const steps = this.add
      .zone(L.up.x, L.up.y, L.up.width, L.up.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Go up the stairs")
      .setDepth(5);
    steps.on("pointerdown", () => this._go(L.up, { place: "Top" }));
    this._sparkles.push(attachMovableSparkles(this, steps, { padding: 2, bounds: () => L.up }));
  }

  // The upper hall's puzzle is played in the hall itself, exactly as it is in
  // its own room: each press of the switch makes the bulb flash one letter of
  // the answer in Morse — a short flash a dot, a long one a dash — the next
  // press the next letter, round and round; after each letter the wiring
  // shorts — sparks fly from the switch, it springs back off, the bulb
  // stutters and is dark. The answer is written in the box below.
  // Solved, the switch is dead and stops glinting.
  _light(L, k) {
    const levels = this.services.levels, b = L.bulb, thing = L.thing, s = L.switch;
    const index = levels.indexOf(thing.level);
    this._bulb = [
      this.add.image(b.x, b.y, k.glow).setDisplaySize(b.r * 18, b.r * 18).setTint(0xffc078).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(-8),
      this.add.image(b.x, b.y, k.glow).setDisplaySize(b.r * 3.2, b.r * 3.2).setTint(0xfff2cc).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(-7.5),
    ];
    // the rocker pressed on, laid over the painted one while the switch is on;
    // and its lamp — green while it waits, dark red once pressed, bright red
    // with each flash of the bulb
    this._rocker = this.add.image(s.x, s.y, k.rocker).setDisplaySize(s.rocker.w * s.slant, s.rocker.h).setVisible(false).setDepth(-9);
    this._led = this.add.image(s.led.x, s.led.y, k.glow).setDisplaySize(s.led.r * 5 * s.slant, s.led.r * 5).setBlendMode(Phaser.BlendModes.ADD).setDepth(-8.5);
    this._lamp("idle");
    this._busy = false;
    this._letter = 0;
    if (levels.isCompleted(index)) return;
    this._answer = levels.definitions[index].code;
    this._lamp("idle");
    const zone = this.add
      .zone(thing.box.x, thing.box.y, thing.box.width, thing.box.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", thing.label)
      .setDepth(5);
    zone.on("pointerdown", () => this._press());
    this._sparkles.push(attachMovableSparkles(this, zone, { padding: 3, bounds: () => thing.box, enabled: () => !this._busy }));
  }

  _lit(on, level = 1) {
    this._bulb[0].setAlpha(on ? 0.55 * level : 0);
    this._bulb[1].setAlpha(on ? level : 0);
    if (this._busy) this._lamp(on ? "flash" : "armed");
  }

  // the switch's little lamp
  _lamp(state) {
    const look = { idle: [0x22bb44, 0.7], armed: [0x8a1c1c, 0.5], flash: [0xff2a2a, 1], dead: [0x22bb44, 0] }[state];
    this._led.setTint(look[0]).setAlpha(this._answer || state !== "idle" ? look[1] : 0);
  }

  _press() {
    if (this._busy || !this._answer) return;
    this._busy = true;
    if (this.cache.audio.exists("switchsound")) this.sound.play("switchsound", { volume: 0.6 });
    this._rocker.setVisible(true);
    this._lamp("armed");
    const steps = buildMorseSteps(this._answer.charAt(this._letter));
    const next = () => {
      const step = steps.shift();
      if (!step) { this._short(); return; }
      this._lit(step.on);
      this.time.delayedCall(step.dur, next);
    };
    this.time.delayedCall(520, next);
  }

  // The wiring shorts: a crack and a shower of sparks from the switch, which
  // springs back off, the bulb stuttering — and dark till the next press.
  _short() {
    const L = this._L, jaws = L.switch, u = L.u; // the sparks come out of the switch itself
    this._lit(false);
    this.time.delayedCall(20, () => this._lit(true, 0.6));
    this.time.delayedCall(40, () => this._lit(false));
    this.time.delayedCall(54, () => {
      if (this.cache.audio.exists("sparkle")) this.sound.play("sparkle", { volume: 0.5 });
      this._letter = (this._letter + 1) % this._answer.length;
      this._rocker.setVisible(false);
      // the flash of the arc, lighting the wall for an instant
      const k = this._art.keys;
      const flash = this.add.image(jaws.x, jaws.y, k.glow).setDisplaySize(170 * u, 170 * u).setTint(0xcfe4ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.95).setDepth(6);
      this.tweens.add({ targets: flash, alpha: 0, duration: 260, ease: "Cubic.easeOut", onComplete: () => flash.destroy() });
      if (this.reducedMotion) return;
      // the sparks: thrown out toward the hall, falling, going out; two or three bursts
      for (const [wait, n] of [[0, 16], [90, 9], [210, 6]]) {
        this.time.delayedCall(wait, () => {
          for (let i = 0; i < n; i++) {
            const spark = this.add.image(jaws.x, jaws.y, k.glow).setTint(i % 3 ? 0xffd27a : 0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7);
            const size = (5 + Math.random() * 7) * u;
            spark.setDisplaySize(size, size);
            const a = Math.PI * (0.75 + Math.random() * 0.9), reach = (30 + Math.random() * 90) * u;
            this.tweens.add({
              targets: spark,
              x: jaws.x + Math.cos(a) * reach,
              y: { value: jaws.y - Math.sin(a) * reach * 0.6 + (60 + Math.random() * 90) * u, ease: "Quad.easeIn" },
              alpha: 0,
              displayWidth: size * 0.3,
              displayHeight: size * 0.3,
              duration: 320 + Math.random() * 420,
              ease: "Cubic.easeOut",
              onComplete: () => spark.destroy(),
            });
          }
        });
      }
    });
    this.time.delayedCall(700, () => { this._busy = false; this._lamp("idle"); });
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
    this.game.events.off(HOUSE_SOLVED, this._onSolved);
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
    super("Upper", "upper");
  }

  preload() {
    // the switch's click and the short's crackle, the puzzle's own
    this.load.audio("switchsound", "assets/sounds/Lightswitch/switchsound.mp3");
    this.load.audio("sparkle", "assets/sounds/Lightswitch/sparkle.mp3");
  }
}
