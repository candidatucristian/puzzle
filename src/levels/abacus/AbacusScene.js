import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { noiseBurst } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import FRAME from "./countingFrame.json";
import { START, PLACES } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "THE COUNTING FRAME"  ·  code: 5936  ·  Room XI, Orion's study
//
// On his workbench, under the green lamp, an old frame that looks like an
// abacus: five ebony rods, two brass wires across them, and on the wires in
// each of the four spaces two black blocks, each against the left rod, in the
// middle or against the right. It has lain there for years and the board is
// grey with dust — except where each block stood all that time, a clean
// place its own size. The blocks have been knocked out of place since.
//
// Put every block back on its clean place and the white the blocks leave
// between the rods reads 5936: the blocks are the holes in the figures, not
// the figures (puzzle.js). The game never says so.
//
// The frame is a Blender render (art/blender/counting_frame.py): the plate
// without its blocks, and every block at each of its places cut out with its
// own shadow into one atlas. A block is dragged along its wire, or clicked
// along it a place at a time, and settles on the nearest place.
// ─────────────────────────────────────────────────────────────────────────────

const PLATE = `abacus_plate_v${FRAME.version}`;
const BLOCKS = `abacus_blocks_v${FRAME.version}`;
const SLIDE = 210; // ms a block takes from one place to the next
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default class AbacusScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Abacus" });
  }

  init(data) {
    this.skipFadeIn = data?.skipFade ?? true;
  }

  preload() {
    const url = (what) => `assets/images/Abacus/counting-frame-${what}-v${FRAME.version}.webp`;
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, url("plate"));
    if (!this.textures.exists(BLOCKS)) this.load.image(BLOCKS, url("blocks"));
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#0a0806");
    // where each block is, 0 to 2 (between, while it moves), and which way a
    // click sends it next; both survive a resize, a new visit starts afresh
    this._at = FRAME.blocks.map((b) => START[b.space][b.row]);
    this._heading = this._at.map((at) => (at >= PLACES - 1 ? -1 : 1));
    this._slides = [];
    this._sparkles = [];
    this._frames();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // every block at each of its places: a frame of the atlas
  _frames() {
    if (!this.textures.exists(BLOCKS)) return;
    const atlas = this.textures.get(BLOCKS);
    FRAME.blocks.forEach((block, i) => block.places.forEach((at, k) => {
      if (!atlas.has(`${i}-${k}`)) atlas.add(`${i}-${k}`, 0, ...at.frame);
    }));
  }

  _screen(p) {
    return this._f.at(p);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    // the render covers the screen, the whole frame kept in view
    const f = (this._f = fitRender(W, H, FRAME));
    if (this.textures.exists(PLATE)) {
      this.add.image(f.x, f.y, PLATE).setOrigin(0, 0).setDisplaySize(FRAME.width * f.s, FRAME.height * f.s).setDepth(0);
    }
    this._blocks = [];
    if (!this.textures.exists(BLOCKS)) return;
    FRAME.blocks.forEach((block, i) => {
      const image = this.add.image(0, 0, BLOCKS, `${i}-0`).setOrigin(0, 0).setDepth(2);
      // what is taken hold of: the block's top, where it is
      const xs = block.places[1].top.map(([x]) => x), ys = block.places[1].top.map(([, y]) => y);
      const w = (Math.max(...xs) - Math.min(...xs) + 6) * f.s, h = (Math.max(...ys) - Math.min(...ys) + 6) * f.s;
      const zone = this.add.zone(0, 0, w, h).setDepth(5)
        .setInteractive({ useHandCursor: true, draggable: true })
        .setData("interactionLabel", "Slide the block");
      this._blocks[i] = { block, image, zone };
      this._hold(i);
      this._place(i);
    });
    // what can be moved glints until it has been put right
    const tops = FRAME.blocks.flatMap((block) => block.places.flatMap((at) => at.top)).map((p) => this._screen(p));
    const box = { x: Math.min(...tops.map((p) => p.x)), y: Math.min(...tops.map((p) => p.y)) };
    box.width = Math.max(...tops.map((p) => p.x)) - box.x;
    box.height = Math.max(...tops.map((p) => p.y)) - box.y;
    const levels = this.services.levels;
    this._sparkles.push(attachMovableSparkles(this, this._blocks[0].zone, {
      bounds: () => box,
      enabled: () => !levels?.isCompleted?.(levels.indexOf("abacus")),
      padding: 6,
    }));
  }

  // A block taken hold of follows the pointer along its wire; let go, it
  // settles on the nearest place. A click without a drag moves it on a place,
  // to the far rod and back.
  _hold(i) {
    const { block, zone } = this._blocks[i];
    zone.on("dragstart", (pointer) => {
      this._slides[i]?.stop();
      this._grab = { i, from: this._at[i], x: pointer.x, y: pointer.y, moved: false };
    });
    zone.on("drag", (pointer) => {
      const g = this._grab;
      if (!g || g.i !== i) return;
      if (!g.moved && Math.hypot(pointer.x - g.x, pointer.y - g.y) < 5) return;
      g.moved = true;
      // how far along the wire the pointer has gone, in places
      const a = this._screen(block.places[0].centre), b = this._screen(block.places[PLACES - 1].centre);
      const ax = b.x - a.x, ay = b.y - a.y;
      const t = (((pointer.x - g.x) * ax + (pointer.y - g.y) * ay) / (ax * ax + ay * ay)) * (PLACES - 1);
      this._at[i] = clamp(g.from + t, 0, PLACES - 1);
      this._place(i);
    });
    zone.on("dragend", () => {
      const g = this._grab;
      this._grab = null;
      if (!g || g.i !== i) return;
      let to;
      if (g.moved) to = Math.round(this._at[i]);
      else {
        const here = Math.round(this._at[i]);
        if (here + this._heading[i] < 0 || here + this._heading[i] > PLACES - 1) this._heading[i] *= -1;
        to = here + this._heading[i];
      }
      if (to === 0) this._heading[i] = 1;
      if (to === PLACES - 1) this._heading[i] = -1;
      this._slide(i, to);
    });
  }

  _slide(i, to) {
    const from = this._at[i];
    const settle = () => {
      this._at[i] = to;
      this._place(i);
      if (Math.abs(to - from) > 0.04) this._tock();
    };
    if (this.reducedMotion) return settle();
    this._slides[i] = this.tweens.addCounter({
      from, to,
      duration: SLIDE * clamp(Math.abs(to - from), 0.45, PLACES - 1),
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        this._at[i] = tween.getValue();
        this._place(i);
      },
      onComplete: settle,
    });
  }

  // a block where it is: the render of it at its nearest place, carried along
  // the wire by however far it is from there
  _place(i) {
    const { block, image, zone } = this._blocks[i];
    const at = this._at[i], k = Math.round(at);
    const lo = Math.floor(at), hi = Math.min(PLACES - 1, lo + 1), t = at - lo;
    const c0 = block.places[lo].centre, c1 = block.places[hi].centre;
    const here = [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t];
    const own = block.places[k];
    const dx = here[0] - own.centre[0], dy = here[1] - own.centre[1];
    const p = this._screen([own.box[0] + dx, own.box[1] + dy]);
    image.setFrame(`${i}-${k}`).setPosition(p.x, p.y).setDisplaySize(own.box[2] * this._f.s, own.box[3] * this._f.s);
    const c = this._screen(here);
    zone.setPosition(c.x, c.y);
  }

  // the block coming to rest against its stop on the wire
  _tock() {
    noiseBurst(this, { dur: 0.05, type: "bandpass", freq: 1500, q: 3.2, gain: 0.32, env: (x) => (1 - x) ** 5 });
    noiseBurst(this, { dur: 0.08, type: "lowpass", freq: 520, q: 0.8, gain: 0.22, env: (x) => (1 - x) ** 3 });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._sparkles.forEach((off) => off());
    this._sparkles = [];
    this._grab = null;
    this.tweens.killAll();
    this._slides = [];
    // a block caught between places settles where it was going
    this._at = this._at.map((at) => Math.round(at));
    for (const obj of this.children.list.slice()) obj.destroy();
    this._blocks = [];
  }

  shutdown() {
    this._sparkles?.forEach((off) => off());
    this._sparkles = [];
    this.tweens.killAll();
    this._blocks = [];
  }
}
