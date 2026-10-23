import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { renderedLayout, paintRoomRender, roomRenderChest, hasRoomRender } from "../house/roomRender.js";
import ROOM2 from "../house/rooms/Room2.json";

/** The second room off the hall, at night: the library, where the house kept
 *  its books and its accounts, seen from its door down the length of the
 *  room. Bookcases down the left-hand wall, a leather armchair turned out
 *  from them under a standard lamp. Two tall sash windows in the right-hand
 *  wall between red curtains, the moon's light lying across the floor. Down
 *  the middle a long reading table: at its near end an old router under a
 *  green-shaded lamp, and the gilt chest. At the far end the clerk's desk
 *  with its clocks — an alarm clock, a clock radio, a travel clock, a
 *  calculator, a red LED clock on the wall over it, every one of them
 *  stopped — and beside it a wall of books, five of them standing a little
 *  out on one shelf, a marker in each.
 *
 *  Three puzzles are found here — the books, the clocks, the router. Each has
 *  its own light, which burns until its puzzle is solved.
 *
 *  The room is a Blender render (art/blender/room_library.py): a plate for
 *  each way the three lights can stand, the chest apart, the clocks' faces
 *  the puzzle's own. Blender wrote down where everything fell in the picture
 *  (house/rooms/Room2.json). */

const K = { room: "r2_room", glow: "r2_glow", shut: "r2_chest_shut", open: "r2_chest_open", key: "r2_key" };

/** `on` says which of the room's three lights still burn: `shelf` the
 *  standard lamp by the armchair, `desk` the green lamp over the router (and
 *  the router's lights), `clock` the lamp on the clerk's desk and the clocks'
 *  own digits. */
export function layoutRoom2(W, H, on = { shelf: true, desk: true, clock: true }) {
  const L = renderedLayout(W, H, ROOM2);
  L.on = on;
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
  if (rendered) paintRoomRender(ctx, scene, "Room2", L, [L.on.shelf, L.on.desk, L.on.clock]);
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
