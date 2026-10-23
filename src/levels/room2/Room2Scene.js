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
// The room is a Blender render (room2.js; house/roomRender.js). Each puzzle
// has its own light, and each light burns only until its puzzle is solved:
// the standard lamp by the armchair, the clerk's lamp and the clocks' digits,
// the green lamp over the router. Live over the render: those lights, two of
// the router's lights flashing, the clock's colon, dust in the moonbeams.
// ─────────────────────────────────────────────────────────────────────────────

// which puzzle each of the room's lights is lit for
const LIT_FOR = { shelf: "bookshelf", desk: "modem", clock: "overtime" };

export default class Room2Scene extends RoomScene {
  constructor() {
    super("Room2");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room2");
  }

  layout(W, H, levels) {
    const on = {};
    for (const [light, level] of Object.entries(LIT_FOR)) on[light] = !levels.isCompleted(levels.indexOf(level));
    return layoutRoom2(W, H, on);
  }

  paint(L) {
    return paintRoom2(this, L).keys;
  }

  release() {
    releaseRoom2Art(this.textures);
  }

  live(L, k, glow) {
    const on = L.on, g = L.glows;
    // the lamps, breathing very slightly
    for (const [lit, at, a] of [[on.shelf, g.stand, 0.2], [on.desk, g.desk, 0.18], [on.clock, g.office, 0.16]]) {
      if (!lit) continue;
      const lamp = glow(at, a);
      this.ambientTween({ targets: lamp, alpha: { from: a * 0.85, to: a * 1.2 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    // the router: two of its lights flashing, one after the other
    this._leds = on.desk
      ? L.leds.map((p) => this.add.image(p.x, p.y, k.glow).setDisplaySize(9 * p.s, 9 * p.s).setTint(0x28ff6c).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(-7))
      : [];
    // the clock's colon, going on and off with the seconds
    this._colon = on.clock
      ? this.add.image(L.colon.x, L.colon.y, k.glow).setDisplaySize(16 * L.colon.s, 22 * L.colon.s).setTint(0xff3018).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(-7)
      : null;
  }

  tick(t) {
    this._leds.forEach((led, i) => led.setAlpha(Math.floor(t * 2.6 + i * 1.3) % 3 === 0 ? 0.9 : 0.12));
    this._colon?.setAlpha(Math.floor(t) % 2 ? 0.55 : 0.12);
  }

  // with the desk lamp out there is only the moon on the chest
  chestTint(L) {
    return L.on.desk ? null : 0x9aa0b8;
  }

  dustIn(L) {
    return L.dust;
  }
}
