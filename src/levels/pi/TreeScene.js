import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { layoutTree, paintTree, releaseTreeArt } from "./tree.js";

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
// Which holders are alight on a tier is chance (seeded), so the tree just
// looks half lit — until someone counts. Click a lamp that is alight and it
// goes out, and the nearest dark one on the same string comes on: the count
// never changes. Hover the moon in the window and a line is drawn straight
// across it. Nothing on screen explains anything; the access code is the
// name of the number:  PI
//
// The tree is painted once per screen size (tree.js); the lamps that are
// alight, their glow on the boughs and the moon's line are live.
// ─────────────────────────────────────────────────────────────────────────────

const PI_DIGITS = [3, 1, 4, 1, 5, 9, 2, 6, 5]; // tiers, top to bottom

export default class TreeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Pi" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._moonPinned = false;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const L = (this._L = layoutTree(W, H));
    const k = (this._keys = paintTree(this, L).keys);
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-16);
    this._makeMoon(L.moon);
    this._makeLamps(L, k);
    this.levelText = drawLevelLabel(this, W, H);
  }

  // ── the lamps ──────────────────────────────────────────────────────────────

  // Every holder gets its light — a lamp alight, and its glow on the boughs
  // round it — shown only while that holder is alight; and a place to click.
  _makeLamps(L, k) {
    const rnd = this._rng(31415);
    this._rows = L.rows.map((row, tier) => {
      // which of this tier's holders start alight
      const order = row.map((_, j) => j).sort(() => rnd() - 0.5);
      const lit = new Set(order.slice(0, PI_DIGITS[tier]));
      return row.map((p, j) => {
        const glow = this.add
          .image(p.x, p.y, k.glow)
          .setDisplaySize(L.lamp.h * 6.4, L.lamp.h * 6.4)
          .setTint(0xffb860)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(-8);
        const lamp = this.add.image(p.x, p.y, k.lamp).setDisplaySize(L.lamp.w * 1.5, L.lamp.h * 1.4).setDepth(-7);
        const hit = this.add.circle(p.x, p.y, L.lamp.h * 1.05, 0xffffff, 0.001).setDepth(-6);
        hit.on("pointerdown", () => this._move(tier, j));
        // a lamp's light is never quite steady
        const level = 0.84 + rnd() * 0.16;
        this.ambientTween({ targets: [lamp, glow], alpha: { from: level, to: level - 0.16 }, duration: 1800 + rnd() * 2400, delay: rnd() * 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        const holder = { lit: false, glow, lamp, hit };
        this._set(holder, lit.has(j));
        return holder;
      });
    });
  }

  _set(holder, lit) {
    holder.lit = lit;
    holder.glow.setVisible(lit);
    holder.lamp.setVisible(lit);
    if (lit) holder.hit.setInteractive({ useHandCursor: true });
    else holder.hit.disableInteractive();
  }

  // A lamp that is alight goes out, and the nearest dark one on the same
  // string comes on — either side, if two are as near.
  _move(tier, j) {
    const row = this._rows[tier];
    if (!row[j].lit) return;
    const dark = row.map((holder, i) => i).filter((i) => !row[i].lit);
    if (!dark.length) return;
    const nearest = Math.min(...dark.map((i) => Math.abs(i - j)));
    const choice = dark.filter((i) => Math.abs(i - j) === nearest);
    this._set(row[j], false);
    this._set(row[choice[Math.floor(Math.random() * choice.length)]], true);
    this.game.canvas.style.cursor = "";
    this.services.audio.playClick(this);
  }

  // ── the line across the moon, on hover ─────────────────────────────────────
  // Mouse hover draws the line until the pointer leaves. A touch pins it
  // until the next tap, so a finger never has to cover the clue to see it.
  _makeMoon({ x: mx, y: my, r }) {
    const line = this.add.graphics().setDepth(-13).setVisible(false);
    const area = this.add.circle(mx, my, r * 2.2, 0xffffff, 0.001).setDepth(-12).setInteractive({ useHandCursor: true });
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
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseTreeArt(this.textures);
    this._rows = null;
    this._moonPinned = false;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseTreeArt(this.textures);
    this._rows = null;
  }
}
