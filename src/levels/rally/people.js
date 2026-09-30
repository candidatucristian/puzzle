import { lcg } from "./stage.js";

/** The people at the finish: the spectators behind the tape and the marshal
 *  with the chequered flag. Painted the way the stage lights them — the
 *  masts are behind them, so every head, shoulder and raised arm carries a
 *  warm rim, and the lamps behind the camera fill their fronts dimly.
 *
 *  Each figure is drawn in metres (y up) at its true height, onto its own
 *  small canvas at RES times its size on screen, feet at the origin. Each
 *  spectator has two poses: however they stand, and arms in the air for when
 *  a car crosses the line. The marshal's flag arm is its own image, pivoting
 *  at the shoulder, in three flutters of the cloth. */

const RES = 3;
const ATLAS = "ry_people";
const PERSON = "p";
const MARSHAL = "marshal";
const ARM = "arm";
export const FLAG_FRAMES = 3;

const JACKETS = [
  [26, 31, 46],
  [20, 21, 24],
  [44, 48, 36],
  [74, 28, 32],
  [58, 60, 64],
  [168, 70, 22],
  [28, 74, 92],
  [150, 118, 34],
  [122, 22, 26],
  [26, 48, 104],
  [36, 36, 40],
  [90, 70, 52],
];
const TROUSERS = [
  [22, 24, 30],
  [30, 34, 46],
  [18, 18, 20],
  [48, 44, 40],
];
const SKIN = [
  [214, 170, 140],
  [190, 140, 108],
  [150, 102, 74],
  [104, 70, 52],
];
const HAIR = [
  [30, 22, 18],
  [70, 48, 30],
  [150, 120, 80],
  [120, 120, 120],
];
const BEANIES = [
  [160, 30, 30],
  [30, 30, 36],
  [210, 170, 40],
  [40, 90, 150],
  [220, 220, 214],
  [30, 110, 70],
];
const FLAGS = [
  [
    [0, 56, 168],
    [255, 255, 255],
  ],
  [
    [206, 17, 38],
    [255, 255, 255],
  ],
  [
    [0, 87, 183],
    [255, 215, 0],
  ],
  [
    [0, 122, 61],
    [255, 255, 255],
    [206, 17, 38],
  ],
  [
    [0, 38, 84],
    [255, 255, 255],
    [213, 43, 30],
  ],
];

// what one spectator is wearing and doing, from their seed
function specFor(seed) {
  const r = lcg(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const roll = r();
  const pose = roll < 0.3 ? "pockets" : roll < 0.52 ? "stand" : roll < 0.7 ? "phone" : roll < 0.8 ? "flag" : roll < 0.9 ? "camera" : "arms";
  const hr = r();
  return {
    height: 1.6 + r() * 0.3,
    build: 0.92 + r() * 0.22,
    jacket: pick(JACKETS),
    puffer: r() < 0.5,
    trousers: pick(TROUSERS),
    skin: pick(SKIN),
    hair: pick(HAIR),
    hat: hr < 0.45 ? "beanie" : hr < 0.62 ? "cap" : hr < 0.8 ? "hood" : "none",
    beanie: pick(BEANIES),
    scarf: r() < 0.3 ? [pick(BEANIES), pick(BEANIES)] : null,
    flag: pick(FLAGS),
    pose,
    lean: (r() - 0.5) * 0.05,
  };
}

// ── painting a figure ───────────────────────────────────────────────────────

const rgb = (c, f = 1, a = 1) =>
  `rgba(${Math.round(Math.min(255, c[0] * f))},${Math.round(Math.min(255, c[1] * f))},${Math.round(Math.min(255, c[2] * f))},${a})`;
// the warm rim the masts put on a colour
const rimOf = (c, lit) => [Math.min(255, c[0] * 0.5 + 200 * lit), Math.min(255, c[1] * 0.5 + 160 * lit), Math.min(255, c[2] * 0.5 + 110 * lit)];

// a filled shape with the rim along its upper edges: fill the rim colour,
// then the body over it, shifted down a hair
function part(ctx, path, base, lit, r) {
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = rgb(rimOf(base, lit));
  ctx.fillRect(-5, -5, 10, 10);
  ctx.translate(0, r);
  ctx.fillStyle = rgb(base, 0.55 + 0.45 * lit);
  ctx.fill(path);
  ctx.restore();
}

// a limb as a thick stroke with its own rim
function limb(ctx, pts, w, base, lit, r) {
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  path();
  ctx.strokeStyle = rgb(rimOf(base, lit));
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, r * 0.8);
  path();
  ctx.strokeStyle = rgb(base, 0.55 + 0.45 * lit);
  ctx.lineWidth = w * 0.86;
  ctx.stroke();
  ctx.restore();
}

function rrPath(x, y, w, h, rr) {
  const p = new Path2D();
  const r = Math.min(rr, w / 2, h / 2);
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

// hands for each pose, relative to the shoulders (metres, y up)
function armsFor(pose, cheer) {
  if (cheer) return { l: [[-0.3, 0.28], [-0.36, 0.56]], r: [[0.3, 0.28], [0.36, 0.56]] };
  switch (pose) {
    case "pockets":
      return { l: [[-0.08, -0.28], [0.06, -0.45]], r: [[0.08, -0.28], [-0.06, -0.45]] };
    case "phone":
      return { l: [[-0.05, -0.3], [-0.02, -0.56]], r: [[0.06, -0.2], [-0.12, 0.13]] };
    case "flag":
      return { l: [[-0.05, -0.3], [-0.02, -0.56]], r: [[0.14, 0.12], [0.14, 0.4]] };
    case "camera":
      return { l: [[-0.12, -0.2], [0.08, 0.14]], r: [[0.12, -0.2], [-0.08, 0.14]] };
    case "arms":
      return { l: [[-0.28, 0.2], [-0.3, 0.5]], r: [[0.05, -0.3], [0.02, -0.56]] };
    case "flagless":
      // the marshal: his right arm is the separate flag arm
      return { l: [[-0.05, -0.3], [-0.03, -0.58]], r: null };
    default:
      return { l: [[-0.05, -0.3], [-0.03, -0.58]], r: [[0.05, -0.3], [0.03, -0.58]] };
  }
}

/** One spectator on a canvas: `k` screen pixels per metre where they stand,
 *  `lit` how strongly the floodlight reaches them (0–1). */
function paintSpectator(spec, k, lit, cheer) {
  const s = spec.height / 1.75;
  const b = spec.build;
  const K = k * RES;
  const w = 1.5;
  const h = 2.9;
  const c = makeCanvas(w * K, h * K);
  const ctx = c.getContext("2d");
  // metres, y up, feet at the origin
  ctx.setTransform(K, 0, 0, -K, (w / 2) * K, 2.6 * K);
  const r = 1.4 / K; // the rim's width: a couple of texture pixels
  ctx.transform(1, 0, spec.lean, 1, 0, 0);
  const sh = 1.44 * s; // shoulders
  const shW = 0.21 * b;

  // legs, then boots
  for (const side of [-1, 1]) {
    limb(
      ctx,
      [
        [side * 0.085 * b, 0.82 * s],
        [side * 0.095 * b, 0.42 * s],
        [side * 0.1 * b, 0.07],
      ],
      0.13 * b,
      spec.trousers,
      lit,
      r,
    );
    ctx.fillStyle = "#101010";
    ctx.beginPath();
    ctx.ellipse(side * 0.11 * b, 0.035, 0.08, 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // the flag goes behind them, on its pole
  const arms = armsFor(spec.pose, cheer);
  if (spec.pose === "flag") {
    const hx = shW + arms.r[1][0];
    const hy = sh + arms.r[1][1];
    ctx.strokeStyle = "#2a241e";
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 0.3);
    ctx.lineTo(hx + 0.02, hy + 0.85);
    ctx.stroke();
    paintCloth(ctx, hx + 0.02, hy + 0.85, 0.62, 0.42, spec.flag, lit, cheer ? 1 : 0);
  }

  // the arms reaching back behind the body go first
  const arm = (side, pts) => {
    const start = [side * shW * 0.92, sh - 0.04];
    const e = [start[0] + pts[0][0], sh + pts[0][1]];
    const hnd = [start[0] + pts[1][0], sh + pts[1][1]];
    limb(ctx, [start, e, hnd], 0.12 * b, spec.jacket, lit, r);
    ctx.fillStyle = rgb(spec.skin, 0.4 + 0.5 * lit);
    ctx.beginPath();
    ctx.arc(hnd[0], hnd[1], 0.045, 0, Math.PI * 2);
    ctx.fill();
    return hnd;
  };
  const up = (pts) => pts[1][1] > 0;
  const behind = [];
  if (!up(arms.l)) behind.push(["l", -1]);
  if (arms.r && !up(arms.r)) behind.push(["r", 1]);

  // the jacket: square at the shoulders, a little flared at the hem
  const torso = new Path2D();
  torso.moveTo(-shW, sh - 0.02);
  torso.quadraticCurveTo(-shW, sh + 0.05, -shW + 0.06, sh + 0.05);
  torso.lineTo(shW - 0.06, sh + 0.05);
  torso.quadraticCurveTo(shW, sh + 0.05, shW, sh - 0.02);
  torso.lineTo(shW * 0.98, 0.76 * s);
  torso.quadraticCurveTo(0, 0.72 * s, -shW * 0.98, 0.76 * s);
  torso.closePath();
  part(ctx, torso, spec.jacket, lit, r);
  if (spec.puffer) {
    // the quilting of a down jacket
    ctx.save();
    ctx.clip(torso);
    ctx.strokeStyle = rgb(spec.jacket, 0.35, 0.8);
    ctx.lineWidth = 0.012;
    for (let y = 0.84 * s; y < sh; y += 0.12 * s) {
      ctx.beginPath();
      ctx.moveTo(-shW, y);
      ctx.quadraticCurveTo(0, y - 0.02, shW, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  // the zip
  ctx.strokeStyle = rgb(spec.jacket, 0.4);
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(0, sh + 0.04);
  ctx.lineTo(0, 0.76 * s);
  ctx.stroke();

  for (const [key, side] of behind) arm(side, arms[key]);

  // the scarf
  if (spec.scarf) {
    const [a, bb] = spec.scarf;
    const band = rrPath(-0.1, sh - 0.02, 0.2, 0.09, 0.03);
    part(ctx, band, a, lit, r);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgb(i % 2 ? a : bb, 0.55 + 0.45 * lit);
      ctx.fillRect(0.02, sh - 0.09 - i * 0.09, 0.07, 0.09);
    }
  }

  // neck and head
  ctx.fillStyle = rgb(spec.skin, 0.35 + 0.45 * lit);
  ctx.fillRect(-0.045, sh, 0.09, 0.1);
  const hy = sh + 0.2 * s;
  const head = new Path2D();
  head.ellipse(0, hy, 0.1, 0.125, 0, 0, Math.PI * 2);
  part(ctx, head, spec.skin, lit, r);
  if (spec.pose === "phone" && !cheer) {
    // the screen lights their face from below
    const g = ctx.createRadialGradient(0, hy - 0.08, 0, 0, hy - 0.08, 0.2);
    g.addColorStop(0, "rgba(190,215,255,0.5)");
    g.addColorStop(1, "rgba(190,215,255,0)");
    ctx.fillStyle = g;
    ctx.fill(head);
  }
  paintHeadgear(ctx, spec, hy, lit, r);

  // the arms in front of the body
  for (const [key, side] of [
    ["l", -1],
    ["r", 1],
  ]) {
    if (!arms[key] || behind.some((q) => q[0] === key)) continue;
    const hnd = arm(side, arms[key]);
    if (key === "r" && spec.pose === "phone" && !cheer) {
      // a phone held up to film: its back to us, the lens a dot
      ctx.fillStyle = "#15161a";
      ctx.fillRect(hnd[0] - 0.035, hnd[1] - 0.02, 0.07, 0.13);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(hnd[0] + 0.012, hnd[1] + 0.08, 0.012, 0.012);
    }
  }
  if (spec.pose === "camera" && !cheer) {
    ctx.fillStyle = "#121214";
    ctx.fillRect(-0.08, hy - 0.1, 0.16, 0.1);
    ctx.fillStyle = "#26282c";
    ctx.beginPath();
    ctx.arc(0.02, hy - 0.05, 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  return { canvas: c, ox: 0.5, oy: 2.6 / h };
}

function paintHeadgear(ctx, spec, hy, lit, r) {
  const top = hy + 0.125;
  if (spec.hat === "beanie") {
    const p = new Path2D();
    p.moveTo(-0.108, hy + 0.035);
    p.bezierCurveTo(-0.11, top + 0.07, 0.11, top + 0.07, 0.108, hy + 0.035);
    p.closePath();
    part(ctx, p, spec.beanie, lit, r);
    ctx.fillStyle = rgb(spec.beanie, 0.4 + 0.3 * lit);
    ctx.fillRect(-0.108, hy + 0.035, 0.216, 0.035);
  } else if (spec.hat === "cap") {
    const p = new Path2D();
    p.moveTo(-0.105, hy + 0.05);
    p.bezierCurveTo(-0.1, top + 0.03, 0.1, top + 0.03, 0.105, hy + 0.05);
    p.closePath();
    part(ctx, p, spec.beanie, lit, r);
    ctx.fillStyle = rgb(spec.beanie, 0.3);
    ctx.fillRect(-0.12, hy + 0.035, 0.24, 0.022);
  } else if (spec.hat === "hood") {
    const p = new Path2D();
    p.ellipse(0, hy + 0.01, 0.135, 0.155, 0, 0, Math.PI * 2);
    const face = new Path2D();
    face.ellipse(0, hy - 0.01, 0.085, 0.105, 0, 0, Math.PI * 2);
    const ring = new Path2D();
    ring.addPath(p);
    ctx.save();
    ctx.clip(p);
    part(ctx, ring, spec.jacket, lit, r);
    ctx.restore();
    ctx.fillStyle = rgb(spec.skin, 0.35 + 0.45 * lit);
    ctx.fill(face);
  } else {
    const p = new Path2D();
    p.moveTo(-0.104, hy + 0.02);
    p.bezierCurveTo(-0.11, top + 0.04, 0.11, top + 0.04, 0.104, hy + 0.02);
    p.closePath();
    part(ctx, p, spec.hair, lit, r);
  }
}

// a flag on its pole, the cloth rippling out to the side
function paintCloth(ctx, px, py, w, h, colours, lit, phase) {
  const n = colours.length;
  const wave = (u) => Math.sin(u * 5 + phase * 2.1) * 0.05 * u;
  for (let i = 0; i < n; i++) {
    const v0 = i / n;
    const v1 = (i + 1) / n;
    ctx.beginPath();
    for (let s = 0; s <= 10; s++) {
      const u = s / 10;
      ctx.lineTo(px + u * w, py - v0 * h + wave(u) - u * 0.08);
    }
    for (let s = 10; s >= 0; s--) {
      const u = s / 10;
      ctx.lineTo(px + u * w, py - v1 * h + wave(u) - u * 0.08);
    }
    ctx.closePath();
    ctx.fillStyle = rgb(colours[i], 0.35 + 0.55 * lit);
    ctx.fill();
  }
  // the folds catch the light
  for (let s = 1; s < 10; s++) {
    const u = s / 10;
    const slope = Math.cos(u * 5 + phase * 2.1);
    ctx.fillStyle = slope > 0 ? `rgba(255,220,170,${0.12 * slope * lit})` : `rgba(0,0,0,${-0.25 * slope})`;
    ctx.fillRect(px + u * w, py - h - 0.1, w / 10, h + 0.2);
  }
}

// ── the marshal ─────────────────────────────────────────────────────────────

const HI_VIS = [238, 96, 18];
const MARSHAL_SPEC = {
  height: 1.8,
  build: 1.05,
  jacket: [30, 32, 38],
  puffer: false,
  trousers: [24, 26, 32],
  skin: [196, 146, 112],
  hair: [40, 30, 22],
  hat: "beanie",
  beanie: HI_VIS,
  scarf: null,
  flag: null,
  pose: "stand",
  lean: 0,
};

// the marshal minus his flag arm, in an orange tabard with silver bands
function paintMarshalBody(k, lit) {
  const spec = MARSHAL_SPEC;
  const out = paintSpectator({ ...spec, pose: "flagless" }, k, lit, false);
  const K = k * RES;
  const ctx = out.canvas.getContext("2d");
  ctx.setTransform(K, 0, 0, -K, 0.75 * K, 2.6 * K);
  const s = spec.height / 1.75;
  const sh = 1.44 * s;
  const shW = 0.21 * spec.build;
  const vest = new Path2D();
  vest.moveTo(-shW + 0.03, sh + 0.03);
  vest.lineTo(-0.06, sh + 0.03);
  vest.lineTo(0, sh - 0.12);
  vest.lineTo(0.06, sh + 0.03);
  vest.lineTo(shW - 0.03, sh + 0.03);
  vest.lineTo(shW * 0.98, 0.86 * s);
  vest.lineTo(-shW * 0.98, 0.86 * s);
  vest.closePath();
  part(ctx, vest, HI_VIS, lit, 1.4 / K);
  // the reflective bands: they flare white in any light
  ctx.save();
  ctx.clip(vest);
  ctx.fillStyle = `rgba(235,238,240,${0.55 + 0.4 * lit})`;
  ctx.fillRect(-0.4, 1.02 * s, 0.8, 0.055);
  ctx.fillRect(-0.4, 1.16 * s, 0.8, 0.055);
  ctx.restore();
  return out;
}

// the raised arm and the chequered flag, pivoting at the shoulder (0, 0):
// upper arm, forearm, a short stick, the cloth rippling out from it
function paintFlagArm(k, lit, frame) {
  const K = k * RES;
  const w = 1.8;
  const h = 1.8;
  const c = makeCanvas(w * K, h * K);
  const ctx = c.getContext("2d");
  // the shoulder sits at (0.5 m, 1.35 m) in from the canvas's top-left
  ctx.setTransform(K, 0, 0, -K, 0.5 * K, 1.35 * K);
  const r = 1.4 / K;
  const hand = [0.1, 0.55];
  // the stick, then the flag
  ctx.strokeStyle = "#1c1a18";
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(hand[0] - 0.01, hand[1] - 0.12);
  ctx.lineTo(hand[0] + 0.03, hand[1] + 0.62);
  ctx.stroke();
  const phase = (frame / FLAG_FRAMES) * Math.PI * 2;
  const x0 = hand[0] + 0.03;
  const y0 = hand[1] + 0.62;
  const fw = 0.62;
  const fh = 0.46;
  const cols = 6;
  const rows = 4;
  const wave = (u) => Math.sin(u * 4.2 - phase) * 0.06 * (0.3 + u);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u0 = i / cols;
      const u1 = (i + 1) / cols;
      const light = (i + j) % 2 === 0;
      const slope = Math.cos(((u0 + u1) / 2) * 4.2 - phase);
      const shade = 0.75 + 0.25 * slope;
      ctx.fillStyle = light ? rgb([236, 232, 222], shade * (0.55 + 0.45 * lit)) : rgb([16, 16, 18], 1);
      ctx.beginPath();
      ctx.moveTo(x0 + u0 * fw, y0 - (j / rows) * fh + wave(u0) - u0 * 0.06);
      ctx.lineTo(x0 + u1 * fw, y0 - (j / rows) * fh + wave(u1) - u1 * 0.06);
      ctx.lineTo(x0 + u1 * fw, y0 - ((j + 1) / rows) * fh + wave(u1) - u1 * 0.06);
      ctx.lineTo(x0 + u0 * fw, y0 - ((j + 1) / rows) * fh + wave(u0) - u0 * 0.06);
      ctx.closePath();
      ctx.fill();
    }
  }
  // the sleeve, the glove
  limb(
    ctx,
    [
      [0, 0],
      [0.08, 0.28],
      hand,
    ],
    0.12 * 1.05,
    [30, 32, 38],
    lit,
    r,
  );
  ctx.fillStyle = "#1a1a1c";
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], 0.05, 0, Math.PI * 2);
  ctx.fill();
  return { canvas: c, ox: 0.5 / w, oy: 1.35 / h };
}

// ── onto textures ───────────────────────────────────────────────────────────

/** Paints every spectator (two poses each) and the marshal onto one atlas
 *  texture, a frame each; returns where each stands on screen. */
export function paintPeople(textures, L, lightAt) {
  const sheets = [];
  const crowd = L.crowd.map((p, i) => {
    const spec = specFor(p.seed);
    const k = L.px(p.z) * L.m;
    const lit = Math.min(1, 0.25 + 0.75 * lightAt(p.x, p.z));
    const still = paintSpectator(spec, k, lit, false);
    const cheer = paintSpectator(spec, k, lit, true);
    sheets.push({ name: PERSON + i, canvas: still.canvas }, { name: PERSON + i + "_up", canvas: cheer.canvas });
    const at = L.P(p.x, 0, p.z);
    return { frame: PERSON + i, cheerFrame: PERSON + i + "_up", ox: still.ox, oy: still.oy, x: at.x, y: at.y, z: p.z };
  });
  const mk = L.px(L.marshal.z) * L.m;
  const mlit = Math.min(1, 0.3 + 0.75 * lightAt(L.marshal.x, L.marshal.z));
  const body = paintMarshalBody(mk, mlit);
  sheets.push({ name: MARSHAL, canvas: body.canvas });
  const arms = [];
  for (let f = 0; f < FLAG_FRAMES; f++) {
    const a = paintFlagArm(mk, mlit, f);
    sheets.push({ name: ARM + f, canvas: a.canvas });
    arms.push({ frame: ARM + f, ox: a.ox, oy: a.oy });
  }
  packAtlas(textures, sheets);
  const at = L.P(L.marshal.x, 0, L.marshal.z);
  const s = MARSHAL_SPEC.height / 1.75;
  const shoulder = L.P(L.marshal.x + 0.21 * 1.05 * 0.92 * L.m, (1.44 * s - 0.04) * L.m, L.marshal.z);
  return {
    key: ATLAS,
    res: RES,
    crowd,
    marshal: { frame: MARSHAL, ox: body.ox, oy: body.oy, x: at.x, y: at.y, z: L.marshal.z, arms, shoulder },
  };
}

// shelves, tallest first, into one canvas: one texture for everybody
function packAtlas(textures, sheets) {
  const maxW = 2048;
  const order = sheets.slice().sort((a, b) => b.canvas.height - a.canvas.height);
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const s of order) {
    if (x + s.canvas.width > maxW) {
      x = 0;
      y += rowH + 1;
      rowH = 0;
    }
    s.x = x;
    s.y = y;
    x += s.canvas.width + 1;
    rowH = Math.max(rowH, s.canvas.height);
  }
  const atlas = makeCanvas(maxW, y + rowH);
  const g = atlas.getContext("2d");
  for (const s of sheets) g.drawImage(s.canvas, s.x, s.y);
  if (textures.exists(ATLAS)) textures.remove(ATLAS);
  const tex = textures.addCanvas(ATLAS, atlas);
  for (const s of sheets) tex.add(s.name, 0, s.x, s.y, s.canvas.width, s.canvas.height);
}

export function releasePeopleArt(textures) {
  if (textures.exists(ATLAS)) textures.remove(ATLAS);
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
