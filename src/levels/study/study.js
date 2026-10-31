import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { paintCandleFlame, releaseCandleFlame } from "../../shared/candleFlame.js";
import { renderedLayout, paintRoomRender, roomRenderChest, hasRoomRender } from "../house/roomRender.js";
import STUDY from "../house/rooms/Study.json";

/** The study, the first room off the hall, at night, seen from low by its
 *  door straight across to the back wall: sage walls over dark oak, the
 *  white stone fireplace on the left, its fire laid and cold, two candles on
 *  the mantel and the brass cipher wheel on its walnut plaque over it; the
 *  tall round-headed window in the middle, rain on the garden beyond, a
 *  terracotta pot on its sill with something just come up in it; books from
 *  floor to cornice on the right and along the right-hand wall, a ladder.
 *  In the middle of the room the writing desk, facing us, its brass lamp
 *  unlit, two lit candles, letters, and the small gilt chest. Close at hand,
 *  left, the old leather armchair before the hearth; right, on a round
 *  table, the glass case of earth, roots against its glass, the green
 *  specimen book of The Old Tree close-up beside it.
 *
 *  The case, the window and the wheel open puzzles; the chest is shut until
 *  all three are solved, then opens of itself and gives up a key.
 *
 *  The room is a Blender render (art/blender/room_study_v4.py), the chest apart.
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
