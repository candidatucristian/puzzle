import Phaser from "phaser";
import { planTransmission } from "./puzzle.js";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { paintRoom, releaseRoomArt } from "./room.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "MODEM"  ·  code: HTTPS  ·  read the lights
//
// A room at night, painted like the office in OVERTIME: an old router on a
// desk under a table lamp, the moon in the window beside it. Its name on the
// front — W. LEIBNIZ — is the only nod to binary. It never stopped
// transmitting: of its thirteen lights, the eight on the right hold steady
// but two of them flash out a letter a bit at a time (LED 5 for a 0, LED 6
// for a 1), and after each letter one of the five on the left turns red.
// Five letters, then a pause, and it starts over:  H T T P S  →  HTTPS
//
// The room is painted once per screen size (room.js); the lights, their glow
// on the desk and the dust in the lamplight are driven from here, with the
// schedule from planTransmission() in puzzle.js.
// ─────────────────────────────────────────────────────────────────────────────

// each colour's core and glow tints, and how strongly the glow and its light
// on the desk show (red reads darker than green, so it glows harder)
const LED_TONES = {
  green: { core: 0x8dffb0, glow: 0x28ff6c, glowA: 0.62, spillA: 0.5 },
  orange: { core: 0xffc98a, glow: 0xff8a10, glowA: 0.75, spillA: 0.55 },
  red: { core: 0xffa08a, glow: 0xff3018, glowA: 0.95, spillA: 0.65 },
};

export default class ModemScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Modem" });
  }

  init(data) {
    this.skipFadeIn =
      data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("hardware", "assets/sounds/Modem/hardwaresound.mp3");
  }

  create() {
    this.beginScene();

    this.isSolved = false;
    this._timerEvents = [];

    this._build(this.cameras.main.width, this.cameras.main.height);
    this._startAnimation();
    this._startHardwareHum();

    this.listenToResize(({ width, height }) => {
      this._cancelAnimation();
      this._teardown();
      this._build(width, height);
      this._startAnimation();
    });
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const art = (this._art = paintRoom(this, W, H));
    this.add.image(0, 0, art.keys.room).setOrigin(0, 0).setDepth(0);
    this._makeLeds(art);
    this._makeMotes(art);
    this._drawTexts(W);
    this._built = true;
  }

  // each light: its light spilling on the desk under it, its glow, its core;
  // all dark until the transmission lights them
  _makeLeds(art) {
    const add = (x, y, w, h, depth) =>
      this.add
        .image(x, y, art.keys.glow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(w, h)
        .setDepth(depth)
        .setAlpha(0);
    this._leds = art.leds.map((l) => ({
      spill: add(l.spill.x, l.spill.y, l.spill.rx * 2, l.spill.rx * 0.5, 1),
      glow: add(l.x, l.y, l.r * 10, l.r * 10, 2),
      core: add(l.x, l.y, l.r * 2.7, l.r * 2.7, 3),
    }));
  }

  // dust turning slowly in the lamplight
  _makeMotes(art) {
    const { x, y, r } = art.lamp;
    this._motes = [];
    for (let i = 0; i < 14; i++) {
      const img = this.add
        .image(0, 0, art.keys.mote)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4)
        .setAlpha(0);
      const m = { img, cx: x, cy: y, r };
      this._respawnMote(m, Math.random());
      this._motes.push(m);
    }
  }

  _respawnMote(m, age = 0) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * m.r;
    m.x = m.cx + Math.cos(a) * d;
    m.y = m.cy + Math.sin(a) * d * 1.1;
    m.vx = (Math.random() - 0.5) * 0.004;
    m.vy = (Math.random() - 0.35) * 0.004;
    m.ttl = 6000 + Math.random() * 8000;
    m.age = age * m.ttl;
    m.ph = Math.random() * 10;
    m.peak = 0.2 + Math.random() * 0.4;
    const s = (1.6 + Math.random() * 2.6) * Math.max(0.8, this._art.u);
    m.img.setDisplaySize(s, s);
  }

  _drawTexts(W) {
    this.add
      .text(W / 2, 40, "It never stopped transmitting.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    const lvl = this.add
      .text(W - 30, 28, "Level " + (this.services.levels.definitions.findIndex((l) => l.key === this.scene.key) + 1), {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: lvl, alpha: 1, duration: 2000 });
  }

  update(time, delta) {
    if (!this._built) return;
    const t = time / 1000;
    const dt = Math.min(delta || 16, 100);
    for (const m of this._motes) {
      m.age += dt;
      if (m.age >= m.ttl) this._respawnMote(m);
      m.x += (m.vx + Math.sin(t * 0.6 + m.ph) * 0.003) * dt;
      m.y += (m.vy + Math.cos(t * 0.45 + m.ph * 1.3) * 0.002) * dt;
      const life = Math.sin((Math.PI * m.age) / m.ttl);
      const glint = 0.55 + 0.45 * Math.sin(t * 2.1 + m.ph * 3);
      m.img.setPosition(m.x, m.y).setAlpha(m.peak * life * glint);
    }
  }

  replay() {
    this._startAnimation();
  }

  // ── the lights ─────────────────────────────────────────────────────────────

  _setLed(index, state) {
    const L = this._leds && this._leds[index];
    if (!L) return;
    const tone = LED_TONES[state];
    if (!tone) {
      L.core.setAlpha(0);
      L.glow.setAlpha(0);
      L.spill.setAlpha(0);
      return;
    }
    L.core.setTint(tone.core).setAlpha(1);
    L.glow.setTint(tone.glow).setAlpha(tone.glowA);
    L.spill.setTint(tone.glow).setAlpha(tone.spillA);
  }

  _resetAllLeds() {
    for (let i = 0; i < 13; i++) this._setLed(i, "off");
  }

  // ── the transmission ───────────────────────────────────────────────────────

  _cancelAnimation() {
    this._timerEvents.forEach((ev) => {
      try {
        ev.remove(false);
      } catch (_) {}
    });
    this._timerEvents = [];
  }

  _startAnimation() {
    this._cancelAnimation();
    this._resetAllLeds();
    for (let i = 7; i <= 12; i++) this._setLed(i, "green");
    const transmission = planTransmission();
    this._timerEvents = transmission.events.map(({ at, led, state }) =>
      this.time.delayedCall(at, () => this._setLed(led, state)),
    );
    this._timerEvents.push(this.time.delayedCall(transmission.duration, () => this._startAnimation()));
  }

  // the old hardware's hum, looping while we are in the room
  _startHardwareHum() {
    try {
      if (this.cache.audio.exists("hardware")) {
        this._hwSound = this.services.audio.addSceneSound(this, "hardware", {
          loop: true,
          gain: 0.35,
        });
        this._hwSound?.play();
      }
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._leds = null;
    this._motes = [];
    releaseRoomArt(this.textures);
  }

  shutdown() {
    if (this._hwSound) {
      try { this._hwSound.stop(); this._hwSound.destroy(); } catch (e) {}
      this._hwSound = null;
    }
    this._built = false;
    this._cancelAnimation();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._leds = null;
    releaseRoomArt(this.textures);
  }
}
