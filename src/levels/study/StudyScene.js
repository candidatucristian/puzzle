import RoomScene from "../house/RoomScene.js";
import { layoutStudy, paintStudy, releaseStudyArt } from "./study.js";
import { STUDY_PHOTOGRAPH, STUDY_FLAME, loadStudyPhotography } from "./photographicRoom.js";

// ─────────────────────────────────────────────────────────────────────────────
// The study: the first room off the hall (see house/RoomScene.js for what
// every room does). Three puzzles are found in it: a glass case of earth
// under the lamp, the window on the moonlit garden, a cipher wheel beside it.
// The gilt chest is on the desk.
//
// The room is painted (study.js). Live over it: the lamp, which burns over
// the glass case until the case is solved and is then turned right down; the
// candle by the cipher wheel, which goes out when the wheel is solved; dust
// in the moonbeam.
// ─────────────────────────────────────────────────────────────────────────────

// the puzzles the table lamp and the desk's candle are lit for
const LAMP_FOR = "binarytree";
const CANDLE_FOR = "cryptex";

export default class StudyScene extends RoomScene {
  constructor() {
    super("Study");
  }

  preload() {
    super.preload();
    loadStudyPhotography(this);
  }

  layout(W, H, levels) {
    const lampOn = !levels.isCompleted(levels.indexOf(LAMP_FOR));
    const candleOn = !levels.isCompleted(levels.indexOf(CANDLE_FOR));
    return layoutStudy(W, H, { lampOn, candleOn, photographic: this.textures.exists(STUDY_PHOTOGRAPH) });
  }

  paint(L) {
    return paintStudy(this, L).keys;
  }

  release() {
    releaseStudyArt(this.textures);
  }

  live(L, k, glow) {
    // the lamp, breathing very slightly; the candle, never still
    const lit = L.lampOn ? 1 : 0.2;
    const lamp = glow(L.lampGlow, 0.2 * lit);
    this.ambientTween({ targets: lamp, alpha: { from: 0.17 * lit, to: 0.25 * lit }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this._flame = L.candleOn ? glow(L.flame, 0.4) : null;
    this._flameBody = null;
    if (L.photographic && L.candleOn) {
      const height = 10 * L.H / 948;
      this._flameBody = this.add.image(L.flame.x, L.flame.y, STUDY_FLAME)
        .setOrigin(0.5, 0.94).setDisplaySize(height * 0.38, height).setDepth(-7.9);
      this._flameSize = { x: this._flameBody.scaleX, y: this._flameBody.scaleY };
    }
  }

  tick(t) {
    this._flame?.setAlpha(0.36 + 0.06 * Math.sin(t * 9) + Math.random() * 0.05);
    this._flameBody?.setScale(this._flameSize.x * (1 + 0.05 * Math.sin(t * 11)), this._flameSize.y * (1 + 0.035 * Math.sin(t * 7)))
      .setRotation(0.035 * Math.sin(t * 5)).setAlpha(0.92 + 0.06 * Math.sin(t * 9));
  }

  // with the candle out there is only the moon on the chest
  chestTint(L) {
    return L.candleOn ? null : 0x9aa0b8;
  }

  dustIn(L) {
    const w = L.win;
    return { x: w.cx - w.rx * 1.8, y: w.top, width: w.rx * 3, height: L.H * 0.8 - w.top };
  }
}
