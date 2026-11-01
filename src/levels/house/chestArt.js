export const GOLD_CHEST = 'house_gold_coffer_cycles_v2';
export const GOLD_CHEST_URL = `${import.meta.env?.BASE_URL ?? '/'}assets/images/Chest/native-v2/coffer-states.webp`;

// A single registered Blender camera for both states: the body keeps its
// position and scale. Rendered rooms use their own light-calibrated atlases.
export function paintGoldChest(ctx, L, open) {
  const c = L.chest, image = c.art;
  if (!image?.width) return false;
  const width = image.width / 2, box = c.box;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, open ? width : 0, 0, width, image.height, box.x, box.y, box.width, box.height);
  ctx.restore();
  return true;
}
