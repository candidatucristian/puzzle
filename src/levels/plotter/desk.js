import { soft, grain, vignette, lcg, polygon } from '../../shared/paint.js';

/** The drafting desk for PLOTTER, late at night in a dark room: a table seen
 * from where we sit at it, its top running away from us; on it a graphic
 * display terminal — a dark steel box round a green tube — with its
 * keyboard, and the machine the tube's instructions are meant for, a pen
 * plotter with a clean sheet of squared paper under its arm; a drawing lamp
 * standing by it, a mug. Behind, a window with the night in it. The lamp and
 * the tube are all the light there is.
 *
 * Painted once per screen size onto the canvas it is given. The tube's text
 * is the scene's; so is the plotter's arm, which idles over the paper. */

const PHOS = '120,230,150'; // the tube's green
const WARM = '255,206,140'; // the lamp
const NIGHT = '120,150,205'; // the window

/** Where the desk's things are, from the tube's place on the screen. */
export function deskLayout(W, H, screen) {
  const u = Math.min(W / 1000, H / 700);
  const s = screen;
  // the table: its back edge behind the terminal, its front edge near the
  // bottom of the picture; a place on it is how far across its front edge
  // (in pixels there) and how far back (0 at the front, 1 at the back)
  const desk = s.y + s.h + 50 * u;
  const front = H * 0.93;
  const eye = { x: W * 0.5, y: -H * 0.2 };
  const on = (x, back) => {
    const y = front + (desk - front) * back;
    const k = (y - eye.y) / (front - eye.y);
    return { x: eye.x + (x - eye.x) * k, y, k };
  };
  // the plotter's bed: a flat table seen from in front and above
  const bx0 = s.x + s.w + W * 0.075, bx1 = W * 0.955;
  const top = H * 0.4, bot = Math.min(desk + 36 * u, H * 0.8);
  const inset = (bx1 - bx0) * 0.07;
  const bed = { tl: { x: bx0 + inset, y: top }, tr: { x: bx1 - inset, y: top }, br: { x: bx1, y: bot }, bl: { x: bx0, y: bot } };
  const at = (a, b) => {
    // a place on the bed: a across it (0–1), b from its far edge toward us
    const l = { x: bed.tl.x + (bed.bl.x - bed.tl.x) * b, y: bed.tl.y + (bed.bl.y - bed.tl.y) * b };
    const r = { x: bed.tr.x + (bed.br.x - bed.tr.x) * b, y: bed.tr.y + (bed.br.y - bed.tr.y) * b };
    return { x: l.x + (r.x - l.x) * a, y: l.y + (r.y - l.y) * a };
  };
  return {
    W, H, u, screen: s, desk, front, on, eye, bed, at,
    lamp: { x: (bx0 + bx1) / 2 + (bx1 - bx0) * 0.3, y: H * 0.27 },
    led: { x: bx0 + (bx1 - bx0) * 0.14, y: bot + 26 * u },
    power: { x: s.x + s.w - 22 * u, y: s.y + s.h + 27 * u },
  };
}

export function paintDesk(ctx, D) {
  const { W, H } = D;
  paintWall(ctx, D);
  paintDeskTop(ctx, D);
  paintLampStand(ctx, D);
  paintPlotter(ctx, D);
  paintTerminal(ctx, D);
  paintThings(ctx, D);
  paintLamp(ctx, D);
  paintDark(ctx, D);
  grain(ctx, W, H, 0.04);
  vignette(ctx, W, H, 0.6);
}

// the wall: dark plaster, and in it over the plotter a window with the night
// outside — a moon behind thin cloud, roofs, a few lit windows far off
function paintWall(ctx, D) {
  const { W, H, u, desk, bed } = D;
  const rnd = lcg(2801);
  const g = ctx.createLinearGradient(0, 0, 0, desk);
  g.addColorStop(0, '#090c0e');
  g.addColorStop(1, '#141a1d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) soft(ctx, rnd() * W, rnd() * desk, (40 + rnd() * 90) * u, (30 + rnd() * 60) * u, rnd() < 0.5 ? '0,0,0' : '60,84,90', 0.06);
  // the window
  const x0 = bed.bl.x + 4 * u, x1 = W * 0.975, y0 = H * 0.045, y1 = bed.tl.y - H * 0.075;
  D.window = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  const fw = 9 * u;
  soft(ctx, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.9, (y1 - y0) * 1.1, NIGHT, 0.12, 'lighter');
  ctx.fillStyle = '#1c1612';
  ctx.fillRect(x0 - fw, y0 - fw, x1 - x0 + fw * 2, y1 - y0 + fw * 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, '#070c1c');
  sky.addColorStop(1, '#1a2a4a');
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = `rgba(226,232,255,${(0.25 + rnd() * 0.6).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0) * 0.7, (0.4 + rnd() * 0.8) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  // the moon, low cloud across it
  const mx = x0 + (x1 - x0) * 0.3, my = y0 + (y1 - y0) * 0.34, mr = (y1 - y0) * 0.13;
  soft(ctx, mx, my, mr * 5, mr * 5, '190,206,250', 0.3, 'lighter');
  const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, '#fffdf0');
  mg.addColorStop(1, '#c6c8c4');
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 5; i++) soft(ctx, mx + (rnd() - 0.3) * mr * 6, my + mr * (0.6 + rnd() * 1.6), mr * (2 + rnd() * 2), mr * 0.4, '30,44,76', 0.5);
  // roofs and chimneys across the street
  ctx.fillStyle = '#060a12';
  let rx = x0;
  while (rx < x1) {
    const w = (26 + rnd() * 44) * u, h = (y1 - y0) * (0.16 + rnd() * 0.16);
    ctx.fillRect(rx, y1 - h, w, h);
    ctx.fillRect(rx + w * 0.3, y1 - h - 8 * u, 5 * u, 9 * u);
    for (let wy = y1 - h + 6 * u; wy < y1 - 5 * u; wy += 8 * u) for (let wx = rx + 4 * u; wx < rx + w - 5 * u; wx += 8 * u) {
      if (rnd() < 0.14) { ctx.fillStyle = `rgba(255,200,120,${(0.4 + rnd() * 0.5).toFixed(2)})`; ctx.fillRect(wx, wy, 3 * u, 4 * u); ctx.fillStyle = '#060a12'; }
    }
    rx += w;
  }
  // the room, faint in the glass: the lamp
  soft(ctx, x0 + (x1 - x0) * 0.72, y1 - (y1 - y0) * 0.2, 30 * u, 22 * u, WARM, 0.14, 'lighter');
  ctx.restore();
  // the glazing bars, the sill, the frame's edges in the moon
  ctx.fillStyle = '#1c1612';
  ctx.fillRect((x0 + x1) / 2 - 3 * u, y0, 6 * u, y1 - y0);
  ctx.fillRect(x0, y0 + (y1 - y0) * 0.46, x1 - x0, 5 * u);
  ctx.fillStyle = '#2c241c';
  ctx.fillRect(x0 - fw - 6 * u, y1 + fw, x1 - x0 + fw * 2 + 12 * u, 8 * u);
  ctx.fillStyle = `rgba(${NIGHT},0.4)`;
  ctx.fillRect(x0 - fw - 6 * u, y1 + fw, x1 - x0 + fw * 2 + 12 * u, 1.6 * u);
  ctx.fillRect((x0 + x1) / 2 - 3 * u, y0, 1.4 * u, y1 - y0);
  // the window's light, slanting down the wall under it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${Math.round(16 * u)}px)`;
  const lg = ctx.createLinearGradient(0, y1, 0, desk);
  lg.addColorStop(0, `rgba(${NIGHT},0.1)`);
  lg.addColorStop(1, `rgba(${NIGHT},0)`);
  ctx.fillStyle = lg;
  polygon(ctx, [{ x: x0, y: y1 }, { x: x1, y: y1 }, { x: x1 - 80 * u, y: desk }, { x: x0 - 150 * u, y: desk }]);
  ctx.fill();
  ctx.restore();
  ctx.filter = 'none';
  // one old plot pinned by the window: a curve, never a letter
  const px = D.screen.x + D.screen.w + (x0 - D.screen.x - D.screen.w) * 0.52, py = H * 0.17, pw = 74 * u, ph = 74 * u;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(0.04);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-pw / 2 + 3 * u, -ph / 2 + 4 * u, pw, ph);
  ctx.fillStyle = '#8f8b7c';
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.strokeStyle = 'rgba(20,34,70,0.8)';
  ctx.lineWidth = Math.max(0.7, 0.9 * u);
  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const a = (i / 300) * Math.PI * 2, r = Math.cos(5 * a);
    const X = Math.cos(a) * r * pw * 0.4, Y = Math.sin(a) * r * ph * 0.4;
    if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
  }
  ctx.stroke();
  ctx.fillStyle = '#7a2a20';
  ctx.beginPath(); ctx.arc(0, -ph / 2 + 5 * u, 2.4 * u, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// the table: old dark oak running away from us, its boards' grain, its front
// edge thick and worn, the dark of the room under it
function paintDeskTop(ctx, D) {
  const { W, H, u, desk, front, on } = D;
  const rnd = lcg(64);
  const far = [on(-W * 0.3, 1), on(W * 1.3, 1)], near = [on(-W * 0.3, 0), on(W * 1.3, 0)];
  polygon(ctx, [far[0], far[1], near[1], near[0]]);
  const g = ctx.createLinearGradient(0, desk, 0, front);
  g.addColorStop(0, '#1c140e');
  g.addColorStop(1, '#3a2a1c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // boards, each its own tone, their joints running to the far edge
  const bw = W * 0.105;
  for (let x = -W * 0.3; x < W * 1.3; x += bw) {
    const tone = rnd();
    polygon(ctx, [on(x, 1), on(x + bw, 1), on(x + bw, 0), on(x, 0)]);
    ctx.fillStyle = tone < 0.5 ? `rgba(0,0,0,${(tone * 0.3).toFixed(3)})` : `rgba(255,200,150,${((tone - 0.5) * 0.08).toFixed(3)})`;
    ctx.fill();
    const a = on(x, 1), b = on(x, 0);
    ctx.strokeStyle = 'rgba(6,3,1,0.7)';
    ctx.lineWidth = Math.max(1, 1.4 * u);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    for (let j = 0; j < 7; j++) {
      const gx = x + rnd() * bw;
      const p = on(gx, 1), q = on(gx + (rnd() - 0.5) * 12 * u, 0);
      ctx.strokeStyle = rnd() < 0.6 ? 'rgba(8,4,2,0.3)' : 'rgba(255,210,160,0.05)';
      ctx.lineWidth = Math.max(0.5, (0.5 + rnd()) * u);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
  }
  // rings from old mugs, a burn
  for (let i = 0; i < 3; i++) {
    const p = on(W * (0.5 + rnd() * 0.16), 0.2 + rnd() * 0.5);
    ctx.strokeStyle = 'rgba(8,4,2,0.3)';
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 22 * u * p.k, 7 * u * p.k, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // where the wall meets it
  const sh = ctx.createLinearGradient(0, desk - 14 * u, 0, desk + 22 * u);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(0.4, 'rgba(0,0,0,0.7)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, desk - 14 * u, W, 36 * u);
  // the front edge, and under it the dark
  const eg = ctx.createLinearGradient(0, front, 0, front + 22 * u);
  eg.addColorStop(0, '#6a4c30');
  eg.addColorStop(0.16, '#3a2816');
  eg.addColorStop(1, '#140c06');
  ctx.fillStyle = eg;
  ctx.fillRect(0, front, W, 22 * u);
  ctx.fillStyle = '#050403';
  ctx.fillRect(0, front + 22 * u, W, H);
}

// The terminal, as such machines were built: a moulded case in two greys with
// its seams, screws and vents; a deep matt bezel round a tube whose glass
// swells toward us; a control strip under the screen with its nameplate,
// labelled knobs, a rocker switch and its lamp, a little speaker; and a
// tilt-and-swivel foot. Seen from a little above, so its top shows.
function paintTerminal(ctx, D) {
  const { u, desk, front, eye } = D;
  const s = D.screen;
  const pad = 30 * u;
  const cx = s.x - pad, cy = s.y - pad, cw = s.w + pad * 2, cb = s.y + s.h + 44 * u, ch = cb - cy;
  const rnd = lcg(4014);
  const label = (text, x, y, size, col = 'rgba(206,212,206,0.75)', align = 'center') => {
    ctx.fillStyle = col;
    ctx.font = `600 ${(size * u).toFixed(1)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  };
  const screw = (x, y) => {
    ctx.fillStyle = '#0a0b0c';
    ctx.beginPath(); ctx.arc(x, y, 3.6 * u, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - u, y - u, 0.3 * u, x, y, 3 * u);
    g.addColorStop(0, '#9aa0a4'); g.addColorStop(1, '#3a3e42');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 2.8 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#16181a'; ctx.lineWidth = Math.max(0.6, 0.8 * u);
    ctx.beginPath(); ctx.moveTo(x - 1.8 * u, y - 1.2 * u); ctx.lineTo(x + 1.8 * u, y + 1.2 * u); ctx.stroke();
  };
  // its shadow on the wall behind, the tube's green on the table before it
  soft(ctx, cx + cw / 2 - 20 * u, cy + ch / 2, cw * 0.6, ch * 0.66, '0,0,0', 0.6);
  soft(ctx, s.x + s.w / 2, (desk + front) / 2, s.w * 0.62, (front - desk) * 0.75, PHOS, 0.13, 'lighter');

  // the foot: a swivel ring on a broad moulded plate, a ribbed neck
  const fx = cx + cw / 2;
  soft(ctx, fx, desk + 26 * u, cw * 0.38, 17 * u, '0,0,0', 0.75);
  for (const [dy, rx, ry, col] of [[20, 0.29, 14, '#08090a'], [15, 0.29, 14, null], [9, 0.2, 9, '#1a1c1f'], [6, 0.2, 9, null]]) {
    if (col) ctx.fillStyle = col;
    else {
      const g = ctx.createLinearGradient(fx - cw * rx, 0, fx + cw * rx, 0);
      g.addColorStop(0, '#1c1f22'); g.addColorStop(0.35, '#5a6066'); g.addColorStop(0.6, '#3a3f44'); g.addColorStop(1, '#16181a');
      ctx.fillStyle = g;
    }
    ctx.beginPath(); ctx.ellipse(fx, desk + dy * u, cw * rx, ry * u, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(0.8, u);
  ctx.beginPath(); ctx.ellipse(fx, desk + 15 * u, cw * 0.25, 11.5 * u, 0, 0, Math.PI); ctx.stroke();
  const ng0 = ctx.createLinearGradient(fx - cw * 0.13, 0, fx + cw * 0.13, 0);
  ng0.addColorStop(0, '#121416'); ng0.addColorStop(0.4, '#3e4348'); ng0.addColorStop(1, '#0e1012');
  ctx.fillStyle = ng0;
  ctx.fillRect(fx - cw * 0.13, cb - 4 * u, cw * 0.26, desk + 8 * u - cb);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 1; i < 12; i++) ctx.fillRect(fx - cw * 0.13 + (cw * 0.26 * i) / 12, cb, Math.max(1, 1.4 * u), desk + 4 * u - cb);

  // the top of the case, going back: a moulded step, rows of vent slots
  const back = (p, k) => ({ x: p.x + (eye.x - p.x) * k, y: p.y + (eye.y - p.y) * k });
  const tl = { x: cx + 10 * u, y: cy + 2 * u }, tr = { x: cx + cw - 10 * u, y: cy + 2 * u };
  polygon(ctx, [back(tl, 0.17), back(tr, 0.17), tr, tl]);
  const tg = ctx.createLinearGradient(0, back(tl, 0.17).y, 0, cy);
  tg.addColorStop(0, '#16181b'); tg.addColorStop(1, '#4a5057');
  ctx.fillStyle = tg;
  ctx.fill();
  const at = (a, k) => back({ x: cx + cw * a, y: cy + 2 * u }, k);
  polygon(ctx, [at(0.2, 0.035), at(0.8, 0.035), at(0.8, 0.145), at(0.2, 0.145)]);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth = Math.max(1, 1.8 * u);
  for (let i = 0; i < 30; i++) {
    const a = 0.215 + i * 0.0196;
    for (const [k0, k1] of [[0.045, 0.082], [0.096, 0.135]]) {
      const p = at(a, k0), q = at(a, k1);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(220,230,236,0.12)';
  ctx.lineWidth = Math.max(0.6, u);
  const e0 = at(0.2, 0.035), e1 = at(0.8, 0.035);
  ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();

  // the front of the case: the lighter shell, a seam where its halves meet
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, [16 * u, 16 * u, 10 * u, 10 * u]);
  const cg = ctx.createLinearGradient(0, cy, 0, cb);
  cg.addColorStop(0, '#6a7178');
  cg.addColorStop(0.03, '#4c5258');
  cg.addColorStop(0.5, '#3e4349');
  cg.addColorStop(0.94, '#2a2e32');
  cg.addColorStop(1, '#141618');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // textured plastic, scuffed where hands carry it
  for (let i = 0; i < 4200; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.09)' : 'rgba(220,232,240,0.035)';
    ctx.fillRect(cx + rnd() * cw, cy + rnd() * ch, 1.3 * u, 1.3 * u);
  }
  for (let i = 0; i < 26; i++) {
    const x = cx + rnd() * cw, y = cy + rnd() * ch;
    ctx.strokeStyle = 'rgba(220,232,240,0.05)';
    ctx.lineWidth = Math.max(0.5, 0.7 * u);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 40 * u, y + (rnd() - 0.5) * 14 * u); ctx.stroke();
  }
  // its edges turning away: darker down the sides, the lamp on the right one
  const sideL = ctx.createLinearGradient(cx, 0, cx + 16 * u, 0);
  sideL.addColorStop(0, 'rgba(0,0,0,0.5)'); sideL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sideL; ctx.fillRect(cx, cy, 16 * u, ch);
  const sideR = ctx.createLinearGradient(cx + cw - 14 * u, 0, cx + cw, 0);
  sideR.addColorStop(0, 'rgba(255,206,140,0)'); sideR.addColorStop(0.7, 'rgba(255,206,140,0.16)'); sideR.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = sideR; ctx.fillRect(cx + cw - 14 * u, cy, 14 * u, ch);
  ctx.restore();
  // the seam round the front, a hair inside the edge
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, 1.3 * u);
  ctx.beginPath(); ctx.roundRect(cx + 7 * u, cy + 7 * u, cw - 14 * u, ch - 14 * u, 11 * u); ctx.stroke();
  ctx.strokeStyle = 'rgba(220,232,240,0.1)';
  ctx.lineWidth = Math.max(0.6, 0.8 * u);
  ctx.beginPath(); ctx.roundRect(cx + 8.4 * u, cy + 8.4 * u, cw - 16.8 * u, ch - 16.8 * u, 10 * u); ctx.stroke();
  for (const [sx, sy] of [[cx + 15 * u, cy + 15 * u], [cx + cw - 15 * u, cy + 15 * u], [cx + 15 * u, cb - 15 * u], [cx + cw - 15 * u, cb - 15 * u]]) screw(sx, sy);

  // the bezel: matt black, bevelled in toward the glass — lit on its lower
  // and right-hand slopes, dark on the others
  const b0 = 19 * u, b1 = 5 * u;
  const outer = { x: s.x - b0, y: s.y - b0, w: s.w + b0 * 2, h: s.h + b0 * 2 };
  const inner = { x: s.x - b1, y: s.y - b1, w: s.w + b1 * 2, h: s.h + b1 * 2 };
  ctx.fillStyle = '#08090a';
  ctx.beginPath(); ctx.roundRect(outer.x, outer.y, outer.w, outer.h, 30 * u); ctx.fill();
  const slope = (pts, col) => { polygon(ctx, pts); ctx.fillStyle = col; ctx.fill(); };
  const o = [{ x: outer.x + 16 * u, y: outer.y + 4 * u }, { x: outer.x + outer.w - 16 * u, y: outer.y + 4 * u }, { x: outer.x + outer.w - 4 * u, y: outer.y + 16 * u }, { x: outer.x + outer.w - 4 * u, y: outer.y + outer.h - 16 * u }, { x: outer.x + outer.w - 16 * u, y: outer.y + outer.h - 4 * u }, { x: outer.x + 16 * u, y: outer.y + outer.h - 4 * u }, { x: outer.x + 4 * u, y: outer.y + outer.h - 16 * u }, { x: outer.x + 4 * u, y: outer.y + 16 * u }];
  const n = [{ x: inner.x + 14 * u, y: inner.y }, { x: inner.x + inner.w - 14 * u, y: inner.y }, { x: inner.x + inner.w, y: inner.y + 14 * u }, { x: inner.x + inner.w, y: inner.y + inner.h - 14 * u }, { x: inner.x + inner.w - 14 * u, y: inner.y + inner.h }, { x: inner.x + 14 * u, y: inner.y + inner.h }, { x: inner.x, y: inner.y + inner.h - 14 * u }, { x: inner.x, y: inner.y + 14 * u }];
  slope([o[0], o[1], n[1], n[0]], '#030404'); // top, in its own shadow
  slope([o[2], o[3], n[3], n[2]], '#1a1d20'); // right
  slope([o[4], o[5], n[5], n[4]], '#24282c'); // bottom, catching the room
  slope([o[6], o[7], n[7], n[6]], '#0a0b0c'); // left
  ctx.strokeStyle = 'rgba(220,232,240,0.16)';
  ctx.lineWidth = Math.max(0.8, u);
  ctx.beginPath(); ctx.roundRect(outer.x, outer.y, outer.w, outer.h, 30 * u); ctx.stroke();

  // the tube
  ctx.beginPath();
  ctx.roundRect(s.x, s.y, s.w, s.h, 22 * u);
  ctx.fillStyle = '#030c07';
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the phosphor's rest glow, strongest where the beam idles
  soft(ctx, s.x + s.w / 2, s.y + s.h * 0.46, s.w * 0.64, s.h * 0.8, '26,116,64', 0.36);
  // its fine grain, and the raster's lines
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(120,230,150,0.03)';
    ctx.fillRect(s.x + rnd() * s.w, s.y + rnd() * s.h, 1.2 * u, 1.2 * u);
  }
  for (let y = s.y + 2; y < s.y + s.h; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(s.x, y, s.w, 1);
  }
  // the glass swells toward us: dark into its corners, its inner edge
  // shadowed by the bezel standing in front of it
  const edge = ctx.createRadialGradient(s.x + s.w / 2, s.y + s.h / 2, s.h * 0.42, s.x + s.w / 2, s.y + s.h / 2, s.w * 0.64);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.74)');
  ctx.fillStyle = edge;
  ctx.fillRect(s.x, s.y, s.w, s.h);
  const lip = ctx.createLinearGradient(0, s.y, 0, s.y + 26 * u);
  lip.addColorStop(0, 'rgba(0,0,0,0.75)'); lip.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lip; ctx.fillRect(s.x, s.y, s.w, 26 * u);
  const lipL = ctx.createLinearGradient(s.x, 0, s.x + 20 * u, 0);
  lipL.addColorStop(0, 'rgba(0,0,0,0.6)'); lipL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lipL; ctx.fillRect(s.x, s.y, 20 * u, s.h);
  // reflections bent by the curve of it: the lamp as a long arc up the
  // right, a paler one of the window along the top
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,214,160,0.1)';
  ctx.lineWidth = 7 * u;
  ctx.beginPath();
  ctx.moveTo(s.x + s.w - 30 * u, s.y + s.h * 0.24);
  ctx.quadraticCurveTo(s.x + s.w - 14 * u, s.y + s.h * 0.5, s.x + s.w - 34 * u, s.y + s.h * 0.74);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,190,240,0.08)';
  ctx.lineWidth = 5 * u;
  ctx.beginPath();
  ctx.moveTo(s.x + s.w * 0.5, s.y + 22 * u);
  ctx.quadraticCurveTo(s.x + s.w * 0.72, s.y + 14 * u, s.x + s.w * 0.9, s.y + 30 * u);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // dust, and a fingermark in a corner
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(220,240,225,${(0.03 + rnd() * 0.06).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(s.x + rnd() * s.w, s.y + rnd() * s.h, (0.4 + rnd()) * u, 0, Math.PI * 2); ctx.fill();
  }
  soft(ctx, s.x + s.w * 0.08, s.y + s.h * 0.9, 16 * u, 10 * u, '200,230,210', 0.05);
  ctx.restore();

  // the control strip under the screen, recessed
  const by = s.y + s.h + 28 * u;
  ctx.fillStyle = '#0c0d0f';
  ctx.beginPath(); ctx.roundRect(s.x - 6 * u, by - 12 * u, s.w + 12 * u, 24 * u, 4 * u); ctx.fill();
  ctx.strokeStyle = 'rgba(220,232,240,0.1)';
  ctx.lineWidth = Math.max(0.6, 0.8 * u);
  ctx.beginPath(); ctx.moveTo(s.x - 2 * u, by + 11.4 * u); ctx.lineTo(s.x + s.w + 2 * u, by + 11.4 * u); ctx.stroke();
  // the nameplate: brushed metal, engraved
  const ng = ctx.createLinearGradient(0, by - 7 * u, 0, by + 7 * u);
  ng.addColorStop(0, '#b4bcc2'); ng.addColorStop(0.5, '#7c848a'); ng.addColorStop(1, '#4a5056');
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.roundRect(s.x + 2 * u, by - 7 * u, 156 * u, 14 * u, 1.6 * u); ctx.fill();
  label('VT-4014  GRAPHIC DISPLAY', s.x + 9 * u, by + 0.6 * u, 8.6, '#14181c', 'left');
  // the speaker: a grid of holes
  ctx.fillStyle = '#000';
  for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
    ctx.beginPath(); ctx.arc(s.x + 186 * u + i * 6 * u, by - 6 * u + j * 6 * u, 1.5 * u, 0, Math.PI * 2); ctx.fill();
  }
  // two knobs with their marks, named above them
  [['BRIGHT', 150, -0.9], ['FOCUS', 112, 0.5]].forEach(([name, dx, turn]) => {
    const kx = s.x + s.w - dx * u;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.75 + (i / 8) * 1.5);
      ctx.strokeStyle = 'rgba(206,212,206,0.5)';
      ctx.lineWidth = Math.max(0.6, 0.8 * u);
      ctx.beginPath(); ctx.moveTo(kx + Math.cos(a) * 9.6 * u, by + Math.sin(a) * 9.6 * u); ctx.lineTo(kx + Math.cos(a) * 11.4 * u, by + Math.sin(a) * 11.4 * u); ctx.stroke();
    }
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(kx + u, by + 1.6 * u, 8.6 * u, 0, Math.PI * 2); ctx.fill();
    const kg = ctx.createRadialGradient(kx - 3 * u, by - 3 * u, u, kx, by, 8 * u);
    kg.addColorStop(0, '#7a8088'); kg.addColorStop(0.7, '#2c3034'); kg.addColorStop(1, '#121416');
    ctx.fillStyle = kg;
    ctx.beginPath(); ctx.arc(kx, by, 8 * u, 0, Math.PI * 2); ctx.fill();
    // its knurled rim, the white line that says where it stands
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(0.5, 0.6 * u);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(kx + Math.cos(a) * 6.4 * u, by + Math.sin(a) * 6.4 * u); ctx.lineTo(kx + Math.cos(a) * 8 * u, by + Math.sin(a) * 8 * u); ctx.stroke();
    }
    ctx.strokeStyle = '#e8ecee'; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.moveTo(kx, by); ctx.lineTo(kx + Math.sin(turn) * 6.6 * u, by - Math.cos(turn) * 6.6 * u); ctx.stroke();
    label(name, kx, by - 17.5 * u, 5.4);
  });
  // the mains rocker, pressed in at its lit end, and its lamp
  const rx0 = s.x + s.w - 78 * u;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.roundRect(rx0, by - 8 * u, 30 * u, 16 * u, 2 * u); ctx.fill();
  const rg = ctx.createLinearGradient(rx0, 0, rx0 + 30 * u, 0);
  rg.addColorStop(0, '#3a3e42'); rg.addColorStop(0.5, '#1c1e21'); rg.addColorStop(1, '#0c0d0e');
  ctx.fillStyle = rg;
  ctx.fillRect(rx0 + 2 * u, by - 6 * u, 26 * u, 12 * u);
  label('I', rx0 + 8 * u, by + 0.5 * u, 7, 'rgba(230,236,232,0.8)');
  label('O', rx0 + 22 * u, by + 0.5 * u, 6.4, 'rgba(230,236,232,0.4)');
  label('POWER', rx0 + 15 * u, by - 17.5 * u, 5.4);
  const p = D.power;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(p.x, p.y, 5.4 * u, 0, Math.PI * 2); ctx.fill();
  const lg = ctx.createRadialGradient(p.x - u, p.y - u, 0.4 * u, p.x, p.y, 3.6 * u);
  lg.addColorStop(0, '#eafff0'); lg.addColorStop(0.5, '#6aff8a'); lg.addColorStop(1, '#1c8a3c');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.arc(p.x, p.y, 3.4 * u, 0, Math.PI * 2); ctx.fill();
  soft(ctx, p.x, p.y, 18 * u, 18 * u, '110,255,140', 0.4, 'lighter');
}

// the plotter: a flat bed with a sheet of squared paper clipped to it, rails
// down its two sides for the arm to run on, a control panel along its front
function paintPlotter(ctx, D) {
  const { u, bed, at } = D;
  const m = 16 * u; // the frame round the bed
  const out = [
    { x: bed.tl.x - m * 0.8, y: bed.tl.y - m * 0.7 }, { x: bed.tr.x + m * 0.8, y: bed.tr.y - m * 0.7 },
    { x: bed.br.x + m, y: bed.br.y + m * 0.5 }, { x: bed.bl.x - m, y: bed.bl.y + m * 0.5 },
  ];
  soft(ctx, (out[2].x + out[3].x) / 2, out[2].y + 46 * u, (out[2].x - out[3].x) * 0.56, 20 * u, '0,0,0', 0.7);
  // the front of it, down to the desk: buttons and a paper-size dial
  const fh = 44 * u;
  polygon(ctx, [out[3], out[2], { x: out[2].x - 4 * u, y: out[2].y + fh }, { x: out[3].x + 4 * u, y: out[3].y + fh }]);
  const fg = ctx.createLinearGradient(0, out[3].y, 0, out[3].y + fh);
  fg.addColorStop(0, '#4a4c48');
  fg.addColorStop(1, '#1e201e');
  ctx.fillStyle = fg;
  ctx.fill();
  const py = out[3].y + fh * 0.5;
  const fw = out[2].x - out[3].x;
  ['#8a2a22', '#2c2e30', '#2c2e30', '#2c2e30', '#2a5a3a'].forEach((col, i) => {
    const x = out[3].x + fw * (0.26 + i * 0.075);
    ctx.fillStyle = '#0c0d0e';
    ctx.fillRect(x - 1.5 * u, py - 8.5 * u, 19 * u, 17 * u);
    ctx.fillStyle = col;
    ctx.fillRect(x, py - 7 * u, 16 * u, 12 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, py - 7 * u, 16 * u, 2 * u);
  });
  ctx.fillStyle = '#b8b4a0';
  ctx.font = `700 ${Math.round(9 * u)}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('X-Y PLOTTER  7225', out[2].x - 14 * u, py);
  ctx.fillStyle = '#0a0c0a';
  ctx.beginPath(); ctx.arc(D.led.x, D.led.y, 4.4 * u, 0, Math.PI * 2); ctx.fill();
  // the frame and the bed
  polygon(ctx, out);
  const cg = ctx.createLinearGradient(0, out[0].y, 0, out[2].y);
  cg.addColorStop(0, '#56584f');
  cg.addColorStop(1, '#787a6e');
  ctx.fillStyle = cg;
  ctx.fill();
  polygon(ctx, [bed.tl, bed.tr, bed.br, bed.bl]);
  ctx.fillStyle = '#2a2c2a';
  ctx.fill();
  // the sheet, held down at its corners, fine squares printed on it
  const P = (a, b) => at(0.08 + a * 0.84, 0.07 + b * 0.86);
  polygon(ctx, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]);
  const pg = ctx.createLinearGradient(0, P(0, 0).y, 0, P(0, 1).y);
  pg.addColorStop(0, '#cdc8b2');
  pg.addColorStop(1, '#ebe6d2');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const heavy = i % 4 === 0;
    ctx.strokeStyle = heavy ? 'rgba(60,120,150,0.5)' : 'rgba(60,120,150,0.2)';
    ctx.lineWidth = Math.max(0.5, (heavy ? 0.9 : 0.6) * u);
    for (const [a, b] of [[P(i / n, 0), P(i / n, 1)], [P(0, i / n), P(1, i / n)]]) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  // the lamp on the paper
  const mid = P(0.6, 0.4);
  soft(ctx, mid.x, mid.y, (bed.br.x - bed.bl.x) * 0.5, (bed.bl.y - bed.tl.y) * 0.6, WARM, 0.2, 'lighter');
  ctx.restore();
  for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const p = P(a, b);
    ctx.fillStyle = '#8a8c88';
    ctx.beginPath(); ctx.arc(p.x + (a ? -4 : 4) * u, p.y + (b ? -3 : 3) * u, 3 * u, 0, Math.PI * 2); ctx.fill();
  }
  // the rails the arm rides, bright steel along the far and near edges
  for (const b of [-0.02, 1.02]) {
    const a0 = at(0, b), a1 = at(1, b);
    ctx.strokeStyle = '#1c1e1c';
    ctx.lineWidth = 6 * u;
    ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
    ctx.strokeStyle = '#c8ccc8';
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.moveTo(a0.x, a0.y - u); ctx.lineTo(a1.x, a1.y - u); ctx.stroke();
  }
}

// on the table: the terminal's keyboard, lying in the table's own perspective
// with every key standing off it; a mug of coffee
function paintThings(ctx, D) {
  const { W, u, on } = D;
  const s = D.screen;
  const rnd = lcg(88);
  // The keyboard: a moulded wedge, higher at the back, a full set of
  // sculpted keys on it — each with its skirt and its dished top and its
  // letter — the modifiers in a paler grey, a red key in the corner, two
  // lamps and a maker's badge on the strip above the keys.
  const x0 = s.x + s.w * 0.06, x1 = s.x + s.w * 0.9;
  const b0 = 0.1, b1 = 0.66; // from near the front edge back toward the terminal
  const K = (a, b, lift = 0) => { const p = on(x0 + (x1 - x0) * a, b0 + (b1 - b0) * b); return { x: p.x, y: p.y - lift * u * p.k, k: p.k }; };
  const lift = (b) => 7 + 15 * b; // its top slopes up toward the back
  const sh = on((x0 + x1) / 2, b0 - 0.04);
  soft(ctx, sh.x, sh.y, (x1 - x0) * 0.58, 18 * u, '0,0,0', 0.75);
  // the case: its front lip, its sloping top, the bevel round it
  polygon(ctx, [K(0, 0, lift(0)), K(1, 0, lift(0)), K(1, 0), K(0, 0)]);
  const lipG = ctx.createLinearGradient(0, K(0, 0, lift(0)).y, 0, K(0, 0).y);
  lipG.addColorStop(0, '#4a5056'); lipG.addColorStop(1, '#16181a');
  ctx.fillStyle = lipG;
  ctx.fill();
  polygon(ctx, [K(0, 1, lift(1)), K(1, 1, lift(1)), K(1, 0, lift(0)), K(0, 0, lift(0))]);
  const kg = ctx.createLinearGradient(0, K(0, 1, lift(1)).y, 0, K(0, 0, lift(0)).y);
  kg.addColorStop(0, '#2c3035'); kg.addColorStop(1, '#4a5057');
  ctx.fillStyle = kg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 1600; i++) {
    const p = K(rnd(), rnd(), 12);
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(220,232,240,0.04)';
    ctx.fillRect(p.x, p.y, 1.3 * u, 1.3 * u);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(220,232,240,0.2)';
  ctx.lineWidth = Math.max(0.8, u);
  const f0 = K(0, 0, lift(0)), f1 = K(1, 0, lift(0));
  ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y); ctx.stroke();
  // the well the keys stand in
  polygon(ctx, [K(0.022, 0.84, lift(0.84)), K(0.978, 0.84, lift(0.84)), K(0.978, 0.05, lift(0.05)), K(0.022, 0.05, lift(0.05))]);
  ctx.fillStyle = '#08090a';
  ctx.fill();
  // the strip above them: a badge, two lamps
  const badge = [K(0.035, 0.955, lift(0.955)), K(0.2, 0.955, lift(0.955)), K(0.2, 0.885, lift(0.885)), K(0.035, 0.885, lift(0.885))];
  polygon(ctx, badge);
  const bgd = ctx.createLinearGradient(0, badge[0].y, 0, badge[3].y);
  bgd.addColorStop(0, '#aab2b8'); bgd.addColorStop(1, '#5a6066');
  ctx.fillStyle = bgd;
  ctx.fill();
  [[0.9, '110,255,140', 1], [0.935, '255,170,60', 0.25]].forEach(([a, col, lit]) => {
    const p = K(a, 0.92, lift(0.92));
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 4 * u * p.k, 2.6 * u * p.k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${col},${lit})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 2.6 * u * p.k, 1.7 * u * p.k, 0, 0, Math.PI * 2); ctx.fill();
    if (lit === 1) soft(ctx, p.x, p.y, 12 * u, 8 * u, col, 0.35, 'lighter');
  });
  // the keys, row by row from the back; widths in key-units, fifteen to a row
  const ROWS = [
    [['ESC', 1, 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['DEL', 2, 2]],
    [['TAB', 1.5, 1], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5, 1]],
    [['CTRL', 1.8, 1], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['RETURN', 2.2, 1]],
    [['SHIFT', 2.3, 1], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['SHIFT', 2.7, 1]],
    [['', 1.6, 1], ['', 1.4, 1], ['', 9, 0], ['', 1.4, 1], ['', 1.6, 1]],
  ];
  const span = 0.978 - 0.022;
  ROWS.forEach((row, r) => {
    const bt = 0.82 - r * 0.156, bb = bt - 0.136; // the row's far and near edge
    let cursor = 0;
    for (const [legend, w, kind = 0] of row) {
      const a0 = 0.022 + (span * cursor) / 15 + 0.0035, a1 = 0.022 + (span * (cursor + w)) / 15 - 0.0035;
      cursor += w;
      const up = 7;
      // the skirt: its near face, which is what we see of the key's height
      const base = [K(a0, bb, lift(bb)), K(a1, bb, lift(bb))];
      const top = [
        K(a0 + 0.0028, bt - 0.02, lift(bt) + up), K(a1 - 0.0028, bt - 0.02, lift(bt) + up),
        K(a1 - 0.002, bb + 0.036, lift(bb) + up), K(a0 + 0.002, bb + 0.036, lift(bb) + up),
      ];
      const tone = kind === 2 ? ['#a03a2e', '#5a1c16', '#3a100c'] : kind === 1 ? ['#6e757c', '#444a50', '#22262a'] : ['#4a4f55', '#2a2e32', '#131517'];
      polygon(ctx, [K(a0, bt, lift(bt)), K(a1, bt, lift(bt)), base[1], base[0]]);
      ctx.fillStyle = '#050607';
      ctx.fill();
      polygon(ctx, [top[3], top[2], base[1], base[0]]);
      ctx.fillStyle = tone[2];
      ctx.fill();
      polygon(ctx, top);
      const tg = ctx.createLinearGradient(0, top[0].y, 0, top[3].y);
      tg.addColorStop(0, tone[1]);
      tg.addColorStop(1, tone[0]);
      ctx.fillStyle = tg;
      ctx.fill();
      // its dish: a soft dark in the middle of the top, light on its front rim
      const mid = { x: (top[0].x + top[2].x) / 2, y: (top[0].y + top[2].y) / 2 };
      soft(ctx, mid.x, mid.y, (top[1].x - top[0].x) * 0.34, (top[3].y - top[0].y) * 0.34, '0,0,0', 0.22);
      ctx.strokeStyle = 'rgba(232,240,236,0.3)';
      ctx.lineWidth = Math.max(0.6, 0.9 * u);
      ctx.beginPath(); ctx.moveTo(top[3].x, top[3].y); ctx.lineTo(top[2].x, top[2].y); ctx.stroke();
      // the tube's green along the edge toward it
      ctx.strokeStyle = `rgba(${PHOS},0.26)`;
      ctx.beginPath(); ctx.moveTo(top[0].x, top[0].y); ctx.lineTo(top[1].x, top[1].y); ctx.stroke();
      // its legend, lying on the top
      if (legend) {
        const size = (legend.length > 1 ? 4.6 : 7.4) * u * top[0].k;
        ctx.save();
        ctx.translate(mid.x, mid.y - 0.4 * u);
        ctx.scale(1, 0.62);
        ctx.fillStyle = kind === 2 ? 'rgba(255,236,226,0.85)' : 'rgba(226,232,226,0.82)';
        ctx.font = `600 ${size.toFixed(1)}px "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(legend, 0, 0);
        ctx.restore();
      }
    }
  });
  // the tube's green lying over the far rows, the lamp's warmth at the right
  const gl = K(0.5, 0.8, 20);
  soft(ctx, gl.x, gl.y, (x1 - x0) * 0.5, 30 * u, PHOS, 0.1, 'lighter');
  const wl = K(0.98, 0.4, 14);
  soft(ctx, wl.x, wl.y, 70 * u, 50 * u, WARM, 0.08, 'lighter');
  // its coiled lead, back to the terminal
  const c0 = K(0.62, 1, lift(1)), c1 = on(s.x + s.w * 0.56, 0.93);
  ctx.lineCap = 'round';
  for (const [w, col] of [[5.5, '#050607'], [3, '#2a2e32']]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w * u;
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y);
    ctx.bezierCurveTo(c0.x + 46 * u, c0.y - 22 * u, c1.x - 70 * u, c1.y + 18 * u, c1.x, c1.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // the mug: stoneware, coffee in it, the lamp on its side toward the lamp
  const mp = on(s.x + s.w + W * 0.045, 0.4);
  const r = 26 * u * mp.k, h = 50 * u * mp.k, e = 0.3;
  const mx = mp.x, my = mp.y;
  soft(ctx, mx - r * 1.2, my + r * 0.1, r * 2, r * 0.5, '0,0,0', 0.7);
  ctx.strokeStyle = '#2c3c44';
  ctx.lineWidth = r * 0.26;
  ctx.beginPath(); ctx.ellipse(mx - r * 1.05, my - h * 0.52, r * 0.5, h * 0.3, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx - r, my - h);
  ctx.lineTo(mx - r * 0.92, my);
  ctx.ellipse(mx, my, r * 0.92, r * 0.92 * e, 0, Math.PI, 0, true);
  ctx.lineTo(mx + r, my - h);
  ctx.closePath();
  const g = ctx.createLinearGradient(mx - r, 0, mx + r, 0);
  g.addColorStop(0, '#16242a');
  g.addColorStop(0.55, '#2e4852');
  g.addColorStop(0.82, '#6a8e96');
  g.addColorStop(1, '#2a4048');
  ctx.fillStyle = g;
  ctx.fill();
  // a band of unglazed clay near its foot
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(150,110,70,0.5)';
  ctx.fillRect(mx - r, my - h * 0.16, r * 2, h * 0.3);
  soft(ctx, mx + r * 0.6, my - h * 0.5, r * 0.3, h * 0.5, WARM, 0.25, 'lighter');
  ctx.restore();
  ctx.fillStyle = '#3a545c';
  ctx.beginPath(); ctx.ellipse(mx, my - h, r, r * e, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0e1a1e';
  ctx.beginPath(); ctx.ellipse(mx, my - h, r * 0.88, r * e * 0.84, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1e120a';
  ctx.beginPath(); ctx.ellipse(mx, my - h + r * 0.1, r * 0.8, r * e * 0.66, 0, 0, Math.PI * 2); ctx.fill();
  soft(ctx, mx + r * 0.3, my - h + r * 0.06, r * 0.3, r * 0.07, WARM, 0.5, 'lighter');
  D.mug = { x: mx, y: my - h, r };
}

// the lamp is clamped to the table's end, out of the picture to the right:
// only its arms come in
function paintLampStand(ctx, D) {
  D.lampBase = { x: D.W + 14 * D.u, y: D.H * 0.56 };
}

// the drawing lamp: two sprung arms up from its foot, a cone of a shade bent
// over the plotter, its light on the paper, the table and the wall behind
function paintLamp(ctx, D) {
  const { W, H, u, bed } = D;
  const l = D.lamp;
  const cx = (bed.bl.x + bed.br.x) / 2;
  // its light
  soft(ctx, cx, (bed.tl.y + bed.bl.y) / 2, (bed.br.x - bed.bl.x) * 0.8, (bed.bl.y - bed.tl.y) * 1.0, WARM, 0.16, 'lighter');
  soft(ctx, cx - 40 * u, bed.bl.y + 60 * u, (bed.br.x - bed.bl.x) * 0.7, 46 * u, WARM, 0.14, 'lighter');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${Math.round(14 * u)}px)`;
  const cone = ctx.createLinearGradient(0, l.y, 0, bed.bl.y);
  cone.addColorStop(0, `rgba(${WARM},0.18)`);
  cone.addColorStop(1, `rgba(${WARM},0)`);
  ctx.fillStyle = cone;
  polygon(ctx, [{ x: l.x - 40 * u, y: l.y + 18 * u }, { x: l.x + 26 * u, y: l.y + 28 * u }, { x: bed.br.x + 20 * u, y: bed.br.y }, { x: bed.bl.x - 10 * u, y: bed.bl.y }]);
  ctx.fill();
  ctx.restore();
  ctx.filter = 'none';
  // the arms: up from the foot to an elbow high on the right, then down and
  // across to the shade
  const base = D.lampBase;
  const elbow = { x: Math.min(W * 0.995, base.x + 6 * u), y: H * 0.1 };
  ctx.lineCap = 'round';
  for (const [w, col] of [[7, '#08090a'], [4.4, '#34383c'], [1.2, '#8a9096']]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w * u;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y - 2 * u);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(l.x + 14 * u, l.y - 22 * u);
    ctx.stroke();
  }
  ctx.fillStyle = '#121416';
  ctx.beginPath(); ctx.arc(elbow.x, elbow.y, 7 * u, 0, Math.PI * 2); ctx.fill();
  // the shade, tilted down at the bed, bright inside
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(0.3);
  ctx.beginPath();
  ctx.moveTo(-12 * u, -28 * u);
  ctx.lineTo(12 * u, -28 * u);
  ctx.lineTo(46 * u, 22 * u);
  ctx.lineTo(-46 * u, 22 * u);
  ctx.closePath();
  const sg = ctx.createLinearGradient(-46 * u, 0, 46 * u, 0);
  sg.addColorStop(0, '#0e1a14');
  sg.addColorStop(0.4, '#2e5a44');
  sg.addColorStop(0.55, '#3e7458');
  sg.addColorStop(1, '#0a1410');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.fillStyle = '#16181a';
  ctx.fillRect(-8 * u, -36 * u, 16 * u, 10 * u);
  ctx.fillStyle = '#fff4d0';
  ctx.beginPath(); ctx.ellipse(0, 22 * u, 46 * u, 9 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  soft(ctx, l.x - 8 * u, l.y + 32 * u, 90 * u, 56 * u, WARM, 0.55, 'lighter');
}

// the room's dark: the lamp and the tube are all the light there is
function paintDark(ctx, D) {
  const { W, H, u, bed } = D;
  const s = D.screen;
  const a = { x: s.x + s.w / 2, y: s.y + s.h * 0.72 }, b = { x: (bed.bl.x + bed.br.x) / 2, y: (bed.tl.y + bed.bl.y) / 2 };
  const step = Math.max(6, Math.round(10 * u));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const da = Math.hypot((x - a.x) / (s.w * 0.84), (y - a.y) / (s.h * 1.25));
      const db = Math.hypot((x - b.x) / (W * 0.24), (y - b.y) / (H * 0.5));
      const dark = Math.min(0.8, Math.max(0, Math.min(da, db) - 0.56) * 1.2);
      if (dark <= 0.004) continue;
      ctx.fillStyle = `rgba(3,5,6,${dark.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}
