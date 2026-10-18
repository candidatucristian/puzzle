import { soft, vignette } from "../../shared/paint.js";
import { roomLayout, thingAt } from "../house/roomKit.js";
import { OVERTIME_CLOCKS } from "../overtime/puzzle.js";

export const ROOM2_PHOTOGRAPH = "room2_photographic_interior_v1";
const REFERENCE = { width: 1792, height: 1024 };
const PHOTO = { width: 1659, height: 948 };
const DISPLAYS = [
  { x: 586, y: 359, w: 106, h: 35, time: 0, ink: "#ff5739" },
  { x: 523, y: 543, w: 27, h: 16, time: 2, ink: "#efae51" },
  { x: 581, y: 541, w: 65, h: 17, time: 1, ink: "#87df9b" },
  { x: 682, y: 542, w: 17, h: 15, time: 3, ink: "#b8c3a5" },
];

export function loadRoom2Photography(scene) {
  if (!scene.textures.exists(ROOM2_PHOTOGRAPH)) scene.load.image(ROOM2_PHOTOGRAPH, "assets/images/Room2/room2-photographic-v1.png");
}

export function alignRoom2Photography(L) {
  const reference = roomLayout(REFERENCE.width, REFERENCE.height);
  const sx = L.W / REFERENCE.width, sy = L.H / REFERENCE.height;
  L.half = reference.half; L.top = reference.top; L.cm = reference.cm * sy;
  L.Q = (x, y, depth) => {
    const p = reference.Q(x, y, depth);
    return { x: p.x * sx, y: p.y * sy, s: p.s * sy };
  };
  L.photographic = true;
}

export function alignRoom2Objects(L) {
  const sx = L.W / PHOTO.width, sy = L.H / PHOTO.height;
  const point = (x, y) => ({ x: x * sx, y: y * sy });
  L.win = { ...L.win, cx: 944 * sx, rx: 103 * sx, top: 119 * sy, sill: 507 * sy };
  L.things = [
    thingAt("bookshelf", "Look at the bookshelves", [[0, 0], [310, 74], [310, 755], [0, 892]].map(([x, y]) => point(x, y))),
    thingAt("modem", "Look at the router", [[1174, 491], [1277, 491], [1277, 568], [1174, 568]].map(([x, y]) => point(x, y))),
    thingAt("overtime", "Look at the clocks", [[398, 340], [754, 340], [754, 586], [398, 586]].map(([x, y]) => point(x, y))),
  ];
  L.glows = {
    stand: { ...point(377, 416), r: 170 * sy },
    office: { ...point(496, 500), r: 100 * sy },
    desk: { ...point(1140, 503), r: 100 * sy },
  };
  L.leds = [8, 9].map(i => ({ ...point(1199 + (i + 0.5) * 4.4, 553), s: 0.45 * sy }));
  L.colon = { ...point(639, 376.5), s: 0.7 * sy };
}

export function paintRoom2Photography(ctx, scene, L, showTime) {
  if (!L.photographic) return false;
  const sx = L.W / PHOTO.width, sy = L.H / PHOTO.height;
  ctx.drawImage(scene.textures.get(ROOM2_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  for (const face of DISPLAYS) {
    const glass = { x: face.x * sx, y: face.y * sy, w: face.w * sx, h: face.h * sy };
    showTime(ctx, OVERTIME_CLOCKS[face.time], glass, face.ink, "rgba(47,39,28,0.22)", L.on.clock);
  }
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = L.on.desk && i === 0 ? "#64ab71" : "#12351e";
    ctx.beginPath(); ctx.ellipse((1199 + (i + 0.5) * 4.4) * sx, 553 * sy, 0.7 * sx, 0.6 * sy, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const [on, x, y, rx, ry] of [
    [L.on.shelf, 377, 416, 270, 390],
    [L.on.clock, 496, 500, 230, 235],
    [L.on.desk, 1140, 503, 245, 235],
  ]) if (!on) soft(ctx, x * sx, y * sy, rx * sx, ry * sy, "3,6,9", 0.66);
  vignette(ctx, L.W, L.H, 0.14);
  return true;
}
