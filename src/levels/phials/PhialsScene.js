import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import { RACK } from "./puzzle.js";
import PHIALS from "./phialsLevel.json";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "TWO PHIALS"  ·  code: GREEN  ·  at Silas's sinks
//
// In his laboratory (Room VII), at the end of the counter by the sinks: a
// little walnut rack, a phial of yellow, an empty tube, a phial of blue; and
// tied to its post a paper tag, in his hand — "For my sister."
//
// A click lifts a tube out of the rack and holds it up to the light; another
// puts it back. They are never mixed here: the empty tube waits for it.
//
//   yellow + blue  →  GREEN — Ivy's colour, the colour of growing things
//
// Nothing on screen says what to do with the colours.
//
// The counter is a Blender render — Room VII's own scene seen close
// (art/blender/room_lab.py --view phials): the rack standing empty, and the
// three tubes (clear glass) and the rack's upper board cut apart, so a tube
// can come up out of the rack and the board stands in front of those in it.
// ─────────────────────────────────────────────────────────────────────────────

const LIFT = 0.42; // seconds for a tube to come up out of the rack, or go back
const CLEAR = 0.68; // how far up a tube's foot is clear of the board (of its lift)
const PLATE = `phials_plate_v${PHIALS.version}`;
const PIECES = `phials_pieces_v${PHIALS.version}`;

export default class PhialsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Phials" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    const url = (what) => `assets/images/Phials/phials-${what}-v${PHIALS.version}.webp`;
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, url("plate"));
    if (!this.textures.exists(PIECES)) this.load.image(PIECES, url("pieces"));
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#06070a");
    if (this.textures.exists(PIECES)) {
      const atlas = this.textures.get(PIECES);
      PHIALS.tubes.forEach((t, i) => { if (!atlas.has(`tube-${i}`)) atlas.add(`tube-${i}`, 0, ...t.frame); });
      if (!atlas.has("board")) atlas.add("board", 0, ...PHIALS.board.frame);
    }
    // which tubes are held up survives a resize
    this._up = new Set();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const f = (this._f = fitRender(W, H, PHIALS));
    if (this.textures.exists(PLATE)) {
      this.add.image(f.x, f.y, PLATE).setOrigin(0, 0).setDisplaySize(PHIALS.width * f.s, PHIALS.height * f.s).setDepth(-10);
    }
    if (!this.textures.exists(PIECES)) return;
    this._tubes = PHIALS.tubes.map((t, i) => {
      const [bx, by, bw, bh] = t.box, [fx, fy] = t.foot;
      const home = f.at(t.foot);
      // (held by its foot, as it stands in the rack)
      const img = this.add.image(home.x, home.y, PIECES, `tube-${i}`).setOrigin((fx - bx) / bw, (fy - by) / bh)
        .setDisplaySize(bw * f.s, bh * f.s).setDepth(3)
        .setInteractive({ useHandCursor: true, pixelPerfect: false })
        .setName(`phials-tube-${RACK[i].id}`)
        .setData("interactionLabel", RACK[i].liquid ? "Hold it up to the light" : "Look at the empty tube");
      const tube = { i, img, home, lift: { x: t.lift[0] * f.s, y: t.lift[1] * f.s }, k: this._up.has(i) ? 1 : 0 };
      img.on("pointerdown", () => this._lift(tube));
      return tube;
    });
    // the rack's upper board, over the tubes standing in it, so they stand through it
    const b = PHIALS.board.box, at = f.at([b[0], b[1]]);
    this._bar = this.add.image(at.x, at.y, PIECES, "board").setOrigin(0, 0).setDisplaySize(b[2] * f.s, b[3] * f.s).setDepth(4);
    this._built = true;
    this._place();
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
  // to the light, swaying very slightly as a held thing does
  _place(t = 0) {
    for (const tube of this._tubes ?? []) {
      const k = tube.k ?? 0;
      const clear = Math.max(0, (k - CLEAR) / (1 - CLEAR));
      const sway = this.reducedMotion ? 0 : Math.sin(t * 1.3 + tube.i * 2) * 0.008 * clear;
      tube.img.setPosition(tube.home.x + tube.lift.x * k, tube.home.y + tube.lift.y * k)
        .setRotation(clear * 0.035 * (tube.i - 1 || 1) + sway)
        .setDepth(k > CLEAR ? 5 : 3);
    }
  }

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    for (const obj of this.children.list.slice()) obj.destroy();
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
  }
}
