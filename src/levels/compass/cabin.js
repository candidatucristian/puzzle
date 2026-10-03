import { COMPASS_BEARINGS } from "./puzzle.js";

/** The captain's cabin for COMPASS, seen whole as from its door, painted in
 *  the telescope's manner: dark as a storybook night, picked out in gold.
 *  The hull curves up on either side on its great ribs, each edged with a
 *  line of gilt; the deck beams cross overhead; at the far end the stern
 *  window, in a gilded frame, stands open on the moonlit sea, its crimson
 *  curtains tied back with gold. A lantern swings near us. On the chart
 *  table, its top inlaid with a gold line, lie the folded map and a candle.
 *  And hanging from the beam above, on a chain, its face to us, the ship's
 *  compass in its gilded gimbal ring.
 *
 *  One-point perspective: everything in the room is placed by (x, y, s) —
 *  across, down from the eye, and how near (s = 1 at the table's front, the
 *  far wall at 0.27) — and comes to the screen at VP + (x, y) · s. The
 *  compass hangs square to us, so its card reads straight: up 0, right 90,
 *  down 180, left 270 — the ways the bearings walk.
 *
 *  Painted once per screen size: the cabin (`room`, the window left open);
 *  the night behind the window (it rolls with the ship), the compass, its
 *  needle and the needle's shadow, its glass (it swings, so they are apart),
 *  the lantern, the candle flame, the glows, the folded map (it leaves the
 *  table when opened) and the map unfolded. The scene moves them. */

export const MAP_FONT = '"Architects Daughter", "Special Elite", cursive';
const K = {
  room: "cp_room",
  view: "cp_view",
  glitter: "cp_glitter",
  body: "cp_body",
  needle: "cp_needle",
  shade: "cp_needle_shadow",
  glass: "cp_glass",
  lantern: "cp_lantern",
  flame: "cp_flame",
  glow: "cp_glow",
  sheet: "cp_sheet",
  folded: "cp_folded",
  beams: "cp_beams",
};
const WARM = "255,186,100";
const GOLD = "232,184,96";
const MOON = "150,180,235";
const R = 2; // the small things are painted at twice their size

// the telescope's gold: bright where it catches the light, deep in shadow
function gold(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#fff0b8");
  g.addColorStop(0.28, "#e8c06a");
  g.addColorStop(0.6, "#a8782e");
  g.addColorStop(1, "#4a3010");
  return g;
}

// ── where everything is ─────────────────────────────────────────────────────

export function layoutCabin(W, H) {
  const S = Math.min(W, H);
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, S, u };
  L.vp = { x: W / 2, y: H * 0.3 }; // the eye's height: the sea's horizon
  L.f = H * 0.88;
  L.ceilY = -0.62 * H;
  L.floorY = 1.1 * H;
  L.hull = { floor: 0.72 * W, ceil: 0.86 * W, cx: 1.21 * W, cy: 0.06 * H };
  L.backS = 0.27;
  L.ribs = [0.3, 0.38, 0.48, 0.62, 0.8];
  L.topY = 0.66 * H;
  L.table = {
    hw: Math.min(0.3 * W, 0.42 * H),
    nearS: 0.96,
    farS: 0.485,
    thick: 0.05 * H,
  };
  // the stern windows: three tall lights side by side, square-headed
  const hw = Math.min(W * 0.21, H * 0.31);
  L.win = { x: W / 2, top: H * 0.2, sill: H * 0.5, hw, lights: 3 };
  L.win.spring = L.win.top;
  L.win.cy = (L.win.top + L.win.sill) / 2;
  const tw = L.table.hw;
  // the folded map, front left on the table
  const m = { x: -0.62 * tw, s: 0.88, w: 0.26 * H, d: 0.17 * H };
  const mz = L.f / m.s;
  const mn = P(L, m.x, L.topY, L.f / (mz - m.d / 2));
  const mf = P(L, m.x, L.topY, L.f / (mz + m.d / 2));
  const mm = P(L, m.x, L.topY, m.s);
  L.map = {
    x: mm.x,
    y: (mn.y + mf.y) / 2,
    w: m.w * mm.s,
    h: mn.y - mf.y,
    flatW: m.w,
    flatH: m.d,
  };
  // the candle, at the back of the table on the left
  const cb = P(L, -0.5 * tw, L.topY, 0.6);
  const ch = 0.19 * H * cb.s;
  L.candle = {
    x: cb.x,
    y: cb.y,
    s: cb.s,
    flameY: cb.y - ch,
    size: 0.06 * H * cb.s,
  };
  // the compass, hanging over the table on the right, square to us; it
  // swings from a point on the beam above the picture
  const cR = Math.min(H * 0.17, W * 0.12);
  L.compass = { x: W * 0.68, y: H * 0.4, R: cR, r: cR * 0.7 };
  L.pivot = { x: L.compass.x, y: -H * 0.08 };
  // the moonlight: in through the window, down across the cabin to a pool
  // on the table and the floor beyond, toward us and to the left
  L.beam = {
    top: {
      x0: L.win.x - hw * 0.9,
      x1: L.win.x + hw * 0.85,
      y: L.win.sill - (L.win.sill - L.win.spring) * 0.1,
    },
    bottom: { x0: W * 0.2, x1: W * 0.6, y: H * 0.9 },
  };
  // the lantern, hanging near us, top left
  L.lantern = { x: W * 0.14, y: -H * 0.01, len: H * 0.17, s: 1.7 * u };
  return L;
}

function P(L, x, y, s) {
  return { x: L.vp.x + x * s, y: L.vp.y + y * s, s };
}

function hullPoint(L, t) {
  const h = L.hull;
  const a = (1 - t) * (1 - t);
  const b = 2 * t * (1 - t);
  const c = t * t;
  return [
    a * h.floor + b * h.cx + c * h.ceil,
    a * L.floorY + b * h.cy + c * L.ceilY,
  ];
}

function hullAt(L, y) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (hullPoint(L, m)[1] > y) lo = m;
    else hi = m;
  }
  return hullPoint(L, (lo + hi) / 2)[0];
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintCabin(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintShell(ctx, L);
  paintStern(ctx, L);
  for (const s of L.ribs) paintRib(ctx, L, s);
  paintTable(ctx, L);
  paintCandle(ctx, L);
  paintCompassShadow(ctx, L);
  paintLight(ctx, L);
  finish(ctx, L);
  add(t, K.room, c);

  add(t, K.folded, paintFolded(L));
  const view = paintView(L);
  add(t, K.view, view.sky);
  add(t, K.glitter, view.glitter);
  const body = paintCompass(L);
  add(t, K.body, body.canvas);
  const needle = paintNeedle(L.compass.r, false);
  add(t, K.needle, needle.canvas);
  add(t, K.shade, paintNeedle(L.compass.r, true).canvas);
  add(t, K.glass, paintGlass(L.compass.r));
  const lantern = paintLantern(L.lantern);
  add(t, K.lantern, lantern.canvas);
  add(t, K.flame, paintFlame());
  add(
    t,
    K.glow,
    radial(128, "255,255,255", [
      [0, 0.95],
      [0.25, 0.4],
      [0.6, 0.1],
      [1, 0],
    ]),
  );
  const sheet = paintSheet(L);
  add(t, K.sheet, sheet.canvas);
  add(t, K.beams, paintMoonbeams(L));
  return {
    keys: K,
    res: R,
    body: { oy: body.oy },
    needle: { oy: needle.oy },
    lantern: { oy: lantern.oy, flameDrop: lantern.flameDrop },
    sheet: { w: sheet.w, h: sheet.h, lines: sheet.lines, textX: sheet.textX },
  };
}

export function releaseCabinArt(textures) {
  for (const key of Object.values(K))
    if (textures.exists(key)) textures.remove(key);
}

// ── the cabin ───────────────────────────────────────────────────────────────

const NEAR = 2.4;

// deck planks overhead, the hull's planks down both sides, the floor: dark
// old timber, every seam running away to the far end
function paintShell(ctx, L) {
  const { W, H } = L;
  ctx.fillStyle = "#0c0603";
  ctx.fillRect(0, 0, W, H);
  const sb = L.backS;
  const strip = (pts, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  const seam = (a, b, w, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  for (const [y, half, n, base, seed] of [
    [L.ceilY, L.hull.ceil, 14, [50, 30, 16], 11],
    [L.floorY, L.hull.floor, 12, [66, 40, 22], 13],
  ]) {
    const rnd = lcg(seed);
    for (let i = 0; i < n; i++) {
      const x0 = -half + (2 * half * i) / n;
      const x1 = -half + (2 * half * (i + 1)) / n;
      const k = 0.8 + rnd() * 0.3;
      const a = P(L, x0, y, NEAR);
      const d = P(L, x0, y, sb);
      const g = ctx.createLinearGradient(0, a.y < L.vp.y ? 0 : H, 0, d.y);
      g.addColorStop(0, rgb(base[0] * k, base[1] * k, base[2] * k));
      g.addColorStop(
        1,
        rgb(base[0] * k * 0.35, base[1] * k * 0.35, base[2] * k * 0.35),
      );
      strip([a, P(L, x1, y, NEAR), P(L, x1, y, sb), d], g);
      seam(a, d, Math.max(1, H * 0.002), "rgba(6,2,0,0.85)");
    }
  }
  for (const side of [-1, 1]) {
    const rnd = lcg(side > 0 ? 31 : 37);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = hullPoint(L, i / n);
      const [bx, by] = hullPoint(L, (i + 1) / n);
      const k = 0.78 + rnd() * 0.32;
      const back = P(L, side * ax, ay, sb);
      const g = ctx.createLinearGradient(side < 0 ? 0 : W, 0, back.x, 0);
      g.addColorStop(0, rgb(66 * k, 38 * k, 20 * k));
      g.addColorStop(1, rgb(24 * k, 13 * k, 7 * k));
      const a = P(L, side * ax, ay, NEAR);
      strip([a, P(L, side * bx, by, NEAR), P(L, side * bx, by, sb), back], g);
      seam(a, back, Math.max(1, H * 0.0022), "rgba(6,2,0,0.9)");
      for (let j = 0; j < 2; j++) {
        const tt = (i + 0.3 + rnd() * 0.4) / n;
        const [gx, gy] = hullPoint(L, tt);
        seam(
          P(L, side * gx, gy, NEAR),
          P(L, side * gx, gy, sb),
          0.7,
          rnd() < 0.5 ? "rgba(20,8,2,0.3)" : "rgba(255,200,140,0.04)",
        );
      }
    }
  }
}

// the far wall: dark panelling, the great window in its gilded frame, open
// on the night, the moon spilling round it, the curtains tied back
function paintStern(ctx, L) {
  const { W, H, win } = L;
  const sb = L.backS;
  const outline = [];
  for (let i = 0; i <= 20; i++) {
    const [x, y] = hullPoint(L, i / 20);
    outline.push(P(L, -x, y, sb));
  }
  for (let i = 20; i >= 0; i--) {
    const [x, y] = hullPoint(L, i / 20);
    outline.push(P(L, x, y, sb));
  }
  ctx.save();
  ctx.beginPath();
  outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, outline[20].y, 0, outline[0].y);
  g.addColorStop(0, "#160b05");
  g.addColorStop(1, "#24140a");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const x0 = Math.min(...outline.map((p) => p.x));
  const x1 = Math.max(...outline.map((p) => p.x));
  const rnd = lcg(77);
  const boards = 16;
  for (let i = 0; i < boards; i++) {
    const bx = x0 + ((x1 - x0) * i) / boards;
    const k = 0.85 + rnd() * 0.3;
    ctx.fillStyle = `rgba(${Math.round(90 * k)},${Math.round(54 * k)},${Math.round(28 * k)},0.16)`;
    ctx.fillRect(bx, 0, (x1 - x0) / boards, H);
    ctx.fillStyle = "rgba(4,1,0,0.75)";
    ctx.fillRect(bx, 0, Math.max(1, W * 0.0015), H);
  }
  // a gilt rail along the wall at the sill's height
  ctx.fillStyle = "rgba(10,4,1,0.8)";
  ctx.fillRect(x0, win.sill + H * 0.012, x1 - x0, H * 0.012);
  ctx.fillStyle = `rgba(${GOLD},0.35)`;
  ctx.fillRect(x0, win.sill + H * 0.012, x1 - x0, Math.max(1, H * 0.0025));
  soft(
    ctx,
    win.x + win.hw * 0.3,
    win.cy,
    win.hw * 2.4,
    (win.sill - win.top) * 1.3,
    MOON,
    0.2,
    "lighter",
  );
  ctx.restore();

  // the frame: heavy dark timber, a carved lintel over it with a thin gilt
  // bead, the opening left open for the night (the scene's, behind)
  const fw = win.hw * 0.08;
  const wx0 = win.x - win.hw;
  const wx1 = win.x + win.hw;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = H * 0.02;
  ctx.fillStyle = "#1e1007";
  ctx.fillRect(
    wx0 - fw * 1.6,
    win.top - fw * 2.6,
    win.hw * 2 + fw * 3.2,
    win.sill - win.top + fw * 3,
  );
  ctx.restore();
  const lint = ctx.createLinearGradient(0, win.top - fw * 2.6, 0, win.top);
  lint.addColorStop(0, "#3a2010");
  lint.addColorStop(0.6, "#24130a");
  lint.addColorStop(1, "#120904");
  ctx.fillStyle = lint;
  ctx.fillRect(
    wx0 - fw * 1.6,
    win.top - fw * 2.6,
    win.hw * 2 + fw * 3.2,
    fw * 2.6,
  );
  // a run of carved dentils along the lintel
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let x = wx0 - fw * 1.2; x < wx1 + fw * 1.2; x += fw * 0.9)
    ctx.fillRect(x, win.top - fw * 1.1, fw * 0.45, fw * 0.6);
  ctx.fillStyle = `rgba(${GOLD},0.4)`;
  ctx.fillRect(
    wx0 - fw * 1.6,
    win.top - fw * 0.35,
    win.hw * 2 + fw * 3.2,
    Math.max(1, fw * 0.12),
  );
  ctx.fillRect(
    wx0 - fw * 1.6,
    win.top - fw * 2.6,
    win.hw * 2 + fw * 3.2,
    Math.max(1, fw * 0.1),
  );
  // the opening, left open
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(wx0, win.top, win.hw * 2, win.sill - win.top);
  ctx.restore();
  // the panes' glass: a faint cool sheen on each, a little uneven
  const n = win.lights;
  const lw = (win.hw * 2) / n;
  const post = fw * 1.1;
  const rows = 5;
  const cols = 3;
  const rnd2 = lcg(303);
  for (let i = 0; i < n; i++) {
    const lx0 = wx0 + i * lw + post / 2;
    const lx1 = wx0 + (i + 1) * lw - post / 2;
    const pw = (lx1 - lx0) / cols;
    const ph = (win.sill - win.top) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = lx0 + c * pw;
        const py = win.top + r * ph;
        const sg = ctx.createLinearGradient(px, py, px + pw, py + ph);
        sg.addColorStop(
          0,
          `rgba(170,190,230,${(0.04 + rnd2() * 0.05).toFixed(3)})`,
        );
        sg.addColorStop(0.5, "rgba(170,190,230,0)");
        sg.addColorStop(
          1,
          `rgba(170,190,230,${(0.02 + rnd2() * 0.03).toFixed(3)})`,
        );
        ctx.fillStyle = sg;
        ctx.fillRect(px, py, pw, ph);
      }
    }
    // the glazing bars: thin dark wood, a cold glint along one edge
    const bar = Math.max(2, fw * 0.32);
    ctx.fillStyle = "#140a04";
    for (let c = 1; c < cols; c++)
      ctx.fillRect(lx0 + c * pw - bar / 2, win.top, bar, win.sill - win.top);
    for (let r = 1; r < rows; r++)
      ctx.fillRect(lx0, win.top + r * ph - bar / 2, lx1 - lx0, bar);
    ctx.fillStyle = "rgba(170,195,240,0.18)";
    for (let c = 1; c < cols; c++)
      ctx.fillRect(lx0 + c * pw + bar / 2 - 1, win.top, 1, win.sill - win.top);
    for (let r = 1; r < rows; r++)
      ctx.fillRect(lx0, win.top + r * ph + bar / 2 - 1, lx1 - lx0, 1);
    // the light's own frame
    ctx.strokeStyle = "#140a04";
    ctx.lineWidth = bar * 1.6;
    ctx.strokeRect(
      lx0,
      win.top + bar * 0.8,
      lx1 - lx0,
      win.sill - win.top - bar * 1.6,
    );
  }
  // the posts between the lights, turned, a gilt ring on each
  for (let i = 0; i <= n; i++) {
    const px = wx0 + i * lw;
    const pg = ctx.createLinearGradient(px - post, 0, px + post, 0);
    pg.addColorStop(0, "#0e0703");
    pg.addColorStop(0.4, "#3a2010");
    pg.addColorStop(1, "#0e0703");
    ctx.fillStyle = pg;
    ctx.fillRect(
      px - post / 2 - (i === 0 || i === n ? fw * 0.4 : 0),
      win.top,
      post + (i === 0 || i === n ? fw * 0.8 : 0),
      win.sill - win.top,
    );
    ctx.fillStyle = `rgba(${GOLD},0.45)`;
    for (const f of [0.18, 0.82])
      ctx.fillRect(
        px - post / 2,
        win.top + (win.sill - win.top) * f,
        post,
        Math.max(1, post * 0.12),
      );
  }
  // the sill, its gilt edge catching the moon
  const sy = win.sill;
  const sx0 = win.x - win.hw - fw * 2.2;
  const sx1 = win.x + win.hw + fw * 2.2;
  const sd = H * 0.03;
  const sg = ctx.createLinearGradient(0, sy - sd * 0.2, 0, sy + sd);
  sg.addColorStop(0, "#6a4220");
  sg.addColorStop(0.5, "#3a200c");
  sg.addColorStop(1, "#140904");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(sx0 + sd * 0.8, sy - sd * 0.15);
  ctx.lineTo(sx1 - sd * 0.8, sy - sd * 0.15);
  ctx.lineTo(sx1, sy + sd * 0.45);
  ctx.lineTo(sx1, sy + sd);
  ctx.lineTo(sx0, sy + sd);
  ctx.lineTo(sx0, sy + sd * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(${GOLD},0.6)`;
  ctx.fillRect(
    sx0 + sd * 0.4,
    sy + sd * 0.42,
    sx1 - sx0 - sd * 0.8,
    Math.max(1, sd * 0.08),
  );
  ctx.fillStyle = "rgba(200,220,255,0.2)";
  ctx.fillRect(
    sx0 + sd,
    sy - sd * 0.1,
    sx1 - sx0 - sd * 2,
    Math.max(1, sd * 0.1),
  );
  paintCurtains(ctx, L, fw);
}

function windowPath(ctx, win, grow) {
  const x0 = win.x - win.hw - grow;
  const x1 = win.x + win.hw + grow;
  ctx.beginPath();
  ctx.moveTo(x0, win.sill + Math.max(0, grow) * 0.2);
  ctx.lineTo(x0, win.spring);
  ctx.ellipse(
    win.x,
    win.spring,
    win.hw + grow,
    win.spring - win.top + grow,
    0,
    Math.PI,
    Math.PI * 2,
  );
  ctx.lineTo(x1, win.sill + Math.max(0, grow) * 0.2);
  ctx.closePath();
}

// deep crimson velvet on a gilded rod, a gold fringe at the hem, gathered
// and tied back with gold cord and tassel
function paintCurtains(ctx, L, fw) {
  const { H, win } = L;
  const rodY = win.top - fw * 3.2;
  const reach = win.hw + fw * 4.5;
  ctx.fillStyle = gold(ctx, 0, rodY - 3, 0, rodY + 3);
  ctx.fillRect(
    win.x - reach,
    rodY - Math.max(1.5, H * 0.003),
    reach * 2,
    Math.max(3, H * 0.006),
  );
  for (const side of [-1, 1]) {
    const fx = win.x + side * reach;
    const fg = ctx.createRadialGradient(
      fx - 2,
      rodY - 2,
      0.5,
      fx,
      rodY,
      H * 0.011,
    );
    fg.addColorStop(0, "#fff0b8");
    fg.addColorStop(1, "#7a5418");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, rodY, H * 0.011, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const side of [-1, 1]) {
    const outer = win.x + side * reach * 0.97;
    const inner = win.x + side * (win.hw * 0.8);
    const tieY = win.spring + (win.sill - win.spring) * 0.45;
    const tieX = win.x + side * (win.hw + fw * 1.2);
    const foot = win.sill + H * 0.07;
    const footIn = win.x + side * (win.hw + fw * 0.6);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(outer, rodY);
      ctx.lineTo(inner, rodY);
      ctx.bezierCurveTo(
        inner,
        rodY + (tieY - rodY) * 0.5,
        tieX - side * fw * 0.2,
        tieY - H * 0.05,
        tieX,
        tieY,
      );
      ctx.bezierCurveTo(
        tieX + side * fw * 0.3,
        tieY + H * 0.05,
        footIn,
        foot - H * 0.08,
        footIn,
        foot,
      );
      ctx.quadraticCurveTo(
        (footIn + outer) / 2,
        foot + H * 0.012,
        outer + side * fw * 0.3,
        foot,
      );
      ctx.closePath();
    };
    soft(
      ctx,
      (outer + tieX) / 2 + side * fw,
      (rodY + foot) / 2,
      Math.abs(outer - inner) * 0.7,
      (foot - rodY) * 0.6,
      "0,0,0",
      0.5,
    );
    path();
    const left = Math.min(outer, inner);
    const right = Math.max(outer, inner);
    const g = ctx.createLinearGradient(left, 0, right, 0);
    for (let i = 0; i <= 6; i++)
      g.addColorStop(i / 6, i % 2 ? "#300408" : "#7a1420");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    soft(
      ctx,
      tieX - side * fw * 0.2,
      tieY,
      fw * 1.2,
      (foot - rodY) * 0.5,
      "190,200,255",
      0.18,
      "lighter",
    );
    const shade = ctx.createLinearGradient(0, rodY, 0, foot);
    shade.addColorStop(0, "rgba(0,0,0,0.4)");
    shade.addColorStop(0.3, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = shade;
    ctx.fillRect(left - fw, rodY, right - left + fw * 2, foot - rodY);
    ctx.restore();
    // the gold fringe along its hem
    ctx.strokeStyle = `rgba(${GOLD},0.75)`;
    ctx.lineWidth = 1;
    const f0 = Math.min(footIn, outer);
    const f1 = Math.max(footIn, outer);
    for (let x = f0; x <= f1; x += Math.max(2, H * 0.004)) {
      const yy =
        foot + Math.sin(((x - f0) / (f1 - f0 || 1)) * Math.PI) * H * 0.01;
      ctx.beginPath();
      ctx.moveTo(x, yy - H * 0.004);
      ctx.lineTo(x, yy + H * 0.01);
      ctx.stroke();
    }
    // the gold cord and its tassel
    const cx = (tieX + outer) / 2;
    const cw = Math.abs(outer - tieX) / 2 + fw * 0.15;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#6a4810";
    ctx.lineWidth = Math.max(3, H * 0.011);
    ctx.beginPath();
    ctx.ellipse(cx, tieY, cw, H * 0.012, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.strokeStyle = "#f0c868";
    ctx.lineWidth = Math.max(2, H * 0.007);
    ctx.stroke();
    ctx.fillStyle = gold(ctx, cx - fw * 0.4, 0, cx + fw * 0.4, 0);
    ctx.beginPath();
    ctx.moveTo(cx - fw * 0.12, tieY + H * 0.018);
    ctx.lineTo(cx + fw * 0.12, tieY + H * 0.018);
    ctx.quadraticCurveTo(
      cx + fw * 0.5,
      tieY + H * 0.05,
      cx + fw * 0.45,
      tieY + H * 0.075,
    );
    ctx.lineTo(cx - fw * 0.45, tieY + H * 0.075);
    ctx.quadraticCurveTo(
      cx - fw * 0.5,
      tieY + H * 0.05,
      cx - fw * 0.12,
      tieY + H * 0.018,
    );
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = "butt";
  }
}

// a rib of the hull standing out of the planks on both sides, a line of gilt
// along its edge, and the deck beam it carries overhead
function paintRib(ctx, L, s) {
  const { H } = L;
  const w = 0.085 * H * s;
  for (const side of [-1, 1]) {
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const [x, y] = hullPoint(L, i / 28);
        const p = P(L, side * x, y, s);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
    };
    ctx.lineCap = "butt";
    path();
    ctx.strokeStyle = "#0c0603";
    ctx.lineWidth = w * 1.15;
    ctx.stroke();
    ctx.save();
    ctx.translate(-side * w * 0.12, 0);
    path();
    ctx.strokeStyle = "#3e2412";
    ctx.lineWidth = w * 0.8;
    ctx.stroke();
    ctx.translate(-side * w * 0.36, 0);
    path();
    ctx.strokeStyle = `rgba(${GOLD},0.45)`;
    ctx.lineWidth = Math.max(1, w * 0.06);
    ctx.stroke();
    ctx.restore();
  }
  const bh = 0.13 * H;
  const half = hullAt(L, L.ceilY + bh / 2);
  const a = P(L, -half, L.ceilY, s);
  const b = P(L, half, L.ceilY + bh, s);
  if (b.y < 0) return;
  const g = ctx.createLinearGradient(0, a.y, 0, b.y);
  g.addColorStop(0, "#0c0603");
  g.addColorStop(0.75, "#30190a");
  g.addColorStop(1, "#40240f");
  ctx.fillStyle = g;
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.fillStyle = `rgba(${GOLD},0.5)`;
  ctx.fillRect(
    a.x,
    b.y - Math.max(1, (b.y - a.y) * 0.05),
    b.x - a.x,
    Math.max(1, (b.y - a.y) * 0.04),
  );
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(a.x, b.y, b.x - a.x, Math.max(1, (b.y - a.y) * 0.12));
}

// the chart table: its top running away from us, inlaid with a line of gold,
// a rail round three sides, its thick front edge, its legs
function paintTable(ctx, L) {
  const { H } = L;
  const t = L.table;
  const y = L.topY;
  const nl = P(L, -t.hw, y, t.nearS);
  const nr = P(L, t.hw, y, t.nearS);
  const fl = P(L, -t.hw, y, t.farS);
  const fr = P(L, t.hw, y, t.farS);
  const th = t.thick * t.nearS;
  soft(
    ctx,
    (nl.x + nr.x) / 2,
    nl.y + th + H * 0.06,
    (nr.x - nl.x) * 0.6,
    H * 0.08,
    "0,0,0",
    0.75,
  );
  for (const p of [nl, nr]) {
    const lw = H * 0.045;
    const x = p.x + (p === nl ? lw * 0.9 : -lw * 0.9);
    const lg = ctx.createLinearGradient(x - lw / 2, 0, x + lw / 2, 0);
    lg.addColorStop(0, "#120803");
    lg.addColorStop(0.35, "#4a2a12");
    lg.addColorStop(1, "#0e0602");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - lw * 0.5, p.y);
    ctx.lineTo(x + lw * 0.5, p.y);
    ctx.lineTo(x + lw * 0.32, H * 1.02);
    ctx.lineTo(x - lw * 0.32, H * 1.02);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(fl.x, fl.y);
  ctx.lineTo(fr.x, fr.y);
  ctx.lineTo(nr.x, nr.y);
  ctx.lineTo(nl.x, nl.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, fl.y, 0, nl.y);
  g.addColorStop(0, "#2e160a");
  g.addColorStop(1, "#5a2e14");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rnd = lcg(808);
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const x = -t.hw + (2 * t.hw * i) / n;
    const a = P(L, x, y, t.nearS);
    const b = P(L, x, y, t.farS);
    if (i > 0 && i < n) {
      ctx.strokeStyle = "rgba(10,4,1,0.6)";
      ctx.lineWidth = Math.max(1, H * 0.002);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let j = 0; j < 5 && i < n; j++) {
      const gx = x + (2 * t.hw * (0.15 + rnd() * 0.7)) / n;
      const p0 = P(L, gx, y, t.nearS);
      const p1 = P(L, gx + (rnd() - 0.5) * H * 0.02, y, t.farS);
      ctx.strokeStyle =
        rnd() < 0.6 ? "rgba(20,8,2,0.25)" : "rgba(255,200,150,0.06)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  // the gold line inlaid round its top
  const inset = t.hw * 0.08;
  const q = [
    P(L, -t.hw + inset, y, t.farS + 0.03),
    P(L, t.hw - inset, y, t.farS + 0.03),
    P(L, t.hw - inset, y, t.nearS - 0.05),
    P(L, -t.hw + inset, y, t.nearS - 0.05),
  ];
  ctx.beginPath();
  q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = `rgba(${GOLD},0.7)`;
  ctx.lineWidth = Math.max(1, H * 0.0025);
  ctx.stroke();
  ctx.restore();
  // the rail round the far end and the sides, gold caps on its corners
  const rail = 0.022 * H;
  const rf = P(L, -t.hw, y - rail, t.farS);
  const rfr = P(L, t.hw, y - rail, t.farS);
  ctx.fillStyle = "#24120a";
  ctx.beginPath();
  ctx.moveTo(fl.x, fl.y);
  ctx.lineTo(fr.x, fr.y);
  ctx.lineTo(rfr.x, rfr.y);
  ctx.lineTo(rf.x, rf.y);
  ctx.closePath();
  ctx.fill();
  for (const side of [-1, 1]) {
    const a = P(L, side * t.hw, y, t.nearS);
    const b = P(L, side * t.hw, y, t.farS);
    const c = P(L, side * t.hw, y - rail, t.farS);
    const d = P(L, side * t.hw, y - rail, t.nearS);
    ctx.fillStyle = "#42220e";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${GOLD},0.45)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    for (const p of [c, d]) {
      const cg = ctx.createRadialGradient(
        p.x - 1,
        p.y - 1,
        0,
        p.x,
        p.y,
        Math.max(2, H * 0.008 * p.s),
      );
      cg.addColorStop(0, "#fff0b8");
      cg.addColorStop(1, "#7a5418");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, H * 0.008 * p.s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the front edge: thick, moulded, a gilt bead along it
  const fg = ctx.createLinearGradient(0, nl.y, 0, nl.y + th);
  fg.addColorStop(0, "#8a5a32");
  fg.addColorStop(0.15, "#4a2810");
  fg.addColorStop(0.6, "#30180a");
  fg.addColorStop(1, "#140904");
  ctx.fillStyle = fg;
  ctx.fillRect(nl.x, nl.y, nr.x - nl.x, th);
  ctx.fillStyle = `rgba(${GOLD},0.55)`;
  ctx.fillRect(nl.x, nl.y + th * 0.42, nr.x - nl.x, Math.max(1, th * 0.06));
}

// a fat candle on a gold saucer, wax run down its side; its flame is the
// scene's
function paintCandle(ctx, L) {
  const c = L.candle;
  const s = c.s;
  const k = (L.topY * s) / L.f;
  const r = 0.03 * L.H * s;
  const sr = r * 2.3;
  soft(
    ctx,
    c.x + sr * 0.35,
    c.y - sr * k * 0.25,
    sr * 1.5,
    sr * k * 1.4,
    "0,0,0",
    0.55,
  );
  ctx.fillStyle = "#5a3c0c";
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, sr, sr * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold(ctx, c.x - sr, 0, c.x + sr, 0);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r * 0.2, sr * 0.96, sr * k * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  const top = c.flameY + r * 0.5;
  const cg = ctx.createLinearGradient(c.x - r, 0, c.x + r, 0);
  cg.addColorStop(0, "#b8a078");
  cg.addColorStop(0.35, "#fff2d0");
  cg.addColorStop(1, "#8a7050");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(c.x - r, top);
  ctx.lineTo(c.x - r, c.y - r * 0.3);
  ctx.ellipse(c.x, c.y - r * 0.3, r, r * k, 0, Math.PI, 0, true);
  ctx.lineTo(c.x + r, top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff6dc";
  ctx.beginPath();
  ctx.ellipse(c.x, top, r, r * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff2d0";
  for (const [dx, len] of [
    [-0.7, 0.5],
    [0.35, 0.8],
  ]) {
    ctx.beginPath();
    ctx.roundRect(
      c.x + dx * r - r * 0.12,
      top,
      r * 0.24,
      (c.y - top) * len * 0.5,
      r * 0.12,
    );
    ctx.fill();
  }
  ctx.strokeStyle = "#1a1008";
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(c.x, top);
  ctx.lineTo(c.x + r * 0.05, top - r * 0.45);
  ctx.stroke();
  soft(ctx, c.x, c.y, L.W * 0.14, L.H * 0.07, WARM, 0.3, "lighter");
}

// the compass's shadow, thrown down onto the table from the lantern
function paintCompassShadow(ctx, L) {
  const c = L.compass;
  const ty = L.topY * 0.62 + L.vp.y;
  soft(ctx, c.x + c.R * 0.3, ty, c.R * 1.1, c.R * 0.18, "0,0,0", 0.6);
}

// the lights: the lantern's gold over the room, the candle's on the table,
// a faint shaft of moonlight down from the window
function paintLight(ctx, L) {
  const { W, H, win } = L;
  soft(ctx, L.lantern.x, H * 0.2, W * 0.16, H * 0.2, WARM, 0.06, "lighter");
  void win;
}

// a deep vignette over the cabin (only where it is painted: the window stays
// open), the telescope's dark round the edges
function finish(ctx, L) {
  const { W, H } = L;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const R0 = Math.hypot(W, H) / 2;
  ctx.fillStyle = "rgba(2,2,6,0.62)";
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(
    W * 0.5,
    H * 0.42,
    R0 * 0.2,
    W * 0.5,
    H * 0.5,
    R0 * 0.95,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(1,1,3,0.9)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03);
  ctx.restore();
}

// The moon's light coming in at the stern window: broad soft shafts through
// the air of the cabin, a few brighter rays inside them, and where they come
// down, the window's shape laid in silver across the table and the floor.
// Painted on its own so the scene can let it breathe and drift dust in it.
function paintMoonbeams(L) {
  const { W, H, win } = L;
  const b = L.beam;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const lerp = (a, z, k) => a + (z - a) * k;
  // the broad shaft
  const shaft = (k0, k1, a, blur) => {
    const tx0 = lerp(b.top.x0, b.top.x1, k0);
    const tx1 = lerp(b.top.x0, b.top.x1, k1);
    const bx0 = lerp(b.bottom.x0, b.bottom.x1, k0);
    const bx1 = lerp(b.bottom.x0, b.bottom.x1, k1);
    for (let i = 0; i < 4; i++) {
      const grow = blur * (i / 3);
      g.beginPath();
      g.moveTo(tx0 - grow * 0.3, b.top.y);
      g.lineTo(tx1 + grow * 0.3, b.top.y);
      g.lineTo(bx1 + grow, b.bottom.y);
      g.lineTo(bx0 - grow, b.bottom.y);
      g.closePath();
      const gr = g.createLinearGradient(0, b.top.y, 0, b.bottom.y);
      gr.addColorStop(0, `rgba(${MOON},0)`);
      gr.addColorStop(0.18, `rgba(${MOON},${(a * 0.9) / 4})`);
      gr.addColorStop(0.55, `rgba(${MOON},${(a * 0.7) / 4})`);
      gr.addColorStop(1, `rgba(${MOON},${(a * 0.15) / 4})`);
      g.fillStyle = gr;
      g.fill();
    }
  };
  shaft(0, 1, 0.22, W * 0.05);
  // brighter rays inside it, as the light comes through the glazing
  const rnd = lcg(919);
  for (let i = 0; i < 7; i++) {
    const k = 0.06 + rnd() * 0.86;
    const w = 0.025 + rnd() * 0.06;
    shaft(k, Math.min(1, k + w), 0.12 + rnd() * 0.12, W * 0.01);
  }
  // the window's own glow at its opening
  soft(g, win.x, win.cy, win.hw * 1.3, (win.sill - win.top) * 0.6, MOON, 0.1);
  // where it lands: the window laid in silver across the table top
  const t = L.table;
  const py = L.vp.y + L.topY * 0.72;
  const px = lerp(b.bottom.x0, b.bottom.x1, 0.5) + W * 0.02;
  soft(g, px, py, t.hw * 0.62, H * 0.06, MOON, 0.42);
  soft(g, px, py, t.hw * 0.4, H * 0.035, "220,232,255", 0.3);
  // the window's bars laid across the pool, as shadow
  g.save();
  g.beginPath();
  g.ellipse(px, py, t.hw * 0.62, H * 0.06, 0, 0, Math.PI * 2);
  g.clip();
  g.globalCompositeOperation = "destination-out";
  g.strokeStyle = "rgba(0,0,0,0.3)";
  g.lineWidth = Math.max(1.5, H * 0.004);
  for (let i = -4; i <= 4; i++) {
    g.beginPath();
    g.moveTo(px + i * t.hw * 0.14 - t.hw * 0.05, py - H * 0.06);
    g.lineTo(px + i * t.hw * 0.17 + t.hw * 0.05, py + H * 0.06);
    g.stroke();
  }
  for (const dy of [-0.035, 0, 0.035]) {
    g.beginPath();
    g.moveTo(px - t.hw * 0.7, py + H * dy);
    g.lineTo(px + t.hw * 0.7, py + H * dy);
    g.stroke();
  }
  g.restore();
  // and on the floor beyond the table's front, softer
  soft(
    g,
    lerp(b.bottom.x0, b.bottom.x1, 0.45),
    H * 0.97,
    W * 0.22,
    H * 0.05,
    MOON,
    0.22,
  );
  // a little silver on the edges that face the window
  soft(
    g,
    L.compass.x - L.compass.R * 0.7,
    L.compass.y,
    L.compass.R * 0.5,
    L.compass.R * 1.1,
    MOON,
    0.16,
  );
  return c;
}

// ── the compass ─────────────────────────────────────────────────────────────

// The ship's compass as it hangs: a gilded gimbal ring on its chain, the
// brass bowl pivoted in it, a thick bezel with six screws, the ivory card
// sunk inside; the needle and the glass go over it. The chain runs up out of
// the picture to the beam it swings from (the texture's origin is the
// compass's centre).
function paintCompass(L) {
  const { R: cR, r } = L.compass;
  const drop = L.compass.y - L.pivot.y;
  const ring = cR * 1.2;
  const chainTop = drop - ring - cR * 0.12;
  const pad = cR * 0.14;
  const w = (ring + pad) * 2;
  const h = drop + ring + pad;
  const c = makeCanvas(w * R, h * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = w / 2;
  const cy = drop;
  // the chain, from the beam down to the ring's shackle
  for (let y = 0; y < chainTop; y += cR * 0.07) {
    g.strokeStyle = "#1c160e";
    g.lineWidth = Math.max(2.5, cR * 0.03);
    g.beginPath();
    g.ellipse(cx, y, cR * 0.022, cR * 0.036, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = `rgba(${GOLD},0.45)`;
    g.lineWidth = Math.max(1, cR * 0.01);
    g.beginPath();
    g.ellipse(cx, y, cR * 0.022, cR * 0.036, 0, Math.PI * 1.1, Math.PI * 1.6);
    g.stroke();
  }
  // the shackle at the top of the gimbal ring
  g.strokeStyle = gold(
    g,
    cx - cR * 0.1,
    cy - ring - cR * 0.12,
    cx + cR * 0.1,
    cy - ring,
  );
  g.lineWidth = cR * 0.05;
  g.beginPath();
  g.arc(cx, cy - ring - cR * 0.05, cR * 0.08, Math.PI, 0);
  g.stroke();
  // the gimbal ring: a gilded band round the bowl, pivoted on either side
  g.save();
  g.shadowColor = "rgba(0,0,0,0.6)";
  g.shadowBlur = cR * 0.08;
  g.shadowOffsetX = cR * 0.03;
  g.shadowOffsetY = cR * 0.05;
  g.strokeStyle = gold(g, cx - ring, cy - ring, cx + ring, cy + ring);
  g.lineWidth = cR * 0.075;
  g.beginPath();
  g.arc(cx, cy, ring, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  g.strokeStyle = "rgba(255,240,190,0.5)";
  g.lineWidth = cR * 0.012;
  g.beginPath();
  g.arc(cx, cy, ring + cR * 0.02, Math.PI * 1.05, Math.PI * 1.7);
  g.stroke();
  g.strokeStyle = "rgba(40,20,4,0.6)";
  g.lineWidth = cR * 0.01;
  g.beginPath();
  g.arc(cx, cy, ring - cR * 0.035, 0, Math.PI * 2);
  g.stroke();
  // engraved rope-work round the ring
  g.strokeStyle = "rgba(70,40,8,0.45)";
  g.lineWidth = Math.max(0.8, cR * 0.006);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    g.beginPath();
    g.moveTo(
      cx + Math.cos(a) * (ring - cR * 0.03),
      cy + Math.sin(a) * (ring - cR * 0.03),
    );
    g.lineTo(
      cx + Math.cos(a + 0.05) * (ring + cR * 0.03),
      cy + Math.sin(a + 0.05) * (ring + cR * 0.03),
    );
    g.stroke();
  }
  // the pivots that hold the bowl in the ring, left and right
  for (const side of [-1, 1]) {
    const px = cx + side * (cR + (ring - cR) * 0.5);
    g.fillStyle = gold(
      g,
      px - cR * 0.08,
      cy - cR * 0.08,
      px + cR * 0.08,
      cy + cR * 0.08,
    );
    g.beginPath();
    g.ellipse(px, cy, (ring - cR) * 0.75, cR * 0.07, 0, 0, Math.PI * 2);
    g.fill();
    const kg = g.createRadialGradient(
      px - cR * 0.015,
      cy - cR * 0.015,
      0,
      px,
      cy,
      cR * 0.04,
    );
    kg.addColorStop(0, "#fff0b8");
    kg.addColorStop(1, "#5a3a0c");
    g.fillStyle = kg;
    g.beginPath();
    g.arc(px, cy, cR * 0.04, 0, Math.PI * 2);
    g.fill();
  }
  // the bowl's bezel: thick brass, rounded, bright along its top left
  g.save();
  g.shadowColor = "rgba(0,0,0,0.55)";
  g.shadowBlur = cR * 0.06;
  g.shadowOffsetY = cR * 0.03;
  g.fillStyle = gold(g, cx - cR, cy - cR, cx + cR, cy + cR);
  g.beginPath();
  g.arc(cx, cy, cR, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const bez = g.createRadialGradient(
    cx - cR * 0.35,
    cy - cR * 0.4,
    cR * 0.5,
    cx,
    cy,
    cR,
  );
  bez.addColorStop(0, "rgba(255,240,190,0)");
  bez.addColorStop(0.85, "rgba(255,240,190,0.2)");
  bez.addColorStop(1, "rgba(40,20,4,0.5)");
  g.fillStyle = bez;
  g.beginPath();
  g.arc(cx, cy, cR, 0, Math.PI * 2);
  g.fill();
  for (const [rr, col, lw] of [
    [0.985, "rgba(40,20,4,0.6)", 0.012],
    [0.9, "rgba(255,240,190,0.5)", 0.008],
    [0.86, "rgba(40,20,4,0.55)", 0.012],
  ]) {
    g.strokeStyle = col;
    g.lineWidth = cR * lw;
    g.beginPath();
    g.arc(cx, cy, cR * rr, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const sx = cx + Math.cos(a) * cR * 0.93;
    const sy = cy + Math.sin(a) * cR * 0.93;
    const sg = g.createRadialGradient(
      sx - cR * 0.008,
      sy - cR * 0.008,
      0,
      sx,
      sy,
      cR * 0.028,
    );
    sg.addColorStop(0, "#fff0b8");
    sg.addColorStop(1, "#5a3a0c");
    g.fillStyle = sg;
    g.beginPath();
    g.arc(sx, sy, cR * 0.026, 0, Math.PI * 2);
    g.fill();
  }
  // the bowl: a dark inner lip, the card in it, the lip's shadow over it
  g.fillStyle = "#1e1004";
  g.beginPath();
  g.arc(cx, cy, r * 1.07, 0, Math.PI * 2);
  g.fill();
  paintCard(g, { x: cx, y: cy, r });
  const lip = g.createRadialGradient(
    cx - r * 0.1,
    cy - r * 0.15,
    r * 0.78,
    cx,
    cy,
    r * 1.02,
  );
  lip.addColorStop(0, "rgba(40,24,6,0)");
  lip.addColorStop(1, "rgba(40,24,6,0.6)");
  g.fillStyle = lip;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // the lubber line at its head
  g.fillStyle = gold(g, cx - r * 0.04, 0, cx + r * 0.04, 0);
  g.beginPath();
  g.moveTo(cx - r * 0.04, cy - r * 1.08);
  g.lineTo(cx + r * 0.04, cy - r * 1.08);
  g.lineTo(cx, cy - r * 0.92);
  g.closePath();
  g.fill();
  return { canvas: c, oy: cy / h };
}

// The compass card: ivory, ruled every degree — every five longer, every ten
// longer still — numbered every thirty, a rose faded to sepia with age so
// the needle is what stands out, the four winds lettered.
function paintCard(ctx, card) {
  const { x, y, r } = card;
  const fill = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r,
  );
  fill.addColorStop(0, "#fbf2dc");
  fill.addColorStop(0.8, "#ecdcb6");
  fill.addColorStop(1, "#d2bc8a");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const ink = "#2a1a10";
  const navy = "#1f2f5a";
  const red = "#a8231c";
  const at = (deg, rr) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
  };
  ctx.lineCap = "butt";
  for (let d = 0; d < 360; d++) {
    const long = d % 10 === 0;
    const mid = d % 5 === 0;
    const [x0, y0] = at(d, r * (long ? 0.86 : mid ? 0.9 : 0.94));
    const [x1, y1] = at(d, r * 0.985);
    ctx.strokeStyle = d % 90 === 0 ? red : ink;
    ctx.lineWidth = long ? Math.max(1.2, r * 0.011) : Math.max(0.6, r * 0.005);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  for (const rr of [0.985, 0.84, 0.72]) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.8, r * (rr === 0.72 ? 0.006 : 0.009));
    ctx.beginPath();
    ctx.arc(x, y, r * rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(r * 0.085)}px Georgia, "Times New Roman", serif`;
  for (let d = 0; d < 360; d += 30) {
    const [nx, ny] = at(d, r * 0.78);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate((d * Math.PI) / 180);
    ctx.fillStyle = d % 90 === 0 ? red : ink;
    ctx.fillText(String(d), 0, 0);
    ctx.restore();
  }
  const point = (deg, len, wid, light, dark) => {
    const [tx, ty] = at(deg, len);
    const [lx, ly] = at(deg - 90, wid);
    const [rx, ry] = at(deg + 90, wid);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(lx, ly);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(rx, ry);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
  };
  for (let d = 22.5; d < 360; d += 45)
    point(d, r * 0.3, r * 0.04, "#e6d8b8", "#c8b48a");
  for (let d = 45; d < 360; d += 90)
    point(d, r * 0.4, r * 0.06, "#ece2cc", "#b8a684");
  for (let d = 0; d < 360; d += 90)
    point(
      d,
      r * 0.54,
      r * 0.08,
      d === 0 ? "#ecd2c0" : "#efe6d2",
      d === 0 ? "#c09a84" : "#a8987a",
    );
  ctx.font = `700 ${Math.round(r * 0.11)}px Georgia, "Times New Roman", serif`;
  for (const [d, letter] of [
    [0, "N"],
    [90, "E"],
    [180, "S"],
    [270, "W"],
  ]) {
    const [lx, ly] = at(d, r * 0.63);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((d * Math.PI) / 180);
    ctx.fillStyle = d === 0 ? red : navy;
    ctx.fillText(letter, 0, 0);
    ctx.restore();
  }
  const sh = ctx.createRadialGradient(x, y, r * 0.8, x, y, r);
  sh.addColorStop(0, "rgba(60,36,10,0)");
  sh.addColorStop(1, "rgba(60,36,10,0.32)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// The needle: long and slender, its north half red and its south half
// steel-blue, a dark edge, a bright spine, a gold cap. Painted pointing up,
// its origin on the pivot; `shadow` paints its soft shadow instead.
function paintNeedle(r, shadow) {
  const len = r * 0.86;
  const tail = r * 0.66;
  const wid = r * 0.09;
  const pad = r * 0.06;
  const w = Math.ceil((wid * 2 + pad * 2) * R);
  const h = Math.ceil((len + tail + pad * 2) * R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = wid + pad;
  const cy = len + pad;
  const lozenge = () => {
    g.beginPath();
    g.moveTo(cx, cy - len);
    g.lineTo(cx + wid, cy);
    g.lineTo(cx, cy + tail);
    g.lineTo(cx - wid, cy);
    g.closePath();
  };
  if (shadow) {
    g.filter = `blur(${(r * 0.012).toFixed(1)}px)`;
    g.fillStyle = "rgba(20,10,4,0.45)";
    lozenge();
    g.fill();
    return { canvas: c, oy: cy / (len + tail + pad * 2) };
  }
  const half = (dir, light, dark) => {
    g.fillStyle = light;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx - wid, cy);
    g.lineTo(cx, cy + dir);
    g.closePath();
    g.fill();
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + wid, cy);
    g.lineTo(cx, cy + dir);
    g.closePath();
    g.fill();
  };
  half(-len, "#e8584a", "#a01c14");
  half(tail, "#6a7c9e", "#1e2a44");
  g.strokeStyle = "rgba(20,8,2,0.85)";
  g.lineWidth = Math.max(1, r * 0.008);
  lozenge();
  g.stroke();
  g.strokeStyle = "rgba(255,240,220,0.45)";
  g.lineWidth = Math.max(0.6, r * 0.004);
  g.beginPath();
  g.moveTo(cx, cy - len * 0.95);
  g.lineTo(cx, cy + tail * 0.9);
  g.stroke();
  const cap = g.createRadialGradient(
    cx - wid * 0.3,
    cy - wid * 0.3,
    0,
    cx,
    cy,
    wid * 0.85,
  );
  cap.addColorStop(0, "#fff0b8");
  cap.addColorStop(0.6, "#c9973c");
  cap.addColorStop(1, "#5a3a0c");
  g.fillStyle = cap;
  g.beginPath();
  g.arc(cx, cy, wid * 0.85, 0, Math.PI * 2);
  g.fill();
  return { canvas: c, oy: cy / (len + tail + pad * 2) };
}

// the glass over the card: a broad soft sheen, the lantern caught in it, a
// bright arc along its upper edge
function paintGlass(r) {
  const size = Math.ceil(r * 2 * R);
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.clip();
  const sheen = g.createLinearGradient(0, 0, r * 2, r * 2);
  sheen.addColorStop(0, "rgba(255,246,225,0.24)");
  sheen.addColorStop(0.35, "rgba(255,246,225,0.03)");
  sheen.addColorStop(1, "rgba(255,246,225,0)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, r * 2, r * 2);
  g.strokeStyle = "rgba(255,236,200,0.5)";
  g.lineWidth = r * 0.03;
  g.lineCap = "round";
  g.beginPath();
  g.arc(r, r, r * 0.9, Math.PI * 1.08, Math.PI * 1.4);
  g.stroke();
  const spot = g.createRadialGradient(
    r * 0.5,
    r * 0.42,
    0,
    r * 0.5,
    r * 0.42,
    r * 0.16,
  );
  spot.addColorStop(0, "rgba(255,220,160,0.55)");
  spot.addColorStop(1, "rgba(255,220,160,0)");
  g.fillStyle = spot;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
}

// ── the night, the lantern, the flame, the map ──────────────────────────────

// The night through the stern window, a little larger than the window so it
// can roll: sky, stars, the moon, a moonlit cloud or two, an island with its
// palms, the sea from the horizon (at the eye) to us. The moon's road is its
// own, to glitter.
function paintView(L) {
  const { win, vp } = L;
  const w = win.hw * 2 * 1.3;
  const h = (win.sill - win.top) * 1.4;
  const hy = vp.y - (win.cy - h / 2);
  const sky = makeCanvas(w, h);
  const g = sky.getContext("2d");
  const sg = g.createLinearGradient(0, 0, 0, hy);
  sg.addColorStop(0, "#010208");
  sg.addColorStop(0.6, "#040a18");
  sg.addColorStop(1, "#0a1428");
  g.fillStyle = sg;
  g.fillRect(0, 0, w, hy + 1);
  const rnd = lcg(2024);
  for (let i = 0; i < 45; i++) {
    g.fillStyle = `rgba(220,228,255,${(0.15 + rnd() * 0.4).toFixed(2)})`;
    g.beginPath();
    g.arc(rnd() * w, rnd() * hy * 0.85, 0.5 + rnd() * 1.1, 0, Math.PI * 2);
    g.fill();
  }
  const mx = w * 0.44;
  const my = hy * 0.68;
  const mr = win.hw * 0.08;
  soft(g, mx, my, mr * 5, mr * 5, "180,200,250", 0.22);
  const mg = g.createRadialGradient(
    mx - mr * 0.3,
    my - mr * 0.3,
    mr * 0.1,
    mx,
    my,
    mr,
  );
  mg.addColorStop(0, "#f4f2ea");
  mg.addColorStop(1, "#c8c2b0");
  g.fillStyle = mg;
  g.beginPath();
  g.arc(mx, my, mr, 0, Math.PI * 2);
  g.fill();
  for (const [cx, cy, cw, ch] of [
    [0.22, 0.32, 0.2, 0.06],
    [0.84, 0.66, 0.16, 0.05],
  ]) {
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * w * cw * 0.32;
      soft(
        g,
        w * cx + ox,
        hy * cy - Math.abs(ox) * 0.08,
        w * cw * 0.45,
        hy * ch * 1.5,
        "6,10,22",
        0.7,
      );
    }
    soft(
      g,
      w * cx,
      hy * cy + hy * ch * 0.6,
      w * cw,
      hy * ch * 0.6,
      "90,110,160",
      0.12,
    );
  }
  const ix = w * 0.25;
  const iw = w * 0.22;
  const ih = hy * 0.09;
  g.fillStyle = "#03060e";
  g.beginPath();
  g.moveTo(ix - iw / 2, hy + 1);
  g.bezierCurveTo(
    ix - iw * 0.32,
    hy - ih * 1.2,
    ix + iw * 0.05,
    hy - ih * 1.5,
    ix + iw / 2,
    hy + 1,
  );
  g.closePath();
  g.fill();
  const palm = (px, k, lean) => {
    const top = { x: px + lean * ih * 0.6, y: hy - ih * (1.05 + k) };
    g.strokeStyle = "#03060e";
    g.lineWidth = Math.max(1.2, ih * 0.1);
    g.beginPath();
    g.moveTo(px, hy - ih * 0.9);
    g.quadraticCurveTo(px + lean * ih * 0.1, top.y + ih * 0.4, top.x, top.y);
    g.stroke();
    g.fillStyle = "#03060e";
    for (const a of [-2.7, -2.1, -1.4, -0.9, -0.3]) {
      g.beginPath();
      g.moveTo(top.x, top.y);
      g.quadraticCurveTo(
        top.x + Math.cos(a) * ih * 0.5,
        top.y + Math.sin(a) * ih * 0.5 - ih * 0.12,
        top.x + Math.cos(a) * ih * 0.85,
        top.y + Math.sin(a) * ih * 0.55 + ih * 0.25,
      );
      g.quadraticCurveTo(
        top.x + Math.cos(a) * ih * 0.4,
        top.y + Math.sin(a) * ih * 0.3,
        top.x,
        top.y,
      );
      g.fill();
    }
  };
  palm(ix - iw * 0.08, 0.55, -1);
  palm(ix + iw * 0.06, 0.35, 1);
  const seaG = g.createLinearGradient(0, hy, 0, h);
  seaG.addColorStop(0, "#08142a");
  seaG.addColorStop(1, "#010309");
  g.fillStyle = seaG;
  g.fillRect(0, hy, w, h - hy);
  g.fillStyle = "rgba(150,170,220,0.18)";
  g.fillRect(0, hy - 0.5, w, 1.2);
  for (let i = 0; i < 80; i++) {
    const f = Math.pow(rnd(), 1.4);
    const yy = hy + 3 + f * (h - hy - 3);
    const len = 3 + f * w * 0.08;
    const xx = rnd() * w;
    g.strokeStyle = `rgba(110,140,200,${(0.05 + rnd() * 0.08).toFixed(2)})`;
    g.lineWidth = 0.6 + f * 1.2;
    g.beginPath();
    g.moveTo(xx, yy);
    g.quadraticCurveTo(xx + len / 2, yy - 1 - f * 2, xx + len, yy);
    g.stroke();
  }
  const glitter = makeCanvas(w, h);
  const gg = glitter.getContext("2d");
  soft(
    gg,
    mx,
    hy + (h - hy) * 0.4,
    w * 0.05,
    (h - hy) * 0.5,
    "200,215,250",
    0.14,
  );
  for (let i = 0; i < 90; i++) {
    const f = Math.pow(rnd(), 1.2);
    const yy = hy + 2 + f * (h - hy - 4);
    const spread = w * (0.01 + f * 0.09);
    const xx = mx + (rnd() - 0.5) * spread * 2;
    gg.fillStyle = `rgba(235,240,250,${(0.2 + rnd() * 0.4).toFixed(2)})`;
    gg.fillRect(xx, yy, 2 + f * 10 * rnd(), 0.8 + f * 1.4);
  }
  return { sky, glitter, w, h };
}

// a candle flame: white at the heart, gold, a little orange at its tip
function paintFlame() {
  const w = 32;
  const h = 72;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const path = (k) => {
    g.beginPath();
    g.moveTo(w / 2, h * (0.02 + (1 - k) * 0.3));
    g.bezierCurveTo(
      w * (0.5 + 0.42 * k),
      h * 0.45,
      w * (0.5 + 0.38 * k),
      h * 0.98,
      w / 2,
      h * 0.98,
    );
    g.bezierCurveTo(
      w * (0.5 - 0.38 * k),
      h * 0.98,
      w * (0.5 - 0.42 * k),
      h * 0.45,
      w / 2,
      h * (0.02 + (1 - k) * 0.3),
    );
    g.closePath();
  };
  path(1);
  const og = g.createLinearGradient(0, 0, 0, h);
  og.addColorStop(0, "rgba(255,120,40,0)");
  og.addColorStop(0.35, "rgba(255,150,50,0.85)");
  og.addColorStop(1, "rgba(255,190,90,0.95)");
  g.fillStyle = og;
  g.fill();
  path(0.6);
  g.fillStyle = "rgba(255,236,170,0.95)";
  g.fill();
  path(0.3);
  g.fillStyle = "#fffdf4";
  g.fill();
  return c;
}

// A ship's lantern on a short chain: a brass tank, a glass chimney full of
// flame behind its wire guards, a ventilated cap and a ring.
function paintLantern(lan) {
  const s = lan.s;
  const chain = lan.len;
  const bw = 34 * s;
  const w = Math.ceil(bw * 1.6 * R);
  const h = Math.ceil((chain + 80 * s) * R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = (bw * 1.6) / 2;
  g.strokeStyle = "#2c2418";
  g.lineWidth = Math.max(1.2, 2 * s);
  for (let y = 4 * s; y < chain - 4 * s; y += 7 * s) {
    g.beginPath();
    g.ellipse(cx, y, 2.2 * s, 3.6 * s, 0, 0, Math.PI * 2);
    g.stroke();
  }
  const top = chain;
  g.strokeStyle = "#5a4420";
  g.lineWidth = 2.4 * s;
  g.beginPath();
  g.arc(cx, top + 2 * s, 5 * s, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = gold(g, cx - bw * 0.5, 0, cx + bw * 0.5, 0);
  g.beginPath();
  g.moveTo(cx - bw * 0.2, top + 6 * s);
  g.lineTo(cx + bw * 0.2, top + 6 * s);
  g.lineTo(cx + bw * 0.55, top + 18 * s);
  g.lineTo(cx - bw * 0.55, top + 18 * s);
  g.closePath();
  g.fill();
  const gy0 = top + 18 * s;
  const gy1 = top + 56 * s;
  const glass = g.createRadialGradient(
    cx,
    (gy0 + gy1) / 2,
    1,
    cx,
    (gy0 + gy1) / 2,
    bw * 0.6,
  );
  glass.addColorStop(0, "#fff6d8");
  glass.addColorStop(0.35, "#ffcf7a");
  glass.addColorStop(1, "#b0602a");
  g.fillStyle = glass;
  g.beginPath();
  g.moveTo(cx - bw * 0.4, gy0);
  g.bezierCurveTo(
    cx - bw * 0.62,
    gy0 + 10 * s,
    cx - bw * 0.62,
    gy1 - 10 * s,
    cx - bw * 0.4,
    gy1,
  );
  g.lineTo(cx + bw * 0.4, gy1);
  g.bezierCurveTo(
    cx + bw * 0.62,
    gy1 - 10 * s,
    cx + bw * 0.62,
    gy0 + 10 * s,
    cx + bw * 0.4,
    gy0,
  );
  g.closePath();
  g.fill();
  g.fillStyle = "#fffdf0";
  g.beginPath();
  g.ellipse(cx, (gy0 + gy1) / 2 + 4 * s, 2.2 * s, 6 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#3a2a14";
  g.lineWidth = 1.4 * s;
  for (const f of [-0.42, 0, 0.42]) {
    g.beginPath();
    g.moveTo(cx + bw * f, gy0);
    g.quadraticCurveTo(cx + bw * f * 1.45, (gy0 + gy1) / 2, cx + bw * f, gy1);
    g.stroke();
  }
  g.fillStyle = gold(g, cx - bw * 0.55, 0, cx + bw * 0.55, 0);
  g.beginPath();
  g.moveTo(cx - bw * 0.48, gy1);
  g.lineTo(cx + bw * 0.48, gy1);
  g.lineTo(cx + bw * 0.55, gy1 + 14 * s);
  g.lineTo(cx - bw * 0.55, gy1 + 14 * s);
  g.closePath();
  g.fill();
  return { canvas: c, oy: 0, flameDrop: (gy0 + gy1) / 2 + 2 * s };
}

// The map, folded in three, lying a little askew on the table: old
// parchment, torn edges, a coast faint through it, a twine round it, a blob
// of red wax. Painted flat, then laid down in the table's perspective.
function paintFolded(L) {
  const m = L.map;
  const fw = m.flatW * 1.4;
  const fh = m.flatH * 1.7;
  const flat = makeCanvas(fw * R, fh * R);
  const g = flat.getContext("2d");
  g.scale(R, R);
  const x = fw / 2;
  const y = fh / 2;
  const w = m.flatW;
  const h = m.flatH;
  const hw = w / 2;
  const hh = h / 2;
  const rnd = lcg(515);
  soft(g, x + w * 0.05, y + h * 0.16, w * 0.62, h * 0.68, "0,0,0", 0.7);
  g.save();
  g.translate(x, y);
  g.rotate(-0.07);
  const piece = (xa, xb) => {
    const pts = [];
    const jag = () => (rnd() - 0.5) * h * 0.035;
    for (let k = 0; k <= 10; k++)
      pts.push([xa + ((xb - xa) * k) / 10, -hh + jag()]);
    for (let k = 1; k <= 6; k++)
      pts.push([xb + jag() * 0.5, -hh + (h * k) / 6]);
    for (let k = 10; k >= 0; k--)
      pts.push([xa + ((xb - xa) * k) / 10, hh + jag()]);
    for (let k = 5; k >= 1; k--) pts.push([xa + jag(), -hh + (h * k) / 6]);
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
  };
  const parchment = (k) => {
    const pg = g.createLinearGradient(-hw, -hh, hw, hh);
    pg.addColorStop(0, rgb(226 * k, 200 * k, 148 * k));
    pg.addColorStop(0.55, rgb(204 * k, 168 * k, 108 * k));
    pg.addColorStop(1, rgb(156 * k, 118 * k, 66 * k));
    return pg;
  };
  piece(-hw, hw);
  g.fillStyle = parchment(1);
  g.fill();
  g.strokeStyle = "rgba(96,60,22,0.55)";
  g.lineWidth = 1.2;
  g.stroke();
  g.save();
  g.clip();
  for (let k = 0; k < 6; k++)
    soft(
      g,
      (rnd() - 0.5) * w,
      (rnd() - 0.5) * h,
      w * (0.08 + rnd() * 0.12),
      h * (0.1 + rnd() * 0.2),
      "110,70,24",
      0.14,
    );
  g.strokeStyle = "rgba(80,48,18,0.16)";
  g.lineWidth = 1.4;
  g.beginPath();
  for (let k = 0; k <= 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    const rr = h * 0.24 * (0.8 + 0.2 * Math.sin(a * 3 + 2));
    const px = -hw * 0.45 + Math.cos(a) * rr * 1.4;
    const py = h * 0.08 + Math.sin(a) * rr;
    if (k) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
  g.strokeStyle = "rgba(90,56,20,0.4)";
  g.beginPath();
  g.moveTo(-hw / 3, -hh);
  g.lineTo(-hw / 3 + 1, hh);
  g.stroke();
  g.restore();
  soft(g, hw / 3 - w * 0.01, 0, w * 0.035, hh * 1.05, "40,20,4", 0.5);
  piece(hw / 3, hw * 1.01);
  g.fillStyle = parchment(1.06);
  g.fill();
  g.strokeStyle = "rgba(96,60,22,0.55)";
  g.stroke();
  g.strokeStyle = "#7a5a30";
  g.lineWidth = Math.max(1.5, h * 0.03);
  g.beginPath();
  g.moveTo(-hw * 1.02, h * 0.02);
  g.quadraticCurveTo(0, -h * 0.03, hw * 1.02, h * 0.01);
  g.stroke();
  const sr = Math.min(w, h) * 0.12;
  const sx = hw / 3;
  const sgr = g.createRadialGradient(sx - sr * 0.3, -sr * 0.3, 0, sx, 0, sr);
  sgr.addColorStop(0, "#e04a38");
  sgr.addColorStop(0.7, "#9a1c14");
  sgr.addColorStop(1, "#4a0806");
  g.fillStyle = sgr;
  g.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = sr * (0.92 + (i % 2) * 0.1);
    if (i) g.lineTo(sx + Math.cos(a) * rr, Math.sin(a) * rr);
    else g.moveTo(sx + Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.fill();
  g.restore();
  const c = makeCanvas(fw * (m.w / m.flatW) * R, fh * (m.h / m.flatH) * R);
  c.getContext("2d").drawImage(flat, 0, 0, c.width, c.height);
  return c;
}

// The map, unfolded: old parchment with its fold creases and stains, an
// island in the corner with a dotted way to an X, a north mark; the lines of
// bearings are the scene's text, written where `lines` says.
function paintSheet(L) {
  const { W, H } = L;
  const w = Math.min(W * 0.72, H * 1.05, 820);
  const h = w * 0.68;
  const c = makeCanvas(w * R, h * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const rnd = lcg(4242);
  const edge = [];
  const jag = () => (rnd() - 0.5) * w * 0.012;
  for (let x = 0; x <= w; x += w / 40) edge.push([x, h * 0.02 + jag()]);
  for (let y = 0; y <= h; y += h / 28) edge.push([w * 0.985 + jag(), y]);
  for (let x = w; x >= 0; x -= w / 40) edge.push([x, h * 0.98 + jag()]);
  for (let y = h; y >= 0; y -= h / 28) edge.push([w * 0.015 + jag(), y]);
  g.beginPath();
  edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  const paper = g.createRadialGradient(
    w * 0.45,
    h * 0.45,
    w * 0.1,
    w * 0.5,
    h * 0.5,
    w * 0.62,
  );
  paper.addColorStop(0, "#f4e6c2");
  paper.addColorStop(0.7, "#e2c995");
  paper.addColorStop(1, "#b8955c");
  g.fillStyle = paper;
  g.fill();
  g.save();
  g.clip();
  for (let i = 0; i < 14; i++)
    soft(
      g,
      rnd() * w,
      rnd() * h,
      w * (0.04 + rnd() * 0.1),
      h * (0.03 + rnd() * 0.08),
      "140,96,40",
      0.08 + rnd() * 0.07,
    );
  for (const [x0, y0, x1, y1] of [
    [w / 2, 0, w / 2, h],
    [0, h / 2, w, h / 2],
  ]) {
    g.strokeStyle = "rgba(110,76,34,0.35)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.strokeStyle = "rgba(255,248,226,0.4)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0 + 1.5, y0 + 1.5);
    g.lineTo(x1 + 1.5, y1 + 1.5);
    g.stroke();
  }
  const ix = w * 0.78;
  const iy = h * 0.74;
  const ir = w * 0.13;
  g.fillStyle = "rgba(196,160,96,0.55)";
  g.strokeStyle = "rgba(70,44,18,0.85)";
  g.lineWidth = 1.6;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = ir * (0.78 + 0.22 * Math.sin(a * 3 + 1) * Math.cos(a * 2));
    const px = ix + Math.cos(a) * rr * 1.25;
    const py = iy + Math.sin(a) * rr * 0.7;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.setLineDash([3, 4]);
  g.strokeStyle = "rgba(90,30,16,0.85)";
  g.beginPath();
  g.moveTo(ix - ir * 1.6, iy + ir * 0.6);
  g.bezierCurveTo(
    ix - ir * 1.0,
    iy + ir * 0.5,
    ix - ir * 0.5,
    iy + ir * 0.1,
    ix + ir * 0.4,
    iy - ir * 0.08,
  );
  g.stroke();
  g.setLineDash([]);
  const xx = ix + ir * 0.5;
  const xy = iy - ir * 0.05;
  const xs = ir * 0.16;
  g.strokeStyle = "#a01c14";
  g.lineWidth = Math.max(2, w * 0.006);
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(xx - xs, xy - xs);
  g.lineTo(xx + xs, xy + xs);
  g.moveTo(xx + xs, xy - xs);
  g.lineTo(xx - xs, xy + xs);
  g.stroke();
  const nx = w * 0.88;
  const ny = h * 0.16;
  const nr = w * 0.035;
  g.strokeStyle = "rgba(70,44,18,0.85)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(nx, ny, nr, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(160,28,20,0.9)";
  g.beginPath();
  g.moveTo(nx, ny - nr * 1.25);
  g.lineTo(nx + nr * 0.3, ny);
  g.lineTo(nx - nr * 0.3, ny);
  g.closePath();
  g.fill();
  g.font = `700 ${Math.round(nr * 0.8)}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "rgba(70,44,18,0.85)";
  g.fillText("N", nx, ny - nr * 1.75);
  g.restore();
  g.strokeStyle = "rgba(110,70,28,0.5)";
  g.lineWidth = 2;
  g.beginPath();
  edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.stroke();
  const lines = COMPASS_BEARINGS.map((_, i) => ({ y: h * (0.17 + i * 0.13) }));
  return { canvas: c, w, h, lines, textX: w * 0.08 };
}

// ── helpers ─────────────────────────────────────────────────────────────────

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

let NOISE = null;
function grain(ctx, W, H, alpha) {
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
  ctx.fillStyle = ctx.createPattern(NOISE, "repeat");
  ctx.fillRect(0, 0, W, H);
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

const rgb = (r, g, b) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

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
