import { soft } from '../../shared/paint.js';

/** The sleeping baby, painted flat as seen from straight above, in
 * centimetres: a across the mattress, b along it toward the feet, the head
 * at b = -12. The room lays these drawings onto the mattress in its
 * perspective. A lilac knitted cap, closed eyes, rosy cheeks, one tiny hand
 * out of a lavender swaddle; the quilt over the legs is drawn apart so it
 * can rise and fall with the breathing. */

const SKIN = ['#fbe4d6', '#f0c4b0', '#c88e80'];

export function paintBabyFlat(ctx) {
  // the shadow the little sleeper makes in the sheet
  soft(ctx, 1.5, 16, 17, 36, '40,20,60', 0.45);
  // the swaddle: a soft cocoon, wrapped folds crossing it
  ctx.beginPath();
  ctx.moveTo(-12.5, -3);
  ctx.bezierCurveTo(-14.5, 12, -12, 34, -8, 44);
  ctx.quadraticCurveTo(0, 50, 8, 44);
  ctx.bezierCurveTo(12, 34, 14.5, 12, 12.5, -3);
  ctx.quadraticCurveTo(0, -7, -12.5, -3);
  ctx.closePath();
  const sw = ctx.createLinearGradient(-13, 0, 13, 0);
  sw.addColorStop(0, '#c0aee6');
  sw.addColorStop(0.45, '#9c86cc');
  sw.addColorStop(1, '#5e4a8e');
  ctx.fillStyle = sw;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // little white stars on the cloth
  ctx.fillStyle = 'rgba(246,240,255,0.55)';
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -9 + col * 6 + (row % 2) * 3;
      const y = 2 + row * 6.4;
      star(ctx, x, y, 0.9);
    }
  }
  // the wrap's folds
  ctx.strokeStyle = 'rgba(60,40,100,0.45)';
  ctx.lineWidth = 0.7;
  for (const [x0, y0, x1, y1, cx, cy] of [
    [-12, 2, 10, 20, -2, 6],
    [12, 4, -11, 24, 2, 10],
    [-11, 26, 9, 38, -1, 30],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(230,220,250,0.3)';
  ctx.beginPath();
  ctx.moveTo(-11.5, 3);
  ctx.quadraticCurveTo(-2.5, 7, 9.5, 20.5);
  ctx.stroke();
  ctx.restore();
  // the swaddle's soft collar round the chin
  ctx.fillStyle = '#b4a0e0';
  ctx.beginPath();
  ctx.ellipse(0, -3, 10.5, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // one tiny hand peeping out by the chin
  ctx.fillStyle = SKIN[0];
  ctx.beginPath();
  ctx.ellipse(4.6, -2.2, 2.3, 1.8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,120,110,0.5)';
  ctx.lineWidth = 0.35;
  ctx.stroke();
  // the head and face
  const hg = ctx.createRadialGradient(-2.5, -14, 1, 0, -12, 10.5);
  hg.addColorStop(0, SKIN[0]);
  hg.addColorStop(0.7, SKIN[1]);
  hg.addColorStop(1, SKIN[2]);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, -12, 8.6, 9.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // ears
  for (const d of [-1, 1]) {
    ctx.fillStyle = SKIN[1];
    ctx.beginPath();
    ctx.ellipse(d * 8.4, -11.5, 1.4, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // rosy cheeks
  for (const d of [-1, 1]) soft(ctx, d * 4.6, -8.2, 2.6, 1.8, '240,130,150', 0.55);
  // closed eyes: soft downward arcs with little lashes
  ctx.strokeStyle = '#6a4048';
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(d * 3.3, -11.6, 1.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    for (const t of [0.3, 0.5, 0.7]) {
      const a = t * Math.PI;
      const x = d * 3.3 + Math.cos(a) * 1.7;
      const y = -11.6 + Math.sin(a) * 1.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.6);
      ctx.stroke();
    }
  }
  // a button nose, a small content mouth
  ctx.fillStyle = 'rgba(200,130,120,0.6)';
  ctx.beginPath();
  ctx.ellipse(0, -8.6, 0.9, 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b06a70';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(0, -6.9, 1.1, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // the knitted cap with its pompom, over the top of the head
  ctx.beginPath();
  ctx.ellipse(0, -14.5, 9.1, 7.4, 0, Math.PI * 0.98, Math.PI * 2.02);
  ctx.closePath();
  const cg = ctx.createLinearGradient(-9, -20, 9, -12);
  cg.addColorStop(0, '#d6c2f0');
  cg.addColorStop(1, '#8a6cc0');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.fillStyle = '#c4aee8';
  ctx.beginPath();
  ctx.roundRect(-9.2, -15.6, 18.4, 2.6, 1.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,140,0.35)';
  ctx.lineWidth = 0.35;
  for (let x = -8; x <= 8; x += 1.6) {
    ctx.beginPath();
    ctx.moveTo(x, -15.5);
    ctx.lineTo(x, -13.1);
    ctx.stroke();
  }
  const pg = ctx.createRadialGradient(-0.8, -22.5, 0.3, 0, -21.8, 3);
  pg.addColorStop(0, '#f6eefe');
  pg.addColorStop(1, '#b8a0e0');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(0, -21.8, 2.9, 0, Math.PI * 2);
  ctx.fill();
}

// the little quilt over the legs: plum, a scalloped lilac edge, tiny moons
export function paintBlanketFlat(ctx) {
  const top = 15;
  ctx.beginPath();
  ctx.moveTo(-19, top + 2);
  for (let i = 0; i <= 8; i++) {
    const x = -19 + (38 * i) / 8;
    ctx.quadraticCurveTo(x - 2.4, top - 1.6, x, top + (i % 2 ? 0 : 1));
  }
  ctx.lineTo(18, 47);
  ctx.quadraticCurveTo(0, 51, -18, 47);
  ctx.closePath();
  const g = ctx.createLinearGradient(-19, 0, 19, 0);
  g.addColorStop(0, '#8e68b8');
  g.addColorStop(0.5, '#6a4896');
  g.addColorStop(1, '#3e2a62');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(240,226,255,0.6)';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      moon(ctx, -14 + col * 7 + (row % 2) * 3.5, top + 6 + row * 7.5, 1.1);
    }
  }
  // the folds the legs make under it
  ctx.strokeStyle = 'rgba(30,16,50,0.4)';
  ctx.lineWidth = 0.8;
  for (const x of [-6, 5]) {
    ctx.beginPath();
    ctx.moveTo(x, top + 4);
    ctx.quadraticCurveTo(x * 0.6, top + 18, x * 0.9, 46);
    ctx.stroke();
  }
  ctx.restore();
  // the lilac trim along its top
  ctx.strokeStyle = '#d4bff0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const x = -19 + (38 * i) / 8;
    if (i) ctx.quadraticCurveTo(x - 2.4, top - 1.6, x, top + (i % 2 ? 0 : 1));
    else ctx.moveTo(x, top + 2);
  }
  ctx.stroke();
}

// a plush bunny to keep the baby company in the crib, lying at the head
export function paintBunnyFlat(ctx) {
  soft(ctx, 0.8, 1, 6.5, 8, '40,20,60', 0.4);
  const fur = (x, y, rx, ry, a = 0) => {
    const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0.2, x, y, Math.max(rx, ry));
    g.addColorStop(0, '#f2e8fb');
    g.addColorStop(1, '#a890cc');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const d of [-1, 1]) {
    fur(d * 2.2, -8.5, 1.5, 4.2, d * 0.25);
    ctx.fillStyle = 'rgba(240,160,190,0.7)';
    ctx.beginPath();
    ctx.ellipse(d * 2.2, -8.5, 0.7, 3, d * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  fur(0, 3, 4.6, 5.4);
  fur(0, -3, 3.8, 3.4);
  ctx.strokeStyle = '#4a3a5a';
  ctx.lineWidth = 0.4;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(d * 1.4, -3.4, 0.7, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = '#e88aa8';
  ctx.beginPath();
  ctx.arc(0, -2.2, 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function moon(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0.35 * Math.PI, 1.65 * Math.PI, false);
  ctx.arc(x + r * 0.45, y - r * 0.15, r * 0.8, 1.6 * Math.PI, 0.4 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
}
