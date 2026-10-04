import { makeCanvas, soft, lcg } from '../../shared/paint.js';

/** A softly modelled sleeping baby. The painting has its own local plane,
 * aligned with the mattress; a separate blanket allows quiet breathing. */
export function paintSleepingBaby() {
  const canvas = makeCanvas(680, 360), ctx = canvas.getContext('2d');
  const blanket = makeCanvas(680, 360), cloth = blanket.getContext('2d');
  const rnd = lcg(2918);
  soft(ctx, 346, 237, 260, 105, '2,1,8', 0.75);

  // An ivory fitted sheet catches the moon on the baby's right side.
  const sheet = ctx.createLinearGradient(0, 120, 280, 330);
  sheet.addColorStop(0, '#6d667f'); sheet.addColorStop(0.5, '#484055'); sheet.addColorStop(1, '#201b2c');
  ctx.fillStyle = sheet;
  ctx.beginPath(); ctx.moveTo(61, 185);
  ctx.bezierCurveTo(54, 139, 78, 119, 160, 132);
  ctx.bezierCurveTo(252, 119, 285, 170, 263, 239);
  ctx.bezierCurveTo(232, 273, 109, 274, 63, 237); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(174,161,195,.14)'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = 'rgba(28,20,43,.18)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(72 + i * 12, 251); ctx.quadraticCurveTo(121 + i * 9, 210, 83 + i * 12, 143); ctx.stroke();
  }

  // The sleeper and shoulder under the blanket, with one small tucked hand.
  blob(ctx, 293, 223, 87, 54, ['#756880', '#4d3d5c', '#211b31'], -0.08);
  blob(ctx, 229, 194, 34, 21, ['#9b7a83', '#755465', '#35273e'], 0.35);
  blob(ctx, 232, 179, 27, 20, ['#ab8891', '#805e72', '#403044'], -0.25);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = 'rgba(52,31,52,.46)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(226 + i * 6, 164); ctx.quadraticCurveTo(220 + i * 6, 174, 230 + i * 5, 180); ctx.stroke();
  }

  // Far ear, round cranium, jaw and cheek form a continuous sleeping profile.
  blob(ctx, 112, 181, 16, 23, ['#8f6b7e', '#63455e', '#302338'], -0.2);
  ctx.save(); ctx.translate(169, 158); ctx.rotate(0.19);
  const skin = ctx.createRadialGradient(27, -28, 4, -11, 0, 89);
  skin.addColorStop(0, '#b398a2'); skin.addColorStop(0.33, '#9a7c8c');
  skin.addColorStop(0.69, '#77576f'); skin.addColorStop(1, '#37273e');
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.moveTo(-58, -24);
  ctx.bezierCurveTo(-56, -78, 17, -85, 50, -48);
  ctx.bezierCurveTo(71, -24, 65, -4, 67, 12);
  ctx.bezierCurveTo(84, 25, 67, 36, 57, 34);
  ctx.bezierCurveTo(53, 64, 12, 77, -20, 59);
  ctx.bezierCurveTo(-43, 49, -65, 8, -58, -24); ctx.closePath(); ctx.fill();
  soft(ctx, 37, 30, 30, 25, '170,110,133', 0.20);
  soft(ctx, 25, -28, 37, 31, '195,172,190', 0.13);

  // Wispy newborn hair follows the head, without a hard cap outline.
  ctx.save(); ctx.beginPath(); ctx.ellipse(-5, -16, 58, 58, 0, Math.PI, Math.PI * 2.10); ctx.clip();
  soft(ctx, -33, -42, 73, 63, '27,18,33', 0.49);
  for (let i = 0; i < 95; i++) {
    const x = -62 + rnd() * 98, y = -70 + rnd() * 60;
    ctx.strokeStyle = `rgba(37,24,39,${0.08 + rnd() * 0.2})`; ctx.lineWidth = 0.55 + rnd() * 0.6;
    ctx.beginPath(); ctx.moveTo(x, y + 15); ctx.quadraticCurveTo(x - 8, y - 12, x + 20, y - 15); ctx.stroke();
  }
  ctx.restore();
  // Closed eyelids, a short lash at each corner, a tiny nose and relaxed lips.
  ctx.lineCap = 'round'; ctx.strokeStyle = '#493347'; ctx.lineWidth = 2.3;
  ctx.beginPath(); ctx.moveTo(21, 6); ctx.quadraticCurveTo(35, 16, 46, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-13, 2); ctx.quadraticCurveTo(-5, 10, 5, 5); ctx.stroke();
  ctx.lineWidth = 1.05;
  ctx.beginPath(); ctx.moveTo(42, 11); ctx.lineTo(47, 14); ctx.moveTo(37, 13); ctx.lineTo(40, 17); ctx.stroke();
  ctx.strokeStyle = 'rgba(205,170,187,.30)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(22, 3); ctx.quadraticCurveTo(36, 10, 46, 5); ctx.stroke();
  soft(ctx, 53, 23, 13, 9, '209,166,177', 0.24);
  ctx.strokeStyle = 'rgba(63,37,56,.46)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(53, 29); ctx.quadraticCurveTo(59, 32, 63, 28); ctx.stroke();
  ctx.strokeStyle = '#805264'; ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(29, 46); ctx.quadraticCurveTo(38, 50, 45, 44); ctx.stroke();
  ctx.strokeStyle = 'rgba(211,156,171,.26)'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(33, 50); ctx.quadraticCurveTo(39, 53, 43, 49); ctx.stroke();
  ctx.restore();

  // A rounded quilt has weight, a folded hem, stitches and soft cloth valleys.
  cloth.beginPath(); cloth.moveTo(262, 159);
  cloth.bezierCurveTo(313, 131, 381, 151, 433, 176);
  cloth.bezierCurveTo(507, 178, 560, 200, 580, 244);
  cloth.bezierCurveTo(591, 284, 541, 300, 485, 296);
  cloth.bezierCurveTo(419, 299, 329, 283, 282, 262);
  cloth.bezierCurveTo(266, 220, 275, 192, 262, 159); cloth.closePath();
  const quilt = cloth.createLinearGradient(360, 150, 362, 300);
  quilt.addColorStop(0, '#80748f'); quilt.addColorStop(0.24, '#625471');
  quilt.addColorStop(0.64, '#463853'); quilt.addColorStop(1, '#211a2c');
  cloth.fillStyle = quilt; cloth.fill(); cloth.save(); cloth.clip();
  soft(cloth, 370, 178, 132, 64, '159,143,178', 0.19);
  for (let i = 0; i < 11; i++) {
    const x = 272 + i * 27;
    cloth.strokeStyle = 'rgba(22,14,32,.18)'; cloth.lineWidth = 4;
    cloth.beginPath(); cloth.moveTo(x, 156); cloth.bezierCurveTo(x + 31, 190, x - 14, 244, x + 14, 295); cloth.stroke();
    cloth.strokeStyle = 'rgba(165,144,184,.13)'; cloth.lineWidth = 1.1;
    cloth.beginPath(); cloth.moveTo(x + 4, 156); cloth.bezierCurveTo(x + 35, 190, x - 10, 244, x + 18, 295); cloth.stroke();
  }
  for (let y = 162; y < 300; y += 5) for (let x = 266; x < 595; x += 5) {
    cloth.strokeStyle = `rgba(193,175,207,${0.024 + rnd() * 0.045})`; cloth.lineWidth = 0.65;
    cloth.beginPath(); cloth.moveTo(x, y); cloth.lineTo(x + 2, y + 2); cloth.lineTo(x + 4, y); cloth.stroke();
  }
  cloth.restore();
  cloth.strokeStyle = '#84748e'; cloth.lineWidth = 5;
  cloth.beginPath(); cloth.moveTo(264, 160); cloth.bezierCurveTo(289, 192, 266, 227, 284, 261); cloth.stroke();
  cloth.strokeStyle = 'rgba(192,174,207,.35)'; cloth.lineWidth = 1.1; cloth.stroke();
  // One tiny stitched crescent, a nursery detail with no puzzle significance.
  cloth.strokeStyle = 'rgba(173,155,184,.38)'; cloth.lineWidth = 1.1;
  cloth.beginPath(); cloth.arc(406, 221, 10, 0.8, 5.2); cloth.bezierCurveTo(395, 217, 398, 227, 413, 228); cloth.stroke();
  return { canvas, blanket };
}

function blob(ctx, x, y, rx, ry, colors, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const g = ctx.createRadialGradient(rx * 0.3, -ry * 0.4, 1, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, colors[0]); g.addColorStop(0.55, colors[1]); g.addColorStop(1, colors[2]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
