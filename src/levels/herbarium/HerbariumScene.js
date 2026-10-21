import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst } from "../../shared/paint.js";
import { PageFlip, holdBook, bringNear } from "../../shared/pageFlip.js";
import { BOOK, layoutBook, paintBook, releaseBook } from "./book.js";
import { herbariumPhotography, loadHerbariumPhotography } from "./photography.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "IVY'S HERBARIUM"  ·  code: HEDGE  ·  her book of pressed plants
//
// On the console table under the window in Room VI: Ivy's herbarium, open.
// Five pages of pressed plants, two to a page, each taped down and
// named in her hand; on every page one of them drawn round in pencil with a
// figure of straight sides. Counted, the sides are letters (A = 1):
//
//   I  octagon 8 H · II  pentagon 5 E · III  square 4 D
//   IV heptagon 7 G · V  pentagon 5 E                →   HEDGE
//
// Two pages show at a time. A leaf is turned as a real one is: its corner
// lifts toward the hand, it can be taken and drawn over, or a click turns it
// (shared/pageFlip.js). Once open, the book is brought a little nearer, so
// the plants can be seen. Nothing on screen says to count anything. The book
// is painted once per screen size (book.js).
// ─────────────────────────────────────────────────────────────────────────────

const NEAR = 1.12; // how much nearer the book is brought once it has opened

export default class HerbariumScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Herbarium" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    loadHerbariumPhotography(this);
  }

  create() {
    this.beginScene();
    this._spread = 0;
    this._broughtNear = false;
    // her hand needs its face loaded before the pages are painted
    const ready = document.fonts?.load ? document.fonts.load('italic 500 40px "Cormorant Garamond"').catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (!this.sys.isActive()) return;
      this._build(this.cameras.main.width, this.cameras.main.height);
      this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // whether a leaf is on its way over (read by the browser tests)
  get _turning() { return this._flip?.state?.mode === "turn"; }

  _build(W, H) {
    // laid out as it will lie once brought near: the camera starts as far off
    // as that, so the book first shows as it lay, and then comes closer
    const L = (this._L = layoutBook(W, H, NEAR));
    const photography = herbariumPhotography(this);
    L.photographic = Boolean(photography.book && photography.desk && photography.pages.length === 5 && photography.pages.every(Boolean));
    const { faces, shade } = paintBook(this.textures, L, photography);
    this.add.image(L.view.x, L.view.y, BOOK.desk).setOrigin(0, 0).setDepth(-10);
    this.add.image(L.view.x, L.view.y, BOOK.light).setOrigin(0, 0).setDepth(5);
    this._flip = new PageFlip(this, {
      key: BOOK.flip, faces, shade, spine: L.spine, top: L.top, pw: L.pw, ph: L.ph, depth: 1,
      spread: this._spread, instant: this.reducedMotion,
      onTurn: (spread) => { this._spread = spread; this._show(); },
      onRustle: () => this._rustle(),
    });
    // the pages, to be taken hold of: the right one forward, the left one back
    this._zones = {
      right: this.add.zone(L.spine, L.top, L.pw, L.ph).setOrigin(0, 0).setDepth(6).setName("herbarium-next").setData("interactionLabel", "Turn the page"),
      left: this.add.zone(L.spine - L.pw, L.top, L.pw, L.ph).setOrigin(0, 0).setDepth(6).setName("herbarium-previous").setData("interactionLabel", "Turn back"),
    };
    this._letGo = holdBook(this, this._flip, Object.values(this._zones));
    this._show();
    // brought nearer the first time it is opened; built again (the window
    // resized), it is simply near
    this._nearTimer = bringNear(this, L.zoom, !this._broughtNear && !this.reducedMotion);
    this._broughtNear = true;
    this._built = true;
  }

  // which of the two pages can be turned
  _show() {
    const s = this._spread, last = this._flip.spreads - 1;
    const can = { right: s < last, left: s > 0 };
    for (const [side, zone] of Object.entries(this._zones)) {
      if (can[side]) zone.setInteractive({ useHandCursor: true });
      else zone.disableInteractive();
    }
  }

  update(_, delta) {
    if (this._built) this._flip.update(Math.min(delta, 50) / 1000);
  }

  // the dry sound of a heavy page turned
  _rustle() {
    noiseBurst(this, { dur: 0.5, freq: 2000, q: 0.7, gain: 0.24, env: (x) => Math.sin(Math.PI * x) ** 1.6 * (0.6 + 0.4 * Math.random()) });
  }

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    this._nearTimer?.remove(false);
    // a leaf on its way over is over by the time the book is seen again
    if (this._flip) { this._spread = this._flip.settled(); this._flip.destroy(); this._flip = null; }
    this._unlisten();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseBook(this.textures);
  }

  _unlisten() {
    this._letGo?.();
    this._letGo = null;
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    this._unlisten();
    this._flip?.destroy();
    this._flip = null;
    releaseBook(this.textures);
  }
}
