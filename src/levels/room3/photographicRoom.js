import { soft, vignette, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { roomLayout, thingAt } from "../house/roomKit.js";
import { paintRoomChess } from "../chessboard/photographicChess.js";

export const ROOM3_PHOTOGRAPH = "room3_photographic_interior_v2";
export const ROOM3_FLAME = "r3_photographic_flame";
const REF = { width: 1792, height: 1024 };

export function loadRoom3Photography(scene) {
  if (!scene.textures.exists(ROOM3_PHOTOGRAPH)) scene.load.image(ROOM3_PHOTOGRAPH, "assets/images/Room3/room3-photographic-v2.png");
}

export function alignRoom3Photography(L) {
  const reference = roomLayout(REF.width, REF.height), sx = L.W / REF.width, sy = L.H / REF.height;
  L.half = reference.half; L.top = reference.top; L.cm = reference.cm * sy;
  L.Q = (x, y, depth) => {
    const p = reference.Q(x, y, depth);
    return { x: p.x * sx, y: p.y * sy, s: p.s * sy };
  };
  L.photographic = true;
}

export function placeRoom3PhotoChest(L) {
  const c = L.chest, width = c.x1 - c.x0, depth = (c.d0 + c.d1) / 2;
  // The photograph's desk is wider and higher than the old blockout.
  // Move the physical chest before chestAt builds its lid, key and hit area.
  const x = (1443 / 1659 * REF.width - REF.width / 2) * depth / 1228.8;
  const y = 150 - (525 / 948 * REF.height - REF.height * 0.44) * depth / 1228.8;
  c.x0 = x - width / 2; c.x1 = x + width / 2; c.y0 = y; c.y1 = y + 7.5;
}

export function alignRoom3Objects(L) {
  const sx = L.W / 1659, sy = L.H / 948;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  const rect = (x, y, w, h) => [point(x, y), point(x + w, y), point(x + w, y + h), point(x, y + h)];
  const boardX = (835 / 1659 * REF.width - REF.width / 2) * 442 / 1228.8;
  L.board = { ...L.board, x0: boardX - 24, x1: boardX + 24, y: 104 };
  L.win = { ...L.win, cx: 870 * sx, rx: 97 * sx, top: 181 * sy, sill: 374 * sy };
  L.things = [
    thingAt("compass", "Look into the bottle", rect(328, 415, 302, 128)),
    thingAt("chessboard", "Look at the chessboard", rect(754, 503, 162, 49)),
    thingAt("mobilephone", "Pick up the telephone", rect(1266, 449, 42, 75)),
  ];
  L.glows = {
    lantern: { ...point(283, 489), r: 70 * sy },
    flame: { ...point(925, 458), r: 43 * sy },
    desk: { ...point(1174, 426), r: 98 * sy },
    screen: { ...point(1287, 474), r: 7 * sy },
  };
}

export function paintRoom3Photography(ctx, scene, L, game) {
  if (!L.photographic) return false;
  ctx.drawImage(scene.textures.get(ROOM3_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  paintRoomChess(ctx, scene, L, game);
  for (const [on, at, rx, ry] of [
    [L.on.ship, L.glows.lantern, 220, 240],
    [L.on.chess, L.glows.flame, 100, 130],
    [L.on.phone, L.glows.desk, 210, 210],
  ]) if (!on) soft(ctx, at.x, at.y, rx * L.W / 1659, ry * L.H / 948, "3,7,12", 0.64);
  vignette(ctx, L.W, L.H, 0.14);
  return true;
}

export function paintRoom3Flame(textures) {
  const canvas = makeCanvas(24, 64), ctx = canvas.getContext("2d");
  const fire = ctx.createLinearGradient(0, 5, 0, 60);
  fire.addColorStop(0, "rgba(255,141,45,0.2)"); fire.addColorStop(0.34, "#ffe38f");
  fire.addColorStop(0.76, "#fff6c7"); fire.addColorStop(1, "rgba(102,142,230,0.6)");
  ctx.fillStyle = fire; ctx.shadowColor = "#ffb04a"; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.moveTo(12, 60); ctx.bezierCurveTo(0, 53, 5, 28, 14, 5);
  ctx.bezierCurveTo(12, 30, 26, 48, 12, 60); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,235,0.85)";
  ctx.beginPath(); ctx.ellipse(12, 47, 2.5, 10, 0, 0, Math.PI * 2); ctx.fill();
  addCanvasTexture(textures, ROOM3_FLAME, canvas);
}
