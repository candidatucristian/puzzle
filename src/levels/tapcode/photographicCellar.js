// Optional surface detail for the procedural painter; this helper loads no assets.
export function paintCellarSurface(ctx, image, x, y, w, h, opacity = 1, blend = "source-over", variant = 0) {
  if (!image) return;
  // Match the crop's aspect to the existing face so stone pores and iron
  // grain stay natural on both narrow rails and broad bricks.
  const sw = Math.min(image.width * 0.85, image.height * 0.85 * w / h), sh = sw * h / w;
  const sx = (variant * 73) % (image.width - sw), sy = (variant * 47) % (image.height - sh);
  ctx.save(); ctx.globalAlpha *= opacity; ctx.globalCompositeOperation = blend;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}
