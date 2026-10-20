import { addCanvasTexture, glowCanvas, grain, makeCanvas, polygon, soft, vignette } from "../../shared/paint.js";
import { BACK, roomLayout } from "../house/roomKit.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { FLAG_CODES } from "../flags/flagDesigns.js";
import { HERBARIUM_COVER } from "../herbarium/photography.js";
import {
  paintMedal, TROPHY_MEDAL_FACES, TROPHY_MEDAL_FACES_URL,
  TROPHY_BRAZIL_MEDAL, TROPHY_BRAZIL_MEDAL_URL,
} from "../flags/trophies.js";

export const ROOM6_PHOTOGRAPH = "room6_photographic_interior_v1";
// Ivy's herbarium, shut, on the console table under the window beside the
// fern (the photograph's own pixels, 1659 x 948): its cover's four corners as
// seen from the door, front left first. Painted on the photograph, and what
// is clicked to open it.
const PHOTO = { width: 1659, height: 948 };
const HERBARIUM = [[684, 584], [786, 581], [779, 569], [692, 571]];
export function room6HerbariumQuad(L) {
  const sx = L.W / PHOTO.width, sy = L.H / PHOTO.height;
  return [[676, 592], [794, 589], [790, 560], [684, 562]].map(([x, y]) => ({ x: x * sx, y: y * sy }));
}
const REFERENCE = { width: 1792, height: 1024 };

export function loadRoom6Photography(scene) {
  for (const [key, url] of [
    [ROOM6_PHOTOGRAPH, "assets/images/Room6/room6-photographic-v1.png"],
    [HERBARIUM_COVER.key, HERBARIUM_COVER.url],
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
}

// The photographed cabinet sits at a slight angle to the room's side wall.
// Calibrate its front independently so each suspension loop meets the actual
// brass rod, and both the clue surface and hit area follow the same face.
export function room6CabinetPoint(L, u, v) {
  const scaleY = 3.05 + (2.28 - 3.05) * u;
  const rodY = 252 + (313.34 - 252) * u;
  return {
    x: (184 + 182 * u) * L.W / 1659,
    y: (rodY + (v * L.cabinet.h - 24) * scaleY) * L.H / 948,
  };
}

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
  ctx.drawImage(scene.textures.get(ROOM6_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  const c = L.cabinet;
  const face = (u, v) => room6CabinetPoint(L, u, v);
  paintProjectedMaterial(ctx, medals(scene, L), face, 0.9, 20, 4);
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
  paintHerbarium(ctx, L, scene.textures.exists(HERBARIUM_COVER.key) ? scene.textures.get(HERBARIUM_COVER.key).getSourceImage() : null);
  ctx.fillStyle = "rgba(2,4,6,0.1)"; ctx.fillRect(0, 0, L.W, L.H);
  vignette(ctx, L.W, L.H, 0.28, "source-over");
  grain(ctx, L.W, L.H, 0.006);
  addCanvasTexture(scene.textures, keys.room, canvas);
  addCanvasTexture(scene.textures, keys.glow, glowCanvas());
  return keys;
}

// The herbarium, shut, lying on the table: a deep green cloth cover, the
// cream of its page block along the front and the side, a paler label on it,
// its shadow on the wood.
function paintHerbarium(ctx, L, photograph) {
  ctx.save();
  ctx.scale(L.W / PHOTO.width, L.H / PHOTO.height);
  const [fl, fr, br, bl] = HERBARIUM.map(([x, y]) => ({ x, y }));
  const down = 7; // the book's thickness, as it is seen
  soft(ctx, (fl.x + fr.x) / 2 + 4, fl.y + down + 1, 62, 6, "0,0,0", 0.6);
  // the page block: along the front, and down the right-hand side
  polygon(ctx, [fl, fr, { x: fr.x, y: fr.y + down }, { x: fl.x, y: fl.y + down }]);
  ctx.fillStyle = "#b9ab88"; ctx.fill();
  ctx.strokeStyle = "rgba(90,70,40,0.35)"; ctx.lineWidth = 0.6;
  for (let i = 1; i < 5; i++) { const y = fl.y + (down * i) / 5; ctx.beginPath(); ctx.moveTo(fl.x + 2, y); ctx.lineTo(fr.x - 1, y - 2); ctx.stroke(); }
  polygon(ctx, [fr, br, { x: br.x, y: br.y + down }, { x: fr.x, y: fr.y + down }]);
  ctx.fillStyle = "#9e916f"; ctx.fill();
  // the cloth of its boards, a little over the pages at the front and the spine down the left
  polygon(ctx, [fl, fr, br, bl]);
  const cloth = ctx.createLinearGradient(fl.x, fl.y, br.x, br.y);
  cloth.addColorStop(0, "#22341f"); cloth.addColorStop(0.6, "#2f4529"); cloth.addColorStop(1, "#1b2a18");
  ctx.fillStyle = cloth; ctx.fill();
  ctx.strokeStyle = "rgba(10,16,8,0.7)"; ctx.lineWidth = 1; ctx.stroke();
  if (photograph) {
    const coverPoint = (u, v) => {
      const left = { x: bl.x + (fl.x - bl.x) * v, y: bl.y + (fl.y - bl.y) * v };
      const right = { x: br.x + (fr.x - br.x) * v, y: br.y + (fr.y - br.y) * v };
      return { x: left.x + (right.x - left.x) * u, y: left.y + (right.y - left.y) * u };
    };
    ctx.save(); ctx.filter = "brightness(.65) saturate(.76)";
    paintProjectedMaterial(ctx, photograph, coverPoint, 1, 8, 4); ctx.restore();
  }
  polygon(ctx, [fl, bl, { x: bl.x - 3, y: bl.y + 2 }, { x: fl.x - 3, y: fl.y + down }]);
  ctx.fillStyle = "#16220f"; ctx.fill();
  // a label on the cover, and the lamp's warm across it
  if (!photograph) {
    polygon(ctx, [{ x: 720, y: 578 }, { x: 750, y: 577 }, { x: 748, y: 573 }, { x: 722, y: 574 }]);
    ctx.fillStyle = "rgba(214,200,160,0.85)"; ctx.fill();
  }
  soft(ctx, 735, 575, 50, 8, "255,190,120", 0.12, "lighter");
  ctx.restore();
}
