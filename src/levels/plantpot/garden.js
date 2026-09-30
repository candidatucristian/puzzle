/** The garden for PLANT POT, told simply and in the same hand as the valley
 *  seen through the telescope's window: a night sky going from near-black
 *  overhead to deep blue down by the hills, the moon high on the right; a far
 *  ridge touched by the moon along its crest, cypresses and round trees on
 *  it, mist lying in the valley; the near slope almost black, one big tree
 *  standing on it at the left. In front of it all, the potting bench, and on
 *  its left end a storm lantern — the one warm light in the picture, so the
 *  pot, the bucket and the plant that grows are the brightest things in it.
 *
 *  Painted once per screen size onto two canvases: the sky behind (the moon,
 *  the stars that twinkle and the odd shooting star sit on top of it) and
 *  everything in front of the sky, with the sky left clear. The lantern's
 *  flame, the fireflies and the grass in the corners are the scene's; the
 *  pot, the bucket and the plant are plant.js's. The bench is laid out in
 *  centimetres (`cm` pixels each), so the pot, the bucket and the lantern
 *  are the size such things are. */

const K = {
  sky: "pp_sky",
  land: "pp_land",
  veil: "pp_veil",
  glow: "pp_glow",
  firefly: "pp_firefly",
  star: "pp_star",
  sparkle: "pp_sparkle",
  tuft: "pp_tuft",
};

// the lantern, standing on the bench's left end (cm from the bench-top
// centre; y is up, negative)
export const LANTERN = { x: -53.5, flameY: -12.5, back: 1.5 };
// the bench top: how much of its depth we see (cm, from above), the rail
// under its near edge, and the shelf below
const BENCH = { depth: 9, apron: 4.5, shelf: 21 };
export const POT_X = -35.5;
export const BUCKET_X = 36;

// ── where everything is ─────────────────────────────────────────────────────

export function layoutGarden(W, H) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 650); // the garden's unit
  const s = Math.min(1.3, H / 640) * 0.85; // the bench's scale
  const cm = s * 3.5; // screen pixels per centimetre at the bench
  const L = {
    W,
    H,
    S,
    u,
    cm,
    lw: Math.max(1, S / 800),
    horizonY: H * 0.6,
    // the far ridge, which the moon touches, and the near slope
    far: (x) => H * (0.548 + 0.02 * Math.sin((x / W) * 5.6 + 0.9) + 0.008 * Math.sin((x / W) * 14.2 + 2.3)),
    near: (x) => H * (0.64 + 0.02 * Math.sin((x / W) * 3.9 + 2.6) + 0.007 * Math.sin((x / W) * 10.5 + 0.4)),
    moon: { x: W * 0.78, y: H * 0.2, r: S * 0.05 },
    bench: { x: W * 0.48, y: H * 0.89, x0: -59, x1: 61, top: 3.2 },
  };
  // the bench's own coordinates (cm) on screen
  L.at = (x, y) => ({ x: L.bench.x + x * cm, y: L.bench.y + y * cm });
  L.flame = L.at(LANTERN.x, LANTERN.flameY);
  // open sky, clear of the moon: where a star may shine
  L.inSky = (x, y) => y < L.far(x) - S * 0.02 && Math.hypot(x - L.moon.x, y - L.moon.y) > L.moon.r * 1.7;
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintGarden(scene, W, H) {
  const L = layoutGarden(W, H);
  const t = scene.textures;
  addCanvas(t, K.sky, paintSky(L));
  addCanvas(t, K.land, paintLand(L));
  addCanvas(t, K.veil, paintVeil(L));
  addCanvas(
    t,
    K.glow,
    radial(128, "255,196,120", [
      [0, 0.95],
      [0.12, 0.6],
      [0.4, 0.16],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    K.firefly,
    radial(32, "226,255,140", [
      [0, 1],
      [0.18, 0.75],
      [0.45, 0.18],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    K.star,
    radial(16, "236,240,255", [
      [0, 1],
      [0.3, 0.4],
      [1, 0],
    ]),
  );
  addCanvas(t, K.sparkle, paintSparkle());
  addCanvas(t, K.tuft, paintTuft());
  return { L, keys: K };
}

export function releaseGardenArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// ── the sky ─────────────────────────────────────────────────────────────────

// night: near-black overhead, deep blue down by the hills, the last of the
// light low over them and the moon's own wash round it; and a dust of stars
// too faint to twinkle
function paintSky(L) {
  const { W, H, lw, moon, horizonY } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, "#03060e");
  sky.addColorStop(0.42, "#071028");
  sky.addColorStop(0.78, "#0f1c3b");
  sky.addColorStop(1, "#1b2b4f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  softEllipse(ctx, W / 2, horizonY, W * 0.62, H * 0.2, "64,88,142", 0.3);
  softEllipse(ctx, moon.x, moon.y, moon.r * 8, moon.r * 8, "150,172,232", 0.13);
  softEllipse(ctx, moon.x, moon.y, moon.r * 2.6, moon.r * 2.6, "172,192,242", 0.12);
  const rnd = lcg(7919);
  const n = Math.round((W * H) / 2400);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * horizonY;
    const a = 0.08 + rnd() * 0.22;
    const r = (0.35 + rnd() * 0.5) * lw;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 1.6) continue;
    ctx.fillStyle = `rgba(215,225,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, W, H, 0.028);
  return c;
}

// ── the land ────────────────────────────────────────────────────────────────

function paintLand(L) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const rnd = lcg(2718);
  paintFar(ctx, L, rnd);
  paintNear(ctx, L, rnd);
  paintBench(ctx, L);
  paintLantern(ctx, L);
  grain(ctx, W, H, 0.03, true);
  return c;
}

// the far ridge, its crest touched by the moon — more so on the moon's side
// — low round trees along it, two stands of cypress, and mist lying along
// the valley in front of it
function paintFar(ctx, L, rnd) {
  const { W, H, S, lw, far, horizonY } = L;
  const fg = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.66);
  fg.addColorStop(0, "#121d37");
  fg.addColorStop(1, "#0b1326");
  land(ctx, L, far, fg);
  const rim = ctx.createLinearGradient(0, 0, W, 0);
  rim.addColorStop(0, "rgba(120,142,200,0.1)");
  rim.addColorStop(1, "rgba(160,180,232,0.34)");
  ridge(ctx, L, far, 0.6 * lw);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.2 * lw;
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const x = rnd() * W;
    const r = S * (0.004 + rnd() * 0.004);
    crown(ctx, x, far(x) + r * 0.6, r, "#0d1629");
  }
  for (const [fx, hs] of [
    [0.21, [0.07, 0.05, 0.085]],
    [0.87, [0.06, 0.085, 0.05]],
  ]) {
    hs.forEach((h, j) => {
      const x = W * fx + j * S * 0.016;
      cypress(ctx, x, far(x) + S * 0.004, S * h, S * h * 0.2, "#0a1122");
    });
  }
  const mist = ctx.createLinearGradient(0, horizonY - H * 0.045, 0, horizonY + H * 0.035);
  mist.addColorStop(0, "rgba(96,118,172,0)");
  mist.addColorStop(0.55, "rgba(96,118,172,0.16)");
  mist.addColorStop(1, "rgba(96,118,172,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, horizonY - H * 0.045, W, H * 0.08);
}

// the near slope the bench stands on: almost black, a faint line of moon
// along its top and a little moonlight lying on the grass to the right;
// tall cypresses either side, like the ones across the valley but near, a
// low bush at their feet, round bushes along the top
function paintNear(ctx, L, rnd) {
  const { W, H, S, lw, near } = L;
  const ng = ctx.createLinearGradient(0, H * 0.6, 0, H);
  ng.addColorStop(0, "#0a1120");
  ng.addColorStop(0.35, "#070c17");
  ng.addColorStop(1, "#04070d");
  land(ctx, L, near, ng);
  ridge(ctx, L, near, 0.5 * lw);
  ctx.strokeStyle = "rgba(120,140,195,0.16)";
  ctx.lineWidth = lw;
  ctx.stroke();
  softEllipse(ctx, W * 0.8, H * 0.76, W * 0.36, H * 0.13, "90,112,165", 0.1);
  // the lantern's warmth, reaching the grass beyond the bench
  softEllipse(ctx, L.flame.x + W * 0.03, H * 0.84, W * 0.24, H * 0.07, "255,160,80", 0.12, "lighter");
  for (let i = 0; i < 6; i++) {
    const x = W * (0.24 + rnd() * 0.56);
    const r = S * (0.009 + rnd() * 0.008);
    crown(ctx, x, near(x) + r * 0.5, r, "#05080f");
  }
  for (const [fx, fh, fw] of [
    [0.1, 0.25, 0.042],
    [0.048, 0.37, 0.056],
    [0.143, 0.19, 0.034],
    [0.955, 0.31, 0.05],
    [0.914, 0.22, 0.038],
  ]) {
    const x = W * fx;
    tallCypress(ctx, L, x, near(x) + S * 0.012, H * fh, S * fw, rnd);
  }
  for (const fx of [0.1, 0.93]) {
    const x = W * fx;
    const r = S * 0.028;
    crown(ctx, x, near(x) + r * 0.9, r, "#04070d");
  }
}

// A tall cypress, close: a column of dark foliage with a rounded shoulder
// and a soft point, its edge feathered with sprays of leaves, the side
// toward the moon faintly lit and a sliver of moonlight down that edge.
function tallCypress(ctx, L, x, base, h, w, rnd) {
  const N = 60;
  const ph = rnd() * 10;
  const lean = (rnd() - 0.5) * w * 0.25;
  // half its width at t (0 its foot, 1 its tip): a column swelling a little
  // a quarter of the way up, then drawing in round to the point
  const b55 = 0.86 + 0.14 * Math.sin(0.9 * Math.PI);
  const half = (t) =>
    (w / 2) * (t < 0.55 ? 0.86 + 0.14 * Math.sin((t / 0.55) * 0.9 * Math.PI) : b55 * Math.pow(Math.cos(((t - 0.55) / 0.45) * (Math.PI / 2)), 0.72));
  const feather = (t, s) => 1 + 0.045 * Math.sin(t * 29 + ph + s * 2.1) + 0.03 * Math.sin(t * 63 + ph * 1.7 + s) + (rnd() - 0.5) * 0.025;
  const left = [];
  const right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = base - t * h;
    const cx = x + lean * t * t;
    left.push([cx - half(t) * feather(t, 0), y]);
    right.push([cx + half(t) * feather(t, 1), y]);
  }
  const shape = new Path2D();
  shape.moveTo(left[0][0], left[0][1]);
  for (const [px, py] of left) shape.lineTo(px, py);
  for (let i = right.length - 1; i >= 0; i--) shape.lineTo(right[i][0], right[i][1]);
  shape.closePath();
  const d = Math.max(1.2, L.S * 0.0024);
  ctx.save();
  ctx.clip(shape);
  ctx.fillStyle = "rgba(128,150,205,0.34)";
  ctx.fillRect(x - w * 2, base - h - 4, w * 4, h + 8);
  ctx.translate(-d, d * 0.6);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, "#03050a");
  g.addColorStop(0.6, "#060a13");
  g.addColorStop(1, "#0c1322");
  ctx.fillStyle = g;
  ctx.fill(shape);
  ctx.restore();
}

// ── the bench, and the lantern on it ────────────────────────────────────────

// A potting bench of old planks, seen a little from above: the top's planks
// run along it, a rail under its near edge, square legs going down out of
// the picture and a shelf between them with spare pots stacked on it. The
// lantern's pool of light spreads along the top from its left end; the far
// end is left to the moon.
function paintBench(ctx, L) {
  const { H, cm, bench, at, flame } = L;
  const X0 = at(bench.x0, 0).x;
  const X1 = at(bench.x1, 0).x;
  const back = at(0, -BENCH.depth / 2).y;
  const front = at(0, BENCH.depth / 2).y;
  const apron = at(0, BENCH.depth / 2 + BENCH.apron).y;
  const legW = 5 * cm;
  const legs = [X0 + 3 * cm, X1 - 3 * cm - legW];
  // the far pair of legs, just showing under the top
  for (const lx of legs) board(ctx, L, lx + 2 * cm, back, legW * 0.8, H + 20 - back, 0.3, true);
  // the shelf: two slats, and on it three spare pots stacked, rims down
  const shelf = at(0, BENCH.shelf).y;
  board(ctx, L, legs[0], shelf - 2.2 * cm, legs[1] + legW - legs[0], 2.2 * cm, 0.38);
  board(ctx, L, legs[0], shelf, legs[1] + legW - legs[0], 2.6 * cm, 0.44);
  const sp = at(-24, 0).x;
  for (let i = 0; i < 3; i++) {
    const w = 13 * cm;
    const h = 4.6 * cm;
    const y = shelf - 2.2 * cm - h * (i + 1) + i * 1.8 * cm;
    const g = ctx.createLinearGradient(sp - w / 2, 0, sp + w / 2, 0);
    g.addColorStop(0, "#8a4c2a");
    g.addColorStop(0.25, "#a45c34");
    g.addColorStop(0.6, "#5a2a16");
    g.addColorStop(1, "#301408");
    ctx.fillStyle = g;
    poly(ctx, [
      [sp - w * 0.4, y],
      [sp + w * 0.4, y],
      [sp + w / 2, y + h],
      [sp - w / 2, y + h],
    ]);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sp - w / 2, y + h - 1.4 * cm, w, 1.4 * cm);
  }
  for (const lx of legs) board(ctx, L, lx, front, legW, H + 20 - front, 0.56, true);

  // the top: four planks, a dark gap between each
  const planks = 4;
  for (let i = 0; i < planks; i++) {
    const y0 = back + ((front - back) * i) / planks;
    const y1 = back + ((front - back) * (i + 1)) / planks;
    board(ctx, L, X0, y0, X1 - X0, y1 - y0, 0.74 + 0.05 * i);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(X0, y1 - Math.max(1, 0.26 * cm), X1 - X0, Math.max(1, 0.26 * cm));
  }
  // the rail under the near edge
  board(ctx, L, X0, front, X1 - X0, apron - front, 0.46);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(X0, front, X1 - X0, Math.max(1, 0.4 * cm));
  // the near edge of the top catches the lantern; the far edge, the moon
  ctx.fillStyle = "rgba(255,214,170,0.28)";
  ctx.fillRect(X0, front - Math.max(1, 0.35 * cm), X1 - X0, Math.max(1, 0.35 * cm));
  ctx.fillStyle = "rgba(170,190,230,0.28)";
  ctx.fillRect(X0, back, X1 - X0, Math.max(1, 0.3 * cm));

  // the lantern's pool of light: bright at its foot, fading along the planks
  // and down the rail and the near leg
  ctx.save();
  ctx.beginPath();
  ctx.rect(X0, back, X1 - X0, apron - back);
  ctx.clip();
  softEllipse(ctx, flame.x, at(0, 0).y, 80 * cm, 11 * cm, "255,160,80", 0.55, "lighter");
  softEllipse(ctx, flame.x, at(0, 0).y, 30 * cm, 6 * cm, "255,205,140", 0.5, "lighter");
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(legs[0], front, legW, H - front);
  ctx.clip();
  softEllipse(ctx, flame.x, front, 12 * cm, 30 * cm, "255,160,80", 0.35, "lighter");
  ctx.restore();

  // what stands on the top throws its shadow away from the lantern
  const potX = at(POT_X, 0).x;
  const y0 = at(0, 0).y;
  softEllipse(ctx, potX, y0, 12.5 * cm, 2.6 * cm, "0,0,0", 0.55);
  softEllipse(ctx, potX + 12 * cm, y0 - 0.8 * cm, 22 * cm, 3 * cm, "0,0,0", 0.45);
  softEllipse(ctx, at(LANTERN.x, 0).x, y0 - LANTERN.back * cm, 8 * cm, 1.8 * cm, "0,0,0", 0.5);
}

// a board of old wood, its grain quiet along it: warmer toward the lantern,
// cooler and darker away from it
function board(ctx, L, x, y, w, h, tone, upright = false) {
  const col = (k) => `rgb(${Math.round(104 * tone * k)},${Math.round(76 * tone * k)},${Math.round(52 * tone * k)})`;
  const g = upright ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, col(1.15));
  g.addColorStop(1, col(0.6));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const rnd = lcg(Math.round(x * 13 + y * 7));
  ctx.lineWidth = Math.max(0.6, 0.16 * L.cm);
  const n = Math.max(2, Math.round((upright ? w : h) / (1.2 * L.cm)));
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(0,0,0,0.16)" : "rgba(255,220,180,0.05)";
    ctx.beginPath();
    if (upright) {
      const gx = x + ((i + 0.5) * w) / n;
      ctx.moveTo(gx, y);
      ctx.bezierCurveTo(gx + (rnd() - 0.5) * 3, y + h * 0.3, gx + (rnd() - 0.5) * 3, y + h * 0.6, gx, y + h);
    } else {
      const gy = y + ((i + 0.5) * h) / n;
      ctx.moveTo(x, gy);
      ctx.bezierCurveTo(x + w * 0.3, gy + (rnd() - 0.5) * 2, x + w * 0.7, gy + (rnd() - 0.5) * 2, x + w, gy);
    }
    ctx.stroke();
  }
  const lx = L.flame.x;
  const lg = ctx.createLinearGradient(lx - 40 * L.cm, 0, lx + 110 * L.cm, 0);
  lg.addColorStop(0, "rgba(255,170,90,0.28)");
  lg.addColorStop(0.3, "rgba(255,170,90,0.14)");
  lg.addColorStop(1, "rgba(60,80,120,0.14)");
  ctx.fillStyle = lg;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// a hurricane lantern: tank, wire guards round a glass globe, the cap and
// its bail handle — the glass lit from within
function paintLantern(ctx, L) {
  const { cm, at } = L;
  const b = at(LANTERN.x, 0);
  const x = b.x;
  const y = b.y - LANTERN.back * cm; // standing a little back on the planks
  const u = cm;
  // the light it throws on the air round it
  softEllipse(ctx, x, y - 15 * u, 48 * u, 38 * u, "255,170,90", 0.16, "lighter");
  const tank = new Path2D();
  tank.moveTo(x - 6 * u, y);
  tank.lineTo(x + 6 * u, y);
  tank.bezierCurveTo(x + 6.6 * u, y - 2 * u, x + 6.6 * u, y - 4 * u, x + 5 * u, y - 5.2 * u);
  tank.lineTo(x - 5 * u, y - 5.2 * u);
  tank.bezierCurveTo(x - 6.6 * u, y - 4 * u, x - 6.6 * u, y - 2 * u, x - 6 * u, y);
  tank.closePath();
  metal(ctx, tank, x - 6.6 * u, x + 6.6 * u, "#7a2a1e");
  // the glass: a bulging globe, the flame's light filling it
  const globe = new Path2D();
  globe.moveTo(x - 3 * u, y - 5.2 * u);
  globe.bezierCurveTo(x - 7.4 * u, y - 9 * u, x - 7.4 * u, y - 17 * u, x - 3 * u, y - 21 * u);
  globe.lineTo(x + 3 * u, y - 21 * u);
  globe.bezierCurveTo(x + 7.4 * u, y - 17 * u, x + 7.4 * u, y - 9 * u, x + 3 * u, y - 5.2 * u);
  globe.closePath();
  const gg = ctx.createRadialGradient(x, y - 11 * u, 0.5 * u, x, y - 12 * u, 7.5 * u);
  gg.addColorStop(0, "#fff6d8");
  gg.addColorStop(0.3, "#ffd48a");
  gg.addColorStop(0.75, "#e0923e");
  gg.addColorStop(1, "#8a4a1c");
  ctx.fillStyle = gg;
  ctx.fill(globe);
  ctx.save();
  ctx.clip(globe);
  const soot = ctx.createLinearGradient(0, y - 21 * u, 0, y - 16 * u);
  soot.addColorStop(0, "rgba(40,20,10,0.55)");
  soot.addColorStop(1, "rgba(40,20,10,0)");
  ctx.fillStyle = soot;
  ctx.fillRect(x - 8 * u, y - 22 * u, 16 * u, 7 * u);
  ctx.strokeStyle = "rgba(255,255,240,0.6)";
  ctx.lineWidth = Math.max(0.8, 0.5 * u);
  ctx.beginPath();
  ctx.moveTo(x + 4.6 * u, y - 16 * u);
  ctx.quadraticCurveTo(x + 5.8 * u, y - 12 * u, x + 4.4 * u, y - 8 * u);
  ctx.stroke();
  ctx.restore();
  // the wick's flame
  ctx.fillStyle = "#fffbe8";
  ctx.beginPath();
  ctx.ellipse(x, L.flame.y + 0.5 * u, 0.9 * u, 2.2 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  // the wire guards over the glass
  ctx.strokeStyle = "#2a2622";
  ctx.lineWidth = Math.max(0.8, 0.45 * u);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * 5.4 * u, y - 5.2 * u);
    ctx.bezierCurveTo(x + s * 9 * u, y - 10 * u, x + s * 9 * u, y - 17 * u, x + s * 4 * u, y - 22 * u);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - 7.6 * u, y - 13 * u);
  ctx.lineTo(x + 7.6 * u, y - 13 * u);
  ctx.stroke();
  // the cap, the vent and the bail
  const cap = new Path2D();
  cap.moveTo(x - 5 * u, y - 21 * u);
  cap.lineTo(x + 5 * u, y - 21 * u);
  cap.lineTo(x + 3 * u, y - 25 * u);
  cap.lineTo(x - 3 * u, y - 25 * u);
  cap.closePath();
  metal(ctx, cap, x - 5 * u, x + 5 * u, "#7a2a1e");
  ctx.fillStyle = "#1e1a18";
  ctx.fillRect(x - 1.8 * u, y - 27 * u, 3.6 * u, 2 * u);
  ctx.strokeStyle = "#3a3632";
  ctx.lineWidth = Math.max(0.8, 0.5 * u);
  ctx.beginPath();
  ctx.moveTo(x - 6.2 * u, y - 4 * u);
  ctx.bezierCurveTo(x - 9 * u, y - 24 * u, x + 9 * u, y - 24 * u, x + 6.2 * u, y - 4 * u);
  ctx.stroke();
}

// painted tin: dark at the edges, the flame's warmth on the near side of it
function metal(ctx, path, x0, x1, colour) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "#1a0c08");
  g.addColorStop(0.25, colour);
  g.addColorStop(0.45, "#c46a4a");
  g.addColorStop(0.6, colour);
  g.addColorStop(1, "#120806");
  ctx.fillStyle = g;
  ctx.fill(path);
}

// ── small things ────────────────────────────────────────────────────────────

// a bright star's glint: four long fine points, short diagonals, a little
// light round it
function paintSparkle() {
  const s = 32;
  const m = s / 2;
  const c = makeCanvas(s, s);
  const g = c.getContext("2d");
  const glow = g.createRadialGradient(m, m, 0, m, m, s * 0.22);
  glow.addColorStop(0, "rgba(236,242,255,0.85)");
  glow.addColorStop(1, "rgba(236,242,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, s, s);
  g.fillStyle = "rgba(242,247,255,0.95)";
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? m * 0.95 : m * 0.12;
    if (i) g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
    else g.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  return c;
}

// a clump of tall grass for the corners: a full tuft of tapering blades,
// black at the root, their tips catching the moon; the blades at the back a
// shade lighter than the ones in front, a thread of light down a few
function paintTuft() {
  const w = 140;
  const h = 150;
  const R = 2; // drawn at twice the size it is shown
  const c = makeCanvas(w * R, h * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const rnd = lcg(55);
  const n = 30;
  for (let i = 0; i < n; i++) {
    const back = i < n * 0.45;
    const bx = w / 2 + (rnd() - 0.5) * 40;
    const len = (back ? 70 : 45) + rnd() * 75;
    const lean = (bx - w / 2) * 1.3 + (rnd() - 0.5) * 44;
    const bw = 2.2 + rnd() * 2.6;
    const tx = bx + lean;
    const ty = h - len;
    const cx = bx + lean * 0.15;
    const cy = h - len * 0.6;
    const blade = new Path2D();
    blade.moveTo(bx - bw, h + 1);
    blade.quadraticCurveTo(cx - bw * 0.8, cy, tx, ty);
    blade.quadraticCurveTo(cx + bw * 0.8, cy, bx + bw, h + 1);
    blade.closePath();
    const gr = g.createLinearGradient(0, h, 0, ty);
    gr.addColorStop(0, "#020408");
    gr.addColorStop(0.55, back ? "#0a1221" : "#060b15");
    gr.addColorStop(1, back ? "#26344f" : "#1a253b");
    g.fillStyle = gr;
    g.fill(blade);
    if (rnd() < 0.35) {
      g.strokeStyle = "rgba(150,170,215,0.3)";
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(cx + bw * 0.5, cy);
      g.quadraticCurveTo(cx + (tx - cx) * 0.5 + bw * 0.3, cy + (ty - cy) * 0.5, tx, ty);
      g.stroke();
    }
  }
  return c;
}

// ── the frame ───────────────────────────────────────────────────────────────

function paintVeil(L) {
  const { W, H, S } = L;
  const c = makeCanvas(W / 4, H / 4);
  const ctx = c.getContext("2d");
  ctx.scale(c.width / W, c.height / H);
  const v = ctx.createRadialGradient(W * 0.48, H * 0.55, S * 0.32, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, "rgba(2,4,8,0)");
  v.addColorStop(1, "rgba(2,4,8,0.5)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

// ── helpers ─────────────────────────────────────────────────────────────────

// a ridge line across the whole width, `dy` below the ridge `f`
function ridge(ctx, L, f, dy) {
  const step = Math.max(2, L.W / 480);
  ctx.beginPath();
  ctx.moveTo(-4, f(-4) + dy);
  for (let x = -4 + step; x < L.W + 4 + step; x += step) ctx.lineTo(x, f(x) + dy);
}

// the land under a ridge, filled down to the bottom of the screen
function land(ctx, L, f, style) {
  ridge(ctx, L, f, 0);
  ctx.lineTo(L.W + 4, L.H + 4);
  ctx.lineTo(-4, L.H + 4);
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
}

function cypress(ctx, x, base, h, w, color) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, base);
  ctx.bezierCurveTo(x - w * 0.62, base - h * 0.45, x - w * 0.28, base - h * 0.85, x, base - h);
  ctx.bezierCurveTo(x + w * 0.28, base - h * 0.85, x + w * 0.62, base - h * 0.45, x + w * 0.5, base);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function crown(ctx, x, base, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [dx, dy, rr] of [
    [0, -0.95, 1],
    [-0.62, -0.55, 0.72],
    [0.66, -0.5, 0.68],
  ]) {
    ctx.moveTo(x + dx * r + rr * r, base + dy * r);
    ctx.arc(x + dx * r, base + dy * r, rr * r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillRect(x - r * 0.08, base - r * 0.5, r * 0.16, r * 0.5);
}

export function softEllipse(ctx, cx, cy, rx, ry, rgb, a, op = "source-over") {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.45, `rgba(${rgb},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

let NOISE = null;
function grain(ctx, W, H, alpha, onlyPainted = false) {
  if (!NOISE) {
    NOISE = makeCanvas(128, 128);
    const g = NOISE.getContext("2d");
    const img = g.createImageData(128, 128);
    const rnd = lcg(90210);
    for (let i = 0; i < 128 * 128; i++) {
      const v = (rnd() * 255) | 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  if (onlyPainted) ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(NOISE, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function radial(size, rgb, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgb},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

// painted on the CPU: drawn once and handed to WebGL as a plain copy, where
// a GPU canvas would stall to sync
export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
  return c;
}

export function addCanvas(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  return textures.addCanvas(key, canvas);
}

export function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
