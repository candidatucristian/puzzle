import { makeCanvas } from "../../shared/paint.js";
import { curtainOutline, mirrorPoint } from "./windowFrame.js";

const WINDOW = "tele_window_photographic_v1";
const MOON_SOURCE = "tele_moon_photographic_source_v1";
const MOON = "tele_moon_photographic_v1";

export function loadWindowPhotography(scene) {
  for (const [key, url] of [
    [WINDOW, "assets/images/Telescope/window-photographic-v1.webp"],
    [MOON_SOURCE, "assets/images/Telescope/moon-photographic-v1.webp"],
  ]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

// Keep the original geometry, including content and inSky: those functions
// place every existing signal star, decorative star and hover region.
export function paintWindowPhotography(scene, geo) {
  if (!scene.textures.exists(WINDOW)) return null;
  const { W, H, hole, folds, curtain } = geo;
  const image = scene.textures.get(WINDOW).getSourceImage();
  const backdrop = makeCanvas(W, H), g = backdrop.getContext("2d");
  g.imageSmoothingQuality = "high";
  // The native arch stops growing on wide screens. Keep the photographed
  // arch at that same width and extend its dark outer wall to the edges.
  const width = geo.archRX / 0.455, x = (W - width) / 2;
  if (x > 0) {
    const strip = image.width * 0.018;
    g.drawImage(image, 0, 0, strip, image.height, 0, 0, x + 1, H);
    g.drawImage(image, image.width - strip, 0, strip, image.height, W - x - 1, 0, x + 1, H);
  }
  g.drawImage(image, x, 0, width, H);

  // A matching foreground matte keeps the moon, star halos and constellation
  // lines behind the same arch, curtains and ridge as before.
  const front = makeCanvas(W, H), f = front.getContext("2d");
  f.drawImage(backdrop, 0, 0);
  f.save();
  f.beginPath();
  f.moveTo(hole.wl, hole.bottom);
  f.lineTo(hole.wl, hole.cy);
  f.ellipse(hole.cx, hole.cy, hole.rx, hole.ry, 0, Math.PI, Math.PI * 2);
  f.lineTo(hole.wr, hole.bottom);
  f.closePath();
  f.clip();
  f.beginPath();
  f.moveTo(hole.wl, 0);
  f.lineTo(hole.wr, 0);
  for (let px = hole.wr; px >= hole.wl; px -= 3) f.lineTo(px, geo.far(px));
  f.lineTo(hole.wl, geo.far(hole.wl));
  f.closePath();
  f.clip();
  f.globalCompositeOperation = "destination-out";
  f.beginPath();
  f.rect(0, 0, W, H);
  const left = curtainOutline(curtain, folds, 24);
  for (const points of [left, left.map(p => mirrorPoint(curtain, p))]) {
    points.forEach((p, i) => i ? f.lineTo(p.x, p.y) : f.moveTo(p.x, p.y));
    f.closePath();
  }
  f.fill("evenodd");
  f.restore();
  geo.photographic = true;
  return { backdrop, front };
}

export function photographicMoonTexture(textures) {
  if (!textures.exists(MOON_SOURCE)) return null;
  if (textures.exists(MOON)) return MOON;
  const image = textures.get(MOON_SOURCE).getSourceImage();
  const sample = makeCanvas(image.width, image.height), s = sample.getContext("2d");
  s.drawImage(image, 0, 0);
  const pixels = s.getImageData(0, 0, sample.width, sample.height).data;
  // Fit the actual opaque disc, independent of the generated alpha padding.
  const span = (horizontal, fixed) => {
    const length = horizontal ? sample.width : sample.height;
    let first = length, last = -1;
    for (let i = 0; i < length; i++) {
      const px = horizontal ? i : fixed, py = horizontal ? fixed : i;
      if (pixels[(py * sample.width + px) * 4 + 3] < 192) continue;
      first = Math.min(first, i); last = i;
    }
    return last >= first ? [first, last] : [length * 0.14, length * 0.86];
  };
  let horizontal = span(true, Math.floor(sample.height / 2));
  const vertical = span(false, Math.round((horizontal[0] + horizontal[1]) / 2));
  const cy = (vertical[0] + vertical[1]) / 2;
  horizontal = span(true, Math.round(cy));
  const cx = (horizontal[0] + horizontal[1]) / 2;
  const sourceR = Math.min(horizontal[1] - horizontal[0], vertical[1] - vertical[0]) * 0.492;
  const canvas = makeCanvas(512, 512), ctx = canvas.getContext("2d");
  const R = 512 * 0.36;
  const halo = ctx.createRadialGradient(256, 256, R * 0.95, 256, 256, 256);
  halo.addColorStop(0, "rgba(190,211,245,0.15)");
  halo.addColorStop(0.4, "rgba(190,211,245,0.045)");
  halo.addColorStop(1, "rgba(190,211,245,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.beginPath(); ctx.arc(256, 256, R, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(image, cx - sourceR, cy - sourceR, sourceR * 2, sourceR * 2, 256 - R, 256 - R, R * 2, R * 2);
  ctx.restore();
  textures.addCanvas(MOON, canvas);
  return MOON;
}
