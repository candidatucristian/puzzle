import { makeCanvas, addCanvas, softEllipse, lcg } from "./garden.js";
import { plantPhotographs } from "./photographicPlant.js";
import { fibonacciParts } from "./blenderPlant.js";

/** Live objects from the Blender garden, positioned in centimetres.
 *  Stems progressively reveal the actual render, with 3D pot-rim occlusion.
 *  Twelve separate curved leaf renders grow from their petiole anchors;
 *  six pail renders preserve the changing water level. Legacy procedural
 *  painters below provide a fallback if the rendered assets are absent. */

export const RES = 2; // texture pixels per screen pixel

// the pot, in cm: its base on the bench, the soil just under the rim
export const POT = { h: 19, rimR: 11, bodyR: 10, footR: 7, band: 3, soilY: -17.3 };
// the bucket, in cm, about its middle (so it tips about its middle)
export const BUCKET = { h: 25, topR: 13.5, footR: 10.5 };
const TILT = 0.42; // how much of a round opening we see, looking down at it from the window

const K = {
  potBack: "pp_pot_back",
  potFront: "pp_pot_front",
  wet: "pp_wet",
  bucket: "pp_bucket_",
  shadow: "pp_bucket_shadow",
  drop: "pp_drop",
  leaf: "pp_laurel_leaf_",
};
export const WATER_LEVELS = 6; // full … empty

/** Paints the pot and the bucket for `cm` screen pixels per
 *  centimetre. */
export function paintPlantArt(textures, cm) {
  const px = cm * RES;
  const rendered = fibonacciParts(textures);
  const photographs = rendered ? null : plantPhotographs(textures);
  const pot = rendered ? paintRenderedPot(px) : paintPot(px, photographs?.pot);
  addCanvas(textures, K.potBack, pot.back);
  addCanvas(textures, K.potFront, pot.front);
  addCanvas(textures, K.wet, pot.wet);
  const buckets = [];
  let bucketOrigin = null;
  for (let i = 0; !rendered && i < WATER_LEVELS; i++) {
    const b = paintBucket(px, 1 - i / (WATER_LEVELS - 1));
    addCanvas(textures, K.bucket + i, b.canvas);
    buckets.push(K.bucket + i);
    bucketOrigin = { ox: b.ox, oy: b.oy };
  }
  addCanvas(textures, K.shadow, paintBucketShadow(px));
  addCanvas(textures, K.drop, paintDrop());
  const leaves = photographs?.leaves.map((leaf,i) => {
    const key=K.leaf+i;addCanvas(textures,key,leaf.image);
    return {key,ox:leaf.ox,oy:leaf.oy,height:leaf.image.height};
  });
  return {
    pot: { back: K.potBack, front: K.potFront, wet: K.wet, ox: pot.ox, oy: pot.oy, wetAt: pot.wetAt },
    buckets: rendered?.buckets ?? buckets,
    bucketOrigin: rendered?.bucketOrigin ?? bucketOrigin,
    spriteScale: rendered?.spriteScale,
    bucketLip: rendered?.bucketLip,
    shadow: rendered?.shadow?.key ?? K.shadow,
    shadowOrigin: rendered?.shadow,
    shadowScale: rendered?.shadow?.scale,
    shadowY: rendered?.shadow ? 0 : -.3,
    drop: K.drop,
    leaves: rendered?.leaves ?? leaves,
    leafRenders: rendered?.leaves,
    stemRender: rendered?.stems,
    bark: photographs?.stem,
  };
}

// The real pot, soil and contact shadow are already in the Cycles plate.
// The stem layer has exact 3D rim occlusion. At this camera angle the front
// rim covers the soil; an artificial dark oval would paint over the clay.
function paintRenderedPot(px) {
  const width=26, height=28, top=-25;
  const back=makeCanvas(width*px,height*px),front=makeCanvas(width*px,height*px),wet=makeCanvas(width*px,height*px);
  return {back,front,wet,ox:.5,oy:-top/height,wetAt:{x:0,y:POT.soilY}};
}

export function releasePlantArt(textures) {
  const keys = [K.potBack, K.potFront, K.wet, K.shadow, K.drop];
  for (let i = 0; i < WATER_LEVELS; i++) keys.push(K.bucket + i);
  for (let i = 0; i < 4; i++) keys.push(K.leaf + i);
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

// ── the pot ─────────────────────────────────────────────────────────────────

// A terracotta pot, looked down on from the window: we see into it — the
// thick rim's flat top all the way round, the far wall inside going down
// into shadow, the soil — and down its outside: the collar under the rim,
// the tapered body, the foot. The lantern is low on its left: the clay is
// warm and bright there and goes to shadow round the right, with a thread
// of moonlight on the far edge. Throwing rings, salt bloom, a little moss
// low down, a chip out of the rim, as old pots have.
function paintPot(px, photograph) {
  const P = POT;
  const pad = 2;
  const x0 = -P.rimR - pad;
  const x1 = P.rimR + pad;
  const y0 = -P.h - P.rimR * TILT - pad;
  const y1 = pad + 1.5;
  const size = (w) => Math.ceil(w * px);
  const mk = () => {
    const c = makeCanvas(size(x1 - x0), size(y1 - y0));
    const g = c.getContext("2d");
    g.setTransform(px, 0, 0, px, -x0 * px, -y0 * px);
    return { c, g };
  };
  const back = mk();
  const front = mk();
  const wetC = mk();
  const g = back.g;
  const R = P.rimR;
  const yTop = -P.h; // the rim's top, at its middle
  const yBand = yTop + P.band; // where the collar ends
  const rIn = R - 1.35; // the rim is this thick
  const rCol = R - 0.3;
  const rSoil = rIn - 0.5;
  const rnd = lcg(404);
  // how the clay is lit across its width: the lantern low on the left
  const clay = (xl, xr, k = 1) => {
    const c = (r, gr, b) => `rgb(${Math.round(r * k)},${Math.round(gr * k)},${Math.round(b * k)})`;
    const grd = g.createLinearGradient(xl, 0, xr, 0);
    grd.addColorStop(0, c(150, 74, 40));
    grd.addColorStop(0.1, c(226, 140, 86));
    grd.addColorStop(0.28, c(190, 106, 60));
    grd.addColorStop(0.54, c(122, 60, 30));
    grd.addColorStop(0.8, c(62, 28, 13));
    grd.addColorStop(0.94, c(42, 18, 9));
    grd.addColorStop(1, "#56607a");
    return grd;
  };
  // fine grain, pits and flecks, over whatever is clipped
  const grain = (n, xa, xb, ya, yb) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(255,206,166,0.09)" : "rgba(40,14,6,0.14)";
      g.fillRect(xa + rnd() * (xb - xa), ya + rnd() * (yb - ya), 0.14 + rnd() * 0.22, 0.14 + rnd() * 0.16);
    }
  };

  // ── the body: a tapered drum from under the collar to the foot
  const body = new Path2D();
  body.moveTo(-P.bodyR, yBand);
  body.lineTo(-P.footR, -0.6);
  body.ellipse(0, -0.6, P.footR, P.footR * TILT, 0, Math.PI, 0, true);
  body.lineTo(P.bodyR, yBand);
  body.closePath();
  g.fillStyle = clay(-P.bodyR, P.bodyR);
  g.fill(body);
  g.save();
  g.clip(body);
  // the rings the potter's fingers left, going round it
  for (let y = yBand + 1.2; y < 2; y += 0.85) {
    const k = (y - yBand) / (-0.6 - yBand);
    const r = P.bodyR + (P.footR - P.bodyR) * k;
    g.strokeStyle = rnd() < 0.5 ? "rgba(30,10,4,0.13)" : "rgba(255,210,170,0.07)";
    g.lineWidth = 0.16 + rnd() * 0.2;
    g.beginPath();
    g.ellipse(0, y - r * TILT, r + 0.4, r * TILT, 0, 0, Math.PI);
    g.stroke();
  }
  // the collar's shadow lying on its shoulder
  g.fillStyle = "rgba(12,4,2,0.55)";
  g.beginPath();
  g.ellipse(0, yBand + 0.2, rCol + 0.2, rCol * TILT + 1.1, 0, 0, Math.PI);
  g.fill();
  // salt bloom creeping up from the foot, moss in the damp at the bottom
  for (let i = 0; i < 18; i++) {
    softEllipse(g, (rnd() - 0.5) * P.bodyR * 1.8, 1.5 - rnd() * 8, 1 + rnd() * 2, 0.5 + rnd() * 0.9, "222,212,192", 0.05 + rnd() * 0.06);
  }
  for (let i = 0; i < 7; i++) {
    softEllipse(g, (rnd() - 0.2) * P.footR * 1.6, 2.2 - rnd() * 2, 1.6 + rnd() * 2, 0.8, "70,92,40", 0.28);
  }
  grain(420, -P.bodyR, P.bodyR, yBand, 3.5);
  // a hairline crack down from the shoulder
  g.strokeStyle = "rgba(20,8,4,0.5)";
  g.lineWidth = 0.14;
  g.beginPath();
  g.moveTo(-3.2, yBand + 4.6);
  g.lineTo(-3.6, yBand + 7);
  g.lineTo(-3.1, yBand + 9);
  g.lineTo(-3.5, yBand + 11.5);
  g.stroke();
  // the foot turning under, and the bench's warmth thrown back up into it
  const under = g.createLinearGradient(0, -3, 0, 3);
  under.addColorStop(0, "rgba(8,3,1,0)");
  under.addColorStop(1, "rgba(8,3,1,0.6)");
  g.fillStyle = under;
  g.fillRect(x0, -3, x1 - x0, 7);
  softEllipse(g, -P.footR * 0.7, 0.5, 4, 1.6, "255,170,110", 0.16, "lighter");
  g.restore();

  // ── the collar: the thick band under the rim, standing proud of the body
  const collar = new Path2D();
  collar.moveTo(-R, yTop);
  collar.lineTo(-rCol, yBand);
  collar.ellipse(0, yBand, rCol, rCol * TILT, 0, Math.PI, 0, true);
  collar.lineTo(R, yTop);
  collar.ellipse(0, yTop, R, R * TILT, 0, 0, Math.PI);
  collar.closePath();
  g.fillStyle = clay(-R, R, 1.06);
  g.fill(collar);
  g.save();
  g.clip(collar);
  grain(260, -R, R, yTop, yBand + R * TILT);
  // its lower edge rounds under into shadow
  g.strokeStyle = "rgba(14,5,2,0.6)";
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(0, yBand - 0.1, rCol, rCol * TILT, 0, 0, Math.PI);
  g.stroke();
  g.strokeStyle = "rgba(255,214,172,0.16)";
  g.lineWidth = 0.3;
  g.beginPath();
  g.ellipse(0, yBand - 0.75, rCol, rCol * TILT, 0, Math.PI * 0.55, Math.PI * 0.95);
  g.stroke();
  g.restore();

  // ── the inside, seen over the rim: the far wall going down, then the soil
  const inner = new Path2D();
  inner.ellipse(0, yTop, rIn, rIn * TILT, 0, 0, Math.PI * 2);
  g.save();
  g.clip(inner);
  const wall = g.createLinearGradient(0, yTop - rIn * TILT, 0, P.soilY);
  wall.addColorStop(0, "#6a3620");
  wall.addColorStop(0.5, "#3c1c10");
  wall.addColorStop(1, "#190a05");
  g.fillStyle = wall;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // the moon reaches the inside of the wall on the left; the lantern, lower
  // than the rim, does not reach in at all
  const cool = g.createLinearGradient(-rIn, 0, rIn * 0.2, 0);
  cool.addColorStop(0, "rgba(140,160,210,0.26)");
  cool.addColorStop(1, "rgba(140,160,210,0)");
  g.fillStyle = cool;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // the soil: dark, crumbly, a little hollowed toward the middle
  const soil = new Path2D();
  soil.ellipse(0, P.soilY, rSoil, rSoil * TILT, 0, 0, Math.PI * 2);
  const sg = g.createRadialGradient(-rSoil * 0.3, P.soilY - rSoil * TILT * 0.3, 0.5, 0, P.soilY, rSoil);
  sg.addColorStop(0, "#4a3222");
  sg.addColorStop(0.6, "#2c1c12");
  sg.addColorStop(1, "#150c07");
  g.fillStyle = sg;
  g.fill(soil);
  g.save();
  g.clip(soil);
  const inSoil = () => {
    const a = rnd() * Math.PI * 2, q = Math.sqrt(rnd());
    return { x: Math.cos(a) * q * rSoil, y: P.soilY + Math.sin(a) * q * rSoil * TILT };
  };
  for (let i = 0; i < 420; i++) {
    const p = inSoil();
    const r = 0.1 + rnd() * 0.3;
    g.fillStyle = rnd() < 0.5 ? "rgba(118,82,54,0.55)" : "rgba(6,3,1,0.6)";
    g.fillRect(p.x, p.y, r, r * 0.6);
  }
  // clods, each lit on its upper left, and a few grains of perlite
  for (let i = 0; i < 26; i++) {
    const p = inSoil();
    const r = 0.35 + rnd() * 0.55;
    g.fillStyle = "rgba(6,3,1,0.6)";
    g.beginPath(); g.ellipse(p.x + r * 0.2, p.y + r * 0.25, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3e2a1c";
    g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(170,150,150,0.22)";
    g.beginPath(); g.ellipse(p.x - r * 0.25, p.y - r * 0.2, r * 0.5, r * 0.26, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 12; i++) {
    const p = inSoil();
    g.fillStyle = "rgba(232,228,216,0.85)";
    g.beginPath(); g.ellipse(p.x, p.y, 0.22, 0.15, 0, 0, Math.PI * 2); g.fill();
  }
  // the near lip's shadow on the soil under it, and the right-hand side dark
  softEllipse(g, rSoil * 0.5, P.soilY + rSoil * TILT * 0.5, rSoil, rSoil * TILT * 0.9, "0,0,0", 0.5);
  g.restore();
  // where the soil meets the wall
  g.strokeStyle = "rgba(4,2,1,0.7)";
  g.lineWidth = 0.4;
  g.beginPath();
  g.ellipse(0, P.soilY, rSoil, rSoil * TILT, 0, Math.PI, Math.PI * 2);
  g.stroke();
  g.restore();

  // ── the rim's flat top, all the way round
  const rim = new Path2D();
  rim.ellipse(0, yTop, R, R * TILT, 0, 0, Math.PI * 2);
  rim.ellipse(0, yTop, rIn, rIn * TILT, 0, 0, Math.PI * 2);
  g.fillStyle = clay(-R, R, 1.16);
  g.fill(rim, "evenodd");
  g.save();
  g.clip(rim, "evenodd");
  // the moon on the top of it, most at the back; the grain of the clay
  const moon = g.createLinearGradient(0, yTop - R * TILT, 0, yTop + R * TILT);
  moon.addColorStop(0, "rgba(150,170,220,0.3)");
  moon.addColorStop(1, "rgba(150,170,220,0.04)");
  g.fillStyle = moon;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  grain(220, -R, R, yTop - R * TILT, yTop + R * TILT);
  // a chip out of its near edge
  g.fillStyle = "#7c3a1e";
  g.beginPath();
  g.ellipse(3.4, yTop + R * TILT * 0.93, 1.1, 0.5, 0.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,196,150,0.35)";
  g.fillRect(2.5, yTop + R * TILT * 0.86, 1.6, 0.14);
  g.restore();
  // its edges: the outer one bright toward the lantern, the inner one dark
  // where the wall drops away
  g.strokeStyle = "rgba(255,206,156,0.55)";
  g.lineWidth = 0.28;
  g.beginPath();
  g.ellipse(0, yTop, R - 0.1, (R - 0.1) * TILT, 0, Math.PI * 0.52, Math.PI * 1.25);
  g.stroke();
  g.strokeStyle = "rgba(16,6,3,0.6)";
  g.lineWidth = 0.3;
  g.beginPath();
  g.ellipse(0, yTop, rIn, rIn * TILT, 0, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "rgba(170,186,226,0.3)";
  g.lineWidth = 0.2;
  g.beginPath();
  g.ellipse(0, yTop, R - 0.1, (R - 0.1) * TILT, 0, Math.PI * 1.55, Math.PI * 2);
  g.stroke();

  if (photograph) {
    // Keep the pot's physical width and natural aspect. Its compost lies at
    // the same soil anchor as the live stem, behind the photographed lip.
    g.clearRect(x0,y0,x1-x0,y1-y0);
    const height=22*photograph.height/photograph.width;
    g.drawImage(photograph,-11,-height,22,height);
  }

  // ── the front of the pot goes over the stems: everything this side of the
  // rim's inner edge, taken from what has just been painted
  const f = front.g;
  f.save();
  f.beginPath();
  f.moveTo(x0, yTop);
  f.lineTo(-rIn, yTop);
  f.ellipse(0, yTop, rIn, rIn * TILT, 0, Math.PI, 0, true);
  f.lineTo(x1, yTop);
  f.lineTo(x1, y1);
  f.lineTo(x0, y1);
  f.closePath();
  f.clip();
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.drawImage(back.c, 0, 0);
  f.restore();

  // wet soil: darker, with the moon and the lantern's glow shining in it
  const wg = wetC.g;
  const wet = new Path2D();
  wet.ellipse(0, P.soilY, rSoil - 0.1, (rSoil - 0.1) * TILT, 0, 0, Math.PI * 2);
  wg.save();
  wg.clip(wet);
  wg.fillStyle = "rgba(10,5,2,0.72)";
  wg.fill(wet);
  softEllipse(wg, -R * 0.35, P.soilY - 0.4, R * 0.32, R * TILT * 0.3, "255,200,140", 0.4, "lighter");
  softEllipse(wg, R * 0.3, P.soilY - 1, R * 0.26, R * TILT * 0.24, "170,190,230", 0.4, "lighter");
  wg.restore();
  return {
    back: back.c,
    front: front.c,
    wet: wetC.c,
    ox: -x0 / (x1 - x0),
    oy: -y0 / (y1 - y0),
    wetAt: { x: 0, y: P.soilY },
  };
}

// ── the stems ───────────────────────────────────────────────────────────────

/** Paints the stems grown so far onto `ctx`, a canvas `px` pixels per cm with
 *  the soil's middle at `origin`. segs: [{from, cp, to, w0, w1}] in cm from
 *  the soil; grown[i] 0–1 how much of each; lantern the flame, in the same
 *  cm. Young wood, olive going brown toward the base, lit on the side toward
 *  the lantern and edged with moonlight on the right. */
export function paintStems(ctx, px, origin, segs, grown, lantern, bark, rendered) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(px, 0, 0, px, origin.x, origin.y);
  segs.forEach((s, i) => {
    const g = grown[i] || 0;
    if (g <= 0.001) return;
    const N = 28;
    const pts = [];
    for (let k = 0; k <= N; k++) {
      const t = (k / N) * g;
      const m = 1 - t;
      const x = m * m * s.from.x + 2 * m * t * s.cp.x + t * t * s.to.x;
      const y = m * m * s.from.y + 2 * m * t * s.cp.y + t * t * s.to.y;
      pts.push({ x, y, w: s.w0 + (s.w1 - s.w0) * t });
    }
    // outline: each side offset along the normal
    const left = [];
    const right = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)];
      const b = pts[Math.min(pts.length - 1, k + 1)];
      let nx = -(b.y - a.y);
      let ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const h = pts[k].w / 2 + (rendered ? .12 : 0);
      left.push([pts[k].x + nx * h, pts[k].y + ny * h, nx, ny]);
      right.push([pts[k].x - nx * h, pts[k].y - ny * h, nx, ny]);
    }
    const path = new Path2D();
    left.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y)));
    const tip = pts[pts.length - 1];
    path.arc(tip.x, tip.y, tip.w / 2, Math.atan2(left.at(-1)[3], left.at(-1)[2]), Math.atan2(-right.at(-1)[3], -right.at(-1)[2]));
    for (let k = right.length - 1; k >= 0; k--) path.lineTo(right[k][0], right[k][1]);
    path.closePath();
    if (rendered) {
      ctx.save();ctx.clip(path);
      ctx.drawImage(rendered.image,...rendered.box);
      ctx.restore();
      return;
    }
    // the bark: brown low down, greener up in the young growth
    const young = i >= 2 ? 1 : i === 1 ? 0.55 : 0.2;
    const base = [74 - young * 12, 58 + young * 8, 34 + young * 4];
    ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    if (bark) {
      // Carry the photographed bark along the curve, rather than stretching
      // a straight stem across its bounding rectangle.
      for(let k=1;k<pts.length;k++) {
        const a=pts[k-1],b=pts[k],length=Math.hypot(b.x-a.x,b.y-a.y);
        const sy=bark.height*(1-k/N*g),sh=Math.min(bark.height-sy,bark.height*g/N+1);
        ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2);
        ctx.drawImage(bark,bark.width*.38,sy,bark.width*.24,sh,-a.w*.7,-length-.06,a.w*1.4,length+.12);
        ctx.restore();
      }
    }
    // light from the lantern along the side that faces it, shade on the other
    for (let k = 1; k < pts.length; k++) {
      const p = pts[k];
      const lx = lantern.x - p.x;
      const ly = lantern.y - p.y;
      const d = Math.hypot(lx, ly) || 1;
      const [, , nx, ny] = left[k];
      const facing = (nx * lx + ny * ly) / d; // + if the left edge faces it
      const near = 1 / (1 + (d / 45) ** 2);
      const warm = 0.25 + 0.75 * near;
      const s0 = facing > 0 ? left : right;
      const s1 = facing > 0 ? right : left;
      ctx.strokeStyle = `rgba(255,202,143,${0.42 * warm * Math.abs(facing)})`;
      ctx.lineWidth = p.w * 0.45;
      ctx.beginPath();
      ctx.moveTo((s0[k - 1][0] + pts[k - 1].x) / 2, (s0[k - 1][1] + pts[k - 1].y) / 2);
      ctx.lineTo((s0[k][0] + p.x) / 2, (s0[k][1] + p.y) / 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(10,8,4,0.28)";
      ctx.beginPath();
      ctx.moveTo((s1[k - 1][0] + pts[k - 1].x) / 2, (s1[k - 1][1] + pts[k - 1].y) / 2);
      ctx.lineTo((s1[k][0] + p.x) / 2, (s1[k][1] + p.y) / 2);
      ctx.stroke();
    }
    // the moon's thread down the right-hand edge
    ctx.strokeStyle = "rgba(184,204,229,0.45)";
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    const rim = left[0][2] > 0 ? left : right;
    rim.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ── the bucket ──────────────────────────────────────────────────────────────

// A galvanised bucket: rolled rim, a stamped ring, riveted ears and a wire
// bail with a wooden grip. Zinc takes its light from what it faces: the
// moon's cold band on the right, the lantern's small warm glint on the left,
// the dark of the garden in between. Painted about its middle; `fill` is how
// full it is (1 full, 0 empty).
function paintBucket(px, fill) {
  const B = BUCKET;
  const top = -B.h / 2;
  const bot = B.h / 2;
  const pad = 2;
  const x0 = -B.topR - pad;
  const x1 = B.topR + pad;
  const y0 = top - B.topR * 1.05 - pad; // room for the handle
  const y1 = bot + B.footR * TILT + pad;
  const c = makeCanvas((x1 - x0) * px, (y1 - y0) * px);
  const g = c.getContext("2d");
  g.setTransform(px, 0, 0, px, -x0 * px, -y0 * px);
  const zinc = (xl, xr) => {
    const gr = g.createLinearGradient(xl, 0, xr, 0);
    gr.addColorStop(0, "#3a3e44");
    gr.addColorStop(0.1, "#8a8e90");
    gr.addColorStop(0.2, "#4a4f55");
    gr.addColorStop(0.45, "#2a2e33");
    gr.addColorStop(0.66, "#6a7684");
    gr.addColorStop(0.76, "#c4d0de");
    gr.addColorStop(0.84, "#7a8694");
    gr.addColorStop(1, "#262a2f");
    return gr;
  };
  // the body
  const body = new Path2D();
  body.moveTo(-B.topR, top);
  body.lineTo(-B.footR, bot);
  body.ellipse(0, bot, B.footR, B.footR * TILT, 0, Math.PI, 0, true);
  body.lineTo(B.topR, top);
  body.ellipse(0, top, B.topR, B.topR * TILT, 0, 0, Math.PI);
  body.closePath();
  g.fillStyle = zinc(-B.topR, B.topR);
  g.fill(body);
  g.save();
  g.clip(body);
  // spangle: the crystalline mottle of galvanised steel
  const rnd = lcg(3030);
  for (let i = 0; i < 140; i++) {
    const x = (rnd() - 0.5) * B.topR * 2;
    const y = top + rnd() * B.h;
    softEllipse(g, x, y, 0.6 + rnd() * 1.4, 0.4 + rnd() * 1, rnd() < 0.5 ? "255,255,255" : "0,0,0", 0.06);
  }
  // the lantern's warm glint, far round on the left
  softEllipse(g, -B.topR * 0.78, top + B.h * 0.45, 1.2, B.h * 0.4, "255,180,110", 0.35, "lighter");
  // stamped rings, each a light edge over a dark one
  for (const f of [0.3, 0.86]) {
    const y = top + B.h * f;
    const r = B.topR + (B.footR - B.topR) * f;
    g.strokeStyle = "rgba(0,0,0,0.45)";
    g.lineWidth = 0.5;
    g.beginPath();
    g.ellipse(0, y + 0.3, r, r * TILT, 0, 0, Math.PI);
    g.stroke();
    g.strokeStyle = "rgba(220,230,240,0.35)";
    g.lineWidth = 0.35;
    g.beginPath();
    g.ellipse(0, y - 0.1, r, r * TILT, 0, 0, Math.PI);
    g.stroke();
  }
  // a little grime and wear at the foot
  const foot = g.createLinearGradient(0, bot - 4, 0, bot);
  foot.addColorStop(0, "rgba(20,18,14,0)");
  foot.addColorStop(1, "rgba(20,18,14,0.5)");
  g.fillStyle = foot;
  g.fillRect(x0, bot - 4, x1 - x0, 4 + B.footR * TILT);
  g.restore();

  // the inside, through the opening: the far wall, then the water
  const open = new Path2D();
  open.ellipse(0, top, B.topR - 0.5, (B.topR - 0.5) * TILT, 0, 0, Math.PI * 2);
  g.save();
  g.clip(open);
  const inside = g.createLinearGradient(-B.topR, 0, B.topR, 0);
  inside.addColorStop(0, "#5a626c");
  inside.addColorStop(0.5, "#23272c");
  inside.addColorStop(1, "#15181c");
  g.fillStyle = inside;
  g.fill(open);
  const depth = 2.2 + (1 - fill) * (B.h - 3.5); // the water's surface below the rim
  const wr = B.topR - ((B.topR - B.footR) * depth) / B.h - 0.3;
  const wy = top + depth;
  if (fill > 0.02) {
    // the water: dark, the sky in it, the moon's glint and the lantern's
    const water = new Path2D();
    water.ellipse(0, wy, wr, wr * TILT, 0, 0, Math.PI * 2);
    const wg = g.createLinearGradient(0, wy - wr * TILT, 0, wy + wr * TILT);
    wg.addColorStop(0, "#1c3240");
    wg.addColorStop(1, "#0b161e");
    g.fillStyle = wg;
    g.fill(water);
    g.save();
    g.clip(water);
    softEllipse(g, wr * 0.35, wy - wr * TILT * 0.25, wr * 0.32, wr * TILT * 0.28, "225,235,255", 0.75, "lighter");
    softEllipse(g, -wr * 0.55, wy, wr * 0.18, wr * TILT * 0.2, "255,190,120", 0.5, "lighter");
    g.strokeStyle = "rgba(200,215,235,0.25)";
    g.lineWidth = 0.18;
    for (let i = 1; i <= 2; i++) {
      g.beginPath();
      g.ellipse(wr * 0.35, wy - wr * TILT * 0.25, wr * 0.2 * i, wr * TILT * 0.18 * i, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
    // the wet wall above it, darker
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.beginPath();
    g.ellipse(0, wy, wr + 0.3, wr * TILT + 0.2, 0, Math.PI, Math.PI * 2);
    g.fill();
  } else {
    // empty: the bottom, a last film of water on it
    const floor = new Path2D();
    floor.ellipse(0, bot - 0.5, B.footR - 0.5, (B.footR - 0.5) * TILT, 0, 0, Math.PI * 2);
    g.fillStyle = "#1a1e22";
    g.fill(floor);
    softEllipse(g, B.footR * 0.2, bot - 0.6, B.footR * 0.5, B.footR * TILT * 0.5, "150,170,200", 0.2, "lighter");
  }
  g.restore();

  // the rolled rim, all round
  g.strokeStyle = "#9aa2ac";
  g.lineWidth = 0.9;
  g.beginPath();
  g.ellipse(0, top, B.topR - 0.2, (B.topR - 0.2) * TILT, 0, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "rgba(235,242,250,0.8)";
  g.lineWidth = 0.35;
  g.beginPath();
  g.ellipse(0, top - 0.25, B.topR - 0.2, (B.topR - 0.2) * TILT, 0, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  g.beginPath();
  g.ellipse(0, top - 0.1, B.topR - 0.2, (B.topR - 0.2) * TILT, 0, Math.PI * 0.05, Math.PI * 0.45);
  g.stroke();

  // the ears, riveted on, and the wire bail with its wooden grip
  for (const s of [-1, 1]) {
    const ex = s * (B.topR - 0.3);
    g.fillStyle = "#5a6068";
    g.beginPath();
    g.ellipse(ex, top + 2.2, 1.3, 1.8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(230,236,244,0.7)";
    g.beginPath();
    g.arc(ex + 0.3, top + 1.8, 0.35, 0, Math.PI * 2);
    g.fill();
  }
  const hy = top - B.topR * 0.95;
  g.strokeStyle = "#2a2e32";
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(-(B.topR - 0.3), top + 1.9);
  g.bezierCurveTo(-B.topR * 1.02, hy + 1, B.topR * 1.02, hy + 1, B.topR - 0.3, top + 1.9);
  g.stroke();
  g.strokeStyle = "rgba(200,214,232,0.6)";
  g.lineWidth = 0.22;
  g.beginPath();
  g.moveTo(-(B.topR - 0.5), top + 1.4);
  g.bezierCurveTo(-B.topR * 1.0, hy + 0.6, B.topR * 1.0, hy + 0.6, B.topR - 0.5, top + 1.4);
  g.stroke();
  const gripY = hy + 3.1;
  const grip = g.createLinearGradient(0, gripY - 1.1, 0, gripY + 1.1);
  grip.addColorStop(0, "#8a6a48");
  grip.addColorStop(0.5, "#5a4028");
  grip.addColorStop(1, "#2a1c10");
  g.fillStyle = grip;
  roundRect(g, -3.4, gripY - 1.05, 6.8, 2.1, 1);
  g.fill();
  return { canvas: c, ox: -x0 / (x1 - x0), oy: -y0 / (y1 - y0) };
}

// the bucket's shadow on the planks, thrown right by the lantern
function paintBucketShadow(px) {
  const B = BUCKET;
  const w = B.topR * 4.2;
  const h = B.footR * 1.4;
  const c = makeCanvas(w * px, h * px);
  const g = c.getContext("2d");
  g.scale(px, px);
  softEllipse(g, w * 0.44, h / 2, B.footR * 1.4, B.footR * TILT * 1.6, "0,0,0", 0.6);
  softEllipse(g, w * 0.62, h / 2, B.footR * 2.2, B.footR * TILT * 1.8, "0,0,0", 0.4);
  return c;
}

// a drop of water: bright where the lantern catches it
function paintDrop() {
  const w = 16;
  const h = 28;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const body = g.createRadialGradient(w * 0.4, h * 0.6, 0, w / 2, h * 0.62, w * 0.55);
  body.addColorStop(0, "rgba(230,240,255,0.95)");
  body.addColorStop(0.5, "rgba(140,180,210,0.7)");
  body.addColorStop(1, "rgba(80,120,150,0)");
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(w / 2, 1);
  g.bezierCurveTo(w * 0.85, h * 0.45, w * 0.95, h * 0.72, w / 2, h - 1);
  g.bezierCurveTo(w * 0.05, h * 0.72, w * 0.15, h * 0.45, w / 2, 1);
  g.fill();
  g.fillStyle = "rgba(255,236,200,0.9)";
  g.beginPath();
  g.ellipse(w * 0.38, h * 0.58, 1.5, 3, -0.3, 0, Math.PI * 2);
  g.fill();
  return c;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

