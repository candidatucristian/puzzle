import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { paintCandleFlame, releaseCandleFlame } from "../../shared/candleFlame.js";
import { renderedLayout, paintRoomRender, roomRenderChest, hasRoomRender } from "../house/roomRender.js";
import ROOM3 from "../house/rooms/Room3.json";

/** The third room off the hall, at night: the captain's room, where a man
 *  home from the sea kept what he had brought back, fitted out like a cabin
 *  and seen as one sitting down at its games table sees it. Close in front,
 *  the chess game left unfinished on the table, a candle at its corner. The
 *  left-hand wall leans in like a ship's side, two brass ports in it on the
 *  garden and the moon. Under the far port a round table with a ship in a
 *  bottle on it — a three-master under full sail on a painted sea — and a red
 *  storm lantern hung from the beam over it. On the right, standing out at an
 *  angle, a desk: an old mobile telephone on it, its little green screen
 *  alight, under a green-shaded lamp, and the gilt chest. A ship's wheel and
 *  a sea chart on the far wall.
 *
 *  Three puzzles are found here — the bottle, the board, the telephone. Each
 *  has its own light, which burns until its puzzle is solved.
 *
 *  The room is a Blender render (art/blender/room_cabin.py): a plate for each
 *  way the three lights can stand, the chest apart, the game on the board the
 *  puzzle's own. Blender wrote down where everything fell in the picture
 *  (house/rooms/Room3.json). */

const K = { room: "r3_room", glow: "r3_glow", shut: "r3_chest_shut", open: "r3_chest_open", key: "r3_key" };

/** `on` says which of the room's three lights still burn: `ship` the lantern
 *  over the bottle, `chess` the candle on the games table, `phone` the lamp
 *  over the telephone and the telephone's own screen. */
export function layoutRoom3(W, H, on = { ship: true, chess: true, phone: true }) {
  const L = renderedLayout(W, H, ROOM3);
  L.on = on;
  if (L.rain) L.rain.seed = 3303;
  return L;
}

export function paintRoom3(scene, L) {
  const t = scene.textures;
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, L.W, L.H);
  const rendered = hasRoomRender(scene, "Room3");
  if (rendered) paintRoomRender(ctx, scene, "Room3", L, [L.on.ship, L.on.chess, L.on.phone]);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, rendered ? roomRenderChest(scene, "Room3", false) : makeCanvas(1, 1));
  addCanvasTexture(t, K.open, rendered ? roomRenderChest(scene, "Room3", true) : makeCanvas(1, 1));
  addCanvasTexture(t, K.key, paintKey());
  paintCandleFlame(t);
  return { keys: K };
}

export function releaseRoom3Art(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
  releaseCandleFlame(textures);
}
