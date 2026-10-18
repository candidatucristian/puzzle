import { soft, grain, makeCanvas, lcg } from '../shared/paint.js';
import { createMoonCanvas } from '../shared/moon.js';
import { glint } from './startFilm.js';
import { loadManorArchitecture, paintManorMaterial, paintManorWindow, paintManorEntrance } from './manorArchitecture.js';

/** The manor behind the title, painted — by the same hand as the hall and the
 *  rooms inside it — instead of filmed. Deep night, and seen from close to.
 *  The house has stood empty for years. A compact pile of grey stone under
 *  slate: a tall middle block with a pedimented bay and a columned porch,
 *  standing well forward of a short wing either side — so it is larger and
 *  lower in the picture than they are, hides their inner ends, and throws
 *  its shadow on the one away from the moon — and a tower at the right.
 *
 *  Nobody keeps it, though it is not a ruin: a house shut up and let go.
 *  A few slates are gone, the stone is rain-streaked and cracked here and
 *  there, ivy has a corner of each wing; a pane or two is out, one window
 *  boarded; a length of balustrade and of the roof's iron is missing, the
 *  hedge and the drive have grown wild, the lamps lean and are dark, bare
 *  trees stand over it and crows sit on the ridge.
 *  Almost nothing is alight: a candle's worth in three windows — the tower
 *  room, where the telescope still stands — one lantern at the door, one
 *  lamp on the drive. It is uneasy, never gruesome.
 *
 *  Nothing in it is ruled: once painted, the whole picture is drawn again a
 *  thread at a time, each a little out of place, so that the level lines
 *  waver and the long ones sag, as old buildings do, while what stands
 *  upright — the columns, the corners — stays true. Then the
 *  night is laid over it, and the few lights put back.
 *
 *  Over it, alive: heavy cloud going across the moon, stars, mist on the
 *  grass, and the one lamp on the drive, which stutters. The lights in the
 *  house are steady. The front door glints and takes the
 *  hand, as the things to open inside do.
 *
 *  Measured in units of which the house is about a hundred across: x across
 *  from the middle of the house, y up from the ground. The middle block is
 *  drawn a fifth larger than the wings behind it. */

const WARM = '255,190,120';
const MOON = '150,178,232';
const GROUND = 74; // how far down the screen the house stands
const FRONT = 1.2; // how much larger the middle block is, for standing forward
const BACK = 3.2; // how much higher up the picture the wings' foot is, in units
const FLOORS = { mid: [[1.2, 6.6], [11.6, 6.4], [21.6, 5.2]], wing: [[1.2, 6.4], [12, 6]] };

export function mountStartManor(scope, preferences) {
  const film = document.getElementById('start-film');
  const door = document.getElementById('start-door');
  if (!film) return { stop() {} };
  const still = () => preferences?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const reel of film.querySelectorAll('.start-reel')) { reel.removeAttribute('src'); reel.hidden = true; }
  // its two canvases — the ones it left, when it is being put up again
  let [base, live] = film.querySelectorAll('.start-painting');
  if (!live) {
    base = document.createElement('canvas'); live = document.createElement('canvas');
    base.className = 'start-painting'; live.className = 'start-painting';
    // The house is painted once and then only shown: kept by the processor,
    // not the graphics card, so that the browser never puts it to sleep or
    // throws it away while the window is hidden (it came back flickering, or
    // blank, after a minimise or an Alt-Tab).
    base.getContext('2d', { willReadFrequently: true });
    film.append(base, live);
  }
  let scene = null, stopped = false, frame = 0, details = null, paintedDetails = null, disposed = false;
  film.dataset.architecture = 'loading';

  function layout() {
    const box = film.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    const W = Math.round(box.width * ratio), H = Math.round(box.height * ratio);
    if (scene && scene.W === W && scene.H === H && paintedDetails === details) return;
    for (const c of [base, live]) { c.width = W; c.height = H; }
    scene = paintManor(base.getContext('2d'), W, H, details);
    paintedDetails = details;
    // the front door's place in the picture, in screen pixels
    if (door) {
      const d = scene.door;
      Object.assign(door.style, { left: d.x / ratio + 'px', top: d.y / ratio + 'px', width: d.w / ratio + 'px', height: d.h / ratio + 'px' });
    }
    if (still()) drawLive(live.getContext('2d'), scene, 0, true);
  }
  // The picture's own clock: it runs only while the picture is seen, and never
  // leaps — back from a hidden window the cloud and the mist go on from where
  // they were instead of jumping.
  let clock = 0, last = null;
  function tick(time) {
    if (stopped) return;
    frame = requestAnimationFrame(tick);
    clock += last === null ? 0 : Math.min(0.05, Math.max(0, (time - last) / 1000));
    last = time;
    if (!scene || still()) return;
    drawLive(live.getContext('2d'), scene, clock, false);
  }
  // hidden and shown again: the clock picks up again without a leap
  scope.on(document, 'visibilitychange', () => { last = null; });
  // should the browser drop a canvas anyway, paint the house again at once
  const repaint = () => { scene = null; layout(); };
  for (const c of [base, live]) scope.on(c, 'contextrestored', repaint);
  layout();
  loadManorArchitecture().then(art => {
    if (disposed || stopped) return;
    details = art;
    layout();
    film.dataset.architecture = 'ready';
  }).catch(() => {
    if (!disposed && !stopped) film.dataset.architecture = 'fallback';
  });
  scope.add(() => { disposed = true; });
  scope.on(window, 'resize', layout);
  if (typeof ResizeObserver === 'function') {
    const watch = new ResizeObserver(layout);
    watch.observe(film);
    scope.add(() => watch.disconnect());
  }
  if (preferences?.subscribe) scope.add(preferences.subscribe(() => { if (scene && still()) drawLive(live.getContext('2d'), scene, 0, true); }));
  glint(scope, door, still, () => stopped);
  frame = requestAnimationFrame(tick);
  scope.add(() => cancelAnimationFrame(frame));
  return {
    /** The title is gone: the picture stops moving and lets go of the screen. */
    stop() { stopped = true; cancelAnimationFrame(frame); },
  };
}

// ── the house, painted ──────────────────────────────────────────────────────

function paintManor(ctx, W, H, details = null) {
  // a unit, in pixels: the house takes most of the width
  const s0 = Math.min(H / 74, W / 118);
  const cx = W * 0.53, gy = H * (GROUND / 100);
  // What is being drawn is on one of two planes: the wings and the tower at
  // the back (a unit is s0, their foot BACK units up the picture), or the
  // middle block in front (a unit is a fifth larger, its foot on the line).
  let s = s0, lift = 0;
  const plane = (front) => { s = front ? s0 * FRONT : s0; lift = front ? 0 : BACK * s0; };
  const X = (x) => cx + x * s, Y = (y) => gy - lift - y * s;
  const rnd = lcg(1899);
  // a rectangle, laid on whole pixels so that its edges are clean
  const box = (x0, y0, x1, y1, fill) => {
    const xa = Math.round(X(x0)), ya = Math.round(Y(y1));
    ctx.fillStyle = fill;
    ctx.fillRect(xa, ya, Math.max(1, Math.round(X(x1)) - xa), Math.max(1, Math.round(Y(y0)) - ya));
  };
  const poly = (pts, fill) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  };
  const lights = []; // what is alight, for the living layer
  const moon = { x: X(34), y: Y(45.5), r: 4.6 * s };

  // ── the sky: near-black overhead, deep blue low down, the moon's wash
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#03050b');
  sky.addColorStop(0.5, '#070f1f');
  sky.addColorStop(1, '#121c33');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  soft(ctx, moon.x, moon.y, moon.r * 9, moon.r * 9, MOON, 0.2, 'lighter');
  soft(ctx, moon.x, moon.y, moon.r * 3, moon.r * 3, '190,206,246', 0.22, 'lighter');
  const stars = [];
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * gy * 0.86;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 2.2) continue;
    const r = (0.35 + rnd() * 0.75) * Math.max(1, s * 0.11);
    ctx.fillStyle = `rgba(220,230,255,${(0.12 + rnd() * 0.4).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (stars.length < 26 && rnd() < 0.18) stars.push({ x, y, r: r * 1.8, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.6 });
  }
  const disc = createMoonCanvas();
  ctx.drawImage(disc, moon.x - moon.r / 0.72, moon.y - moon.r / 0.72, (moon.r * 2) / 0.72, (moon.r * 2) / 0.72);

  // ── the town beyond the park: blocks of flats in the haze, a few windows lit
  for (const [x0, w, h] of [[-104, 13, 47], [-93, 10, 58], [-84, 12, 43], [-73, 9, 52], [66, 10, 49], [75, 13, 60], [87, 11, 45], [-64, 8, 40], [97, 12, 54]]) {
    const g = ctx.createLinearGradient(0, Y(h), 0, Y(20));
    g.addColorStop(0, '#17223a');
    g.addColorStop(1, '#1e2c48');
    box(x0, 0, x0 + w, h, g);
    box(x0 + w - 0.6, 0, x0 + w, h, 'rgba(140,166,225,0.2)');
    for (let fy = h - 2; fy > 24; fy -= 1.55) {
      for (let fx = x0 + 0.9; fx < x0 + w - 1; fx += 1.35) {
        const k = rnd();
        if (k > 0.3) continue;
        box(fx, fy, fx + 0.7, fy + 0.8, k < 0.03 ? 'rgba(255,206,128,0.6)' : k < 0.07 ? 'rgba(180,206,255,0.3)' : 'rgba(90,110,160,0.2)');
      }
    }
    // the tank and the aerials on its roof
    box(x0 + w * 0.6, h, x0 + w * 0.8, h + 1.6, '#17223a');
    box(x0 + w * 0.3, h, x0 + w * 0.32, h + 3.4, '#17223a');
  }
  // the night's haze lying over the town
  const haze = ctx.createLinearGradient(0, Y(62), 0, Y(18));
  haze.addColorStop(0, 'rgba(22,35,63,0)');
  haze.addColorStop(1, 'rgba(22,35,63,0.62)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, Y(62), W, 44 * s);

  // ── the trees behind the house: one dark line of heads against the sky
  ctx.fillStyle = '#080d15';
  ctx.beginPath();
  ctx.moveTo(-10, gy);
  for (let x = -112; x <= 100; x += 2.5) {
    const top = 25 + 5 * Math.sin(x * 0.21 + 1) + 3.5 * Math.sin(x * 0.53 + 2.2) + rnd() * 2.4;
    ctx.lineTo(X(x), Y(top));
  }
  ctx.lineTo(W + 10, gy);
  ctx.closePath();
  ctx.fill();
  for (const x of [-99, -94, -90, 71, 76]) {
    const h = 34 + rnd() * 8;
    poly([[x - 1.6, 18], [x - 1.1, h * 0.7], [x, h], [x + 1.1, h * 0.7], [x + 1.6, 18]], '#070b12');
  }

  // ── the house ─────────────────────────────────────────────────────────────
  // stone: a wall between two heights, lit a little more toward the moon,
  // its courses showing faintly
  const wall = (x0, x1, y0, y1, tone = 1) => {
    const c = (r, g, b) => `rgb(${Math.round(r * tone)},${Math.round(g * tone)},${Math.round(b * tone)})`;
    const g = ctx.createLinearGradient(X(x0), 0, X(x1), 0);
    g.addColorStop(0, c(34, 40, 52));
    g.addColorStop(1, c(52, 60, 76));
    box(x0, y0, x1, y1, g);
    ctx.save();
    ctx.beginPath(); ctx.rect(X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s); ctx.clip();
    for (let y = y0 + 1.15; y < y1; y += 1.15) box(x0, y, x1, y + 0.1, 'rgba(8,11,18,0.22)');
    for (let i = 0; i < (x1 - x0) * (y1 - y0) * 0.5; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + Math.floor(rnd() * ((y1 - y0) / 1.15)) * 1.15;
      box(x, y, x + 1.2 + rnd() * 1.6, y + 1.05, rnd() < 0.5 ? 'rgba(6,8,14,0.14)' : 'rgba(170,186,220,0.045)');
    }
    // weather under the eaves, damp at the foot
    const top = ctx.createLinearGradient(0, Y(y1), 0, Y(y1 - 3));
    top.addColorStop(0, 'rgba(4,6,10,0.5)');
    top.addColorStop(1, 'rgba(4,6,10,0)');
    ctx.fillStyle = top;
    ctx.fillRect(X(x0), Y(y1), (x1 - x0) * s, 3 * s);
    const area = (x1 - x0) * (y1 - y0);
    // rain has run down it for years: long dark streaks from the top
    for (let i = 0; i < area * 0.028; i++) {
      const x = x0 + rnd() * (x1 - x0), len = 3 + rnd() * (y1 - y0) * 0.5, w = 0.2 + rnd() * 0.7;
      const g = ctx.createLinearGradient(0, Y(y1), 0, Y(y1 - len));
      g.addColorStop(0, 'rgba(3,5,8,0.5)');
      g.addColorStop(1, 'rgba(3,5,8,0)');
      ctx.fillStyle = g;
      ctx.fillRect(X(x), Y(y1), w * s, len * s);
    }
    // damp and lichen in blotches, darkest toward the foot
    for (let i = 0; i < area * 0.014; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + Math.pow(rnd(), 1.6) * (y1 - y0);
      soft(ctx, X(x), Y(y), (1.5 + rnd() * 4) * s, (1 + rnd() * 3) * s, rnd() < 0.7 ? '2,4,6' : '40,52,40', 0.3 + rnd() * 0.3);
    }
    // where the facing has come away: the rough stuff of the wall behind
    for (let i = 0; i < area * 0.0016; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), r = 0.8 + rnd() * 2;
      ctx.fillStyle = 'rgba(14,13,14,0.75)';
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2, q = r * (0.55 + rnd() * 0.6);
        if (k) ctx.lineTo(X(x + Math.cos(a) * q * 1.3), Y(y + Math.sin(a) * q)); else ctx.moveTo(X(x + Math.cos(a) * q * 1.3), Y(y + Math.sin(a) * q));
      }
      ctx.closePath();
      ctx.fill();
    }
    // a crack or two, wandering down from the top
    for (let i = 0; i < area * 0.0014; i++) {
      let x = x0 + rnd() * (x1 - x0), y = y1 - rnd() * (y1 - y0) * 0.4;
      ctx.strokeStyle = 'rgba(2,3,5,0.85)';
      ctx.lineWidth = Math.max(0.7, 0.12 * s);
      ctx.beginPath();
      ctx.moveTo(X(x), Y(y));
      for (let k = 0; k < 9 && y > y0; k++) { x += (rnd() - 0.5) * 1.6; y -= 0.6 + rnd() * 1.5; ctx.lineTo(X(x), Y(y)); }
      ctx.stroke();
    }
    paintManorMaterial(ctx, details, 'stone', X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s, s, 0.55 * tone);
    ctx.restore();
  };
  // ivy over a stretch of wall: thick at the foot, thinning as it climbs
  const ivy = (x0, x1, top, n) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd() * (x1 - x0);
      const y = Math.pow(rnd(), 1.5) * top * (0.5 + 0.5 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI) + 0.25 * Math.sin(x * 1.7));
      ctx.fillStyle = rnd() < 0.78 ? 'rgba(4,8,7,0.92)' : 'rgba(30,48,40,0.8)';
      ctx.beginPath();
      ctx.ellipse(X(x), Y(Math.max(0, y)), (0.3 + rnd() * 0.5) * s, (0.24 + rnd() * 0.4) * s, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  // a crow, sitting
  const crow = (x, y, e = 1) => {
    ctx.fillStyle = '#020304';
    ctx.beginPath(); ctx.ellipse(X(x), Y(y + 0.5), 0.75 * s, 0.46 * s, -0.35 * e, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(X(x + e * 0.62), Y(y + 0.98), 0.3 * s, 0, Math.PI * 2); ctx.fill();
    poly([[x + e * 0.85, y + 1.06], [x + e * 1.42, y + 0.9], [x + e * 0.85, y + 0.84]], '#020304');
    poly([[x - e * 0.5, y + 0.5], [x - e * 1.5, y + 0.12], [x - e * 0.6, y + 0.14]], '#020304');
  };
  // a moulding across a wall: light on its top, shadow under it
  const course = (x0, x1, y, h = 0.7) => {
    box(x0 - 0.3, y, x1 + 0.3, y + h, '#4b5568');
    box(x0 - 0.3, y + h - 0.16, x1 + 0.3, y + h, 'rgba(176,194,236,0.16)');
    box(x0, y - 0.7, x1, y, 'rgba(4,6,10,0.4)');
  };
  // the little square blocks under a cornice
  const dentils = (x0, x1, y) => {
    const n = Math.round((x1 - x0) / 0.95);
    for (let i = 0; i < n; i++) {
      if (rnd() < 0.04) continue; // dropped out
      const x = x0 + ((x1 - x0) * (i + 0.25)) / n;
      box(x, y - 0.55, x + ((x1 - x0) / n) * 0.5, y, '#515c70');
    }
    box(x0, y - 0.72, x1, y - 0.55, 'rgba(4,6,10,0.4)');
  };
  // a flat pilaster up a wall: base, shaft, capital
  const pilaster = (x, y0, y1, w = 1.2) => {
    const g = ctx.createLinearGradient(X(x - w / 2), 0, X(x + w / 2), 0);
    g.addColorStop(0, '#465064');
    g.addColorStop(1, '#6c7890');
    box(x - w / 2, y0, x + w / 2, y1, g);
    box(x - w / 2 - 0.25, y0, x + w / 2 + 0.25, y0 + 0.6, '#5a667c');
    box(x - w / 2 - 0.3, y1 - 0.75, x + w / 2 + 0.3, y1, '#7a88a2');
    box(x - w / 2 - 0.3, y1 - 1, x + w / 2 + 0.3, y1 - 0.75, '#5a667c');
  };
  // dressed stones up a corner
  const quoins = (x, y0, y1, side) => {
    for (let y = y0, i = 0; y < y1 - 0.5; y += 1.15, i++) {
      if (rnd() < 0.04) continue; // fallen
      const w = i % 2 ? 1.5 : 2.3;
      box(side < 0 ? x : x - w, y, side < 0 ? x + w : x, y + 1.05, 'rgba(120,136,168,0.22)');
    }
  };
  // slate: a roof slope between two heights, drawing in toward its top
  const slate = (x0, x1, y0, y1, inset) => {
    poly([[x0 - 0.8, y0], [x1 + 0.8, y0], [x1 - inset, y1], [x0 + inset, y1]]);
    const g = ctx.createLinearGradient(X(x0), 0, X(x1), 0);
    g.addColorStop(0, '#0d121b');
    g.addColorStop(1, '#1b2434');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let y = y0 + 0.75; y < y1; y += 0.75) box(x0 - 1, y, x1 + 1, y + 0.08, 'rgba(0,0,0,0.4)');
    for (let i = 0; i < (x1 - x0) * 3; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + Math.floor(rnd() * ((y1 - y0) / 0.75)) * 0.75;
      box(x, y, x + 0.9, y + 0.7, rnd() < 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(150,172,222,0.08)');
    }
    paintManorMaterial(ctx, details, 'slate', X(x0 - 1), Y(y1), (x1 - x0 + 2) * s, (y1 - y0) * s, s, 0.72);
    // the moon lying on it
    const m = ctx.createLinearGradient(0, Y(y1), 0, Y(y0));
    m.addColorStop(0, 'rgba(150,178,232,0.12)');
    m.addColorStop(1, 'rgba(150,178,232,0)');
    ctx.fillStyle = m;
    ctx.fillRect(X(x0 - 1), Y(y1), (x1 - x0 + 2) * s, (y1 - y0) * s);
    // slates gone: holes, the battens showing in them; others slipped; moss
    for (let i = 0; i < (x1 - x0) * 0.05; i++) {
      const x = x0 + 1 + rnd() * (x1 - x0 - 2), y = y0 + 0.75 * Math.floor(rnd() * ((y1 - y0) / 0.75 - 2)), w = 0.9 + rnd() * 2.8, h = 0.75 * (1 + Math.floor(rnd() * 3));
      ctx.fillStyle = '#020305';
      ctx.fillRect(X(x), Y(y + h), w * s, h * s);
      ctx.fillStyle = 'rgba(70,60,48,0.5)';
      for (let k = 0.3; k < h; k += 0.75) ctx.fillRect(X(x), Y(y + k), w * s, Math.max(1, 0.1 * s));
    }
    for (let i = 0; i < (x1 - x0) * 0.18; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + 0.75 * Math.floor(rnd() * ((y1 - y0) / 0.75));
      ctx.save();
      ctx.translate(X(x), Y(y));
      ctx.rotate((rnd() - 0.5) * 0.5);
      ctx.fillStyle = 'rgba(4,6,10,0.7)';
      ctx.fillRect(0, 0, 0.9 * s, 0.75 * s);
      ctx.restore();
    }
    for (let i = 0; i < (x1 - x0) * 0.1; i++) soft(ctx, X(x0 + rnd() * (x1 - x0)), Y(y0 + rnd() * (y1 - y0) * 0.6), (1 + rnd() * 2.4) * s, (0.5 + rnd()) * s, '34,48,34', 0.45);
    ctx.restore();
    // the lead along its top, and the slope's edge toward the moon
    box(x0 + inset - 0.2, y1, x1 - inset + 0.2, y1 + 0.4, '#38445a');
    ctx.strokeStyle = 'rgba(170,192,240,0.2)';
    ctx.lineWidth = Math.max(1, 0.16 * s);
    ctx.beginPath(); ctx.moveTo(X(x1 + 0.8), Y(y0)); ctx.lineTo(X(x1 - inset), Y(y1)); ctx.stroke();
  };
  const chimney = (x, y0, h, w = 2.4) => {
    const g = ctx.createLinearGradient(X(x), 0, X(x + w), 0);
    g.addColorStop(0, '#1a1f2a');
    g.addColorStop(1, '#3a4456');
    box(x, y0, x + w, y0 + h, g);
    box(x - 0.3, y0 + h, x + w + 0.3, y0 + h + 0.6, '#4a566a');
    for (let i = 0; i < 2; i++) box(x + 0.4 + i * 1.1, y0 + h + 0.6, x + 0.9 + i * 1.1, y0 + h + 1.5, '#1c222c');
  };
  // A window: its stone surround and sill, the glass — dark, with the moon
  // sliding across it, or lit, with curtains drawn back — and its bars.
  const window_ = (x, y, w, h, { lit = false, arch = false, tone = 0, who = null } = {}) => {
    const x0 = x - w / 2;
    // what has become of it: under 0.13 a pane is out, under 0.19 it is boarded
    const fate = lit ? 1 : rnd();
    // Keep the seeded weather and later landscape identical while using
    // the detailed window in place of the original painted outline.
    if (details) { ctx.save(); ctx.globalAlpha = 0; }
    box(x0 - 0.5, y - 0.3, x0 + w + 0.5, y + h + (arch ? 0 : 0.5), '#4a5466');
    if (arch) { ctx.fillStyle = '#4a5466'; ctx.beginPath(); ctx.arc(X(x), Y(y + h), (w / 2 + 0.5) * s, Math.PI, 0); ctx.fill(); }
    box(x0 - 0.8, y - 0.8, x0 + w + 0.8, y - 0.3, '#5a667a');
    box(x0 - 0.8, y - 1.3, x0 + w + 0.8, y - 0.8, 'rgba(4,6,10,0.45)');
    // the keystone over it
    const ky = y + h + (arch ? w / 2 + 0.5 : 0.5);
    poly([[x - 0.42, ky - 0.5], [x + 0.42, ky - 0.5], [x + 0.62, ky + 0.75], [x - 0.62, ky + 0.75]], '#66728a');
    const glass = () => {
      ctx.beginPath();
      ctx.rect(X(x0), Y(y + h), w * s, h * s);
      if (arch) ctx.arc(X(x), Y(y + h), (w / 2) * s, Math.PI, 0);
    };
    glass();
    if (lit) {
      const g = ctx.createRadialGradient(X(x), Y(y + h * 0.3), 0.2 * s, X(x), Y(y + h * 0.45), h * 0.95 * s);
      const hot = [['#fff0c2', '#ffcf82', '#c97a2c'], ['#ffe2a6', '#f0b060', '#a8601e'], ['#ffeccc', '#f6c488', '#b0703a']][tone % 3];
      g.addColorStop(0, hot[0]);
      g.addColorStop(0.45, hot[1]);
      g.addColorStop(1, hot[2]);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      glass();
      ctx.clip();
      // curtains drawn back to either side, a pelmet over them
      for (const e of [-1, 1]) {
        ctx.fillStyle = 'rgba(92,40,22,0.6)';
        ctx.beginPath();
        ctx.moveTo(X(x + e * w / 2), Y(y + h + w));
        ctx.quadraticCurveTo(X(x + e * w * 0.16), Y(y + h * 0.62), X(x + e * w * 0.34), Y(y));
        ctx.lineTo(X(x + e * w / 2), Y(y));
        ctx.closePath();
        ctx.fill();
      }
      box(x0, y + h - 0.5, x0 + w, y + h + w, 'rgba(80,34,18,0.5)');
      // something in the room, against the light
      if (who === 'scope') {
        // the telescope on its tripod, pointed at the moon
        ctx.strokeStyle = '#1a0f08';
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.42 * s;
        ctx.beginPath(); ctx.moveTo(X(x - 1), Y(y + 1.6)); ctx.lineTo(X(x + 1.1), Y(y + 3.6)); ctx.stroke();
        ctx.lineWidth = 0.16 * s;
        for (const dx of [-0.8, 0, 0.8]) { ctx.beginPath(); ctx.moveTo(X(x), Y(y + 2.5)); ctx.lineTo(X(x + dx), Y(y)); ctx.stroke(); }
        ctx.lineCap = 'butt';
      } else if (who === 'lamp') {
        box(x - 0.1, y, x + 0.1, y + 1.5, '#2a1608');
        poly([[x - 0.75, y + 1.5], [x + 0.75, y + 1.5], [x + 0.45, y + 2.5], [x - 0.45, y + 2.5]], '#fff6dc');
      }
      ctx.restore();
      lights.push({ x: X(x), y: Y(y + h / 2), w: w * s, h: h * s, ph: rnd() * 6.28, sp: 0.25 + rnd() * 0.5, });
    } else {
      ctx.fillStyle = '#05080e';
      ctx.fill();
      ctx.save();
      glass();
      ctx.clip();
      // the night in the glass: the sky's blue low in it, the moon in a streak
      const g = ctx.createLinearGradient(0, Y(y + h), 0, Y(y));
      g.addColorStop(0, 'rgba(60,84,140,0.34)');
      g.addColorStop(1, 'rgba(60,84,140,0.04)');
      ctx.fillStyle = g;
      ctx.fillRect(X(x0), Y(y + h + w), w * s, (h + w) * s);
      if (rnd() < 0.6) {
        ctx.fillStyle = 'rgba(176,198,246,0.2)';
        const o = rnd() * w * 0.4;
        ctx.beginPath();
        ctx.moveTo(X(x0 + o + w * 0.5), Y(y + h + w)); ctx.lineTo(X(x0 + o + w * 0.72), Y(y + h + w));
        ctx.lineTo(X(x0 + o + w * 0.22), Y(y)); ctx.lineTo(X(x0 + o), Y(y));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // the glazing bars — where they are still there
    ctx.fillStyle = lit ? 'rgba(54,28,10,0.9)' : '#1c2330';
    const bw = Math.max(1, 0.16 * s);
    ctx.fillRect(X(x) - bw / 2, Y(y + h + (arch ? w / 2 : 0)), bw, (h + (arch ? w / 2 : 0)) * s);
    for (let i = 1; i < Math.round(h / 1.7); i++) {
      if (fate < 0.25 && rnd() < 0.25) continue;
      ctx.fillRect(X(x0), Y(y + (h * i) / Math.round(h / 1.7)) - bw / 2, w * s, bw);
    }
    if (arch) ctx.fillRect(X(x0), Y(y + h) - bw / 2, w * s, bw);
    if (fate < 0.13) {
      // a pane out: a ragged black hole, cracks running from it
      const hx = x + (rnd() - 0.5) * w * 0.5, hy = y + h * (0.25 + rnd() * 0.5), r = w * (0.2 + rnd() * 0.16);
      ctx.fillStyle = '#010203';
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2, q = r * (k % 2 ? 0.5 + rnd() * 0.3 : 1 + rnd() * 0.5);
        if (k) ctx.lineTo(X(hx + Math.cos(a) * q), Y(hy + Math.sin(a) * q)); else ctx.moveTo(X(hx + Math.cos(a) * q), Y(hy + Math.sin(a) * q));
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,170,214,0.3)';
      ctx.lineWidth = Math.max(0.6, 0.07 * s);
      for (let k = 0; k < 4; k++) {
        const a = rnd() * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(X(hx + Math.cos(a) * r), Y(hy + Math.sin(a) * r)); ctx.lineTo(X(hx + Math.cos(a + 0.2) * r * 2.6), Y(hy + Math.sin(a + 0.2) * r * 2.6)); ctx.stroke();
      }
    } else if (fate < 0.19) {
      // boarded up: rough planks nailed across, none of them level
      for (let k = 0; k < 4; k++) {
        ctx.save();
        ctx.translate(X(x), Y(y + h * (0.14 + k * 0.25)));
        ctx.rotate((rnd() - 0.5) * 0.24);
        ctx.fillStyle = k % 2 ? '#1c1814' : '#231d17';
        ctx.fillRect(-(w / 2 + 0.6) * s, -0.55 * s, (w + 1.2) * s, 1.1 * s);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-(w / 2 + 0.6) * s, 0.4 * s, (w + 1.2) * s, 0.15 * s);
        ctx.fillStyle = '#05070a';
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * (w / 2 + 0.2) * s, 0, 0.12 * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    }
    // a shutter left hanging by one hinge
    if (!lit && w >= 3 && fate > 0.7 && fate < 0.76) {
      const e = fate < 0.73 ? -1 : 1;
      ctx.save();
      ctx.translate(X(x + e * (w / 2 + 0.3)), Y(y + h));
      ctx.rotate(e * (0.1 + rnd() * 0.16));
      ctx.fillStyle = '#0c1014';
      ctx.fillRect(e > 0 ? 0 : -w * 0.5 * s, 0, w * 0.5 * s, h * s);
      ctx.fillStyle = 'rgba(60,72,90,0.35)';
      for (let k = 0.5; k < h; k += 0.6) ctx.fillRect(e > 0 ? 0.1 * s : (-w * 0.5 + 0.1) * s, k * s, (w * 0.5 - 0.2) * s, 0.12 * s);
      ctx.restore();
    }
    if (details) {
      ctx.restore();
      const rise = arch ? w / 2 : 0;
      paintManorWindow(ctx, details, X(x0 - 0.9), Y(y + h + rise + 1), (w + 1.8) * s, (h + rise + 2.2) * s, arch, lit);
      if (!lit && fate < 0.13) {
        poly([[x - w * 0.2, y + h * 0.24], [x + w * 0.15, y + h * 0.32], [x + w * 0.24, y + h * 0.62], [x - w * 0.08, y + h * 0.55]], '#020407');
      } else if (!lit && fate < 0.19) {
        for (const height of [0.37, 0.62]) {
          const wood = ctx.createLinearGradient(0, Y(y + h * height + 0.65), 0, Y(y + h * height));
          wood.addColorStop(0, '#4f4232'); wood.addColorStop(0.22, '#62523d'); wood.addColorStop(1, '#211c16');
          box(x0 - 0.3, y + h * height, x0 + w + 0.3, y + h * height + 0.65, wood);
        }
      }
      if (lit && who === 'scope') {
        ctx.strokeStyle = '#1a0f08'; ctx.lineCap = 'round'; ctx.lineWidth = 0.42 * s;
        ctx.beginPath(); ctx.moveTo(X(x - 1), Y(y + 1.6)); ctx.lineTo(X(x + 1.1), Y(y + 3.6)); ctx.stroke();
        ctx.lineWidth = 0.16 * s;
        for (const dx of [-0.8, 0, 0.8]) { ctx.beginPath(); ctx.moveTo(X(x), Y(y + 2.5)); ctx.lineTo(X(x + dx), Y(y)); ctx.stroke(); }
        ctx.lineCap = 'butt';
      }
    }
  };
  // hardly a window in the house is alight
  const lit = () => false;

  // ── the back plane: a short wing either side, the tower beyond the right one
  plane(false);
  for (const e of [-1, 1]) {
    const x0 = e < 0 ? -43 : 20, x1 = e < 0 ? -20 : 43;
    chimney(e * 35 - 1.1, 30, 5.6, 2.2);
    slate(x0, x1, 22.6, 30.6, 2.6);
    wall(x0, x1, 0, 22, 0.9);
    course(x0, x1, 22, 0.8);
    dentils(x0, x1, 22);
    course(x0, x1, 10.6, 0.5);
    box(x0, 0, x1, 1, '#2a323f');
    if (e < 0) quoins(-43, 0, 22, -1);
    for (const [y, h] of FLOORS.wing) {
      for (let i = 0; i < 3; i++) {
        window_(e * (29.8 + i * 5.2), y, 3, h, { lit: e > 0 && i === 1 && y > 5, tone: 1, arch: y > 5 });
      }
    }
    for (const i of [0, 2]) {
      const x = e * (29.8 + i * 5.2); // over the first and the third windows
      // a dormer: its little gable, its window
      poly([[x - 2.1, 23], [x + 2.1, 23], [x + 2.1, 26.8], [x, 28.6], [x - 2.1, 26.8]], '#2e3848');
      poly([[x - 2.5, 26.6], [x, 29], [x + 2.5, 26.6], [x + 2.5, 26.2], [x, 28.5], [x - 2.5, 26.2]], '#55627a');
      window_(x, 23.5, 2.2, 2.9, { lit: lit() });
    }
    // ivy at the far end of the left wing, a little at the foot of the right
    if (e < 0) ivy(-43, -31, 17, 230); else ivy(37, 43, 7, 60);
  }
  // the tower: three storeys and a steep roof to a finial
  poly([[42, 30.6], [56, 30.6], [49, 46]], '#0f141e');
  poly([[49, 46], [56, 30.6], [49, 30.6]], '#1f2a3c');
  ctx.save();
  poly([[42, 30.6], [56, 30.6], [49, 46]]);
  ctx.clip();
  for (let y = 31.4; y < 46; y += 0.8) box(41, y, 57, y + 0.08, 'rgba(0,0,0,0.4)');
  paintManorMaterial(ctx, details, 'slate', X(42), Y(46), 14 * s, 15.4 * s, s, 0.68);
  ctx.restore();
  ctx.strokeStyle = 'rgba(176,198,246,0.55)';
  ctx.lineWidth = Math.max(1, 0.16 * s);
  ctx.beginPath(); ctx.moveTo(X(56), Y(30.6)); ctx.lineTo(X(49), Y(46)); ctx.stroke();
  box(48.9, 46, 49.1, 49, '#4a566a');
  ctx.fillStyle = '#6a7890';
  ctx.beginPath(); ctx.arc(X(49), Y(49.2), 0.45 * s, 0, Math.PI * 2); ctx.fill();
  wall(43, 55, 0, 30, 1);
  course(42.4, 55.6, 30, 0.9);
  dentils(43, 55, 30);
  course(43, 55, 20, 0.5);
  course(43, 55, 10, 0.5);
  quoins(43, 0, 30, -1);
  quoins(55, 0, 30, 1);
  window_(49, 1.4, 3.2, 6.2, { lit: false });
  window_(49, 11.4, 3.2, 5.8, { lit: false, arch: true });
  // the top room of the tower: lit, and the telescope standing in its window
  window_(49, 21, 4.2, 5.6, { lit: true, tone: 0, who: 'scope', arch: true });
  // at the tower only round its foot: the room at the top, and what stands
  // in its window, are clear
  ivy(43, 48, 10, 80);
  crow(49.3, 49.3, -1);
  // the wing's roof falls in the tower's shadow, away from the moon
  const shade = ctx.createLinearGradient(X(34), 0, X(43), 0);
  shade.addColorStop(0, 'rgba(3,5,9,0)');
  shade.addColorStop(1, 'rgba(3,5,9,0.5)');
  ctx.fillStyle = shade;
  ctx.fillRect(X(34), Y(31), 9 * s, 31 * s);
  // The middle block stands between the wings and the moon's fall of light:
  // its shadow lies long on the left wing, and close in the corner on the right
  for (const [xa, xb, a] of [[-38, -25, 0.7], [31, 25, 0.5]]) {
    const g = ctx.createLinearGradient(X(xa), 0, X(xb), 0);
    g.addColorStop(0, 'rgba(2,4,8,0)');
    g.addColorStop(1, `rgba(2,4,8,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(X(xa), X(xb)), Y(31), Math.abs(xb - xa) * s, 31 * s);
  }
  // ── the forecourt between the two planes: flagged, in the house's shadow
  plane(true);
  const court = ctx.createLinearGradient(0, gy - BACK * s0, 0, gy);
  court.addColorStop(0, '#12161d');
  court.addColorStop(1, '#232830');
  ctx.fillStyle = court;
  ctx.fillRect(0, Math.round(gy - BACK * s0), W, Math.ceil(BACK * s0) + 1);
  for (let i = 0; i < 60; i++) {
    const x = rnd() * W;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, gy - BACK * s0, Math.max(1, 0.08 * s0), BACK * s0);
  }
  // ── the front plane: the middle block
  chimney(-16.2, 39, 4.2);
  // the right-hand stack has lost its top
  poly([[13.8, 39], [16.2, 39], [16.2, 41.6], [15.4, 40.8], [14.9, 42], [14.3, 41], [13.8, 41.5]], '#262c38');
  // the middle block: three storeys, a mansard, the bay standing forward
  slate(-22, 22, 30.8, 39.4, 3.4);
  for (let x = -18.2; x <= 18.21; x += 0.7) {
    if (rnd() < 0.1 || (x > 4.5 && x < 8)) continue; // rusted through, or carried off
    box(x - 0.05, 39.8, x + 0.05, 40.7, '#2a3344');
    ctx.fillStyle = '#3a465c';
    ctx.beginPath(); ctx.arc(X(x), Y(40.8), 0.14 * s, 0, Math.PI * 2); ctx.fill();
  }
  box(-18.4, 40.2, 4.5, 40.3, '#2a3344');
  box(8, 40.2, 18.4, 40.3, '#2a3344');
  crow(-7.4, 39.9);
  crow(-4.8, 39.9, -1);
  crow(11.6, 39.9);
  for (const x of [-15.6, 15.6]) {
    poly([[x - 2.3, 31.4], [x + 2.3, 31.4], [x + 2.3, 35.2], [x, 37.2], [x - 2.3, 35.2]], '#2e3848');
    poly([[x - 2.7, 35], [x, 37.6], [x + 2.7, 35], [x + 2.7, 34.6], [x, 37.1], [x - 2.7, 34.6]], '#55627a');
    window_(x, 31.9, 2.4, 3, { lit: false });
  }
  wall(-22, 22, 0, 30);
  quoins(-22, 0, 30, -1);
  quoins(22, 0, 30, 1);
  course(-22, 22, 30, 1);
  dentils(-22, 22, 30);
  course(-22, 22, 20.2, 0.5);
  course(-22, 22, 10, 0.6);
  // the ground floor cut in deep courses
  for (let y = 1.6; y < 10; y += 1.6) box(-22, y, 22, y + 0.2, 'rgba(4,6,10,0.4)');
  box(-22, 0, 22, 1, '#2a323f');
  FLOORS.mid.forEach(([y, h], f) => {
    for (const x of [-17.6, -12.6, 12.6, 17.6]) window_(x, y, 3.2, h, { lit: lit(), arch: f === 1 });
  });
  // the bay: a little forward of the wall, so lighter, and throwing its
  // shadow on the wall to its left
  const cast = ctx.createLinearGradient(X(-13), 0, X(-9), 0);
  cast.addColorStop(0, 'rgba(3,5,9,0)');
  cast.addColorStop(1, 'rgba(3,5,9,0.55)');
  ctx.fillStyle = cast;
  ctx.fillRect(X(-13), Y(30), 4 * s, 30 * s);
  wall(-9, 9, 0, 30.4, 1.14);
  course(-9, 9, 20.2, 0.5);
  for (const x of [-8.3, -2.7, 2.7, 8.3]) pilaster(x, 14.4, 30.2);
  dentils(-9.6, 9.6, 30.2);
  // its pediment, a round window in it
  poly([[-10.4, 30.4], [10.4, 30.4], [0, 37.6]], '#3c4658');
  poly([[-8.4, 31.2], [8.4, 31.2], [0, 36.6]], '#2a3342');
  if (details) {
    ctx.save();
    poly([[-10.4, 30.4], [10.4, 30.4], [0, 37.6]]); ctx.clip();
    paintManorMaterial(ctx, details, 'stone', X(-10.4), Y(37.6), 20.8 * s, 7.2 * s, s, 0.48);
    ctx.restore();
  }
  box(-10.6, 30, 10.6, 31, '#566278');
  box(-10.6, 30.84, 10.6, 31, 'rgba(180,198,240,0.5)');
  ctx.strokeStyle = 'rgba(176,198,246,0.5)';
  ctx.lineWidth = Math.max(1, 0.18 * s);
  ctx.beginPath(); ctx.moveTo(X(10.4), Y(30.6)); ctx.lineTo(X(0), Y(37.6)); ctx.stroke();
  ctx.fillStyle = '#566278';
  ctx.beginPath(); ctx.arc(X(0), Y(33.2), 1.75 * s, 0, Math.PI * 2); ctx.fill();
  const oc = ctx.createRadialGradient(X(0), Y(33), 0.1 * s, X(0), Y(33.2), 1.4 * s);
  oc.addColorStop(0, '#0e1420');
  oc.addColorStop(1, '#04070c');
  ctx.fillStyle = oc;
  ctx.beginPath(); ctx.arc(X(0), Y(33.2), 1.35 * s, 0, Math.PI * 2); ctx.fill();
  box(-0.08, 31.85, 0.08, 34.55, '#1c2330');
  box(-1.35, 33.12, 1.35, 33.28, '#1c2330');
  // the bay's upper windows: the tall ones of the great room, all alight
  for (const x of [-5.4, 0, 5.4]) {
    window_(x, 21.6, 3.2, 5.4, { lit: false });
    // one candle in the great room, over the porch
    window_(x, 11.8, 3.4, 6.8, { lit: x === 0, tone: 1, arch: true });
  }

  ivy(-22, -17, 13, 130);
  // ── the porch: four columns, the door between them, a balcony over
  if (details) { ctx.save(); ctx.globalAlpha = 0; }
  const porch = ctx.createLinearGradient(0, Y(10.4), 0, Y(0));
  porch.addColorStop(0, '#08090c');
  porch.addColorStop(1, '#1a1612');
  box(-8, 0, 8, 10.4, porch);
  // the sidelights, and the door: two leaves of dark oak under a lit fanlight
  for (const e of [-1, 1]) window_(e * 5.3, 1.4, 1.9, 6.2, { lit: false });
  box(-2.5, 0, 2.5, 8.2, '#55412c');
  ctx.fillStyle = '#55412c';
  ctx.beginPath(); ctx.arc(X(0), Y(8.2), 2.5 * s, Math.PI, 0); ctx.fill();
  const fan = ctx.createRadialGradient(X(0), Y(8.2), 0.2 * s, X(0), Y(8.2), 2 * s);
  fan.addColorStop(0, '#0e1420');
  fan.addColorStop(1, '#04070c');
  ctx.fillStyle = fan;
  ctx.beginPath(); ctx.arc(X(0), Y(8.2), 2 * s, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(54,28,10,0.9)';
  ctx.lineWidth = Math.max(1, 0.14 * s);
  for (let i = 1; i < 5; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    ctx.beginPath(); ctx.moveTo(X(0), Y(8.2)); ctx.lineTo(X(0) + Math.cos(a) * 2 * s, Y(8.2) + Math.sin(a) * 2 * s); ctx.stroke();
  }
  const leaf = ctx.createLinearGradient(X(-2), 0, X(2), 0);
  leaf.addColorStop(0, '#2c1a0e');
  leaf.addColorStop(0.5, '#4a2e18');
  leaf.addColorStop(1, '#2c1a0e');
  box(-2, 0, 2, 8, leaf);
  box(-0.06, 0, 0.06, 8, '#120a05');
  for (const e of [-1, 1]) {
    for (const [y0, y1] of [[0.7, 3.2], [3.8, 7.3]]) {
      ctx.strokeStyle = 'rgba(12,6,3,0.8)';
      ctx.lineWidth = Math.max(1, 0.12 * s);
      ctx.strokeRect(X(e < 0 ? -1.7 : 0.35), Y(y1), 1.35 * s, (y1 - y0) * s);
    }
    ctx.fillStyle = '#e0b860';
    ctx.beginPath(); ctx.arc(X(e * 0.4), Y(3.9), 0.2 * s, 0, Math.PI * 2); ctx.fill();
    // a lantern either side of the door
    box(e * 3.3 - 0.08, 6.8, e * 3.3 + 0.08, 7.6, '#1a120a');
    box(e * 3.3 - 0.42, 5.5, e * 3.3 + 0.42, 6.8, e > 0 ? '#ffd890' : '#10151d');
    box(e * 3.3 - 0.5, 6.7, e * 3.3 + 0.5, 6.95, '#1a120a');
    box(e * 3.3 - 0.5, 5.35, e * 3.3 + 0.5, 5.55, '#1a120a');
    // only the right-hand one still burns
    if (e > 0) lights.push({ x: X(details ? 4.1 : e * 3.3), y: Y(details ? 5.9 : 6.1), w: 1.6 * s, h: 2 * s, ph: e, sp: 1.3, lamp: true });
  }
  // the lanterns' light inside the porch and out over its floor
  soft(ctx, X(3), Y(5), 6 * s, 6 * s, WARM, 0.2, 'lighter');
  // the columns, round: lit on the moon's side, each on its base
  for (const x of [-7.2, -3.6, 3.6, 7.2]) {
    const g = ctx.createLinearGradient(X(x - 0.6), 0, X(x + 0.6), 0);
    g.addColorStop(0, '#2c3442');
    g.addColorStop(0.6, '#7c8aa4');
    g.addColorStop(1, '#49556a');
    box(x - 0.55, 0.9, x + 0.55, 9.8, g);
    box(x - 0.85, 0, x + 0.85, 0.9, '#55627a');
    box(x - 0.8, 9.8, x + 0.8, 10.5, '#6a7890');
  }
  // the entablature, and the balcony's stone balusters over it
  box(-8.6, 10.5, 8.6, 12, '#566278');
  box(-8.9, 11.8, 8.9, 12.25, '#7a88a2');
  box(-8.6, 10.5, 8.6, 10.75, 'rgba(4,6,10,0.4)');
  for (let x = -8; x <= 8.01; x += 0.8) {
    if ((x > 2.6 && x < 4.6) || rnd() < 0.03) continue; // a length of it has gone over
    box(x - 0.16, 12.25, x + 0.16, 13.9, '#4f5b70');
  }
  box(-8.6, 13.9, 2.6, 14.3, '#7a88a2');
  box(4.6, 13.9, 8.6, 14.3, '#7a88a2');
  for (const x of [-8.3, 8.3]) box(x - 0.4, 12.25, x + 0.4, 14.5, '#66738c');
  if (details) {
    ctx.restore();
    paintManorEntrance(ctx, details, X(-9.5), Y(14.6), 19 * s, 14.6 * s);
  }

  const doorAt = { x: X(-2.5), y: Y(10.7), w: 5 * s, h: 10.7 * s };
  s = s0; lift = 0;

  // ── the ground: lawn, the drive coming up it, the steps
  const lawn = ctx.createLinearGradient(0, gy, 0, H);
  lawn.addColorStop(0, '#0c1719');
  lawn.addColorStop(0.4, '#0a1315');
  lawn.addColorStop(1, '#05090b');
  ctx.fillStyle = lawn;
  ctx.fillRect(0, gy, W, H - gy);
  // a place on the ground: x across (units at the house), z 0 at the foot of
  // the steps and 1 at the bottom of the screen; things grow as they come
  const foot = gy + 4.1 * s;
  const G = (x, z) => ({ x: cx + x * s * (1 + 1.7 * z), y: foot + (H - foot) * z, k: 1 + 1.7 * z });
  for (let i = 0; i < 3600; i++) {
    const z = Math.pow(rnd(), 0.8), p = G((rnd() * 2 - 1) * 110 / (1 + 1.7 * z), z);
    const len = (0.6 + z * 2.2) * s * (0.5 + rnd()); // uncut for years
    ctx.strokeStyle = rnd() < 0.55 ? 'rgba(1,4,5,0.5)' : 'rgba(110,150,140,0.12)';
    ctx.lineWidth = Math.max(0.6, 0.07 * s * p.k);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (rnd() - 0.5) * len * 0.4, p.y - len); ctx.stroke();
  }
  // the moon across the lawn from the right
  soft(ctx, X(46), gy + (H - gy) * 0.5, 60 * s, (H - gy) * 0.6, MOON, 0.13, 'lighter');
  // the drive
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) { const p = G(-12.5, i / 20); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
  for (let i = 20; i >= 0; i--) { const p = G(12.5, i / 20); ctx.lineTo(p.x, p.y); }
  ctx.closePath();
  const drive = ctx.createLinearGradient(0, foot, 0, H);
  drive.addColorStop(0, '#2c2b2a');
  drive.addColorStop(0.3, '#22242a');
  drive.addColorStop(1, '#121419');
  ctx.fillStyle = drive;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 2200; i++) {
    const z = Math.pow(rnd(), 1.3), p = G((rnd() * 2 - 1) * 12.5, z);
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.3)' : 'rgba(196,208,236,0.16)';
    ctx.fillRect(p.x, p.y, 0.14 * s * p.k, 0.09 * s * p.k);
  }
  // the door's light running down it
  soft(ctx, X(4), foot, 9 * s, (H - foot) * 0.3, WARM, 0.1, 'lighter');
  // grass and moss coming through the gravel, in patches
  for (let i = 0; i < 90; i++) {
    const z = Math.pow(rnd(), 1.1), p = G((rnd() * 2 - 1) * 12.5, z);
    soft(ctx, p.x, p.y, (0.8 + rnd() * 2.6) * s * p.k, (0.3 + rnd() * 0.8) * s * p.k, '6,12,10', 0.75);
  }
  ctx.restore();
  // its edges lost under weeds and seedlings
  for (let i = 0; i < 300; i++) {
    const z = Math.pow(rnd(), 0.9), e = rnd() < 0.5 ? -1 : 1, p = G(e * (10.6 + rnd() * 4.2), z), u = s * p.k;
    ctx.fillStyle = '#040809';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 0.3 * u, (0.4 + rnd() * 1.1) * u, (0.3 + rnd() * 0.7) * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rnd() < 0.7 ? '#040809' : 'rgba(96,126,120,0.28)';
    ctx.lineWidth = Math.max(0.6, 0.08 * u);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.moveTo(p.x + (rnd() - 0.5) * u, p.y); ctx.lineTo(p.x + (rnd() - 0.5) * 2 * u, p.y - (0.8 + rnd() * 2.2) * u); ctx.stroke();
    }
  }
  // the hedge along the foot of the house, and the light of the ground-floor
  // windows falling on it
  plane(false);
  for (const [x0, x1] of [[-46, -26.8], [26.8, 58]]) {
    // nobody has clipped it: it has grown into a thicket, tall and ragged
    ctx.fillStyle = '#04080a';
    for (let x = x0; x < x1; x += 0.45) {
      const top = 2.6 + 1.5 * Math.sin(x * 0.8) + 1.1 * Math.sin(x * 2.1 + 1) + rnd() * 1.6;
      for (let y = 0; y < top; y += 0.7) { ctx.beginPath(); ctx.arc(X(x + (rnd() - 0.5) * 0.6), Y(y), (0.5 + rnd() * 0.4) * s, 0, Math.PI * 2); ctx.fill(); }
      if (rnd() < 0.2) {
        ctx.strokeStyle = '#04080a';
        ctx.lineWidth = Math.max(0.6, 0.1 * s);
        ctx.beginPath(); ctx.moveTo(X(x), Y(top)); ctx.lineTo(X(x + (rnd() - 0.5) * 1.6), Y(top + 1 + rnd() * 2.2)); ctx.stroke();
      }
    }
  }
  plane(true);
  // the steps: five of them, widening as they come down
  for (let i = 0; i < 5; i++) {
    const hw = 9 + i * 0.75, y = -i * 0.68;
    box(-hw, y - 0.68, hw, y, '#1c222c');
    const g = ctx.createLinearGradient(X(-hw), 0, X(hw), 0);
    g.addColorStop(0, '#424b58');
    g.addColorStop(0.6, '#5c6270');
    g.addColorStop(1, '#4e5868');
    box(-hw, y - 0.2, hw, y, g);
    // broken at the edges, weeds in the joints
    if (i % 2) {
      const x = (rnd() * 2 - 1) * hw;
      poly([[x, y], [x + 0.5 + rnd() * 1.2, y], [x + 0.3 + rnd(), y - 0.3 - rnd() * 0.3]], '#12161d');
    }
    ctx.strokeStyle = '#05090a';
    ctx.lineWidth = Math.max(0.6, 0.09 * s);
    for (let k = 0; k < 3; k++) {
      const x = (rnd() * 2 - 1) * hw;
      ctx.beginPath(); ctx.moveTo(X(x), Y(y - 0.68)); ctx.lineTo(X(x + (rnd() - 0.5) * 0.7), Y(y - 0.68 + 0.5 + rnd() * 0.9)); ctx.stroke();
    }
  }
  // a crack right down the flight
  ctx.strokeStyle = 'rgba(2,3,5,0.9)';
  ctx.lineWidth = Math.max(0.8, 0.13 * s);
  ctx.beginPath();
  ctx.moveTo(X(-3.4), Y(0));
  for (let k = 1; k <= 6; k++) ctx.lineTo(X(-3.4 - k * 0.5 + (k % 2) * 0.7), Y(-k * 0.57));
  ctx.stroke();
  // a low wall either side of them, ending in a pier with an urn on it
  for (const e of [-1, 1]) {
    const x0 = e * 9.2, x1 = e * 13.2;
    const g = ctx.createLinearGradient(0, Y(1.2), 0, Y(-3.4));
    g.addColorStop(0, '#4a5568');
    g.addColorStop(1, '#262d3a');
    box(Math.min(x0, x1), -3.4, Math.max(x0, x1), 1.1, g);
    box(Math.min(x0, x1) - 0.2, 1.1, Math.max(x0, x1) + 0.2, 1.5, '#74829c');
    const ux = e * 11.9;
    box(ux - 1.3, 1.5, ux + 1.3, 2.1, '#5c687e');
    poly([[ux - 0.35, 2.1], [ux + 0.35, 2.1], [ux + 0.5, 2.7], [ux + 1.15, 3.9], [ux + 1.3, 4.6], [ux - 1.3, 4.6], [ux - 1.15, 3.9], [ux - 0.5, 2.7]], '#68748c');
    box(ux - 1.45, 4.6, ux + 1.45, 4.85, '#8492ac');
    // what grew in it died long ago: a few dry stalks
    ctx.strokeStyle = '#05080a';
    ctx.lineWidth = Math.max(0.6, 0.1 * s);
    for (let k = 0; k < 7; k++) {
      const dx = (rnd() - 0.5) * 3.4;
      ctx.beginPath(); ctx.moveTo(X(ux + dx * 0.2), Y(4.85)); ctx.quadraticCurveTo(X(ux + dx * 0.5), Y(6.4), X(ux + dx), Y(6.6 + rnd() * 2.4)); ctx.stroke();
    }
  }
  s = s0; lift = 0;
  // The lamps up the drive: iron posts, leaning now, their glass dark — all
  // but one, which still gives a little light, and not steadily.
  const lamps = [];
  for (const z of [0.07, 0.27, 0.56]) {
    for (const e of [-1, 1]) {
      const p = G(e * 17.4, z), u = s * p.k;
      const alive = z > 0.2 && z < 0.4 && e > 0;
      const lean = (rnd() - 0.5) * 0.22 + (alive ? 0 : e * 0.05);
      if (alive) soft(ctx, p.x - e * 3 * u, p.y, 7 * u, 1.8 * u, WARM, 0.22, 'lighter');
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(lean);
      // the post: a foot, a slender shaft with a collar, a bracket
      ctx.fillStyle = '#04060a';
      ctx.fillRect(-0.11 * u, -6.2 * u, 0.22 * u, 6.2 * u);
      ctx.fillRect(-0.36 * u, -0.7 * u, 0.72 * u, 0.7 * u);
      ctx.fillRect(-0.22 * u, -3.2 * u, 0.44 * u, 0.22 * u);
      ctx.fillRect(-0.5 * u, -6.3 * u, 1 * u, 0.16 * u);
      // the lantern: glass narrowing downward, a cap, a finial
      ctx.beginPath();
      ctx.moveTo(-0.5 * u, -7.6 * u); ctx.lineTo(0.5 * u, -7.6 * u);
      ctx.lineTo(0.32 * u, -6.3 * u); ctx.lineTo(-0.32 * u, -6.3 * u);
      ctx.closePath();
      ctx.fillStyle = alive ? '#f6d48a' : '#10151d';
      ctx.fill();
      ctx.fillStyle = '#04060a';
      ctx.fillRect(-0.03 * u, -7.6 * u, 0.06 * u, 1.3 * u);
      ctx.beginPath(); ctx.moveTo(-0.66 * u, -7.6 * u); ctx.lineTo(0.66 * u, -7.6 * u); ctx.lineTo(0, -8.4 * u); ctx.closePath(); ctx.fill();
      ctx.fillRect(-0.05 * u, -8.8 * u, 0.1 * u, 0.5 * u);
      ctx.restore();
      if (alive) lamps.push({ x: p.x - Math.sin(lean) * -7 * u, y: p.y - Math.cos(lean) * 7 * u, r: 4.4 * u, u, ph: rnd() * 6.28, flick: 5 });
    }
  }

  // ── the great trees at either side, in front of the ends of the house
  const tree = (x, y, r) => {
    const top = y + r * 1.35;
    // the trunk, and the limbs going up into the head
    ctx.strokeStyle = '#030507';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.13 * s;
    ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x + r * 0.03), Y(y + r * 0.8)); ctx.stroke();
    for (const [dx, w] of [[-0.5, 0.06], [0.45, 0.06], [-0.2, 0.05], [0.2, 0.045]]) {
      ctx.lineWidth = r * w * s;
      ctx.beginPath();
      ctx.moveTo(X(x), Y(y + r * 0.55));
      ctx.quadraticCurveTo(X(x + dx * r * 0.4), Y(y + r * 0.95), X(x + dx * r), Y(top + r * 0.1));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // the head: a broad dome, lower at its edges, ragged all round
    const clumps = [];
    for (let i = 0; i < 520; i++) {
      const a = rnd() * Math.PI * 2, q = Math.pow(rnd(), 0.55);
      const dx = Math.cos(a) * q, dy = Math.sin(a) * q * 0.78;
      if (dy < -0.5 && Math.abs(dx) < 0.25) continue; // the hollow under it, where the trunk comes in
      clumps.push([dx, dy, 0.07 + rnd() * 0.09]);
    }
    // the far side first: from the lower left, away from the moon, upward
    clumps.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));
    for (const [dx, dy, cr] of clumps) {
      const lit = Math.max(0, (dx * 0.6 + dy * 0.8 + 0.25) / 1.25); // how much it faces the moon
      const v = Math.pow(lit, 2.2) * (0.6 + rnd() * 0.6);
      ctx.fillStyle = `rgb(${Math.round(4 + v * 26)},${Math.round(7 + v * 38)},${Math.round(11 + v * 58)})`;
      ctx.beginPath();
      ctx.ellipse(X(x + dx * r), Y(top + dy * r), cr * r * s, cr * r * s * 0.82, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  tree(-60, -3, 14);
  tree(-79, -7, 21);
  tree(69, -4, 11);
  tree(85, -7, 19);

  // bare trees: a trunk, limbs forking and forking again, black on the sky
  const bare = (x, y, h, lean) => {
    const limb = (px, py, a, len, w, depth) => {
      const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
      ctx.strokeStyle = '#020305';
      ctx.lineWidth = Math.max(0.6, w * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(px), Y(py));
      ctx.quadraticCurveTo(X(px + Math.cos(a + 0.3) * len * 0.5), Y(py + Math.sin(a + 0.3) * len * 0.5), X(ex), Y(ey));
      ctx.stroke();
      if (depth <= 0) return;
      const n = 2 + (rnd() < 0.35 ? 1 : 0);
      for (let i = 0; i < n; i++) limb(ex, ey, a + (rnd() - 0.5) * 1.5 + (Math.PI / 2 - a) * 0.12, len * (0.6 + rnd() * 0.2), w * 0.6, depth - 1);
    };
    limb(x, y, Math.PI / 2 + lean, h * 0.3, h * 0.034, 6);
    ctx.lineCap = 'butt';
  };
  bare(-52, -3, 54, 0.14);
  bare(-66, -5, 40, -0.2);
  bare(67, -3, 44, -0.2); // clear of the tower and of its window
  crow(-55.8, 24.5);

  // ── Nothing ruled: the whole picture drawn again a thread at a time, each
  // a little out of place, so that the level lines waver and the long ones
  // sag, while the upright ones stand true.
  {
    const first = makeCanvas(W, H), g1 = first.getContext('2d');
    g1.drawImage(ctx.canvas, 0, 0);
    const second = makeCanvas(W, H), g2 = second.getContext('2d');
    const amp = 0.13 * s;
    for (let y = 0; y < H; y += 2) {
      // hardly at all across: what stands upright — columns, pilasters, the
      // corners of the walls — stays upright
      const dx = amp * 0.12 * (Math.sin(y * 0.021 + 1.3) + 0.6 * Math.sin(y * 0.053 + 4));
      g2.drawImage(first, 0, y, W, 2, dx, y, W, 2);
    }
    ctx.fillStyle = '#03050b';
    ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 2) {
      const dy = amp * (Math.sin(x * 0.017 + 0.4) + 0.6 * Math.sin(x * 0.043 + 2) + 0.3 * Math.sin(x * 0.11)) + 0.3 * s * Math.sin(x * 0.0042 + 1);
      ctx.drawImage(second, x, 0, 2, H, x, dy, 2, H);
    }
  }
  // ── the night laid over all of it; the moon alone keeps its light
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#6e768c';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  soft(ctx, moon.x, moon.y, moon.r * 5, moon.r * 5, MOON, 0.14, 'lighter');
  ctx.globalAlpha = 0.85;
  ctx.drawImage(disc, moon.x - moon.r / 0.72, moon.y - moon.r / 0.72, (moon.r * 2) / 0.72, (moon.r * 2) / 0.72);
  ctx.globalAlpha = 1;

  // ── the moon's light coming down through the air: one broad, faint fall
  // of it toward the house, its edges lost in the haze — not a fan of rays
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${Math.round(7 * s)}px)`;
  {
    const [a0, a1, len] = [1.78, 2.38, 190];
    const g = ctx.createRadialGradient(moon.x, moon.y, moon.r, moon.x, moon.y, len * s);
    g.addColorStop(0, `rgba(${MOON},0.34)`);
    g.addColorStop(0.45, `rgba(${MOON},0.16)`);
    g.addColorStop(1, `rgba(${MOON},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(moon.x, moon.y);
    ctx.lineTo(moon.x + Math.cos(a0) * len * s, moon.y + Math.sin(a0) * len * s);
    ctx.lineTo(moon.x + Math.cos(a1) * len * s, moon.y + Math.sin(a1) * len * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter = 'none';
  ctx.restore();

  // the light of every window on the stone round it
  for (const l of lights) {
    soft(ctx, l.x, l.y, l.w * 0.6, l.h * 0.55, '255,214,150', 0.45, 'lighter'); // the flame itself, through the glass
    soft(ctx, l.x, l.y, l.w * 1.6, l.h * 1.1, WARM, l.lamp ? 0.22 : 0.14, 'lighter');
  }
  // the dark of the night closing in: most at the corners, least on the house
  const dark = ctx.createRadialGradient(X(4), Y(16), 30 * s, X(0), Y(12), Math.hypot(W, H) * 0.66);
  dark.addColorStop(0, 'rgba(2,3,6,0)');
  dark.addColorStop(0.5, 'rgba(2,3,6,0.32)');
  dark.addColorStop(1, 'rgba(2,3,6,0.9)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.035);

  return {
    W, H, s, gy, moon, stars, lights, lamps,
    mist: { y: gy + (H - gy) * 0.12, h: (H - gy) * 0.5 },
    clouds: paintClouds(W, H, s),
    door: doorAt,
  };
}

// heavy cloud, to drift across the sky and over the moon: long dark bars, a
// strip twice as wide as the screen so it can go round
function paintClouds(W, H, s) {
  const c = makeCanvas(W * 2, Math.round(H * 0.5));
  const g = c.getContext('2d');
  const rnd = lcg(404);
  for (let i = 0; i < 44; i++) {
    const x = rnd() * W, y = (0.06 + rnd() * 0.7) * c.height, rx = (18 + rnd() * 44) * s, ry = (1.2 + rnd() * 3.4) * s;
    const pale = rnd() > 0.7, tone = pale ? '70,84,120' : '8,11,20';
    for (const dx of [0, W]) soft(g, x + dx, y, rx, ry, tone, pale ? 0.05 + rnd() * 0.05 : 0.16 + rnd() * 0.16);
    for (const dx of [-W, 0, W]) soft(g, x + dx + W * 0.5, y + ry, rx * 0.6, ry * 0.7, tone, pale ? 0.04 : 0.1);
  }
  return c;
}

// ── what moves ──────────────────────────────────────────────────────────────

function drawLive(ctx, sc, t, frozen) {
  const { W, H, s } = sc;
  ctx.clearRect(0, 0, W, H);
  // cloud going slowly across, brighter where it passes the moon
  const drift = frozen ? 0 : (t * 0.9 * s) % W;
  ctx.globalAlpha = 1;
  ctx.drawImage(sc.clouds, drift, 0, W, sc.clouds.height, 0, 0, W, sc.clouds.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  // the stars that twinkle
  for (const st of sc.stars) {
    const a = frozen ? 0.3 : 0.25 + 0.4 * Math.max(0, Math.sin(t * st.sp + st.ph));
    ctx.fillStyle = `rgba(226,234,255,${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  }
  // The lamp out on the drive is failing: steady for some seconds, then a
  // short stutter of dark. Nothing else in the picture flickers.
  const out = (l) => {
    if (frozen || !l.flick) return false;
    const k = (t + l.ph * 3) % l.flick;
    return k < 0.9 && Math.sin(k * 46 + l.ph) + Math.sin(k * 17) > 0.5;
  };
  // the windows, and the lantern at the door: a steady glow
  for (const l of sc.lights) soft(ctx, l.x, l.y, l.w * 1.3, l.h * 0.95, WARM, 0.09, 'lighter');
  for (const l of sc.lamps) {
    if (out(l)) continue;
    const a = frozen ? 0.2 : 0.2 + 0.05 * Math.sin(t * 1.1 + l.ph) + 0.02 * Math.sin(t * 11 + l.ph);
    soft(ctx, l.x, l.y, l.r, l.r, WARM, a, 'lighter');
  }
  ctx.globalCompositeOperation = 'source-over';
  // where the lamp on the drive drops out, its lantern goes dark
  ctx.fillStyle = 'rgba(8,7,10,0.8)';
  for (const l of sc.lamps) {
    if (!out(l)) continue;
    ctx.fillRect(l.x - 0.52 * l.u, l.y - 0.62 * l.u, 1.04 * l.u, 1.34 * l.u);
    soft(ctx, l.x, l.y + 7 * l.u, 9 * l.u, 2.4 * l.u, '2,3,6', 0.5);
  }
  // mist lying on the grass and against the foot of the house
  for (let i = 0; i < 10; i++) {
    const k = frozen ? i / 10 : ((t * 0.012 + i / 10) % 1);
    const x = -W * 0.3 + k * W * 1.6, y = sc.mist.y - 3 * s + ((i * 37) % 100) / 100 * sc.mist.h;
    soft(ctx, x, y, W * 0.26, (2.6 + (i % 3) * 1.4) * s, '120,136,170', 0.11 * Math.sin(k * Math.PI));
  }
}
