/** The scene for BINARY TREE: a root-view box on a shelf by a sunny window.
 *  A seedling has come up in a wooden box with a glass front, and behind the
 *  glass its root can be seen going down through the soil, forking three
 *  times to eight tips. The gardener has marked it the way root boxes are
 *  marked — START written on the glass in white grease pencil where the root
 *  begins, a tick and a letter under each tip — and has put a strip of
 *  masking tape across the front of the box with seven routes on it in
 *  marker.
 *
 *  Painted once per screen size, the morning sun coming in from a window off
 *  to the left: the wall behind, with the window's patch of sun on it, in one
 *  layer; the shelf and the box in front of it in another. What moves stays
 *  out of the painting: the shadows of leaves outside, stirring in the patch
 *  of sun, dust turning in the light, now and then a drop running down the
 *  inside of the glass. */

import { BINARY_PATHS, BINARY_LEAVES } from "./puzzle.js";

const K = {
  wall: "bt_wall",
  box: "bt_box",
  dapple: "bt_dapple",
  mote: "bt_mote",
  drop: "bt_drop",
  veil: "bt_veil",
};

// ── where everything is ─────────────────────────────────────────────────────

function layoutRootBox(W, H) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 700);
  const post = Math.max(14, S * 0.035); // the box's corner posts
  const top = H * 0.19; // the box's top edge
  const base = H * 0.8; // the foot of the glass, where it sits in the bottom rail
  const shelf = H * 0.9; // the shelf the box stands on
  const frame = { x0: W * 0.055, x1: W * 0.945, y0: top, y1: shelf };
  const glass = { x0: frame.x0 + post, x1: frame.x1 - post, y0: top, y1: base };
  const soilY = top + H * 0.025;
  // the root's joints — its three forks and its eight tips — spread over the
  // middle 80 % of the width, as the old diagram's nodes were
  const x = (d, i) => W * 0.1 + (W * 0.8 * (i + 0.5)) / 2 ** d;
  const ys = [0.09, 0.23, 0.37, 0.505].map((k) => soilY + H * k);
  const forks = [0, 1, 2].map((d) =>
    Array.from({ length: 2 ** d }, (_, i) => ({ x: x(d, i), y: ys[d] })),
  );
  const tips = Array.from({ length: 8 }, (_, i) => ({ x: x(3, i), y: ys[3] }));
  return {
    W,
    H,
    S,
    u,
    post,
    top,
    base,
    shelf,
    frame,
    glass,
    soilY,
    forks,
    tips,
    start: { x: W / 2, y: soilY },
    letterY: ys[3] + H * 0.045,
    hand: Math.max(13, S * 0.03), // the height of the gardener's writing
    tape: {
      x: W / 2,
      y: (base + shelf) / 2,
      w: Math.min(W * 0.72, 760 * u),
      h: (shelf - base) * 0.56,
    },
    // the seedling's scale, about 1 px to its unit (it stands about 82 of
    // them tall), kept clear of the line of text at the top of the screen
    seedling: Math.min(S / 620, (soilY - 62) / 82),
    // the window's patch of sun on the wall: a slanted quadrilateral, high on
    // the left, most of it hidden behind the box
    sun: [
      [-W * 0.04, H * 0.03],
      [W * 0.31, -H * 0.01],
      [W * 0.27, H * 0.36],
      [-W * 0.07, H * 0.42],
    ],
  };
}

/** Every stretch of root, parent to child: the taproot from START down to
 *  the first fork, then each fork's left and right. `w0`/`w1` its thickness
 *  at either end, as a share of the smaller screen side. */
function rootSegments(L) {
  const segs = [
    {
      a: L.start,
      b: L.forks[0][0],
      w0: 0.0105,
      w1: 0.009,
      depth: 0,
      bend: L.W * 0.004,
    },
  ];
  const widths = [
    [0.0078, 0.0058],
    [0.0052, 0.0038],
    [0.0034, 0.0009],
  ];
  const levels = [...L.forks, L.tips];
  for (let d = 0; d < 3; d++) {
    levels[d].forEach((p, i) => {
      for (const c of [2 * i, 2 * i + 1]) {
        segs.push({
          a: p,
          b: levels[d + 1][c],
          w0: widths[d][0],
          w1: widths[d][1],
          depth: d + 1,
          bend: 0,
        });
      }
    });
  }
  return segs;
}

/** A point on a stretch of root: it leaves its fork at a slant and turns
 *  down toward its end, as roots do. */
function rootPoint(s, t) {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const c1x = s.a.x + dx * 0.2 + s.bend;
  const c1y = s.a.y + dy * 0.5;
  const c2x = s.b.x - dx * 0.3 - s.bend;
  const c2y = s.b.y - dy * 0.45;
  const m = 1 - t;
  return {
    x:
      m * m * m * s.a.x +
      3 * m * m * t * c1x +
      3 * m * t * t * c2x +
      t * t * t * s.b.x,
    y:
      m * m * m * s.a.y +
      3 * m * m * t * c1y +
      3 * m * t * t * c2y +
      t * t * t * s.b.y,
  };
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintRootBox(scene, W, H) {
  const L = layoutRootBox(W, H);
  const t = scene.textures;
  add(t, K.wall, paintWallLayer(L));
  add(t, K.box, paintBoxLayer(L));
  const dapple = paintDapple(L);
  add(t, K.dapple, dapple.canvas);
  add(t, K.veil, paintVeil(L));
  add(
    t,
    K.mote,
    radial(32, "255,238,205", [
      [0, 1],
      [0.22, 0.55],
      [1, 0],
    ]),
  );
  add(t, K.drop, paintDrop());
  return { L, keys: K, dapple: dapple.at };
}

export function releaseRootBoxArt(textures) {
  for (const key of Object.values(K))
    if (textures.exists(key)) textures.remove(key);
}

function paintWallLayer(L) {
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  paintWall(ctx, L);
  grain(ctx, L.W, L.H, 0.035);
  return c;
}

function paintBoxLayer(L) {
  const c = makeCanvas(L.W, L.H);
  const ctx = c.getContext("2d");
  paintShelf(ctx, L);
  paintInside(ctx, L);
  paintSoil(ctx, L);
  paintRoot(ctx, L);
  paintSeedling(ctx, L);
  paintGlass(ctx, L);
  paintWriting(ctx, L);
  paintFrame(ctx, L);
  paintTape(ctx, L);
  paintDaylight(ctx, L);
  grain(ctx, L.W, L.H, 0.03, "source-atop");
  return c;
}

// ── the wall ────────────────────────────────────────────────────────────────

// warm plaster in the shade of the room, and high on the left the window's
// patch of sun, the glazing bars' shadows across it
function paintWall(ctx, L) {
  const { W, H, sun, frame, top } = L;
  const g = ctx.createLinearGradient(0, 0, W * 0.5, H);
  g.addColorStop(0, "#5c5044");
  g.addColorStop(0.5, "#3e352c");
  g.addColorStop(1, "#27211b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(1717);
  for (let i = 0; i < 220; i++) {
    softEllipse(
      ctx,
      rnd() * W,
      rnd() * H,
      20 + rnd() * 60,
      10 + rnd() * 30,
      rnd() < 0.5 ? "0,0,0" : "255,240,220",
      0.035,
    );
  }
  // light thrown back off the patch onto the wall round it
  softEllipse(
    ctx,
    W * 0.1,
    H * 0.12,
    W * 0.42,
    H * 0.34,
    "255,206,150",
    0.13,
    "lighter",
  );
  // the patch, painted small and drawn up so that its edges come out soft,
  // as the sun's edges are
  const R = 0.25;
  const p = makeCanvas(W * R, H * R);
  const pc = p.getContext("2d");
  pc.scale(R, R);
  pc.beginPath();
  sun.forEach(([x, y], i) => (i ? pc.lineTo(x, y) : pc.moveTo(x, y)));
  pc.closePath();
  const sg = pc.createLinearGradient(0, 0, W * 0.3, H * 0.4);
  sg.addColorStop(0, "rgba(255,196,118,0.56)");
  sg.addColorStop(1, "rgba(250,170,96,0.36)");
  pc.fillStyle = sg;
  pc.fill();
  // the glazing bars
  pc.globalCompositeOperation = "destination-out";
  pc.fillStyle = "rgba(0,0,0,0.85)";
  pc.beginPath();
  pc.moveTo(W * 0.125, -H * 0.02);
  pc.lineTo(W * 0.14, -H * 0.02);
  pc.lineTo(W * 0.118, H * 0.42);
  pc.lineTo(W * 0.103, H * 0.42);
  pc.closePath();
  pc.fill();
  pc.beginPath();
  pc.moveTo(-W * 0.1, H * 0.2);
  pc.lineTo(W * 0.35, H * 0.155);
  pc.lineTo(W * 0.35, H * 0.172);
  pc.lineTo(-W * 0.1, H * 0.218);
  pc.closePath();
  pc.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(p, 0, 0, W, H);
  ctx.restore();
  // the box's shadow on the wall: the sun is low and on the left, so it
  // falls away to the right of the box
  const sh = ctx.createLinearGradient(frame.x1, 0, frame.x1 + W * 0.05, 0);
  sh.addColorStop(0, "rgba(0,0,0,0.45)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(frame.x1, top + H * 0.03, W * 0.05, H);
}

// ── the shelf ───────────────────────────────────────────────────────────────

// a deep wooden shelf: its top going back under the box, then its rounded
// front edge catching the light, and its face in shade
function paintShelf(ctx, L) {
  const { W, H, shelf, frame, u } = L;
  const lip = shelf + (H - shelf) * 0.36;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#94764f");
  g.addColorStop(0.5, "#735a3e");
  g.addColorStop(1, "#4e3c2a");
  ctx.fillStyle = g;
  ctx.fillRect(0, shelf, W, lip - shelf);
  // the grain running along it
  const rnd = lcg(3030);
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    const y = shelf + rnd() * (lip - shelf);
    ctx.strokeStyle =
      rnd() < 0.6 ? "rgba(40,26,14,0.25)" : "rgba(255,225,180,0.1)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += W / 12) ctx.lineTo(x, y + (rnd() - 0.5) * 2);
    ctx.stroke();
  }
  const f = ctx.createLinearGradient(0, lip, 0, H);
  f.addColorStop(0, "#d6b688");
  f.addColorStop(0.1, "#8e6c4a");
  f.addColorStop(0.45, "#5a4430");
  f.addColorStop(1, "#2a1f16");
  ctx.fillStyle = f;
  ctx.fillRect(0, lip, W, H - lip);
  for (let i = 0; i < 10; i++) {
    const y = lip + (H - lip) * (0.2 + rnd() * 0.8);
    ctx.strokeStyle = "rgba(20,12,6,0.22)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += W / 10) ctx.lineTo(x, y + (rnd() - 0.5) * 2.5);
    ctx.stroke();
  }
  // the box's shadow: dark where it stands, and thrown to the right
  softEllipse(
    ctx,
    (frame.x0 + frame.x1) / 2 + W * 0.03,
    shelf + 2 * u,
    (frame.x1 - frame.x0) * 0.54,
    (lip - shelf) * 0.5,
    "0,0,0",
    0.55,
  );
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(frame.x0, shelf - 1, frame.x1 - frame.x0, Math.max(2, 3 * u));
}

// ── the box ─────────────────────────────────────────────────────────────────

// through the glass, above the soil: the inside of the box's back, in shade
function paintInside(ctx, L) {
  const { glass, top, soilY } = L;
  const g = ctx.createLinearGradient(0, top, 0, soilY + 4);
  g.addColorStop(0, "#54412e");
  g.addColorStop(1, "#1e160e");
  ctx.fillStyle = g;
  ctx.fillRect(glass.x0, top, glass.x1 - glass.x0, soilY + 4 - top);
}

// the soil against the glass: a crumbly dark loam, drier and lighter at the
// top, grit and a few stones pressed to the glass
function paintSoil(ctx, L) {
  const { H, S, u, glass, soilY } = L;
  const { x0, x1, y1 } = glass;
  const rnd = lcg(2020);
  const clip = new Path2D();
  clip.moveTo(x0, soilY + 2);
  for (let x = x0; x <= x1; x += 6)
    clip.lineTo(x, soilY + (rnd() - 0.5) * 3 + Math.sin(x * 0.02) * 1.5);
  clip.lineTo(x1, y1);
  clip.lineTo(x0, y1);
  clip.closePath();
  ctx.save();
  ctx.clip(clip);
  // the body of it: crumbs and clods lit through the glass from the window,
  // painted at half size and drawn up
  const y0 = soilY - 4;
  ctx.drawImage(
    soilTexture((x1 - x0) / 2, (y1 - y0) / 2, u, rnd),
    x0,
    y0,
    x1 - x0,
    y1 - y0,
  );
  // drier and paler at the top, darker and damper further down
  const g = ctx.createLinearGradient(0, soilY, 0, y1);
  g.addColorStop(0, "rgba(150,112,74,0.3)");
  g.addColorStop(0.06, "rgba(150,112,74,0)");
  g.addColorStop(0.5, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // loose grit over it: dark bits of leaf-mould, grains of sand, a thread
  // of old root or straw, now and then a fleck of perlite
  const area = (x1 - x0) * (y1 - soilY);
  const at = () => [x0 + rnd() * (x1 - x0), soilY + rnd() * (y1 - soilY)];
  for (let i = 0, n = area / 320; i < n; i++) {
    const [x, y] = at();
    const r = 0.5 + rnd() * 1.1;
    ctx.fillStyle = `rgba(10,6,3,${0.45 + rnd() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0, n = area / 700; i < n; i++) {
    const [x, y] = at();
    const r = 0.4 + rnd() * 0.9;
    ctx.fillStyle = `rgba(${(150 + rnd() * 50) | 0},${(118 + rnd() * 34) | 0},${(84 + rnd() * 26) | 0},${0.28 + rnd() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = "round";
  for (let i = 0, n = area / 9000; i < n; i++) {
    const [x, y] = at();
    const a = rnd() * Math.PI;
    const len = (3 + rnd() * 7) * u;
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(96,70,44,0.55)" : "rgba(20,12,6,0.6)";
    ctx.lineWidth = 0.6 + rnd() * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a + 0.5) * len * 0.5,
      y + Math.sin(a + 0.5) * len * 0.5,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len,
    );
    ctx.stroke();
  }
  for (let i = 0, n = area / 16000; i < n; i++) {
    const [x, y] = at();
    const r = (0.8 + rnd() * 1.1) * Math.max(0.8, u);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, y + r * 0.35, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(222,218,206,0.7)";
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.ellipse(
        x + (rnd() - 0.5) * r,
        y + (rnd() - 0.5) * r,
        r * (0.5 + rnd() * 0.4),
        r * (0.4 + rnd() * 0.3),
        rnd() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  // stones, kept clear of the root and of the writing
  const segs = rootSegments(L);
  const clear = (x, y, pad) => {
    for (const s of segs) {
      for (let t = 0; t <= 1; t += 0.05) {
        const p = rootPoint(s, t);
        if (Math.hypot(p.x - x, p.y - y) < pad) return false;
      }
    }
    if (Math.abs(y - L.letterY) < L.hand * 1.3) return false;
    if (Math.abs(x - (L.start.x - S * 0.12)) < S * 0.1 && y < soilY + S * 0.07)
      return false;
    return y > soilY + H * 0.02;
  };
  for (let i = 0; i < 16; i++) {
    const x = x0 + 10 + rnd() * (x1 - x0 - 20);
    const y = soilY + 14 + rnd() * (y1 - soilY - 20);
    const r = (3 + rnd() ** 2 * 11) * u;
    if (clear(x, y, r + S * 0.03)) stone(ctx, x, y, r, rnd);
  }
  ctx.restore();
  // the surface: a crust of dry crumbs, lit from the window
  ctx.fillStyle = "rgba(160,122,82,0.4)";
  for (let x = x0; x < x1; x += 3)
    ctx.fillRect(x, soilY - 1 + (rnd() - 0.5) * 2.5, 2.2, 1.6);
}

// Loam, w × h: a height-field of crumbs and clods at several sizes, shaded
// as if lit from the upper left — each crumb bright on the side toward the
// window, the hollows between them dark — its colour drifting between a
// damp humus brown and a drier, redder earth.
function soilTexture(w, h, u, rnd) {
  const c = makeCanvas(w, h);
  const cw = c.width;
  const ch = c.height;
  const g = c.getContext("2d");
  const img = g.createImageData(cw, ch);
  const hgt = fractalNoise(
    cw,
    ch,
    [
      [22 * u, 0.4],
      [8 * u, 0.3],
      [3.2, 0.19],
      [1.5, 0.11],
    ],
    rnd,
  );
  const tone = fractalNoise(
    cw,
    ch,
    [
      [70 * u, 0.65],
      [20 * u, 0.35],
    ],
    rnd,
  );
  const lx = -0.5;
  const ly = -0.62;
  const lz = 0.6;
  const ll = Math.hypot(lx, ly, lz);
  const d = img.data;
  for (let y = 0; y < ch; y++) {
    const up = Math.max(0, y - 1) * cw;
    const dn = Math.min(ch - 1, y + 1) * cw;
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      const nx =
        -(
          hgt[y * cw + Math.min(cw - 1, x + 1)] -
          hgt[y * cw + Math.max(0, x - 1)]
        ) * 7;
      const ny = -(hgt[dn + x] - hgt[up + x]) * 7;
      const diff = Math.max(
        0,
        (nx * lx + ny * ly + lz) / (Math.hypot(nx, ny, 1) * ll),
      );
      const ao = smoothstep(0.3, 0.68, hgt[i]);
      const t = smoothstep(0.3, 0.7, tone[i]);
      const shade = (0.22 + 0.95 * diff) * (0.3 + 0.7 * ao);
      d[i * 4] = (48 + t * 34) * shade;
      d[i * 4 + 1] = (33 + t * 20) * shade;
      d[i * 4 + 2] = (21 + t * 10) * shade;
      d[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// a stone pressed to the glass: an irregular rounded outline, lit from the
// upper left, flecked, with a film of soil over its lower part
function stone(ctx, x, y, r, rnd) {
  const n = 9;
  const rot = rnd() * Math.PI;
  const flat = 0.6 + rnd() * 0.3;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.82 + rnd() * 0.3);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr * flat;
    pts.push([
      x + px * Math.cos(rot) - py * Math.sin(rot),
      y + px * Math.sin(rot) + py * Math.cos(rot),
    ]);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const path = new Path2D();
  const m0 = mid(pts[n - 1], pts[0]);
  path.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const q = mid(pts[i], pts[(i + 1) % n]);
    path.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]);
  }
  path.closePath();
  softEllipse(ctx, x + r * 0.25, y + r * 0.3, r * 1.4, r * 1.2, "0,0,0", 0.6);
  const tone = rnd();
  const base =
    tone < 0.45 ? [88, 80, 70] : tone < 0.8 ? [100, 80, 60] : [72, 68, 66];
  const col = (k, add = 0) =>
    `rgb(${base.map((v) => Math.round(Math.min(255, v * k + add))).join(",")})`;
  const g = ctx.createRadialGradient(
    x - r * 0.4,
    y - r * 0.45,
    r * 0.1,
    x,
    y,
    r * 1.15,
  );
  g.addColorStop(0, col(1, 20));
  g.addColorStop(0.55, col(0.85));
  g.addColorStop(1, col(0.35));
  ctx.fillStyle = g;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  for (let i = 0; i < r * 3; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.22)" : "rgba(255,245,230,0.16)";
    ctx.fillRect(x + (rnd() - 0.5) * 2 * r, y + (rnd() - 0.5) * 2 * r, 1, 1);
  }
  const f = ctx.createLinearGradient(0, y - r * 0.1, 0, y + r);
  f.addColorStop(0, "rgba(36,25,16,0)");
  f.addColorStop(1, "rgba(36,25,16,0.85)");
  ctx.fillStyle = f;
  ctx.fillRect(x - r * 1.5, y - r, r * 3, r * 2.2);
  ctx.restore();
}

// ── the root ────────────────────────────────────────────────────────────────

// Ivory root pressed against the glass: each stretch a tapering body, the
// soil dark along its edges where it has pushed its way through, a sheen
// down the lit side; fine root hairs along the young tips.
function paintRoot(ctx, L) {
  const { S } = L;
  const segs = rootSegments(L);
  const rnd = lcg(3141);
  const outline = (s) => {
    const N = 40;
    const left = [];
    const right = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = rootPoint(s, t);
      const q = rootPoint(s, Math.min(1, t + 0.01));
      const r = rootPoint(s, Math.max(0, t - 0.01));
      let nx = -(q.y - r.y);
      let ny = q.x - r.x;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const w = (S * (s.w0 + (s.w1 - s.w0) * t)) / 2;
      const wob = Math.sin(t * 13 + s.a.x * 0.01) * w * 0.06;
      left.push([p.x + nx * (w + wob), p.y + ny * (w + wob)]);
      right.push([p.x - nx * (w - wob), p.y - ny * (w - wob)]);
    }
    const path = new Path2D();
    left.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    for (let i = right.length - 1; i >= 0; i--)
      path.lineTo(right[i][0], right[i][1]);
    path.closePath();
    return path;
  };
  // the soil pushed aside: a dark seam round every root, then the roots
  const paths = segs.map(outline);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(6,3,1,0.55)";
  ctx.lineWidth = Math.max(2, S * 0.004);
  for (const p of paths) ctx.stroke(p);
  ctx.restore();
  segs.forEach((s, i) => {
    const p = paths[i];
    const g = ctx.createLinearGradient(s.a.x, s.a.y, s.b.x, s.b.y);
    g.addColorStop(0, "#d6c6a6");
    g.addColorStop(1, s.depth === 3 ? "#f0e6d0" : "#e2d4b8");
    ctx.fillStyle = g;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    // shade down the side away from the light, a sheen down the lit side
    const pts = [];
    for (let k = 0; k <= 30; k++) pts.push(rootPoint(s, k / 30));
    const run = (dx, width, style) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach((q, k) =>
        k ? ctx.lineTo(q.x + dx, q.y) : ctx.moveTo(q.x + dx, q.y),
      );
      ctx.stroke();
    };
    run(S * s.w0 * 0.3, S * s.w0 * 0.5, "rgba(90,66,40,0.35)");
    run(
      -S * s.w0 * 0.12,
      Math.max(0.8, S * s.w0 * 0.18),
      "rgba(255,252,240,0.55)",
    );
    // faint rings where it has grown
    ctx.strokeStyle = "rgba(120,96,64,0.25)";
    ctx.lineWidth = 0.8;
    for (let k = 1; k < 12; k++) {
      const q = rootPoint(s, k / 12);
      const w = S * (s.w0 + (s.w1 - s.w0) * (k / 12));
      ctx.beginPath();
      ctx.moveTo(q.x - w * 0.5, q.y + (rnd() - 0.5) * 2);
      ctx.lineTo(q.x + w * 0.5, q.y + (rnd() - 0.5) * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
  // root hairs a little behind each young tip: a pale fuzz round the root,
  // not branches; the tip itself bare
  ctx.lineCap = "round";
  ctx.lineWidth = 0.5;
  for (const s of segs.filter((q) => q.depth === 3)) {
    for (let t = 0.5; t <= 0.9; t += 0.05) {
      const p = rootPoint(s, t);
      softEllipse(ctx, p.x, p.y, S * 0.011, S * 0.011, "236,228,208", 0.035);
    }
    for (let k = 0; k < 150; k++) {
      const t = 0.45 + rnd() * 0.47;
      const p = rootPoint(s, t);
      const q = rootPoint(s, Math.min(1, t + 0.02));
      const ang =
        Math.atan2(q.y - p.y, q.x - p.x) +
        (rnd() < 0.5 ? 1 : -1) * (1.1 + rnd() * 0.8);
      const len = S * (0.0025 + rnd() * 0.0065) * (1.2 - (t - 0.45) * 1.4);
      ctx.strokeStyle = `rgba(238,230,210,${0.1 + rnd() * 0.16})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }
}

// ── the seedling ────────────────────────────────────────────────────────────
// Up a week or so: a pale stem, flushed purple at the foot, two broad seed
// leaves notched at the tip held out flat, and between them the first true
// leaves opening, rounder and a bluer green. Lit from the window on the left.
// In its own units (the stem about 60 long), its foot on the soil.

function paintSeedling(ctx, L) {
  const k = L.seedling;
  ctx.save();
  ctx.translate(L.start.x, L.soilY);
  ctx.scale(k, k);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  softEllipse(ctx, 0, 1.5, 7, 2.5, "0,0,0", 0.6);
  const stem = new Path2D();
  stem.moveTo(0, 3);
  stem.bezierCurveTo(1.2, -16, -1.4, -36, 0, -56);
  const sg = ctx.createLinearGradient(0, 3, 0, -56);
  sg.addColorStop(0, "#6a4656");
  sg.addColorStop(0.22, "#8e8a74");
  sg.addColorStop(0.5, "#aabf92");
  sg.addColorStop(1, "#b6d09a");
  ctx.strokeStyle = sg;
  ctx.lineWidth = 4.6;
  ctx.stroke(stem);
  const offset = (dx, w, style) => {
    ctx.save();
    ctx.translate(dx, 0);
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.stroke(stem);
    ctx.restore();
  };
  offset(1.5, 1.4, "rgba(30,50,24,0.45)");
  offset(-1.2, 1.1, "rgba(240,252,225,0.65)");
  // the second true leaf, just showing, behind the rest
  trueLeaf(
    ctx,
    { x: 0, y: -56 },
    { x: -1.5, y: -62 },
    -Math.PI / 2 - 0.55,
    0.55,
    ["#6f9888", "#3e6456"],
  );
  // the seed leaves on their stalks, the one toward the window a touch
  // brighter
  cotyledon(ctx, { x: 0, y: -56 }, { x: -9, y: -63 }, Math.PI + 0.24, 1.25, [
    "#aed477",
    "#72a242",
    "#4a7a2a",
  ]);
  cotyledon(ctx, { x: 0, y: -56 }, { x: 10, y: -62.5 }, -0.2, 1.25, [
    "#9cc668",
    "#62923a",
    "#3e6a22",
  ]);
  // the first true leaf, opening upright between them
  trueLeaf(ctx, { x: 0, y: -56 }, { x: 0.8, y: -64 }, -Math.PI / 2 + 0.14, 1, [
    "#7ea596",
    "#46705f",
  ]);
  ctx.restore();
}

// a seed leaf on its stalk: kidney-broad, notched at the tip, held out flat
// and so seen a little from above
function cotyledon(ctx, from, to, angle, size, [lit, body, rim]) {
  ctx.strokeStyle = "#9ab87a";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(from.x + (to.x - from.x) * 0.35, to.y + 0.5, to.x, to.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(to.x, to.y);
  ctx.rotate(angle);
  ctx.scale(size, size * 0.6);
  const p = new Path2D();
  p.moveTo(0, 0);
  p.bezierCurveTo(2, -7, 9, -12.5, 15, -12);
  p.bezierCurveTo(20, -11.5, 22.5, -6, 21, -2.4);
  p.quadraticCurveTo(20, -0.6, 17.8, 0);
  p.quadraticCurveTo(20, 0.6, 21, 2.4);
  p.bezierCurveTo(22.5, 6, 20, 11.5, 15, 12);
  p.bezierCurveTo(9, 12.5, 2, 7, 0, 0);
  const g = ctx.createRadialGradient(13, -4, 1, 11, 0, 16);
  g.addColorStop(0, lit);
  g.addColorStop(0.65, body);
  g.addColorStop(1, rim);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.strokeStyle = "rgba(30,56,18,0.55)";
  ctx.lineWidth = 0.7;
  ctx.stroke(p);
  // the midrib, and a vein out into each lobe
  ctx.strokeStyle = "rgba(226,244,196,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(16.5, 0);
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(11, -4, 16, -8);
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(11, 4, 16, 8);
  ctx.stroke();
  ctx.restore();
}

// a true leaf, more upright than the seed leaves and so seen nearly face
// on: egg-shaped, its margin a little waved, as young cabbage-kind leaves
// are, with a pale midrib and veins
function trueLeaf(ctx, from, to, angle, size, [body, rim]) {
  ctx.strokeStyle = "#8aa87e";
  ctx.lineWidth = 1.5 * size;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(to.x, to.y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  const p = new Path2D();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const x = 8.5 - Math.cos(a) * 8.5;
    const y =
      7.2 *
      Math.sin(a) *
      (0.72 + 0.28 * (x / 17)) *
      (1 + 0.07 * Math.sin(a * 9));
    if (i) p.lineTo(x, y);
    else p.moveTo(x, y);
  }
  p.closePath();
  const g = ctx.createLinearGradient(0, -8, 0, 8);
  g.addColorStop(0, body);
  g.addColorStop(1, rim);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.strokeStyle = "rgba(26,48,38,0.5)";
  ctx.lineWidth = 0.6;
  ctx.stroke(p);
  ctx.strokeStyle = "rgba(216,236,224,0.5)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0.5, 0);
  ctx.lineTo(15.5, 0);
  for (const [bx, tx, ty] of [
    [4, 8, 4.6],
    [7.5, 11.5, 4.8],
    [11, 14, 3.4],
  ]) {
    ctx.moveTo(bx, 0);
    ctx.quadraticCurveTo((bx + tx) / 2, ty * 0.3, tx, ty);
    ctx.moveTo(bx, 0);
    ctx.quadraticCurveTo((bx + tx) / 2, -ty * 0.3, tx, -ty);
  }
  ctx.stroke();
  ctx.restore();
}

// ── the glass ───────────────────────────────────────────────────────────────

// the glass front: the window mirrored in it as a soft band, a green edge
// as thick glass has, fine mist near the top where the soil is warm, and a
// line of light along its top edge
function paintGlass(ctx, L) {
  const { glass, H, S } = L;
  const { x0, x1, y0, y1 } = glass;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  const band = ctx.createLinearGradient(x0, y0, x0 + (x1 - x0) * 0.6, y1);
  band.addColorStop(0, "rgba(255,245,225,0)");
  band.addColorStop(0.18, "rgba(255,245,225,0.09)");
  band.addColorStop(0.3, "rgba(255,245,225,0.02)");
  band.addColorStop(0.38, "rgba(255,245,225,0.06)");
  band.addColorStop(0.5, "rgba(255,245,225,0)");
  ctx.fillStyle = band;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // mist on the inside near the top, where the soil is warm
  const mist = ctx.createLinearGradient(0, y0, 0, y0 + H * 0.15);
  mist.addColorStop(0, "rgba(220,228,222,0.1)");
  mist.addColorStop(1, "rgba(220,228,222,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(x0, y0, x1 - x0, H * 0.15);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(120,160,140,0.22)";
  ctx.lineWidth = S * 0.006;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // and in the mist, beads: each a dark rim and a point of light
  const rnd = lcg(909);
  const k = S / 700;
  for (let i = 0; i < 320; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const t = Math.pow(rnd(), 1.8);
    const y = y0 + H * 0.028 + t * H * 0.14;
    const r = (0.6 + rnd() * 2.2) * (1 - t * 0.6) * k;
    ctx.fillStyle = "rgba(20,14,8,0.25)";
    ctx.beginPath();
    ctx.arc(x, y + r * 0.2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,250,236,0.5)";
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // where a thumb has held it
  softEllipse(
    ctx,
    x0 + (x1 - x0) * 0.86,
    y1 - H * 0.07,
    S * 0.04,
    S * 0.03,
    "255,250,240",
    0.05,
    "screen",
  );
  ctx.restore();
  // the top edge of the pane, ground smooth, catching the light
  ctx.fillStyle = "rgba(150,190,170,0.55)";
  ctx.fillRect(x0, y0 - 1, x1 - x0, 2.5);
  ctx.fillStyle = "rgba(255,250,235,0.75)";
  ctx.fillRect(x0, y0 - 1, x1 - x0, 1);
}

// ── the writing ─────────────────────────────────────────────────────────────
// Capital letters as the strokes a hand makes, in a box about 1 wide and 1
// tall, y down: as much of the alphabet as this box needs.

const arc = (cx, cy, rx, ry, a0, a1, n = 12) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy - Math.sin(a) * ry]);
  }
  return pts;
};
const GLYPHS = {
  A: {
    w: 0.86,
    s: [
      [
        [0, 1],
        [0.43, 0],
        [0.86, 1],
      ],
      [
        [0.18, 0.62],
        [0.68, 0.62],
      ],
    ],
  },
  B: {
    w: 0.72,
    s: [
      [[0, 1], [0, 0], ...arc(0.4, 0.24, 0.3, 0.24, 90, -90, 10), [0, 0.48]],
      [[0.4, 0.48], ...arc(0.4, 0.74, 0.32, 0.26, 90, -90, 10), [0, 1]],
    ],
  },
  C: { w: 0.8, s: [arc(0.5, 0.5, 0.48, 0.5, 45, 315, 16)] },
  D: {
    w: 0.78,
    s: [
      [
        [0, 0],
        [0, 1],
      ],
      [[0, 0], [0.3, 0], ...arc(0.3, 0.5, 0.46, 0.5, 90, -90, 14), [0, 1]],
    ],
  },
  E: {
    w: 0.66,
    s: [
      [
        [0.66, 0],
        [0, 0],
        [0, 1],
        [0.66, 1],
      ],
      [
        [0, 0.5],
        [0.5, 0.5],
      ],
    ],
  },
  F: {
    w: 0.62,
    s: [
      [
        [0.62, 0],
        [0, 0],
        [0, 1],
      ],
      [
        [0, 0.48],
        [0.48, 0.48],
      ],
    ],
  },
  G: {
    w: 0.84,
    s: [[...arc(0.48, 0.5, 0.48, 0.5, 40, 330, 16), [0.9, 0.56], [0.52, 0.56]]],
  },
  H: {
    w: 0.76,
    s: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0.76, 0],
        [0.76, 1],
      ],
      [
        [0, 0.5],
        [0.76, 0.5],
      ],
    ],
  },
  L: {
    w: 0.6,
    s: [
      [
        [0, 0],
        [0, 1],
        [0.6, 1],
      ],
    ],
  },
  R: {
    w: 0.74,
    s: [
      [[0, 1], [0, 0], ...arc(0.36, 0.25, 0.34, 0.25, 90, -90, 10), [0, 0.5]],
      [
        [0.34, 0.5],
        [0.74, 1],
      ],
    ],
  },
  S: {
    w: 0.7,
    s: [
      [
        ...arc(0.36, 0.26, 0.33, 0.25, 20, 270, 12),
        ...arc(0.34, 0.74, 0.35, 0.26, 90, -160, 12),
      ],
    ],
  },
  T: {
    w: 0.78,
    s: [
      [
        [0, 0],
        [0.78, 0],
      ],
      [
        [0.39, 0],
        [0.39, 1],
      ],
    ],
  },
};

// a word written by hand, centred on (x, y), its capitals `h` tall: `pen` is
// "grease" (white wax on glass) or "marker" (black ink on tape)
function writeWord(ctx, word, x, y, h, pen, rnd, gap = 0.28) {
  const letters = [...word];
  const widths = letters.map((ch) => (GLYPHS[ch] ? GLYPHS[ch].w : 0.5));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  let cx = x - (total * h) / 2;
  const top = y - h / 2;
  const slant = pen === "grease" ? 0.08 : 0.04;
  letters.forEach((ch, i) => {
    const gl = GLYPHS[ch];
    if (gl) {
      const jit = () => (rnd() - 0.5) * h * 0.03;
      for (const stroke of gl.s) {
        const pts = stroke.map(([px, py]) => [
          cx + px * h + (1 - py) * h * slant + jit(),
          top + py * h + jit(),
        ]);
        const draw = (w, style, dx = 0, dy = 0) => {
          ctx.strokeStyle = style;
          ctx.lineWidth = w;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          pts.forEach(([qx, qy], k) =>
            k ? ctx.lineTo(qx + dx, qy + dy) : ctx.moveTo(qx + dx, qy + dy),
          );
          ctx.stroke();
        };
        if (pen === "grease") {
          // wax on glass: a chalky body round a denser core, the soil dark
          // behind it
          draw(h * 0.15, "rgba(0,0,0,0.25)", h * 0.02, h * 0.03);
          draw(h * 0.14, "rgba(232,228,214,0.55)");
          draw(h * 0.08, "rgba(248,246,236,0.85)", -h * 0.01, 0);
        } else {
          draw(h * 0.16, "rgba(20,16,12,0.15)");
          draw(h * 0.13, "rgba(20,16,12,0.92)");
        }
      }
    }
    cx += (widths[i] + gap) * h;
  });
}

// START where the root begins, with an arrow to it; under each tip its
// letter
function paintWriting(ctx, L) {
  const { S, start, tips, letterY, hand } = L;
  const rnd = lcg(5151);
  writeWord(
    ctx,
    "",
    start.x - S * 0.12,
    start.y + S * 0.035,
    hand * 0.8,
    "grease",
    rnd,
    0.3,
  );
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(240,236,224,0.7)";
  ctx.lineWidth = hand * 0.09;
  const ax = start.x - S * 0.055;
  const ay = start.y + S * 0.03;
  const bx = start.x - S * 0.013;
  const by = start.y + S * 0.01;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + S * 0.022, ay - S * 0.004, bx, by);
  ctx.moveTo(bx - hand * 0.32, by - hand * 0.02);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx - hand * 0.12, by + hand * 0.3);
  ctx.stroke();
  tips.forEach((p, i) =>
    writeWord(ctx, BINARY_LEAVES[i], p.x, letterY, hand * 1.25, "grease", rnd),
  );
}

// ── the frame ───────────────────────────────────────────────────────────────

// oak: the corner posts the glass slides into and the bottom rail it stands
// in, the morning light on the left post and along the tops of things, brass
// screws. The box stands a little above eye level, so of its top only the
// posts' ends and the glass's edge are seen.
function paintFrame(ctx, L) {
  const { frame, glass, post, top, base, shelf } = L;
  const rnd = lcg(4040);
  // the glass sits in grooves: the posts' shadows on it
  const shadow = (x, w) => {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x, x + w), top, Math.abs(w), base - top);
  };
  shadow(glass.x0, post * 0.6);
  shadow(glass.x1, -post * 0.35);
  board(ctx, rnd, frame.x0, top, post, shelf - top, true, 1);
  board(ctx, rnd, frame.x1 - post, top, post, shelf - top, true, 0.35);
  board(
    ctx,
    rnd,
    glass.x0,
    base,
    glass.x1 - glass.x0,
    shelf - base,
    false,
    0.8,
  );
  // the posts' ends: a worn, lighter arris along the top
  ctx.fillStyle = "rgba(255,228,186,0.45)";
  ctx.fillRect(frame.x0, top, post, 1.2);
  ctx.fillStyle = "rgba(255,228,186,0.2)";
  ctx.fillRect(frame.x1 - post, top, post, 1.2);
  // the rail's top edge: a line of light, the groove dark above it
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(glass.x0, base - 1.5, glass.x1 - glass.x0, 2);
  ctx.fillStyle = "rgba(255,226,180,0.4)";
  ctx.fillRect(glass.x0, base + 0.5, glass.x1 - glass.x0, 1.2);
  // the joints between rail and posts, and each post's outer edge
  ctx.fillStyle = "rgba(20,12,6,0.6)";
  ctx.fillRect(glass.x0 - 0.5, base, 1.2, shelf - base);
  ctx.fillRect(glass.x1 - 0.7, base, 1.2, shelf - base);
  ctx.fillStyle = "rgba(255,230,190,0.35)";
  ctx.fillRect(frame.x0, top, 1, shelf - top);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(frame.x1 - 1, top, 1, shelf - top);
  // brass screws, two to each post
  for (const [sx, sy] of [
    [frame.x0 + post * 0.5, top + post * 0.9],
    [frame.x1 - post * 0.5, top + post * 0.9],
    [frame.x0 + post * 0.5, (base + shelf) / 2],
    [frame.x1 - post * 0.5, (base + shelf) / 2],
  ]) {
    screw(ctx, sx, sy, post * 0.16, rnd);
  }
}

// a length of oak, its grain along it; `light` 0..1, from the shaded side to
// the one the sun is on
function board(ctx, rnd, x, y, w, h, vertical, light) {
  const mix = (a, b) =>
    `rgb(${a.map((v, i) => Math.round(b[i] + (v - b[i]) * light)).join(",")})`;
  const g = vertical
    ? ctx.createLinearGradient(x, 0, x + w, 0)
    : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, mix([206, 160, 108], [118, 86, 56]));
  g.addColorStop(0.2, mix([164, 118, 74], [94, 66, 42]));
  g.addColorStop(0.8, mix([118, 82, 48], [70, 48, 28]));
  g.addColorStop(1, "#2e1d0f");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.lineWidth = 0.9;
  const n = Math.round((vertical ? w : h) / 2.2);
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle =
      rnd() < 0.55 ? "rgba(40,24,10,0.28)" : "rgba(255,220,170,0.08)";
    ctx.beginPath();
    if (vertical) {
      const gx = x + ((i + 0.5) * w) / n;
      ctx.moveTo(gx, y);
      ctx.bezierCurveTo(
        gx + (rnd() - 0.5) * 4,
        y + h * 0.3,
        gx + (rnd() - 0.5) * 4,
        y + h * 0.7,
        gx,
        y + h,
      );
    } else {
      const gy = y + ((i + 0.5) * h) / n;
      ctx.moveTo(x, gy);
      ctx.bezierCurveTo(
        x + w * 0.3,
        gy + (rnd() - 0.5) * 3,
        x + w * 0.7,
        gy + (rnd() - 0.5) * 3,
        x + w,
        gy,
      );
    }
    ctx.stroke();
  }
  // a few darker streaks in the grain
  for (let i = 0; i < 3; i++) {
    const along = vertical ? h : w;
    const at = rnd() * along;
    const len = along * (0.08 + rnd() * 0.15);
    const across = (0.2 + rnd() * 0.6) * (vertical ? w : h);
    if (vertical)
      softEllipse(ctx, x + across, y + at, 1.5, len, "40,22,8", 0.25);
    else softEllipse(ctx, x + at, y + across, len, 1.5, "40,22,8", 0.25);
  }
  ctx.restore();
}

function screw(ctx, x, y, r, rnd) {
  softEllipse(ctx, x + r * 0.3, y + r * 0.4, r * 1.5, r * 1.5, "0,0,0", 0.45);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, "#f2d890");
  g.addColorStop(0.6, "#b08a3a");
  g.addColorStop(1, "#5a4418");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const a = rnd() * Math.PI;
  ctx.strokeStyle = "rgba(40,28,8,0.85)";
  ctx.lineWidth = Math.max(0.8, r * 0.25);
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(a) * r * 0.7, y - Math.sin(a) * r * 0.7);
  ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
  ctx.stroke();
}

// masking tape across the bottom rail, torn at both ends, the seven routes
// written on it in marker
function paintTape(ctx, L) {
  const { tape, S } = L;
  const rnd = lcg(7373);
  const x0 = tape.x - tape.w / 2;
  const x1 = tape.x + tape.w / 2;
  const y0 = tape.y - tape.h / 2;
  const y1 = tape.y + tape.h / 2;
  const torn = (x, dir) => {
    const pts = [];
    for (let i = 0; i <= 8; i++)
      pts.push([x + dir * (rnd() * 4 - 1), y0 + ((y1 - y0) * i) / 8]);
    return pts;
  };
  const left = torn(x0, 1);
  const right = torn(x1, -1);
  const p = new Path2D();
  left.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  for (let i = right.length - 1; i >= 0; i--)
    p.lineTo(right[i][0], right[i][1]);
  p.closePath();
  // its shadow on the wood, then the tape, a touch translucent
  ctx.save();
  ctx.translate(1.5, 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill(p);
  ctx.restore();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#e8dab6");
  g.addColorStop(1, "#cbb88e");
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.clip(p);
  // the crepe of the paper
  ctx.strokeStyle = "rgba(120,100,60,0.12)";
  ctx.lineWidth = 0.8;
  for (let x = x0; x < x1; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x + 1, y1);
    ctx.stroke();
  }
  softEllipse(
    ctx,
    x0 + tape.w * 0.25,
    y0,
    tape.w * 0.3,
    tape.h * 0.6,
    "255,250,235",
    0.25,
    "screen",
  );
  // the routes, in marker
  const h = Math.min(tape.h * 0.52, S * 0.028);
  const cell = (tape.w * 0.94) / BINARY_PATHS.length;
  BINARY_PATHS.forEach((code, i) => {
    writeWord(
      ctx,
      code,
      x0 + tape.w * 0.03 + cell * (i + 0.5),
      tape.y + h * 0.04,
      h,
      "marker",
      rnd,
      0.22,
    );
  });
  ctx.restore();
}

// the morning sun across the front of the box: warm on the left, where the
// window is, the far end a little in shade
function paintDaylight(ctx, L) {
  const { W, H, frame } = L;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const g = ctx.createLinearGradient(frame.x0, 0, frame.x1, 0);
  g.addColorStop(0, "rgba(255,200,130,0.1)");
  g.addColorStop(0.4, "rgba(255,200,130,0)");
  g.addColorStop(0.7, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── what moves in the light ─────────────────────────────────────────────────

// the shadows of leaves outside the window, for the scene to stir about in
// the patch of sun: soft dark leaf-shapes in loose sprays. Painted at half
// size over the patch's reach and drawn back up.
function paintDapple(L) {
  const { H, u, sun } = L;
  const m = 40 * u;
  const xs = sun.map((p) => p[0]);
  const ys = sun.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs)) - m;
  const y0 = Math.max(0, Math.min(...ys)) - m;
  const x1 = Math.max(...xs) + m;
  const y1 = Math.min(H, Math.max(...ys)) + m;
  const R = 0.5;
  const c = makeCanvas((x1 - x0) * R, (y1 - y0) * R);
  const ctx = c.getContext("2d");
  ctx.scale(R, R);
  const rnd = lcg(2468);
  for (let i = 0; i < 11; i++) {
    const cx = rnd() * (x1 - x0);
    const cy = rnd() * Math.min(y1 - y0, H * 0.3);
    const n = 5 + Math.floor(rnd() * 8);
    for (let j = 0; j < n; j++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * 34 * u;
      const len = (7 + rnd() * 8) * u;
      softEllipse(
        ctx,
        cx + Math.cos(a) * d,
        cy + Math.sin(a) * d * 0.7,
        len,
        len * 0.45,
        "34,24,14",
        0.34 + rnd() * 0.22,
        "source-over",
        rnd() * Math.PI,
      );
    }
  }
  return { canvas: c, at: { x: x0, y: y0, scale: 1 / R } };
}

// a drop of water on the glass, at four times the size it is drawn: a lens
// with a dark rim, the window's light bent into a crescent low on its right
// and caught as a bright point high on its left
function paintDrop() {
  const w = 24;
  const h = 32;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const cx = w / 2;
  const cy = h * 0.6;
  const rx = w * 0.34;
  const ry = h * 0.32;
  const body = g.createRadialGradient(cx, cy + ry * 0.2, 0, cx, cy, rx * 1.05);
  body.addColorStop(0, "rgba(255,245,225,0.14)");
  body.addColorStop(0.8, "rgba(255,245,225,0.05)");
  body.addColorStop(1, "rgba(255,245,225,0)");
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(8,5,2,0.5)";
  g.lineWidth = 2.2;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.95, Math.PI * 2.05);
  g.stroke();
  g.lineWidth = 1.2;
  g.strokeStyle = "rgba(8,5,2,0.3)";
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.05, Math.PI * 0.95);
  g.stroke();
  g.strokeStyle = "rgba(255,238,210,0.55)";
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, Math.PI * 0.05, Math.PI * 0.6);
  g.stroke();
  g.fillStyle = "rgba(255,255,250,0.95)";
  g.beginPath();
  g.ellipse(cx - rx * 0.38, cy - ry * 0.42, 2.2, 1.8, -0.5, 0, Math.PI * 2);
  g.fill();
  return c;
}

function paintVeil(L) {
  const { W, H, S } = L;
  const c = makeCanvas(W / 4, H / 4);
  const ctx = c.getContext("2d");
  ctx.scale(c.width / W, c.height / H);
  const v = ctx.createRadialGradient(
    W * 0.42,
    H * 0.42,
    S * 0.35,
    W / 2,
    H / 2,
    Math.hypot(W, H) * 0.62,
  );
  v.addColorStop(0, "rgba(10,6,2,0)");
  v.addColorStop(1, "rgba(10,6,2,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function softEllipse(ctx, cx, cy, rx, ry, rgb, a, op = "source-over", rot = 0) {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.45, `rgba(${rgb},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

const smoothstep = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// value noise, w × h, summed over octaves given as [cell size in px, weight]
function fractalNoise(w, h, octaves, rnd) {
  const out = new Float32Array(w * h);
  for (const [cell, weight] of octaves) {
    const gw = Math.ceil(w / cell) + 2;
    const gh = Math.ceil(h / cell) + 2;
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    for (let y = 0; y < h; y++) {
      const gy = y / cell;
      const iy = Math.floor(gy);
      let fy = gy - iy;
      fy = fy * fy * (3 - 2 * fy);
      const r0 = iy * gw;
      const r1 = r0 + gw;
      for (let x = 0; x < w; x++) {
        const gx = x / cell;
        const ix = Math.floor(gx);
        let fx = gx - ix;
        fx = fx * fx * (3 - 2 * fx);
        const a = grid[r0 + ix];
        const b = grid[r0 + ix + 1];
        const c = grid[r1 + ix];
        const d = grid[r1 + ix + 1];
        out[y * w + x] +=
          weight *
          (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
      }
    }
  }
  return out;
}

let NOISE = null;
function grain(ctx, W, H, alpha, op = "source-over") {
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
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = ctx.createPattern(NOISE, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

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
  textures.addCanvas(key, canvas);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
