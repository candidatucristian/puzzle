import { PENCIL as RY_SKETCH } from "../../shared/theme.js";
import { ryBez } from "./geometry.js";
const RY_WARM = 0xffdf9e;
const RY_INK = 0x14161a;
const RY_PLATE = 0xe6e0d0;

function ryArc(cx, cy, rx, ry, a0, a1, n = 14) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

const RY_DIGITS = {
  0: [ryArc(0.5, 0.9, 0.4, 0.84, 0, 360, 22)],
  1: [
    [
      [0.14, 0.36],
      [0.58, 0.04],
      [0.58, 1.76],
    ],
  ],
  2: [[...ryArc(0.5, 0.48, 0.42, 0.44, 180, 385), [0.06, 1.76], [0.96, 1.76]]],
  3: [
    ryArc(0.48, 0.47, 0.4, 0.43, 200, 450),
    ryArc(0.48, 1.33, 0.46, 0.45, 270, 520),
  ],
  4: [
    [
      [0.7, 1.78],
      [0.7, 0.04],
      [0.04, 1.2],
      [0.98, 1.2],
    ],
  ],
  5: [
    [
      [0.92, 0.05],
      [0.2, 0.05],
      [0.13, 0.88],
      ...ryArc(0.48, 1.28, 0.46, 0.48, 232, 512, 16),
    ],
  ],
  6: [
    ryBez([0.82, 0.04], [0.1, 0.22], [0.08, 1.3]),
    ryArc(0.5, 1.3, 0.42, 0.47, 0, 360, 20),
  ],
  7: [
    [
      [0.05, 0.05],
      [0.95, 0.05],
      [0.36, 1.76],
    ],
  ],
  8: [
    ryArc(0.5, 0.46, 0.36, 0.42, 0, 360, 18),
    ryArc(0.5, 1.32, 0.44, 0.47, 0, 360, 20),
  ],
  9: [
    ryArc(0.5, 0.5, 0.42, 0.46, 0, 360, 20),
    ryBez([0.92, 0.55], [0.94, 1.7], [0.1, 1.68]),
  ],
};

// race numeral, painted: digits in a 1 × 1.8 box, centred on (cx, cy) units
// above the ground; m = pixels per unit
function paintNumber(g, m, cx, cy, n, sx, sy, weight) {
  const text = String(n);
  const gap = 0.3;
  const total = text.length + gap * (text.length - 1);
  let x0 = cx - (total * sx) / 2;
  g.lineStyle(weight, RY_INK, 0.95);
  for (const ch of text) {
    for (const stroke of RY_DIGITS[ch]) {
      const pts = stroke.map(([u, v]) => [
        (x0 + u * sx) * m,
        -(cy + (0.9 - v) * sy) * m,
      ]);
      for (let i = 0; i < pts.length - 1; i++) {
        g.lineBetween(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      }
      g.fillStyle(RY_INK, 0.95);
      for (const p of pts) g.fillCircle(p[0], p[1], weight / 2);
    }
    x0 += (1 + gap) * sx;
  }
}

// a plain wheel: tyre, rim, three spokes
function makeWheel(scene, r, wx, wy, seed) {
  const w = scene.add.graphics();
  w.setPosition(wx, wy);
  const rnd = scene._rng(seed);
  w.fillStyle(0x08090b, 1);
  w.fillCircle(0, 0, r);
  scene._pencilCircle(w, rnd, 0, 0, r, 1.3, RY_SKETCH, 0.5, 12, 0.7);
  w.fillStyle(0x1a1d22, 1);
  w.fillCircle(0, 0, r * 0.55);
  w.lineStyle(1.4, RY_SKETCH, 0.4);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + 0.4;
    w.lineBetween(
      Math.cos(a) * r * 0.52,
      Math.sin(a) * r * 0.52,
      -Math.cos(a) * r * 0.52,
      -Math.sin(a) * r * 0.52,
    );
  }
  w.fillStyle(RY_SKETCH, 0.4);
  w.fillCircle(0, 0, r * 0.14);
  return w;
}

/** Phaser owns the returned car and its wheel tweens. */
// A plain car in the same hand as the parked one on the crossing: a rounded
// body, a slanted cabin, two wheels — and its number on the door. Nose to
// the right, ground at y = 0, everything in pixels off the car length L.
export function createCar(scene, { length, groundY }, number, index) {
  const L = length;
  const rnd = scene._rng(9100 + index * 37);
  const wr = L * 0.09; // wheel radius
  const bh = L * 0.27; // body height
  const clear = wr * 1.1; // the body rides this far off the ground
  const by = -(clear + bh); // top of the body (up is negative)
  // very dark, but each its own: burgundy, navy, forest, ochre, plum, petrol
  const tones = [0x431a22, 0x182b4a, 0x1b3d2a, 0x4a3a17, 0x33204a, 0x14454a];

  // headlamp beam, sliced so the light fades with distance
  const beam = scene.add.graphics();
  const y0 = by + bh * 0.4;
  const slices = 16;
  for (let s = 0; s < slices; s++) {
    const t0 = s / slices;
    const t1 = (s + 1) / slices;
    const top = (t) => y0 - bh * 0.12 - t * bh * 0.4;
    const low = (t) => y0 + bh * 0.14 + t * (-wr * 0.2 - y0 - bh * 0.14);
    const bx0 = L / 2 + t0 * L * 1.5;
    const bx1 = L / 2 + t1 * L * 1.5;
    beam.fillStyle(RY_WARM, 0.07 * Math.pow(1 - t0, 1.6));
    beam.fillPoints(
      [
        { x: bx0, y: top(t0) },
        { x: bx1, y: top(t1) },
        { x: bx1, y: low(t1) },
        { x: bx0, y: low(t0) },
      ],
      true,
    );
  }

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.38);
  shadow.fillEllipse(0, 2, L * 1.05, L * 0.09);

  // ── body ──
  const body = scene.add.graphics();
  body.fillStyle(tones[index], 1);
  body.fillRoundedRect(-L / 2, by, L, bh, bh * 0.35);
  const cab = [
    [-0.3 * L, by + 2],
    [-0.2 * L, by - L * 0.2],
    [0.1 * L, by - L * 0.2],
    [0.27 * L, by + 2],
  ];
  body.fillPoints(
    cab.map(([x, y]) => ({ x, y })),
    true,
  );
  body.fillStyle(RY_SKETCH, 0.03);
  body.fillRoundedRect(-L / 2, by, L, bh, bh * 0.35);
  body.lineStyle(1.3, RY_SKETCH, 0.5);
  body.strokeRoundedRect(-L / 2, by, L, bh, bh * 0.35);
  scene._pencilSeg(
    body,
    rnd,
    -L / 2 + bh * 0.3,
    by,
    L / 2 - bh * 0.3,
    by,
    1.2,
    RY_SKETCH,
    0.45,
    0.8,
  );
  for (let i = 0; i < cab.length - 1; i++) {
    scene._pencilSeg(
      body,
      rnd,
      cab[i][0],
      cab[i][1],
      cab[i + 1][0],
      cab[i + 1][1],
      1.2,
      RY_SKETCH,
      0.5,
      0.6,
    );
  }
  // the window
  body.fillStyle(0x0a0c0f, 0.96);
  body.fillPoints(
    [
      { x: -0.27 * L, y: by },
      { x: -0.185 * L, y: by - L * 0.2 + 4 },
      { x: 0.09 * L, y: by - L * 0.2 + 4 },
      { x: 0.23 * L, y: by },
    ],
    true,
  );
  // a rear wing on two short posts
  body.lineStyle(1.3, RY_SKETCH, 0.45);
  body.lineBetween(-L * 0.47, by + 2, -L * 0.47, by - L * 0.045);
  body.lineBetween(-L * 0.4, by + 2, -L * 0.4, by - L * 0.045);
  body.fillStyle(0x0d0f13, 1);
  body.fillRect(-L * 0.5, by - L * 0.075, L * 0.17, L * 0.03);
  body.lineStyle(1.2, RY_SKETCH, 0.5);
  body.strokeRect(-L * 0.5, by - L * 0.075, L * 0.17, L * 0.03);

  // wheel arches: dark half-discs, the tyres sit inside them
  const wheelX = [L * 0.29, -L * 0.29];
  for (const wx of wheelX) {
    body.fillStyle(0x060708, 1);
    body.beginPath();
    body.arc(wx, -wr, wr * 1.3, Math.PI, Math.PI * 2);
    body.closePath();
    body.fillPath();
    body.lineStyle(1.3, RY_SKETCH, 0.4);
    body.beginPath();
    body.arc(wx, -wr, wr * 1.3, Math.PI, Math.PI * 2);
    body.strokePath();
  }
  const wheelObjs = wheelX.map((wx, i) =>
    makeWheel(scene, wr, wx, -wr, 9300 + index * 11 + i),
  );

  // ── lamps and the plate, on top of the wheels ──
  const d = scene.add.graphics();
  const lx = L / 2 - 3;
  const ly = by + bh * 0.4;
  d.fillStyle(RY_WARM, 0.1);
  d.fillCircle(lx, ly, L * 0.08);
  d.fillStyle(RY_WARM, 0.92);
  d.fillCircle(lx, ly, L * 0.028);
  scene._pencilCircle(d, rnd, lx, ly, L * 0.032, 1, RY_SKETCH, 0.5, 10, 0.3);
  d.fillStyle(0xff8a70, 0.5);
  d.fillRect(-L / 2 - 1, by + bh * 0.3, 3, bh * 0.25);

  // the number plate on the door — the only text in the scene
  const pw = L * 0.3;
  const ph = L * 0.18;
  const py = by + bh * 0.5;
  d.fillStyle(RY_PLATE, 0.96);
  d.fillRoundedRect(-pw / 2, py - ph / 2, pw, ph, L * 0.03);
  d.lineStyle(1.3, RY_INK, 0.7);
  d.strokeRoundedRect(-pw / 2, py - ph / 2, pw, ph, L * 0.03);
  paintNumber(
    d,
    L,
    0,
    (clear + bh * 0.5) / L,
    number,
    0.104,
    0.078,
    Math.max(2, 0.02 * L),
  );

  const car = scene.add.container(-L * 2, groundY, [
    beam,
    shadow,
    body,
    ...wheelObjs,
    d,
  ]);
  car.setDepth(5 + index * 0.01);
  car.setVisible(false);
  // the tyres spin whenever the car does
  for (const w of wheelObjs) {
    scene.tweens.add({ targets: w, angle: 360, duration: 240, repeat: -1 });
  }
  return { container: car, number, index };
}
