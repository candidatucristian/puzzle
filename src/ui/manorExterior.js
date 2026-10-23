import { soft, lcg, makeCanvas } from '../shared/paint.js';
import { MANOR_PICTURE, PHOTO, DOOR, LANTERN, WINDOWS, GROUND, HORIZON } from './manorPlate.js';

let pending;

export function loadManorExterior() {
  if (!pending) pending = (async () => {
    const image = new Image();
    image.decoding = 'async';
    // (rendered in Blender from CC0 scans and modelled stone: art/blender/manor.py)
    image.src = `${import.meta.env.BASE_URL}assets/images/Manor/${MANOR_PICTURE}`;
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
  const point = (x, y) => ({ x: left + x / PHOTO.width * width, y: top + y / PHOTO.height * height });
  const across = width / PHOTO.width, down = height / PHOTO.height;
  ctx.fillStyle = '#03050a'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  // (the render is already the night it should be; only a touch quieter)
  ctx.filter = 'brightness(0.94) saturate(0.92)';
  ctx.drawImage(image, left, top, width, height);
  ctx.restore();
  const shade = ctx.createRadialGradient(W * 0.55, H * 0.5, H * 0.2, W * 0.53, H * 0.52, Math.hypot(W, H) * 0.65);
  shade.addColorStop(0, 'rgba(2,4,9,0)');
  shade.addColorStop(0.6, 'rgba(2,4,9,0.08)');
  shade.addColorStop(1, 'rgba(2,4,9,0.38)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  const entrance = point(DOOR.x, DOOR.y);
  // the wet drive and forecourt, from the steps out through the gates: where
  // the rain rings the water (shared/rainFall.js)
  const ground = GROUND.map(([x, y]) => { const p = point(x, y); return [p.x, p.y]; });
  return {
    photographic: true,
    W, H,
    rain: makeRain(width, height),
    fog: FOG.map(makeFog),
    ground, horizon: point(0, HORIZON).y,
    photo: { left, top, width, height },
    door: { x: entrance.x, y: entrance.y, w: DOOR.w * across, h: DOOR.h * down },
    lantern: { ...point(LANTERN.x, LANTERN.y), rx: LANTERN.rx * across, ry: LANTERN.ry * down },
    windows: WINDOWS.map((w) => ({ ...point(w.x, w.y), rx: w.rx * across, ry: w.ry * down })),
  };
}

export function drawManorExteriorLive(ctx, scene, time, frozen) {
  const { W, H, photo, lantern, windows } = scene;
  const t = frozen ? 0 : time;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.rect(photo.left, photo.top, photo.width, photo.height); ctx.clip();
  // the fog, coming across the park with the wind; the leaves it tears off
  const air = scene.air ?? { gust: 0.6, lean: 0.6, still: frozen };
  drawFog(ctx, scene, t, air);
  if (!frozen && !air.still) blowLeaves(ctx, scene, t, air);
  const warmth = 0.024 + (frozen ? 0 : 0.004 * Math.sin(t * 1.7) + 0.002 * Math.sin(t * 5.1));
  soft(ctx, lantern.x, lantern.y, lantern.rx, lantern.ry, '255,189,109', warmth, 'lighter');
  // and the lantern's light caught in the fog round it
  soft(ctx, lantern.x, lantern.y + lantern.ry * 0.6, lantern.rx * 4.5, lantern.ry * 3, '255,189,109', warmth * 0.9, 'lighter');
  for (const window of windows) soft(ctx, window.x, window.y, window.rx, window.ry, '255,194,121', 0.016, 'lighter');
  // (the rain itself is drawn with WebGL where it can be: startManor.js)
  if (!scene.rainLive) drawRain(ctx, scene, t, frozen);
  ctx.restore();
}

// ── the fog ──────────────────────────────────────────────────────────────────
// A trace of ground mist below the steps (the drive starts at 0.775 of the
// picture). Shallow, overlapping wisps fade at both edges; their height
// varies across the drive so they never read as straight horizontal strips.
// The noise wraps across, drifting slowly even when the trees catch a gust.
const FOG = [
  { top: 0.79, depth: 0.09, across: 1.3, pace: 4, alpha: 0.055, lumps: 4, seed: 71 },
  { top: 0.845, depth: 0.12, across: 1.1, pace: 7, alpha: 0.04, lumps: 6, seed: 83 },
  { top: 0.905, depth: 0.085, across: 0.9, pace: 10, alpha: 0.025, lumps: 3, seed: 97 },
];
function makeFog({ lumps, seed }) {
  const w = 384, h = 64, rnd = lcg(seed);
  // value noise on grids that wrap across: a coarse one and two finer
  const octave = (cx, cy) => {
    const g = Array.from({ length: (cy + 1) * cx }, () => rnd());
    const at = (i, j) => g[j * cx + (i % cx)];
    return (x, y) => {
      const u = (x / w) * cx, v = (y / h) * cy, i = Math.floor(u), j = Math.floor(v);
      const fx = u - i, fy = v - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const upper = at(i, j) + (at(i + 1, j) - at(i, j)) * sx, lower = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
      return upper + (lower - upper) * sy;
    };
  };
  const octaves = [[octave(lumps, 2), 0.55], [octave(lumps * 2 + 1, 4), 0.3], [octave(lumps * 4 + 3, 8), 0.15]];
  const c = makeCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    const shape = octaves[0][0](x, h * 0.5);
    const centre = 0.5 + (shape - 0.5) * 0.2, spread = 0.36 + shape * 0.09;
    for (let y = 0; y < h; y++) {
      const edge = Math.max(0, 1 - Math.abs((y / (h - 1) - centre) / spread));
      const profile = edge * edge * (3 - 2 * edge);
      const n = octaves.reduce((sum, [noise, k]) => sum + noise(x, y) * k, 0);
      const density = n ** 1.5 * profile;
      const o = (y * w + x) * 4;
      img.data[o] = 132; img.data[o + 1] = 143; img.data[o + 2] = 153; img.data[o + 3] = Math.round(density * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
function drawFog(ctx, scene, t, air) {
  const { photo, fog } = scene;
  // Keep gusts gentle at ground level, with no jump after a hidden tab.
  scene.fogRun ??= FOG.map(() => 0);
  const dt = Math.min(0.05, Math.max(0, t - (scene.fogClock ?? t)));
  scene.fogClock = t;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  FOG.forEach((layer, i) => {
    scene.fogRun[i] += layer.pace * (air.still ? 0.25 : 0.65 + 0.35 * air.gust) * (photo.width / 2560) * dt;
    const w = photo.width * layer.across, h = photo.height * layer.depth, y = photo.top + photo.height * layer.top;
    // Only a slight, slow change in density, so it stays almost imperceptible.
    ctx.globalAlpha = layer.alpha * (0.88 + 0.12 * Math.sin(t * 0.035 + i * 2.1));
    for (let x = photo.left - (scene.fogRun[i] % w); x < photo.left + photo.width; x += w) ctx.drawImage(fog[i], x, y, w + 1, h);
  });
  ctx.restore();
}

// ── the leaves the wind takes ────────────────────────────────────────────────
// A few at a time torn off the trees in front and carried across: dark, small,
// tumbling and turning over as they go, falling slowly, faster across in a
// gust; one passing the lantern catches its light.
function leaf(scene, anywhere) {
  const { photo } = scene, rnd = Math.random;
  const z = 0.6 + rnd() * 1.1;
  return {
    // from the crowns of the two trees, or (at the start) anywhere
    x: photo.left + (anywhere ? rnd() : rnd() < 0.5 ? 0.02 + rnd() * 0.22 : 0.7 + rnd() * 0.18) * photo.width,
    y: photo.top + (anywhere ? 0.1 + rnd() * 0.75 : 0.12 + rnd() * 0.42) * photo.height,
    z, size: 3.5 + rnd() * 3.5, fall: 16 + rnd() * 26, drift: -10 + rnd() * 30,
    flutter: 1.5 + rnd() * 2.5, spin: 2 + rnd() * 5, angle: rnd() * Math.PI, phase: rnd() * 6.28,
    tone: rnd() < 0.25 ? [58, 44, 68] : [34 + rnd() * 12, 33 + rnd() * 8, 20 + rnd() * 6],
  };
}
function blowLeaves(ctx, scene, t, air) {
  const { photo, lantern } = scene, px = photo.width / 2560;
  scene.leaves ??= Array.from({ length: 26 }, () => leaf(scene, true));
  const dt = Math.min(0.05, Math.max(0, t - (scene.leafClock ?? t)));
  scene.leafClock = t;
  for (const f of scene.leaves) {
    f.x += (air.gust * 130 + f.drift) * f.z * px * dt;
    f.y += (f.fall + Math.sin(t * f.flutter + f.phase) * 22) * f.z * px * dt;
    if (f.x > photo.left + photo.width + 30 * px || f.y > photo.top + photo.height * 0.97) Object.assign(f, leaf(scene, false));
    const turn = Math.cos(t * f.spin + f.phase), size = f.size * f.z * px * 1.6;
    // lit as it passes the lantern
    const near = Math.max(0, 1 - Math.hypot((f.x - lantern.x) / (lantern.rx * 6), (f.y - lantern.y) / (lantern.ry * 5)));
    const [r, g, b] = f.tone.map((c, k) => (c + near * [150, 96, 40][k]) | 0);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle + Math.sin(t * f.spin * 0.4 + f.phase) * 1.2);
    ctx.scale(1, Math.max(0.12, Math.abs(turn)));
    ctx.fillStyle = `rgba(${r},${g},${b},0.92)`;
    ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    // its stalk
    ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`; ctx.lineWidth = Math.max(0.5, size * 0.12);
    ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(size * 1.45, size * 0.12); ctx.stroke();
    ctx.restore();
  }
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
