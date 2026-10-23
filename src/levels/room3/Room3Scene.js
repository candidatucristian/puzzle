import Phaser from "phaser";
import RoomScene from "../house/RoomScene.js";
import { layoutRoom3, paintRoom3, releaseRoom3Art } from "./room3.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// The captain's room: the third room off the hall (see house/RoomScene.js for
// what every room does). Three puzzles are found in it: the ship in the
// bottle on the round table under the far port — a click goes into the
// bottle, and aboard — the chess game left on the games table, the old mobile
// telephone on the desk. The gilt chest is on the desk too.
//
// The room is a Blender render (room3.js; house/roomRender.js), lit by the
// storm lantern hung over the bottle and the moon through the ports. Live
// over it: the lantern, never still; the telephone's screen coming and going,
// as a telephone's does when it is ringing; dust in the moonlight.
// ─────────────────────────────────────────────────────────────────────────────

export default class Room3Scene extends RoomScene {
  constructor() {
    super("Room3");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room3");
  }

  layout(W, H) {
    return layoutRoom3(W, H);
  }

  paint(L) {
    return paintRoom3(this, L).keys;
  }

  release() {
    releaseRoom3Art(this.textures);
  }

  live(L, k, glow) {
    const g = L.glows;
    this._lantern = glow(g.lantern, 0.32);
    // the telephone's screen, lighting and dimming as it rings
    this._screen = this.add.image(g.screen.x, g.screen.y, k.glow).setDisplaySize(g.screen.r * 2, g.screen.r * 2).setTint(0x78ff78).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(-7);
  }

  tick(t) {
    this._lantern.setAlpha(0.3 + 0.05 * Math.sin(t * 9) + Math.random() * 0.05);
    this._screen.setAlpha(t % 3 < 1.6 ? 0.25 + 0.3 * Math.abs(Math.sin(t * 6)) : 0.12);
  }

  dustIn(L) {
    return L.dust;
  }
}
