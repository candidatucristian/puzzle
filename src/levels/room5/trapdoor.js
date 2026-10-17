import { soft, lcg } from "../../shared/paint.js";
import { fillPoly, thingAt } from "../house/roomKit.js";
import { candle } from "../house/furniture.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

/** The trap in the drawing room's floor: a square hole cut through the
 *  parquet to the cellar, an oak curb round it, its door thrown back flat on
 *  the boards beside it — planks under two iron straps, a ring to lift it by
 *  — and the head of an iron ladder standing up out of the dark, its rails
 *  bent over into two hoops to hold by. A candle has been left on the floor
 *  beside it: that is its light, and burns until the cellar's puzzle is
 *  solved.
 *
 *  Measured as the room is (house/roomKit.js): centimetres across from the
 *  middle, up from the floor, and away from us. */

/** Put the trap into a room's layout: where it is, what it opens, its light. */
export function layoutTrap(L, on) {
  const { Q, half: hx } = L;
  const t = (L.trap = { x0: -0.76 * hx, x1: -0.56 * hx, d0: 418, d1: 478, on });
  t.candle = { x: t.x0 - 14, y: 0, d: 462 };
  const top = 64;
  L.things.push(thingAt("tapcode", "Climb down the ladder", [Q(t.x0 - 4, top, t.d1), Q(t.x1 + 4, top, t.d1), Q(t.x1 + 4, 0, t.d0 - 4), Q(t.x0 - 4, 0, t.d0 - 4)]));
  const c = Q(t.candle.x, 18, t.candle.d);
  t.glow = { x: c.x, y: c.y, r: 70 * c.s };
  L.detailLights = [{ x: c.x + 40 * c.s, y: c.y + 10 * c.s, rx: 230 * c.s, ry: 130 * c.s, k: on ? 0.95 : 0.4 }];
}

export function paintTrap(ctx, L) {
  const { Q } = L;
  const t = L.trap, { x0, x1, d0, d1 } = t;
  const rnd = lcg(1212);
  const flat = (ax, ad, bx, bd, col) => fillPoly(ctx, [Q(ax, 0.4, ad), Q(bx, 0.4, ad), Q(bx, 0.4, bd), Q(ax, 0.4, bd)], col);
  // ── the door, thrown back on the floor to the right of the hole
  const w = x1 - x0, lx0 = x1 + 5, lx1 = x1 + w + 5;
  const lid = [Q(lx0, 3, d0), Q(lx1, 3, d0), Q(lx1, 3, d1), Q(lx0, 3, d1)];
  const ls = Q((lx0 + lx1) / 2, 0, (d0 + d1) / 2);
  soft(ctx, ls.x, ls.y, (w / 2 + 10) * ls.s, 26 * ls.s * 0.5, "0,0,0", 0.6);
  fillPoly(ctx, [Q(lx0, 0, d0), Q(lx1, 0, d0), Q(lx1, 3, d0), Q(lx0, 3, d0)], "#120b06");
  fillPoly(ctx, [Q(lx1, 0, d0), Q(lx1, 0, d1), Q(lx1, 3, d1), Q(lx1, 3, d0)], "#0c0704");
  fillPoly(ctx, lid, "#33200f");
  if (L.surfaceMaterials?.detailed) paintProjectedMaterial(ctx, L.surfaceMaterials.wood, (u, v) => Q(lx0 + w * u, 3, d1 - (d1 - d0) * v), 0.88, 2, 2);
  // its planks, running away from us, each its own shade
  for (let i = 0; i < 5; i++) {
    const a = lx0 + (w * i) / 5, b = lx0 + (w * (i + 1)) / 5, k = rnd();
    fillPoly(ctx, [Q(a, 3, d0), Q(b, 3, d0), Q(b, 3, d1), Q(a, 3, d1)], k < 0.5 ? `rgba(0,0,0,${(k * 0.4).toFixed(3)})` : `rgba(255,206,160,${((k - 0.5) * 0.12).toFixed(3)})`);
    const p = Q(a, 3, d0), q = Q(a, 3, d1);
    ctx.strokeStyle = "rgba(4,2,1,0.8)";
    ctx.lineWidth = Math.max(0.8, 0.5 * p.s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  // two iron straps across them, nailed; and the ring
  for (const d of [d0 + 12, d1 - 12]) {
    fillPoly(ctx, [Q(lx0, 3.2, d - 3), Q(lx1, 3.2, d - 3), Q(lx1, 3.2, d + 3), Q(lx0, 3.2, d + 3)], "#17181c");
    for (let i = 0; i < 5; i++) {
      const n = Q(lx0 + (w * (i + 0.5)) / 5, 3.3, d);
      ctx.fillStyle = "#4a4e58";
      ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(0.8, 0.9 * n.s), 0, Math.PI * 2); ctx.fill();
    }
  }
  const ring = Q(lx0 + w * 0.5, 3.3, (d0 + d1) / 2);
  ctx.strokeStyle = "#0c0c0e";
  ctx.lineWidth = Math.max(1.2, 1.5 * ring.s);
  ctx.beginPath(); ctx.ellipse(ring.x, ring.y, 6 * ring.s, 2.6 * ring.s, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(190,204,236,0.35)";
  ctx.lineWidth = Math.max(0.6, 0.5 * ring.s);
  ctx.beginPath(); ctx.ellipse(ring.x, ring.y - 0.4 * ring.s, 6 * ring.s, 2.6 * ring.s, 0, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
  // ── the curb, and the hole
  flat(x0 - 6, d0 - 6, x1 + 6, d1 + 6, "#3a2414");
  if (L.surfaceMaterials?.detailed) paintProjectedMaterial(ctx, L.surfaceMaterials.wood, (u, v) => Q(x0 - 6 + (x1 - x0 + 12) * u, 0.4, d1 + 6 - (d1 - d0 + 12) * v), 0.72, 2, 2);
  const hole = [Q(x0, 0.4, d0), Q(x1, 0.4, d0), Q(x1, 0.4, d1), Q(x0, 0.4, d1)];
  fillPoly(ctx, hole, "#020203");
  ctx.save();
  ctx.beginPath();
  hole.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  // down it: the thickness of the floor, then brick, going into the dark
  for (const [y0, y1, far, side] of [[0, -9, "#2a1a0e", "#1a100a"], [-9, -50, "#2a1c18", "#170f0d"], [-50, -110, "#120c0b", "#0a0706"]]) {
    fillPoly(ctx, [Q(x0, y0, d1), Q(x1, y0, d1), Q(x1, y1, d1), Q(x0, y1, d1)], far);
    fillPoly(ctx, [Q(x0, y0, d0), Q(x0, y0, d1), Q(x0, y1, d1), Q(x0, y1, d0)], side);
  }
  for (let y = -18; y > -110; y -= 9) {
    const a = Q(x0, y, d1), b = Q(x1, y, d1);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = Math.max(0.6, 0.4 * a.s);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // the ladder going down the far side of it
  ladder(ctx, L, -110, 0, true);
  ctx.restore();
  // the curb's near edge catches the candle
  const e0 = Q(x0 - 5, 0.5, d0 - 5), e1 = Q(x1 + 5, 0.5, d0 - 5);
  ctx.strokeStyle = t.on ? "rgba(255,206,150,0.3)" : "rgba(170,186,220,0.14)";
  ctx.lineWidth = Math.max(0.8, 0.5 * e0.s);
  ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
  // ── the head of the ladder, standing up out of it
  ladder(ctx, L, 0, 62, false);
  candle(ctx, L, t.candle, t.on);
}

// The ladder between two heights: its rails against the far side of the
// hole, a rung every 26. Above the floor the rails bend over backward into
// hoops and come down to the boards behind.
function ladder(ctx, L, y0, y1, below) {
  const { Q } = L;
  const t = L.trap, mid = (t.x0 + t.x1) / 2, d = t.d1 - 5, half = 17;
  const iron = (a, b, wide, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.2, wide * a.s);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.lineCap = "butt";
  };
  const lit = t.on ? "rgba(255,200,140,0.45)" : "rgba(170,186,220,0.3)";
  for (let y = below ? -20 : 26; below ? y > y0 : y < y1 - 8; y += below ? -26 : 26) {
    const fade = below ? Math.max(0.15, 1 + y / 110) : 1;
    iron(Q(mid - half, y, d), Q(mid + half, y, d), 2.6, `rgba(${Math.round(46 * fade)},${Math.round(46 * fade)},${Math.round(52 * fade)},1)`);
    if (!below) iron(Q(mid - half, y + 0.9, d), Q(mid + half, y + 0.9, d), 0.7, lit);
  }
  for (const s of [-1, 1]) {
    const x = mid + s * half;
    iron(Q(x, y0, d), Q(x, y1, d), 3.4, below ? "#141417" : "#26272c");
    if (below) continue;
    iron(Q(x - 1, y0, d), Q(x - 1, y1, d), 0.8, lit);
    // the hoop: over, back and down to the floor behind the hole
    const top = Q(x, y1, d), back = Q(x, y1 - 8, d + 22), foot = Q(x, 0, d + 26), over = Q(x, y1 + 12, d + 12);
    ctx.strokeStyle = "#26272c";
    ctx.lineWidth = Math.max(1.2, 3.4 * top.s);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(over.x, over.y, back.x, back.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
    ctx.strokeStyle = lit;
    ctx.lineWidth = Math.max(0.6, 0.8 * top.s);
    ctx.beginPath(); ctx.moveTo(top.x - top.s, top.y); ctx.quadraticCurveTo(over.x - top.s, over.y, back.x - top.s, back.y); ctx.stroke();
    ctx.lineCap = "butt";
  }
}
