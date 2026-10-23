import Phaser from "phaser";
import RoomScene from "../house/RoomScene.js";
import { layoutRoom3, paintRoom3, releaseRoom3Art } from "./room3.js";
import { addCandleFlame, flickerCandleFlame } from "../../shared/candleFlame.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// The captain's room: the third room off the hall (see house/RoomScene.js for
// what every room does). Three puzzles are found in it: the ship in the
// bottle on the round table under the far port — a click goes into the
// bottle, and aboard — the chess game left on the games table, the old mobile
// telephone on the desk. The gilt chest is on the desk too.
//
// The room is a Blender render (room3.js; house/roomRender.js). Each puzzle
// has its own light, and each light burns only until its puzzle is solved:
// the storm lantern over the bottle, the candle on the games table, the lamp
// over the telephone and the telephone's own screen. Live over the render:
// those lights — the screen coming and going, as a telephone's does when it
// is ringing — and dust in the moonlight from the ports.
// ─────────────────────────────────────────────────────────────────────────────

// which puzzle each of the room's lights is lit for
const LIT_FOR = { ship: "compass", chess: "chessboard", phone: "mobilephone" };

export default class Room3Scene extends RoomScene {
  constructor() {
    super("Room3");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room3");
  }

  layout(W, H, levels) {
    const on = {};
    for (const [light, level] of Object.entries(LIT_FOR)) on[light] = !levels.isCompleted(levels.indexOf(level));
    return layoutRoom3(W, H, on);
  }

  paint(L) {
    return paintRoom3(this, L).keys;
  }

  release() {
    releaseRoom3Art(this.textures);
  }

  live(L, k, glow) {
    const on = L.on, g = L.glows;
    // the lantern and the candle, never still; the lamp, breathing
    this._flames = [on.ship && glow(g.lantern, 0.34), on.chess && glow(g.flame, 0.4)].filter(Boolean);
    this._candleBody = on.chess ? addCandleFlame(this, L.flames.candle) : null;
    if (on.phone) {
      const lamp = glow(g.desk, 0.18);
      this.ambientTween({ targets: lamp, alpha: { from: 0.15, to: 0.22 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    // the telephone's screen, lighting and dimming as it rings
    this._screen = on.phone
      ? this.add.image(g.screen.x, g.screen.y, k.glow).setDisplaySize(g.screen.r * 2, g.screen.r * 2).setTint(0x78ff78).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(-7)
      : null;
  }

  tick(t) {
    this._flames.forEach((flame, i) => flame.setAlpha(0.34 + 0.06 * Math.sin(t * 9 + i * 2) + Math.random() * 0.05));
    this._screen?.setAlpha(t % 3 < 1.6 ? 0.25 + 0.3 * Math.abs(Math.sin(t * 6)) : 0.12);
    flickerCandleFlame(this._candleBody, t);
  }

  // with the desk lamp out there is only the moon on the chest
  chestTint(L) {
    return L.on.phone ? null : 0x9aa0b8;
  }

  dustIn(L) {
    return L.dust;
  }
}
