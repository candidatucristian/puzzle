/** The meadow for WIRES, painted as a real morning rather than a sketch: the
 *  minute before sunrise on a country hill. The sky climbs from the last deep
 *  blue, where a few stars and a thin moon are still out, down through rose
 *  into the gold glowing behind the hills. Against it stands the pole with
 *  its five wires, dark and fine the way wires look at dawn; the hills and
 *  the trees on their crest are backlit, each with a thin rim of light. In
 *  front, a farmhouse with its window still lit and a lantern burning on the
 *  side porch, the flag on the porch post, a split-rail fence.
 *
 *  Painted once per screen size: the sky onto one canvas, the land — hills,
 *  trees, pole, wires, house — onto another, a vignette onto a third. What
 *  lives stays out of the painting: the scene puts the birds on the wires
 *  (`wireY`), rocks the old man in his chair (`chair`, rocking on rockers of
 *  radius ROCK_R), breathes the lantern (`lantern`), lets smoke off the
 *  chimney (`chimney`), sends up the notes and twinkles the stars. */

// the rockers are an arc of this radius, so the chair rolls on the floor
// instead of sinking into it — the scene's rocking maths uses the same number
export const ROCK_R = 130;

const SKY = "wi_sky";
const LAND = "wi_land";
const VEIL = "wi_veil";
const CHAIR = "wi_chair";
const GLOW = "wi_glow";
const STAR = "wi_star";
const PUFF = "wi_puff";
const BODY = "wi_bird_body_";
const HEAD = "wi_bird_head_";
const NOTE = "wi_note_";

// the hill, in the manner of the "Bliss" wallpaper: alternating crests and
// hollows (x, y as fractions of the screen), smoothstepped between
const HILLS = [
  [0.0, 0.66],
  [0.09, 0.622],
  [0.2, 0.688],
  [0.32, 0.628],
  [0.42, 0.67],
  [0.52, 0.598], // the hump the pole stands on
  [0.64, 0.682],
  [0.76, 0.614],
  [0.88, 0.684],
  [1.0, 0.636],
];

// trees and bushes along the crest (h = height, as a fraction of the screen)
const TREES = [
  { x: 0.285, type: "round", h: 0.07 },
  { x: 0.325, type: "bush", h: 0.022 },
  { x: 0.42, type: "bush", h: 0.026 },
  { x: 0.6, type: "bush", h: 0.02 },
  { x: 0.665, type: "round", h: 0.082 },
  { x: 0.695, type: "round", h: 0.058 },
  { x: 0.785, type: "pine", h: 0.095 },
  { x: 0.81, type: "pine", h: 0.07 },
  { x: 0.88, type: "bush", h: 0.028 },
  { x: 0.945, type: "round", h: 0.075 },
];

// the porch lantern, in the house's own units, hanging from the porch beam
const LANTERN = { x: 298, y: 136 };

// ── layout: where everything is, shared with the scene ──────────────────────

export function layoutMeadow(W, H) {
  const S = Math.min(W, H);
  const k = Math.max(0.8, Math.min(1.4, S / 800));

  const hillY = (x) => {
    const t = x / W;
    if (t <= HILLS[0][0]) return HILLS[0][1] * H;
    for (let i = 0; i < HILLS.length - 1; i++) {
      const [x0, y0] = HILLS[i];
      const [x1, y1] = HILLS[i + 1];
      if (t <= x1) {
        const u = (t - x0) / (x1 - x0);
        return (y0 + (y1 - y0) * u * u * (3 - 2 * u)) * H;
      }
    }
    return HILLS[HILLS.length - 1][1] * H;
  };

  // the five wires, bottom (0) to top (4): close together on the pole,
  // spreading as they run out toward the edges, sagging a little
  const pole = {
    x: W * 0.52,
    top: H * 0.13,
    yTop: H * 0.155,
    sp: H * 0.009,
    leftTop: H * 0.125,
    rightTop: H * 0.17,
    spEdge: H * 0.03,
  };
  pole.bottom = hillY(pole.x) + 2;
  const wireY = (w, x) => {
    const yPole = pole.yTop + (4 - w) * pole.sp;
    let yEdge;
    let t;
    if (x <= pole.x) {
      yEdge = pole.leftTop + (4 - w) * pole.spEdge;
      t = x / pole.x;
    } else {
      yEdge = pole.rightTop + (4 - w) * pole.spEdge;
      t = (W - x) / (W - pole.x);
    }
    return yEdge + (yPole - yEdge) * t + Math.sin(Math.PI * (1 - t)) * 2.5;
  };

  // the house, drawn in its own units and placed bottom-left
  const s = Math.min(W / 980, H / 700) * 1.05;
  const house = { x: W * 0.02, y: H * 0.98 - 265 * s, s };
  const inHouse = (lx, ly) => ({ x: house.x + lx * s, y: house.y + ly * s });

  // the rocking chair sits on the porch floor, under the porch roof
  const chairScale = s * 0.57;
  const chair = {
    scale: chairScale,
    baseX: house.x + 345 * s,
    baseY: house.y + 242 * s - 4 * chairScale,
    sceneScale: s,
  };

  // the sky's gold line sits at the crest of the hill, where it shows
  const horizonY = H * 0.62;
  return {
    W,
    H,
    S,
    k,
    s,
    hillY,
    pole,
    wireY,
    house,
    chair,
    lantern: { ...inHouse(LANTERN.x, LANTERN.y), r: 26 * s },
    chimney: { ...inHouse(211, 20), k: s },
    horizonY,
    sun: { x: W * 0.74, y: horizonY + H * 0.02 },
    moon: { x: W * 0.78, y: H * 0.085, r: S * 0.014 },
    birdScale: Math.max(0.9, Math.min(1.35, S / 800)),
  };
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintMeadow(scene, W, H) {
  const L = layoutMeadow(W, H);
  const t = scene.textures;
  addCanvas(t, SKY, paintSky(L));
  addCanvas(t, LAND, paintLand(L));
  addCanvas(t, VEIL, paintVeil(L));

  const chair = paintChair(L);
  addCanvas(t, CHAIR, chair.canvas);

  const birds = {};
  for (const d of [1, -1]) {
    const b = paintBird(L.birdScale, d);
    addCanvas(t, BODY + d, b.body.canvas);
    addCanvas(t, HEAD + d, b.head.canvas);
    birds[d] = {
      body: { key: BODY + d, ox: b.body.ox, oy: b.body.oy },
      head: { key: HEAD + d, ox: b.head.ox, oy: b.head.oy },
      res: b.res,
    };
  }

  const notes = [];
  for (const v of [0, 1]) {
    const n = paintNote(v);
    addCanvas(t, NOTE + v, n.canvas);
    notes.push({ key: NOTE + v, ox: n.ox, oy: n.oy, res: n.res });
  }

  addCanvas(
    t,
    GLOW,
    radial(128, "255,188,108", [
      [0, 0.9],
      [0.18, 0.5],
      [0.5, 0.14],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    STAR,
    radial(16, "236,240,255", [
      [0, 1],
      [0.3, 0.4],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    PUFF,
    radial(64, "190,184,204", [
      [0, 0.5],
      [0.5, 0.2],
      [1, 0],
    ]),
  );

  return {
    L,
    sky: SKY,
    land: LAND,
    veil: VEIL,
    chair: {
      key: CHAIR,
      ox: chair.ox,
      oy: chair.oy,
      res: chair.res,
      ...L.chair,
      // where the notes leave the harmonica, in the chair's own units
      tip: { x: 14, y: -116 },
    },
    birds,
    notes,
    glow: GLOW,
    star: STAR,
    puff: PUFF,
  };
}

export function releaseMeadowArt(textures) {
  const keys = [SKY, LAND, VEIL, CHAIR, GLOW, STAR, PUFF];
  for (const d of [1, -1]) keys.push(BODY + d, HEAD + d);
  keys.push(NOTE + 0, NOTE + 1);
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

// ── the sky ─────────────────────────────────────────────────────────────────

function paintSky(L) {
  const { W, H, horizonY, sun } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  // from the last of the night overhead down to the gold behind the hills;
  // already a clear mid-blue where the wires run, so they read against it
  const g = ctx.createLinearGradient(0, 0, 0, horizonY);
  for (const [o, col] of [
    [0, "#0e1735"],
    [0.1, "#1c2a56"],
    [0.26, "#3a4f87"],
    [0.45, "#6e79a6"],
    [0.62, "#b18a9b"],
    [0.78, "#e2a07f"],
    [0.92, "#f5c48e"],
    [1, "#fbe0a8"],
  ])
    g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // the sun, still below the hills, lighting the sky from underneath; the
  // far side of the sky stays cooler
  softEllipse(ctx, sun.x, sun.y, W * 0.6, H * 0.44, "255,196,140", 0.45, "screen");
  softEllipse(ctx, sun.x, sun.y, W * 0.24, H * 0.12, "255,238,196", 0.8, "screen");
  softEllipse(ctx, 0, horizonY, W * 0.5, H * 0.32, "80,84,150", 0.22);

  paintClouds(ctx, L, lcg(3101));
  paintMoon(ctx, L);
  grain(ctx, W, H, 0.035);
  return c;
}

// thin high clouds, lit from beneath by a sun they can see and we can't —
// kept well below the wires, so nothing in the sky can be taken for a bird
function paintClouds(ctx, L, rnd) {
  const { W, H, sun } = L;
  for (let i = 0; i < 7; i++) {
    const cx = W * (0.05 + rnd() * 0.9);
    const cy = H * (0.36 + rnd() * 0.15);
    const len = W * (0.12 + rnd() * 0.22);
    const th = H * (0.007 + rnd() * 0.011);
    const warm = Math.exp(-(((cx - sun.x) / (W * 0.4)) ** 2));
    for (let j = 0; j < 7; j++) {
      const u = j / 6 - 0.5;
      const px = cx + u * len;
      const py = cy + Math.sin(u * 3 + i) * th * 0.6;
      const rx = len * (0.18 + rnd() * 0.12);
      softEllipse(ctx, px, py, rx, th * 1.6, "86,74,112", 0.22);
      softEllipse(
        ctx,
        px,
        py + th * 0.7,
        rx * 0.85,
        th * 0.9,
        "255,176,146",
        0.18 + warm * 0.35,
        "screen",
      );
    }
  }
}

// a waning crescent, lit on the side toward the sun, with the rest of the
// disc just visible in earthshine
function paintMoon(ctx, L) {
  const { moon, sun } = L;
  const r = moon.r;
  const size = Math.ceil(r * 6);
  const m = makeCanvas(size, size);
  const g = m.getContext("2d");
  const c = size / 2;
  g.fillStyle = "rgba(170,178,215,0.16)";
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.fill();
  const lit = makeCanvas(size, size);
  const lg = lit.getContext("2d");
  lg.fillStyle = "#fff3dc";
  lg.beginPath();
  lg.arc(c, c, r, 0, Math.PI * 2);
  lg.fill();
  // carve the shadow away from the side facing the sun
  const ang = Math.atan2(sun.y - moon.y, sun.x - moon.x);
  lg.globalCompositeOperation = "destination-out";
  lg.beginPath();
  lg.arc(c - Math.cos(ang) * r * 0.42, c - Math.sin(ang) * r * 0.42, r * 0.98, 0, Math.PI * 2);
  lg.fill();
  g.drawImage(lit, 0, 0);
  softEllipse(ctx, moon.x, moon.y, r * 4, r * 4, "220,226,255", 0.16, "screen");
  ctx.drawImage(m, moon.x - c, moon.y - c);
}

// ── the land ────────────────────────────────────────────────────────────────

function paintLand(L) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintFarRidge(ctx, L);
  paintHill(ctx, L, lcg(6446));
  paintTrees(ctx, L);
  paintPole(ctx, L);
  paintWires(ctx, L);
  paintHouse(ctx, L, lcg(9229));
  grain(ctx, W, H, 0.04, true);
  return c;
}

// a farther ridge, hazy and violet, showing in the hollows of the hill
function paintFarRidge(ctx, L) {
  const { W, H, sun } = L;
  const ridge = (x) =>
    H * 0.655 -
    H *
      (0.012 +
        0.008 * Math.sin((x / W) * 6.2 + 0.8) +
        0.005 * Math.sin((x / W) * 14.3 + 2.1));
  ctx.beginPath();
  ctx.moveTo(-10, H);
  for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, ridge(x));
  ctx.lineTo(W + 10, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#433f5e");
  g.addColorStop(sun.x / W, "#7c6173");
  g.addColorStop(1, "#56506c");
  ctx.fillStyle = g;
  ctx.fill();
  // the gold just catching its top, strongest over the sun
  ctx.lineWidth = Math.max(1, L.k);
  for (let x = -10; x <= W; x += 6) {
    const a = 0.5 * Math.exp(-(((x - sun.x) / (W * 0.25)) ** 2));
    if (a < 0.02) continue;
    ctx.strokeStyle = `rgba(255,214,160,${a})`;
    line(ctx, x, ridge(x), x + 6, ridge(x + 6));
  }
}

function paintHill(ctx, L, rnd) {
  const { W, H, hillY, sun, k } = L;
  const crest = [];
  for (let x = -12; x <= W + 12; x += 4) crest.push({ x, y: hillY(x) });

  ctx.beginPath();
  crest.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.lineTo(W + 12, H + 12);
  ctx.lineTo(-12, H + 12);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, H * 0.59, 0, H);
  g.addColorStop(0, "#243330");
  g.addColorStop(0.35, "#172320");
  g.addColorStop(1, "#0a100f");
  ctx.fillStyle = g;
  ctx.fill();

  // the grass: a faint mottle, darker in the hollows
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W;
    const y = hillY(x) + rnd() * (H - hillY(x));
    softEllipse(ctx, x, y, 12 + rnd() * 30, 4 + rnd() * 8, rnd() < 0.5 ? "0,0,0" : "70,96,80", 0.12);
  }
  ctx.restore();

  // backlit: a hairline of gold along the crest, brightest toward the sun
  for (let i = 1; i < crest.length; i++) {
    const a = crest[i - 1];
    const b = crest[i];
    const lit = 0.12 + 0.6 * Math.exp(-(((a.x - sun.x) / (W * 0.33)) ** 2));
    ctx.strokeStyle = `rgba(255,206,150,${lit})`;
    ctx.lineWidth = 1.3 * k;
    line(ctx, a.x, a.y + 0.5, b.x, b.y + 0.5);
    ctx.strokeStyle = `rgba(255,190,130,${lit * 0.18})`;
    ctx.lineWidth = 5 * k;
    line(ctx, a.x, a.y + 2, b.x, b.y + 2);
  }

  // a few tufts standing up against the light
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W;
    const y = hillY(x) + 1;
    const h = (3 + rnd() * 6) * k;
    const lean = (rnd() - 0.5) * 4 * k;
    ctx.strokeStyle = "#0c1412";
    ctx.lineWidth = Math.max(0.8, 0.9 * k);
    line(ctx, x, y, x + lean, y - h);
  }
}

function paintTrees(ctx, L) {
  const { W, H, hillY, sun, k } = L;
  for (const tr of TREES) {
    const x = tr.x * W;
    const base = hillY(x) + 2;
    const h = tr.h * H;
    // the lit edge faces the sun
    const dir = Math.sign(sun.x - x) || 1;
    const seed = lcg(1 + Math.round(tr.x * 1000));
    // a crown is a solid core under many small clumps of leaves, so its edge
    // is ragged the way foliage is — and the rim light catches every clump
    const clumps = (cx, cy, rx, ry, n, rMin, rMax) => {
      const out = [{ x: cx, y: cy, r: Math.min(rx, ry) * 0.8 }];
      for (let i = 0; i < n; i++) {
        const a = seed() * Math.PI * 2;
        const d = 0.55 + seed() * 0.45;
        out.push({
          x: cx + Math.cos(a) * rx * d,
          y: cy + Math.sin(a) * ry * d,
          r: h * (rMin + seed() * (rMax - rMin)),
        });
      }
      return out;
    };
    const circles = (g, list) => {
      for (const b of list) {
        g.moveTo(b.x + b.r, b.y);
        g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      }
    };
    let shape;
    if (tr.type === "round") {
      const crown = clumps(x, base - h * 0.64, h * 0.3, h * 0.27, 30, 0.05, 0.1);
      shape = (g) => {
        // a trunk that forks into the crown
        g.moveTo(x - h * 0.04, base);
        g.lineTo(x - h * 0.025, base - h * 0.42);
        g.lineTo(x - h * 0.12, base - h * 0.58);
        g.lineTo(x - h * 0.09, base - h * 0.6);
        g.lineTo(x, base - h * 0.48);
        g.lineTo(x + h * 0.1, base - h * 0.6);
        g.lineTo(x + h * 0.12, base - h * 0.57);
        g.lineTo(x + h * 0.025, base - h * 0.42);
        g.lineTo(x + h * 0.04, base);
        g.closePath();
        circles(g, crown);
      };
    } else if (tr.type === "pine") {
      shape = (g) => {
        g.rect(x - h * 0.03, base - h * 0.2, h * 0.06, h * 0.2);
        // tiers of drooping, jagged branches
        for (let i = 0; i < 5; i++) {
          const top = base - h * (1 - i * 0.14);
          const bot = base - h * (0.62 - i * 0.11);
          const half = h * (0.1 + i * 0.055);
          const drop = bot - top;
          // the right edge, notch then tip, down to the tier's corner; the
          // left edge is its mirror, walked back up to the top
          const edge = [];
          for (let j = 1; j <= 4; j++) {
            const u = j / 4;
            edge.push([half * u - half * 0.12, drop * u - drop * 0.06]);
            edge.push([half * u, drop * u]);
          }
          g.moveTo(x, top);
          for (const [dx, dy] of edge) g.lineTo(x + dx, top + dy);
          g.lineTo(x, bot - drop * 0.12);
          for (const [dx, dy] of edge.slice().reverse()) g.lineTo(x - dx, top + dy);
          g.closePath();
        }
      };
    } else {
      const bush = clumps(x, base - h * 0.55, h * 1.05, h * 0.55, 18, 0.22, 0.34);
      shape = (g) => circles(g, bush.filter((b) => b.y - b.r < base));
    }
    rimmed(ctx, shape, "#0a100e", "rgba(255,196,142,0.7)", dir * Math.max(1, h * 0.03) * k);
  }
}

// the pole: weathered wood, the sunrise on its far edge, a crossarm and five
// green-glass insulators where the wires come in
function paintPole(ctx, L) {
  const { pole: P, hillY, k } = L;
  const x = P.x;
  const wT = 6 * k;
  const wB = 10 * k;
  ctx.beginPath();
  ctx.moveTo(x - wT, P.top);
  ctx.lineTo(x + wT, P.top);
  ctx.lineTo(x + wB, P.bottom);
  ctx.lineTo(x - wB, P.bottom);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - wB, 0, x + wB, 0);
  g.addColorStop(0, "#0d0b0a");
  g.addColorStop(0.6, "#1d1813");
  g.addColorStop(0.92, "#4a3527");
  g.addColorStop(1, "#8a6344");
  ctx.fillStyle = g;
  ctx.fill();
  // the grain of the wood, and the steps up it
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) {
    const u = i / 4 - 0.5;
    line(ctx, x + u * wT * 1.6, P.top, x + u * wB * 1.6, P.bottom);
  }
  for (let i = 0; i < 6; i++) {
    const y = P.top + (P.bottom - P.top) * (0.28 + i * 0.12);
    const side = i % 2 ? 1 : -1;
    ctx.fillStyle = "#15120f";
    ctx.fillRect(x + side * wB * 0.7, y, side * 5 * k, 1.6 * k);
  }

  // crossarm and its brace
  const barY = P.yTop - 8 * k;
  ctx.fillStyle = "#17130f";
  ctx.fillRect(x - 20 * k, barY - 2.5 * k, 40 * k, 5 * k);
  ctx.fillStyle = "rgba(255,200,150,0.35)";
  ctx.fillRect(x - 20 * k, barY - 2.5 * k, 40 * k, Math.max(1, 0.8 * k));
  ctx.strokeStyle = "#17130f";
  ctx.lineWidth = 1.6 * k;
  line(ctx, x - 14 * k, barY + 2 * k, x - 2 * k, barY + 16 * k);
  line(ctx, x + 14 * k, barY + 2 * k, x + 2 * k, barY + 16 * k);

  // grass round its foot, so it stands in the hill rather than on it
  ctx.strokeStyle = "#0c1412";
  ctx.lineWidth = Math.max(0.8, k);
  for (const [ox, lean, len] of [
    [-15, -3, 7],
    [-11, 2, 10],
    [-6, -1, 6],
    [7, 1, 7],
    [11, -2, 10],
    [15, 3, 6],
  ]) {
    const gx = x + ox * k;
    const gy = hillY(gx) + 2.5;
    line(ctx, gx, gy, gx + lean * k, gy - len * k);
  }
}

// the wires: fine and dark against the sky, a hair of sunrise on their
// undersides. The insulators go on after, over the ends of the wires.
function paintWires(ctx, L) {
  const { W, pole: P, wireY, k } = L;
  for (let w = 0; w < 5; w++) {
    for (const [style, width, dy] of [
      ["rgba(255,196,150,0.16)", 0.8, 0.9],
      ["rgba(11,13,21,0.95)", 1.3, 0],
    ]) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = wireY(w, x) + dy * k;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = style;
      ctx.lineWidth = Math.max(0.8, width * k);
      ctx.stroke();
    }
  }
  for (let w = 0; w < 5; w++) {
    const y = P.yTop + (4 - w) * P.sp;
    const ix = P.x + (w % 2 === 0 ? -9 : 9) * k;
    const r = 2.4 * k;
    ctx.fillStyle = "#3f5a4f";
    ctx.beginPath();
    ctx.arc(ix, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(210,240,220,0.55)";
    ctx.beginPath();
    ctx.arc(ix + r * 0.35, y - r * 0.35, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── the house ───────────────────────────────────────────────────────────────

function paintHouse(ctx, L, rnd) {
  const { house } = L;
  ctx.save();
  ctx.translate(house.x, house.y);
  ctx.scale(house.s, house.s);
  paintChimney(ctx);
  paintFacade(ctx);
  paintGable(ctx);
  paintWindow(ctx);
  paintDoor(ctx);
  paintPorch(ctx);
  paintFlag(ctx);
  paintFence(ctx);
  paintForeground(ctx, rnd);
  ctx.restore();
}

function paintChimney(ctx) {
  ctx.fillStyle = "#3a2823";
  ctx.fillRect(199, 22, 24, 50);
  ctx.save();
  ctx.beginPath();
  ctx.rect(199, 22, 24, 50);
  ctx.clip();
  for (let y = 22, row = 0; y < 72; y += 4, row++) {
    ctx.fillStyle = "rgba(170,150,140,0.2)";
    ctx.fillRect(199, y, 24, 0.7);
    for (let x = 199 + (row % 2) * 4; x < 223; x += 8) ctx.fillRect(x, y, 0.7, 4);
  }
  ctx.fillStyle = "rgba(255,184,130,0.32)";
  ctx.fillRect(220, 22, 3, 50);
  ctx.restore();
  ctx.fillStyle = "#1f1b1a";
  ctx.fillRect(196, 19, 30, 5);
}

// clapboard walls: a board to every 8 units, each lap throwing its shadow
function clapboards(ctx, clip, y0, y1) {
  ctx.save();
  ctx.clip(clip);
  for (let y = y0; y < y1; y += 8) {
    const g = ctx.createLinearGradient(0, y, 0, y + 8);
    g.addColorStop(0, "#4d5569");
    g.addColorStop(0.8, "#3b4254");
    g.addColorStop(1, "#262b37");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 300, 8);
  }
  ctx.restore();
}

function paintFacade(ctx) {
  const wall = new Path2D();
  wall.rect(30, 92, 230, 150);
  clapboards(ctx, wall, 92, 242);
  ctx.save();
  ctx.clip(wall);
  // the sky lights the wall from above; it darkens toward the ground
  const g = ctx.createLinearGradient(0, 92, 0, 242);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(30, 92, 230, 150);
  // the lantern warming the corner by the porch
  softEllipse(ctx, 262, 150, 90, 80, "255,170,96", 0.24, "lighter");
  ctx.restore();
  // corner boards and the stone footing
  ctx.fillStyle = "#586074";
  ctx.fillRect(30, 92, 6, 150);
  ctx.fillRect(254, 92, 6, 150);
  ctx.fillStyle = "rgba(255,180,110,0.25)";
  ctx.fillRect(257, 110, 3, 130);
  ctx.fillStyle = "#26282e";
  ctx.fillRect(28, 236, 234, 7);
}

// the front gable, sided like the walls, a round vent under the ridge, and
// the bargeboards along its edges catching the sky
function paintGable(ctx) {
  ctx.fillStyle = "#15171e";
  poly(ctx, [
    [6, 98],
    [141, 12],
    [282, 98],
    [276, 100],
    [141, 18],
    [12, 100],
  ]);
  ctx.fill();
  const face = new Path2D();
  face.moveTo(24, 95);
  face.lineTo(141, 28);
  face.lineTo(264, 95);
  face.closePath();
  clapboards(ctx, face, 24, 96);
  ctx.save();
  ctx.clip(face);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, 300, 100);
  ctx.restore();
  ctx.fillStyle = "#2a303c";
  poly(ctx, [
    [12, 96],
    [141, 18],
    [276, 96],
    [264, 96],
    [141, 29],
    [24, 96],
  ]);
  ctx.fill();
  ctx.strokeStyle = "rgba(205,214,240,0.4)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(10, 97);
  ctx.lineTo(141, 16);
  ctx.lineTo(278, 97);
  ctx.stroke();
  // the vent, dark glass holding a little of the dawn
  ctx.fillStyle = "#586074";
  circle(ctx, 141, 62, 10);
  ctx.fill();
  const v = ctx.createLinearGradient(0, 53, 0, 71);
  v.addColorStop(0, "#1b2442");
  v.addColorStop(1, "#6a6488");
  ctx.fillStyle = v;
  circle(ctx, 141, 62, 7.5);
  ctx.fill();
  ctx.strokeStyle = "#2a2f3a";
  ctx.lineWidth = 1.2;
  line(ctx, 133.5, 62, 148.5, 62);
  line(ctx, 141, 54.5, 141, 69.5);
}

// the front window, the lamp inside still on
function paintWindow(ctx) {
  softEllipse(ctx, 95, 152, 70, 58, "255,186,104", 0.2, "lighter");
  ctx.fillStyle = "#5b6377";
  ctx.fillRect(64, 120, 62, 63);
  const g = ctx.createLinearGradient(0, 125, 0, 179);
  g.addColorStop(0, "#ffe2a4");
  g.addColorStop(1, "#ec9d55");
  ctx.fillStyle = g;
  ctx.fillRect(69, 125, 52, 54);
  // the curtains, drawn back
  ctx.fillStyle = "rgba(255,244,222,0.5)";
  poly(ctx, [
    [69, 125],
    [82, 125],
    [76, 150],
    [80, 179],
    [69, 179],
  ]);
  ctx.fill();
  poly(ctx, [
    [121, 125],
    [108, 125],
    [114, 150],
    [110, 179],
    [121, 179],
  ]);
  ctx.fill();
  softEllipse(ctx, 95, 140, 12, 10, "255,250,230", 0.6);
  ctx.fillStyle = "#34281f";
  ctx.fillRect(93.5, 125, 3, 54);
  ctx.fillRect(69, 150.5, 52, 3);
  ctx.fillStyle = "#6b7488";
  ctx.fillRect(61, 179, 68, 5);
  ctx.fillStyle = "rgba(255,210,150,0.4)";
  ctx.fillRect(61, 179, 68, 1);
  // the shutters
  for (const x of [52, 127]) {
    ctx.fillStyle = "#1f2c32";
    ctx.fillRect(x, 123, 12, 57);
    for (let y = 127; y < 177; y += 5) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x + 1.5, y, 9, 1.2);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x + 1.5, y + 1.2, 9, 0.8);
    }
  }
}

function paintDoor(ctx) {
  ctx.fillStyle = "#586074";
  ctx.fillRect(165, 131, 56, 109);
  const g = ctx.createLinearGradient(170, 0, 216, 0);
  g.addColorStop(0, "#3e211b");
  g.addColorStop(1, "#5a3024");
  ctx.fillStyle = g;
  ctx.fillRect(170, 136, 46, 104);
  for (const [x, y, w, h] of [
    [175, 142, 16, 42],
    [195, 142, 16, 42],
    [175, 192, 16, 42],
    [195, 192, 16, 42],
  ]) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,190,140,0.14)";
    ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillRect(x, y + h - 1, w, 1);
  }
  ctx.fillStyle = "#d9a85a";
  circle(ctx, 206, 189, 2.2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,220,0.9)";
  circle(ctx, 206.7, 188.3, 0.8);
  ctx.fill();
}

// the side porch: a shed roof off the gable wall, its beam and one turned
// post, the lantern hanging in the middle, a boarded floor over a lattice
function paintPorch(ctx) {
  // the roof, and the sky along its top edge
  ctx.fillStyle = "#1c1f28";
  poly(ctx, [
    [254, 90],
    [442, 117],
    [442, 121],
    [254, 121],
  ]);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 5; i++) line(ctx, 254, 90 + i * 5.5, 442, 117 + i * 0.8);
  ctx.strokeStyle = "rgba(210,215,240,0.35)";
  ctx.lineWidth = 1.2;
  line(ctx, 254, 90, 442, 117);

  // the beam, lit from below by the lantern
  const beam = ctx.createLinearGradient(0, 117, 0, 125);
  beam.addColorStop(0, "#3a4150");
  beam.addColorStop(1, "#8a6a4e");
  ctx.fillStyle = beam;
  ctx.fillRect(254, 117, 188, 8);

  // the post
  const post = ctx.createLinearGradient(424, 0, 432, 0);
  post.addColorStop(0, "#c9a07a");
  post.addColorStop(0.45, "#7a8090");
  post.addColorStop(0.85, "#646a79");
  post.addColorStop(1, "#f0c8a0");
  ctx.fillStyle = post;
  ctx.fillRect(424, 125, 8, 112);
  ctx.fillStyle = "#6b7080";
  ctx.fillRect(421, 121, 14, 6);
  ctx.fillRect(421, 235, 14, 7);

  // the floor's front edge and the lattice skirt below it
  const floor = ctx.createLinearGradient(0, 240, 0, 247);
  floor.addColorStop(0, "#6a5240");
  floor.addColorStop(1, "#3a2d24");
  ctx.fillStyle = floor;
  ctx.fillRect(20, 240, 432, 7);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let x = 24; x < 452; x += 12) ctx.fillRect(x, 240, 0.8, 7);
  const skirt = new Path2D();
  skirt.moveTo(21, 247);
  skirt.lineTo(451, 247);
  skirt.lineTo(467, 262);
  skirt.lineTo(15, 262);
  skirt.closePath();
  ctx.fillStyle = "#1a1d24";
  ctx.fill(skirt);
  ctx.save();
  ctx.clip(skirt);
  ctx.strokeStyle = "rgba(96,104,124,0.4)";
  ctx.lineWidth = 1.2;
  for (let x = -20; x < 500; x += 7) {
    line(ctx, x, 247, x + 15, 262);
    line(ctx, x + 15, 247, x, 262);
  }
  ctx.restore();
  ctx.fillStyle = "#3a4150";
  ctx.fillRect(21, 247, 430, 2.5);

  // the lantern's light on everything around it
  softEllipse(ctx, 320, 243, 120, 11, "255,178,98", 0.4, "lighter");
  softEllipse(ctx, LANTERN.x, LANTERN.y, 110, 80, "255,176,96", 0.12, "lighter");
  softEllipse(ctx, 426, 170, 14, 60, "255,180,110", 0.18, "lighter");

  // the lantern itself, on its chain
  ctx.strokeStyle = "#2a2622";
  ctx.lineWidth = 0.9;
  line(ctx, LANTERN.x, 124, LANTERN.x, 129);
  ctx.fillStyle = "#1e1c1b";
  poly(ctx, [
    [LANTERN.x - 6, 129],
    [LANTERN.x + 6, 129],
    [LANTERN.x + 4, 132],
    [LANTERN.x - 4, 132],
  ]);
  ctx.fill();
  const glass = ctx.createLinearGradient(0, 132, 0, 143);
  glass.addColorStop(0, "#fff6d2");
  glass.addColorStop(1, "#ffc46e");
  ctx.fillStyle = glass;
  ctx.fillRect(LANTERN.x - 4, 132, 8, 11);
  ctx.fillStyle = "#1e1c1b";
  ctx.fillRect(LANTERN.x - 0.5, 132, 1, 11);
  ctx.fillRect(LANTERN.x - 5, 143, 10, 2.5);
}

// the flag on the porch post, stirring, the sunrise showing through it
function paintFlag(ctx) {
  const x0 = 433;
  const w = 45;
  const top = (x) => 130 + 2.2 * Math.sin(((x - x0) / w) * Math.PI * 1.6) * ((x - x0) / w);
  const h = 30;
  const outline = new Path2D();
  outline.moveTo(x0, top(x0));
  for (let x = x0; x <= x0 + w; x += 1.5) outline.lineTo(x, top(x));
  for (let x = x0 + w; x >= x0; x -= 1.5) outline.lineTo(x, top(x) + h);
  outline.closePath();

  ctx.save();
  ctx.clip(outline);
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#9b2c2f" : "#dcd4c6";
    ctx.beginPath();
    for (let x = x0; x <= x0 + w; x += 1.5) {
      const y = top(x) + (i * h) / 13;
      if (x === x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = x0 + w; x >= x0; x -= 1.5) ctx.lineTo(x, top(x) + ((i + 1) * h) / 13);
    ctx.closePath();
    ctx.fill();
  }
  const cw = w * 0.4;
  ctx.fillStyle = "#28335c";
  ctx.beginPath();
  for (let x = x0; x <= x0 + cw; x += 1.5) {
    if (x === x0) ctx.moveTo(x, top(x));
    else ctx.lineTo(x, top(x));
  }
  for (let x = x0 + cw; x >= x0; x -= 1.5) ctx.lineTo(x, top(x) + (h * 7) / 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8e2d6";
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const x = x0 + 2 + c * 3.4;
      circle(ctx, x, top(x) + 2 + r * 3.8, 0.55);
      ctx.fill();
    }
  }
  // the folds: light on the rising cloth, shade where it turns away
  for (let x = x0; x < x0 + w; x += 1.5) {
    const slope = top(x + 1.5) - top(x);
    ctx.fillStyle = slope > 0 ? `rgba(0,0,0,${Math.min(0.3, slope * 0.35)})` : `rgba(255,220,180,${Math.min(0.18, -slope * 0.25)})`;
    ctx.fillRect(x, 120, 1.6, 50);
  }
  ctx.fillStyle = "rgba(255,170,110,0.08)";
  ctx.fillRect(x0, 120, w, 50);
  ctx.restore();
  ctx.fillStyle = "#1c1a18";
  ctx.fillRect(431, 130, 2.5, 2);
  ctx.fillRect(431, 158, 2.5, 2);
}

// a split-rail fence running off to the right
function paintFence(ctx) {
  const rail = (y) => {
    ctx.fillStyle = "#1d1812";
    ctx.fillRect(474, y, 140, 3.2);
    ctx.fillStyle = "rgba(255,196,146,0.3)";
    ctx.fillRect(474, y, 140, 0.8);
  };
  rail(232);
  rail(246);
  for (let x = 480; x <= 608; x += 32) {
    ctx.fillStyle = "#1a150f";
    ctx.fillRect(x - 2.5, 222, 5, 40);
    ctx.fillStyle = "rgba(255,196,146,0.35)";
    ctx.fillRect(x + 1.7, 222, 0.8, 40);
    ctx.fillRect(x - 2.5, 222, 5, 0.8);
  }
}

function paintForeground(ctx, rnd) {
  const g = ctx.createLinearGradient(0, 258, 0, 300);
  g.addColorStop(0, "#15201a");
  g.addColorStop(1, "#070a08");
  ctx.fillStyle = g;
  ctx.fillRect(-60, 262, 760, 60);
  for (let i = 0; i < 90; i++) {
    const x = -50 + rnd() * 740;
    const y = 263 + rnd() * 6;
    const h = 4 + rnd() * 9;
    const lean = (rnd() - 0.5) * 5;
    ctx.strokeStyle = rnd() < 0.2 ? "rgba(255,190,130,0.35)" : "#0c120e";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h);
    ctx.stroke();
  }
}

// ── the old man in his rocking chair ────────────────────────────────────────
// Drawn in the chair's own units, facing right: the rockers' contact point is
// at (0, 4) when the chair is level, which is where the scene pivots it. The
// lantern lights him from above and behind-left; the dawn rims his front.

function paintChair(L) {
  const R = 2;
  const k = L.chair.scale * R;
  const xmin = -74;
  const xmax = 84;
  const ymin = -172;
  const ymax = 14;
  const c = makeCanvas((xmax - xmin) * k, (ymax - ymin) * k);
  const ctx = c.getContext("2d");
  ctx.setTransform(k, 0, 0, k, -xmin * k, -ymin * k);

  const RIM = 0.9;
  const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
  const limb = (pts, w, col) => {
    stroke(ctx, shift(pts, RIM, 0.2), col.rim, w);
    stroke(ctx, pts, col.base, w);
    stroke(ctx, shift(pts, -w * 0.18, -w * 0.22), col.light, w * 0.42);
  };
  const part = (pts, col) => {
    const p = polyPath(pts);
    const b = bounds(pts);
    ctx.save();
    ctx.clip(p);
    ctx.fillStyle = col.rim;
    ctx.fillRect(b.x0 - 2, b.y0 - 2, b.w + 4, b.h + 4);
    ctx.translate(-RIM, -0.2);
    ctx.fillStyle = col.base;
    ctx.fill(p);
    ctx.translate(RIM, 0.2);
    const g = ctx.createLinearGradient(b.x0, b.y0, b.x0 + b.w * 0.7, b.y0 + b.h);
    g.addColorStop(0, col.light);
    g.addColorStop(0.55, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 2, b.y0 - 2, b.w + 4, b.h + 4);
    ctx.restore();
    return p;
  };

  const WOOD = { base: "#5b3a24", light: "rgba(255,196,128,0.55)", rim: "#d9a27a" };
  const WOOD_FAR = { base: "#3a2517", light: "rgba(255,196,128,0.25)", rim: "#8f6a50" };
  const SHIRT = { base: "#7a2e29", light: "rgba(255,172,120,0.5)", rim: "#e8a48c" };
  const JEANS = { base: "#344360", light: "rgba(255,206,160,0.35)", rim: "#a4b4d2" };
  const JEANS_FAR = { base: "#252f45", light: "rgba(255,206,160,0.18)", rim: "#6d7c9a" };
  const BOOT = { base: "#3b2619", light: "rgba(255,196,140,0.4)", rim: "#bb8c68" };
  const SKIN = { base: "#b77c5e", light: "rgba(255,214,176,0.6)", rim: "#f2ba92" };
  const BEARD = { base: "#cbc2b3", light: "rgba(255,248,230,0.6)", rim: "#fff2de" };
  const STRAW = { base: "#a8864f", light: "rgba(255,228,168,0.6)", rim: "#f4d49a" };

  // the rockers: an arc of radius ROCK_R, so the chair rolls
  const rockY = (x, off = 0) => 4 - (ROCK_R - Math.sqrt(ROCK_R * ROCK_R - x * x)) + off;
  const rocker = [];
  for (let x = -62; x <= 50; x += 2) rocker.push([x, rockY(x, -2)]);
  limb(shift(rocker, -4, -3), 4, WOOD_FAR);
  limb([[-29, -44], [-40, 0]], 3.6, WOOD_FAR);
  limb([[14, -44], [25, 0]], 3.6, WOOD_FAR);
  limb(rocker, 4.6, WOOD);
  limb([[-49, -113], [-27, -46]], 4.5, WOOD);
  ctx.fillStyle = WOOD.base;
  circle(ctx, -50, -116, 2.8);
  ctx.fill();
  part([[-31, -49], [24, -47], [25, -42], [-30, -43]], WOOD);
  limb([[-26, -44], [-36, 1]], 4, WOOD);
  limb([[18, -44], [29, 1]], 4, WOOD);

  // the far leg, then the body, then the near leg
  limb([[-10, -45], [20, -40]], 11, JEANS_FAR);
  limb([[20, -40], [40, -11]], 8.5, JEANS_FAR);
  part([[34, -17], [41, -16], [45, -10], [62, -6], [65, -2], [63, 0], [42, 0], [36, -6]], BOOT);
  const torso = part(
    [[-33, -106], [-37, -86], [-24, -52], [9, -55], [5, -80], [-11, -107]],
    SHIRT,
  );
  // flannel: a faint check over the shirt
  ctx.save();
  ctx.clip(torso);
  ctx.strokeStyle = "rgba(24,10,10,0.35)";
  ctx.lineWidth = 1.1;
  for (let x = -40; x < 12; x += 4) line(ctx, x, -110, x + 6, -50);
  for (let y = -108; y < -50; y += 4) line(ctx, -40, y, 12, y - 2);
  ctx.restore();
  limb([[-20, -50], [24, -46]], 12, JEANS);
  limb([[24, -46], [49, -19]], 9, JEANS);
  part([[46, -26], [53, -25], [57, -18], [70, -15], [73, -10], [71, -8], [52, -8], [47, -13]], BOOT);

  // the arm of the chair, beside him
  limb([[-40, -68], [22, -66]], 3.5, WOOD);
  limb([[15, -66], [17, -45]], 3, WOOD);

  // the far arm, up to the harmonica
  limb([[-13, -100], [10, -85]], 7, SHIRT);
  limb([[11, -86], [8, -109]], 6, SHIRT);

  // head: neck, face, ear, beard, a closed eye — playing, not looking
  limb([[-24, -111], [-24, -101]], 7, SKIN);
  const face = new Path2D();
  face.ellipse(-21, -124, 10, 13.5, 0, 0, Math.PI * 2);
  face.moveTo(-12, -128);
  face.lineTo(-6.5, -121);
  face.lineTo(-12, -118.5);
  face.closePath();
  const fb = { x0: -32, y0: -138, w: 26, h: 28 };
  ctx.save();
  ctx.clip(face);
  ctx.fillStyle = SKIN.rim;
  ctx.fillRect(fb.x0, fb.y0, fb.w, fb.h);
  ctx.translate(-RIM, 0);
  ctx.fillStyle = SKIN.base;
  ctx.fill(face);
  ctx.translate(RIM, 0);
  const fg = ctx.createLinearGradient(fb.x0, fb.y0, fb.x0 + fb.w, fb.y0 + fb.h);
  fg.addColorStop(0, SKIN.light);
  fg.addColorStop(0.6, "rgba(0,0,0,0)");
  fg.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = fg;
  ctx.fillRect(fb.x0, fb.y0, fb.w, fb.h);
  // the brim's shadow across his brow
  ctx.fillStyle = "rgba(20,10,5,0.4)";
  ctx.fillRect(fb.x0, fb.y0, fb.w, 7);
  ctx.restore();
  ctx.fillStyle = "#94604a";
  ellipse(ctx, -25, -123, 2.1, 3.3);
  ctx.fill();
  part([[-30, -117], [-26, -107], [-18, -104], [-11, -108], [-9, -115], [-14, -116], [-22, -114], [-28, -118]], BEARD);
  ctx.strokeStyle = "#3a2a22";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(-14, -129, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.strokeStyle = "#d8d0c4";
  line(ctx, -17, -132, -11.5, -131.5);

  // the straw hat
  part([[-45, -137], [-40, -141], [-38, -152], [-26, -157], [-15, -151], [-12, -141], [-7, -137]], STRAW);
  ctx.fillStyle = "#3a2819";
  poly(ctx, [[-42, -141], [-12, -141], [-12, -138.5], [-42, -138.5]]);
  ctx.fill();
  const brim = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    brim.push([-25 + Math.cos(a) * 29, -136 + Math.sin(a) * 4.2]);
  }
  part(brim, STRAW);

  // the harmonica, catching the lantern
  const hg = ctx.createLinearGradient(0, -119, 0, -113);
  hg.addColorStop(0, "#f2f4f7");
  hg.addColorStop(0.5, "#aab0b8");
  hg.addColorStop(1, "#6d737c");
  ctx.fillStyle = hg;
  ctx.fillRect(-12, -119, 25, 6);
  ctx.fillStyle = "rgba(20,20,24,0.8)";
  for (let x = -9; x < 12; x += 3) ctx.fillRect(x, -116.5, 1.2, 1.2);
  ctx.fillStyle = "rgba(255,255,245,0.95)";
  ctx.fillRect(-11, -119, 10, 0.9);

  // the near arm, and both hands cupped round it
  limb([[-29, -99], [-38, -82]], 7.4, SHIRT);
  limb([[-37, -80], [-8, -110]], 6.4, SHIRT);
  part([[4, -111], [6, -119], [12, -120], [14, -114], [10, -110]], SKIN);
  part([[-10, -108], [-9, -117], [-3, -121], [3, -119], [4, -114], [-2, -110]], SKIN);

  return {
    canvas: c,
    ox: -xmin / (xmax - xmin),
    oy: -ymin / (ymax - ymin),
    res: R,
  };
}

// ── a bird on a wire ────────────────────────────────────────────────────────
// A small songbird in silhouette, its feet at (0, 0) gripping the wire, the
// sunrise rimming its breast. The head is its own piece, pivoting at the neck
// (4·d, −14), so it can turn. d = 1 faces right, −1 faces left.

function paintBird(scale, d) {
  const R = 4;
  const k = scale * R;
  const BASE = "#111522";
  const RIM = "rgba(255,198,150,0.85)";
  const silhouette = (ctx, p, b) => {
    ctx.save();
    ctx.clip(p);
    ctx.fillStyle = RIM;
    ctx.fillRect(b.x0 - 2, b.y0 - 2, b.w + 4, b.h + 4);
    ctx.translate(-0.9, -0.6);
    ctx.fillStyle = BASE;
    ctx.fill(p);
    ctx.restore();
  };

  // the body, tail and legs
  const bx0 = d > 0 ? -19 : -15;
  const bx1 = d > 0 ? 15 : 19;
  const by0 = -22;
  const by1 = 3;
  const bc = makeCanvas((bx1 - bx0) * k, (by1 - by0) * k);
  const b = bc.getContext("2d");
  b.setTransform(k, 0, 0, k, -bx0 * k, -by0 * k);
  const body = new Path2D();
  body.ellipse(0, -9, 8.6, 6.2, -0.28 * d, 0, Math.PI * 2);
  body.moveTo(3 * d + 6, -11);
  body.ellipse(3 * d, -11, 6, 5.4, 0, 0, Math.PI * 2);
  body.moveTo(4 * d + 3.6, -14);
  body.ellipse(4 * d, -14, 3.6, 3.2, 0, 0, Math.PI * 2);
  body.moveTo(-6 * d, -8);
  body.lineTo(-17 * d, -3);
  body.lineTo(-15.5 * d, -0.8);
  body.lineTo(-6 * d, -5);
  body.closePath();
  silhouette(b, body, { x0: -20, y0: -22, w: 40, h: 26 });
  b.strokeStyle = BASE;
  b.lineWidth = 0.9;
  b.lineCap = "round";
  line(b, -1.6, -3.5, -2, 0.2);
  line(b, 1.6, -3.5, 2, 0.2);
  line(b, -3.6, 0.4, 0.2, 0.6);
  line(b, 0.2, 0.6, 3.6, 0.4);

  // the head, around its pivot
  const hx0 = d > 0 ? -5 : -13;
  const hx1 = d > 0 ? 13 : 5;
  const hy0 = -10;
  const hy1 = 3;
  const hc = makeCanvas((hx1 - hx0) * k, (hy1 - hy0) * k);
  const h = hc.getContext("2d");
  h.setTransform(k, 0, 0, k, -hx0 * k, -hy0 * k);
  const head = new Path2D();
  head.arc(2 * d, -4, 4.7, 0, Math.PI * 2);
  head.moveTo(6 * d, -5.6);
  head.lineTo(11.5 * d, -4.1);
  head.lineTo(6 * d, -2.9);
  head.closePath();
  silhouette(h, head, { x0: -14, y0: -11, w: 28, h: 14 });

  return {
    res: R,
    body: { canvas: bc, ox: -bx0 / (bx1 - bx0), oy: -by0 / (by1 - by0) },
    head: { canvas: hc, ox: -hx0 / (hx1 - hx0), oy: -hy0 / (hy1 - hy0) },
  };
}

// a note off the harmonica, cream with a warm glow: ♪ or ♫
function paintNote(variant) {
  const R = 3;
  const x0 = -10;
  const x1 = 11;
  const y0 = -13;
  const y1 = 10;
  const pad = 6;
  const c = makeCanvas((x1 - x0 + pad * 2) * R, (y1 - y0 + pad * 2) * R);
  const g = c.getContext("2d");
  g.setTransform(R, 0, 0, R, (pad - x0) * R, (pad - y0) * R);
  g.shadowColor = "rgba(255,190,112,0.9)";
  g.shadowBlur = 5 * R;
  g.fillStyle = "#fff1d6";
  g.strokeStyle = "#fff1d6";
  g.lineCap = "round";
  const head = (hx, hy) => {
    g.beginPath();
    g.ellipse(hx, hy, 3.1, 2.2, -0.45, 0, Math.PI * 2);
    g.fill();
  };
  if (variant === 0) {
    head(-2.5, 5);
    g.lineWidth = 1.1;
    line(g, 0.3, 4.5, 0.3, -8);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0.3, -8);
    g.quadraticCurveTo(4, -5.5, 4.2, -1.5);
    g.stroke();
  } else {
    head(-5, 6);
    head(3.5, 4.2);
    g.lineWidth = 1.1;
    line(g, -2.3, 5.5, -2.3, -7);
    line(g, 6.2, 3.7, 6.2, -8.8);
    g.lineWidth = 2;
    line(g, -2.3, -7, 6.2, -8.8);
  }
  return {
    canvas: c,
    ox: (pad - x0) / (x1 - x0 + pad * 2),
    oy: (pad - y0) / (y1 - y0 + pad * 2),
    res: R,
  };
}

// ── the frame ───────────────────────────────────────────────────────────────

function paintVeil(L) {
  const { W, H, S } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const v = ctx.createRadialGradient(W / 2, H * 0.45, S * 0.35, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, "rgba(4,5,10,0)");
  v.addColorStop(1, "rgba(4,5,10,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

// ── canvas helpers ──────────────────────────────────────────────────────────

// a shape filled dark with a sliver of light on the side facing the sun
function rimmed(ctx, build, base, rim, dx) {
  const p = new Path2D();
  build(p);
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.translate(-dx, Math.abs(dx) * 0.25);
  ctx.fillStyle = base;
  ctx.fill(p);
  ctx.restore();
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
// film grain; on a layer with holes in it, only where there is paint
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

function stroke(ctx, pts, style, width) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function polyPath(pts) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function bounds(pts) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x0, y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
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
