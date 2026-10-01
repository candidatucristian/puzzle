import { makeTrack } from "./track.js";
import { CAR_LENGTH_M } from "./cars.js";

/** The stage for RALLY, painted as a real night rather than a sketch: the
 *  finish of a floodlit gravel oval cut into a pine forest. Like the office
 *  of OVERTIME, the ground is not drawn but lit: every pixel below the
 *  horizon is a point on the ground plane of the track's own projection
 *  (track.js), given its material — packed gravel, tyre tracks, loose stones
 *  at the edges, grass, the chequered line — and lit by the actual lamps:
 *  two masts in the infield either side of the line, two across the oval by
 *  the trees, two behind the camera, and the moon.
 *
 *  The light the lamps add is painted apart from the moonlit ground, onto a
 *  layer the scene lays over it additively, so when the stage closes the
 *  floodlights really go out and the gravel is left under the moon. The
 *  haze the beams cut through is a third layer, ray-marched from the camera
 *  through each lamp's cone.
 *
 *  Everything is sized in metres through the car: a car is CAR_LENGTH_M
 *  long, so a person, a hay bale or a 22 m mast stands at its true size for
 *  where it is. What moves — cars, people, the marshal's flag, the glare of
 *  the lamps, the stars — is the scene's; this module paints the rest once
 *  per screen size and says where everything is. */

const K = {
  sky: "ry_sky",
  moon: "ry_moon",
  dome: "ry_dome",
  land: "ry_land",
  landLit: "ry_land_lit",
  haze: "ry_haze",
  props: "ry_props",
  front: "ry_front",
  veil: "ry_veil",
  star: "ry_star",
  glow: "ry_glow",
  dust: "ry_dust",
};

/** Each car's line across the track: units off the racing line, + toward
 *  us. The close pairs run one near, one far, so they never hide each other. */
export const CAR_LANES = [0, -1, 1, -0.5, 0.8, -0.8].map((k) => k * 0.46);

const WARM = [1.0, 0.84, 0.64];
const MOON = [0.6, 0.72, 1.0];
const FINISH_LIGHT = 0.85; // the gravel at the line, in linear light
const DEG = Math.PI / 180;

// ── where everything is ─────────────────────────────────────────────────────

export function layoutStage(W, H) {
  const track = makeTrack(W, H);
  const T = track.tune;
  const horizonY = track.horizonY;
  const camH = (T.B * H) / W; // the eye's height, in track units
  // the car at the line: as long as the screen allows, since its door
  // number is the puzzle. The metre follows from it, so the rest of the
  // stage — the hut, the masts, the people — grows with the cars.
  const carLenPx = Math.min(W * 0.11, H * 0.2);
  const wzFinish = T.ZC - T.RZ;
  const m = (carLenPx * wzFinish) / W / CAR_LENGTH_M; // one metre, in units
  const S = Math.min(W, H);

  // a point h units above the ground at (wx, wz), on screen
  const P = (wx, h, wz) => ({ x: W / 2 + (W * wx) / wz, y: horizonY + (W * (camH - h)) / wz });
  const px = (wz) => W / wz; // screen pixels per unit at depth wz

  // the oval: a point on the racing line and its outward normal
  const oval = (th) => {
    const c = Math.cos(th);
    const s = Math.sin(th);
    let nx = c / T.A;
    let nz = s / T.RZ;
    const l = Math.hypot(nx, nz);
    nx /= l;
    nz /= l;
    return { x: T.A * c, z: T.ZC + T.RZ * s, nx, nz, tx: -nz, tz: nx };
  };
  // a point off the racing line by d units (+ outward, toward us on the
  // near side)
  const off = (th, d) => {
    const o = oval(th);
    return { x: o.x + d * o.nx, z: o.z + d * o.nz, tx: o.tx, tz: o.tz };
  };

  const lamp = (x, h, z, tx, tz, outer, inner, power) => {
    const ax = tx - x;
    const ay = -h;
    const az = tz - z;
    const l = Math.hypot(ax, ay, az);
    return {
      x,
      h,
      z,
      ax: ax / l,
      ay: ay / l,
      az: az / l,
      cosOut: Math.cos(outer * DEG),
      cosIn: Math.cos(inner * DEG),
      I: power,
      col: WARM,
    };
  };

  // the masts: two in the infield framing the line, two across the oval in
  // front of the trees; their lamp banks, and two more banks behind us
  // (on a wide, low screen a mast is kept short enough for its lamp bank
  // to stay in view: the glare of the lamps is most of the floodlit look)
  const mastH = (metres, z) => Math.min(metres * m, camH - ((H * 0.08 - horizonY) * z) / W);
  const masts = [
    { x: -3.2, z: 8.45, h: mastH(22, 8.45), side: -1, big: true, aim: [-0.75, 6.2] },
    { x: 3.2, z: 8.45, h: mastH(22, 8.45), side: 1, big: true, aim: [0.75, 6.2] },
    { x: -2.9, z: 14.4, h: mastH(16, 14.4), side: -1, big: false, aim: [-1.5, 11.8] },
    { x: 2.3, z: 14.2, h: mastH(16, 14.2), side: 1, big: false, aim: [1.1, 11.8] },
  ];
  const lamps = [
    ...masts.map((q) => lamp(q.x, q.h, q.z, q.aim[0], q.aim[1], q.big ? 34 : 36, q.big ? 14 : 18, q.big ? 1 : 0.3)),
    lamp(-2.5, 20 * m, -1.3, -0.4, 5.6, 30, 14, 0.6),
    lamp(2.5, 20 * m, -1.3, 0.4, 5.6, 30, 14, 0.6),
  ];
  // scale the lamps so the gravel at the line gets FINISH_LIGHT
  const raw = [0, 0, 0];
  lampsOnGround(lamps, 0, wzFinish, raw);
  const scale = FINISH_LIGHT / raw[1];
  for (const l of lamps) l.I *= scale;

  const L = {
    W,
    H,
    S,
    track,
    T,
    horizonY,
    camH,
    m,
    carLenPx,
    wzFinish,
    finishX: W / 2,
    P,
    px,
    oval,
    off,
    masts,
    lamps,
  };

  /** A car u of the way along the drive, `lane` units off the racing line
   *  (+ toward us): where it stands on screen, how big, which way it heads. */
  L.carAt = (u, lane = 0) => {
    const th = (T.THETA0 + (T.THETA1 - T.THETA0) * u) * DEG;
    const o = oval(th);
    const wx = o.x + lane * o.nx;
    const wz = o.z + lane * o.nz;
    const p = P(wx, 0, wz);
    return { x: p.x, y: p.y, wx, wz, heading: Math.atan2(o.tz, o.tx), scale: track.scaleAtY(p.y) };
  };

  // the finish control, just across the line from us in the infield
  const inner = -(T.TW + 0.12); // the tape runs just inside the far edge
  L.hut = { x: -0.62, z: T.ZC - T.RZ + T.TW + 0.42, w: 2.7 * m, d: 2.1 * m, h: 2.45 * m };
  L.sign = { x: 0.06, z: T.ZC - T.RZ + T.TW + 0.2 };
  L.cellFar = { x: -0.02, z: T.ZC - T.RZ + T.TW + 0.07 };
  L.cellNear = { x: 0.02, z: T.ZC - T.RZ - T.TW - 0.1 };
  L.marshal = { x: 0.3, z: T.ZC - T.RZ + T.TW + 0.24 };
  // the timing board: an LED display on a scaffold beside the sign, over the
  // heads of the cars, that shows each car's number as it crosses. On a
  // small screen it is drawn no smaller than its digits need to be read.
  {
    const z = L.sign.z;
    const k = px(z) * m;
    const wm = 5.0;
    const hm = 2.3;
    const h = Math.max(hm * k, Math.min(36, H * 0.115));
    const w = h * (wm / hm);
    const sign = P(L.sign.x, 0, z);
    const x = sign.x + 0.8 * k + w / 2; // clear of the sign, whatever its size
    const bottom = P(L.sign.x, 2.1 * m, z).y;
    L.board = { x, footY: sign.y, y: bottom - h / 2, w, h, k };
  }

  // the tape the crowd stands behind: right of the line, and a short run on
  // the left past the hut
  const thAt = (wx) => -Math.acos(Math.max(-1, Math.min(1, wx / T.A)));
  L.tapeRuns = [
    { from: thAt(0.46), to: thAt(2.75) },
    { from: thAt(-2.55), to: thAt(-1.1) },
  ].map((r) => {
    const posts = [];
    const n = Math.max(2, Math.round(((r.to - r.from) * T.A) / (2.6 * m)));
    for (let i = 0; i <= n; i++) posts.push(off(r.from + ((r.to - r.from) * i) / n, inner));
    return posts;
  });

  // the spectators: small knots of friends along the tape, a few standing
  // back behind the others
  const rnd = lcg(5151);
  L.crowd = [];
  for (const [ri, run] of [
    [0, { a: 0.55, b: 2.72 }],
    [1, { a: -2.52, b: -1.2 }],
  ]) {
    let wx = run.a + rnd() * 0.05;
    while (wx < run.b) {
      const n = 2 + Math.floor(rnd() * 4);
      for (let i = 0; i < n && wx < run.b; i++) {
        const back = rnd() < 0.3 ? 1 : 0;
        const p = off(thAt(wx), inner - 0.2 - back * (0.18 + rnd() * 0.12) - rnd() * 0.05);
        L.crowd.push({ x: p.x, z: p.z, row: back, run: ri, seed: Math.floor(rnd() * 1e6) });
        wx += (0.5 + rnd() * 0.35) * m;
      }
      wx += (1.4 + rnd() * 2.6) * m;
    }
  }

  // hay bales along our side of the track
  L.bales = [];
  let th = -2.2;
  while (th < -0.95) {
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const p = off(th, T.TW + 0.1 + (rnd() - 0.5) * 0.02);
      L.bales.push({ ...p, seed: Math.floor(rnd() * 1e6) });
      th += (1.28 * m) / T.A;
    }
    th += ((5 + rnd() * 5) * m) / T.A;
  }

  // across the oval: a tent with festoon lights, two parked vans
  L.tent = { x: 1.25, z: 16.2 };
  L.vans = [
    { x: -1.55, z: 16.9 },
    { x: -0.35, z: 17.4 },
  ];
  // the forest's edge
  L.forestZ = [19, 30, 55];
  // the moon, upper left
  L.moon = { x: W * 0.17, y: H * 0.12, r: S * 0.022 };
  return L;
}

// how much the lamps light the ground at (wx, wz): added into `out`
function lampsOnGround(lamps, wx, wz, out) {
  for (let i = 0; i < lamps.length; i++) {
    const l = lamps[i];
    const vx = l.x - wx;
    const vy = l.h;
    const vz = l.z - wz;
    const d2 = vx * vx + vy * vy + vz * vz;
    const inv = 1 / Math.sqrt(d2);
    const cs = -(vx * l.ax + vy * l.ay + vz * l.az) * inv;
    if (cs <= l.cosOut) continue;
    const t = Math.min(1, (cs - l.cosOut) / (l.cosIn - l.cosOut));
    const e = (l.I * vy * inv * t * t * (3 - 2 * t)) / d2;
    out[0] += e * l.col[0];
    out[1] += e * l.col[1];
    out[2] += e * l.col[2];
  }
}

/** The floodlight on the gravel at (wx, wz), relative to the line (1). */
export function groundLight(L, wx, wz) {
  const o = [0, 0, 0];
  lampsOnGround(L.lamps, wx, wz, o);
  return o[1] / FINISH_LIGHT;
}

// ── painting ────────────────────────────────────────────────────────────────

/** Paints the stage and registers its layers. The smooth ones — sky, the
 *  glow over the trees, the haze, the vignette — are painted small, for the
 *  scene to stretch over the screen; the ground, the props and the bales are
 *  painted at full size, each canvas only as tall as what shows in it (the
 *  returned `*Y` say where they start). */
export function paintStage(scene, W, H) {
  const L = layoutStage(W, H);
  const t = scene.textures;
  addCanvas(t, K.sky, paintSky(L));
  const moon = paintMoon(L.moon);
  addCanvas(t, K.moon, moon.canvas);
  addCanvas(t, K.dome, paintDome(L));
  const land = paintLand(L);
  addCanvas(t, K.land, land.dark);
  addCanvas(t, K.landLit, land.lit);
  addCanvas(t, K.haze, paintHaze(L));
  const props = paintProps(L);
  addCanvas(t, K.props, props.canvas);
  const front = paintFront(L);
  addCanvas(t, K.front, front.canvas);
  addCanvas(t, K.veil, paintVeil(L));
  addCanvas(
    t,
    K.star,
    radial(16, "236,240,255", [
      [0, 1],
      [0.3, 0.4],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    K.glow,
    radial(128, "255,214,160", [
      [0, 0.9],
      [0.15, 0.5],
      [0.45, 0.12],
      [1, 0],
    ]),
  );
  addCanvas(t, K.dust, paintDust());
  return {
    L,
    keys: K,
    glares: props.glares,
    window: props.window,
    festoon: props.festoon,
    moon: { x: L.moon.x, y: L.moon.y, size: moon.canvas.width },
    frontY: front.y0,
    landY: land.darkY,
    landLitY: land.litY,
  };
}

export function releaseStageArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// ── the sky ─────────────────────────────────────────────────────────────────

// painted at half size: nothing in it is sharp but the stars, and they are
// faint; the moon has its own image
function paintSky(L) {
  const { W, H, moon } = L;
  const c = makeCanvas(W / 2, H / 2);
  const ctx = c.getContext("2d");
  ctx.scale(c.width / W, c.height / H);
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  for (const [o, col] of [
    [0, "#02040a"],
    [0.3, "#060a15"],
    [0.62, "#0d1220"],
    [0.85, "#171a24"],
    [1, "#1d1d22"],
  ])
    g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // the faint stars, fewer toward the glow over the trees
  const rnd = lcg(7101);
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W;
    const y = Math.pow(rnd(), 1.4) * H * 0.5;
    const fade = 1 - smooth(H * 0.2, H * 0.46, y);
    const a = (0.1 + rnd() * 0.35) * fade;
    if (a < 0.02) continue;
    ctx.fillStyle = `rgba(${200 + rnd() * 55 | 0},${210 + rnd() * 45 | 0},255,${a})`;
    ctx.fillRect(x, y, 2, 2);
  }
  paintClouds(ctx, L, lcg(3303));
  // the moon's halo in the damp air
  softEllipse(ctx, moon.x, moon.y, moon.r * 7, moon.r * 7, "150,170,220", 0.12, "screen");
  softEllipse(ctx, moon.x, moon.y, moon.r * 2.6, moon.r * 2.6, "210,220,250", 0.18, "screen");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  grain(ctx, c.width, c.height, 0.03);
  return c;
}

// long thin clouds, their tops silvered by the moon
function paintClouds(ctx, L, rnd) {
  const { W, H, moon } = L;
  for (let i = 0; i < 6; i++) {
    const cx = W * (0.08 + rnd() * 0.84);
    const cy = H * (0.07 + rnd() * 0.24);
    const len = W * (0.1 + rnd() * 0.2);
    const th = H * (0.006 + rnd() * 0.01);
    const lit = Math.exp(-(((cx - moon.x) / (W * 0.45)) ** 2));
    for (let j = 0; j < 8; j++) {
      const u = j / 7 - 0.5;
      const px = cx + u * len;
      const py = cy + Math.sin(u * 3 + i) * th * 0.7;
      const rx = len * (0.14 + rnd() * 0.12);
      softEllipse(ctx, px, py, rx, th * 1.7, "22,26,40", 0.5);
      softEllipse(ctx, px, py - th * 0.5, rx * 0.8, th * 0.8, "150,160,190", 0.05 + lit * 0.12, "screen");
    }
  }
}

// the moon itself, crisp, on a canvas of its own centred on it
function paintMoon(moon) {
  const { r } = moon;
  const size = Math.ceil(r * 1.3);
  const m = makeCanvas(size * 2, size * 2);
  const g = m.getContext("2d");
  const c = size;
  // a waxing gibbous: lit from the right, the rest of the disc in earthshine
  g.fillStyle = "rgba(120,130,160,0.25)";
  circle(g, c, c, r);
  g.fill();
  const lit = makeCanvas(size * 2, size * 2);
  const lg = lit.getContext("2d");
  const body = lg.createRadialGradient(c + r * 0.3, c - r * 0.2, r * 0.1, c, c, r);
  body.addColorStop(0, "#fffaf0");
  body.addColorStop(1, "#d8d6d0");
  lg.fillStyle = body;
  circle(lg, c, c, r);
  lg.fill();
  // the maria
  lg.fillStyle = "rgba(120,124,140,0.35)";
  for (const [dx, dy, rr] of [
    [-0.2, -0.25, 0.3],
    [0.25, 0.1, 0.22],
    [-0.05, 0.35, 0.18],
    [0.35, -0.35, 0.12],
  ]) {
    ellipse(lg, c + dx * r, c + dy * r, rr * r, rr * r * 0.8);
    lg.fill();
  }
  lg.globalCompositeOperation = "destination-out";
  ellipse(lg, c - r * 0.55, c, r * 0.72, r * 1.02);
  lg.fill();
  g.drawImage(lit, 0, 0);
  return { canvas: m };
}

// the glow the floodlights throw up into the damp air over the trees; it
// goes out with them
function paintDome(L) {
  const { W, H, masts, P } = L;
  const c = makeCanvas(W / 4, H / 4);
  const ctx = c.getContext("2d");
  ctx.scale(c.width / W, c.height / H);
  softEllipse(ctx, W * 0.5, H * 0.52, W * 0.75, H * 0.3, "150,110,70", 0.5, "lighter");
  softEllipse(ctx, W * 0.5, H * 0.56, W * 0.45, H * 0.12, "200,150,95", 0.35, "lighter");
  for (const q of masts) {
    const top = P(q.x, q.h, q.z);
    const s = q.big ? 1 : 0.6;
    softEllipse(ctx, top.x, top.y, W * 0.12 * s, H * 0.1 * s, "255,200,140", 0.22, "lighter");
  }
  return c;
}

// ── the land: ground lit pixel by pixel, the forest on it ───────────────────

// Only what can be seen is painted: the moonlit layer from the tops of the
// trees down, the floodlight's layer from the foot of the nearest trees —
// above that the forest hides the ground. Each canvas starts at its own y.
function paintLand(L) {
  const { W, H, P, px, m, forestZ } = L;
  let top = H;
  for (const z of forestZ) top = Math.min(top, P(0, 0, z).y - 27 * px(z) * m);
  const darkY = Math.max(0, Math.floor(top - 4));
  const litY = Math.max(0, Math.floor(P(0, 0, forestZ[0]).y - 3));
  const dark = makeCanvas(W, H - darkY);
  const lit = makeCanvas(W, H - litY);
  paintGround(L, dark, darkY, lit, litY);
  const dctx = dark.getContext("2d");
  const lctx = lit.getContext("2d");
  dctx.translate(0, -darkY);
  lctx.translate(0, -litY);
  paintFarSide(L, dctx, lctx);
  paintForest(L, dctx, lctx);
  paintContactShadows(L, dctx, lctx);
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  grain(dctx, dark.width, dark.height, 0.035, true);
  return { dark, lit, darkY, litY };
}

// the film's response to light, as a table on √light
const TONE_N = 4096;
const TONE_MAX = 12;
const TONE = new Float32Array(TONE_N);
for (let i = 0; i < TONE_N; i++) {
  const v = ((i / (TONE_N - 1)) * Math.sqrt(TONE_MAX)) ** 2;
  TONE[i] = 255 * Math.pow(1 - Math.exp(-v * 1.1), 1 / 2.2);
}
const TONE_K = (TONE_N - 1) / Math.sqrt(TONE_MAX);
const tone = (v) => (v <= 0 ? 0 : v >= TONE_MAX ? 255 : TONE[(Math.sqrt(v) * TONE_K + 0.5) | 0]);

// The nearest point of the racing line to a ground point: its angle round
// the oval, and how far off it the point is (+ outward). Eberly's method:
// in the first quadrant the foot of the perpendicular is the root of a
// convex, decreasing F(s), which Newton's method approaches from below
// without ever overshooting — exact to 1e-5 everywhere near the track.
export function trackCoords(T, wx, wz, out) {
  const e0 = T.A;
  const e1 = T.RZ;
  const px = wx;
  const pz = wz - T.ZC;
  const y0 = Math.abs(px);
  const y1 = Math.abs(pz);
  let x0;
  let x1;
  if (y1 > 1e-12) {
    if (y0 > 1e-12) {
      const z0 = y0 / e0;
      const z1 = y1 / e1;
      const r0 = (e0 / e1) * (e0 / e1);
      const n0 = r0 * z0;
      let s = z1 - 1;
      for (let i = 0; i < 10; i++) {
        const a = n0 / (s + r0);
        const b = z1 / (s + 1);
        const F = a * a + b * b - 1;
        if (F < 1e-12) break;
        s += F / (2 * ((a * a) / (s + r0) + (b * b) / (s + 1)));
      }
      x0 = (r0 * y0) / (s + r0);
      x1 = y1 / (s + 1);
    } else {
      x0 = 0;
      x1 = e1;
    }
  } else {
    const n = e0 * y0;
    const dd = e0 * e0 - e1 * e1;
    if (n < dd) {
      const q = n / dd;
      x0 = e0 * q;
      x1 = e1 * Math.sqrt(1 - q * q);
    } else {
      x0 = e0;
      x1 = 0;
    }
  }
  const cx = px < 0 ? -x0 : x0;
  const cz = pz < 0 ? -x1 : x1;
  const dist = Math.hypot(px - cx, pz - cz);
  out.d = (px / e0) ** 2 + (pz / e1) ** 2 < 1 ? -dist : dist;
  out.th = Math.atan2(cz / e1, cx / e0);
  return out;
}

// tyre tracks worn into the groove: offsets from the racing line, metres
const RUTS = (() => {
  const rnd = lcg(4242);
  const out = [];
  for (let i = 0; i < 14; i++) {
    const lane = (rnd() - 0.5) * 8.5;
    for (const w of [-0.78, 0.78]) {
      out.push({ o: lane + w, ph: rnd() * 6.28, amp: 0.2 + rnd() * 0.45, f: 0.03 + rnd() * 0.05, k: 0.1 + rnd() * 0.12 });
    }
  }
  return out;
})();

function gravelAlbedo(sm, dm, twm, out) {
  // packed grey-brown gravel, in broad patches
  const n1 = vnoise(sm * 0.07, dm * 0.21);
  const n2 = vnoise(sm * 0.55 + 11, dm * 0.9 - 3);
  const n3 = vnoise(sm * 2.1 - 5, dm * 3.3 + 2);
  let k = (0.8 + 0.4 * n1) * (0.88 + 0.24 * n2) * (0.9 + 0.2 * n3);
  const ad = Math.abs(dm);
  // the groove the cars run in is darker and packed; the loose stones
  // pushed to the edges are paler and lumpier
  k *= 0.84 + 0.2 * smooth(4, 9, ad);
  if (ad > twm - 1.8) k *= 1 + 0.22 * smooth(twm - 1.8, twm - 0.5, ad) * (0.4 + 1.2 * n3);
  for (let i = 0; i < RUTS.length; i++) {
    const r = RUTS[i];
    // most ruts are nowhere near: skip them before the sine
    if (Math.abs(dm - r.o) > r.amp + 0.3) continue;
    const c = r.o + r.amp * Math.sin(sm * r.f + r.ph);
    const dd = Math.abs(dm - c);
    if (dd < 0.3) k *= 1 - r.k * 1.6 * (1 - dd / 0.3);
  }
  out[0] = 0.3 * k;
  out[1] = 0.272 * k;
  out[2] = 0.235 * k;
}

// rain the day before: a few puddles left on the gravel, in metres along the
// track from the line and off the racing line (+ toward us)
const PUDDLES = [
  { s: -27, d: 8.2, rx: 2.8, rz: 0.9 },
  { s: -12, d: 10.2, rx: 1.7, rz: 0.55 },
  { s: 16, d: 9.3, rx: 3.3, rz: 1.0 },
  { s: 33, d: 3.5, rx: 2.0, rz: 0.7 },
  { s: -41, d: -2.5, rx: 2.4, rz: 0.8 },
  { s: 47, d: 10.5, rx: 2.2, rz: 0.7 },
];
function wetness(sm, dm) {
  let w = 0;
  for (let i = 0; i < PUDDLES.length; i++) {
    const p = PUDDLES[i];
    const u = (sm - p.s) / p.rx;
    const v = (dm - p.d) / p.rz;
    const r2 = u * u + v * v;
    if (r2 > 2.2) continue;
    const ragged = 0.75 + 0.5 * vnoise(sm * 1.7 + i * 13, dm * 2.9);
    w = Math.max(w, 1 - smooth(0.55 * ragged, 1.15 * ragged, Math.sqrt(r2)));
  }
  return w;
}

function grassAlbedo(wxm, wzm, out) {
  const n = vnoise(wxm * 0.15, wzm * 0.15) * 0.6 + vnoise(wxm * 0.9 + 7, wzm * 0.9) * 0.4;
  const k = 0.65 + 0.7 * n;
  out[0] = 0.046 * k;
  out[1] = 0.062 * k;
  out[2] = 0.034 * k;
}

// the finish line: two columns of chequers across the gravel, worn
function chequer(sm, dm) {
  if (Math.abs(sm) > 0.8) return -1;
  const i = Math.floor((sm + 0.8) / 0.8);
  const j = Math.floor(dm / 0.8);
  return (i + j) & 1;
}

function paintGround(L, darkCanvas, darkY, litCanvas, litY) {
  const { W, H, T, horizonY, m, lamps } = L;
  // the ground shows from the foot of the nearest trees down
  const top = Math.max(Math.floor(horizonY + 1), litY);
  const rows = H - top;
  const dctx = darkCanvas.getContext("2d");
  const lctx = litCanvas.getContext("2d");
  const dimg = dctx.createImageData(W, rows);
  const limg = lctx.createImageData(W, rows);
  const D = dimg.data;
  const LT = limg.data;
  const tc = { th: 0, d: 0 };
  const alb = [0, 0, 0];
  const sub = [0, 0, 0];
  const E = [0, 0, 0];
  const twm = T.TW / m;
  const RX = T.A;
  const moonI = 0.045;
  const amb = 0.014;

  // one ground point's colour, before light: gravel, grass, the line; and
  // how wet it is
  let wet = 0;
  const material = (wx, wz, pxx, pyy, out) => {
    trackCoords(T, wx, wz, tc);
    const d = tc.d;
    const dm = d / m;
    const ad = Math.abs(d);
    const h = hash(pxx, pyy);
    const edge = T.TW + (vnoise(tc.th * 40, 3.1) - 0.5) * 0.06;
    wet = 0;
    if (ad < edge) {
      const sm = (tc.th * RX) / m;
      gravelAlbedo(sm, dm, twm, out);
      // the stones themselves: a fine grain, now and then a pale one that
      // catches the light or a dark gap between them
      let grainK = 0.84 + 0.32 * h;
      if (h > 0.972) grainK = 1.55;
      else if (h < 0.035) grainK = 0.5;
      out[0] *= grainK;
      out[1] *= grainK;
      out[2] *= grainK;
      if (Math.sin(tc.th) < 0) {
        const fs = ((tc.th + Math.PI / 2) * RX) / m;
        const q = chequer(fs, dm);
        if (q >= 0) {
          const wear = 0.72 + 0.28 * vnoise(fs * 3, dm * 2.3);
          const paint = q ? [0.66, 0.65, 0.62] : [0.026, 0.026, 0.028];
          for (let c = 0; c < 3; c++) out[c] = out[c] + (paint[c] - out[c]) * wear;
        } else {
          wet = wetness(fs, dm);
          if (wet > 0) {
            const k = 1 - 0.55 * wet;
            out[0] *= k;
            out[1] *= k;
            out[2] *= k * 1.04;
          }
        }
      }
      return;
    }
    grassAlbedo(wx / m, wz / m, out);
    // the verge by the gravel is worn to mud and spilled stones
    const worn = 1 - smooth(edge, edge + 0.22, ad);
    if (worn > 0) {
      const w2 = worn * (0.6 + 0.4 * vnoise(wx * 30, wz * 30));
      out[0] += (0.17 - out[0]) * w2;
      out[1] += (0.145 - out[1]) * w2;
      out[2] += (0.11 - out[2]) * w2;
    }
    // blades: short upright streaks, lit at their tips
    const blade = hash(pxx, (pyy / 3) | 0);
    const grainK = 0.6 + 0.8 * blade * (0.7 + 0.3 * h);
    out[0] *= grainK;
    out[1] *= grainK;
    out[2] *= grainK;
  };

  // a puddle mirrors a lamp when the lamp sits where the view ray bounces;
  // ripples smear each reflection into an upright streak
  const reflect = (wx, wz, out) => {
    const n = Math.hypot(wx, L.camH, wz);
    const rx = wx / n;
    const ry = L.camH / n;
    const rz = wz / n;
    const az = Math.atan2(rx, rz);
    const el = Math.asin(ry);
    for (const l of lamps) {
      const lx = l.x - wx;
      const lz = l.z - wz;
      const dl = Math.hypot(lx, l.h, lz);
      const daz = Math.atan2(lx, lz) - az;
      const del = Math.asin(l.h / dl) - el;
      const s = Math.exp(-((daz / 0.01) ** 2) - (del / 0.07) ** 2);
      if (s < 0.01) continue;
      const k = s * 2.6 * Math.min(1, l.I * 4);
      out[0] += k * l.col[0];
      out[1] += k * l.col[1];
      out[2] += k * l.col[2];
    }
  };

  for (let py = top; py < H; py++) {
    const yy = py + 0.5 - horizonY;
    const row = (py - top) * W * 4;
    const wz = (T.B * H) / yy;
    // the chequered band needs a closer look, or its far rows shimmer
    for (let pxx = 0; pxx < W; pxx++) {
      const wx = ((pxx + 0.5 - W / 2) * wz) / W;
      const nearLine = Math.abs(wx) < 1.4 * m && wz < T.ZC - T.RZ + T.TW + 0.1 && wz > T.ZC - T.RZ - T.TW - 0.1;
      if (nearLine) {
        alb[0] = alb[1] = alb[2] = 0;
        for (let sy = 0; sy < 3; sy++) {
          for (let sx = 0; sx < 3; sx++) {
            const yz = (T.B * H) / (yy - 0.5 + (sy + 0.5) / 3);
            const xw = ((pxx + (sx + 0.5) / 3 - W / 2) * yz) / W;
            material(xw, yz, pxx, py, sub);
            alb[0] += sub[0] / 9;
            alb[1] += sub[1] / 9;
            alb[2] += sub[2] / 9;
          }
        }
      } else material(wx, wz, pxx, py, alb);

      E[0] = E[1] = E[2] = 0;
      lampsOnGround(lamps, wx, wz, E);
      if (wet > 0.05) {
        // the water: the lamps mirrored, divided back out of the albedo it
        // will be multiplied by
        const R = [0, 0, 0];
        reflect(wx, wz, R);
        for (let c = 0; c < 3; c++) E[c] += (R[c] * wet * 0.5) / Math.max(0.02, alb[c]);
      }
      const dr = alb[0] * (moonI * MOON[0] + amb * 0.5);
      const dg = alb[1] * (moonI * MOON[1] + amb * 0.6);
      const db = alb[2] * (moonI * MOON[2] + amb * 0.9);
      const o = row + pxx * 4;
      const tr = tone(dr);
      const tg = tone(dg);
      const tb = tone(db);
      D[o] = tr;
      D[o + 1] = tg;
      D[o + 2] = tb;
      D[o + 3] = 255;
      LT[o] = tone(dr + alb[0] * E[0]) - tr;
      LT[o + 1] = tone(dg + alb[1] * E[1]) - tg;
      LT[o + 2] = tone(db + alb[2] * E[2]) - tb;
      LT[o + 3] = 255;
    }
  }
  dctx.putImageData(dimg, 0, top - darkY);
  lctx.putImageData(limg, 0, top - litY);
}

// across the oval: parked vans, a tent under a string of bulbs
function paintFarSide(L, dctx, lctx) {
  const { P, px, m, tent, vans } = L;
  for (const v of vans) {
    const k = px(v.z) * m;
    const a = P(v.x - 2.5 * m, 0, v.z);
    const b = P(v.x + 2.5 * m, 2.1 * m, v.z);
    dctx.fillStyle = "#0b0d11";
    rrect(dctx, a.x, b.y, b.x - a.x, a.y - b.y, 0.4 * k);
    dctx.fill();
    dctx.fillStyle = "rgba(120,130,150,0.35)";
    dctx.fillRect(a.x + 0.3 * k, b.y + 0.35 * k, (b.x - a.x) * 0.3, 0.45 * k);
    dctx.fillStyle = "rgba(150,160,180,0.25)";
    dctx.fillRect(a.x + 0.4 * k, b.y, b.x - a.x - 0.8 * k, 1);
  }
  const k = px(tent.z) * m;
  const base = P(tent.x, 0, tent.z);
  const w = 3.4 * k;
  const h = 2.4 * k;
  // the canopy, lit from under by its own bulbs
  dctx.fillStyle = "#1f1d1c";
  poly(dctx, [
    [base.x - w * 0.56, base.y - h],
    [base.x, base.y - h - 0.7 * k],
    [base.x + w * 0.56, base.y - h],
    [base.x + w * 0.5, base.y - h + 0.35 * k],
    [base.x - w * 0.5, base.y - h + 0.35 * k],
  ]);
  dctx.fill();
  dctx.fillStyle = "#3a302a";
  dctx.fillRect(base.x - w * 0.5, base.y - h + 0.35 * k, w, h - 0.35 * k);
  softEllipse(dctx, base.x, base.y - h * 0.4, w * 0.5, h * 0.5, "255,190,120", 0.35, "lighter");
  dctx.strokeStyle = "#141212";
  dctx.lineWidth = Math.max(1, 0.12 * k);
  line(dctx, base.x - w * 0.5, base.y - h, base.x - w * 0.5, base.y);
  line(dctx, base.x + w * 0.5, base.y - h, base.x + w * 0.5, base.y);
  // people under it: small dark figures against the light
  const rnd = lcg(771);
  for (let i = 0; i < 4; i++) {
    const x = base.x - w * 0.35 + rnd() * w * 0.7;
    const ph = (1.6 + rnd() * 0.2) * k;
    dctx.fillStyle = "#0c0c0e";
    rrect(dctx, x - 0.22 * k, base.y - ph + 0.25 * k, 0.44 * k, ph - 0.25 * k, 0.15 * k);
    dctx.fill();
    circle(dctx, x, base.y - ph + 0.12 * k, 0.13 * k);
    dctx.fill();
  }
  lctx.save();
  lctx.globalCompositeOperation = "lighter";
  softEllipse(lctx, base.x, base.y, w * 1.1, 0.8 * k, "130,90,50", 0.5);
  lctx.restore();
}

// three depths of pine, the nearest with a moonlit edge
function paintForest(L, dctx, lctx) {
  const { W, P, px, m, forestZ } = L;
  // each depth a step lighter and bluer with the haze between
  const layers = [
    { z: forestZ[2], hMin: 16, hMax: 26, col: "#141922", rim: null, seed: 91 },
    { z: forestZ[1], hMin: 14, hMax: 26, col: "#0c1016", rim: null, seed: 92 },
    { z: forestZ[0], hMin: 11, hMax: 25, col: "#05070a", rim: null, seed: 93 },
  ];
  for (const layer of layers) {
    const k = px(layer.z) * m; // px per metre
    const base = P(0, 0, layer.z).y;
    // every layer is solid down to the foot of the nearest, so nothing
    // shows through the gaps between the near trunks
    const foot = P(0, 0, forestZ[0]).y + 2;
    const rnd = lcg(layer.seed);
    const shape = (g) => {
      g.moveTo(-20, foot);
      let x = -20;
      while (x < W + 30) {
        // mostly tall spruce, now and then a young one in front
        const young = rnd() < 0.18;
        const h = (young ? 5 + rnd() * 6 : layer.hMin + rnd() * (layer.hMax - layer.hMin)) * k;
        const w = h * (0.24 + rnd() * 0.1);
        pine(g, x + w / 2, base, w, h, rnd);
        x += w * (young ? 0.35 : 0.45 + rnd() * 0.4);
      }
      g.lineTo(W + 30, foot);
      g.lineTo(-20, foot);
    };
    const path = new Path2D();
    shape(path);
    dctx.save();
    if (layer.rim) {
      // the moon catches the upper-left edge of every crown: fill the rim,
      // then the tree over it, shifted away from the moon
      dctx.clip(path);
      dctx.fillStyle = layer.rim;
      dctx.fillRect(0, 0, W, L.H);
      dctx.translate(Math.max(0.8, k * 0.12), Math.max(0.5, k * 0.06));
    }
    dctx.fillStyle = layer.col;
    dctx.fill(path);
    dctx.restore();
    // the undergrowth: young spruce and brush closing the gaps between the
    // trunks, a ragged line a few metres high
    const brush = new Path2D();
    brush.moveTo(-20, foot);
    for (let x = -20; x <= W + 30; x += 4) {
      const n = vnoise(x * 0.045 + layer.seed, 0.5) * 0.7 + vnoise(x * 0.21, layer.seed) * 0.3;
      brush.lineTo(x, base - k * (2 + 2.4 * n));
    }
    brush.lineTo(W + 30, foot);
    brush.closePath();
    dctx.fillStyle = layer.col;
    dctx.fill(brush);
    // the trees hide whatever light fell on the ground behind them
    lctx.save();
    lctx.fillStyle = "#000";
    lctx.fill(path);
    lctx.fill(brush);
    lctx.restore();
  }
}

// one spruce: a narrow spire of uneven, drooping tiers, each tier's upper
// edge ragged with clumps of needles, no two trees alike, a thin leader on top
function pine(g, cx, base, w, h, rnd) {
  const tiers = 11 + Math.floor(rnd() * 6);
  const lean = (rnd() - 0.5) * w * 0.12;
  const left = spruceSide(cx, base, w, h, tiers, lean, -1, rnd);
  const right = spruceSide(cx, base, w, h, tiers, lean, 1, rnd);
  for (const [x, y] of left) g.lineTo(x, y);
  g.lineTo(cx + lean, base - h);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
}

// one side of a spruce, from the foot of the trunk up to the leader
function spruceSide(cx, base, w, h, tiers, lean, side, rnd) {
  const pts = [[cx + side * w * 0.035, base]];
  const gap = (h * 0.88) / (tiers - 1);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1); // 0 at the bottom, 1 at the top
    const x = cx + lean * t;
    const y = base - h * (0.05 + 0.88 * t) + (rnd() - 0.5) * gap * 0.3;
    const reach = (w / 2) * Math.pow(1 - t, 0.8) * (0.55 + rnd() * 0.75) + w * 0.025;
    const droop = h * (0.012 + 0.03 * (1 - t)) * (0.6 + rnd() * 0.8);
    // along the underside out to the tip, which hangs
    pts.push([x + side * reach * 0.3, y + droop * 0.4]);
    pts.push([x + side * reach, y + droop]);
    // back along the top in ragged clumps
    const n = 2 + Math.floor(rnd() * 2);
    for (let k = 1; k <= n; k++) {
      const f = 1 - k / (n + 1);
      pts.push([x + side * reach * (f + 0.1), y + droop * f - gap * (0.2 + rnd() * 0.25)]);
      pts.push([x + side * reach * f, y + droop * f * 0.7]);
    }
    pts.push([x + side * reach * 0.1, y - gap * 0.6]);
  }
  return pts;
}

// the dark under things standing on the ground
function paintContactShadows(L, dctx, lctx) {
  const { P, px, m, masts, hut, crowd, bales } = L;
  const pool = (x, z, rx, a) => {
    const p = P(x, 0, z);
    const k = px(z);
    softEllipse(dctx, p.x, p.y, rx * k, rx * k * 0.22, "0,0,0", a * 0.8);
    lctx.save();
    lctx.globalCompositeOperation = "destination-out";
    softEllipse(lctx, p.x, p.y, rx * k, rx * k * 0.22, "0,0,0", a);
    lctx.restore();
  };
  for (const q of masts) pool(q.x, q.z, (q.big ? 2.2 : 1.6) * m, 0.8);
  pool(hut.x, hut.z, 2.4 * m, 0.85);
  for (const c of crowd) pool(c.x, c.z, 0.45 * m, 0.55);
  for (const b of bales) pool(b.x, b.z, 0.9 * m, 0.5);
}

// ── the haze the beams cut through ──────────────────────────────────────────

function paintHaze(L) {
  const { W, H, horizonY, camH, lamps, m } = L;
  const S = 8;
  const w = Math.ceil(W / S);
  const h = Math.ceil(H / S);
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const out = img.data;
  const beams = lamps.filter((l) => l.z > 0); // the ones we look toward
  const g = 0.6; // forward scattering: a lamp's beam glows seen end-on
  const hg = (cs) => (1 - g * g) / Math.pow(1 + g * g - 2 * g * cs, 1.5);
  const fogH = 7 * m;
  const N = 15;
  for (let j = 0; j < h; j++) {
    const Y = (j + 0.5) * S;
    for (let i = 0; i < w; i++) {
      const X = (i + 0.5) * S;
      const dx = (X - W / 2) / W;
      const dy = -(Y - horizonY) / W;
      const dl = Math.hypot(dx, dy, 1);
      const tEnd = dy < 0 ? Math.min(24, camH / -dy) : 24;
      const t0 = 1;
      let r = 0;
      let gg = 0;
      let b = 0;
      let prev = t0;
      for (let s = 1; s <= N; s++) {
        const t = t0 * Math.pow(tEnd / t0, s / N);
        const dt = t - prev;
        prev = t;
        const ty = camH + t * dy;
        const dens = Math.exp(-Math.max(0, ty) / fogH);
        const sx = t * dx;
        for (let q = 0; q < beams.length; q++) {
          const l = beams[q];
          const vx = sx - l.x;
          const vy = ty - l.h;
          const vz = t - l.z;
          const d2 = vx * vx + vy * vy + vz * vz + 0.004;
          const inv = 1 / Math.sqrt(d2);
          const cs = (vx * l.ax + vy * l.ay + vz * l.az) * inv;
          if (cs <= l.cosOut) continue;
          const tt = Math.min(1, (cs - l.cosOut) / (l.cosIn - l.cosOut));
          // toward the camera is back along the ray
          const cth = -(vx * dx + vy * dy + vz) * inv / dl;
          const e = (l.I * tt * tt * (3 - 2 * tt) * hg(cth) * dens * dt) / d2;
          r += e * l.col[0];
          gg += e * l.col[1];
          b += e * l.col[2];
        }
      }
      // thin: the beams should show, not fog the whole stage
      const o = (j * w + i) * 4;
      const k = 0.028;
      out[o] = 255 * Math.pow(1 - Math.exp(-r * k), 1.25);
      out[o + 1] = 255 * Math.pow(1 - Math.exp(-gg * k), 1.25);
      out[o + 2] = 255 * Math.pow(1 - Math.exp(-b * k), 1.25);
      out[o + 3] = 255;
    }
  }
  // soften it here, small; the GPU stretches it over the screen
  boxBlur(out, w, h, 1);
  boxBlur(out, w, h, 1);
  ctx.putImageData(img, 0, 0);
  return c;
}

// a separable box blur of an RGBA image's colour, in place
function boxBlur(d, w, h, r) {
  const tmp = new Float32Array(w * h * 3);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += d[(y * w + Math.min(w - 1, Math.max(0, x + k))) * 4 + c];
        tmp[(y * w + x) * 3 + c] = s / n;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += tmp[(Math.min(h - 1, Math.max(0, y + k)) * w + x) * 3 + c];
        d[(y * w + x) * 4 + c] = s / n;
      }
    }
  }
}

// ── the props that stand on the stage (behind the cars) ─────────────────────

function paintProps(L) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const glares = [];
  // back to front
  const masts = L.masts.slice().sort((a, b) => b.z - a.z);
  for (const q of masts) paintMast(ctx, L, q, glares);
  const window = paintHut(ctx, L);
  paintSign(ctx, L);
  paintPhotocell(ctx, L, L.cellFar);
  for (const run of L.tapeRuns) paintTape(ctx, L, run);
  const festoon = paintFestoon(ctx, L);
  return { canvas: c, glares, window, festoon };
}

// lit like the rest: how strongly the floodlight falls where it stands
const litAt = (L, x, z) => Math.min(1.3, 0.25 + groundLight(L, x, z));

// a lattice mast: two legs, cross-bracing, a caged ladder, the platform and
// the lamp bank on top, every lamp aimed down at the track
function paintMast(ctx, L, q, glares) {
  const { P, px, m } = L;
  const k = px(q.z) * m; // px per metre here
  const base = P(q.x, 0, q.z);
  const topY = P(q.x, q.h, q.z).y;
  const wB = 0.8 * k;
  const wT = 0.35 * k;
  const legW = Math.max(1, 0.14 * k);
  const steel = "#23262b";
  const lit = "rgba(255,210,160,0.5)";
  const at = (t) => ({ y: base.y + (topY - base.y) * t, w: wB + (wT - wB) * t });
  // the far pair of legs, fainter, a little offset
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = legW * 0.8;
  const o = q.side * 0.25 * k;
  line(ctx, base.x - wB + o, base.y - 0.2 * k, base.x - wT + o, topY);
  line(ctx, base.x + wB + o, base.y - 0.2 * k, base.x + wT + o, topY);
  // bracing: horizontal struts and diagonals between them
  const bays = Math.round(q.h / m / 2.2);
  ctx.lineWidth = Math.max(0.7, 0.06 * k);
  ctx.strokeStyle = "#2b2e34";
  for (let i = 0; i < bays; i++) {
    const a = at(i / bays);
    const b = at((i + 1) / bays);
    line(ctx, base.x - a.w, a.y, base.x + a.w, a.y);
    line(ctx, base.x - a.w, a.y, base.x + b.w, b.y);
    line(ctx, base.x + a.w, a.y, base.x - b.w, b.y);
  }
  // the near legs, catching the lamps behind us on their fronts
  for (const s of [-1, 1]) {
    ctx.strokeStyle = steel;
    ctx.lineWidth = legW;
    line(ctx, base.x + s * wB, base.y, base.x + s * wT, topY);
    ctx.strokeStyle = lit;
    ctx.lineWidth = Math.max(0.6, legW * 0.35);
    line(ctx, base.x + s * wB - legW * 0.2, base.y, base.x + s * wT - legW * 0.2, topY);
  }
  // the ladder up the leg nearest the middle of the screen, with its cage
  const lx = -q.side;
  ctx.strokeStyle = "rgba(60,64,70,0.9)";
  ctx.lineWidth = Math.max(0.6, 0.04 * k);
  for (let t = 0.03; t < 0.97; t += 0.35 / (q.h / m)) {
    const a = at(t);
    const x = base.x + lx * (a.w - 0.25 * k);
    line(ctx, x - 0.18 * k, a.y, x + 0.18 * k, a.y);
  }
  // a concrete footing
  ctx.fillStyle = "#3a3936";
  ctx.fillRect(base.x - wB * 1.3, base.y - 0.35 * k, wB * 2.6, 0.4 * k);
  ctx.fillStyle = "rgba(255,210,160,0.25)";
  ctx.fillRect(base.x - wB * 1.3, base.y - 0.35 * k, wB * 2.6, Math.max(1, 0.06 * k));

  // the head: platform with a rail, and the lamp bank above it
  const headW = (q.big ? 5.2 : 3.6) * k;
  const rows = q.big ? 2 : 1;
  const cols = q.big ? 4 : 3;
  const lampW = headW / cols;
  const lampH = 0.62 * k;
  const bankTop = topY - rows * lampH * 1.12 - 0.3 * k;
  ctx.fillStyle = "#191b1f";
  ctx.fillRect(base.x - headW * 0.55, topY - 0.12 * k, headW * 1.1, 0.24 * k);
  ctx.strokeStyle = "#2c2f35";
  ctx.lineWidth = Math.max(0.6, 0.05 * k);
  line(ctx, base.x - headW * 0.55, topY - 1.0 * k, base.x + headW * 0.55, topY - 1.0 * k);
  for (let i = 0; i <= 6; i++) {
    const x = base.x - headW * 0.55 + (headW * 1.1 * i) / 6;
    line(ctx, x, topY - 1.0 * k, x, topY);
  }
  // the frame
  ctx.fillStyle = "#15171b";
  ctx.fillRect(base.x - headW / 2 - 0.1 * k, bankTop - 0.15 * k, headW + 0.2 * k, rows * lampH * 1.12 + 0.25 * k);
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      const x = base.x - headW / 2 + lampW * (cc + 0.5);
      const y = bankTop + lampH * 1.12 * (r + 0.5);
      // housing, then the glass: blazing, lit from within
      ctx.fillStyle = "#0e0f12";
      rrect(ctx, x - lampW * 0.44, y - lampH * 0.5, lampW * 0.88, lampH, lampH * 0.12);
      ctx.fill();
      const gl = ctx.createLinearGradient(0, y - lampH * 0.4, 0, y + lampH * 0.4);
      gl.addColorStop(0, "#fffbe9");
      gl.addColorStop(1, "#ffe3a8");
      ctx.fillStyle = gl;
      rrect(ctx, x - lampW * 0.36, y - lampH * 0.36, lampW * 0.72, lampH * 0.72, lampH * 0.1);
      ctx.fill();
      glares.push({ x, y, size: lampW * (q.big ? 2.6 : 2.2), big: q.big });
    }
  }
}

// the timing hut: a white site cabin with its window lit and a timekeeper
// at the glass, an aerial, a generator humming beside it
function paintHut(ctx, L) {
  const { P, m, hut } = L;
  const hw = hut.w / 2;
  const hd = hut.d / 2;
  const x0 = hut.x - hw;
  const x1 = hut.x + hw;
  const z0 = hut.z - hd;
  const z1 = hut.z + hd;
  const lit = litAt(L, hut.x, z0);
  const shade = (base, f) => {
    const v = base.map((c) => Math.round(Math.min(255, c * f)));
    return `rgb(${v[0]},${v[1]},${v[2]})`;
  };
  const WHITE = [150, 148, 142];
  const A = P(x0, 0, z0);
  const B = P(x1, 0, z0);
  const C = P(x1, hut.h, z0);
  const D = P(x0, hut.h, z0);
  const B2 = P(x1, 0, z1);
  const C2 = P(x1, hut.h, z1);
  const D2 = P(x0, hut.h, z1);
  // the side facing the line (right), the roof, the front
  ctx.fillStyle = shade(WHITE, 0.55 * lit);
  poly(ctx, [
    [B.x, B.y],
    [B2.x, B2.y],
    [C2.x, C2.y],
    [C.x, C.y],
  ]);
  ctx.fill();
  ctx.fillStyle = shade(WHITE, 1.05 * lit);
  poly(ctx, [
    [D.x, D.y],
    [C.x, C.y],
    [C2.x, C2.y],
    [D2.x, D2.y],
  ]);
  ctx.fill();
  const front = new Path2D();
  front.moveTo(A.x, A.y);
  front.lineTo(B.x, B.y);
  front.lineTo(C.x, C.y);
  front.lineTo(D.x, D.y);
  front.closePath();
  const fg = ctx.createLinearGradient(0, D.y, 0, A.y);
  fg.addColorStop(0, shade(WHITE, 0.95 * lit));
  fg.addColorStop(1, shade(WHITE, 0.62 * lit));
  ctx.fillStyle = fg;
  ctx.fill(front);
  // ribbed siding
  ctx.save();
  ctx.clip(front);
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 1;
  const k = B.x - A.x;
  for (let i = 1; i < 14; i++) {
    const x = A.x + (k * i) / 14;
    line(ctx, x, D.y, x, A.y);
  }
  ctx.restore();
  // the window: warm light, a figure in it
  const wx0 = A.x + k * 0.14;
  const wx1 = A.x + k * 0.68;
  const wy0 = D.y + (A.y - D.y) * 0.22;
  const wy1 = D.y + (A.y - D.y) * 0.58;
  ctx.fillStyle = "#2a2622";
  ctx.fillRect(wx0 - 1.5, wy0 - 1.5, wx1 - wx0 + 3, wy1 - wy0 + 3);
  const wg = ctx.createLinearGradient(0, wy0, 0, wy1);
  wg.addColorStop(0, "#ffe2a6");
  wg.addColorStop(1, "#f0a458");
  ctx.fillStyle = wg;
  ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  const fx = wx0 + (wx1 - wx0) * 0.62;
  const fh = wy1 - wy0;
  ctx.fillStyle = "#2b1d14";
  ellipse(ctx, fx, wy0 + fh * 0.42, fh * 0.16, fh * 0.2);
  ctx.fill();
  rrect(ctx, fx - fh * 0.32, wy0 + fh * 0.6, fh * 0.64, fh * 0.45, fh * 0.15);
  ctx.fill();
  ctx.fillStyle = "#3a332c";
  ctx.fillRect(wx0 + (wx1 - wx0) * 0.5 - 0.5, wy0, 1, wy1 - wy0);
  // an awning over it
  ctx.fillStyle = shade([90, 88, 84], lit);
  ctx.fillRect(wx0 - 3, wy0 - (A.y - D.y) * 0.1, wx1 - wx0 + 6, Math.max(2, (A.y - D.y) * 0.05));
  // the door on the side
  const dx0 = B.x + (B2.x - B.x) * 0.3;
  const dx1 = B.x + (B2.x - B.x) * 0.7;
  const dTop = (x) => C.y + ((x - C.x) / (C2.x - C.x || 1)) * (C2.y - C.y);
  const dBot = (x) => B.y + ((x - B.x) / (B2.x - B.x || 1)) * (B2.y - B.y);
  ctx.fillStyle = shade([70, 70, 68], lit);
  poly(ctx, [
    [dx0, dBot(dx0)],
    [dx1, dBot(dx1)],
    [dx1, dTop(dx1) + (dBot(dx1) - dTop(dx1)) * 0.12],
    [dx0, dTop(dx0) + (dBot(dx0) - dTop(dx0)) * 0.12],
  ]);
  ctx.fill();
  // an aerial on the roof, a generator on the ground
  const ra = P(x0 + hut.w * 0.2, hut.h, hut.z + hd * 0.4);
  ctx.strokeStyle = "#1c1d20";
  ctx.lineWidth = 1;
  line(ctx, ra.x, ra.y, ra.x, ra.y - 1.6 * m * L.px(hut.z));
  const gA = P(x0 - 1.4 * m, 0, z0 + 0.4 * m);
  const gB = P(x0 - 0.3 * m, 0.8 * m, z0 + 0.4 * m);
  ctx.fillStyle = shade([150, 40, 30], lit * 0.8);
  ctx.fillRect(gA.x, gB.y, gB.x - gA.x, gA.y - gB.y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(gA.x, gB.y + (gA.y - gB.y) * 0.55, gB.x - gA.x, (gA.y - gB.y) * 0.45);
  return { x: (wx0 + wx1) / 2, y: (wy0 + wy1) / 2, w: wx1 - wx0, h: wy1 - wy0 };
}

// the flying-finish board: a red square with the chequered flag on it
function paintSign(ctx, L) {
  const { P, px, m, sign } = L;
  const k = px(sign.z) * m;
  const base = P(sign.x, 0, sign.z);
  const top = P(sign.x, 2.5 * m, sign.z);
  const lit = litAt(L, sign.x, sign.z);
  ctx.strokeStyle = "#1b1c1f";
  ctx.lineWidth = Math.max(1, 0.08 * k);
  line(ctx, base.x, base.y, base.x, top.y + 0.2 * k);
  const s = 1.05 * k;
  const bx = base.x - s / 2;
  const by = top.y;
  ctx.fillStyle = "#f2efe6";
  ctx.fillRect(bx - 0.05 * k, by - 0.05 * k, s + 0.1 * k, s + 0.1 * k);
  const red = Math.round(Math.min(255, 190 * lit));
  ctx.fillStyle = `rgb(${red},${Math.round(red * 0.12)},${Math.round(red * 0.12)})`;
  ctx.fillRect(bx + 0.04 * k, by + 0.04 * k, s - 0.08 * k, s - 0.08 * k);
  // the flag: a pole and a 4 × 3 chequer, waving a little
  const fx = bx + s * 0.28;
  ctx.strokeStyle = "#f2efe6";
  ctx.lineWidth = Math.max(1, 0.05 * k);
  line(ctx, fx, by + s * 0.2, fx, by + s * 0.84);
  const cw = (s * 0.5) / 4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#141414" : "#f2efe6";
      const wave = Math.sin(i * 1.2) * cw * 0.25;
      ctx.fillRect(fx + i * cw, by + s * 0.2 + j * cw + wave, cw + 0.3, cw + 0.3);
    }
  }
}

// the timing beam's cell: a small box on a tripod, one red eye
function paintPhotocell(ctx, L, cell) {
  const { P, px, m } = L;
  const k = px(cell.z) * m;
  const base = P(cell.x, 0, cell.z);
  const top = P(cell.x, 0.9 * m, cell.z);
  ctx.strokeStyle = "#1d1e21";
  ctx.lineWidth = Math.max(0.8, 0.04 * k);
  for (const s of [-1, 0.2, 1]) line(ctx, top.x, top.y, base.x + s * 0.32 * k, base.y + (s === 0.2 ? -0.1 * k : 0));
  ctx.fillStyle = "#2d2f33";
  ctx.fillRect(top.x - 0.13 * k, top.y - 0.16 * k, 0.26 * k, 0.18 * k);
  ctx.fillStyle = "#ff3b2e";
  circle(ctx, top.x + 0.07 * k, top.y - 0.07 * k, Math.max(0.8, 0.035 * k));
  ctx.fill();
}

// stakes and two strands of red-and-white tape, sagging between them
function paintTape(ctx, L, posts) {
  const { P, px, m } = L;
  const tops = posts.map((p) => ({ ...p, b: P(p.x, 0, p.z), t: P(p.x, 1.1 * m, p.z), k: px(p.z) * m }));
  for (const p of tops) {
    ctx.strokeStyle = "#2a241d";
    ctx.lineWidth = Math.max(1, 0.07 * p.k);
    line(ctx, p.b.x, p.b.y, p.t.x, p.t.y);
    ctx.strokeStyle = "rgba(255,210,160,0.35)";
    ctx.lineWidth = Math.max(0.5, 0.025 * p.k);
    line(ctx, p.b.x - 0.02 * p.k, p.b.y, p.t.x - 0.02 * p.k, p.t.y);
  }
  for (const hgt of [0.98, 0.6]) {
    for (let i = 0; i < tops.length - 1; i++) {
      const a = tops[i];
      const b = tops[i + 1];
      const seg = 10;
      for (let s = 0; s < seg; s++) {
        const u0 = s / seg;
        const u1 = (s + 1) / seg;
        const pa = P(a.x + (b.x - a.x) * u0, (hgt - 0.08 * Math.sin(Math.PI * u0)) * m, a.z + (b.z - a.z) * u0);
        const pb = P(a.x + (b.x - a.x) * u1, (hgt - 0.08 * Math.sin(Math.PI * u1)) * m, a.z + (b.z - a.z) * u1);
        ctx.strokeStyle = s % 2 ? "#e9e3d6" : "#c22a22";
        ctx.lineWidth = Math.max(1, 0.06 * a.k);
        line(ctx, pa.x, pa.y, pb.x, pb.y);
      }
    }
  }
}

// the bulbs strung along the tent's front; they stay on after the stage
function paintFestoon(ctx, L) {
  const { P, px, m, tent } = L;
  const k = px(tent.z) * m;
  const base = P(tent.x, 0, tent.z);
  const w = 3.4 * k;
  const y = base.y - 2.4 * k + 0.4 * k;
  const bulbs = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const x = base.x - w * 0.62 + w * 1.24 * u;
    const yy = y + Math.sin(Math.PI * ((u * 4) % 1)) * 0.25 * k;
    ctx.fillStyle = "#ffdca0";
    circle(ctx, x, yy, Math.max(0.8, 0.07 * k));
    ctx.fill();
    bulbs.push({ x, y: yy });
  }
  return bulbs;
}

// ── in front of the cars: bales on our side, the other photocell ────────────

// only the strip of screen they stand in: the canvas starts at y0
function paintFront(L) {
  const { W, H, P, m } = L;
  let y0 = P(L.cellNear.x, 1.2 * m, L.cellNear.z).y;
  for (const b of L.bales) y0 = Math.min(y0, P(b.x, 0.6 * m, b.z).y);
  y0 = Math.max(0, Math.floor(y0 - 8));
  const c = makeCanvas(W, H - y0);
  const ctx = c.getContext("2d");
  ctx.translate(0, -y0);
  const bales = L.bales.slice().sort((a, b) => b.z - a.z);
  for (const b of bales) paintBale(ctx, L, b);
  paintPhotocell(ctx, L, L.cellNear);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  grain(ctx, c.width, c.height, 0.04, true);
  return { canvas: c, y0 };
}

// a bale of straw, lying along the track, its twine and its loose ends
function paintBale(ctx, L, b) {
  const { P, m } = L;
  const hl = 0.6 * m;
  const hd = 0.25 * m;
  const hh = 0.45 * m;
  const lit = litAt(L, b.x, b.z);
  // the bale's own axes: along the track (tx, tz), and across it
  const nx = -b.tz;
  const nz = b.tx;
  const at = (u, v, h) => P(b.x + b.tx * u + nx * v, h, b.z + b.tz * u + nz * v);
  // v < 0 is toward the camera on our side of the track
  const f = [at(-hl, -hd, 0), at(hl, -hd, 0), at(hl, -hd, hh), at(-hl, -hd, hh)];
  const t = [at(-hl, -hd, hh), at(hl, -hd, hh), at(hl, hd, hh), at(-hl, hd, hh)];
  const rnd = lcg(b.seed);
  // straw: some bales new and gold, some weathered to grey
  const age = rnd();
  const tint = [150 - age * 40, 118 - age * 22, 62 + age * 10];
  const straw = (f0, f1) => {
    const c = (f) => tint.map((v) => Math.round(Math.min(255, v * f * lit))).join(",");
    return [`rgb(${c(f0)})`, `rgb(${c(f1)})`];
  };
  const face = (pts, cols, streaks) => {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
    p.closePath();
    const ys = pts.map((q) => q.y);
    const gr = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    gr.addColorStop(0, cols[0]);
    gr.addColorStop(1, cols[1]);
    ctx.fillStyle = gr;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    const xs = pts.map((q) => q.x);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    // the stalks: short strokes, mostly lying along the bale — gathered
    // into a few paths by shade, so there are four strokes, not hundreds
    ctx.lineWidth = 0.7;
    const len = Math.max(2, (x1 - x0) * 0.12);
    const stalks = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < streaks; i++) {
      const x = x0 + rnd() * (x1 - x0);
      const y = y0 + rnd() * (y1 - y0);
      const k = (rnd() < 0.55 ? 0 : 2) + (rnd() < 0.5 ? 0 : 1);
      stalks[k].moveTo(x, y);
      stalks[k].lineTo(x + (rnd() - 0.3) * len, y + (rnd() - 0.5) * len * 0.3);
    }
    ["rgba(255,228,160,0.22)", "rgba(255,228,160,0.36)", "rgba(40,26,8,0.24)", "rgba(40,26,8,0.38)"].forEach((s, k) => {
      ctx.strokeStyle = s;
      ctx.stroke(stalks[k]);
    });
    // the faces bulge: shade toward every edge
    const v = ctx.createLinearGradient(0, y0, 0, y1);
    v.addColorStop(0, "rgba(255,240,200,0.12)");
    v.addColorStop(0.3, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(20,12,4,0.35)");
    ctx.fillStyle = v;
    ctx.fill(p);
    ctx.restore();
    ctx.strokeStyle = "rgba(30,20,8,0.35)";
    ctx.lineWidth = 0.8;
    ctx.stroke(p);
  };
  face(t, straw(1.3, 1.0), 40);
  face(f, straw(0.95, 0.55), 60);
  // the end nearer the middle of the screen shows too
  const endU = b.x < 0 ? hl : -hl;
  const e = [at(endU, -hd, 0), at(endU, hd, 0), at(endU, hd, hh), at(endU, -hd, hh)];
  if (Math.abs(e[0].x - e[1].x) > 0.5) face(e, straw(0.7, 0.45), 8);
  // twine
  ctx.strokeStyle = "rgba(30,20,10,0.6)";
  ctx.lineWidth = 1;
  for (const u of [-0.45, 0.45]) {
    const a = at(u * hl, -hd, 0.02 * m);
    const bb = at(u * hl, -hd, hh);
    const cc = at(u * hl, hd, hh);
    line(ctx, a.x, a.y, bb.x, bb.y);
    line(ctx, bb.x, bb.y, cc.x, cc.y);
  }
  // wisps sticking out along the top edge
  ctx.strokeStyle = `rgba(255,220,150,${0.25 * lit})`;
  const wisps = new Path2D();
  for (let i = 0; i < 8; i++) {
    const u = (rnd() - 0.5) * 2 * hl;
    const p = at(u, -hd, hh);
    wisps.moveTo(p.x, p.y);
    wisps.lineTo(p.x + (rnd() - 0.5) * 5, p.y - 1 - rnd() * 3);
  }
  ctx.stroke(wisps);
}

// ── the frame ───────────────────────────────────────────────────────────────

function paintVeil(L) {
  const { W, H, S } = L;
  const c = makeCanvas(W / 4, H / 4);
  const ctx = c.getContext("2d");
  ctx.scale(c.width / W, c.height / H);
  const v = ctx.createRadialGradient(W / 2, H * 0.62, S * 0.3, W / 2, H * 0.55, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, "rgba(2,3,6,0)");
  v.addColorStop(1, "rgba(2,3,6,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

// gravel dust kicked up by a car: a soft, lumpy cloud
function paintDust() {
  const s = 96;
  const c = makeCanvas(s, s);
  const ctx = c.getContext("2d");
  const rnd = lcg(606);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * s * 0.2;
    softEllipse(ctx, s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r * 0.7, s * (0.14 + rnd() * 0.12), s * (0.12 + rnd() * 0.1), "205,188,160", 0.35);
  }
  return c;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function hash(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function softEllipse(ctx, cx, cy, rx, ry, rgb, a, op = "source-over") {
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

function rrect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
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

// painted on the CPU: these canvases are drawn once and handed to WebGL, and
// a CPU canvas goes up as a plain copy, where a GPU one stalls to sync
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
  return c;
}

function addCanvas(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

export function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
