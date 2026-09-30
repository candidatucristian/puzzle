/** The harbour for FLAGS at dusk, painted like a background from an animated
 *  film: the sun going down into the sea and laying a road of gold across
 *  it, the sky burning from gold through rose to violet with the first stars
 *  out overhead, clouds heaped on the horizon and lit from underneath. On
 *  the headland the lighthouse has just been lit; far off on the right the
 *  first lights of a village; a little sailing boat at anchor with a lantern
 *  in her rigging. In front, the boards of the quay and two old harbour
 *  lamps, lit, and strung between them a line dressed with five flags,
 *  pegged on and stirring in the breeze, the sunset shining through them.
 *
 *  Painted once per screen size: the sky (`sky`), the sea and the land in
 *  front of it (`land`, clear above them, so the clouds sink behind the
 *  hills), then the quay, the lamps and the line (`front`). The clouds, the
 *  boat, the gulls, the glints, the lighthouse's beam, the lamps' glow and
 *  each flag's fluttering frames are their own textures, for the scene. */

const K = {
  sky: "fl_sky",
  land: "fl_land",
  front: "fl_front",
  boat: "fl_boat",
  gull: "fl_gull",
  glint: "fl_glint",
  glow: "fl_glow",
  beam: "fl_beam",
  star: "fl_star",
  veil: "fl_veil",
};
const CLOUD = "fl_cloud_";
const FLAG = "fl_flag_";
const CLOUDS = 4;
export const FLAG_FRAMES = 12;
const FRAME_COLS = 4; // frames laid out in a grid: a strip would outgrow what a GPU can hold
const R = 2; // the flags, the boat and the gulls are painted at twice their size

// each flag's own colours, as they are flown
const C = {
  black: "#1b1b1f",
  red: "#dd1c17",
  gold: "#ffcd1c",
  brGreen: "#0a9a44",
  brYellow: "#fedb1e",
  brBlue: "#10307e",
  ieGreen: "#169b62",
  orange: "#ff8a3d",
  white: "#fbfbf8",
  fiBlue: "#0a3a8c",
  ngGreen: "#088a4f",
};

// ── where everything is ─────────────────────────────────────────────────────

export function layoutHarbour(W, H, count) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 700);
  const horizon = H * 0.6;
  const postX = [W * 0.065, W * 0.935];
  const ropeY = H * 0.2;
  const sag = H * 0.085;
  const rope = (x) => {
    const t = Math.min(1, Math.max(0, (x - postX[0]) / (postX[1] - postX[0])));
    return ropeY + Math.sin(Math.PI * t) * sag;
  };
  const fw = Math.min(W * 0.125, 150 * u);
  const fh = fw * 0.62;
  const flags = [];
  for (let i = 0; i < count; i++) {
    const x = postX[0] + ((postX[1] - postX[0]) * (i + 1)) / (count + 1);
    flags.push({
      x,
      y: rope(x) + 1,
      angle: Math.atan2(rope(x + fw / 2) - rope(x - fw / 2), fw),
    });
  }
  const sunR = S * 0.058;
  return {
    W,
    H,
    S,
    u,
    horizon,
    pier: H * 0.845,
    postX,
    postW: Math.max(9, 15 * u),
    postTop: H * 0.175,
    ropeY,
    rope,
    fw,
    fh,
    flags,
    sun: { x: W * 0.64, y: horizon - sunR * 0.3, r: sunR },
    lighthouse: { x: W * 0.13, w: Math.max(14, W * 0.024), h: H * 0.115 },
    boat: { x: W * 0.42, y: H * 0.705 },
    // clouds heaped along the horizon, their feet behind the sea and the
    // hills, their tops well under the flags
    clouds: [
      { x: W * 0.2, y: horizon + H * 0.01, w: Math.min(W * 0.22, H * 0.34) },
      { x: W * 0.5, y: horizon + H * 0.008, w: Math.min(W * 0.15, H * 0.24) },
      { x: W * 0.84, y: horizon + H * 0.012, w: Math.min(W * 0.24, H * 0.36) },
      { x: W * 1.1, y: horizon + H * 0.008, w: Math.min(W * 0.13, H * 0.2) },
    ],
  };
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintHarbour(scene, W, H, codes) {
  const L = layoutHarbour(W, H, codes.length);
  const t = scene.textures;
  add(t, K.sky, paintSky(L));
  add(t, K.land, paintLand(L));
  add(t, K.front, paintFront(L));
  add(t, K.veil, paintVeil(L));
  add(t, K.glint, paintGlint());
  add(
    t,
    K.glow,
    radial(64, "255,206,130", [
      [0, 0.9],
      [0.25, 0.45],
      [0.6, 0.12],
      [1, 0],
    ]),
  );
  add(
    t,
    K.star,
    radial(16, "240,236,255", [
      [0, 1],
      [0.3, 0.45],
      [1, 0],
    ]),
  );
  add(t, K.beam, paintBeam());
  // nightfall on everything painted for the scene to move, too
  const boat = paintBoat(L.u);
  nightfall(boat.canvas, "78,74,110");
  add(t, K.boat, boat.canvas);
  const gulls = paintGulls();
  nightfall(gulls.canvas, "96,92,126");
  const gt = add(t, K.gull, gulls.canvas);
  for (let f = 0; f < 3; f++) gt.add(f, 0, f * gulls.fw, 0, gulls.fw, gulls.fh);
  const clouds = L.clouds.map((c, i) => {
    const art = paintCloud(c.w, 700 + i * 97);
    nightfall(art.canvas, "62,56,94");
    add(t, CLOUD + i, art.canvas);
    return { key: CLOUD + i, oy: art.oy, ...c };
  });
  const flags = codes.map((code, i) => {
    const art = paintFlagFrames(code, L.fw, L.fh);
    // the flags keep the lamps' warm light, the ones hanging nearest a lamp
    // the most, so every one of them still reads
    const tt = (i + 1) / (codes.length + 1);
    const b = 0.84 - 0.24 * ((Math.min(tt, 1 - tt) - 1 / 6) / (1 / 3));
    nightfall(art.canvas, `${Math.round(255 * b)},${Math.round(222 * b)},${Math.round(184 * b)}`);
    const ft = add(t, FLAG + i, art.canvas);
    for (let f = 0; f < FLAG_FRAMES; f++) {
      ft.add(
        f,
        0,
        (f % FRAME_COLS) * art.cw,
        Math.floor(f / FRAME_COLS) * art.ch,
        art.cw,
        art.ch,
      );
    }
    return { key: FLAG + i, oy: art.oy, ...L.flags[i] };
  });
  // stars that twinkle, all over the dark sky
  const rnd = lcg(3030);
  const stars = [];
  for (let i = 0; i < 30; i++) {
    stars.push({
      x: W * (0.03 + rnd() * 0.94),
      y: H * (0.03 + rnd() * 0.3),
      s: 0.6 + rnd() * 0.8,
    });
  }
  return {
    L,
    keys: K,
    res: R,
    boat: { ...L.boat, ox: boat.ox, oy: boat.oy, lantern: boat.lantern },
    lamps: L.postX.map((x) => ({ x, y: L.postTop - L.postW * 1.25 })),
    beacon: L.beacon,
    clouds,
    flags,
    stars,
  };
}

export function releaseHarbourArt(textures) {
  const keys = [...Object.values(K)];
  for (let i = 0; i < CLOUDS; i++) keys.push(CLOUD + i);
  for (let i = 0; i < 8; i++) keys.push(FLAG + i);
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

// ── the sky ─────────────────────────────────────────────────────────────────

// the last of the dusk, nearly night: deep indigo overhead going down
// through violet to a thin band of dying ember along the sea where the sun
// has gone; the stars out all over
function paintSky(L) {
  const { W, H, horizon, sun } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  for (const [o, col] of [
    [0, "#04050e"],
    [0.3, "#090b20"],
    [0.52, "#141433"],
    [0.7, "#241a40"],
    [0.84, "#3c2141"],
    [0.94, "#6a2f40"],
    [1, "#9a4a3c"],
  ])
    sky.addColorStop(o, col);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // what is left of the sun's glow, low along the horizon
  softEllipse(ctx, sun.x, horizon, W * 0.6, H * 0.14, "200,90,70", 0.22);
  softEllipse(ctx, sun.x, horizon, W * 0.24, H * 0.05, "255,150,90", 0.28);
  // the stars, fading out toward the glow
  const rnd = lcg(808);
  const n = Math.round((W * H) / 3200);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * horizon * 0.8;
    const a = (0.2 + rnd() * 0.65) * (1 - y / (horizon * 0.8));
    ctx.fillStyle = `rgba(235,236,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + rnd() * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.28;
  cirrus(ctx, L, lcg(909));
  ctx.globalAlpha = 1;
  return c;
}

// long streaks of high cloud, lit from underneath: pink high up, gold low
// down near the sun, a lavender shade along their tops
function cirrus(ctx, L, rnd) {
  const { W, H, horizon, sun } = L;
  for (let s = 0; s < 7; s++) {
    const y = H * (0.1 + rnd() * 0.36);
    const x0 = rnd() * W;
    const len = W * (0.25 + rnd() * 0.4);
    const t = y / horizon;
    const col =
      t > 0.62 ? "255,196,132" : t > 0.42 ? "255,152,150" : "226,132,176";
    for (let k = 0; k < 26; k++) {
      const px = x0 + (rnd() - 0.2) * len;
      const py = y + (rnd() - 0.5) * H * 0.012 + (px - x0) * 0.02;
      const near = Math.exp(-((px - sun.x) ** 2) / (2 * (W * 0.3) ** 2));
      softEllipse(
        ctx,
        px,
        py - H * 0.004,
        W * 0.035,
        H * 0.004,
        "70,48,112",
        0.07,
      );
      softEllipse(
        ctx,
        px,
        py,
        W * (0.03 + rnd() * 0.06),
        H * (0.003 + rnd() * 0.006),
        col,
        (0.12 + 0.2 * near) * (0.5 + t * 0.7),
      );
    }
  }
}

// ── the sea and the land ────────────────────────────────────────────────────

function paintLand(L) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const rnd = lcg(1515);
  L.lights = [];
  paintFarShore(ctx, L, rnd);
  paintSea(ctx, L, rnd);
  paintHeadland(ctx, L, rnd);
  // nightfall over the sea and the land; the village's lights and the
  // lighthouse's lamp stay lit through it
  nightfall(c, "66,60,98");
  for (const p of L.lights) {
    softEllipse(ctx, p.x, p.y, H * 0.009, H * 0.009, "255,200,120", 0.55);
    ctx.fillStyle = "rgba(255,238,178,0.95)";
    ctx.fillRect(p.x - 0.7, p.y - 0.7, 1.4, 1.4);
  }
  const b = L.beacon;
  if (b) {
    softEllipse(ctx, b.x, b.y, L.lighthouse.w * 1.6, L.lighthouse.w * 1.6, "255,210,140", 0.55);
    softEllipse(ctx, b.x, b.y, L.lighthouse.w * 0.5, L.lighthouse.w * 0.5, "255,244,210", 0.9);
  }
  return c;
}

// low hills far off on the right, violet in the haze, their ridges lit from
// behind; a village on the nearer one, its first lights on
function paintFarShore(ctx, L, rnd) {
  const { W, H, horizon } = L;
  const band = (x0, hgt, f1, f2, col, rim) => {
    const pts = [];
    for (let x = x0; x <= W + 4; x += 4) {
      const t = (x - x0) / (W - x0);
      pts.push([
        x,
        horizon -
          H *
            hgt *
            Math.min(1, t * 3) *
            (0.7 + 0.2 * Math.sin(t * f1 + 1.1) + 0.1 * Math.sin(t * f2)),
      ]);
    }
    ctx.beginPath();
    ctx.moveTo(x0, horizon + 1);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(W + 4, horizon + 1);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return pts;
  };
  band(W * 0.72, 0.05, 5.2, 13, "#8a5a8d", "rgba(255,190,150,0.55)");
  const near = band(
    W * 0.8,
    0.032,
    7.4,
    17,
    "#5d3f77",
    "rgba(255,170,130,0.5)",
  );
  for (let i = 0; i < 12; i++) {
    const [x, ty] = near[Math.floor((0.2 + rnd() * 0.75) * (near.length - 1))];
    const y = ty + (horizon - ty) * (0.35 + rnd() * 0.55);
    L.lights.push({ x, y });
    softEllipse(ctx, x, y, H * 0.006, H * 0.006, "255,205,120", 0.5);
    ctx.fillStyle = "rgba(255,236,170,0.95)";
    ctx.fillRect(x - 0.6, y - 0.6, 1.3, 1.3);
  }
}

// the sea holding the sky: gold at the horizon, rose, then deep violet close
// in; the sun's road of broken gold across it; the long swell
function paintSea(ctx, L, rnd) {
  const { W, H, S, horizon, sun } = L;
  const g = ctx.createLinearGradient(0, horizon, 0, H);
  for (const [o, col] of [
    [0, "#ffc27e"],
    [0.05, "#ef8f6c"],
    [0.2, "#b25b7c"],
    [0.45, "#693d77"],
    [0.75, "#35306a"],
    [1, "#1d2152"],
  ])
    g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, W, H - horizon);
  softEllipse(ctx, sun.x, horizon, W * 0.5, H * 0.06, "255,182,122", 0.45);
  softEllipse(
    ctx,
    sun.x,
    horizon + (H - horizon) * 0.3,
    S * 0.13,
    (H - horizon) * 0.6,
    "255,190,112",
    0.32,
  );
  // the swell: rose on its crests, violet in its troughs
  for (let i = 0; i < 90; i++) {
    const t = Math.pow(rnd(), 1.2);
    const y = horizon + 3 + t * (H - horizon) * 0.95;
    const x = rnd() * W;
    const len = (30 + t * 240) * (0.5 + rnd());
    ctx.strokeStyle =
      rnd() < 0.55
        ? `rgba(255,172,160,${(0.08 + 0.12 * (1 - t)).toFixed(3)})`
        : `rgba(28,18,70,${(0.12 + 0.1 * t).toFixed(3)})`;
    ctx.lineWidth = 1 + t * 2;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x, y - 1.5 - t * 3, x + len / 2, y);
    ctx.stroke();
  }
  // the sun's road: dashes of gold, widening toward us
  for (let i = 0; i < 700; i++) {
    const t = Math.pow(rnd(), 1.3);
    const y = horizon + 2 + t * (H - horizon - 4);
    const spread = S * (0.02 + t * 0.22);
    const x = sun.x + (rnd() + rnd() + rnd() - 1.5) * spread;
    const len = (3 + t * 26) * (0.4 + rnd());
    const a = (0.35 + rnd() * 0.5) * (1 - t * 0.4);
    ctx.fillStyle =
      rnd() < 0.3
        ? `rgba(255,246,216,${a.toFixed(3)})`
        : `rgba(255,196,110,${a.toFixed(3)})`;
    ctx.fillRect(x - len / 2, y, len, Math.max(1, t * 2.2));
  }
  ctx.fillStyle = "rgba(255,226,172,0.85)";
  ctx.fillRect(0, horizon - 0.5, W, 1.5);
}

// the headland on the left against the glow: a dark hump, its crest rimmed
// with the sunset, rocks at its foot, and the lighthouse, lit
function paintHeadland(ctx, L, rnd) {
  const { W, H, horizon, lighthouse } = L;
  const x1 = W * 0.36;
  const top = (x) => {
    const t = Math.max(0, x / x1);
    return (
      horizon -
      H *
        (0.09 * (1 - smooth01((t - 0.12) / 0.88)) +
          0.01 * Math.sin(t * 9) * (1 - t))
    );
  };
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(-4, horizon + H * 0.012);
    for (let x = -4; x <= x1; x += 3) ctx.lineTo(x, top(x));
    ctx.lineTo(x1 + 6, horizon + H * 0.01);
    ctx.closePath();
  };
  outline();
  const g = ctx.createLinearGradient(0, horizon - H * 0.1, 0, horizon);
  g.addColorStop(0, "#3b2a5f");
  g.addColorStop(1, "#231a43");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  outline();
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    const x = rnd() * x1;
    softEllipse(
      ctx,
      x,
      top(x) + H * (0.02 + rnd() * 0.05),
      W * 0.03,
      H * 0.012,
      "18,12,38",
      0.35,
    );
  }
  ctx.restore();
  ctx.beginPath();
  for (let x = 0; x <= x1; x += 3)
    x ? ctx.lineTo(x, top(x)) : ctx.moveTo(x, top(x));
  ctx.strokeStyle = "rgba(255,160,122,0.55)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const x = x1 * (0.35 + rnd() * 0.65);
    const y = horizon + H * 0.004;
    const r = H * (0.006 + rnd() * 0.01);
    ctx.fillStyle = "#281d45";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "rgba(255,170,120,0.5)";
    ctx.beginPath();
    ctx.ellipse(
      x + r * 0.5,
      y - r * 0.55,
      r * 0.7,
      r * 0.22,
      -0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,200,150,0.5)";
  ctx.fillRect(x1 * 0.3, horizon + H * 0.004, x1 * 0.7, Math.max(1, H * 0.002));
  L.beacon = paintLighthouse(
    ctx,
    lighthouse.x,
    top(lighthouse.x) + 2,
    lighthouse.w,
    lighthouse.h,
  );
}

// the lighthouse against the sunset: dark, its bands just showing, the sun
// along its right side — and the lamp in its lantern, just lit
function paintLighthouse(ctx, x, base, w, h) {
  const top = base - h * 0.74;
  const wt = w * 0.66;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, base);
    ctx.lineTo(x - wt / 2, top);
    ctx.lineTo(x + wt / 2, top);
    ctx.lineTo(x + w / 2, base);
    ctx.closePath();
  };
  const side = (a, b, c) => {
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, a);
    g.addColorStop(0.7, b);
    g.addColorStop(1, c);
    return g;
  };
  body();
  ctx.fillStyle = side("#2a2247", "#4a3b66", "#c98a86");
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  ctx.fillStyle = side("#3a1d38", "#62283f", "#b0524d");
  for (const f of [0.22, 0.56])
    ctx.fillRect(x - w, base - h * 0.74 * (f + 0.14), w * 2, h * 0.74 * 0.14);
  ctx.restore();
  ctx.fillStyle = "#1a1430";
  ctx.fillRect(x - w * 0.12, base - h * 0.18, w * 0.24, h * 0.18);
  ctx.fillStyle = "#231b3b";
  ctx.fillRect(x - wt * 0.75, top - h * 0.03, wt * 1.5, h * 0.035);
  const lr = {
    x0: x - wt * 0.36,
    x1: x + wt * 0.36,
    y0: top - h * 0.14,
    y1: top - h * 0.03,
  };
  const lamp = { x, y: (lr.y0 + lr.y1) / 2 };
  softEllipse(ctx, lamp.x, lamp.y, w * 2.4, w * 2.4, "255,214,140", 0.45);
  const gl = ctx.createLinearGradient(0, lr.y0, 0, lr.y1);
  gl.addColorStop(0, "#fff6d0");
  gl.addColorStop(1, "#ffcf78");
  ctx.fillStyle = gl;
  ctx.fillRect(lr.x0, lr.y0, lr.x1 - lr.x0, lr.y1 - lr.y0);
  ctx.fillStyle = "#231b3b";
  ctx.fillRect(x - 0.6, lr.y0, 1.2, lr.y1 - lr.y0);
  ctx.fillStyle = "#2c2046";
  ctx.beginPath();
  ctx.moveTo(x - wt * 0.5, lr.y0);
  ctx.quadraticCurveTo(x - wt * 0.1, lr.y0 - h * 0.07, x, lr.y0 - h * 0.1);
  ctx.quadraticCurveTo(x + wt * 0.1, lr.y0 - h * 0.07, x + wt * 0.5, lr.y0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,170,130,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, lr.y0 - h * 0.1);
  ctx.quadraticCurveTo(x + wt * 0.1, lr.y0 - h * 0.07, x + wt * 0.5, lr.y0);
  ctx.stroke();
  return lamp;
}

// ── the quay, the lamps and the line ────────────────────────────────────────

function paintFront(L) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const rnd = lcg(4242);
  paintPier(ctx, L, rnd);
  for (const x of L.postX) postShadow(ctx, L, x);
  paintCoil(ctx, L, W * 0.86, H * 0.945);
  paintLine(ctx, L);
  for (const x of L.postX) paintLampPost(ctx, L, x);
  paintLifeRing(ctx, L, L.postX[0] + L.postW * 0.62, H * 0.52);
  // nightfall on the quay; what light there is comes from the two lamps:
  // down their columns, along the line near them, pooled on the boards
  nightfall(c, "92,84,118");
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  for (const x of L.postX) {
    const ly = L.postTop - L.postW * 1.25;
    softEllipse(ctx, x, ly, L.postW * 4, L.postW * 4, "255,214,150", 0.6);
    softEllipse(ctx, x, ly + H * 0.1, L.postW * 9, H * 0.22, "255,190,115", 0.32);
    softEllipse(ctx, x, H * 0.925, W * 0.17, H * 0.07, "255,184,105", 0.42);
  }
  ctx.restore();
  return c;
}

// the quay's boards, each a little deeper as it comes toward us: their tops
// catching the last of the sun, the lamps pooling gold on them
function paintPier(ctx, L, rnd) {
  const { W, H, pier, sun } = L;
  let y = pier;
  let bh = H * 0.021;
  while (y < H + 2) {
    const k = 0.86 + rnd() * 0.22;
    const g = ctx.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, rgb(236 * k, 150 * k, 104 * k));
    g.addColorStop(0.22, rgb(150 * k, 90 * k, 70 * k));
    g.addColorStop(1, rgb(78 * k, 44 * k, 44 * k));
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, bh);
    for (let i = 0; i < Math.round(bh / 3); i++) {
      const gy = y + bh * (0.2 + rnd() * 0.75);
      ctx.strokeStyle =
        rnd() < 0.6 ? "rgba(50,20,24,0.25)" : "rgba(255,200,160,0.12)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const gx = rnd() * W;
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(
        gx + W * 0.15,
        gy + (rnd() - 0.5) * 2,
        gx + W * (0.2 + rnd() * 0.3),
        gy,
      );
      ctx.stroke();
    }
    for (let j = 0; j < 2; j++) {
      const jx = rnd() * W;
      ctx.fillStyle = "rgba(40,16,20,0.8)";
      ctx.fillRect(jx, y + 1, Math.max(1.2, bh * 0.06), bh - 2);
      ctx.fillStyle = "rgba(40,30,40,0.7)";
      for (const ny of [0.3, 0.7]) {
        ctx.beginPath();
        ctx.arc(
          jx + bh * 0.2,
          y + bh * ny,
          Math.max(0.8, bh * 0.05),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(34,14,20,0.9)";
    ctx.fillRect(
      0,
      y + bh - Math.max(1.4, bh * 0.07),
      W,
      Math.max(1.4, bh * 0.07),
    );
    y += bh;
    bh *= 1.3;
  }
  // the sunset on the boards, strongest toward the sun, and the lamps' pools
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softEllipse(ctx, sun.x, pier, W * 0.45, (H - pier) * 0.8, "255,130,70", 0.16);
  for (const x of L.postX)
    softEllipse(ctx, x, H * 0.93, W * 0.12, H * 0.06, "255,190,110", 0.3);
  ctx.restore();
  const eb = H * 0.012;
  ctx.fillStyle = "#5e3326";
  ctx.fillRect(0, pier - eb, W, eb + 1);
  ctx.fillStyle = "rgba(255,196,150,0.85)";
  ctx.fillRect(0, pier - eb, W, Math.max(1, eb * 0.25));
  const dusk = ctx.createLinearGradient(0, pier, 0, H);
  dusk.addColorStop(0, "rgba(30,20,60,0)");
  dusk.addColorStop(1, "rgba(30,20,60,0.35)");
  ctx.fillStyle = dusk;
  ctx.fillRect(0, pier, W, H - pier);
}

// each lamp's long evening shadow, falling toward us, away from the sun
function postShadow(ctx, L, x) {
  const { H, postW, sun } = L;
  const foot = H * 0.935;
  const dir = x < sun.x ? -1 : 1;
  ctx.fillStyle = "rgba(24,12,36,0.32)";
  ctx.beginPath();
  ctx.moveTo(x - postW * 1.1, foot + 1);
  ctx.lineTo(x + postW * 1.1, foot + 1);
  ctx.lineTo(x + dir * postW * 7 + postW * 1.2, H + 8);
  ctx.lineTo(x + dir * postW * 7 - postW * 1.6, H + 8);
  ctx.closePath();
  ctx.fill();
}

// an old harbour lamp: a fluted iron column on a stepped foot, a collar
// halfway up, a lantern on top — lit now; the sunset along its sunward side
function paintLampPost(ctx, L, x) {
  const { H, postW: w, postTop, sun } = L;
  const foot = H * 0.935;
  const right = x < sun.x; // the rim of light on the side toward the sun
  const iron = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    const stops = [
      [0, "#0f1418"],
      [0.45, "#1b2b2c"],
      [0.78, "#2c3f3c"],
      [0.9, "#ffb287"],
      [1, "#3a3b40"],
    ];
    for (const [o, col] of stops) g.addColorStop(right ? o : 1 - o, col);
    return g;
  };
  ctx.fillStyle = iron(x - w * 1.3, x + w * 1.3);
  roundRect(ctx, x - w * 1.3, foot - H * 0.03, w * 2.6, H * 0.03, w * 0.2);
  ctx.fill();
  ctx.fillStyle = iron(x - w * 0.95, x + w * 0.95);
  roundRect(ctx, x - w * 0.95, foot - H * 0.055, w * 1.9, H * 0.027, w * 0.2);
  ctx.fill();
  const column = () => {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.55, foot - H * 0.055);
    ctx.lineTo(x - w * 0.4, postTop);
    ctx.lineTo(x + w * 0.4, postTop);
    ctx.lineTo(x + w * 0.55, foot - H * 0.055);
    ctx.closePath();
  };
  column();
  ctx.fillStyle = iron(x - w * 0.55, x + w * 0.55);
  ctx.fill();
  ctx.save();
  column();
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  for (const f of [-0.2, 0.05, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(x + f * w, postTop);
    ctx.lineTo(x + f * w * 1.3, foot);
    ctx.stroke();
  }
  // the lamp's own light down its top
  const down = ctx.createLinearGradient(0, postTop, 0, postTop + H * 0.12);
  down.addColorStop(0, "rgba(255,196,120,0.4)");
  down.addColorStop(1, "rgba(255,196,120,0)");
  ctx.fillStyle = down;
  ctx.fillRect(x - w, postTop, w * 2, H * 0.12);
  ctx.restore();
  for (const [y, s] of [
    [foot - H * 0.3, 1.25],
    [postTop + w * 0.3, 1.15],
  ]) {
    ctx.fillStyle = iron(x - w * 0.6 * s, x + w * 0.6 * s);
    roundRect(
      ctx,
      x - w * 0.6 * s,
      y - w * 0.3,
      w * 1.2 * s,
      w * 0.6,
      w * 0.25,
    );
    ctx.fill();
  }
  // the lantern: glass full of warm light, a flame inside
  const lw = w * 2.1;
  const lh = w * 2.6;
  const ly = postTop - lh;
  softEllipse(ctx, x, ly + lh * 0.5, lw * 2.2, lw * 2.2, "255,200,120", 0.4);
  ctx.fillStyle = iron(x - lw * 0.55, x + lw * 0.55);
  ctx.fillRect(x - lw * 0.55, postTop - w * 0.25, lw * 1.1, w * 0.3);
  const glass = ctx.createLinearGradient(0, ly, 0, postTop);
  glass.addColorStop(0, "#fff0bf");
  glass.addColorStop(1, "#ffb95e");
  ctx.fillStyle = glass;
  ctx.fillRect(x - lw / 2, ly, lw, lh - w * 0.25);
  softEllipse(ctx, x, ly + lh * 0.55, lw * 0.32, lh * 0.3, "255,255,235", 0.9);
  ctx.strokeStyle = "#141a1d";
  ctx.lineWidth = Math.max(1.2, w * 0.14);
  ctx.strokeRect(x - lw / 2, ly, lw, lh - w * 0.25);
  ctx.beginPath();
  ctx.moveTo(x, ly);
  ctx.lineTo(x, postTop - w * 0.25);
  ctx.stroke();
  ctx.fillStyle = iron(x - lw * 0.7, x + lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(x - lw * 0.7, ly + 1);
  ctx.quadraticCurveTo(x - lw * 0.2, ly - lh * 0.25, x, ly - lh * 0.42);
  ctx.quadraticCurveTo(x + lw * 0.2, ly - lh * 0.25, x + lw * 0.7, ly + 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, ly - lh * 0.46, w * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,210,150,0.55)";
  ctx.fillRect(x - lw * 0.7, ly, lw * 1.4, 1);
}

// the line the flags are pegged to: a hemp rope from lamp to lamp, sagging,
// its twist catching the sunset, wound twice round each column
function paintLine(ctx, L) {
  const { u, rope, postX, postW } = L;
  const x0 = postX[0];
  const x1 = postX[1];
  const lw = Math.max(2, 3 * u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = (dy) => {
    ctx.beginPath();
    ctx.moveTo(x0, rope(x0) + dy);
    for (let x = x0 + 3; x <= x1; x += 3) ctx.lineTo(x, rope(x) + dy);
  };
  path(0);
  ctx.strokeStyle = "#7e5436";
  ctx.lineWidth = lw;
  ctx.stroke();
  path(-lw * 0.22);
  ctx.strokeStyle = "rgba(255,196,150,0.75)";
  ctx.lineWidth = Math.max(0.8, lw * 0.3);
  ctx.stroke();
  ctx.strokeStyle = "rgba(44,22,16,0.55)";
  ctx.lineWidth = Math.max(0.7, lw * 0.25);
  for (let x = x0 + 3; x < x1; x += lw * 1.6) {
    const y = rope(x);
    ctx.beginPath();
    ctx.moveTo(x - lw * 0.3, y - lw * 0.45);
    ctx.lineTo(x + lw * 0.3, y + lw * 0.45);
    ctx.stroke();
  }
  for (const x of postX) {
    for (let i = 0; i < 2; i++) {
      const y = L.ropeY - lw * 0.6 + i * lw * 1.1;
      ctx.strokeStyle = "#8e6140";
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, postW * 0.58, lw * 0.5, -0.12, 0, Math.PI);
      ctx.stroke();
    }
  }
}

// a life ring hanging on its hook, warm under the lamp above it
function paintLifeRing(ctx, L, x, y) {
  const { H } = L;
  const R0 = H * 0.042;
  const r0 = R0 * 0.55;
  const cy = y + R0 * 0.9;
  ctx.strokeStyle = "#141a1d";
  ctx.lineWidth = Math.max(1.5, R0 * 0.1);
  ctx.beginPath();
  ctx.moveTo(x - 1, y - R0 * 0.1);
  ctx.quadraticCurveTo(x + R0 * 0.3, y, x + R0 * 0.1, y + R0 * 0.22);
  ctx.stroke();
  softEllipse(
    ctx,
    x - R0 * 0.15,
    cy + R0 * 0.1,
    R0 * 1.15,
    R0 * 1.1,
    "0,0,0",
    0.25,
  );
  for (let q = 0; q < 8; q++) {
    const a0 = (q / 8) * Math.PI * 2 - Math.PI / 2;
    const a1 = a0 + Math.PI / 4 + 0.01;
    ctx.fillStyle = q % 2 ? "#eadacb" : "#c23a2f";
    ctx.beginPath();
    ctx.arc(x, cy, R0, a0, a1);
    ctx.arc(x, cy, r0, a1, a0, true);
    ctx.closePath();
    ctx.fill();
  }
  const sh = ctx.createLinearGradient(x, cy - R0, x, cy + R0);
  sh.addColorStop(0, "rgba(255,210,150,0.25)");
  sh.addColorStop(0.5, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(30,16,50,0.4)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(x, cy, R0, 0, Math.PI * 2);
  ctx.arc(x, cy, r0, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.strokeStyle = "#b8895c";
  ctx.lineWidth = Math.max(1, R0 * 0.07);
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(a) * (R0 + r0) * 0.5,
      cy + Math.sin(a) * (R0 + r0) * 0.5,
      (R0 - r0) * 0.62,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
}

// a coil of rope lying on the boards
function paintCoil(ctx, L, x, y) {
  const { H } = L;
  const R0 = H * 0.05;
  softEllipse(
    ctx,
    x - R0 * 0.3,
    y + R0 * 0.12,
    R0 * 1.4,
    R0 * 0.5,
    "24,12,36",
    0.45,
  );
  for (let i = 0; i < 5; i++) {
    const r = R0 * (1 - i * 0.16);
    ctx.strokeStyle = i % 2 ? "#8c6040" : "#a8744c";
    ctx.lineWidth = Math.max(2, R0 * 0.16);
    ctx.beginPath();
    ctx.ellipse(x, y - i * R0 * 0.07, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,196,150,0.6)";
  ctx.lineWidth = Math.max(0.8, R0 * 0.05);
  ctx.beginPath();
  ctx.ellipse(x, y - R0 * 0.3, R0 * 0.5, R0 * 0.18, 0, -0.9, 0.4);
  ctx.stroke();
}

// ── the moving things ───────────────────────────────────────────────────────

// a little sailing boat at anchor against the sunset: dark hull, rimmed with
// light; her sails glowing with the sun behind them; a lit porthole and a
// lantern in her rigging. Twice size; origin on the waterline under the mast
function paintBoat(u) {
  const w = 120;
  const h = 170;
  const c = makeCanvas(w * u * R, h * u * R);
  const g = c.getContext("2d");
  g.scale(u * R, u * R);
  const wl = 128;
  const mx = 58;
  // her reflection, broken by the swell, and the lantern's
  for (let y = 0; y < 30; y += 3) {
    const k = 1 - y / 30;
    g.fillStyle = `rgba(20,14,50,${(0.45 * k).toFixed(3)})`;
    g.fillRect(mx - 40 * k + (y % 2 ? 3 : -3), wl + 2 + y, 80 * k, 1.6);
    g.fillStyle = `rgba(255,200,120,${(0.5 * k).toFixed(3)})`;
    g.fillRect(mx + 3 - 3 * k + (y % 2 ? 1.5 : -1.5), wl + 3 + y, 6 * k, 1.4);
  }
  const hull = () => {
    g.beginPath();
    g.moveTo(14, wl - 12);
    g.lineTo(104, wl - 13);
    g.quadraticCurveTo(98, wl - 2, 86, wl + 1);
    g.lineTo(28, wl + 1);
    g.quadraticCurveTo(18, wl - 3, 14, wl - 12);
    g.closePath();
  };
  hull();
  const hg = g.createLinearGradient(0, wl - 13, 0, wl + 1);
  hg.addColorStop(0, "#3d3a68");
  hg.addColorStop(1, "#1f1d42");
  g.fillStyle = hg;
  g.fill();
  g.save();
  hull();
  g.clip();
  g.fillStyle = "#6a4a7a";
  g.fillRect(0, wl - 7, w, 2.5);
  g.restore();
  g.fillStyle = "rgba(255,180,140,0.9)";
  g.fillRect(16, wl - 13, 88, 1.2);
  g.fillStyle = "#4a2e36";
  g.fillRect(40, wl - 19, 30, 7);
  g.fillStyle = "rgba(255,180,140,0.8)";
  g.fillRect(40, wl - 19, 30, 1.2);
  g.fillStyle = "#ffd88c";
  g.beginPath();
  g.arc(50, wl - 15.5, 1.6, 0, Math.PI * 2);
  g.arc(60, wl - 15.5, 1.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2a1c30";
  g.fillRect(mx - 1.2, wl - 118, 2.4, 106);
  g.fillRect(mx - 34, wl - 22, 36, 2);
  const sail = (pts, a, b) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    g.lineTo(pts[3][0], pts[3][1]);
    g.closePath();
    const sg = g.createLinearGradient(pts[3][0], 0, pts[2][0], 0);
    sg.addColorStop(0, a);
    sg.addColorStop(1, b);
    g.fillStyle = sg;
    g.fill();
  };
  sail(
    [
      [mx - 2, wl - 114],
      [mx - 18, wl - 60],
      [mx - 33, wl - 25],
      [mx - 2, wl - 25],
    ],
    "#f2a888",
    "#ffd2a8",
  );
  sail(
    [
      [mx + 2, wl - 110],
      [mx + 24, wl - 62],
      [mx + 44, wl - 16],
      [mx + 2, wl - 22],
    ],
    "#ffdcb4",
    "#f5a07e",
  );
  g.strokeStyle = "rgba(160,80,80,0.35)";
  g.lineWidth = 0.6;
  for (const k of [0.3, 0.55, 0.8]) {
    g.beginPath();
    g.moveTo(mx + 2, wl - 110 + 88 * k);
    g.lineTo(mx + 2 + 42 * k, wl - 110 + 94 * k);
    g.stroke();
  }
  // the lantern in her rigging
  const lx = mx + 3;
  const ly = wl - 66;
  g.fillStyle = "#2a1c30";
  g.fillRect(lx - 1.8, ly - 2.5, 3.6, 5);
  g.fillStyle = "#fff0b8";
  g.fillRect(lx - 1.2, ly - 1.8, 2.4, 3.6);
  return {
    canvas: c,
    ox: mx / w,
    oy: wl / h,
    lantern: { dx: (lx - mx) * u, dy: (ly - wl) * u },
  };
}

// a gull on the wing against the sunset: a dark shape, its wings' leading
// edges lit; three frames of a wingbeat side by side, twice size
function paintGulls() {
  const fw = 44 * R;
  const fh = 24 * R;
  const c = makeCanvas(fw * 3, fh);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.lineCap = "round";
  g.lineJoin = "round";
  [-0.55, 0, 0.35].forEach((lift, f) => {
    const cx = 22 + f * 44;
    const cy = 13;
    const wing = (s) => {
      g.strokeStyle = "#2c2244";
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(
        cx + s * 7,
        cy - 6 + lift * 10,
        cx + s * 17,
        cy - 2 + lift * 14,
      );
      g.stroke();
      g.strokeStyle = "rgba(255,176,140,0.8)";
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(cx + s * 1, cy - 1.2);
      g.quadraticCurveTo(
        cx + s * 7,
        cy - 7.2 + lift * 10,
        cx + s * 15,
        cy - 3.6 + lift * 13,
      );
      g.stroke();
    };
    wing(-1);
    wing(1);
    g.fillStyle = "#2c2244";
    g.beginPath();
    g.ellipse(cx, cy + 0.6, 4.2, 1.9, 0, 0, Math.PI * 2);
    g.fill();
  });
  return { canvas: c, fw, fh };
}

// A cumulus far off over the sea at sundown: a heap of round puffs, lit from
// underneath — gold and rose along the base and the undersides, lavender
// and violet above. Its origin is the middle of its base.
function paintCloud(w, seed) {
  const h = w * 0.5;
  const pad = Math.ceil(w * 0.06);
  const c = makeCanvas(w + pad * 2, h + pad * 2);
  const g = c.getContext("2d");
  g.translate(pad, pad);
  const rnd = lcg(seed);
  const base = h * 0.94;
  const puffs = [];
  const nb = 7;
  for (let i = 0; i < nb; i++) {
    const t = (i + 0.5) / nb;
    const r = h * (0.12 + 0.06 * Math.sin(Math.PI * t)) * (0.9 + rnd() * 0.2);
    puffs.push({ x: w * (0.07 + t * 0.86), y: base - r, r });
  }
  const nt = 6;
  for (let i = 0; i < nt; i++) {
    const t = (i + 0.5) / nt;
    const s = Math.sin(Math.PI * t);
    const r = h * (0.16 + 0.2 * s) * (0.85 + rnd() * 0.3);
    puffs.push({
      x: w * (0.14 + t * 0.72) + (rnd() - 0.5) * w * 0.03,
      y: base - h * (0.18 + 0.4 * s) + (rnd() - 0.5) * h * 0.05,
      r,
    });
  }
  puffs.push({ x: w * (0.44 + rnd() * 0.12), y: base - h * 0.72, r: h * 0.22 });
  g.save();
  g.beginPath();
  for (const p of puffs) {
    g.moveTo(p.x + p.r, p.y);
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  }
  g.clip();
  const body = g.createLinearGradient(0, base - h, 0, base);
  body.addColorStop(0, "#6d5a92");
  body.addColorStop(0.5, "#a4739f");
  body.addColorStop(0.85, "#ec8f7d");
  body.addColorStop(1, "#ffb77c");
  g.fillStyle = body;
  g.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
  for (const p of puffs)
    softEllipse(
      g,
      p.x - p.r * 0.3,
      p.y - p.r * 0.35,
      p.r * 0.9,
      p.r * 0.7,
      "58,42,100",
      0.28,
    );
  for (const p of puffs)
    softEllipse(
      g,
      p.x + p.r * 0.1,
      p.y + p.r * 0.55,
      p.r * 0.85,
      p.r * 0.42,
      "255,182,122",
      0.45,
    );
  softEllipse(g, w / 2, base, w * 0.48, h * 0.1, "255,214,150", 0.55);
  g.restore();
  return { canvas: c, oy: (pad + base) / (h + pad * 2) };
}

// a glint on the water: a small four-pointed star of gold light
function paintGlint() {
  const s = 24;
  const m = s / 2;
  const c = makeCanvas(s, s);
  const g = c.getContext("2d");
  const glow = g.createRadialGradient(m, m, 0, m, m, m * 0.5);
  glow.addColorStop(0, "rgba(255,236,190,0.9)");
  glow.addColorStop(1, "rgba(255,236,190,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, s, s);
  g.fillStyle = "rgba(255,248,226,0.95)";
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? m * (i % 4 === 0 ? 0.6 : 0.95) : m * 0.12;
    const x = m + Math.cos(a) * r;
    const y = m + Math.sin(a) * r;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  return c;
}

// the lighthouse's beam: a long soft cone of light, from its left end
function paintBeam() {
  const w = 512;
  const h = 128;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  for (let k = 0; k < 6; k++) {
    const spread = h * (0.08 + k * 0.08);
    const lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, `rgba(255,236,196,${(0.42 - k * 0.06).toFixed(3)})`);
    lg.addColorStop(0.55, `rgba(255,226,180,${(0.14 - k * 0.02).toFixed(3)})`);
    lg.addColorStop(1, "rgba(255,236,196,0)");
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(0, h / 2 - 2);
    g.lineTo(w, h / 2 - spread);
    g.lineTo(w, h / 2 + spread);
    g.lineTo(0, h / 2 + 2);
    g.closePath();
    g.fill();
  }
  return c;
}

// the dusk over everything: a warm haze low on the horizon, violet at the
// edges of the frame
function paintVeil(L) {
  const { W, H, S, sun, horizon } = L;
  const c = makeCanvas(W / 4, H / 4);
  const ctx = c.getContext("2d");
  ctx.scale(c.width / W, c.height / H);
  softEllipse(ctx, sun.x, horizon, W * 0.4, H * 0.08, "200,100,80", 0.05);
  const v = ctx.createRadialGradient(
    W * 0.55,
    H * 0.5,
    S * 0.4,
    W / 2,
    H / 2,
    Math.hypot(W, H) * 0.66,
  );
  v.addColorStop(0, "rgba(30,16,60,0)");
  v.addColorStop(1, "rgba(6,5,18,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

// ── the flags ───────────────────────────────────────────────────────────────

// one flag's design, flat, in a w × h box
function paintDesign(g, code, w, h) {
  const band = (col, x, y, bw, bh) => {
    g.fillStyle = col;
    g.fillRect(x, y, bw, bh);
  };
  switch (code) {
    case "DE":
      band(C.black, 0, 0, w, h / 3 + 0.5);
      band(C.red, 0, h / 3, w, h / 3 + 0.5);
      band(C.gold, 0, (2 * h) / 3, w, h / 3);
      break;
    case "BR": {
      band(C.brGreen, 0, 0, w, h);
      g.fillStyle = C.brYellow;
      g.beginPath();
      g.moveTo(w / 2, h * 0.1);
      g.lineTo(w * 0.915, h / 2);
      g.lineTo(w / 2, h * 0.9);
      g.lineTo(w * 0.085, h / 2);
      g.closePath();
      g.fill();
      const r = h * 0.25;
      g.fillStyle = C.brBlue;
      g.beginPath();
      g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.beginPath();
      g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      g.clip();
      g.strokeStyle = C.white;
      g.lineWidth = r * 0.2;
      g.beginPath();
      g.arc(
        w / 2 - r * 0.25,
        h / 2 + r * 1.9,
        r * 2.05,
        -Math.PI * 0.72,
        -Math.PI * 0.2,
      );
      g.stroke();
      g.fillStyle = C.white;
      const rnd = lcg(1889);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * r * 0.85;
        const x = w / 2 + Math.cos(a) * d;
        const y = h / 2 + Math.sin(a) * d;
        if (y < h / 2 - r * 0.05 && rnd() < 0.7) continue;
        g.beginPath();
        g.arc(x, y, Math.max(0.6, r * 0.045), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      break;
    }
    case "IE":
      band(C.ieGreen, 0, 0, w / 3 + 0.5, h);
      band(C.white, w / 3, 0, w / 3 + 0.5, h);
      band(C.orange, (2 * w) / 3, 0, w / 3, h);
      break;
    case "FI": {
      band(C.white, 0, 0, w, h);
      g.fillStyle = C.fiBlue;
      const u = w / 18;
      g.fillRect(5 * u, 0, 3 * u, h);
      g.fillRect(0, (4 / 11) * h, w, (3 / 11) * h);
      break;
    }
    case "NG":
      band(C.ngGreen, 0, 0, w / 3 + 0.5, h);
      band(C.white, w / 3, 0, w / 3 + 0.5, h);
      band(C.ngGreen, (2 * w) / 3, 0, w / 3, h);
      break;
    default:
      band(C.white, 0, 0, w, h);
  }
}

// A flag pegged by its top corners, stirring, with the sunset behind it: the
// light comes through the cloth, so it glows where it hangs flat to us and
// darkens where it turns away in a fold; the evening warms its colours but
// never so far that it can't be told. FLAG_FRAMES frames of it, in a grid
// FRAME_COLS wide; each frame's origin is the middle of the cloth's top
// edge, `oy` down it.
function paintFlagFrames(code, fw, fh) {
  const dw = Math.ceil(fw * R);
  const dh = Math.ceil(fh * R);
  const d = makeCanvas(dw, dh);
  paintDesign(d.getContext("2d"), code, dw, dh);
  const top = Math.ceil(dh * 0.2);
  const side = Math.ceil(dw * 0.04);
  const cw = dw + side * 2;
  const ch = dh + top + Math.ceil(dh * 0.04);
  const rows = Math.ceil(FLAG_FRAMES / FRAME_COLS);
  const c = makeCanvas(cw * FRAME_COLS, ch * rows);
  const g = c.getContext("2d");
  const fold = (u, ph) =>
    0.62 * Math.sin(u * Math.PI * 3.2 + ph) +
    0.28 * Math.sin(u * Math.PI * 6.6 - ph * 1.5 + 1.3);
  for (let f = 0; f < FLAG_FRAMES; f++) {
    const ph = (f / FLAG_FRAMES) * Math.PI * 2;
    const fx = (f % FRAME_COLS) * cw;
    const fy = Math.floor(f / FRAME_COLS) * ch;
    const ox = fx + side;
    const oy = fy + top;
    g.save();
    g.beginPath();
    g.rect(fx, fy, cw, ch);
    g.clip();
    const step = 2;
    for (let x = 0; x < dw; x += step) {
      const u = x / dw;
      const k = fold(u, ph);
      const slope = (fold(u + 0.01, ph) - fold(u - 0.01, ph)) / 0.02 / 12;
      const colH = dh * (0.955 + 0.045 * (0.5 + 0.5 * k));
      g.drawImage(d, x, 0, step, dh, ox + x, oy, step, colH);
      // turned toward the light behind, the cloth glows; turned away, it darkens
      const s = Math.max(-1, Math.min(1, slope));
      g.fillStyle =
        s > 0
          ? `rgba(255,226,180,${(0.2 * s).toFixed(3)})`
          : `rgba(30,16,60,${(0.3 * -s).toFixed(3)})`;
      g.fillRect(ox + x, oy, step, colH);
    }
    g.globalCompositeOperation = "source-atop";
    // the evening on it: a little warmer, a little dimmer at the edges, and
    // the sunset glowing through the middle of the cloth
    g.fillStyle = "rgba(255,150,90,0.08)";
    g.fillRect(ox, oy, dw, dh);
    const glow = g.createRadialGradient(
      ox + dw * 0.55,
      oy + dh * 0.55,
      0,
      ox + dw * 0.55,
      oy + dh * 0.55,
      dw * 0.62,
    );
    glow.addColorStop(0, "rgba(255,236,200,0.14)");
    glow.addColorStop(0.6, "rgba(255,236,200,0.04)");
    glow.addColorStop(1, "rgba(30,16,60,0.14)");
    g.fillStyle = glow;
    g.fillRect(ox, oy, dw, dh);
    g.fillStyle = "rgba(0,0,0,0.16)";
    g.fillRect(ox, oy, dw, Math.max(2, dh * 0.035));
    g.globalCompositeOperation = "source-over";
    // a bright thread along its lower edge where the light comes round it
    g.fillStyle = "rgba(255,210,160,0.35)";
    for (let x = 0; x < dw; x += step) {
      const k = fold(x / dw, ph);
      g.fillRect(
        ox + x,
        oy + dh * (0.955 + 0.045 * (0.5 + 0.5 * k)) - 1,
        step,
        1,
      );
    }
    for (const px of [0.1, 0.9]) {
      const pw = Math.max(5, dw * 0.045);
      const ph2 = dh * 0.3;
      const x = ox + dw * px - pw / 2;
      const y = oy - ph2 * 0.55;
      const pg = g.createLinearGradient(x, 0, x + pw, 0);
      pg.addColorStop(0, "#8e6444");
      pg.addColorStop(0.6, "#d8a47a");
      pg.addColorStop(1, "#f6c89c");
      g.fillStyle = pg;
      roundRect(g, x, y, pw, ph2, pw * 0.35);
      g.fill();
      g.fillStyle = "rgba(60,30,20,0.55)";
      g.fillRect(
        x + pw * 0.46,
        y + ph2 * 0.08,
        Math.max(1, pw * 0.1),
        ph2 * 0.84,
      );
      g.fillStyle = "#8a8490";
      g.fillRect(
        x - pw * 0.05,
        y + ph2 * 0.45,
        pw * 1.1,
        Math.max(1.5, ph2 * 0.08),
      );
    }
    g.restore();
  }
  return { canvas: c, cw, ch, oy: top / ch };
}

// ── helpers ─────────────────────────────────────────────────────────────────

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

// nightfall on a painted layer: every colour multiplied down by `rgbs`
// ("r,g,b", 255 leaves a channel as it is), its transparency kept as it was
function nightfall(canvas, rgbs) {
  const keep = makeCanvas(canvas.width, canvas.height);
  keep.getContext("2d").drawImage(canvas, 0, 0);
  const g = canvas.getContext("2d");
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = `rgb(${rgbs})`;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(keep, 0, 0);
  g.restore();
}

function softEllipse(ctx, cx, cy, rx, ry, rgbs, a) {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
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

const rgb = (r, g, b) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const smooth01 = (v) => {
  const t = v < 0 ? 0 : v > 1 ? 1 : v;
  return t * t * (3 - 2 * t);
};

// painted on the CPU: drawn once and handed to WebGL as a plain copy
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
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
