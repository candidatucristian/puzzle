import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { glowCanvas, addCanvasTexture } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import TREE from "./treeLevel.json";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "PI"  ·  code: PI   ·  count the lamps
//
// Room V's far corner at night, close to: the Christmas tree in its tub, a
// string of small lamps along each of its nine tiers, and not every lamp
// alight. Tier by tier, top to bottom, the number that are is:
//
//   3 · 1 · 4 · 1 · 5 · 9 · 2 · 6 · 5
//
// The lamps that are alight stay alight, twinkling as old lamps do. Hover the
// moon in the window and a line is drawn straight across it. One parcel under
// the tree can be opened: a click, and out of it jump a rule, a protractor and
// a pair of compasses. Nothing on screen explains anything; the access code is
// the name of the number:  PI
//
// The corner is a Blender render — Room V's own scene seen close
// (art/blender/room_drawing.py --view tree): the plate, the lamps alight in
// it; the parcel opened and the instruments cut apart. Live over it: the
// lamps' twinkling, the moon's line, the parcel.
// ─────────────────────────────────────────────────────────────────────────────

const PLATE = `pi_tree_plate_v${TREE.version}`;
const PIECES = `pi_tree_pieces_v${TREE.version}`;
const GLOW = "pi_lamp_glow";

export default class TreeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Pi" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    const url = (what) => `assets/images/Pi/tree-${what}-v${TREE.version}.webp`;
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, url("plate"));
    if (!this.textures.exists(PIECES)) this.load.image(PIECES, url("pieces"));
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#050304");
    this._moonPinned = false;
    this._opened = false; // the parcel is still tied up
    if (this.textures.exists(PIECES)) {
      const atlas = this.textures.get(PIECES);
      if (!atlas.has("open")) atlas.add("open", 0, ...TREE.gift.frame);
      TREE.instruments.forEach((it, i) => { if (!atlas.has(`instrument-${i}`)) atlas.add(`instrument-${i}`, 0, ...it.frame); });
    }
    if (!this.textures.exists(GLOW)) addCanvasTexture(this.textures, GLOW, glowCanvas());
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const f = (this._f = fitRender(W, H, TREE));
    if (this.textures.exists(PLATE)) {
      this.add.image(f.x, f.y, PLATE).setOrigin(0, 0).setDisplaySize(TREE.width * f.s, TREE.height * f.s).setDepth(-16);
    }
    this._makeMoon(f);
    this._makeLamps(f);
    if (this.textures.exists(PIECES)) this._makeGift(f);
  }

  // ── the lamps ──────────────────────────────────────────────────────────────

  // Each lamp alight in the render has its light breathing over it here: it
  // never goes out — a quick dip and back, now and then, each in its own time.
  _makeLamps(f) {
    const rnd = this._rng(31415);
    for (const lampAt of TREE.lamps) {
      const at = f.at([lampAt.x, lampAt.y]);
      const size = lampAt.s * f.s * 7;
      const glow = this.add.image(at.x, at.y, GLOW).setDisplaySize(size, size)
        .setTint(0xffb860).setBlendMode(Phaser.BlendModes.ADD).setDepth(-8);
      const level = 0.42 + rnd() * 0.1;
      glow.setAlpha(level);
      this.ambientTween({
        targets: glow, alpha: { from: level, to: level * (0.15 + rnd() * 0.2) },
        duration: 110 + rnd() * 260, delay: rnd() * 2400, yoyo: true, repeat: -1,
        repeatDelay: 500 + rnd() * 2600, ease: "Sine.easeInOut",
      });
    }
  }

  // ── the parcel ─────────────────────────────────────────────────────────────

  // The parcel stands tied up until it is clicked. Then it is open, its lid
  // laid by, and what was in it jumps out — up, over, turning, and down onto
  // the boards beside it, one after another — and lies there.
  _makeGift(f) {
    const g = TREE.gift;
    const placed = (frame, box, depth) => {
      const at = f.at([box[0], box[1]]);
      return this.add.image(at.x, at.y, PIECES, frame).setOrigin(0, 0).setDisplaySize(box[2] * f.s, box[3] * f.s).setDepth(depth);
    };
    const land = (it, i, wait) => {
      // (held by its own middle: where it is in the air, where it comes to lie)
      const [bx, by, bw, bh] = it.box, [ax, ay] = it.at;
      const to = f.at(it.at);
      const thing = this.add.image(to.x, to.y, PIECES, `instrument-${i}`).setOrigin((ax - bx) / bw, (ay - by) / bh)
        .setDisplaySize(bw * f.s, bh * f.s).setDepth(-4);
      if (wait === null || this.reducedMotion) return;
      // out of the box, in an arc, turning once over
      const from = f.at(g.from), lift = 90 * f.s, sx = thing.scaleX, sy = thing.scaleY, flight = { t: 0 };
      thing.setVisible(false);
      this.tweens.add({
        targets: flight, t: 1, delay: wait, duration: 420, ease: "Sine.easeInOut",
        onStart: () => thing.setVisible(true),
        onUpdate: () => {
          const t = flight.t, k = 0.35 + 0.65 * t;
          thing.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * lift);
          thing.setScale(sx * k, sy * k).setRotation(-(1 - t) * Math.PI * 2);
        },
        onComplete: () => {
          thing.setRotation(0).setScale(sx, sy).setPosition(to.x, to.y);
          this.services.audio.playClick(this);
          this.tweens.add({ targets: thing, y: to.y - 6 * f.s, duration: 70, yoyo: true, ease: "Quad.easeOut" });
        },
      });
    };
    if (this._opened) {
      placed("open", g.box, -5);
      TREE.instruments.forEach((it, i) => land(it, i, null));
      return;
    }
    const outline = g.hit.map((q) => f.at(q));
    const xs = outline.map((q) => q.x), ys = outline.map((q) => q.y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const hit = this.add.zone(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0).setOrigin(0, 0).setDepth(-3)
      .setInteractive({
        hitArea: new Phaser.Geom.Polygon(outline.map((q) => ({ x: q.x - x0, y: q.y - y0 }))),
        hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true,
      });
    // it glints until it is opened
    this._glint = attachMovableSparkles(this, hit, { padding: 3, bounds: () => hit.getBounds() });
    hit.once("pointerdown", () => {
      this._glint?.();
      this._glint = null;
      hit.destroy();
      this.game.canvas.style.cursor = "";
      this._opened = true;
      this.services.audio.playClick(this);
      placed("open", g.box, -5);
      TREE.instruments.forEach((it, i) => land(it, i, 50 + i * 110));
    });
  }

  // ── the line across the moon, on hover ─────────────────────────────────────
  // Mouse hover draws the line until the pointer leaves. A touch pins it
  // until the next tap, so a finger never has to cover the clue to see it.
  _makeMoon(f) {
    const at = f.at([TREE.moon.x, TREE.moon.y]);
    const mx = at.x, my = at.y, r = TREE.moon.r * f.s;
    const line = (this._secantGraphics = this.add.graphics().setDepth(-13).setVisible(false));
    const area = (this._moonHitArea = this.add.circle(mx, my, r * 2.2, 0xffffff, 0.001).setDepth(-12).setInteractive({ useHandCursor: true }));
    let drawing = null;
    const show = () => {
      if (drawing?.isPlaying()) return;
      line.setVisible(true);
      const proxy = { t: 0 };
      drawing = this.tweens.add({
        targets: proxy,
        t: 1,
        duration: this.reducedMotion ? 1 : 900,
        ease: "Linear",
        onUpdate: () => {
          const x0 = mx - r, x1 = mx - r + 2 * r * proxy.t; // never past mx + r
          line.clear();
          // a fine line of light, with a faint glow round it
          line.lineStyle(Math.max(3, r * 0.1), 0xdfe8ff, 0.16).lineBetween(x0, my, x1, my);
          line.lineStyle(Math.max(1.2, r * 0.03), 0xf6f8ff, 0.85).lineBetween(x0, my, x1, my);
          line.fillStyle(0xf6f8ff, 0.9).fillCircle(x0, my, Math.max(1.6, r * 0.045));
          line.fillCircle(x1, my, Math.max(1.6, r * 0.045));
        },
      });
    };
    const hide = () => {
      drawing?.stop();
      drawing = null;
      line.clear().setVisible(false);
    };
    area.on("pointerover", (pointer) => { if (!pointer.wasTouch && !this._moonPinned) show(); });
    area.on("pointerout", () => { if (!this._moonPinned) hide(); });
    area.on("pointerdown", (pointer) => {
      if (!pointer.wasTouch) return;
      this._moonPinned = !this._moonPinned;
      if (this._moonPinned) show(); else hide();
    });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._glint?.();
    this._glint = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._moonPinned = false;
  }

  shutdown() {
    this._glint?.();
    this._glint = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
