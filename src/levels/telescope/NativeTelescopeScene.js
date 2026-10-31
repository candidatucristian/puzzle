import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { ConstellationHover } from "./constellations.js";
import native from "./nativeWindow.json";

const PHASE = { ROOM: 0, TRANSITION: 1, SKY: 2 };
const key = (name) => `tele_native_v1_${name}`;
const names = ["window", "quiet", "approach"];

// Moon, stars, landscape, telescope and window are all native Cycles renders.
// The existing constellation guide stays aligned with the rendered star geometry.
export default class NativeTelescopeScene extends BasePuzzleScene {
  constructor() { super({ key: "Telescope" }); }
  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  preload() {
    for (const name of names) if (!this.textures.exists(key(name))) {
      this.load.image(key(name), `assets/images/Telescope/native-v1/${name}.webp`);
    }
  }

  create() {
    this.beginScene();
    const levels = this.services.levels;
    const cfg = (levels.definitions || []).find((level) => level.key === "Telescope");
    this._atGlass = Boolean(levels.homeOf?.(levels.definitions.indexOf(cfg)));
    this.ANSWER = native.word;
    this.isSolved = false;
    this.phase = this._atGlass ? PHASE.SKY : PHASE.ROOM;
    this._targetPhase = this.phase;
    this._pointerOut = false;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._startAmbient();
    this.input.on("pointerdown", (p) => {
      if (this.phase === PHASE.ROOM && this._scopeHit(p)) this._changePhase(PHASE.SKY);
    });
    this.input.on("pointermove", (p) => {
      if (this.phase === PHASE.ROOM) this.input.setDefaultCursor(this._scopeHit(p) ? "pointer" : "default");
    });
    this.input.on("gameout", () => { this._pointerOut = true; });
    this.input.on("gameover", () => { this._pointerOut = false; });
    this.listenToResize(({ width, height }) => {
      const phase = this.phase === PHASE.TRANSITION ? this._targetPhase : this.phase;
      this._teardown();
      this.phase = phase;
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    this._W = W; this._H = H;
    const s = Math.max(W / native.width, H / native.height);
    const x = (W - native.width * s) / 2;
    const y = (H - native.height * s) / 2;
    this._fit = { x, y, s };
    const at = ([px, py]) => ({ x: x + px * s, y: y + py * s });
    const photo = this.phase === PHASE.ROOM ? "approach" : "window";
    this._photo = this.add.image(W / 2, H / 2, key(photo)).setScale(s).setDepth(0);
    if (this.phase === PHASE.ROOM) {
      const b = native.scopeBounds;
      const zone = this.add.zone(x + b.x * s, y + b.y * s, b.width * s, b.height * s).setOrigin(0).setDepth(5)
        .setInteractive({ cursor: "pointer" }).setData("interactionLabel", "Look through the telescope");
      zone.on("pointerdown", () => this._changePhase(PHASE.SKY));
      return;
    }
    this._quiet = this.add.image(W / 2, H / 2, key("quiet")).setScale(s).setDepth(.1).setAlpha(0);
    this._groups = native.cells.map((cell) => ({
      dots: cell.dots, cx: x + cell.cx * s, cy: y + cell.cy * s,
      box: {
        x0: x + cell.box.x0 * s, x1: x + cell.box.x1 * s,
        y0: y + cell.box.y0 * s, y1: y + cell.box.y1 * s,
      },
    }));
    this._hover = new ConstellationHover(this, {
      cells: this._groups, dx: native.dx * s, dy: native.dy * s, S: Math.min(W, H),
      tune: {
        LINE_ALPHA: .30, HALO_ALPHA: .055, GHOST_ALPHA: .17,
        PULSE: this.ambientMotion,
        ...(this.reducedMotion ? { IN: .01, OUT: .01 } : {}),
      },
    });
    if (native.opening) {
      this._maskShape = this.make.graphics({}, false);
      this._maskShape.fillStyle(0xffffff).fillPoints(native.opening.map(at), true);
      const mask = this._skyMask = this._maskShape.createGeometryMask();
      this._hover.gfx.setMask(mask);
      for (const cell of this._hover.cells) {
        cell.halo.setMask(mask);
        for (const glow of cell.glows) glow.setMask(mask);
      }
    }
    if (!this._atGlass) {
      const back = this.add.text(24, 20, "↩", { fontFamily: "Georgia, serif", fontSize: "30px", color: "#b8a57d" })
        .setDepth(8).setInteractive({ cursor: "pointer" }).setData("interactionLabel", "Back to the telescope");
      back.on("pointerdown", () => this._changePhase(PHASE.ROOM));
    }
  }

  _scopeHit(p) {
    if (!this._fit || this.phase !== PHASE.ROOM) return false;
    const { x, y, s } = this._fit, b = native.scopeBounds;
    return p.x >= x + b.x * s && p.x <= x + (b.x + b.width) * s
      && p.y >= y + b.y * s && p.y <= y + (b.y + b.height) * s;
  }

  _changePhase(target) {
    if (this.phase === PHASE.TRANSITION || this.phase === target) return;
    this._targetPhase = target;
    this.phase = PHASE.TRANSITION;
    this.input.setDefaultCursor("default");
    this.services.audio.playSfx("click", .8, this);
    const duration = this.reducedMotion ? 1 : 550;
    this.tweens.add({
      targets: [this._photo, this._quiet].filter(Boolean), alpha: 0,
      scale: this._photo.scaleX * (target === PHASE.SKY ? 1.18 : .97),
      duration, ease: "Sine.easeInOut",
      onComplete: () => {
        this._teardown();
        this.phase = target;
        this._build(this._W, this._H);
        if (!this.reducedMotion) this.cameras.main.fadeIn(350, 0, 0, 0);
      },
    });
  }

  update(time, delta) {
    this._updateAmbience();
    if (this.phase !== PHASE.SKY || !this._hover) return;
    const p = this.input.activePointer;
    const live = p && this.input.enabled && !this._pointerOut;
    const over = this._hover.update(Math.min((delta || 16) / 1000, .1), live ? p.x : NaN, live ? p.y : NaN, this.ambientMotion ? time / 1000 : 0);
    this.input.setDefaultCursor(over ? "pointer" : "default");
    const scintillation = this.ambientMotion ? .035 + .025 * Math.sin(time * .00085) : 0;
    this._quiet.setAlpha(Math.min(1, this._hover.focus * .5 + scintillation));
  }

  // Keep the level's existing restrained night-wind sound and volume bus.
  _startAmbient() {
    this._ambTarget = null;
    try {
      const ac = this.sound.context, master = ac.createGain();
      master.gain.value = 0; master.connect(this.sound.destination);
      const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 2), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const wind = ac.createBufferSource(); wind.buffer = buffer; wind.loop = true;
      const filter = ac.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 360;
      const gain = ac.createGain(); gain.gain.value = .45;
      wind.connect(filter); filter.connect(gain); gain.connect(master); wind.start();
      this._amb = { ac, master, wind, filter, gain };
    } catch { this._amb = null; }
  }

  _updateAmbience() {
    if (!this._amb) return;
    const state = this.services.audio.state;
    const volume = state ? (state.muted ? 0 : state.sfxVol) : .8;
    const target = this.phase === PHASE.ROOM ? 0 : volume * .5;
    if (target === this._ambTarget) return;
    this._ambTarget = target;
    const { ac, master } = this._amb;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(target, ac.currentTime, .12);
  }

  _teardown() {
    this.tweens.killAll();
    this._hover?.destroy(); this._hover = null;
    this._skyMask?.destroy(); this._skyMask = null;
    for (const object of this.children.list.slice()) object.destroy();
    this._maskShape?.destroy(); this._maskShape = null;
    this._photo = null; this._quiet = null; this._fit = null;
  }

  replay() {
    this._teardown();
    this.phase = this._atGlass ? PHASE.SKY : PHASE.ROOM;
    this._targetPhase = this.phase;
    this._build(this._W, this._H);
  }

  shutdown() {
    this._hover?.destroy(); this._hover = null;
    this._skyMask?.destroy(); this._skyMask = null;
    this._maskShape?.destroy(); this._maskShape = null;
    this.tweens.killAll();
    try {
      this._amb?.wind.stop(); this._amb?.wind.disconnect();
      this._amb?.filter.disconnect(); this._amb?.gain.disconnect(); this._amb?.master.disconnect();
    } catch { /* The scene may already have released its audio context. */ }
    this._amb = null;
    for (const name of names) if (this.textures.exists(key(name))) this.textures.remove(key(name));
  }
}
