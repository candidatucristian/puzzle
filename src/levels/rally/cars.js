/** The six cars of RALLY, built once as a real 3D model and rendered in
 *  software, so each one looks the way the track's projection says it must:
 *  a car coming round the bend on the left is seen from the front, crosses the
 *  line side-on, and leaves on the right showing its tail. A single painted
 *  side view would be wrong by up to 50° at the edges of the screen — it would
 *  crab sideways into the frame instead of driving round the oval.
 *
 *  The model is a gravel-spec rally hatchback in metres (x forward, y up, z to
 *  the car's left): a body lofted from cross-sections, wheels turned on a
 *  lathe, and the parts that make it a rally car — a pod of four lamps on the
 *  nose, mud flaps, a roof wing, a big number panel on the door. It is
 *  rasterised with a depth buffer at every yaw the drive needs (FRAME_COUNT
 *  views, YAW_STEP apart) and shaded under the stage's lights: the two
 *  floodlight masts behind the cars, two more behind the camera, the moon, and
 *  the night sky reflected in the paint.
 *
 *  Everything here is plain arithmetic on typed arrays; only `paintCars`
 *  touches a canvas. The scene picks a view with `relativeYaw` + `frameAt`
 *  and cross-fades between the two nearest, so the car turns smoothly. */

export const CAR_LENGTH_M = 4.12;

// The views rendered, as the angle between the car's heading and the
// direction it is seen from: entering on the left a car is seen well from the
// front, side-on at the line (−90°, the middle view, exactly), then from the
// rear. Extra end views cover the enlarged cars entering and leaving the screen.
export const YAW_FIRST = -157.5;
export const YAW_STEP = 7.5;
export const FRAME_COUNT = 19;

const RAD = Math.PI / 180;

// ── the six cars ────────────────────────────────────────────────────────────
// Liveries after the great rally cars of the 80s and 90s — colour only, no
// lettering anywhere: the door numbers are the only text in the scene.

export const LIVERIES = [
  { name: "stripes", base: [0.8, 0.8, 0.78], rim: [0.78, 0.78, 0.76], wing: [0.8, 0.8, 0.78], flap: [0.015, 0.02, 0.07] },
  { name: "blue", base: [0.012, 0.035, 0.24], rim: [0.7, 0.48, 0.14], rimMetal: true, wing: [0.012, 0.035, 0.24], flap: [0.02, 0.02, 0.025] },
  { name: "chevron", base: [0.8, 0.8, 0.78], rim: [0.78, 0.78, 0.76], wing: [0.62, 0.015, 0.02], flap: [0.62, 0.015, 0.02] },
  { name: "green", base: [0.8, 0.8, 0.78], rim: [0.78, 0.78, 0.76], wing: [0.01, 0.26, 0.07], flap: [0.02, 0.02, 0.025] },
  { name: "gulf", base: [0.26, 0.5, 0.74], rim: [0.55, 0.56, 0.58], rimMetal: true, wing: [0.26, 0.5, 0.74], flap: [0.85, 0.26, 0.02] },
  { name: "black", base: [0.011, 0.011, 0.013], rim: [0.72, 0.52, 0.18], rimMetal: true, wing: [0.011, 0.011, 0.013], flap: [0.02, 0.02, 0.025] },
];

const DUST = [0.3, 0.25, 0.19];
const PANEL_WHITE = [0.84, 0.83, 0.79];

// ── the body's profile (side view) and plan ─────────────────────────────────

const XR = -2.07; // the tail
const XF = 2.07; // the nose
const AXLE_F = 1.27;
const AXLE_R = -1.3;
const WHEEL_R = 0.33;
const WHEEL_Z = 0.765;
const ARCH_R = 0.418;

// the number panel on the front door (and its mirror on the other side),
// in metres along the car and up from the ground
export const NUMBER_PANEL = { x0: -0.33, x1: 0.8, y0: 0.29, y1: 0.87 };
const PANEL = NUMBER_PANEL;

function monotone(points) {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

// the top line: tail, hatch glass, roof, windscreen, bonnet, nose
const topLine = monotone([
  [-2.07, 0.8],
  [-2.04, 0.93],
  [-1.98, 1.03],
  [-1.88, 1.13],
  [-1.72, 1.27],
  [-1.52, 1.38],
  [-1.3, 1.435],
  [-0.6, 1.455],
  [0.0, 1.445],
  [0.14, 1.41],
  [0.4, 1.27],
  [0.7, 1.09],
  [0.94, 0.955],
  [1.2, 0.915],
  [1.55, 0.87],
  [1.85, 0.815],
  [1.98, 0.77],
  [2.07, 0.7],
]);
// the shoulder: the crease the side glass sits on
const beltLine = monotone([
  [-2.07, 0.73],
  [-2.0, 0.86],
  [-1.85, 0.935],
  [-1.4, 0.955],
  [-0.4, 0.935],
  [0.4, 0.905],
  [0.94, 0.885],
  [1.3, 0.83],
  [1.7, 0.77],
  [1.95, 0.7],
  [2.07, 0.63],
]);
const bottomLine = monotone([
  [-2.07, 0.42],
  [-2.0, 0.34],
  [-1.85, 0.29],
  [-1.6, 0.27],
  [1.6, 0.26],
  [1.9, 0.29],
  [2.07, 0.37],
]);
// the top's half-width, as a share of the body's: the glasshouse leans in
const topShare = monotone([
  [-2.07, 0.84],
  [-1.88, 0.8],
  [-1.52, 0.76],
  [-1.3, 0.735],
  [0.0, 0.73],
  [0.14, 0.74],
  [0.94, 0.88],
  [2.07, 0.88],
]);
const crownLine = monotone([
  [-2.07, 0.0],
  [-1.9, 0.02],
  [-1.3, 0.035],
  [0.1, 0.035],
  [0.94, 0.03],
  [1.9, 0.03],
  [2.07, 0.0],
]);

const HALF_W = 0.905;
function halfWidth(x) {
  if (x > 1.5) {
    const t = Math.min(1, (x - 1.5) / (XF - 1.5));
    return HALF_W * Math.pow(Math.max(0, 1 - Math.pow(t, 3)), 1 / 3);
  }
  if (x < -1.72) {
    const t = Math.min(1, (-1.72 - x) / (-1.72 - XR));
    return HALF_W * Math.pow(Math.max(0, 1 - Math.pow(t, 3.6)), 1 / 3.6);
  }
  return HALF_W;
}

// the profile, tabulated every centimetre so shading can look it up cheaply
const TAB_N = Math.round((XF - XR) * 100) + 1;
const TAB = {
  top: new Float32Array(TAB_N),
  belt: new Float32Array(TAB_N),
  bottom: new Float32Array(TAB_N),
  half: new Float32Array(TAB_N),
  topHalf: new Float32Array(TAB_N),
};
for (let i = 0; i < TAB_N; i++) {
  const x = XR + i / 100;
  TAB.top[i] = topLine(x);
  TAB.belt[i] = beltLine(x);
  TAB.bottom[i] = bottomLine(x);
  TAB.half[i] = halfWidth(x);
  TAB.topHalf[i] = TAB.half[i] * topShare(x);
}
const tab = (arr, x) => {
  const f = (x - XR) * 100;
  if (f <= 0) return arr[0];
  if (f >= TAB_N - 1) return arr[TAB_N - 1];
  const i = f | 0;
  return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
};

// ── the mesh ────────────────────────────────────────────────────────────────

export const PART = {
  BODY: 1,
  TREAD: 2,
  WALL: 3,
  RIM: 4,
  LINER: 5,
  POD: 6,
  POD_LAMP: 7,
  WING: 8,
  MIRROR: 9,
  FLAP: 10,
  VENT: 11,
  TOW: 12,
  EXHAUST: 13,
};
// open or thin parts are drawn from both sides
const TWO_SIDED = new Set([PART.LINER, PART.FLAP, PART.WING]);

function meshBuilder() {
  const v = []; // x, y, z, nx, ny, nz, part
  const idx = [];
  return {
    v,
    idx,
    vert(x, y, z, nx, ny, nz, part) {
      const l = Math.hypot(nx, ny, nz) || 1;
      v.push(x, y, z, nx / l, ny / l, nz / l, part);
      return v.length / 7 - 1;
    },
    // each triangle is wound so its own normal agrees with its corners' —
    // back faces are then simply the ones turned away from the camera
    tri(a, b, c) {
      const p = (i, k) => v[i * 7 + k];
      const ex = p(b, 0) - p(a, 0);
      const ey = p(b, 1) - p(a, 1);
      const ez = p(b, 2) - p(a, 2);
      const fx = p(c, 0) - p(a, 0);
      const fy = p(c, 1) - p(a, 1);
      const fz = p(c, 2) - p(a, 2);
      const gx = ey * fz - ez * fy;
      const gy = ez * fx - ex * fz;
      const gz = ex * fy - ey * fx;
      if (Math.hypot(gx, gy, gz) < 1e-12) return;
      const nx = p(a, 3) + p(b, 3) + p(c, 3);
      const ny = p(a, 4) + p(b, 4) + p(c, 4);
      const nz = p(a, 5) + p(b, 5) + p(c, 5);
      if (gx * nx + gy * ny + gz * nz < 0) idx.push(a, c, b);
      else idx.push(a, b, c);
    },
  };
}

// the body: a cross-section at each station, lofted nose to tail
function sectionControl(x) {
  const zb = halfWidth(x);
  const yb = bottomLine(x);
  const ys = beltLine(x);
  const yt = topLine(x);
  const zt = zb * topShare(x);
  const crown = crownLine(x) * (zb / HALF_W);
  return [
    [0, yb],
    [0.8 * zb, yb],
    [0.975 * zb, yb + Math.min(0.07, (ys - yb) * 0.2)],
    [zb, yb + (ys - yb) * 0.55],
    [0.985 * zb, ys - 0.015],
    [0.955 * zb, ys + 0.012],
    [zt, Math.max(ys + 0.028, yt - 0.055)],
    [zt * 0.93, Math.max(ys + 0.045, yt - 0.007)],
    [0, yt + crown],
  ];
}

const SEG_SAMPLES = 3;
function sectionRing(x) {
  const c = sectionControl(x);
  const n = c.length;
  // Catmull-Rom through the control points; the ends continue into their
  // mirror images so the curve crosses the centreline square
  const at = (i) => {
    if (i < 0) return [-c[1][0], c[1][1]];
    if (i >= n) return [-c[n - 2][0], c[n - 2][1]];
    return c[i];
  };
  const half = [];
  for (let s = 0; s < n - 1; s++) {
    const p0 = at(s - 1);
    const p1 = at(s);
    const p2 = at(s + 1);
    const p3 = at(s + 2);
    for (let k = 0; k < SEG_SAMPLES; k++) {
      const t = k / SEG_SAMPLES;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, cc, d) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      half.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  half.push(c[n - 1]);
  // round the ring: up the camera side (z < 0), down the other
  const ring = half.map(([z, y]) => [-z, y]);
  for (let k = half.length - 2; k >= 1; k--) ring.push([half[k][0], half[k][1]]);
  return ring;
}

const STATIONS = 84;
function buildBody(mb) {
  const xs = [];
  for (let i = 0; i <= STATIONS; i++) xs.push(XR + ((XF - XR) * (1 - Math.cos((Math.PI * i) / STATIONS))) / 2);
  const rings = xs.map((x) => sectionRing(x).map(([z, y]) => [x, y, z]));
  const R = rings[0].length;
  const ids = [];
  for (let i = 0; i <= STATIONS; i++) {
    const row = [];
    for (let j = 0; j < R; j++) {
      const p = rings[i][j];
      const ip = rings[Math.min(STATIONS, i + 1)][j];
      const im = rings[Math.max(0, i - 1)][j];
      const jp = rings[i][(j + 1) % R];
      const jm = rings[i][(j - 1 + R) % R];
      const ti = [ip[0] - im[0], ip[1] - im[1], ip[2] - im[2]];
      const tj = [jp[0] - jm[0], jp[1] - jm[1], jp[2] - jm[2]];
      // outward: around-the-ring × along-the-car
      let nx = tj[1] * ti[2] - tj[2] * ti[1];
      let ny = tj[2] * ti[0] - tj[0] * ti[2];
      let nz = tj[0] * ti[1] - tj[1] * ti[0];
      if (i === 0 || i === STATIONS) {
        // the tips close on a vertical line: the surface there faces straight
        // along the car, tilted only as much as the nose or tail slopes
        const l = Math.hypot(nx, ny, nz) || 1;
        nx = i === 0 ? -1 : 1;
        ny = (ny / l) * 0.6;
        nz = 0;
      }
      row.push(mb.vert(p[0], p[1], p[2], nx, ny, nz, PART.BODY));
    }
    ids.push(row);
  }
  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < R; j++) {
      const a = ids[i][j];
      const b = ids[i + 1][j];
      const c = ids[i + 1][(j + 1) % R];
      const d = ids[i][(j + 1) % R];
      mb.tri(a, d, c);
      mb.tri(a, c, b);
    }
  }
}

// a surface of revolution round an axle along z: profile [[r, zOff]], zOff
// measured outward from the wheel's centre plane (side = −1 or 1)
function lathe(mb, cx, cy, cz, side, profile, segs, part, inward = false) {
  const rows = [];
  for (let k = 0; k < profile.length; k++) {
    const [r, zo] = profile[k];
    const prev = profile[Math.max(0, k - 1)];
    const next = profile[Math.min(profile.length - 1, k + 1)];
    const dr = next[0] - prev[0];
    const dz = next[1] - prev[1];
    let nr = dz;
    let nzo = -dr;
    if (inward) {
      nr = -nr;
      nzo = -nzo;
    }
    const row = [];
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      row.push(mb.vert(cx + r * ca, cy + r * sa, cz + side * zo, nr * ca, nr * sa, nzo * side, part));
    }
    rows.push(row);
  }
  for (let k = 0; k < rows.length - 1; k++) {
    for (let s = 0; s < segs; s++) {
      const a = rows[k][s];
      const b = rows[k][(s + 1) % segs];
      const c = rows[k + 1][(s + 1) % segs];
      const d = rows[k + 1][s];
      mb.tri(a, b, c);
      mb.tri(a, c, d);
    }
  }
}

function box(mb, x0, x1, y0, y1, z0, z1, part) {
  const faces = [
    [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]],
    [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0]],
    [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]],
    [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0]],
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
    [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]],
  ];
  for (const [a, b, c, d, n] of faces) {
    const ia = mb.vert(...a, ...n, part);
    const ib = mb.vert(...b, ...n, part);
    const ic = mb.vert(...c, ...n, part);
    const id = mb.vert(...d, ...n, part);
    mb.tri(ia, ib, ic);
    mb.tri(ia, ic, id);
  }
}

// a flat disc facing +x (the pod's lamps)
function discX(mb, x, cy, cz, r, segs, part) {
  const c = mb.vert(x, cy, cz, 1, 0, 0, part);
  const ring = [];
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    ring.push(mb.vert(x, cy + Math.sin(a) * r, cz + Math.cos(a) * r, 1, 0, 0, part));
  }
  for (let s = 0; s < segs; s++) mb.tri(c, ring[s], ring[(s + 1) % segs]);
}

const TREAD = [
  [0.305, -0.112],
  [0.323, -0.103],
  [0.33, -0.085],
  [0.33, 0.085],
  [0.323, 0.103],
  [0.305, 0.112],
];
const WALL = [
  [0.305, 0.112],
  [0.28, 0.117],
  [0.245, 0.114],
  [0.212, 0.107],
];
const RIM_PROFILE = [
  [0.212, 0.107],
  [0.205, 0.1],
  [0.2, 0.092],
  [0.14, 0.085],
  [0.07, 0.08],
  [0.001, 0.078],
];

// the pod's four lamps and the headlights, for the glare the scene lays over
// them; the tail lamps for the red glow as a car leaves
export const LAMPS = [
  { kind: "pod", p: [2.1, 0.82, -0.48], n: [1, 0, 0] },
  { kind: "pod", p: [2.1, 0.82, -0.17], n: [1, 0, 0] },
  { kind: "pod", p: [2.1, 0.82, 0.17], n: [1, 0, 0] },
  { kind: "pod", p: [2.1, 0.82, 0.48], n: [1, 0, 0] },
  { kind: "head", p: [2.0, 0.66, -0.6], n: [0.92, 0, -0.39] },
  { kind: "head", p: [2.0, 0.66, 0.6], n: [0.92, 0, 0.39] },
  { kind: "tail", p: [-2.07, 0.88, -0.66], n: [-0.9, 0, -0.43] },
  { kind: "tail", p: [-2.07, 0.88, 0.66], n: [-0.9, 0, 0.43] },
];
const POD_LAMPS = LAMPS.filter((l) => l.kind === "pod");

let MESH = null;
/** The car, as one mesh: positions, normals, a part id per vertex, triangles. */
export function carMesh() {
  if (MESH) return MESH;
  const mb = meshBuilder();
  buildBody(mb);
  for (const ax of [AXLE_F, AXLE_R]) {
    for (const side of [-1, 1]) {
      const cz = side * WHEEL_Z;
      lathe(mb, ax, WHEEL_R, cz, side, TREAD, 40, PART.TREAD);
      lathe(mb, ax, WHEEL_R, cz, side, WALL, 40, PART.WALL);
      lathe(mb, ax, WHEEL_R, cz, side, RIM_PROFILE, 40, PART.RIM);
      // mud flaps, hanging behind each wheel
      box(mb, ax - 0.47, ax - 0.455, 0.07, 0.42, side < 0 ? -0.88 : 0.66, side < 0 ? -0.66 : 0.88, PART.FLAP);
    }
    // the arch liner: a dark drum inside each wheel arch
    lathe(
      mb,
      ax,
      WHEEL_R,
      0,
      1,
      [
        [ARCH_R, -0.88],
        [ARCH_R, 0.88],
      ],
      36,
      PART.LINER,
      true,
    );
  }
  // the lamp pod on the nose, and its four lamps
  box(mb, 1.93, 2.09, 0.72, 0.92, -0.64, 0.64, PART.POD);
  for (const l of POD_LAMPS) discX(mb, 2.092, l.p[1], l.p[2], 0.088, 18, PART.POD_LAMP);
  // the roof wing on its end plates
  box(mb, -1.66, -1.3, 1.455, 1.48, -0.7, 0.7, PART.WING);
  for (const z of [-0.7, 0.69]) box(mb, -1.66, -1.33, 1.37, 1.5, z, z + 0.012, PART.WING);
  // mirrors, a roof vent, the tow strap, the exhaust
  for (const s of [-1, 1]) box(mb, 0.76, 0.9, 0.95, 1.06, s < 0 ? -1.03 : 0.86, s < 0 ? -0.86 : 1.03, PART.MIRROR);
  box(mb, -0.3, -0.02, 1.47, 1.505, -0.12, 0.12, PART.VENT);
  box(mb, 2.02, 2.1, 0.3, 0.37, -0.44, -0.37, PART.TOW);
  box(mb, -2.13, -2.0, 0.27, 0.35, -0.5, -0.4, PART.EXHAUST);

  const n = mb.v.length / 7;
  const pos = new Float32Array(n * 3);
  const nrm = new Float32Array(n * 3);
  const part = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = mb.v[i * 7];
    pos[i * 3 + 1] = mb.v[i * 7 + 1];
    pos[i * 3 + 2] = mb.v[i * 7 + 2];
    nrm[i * 3] = mb.v[i * 7 + 3];
    nrm[i * 3 + 1] = mb.v[i * 7 + 4];
    nrm[i * 3 + 2] = mb.v[i * 7 + 5];
    part[i] = mb.v[i * 7 + 6];
  }
  MESH = { pos, nrm, part, idx: Uint32Array.from(mb.idx), count: n };
  return MESH;
}

// ── seeing it ───────────────────────────────────────────────────────────────

/** The angle (degrees) between a car's heading and the direction from the car
 *  back to the camera, which sits at the world origin. −90 is side-on. */
export function relativeYaw(wx, wz, heading) {
  let rel = (Math.atan2(-wz, -wx) - heading) / RAD;
  while (rel <= -180) rel += 360;
  while (rel > 180) rel -= 360;
  return rel;
}

/** The two pre-rendered views either side of a yaw, and how far between. */
export function frameAt(relDeg) {
  const f = (relDeg - YAW_FIRST) / YAW_STEP;
  if (f <= 0) return { i: 0, t: 0 };
  if (f >= FRAME_COUNT - 1) return { i: FRAME_COUNT - 1, t: 0 };
  // a view hit dead on is shown alone, not faded with its neighbour
  const r = Math.round(f);
  if (Math.abs(f - r) < 1e-9) return { i: r, t: 0 };
  const i = Math.floor(f);
  return { i, t: f - i };
}

export const frameYaw = (i) => YAW_FIRST + i * YAW_STEP;

// an orthographic view of the car from the given yaw and pitch
function viewBasis(yawDeg, pitchDeg) {
  const psi = yawDeg * RAD;
  const phi = pitchDeg * RAD;
  const d = [Math.cos(psi) * Math.cos(phi), Math.sin(phi), Math.sin(psi) * Math.cos(phi)];
  const fwd = [-d[0], -d[1], -d[2]];
  const rl = Math.hypot(fwd[2], fwd[0]) || 1;
  const right = [fwd[2] / rl, 0, -fwd[0] / rl];
  const up = [
    fwd[1] * right[2] - fwd[2] * right[1],
    fwd[2] * right[0] - fwd[0] * right[2],
    fwd[0] * right[1] - fwd[1] * right[0],
  ];
  // the car's frame against the camera's: heading h = −90° − ψ
  const h = -Math.PI / 2 - psi;
  return { d, fwd, right, up, ch: Math.cos(h), sh: Math.sin(h), phi };
}

// world (camera-aligned: x right, y up, z away) → the car's frame, and back
const toCar = (B, a) => [a[0] * B.ch + a[2] * B.sh, a[1], -a[0] * B.sh + a[2] * B.ch];

// ── light ───────────────────────────────────────────────────────────────────
// Directions are toward the light, in the camera's frame. The masts stand in
// the infield behind the cars, left and right; two more stand behind us.

const norm3 = (x, y, z) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};
const WARM = [1.0, 0.84, 0.64];
export const STAGE_LIGHTS = [
  { dir: norm3(-0.68, 0.52, 0.52), col: WARM, I: 2.3, shadow: true },
  { dir: norm3(0.68, 0.52, 0.52), col: WARM, I: 2.3, shadow: true },
  { dir: norm3(-0.3, 0.42, -0.86), col: [1.0, 0.88, 0.74], I: 1.25 },
  { dir: norm3(0.3, 0.42, -0.86), col: [1.0, 0.88, 0.74], I: 1.25 },
  { dir: norm3(-0.55, 0.7, 0.45), col: [0.5, 0.62, 0.95], I: 0.16 },
];
const SKY_AMB = [0.03, 0.036, 0.055];
const GROUND_AMB = [0.05, 0.04, 0.03];

// what a mirror-smooth surface would show in each direction: night sky with
// the stadium's haze along the horizon, the lamps themselves, lit gravel below
function environment(rx, ry, rz, out) {
  if (ry >= 0) {
    const t = Math.min(1, ry / 0.55);
    const s = t * t * (3 - 2 * t);
    out[0] = 0.13 + (0.008 - 0.13) * s;
    out[1] = 0.105 + (0.011 - 0.105) * s;
    out[2] = 0.085 + (0.024 - 0.085) * s;
    // the treeline: a dark band just above the horizon, which is what draws
    // the crisp line along a car's flank
    const tree = Math.exp(-(((ry - 0.035) / 0.03) ** 2));
    out[0] *= 1 - 0.7 * tree;
    out[1] *= 1 - 0.7 * tree;
    out[2] *= 1 - 0.65 * tree;
  } else {
    const t = Math.min(1, -ry / 0.35);
    out[0] = 0.02 + 0.07 * t;
    out[1] = 0.018 + 0.055 * t;
    out[2] = 0.018 + 0.04 * t;
  }
  for (const L of STAGE_LIGHTS) {
    if (L.I < 1) continue;
    const c = rx * L.dir[0] + ry * L.dir[1] + rz * L.dir[2];
    if (c < 0.99) continue;
    const k = Math.exp(-(1 - c) / 0.0009) * 26 * L.I;
    out[0] += k * L.col[0];
    out[1] += k * L.col[1];
    out[2] += k * L.col[2];
  }
}

// ── rasterising ─────────────────────────────────────────────────────────────

function makeBuffers(w, h) {
  const n = w * h;
  return {
    w,
    h,
    depth: new Float32Array(n),
    part: new Uint8Array(n),
    px: new Float32Array(n),
    py: new Float32Array(n),
    pz: new Float32Array(n),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
    nz: new Float32Array(n),
  };
}

const inArch = (x, y) => {
  if (y > 0.76) return false;
  const df = x - AXLE_F;
  const dr = x - AXLE_R;
  const dy = y - WHEEL_R;
  return df * df + dy * dy < ARCH_R * ARCH_R || dr * dr + dy * dy < ARCH_R * ARCH_R;
};

function rasterise(mesh, B, cell, ppm, G) {
  const { pos, nrm, part, idx, count } = mesh;
  const sx = new Float32Array(count);
  const sy = new Float32Array(count);
  const sd = new Float32Array(count);
  const { right: r, up: u, fwd: f, d } = B;
  for (let i = 0; i < count; i++) {
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    sx[i] = cell.ax + (x * r[0] + y * r[1] + z * r[2]) * ppm;
    sy[i] = cell.ay - (x * u[0] + y * u[1] + z * u[2]) * ppm;
    sd[i] = x * f[0] + y * f[1] + z * f[2];
  }
  const { w, h } = G;
  G.depth.fill(Infinity);
  G.part.fill(0);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    const p = part[a];
    if (!TWO_SIDED.has(p)) {
      // back faces: the triangle's own normal turned away from the camera
      const ex = pos[b * 3] - pos[a * 3];
      const ey = pos[b * 3 + 1] - pos[a * 3 + 1];
      const ez = pos[b * 3 + 2] - pos[a * 3 + 2];
      const fx = pos[c * 3] - pos[a * 3];
      const fy = pos[c * 3 + 1] - pos[a * 3 + 1];
      const fz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const gx = ey * fz - ez * fy;
      const gy = ez * fx - ex * fz;
      const gz = ex * fy - ey * fx;
      if (gx * d[0] + gy * d[1] + gz * d[2] <= 0) continue;
    }
    const x0 = sx[a];
    const y0 = sy[a];
    const x1 = sx[b];
    const y1 = sy[b];
    const x2 = sx[c];
    const y2 = sy[c];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-9) continue;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)));
    const inv = 1 / area;
    for (let py = minY; py <= maxY; py++) {
      const Y = py + 0.5;
      for (let px = minX; px <= maxX; px++) {
        const X = px + 0.5;
        const w0 = ((x2 - x1) * (Y - y1) - (y2 - y1) * (X - x1)) * inv;
        if (w0 < 0) continue;
        const w1 = ((x0 - x2) * (Y - y2) - (y0 - y2) * (X - x2)) * inv;
        if (w1 < 0) continue;
        const w2 = 1 - w0 - w1;
        if (w2 < 0) continue;
        const k = py * w + px;
        const depth = w0 * sd[a] + w1 * sd[b] + w2 * sd[c];
        if (depth >= G.depth[k]) continue;
        const X3 = w0 * pos[a * 3] + w1 * pos[b * 3] + w2 * pos[c * 3];
        const Y3 = w0 * pos[a * 3 + 1] + w1 * pos[b * 3 + 1] + w2 * pos[c * 3 + 1];
        // the wheel arches are cut out of the body
        if (p === PART.BODY && inArch(X3, Y3)) continue;
        G.depth[k] = depth;
        G.part[k] = p;
        G.px[k] = X3;
        G.py[k] = Y3;
        G.pz[k] = w0 * pos[a * 3 + 2] + w1 * pos[b * 3 + 2] + w2 * pos[c * 3 + 2];
        let nx = w0 * nrm[a * 3] + w1 * nrm[b * 3] + w2 * nrm[c * 3];
        let ny = w0 * nrm[a * 3 + 1] + w1 * nrm[b * 3 + 1] + w2 * nrm[c * 3 + 1];
        let nz = w0 * nrm[a * 3 + 2] + w1 * nrm[b * 3 + 2] + w2 * nrm[c * 3 + 2];
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        // a two-sided part seen from behind shows its other face
        if (TWO_SIDED.has(p) && nx * d[0] + ny * d[1] + nz * d[2] < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        G.nx[k] = nx;
        G.ny[k] = ny;
        G.nz[k] = nz;
      }
    }
  }
}

// ── what each bit of the body is made of ────────────────────────────────────

const REG = {
  FIXED: 0, // colour already final: glass, trim, rubber, lamps
  PAINT: 1, // the livery
  PANEL: 2, // the number panel
  RIM: 3, // the car's wheel colour, blurred by the spin
  WING: 4,
  FLAP: 5,
  MIRROR: 6,
};
const K = {
  PAINT: 0,
  GLASS: 1,
  BLACK: 2,
  GRILLE: 3,
  HEAD: 4,
  TAIL: 5,
  PILLAR: 6,
  SEAL: 7,
};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function bodyKind(x, y, z, nx, ny, nz) {
  const az = Math.abs(z);
  const yb = tab(TAB.bottom, x);
  const ys = tab(TAB.belt, x);
  const yt = tab(TAB.top, x);
  // the plastics: the sump guard under the nose, the bumper lips
  if (y < yb + 0.05 && (x > 1.7 || x < -1.8)) return K.BLACK;
  // the nose: grille and headlamps, on the face that looks forward
  if (x > 1.7 && nx > 0.35) {
    if (az < 0.44 && y > 0.36 && y < 0.6) return K.GRILLE;
    if (az > 0.3 && az < 0.8 && y > 0.6 && y < 0.72) return K.HEAD;
  }
  if (x < -1.86 && nx < -0.3) {
    if (az > 0.46 && az < 0.84 && y > 0.78 && y < 0.96) return K.TAIL;
    if (y < 0.44) return K.BLACK;
  }
  if (y > ys + 0.02) {
    const zt = tab(TAB.topHalf, x);
    if (ny > 0.45 && az < zt * 0.97) {
      // on top: the windscreen, the hatch glass, or painted roof and bonnet
      if (x > 0.1 && x < 0.93) {
        if (x < 0.16 || x > 0.87 || az > zt * 0.87) return K.SEAL;
        return K.GLASS;
      }
      if (x > -1.87 && x < -1.4) {
        if (x > -1.45 || x < -1.82 || az > zt * 0.86) return K.SEAL;
        return K.GLASS;
      }
      return K.PAINT;
    }
    // the side glass, under the roof rail; the pillars thicken it where the
    // windscreen and hatch lean away
    const aPillar = 0.075 * smooth(0.95, 0.85, x) * smooth(0.02, 0.14, x);
    const cPillar = 0.2 * smooth(-1.3, -1.45, x);
    const top = yt - 0.045 - aPillar - cPillar;
    if (y < top && x < 0.9 && x > -1.76) {
      if (x > -0.41 && x < -0.32) return K.PILLAR;
      if (y < ys + 0.035 || y > top - 0.012) return K.SEAL;
      return K.GLASS;
    }
  }
  return K.PAINT;
}

// grime from the stage: thickest low down, behind the wheels and on the tail
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
function dirtAt(x, y, z) {
  const n = 0.6 * vnoise(x * 7 + z * 3, y * 9) + 0.4 * vnoise(x * 19 + 5, y * 23 - z * 7);
  let d = Math.pow(smooth(0.56, 0.24, y), 1.3) * (0.2 + 0.6 * n);
  for (const ax of [AXLE_F, AXLE_R]) {
    const behind = smooth(ax - 1.0, ax - 0.55, x) * smooth(ax - 0.2, ax - 0.5, x);
    d += behind * smooth(0.75, 0.3, y) * 0.5 * n;
  }
  d += smooth(-1.9, -2.05, x) * 0.35 * n;
  return Math.min(0.92, d);
}

// ── the liveries ────────────────────────────────────────────────────────────

const band = (v, c, halfW) => Math.abs(v - c) < halfW;
let LIV_OUT = null;
function set(c, metal = 0) {
  LIV_OUT[0] = c[0];
  LIV_OUT[1] = c[1];
  LIV_OUT[2] = c[2];
  LIV_OUT[3] = metal;
}
function liveryAt(L, liv, x, y, z, ny, out) {
  const side = ny < 0.6;
  LIV_OUT = out;
  set(liv.base);
  const ys = tab(TAB.belt, x);
  switch (L) {
    case 0: {
      // three stripes, navy, sky and red, sweeping up over the front wheel
      if (side) {
        const c = 0.5 + 0.2 * smooth(0.7, 1.95, x);
        if (band(y, c + 0.1, 0.022)) set([0.012, 0.018, 0.08]);
        else if (band(y, c + 0.05, 0.022)) set([0.08, 0.26, 0.62]);
        else if (band(y, c, 0.022)) set([0.55, 0.018, 0.02]);
      } else if (x > -1.95) {
        if (band(z, 0.07, 0.03)) set([0.012, 0.018, 0.08]);
        else if (band(z, 0, 0.03)) set([0.08, 0.26, 0.62]);
        else if (band(z, -0.07, 0.03)) set([0.55, 0.018, 0.02]);
      }
      break;
    }
    case 1: {
      // deep blue, one gold sweep from the nose back along the flank
      if (side && x > -1.75) {
        const c = 0.43 + 0.3 * smooth(1.9, -1.7, x);
        const hw = 0.035 + 0.05 * smooth(-1.7, 1.6, x);
        if (band(y, c, hw)) set([0.78, 0.52, 0.03]);
      } else if (!side && x > 0.95 && band(z, 0, 0.1)) set([0.78, 0.52, 0.03]);
      break;
    }
    case 2: {
      // red over white, the red cut in a chevron that points forward
      const edge = 0.63 - 0.24 * smooth(0.2, 2.0, x) + 0.06 * smooth(0.2, -2.0, x);
      if (side) {
        if (y > edge) set([0.62, 0.015, 0.02]);
      } else {
        const v = x > 0.9 ? Math.abs(z) < 0.95 * (x - 0.9) : false;
        if (!v) set([0.62, 0.015, 0.02]);
      }
      break;
    }
    case 3: {
      // white, the front in green, split on a slant with a red edge
      const split = -0.35 + 1.25 * (y - 0.28);
      if (side) {
        if (x > split + 0.06) set([0.01, 0.26, 0.07]);
        else if (x > split) set([0.58, 0.03, 0.02]);
      } else if (x > 0.2) set([0.01, 0.26, 0.07]);
      break;
    }
    case 4: {
      // powder blue with a broad orange band low down, and down the middle
      if (side) {
        if (band(y, 0.385, 0.075)) set([0.85, 0.26, 0.02]);
        else if (band(y, 0.472, 0.008) || band(y, 0.298, 0.008)) set([0.02, 0.04, 0.14]);
      } else if (band(z, 0, 0.2)) set([0.85, 0.26, 0.02]);
      break;
    }
    case 5: {
      // gloss black, gold coachlines
      if (side) {
        if (band(y, ys - 0.04, 0.007) || band(y, ys - 0.062, 0.004) || band(y, 0.33, 0.006))
          set([0.72, 0.52, 0.18], 1);
      } else if (band(Math.abs(z), 0.5, 0.008)) set([0.72, 0.52, 0.18], 1);
      break;
    }
  }
}

// ── one view: depth-buffer, then light every pixel ──────────────────────────

function shadeFrame(G, B, liveries, panels, out, row0 = 0, row1 = G.h) {
  const { w, h } = G;
  const d = B.d;
  const env = [0, 0, 0];
  const L = STAGE_LIGHTS.map((l) => ({ ...l, c: toCar(B, l.dir) }));
  const liv = [0, 0, 0, 0];
  const nCars = liveries.length;
  const col = new Float32Array(3);

  for (let k = row0 * w; k < Math.min(h, row1) * w; k++) {
    const p = G.part[k];
    if (!p) continue;
    const x = G.px[k];
    const y = G.py[k];
    const z = G.pz[k];
    let nx = G.nx[k];
    let ny = G.ny[k];
    let nz = G.nz[k];

    // what the surface is
    let region = REG.FIXED;
    let kind = K.BLACK;
    let gloss = 0.35;
    let base = [0.03, 0.03, 0.033];
    let emit = null;
    let mask = 1;
    let F0 = 0.04;
    if (p === PART.BODY) {
      kind = bodyKind(x, y, z, nx, ny, nz);
      if (kind === K.PAINT) {
        const side = Math.abs(nz) > 0.55;
        region =
          side && x > PANEL.x0 && x < PANEL.x1 && y > PANEL.y0 && y < PANEL.y1 ? REG.PANEL : REG.PAINT;
        gloss = 1;
        // the flared lips of the wheel arches catch the light
        const df = x - AXLE_F;
        const dr = x - AXLE_R;
        const dy = y - WHEEL_R;
        const rf = Math.hypot(df, dy);
        const rr = Math.hypot(dr, dy);
        const r = Math.min(rf, rr);
        if (r < ARCH_R + 0.07 && y < tab(TAB.belt, x)) {
          const along = rf < rr ? df : dr;
          const lip = Math.sin(((r - ARCH_R) / 0.07) * Math.PI) * 0.55;
          nx += (along / r) * lip;
          ny += (dy / r) * lip;
          const l = Math.hypot(nx, ny, nz);
          nx /= l;
          ny /= l;
          nz /= l;
          if (r < ARCH_R + 0.012) mask = 0.45;
        }
        // shut lines of the doors, and the rear door's handle
        if (side && y < tab(TAB.belt, x) - 0.01 && y > tab(TAB.bottom, x) + 0.04) {
          const lines = [0.87 + (y - 0.3) * 0.08, -0.37, -0.88 + (0.9 - y) * 0.06];
          for (const lx of lines) if (Math.abs(x - lx) < 0.007) mask = 0.3;
          if (x > -0.66 && x < -0.54 && Math.abs(y - (tab(TAB.belt, x) - 0.075)) < 0.014) mask = 0.35;
          // the fuel cap on the rear quarter
          const fr = Math.hypot(x + 1.58, y - 0.74);
          if (Math.abs(fr - 0.055) < 0.006) mask = 0.45;
        }
      } else if (kind === K.GLASS) {
        F0 = 0.05;
        gloss = 1;
        base = [0.004, 0.005, 0.007];
      } else if (kind === K.SEAL || kind === K.PILLAR) {
        base = [0.012, 0.012, 0.014];
        gloss = 0.4;
      } else if (kind === K.GRILLE) {
        base = [0.008, 0.008, 0.009];
        gloss = 0.1;
        // a mesh: a lattice of fine bars
        const gx = (y * 90) % 1;
        const gz = (z * 90) % 1;
        if (Math.abs(gx) < 0.3 || Math.abs(gz) < 0.3) base = [0.05, 0.05, 0.055];
      } else if (kind === K.HEAD) {
        emit = [9, 8.6, 7.8];
      } else if (kind === K.TAIL) {
        emit = [1.1, 0.05, 0.03];
        base = [0.25, 0.01, 0.01];
      }
    } else if (p === PART.TREAD || p === PART.WALL) {
      base = [0.028, 0.027, 0.026];
      gloss = p === PART.WALL ? 0.25 : 0.1;
    } else if (p === PART.RIM) {
      region = REG.RIM;
      gloss = 0.8;
      // spinning: the spokes smear into a disc, a darker ring where the gaps
      // blur; the brake calliper does not turn, and shows through
      const ax = x > 0 ? AXLE_F : AXLE_R;
      const rx = x - ax;
      const ry = y - WHEEL_R;
      const r = Math.hypot(rx, ry);
      if (r > 0.188) mask = 1.05;
      else if (r > 0.17) mask = 0.55;
      else if (r > 0.055) mask = 0.42 + 0.1 * Math.sin(r * 90);
      else if (r > 0.035) mask = 0.9;
      else mask = 0.3;
      const ang = Math.atan2(ry, -rx) / RAD;
      if (r > 0.08 && r < 0.165 && ang > 20 && ang < 75) {
        region = REG.FIXED;
        base = [0.3, 0.02, 0.02];
        gloss = 0.5;
      }
    } else if (p === PART.LINER) {
      base = [0.006, 0.006, 0.006];
      gloss = 0;
    } else if (p === PART.POD) {
      base = [0.014, 0.014, 0.016];
      gloss = 0.7;
    } else if (p === PART.POD_LAMP) {
      // the lamp: white-hot in the middle, a chrome bezel round it
      let lr = 1;
      for (const l of POD_LAMPS) lr = Math.min(lr, Math.hypot(y - l.p[1], z - l.p[2]));
      if (lr < 0.07) emit = [16, 15, 13];
      else {
        base = [0.35, 0.35, 0.37];
        F0 = 0.6;
        gloss = 1;
      }
    } else if (p === PART.WING) {
      region = REG.WING;
      gloss = 0.9;
    } else if (p === PART.FLAP) {
      region = REG.FLAP;
      gloss = 0.3;
    } else if (p === PART.MIRROR) {
      region = REG.MIRROR;
      gloss = 1;
    } else if (p === PART.VENT) {
      base = [0.015, 0.015, 0.017];
    } else if (p === PART.TOW) {
      base = [0.55, 0.03, 0.02];
      gloss = 0.2;
    } else if (p === PART.EXHAUST) {
      base = [0.08, 0.075, 0.07];
      F0 = 0.5;
      gloss = 0.6;
    }

    // light arriving: ambient from sky and gravel, then each lamp
    const up = ny * 0.5 + 0.5;
    let ir = SKY_AMB[0] * up + GROUND_AMB[0] * (1 - up);
    let ig = SKY_AMB[1] * up + GROUND_AMB[1] * (1 - up);
    let ib = SKY_AMB[2] * up + GROUND_AMB[2] * (1 - up);
    let sr = 0;
    let sg = 0;
    let sb = 0;
    for (const l of L) {
      const c = l.c;
      const ndl = nx * c[0] + ny * c[1] + nz * c[2];
      if (ndl <= 0) continue;
      ir += l.I * l.col[0] * ndl;
      ig += l.I * l.col[1] * ndl;
      ib += l.I * l.col[2] * ndl;
      // a broad sheen on top of the mirror-sharp lamp reflections
      const hx = c[0] + d[0];
      const hy = c[1] + d[1];
      const hz = c[2] + d[2];
      const hl = Math.hypot(hx, hy, hz) || 1;
      const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
      const s = Math.pow(ndh, 240) * l.I * 0.3;
      sr += s * l.col[0];
      sg += s * l.col[1];
      sb += s * l.col[2];
    }
    // reflection: the view vector mirrored in the surface, looked up in the
    // world (the lamps and the sky are fixed to the camera, not the car)
    const ndv = Math.max(0, nx * d[0] + ny * d[1] + nz * d[2]);
    const rcx = 2 * ndv * nx - d[0];
    const rcy = 2 * ndv * ny - d[1];
    const rcz = 2 * ndv * nz - d[2];
    const rwx = rcx * B.ch - rcz * B.sh;
    const rwz = rcx * B.sh + rcz * B.ch;
    environment(rwx, rcy, rwz, env);
    const F = F0 + (1 - F0) * Math.pow(1 - ndv, 5);

    if (region === REG.FIXED) {
      let r;
      let g;
      let bb;
      if (emit) {
        r = emit[0];
        g = emit[1];
        bb = emit[2];
      } else if (kind === K.GLASS && p === PART.BODY) {
        // through the glass: the dark cabin, the crew's helmets
        const hit = helmetBehind(x, y, z, d);
        const inner = hit ? 0.09 * hit : 0.004;
        r = inner + F * env[0] + sr * 0.2;
        g = inner + F * env[1] + sg * 0.2;
        bb = inner * 1.05 + F * env[2] + sb * 0.2;
      } else {
        r = base[0] * ir * (1 - F * gloss) + gloss * (F * env[0] + sr * 0.5);
        g = base[1] * ig * (1 - F * gloss) + gloss * (F * env[1] + sg * 0.5);
        bb = base[2] * ib * (1 - F * gloss) + gloss * (F * env[2] + sb * 0.5);
      }
      for (let c = 0; c < nCars; c++) writePixel(out[c], k, r, g, bb);
      continue;
    }

    // the livery-dependent parts: finish them car by car
    const dirt =
      region === REG.RIM ? 0.25 : dirtAt(x, y, z) * (region === REG.PANEL ? 0.2 : region === REG.FLAP ? 0.3 : 1);
    for (let c = 0; c < nCars; c++) {
      const lv = liveries[c];
      let metal = 0;
      if (region === REG.PAINT || region === REG.MIRROR) {
        liveryAt(c, lv, x, y, z, ny, liv);
        col[0] = liv[0];
        col[1] = liv[1];
        col[2] = liv[2];
        metal = liv[3];
      } else if (region === REG.PANEL) {
        liveryAt(c, lv, x, y, z, ny, liv);
        const u = z < 0 ? (x - PANEL.x0) / (PANEL.x1 - PANEL.x0) : (PANEL.x1 - x) / (PANEL.x1 - PANEL.x0);
        const v = (PANEL.y1 - y) / (PANEL.y1 - PANEL.y0);
        samplePanel(panels[c], u, v, liv, col);
      } else if (region === REG.RIM) {
        col[0] = lv.rim[0];
        col[1] = lv.rim[1];
        col[2] = lv.rim[2];
        metal = lv.rimMetal ? 1 : 0;
      } else if (region === REG.WING) {
        col[0] = lv.wing[0];
        col[1] = lv.wing[1];
        col[2] = lv.wing[2];
      } else if (region === REG.FLAP) {
        col[0] = lv.flap[0];
        col[1] = lv.flap[1];
        col[2] = lv.flap[2];
      }
      const ar = (col[0] + (DUST[0] - col[0]) * dirt) * mask;
      const ag = (col[1] + (DUST[1] - col[1]) * dirt) * mask;
      const ab = (col[2] + (DUST[2] - col[2]) * dirt) * mask;
      const gl = gloss * (1 - 0.85 * dirt);
      let r;
      let g;
      let bb;
      if (metal) {
        r = ar * (0.3 * ir + gl * (0.9 * env[0] + sr));
        g = ag * (0.3 * ig + gl * (0.9 * env[1] + sg));
        bb = ab * (0.3 * ib + gl * (0.9 * env[2] + sb));
      } else {
        r = ar * ir * (1 - F * gl) + gl * (F * env[0] + sr);
        g = ag * ig * (1 - F * gl) + gl * (F * env[1] + sg);
        bb = ab * ib * (1 - F * gl) + gl * (F * env[2] + sb);
      }
      writePixel(out[c], k, r, g, bb);
    }
  }
}

// the two crew helmets, seen through the side glass: a hit returns how much
// light falls on the helmet there, else 0
const HELMETS = [
  { x: -0.3, y: 1.1, z: -0.34, r: 0.13 },
  { x: -0.3, y: 1.1, z: 0.34, r: 0.13 },
];
function helmetBehind(x, y, z, d) {
  // follow the view ray into the car
  for (const H of HELMETS) {
    const ox = x - H.x;
    const oy = y - H.y;
    const oz = z - H.z;
    const b = -(ox * d[0] + oy * d[1] + oz * d[2]);
    const c = ox * ox + oy * oy + oz * oz - H.r * H.r;
    const disc = b * b - c;
    if (disc > 0 && b > 0) {
      const t = b - Math.sqrt(disc);
      const hy = oy - t * d[1];
      // the visor is a dark band across the front
      return hy > -0.02 && hy < 0.05 ? 0.25 : 1;
    }
  }
  return 0;
}

// the panel's own paint: white card, black number (from `paintPanel`), kept
// as linear light so it can be lit like the rest of the car
function linearPanel(P) {
  if (!P) return null;
  const n = P.w * P.h;
  const lin = new Float32Array(n * 4);
  const toLin = new Float32Array(256);
  for (let i = 0; i < 256; i++) toLin[i] = Math.pow(i / 255, 2.2);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) lin[i * 4 + c] = toLin[P.data[i * 4 + c]] * (PANEL_WHITE[c] / 0.84);
    lin[i * 4 + 3] = P.data[i * 4 + 3] / 255;
  }
  return { w: P.w, h: P.h, lin };
}

function samplePanel(P, u, v, livery, out) {
  if (!P || u < 0 || u > 1 || v < 0 || v > 1) {
    out[0] = livery[0];
    out[1] = livery[1];
    out[2] = livery[2];
    return;
  }
  const fx = u * (P.w - 1);
  const fy = v * (P.h - 1);
  const x0 = fx | 0;
  const y0 = fy | 0;
  const x1 = Math.min(P.w - 1, x0 + 1);
  const y1 = Math.min(P.h - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const i00 = (y0 * P.w + x0) * 4;
  const i10 = (y0 * P.w + x1) * 4;
  const i01 = (y1 * P.w + x0) * 4;
  const i11 = (y1 * P.w + x1) * 4;
  const L = P.lin;
  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;
  const a = L[i00 + 3] * w00 + L[i10 + 3] * w10 + L[i01 + 3] * w01 + L[i11 + 3] * w11;
  for (let c = 0; c < 3; c++) {
    const lin = L[i00 + c] * w00 + L[i10 + c] * w10 + L[i01 + c] * w01 + L[i11 + c] * w11;
    out[c] = livery[c] * (1 - a) + lin;
  }
}

// the film's response: light in, 0–255 out, as a table on √light so the
// shadows keep their precision
const EXPOSURE = 1.05;
const TONE_N = 4096;
const TONE_MAX = 16;
const TONE = new Uint8ClampedArray(TONE_N);
for (let i = 0; i < TONE_N; i++) {
  const v = ((i / (TONE_N - 1)) * Math.sqrt(TONE_MAX)) ** 2;
  TONE[i] = Math.round(255 * Math.pow(1 - Math.exp(-v * EXPOSURE), 1 / 2.2));
}
const TONE_K = (TONE_N - 1) / Math.sqrt(TONE_MAX);
const tone = (v) => (v <= 0 ? 0 : v >= TONE_MAX ? 255 : TONE[(Math.sqrt(v) * TONE_K + 0.5) | 0]);
function writePixel(img, k, r, g, b) {
  const o = k * 4;
  img[o] = tone(r);
  img[o + 1] = tone(g);
  img[o + 2] = tone(b);
  img[o + 3] = 255;
}

// ── shadows on the gravel ───────────────────────────────────────────────────
// Where the camera sees ground rather than car: a dark pool right under the
// car, and the two long soft shadows the masts behind it throw toward us.

function sdBox(px, pz, hx, hz, r) {
  const qx = Math.abs(px) - hx + r;
  const qz = Math.abs(pz) - hz + r;
  const ox = Math.max(qx, 0);
  const oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - r;
}

function shadowFrame(G, B, cell, ppm, out) {
  const { w, h } = G;
  const { right: r, up: u, fwd: f } = B;
  const casts = STAGE_LIGHTS.filter((l) => l.shadow).map((l) => {
    const c = toCar(B, l.dir);
    return { sx: c[0] / c[1], sz: c[2] / c[1] };
  });
  for (let k = 0; k < w * h; k++) {
    if (G.part[k]) continue;
    const X = (k % w) + 0.5;
    const Y = ((k / w) | 0) + 0.5;
    const sx = (X - cell.ax) / ppm;
    const sy = (cell.ay - Y) / ppm;
    // the ground point this pixel looks at
    const t = -(sx * r[1] + sy * u[1]) / f[1];
    const gx = sx * r[0] + sy * u[0] + t * f[0];
    const gz = sx * r[2] + sy * u[2] + t * f[2];
    const near = sdBox(gx, gz, 1.95, 0.84, 0.3);
    if (near > 2.6) continue; // beyond the reach of any of its shadows
    let a = 0.58 * (1 - smooth(-0.3, 0.42, near));
    for (const cst of casts) {
      // walk up toward the lamp: inside the car's body anywhere on the way?
      // The further the shadow reaches from the car, the softer and fainter
      let best = 0;
      for (let s = 1; s <= 7; s++) {
        const hh = s * 0.17;
        const qx = gx + cst.sx * hh;
        const qz = gz + cst.sz * hh;
        if (hh > tab(TAB.top, qx)) continue;
        const soft = 0.12 + 0.3 * hh;
        const v = (1 - smooth(-soft, soft, sdBox(qx, qz, 1.95, 0.84, 0.25))) * (1 - hh / 1.6);
        if (v > best) best = v;
      }
      a += 0.24 * best;
    }
    a = Math.min(0.78, a);
    if (a < 0.01) continue;
    const o = k * 4;
    for (const img of out) {
      img[o] = 4;
      img[o + 1] = 4;
      img[o + 2] = 6;
      img[o + 3] = 255 * a;
    }
  }
}

// ── the whole set ───────────────────────────────────────────────────────────

/** Everything the scene needs to draw the cars, computed without a canvas:
 *  per car an RGBA sheet of FRAME_COUNT cells, plus where the lamps are in
 *  each cell and whether the camera can see them.
 *
 *  carLenPx — the car's length on screen where its scale is 1 (the line)
 *  pitchDeg — how far down the camera looks at it
 *  res      — texture pixels per screen pixel
 *  panels   — per car, the number panel's pixels ({w, h, data}) or null */
export function renderCars(opts) {
  const job = renderCarsSteps(opts);
  let step = job.next();
  while (!step.done) step = job.next();
  return step.value;
}

/** The same, one view at a time: yields after each, returns the set — so a
 *  scene can spread the work over its first frames. */
export function* renderCarsSteps({ carLenPx, pitchDeg, res = 2, liveries = LIVERIES, panels: rawPanels = [] }) {
  const mesh = carMesh();
  const panels = liveries.map((_, c) => linearPanel(rawPanels[c]));
  yield -1;
  const ppm = (res * carLenPx) / CAR_LENGTH_M;
  const bases = [];
  // one cell size for every view, the anchor (ground under the car's centre)
  // in the same place in each, so switching views never moves the car
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const extend = (B, x, y, z) => {
    const px = (x * B.right[0] + y * B.right[1] + z * B.right[2]) * ppm;
    const py = -(x * B.up[0] + y * B.up[1] + z * B.up[2]) * ppm;
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  };
  for (let i = 0; i < FRAME_COUNT; i++) {
    const B = viewBasis(frameYaw(i), pitchDeg);
    bases.push(B);
    for (let v = 0; v < mesh.count; v++) extend(B, mesh.pos[v * 3], mesh.pos[v * 3 + 1], mesh.pos[v * 3 + 2]);
    // the shadows reach out over the ground round the car
    for (const [gx, gz] of [
      [-2.4, -1.2],
      [2.4, -1.2],
      [-2.4, 1.2],
      [2.4, 1.2],
    ])
      extend(B, gx, 0, gz);
    for (const l of STAGE_LIGHTS.filter((q) => q.shadow)) {
      const c = toCar(B, l.dir);
      for (const [gx, gz] of [
        [-2.1, -0.95],
        [2.1, -0.95],
        [-2.1, 0.95],
        [2.1, 0.95],
      ])
        extend(B, gx - (c[0] / c[1]) * 1.4, 0, gz - (c[2] / c[1]) * 1.4);
    }
  }
  const pad = 3;
  const cell = {
    w: Math.ceil(maxX - minX) + pad * 2,
    h: Math.ceil(maxY - minY) + pad * 2,
    ax: -minX + pad,
    ay: -minY + pad,
  };
  const G = makeBuffers(cell.w, cell.h);
  yield -1;
  const frames = [];
  const images = liveries.map(() => []);
  for (let i = 0; i < FRAME_COUNT; i++) {
    const B = bases[i];
    rasterise(mesh, B, cell, ppm, G);
    const out = liveries.map(() => new Uint8ClampedArray(cell.w * cell.h * 4));
    shadowFrame(G, B, cell, ppm, out);
    yield i;
    // lit in two halves, so no one slice of the job runs long
    const mid = Math.ceil(cell.h / 2);
    shadeFrame(G, B, liveries, panels, out, 0, mid);
    yield i;
    shadeFrame(G, B, liveries, panels, out, mid, cell.h);
    out.forEach((img, c) => images[c].push(img));
    frames.push({ yaw: frameYaw(i), lamps: lampsInView(G, B, cell, ppm) });
    yield i;
  }
  return { cell, ppm, res, frames, images };
}

// where each lamp lands in a cell, how squarely it faces the camera, and
// whether the car itself hides it
function lampsInView(G, B, cell, ppm) {
  return LAMPS.map((l) => {
    const [x, y, z] = l.p;
    const px = cell.ax + (x * B.right[0] + y * B.right[1] + z * B.right[2]) * ppm;
    const py = cell.ay - (x * B.up[0] + y * B.up[1] + z * B.up[2]) * ppm;
    const depth = x * B.fwd[0] + y * B.fwd[1] + z * B.fwd[2];
    const facing = Math.max(0, l.n[0] * B.d[0] + l.n[1] * B.d[1] + l.n[2] * B.d[2]);
    const ix = Math.round(px - 0.5);
    const iy = Math.round(py - 0.5);
    let seen = true;
    if (ix >= 0 && iy >= 0 && ix < G.w && iy < G.h) {
      seen = G.depth[iy * G.w + ix] >= depth - 0.06;
    }
    return { kind: l.kind, x: px - cell.ax, y: py - cell.ay, facing: seen ? facing : 0 };
  });
}

// ── onto canvases (browser only) ────────────────────────────────────────────

const SHEET = "ry_car_";
const GLARE = "ry_glare";
const COLS = 6;

/** Paints each car's number panel, renders the set, and registers one sheet
 *  texture per car with a frame per view ("0" … "18"). */
export function paintCars(textures, opts) {
  const job = paintCarsSteps(textures, opts);
  let step = job.next();
  while (!step.done) step = job.next();
  return step.value;
}

/** The same as a job the scene runs a slice at a time (see renderCarsSteps);
 *  nothing is registered until the last step. */
export function* paintCarsSteps(textures, { numbers, carLenPx, pitchDeg, res = 2 }) {
  const panels = numbers.map((n) => paintPanel(n));
  yield -1;
  const set = yield* renderCarsSteps({ carLenPx, pitchDeg, res, liveries: LIVERIES, panels });
  const { cell } = set;
  const rows = Math.ceil(FRAME_COUNT / COLS);
  const keys = [];
  for (let c = 0; c < numbers.length; c++) {
    const key = SHEET + c;
    const canvas = makeCanvas(cell.w * COLS, cell.h * rows);
    const g = canvas.getContext("2d");
    set.images[c].forEach((px, i) => {
      const img = g.createImageData(cell.w, cell.h);
      img.data.set(px);
      g.putImageData(img, (i % COLS) * cell.w, Math.floor(i / COLS) * cell.h);
    });
    if (textures.exists(key)) textures.remove(key);
    const tex = textures.addCanvas(key, canvas);
    for (let i = 0; i < FRAME_COUNT; i++) {
      tex.add(String(i), 0, (i % COLS) * cell.w, Math.floor(i / COLS) * cell.h, cell.w, cell.h);
    }
    keys.push(key);
    yield FRAME_COUNT + c;
  }
  if (textures.exists(GLARE)) textures.remove(GLARE);
  textures.addCanvas(GLARE, paintGlare());
  return {
    keys,
    glare: GLARE,
    cell,
    res,
    frames: set.frames,
    origin: { x: cell.ax / cell.w, y: cell.ay / cell.h },
  };
}

export function releaseCarArt(textures) {
  for (let c = 0; c < LIVERIES.length; c++) if (textures.exists(SHEET + c)) textures.remove(SHEET + c);
  if (textures.exists(GLARE)) textures.remove(GLARE);
}

// the door panel: a white card with a black edge and the number, as big and
// heavy as the card allows
function paintPanel(number) {
  const w = 300;
  const h = Math.round((w * (PANEL.y1 - PANEL.y0)) / (PANEL.x1 - PANEL.x0));
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const r = h * 0.12;
  const edge = h * 0.045;
  g.fillStyle = "#101010";
  roundRect(g, 0, 0, w, h, r);
  g.fill();
  g.fillStyle = "#f6f3ea";
  roundRect(g, edge, edge, w - edge * 2, h - edge * 2, r - edge);
  g.fill();
  const text = String(number);
  const size = h * 0.9;
  g.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  const m = g.measureText(text);
  const asc = m.actualBoundingBoxAscent || size * 0.72;
  const desc = m.actualBoundingBoxDescent || 0;
  const glyphH = asc + desc;
  const fit = Math.min(1, ((w - edge * 2) * 0.86) / m.width, ((h - edge * 2) * 0.84) / glyphH);
  g.save();
  g.translate(w / 2, h / 2 + ((asc - desc) / 2) * fit);
  g.scale(fit, fit);
  g.fillStyle = "#0b0b0b";
  g.fillText(text, 0, 0);
  g.restore();
  return { w, h, data: g.getImageData(0, 0, w, h).data };
}

// a lamp seen head-on: a hot core, a soft bloom, a faint cross of rays
function paintGlare() {
  const s = 128;
  const c = makeCanvas(s, s);
  const g = c.getContext("2d");
  const m = s / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0, "rgba(255,250,236,1)");
  rg.addColorStop(0.08, "rgba(255,236,196,0.85)");
  rg.addColorStop(0.25, "rgba(255,206,140,0.28)");
  rg.addColorStop(0.6, "rgba(255,180,110,0.07)");
  rg.addColorStop(1, "rgba(255,170,100,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = "lighter";
  for (const [sx, sy] of [
    [1, 0.035],
    [0.035, 0.6],
  ]) {
    g.save();
    g.translate(m, m);
    g.scale(sx, sy);
    const ray = g.createRadialGradient(0, 0, 0, 0, 0, m);
    ray.addColorStop(0, "rgba(255,240,210,0.5)");
    ray.addColorStop(1, "rgba(255,220,170,0)");
    g.fillStyle = ray;
    g.fillRect(-m, -m, s, s);
    g.restore();
  }
  return c;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
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
