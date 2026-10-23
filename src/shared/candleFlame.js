import { makeCanvas, addCanvasTexture } from "./paint.js";

// A candle's flame, drawn: a body of fire, its bright core, blue at its root.
// The rooms render their candles' wax and wick and leave the flame to this,
// kept alive over the render — never still.
export const CANDLE_FLAME = "candle_flame";

export function paintCandleFlame(textures) {
  if (textures.exists(CANDLE_FLAME)) return;
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
  addCanvasTexture(textures, CANDLE_FLAME, canvas);
}

export function releaseCandleFlame(textures) {
  if (textures.exists(CANDLE_FLAME)) textures.remove(CANDLE_FLAME);
}

/** A flame stood on a wick: `at` the layout's flame ({ x, y, s }: where the
 *  wick's tip is, how many pixels a centimetre is there). */
export function addCandleFlame(scene, at, depth = -7.9) {
  const height = 3.4 * at.s;
  const image = scene.add.image(at.x, at.y, CANDLE_FLAME).setOrigin(0.5, 0.94).setDisplaySize(height * 0.38, height).setDepth(depth);
  return { image, scale: { x: image.scaleX, y: image.scaleY } };
}

/** Each frame, `t` in seconds: the flame stretching, leaning, guttering. */
export function flickerCandleFlame(flame, t) {
  if (!flame) return;
  flame.image.setScale(flame.scale.x * (1 + 0.05 * Math.sin(t * 11)), flame.scale.y * (1 + 0.035 * Math.sin(t * 7)))
    .setRotation(0.035 * Math.sin(t * 5)).setAlpha(0.92 + 0.06 * Math.sin(t * 9));
}
