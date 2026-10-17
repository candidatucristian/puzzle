import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { chime, noiseBurst } from "../../shared/paint.js";
import { KEYS, layoutBalance, paintBalance, releaseBalance, shown } from "./art.js";
import { beamAngle } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "BALANCE"  ·  code: SALT  ·  the apothecary's balance
//
// In Silas's weighing room (Room VIII): his apothecary's balance on the desk
// under the lamp, the box of brass weights open beside it — 20, 10, 10, 5,
// 2, 2 and 1 g — and four stoppered phials in a row, numbered I to IV on
// their labels. A click puts a phial on the left pan (one at a time), a
// weight on the right; a click on either takes it back. The beam leans to
// the heavier side and, when the two are equal, comes level, its pointer on
// the scale's zero.
//
//   I 19 g · II 1 g · III 12 g · IV 20 g   →   as letters:  S A L T
//
// Nothing on screen says what to do with the grams.
// ─────────────────────────────────────────────────────────────────────────────

const FLY = 0.38; // seconds for a thing to be carried between its place and the pan

export default class BalanceScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Balance" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    // what is on the pans survives a resize
    this._onLeft = null; // the phial on the left pan, or null
    this._onRight = new Set(); // the weights on the right pan, by index
    this._angle = 0;
    this._speed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const L = (this._L = layoutBalance(W, H));
    paintBalance(this, L);
    this.add.image(0, 0, KEYS.room).setOrigin(0, 0).setDepth(-10);
    const { u } = L;
    const size = (key) => shown(this, key);
    // the beam about its pivot, the chains, the pans and their shadows
    const bs = size(KEYS.beam);
    this._beam = this.add.image(L.pivot.x, L.pivot.y, KEYS.beam).setDisplaySize(bs.w, bs.h).setOrigin(0.5, (20 * u) / bs.h).setDepth(4);
    this._chains = this.add.graphics().setDepth(4.5);
    this._shadows = this.add.graphics().setDepth(-5);
    const ps = size(KEYS.pan);
    this._pans = [-1, 1].map(() => this.add.image(0, 0, KEYS.pan).setDisplaySize(ps.w, ps.h).setOrigin(0.5, (12 * u) / ps.h).setDepth(5));
    // the things that can be put on the pans: each at its place, or on a pan
    const thing = (key, at, kind, i) => {
      const s = size(key);
      const img = this.add.image(at.x, at.y, key).setDisplaySize(s.w, s.h).setOrigin(0.5, 1).setDepth(6)
        .setInteractive({ useHandCursor: true })
        .setData("interactionLabel", kind === "phial" ? "Weigh the phial" : "Put the weight on");
      const t = { img, kind, i, home: at, w: s.w, h: s.h, from: null, t: 1, pos: { ...at } };
      img.on("pointerdown", () => this._take(t));
      return t;
    };
    this._phials = L.phials.map((p) => thing(KEYS.phial(p.i), p.home, "phial", p.i));
    this._weights = L.weights.map((w) => thing(KEYS.weight(w.grams), w.home, "weight", w.i));
    this._built = true;
    this._place(true);
  }

  // ── what is on the pans ────────────────────────────────────────────────────

  // a phial or a weight clicked: onto its pan, or back to its place
  _take(t) {
    if (t.kind === "phial") {
      if (this._onLeft === t.i) this._onLeft = null;
      else {
        if (this._onLeft !== null) this._carry(this._phials[this._onLeft]);
        this._onLeft = t.i;
      }
    } else if (this._onRight.has(t.i)) this._onRight.delete(t.i);
    else this._onRight.add(t.i);
    this._carry(t);
    this._clink(t);
  }

  // set a thing moving from where it is to where it now belongs
  _carry(t) {
    t.from = { ...t.pos };
    t.t = this.reducedMotion ? 1 : 0;
  }

  _grams(side) {
    const L = this._L;
    if (side < 0) return this._onLeft === null ? 0 : L.phials[this._onLeft].grams;
    let g = 0;
    for (const i of this._onRight) g += L.weights[i].grams;
    return g;
  }

  // where a pan is: hung from its hook, the hook where the beam's end has gone
  _panAt(side) {
    const L = this._L, a = this._angle;
    const hx = L.pivot.x + side * L.arm * Math.cos(a), hy = L.pivot.y + side * L.arm * Math.sin(a);
    return { hook: { x: hx, y: hy }, x: hx, y: hy + L.chain };
  }

  // where a thing stands on its pan (the weights side by side, the heaviest
  // in the middle), or its own place
  _target(t) {
    const L = this._L, u = L.u;
    if (t.kind === "phial" && this._onLeft === t.i) {
      const p = this._panAt(-1);
      return { x: p.x, y: p.y + 4 * u };
    }
    if (t.kind === "weight" && this._onRight.has(t.i)) {
      const p = this._panAt(1);
      const on = [...this._onRight].sort((a, b) => L.weights[b].grams - L.weights[a].grams);
      const k = on.indexOf(t.i), n = on.length;
      const order = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2);
      const spread = Math.min(15 * u, (L.panR * 1.5) / Math.max(1, n));
      return { x: p.x + order * spread, y: p.y + 4 * u + (n > 3 && k % 2 ? -3 * u : 0) };
    }
    return t.home;
  }

  // ── what moves ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._built) return;
    const dt = Math.min(delta || 16, 50) / 1000;
    // the beam: a damped swing toward where the weights put it
    const goal = beamAngle(this._grams(-1), this._grams(1));
    if (this.reducedMotion) { this._angle = goal; this._speed = 0; }
    else {
      this._speed += ((goal - this._angle) * 38 - this._speed * 5.2) * dt;
      this._angle += this._speed * dt;
    }
    this._place(false, dt);
  }

  _place(now, dt = 0) {
    const L = this._L, u = L.u;
    this._beam.setRotation(this._angle);
    const c = this._chains.clear(), sh = this._shadows.clear();
    [-1, 1].forEach((side, k) => {
      const p = this._panAt(side);
      this._pans[k].setPosition(p.x, p.y);
      // three chains from the hook to the rim: two seen at its edges, one in front
      for (const [dx, dy, a] of [[-L.panR + 4 * u, 0, 0.75], [L.panR - 4 * u, 0, 0.75], [0, 7 * u, 0.55]]) {
        c.lineStyle(Math.max(1, 1.1 * u), 0x7a5a20, a).lineBetween(p.hook.x, p.hook.y + 4 * u, p.x + dx, p.y + dy);
        c.lineStyle(Math.max(0.5, 0.4 * u), 0xf2dc9c, a * 0.5).lineBetween(p.hook.x - 0.5, p.hook.y + 4 * u, p.x + dx - 0.5, p.y + dy);
      }
      // its shadow on the desk, softer the higher it hangs
      const rise = Math.max(0, L.deskY + 40 * u - p.y);
      sh.fillStyle(0x000000, Math.max(0.12, 0.42 - rise / (600 * u)));
      sh.fillEllipse(p.x + 14 * u, L.deskY + 44 * u, L.panR * 2 * (1 + rise / (500 * u)), 16 * u);
    });
    for (const t of [...this._phials, ...this._weights]) {
      const goal = this._target(t);
      if (t.t < 1 && !now) {
        t.t = Math.min(1, t.t + dt / FLY);
        const e = 1 - (1 - t.t) ** 3, lift = Math.sin(Math.PI * t.t) * 46 * u;
        t.pos = { x: t.from.x + (goal.x - t.from.x) * e, y: t.from.y + (goal.y - t.from.y) * e - lift };
      } else t.pos = { ...goal };
      const onPan = (t.kind === "phial" && this._onLeft === t.i) || (t.kind === "weight" && this._onRight.has(t.i));
      t.img.setPosition(t.pos.x, t.pos.y).setDepth(onPan ? 5.5 + (t.pos.y / L.H) * 0.1 : 6 + (t.pos.y / L.H) * 0.1);
    }
  }

  // the sound of it set down: glass on brass, or brass on brass
  _clink(t) {
    if (t.kind === "weight") {
      const f = 2400 + 900 / Math.cbrt(this._L.weights[t.i].grams);
      this.time.delayedCall(FLY * 900, () => chime(this, [[f, 0.012], [f * 2.7, 0.004]], 0.35));
    } else {
      this.time.delayedCall(FLY * 900, () => noiseBurst(this, { dur: 0.08, type: "bandpass", freq: 3200, q: 3, gain: 0.25, env: (x) => (1 - x) ** 4 }));
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseBalance(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    releaseBalance(this.textures);
  }
}
