import RoomScene from "../house/RoomScene.js";
import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { renderedLayout, paintRoomRender, hasRoomRender, loadRoomRender } from "../house/roomRender.js";
import ROOM8 from "../house/rooms/Room8.json";

// ─────────────────────────────────────────────────────────────────────────────
// Room 8, behind door VIII off the chemist's hall: his weighing room (see
// house/RoomScene.js for what every room does), seen from its door down its
// length. Three things he left half done, and a puzzle in each: on the island
// bench in the middle his apothecary's balance — the beam leaning, a phial on
// its pan — its box of weights open and four phials beside it, a green
// enamel lamp hung low over them; the blackboard standing out in the room on
// its frame, three reactions on it, a lamp clamped to its top; and at the far
// end, on the slate by the sink under the window, two plain bottles and a
// volumetric flask, a small lamp on the wall beside them, cold. The green
// lamp over the bench is the room's one light, with the moon.
//
// The room is a Blender render (art/blender/room_weighing.py;
// house/roomRender.js).
// Blender wrote down where everything fell in the picture
// (house/rooms/Room8.json).
// ─────────────────────────────────────────────────────────────────────────────

const K = { room: "room8_room", glow: "room8_glow" };

export default class Room8Scene extends RoomScene {
  constructor() {
    super("Room8");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room8");
  }

  layout(W, H) {
    const L = renderedLayout(W, H, ROOM8);
    if (L.rain) L.rain.seed = 8808;
    return L;
  }

  paint(L) {
    const c = makeCanvas(L.W, L.H), ctx = c.getContext("2d");
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, L.W, L.H);
    if (hasRoomRender(this, "Room8")) paintRoomRender(ctx, this, "Room8", L);
    addCanvasTexture(this.textures, K.room, c);
    addCanvasTexture(this.textures, K.glow, glowCanvas());
    return K;
  }

  release() {
    for (const key of Object.values(K)) if (this.textures.exists(key)) this.textures.remove(key);
  }

  live(L, k, glow) {
    // the green lamp over the bench, breathing very slightly
    const light = glow(L.glows.balance, 0.14, 0xffcf8a);
    this.ambientTween({ targets: light, alpha: { from: 0.12, to: 0.17 }, duration: 3600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  dustIn(L) {
    return L.dust;
  }
}
