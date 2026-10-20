import { makeCanvas, polygon, soft, vignette } from "../../shared/paint.js";
import { TAG } from "./puzzle.js";

const ROOM = "phials_laboratory_photo_v1";
const GLASS = "phials_glass_photo_v1";
const SOURCE = { w: 1536, h: 1024 };
const GLASS_BOUNDS = [[178, 14, 188, 968], [677, 89, 188, 893], [1175, 14, 188, 968]];
const glassCache = new WeakMap();
const rackCache = new WeakMap();
// Only the front face covers the tubes. The holes remain behind the glass.
const FRONT = [[509, 522], [1049, 524], [1049, 558], [509, 557]];

export function loadPhialsPhotography(scene) {
  for (const [key, file] of [[ROOM, "laboratory-rack-v1.png"], [GLASS, "glass-phials-v1.png"]]) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Phials/${file}`);
  }
}

export function alignPhialsPhotography(scene, L) {
  if (!scene.textures.exists(ROOM) || !scene.textures.exists(GLASS)) return;
  const sx = L.W / SOURCE.w, sy = L.H / SOURCE.h;
  L.photographic = true;
  L.tube = { w: 76 * sx, h: 400 * sy };
  L.lift = 238 * sy;
  L.barY = 522 * sy;
  for (const t of L.tubes) t.home = { x: [629, 779, 930][t.i] * sx, y: 709 * sy + 3 * L.u };
  L.clearAt = (709 * sy - L.barY) / L.lift;
}

export function photographPhialsRoom(scene, L) {
  if (!L.photographic) return null;
  const c = makeCanvas(L.W, L.H), g = c.getContext("2d");
  g.filter = "brightness(.76) saturate(.82)";
  g.drawImage(scene.textures.get(ROOM).getSourceImage(), 0, 0, L.W, L.H);
  g.filter = "none";
  for (const t of L.tubes) soft(g, t.home.x, t.home.y - 3 * L.u, L.tube.w * .6, 3 * L.u, "0,0,0", .38);
  // The photograph supplies the paper and twine; keep the clue as real text.
  g.save();
  g.scale(L.W / SOURCE.w, L.H / SOURCE.h);
  g.translate(1195, 655); g.rotate(.19);
  g.fillStyle = "#302318";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = '500 26px "Dancing Script", "Segoe Script", cursive';
  g.fillText(TAG, 0, 0, 132);
  g.restore();
  vignette(g, L.W, L.H, .25);
  return c;
}

export function photographPhialsFront(L, room) {
  if (!L.photographic) return null;
  const c = makeCanvas(L.W, L.H), g = c.getContext("2d");
  polygon(g, FRONT.map(([x, y]) => ({ x: x * L.W / SOURCE.w, y: y * L.H / SOURCE.h })));
  g.clip(); g.drawImage(room, 0, 0);
  return c;
}

export function photographPhial(scene, index) {
  if (!scene.textures.exists(GLASS)) return null;
  const source = scene.textures.get(GLASS).getSourceImage();
  if (!glassCache.has(source)) {
    const crops = GLASS_BOUNDS.map(([x, y, w, h]) => {
      const sx = source.width / SOURCE.w, sy = source.height / SOURCE.h;
      const c = makeCanvas(Math.ceil(w * sx), Math.ceil(h * sy)), g = c.getContext("2d");
      g.drawImage(source, x * sx, y * sy, w * sx, h * sy, 0, 0, c.width, c.height);
      const pixels = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
        if (pixels[(py * c.width + px) * 4 + 3] < 18) continue;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      if (x1 < x0) return null;
      const crop = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
      crop.getContext("2d").drawImage(c, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
      return crop;
    });
    glassCache.set(source, crops);
  }
  return glassCache.get(source)[index];
}

/** The same rack and glass as the close-up, isolated for the room overview.
 *  Source coordinates also preserve its paper tag and the order of the tubes.
 *  The interior stays transparent so the room can be seen between the posts. */
export function photographPhialRack(scene) {
  if (!scene.textures.exists(ROOM) || !scene.textures.exists(GLASS)) return null;
  const source = scene.textures.get(ROOM).getSourceImage();
  if (rackCache.has(source)) return rackCache.get(source);
  const bounds = { x: 464, y: 260, w: 816, h: 510 };
  const c = makeCanvas(bounds.w, bounds.h), g = c.getContext("2d");
  g.translate(-bounds.x, -bounds.y);
  const piece = points => {
    g.save();
    polygon(g, points.map(([x, y]) => ({ x, y }))); g.clip();
    g.drawImage(source, 0, 0, SOURCE.w, SOURCE.h);
    g.restore();
  };
  // Walnut foot board, posts and the upper board, including its three holes.
  for (const points of [
    [[508, 687], [1049, 687], [1049, 758], [508, 753]],
    [[467, 476], [472, 457], [482, 447], [516, 448], [527, 463], [529, 494], [510, 522], [510, 759], [469, 760]],
    [[1037, 466], [1043, 451], [1070, 450], [1087, 462], [1095, 494], [1088, 765], [1047, 764], [1037, 747]],
    [[510, 494], [1040, 496], [1051, 525], [1049, 558], [509, 556]],
    [[1118, 595], [1138, 587], [1276, 617], [1269, 723], [1110, 690]],
  ]) piece(points);
  g.strokeStyle = "#a68b66"; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(1091, 514); g.quadraticCurveTo(1119, 552, 1144, 609); g.stroke();
  g.save(); g.translate(1195, 655); g.rotate(.19);
  g.fillStyle = "#302318"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = '500 26px "Dancing Script", "Segoe Script", cursive';
  g.fillText(TAG, 0, 0, 132); g.restore();
  for (let i = 0; i < 3; i++) {
    const glass = photographPhial(scene, i);
    if (!glass) continue;
    const height = i === 1 ? 400 : 437.6;
    g.save(); g.filter = "brightness(.82) saturate(.86)";
    g.drawImage(glass, [629, 779, 930][i] - 41, 709 - height, 82, height);
    g.restore();
  }
  piece(FRONT);
  const rack = { canvas: c, centre: 780 - bounds.x, base: 765 - bounds.y, woodWidth: 632 };
  rackCache.set(source, rack);
  return rack;
}
