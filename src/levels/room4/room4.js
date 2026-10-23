import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { renderedLayout, paintRoomRender, roomRenderChest, roomRenderPicture, hasRoomRender } from "../house/roomRender.js";
import ROOM4 from "../house/rooms/Room4.json";

/** The fourth room off the hall, at night: the counting room, seen from the
 *  step inside its door, from above. In the middle of the stone floor,
 *  standing free, the counting table: a green-shaded lamp, a ledger, brass
 *  scales, the gilt chest. Down the left-hand wall a long cork board with six
 *  index cards pinned along it, each with a number on it, a brass picture
 *  light over it; an iron stove in the far corner, its fire out.
 *  On the back wall a painting in a dull gilt frame — a farmhouse at dawn,
 *  six birds on five wires — under a light of its own; a small leaded window
 *  set high and deep, the moon's light coming down from it; under the window
 *  a chest of three drawers, a candle on it, its top drawer shut until it is
 *  pulled out, old tickets in it; a tall case of registers.
 *
 *  Three puzzles are found here — the cards, the painting, the drawer. The
 *  room is lit by the green lamp on the counting table and the moon; the
 *  picture lights and the candle are cold, the stove out.
 *
 *  The room is a Blender render (art/blender/room_counting.py), the chest
 *  apart, and the top drawer coming out in ten frames. The cards and the
 *  painting are the puzzles' own. Blender wrote down where everything fell
 *  in the picture (house/rooms/Room4.json). */

const K = { room: "r4_room", glow: "r4_glow", shut: "r4_chest_shut", open: "r4_chest_open", key: "r4_key" };
const DRAWER = Array.from({ length: 10 }, (_, i) => `r4_drawer_${i}`);

export function layoutRoom4(W, H) {
  const L = renderedLayout(W, H, ROOM4);
  // the patch of the screen the top drawer comes out over
  L.drawerBox = L.extra.drawer;
  if (L.rain) L.rain.seed = 4404;
  return L;
}

export function paintRoom4(scene, L) {
  const t = scene.textures;
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, L.W, L.H);
  const rendered = hasRoomRender(scene, "Room4");
  if (rendered) paintRoomRender(ctx, scene, "Room4", L);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, rendered ? roomRenderChest(scene, "Room4", false) : makeCanvas(1, 1));
  addCanvasTexture(t, K.open, rendered ? roomRenderChest(scene, "Room4", true) : makeCanvas(1, 1));
  addCanvasTexture(t, K.key, paintKey());
  // the top drawer coming out, frame by frame, laid over the room where it is
  if (rendered) {
    const b = L.drawerBox;
    DRAWER.forEach((key, i) => addCanvasTexture(t, key, roomRenderPicture(scene, "Room4", `drawer-${i}`, Math.round(b.width), Math.round(b.height))));
  }
  return { keys: { ...K, drawer: DRAWER } };
}

export function releaseRoom4Art(textures) {
  for (const key of [...Object.values(K), ...DRAWER]) if (textures.exists(key)) textures.remove(key);
}
