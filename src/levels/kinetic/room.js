import { makeCanvas, addCanvasTexture, releaseTextures, lcg, polygon, soft, grain, glowCanvas } from '../../shared/paint.js';
import { createMoonCanvas } from '../../shared/moon.js';
import { nurseryLayout } from './nurseryGeometry.js';
import { paintBaby, paintBlanket, LIGHT } from './baby.js';

const K = {
  room: 'ki_room', rays: 'ki_rays', back: 'ki_crib_back', front: 'ki_crib_front',
  baby: 'ki_baby', blanket: 'ki_blanket', curtain: 'ki_curtain', shade: 'ki_shade', hub: 'ki_hub', glow: 'ki_glow',
};
const R = 2; // the baby and blanket are painted at twice their size
// how far a thing's shadow runs along the floor for each centimetre it stands
// up: away from the lamp
const CAST = { u: -LIGHT[0] / LIGHT[1], v: -LIGHT[2] / LIGHT[1] };
const LILAC = '196,176,236';
const WARM = '255,196,130';

/** A small nursery at night, seen from the crib's long side: violet walls
 * sprigged with stars closing in on either hand, a little window with the
 * moon in it over a dresser, a round fluffy rug, and a crib painted pale
 * lilac with a baby asleep in it. The one warm light is a floor lamp in the
 * far corner: it lights the wall behind it and the crib from above and
 * behind, lays the far rail's slats in stripes across the sheet and throws
 * the crib's shadow forward onto the rug; the rest of the room is dark. The
 * crib is two paintings (behind and in front of the baby), the baby and its
 * quilt are their own, so the quilt can breathe. */
export function paintRoom(textures, W, H) {
  const L = nurseryLayout(W, H);
  const room = makeCanvas(W, H), ctx = room.getContext('2d');
  const rnd = lcg(291803);
  paintWall(ctx, L, rnd);
  const stars = paintWindow(ctx, L, rnd);
  paintFloor(ctx, L, rnd);
  paintSideWalls(ctx, L);
  paintRug(ctx, L, rnd);
  paintCribShadow(ctx, L);
  paintDresser(ctx, L);
  paintLamp(ctx, L);
  paintToys(ctx, L);
  grain(ctx, W, H, 0.022);

  const back = makeCanvas(W, H), front = makeCanvas(W, H);
  paintCribBack(back.getContext('2d'), L);
  paintCribFront(front.getContext('2d'), L);

  const baby = paintBaby(L), blanket = paintBlanket(L);
  const curtainW = L.win.w * 0.42, curtainH = L.win.h * 1.12;
  for (const [key, canvas] of [
    [K.room, room], [K.rays, paintRays(L)], [K.back, back], [K.front, front],
    [K.baby, baby.canvas], [K.blanket, blanket.canvas], [K.curtain, paintCurtain(curtainW, curtainH)],
    [K.shade, paintShade(L)], [K.hub, paintHub()], [K.glow, glowCanvas()],
  ]) addCanvasTexture(textures, key, canvas);
  return {
    keys: K, layout: L, stars, lamp: { x: L.lamp.x, y: L.lamp.y, r: 60 * L.lamp.s },
    baby: { x: baby.x, y: baby.y, scale: 1 / R, rotation: 0, head: L.head },
    curtain: { x: L.win.x + L.win.w * 0.97, y: L.win.y - 4, width: curtainW, height: curtainH },
  };
}

export function releaseRoomArt(textures) { releaseTextures(textures, K); }

// the far wall: deep violet, sprigged with little stars and moons, a low
// panelled dado, a skirting along the floor; the night-light's warmth on it
function paintWall(ctx, L, rnd) {
  const { width: W, floor } = L;
  const g = ctx.createLinearGradient(0, 0, 0, floor);
  g.addColorStop(0, '#231840');
  g.addColorStop(1, '#33245a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, floor + 2);
  const s = L.P(0, 60, L.wallZ).s;
  const step = 34 * s;
  ctx.fillStyle = 'rgba(214,190,250,0.12)';
  for (let row = 0, y = step * 0.4; y < floor - 30 * s; row++, y += step) {
    for (let x = (row % 2) * step * 0.5; x < W; x += step) {
      if ((row + Math.round(x / step)) % 3 === 0) moonShape(ctx, x, y, 2.6 * s);
      else starShape(ctx, x, y, 2.4 * s);
    }
  }
  // the dado: low panels and a rail
  const dado = L.P(0, 34, L.wallZ).y;
  const dg = ctx.createLinearGradient(0, dado, 0, floor);
  dg.addColorStop(0, '#47336e');
  dg.addColorStop(1, '#2e2050');
  ctx.fillStyle = dg;
  ctx.fillRect(0, dado, W, floor - dado);
  ctx.fillStyle = '#5e4890';
  ctx.fillRect(0, dado - 3 * s, W, 4 * s);
  ctx.strokeStyle = 'rgba(20,10,40,0.45)';
  ctx.lineWidth = Math.max(1, s);
  for (let x = -210; x <= 210; x += 70) {
    const a = L.P(x + 6, 28, L.wallZ), b = L.P(x + 64, 8, L.wallZ);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }
  ctx.fillStyle = '#1e1436';
  ctx.fillRect(0, floor - 5 * s, W, 5 * s);
  // plaster is never flat: a faint mottle, and the room's dark gathering in
  // the upper corners, away from the window
  for (let i = 0; i < 70; i++) {
    soft(ctx, rnd() * W, rnd() * floor, (30 + rnd() * 70) * s, (20 + rnd() * 40) * s, rnd() < 0.5 ? '10,4,26' : '120,96,180', 0.05);
  }
  const dark = ctx.createLinearGradient(0, 0, 0, floor);
  dark.addColorStop(0, 'rgba(8,3,20,0.55)');
  dark.addColorStop(0.6, 'rgba(8,3,20,0.12)');
  dark.addColorStop(1, 'rgba(8,3,20,0)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, floor);
  // the rail's shadow on the panels under it
  const dado2 = L.P(0, 34, L.wallZ).y;
  const rs = ctx.createLinearGradient(0, dado2, 0, dado2 + 9 * s);
  rs.addColorStop(0, 'rgba(10,4,26,0.5)');
  rs.addColorStop(1, 'rgba(10,4,26,0)');
  ctx.fillStyle = rs;
  ctx.fillRect(0, dado2 + s, W, 9 * s);
  ctx.fillStyle = 'rgba(226,210,255,0.22)';
  ctx.fillRect(0, dado2 - 3 * s, W, Math.max(1, 0.8 * s));
}

// The window: arched, white-framed, the moon and the stars in it, a deep
// sill; the moon's light round it on the wall. Returns where stars may
// twinkle.
function paintWindow(ctx, L, rnd) {
  const w = L.win;
  const fw = Math.max(4, w.w * 0.06);
  soft(ctx, w.x + w.w / 2, w.y + w.h / 2, w.w * 1.1, w.h * 0.9, LILAC, 0.08, 'lighter');
  windowPath(ctx, { x: w.x - fw, y: w.y - fw, w: w.w + fw * 2, h: w.h + fw * 2, arch: w.arch + fw });
  ctx.fillStyle = '#a99cc4';
  ctx.fill();
  windowPath(ctx, w);
  ctx.save();
  ctx.clip();
  const sky = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
  sky.addColorStop(0, '#0c0a2a');
  sky.addColorStop(0.7, '#2a2260');
  sky.addColorStop(1, '#4a3a86');
  ctx.fillStyle = sky;
  ctx.fillRect(w.x, w.y, w.w, w.h);
  const stars = [];
  for (let i = 0; i < 40; i++) {
    const x = w.x + rnd() * w.w, y = w.y + rnd() * w.h * 0.75;
    ctx.fillStyle = `rgba(236,230,255,${(0.3 + rnd() * 0.6).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, 0.5 + rnd() * 0.8, 0, Math.PI * 2); ctx.fill();
    if (stars.length < 8 && rnd() < 0.35) stars.push({ x, y, phase: rnd() * Math.PI * 2 });
  }
  const mr = w.w * 0.42;
  ctx.drawImage(createMoonCanvas(), w.x + w.w * 0.62 - mr / 2, w.y + w.h * 0.3 - mr / 2, mr, mr);
  // rooftops far off, the night's own hills
  ctx.fillStyle = '#1a1438';
  ctx.beginPath();
  ctx.moveTo(w.x, w.y + w.h);
  for (let i = 0; i <= 12; i++) {
    const x = w.x + (w.w * i) / 12;
    ctx.lineTo(x, w.y + w.h * (0.82 - 0.06 * Math.sin(i * 1.7) - (i % 4 === 1 ? 0.07 : 0)));
  }
  ctx.lineTo(w.x + w.w, w.y + w.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // the glazing bars and the frame's lit edge
  ctx.strokeStyle = '#a99cc4';
  ctx.lineWidth = Math.max(2, fw * 0.45);
  ctx.beginPath();
  ctx.moveTo(w.x + w.w / 2, w.y - w.arch * 0.2);
  ctx.lineTo(w.x + w.w / 2, w.y + w.h);
  ctx.moveTo(w.x, w.y + w.arch + (w.h - w.arch) * 0.38);
  ctx.lineTo(w.x + w.w, w.y + w.arch + (w.h - w.arch) * 0.38);
  ctx.stroke();
  // the sill
  const sy = w.y + w.h + fw;
  ctx.fillStyle = '#b8acd0';
  ctx.fillRect(w.x - fw * 2, sy - fw * 0.2, w.w + fw * 4, fw * 0.9);
  ctx.fillStyle = 'rgba(40,24,80,0.5)';
  ctx.fillRect(w.x - fw * 2, sy + fw * 0.7, w.w + fw * 4, fw * 0.4);
  return stars;
}

function windowPath(ctx, w) {
  ctx.beginPath();
  ctx.moveTo(w.x, w.y + w.h);
  ctx.lineTo(w.x, w.y + w.arch);
  ctx.ellipse(w.x + w.w / 2, w.y + w.arch, w.w / 2, w.arch, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(w.x + w.w, w.y + w.h);
  ctx.closePath();
}

// the floor: boards running away from us, the moon's window laid on them
function paintFloor(ctx, L, rnd) {
  const { width: W, height: H, P, wallZ } = L;
  const near = 40;
  polygon(ctx, [P(-600, 0, wallZ), P(600, 0, wallZ), P(600, 0, near), P(-600, 0, near)]);
  const g = ctx.createLinearGradient(0, L.floor, 0, H);
  g.addColorStop(0, '#2c1e3c');
  g.addColorStop(1, '#4a3258');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let x = -600; x <= 600; x += 15) {
    const a = P(x, 0, wallZ), b = P(x, 0, near);
    // every board a little different from its neighbour
    const tone = rnd();
    polygon(ctx, [a, P(x + 15, 0, wallZ), P(x + 15, 0, near), b]);
    ctx.fillStyle = tone < 0.5 ? `rgba(10,4,20,${(0.3 * tone).toFixed(3)})` : `rgba(196,160,220,${(0.09 * (tone - 0.5)).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(14,6,24,0.55)';
    ctx.lineWidth = Math.max(0.8, a.s * 0.9);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    let z = wallZ - rnd() * 110;
    while (z > near) {
      const c = P(x, 0, z), d = P(x + 15, 0, z);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
      z -= 90 + rnd() * 60;
    }
    ctx.strokeStyle = 'rgba(200,170,230,0.05)';
    ctx.lineWidth = 0.7;
    const e = P(x + 7, 0, wallZ), f = P(x + 7, 0, near);
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(f.x, f.y); ctx.stroke();
  }
  // the window's light on the boards
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(6px)';
  // four panes of it, the glazing bars dark between
  for (const [x0, x1] of [[-154, -113], [-109, -68]]) {
    for (const [z0, z1, a] of [[300, 272, 0.1], [266, 226, 0.07]]) {
      const sl = (z) => (z - 300) * 0.5;
      polygon(ctx, [P(x0 - sl(z0), 0, z0), P(x1 - sl(z0), 0, z0), P(x1 - sl(z1), 0, z1), P(x0 - sl(z1), 0, z1)]);
      ctx.fillStyle = `rgba(${LILAC},${a})`;
      ctx.fill();
    }
  }
  ctx.restore();
  // the boards are waxed: the window lies in them, long and faint
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const wf = P(L.lampAt.x - 20, 0, L.lampAt.z - 50);
  soft(ctx, wf.x, wf.y, 90 * wf.s, 34 * wf.s, WARM, 0.2);
  ctx.restore();
  ctx.filter = 'none';
  ctx.restore();
  // a shadowed edge where the floor meets the wall
  ctx.fillStyle = 'rgba(10,4,20,0.4)';
  ctx.fillRect(0, L.floor, W, 3);
}

// a round rug under the crib, soft and fluffy, lavender with a darker band
function paintRug(ctx, L, rnd) {
  const { P } = L;
  const c = L.world(0, 0, 0);
  const ring = (r) => Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    return P(c.x + Math.cos(a) * r, 0.5, c.z + Math.sin(a) * r * 0.92);
  });
  polygon(ctx, ring(98));
  ctx.fillStyle = '#5a4488';
  ctx.fill();
  polygon(ctx, ring(88));
  const g = ctx.createRadialGradient(P(c.x, 0, c.z).x, P(c.x, 0, c.z).y, 10, P(c.x, 0, c.z).x, P(c.x, 0, c.z).y, P(c.x + 88, 0, c.z).x - P(c.x, 0, c.z).x);
  g.addColorStop(0, '#a48ad0');
  g.addColorStop(1, '#7a62a8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,214,255,0.35)';
  ctx.lineWidth = 2;
  polygon(ctx, ring(74));
  ctx.stroke();
  // its pile: thousands of short tufts, lit and shaded
  ctx.save();
  polygon(ctx, ring(96));
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 96;
    const p = P(c.x + Math.cos(a) * rr, 0.5, c.z + Math.sin(a) * rr * 0.92);
    const lit = rnd();
    ctx.strokeStyle = lit < 0.5 ? `rgba(40,22,80,${(0.1 + lit * 0.3).toFixed(2)})` : `rgba(226,210,255,${(0.05 + (lit - 0.5) * 0.3).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.8, 1.1 * p.s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (rnd() - 0.3) * 3 * p.s, p.y - (1 + rnd() * 2.4) * p.s); ctx.stroke();
  }
  ctx.restore();
  // its fluffy edge
  ctx.lineCap = 'round';
  for (const p of ring(97)) {
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(${k % 2 ? '120,96,170' : '170,150,210'},0.55)`;
      ctx.lineWidth = Math.max(1, 1.6 * p.s);
      const dx = (rnd() - 0.5) * 3 * p.s, dy = (rnd() - 0.5) * 3 * p.s;
      ctx.beginPath(); ctx.moveTo(p.x + dx, p.y + dy); ctx.lineTo(p.x + dx * 2.4, p.y + dy * 2.4 + 1.5 * p.s); ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

// the crib's shadow, thrown forward onto the rug and the boards: the dark of
// its bed, and the near side's slats and the footboard's in stripes beyond
function paintCribShadow(ctx, L) {
  const { u, v, rail, mattress } = L.size;
  const F = (a, h, b) => L.crib(a + CAST.u * h, 0.6, b + CAST.v * h);
  ctx.save();
  ctx.filter = 'blur(4px)';
  ctx.fillStyle = 'rgba(12,5,30,0.55)';
  polygon(ctx, [F(-u, 0, -v), F(-u, 0, v), F(u, 30, v), F(u, mattress, v), F(u, mattress, -v), F(-u, mattress, -v)]);
  ctx.fill();
  ctx.fillStyle = 'rgba(12,5,30,0.36)';
  const strip = (a, b, w, along) => {
    const d = along ? [0, w] : [w, 0];
    polygon(ctx, [F(a - d[0], mattress, b - d[1]), F(a + d[0], mattress, b + d[1]), F(a + d[0], rail, b + d[1]), F(a - d[0], rail, b - d[1])]);
    ctx.fill();
  };
  for (let i = 0; i <= 14; i++) strip(u, -v + (2 * v * i) / 14, 1.5, true);
  for (let i = 1; i < 8; i++) strip(-u + (2 * u * i) / 8, -v, 1.4, false);
  // the near top rail, the footboard's
  polygon(ctx, [F(u, rail - 3, -v), F(u, rail + 3, -v), F(u, rail + 3, v), F(u, rail - 3, v)]);
  ctx.fill();
  polygon(ctx, [F(-u, rail - 3, -v), F(-u, rail + 3, -v), F(u, rail + 3, -v), F(u, rail - 3, -v)]);
  ctx.fill();
  ctx.restore();
  ctx.filter = 'none';
}

// The side walls, close at either hand: the same violet, darker for being
// turned from the lamp, the dado and skirting running along them toward us.
function paintSideWalls(ctx, L) {
  const { P, wallZ, sideX } = L;
  const near = 84, high = 250; // kept in front of the camera
  for (const d of [-1, 1]) {
    const x = d * sideX;
    const q = (y0, y1) => [P(x, y0, wallZ), P(x, y0, near), P(x, y1, near), P(x, y1, wallZ)];
    polygon(ctx, q(0, high));
    const far = P(x, 100, wallZ).x, close = P(x, 100, near).x;
    const g = ctx.createLinearGradient(far, 0, close, 0);
    g.addColorStop(0, d > 0 ? '#2e2052' : '#22163e');
    g.addColorStop(1, '#0e0820');
    ctx.fillStyle = g;
    ctx.fill();
    polygon(ctx, q(0, 34));
    const dg = ctx.createLinearGradient(far, 0, close, 0);
    dg.addColorStop(0, d > 0 ? '#3a2a5e' : '#2c1e4c');
    dg.addColorStop(1, '#120a26');
    ctx.fillStyle = dg;
    ctx.fill();
    polygon(ctx, q(33, 37));
    ctx.fillStyle = d > 0 ? '#5a4688' : '#3e2e66';
    ctx.fill();
    polygon(ctx, q(0, 5));
    ctx.fillStyle = '#150c2a';
    ctx.fill();
    // the corner where it meets the back wall
    const c0 = P(x, 0, wallZ), c1 = P(x, high, wallZ);
    ctx.strokeStyle = 'rgba(6,2,16,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.stroke();
  }
}

// The floor lamp in the far corner: a slim brass stand, a drum shade of warm
// linen with the bulb glowing through it, its light up the walls and down on
// the boards.
function paintLamp(ctx, L) {
  const { P } = L;
  const { x, z, shade } = L.lampAt;
  const foot = P(x, 0, z), neck = P(x, shade, z);
  // its light on the back wall and the side wall behind it, and on the floor
  const wall = P(x, shade + 10, L.wallZ);
  soft(ctx, wall.x, wall.y, 190 * wall.s, 150 * wall.s, WARM, 0.34, 'lighter');
  soft(ctx, wall.x, wall.y, 90 * wall.s, 80 * wall.s, WARM, 0.3, 'lighter');
  soft(ctx, foot.x - 30 * foot.s, foot.y + 4 * foot.s, 130 * foot.s, 36 * foot.s, WARM, 0.22, 'lighter');
  // the foot and the stand
  soft(ctx, foot.x, foot.y, 20 * foot.s, 5 * foot.s, '8,3,20', 0.7);
  ctx.fillStyle = '#6a5222';
  ctx.beginPath(); ctx.ellipse(foot.x, foot.y, 13 * foot.s, 4 * foot.s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8a652';
  ctx.beginPath(); ctx.ellipse(foot.x, foot.y - 1.6 * foot.s, 12 * foot.s, 3.4 * foot.s, 0, 0, Math.PI * 2); ctx.fill();
  const pg = ctx.createLinearGradient(foot.x - 1.6 * foot.s, 0, foot.x + 1.6 * foot.s, 0);
  pg.addColorStop(0, '#5a4418'); pg.addColorStop(0.5, '#f0d488'); pg.addColorStop(1, '#6a5020');
  ctx.fillStyle = pg;
  ctx.fillRect(foot.x - 1.3 * foot.s, neck.y, 2.6 * foot.s, foot.y - neck.y);
  // the shade: wider at its skirt, lit from within
  const b = P(x, shade, z), t2 = P(x, shade + 30, z);
  const rb = 19 * b.s, rt = 14 * t2.s, eb = rb * 0.3, et = rt * 0.3;
  ctx.beginPath();
  ctx.moveTo(t2.x - rt, t2.y);
  ctx.lineTo(b.x - rb, b.y);
  ctx.ellipse(b.x, b.y, rb, eb, 0, Math.PI, 0, true);
  ctx.lineTo(t2.x + rt, t2.y);
  ctx.ellipse(t2.x, t2.y, rt, et, 0, 0, Math.PI, true);
  ctx.closePath();
  const sg = ctx.createLinearGradient(b.x - rb, 0, b.x + rb, 0);
  sg.addColorStop(0, '#c88a3c'); sg.addColorStop(0.5, '#ffe6ac'); sg.addColorStop(1, '#b87a30');
  ctx.fillStyle = sg; ctx.fill();
  ctx.save(); ctx.clip();
  soft(ctx, b.x, (b.y + t2.y) / 2, rb * 0.8, (b.y - t2.y) * 0.7, '255,250,224', 0.8, 'lighter');
  ctx.strokeStyle = 'rgba(140,84,24,0.25)'; ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath(); ctx.moveTo(t2.x + (i / 5) * rt, t2.y - et); ctx.lineTo(b.x + (i / 5) * rb, b.y + eb); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#8a5c22'; ctx.lineWidth = Math.max(1, 1.2 * b.s);
  ctx.beginPath(); ctx.ellipse(b.x, b.y, rb, eb, 0, 0, Math.PI); ctx.stroke();
  // what gets out of it: a soft cone up and a wider one down
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${Math.round(10 * b.s)}px)`;
  for (const [y0, y1, r0, r1, a] of [[shade + 30, shade + 120, 14, 70, 0.2], [shade, 0, 19, 95, 0.12]]) {
    const p0 = P(x, y0, z), p1 = P(x, y1, z);
    const g = ctx.createLinearGradient(0, p0.y, 0, p1.y);
    g.addColorStop(0, `rgba(${WARM},${a})`); g.addColorStop(1, `rgba(${WARM},0)`);
    ctx.fillStyle = g;
    polygon(ctx, [{ x: p0.x - r0 * p0.s, y: p0.y }, { x: p0.x + r0 * p0.s, y: p0.y }, { x: p1.x + r1 * p1.s, y: p1.y }, { x: p1.x - r1 * p1.s, y: p1.y }]);
    ctx.fill();
  }
  ctx.restore();
  ctx.filter = 'none';
}

// a little dresser against the far wall at the left, a star night-light on it
// — the one warm light in the room — and a few books
function paintDresser(ctx, L) {
  const { P } = L;
  const x0 = -166, x1 = -96, z0 = 303, z1 = 335, h = 68;
  const front = [P(x0, 0, z0), P(x1, 0, z0), P(x1, h, z0), P(x0, h, z0)];
  soft(ctx, (front[0].x + front[1].x) / 2, front[0].y, (front[1].x - front[0].x) * 0.7, 10, '10,4,20', 0.6);
  // its shadow on the wall behind and the floor beside it
  ctx.save();
  ctx.filter = 'blur(5px)';
  polygon(ctx, [P(x0 - 26, 0, z1), P(x0, 0, z1), P(x0, h + 4, z1), P(x0 - 22, h - 6, z1)]);
  ctx.fillStyle = 'rgba(8,3,22,0.45)';
  ctx.fill();
  polygon(ctx, [P(x0 - 30, 0, z0 - 4), P(x1, 0, z0 - 14), P(x1, 0, z0), P(x0, 0, z0)]);
  ctx.fill();
  ctx.restore();
  ctx.filter = 'none';
  polygon(ctx, front);
  const fg = ctx.createLinearGradient(0, front[2].y, 0, front[0].y);
  fg.addColorStop(0, '#b8a8d6');
  fg.addColorStop(1, '#6c5a98');
  ctx.fillStyle = fg;
  ctx.fill();
  polygon(ctx, [P(x0 - 2, h, z0 - 2), P(x1 + 2, h, z0 - 2), P(x1 + 2, h, z1), P(x0 - 2, h, z1)]);
  ctx.fillStyle = '#e6dcf2';
  ctx.fill();
  if (x1 < 0) {
    polygon(ctx, [P(x1, 0, z0), P(x1, 0, z1), P(x1, h, z1), P(x1, h, z0)]);
    ctx.fillStyle = '#6e5c96';
    ctx.fill();
  }
  // drawers and knobs
  for (let i = 0; i < 3; i++) {
    const y0 = 8 + i * 21, y1 = y0 + 17;
    const a = P(x0 + 6, y1, z0 - 0.5), b = P(x1 - 6, y0, z0 - 0.5);
    ctx.fillStyle = 'rgba(214,200,240,0.16)';
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = 'rgba(40,24,80,0.6)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    // each drawer front stands a little proud: light on its top edge, its
    // shadow under it
    ctx.fillStyle = 'rgba(250,244,255,0.5)';
    ctx.fillRect(a.x, a.y, b.x - a.x, 1.2);
    ctx.fillStyle = 'rgba(30,16,60,0.45)';
    ctx.fillRect(a.x, b.y, b.x - a.x, 2.2);
    const k = P((x0 + x1) / 2, (y0 + y1) / 2, z0 - 1);
    ctx.fillStyle = '#f0d890';
    ctx.beginPath(); ctx.arc(k.x, k.y, 2.2 * k.s * 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // books
  const bc = ['#7a5aa8', '#b88ab8', '#5a4a8a'];
  for (let i = 0; i < 3; i++) {
    const bx = -158 + i * 7;
    const a = P(bx, h, 320), b = P(bx + 6, h + 22 - i * 3, 320);
    ctx.fillStyle = bc[i];
    ctx.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
  }
  // the star night-light, glowing
  const st = P(-118, h + 16, 320);
  soft(ctx, st.x, st.y, 60 * st.s, 46 * st.s, WARM, 0.14, 'lighter');
  ctx.fillStyle = '#e8cc90';
  starShape(ctx, st.x, st.y, 10 * st.s);
  ctx.fillStyle = '#fff2c8';
  starShape(ctx, st.x, st.y, 5 * st.s);
  const base = P(-118, h, 320);
  ctx.fillStyle = '#9a84c4';
  ctx.fillRect(base.x - 4 * st.s, st.y + 10 * st.s, 8 * st.s, base.y - st.y - 10 * st.s);
}

// toys on the floor: a plush elephant, a stack of rings, two blocks
function paintToys(ctx, L) {
  const { P } = L;
  // the stacking rings, at the crib's foot on the right
  const r0 = P(104, 0, 176);
  soft(ctx, r0.x, r0.y, 26 * r0.s, 7 * r0.s, '10,4,20', 0.5);
  const cols = ['#9a6ac8', '#c08ad0', '#e0b0e0', '#f0d8f0'];
  for (let i = 0; i < 4; i++) {
    const p = P(104, 4 + i * 5.5, 176);
    const rr = (11 - i * 2) * p.s;
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(p.x - rr * 0.3, p.y - rr * 0.15, rr * 0.4, rr * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  }
  const top = P(104, 28, 176);
  ctx.fillStyle = '#e8d0a0';
  ctx.beginPath(); ctx.arc(top.x, top.y, 3.4 * top.s, 0, Math.PI * 2); ctx.fill();
  // two wooden blocks with stars, at the left
  for (const [x, z, a, col] of [[-124, 236, 0.3, '#b49ad8'], [-146, 214, -0.2, '#d8a8c8']]) {
    const s = 9;
    const pts = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([u, v]) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)]);
    const topF = pts.map(([u, v]) => P(x + u, 2 * s, z + v));
    const nearF = [P(x + pts[0][0], 0, z + pts[0][1]), P(x + pts[1][0], 0, z + pts[1][1]), topF[1], topF[0]];
    polygon(ctx, nearF); ctx.fillStyle = '#6a5290'; ctx.fill();
    polygon(ctx, topF); ctx.fillStyle = col; ctx.fill();
    const c = P(x, 2 * s + 0.2, z);
    ctx.fillStyle = 'rgba(255,250,235,0.85)';
    starShape(ctx, c.x, c.y, 4 * c.s);
  }
  // a plush elephant sitting by the crib's corner, grey-violet, ear flopped
  const e = P(-104, 0, 192);
  const s = e.s;
  soft(ctx, e.x, e.y, 26 * s, 8 * s, '10,4,20', 0.5);
  const fur = (x, y, rx, ry, a = 0) => {
    const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 1, x, y, Math.max(rx, ry));
    g.addColorStop(0, '#c4b4e0'); g.addColorStop(1, '#7a68a6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); ctx.fill();
  };
  fur(e.x, e.y - 12 * s, 14 * s, 12 * s);
  fur(e.x - 11 * s, e.y - 26 * s, 8 * s, 10 * s, -0.3);
  fur(e.x + 3 * s, e.y - 30 * s, 11 * s, 10 * s);
  fur(e.x + 12 * s, e.y - 22 * s, 4 * s, 9 * s, 0.4);
  ctx.fillStyle = 'rgba(240,170,200,0.6)';
  ctx.beginPath(); ctx.ellipse(e.x - 11 * s, e.y - 26 * s, 4.5 * s, 6 * s, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1e40';
  ctx.beginPath(); ctx.arc(e.x + 6 * s, e.y - 32 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
}

// ── the crib ────────────────────────────────────────────────────────────────

const PAINT = { lit: '#efe8f8', mid: '#c4b4de', dark: '#7c6aa6', edge: 'rgba(40,24,72,0.55)' };

// a round rod of painted wood between two points of the crib
function rod(ctx, L, a, b, width) {
  const p = L.crib(...a), q = L.crib(...b);
  const s = (p.s + q.s) / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAINT.edge;
  ctx.lineWidth = (width + 0.8) * s;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  ctx.strokeStyle = PAINT.mid;
  ctx.lineWidth = width * s;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(96,78,150,0.6)';
  ctx.lineWidth = width * s * 0.34;
  ctx.beginPath(); ctx.moveTo(p.x - width * s * 0.3, p.y + width * s * 0.12); ctx.lineTo(q.x - width * s * 0.3, q.y + width * s * 0.12); ctx.stroke();
  ctx.strokeStyle = PAINT.lit;
  ctx.lineWidth = width * s * 0.34;
  ctx.beginPath(); ctx.moveTo(p.x + width * s * 0.2, p.y - width * s * 0.1); ctx.lineTo(q.x + width * s * 0.2, q.y - width * s * 0.1); ctx.stroke();
  ctx.lineCap = 'butt';
}

function post(ctx, L, u, v) {
  const { rail } = L.size;
  rod(ctx, L, [u, 0, v], [u, rail + 8, v], 6);
  const f = L.crib(u, rail + 13, v);
  const g = ctx.createRadialGradient(f.x + 1.4 * f.s, f.y - 1.6 * f.s, 0.5, f.x, f.y, 4.4 * f.s);
  g.addColorStop(0, '#fffaff'); g.addColorStop(1, PAINT.dark);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(f.x, f.y, 4.2 * f.s, 0, Math.PI * 2); ctx.fill();
}

// one side of slats: a bottom rail, the slats, a broad top rail
function side(ctx, L, a, b, n) {
  const { rail } = L.size;
  rod(ctx, L, [a[0], 30, a[1]], [b[0], 30, b[1]], 4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const u = a[0] + (b[0] - a[0]) * t, v = a[1] + (b[1] - a[1]) * t;
    rod(ctx, L, [u, 30, v], [u, rail, v], 2.6);
  }
  rod(ctx, L, [a[0], rail, a[1]], [b[0], rail, b[1]], 5.5);
}

// behind the baby: the far posts and the far long side, the footboard's
// slats at the left, the solid headboard at the right, the mattress in its
// starry sheet
function paintCribBack(ctx, L) {
  const { u, v, rail, mattress } = L.size;
  post(ctx, L, -u, -v); post(ctx, L, -u, v);
  side(ctx, L, [-u, -v], [-u, v], 14);
  side(ctx, L, [-u, -v], [u, -v], 8);
  // the headboard: a solid arched panel, seen from its inner side and in the
  // lamp's shadow
  const top = (x) => rail + 6 + 14 * (1 - (x / u) ** 2);
  const pts = [];
  for (let i = 0; i <= 16; i++) { const x = -u + (2 * u * i) / 16; pts.push(L.crib(x, top(x), v)); }
  pts.push(L.crib(u, 30, v), L.crib(-u, 30, v));
  polygon(ctx, pts);
  const hg = ctx.createLinearGradient(0, pts[8].y, 0, pts[17].y);
  hg.addColorStop(0, PAINT.mid); hg.addColorStop(1, PAINT.dark);
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = PAINT.edge; ctx.lineWidth = 1.2; ctx.stroke();
  // its top edge catches the lamp
  ctx.strokeStyle = PAINT.lit; ctx.lineWidth = Math.max(1.2, 2.2 * pts[8].s);
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) { if (i) ctx.lineTo(pts[i].x, pts[i].y); else ctx.moveTo(pts[i].x, pts[i].y); }
  ctx.stroke();
  // the mattress: its near edge, and its sheet, lavender with tiny stars
  const mu = u - 2, mv = v - 2;
  const near = [L.crib(mu, mattress, -mv), L.crib(mu, mattress, mv), L.crib(mu, mattress - 14, mv), L.crib(mu, mattress - 14, -mv)];
  polygon(ctx, near); ctx.fillStyle = '#4e3c7a'; ctx.fill();
  const topQ = [L.crib(-mu, mattress, -mv), L.crib(-mu, mattress, mv), L.crib(mu, mattress, mv), L.crib(mu, mattress, -mv)];
  polygon(ctx, topQ);
  const sg = ctx.createLinearGradient(0, topQ[0].y, 0, topQ[3].y);
  sg.addColorStop(0, '#a894d6'); sg.addColorStop(1, '#8a76ba');
  ctx.fillStyle = sg; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(250,246,255,0.45)';
  for (let a = -mu + 5; a < mu; a += 9) for (let b = -mv + 5; b < mv; b += 9) {
    const p = L.crib(a + ((b / 9) % 2 ? 4.5 : 0), mattress + 0.2, b);
    starShape(ctx, p.x, p.y, 1.3 * p.s);
  }
  // the far slats and rail lay their shadows across the sheet
  ctx.save();
  ctx.filter = 'blur(1.4px)';
  ctx.fillStyle = 'rgba(40,20,84,0.26)';
  const reach = rail - mattress;
  const sheet = (a, b) => L.crib(a, mattress + 0.3, b);
  for (let i = 1; i < 14; i++) {
    const sv = -v + (2 * v * i) / 14;
    polygon(ctx, [sheet(-u, sv - 1.2), sheet(-u, sv + 1.2), sheet(-u + CAST.u * reach, sv + 1.2 + CAST.v * reach), sheet(-u + CAST.u * reach, sv - 1.2 + CAST.v * reach)]);
    ctx.fill();
  }
  polygon(ctx, [sheet(-u + CAST.u * reach - 2.5, -v), sheet(-u + CAST.u * reach + 2.5, -v), sheet(-u + CAST.u * reach + 2.5, v), sheet(-u + CAST.u * reach - 2.5, v)]);
  ctx.fill();
  // and the headboard its own, over the pillow's end
  const hb = (rail + 12 - mattress) * -CAST.v;
  polygon(ctx, [sheet(-u, v), sheet(u, v), sheet(u, v - hb), sheet(-u, v - hb)]);
  ctx.fill();
  ctx.restore();
  ctx.filter = 'none';
  // the lamp's warmth on the sheet
  const mid = L.crib(-6, mattress, 14);
  soft(ctx, mid.x, mid.y, (topQ[1].x - topQ[0].x) * 0.5, Math.abs(topQ[3].y - topQ[0].y) * 0.9, WARM, 0.14, 'lighter');
  ctx.restore();
}

// in front of the baby: the near long side's slats and its two posts
function paintCribFront(ctx, L) {
  const { u, v } = L.size;
  side(ctx, L, [u, -v], [u, v], 14);
  post(ctx, L, u, -v); post(ctx, L, u, v);
}

// the moon's beams falling in from the window toward the floor
function paintRays(L) {
  const { width: W, height: H, win: w, P } = L;
  const canvas = makeCanvas(W, H), ctx = canvas.getContext('2d');
  ctx.filter = 'blur(' + Math.max(3, W * 0.005) + 'px)';
  const f0 = P(-150, 0, 232), f1 = P(-60, 0, 236);
  polygon(ctx, [[w.x + w.w * 0.1, w.y + w.h * 0.3], [w.x + w.w * 0.9, w.y + w.h * 0.3], [f1.x, f1.y], [f0.x, f0.y]]);
  const g = ctx.createLinearGradient(0, w.y, 0, f0.y);
  g.addColorStop(0, `rgba(${LILAC},0.06)`);
  g.addColorStop(1, `rgba(${LILAC},0.01)`);
  ctx.fillStyle = g; ctx.fill();
  return canvas;
}

// the dark of the room: none by the lamp, a little over the crib, deep in the
// corners and along the near edge
function paintShade(L) {
  const { width: W, height: H } = L;
  const canvas = makeCanvas(W, H), ctx = canvas.getContext('2d');
  const cx = (L.lamp.x + L.cx) / 2, cy = H * 0.44;
  const step = Math.max(6, Math.round(Math.min(W, H) / 90));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const d = Math.hypot((x + step / 2 - cx) / (W * 0.6), (y + step / 2 - cy) / (H * 0.82));
      const a = Math.min(0.84, 0.1 + Math.max(0, d - 0.22) * 1.2);
      ctx.fillStyle = `rgba(8,3,20,${a.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
  return canvas;
}

// the sheer curtain at the window's side
function paintCurtain(w, h) {
  const canvas = makeCanvas(w + 6, h + 6), ctx = canvas.getContext('2d');
  ctx.beginPath(); ctx.moveTo(w * 0.22, 0); ctx.lineTo(w * 0.84, 0);
  ctx.bezierCurveTo(w * 0.74, h * 0.35, w * 0.96, h * 0.58, w, h * 0.98);
  ctx.quadraticCurveTo(w * 0.6, h * 1.01, w * 0.01, h * 0.94);
  ctx.bezierCurveTo(w * 0.3, h * 0.63, -w * 0.09, h * 0.44, w * 0.22, 0); ctx.closePath();
  ctx.fillStyle = 'rgba(190,160,230,.28)'; ctx.fill(); ctx.save(); ctx.clip();
  for (let i = -1; i < 9; i++) {
    const x = i * w * 0.13, g = ctx.createLinearGradient(x, 0, x + w * 0.15, 0);
    g.addColorStop(0, 'rgba(40,20,70,.2)'); g.addColorStop(0.5, 'rgba(236,220,255,.28)'); g.addColorStop(1, 'rgba(40,20,70,.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x - w * 0.1, h * 0.38, x + w * 0.18, h * 0.66, x - w * 0.06, h);
    ctx.lineTo(x + w * 0.17, h);
    ctx.bezierCurveTo(x + w * 0.28, h * 0.66, x + w * 0.06, h * 0.35, x + w * 0.13, 0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  return canvas;
}

// the wooden crescent moon the mobile hangs from
function paintHub() {
  const c = makeCanvas(96, 96), g = c.getContext('2d');
  g.translate(48, 48);
  g.beginPath();
  g.arc(0, 0, 34, 0.35 * Math.PI, 1.65 * Math.PI, false);
  g.arc(14, -6, 28, 1.58 * Math.PI, 0.42 * Math.PI, true);
  g.closePath();
  const grd = g.createLinearGradient(-34, -34, 34, 34);
  grd.addColorStop(0, '#fff0b8'); grd.addColorStop(0.5, '#e0b860'); grd.addColorStop(1, '#9a7030');
  g.fillStyle = grd; g.fill();
  g.strokeStyle = 'rgba(80,50,20,0.6)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = 'rgba(80,50,20,0.7)';
  g.beginPath(); g.arc(-14, -4, 2.6, 0, Math.PI * 2); g.fill();
  return c;
}

function starShape(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function moonShape(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0.35 * Math.PI, 1.65 * Math.PI, false);
  ctx.arc(x + r * 0.45, y - r * 0.15, r * 0.8, 1.6 * Math.PI, 0.4 * Math.PI, true);
  ctx.closePath(); ctx.fill();
}
