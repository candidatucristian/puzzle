// The candle shares the study's camera and light. Its wax — uneven, dripped,
// burned down into a hollow round a pool of melted wax — is ray-marched in
// world space and baked into the room's two layers: the room with no light,
// and what the flame adds (so the wax's glow dims and dies with the flame).
// Only the flame, the ember and the smoke are drawn during play (Candle.js).
export function candleLayout(cam, W, H, deskY) {
  const foot = cam.deskToWorld(W * 0.81, deskY + (H - deskY) * 0.42);
  const radius = 2.65;
  const height = 15.4;
  const flame = { x: foot.x - 0.16, y: height + 1.35, z: foot.z - 0.25 };
  const wick = cam.P(flame.x, height + 0.36, flame.z);
  return { foot, radius, height, flame, wick, scale: cam.kAt(foot.z) };
}

function waxDistance(x, y, z, candle) {
  const { radius: r, height: h } = candle;
  const radial = Math.hypot(x, z),
    angle = Math.atan2(z, x);
  // Small variations round the wall: wax has no perfectly straight edge.
  let rr =
    r +
    0.045 * Math.sin(angle * 9 + y * 1.3) +
    0.025 * Math.sin(y * 4.7 + angle * 5);
  for (const [a, end, width, rise] of [
    [-2.1, 5.5, 0.13, 0.27],
    [-1.25, 9.6, 0.19, 0.32],
    [-0.45, 7.5, 0.12, 0.22],
    [-2.85, 11.3, 0.17, 0.25],
  ]) {
    const side = Math.atan2(Math.sin(angle - a), Math.cos(angle - a));
    const bottom = Math.max(0, end - y);
    const d = Math.hypot(side / width, bottom / 0.55);
    // a rounded bead of wax, flowing smoothly into the wall beside it
    if (d < 1) rr += rise * (1 - d * d) * (1 - d * d);
  }
  // The irregular crown surrounds a recessed melt pool; the inner walls are
  // deliberately visible from the camera, with a charred wick at its centre.
  const crown =
    h +
    0.17 * Math.sin(angle * 3 + 0.7) +
    0.08 * Math.sin(angle * 7) -
    1.05 * Math.exp(-Math.pow(radial / (r * 0.72), 6));
  const body = Math.max(radial - rr, y - crown, 0.13 - y);
  const skirtR =
    r * (1.15 + 0.075 * Math.sin(angle * 3) + 0.05 * Math.sin(angle * 7 + 1));
  const skirt = Math.max(radial - skirtR, y - 0.17, -0.02 - y);
  return Math.min(body, skirt);
}

const IVORY = [238, 225, 198]; // the wax, in daylight
const GOLD = [255, 204, 128]; // the flame's light just under the wax's skin
const AMBER = [240, 126, 50]; // ...and deeper in, where it has turned red
const LIP = [255, 196, 118]; // the thin lip round the hollow, lit through
const POOL = [255, 170, 78]; // melted wax, lit from above

export function paintCandle(rc, lc, cam, candle, shadePixel) {
  const { foot, radius: r, height: h, flame, scale: k } = candle;
  groundShadow(rc, lc, cam, candle);

  const bottom = cam.P(foot.x, 0, foot.z);
  const top = cam.P(foot.x, h + 1, foot.z);
  const margin = Math.ceil(r * k * 1.7);
  const x0 = Math.max(0, Math.floor(bottom.x - margin));
  const y0 = Math.max(0, Math.floor(top.y - margin * 0.35));
  const w = Math.min(Math.ceil(cam.W) - x0, margin * 2);
  const hh = Math.min(
    Math.ceil(cam.H) - y0,
    Math.ceil(bottom.y - y0 + margin * 0.75),
  );
  if (w <= 0 || hh <= 0) return;
  const base = rc.getImageData(x0, y0, w, hh),
    light = lc.getImageData(x0, y0, w, hh);
  const B = [0, 0, 0, 0],
    L = [0, 0, 0, 0];
  const bounds = [
    [foot.x - r * 1.5, foot.x + r * 1.5],
    [-0.05, h + 0.5],
    [foot.z - r * 1.5, foot.z + r * 1.5],
  ];
  const eye = [0, 40, 0];
  const pix = 1 / cam.F; // one pixel, as an angle
  const colB = [0, 0, 0],
    colL = [0, 0, 0];
  for (let j = 0; j < hh; j++)
    for (let i = 0; i < w; i++) {
      const ray = [
        (x0 + i + 0.5 - cam.cx) / cam.F,
        (cam.hy - y0 - j - 0.5) / cam.F,
        1,
      ];
      const length = Math.hypot(...ray);
      for (let q = 0; q < 3; q++) ray[q] /= length;
      let near = 0,
        far = Infinity;
      for (let q = 0; q < 3; q++) {
        const a = (bounds[q][0] - eye[q]) / ray[q],
          b = (bounds[q][1] - eye[q]) / ray[q];
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
      }
      if (near > far) continue;
      // march to the wax, remembering how close a miss came: a ray that
      // grazes the edge covers part of its pixel, so the silhouette is smooth
      let t = near,
        hit = false,
        best = Infinity,
        bestT = near;
      for (let step = 0; step < 110 && t < far; step++) {
        const d = waxDistance(
          ray[0] * t - foot.x,
          40 + ray[1] * t,
          ray[2] * t - foot.z,
          candle,
        );
        if (d < best) {
          best = d;
          bestT = t;
        }
        if (d < 0.012) {
          hit = true;
          bestT = t;
          break;
        }
        t += Math.max(0.01, d * 0.7);
      }
      const foot2 = bestT * pix;
      const cover = hit ? 1 : Math.max(0, 1 - best / foot2);
      if (cover <= 0.02) continue;
      const x = ray[0] * bestT - foot.x,
        y = 40 + ray[1] * bestT,
        z = ray[2] * bestT - foot.z;
      shadeWax(x, y, z, ray, candle, flame, shadePixel, B, L, colB, colL, foot);
      const o = (j * w + i) * 4;
      for (let q = 0; q < 3; q++) {
        base.data[o + q] = base.data[o + q] * (1 - cover) + colB[q] * cover;
        light.data[o + q] = light.data[o + q] * (1 - cover) + colL[q] * cover;
      }
    }
  rc.putImageData(base, x0, y0);
  lc.putImageData(light, x0, y0);
  paintWick(rc, lc, cam, candle);
}

// How the wax looks at one point: the room's light alone (colB), and what
// the flame adds (colL) — its direct light, and above all the light that
// soaks into the wax and glows back out of it
function shadeWax(
  x,
  y,
  z,
  ray,
  candle,
  flame,
  shadePixel,
  B,
  L,
  colB,
  colL,
  foot,
) {
  const { radius: r, height: h } = candle;
  const e = 0.02;
  const nx =
    waxDistance(x + e, y, z, candle) - waxDistance(x - e, y, z, candle);
  const ny =
    waxDistance(x, y + e, z, candle) - waxDistance(x, y - e, z, candle);
  const nz =
    waxDistance(x, y, z + e, candle) - waxDistance(x, y, z - e, candle);
  const nl = Math.hypot(nx, ny, nz) || 1;
  const n = { x: nx / nl, y: ny / nl, z: nz / nl };
  const p = { x: x + foot.x, y, z: z + foot.z };
  const radial = Math.hypot(x, z);
  const pool = n.y > 0.9 && y < h - 0.5 && radial < r * 0.8;
  const inner = !pool && radial < r * 0.88 && y > h - 1.25;
  const dTop = Math.max(0, h - y);
  const fleck =
    Math.sin(x * 116.3 + y * 87.1 + z * 53.7) * Math.sin(y * 135.1 - x * 93.4);
  const grain = 1 + fleck * 0.02 + Math.sin(y * 37 + x * 2) * 0.008;
  const albedo = [IVORY[0] * grain, IVORY[1] * grain, IVORY[2] * grain];
  const ao = 0.72 + 0.28 * Math.min(1, y / 1.2);
  // the flame sits just above the rim: from outside the rim, the wax itself
  // stands between a point and the flame (the foot, the puddle round it)
  let vis = 1;
  if (radial > r * 0.97) {
    const ys = y + (flame.y - y) * (1 - r / radial);
    vis = Math.max(0, Math.min(1, (ys - (h - 0.35)) / 0.4));
  }
  // the surface itself: a satin sheen on the wax, a mirror on the pool
  shadePixel(
    albedo,
    p,
    n,
    pool ? 1.3 : 0.07,
    pool ? 220 : 22,
    vis,
    flame,
    B,
    L,
    0,
    ao,
    [1, 0.92, 0.8],
  );
  const facing = Math.abs(n.x * ray[0] + n.y * ray[1] + n.z * ray[2]);
  let add0, add1, add2;
  if (pool) {
    // molten wax: amber, lit through, brighter at its edge where it is shallow
    const edge = Math.pow(Math.min(1, radial / (r * 0.72)), 4);
    const s = 0.55 + 0.35 * edge;
    add0 = POOL[0] * s;
    add1 = POOL[1] * s;
    add2 = POOL[2] * s;
    for (let q = 0; q < 3; q++) B[q] *= 0.8;
  } else if (inner) {
    // the hollow's walls and the lip: lit straight by the flame, and thin
    // enough for the light to come through — the brightest wax there is
    const lip = Math.exp(-Math.max(0, h - 0.25 - y) / 0.5);
    const s = 0.6 + 0.28 * lip;
    add0 = LIP[0] * s;
    add1 = LIP[1] * s;
    add2 = LIP[2] * s;
  } else {
    // the outside: light scattered in the wax glows under its skin, gold
    // just below the rim, going amber and fading down the side; a little of
    // it reaches all the way down
    // it reaches the foot, and the lit wall and desk throw some back
    const near = Math.exp(-dTop / 1.3);
    const mid = Math.exp(-dTop / 4.5) * (1 - near);
    const low = 0.15 + 0.09 * Math.exp(-dTop / 12);
    const rim = 1 + 0.6 * (1 - facing); // thinner wax toward the silhouette
    const warm = [1, 0.82, 0.6];
    add0 =
      (GOLD[0] * 0.72 * near + AMBER[0] * 0.34 * mid) * rim +
      albedo[0] * warm[0] * low * rim;
    add1 =
      (GOLD[1] * 0.72 * near + AMBER[1] * 0.34 * mid) * rim +
      albedo[1] * warm[1] * low * rim;
    add2 =
      (GOLD[2] * 0.72 * near + AMBER[2] * 0.34 * mid) * rim +
      albedo[2] * warm[2] * low * rim;
  }
  // right by the flame its direct light would bleach the wax white: there,
  // the wax's own gold carries it
  const direct = pool || inner ? 0.45 : 1;
  colB[0] = B[0];
  colB[1] = B[1];
  colB[2] = B[2];
  colL[0] = L[0] * direct + add0;
  colL[1] = L[1] * direct + add1;
  colL[2] = L[2] * direct + add2;
}

// The candle stands in its own shadow: the flame burns just above the rim,
// so the wax hides it from the desk close round the candle's foot. And where
// it touches the desk, a darker line, so it stands rather than floats.
function groundShadow(rc, lc, cam, c) {
  const { foot, radius: r } = c;
  const at = (dx, dz) => cam.P(foot.x + dx, 0, foot.z + dz);
  const o = at(0, 0);
  const ellipse = (ctx, R, a, soft) => {
    const rx = (at(R, 0).x - at(-R, 0).x) / 2;
    const ry = (at(0, -R).y - at(0, R).y) / 2;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(soft, `rgba(0,0,0,${a * 0.6})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  };
  ellipse(lc, r * 4.2, 0.8, 0.45);
  ellipse(lc, r * 1.7, 0.7, 0.7);
  ellipse(rc, r * 1.6, 0.55, 0.7);
}

// A short cotton wick, bent over, black, standing in the pool — its tip
// glowing where the flame holds it (only in the flame's layer)
function paintWick(rc, lc, cam, candle) {
  const { flame, height: h, scale: k } = candle;
  const a = cam.P(flame.x + 0.12, h - 0.7, flame.z);
  const b = candle.wick;
  for (const ctx of [rc, lc]) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = ctx === rc ? "#0d0b09" : "#070302";
    ctx.lineWidth = Math.max(1.3, k * 0.16);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x + k * 0.2, b.y + k * 0.42, b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  lc.save();
  const g = lc.createRadialGradient(
    b.x,
    b.y,
    0,
    b.x,
    b.y,
    Math.max(2, k * 0.3),
  );
  g.addColorStop(0, "rgba(255,150,60,0.9)");
  g.addColorStop(1, "rgba(255,90,20,0)");
  lc.fillStyle = g;
  lc.fillRect(b.x - k, b.y - k, k * 2, k * 2);
  lc.restore();
}
