import { makeCanvas, soft } from "../../shared/paint.js";
import { BACK, fillPoly, footShadow } from "../house/roomKit.js";
import { paintProjectedMaterial, paintWallMaterial } from "../house/drawingRoomMaterials.js";
import { caseBody, solidBox, solidSurface, recessedPanel } from "../house/solidFurniture.js";
import { laboratoryFrames } from "./laboratoryArt.js";

const ASSETS = {
  cabinet: { key: "r7_cabinet_front", url: "assets/images/Room7/cabinet-front.webp" },
  sinks: { key: "r7_sink_top", url: "assets/images/Room7/sink-countertop.webp" },
  faucets: { key: "r7_faucets", url: "assets/images/Room7/laboratory-faucets.webp" },
};
const cache = new WeakMap(), stationCache = new WeakMap();

export function loadRoom7DepthArt(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function room7DepthArt(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.cabinet)) cache.set(sources.cabinet, {
    cabinet: laboratoryFrames(sources.cabinet, [0, 1])[0],
    faucets: laboratoryFrames(sources.faucets, [0, 0.5, 1]),
    sinks: crop(sources.sinks, 0, 0, sources.sinks.width, sources.sinks.height),
    basins: [0, 728].map(offset => ({
      floor: crop(sources.sinks, 216 + offset, 388, 375, 307),
      back: crop(sources.sinks, 177 + offset, 295, 457, 87),
      side: crop(sources.sinks, 163 + offset, 382, 52, 317),
      front: crop(sources.sinks, 177 + offset, 699, 457, 65),
    })),
  });
  return cache.get(sources.cabinet);
}

function crop(source, x, y, w, h) {
  const canvas = makeCanvas(w, h), g = canvas.getContext("2d");
  g.filter = "brightness(0.86) saturate(0.72)";
  g.drawImage(source, x, y, w, h, 0, 0, w, h);
  return canvas;
}

function stationParts(source) {
  if (!stationCache.has(source)) stationCache.set(source, {
    window: crop(source, 84, 68, 856, 644),
    tiles: crop(source, 410, 716, 190, 100),
    doors: Array.from({ length: 4 }, (_, i) => crop(source, 28 + i * 242, 1006, 242, 360)),
    plinth: crop(source, 26, 1374, 970, 80),
  });
  return stationCache.get(source);
}

export function paintDeepGlassCabinet(ctx, L) {
  if (!L.depthArt) return false;
  const at = L.wallShelves, { Q } = L;
  const front = caseBody(ctx, L, { at, side: -1, depth: L.glassCabinetDepth });
  paintProjectedMaterial(ctx, L.depthArt.cabinet, (u, v) => Q(front, at.y1 - (at.y1 - at.y0) * v, at.d0 + (at.d1 - at.d0) * u), 1, 24, 1);
  // The cornice projects beyond the door plane, with a visible near return.
  solidSurface(ctx, L.surfaceMaterials?.wood, (u, v) => Q(front + 3, at.y1 + 1 - 5 * v, at.d0 - 2 + (at.d1 - at.d0 + 4) * u), 0.88, "#392516", 24, 1);
  solidSurface(ctx, L.surfaceMaterials?.wood, (u, v) => Q(-L.half + (L.glassCabinetDepth + 3) * u, at.y1 + 1 - 5 * v, at.d0 - 2), 0.52);
  return true;
}

export function paintDeepWashingStation(ctx, L, source, phase = "all") {
  if (!L.depthArt) return false;
  const { Q } = L, s = L.sinks, art = stationParts(source), wood = L.surfaceMaterials?.wood;
  const span = s.x1 - s.x0, front = s.d0 + 8;
  if (phase !== "furniture") {
    // Window glass sits behind the room wall; the reveal connects the planes.
    const near = (u, v) => Q(s.x0 + span * u, 244 - 128 * v, BACK);
    const glass = (u, v) => Q(s.x0 + 3 + (span - 6) * u, 241 - 122 * v, BACK + 10);
    fillPoly(ctx, [near(0, 0), near(1, 0), near(1, 1), near(0, 1)], "#101411");
    paintProjectedMaterial(ctx, art.window, glass, 1, 4, 3);
    for (const [a, b, shade] of [[0, 1, 0.28], [1, 2, 0.55], [2, 3, 0.88], [3, 0, 0.46]]) {
      const uv = [[0, 0], [1, 0], [1, 1], [0, 1]], p = uv[a], q = uv[b];
      const n0 = near(...p), n1 = near(...q), g0 = glass(...p), g1 = glass(...q);
      fillPoly(ctx, [n0, n1, g1, g0], `rgba(${Math.round(100 * shade)},${Math.round(109 * shade)},${Math.round(99 * shade)},1)`);
    }
    solidBox(ctx, L, { x0: s.x0 - 2, x1: s.x1 + 2, y0: 113, y1: 116, d0: BACK - 12, d1: BACK }, { wood, top: L.surfaceMaterials?.slate });
    paintWallMaterial(ctx, art.tiles, (x, y) => Q(x, y, BACK - 1), s.x0, s.x1, s.h, 113, 1);
  }
  if (phase === "window") return true;

  footShadow(ctx, L, { ...s, d1: BACK }, 0.72);
  solidBox(ctx, L, { x0: s.x0 + 2, x1: s.x1 - 2, y0: 7, y1: s.h - 6, d0: front, d1: BACK - 2 }, { wood });
  solidBox(ctx, L, { x0: s.x0 + 5, x1: s.x1 - 5, y0: 0, y1: 9, d0: front + 12, d1: BACK - 2 }, { wood, front: art.plinth, shade: 0.48 });
  const doorWidth = (span - 10) / 4;
  for (let i = 0; i < 4; i++) {
    const x0 = s.x0 + 5 + doorWidth * i;
    solidBox(ctx, L, { x0, x1: x0 + doorWidth - 1.2, y0: 10, y1: s.h - 10, d0: front - 3, d1: front }, { wood, front: art.doors[i] });
  }
  // A six-centimetre slab has separate top, front and visible left end.
  solidBox(ctx, L, { x0: s.x0, x1: s.x1, y0: s.h - 6, y1: s.h, d0: s.d0, d1: BACK }, {
    wood: L.surfaceMaterials?.slate, top: L.depthArt.sinks,
  });
  for (const [i, u0] of [0.103, 0.577].entries()) paintBasin(ctx, L, {
    x0: s.x0 + span * u0, x1: s.x0 + span * (u0 + 0.323),
    d0: BACK - (BACK - s.d0) * 0.749, d1: BACK - (BACK - s.d0) * 0.287,
    y: s.h,
  }, L.depthArt.basins[i]);
  edge(ctx, L, s.x0, s.x1, s.h, s.d0, "rgba(183,199,210,0.32)");
  // Upright faucets are distinct from the top-down sink surface.
  for (const [i, f] of [0.27, 0.73].entries()) {
    const image = L.depthArt.faucets[i], p = Q(s.x0 + span * f, s.h, BACK - 15);
    const h = 34 * p.s, w = h * image.width / image.height;
    soft(ctx, p.x, p.y, 9 * p.s, 1.5 * p.s, "0,0,0", 0.6);
    ctx.drawImage(image, p.x - w / 2, p.y - h, w, h);
  }
  return true;
}

function paintBasin(ctx, L, { x0, x1, d0, d1, y }, art) {
  const { Q } = L, r = 3, bottom = y - 18, inset = 4;
  const ring = [];
  for (const [x, d, start] of [[x1 - r, d1 - r, 0], [x0 + r, d1 - r, Math.PI / 2], [x0 + r, d0 + r, Math.PI], [x1 - r, d0 + r, Math.PI * 1.5]]) {
    for (let i = 0; i <= 6; i++) {
      const a = start + i * Math.PI / 12;
      ring.push(Q(x + r * Math.cos(a), y, d + r * Math.sin(a)));
    }
  }
  ctx.save();
  fillPoly(ctx, ring, "#484943"); ctx.clip();
  solidSurface(ctx, art.floor, (u, v) => Q(x0 + inset + (x1 - x0 - 2 * inset) * u, bottom, d1 - inset - (d1 - d0 - 2 * inset) * v), 0.58);
  solidSurface(ctx, art.back, (u, v) => Q(x0 + inset * v + (x1 - x0 - 2 * inset * v) * u, y - 18 * v, d1 - inset * v), 0.69);
  for (const [x, direction, shade] of [[x0, 1, 0.52], [x1, -1, 0.84]]) {
    solidSurface(ctx, art.side, (u, v) => Q(x + direction * inset * v, y - 18 * v, d1 - inset * v - (d1 - d0 - 2 * inset * v) * u), shade);
  }
  solidSurface(ctx, art.front, (u, v) => Q(x0 + inset * v + (x1 - x0 - 2 * inset * v) * u, y - 18 * v, d0 + inset * v), 0.38);
  ctx.restore();
}

export function paintDeepLaboratoryBench(ctx, L) {
  if (!L.surfaceMaterials?.wood) return false;
  const b = L.bench, { Q } = L, wood = L.surfaceMaterials.wood, slate = L.surfaceMaterials.slate;
  const front = b.d0 + 8, span = b.x1 - b.x0;
  footShadow(ctx, L, { ...b, d1: BACK }, 0.75);
  solidBox(ctx, L, { x0: b.x0 + 3, x1: b.x1 - 3, y0: 7, y1: b.h - 6, d0: front, d1: BACK - 2 }, { wood });
  solidBox(ctx, L, { x0: b.x0 + 6, x1: b.x1 - 6, y0: 0, y1: 9, d0: front + 12, d1: BACK - 2 }, { wood, shade: 0.38 });
  const w = (span - 12) / 4;
  for (let i = 0; i < 4; i++) {
    const x0 = b.x0 + 6 + w * i, x1 = x0 + w - 1.5, d = front - 3;
    solidBox(ctx, L, { x0, x1, y0: 70, y1: 82, d0: d, d1: front }, { wood });
    recessedPanel(ctx, L, { x0: x0 + 1, x1: x1 - 1, y0: 71, y1: 81, d, inset: 1.8, relief: 1.5 });
    handle(ctx, L, (x0 + x1) / 2, 76, d - 1, true);
    solidBox(ctx, L, { x0, x1, y0: 11, y1: 67, d0: d, d1: front }, { wood });
    recessedPanel(ctx, L, { x0: x0 + 1, x1: x1 - 1, y0: 12, y1: 66, d, inset: 4, relief: 3 });
    handle(ctx, L, i % 2 ? x0 + 4 : x1 - 4, 52, d - 1, false);
  }
  // Cut front corners expose true angled end faces even from the doorway.
  const x0 = b.x0 - 2, x1 = b.x1 + 2, d0 = b.d0 - 3, cut = 6;
  const corners = [[x0 + cut, d0], [x1 - cut, d0], [x1, d0 + cut], [x1, BACK], [x0, BACK], [x0, d0 + cut]];
  ctx.save();
  fillPoly(ctx, corners.map(([x, d]) => Q(x, b.h, d)), "#22282a"); ctx.clip();
  solidSurface(ctx, slate, (u, v) => Q(x0 + (x1 - x0) * u, b.h, BACK - (BACK - d0) * v), 0.94, "#202529", 6, 4);
  ctx.restore();
  for (const [i, j, shade] of [[0, 1, 0.7], [1, 2, 0.48], [5, 0, 0.55]]) {
    const a = corners[i], z = corners[j];
    solidSurface(ctx, slate, (u, v) => Q(a[0] + (z[0] - a[0]) * u, b.h - 6 * v, a[1] + (z[1] - a[1]) * u), shade);
  }
  edge(ctx, L, x0 + cut, x1 - cut, b.h, d0, "rgba(190,211,222,0.32)");
  solidSurface(ctx, null, (u, v) => Q(b.x0 + 3 + (span - 6) * u, b.h - 6 - 3 * v, front), 1, "rgba(0,0,0,0.52)");
  return true;
}

function edge(ctx, L, x0, x1, y, d, color) {
  const a = L.Q(x0, y, d), b = L.Q(x1, y, d);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.6, a.s * 0.4);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function handle(ctx, L, x, y, d, bar) {
  const p = L.Q(x, y, d), s = p.s, r = (bar ? 3 : 1.4) * s;
  soft(ctx, p.x + s, p.y + s, r * 1.25, 1.3 * s, "0,0,0", 0.7);
  const metal = ctx.createLinearGradient(0, p.y - s, 0, p.y + s);
  metal.addColorStop(0, "#d4b876"); metal.addColorStop(0.4, "#92703a"); metal.addColorStop(1, "#30220e");
  ctx.fillStyle = metal;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, r, (bar ? 0.85 : 1.4) * s, 0, 0, Math.PI * 2); ctx.fill();
}
