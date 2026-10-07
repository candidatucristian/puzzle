import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { layoutCell, paintCell, releaseCellArt } from "./cell.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "TAPCODE"  ·  code: ESCAPE   ·  count the knocks
//
// A tower cell at night, painted like the game's other storybook rooms: cold
// moonlight through a small window barred five squares by five, laying the
// grille across the floor; a candle on a stool, warm on a great smooth stone
// where a prisoner cut his message in the old prisoners' tap code — a 5×5
// grid of letters (K borrows C's square), each letter two numbers: the row
// in marks, then the column in marks.
//
//        1 2 3 4 5
//     1  A B C D E
//     2  F G H I J
//     3  L M N O P
//     4  Q R S T U
//     5  V W X Y Z
//
//   (1,5)(4,3)(1,3)(1,1)(3,5)(1,5)   →   E S C A P E
//
// Six lines, two clusters of marks each. Nothing names the cipher; the
// longest cluster is five, and the window is a grid of five by five that
// someone began numbering — a 1 over the first column, a 1 beside the first
// row — and stopped. A straw cot, an iron-bound door, a tin cup, and the
// last prisoner's bones, still chained to the wall under the window.
// ─────────────────────────────────────────────────────────────────────────────

export default class TapCodeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "TapCode" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const L = layoutCell(W, H);
    const art = paintCell(this, L);
    const k = art.keys;
    this._L = L;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the candle: its flame and its warm glow, never quite still
    const c = L.candle;
    this._flameH = 22 * c.s;
    this._flame = this.add
      .image(c.x, c.y - 3 * c.s, k.flame)
      .setOrigin(0.5, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-6);
    this._glow = this.add
      .image(c.x, c.y - this._flameH * 0.5, k.glow)
      .setDisplaySize(c.s * 170, c.s * 170)
      .setTint(0xffb860)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55)
      .setDepth(-6);

    this._makeStars(L, k.glow);
    this._makeMotes(L, k.glow);
    this._makeFog(L, k.fog);
    this.levelText = drawLevelLabel(this, W, H);
  }

  // a few stars twinkling in the window, in the clear of the bars
  _makeStars(L, key) {
    const { x0, y0, w, h } = L.win;
    const rnd = this._rng(4111);
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(rnd() * 5);
      const cy = Math.floor(rnd() * 3);
      if (cx >= 3 && cy <= 1) continue; // the moon's corner
      const star = this.add
        .image(x0 + (w * (cx + 0.3 + rnd() * 0.4)) / 5, y0 + (h * (cy + 0.3 + rnd() * 0.4)) / 5, key)
        .setDisplaySize(5 * L.u, 5 * L.u)
        .setTint(0xe8eeff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.6)
        .setDepth(-9);
      this.ambientTween({
        targets: star,
        alpha: 0.1,
        duration: 1400 + rnd() * 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // banks of fog drifting slowly across the cell, low along the floor
  _makeFog(L, key) {
    const { W, H, floorY } = L;
    for (let i = 0; i < 4; i++) {
      const y = floorY + (H - floorY) * (i * 0.28 - 0.15);
      const fog = this.add
        .image(W * (i % 2 ? 0.25 : 0.7), y, key)
        .setDisplaySize(W * (0.75 + i * 0.12), H * (0.16 + i * 0.03))
        .setTint(0x9aa6b8)
        .setAlpha(0.22 + i * 0.05)
        .setDepth(-4);
      this.ambientTween({
        targets: fog,
        x: fog.x + (i % 2 ? 1 : -1) * W * 0.16,
        duration: 16000 + i * 5000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // dust turning in the moon's shaft
  _makeMotes(L, key) {
    const { x0, x1, y1, w } = L.win;
    for (let i = 0; i < 14; i++) {
      const t = Math.random();
      const x = x0 + (x1 - x0) * Math.random() + t * w * 1.1;
      const y = y1 + t * (L.floorY - y1);
      const m = this.add
        .image(x, y, key)
        .setDisplaySize(3.5 * L.u, 3.5 * L.u)
        .setTint(0xc8d8ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-5);
      this.ambientObject(m);
      this.ambientTween({
        targets: m,
        x: x + (Math.random() - 0.3) * 30 * L.u,
        y: y + (Math.random() - 0.5) * 24 * L.u,
        alpha: { from: 0, to: 0.35 + Math.random() * 0.35 },
        duration: 4000 + Math.random() * 4000,
        delay: Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  update(time) {
    if (!this._L) return;
    const on = this.ambientMotion && !this.reducedMotion ? 1 : 0;
    const t = time / 1000;
    const f = on * (Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.5);
    this._flame.setDisplaySize(this._flameH * (0.45 - f * 0.03), this._flameH * (1 + f * 0.08)).setAngle(f * 3);
    this._glow.setAlpha(0.5 + f * 0.06);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    releaseCellArt(this.textures);
    this._L = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseCellArt(this.textures);
    this._L = null;
  }
}
