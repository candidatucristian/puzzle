import { soft, lcg } from "../../shared/paint.js";
import { BACK, thingAt } from "../house/roomKit.js";
import { paintTreeAlone } from "../pi/tree.js";

/** The Christmas tree in the drawing room: the puzzle's own tree (pi/tree.js)
 *  — its tub, its nine tiers of boughs, its star, its glass balls, its
 *  strings of lamps, the parcels under it — stood against the back wall
 *  between the hearth and the window, and seen from across the room: lower
 *  and broader than it is close to. Its lamps are its light, and burn until
 *  its puzzle is solved.
 *
 *  Measured as the room is (house/roomKit.js). */

const D = BACK - 40;
// how many lamps are alight along each tier, top to bottom — as the puzzle has them
const ALIGHT = [3, 1, 4, 1, 5, 9, 2, 6, 5];

/** Put the tree into a room's layout: where it is, what it opens, its light. */
export function layoutRoomTree(L, on) {
  const { Q, half: hx } = L;
  // how tall it stands from the floor to the tip of its star, and how far its lowest boughs reach
  const t = (L.tree = { x: 0.07 * hx, tall: 186, reach: 60, on });
  L.things.push(thingAt("pi", "Look at the tree", [Q(t.x - t.reach, t.tall, D), Q(t.x + t.reach, t.tall, D), Q(t.x + t.reach, 0, D), Q(t.x - t.reach, 0, D)]));
  const c = Q(t.x, t.tall * 0.45, D);
  t.glow = { x: c.x, y: c.y, r: 120 * c.s };
  L.detailLights.push({ x: c.x, y: c.y + 20 * c.s, rx: 200 * c.s, ry: 190 * c.s, k: on ? 0.92 : 0.34 });
}

export function paintRoomTree(ctx, L) {
  const t = L.tree, rnd = lcg(314);
  const foot = L.Q(t.x, 0, D), s = foot.s;
  // the tree as the puzzle paints it, on a sheet of its own
  const art = paintTreeAlone(1200, 700), a = art.L.tree;
  const starTop = a.top - a.th * 0.75;
  const sx = (t.reach * s) / a.reach, sy = (t.tall * s) / (art.L.floorY - starTop);
  const at = (p) => ({ x: foot.x + (p.x - a.cx) * sx, y: foot.y + (p.y - art.L.floorY) * sy });
  soft(ctx, foot.x, foot.y, (t.reach + 16) * s, 10 * s, "0,0,0", 0.7);
  const x0 = a.cx - a.reach * 1.3, y0 = starTop - 4, w = a.reach * 2.6, h = art.L.H - y0;
  const p0 = at({ x: x0, y: y0 });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(art.canvas, x0, y0, w, h, p0.x, p0.y, w * sx, h * sy);
  if (!t.on) return;
  // the lamps that are alight, here and there along each string
  for (const [i, row] of art.L.rows.entries()) {
    const lit = row.map((_, j) => j).sort(() => rnd() - 0.5).slice(0, ALIGHT[i]);
    for (const j of lit) {
      const p = at(row[j]);
      soft(ctx, p.x, p.y, 8 * s, 8 * s, "255,184,96", 0.55, "lighter");
      ctx.fillStyle = "#fff2c8";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, 1.2 * s), Math.max(1.2, 1.7 * s), 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  soft(ctx, foot.x, foot.y - t.tall * 0.45 * s, t.reach * 1.5 * s, t.tall * 0.6 * s, "255,184,96", 0.1, "lighter");
}
