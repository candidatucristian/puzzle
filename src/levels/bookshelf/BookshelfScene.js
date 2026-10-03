import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { noiseBurst } from "../../shared/paint.js";
import { layoutLibrary, paintLibrary, releaseLibraryArt } from "./library.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "BOOKSHELF"  ·  code: SIGHT  ·  a book cipher
//
// A library at night: a tall bookcase lit by a table lamp, a cat asleep on
// top of it. On the third shelf five books stand pulled a little out, each
// with a one-word title on its spine and a numbered paper bookmark in it:
//
//   SHADOW 1 · MIRROR 2 · MAGIC 3 · HOUND 1 · WATER 3
//
// The bookmark is the index into the title: the first letter of SHADOW, the
// second of MIRROR, the third of MAGIC, the first of HOUND, the third of
// WATER — S I G H T.
//
// A click on one of the five draws it out a little further, and back.
// ─────────────────────────────────────────────────────────────────────────────

export default class BookshelfScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Bookshelf" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const L = layoutLibrary(W, H);
    const art = paintLibrary(this, L);
    this._L = L;
    const k = art.keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the five books, each its own picture, to be drawn out
    this._books = art.books.map((b) => {
      const img = this.add
        .image(b.x + b.w / 2, b.y + b.h / 2, b.key)
        .setScale(0.5)
        .setDepth(-6)
        .setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 8 })
        .setData("interactionLabel", "Pull the book");
      const home = { x: img.x, y: img.y };
      img.on("pointerdown", () => this._pull(img, home, L));
      return img;
    });

    // the lamp's glow, the cat's tail swaying, the tea's steam
    const lp = L.lamp;
    this.add
      .image(lp.bulb.x, lp.bulb.y, k.glow)
      .setDisplaySize(L.u * 260, L.u * 200)
      .setTint(0xffc070)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55)
      .setDepth(-5);
    const tail = this.add.image(L.tail.x, L.tail.y, k.tail).setOrigin(0.4, 0).setScale(0.5).setDepth(-7);
    this.ambientTween({
      targets: tail,
      angle: { from: -9, to: 9 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    for (let i = 0; i < 3; i++) {
      const s = this.add
        .image(L.cup.x + (i - 1) * 4 * L.u, L.cup.y - 16 * L.u, k.steam)
        .setOrigin(0.5, 1)
        .setScale(0.35 * L.u)
        .setAlpha(0)
        .setDepth(-5);
      this.ambientObject(s);
      this.ambientTween({
        targets: s,
        y: { from: L.cup.y - 16 * L.u, to: L.cup.y - 40 * L.u },
        alpha: { from: 0.9, to: 0 },
        scaleY: { from: 0.3 * L.u, to: 0.5 * L.u },
        duration: 2600,
        delay: i * 870,
        repeat: -1,
        ease: "Sine.easeOut",
      });
    }
    this._motes(L, k.glow);
    this.levelText = drawLevelLabel(this, W, H);
  }

  // dust turning slowly in the lamp's light
  _motes(L, key) {
    const lp = L.lamp;
    for (let i = 0; i < 14; i++) {
      const x0 = lp.x - L.W * 0.18 + Math.random() * L.W * 0.26;
      const y0 = lp.base - Math.random() * L.H * 0.4;
      const m = this.add
        .image(x0, y0, key)
        .setDisplaySize(4 * L.u, 4 * L.u)
        .setTint(0xffe0b0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-4);
      this.ambientObject(m);
      this.ambientTween({
        targets: m,
        x: x0 + (Math.random() - 0.5) * 40 * L.u,
        y: y0 - (20 + Math.random() * 40) * L.u,
        alpha: { from: 0, to: 0.5 + Math.random() * 0.4 },
        duration: 4000 + Math.random() * 4000,
        delay: Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // drawn out toward us a little further, then slid home again
  _pull(img, home, L) {
    if (img.getData("busy")) return;
    img.setData("busy", true);
    const e = 0.035;
    this._slide();
    this.tweens.add({
      targets: img,
      x: home.x + (home.x - L.vp.x) * e,
      y: home.y + (home.y - L.vp.y) * e,
      scale: 0.5 * (1 + e),
      duration: 260,
      ease: "Quad.easeOut",
      yoyo: true,
      hold: 900,
      onComplete: () => img.active && img.setData("busy", false),
    });
  }

  // a book drawn along the shelf: a soft brush of cloth on wood
  _slide() {
    noiseBurst(this, {
      dur: 0.28,
      type: "lowpass",
      freq: 1400,
      q: 0.6,
      gain: 0.25,
      env: (k) => Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.random()),
    });
  }

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseLibraryArt(this.textures);
    this._books = [];
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseLibraryArt(this.textures);
  }
}
