import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { renderedLayout, paintRoomRender, roomRenderChest, hasRoomRender } from "../house/roomRender.js";
import ROOM2 from "../house/rooms/Room2.json";

/** The second room off the hall, at night: the library, where the house kept
 *  its books and its accounts, seen from its door down the length of the
 *  room, by the light of the green-shaded lamp on the reading table and the
 *  moon. Bookcases down the left-hand wall, a leather armchair turned out
 *  from them by a standard lamp, cold. Two tall sash windows in the right-hand
 *  wall between red curtains, the moon's light lying across the floor. Down
 *  the middle the long reading table: at its near end an old router, its
 *  lights telling, and the gilt chest. At the far end the clerk's desk with
 *  its clocks — an alarm clock, a clock radio, a travel clock, a calculator,
 *  a red LED clock on the wall over it, every one of them stopped — and
 *  beside it a wall of books, five of them standing a little out on one
 *  shelf, a marker in each.
 *
 *  Three puzzles are found here — the books, the clocks, the router.
 *
 *  The room is a Blender render (art/blender/room_library.py), the chest
 *  apart, the clocks' faces the puzzle's own. Blender wrote down where
 *  everything fell in the picture (house/rooms/Room2.json). */

const K = { room: "r2_room", glow: "r2_glow", shut: "r2_chest_shut", open: "r2_chest_open", key: "r2_key" };

export function layoutRoom2(W, H) {
  const L = renderedLayout(W, H, ROOM2);
  // the two lights of the router that tell, and the wall clock's colon
  L.leds = [L.extra["led-0"], L.extra["led-1"]];
  L.colon = L.extra.colon;
  if (L.rain) L.rain.seed = 2202;
  return L;
}

export function paintRoom2(scene, L) {
  const t = scene.textures;
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, L.W, L.H);
  const rendered = hasRoomRender(scene, "Room2");
  if (rendered) paintRoomRender(ctx, scene, "Room2", L);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, rendered ? roomRenderChest(scene, "Room2", false) : makeCanvas(1, 1));
  addCanvasTexture(t, K.open, rendered ? roomRenderChest(scene, "Room2", true) : makeCanvas(1, 1));
  addCanvasTexture(t, K.key, paintKey());
  return { keys: K };
}

export function releaseRoom2Art(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}
