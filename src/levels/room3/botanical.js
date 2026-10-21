import { soft } from "../../shared/paint.js";
import { BACK, fillPoly } from "../house/roomKit.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

const ART = {
  flowers: { key: "r3_botanical_flowers", url: "assets/images/Room3/botanical-flowers.webp" },
  seeds: { key: "r3_seed_sacks", url: "assets/images/Room3/seed-sacks.webp" },
  herbarium: { key: "r3_framed_herbarium", url: "assets/images/Room3/framed-herbarium.webp" },
};

export function loadRoom3Botanicals(scene) {
  for (const { key, url } of Object.values(ART)) {
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }
}

export function room3Botanicals(scene) {
  return Object.fromEntries(Object.entries(ART).map(([name, { key }]) => [
    name, scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null,
  ]));
}

// Additive decoration only: the room, its furniture and all puzzle positions
// retain their existing art. These props receive the same final room lighting.
export function paintRoom3Herbarium(ctx, L) {
  const image = L.botanicals?.herbarium;
  if (!image) return;
  const x0 = -L.half * 0.54 - 20, top = 239, width = 40, height = 56;
  const at = (u, v) => L.Q(x0 + width * u, top - height * v, BACK);
  const shadow = (u, v) => L.Q(x0 + 1.8 + width * u, top - 1.8 - height * v, BACK);
  fillPoly(ctx, [shadow(0, 0), shadow(1, 0), shadow(1, 1), shadow(0, 1)], "rgba(0,0,0,0.38)");
  ctx.save();
  ctx.filter = "brightness(0.82) saturate(0.78)";
  paintProjectedMaterial(ctx, image, at);
  ctx.restore();
}

export function paintRoom3Flowers(ctx, L) {
  // The open floor between the games table and the writing desk, behind both.
  const image = L.botanicals?.flowers;
  if (!image) return;
  const foot = L.Q(L.half * 0.32, 0, 574);
  soft(ctx, foot.x + 3 * foot.s, foot.y + foot.s, 20 * foot.s, 4.5 * foot.s, "0,0,0", 0.28);
  soft(ctx, foot.x, foot.y, 11 * foot.s, 2.8 * foot.s, "0,0,0", 0.68);
  floorProp(ctx, image, foot, 65);
}

export function paintRoom3SeedSacks(ctx, L) {
  // Beside the right end of the desk, inside the side wall and clear of its
  // drawers, the telephone, the chest and their existing interaction zones.
  const image = L.botanicals?.seeds;
  if (!image) return;
  const foot = L.Q(L.half * 0.89, 0, 448);
  soft(ctx, foot.x - 2 * foot.s, foot.y + foot.s, 25 * foot.s, 5 * foot.s, "0,0,0", 0.48);
  soft(ctx, foot.x - 6 * foot.s, foot.y, 13 * foot.s, 2.5 * foot.s, "0,0,0", 0.55);
  floorProp(ctx, image, foot, 36);
}

function floorProp(ctx, image, foot, height) {
  const h = height * foot.s, w = h * image.width / image.height;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = "brightness(0.82) saturate(0.8)";
  // Account for the transparent margin beneath the photographed base.
  ctx.drawImage(image, foot.x - w / 2, foot.y - h * 0.98, w, h);
  ctx.restore();
}
