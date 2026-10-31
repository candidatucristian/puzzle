import Phaser from "phaser";
import RoomScene from "../house/RoomScene.js";
import { layoutRoom2, paintRoom2, releaseRoom2Art } from "./room2.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// The library: the second room off the hall (see house/RoomScene.js for what
// every room does). Three puzzles are found in it: the books across the far
// wall, the clocks on and over the clerk's desk, the router on the reading
// table. The gilt chest is on the table too.
//
// The room is a Blender render (room2.js; house/roomRender.js), lit by the
// green lamp on the reading table and the moon. Live over it: that lamp,
// breathing; two of the router's lights flashing; the clock's colon; dust in
// the moonbeams.
// ─────────────────────────────────────────────────────────────────────────────

export default class Room2Scene extends RoomScene {
  constructor() {
    super("Room2");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room2");
  }

  layout(W, H) {
    return layoutRoom2(W, H);
  }

  paint(L) {
    return paintRoom2(this, L).keys;
  }

  release() {
    releaseRoom2Art(this.textures);
  }

  live(L, k, glow) {
    // the green lamp, breathing very slightly
    const lamp = glow(L.glows.desk, 0.16);
    this.ambientTween({ targets: lamp, alpha: { from: 0.14, to: 0.19 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    // the router: two of its lights flashing, one after the other
    this._leds = L.leds.map((p) => this.add.image(p.x, p.y, k.glow).setDisplaySize(3.4 * p.s, 3.4 * p.s).setTint(0x28ff6c).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(-7));
    // the clock's colon, going on and off with the seconds
    this._colon = this.add.image(L.colon.x, L.colon.y, k.glow).setDisplaySize(16 * L.colon.s, 22 * L.colon.s).setTint(0xff3018).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(-7);
  }

  tick(t) {
    this._leds.forEach((led, i) => led.setAlpha(Math.floor(t * 2.6 + i * 1.3) % 3 === 0 ? 0.75 : 0.1));
    this._colon.setAlpha(Math.floor(t) % 2 ? 0.55 : 0.12);
  }

  dustIn(L) {
    return L.dust;
  }
}
