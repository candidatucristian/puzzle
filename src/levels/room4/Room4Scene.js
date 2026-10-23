import RoomScene from "../house/RoomScene.js";
import { layoutRoom4, paintRoom4, releaseRoom4Art } from "./room4.js";
import { noiseBurst } from "../../shared/paint.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// The counting room: the fourth room off the hall (see house/RoomScene.js for
// what every room does). Three puzzles are found in it: the six numbered
// cards pinned on the cork board down the left-hand wall, the painting of
// birds on wires on the back wall, and the drawer of old tickets pulled out
// of the chest under the window. The gilt chest is on the counting table.
//
// The room is a Blender render (room4.js; house/roomRender.js), lit by the
// green lamp on the counting table and the moon. Live over it: that lamp,
// breathing; dust in the moonbeam.
// ─────────────────────────────────────────────────────────────────────────────

export default class Room4Scene extends RoomScene {
  constructor() {
    super("Room4");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room4");
  }

  layout(W, H) {
    return layoutRoom4(W, H);
  }

  paint(L) {
    return paintRoom4(this, L).keys;
  }

  release() {
    releaseRoom4Art(this.textures);
  }

  live(L, k, glow) {
    // the green lamp, breathing very slightly
    const lamp = glow(L.glows.desk, 0.16);
    this.ambientTween({ targets: lamp, alpha: { from: 0.14, to: 0.19 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  // The top drawer, shut until it is pulled: it slides out of the chest, on
  // its runners, and knocks to a stop.
  open(thing, L, k, animate) {
    const frames = k.drawer, last = frames.length - 1;
    const b = L.drawerBox;
    const drawer = this.add.image(b.x, b.y, frames[animate ? 0 : last]).setOrigin(0, 0).setDisplaySize(b.width, b.height).setDepth(-9);
    if (!animate) return 0;
    const ms = 650;
    const pull = { t: 0 };
    this.tweens.add({ targets: pull, t: 1, duration: ms, ease: "Cubic.easeOut", onUpdate: () => drawer.setTexture(frames[Math.round(pull.t * last)]).setDisplaySize(b.width, b.height) });
    noiseBurst(this, { dur: ms / 1000, freq: 520, q: 0.9, gain: 0.32, env: (x) => Math.min(1, x / 0.08) * (1 - x) ** 1.6 * (0.75 + 0.25 * Math.sin(x * 90)) });
    this.time.delayedCall(ms - 90, () => noiseBurst(this, { dur: 0.14, type: "lowpass", freq: 220, gain: 0.9, env: (x) => (1 - x) ** 3 }));
    return ms;
  }

  dustIn(L) {
    return L.dust;
  }
}
