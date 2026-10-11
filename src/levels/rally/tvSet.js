import { soft, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The television the RALLY stage is watched on when it is found in the
 *  house: a flat one hung on the drawing room's wall — a narrow black frame
 *  round the glass, a small red lamp at its lower corner, the dark red paper
 *  of the wall beyond. The picture is shown `zoom` of its size and this goes
 *  over and round it; over the picture itself, only the room's light on the
 *  glass and the frame's shadow along its top.
 *
 *  Painted once per screen size. */

const KEY = "ry_tv";

export function paintTvFrame(scene, W, H, zoom) {
  const FW = Math.ceil(W / zoom), FH = Math.ceil(H / zoom);
  const c = makeCanvas(FW, FH);
  const ctx = c.getContext("2d");
  const rnd = lcg(7707);
  const x0 = (FW - W) / 2, y0 = (FH - H) / 2;
  const edge = Math.min(x0, y0) * 0.42;
  // the wall: the room's red paper, faintly striped, dark
  ctx.fillStyle = "#150a0c";
  ctx.fillRect(0, 0, FW, FH);
  ctx.fillStyle = "rgba(230,170,170,0.03)";
  for (let x = 0; x < FW; x += 26) ctx.fillRect(x, 0, 9, FH);
  for (let i = 0; i < 30; i++) soft(ctx, rnd() * FW, rnd() * FH, 60 + rnd() * 160, 40 + rnd() * 100, "0,0,0", 0.08);
  // the set's shadow on it, and its light
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = edge * 1.4;
  ctx.shadowOffsetY = edge * 0.5;
  ctx.fillStyle = "#000";
  ctx.fillRect(x0 - edge, y0 - edge, W + edge * 2, H + edge * 2);
  ctx.restore();
  // the frame: black, a thin light along its top edge and its inner lip
  ctx.fillStyle = "#0b0b0d";
  ctx.beginPath(); ctx.roundRect(x0 - edge, y0 - edge, W + edge * 2, H + edge * 2, edge * 0.5); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x0 - edge * 0.6, y0 - edge, W + edge * 1.2, 1.5);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x0 - 1, y0 - 1, W + 2, H + 2);
  ctx.fillStyle = "#c0281c";
  ctx.beginPath(); ctx.arc(x0 + W - edge * 1.4, y0 + H + edge * 0.5, Math.max(1.6, edge * 0.1), 0, Math.PI * 2); ctx.fill();
  // ── the glass: the picture shows through it
  ctx.clearRect(x0, y0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
  soft(ctx, x0 + W * 0.16, y0 + H * 0.1, W * 0.24, H * 0.1, "220,230,255", 0.05, "lighter");
  const top = ctx.createLinearGradient(0, y0, 0, y0 + edge * 0.5);
  top.addColorStop(0, "rgba(0,0,0,0.5)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(x0, y0, W, edge * 0.5);
  ctx.restore();
  addCanvasTexture(scene.textures, KEY, c);
  return KEY;
}

export function releaseTvFrame(textures) {
  if (textures.exists(KEY)) textures.remove(KEY);
}
