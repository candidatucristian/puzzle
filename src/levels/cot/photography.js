import { makeCanvas } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

export const COT_PHOTOS = {
  room: "cot_photo_closeup_mahogany_v2", overview: "cot_photo_overview_mahogany_v2",
  objects: "cot_photo_objects_v1", belongings: "cot_photo_belongings_v1",
  extras: "cot_extra_toys_v1", hoop: "cot_mobile_hoop_v1",
};
const FILES = [[COT_PHOTOS.room, "cot-closeup-mahogany-v2.webp"], [COT_PHOTOS.overview, "cot-room-mahogany-v2.webp"],
  [COT_PHOTOS.objects, "cot-objects-v1.webp"], [COT_PHOTOS.belongings, "cot-belongings-v1.webp"],
  [COT_PHOTOS.extras, "cot-extra-toys-v1.webp"], [COT_PHOTOS.hoop, "cot-mobile-hoop-v1.webp"]];
const CROPS = {
  musicbox: [40, 5, 400, 416], oscar: [550, 0, 154, 424], book: [834, 54, 411, 350],
  chaplin: [90, 425, 243, 432], hotel: [422, 420, 411, 440], dancers: [946, 428, 266, 431],
  hat: [26, 911, 390, 281], moon: [487, 864, 304, 340], star: [877, 866, 344, 339],
  pillow: [22, 72, 390, 280], blanket: [433, 40, 395, 354], bootees: [864, 60, 367, 330],
  teddy: [43, 416, 363, 411], rabbit: [471, 419, 293, 405], rattle: [877, 455, 329, 354],
  cloud: [20, 911, 402, 273],
  duck: [8, 8, 406, 406], train: [434, 8, 406, 406], rockingHorse: [861, 8, 406, 406],
  blocks: [8, 434, 406, 406], ball: [434, 434, 406, 406], rings: [861, 434, 406, 406],
  top: [8, 861, 406, 406], firetruck: [434, 861, 406, 406], elephant: [861, 861, 406, 406],
  hoop: [0, 0, 1280, 1280],
  // the music box's winding key, out of its side: taken off the box's own
  // photograph (and cleared from it) so that it can turn
  key: [378, 260, 62, 96],
};
// the parts cut off a thing's photograph, and the thing they were cut from
const PARTS_OF = { key: "musicbox" };
const BELONGINGS = new Set(["pillow", "blanket", "bootees", "teddy", "rabbit", "rattle", "cloud"]);
const EXTRAS = new Set(["duck", "train", "rockingHorse", "blocks", "ball", "rings", "top", "firetruck", "elephant"]);
const cache = new WeakMap();

export function loadCotPhotography(scene, overviewOnly = false) {
  for (const [key, file] of FILES) {
    if (overviewOnly && (key === COT_PHOTOS.room || key === COT_PHOTOS.hoop)) continue;
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Cot/${file}`);
  }
}

export function cotPhotograph(scene, key) {
  return scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null;
}

export function cotObject(scene, id) {
  const key = id === "hoop" ? COT_PHOTOS.hoop : EXTRAS.has(id) ? COT_PHOTOS.extras
    : BELONGINGS.has(id) ? COT_PHOTOS.belongings : COT_PHOTOS.objects;
  const source = cotPhotograph(scene, key);
  if (!source || !CROPS[id]) return null;
  if (!cache.has(source)) cache.set(source, new Map());
  const objects = cache.get(source);
  if (objects.has(id)) return objects.get(id);
  const [x, y, w, h] = CROPS[id], sx = source.width / 1280, sy = source.height / 1280;
  const c = makeCanvas(Math.ceil(w * sx), Math.ceil(h * sy)), g = c.getContext("2d");
  g.drawImage(source, x * sx, y * sy, w * sx, h * sy, 0, 0, c.width, c.height);
  for (const [part, owner] of Object.entries(PARTS_OF)) {
    if (owner !== id) continue;
    const [px, py, pw, ph] = CROPS[part];
    g.clearRect((px - x) * sx, (py - y) * sy, pw * sx, ph * sy);
  }
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = -1, y0 = c.height, y1 = -1;
  for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
    if (data[(py * c.width + px) * 4 + 3] < 24) continue;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  if (x1 < x0) return null;
  const crop = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  crop.getContext("2d").drawImage(c, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
  if (id === "book") titleBook(crop);
  // where it lies in the photograph, after its empty margins were trimmed
  crop.photo = { x: x * sx + x0, y: y * sy + y0 };
  objects.set(id, crop);
  return crop;
}

/** Where a part cut off a thing (the music box's key) lies in that thing's
 *  picture, in the picture's pixels: its top left corner. */
export function cotPartPlace(scene, part) {
  const piece = cotObject(scene, part), owner = cotObject(scene, PARTS_OF[part]);
  if (!piece || !owner) return null;
  return { x: piece.photo.x - owner.photo.x, y: piece.photo.y - owner.photo.y, w: piece.width, h: piece.height, ow: owner.width, oh: owner.height };
}

function titleBook(c) {
  const title = makeCanvas(250, 180), g = title.getContext("2d");
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(39,12,6,.7)"; g.shadowOffsetY = 1;
  g.fillStyle = "#dfbd72"; g.font = "italic 600 56px Georgia, serif";
  g.fillText("Romeo", 125, 48, 242);
  g.font = "italic 500 28px Georgia, serif"; g.fillText("and", 125, 88);
  g.font = "italic 600 49px Georgia, serif"; g.fillText("Juliet", 125, 131, 242);
  const points = [[.47,.17],[.84,.23],[.64,.67],[.26,.56]].map(([x,y]) => ({x:x*c.width,y:y*c.height}));
  const at = (u,v) => {
    const left = { x: points[0].x + (points[3].x-points[0].x)*v, y: points[0].y + (points[3].y-points[0].y)*v };
    const right = { x: points[1].x + (points[2].x-points[1].x)*v, y: points[1].y + (points[2].y-points[1].y)*v };
    return { x: left.x+(right.x-left.x)*u, y: left.y+(right.y-left.y)*u };
  };
  paintProjectedMaterial(c.getContext("2d"), title, at, .95, 8, 4);
}

export function cotHotelLights(scene) {
  const hotel = cotObject(scene, "hotel");
  if (!hotel) return null;
  const c = makeCanvas(hotel.width, hotel.height), g = c.getContext("2d");
  g.drawImage(hotel, 0, 0);
  const image = g.getImageData(0, 0, c.width, c.height), d = image.data;
  const windows = [];
  for (const y of [.326,.524,.726]) for (const x of [.174,.383,.593]) {
    if (y === .726 && x === .383) continue;
    windows.push([x,y,.065,y === .524 && x === .383 ? .059 : .105]);
  }
  for (const y of [.31,.51,.71]) windows.push([.80,y,.065,.11]);
  for (let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
    const p=(y*c.width+x)*4;
    const pane=windows.some(([a,b,w,h]) => x/c.width>=a && x/c.width<=a+w && y/c.height>=b && y/c.height<=b+h);
    if (!pane || (d[p]+d[p+1]+d[p+2])/3>80 || d[p+3]<150) { d[p+3]=0; continue; }
    d[p]=255;d[p+1]=213;d[p+2]=139;d[p+3]=210;
  }
  g.putImageData(image,0,0); return c;
}

