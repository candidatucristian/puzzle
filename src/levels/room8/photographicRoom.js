import { addCanvasTexture, glowCanvas, makeCanvas, soft, vignette } from "../../shared/paint.js";
import { thingAt } from "../house/roomKit.js";

export const ROOM8_PHOTOGRAPH = "room8_photographic_interior_v2";
const SOURCE = { width: 1659, height: 948 };

export function loadRoom8Photography(scene) {
  if (!scene.textures.exists(ROOM8_PHOTOGRAPH)) {
    scene.load.image(ROOM8_PHOTOGRAPH, "assets/images/Room8/room8-photographic-v2.webp");
  }
}

export function alignRoom8Photography(L) {
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  const quad = points => points.map(([x, y]) => point(x, y));
  L.photographic = true;
  L.win = { ...L.win, cx: 1041 * sx, rx: 107 * sx, top: 124 * sy, sill: 428 * sy };
  L.things = [
    thingAt("balance", "Look at the balance", quad([[252, 413], [387, 413], [387, 572], [252, 572]])),
    thingAt("equations", "Look at the blackboard", quad([[385, 222], [815, 222], [815, 486], [385, 486]])),
    thingAt("measures", "Look at the bottles by the sink", quad([[1137, 426], [1307, 426], [1307, 538], [1137, 538]])),
  ];
  L.glows = {
    balance: { ...point(218, 444), r: 70 * sy },
    equations: { ...point(582, 213), r: 84 * sy },
    measures: { ...point(1324, 323), r: 60 * sy },
  };
}

export function paintRoom8Photography(scene, L, keys) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  ctx.drawImage(scene.textures.get(ROOM8_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  for (const [id, x, y, rx, ry] of [
    ["balance", 242, 519, 250, 260],
    ["equations", 586, 302, 285, 210],
    ["measures", 1302, 379, 215, 250],
  ]) if (!L.on[id]) {
    soft(ctx, x * sx, y * sy, rx * sx, ry * sy, "3,5,8", 0.7);
    const lamp = L.glows[id];
    soft(ctx, lamp.x, lamp.y, (id === "equations" ? 62 : 27) * sx, 25 * sy, "3,5,8", 0.93);
  }
  vignette(ctx, L.W, L.H, 0.19);
  addCanvasTexture(scene.textures, keys.room, canvas);
  addCanvasTexture(scene.textures, keys.glow, glowCanvas());
  return keys;
}
