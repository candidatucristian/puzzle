import { polygon, lcg } from "../../shared/paint.js";

// The lock stays at the hall's existing key position. The handle and its
// backplate follow the same projected surface on both shut and moving doors.
export function paintAtticDoorHandle(ctx, L, d, surface) {
  const path = (points) => polygon(ctx, points.map(([a, b]) => surface(a, b)));
  const top = surface(0.86, 0.488), bottom = surface(0.86, 0.645);
  const iron = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
  iron.addColorStop(0, "#544b3e");
  iron.addColorStop(0.3, "#282925");
  iron.addColorStop(0.75, "#34332b");
  iron.addColorStop(1, "#171a18");
  const plate = [[0.814, 0.488], [0.906, 0.488], [0.928, 0.501],
    [0.928, 0.632], [0.906, 0.645], [0.814, 0.645], [0.792, 0.632], [0.792, 0.501]];
  ctx.save();
  path(plate.map(([a, b]) => [a - 0.012, b + 0.003]));
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fill();
  path(plate); ctx.fillStyle = iron; ctx.fill();
  ctx.strokeStyle = "rgba(148,127,94,0.25)";
  ctx.lineWidth = Math.max(0.45, 0.7 * L.u / d.z); ctx.stroke();
  const dot = (a, b, rx, ry, fill) => {
    path(Array.from({length: 16}, (_, i) => {
      const angle = i * Math.PI / 8;
      return [a + rx * Math.cos(angle), b + ry * Math.sin(angle)];
    }));
    ctx.fillStyle = fill; ctx.fill();
  };
  const rnd = lcg(821 + d.number);
  for (let i = 0; i < 18; i++) {
    dot(0.804 + rnd() * 0.111, 0.5 + rnd() * 0.13, 0.003, 0.0014,
      rnd() < 0.5 ? "rgba(135,91,49,0.3)" : "rgba(7,10,9,0.3)");
  }
  for (const b of [0.504, 0.632]) {
    dot(0.86, b, 0.015, 0.005, "#111613");
    dot(0.857, b - 0.001, 0.01, 0.003, "#655d4b");
    const a = surface(0.852, b - 0.001), q = surface(0.868, b + 0.001);
    ctx.strokeStyle = "#151a17"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  dot(0.86, 0.6, 0.018, 0.006, "#050706");
  path([[0.851, 0.602], [0.869, 0.602], [0.878, 0.617], [0.842, 0.617]]);
  ctx.fillStyle = "#050706"; ctx.fill();
  dot(0.86, 0.53, 0.039, 0.013, "#111714");
  dot(0.857, 0.528, 0.03, 0.01, "#59584b");
  // Rotate the iron lever when the existing latch animation turns it.
  const angle = (d.handle ?? 0) * 0.42, c = Math.cos(angle), s = Math.sin(angle);
  const lever = [[0.87, 0.525], [0.87, 0.536], [0.71, 0.541],
    [0.675, 0.537], [0.67, 0.526], [0.7, 0.521], [0.73, 0.525]];
  path(lever.map(([a, b]) => {
    const x = (a - 0.86) * 0.43, y = b - 0.53;
    return [0.86 + (x * c - y * s) / 0.43, 0.53 + x * s + y * c];
  }));
  ctx.fillStyle = "#414139"; ctx.fill();
  ctx.strokeStyle = "rgba(171,153,117,0.3)";
  ctx.lineWidth = Math.max(0.5, 0.7 * L.u / d.z); ctx.stroke();
  ctx.restore();
}
