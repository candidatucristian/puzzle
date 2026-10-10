/** The city for PI, painted as a real night rather than a sketch: a river
 *  city asleep under the moon — a hazy skyline far off, dark towers, a
 *  suspension bridge, a quay with its railing and trees, the water holding
 *  it all upside down — and in front, the one building still awake.
 *
 *  Painted once per screen size onto one canvas, with every window of the
 *  counting building dark. What lives stays out of the painting: the scene
 *  lights windows (one small interior per window, `windows[f][c].key`), with
 *  their glow on the facade and their streak on the water; the stars that
 *  twinkle; the boat; and the line across the moon. */

const CITY = "pi_city";
const GLOW = "pi_glow";
const STREAK = "pi_streak";
const STAR = "pi_star";
const BOAT = "pi_boat";
const WIN = "pi_win_";
const VARIANTS = 6;

export function paintCity(scene, W, H, floors, cols) {
  const L = layout(W, H, floors, cols);
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  paintSky(ctx, L, lcg(7552));
  paintMoon(ctx, L, lcg(3113));
  paintClouds(ctx, L, lcg(4242));
  paintFarCity(ctx, L, lcg(4111));
  L.blocks.forEach((b, i) => paintBlock(ctx, L, b, lcg(6226 + i * 31)));
  paintHero(ctx, L, lcg(9449));
  paintQuay(ctx, L, lcg(5335));
  paintWater(ctx, cv, L, lcg(7717));
  paintBridge(ctx, L, lcg(5336));
  finish(ctx, L);

  const t = scene.textures;
  addCanvas(t, CITY, cv);
  const ww = Math.max(4, Math.round(L.win.w));
  const wh = Math.max(4, Math.round(L.win.h));
  for (let v = 0; v < VARIANTS; v++)
    addCanvas(t, WIN + v, paintInterior(ww, wh, v, lcg(1000 + v * 17)));
  addCanvas(
    t,
    GLOW,
    radial(64, "255,196,120", [
      [0, 0.55],
      [0.35, 0.18],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    STAR,
    radial(16, "235,240,255", [
      [0, 1],
      [0.25, 0.5],
      [1, 0],
    ]),
  );
  addCanvas(t, STREAK, paintStreak(lcg(2020)));
  const boat = paintBoat(L.S);
  addCanvas(t, BOAT, boat.canvas);

  return {
    city: CITY,
    glow: GLOW,
    star: STAR,
    streak: STREAK,
    moon: L.moon,
    waterY: L.waterY,
    skyAt: (x, y) =>
      y < L.roof[Math.max(0, Math.min(W - 1, Math.floor(x)))] - 4,
    windows: L.windows.map((row, f) =>
      row.map((w, c) => ({
        ...w,
        key: WIN + (((hash2(f, c) * VARIANTS) | 0) % VARIANTS),
        // where its light falls on the water (the river mirrors it)
        streak:
          2 * L.waterY - w.y < H - 4
            ? { x: w.x, y: 2 * L.waterY - w.y - w.h / 2 }
            : null,
      })),
    ),
    boat: {
      key: BOAT,
      y: L.boatY,
      originX: boat.originX,
      w: boat.canvas.width,
      h: boat.canvas.height,
    },
  };
}

export function releaseCityArt(textures) {
  const keys = [CITY, GLOW, STREAK, STAR, BOAT];
  for (let v = 0; v < VARIANTS; v++) keys.push(WIN + v);
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

// ── layout: the same places the level has always had ───────────────────────

function layout(W, H, floors, cols) {
  const S = Math.min(W, H);
  const groundY = H * 0.72;
  const waterY = H * 0.8;
  const moon = { x: W * 0.79, y: H * 0.14, r: S * 0.048 };
  // the counting building: never so narrow its windows can't be counted
  const bw = Math.min(W * 0.6, Math.max(W * 0.23, H * 0.3));
  const bx = W * 0.435 - bw / 2;
  const floorH = H * 0.056;
  const bh = floors * floorH + H * 0.02;
  const hero = { x: bx, y: groundY - bh, w: bw, h: bh, floorH };
  const winW = bw / (cols + 2.6);
  const winH = floorH * 0.48;
  const x0 = bx + (bw - cols * winW * 1.18) / 2 + winW * 0.09;
  const windows = [];
  for (let f = 0; f < floors; f++) {
    const rowY = hero.y + H * 0.014 + f * floorH + floorH * 0.2;
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        x: x0 + c * winW * 1.18 + winW / 2,
        y: rowY + winH / 2,
        w: winW,
        h: winH,
      });
    }
    windows.push(row);
  }
  const blocks = [
    { x: 0.06, w: 0.1, h: 0.3 },
    { x: 0.175, w: 0.08, h: 0.42 },
    { x: 0.56, w: 0.09, h: 0.34 },
    { x: 0.66, w: 0.11, h: 0.48 },
    { x: 0.86, w: 0.09, h: 0.38 },
  ].map((b) => ({ x: W * b.x, w: W * b.w, h: H * b.h, y: groundY - H * b.h }));
  const deckY = waterY + (H - waterY) * 0.3;
  const bridge = {
    a: W * 0.58,
    b: W * 0.995,
    deckY,
    t1: W * 0.68,
    t2: W * 0.9,
    towerTop: deckY - H * 0.085,
    pierY: deckY + H * 0.03,
  };
  const roof = new Float32Array(Math.ceil(W)).fill(groundY);
  return {
    W,
    H,
    S,
    groundY,
    waterY,
    moon,
    hero,
    win: { w: winW, h: winH },
    windows,
    blocks,
    bridge,
    boatY: waterY + (H - waterY) * 0.55,
    roof,
  };
}

// something stands up to y between x0 and x1: no twinkling star in front of it
function claim(L, x0, x1, y) {
  for (
    let x = Math.max(0, Math.floor(x0));
    x < Math.min(L.roof.length, Math.ceil(x1));
    x++
  ) {
    L.roof[x] = Math.min(L.roof[x], y);
  }
}

// ── the sky ─────────────────────────────────────────────────────────────────

function paintSky(ctx, L, rnd) {
  const { W, H, groundY, moon } = L;
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, "#04070f");
  g.addColorStop(0.55, "#0a1122");
  g.addColorStop(1, "#18203a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // what little light a sleeping city still gives the sky
  softEllipse(ctx, W / 2, groundY, W * 0.8, H * 0.22, "70,80,118", 0.2);
  softEllipse(
    ctx,
    moon.x,
    moon.y,
    moon.r * 10,
    moon.r * 10,
    "140,160,215",
    0.12,
  );
  softEllipse(
    ctx,
    moon.x,
    moon.y,
    moon.r * 3.2,
    moon.r * 3.2,
    "185,200,240",
    0.16,
  );
  const n = Math.round((W * H) / 3200);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * groundY * 0.9;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 3) continue;
    const a = (0.12 + rnd() * 0.5) * (1 - y / groundY);
    ctx.fillStyle = `rgba(225,232,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.35 + rnd() * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintMoon(ctx, L, rnd) {
  const { x, y, r } = L.moon;
  ctx.save();
  ctx.shadowColor = "rgba(200,215,255,0.6)";
  ctx.shadowBlur = r * 1.3;
  const body = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.3,
    r * 0.1,
    x,
    y,
    r,
  );
  body.addColorStop(0, "#f5f1e6");
  body.addColorStop(0.7, "#e3ddcc");
  body.addColorStop(1, "#bcb4a0");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  // the seas, and a scatter of craters
  for (const [dx, dy, rx, ry, a] of [
    [-0.28, -0.2, 0.34, 0.26, 0.24],
    [0.18, -0.32, 0.22, 0.18, 0.2],
    [0.25, 0.1, 0.3, 0.22, 0.22],
    [-0.05, 0.38, 0.22, 0.14, 0.16],
    [-0.42, 0.22, 0.16, 0.2, 0.15],
  ])
    softEllipse(ctx, x + dx * r, y + dy * r, rx * r, ry * r, "104,106,116", a);
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r * 0.82;
    const cx = x + Math.cos(a) * d;
    const cy = y + Math.sin(a) * d;
    const cr = r * (0.04 + rnd() * 0.07);
    ctx.fillStyle = "rgba(95,95,100,0.22)";
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,245,0.22)";
    ctx.lineWidth = Math.max(0.6, cr * 0.25);
    ctx.beginPath();
    ctx.arc(cx, cy, cr * 0.85, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  const limb = ctx.createRadialGradient(x, y, r * 0.65, x, y, r);
  limb.addColorStop(0, "rgba(60,55,50,0)");
  limb.addColorStop(1, "rgba(60,55,50,0.38)");
  ctx.fillStyle = limb;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// thin clouds, silvered where they pass near the moon
function paintClouds(ctx, L, rnd) {
  const { W, H, moon } = L;
  const bands = [[moon.x - W * 0.04, moon.y + moon.r * 0.55, W * 0.16]];
  for (let i = 0; i < 4; i++)
    bands.push([rnd() * W, H * (0.06 + rnd() * 0.3), W * (0.1 + rnd() * 0.2)]);
  for (const [cx, cy, len] of bands) {
    for (let k = 0; k < 16; k++) {
      const px = cx + (rnd() - 0.5) * len;
      const py = cy + (rnd() - 0.5) * H * 0.018;
      const near = Math.exp(
        -((px - moon.x) ** 2 + (py - moon.y) ** 2) / (2 * (W * 0.16) ** 2),
      );
      softEllipse(
        ctx,
        px,
        py,
        W * (0.025 + rnd() * 0.045),
        H * (0.005 + rnd() * 0.01),
        "125,140,178",
        0.04 + 0.12 * near,
      );
    }
  }
}

// ── the city ────────────────────────────────────────────────────────────────

// far off, hazy: just shapes against the sky
function paintFarCity(ctx, L, rnd) {
  const { W, H, groundY } = L;
  let x = -10;
  while (x < W) {
    const w = W * (0.022 + rnd() * 0.05);
    const h = H * (0.06 + rnd() * 0.17);
    const top = groundY - h;
    const g = ctx.createLinearGradient(0, top, 0, groundY);
    g.addColorStop(0, "#10162a");
    g.addColorStop(1, "#161d33");
    ctx.fillStyle = g;
    ctx.fillRect(x, top, w + 1, h + 2);
    claim(L, x, x + w + 1, top);
    if (rnd() < 0.3) {
      const ax = x + w * (0.3 + rnd() * 0.4);
      const ah = H * (0.015 + rnd() * 0.03);
      ctx.fillRect(ax, top - ah, Math.max(1, L.S * 0.0015), ah);
      claim(L, ax - 1, ax + 2, top - ah);
    }
    x += w * (0.7 + rnd() * 0.5);
  }
  const hz = ctx.createLinearGradient(0, groundY - H * 0.25, 0, groundY);
  hz.addColorStop(0, "rgba(55,66,100,0)");
  hz.addColorStop(1, "rgba(55,66,100,0.32)");
  ctx.fillStyle = hz;
  ctx.fillRect(0, groundY - H * 0.25, W, H * 0.25);
}

// a dark tower, every window dead, the moon along its right edge
function paintBlock(ctx, L, b, rnd) {
  const { x, y, w, h } = b;
  const { S } = L;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#131824");
  g.addColorStop(1, "#0b0e15");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  claim(L, x, x + w, y);
  const rows = Math.max(4, Math.round(h / (S * 0.05)));
  const cols = Math.max(3, Math.round(w / (S * 0.032)));
  const fh = h / rows;
  const cw = (w * 0.76) / cols;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = "rgba(150,165,205,0.05)";
    ctx.fillRect(x, y + r * fh, w, Math.max(1, S * 0.0012));
    for (let c = 0; c < cols; c++) {
      if (rnd() < 0.18) continue;
      const wx = x + w * 0.12 + c * cw + cw * 0.18;
      const wy = y + r * fh + fh * 0.28;
      const sky = rnd() < 0.16; // a pane that still catches the sky
      const gg = ctx.createLinearGradient(0, wy, 0, wy + fh * 0.46);
      gg.addColorStop(0, sky ? "#1c2438" : "#0e121c");
      gg.addColorStop(1, "#080a10");
      ctx.fillStyle = gg;
      ctx.fillRect(wx, wy, cw * 0.64, fh * 0.46);
    }
  }
  ctx.fillStyle = "rgba(150,172,218,0.2)";
  ctx.fillRect(x + w - Math.max(1, S * 0.0018), y, Math.max(1, S * 0.0018), h);
  ctx.fillStyle = "rgba(150,172,218,0.24)";
  ctx.fillRect(x, y, w, Math.max(1, S * 0.0016));
  // what stands on its roof
  const kind = rnd();
  const rx = x + w * (0.22 + rnd() * 0.4);
  if (kind < 0.45) {
    const tw = S * 0.022;
    const th = S * 0.024;
    const legs = S * 0.012;
    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(rx - tw * 0.45, y - legs, Math.max(1, S * 0.0015), legs);
    ctx.fillRect(rx + tw * 0.4, y - legs, Math.max(1, S * 0.0015), legs);
    ctx.fillRect(rx - tw / 2, y - legs - th, tw, th);
    ctx.beginPath();
    ctx.moveTo(rx - tw / 2 - 1, y - legs - th);
    ctx.lineTo(rx, y - legs - th - tw * 0.4);
    ctx.lineTo(rx + tw / 2 + 1, y - legs - th);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(150,172,218,0.22)";
    ctx.fillRect(rx + tw / 2 - 1, y - legs - th, 1, th);
    claim(L, rx - tw / 2, rx + tw / 2, y - legs - th - tw * 0.4);
  } else if (kind < 0.8) {
    const ah = S * (0.04 + rnd() * 0.04);
    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(rx, y - ah, Math.max(1, S * 0.002), ah);
    ctx.fillRect(
      rx - S * 0.006,
      y - ah * 0.7,
      S * 0.012 + 1,
      Math.max(1, S * 0.0015),
    );
    claim(L, rx - S * 0.006, rx + S * 0.008, y - ah);
  } else {
    const bw = w * 0.3;
    const bh = S * 0.018;
    ctx.fillStyle = "#0d1017";
    ctx.fillRect(rx - bw / 2, y - bh, bw, bh);
    ctx.fillStyle = "rgba(150,172,218,0.2)";
    ctx.fillRect(rx - bw / 2, y - bh, bw, 1);
    claim(L, rx - bw / 2, rx + bw / 2, y - bh);
  }
}

// the one building awake: concrete, floor slabs, ten windows a floor (all
// painted dark here — the scene lights them)
function paintHero(ctx, L, rnd) {
  const { x, y, w, h, floorH } = L.hero;
  const { H, S, win } = L;
  claim(L, x - w * 0.01, x + w * 1.01, y - H * 0.01);
  const body = ctx.createLinearGradient(x, 0, x + w, 0);
  body.addColorStop(0, "#1b1f28");
  body.addColorStop(1, "#242a36");
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  const dusk = ctx.createLinearGradient(0, y, 0, y + h);
  dusk.addColorStop(0, "rgba(0,0,0,0)");
  dusk.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = dusk;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < (w * h) / 40; i++) {
    ctx.fillStyle =
      rnd() < 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const pil = w * 0.035;
  ctx.fillStyle = "#1f242e";
  ctx.fillRect(x, y, pil, h);
  ctx.fillStyle = "#2b313d";
  ctx.fillRect(x + w - pil, y, pil, h);
  // the slabs between the floors
  const floors = L.windows.length;
  for (let f = 0; f <= floors; f++) {
    const sy = y + H * 0.014 + f * floorH - floorH * 0.08;
    ctx.fillStyle = "#2a2f3a";
    ctx.fillRect(x, sy, w, floorH * 0.1);
    ctx.fillStyle = "rgba(165,180,215,0.12)";
    ctx.fillRect(x, sy, w, 1);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x, sy + floorH * 0.1, w, Math.max(1, floorH * 0.04));
  }
  // the windows: a frame, dark glass that keeps a little of the sky, a sill
  const fr = Math.max(1, win.w * 0.09);
  for (const row of L.windows) {
    for (const wd of row) {
      const gx = wd.x - wd.w / 2;
      const gy = wd.y - wd.h / 2;
      ctx.fillStyle = "#333945";
      ctx.fillRect(gx - fr, gy - fr, wd.w + 2 * fr, wd.h + 2 * fr);
      const glass = ctx.createLinearGradient(0, gy, 0, gy + wd.h);
      glass.addColorStop(0, "#131a2a");
      glass.addColorStop(1, "#05070c");
      ctx.fillStyle = glass;
      ctx.fillRect(gx, gy, wd.w, wd.h);
      if (rnd() < 0.3) {
        // curtains drawn
        ctx.fillStyle = "rgba(20,22,30,0.8)";
        ctx.fillRect(gx, gy, wd.w, wd.h);
        ctx.fillStyle = "rgba(255,255,255,0.025)";
        for (let k = 1; k < 5; k++)
          ctx.fillRect(gx + (wd.w * k) / 5, gy, 1, wd.h);
      }
      ctx.fillStyle = "rgba(160,178,220,0.07)";
      ctx.beginPath();
      ctx.moveTo(gx + wd.w * 0.15, gy);
      ctx.lineTo(gx + wd.w * 0.45, gy);
      ctx.lineTo(gx + wd.w * 0.2, gy + wd.h);
      ctx.lineTo(gx - wd.w * 0.1, gy + wd.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(20,24,32,1)";
      ctx.fillRect(
        wd.x - Math.max(0.5, wd.w * 0.035),
        gy,
        Math.max(1, wd.w * 0.07),
        wd.h,
      );
      ctx.fillStyle = "rgba(170,182,210,0.2)";
      ctx.fillRect(
        gx - fr,
        gy + wd.h + fr,
        wd.w + 2 * fr,
        Math.max(1, wd.h * 0.07),
      );
    }
  }
  // the roof: a parapet, the lift's plant room, the old antenna
  ctx.fillStyle = "#2b303b";
  ctx.fillRect(x - w * 0.01, y - H * 0.008, w * 1.02, H * 0.01);
  ctx.fillStyle = "rgba(165,182,220,0.25)";
  ctx.fillRect(x - w * 0.01, y - H * 0.008, w * 1.02, 1);
  const pr = { x: x + w * 0.12, w: w * 0.22, h: H * 0.03 };
  ctx.fillStyle = "#1c2029";
  ctx.fillRect(pr.x, y - H * 0.008 - pr.h, pr.w, pr.h);
  ctx.fillStyle = "rgba(165,182,220,0.2)";
  ctx.fillRect(pr.x + pr.w - 1, y - H * 0.008 - pr.h, 1, pr.h);
  const ax = x + w * 0.72;
  ctx.fillStyle = "#12151c";
  ctx.fillRect(ax - 1, y - H * 0.045, Math.max(1.5, S * 0.002), H * 0.037);
  ctx.fillRect(
    ax - S * 0.008,
    y - H * 0.03,
    S * 0.016,
    Math.max(1, S * 0.0015),
  );
  claim(L, ax - S * 0.008, ax + S * 0.008, y - H * 0.045);
  claim(L, pr.x, pr.x + pr.w, y - H * 0.008 - pr.h);
  // the way in
  const dw = w * 0.1;
  const dh = H * 0.018;
  const dx = x + w / 2 - dw / 2;
  const dy = L.groundY - dh;
  ctx.fillStyle = "#07090d";
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = "#2e3440";
  ctx.fillRect(dx - dw * 0.15, dy - H * 0.004, dw * 1.3, H * 0.004);
  ctx.fillStyle = "rgba(165,182,220,0.3)";
  ctx.fillRect(x + w - Math.max(1, S * 0.002), y, Math.max(1, S * 0.002), h);
}

// the quay: a promenade with trees and a railing, and its stone wall
function paintQuay(ctx, L, rnd) {
  const { W, S, groundY, waterY, hero } = L;
  const wallH = (waterY - groundY) * 0.42;
  const edge = waterY - wallH;
  const pave = ctx.createLinearGradient(0, groundY, 0, edge);
  pave.addColorStop(0, "#10131a");
  pave.addColorStop(1, "#191d26");
  ctx.fillStyle = pave;
  ctx.fillRect(0, groundY, W, edge - groundY);
  // trees and lamp posts along it — never in front of the building
  const clear = (px, half) =>
    px + half < hero.x - S * 0.01 || px - half > hero.x + hero.w + S * 0.01;
  for (let px = W * 0.03; px < W; px += W * (0.07 + rnd() * 0.05)) {
    const cr = S * (0.022 + rnd() * 0.012);
    if (!clear(px, cr * 1.3)) continue;
    const base = groundY + (edge - groundY) * 0.35;
    ctx.fillStyle = "#07090d";
    ctx.fillRect(px - 1, base - cr * 1.2, Math.max(2, S * 0.003), cr * 1.2);
    ctx.beginPath();
    for (const [dx, dy, rr] of [
      [0, -1.9, 1],
      [-0.7, -1.5, 0.75],
      [0.72, -1.45, 0.72],
      [0.1, -2.5, 0.65],
    ]) {
      ctx.moveTo(px + dx * cr + rr * cr, base + dy * cr);
      ctx.arc(px + dx * cr, base + dy * cr, rr * cr, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = "rgba(140,160,205,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px + 0.1 * cr, base - 2.5 * cr, 0.65 * cr, -1.2, 0.2);
    ctx.stroke();
  }
  for (let px = W * 0.08; px < W; px += W * 0.13) {
    if (!clear(px, S * 0.01)) continue;
    const ph = S * 0.07;
    ctx.fillStyle = "#0a0c11";
    ctx.fillRect(px, edge - ph, Math.max(1.5, S * 0.0025), ph);
    ctx.fillRect(px - S * 0.006, edge - ph, S * 0.014, Math.max(2, S * 0.004));
  }
  // the railing
  const ry = edge - S * 0.02;
  ctx.fillStyle = "#0c0f15";
  ctx.fillRect(0, ry, W, Math.max(1.5, S * 0.0025));
  for (let px = 0; px < W; px += S * 0.012) ctx.fillRect(px, ry, 1, edge - ry);
  ctx.fillStyle = "rgba(150,170,215,0.15)";
  ctx.fillRect(0, ry, W, 1);
  // the quay wall: dressed stone
  const wall = ctx.createLinearGradient(0, edge, 0, waterY);
  wall.addColorStop(0, "#232834");
  wall.addColorStop(1, "#151922");
  ctx.fillStyle = wall;
  ctx.fillRect(0, edge, W, wallH);
  ctx.fillStyle = "rgba(170,185,220,0.16)";
  ctx.fillRect(0, edge, W, Math.max(1, S * 0.002));
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  const bh = wallH / 2;
  for (let r = 0; r < 2; r++) {
    ctx.fillRect(0, edge + r * bh, W, 1);
    for (let px = (r % 2) * S * 0.02; px < W; px += S * 0.04)
      ctx.fillRect(px, edge + r * bh, 1, bh);
  }
}

// the river: the city upside down in it, broken by ripples; the moon's path
function paintWater(ctx, cv, L, rnd) {
  const { W, H, S, waterY, moon } = L;
  const top = Math.floor(waterY);
  const snap = makeCanvas(W, top);
  snap.getContext("2d").drawImage(cv, 0, 0);
  const base = ctx.createLinearGradient(0, waterY, 0, H);
  base.addColorStop(0, "#0b1222");
  base.addColorStop(1, "#04070d");
  ctx.fillStyle = base;
  ctx.fillRect(0, top, W, H - top);
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let y = top; y < H; y++) {
    const d = y - top;
    const sy = top - d - 1;
    if (sy < 0) break;
    const amp = 0.6 + d * 0.035;
    const dx = Math.sin(y * 0.55 + Math.sin(y * 0.13) * 2) * amp;
    ctx.drawImage(snap, 0, sy, W, 1, dx, y, W, 1);
  }
  ctx.restore();
  const deep = ctx.createLinearGradient(0, waterY, 0, H);
  deep.addColorStop(0, "rgba(4,8,16,0.2)");
  deep.addColorStop(1, "rgba(2,4,8,0.55)");
  ctx.fillStyle = deep;
  ctx.fillRect(0, top, W, H - top);
  const n = Math.round((W * (H - waterY)) / 700);
  for (let i = 0; i < n; i++) {
    const t = rnd();
    const y = waterY + 2 + t * (H - waterY - 2);
    const x = rnd() * W;
    const len = (8 + rnd() * 40) * (0.6 + t);
    ctx.fillStyle = `rgba(165,182,222,${(0.03 + rnd() * 0.05).toFixed(3)})`;
    ctx.fillRect(x, y, len, 1);
  }
  for (let i = 0; i < 90; i++) {
    const t = Math.pow(rnd(), 0.8);
    const y = waterY + 3 + t * (H - waterY - 5);
    const spread = moon.r * (0.35 + t * 2.4);
    const x = moon.x + (rnd() + rnd() + rnd() - 1.5) * spread;
    const len = (2 + rnd() * 12) * (0.6 + t) * (S / 800);
    const a = (0.3 + rnd() * 0.45) * (1 - t * 0.55);
    ctx.fillStyle = `rgba(228,234,250,${a.toFixed(3)})`;
    ctx.fillRect(x - len / 2, y, len, rnd() < 0.3 ? 2 : 1);
  }
}

// the suspension bridge, steel against the night, and its reflection
function paintBridge(ctx, L, rnd) {
  const { W, H, S, bridge: B } = L;
  const bc = makeCanvas(W, H);
  const g = bc.getContext("2d");
  const steel = "#0a0d13";
  const rim = "rgba(165,185,228,0.45)";
  const deckT = Math.max(4, H * 0.015);
  // the towers: two legs each, cross beams, a pier into the water
  const leg = Math.max(2.5, S * 0.008);
  for (const tx of [B.t1, B.t2]) {
    g.fillStyle = steel;
    for (const lx of [tx - leg * 1.6, tx + leg * 0.6])
      g.fillRect(lx, B.towerTop, leg, B.pierY - B.towerTop);
    for (const by of [B.towerTop, B.towerTop + (B.deckY - B.towerTop) * 0.45])
      g.fillRect(tx - leg * 2, by, leg * 4, Math.max(2, leg * 0.8));
    g.fillRect(tx - leg * 2.4, B.pierY - H * 0.018, leg * 4.8, H * 0.018);
    g.fillStyle = rim;
    g.fillRect(tx + leg * 1.6 - 1, B.towerTop, 1, B.pierY - B.towerTop);
    claim(L, tx - leg * 2.4, tx + leg * 2.4, B.towerTop);
  }
  // the deck, with its truss
  g.fillStyle = steel;
  g.fillRect(B.a, B.deckY - deckT, B.b - B.a, deckT);
  g.strokeStyle = steel;
  g.lineWidth = 1;
  g.beginPath();
  for (let x = B.a, up = true; x < B.b; x += deckT * 1.2, up = !up) {
    g.moveTo(x, B.deckY - (up ? deckT : 0));
    g.lineTo(x + deckT * 1.2, B.deckY - (up ? 0 : deckT));
  }
  g.stroke();
  g.fillStyle = rim;
  g.fillRect(B.a, B.deckY - deckT, B.b - B.a, Math.max(1, S * 0.0018));
  g.fillStyle = "rgba(0,0,0,0.5)";
  g.fillRect(B.a, B.deckY, B.b - B.a, Math.max(1, S * 0.002));
  // the cables, sagging between the towers, and the hangers
  const cable = (xa, ya, xb, yb, sag) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push([
        xa + (xb - xa) * t,
        ya + (yb - ya) * t + Math.sin(t * Math.PI) * sag,
      ]);
    }
    return pts;
  };
  const spans = [
    cable(B.a, B.deckY - deckT, B.t1, B.towerTop, H * 0.028),
    cable(B.t1, B.towerTop, B.t2, B.towerTop, H * 0.055),
    cable(B.t2, B.towerTop, B.b, B.deckY - deckT, H * 0.02),
  ];
  for (const pts of spans) {
    g.strokeStyle = steel;
    g.lineWidth = Math.max(2, S * 0.003);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
    g.strokeStyle = "rgba(175,195,235,0.35)";
    g.lineWidth = 1;
    g.stroke();
  }
  g.strokeStyle = "rgba(10,13,19,0.9)";
  g.lineWidth = 1;
  for (const pts of spans) {
    for (let i = 2; i < pts.length - 1; i += 2) {
      const [x, y] = pts[i];
      if (y > B.deckY - deckT - 2) continue;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, B.deckY - deckT);
      g.stroke();
    }
  }
  // its reflection, then the bridge itself
  ctx.save();
  ctx.globalAlpha = 0.32;
  for (let y = Math.floor(B.pierY); y < H; y++) {
    const d = y - B.pierY;
    const sy = B.pierY - d;
    if (sy < B.towerTop - 4) break;
    const dx = Math.sin(y * 0.6) * (0.8 + d * 0.04);
    ctx.drawImage(bc, 0, sy, W, 1, dx, y, W, 1);
  }
  ctx.restore();
  ctx.drawImage(bc, 0, 0);
}

function finish(ctx, L) {
  const { W, H } = L;
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.48,
    R * 0.45,
    W / 2,
    H * 0.48,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const noise = makeCanvas(128, 128);
  const g = noise.getContext("2d");
  const img = g.createImageData(128, 128);
  const rnd = lcg(90210);
  for (let i = 0; i < 128 * 128; i++) {
    const n = (rnd() * 255) | 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = n;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = ctx.createPattern(noise, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── the living parts ────────────────────────────────────────────────────────

// one lit room, seen through a window: warm light, and whatever is in it
function paintInterior(w, h, v, rnd) {
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const tints = [
    ["#ffe3a8", "#f0b264"],
    ["#ffd792", "#e8a04c"],
    ["#ffe9ba", "#f4be74"],
    ["#ffd38c", "#ec9f56"],
    ["#ffdda2", "#efae5e"],
    ["#fff0c9", "#f6c27a"],
  ];
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, tints[v][0]);
  bg.addColorStop(1, tints[v][1]);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const lamp = g.createRadialGradient(
    w * 0.5,
    h * 0.1,
    0,
    w * 0.5,
    h * 0.1,
    w * 0.6,
  );
  lamp.addColorStop(0, "rgba(255,250,230,0.7)");
  lamp.addColorStop(1, "rgba(255,250,230,0)");
  g.fillStyle = lamp;
  g.fillRect(0, 0, w, h);
  const dark = "rgba(70,34,12,0.8)";
  switch (v % 4) {
    case 0: // curtains, half open
      g.fillStyle = "rgba(170,78,26,0.55)";
      g.fillRect(0, 0, w * 0.24, h);
      g.fillRect(w * 0.76, 0, w * 0.24, h);
      g.fillStyle = "rgba(90,40,12,0.3)";
      for (const x of [w * 0.08, w * 0.16, w * 0.84, w * 0.92])
        g.fillRect(x, 0, 1, h);
      break;
    case 1: // a raised blind leaves one uninterrupted pane of light
      g.fillStyle = "rgba(120,60,22,0.25)";
      g.fillRect(0, 0, w, h * 0.16);
      break;
    case 2: // a plant on the sill
      g.fillStyle = dark;
      g.fillRect(w * 0.12, h * 0.78, w * 0.16, h * 0.22);
      g.beginPath();
      g.ellipse(w * 0.2, h * 0.64, w * 0.13, h * 0.17, 0, 0, Math.PI * 2);
      g.fill();
      break;
    default: // a lampshade, and a shelf
      g.fillStyle = dark;
      g.beginPath();
      g.moveTo(w * 0.62, h * 0.55);
      g.lineTo(w * 0.86, h * 0.55);
      g.lineTo(w * 0.8, h * 0.38);
      g.lineTo(w * 0.68, h * 0.38);
      g.closePath();
      g.fill();
      g.fillRect(w * 0.73, h * 0.55, Math.max(1, w * 0.04), h * 0.45);
      g.fillRect(0, h * 0.3, w * 0.35, Math.max(1, h * 0.05));
  }
  // One lit opening is one countable window; retain only the outer frame.
  g.strokeStyle = "rgba(90,45,15,0.45)";
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  void rnd;
  return c;
}

// a window's light on the water: a column of broken glints
function paintStreak(rnd) {
  const w = 16;
  const h = 96;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  for (let y = 0; y < h; y += 2) {
    const t = y / h;
    const len = w * (0.3 + rnd() * 0.7) * (1 - t * 0.3);
    const a = (0.25 + rnd() * 0.6) * (1 - t) * (rnd() < 0.2 ? 0.2 : 1);
    g.fillStyle = `rgba(255,200,125,${a.toFixed(3)})`;
    g.fillRect(w / 2 - len / 2 + (rnd() - 0.5) * 3, y, len, 1.5);
  }
  return c;
}

// a small boat, bow to the left, going downriver; its wake behind
function paintBoat(S) {
  const s = Math.max(0.6, S / 800);
  const U = (v) => v * s;
  const w = Math.ceil(U(132));
  const h = Math.ceil(U(42));
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const wl = h; // the waterline is the bottom of the canvas
  g.strokeStyle = "rgba(170,188,225,0.2)";
  g.lineWidth = 1;
  for (const [dy, len] of [
    [-U(2), 42],
    [-U(5), 30],
  ]) {
    g.beginPath();
    g.moveTo(U(86), wl + dy);
    g.lineTo(U(86 + len), wl + dy + U(1));
    g.stroke();
  }
  g.fillStyle = "#0b0e14";
  g.beginPath();
  g.moveTo(0, wl - U(15));
  g.lineTo(U(86), wl - U(16));
  g.lineTo(U(82), wl);
  g.lineTo(U(10), wl);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(170,188,225,0.3)";
  g.fillRect(U(4), wl - U(15.5), U(81), Math.max(1, U(1)));
  g.fillStyle = "#10141c";
  g.fillRect(U(34), wl - U(29), U(28), U(14));
  g.fillStyle = "#1b2231";
  g.fillRect(U(38), wl - U(25), U(7), U(5));
  g.fillRect(U(49), wl - U(25), U(7), U(5));
  g.fillStyle = "rgba(170,188,225,0.25)";
  g.fillRect(U(34), wl - U(29), U(28), 1);
  g.fillRect(U(62) - 1, wl - U(29), 1, U(14));
  g.fillStyle = "#0b0e14";
  g.fillRect(U(68), wl - U(42), Math.max(1, U(1.5)), U(27));
  g.strokeStyle = "rgba(11,14,20,0.9)";
  g.beginPath();
  g.moveTo(U(68.5), wl - U(41));
  g.lineTo(U(84), wl - U(16));
  g.stroke();
  return { canvas: c, originX: U(43) / w };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function radial(size, rgb, stops) {
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
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgb},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

function softEllipse(ctx, cx, cy, rx, ry, rgb, a) {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
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

function hash2(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function addCanvas(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
