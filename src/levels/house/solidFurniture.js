import { soft } from "../../shared/paint.js";
import { EYE, fillPoly } from "./roomKit.js";
import { paintProjectedMaterial } from "./drawingRoomMaterials.js";

// These are measured faces, rather than a flat cutout made darker at its
// edges. Every vertex uses the same camera as the room and its puzzle props.
export function solidSurface(ctx, image, at, shade = 1, base = "#2c2016", columns = 3, rows = 3) {
  const pts = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
  fillPoly(ctx, pts, base);
  if (image) paintProjectedMaterial(ctx, image, at, 1, columns, rows);
  if (shade < 1) fillPoly(ctx, pts, `rgba(0,0,0,${1 - shade})`);
}

export function solidBox(ctx, L, b, { wood = L.surfaceMaterials?.wood, front = wood, top = wood, side = wood, shade = 1 } = {}) {
  const { Q } = L, { x0, x1, y0, y1, d0, d1 } = b;
  if (x0 > 0 || x1 < 0) {
    const x = x0 > 0 ? x0 : x1;
    solidSurface(ctx, side, (u, v) => Q(x, y1 - (y1 - y0) * v, d1 - (d1 - d0) * u), 0.48 * shade);
  }
  if (y1 < EYE) solidSurface(ctx, top, (u, v) => Q(x0 + (x1 - x0) * u, y1, d1 - (d1 - d0) * v), 0.98 * shade);
  solidSurface(ctx, front, (u, v) => Q(x0 + (x1 - x0) * u, y1 - (y1 - y0) * v, d0), 0.8 * shade);
}

export function recessedPanel(ctx, L, { x0, x1, y0, y1, d, inset = 3.5, relief = 2.6 }) {
  const { Q } = L, wood = L.surfaceMaterials?.wood, inner = d + relief;
  const xa = x0 + inset, xb = x1 - inset, ya = y0 + inset, yb = y1 - inset;
  solidSurface(ctx, wood, (u, v) => Q(xa + (xb - xa) * u, yb - (yb - ya) * v, inner), 0.57);
  // Sloping mouldings connect the raised rails to a physically recessed panel.
  const bevel = (outerA, outerB, innerB, innerA, shade) => solidSurface(ctx, wood, (u, v) => {
    const a = outerA.map((n, i) => n + (outerB[i] - n) * u);
    const b = innerA.map((n, i) => n + (innerB[i] - n) * u);
    return Q(...a.map((n, i) => n + (b[i] - n) * v));
  }, shade);
  bevel([x0, y1, d], [x1, y1, d], [xb, yb, inner], [xa, yb, inner], 0.42);
  bevel([x0, y0, d], [x1, y0, d], [xb, ya, inner], [xa, ya, inner], 0.98);
  bevel([x0, y1, d], [x0, y0, d], [xa, ya, inner], [xa, yb, inner], 0.55);
  bevel([x1, y1, d], [x1, y0, d], [xb, ya, inner], [xb, yb, inner], 0.83);
}

export function caseBody(ctx, L, { at, side, depth, wood = L.surfaceMaterials?.wood }) {
  const { Q } = L, rear = side * L.half, front = side * (L.half - depth);
  const { d0, d1, y0, y1 } = at;
  ctx.save();
  ctx.filter = `blur(${Math.max(1.5, 3 * L.u)}px)`;
  fillPoly(ctx, [Q(rear, y1 + 2, d0 - 8), Q(rear, y1 + 2, d1 + 3), Q(rear, y0 - 7, d1 + 3), Q(rear, y0 - 7, d0 - 8)], "rgba(0,0,0,0.48)");
  ctx.restore();
  // The near end is visible from the doorway on either side of the room.
  solidSurface(ctx, wood, (u, v) => Q(rear + (front - rear) * u, y1 - (y1 - y0) * v, d0), 0.52);
  if (depth > 16) recessedPanel(ctx, L, {
    x0: Math.min(rear, front) + 3, x1: Math.max(rear, front) - 3,
    y0: y0 + 6, y1: y1 - 6, d: d0 - 0.3, inset: 3, relief: 2,
  });
  if (y1 < EYE) solidSurface(ctx, wood, (u, v) => Q(rear + (front - rear) * u, y1, d0 + (d1 - d0) * v), 0.9);
  if (y0 > EYE) solidSurface(ctx, wood, (u, v) => Q(rear + (front - rear) * u, y0, d0 + (d1 - d0) * v), 0.35);
  const edge = Q(front, y1, d0), foot = Q(front, y0, d0);
  ctx.strokeStyle = "rgba(204,164,110,0.32)";
  ctx.lineWidth = Math.max(0.6, 0.5 * edge.s);
  ctx.beginPath(); ctx.moveTo(edge.x, edge.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
  if (y0 === 0) {
    const p = Q((rear + front) / 2, 0, (d0 + d1) / 2);
    soft(ctx, p.x, p.y, depth * p.s, 8 * p.s, "0,0,0", 0.55);
  }
  return front;
}
