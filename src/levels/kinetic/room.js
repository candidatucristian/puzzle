import { makeCanvas, addCanvasTexture, releaseTextures, lcg, polygon, soft, grain, vignette } from '../../shared/paint.js';
import { materialNoise } from '../../shared/materialNoise.js';
import { makeMoonTexture } from '../../shared/moon.js';
import { nurseryLayout } from './nurseryGeometry.js';
import { paintSleepingBaby } from './baby.js';

const K = {
  room: 'ki_room', rays: 'ki_rays', back: 'ki_crib_back', front: 'ki_crib_front',
  baby: 'ki_baby', blanket: 'ki_blanket', curtain: 'ki_curtain', moon: 'ki_moon', shade: 'ki_shade',
};

/** Static room surfaces are painted once per viewport. Only the hanging
 * mobile, a voile curtain, breathing and a few dust motes remain live. */
export function paintRoom(textures, W, H) {
  const L = nurseryLayout(W, H), room = makeCanvas(W, H), ctx = room.getContext('2d');
  const rnd = lcg(291803);
  paintSurfaces(ctx, L);
  paintPanelling(ctx, L);
  const stars = paintWindow(ctx, L, textures, rnd);
  paintFloorLight(ctx, L);
  paintDresser(ctx, L);
  paintRug(ctx, L);
  paintToys(ctx, L, rnd);
  grain(ctx, W, H, 0.025);
  vignette(ctx, W, H, 0.52);

  const back = makeCanvas(W, H), front = makeCanvas(W, H);
  paintCrib(back.getContext('2d'), L, false);
  paintCrib(front.getContext('2d'), L, true);
  for (const canvas of [back, front]) {
    const wood = canvas.getContext('2d');
    wood.save(); wood.globalCompositeOperation = 'source-atop'; grain(wood, W, H, 0.018); wood.restore();
  }
  const baby = paintSleepingBaby();
  const head = L.crib(-35, 87, 5);
  const a = L.crib(-45, 68, 0), b = L.crib(45, 68, 0);
  const babyAngle = Math.atan2(b.y - a.y, b.x - a.x) - 0.08;
  const babyScale = L.focal / 290 * 0.127;
  const babyX = head.x - babyScale * (169 * Math.cos(babyAngle) - 158 * Math.sin(babyAngle));
  const babyY = head.y - babyScale * (169 * Math.sin(babyAngle) + 158 * Math.cos(babyAngle));
  const curtainW = L.win.w * 0.39, curtainH = L.win.h * 1.09;
  for (const [key, canvas] of [
    [K.room, room], [K.rays, paintRays(L)], [K.back, back], [K.front, front],
    [K.baby, baby.canvas], [K.blanket, baby.blanket], [K.curtain, paintCurtain(curtainW, curtainH)],
    [K.shade, paintShade(L)],
  ]) addCanvasTexture(textures, key, canvas);
  return {
    keys: K, layout: L, stars,
    baby: { x: babyX, y: babyY, scale: babyScale, rotation: babyAngle, head },
    curtain: { x: L.win.x + L.win.w * 0.94, y: L.win.y - 7, width: curtainW, height: curtainH },
  };
}

export function releaseRoomArt(textures) { releaseTextures(textures, K); }

function paintSurfaces(ctx, L) {
  const { width: W, height: H, focal, cx, horizon, eye, floor } = L;
  // Sample plaster and real floorboard coordinates, so grain follows the
  // vanishing point instead of appearing to float over the furniture.
  const scale = Math.min(1, 1100 / W);
  const canvas = makeCanvas(W * scale, H * scale), out = canvas.getContext('2d');
  const pixels = out.createImageData(canvas.width, canvas.height);
  for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
    const x = px / scale, y = py / scale, i = (py * canvas.width + px) * 4;
    const pool = Math.exp(-(((x / W - 0.77) / 0.48) ** 2) - ((y / H - 0.36) / 0.61) ** 2);
    const noise = materialNoise(x * 0.75, y * 0.75);
    let r, g, b;
    if (y < floor) {
      const plaster = materialNoise(x / 96, y / 119) * 0.18 + noise * 0.07 + 0.76;
      r = (16 + pool * 18) * plaster;
      g = (10 + pool * 11) * plaster;
      b = (26 + pool * 27) * plaster;
    } else {
      const z = focal * eye / (y - horizon), wx = (x - cx) * z / focal;
      const board = Math.floor((wx + 600) / 17), across = ((wx + 600) / 17) % 1;
      const along = ((z + materialNoise(board * 11, 9) * 140) % 112) / 112;
      const seam = Math.min(1, Math.min(across, 1 - across) * 130) * Math.min(1, Math.min(along, 1 - along) * 150);
      const bend = materialNoise(wx * 0.16, z * 0.035) * 7;
      const wood = materialNoise(wx * 3.2, z * 0.14) * 0.17 + Math.sin(wx * 22 + bend) * 0.045;
      const value = (0.72 + wood + materialNoise(board * 7, Math.floor(z / 112)) * 0.28) * (0.37 + seam * 0.63);
      r = (23 + pool * 9) * value; g = (15 + pool * 7) * value; b = (30 + pool * 15) * value;
    }
    const edge = 1 - Math.pow(Math.abs(x / W - 0.53) * 1.6, 2) * 0.45;
    pixels.data[i] = r * edge; pixels.data[i + 1] = g * edge; pixels.data[i + 2] = b * edge;
    pixels.data[i + 3] = 255;
  }
  out.putImageData(pixels, 0, 0); ctx.drawImage(canvas, 0, 0, W, H);
}

function paintPanelling(ctx, L) {
  const { width: W, height: H, floor } = L, top = floor - H * 0.19;
  // Low painted wainscoting, in the same purple as the walls.
  ctx.fillStyle = '#151020'; ctx.fillRect(0, top, W, floor - top);
  for (let x = -W * 0.05; x < W; x += W * 0.135) {
    const w = W * 0.115, y = top + H * 0.018, h = floor - y - H * 0.018;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#21172e'); g.addColorStop(1, '#130e1e');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(90,71,112,.24)'; ctx.lineWidth = 0.85; ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = '#0f0b18'; ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }
  for (const [offset, color, width] of [[-3, '#302438', 2], [0, '#0c0913', 5], [3, '#49394f', 0.8]]) {
    line(ctx, { x: 0, y: top + offset }, { x: W, y: top + offset }, color, width);
  }
  const base = ctx.createLinearGradient(0, floor - 8, 0, floor + 5);
  base.addColorStop(0, '#382b40'); base.addColorStop(0.2, '#191220'); base.addColorStop(1, '#090711');
  ctx.fillStyle = base; ctx.fillRect(0, floor - 8, W, 13);
  // Faint star-patterned wallpaper; small enough to read as a material.
  for (let y = H * 0.05, row = 0; y < top - 12; y += 38, row++) for (let x = 24 + row % 2 * 22; x < W; x += 45) {
    ctx.strokeStyle = 'rgba(105,77,123,.085)'; ctx.lineWidth = 0.65;
    ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke();
  }
  // Side-wall returns and crown moulding create a room around the camera.
  for (const side of [0, 1]) {
    const edge = side ? W : 0, corner = side ? W * 0.975 : W * 0.035;
    const shade = ctx.createLinearGradient(edge, 0, corner, 0);
    shade.addColorStop(0, 'rgba(3,2,8,.7)'); shade.addColorStop(1, 'rgba(3,2,8,.12)');
    ctx.fillStyle = shade; polygon(ctx, [[edge, 0], [corner, H * 0.02], [corner, floor], [edge, floor + H * 0.14]]); ctx.fill();
    line(ctx, { x: corner, y: H * 0.02 }, { x: corner, y: floor }, 'rgba(80,64,96,.19)', 0.8);
  }
  line(ctx, { x: 0, y: H * 0.018 }, { x: W, y: H * 0.018 }, '#302339', 1.3);
}

function windowPath(ctx, w) {
  ctx.beginPath(); ctx.moveTo(w.x, w.y + w.arch);
  ctx.bezierCurveTo(w.x, w.y - w.arch * 0.32, w.x + w.w, w.y - w.arch * 0.32, w.x + w.w, w.y + w.arch);
  ctx.lineTo(w.x + w.w, w.y + w.h); ctx.lineTo(w.x, w.y + w.h); ctx.closePath();
}

function paintWindow(ctx, L, textures, rnd) {
  const { win: w, width: W, height: H } = L;
  const frame = Math.max(4, Math.min(W, H) * 0.017), stars = [];
  const moon = { x: w.x + w.w * 0.69, y: w.y + w.h * 0.26, r: Math.min(w.w * 0.115, w.h * 0.10) };
  ctx.save(); windowPath(ctx, w); ctx.clip();
  const sky = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
  sky.addColorStop(0, '#070912'); sky.addColorStop(0.48, '#111127'); sky.addColorStop(1, '#1d1a31');
  ctx.fillStyle = sky; ctx.fillRect(w.x, w.y, w.w, w.h);
  soft(ctx, moon.x, moon.y, w.w * 0.8, w.w * 0.75, '144,150,208', 0.14);
  for (let i = 0; i < 82; i++) {
    const x = w.x + rnd() * w.w, y = w.y + rnd() * w.h * 0.83, r = 0.35 + rnd() * 0.72;
    windowPath(ctx, w);
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 1.3 || !ctx.isPointInPath(x, y)) continue;
    ctx.fillStyle = 'rgba(191,195,226,' + (0.15 + rnd() * 0.5) + ')';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (r > 0.95 && stars.length < 8) stars.push({ x, y, phase: rnd() * Math.PI * 2 });
  }
  makeMoonTexture(textures, K.moon);
  const mc = textures.get(K.moon).getSourceImage();
  ctx.drawImage(mc, moon.x - moon.r / 0.72, moon.y - moon.r / 0.72, moon.r * 2 / 0.72, moon.r * 2 / 0.72);
  // Low, distant roofs and bare branches stay almost lost in the night.
  ctx.fillStyle = '#0a0b16';
  for (let x = w.x - 10; x < w.x + w.w; x += 17 + rnd() * 24) {
    const roof = w.y + w.h * (0.90 + rnd() * 0.08);
    ctx.fillRect(x, roof, 35, w.y + w.h - roof);
    ctx.beginPath(); ctx.moveTo(x - 3, roof); ctx.lineTo(x + 16, roof - 13); ctx.lineTo(x + 37, roof); ctx.fill();
  }
  ctx.strokeStyle = '#0b0b17'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(w.x + w.w, w.y + w.h); ctx.bezierCurveTo(w.x + w.w * 0.80, w.y + w.h * 0.77, w.x + w.w * 0.92, w.y + w.h * 0.75, w.x + w.w * 0.76, w.y + w.h * 0.59); ctx.stroke();
  ctx.restore();
  // Recess, dark wood and a moon-facing inner bevel all have distinct depth.
  windowPath(ctx, w); ctx.strokeStyle = '#0b0812'; ctx.lineWidth = frame * 2.1; ctx.stroke();
  windowPath(ctx, w); ctx.strokeStyle = '#332c43'; ctx.lineWidth = frame * 0.87; ctx.stroke();
  windowPath(ctx, { ...w, x: w.x + 1.5, y: w.y + 1.5, w: w.w - 3, h: w.h - 3 });
  ctx.strokeStyle = 'rgba(163,155,195,.32)'; ctx.lineWidth = 1; ctx.stroke();
  const mid = w.x + w.w * 0.47, cross = w.y + w.h * 0.60;
  line(ctx, { x: mid, y: w.y }, { x: mid, y: w.y + w.h }, '#0f0c19', frame * 0.70);
  line(ctx, { x: mid + frame * 0.32, y: w.y + 4 }, { x: mid + frame * 0.32, y: w.y + w.h }, '#5f586f', 0.8);
  line(ctx, { x: w.x, y: cross }, { x: w.x + w.w, y: cross }, '#100d1a', frame * 0.70);
  line(ctx, { x: w.x, y: cross - frame * 0.33 }, { x: w.x + w.w, y: cross - frame * 0.33 }, '#6d667b', 0.8);
  // The lower left casement is slightly open, making the draft visible.
  const open = [
    [w.x + 3, cross + 5], [mid - frame * 0.5, cross + 5],
    [mid - frame * 1.4, w.y + w.h + frame * 0.6], [w.x + frame * 0.55, w.y + w.h - 1],
  ];
  polygon(ctx, open); ctx.fillStyle = 'rgba(145,135,184,.045)'; ctx.fill();
  ctx.strokeStyle = '#52485e'; ctx.lineWidth = Math.max(2, frame * 0.23); ctx.stroke();
  line(ctx, { x: mid - frame * 1.1, y: cross + w.h * 0.22 }, { x: mid - frame * 1.1, y: cross + w.h * 0.26 }, '#a399ad', 2);
  const sillY = w.y + w.h;
  polygon(ctx, [[w.x - frame, sillY], [w.x + w.w + frame, sillY], [w.x + w.w + frame * 1.9, sillY + frame], [w.x - frame * 1.9, sillY + frame]]);
  ctx.fillStyle = '#4c4058'; ctx.fill();
  ctx.fillStyle = '#1b1326'; ctx.fillRect(w.x - frame * 1.9, sillY + frame, w.w + frame * 3.8, frame * 0.48);
  line(ctx, { x: w.x - frame * 1.9, y: sillY + frame }, { x: w.x + w.w + frame * 1.9, y: sillY + frame }, '#73637f', 0.75);
  return stars;
}

function paintFloorLight(ctx, L) {
  const { width: W, height: H, win: w, floor } = L;
  // Pane-shaped pools share one direction and are interrupted by the mullion.
  ctx.save();
  for (let i = 0; i < 2; i++) {
    const points = [[w.x + w.w * (0.04 + i * 0.49), floor + 2],
      [w.x + w.w * (0.44 + i * 0.49), floor + 2],
      [W * (0.23 + i * 0.30), H * 1.05], [W * (-0.02 + i * 0.30), H * 0.95]];
    polygon(ctx, points);
    const g = ctx.createLinearGradient(w.x, floor, W * 0.25, H);
    g.addColorStop(0, 'rgba(151,136,190,.09)'); g.addColorStop(0.5, 'rgba(143,124,181,.13)'); g.addColorStop(1, 'rgba(111,91,159,0)');
    ctx.fillStyle = g; ctx.fill();
  }
  soft(ctx, W * 0.53, H * 0.75, W * 0.43, H * 0.30, '102,80,150', 0.075);
  ctx.restore();
}

function paintRays(L) {
  const { width: W, height: H, win: w } = L;
  const canvas = makeCanvas(W, H), ctx = canvas.getContext('2d');
  ctx.filter = 'blur(' + Math.max(2, W * 0.004) + 'px)';
  for (const [start, span, alpha] of [[0.15, 0.13, 0.056], [0.48, 0.20, 0.085], [0.81, 0.10, 0.050]]) {
    const x = w.x + w.w * start, y = w.y + w.h * 0.35;
    polygon(ctx, [[x, y], [x + w.w * span, y + 4], [x - W * 0.26, H], [x - W * 0.54, H]]);
    const g = ctx.createLinearGradient(x, y, x - W * 0.40, H);
    g.addColorStop(0, 'rgba(167,156,213,' + alpha + ')');
    g.addColorStop(0.62, 'rgba(151,131,198,' + alpha * 1.1 + ')');
    g.addColorStop(1, 'rgba(110,91,164,0)');
    ctx.fillStyle = g; ctx.fill();
  }
  return canvas;
}

function paintDresser(ctx, L) {
  const { P, focal } = L, x = -160, z = 417, w = 83, h = 89, d = 40;
  const map = (u, y, v) => P(x + u, y, z + v);
  box(ctx, map, -w / 2, w / 2, 7, h, -d / 2, d / 2, ['#21182a', '#16101e', '#403048']);
  box(ctx, map, -w / 2 - 2, w / 2 + 2, h, h + 3, -d / 2 - 2, d / 2 + 2, ['#281c30', '#191121', '#49374e']);
  for (let i = 0; i < 3; i++) {
    const y = 15 + i * 23;
    quad(ctx, [map(-37, y, -21), map(37, y, -21), map(37, y + 19, -21), map(-37, y + 19, -21)], '#23192d', '#4a354e');
    for (const u of [-21, 21]) {
      const p = map(u, y + 10, -22); sphere(ctx, p.x, p.y, focal / z * 1.2, ['#746477', '#302534', '#0c0912']);
    }
  }
  // A little stack of board books and an unlit nursery lamp.
  for (let i = 0; i < 3; i++) box(ctx, map, -28 + i, 1 + i, h + 3 + i * 4, h + 6 + i * 4, -8, 12, ['#3c3047', '#282132', i % 2 ? '#4f435e' : '#514454']);
  const p = map(23, h + 3, 5), s = focal / z;
  ellipse(ctx, p.x, p.y, s * 11, s * 3, '#181120');
  line(ctx, p, { x: p.x, y: p.y - s * 22 }, '#57415d', s * 1.4);
  polygon(ctx, [[p.x - s * 10, p.y - s * 39], [p.x + s * 10, p.y - s * 39], [p.x + s * 17, p.y - s * 19], [p.x - s * 17, p.y - s * 19]]);
  const shade = ctx.createLinearGradient(p.x - 15 * s, 0, p.x + 17 * s, 0);
  shade.addColorStop(0, '#201928'); shade.addColorStop(0.7, '#3f314a'); shade.addColorStop(1, '#50415b');
  ctx.fillStyle = shade; ctx.fill();
  // An understated framed moon print above the dresser.
  const print = P(-195, 143, 489), pw = s * 36, ph = s * 47;
  ctx.fillStyle = '#0f0a16'; ctx.fillRect(print.x - pw / 2, print.y - ph / 2, pw, ph);
  ctx.strokeStyle = '#4a394f'; ctx.lineWidth = 2.4; ctx.strokeRect(print.x - pw / 2, print.y - ph / 2, pw, ph);
  ctx.fillStyle = '#2c2238'; ctx.fillRect(print.x - pw * 0.40, print.y - ph * 0.42, pw * 0.8, ph * 0.84);
  ctx.strokeStyle = '#776180'; ctx.lineWidth = s * 0.5;
  ctx.beginPath(); ctx.arc(print.x + 2, print.y - 3, pw * 0.21, 0.7, 5.2); ctx.bezierCurveTo(print.x - pw * 0.05, print.y, print.x + pw * 0.07, print.y + 6, print.x + pw * 0.17, print.y + 7); ctx.stroke();
}

function paintRug(ctx, L) {
  const points = [];
  for (let i = 0; i < 96; i++) {
    const t = i / 96 * Math.PI * 2;
    points.push(L.P(-22 + Math.cos(t) * 118, 0.8, 280 + Math.sin(t) * 74));
  }
  polygon(ctx, points);
  const g = ctx.createLinearGradient(0, L.floor, 0, L.height);
  g.addColorStop(0, '#322638'); g.addColorStop(1, '#221828');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  const rnd = lcg(2929);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * L.width, y = L.floor + rnd() * (L.height - L.floor);
    ctx.strokeStyle = 'rgba(132,105,142,' + (0.02 + rnd() * 0.08) + ')'; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 1); ctx.stroke();
  }
  ctx.restore();
  for (const radius of [0.84, 0.88, 0.93, 0.97]) {
    const ring = [];
    for (let i = 0; i < 100; i++) {
      const t = i / 100 * Math.PI * 2;
      ring.push(L.P(-22 + Math.cos(t) * 118 * radius, 1, 280 + Math.sin(t) * 74 * radius));
    }
    polygon(ctx, ring); ctx.strokeStyle = 'rgba(120,92,133,.2)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // Broad contact shadow, followed by the distinct shadows of the slats.
  const center = L.P(-40, 0, 272);
  soft(ctx, center.x, center.y, L.focal * 0.32, L.focal * 0.12, '2,1,7', 0.68);
  for (let u = -70; u < 76; u += 12) {
    const a = L.crib(u, 0, -36), b = L.crib(u - 17, 0, -70);
    line(ctx, a, b, 'rgba(3,2,9,.25)', Math.max(2, L.focal / 200));
  }
}

function paintCrib(ctx, L, front) {
  const m = L.crib;
  // Slats and rails are solid projected wooden pieces. Gaps are empty space,
  // never an eraser over the already-painted baby.
  if (!front) {
    for (const u of [-78, 78]) {
      box(ctx, m, u - 3.2, u + 3.2, 4, 111, 35, 41, ['#302336', '#22172a', '#66506c']);
      finial(ctx, L, u, 113, 38);
    }
    for (let u = -67; u <= 68; u += 12.2) spindle(ctx, L, u, 38, 29, 100);
    for (const y of [27, 97]) box(ctx, m, -78, 78, y, y + 5.5, 34.5, 41, ['#413048', '#241a2e', '#6b5673']);
    // Left end is behind the mattress. Its arch rises slightly at the centre.
    endPanel(ctx, L, -78, false);
    box(ctx, m, -74, 74, 55, 60, -35, 35, ['#33263d', '#241a2e', '#50405d']);
    const sheet = [m(-73, 67, -34), m(73, 67, -34), m(73, 67, 34), m(-73, 67, 34)];
    const g = ctx.createLinearGradient(sheet[0].x, sheet[0].y, sheet[2].x, sheet[2].y);
    g.addColorStop(0, '#383040'); g.addColorStop(0.5, '#64586e'); g.addColorStop(1, '#82748e');
    polygon(ctx, sheet); ctx.fillStyle = g; ctx.fill();
    box(ctx, m, -73, 73, 62, 67, -34, 34, ['#4f405c', '#372b44', 'rgba(0,0,0,0)']);
    ctx.save(); polygon(ctx, sheet); ctx.clip();
    const rnd = lcg(2930);
    for (let i = 0; i < 85; i++) {
      const u = -72 + rnd() * 144, v = -33 + rnd() * 66;
      line(ctx, m(u, 67.1, v), m(u + 4, 67.1, v + 0.2), 'rgba(190,168,206,.10)', 0.6);
    }
    ctx.restore();
    return;
  }
  endPanel(ctx, L, 78, true);
  // The near rail remains below the sleeping face from this elevated view.
  for (let u = -67; u <= 68; u += 12.2) spindle(ctx, L, u, -38, 28, 88);
  for (const y of [25, 86]) box(ctx, m, -79, 79, y, y + 6.0, -42, -34, ['#352339', '#211526', '#6e5673']);
  for (const u of [-78, 78]) {
    box(ctx, m, u - 3.5, u + 3.5, 4, 105, -42, -35, ['#3f2c44', '#211626', '#806584']);
    finial(ctx, L, u, 107, -38);
  }
  // A small brass maker's plate on the rail is ornamental, without lettering.
  quad(ctx, [m(42, 87, -42.2), m(55, 87, -42.2), m(55, 90, -42.2), m(42, 90, -42.2)], '#665360', '#8d7586');
  // Subtle grain follows each long rail, with a few worn edges.
  for (const y of [27, 29, 88, 90]) {
    line(ctx, m(-73, y, -42.1), m(74, y + 0.3, -42.1), 'rgba(148,113,157,.12)', 0.65);
  }
}

function spindle(ctx, L, u, v, y0, y1) {
  const a = L.crib(u, y0, v), b = L.crib(u, y1, v);
  const s = L.focal / L.world(u, 0, v).z;
  // A turned profile with a moonlit edge and a dark cylindrical belly.
  const points = [[-1.0, 0], [-1.1, 0.10], [-1.6, 0.18], [-0.95, 0.30], [-0.9, 0.70], [-1.5, 0.81], [-1.1, 0.91], [-1.1, 1]];
  const path = points.map(([x, t]) => [a.x + x * s, a.y + (b.y - a.y) * t]);
  path.push(...points.slice().reverse().map(([x, t]) => [a.x - x * s, a.y + (b.y - a.y) * t]));
  const g = ctx.createLinearGradient(a.x - s * 1.7, 0, a.x + s * 1.7, 0);
  g.addColorStop(0, '#1d1424'); g.addColorStop(0.38, '#33223b'); g.addColorStop(0.77, '#58405f'); g.addColorStop(1, '#8b6e91');
  polygon(ctx, path); ctx.fillStyle = g; ctx.fill();
  line(ctx, { x: b.x + s * 0.55, y: b.y + 2 }, { x: a.x + s * 0.55, y: a.y - 2 }, 'rgba(170,137,183,.17)', 0.65);
}

function endPanel(ctx, L, u, near) {
  const m = L.crib, points = [m(u, 26, -38), m(u, 93, -38)];
  for (let i = 0; i <= 24; i++) {
    const v = -38 + i / 24 * 76;
    points.push(m(u, 99 + Math.sin(i / 24 * Math.PI) * 10, v));
  }
  points.push(m(u, 26, 38));
  polygon(ctx, points);
  const a = m(u, 60, -38), b = m(u, 60, 38);
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, near ? '#322139' : '#211729'); g.addColorStop(0.7, '#4b3552'); g.addColorStop(1, '#6c5075');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(133,103,147,.42)'; ctx.lineWidth = 1; ctx.stroke();
  // Recessed end panel, moulded along the arched head/foot board.
  const inner = [m(u + 0.2, 34, -29), m(u + 0.2, 90, -29)];
  for (let i = 0; i <= 16; i++) inner.push(m(u + 0.2, 91 + Math.sin(i / 16 * Math.PI) * 9, -29 + i / 16 * 58));
  inner.push(m(u + 0.2, 34, 29));
  polygon(ctx, inner); ctx.fillStyle = near ? '#302036' : '#281a31'; ctx.fill();
  ctx.strokeStyle = '#73577b'; ctx.lineWidth = 0.85; ctx.stroke();
  // Vertical wood grain follows the local end-board plane.
  ctx.save(); polygon(ctx, inner); ctx.clip();
  for (let v = -29; v < 30; v += 2) line(ctx, m(u + 0.3, 32, v), m(u + 0.3, 105, v + Math.sin(v) * 0.2), 'rgba(146,106,157,.09)', 0.65);
  ctx.restore();
}

function finial(ctx, L, u, y, v) {
  const p = L.crib(u, y, v), r = L.focal / L.world(u, y, v).z * 3.7;
  sphere(ctx, p.x, p.y, r, ['#9d80a6', '#4e3559', '#201326']);
}

function paintToys(ctx, L, rnd) {
  // All toys rest on the same floor plane as the crib.
  const teddy = L.P(87, 0, 300), s = L.focal / 300;
  soft(ctx, teddy.x + 4 * s, teddy.y, 27 * s, 7 * s, '1,1,5', 0.75);
  ctx.save(); ctx.translate(teddy.x, teddy.y); ctx.scale(s, s);
  const fur = ['#6a5569', '#483444', '#201625'];
  plush(ctx, -12, -31, 6, 11, fur, 0.30); plush(ctx, 13, -30, 6, 11, fur, -0.3);
  plush(ctx, 0, -22, 14, 19, fur); plush(ctx, -11, -6, 10, 6, fur, -0.18); plush(ctx, 12, -6, 10, 6, fur, 0.18);
  plush(ctx, -11, -53, 6, 7, fur); plush(ctx, 12, -53, 6, 7, fur);
  plush(ctx, 1, -44, 15, 14, ['#80677c', '#584053', '#2d2032']);
  plush(ctx, 3, -40, 7.5, 6, ['#94808e', '#786071', '#4a364b']);
  for (const x of [-4.5, 8.5]) sphere(ctx, x, -47, 1.25, ['#aa95af', '#201926', '#0b0810']);
  ellipse(ctx, 3, -41, 2.2, 1.7, '#231926');
  ctx.strokeStyle = '#493347'; ctx.lineWidth = 0.65; ctx.beginPath(); ctx.moveTo(3, -39); ctx.lineTo(3, -36.5); ctx.stroke();
  // Worn fur and the seam in the stuffed belly, without sharp outlines.
  for (let i = 0; i < 230; i++) {
    const x = (rnd() - 0.5) * 23, y = -57 + rnd() * 51;
    if ((x / 13) ** 2 + ((y + 23) / 17) ** 2 > 1 && (x / 14) ** 2 + ((y + 45) / 11) ** 2 > 1) continue;
    line(ctx, { x, y }, { x: x + 0.8, y: y - 0.7 }, 'rgba(192,158,180,.12)', 0.3);
  }
  ctx.strokeStyle = 'rgba(23,12,28,.35)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(0, -32); ctx.quadraticCurveTo(3, -22, 0, -11); ctx.stroke();
  // Dusty plum ribbon.
  polygon(ctx, [[-2, -33], [-10, -36], [-9, -29], [0, -32], [10, -36], [11, -28]]);
  ctx.fillStyle = '#51405f'; ctx.fill(); sphere(ctx, 0, -32, 1.6, ['#8c718f', '#4b3556', '#281b31']);
  ctx.restore();

  // Wooden stacking rings farther back near the window.
  const rings = L.P(138, 0, 373), rs = L.focal / 373;
  soft(ctx, rings.x, rings.y, 18 * rs, 5 * rs, '1,1,6', 0.6);
  line(ctx, rings, { x: rings.x, y: rings.y - 38 * rs }, '#6a526b', rs * 2.4);
  const colors = [['#5c4468', '#261c32'], ['#5b646f', '#242b37'], ['#807164', '#37303a'], ['#856171', '#342235']];
  for (let i = 0; i < 4; i++) {
    const r = (16 - i * 2.7) * rs, y = rings.y - (5 + i * 7) * rs;
    ellipse(ctx, rings.x, y + rs * 1.6, r, r * 0.37, colors[i][1]);
    ellipse(ctx, rings.x, y, r, r * 0.35, colors[i][0]);
    ellipse(ctx, rings.x, y, r * 0.20, r * 0.08, '#221b2c');
  }
  sphere(ctx, rings.x, rings.y - 36 * rs, 3 * rs, ['#a08a9b', '#5a425e', '#2b1e32']);
  // Three small letterless blocks: their geometric faces cannot add clues.
  for (const [x, z, yaw, col] of [[92, 244, 0.25, ['#594052', '#302338', '#7b6275']], [116, 259, -0.25, ['#4b4c63', '#252338', '#72718c']], [96, 273, 0.08, ['#5d544e', '#2b2730', '#807263']]]) {
    const map = (u, y, v) => L.P(x + u * Math.cos(yaw) + v * Math.sin(yaw), y, z - u * Math.sin(yaw) + v * Math.cos(yaw));
    box(ctx, map, -6, 6, 0.5, 12.5, -6, 6, col);
    quad(ctx, [map(-4, 3, -6.1), map(4, 3, -6.1), map(4, 10, -6.1), map(-4, 10, -6.1)], 'rgba(0,0,0,0)', 'rgba(170,145,177,.27)');
  }
  // A little wooden pull duck just inside the foreground shadow.
  const duck = L.P(-92, 0, 220), ds = L.focal / 220;
  ctx.save(); ctx.translate(duck.x, duck.y); ctx.scale(ds, ds);
  soft(ctx, 0, 1, 17, 4, '1,1,5', 0.55);
  for (const x of [-7, 8]) sphere(ctx, x, -1, 3.7, ['#534155', '#291b30', '#130d1b']);
  plush(ctx, -1, -7, 12, 6, ['#7c695e', '#5c474b', '#2b1f2d']);
  plush(ctx, 8, -14, 5.5, 6, ['#8b7868', '#655050', '#302230']);
  polygon(ctx, [[12, -16], [18, -13.5], [12, -12]]); ctx.fillStyle = '#775454'; ctx.fill();
  ellipse(ctx, 10, -15.5, 0.6, 0.6, '#140f19');
  ctx.strokeStyle = '#514155'; ctx.lineWidth = 0.38;
  ctx.beginPath(); ctx.moveTo(16, -10); ctx.bezierCurveTo(27, -3, 29, 5, 42, 1); ctx.stroke();
  ctx.restore();
}

function paintShade(L) {
  const canvas = makeCanvas(L.width, L.height), ctx = canvas.getContext('2d');
  // One final optical falloff lights the furniture and room together. The
  // eye adapts to the moon; the foreground remains almost black and plum.
  ctx.fillStyle = 'rgba(8,3,17,.14)'; ctx.fillRect(0, 0, L.width, L.height);
  ctx.save(); ctx.scale(L.width, L.height);
  const g = ctx.createRadialGradient(0.66, 0.30, 0.07, 0.57, 0.42, 0.78);
  g.addColorStop(0, 'rgba(5,2,12,0)');
  g.addColorStop(0.4, 'rgba(5,2,12,.11)');
  g.addColorStop(0.75, 'rgba(4,2,10,.46)');
  g.addColorStop(1, 'rgba(3,1,8,.76)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1, 1); ctx.restore();
  return canvas;
}

function paintCurtain(w, h) {
  const canvas = makeCanvas(w + 6, h + 6), ctx = canvas.getContext('2d');
  ctx.beginPath(); ctx.moveTo(w * 0.22, 0); ctx.lineTo(w * 0.84, 0);
  ctx.bezierCurveTo(w * 0.74, h * 0.35, w * 0.96, h * 0.58, w, h * 0.98);
  ctx.quadraticCurveTo(w * 0.6, h * 1.01, w * 0.01, h * 0.94);
  ctx.bezierCurveTo(w * 0.3, h * 0.63, -w * 0.09, h * 0.44, w * 0.22, 0); ctx.closePath();
  ctx.fillStyle = 'rgba(87,69,115,.24)'; ctx.fill(); ctx.save(); ctx.clip();
  for (let i = -1; i < 9; i++) {
    const x = i * w * 0.13, g = ctx.createLinearGradient(x, 0, x + w * 0.15, 0);
    g.addColorStop(0, 'rgba(8,5,18,.22)'); g.addColorStop(0.5, 'rgba(174,155,204,.23)'); g.addColorStop(0.85, 'rgba(71,53,95,.07)'); g.addColorStop(1, 'rgba(4,3,10,.23)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x - w * 0.1, h * 0.38, x + w * 0.18, h * 0.66, x - w * 0.06, h);
    ctx.lineTo(x + w * 0.17, h);
    ctx.bezierCurveTo(x + w * 0.28, h * 0.66, x + w * 0.06, h * 0.35, x + w * 0.13, 0); ctx.closePath(); ctx.fill();
  }
  for (let y = 2; y < h; y += 3) {
    ctx.fillStyle = 'rgba(218,202,236,.018)'; ctx.fillRect(0, y, w, 0.5);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(188,167,210,.16)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w * 0.02, h * 0.93); ctx.quadraticCurveTo(w * 0.63, h, w, h * 0.97); ctx.stroke();
  return canvas;
}

function line(ctx, a, b, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function quad(ctx, points, fill, stroke) {
  polygon(ctx, points);
  if (/^#[0-9a-f]{6}$/i.test(fill)) {
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const face = ctx.createLinearGradient(Math.max(...xs), Math.min(...ys), Math.min(...xs), Math.max(...ys));
    const rgb = [1, 3, 5].map(i => parseInt(fill.slice(i, i + 2), 16));
    const tint = strength => 'rgb(' + rgb.map(c => Math.min(255, Math.round(c * strength))).join(',') + ')';
    face.addColorStop(0, tint(1.16)); face.addColorStop(0.33, tint(0.93)); face.addColorStop(1, tint(0.56));
    ctx.fillStyle = face;
  } else ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke(); }
}

function box(ctx, map, x0, x1, y0, y1, z0, z1, colors) {
  quad(ctx, [map(x0, y0, z0), map(x1, y0, z0), map(x1, y1, z0), map(x0, y1, z0)], colors[0]);
  quad(ctx, [map(x1, y0, z0), map(x1, y0, z1), map(x1, y1, z1), map(x1, y1, z0)], colors[1]);
  quad(ctx, [map(x0, y1, z0), map(x1, y1, z0), map(x1, y1, z1), map(x0, y1, z1)], colors[2]);
  const a = map(x0, y1, z0), b = map(x1, y1, z0);
  line(ctx, a, b, 'rgba(177,146,191,.15)', 0.7);
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

function sphere(ctx, x, y, radius, colors) {
  const g = ctx.createRadialGradient(x + radius * 0.35, y - radius * 0.35, 0, x, y, radius);
  g.addColorStop(0, colors[0]); g.addColorStop(0.5, colors[1]); g.addColorStop(1, colors[2]);
  ellipse(ctx, x, y, radius, radius, g);
}

function plush(ctx, x, y, rx, ry, colors, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  const g = ctx.createRadialGradient(rx * 0.3, -ry * 0.25, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, colors[0]); g.addColorStop(0.55, colors[1]); g.addColorStop(1, colors[2]);
  ellipse(ctx, 0, 0, rx, ry, g); ctx.restore();
}
