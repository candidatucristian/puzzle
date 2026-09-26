/** The circuit as a real oval lying on the ground, seen from a camera raised
 *  above it and a little outside — so everything on screen follows from one
 *  projection instead of being faked per object.
 *
 *  World coordinates are (wx, wz): wx across, wz away from the eye. A point
 *  lands on screen at
 *
 *      x = W/2 + f·wx / wz          y = horizon + f·camH / wz
 *
 *  from which the one rule everything else obeys falls out:
 *
 *      an object standing on the ground is drawn at a size proportional to
 *      (its y − horizon)
 *
 *  A car therefore shrinks only as it climbs toward the horizon, by exactly
 *  the amount its height above the road already implies — and it NEVER tilts.
 *  A car on flat ground stays upright on screen however the road curves; any
 *  rotation would read as a ramp. `scaleAt` and `centre` are the only things
 *  a caller needs to place one, and `checkPerspective` asserts the rule holds.
 *
 *  The driven stretch is the near side of the oval, taken left to right. The
 *  far side is drawn too — a thinner band nearer the horizon — which is what
 *  makes the track read as a loop rather than a strip.
 */

export const TRACK_TUNE = {
  HORIZON: 0.545, // the horizon, as a fraction of H
  A: 5.6, // f·Rx / W — how far the oval reaches across
  B: 1.53, // f·camH / H — how fast things shrink with depth
  ZC: 9, // depth of the oval's centre, in world units
  RZ: 3, // its half-depth, so the near side sits at ZC − RZ
  TW: 1.44, // half the track's width
  THETA0: 215, // the driven stretch starts here (degrees)
  THETA1: 325, // and ends here — both are off the side of the screen
  FINISH_U: 0.5, // the line sits where the track runs closest to us, so a
  // car is at its largest exactly where its number has to be read
  SAMPLES: 96, // how finely the bands and the x→y tables are sampled
};

const RAD = Math.PI / 180;

export function makeTrack(W, H, tune = {}) {
  const T = { ...TRACK_TUNE, ...tune };
  const horizonY = H * T.HORIZON;
  const Rx = T.A;
  const { RZ: Rz, ZC: Zc, TW: tw } = T;

  const world = (deg) => {
    const a = deg * RAD;
    return { wx: Rx * Math.cos(a), wz: Zc + Rz * Math.sin(a) };
  };

  // the ellipse's outward normal, used to lay the track's width either side
  const normal = (deg) => {
    const a = deg * RAD;
    const nx = Math.cos(a) / Rx;
    const nz = Math.sin(a) / Rz;
    const len = Math.hypot(nx, nz) || 1;
    return { nx: nx / len, nz: nz / len };
  };

  const project = (wx, wz) => ({
    x: W / 2 + (W * wx) / wz, // f = W, so wx is already in screen-widths
    y: horizonY + (T.B * H) / wz,
    wz,
  });

  const degAt = (u) => T.THETA0 + (T.THETA1 - T.THETA0) * u;

  /** The racing line at u (0 entering on the left, 1 leaving on the right). */
  const centre = (u) => {
    const { wx, wz } = world(degAt(u));
    return project(wx, wz);
  };

  /** The track's two edges at u: `near` is the one toward us. */
  const edges = (u) => {
    const deg = degAt(u);
    const { wx, wz } = world(deg);
    const { nx, nz } = normal(deg);
    return {
      near: project(wx + tw * nx, wz + tw * nz),
      far: project(wx - tw * nx, wz - tw * nz),
    };
  };

  // A car is built at the size it should be on the finish line, so its scale
  // there is exactly 1 and it is at its most readable where it is judged.
  const wzFinish = centre(T.FINISH_U).wz;
  const scaleAt = (u) => wzFinish / centre(u).wz;

  /** The same scale from a screen height alone — the rule, stated directly. */
  const scaleAtY = (y) => (y - horizonY) / (centre(T.FINISH_U).y - horizonY);

  // ── sampled geometry ──────────────────────────────────────────────────────

  const span = (from, to, n) =>
    Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);

  /** The near side of the track as a closed polygon, ready to fill. */
  const nearBand = () => {
    const us = span(0, 1, T.SAMPLES);
    const far = us.map((u) => edges(u).far);
    const near = us.map((u) => edges(u).near);
    return [...far, ...near.reverse()];
  };

  /** The far side of the oval, the thin band up near the horizon. */
  const farBand = () => {
    const degs = span(T.THETA1 - 360, T.THETA0, T.SAMPLES);
    const out = [];
    const back = [];
    for (const deg of degs) {
      const { wx, wz } = world(deg);
      const { nx, nz } = normal(deg);
      out.push(project(wx + tw * nx, wz + tw * nz));
      back.push(project(wx - tw * nx, wz - tw * nz));
    }
    return [...out, ...back.reverse()];
  };

  /** The grass the oval encloses, for filling between the two sides. */
  const infield = () => {
    const degs = span(0, 360, T.SAMPLES * 2);
    return degs.map((deg) => {
      const { wx, wz } = world(deg);
      const { nx, nz } = normal(deg);
      return project(wx - tw * nx, wz - tw * nz);
    });
  };

  // x → the track's edges at that x, so scenery can sit on the road without
  // knowing anything about the projection
  const table = (() => {
    const rows = [];
    for (let i = 0; i <= T.SAMPLES * 2; i++) {
      const u = -0.06 + (1.12 * i) / (T.SAMPLES * 2);
      const e = edges(u);
      const c = centre(u);
      rows.push({ x: c.x, far: e.far.y, near: e.near.y, mid: c.y });
    }
    rows.sort((a, b) => a.x - b.x);
    return rows;
  })();

  const lookup = (x, key) => {
    if (x <= table[0].x) return table[0][key];
    const last = table[table.length - 1];
    if (x >= last.x) return last[key];
    let lo = 0;
    let hi = table.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (table[m].x <= x) lo = m;
      else hi = m;
    }
    const a = table[lo];
    const b = table[hi];
    const t = (x - a.x) / (b.x - a.x || 1);
    return a[key] + (b[key] - a[key]) * t;
  };

  return {
    tune: T,
    horizonY,
    centre,
    edges,
    scaleAt,
    scaleAtY,
    nearBand,
    farBand,
    infield,
    finishU: T.FINISH_U,
    /** The far (upper) edge of the track at this screen x. */
    farYAt: (x) => lookup(x, "far"),
    /** The near (lower) edge of the track at this screen x. */
    nearYAt: (x) => lookup(x, "near"),
    /** The racing line's height at this screen x. */
    midYAt: (x) => lookup(x, "mid"),
  };
}

/** The projection's own check: a car's size must stay proportional to how far
 *  below the horizon it sits. Returns the worst relative error over the drive
 *  — anything above about 1e-9 means something is placing cars by hand again. */
export function checkPerspective(track, steps = 200) {
  let worst = 0;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const c = track.centre(u);
    const byDepth = track.scaleAt(u);
    const byHeight = track.scaleAtY(c.y);
    worst = Math.max(worst, Math.abs(byDepth - byHeight) / byDepth);
  }
  return worst;
}
