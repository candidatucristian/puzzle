import { makeCanvas, addCanvas, softEllipse, lcg } from "./garden.js";

/** The things on the bench that the puzzle is made of: the terracotta pot,
 *  the plant that grows from it, and the zinc bucket of water — painted in
 *  centimetres, lit by the lantern standing just to their left and by the
 *  moon high on the right.
 *
 *  The pot comes in two images, so the stems rise from the soil behind its
 *  rim. The stems are painted live onto a canvas as they grow (paintStems);
 *  the leaves are the level's own leaf image, placed by the scene. The
 *  bucket is painted once per water level, full to empty. */

export const RES = 2; // texture pixels per screen pixel

// the pot, in cm: its base on the bench, the soil just under the rim
export const POT = { h: 19, rimR: 11, bodyR: 10, footR: 7, band: 3, soilY: -17.3 };
// the bucket, in cm, about its middle (so it tips about its middle)
export const BUCKET = { h: 25, topR: 13.5, footR: 10.5 };
const TILT = 0.2; // how much of a round opening we see, looking down at it

const K = {
  potBack: "pp_pot_back",
  potFront: "pp_pot_front",
  wet: "pp_wet",
  bucket: "pp_bucket_",
  shadow: "pp_bucket_shadow",
  drop: "pp_drop",
};
export const WATER_LEVELS = 6; // full … empty

/** Paints the pot and the bucket for `cm` screen pixels per
 *  centimetre. */
export function paintPlantArt(textures, cm) {
  const px = cm * RES;
  const pot = paintPot(px);
  addCanvas(textures, K.potBack, pot.back);
  addCanvas(textures, K.potFront, pot.front);
  addCanvas(textures, K.wet, pot.wet);
  const buckets = [];
  let bucketOrigin = null;
  for (let i = 0; i < WATER_LEVELS; i++) {
    const b = paintBucket(px, 1 - i / (WATER_LEVELS - 1));
    addCanvas(textures, K.bucket + i, b.canvas);
    buckets.push(K.bucket + i);
    bucketOrigin = { ox: b.ox, oy: b.oy };
  }
  addCanvas(textures, K.shadow, paintBucketShadow(px));
  addCanvas(textures, K.drop, paintDrop());
  return {
    pot: { back: K.potBack, front: K.potFront, wet: K.wet, ox: pot.ox, oy: pot.oy, wetAt: pot.wetAt },
    buckets,
    bucketOrigin,
    shadow: K.shadow,
    drop: K.drop,
  };
}

export function releasePlantArt(textures) {
  const keys = [K.potBack, K.potFront, K.wet, K.shadow, K.drop];
  for (let i = 0; i < WATER_LEVELS; i++) keys.push(K.bucket + i);
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

// ── the pot ─────────────────────────────────────────────────────────────────

// A terracotta pot, lit from the lantern on its left: the clay warm and bright
// there, going to shadow round the right with a thread of moonlight on the
// far edge; salt bloom and a little moss low down, as old pots have.
function paintPot(px) {
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
  const rTop = P.rimR;
  const yTop = -P.h; // the rim's top edge, at its middle
  const yBand = yTop + P.band;
  // how the clay is lit across its width: the lantern low on the left
  const clay = (xl, xr) => {
    const gr = g.createLinearGradient(xl, 0, xr, 0);
    gr.addColorStop(0, "#a4502a");
    gr.addColorStop(0.12, "#e08a52");
    gr.addColorStop(0.3, "#c06a3a");
    gr.addColorStop(0.55, "#7a3a1c");
    gr.addColorStop(0.8, "#3e1a0c");
    gr.addColorStop(0.94, "#2c1208");
    gr.addColorStop(1, "#4e5462");
    return gr;
  };
  // the body: a tapered drum from under the band to the foot
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
  // top of the body in the band's shadow; salt bloom and moss at the foot
  const sh = g.createLinearGradient(0, yBand, 0, yBand + 3);
  sh.addColorStop(0, "rgba(20,8,4,0.55)");
  sh.addColorStop(1, "rgba(20,8,4,0)");
  g.fillStyle = sh;
  g.fillRect(x0, yBand, x1 - x0, 3);
  const rnd = lcg(404);
  for (let i = 0; i < 14; i++) {
    const x = (rnd() - 0.5) * P.bodyR * 1.8;
    const y = -1 - rnd() * 7;
    softEllipse(g, x, y, 1 + rnd() * 1.8, 0.5 + rnd() * 0.7, "215,205,185", 0.05 + rnd() * 0.05);
  }
  for (let i = 0; i < 6; i++) {
    const x = (rnd() - 0.2) * P.footR * 1.6;
    softEllipse(g, x, -1 - rnd() * 1.5, 2 + rnd() * 2, 0.8, "70,90,40", 0.25);
  }
  // the clay's grain
  for (let i = 0; i < 260; i++) {
    const x = (rnd() - 0.5) * P.bodyR * 2;
    const y = yBand + rnd() * (P.h - P.band);
    g.fillStyle = rnd() < 0.5 ? "rgba(255,200,160,0.08)" : "rgba(40,14,6,0.12)";
    g.fillRect(x, y, 0.25, 0.25);
  }
  g.restore();

  // the inside, seen over the rim: the far wall, then the soil
  const inner = new Path2D();
  inner.ellipse(0, yTop, rTop - 1.1, (rTop - 1.1) * TILT, 0, 0, Math.PI * 2);
  g.save();
  g.clip(inner);
  const wall = g.createLinearGradient(0, yTop - rTop * TILT, 0, P.soilY);
  wall.addColorStop(0, "#5a2c18");
  wall.addColorStop(1, "#2a120a");
  g.fillStyle = wall;
  g.fillRect(x0, y0, x1 - x0, 6);
  // the soil: crumbly and dark, a few grains of perlite, warm where the
  // lantern reaches over the rim
  const soil = new Path2D();
  soil.ellipse(0, P.soilY, rTop - 1.6, (rTop - 1.6) * TILT, 0, 0, Math.PI * 2);
  const sg = g.createLinearGradient(-rTop, 0, rTop, 0);
  sg.addColorStop(0, "#4a3020");
  sg.addColorStop(0.5, "#2c1c12");
  sg.addColorStop(1, "#1a100a");
  g.fillStyle = sg;
  g.fill(soil);
  g.save();
  g.clip(soil);
  for (let i = 0; i < 220; i++) {
    const x = (rnd() - 0.5) * rTop * 2;
    const y = P.soilY + (rnd() - 0.5) * rTop * TILT * 2;
    const r = 0.12 + rnd() * 0.3;
    g.fillStyle = rnd() < 0.08 ? "rgba(230,226,214,0.8)" : rnd() < 0.5 ? "rgba(110,76,50,0.6)" : "rgba(8,4,2,0.6)";
    g.fillRect(x, y, r, r * 0.6);
  }
  // the rim's shadow over the back of the soil
  softEllipse(g, 0, P.soilY - rTop * TILT * 0.7, rTop, rTop * TILT * 0.7, "0,0,0", 0.45);
  g.restore();
  g.restore();

  // the band round the rim, all the way round (its front half goes on the
  // front image too, over the stems)
  const band = (ctx, frontOnly) => {
    const p = new Path2D();
    if (frontOnly) {
      p.ellipse(0, yTop, rTop, rTop * TILT, 0, 0, Math.PI);
      p.lineTo(-rTop + 0.4, yBand);
      p.ellipse(0, yBand, rTop - 0.4, (rTop - 0.4) * TILT, 0, Math.PI, 0, true);
      p.closePath();
    } else {
      p.rect(-rTop, yTop, rTop * 2, P.band);
      p.ellipse(0, yBand, rTop - 0.4, (rTop - 0.4) * TILT, 0, 0, Math.PI);
    }
    const gr = ctx.createLinearGradient(-rTop, 0, rTop, 0);
    gr.addColorStop(0, "#b05a30");
    gr.addColorStop(0.1, "#ec9860");
    gr.addColorStop(0.3, "#c8713e");
    gr.addColorStop(0.56, "#843f1e");
    gr.addColorStop(0.82, "#43200e");
    gr.addColorStop(0.95, "#321509");
    gr.addColorStop(1, "#5e6676");
    ctx.fillStyle = gr;
    ctx.fill(p);
    // the lip catches the lantern along its top edge
    ctx.strokeStyle = "rgba(255,196,140,0.5)";
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.ellipse(0, yTop, rTop - 0.2, (rTop - 0.2) * TILT, 0, frontOnly ? 0.2 : Math.PI * 0.95, frontOnly ? Math.PI * 0.8 : Math.PI * 1.6);
    ctx.stroke();
  };
  band(g, false);
  // the rim's top surface ring (the back half shows behind the soil)
  g.strokeStyle = "#b86c42";
  g.lineWidth = 1.1;
  g.beginPath();
  g.ellipse(0, yTop, rTop - 0.55, (rTop - 0.55) * TILT, 0, Math.PI, Math.PI * 2);
  g.stroke();
  band(front.g, true);
  front.g.strokeStyle = "#c47a4c";
  front.g.lineWidth = 1.1;
  front.g.beginPath();
  front.g.ellipse(0, yTop, rTop - 0.55, (rTop - 0.55) * TILT, 0, 0, Math.PI);
  front.g.stroke();

  // the band throws a thin shadow on the body under it
  g.save();
  g.clip(body);
  g.fillStyle = "rgba(12,4,2,0.45)";
  g.beginPath();
  g.ellipse(0, yBand + 0.2, rTop - 0.3, (rTop - 0.3) * TILT + 0.6, 0, 0, Math.PI);
  g.fill();
  g.restore();

  // wet soil: darker, with the lantern shining in it
  const wg = wetC.g;
  const wet = new Path2D();
  wet.ellipse(0, P.soilY, rTop - 1.7, (rTop - 1.7) * TILT, 0, 0, Math.PI * 2);
  wg.save();
  wg.clip(wet);
  wg.fillStyle = "rgba(10,5,2,0.72)";
  wg.fill(wet);
  softEllipse(wg, -rTop * 0.35, P.soilY - 0.2, rTop * 0.35, rTop * TILT * 0.4, "255,200,140", 0.55, "lighter");
  softEllipse(wg, rTop * 0.4, P.soilY - 0.3, rTop * 0.25, rTop * TILT * 0.3, "170,190,220", 0.3, "lighter");
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
export function paintStems(ctx, px, origin, segs, grown, lantern) {
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
      const h = pts[k].w / 2;
      left.push([pts[k].x + nx * h, pts[k].y + ny * h, nx, ny]);
      right.push([pts[k].x - nx * h, pts[k].y - ny * h, nx, ny]);
    }
    const path = new Path2D();
    left.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y)));
    const tip = pts[pts.length - 1];
    path.arc(tip.x, tip.y, tip.w / 2, Math.atan2(left.at(-1)[3], left.at(-1)[2]), Math.atan2(-right.at(-1)[3], -right.at(-1)[2]));
    for (let k = right.length - 1; k >= 0; k--) path.lineTo(right[k][0], right[k][1]);
    path.closePath();
    // the bark: brown low down, greener up in the young growth
    const young = i >= 2 ? 1 : i === 1 ? 0.55 : 0.2;
    const base = [74 - young * 12, 58 + young * 8, 34 + young * 4];
    ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
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
      ctx.strokeStyle = `rgba(255,190,120,${0.55 * warm * Math.abs(facing)})`;
      ctx.lineWidth = p.w * 0.45;
      ctx.beginPath();
      ctx.moveTo((s0[k - 1][0] + pts[k - 1].x) / 2, (s0[k - 1][1] + pts[k - 1].y) / 2);
      ctx.lineTo((s0[k][0] + p.x) / 2, (s0[k][1] + p.y) / 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(10,8,4,0.45)";
      ctx.beginPath();
      ctx.moveTo((s1[k - 1][0] + pts[k - 1].x) / 2, (s1[k - 1][1] + pts[k - 1].y) / 2);
      ctx.lineTo((s1[k][0] + p.x) / 2, (s1[k][1] + p.y) / 2);
      ctx.stroke();
    }
    // the moon's thread down the right-hand edge
    ctx.strokeStyle = "rgba(170,190,225,0.4)";
    ctx.lineWidth = 0.18;
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

