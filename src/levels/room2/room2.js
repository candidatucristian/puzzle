import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { renderedLayout, paintRoomRender, roomRenderChest, hasRoomRender } from "../house/roomRender.js";
import ROOM2 from "../house/rooms/Room2.json";

/** The baby's nursery (since 2026-11-05; it was the library): duck-egg plaster
 *  over walnut panelling, the cot in the middle on a soft rug, a sash window
 *  with linen curtains, and Silas's desk with its clocks and router kept in
 *  the corner. art/blender/room_nursery.py renders it; puzzle, coffer and rain
 *  coordinates use that same camera (house/rooms/Room2.json). */

const K = { room: "r2_room", glow: "r2_glow", shut: "r2_chest_shut", open: "r2_chest_open", key: "r2_key" };

export function layoutRoom2(W, H) {
  const L = renderedLayout(W, H, ROOM2);
  L.contours = Object.fromEntries(Object.entries(ROOM2.interactionContours ?? {}).map(([level, polygons]) => [
    level, polygons.map(points => points.map(([x, y]) => ({
      x: L.fit.x + x * L.fit.s, y: L.fit.y + y * L.fit.s,
    }))),
  ]));
  // Two small indicator lenses, projected through the render camera.
  L.leds = [L.extra["led-0"], L.extra["led-1"]];
  if (L.rain) {
    L.rain.seed = 2202;
    L.rain.cutouts = (ROOM2.rainCutouts ?? []).map(polygon => polygon.map(([x, y]) => [
      L.fit.x + x * L.fit.s, L.fit.y + y * L.fit.s,
    ]));
  }
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
  addCanvasTexture(t, K.key, paintKey(scene));
  return { keys: K };
}

export function releaseRoom2Art(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}
