import { polygon } from "../../shared/paint.js";
import { buildSpiralStaircase, paintSpiralFallback } from "./spiralStaircase.js";

export function paintChemistryStairs(ctx, L, span) {
  const { P, wall, floor, H, u } = L, { z0, z1, head } = span;
  const at = (z, y, depth = 0) => P(wall + depth, y, z);
  const fill = (points, colour) => { polygon(ctx, points); ctx.fillStyle = colour; ctx.fill(); };
  const opening = [at(z0,head),at(z1,head),at(z1,floor),at(z0,floor)];
  const casing = [at(z0-0.022,head-H*0.015),at(z1+0.022,head-H*0.015),at(z1+0.022,floor),at(z0-0.022,floor)];
  fill(casing.map(p => ({ x: p.x+u*1.5, y: p.y+u*1.8 })), "rgba(0,0,0,0.3)");
  const frame = ctx.createLinearGradient(opening[1].x,0,opening[0].x,0);
  frame.addColorStop(0,"#77796e"); frame.addColorStop(0.35,"#53594f"); frame.addColorStop(1,"#353e36");
  fill(casing,frame);

  ctx.save(); polygon(ctx,opening); ctx.clip();
  fill(opening,"#1a1c1b");
  paintSpiralFallback(ctx,L,buildSpiralStaircase(L,span));

  const depth = H*0.028;
  // A narrow plaster reveal and a single stone sill meet the existing floor.
  fill([at(z1,head),at(z1,head,depth),at(z1,floor,depth),at(z1,floor)],"#4c5047");
  fill([at(z0,head),at(z1,head),at(z1,head,depth),at(z0,head,depth)],"#343a35");
  fill([at(z0,floor),at(z1,floor),at(z1,floor,depth),at(z0,floor,depth)],"#5a584d");
  const shadow = ctx.createLinearGradient(opening[1].x,0,opening[1].x+(opening[0].x-opening[1].x)*0.25,0);
  shadow.addColorStop(0,"rgba(7,10,9,0.28)"); shadow.addColorStop(1,"rgba(7,10,9,0)");
  fill(opening,shadow);
  ctx.restore();
}
