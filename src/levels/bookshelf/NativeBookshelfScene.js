import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { addCanvasTexture, glowCanvas, makeCanvas, noiseBurst } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import LIBRARY from "./nativeLibrary.json";

const PATH = `assets/images/Bookshelf/native-v${LIBRARY.version}`;
const key = name => `bookshelf_cycles_v${LIBRARY.version}_${name}`;

// The room, cat, gilt titles and numbered bookmarks are Blender geometry.
// Each book's nine poses are room crops rendered with its real moving shadow.
export default class NativeBookshelfScene extends BasePuzzleScene {
  constructor() { super({ key: "Bookshelf" }); }

  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  get usesEscape() { return Boolean(this._inspection); }

  preload() {
    for (const name of ["library", "books"]) {
      if (!this.textures.exists(key(name))) this.load.image(key(name), `${PATH}/${name}.webp`);
    }
  }

  create() {
    this.beginScene();
    const closeInspection = event => {
      if (!this._inspection) return;
      event.preventDefault(); event.stopPropagation();
      this._inspection.close();
    };
    this.input.keyboard.on("keydown-ESC", closeInspection);
    this._sceneCleanups.add(() => this.input.keyboard.off("keydown-ESC", closeInspection));
    const atlas = this.textures.get(key("books"));
    for (const book of LIBRARY.books) {
      book.frames.forEach((frame, i) => {
        const name = `book-${book.index}-${i}`;
        if (!atlas.has(name)) atlas.add(name, 0, ...frame);
      });
    }
    if (!this.textures.exists(key("dust"))) addCanvasTexture(this.textures, key("dust"), glowCanvas());
    if (!this.textures.exists(key("steam"))) addCanvasTexture(this.textures, key("steam"), steamCanvas());
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    this._sparkles = [];
    this._pulling = false;
    this._fit = fitRender(W, H, LIBRARY);
    // Keep all five books in view on narrow screens. A dim room fills the
    // remaining space while the readable shelf stays at its actual aspect.
    if (LIBRARY.safe[2] * this._fit.s > W * .96) {
      const [x, y, w, h] = LIBRARY.safe, s = W * .96 / w;
      const ox = W / 2 - (x + w / 2) * s, oy = H / 2 - (y + h / 2) * s;
      const back = Math.max(W / LIBRARY.width, H / LIBRARY.height);
      this.add.image(W / 2, H / 2, key("library")).setScale(back).setTint(0x292626).setDepth(-12);
      this._fit = { s, x: ox, y: oy, at: ([px, py]) => ({ x: ox + px * s, y: oy + py * s }) };
    }
    const f = this._fit;
    this.add.image(f.x, f.y, key("library")).setOrigin(0).setDisplaySize(LIBRARY.width * f.s, LIBRARY.height * f.s).setDepth(-10);
    this._books = LIBRARY.books.map(book => {
      const [x, y, w, h] = book.crop, at = f.at([x, y]);
      const patch = this.add.image(at.x, at.y, key("books"), `book-${book.index}-0`)
        .setOrigin(0).setDisplaySize(w * f.s, h * f.s).setDepth(-5).setVisible(false);
      const quad = book.quad.map(f.at);
      const xs = quad.map(p => p.x), ys = quad.map(p => p.y);
      const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
      const zone = this.add.zone(0, 0, W, H).setOrigin(0).setDepth(5)
        .setInteractive({ hitArea: new Phaser.Geom.Polygon(quad), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
        .setData("interactionLabel", "Pull the book");
      zone.on("pointerdown", () => this._pull(book, patch));
      this._sparkles.push(attachMovableSparkles(this, zone, { bounds: () => box, padding: 2, enabled: () => !this._pulling }));
      return { book, patch, zone };
    });
    this._atmosphere(f);
  }

  _pull(book, patch) {
    if (this._pulling) return;
    this._pulling = true;
    patch.setVisible(true);
    noiseBurst(this, { dur: .28, type: "lowpass", freq: 1400, q: .6, gain: .25,
      env: k => Math.sin(Math.PI * k) * (.6 + .4 * Math.random()) });
    const pose = { value: 0 };
    const draw = () => patch.setFrame(`book-${book.index}-${Math.round(pose.value)}`);
    const putBack = () => this.tweens.add({
      targets: pose, value: 0, duration: this.reducedMotion ? 1 : 300,
      ease: "Sine.easeInOut", onUpdate: draw,
      onComplete: () => { patch.setVisible(false); this._pulling = false; },
    });
    this.tweens.add({
      targets: pose, value: LIBRARY.poses - 1, duration: this.reducedMotion ? 1 : 300,
      ease: "Sine.easeInOut", onUpdate: draw,
      onComplete: () => {
        if (this._fit.s < .55) this._inspect(book, putBack);
        else this.time.delayedCall(1100, putBack);
      },
    });
  }

  // Small screens can read the same physical title and bookmark close up.
  _inspect(book, putBack) {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x040303, .88).setDepth(30)
      .setInteractive({ useHandCursor: true }).setData("interactionLabel", "Put the book back");
    const [, , w, h] = book.crop, scale = Math.min(W * .9 / w, H * .82 / h);
    const image = this.add.image(W / 2, H / 2, key("books"), `book-${book.index}-${LIBRARY.poses - 1}`)
      .setDisplaySize(w * scale, h * scale).setDepth(31);
    const close = () => {
      if (!this._inspection) return;
      this._inspection = null;
      shade.destroy(); image.destroy(); putBack();
    };
    this._inspection = { close };
    shade.once("pointerdown", close);
  }

  _atmosphere(f) {
    const cup = f.at(LIBRARY.cup), lamp = f.at(LIBRARY.lamp);
    for (let i = 0; i < 3; i++) {
      const steam = this.add.image(cup.x + (i - 1) * 2 * f.s, cup.y, key("steam"))
        .setOrigin(.5, 1).setScale(.55 * f.s).setAlpha(0).setDepth(2);
      this.ambientObject(steam);
      this.ambientTween({ targets: steam, y: cup.y - 45 * f.s, alpha: { from: .65, to: 0 },
        duration: 2800, delay: i * 930, repeat: -1, ease: "Sine.easeOut" });
    }
    for (let i = 0; i < 12; i++) {
      const x = lamp.x - (30 + Math.random() * 360) * f.s, y = lamp.y - (Math.random() - .35) * 250 * f.s;
      const mote = this.add.image(x, y, key("dust")).setDisplaySize(3 * f.s, 3 * f.s)
        .setTint(0xffd59d).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(1);
      this.ambientObject(mote);
      this.ambientTween({ targets: mote, x: x - 25 * f.s, y: y - 30 * f.s,
        alpha: { from: 0, to: .35 }, duration: 5000 + Math.random() * 3000,
        delay: Math.random() * 5000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  _teardown() {
    this._sparkles?.forEach(off => off());
    this._sparkles = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const child of this.children.list.slice()) child.destroy();
    this._books = [];
    this._pulling = false;
    this._inspection = null;
  }

  shutdown() { this._teardown(); }
}

function steamCanvas() {
  const c = makeCanvas(40, 120), g = c.getContext("2d");
  g.lineCap = "round";
  for (const [width, alpha] of [[10, .08], [5, .16]]) {
    g.strokeStyle = `rgba(255,250,240,${alpha})`; g.lineWidth = width;
    g.beginPath(); g.moveTo(20, 115); g.bezierCurveTo(6, 85, 34, 60, 18, 30);
    g.quadraticCurveTo(10, 15, 22, 4); g.stroke();
  }
  return c;
}
