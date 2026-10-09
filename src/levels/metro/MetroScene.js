import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { noiseBurst, chime } from "../../shared/paint.js";
import { layoutStation, paintStation, releaseStationArt } from "./map.js";
import { METRO_STATIONS } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "METRO"  ·  code: PYLON  ·  station names → the phonetic alphabet
//
// An underground platform late at night, seen down its length: the track
// running into the tunnel under a signal lamp, the tiled wall with the
// station's name, a bench, a tannoy horn that now and then crackles with
// static, a row of tubes overhead, one of them failing. On the wall, close
// by, is the enamel line diagram — Line 6, eastbound — with its five stops:
//
//   Papa Wharf · Yankee Dock · Lima Road · Oscar Square · November Street
//
// Their first words are the NATO phonetic alphabet: Papa P, Yankee Y, Lima
// L, Oscar O, November N — in the line's order, P Y L O N.
//
// A small light runs the line from end to end, lighting each stop as it
// passes, so the order is the line's own. A click on a stop rings it; a
// click on the horn brings an announcement, which is nothing but static.
// The signal by the tunnel goes from red to green and back; far down the
// tunnel a train's lamps come and go.
// ─────────────────────────────────────────────────────────────────────────────

const RUN_MS = 9000; // the light's run along the whole line
const RUN_REST = 2600; // and its wait at the end before it runs again

export default class MetroScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Metro" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    // the TV's static, which is what a station tannoy mostly says
    this.load.audio("static", "assets/sounds/TV/staticsound.mp3");
  }

  static stations() {
    return METRO_STATIONS.slice();
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const L = (this._L = layoutStation(W, H));
    const art = paintStation(this, L);
    const k = art.keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);
    // the lit line, breathing a little
    this._line = this.add.image(0, 0, k.line).setOrigin(0, 0).setDepth(-8);
    this.ambientTween({
      targets: this._line,
      alpha: { from: 1, to: 0.78 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this._nightLife(L, k);
    // the diagram's own light in the air round it
    const m = L.map;
    this.add
      .image(m.x + m.w / 2, m.y + m.h / 2, k.glow)
      .setDisplaySize(m.w * 1.6, m.h * 1.3)
      .setTint(0xd0e8e0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.07)
      .setDepth(-9);

    // the stations of the lit line: a lamp each, and a tap rings the name
    this._lamps = L.lit.stations.map((s) => {
      const lamp = this.add
        .image(s.x, s.y, k.glow)
        .setDisplaySize(L.dot * 9, L.dot * 9)
        .setTint(0xffc46a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-7);
      this.add
        .zone(s.x, s.y, L.dot * 7, L.dot * 7)
        .setInteractive({
          hitArea: new Phaser.Geom.Circle(L.dot * 3.5, L.dot * 3.5, L.dot * 3.5),
          hitAreaCallback: Phaser.Geom.Circle.Contains,
          useHandCursor: true,
        })
        .setData("interactionLabel", "Ring the stop")
        .setDepth(5)
        .on("pointerdown", () => this._ring(s, lamp));
      return lamp;
    });

    // the light that runs the line, end to end
    this._runner = this.add
      .image(L.lit.path[0].x, L.lit.path[0].y, k.glow)
      .setDisplaySize(L.dot * 6, L.dot * 6)
      .setTint(0xfff1cc)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(-6);
    this.ambientObject(this._runner);
    this._startRun();

    // the tannoy: its lamp, and a tap for an announcement
    const sp = L.speaker;
    this._lampImg = this.add
      .image(sp.x + sp.w * 0.3, sp.y - sp.h * 0.42, k.glow)
      .setDisplaySize(L.u * 26, L.u * 26)
      .setTint(0xff4040)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(-7);
    this.add
      .zone(sp.x, sp.y + sp.h * 0.1, sp.w * 1.2, sp.h * 1.3)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Listen to the tannoy")
      .setDepth(5)
      .on("pointerdown", () => this._announce());
    this._scheduleStatic();

    this.levelText = drawLevelLabel(this, W, H);
  }

  // the station's own slow life: the signal changing, a train's lamps far
  // down the tunnel, the tube that is on its way out
  _nightLife(L, k) {
    const sg = L.signal;
    const lamp = (dy, tint) =>
      this.add
        .image(sg.x, sg.y + dy * sg.r, k.glow)
        .setDisplaySize(sg.r * 9, sg.r * 9)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-9);
    const red = lamp(-3.2, 0xff3020).setAlpha(0.95);
    const green = lamp(0, 0x30ff80).setAlpha(0);
    // the rails take its colour
    const shine = this.add
      .image(sg.x + sg.r * 14, sg.y + sg.r * 16, k.glow)
      .setDisplaySize(sg.r * 60, sg.r * 16)
      .setTint(0xff3020)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.22)
      .setDepth(-9);
    let clear = false;
    this.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        if (!this.ambientMotion || this.reducedMotion) return;
        clear = !clear;
        red.setAlpha(clear ? 0 : 0.95);
        green.setAlpha(clear ? 0.95 : 0);
        shine.setTint(clear ? 0x30ff80 : 0xff3020);
      },
    });
    // two lamps deep in the tunnel, swelling and going
    const far = [-1, 1].map((d) =>
      this.add
        .image(L.far.x + d * 3.2 * L.u, L.far.y, k.glow)
        .setDisplaySize(9 * L.u, 9 * L.u)
        .setTint(0xfff4d0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-9),
    );
    for (const img of far) this.ambientObject(img);
    this.ambientTween({ targets: far, alpha: { from: 0, to: 0.9 }, duration: 5200, hold: 1800, yoyo: true, repeat: -1, repeatDelay: 9000, ease: "Sine.easeInOut" });
    // the failing tube: mostly out, catching now and then
    const f = L.flicker;
    this._tube = this.add
      .image(f.x, f.y + f.h * 0.4, k.glow)
      .setDisplaySize(f.w * 3, f.h * 3.4)
      .setTint(0xd6ece2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(-9);
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        if (!this.ambientMotion || this.reducedMotion) return this._tube.setAlpha(0.2);
        const r = Math.random();
        this._tube.setAlpha(r < 0.08 ? 0.5 : r < 0.2 ? 0.22 : 0.04);
      },
    });
  }

  // the light leaves the first station, runs to the last, lighting each
  // station as it passes, and after a rest starts again
  _startRun() {
    const L = this._L;
    const path = L.lit.path;
    const lengths = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      lengths.push(total);
    }
    // where along the run each station lies
    const marks = L.lit.stations.map((s) => {
      let best = 0;
      let d = Infinity;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1];
        const b = path[i];
        const len = lengths[i - 1] - (lengths[i - 2] || 0);
        const t = Math.max(0, Math.min(1, ((s.x - a.x) * (b.x - a.x) + (s.y - a.y) * (b.y - a.y)) / (len * len)));
        const dist = Math.hypot(a.x + (b.x - a.x) * t - s.x, a.y + (b.y - a.y) * t - s.y);
        if (dist < d) {
          d = dist;
          best = ((lengths[i - 2] || 0) + len * t) / total;
        }
      }
      return best;
    });
    const at = (f) => {
      const d = f * total;
      let i = 0;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const a = path[i];
      const b = path[i + 1];
      const len = lengths[i] - (lengths[i - 1] || 0);
      const t = len ? (d - (lengths[i - 1] || 0)) / len : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    };
    const run = { f: 0 };
    let next = 0;
    this._runTween = this.ambientTween({
      targets: run,
      f: 1,
      duration: RUN_MS,
      ease: "Sine.easeInOut",
      repeat: -1,
      repeatDelay: RUN_REST,
      onStart: () => this._runner.setAlpha(0.9),
      onRepeat: () => {
        next = 0;
      },
      onUpdate: () => {
        const p = at(run.f);
        this._runner.setPosition(p.x, p.y);
        this._runner.setAlpha(0.9 * Math.min(1, run.f * 12, (1 - run.f) * 12 + 0.2));
        while (next < marks.length && run.f >= marks[next]) this._arrive(next++);
      },
    });
  }

  // the light reaches a station: its lamp comes up and fades, a soft tone
  _arrive(i) {
    const lamp = this._lamps[i];
    if (!lamp || !lamp.active) return;
    this.tweens.killTweensOf(lamp);
    lamp.setAlpha(0.85);
    this.tweens.add({ targets: lamp, alpha: 0, duration: 1600, ease: "Quad.easeOut" });
    chime(this, [[660 + i * 55, 0.025]], 0.5);
  }

  // a tap on a station: its lamp flares, a bell rings
  _ring(s, lamp) {
    this.tweens.killTweensOf(lamp);
    lamp.setAlpha(1).setScale(1);
    this.tweens.add({ targets: lamp, alpha: 0, scale: 1.6, duration: 900, ease: "Quad.easeOut" });
    chime(this, [
      [880, 0.05],
      [1320, 0.03],
    ], 0.7);
  }

  // the tannoy: the lamp comes on, and the hall fills with static
  _announce(gain = 0.5) {
    if (this._announcing) return;
    this._announcing = true;
    this.services.audio.playSfx("static", gain, this);
    const lamp = this._lampImg;
    this.tweens.killTweensOf(lamp);
    this.tweens.add({
      targets: lamp,
      alpha: { from: 0, to: 0.9 },
      duration: 120,
      yoyo: true,
      repeat: 9,
      onComplete: () => {
        if (lamp.active) lamp.setAlpha(0);
        this._announcing = false;
      },
    });
    noiseBurst(this, {
      dur: 1.8,
      type: "bandpass",
      freq: 1800,
      q: 0.6,
      gain: 0.08 * gain,
      env: (k) => (k < 0.1 ? k * 10 : 1 - (k - 0.1) / 0.9) * (0.6 + 0.4 * Math.random()),
    });
  }

  // now and then the tannoy crackles on its own
  _scheduleStatic() {
    this._staticTimer = this.time.delayedCall(9000 + Math.random() * 11000, () => {
      if (this.ambientEffects) this._announce(0.3);
      this._scheduleStatic();
    });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseStationArt(this.textures);
    this._announcing = false;
    this._lamps = [];
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseStationArt(this.textures);
    this._L = null;
  }
}
