import { makeCanvas, soft, vignette } from "../../shared/paint.js";
import { roomLayout, thingAt } from "../house/roomKit.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { paintCrossingPhoto, code39Bars } from "../crossing/street.js";

export const ROOM4_INTERIOR = "room4_photographic_interior_v2";
const REF = { width: 1792, height: 1024 };
const SOURCE = { width: 1659, height: 948 };

export function loadRoom4Interior(scene) {
  if (!scene.textures.exists(ROOM4_INTERIOR)) scene.load.image(ROOM4_INTERIOR, "assets/images/Room4/room4-photographic-v2.png");
}

export function alignRoom4Perspective(L) {
  const reference = roomLayout(REF.width, REF.height), sx = L.W / REF.width, sy = L.H / REF.height;
  L.half = reference.half; L.top = reference.top; L.cm = reference.cm * sy;
  L.Q = (x, y, depth) => {
    const p = reference.Q(x, y, depth);
    return { x: p.x * sx, y: p.y * sy, s: p.s * sy };
  };
  L.photographic = true;
}

function worldX(x, depth) { return (x / SOURCE.width * REF.width - REF.width / 2) * depth / 1228.8; }
function worldY(y, depth) { return 150 - (y / SOURCE.height * REF.height - REF.height * 0.44) * depth / 1228.8; }

export function placeRoom4PhotoChest(L) {
  const c = L.chest, depth = (c.d0 + c.d1) / 2, width = c.x1 - c.x0;
  const x = worldX(730, depth), y = worldY(513, depth);
  c.x0 = x - width / 2; c.x1 = x + width / 2; c.y0 = y; c.y1 = y + 7.5;
}

export function room4PhotoCabinet() {
  return { x0: worldX(994, 554) - 3, x1: worldX(1106, 554) + 3, h: worldY(512, 554) + 6 };
}

export function alignRoom4PhotoObjects(L) {
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  const quad = points => points.map(([x, y]) => point(x, y));
  L.win = { ...L.win, cx: 1037 * sx, rx: 60 * sx, top: 138 * sy, sill: 342 * sy };
  L.painting.photoQuad = quad([[110, 230], [232, 269], [230, 408], [109, 410]]);
  L.things[0] = thingAt("sequence", "Look at the cards", quad([[449, 261], [785, 261], [785, 398], [449, 398]]));
  L.things[1] = thingAt("crossing", "Look at the painting", quad([[93, 192], [251, 247], [245, 436], [90, 436]]));
  L.glows = {
    desk: { ...point(448, 430), r: 92 * sy },
    picture: { ...point(613, 243), r: 68 * sy },
    stove: { ...point(1275, 582), r: 55 * sy },
    painting: { ...point(167, 195), r: 60 * sy },
    candle: { ...point(1023, 439), r: 50 * sy },
  };
  L.cabinetCandle = { x: worldX(1023, 574), y: worldY(490, 574), d: 574 };
}

export function paintRoom4Interior(ctx, scene, L, cards, crossing) {
  if (!L.photographic) return false;
  ctx.drawImage(scene.textures.get(ROOM4_INTERIOR).getSourceImage(), 0, 0, L.W, L.H);
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  // The photograph supplies actual pinned paper; keep all six clue values exact.
  ctx.save();
  ctx.fillStyle = "#2b2013";
  ctx.font = `600 ${22 * sy}px "Special Elite", "Courier New", monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const centres = [493, 543, 593, 643, 693, 743];
  cards.forEach((value, index) => ctx.fillText(String(value), centres[index] * sx, 333 * sy));
  ctx.restore();
  // Keep the original street and exact worn crossing clue inside the real frame.
  const painting = makeCanvas(640, 360);
  paintCrossingPhoto(painting.getContext("2d"), 640, 360, crossing, code39Bars("GO"));
  const [a, b, c, d] = L.painting.photoQuad;
  paintProjectedMaterial(ctx, painting, (u, v) => ({
    x: a.x * (1 - u) * (1 - v) + b.x * u * (1 - v) + c.x * u * v + d.x * (1 - u) * v,
    y: a.y * (1 - u) * (1 - v) + b.y * u * (1 - v) + c.y * u * v + d.y * (1 - u) * v,
  }), 0.9, 6, 6);
  for (const [on, at, rx, ry] of [
    [L.on.cards, L.glows.desk, 245, 240],
    [L.on.cards, L.glows.picture, 220, 150],
    [L.on.painting, L.glows.painting, 140, 200],
    [L.on.drawer, L.glows.candle, 140, 190],
  ]) if (!on) soft(ctx, at.x, at.y, rx * sx, ry * sy, "3,5,9", 0.65);
  vignette(ctx, L.W, L.H, 0.13);
  return true;
}
