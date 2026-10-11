/** Deterministic drawing tools: every material is produced by code at runtime. */
export function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function linear(ctx, x0, y0, x1, y1, stops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

export function radial(ctx, x, y, inner, outer, stops) {
  const gradient = ctx.createRadialGradient(x, y, inner, x, y, outer);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

export function rounded(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

export function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Cache static drawing work; animation only moves existing Phaser objects. */
export function canvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  draw(texture.context, width, height);
  texture.refresh();
}

/** Fine, non-repeating material pores, clipped by the caller's geometry. */
export function stipple(ctx, seed, x, y, w, h, count, amount = 0.09, size = 0.6) {
  const rnd = random(seed);
  for (let i = 0; i < count; i++) {
    const light = rnd() > 0.5;
    ctx.fillStyle = light ? `rgba(236,226,201,${rnd() * amount})` : `rgba(0,0,0,${rnd() * amount})`;
    const radius = size * (0.3 + rnd());
    ctx.fillRect(x + rnd() * w, y + rnd() * h, radius, radius * 0.65);
  }
}

/** Smooth seeded noise; a small field gives continuous grain at any scale. */
export function noiseField(seed) {
  const rnd = random(seed), side = 256;
  const field = Float32Array.from({ length: side * side }, () => rnd());
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = field[(iy & 255) * side + (ix & 255)];
    const b = field[(iy & 255) * side + ((ix + 1) & 255)];
    const c = field[((iy + 1) & 255) * side + (ix & 255)];
    const d = field[((iy + 1) & 255) * side + ((ix + 1) & 255)];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
