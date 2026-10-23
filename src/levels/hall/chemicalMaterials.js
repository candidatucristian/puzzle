import { soft } from "../../shared/paint.js";

export function paintHallApparatus(ctx, image, x, y, height) {
  const width = height * image.width / image.height;
  soft(ctx, x, y + 1, width * 0.48, height * 0.025, "0,0,0", 0.6);
  ctx.drawImage(image, x - width / 2, y - height, width, height);
}

export function paintHallSconcePhoto(ctx, L, s, materials) {
  if (!materials?.sconce) return false;
  const k = (L.u * 1.5) / s.z, x = s.x - s.side * 14 * k;
  const image = s.dead ? materials.stubHolder : materials.sconce;
  const height = (s.dead ? 22 : 42) * k, width = height * image.width / image.height;
  const top = s.y - (s.dead ? 1 : 13) * k;
  ctx.drawImage(image, x - width * 0.68, top, width, height);
  if (s.dead) ctx.drawImage(materials.wax, x - 2.4 * k, s.y - 5 * k, 4.8 * k, 5 * k);
  else {
    soft(ctx, x, s.y - 18 * k, 100 * k, 130 * k, "255,190,120", 0.22, "lighter");
    ctx.fillStyle = "#fff4cc"; ctx.beginPath(); ctx.ellipse(x, s.y - 18 * k, 2.6 * k, 6 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  return true;
}
