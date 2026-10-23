import { addCanvasTexture, glowCanvas, grain, makeCanvas, polygon, soft, vignette } from "../../shared/paint.js";
import { BACK, roomLayout } from "../house/roomKit.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { FLAG_CODES } from "../flags/flagDesigns.js";
import { NURSERY_PORTRAIT } from "./nurseryPortraits.js";
import { onScreen } from "../../shared/phaserRain.js";
import { room6LivePlate } from "./liveRoom6.js";
import {
  paintMedal, TROPHY_MEDAL_FACES, TROPHY_MEDAL_FACES_URL,
  TROPHY_BRAZIL_MEDAL, TROPHY_BRAZIL_MEDAL_URL,
} from "../flags/trophies.js";

export const ROOM6_PHOTOGRAPH = "room6_blender_realistic_v4";
// Blender's camera preserves the original 1659 x 948 logical composition.
// The rendered cot, herbarium and family print share their old click areas.
const PHOTO = { width: 1659, height: 948 };
export function room6HerbariumQuad(L) {
  const sx = L.W / PHOTO.width, sy = L.H / PHOTO.height;
  return [[676, 592], [794, 589], [790, 560], [684, 562]].map(([x, y]) => ({ x: x * sx, y: y * sy }));
}
const REFERENCE = { width: 1792, height: 1024 };
// The arched window's six panes, in the photograph's pixels: the two under the
// arch, then two and two between the bars; and the fern's fronds standing in
// front of the lowest left one. The rain is on that glass (shared/rainGlass.js).
const arch = (from, to) => Array.from({ length: 9 }, (_, i) => {
  const a = ((from + ((to - from) * i) / 8) * Math.PI) / 180;
  return [677 + 75 * Math.cos(a), 232 - 72 * Math.sin(a)];
});
const WINDOW_PANES = [
  [...arch(180, 95), [671, 270], [602, 270]],
  [...arch(85, 0), [752, 270], [683, 270]],
  [[602, 275], [671, 275], [671, 377], [602, 377]],
  [[683, 275], [752, 275], [752, 377], [683, 377]],
  [[602, 384], [671, 384], [671, 485], [602, 485]],
  [[683, 384], [752, 384], [752, 485], [683, 485]],
];
const FERN = [[596, 487], [601, 470], [606, 466], [614, 462], [620, 457], [626, 455], [631, 462], [629, 470],
  [635, 473], [643, 473], [650, 475], [647, 481], [641, 487]];

export function loadRoom6Photography(scene) {
  for (const [key, url] of [
    [ROOM6_PHOTOGRAPH, "assets/images/Room6/room6-blender-realistic-v4.webp"],
    [NURSERY_PORTRAIT.key, NURSERY_PORTRAIT.url],
    [TROPHY_MEDAL_FACES, TROPHY_MEDAL_FACES_URL],
    [TROPHY_BRAZIL_MEDAL, TROPHY_BRAZIL_MEDAL_URL],
  ]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

// Artwork, glass, medal faces and the click polygon use the same landmarks.
// Resizing changes their projection together, without moving the cabinet away
// from the puzzle's interaction area or stretching the medals independently.
export function alignRoom6Photography(L, window) {
  const reference = roomLayout(REFERENCE.width, REFERENCE.height);
  const sx = L.W / REFERENCE.width, sy = L.H / REFERENCE.height;
  L.half = reference.half;
  L.top = reference.top;
  L.cm = reference.cm * sy;
  L.Q = (x, y, depth) => {
    const p = reference.Q(x, y, depth);
    return { x: p.x * sx, y: p.y * sy, s: p.s * sy };
  };
  const wc = L.Q(window.x * L.half, 0, BACK);
  L.win = {
    cx: wc.x, rx: window.hw * L.half * wc.s * sx / sy,
    top: L.Q(0, window.top, BACK).y, sill: L.Q(0, window.sill, BACK).y,
    x: window.x * L.half, hw: window.hw * L.half,
  };
  L.photographic = true;
  L.blender = !(typeof location !== "undefined" && new URLSearchParams(location.search).has("sketch"));
  L.rain = {
    panes: WINDOW_PANES.map((points) => onScreen(points, PHOTO, L.W, L.H)),
    cutouts: [onScreen(L.blender ? [[547,510],[554,489],[579,481],[584,469],[601,465],[616,466],[625,473],[642,474],[653,488],[653,510]] : FERN, PHOTO, L.W, L.H)],
    drop: Math.max(0.45, (L.W / 1920) * 0.62), fog: 0.45, reach: 22, beyond: 0.5, seed: 6606,
  };
}

// The photographed cabinet sits at a slight angle to the room's side wall.
// Calibrate its front independently so each suspension loop meets the actual
// brass rod, and both the clue surface and hit area follow the same face.
export function room6CabinetPoint(L, u, v) {
  if (L.blender) {
    // Project the actual rod plane from the saved Blender camera (24 mm,
    // 36 mm sensor, eye 1.72 m). Equal hanging positions stay equal in 3D,
    // with their perspective contraction towards the far end of the case.
    const depth = 4.56 + (6.10 - 4.56) * u;
    const focal = 1106 / depth;
    return {
      x: (860 - 2.793 * focal) * L.W / PHOTO.width,
      y: (430 + (v * 2.65 - 1.024) * focal) * L.H / PHOTO.height,
    };
  }
  const scaleY = 3.05 + (2.28 - 3.05) * u;
  const rodY = 252 + (313.34 - 252) * u;
  return {
    x: (184 + 182 * u) * L.W / 1659,
    y: (rodY + (v * L.cabinet.h - 24) * scaleY) * L.H / 948,
  };
}

// (the drawn room hangs the same medals in its cabinet: sketchRoom.js)
export { medals as room6Medals };

function medals(scene, L) {
  const c = L.cabinet, pixels = 6, width = c.d1 - c.d0;
  const canvas = makeCanvas(width * pixels, c.h * pixels), ctx = canvas.getContext("2d");
  const source = key => scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null;
  const faces = source(TROPHY_MEDAL_FACES), brazil = source(TROPHY_BRAZIL_MEDAL);
  const glassTop = (c.h - c.glass.y1) * pixels;
  const glassBottom = (c.h - c.glass.y0) * pixels;
  const rod = (c.h - 188) * pixels;
  const left = 6 * pixels, right = (width - 6) * pixels;
  ctx.save(); ctx.beginPath(); ctx.rect(left, glassTop, right - left, glassBottom - glassTop); ctx.clip();
  const spacing = (width - 44) / FLAG_CODES.length;
  FLAG_CODES.forEach((code, index) => {
    const x = (12 + spacing * (index + 0.5)) * pixels;
    paintMedal(ctx, { u: 1 }, {
      code, index, x, y: rod + 14, len: 18 * pixels - 14,
      r: 5.4 * pixels, w: 7 * pixels,
    }, faces, brazil);
  });
  // A faint reflected window strip passes across the live clue medals, so
  // they belong behind the cabinet's glass rather than floating in front.
  const reflection = ctx.createLinearGradient(left, 0, right, 0);
  reflection.addColorStop(0, "rgba(179,207,223,0)");
  reflection.addColorStop(0.42, "rgba(179,207,223,0)");
  reflection.addColorStop(0.5, "rgba(179,207,223,0.045)");
  reflection.addColorStop(0.57, "rgba(179,207,223,0)");
  reflection.addColorStop(1, "rgba(179,207,223,0)");
  ctx.fillStyle = reflection; ctx.fillRect(left, glassTop, right - left, glassBottom - glassTop);
  ctx.restore();
  return canvas;
}

export function paintRoom6Photography(scene, L, keys) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  const c = L.cabinet;
  const face = (u, v) => room6CabinetPoint(L, u, v);
  // Alive (liveRoom6.js), the room and its medals are drawn behind this
  // canvas, in three dimensions; here only what lies over them. Otherwise
  // the render, and the medals painted on their plane.
  if (L.live) {
    // (the rain takes its picture at the screen's size, as the room is shown)
    const plate = makeCanvas(L.W, L.H);
    plate.getContext("2d").drawImage(room6LivePlate(scene), 0, 0, L.W, L.H);
    L.rainPicture = plate;
  }
  else {
    ctx.drawImage(scene.textures.get(ROOM6_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
    paintProjectedMaterial(ctx, medals(scene, L), face, 0.9, 20, 4);
  }
  if (!L.on.flags) {
    ctx.save();
    polygon(ctx, [face(0,(c.h-c.glass.y1)/c.h),face(1,(c.h-c.glass.y1)/c.h),face(1,(c.h-c.glass.y0)/c.h),face(0,(c.h-c.glass.y0)/c.h)]);
    ctx.clip(); ctx.fillStyle = "rgba(2,5,4,0.24)"; ctx.fillRect(0,0,L.W,L.H);
    ctx.restore();
    ctx.save();
    polygon(ctx, [face(0,0.02),face(1,0.02),face(1,0.1),face(0,0.1)]);
    ctx.clip(); ctx.fillStyle = "rgba(3,5,5,0.76)"; ctx.fillRect(0,0,L.W,L.H);
    ctx.restore();
  } else {
    const lamp = L.glows.flags;
    soft(ctx, lamp.x, lamp.y, lamp.r * 0.8, lamp.r * 1.3, "255,195,130", 0.055, "lighter");
  }
  // Night lighting, cloth, plants and framed artwork are already rendered
  // in Cycles. A light edge grade preserves their material response.
  vignette(ctx, L.W, L.H, 0.12, "source-over");
  grain(ctx, L.W, L.H, 0.003);
  addCanvasTexture(scene.textures, keys.room, canvas);
  addCanvasTexture(scene.textures, keys.glow, glowCanvas());
  return keys;
}

