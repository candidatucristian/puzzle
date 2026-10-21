import { addCanvasTexture, makeCanvas, polygon } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { DOOR_LENGTH } from "./doorMotion.js";

const KEY = "chemhall_single_lab_door_v3";
const FRAME = "chemhall_double_lab_frame_v2";
const cache = new WeakMap();
const frameCache = new WeakMap();

export function loadLabPassageDoor(scene) {
  if (!scene.textures.exists(KEY)) scene.load.image(KEY, "assets/images/Chemistry/hall-single-laboratory-door-v3.webp");
  if (!scene.textures.exists(FRAME)) scene.load.image(FRAME, "assets/images/Chemistry/hall-double-door-frame-v2.webp");
}

export function labPassageMaterial(scene) {
  if (!scene.textures.exists(KEY)) return null;
  const image = scene.textures.get(KEY).getSourceImage();
  if (!cache.has(image)) {
    const canvas = makeCanvas(image.width, image.height), g = canvas.getContext("2d");
    g.filter = "brightness(0.86) saturate(0.84)";
    g.drawImage(image, 0, 0);
    cache.set(image, canvas);
  }
  return cache.get(image);
}

export function labPassageFrame(scene) {
  if (!scene.textures.exists(FRAME)) return null;
  const image = scene.textures.get(FRAME).getSourceImage();
  if (!frameCache.has(image)) {
    const source = makeCanvas(image.width, image.height), s = source.getContext("2d");
    s.drawImage(image, 0, 0);
    const pixels = s.getImageData(0, 0, source.width, source.height), data = pixels.data;
    // Remove only saturated extraction fringes, retaining the pale paint,
    // bevel shadows and mitred joints of the photographed casing.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if ((r > 180 && r > g * 1.6 && r > b * 1.6)
        || (r > 180 && g > 160 && b < 100)
        || (g > 150 && g > r * 1.7 && g > b * 1.7)) data[i + 3] = 0;
    }
    s.putImageData(pixels, 0, 0);
    const gap = (horizontal, reverse = false) => {
      const n = horizontal ? source.width : source.height;
      let seenPaint = false;
      for (let j = 1; j < n * 0.2; j++) {
        const i = reverse ? n - 1 - j : j;
        const x = horizontal ? i : Math.floor(source.width / 2);
        const y = horizontal ? Math.floor(source.height / 2) : i;
        const step = horizontal ? (reverse ? -4 : 4) : source.width * 4;
        const at = (y * source.width + x) * 4 + 3;
        if (data[at] > 192) seenPaint = true;
        if (seenPaint && data[at] < 96 && data[at + step] < 96 && data[at + step * 2] < 96) return i / n;
      }
      return reverse ? 0.92 : horizontal ? 0.08 : 0.065;
    };
    // Fit the real profile to a slim casing, keeping all three mitred
    // components joined at the exact opening rather than stretching a border.
    const xs = [0, gap(true), gap(true, true), 1], ys = [0, gap(false), 1];
    const tx = [0, 0.04, 0.96, 1], ty = [0, 0.032, 1];
    const canvas = makeCanvas(image.width, image.height), ctx = canvas.getContext("2d");
    ctx.filter = "brightness(0.86) saturate(0.84)";
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      ctx.drawImage(source, xs[col] * source.width, ys[row] * source.height,
        (xs[col + 1] - xs[col]) * source.width, (ys[row + 1] - ys[row]) * source.height,
        tx[col] * canvas.width, ty[row] * canvas.height,
        (tx[col + 1] - tx[col]) * canvas.width, (ty[row + 1] - ty[row]) * canvas.height);
    }
    ctx.clearRect(canvas.width * 0.04, canvas.height * 0.032, canvas.width * 0.92, canvas.height * 0.968);
    frameCache.set(image, canvas);
  }
  return frameCache.get(image);
}

export function layoutLabPassageDoor(L) {
  const { z0, z1 } = L.stairs;
  const top = L.stairs.head ?? L.doorTop, bottom = L.floor;
  const quad = [L.P(L.wall, top, z0), L.P(L.wall, top, z1), L.P(L.wall, bottom, z1), L.P(L.wall, bottom, z0)];
  const trim = (z1 - z0) * 0.04 / 0.92;
  const frame = { z0: z0 - trim, z1: z1 + trim, top: top - (bottom - top) * 0.032 / 0.968 };
  const corners = [L.P(L.wall, frame.top, frame.z0), L.P(L.wall, frame.top, frame.z1), L.P(L.wall, bottom, frame.z1), L.P(L.wall, bottom, frame.z0)];
  const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
  return {
    labPassage: true, number: "chemistry-passage", target: "Top", side: 1,
    z: z0, z0, z1, top, bottom, frame, recess: L.H * 0.012, quad, box: { ...L.up },
    frameBox: { x: Math.min(...xs) - 4, y: Math.min(...ys) - 4, width: Math.max(...xs) - Math.min(...xs) + 8, height: Math.max(...ys) - Math.min(...ys) + 8 },
    sill: L.P(L.wall * 0.94, L.floor, (z0 + z1) / 2),
  };
}

const fill = (ctx, points, colour) => {
  polygon(ctx, points); ctx.fillStyle = colour; ctx.fill();
};

// One rigid timber leaf hung on the near jamb, as with the ordinary doors.
function leafSurface(L, d, angle) {
  const tall = d.bottom - d.top, length = d.z1 - d.z0;
  const wide = tall * 0.43 * length / DOOR_LENGTH;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const point = (u, v, thickness = 0) => {
    return L.P(L.wall + d.recess + wide * (u * sin + thickness * cos),
      d.top + tall * v,
      d.z0 + length * (u * cos - thickness * sin));
  };
  const quad = [point(0, 0), point(1, 0), point(1, 1), point(0, 1)];
  const closedWidth = L.P(L.wall + d.recess, d.top, d.z1).x - L.P(L.wall + d.recess, d.top, d.z0).x;
  const visible = Math.max(0, Math.min(1, (quad[1].x - quad[0].x) / closedWidth));
  return { point, quad, visible, aperture: 1 - visible,
    edge: [point(1, 0), point(1, 0, 0.045), point(1, 1, 0.045), point(1, 1)] };
}

function paintLeaf(ctx, L, d, angle) {
  const shape = leafSurface(L, d, angle);
  if (shape.visible <= 0) return;
  fill(ctx, shape.edge, "#8d897a");
  if (L.labPassageMaterial) paintProjectedMaterial(ctx, L.labPassageMaterial, shape.point, 1, 24, 8);
  else {
    fill(ctx, shape.quad, "#c4bda7");
    fill(ctx, [shape.point(0.2, 0.14), shape.point(0.8, 0.14), shape.point(0.8, 0.47), shape.point(0.2, 0.47)], "#67777b");
  }
  if (angle > 0) fill(ctx, shape.quad, `rgba(5,10,13,${0.18 * Math.sin(angle)})`);
}

function paintSurround(ctx, L, d) {
  // A recessed far jamb and head give the doors an actual reveal, with a
  // narrow gasket instead of the previous heavy painted outline.
  const M = (z, y, depth = 0) => L.P(L.wall + depth, y, z);
  const far = [M(d.z1, d.top), M(d.z1, d.top, d.recess), M(d.z1, d.bottom, d.recess), M(d.z1, d.bottom)];
  fill(ctx, far, "#7d8682");
  fill(ctx, [M(d.z0, d.top), M(d.z1, d.top), M(d.z1, d.top, d.recess), M(d.z0, d.top, d.recess)], "#646e6a");
  const at = (u, v) => M(d.frame.z0 + (d.frame.z1 - d.frame.z0) * u, d.frame.top + (d.bottom - d.frame.top) * v);
  // An opaque, analytic casing silhouette keeps the header and perimeter
  // straight even where the photograph's extracted alpha is imperfect.
  for (const [u0, u1, v0, v1] of [[0, 0.04, 0, 1], [0.96, 1, 0, 1], [0.04, 0.96, 0, 0.032]]) {
    fill(ctx, [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], "#b8bcb5");
  }
  if (L.labPassageFrame) paintProjectedMaterial(ctx, L.labPassageFrame, at, 1, 24, 20);
}

export function paintClosedLabPassage(ctx, L) {
  const d = L.passageDoor;
  if (!d) return;
  const box = d.frameBox, resolution = Math.min(4, 3072 / box.height);
  const canvas = makeCanvas(box.width * resolution, box.height * resolution), g = canvas.getContext("2d");
  g.scale(resolution, resolution); g.translate(-box.x, -box.y);
  const outer = [L.P(L.wall, d.frame.top, d.frame.z0), L.P(L.wall, d.frame.top, d.frame.z1), L.P(L.wall, d.bottom, d.frame.z1), L.P(L.wall, d.bottom, d.frame.z0)];
  fill(g, outer.map(p => ({ x: p.x + L.u, y: p.y + 1.6 * L.u })), "rgba(4,10,12,0.3)");
  g.save(); polygon(g, d.quad); g.clip();
  fill(g, d.quad, "#414c48");
  paintLeaf(g, L, d, 0);
  g.restore();
  paintSurround(g, L, d);
  ctx.save(); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, box.x, box.y, box.width, box.height);
  ctx.restore();
}

export function paintLabPassageSwing(scene, L, d, paintInterior, paintForeground) {
  const box = { x: Math.floor(d.box.x) - 2, y: Math.floor(d.box.y) - 2,
    width: Math.ceil(d.box.width) + 4, height: Math.ceil(d.box.height) + 4 };
  const resolution = Math.min(4, 3072 / box.height, Math.sqrt(2000000 / (box.width * box.height)));
  const sheet = paint => {
    const canvas = makeCanvas(box.width * resolution, box.height * resolution), ctx = canvas.getContext("2d");
    ctx.scale(resolution, resolution); ctx.translate(-box.x, -box.y);
    polygon(ctx, d.quad); ctx.clip(); paint(ctx);
    return canvas;
  };
  // Keep the actual existing stairs behind the doors, with the same final
  // hall lighting and foreground objects as the ordinary room-door renderer.
  const interior = sheet(paintInterior), surround = sheet(ctx => paintSurround(ctx, L, d)), foreground = sheet(paintForeground);
  const canvas = makeCanvas(interior.width, interior.height), ctx = canvas.getContext("2d");
  const key = "hl_swing_chemistry_passage";
  const texture = addCanvasTexture(scene.textures, key, canvas);
  let lastAngle = -1;
  const draw = angle => {
    const pose = leafSurface(L, d, angle);
    if (angle === lastAngle) return pose;
    lastAngle = angle;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(interior, 0, 0);
    ctx.save(); ctx.scale(resolution, resolution); ctx.translate(-box.x, -box.y);
    polygon(ctx, d.quad); ctx.clip();
    paintLeaf(ctx, L, d, angle);
    ctx.restore();
    ctx.drawImage(surround, 0, 0);
    ctx.drawImage(foreground, 0, 0);
    texture.refresh();
    return pose;
  };
  draw(0);
  return { box, key, draw, resolution };
}
