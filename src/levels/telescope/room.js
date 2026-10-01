import { archGeo, paintSkyOn, paintWindowOn, openingPath } from "./window.js";

/** The room with the telescope, painted like a storybook nursery at night:
 *  the arched window in the far wall — the very same window as the close-up,
 *  sheer curtains tied back with gold, the moonlit valley beyond — and a
 *  brass-banded telescope on its wooden tripod, aimed out of it. A lantern
 *  burns on the sill. Shelves of books on the left, star charts pinned up
 *  on the right over a little desk and chair, a rug on the boards, and the
 *  moon laying the window's shape across the floor.
 *
 *  Painted once per size onto one canvas, added (centred) to the scene's
 *  sketch container; the lantern's flame flickers on top of it. Everything
 *  keeps the old sketch's layout, so the telescope is exactly where the
 *  scene's click test looks for it. Returns the box, in the container's
 *  coordinates, where the scene may twinkle stars: open sky, clear of the
 *  moon, the curtains and the telescope. */

const ROOM = "tele_room";
const GLOW = "tele_room_glow";

export function drawRoom(scene, sk, W, H) {
  const geo = roomWindow(W, H);
  const lantern = { x: W * 0.6, y: geo.sillY + geo.stool.depth * 0.5 };
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  const X = (f) => W * f;
  const Y = (f) => H * f;
  const S = Math.min(W, H);

  paintWall(ctx, W, H, Y, geo, lantern);
  paintFloor(ctx, W, H, X, Y, S);
  paintMoonPool(ctx, X, Y, S);
  paintWindow(ctx, geo);
  paintShelves(ctx, X, Y, W, H, S);
  paintCharts(ctx, X, Y, W, H, S);
  paintDesk(ctx, X, Y, S);
  paintSillProps(ctx, X, geo, lantern, H, S);
  paintTelescope(ctx, X, Y, W, S);
  finish(ctx, W, H);

  addCanvas(scene.textures, ROOM, cv);
  if (!scene.textures.exists(GLOW))
    scene.textures.addCanvas(
      GLOW,
      radial(64, "255,196,120", [
        [0, 0.8],
        [0.3, 0.3],
        [1, 0],
      ]),
    );
  const img = scene.add.image(-W / 2, -H / 2, ROOM).setOrigin(0, 0);
  sk.add(img);

  // the lantern's flame, never quite still
  const flame = scene.add
    .image(lantern.x - W / 2, lantern.y - H * 0.022 - H / 2, GLOW)
    .setDisplaySize(S * 0.09, S * 0.09)
    .setBlendMode("ADD")
    .setAlpha(0.6);
  sk.add(flame);
  const flicker = () => {
    if (!flame.active) return;
    scene.tweens.add({
      targets: flame,
      alpha: 0.45 + Math.random() * 0.3,
      duration: 90 + Math.random() * 260,
      onComplete: flicker,
    });
  };
  flicker();

  // where the stars may twinkle (the scene pads this box by 40 px across
  // and 20/60 px down — undone here)
  const c = geo.content;
  const x0 = c.x0;
  const x1 = Math.max(x0, Math.min(c.x1, X(0.52)));
  const y0 = c.y0;
  const y1 = Math.max(y0, Math.min(c.y1, Y(0.44)));
  return {
    wl: x0 - 40 - W / 2,
    wr: x1 + 40 - W / 2,
    archCY: y0 + 20 - H / 2,
    sillY: y1 + 60 - H / 2,
  };
}

// the window in the far wall: the old sketch's arch, given the close-up's
// whole geometry
function roomWindow(W, H) {
  const archCX = W * 0.5;
  const archCY = H * 0.33;
  const archRX = W * 0.16;
  const archRY = H * 0.15;
  const sillY = H * 0.62;
  const top = archCY - archRY;
  const S = archRX * 1.25;
  return archGeo({
    W,
    H,
    S,
    V: S,
    Wv: archRX / 0.455,
    archCX,
    archCY,
    archRX,
    archRY,
    sillY,
    eye: { x: archCX, y: top + (sillY - top) * 0.565 },
    moon: {
      x: archCX + archRX * 0.3,
      y: top + (sillY - top) * 0.21,
      r: archRX * 0.085,
    },
    horizonY: top + (sillY - top) * 0.9,
    K: 0.96,
  });
}

// ── the room ────────────────────────────────────────────────────────────────

// night-blue wallpaper sprigged with little gold stars, lifted by the moon
// round the window and warmed by the lantern
function paintWall(ctx, W, H, Y, geo, lantern) {
  const floorY = Y(0.745);
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, "#0c1122");
  g.addColorStop(0.6, "#151d36");
  g.addColorStop(1, "#11172a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, floorY);
  const S = Math.min(W, H);
  const step = Math.max(14, S * 0.045);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = step / 2; x < W; x += step * 2)
    ctx.fillRect(x, 0, step * 0.9, floorY);
  for (let row = 0, y = step * 0.5; y < floorY; y += step, row++) {
    for (let x = (row % 2) * step * 0.5; x < W; x += step)
      star(ctx, x, y, step * 0.09, "rgba(214,186,120,0.13)");
  }
  soft(
    ctx,
    geo.archCX,
    geo.archCY + geo.archRY * 0.3,
    W * 0.42,
    H * 0.5,
    "70,92,150",
    0.22,
    "lighter",
  );
  soft(
    ctx,
    lantern.x,
    lantern.y - H * 0.02,
    S * 0.2,
    S * 0.18,
    "255,170,90",
    0.18,
    "lighter",
  );
  // the picture rail under the ceiling's shadow
  const ceil = ctx.createLinearGradient(0, 0, 0, H * 0.12);
  ceil.addColorStop(0, "rgba(0,0,0,0.55)");
  ceil.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ceil;
  ctx.fillRect(0, 0, W, H * 0.12);
  ctx.fillStyle = "#1b1712";
  ctx.fillRect(0, H * 0.075, W, Math.max(2, S * 0.006));
  ctx.fillStyle = "rgba(170,190,240,0.18)";
  ctx.fillRect(0, H * 0.075, W, 1);
}

// the boards, running away to the window wall, a skirting along it, a rug
function paintFloor(ctx, W, H, X, Y, S) {
  const floorY = Y(0.745);
  const g = ctx.createLinearGradient(0, floorY, 0, H);
  g.addColorStop(0, "#1f1914");
  g.addColorStop(1, "#2b2017");
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY, W, H - floorY);
  const vp = { x: W / 2, y: H * 0.42 };
  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = 1;
  for (let i = -18; i <= 18; i++) {
    const bx = W / 2 + i * W * 0.07;
    const t = (floorY - vp.y) / (H - vp.y);
    ctx.beginPath();
    ctx.moveTo(vp.x + (bx - vp.x) * t, floorY);
    ctx.lineTo(bx, H);
    ctx.stroke();
  }
  const rnd = lcg(808);
  for (let i = 0; i < 260; i++) {
    const y = floorY + rnd() * (H - floorY);
    ctx.fillStyle =
      rnd() < 0.6 ? "rgba(0,0,0,0.12)" : "rgba(255,210,160,0.035)";
    ctx.fillRect(rnd() * W, y, 4 + rnd() * 24, 1);
  }
  // skirting
  ctx.fillStyle = "#1a130e";
  ctx.fillRect(0, floorY - S * 0.022, W, S * 0.022);
  ctx.fillStyle = "rgba(160,180,230,0.16)";
  ctx.fillRect(0, floorY - S * 0.022, W, 1);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, floorY, W, 2);
  // the rug: deep red, a gold and navy border, fringed at both ends
  const rug = [
    { x: X(0.33), y: Y(0.8) },
    { x: X(0.71), y: Y(0.8) },
    { x: X(0.75), y: Y(0.915) },
    { x: X(0.29), y: Y(0.915) },
  ];
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = S * 0.01;
  poly(ctx, rug);
  ctx.fillStyle = "#5a1f1c";
  ctx.fill();
  ctx.restore();
  const inset = (k) => {
    const c = { x: (rug[0].x + rug[2].x) / 2, y: (rug[0].y + rug[2].y) / 2 };
    return rug.map((p) => ({
      x: c.x + (p.x - c.x) * k,
      y: c.y + (p.y - c.y) * k,
    }));
  };
  for (const [k, col, w] of [
    [0.94, "#b88a3e", 2.2],
    [0.86, "#1d2a4a", 4],
    [0.8, "#b88a3e", 1.4],
  ]) {
    poly(ctx, inset(k));
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, (w * S) / 900);
    ctx.stroke();
  }
  const mid = inset(0.5);
  const cx = (mid[0].x + mid[2].x) / 2;
  const cy = (mid[0].y + mid[2].y) / 2;
  ctx.fillStyle = "rgba(184,138,62,0.55)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, X(0.06), Y(0.022), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a1f1c";
  ctx.beginPath();
  ctx.ellipse(cx, cy, X(0.04), Y(0.013), 0, 0, Math.PI * 2);
  ctx.fill();
  star(ctx, cx, cy, Y(0.01), "rgba(214,176,98,0.8)");
  ctx.strokeStyle = "rgba(220,200,160,0.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 24; i++) {
    const x = rug[3].x + ((rug[2].x - rug[3].x) * i) / 24;
    ctx.beginPath();
    ctx.moveTo(x, rug[3].y);
    ctx.lineTo(x - 1, rug[3].y + Y(0.014));
    ctx.stroke();
  }
}

// the moon through the window, laid across the floor in front of it
function paintMoonPool(ctx, X, Y, S) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cx = X(0.47);
  const top = Y(0.775);
  const bottom = Y(0.97);
  const w0 = X(0.12);
  const w1 = X(0.2);
  for (const [k, a] of [
    [1.12, 0.03],
    [1, 0.05],
    [0.9, 0.05],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx - w1 * k, bottom);
    ctx.lineTo(cx - w0 * k, top + (bottom - top) * 0.25);
    ctx.quadraticCurveTo(
      cx,
      top - (bottom - top) * 0.15 * k,
      cx + w0 * k,
      top + (bottom - top) * 0.25,
    );
    ctx.lineTo(cx + w1 * k, bottom);
    ctx.closePath();
    ctx.fillStyle = `rgba(150,175,235,${a})`;
    ctx.fill();
  }
  ctx.restore();
  // the telescope's shadow lying across it
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineCap = "round";
  ctx.lineWidth = S * 0.018;
  ctx.beginPath();
  ctx.moveTo(X(0.45), Y(0.97));
  ctx.lineTo(X(0.49), Y(0.83));
  ctx.stroke();
  ctx.lineWidth = S * 0.006;
  for (const dx of [-0.05, 0.04]) {
    ctx.beginPath();
    ctx.moveTo(X(0.49), Y(0.83));
    ctx.lineTo(X(0.49 + dx), Y(0.9));
    ctx.stroke();
  }
  ctx.restore();
}

// the window: the sky clipped into the opening, the moon, then the window
// itself — the close-up's own painters, at the room's size
function paintWindow(ctx, geo) {
  ctx.save();
  openingPath(ctx, geo);
  ctx.clip();
  paintSkyOn(ctx, geo);
  const m = geo.moon;
  soft(ctx, m.x, m.y, m.r * 3, m.r * 3, "190,205,245", 0.25, "lighter");
  const body = ctx.createRadialGradient(
    m.x - m.r * 0.3,
    m.y - m.r * 0.3,
    m.r * 0.1,
    m.x,
    m.y,
    m.r,
  );
  body.addColorStop(0, "#f6f2e6");
  body.addColorStop(0.75, "#ded8c6");
  body.addColorStop(1, "#b4ad9a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  ctx.fill();
  soft(
    ctx,
    m.x - m.r * 0.3,
    m.y - m.r * 0.15,
    m.r * 0.3,
    m.r * 0.22,
    "110,110,120",
    0.25,
  );
  soft(
    ctx,
    m.x + m.r * 0.25,
    m.y + m.r * 0.2,
    m.r * 0.28,
    m.r * 0.2,
    "110,110,120",
    0.2,
  );
  ctx.restore();
  paintWindowOn(ctx, geo);
}

// two shelves of books on the left wall, a little plant on the top one
function paintShelves(ctx, X, Y, W, H, S) {
  const cols = [
    "#7a2e2a",
    "#2e4a6a",
    "#6a5a2a",
    "#2e5a44",
    "#5a3a6a",
    "#8a5a2a",
    "#3a3a52",
  ];
  const rnd = lcg(600);
  for (const [fy, n] of [
    [0.26, 6],
    [0.38, 5],
  ]) {
    const sy = Y(fy);
    const x0 = X(0.075);
    const x1 = X(0.205);
    const th = Math.max(3, S * 0.008);
    for (let i = 0; i < n; i++) {
      const bw = W * (0.012 + rnd() * 0.005);
      const bx = X(0.088) + i * W * 0.017 + rnd() * 3;
      const bh = H * (0.03 + rnd() * 0.018);
      const lean = i === n - 1 ? 0.18 : 0;
      ctx.save();
      ctx.translate(bx, sy);
      ctx.rotate(lean);
      const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      const c = cols[(i + n) % cols.length];
      g.addColorStop(0, shade(c, 1.25));
      g.addColorStop(0.5, c);
      g.addColorStop(1, shade(c, 0.6));
      ctx.fillStyle = g;
      ctx.fillRect(-bw / 2, -bh, bw, bh);
      ctx.fillStyle = "rgba(214,176,98,0.6)";
      ctx.fillRect(-bw / 2, -bh * 0.82, bw, Math.max(1, bh * 0.04));
      ctx.fillRect(-bw / 2, -bh * 0.22, bw, Math.max(1, bh * 0.04));
      ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x0 + S * 0.004, sy + th, x1 - x0, S * 0.01);
    const sg = ctx.createLinearGradient(0, sy, 0, sy + th);
    sg.addColorStop(0, "#5a3e28");
    sg.addColorStop(1, "#2e1f14");
    ctx.fillStyle = sg;
    ctx.fillRect(x0, sy, x1 - x0, th);
    ctx.fillStyle = "rgba(160,180,230,0.25)";
    ctx.fillRect(x0, sy, x1 - x0, 1);
    for (const bx of [X(0.085), X(0.195)]) {
      ctx.fillStyle = "#2a1d12";
      ctx.beginPath();
      ctx.moveTo(bx - S * 0.003, sy + th);
      ctx.lineTo(bx + S * 0.003, sy + th);
      ctx.lineTo(bx + S * 0.003, sy + th + H * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  }
  // the plant: a terracotta pot, leaves spilling over
  const px = X(0.115);
  const py = Y(0.26);
  const pw = S * 0.022;
  const ph = S * 0.024;
  ctx.fillStyle = "#8a4a2a";
  ctx.beginPath();
  ctx.moveTo(px - pw / 2, py - ph);
  ctx.lineTo(px + pw / 2, py - ph);
  ctx.lineTo(px + pw * 0.38, py);
  ctx.lineTo(px - pw * 0.38, py);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a45a34";
  ctx.fillRect(px - pw * 0.56, py - ph, pw * 1.12, ph * 0.22);
  leaves(ctx, px, py - ph, S * 0.03, lcg(91));
}

// star charts pinned to the right wall
function paintCharts(ctx, X, Y, W, H, S) {
  for (const [fx, fy, tilt, seed] of [
    [0.83, 0.27, 0.04, 3],
    [0.885, 0.33, -0.06, 9],
  ]) {
    const pw = W * 0.032;
    const ph = H * 0.055;
    const cx = X(fx) + pw / 2;
    const cy = Y(fy) + ph / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-pw / 2 + 2, -ph / 2 + 3, pw, ph);
    const pg = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
    pg.addColorStop(0, "#d8ccaa");
    pg.addColorStop(1, "#b8a882");
    ctx.fillStyle = pg;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = "rgba(20,30,60,0.75)";
    ctx.fillRect(-pw * 0.4, -ph * 0.38, pw * 0.8, ph * 0.66);
    const rnd = lcg(seed * 77);
    const pts = [];
    for (let i = 0; i < 6; i++)
      pts.push({
        x: (rnd() - 0.5) * pw * 0.66,
        y: -ph * 0.32 + rnd() * ph * 0.54,
      });
    ctx.strokeStyle = "rgba(214,190,120,0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.fillStyle = "#f0e0b0";
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, S * 0.0015), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(60,40,20,0.5)";
    ctx.fillRect(-pw * 0.3, ph * 0.36, pw * 0.6, Math.max(1, ph * 0.03));
    ctx.fillStyle = "#b8342c";
    ctx.beginPath();
    ctx.arc(0, -ph * 0.46, Math.max(1.5, S * 0.003), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// a little desk with books and a globe, and its chair with a round back
function paintDesk(ctx, X, Y, S) {
  const top = Y(0.585);
  const x0 = X(0.79);
  const x1 = X(0.955);
  const th = Math.max(4, S * 0.012);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x0 + S * 0.01, Y(0.76) - S * 0.004, x1 - x0, S * 0.008);
  for (const lx of [x0 + S * 0.01, x1 - S * 0.02]) {
    const lg = ctx.createLinearGradient(lx, 0, lx + S * 0.01, 0);
    lg.addColorStop(0, "#3e2a1a");
    lg.addColorStop(1, "#1e140c");
    ctx.fillStyle = lg;
    ctx.fillRect(lx, top + th, S * 0.01, Y(0.76) - top - th);
  }
  ctx.fillStyle = "#2a1c12";
  ctx.fillRect(x0 + S * 0.01, top + th, x1 - x0 - S * 0.02, S * 0.025);
  ctx.fillStyle = "#c9a35a";
  ctx.fillRect(
    (x0 + x1) / 2 - S * 0.004,
    top + th + S * 0.01,
    S * 0.008,
    S * 0.004,
  );
  const tg = ctx.createLinearGradient(0, top, 0, top + th);
  tg.addColorStop(0, "#6a4a30");
  tg.addColorStop(1, "#3a2818");
  ctx.fillStyle = tg;
  ctx.fillRect(x0, top, x1 - x0, th);
  ctx.fillStyle = "rgba(170,190,240,0.22)";
  ctx.fillRect(x0, top, x1 - x0, 1);
  // books, lying flat
  for (const [bx, by, bw, col] of [
    [0.815, 0.575, 0.045, "#2e4a6a"],
    [0.818, 0.565, 0.037, "#7a2e2a"],
  ]) {
    ctx.fillStyle = col;
    ctx.fillRect(X(bx), Y(by), X(bw), Y(0.01));
    ctx.fillStyle = "rgba(230,220,190,0.5)";
    ctx.fillRect(X(bx) + X(bw) * 0.05, Y(by) + Y(0.0035), X(bw) * 0.9, 1);
  }
  // a globe on its stand
  const gx = X(0.925);
  const gr = S * 0.022;
  const gy = top - gr * 1.45;
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(gx - gr * 0.5, top - gr * 0.25, gr, gr * 0.25);
  ctx.fillRect(gx - 1, top - gr * 0.5, 2, gr * 0.3);
  const glb = ctx.createRadialGradient(
    gx - gr * 0.35,
    gy - gr * 0.35,
    gr * 0.1,
    gx,
    gy,
    gr,
  );
  glb.addColorStop(0, "#6a9ab8");
  glb.addColorStop(1, "#1e3a52");
  ctx.fillStyle = glb;
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(170,150,90,0.6)";
  for (const [dx, dy, rx, ry] of [
    [-0.3, -0.2, 0.3, 0.2],
    [0.25, 0.25, 0.22, 0.3],
  ]) {
    ctx.beginPath();
    ctx.ellipse(
      gx + dx * gr,
      gy + dy * gr,
      rx * gr,
      ry * gr,
      0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = "#c9a35a";
  ctx.lineWidth = Math.max(1, S * 0.002);
  ctx.beginPath();
  ctx.arc(gx, gy, gr * 1.15, Math.PI * 0.6, Math.PI * 2.1);
  ctx.stroke();
  // the chair
  const cx = X(0.885);
  const cy = Y(0.635);
  const cr = Y(0.026);
  const wood = "#4a3220";
  ctx.strokeStyle = wood;
  ctx.lineWidth = Math.max(2, S * 0.006);
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, S * 0.003);
  for (const dx of [-0.4, 0, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * cr, cy - Math.sqrt(1 - dx * dx) * cr);
    ctx.lineTo(cx + dx * cr, cy + Math.sqrt(1 - dx * dx) * cr);
    ctx.stroke();
  }
  ctx.fillStyle = "#3a2616";
  ctx.fillRect(cx - cr * 1.25, cy + cr * 1.1, cr * 2.5, S * 0.01);
  ctx.fillStyle = "rgba(170,190,240,0.2)";
  ctx.fillRect(cx - cr * 1.25, cy + cr * 1.1, cr * 2.5, 1);
  ctx.lineWidth = Math.max(2, S * 0.005);
  for (const [a, b] of [
    [-1.1, -1.3],
    [1.1, 1.3],
    [-0.5, -0.55],
    [0.5, 0.55],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx + a * cr, cy + cr * 1.1 + S * 0.01);
    ctx.lineTo(cx + b * cr, Y(0.79));
    ctx.stroke();
  }
}

// on the sill: a lantern, lit, and a potted plant
function paintSillProps(ctx, X, geo, lantern, H, S) {
  const lx = lantern.x;
  const ly = lantern.y;
  const lw = S * 0.016;
  const lh = H * 0.045;
  soft(
    ctx,
    lx,
    ly - lh * 0.45,
    S * 0.07,
    S * 0.07,
    "255,176,96",
    0.35,
    "lighter",
  );
  soft(ctx, lx, ly, S * 0.06, S * 0.012, "255,176,96", 0.4, "lighter");
  const glass = ctx.createLinearGradient(0, ly - lh, 0, ly);
  glass.addColorStop(0, "#ffd890");
  glass.addColorStop(1, "#f09a48");
  ctx.fillStyle = glass;
  ctx.fillRect(lx - lw / 2, ly - lh * 0.85, lw, lh * 0.75);
  ctx.fillStyle = "#fff2cc";
  ctx.beginPath();
  ctx.ellipse(lx, ly - lh * 0.42, lw * 0.12, lh * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1810";
  ctx.fillRect(lx - lw * 0.6, ly - lh * 0.1, lw * 1.2, lh * 0.1);
  ctx.fillRect(lx - lw * 0.6, ly - lh * 0.9, lw * 1.2, lh * 0.08);
  for (const dx of [-0.5, 0.5])
    ctx.fillRect(lx + dx * lw - 1, ly - lh * 0.9, 2, lh * 0.8);
  ctx.beginPath();
  ctx.moveTo(lx - lw * 0.55, ly - lh * 0.9);
  ctx.lineTo(lx, ly - lh * 1.1);
  ctx.lineTo(lx + lw * 0.55, ly - lh * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1c1810";
  ctx.lineWidth = Math.max(1, S * 0.002);
  ctx.beginPath();
  ctx.arc(lx, ly - lh * 1.15, lw * 0.25, Math.PI, 0);
  ctx.stroke();
  // the plant
  const px = X(0.645);
  const py = ly;
  const pw = S * 0.024;
  const ph = H * 0.03;
  ctx.fillStyle = "#8a4a2a";
  ctx.beginPath();
  ctx.moveTo(px - pw / 2, py - ph);
  ctx.lineTo(px + pw / 2, py - ph);
  ctx.lineTo(px + pw * 0.36, py);
  ctx.lineTo(px - pw * 0.36, py);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,170,100,0.35)";
  ctx.fillRect(px - pw / 2, py - ph, pw * 0.25, ph);
  ctx.fillStyle = "#a45a34";
  ctx.fillRect(px - pw * 0.55, py - ph, pw * 1.1, ph * 0.2);
  leaves(ctx, px, py - ph, S * 0.034, lcg(17));
  void geo;
}

// the telescope: a navy tube with brass bands on a wooden tripod, aimed out
// of the window — exactly where the scene's click test finds it
function paintTelescope(ctx, X, Y, W, S) {
  const eye = { x: X(0.472), y: Y(0.505) };
  const obj = { x: X(0.615), y: Y(0.345) };
  const dx = obj.x - eye.x;
  const dy = obj.y - eye.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const tw = W * 0.011;
  const at = (t, off = 0) => ({
    x: eye.x + dx * t + nx * off,
    y: eye.y + dy * t + ny * off,
  });
  const hub = { x: X(0.535), y: Y(0.575) };
  const bm = at(0.55);

  // the tripod: three wooden legs with brass feet, a tray between them
  const feet = [
    { x: X(0.465), y: Y(0.875) },
    { x: X(0.605), y: Y(0.875) },
    { x: X(0.545), y: Y(0.895) },
  ];
  const leg = (f, w) => {
    const lx = f.x - hub.x;
    const ly = f.y - hub.y;
    const l = Math.hypot(lx, ly);
    const px = -ly / l;
    const py = lx / l;
    const g = ctx.createLinearGradient(
      hub.x + px * w,
      hub.y + py * w,
      hub.x - px * w,
      hub.y - py * w,
    );
    g.addColorStop(0, "#8a5e38");
    g.addColorStop(0.5, "#5a3a22");
    g.addColorStop(1, "#2e1d10");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hub.x + px * w * 0.7, hub.y + py * w * 0.7);
    ctx.lineTo(f.x + px * w * 0.45, f.y + py * w * 0.45);
    ctx.lineTo(f.x - px * w * 0.45, f.y - py * w * 0.45);
    ctx.lineTo(hub.x - px * w * 0.7, hub.y - py * w * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#b8924a";
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, w * 0.6, w * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    soft(ctx, f.x + w, f.y + w * 0.3, w * 2.5, w * 0.6, "0,0,0", 0.5);
  };
  leg(feet[0], S * 0.009);
  leg(feet[1], S * 0.009);
  const tray = [0, 1, 2].map((i) => ({
    x: hub.x + (feet[i].x - hub.x) * 0.5,
    y: hub.y + (feet[i].y - hub.y) * 0.5,
  }));
  poly(ctx, tray);
  ctx.fillStyle = "#4a3020";
  ctx.fill();
  ctx.strokeStyle = "#b8924a";
  ctx.lineWidth = Math.max(1, S * 0.002);
  ctx.stroke();
  leg(feet[2], S * 0.01);
  // the mount: a brass head on the tripod, a stalk up to the tube
  ctx.strokeStyle = "#2a2a30";
  ctx.lineWidth = S * 0.008;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hub.x, hub.y);
  ctx.lineTo(bm.x, bm.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,180,140,0.35)";
  ctx.lineWidth = Math.max(1, S * 0.002);
  ctx.beginPath();
  ctx.moveTo(hub.x - S * 0.003, hub.y);
  ctx.lineTo(bm.x - S * 0.003, bm.y);
  ctx.stroke();
  const hg = ctx.createRadialGradient(
    hub.x - S * 0.006,
    hub.y - S * 0.006,
    1,
    hub.x,
    hub.y,
    S * 0.016,
  );
  hg.addColorStop(0, "#f0d590");
  hg.addColorStop(0.5, "#a8823e");
  hg.addColorStop(1, "#4a3618");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hub.x, hub.y, S * 0.014, 0, Math.PI * 2);
  ctx.fill();

  // the tube: tapered, lacquered navy, lit along its top by the moon and
  // warmed from below by the lantern
  const half = (t) => tw * (1 + 0.25 * t);
  const side = (sgn) => {
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push(at(i / 20, sgn * half(i / 20)));
    return pts;
  };
  const top = side(-1);
  const bot = side(1);
  const tube = top.concat(bot.slice().reverse());
  const g = ctx.createLinearGradient(
    at(0.5, -tw * 1.3).x,
    at(0.5, -tw * 1.3).y,
    at(0.5, tw * 1.3).x,
    at(0.5, tw * 1.3).y,
  );
  g.addColorStop(0, "#8ea4d8");
  g.addColorStop(0.18, "#34497e");
  g.addColorStop(0.55, "#1a2648");
  g.addColorStop(0.85, "#121a30");
  g.addColorStop(1, "#5a3a24");
  poly(ctx, tube);
  ctx.fillStyle = g;
  ctx.fill();
  // brass: the eyepiece end, a band at the balance, the dew shield
  const band = (t0, t1, grow) => {
    const pts = [
      at(t0, -half(t0) * grow),
      at(t1, -half(t1) * grow),
      at(t1, half(t1) * grow),
      at(t0, half(t0) * grow),
    ];
    const bg = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[3].x, pts[3].y);
    bg.addColorStop(0, "#fbe3a0");
    bg.addColorStop(0.3, "#c8a050");
    bg.addColorStop(0.7, "#7a5a28");
    bg.addColorStop(1, "#3a2810");
    poly(ctx, pts);
    ctx.fillStyle = bg;
    ctx.fill();
  };
  band(0.0, 0.07, 1.05);
  band(0.52, 0.58, 1.12);
  band(0.88, 1.0, 1.32);
  // the lens, catching the moon
  const lensC = at(1);
  ctx.save();
  ctx.translate(lensC.x, lensC.y);
  ctx.rotate(Math.atan2(uy, ux));
  ctx.fillStyle = "#0a1020";
  ctx.beginPath();
  ctx.ellipse(0, 0, half(1) * 0.35, half(1) * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(200,220,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    -half(1) * 0.4,
    half(1) * 0.12,
    half(1) * 0.32,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
  // the eyepiece, past the end of the tube, and the focus knobs
  const e0 = at(0, 0);
  const e1 = at(-0.07, 0);
  ctx.strokeStyle = "#a8823e";
  ctx.lineWidth = tw * 1.1;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(e0.x, e0.y);
  ctx.lineTo(e1.x, e1.y);
  ctx.stroke();
  ctx.strokeStyle = "#141414";
  ctx.lineWidth = tw * 1.35;
  const e2 = at(-0.1, 0);
  ctx.beginPath();
  ctx.moveTo(e1.x, e1.y);
  ctx.lineTo(e2.x, e2.y);
  ctx.stroke();
  for (const sgn of [1]) {
    const k = at(0.12, sgn * half(0.12) * 1.6);
    const kg = ctx.createRadialGradient(
      k.x - 1,
      k.y - 1,
      0.5,
      k.x,
      k.y,
      tw * 0.45,
    );
    kg.addColorStop(0, "#fbe3a0");
    kg.addColorStop(1, "#6a4a20");
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.arc(k.x, k.y, tw * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  // the finder: a slim tube riding on top
  const f0 = at(0.2, -half(0.2) * 1.9);
  const f1 = at(0.42, -half(0.42) * 1.9);
  ctx.strokeStyle = "#1a2648";
  ctx.lineWidth = tw * 0.55;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(f0.x, f0.y);
  ctx.lineTo(f1.x, f1.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(160,180,230,0.6)";
  ctx.lineWidth = Math.max(1, tw * 0.12);
  ctx.beginPath();
  ctx.moveTo(at(0.2, -half(0.2) * 2.1).x, at(0.2, -half(0.2) * 2.1).y);
  ctx.lineTo(at(0.42, -half(0.42) * 2.1).x, at(0.42, -half(0.42) * 2.1).y);
  ctx.stroke();
  for (const t of [0.25, 0.37]) {
    const a = at(t, -half(t));
    const b = at(t, -half(t) * 1.7);
    ctx.strokeStyle = "#a8823e";
    ctx.lineWidth = Math.max(1, tw * 0.25);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // the moon's line along its top
  ctx.strokeStyle = "rgba(200,215,255,0.55)";
  ctx.lineWidth = Math.max(1, S * 0.0018);
  ctx.beginPath();
  top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

function finish(ctx, W, H) {
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.48,
    R * 0.38,
    W / 2,
    H * 0.48,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(4,5,12,0)");
  v.addColorStop(1, "rgba(4,5,12,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function leaves(ctx, x, y, r, rnd) {
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6;
    const l = r * (0.6 + rnd() * 0.5);
    const ex = x + Math.cos(a) * l;
    const ey = y + Math.sin(a) * l * 0.9;
    ctx.fillStyle = rnd() < 0.5 ? "#2e5a3a" : "#3e6e46";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a - 0.5) * l * 0.6,
      y + Math.sin(a - 0.5) * l * 0.6,
      ex,
      ey,
    );
    ctx.quadraticCurveTo(
      x + Math.cos(a + 0.5) * l * 0.6,
      y + Math.sin(a + 0.5) * l * 0.6,
      x,
      y,
    );
    ctx.fill();
  }
}

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

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.min(255, Math.round(v * k)),
  );
  return `rgb(${c.join(",")})`;
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
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
