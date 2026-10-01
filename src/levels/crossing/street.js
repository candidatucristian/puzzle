/** The street for CROSSING, painted like a storybook night: a deep blue sky
 *  and the moon between two old blocks — brick on the left with its fire
 *  escape, stucco on the right with a little cat-food shop glowing under a
 *  striped awning — a far skyline, the wet road shining with every light,
 *  and the zebra crossing running away from our feet to the far curb.
 *
 *  The crossing is laid on the road in perspective — the eye high enough
 *  that the far stripes are still easy to tell apart — and its stripes are
 *  exactly the bars the scene asks for. Painted once per screen size; the
 *  lit windows, the signals' green, the smoke and steam, the shop's sign,
 *  the stars and the cat are live, in the scene. */

const CITY = "cr_city";
const WIN = "cr_win_";
const GLOW = "cr_glow";
const PUFF = "cr_puff";
const STAR = "cr_star";
const SIGN = "cr_sign";
const WALK = "cr_walk";
const VARIANTS = 5;
const WARM = "255,206,130";

export function paintStreet(scene, W, H, bars) {
  const cam = camera(W, H);
  const lay = { windows: [], far: [] };
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  paintSky(ctx, cam, lcg(7552));
  paintSkyline(ctx, cam, lcg(6446), lay);
  paintBuilding(ctx, cam, true, lay);
  paintBuilding(ctx, cam, false, lay);
  paintSidewalk(ctx, cam, lcg(2233));
  paintRoad(ctx, cam, lcg(5150), lay);
  paintCrossing(ctx, cam, bars, lcg(4848));
  paintCar(ctx, cam);
  for (const [x, dir] of [
    [W * 0.06, 1],
    [W * 0.94, -1],
  ])
    paintLamp(ctx, cam, x, dir);
  paintTrafficLight(ctx, cam, W * 0.315);
  lay.walk = paintPedSignal(ctx, cam, W * 0.685);
  finish(ctx, cam);

  const t = scene.textures;
  add(t, CITY, cv);
  const ww = Math.max(4, Math.round(lay.winW));
  const wh = Math.max(4, Math.round(lay.winH));
  for (let v = 0; v < VARIANTS; v++) add(t, WIN + v, paintInterior(ww, wh, v));
  add(
    t,
    GLOW,
    radial(64, WARM, [
      [0, 0.55],
      [0.35, 0.18],
      [1, 0],
    ]),
  );
  add(
    t,
    PUFF,
    radial(64, "200,205,220", [
      [0, 0.5],
      [0.5, 0.2],
      [1, 0],
    ]),
  );
  add(
    t,
    STAR,
    radial(16, "235,240,255", [
      [0, 1],
      [0.3, 0.45],
      [1, 0],
    ]),
  );
  const sign = paintSign(cam.S);
  add(t, SIGN, sign.canvas);
  add(t, WALK, paintWalker(lay.walk.size));
  return {
    city: CITY,
    glow: GLOW,
    puff: PUFF,
    star: STAR,
    windows: lay.windows.map((w) => ({ ...w, key: WIN + (w.v % VARIANTS) })),
    far: lay.far,
    smoke: lay.smoke,
    steam: lay.steam,
    sign: { key: SIGN, x: lay.signAt.x, y: lay.signAt.y, oy: sign.oy },
    walk: { key: WALK, ...lay.walk },
    baseY: cam.baseY,
    curbY: cam.curbY,
  };
}

export function releaseStreetArt(textures) {
  const keys = [CITY, GLOW, PUFF, STAR, SIGN, WALK];
  for (let v = 0; v < VARIANTS; v++) keys.push(WIN + v);
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

// ── the camera: the road and the crossing on the ground ─────────────────────
// The crossing runs from our feet (z0, the bottom of the picture) to the far
// curb (z1, 1.9 times as far): the same foreshortening the level has always
// had, now as true perspective, so its stripes keep their proportions

function camera(W, H) {
  const baseY = H * 0.5; // where the buildings stand
  const curbY = H * 0.565; // the far curb
  const z0 = 1000;
  const z1 = 1900;
  const K = (H - curbY) / (1 / z0 - 1 / z1);
  const hy = H - K / z0;
  const F = 0.85 * W;
  const cx = W / 2;
  return {
    W,
    H,
    S: Math.min(W, H),
    baseY,
    curbY,
    z0,
    z1,
    K,
    hy,
    F,
    cx,
    P: (x, z) => ({ x: cx + (F * x) / z, y: hy + K / z }),
    zAt: (y) => K / (y - hy),
  };
}

// ── the sky ─────────────────────────────────────────────────────────────────

function paintSky(ctx, cam, rnd) {
  const { W, H, S, baseY } = cam;
  const g = ctx.createLinearGradient(0, 0, 0, baseY);
  g.addColorStop(0, "#070d22");
  g.addColorStop(0.55, "#101c3e");
  g.addColorStop(1, "#22305a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const moon = { x: W * 0.5, y: H * 0.15, r: S * 0.052 };
  soft(ctx, moon.x, moon.y, moon.r * 9, moon.r * 9, "140,160,215", 0.14);
  soft(ctx, moon.x, moon.y, moon.r * 3, moon.r * 3, "190,205,240", 0.18);
  soft(ctx, W / 2, baseY, W * 0.6, H * 0.18, "90,90,140", 0.25);
  for (let i = 0; i < (W * H) / 4500; i++) {
    const x = rnd() * W;
    const y = rnd() * baseY * 0.85;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 3) continue;
    ctx.fillStyle = `rgba(230,236,255,${((0.15 + rnd() * 0.5) * (1 - y / baseY)).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + rnd() * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // the moon
  ctx.save();
  ctx.shadowColor = "rgba(200,215,255,0.6)";
  ctx.shadowBlur = moon.r * 1.2;
  const body = ctx.createRadialGradient(
    moon.x - moon.r * 0.3,
    moon.y - moon.r * 0.3,
    moon.r * 0.1,
    moon.x,
    moon.y,
    moon.r,
  );
  body.addColorStop(0, "#f6f2e6");
  body.addColorStop(0.7, "#e2dccb");
  body.addColorStop(1, "#bcb4a0");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
  ctx.clip();
  for (const [dx, dy, rx, ry, a] of [
    [-0.3, -0.22, 0.32, 0.25, 0.22],
    [0.25, 0.12, 0.3, 0.22, 0.2],
    [-0.05, 0.4, 0.2, 0.14, 0.15],
    [0.2, -0.32, 0.2, 0.16, 0.16],
  ]) {
    soft(
      ctx,
      moon.x + dx * moon.r,
      moon.y + dy * moon.r,
      rx * moon.r,
      ry * moon.r,
      "104,106,116",
      a,
    );
  }
  const limb = ctx.createRadialGradient(
    moon.x,
    moon.y,
    moon.r * 0.65,
    moon.x,
    moon.y,
    moon.r,
  );
  limb.addColorStop(0, "rgba(60,55,50,0)");
  limb.addColorStop(1, "rgba(60,55,50,0.36)");
  ctx.fillStyle = limb;
  ctx.fillRect(moon.x - moon.r, moon.y - moon.r, moon.r * 2, moon.r * 2);
  ctx.restore();
  // thin clouds, silvered near the moon
  for (const cy of [H * 0.09, H * 0.2, H * 0.27]) {
    const cx0 = W * (0.25 + rnd() * 0.45);
    for (let k = 0; k < 14; k++) {
      const px = cx0 + (rnd() - 0.5) * W * 0.25;
      const py = cy + (rnd() - 0.5) * H * 0.015;
      const near = Math.exp(
        -((px - moon.x) ** 2 + (py - moon.y) ** 2) / (2 * (W * 0.15) ** 2),
      );
      soft(
        ctx,
        px,
        py,
        W * (0.03 + rnd() * 0.04),
        H * (0.005 + rnd() * 0.008),
        "130,145,190",
        0.05 + 0.13 * near,
      );
    }
  }
}

// the far skyline across the gap between the two blocks
function paintSkyline(ctx, cam, rnd, lay) {
  const { W, H, baseY } = cam;
  for (const [col, lo, hi] of [
    ["#121a35", 0.12, 0.26],
    ["#0c1228", 0.08, 0.2],
  ]) {
    let x = -10;
    while (x < W + 10) {
      const w = Math.max(24, W * (0.04 + rnd() * 0.08));
      const top = baseY - H * (lo + rnd() * (hi - lo));
      ctx.fillStyle = col;
      ctx.fillRect(x, top, w + 1, baseY - top + 2);
      if (rnd() < 0.3)
        ctx.fillRect(
          x + w * 0.4,
          top - H * 0.025,
          Math.max(1.5, W * 0.0015),
          H * 0.025,
        );
      ctx.fillStyle = "rgba(150,170,220,0.12)";
      ctx.fillRect(x + w - 1, top, 1, baseY - top);
      x += w;
    }
  }
  const haze = ctx.createLinearGradient(0, baseY - H * 0.12, 0, baseY);
  haze.addColorStop(0, "rgba(70,80,130,0)");
  haze.addColorStop(1, "rgba(70,80,130,0.3)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, baseY - H * 0.12, W, H * 0.12);
  for (let i = 0; i < 3; i++)
    lay.far.push({
      x: W * (0.36 + rnd() * 0.28),
      y: baseY - H * (0.04 + rnd() * 0.09),
    });
}

// ── the two blocks ──────────────────────────────────────────────────────────

function paintBuilding(ctx, cam, left, lay) {
  const { W, H, S, baseY } = cam;
  const o = left
    ? { x0: -0.02, x1: 0.3, top: 0.07, seed: 11, lit: 0.24, cols: 4 }
    : { x0: 0.7, x1: 1.02, top: 0.11, seed: 77, lit: 0.24, cols: 4 };
  const rnd = lcg(o.seed * 977 + 5);
  const bx = W * o.x0;
  const bw = W * (o.x1 - o.x0);
  const by = H * o.top;
  const bh = baseY - by;
  // the façade: brick on the left, stucco on the right
  const g = ctx.createLinearGradient(0, by, 0, baseY);
  if (left) {
    g.addColorStop(0, "#2a1a1c");
    g.addColorStop(1, "#3c2420");
  } else {
    g.addColorStop(0, "#2a2a3c");
    g.addColorStop(1, "#3a3646");
  }
  ctx.fillStyle = g;
  ctx.fillRect(bx, by, bw, bh);
  if (left) {
    const bhB = Math.max(4, H * 0.011);
    const bwB = bhB * 2.3;
    for (let y = by, r = 0; y < baseY; y += bhB, r++) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(bx, y, bw, 1);
      for (let x = bx - (r % 2) * bwB * 0.5; x < bx + bw; x += bwB) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x, y, 1, bhB);
        const v = rnd();
        ctx.fillStyle =
          v < 0.5
            ? `rgba(120,50,40,${(v * 0.12).toFixed(3)})`
            : `rgba(0,0,0,${((v - 0.5) * 0.15).toFixed(3)})`;
        ctx.fillRect(x + 1, y + 1, bwB - 1, bhB - 1);
      }
    }
  } else {
    for (let i = 0; i < (bw * bh) / 70; i++) {
      ctx.fillStyle =
        rnd() < 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(
        bx + rnd() * bw,
        by + rnd() * bh,
        1 + rnd() * 3,
        1 + rnd() * 3,
      );
    }
  }
  // the light on it: the streetlamp's warmth from below, the moon on the
  // edge that faces the gap
  soft(
    ctx,
    left ? W * 0.07 : W * 0.93,
    H * 0.28,
    bw * 0.75,
    H * 0.32,
    "255,170,90",
    0.14,
    "lighter",
  );
  const rimX = left ? bx + bw - 2 : bx;
  ctx.fillStyle = "rgba(150,172,225,0.22)";
  ctx.fillRect(rimX, by, 2, bh);
  // the roofline: a cornice
  ctx.fillStyle = left ? "#1d1213" : "#24232f";
  ctx.fillRect(bx - S * 0.01, by - S * 0.012, bw + S * 0.02, S * 0.016);
  ctx.fillStyle = "rgba(170,185,225,0.25)";
  ctx.fillRect(bx - S * 0.01, by - S * 0.012, bw + S * 0.02, 1);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(bx, by + S * 0.004, bw, S * 0.006);
  // on the roof: a chimney (left), a water tank (right)
  if (left) {
    const chx = bx + bw * 0.55;
    const chw = bw * 0.08;
    const chh = H * 0.045;
    ctx.fillStyle = "#24161a";
    ctx.fillRect(chx, by - chh, chw, chh);
    ctx.fillStyle = "#170e10";
    ctx.fillRect(chx - chw * 0.12, by - chh, chw * 1.24, chh * 0.18);
    ctx.fillStyle = "rgba(150,172,225,0.25)";
    ctx.fillRect(chx + chw - 1, by - chh, 1, chh);
    lay.smoke = { x: chx + chw / 2, y: by - chh };
  } else {
    const tx = bx + bw * 0.2;
    const tw = bw * 0.16;
    const th = H * 0.05;
    const ty = by - th - H * 0.012;
    ctx.fillStyle = "#16141c";
    for (const lx of [tx + tw * 0.12, tx + tw * 0.82])
      ctx.fillRect(lx, ty + th, Math.max(1.5, S * 0.002), H * 0.012);
    const tg = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    tg.addColorStop(0, "#2b2026");
    tg.addColorStop(0.7, "#3c2c30");
    tg.addColorStop(1, "#5a4a5a");
    ctx.fillStyle = tg;
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (const f of [0.25, 0.7])
      ctx.fillRect(tx, ty + th * f, tw, Math.max(1, S * 0.002));
    ctx.fillStyle = "#1c161c";
    ctx.beginPath();
    ctx.moveTo(tx - tw * 0.08, ty);
    ctx.lineTo(tx + tw / 2, ty - th * 0.35);
    ctx.lineTo(tx + tw * 1.08, ty);
    ctx.closePath();
    ctx.fill();
  }
  // the windows: stone sills and lintels, dark glass with the sky in it —
  // and a few lit (the scene puts the rooms in them)
  const groundH = Math.min(H * 0.075, bh * 0.24);
  const floors = Math.max(3, Math.round((bh - groundH) / (H * 0.08)));
  const mX = bw * 0.12;
  const winW = (bw - mX * 2) / (o.cols * 1.6 - 0.6);
  const areaH = bh - groundH - 16;
  const floorH = areaH / floors;
  const winH = Math.min(floorH * 0.52, H * 0.04);
  lay.winW = winW;
  lay.winH = winH;
  const litRng = lcg(o.seed * 431 + 3);
  for (let f = 0; f < floors; f++) {
    const rowY = by + 14 + f * floorH + floorH * 0.2;
    for (let c = 0; c < o.cols; c++) {
      const wx = bx + mX + c * winW * 1.6;
      const cx = wx + winW / 2;
      const cy = rowY + winH / 2;
      const lit = litRng() < o.lit;
      if (lit) (litRng(), litRng(), litRng());
      else litRng();
      if (cx < -winW || cx > W + winW) continue;
      ctx.fillStyle = left ? "#5a4a44" : "#4e4a58";
      ctx.fillRect(
        wx - winW * 0.12,
        rowY - winH * 0.16,
        winW * 1.24,
        winH * 0.12,
      );
      ctx.fillRect(wx - winW * 0.1, rowY + winH, winW * 1.2, winH * 0.1);
      const gl = ctx.createLinearGradient(0, rowY, 0, rowY + winH);
      gl.addColorStop(0, "#1c2644");
      gl.addColorStop(1, "#080b16");
      ctx.fillStyle = gl;
      ctx.fillRect(wx, rowY, winW, winH);
      ctx.fillStyle = "rgba(160,180,230,0.08)";
      ctx.beginPath();
      ctx.moveTo(wx + winW * 0.15, rowY);
      ctx.lineTo(wx + winW * 0.45, rowY);
      ctx.lineTo(wx + winW * 0.2, rowY + winH);
      ctx.lineTo(wx - winW * 0.1, rowY + winH);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0c0d14";
      ctx.fillRect(
        cx - Math.max(0.5, winW * 0.03),
        rowY,
        Math.max(1, winW * 0.06),
        winH,
      );
      ctx.fillRect(
        wx,
        cy - Math.max(0.5, winH * 0.03),
        winW,
        Math.max(1, winH * 0.06),
      );
      if (lit)
        lay.windows.push({
          x: cx,
          y: cy,
          w: winW,
          h: winH,
          v: Math.floor(hash(f * 7 + c + o.seed) * 1000),
        });
    }
  }
  // the fire escape down the left block's street side
  if (left) {
    const fx0 = bx + bw * 0.82;
    const fx1 = bx + bw * 0.98;
    let fy = by + bh * 0.16;
    const step = (bh * 0.62) / 5;
    ctx.strokeStyle = "#08080b";
    ctx.lineWidth = Math.max(1.5, S * 0.003);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#0b0b0f";
      ctx.fillRect(fx0, fy, fx1 - fx0, Math.max(2, S * 0.004));
      ctx.fillStyle = "rgba(160,180,230,0.25)";
      ctx.fillRect(fx0, fy, fx1 - fx0, 1);
      ctx.beginPath();
      ctx.moveTo(fx0, fy - S * 0.014);
      ctx.lineTo(fx1, fy - S * 0.014);
      for (let x = fx0; x <= fx1 + 0.5; x += (fx1 - fx0) / 5) {
        ctx.moveTo(x, fy);
        ctx.lineTo(x, fy - S * 0.014);
      }
      const a = i % 2 === 0 ? fx1 : fx0;
      const b = i % 2 === 0 ? fx0 : fx1;
      ctx.moveTo(a, fy);
      ctx.lineTo(b, fy + step);
      ctx.stroke();
      fy += step;
    }
  }
  // the ground floor: a doorway with its lamp (left), the shop (right)
  const top = baseY - groundH;
  if (left) {
    const doorW = bw * 0.12;
    const doorX = bx + bw * 0.72;
    ctx.fillStyle = "#3a2a26";
    ctx.fillRect(
      doorX - doorW * 0.15,
      top + groundH * 0.1,
      doorW * 1.3,
      groundH * 0.9,
    );
    ctx.fillStyle = "#1b1210";
    ctx.fillRect(doorX, top + groundH * 0.18, doorW, groundH * 0.82);
    ctx.fillStyle = "rgba(255,200,130,0.4)";
    ctx.fillRect(
      doorX + doorW * 0.2,
      top + groundH * 0.26,
      doorW * 0.6,
      groundH * 0.2,
    );
    const lp = { x: doorX + doorW / 2, y: top + groundH * 0.02 };
    soft(ctx, lp.x, lp.y, S * 0.05, S * 0.05, WARM, 0.45, "lighter");
    soft(ctx, lp.x, baseY, S * 0.06, S * 0.012, WARM, 0.3, "lighter");
    ctx.fillStyle = "#fff0c8";
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, Math.max(2, S * 0.004), 0, Math.PI * 2);
    ctx.fill();
  } else {
    paintShop(ctx, cam, bx, bw, groundH, lay);
  }
}

// the cat-food shop: a green shopfront, its window full of light and tins,
// a striped awning, a door, a bracket for its sign
function paintShop(ctx, cam, bx, bw, groundH, lay) {
  const { S, baseY } = cam;
  const top = baseY - groundH;
  ctx.fillStyle = "#1d3a30";
  ctx.fillRect(bx + bw * 0.05, top, bw * 0.73, groundH);
  ctx.fillStyle = "rgba(170,210,190,0.2)";
  ctx.fillRect(bx + bw * 0.05, top, bw * 0.73, 1);
  const winX = bx + bw * 0.1;
  const winW = bw * 0.42;
  const winY = top + groundH * 0.24;
  const winH = groundH * 0.6;
  const wg = ctx.createLinearGradient(0, winY, 0, winY + winH);
  wg.addColorStop(0, "#ffe6b0");
  wg.addColorStop(1, "#f0aa58");
  ctx.fillStyle = wg;
  ctx.fillRect(winX, winY, winW, winH);
  // shelves of tins, every colour a cat could want
  const tins = [
    "#c84a3a",
    "#3a7ac8",
    "#e0b03a",
    "#5aa05a",
    "#d07a3a",
    "#9a5ab0",
  ];
  for (const [sy, n] of [
    [0.42, 9],
    [0.82, 8],
  ]) {
    const y = winY + winH * sy;
    ctx.fillStyle = "rgba(90,50,20,0.6)";
    ctx.fillRect(winX, y, winW, Math.max(1, winH * 0.04));
    const tw = winW / (n * 1.4);
    for (let i = 0; i < n; i++) {
      const tx = winX + winW * 0.05 + i * tw * 1.4;
      ctx.fillStyle = tins[(i + Math.round(sy * 10)) % tins.length];
      ctx.fillRect(tx, y - winH * 0.22, tw, winH * 0.22);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(tx, y - winH * 0.22, tw, Math.max(1, winH * 0.03));
    }
  }
  ctx.fillStyle = "#16302a";
  for (const f of [1 / 3, 2 / 3])
    ctx.fillRect(winX + winW * f - 1, winY, 2, winH);
  ctx.strokeStyle = "#16302a";
  ctx.lineWidth = Math.max(1.5, S * 0.003);
  ctx.strokeRect(winX, winY, winW, winH);
  const doorX = bx + bw * 0.58;
  const doorW = bw * 0.14;
  ctx.fillStyle = "#14261f";
  ctx.fillRect(doorX, winY, doorW, winH + groundH * 0.16);
  ctx.fillStyle = "rgba(255,206,140,0.55)";
  ctx.fillRect(
    doorX + doorW * 0.18,
    winY + winH * 0.1,
    doorW * 0.64,
    winH * 0.5,
  );
  // the awning: red and cream, scalloped
  const awY = top + groundH * 0.16;
  const ax0 = bx + bw * 0.04;
  const ax1 = bx + bw * 0.78;
  const ah = groundH * 0.2;
  const stripes = 10;
  const sw = (ax1 - ax0) / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? "#e8dcc4" : "#b8342c";
    ctx.beginPath();
    ctx.moveTo(ax0 + i * sw + sw * 0.1, awY - ah);
    ctx.lineTo(ax0 + (i + 1) * sw + sw * 0.1, awY - ah);
    ctx.lineTo(ax0 + (i + 1) * sw, awY);
    ctx.quadraticCurveTo(
      ax0 + (i + 0.5) * sw,
      awY + ah * 0.55,
      ax0 + i * sw,
      awY,
    );
    ctx.closePath();
    ctx.fill();
  }
  const shade = ctx.createLinearGradient(0, awY - ah, 0, awY + ah * 0.5);
  shade.addColorStop(0, "rgba(0,0,0,0.45)");
  shade.addColorStop(1, "rgba(255,190,120,0.15)");
  ctx.fillStyle = shade;
  ctx.fillRect(ax0, awY - ah, ax1 - ax0 + sw * 0.2, ah * 1.55);
  // the light it throws onto the far sidewalk and the road
  soft(
    ctx,
    winX + winW / 2,
    baseY + groundH * 0.1,
    winW * 0.9,
    groundH * 0.35,
    WARM,
    0.35,
    "lighter",
  );
  soft(
    ctx,
    winX + winW / 2,
    winY + winH / 2,
    winW * 0.8,
    winH,
    WARM,
    0.18,
    "lighter",
  );
  // the sign's iron bracket
  const sx = bx + bw * 0.8;
  const sy = top + groundH * 0.2;
  ctx.strokeStyle = "#0b0b10";
  ctx.lineWidth = Math.max(1.5, S * 0.003);
  ctx.beginPath();
  ctx.moveTo(sx + bw * 0.06, sy - groundH * 0.05);
  ctx.lineTo(sx - S * 0.005, sy - groundH * 0.05);
  ctx.stroke();
  lay.signAt = { x: sx, y: sy - groundH * 0.05 };
}

// ── the ground ──────────────────────────────────────────────────────────────

function paintSidewalk(ctx, cam, rnd) {
  const { W, H, S, baseY, curbY } = cam;
  const g = ctx.createLinearGradient(0, baseY, 0, curbY);
  g.addColorStop(0, "#2a2a34");
  g.addColorStop(1, "#33323c");
  ctx.fillStyle = g;
  ctx.fillRect(0, baseY, W, curbY - baseY);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, baseY, W, Math.max(1, S * 0.003));
  const zb = cam.zAt(baseY + 1);
  const zc = cam.zAt(curbY - 1);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  for (let x = -2400; x <= 2400; x += 140) {
    const a = cam.P(x, zb);
    const b = cam.P(x, zc);
    if (Math.max(a.x, b.x) < 0 || Math.min(a.x, b.x) > W) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, (baseY + curbY) / 2, W, 1);
  for (let i = 0; i < W / 10; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(rnd() * W, baseY + rnd() * (curbY - baseY), 2 + rnd() * 6, 1);
  }
  // the far curb: granite, its edge catching the lamps
  ctx.fillStyle = "#4a4852";
  ctx.fillRect(0, curbY - S * 0.004, W, S * 0.004);
  ctx.fillStyle = "#1a1a22";
  ctx.fillRect(0, curbY, W, S * 0.007);
  ctx.fillStyle = "rgba(255,220,170,0.25)";
  ctx.fillRect(0, curbY - S * 0.004, W, 1);
}

// the road, wet: every light lies on it in long soft streaks
function paintRoad(ctx, cam, rnd, lay) {
  const { W, H, S, curbY } = cam;
  const top = curbY + S * 0.007;
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, "#15161e");
  g.addColorStop(1, "#0e0f15");
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);
  for (let i = 0; i < (W * (H - top)) / 25; i++) {
    const y = top + rnd() * (H - top);
    ctx.fillStyle =
      rnd() < 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(rnd() * W, y, 1 + rnd() * 2, 1);
  }
  for (let i = 0; i < 10; i++) {
    const t = rnd();
    const y = top + 20 + t * (H - top - 30);
    soft(
      ctx,
      rnd() * W,
      y,
      (20 + rnd() * 50) * (0.6 + t),
      (6 + rnd() * 10) * (0.6 + t),
      "0,0,0",
      0.25,
    );
  }
  // the reflections
  const streak = (x, rgb, a, w) => {
    soft(
      ctx,
      x,
      top + (H - top) * 0.32,
      w,
      (H - top) * 0.42,
      rgb,
      a,
      "lighter",
    );
    soft(
      ctx,
      x,
      top + (H - top) * 0.12,
      w * 0.5,
      (H - top) * 0.18,
      rgb,
      a * 0.8,
      "lighter",
    );
  };
  streak(W * 0.06 + S * 0.03, WARM, 0.2, S * 0.035);
  streak(W * 0.94 - S * 0.03, WARM, 0.2, S * 0.035);
  streak(W * 0.7 + W * 0.32 * 0.31, WARM, 0.16, W * 0.06);
  streak(W * 0.315, "80,220,130", 0.12, S * 0.02);
  streak(W * 0.685, "80,220,130", 0.1, S * 0.02);
  streak(W * 0.5, "190,205,240", 0.06, W * 0.05);
  // the manhole, steam breathing out of it
  const mx = W * 0.88;
  const my = H * 0.86;
  const z = cam.zAt(my);
  const rx = (cam.F / z) * 36;
  const ry = Math.abs(cam.P(0, z - 36).y - cam.P(0, z + 36).y) / 2;
  ctx.fillStyle = "#1c1c22";
  ctx.beginPath();
  ctx.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = Math.max(1, S * 0.003);
  ctx.stroke();
  ctx.strokeStyle = "rgba(180,190,220,0.18)";
  ctx.lineWidth = 1;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(mx, my, rx * 0.85, ry * 0.85, 0, 0, Math.PI * 2);
  ctx.clip();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(mx - rx, my + (i * ry) / 3.2);
    ctx.lineTo(mx + rx, my + (i * ry) / 3.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(200,210,235,0.25)";
  ctx.beginPath();
  ctx.ellipse(mx, my, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  lay.steam = { x: mx, y: my };
}

// the zebra: its stripes laid on the road exactly where the scene says
function paintCrossing(ctx, cam, bars, rnd) {
  const { S, z0, z1 } = cam;
  const half = 200;
  for (const b of bars) {
    const za = z0 + b.t0 * (z1 - z0);
    const zb = z0 + b.t1 * (z1 - z0);
    const q = [
      cam.P(-half, za),
      cam.P(half, za),
      cam.P(half, zb),
      cam.P(-half, zb),
    ];
    const g = ctx.createLinearGradient(q[0].x, 0, q[1].x, 0);
    g.addColorStop(0, "#d8cfba");
    g.addColorStop(0.5, "#e8e0cd");
    g.addColorStop(1, "#d4cbb8");
    poly(ctx, q);
    ctx.fillStyle = g;
    ctx.fill();
    // worn paint: scuffs and fine cracks, never at the stripe's edges
    ctx.save();
    poly(ctx, q);
    ctx.clip();
    const hgt = Math.abs(q[0].y - q[3].y);
    for (let i = 0; i < 14; i++) {
      const u = rnd();
      const v = 0.2 + rnd() * 0.6;
      const x = q[3].x + (q[2].x - q[3].x) * u;
      const y = q[3].y + hgt * v;
      soft(
        ctx,
        x,
        y,
        S * (0.008 + rnd() * 0.02),
        hgt * (0.06 + rnd() * 0.12),
        "60,54,44",
        0.08 + rnd() * 0.08,
      );
    }
    const w = q[1].x - q[0].x;
    for (let i = 0; i < w / 3; i++) {
      ctx.fillStyle =
        rnd() < 0.7 ? "rgba(40,36,30,0.18)" : "rgba(255,250,235,0.25)";
      ctx.fillRect(
        q[3].x + rnd() * (q[2].x - q[3].x),
        q[3].y + hgt * (0.1 + rnd() * 0.8),
        1 + rnd() * 1.5,
        1,
      );
    }
    ctx.restore();
  }
}

// a rounded old car parked at the far curb, bonnet to the right
function paintCar(ctx, cam) {
  const { W, H, curbY } = cam;
  const cw = W * 0.085;
  const ch = H * 0.042;
  const cx = W * 0.115;
  const y0 = curbY + 12;
  const x0 = cx - cw / 2;
  soft(ctx, cx, y0 + ch * 1.05, cw * 0.62, ch * 0.22, "0,0,0", 0.7);
  const bg = ctx.createLinearGradient(0, y0 - ch * 0.5, 0, y0 + ch);
  bg.addColorStop(0, "#5fa3a0");
  bg.addColorStop(0.4, "#2f6764");
  bg.addColorStop(1, "#163634");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + ch * 0.8);
  ctx.quadraticCurveTo(x0 - cw * 0.02, y0 + ch * 0.1, x0 + cw * 0.18, y0);
  ctx.quadraticCurveTo(
    x0 + cw * 0.3,
    y0 - ch * 0.75,
    x0 + cw * 0.5,
    y0 - ch * 0.78,
  );
  ctx.quadraticCurveTo(x0 + cw * 0.72, y0 - ch * 0.75, x0 + cw * 0.82, y0);
  ctx.quadraticCurveTo(x0 + cw * 1.02, y0 + ch * 0.1, x0 + cw, y0 + ch * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#0e1a22";
  ctx.beginPath();
  ctx.moveTo(x0 + cw * 0.27, y0 - ch * 0.05);
  ctx.quadraticCurveTo(
    x0 + cw * 0.34,
    y0 - ch * 0.6,
    x0 + cw * 0.5,
    y0 - ch * 0.62,
  );
  ctx.quadraticCurveTo(
    x0 + cw * 0.66,
    y0 - ch * 0.6,
    x0 + cw * 0.73,
    y0 - ch * 0.05,
  );
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,210,150,0.25)";
  ctx.fillRect(x0 + cw * 0.32, y0 - ch * 0.48, cw * 0.06, ch * 0.4);
  ctx.fillStyle = "#2f6764";
  ctx.fillRect(x0 + cw * 0.495, y0 - ch * 0.6, cw * 0.012, ch * 0.56);
  ctx.fillStyle = "rgba(200,240,235,0.45)";
  ctx.fillRect(x0 + cw * 0.15, y0 + ch * 0.02, cw * 0.7, 1);
  ctx.fillStyle = "#c8ccd4";
  ctx.fillRect(x0 - cw * 0.02, y0 + ch * 0.7, cw * 0.1, ch * 0.12);
  ctx.fillRect(x0 + cw * 0.92, y0 + ch * 0.7, cw * 0.1, ch * 0.12);
  ctx.fillStyle = "#3a3a40";
  ctx.beginPath();
  ctx.arc(x0 + cw * 0.96, y0 + ch * 0.38, ch * 0.13, 0, Math.PI * 2);
  ctx.fill();
  for (const wx of [x0 + cw * 0.22, x0 + cw * 0.78]) {
    ctx.fillStyle = "#08090c";
    ctx.beginPath();
    ctx.arc(wx, y0 + ch * 0.85, ch * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(230,230,225,0.55)";
    ctx.lineWidth = Math.max(1, ch * 0.08);
    ctx.beginPath();
    ctx.arc(wx, y0 + ch * 0.85, ch * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#9aa0a8";
    ctx.beginPath();
    ctx.arc(wx, y0 + ch * 0.85, ch * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

// an old street lamp: a fluted post, a curled arm, a glowing lantern
function paintLamp(ctx, cam, px, dir) {
  const { H, S, curbY } = cam;
  const base = curbY + 2;
  const top = H * 0.24;
  const lx = px + S * 0.03 * dir;
  const ly = top + 2;
  // its light falling on the pavement and the road
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cone = ctx.createLinearGradient(0, ly, 0, base + 14);
  cone.addColorStop(0, "rgba(255,206,130,0.12)");
  cone.addColorStop(1, "rgba(255,206,130,0.02)");
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(lx - S * 0.008, ly);
  ctx.lineTo(lx + S * 0.008, ly);
  ctx.lineTo(lx + S * 0.07, base + 14);
  ctx.lineTo(lx - S * 0.07, base + 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  soft(ctx, lx, base + 8, S * 0.1, S * 0.022, WARM, 0.35, "lighter");
  const iron = "#0d0e14";
  ctx.fillStyle = iron;
  ctx.fillRect(
    px - S * 0.004,
    top + S * 0.02,
    S * 0.008,
    base - top - S * 0.02,
  );
  ctx.fillRect(px - S * 0.008, base - S * 0.03, S * 0.016, S * 0.03);
  ctx.fillRect(px - S * 0.006, base - S * 0.06, S * 0.012, S * 0.006);
  ctx.fillStyle = "rgba(170,185,225,0.25)";
  ctx.fillRect(
    px + (dir > 0 ? S * 0.003 : -S * 0.004),
    top + S * 0.02,
    1,
    base - top - S * 0.02,
  );
  ctx.strokeStyle = iron;
  ctx.lineWidth = Math.max(1.5, S * 0.004);
  ctx.beginPath();
  ctx.moveTo(px, top + S * 0.025);
  ctx.quadraticCurveTo(px, top, lx, top);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + S * 0.012 * dir, top + S * 0.018, S * 0.007, 0, Math.PI * 2);
  ctx.stroke();
  // the lantern
  soft(ctx, lx, ly + S * 0.012, S * 0.06, S * 0.06, WARM, 0.5, "lighter");
  const lw = S * 0.018;
  const lh = S * 0.026;
  ctx.fillStyle = iron;
  ctx.beginPath();
  ctx.moveTo(lx - lw * 0.75, ly + lh * 0.05);
  ctx.lineTo(lx, ly - lh * 0.35);
  ctx.lineTo(lx + lw * 0.75, ly + lh * 0.05);
  ctx.closePath();
  ctx.fill();
  const gl = ctx.createLinearGradient(0, ly, 0, ly + lh);
  gl.addColorStop(0, "#fff3cc");
  gl.addColorStop(1, "#ffbe66");
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.moveTo(lx - lw / 2, ly);
  ctx.lineTo(lx + lw / 2, ly);
  ctx.lineTo(lx + lw * 0.35, ly + lh);
  ctx.lineTo(lx - lw * 0.35, ly + lh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = iron;
  ctx.fillRect(lx - 0.6, ly, 1.2, lh);
  ctx.fillRect(lx - lw * 0.4, ly + lh, lw * 0.8, Math.max(2, S * 0.004));
}

// the traffic light, its green lit
function paintTrafficLight(ctx, cam, px) {
  const { H, S, curbY } = cam;
  const base = curbY + 2;
  const top = H * 0.33;
  ctx.fillStyle = "#0d0e14";
  ctx.fillRect(px - S * 0.003, top, S * 0.006, base - top);
  const hw = S * 0.026;
  const hh = S * 0.066;
  const hx = px - hw / 2;
  const hy = top - hh;
  const hg = ctx.createLinearGradient(hx, 0, hx + hw, 0);
  hg.addColorStop(0, "#1a1c24");
  hg.addColorStop(1, "#0b0c11");
  ctx.fillStyle = hg;
  roundRect(ctx, hx, hy, hw, hh, hw * 0.22);
  ctx.fill();
  const lamps = [
    ["208,72,58", 0.18],
    ["224,166,58", 0.18],
    ["58,208,106", 1],
  ];
  lamps.forEach(([rgb, a], i) => {
    const cy = hy + hh * (0.2 + i * 0.3);
    const r = hw * 0.28;
    if (a === 1) soft(ctx, px, cy, r * 4, r * 4, rgb, 0.45, "lighter");
    ctx.fillStyle = `rgba(${rgb},${a})`;
    ctx.beginPath();
    ctx.arc(px, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#08090c";
    ctx.fillRect(px - r * 1.3, cy - r * 1.35, r * 2.6, r * 0.35);
  });
}

// the pedestrian signal's box; the walking figure in it is live
function paintPedSignal(ctx, cam, px) {
  const { H, S, curbY } = cam;
  const base = curbY + 2;
  const top = H * 0.37;
  ctx.fillStyle = "#0d0e14";
  ctx.fillRect(px - S * 0.003, top, S * 0.006, base - top);
  const bw = S * 0.036;
  const bh = S * 0.042;
  const bx = px - bw / 2;
  const by = top - bh;
  const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  hg.addColorStop(0, "#1a1c24");
  hg.addColorStop(1, "#0b0c11");
  ctx.fillStyle = hg;
  roundRect(ctx, bx, by, bw, bh, bw * 0.15);
  ctx.fill();
  ctx.fillStyle = "#050607";
  ctx.fillRect(bx + bw * 0.12, by + bh * 0.1, bw * 0.76, bh * 0.8);
  return { x: px, y: by + bh / 2, size: Math.round(bw * 0.9) };
}

function finish(ctx, cam) {
  const { W, H } = cam;
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.5,
    R * 0.45,
    W / 2,
    H * 0.5,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(4,6,14,0)");
  v.addColorStop(1, "rgba(4,6,14,0.6)");
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

// ── the live parts ──────────────────────────────────────────────────────────

// one lit room through a window: warm light, and something in it
function paintInterior(w, h, v) {
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const tints = [
    ["#ffe3a8", "#f0b264"],
    ["#ffd792", "#e8a04c"],
    ["#ffe9ba", "#f4be74"],
    ["#ffd38c", "#ec9f56"],
    ["#fff0c9", "#f6c27a"],
  ];
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, tints[v][0]);
  bg.addColorStop(1, tints[v][1]);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  if (v % 3 === 0) {
    g.fillStyle = "rgba(170,78,26,0.5)";
    g.fillRect(0, 0, w * 0.24, h);
    g.fillRect(w * 0.76, 0, w * 0.24, h);
  } else if (v % 3 === 1) {
    g.fillStyle = "rgba(70,34,12,0.8)";
    g.beginPath();
    g.ellipse(w * 0.25, h * 0.7, w * 0.14, h * 0.2, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillStyle = "rgba(120,60,22,0.35)";
    for (let y = h / 7; y < h * 0.55; y += h / 7)
      g.fillRect(0, y, w, Math.max(1, h * 0.05));
  }
  g.fillStyle = "rgba(30,20,14,0.9)";
  g.fillRect(w / 2 - Math.max(0.5, w * 0.03), 0, Math.max(1, w * 0.06), h);
  g.fillRect(0, h / 2 - Math.max(0.5, h * 0.03), w, Math.max(1, h * 0.06));
  return c;
}

// the shop's hanging sign: a painted board, CAT FOOD and a fish
function paintSign(S) {
  const w = Math.ceil(Math.max(70, S * 0.1));
  const h = Math.ceil(w * 0.42);
  const c = makeCanvas(w, h + 8);
  const g = c.getContext("2d");
  g.strokeStyle = "#0b0b10";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(w * 0.2, 0);
  g.lineTo(w * 0.2, 8);
  g.moveTo(w * 0.8, 0);
  g.lineTo(w * 0.8, 8);
  g.stroke();
  const bg = g.createLinearGradient(0, 8, 0, 8 + h);
  bg.addColorStop(0, "#2a5446");
  bg.addColorStop(1, "#1a3a30");
  g.fillStyle = bg;
  roundRect(g, 1, 8, w - 2, h - 1, h * 0.18);
  g.fill();
  g.strokeStyle = "#c9a35a";
  g.lineWidth = 1.5;
  roundRect(g, 3, 10, w - 6, h - 5, h * 0.14);
  g.stroke();
  g.fillStyle = "#f2e2b8";
  let fs = Math.round(h * 0.42);
  g.font = `bold ${fs}px Georgia, "Times New Roman", serif`;
  const room = w * 0.66;
  const tw = g.measureText("CAT FOOD").width;
  if (tw > room) {
    fs = Math.max(6, Math.floor((fs * room) / tw));
    g.font = `bold ${fs}px Georgia, "Times New Roman", serif`;
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("CAT FOOD", w * 0.43, 8 + h * 0.54);
  g.fillStyle = "#e0a34a";
  const fx = w * 0.88;
  const fy = 8 + h * 0.52;
  g.beginPath();
  g.ellipse(fx - h * 0.06, fy, h * 0.12, h * 0.07, 0, 0, Math.PI * 2);
  g.moveTo(fx + h * 0.04, fy);
  g.lineTo(fx + h * 0.13, fy - h * 0.08);
  g.lineTo(fx + h * 0.13, fy + h * 0.08);
  g.closePath();
  g.fill();
  return { canvas: c, oy: 0 };
}

// the green walking figure, lit, with its glow
function paintWalker(size) {
  const s = Math.max(16, size);
  const c = makeCanvas(s * 2, s * 2);
  const g = c.getContext("2d");
  const m = s;
  const glow = g.createRadialGradient(m, m, 0, m, m, s);
  glow.addColorStop(0, "rgba(58,208,106,0.45)");
  glow.addColorStop(1, "rgba(58,208,106,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, s * 2, s * 2);
  const k = s / 26;
  g.save();
  g.shadowColor = "rgba(80,255,140,0.9)";
  g.shadowBlur = 4 * k;
  g.strokeStyle = "#5af08a";
  g.fillStyle = "#5af08a";
  g.lineWidth = 2.4 * k;
  g.lineCap = "round";
  g.beginPath();
  g.arc(m + 1 * k, m - 9 * k, 2.4 * k, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(m + 1 * k, m - 6.5 * k);
  g.lineTo(m - 1 * k, m + 2 * k);
  g.lineTo(m - 6 * k, m + 9 * k);
  g.moveTo(m - 1 * k, m + 2 * k);
  g.lineTo(m + 6 * k, m + 8 * k);
  g.moveTo(m, m - 4 * k);
  g.lineTo(m - 5 * k, m - 1 * k);
  g.moveTo(m, m - 4 * k);
  g.lineTo(m + 6 * k, m - 7 * k);
  g.stroke();
  g.restore();
  return c;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
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

function hash(n) {
  let h = Math.imul(n | 0, 374761393) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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
