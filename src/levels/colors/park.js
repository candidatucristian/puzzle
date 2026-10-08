import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg, polygon } from "../../shared/paint.js";
import { createMoonCanvas } from "../../shared/moon.js";

/** A little park in Paris, past midnight, for FIREWORKS (the level keeps its
 *  old name in the code; the fireworks are gone). A full moon over the
 *  rooftops, the Tower far off; lawns going blue in the moonlight, a pale
 *  gravel path, a pond with the moon lying in it, an old lantern still
 *  burning. On the path stands a green park bench, a FRESH PAINT card tied to
 *  its back, and tied to its arm, forgotten after some party, five balloons.
 *
 *  Painted once per screen size: the park; each balloon (the scene lets them
 *  sway); a firefly's glow; a glint. */

const K = { room: "fw_park", glow: "fw_glow", glint: "fw_glint" };
const balloonKey = (i) => `fw_balloon_${i}`;
export const FW_FONT = '"Special Elite", monospace';
const MOON = "176,198,240";
const WARM = "255,190,120";

// The bench in its own measure: l along it (its near end at +100), d from its
// front edge back, h up from the path. We stand in front of it and a little
// to its right, so its length runs slightly away to the left and what is
// further back shows higher and to the right.
const bench = (l, d, h) => [l * 0.95 + d * 0.45, l * 0.1 - d * 0.28 - h];
// how far back the leaning back stands, at a height
const lean = (h) => 46 + (h - 46) * 0.2;

// ── where everything is ─────────────────────────────────────────────────────

export function layoutPark(W, H, codes) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, S, u };
  L.horizon = H * 0.57;
  L.moon = { x: W * 0.79, y: H * 0.2, r: S * 0.105 };
  L.tower = { x: W * 0.305, base: L.horizon, h: H * 0.33 };
  // the bench, on the path a little left of the middle
  L.bench = { x: W * 0.46, y: H * 0.9, s: Math.min(u * 1.5, W / 560) };
  const b = L.bench;
  // the top of its back, at the near end, where the strings are tied
  const top = bench(100, lean(110), 110);
  L.knot = { x: b.x + top[0] * b.s, y: b.y + top[1] * b.s };
  // the lantern, behind the bench at the left
  L.lamp = { x: W * 0.2, y: H * 0.34, foot: H * 0.8, s: u };
  // the pond, beyond the path at the right
  L.pond = { x: W * 0.76, y: H * 0.71, rx: W * 0.15, ry: H * 0.038 };
  // the five balloons, the first the highest
  const r = Math.min(H * 0.036, W * 0.026);
  const xs = [0.004, -0.056, 0.062, -0.026, 0.034];
  const ys = [0.2, 0.265, 0.325, 0.385, 0.448];
  L.balloons = codes.map((code, i) => ({
    i,
    code,
    r,
    x: L.knot.x + xs[i] * W * Math.min(1, (H * 1.9) / W),
    y: H * ys[i],
  }));
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintPark(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintSky(ctx, L);
  const towerPts = paintSkyline(ctx, L);
  paintFarTrees(ctx, L);
  paintLawn(ctx, L);
  paintPond(ctx, L);
  paintPath(ctx, L);
  paintLantern(ctx, L);
  paintBench(ctx, L);
  paintNearTrees(ctx, L);
  paintForeground(ctx, L);
  vignette(ctx, W, H, 0.72);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  const balloons = L.balloons.map((b) => {
    addCanvasTexture(t, balloonKey(b.i), paintBalloon(b.r, b.code));
    return { ...b, key: balloonKey(b.i) };
  });
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.glint, paintGlint());
  return { keys: K, balloons, towerPts };
}

export function releaseParkArt(textures) {
  const keys = [...Object.values(K)];
  for (let i = 0; i < 8; i++) keys.push(balloonKey(i));
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

// ── the sky ─────────────────────────────────────────────────────────────────

function paintSky(ctx, L) {
  const { W, H, S, horizon, moon } = L;
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, "#050818");
  g.addColorStop(0.55, "#0e1a3a");
  g.addColorStop(1, "#22345c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(11);
  for (let i = 0; i < (W * horizon) / 2200; i++) {
    const x = rnd() * W;
    const y = rnd() * horizon * 0.92;
    // fewer near the moon, fewer toward the city's glow
    const near = Math.hypot(x - moon.x, y - moon.y) / (S * 0.5);
    const a = (0.2 + rnd() * 0.7) * (1 - y / horizon) * Math.min(1, near);
    ctx.fillStyle = `rgba(232,236,255,${a.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + rnd() * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // the moon and the air round it
  soft(ctx, moon.x, moon.y, S * 0.6, S * 0.5, MOON, 0.2, "lighter");
  soft(ctx, moon.x, moon.y, moon.r * 2.6, moon.r * 2.6, "220,230,255", 0.22, "lighter");
  const m = moon.r / 0.72; // the picture is the disc and its halo
  ctx.drawImage(createMoonCanvas(), moon.x - m, moon.y - m, m * 2, m * 2);
  // long thin clouds, silver along their tops where the moon is behind them
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * W;
    const cy = horizon * (0.12 + rnd() * 0.6);
    const w = (160 + rnd() * 320) * L.u;
    const lit = Math.max(0, 1 - Math.hypot(cx - moon.x, cy - moon.y) / (S * 0.9));
    for (let k = 0; k < 6; k++) {
      const ox = (rnd() - 0.5) * w;
      soft(ctx, cx + ox, cy + (rnd() - 0.5) * 8 * L.u, w * (0.25 + rnd() * 0.25), (7 + rnd() * 8) * L.u, "40,54,90", 0.3);
      soft(ctx, cx + ox, cy - 5 * L.u, w * 0.26, 7 * L.u, "200,214,250", 0.04 + lit * 0.14, "lighter");
    }
  }
  // a bank of moonlit mist over the middle of the park: the balloons, dark
  // as they are, stand against it
  soft(ctx, L.knot.x, horizon * 0.46, W * 0.2, horizon * 0.5, "150,170,214", 0.3, "lighter");
  // the city's own light, low along the roofs
  const glow = ctx.createLinearGradient(0, horizon - H * 0.2, 0, horizon);
  glow.addColorStop(0, "rgba(120,110,150,0)");
  glow.addColorStop(1, "rgba(150,126,150,0.34)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - H * 0.2, W, H * 0.2);
}

// Paris across the park wall: mansard roofs and chimney pots, a dome, and far
// to the right the Tower. Returns the points on the Tower that sparkle.
function paintSkyline(ctx, L) {
  const { W, H, u, horizon, tower } = L;
  const rnd = lcg(1889);
  // the Tower, far off: its legs, its three platforms, its mast
  const pts = [];
  const tx = tower.x;
  const tb = tower.base;
  const th = tower.h;
  const half = (k) => th * 0.19 * (1 - k) ** 2.1 + th * 0.006; // its width at a height
  ctx.fillStyle = "#1a2038";
  ctx.beginPath();
  for (let k = 0; k <= 1.001; k += 0.04) ctx.lineTo(tx - half(k), tb - th * k * 0.94);
  ctx.lineTo(tx, tb - th);
  for (let k = 1; k >= -0.001; k -= 0.04) ctx.lineTo(tx + half(k), tb - th * k * 0.94);
  ctx.closePath();
  ctx.fill();
  // the arch between its feet
  ctx.fillStyle = "#22345c";
  ctx.beginPath();
  ctx.ellipse(tx, tb, half(0) * 0.62, th * 0.12, 0, Math.PI, 0);
  ctx.fill();
  for (const k of [0.17, 0.36, 0.78]) {
    ctx.fillStyle = "#11162a";
    ctx.fillRect(tx - half(k) * 1.25, tb - th * k * 0.94 - th * 0.008, half(k) * 2.5, th * 0.016);
  }
  // its lights, a string of gold up each edge
  for (let k = 0.02; k < 1; k += 0.035) {
    for (const d of [-1, 1]) {
      const p = { x: tx + d * half(k) * 0.9, y: tb - th * k * 0.94 };
      ctx.fillStyle = "rgba(255,214,140,0.2)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, 0.6 * u), 0, Math.PI * 2);
      ctx.fill();
      pts.push(p);
    }
  }
  soft(ctx, tx, tb - th * 0.45, th * 0.22, th * 0.55, "255,200,120", 0.03, "lighter");
  // the roofs
  ctx.fillStyle = "#0e1428";
  let x = -10 * u;
  while (x < W) {
    const w = (40 + rnd() * 70) * u;
    const h = H * (0.035 + rnd() * 0.05);
    const top = horizon - h;
    // a mansard: a steep slope, a flat top, chimneys
    ctx.beginPath();
    ctx.moveTo(x, horizon + 2);
    ctx.lineTo(x, top + h * 0.3);
    ctx.lineTo(x + w * 0.08, top);
    ctx.lineTo(x + w * 0.92, top);
    ctx.lineTo(x + w, top + h * 0.3);
    ctx.lineTo(x + w, horizon + 2);
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      const cx = x + w * (0.2 + rnd() * 0.6);
      ctx.fillRect(cx, top - (5 + rnd() * 7) * u, 5 * u, 12 * u);
    }
    if (rnd() < 0.14) {
      // a dome, now and then
      ctx.beginPath();
      ctx.arc(x + w / 2, top, w * 0.28, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x + w / 2 - 1.2 * u, top - w * 0.4, 2.4 * u, w * 0.14);
    }
    // a few windows still lit
    for (let wy = top + h * 0.4; wy < horizon - 4 * u; wy += 7 * u) {
      for (let wx = x + 5 * u; wx < x + w - 6 * u; wx += 8 * u) {
        if (rnd() < 0.12) {
          ctx.fillStyle = `rgba(255,206,130,${(0.4 + rnd() * 0.5).toFixed(2)})`;
          ctx.fillRect(wx, wy, 2.6 * u, 3.6 * u);
          ctx.fillStyle = "#0e1428";
        }
      }
    }
    x += w;
  }
  return pts;
}

// a tree: a trunk and a crown built of many leafy rounds, each catching the
// moon on the side toward it
function tree(ctx, L, x, foot, h, spread, seed, dark) {
  const rnd = lcg(seed);
  const { moon } = L;
  ctx.strokeStyle = dark;
  ctx.lineCap = "round";
  ctx.lineWidth = h * 0.045;
  ctx.beginPath();
  ctx.moveTo(x, foot);
  ctx.quadraticCurveTo(x + h * 0.02, foot - h * 0.3, x - h * 0.01, foot - h * 0.55);
  ctx.stroke();
  for (const d of [-1, 1]) {
    ctx.lineWidth = h * 0.02;
    ctx.beginPath();
    ctx.moveTo(x, foot - h * 0.4);
    ctx.quadraticCurveTo(x + d * spread * 0.2, foot - h * 0.55, x + d * spread * 0.45, foot - h * 0.68);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  const blobs = [];
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd());
    blobs.push({ x: x + Math.cos(a) * rr * spread, y: foot - h * 0.72 + Math.sin(a) * rr * h * 0.3, r: h * (0.07 + rnd() * 0.07) });
  }
  blobs.sort((a, b) => a.y - b.y);
  for (const b of blobs) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    // the moon on its leaves
    const a = Math.atan2(moon.y - b.y, moon.x - b.x);
    ctx.save();
    ctx.clip();
    soft(ctx, b.x + Math.cos(a) * b.r * 0.75, b.y + Math.sin(a) * b.r * 0.75, b.r * 0.75, b.r * 0.6, MOON, 0.16, "lighter");
    ctx.restore();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = "rgba(190,210,250,0.1)";
      ctx.beginPath();
      ctx.ellipse(b.x + (rnd() - 0.5) * b.r * 1.5, b.y + (rnd() - 0.5) * b.r * 1.5, b.r * 0.12, b.r * 0.06, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// across the lawn: a clipped hedge under the railings, the park's far trees
function paintFarTrees(ctx, L) {
  const { W, H, u, horizon } = L;
  const rnd = lcg(404);
  for (let i = 0; i < 7; i++) {
    const x = W * (0.06 + i * 0.15) + (rnd() - 0.5) * 50 * u;
    if (Math.abs(x - L.tower.x) < 90 * u) continue;
    tree(ctx, L, x, horizon + 6 * u, H * (0.15 + rnd() * 0.08), (34 + rnd() * 22) * u, 70 + i, "#0c1626");
  }
  // the railings, and the hedge in front of them
  ctx.strokeStyle = "rgba(8,12,24,0.9)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  for (let x = 0; x < W; x += 9 * u) {
    ctx.beginPath();
    ctx.moveTo(x, horizon + 4 * u);
    ctx.lineTo(x, horizon - 22 * u);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(8,12,24,0.9)";
  ctx.fillRect(0, horizon - 18 * u, W, 2 * u);
  const hg = ctx.createLinearGradient(0, horizon - 10 * u, 0, horizon + 12 * u);
  hg.addColorStop(0, "#16283a");
  hg.addColorStop(1, "#0a1420");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(0, horizon + 12 * u);
  for (let x = 0; x <= W; x += 14 * u) ctx.lineTo(x, horizon - (8 + rnd() * 4) * u);
  ctx.lineTo(W, horizon + 12 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(${MOON},0.14)`;
  ctx.fillRect(0, horizon - 10 * u, W, 2 * u);
}

// the grass: blue in the moonlight, mown in bands, the dew shining toward
// the moon
function paintLawn(ctx, L) {
  const { W, H, u, horizon, moon } = L;
  const g = ctx.createLinearGradient(0, horizon, 0, H);
  g.addColorStop(0, "#1e3c44");
  g.addColorStop(0.4, "#16303a");
  g.addColorStop(1, "#0a1a22");
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon + 8 * u, W, H - horizon);
  const rnd = lcg(909);
  // the mower's bands, narrowing away from us
  for (let i = 0; i < 12; i++) {
    const k0 = (i / 12) ** 1.8;
    const k1 = ((i + 1) / 12) ** 1.8;
    if (i % 2) continue;
    ctx.fillStyle = "rgba(160,210,220,0.035)";
    ctx.fillRect(0, horizon + 8 * u + (H - horizon) * k0, W, (H - horizon) * (k1 - k0));
  }
  // the moon's light lying across it
  soft(ctx, moon.x - W * 0.1, horizon + (H - horizon) * 0.3, W * 0.5, (H - horizon) * 0.4, MOON, 0.16, "lighter");
  // blades, thousands of them, the far ones finer
  for (let i = 0; i < 5200; i++) {
    const k = rnd() ** 0.7;
    const x = rnd() * W;
    const y = horizon + 10 * u + (H - horizon) * k;
    const len = (1.5 + k * 7) * u;
    const lit = rnd();
    ctx.strokeStyle = lit < 0.6 ? `rgba(6,16,20,${(0.2 + rnd() * 0.3).toFixed(2)})` : `rgba(170,220,225,${(0.05 + rnd() * 0.13).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.6, (0.5 + k * 0.7) * u);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.4) * len * 0.6, y - len);
    ctx.stroke();
  }
}

// the pond: still water holding the sky, the moon drawn down it in a long
// broken streak, reeds at its near bank
function paintPond(ctx, L) {
  const { u, pond, moon } = L;
  const { x, y, rx, ry } = pond;
  // its bank
  ctx.fillStyle = "#081218";
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * u, rx * 1.04, ry * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  g.addColorStop(0, "#22345c");
  g.addColorStop(1, "#0a1226");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the far trees upside down in it
  soft(ctx, x, y - ry, rx * 1.1, ry * 0.9, "6,10,20", 0.75);
  // the moon's streak
  const sx = Math.min(x + rx * 0.7, Math.max(x - rx * 0.7, moon.x));
  const rnd = lcg(55);
  for (let i = 0; i < 26; i++) {
    const k = i / 26;
    const w = rx * (0.05 + k * 0.16) * (0.5 + rnd());
    ctx.fillStyle = `rgba(226,236,255,${(0.6 - k * 0.42).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(sx + (rnd() - 0.5) * rx * 0.07, y - ry * 0.75 + k * ry * 1.7, w, Math.max(0.6, 0.9 * u), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  soft(ctx, sx, y - ry * 0.3, rx * 0.3, ry * 0.9, MOON, 0.3, "lighter");
  // slow rings where something touched it
  ctx.strokeStyle = "rgba(200,220,255,0.14)";
  ctx.lineWidth = Math.max(0.6, 0.8 * u);
  for (const [dx, dy, r] of [
    [-0.5, 0.2, 0.12],
    [-0.5, 0.2, 0.2],
    [0.55, -0.1, 0.09],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * rx, y + dy * ry, r * rx, r * ry * 1.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // reeds
  for (let i = 0; i < 26; i++) {
    const bx = x - rx * 0.95 + rnd() * rx * 0.5 + (i % 2) * rx * 1.4;
    const by = y + ry * (0.5 + rnd() * 0.5);
    const h = (16 + rnd() * 26) * u;
    ctx.strokeStyle = "#060e14";
    ctx.lineWidth = Math.max(0.8, 1.2 * u);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + (rnd() - 0.5) * 6 * u, by - h * 0.6, bx + (rnd() - 0.5) * 12 * u, by - h);
    ctx.stroke();
  }
}

// the path: pale gravel coming down from the gate past the lantern, then
// turning to run across in front of the bench and away to the right; the
// bench stands on the grass in the crook of it
function paintPath(ctx, L) {
  const { W, H, u, horizon } = L;
  // its middle line, far to near, and half its width at each place
  const spine = [
    [0.335, horizon / H + 0.012, 0.005],
    [0.318, 0.66, 0.011],
    [0.292, 0.75, 0.019],
    [0.282, 0.84, 0.028],
    [0.31, 0.925, 0.036],
    [0.42, 0.975, 0.04],
    [0.62, 0.99, 0.042],
    [0.85, 0.975, 0.044],
    [1.08, 0.94, 0.046],
  ].map(([x, y, w]) => ({ x: x * W, y: y * H, w: w * W }));
  // a smooth line through them
  const line = [];
  for (let i = 0; i < spine.length - 1; i++) {
    const p0 = spine[Math.max(0, i - 1)], p1 = spine[i], p2 = spine[i + 1], p3 = spine[Math.min(spine.length - 1, i + 2)];
    for (let k = 0; k < 14; k++) {
      const s = k / 14;
      const cr = (a0, a1, a2, a3) => 0.5 * (2 * a1 + (a2 - a0) * s + (2 * a0 - 5 * a1 + 4 * a2 - a3) * s * s + (3 * a1 - a0 - 3 * a2 + a3) * s * s * s);
      line.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y), w: cr(p0.w, p1.w, p2.w, p3.w) });
    }
  }
  line.push(spine[spine.length - 1]);
  const sides = [[], []];
  line.forEach((p, i) => {
    const q = line[Math.min(line.length - 1, i + 1)], o = line[Math.max(0, i - 1)];
    const dx = q.x - o.x, dy = q.y - o.y;
    const n = Math.hypot(dx, dy) || 1;
    sides[0].push({ x: p.x - (dy / n) * p.w, y: p.y + (dx / n) * p.w, w: p.w });
    sides[1].push({ x: p.x + (dy / n) * p.w, y: p.y - (dx / n) * p.w, w: p.w });
  });
  polygon(ctx, [...sides[0], ...sides[1].slice().reverse()]);
  const g = ctx.createLinearGradient(0, horizon, 0, H);
  g.addColorStop(0, "#5a6680");
  g.addColorStop(0.5, "#46506a");
  g.addColorStop(1, "#2a3248");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rnd = lcg(321);
  for (let i = 0; i < 9000; i++) {
    const y = horizon + (H - horizon) * rnd() ** 0.55;
    const k = (y - horizon) / (H - horizon);
    const x = rnd() * W;
    const s = (0.5 + k * 1.3) * u;
    ctx.fillStyle = rnd() < 0.5 ? `rgba(10,14,26,${(0.14 + rnd() * 0.2).toFixed(2)})` : `rgba(214,224,250,${(0.05 + rnd() * 0.14).toFixed(2)})`;
    ctx.fillRect(x, y, s * 1.6, s);
  }
  // the moon along the stretch before the bench
  soft(ctx, W * 0.6, H * 0.97, W * 0.34, H * 0.06, MOON, 0.16, "lighter");
  ctx.restore();
  // the grass creeping over its edges
  for (const side of sides) {
    for (const p of side) {
      for (let j = 0; j < 4; j++) {
        const len = (2 + (p.w / (0.046 * W)) * 8) * u;
        const x = p.x + (rnd() - 0.5) * 9 * u, y = p.y + (rnd() - 0.5) * 5 * u;
        ctx.strokeStyle = rnd() < 0.5 ? "rgba(10,24,30,0.85)" : "rgba(30,60,68,0.85)";
        ctx.lineWidth = Math.max(0.6, (0.5 + p.w / (0.05 * W)) * u);
        ctx.beginPath();
        ctx.moveTo(x, y + len * 0.3);
        ctx.lineTo(x + (rnd() - 0.5) * len * 0.6, y - len * (0.4 + rnd() * 0.6));
        ctx.stroke();
      }
    }
  }
}

// the old lantern: a fluted iron post, a glass cage with its flame, a little
// warm ground under it — the only light here that is not the moon's
function paintLantern(ctx, L) {
  const { u } = L;
  const { x, y, foot, s } = L.lamp;
  // its light
  soft(ctx, x, y, 210 * s, 200 * s, WARM, 0.2, "lighter");
  soft(ctx, x + 6 * s, foot + 6 * s, 150 * s, 30 * s, WARM, 0.2, "lighter");
  soft(ctx, x - 26 * s, foot + 3 * s, 46 * s, 7 * s, "0,0,0", 0.5);
  // the post
  const pg = ctx.createLinearGradient(x - 6 * s, 0, x + 6 * s, 0);
  pg.addColorStop(0, "#04070c");
  pg.addColorStop(0.6, "#1a2430");
  pg.addColorStop(0.8, "#4a5868");
  pg.addColorStop(1, "#0a1016");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, foot);
  ctx.lineTo(x - 7 * s, foot - 26 * s);
  ctx.lineTo(x - 3.4 * s, foot - 40 * s);
  ctx.lineTo(x - 2.6 * s, y + 26 * s);
  ctx.lineTo(x + 2.6 * s, y + 26 * s);
  ctx.lineTo(x + 3.4 * s, foot - 40 * s);
  ctx.lineTo(x + 7 * s, foot - 26 * s);
  ctx.lineTo(x + 9 * s, foot);
  ctx.closePath();
  ctx.fill();
  for (const dy of [26, 40, 150]) ctx.fillRect(x - 8 * s, foot - dy * s, 16 * s, 3 * s);
  // the cage: wider at the top, a pointed cap and its finial
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y + 26 * s);
  ctx.lineTo(x - 17 * s, y - 20 * s);
  ctx.lineTo(x + 17 * s, y - 20 * s);
  ctx.lineTo(x + 9 * s, y + 26 * s);
  ctx.closePath();
  const gg = ctx.createRadialGradient(x, y + 4 * s, 2 * s, x, y + 2 * s, 30 * s);
  gg.addColorStop(0, "#fff8e0");
  gg.addColorStop(0.3, "#ffd690");
  gg.addColorStop(1, "#c07a2c");
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.strokeStyle = "#0a1016";
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + 26 * s);
  ctx.lineTo(x, y - 20 * s);
  ctx.stroke();
  ctx.fillStyle = "#0a1016";
  ctx.beginPath();
  ctx.moveTo(x - 21 * s, y - 20 * s);
  ctx.lineTo(x, y - 40 * s);
  ctx.lineTo(x + 21 * s, y - 20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 43 * s, 3.4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 12 * s, y + 25 * s, 24 * s, 4 * s);
  void u;
}

// The bench, facing us and turned a little aside: the seat's slats lit from
// above, the leaning back's slats full to us, the cast-iron ends with their
// curved legs and scrolled arms, the near one at the right. Someone has been
// trying colours on it — a stroke of the brush for each, left to dry — and a
// card is tied to the back: FRESH PAINT.
function paintBench(ctx, L) {
  const b = L.bench;
  const s = b.s;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  const Q = (l, d, h) => { const p = bench(l, d, h); return { x: p[0], y: p[1] }; };
  const quad = (pts, fill) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  // its shadow on the gravel, thrown toward us and to the left by the moon
  ctx.save();
  ctx.filter = `blur(${(5 * s).toFixed(1)}px)`;
  quad([Q(-104, -6, 0), Q(104, -6, 0), Q(70, -70, 0), Q(-150, -70, 0)], "rgba(2,5,12,0.6)");
  ctx.restore();
  ctx.filter = "none";

  // an iron end, at one end of the bench
  const end = (l, tone) => {
    ctx.lineCap = "round";
    const path = (w, pts, curve) => {
      for (const [col, lw, dx, dy] of [[tone[0], w, 0, 0], [tone[1], w * 0.26, w * 0.24, -w * 0.12]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.beginPath();
        const p = pts.map((q) => Q(l, q[0], q[1]));
        ctx.moveTo(p[0].x, p[0].y);
        if (curve) for (let i = 1; i + 1 < p.length; i += 2) ctx.quadraticCurveTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y);
        else for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
        ctx.stroke();
        ctx.restore();
      }
    };
    // the back leg, sweeping up into the back's upright
    path(7, [[66, 0], [50, 24], [46, 46], [50, 80], [lean(110), 110]], true);
    // the front leg, curving out to its foot
    path(7, [[-8, 0], [0, 22], [2, 44]], true);
    // the rail under the seat, a stretcher between the legs
    path(5, [[2, 44], [46, 44]], false);
    path(3.6, [[-2, 16], [28, 26], [58, 14]], true);
    // the arm: out from the back, level, curling under at the front
    path(5.6, [[lean(76), 76], [24, 82], [-4, 76], [-13, 70], [-7, 63], [-2, 60], [0, 66]], true);
    path(4.6, [[3, 44], [1, 60], [3, 76]], true);
    for (const d of [66, -8]) {
      const p = Q(l, d, 0);
      ctx.fillStyle = tone[0];
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 8, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  // the far end first; the slats will hide most of it
  end(-100, ["#070b12", "rgba(120,140,170,0.35)"]);

  // a slat: a plank the length of the bench between two edges
  const slat = (a, c, tone) => {
    // a, c: [d, h] of its two long edges
    const pts = [Q(-102, a[0], a[1]), Q(102, a[0], a[1]), Q(102, c[0], c[1]), Q(-102, c[0], c[1])];
    const g = ctx.createLinearGradient(pts[0].x, 0, pts[1].x, 0);
    g.addColorStop(0, tone[1]);
    g.addColorStop(0.6, tone[0]);
    g.addColorStop(1, tone[1]);
    quad(pts, g);
    ctx.strokeStyle = "rgba(4,10,14,0.6)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // the light along its upper edge, the grain in it
    ctx.strokeStyle = "rgba(226,244,240,0.3)";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + 0.6);
    ctx.lineTo(pts[1].x, pts[1].y + 0.6);
    ctx.stroke();
  };
  // the dark under the seat and behind the back
  quad([Q(-100, 2, 43), Q(100, 2, 43), Q(100, 46, 43), Q(-100, 46, 43)], "rgba(2,5,12,0.55)");
  // the back: four slats, leaning away from us
  const BACK = ["#7fa9a1", "#4a736d"];
  const backSlats = [];
  for (let i = 0; i < 4; i++) {
    const h0 = 57 + i * 13.2, h1 = h0 + 10.6;
    backSlats.push([h0, h1]);
    slat([lean(h1), h1], [lean(h0), h0], BACK);
  }
  // the seat: five slats, the nearest rounded over the front edge
  const SEAT = ["#aacbc4", "#6a968e"];
  for (let i = 4; i >= 0; i--) slat([i * 9.2 + 8.2, 46], [i * 9.2 + 0.8, 46], SEAT);
  quad([Q(-102, 0.8, 46), Q(102, 0.8, 46), Q(102, 0, 41.5), Q(-102, 0, 41.5)], "#2c4a48");

  // Somebody has tried their colours on it: a stroke of the brush for each,
  // drawn out along a slat, the bristles' lines in it, its end gone ragged.
  const rnd = lcg(1905);
  const brush = (onBack, l0, len, at, colour) => {
    // on the back: `at` a height; on the seat: `at` a depth
    const P = (l, k) => (onBack ? Q(l, lean(at + k), at + k) : Q(l, at + k, 46.2));
    const w = onBack ? 6.4 : 5.6;
    ctx.fillStyle = colour;
    ctx.beginPath();
    const top = [], bot = [];
    for (let i = 0; i <= 12; i++) {
      const l = l0 + (len * i) / 12;
      const fade = i > 9 ? (12 - i) / 3 : 1; // the brush lifting off
      const wob = (rnd() - 0.5) * 0.9;
      top.push(P(l, (w / 2) * fade + wob));
      bot.push(P(l, (-w / 2) * fade + wob));
    }
    top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    bot.reverse().forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    // dry bristles trailing past its end
    ctx.strokeStyle = colour;
    ctx.lineWidth = 0.7;
    for (let k = -2; k <= 2; k++) {
      const a = P(l0 + len * 0.86, k * w * 0.2), c = P(l0 + len * (1.02 + rnd() * 0.16), k * w * 0.2 + (rnd() - 0.5));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    // the bristles' lines, a wet shine along the top of it
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 0.5;
    for (const k of [-0.22, 0.08, 0.3]) {
      const a = P(l0 + len * 0.06, k * w), c = P(l0 + len * 0.8, k * w);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    if (onBack && rnd() < 0.7) {
      // too much paint on the brush: a run down the slat
      const d0 = P(l0 + len * (0.15 + rnd() * 0.3), -w / 2);
      ctx.strokeStyle = colour;
      ctx.lineCap = "round";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(d0.x, d0.y);
      ctx.lineTo(d0.x + 0.2, d0.y + 4 + rnd() * 5);
      ctx.stroke();
    }
  };
  const colours = L.balloons.map((x) => x.code);
  // scattered, in no order: the order is the balloons' to tell
  brush(true, 26, 44, backSlats[3][0] + 5.3, colours[2]);
  brush(true, -92, 38, backSlats[2][0] + 5.3, colours[4]);
  brush(true, 42, 40, backSlats[1][0] + 5.3, colours[0]);
  brush(true, -58, 46, backSlats[0][0] + 5.3, colours[3]);
  brush(false, -30, 50, 23, colours[1]);
  brush(false, 34, 36, 41.4, colours[4]);
  brush(false, -84, 30, 13.8, colours[0]);

  // the card tied to the back, lettered by hand: the paint is wet
  const o = Q(-22, lean(84), 84);
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.transform(0.95, 0.1, -0.09, 1.056, 0, 0);
  ctx.rotate(-0.03);
  const pw = 86;
  const ph = 27;
  ctx.strokeStyle = "rgba(226,222,208,0.8)";
  ctx.lineWidth = 0.8;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo((d * pw) / 2 - d * 7, -ph / 2 + 3);
    ctx.lineTo((d * pw) / 2 - d * 4, -ph / 2 - 11);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(-pw / 2 + 1.6, -ph / 2 + 2, pw, ph);
  const pg = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
  pg.addColorStop(0, "#efe8d6");
  pg.addColorStop(1, "#c4bba4");
  ctx.fillStyle = pg;
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.strokeStyle = "rgba(60,50,36,0.5)";
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-pw / 2 + 2.2, -ph / 2 + 2.2, pw - 4.4, ph - 4.4);
  ctx.font = `13px ${FW_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1e1a16";
  ctx.fillText("FRESH PAINT", 0, 1.2);
  ctx.restore();

  // the near end, in front of it all
  end(100, ["#0a0f18", "rgba(170,190,220,0.6)"]);
  ctx.restore();
}

// the trees nearest us: one leaning in from each side, framing the sky
function paintNearTrees(ctx, L) {
  const { W, H, u } = L;
  tree(ctx, L, -W * 0.01, H * 0.9, H * 0.86, 150 * u, 31, "#040a12");
  tree(ctx, L, W * 1.02, H * 0.92, H * 0.74, 120 * u, 32, "#040a12");
}

// at our feet: long grass, a scatter of fallen leaves
function paintForeground(ctx, L) {
  const { W, H, u } = L;
  const rnd = lcg(2024);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W;
    const y = H * (0.7 + rnd() * 0.3);
    const k = (y / H - 0.6) * 2.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * 6);
    ctx.fillStyle = ["rgba(120,80,36,0.75)", "rgba(150,104,40,0.7)", "rgba(84,58,30,0.8)"][i % 3];
    ctx.beginPath();
    ctx.moveTo(-5 * u * k, 0);
    ctx.quadraticCurveTo(0, -3.4 * u * k, 5 * u * k, 0);
    ctx.quadraticCurveTo(0, 2.8 * u * k, -5 * u * k, 0);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W;
    const h = (8 + rnd() * 20) * u;
    ctx.strokeStyle = rnd() < 0.7 ? "#040c12" : "rgba(40,80,90,0.9)";
    ctx.lineWidth = Math.max(1, (1 + rnd() * 1.6) * u);
    ctx.beginPath();
    ctx.moveTo(x, H + 2);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 14 * u, H - h * 0.6, x + (rnd() - 0.5) * 34 * u, H - h);
    ctx.stroke();
  }
}

// ── the balloons ────────────────────────────────────────────────────────────

/** A balloon, matt: exactly its own colour and nothing else — no shine, no
 *  shading, no outline — so that the colour on the screen is the colour of
 *  its code. Painted at twice its size; its knot is at the bottom middle. */
function paintBalloon(r, code) {
  const R = 2;
  const w = r * 2.5;
  const h = r * 3.1;
  const c = makeCanvas(Math.ceil(w * R), Math.ceil(h * R));
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = w / 2;
  const cy = r * 1.28;
  g.fillStyle = code;
  g.beginPath();
  g.moveTo(cx, cy + r * 1.36);
  g.bezierCurveTo(cx - r * 0.5, cy + r * 1.1, cx - r * 1.04, cy + r * 0.5, cx - r * 1.02, cy - r * 0.12);
  g.bezierCurveTo(cx - r * 1.0, cy - r * 0.86, cx - r * 0.52, cy - r * 1.2, cx, cy - r * 1.2);
  g.bezierCurveTo(cx + r * 0.52, cy - r * 1.2, cx + r * 1.0, cy - r * 0.86, cx + r * 1.02, cy - r * 0.12);
  g.bezierCurveTo(cx + r * 1.04, cy + r * 0.5, cx + r * 0.5, cy + r * 1.1, cx, cy + r * 1.36);
  g.closePath();
  g.fill();
  // the knot
  g.beginPath();
  g.moveTo(cx, cy + r * 1.33);
  g.lineTo(cx - r * 0.12, cy + r * 1.52);
  g.lineTo(cx + r * 0.12, cy + r * 1.52);
  g.closePath();
  g.fill();
  return c;
}

// a four-pointed glint, for the Tower and the pond
function paintGlint() {
  const c = makeCanvas(32, 32);
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,240,200,0.6)");
  grd.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(16, 2);
  g.lineTo(16, 30);
  g.moveTo(2, 16);
  g.lineTo(30, 16);
  g.stroke();
  return c;
}
