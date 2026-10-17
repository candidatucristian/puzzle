import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { noiseBurst, addCanvasTexture } from "../../shared/paint.js";
import { HAND, KEYS, boxPad, chalkDigit, layoutBoard, paintBoard, releaseBoard } from "./art.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "EQUATIONS"  ·  code: 2324  ·  half wiped
//
// Silas's blackboard, in his weighing room (Room VIII): three reactions in
// his chalk hand, the date over them, and in the corner Lavoisier's "Rien ne
// se perd." Some of the numbers have been wiped off and left as boxes:
//
//   _H₂ + O₂ → 2H₂O  ·  N₂ + _H₂ → _NH₃  ·  _Fe + 3O₂ → 2Fe₂O₃
//
// Balanced — as many atoms of each element on both sides — they are 2, 3 2
// and 4: read in order, 2324. A click on a box chalks a number into it, the
// next click the next number (the wheel goes up and down too), so the
// working can be tried on the board; the board checks nothing.
// ─────────────────────────────────────────────────────────────────────────────

export default class EquationsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Equations" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    if (this.input.mouse) this.input.mouse.disableContextMenu();
    this._digits = []; // what has been chalked into each box (0: nothing)
    // his hand needs its face loaded before the board is written
    const ready = document.fonts?.load ? document.fonts.load(`40px ${HAND}`).catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (!this.sys.isActive()) return;
      this._build(this.cameras.main.width, this.cameras.main.height);
      this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const L = (this._L = layoutBoard(W, H));
    paintBoard(this, L);
    this.add.image(0, 0, KEYS.room).setOrigin(0, 0).setDepth(-10);
    const pad = boxPad(L);
    this._boxes = L.boxes.map((b, i) => {
      this._digits[i] ??= 0;
      const top = b.y - b.h * 0.86 - pad;
      const img = this.add.image(b.x - pad, top, KEYS.box(i)).setOrigin(0, 0).setDepth(2);
      const zone = this.add.zone(b.x - pad, top, b.w + pad * 2, b.h + pad * 2).setOrigin(0, 0).setDepth(3)
        .setInteractive({ useHandCursor: true }).setData("interactionLabel", "Chalk a number in");
      zone.on("pointerdown", (p) => this._chalk(i, p.rightButtonDown() ? -1 : 1));
      zone.on("wheel", (p, dx, dy) => this._chalk(i, dy > 0 ? -1 : 1));
      const box = { i, b, img };
      this._paintBox(box);
      return box;
    });
    this._built = true;
  }

  // the next number chalked into box `i` (or the one before), after none and 9 none again
  _chalk(i, dir) {
    if (!this._built) return;
    this._digits[i] = (this._digits[i] + dir + 10) % 10;
    this._paintBox(this._boxes[i]);
    // the stick on the slate: a short dry scratch, or the duster's rub
    if (this._digits[i]) noiseBurst(this, { dur: 0.16, type: "highpass", freq: 2600, q: 0.8, gain: 0.16, env: (x) => (x < 0.1 ? x / 0.1 : 1) * (1 - x) ** 1.5 * (0.6 + 0.4 * Math.random()) });
    else noiseBurst(this, { dur: 0.22, type: "lowpass", freq: 900, q: 0.6, gain: 0.2, env: (x) => Math.sin(Math.PI * x) });
  }

  _paintBox(box) {
    const key = KEYS.box(box.i);
    addCanvasTexture(this.textures, key, chalkDigit(this._L, box.b, this._digits[box.i], box.i * 13 + this._digits[box.i]));
    const pad = boxPad(this._L);
    box.img.setTexture(key).setDisplaySize(box.b.w + pad * 2, box.b.h + pad * 2);
  }

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseBoard(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    releaseBoard(this.textures);
  }
}
