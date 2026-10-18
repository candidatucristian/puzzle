import { makeCanvas } from "../../shared/paint.js";
import { BINARY_LEAVES, BINARY_PATHS } from "./puzzle.js";

const PHOTOGRAPH = "binarytree_photograph_v1";
const SPROUT = "binarytree_sprout_photo_v1";
const PAPER = "binarytree_specimen_paper_v1";
const PLATES = "binarytree_gold_plaques_photo_v1";
const cache = new WeakMap();

export function loadTerrariumPhotography(scene) {
  const files = [
    [PHOTOGRAPH, "terrarium-photographic-v1.png"],
    [SPROUT, "sprout-photographic-v1.png"],
    [PAPER, "specimen-paper-v1.png"],
    [PLATES, "gold-plaques-photographic-v1.png"],
  ];
  for (const [key, file] of files) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/BinaryTree/${file}`);
  }
}

// Trim the transparent photographic cutouts without changing their alpha.
function cutout(image, [x, y, width, height]) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  let left = width, top = height, right = -1, bottom = -1;
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    if (data[(py * width + px) * 4 + 3] < 24) continue;
    left = Math.min(left, px); right = Math.max(right, px);
    top = Math.min(top, py); bottom = Math.max(bottom, py);
  }
  if (right < left) return canvas;
  left = Math.max(0, left - 2); top = Math.max(0, top - 2);
  right = Math.min(width - 1, right + 2); bottom = Math.min(height - 1, bottom + 2);
  const trimmed = makeCanvas(right - left + 1, bottom - top + 1);
  trimmed.getContext("2d").drawImage(canvas, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  return trimmed;
}

function photography(scene) {
  if (![PHOTOGRAPH, SPROUT, PAPER, PLATES].every(key => scene.textures.exists(key))) return null;
  const photo = scene.textures.get(PHOTOGRAPH).getSourceImage();
  if (cache.has(photo)) return cache.get(photo);
  const plant = scene.textures.get(SPROUT).getSourceImage();
  const paper = scene.textures.get(PAPER).getSourceImage();
  const plates = scene.textures.get(PLATES).getSourceImage();
  const plateW = Math.floor(plates.width / 2), plateH = Math.floor(plates.height / 2);
  // Atlas regions follow the actual paper silhouettes.
  const art = {
    photo,
    plant: cutout(plant, [0, 0, plant.width, plant.height]),
    notes: [cutout(paper, [135, 120, 550, 415]), cutout(paper, [930, 125, 520, 410])],
    plates: Array.from({ length: 4 }, (_, index) => cutout(plates, [index % 2 * plateW, Math.floor(index / 2) * plateH, plateW, plateH])),
  };
  cache.set(photo, art);
  return art;
}

function layoutPhotograph(L, plant) {
  const sx = L.W / 1659, sy = L.H / 948;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  const x = (depth, index) => (456 + 674 * (index + 0.5) / 2 ** depth) * sx;
  const ys = [550, 589, 629, 668];
  L.top = 197 * sy;
  L.base = 718 * sy;
  L.shelf = 794 * sy;
  L.frame = { x0: 414 * sx, x1: 1244 * sx, y0: 140 * sy, y1: L.shelf };
  L.glass = { x0: 428 * sx, x1: 1157 * sx, y0: L.top, y1: 710 * sy };
  L.soilY = 521 * sy;
  L.start = point(793, 521);
  L.forks = [0, 1, 2].map(depth => Array.from({ length: 2 ** depth }, (_, index) => ({ x: x(depth, index), y: ys[depth] * sy })));
  L.tips = Array.from({ length: 8 }, (_, index) => ({ x: x(3, index), y: ys[3] * sy }));
  L.letterY = 692 * sy;
  L.hand = 23 * sy;
  L.routePlates = { x0: 428 * sx, x1: 1152 * sx, y: 760 * sy, w: 92 * sx, h: 34 * sy };
  L.seedling = 161 * sy / plant.height;
  L.photoScale = { x: sx, y: sy };
}

function traceRoot(ctx, segment, rootPoint) {
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = rootPoint(segment, i / 40);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
}

function paintRoots(ctx, L, segments, rootPoint) {
  const unit = Math.min(L.photoScale.x, L.photoScale.y);
  const widths = [2.4, 1.9, 1.35, 0.95];
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Exactly the existing fifteen segments: no extra root forks or false paths.
  for (const segment of segments) {
    const width = widths[segment.depth] * unit;
    traceRoot(ctx, segment, rootPoint);
    ctx.lineWidth = width + 1.8 * unit;
    ctx.strokeStyle = "rgba(13,8,4,0.8)";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 1.4 * unit;
    ctx.shadowOffsetY = 0.7 * unit;
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const tone = ctx.createLinearGradient(segment.a.x, segment.a.y, segment.b.x, segment.b.y);
    tone.addColorStop(0, "#d5c4a0"); tone.addColorStop(0.58, "#bca783"); tone.addColorStop(1, "#dacbae");
    ctx.lineWidth = width;
    ctx.strokeStyle = tone;
    ctx.stroke();
    ctx.lineWidth = Math.max(0.35, width * 0.27);
    ctx.strokeStyle = "rgba(248,232,190,0.42)";
    ctx.stroke();
  }
  ctx.restore();
}

function paperLabel(ctx, paper, x, y, width, height, text, fontSize, angle = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.shadowColor = "rgba(4,3,2,0.65)";
  ctx.shadowBlur = height * 0.11; ctx.shadowOffsetX = height * 0.025; ctx.shadowOffsetY = height * 0.07;
  ctx.drawImage(paper, -width / 2, -height / 2, width, height);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#2c251a";
  ctx.font = `italic 600 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, -width * 0.015, height * 0.025);
  ctx.restore();
}

function goldRoutePlate(ctx, photograph, x, y, width, height, text) {
  ctx.save();
  ctx.translate(x, y);
  // The complete plaque, bevel and screws come from the photograph.
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = height * 0.1;
  ctx.shadowOffsetY = height * 0.07;
  ctx.drawImage(photograph, -width / 2, -height / 2, width, height);
  ctx.shadowColor = "transparent";
  ctx.font = `700 ${height * 0.6}px "IBM Plex Mono", monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#080706"; ctx.fillText(text, 0, 0);
  ctx.restore();
}

function specimenLayer(L, art, segments, rootPoint) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  const { x: sx, y: sy } = L.photoScale;
  paintRoots(ctx, L, segments, rootPoint);
  const turns = [-0.04, 0.025, -0.025, 0.035, -0.02, 0.025, -0.035, 0.03];
  L.tips.forEach((tip, index) => {
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y + 3 * sy); ctx.lineTo(tip.x, L.letterY - 18 * sy);
    ctx.lineWidth = Math.max(0.6, 0.8 * sy); ctx.strokeStyle = "rgba(210,201,176,0.5)"; ctx.stroke();
    paperLabel(ctx, art.notes[index % 2], tip.x, L.letterY, 49 * sx, 35 * sy, BINARY_LEAVES[index], L.hand, turns[index]);
  });
  // Distribute the message across the full wooden base with equal gaps,
  // independently of the eight paper labels and root-tip positions.
  const row = L.routePlates;
  const gap = BINARY_PATHS.length > 1 ? (row.x1 - row.x0 - row.w * BINARY_PATHS.length) / (BINARY_PATHS.length - 1) : 0;
  BINARY_PATHS.forEach((path, index) => {
    const x = row.x0 + row.w / 2 + index * (row.w + gap);
    goldRoutePlate(ctx, art.plates[index % art.plates.length], x, row.y, row.w, row.h, path);
  });
  return canvas;
}

function frontGlass(L) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  const { x: sx, y: sy } = L.photoScale;
  // Very faint front-pane reflections place the moving sprout behind the glass.
  ctx.save();
  ctx.beginPath(); ctx.rect(429 * sx, 201 * sy, 727 * sx, 506 * sy); ctx.clip();
  const light = ctx.createLinearGradient(430 * sx, 0, 1160 * sx, 0);
  light.addColorStop(0, "rgba(255,222,160,0.07)");
  light.addColorStop(0.13, "rgba(255,222,160,0)");
  light.addColorStop(0.8, "rgba(158,186,207,0)");
  light.addColorStop(1, "rgba(158,186,207,0.025)");
  ctx.fillStyle = light; ctx.fillRect(428 * sx, 200 * sy, 732 * sx, 510 * sy);
  ctx.restore();
  return canvas;
}

export function paintPhotographicTerrarium(scene, L, rootSegments, rootPoint) {
  const art = photography(scene);
  if (!art) return null;
  layoutPhotograph(L, art.plant);
  const wall = makeCanvas(L.W, L.H), ctx = wall.getContext("2d");
  ctx.drawImage(art.photo, 0, 0, L.W, L.H);
  const { x: sx } = L.photoScale;
  // Small contact shadow where the stem enters the actual soil surface.
  ctx.save(); ctx.translate(L.start.x, L.soilY); ctx.scale(1, 0.24);
  const contact = ctx.createRadialGradient(0, 0, 0, 0, 0, 13 * sx);
  contact.addColorStop(0, "rgba(10,9,3,0.72)"); contact.addColorStop(1, "rgba(10,9,3,0)");
  ctx.fillStyle = contact; ctx.fillRect(-14 * sx, -14 * sx, 28 * sx, 28 * sx); ctx.restore();
  // The complete photographed sprout pivots gently at its soil contact.
  const seedling = { w: art.plant.width, h: art.plant.height, foot: { x: 0.5, y: 0.997 }, node: { x: 0.5, y: 0.997 } };
  return {
    wall,
    box: specimenLayer(L, art, rootSegments(L), rootPoint),
    front: frontGlass(L),
    stem: makeCanvas(art.plant.width, art.plant.height),
    leaves: art.plant,
    veil: makeCanvas(1, 1),
    dapple: { canvas: makeCanvas(1, 1), at: { x: 0, y: 0, scale: 1 } },
    seedling,
  };
}
