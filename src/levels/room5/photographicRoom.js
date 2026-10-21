import { makeCanvas, addCanvasTexture, glowCanvas, soft, vignette } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { roomLayout, chestAt, paintChest, thingAt } from "../house/roomKit.js";
import { paintRoomTree } from "./roomTree.js";

export const ROOM5_PHOTOGRAPH = "room5_photographic_interior_v2";
export const ROOM5_REFERENCE = { width: 1792, height: 1024 };
const SOURCE = { width: 1659, height: 948 };

export function loadRoom5Photography(scene) {
  if (!scene.textures.exists(ROOM5_PHOTOGRAPH)) scene.load.image(ROOM5_PHOTOGRAPH, "assets/images/Room5/room5-photographic-v2.webp");
}

export function alignRoom5Photography(L, W, H) {
  const reference = roomLayout(ROOM5_REFERENCE.width, ROOM5_REFERENCE.height);
  const sx = W / ROOM5_REFERENCE.width, sy = H / ROOM5_REFERENCE.height;
  L.W = W; L.H = H; L.u = Math.min(W / 1000, H / 700);
  L.vp = { x: W * 0.5, y: H * 0.44 };
  L.half = reference.half; L.top = reference.top; L.cm = reference.cm * sy;
  L.Q = (x, y, depth) => {
    const p = reference.Q(x, y, depth);
    return { x: p.x * sx, y: p.y * sy, s: p.s * sy };
  };
  L.win = { ...L.win, cx: 1098 * W / SOURCE.width, rx: 98 * W / SOURCE.width, top: 112 * H / SOURCE.height, sill: 458 * H / SOURCE.height };
  L.embers = { x: 546 * W / SOURCE.width, y: 561 * H / SOURCE.height, r: 58 * H / SOURCE.height };
  // The gold chest stays separate and animated, resting on the photo's table.
  const c = L.chest, depth = (c.d0 + c.d1) / 2, width = c.x1 - c.x0, height = c.y1 - c.y0;
  const x = (1338 / SOURCE.width * ROOM5_REFERENCE.width - ROOM5_REFERENCE.width / 2) * depth / 1228.8;
  const y = 150 - (520 / SOURCE.height * ROOM5_REFERENCE.height - ROOM5_REFERENCE.height * 0.44) * depth / 1228.8;
  c.x0 = x - width / 2; c.x1 = x + width / 2; c.y0 = y; c.y1 = y + height;
  // layoutPlain already applied the chest's size adjustment at reference size.
  // Rebuild its screen coordinates without applying that adjustment twice.
  c.box = {};
  chestAt(L);
  L.photographic = true;
}

export function alignRoom5PhotoObjects(L) {
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  const quad = points => points.map(([x, y]) => point(x, y));
  const screen = quad([[1433, 290], [1605, 244], [1605, 466], [1433, 441]]);
  const xs = screen.map(p => p.x), ys = screen.map(p => p.y);
  L.tv.glass = { ...L.tv.glass, quad: screen, box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } };
  L.tv.glow = { ...point(1508, 357), r: 105 * sy, tint: 0xa8c4ff };
  L.trap.glow = { ...point(137, 716), r: 64 * sy };
  L.things = L.things.map(thing => {
    if (thing.level === "tapcode") return thingAt("tapcode", "Climb down the ladder", quad([[179, 651], [361, 651], [388, 794], [150, 794]]));
    if (thing.level === "rally") return thingAt("rally", "Watch the television", quad([[1424, 286], [1613, 235], [1613, 475], [1424, 447]]));
    return thing;
  });
}

export function paintRoom5Photography(scene, L, K) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  ctx.drawImage(scene.textures.get(ROOM5_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  // Preserve the previously accepted tree and its exact tier/light pattern.
  paintRoomTree(ctx, L);
  if (!L.trap.on) soft(ctx, L.trap.glow.x, L.trap.glow.y, L.W * 0.13, L.H * 0.18, "4,5,8", 0.65);
  vignette(ctx, L.W, L.H, 0.14);
  addCanvasTexture(scene.textures, K.room, canvas);
  addCanvasTexture(scene.textures, K.glow, glowCanvas());
  addCanvasTexture(scene.textures, K.shut, paintChest(L, false));
  addCanvasTexture(scene.textures, K.open, paintChest(L, true));
  addCanvasTexture(scene.textures, K.key, paintKey());
  return K;
}
