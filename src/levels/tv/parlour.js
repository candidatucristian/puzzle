/** The parlour for TV, painted the way the telescope's nursery is: a dark
 *  storybook room at night. Night-blue wallpaper sprigged with little gold
 *  stars under a shadowed ceiling and a picture rail, boards running back to
 *  the wall, a deep red rug with a gold border laid where the set stands.
 *  A tall plant in a terracotta pot to the left of it; to the right a small
 *  round table with a lamp still lit under its shade, a cup beside it, and
 *  two framed pictures on the wall above each. The set itself is the DOM
 *  cabinet (TVScene) standing on its splayed legs on the rug; its screen
 *  lights the wall behind and the floor in front, and the lamp warms the
 *  right-hand side.
 *
 *  Painted once per screen size onto one canvas. What lives stays out of
 *  the painting: the scene breathes the lamp's `glow`, flickers the screen's
 *  `light` on the wall and its `pool` on the floor, and drifts the `motes`
 *  through that light. `tv` is the set's box in canvas coordinates: centre,
 *  scale, and the edges and feet derived from it. */

const ROOM = "tv_room";
const LIGHT = "tv_light";
const POOL = "tv_pool";
const GLOW = "tv_lamp";

export function layoutParlour(W, H, tv) {
  const { cx, cy, s } = tv;
  const S = Math.min(W, H);
  const left = cx - 300 * s;
  const right = cx + 300 * s;
  const top = cy - 240 * s;
  const bottom = cy + 240 * s;
  const feet = cy + 316 * s;
  const floorY = H * 0.63;
  const side = 54 * s; // how far the plant and the table stand off the set
  const table = { x: right + side, top: feet - 150 * s, r: 46 * s, h: 150 * s };
  const lamp = { x: table.x, y: table.top - 118 * s, shadeW: 64 * s };
  return {
    W,
    H,
    S,
    s,
    cx,
    cy,
    left,
    right,
    top,
    bottom,
    feet,
    floorY,
    rug: { cx, cy: feet + 12 * s, rx: 400 * s, ry: 74 * s },
    plant: { x: left - side, base: feet + 2 * s, h: 250 * s },
    table,
    lamp,
    frames: [
      { x: left - side, y: H * 0.27, w: 78 * s, h: 96 * s, tilt: -0.03, seed: 5 },
      { x: right + side, y: H * 0.26, w: 90 * s, h: 72 * s, tilt: 0.025, seed: 11 },
    ],
  };
}

export function paintParlour(scene, L) {
  const { W, H } = L;
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  paintWall(ctx, L);
  paintFloor(ctx, L);
  paintRug(ctx, L);
  paintFrames(ctx, L);
  paintPlant(ctx, L);
  paintTable(ctx, L);
  finish(ctx, L);

  const t = scene.textures;
  addCanvas(t, ROOM, cv);
  addCanvas(
    t,
    LIGHT,
    radial(256, "170,196,255", [
      [0, 0.5],
      [0.35, 0.18],
      [0.7, 0.04],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    POOL,
    radial(256, "186,206,255", [
      [0, 0.42],
      [0.4, 0.14],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    GLOW,
    radial(128, "255,188,108", [
      [0, 0.85],
      [0.2, 0.45],
      [0.55, 0.12],
      [1, 0],
    ]),
  );
  return { room: ROOM, light: LIGHT, pool: POOL, glow: GLOW };
}

export function releaseParlourArt(textures) {
  for (const key of [ROOM, LIGHT, POOL, GLOW]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// ── the room ────────────────────────────────────────────────────────────────

// night-blue wallpaper sprigged with gold stars, the screen's cold light on
// it behind the set and the lamp's warm light to the right
function paintWall(ctx, L) {
  const { W, H, S, floorY, cx, cy, s, lamp } = L;
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, "#0b0f21");
  g.addColorStop(0.55, "#141b34");
  g.addColorStop(1, "#10162a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, floorY);
  const step = Math.max(14, S * 0.045);
  ctx.fillStyle = "rgba(255,255,255,0.016)";
  for (let x = step / 2; x < W; x += step * 2)
    ctx.fillRect(x, 0, step * 0.9, floorY);
  for (let row = 0, y = step * 0.5; y < floorY; y += step, row++) {
    for (let x = (row % 2) * step * 0.5; x < W; x += step) {
      if ((row + Math.round(x / step)) % 3 === 0)
        star(ctx, x, y, step * 0.1, "rgba(214,186,120,0.14)");
      else {
        ctx.fillStyle = "rgba(214,186,120,0.09)";
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.6, step * 0.025), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // the screen's cold light, spread on the wall behind the set
  soft(ctx, cx, cy - 20 * s, 520 * s, 380 * s, "110,140,210", 0.22, "lighter");
  // the lamp's warmth on the wall beside it
  soft(ctx, lamp.x, lamp.y + 10 * s, S * 0.22, S * 0.2, "255,170,90", 0.2, "lighter");
  // the ceiling's shadow and the picture rail
  const ceil = ctx.createLinearGradient(0, 0, 0, H * 0.13);
  ceil.addColorStop(0, "rgba(0,0,0,0.6)");
  ceil.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ceil;
  ctx.fillRect(0, 0, W, H * 0.13);
  ctx.fillStyle = "#1b1712";
  ctx.fillRect(0, H * 0.075, W, Math.max(2, S * 0.006));
  ctx.fillStyle = "rgba(170,190,240,0.18)";
  ctx.fillRect(0, H * 0.075, W, 1);
}

// the boards, running back to the wall, and the skirting along it
function paintFloor(ctx, L) {
  const { W, H, S, floorY, cx, feet, s } = L;
  const g = ctx.createLinearGradient(0, floorY, 0, H);
  g.addColorStop(0, "#1d1812");
  g.addColorStop(0.5, "#271d15");
  g.addColorStop(1, "#1a120c");
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY, W, H - floorY);
  const vp = { x: W / 2, y: H * 0.3 };
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  for (let i = -18; i <= 18; i++) {
    const bx = W / 2 + i * W * 0.07;
    const t = (floorY - vp.y) / (H - vp.y);
    ctx.beginPath();
    ctx.moveTo(vp.x + (bx - vp.x) * t, floorY);
    ctx.lineTo(bx, H);
    ctx.stroke();
  }
  const rnd = lcg(515);
  for (let i = 0; i < 240; i++) {
    const y = floorY + rnd() * (H - floorY);
    ctx.fillStyle =
      rnd() < 0.6 ? "rgba(0,0,0,0.12)" : "rgba(255,210,160,0.035)";
    ctx.fillRect(rnd() * W, y, 4 + rnd() * 24, 1);
  }
  // the screen's light lying on the floor in front of the set
  soft(ctx, cx, feet + 20 * s, 380 * s, 70 * s, "150,176,240", 0.14, "lighter");
  // skirting
  ctx.fillStyle = "#17110c";
  ctx.fillRect(0, floorY - S * 0.022, W, S * 0.022);
  ctx.fillStyle = "rgba(160,180,230,0.16)";
  ctx.fillRect(0, floorY - S * 0.022, W, 1);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, floorY, W, 2);
}

// an oval rug, deep red with a gold and navy border and a star in the middle
function paintRug(ctx, L) {
  const { rug, S } = L;
  const { cx, cy, rx, ry } = rug;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = S * 0.012;
  ctx.fillStyle = "#58201c";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const [k, col, w] of [
    [0.95, "#b88a3e", 2.2],
    [0.88, "#1d2a4a", 4],
    [0.82, "#b88a3e", 1.4],
  ]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * k, ry * k, 0, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, (w * S) / 900);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(184,138,62,0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.2, ry * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#58201c";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.14, ry * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  star(ctx, cx, cy, ry * 0.16, "rgba(214,176,98,0.8)");
  // the fringe on the two ends
  ctx.strokeStyle = "rgba(220,200,160,0.35)";
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    for (let i = -6; i <= 6; i++) {
      const a = i * 0.045;
      const x = cx + side * rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * ry * 0.16, y + 1);
      ctx.stroke();
    }
  }
}

// two framed pictures: a little night landscape under a moon, a sailing boat
function paintFrames(ctx, L) {
  const { S } = L;
  for (const f of L.frames) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.tilt);
    const { w, h } = f;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    const fg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fg.addColorStop(0, "#c9a35a");
    fg.addColorStop(0.5, "#7a5a28");
    fg.addColorStop(1, "#b8924a");
    ctx.fillStyle = fg;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    const b = Math.max(3, S * 0.008);
    const pg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    pg.addColorStop(0, "#0a1024");
    pg.addColorStop(0.7, "#1b2a4e");
    pg.addColorStop(1, "#0e1628");
    ctx.fillStyle = pg;
    ctx.fillRect(-w / 2 + b, -h / 2 + b, w - b * 2, h - b * 2);
    const rnd = lcg(f.seed * 131);
    // a small moon and its stars, hills under them
    const mx = -w * 0.2 + rnd() * w * 0.4;
    const my = -h * 0.25;
    soft(ctx, mx, my, w * 0.2, w * 0.2, "200,215,255", 0.4, "lighter");
    ctx.fillStyle = "#f2eedf";
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(1.5, w * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eeff";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(
        -w / 2 + b + rnd() * (w - b * 2),
        -h / 2 + b + rnd() * h * 0.45,
        Math.max(0.5, S * 0.0012),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#0a1020";
    ctx.beginPath();
    ctx.moveTo(-w / 2 + b, h / 2 - b);
    for (let x = -w / 2 + b; x <= w / 2 - b; x += 3) {
      const u = (x + w / 2) / w;
      ctx.lineTo(x, h * 0.12 + Math.sin(u * 6 + f.seed) * h * 0.08);
    }
    ctx.lineTo(w / 2 - b, h / 2 - b);
    ctx.closePath();
    ctx.fill();
    // the glass
    const gl = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gl.addColorStop(0, "rgba(255,255,255,0.1)");
    gl.addColorStop(0.5, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(-w / 2 + b, -h / 2 + b, w - b * 2, h - b * 2);
    ctx.restore();
  }
}

// a tall plant in a terracotta pot, its leaves catching the screen's light
function paintPlant(ctx, L) {
  const { plant, S, s } = L;
  const { x, base, h } = plant;
  const pw = 58 * s;
  const ph = 54 * s;
  soft(ctx, x + pw, base, pw * 1.6, ph * 0.3, "0,0,0", 0.5);
  ctx.fillStyle = "#8a4a2a";
  ctx.beginPath();
  ctx.moveTo(x - pw / 2, base - ph);
  ctx.lineTo(x + pw / 2, base - ph);
  ctx.lineTo(x + pw * 0.38, base);
  ctx.lineTo(x - pw * 0.38, base);
  ctx.closePath();
  ctx.fill();
  const pg = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
  pg.addColorStop(0, "rgba(0,0,0,0.35)");
  pg.addColorStop(0.55, "rgba(255,200,160,0.12)");
  pg.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(x - pw / 2, base - ph);
  ctx.lineTo(x + pw / 2, base - ph);
  ctx.lineTo(x + pw * 0.38, base);
  ctx.lineTo(x - pw * 0.38, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a45a34";
  ctx.fillRect(x - pw * 0.56, base - ph, pw * 1.12, ph * 0.2);
  ctx.fillStyle = "rgba(255,210,170,0.22)";
  ctx.fillRect(x - pw * 0.56, base - ph, pw * 1.12, Math.max(1, S * 0.002));
  // stems fanning up, each with a long leaf
  const rnd = lcg(77);
  const top = base - ph;
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 1.5;
    const len = h * (0.45 + rnd() * 0.55);
    const ex = x + Math.cos(a) * len;
    const ey = top + Math.sin(a) * len;
    const bend = (rnd() - 0.5) * len * 0.5;
    ctx.strokeStyle = "#2a4a30";
    ctx.lineWidth = Math.max(1, s * 2.2);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.quadraticCurveTo(x + bend, top + (ey - top) * 0.5, ex, ey);
    ctx.stroke();
    // the leaf: a long pointed blade, lit along its left edge by the screen
    const lw = h * (0.07 + rnd() * 0.05);
    const ll = h * (0.22 + rnd() * 0.14);
    const la = a + (rnd() - 0.5) * 0.6;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(la + Math.PI / 2);
    const lg = ctx.createLinearGradient(-lw, 0, lw, 0);
    lg.addColorStop(0, "#5a8a5a");
    lg.addColorStop(0.45, "#2e5e3a");
    lg.addColorStop(1, "#1b3a26");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-lw, -ll * 0.45, 0, -ll);
    ctx.quadraticCurveTo(lw, -ll * 0.45, 0, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,240,210,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -ll * 0.9);
    ctx.stroke();
    ctx.restore();
  }
}

// a round side table with a lamp lit under its shade and a cup beside it
function paintTable(ctx, L) {
  const { table, lamp, S, s, feet } = L;
  const { x, top, r, h } = table;
  soft(ctx, x, feet + 6 * s, r * 1.6, r * 0.3, "0,0,0", 0.5);
  // the pedestal and its three feet
  ctx.fillStyle = "#2a1c12";
  for (const dx of [-0.55, 0, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x, top + h * 0.55);
    ctx.lineTo(x + dx * r, feet);
    ctx.lineTo(x + dx * r + 6 * s, feet);
    ctx.lineTo(x + 3 * s, top + h * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  const sg = ctx.createLinearGradient(x - 6 * s, 0, x + 6 * s, 0);
  sg.addColorStop(0, "#5a3e28");
  sg.addColorStop(0.5, "#8a6440");
  sg.addColorStop(1, "#2a1c12");
  ctx.fillStyle = sg;
  ctx.fillRect(x - 6 * s, top + r * 0.2, 12 * s, h * 0.5);
  // the top, an ellipse with a lit rim toward the lamp
  ctx.fillStyle = "#2a1c12";
  ctx.beginPath();
  ctx.ellipse(x, top + r * 0.22, r, r * 0.3, 0, 0, Math.PI);
  ctx.lineTo(x - r, top + r * 0.1);
  ctx.fill();
  const tg = ctx.createRadialGradient(x, top + r * 0.1, 0, x, top + r * 0.1, r);
  tg.addColorStop(0, "#8a6440");
  tg.addColorStop(1, "#4a3220");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(x, top + r * 0.1, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,200,140,0.35)";
  ctx.lineWidth = Math.max(1, S * 0.002);
  ctx.stroke();
  // the cup, with a curl of steam
  const cx = x + r * 0.55;
  const cy = top + r * 0.12;
  ctx.fillStyle = "#e8dcc0";
  ctx.fillRect(cx - 7 * s, cy - 16 * s, 14 * s, 16 * s);
  ctx.strokeStyle = "#e8dcc0";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(cx + 9 * s, cy - 9 * s, 4 * s, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(cx - 7 * s, cy - 16 * s, 14 * s, 2 * s);
  // the lamp: a brass stem and base, a cream shade lit from inside
  const { shadeW } = lamp;
  const ly = lamp.y;
  const bg = ctx.createLinearGradient(x - 12 * s, 0, x + 12 * s, 0);
  bg.addColorStop(0, "#fbe3a0");
  bg.addColorStop(0.4, "#c8a050");
  bg.addColorStop(1, "#5a3e18");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(x, top + r * 0.1, 14 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 2.5 * s, ly + 30 * s, 5 * s, top + r * 0.1 - ly - 30 * s);
  soft(ctx, x, ly + 8 * s, shadeW * 1.3, shadeW * 1.1, "255,190,110", 0.5, "lighter");
  const shade = ctx.createLinearGradient(x - shadeW / 2, 0, x + shadeW / 2, 0);
  shade.addColorStop(0, "#c8905a");
  shade.addColorStop(0.35, "#ffd9a0");
  shade.addColorStop(0.7, "#ffcf8a");
  shade.addColorStop(1, "#a86a38");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(x - shadeW * 0.3, ly - 30 * s);
  ctx.lineTo(x + shadeW * 0.3, ly - 30 * s);
  ctx.lineTo(x + shadeW * 0.5, ly + 30 * s);
  ctx.lineTo(x - shadeW * 0.5, ly + 30 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,200,0.5)";
  ctx.fillRect(x - shadeW * 0.3, ly - 30 * s, shadeW * 0.6, Math.max(1, s));
  ctx.fillStyle = "rgba(90,50,20,0.5)";
  ctx.fillRect(x - shadeW * 0.5, ly + 29 * s, shadeW, Math.max(1, s * 1.5));
  // the bulb's light under the shade's rim
  soft(ctx, x, ly + 34 * s, shadeW * 0.5, 10 * s, "255,230,170", 0.6, "lighter");
}

function finish(ctx, L) {
  const { W, H } = L;
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.46,
    R * 0.36,
    W / 2,
    H * 0.46,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(4,5,12,0)");
  v.addColorStop(1, "rgba(4,5,12,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function star(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

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
