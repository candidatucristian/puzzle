import { makeCanvas } from "../../shared/paint.js";

const KEY = "drawing_room_surface_materials";
const URL = "assets/images/Room5/drawing-room-background.png";
const cache = new WeakMap();
const FINISHES = "room5_material_atlas";

// Room V gets material scans only. The separate loader keeps the tree puzzle
// and the other rooms on their existing artwork.
export function loadDrawingRoomFinishes(scene) {
  if (!scene.textures.exists(FINISHES)) scene.load.image(FINISHES, "assets/images/Room5/surface-atlas.png");
}

export function drawingRoomFinishes(scene) {
  if (!scene.textures.exists(FINISHES)) return null;
  const atlas = scene.textures.get(FINISHES).getSourceImage();
  if (!cache.has(atlas)) {
    const w = atlas.width / 3, h = atlas.height / 2;
    const swatch = (col, row, filter) => {
      const canvas = makeCanvas(w - 6, h - 6), g = canvas.getContext("2d");
      g.filter = filter;
      g.drawImage(atlas, col * w + 3, row * h + 3, w - 6, h - 6, 0, 0, canvas.width, canvas.height);
      return canvas;
    };
    const paper = swatch(0, 0, "brightness(0.84) saturate(0.72)");
    const wood = swatch(1, 0, "brightness(0.69) saturate(0.8)");
    // Different narrow cuts give each original parquet block its own grain.
    const planks = Array.from({ length: 8 }, (_, i) => {
      const canvas = makeCanvas(wood.height, 96), g = canvas.getContext("2d");
      g.translate(0, canvas.height);
      g.rotate(-Math.PI / 2);
      g.drawImage(wood, 8 + i * 47, 0, 96, wood.height, 0, 0, 96, wood.height);
      return canvas;
    });
    cache.set(atlas, {
      detailed: true,
      paper: materialTile(paper, [0, 0, paper.width, paper.height]),
      wood: materialTile(wood, [0, 0, wood.width, wood.height]),
      planks,
      stone: swatch(2, 0, "brightness(0.66) saturate(0.4)"),
      rug: swatch(0, 1, "brightness(0.88) saturate(0.78)"),
      plaster: swatch(1, 1, "brightness(0.2) saturate(0.3)"),
      velvet: swatch(2, 1, "brightness(0.8) saturate(0.7)"),
    });
  }
  return cache.get(atlas);
}

export function loadDrawingRoomMaterials(scene) {
  if (!scene.textures.exists(KEY)) scene.load.image(KEY, URL);
}

export function drawingRoomMaterials(scene) {
  if (!scene.textures.exists(KEY)) return null;
  const photo = scene.textures.get(KEY).getSourceImage();
  if (!cache.has(photo)) {
    cache.set(photo, {
      paper: materialTile(photo, [648, 160, 145, 240]),
      wood: materialTile(photo, [1390, 820, 130, 180]),
    });
  }
  return cache.get(photo);
}

// Only small, empty patches of wallpaper and parquet are sampled. Mirrored
// edges let them repeat without introducing furniture or a new room view.
function materialTile(photo, [x, y, w, h]) {
  const canvas = makeCanvas(w * 2, h * 2), ctx = canvas.getContext("2d");
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    ctx.save();
    ctx.translate(col ? w * 2 : 0, row ? h * 2 : 0);
    ctx.scale(col ? -1 : 1, row ? -1 : 1);
    ctx.drawImage(photo, x, y, w, h, 0, 0, w, h);
    ctx.restore();
  }
  return canvas;
}

function materialSurface(tile, w, h) {
  const canvas = makeCanvas(Math.ceil(w), Math.ceil(h)), ctx = canvas.getContext("2d");
  ctx.fillStyle = ctx.createPattern(tile, "repeat");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

// M is the room's original projection for this wall, including the back
// wall. Every strip follows it, so its corners and perspective stay fixed.
export function paintWallpaperMaterial(ctx, L, M, a0, a1, foot, top) {
  const tile = L.surfaceMaterials?.paper;
  if (!tile) return;
  if (L.surfaceMaterials.detailed) {
    paintWallMaterial(ctx, tile, M, a0, a1, foot, top, 0.92);
    return;
  }
  const flat = materialSurface(tile, (a1 - a0) * 2, (top - foot) * 2);
  // the strips are laid plain on a layer of their own, and the layer goes on
  // the wall once, dimmed: a filter on every strip took seconds
  const { layer, g } = layerFor(ctx);
  for (let i = 0; i < flat.width; i += 2) {
    const width = Math.min(2, flat.width - i);
    const p = M(a0 + (a1 - a0) * i / flat.width, top);
    const q = M(a0 + (a1 - a0) * (i + width) / flat.width, foot);
    g.drawImage(flat, i, 0, width, flat.height, Math.min(p.x, q.x), p.y, Math.abs(q.x - p.x) + 0.6, q.y - p.y);
  }
  laid(ctx, layer, 0.6, "source-over", "brightness(0.68) saturate(0.72)");
}

// a clear layer the size of the picture, drawn in as `ctx` draws
function layerFor(ctx) {
  const layer = makeCanvas(ctx.canvas.width, ctx.canvas.height), g = layer.getContext("2d");
  g.setTransform(ctx.getTransform());
  return { layer, g };
}

// the layer laid on the picture in one go (inside whatever clip it has)
function laid(ctx, layer, alpha, blend, filter = "none") {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = blend;
  ctx.filter = filter;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

export function paintParquetMaterial(ctx, L, near, back, half) {
  const tile = L.surfaceMaterials?.wood;
  if (!tile || L.surfaceMaterials.planks || L.surfaceMaterials.deckPlanks || L.surfaceMaterials.flagstone) return;
  const flat = materialSurface(tile, half * 4, (back - near) * 2);
  // laid plain on a layer, then blended into the floor once (soft-light on
  // every one of the rows was most of the time the room took to paint)
  const { layer, g } = layerFor(ctx);
  for (let d = near; d < back; d++) {
    const end = Math.min(back, d + 1), mid = (d + end) / 2;
    const left = L.Q(-half, 0, mid), right = L.Q(half, 0, mid);
    const bottom = L.Q(0, 0, d).y, top = L.Q(0, 0, end).y;
    g.drawImage(flat, 0, (d - near) * 2, flat.width, (end - d) * 2, left.x, top, right.x - left.x, bottom - top + 0.6);
  }
  laid(ctx, layer, 0.24, "soft-light");
}

export function paintFlatMaterial(ctx, tile, x, y, w, h, scale, opacity, blend = "source-over") {
  if (!tile) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.globalCompositeOperation = blend;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = ctx.createPattern(tile, "repeat");
  ctx.fillRect(0, 0, w / scale, h / scale);
  ctx.restore();
}

// Texture coordinates are evaluated through the room's own projection.
// A small triangle mesh follows that perspective without moving any edge.
export function paintProjectedMaterial(ctx, tile, at, opacity = 1, columns = 1, rows = 1) {
  if (!tile) return;
  const outline = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
  const xs = outline.map(p => p.x), ys = outline.map(p => p.y);
  if (Math.max(...xs) < 0 || Math.min(...xs) > ctx.canvas.width || Math.max(...ys) < 0 || Math.min(...ys) > ctx.canvas.height) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.beginPath();
  outline.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  ctx.clip();
  const vertex = (u, v) => ({ ...at(u, v), u: u * tile.width, v: v * tile.height });
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = vertex(col / columns, row / rows), b = vertex((col + 1) / columns, row / rows);
    const c = vertex((col + 1) / columns, (row + 1) / rows), d = vertex(col / columns, (row + 1) / rows);
    materialTriangle(ctx, tile, a, b, c);
    materialTriangle(ctx, tile, a, c, d);
  }
  ctx.restore();
}

function materialTriangle(ctx, tile, a, b, c) {
  const du = b.u - a.u, dv = b.v - a.v, eu = c.u - a.u, ev = c.v - a.v;
  const det = du * ev - dv * eu;
  const ax = ((b.x - a.x) * ev - (c.x - a.x) * dv) / det;
  const bx = ((c.x - a.x) * du - (b.x - a.x) * eu) / det;
  const ay = ((b.y - a.y) * ev - (c.y - a.y) * dv) / det;
  const by = ((c.y - a.y) * du - (b.y - a.y) * eu) / det;
  ctx.save();
  // Slight overlap prevents pale antialiasing seams inside a material.
  const mx = (a.x + b.x + c.x) / 3, my = (a.y + b.y + c.y) / 3;
  ctx.beginPath();
  [a, b, c].forEach((p, i) => {
    const r = Math.hypot(p.x - mx, p.y - my) || 1;
    const x = p.x + (p.x - mx) * 0.35 / r, y = p.y + (p.y - my) * 0.35 / r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
  ctx.transform(ax, ay, bx, by, a.x - ax * a.u - bx * a.v, a.y - ay * a.u - by * a.v);
  ctx.drawImage(tile, 0, 0);
  ctx.restore();
}

export function paintWallMaterial(ctx, tile, M, a0, a1, foot, top, opacity) {
  if (!tile) return;
  const flat = materialSurface(tile, (a1 - a0) * 3, (top - foot) * 3);
  paintProjectedMaterial(ctx, flat, (u, v) => M(a0 + (a1 - a0) * u, top - (top - foot) * v), opacity, 24, 1);
}

export function paintParquetBlockMaterial(ctx, L, x, d, width, depth, rise, index) {
  const planks = L.surfaceMaterials?.planks;
  if (!planks) return;
  const tile = planks[((index % planks.length) + planks.length) % planks.length];
  paintProjectedMaterial(ctx, tile, (u, v) => L.Q(x + width * u, 0, d + rise * u + depth * v), 0.94);
}
