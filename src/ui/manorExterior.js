import { soft, lcg } from '../shared/paint.js';

let pending;

export function loadManorExterior() {
  if (!pending) pending = (async () => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/images/Manor/ashcombe-exterior-photographic-v2.webp`;
    await image.decode();
    return image;
  })();
  return pending;
}

export function paintManorExterior(ctx, W, H, image) {
  const sourceW = image.naturalWidth || image.width, sourceH = image.naturalHeight || image.height;
  // Show the complete facade and gate. A small stretch absorbs ordinary
  // desktop aspect differences without cutting off the roof or gate pillars.
  const fit = Math.min(W / sourceW, H / sourceH);
  const width = Math.min(W, sourceW * fit * 1.1), height = Math.min(H, sourceH * fit * 1.1);
  const left = (W - width) / 2, top = (H - height) / 2;
  const point = (x, y) => ({ x: left + x / 1740 * width, y: top + y / 904 * height });
  ctx.fillStyle = '#03050a'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.filter = 'brightness(0.53) saturate(0.78)';
  ctx.drawImage(image, left, top, width, height);
  ctx.restore();
  const shade = ctx.createRadialGradient(W * 0.55, H * 0.5, H * 0.2, W * 0.53, H * 0.52, Math.hypot(W, H) * 0.65);
  shade.addColorStop(0, 'rgba(2,4,9,0)');
  shade.addColorStop(0.6, 'rgba(2,4,9,0.08)');
  shade.addColorStop(1, 'rgba(2,4,9,0.38)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  const entrance = point(906, 595);
  // the wet drive, from the steps out through the gates (not their leaves
  // and posts), and the puddled ground in front of them: where the rain
  // rings the water (shared/rainFall.js)
  const ground = [[690, 752], [1125, 752], [1125, 848], [1740, 866], [1740, 904], [0, 904], [0, 866], [684, 848]]
    .map(([x, y]) => { const p = point(x, y); return [p.x, p.y]; });
  return {
    photographic: true,
    W, H,
    rain: makeRain(width, height),
    ground, horizon: point(0, 746).y,
    photo: { left, top, width, height },
    door: { x: entrance.x, y: entrance.y, w: 82 / 1740 * width, h: 108 / 904 * height },
    lantern: { ...point(948, 572), rx: width * 0.018, ry: height * 0.04 },
    windows: [
      { ...point(777, 645), rx: width * 0.024, ry: height * 0.05 },
      { ...point(749, 357), rx: width * 0.01, ry: height * 0.025 },
    ],
  };
}

export function drawManorExteriorLive(ctx, scene, time, frozen) {
  const { W, H, photo, lantern, windows } = scene;
  const t = frozen ? 0 : time;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.rect(photo.left, photo.top, photo.width, photo.height); ctx.clip();
  // Low, soft mist drifts across the approach; it leaves the facade and
  // ironwork sharp instead of moving or warping the photograph itself.
  for (let i = 0; i < 5; i++) {
    const phase = (i / 5 + t * 0.006) % 1;
    const x = photo.left + (-0.25 + phase * 1.5) * photo.width;
    const y = photo.top + photo.height * (0.826 + (i % 3) * 0.034);
    const alpha = 0.026 * Math.sin(phase * Math.PI);
    soft(ctx, x, y, photo.width * 0.24, photo.height * (0.013 + i % 2 * 0.006), '118,132,151', alpha);
  }
  const warmth = 0.024 + (frozen ? 0 : 0.004 * Math.sin(t * 1.7) + 0.002 * Math.sin(t * 5.1));
  soft(ctx, lantern.x, lantern.y, lantern.rx, lantern.ry, '255,189,109', warmth, 'lighter');
  for (const window of windows) soft(ctx, window.x, window.y, window.rx, window.ry, '255,194,121', 0.016, 'lighter');
  // (the rain itself is drawn with WebGL where it can be: startManor.js)
  if (!scene.rainLive) drawRain(ctx, scene, t, frozen);
  ctx.restore();
}

// ── the rain ─────────────────────────────────────────────────────────────────
// Real rain at night is seen as streaks — each drop drawn out by the eye into
// a line as it falls — fine and faint far off, longer, brighter and fewer
// close to; all of it leaning a little with the wind, and caught warm only
// where it falls through the lantern's light. On the wet drive it lands in
// small splashes, a ring spreading on the water and gone.
const RAIN_LAYERS = [
  // how many (for a picture 1600 wide), streak length and width (of the
  // picture's height), how fast (heights a second), how bright
  { n: 520, len: [0.010, 0.018], width: 0.6, speed: [0.57, 0.72], alpha: [0.1, 0.2] },
  { n: 190, len: [0.022, 0.038], width: 0.9, speed: [0.9, 1.1], alpha: [0.16, 0.3] },
  { n: 46, len: [0.055, 0.09], width: 1.4, speed: [1.5, 1.86], alpha: [0.2, 0.36] },
];
const WIND = 0.16; // how far a drop drifts sideways for each height it falls

function makeRain(width, height) {
  const rnd = lcg(6161), k = Math.max(0.5, width / 1600);
  const pick = ([a, b]) => a + (b - a) * rnd();
  const layers = RAIN_LAYERS.map((L) => Array.from({ length: Math.round(L.n * k) }, () => ({
    x: rnd(), y: rnd(), len: pick(L.len), speed: pick(L.speed), alpha: pick(L.alpha),
  })));
  const splashes = Array.from({ length: Math.round(70 * k) }, (_, i) => ({ i, period: 0.55 + rnd() * 0.7, phase: rnd() }));
  return { layers, splashes };
}

const hash = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

function drawRain(ctx, scene, t, frozen) {
  const { photo, rain, lantern } = scene;
  if (!rain) return;
  const { left, top, width, height } = photo;
  const lr = height * 0.16; // how far round the lantern the rain is lit
  ctx.lineCap = 'round';
  RAIN_LAYERS.forEach((L, li) => {
    const lit = [];
    // three strengths, each stroked at once
    for (let band = 0; band < 3; band++) {
      ctx.beginPath();
      for (const d of rain.layers[li]) {
        if (Math.floor(d.alpha * 30) % 3 !== band) continue;
        const fall = frozen ? 0 : t * d.speed;
        const y = ((d.y + fall) % 1.15) - 0.08;
        const x = (((d.x + y * WIND) % 1) + 1) % 1;
        const px = left + x * width, py = top + y * height, len = d.len * height;
        ctx.moveTo(px, py);
        ctx.lineTo(px - WIND * len, py - len);
        if (Math.hypot(px - lantern.x, py - lantern.y) < lr) lit.push([px, py, len]);
      }
      const a = L.alpha[0] + (L.alpha[1] - L.alpha[0]) * (band + 0.5) / 3;
      ctx.strokeStyle = `rgba(196,210,230,${a.toFixed(3)})`;
      ctx.lineWidth = L.width * Math.max(0.8, width / 1600);
      ctx.stroke();
    }
    // where they fall through the lantern's light: warm, and brighter
    if (lit.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      for (const [px, py, len] of lit) { ctx.moveTo(px, py); ctx.lineTo(px - WIND * len, py - len); }
      ctx.strokeStyle = 'rgba(255,196,128,0.32)';
      ctx.lineWidth = L.width * 1.2 * Math.max(0.8, width / 1600);
      ctx.stroke();
      ctx.restore();
    }
  });
  // on the wet drive and the leaves either side: the drops landing
  if (frozen) return;
  ctx.lineWidth = Math.max(0.6, width / 2600);
  for (const s of rain.splashes) {
    const k = t / s.period + s.phase, cycle = Math.floor(k), age = k - cycle;
    const fx = hash(s.i, cycle), fy = hash(cycle, s.i + 911);
    const x = left + width * (0.2 + fx * 0.6), y = top + height * (0.86 + fy * 0.13);
    const near = (y - top) / height; // nearer the bottom, bigger
    const r = width * 0.006 * (0.4 + near) * (0.3 + age), a = 0.22 * (1 - age) * (1 - age);
    ctx.strokeStyle = `rgba(205,214,228,${a.toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
    if (age < 0.18) {
      // the drop's own spray, thrown up for a moment
      ctx.fillStyle = `rgba(215,224,236,${(0.35 * (1 - age / 0.18)).toFixed(3)})`;
      for (const dx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + dx * r * 0.8, y - r * 0.9 * (1 - age * 3), Math.max(0.6, width / 2200), 0, Math.PI * 2); ctx.fill(); }
    }
  }
}
