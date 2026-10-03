import { makeCanvas, addCanvasTexture, soft, grain, vignette, polygon, lcg } from "../../shared/paint.js";
import { RIPPLE_STONES } from "./puzzle.js";

export const RIPPLE_ART = { street: "rp_street", water: "rp_water" };
export const STONE_FONT = 'Georgia, "Times New Roman", serif';

// An overhead view: each engraving belongs to the centre of a real cobble.
// The thin water film and reflected neon are animated separately by Phaser.
export function paintStreet(textures, L) {
  const { width: W, height: H, size: S } = L;
  const res = Math.min(2, 1800 / Math.max(W, H));
  const canvas = makeCanvas(W * res, H * res);
  const ctx = canvas.getContext("2d");
  ctx.scale(res, res);
  ctx.fillStyle = "#070c12";
  ctx.fillRect(0, 0, W, H);
  const random = lcg(26026);
  const cw = S / 8, ch = S * 0.7 / 6;
  const ox = L.x + S / 8, oy = L.y + S * 0.15;
  for (let row = Math.floor(-oy / ch) - 1; row * ch + oy < H + ch; row++) {
    for (let col = Math.floor(-ox / cw) - 1; col * cw + ox < W + cw; col++) {
      const x = ox + col * cw, y = oy + row * ch;
      const left = x - cw * (0.45 + random() * 0.035), right = x + cw * (0.45 + random() * 0.035);
      const top = y - ch * (0.45 + random() * 0.03), bottom = y + ch * (0.45 + random() * 0.03);
      const bevel = cw * (0.045 + random() * 0.09);
      const points = [[left + bevel, top], [right - bevel, top + random() * 2],
        [right, top + bevel], [right - random() * 2, bottom - bevel], [right - bevel, bottom],
        [left + bevel, bottom - random() * 2], [left, bottom - bevel], [left + random() * 2, top + bevel]];
      polygon(ctx, points);
      const shade = 22 + random() * 15;
      const red = Math.max(0, 1 - Math.abs(x / W - 0.83) * 3) * 15;
      const fill = ctx.createLinearGradient(left, top, right, bottom);
      fill.addColorStop(0, `rgb(${shade + red + 8},${shade + 9},${shade + 15})`);
      fill.addColorStop(0.35, `rgb(${shade + red},${shade + 2},${shade + 7})`);
      fill.addColorStop(1, `rgb(${shade * 0.55 + red},${shade * 0.6},${shade * 0.75})`);
      ctx.fillStyle = fill;
      ctx.shadowColor = "#00070c"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 3;
      ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = "rgba(125,146,163,0.12)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.clip();
      // Worn stone has an uneven satin skin under the water, with the sky
      // caught along one edge and the neon broken into small specular flecks.
      soft(ctx, x - cw * 0.18, y - ch * 0.29, cw * 0.63, ch * 0.32, "132,151,167", 0.12, "lighter");
      ctx.strokeStyle = "rgba(175,195,208,0.13)"; ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.moveTo(left + bevel, top + 2);
      ctx.quadraticCurveTo(x, top + 4 + random() * 3, right - bevel, top + 1); ctx.stroke();
      for (let n = 0; n < 28; n++) {
        ctx.fillStyle = random() > 0.55 ? "rgba(200,208,216,0.06)" : "rgba(0,0,0,0.12)";
        ctx.fillRect(left + random() * cw, top + random() * ch, 1 + random() * 3, 0.6 + random() * 1.8);
      }
      for (let n = 0; n < 7; n++) {
        ctx.fillStyle = x > W * 0.65 ? "rgba(220,91,104,0.16)" : "rgba(148,176,197,0.12)";
        ctx.fillRect(left + random() * cw, top + random() * ch, 2 + random() * 6, 0.7);
      }
      ctx.strokeStyle = "rgba(7,11,18,0.45)";
      if (random() < 0.35) {
        ctx.beginPath(); ctx.moveTo(right - cw * 0.2, top);
        ctx.lineTo(x + cw * 0.1, y - ch * 0.12); ctx.lineTo(x + cw * 0.3, y + ch * 0.1); ctx.stroke();
      }
      ctx.restore();
    }
  }
  // Cool sky in the puddles, red light leaking from a sign beyond the curb.
  soft(ctx, W * 0.33, H * 0.35, W * 0.55, H * 0.7, "87,121,157", 0.13, "lighter");
  soft(ctx, W * 0.88, H * 0.46, W * 0.46, H * 0.75, "210,17,31", 0.20, "lighter");
  for (let i = 0; i < 45; i++) {
    const x = random() * W, y = random() * H;
    ctx.strokeStyle = `rgba(153,180,198,${0.025 + random() * 0.04})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.ellipse(x, y, cw * (0.1 + random()), ch * (0.04 + random() * 0.13), -0.15, 0, Math.PI); ctx.stroke();
  }
  // A gutter at the left edge anchors the street's scale.
  ctx.fillStyle = "rgba(2,5,9,0.72)"; ctx.fillRect(0, 0, W * 0.035, H);
  ctx.strokeStyle = "rgba(156,179,195,0.22)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W * 0.042, 0); ctx.lineTo(W * 0.042, H); ctx.stroke();
  const gx = W * 0.067, gy = H * 0.83, gw = S * 0.12, gh = S * 0.11;
  ctx.fillStyle = "#06090d"; ctx.fillRect(gx, gy, gw, gh);
  ctx.strokeStyle = "#353a3d"; ctx.lineWidth = Math.max(2, S * 0.006);
  for (let i = 1; i < 7; i++) {
    ctx.beginPath(); ctx.moveTo(gx + gw * i / 7, gy + 3); ctx.lineTo(gx + gw * i / 7, gy + gh - 3); ctx.stroke();
  }
  ctx.font = `${Math.max(10, S * 0.032)}px ${STONE_FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const stone of RIPPLE_STONES) {
    const x = L.x + stone.x * S, y = L.y + stone.y * S;
    ctx.fillStyle = "rgba(126,142,148,0.40)"; ctx.fillText(stone.letter, x + 0.6, y + 1);
    ctx.fillStyle = "#10171e"; ctx.fillText(stone.letter, x - 0.4, y - 0.4);
    ctx.fillStyle = "rgba(145,151,153,0.49)"; ctx.fillText(stone.letter, x, y);
  }
  grain(ctx, W, H, 0.065);
  vignette(ctx, W, H, 0.52);
  addCanvasTexture(textures, RIPPLE_ART.street, canvas);
  return { res };
}

export function neonReflection(W, H) {
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  soft(ctx, W * 0.84, H * 0.44, W * 0.32, H * 0.65, "255,14,34", 0.32);
  ctx.lineCap = "round";
  for (const [width, alpha] of [[18, 0.05], [8, 0.08], [3, 0.26], [1, 0.7]]) {
    ctx.lineWidth = width; ctx.strokeStyle = `rgba(255,38,55,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(W * 0.96, H * 0.04); ctx.lineTo(W * 0.76, H * 0.12);
    ctx.lineTo(W * 0.76, H * 0.62); ctx.lineTo(W * 0.91, H * 0.56);
    ctx.moveTo(W * 0.83, H * 0.20); ctx.lineTo(W * 0.83, H * 0.46);
    ctx.moveTo(W * 0.90, H * 0.17); ctx.lineTo(W * 0.90, H * 0.43);
    ctx.stroke();
  }
  return canvas;
}
