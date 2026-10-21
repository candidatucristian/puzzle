import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst, addCanvasTexture } from "../../shared/paint.js";
import { KEYS, glassBox, layoutSink, paintLitmus, paintSink, releaseSink, waterIn } from "./art.js";
import { BOTTLES, pour, toTheLine } from "./puzzle.js";
import { loadMeasuresPhotography, alignMeasuresPhotography } from "./photography.js";
import { addRainGlass, boxOf } from "../../shared/phaserRain.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "MEASURES"  ·  code: ACID  ·  to the line
//
// By the sink in Silas's weighing room (Room VIII): a bottle that holds
// 500 ml and one that holds 300 ml, nothing marked on them but that; and a
// volumetric flask, 400 ml etched on its bulb and one ring round its neck,
// a strip of blue litmus hung in it. A click takes up a bottle; then the
// tap fills it, the sink empties it, the other bottle takes what it can of
// it, and the flask takes all of it. Exactly 400 ml into the flask in one
// pour stands at its ring — a flame travels down the blue strip and leaves
// the word ACID in its charred wake.
// Anything else is tipped away into the sink, and the flask stands empty.
//
// The water is level in a tilted bottle and keeps its volume (art.js
// waterIn). Nothing on screen says what to measure.
//
// The two bottles are made in three dimensions (stage3d.js, three.js, loaded
// with this level alone) and drawn where the scene has them; a bottle can be
// taken up and carried — to the tap, the sink, the other bottle or the
// flask — and let go there, it does what a click there would.
// ─────────────────────────────────────────────────────────────────────────────

const WATER = 0x9fc4d4;
const BURN_MS = 4600;
const STAGE = "ms_stage"; // the picture the bottles are drawn on, in three dimensions
// what a bottle carried somewhere and let go there will do
const DROP = {
  tap: "Fill it at the tap", sink: "Empty it into the sink",
  bottle: "Pour it into the other bottle", flask: "Pour into the flask",
};

export default class MeasuresScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Measures" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    loadMeasuresPhotography(this);
  }

  create() {
    this.beginScene();
    // what is in each bottle, in the flask, and whether it has stood at its ring
    this._ml = [0, 0];
    this._flaskMl = 0;
    this._turned = 0;
    this._atLine = false;
    this._pendingContents = null;
    this._burnEndsAt = null;
    this.input.dragDistanceThreshold = 8;
    // the bottles, in three dimensions: three.js comes with this level alone
    import("./stage3d.js").then(({ MeasuresStage }) => {
      if (!this.sys.isActive()) return;
      this._stage = new MeasuresStage();
      this._sceneCleanups.add(() => { this._stage?.dispose(); this._stage = null; });
      this._build(this.cameras.main.width, this.cameras.main.height);
      this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const L = (this._L = layoutSink(W, H));
    alignMeasuresPhotography(this, L);
    paintSink(this, L);
    this.add.image(0, 0, KEYS.room).setOrigin(0, 0).setDepth(-10);
    const u = L.u;
    this._stream = this.add.graphics().setDepth(8);
    this._busy = false;
    this._held = null;
    // each vessel: a container about its middle — its water, (the litmus), its glass
    this._vessels = L.vessels.map((v, i) => {
      const box = glassBox(v, u);
      const water = this.add.graphics();
      const parts = [water];
      let litmus = null;
      if (v.kind === "flask") {
        litmus = this.add.image(-v.neckW * 0.12, v.top - 3 * u, "__DEFAULT").setOrigin(0.5, 0);
        parts.push(litmus);
      }
      const glass = this.add.image(0, 0, KEYS.glass(i)).setDisplaySize(box.w, box.h).setOrigin(box.ox / box.w, box.oy / box.h);
      parts.push(glass);
      const c = this.add.container(v.x, v.y, parts).setDepth(5);
      const shadow = this.add.image(v.x, L.counter + 3 * u, KEYS.glow).setDepth(1)
        .setTint(0x000000).setAlpha(.6).setDisplaySize(box.w * 1.25, 16 * u);
      const hit = this.add.zone(v.x, v.y + (v.top + v.bottom) / 2, box.w, v.bottom - v.top + 10 * u).setDepth(9)
        .setName(`measures-vessel-${i}`)
        .setInteractive({ useHandCursor: true }).setData("interactionLabel", v.kind === "flask" ? "Pour into the flask" : "Take up the bottle");
      const vessel = { v, i, c, water, litmus, hit, shadow, glass, home: { x: v.x, y: v.y }, angle: 0, moved: false };
      // a click does what it did; a bottle can also be taken up and carried
      hit.on("pointerdown", () => { vessel.moved = false; });
      hit.on("pointerup", () => { if (!vessel.moved) this._click(i); });
      if (v.kind === "bottle") {
        this.input.setDraggable(hit);
        hit.on("dragstart", (pointer) => this._takeUp(vessel, pointer));
        hit.on("drag", (pointer) => this._carryTo(vessel, pointer));
        hit.on("dragend", () => this._letGo(vessel));
      }
      return vessel;
    });
    // the bottles drawn in three dimensions, over the photograph: their drawn
    // glass and water stood aside
    const stage = this._stage;
    stage.fit(W, H, L, BOTTLES.map((ml) => `${ml} ml`), this.textures.get(KEYS.room).getSourceImage());
    if (this.textures.exists(STAGE)) this.textures.remove(STAGE);
    this._stageTexture = this.textures.addImage(STAGE, stage.canvas);
    // (the photograph is drawn with them, behind them, to be seen through them)
    this.add.image(0, 0, STAGE).setOrigin(0, 0).setDepth(4);
    // the rain on the window, over that picture (a bottle is never lifted so high)
    if (L.rain) addRainGlass(this, { ...L.rain, rect: boxOf(L.rain.panes, 2), picture: this.textures.get(KEYS.room).getSourceImage(), depth: 4.5 });
    for (const b of this._vessels) if (b.v.kind === "bottle") { b.glass.setVisible(false); b.water.setVisible(false); b.shadow.setVisible(false); }
    this._drawn = null;
    this._paintLitmus();
    this._makeBurn();
    // the tap and the sink
    const t = L.tap;
    this.add.zone((t.x + t.spout.x) / 2, t.spout.y + 40 * u, 100 * u, 160 * u).setName("measures-tap").setDepth(9).setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Fill it at the tap").on("pointerdown", () => this._tap());
    const s = L.sink;
    this.add.zone((s.x0 + s.x1) / 2, s.hitY ?? L.counter + 40 * u, s.x1 - s.x0, s.hitH ?? 80 * u).setName("measures-sink").setDepth(9).setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Empty it into the sink").on("pointerdown", () => this._sink());
    this._built = true;
    if (this._atLine && this._turned < 1) this._turn({ sound: false });
  }

  // ── a bottle carried ───────────────────────────────────────────────────────

  _takeUp(b, pointer) {
    if (this._busy) { b.carried = null; return; }
    // another one taken up by a click is set down first
    if (this._held !== null && this._held !== b.i) this._lift(this._held, false);
    this.tweens.killTweensOf(b.c); this.tweens.killTweensOf(b);
    this._held = b.i;
    b.carried = { dx: b.c.x - pointer.x, dy: b.c.y - pointer.y, at: null, vx: 0, x: b.c.x, t: this.time.now };
    noiseBurst(this, { dur: 0.06, type: "bandpass", freq: 2600, q: 3, gain: 0.12, env: (x) => (1 - x) ** 3 });
  }

  _carryTo(b, pointer) {
    if (!b.carried) return;
    b.moved = true;
    const L = this._L, u = L.u;
    const x = Math.max(L.W * 0.03, Math.min(L.W * 0.97, pointer.x + b.carried.dx));
    // no higher than the foot of the window
    const y = Math.max((L.sill ?? -Infinity) - b.v.top, Math.min(b.home.y, pointer.y + b.carried.dy));
    const now = this.time.now, dt = Math.max(1, now - b.carried.t);
    b.carried.vx += ((x - b.carried.x) / dt - b.carried.vx) * 0.35;
    b.carried.x = x; b.carried.t = now;
    b.c.setPosition(x, y);
    // carried, it sways back against the way it goes
    b.angle = this.reducedMotion ? 0 : Math.max(-0.22, Math.min(0.22, -b.carried.vx * 0.12));
    b.c.setRotation(b.angle);
    // where it would be let go, said as it is held there
    const at = this._dropAt(b);
    if (at !== b.carried.at) {
      b.carried.at = at;
      this.game.events.emit("puzzle:interaction", { label: at ? DROP[at.kind] : "" });
    }
    void u;
  }

  // what it is held over: the tap's mouth, the other bottle, the flask, the sink
  _dropAt(b) {
    const L = this._L, u = L.u, mouth = { x: b.c.x, y: b.c.y + b.v.top }, sp = L.tap.spout;
    if (Math.abs(mouth.x - sp.x) < 70 * u && mouth.y > sp.y - 40 * u && mouth.y < sp.y + 190 * u) return { kind: "tap" };
    for (const o of this._vessels) {
      if (o === b) continue;
      const reach = o.v.kind === "flask" ? o.v.r * 1.4 : (o.v.w + b.v.w) * 0.45;
      if (Math.abs(b.c.x - o.home.x) < reach && b.c.y < o.home.y + 10 * u) return { kind: o.v.kind === "flask" ? "flask" : "bottle", into: o.i };
    }
    const s = L.sink;
    if (b.c.x > s.x0 && b.c.x < s.x1) return { kind: "sink" };
    return null;
  }

  _letGo(b) {
    if (!b.carried) return;
    const at = this._dropAt(b);
    b.carried = null;
    this.game.events.emit("puzzle:interaction", { label: "" });
    // stood upright again before it does anything
    this.tweens.add({ targets: b, angle: 0, duration: this.reducedMotion ? 0 : 160, ease: "Sine.easeOut", onUpdate: () => b.c.setRotation(b.angle) });
    const i = b.i;
    this._held = i;
    if (at?.kind === "tap") this._tap();
    else if (at?.kind === "sink") this._sink();
    else if (at?.kind === "bottle") this._pourInto(i, at.into);
    else if (at?.kind === "flask" && !this._atLine) this._pourIntoFlask(i);
    // nothing to be done there (or it could not be): carried home again
    if (!this._busy) {
      this._held = null;
      this.tweens.killTweensOf(b.c);
      this.tweens.add({ targets: b.c, x: b.home.x, y: b.home.y, duration: this.reducedMotion ? 0 : 360, ease: "Sine.easeInOut" });
      noiseBurst(this, { dur: 0.06, type: "bandpass", freq: 1800, q: 3, gain: 0.12, env: (x) => (1 - x) ** 3 });
    }
  }

  // ── what is done with them ─────────────────────────────────────────────────

  _click(i) {
    if (this._busy) return;
    const held = this._held;
    const vessel = this._vessels[i];
    if (vessel.v.kind === "flask") {
      if (held !== null && !this._atLine) this._pourIntoFlask(held);
      return;
    }
    if (held === null) return this._lift(i, true);
    if (held === i) return this._lift(i, false);
    this._pourInto(held, i);
  }

  // a bottle taken up, or set down
  _lift(i, up) {
    this._held = up ? i : null;
    const b = this._vessels[i];
    this.tweens.killTweensOf(b.c);
    this.tweens.add({ targets: b.c, y: b.home.y - (up ? 18 * this._L.u : 0), duration: this.reducedMotion ? 0 : 220, ease: "Cubic.easeOut" });
    noiseBurst(this, { dur: 0.06, type: "bandpass", freq: up ? 2600 : 1800, q: 3, gain: 0.12, env: (x) => (1 - x) ** 3 });
  }

  // carry bottle `i` to (x, y), tip it to `angle` while `during(k)` runs
  // (k from 0 to 1), tip it back and bring it home; then `done`
  _carryAndTip(i, to, angle, ms, during, done) {
    const b = this._vessels[i], fast = this.reducedMotion;
    this.tweens.killTweensOf(b.c);
    this._busy = true;
    const go = fast ? 0 : 380, back = fast ? 0 : 380, tip = fast ? 0 : 260;
    this.tweens.add({
      targets: b.c, x: to.x, y: to.y, duration: go, ease: "Sine.easeInOut",
      onComplete: () => this.tweens.add({
        targets: b, angle, duration: tip, ease: "Sine.easeIn", onUpdate: () => b.c.setRotation(b.angle),
        onComplete: () => this.tweens.addCounter({
          from: 0, to: 1, duration: fast ? 0 : ms,
          onUpdate: (tw) => during(tw.getValue()),
          onComplete: () => {
            during(1);
            this._stream.clear();
            this.tweens.add({
              targets: b, angle: 0, duration: tip, ease: "Sine.easeOut", onUpdate: () => b.c.setRotation(b.angle),
              onComplete: () => this.tweens.add({
                targets: b.c, x: b.home.x, y: b.home.y, duration: back, ease: "Sine.easeInOut",
                onComplete: () => { this._busy = false; this._held = null; this._pendingContents = null; done?.(); },
              }),
            });
          },
        }),
      }),
    });
  }

  // a stream from a bottle's lip down to a point, as it pours
  _drawStream(b, to, k) {
    const v = b.v, u = this._L.u, a = b.angle, side = Math.sign(a) || 1;
    const lip = { x: side * v.neckW / 2, y: v.top };
    const x = b.c.x + lip.x * Math.cos(a) - lip.y * Math.sin(a), y = b.c.y + lip.x * Math.sin(a) + lip.y * Math.cos(a);
    const g = this._stream.clear();
    const thick = Math.max(1.5, 4 * u * Math.sin(Math.PI * Math.min(1, k * 1.15)));
    const wob = (t) => Math.sin(t * 9 + this.time.now / 70) * 0.8 * u;
    g.lineStyle(thick, WATER, 0.65);
    g.beginPath(); g.moveTo(x, y);
    for (let t = 0.1; t <= 1.001; t += 0.1) g.lineTo(x + (to.x - x) * (t * t * 0.4 + t * 0.6) + wob(t), y + (to.y - y) * t);
    g.strokePath();
    g.lineStyle(Math.max(0.6, thick * 0.3), 0xffffff, 0.5);
    g.beginPath(); g.moveTo(x - thick * 0.2, y);
    for (let t = 0.1; t <= 1.001; t += 0.1) g.lineTo(x - thick * 0.2 + (to.x - x) * (t * t * 0.4 + t * 0.6) + wob(t), y + (to.y - y) * t);
    g.strokePath();
  }

  _pourInto(from, to) {
    const { levels, moved } = pour(this._ml, from, to);
    if (!moved) { this._lift(from, false); return; }
    const A = this._vessels[from], B = this._vessels[to], u = this._L.u;
    const side = B.v.x > A.v.x ? 1 : -1;
    const mouth = { x: B.home.x, y: B.home.y + B.v.top };
    const at = { x: B.home.x - side * (A.v.h * 0.5 + 10 * u), y: mouth.y - 60 * u };
    const start = this._ml.slice();
    this._pendingContents = { bottles: levels };
    this._glug(moved);
    this._carryAndTip(from, at, side * 1.2, 300 + moved * 2.4, (k) => {
      this._ml[from] = start[from] - moved * k;
      this._ml[to] = start[to] + moved * k;
      this._drawStream(A, { x: mouth.x, y: B.home.y + this._surfaceY(B) }, k);
    }, () => { this._ml = levels; });
  }

  _pourIntoFlask(from) {
    const A = this._vessels[from], F = this._vessels[2], u = this._L.u;
    const ml = this._ml[from];
    if (!ml) { this._lift(from, false); return; }
    this._pendingContents = {
      bottles: this._ml.map((amount, i) => i === from ? 0 : amount),
      flask: toTheLine(ml) ? ml : 0, atLine: toTheLine(ml),
    };
    const mouth = { x: F.home.x, y: F.home.y + F.v.top };
    const at = { x: F.home.x - (A.v.h * 0.5 + 10 * u), y: mouth.y - 50 * u };
    this._glug(ml);
    this._carryAndTip(from, at, 1.25, 300 + ml * 2.4, (k) => {
      this._ml[from] = ml * (1 - k);
      this._flaskMl = Math.min(F.v.cap, ml * k);
      this._drawStream(A, { x: mouth.x, y: F.home.y + this._surfaceY(F) }, k);
    }, () => {
      this._ml[from] = 0;
      if (toTheLine(ml)) { this._atLine = true; this._turn(); return; }
      // a moment to see where it stands, then it is tipped away
      this._busy = true;
      this._pendingContents = { flask: 0 };
      this._drainTimer = this.setSceneTimeout(() => { this._drainTimer = null; this._emptyFlask(); }, 900);
    });
  }

  // fill the bottle held at the tap
  _tap() {
    const i = this._held;
    if (this._busy || i === null) return;
    const b = this._vessels[i], L = this._L, u = L.u, cap = BOTTLES[i], have = this._ml[i];
    if (have >= cap) return;
    const at = { x: L.tap.spout.x, y: L.tap.spout.y + 12 * u - b.v.top };
    const start = have;
    this._busy = true;
    this._pendingContents = { bottles: this._ml.map((amount, j) => j === i ? cap : amount) };
    this.tweens.killTweensOf(b.c);
    this._hiss(cap - have);
    this.tweens.add({
      targets: b.c, x: at.x, y: at.y, duration: this.reducedMotion ? 0 : 420, ease: "Sine.easeInOut",
      onComplete: () => this.tweens.addCounter({
        from: 0, to: 1, duration: this.reducedMotion ? 0 : 500 + (cap - have) * 2.2,
        onUpdate: (tw) => {
          const k = tw.getValue();
          this._ml[i] = start + (cap - start) * k;
          const g = this._stream.clear(), sp = L.tap.spout;
          g.lineStyle(Math.max(1.5, 3.4 * u), WATER, 0.6).lineBetween(sp.x, sp.y + 6 * u, sp.x, b.c.y + this._surfaceY(b));
          g.lineStyle(Math.max(0.6, 1 * u), 0xffffff, 0.45).lineBetween(sp.x - 0.8 * u, sp.y + 6 * u, sp.x - 0.8 * u, b.c.y + this._surfaceY(b));
        },
        onComplete: () => {
          this._ml[i] = cap;
          this._stream.clear();
          this.tweens.add({
            targets: b.c, x: b.home.x, y: b.home.y, duration: this.reducedMotion ? 0 : 420, ease: "Sine.easeInOut",
            onComplete: () => { this._busy = false; this._held = null; this._pendingContents = null; },
          });
        },
      }),
    });
  }

  // empty the bottle held into the sink
  _sink() {
    const i = this._held;
    if (this._busy || i === null) return;
    if (!this._ml[i]) { this._lift(i, false); return; }
    const L = this._L, u = L.u, s = L.sink, start = this._ml[i];
    const drain = s.drain ?? { x: (s.x0 + s.x1) / 2, y: L.counter + 40 * u };
    const at = { x: drain.x + 30 * u, y: L.counter - 110 * u };
    this._glug(start);
    this._pendingContents = { bottles: this._ml.map((amount, j) => j === i ? 0 : amount) };
    this._carryAndTip(i, at, -1.9, 300 + start * 1.6, (k) => {
      this._ml[i] = start * (1 - k);
      this._drawStream(this._vessels[i], drain, k);
    }, () => { this._ml[i] = 0; });
  }

  // anything but the line: the flask tipped away into the sink, and it stands empty
  _emptyFlask() {
    const F = this._vessels[2], L = this._L, u = L.u, s = L.sink, start = this._flaskMl;
    const drain = s.drain ?? { x: (s.x0 + s.x1) / 2, y: L.counter + 40 * u };
    const at = { x: drain.x + 70 * u, y: L.counter - 150 * u };
    this._glug(start);
    // the flask is no bottle: carried by hand the same way
    this._held = null;
    this._pendingContents = { flask: 0 };
    this._carryAndTip(2, at, -2.0, 300 + start * 1.6, (k) => {
      this._flaskMl = start * (1 - k);
      this._drawStream(F, drain, k);
    }, () => { this._flaskMl = 0; });
  }

  // At the line, one continuous burn reveals the word behind its front.
  _turn({ sound = true } = {}) {
    if (this.reducedMotion) {
      this._turned = 1; this._burnEndsAt = null; this._paintLitmus(); return;
    }
    if (sound) noiseBurst(this, { dur: .65, type: "highpass", freq: 1700, q: .5, gain: .1, env: x => (1 - x) ** 2 * (.45 + .55 * Math.abs(Math.sin(x * 93))) });
    this.tweens.addCounter({
      from: this._turned, to: 1, duration: BURN_MS * (1 - this._turned), ease: "Linear",
      onUpdate: (tw) => { this._turned = tw.getValue(); this._paintLitmus(); },
      onComplete: () => { this._turned = 1; this._burnEndsAt = this.time.now; this._paintLitmus(); },
    });
  }

  _paintLitmus() {
    const F = this._vessels?.[2];
    if (!F?.litmus) return;
    const texture = this.textures.exists("ms_litmus") ? this.textures.get("ms_litmus") : null;
    const { canvas, w, h } = paintLitmus(this._L, this._turned, texture?.getSourceImage());
    if (texture) texture.refresh();
    else addCanvasTexture(this.textures, "ms_litmus", canvas);
    F.litmus.setTexture("ms_litmus").setDisplaySize(w, h);
  }

  _makeBurn() {
    const F = this._vessels[2];
    this._burnGlow = this.add.image(0, 0, KEYS.glow).setTint(0xff983c).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this._burnFlame = this.add.image(0, 0, KEYS.flame).setOrigin(.5, .94).setVisible(false);
    this._burnSmoke = this.add.graphics();
    F.c.add([this._burnGlow, this._burnSmoke, this._burnFlame]);
  }

  _updateBurn(time) {
    const F = this._vessels[2], u = this._L.u;
    const burning = this._atLine && this._turned > 0 && this._turned < 1 && !this.reducedMotion;
    const tail = this._burnEndsAt === null ? 0 : Math.max(0, 1 - (time - this._burnEndsAt) / 380);
    const strength = this.reducedMotion ? 0 : burning ? 1 : tail;
    this._burnFlame.setVisible(strength > 0); this._burnGlow.setVisible(strength > 0);
    this._burnSmoke.clear();
    if (!strength) return;
    const x = F.litmus.x, y = F.litmus.y + F.litmus.displayHeight * this._turned;
    const flicker = Math.sin(time * .021) * .12 + Math.sin(time * .037 + .8) * .07;
    this._burnFlame.setPosition(x + Math.sin(time * .013) * u, y + u)
      .setDisplaySize((19 + flicker * 8) * u, (37 + flicker * 19) * u)
      .setAngle(Math.sin(time * .015) * 5).setAlpha(strength * .94);
    this._burnGlow.setPosition(x, y - 7 * u).setDisplaySize(79 * u, 104 * u).setAlpha((.21 + flicker * .15) * strength);
    if (!this.ambientEffects) return;
    for (let strand = 0; strand < 3; strand++) {
      const offset = (time / 1100 + strand / 3) % 1;
      for (let step = 1; step <= 9; step++) {
        const a = (step - 1) / 9, b = step / 9;
        const point = t => ({
          x: x + Math.sin(t * 5 + time * .0014 + strand) * (2 + t * 7) * u,
          y: y - (22 + (t + offset) * 42) * u,
        });
        const p = point(a), q = point(b);
        this._burnSmoke.lineStyle((1 + b * 2) * u, 0xaaa498, (1 - b) * .11 * strength)
          .lineBetween(p.x, p.y, q.x, q.y);
      }
    }
  }

  // ── the water ──────────────────────────────────────────────────────────────

  // how full a vessel is, 0 to 1
  _frac(b) {
    return b.v.kind === "flask" ? this._flaskMl / b.v.cap : this._ml[b.i] / BOTTLES[b.i];
  }

  // where its surface stands below its middle (upright), for the stream to meet
  _surfaceY(b) {
    const w = waterIn(b.v, this._frac(b), 0);
    return w?.surface ? w.surface[0].y : b.v.bottom - 4;
  }

  update(time) {
    if (!this._built) return;
    const u = this._L.u;
    this._drawBottles();
    for (const b of this._vessels) {
      // what the hand finds it by, kept to where it is
      b.hit.setPosition(b.c.x, b.c.y + (b.v.top + b.v.bottom) / 2);
      if (b.v.kind === "bottle" && this._stage) continue;
      const lift = Math.max(0, b.home.y - b.c.y);
      b.shadow.setX(b.c.x).setAlpha(.6 * Math.max(0, 1 - lift / (240 * u)));
      const g = b.water.clear(), w = waterIn(b.v, this._frac(b), b.angle);
      if (!w) continue;
      g.fillStyle(0x668d96, 0.24);
      g.fillPoints(w.poly.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
      const depth = waterIn(b.v, this._frac(b) * .68, b.angle);
      if (depth) g.fillStyle(0x2c5261, .1).fillPoints(depth.poly, true);
      if (w.surface) {
        // the meniscus: a bright line where the water meets the air
        const [p, q] = w.surface;
        g.lineStyle(Math.max(.75, 1.2 * u), 0xe8f6ff, 0.6).lineBetween(p.x, p.y, q.x, q.y);
        g.lineStyle(Math.max(1, 2.4 * u), WATER, 0.22).lineBetween(p.x, p.y + 2 * u, q.x, q.y + 2 * u);
      }
    }
    this._updateBurn(time);
  }

  // the bottles, in three dimensions, as they stand now — drawn again only
  // when one of them has moved, tipped, or filled
  _drawBottles() {
    const stage = this._stage;
    if (!stage) return;
    const now = this._vessels.filter((b) => b.v.kind === "bottle")
      .map((b) => ({ x: b.c.x, y: b.c.y, angle: b.angle, frac: this._frac(b) }));
    const key = now.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.angle.toFixed(3)},${p.frac.toFixed(4)}`).join("|");
    if (key === this._drawn) return;
    this._drawn = key;
    now.forEach((p, i) => stage.setBottle(i, p));
    stage.render();
    this._stageTexture.source[0].update();
  }

  // ── sounds ─────────────────────────────────────────────────────────────────

  _glug(ml) {
    const dur = (300 + ml * 2.4) / 1000;
    noiseBurst(this, { dur, type: "lowpass", freq: 700, q: 1.2, gain: 0.32, env: (x) => Math.min(1, x / 0.08) * (1 - x) ** 0.6 * (0.55 + 0.45 * Math.abs(Math.sin(x * 40))) });
  }

  _hiss(ml) {
    const dur = (500 + ml * 2.2) / 1000;
    noiseBurst(this, { dur, type: "bandpass", freq: 1500, q: 0.6, gain: 0.22, env: (x) => Math.min(1, x / 0.05) * (1 - x * 0.4) * (x > 0.95 ? (1 - x) * 20 : 1) });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.clearSceneTimeout(this._drainTimer); this._drainTimer = null;
    this.tweens.killAll();
    // A resize lands the current pour at its exact final volume. Fractional
    // animation frames must never become the player's new measurements.
    if (this._pendingContents) {
      const { bottles, flask, atLine } = this._pendingContents;
      if (bottles) this._ml = bottles;
      if (flask !== undefined) this._flaskMl = flask;
      if (atLine !== undefined) this._atLine = atLine;
      this._pendingContents = null;
    }
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseSink(this.textures);
    if (this.textures.exists("ms_litmus")) this.textures.remove("ms_litmus");
    if (this.textures.exists(STAGE)) this.textures.remove(STAGE);
  }

  shutdown() {
    if (this.textures.exists(STAGE)) this.textures.remove(STAGE);
    this._built = false;
    this.clearSceneTimeout(this._drainTimer); this._drainTimer = null;
    this.tweens.killAll();
    releaseSink(this.textures);
    if (this.textures.exists("ms_litmus")) this.textures.remove("ms_litmus");
  }
}
