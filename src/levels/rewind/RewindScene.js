import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { glowCanvas, addCanvasTexture, noiseBurst } from "../../shared/paint.js";
import { paintCandleFlame, addCandleFlame, flickerCandleFlame } from "../../shared/candleFlame.js";
import { fitRender } from "../../shared/renderFit.js";
import SILL from "./rewindSill.json";
import { REWIND } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "REWIND"  ·  code: TIME  ·  Room XI, Orion's study
//
// On his windowsill, the moon and the wet garden behind them, four of his ways
// of keeping time: a brass clock, a tear-off calendar, a sand-glass with a
// scale of minutes, a candle with the hours painted up it. Touched, each runs
// backwards — the hands wind back, the torn pages fly back onto the block, the
// sand climbs up through the neck, the candle grows back — and stops:
//
//   the clock at 7 · the calendar on the 18th · the sand at 14 · the candle at 22
//
// In a room where everything runs the wrong way, so does the alphabet: A is
// 26 and Z is 1, and 7 18 14 22 is T I M E (puzzle.js). The game never says so.
//
// The sill is a Blender render (art/blender/rewind_sill.py): the plate as it
// all lies now, the clock without its hands; and one atlas of what moves — the
// hands, the pages, the sand-glass with its sand gone back up and the candle
// grown back, which are uncovered over the plate as they go.
// ─────────────────────────────────────────────────────────────────────────────

const PLATE = `rewind_plate_v${SILL.version}`;
const PIECES = `rewind_pieces_v${SILL.version}`;
const GLOW = "rewind_glow";
const THINGS = ["clock", "calendar", "glass", "candle"];
const TAKES = { clock: 2800, calendar: 2300, glass: 3200, candle: 3000 }; // ms each runs back
const LABELS = { clock: "Touch the clock", calendar: "Touch the calendar", glass: "Touch the sand-glass", candle: "Touch the candle" };
const [H0, M0] = REWIND.clock.from, [H1, M1] = REWIND.clock.to;
const FROM_MIN = H0 * 60 + M0, TO_MIN = H1 * 60 + M1;
const DAYS = []; // the pages that fly back on, the first first
for (let day = REWIND.calendar.from - 1; day >= REWIND.calendar.to; day--) DAYS.push(day);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export default class RewindScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Rewind" });
  }

  init(data) {
    this.skipFadeIn = data?.skipFade ?? true;
  }

  preload() {
    const url = (what) => `assets/images/Rewind/rewind-${what}-v${SILL.version}.webp`;
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, url("plate"));
    if (!this.textures.exists(PIECES)) this.load.image(PIECES, url("pieces"));
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#05070c");
    // how far each has run back, 0 (as it lies now) to 1 (stopped); a new
    // visit finds them all as they lie, a resize keeps them where they are
    this._run = Object.fromEntries(THINGS.map((k) => [k, 0]));
    this._tweens = {};
    this._sparkles = [];
    this._frames();
    paintCandleFlame(this.textures);
    if (!this.textures.exists(GLOW)) addCanvasTexture(this.textures, GLOW, glowCanvas());
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _frames() {
    if (!this.textures.exists(PIECES)) return;
    const atlas = this.textures.get(PIECES);
    const add = (name, frame) => { if (!atlas.has(name)) atlas.add(name, 0, ...frame); };
    add("hour", SILL.clock.hour.frame);
    add("minute", SILL.clock.minute.frame);
    for (const [day, frame] of Object.entries(SILL.calendar.pages)) add(`page-${day}`, frame);
    add("glass", SILL.glass.frame);
    add("candle", SILL.candle.frame);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const f = (this._f = fitRender(W, H, SILL));
    if (this.textures.exists(PLATE)) this.add.image(f.x, f.y, PLATE).setOrigin(0, 0).setDisplaySize(SILL.width * f.s, SILL.height * f.s).setDepth(0);
    this._parts = {};
    if (this.textures.exists(PIECES)) {
      this._buildClock();
      this._buildCalendar();
      this._buildGlass();
      this._buildCandle();
    }
    // each thing, touched, runs back
    const box = { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity };
    for (const kind of THINGS) {
      const quad = SILL.hit[kind].map((p) => f.at(p));
      for (const p of quad) { box.x = Math.min(box.x, p.x); box.y = Math.min(box.y, p.y); box.r = Math.max(box.r, p.x); box.b = Math.max(box.b, p.y); }
      this.add.zone(0, 0, W, H).setOrigin(0, 0).setDepth(10)
        .setInteractive({ hitArea: new Phaser.Geom.Polygon(quad.flatMap((p) => [p.x, p.y])), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
        .setData("interactionLabel", LABELS[kind])
        .on("pointerdown", () => this._runBack(kind));
    }
    const levels = this.services.levels;
    const bounds = { x: box.x, y: box.y, width: box.r - box.x, height: box.b - box.y };
    this._sparkles.push(attachMovableSparkles(this, this.add.zone(bounds.x, bounds.y, bounds.width, bounds.height).setOrigin(0, 0), {
      bounds: () => bounds,
      enabled: () => !levels?.isCompleted?.(levels.indexOf("rewind")),
      padding: 6,
    }));
    for (const kind of THINGS) this._show(kind);
  }

  // a piece of the atlas, laid where Blender cut it from
  _piece(frame, box, depth) {
    const f = this._f, p = f.at(box);
    return this.add.image(p.x, p.y, PIECES, frame).setOrigin(0, 0).setDisplaySize(box[2] * f.s, box[3] * f.s).setDepth(depth);
  }

  // the hands, turning about the dial's middle; a faint shadow under each
  _buildClock() {
    const f = this._f, c = SILL.clock, pivot = f.at(c.pivot);
    const hand = (name, depth) => {
      const { box } = c[name];
      const origin = [(c.pivot[0] - box[0]) / box[2], (c.pivot[1] - box[1]) / box[3]];
      const make = () => this.add.image(pivot.x, pivot.y, PIECES, name).setOrigin(...origin).setDisplaySize(box[2] * f.s, box[3] * f.s).setDepth(depth);
      const shadow = make().setTintFill(0x000000).setAlpha(0.28).setDepth(depth - 0.05);
      const cm = (c.radius / 5.6) * f.s;   // (pixels a cm, on the dial)
      shadow.setPosition(pivot.x + 0.14 * cm, pivot.y + 0.22 * cm);
      return { image: make(), shadow };
    };
    this._parts.clock = { hour: hand("hour", 2), minute: hand("minute", 2.2) };
  }

  // the top page, once one has flown back on, and the one flying
  _buildCalendar() {
    const box = SILL.calendar.box;
    const top = this._piece(`page-${DAYS[0]}`, box, 1).setVisible(false);
    const flying = this._piece(`page-${DAYS[0]}`, box, 1.1).setVisible(false);
    this._parts.calendar = { top, flying, box };
  }

  // the sand-glass as it ends, uncovered over the plate as the sand moves;
  // the thread of sand climbing the neck
  _buildGlass() {
    const g = SILL.glass;
    const image = this._piece("glass", g.box, 1);
    const mask = this.make.graphics({}, false);
    image.setMask(mask.createGeometryMask());
    const stream = this.add.graphics().setDepth(1.2);
    this._parts.glass = { image, mask, stream };
  }

  // the candle as it ends, uncovered up its length; its top, its wick, its
  // flame and the flame's light going up with it
  _buildCandle() {
    const c = SILL.candle;
    const image = this._piece("candle", c.box, 1);
    const mask = this.make.graphics({}, false);
    image.setMask(mask.createGeometryMask());
    const top = this.add.graphics().setDepth(1.3);
    const s = c.s * this._f.s;
    const at = this._f.at(c.wick[0]);
    const flame = addCandleFlame(this, { x: at.x, y: at.y, s }, 3);
    const glow = this.add.image(at.x, at.y, GLOW).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb066).setAlpha(0.32).setDepth(2.5);
    glow.setDisplaySize(16 * s, 16 * s);
    this._parts.candle = { image, mask, top, flame, glow };
  }

  // ── running back ───────────────────────────────────────────────────────────

  _runBack(kind) {
    if (this._tweens[kind]?.isPlaying()) return;
    this._run[kind] = 0;
    this._show(kind);
    if (this.reducedMotion) { this._run[kind] = 1; this._show(kind); return; }
    this._sound(kind, "start");
    let last = 0;
    this._tweens[kind] = this.tweens.addCounter({
      from: 0, to: 1, duration: TAKES[kind], ease: "Linear",
      onUpdate: (tween) => {
        this._run[kind] = tween.getValue();
        this._show(kind);
        last = this._sound(kind, "running", last);
      },
      onComplete: () => { this._run[kind] = 1; this._show(kind); this._sound(kind, "stop"); },
    });
  }

  // each thing as it is, `this._run[kind]` of the way back
  _show(kind) {
    const part = this._parts?.[kind];
    if (!part) return;
    const t = this._run[kind], f = this._f;
    if (kind === "clock") {
      const minutes = lerp(FROM_MIN, TO_MIN, easeInOut(t));
      const hour = ((minutes / 60) % 12) / 12 * Math.PI * 2, minute = (minutes % 60) / 60 * Math.PI * 2;
      for (const [hand, angle] of [[part.hour, hour], [part.minute, minute]]) {
        hand.image.setRotation(angle); hand.shadow.setRotation(angle);
      }
    } else if (kind === "calendar") {
      // the pages fly back on one after another, each from above and aside
      const n = DAYS.length, k = Math.min(n - 1, Math.floor(t * n)), u = t >= 1 ? 1 : t * n - k;
      const landed = t >= 1 ? n : k;            // pages already back on the block
      part.top.setVisible(landed > 0);
      if (landed > 0) part.top.setFrame(`page-${DAYS[landed - 1]}`).setDisplaySize(part.box[2] * f.s, part.box[3] * f.s);
      const flying = t > 0 && t < 1;
      part.flying.setVisible(flying);
      if (flying) {
        const e = 1 - (1 - u) ** 3, p = f.at(part.box), w = part.box[2] * f.s, h = part.box[3] * f.s;
        part.flying.setFrame(`page-${DAYS[k]}`).setDisplaySize(w, h).setOrigin(0.5, 0.5)
          .setPosition(p.x + w / 2 + lerp(0.55 * w, 0, e), p.y + h / 2 + lerp(-1.25 * h, 0, e))
          .setRotation(lerp(0.5, 0, e)).setAlpha(Math.min(1, u * 3));
      }
    } else if (kind === "glass") {
      const g = SILL.glass, e = easeInOut(t), at = (y) => f.at([g.box[0], y]).y;
      const neck = at(g.neck[1]), high = at(lerp(g.high[0], g.high[1], e)), low = at(lerp(g.low[0], g.low[1], e));
      const x0 = f.at(g.box).x, w = g.box[2] * f.s;
      part.mask.clear().fillStyle(0xffffff);
      if (t > 0) {
        part.mask.fillRect(x0, high, w, neck - high);        // what has climbed into the top
        part.mask.fillRect(x0, neck, w, low - neck);          // what has left the bottom
      }
      part.stream.clear();
      if (t > 0 && t < 1) {
        // the thread of sand, climbing: little grains going up
        const x = f.at(g.neck).x, s = g.s * f.s, now = this.time.now / 1000;
        part.stream.lineStyle(Math.max(1, 0.12 * s), 0xa07a48, 0.85).lineBetween(x, low, x, high);
        part.stream.fillStyle(0xe2c493, 0.8);
        for (let i = 0; i < 6; i++) {
          const y = low - ((now * 6 * s + i * (low - high) / 6) % Math.max(1, low - high));
          part.stream.fillRect(x - 0.08 * s, y, 0.16 * s, 0.25 * s);
        }
      }
    } else if (kind === "candle") {
      const c = SILL.candle, e = easeInOut(t);
      const stub = f.at(c.top[0]), tall = f.at(c.top[1]);
      const y = lerp(stub.y, tall.y, e), r = c.r * f.s, s = c.s * f.s;
      part.mask.clear().fillStyle(0xffffff);
      if (t > 0) part.mask.fillRect(stub.x - r * 1.03, y, r * 2.06, stub.y - y + 0.6 * s);   // (the candle alone: round it the light was not the same)
      // its top: the melted wax, the wick standing out of it
      part.top.clear();
      if (t > 0) {
        part.top.fillStyle(0xf1e7cf, 1).fillEllipse(stub.x, y, r * 2 * 0.96, Math.max(2, r * 0.22));
        part.top.fillStyle(0xd8c9a6, 1).fillEllipse(stub.x, y + 0.04 * s, r * 1.5, Math.max(1.2, r * 0.13));
        part.top.lineStyle(Math.max(1, 0.16 * s), 0x1a120c, 1).lineBetween(stub.x + 0.03 * s, y, stub.x + 0.08 * s, y - 0.7 * s);
      }
      const wick = f.at([lerp(c.wick[0][0], c.wick[1][0], e), lerp(c.wick[0][1], c.wick[1][1], e)]);
      part.flame.image.setPosition(wick.x, wick.y);
      part.glow.setPosition(wick.x, wick.y - 1.2 * s);
    }
  }

  // what each sounds like going backwards: a sound's tail first, its blow last
  _sound(kind, when, last = 0) {
    const back = (x) => x ** 3;
    if (kind === "clock") {
      if (when !== "running") return last;
      // a tick for every five minutes wound back
      const minutes = lerp(FROM_MIN, TO_MIN, easeInOut(this._run.clock)), mark = Math.floor(minutes / 5);
      if (last && mark !== last) noiseBurst(this, { dur: 0.045, type: "bandpass", freq: 3400, q: 4, gain: 0.22, env: back });
      return mark;
    }
    if (kind === "calendar") {
      if (when !== "running") return last;
      const page = Math.floor(this._run.calendar * DAYS.length);
      if (page !== last) noiseBurst(this, { dur: 0.16, type: "bandpass", freq: 2600, q: 0.9, gain: 0.2, env: (x) => x ** 2 * (1 - x) * 4 });
      return page;
    }
    if (when === "start") {
      if (kind === "glass") noiseBurst(this, { dur: TAKES.glass / 1000, type: "highpass", freq: 5200, q: 0.5, gain: 0.06, env: (x) => Math.sin(Math.PI * x) * (0.7 + 0.3 * Math.sin(x * 60)) });
      if (kind === "candle") noiseBurst(this, { dur: 1.1, type: "lowpass", freq: 700, q: 0.6, gain: 0.22, env: back });
    }
    return last;
  }

  update(time) {
    const candle = this._parts?.candle;
    if (candle && this.ambientMotion && !this.reducedMotion) {
      const t = time / 1000;
      flickerCandleFlame(candle.flame, t);
      candle.glow.setAlpha(0.3 + 0.04 * Math.sin(t * 9) + Math.random() * 0.03);
    }
    // the climbing grains keep moving while the sand does
    if (this._tweens.glass?.isPlaying()) this._show("glass");
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    for (const kind of THINGS) {
      // whatever was running back has stopped where it was going
      if (this._tweens[kind]?.isPlaying()) this._run[kind] = 1;
    }
    this.tweens.killAll();
    this._tweens = {};
    for (const part of Object.values(this._parts ?? {})) part.mask?.destroy();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._parts = {};
  }

  shutdown() {
    this._sparkles?.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    for (const part of Object.values(this._parts ?? {})) part.mask?.destroy();
    this._parts = {};
  }
}
