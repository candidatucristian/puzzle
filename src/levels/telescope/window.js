import {
  trackPoint,
  mirrorPoint,
  curtainLines,
  curtainOutline,
  innerEdgeAt,
} from "./windowFrame.js";

/** The close-up: the very same arched window from the room sketch, its
 *  sheer curtains tied back, now as tall as the screen — as though you'd
 *  stepped through the eyepiece and up to the sill. Painted once per size
 *  onto two canvases: the night sky behind (the scene's moon and stars sit
 *  on top of it) and everything in front of the sky — the valley, the depth
 *  of the wall, the frame and the curtains — with the opening left clear.
 *
 *  Returns { geo, backdrop, frame }. geo.content is the clear stretch of sky
 *  between the curtains where the Braille cells may sit (hover boxes
 *  included), geo.moon is where the moon hangs, and geo.inSky(x, y) tells
 *  whether a point is open sky (for scattering the background stars). */

const SKY_KEY = "tele_sky";
const FRONT_KEY = "tele_front";
const TIE = 28; // sample index of the tie-back along each fold line
const SHADOW = "#121622"; // stone turned away from the moon
const LIT = "#3b4868"; // stone in full moonlight

export function drawWindow(scene, W, H) {
  const geo = layoutWindow(W, H);
  addCanvas(scene.textures, SKY_KEY, paintSky(geo));
  addCanvas(scene.textures, FRONT_KEY, paintFront(geo));
  const backdrop = scene.add.image(0, 0, SKY_KEY).setOrigin(0, 0).setDepth(0);
  const frame = scene.add.image(0, 0, FRONT_KEY).setOrigin(0, 0).setDepth(3);
  return { geo, backdrop, frame };
}

/** Frees the two painted canvases — call once their images are destroyed. */
export function releaseWindowArt(textures) {
  for (const key of [SKY_KEY, FRONT_KEY]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

function addCanvas(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

// ── geometry ────────────────────────────────────────────────────────────────

function layoutWindow(W, H) {
  const S = Math.min(W, H);
  const lw = Math.max(1, S / 800);

  // the arch: as wide as the screen allows but never flatter than about
  // 0.42 : 1, and at most a true semicircle (portrait screens)
  const archRX = Math.min(W * 0.455, (H * 0.4) / 0.42);
  const archRY = Math.min(H * 0.4, archRX);
  const archCX = W / 2;
  const archCY = H * 0.045 + archRY;
  const wl = archCX - archRX;
  const wr = archCX + archRX;
  const sillY = H * 0.885;
  const trim = Math.max(10, S * 0.028);

  // the reveal — the thickness of the wall, seen in perspective: the far
  // edge of the opening is the near one pulled toward the eye by K
  const eye = { x: W / 2, y: H * 0.52 };
  const K = 0.95;
  const toHole = (p) => ({
    x: eye.x + (p.x - eye.x) * K,
    y: eye.y + (p.y - eye.y) * K,
  });
  const hole = {
    cx: eye.x + (archCX - eye.x) * K,
    cy: eye.y + (archCY - eye.y) * K,
    rx: archRX * K,
    ry: archRY * K,
    bottom: eye.y + (sillY - eye.y) * K,
  };
  hole.wl = hole.cx - hole.rx;
  hole.wr = hole.cx + hole.rx;
  hole.top = hole.cy - hole.ry;
  const inHole = (x, y, m = 0) => {
    if (x < hole.wl + m || x > hole.wr - m || y > hole.bottom - m) return false;
    if (y >= hole.cy) return true;
    const ex = (x - hole.cx) / (hole.rx - m);
    const ey = (y - hole.cy) / (hole.ry - m);
    return ex * ex + ey * ey <= 1;
  };

  // the inner sill board, jutting into the room under the opening
  const stool = { depth: H * 0.016, face: H * 0.022, ear: trim + S * 0.022 };

  // where the moon hangs — the scene puts its moon image here
  const moon = { x: W * 0.63, y: H * 0.19, r: S * 0.062 };

  // the valley beyond: a far ridge and a nearer, darker one
  const horizonY = H * 0.8;
  const far = (x) => {
    const u = x / W;
    return (
      horizonY -
      H *
        (0.03 +
          0.014 * Math.sin(u * 7.1 + 1.3) +
          0.009 * Math.sin(u * 15.7 + 0.4) +
          0.004 * Math.sin(u * 31 + 2.2))
    );
  };
  const near = (x) => {
    const u = x / W;
    return (
      horizonY +
      H *
        (0.016 -
          0.011 * Math.sin(u * 4.3 + 2.6) -
          0.005 * Math.sin(u * 11.9 + 1.1))
    );
  };

  // the curtains hang from a rod just outside the arch, over the trim, and
  // are tied back a little under halfway down the jambs
  const off = trim * 0.45;
  const curtain = {
    trackCX: archCX,
    trackCY: archCY,
    trackRX: archRX + off,
    trackRY: archRY + off,
    heading: 0.4,
    tieX: wl - off,
    tieY: archCY + (sillY - archCY) * 0.4,
    gather: S * 0.06,
    tilt: S * 0.012,
    hemX: wl - off,
    hemY: sillY + stool.depth * 0.4,
    hemW: S * 0.15,
    hemWave: S * 0.005,
  };
  const folds = curtainLines(curtain, 13, TIE, 24);
  const edgeAt = (y) => innerEdgeAt(folds, y);

  // the clear sky between the curtains, under the moon and above the far
  // ridge: where the Braille cells, hover boxes and all, may sit
  const gap = S * 0.02;
  const inner = folds[folds.length - 1].pts;
  const edgeMax = (ya, yb) => {
    let m = -Infinity;
    for (const p of inner) if (p.y >= ya && p.y <= yb) m = Math.max(m, p.x);
    for (const y of [ya, yb]) {
      const e = edgeAt(y);
      if (e !== null) m = Math.max(m, e);
    }
    return m;
  };
  const ridgeTop = (xa, xb) => {
    let m = Infinity;
    for (let x = xa; x <= xb; x += 4) m = Math.min(m, far(x));
    return m;
  };
  let y0 = moon.y + moon.r * 1.55;
  let y1 = ridgeTop(hole.wl, hole.wr) - gap;
  let x0 = hole.wl + gap;
  for (let pass = 0; pass < 3; pass++) {
    x0 = Math.max(hole.wl + gap, edgeMax(y0, y1) + gap);
    y1 = ridgeTop(x0, W - x0) - gap;
    while (y0 < y1 - S * 0.2 && !inHole(x0, y0, gap)) y0 += 2;
  }
  const content = { x0, x1: W - x0, y0, y1 };

  // open sky: in the opening, above the far ridge and clear of the curtains
  const inSky = (x, y, m = S * 0.012) => {
    if (!inHole(x, y, m) || y > far(x) - m) return false;
    const e = edgeAt(y);
    return e === null || (x > e + m && x < W - e - m);
  };

  return {
    W,
    H,
    S,
    lw,
    archCX,
    archCY,
    archRX,
    archRY,
    wl,
    wr,
    sillY,
    trim,
    eye,
    toHole,
    hole,
    inHole,
    stool,
    moon,
    horizonY,
    far,
    near,
    curtain,
    folds,
    edgeAt,
    content,
    inSky,
  };
}

// ── behind the sky ──────────────────────────────────────────────────────────

function paintSky(geo) {
  const { W, H, S, lw, hole, moon, horizonY, content } = geo;
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  const rnd = lcg(7919);

  // night: near-black at the crown, deep blue down by the hills
  const sky = ctx.createLinearGradient(0, hole.top, 0, horizonY);
  sky.addColorStop(0, "#03060e");
  sky.addColorStop(0.42, "#071028");
  sky.addColorStop(0.78, "#0f1c3b");
  sky.addColorStop(1, "#1b2b4f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // the last of the light low over the hills, and the moon's own wash
  softEllipse(ctx, W / 2, horizonY, W * 0.62, H * 0.2, "64,88,142", 0.3);
  softEllipse(ctx, moon.x, moon.y, moon.r * 8, moon.r * 8, "150,172,232", 0.13);
  softEllipse(
    ctx,
    moon.x,
    moon.y,
    moon.r * 2.6,
    moon.r * 2.6,
    "172,192,242",
    0.12,
  );

  // a faint river of light over the top of the arch — it fades out before
  // the moon and above the cells, so it never muddies a reading
  const P0 = { x: hole.cx - hole.rx * 0.9, y: hole.cy - hole.ry * 0.55 };
  const P1 = { x: hole.cx - hole.rx * 0.55, y: hole.top - hole.ry * 0.05 };
  const P2 = { x: hole.cx + hole.rx * 0.05, y: hole.top + hole.ry * 0.12 };
  const band = (t, off) => {
    const p = qpt(P0, P1, P2, t);
    const d = norm(
      2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x),
      2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y),
    );
    return { x: p.x - d.y * off, y: p.y + d.x * off };
  };
  const fade = (x, y, t) =>
    Math.pow(Math.sin(Math.PI * t), 0.6) *
    clamp01(Math.hypot(x - moon.x, y - moon.y) / (moon.r * 5) - 0.4) *
    clamp01((content.y0 - y) / (S * 0.06));
  for (let i = 0; i < 90; i++) {
    const t = i / 89;
    const q = band(t, (rnd() - 0.5) * S * 0.07);
    const a = (0.018 + rnd() * 0.03) * fade(q.x, q.y, t);
    const rx = S * (0.03 + rnd() * 0.05);
    const ry = S * (0.02 + rnd() * 0.035);
    if (a > 0.002) softEllipse(ctx, q.x, q.y, rx, ry, "150,168,220", a);
  }

  // dust: stars too faint to twinkle, thickest along that river and
  // fainter still where the cells sit
  const dust = (x, y, a) => {
    ctx.fillStyle = `rgba(215,225,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, (0.35 + rnd() * 0.5) * lw, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 360; i++) {
    const t = rnd();
    const q = band(t, gauss(rnd) * S * 0.035);
    const a = (0.1 + rnd() * 0.22) * fade(q.x, q.y, t);
    if (a > 0.01) dust(q.x, q.y, a);
  }
  const n = Math.round((W * H) / 2400);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = hole.top + rnd() * (horizonY - hole.top);
    const cells =
      x > content.x0 && x < content.x1 && y > content.y0 && y < content.y1;
    dust(x, y, (0.08 + rnd() * 0.22) * (cells ? 0.35 : 1));
  }

  grain(ctx, W, H, 0.028, "source-over");
  return cv;
}

// ── in front of the sky ─────────────────────────────────────────────────────

function paintFront(geo) {
  const { W, H, hole } = geo;
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  const rnd = lcg(4471);

  // the valley, only where the opening shows it
  ctx.save();
  ctx.beginPath();
  opening(ctx, hole, hole.bottom + 1);
  ctx.clip();
  paintValley(ctx, geo, rnd);
  ctx.restore();

  // the wall, with the opening cut out of it
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  opening(ctx, hole, hole.bottom, true);
  ctx.clip("evenodd");
  paintWall(ctx, geo);
  ctx.restore();

  paintReveal(ctx, geo);
  paintTrim(ctx, geo);
  paintStool(ctx, geo);
  paintPencil(ctx, geo, rnd);
  paintRod(ctx, geo);
  paintCurtain(ctx, geo, false);
  paintCurtain(ctx, geo, true);

  // a gentle vignette and a little grain, on the painted parts only
  const R = Math.hypot(W, H) / 2;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.45,
    R * 0.4,
    W / 2,
    H * 0.45,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  grain(ctx, W, H, 0.03, "source-atop");
  return cv;
}

function paintValley(ctx, geo, rnd) {
  const { W, H, S, lw, hole, far, near, horizonY, content } = geo;
  const xa = hole.wl - 4;
  const xb = hole.wr + 4;
  const yb = hole.bottom + 4;
  const step = Math.max(2, W / 480);
  const ridge = (f, dy) => {
    ctx.beginPath();
    ctx.moveTo(xa, f(xa) + dy);
    for (let x = xa + step; x < xb + step; x += step) ctx.lineTo(x, f(x) + dy);
  };
  const land = (f, style) => {
    ridge(f, 0);
    ctx.lineTo(xb, yb);
    ctx.lineTo(xa, yb);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  };

  // the far ridge, its crest touched by the moon — more so on the moon's side
  const fg = ctx.createLinearGradient(
    0,
    horizonY - H * 0.06,
    0,
    horizonY + H * 0.03,
  );
  fg.addColorStop(0, "#121d37");
  fg.addColorStop(1, "#0b1326");
  land(far, fg);
  const rim = ctx.createLinearGradient(xa, 0, xb, 0);
  rim.addColorStop(0, "rgba(120,142,200,0.1)");
  rim.addColorStop(1, "rgba(160,180,232,0.34)");
  ridge(far, 0.6 * lw);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.2 * lw;
  ctx.stroke();

  // low crowns along it anywhere...
  for (let i = 0; i < 14; i++) {
    const x = xa + rnd() * (xb - xa);
    const r = S * (0.004 + rnd() * 0.004);
    crown(ctx, x, far(x) + r * 0.6, r, "#0d1629");
  }
  // ...but tall cypresses only either side of the cells, so none ever
  // stands up among them (the outer ones half behind the curtains)
  for (const side of [-1, 1]) {
    const edge = side < 0 ? content.x0 : content.x1;
    [0.07, 0.05, 0.085].forEach((h, j) => {
      const x = edge + side * (S * 0.014 + j * S * 0.016);
      cypress(ctx, x, far(x) + S * 0.004, S * h, S * h * 0.2, "#0a1122");
    });
  }

  // mist lying along the valley floor
  const mist = ctx.createLinearGradient(
    0,
    horizonY - H * 0.035,
    0,
    horizonY + H * 0.035,
  );
  mist.addColorStop(0, "rgba(96,118,172,0)");
  mist.addColorStop(0.55, "rgba(96,118,172,0.14)");
  mist.addColorStop(1, "rgba(96,118,172,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(xa, horizonY - H * 0.035, xb - xa, H * 0.07);

  // the near ridge, almost black, and its trees
  land(near, "#070b16");
  ridge(near, 0.5 * lw);
  ctx.strokeStyle = "rgba(120,140,195,0.1)";
  ctx.lineWidth = lw;
  ctx.stroke();
  const count = Math.round((xb - xa) / (S * 0.1));
  for (let i = 0; i < count; i++) {
    const x = xa + rnd() * (xb - xa);
    const r = S * (0.007 + rnd() * 0.008);
    crown(ctx, x, near(x) + r * 0.5, r, "#05080f");
  }
}

function paintWall(ctx, geo) {
  const { W, H, archCX, archCY, archRY } = geo;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0a0c12");
  g.addColorStop(0.55, "#0c0e15");
  g.addColorStop(1, "#07080c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // moonlight spilling in through the opening lifts the wall around it
  softEllipse(
    ctx,
    archCX,
    archCY + archRY * 0.4,
    W * 0.62,
    H * 0.75,
    "54,70,114",
    0.16,
  );
}

// the depth of the wall: facets lit by how squarely they face the moon
function paintReveal(ctx, geo) {
  const { archCX, archCY, archRX, archRY, wl, wr, sillY, toHole, lw, hole } =
    geo;
  const facet = (pts, s) => {
    const col = mix(SHADOW, LIT, s);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = col; // hides the hairline seams between facets
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  const onArch = (a) => ({
    x: archCX + Math.cos(a) * archRX,
    y: archCY + Math.sin(a) * archRY,
  });
  const N = 96;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI * (1 + i / N);
    const a1 = Math.PI * (1 + (i + 1) / N);
    const am = (a0 + a1) / 2;
    const n = norm(-Math.cos(am) / archRX, -Math.sin(am) / archRY);
    const O0 = onArch(a0);
    const O1 = onArch(a1);
    facet([O0, O1, toHole(O1), toHole(O0)], shadeOf(n.x, n.y));
  }
  const P = (x, y) => ({ x, y });
  const band = (a, b, nx, ny) =>
    facet([a, b, toHole(b), toHole(a)], shadeOf(nx, ny));
  band(P(wl, archCY), P(wl, sillY), 1, 0); // left jamb, facing the moon
  band(P(wr, archCY), P(wr, sillY), -1, 0); // right jamb, turned away
  band(P(wl, sillY), P(wr, sillY), 0, -1); // the floor of the opening

  // the far edge, where the wall gives onto the night: a soft dark line
  for (const [w, a] of [
    [5, 0.12],
    [2.5, 0.22],
    [1, 0.4],
  ]) {
    ctx.beginPath();
    opening(ctx, hole, hole.bottom);
    ctx.strokeStyle = `rgba(0,0,0,${a})`;
    ctx.lineWidth = w * lw;
    ctx.stroke();
  }
  // and the near arris, on the room side, catching a little light
  ctx.beginPath();
  ctx.moveTo(wl, sillY);
  ctx.lineTo(wl, archCY);
  ctx.ellipse(archCX, archCY, archRX, archRY, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(wr, sillY);
  ctx.strokeStyle = "rgba(150,168,215,0.16)";
  ctx.lineWidth = lw;
  ctx.stroke();
}

// the architrave round the opening, with a keystone at the crown
function paintTrim(ctx, geo) {
  const { archCX, archCY, archRX, archRY, wl, wr, sillY, trim: R, lw } = geo;
  ctx.beginPath();
  ctx.moveTo(wl - R, sillY);
  ctx.lineTo(wl - R, archCY);
  ctx.ellipse(archCX, archCY, archRX + R, archRY + R, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(wr + R, sillY);
  ctx.lineTo(wr, sillY);
  ctx.lineTo(wr, archCY);
  ctx.ellipse(archCX, archCY, archRX, archRY, 0, 0, Math.PI, true);
  ctx.lineTo(wl, sillY);
  ctx.closePath();
  const tg = ctx.createLinearGradient(0, archCY - archRY - R, 0, sillY);
  tg.addColorStop(0, "#161a25");
  tg.addColorStop(1, "#12151e");
  ctx.fillStyle = tg;
  ctx.fill();

  // its moulding: a lit fillet by the opening, a groove, a shadowed edge
  const ring = (d, style, w) => {
    ctx.beginPath();
    ctx.moveTo(wl - d, sillY);
    ctx.lineTo(wl - d, archCY);
    ctx.ellipse(
      archCX,
      archCY,
      archRX + d,
      archRY + d,
      0,
      Math.PI,
      Math.PI * 2,
    );
    ctx.lineTo(wr + d, sillY);
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  ring(R * 0.2, "rgba(140,160,210,0.13)", lw);
  ring(R * 0.58, "rgba(0,0,0,0.35)", lw * 1.2);
  ring(R * 0.66, "rgba(140,160,210,0.06)", lw);
  ring(R, "rgba(0,0,0,0.55)", lw * 1.5);

  const top = archCY - archRY;
  const kb = top + R * 0.3;
  const kt = top - R * 1.3;
  const wb = R * 1.25;
  const wt = R * 1.85;
  ctx.beginPath();
  ctx.moveTo(archCX - wb / 2, kb);
  ctx.lineTo(archCX - wt / 2, kt);
  ctx.lineTo(archCX + wt / 2, kt);
  ctx.lineTo(archCX + wb / 2, kb);
  ctx.closePath();
  const kg = ctx.createLinearGradient(archCX - wt / 2, 0, archCX + wt / 2, 0);
  kg.addColorStop(0, "#1f2535");
  kg.addColorStop(1, "#171b27");
  ctx.fillStyle = kg;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(archCX - wt / 2 + lw, kt + lw);
  ctx.lineTo(archCX - wb / 2 + lw, kb - lw);
  ctx.lineTo(archCX + wb / 2 - lw, kb - lw);
  ctx.strokeStyle = "rgba(160,178,225,0.2)";
  ctx.stroke();
}

// the inner sill board, lit where the moonlight falls across it
function paintStool(ctx, geo) {
  const { H, S, lw, wl, wr, sillY, stool, archCX, archRX, hole } = geo;
  const x0 = wl - stool.ear;
  const x1 = wr + stool.ear;
  const yF = sillY + stool.depth;
  const yB = yF + stool.face;

  const sh = ctx.createLinearGradient(0, yB, 0, yB + H * 0.04);
  sh.addColorStop(0, "rgba(0,0,0,0.55)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(x0 + S * 0.01, yB, x1 - x0 - S * 0.02, H * 0.04);

  // the top: the same moonlit stone as the opening's floor — one sill
  ctx.fillStyle = mix(SHADOW, LIT, shadeOf(0, -1));
  ctx.fillRect(x0, sillY, x1 - x0, stool.depth);
  for (const [a, b] of [
    [x0, wl],
    [x1, wr],
  ]) {
    const g = ctx.createLinearGradient(a, 0, b, 0);
    g.addColorStop(0, "rgba(0,0,0,0.4)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(a, b), sillY, Math.abs(b - a), stool.depth);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, hole.bottom, x1 - x0, yF - hole.bottom);
  ctx.clip();
  softEllipse(
    ctx,
    archCX - archRX * 0.18,
    sillY,
    archRX * 0.75,
    (yF - hole.bottom) * 1.6,
    "175,195,240",
    0.22,
  );
  ctx.restore();

  const fg = ctx.createLinearGradient(0, yF, 0, yB);
  fg.addColorStop(0, "#161a28");
  fg.addColorStop(1, "#0c0e15");
  ctx.fillStyle = fg;
  ctx.fillRect(x0, yF, x1 - x0, stool.face);
  ctx.fillStyle = "rgba(175,192,235,0.35)";
  ctx.fillRect(x0, yF - lw * 0.5, x1 - x0, lw);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(wl, sillY - lw * 0.4, wr - wl, lw * 0.8);
}

// a faint pencil line round the frame — a nod to the sketch it came from
function paintPencil(ctx, geo, rnd) {
  const { archCX, archCY, archRX, archRY, wl, wr, sillY, trim, lw, stool } =
    geo;
  const d = trim + 2 * lw;
  const pts = [];
  for (let y = sillY; y > archCY; y -= 20) pts.push({ x: wl - d, y });
  for (let i = 0; i <= 120; i++) {
    const a = Math.PI * (1 + i / 120);
    pts.push({
      x: archCX + Math.cos(a) * (archRX + d),
      y: archCY + Math.sin(a) * (archRY + d),
    });
  }
  for (let y = archCY + 20; y <= sillY; y += 20) pts.push({ x: wr + d, y });
  const stroke = (line, alpha, width) => {
    const ph = rnd() * Math.PI * 2;
    ctx.beginPath();
    line.forEach((p, i) => {
      const o = Math.sin(i * 0.31 + ph) * lw * 1.1 + (rnd() - 0.5) * lw * 0.6;
      if (i) ctx.lineTo(p.x + o, p.y + o * 0.5);
      else ctx.moveTo(p.x + o, p.y + o * 0.5);
    });
    ctx.strokeStyle = `rgba(216,210,196,${alpha})`;
    ctx.lineWidth = width * lw;
    ctx.stroke();
  };
  stroke(pts, 0.1, 1.2);
  stroke(pts, 0.06, 0.9);
  const edge = [];
  for (let x = wl - stool.ear; x <= wr + stool.ear; x += 20)
    edge.push({ x, y: sillY + stool.depth });
  stroke(edge, 0.1, 1.1);
}

// the curved brass rod, all the way over the arch
function paintRod(ctx, geo) {
  const { S, curtain: c } = geo;
  const rw = rodWidth(S);
  const arc = (dy) => {
    ctx.beginPath();
    ctx.ellipse(
      c.trackCX,
      c.trackCY + dy,
      c.trackRX,
      c.trackRY,
      0,
      Math.PI,
      Math.PI * 2,
    );
  };
  ctx.save();
  ctx.lineCap = "round";
  arc(rw * 1.3); // its shadow on the trim
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = rw * 1.4;
  ctx.stroke();
  arc(0);
  ctx.strokeStyle = "#4e3d23";
  ctx.lineWidth = rw;
  ctx.stroke();
  arc(-rw * 0.22);
  ctx.strokeStyle = "rgba(214,186,128,0.5)";
  ctx.lineWidth = rw * 0.35;
  ctx.stroke();
  for (const x of [c.trackCX - c.trackRX, c.trackCX + c.trackRX]) {
    const r = rw * 1.6;
    const g = ctx.createRadialGradient(
      x - r * 0.35,
      c.trackCY - r * 0.4,
      r * 0.1,
      x,
      c.trackCY,
      r,
    );
    g.addColorStop(0, "#c9a869");
    g.addColorStop(0.5, "#7a5f35");
    g.addColorStop(1, "#3a2d19");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, c.trackCY, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// one sheer curtain: a pale veil, pleats, backlit where it crosses the night
function paintCurtain(ctx, geo, right) {
  const { S, lw, curtain: c, folds, hole } = geo;
  const m = right ? (p) => mirrorPoint(c, p) : (p) => p;
  const lines = folds.map((l) => l.pts.map(m));
  const n = lines.length;
  const lit = right ? 0.9 : 1.1; // the moon, off to the right, lights the left one more
  const col = (rgb, a) => `rgba(${rgb},${Math.min(1, a * lit).toFixed(3)})`;
  const shape = (pts, close) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (close) ctx.closePath();
  };
  const outline = curtainOutline(c, folds, 24).map(m);

  shape(outline, true);
  ctx.fillStyle = col("210,222,246", 0.1);
  ctx.fill();
  // pleats: every other strip between two folds turns away and reads denser
  for (let i = 0; i < n - 1; i++) {
    shape(lines[i].concat(lines[i + 1].slice().reverse()), true);
    ctx.fillStyle = col("214,226,250", i % 2 ? 0.03 : 0.07);
    ctx.fill();
  }
  // across the opening the night shines through it
  ctx.save();
  ctx.beginPath();
  opening(ctx, hole, hole.bottom);
  ctx.clip();
  shape(outline, true);
  const back = ctx.createLinearGradient(0, hole.top, 0, hole.bottom);
  back.addColorStop(0, col("170,190,240", 0.1));
  back.addColorStop(1, col("150,172,228", 0.05));
  ctx.fillStyle = back;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // the folds: sheer cloth is brightest where it turns edge-on
  for (let i = 1; i < n - 1; i++) {
    shape(lines[i], false);
    ctx.strokeStyle = col("228,236,255", i % 2 ? 0.08 : 0.16);
    ctx.lineWidth = (i % 2 ? 0.8 : 1.2) * lw;
    ctx.stroke();
  }
  // its two edges, the inner one catching the most light
  shape(lines[0], false);
  ctx.strokeStyle = col("230,237,255", 0.24);
  ctx.lineWidth = 1.2 * lw;
  ctx.stroke();
  shape(lines[n - 1], false);
  ctx.strokeStyle = col("236,242,255", 0.36);
  ctx.lineWidth = 1.5 * lw;
  ctx.stroke();
  // a weighted hem
  const hem = lines.map((p) => p[p.length - 1]);
  const hh = S * 0.011;
  shape(
    hem.concat(
      hem
        .slice()
        .reverse()
        .map((p) => ({ x: p.x, y: p.y - hh })),
    ),
    true,
  );
  ctx.fillStyle = col("215,226,250", 0.1);
  ctx.fill();
  shape(hem, false);
  ctx.strokeStyle = col("236,242,255", 0.3);
  ctx.lineWidth = 1.2 * lw;
  ctx.stroke();
  ctx.restore();

  // the rings it hangs from
  const rw = rodWidth(S);
  ctx.strokeStyle = "#8a6c3e";
  ctx.lineWidth = rw * 0.42;
  for (let s = 0; s <= 8; s++) {
    const p = m(trackPoint(c, (c.heading * s) / 8));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + rw * 0.9, rw * 1.25, rw * 1.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  tieBack(ctx, lines, S, lw, right);
}

// a muted-gold ribbon round the gathered cloth, finished with a small bow
function tieBack(ctx, lines, S, lw, right) {
  const A = lines[0][TIE];
  const B = lines[lines.length - 1][TIE];
  const bw = S * 0.012;
  const C = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + S * 0.012 };
  const edge = "rgba(38,28,16,0.6)";
  const gold = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#b39462");
    g.addColorStop(0.5, "#7d6440");
    g.addColorStop(1, "#4d3c24");
    return g;
  };

  ctx.beginPath();
  ctx.moveTo(A.x, A.y - bw / 2);
  ctx.quadraticCurveTo(C.x, C.y - bw / 2, B.x, B.y - bw / 2);
  ctx.lineTo(B.x, B.y + bw / 2);
  ctx.quadraticCurveTo(C.x, C.y + bw / 2, A.x, A.y + bw / 2);
  ctx.closePath();
  ctx.fillStyle = gold(0, C.y - bw, 0, C.y + bw);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(A.x, A.y - bw * 0.25);
  ctx.quadraticCurveTo(C.x, C.y - bw * 0.25, B.x, B.y - bw * 0.25);
  ctx.strokeStyle = "rgba(232,208,152,0.35)";
  ctx.lineWidth = 0.8 * lw;
  ctx.stroke();

  const k = qpt(A, C, B, 0.58);
  const s = S * 0.016;
  const dir = right ? -1 : 1;
  ctx.lineWidth = 0.6 * lw;
  for (const [dx, len] of [
    [-0.35, 1.9],
    [0.45, 1.6],
  ]) {
    const ex = k.x + dir * dx * s;
    const ey = k.y + len * s;
    const w = s * 0.22;
    const mx = k.x + dir * dx * s * 0.2;
    ctx.beginPath();
    ctx.moveTo(k.x - w * 0.6, k.y);
    ctx.quadraticCurveTo(mx - w, k.y + len * s * 0.5, ex - w, ey);
    ctx.lineTo(ex, ey - w * 0.8);
    ctx.lineTo(ex + w, ey);
    ctx.quadraticCurveTo(mx + w, k.y + len * s * 0.5, k.x + w * 0.6, k.y);
    ctx.closePath();
    ctx.fillStyle = gold(k.x - s, k.y, k.x + s, ey);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
  }
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k.x, k.y);
    ctx.bezierCurveTo(
      k.x + d * s * 0.4,
      k.y - s * 0.9,
      k.x + d * s * 1.35,
      k.y - s * 0.75,
      k.x + d * s * 1.2,
      k.y - s * 0.05,
    );
    ctx.bezierCurveTo(
      k.x + d * s * 1.05,
      k.y + s * 0.45,
      k.x + d * s * 0.35,
      k.y + s * 0.3,
      k.x,
      k.y,
    );
    ctx.fillStyle = gold(k.x - s * 1.3, k.y - s, k.x + s * 1.3, k.y + s * 0.6);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k.x + d * s * 0.2, k.y - s * 0.05);
    ctx.quadraticCurveTo(
      k.x + d * s * 0.7,
      k.y - s * 0.35,
      k.x + d * s * 1.05,
      k.y - s * 0.1,
    );
    ctx.strokeStyle = "rgba(40,30,18,0.45)";
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(k.x, k.y, s * 0.28, s * 0.34, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8b7045";
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.stroke();
}

// ── small helpers ───────────────────────────────────────────────────────────

// the opening's outline — an arch on straight jambs, closed along the sill.
// `reverse` winds it the other way, to cut it out of an enclosing path.
function opening(ctx, o, bottom, reverse = false) {
  if (!reverse) {
    ctx.moveTo(o.cx - o.rx, bottom);
    ctx.lineTo(o.cx - o.rx, o.cy);
    ctx.ellipse(o.cx, o.cy, o.rx, o.ry, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(o.cx + o.rx, bottom);
  } else {
    ctx.moveTo(o.cx + o.rx, bottom);
    ctx.lineTo(o.cx + o.rx, o.cy);
    ctx.ellipse(o.cx, o.cy, o.rx, o.ry, 0, 0, Math.PI, true);
    ctx.lineTo(o.cx - o.rx, bottom);
  }
  ctx.closePath();
}

function softEllipse(ctx, cx, cy, rx, ry, rgb, a) {
  ctx.save();
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

function cypress(ctx, x, base, h, w, color) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, base);
  ctx.bezierCurveTo(
    x - w * 0.62,
    base - h * 0.45,
    x - w * 0.28,
    base - h * 0.85,
    x,
    base - h,
  );
  ctx.bezierCurveTo(
    x + w * 0.28,
    base - h * 0.85,
    x + w * 0.62,
    base - h * 0.45,
    x + w * 0.5,
    base,
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function crown(ctx, x, base, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [dx, dy, rr] of [
    [0, -0.95, 1],
    [-0.62, -0.55, 0.72],
    [0.66, -0.5, 0.68],
  ]) {
    ctx.moveTo(x + dx * r + rr * r, base + dy * r);
    ctx.arc(x + dx * r, base + dy * r, rr * r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillRect(x - r * 0.08, base - r * 0.5, r * 0.16, r * 0.5);
}

let NOISE = null;
function grain(ctx, W, H, alpha, op) {
  if (!NOISE) {
    const n = 128;
    NOISE = makeCanvas(n, n);
    const nctx = NOISE.getContext("2d");
    const img = nctx.createImageData(n, n);
    const rnd = lcg(90210);
    for (let i = 0; i < n * n; i++) {
      const v = (rnd() * 255) | 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = ctx.createPattern(NOISE, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const gauss = (rnd) => (rnd() + rnd() + rnd() - 1.5) / 1.5;
const rodWidth = (S) => Math.max(2, S * 0.0042);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// how lit a surface is: its facing toward the moon (up and to the right),
// plus a little sky light on anything that faces up
const shadeOf = (nx, ny) =>
  clamp01(
    0.1 + 0.7 * Math.max(0, nx * 0.6 - ny * 0.8) + 0.2 * Math.max(0, -ny),
  );

function norm(x, y) {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

function qpt(A, C, B, t) {
  const r = 1 - t;
  return {
    x: r * r * A.x + 2 * r * t * C.x + t * t * B.x,
    y: r * r * A.y + 2 * r * t * C.y + t * t * B.y,
  };
}

function mix(a, b, t) {
  const pa = rgb(a);
  const pb = rgb(b);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}
