import { makeCanvas, lcg, soft, grain, addCanvasTexture } from '../../shared/paint.js';
import { cityLights } from './puzzle.js';

export const VENETIAN_ART = { room: 'ven_room', city: 'ven_city' };

export function paintVenetian(textures, L) {
  const { width: W, height: H, window: w } = L;
  const cv = makeCanvas(W * 1.5, H * 1.5), ctx = cv.getContext('2d'); ctx.scale(1.5, 1.5);
  ctx.fillStyle = '#0b111b'; ctx.fillRect(0, 0, W, H);
  soft(ctx, W * 0.5, H * 0.49, W, H, '44,64,85', 0.38);
  const frame = Math.min(W, H) * 0.023;
  ctx.fillStyle = '#202a34'; ctx.fillRect(w.x - frame, w.y - frame, w.w + frame * 2, w.h + frame * 2);
  ctx.fillStyle = '#050a12'; ctx.fillRect(w.x - frame * 0.32, w.y - frame * 0.35, w.w + frame * 0.65, w.h + frame * 0.7);
  ctx.strokeStyle = '#45505a'; ctx.lineWidth = 1;
  ctx.strokeRect(w.x - frame, w.y - frame, w.w + frame * 2, w.h + frame * 2);
  ctx.fillStyle = '#111821'; ctx.fillRect(w.x - frame * 1.6, w.y + w.h + frame * 0.6, w.w + frame * 3.2, frame * 0.55);
  ctx.fillStyle = '#4c5964'; ctx.fillRect(w.x - frame * 1.6, w.y + w.h + frame * 0.6, w.w + frame * 3.2, 1);
  // The headrail and its small, tarnished brass cord pulley.
  const head = ctx.createLinearGradient(0, w.y - frame, 0, w.y + frame * 0.6);
  head.addColorStop(0, '#34404b'); head.addColorStop(1, '#121a24');
  ctx.fillStyle = head; ctx.fillRect(w.x - 2, w.y - frame * 0.8, w.w + 4, frame * 1.15);
  ctx.strokeStyle = '#6a777b'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(L.cordX, L.cordTop, Math.max(3, frame * 0.3), 0, Math.PI * 2); ctx.stroke();
  grain(ctx, W, H, 0.032); addCanvasTexture(textures, VENETIAN_ART.room, cv);

  const city = makeCanvas(w.w * 2, w.h * 2), c = city.getContext('2d'); c.scale(2, 2);
  const sky = c.createLinearGradient(0, 0, 0, w.h);
  sky.addColorStop(0, '#070f20'); sky.addColorStop(0.6, '#152238'); sky.addColorStop(1, '#1d2433');
  c.fillStyle = sky; c.fillRect(0, 0, w.w, w.h);
  soft(c, w.w * 0.78, w.h * 0.18, w.w * 0.6, w.h * 0.62, '59,94,134', 0.17);
  const rnd = lcg(73213);
  for (let layer = 0; layer < 3; layer++) {
    for (let x = -15; x < w.w;) {
      const bw = w.w * (0.025 + rnd() * 0.065), top = w.h * (0.16 + layer * 0.19 + rnd() * 0.21);
      c.fillStyle = ['#0d1726', '#0b1420', '#09121d'][layer]; c.fillRect(x, top, bw, w.h - top);
      c.fillStyle = 'rgba(73,86,113,0.18)'; c.fillRect(x, top, 1, w.h - top);
      if (rnd() > 0.7) { c.fillRect(x + bw * 0.5, top - w.h * 0.04, 1, w.h * 0.04); }
      x += bw + w.w * 0.012;
    }
  }
  const lights = cityLights(), dotW = w.w / 192 * 0.80, dotH = w.h / 42 * 0.10;
  for (const light of lights) {
    const x = light.x * w.w, y = light.y * w.h;
    const rgb = light.warm ? '241,192,135' : '163,214,253';
    c.fillStyle = `rgba(${rgb},${light.brightness * 0.12})`;
    // Local bloom stays inside its own interlaced row. It cannot leak through
    // an adjacent clear slit and spoil the physical filter.
    c.fillRect(x - dotW * 0.70, y - dotH * 0.85, dotW * 1.4, dotH * 1.7);
    c.fillStyle = `rgba(${rgb},${light.brightness})`;
    c.fillRect(x - dotW / 2, y - dotH / 2, dotW, dotH);
  }
  addCanvasTexture(textures, VENETIAN_ART.city, city);
}
