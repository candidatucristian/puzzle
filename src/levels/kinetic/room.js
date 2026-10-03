/**
 * room.js
 *
 * Procedural generation of the nursery diorama.
 * Paints the deep night sky, the gothic window, volumetric moon rays,
 * background dark-purple nursery decor, and the crib containing the sleeping baby.
 */

const K = {
  sky: "ki_sky",
  wall: "ki_wall",
  crib: "ki_crib",
  rays: "ki_rays",
  stars: "ki_stars",
};

const NIGHT_SKY = ["#020205", "#080614", "#120b22"];
// Deep purple-indigo nursery wall tones
const WALL_COLOR = ["#10081d", "#1a0d2e", "#271442"];
const MOON_GLOW = "190, 205, 255";
const RIM_LIGHT = "#8b9bb4";
const SILHOUETTE = "#07030e";

export function paintRoom(textures, W, H) {
  const L = layoutRoom(W, H);

  addCanvas(textures, K.sky, paintSky(L));
  addCanvas(textures, K.wall, paintWall(L));
  addCanvas(textures, K.crib, paintCribAndBaby(L));
  addCanvas(textures, K.rays, paintVolumetricRays(L));
  addCanvas(textures, K.stars, paintStars(L));

  return { keys: K, layout: L };
}

export function releaseRoomArt(textures) {
  for (const key of Object.values(K)) {
    if (textures.exists(key)) textures.remove(key);
  }
}

function layoutRoom(W, H) {
  const winW = Math.min(W * 0.38, 420);
  const winH = H * 0.68;
  const winX = W - winW * 1.15;
  const winY = H * 0.08;
  const archR = winW / 2;

  const cribW = Math.min(W * 0.45, 580);
  const cribH = H * 0.38;
  const cribX = W * 0.04;
  const cribY = H - cribH;

  const moonX = winX + winW * 0.65;
  const moonY = winY + archR * 0.75;
  const moonR = Math.min(W, H) * 0.075;

  return {
    W,
    H,
    winX,
    winY,
    winW,
    winH,
    archR,
    cribX,
    cribY,
    cribW,
    cribH,
    moonX,
    moonY,
    moonR,
  };
}

function paintSky(L) {
  const { W, H, moonX, moonY, moonR } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, NIGHT_SKY[0]);
  skyGrad.addColorStop(0.5, NIGHT_SKY[1]);
  skyGrad.addColorStop(1, NIGHT_SKY[2]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "screen";
  softEllipse(ctx, moonX, moonY, moonR * 6, moonR * 6, MOON_GLOW, 0.12);
  softEllipse(ctx, moonX, moonY, moonR * 2.8, moonR * 2.8, MOON_GLOW, 0.35);

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#e8eeff";
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(120, 130, 160, 0.25)";
  ctx.beginPath();
  ctx.ellipse(
    moonX - moonR * 0.2,
    moonY + moonR * 0.1,
    moonR * 0.35,
    moonR * 0.45,
    0.2,
    0,
    Math.PI * 2,
  );
  ctx.ellipse(
    moonX + moonR * 0.3,
    moonY - moonR * 0.2,
    moonR * 0.25,
    moonR * 0.35,
    -0.2,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  return c;
}

function paintStars(L) {
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const rnd = lcg(12345);

  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 180; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const size = rnd() > 0.85 ? 2 : 1;
    ctx.globalAlpha = 0.2 + rnd() * 0.7;
    ctx.fillRect(x, y, size, size);
  }
  return c;
}

function paintWall(L) {
  const { W, H, winX, winY, winW, winH, archR } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  // Deep purple nursery wall gradient
  const wallGrad = ctx.createRadialGradient(
    W * 0.3,
    H * 0.4,
    H * 0.1,
    W * 0.5,
    H * 0.5,
    W * 1.2,
  );
  wallGrad.addColorStop(0, WALL_COLOR[2]);
  wallGrad.addColorStop(0.5, WALL_COLOR[1]);
  wallGrad.addColorStop(1, WALL_COLOR[0]);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, H);

  // Paint subtle background nursery decor in deep purple-indigo shadows (e.g., a rocking chair / dresser outline)
  ctx.fillStyle = "#140a24";
  // Dresser / Toy chest in the dark background left
  ctx.fillRect(W * 0.05, H * 0.55, W * 0.22, H * 0.45);
  ctx.strokeStyle = "#221238";
  ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.05, H * 0.55, W * 0.22, H * 0.45);

  // Cut out the gothic window
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.moveTo(winX, winY + archR);
  ctx.arc(winX + archR, winY + archR, archR, Math.PI, 0);
  ctx.lineTo(winX + winW, winY + winH);
  ctx.lineTo(winX, winY + winH);
  ctx.closePath();
  ctx.fill();

  // Window frame & mullions
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = SILHOUETTE;
  ctx.lineWidth = Math.max(14, W * 0.016);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(winX, winY + winH * 0.6);
  ctx.lineTo(winX + winW, winY + winH * 0.6);
  ctx.stroke();

  // Moonlight rim on the window frame
  ctx.strokeStyle = "rgba(160, 175, 210, 0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(winX - 4, winY + winH);
  ctx.lineTo(winX - 4, winY + archR);
  ctx.arc(winX + archR - 4, winY + archR, archR + 4, Math.PI, Math.PI * 1.5);
  ctx.stroke();

  vignette(ctx, W, H, 0.65);

  return c;
}

function paintVolumetricRays(L) {
  const { W, H, winX, winY, winW, winH, archR } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  const dropX = -W * 0.55;
  const dropY = H * 0.75;

  const rayPath = new Path2D();
  rayPath.moveTo(winX, winY + archR);
  rayPath.arc(winX + archR, winY + archR, archR, Math.PI, 0);
  rayPath.lineTo(winX + winW + dropX, winY + winH + dropY);
  rayPath.lineTo(winX + dropX, winY + winH + dropY);
  rayPath.closePath();

  const grad = ctx.createLinearGradient(
    winX + winW / 2,
    winY + winH / 2,
    winX + winW / 2 + dropX,
    winY + winH / 2 + dropY,
  );
  grad.addColorStop(0, `rgba(${MOON_GLOW}, 0.2)`);
  grad.addColorStop(0.4, `rgba(${MOON_GLOW}, 0.09)`);
  grad.addColorStop(1, `rgba(${MOON_GLOW}, 0.0)`);

  ctx.fillStyle = grad;
  ctx.fill(rayPath);

  const rnd = lcg(8899);
  ctx.fillStyle = `rgba(${MOON_GLOW}, 0.7)`;
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 350; i++) {
    const dx = winX - W * 0.2 + rnd() * (winW + W * 0.4);
    const dy = winY + rnd() * H;
    if (ctx.isPointInPath(rayPath, dx, dy)) {
      const size = 0.6 + rnd() * 1.8;
      ctx.globalAlpha = 0.1 + rnd() * 0.6;
      ctx.fillRect(dx, dy, size, size);
    }
  }

  return c;
}

function paintCribAndBaby(L) {
  const { W, H, cribX, cribY, cribW, cribH } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  // Crib main silhouette
  ctx.fillStyle = SILHOUETTE;
  ctx.beginPath();
  ctx.moveTo(cribX, H);
  ctx.lineTo(cribX, cribY + cribH * 0.15);
  ctx.quadraticCurveTo(cribX + cribW * 0.1, cribY, cribX + cribW * 0.3, cribY);
  ctx.lineTo(cribX + cribW, cribY);
  ctx.lineTo(cribX + cribW, H);
  ctx.fill();

  // Draw the sleeping baby inside the crib (mound under blanket + little head with a cap)
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#140c24"; // Deep purplish shadow for baby bundle
  ctx.beginPath();
  ctx.ellipse(
    cribX + cribW * 0.45,
    cribY + cribH * 0.75,
    cribW * 0.22,
    cribH * 0.25,
    0.1,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Baby's tiny head and sleeping cap silhouette catching faint moonlight
  ctx.fillStyle = "#1d1233";
  ctx.beginPath();
  ctx.arc(
    cribX + cribW * 0.32,
    cribY + cribH * 0.58,
    cribH * 0.12,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Cut out crib bars
  ctx.globalCompositeOperation = "destination-out";
  const barCount = 8;
  const barWidth = cribW * 0.035;
  const gapWidth = (cribW * 0.75 - barCount * barWidth) / barCount;

  for (let i = 0; i < barCount; i++) {
    const x = cribX + cribW * 0.22 + i * (barWidth + gapWidth);
    ctx.fillRect(x, cribY + barWidth, gapWidth, cribH * 0.65);
    ctx.fillRect(x, cribY + cribH * 0.72, gapWidth, cribH * 0.28);
  }

  // Silver moonlight rim on top rail of the crib
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = RIM_LIGHT;
  ctx.lineWidth = Math.max(1.5, W * 0.0025);
  ctx.beginPath();
  ctx.moveTo(cribX + 2, cribY + cribH * 0.15);
  ctx.quadraticCurveTo(
    cribX + cribW * 0.1,
    cribY + 2,
    cribX + cribW * 0.3,
    cribY + 2,
  );
  ctx.lineTo(cribX + cribW, cribY + 2);
  ctx.stroke();

  return c;
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
  return c;
}

function addCanvas(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

function softEllipse(ctx, cx, cy, rx, ry, rgb, a) {
  if (rx <= 0 || ry <= 0) return;
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

function vignette(ctx, W, H, intensity) {
  const v = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.4,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.8,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
