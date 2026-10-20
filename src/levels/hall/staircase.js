import { makeCanvas, polygon } from "../../shared/paint.js";
import { buildSpiralStaircase, paintSpiralFallback } from "./spiralStaircase.js";

const KEY = "chemistry_spiral_stairwell_v4";
const URL = "assets/images/Chemistry/spiral-stairwell-photographic-v4.png";
const cache = new WeakMap();

export function loadStaircaseArt(scene) {
  if (!scene.textures.exists(KEY)) scene.load.image(KEY, URL);
}

export function staircaseArt(scene) {
  if (!scene.textures.exists(KEY)) return null;
  const source = scene.textures.get(KEY).getSourceImage();
  if (!cache.has(source)) {
    const canvas = makeCanvas(source.width, source.height), ctx = canvas.getContext("2d");
    ctx.filter = "brightness(0.86) saturate(0.72)";
    ctx.drawImage(source, 0, 0);
    cache.set(source, canvas);
  }
  return cache.get(source);
}

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
  if (L.staircaseArt) {
    const image = L.staircaseArt;
    const x = Math.min(...opening.map(p => p.x)), y = Math.min(...opening.map(p => p.y));
    const width = Math.max(...opening.map(p => p.x))-x, height = Math.max(...opening.map(p => p.y))-y;
    // Crop a coherent photograph behind the opening. The architecture inside
    // keeps its own depth and proportions instead of being flattened onto the wall.
    const scale = Math.max(width/image.width,height/image.height);
    const sw = width/scale, sh = height/scale;
    const sx = Math.max(0,Math.min(image.width-sw,image.width*0.55-sw/2));
    const sy = Math.max(0,Math.min(image.height-sh,image.height*0.52-sh/2));
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image,sx,sy,sw,sh,x,y,width,height);
  } else paintSpiralFallback(ctx,L,buildSpiralStaircase(L,span));

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
