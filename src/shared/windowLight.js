import { lcg, soft, polygon, grain } from './paint.js';

// Canvas scenery shared by the three rooms about light. Puzzle apertures and
// shadows remain in their own levels; none of these helpers writes an answer.
export function paintPlaster(ctx, W, H, horizon) {
  const wall = ctx.createLinearGradient(0, 0, 0, horizon);
  wall.addColorStop(0, '#080d14'); wall.addColorStop(0.7, '#1c2530'); wall.addColorStop(1, '#11161c');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
  soft(ctx, W * 0.5, horizon * 0.55, W * 0.56, H * 0.64, '85,111,142', 0.17);
  const rnd = lcg(31081);
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 110; i++) {
    const x = rnd() * W, y = rnd() * horizon;
    ctx.strokeStyle = `rgba(165,176,181,${0.015 + rnd() * 0.025})`;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 36, y + 8 + rnd() * 45); ctx.stroke();
  }
  // Recessed wooden wall panels, their moulding just catching the moon.
  for (let x = W * 0.02; x < W; x += W * 0.14) {
    ctx.strokeStyle = '#0b1016'; ctx.lineWidth = 4;
    ctx.strokeRect(x, horizon * 0.29, W * 0.113, horizon * 0.66);
    ctx.strokeStyle = 'rgba(118,137,151,0.11)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, horizon * 0.29 + 3, W * 0.113 - 6, horizon * 0.66 - 6);
  }
  ctx.fillStyle = '#080d12'; ctx.fillRect(0, horizon - 9, W, 14);
  ctx.fillStyle = '#35404a'; ctx.globalAlpha = 0.4; ctx.fillRect(0, horizon - 9, W, 1); ctx.globalAlpha = 1;
}

export function paintBoards(ctx, W, H, horizon, lit = false) {
  const floor = ctx.createLinearGradient(0, horizon, 0, H);
  floor.addColorStop(0, lit ? '#a4b3c5' : '#191c21');
  floor.addColorStop(1, lit ? '#687c94' : '#0b1016');
  ctx.fillStyle = floor; ctx.fillRect(0, horizon, W, H - horizon);
  const rnd = lcg(88203);
  for (let i = -6; i <= 15; i++) {
    const x = i * W / 10, far = W * 0.5 + (x - W * 0.5) * 0.42;
    ctx.strokeStyle = lit ? 'rgba(37,54,70,0.28)' : 'rgba(4,7,11,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(far, horizon); ctx.lineTo(x, H); ctx.stroke();
    for (let j = 0; j < 17; j++) {
      const t = rnd(), start = horizon + (H - horizon) * t;
      const xx = far + (x - far) * t + rnd() * W * (0.025 + t * 0.025);
      ctx.strokeStyle = lit ? 'rgba(28,42,57,0.09)' : 'rgba(138,141,143,0.033)'; ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.moveTo(xx, start);
      ctx.bezierCurveTo(xx + 4, start + 15, xx - 2, start + 34, xx + 2, start + 55); ctx.stroke();
    }
  }
  for (const t of [0.08, 0.25, 0.51, 0.91]) {
    const y = horizon + (H - horizon) * t;
    ctx.strokeStyle = lit ? 'rgba(32,44,59,0.24)' : '#080d12'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

export function windowPath(ctx, b, pointed = true) {
  const { x, y, w, h } = b;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.3);
  if (pointed) {
    ctx.bezierCurveTo(x, y + h * 0.16, x + w * 0.3, y + h * 0.035, x + w * 0.5, y);
    ctx.bezierCurveTo(x + w * 0.7, y + h * 0.035, x + w, y + h * 0.16, x + w, y + h * 0.3);
  } else {
    ctx.lineTo(x, y); ctx.lineTo(x + w, y);
  }
  ctx.lineTo(x + w, y + h); ctx.closePath();
}

export function paintMoonWindow(ctx, b, moon, { pointed = true, mist = false } = {}) {
  const { x, y, w, h } = b;
  soft(ctx, x + w / 2, y + h * 0.45, w * 1.1, h * 0.9, '112,146,190', 0.14);
  windowPath(ctx, b, pointed); ctx.lineWidth = Math.max(10, w * 0.09); ctx.strokeStyle = '#080d15'; ctx.stroke();
  ctx.lineWidth = Math.max(2, w * 0.013); ctx.strokeStyle = '#4c5967'; ctx.stroke();
  ctx.save(); windowPath(ctx, b, pointed); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#18263d'); sky.addColorStop(1, mist ? '#8fa5b7' : '#566b88');
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  const size = Math.min(w * 0.94, h * 0.9);
  ctx.drawImage(moon, x + w * 0.5 - size / 2, y + h * 0.29 - size / 2, size, size);
  if (mist) {
    ctx.fillStyle = 'rgba(173,193,211,0.2)'; ctx.fillRect(x, y, w, h);
    soft(ctx, x + w / 2, y + h * 0.45, w * 0.7, h, '204,221,236', 0.5);
  } else {
    const rnd = lcg(65473);
    for (let i = 0; i < 38; i++) {
      ctx.fillStyle = `rgba(202,218,243,${0.2 + rnd() * 0.5})`;
      ctx.fillRect(x + rnd() * w, y + rnd() * h, 0.7, 0.7);
    }
    ctx.fillStyle = '#172536';
    polygon(ctx, [[x, y + h], [x, y + h * 0.83], [x + w * 0.2, y + h * 0.79], [x + w * 0.55, y + h * 0.88], [x + w, y + h * 0.76], [x + w, y + h]]); ctx.fill();
  }
  // Thin leaded glass; the silhouette remains one broad source of moonlight.
  ctx.fillStyle = '#111b29';
  ctx.fillRect(x + w * 0.49, y, Math.max(2, w * 0.021), h);
  ctx.fillRect(x, y + h * 0.65, w, Math.max(2, w * 0.018));
  ctx.strokeStyle = 'rgba(201,221,245,0.14)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + w * 0.51 + 1, y); ctx.lineTo(x + w * 0.51 + 1, y + h); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#101720'; ctx.fillRect(x - w * 0.055, y + h, w * 1.11, Math.max(5, h * 0.036));
  ctx.fillStyle = '#526070'; ctx.fillRect(x - w * 0.055, y + h, w * 1.11, 1.5);
}

export function finishNight(ctx, W, H) { grain(ctx, W, H, 0.035); }

export function adjustmentKeys(scene, previous, next, adjust) {
  const onKey = event => {
    if (!scene.input.enabled || (event.target !== document.body && event.target !== scene.game.canvas)) return;
    if (event.key !== previous && event.key !== next) return;
    event.preventDefault();
    adjust((event.key === next ? 1 : -1) * (event.shiftKey ? 0.02 : 0.002));
  };
  scene.input.keyboard.on('keydown', onKey);
  return () => scene.input.keyboard.off('keydown', onKey);
}
