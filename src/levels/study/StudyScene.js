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
// The room is a Blender render (study.js; house/roomRender.js), lit by one
// candle and the moon. Live over it: the candle, never still; dust in the
// moonbeam.
// ─────────────────────────────────────────────────────────────────────────────

export default class StudyScene extends RoomScene {
  constructor() {
    super("Study");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Study");
  }

  layout(W, H) {
    return layoutStudy(W, H);
  }

  paint(L) {
    return paintStudy(this, L).keys;
  }

  release() {
    releaseStudyArt(this.textures);
  }

  live(L, k, glow) {
    this._flame = glow(L.glows.candle, 0.36);
    this._flameBody = addCandleFlame(this, L.flames.candle);
  }

  tick(t) {
    this._flame?.setAlpha(0.32 + 0.06 * Math.sin(t * 9) + Math.random() * 0.05);
    flickerCandleFlame(this._flameBody, t);
  }

  dustIn(L) {
    return L.dust;
  }
}
