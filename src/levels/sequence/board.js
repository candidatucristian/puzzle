/**
 * The card-sorting study. A photoreal painted room is the backdrop; the
 * numbered cards and the small paper clues stay live so the puzzle remains
 * readable and draggable at every screen size.
 */

const ROOM = "seq_room";
const SHADOW = "seq_card_shadow";
const MOTE = "seq_mote";
export const STUDY_BACKGROUND = "seq_study_background";
export const STUDY_CARD = "seq_sticky_card_v3";
const _INK = "rgba(48,35,24,";

export function paintStudy(scene, W, H, L) {
  const S = Math.min(W, H);
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const backdrop = scene.textures.get(STUDY_BACKGROUND).getSourceImage();
  const sticky = scene.textures.get(STUDY_CARD).getSourceImage();
  ctx.drawImage(backdrop, 0, 0, W, H);
  paintBoard(ctx, L, S, sticky);
  paintNote(ctx, L.note, sticky);

  const textures = scene.textures;
  add(textures, ROOM, canvas);
  const card = L.slots[0];
  add(textures, SHADOW, paintShadow(card.w, card.h));
  if (!textures.exists(MOTE)) {
    textures.addCanvas(
      MOTE,
      radial(16, "255,226,170", [
        [0, 0.9],
        [0.35, 0.35],
        [1, 0],
      ]),
    );
  }
  return { room: ROOM, card: STUDY_CARD, shadow: SHADOW, mote: MOTE };
}

export function releaseStudyArt(textures) {
  for (const key of [ROOM, SHADOW, MOTE]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// Fine pencil marks show where the shuffled cards belong without covering
// the natural cork texture in the photograph.
function paintBoard(ctx, L, S, sticky) {
  const row = L.slotRow;
  ctx.save();
  ctx.strokeStyle = "rgba(43,31,20,0.27)";
  ctx.lineWidth = Math.max(0.8, S * 0.0011);
  ctx.setLineDash([Math.max(2, S * 0.003), Math.max(3, S * 0.004)]);
  for (const slot of L.slots) {
    ctx.strokeRect(
      slot.x - slot.w / 2,
      slot.y - slot.h / 2,
      slot.w,
      slot.h,
    );
  }
  ctx.restore();

  paintOrderNote(ctx, L.orderNote, sticky);

  // A real-looking paper slip carries the live concatenated answer.
  const width = row.w * 0.82;
  const height = Math.max(30, L.slots[0].w * 0.5);
  const x = row.x + row.w / 2 - width / 2;
  const y = L.fused.y - height / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.34)";
  ctx.shadowBlur = S * 0.012;
  ctx.shadowOffsetY = S * 0.005;
  const paper = ctx.createLinearGradient(0, y, 0, y + height);
  paper.addColorStop(0, "#f1e6d1");
  paper.addColorStop(0.48, "#e9ddc4");
  paper.addColorStop(1, "#d7c5a5");
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
  ctx.fillStyle = "rgba(255,250,235,0.46)";
  ctx.fillRect(x, y, width, Math.max(1, S * 0.001));
  ctx.strokeStyle = "rgba(111,77,45,0.24)";
  ctx.lineWidth = Math.max(0.8, S * 0.001);
  ctx.beginPath();
  ctx.moveTo(x + width * 0.07, L.fused.y + height * 0.32);
  ctx.lineTo(x + width * 0.93, L.fused.y + height * 0.32 + 0.5);
  ctx.stroke();
  for (const px of [x + height * 0.3, x + width - height * 0.3]) {
    pin(ctx, px, y + height * 0.25, Math.max(3, height * 0.12));
  }
}

// Draw a paper note with its transparent surroundings, preserving the fold
// and soft contact shadow as it scales with the board.
function paintNote(ctx, note, image) {
  ctx.save();
  ctx.translate(note.x + note.w / 2, note.y + note.h / 2);
  ctx.rotate(note.angle);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, -note.w / 2, -note.h / 2, note.w, note.h);
  ctx.restore();
}

function paintOrderNote(ctx, note, image) {
  paintNote(ctx, note, image);
  const label = "small → large";
  ctx.save();
  ctx.translate(note.x + note.w / 2, note.y + note.h / 2);
  ctx.rotate(note.angle);
  let size = Math.min(note.h * 0.24, note.w * 0.1);
  ctx.font = `600 ${size}px "Segoe Print", "Comic Sans MS", cursive`;
  const maxWidth = note.w * 0.78;
  size *= Math.min(1, maxWidth / ctx.measureText(label).width);
  ctx.font = `600 ${size}px "Segoe Print", "Comic Sans MS", cursive`;
  ctx.fillStyle = "rgba(54,39,27,0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 0, maxWidth);
  ctx.restore();
}

function _paintPencil(ctx, L, S) {
  const note = L.note;
  const length = Math.min(note.w * 0.9, S * 0.2);
  const thickness = Math.max(4, S * 0.008);
  const x = note.x - length * 0.15;
  const y = note.y + note.h + thickness * 2.5;
  if (y > L.H - thickness * 2) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = S * 0.004;
  ctx.shadowOffsetY = thickness * 0.7;
  const lacquer = ctx.createLinearGradient(0, -thickness / 2, 0, thickness / 2);
  lacquer.addColorStop(0, "#f2ca61");
  lacquer.addColorStop(0.48, "#dba32b");
  lacquer.addColorStop(1, "#99651b");
  ctx.fillStyle = lacquer;
  ctx.fillRect(-length / 2, -thickness / 2, length * 0.82, thickness);
  ctx.fillStyle = "#dfc39c";
  ctx.beginPath();
  ctx.moveTo(-length / 2 + length * 0.82, -thickness / 2);
  ctx.lineTo(length / 2, 0);
  ctx.lineTo(-length / 2 + length * 0.82, thickness / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#28221b";
  ctx.beginPath();
  ctx.moveTo(length / 2 - length * 0.05, -thickness * 0.12);
  ctx.lineTo(length / 2, 0);
  ctx.lineTo(length / 2 - length * 0.05, thickness * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b9b5a9";
  ctx.fillRect(-length / 2, -thickness / 2, length * 0.05, thickness);
  ctx.fillStyle = "#bd7371";
  ctx.fillRect(-length / 2 - length * 0.05, -thickness / 2, length * 0.05, thickness);
  ctx.restore();
}

function paintShadow(width, height) {
  const margin = Math.ceil(Math.max(width, height) * 0.28);
  const canvas = makeCanvas(width + margin * 2, height + margin * 2);
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = margin * 0.55;
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(margin, margin, width, height);
  return canvas;
}

function pin(ctx, x, y, radius) {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(x + radius * 0.45, y + radius * 0.6, radius * 0.85, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  const red = ctx.createRadialGradient(
    x - radius * 0.32,
    y - radius * 0.34,
    radius * 0.08,
    x,
    y,
    radius,
  );
  red.addColorStop(0, "#ff9989");
  red.addColorStop(0.5, "#b52c25");
  red.addColorStop(1, "#571711");
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.33, y - radius * 0.32, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function radial(size, rgb, stops) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, alpha] of stops) {
    gradient.addColorStop(offset, `rgba(${rgb},${alpha})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

function add(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  return textures.addCanvas(key, canvas);
}
