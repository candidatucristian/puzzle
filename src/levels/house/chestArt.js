import { soft } from '../../shared/paint.js';

export const GOLD_CHEST = 'house_gold_chest';
export const GOLD_CHEST_URL = `${import.meta.env?.BASE_URL ?? '/'}assets/images/Chest/gold-chest-states.webp`;

// Two photographs of the same coffer. The body is registered separately from
// the lid, so switching states cannot make the chest grow or move on the desk.
const FRAMES = [
  { x: 69, y: 383, width: 783, bottom: 779, seam: 580 },
  { x: 972, y: 107, width: 737, bottom: 779, seam: 570 },
];

export function paintGoldChest(ctx, L, open) {
  const c = L.chest, image = c.art;
  if (!image) return false;
  const { Q } = L;
  const s = Q(0, 0, c.d0).s, r = (c.d1 - c.d0) / 2;
  const left = Math.min(Q(c.x0, c.y0, c.d0).x, Q(c.x0, c.y0, c.d1).x);
  const right = Math.max(Q(c.x1, c.y0, c.d0).x, Q(c.x1, c.y0, c.d1).x);
  const seam = Q(0, c.y1, c.d0).y;
  const bottom = Q(0, c.y0 - .5, c.d0 + .6).y + .9 * s;
  // The original barrel lid's projected height, both shut and swung back.
  const swing = open ? 1.9 : 0;
  let top = seam;
  for (let i = 0; i <= 32; i++) {
    const angle = i / 32 * Math.PI;
    const dd = -r - r * Math.cos(angle), yy = c.lid * Math.sin(angle);
    top = Math.min(top, Q(0,
      c.y1 - dd * Math.sin(swing) + yy * Math.cos(swing),
      c.d1 + dd * Math.cos(swing) + yy * Math.sin(swing)).y);
  }
  const foot = Q((c.x0 + c.x1) / 2, c.y0, (c.d0 + c.d1) / 2);
  soft(ctx, foot.x - 4 * s, foot.y + s, (c.x1 - c.x0) * .62 * s, r * .9 * s, '0,0,0', .6);
  const frame = FRAMES[open ? 1 : 0], width = right - left;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Let the polished relief catch the room's light at this small screen size.
  ctx.filter = 'brightness(1.12) contrast(1.1)';
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.seam - frame.y,
    left, top, width, seam - top);
  ctx.drawImage(image, frame.x, frame.seam, frame.width, frame.bottom - frame.seam,
    left, seam, width, bottom - seam);
  ctx.restore();
  return true;
}
