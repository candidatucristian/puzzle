import RoomScene from "../house/RoomScene.js";
import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintCandleFlame, releaseCandleFlame, addCandleFlame, flickerCandleFlame } from "../../shared/candleFlame.js";
import { renderedLayout, paintRoomRender, hasRoomRender, loadRoomRender } from "../house/roomRender.js";
import ROOM11 from "../house/rooms/Room11.json";

// ─────────────────────────────────────────────────────────────────────────────
// Room 11, behind door XI off the physics hall: Orion's study (see
// house/RoomScene.js for what every room does), seen from a step up by the
// door across his workbench — an induction coil, a galvanometer, lenses on
// their stands, Leyden jars, a pendulum, a green-shaded lamp, the room's one
// light, with the moon at the tall sash window. On the slate a wave drawn
// twice and a pendulum swung out. Two puzzles are found here: at the bench's
// near corner his old counting frame, grey with dust; and on the windowsill
// his four ways of keeping time, a candle-clock alight among them.
//
// The room is a Blender render (art/blender/room_physics.py; the frame is
// counting_frame_model.py, the sill rewind_model.py; house/roomRender.js).
// Blender wrote down where everything fell in the picture
// (house/rooms/Room11.json). Live over it: the lamp's glow, the candle's flame.
// ─────────────────────────────────────────────────────────────────────────────

const K = { room: "room11_room", glow: "room11_glow" };

export default class Room11Scene extends RoomScene {
  constructor() {
    super("Room11");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room11");
  }

  layout(W, H) {
    const L = renderedLayout(W, H, ROOM11);
    if (L.rain) L.rain.seed = 1111;
    return L;
  }

  paint(L) {
    const c = makeCanvas(L.W, L.H), ctx = c.getContext("2d");
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, L.W, L.H);
    if (hasRoomRender(this, "Room11")) paintRoomRender(ctx, this, "Room11", L);
    addCanvasTexture(this.textures, K.room, c);
    addCanvasTexture(this.textures, K.glow, glowCanvas());
    paintCandleFlame(this.textures);
    return K;
  }

  release() {
    for (const key of Object.values(K)) if (this.textures.exists(key)) this.textures.remove(key);
    releaseCandleFlame(this.textures);
  }

  live(L, k, glow) {
    // the green lamp on the bench, breathing very slightly
    if (L.glows.lamp) {
      const light = glow(L.glows.lamp, 0.1, 0xffc078);
      this.ambientTween({ targets: light, alpha: { from: 0.08, to: 0.12 }, duration: 3100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    // the candle-clock on the sill, never still
    const at = L.flames.candle;
    this._candle = at ? addCandleFlame(this, at) : null;
  }

  tick(t) {
    flickerCandleFlame(this._candle, t);
  }

  dustIn(L) {
    return L.dust;
  }
}
