import RoomScene from "../house/RoomScene.js";
import { layoutRoom2, paintRoom2, releaseRoom2Art } from "./room2.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// The nursery: the second room off the hall (see house/RoomScene.js for what
// every room does). Three puzzles are found in it: the cot in the middle of
// the room, the clocks on and over Silas's desk in its corner, the router at
// the end of that desk. The gilt chest is on the toy chest by the right wall.
//
// The Cycles room (art/blender/room_nursery.py) is lit by its night light and
// the green lamp, their light given back warm off the ceiling, and the moon at
// its window. Its photographed light stays steady; only two tiny router
// lenses change. What opens a puzzle sparkles as in every room
// (house/RoomScene.js).
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

  live(L) {
    this._leds = L.leds.map((p) => this.add.ellipse(p.x, p.y, 0.38 * p.s, 0.32 * p.s, 0x71977c)
      .setAlpha(0.35).setDepth(-7));
  }

  tick(t) {
    this._leds.forEach((led, i) => led.setAlpha(Math.floor(t * 1.8 + i * 1.3) % 3 === 0 ? 0.55 : 0.15));
  }
}
