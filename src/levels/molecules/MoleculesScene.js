import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst } from "../../shared/paint.js";
import { cleanBookPhoto } from "../../shared/bookPhoto.js";
import { PageFlip, holdBook, bringNear } from "../../shared/pageFlip.js";
import { BOOK, MOLECULAR_MODELS, NOTEBOOK_PHOTO, layoutBook, paintBook, releaseBook } from "./book.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "MOLECULES"  ·  code: SHIP  ·  Silas's notebook
//
// Silas's notebook, taken from the bookcase in his laboratory (Room VII —
// drawn out of its shelf there, then opened): here it lies open on his desk
// under the lamp. Four pages, one element to each, drawn as its molecule is,
// with a few words of his under it — and nothing that names it:
//
//   1  S₈ — eight atoms in a crown      2  H₂ — the lightest pair
//   3  I₂ — two large atoms             4  P₄ — four, in a pyramid
//
// Two pages show at a time. A leaf is turned as a real one is: its corner
// lifts toward the hand, it can be taken and drawn over, or a click turns it
// (shared/pageFlip.js). Once open, the book is brought a little nearer.
// Recognised, the elements' symbols in page order spell:  SHIP
//
// Nothing on screen explains anything. The book is painted once per screen
// size (book.js).
// ─────────────────────────────────────────────────────────────────────────────

const NEAR = 1.12; // how much nearer the book is brought once it has opened

export default class MoleculesScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Molecules" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    if (!this.textures.exists(NOTEBOOK_PHOTO)) {
      this.load.image(NOTEBOOK_PHOTO, "assets/images/Molecules/notebook-open.webp");
    }
    if (!this.textures.exists(MOLECULAR_MODELS)) {
      this.load.image(MOLECULAR_MODELS, "assets/images/Molecules/molecular-models.webp");
    }
  }

  create() {
    this.beginScene();
    this._spread = 0; // 0: pages 1 and 2; 1: pages 3 and 4
    this._broughtNear = false;
    // his hand needs its face loaded before the pages are painted
    const ready = document.fonts?.load ? document.fonts.load('italic 500 40px "Cormorant Garamond"').catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (!this.sys.isActive()) return;
      this._build(this.cameras.main.width, this.cameras.main.height);
      this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // whether a leaf is on its way over
  get _turning() { return this._flip?.state?.mode === "turn"; }

  // ── the book ───────────────────────────────────────────────────────────────

  _build(W, H) {
    // laid out as it will lie once brought near: the camera starts as far off
    // as that, so the book first shows as it lay, and then comes closer
    const L = (this._L = layoutBook(W, H, NEAR));
    // (its baked-in chequer cleared, shared/bookPhoto.js)
    const photo = cleanBookPhoto(this.textures.get(NOTEBOOK_PHOTO).getSourceImage());
    const models = this.textures.get(MOLECULAR_MODELS).getSourceImage();
    const { faces, shade } = paintBook(this.textures, L, photo, models);
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
      right: this.add.zone(L.spine, L.top, L.pw, L.ph).setOrigin(0, 0).setDepth(6).setData("interactionLabel", "Turn the page"),
      left: this.add.zone(L.spine - L.pw, L.top, L.pw, L.ph).setOrigin(0, 0).setDepth(6).setData("interactionLabel", "Turn back"),
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

  // the dry sound of a page turned: a short breath of paper
  _rustle() {
    noiseBurst(this, { dur: 0.45, freq: 2400, q: 0.7, gain: 0.22, env: (x) => Math.sin(Math.PI * x) ** 1.6 * (0.6 + 0.4 * Math.random()) });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

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
