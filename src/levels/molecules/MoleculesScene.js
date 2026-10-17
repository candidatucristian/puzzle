import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst } from "../../shared/paint.js";
import { BOOK, MOLECULAR_MODELS, NOTEBOOK_PHOTO, layoutBook, paintBook, releaseBook } from "./book.js";
import { MOLECULES } from "./puzzle.js";

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
// Two pages show at a time; the right page turns over to the next two, the
// left one back. Recognised, the elements' symbols in page order spell:  SHIP
//
// Nothing on screen explains anything. The book is painted once per screen
// size (book.js); the scene turns its pages.
// ─────────────────────────────────────────────────────────────────────────────

const TURN = 300; // ms for each half of a page turning over

export default class MoleculesScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Molecules" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    if (!this.textures.exists(NOTEBOOK_PHOTO)) {
      this.load.image(NOTEBOOK_PHOTO, "assets/images/Molecules/notebook-open.png");
    }
    if (!this.textures.exists(MOLECULAR_MODELS)) {
      this.load.image(MOLECULAR_MODELS, "assets/images/Molecules/molecular-models.png");
    }
  }

  create() {
    this.beginScene();
    this._spread = 0; // 0: pages 1 and 2; 1: pages 3 and 4
    // his hand needs its face loaded before the pages are painted
    const ready = document.fonts?.load ? document.fonts.load('italic 500 40px "Cormorant Garamond"').catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (!this.sys.isActive()) return;
      this._build(this.cameras.main.width, this.cameras.main.height);
      this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── the book ───────────────────────────────────────────────────────────────

  _build(W, H) {
    const L = (this._L = layoutBook(W, H));
    const photo = this.textures.get(NOTEBOOK_PHOTO).getSourceImage();
    const models = this.textures.get(MOLECULAR_MODELS).getSourceImage();
    paintBook(this.textures, L, photo, models);
    this.add.image(0, 0, BOOK.desk).setOrigin(0, 0).setDepth(-10);
    this._left = this.add.image(L.spine, L.top, BOOK.page(0)).setOrigin(1, 0).setDisplaySize(L.pw, L.ph).setDepth(1);
    this._right = this.add.image(L.spine, L.top, BOOK.page(1)).setOrigin(0, 0).setDisplaySize(L.pw, L.ph).setDepth(1);
    this.add.image(L.spine, L.top, BOOK.shade).setOrigin(0.5, 0).setDisplaySize(L.pw * 2, L.ph).setDepth(3);
    this._sheet = this.add.image(L.spine, L.top, BOOK.page(1)).setOrigin(0, 0).setDisplaySize(L.pw, L.ph).setDepth(4).setVisible(false);
    this._sheetShade = this.add.rectangle(L.spine, L.top, L.pw, L.ph, 0x000000, 0).setOrigin(0, 0).setDepth(5).setVisible(false);
    // where a page is turned: the right one forward, the left one back
    this._zones = {
      right: this.add.zone(L.spine, L.top, L.pw, L.ph).setOrigin(0, 0).setDepth(6),
      left: this.add.zone(L.spine - L.pw, L.top, L.pw, L.ph).setOrigin(0, 0).setDepth(6),
    };
    this._zones.right.on("pointerdown", () => this._turn(1));
    this._zones.left.on("pointerdown", () => this._turn(-1));
    this._turning = false;
    this._show();
    this._built = true;
  }

  // the spread as it lies, and which of its pages can be turned
  _show() {
    const s = this._spread;
    this._left.setTexture(BOOK.page(s * 2)).setDisplaySize(this._L.pw, this._L.ph);
    this._right.setTexture(BOOK.page(s * 2 + 1)).setDisplaySize(this._L.pw, this._L.ph);
    const last = Math.ceil(MOLECULES.length / 2) - 1;
    const can = { right: s < last, left: s > 0 };
    for (const [side, zone] of Object.entries(this._zones)) {
      if (can[side]) zone.setInteractive({ useHandCursor: true });
      else zone.disableInteractive();
    }
  }

  // a page turned over, forward (1) or back (-1): it lifts from its side,
  // stands edge-on over the spine, and comes down on the other side
  _turn(dir) {
    const L = this._L, s = this._spread, next = s + dir;
    if (this._turning || next < 0 || next > Math.ceil(MOLECULES.length / 2) - 1) return;
    this._turning = true;
    this._rustle();
    const front = dir > 0 ? s * 2 + 1 : s * 2; // the face that lifts
    const back = dir > 0 ? next * 2 : next * 2 + 1; // the face that comes down
    // under it, what the turned page uncovers
    if (dir > 0) this._right.setTexture(BOOK.page(next * 2 + 1)).setDisplaySize(L.pw, L.ph);
    else this._left.setTexture(BOOK.page(next * 2)).setDisplaySize(L.pw, L.ph);
    const sheet = this._sheet.setTexture(BOOK.page(front)).setOrigin(dir > 0 ? 0 : 1, 0).setDisplaySize(L.pw, L.ph).setVisible(true);
    const shade = this._sheetShade.setOrigin(dir > 0 ? 0 : 1, 0).setVisible(true).setFillStyle(0x000000, 0);
    const full = sheet.scaleX;
    // one count from 1 to 0 and back: the sheet narrows to the spine and opens
    // on the far side; the shadow on it deepens as it stands up
    const k = { v: 1 };
    const apply = () => {
      sheet.scaleX = full * k.v; shade.scaleX = k.v;
      shade.setFillStyle(0x000000, 0.35 * (1 - k.v));
    };
    this.tweens.add({
      targets: k, v: 0, duration: TURN, ease: "Sine.easeIn", onUpdate: apply,
      onComplete: () => {
        sheet.setTexture(BOOK.page(back)).setOrigin(dir > 0 ? 1 : 0, 0);
        shade.setOrigin(dir > 0 ? 1 : 0, 0);
        apply();
        this.tweens.add({
          targets: k, v: 1, duration: TURN, ease: "Sine.easeOut", onUpdate: apply,
          onComplete: () => {
            sheet.setVisible(false); shade.setVisible(false);
            this._spread = next;
            this._show();
            this._turning = false;
          },
        });
      },
    });
  }

  // the dry sound of a page turned: a short breath of paper
  _rustle() {
    noiseBurst(this, { dur: 0.45, freq: 2400, q: 0.7, gain: 0.22, env: (x) => Math.sin(Math.PI * x) ** 1.6 * (0.6 + 0.4 * Math.random()) });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseBook(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    releaseBook(this.textures);
  }
}
