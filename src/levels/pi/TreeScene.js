import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { layoutTree, paintTree, releaseTreeArt } from "./tree.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { spreadLit } from "./lamps.js";
import { loadDrawingRoomMaterials } from "../house/drawingRoomMaterials.js";
import { TREE_PHOTOGRAPH, loadTreePhotography, alignTreePhotography } from "./photographicTree.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "PI"  ·  code: PI   ·  count the lamps
//
// The puzzle of the sleeping city (PiScene.js), as it is found in the house:
// a Christmas tree in the drawing room at night, a string of small lamps
// along each of its nine tiers. Not every lamp is alight. Tier by tier, top
// to bottom, the number that are is:
//
//   3 · 1 · 4 · 1 · 5 · 9 · 2 · 6 · 5
//
// Which holders are alight on a tier is spread along it by chance (seeded),
// so the tree just looks half lit — until someone counts. The lamps that are
// alight stay alight, twinkling as old lamps do. Hover the moon in the window and a line is drawn straight
// across it. One parcel under the tree can be opened: a click, and out of it
// jump a ruler, a protractor and a pair of compasses. Nothing on screen
// explains anything; the access code is the name of the number:  PI
//
// The tree is painted once per screen size (tree.js); the lamps that are
// alight, their glow on the boughs and the moon's line are live.
// ─────────────────────────────────────────────────────────────────────────────

const PI_DIGITS = [3, 1, 4, 1, 5, 9, 2, 6, 5]; // tiers, top to bottom
const TOY = 0.7; // how big the things in the parcel are, of the size they are painted
const DIM = 0xbcbcc6; // what stands in the room's dark is seen by it

export default class TreeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Pi" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    loadDrawingRoomMaterials(this);
    loadTreePhotography(this);
  }

  create() {
    this.beginScene();
    this._moonPinned = false;
    this._opened = false; // the parcel is still tied up
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const L = (this._L = layoutTree(W, H));
    if (this.textures.exists(TREE_PHOTOGRAPH)) alignTreePhotography(L, layoutTree(1792, 1024));
    const k = (this._keys = paintTree(this, L).keys);
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-16);
    this._makeMoon(L.moon);
    this._makeLamps(L, k);
    this._makeGift(L, k);
  }

  // ── the lamps ──────────────────────────────────────────────────────────────

  // The holders alight on each tier, spread along its string: a lamp and its
  // glow on the boughs round it. They never go out — they twinkle, each in
  // its own time: a quick dip and back, now and then, never down to dark.
  _makeLamps(L, k) {
    const rnd = this._rng(31415);
    L.rows.forEach((row, tier) => {
      for (const j of spreadLit(row.length, PI_DIGITS[tier], rnd)) {
        const p = row[j];
        const glow = this.add
          .image(p.x, p.y, k.glow)
          .setDisplaySize(L.lamp.h * (L.photoLamps ? 4.8 : 6.4), L.lamp.h * (L.photoLamps ? 4.8 : 6.4))
          .setTint(0xffb860)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(-8);
        const lamp = this.add.image(p.x, p.y, k.lamp).setDepth(-7);
        if (L.photoLamps) lamp.setDisplaySize(L.lamp.h * 1.6 * L.photoLampAspect, L.lamp.h * 1.6).setOrigin(0.5, 0.67);
        else lamp.setDisplaySize(L.lamp.w * 1.5, L.lamp.h * 1.4);
        const level = 0.9 + rnd() * 0.1;
        lamp.setAlpha(level); glow.setAlpha(level);
        this.ambientTween({
          targets: [lamp, glow], alpha: { from: level, to: level * (0.62 + rnd() * 0.14) },
          duration: 110 + rnd() * 260, delay: rnd() * 2400, yoyo: true, repeat: -1,
          repeatDelay: 500 + rnd() * 2600, ease: "Sine.easeInOut",
        });
      }
    });
  }

  // ── the parcel ─────────────────────────────────────────────────────────────

  // The parcel stands tied up until it is clicked. Then it is open, and what
  // was in it jumps out — up, over, turning, and down onto the boards beside
  // it, one after another — and lies there.
  _makeGift(L, k) {
    const g = L.gift, at = g.origins;
    const box = this.add.image(g.x, g.y, this._opened ? k.giftOpen : k.giftShut).setTint(DIM).setDepth(-5);
    box.setOrigin(...(this._opened ? [at.giftOpen.x, at.giftOpen.y] : [at.giftShut.x, at.giftShut.y]));
    const land = (toy, wait) => {
      const x1 = g.x + toy.dx * g.s, y1 = g.y + toy.dy * g.s;
      const o = at[toy.key];
      const thing = this.add.image(x1, y1, k[toy.key]).setOrigin(o.x, o.y).setRotation(toy.turn).setScale(TOY).setTint(DIM).setDepth(-4);
      if (wait === null || this.reducedMotion) return;
      // out of the box, in an arc, turning once over
      const x0 = g.x, y0 = g.y - 24 * g.s, lift = (110 + toy.dx * 0.3) * g.s, flight = { t: 0 };
      thing.setPosition(x0, y0).setScale(TOY * 0.35).setVisible(false);
      this.tweens.add({
        targets: flight,
        t: 1,
        delay: wait,
        duration: 380,
        ease: "Sine.easeInOut",
        onStart: () => thing.setVisible(true),
        onUpdate: () => {
          const t = flight.t;
          thing.setPosition(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * lift);
          thing.setScale(TOY * (0.35 + 0.65 * t)).setRotation(toy.turn - (1 - t) * Math.PI * 2);
        },
        onComplete: () => {
          // it lands, and hops once
          this.services.audio.playClick(this);
          this.tweens.add({ targets: thing, y: y1 - 7 * g.s, duration: 70, yoyo: true, ease: "Quad.easeOut" });
        },
      });
    };
    if (this._opened) { g.toys.forEach((toy) => land(toy, null)); return; }
    const hit = this.add.zone(g.x, g.y - 30 * g.s, 100 * g.s, 70 * g.s).setInteractive({ useHandCursor: true }).setDepth(-3);
    // it glints until it is opened
    this._glint = attachMovableSparkles(this, hit, { padding: 3, bounds: () => box.getBounds() });
    hit.once("pointerdown", () => {
      this._glint?.();
      this._glint = null;
      hit.destroy();
      this.game.canvas.style.cursor = "";
      this._opened = true;
      this.services.audio.playClick(this);
      box.setTexture(k.giftOpen).setOrigin(at.giftOpen.x, at.giftOpen.y);
      g.toys.forEach((toy, i) => land(toy, 50 + i * 110));
    });
  }

  // ── the line across the moon, on hover ─────────────────────────────────────
  // Mouse hover draws the line until the pointer leaves. A touch pins it
  // until the next tap, so a finger never has to cover the clue to see it.
  _makeMoon({ x: mx, y: my, r }) {
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
    releaseTreeArt(this.textures);
    this._moonPinned = false;
  }

  shutdown() {
    this._glint?.();
    this._glint = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseTreeArt(this.textures);
  }
}
