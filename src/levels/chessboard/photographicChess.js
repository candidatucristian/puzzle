import { makeCanvas, addCanvasTexture, polygon, vignette } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

export const CHESS_TABLE_PHOTOGRAPH = "chess_photographic_table_v1";
const MATERIALS = "chess_photographic_board_v1";
const PIECES = "chess_photographic_pieces_v1";
const cache = new WeakMap();
const RES = 1.6;
const UNIT = 0.082;
const TYPES = ["R_w", "K_w", "P_w", "Q_b", "K_b", "N_b", "B_w", "B_b"];
const WIDTH = { K: 48, Q: 46, B: 44, N: 45, R: 46, P: 40 };

export function loadChessPhotography(scene, { table = true } = {}) {
  const files = [[MATERIALS, "board-materials-v1.png"], [PIECES, "staunton-pieces-v1.png"]];
  if (table) files.push([CHESS_TABLE_PHOTOGRAPH, "chess-table-photographic-v1.png"]);
  for (const [key, file] of files) if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Chessboard/${file}`);
}

function crop(image, column, row, columns, rows, trim = false) {
  const w = Math.floor(image.width / columns), h = Math.floor(image.height / rows);
  const canvas = makeCanvas(w, h), ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, column * w, row * h, w, h, 0, 0, w, h);
  if (!trim) return canvas;
  const { data } = ctx.getImageData(0, 0, w, h);
  let left = w, right = -1, top = h, bottom = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] < 24) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return canvas;
  const cut = makeCanvas(right - left + 1, bottom - top + 1);
  cut.getContext("2d").drawImage(canvas, left, top, cut.width, cut.height, 0, 0, cut.width, cut.height);
  return cut;
}

export function chessPhotography(scene) {
  if (![MATERIALS, PIECES].every(key => scene.textures.exists(key))) return null;
  const image = scene.textures.get(MATERIALS).getSourceImage();
  if (cache.has(image)) return cache.get(image);
  const pieces = scene.textures.get(PIECES).getSourceImage();
  const art = {
    frame: crop(image, 0, 0, 2, 2), light: crop(image, 1, 0, 2, 2),
    dark: crop(image, 0, 1, 2, 2), edge: crop(image, 1, 1, 2, 2),
    pieces: Object.fromEntries(TYPES.map((type, i) => [type, crop(pieces, i % 4, Math.floor(i / 4), 4, 2, true)])),
  };
  cache.set(image, art);
  return art;
}

export function paintPhotographicChessTable(ctx, scene, W, H) {
  if (!scene.textures.exists(CHESS_TABLE_PHOTOGRAPH)) return false;
  ctx.drawImage(scene.textures.get(CHESS_TABLE_PHOTOGRAPH).getSourceImage(), 0, 0, W, H);
  vignette(ctx, W, H, 0.18);
  return true;
}

// The board geometry and its coordinates remain exact. Photography supplies
// the inlaid frame and real veneer; generated checker counts are never used.
export function paintPhotographicBoard(ctx, P, art, { coordinates = true } = {}) {
  const outer = 25.6, half = 22, height = 2.2, step = 5.5;
  const quad = (x0, z0, x1, z1, y = height) => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];
  const k = z => Math.abs(P(1, height, z).x - P(0, height, z).x);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = k(0) * 1.8;
  ctx.shadowOffsetX = k(0) * 0.9; ctx.shadowOffsetY = k(0) * 0.6;
  polygon(ctx, quad(-outer, -outer, outer, outer, 0)); ctx.fillStyle = "#070504"; ctx.fill(); ctx.restore();
  paintProjectedMaterial(ctx, art.edge, (u, v) => P(-outer + outer * 2 * u, height * (1 - v), -outer), 1, 4, 1);
  ctx.save(); polygon(ctx, [P(-outer, height, -outer), P(outer, height, -outer), P(outer, 0, -outer), P(-outer, 0, -outer)]);
  ctx.fillStyle = "rgba(5,3,2,0.42)"; ctx.fill(); ctx.restore();
  paintProjectedMaterial(ctx, art.frame, (u, v) => P(-outer + outer * 2 * u, height, -outer + outer * 2 * v), 1, 12, 12);
  for (let file = 0; file < 8; file++) for (let rank = 0; rank < 8; rank++) {
    const x = -half + file * step, z = -half + rank * step;
    const tile = (file + rank) % 2 === 0 ? art.dark : art.light;
    paintProjectedMaterial(ctx, tile, (u, v) => P(x + step * u, height, z + step * v), 1, 2, 2);
    polygon(ctx, quad(x, z, x + step, z + step));
    ctx.fillStyle = `rgba(12,7,3,${0.06 + ((file * 7 + rank * 11) % 5) * 0.018})`; ctx.fill();
  }
  polygon(ctx, quad(-half - 0.4, -half - 0.4, half + 0.4, half + 0.4));
  ctx.lineWidth = Math.max(0.5, k(0) * 0.07); ctx.strokeStyle = "rgba(194,155,87,0.7)"; ctx.stroke();
  if (!coordinates) return;
  const label = (text, x, z, alpha) => {
    const p = P(x, height, z), size = Math.max(10, k(z) * 1.75);
    ctx.font = `600 ${size}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(13,7,3,0.8)"; ctx.fillText(text, p.x + 0.7, p.y + 0.9);
    ctx.fillStyle = `rgba(234,212,166,${alpha})`; ctx.fillText(text, p.x, p.y);
  };
  const mid = (half + outer) / 2;
  for (let i = 0; i < 8; i++) {
    const at = -half + (i + 0.5) * step;
    label("abcdefgh"[i], at, -mid, 0.95); label("abcdefgh"[i], at, mid, 0.7);
    label(String(i + 1), -mid, at, 0.95); label(String(i + 1), mid, at, 0.7);
  }
}

export function photographicPiece(textures, art, kind, white) {
  const type = `${kind}_${white ? "w" : "b"}`, source = art.pieces[type];
  const key = `ch_piece_photo_${type}`, width = WIDTH[kind] * RES;
  const canvas = makeCanvas(width, width * source.height / source.width);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  const oy = (canvas.height - canvas.width * 0.24) / canvas.height;
  if (!textures.exists(key)) addCanvasTexture(textures, key, canvas);
  return { key, canvas, ox: 0.5, oy, height: canvas.height * oy / RES };
}

export function photographicPieceShadow(textures, piece, kind, white) {
  const key = `ch_shadow_photo_${kind}_${white ? "w" : "b"}`;
  if (!textures.exists(key)) {
    const canvas = makeCanvas(160, 92), g = canvas.getContext("2d");
    g.save(); g.translate(44, 32); g.transform(1, 0, -0.65, -0.22, 0, 0);
    g.filter = "blur(1.2px)";
    g.drawImage(piece.canvas, -piece.canvas.width / (2 * RES), -piece.canvas.height * piece.oy / RES, piece.canvas.width / RES, piece.canvas.height / RES);
    g.restore(); g.globalCompositeOperation = "source-in"; g.fillStyle = "#080503"; g.fillRect(0, 0, 160, 92);
    g.globalCompositeOperation = "source-over";
    const contact = g.createRadialGradient(44, 32, 1, 44, 32, WIDTH[kind] * 0.5);
    contact.addColorStop(0, "rgba(4,3,2,0.7)"); contact.addColorStop(1, "rgba(4,3,2,0)");
    g.save(); g.translate(44, 32); g.scale(1, 0.45); g.translate(-44, -32);
    g.fillStyle = contact; g.fillRect(15, 4, 60, 56); g.restore();
    addCanvasTexture(textures, key, canvas);
  }
  return { key, ox: 44 / 160, oy: 32 / 92 };
}

export function paintRoomChess(ctx, scene, L, game) {
  const art = chessPhotography(scene);
  if (!art) return;
  const b = L.board;
  const P = (x, y, z) => L.Q(b.x0 + (x + 25.6) / 51.2 * (b.x1 - b.x0), b.y + y - 2.2, b.d0 + (z + 25.6) / 51.2 * (b.d1 - b.d0));
  paintPhotographicBoard(ctx, P, art, { coordinates: false });
  const kinds = ["R", "K", "P", "Q", "K", "N", "B", "B"];
  [...game.map((p, i) => ({ p, i }))].sort((a, b) => b.p[1] - a.p[1]).forEach(({ p: [file, rank, white], i }) => {
    const piece = photographicPiece(scene.textures, art, kinds[i], white);
    const at = P(-22 + (file + 0.5) * 5.5, 2.2, -22 + (rank + 0.5) * 5.5);
    const scale = at.s * UNIT / RES;
    ctx.drawImage(piece.canvas, at.x - piece.canvas.width * piece.ox * scale, at.y - piece.canvas.height * piece.oy * scale, piece.canvas.width * scale, piece.canvas.height * scale);
  });
}
