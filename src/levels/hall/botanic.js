import { soft, lcg, polygon } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { botanicProp, paintPhotographicIvy } from "./botanicMaterials.js";

/** The ground floor is the botanist's: the hall dressed as the way into a
 *  house given over to plants. The same passage as before (hall.js) — its
 *  doors, gate, stairs, chandelier and clock where they were — but papered in
 *  green with a pattern of sprigs, pressed specimens framed where portraits
 *  hung, ivy come in at the cornice and down the walls, ferns hung in
 *  baskets, a glazed lantern in the ceiling with the moon in it, a moss-green
 *  runner, leaves fallen along the boards, and the furniture between the
 *  doors given over to plants in their pots. Painted in the hall's own
 *  projection: a place is (X across, Y down, z away), `L.P` puts it on the
 *  screen. */

const MOON = "150,178,232";
const WARM = "255,190,120";
const END = 4.7;
const GREENS = ["#263b2a", "#304532", "#3b4d35", "#22332a", "#42523b", "#2c4035"];

// how much of a sconce's light reaches a place on a wall, 0 to 1
function lit(L, side, Y, z) {
  let best = 0;
  for (const s of L.sconces) {
    if (s.dead) continue;
    const d = Math.hypot((z - s.z) * 2.2, (Y - (-L.H * 0.2)) / (L.H * 0.35)) + (s.side === side ? 0 : 1.6);
    best = Math.max(best, Math.max(0, 1 - d / 1.4));
  }
  return best;
}

// A small, leathery ivy leaf. The unequal lobes turn about a folded midrib;
// the petiole meets the notch, rather than the leaf floating beside its stem.
function ivyLeaf(ctx, x, y, size, squash, angle, fill, vein) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size * squash, size);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(0.14, -0.12, 0.3, -0.09, 0.43, -0.05);
  ctx.quadraticCurveTo(0.36, 0.14, 0.29, 0.24);
  ctx.quadraticCurveTo(0.48, 0.23, 0.67, 0.3);
  ctx.quadraticCurveTo(0.46, 0.43, 0.26, 0.5);
  ctx.bezierCurveTo(0.19, 0.67, 0.16, 0.93, 0.035, 1.07);
  ctx.bezierCurveTo(-0.05, 0.86, -0.22, 0.66, -0.25, 0.5);
  ctx.quadraticCurveTo(-0.48, 0.46, -0.61, 0.33);
  ctx.quadraticCurveTo(-0.42, 0.22, -0.28, 0.23);
  ctx.quadraticCurveTo(-0.38, 0.08, -0.4, -0.07);
  ctx.quadraticCurveTo(-0.16, -0.13, 0, 0);
  ctx.closePath();
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetX = size * 0.09;
  ctx.shadowOffsetY = size * 0.12;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  ctx.clip();
  const shade = ctx.createLinearGradient(-0.5, 0.2, 0.5, 0.5);
  shade.addColorStop(0, "rgba(5,12,8,0.35)");
  shade.addColorStop(0.42, "rgba(180,192,151,0.14)");
  shade.addColorStop(0.52, "rgba(200,207,171,0.2)");
  shade.addColorStop(0.57, "rgba(0,5,1,0.22)");
  shade.addColorStop(1, "rgba(0,5,2,0.52)");
  ctx.fillStyle = shade;
  ctx.fillRect(-1, -0.2, 2, 1.5);
  if (vein) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = 0.022;
    ctx.beginPath(); ctx.moveTo(0, 0.015); ctx.quadraticCurveTo(-0.03, 0.48, 0.035, 0.96);
    for (const d of [-1, 1]) {
      ctx.moveTo(0, 0.08); ctx.quadraticCurveTo(d * 0.15, 0.29, d * 0.5, 0.33);
      ctx.moveTo(0, 0.06); ctx.lineTo(d * 0.29, -0.015);
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(0, 0.27 + i * 0.15); ctx.quadraticCurveTo(d * 0.1, 0.4 + i * 0.12, d * (0.22 - i * 0.05), 0.47 + i * 0.12);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// the colour of a leaf at a place: one of the greens, warmed where a candle reaches it
function leafColour(rnd, warmth, moon = 0) {
  const base = GREENS[Math.floor(rnd() * GREENS.length)];
  const r = parseInt(base.slice(1, 3), 16), g = parseInt(base.slice(3, 5), 16), b = parseInt(base.slice(5, 7), 16);
  const k = warmth * 0.9;
  const mix = (c, w, m) => Math.round(Math.min(255, c + (w - c) * k * 0.45 + m * moon * 30));
  return `rgb(${mix(r, 150, 0.6)},${mix(g, 130, 1)},${mix(b, 70, 1.4)})`;
}

/** The paper on a wall: a green ground with a pattern of sprigs on it, in
 *  rows, faint — over the wall's own colour, under the picture rail. */
export function paintBotanicPaper(ctx, L, side, top, bottom) {
  const { P, u } = L;
  const X = side * L.wall;
  if (L.botanicMaterials) {
    paintProjectedMaterial(ctx, L.botanicMaterials.paper, (u, v) => P(X, top + (bottom - top) * v, 0.7 + (END - 0.7) * u), 0.94, 32, 3);
    return;
  }
  ctx.save();
  polygon(ctx, [P(X, top, 0.7), P(X, top, END), P(X, bottom, END), P(X, bottom, 0.7)]);
  ctx.clip();
  const rows = 6, rowH = (bottom - top) / rows;
  for (let r = 0; r < rows; r++) {
    for (let z = 0.74 + (r % 2) * 0.09; z < END; z += 0.18) {
      const Y = top + rowH * (r + 0.5);
      const at = (dy, dz) => P(X, Y + dy * rowH, z + dz);
      // a sprig: a curved stem and four small leaves off it
      const a = at(0.32, 0), b = at(-0.05, 0.012), c = at(-0.34, -0.006);
      ctx.strokeStyle = "rgba(168,206,160,0.07)";
      ctx.lineWidth = Math.max(0.5, (1.3 * u) / z);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(b.x, b.y, c.x, c.y); ctx.stroke();
      ctx.fillStyle = "rgba(160,200,150,0.07)";
      for (const [dy, dz] of [[0.16, 0.024], [0.04, -0.026], [-0.1, 0.03], [-0.22, -0.022]]) {
        const p = at(dy, dz);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, (4.2 * u) / z, (2.2 * u) / z, dz > 0 ? -0.5 : 0.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** A pressed specimen in a frame, where a portrait would hang: a sheet of
 *  herbarium paper, the plant laid out flat on it, its little label. `kind`
 *  0 is a fern's frond, 1 a flowering stem. */
export function paintSpecimen(ctx, L, side, z, kind) {
  const { P, H, u } = L;
  const X = side * L.wall;
  const y0 = -H * 0.49, y1 = -H * 0.31, w = 0.13;
  if (L.botanicMaterials) {
    paintProjectedMaterial(ctx, L.botanicMaterials.specimens[kind], (u, v) => P(X, y0 - H * 0.016 + (y1 - y0 + H * 0.032) * v, side < 0 ? z - 0.012 + (w + 0.024) * u : z + w + 0.012 - (w + 0.024) * u), 1, 8, 2);
    return;
  }
  const quad = (Ya, Yb, za, zb, fill) => { polygon(ctx, [P(X, Ya, za), P(X, Ya, zb), P(X, Yb, zb), P(X, Yb, za)]); ctx.fillStyle = fill; ctx.fill(); };
  const warmth = lit(L, side, (y0 + y1) / 2, z + w / 2);
  // the frame, a thin gilt slip, the sheet
  quad(y0 - H * 0.016, y1 + H * 0.016, z - 0.012, z + w + 0.012, "#3a2c16");
  quad(y0 - H * 0.006, y1 + H * 0.006, z - 0.004, z + w + 0.004, "#6a5428");
  const sheet = 0.32 + warmth * 0.4;
  quad(y0, y1, z, z + w, `rgb(${Math.round(150 * sheet + 40)},${Math.round(140 * sheet + 36)},${Math.round(110 * sheet + 28)})`);
  // the plant on it, pressed flat and gone brown-green
  const at = (fy, fz) => P(X, y1 - (y1 - y0) * fy, z + w * fz);
  const ink = `rgba(${Math.round(52 + warmth * 30)},${Math.round(70 + warmth * 26)},44,0.92)`;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(0.6, (1.4 * u) / z);
  const stem = [at(0.1, 0.5), at(0.5, 0.47), at(0.86, 0.53)];
  ctx.beginPath(); ctx.moveTo(stem[0].x, stem[0].y); ctx.quadraticCurveTo(stem[1].x, stem[1].y, stem[2].x, stem[2].y); ctx.stroke();
  if (kind === 0) {
    // a frond: leaflets in pairs, longest at the middle
    for (let i = 0; i < 9; i++) {
      const f = 0.16 + i * 0.08, reach = 0.36 * Math.sin(Math.PI * (0.15 + (i / 9) * 0.8));
      for (const d of [-1, 1]) {
        const a = at(f, 0.5), b = at(f + 0.035, 0.5 + d * reach), c = at(f - 0.012, 0.5 + d * reach * 0.55);
        polygon(ctx, [a, c, b, at(f + 0.03, 0.5 + d * reach * 0.45)]);
        ctx.fill();
      }
    }
  } else {
    // a flowering stem: leaves alternate up it, a flower and a bud at the top
    for (let i = 0; i < 4; i++) {
      const f = 0.22 + i * 0.14, d = i % 2 ? 1 : -1;
      const a = at(f, 0.5), b = at(f + 0.1, 0.5 + d * 0.32), c = at(f + 0.02, 0.5 + d * 0.2), e = at(f + 0.09, 0.5 + d * 0.12);
      polygon(ctx, [a, c, b, e]);
      ctx.fill();
    }
    const head = at(0.9, 0.52), r = (5.5 * u) / z;
    ctx.fillStyle = `rgba(${Math.round(120 + warmth * 50)},${Math.round(64 + warmth * 30)},70,0.9)`;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(head.x + Math.cos(a) * r * 0.5, head.y + Math.sin(a) * r * 0.8, r * 0.42, r * 0.62, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(200,170,80,0.85)";
    ctx.beginPath(); ctx.arc(head.x, head.y, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }
  // its label, bottom right, a line of brown ink across it
  const la = at(0.04, 0.62), lb = at(0.12, 0.94);
  quad(y1 - (y1 - y0) * 0.12, y1 - (y1 - y0) * 0.03, z + w * 0.6, z + w * 0.95, "rgba(220,206,170,0.55)");
  ctx.strokeStyle = "rgba(70,50,30,0.6)";
  ctx.lineWidth = Math.max(0.4, (0.8 * u) / z);
  ctx.beginPath(); ctx.moveTo(la.x, (la.y + lb.y) / 2); ctx.lineTo(lb.x, (la.y + lb.y) / 2); ctx.stroke();
  if (warmth > 0.05) soft(ctx, at(0.5, 0.5).x, at(0.5, 0.5).y, (40 * u) / z, (60 * u) / z, WARM, 0.08 * warmth, "lighter");
}

/** A glazed lantern let into the ceiling down the middle of the hall: iron
 *  glazing bars, the night through the glass, the moon's light in it, and the
 *  dark of the ivy grown over it outside. */
export function paintSkylight(ctx, L) {
  const { P, wall, ceil, u, H } = L;
  const x0 = -wall * 0.4, x1 = wall * 0.4, z0 = 2.35, z1 = 4.3;
  const glass = [P(x0, ceil, z0), P(x1, ceil, z0), P(x1, ceil, z1), P(x0, ceil, z1)];
  // its deep frame, then the glass
  polygon(ctx, [P(x0 - wall * 0.04, ceil, z0 - 0.05), P(x1 + wall * 0.04, ceil, z0 - 0.05), P(x1 + wall * 0.04, ceil, z1 + 0.05), P(x0 - wall * 0.04, ceil, z1 + 0.05)]);
  ctx.fillStyle = "#14110d";
  ctx.fill();
  polygon(ctx, glass);
  const g = ctx.createLinearGradient(0, glass[0].y, 0, glass[2].y);
  g.addColorStop(0, "#1c2a44");
  g.addColorStop(1, "#0d1424");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the moon somewhere over it, and stars in the clear panes
  if (L.botanicMaterials) paintProjectedMaterial(ctx, L.botanicMaterials.glass, (u, v) => P(x0 + (x1 - x0) * u, ceil, z0 + (z1 - z0) * v), 0.75, 6, 8);
  const m = P(wall * 0.12, ceil, 3.4);
  soft(ctx, m.x, m.y, (260 * u) / 3.4, (90 * u) / 3.4, MOON, 0.55, "lighter");
  const rnd = lcg(808);
  for (let i = 0; i < 40; i++) {
    const p = P(x0 + rnd() * (x1 - x0), ceil, z0 + rnd() * (z1 - z0));
    ctx.fillStyle = `rgba(220,230,255,${(0.2 + rnd() * 0.5).toFixed(2)})`;
    ctx.fillRect(p.x, p.y, 1.2, 1.2);
  }
  // the ivy over it outside: dark leaves pressed to the glass at the edges
  for (let i = 0; !L.botanicMaterials && i < 70; i++) {
    const edge = rnd() < 0.5 ? x0 + rnd() * wall * 0.16 : x1 - rnd() * wall * 0.16;
    const z = z0 + rnd() * (z1 - z0);
    const p = P(edge, ceil, z);
    ivyLeaf(ctx, p.x, p.y, (8 + rnd() * 7) * u / z, 0.7 + rnd() * 0.3, rnd() * Math.PI * 2, "rgba(6,10,8,0.85)");
  }
  if (L.botanicMaterials) for (const edge of [x0, x1 - wall * 0.09]) {
    paintProjectedMaterial(ctx, L.botanicMaterials.ivy, (u, v) => P(edge + wall * 0.09 * u, ceil, z0 + (z1 - z0) * v), 0.85, 3, 8);
  }
  ctx.restore();
  // the glazing bars: along the hall, and across it
  ctx.strokeStyle = "#0a0907";
  for (let i = 0; i <= 4; i++) {
    const X = x0 + ((x1 - x0) * i) / 4;
    const a = P(X, ceil, z0), b = P(X, ceil, z1);
    ctx.lineWidth = Math.max(1, (5 * u) / z0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 5) {
    const a = P(x0, ceil, z), b = P(x1, ceil, z);
    ctx.lineWidth = Math.max(1, (5 * u) / z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // the moonlight it lets down, faint on the runner beneath it
  const under = P(0, L.floor, 3.3);
  soft(ctx, under.x, under.y, (L.wall * 0.5) / 3.3, (H * 0.08) / 3.3, MOON, 0.1, "lighter");
}

/** The runner's colours, for the botanist's hall: moss, a dull gold border. */
export const RUNNER = { edge: "#122417", border: "#5a5434", field: "#1c3322", motif: "rgba(150,150,90,0.38)" };

/** Leaves come in and fallen along the boards, most of them by the walls. */
export function paintFallenLeaves(ctx, L) {
  const { P, wall, floor, u } = L;
  const rnd = lcg(2024);
  const fallen = [[74, 58, 28], [94, 74, 32], [58, 58, 28], [106, 78, 34], [46, 58, 30], [84, 64, 28]];
  for (let i = 0; i < 70; i++) {
    const nearWall = rnd() < 0.75;
    const side = rnd() < 0.5 ? -1 : 1;
    const X = nearWall ? side * wall * (0.62 + rnd() * 0.34) : (rnd() * 2 - 1) * wall * 0.5;
    const z = 0.8 + rnd() * (END - 1.2);
    const p = P(X, floor, z), s = (7 + rnd() * 6) * u / z;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.38);
    ctx.rotate(rnd() * Math.PI * 2);
    if (L.botanicMaterials) {
      const image = L.botanicMaterials.leaves[i % 3], h = s * 2.2, w = h * image.width / image.height;
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      ctx.restore();
      continue;
    }
    const tone = tones(fallen[Math.floor(rnd() * fallen.length)], 0.5, 0.05);
    blade(ctx, -s, 0, s, -s * 0.14, s * (0.25 + rnd() * 0.2), (rnd() - 0.5) * 0.15, tone);
    ctx.strokeStyle = tone.dark; ctx.lineWidth = Math.max(0.25, s * 0.055);
    ctx.beginPath(); ctx.moveTo(-s * 1.3, s * 0.06); ctx.lineTo(-s * 0.65, 0); ctx.stroke();
    ctx.restore();
  }
}

/** Thin ivy runners follow the cornice. A few young shoots trail down,
 *  with exposed stem between the leaves and shorter growth above doors. */
export function paintIvy(ctx, L) {
  if (paintPhotographicIvy(ctx, L)) return;
  const { P, wall, ceil, H, u, doorTop } = L;
  const rnd = lcg(5150);
  const overDoor = (side, z) => L.doors.some((d) => d.side === side && z > d.z - 0.06 && z < d.z + 0.56);
  for (const side of [-1, 1]) {
    const X = side * wall;
    const cornice = [];
    for (let z = 0.78; z < END; z += 0.035) cornice.push(P(X, ceil + H * (0.018 + Math.sin(z * 14 + side) * 0.006), z));
    ctx.lineWidth = Math.max(0.5, u * 0.8);
    ctx.strokeStyle = "#333829";
    ctx.beginPath();
    cornice.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.stroke();
    for (let z = 0.78; z < END - 0.15; z += 0.039 + rnd() * 0.022) {
      if (rnd() < 0.17) continue;
      for (let k = 0; k < 1 + (rnd() > 0.62); k++) {
        const Y = ceil + H * (0.014 + rnd() * 0.024);
        const p = P(X, Y, z + rnd() * 0.02);
        const warmth = lit(L, side, Y, z);
        ivyLeaf(ctx, p.x, p.y, (9 + rnd() * 6) * u / z, 0.48 + rnd() * 0.42, (rnd() - 0.5) * 2.6, leafColour(rnd, warmth, z > 3.6 ? 0.3 : 0),
          z < 2.6 ? "rgba(164,174,135,0.3)" : null);
      }
    }
    const starts = side < 0 ? [0.94, 1.84, 2.14, 2.78, 3.72, 4.12] : [1.08, 1.91, 2.7, 3.19, 3.87];
    for (const z0 of starts) {
      const above = overDoor(side, z0);
      const reach = H * (0.15 + rnd() * 0.22);
      const bottom = Math.min(ceil + reach, above ? doorTop - H * 0.13 : ceil + H * 0.37);
      const phase = rnd() * 6, bend = (rnd() - 0.5) * 0.11;
      const nodes = 10 + Math.floor(rnd() * 8), pts = [];
      for (let i = 0; i <= nodes; i++) {
        const t = i / nodes, Y = ceil + H * 0.02 + (bottom - ceil - H * 0.02) * t;
        const z = z0 + Math.sin(t * 4 + phase) * 0.012 + bend * t * t;
        pts.push({ ...P(X, Y, z), Y, z, t });
      }
      ctx.strokeStyle = "#353b28";
      ctx.lineWidth = Math.max(0.35, (0.95 * u) / z0);
      ctx.beginPath();
      pts.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      ctx.stroke();
      pts.slice(1, -1).forEach((p, i) => {
        if (rnd() < 0.15) return;
        const direction = (i % 2 ? 1 : -1) * side;
        const size = (8.5 + rnd() * 5) * u / p.z * (1 - p.t * 0.46);
        const lx = p.x + direction * size * (0.35 + rnd() * 0.3), ly = p.y + size * 0.16;
        ctx.strokeStyle = "#4a5033";
        ctx.lineWidth = Math.max(0.25, size * 0.07);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(lx, p.y - size * 0.08, lx, ly); ctx.stroke();
        ivyLeaf(ctx, lx, ly, size, 0.5 + rnd() * 0.42, -direction * (0.45 + rnd() * 0.8), leafColour(rnd, lit(L, side, p.Y, p.z), 0.1),
          p.z < 2.6 ? "rgba(171,181,139,0.3)" : null);
      });
    }
  }
}

// ── leaves that look like leaves ─────────────────────────────────────────────
// A plant here is built leaf by leaf, from the back to the front: each blade
// tapers to its tip, bends along its length, is lit along one edge and in
// shadow along the other, and has its midrib; the leaves at the back are in
// the plant's own shade, the front ones catch the light. The light comes from
// above and a little in front, as the sconces and the moon give it.

// a green, as [r, g, b]
const PALM = [57, 83, 47], ASPIDISTRA = [43, 71, 47], FERN = [67, 92, 48];

// the three tones of a leaf, for how far forward in the plant it is (0 the back, 1 the front)
function tones(rgb, depth, warmth = 0) {
  const k = 0.48 + depth * 0.6;
  const tint = (c, i, f) => Math.round(Math.min(255, c * f * k + warmth * [30, 23, 10][i]));
  const at = (f) => `rgb(${rgb.map((c, i) => tint(c, i, f)).join(",")})`;
  return { dark: at(0.52), mid: at(0.98), light: at(1.35), shade: at, rib: `rgba(${rgb.map((c, i) => tint(c, i, 1.65)).join(",")},0.28)` };
}

/** A blade from its base (x0, y0) to its tip (x1, y1), `w` at its widest,
 *  bowed sideways by `bend` (a fraction of its length; the sign says which way). */
function blade(ctx, x0, y0, x1, y1, w, bend, tone, rib = true) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const rnd = lcg(Math.round(Math.abs(x0 * 77 + y0 * 31 + x1 * 13 + y1 * 97) * 100));
  const phase = rnd() * 6.28, twist = (rnd() - 0.5) * 0.7;
  const broad = w > 4;
  const widthAt = t => w * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.82);
  const centre = t => 2 * bend * len * t * (1 - t) + Math.sin(t * Math.PI) * Math.sin(t * 4 + phase) * w * 0.14;
  const point = (t, side) => ({
    x: t * len,
    y: centre(t) + side * widthAt(t) * (1 + side * twist * t + Math.sin(t * (broad ? 31 : 65) + phase + side) * (broad ? 0.045 : 0.035)),
  });
  ctx.save();
  ctx.translate(x0, y0); ctx.rotate(Math.atan2(dy, dx));
  const steps = broad ? 26 : 12;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 1; i <= steps; i++) { const p = point(i / steps, -1); ctx.lineTo(p.x, p.y); }
  for (let i = steps - 1; i >= 0; i--) { const p = point(i / steps, 1); ctx.lineTo(p.x, p.y); }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, tone.dark); g.addColorStop(0.25, tone.mid);
  g.addColorStop(0.63, tone.light); g.addColorStop(1, tone.mid);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  if (broad) {
    // Shade a curved ribbon across its surface, following the midrib.
    // A single flat gradient would leave a bright straight stripe on a bent leaf.
    const surface = [0.67, 0.96, 1.15, 1.27, 0.74, 0.86, 0.98, 0.7];
    for (let row = 0; row < 42; row++) {
      const t0 = Math.max(0, row / 42 - 0.003), t1 = Math.min(1, (row + 1) / 42 + 0.003);
      const shade = 0.86 + Math.sin((row + 0.5) / 42 * Math.PI) * 0.14;
      const edgeA = point((t0 + t1) / 2, -1), edgeB = point((t0 + t1) / 2, 1);
      const light = ctx.createLinearGradient(edgeA.x, edgeA.y, edgeB.x, edgeB.y);
      surface.forEach((value, i) => light.addColorStop(i / (surface.length - 1), tone.shade(value * shade)));
      polygon(ctx, [point(t0, -1.01), point(t1, -1.01), point(t1, 1.01), point(t0, 1.01)]);
      ctx.fillStyle = light; ctx.fill();
    }
    // Small patches of wax and chlorophyll break up the otherwise smooth
    // surface. Their scale stays in the leaf, so a resize does not shimmer.
    const lengthShade = ctx.createLinearGradient(0, 0, len, 0);
    lengthShade.addColorStop(0, "rgba(2,9,4,0.4)");
    lengthShade.addColorStop(0.35, "rgba(135,146,102,0.08)");
    lengthShade.addColorStop(0.78, "rgba(0,0,0,0)");
    lengthShade.addColorStop(1, "rgba(37,26,8,0.36)");
    ctx.fillStyle = lengthShade;
    ctx.fillRect(0, -len, len, len * 2);
    for (let i = 0; i < 70; i++) {
      const t = 0.05 + rnd() * 0.9, p = point(t, (rnd() * 2 - 1) * 0.95);
      ctx.fillStyle = i % 3 ? "rgba(179,186,136,0.055)" : "rgba(4,12,7,0.13)";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.3 + rnd() * 1.1, 0.15 + rnd() * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = tone.rib; ctx.lineWidth = 0.23;
    for (let i = 1; i < 12; i++) {
      const t = 0.08 + i * 0.065;
      for (const side of [-1, 1]) {
        const end = point(Math.min(0.96, t + 0.14), side * 0.91);
        ctx.beginPath(); ctx.moveTo(t * len, centre(t));
        ctx.quadraticCurveTo((t + 0.04) * len, centre(t) + side * widthAt(t) * 0.65, end.x, end.y); ctx.stroke();
      }
    }
  }
  if (rib) {
    ctx.strokeStyle = tone.rib;
    ctx.lineWidth = Math.max(0.16, Math.min(0.65, w * 0.035));
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let i = 1; i < 20; i++) ctx.lineTo(i / 20 * len, centre(i / 20));
    ctx.stroke();
  }
  ctx.restore();
}

// a point along a quadratic curve, and the way it is going there
function along(x0, y0, cx, cy, x1, y1, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1, y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    dx: 2 * mt * (cx - x0) + 2 * t * (x1 - cx), dy: 2 * mt * (cy - y0) + 2 * t * (y1 - cy),
  };
}

// a stem, round: dark under, a line of light along its top
function stem(ctx, x0, y0, cx, cy, x1, y1, width, dark, light) {
  ctx.lineCap = "round";
  for (let i = 0; i < 10; i++) {
    const a = along(x0, y0, cx, cy, x1, y1, i / 10), b = along(x0, y0, cx, cy, x1, y1, (i + 1) / 10);
    ctx.strokeStyle = dark; ctx.lineWidth = width * (1 - i * 0.085);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = light; ctx.lineWidth = width * 0.24 * (1 - i * 0.085);
    ctx.beginPath(); ctx.moveTo(a.x - width * 0.1, a.y - width * 0.12); ctx.lineTo(b.x - width * 0.1, b.y - width * 0.12); ctx.stroke();
  }
  ctx.lineCap = "butt";
}

/** A fern's frond from its base along a curve: its stalk, and its leaflets in
 *  pairs, each a little blade angled forward, longest a third of the way out
 *  and small at the tip. */
function frond(ctx, x0, y0, cx, cy, x1, y1, scale, depth, warmth = 0) {
  const rnd = lcg(Math.round(Math.abs(x0 * 13 + x1 * 71 + y1 * 23) * 100));
  const tone = tones(FERN, depth, warmth), turn = rnd() * 5;
  stem(ctx, x0, y0, cx, cy, x1, y1, 0.95 * scale, tone.dark, tone.mid);
  const n = Math.min(29, Math.max(17, Math.round(Math.hypot(cx - x0, cy - y0, x1 - cx, y1 - cy) / (4.3 * scale))));
  for (let i = 2; i < n; i++) {
    for (const d of [-1, 1]) {
      const t = (i + (d > 0 ? 0.27 : 0) + rnd() * 0.13) / n;
      const p = along(x0, y0, cx, cy, x1, y1, t);
      const len = Math.hypot(p.dx, p.dy) || 1, tx = p.dx / len, ty = p.dy / len;
      const size = (17 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85) + 0.7) * scale * (0.82 + rnd() * 0.28);
      const ox = -ty * d, oy = tx * d;
      const foreshorten = 0.65 + 0.3 * Math.sin(turn + t * 3 + d * 0.6);
      const ex = p.x + (ox * foreshorten + tx * 0.44) * size;
      const ey = p.y + (oy * foreshorten + ty * 0.44) * size + size * (0.08 + t * 0.12);
      const leafTone = tones(FERN, depth * (0.74 + rnd() * 0.3) + (d > 0 ? 0.08 : 0), warmth);
      blade(ctx, p.x, p.y, ex, ey, size * (0.075 + rnd() * 0.025), d * (0.06 + rnd() * 0.1), leafTone, false);
    }
  }
}

// Fronds grow around a crown in three dimensions: the far ones stand up,
// the near ones bow toward us. Unequal lengths leave air inside the plant.
function fernCrown(seed, hanging = false) {
  const rnd = lcg(seed);
  return Array.from({ length: 23 }, (_, i) => {
    const angle = i * 2.39996 + rnd() * 0.25, depth = (Math.sin(angle) + 1) / 2;
    const length = 72 + rnd() * 48;
    const x = Math.cos(angle) * length * (0.65 + rnd() * 0.22);
    return {
      x0: (rnd() - 0.5) * 12, y0: (rnd() - 0.5) * 4,
      cx: x * (0.58 + rnd() * 0.16), cy: -length * (0.5 + rnd() * 0.26),
      x, y: length * (-0.4 + depth * (hanging ? 1.14 : 0.83)),
      depth, warmth: 0.08 + rnd() * 0.13,
    };
  }).sort((a, b) => a.depth - b.depth);
}

function paintFernFronds(ctx, fronds) {
  for (const f of fronds) frond(ctx, f.x0, f.y0, f.cx, f.cy, f.x, f.y, 1, 0.2 + f.depth * 0.8, f.warmth);
}

/** Ferns in aged wire baskets, hung on fine chains between the doors. */
export function paintBaskets(ctx, L) {
  const { P, wall, ceil, H, u } = L;
  const rnd = lcg(311);
  for (const [side, z] of [[-1, 2.42], [1, 2.55], [-1, 3.48], [1, 3.62]]) {
    const X = side * wall * 0.62;
    const hook = P(X, ceil, z), bowl = P(X, ceil + H * (side < 0 ? 0.25 : 0.27), z), k = u / z * 0.78;
    ctx.strokeStyle = "rgba(94,85,64,0.6)";
    ctx.lineWidth = Math.max(0.35, 0.8 * k);
    for (const d of [-1, 0, 1]) {
      ctx.beginPath(); ctx.moveTo(hook.x, hook.y); ctx.lineTo(bowl.x + d * 23 * k, bowl.y); ctx.stroke();
      // A few catches of light pick out the separate iron links.
      for (let t = 0.08; t < 1; t += 0.045) {
        const x = hook.x + (bowl.x + d * 23 * k - hook.x) * t, y = hook.y + (bowl.y - hook.y) * t;
        ctx.fillStyle = "rgba(161,143,109,0.2)"; ctx.fillRect(x, y, Math.max(0.5, k), 1.3 * k);
      }
    }
    ctx.save(); ctx.translate(bowl.x, bowl.y); ctx.scale(k, k);
    if (L.botanicMaterials) {
      const image = L.botanicMaterials.hanging, height = 150, width = height * image.width / image.height;
      // The photographed basket's rim is 53% down its cropped height.
      ctx.drawImage(image, -width / 2, -height * 0.53, width, height);
      ctx.restore();
      continue;
    }
    const fronds = fernCrown(Math.round(z * 100 + side * 11), true);
    paintFernFronds(ctx, fronds.filter(f => f.depth < 0.45));
    const mg = ctx.createLinearGradient(-25, -5, 25, 20);
    mg.addColorStop(0, "#161c12"); mg.addColorStop(0.35, "#42442c"); mg.addColorStop(1, "#10150d");
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.moveTo(-25, 0); ctx.bezierCurveTo(-23, 13, -14, 23, 0, 23); ctx.bezierCurveTo(14, 23, 23, 13, 25, 0); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 210; i++) {
      const x = (rnd() - 0.5) * 50, y = rnd() * 24;
      ctx.strokeStyle = i % 3 ? "rgba(108,103,65,0.3)" : "rgba(11,18,8,0.5)";
      ctx.lineWidth = 0.4 + rnd() * 0.7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 6, y + rnd() * 4); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#55513d"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(0, 0, 25, 5, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 11, 0); ctx.quadraticCurveTo(i * 9, 15, i * 2, 22); ctx.stroke(); }
    for (const y of [9, 16]) { ctx.beginPath(); ctx.ellipse(0, y, 25 - y * 0.4, 3.2, 0, 0, Math.PI); ctx.stroke(); }
    paintFernFronds(ctx, fronds.filter(f => f.depth >= 0.45));
    ctx.restore();
  }
}

// ── the plants that stand between the doors, in a stand's own units (a pixel
// at the picture, the foot at 0,0, the wall to the left) ──

// a clay pot: tapered, rolled at the rim, lit down one side, the soil in it
function clayPot(ctx, top, bottom, rTop, rBottom, glaze) {
  const h = bottom - top, rim = top - h * 0.08, dip = rTop * 0.2;
  const rnd = lcg(Math.round(h * 31 + rTop * 7));
  soft(ctx, 2, bottom + 1, rBottom * 1.7, 4.5, "0,0,0", 0.65);
  const g = ctx.createLinearGradient(-rTop, top, rTop, top + h * 0.2);
  if (glaze) {
    g.addColorStop(0, "#172421"); g.addColorStop(0.28, "#3c5145"); g.addColorStop(0.4, "#59685a"); g.addColorStop(0.58, "#34483b"); g.addColorStop(1, "#12201b");
  } else {
    g.addColorStop(0, "#473126"); g.addColorStop(0.23, "#886047"); g.addColorStop(0.42, "#a47b59"); g.addColorStop(0.7, "#77513b"); g.addColorStop(1, "#38281e");
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-rTop, rim); ctx.lineTo(rTop, rim);
  ctx.bezierCurveTo(rTop - 1, top + h * 0.3, rBottom + 2, bottom - 3, rBottom, bottom);
  ctx.quadraticCurveTo(0, bottom + rBottom * 0.14, -rBottom, bottom);
  ctx.bezierCurveTo(-rBottom - 2, bottom - 3, -rTop + 1, top + h * 0.3, -rTop, rim);
  ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.clip();
  for (let i = 0; i < 420; i++) {
    const x = (rnd() - 0.5) * rTop * 2, y = rim + rnd() * (h + 10);
    ctx.fillStyle = i % 3 ? "rgba(208,187,143,0.075)" : "rgba(16,20,12,0.13)";
    ctx.beginPath(); ctx.ellipse(x, y, 0.2 + rnd() * (glaze ? 0.55 : 1.1), 0.2 + rnd() * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let y = top + 5; y < bottom; y += 2.1 + rnd() * 2.3) {
    ctx.strokeStyle = "rgba(36,30,21,0.12)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-rTop, y); ctx.quadraticCurveTo(0, y + dip * 1.7, rTop, y + 0.4); ctx.stroke();
  }
  const dirt = ctx.createLinearGradient(0, rim, 0, bottom);
  dirt.addColorStop(0, "rgba(10,21,10,0.26)"); dirt.addColorStop(0.25, "rgba(0,0,0,0)"); dirt.addColorStop(0.82, "rgba(13,18,10,0.05)"); dirt.addColorStop(1, "rgba(12,17,10,0.38)");
  ctx.fillStyle = dirt; ctx.fillRect(-rTop, rim, rTop * 2, h + 14);
  ctx.restore();
  // The rolled lip has an elliptical upper surface and a shadowed underside.
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, rim + 2, rTop + 2, dip + 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = glaze ? "#6c7660" : "#a17a59";
  ctx.beginPath(); ctx.ellipse(0, rim, rTop + 2, dip, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#211c13";
  ctx.beginPath(); ctx.ellipse(0, rim - 0.15, rTop - 1.7, dip * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 45; i++) {
    const x = (rnd() - 0.5) * rTop * 2, y = rim + (rnd() - 0.5) * dip * 1.5;
    ctx.fillStyle = i % 5 ? "#3d3724" : "#8b8060";
    ctx.beginPath(); ctx.ellipse(x, y, 0.35 + rnd() * 0.7, 0.2 + rnd() * 0.3, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = glaze ? "rgba(166,178,150,0.35)" : "rgba(208,176,125,0.35)"; ctx.lineWidth = 0.65;
  ctx.beginPath(); ctx.ellipse(-0.3, rim, rTop + 1, dip, 0, Math.PI * 0.08, Math.PI * 0.9); ctx.stroke();
}

/** A Boston fern spilling over the rim of its pot, on the little table. */
export function paintTableFern(ctx, materials = null) {
  if (materials) { botanicProp(ctx, materials.fern, 0, -128, 130); return; }
  const top = -170;
  const fronds = fernCrown(91);
  ctx.save(); ctx.translate(0, top);
  paintFernFronds(ctx, fronds.filter(f => f.depth < 0.46));
  ctx.restore();
  clayPot(ctx, top + 6, -128, 24, 17, false);
  ctx.save(); ctx.translate(0, top);
  paintFernFronds(ctx, fronds.filter(f => f.depth >= 0.46));
  ctx.restore();
}

/** A kentia palm in a glazed pot: tall stems arching over, the leaflets
 *  hanging from them in two rows. */
export function paintPalm(ctx, materials = null) {
  if (materials) { botanicProp(ctx, materials.palm, 0, 0, 255); return; }
  const rnd = lcg(73);
  // a young one: kept small enough to stand clear of the doors either side
  ctx.save();
  ctx.scale(0.56, 0.56);
  soft(ctx, 0, 2, 54, 9, "0,0,0", 0.7);
  const base = -97; // the soil in the pot, where the fronds come up
  // the fronds: furthest back first, those leaning toward us last
  const fronds = [
    [-98, -294, 0.15], [38, -335, 0.25], [-26, -357, 0.36], [120, -283, 0.42],
    [-154, -232, 0.48], [158, -208, 0.6], [-132, -164, 0.74], [101, -167, 0.8],
    [-51, -236, 0.88], [47, -216, 0.98],
  ].map(([x, y, depth]) => ({ x, y, depth, baseX: (rnd() - 0.5) * 17, turn: rnd() * 5 }));
  const draw = (f) => {
    const cx = f.x * 0.42, cy = f.y - 95 + f.depth * 24;
    const tone = tones(PALM, 0.2 + f.depth * 0.66, 0.12);
    stem(ctx, f.baseX, base, cx, cy, f.x, f.y, 2.5, tone.dark, tone.mid);
    for (let j = 0; j < 22; j++) {
      for (const d of [-1, 1]) {
        const t = 0.33 + ((j + (d > 0 ? 0.37 : 0) + rnd() * 0.18) / 23) * 0.67;
        const p = along(f.baseX, base, cx, cy, f.x, f.y, t);
        const len = Math.hypot(p.dx, p.dy) || 1, ux = p.dx / len, uy = p.dy / len;
        const taper = Math.pow(Math.sin(Math.PI * (t - 0.14) / 0.86), 0.8);
        const size = (4 + 72 * taper) * (0.76 + rnd() * 0.31);
        const spread = (0.48 + Math.sin(t * 4 + f.turn + d) * 0.2) * d;
        const ex = p.x + (-uy * spread + ux * 0.28) * size;
        const ey = p.y + (ux * spread + uy * 0.28) * size + size * (0.45 + f.depth * 0.25);
        const leafTone = tones(PALM, 0.2 + f.depth * 0.6 + rnd() * 0.14, 0.12);
        blade(ctx, p.x, p.y, ex, ey, size * (0.018 + rnd() * 0.015), d * (0.09 + rnd() * 0.11), leafTone, false);
      }
    }
  };
  for (const f of fronds.slice(0, 6)) draw(f);
  clayPot(ctx, -88, 0, 32, 24, true);
  for (const f of fronds.slice(6)) draw(f);
  ctx.restore();
}

/** An aspidistra in a terracotta urn: broad leaves on their own stalks, some
 *  standing, some bowed over. */
export function paintUrnPlant(ctx, materials = null) {
  if (materials) { botanicProp(ctx, materials.flowers, 0, 0, 190); return; }
  const rnd = lcg(47);
  const top = -101; // the soil in the urn
  const leaves = [
    [-32, -300, 11, 0.18, 0.17], [38, -317, 12, -0.18, 0.22], [-64, -267, 14, 0.22, 0.3],
    [75, -272, 14, -0.25, 0.4], [2, -285, 16, -0.14, 0.5], [-91, -206, 15, 0.35, 0.56],
    [94, -222, 17, -0.32, 0.65], [-44, -239, 16, 0.22, 0.73], [48, -239, 16, -0.2, 0.8],
    [-84, -158, 15, 0.43, 0.88], [83, -172, 16, -0.4, 0.93], [19, -184, 12, 0.26, 1],
  ].map(([x, y, w, bow, depth]) => ({ x, y, w, bow, depth, baseX: (rnd() - 0.5) * 16 }));
  const draw = (f) => {
    const tone = tones(ASPIDISTRA, 0.3 + f.depth * 0.65, 0.12);
    const sx = f.baseX + f.x * 0.21, sy = top - 29 - (1 - f.depth) * 39;
    stem(ctx, f.baseX, top, sx * 0.45, (top + sy) / 2, sx, sy, 1.6, tone.dark, tone.mid);
    blade(ctx, sx, sy, f.x, f.y, f.w, f.bow, tone);
  };
  for (const f of leaves.slice(0, 7)) draw(f);
  clayPot(ctx, -92, 0, 26, 15, false);
  for (const f of leaves.slice(7)) draw(f);
}

/** On the trunk: a stack of clay pots, and a watering can. */
export function paintPotsAndCan(ctx, materials = null) {
  if (materials) { botanicProp(ctx, materials.tools, 10, -70, 85); return; }
  // the pots, one inside the next, a little askew
  for (const [i, x] of [[0, -26], [1, -24], [2, -27]].map(([n, x]) => [n, x])) {
    const y = -70 - i * 11;
    ctx.save(); ctx.translate(x, y); ctx.rotate((i - 1) * 0.035);
    clayPot(ctx, -21, 0, 16, 12, false);
    ctx.restore();
  }
  // the can: galvanised, its rose on a long spout, a handle over the top
  const cg = ctx.createLinearGradient(8, 0, 44, 0);
  cg.addColorStop(0, "#3a3e40"); cg.addColorStop(0.45, "#8a9092"); cg.addColorStop(1, "#2a2e30");
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.roundRect(10, -112, 34, 42, 4); ctx.fill();
  ctx.strokeStyle = "#5a6062"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(42, -88); ctx.lineTo(72, -120); ctx.stroke();
  ctx.fillStyle = "#6a7072";
  ctx.beginPath(); ctx.ellipse(74, -122, 5, 7, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#4a5052"; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(14, -112); ctx.quadraticCurveTo(27, -134, 40, -112); ctx.stroke();
}

/** On the coat stand: a gardener's straw hat and canvas apron, not a coat. */
export function paintGardenerOnStand(ctx) {
  // the apron: canvas gone grey-brown, its bib, a pocket, the tie hanging
  ctx.fillStyle = "#4a4434";
  ctx.beginPath();
  ctx.moveTo(-20, -316); ctx.lineTo(-6, -316); ctx.lineTo(-4, -230); ctx.lineTo(4, -120); ctx.lineTo(-40, -110); ctx.lineTo(-36, -232); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-32, -200, 26, 30);
  ctx.strokeStyle = "#3a3426"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-36, -232); ctx.quadraticCurveTo(-46, -200, -42, -170); ctx.stroke();
  // the hat: a wide straw brim, its crown, a dark band
  ctx.fillStyle = "#8a7444";
  ctx.beginPath(); ctx.ellipse(30, -336, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#9a8450";
  ctx.beginPath(); ctx.ellipse(30, -346, 16, 13, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(14, -342, 32, 4);
  ctx.strokeStyle = "rgba(60,44,20,0.35)"; ctx.lineWidth = 0.8;
  for (let a = 0; a < Math.PI; a += 0.25) { ctx.beginPath(); ctx.moveTo(30, -336); ctx.lineTo(30 + Math.cos(a) * 34, -336 + Math.sin(a) * 8); ctx.stroke(); }
}
