import { addCanvasTexture, glowCanvas, makeCanvas, polygon, soft, vignette } from "../../shared/paint.js";
import { thingAt } from "../house/roomKit.js";
import { loadPhialsPhotography, photographPhialRack } from "../phials/photography.js";

export const ROOM7_PHOTOGRAPH = "room7_photographic_interior_v1";
const SOURCE = { width: 1659, height: 948 };
// The little rack of phials at the right-hand end of the sink counter (the
// TWO PHIALS puzzle), in the photograph's pixels: where it stands, and what
// is clicked to open it.
const RACK = { x: 1317, base: 541 };
// The notebook remains a photographed book when it is pulled from the shelf.
const NOTEBOOK = [[1507, 391], [1545, 395], [1533, 494], [1492, 488]];

export function loadRoom7Photography(scene) {
  if (!scene.textures.exists(ROOM7_PHOTOGRAPH)) {
    scene.load.image(ROOM7_PHOTOGRAPH, "assets/images/Room7/room7-photographic-v1.png");
  }
  loadPhialsPhotography(scene);
}

export function alignRoom7Photography(L) {
  const sx = L.W / SOURCE.width, sy = L.H / SOURCE.height;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  const quad = points => points.map(([x, y]) => point(x, y));
  L.photographic = true;
  L.win = { ...L.win, cx: 1068 * sx, rx: 136 * sx, top: 125 * sy, sill: 458 * sy };
  L.things = [
    thingAt("chemistry", "Look at the bottles", quad([[600, 428], [771, 428], [771, 546], [600, 546]])),
    Object.assign(thingAt("molecules", "Take out his notebook", quad([[1480, 384], [1552, 385], [1540, 501], [1477, 498]])), { before: true }),
    thingAt("phials", "Look at the phials", quad([[RACK.x - 28, RACK.base - 44], [RACK.x + 42, RACK.base - 44], [RACK.x + 42, RACK.base + 8], [RACK.x - 28, RACK.base + 8]])),
  ];
  L.glows = {
    lamp: { ...point(419, 427), r: 85 * sy },
    burner: { ...point(817, 497), r: 38 * sy },
  };
  L.photoUranium = { ...point(716, 493), r: 16 * sy };
}

export function paintRoom7Photography(scene, L, keys) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  ctx.drawImage(scene.textures.get(ROOM7_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  if (!L.on) {
    for (const [at, rx, ry] of [[L.glows.lamp, 250, 255], [L.glows.burner, 115, 135]]) {
      soft(ctx, at.x, at.y, rx * L.W / SOURCE.width, ry * L.H / SOURCE.height, "3,5,8", 0.72);
      soft(ctx, at.x, at.y, 14 * L.W / SOURCE.width, 24 * L.H / SOURCE.height, "3,5,8", 0.94);
    }
  }
  paintPhialRack(ctx, L, scene);
  vignette(ctx, L.W, L.H, 0.19);
  addCanvasTexture(scene.textures, keys.room, canvas);
  addCanvasTexture(scene.textures, keys.glow, glowCanvas());
  return keys;
}

export function paintRoom7Notebook(ctx, scene, L, fraction) {
  if (fraction <= 0) return;
  const dx = -18 * fraction, dy = 4 * fraction;
  const points = NOTEBOOK.map(([x, y]) => ({ x, y }));
  const shifted = points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  ctx.save();
  ctx.scale(L.W / SOURCE.width, L.H / SOURCE.height);
  polygon(ctx, points); ctx.fillStyle = "#100d09"; ctx.fill();
  // The exposed page block and cover return connect the book to its shelf.
  polygon(ctx, [points[0], points[1], shifted[1], shifted[0]]);
  ctx.fillStyle = "#9b8b65"; ctx.fill();
  polygon(ctx, [points[1], points[2], shifted[2], shifted[1]]);
  ctx.fillStyle = "#172119"; ctx.fill();
  ctx.translate(dx, dy);
  polygon(ctx, points); ctx.clip();
  ctx.drawImage(scene.textures.get(ROOM7_PHOTOGRAPH).getSourceImage(), 0, 0, SOURCE.width, SOURCE.height);
  ctx.restore();
}

// The rack on the counter, small as it is from the door: walnut, a phial of
// yellow, an empty tube, a phial of blue, and a pale fleck of tag on its post.
function paintPhialRack(ctx, L, scene) {
  const { x, base } = RACK;
  ctx.save();
  ctx.scale(L.W / SOURCE.width, L.H / SOURCE.height);
  const photograph = photographPhialRack(scene);
  if (photograph) {
    const scale = 48 / photograph.woodWidth;
    soft(ctx, x, base + .5, 27, 3, "0,0,0", .58);
    ctx.filter = `brightness(${L.on ? .74 : .62}) saturate(.88)`;
    ctx.drawImage(photograph.canvas, x - photograph.centre * scale, base - photograph.base * scale,
      photograph.canvas.width * scale, photograph.canvas.height * scale);
    ctx.restore();
    return;
  }
  // its shadow on the slate
  soft(ctx, x - 3, base + 1, 24, 4, "0,0,0", 0.55);
  // the foot board and the two posts
  ctx.fillStyle = "#3a2210"; ctx.fillRect(x - 17, base - 3, 34, 3);
  ctx.fillStyle = "#2a170a"; ctx.fillRect(x - 17, base - 18, 3, 15); ctx.fillRect(x + 14, base - 18, 3, 15);
  // the three tubes, standing through the upper bar
  const tubes = [[-10, "236,196,44"], [0, null], [10, "44,104,214"]];
  for (const [dx, colour] of tubes) {
    const tx = x + dx, top = base - 30;
    ctx.fillStyle = "rgba(200,215,225,0.18)"; ctx.fillRect(tx - 2.6, top, 5.2, 27);
    if (colour) {
      ctx.fillStyle = `rgba(${colour},0.92)`; ctx.fillRect(tx - 2.4, top + 11, 4.8, 16);
      ctx.fillStyle = "#8a6438"; ctx.fillRect(tx - 2.8, top - 3, 5.6, 4);
    }
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(tx - 1.8, top + 3, 0.9, 20);
  }
  // the upper bar, over them
  ctx.fillStyle = "#4a2c14"; ctx.fillRect(x - 17, base - 19, 34, 3);
  ctx.fillStyle = "rgba(255,220,170,0.25)"; ctx.fillRect(x - 17, base - 19, 34, 0.8);
  // the tag, hanging from the right post
  ctx.fillStyle = "#b9a985"; ctx.save(); ctx.translate(x + 19, base - 14); ctx.rotate(0.1); ctx.fillRect(0, 0, 9, 5); ctx.restore();
  ctx.restore();
}
