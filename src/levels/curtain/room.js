import { makeCanvas, lcg, polygon, soft, addCanvasTexture } from '../../shared/paint.js';
import { makeMoonTexture } from '../../shared/moon.js';
import { paintPlaster, paintBoards, paintMoonWindow, finishNight } from '../../shared/windowLight.js';
import { CURTAIN_LETTERS, CURTAIN_HOLES, CURTAIN_WIDTH, tearOutline } from './puzzle.js';

export const CURTAIN_ART = { room: 'cur_room', light: 'cur_light', cloth: 'cur_cloth', moon: 'cur_moon' };

function engravings(ctx, L, lit) {
  const p = L.patch;
  ctx.font = `${p.size * 0.059}px "Special Elite", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const letter of CURTAIN_LETTERS) {
    ctx.save(); ctx.translate(p.x + letter.x * p.size, p.y + letter.y * p.size); ctx.rotate(letter.angle);
    ctx.fillStyle = lit ? '#c1d2e4' : 'rgba(119,137,155,0.055)'; ctx.fillText(letter.letter, 0.7, 1);
    ctx.fillStyle = lit ? '#1a2b40' : 'rgba(2,5,9,0.19)'; ctx.fillText(letter.letter, 0, 0);
    ctx.restore();
  }
}

export function paintCurtainRoom(textures, L) {
  const { width: W, height: H, window: w, patch: p } = L;
  makeMoonTexture(textures, CURTAIN_ART.moon);
  const canvas = makeCanvas(W * 1.5, H * 1.5), ctx = canvas.getContext('2d'); ctx.scale(1.5, 1.5);
  paintPlaster(ctx, W, H, L.horizon); paintBoards(ctx, W, H, L.horizon);
  paintMoonWindow(ctx, w, textures.get(CURTAIN_ART.moon).getSourceImage());
  engravings(ctx, L, false);
  // A rail long enough to draw the heavy cloth completely away from the glass.
  const railY = w.y - H * 0.018;
  ctx.strokeStyle = '#080b10'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(W * 0.035, railY + 2); ctx.lineTo(W * 0.96, railY + 2); ctx.stroke();
  ctx.strokeStyle = '#6c6e6c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W * 0.035, railY); ctx.lineTo(W * 0.96, railY); ctx.stroke();
  for (const x of [W * 0.035, W * 0.96]) {
    ctx.fillStyle = '#777973'; ctx.beginPath(); ctx.arc(x, railY, Math.max(3, H * 0.006), 0, Math.PI * 2); ctx.fill();
  }
  // Empty picture frames and an abandoned chair at the edge of the room.
  const u = Math.min(W, H);
  ctx.strokeStyle = '#0a0e13'; ctx.lineWidth = u * 0.012;
  ctx.strokeRect(W * 0.08, H * 0.19, W * 0.11, H * 0.17);
  ctx.strokeStyle = '#42494e'; ctx.lineWidth = 0.6;
  ctx.strokeRect(W * 0.08 + 4, H * 0.19 + 4, W * 0.11 - 8, H * 0.17 - 8);
  ctx.strokeStyle = '#080c11'; ctx.lineWidth = Math.max(4, u * 0.008);
  for (const x of [W * 0.81, W * 0.90]) {
    ctx.beginPath(); ctx.moveTo(x, H * 0.44); ctx.lineTo(x + W * 0.018, H * 0.72); ctx.stroke();
  }
  ctx.fillStyle = '#0a0e13'; ctx.fillRect(W * 0.805, H * 0.44, W * 0.096, H * 0.035);
  ctx.fillRect(W * 0.81, H * 0.59, W * 0.11, H * 0.018);
  finishNight(ctx, W, H); addCanvasTexture(textures, CURTAIN_ART.room, canvas);

  const light = makeCanvas(p.size * 2, p.size * 2), lc = light.getContext('2d');
  lc.scale(2, 2); lc.translate(-p.x, -p.y);
  paintBoards(lc, W, H, L.horizon, true); engravings(lc, L, true);
  addCanvasTexture(textures, CURTAIN_ART.light, light);

  const cw = w.w * CURTAIN_WIDTH, ch = w.h + H * 0.021;
  const cloth = makeCanvas(cw * 2, ch * 2), cc = cloth.getContext('2d'); cc.scale(2, 2);
  const folds = 18, fw = cw / folds;
  // The bottom of the velvet sags between its heavy vertical folds.
  const outline = [[0, 0], [cw, 0], [cw, w.h]];
  for (let i = folds * 3; i >= 0; i--) outline.push([i * cw / (folds * 3), w.h + Math.sin(i / 3 * Math.PI * 2) * H * 0.002 + H * 0.006]);
  polygon(cc, outline); cc.fillStyle = '#191724'; cc.fill();
  cc.save(); cc.clip();
  for (let i = 0; i < folds; i++) {
    const x = i * fw, g = cc.createLinearGradient(x, 0, x + fw, 0);
    g.addColorStop(0, '#100f1a'); g.addColorStop(0.2, '#292534'); g.addColorStop(0.46, '#42333d');
    g.addColorStop(0.65, '#27232e'); g.addColorStop(1, '#10131d');
    cc.fillStyle = g; cc.fillRect(x, 0, fw + 1, ch);
    cc.strokeStyle = 'rgba(158,123,133,0.13)'; cc.lineWidth = 0.6;
    cc.beginPath(); cc.moveTo(x + fw * 0.4, 0); cc.bezierCurveTo(x + fw * 0.9, ch * 0.4, x + fw * 0.12, ch * 0.8, x + fw * 0.55, ch); cc.stroke();
  }
  const rnd = lcg(87452);
  for (let i = 0; i < 900; i++) {
    cc.fillStyle = rnd() < 0.5 ? 'rgba(10,9,15,0.23)' : 'rgba(174,134,144,0.10)';
    cc.fillRect(rnd() * cw, rnd() * ch, 0.6, 1 + rnd() * 3);
  }
  soft(cc, cw * 0.7, ch * 0.2, cw * 0.5, ch * 0.8, '127,133,163', 0.11);
  cc.restore();
  for (const hole of CURTAIN_HOLES) {
    const points = tearOutline(hole, 0.3).map(p => ({ x: p.x * w.w, y: p.y * w.h }));
    cc.save(); cc.globalCompositeOperation = 'destination-out'; polygon(cc, points); cc.fill(); cc.restore();
    polygon(cc, points); cc.lineWidth = 0.8; cc.strokeStyle = '#726370'; cc.stroke();
    cc.strokeStyle = 'rgba(184,167,172,0.44)'; cc.lineWidth = 0.5;
    for (let i = 0; i < points.length; i += 3) {
      const p = points[i]; cc.beginPath(); cc.moveTo(p.x, p.y); cc.lineTo(p.x - 1.5, p.y + 3.5); cc.stroke();
    }
  }
  addCanvasTexture(textures, CURTAIN_ART.cloth, cloth);
  return { clothWidth: cw, clothHeight: ch, railY };
}
