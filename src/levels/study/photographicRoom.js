import { makeCanvas, addCanvasTexture, vignette, soft } from "../../shared/paint.js";
import { roomLayout } from "../house/roomKit.js";

export const STUDY_PHOTOGRAPH = "study_photographic_room_v1";
export const STUDY_FLAME = "sd_photographic_flame";
const REFERENCE = { width: 1792, height: 1024 };

export function loadStudyPhotography(scene) {
  if (!scene.textures.exists(STUDY_PHOTOGRAPH)) {
    scene.load.image(STUDY_PHOTOGRAPH, "assets/images/Room1/room1-photographic-v1.png");
  }
}

export function alignStudyPhotography(L) {
  const original = roomLayout(REFERENCE.width, REFERENCE.height);
  const sx = L.W / REFERENCE.width, sy = L.H / REFERENCE.height;
  L.half = original.half; L.top = original.top; L.cm = original.cm * sy;
  L.Q = (x, y, depth) => {
    const p = original.Q(x, y, depth);
    return { x: p.x * sx, y: p.y * sy, s: p.s * sy };
  };
  L.photographic = true;
}

// The final photograph keeps the blockout, with a taller window and a
// slightly higher candle. Use its landmarks for the live light and clicks.
export function alignStudyObjects(L) {
  const sx = L.W / 1659, sy = L.H / 948;
  L.win.cx = 893 * sx; L.win.rx = 125 * sx;
  L.win.top = 102 * sy; L.win.sill = 518 * sy;
  const wallScale = 2.048;
  L.wheel.x = (1146 / 1659 * REFERENCE.width - REFERENCE.width / 2) / wallScale;
  L.wheel.y = 150 - (406 / 948 * REFERENCE.height - REFERENCE.height * 0.44) / wallScale;
  L.wheel.plaque = 32;
  L.photoLamp = { x: 435 * sx, y: 503 * sy, r: 160 * sy };
  L.photoFlame = { x: 1291 * sx, y: 491 * sy, r: 42 * sy };
}

export function paintStudyPhotography(ctx, scene, L) {
  if (!L.photographic) return false;
  ctx.drawImage(scene.textures.get(STUDY_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  if (!L.lampOn) {
    soft(ctx, L.photoLamp.x, L.photoLamp.y, L.W * 0.25, L.H * 0.47, "3,7,9", 0.6);
  }
  vignette(ctx, L.W, L.H, 0.15);
  return true;
}

export function paintStudyFlame(textures) {
  const canvas = makeCanvas(24, 64), ctx = canvas.getContext("2d");
  const fire = ctx.createLinearGradient(0, 5, 0, 60);
  fire.addColorStop(0, "rgba(255,141,45,0.2)");
  fire.addColorStop(0.34, "#ffe38f");
  fire.addColorStop(0.76, "#fff6c7");
  fire.addColorStop(1, "rgba(102,142,230,0.6)");
  ctx.fillStyle = fire; ctx.shadowColor = "#ffb04a"; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.moveTo(12, 60);
  ctx.bezierCurveTo(0, 53, 5, 28, 14, 5);
  ctx.bezierCurveTo(12, 30, 26, 48, 12, 60); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,235,0.85)";
  ctx.beginPath(); ctx.ellipse(12, 47, 2.5, 10, 0, 0, Math.PI * 2); ctx.fill();
  addCanvasTexture(textures, STUDY_FLAME, canvas);
}
