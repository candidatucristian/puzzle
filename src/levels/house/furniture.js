import { soft } from "../../shared/paint.js";
import { WARM, MOON, fillPoly, block, footShadow } from "./roomKit.js";

/** Furniture more than one room of the house has: a writing desk, a brass
 *  lamp with a green glass shade, a candle in its stick, a games table with
 *  a chessboard set into its top. Each is painted where a room's layout
 *  puts it, by the room's own eye (see roomKit.js). */

// A writing desk: a pedestal of drawers either side of the kneehole, a top
// that overhangs them.
export function writingDesk(ctx, L, k) {
  const { Q } = L;
  const oak = { side: "#160d07", top: "#3a2414", front: "#24150c" };
  footShadow(ctx, L, k);
  const ped = (k.x1 - k.x0) * 0.3;
  block(ctx, L, { ...k, y0: 0, y1: k.h - 13, x1: k.x0 + ped }, oak);
  block(ctx, L, { ...k, y0: 0, y1: k.h - 13, x0: k.x1 - ped }, oak);
  fillPoly(ctx, [Q(k.x0 + ped, 0, k.d0 + 4), Q(k.x1 - ped, 0, k.d0 + 4), Q(k.x1 - ped, k.h - 13, k.d0 + 4), Q(k.x0 + ped, k.h - 13, k.d0 + 4)], "#050302");
  block(ctx, L, { ...k, y0: k.h - 13, y1: k.h - 3 }, oak);
  block(ctx, L, { x0: k.x0 - 3, x1: k.x1 + 3, d0: k.d0 - 3, d1: k.d1, y0: k.h - 3, y1: k.h }, { side: "#1c1009", top: "#4a2e1a", front: "#3a2212" });
  const s = Q(0, 0, k.d0).s;
  const drawer = (x0, x1, y0, y1) => {
    const a = Q(x0, y1, k.d0), b = Q(x1, y0, k.d0);
    ctx.strokeStyle = "rgba(4,2,1,0.8)";
    ctx.lineWidth = Math.max(0.8, 0.7 * s);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.fillStyle = "#a8863e";
    ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(1.2, 1.5 * s), 0, Math.PI * 2); ctx.fill();
  };
  for (const [x0, x1] of [[k.x0 + 3, k.x0 + ped - 3], [k.x1 - ped + 3, k.x1 - 3]]) for (const [y0, y1] of [[5, 22], [25, 42], [45, 60]]) drawer(x0, x1, y0, y1);
  drawer(k.x0 + ped + 3, k.x1 - ped - 3, k.h - 11, k.h - 5);
}

/** A brass lamp with a long green glass shade, standing at `lm` (x, y, d) on
 *  the desk `k`; alight or not. Its light lies on the desk's top. */
export function greenLamp(ctx, L, lm, k, on) {
  const { Q } = L;
  const b = Q(lm.x, lm.y, lm.d), u = b.s;
  if (on) {
    const pool = Q(lm.x + 26, k.h, lm.d - 6);
    ctx.save();
    fillPoly(ctx, [Q(k.x0 - 3, k.h, k.d0 - 3), Q(k.x1 + 3, k.h, k.d0 - 3), Q(k.x1 + 3, k.h, k.d1), Q(k.x0 - 3, k.h, k.d1)], "rgba(0,0,0,0)");
    ctx.clip();
    soft(ctx, pool.x, pool.y, 62 * pool.s, 20 * pool.s, WARM, 0.5, "lighter");
    ctx.restore();
    soft(ctx, b.x + 10 * u, b.y - 22 * u, 110 * u, 90 * u, WARM, 0.14, "lighter");
  }
  const brass = ctx.createLinearGradient(b.x - 7 * u, 0, b.x + 7 * u, 0);
  brass.addColorStop(0, "#2a1e0c"); brass.addColorStop(0.4, on ? "#c8a252" : "#6a5628"); brass.addColorStop(1, "#1e1408");
  ctx.fillStyle = "#120c05";
  ctx.beginPath(); ctx.ellipse(b.x, b.y, 8 * u, 2.4 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = brass;
  ctx.beginPath(); ctx.ellipse(b.x, b.y - 1 * u, 7.4 * u, 2.2 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(b.x - 0.9 * u, b.y - 22 * u, 1.8 * u, 21 * u);
  ctx.fillRect(b.x - 0.9 * u, b.y - 23.6 * u, 9 * u, 1.6 * u);
  // the shade: a half barrel of green glass, lit from under
  const sx = b.x + 4 * u, sy = b.y - 24 * u;
  const glass = ctx.createLinearGradient(0, sy - 6 * u, 0, sy + 3 * u);
  glass.addColorStop(0, on ? "#2e7a52" : "#12281c");
  glass.addColorStop(1, on ? "#6ed09a" : "#1a3a28");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(sx - 13 * u, sy + 2.4 * u);
  ctx.quadraticCurveTo(sx - 12 * u, sy - 6.4 * u, sx, sy - 6.6 * u);
  ctx.quadraticCurveTo(sx + 12 * u, sy - 6.4 * u, sx + 13 * u, sy + 2.4 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = on ? "#fff4cc" : "#0a140e";
  ctx.fillRect(sx - 12.4 * u, sy + 1.8 * u, 24.8 * u, 0.9 * u);
  ctx.strokeStyle = "rgba(220,255,236,0.4)";
  ctx.lineWidth = Math.max(0.6, 0.5 * u);
  ctx.beginPath(); ctx.moveTo(sx - 8 * u, sy - 3.6 * u); ctx.quadraticCurveTo(sx - 2 * u, sy - 5.4 * u, sx + 5 * u, sy - 4.6 * u); ctx.stroke();
}

/** A candle in a brass stick at `cn` (x, y, d): a stub of wax, and its
 *  flame while it burns. */
export function candle(ctx, L, cn, on) {
  const c = L.Q(cn.x, cn.y, cn.d), u = c.s;
  if (on) soft(ctx, c.x, c.y, 44 * u, 12 * u, WARM, 0.3, "lighter");
  const br = ctx.createLinearGradient(c.x - 6 * u, 0, c.x + 6 * u, 0);
  br.addColorStop(0, "#3a2a10"); br.addColorStop(0.45, on ? "#d0aa58" : "#6e5a2c"); br.addColorStop(1, "#2a1e0c");
  ctx.fillStyle = "#1a1208";
  ctx.beginPath(); ctx.ellipse(c.x, c.y, 6 * u, 1.9 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = br;
  ctx.beginPath(); ctx.ellipse(c.x, c.y - 0.8 * u, 6 * u, 1.8 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(c.x - 1.8 * u, c.y - 4.6 * u, 3.6 * u, 4 * u);
  const wax = ctx.createLinearGradient(c.x - 1.5 * u, 0, c.x + 1.5 * u, 0);
  wax.addColorStop(0, on ? "#b8ab8a" : "#5e5a52"); wax.addColorStop(0.5, on ? "#f4ecd4" : "#8a8678"); wax.addColorStop(1, on ? "#8e8468" : "#4a463e");
  ctx.fillStyle = wax;
  ctx.fillRect(c.x - 1.5 * u, c.y - 16 * u, 3 * u, 11.6 * u);
  ctx.fillStyle = "#1a120a";
  ctx.fillRect(c.x - 0.25 * u, c.y - 17.6 * u, 0.5 * u, 1.8 * u);
  if (!on) return;
  soft(ctx, c.x, c.y - 20 * u, 20 * u, 20 * u, WARM, 0.5, "lighter");
  const fl = ctx.createLinearGradient(0, c.y - 24 * u, 0, c.y - 17 * u);
  fl.addColorStop(0, "#ffd070"); fl.addColorStop(0.5, "#fff2c8"); fl.addColorStop(1, "#ff9a3a");
  ctx.fillStyle = fl;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 24.4 * u);
  ctx.quadraticCurveTo(c.x + 2 * u, c.y - 19.4 * u, c.x, c.y - 17.4 * u);
  ctx.quadraticCurveTo(c.x - 2 * u, c.y - 19.4 * u, c.x, c.y - 24.4 * u);
  ctx.fill();
}

/** A games table: a small square table `t` on a turned pedestal, the board
 *  `bd` set into its top, and the pieces of `game` standing on it — each
 *  [file 0–7, rank 0–7, white?, height in centimetres] — turned boxwood and
 *  ebony, the moon across them. */
export function gamesTable(ctx, L, t, bd, game) {
  const { Q } = L;
  const walnut = { side: "#150c07", top: "#3e2718", front: "#25160d" };
  footShadow(ctx, L, t, 0.65);
  const mx = (t.x0 + t.x1) / 2, md = (t.d0 + t.d1) / 2;
  block(ctx, L, { x0: mx - 22, x1: mx + 22, d0: md - 22, d1: md + 22, y0: 0, y1: 4 }, walnut);
  block(ctx, L, { x0: mx - 5, x1: mx + 5, d0: md - 5, d1: md + 5, y0: 4, y1: t.h - 4 }, walnut);
  block(ctx, L, { ...t, y0: t.h - 4, y1: t.h }, walnut);
  // the board: maple and walnut, a frame round it
  const at = (fx, fd, y = bd.y) => Q(bd.x0 + (bd.x1 - bd.x0) * fx, y, bd.d0 + (bd.d1 - bd.d0) * fd);
  fillPoly(ctx, [Q(bd.x0 - 3, t.h + 0.1, bd.d0 - 3), Q(bd.x1 + 3, t.h + 0.1, bd.d0 - 3), Q(bd.x1 + 3, t.h + 0.1, bd.d1 + 3), Q(bd.x0 - 3, t.h + 0.1, bd.d1 + 3)], "#20140c");
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      fillPoly(ctx, [at(f / 8, r / 8), at((f + 1) / 8, r / 8), at((f + 1) / 8, (r + 1) / 8), at(f / 8, (r + 1) / 8)], (f + r) % 2 ? "#b89868" : "#3a2414");
    }
  }
  ctx.save();
  fillPoly(ctx, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)], "rgba(0,0,0,0)");
  ctx.clip();
  const mid = at(0.6, 0.5);
  soft(ctx, mid.x, mid.y, 40 * mid.s, 16 * mid.s, MOON, 0.22, "lighter");
  ctx.restore();
  // the pieces, the furthest first
  for (const [file, rank, white, tall] of [...game].sort((p, q) => q[1] - p[1])) {
    const p = at((file + 0.5) / 8, (rank + 0.5) / 8), u = p.s;
    soft(ctx, p.x - 1.4 * u, p.y + 0.3 * u, 2.6 * u, 0.9 * u, "0,0,0", 0.6);
    const g = ctx.createLinearGradient(p.x - 1.8 * u, 0, p.x + 1.8 * u, 0);
    if (white) { g.addColorStop(0, "#7a6a48"); g.addColorStop(0.6, "#efe0b4"); g.addColorStop(1, "#a8966a"); }
    else { g.addColorStop(0, "#050404"); g.addColorStop(0.6, "#3a302a"); g.addColorStop(1, "#120e0c"); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.9 * u, 0.7 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x - 1.8 * u, p.y);
    ctx.quadraticCurveTo(p.x - 0.5 * u, p.y - tall * 0.4 * u, p.x - 0.75 * u, p.y - tall * 0.74 * u);
    ctx.lineTo(p.x + 0.75 * u, p.y - tall * 0.74 * u);
    ctx.quadraticCurveTo(p.x + 0.5 * u, p.y - tall * 0.4 * u, p.x + 1.8 * u, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y - tall * 0.86 * u, 1.15 * u, 0, Math.PI * 2); ctx.fill();
    if (tall > 9) ctx.fillRect(p.x - 0.2 * u, p.y - (tall + 0.9) * u, 0.4 * u, 1.6 * u); // a king's cross
  }
}
