import RoomScene from "../house/RoomScene.js";
import { layoutStudy, paintStudy, releaseStudyArt } from "./study.js";
import { addCandleFlame, flickerCandleFlame } from "../../shared/candleFlame.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// The study: the first room off the hall (see house/RoomScene.js for what
// every room does). Three puzzles are found in it: a glass case of earth by
// the lamp, the window on the moonlit garden, a cipher wheel over the mantel.
// The gilt chest is on the desk.
//
// The room is a Blender render (study.js; house/roomRender.js). Live over it:
// the lamp, which burns by the glass case until the case is solved and is
// then turned right down; the candle on the desk, which goes out when the
// wheel is solved; dust in the moonbeam.
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
    loadRoomRender(this, "Study");
  }

  layout(W, H, levels) {
    const lampOn = !levels.isCompleted(levels.indexOf(LAMP_FOR));
    const candleOn = !levels.isCompleted(levels.indexOf(CANDLE_FOR));
    return layoutStudy(W, H, { lampOn, candleOn });
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
    const lamp = glow(L.glows.lamp, 0.2 * lit);
    this.ambientTween({ targets: lamp, alpha: { from: 0.17 * lit, to: 0.25 * lit }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this._flame = L.candleOn ? glow(L.glows.candle, 0.4) : null;
    this._flameBody = L.candleOn ? addCandleFlame(this, L.flames.candle) : null;
  }

  tick(t) {
    this._flame?.setAlpha(0.36 + 0.06 * Math.sin(t * 9) + Math.random() * 0.05);
    flickerCandleFlame(this._flameBody, t);
  }

  // with the candle out there is only the moon on the chest
  chestTint(L) {
    return L.candleOn ? null : 0x9aa0b8;
  }

  dustIn(L) {
    return L.dust;
  }
}
