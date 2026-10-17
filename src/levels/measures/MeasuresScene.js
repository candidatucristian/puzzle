import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst, addCanvasTexture } from "../../shared/paint.js";
import { KEYS, glassBox, layoutSink, paintLitmus, paintSink, releaseSink, waterIn } from "./art.js";
import { BOTTLES, pour, toTheLine } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "MEASURES"  ·  code: ACID  ·  to the line
//
// By the sink in Silas's weighing room (Room VIII): a bottle that holds
// 500 ml and one that holds 300 ml, nothing marked on them but that; and a
// volumetric flask, 400 ml etched on its bulb and one ring round its neck,
// a strip of blue litmus hung in it. A click takes up a bottle; then the
// tap fills it, the sink empties it, the other bottle takes what it can of
// it, and the flask takes all of it. Exactly 400 ml into the flask in one
// pour stands at its ring — the litmus turns red, and on it, paler: ACID.
// Anything else is tipped away into the sink, and the flask stands empty.
//
// The water is level in a tilted bottle and keeps its volume (art.js
// waterIn). Nothing on screen says what to measure.
// ─────────────────────────────────────────────────────────────────────────────

const WATER = 0x9fc4d4;

export default class MeasuresScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Measures" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    // what is in each bottle, in the flask, and whether it has stood at its ring
    this._ml = [0, 0];
    this._flaskMl = 0;
    this._turned = 0;
    this._atLine = false;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const L = (this._L = layoutSink(W, H));
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
      const hit = this.add.zone(v.x, v.y + (v.top + v.bottom) / 2, box.w, v.bottom - v.top + 10 * u).setDepth(9)
        .setInteractive({ useHandCursor: true }).setData("interactionLabel", v.kind === "flask" ? "Pour into the flask" : "Take up the bottle");
      hit.on("pointerdown", () => this._click(i));
      return { v, i, c, water, litmus, hit, home: { x: v.x, y: v.y }, angle: 0 };
    });
    this._paintLitmus();
    // the tap and the sink
    const t = L.tap;
    this.add.zone(t.x - 20 * u, t.spout.y + 40 * u, 90 * u, 220 * u).setDepth(9).setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Fill it at the tap").on("pointerdown", () => this._tap());
    const s = L.sink;
    this.add.zone((s.x0 + s.x1) / 2, L.counter + 40 * u, s.x1 - s.x0, 80 * u).setDepth(9).setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Empty it into the sink").on("pointerdown", () => this._sink());
    this._built = true;
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
    this.tweens.add({ targets: b.c, y: b.home.y - (up ? 18 * this._L.u : 0), duration: 220, ease: "Cubic.easeOut" });
    noiseBurst(this, { dur: 0.06, type: "bandpass", freq: up ? 2600 : 1800, q: 3, gain: 0.12, env: (x) => (1 - x) ** 3 });
  }

  // carry bottle `i` to (x, y), tip it to `angle` while `during(k)` runs
  // (k from 0 to 1), tip it back and bring it home; then `done`
  _carryAndTip(i, to, angle, ms, during, done) {
    const b = this._vessels[i], fast = this.reducedMotion;
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
                onComplete: () => { this._busy = false; this._held = null; done?.(); },
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
      this.setSceneTimeout(() => this._emptyFlask(), 900);
    });
  }

  // fill the bottle held at the tap
  _tap() {
    const i = this._held;
    if (this._busy || i === null) return;
    const b = this._vessels[i], L = this._L, u = L.u, cap = BOTTLES[i], have = this._ml[i];
    if (have >= cap) return;
    const at = { x: L.tap.spout.x, y: L.counter - b.v.bottom - 6 * u };
    const start = have;
    this._busy = true;
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
            onComplete: () => { this._busy = false; this._held = null; },
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
    const drain = { x: (s.x0 + s.x1) / 2, y: L.counter + 40 * u };
    const at = { x: drain.x + 30 * u, y: L.counter - 110 * u };
    this._glug(start);
    this._carryAndTip(i, at, -1.9, 300 + start * 1.6, (k) => {
      this._ml[i] = start * (1 - k);
      this._drawStream(this._vessels[i], drain, k);
    }, () => { this._ml[i] = 0; });
  }

  // anything but the line: the flask tipped away into the sink, and it stands empty
  _emptyFlask() {
    const F = this._vessels[2], L = this._L, u = L.u, s = L.sink, start = this._flaskMl;
    const drain = { x: (s.x0 + s.x1) / 2, y: L.counter + 40 * u };
    const at = { x: drain.x + 70 * u, y: L.counter - 150 * u };
    this._glug(start);
    // the flask is no bottle: carried by hand the same way
    this._held = null;
    this._carryAndTip(2, at, -2.0, 300 + start * 1.6, (k) => {
      this._flaskMl = start * (1 - k);
      this._drawStream(F, drain, k);
    }, () => { this._flaskMl = 0; });
  }

  // at the line: the litmus turns, and the word comes up on it
  _turn() {
    this.tweens.addCounter({
      from: this._turned, to: 1, duration: this.reducedMotion ? 0 : 2400, ease: "Sine.easeInOut",
      onUpdate: (tw) => { this._turned = tw.getValue(); this._paintLitmus(); },
    });
  }

  _paintLitmus() {
    const F = this._vessels?.[2];
    if (!F?.litmus) return;
    const { canvas, w, h } = paintLitmus(this._L, this._turned);
    addCanvasTexture(this.textures, "ms_litmus", canvas);
    F.litmus.setTexture("ms_litmus").setDisplaySize(w, h);
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

  update() {
    if (!this._built) return;
    const u = this._L.u;
    for (const b of this._vessels) {
      const g = b.water.clear(), w = waterIn(b.v, this._frac(b), b.angle);
      if (!w) continue;
      g.fillStyle(WATER, 0.32);
      g.fillPoints(w.poly.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
      if (w.surface) {
        // the meniscus: a bright line where the water meets the air
        const [p, q] = w.surface;
        g.lineStyle(Math.max(1, 1.4 * u), 0xe8f6ff, 0.75).lineBetween(p.x, p.y, q.x, q.y);
        g.lineStyle(Math.max(1, 2.4 * u), WATER, 0.35).lineBetween(p.x, p.y + 2 * u, q.x, q.y + 2 * u);
      }
    }
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
    this.tweens.killAll();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseSink(this.textures);
    if (this.textures.exists("ms_litmus")) this.textures.remove("ms_litmus");
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    releaseSink(this.textures);
    if (this.textures.exists("ms_litmus")) this.textures.remove("ms_litmus");
  }
}
