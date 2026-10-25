import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { paintCandleFlame, releaseCandleFlame } from "../../shared/candleFlame.js";
import { renderedLayout, paintRoomRender, roomRenderChest, hasRoomRender } from "../house/roomRender.js";
import STUDY from "../house/rooms/Study.json";

/** The study, the first room off the hall, at night, seen from the corner by
 *  its door, by the light of one candle burning on the writing desk and the
 *  moon. Close at hand a clear specimen table carries a glass case of earth
 *  with something growing in it. Further in, standing
 *  free in the floor, the writing desk with its candle and a small gilt
 *  chest; a green armchair pushed back toward the hearth, its fire dead. Over
 *  the mantel a brass cipher wheel on its walnut plaque. In the back wall a
 *  tall window, one leaf swung open on the garden and the moon, a terracotta
 *  pot on its oak sill with something just come up in it. A lower herbarium
 *  cabinet holds orderly reference books along the rest of that wall.
 *
 *  The case, the window and the wheel open puzzles; the chest is shut until
 *  all three are solved, then opens of itself and gives up a key.
 *
 *  The room is a Blender render (art/blender/room_study.py), the chest apart.
 *  Blender wrote down where everything fell in the picture
 *  (house/rooms/Study.json). */

const K = { room: "sd_room", glow: "sd_glow", shut: "sd_chest_shut", open: "sd_chest_open", key: "sd_key" };

export function layoutStudy(W, H) {
  const L = renderedLayout(W, H, STUDY);
  if (L.rain) L.rain.seed = 1101;
  return L;
}

export function paintStudy(scene, L) {
  const t = scene.textures;
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, L.W, L.H);
  const rendered = hasRoomRender(scene, "Study");
  if (rendered) paintRoomRender(ctx, scene, "Study", L);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, rendered ? roomRenderChest(scene, "Study", false) : makeCanvas(1, 1));
  addCanvasTexture(t, K.open, rendered ? roomRenderChest(scene, "Study", true) : makeCanvas(1, 1));
  addCanvasTexture(t, K.key, paintKey());
  paintCandleFlame(t);
  return { keys: K };
}

export function releaseStudyArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
  releaseCandleFlame(textures);
}
