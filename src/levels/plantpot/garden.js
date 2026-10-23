import { paintHurricaneLantern } from "../../shared/hurricaneLantern.js";
import { paintTurfBase, paintGrass } from "./turf.js";
import { paintShrub, paintHedge, paintFern } from "./foliage.js";
import { GARDEN_TREES, paintMatureTree } from "./matureTrees.js";
import { gardenPhotographs, paintGardenPhotograph, paintPhotographicBench } from "./photographicGarden.js";
import { hasFibonacciRender, alignFibonacciGarden, paintFibonacciGarden, paintFibonacciWindow } from "./blenderPlant.js";

/** The Blender/Cycles botanical garden and its camera-derived bench layout.
 *  Live parts use that same camera's scale and landmarks. Older procedural
 *  painters remain available as a missing-asset fallback. */

const K = {
  sky: "pp_sky",
  land: "pp_land",
  veil: "pp_veil",
  glow: "pp_glow",
  firefly: "pp_firefly",
  star: "pp_star",
  sparkle: "pp_sparkle",
  window: "pp_window",
};

// the lantern, standing on the bench's left end (cm from the bench-top
// centre; y is up, negative)
export const LANTERN = { x: -43, flameY: -11.6, back: 4 };
// the bench top: how much of its depth we see (cm, from above), the rail
// under its near edge, and the shelf below
const BENCH = { depth: 26, apron: 4.5, shelf: 21 };
export const POT_X = -28;
export const BUCKET_X = 36;

// ── where everything is ─────────────────────────────────────────────────────

function layoutGarden(W, H) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 650); // the garden's unit
  const s = Math.min(1.3, H / 640) * 0.85; // the bench's scale
  const cm = Math.min(s * 3.5, W / 210); // screen pixels per centimetre at the bench
  const L = {
    W,
    H,
    S,
    u,
    cm,
    lw: Math.max(1, S / 800),
    // looking down, the horizon is high in the picture
    horizonY: H * 0.2,
    // the far ridge, which the moon touches, and the hedge at the garden's end
    far: (x) => H * (0.168 + 0.012 * Math.sin((x / W) * 5.6 + 0.9) + 0.005 * Math.sin((x / W) * 14.2 + 2.3)),
    near: (x) => H * (0.232 + 0.004 * Math.sin((x / W) * 3.9 + 2.6)),
    moon: { x: W * 0.72, y: H * 0.082, r: S * 0.036 },
    bench: { x: W * 0.48, y: H * 0.65, x0: -59, x1: 61, top: 3.2 },
    sill: H * 0.9, // where the window's sill begins
  };
  // the bench's own coordinates (cm) on screen
  L.at = (x, y) => ({ x: L.bench.x + x * cm, y: L.bench.y + y * cm });
  L.flame = L.at(LANTERN.x, LANTERN.flameY - LANTERN.back); // the lantern stands back on the planks
  // open sky, clear of the moon: where a star may shine
  L.inSky = (x, y) => y < L.far(x) - S * 0.02 && Math.hypot(x - L.moon.x, y - L.moon.y) > L.moon.r * 1.7;
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintGarden(scene, W, H) {
  const L = layoutGarden(W, H);
  const t = scene.textures;
  const blender = hasFibonacciRender(t);
  if (blender) alignFibonacciGarden(L);
  const photos = blender ? {garden: null, bench: null} : gardenPhotographs(scene);
  L.photographic = blender || Boolean(photos.garden);
  L.benchPhoto = photos.bench;
  if (L.photographic) {
    const openSky = L.inSky;
    // Keep animated stars in the opening between the photographed canopies.
    L.inSky = (x, y) => x > W * 0.58 && x < W * 0.86 && openSky(x, y);
  }
  addCanvas(t, K.sky, blender ? paintFibonacciGarden(L, t) : photos.garden ? paintGardenPhotograph(L, photos.garden) : paintSky(L));
  const trees = t.exists(GARDEN_TREES.key) ? t.get(GARDEN_TREES.key).getSourceImage() : null;
  addCanvas(t, K.land, paintLand(L, trees));
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
  const window=blender?paintFibonacciWindow(L,t):null;
  if(window)addCanvas(t,K.window,window);
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
  softEllipse(ctx, W / 2, horizonY, W * 0.62, H * 0.1, "64,88,142", 0.3);
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

function paintLand(L, trees) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  if (L.blender) return c;
  const ctx = c.getContext("2d");
  const rnd = lcg(2718);
  if (!L.photographic) {
    paintFar(ctx, L, rnd);
    paintGround(ctx, L, rnd, trees);
  }
  paintBench(ctx, L);
  paintLantern(ctx, L);
  grain(ctx, W, H, 0.03, true);
  return c;
}

// the far ridge beyond the garden, its crest touched by the moon — more so
// on the moon's side — small trees along it, and mist lying in front of it
function paintFar(ctx, L, rnd) {
  const { W, H, S, lw, far, horizonY } = L;
  const fg = ctx.createLinearGradient(0, H * 0.14, 0, H * 0.26);
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
    const r = S * (0.003 + rnd() * 0.003);
    crown(ctx, x, far(x) + r * 0.6, r, "#0d1629");
  }
  for (const [fx, hs] of [
    [0.3, [0.03, 0.022, 0.036]],
    [0.84, [0.026, 0.036, 0.022]],
  ]) {
    hs.forEach((h, j) => {
      const x = W * fx + j * S * 0.009;
      crown(ctx, x, far(x) + S * 0.003, S * h * 0.3, "#0a1122");
    });
  }
  const mist = ctx.createLinearGradient(0, horizonY - H * 0.02, 0, horizonY + H * 0.03);
  mist.addColorStop(0, "rgba(96,118,172,0)");
  mist.addColorStop(0.55, "rgba(96,118,172,0.16)");
  mist.addColorStop(1, "rgba(96,118,172,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, horizonY - H * 0.02, W, H * 0.05);
}

// The garden below the window, seen from above: a mown lawn running away to
// the hedge at its far end, the mower's stripes drawing together as they go;
// a gravel path coming across it from the right; round bushes and a stone
// birdbath, each with its shadow lying toward us and to the left, away from
// the moon; mature trees along the sides, their shadows long on the grass.
function paintGround(ctx, L, rnd, treeImage) {
  const { W, H, S, lw, near, cm } = L;
  const top = H * 0.232;
  const ng = ctx.createLinearGradient(0, top, 0, H);
  ng.addColorStop(0, "#102028");
  ng.addColorStop(0.35, "#0b181d");
  ng.addColorStop(1, "#060d10");
  land(ctx, L, near, ng);
  ctx.save();
  ridge(ctx, L, near, 0);
  ctx.lineTo(W + 4, H + 4);
  ctx.lineTo(-4, H + 4);
  ctx.closePath();
  ctx.clip();
  // how far off a place on the lawn is: 0 under the window, 1 at the hedge
  const away = (y) => Math.min(1, Math.max(0, (H - y) / (H - top)));
  // the mower's stripes, drawing together toward a point beyond the hedge
  const vp = { x: W * 0.53, y: H * 0.06 };
  for (let i = -12; i < 12; i += 2) {
    const x0 = W * 0.5 + i * W * 0.12, x1 = x0 + W * 0.12;
    ctx.beginPath();
    ctx.moveTo(vp.x, vp.y);
    ctx.lineTo(x0, H + 4);
    ctx.lineTo(x1, H + 4);
    ctx.closePath();
    ctx.fillStyle = "rgba(150,186,200,0.022)";
    ctx.fill();
  }
  // the moon lying on it
  softEllipse(ctx, W * 0.6, H * 0.47, W * 0.46, H * 0.2, "96,124,170", 0.17, "lighter");
  paintTurfBase(ctx, L);
  // the gravel path: wide under the window, a thread at the hedge
  const at = (k) => {
    const y = H + 4 - (H + 4 - top) * Math.pow(k, 0.72);
    return { x: W * (0.93 - 0.3 * k + 0.07 * Math.sin(k * 3.4)), y, w: W * (0.006 + 0.075 * Math.pow(1 - k, 1.5)) };
  };
  ctx.beginPath();
  const N = 40;
  for (let i = 0; i <= N; i++) { const p = at(i / N); if (i === 0) ctx.moveTo(p.x - p.w, p.y); else ctx.lineTo(p.x - p.w, p.y); }
  for (let i = N; i >= 0; i--) { const p = at(i / N); ctx.lineTo(p.x + p.w, p.y); }
  ctx.closePath();
  const pg = ctx.createLinearGradient(0, top, 0, H);
  pg.addColorStop(0, "#2c3648");
  pg.addColorStop(1, "#1a2029");
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 1500; i++) {
    const p = at(Math.pow(rnd(), 1.6));
    const d = 1 - away(p.y);
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.28)" : "rgba(190,204,232,0.16)";
    ctx.fillRect(p.x + (rnd() * 2 - 1) * p.w, p.y + (rnd() - 0.5) * 6, (0.6 + d * 1.6) * lw, (0.5 + d * 0.9) * lw);
  }
  ctx.restore();
  paintGrass(ctx, L, at);
  // something standing on the lawn throws its shadow toward us and leftward
  const shadow = (x, y, w, len) => {
    ctx.save();
    ctx.filter = `blur(${Math.max(2, Math.round(w * 0.3))}px)`;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.2 - len * 0.62, y + len * 0.5);
    ctx.lineTo(x - w * 0.5 - len * 0.62, y + len * 0.5);
    ctx.closePath();
    ctx.fillStyle = "rgba(1,3,5,0.6)";
    ctx.fill();
    ctx.restore();
  };
  // Low shrubs have woody stems and uneven, overlapping sprays of leaves.
  const shrubs = [[0.29, 0.31, 0.02], [0.36, 0.285, 0.015], [0.78, 0.33, 0.022], [0.24, 0.52, 0.036], [0.815, 0.61, 0.038]];
  for (const [i, [fx, fy, fr]] of shrubs.entries()) {
    const x = W * fx, y = H * fy, r = S * fr;
    shadow(x, y + r * 0.2, r * 1.7, r * 1.6);
    paintShrub(ctx, x, y, r, 419 + i * 83);
  }
  // the birdbath: a stone bowl on its stem, the moon in the water
  {
    const x = W * 0.655, y = H * 0.415, r = S * 0.024;
    shadow(x, y + r * 0.9, r * 1.3, r * 2.4);
    ctx.fillStyle = "#1c2330";
    ctx.fillRect(x - r * 0.16, y, r * 0.32, r * 0.95);
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 0.42, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, "#161c27");
    g.addColorStop(1, "#56627a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a1220";
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.03, r * 0.82, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    softEllipse(ctx, x + r * 0.22, y - r * 0.06, r * 0.3, r * 0.11, "214,226,255", 0.8, "lighter");
  }
  // the lantern's warmth on the grass beyond the bench
  softEllipse(ctx, L.flame.x + W * 0.02, L.bench.y - 22 * cm, W * 0.2, H * 0.09, "255,160,80", 0.12, "lighter");
  ctx.restore();
  paintHedge(ctx, L, at(1));
  // Mature trees enclose the lawn in loose, overlapping groups. Their
  // crowns fill the sides of the window, leaving the central garden open.
  // [across, foot, height, species, moonlight]; furthest first.
  const trees = [
    [0.42, 0.285, 0.19, 0, 0.68],
    [0.565, 0.282, 0.145, 1, 0.66],
    [0.785, 0.30, 0.21, 0, 0.76],
    [0.21, 0.335, 0.27, 1, 0.76],
    [0.335, 0.39, 0.30, 0, 0.86],
    [0.94, 0.425, 0.34, 0, 0.87],
    [0.09, 0.455, 0.37, 1, 0.84],
    [0.79, 0.61, 0.51, 1, 1],
    [0.165, 0.655, 0.59, 0, 1.06],
  ];
  trees.sort((p, q) => p[1] - q[1]);
  ctx.save();
  ridge(ctx, L, near, 0);
  ctx.lineTo(W + 4, H + 4);
  ctx.lineTo(-4, H + 4);
  ctx.closePath();
  ctx.clip();
  for (const [fx, fy, height] of trees) {
    shadow(W * fx, H * fy, H * height * 0.6, H * height * 0.8);
  }
  ctx.restore();
  for (const [fx, fy, height, kind, light] of trees) {
    if (treeImage) paintMatureTree(ctx, treeImage, W * fx, H * fy, H * height, kind, light);
  }
  paintFern(ctx, W * 0.14, H * 0.67, S * 0.022, 71);
  paintFern(ctx, W * 0.799, H * 0.632, S * 0.017, 53);
}

// ── the bench, and the lantern on it ────────────────────────────────────────

// Three broad boards sit on a joined frame. The top overhangs the legs;
// its receding ends and separate front edge give the objects a firm surface.
function paintBench(ctx, L) {
  const { H, cm, bench, at, flame } = L;
  if (paintPhotographicBench(ctx, L, BENCH.depth)) {
    const surface = at(POT_X, 0);
    softEllipse(ctx, surface.x, surface.y, 8.5 * cm, 1.9 * cm, "0,0,0", 0.62);
    softEllipse(ctx, surface.x + 10 * cm, surface.y - 1.2 * cm, 16 * cm, 3.4 * cm, "0,0,0", 0.26);
    softEllipse(ctx, at(LANTERN.x, 0).x, surface.y - LANTERN.back * cm, 8 * cm, 3.4 * cm, "0,0,0", 0.5);
    return;
  }
  const X0 = at(bench.x0 - 3, 0).x;
  const X1 = at(bench.x1 + 2, 0).x;
  const back = at(0, -BENCH.depth / 2).y;
  const front = at(0, BENCH.depth / 2).y;
  const thickness = 1.8 * cm;
  const apron = front + thickness + BENCH.apron * cm;
  const legW = 4.6 * cm;
  const legs = [X0 + 5 * cm, X1 - 5 * cm - legW];
  const top = [[X0 + 5 * cm, back], [X1 - 5 * cm, back], [X1, front], [X0, front]];
  const endY = H + 12;

  // Rear legs and the lower shelf remain in shade behind the front frame.
  for (const lx of legs) board(ctx, L, lx + 2 * cm, back + thickness, legW * .8, endY - back, .26, true);
  const shelf = at(0, BENCH.shelf).y;
  board(ctx, L, legs[0] + legW, shelf - 1.7 * cm, legs[1] - legs[0] - legW, 1.7 * cm, .34);
  board(ctx, L, legs[0] + legW, shelf, legs[1] - legs[0] - legW, 2 * cm, .27);
  for (const lx of legs) {
    board(ctx, L, lx, front + thickness, legW, endY - front, .49, true);
    ctx.fillStyle = "rgba(6,9,12,.35)";
    ctx.fillRect(lx + legW * .76, front + thickness, legW * .24, endY - front);
  }

  board(ctx, L, X0 + 3.5 * cm, front + thickness, X1 - X0 - 7 * cm, BENCH.apron * cm, .43);
  ctx.fillStyle = "rgba(0,0,0,.38)";
  ctx.fillRect(X0 + 3.5 * cm, front + thickness, X1 - X0 - 7 * cm, .65 * cm);

  // End grain and the solid front edge sit below the top, rather than
  // becoming another bright stripe in the plank surface.
  poly(ctx, [[X1 - 5 * cm, back], [X1, front], [X1, front + thickness], [X1 - 5 * cm, back + thickness]]);
  ctx.fillStyle = "#302b24";
  ctx.fill();
  board(ctx, L, X0, front, X1 - X0, thickness, .6);
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.fillRect(X0, front + thickness - .3 * cm, X1 - X0, .3 * cm);

  ctx.save();
  poly(ctx, top);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    const y0 = back + (front - back) * i / 3;
    const y1 = back + (front - back) * (i + 1) / 3;
    board(ctx, L, X0, y0, X1 - X0, y1 - y0, [.72, .68, .75][i]);
    if (i < 2) {
      ctx.fillStyle = "rgba(9,8,6,.5)";
      ctx.fillRect(X0, y1 - .12 * cm, X1 - X0, Math.max(.5, .2 * cm));
    }
  }
  softEllipse(ctx, flame.x, at(0, 0).y, 74 * cm, 22 * cm, "235,170,100", .24, "lighter");
  softEllipse(ctx, flame.x, at(0, 0).y, 22 * cm, 9 * cm, "255,208,147", .2, "lighter");
  ctx.restore();

  // A worn arris catches the light only near the lantern; the far edge
  // takes a much softer line of moonlight.
  const edge = ctx.createLinearGradient(X0, 0, X1, 0);
  edge.addColorStop(0, "rgba(233,196,145,.4)");
  edge.addColorStop(.35, "rgba(181,155,120,.18)");
  edge.addColorStop(1, "rgba(131,145,159,.13)");
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(.7, .2 * cm);
  ctx.beginPath(); ctx.moveTo(X0, front); ctx.lineTo(X1, front); ctx.stroke();
  ctx.strokeStyle = "rgba(137,154,180,.15)";
  ctx.lineWidth = Math.max(.5, .14 * cm);
  ctx.beginPath(); ctx.moveTo(top[0][0], back); ctx.lineTo(top[1][0], back); ctx.stroke();

  // Flush joinery pegs belong to the frame, below the working surface.
  for (const lx of legs) {
    ctx.fillStyle = "rgba(20,15,10,.5)";
    ctx.beginPath(); ctx.arc(lx + legW * .44, apron - 1.8 * cm, .34 * cm, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(legs[0], front + thickness, legW, H - front);
  ctx.clip();
  softEllipse(ctx, flame.x, front, 13 * cm, 26 * cm, "220,153,92", .2, "lighter");
  ctx.restore();

  // what stands on the top throws its shadow away from the lantern
  const potX = at(POT_X, 0).x;
  const y0 = at(0, 0).y;
  softEllipse(ctx, potX, y0, 12.5 * cm, 5 * cm, "0,0,0", 0.55);
  softEllipse(ctx, potX + 12 * cm, y0 - 1.6 * cm, 22 * cm, 5.6 * cm, "0,0,0", 0.45);
  softEllipse(ctx, at(LANTERN.x, 0).x, y0 - LANTERN.back * cm, 8 * cm, 3.4 * cm, "0,0,0", 0.5);
}

// a board of old wood, its grain quiet along it: warmer toward the lantern,
// cooler and darker away from it
function board(ctx, L, x, y, w, h, tone, upright = false) {
  const col = (k) => `rgb(${Math.round(104 * tone * k)},${Math.round(76 * tone * k)},${Math.round(52 * tone * k)})`;
  const g = upright ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, col(1.06));
  g.addColorStop(1, col(0.84));
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

// The storm lantern on the bench's left end (see shared/hurricaneLantern.js),
// standing a little back on the planks.
function paintLantern(ctx, L) {
  const b = L.at(LANTERN.x, 0);
  paintHurricaneLantern(ctx, b.x, b.y - LANTERN.back * L.cm, L.cm);
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

// The window we look out of, from indoors: its head, a jamb at either hand
// with the edge of a drawn-back curtain falling in front of it, and along
// the bottom the sill — the stone one outside, pale under the moon, and the
// broad wooden board inside it, which is what we lean on.
function _paintFrame(L) {
  const { W, H, S, lw, sill } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const rnd = lcg(4099);
  const jw = W * 0.028;
  // the head
  const hg = ctx.createLinearGradient(0, 0, 0, H * 0.03);
  hg.addColorStop(0, "#060505");
  hg.addColorStop(1, "#16110e");
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, W, H * 0.03);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, H * 0.03, W, H * 0.012);
  // the jambs: the left one faces the moon and takes a little of it
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : W - jw;
    const g = ctx.createLinearGradient(x0, 0, x0 + jw, 0);
    g.addColorStop(side < 0 ? 0 : 1, "#060505");
    g.addColorStop(side < 0 ? 1 : 0, side < 0 ? "#231c1a" : "#120e0c");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, jw, sill);
    ctx.fillStyle = side < 0 ? "rgba(150,172,222,0.3)" : "rgba(150,172,222,0.1)";
    ctx.fillRect(side < 0 ? jw - 1.4 * lw : W - jw, 0, 1.4 * lw, sill);
  }
  // the curtains: heavy cloth, drawn back, hanging in folds to the sill
  for (const side of [-1, 1]) {
    const edge = (y) => W * (0.07 + 0.012 * Math.sin((y / H) * 5.2 + (side < 0 ? 0.4 : 2.1)) + 0.016 * (y / H));
    const X = (d) => (side < 0 ? d : W - d);
    ctx.beginPath();
    ctx.moveTo(X(-4), -4);
    for (let y = -4; y <= sill + 2; y += 6) ctx.lineTo(X(edge(y)), y);
    ctx.lineTo(X(-4), sill + 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(X(0), 0, X(W * 0.09), 0);
    g.addColorStop(0, "#07080c");
    g.addColorStop(1, side < 0 ? "#1a1f2e" : "#11141e");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // the folds: a dark valley, a faint moonlit ridge beside it
    for (let i = 1; i < 6; i++) {
      const d0 = W * 0.015 * i + (rnd() - 0.5) * W * 0.004;
      for (const [off, col, wd] of [[0, "rgba(0,0,0,0.45)", 3.2], [W * 0.004, side < 0 ? "rgba(132,152,204,0.12)" : "rgba(132,152,204,0.06)", 1.4]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = wd * lw;
        ctx.beginPath();
        ctx.moveTo(X(d0 + off), -4);
        ctx.bezierCurveTo(X(d0 + off + W * 0.004), H * 0.3, X(d0 + off - W * 0.003), H * 0.6, X(d0 + off + W * 0.005 * (i / 5)), sill + 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    // its leading edge, against the night
    ctx.strokeStyle = side < 0 ? "rgba(140,160,212,0.22)" : "rgba(140,160,212,0.1)";
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let y = -4; y <= sill + 2; y += 6) { if (y === -4) ctx.moveTo(X(edge(y)), y); else ctx.lineTo(X(edge(y)), y); }
    ctx.stroke();
  }
  // the stone sill outside: pale, wet-looking under the moon
  const st = H * 0.024;
  const sg = ctx.createLinearGradient(0, sill - st, 0, sill);
  sg.addColorStop(0, "#5c667e");
  sg.addColorStop(1, "#2a303e");
  ctx.fillStyle = sg;
  ctx.fillRect(0, sill - st, W, st);
  ctx.fillStyle = "rgba(206,218,248,0.5)";
  ctx.fillRect(0, sill - st, W, 1.2 * lw);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.2)" : "rgba(220,230,255,0.1)";
    ctx.fillRect(rnd() * W, sill - st + rnd() * st, (1 + rnd() * 2) * lw, lw);
  }
  // the bottom rail of the frame, then the inner board
  ctx.fillStyle = "#090706";
  ctx.fillRect(0, sill, W, H * 0.012);
  const bg = ctx.createLinearGradient(0, sill, 0, H);
  bg.addColorStop(0, "#3a281c");
  bg.addColorStop(0.25, "#2a1c13");
  bg.addColorStop(1, "#100a07");
  ctx.fillStyle = bg;
  ctx.fillRect(0, sill + H * 0.012, W, H - sill);
  ctx.fillStyle = "rgba(150,172,222,0.2)";
  ctx.fillRect(0, sill + H * 0.012, W, 1.4 * lw);
  for (let i = 0; i < 40; i++) {
    const y = sill + H * 0.016 + rnd() * (H - sill - H * 0.016);
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(0,0,0,0.22)" : "rgba(255,214,170,0.05)";
    ctx.lineWidth = Math.max(0.6, lw * (0.5 + rnd()));
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W * 0.3, y + (rnd() - 0.5) * 6, W * 0.7, y + (rnd() - 0.5) * 6, W, y + (rnd() - 0.5) * 4);
    ctx.stroke();
  }
  // the moon across the board, where the curtains leave it
  softEllipse(ctx, W * 0.56, sill + H * 0.03, W * 0.3, H * 0.05, "120,144,200", 0.16, "lighter");
  softEllipse(ctx, W * 0.5, H, W * 0.7, H * 0.06, "0,0,0", 0.5);
  void S;
  grain(ctx, W, H, 0.03, true);
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
