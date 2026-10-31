import RoomScene from "../house/RoomScene.js";
import { layoutStudy, paintStudy, releaseStudyArt } from "./study.js";
import { addCandleFlame, flickerCandleFlame } from "../../shared/candleFlame.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// The study: the first room off the hall (see house/RoomScene.js for what
// every room does). Three puzzles are found in it: the glass case on its round
// table beside its green book, the tall window on the garden in the rain, the
// cipher wheel over the mantel. The gilt chest is on the desk.
//
// The room is a Blender render (study.js; house/roomRender.js), lit by
// moonlight and all four candles. The desk lamp stays off at every stage
// of puzzle progress. Candle flames, rain and dust remain alive over it.
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
    this._candles = Object.entries(L.flames).map(([name, at], i) => ({
      halo: L.glows[name] ? glow(L.glows[name], 0.34) : null,
      flame: addCandleFlame(this, at),
      phase: i * 1.7,
    }));
  }

  tick(t) {
    for (const c of this._candles ?? []) {
      c.halo?.setAlpha(0.3 + 0.06 * Math.sin(t * 9 + c.phase) + Math.random() * 0.05);
      flickerCandleFlame(c.flame, t + c.phase);
    }
  }

  dustIn(L) {
    return L.dust;
  }
}
