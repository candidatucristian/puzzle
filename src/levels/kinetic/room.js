import { makeCanvas, addCanvasTexture, releaseTextures, lcg, polygon, soft, grain } from '../../shared/paint.js';
import { createMoonCanvas } from '../../shared/moon.js';
import { nurseryLayout } from './nurseryGeometry.js';
import { paintBabyFlat, paintBlanketFlat, paintBunnyFlat } from './baby.js';

const K = {
  room: 'ki_room', rays: 'ki_rays', back: 'ki_crib_back', front: 'ki_crib_front',
  baby: 'ki_baby', blanket: 'ki_blanket', curtain: 'ki_curtain', shade: 'ki_shade', hub: 'ki_hub',
};
const R = 2; // the baby and blanket are painted at twice their size
const LILAC = '196,176,236';
const WARM = '255,196,130';

/** The nursery at night, seen from above at the foot of the crib, all in
 * purples: star-sprigged walls, a window full of moon, a round fluffy rug,
 * a little dresser with a star night-light, a crib painted pale lilac with a
 * baby asleep in it. The crib is two paintings (behind and in front of the
 * baby), the baby and its quilt are their own, so the quilt can breathe. */
export function paintRoom(textures, W, H) {
  const L = nurseryLayout(W, H);
  const room = makeCanvas(W, H), ctx = room.getContext('2d');
  const rnd = lcg(291803);
  paintWall(ctx, L, rnd);
  const stars = paintWindow(ctx, L, rnd);
  paintFloor(ctx, L, rnd);
  paintRug(ctx, L, rnd);
  paintDresser(ctx, L);
  paintToys(ctx, L);
  grain(ctx, W, H, 0.022);

  const back = makeCanvas(W, H), front = makeCanvas(W, H);
  paintCribBack(back.getContext('2d'), L);
  paintCribFront(front.getContext('2d'), L);

  const extent = { a0: -31, a1: 34, b0: -34, b1: 63 };
  const baby = onMattress(L, 28, extent, (g) => {
    g.scale(1.2, 1.2);
    paintBabyFlat(g);
    g.save(); g.translate(20.5, -7); g.rotate(0.35); paintBunnyFlat(g); g.restore();
  });
  const blanket = onMattress(L, 28, extent, (g) => { g.scale(1.2, 1.2); paintBlanketFlat(g); });
  const curtainW = L.win.w * 0.42, curtainH = L.win.h * 1.12;
  for (const [key, canvas] of [
    [K.room, room], [K.rays, paintRays(L)], [K.back, back], [K.front, front],
    [K.baby, baby.canvas], [K.blanket, blanket.canvas], [K.curtain, paintCurtain(curtainW, curtainH)],
    [K.shade, paintShade(L)], [K.hub, paintHub()],
  ]) addCanvasTexture(textures, key, canvas);
  return {
    keys: K, layout: L, stars,
    baby: { x: baby.x, y: baby.y, scale: 1 / R, rotation: 0, head: L.head },
    curtain: { x: L.win.x + L.win.w * 0.97, y: L.win.y - 4, width: curtainW, height: curtainH },
  };
}

export function releaseRoomArt(textures) { releaseTextures(textures, K); }

// A drawing made flat in centimetres on the mattress (a across, b toward the
// feet, b = 0 at v = vc), laid onto it in the room's perspective; cropped to
// what it covers.
function onMattress(L, vc, ext, draw) {
  const Y = L.size.mattress + 1.5;
  const o = L.crib(0, Y, vc), pu = L.crib(1, Y, vc), pv = L.crib(0, Y, vc + 1);
  const eu = { x: pu.x - o.x, y: pu.y - o.y }, ev = { x: pv.x - o.x, y: pv.y - o.y };
  const at = (a, b) => ({ x: o.x + eu.x * a - ev.x * b, y: o.y + eu.y * a - ev.y * b });
  const pts = [at(ext.a0, ext.b0), at(ext.a1, ext.b0), at(ext.a1, ext.b1), at(ext.a0, ext.b1)];
  const x0 = Math.floor(Math.min(...pts.map((p) => p.x))), x1 = Math.ceil(Math.max(...pts.map((p) => p.x)));
  const y0 = Math.floor(Math.min(...pts.map((p) => p.y))), y1 = Math.ceil(Math.max(...pts.map((p) => p.y)));
  const canvas = makeCanvas((x1 - x0) * R, (y1 - y0) * R), g = canvas.getContext('2d');
  g.setTransform(R * eu.x, R * eu.y, -R * ev.x, -R * ev.y, R * (o.x - x0), R * (o.y - y0));
  draw(g);
  return { canvas, x: x0, y: y0 };
}

// the far wall: deep violet, sprigged with little stars and moons, a low
// panelled dado, a skirting along the floor; the night-light's warmth on it
function paintWall(ctx, L, rnd) {
  const { width: W, floor } = L;
  const g = ctx.createLinearGradient(0, 0, 0, floor);
  g.addColorStop(0, '#2a1d48');
  g.addColorStop(1, '#3a2862');
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
  for (let x = -200; x <= 420; x += 70) {
    const a = L.P(x + 6, 28, L.wallZ), b = L.P(x + 64, 8, L.wallZ);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }
  ctx.fillStyle = '#1e1436';
  ctx.fillRect(0, floor - 5 * s, W, 5 * s);
  void rnd;
}

// The window: arched, white-framed, the moon and the stars in it, a deep
// sill; the moon's light round it on the wall. Returns where stars may
// twinkle.
function paintWindow(ctx, L, rnd) {
  const w = L.win;
  const fw = Math.max(4, w.w * 0.06);
  soft(ctx, w.x + w.w / 2, w.y + w.h / 2, w.w * 1.3, w.h * 1.1, LILAC, 0.16, 'lighter');
  windowPath(ctx, { x: w.x - fw, y: w.y - fw, w: w.w + fw * 2, h: w.h + fw * 2, arch: w.arch + fw });
  ctx.fillStyle = '#d8cceb';
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
  ctx.strokeStyle = '#d8cceb';
  ctx.lineWidth = Math.max(2, fw * 0.45);
  ctx.beginPath();
  ctx.moveTo(w.x + w.w / 2, w.y - w.arch * 0.2);
  ctx.lineTo(w.x + w.w / 2, w.y + w.h);
  ctx.moveTo(w.x, w.y + w.arch + (w.h - w.arch) * 0.38);
  ctx.lineTo(w.x + w.w, w.y + w.arch + (w.h - w.arch) * 0.38);
  ctx.stroke();
  // the sill
  const sy = w.y + w.h + fw;
  ctx.fillStyle = '#e4daf2';
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
  polygon(ctx, [P(40, 0, 410), P(150, 0, 420), P(100, 0, 300), P(-20, 0, 290)]);
  ctx.fillStyle = `rgba(${LILAC},0.12)`;
  ctx.fill();
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
  polygon(ctx, ring(112));
  ctx.fillStyle = '#5a4488';
  ctx.fill();
  polygon(ctx, ring(100));
  const g = ctx.createRadialGradient(P(c.x, 0, c.z).x, P(c.x, 0, c.z).y, 10, P(c.x, 0, c.z).x, P(c.x, 0, c.z).y, P(c.x + 100, 0, c.z).x - P(c.x, 0, c.z).x);
  g.addColorStop(0, '#a48ad0');
  g.addColorStop(1, '#7a62a8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,214,255,0.35)';
  ctx.lineWidth = 2;
  polygon(ctx, ring(84));
  ctx.stroke();
  // its fluffy edge
  ctx.lineCap = 'round';
  for (const p of ring(111)) {
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(${k % 2 ? '120,96,170' : '170,150,210'},0.55)`;
      ctx.lineWidth = Math.max(1, 1.6 * p.s);
      const dx = (rnd() - 0.5) * 3 * p.s, dy = (rnd() - 0.5) * 3 * p.s;
      ctx.beginPath(); ctx.moveTo(p.x + dx, p.y + dy); ctx.lineTo(p.x + dx * 2.4, p.y + dy * 2.4 + 1.5 * p.s); ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

// a little dresser against the far wall at the left, a star night-light on it
// — the one warm light in the room — and a few books
function paintDresser(ctx, L) {
  const { P } = L;
  const x0 = -270, x1 = -165, z0 = 435, z1 = 470, h = 74;
  const front = [P(x0, 0, z0), P(x1, 0, z0), P(x1, h, z0), P(x0, h, z0)];
  soft(ctx, (front[0].x + front[1].x) / 2, front[0].y, (front[1].x - front[0].x) * 0.7, 10, '10,4,20', 0.6);
  polygon(ctx, front);
  const fg = ctx.createLinearGradient(front[0].x, 0, front[1].x, 0);
  fg.addColorStop(0, '#cdbfe2');
  fg.addColorStop(1, '#8e7cb4');
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
    ctx.strokeStyle = 'rgba(60,40,100,0.5)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    const k = P((x0 + x1) / 2, (y0 + y1) / 2, z0 - 1);
    ctx.fillStyle = '#f0d890';
    ctx.beginPath(); ctx.arc(k.x, k.y, 2.2 * k.s * 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // books
  const bc = ['#7a5aa8', '#b88ab8', '#5a4a8a'];
  for (let i = 0; i < 3; i++) {
    const bx = -255 + i * 7;
    const a = P(bx, h, 450), b = P(bx + 6, h + 22 - i * 3, 450);
    ctx.fillStyle = bc[i];
    ctx.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
  }
  // the star night-light, glowing
  const st = P(-200, h + 16, 452);
  soft(ctx, st.x, st.y, 160 * st.s, 120 * st.s, WARM, 0.35, 'lighter');
  soft(ctx, st.x, st.y + 20 * st.s, 90 * st.s, 26 * st.s, WARM, 0.3, 'lighter');
  ctx.fillStyle = '#ffe6a8';
  starShape(ctx, st.x, st.y, 12 * st.s);
  ctx.fillStyle = '#fff8e0';
  starShape(ctx, st.x, st.y, 6 * st.s);
  const base = P(-200, h, 452);
  ctx.fillStyle = '#9a84c4';
  ctx.fillRect(base.x - 4 * st.s, st.y + 10 * st.s, 8 * st.s, base.y - st.y - 10 * st.s);
}

// toys on the floor: a plush elephant, a stack of rings, two blocks
function paintToys(ctx, L) {
  const { P } = L;
  // the stacking rings, at the crib's foot on the right
  const r0 = P(96, 0, 168);
  soft(ctx, r0.x, r0.y, 26 * r0.s, 7 * r0.s, '10,4,20', 0.5);
  const cols = ['#9a6ac8', '#c08ad0', '#e0b0e0', '#f0d8f0'];
  for (let i = 0; i < 4; i++) {
    const p = P(96, 4 + i * 5.5, 168);
    const rr = (11 - i * 2) * p.s;
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(p.x - rr * 0.3, p.y - rr * 0.15, rr * 0.4, rr * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  }
  const top = P(96, 28, 168);
  ctx.fillStyle = '#e8d0a0';
  ctx.beginPath(); ctx.arc(top.x, top.y, 3.4 * top.s, 0, Math.PI * 2); ctx.fill();
  // two wooden blocks with stars, at the left
  for (const [x, z, a, col] of [[118, 230, 0.3, '#b49ad8'], [132, 214, -0.2, '#d8a8c8']]) {
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
  const e = P(-82, 0, 205);
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
  ctx.strokeStyle = PAINT.lit;
  ctx.lineWidth = width * s * 0.4;
  ctx.beginPath(); ctx.moveTo(p.x - width * s * 0.18, p.y); ctx.lineTo(q.x - width * s * 0.18, q.y); ctx.stroke();
  ctx.lineCap = 'butt';
}

function post(ctx, L, u, v) {
  const { rail } = L.size;
  rod(ctx, L, [u, 0, v], [u, rail + 8, v], 6);
  const f = L.crib(u, rail + 13, v);
  const g = ctx.createRadialGradient(f.x - 1.4 * f.s, f.y - 1.6 * f.s, 0.5, f.x, f.y, 4.4 * f.s);
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

// behind the baby: the shadow, the far posts, the headboard with its moon,
// both long sides, the mattress in its starry sheet
function paintCribBack(ctx, L) {
  const { u, v, rail, mattress } = L.size;
  const c = L.crib(0, 0, 0);
  soft(ctx, c.x, c.y, (L.crib(u, 0, 0).x - c.x) * 1.5, (L.crib(0, 0, -v).y - L.crib(0, 0, v).y) * 0.62, '20,8,40', 0.6);
  post(ctx, L, -u, v); post(ctx, L, u, v);
  // the headboard: a solid arched panel, a crescent moon cut in it
  const top = (x) => rail + 6 + 14 * (1 - (x / u) ** 2);
  const pts = [];
  for (let i = 0; i <= 16; i++) { const x = -u + (2 * u * i) / 16; pts.push(L.crib(x, top(x), v)); }
  pts.push(L.crib(u, 30, v), L.crib(-u, 30, v));
  polygon(ctx, pts);
  const hg = ctx.createLinearGradient(pts[0].x, 0, pts[16].x, 0);
  hg.addColorStop(0, PAINT.lit); hg.addColorStop(1, PAINT.mid);
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = PAINT.edge; ctx.lineWidth = 1.2; ctx.stroke();
  const m = L.crib(0, 76, v);
  ctx.fillStyle = '#4a3672';
  moonShape(ctx, m.x, m.y, 9 * m.s);
  // the long sides
  side(ctx, L, [-u, -v], [-u, v], 14);
  side(ctx, L, [u, -v], [u, v], 14);
  // the mattress, its sheet lavender with tiny stars
  const mu = u - 2, mv = v - 2;
  const near = [L.crib(-mu, mattress, -mv), L.crib(mu, mattress, -mv), L.crib(mu, mattress - 14, -mv), L.crib(-mu, mattress - 14, -mv)];
  polygon(ctx, near); ctx.fillStyle = '#6e58a0'; ctx.fill();
  const topQ = [L.crib(-mu, mattress, mv), L.crib(mu, mattress, mv), L.crib(mu, mattress, -mv), L.crib(-mu, mattress, -mv)];
  polygon(ctx, topQ);
  const sg = ctx.createLinearGradient(0, topQ[0].y, 0, topQ[3].y);
  sg.addColorStop(0, '#9a86c8'); sg.addColorStop(1, '#b8a6e0');
  ctx.fillStyle = sg; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(250,246,255,0.45)';
  for (let a = -mu + 5; a < mu; a += 9) for (let b = -mv + 5; b < mv; b += 9) {
    const p = L.crib(a + ((b / 9) % 2 ? 4.5 : 0), mattress + 0.2, b);
    starShape(ctx, p.x, p.y, 1.3 * p.s);
  }
  // the moon's light across the sheet
  const mid = L.crib(10, mattress, 10);
  soft(ctx, mid.x, mid.y, (topQ[1].x - topQ[0].x) * 0.5, (topQ[3].y - topQ[0].y) * 0.5, LILAC, 0.12, 'lighter');
  ctx.restore();
}

// in front of the baby: the footboard's slats and the near posts
function paintCribFront(ctx, L) {
  const { u, v } = L.size;
  side(ctx, L, [-u, -v], [u, -v], 9);
  post(ctx, L, -u, -v); post(ctx, L, u, -v);
}

// the moon's beams falling in from the window toward the floor
function paintRays(L) {
  const { width: W, height: H, win: w, P } = L;
  const canvas = makeCanvas(W, H), ctx = canvas.getContext('2d');
  ctx.filter = 'blur(' + Math.max(3, W * 0.005) + 'px)';
  const f0 = P(-20, 0, 290), f1 = P(100, 0, 300);
  polygon(ctx, [[w.x + w.w * 0.1, w.y + w.h * 0.3], [w.x + w.w * 0.9, w.y + w.h * 0.3], [f1.x, f1.y], [f0.x, f0.y]]);
  const g = ctx.createLinearGradient(0, w.y, 0, f0.y);
  g.addColorStop(0, `rgba(${LILAC},0.1)`);
  g.addColorStop(1, `rgba(${LILAC},0.02)`);
  ctx.fillStyle = g; ctx.fill();
  return canvas;
}

// the dark of the room closing in at the edges, a violet hush over all
function paintShade(L) {
  const canvas = makeCanvas(L.width, L.height), ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(16,6,34,.12)'; ctx.fillRect(0, 0, L.width, L.height);
  ctx.save(); ctx.scale(L.width, L.height);
  const g = ctx.createRadialGradient(0.52, 0.5, 0.12, 0.5, 0.5, 0.8);
  g.addColorStop(0, 'rgba(10,4,24,0)');
  g.addColorStop(0.6, 'rgba(10,4,24,.22)');
  g.addColorStop(1, 'rgba(6,2,16,.66)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1, 1); ctx.restore();
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
