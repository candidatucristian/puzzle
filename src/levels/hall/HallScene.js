import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { HOUSE_GO, HOUSE_SOLVED, WALK_MS, aimCameraAt, zoomInto, zoomOutFrom } from "../../shared/house.js";
import { buildMorseSteps } from "../lightswitch/puzzle.js";
import { chime } from "../../shared/paint.js";
import { layoutHall, paintHall, paintDoorSwing, releaseHallArt } from "./hall.js";
import { doorMotion, DOOR_WALK_START_MS } from "./doorMotion.js";

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
// light under the doors, dust in the moonbeams, the glints, a thin mist —
// and, on the ground floor, the house itself: the clock's pendulum going,
// the gate's bars shadowed down the runner, a moth at one of the candles, a
// draught now and then, lightning a long way off. The chandelier is lit a
// candle at a time, one for every room that has been finished.
// ─────────────────────────────────────────────────────────────────────────────

// the gate across the stairs is remembered open under this name, with the keys
const GATES = "HallGates";

export default class HallScene extends BasePuzzleScene {
  /** `key` is the hall's place in the house; `floor` which hall it is —
   *  "ground", "upper", or "wing", the passage off the top floor (see hall.js). */
  constructor(key = "Hall", floor = "ground") {
    super({ key });
    this.upper = floor === "upper";
    this.wing = floor === "wing";
  }

  preload() {
    this.load.audio("doorhandle", "assets/sounds/global/doorhandle.mp3");
  }

  create(data) {
    this.beginScene();
    this._sparkles = [];
    this._doorOpening = null;
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
    const L = (this._L = layoutHall(W, H, { upper: this.upper, wing: this.wing, bulbOn: false }));
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
        zone.on("pointerdown", () => this._open(d, room));
      }
      if (calling) this._sparkles.push(attachMovableSparkles(this, zone, { padding: 2, bounds: () => d.box }));
    });

    if (L.gate) this._gate(L, k);
    if (L.thing && this.upper) this._light(L, k);
    if (L.up) this._stairsUp(L);

    if (k.fog) this._fog(L, k.fog);
    this._opening = Boolean(this._doorOpening);
    this.input.enabled = !this._opening;
    this._flames = [];
    this._moth = this._bars = null;
    this._gust = { v: 0 };
    if (L.clock) this._alive(L, k, rooms);

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
    if (this._doorOpening) this._mountDoor();
  }

  // A thin mist in the hall: banks of it lying low along the floor at
  // different depths, each drifting slowly across and back, the nearest
  // the faintest so that it never hides the doors; and a haze hanging at
  // the far end, in the moon from the stairs.
  _fog(L, key) {
    const { H } = L;
    for (const [i, z] of [1.15, 1.5, 2.0, 2.7, 3.6].entries()) {
      const p = L.P(0, L.floor - H * 0.1, z), wide = (L.wall * 3) / z, side = i % 2 ? 1 : -1;
      const bank = this.add
        .image(p.x - side * wide * 0.14, p.y, key)
        .setDisplaySize(wide, (H * 0.52) / z)
        .setTint(0xa9b4c8)
        .setAlpha(0.26 + i * 0.06)
        .setDepth(-7.4);
      this.ambientTween({ targets: bank, x: p.x + side * wide * 0.14, duration: 19000 + i * 4200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.ambientTween({ targets: bank, alpha: bank.alpha * 0.6, duration: 7000 + i * 1900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    const far = L.P(0, -H * 0.05, 4.4);
    const haze = this.add.image(far.x, far.y, key).setDisplaySize(L.wall * 0.9, H * 0.34).setTint(0xb8c6e4).setAlpha(0.34).setDepth(-7.4);
    this.ambientTween({ targets: haze, alpha: 0.2, scaleX: haze.scaleX * 1.12, duration: 9000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  // What makes the ground floor's hall a place somebody lives in — or did.
  _alive(L, k, rooms) {
    const { W, H, u } = L;
    const levels = this.services.levels;
    // ── the clock: its pendulum, a tick at either end of every swing
    const tick = () => chime(this, [[2100, 0.006], [1400, 0.004]], 0.035);
    const pendulum = this.add.image(L.clock.x, L.clock.y, k.pendulum).setOrigin(0.5, 0).setDisplaySize(L.clock.bob * 2, L.clock.len + L.clock.bob).setAngle(-2.3).setDepth(-9);
    this.ambientTween({ targets: pendulum, angle: 2.3, duration: 1000, yoyo: true, repeat: -1, ease: "Sine.easeInOut", onYoyo: tick, onRepeat: tick });
    // ── the gate's bars, shadowed long down the runner by the moon behind them
    if (!levels.hasKey(GATES)) {
      const g = (this._bars = this.add.graphics().setDepth(-9.5));
      for (const [a, b] of L.bars) {
        for (let i = 0; i < 8; i++) {
          const t0 = i / 8, t1 = (i + 1) / 8;
          g.lineStyle(Math.max(1.5, (3 + i * 1.3) * u), 0x020306, 0.55 * (1 - t0));
          g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
        }
      }
    }
    // ── the chandelier: a candle alight for every room that has been finished
    const done = Math.min(L.wicks.length, rooms.filter((room) => room.completed).length);
    for (const wick of L.wicks.slice(0, done)) {
      const halo = this.add.image(wick.x, wick.y, k.glow).setDisplaySize(330 * wick.s, 330 * wick.s).setTint(0xffb860).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.42).setDepth(-8);
      const flame = this.add.image(wick.x, wick.y, k.glow).setDisplaySize(24 * wick.s, 42 * wick.s).setTint(0xfff0c8).setBlendMode(Phaser.BlendModes.ADD).setDepth(-7.9);
      this._flames.push({ halo, flame, x: wick.x, phase: Math.random() * 6 });
    }
    // ── a moth at the first candle on the left
    const lamp = L.sconces.find((s) => !s.dead);
    if (lamp) {
      const moth = this.add.image(lamp.x, lamp.y, k.glow).setDisplaySize(5 * u, 4 * u).setTint(0xd8cfb8).setAlpha(0.75).setDepth(-7.8);
      this.ambientObject(moth);
      this._moth = { moth, x: lamp.x - (lamp.side * 20 * u) / lamp.z, y: lamp.y - (26 * u) / lamp.z, r: (26 * u) / lamp.z };
    }
    if (!this.ambientMotion || this.reducedMotion) return;
    // ── a draught, now and then: every flame leans, and comes back
    const draught = () => {
      this.tweens.add({ targets: this._gust, v: 1, duration: 420, yoyo: true, hold: 260, ease: "Sine.easeInOut" });
      this.time.delayedCall(15000 + Math.random() * 17000, draught);
    };
    this.time.delayedCall(9000 + Math.random() * 6000, draught);
    // ── lightning, a long way off: the stairs' window white for an instant,
    // the whole hall cold blue with it, twice; and the thunder a while after
    const sky = this.add.rectangle(0, 0, W, H, 0xbcd0ff).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(8);
    const far = this.add.image(L.gate.x + L.gate.width / 2, L.gate.y + L.gate.height * 0.4, k.glow).setDisplaySize(L.gate.width * 4.2, L.gate.height * 2.6).setTint(0xdce8ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(8);
    const lightning = () => {
      const strike = (wait, level, fade) => this.time.delayedCall(wait, () => {
        sky.setAlpha(level * 0.2);
        far.setAlpha(level);
        this.tweens.add({ targets: [sky, far], alpha: 0, duration: fade, ease: "Cubic.easeOut" });
      });
      strike(0, 0.7, 120);
      strike(150, 1, 620);
      this.time.delayedCall(1300 + Math.random() * 900, () => chime(this, [[52, 0.07], [39, 0.06], [66, 0.035], [31, 0.04]], 2.6));
      this.time.delayedCall(26000 + Math.random() * 30000, lightning);
    };
    this.time.delayedCall(6000 + Math.random() * 5000, lightning);
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
      // the bars' shadows go with the gate
      if (this._bars) this.tweens.add({ targets: this._bars, alpha: 0, duration: 900, onComplete: () => { this._bars?.destroy(); this._bars = null; } });
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

  // A door is opened: the handle, and the leaf swings in on its hinges — the
  // room's light coming out round it and across the hall's boards — and then
  // we go through it.
  _open(d, room) {
    if (this._opening || !this.input.enabled) return;
    this._opening = true;
    this.input.enabled = false;
    this.game.events.emit("puzzle:interaction", { label: "" });
    this.game.canvas.style.cursor = "";
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    this._latch();
    if (this.reducedMotion) { this._go(d.box, { place: room.key }); return; }
    this._doorOpening = { number: d.number, room, elapsed: 0, walking: false };
    this._mountDoor();
  }

  // Rebuild the small painted doorway from its current pose after resize.
  // The clock and navigation state live separately from these textures.
  _mountDoor() {
    const L = this._L, state = this._doorOpening;
    const d = L.doors.find((door) => door.number === state.number);
    const lit = !state.room.completed;
    const art = paintDoorSwing(this, L, d, lit);
    this.add.image(art.box.x, art.box.y, art.key).setOrigin(0, 0)
      .setDisplaySize(art.box.width, art.box.height).setDepth(-9.7);
    const spill = this.add
      .image(d.sill.x, d.sill.y, this._art.keys.glow)
      .setTint(lit ? 0xffc078 : 0x9fb6e8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-9.4);
    this._doorArt = { ...art, d, spill, lit };
    this._updateDoor(0);
  }

  _updateDoor(delta) {
    const state = this._doorOpening, art = this._doorArt;
    if (!state || !art) return;
    state.elapsed += delta;
    const pose = doorMotion(state.elapsed);
    const { aperture } = art.draw(pose.angle, pose.handle);
    const { d, spill, lit } = art, L = this._L;
    spill.setDisplaySize((L.wall * (0.2 + aperture * 0.9)) / d.z, (L.H * (0.06 + aperture * 0.24)) / d.z)
      .setAlpha(aperture * (lit ? 0.48 : 0.2));
    // Match the normal walk's easing on the same clock as the leaf. A
    // redraw cannot cancel or restart the movement toward the doorway.
    if (state.elapsed >= DOOR_WALK_START_MS) {
      const k = Math.min(1, (state.elapsed - DOOR_WALK_START_MS) / WALK_MS);
      aimCameraAt(this.cameras.main, d.box, (1 - Math.cos(k * Math.PI)) / 2);
      if (!state.walking) {
        state.walking = true;
        this.game.events.emit(HOUSE_GO, { place: state.room.key });
      }
    }
  }

  // the sound of it: the handle, recorded (assets/sounds/global/doorhandle.mp3)
  _latch() {
    this.services.audio.playSfx("doorhandle", 1, this);
  }

  // walk up to what was clicked, and ask to be taken through it
  _go(box, where) {
    zoomInto(this, box);
    this.game.events.emit(HOUSE_GO, where);
  }

  update(time, delta) {
    // Opening a door is an interaction, including with ambient effects off.
    this._updateDoor(delta);
    if (!this._L || !this.ambientMotion || this.reducedMotion) return;
    const t = time / 1000;
    const gust = this._gust?.v ?? 0;
    this._candles.forEach((g, i) => g.setAlpha((0.26 + 0.05 * Math.sin(t * 9 + i * 2.1) + Math.random() * 0.04) * (1 - 0.55 * gust)));
    // the chandelier's candles: never still, and leaning with every draught
    for (const f of this._flames ?? []) {
      const live = 0.9 + 0.08 * Math.sin(t * 11 + f.phase) + Math.random() * 0.05;
      f.flame.setAlpha(live * (1 - 0.4 * gust)).setX(f.x + gust * 5 * this._L.u);
      f.halo.setAlpha(0.42 * live * (1 - 0.5 * gust));
    }
    // the moth: round and round its candle, never the same way twice
    if (this._moth) {
      const m = this._moth, wob = 1 + 0.35 * Math.sin(t * 3.7) + 0.2 * Math.sin(t * 9.1);
      m.moth.setPosition(m.x + Math.cos(t * 5.3) * m.r * wob, m.y + Math.sin(t * 6.9) * m.r * 0.7 * wob);
    }
  }

  _teardown() {
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._doorArt = null;
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
    this._doorArt = null;
    this._doorOpening = null;
    this._opening = false;
    releaseHallArt(this.textures);
    this._L = null;
  }
}

/** The passage off the top floor: three doors, XV to XVII. */
export class TopWingScene extends HallScene {
  constructor() {
    super("TopHall", "wing");
  }
}

/** The hall of the floor above. */
export class UpperHallScene extends HallScene {
  constructor() {
    super("Upper", "upper");
  }

  preload() {
    super.preload();
    // the switch's click and the short's crackle, the puzzle's own
    this.load.audio("switchsound", "assets/sounds/Lightswitch/switchsound.mp3");
    this.load.audio("sparkle", "assets/sounds/Lightswitch/sparkle.mp3");
  }
}
