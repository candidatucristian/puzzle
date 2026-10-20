import { addCanvasTexture, glowCanvas, makeCanvas, polygon, soft, vignette } from "../../shared/paint.js";
import { thingAt } from "../house/roomKit.js";

export const ROOM7_PHOTOGRAPH = "room7_photographic_interior_v1";
const SOURCE = { width: 1659, height: 948 };
// The notebook remains a photographed book when it is pulled from the shelf.
const NOTEBOOK = [[1507, 391], [1545, 395], [1533, 494], [1492, 488]];

export function loadRoom7Photography(scene) {
  if (!scene.textures.exists(ROOM7_PHOTOGRAPH)) {
    scene.load.image(ROOM7_PHOTOGRAPH, "assets/images/Room7/room7-photographic-v1.png");
  }
}

export function alignRoom7Photography(L) {
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  const quad = points => points.map(([x, y]) => point(x, y));
  L.photographic = true;
  L.win = { ...L.win, cx: 1068 * sx, rx: 136 * sx, top: 125 * sy, sill: 458 * sy };
  L.things = [
    thingAt("chemistry", "Look at the bottles", quad([[600, 428], [771, 428], [771, 546], [600, 546]])),
    Object.assign(thingAt("molecules", "Take out his notebook", quad([[1480, 384], [1552, 385], [1540, 501], [1477, 498]])), { before: true }),
  ];
  L.glows = {
    lamp: { ...point(419, 427), r: 85 * sy },
    burner: { ...point(817, 497), r: 38 * sy },
  };
  L.photoUranium = { ...point(716, 493), r: 16 * sy };
}

export function paintRoom7Photography(scene, L, keys) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  ctx.drawImage(scene.textures.get(ROOM7_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  if (!L.on) {
    for (const [at, rx, ry] of [[L.glows.lamp, 250, 255], [L.glows.burner, 115, 135]]) {
      soft(ctx, at.x, at.y, rx * L.W / SOURCE.width, ry * L.H / SOURCE.height, "3,5,8", 0.72);
      soft(ctx, at.x, at.y, 14 * L.W / SOURCE.width, 24 * L.H / SOURCE.height, "3,5,8", 0.94);
    }
  }
  vignette(ctx, L.W, L.H, 0.19);
  addCanvasTexture(scene.textures, keys.room, canvas);
  addCanvasTexture(scene.textures, keys.glow, glowCanvas());
  return keys;
}

export function paintRoom7Notebook(ctx, scene, L, fraction) {
  if (fraction <= 0) return;
  const dx = -18 * fraction, dy = 4 * fraction;
  const points = NOTEBOOK.map(([x, y]) => ({ x, y }));
  const shifted = points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  ctx.save();
  ctx.scale(L.W / SOURCE.width, L.H / SOURCE.height);
  polygon(ctx, points); ctx.fillStyle = "#100d09"; ctx.fill();
  // The exposed page block and cover return connect the book to its shelf.
  polygon(ctx, [points[0], points[1], shifted[1], shifted[0]]);
  ctx.fillStyle = "#9b8b65"; ctx.fill();
  polygon(ctx, [points[1], points[2], shifted[2], shifted[1]]);
  ctx.fillStyle = "#172119"; ctx.fill();
  ctx.translate(dx, dy);
  polygon(ctx, points); ctx.clip();
  ctx.drawImage(scene.textures.get(ROOM7_PHOTOGRAPH).getSourceImage(), 0, 0, SOURCE.width, SOURCE.height);
  ctx.restore();
}
