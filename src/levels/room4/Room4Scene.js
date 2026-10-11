import RoomScene from "../house/RoomScene.js";
import { layoutRoom4, paintRoom4, releaseRoom4Art } from "./room4.js";

// ─────────────────────────────────────────────────────────────────────────────
// The counting room: the fourth room off the hall (see house/RoomScene.js for
// what every room does). Three puzzles are found in it: the six numbered
// cards pinned on the cork board over the desk, the painting of a street
// hung beside them, and the drawer of old tickets pulled out of the chest
// under the window. The gilt chest is on the desk's far end.
//
// The room is painted (room4.js). Each puzzle's light — the picture light
// over the board and the lamp on the desk, the light over the painting, the
// candle on the chest of drawers — burns only until that puzzle is solved.
// Live over the painting: those lights, the embers in the stove (which stay
// in), and dust in the moonbeam.
// ─────────────────────────────────────────────────────────────────────────────

// which puzzle each of the room's lights is lit for
const LIT_FOR = { cards: "sequence", painting: "crossing", drawer: "station" };

export default class Room4Scene extends RoomScene {
  constructor() {
    super("Room4");
  }

  layout(W, H, levels) {
    const on = {};
    for (const [light, level] of Object.entries(LIT_FOR)) on[light] = !levels.isCompleted(levels.indexOf(level));
    return layoutRoom4(W, H, on);
  }

  paint(L) {
    return paintRoom4(this, L).keys;
  }

  release() {
    releaseRoom4Art(this.textures);
  }

  live(L, k, glow) {
    // the stove's embers, always
    this._embers = glow(L.glows.stove, 0.3, 0xff7a28);
    // whichever lamps still burn, breathing very slightly
    const lamps = [];
    if (L.on.cards) lamps.push([L.glows.desk, 0.18], [L.glows.picture, 0.14]);
    if (L.on.painting) lamps.push([L.glows.painting, 0.14]);
    if (L.on.drawer) lamps.push([L.glows.candle, 0.2]);
    for (const [at, a] of lamps) {
      const lamp = glow(at, a);
      this.ambientTween({ targets: lamp, alpha: { from: a * 0.85, to: a * 1.2 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  tick(t) {
    this._embers.setAlpha(0.26 + 0.07 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 7.3));
  }

  // with the lamps out there is only the moon on the chest
  chestTint(L) {
    return L.on.cards ? null : 0x9aa0b8;
  }

  dustIn(L) {
    const w = L.win;
    return { x: w.cx - w.rx * 1.8, y: w.top, width: w.rx * 3, height: L.H * 0.8 - w.top };
  }
}
