import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst } from "../../shared/paint.js";
import { KEYS, layoutPhials, paintPhials, releasePhials, tubeBox } from "./art.js";
import { alignPhialsPhotography, loadPhialsPhotography } from "./photography.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "TWO PHIALS"  ·  code: GREEN  ·  at Silas's sinks
//
// In his laboratory (Room VII), at the end of the counter by the sinks: a
// little walnut rack, a phial of yellow, an empty tube, a phial of blue; and
// tied to its post a paper tag, in his hand — "For my sister."
//
// A click lifts a tube out of the rack and holds it up to the moon; another
// puts it back. They are never mixed here: the empty tube waits for it.
//
//   yellow + blue  →  GREEN — Ivy's colour, the colour of growing things
//
// Nothing on screen says what to do with the colours.
// ─────────────────────────────────────────────────────────────────────────────

const LIFT = 0.42; // seconds for a tube to come up out of the rack, or go back

export default class PhialsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Phials" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    loadPhialsPhotography(this);
  }

  create() {
    this.beginScene();
    // which tubes are held up survives a resize
    this._up = new Set();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const L = (this._L = layoutPhials(W, H));
    alignPhialsPhotography(this, L);
    paintPhials(this, L);
    this.add.image(0, 0, KEYS.room).setOrigin(0, 0).setDepth(-10);
    const { w: tw, h: th } = tubeBox(L);
    this._tubes = L.tubes.map((t) => {
      const img = this.add.image(t.home.x, t.home.y, KEYS.tube(t.i)).setDisplaySize(tw, th).setOrigin(0.5, 1).setDepth(3)
        .setInteractive({ useHandCursor: true })
        .setName(`phials-tube-${t.id}`)
        .setData("interactionLabel", t.liquid ? "Hold it up to the light" : "Look at the empty tube");
      const tube = { ...t, img, k: this._up.has(t.i) ? 1 : 0 };
      img.on("pointerdown", () => this._lift(tube));
      return tube;
    });
    // the rack's upper bar, over the tubes standing in it, so they stand through it
    if (L.photographic) this._bar = this.add.image(0, 0, KEYS.front).setOrigin(0, 0).setDepth(4);
    else {
      this._bar = this.add.graphics().setDepth(4);
      this._paintBar();
    }
    this._built = true;
    this._place();
  }

  // the bar the tubes stand through, laid over them where they pass it
  _paintBar() {
    const L = this._L, { u } = L, r = L.rack, g = this._bar.clear();
    const y = L.barY;
    g.fillStyle(0x4a2c14, 1).fillRect(r.x - r.w / 2 + 4 * u, y + 6 * u, r.w - 8 * u, 14 * u);
    g.fillStyle(0xffdcaa, 0.12).fillRect(r.x - r.w / 2 + 4 * u, y + 6 * u, r.w - 8 * u, 1.5 * u);
    g.fillStyle(0x000000, 0.35).fillRect(r.x - r.w / 2 + 4 * u, y + 18 * u, r.w - 8 * u, 2 * u);
  }

  // a tube clicked: up out of the rack, or back into it
  _lift(tube) {
    if (this._up.has(tube.i)) this._up.delete(tube.i);
    else this._up.add(tube.i);
    tube.from = tube.k;
    tube.t = this.reducedMotion ? 1 : 0;
    // glass, against the wood of the rack
    noiseBurst(this, { dur: 0.07, type: "bandpass", freq: 3400, q: 3, gain: 0.18, env: (x) => (1 - x) ** 4 });
  }

  update(time, delta) {
    if (!this._built) return;
    const dt = Math.min(delta || 16, 50) / 1000;
    for (const tube of this._tubes) {
      const goal = this._up.has(tube.i) ? 1 : 0;
      if (tube.t !== undefined && tube.t < 1) {
        tube.t = Math.min(1, tube.t + dt / LIFT);
        const e = tube.t < 0.5 ? 4 * tube.t ** 3 : 1 - (-2 * tube.t + 2) ** 3 / 2;
        tube.k = tube.from + (goal - tube.from) * e;
      } else tube.k = goal;
    }
    this._place(time / 1000);
  }

  // where each tube is: in the rack, or lifted clear of it and turned a little
  // to the moon, swaying very slightly as a held thing does
  _place(t = 0) {
    const L = this._L, { u } = L;
    for (const tube of this._tubes) {
      const k = tube.k ?? 0;
      const clear = Math.max(0, (k - L.clearAt) / (1 - L.clearAt));
      const sway = this.reducedMotion ? 0 : Math.sin(t * 1.3 + tube.i * 2) * 0.008 * clear;
      tube.img.setPosition(tube.home.x + clear * 6 * u, tube.home.y - k * L.lift)
        .setRotation(clear * 0.035 * (tube.i - 1 || 1) + sway)
        .setDepth(k > L.clearAt ? 5 : 3);
    }
  }

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    for (const obj of this.children.list.slice()) obj.destroy();
    releasePhials(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    releasePhials(this.textures);
  }
}
