import { makeCanvas, polygon, soft, addCanvasTexture } from '../../shared/paint.js';
import { makeMoonTexture } from '../../shared/moon.js';
import { paintPlaster, paintBoards, paintMoonWindow, finishNight } from '../../shared/windowLight.js';
import { SILL_APERTURES, aperturePoints } from './puzzle.js';

export const SILL_ART = { room: 'sill_room', moon: 'sill_moon' };

function bottle(ctx, x, y, u) {
  ctx.beginPath(); ctx.moveTo(x - u * 0.22, y);
  ctx.lineTo(x - u * 0.24, y - u * 0.72); ctx.quadraticCurveTo(x - u * 0.24, y - u * 0.9, x - u * 0.08, y - u * 0.95);
  ctx.lineTo(x - u * 0.08, y - u * 1.36); ctx.lineTo(x + u * 0.08, y - u * 1.36);
  ctx.lineTo(x + u * 0.08, y - u * 0.95); ctx.quadraticCurveTo(x + u * 0.24, y - u * 0.9, x + u * 0.24, y - u * 0.72);
  ctx.lineTo(x + u * 0.22, y); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - u * 0.10, y - u * 1.35, u * 0.20, u * 0.08);
}

function book(ctx, x, y, w, h, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillRect(-w / 2, -h, w, h);
  ctx.strokeStyle = '#273342'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h + 2); ctx.lineTo(w / 2 - 2, -h + 2); ctx.stroke();
  ctx.restore();
}

function props(ctx, L) {
  const w = L.window, y = w.y + w.h, u = Math.min(w.w * 0.2, w.h * 0.58);
  ctx.fillStyle = '#070b10';
  book(ctx, w.x + w.w * 0.07, y, u * 0.24, u * 1.0, -0.24);
  book(ctx, w.x + w.w * 0.13, y, u * 0.17, u * 1.25, -0.15);
  book(ctx, w.x + w.w * 0.195, y, u * 0.23, u * 0.92, 0.13);
  bottle(ctx, w.x + w.w * 0.29, y, u);
  // Unlit candlestick. Its broad foot, turned stem and drip tray read in silhouette.
  const cx = w.x + w.w * 0.455;
  ctx.beginPath(); ctx.ellipse(cx, y - u * 0.03, u * 0.23, u * 0.055, 0, 0, Math.PI * 2); ctx.fill();
  polygon(ctx, [[cx - u * 0.18,y - u * 0.03],[cx - u * 0.045,y - u * 0.20],[cx - u * 0.035,y - u * 0.74],
    [cx + u * 0.035,y - u * 0.74],[cx + u * 0.045,y - u * 0.20],[cx + u * 0.18,y - u * 0.03]]); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, y - u * 0.73, u * 0.15, u * 0.044, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx - u * 0.048, y - u * 1.26, u * 0.096, u * 0.55);
  ctx.fillRect(cx - u * 0.008, y - u * 1.31, u * 0.016, u * 0.08);
  const vx = w.x + w.w * 0.60;
  ctx.beginPath(); ctx.moveTo(vx - u * 0.16, y);
  ctx.bezierCurveTo(vx - u * 0.46, y - u * 0.4, vx - u * 0.15, y - u * 0.6, vx - u * 0.12, y - u * 0.91);
  ctx.lineTo(vx + u * 0.12, y - u * 0.91);
  ctx.bezierCurveTo(vx + u * 0.15, y - u * 0.6, vx + u * 0.46, y - u * 0.4, vx + u * 0.16, y); ctx.closePath(); ctx.fill();
  const clockX = w.x + w.w * 0.80, clockY = y - u * 0.40;
  ctx.beginPath(); ctx.arc(clockX, clockY, u * 0.39, Math.PI, 0); ctx.lineTo(clockX + u * 0.39, y); ctx.lineTo(clockX - u * 0.39, y); ctx.closePath(); ctx.fill();
  ctx.fillRect(clockX - u * 0.45, y - u * 0.04, u * 0.9, u * 0.07);
  ctx.strokeStyle = '#17212b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(clockX, clockY, u * 0.28, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(clockX - u * 0.12, clockY - u * 0.08); ctx.lineTo(clockX, clockY); ctx.lineTo(clockX + u * 0.13, clockY - u * 0.15); ctx.stroke();
  book(ctx, w.x + w.w * 0.95, y, u * 0.20, u * 0.96, 0.18);
  // Uneven horizontal volumes beside the clock supply the three stepped edges.
  for (let i = 0; i < 3; i++) book(ctx, w.x + w.w * (0.93 + (i % 2) * 0.012), y - i * u * 0.12, u * (0.44 - i * 0.03), u * 0.105, -0.04);
}

export function paintSill(textures, L) {
  const { width: W, height: H, window: w } = L;
  makeMoonTexture(textures, SILL_ART.moon);
  const cv = makeCanvas(W * 1.5, H * 1.5), ctx = cv.getContext('2d'); ctx.scale(1.5, 1.5);
  paintPlaster(ctx, W, H, L.horizon); paintBoards(ctx, W, H, L.horizon);
  const plane = [[w.x - w.w * 0.025, w.y + w.h], [w.x + w.w * 1.025, w.y + w.h], [W * 0.98, H * 0.93], [W * 0.02, H * 0.93]];
  ctx.save(); polygon(ctx, plane); ctx.clip(); paintBoards(ctx, W, H, L.horizon, true);
  soft(ctx, W * 0.49, H * 0.64, W * 0.8, H * 0.6, '212,227,243', 0.13); ctx.restore();
  // One painted shadow field, cast from six groups of objects. Their broad
  // overlapping projections leave four shaped gaps in the illuminated floor.
  const shadows = makeCanvas(W * 1.5, H * 1.5), sc = shadows.getContext('2d'); sc.scale(1.5, 1.5);
  sc.fillStyle = '#070c13';
  const feet = [0.075, 0.17, 0.29, 0.455, 0.60, 0.80, 0.96];
  const reaches = [0.115, 0.105, 0.13, 0.092, 0.142, 0.145, 0.105];
  for (const [i, f] of feet.entries()) {
    const sx = w.x + f * w.w, sy = w.y + w.h;
    const tx = W * 0.5 + (f - 0.5) * W * 1.16, reach = W * reaches[i];
    // Bottle and candle: narrow necks widen into shoulders; the books and
    // clock end in angled slabs. Their edges stay separate near the sill.
    const neck = i === 2 || i === 3 ? 0.018 : 0.043;
    polygon(sc, [[sx - w.w * neck,sy],[sx + w.w * neck,sy],
      [sx + w.w * neck * 1.5,H * 0.475], [tx + reach * 0.62,H * 0.62],
      [tx + reach,H * 0.94], [tx + reach * 0.9,H * 0.968],
      [tx - reach,H * 0.957], [tx - reach * 0.68,H * 0.62], [sx - w.w * neck * 1.3,H * 0.475]]); sc.fill();
  }
  // Cut out light, preserving A's dark counter. These are polygon boundaries,
  // so there is no font, hidden answer label, or interaction-triggered reveal.
  for (const [i, aperture] of SILL_APERTURES.entries()) {
    sc.globalCompositeOperation = 'destination-out'; polygon(sc, aperturePoints(L, i, aperture.outline)); sc.fill();
    sc.globalCompositeOperation = 'source-over';
    for (const counter of aperture.counters) { polygon(sc, aperturePoints(L, i, counter)); sc.fill(); }
  }
  ctx.drawImage(shadows, 0, 0, W, H);
  paintMoonWindow(ctx, w, textures.get(SILL_ART.moon).getSourceImage(), { pointed: false, mist: true });
  props(ctx, L);
  // Front lip conceals the feet; the room is seen from just above the boards.
  ctx.fillStyle = '#0b1018'; ctx.fillRect(w.x - w.w * 0.035, w.y + w.h, w.w * 1.07, H * 0.015);
  ctx.fillStyle = '#6c7d8d'; ctx.fillRect(w.x - w.w * 0.035, w.y + w.h, w.w * 1.07, 1);
  finishNight(ctx, W, H); addCanvasTexture(textures, SILL_ART.room, cv);
}
