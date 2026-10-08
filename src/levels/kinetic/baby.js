import { makeCanvas, soft } from '../../shared/paint.js';

/** The sleeping baby, modelled in the crib rather than drawn on it: a pillow
 * with the dent of a head in it, a swaddled body that is a real mound with a
 * lit side and a shaded one, a round head in a knitted cap turned a little
 * toward us, a plush bunny beside it; and, in a picture of its own so it can
 * rise and fall with the breathing, the quilt draped over the legs. All in
 * the crib's own centimetres (u across, v along toward the head, heights
 * above the mattress) and seen by the room's camera. */

const R = 2; // painted at twice their size
// the lamp stands behind the crib, high, a little toward its head: the
// light in the crib's own frame (u toward us, up, v toward the head)
export const LIGHT = norm([-0.35, 0.9, 0.2]);
const SKIN = ['#fde6d8', '#f1c6b2', '#b98474'];

function norm([x, y, z]) {
  const n = Math.hypot(x, y, z);
  return [x / n, y / n, z / n];
}

// a picture cropped to what a block of the crib covers on the screen, drawn
// in screen pixels
function sprite(L, draw) {
  const Y = top(L);
  const pts = [];
  for (const u of [-38, 38]) for (const v of [-34, 62]) for (const h of [0, 34]) pts.push(L.crib(u, Y + h, v));
  const x0 = Math.floor(Math.min(...pts.map((p) => p.x))), x1 = Math.ceil(Math.max(...pts.map((p) => p.x)));
  const y0 = Math.floor(Math.min(...pts.map((p) => p.y))), y1 = Math.ceil(Math.max(...pts.map((p) => p.y)));
  const canvas = makeCanvas((x1 - x0) * R, (y1 - y0) * R), g = canvas.getContext('2d');
  g.scale(R, R);
  g.translate(-x0, -y0);
  g.lineJoin = 'round';
  draw(g);
  return { canvas, x: x0, y: y0 };
}

const top = (L) => L.size.mattress + 1.5; // the sheet

/** A soft solid lying on the mattress: a height for every (u, v), cut into
 * small facets, each lit by how it faces the moon. `tone(u, v)` gives its
 * colour there as [r, g, b]. Drawn from the far rail toward us. */
function mound(g, L, { u0, u1, v0, v1, step = 1, height, tone, gloss = 0 }) {
  const Y = top(L);
  const P = (u, v) => L.crib(u, Y + height(u, v), v);
  for (let u = u0; u < u1; u += step) {
    for (let v = v1; v > v0; v -= step) {
      const h = height(u + step / 2, v - step / 2);
      if (h <= 0.02) continue;
      // which way this facet faces
      const e = 0.4;
      const du = (height(u + step / 2 + e, v - step / 2) - height(u + step / 2 - e, v - step / 2)) / (2 * e);
      const dv = (height(u + step / 2, v - step / 2 + e) - height(u + step / 2, v - step / 2 - e)) / (2 * e);
      const n = norm([-du, 1, -dv]);
      const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      const k = 0.36 + 0.86 * lit + gloss * lit ** 12;
      const [r, gr, b] = tone(u + step / 2, v - step / 2);
      const col = `rgb(${Math.min(255, r * k) | 0},${Math.min(255, gr * k) | 0},${Math.min(255, b * k) | 0})`;
      const a = P(u, v), b2 = P(u + step, v), c = P(u + step, v - step), d = P(u, v - step);
      g.beginPath();
      g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y);
      g.closePath();
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 0.5;
      g.fill(); g.stroke();
    }
  }
}

// a ball, lit from the moon's side, with a soft dark where it turns away
function ball(g, p, r, [light, mid, dark]) {
  const grd = g.createRadialGradient(p.x + r * 0.34, p.y - r * 0.42, r * 0.08, p.x, p.y, r * 1.02);
  grd.addColorStop(0, light); grd.addColorStop(0.6, mid); grd.addColorStop(1, dark);
  g.fillStyle = grd;
  g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
}

// the body under its wrap: highest along the middle, rounded at the
// shoulders, a little bump where the feet are
const BODY_U = -2;
function bodyHeight(u, v) {
  if (v > 35 || v < -24) return 0;
  const along = v > 27 ? Math.sqrt(Math.max(0, 1 - ((v - 27) / 8) ** 2)) : v < -18 ? Math.sqrt(Math.max(0, 1 - ((-18 - v) / 6) ** 2)) : 1;
  const girth = 12.5 - Math.max(0, 20 - v) * 0.06;
  const across = Math.max(0, 1 - ((u - BODY_U) / girth) ** 2);
  const feet = 2.4 * Math.exp(-(((v + 15) / 4) ** 2) - ((u - BODY_U) / 5) ** 2);
  return (10.5 - Math.max(0, 20 - v) * 0.07) * Math.sqrt(across) * along + feet * along;
}

export function paintBaby(L) {
  const Y = top(L);
  return sprite(L, (g) => {
    const C = (u, h, v) => L.crib(u, Y + h, v);
    // the pillow: plump, sunk in the middle where the head lies
    const pillow = (u, v) => {
      const a = Math.max(0, 1 - (u / 27) ** 4), b = Math.max(0, 1 - ((v - 45) / 13.5) ** 4);
      const dent = 3.2 * Math.exp(-(((u + 2) / 9) ** 2) - ((v - 42) / 8) ** 2);
      return Math.max(0, 5.4 * Math.sqrt(a * b) - dent);
    };
    const ps = C(-3, 0, 44);
    soft(g, ps.x - 6 * ps.s, ps.y + 3 * ps.s, 30 * ps.s, 11 * ps.s, '30,14,60', 0.5);
    mound(g, L, { u0: -28, u1: 28, v0: 31, v1: 59, height: pillow, tone: (u, v) => {
      // a frilled edge, a shade paler
      const edge = Math.abs(u) > 24.5 || Math.abs(v - 45) > 11.5;
      return edge ? [226, 214, 244] : [206, 192, 232];
    } });
    // the swaddled body: lavender cloth with little stars, a fold across it
    const bs = C(-9, 0, 8);
    soft(g, bs.x, bs.y + 2 * bs.s, 17 * bs.s, 24 * bs.s, '30,14,60', 0.42);
    mound(g, L, { u0: -17, u1: 13, v0: -25, v1: 36, height: bodyHeight, gloss: 0.12, tone: (u, v) => {
      const cu = ((u + 40) % 6) - 3, cv = ((v + 40 + (Math.floor((u + 40) / 6) % 2) * 3) % 6) - 3;
      if (cu * cu + cv * cv < 0.8) return [240, 232, 252];
      // the wrap's edge crossing the chest
      const fold = Math.abs(v - 24 + (u + 2) * 0.55) < 0.55;
      return fold ? [112, 92, 158] : [164, 144, 208];
    } });
    // the head: round, resting in the pillow's dent, the face turned up and
    // a little toward us
    const hc = C(BODY_U, 9.5, 42.5);
    const r = 9.3 * hc.s;
    soft(g, hc.x - r * 0.55, hc.y + r * 0.75, r * 1.2, r * 0.5, '30,14,60', 0.5);
    ball(g, hc, r, SKIN);
    // it sleeps with its face turned to us, the crown toward the headboard:
    // everything on the face is drawn lying over on its side
    const lie = (draw) => {
      g.save();
      g.translate(hc.x, hc.y); g.rotate(1.2); g.translate(-hc.x, -hc.y);
      draw();
      g.restore();
    };
    lie(() => {
    ball(g, { x: hc.x - r * 0.97, y: hc.y + r * 0.12 }, r * 0.2, [SKIN[0], SKIN[1], SKIN[2]]);
    g.save();
    g.beginPath(); g.arc(hc.x, hc.y, r, 0, Math.PI * 2); g.clip();
    // the soft dark under the chin and down the far cheek
    soft(g, hc.x - r * 0.75, hc.y + r * 0.5, r * 0.7, r * 0.8, '150,90,90', 0.35);
    // cheeks
    for (const d of [-1, 1]) soft(g, hc.x + d * r * 0.5, hc.y + r * 0.34, r * 0.3, r * 0.2, '240,120,140', 0.55);
    // shut eyes with their lashes, a button nose, a small mouth
    g.strokeStyle = '#6a4048'; g.lineCap = 'round'; g.lineWidth = Math.max(0.7, r * 0.055);
    for (const d of [-1, 1]) {
      const ex = hc.x + d * r * 0.36, ey = hc.y + r * 0.1;
      g.beginPath(); g.arc(ex, ey - r * 0.1, r * 0.19, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
      for (const t of [0.3, 0.5, 0.7]) {
        const a = t * Math.PI;
        g.beginPath();
        g.moveTo(ex + Math.cos(a) * r * 0.19, ey - r * 0.1 + Math.sin(a) * r * 0.19);
        g.lineTo(ex + Math.cos(a) * r * 0.26, ey - r * 0.1 + Math.sin(a) * r * 0.26);
        g.stroke();
      }
    }
    ball(g, { x: hc.x + r * 0.02, y: hc.y + r * 0.36 }, r * 0.1, ['#ffe2d6', '#eab0a0', '#c88878']);
    g.strokeStyle = '#b06a70'; g.lineWidth = Math.max(0.7, r * 0.05);
    g.beginPath(); g.arc(hc.x, hc.y + r * 0.56, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.restore();
    // the knitted cap over the crown: ribbed, a turned-up band, a pompom
    g.save();
    g.beginPath(); g.arc(hc.x, hc.y, r * 1.06, 0, Math.PI * 2); g.clip();
    g.beginPath();
    g.ellipse(hc.x, hc.y - r * 0.5, r * 1.12, r * 0.74, 0, 0, Math.PI * 2);
    const cg = g.createRadialGradient(hc.x + r * 0.4, hc.y - r * 0.9, r * 0.1, hc.x, hc.y - r * 0.5, r * 1.15);
    cg.addColorStop(0, '#e6d6fa'); cg.addColorStop(0.55, '#a88cd8'); cg.addColorStop(1, '#5e4692');
    g.fillStyle = cg; g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(70,46,120,0.35)'; g.lineWidth = Math.max(0.6, r * 0.035);
    for (let i = -7; i <= 7; i++) {
      g.beginPath();
      g.moveTo(hc.x + i * r * 0.05, hc.y - r * 1.25);
      g.quadraticCurveTo(hc.x + i * r * 0.13, hc.y - r * 0.6, hc.x + i * r * 0.15, hc.y + r * 0.3);
      g.stroke();
    }
    g.restore();
    // the band, following the brow
    g.strokeStyle = '#cbb6ee'; g.lineWidth = r * 0.2; g.lineCap = 'butt';
    g.beginPath(); g.ellipse(hc.x, hc.y - r * 0.5, r * 1.04, r * 0.68, 0, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke();
    g.strokeStyle = 'rgba(70,46,120,0.4)'; g.lineWidth = Math.max(0.5, r * 0.03);
    for (let i = 0; i <= 16; i++) {
      const a = (0.14 + (i / 16) * 0.72) * Math.PI;
      const x = hc.x + Math.cos(a) * r * 1.04, y = hc.y - r * 0.5 + Math.sin(a) * r * 0.68;
      g.beginPath(); g.moveTo(x, y - r * 0.09); g.lineTo(x, y + r * 0.09); g.stroke();
    }
    g.restore();
    ball(g, { x: hc.x - r * 0.05, y: hc.y - r * 1.12 }, r * 0.3, ['#faf2ff', '#c8b0ea', '#7a60ac']);
    });
    // one small hand out of the wrap, by the chin
    const hand = C(5, 10.5, 31.5);
    ball(g, hand, 2.5 * hand.s, SKIN);
    g.strokeStyle = 'rgba(170,110,100,0.5)'; g.lineWidth = Math.max(0.5, 0.3 * hand.s);
    for (const dx of [-0.8, 0.2, 1.2]) {
      g.beginPath(); g.moveTo(hand.x + dx * hand.s, hand.y - 1.6 * hand.s); g.lineTo(hand.x + dx * hand.s, hand.y - 0.2 * hand.s); g.stroke();
    }
    // the plush bunny lying at its side: body, head, two long ears
    const fur = ['#f6eefc', '#c0aadc', '#7c66a6'];
    const bb = C(19, 4.6, 33), bh = C(18.4, 5, 41);
    soft(g, bb.x - 4 * bb.s, bb.y + 3 * bb.s, 9 * bb.s, 6 * bb.s, '30,14,60', 0.45);
    for (const d of [-1, 1]) {
      const e0 = C(18.4 + d * 2.2, 5, 44), e1 = C(18.4 + d * 4.4, 2.6, 53);
      g.strokeStyle = fur[2]; g.lineCap = 'round'; g.lineWidth = 3.4 * e0.s;
      g.beginPath(); g.moveTo(e0.x, e0.y); g.lineTo(e1.x, e1.y); g.stroke();
      g.strokeStyle = fur[0]; g.lineWidth = 2.6 * e0.s; g.stroke();
      g.strokeStyle = 'rgba(240,160,190,0.75)'; g.lineWidth = 1.1 * e0.s; g.stroke();
    }
    ball(g, bb, 5.6 * bb.s, fur);
    ball(g, bh, 4.4 * bh.s, fur);
    g.fillStyle = '#4a3a5a';
    for (const d of [-1, 1]) { g.beginPath(); g.arc(bh.x + d * 1.5 * bh.s, bh.y - 0.2 * bh.s, 0.5 * bh.s, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e88aa8';
    g.beginPath(); g.arc(bh.x, bh.y + 1.1 * bh.s, 0.55 * bh.s, 0, Math.PI * 2); g.fill();
  });
}

/** The quilt over the legs: plum, quilted in squares with a little moon in
 * each, a lilac border; it lies over the body's shape and out flat onto the
 * sheet at either side. */
export function paintBlanket(L) {
  return sprite(L, (g) => {
    const u0 = -25, u1 = 21, v0 = -29, v1 = 21;
    const drape = (u, v) => {
      // where it runs out toward its edges it lies down on the sheet
      const edge = Math.min(1, (u - u0) / 4, (u1 - u) / 4, (v - v0) / 3, (v1 - v) / 2.5);
      if (edge <= 0) return 0;
      const body = bodyHeight(BODY_U + (u - BODY_U) * 0.72, Math.min(v, 20)) * 1.05;
      const spread = 9 * Math.exp(-(((u - BODY_U) / 11) ** 2)) * (v > -22 ? 1 : Math.max(0, 1 + (v + 22) / 6));
      const wrinkle = 0.45 * Math.sin(v * 0.55 + u * 0.35) + 0.3 * Math.sin(u * 0.9 - v * 0.2);
      return Math.max(0.7, Math.max(body, spread * 0.55) + 1.4 + wrinkle) * Math.min(1, edge + 0.25);
    };
    const s = L.crib(-12, top(L), -4);
    soft(g, s.x, s.y + 2 * s.s, 22 * s.s, 30 * s.s, '30,14,60', 0.4);
    mound(g, L, { u0, u1, v0, v1, step: 0.5, height: drape, gloss: 0.1, tone: (u, v) => {
      // the border, then the quilting's stitched lines, then a moon a square
      if (u < u0 + 2.2 || u > u1 - 2.2 || v < v0 + 2.2 || v > v1 - 2.2) return [188, 166, 228];
      const qu = (((u - u0) % 8) + 8) % 8, qv = (((v - v0) % 8) + 8) % 8;
      if (qu < 0.5 || qv < 0.5) return [78, 52, 120];
      const mx = qu - 4.25, my = qv - 4.25;
      if (mx * mx + my * my < 2.6 && (mx - 0.9) ** 2 + (my + 0.5) ** 2 > 1.7) return [226, 210, 250];
      return [116, 82, 164];
    } });
  });
}
