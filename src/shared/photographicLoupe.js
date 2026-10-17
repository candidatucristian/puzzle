// Both poses use the same photographed brass rim, glass and walnut handle.
// The aperture remains transparent so the live magnified scene shows through.
export function drawPhotographicLoupe(ctx, image, x, y, radius, lying = false) {
  const scale = radius / (image.width * 0.246);
  ctx.save();
  ctx.translate(x, y);
  if (lying) { ctx.scale(1, 0.44); ctx.rotate(-0.72); }
  ctx.drawImage(image, -image.width * 0.331 * scale, -image.height * 0.309 * scale, image.width * scale, image.height * scale);
  ctx.restore();
}
