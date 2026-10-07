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
  L.river = { y0: H * 0.5, y1: H * 0.92 };
  L.coping = H * 0.745; // the top of the terrace's balustrade
  L.tower = { x: W * 0.54, top: H * 0.055, base: H * 0.505 };
  L.moon = { x: W * 0.84, y: H * 0.08, r: S * 0.024 };
  L.bridge = { x0: W * 0.43, x1: W * 1.02, y: H * 0.525 };
  L.wall = { x0: W * 0.2, x1: W * 0.5, top: H * 0.56 };
  L.rail = { x0: W * 0.47, x1: W * 0.935, top: H * 0.655, bot: H * 0.885 };
  L.bench = { x1: W * 0.52, back0: H * 0.575, back1: H * 0.76, seat: H * 0.86 };
  L.chest = { x0: -W * 0.01, x1: W * 0.2, top: H * 0.74, bot: H * 0.95 };
  const cw = Math.min(W * 0.2, H * 0.33);
  L.clock = { x: W * 0.3, base: L.coping - H * 0.006, w: cw, h: cw * 0.78 };
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
  L.lamp = { x: W * 0.07, y: H * 0.16, post: H };
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
  paintBalustrade(ctx, L);
  paintLamp(ctx, L);
  paintPlanter(ctx, L);
  paintClock(ctx, L);
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

// ── the terrace ─────────────────────────────────────────────────────────────

// The terrace's stone balustrade along the bottom of the picture: a broad
// coping, a row of turned balusters with the river between them, square
// piers at intervals, a base rail; warm where the lamp reaches, the moon
// pale along the top.
function paintBalustrade(ctx, L) {
  const { W, H, S } = L;
  const top = L.coping;
  const cH = H * 0.034; // the coping's face
  const lid = H * 0.014; // its top, seen from just above
  const baseY = H * 0.905;
  const railH = H * 0.03;
  const stone = (y0, y1, k = 1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgb(${Math.round(118 * k)},${Math.round(106 * k)},${Math.round(100 * k)})`);
    g.addColorStop(1, `rgb(${Math.round(52 * k)},${Math.round(44 * k)},${Math.round(48 * k)})`);
    return g;
  };
  // the balusters, each a turned vase shape, the river showing between
  const bTop = top + cH;
  const bH = baseY - bTop;
  const step = Math.max(26, S * 0.05);
  const piers = [0.17, 0.5, 0.83].map((f) => W * f);
  const pierW = step * 1.15;
  for (let x = step / 2; x < W + step; x += step) {
    if (piers.some((p) => Math.abs(x - p) < pierW * 0.9)) continue;
    const r = step * 0.3;
    soft(ctx, x + r * 0.5, bTop + bH * 0.6, r * 1.2, bH * 0.5, "0,0,0", 0.25);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, bTop);
    ctx.lineTo(x + r * 0.55, bTop);
    ctx.lineTo(x + r * 0.4, bTop + bH * 0.08);
    ctx.bezierCurveTo(x + r * 0.25, bTop + bH * 0.22, x + r * 1.1, bTop + bH * 0.45, x + r * 1.0, bTop + bH * 0.7);
    ctx.quadraticCurveTo(x + r * 0.9, bTop + bH * 0.86, x + r * 0.5, bTop + bH * 0.9);
    ctx.lineTo(x + r * 0.62, baseY);
    ctx.lineTo(x - r * 0.62, baseY);
    ctx.lineTo(x - r * 0.5, bTop + bH * 0.9);
    ctx.quadraticCurveTo(x - r * 0.9, bTop + bH * 0.86, x - r * 1.0, bTop + bH * 0.7);
    ctx.bezierCurveTo(x - r * 1.1, bTop + bH * 0.45, x - r * 0.25, bTop + bH * 0.22, x - r * 0.4, bTop + bH * 0.08);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, "#8a7c74");
    g.addColorStop(0.45, "#5e5254");
    g.addColorStop(1, "#241e24");
    ctx.fillStyle = g;
    ctx.fill();
  }
  // the piers
  for (const p of piers) {
    const g = ctx.createLinearGradient(p - pierW / 2, 0, p + pierW / 2, 0);
    g.addColorStop(0, "#857668");
    g.addColorStop(0.6, "#5a4e4c");
    g.addColorStop(1, "#2a2228");
    ctx.fillStyle = g;
    ctx.fillRect(p - pierW / 2, bTop, pierW, baseY - bTop);
    ctx.strokeStyle = "rgba(40,30,26,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(p - pierW * 0.36, bTop + bH * 0.14, pierW * 0.72, bH * 0.7);
  }
  // the base rail and the coping over all
  ctx.fillStyle = stone(baseY, baseY + railH, 0.8);
  ctx.fillRect(0, baseY, W, railH);
  ctx.fillStyle = stone(top, top + cH);
  ctx.fillRect(0, top, W, cH);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, top + cH, W, Math.max(2, H * 0.005));
  const lg = ctx.createLinearGradient(0, top - lid, 0, top);
  lg.addColorStop(0, "#a89a8c");
  lg.addColorStop(1, "#7a6e66");
  ctx.fillStyle = lg;
  ctx.fillRect(0, top - lid, W, lid);
  ctx.fillStyle = "rgba(200,215,255,0.25)";
  ctx.fillRect(0, top - lid, W, Math.max(1, H * 0.002));
  // the stone's joints along the coping
  ctx.strokeStyle = "rgba(60,46,40,0.4)";
  ctx.lineWidth = 1;
  for (const p of piers) {
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(p + (d * pierW) / 2, top - lid);
      ctx.lineTo(p + (d * pierW) / 2, top + cH);
      ctx.stroke();
    }
  }
  // the terrace's flagstones below
  const fl = ctx.createLinearGradient(0, baseY + railH, 0, H);
  fl.addColorStop(0, "#2a2226");
  fl.addColorStop(1, "#16121a");
  ctx.fillStyle = fl;
  ctx.fillRect(0, baseY + railH, W, H - baseY - railH);
  // the lamp's warmth on the stone
  soft(ctx, L.lamp.x + W * 0.08, top + H * 0.05, W * 0.3, H * 0.2, WARM, 0.3, "lighter");
  soft(ctx, L.clock.x, top + H * 0.02, L.clock.w * 1.3, H * 0.08, WARM, 0.22, "lighter");
}

// the street lamp at the left: a slender iron post on a heavy base, its
// lantern glowing
function paintLamp(ctx, L) {
  const { H, S } = L;
  const l = L.lamp;
  soft(ctx, l.x, l.y, S * 0.35, S * 0.35, WARM, 0.32, "lighter");
  ctx.fillStyle = "#0c0a0e";
  ctx.beginPath();
  ctx.moveTo(l.x - S * 0.03, H);
  ctx.lineTo(l.x - S * 0.022, H - S * 0.07);
  ctx.quadraticCurveTo(l.x, H - S * 0.1, l.x + S * 0.022, H - S * 0.07);
  ctx.lineTo(l.x + S * 0.03, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(l.x - S * 0.0075, l.y + S * 0.06, S * 0.015, H - S * 0.09 - l.y - S * 0.06);
  ctx.fillRect(l.x - S * 0.014, (l.y + H) / 2, S * 0.028, S * 0.012);
  ctx.fillRect(l.x - S * 0.035, l.y + S * 0.085, S * 0.07, S * 0.006);
  ctx.fillStyle = "rgba(255,210,150,0.25)";
  ctx.fillRect(l.x + S * 0.003, l.y + S * 0.07, S * 0.003, H - S * 0.18 - l.y);
  ctx.fillStyle = "#0c0a0e";
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

// a terracotta pot of red geraniums on the coping
function paintPlanter(ctx, L) {
  const { W, S } = L;
  const x = W * 0.85;
  const y = L.coping - S * 0.014;
  const pw = S * 0.07;
  const ph = S * 0.05;
  soft(ctx, x + pw * 0.2, y, pw * 0.8, S * 0.01, "0,0,0", 0.6);
  const g = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
  g.addColorStop(0, "#c86a3c");
  g.addColorStop(0.6, "#8a3e20");
  g.addColorStop(1, "#4a1e10");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - pw / 2, y - ph);
  ctx.lineTo(x + pw / 2, y - ph);
  ctx.lineTo(x + pw * 0.38, y);
  ctx.lineTo(x - pw * 0.38, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9a4a26";
  ctx.fillRect(x - pw * 0.55, y - ph - S * 0.008, pw * 1.1, S * 0.01);
  const rnd = lcg(404);
  for (let i = 0; i < 16; i++) {
    leaf(ctx, x + (rnd() - 0.5) * pw * 1.1, y - ph - rnd() * S * 0.035, S * 0.012, rnd() * Math.PI * 2, rnd() < 0.3);
  }
  for (let i = 0; i < 5; i++) {
    bloom(ctx, x + (rnd() - 0.5) * pw * 0.9, y - ph - S * 0.02 - rnd() * S * 0.03, S * 0.012, "210,40,50");
  }
}
