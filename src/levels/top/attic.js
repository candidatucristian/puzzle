import { soft, vignette, grain } from "../../shared/paint.js";

// Architecture, roof and stored belongings share one photographic exposure.
// Door leaves remain separate so their original opening animation still works.
function lanterns(ctx, L) {
  const { atticMaterials: m } = L;
  L.doors.forEach((d, i) => {
    const s = L.sconces[i], k = L.u / s.z;
    const x = s.x - s.side * 20 * k, y = s.y - 24 * k;
    const mid = L.P(d.side * L.wall, (L.doorTop + L.floor) / 2, d.z + 0.2);
    soft(ctx, mid.x, mid.y, d.box.width * 0.8, d.box.height * 0.5, "255,185,113", 0.04, "lighter");
    ctx.drawImage(m.lantern, x - 18 * k, y - 54 * k, 36 * k, 75 * k);
    soft(ctx, x, y, 65 * k, 90 * k, "255,187,111", 0.07, "lighter");
    ctx.fillStyle = "#ffe8b7";
    ctx.beginPath(); ctx.ellipse(x, y, 1.4 * k, 3.5 * k, 0, 0, Math.PI * 2); ctx.fill();
  });
}

export function paintAtticForeground(ctx, L) {
  lanterns(ctx, L);
}

export function paintAtticShade(ctx, L) {
  // The same night exposure covers the static hall and moving door leaves.
  ctx.fillStyle = "rgba(1,2,4,0.56)";
  ctx.fillRect(0, 0, L.W, L.H);
  vignette(ctx, L.W, L.H, 0.7, "source-over");
  grain(ctx, L.W, L.H, 0.003);
}

export function paintAttic(ctx, L, paintDoor) {
  ctx.drawImage(L.atticMaterials.backdrop, 0, 0, L.W, L.H);
  for (const d of L.doors) paintDoor(ctx, L, d);
  paintAtticForeground(ctx, L);
  paintAtticShade(ctx, L);
}
