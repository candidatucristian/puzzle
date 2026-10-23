import { glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { renderedLayout, paintRoomRender, roomRenderChest, hasRoomRender } from "../house/roomRender.js";
import ROOM5 from "../house/rooms/Room5.json";

/** Room 5, the drawing room, at night, seen from the corner by its door
 *  across to the hearth: deep red paper over a walnut dado, a herringbone
 *  parquet, a brass chandelier, a gilt glass over the mantel, the grate cold.
 *  It keeps the key to the last door. Three puzzles are found in it. A trap
 *  stands open in the floor before the hearth, its door thrown back on the
 *  boards and the head of an iron ladder coming up out of the cellar, a
 *  candle left cold beside it. In the far corner the Christmas tree, its
 *  lamps alight along each tier — just so many on each as its puzzle has
 *  them: they are the room's one light, with the moon. On the far wall a
 *  television left on, its glass full of snow. The gilt chest is on a little
 *  table by the armchair.
 *
 *  The room is a Blender render (art/blender/room_drawing.py), the chest
 *  apart. Blender wrote down where everything fell in the picture
 *  (house/rooms/Room5.json). */

const K = { room: "room5_room", glow: "room5_glow", shut: "room5_chest_shut", open: "room5_chest_open", key: "room5_key" };
export const ROOM5_SNOW = "room5_snow";

export function layoutRoom5(W, H) {
  const L = renderedLayout(W, H, ROOM5);
  L.tv = { glass: L.quads.tv, glow: { ...L.glows.tv, tint: 0xa8c4ff } };
  if (L.rain) L.rain.seed = 5505;
  return L;
}

export function paintRoom5(scene, L) {
  const t = scene.textures;
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, L.W, L.H);
  const rendered = hasRoomRender(scene, "Room5");
  if (rendered) paintRoomRender(ctx, scene, "Room5", L);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, rendered ? roomRenderChest(scene, "Room5", false) : makeCanvas(1, 1));
  addCanvasTexture(t, K.open, rendered ? roomRenderChest(scene, "Room5", true) : makeCanvas(1, 1));
  addCanvasTexture(t, K.key, paintKey());
  addCanvasTexture(t, ROOM5_SNOW, paintSnow());
  return { keys: K };
}

export function releaseRoom5Art(textures) {
  for (const key of [...Object.values(K), ROOM5_SNOW]) if (textures.exists(key)) textures.remove(key);
}

/** A square of television snow, for the scene to keep moving over the glass. */
function paintSnow() {
  const n = 256;
  const c = makeCanvas(n, n);
  const g = c.getContext("2d");
  const img = g.createImageData(n, n);
  const rnd = lcg(1953);
  for (let i = 0; i < n * n; i++) {
    const v = Math.round(18 + Math.pow(rnd(), 1.6) * 230);
    img.data[i * 4] = v * 0.94; img.data[i * 4 + 1] = v * 0.97; img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
