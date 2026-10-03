/** Paris on New Year's Eve, painted like a storybook night: the Eiffel Tower
 *  lit gold over the city, the Seine below it with a bridge and the river
 *  boats, the moon in torn clouds; and in front, on a terrace above the
 *  river, a lamp among climbing roses, a wet bench with an old trunk and a
 *  brass carriage clock standing at midnight, a wrought-iron railing, wet
 *  cobbles, a stone urn of roses.
 *
 *  Painted once per screen size (`room`). The fireworks, their light, their
 *  tags, the tower's sparkle, the lamp's flicker and the clock's second hand
 *  are live, in the scene; this returns where everything is. */

export const FW_FONT = '"Special Elite", monospace';
const ROOM = "fw_room";
const GLOW = "fw_glow";
const GLINT = "fw_glint";
const WARM = "255,196,120";
const GOLD = "255,200,110";

export function layoutParis(W, H) {
  const S = Math.min(W, H);
  const L = { W, H, S };
  L.horizon = H * 0.47;
  L.river = { y0: H * 0.5, y1: H * 0.76 };
  L.tower = { x: W * 0.54, top: H * 0.055, base: H * 0.505 };
  L.moon = { x: W * 0.84, y: H * 0.08, r: S * 0.024 };
  L.bridge = { x0: W * 0.43, x1: W * 1.02, y: H * 0.525 };
  L.wall = { x0: W * 0.2, x1: W * 0.5, top: H * 0.56 };
  L.rail = { x0: W * 0.47, x1: W * 0.935, top: H * 0.655, bot: H * 0.885 };
  L.bench = { x1: W * 0.52, back0: H * 0.575, back1: H * 0.76, seat: H * 0.86 };
  L.chest = { x0: -W * 0.01, x1: W * 0.2, top: H * 0.74, bot: H * 0.95 };
  const cw = Math.min(W * 0.2, H * 0.33);
  L.clock = { x: W * 0.315, base: H * 0.872, w: cw, h: cw * 0.78 };
  L.clock.face = {
    x: L.clock.x,
    y: L.clock.base - L.clock.h * 0.56,
    r: cw * 0.2,
  };
  L.clock.plate = {
    x: L.clock.x,
    y: L.clock.base - L.clock.h * 0.13,
    w: cw * 0.5,
    h: cw * 0.085,
  };
  L.lamp = { x: W * 0.075, y: H * 0.135, post: H * 0.56 };
  L.pillar = { x0: W * 0.94, top: H * 0.62 };
  // where the five fireworks burst, in the order they go up
  const R = S * 0.105;
  L.bursts = [
    { x: W * 0.2, y: H * 0.19 },
    { x: W * 0.33, y: H * 0.32 },
    { x: W * 0.42, y: H * 0.18 },
    { x: W * 0.68, y: H * 0.27 },
    { x: W * 0.865, y: H * 0.3 },
  ].map((b) => ({ ...b, r: R }));
  return L;
}

export function paintParis(scene, L) {
  const { W, H } = L;
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  paintSky(ctx, L);
  paintCity(ctx, L);
  const towerPts = paintTower(ctx, L);
  paintRiver(ctx, L);
  paintBridge(ctx, L);
  paintBoats(ctx, L);
  paintWall(ctx, L);
  paintCobbles(ctx, L);
  paintRailing(ctx, L);
  paintPillar(ctx, L);
  paintLampAndRoses(ctx, L);
  paintBench(ctx, L);
  paintChest(ctx, L);
  paintClock(ctx, L);
  paintRose(ctx, L);
  finish(ctx, L);
  const t = scene.textures;
  add(t, ROOM, cv);
  add(
    t,
    GLOW,
    radial(128, "255,255,255", [
      [0, 0.9],
      [0.25, 0.35],
      [0.6, 0.08],
      [1, 0],
    ]),
  );
  add(t, GLINT, paintGlint());
  return { room: ROOM, glow: GLOW, glint: GLINT, towerPts };
}

export function releaseParisArt(textures) {
  for (const key of [ROOM, GLOW, GLINT])
    if (textures.exists(key)) textures.remove(key);
}

// the bright colour a firework burns in: its hex, raised to full strength
export function burnColour(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const k = 255 / Math.max(r, g, b);
  return (
    ((Math.round(r * k) << 16) |
      (Math.round(g * k) << 8) |
      Math.round(b * k)) >>>
    0
  );
}

// ── the sky ─────────────────────────────────────────────────────────────────

function paintSky(ctx, L) {
  const { W, H, S, horizon } = L;
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, "#05061a");
  g.addColorStop(0.5, "#120d2c");
  g.addColorStop(1, "#2e1a3c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(11);
  for (let i = 0; i < (W * horizon) / 2600; i++) {
    const y = rnd() * horizon * 0.8;
    ctx.fillStyle = `rgba(230,232,255,${((0.2 + rnd() * 0.6) * (1 - y / horizon)).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, y, 0.4 + rnd() * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // the city's glow low on the sky
  soft(ctx, W / 2, horizon, W * 0.7, H * 0.16, "160,90,120", 0.3);
  // the moon and its halo
  const m = L.moon;
  soft(ctx, m.x, m.y, m.r * 9, m.r * 9, "170,180,230", 0.16, "lighter");
  soft(ctx, m.x, m.y, m.r * 3, m.r * 3, "220,225,255", 0.3, "lighter");
  const mg = ctx.createRadialGradient(
    m.x - m.r * 0.3,
    m.y - m.r * 0.3,
    m.r * 0.1,
    m.x,
    m.y,
    m.r,
  );
  mg.addColorStop(0, "#fbf8ee");
  mg.addColorStop(0.75, "#e2dccc");
  mg.addColorStop(1, "#b0a898");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  ctx.fill();
  soft(
    ctx,
    m.x - m.r * 0.3,
    m.y - m.r * 0.1,
    m.r * 0.3,
    m.r * 0.22,
    "110,110,120",
    0.25,
  );
  // torn clouds: lit silver round the moon, dark violet elsewhere
  const cloud = (cx, cy, w, h, n, seed, lit) => {
    const r2 = lcg(seed);
    for (let i = 0; i < n; i++) {
      const px = cx + (r2() - 0.5) * w;
      const py = cy + (r2() - 0.5) * h;
      const rr = Math.min(w, h * 3) * (0.08 + r2() * 0.14);
      const near = Math.exp(
        -((px - m.x) ** 2 + (py - m.y) ** 2) / (2 * (S * 0.3) ** 2),
      );
      const base = lit ? 0.12 + 0.3 * near : 0.18;
      soft(ctx, px, py + rr * 0.15, rr * 1.3, rr * 0.7, "8,6,18", 0.35);
      soft(
        ctx,
        px,
        py,
        rr * 1.4,
        rr * 0.75,
        lit ? "150,150,190" : "60,40,80",
        base,
      );
      if (lit)
        soft(
          ctx,
          px - rr * 0.2,
          py - rr * 0.3,
          rr * 0.8,
          rr * 0.35,
          "220,225,250",
          0.12 * near,
        );
    }
  };
  cloud(W * 0.83, H * 0.13, W * 0.32, H * 0.12, 40, 3, true);
  cloud(W * 0.92, H * 0.3, W * 0.25, H * 0.1, 24, 5, true);
  cloud(W * 0.3, H * 0.36, W * 0.4, H * 0.08, 30, 7, false);
  cloud(W * 0.62, H * 0.4, W * 0.3, H * 0.05, 18, 9, false);
}

// ── the city ────────────────────────────────────────────────────────────────

function paintCity(ctx, L) {
  const { W, H, S, horizon } = L;
  const rnd = lcg(21);
  // the far rooftops: mansards and chimneys, a scatter of lit windows
  for (const [col, lo, hi, step] of [
    ["#170f22", 0.02, 0.05, 0.03],
    ["#0e0a18", 0.015, 0.035, 0.024],
  ]) {
    let x = -10;
    ctx.fillStyle = col;
    while (x < W + 10) {
      const w = W * (step + rnd() * step);
      const top = horizon - H * (lo + rnd() * (hi - lo));
      ctx.beginPath();
      ctx.moveTo(x, horizon + 2);
      ctx.lineTo(x, top + H * 0.008);
      ctx.lineTo(x + w * 0.12, top);
      ctx.lineTo(x + w * 0.88, top);
      ctx.lineTo(x + w, top + H * 0.008);
      ctx.lineTo(x + w, horizon + 2);
      ctx.closePath();
      ctx.fill();
      if (rnd() < 0.5)
        ctx.fillRect(x + w * 0.3, top - H * 0.008, w * 0.06, H * 0.01);
      x += w;
    }
  }
  for (let i = 0; i < W / 4; i++) {
    const x = rnd() * W;
    const y = horizon - H * (0.003 + rnd() * 0.035);
    ctx.fillStyle = `rgba(255,${190 + Math.round(rnd() * 40)},120,${(0.4 + rnd() * 0.5).toFixed(2)})`;
    ctx.fillRect(x, y, Math.max(1, S * 0.002), Math.max(1, S * 0.002));
  }
  // the big blocks on the left bank: Haussmann fronts, grey roofs, lit rows
  let bx = W * 0.1;
  while (bx < W * 0.4) {
    const w = W * (0.05 + rnd() * 0.04);
    const top = horizon - H * (0.07 + rnd() * 0.05);
    const fg = ctx.createLinearGradient(0, top, 0, horizon);
    fg.addColorStop(0, "#5a4a52");
    fg.addColorStop(1, "#2a2030");
    ctx.fillStyle = fg;
    ctx.fillRect(bx, top + H * 0.02, w, horizon - top);
    ctx.fillStyle = "#1e1a2a";
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.02, top + H * 0.022);
    ctx.lineTo(bx + w * 0.1, top);
    ctx.lineTo(bx + w * 0.9, top);
    ctx.lineTo(bx + w * 1.02, top + H * 0.022);
    ctx.closePath();
    ctx.fill();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 9; c++) {
        const lit = rnd() < 0.45;
        const wx = bx + w * (0.06 + c * 0.1);
        const wy = top + H * (0.03 + r * 0.013);
        ctx.fillStyle = lit
          ? `rgba(255,${190 + Math.round(rnd() * 40)},120,${(0.55 + rnd() * 0.4).toFixed(2)})`
          : "rgba(24,18,32,0.7)";
        ctx.fillRect(wx, wy, Math.max(1.5, w * 0.045), Math.max(2, H * 0.007));
      }
      ctx.fillStyle = "rgba(20,14,24,0.5)";
      ctx.fillRect(bx, top + H * (0.026 + r * 0.013), w, 1);
    }
    bx += w;
  }
  // the dome on the right, lit gold
  const dx = W * 0.94;
  const dy = horizon - H * 0.02;
  const dr = S * 0.03;
  soft(ctx, dx, dy - dr, dr * 3, dr * 2.5, GOLD, 0.25, "lighter");
  ctx.fillStyle = "#3a2a20";
  ctx.fillRect(dx - dr * 1.3, dy - dr * 0.6, dr * 2.6, dr * 0.8);
  const domeG = ctx.createRadialGradient(
    dx - dr * 0.3,
    dy - dr * 1.3,
    dr * 0.1,
    dx,
    dy - dr,
    dr * 1.2,
  );
  domeG.addColorStop(0, "#ffe8a0");
  domeG.addColorStop(1, "#a87a30");
  ctx.fillStyle = domeG;
  ctx.beginPath();
  ctx.ellipse(dx, dy - dr * 0.6, dr, dr * 1.15, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(dx - dr * 0.06, dy - dr * 2.3, dr * 0.12, dr * 0.6);
  // the trees along the river, the lamps along the quay
  for (let i = 0; i < 60; i++) {
    const x = rnd() * W;
    const y = horizon + H * (0.005 + rnd() * 0.02);
    const r = S * (0.012 + rnd() * 0.02);
    soft(ctx, x, y, r * 1.6, r, "8,10,12", 0.9);
  }
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * W + rnd() * W * 0.02;
    const y = horizon + H * (0.022 + rnd() * 0.006);
    soft(ctx, x, y, S * 0.008, S * 0.008, WARM, 0.9, "lighter");
  }
}

// the tower: its silhouette, filled with gold light, its lattice, its glow.
// Returns points on it for the scene's sparkle.
function paintTower(ctx, L) {
  const { S } = L;
  const t = L.tower;
  const Ht = t.base - t.top;
  const X = (u) => t.x + u * Ht;
  const Y = (v) => t.top + v * Ht;
  const right = [
    [0.003, 0],
    [0.005, 0.07],
    [0.016, 0.075],
    [0.018, 0.115],
    [0.011, 0.12],
    [0.014, 0.13],
    [0.022, 0.25],
    [0.031, 0.4],
    [0.04, 0.5],
    [0.052, 0.6],
    [0.062, 0.603],
    [0.076, 0.612],
    [0.076, 0.637],
    [0.066, 0.642],
    [0.068, 0.645],
    [0.083, 0.7],
    [0.1, 0.76],
    [0.123, 0.81],
    [0.136, 0.812],
    [0.152, 0.822],
    [0.152, 0.85],
    [0.142, 0.855],
    [0.146, 0.87],
    [0.158, 0.9],
    [0.174, 0.95],
    [0.192, 1.0],
    [0.112, 1.0],
    [0.1, 0.96],
    [0.084, 0.925],
  ];
  const outline = () => {
    ctx.beginPath();
    right.forEach(([u, v], i) =>
      i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v)),
    );
    // the great arch between the legs
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      ctx.lineTo(X(Math.cos(a) * 0.084), Y(0.925 - Math.sin(a) * 0.05));
    }
    for (let i = right.length - 1; i >= 0; i--)
      ctx.lineTo(X(-right[i][0]), Y(right[i][1]));
    ctx.closePath();
  };
  // its glow on the night round it
  soft(ctx, t.x, Y(0.55), Ht * 0.32, Ht * 0.6, GOLD, 0.2, "lighter");
  soft(ctx, t.x, Y(0.9), Ht * 0.3, Ht * 0.15, GOLD, 0.25, "lighter");
  // the iron, lit from below in gold
  outline();
  const g = ctx.createLinearGradient(0, t.top, 0, t.base);
  g.addColorStop(0, "#ffe9a8");
  g.addColorStop(0.5, "#ffc65a");
  g.addColorStop(1, "#e89a30");
  ctx.fillStyle = g;
  ctx.fill();
  // the lattice: dark crossing struts over the light
  ctx.save();
  outline();
  ctx.clip();
  const step = Math.max(4, Ht * 0.02);
  ctx.strokeStyle = "rgba(70,30,6,0.55)";
  ctx.lineWidth = Math.max(1, step * 0.3);
  for (let k = -Ht; k < Ht * 1.3; k += step) {
    ctx.beginPath();
    ctx.moveTo(t.x - Ht * 0.3, t.top + k);
    ctx.lineTo(t.x + Ht * 0.3, t.top + k + Ht * 0.6);
    ctx.moveTo(t.x + Ht * 0.3, t.top + k);
    ctx.lineTo(t.x - Ht * 0.3, t.top + k + Ht * 0.6);
    ctx.stroke();
  }
  // the edges of the legs and the shafts, bright
  ctx.strokeStyle = "rgba(255,240,190,0.9)";
  ctx.lineWidth = Math.max(1, Ht * 0.004);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    right.forEach(([u, v], i) =>
      i
        ? ctx.lineTo(X(sgn * (u - 0.004)), Y(v))
        : ctx.moveTo(X(sgn * (u - 0.004)), Y(v)),
    );
    ctx.stroke();
  }
  // the platforms: bands of brighter light
  for (const [v0, v1, w] of [
    [0.605, 0.64, 0.076],
    [0.814, 0.852, 0.152],
    [0.078, 0.112, 0.018],
  ]) {
    ctx.fillStyle = "rgba(255,248,210,0.55)";
    ctx.fillRect(X(-w), Y(v0), X(w) - X(-w), Y(v1) - Y(v0));
    ctx.fillStyle = "rgba(90,40,10,0.4)";
    for (let x = X(-w); x < X(w); x += step * 1.2)
      ctx.fillRect(x, Y(v0), Math.max(1, step * 0.3), Y(v1) - Y(v0));
  }
  ctx.restore();
  // the beacon at its top
  soft(ctx, X(0), Y(0.09), Ht * 0.03, Ht * 0.03, "255,250,220", 0.8, "lighter");
  // points for the sparkle, scattered over the iron
  const pts = [];
  const rnd = lcg(5);
  while (pts.length < 60) {
    const v = 0.1 + rnd() * 0.88;
    let half = 0;
    for (let i = 1; i < right.length; i++) {
      if (right[i][1] >= v && right[i - 1][1] <= v) {
        const k =
          (v - right[i - 1][1]) / Math.max(1e-6, right[i][1] - right[i - 1][1]);
        half = right[i - 1][0] + (right[i][0] - right[i - 1][0]) * k;
        break;
      }
    }
    const u = (rnd() * 2 - 1) * half * 0.85;
    if (v > 0.88 && Math.abs(u) < 0.09) continue; // not in the arch
    pts.push({ x: X(u), y: Y(v) });
  }
  void S;
  return pts;
}

// ── the river ───────────────────────────────────────────────────────────────

function paintRiver(ctx, L) {
  const { W, S } = L;
  const { y0, y1 } = L.river;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#1a1430");
  g.addColorStop(1, "#0c0a1a");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0 - 2, W, y1 - y0 + 2);
  // the tower and the lamps, broken up in the water
  const rnd = lcg(31);
  const streak = (x, rgb, a, w, len) => {
    for (let i = 0; i < 14; i++) {
      const yy = y0 + (y1 - y0) * (i / 14) * len;
      const ww = w * (0.6 + rnd() * 0.8);
      ctx.fillStyle = `rgba(${rgb},${(a * (1 - i / 16) * (0.5 + rnd() * 0.5)).toFixed(3)})`;
      ctx.fillRect(
        x - ww / 2 + (rnd() - 0.5) * w * 0.6,
        yy,
        ww,
        Math.max(1.5, S * 0.003),
      );
    }
  };
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  soft(
    ctx,
    L.tower.x,
    y0 + (y1 - y0) * 0.35,
    S * 0.06,
    (y1 - y0) * 0.45,
    GOLD,
    0.35,
  );
  streak(L.tower.x, GOLD, 0.7, S * 0.05, 0.9);
  for (let i = 0; i < 18; i++) {
    const x = L.bridge.x0 + rnd() * (W - L.bridge.x0);
    streak(x, WARM, 0.35, S * 0.012, 0.5 + rnd() * 0.4);
  }
  ctx.restore();
  // little ripples catching the light
  for (let i = 0; i < W / 3; i++) {
    const x = rnd() * W;
    const y = y0 + rnd() * (y1 - y0);
    ctx.fillStyle = `rgba(200,180,220,${(0.05 + rnd() * 0.1).toFixed(2)})`;
    ctx.fillRect(x, y, S * (0.005 + rnd() * 0.012), 1);
  }
}

// the stone bridge across the river, its lamps, its arches in the water
function paintBridge(ctx, L) {
  const { S } = L;
  const b = L.bridge;
  const deck = S * 0.018;
  const archH = S * 0.03;
  const n = 6;
  const span = (b.x1 - b.x0) / n;
  ctx.fillStyle = "#4a3c40";
  ctx.beginPath();
  ctx.moveTo(b.x0, b.y - deck);
  ctx.lineTo(b.x1, b.y - deck);
  ctx.lineTo(b.x1, b.y + archH);
  for (let i = n - 1; i >= 0; i--) {
    const ax0 = b.x0 + i * span + span * 0.12;
    const ax1 = b.x0 + (i + 1) * span - span * 0.12;
    ctx.lineTo(ax1, b.y + archH);
    ctx.quadraticCurveTo((ax0 + ax1) / 2, b.y - archH * 0.6, ax0, b.y + archH);
  }
  ctx.lineTo(b.x0, b.y + archH);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, b.y - deck, 0, b.y + archH);
  bg.addColorStop(0, "#c8a880");
  bg.addColorStop(0.3, "#7a6458");
  bg.addColorStop(1, "#3a2e36");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = "rgba(255,220,160,0.5)";
  ctx.fillRect(b.x0, b.y - deck, b.x1 - b.x0, 1.5);
  for (let i = 0; i <= n * 2; i++) {
    const x = b.x0 + (i / (n * 2)) * (b.x1 - b.x0);
    soft(
      ctx,
      x,
      b.y - deck - S * 0.006,
      S * 0.006,
      S * 0.006,
      WARM,
      0.95,
      "lighter",
    );
  }
  // the arches' dark echo in the water
  ctx.fillStyle = "rgba(10,8,18,0.5)";
  for (let i = 0; i < n; i++) {
    const ax0 = b.x0 + i * span + span * 0.12;
    const ax1 = b.x0 + (i + 1) * span - span * 0.12;
    ctx.beginPath();
    ctx.moveTo(ax0, b.y + archH);
    ctx.quadraticCurveTo((ax0 + ax1) / 2, b.y + archH * 2.6, ax1, b.y + archH);
    ctx.closePath();
    ctx.fill();
  }
}

// two river boats, their windows lit, their light in the water
function paintBoats(ctx, L) {
  const { W, S } = L;
  const boat = (cx, cy, len) => {
    const h = len * 0.1;
    soft(ctx, cx, cy + h * 2.5, len * 0.55, h * 2.5, WARM, 0.22, "lighter");
    ctx.fillStyle = "#0e0c16";
    ctx.beginPath();
    ctx.moveTo(cx - len / 2, cy);
    ctx.lineTo(cx + len / 2, cy);
    ctx.lineTo(cx + len * 0.45, cy + h);
    ctx.lineTo(cx - len * 0.48, cy + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a2232";
    ctx.fillRect(cx - len * 0.4, cy - h * 1.1, len * 0.8, h * 1.1);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = "rgba(255,210,140,0.9)";
      ctx.fillRect(
        cx - len * 0.38 + i * len * 0.048,
        cy - h * 0.85,
        len * 0.03,
        h * 0.5,
      );
    }
    ctx.fillStyle = "rgba(255,220,160,0.6)";
    ctx.fillRect(cx - len * 0.5, cy, len, 1.5);
  };
  boat(
    W * 0.79,
    L.river.y0 + (L.river.y1 - L.river.y0) * 0.3,
    Math.min(W * 0.18, S * 0.32),
  );
  boat(
    W * 0.5,
    L.river.y0 + (L.river.y1 - L.river.y0) * 0.08,
    Math.min(W * 0.07, S * 0.12),
  );
}

// ── the terrace ─────────────────────────────────────────────────────────────

// the stone parapet behind the bench, warm in the lamp's light
function paintWall(ctx, L) {
  const { S, H } = L;
  const w = L.wall;
  const blocks = (x0, y0, x1, y1, seed) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, "#9a8670");
    g.addColorStop(1, "#4a3c34");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    const rnd = lcg(seed);
    const bh = (y1 - y0) / 3;
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x0, y0 + r * bh, x1 - x0, 1);
      for (
        let x = x0 + (r % 2) * S * 0.04;
        x < x1;
        x += S * (0.06 + rnd() * 0.03)
      )
        ctx.fillRect(x, y0 + r * bh, 1, bh);
    }
    for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 40; i++) {
      ctx.fillStyle =
        rnd() < 0.5 ? "rgba(255,240,220,0.05)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 2, 2);
    }
    ctx.fillStyle = "rgba(255,220,170,0.35)";
    ctx.fillRect(x0, y0, x1 - x0, 2);
  };
  blocks(w.x0, w.top, w.x1, H * 0.66, 3);
  blocks(w.x1 - (w.x1 - w.x0) * 0.42, H * 0.6, w.x1 + S * 0.03, H * 0.7, 4);
  soft(
    ctx,
    L.lamp.x + S * 0.2,
    w.top + S * 0.05,
    S * 0.35,
    S * 0.12,
    WARM,
    0.2,
    "lighter",
  );
}

// wet cobbles in front of the railing, holding the lights
function paintCobbles(ctx, L) {
  const { W, H, S } = L;
  const y0 = H * 0.84;
  const x0 = 0;
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, "#2a2028");
  g.addColorStop(1, "#3a2c34");
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, W - x0, H - y0);
  const rnd = lcg(41);
  for (let row = 0; row < 10; row++) {
    const t = row / 10;
    const y = y0 + (H - y0) * t * t * 1.0 + (H - y0) * t * 0.1;
    const ch = (H - y0) * (0.05 + t * 0.12);
    const cw = ch * 1.6;
    for (let x = x0 + (row % 2) * cw * 0.5; x < W; x += cw) {
      const tone = 0.7 + rnd() * 0.5;
      ctx.fillStyle = `rgba(${Math.round(70 * tone)},${Math.round(58 * tone)},${Math.round(66 * tone)},0.9)`;
      rrect(ctx, x + 1, y + 1, cw - 2, ch - 2, ch * 0.3);
      ctx.fill();
      ctx.fillStyle = `rgba(255,220,180,${(0.05 + rnd() * 0.08).toFixed(2)})`;
      ctx.fillRect(x + cw * 0.2, y + 2, cw * 0.5, 1);
    }
  }
  // the bench's shadow over the left of it
  const sh = ctx.createLinearGradient(0, 0, W * 0.55, 0);
  sh.addColorStop(0, "rgba(4,3,6,0.85)");
  sh.addColorStop(0.8, "rgba(4,3,6,0.5)");
  sh.addColorStop(1, "rgba(4,3,6,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, y0, W * 0.55, H - y0);
  // puddles holding the tower's gold and the sky's violet
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  soft(ctx, W * 0.66, H * 0.93, S * 0.12, S * 0.025, GOLD, 0.25);
  soft(ctx, W * 0.86, H * 0.9, S * 0.1, S * 0.02, "180,90,255", 0.2);
  ctx.restore();
}

// the wrought-iron railing: bars, scrolls, a fleur-de-lis between them
function paintRailing(ctx, L) {
  const { S } = L;
  const r = L.rail;
  const iron = "#0a080c";
  const lw = Math.max(2, S * 0.005);
  ctx.strokeStyle = iron;
  ctx.fillStyle = iron;
  ctx.lineCap = "round";
  // the top and bottom rails, their sheen
  ctx.fillRect(r.x0, r.top - lw * 1.5, r.x1 - r.x0, lw * 3);
  ctx.fillRect(r.x0, r.bot - lw, r.x1 - r.x0, lw * 2);
  ctx.fillStyle = "rgba(255,200,160,0.3)";
  ctx.fillRect(r.x0, r.top - lw * 1.5, r.x1 - r.x0, 1);
  const panels = 4;
  const pw = (r.x1 - r.x0) / panels;
  const h = r.bot - r.top;
  for (let p = 0; p <= panels; p++) {
    const x = r.x0 + p * pw;
    ctx.fillStyle = iron;
    ctx.fillRect(x - lw * 1.2, r.top - lw * 2, lw * 2.4, h + lw * 3);
    ctx.fillStyle = "rgba(255,200,160,0.25)";
    ctx.fillRect(x - lw * 1.2, r.top, 1, h);
  }
  ctx.lineWidth = lw * 0.8;
  for (let p = 0; p < panels; p++) {
    const cx = r.x0 + (p + 0.5) * pw;
    const cy = r.top + h * 0.5;
    // two big C-scrolls back to back, two small ones above and below
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        cx + s * pw * 0.22,
        cy,
        h * 0.22,
        s > 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
        s > 0 ? Math.PI * 2.1 : Math.PI * 1.1,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        cx + s * pw * 0.22 + s * h * 0.06,
        cy + h * 0.04,
        h * 0.07,
        0,
        Math.PI * 1.6,
      );
      ctx.stroke();
      for (const vy of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + s * pw * 0.4, cy + vy * h * 0.3, h * 0.1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // the fleur-de-lis in the middle
    const fh = h * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx, cy - fh * 0.5);
    ctx.quadraticCurveTo(cx + fh * 0.12, cy - fh * 0.1, cx, cy + fh * 0.2);
    ctx.quadraticCurveTo(cx - fh * 0.12, cy - fh * 0.1, cx, cy - fh * 0.5);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + fh * 0.1);
      ctx.bezierCurveTo(
        cx + s * fh * 0.4,
        cy - fh * 0.1,
        cx + s * fh * 0.35,
        cy - fh * 0.45,
        cx + s * fh * 0.15,
        cy - fh * 0.25,
      );
      ctx.stroke();
    }
    ctx.fillRect(cx - fh * 0.2, cy + fh * 0.15, fh * 0.4, lw * 1.4);
    ctx.beginPath();
    ctx.moveTo(cx, cy + fh * 0.2);
    ctx.lineTo(cx, r.bot);
    ctx.stroke();
    // thin bars either side
    for (let k = 1; k < 5; k++) {
      if (k === 2 || k === 3) continue;
      const bx = r.x0 + p * pw + (k / 5) * pw;
      ctx.beginPath();
      ctx.moveTo(bx, r.top);
      ctx.lineTo(bx, r.bot);
      ctx.stroke();
    }
  }
}

// the stone pillar on the right with its urn of roses
function paintPillar(ctx, L) {
  const { W, H, S } = L;
  const p = L.pillar;
  const g = ctx.createLinearGradient(p.x0, 0, W, 0);
  g.addColorStop(0, "#5a4a3e");
  g.addColorStop(0.3, "#3a2e26");
  g.addColorStop(1, "#140e0c");
  ctx.fillStyle = g;
  ctx.fillRect(p.x0, p.top, W - p.x0, H - p.top);
  const prnd = lcg(83);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle =
      prnd() < 0.5 ? "rgba(255,230,200,0.05)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(
      p.x0 + prnd() * (W - p.x0),
      p.top + prnd() * (H - p.top),
      2,
      2,
    );
  }
  ctx.fillStyle = "rgba(255,200,160,0.25)";
  ctx.fillRect(p.x0, p.top, 1.5, H - p.top);
  ctx.fillStyle = "#6a5848";
  ctx.fillRect(p.x0 - S * 0.01, p.top, W - p.x0 + S * 0.01, S * 0.018);
  // the urn
  const ux = p.x0 + (W - p.x0) * 0.6;
  const uy = p.top;
  ctx.fillStyle = "#6a5a4c";
  ctx.beginPath();
  ctx.moveTo(ux - S * 0.05, uy - S * 0.07);
  ctx.quadraticCurveTo(ux - S * 0.055, uy - S * 0.01, ux - S * 0.02, uy);
  ctx.lineTo(ux + S * 0.02, uy);
  ctx.quadraticCurveTo(
    ux + S * 0.055,
    uy - S * 0.01,
    ux + S * 0.05,
    uy - S * 0.07,
  );
  ctx.closePath();
  ctx.fill();
  roses(ctx, ux, uy - S * 0.1, S * 0.08, 7, 61);
}

// the lamp on its post among climbing roses, against the old wall
function paintLampAndRoses(ctx, L) {
  const { H, S } = L;
  const l = L.lamp;
  // the wall at the far left
  const wg = ctx.createLinearGradient(0, 0, S * 0.06, 0);
  wg.addColorStop(0, "#120c0a");
  wg.addColorStop(1, "#3a2c22");
  ctx.fillStyle = wg;
  ctx.fillRect(0, 0, S * 0.055, H);
  soft(ctx, l.x, l.y, S * 0.35, S * 0.35, WARM, 0.35, "lighter");
  // leaves and roses climbing the wall and the post
  const rnd = lcg(71);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S * 0.22;
    const y = H * 0.18 + rnd() * H * 0.42;
    leaf(
      ctx,
      x,
      y,
      S * (0.012 + rnd() * 0.012),
      rnd() * Math.PI * 2,
      rnd() < 0.3,
    );
  }
  roses(ctx, S * 0.12, H * 0.42, S * 0.14, 9, 73);
  // the post and the lantern
  ctx.fillStyle = "#0c0a0e";
  ctx.fillRect(l.x - S * 0.008, l.y + S * 0.06, S * 0.016, l.post - l.y);
  ctx.fillRect(l.x - S * 0.02, l.post - S * 0.04, S * 0.04, S * 0.04);
  const lw = S * 0.065;
  const lh = S * 0.1;
  ctx.beginPath();
  ctx.moveTo(l.x - lw * 0.65, l.y - lh * 0.45);
  ctx.lineTo(l.x, l.y - lh * 0.8);
  ctx.lineTo(l.x + lw * 0.65, l.y - lh * 0.45);
  ctx.closePath();
  ctx.fill();
  const glass = ctx.createLinearGradient(0, l.y - lh * 0.45, 0, l.y + lh * 0.5);
  glass.addColorStop(0, "#fff2c8");
  glass.addColorStop(1, "#ffb860");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(l.x - lw * 0.5, l.y - lh * 0.45);
  ctx.lineTo(l.x + lw * 0.5, l.y - lh * 0.45);
  ctx.lineTo(l.x + lw * 0.38, l.y + lh * 0.45);
  ctx.lineTo(l.x - lw * 0.38, l.y + lh * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#0c0a0e";
  ctx.fillRect(l.x - 1, l.y - lh * 0.45, 2, lh * 0.9);
  ctx.fillRect(l.x - lw * 0.42, l.y + lh * 0.42, lw * 0.84, S * 0.012);
  soft(ctx, l.x, l.y, lw * 0.6, lh * 0.5, "255,240,200", 0.7, "lighter");
}

// the bench: rounded slats, dark green and wet, on a cast-iron frame with
// an arm curling over the seat at its end
function paintBench(ctx, L) {
  const { S } = L;
  const b = L.bench;
  const end = b.x1 * 0.9;
  const slat = (x0, x1, y, h, lean) => {
    // a slat seen a little from above: a rounded bar, lit along its top
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#3e4e48");
    g.addColorStop(0.18, "#22302c");
    g.addColorStop(0.7, "#101816");
    g.addColorStop(1, "#060a09");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1 - h * 0.4, y + lean);
    ctx.quadraticCurveTo(x1, y + lean, x1, y + lean + h * 0.5);
    ctx.quadraticCurveTo(x1, y + lean + h, x1 - h * 0.4, y + lean + h);
    ctx.lineTo(x0, y + h);
    ctx.closePath();
    ctx.fill();
    // the rain on it: a bright line along its top, beads here and there
    ctx.strokeStyle = "rgba(255,214,170,0.45)";
    ctx.lineWidth = Math.max(1, h * 0.06);
    ctx.beginPath();
    ctx.moveTo(x0, y + h * 0.12);
    ctx.lineTo(x1 - h * 0.4, y + lean + h * 0.12);
    ctx.stroke();
    const rnd = lcg(Math.round(y));
    for (let i = 0; i < (x1 - x0) / 30; i++) {
      const bx = x0 + rnd() * (x1 - x0 - h);
      const by = y + h * (0.25 + rnd() * 0.4) + (lean * (bx - x0)) / (x1 - x0);
      ctx.fillStyle = "rgba(255,230,200,0.35)";
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(0.8, h * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
    soft(
      ctx,
      x0 + (x1 - x0) * 0.25,
      y + h * 0.3,
      (x1 - x0) * 0.22,
      h * 0.6,
      WARM,
      0.12,
      "lighter",
    );
  };
  // the back: three slats, leaning back a touch
  const bh = (b.back1 - b.back0) / 3;
  for (let i = 0; i < 3; i++)
    slat(-4, end * 0.96, b.back0 + i * bh, bh * 0.8, bh * 0.08);
  // the iron upright behind the arm
  ctx.fillStyle = "#08090a";
  ctx.fillRect(end * 0.93, b.back0 - S * 0.01, S * 0.014, b.seat - b.back0);
  // the seat: three slats coming toward us, each a little lower and wider
  const sh = (b.seat - b.back1) / 3;
  for (let i = 0; i < 3; i++)
    slat(-4, end + i * S * 0.008, b.back1 + S * 0.006 + i * sh, sh * 0.82, 0);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(-4, b.seat, end + S * 0.02, S * 0.012);
  // the arm: cast iron curling down over the seat's end
  const ax = end;
  ctx.strokeStyle = "#0a0a0c";
  ctx.lineWidth = Math.max(5, S * 0.014);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax - S * 0.09, b.back1 - S * 0.035);
  ctx.bezierCurveTo(
    ax + S * 0.02,
    b.back1 - S * 0.07,
    ax + S * 0.07,
    b.back1 + S * 0.01,
    ax + S * 0.035,
    b.back1 + S * 0.065,
  );
  ctx.bezierCurveTo(
    ax + S * 0.005,
    b.seat - S * 0.02,
    ax + S * 0.045,
    b.seat + S * 0.04,
    ax + S * 0.015,
    b.seat + S * 0.13,
  );
  ctx.stroke();
  ctx.lineWidth = Math.max(3, S * 0.009);
  ctx.beginPath();
  ctx.arc(ax + S * 0.01, b.back1 + S * 0.045, S * 0.028, -0.3, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,206,160,0.4)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(ax - S * 0.09, b.back1 - S * 0.04);
  ctx.bezierCurveTo(
    ax + S * 0.02,
    b.back1 - S * 0.075,
    ax + S * 0.066,
    b.back1,
    ax + S * 0.032,
    b.back1 + S * 0.055,
  );
  ctx.stroke();
}

// an old trunk on the bench: worn leather, brass corners, a fleur-de-lis clasp
function paintChest(ctx, L) {
  const { S } = L;
  const c = L.chest;
  const w = c.x1 - c.x0;
  const h = c.bot - c.top;
  soft(ctx, c.x0 + w * 0.6, c.bot, w * 0.6, S * 0.02, "0,0,0", 0.7);
  const g = ctx.createLinearGradient(0, c.top, 0, c.bot);
  g.addColorStop(0, "#4a3022");
  g.addColorStop(1, "#1a100a");
  ctx.fillStyle = g;
  rrect(ctx, c.x0, c.top, w, h, S * 0.012);
  ctx.fill();
  // its lid, rounded, catching the lamp along its top
  const lid = ctx.createLinearGradient(0, c.top, 0, c.top + h * 0.3);
  lid.addColorStop(0, "#6a4630");
  lid.addColorStop(1, "#2a1a10");
  ctx.fillStyle = lid;
  rrect(ctx, c.x0, c.top, w, h * 0.3, S * 0.02);
  ctx.fill();
  ctx.fillStyle = "rgba(255,210,160,0.25)";
  ctx.fillRect(c.x0 + S * 0.01, c.top + 2, w - S * 0.02, 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(c.x0, c.top + h * 0.28, w, h * 0.04);
  // two leather straps
  for (const fx of [0.12, 0.6]) {
    ctx.fillStyle = "#24140a";
    ctx.fillRect(c.x0 + w * fx, c.top, w * 0.06, h);
    ctx.fillStyle = "rgba(255,200,150,0.12)";
    ctx.fillRect(c.x0 + w * fx, c.top, 1, h);
  }
  const brass = (x, y, bw, bh) => {
    const bg = ctx.createLinearGradient(x, y, x + bw, y + bh);
    bg.addColorStop(0, "#f0d08a");
    bg.addColorStop(1, "#6a4a1a");
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, bw, bh);
  };
  const cs = S * 0.03;
  brass(c.x1 - cs, c.top, cs, cs);
  brass(c.x1 - cs, c.bot - cs, cs, cs);
  brass(c.x0 + w * 0.78, c.top + h * 0.22, S * 0.05, S * 0.07);
  ctx.fillStyle = "#3a2a10";
  ctx.font = `${Math.round(S * 0.05)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚜", c.x0 + w * 0.78 + S * 0.025, c.top + h * 0.22 + S * 0.035);
  ctx.fillStyle = "rgba(255,220,170,0.3)";
  ctx.fillRect(c.x0, c.top, w, 1.5);
}

// the clock on the bench, standing at midnight: a mahogany mantel clock with
// a rising arched top, a brass bezel round a white enamel face, XII in red,
// and on a brass plate below it: READ THE RED
function paintClock(ctx, L) {
  const { S } = L;
  const c = L.clock;
  const f = c.face;
  const x0 = c.x - c.w / 2;
  const x1 = c.x + c.w / 2;
  const y0 = c.base - c.h;
  soft(ctx, c.x + c.w * 0.1, c.base, c.w * 0.62, S * 0.018, "0,0,0", 0.85);
  soft(ctx, c.x, f.y, c.w * 0.9, c.h * 0.9, WARM, 0.1, "lighter");
  // the plinth
  const plinth = ctx.createLinearGradient(0, c.base - c.h * 0.08, 0, c.base);
  plinth.addColorStop(0, "#6a2e18");
  plinth.addColorStop(1, "#200a04");
  ctx.fillStyle = plinth;
  rrect(
    ctx,
    x0 - c.w * 0.03,
    c.base - c.h * 0.08,
    c.w * 1.06,
    c.h * 0.08,
    c.h * 0.02,
  );
  ctx.fill();
  // the case: low at the ends, rising in a soft arch over the face
  ctx.beginPath();
  ctx.moveTo(x0, c.base - c.h * 0.08);
  ctx.lineTo(x0, c.base - c.h * 0.42);
  ctx.bezierCurveTo(
    x0 + c.w * 0.05,
    c.base - c.h * 0.55,
    x0 + c.w * 0.2,
    c.base - c.h * 0.6,
    c.x - c.w * 0.26,
    y0 + c.h * 0.12,
  );
  ctx.bezierCurveTo(
    c.x - c.w * 0.18,
    y0 - c.h * 0.02,
    c.x + c.w * 0.18,
    y0 - c.h * 0.02,
    c.x + c.w * 0.26,
    y0 + c.h * 0.12,
  );
  ctx.bezierCurveTo(
    x1 - c.w * 0.2,
    c.base - c.h * 0.6,
    x1 - c.w * 0.05,
    c.base - c.h * 0.55,
    x1,
    c.base - c.h * 0.42,
  );
  ctx.lineTo(x1, c.base - c.h * 0.08);
  ctx.closePath();
  const wood = ctx.createLinearGradient(x0, y0, x1, c.base);
  wood.addColorStop(0, "#8a3e1e");
  wood.addColorStop(0.45, "#5a2210");
  wood.addColorStop(1, "#1e0904");
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // its grain, and the lamp's gleam along its curve
  const rnd = lcg(91);
  for (let i = 0; i < 26; i++) {
    const yy = y0 + rnd() * c.h;
    ctx.strokeStyle =
      rnd() < 0.7 ? "rgba(20,6,2,0.25)" : "rgba(255,170,120,0.08)";
    ctx.lineWidth = 0.8 + rnd();
    ctx.beginPath();
    ctx.moveTo(x0, yy);
    ctx.bezierCurveTo(
      c.x - c.w * 0.2,
      yy - c.h * 0.05,
      c.x + c.w * 0.2,
      yy + c.h * 0.05,
      x1,
      yy,
    );
    ctx.stroke();
  }
  soft(
    ctx,
    c.x - c.w * 0.22,
    y0 + c.h * 0.2,
    c.w * 0.25,
    c.h * 0.1,
    "255,220,170",
    0.3,
    "lighter",
  );
  ctx.restore();
  ctx.strokeStyle = "rgba(255,200,150,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(c.x - c.w * 0.26, y0 + c.h * 0.12);
  ctx.bezierCurveTo(
    c.x - c.w * 0.18,
    y0 - c.h * 0.02,
    c.x + c.w * 0.18,
    y0 - c.h * 0.02,
    c.x + c.w * 0.26,
    y0 + c.h * 0.12,
  );
  ctx.stroke();
  // the brass bezel and the face
  const brass = (gx0, gx1) => {
    const g = ctx.createLinearGradient(gx0, 0, gx1, 0);
    g.addColorStop(0, "#6a4a1a");
    g.addColorStop(0.3, "#f6dc9a");
    g.addColorStop(0.55, "#c8a050");
    g.addColorStop(1, "#4a3010");
    return g;
  };
  ctx.fillStyle = brass(f.x - f.r * 1.2, f.x + f.r * 1.2);
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r * 1.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,40,10,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r * 1.04, 0, Math.PI * 2);
  ctx.stroke();
  const fg = ctx.createRadialGradient(
    f.x - f.r * 0.3,
    f.y - f.r * 0.3,
    f.r * 0.1,
    f.x,
    f.y,
    f.r,
  );
  fg.addColorStop(0, "#fffaf0");
  fg.addColorStop(1, "#e2d8c2");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
  ctx.fill();
  // the numerals: XII in red
  const nums = [
    "XII",
    "I",
    "II",
    "III",
    "IIII",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
  ];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  nums.forEach((n, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const rr = f.r * 0.78;
    ctx.save();
    ctx.translate(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = i === 0 ? "#c4161c" : "#2a2016";
    ctx.font = `${i === 0 ? "bold " : ""}${(f.r * (i === 0 ? 0.24 : 0.16)).toFixed(1)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(n, 0, 0);
    ctx.restore();
  });
  ctx.strokeStyle = "rgba(40,30,20,0.55)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = f.r * (i % 5 ? 0.92 : 0.88);
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0);
    ctx.lineTo(f.x + Math.cos(a) * f.r * 0.97, f.y + Math.sin(a) * f.r * 0.97);
    ctx.stroke();
  }
  // the hands, both on twelve: midnight (the second hand is the scene's)
  ctx.strokeStyle = "#1a120a";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2.5, f.r * 0.08);
  ctx.beginPath();
  ctx.moveTo(f.x, f.y + f.r * 0.1);
  ctx.lineTo(f.x, f.y - f.r * 0.5);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.8, f.r * 0.05);
  ctx.beginPath();
  ctx.moveTo(f.x, f.y + f.r * 0.12);
  ctx.lineTo(f.x, f.y - f.r * 0.74);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(
    f.x - f.r * 0.35,
    f.y - f.r * 0.42,
    f.r * 0.38,
    f.r * 0.14,
    -0.6,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // the brass plate: READ THE RED, engraved
  const p = c.plate;
  ctx.fillStyle = brass(p.x - p.w / 2, p.x + p.w / 2);
  rrect(ctx, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, p.h * 0.25);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,40,10,0.7)";
  ctx.lineWidth = 1;
  rrect(ctx, p.x - p.w / 2 + 2, p.y - p.h / 2 + 2, p.w - 4, p.h - 4, p.h * 0.2);
  ctx.stroke();
  ctx.font = `${(p.h * 0.58).toFixed(1)}px ${FW_FONT}`;
  ctx.fillStyle = "rgba(255,240,200,0.5)";
  ctx.fillText("READ THE RED", p.x + 0.8, p.y + 1.2);
  ctx.fillStyle = "#5a1010";
  ctx.fillText("READ THE RED", p.x, p.y);
  // the brass feet
  for (const fx of [x0 + c.w * 0.08, x1 - c.w * 0.08]) {
    ctx.fillStyle = brass(fx - c.w * 0.04, fx + c.w * 0.04);
    ctx.beginPath();
    ctx.ellipse(fx, c.base, c.w * 0.045, c.h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// a red rose lying on the bench, a few petals fallen
function paintRose(ctx, L) {
  const { S } = L;
  const c = L.clock;
  const x = c.x - c.w * 0.62;
  const y = L.bench.seat - S * 0.012;
  ctx.strokeStyle = "#1e3a1e";
  ctx.lineWidth = Math.max(1.5, S * 0.004);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + S * 0.04, y + S * 0.01, x + S * 0.08, y + S * 0.03);
  ctx.stroke();
  leaf(ctx, x + S * 0.03, y + S * 0.01, S * 0.015, 0.4, false);
  bloom(ctx, x, y - S * 0.01, S * 0.03, "160,20,40");
  for (const [dx, dy, a] of [
    [-0.06, 0.03, 0.4],
    [0.12, 0.04, -0.3],
    [-0.12, 0.06, 1.2],
  ]) {
    ctx.save();
    ctx.translate(x + dx * S, y + dy * S);
    ctx.rotate(a);
    ctx.fillStyle = "rgba(230,160,170,0.85)";
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.012, S * 0.006, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function finish(ctx, L) {
  const { W, H } = L;
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W * 0.55,
    H * 0.42,
    R * 0.4,
    W * 0.55,
    H * 0.45,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(4,2,8,0)");
  v.addColorStop(1, "rgba(4,2,8,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ── small painted things ────────────────────────────────────────────────────

function leaf(ctx, x, y, s, a, light) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = light ? "#3e5a34" : "#1e3220";
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.quadraticCurveTo(0, -s * 0.6, s, 0);
  ctx.quadraticCurveTo(0, s * 0.6, -s, 0);
  ctx.fill();
  ctx.restore();
}

function bloom(ctx, x, y, r, rgb) {
  for (let k = 0; k < 4; k++) {
    const rr = r * (1 - k * 0.22);
    const g = ctx.createRadialGradient(
      x - rr * 0.2,
      y - rr * 0.3,
      rr * 0.1,
      x,
      y,
      rr,
    );
    g.addColorStop(0, `rgb(${mix(rgb, 1.35)})`);
    g.addColorStop(1, `rgb(${mix(rgb, 0.7 + k * 0.1)})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(
      x + (k % 2 ? rr * 0.1 : -rr * 0.1),
      y + k * rr * 0.05,
      rr,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(${mix(rgb, 0.5)},0.6)`;
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0.5, 4.5);
  ctx.stroke();
}

function roses(ctx, cx, cy, spread, n, seed) {
  const rnd = lcg(seed);
  for (let i = 0; i < n * 3; i++)
    leaf(
      ctx,
      cx + (rnd() - 0.5) * spread * 2,
      cy + (rnd() - 0.5) * spread,
      spread * 0.12,
      rnd() * 6,
      rnd() < 0.3,
    );
  for (let i = 0; i < n; i++) {
    bloom(
      ctx,
      cx + (rnd() - 0.5) * spread * 1.8,
      cy + (rnd() - 0.5) * spread * 0.9,
      spread * (0.1 + rnd() * 0.06),
      rnd() < 0.7 ? "232,170,160" : "250,215,200",
    );
  }
}

function paintGlint() {
  const c = makeCanvas(32, 32);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 8);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  g.strokeStyle = "rgba(255,255,255,0.8)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(16, 2);
  g.lineTo(16, 30);
  g.moveTo(2, 16);
  g.lineTo(30, 16);
  g.stroke();
  return c;
}

function mix(rgb, k) {
  return rgb
    .split(",")
    .map((v) => Math.max(0, Math.min(255, Math.round(+v * k))))
    .join(",");
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function soft(ctx, cx, cy, rx, ry, rgbs, a, op = "source-over") {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgbs},${a})`);
  g.addColorStop(0.45, `rgba(${rgbs},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgbs},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function radial(size, rgbs, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgbs},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function add(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  return textures.addCanvas(key, canvas);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
