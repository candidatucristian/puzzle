import { makeCanvas, addCanvasTexture, glowCanvas, polygon, soft, vignette } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

export const LIBRARY_PHOTOGRAPH = "bookshelf_photographic_library_v1";
const BINDINGS = "bookshelf_photographic_bindings_v1";
const ROW = "bookshelf_photographic_row_v1";
const cache = new WeakMap();

export function loadLibraryPhotography(scene) {
  for (const [key, url] of [
    [LIBRARY_PHOTOGRAPH, "assets/images/Bookshelf/library-photographic-v1.webp"],
    [BINDINGS, "assets/images/Bookshelf/bindings-photographic-v1.webp"],
    [ROW, "assets/images/Bookshelf/book-row-photographic-v1.webp"],
  ]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function alignLibraryPhotography(L) {
  const c = L.case, old = c.bays.map(bay => ({ ...bay })), oldRows = c.rows.map(row => ({ ...row }));
  const oldCentre = L.vp.x, sx = L.W / 1659, sy = L.H / 948;
  c.x0 = 354 * sx; c.x1 = 1286 * sx;
  c.w = c.x1 - c.x0; c.side = 39 * sx; c.div = 28 * sx;
  c.top = 68 * sy; c.base = 824 * sy; c.innerTop = 117 * sy; c.innerBot = 727 * sy; c.board = 12 * sy;
  c.bays = [
    { x0: 393 * sx, x1: 805 * sx },
    { x0: 833 * sx, x1: 1243 * sx },
  ];
  c.rows = [[117, 258], [274, 410], [423, 567], [583, 727]].map(([top, bot]) => ({ top: top * sy, bot: bot * sy, h: (bot - top) * sy }));
  for (const b of L.books) {
    const side = (b.x0 + b.x1) / 2 < oldCentre ? 0 : 1;
    const scale = (c.bays[side].x1 - c.bays[side].x0) / (old[side].x1 - old[side].x0);
    b.x0 = c.bays[side].x0 + (b.x0 - old[side].x0) * scale;
    b.x1 = c.bays[side].x0 + (b.x1 - old[side].x0) * scale;
    if (b.h) b.h *= c.rows[b.row].h / oldRows[b.row].h;
  }
  L.vp.x = 819 * sx;
  L.table = { x: 1459 * sx, y: 584 * sy, r: 128 * sx };
  L.lamp.x = 1458 * sx; L.lamp.base = 573 * sy;
  L.lamp.shadeTop = 360 * sy; L.lamp.shadeBot = 464 * sy;
  L.lamp.bulb = { x: L.lamp.x, y: 450 * sy };
  L.cup = { x: 1518 * sx, y: 568 * sy, s: L.u };
  L.photographic = true;
}

function trim(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas, { data } = ctx.getImageData(0, 0, width, height);
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 24) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return canvas;
  const cut = makeCanvas(right - left + 1, bottom - top + 1);
  cut.getContext("2d").drawImage(canvas, left, top, cut.width, cut.height, 0, 0, cut.width, cut.height);
  return cut;
}

function cell(image, index) {
  const w = Math.floor(image.width / 3), h = Math.floor(image.height / 2);
  const canvas = makeCanvas(w, h);
  canvas.getContext("2d").drawImage(image, index % 3 * w, Math.floor(index / 3) * h, w, h, 0, 0, w, h);
  return trim(canvas);
}

function photography(scene) {
  if (![LIBRARY_PHOTOGRAPH, BINDINGS, ROW].every(key => scene.textures.exists(key))) return null;
  const image = scene.textures.get(BINDINGS).getSourceImage();
  if (cache.has(image)) return cache.get(image);
  const paper = cell(image, 5), paperGrain = makeCanvas(128, 256);
  paperGrain.getContext("2d").drawImage(paper, paper.width * 0.2, paper.height * 0.22, paper.width * 0.6, paper.height * 0.56, 0, 0, 128, 256);
  const rowImage = scene.textures.get(ROW).getSourceImage(), rowCanvas = makeCanvas(rowImage.width, rowImage.height);
  rowCanvas.getContext("2d").drawImage(rowImage, 0, 0);
  const art = { skins: Array.from({ length: 5 }, (_, i) => cell(image, i)), paper, paperGrain, row: trim(rowCanvas) };
  cache.set(image, art);
  return art;
}

const front = (L, x, y) => ({ x: L.vp.x + (x - L.vp.x) * (1 + L.pull), y: L.vp.y + (y - L.vp.y) * (1 + L.pull) });

function paintBook(L, book, art) {
  const row = L.case.rows[book.row], top = row.bot - book.h;
  const backL = { x: book.x0, y: top }, backR = { x: book.x1, y: top };
  const p0 = front(L, book.x0, top), p1 = front(L, book.x1, row.bot);
  const markH = row.h * 0.24, pad = 7 * L.u;
  const x = Math.min(book.x0, p0.x) - pad, y = Math.min(top, p0.y) - markH - pad;
  const w = Math.max(book.x1, p1.x) + pad - x, h = p1.y + pad * 2 - y;
  const canvas = makeCanvas(w * 2, h * 2), g = canvas.getContext("2d");
  g.scale(2, 2); g.translate(-x, -y);
  const skin = art.skins[book.i], sw = p1.x - p0.x, sh = p1.y - p0.y;
  soft(g, (p0.x + p1.x) / 2 + 3 * L.u, p1.y, sw * 0.85, 4 * L.u, "0,0,0", 0.65);
  const rightSide = (book.x0 + book.x1) / 2 < L.vp.x;
  const bx = rightSide ? book.x1 : book.x0, fx = rightSide ? p1.x : p0.x;
  // Real leather is projected onto the exposed cover as well as the spine.
  paintProjectedMaterial(g, skin, (u, v) => ({ x: bx + (fx - bx) * u, y: top + (p0.y - top) * u + book.h * (1 + L.pull * u) * v }), 1, 1, 1);
  g.save(); polygon(g, [{ x: bx, y: top }, { x: fx, y: p0.y }, { x: fx, y: p1.y }, { x: bx, y: row.bot }]);
  g.fillStyle = "rgba(5,3,2,0.4)"; g.fill(); g.restore();
  const inset = sw * 0.1;
  paintProjectedMaterial(g, art.paperGrain, (u, v) => ({
    x: backL.x + inset + (backR.x - backL.x - inset * 2) * u + (p0.x - backL.x) * v,
    y: top + (p0.y - top) * v,
  }), 1, 4, 1);
  g.strokeStyle = "rgba(54,33,13,0.28)"; g.lineWidth = 0.55;
  for (let i = 1; i < 5; i++) {
    const v = i / 5;
    g.beginPath(); g.moveTo(backL.x + inset + (p0.x - backL.x) * v, top + (p0.y - top) * v);
    g.lineTo(backR.x - inset + (p1.x - backR.x) * v, top + (p0.y - top) * v); g.stroke();
  }
  g.drawImage(skin, p0.x, p0.y, sw, sh);
  // Gold titles stay native text: every letter is part of the book cipher.
  const size = Math.min(sw * 0.56, sh * 0.7 / (book.title.length * 0.78));
  g.save(); g.translate(p0.x + sw / 2, p0.y + sh / 2); g.rotate(Math.PI / 2);
  g.font = `700 ${size}px Georgia, "Times New Roman", serif`; g.textAlign = "center"; g.textBaseline = "middle";
  if ("letterSpacing" in g) g.letterSpacing = `${size * 0.1}px`;
  g.fillStyle = "rgba(20,10,3,0.8)"; g.fillText(book.title, 0.7, 0.9);
  const gilt = g.createLinearGradient(0, -size / 2, 0, size / 2);
  gilt.addColorStop(0, "#efcf84"); gilt.addColorStop(0.42, "#d3ad58"); gilt.addColorStop(0.7, "#f1d594"); gilt.addColorStop(1, "#ae823b");
  g.fillStyle = gilt; g.fillText(book.title, 0, 0); g.restore();
  const mx = (backL.x + backR.x + p0.x + p1.x) / 4, my = (top + p0.y) / 2;
  const mw = Math.min(sw * 0.51, 26 * L.u), cropH = Math.min(art.paper.height, art.paper.width * markH / mw);
  g.save(); g.translate(mx, my); g.rotate((book.i % 2 ? 1 : -1) * 0.045);
  soft(g, 2 * L.u, -markH * 0.45, mw * 0.58, markH * 0.6, "0,0,0", 0.3);
  g.drawImage(art.paper, 0, 0, art.paper.width, cropH, -mw / 2, -markH, mw, markH);
  g.fillStyle = "#302519"; g.font = `700 ${markH * 0.6}px Georgia, serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(book.mark), 0, -markH * 0.47);
  g.restore();
  const litCanvas = makeCanvas(canvas.width, canvas.height), light = litCanvas.getContext("2d");
  light.drawImage(canvas, 0, 0); light.globalCompositeOperation = "source-atop";
  light.fillStyle = "rgba(12,9,5,0.12)"; light.fillRect(0, 0, litCanvas.width, litCanvas.height);
  light.fillStyle = "rgba(255,204,126,0.045)"; light.fillRect(0, 0, litCanvas.width, litCanvas.height);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = `rgba(4,6,8,${0.42 - book.i * 0.035})`; g.fillRect(x, y, w, h);
  return { canvas, litCanvas, x, y, w, h, cx: (p0.x + p1.x) / 2, cy: (p0.y + p1.y) / 2 };
}

export function paintPhotographicLibrary(scene, L, keys, steam) {
  const art = photography(scene);
  if (!L.photographic || !art) return null;
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  ctx.drawImage(scene.textures.get(LIBRARY_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  const special = L.books.filter(b => b.kind === "special").sort((a, b) => a.i - b.i);
  const row = L.case.rows[L.special];
  for (const bay of L.case.bays) {
    ctx.save(); ctx.beginPath(); ctx.rect(bay.x0, row.top, bay.x1 - bay.x0, row.h);
    for (const b of special) if (b.x0 >= bay.x0 && b.x0 < bay.x1) ctx.rect(b.x0 - L.u, row.top, b.x1 - b.x0 + L.u * 2, row.h);
    ctx.clip("evenodd");
    ctx.filter = "brightness(0.56) saturate(0.88)";
    ctx.drawImage(art.row, bay.x0, row.bot - row.h * 0.88, bay.x1 - bay.x0, row.h * 0.88);
    ctx.restore();
    soft(ctx, (bay.x0 + bay.x1) / 2, row.top, (bay.x1 - bay.x0) * 0.55, row.h * 0.32, "0,0,0", 0.5);
  }
  vignette(ctx, L.W, L.H, 0.12);
  addCanvasTexture(scene.textures, keys.room, canvas);
  addCanvasTexture(scene.textures, keys.glow, glowCanvas());
  addCanvasTexture(scene.textures, keys.steam, steam);
  addCanvasTexture(scene.textures, keys.tail, makeCanvas(1, 1));
  const books = special.map(b => {
    const book = paintBook(L, b, art), key = `bk_book_${b.i}`, lightKey = `bk_book_lit_${b.i}`;
    addCanvasTexture(scene.textures, key, book.canvas); addCanvasTexture(scene.textures, lightKey, book.litCanvas);
    return { key, lightKey, x: book.x, y: book.y, w: book.w, h: book.h, cx: book.cx, cy: book.cy };
  });
  return { keys, books };
}
