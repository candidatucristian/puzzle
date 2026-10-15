import { makeCanvas } from '../shared/paint.js';

// Local architectural pieces only. The sky, silhouette, ground, lighting
// and motion are still painted by startManor.js.
let pending;
export function loadManorArchitecture() {
  if (!pending) pending = Promise.all(['entrance', 'windows', 'masonry-and-slate'].map(async name => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/images/Manor/${name}.png`;
    await image.decode();
    return image;
  })).then(([entrance, windows, materials]) => ({
    entrance: crop(entrance, 138, 12, 1260, 992, 0.8),
    windows: [
      crop(windows, 24, 28, 480, 960, 0.74),
      crop(windows, 518, 28, 500, 960, 0.74),
      crop(windows, 1028, 28, 504, 960, 0.83),
    ],
    stone: crop(materials, 0, 0, 768, 1024, 0.4),
    slate: crop(materials, 768, 0, 768, 1024, 0.6),
  }));
  return pending;
}

function crop(image, x, y, width, height, brightness) {
  const canvas = makeCanvas(width, height), g = canvas.getContext('2d');
  g.filter = `brightness(${brightness}) saturate(0.55)`;
  g.drawImage(image, x, y, width, height, 0, 0, width, height);
  return canvas;
}

export function paintManorMaterial(ctx, art, kind, x, y, width, height, unit, opacity = 0.55) {
  if (!art) return;
  const texture = art[kind], pattern = ctx.createPattern(texture, 'repeat');
  const scale = unit * 10 / texture.width;
  pattern.setTransform(new DOMMatrix().scale(scale));
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

export function paintManorWindow(ctx, art, x, y, width, height, arch, lit) {
  ctx.drawImage(art.windows[lit ? 2 : arch ? 1 : 0], x, y, width, height);
}

export function paintManorEntrance(ctx, art, x, y, width, height) {
  ctx.drawImage(art.entrance, x, y, width, height);
}
