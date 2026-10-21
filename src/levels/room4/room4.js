import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { greenLamp, candle } from "../house/furniture.js";
import { paintRoomDetails, paintStove } from "./details.js";
import { room4Photography, room4Front, paintRoom4Desk, paintRoom4Lamp, paintRoom4Window } from "./photographicRoom.js";
import { alignRoom4Perspective, placeRoom4PhotoChest, room4PhotoCabinet, alignRoom4PhotoObjects, paintRoom4Interior } from "./photographicInterior.js";
import { paintFlatMaterial, paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { birdPainting } from "../wires/photographicPainting.js";
import {
  WARM, BACK, roomLayout, roomStyle, block, chestAt, thingAt, fillPoly, paintShell, paintWindowWall, paintMoonlight, paintChest, gloom, footShadow, onWall,
} from "../house/roomKit.js";

/** The fourth room off the hall, at night: the counting room. Seen from just
 *  inside the door. On the back wall, to the left, a long cork board in an
 *  oak frame with six index cards pinned along it in a row, each with a
 *  number on it, a brass picture light over it; under it a writing desk
 *  with a green-shaded lamp, and the gilt chest on the desk's far end. To
 *  the right, set high and deep in the wall, a small leaded window and the
 *  moon, its light on the rug; in the corner beyond it an iron stove, a
 *  little fire still in it. Plaster walls, stone flags underfoot, beams
 *  overhead; a chair at the desk, registers on a bookcase and a log basket.
 *
 *  On the left wall hangs a painting in a dull gilt frame —
 *  a farmhouse at dawn, with six birds on five wires — under a picture light of
 *  its own. Under the window stands a chest of three drawers, the top one
 *  shut until it is pulled out, old tickets in it, and a candle on the chest.
 *
 *  Three puzzles are found here — the cards, the painting, the drawer; in
 *  the room they are only themselves, small, enough to know them by. Each
 *  has its light, which burns until its puzzle is solved.
 *
 *  Measured and seen as every room is (house/roomKit.js). Painted once per
 *  screen size: the room; a glow; the chest, shut and open; the key. */

const K = { room: "r4_room", glow: "r4_glow", shut: "r4_chest_shut", open: "r4_chest_open", key: "r4_key" };

// what is written on the six cards, in the order the puzzle deals them
const CARDS = [23, 31, 11, 28, 19, 24];

// ── where everything is ─────────────────────────────────────────────────────

/** `on` says which of the room's lights still burn: `cards` the picture
 *  light over the board and the lamp on the desk under it, `painting` the
 *  light over the painting, `drawer` the candle on the chest of drawers. */
export function layoutRoom4(W, H, on = { cards: true, painting: true, drawer: true }, photographic = false) {
  const L = roomLayout(W, H);
  if (photographic) alignRoom4Perspective(L);
  // a counting room: plaster walls, stone flags, a small leaded window
  // set high and deep, an iron stove in the corner
  L.style = roomStyle({
    wall: "plaster", near: "#2e2c26", far: "#161510", back: "#1e1d18", rail: 0, dado: null,
    skirt: "#1a1915", skirtBack: "#0e0d0a",
    floor: "flags", floorNear: "#2c2c2e", floorFar: "#141517",
    ceiling: "beams", ceilingCol: "#0d0d0c", window: "leaded",
  });
  L.on = on;
  const { Q, half: hx } = L;
  // the window in the back wall, to the right
  const wc = Q(0.4 * hx, 0, BACK);
  L.win = { cx: wc.x, rx: 0.1 * hx * wc.s, top: Q(0, 264, BACK).y, sill: Q(0, 186, BACK).y, x: 0.4 * hx, hw: 0.1 * hx };
  // the stove in the right-hand corner
  L.stove = { x: 0.76 * hx, d: 556 };
  // the desk on the left, the board on the wall over it
  const k = (L.desk = { x0: -0.52 * hx, x1: -0.08 * hx, d0: 505, d1: 562, h: 76 });
  const kw = k.x1 - k.x0;
  L.deskLamp = { x: k.x0 + kw * 0.12, d: 538, y: k.h };
  L.chest = { x0: k.x0 + kw * 0.72, x1: k.x0 + kw * 0.92, d0: 524, d1: 539, y0: k.h + 1, y1: k.h + 8.5, lid: 5.5 };
  if (photographic) placeRoom4PhotoChest(L);
  chestAt(L);
  const b = (L.board = { x0: k.x0 - 6, x1: k.x1 + 6, y0: 122, y1: 180 });

  // The bird painting hangs on the left wall, following its perspective.
  const p = (L.painting = { d0: 448, d1: 582, y0: 120 });
  p.y1 = p.y0 + ((p.d1 - p.d0 - 10) * 9) / 16 + 10;
  p.quad = [Q(-hx, p.y1, p.d0), Q(-hx, p.y1, p.d1), Q(-hx, p.y0, p.d1), Q(-hx, p.y0, p.d0)];
  // the chest of drawers under the window, its top drawer (as it is when pulled out), a candle on it
  const cb = (L.cabinet = { x0: 0.3 * hx, x1: 0.54 * hx, d0: 554, d1: 598, h: 88 });
  if (photographic) Object.assign(cb, room4PhotoCabinet());
  const dr = (L.drawer = { x0: cb.x0 + 3, x1: cb.x1 - 3, y0: cb.h - 26, y1: cb.h - 6, d0: cb.d0 - 16, d1: cb.d0 });
  L.cabinetCandle = { x: cb.x0 + 13, y: cb.h, d: 574 };

  // what opens a puzzle
  L.things = [
    thingAt("sequence", "Look at the cards", [Q(b.x0, b.y1, BACK), Q(b.x1, b.y1, BACK), Q(b.x1, b.y0, BACK), Q(b.x0, b.y0, BACK)]),
    thingAt("wires", "Look at the painting", p.quad),
    thingAt("station", "Look in the drawer", [Q(dr.x0, dr.y1 + 4, dr.d1), Q(dr.x1, dr.y1 + 4, dr.d1), Q(dr.x1, dr.y0, dr.d0), Q(dr.x0, dr.y0, dr.d0)]),
  ];
  // the drawer is shut until it has been pulled out (see Room4Scene)
  L.things[2].first = thingAt("station", "Open the drawer", [Q(dr.x0, dr.y1, cb.d0), Q(dr.x1, dr.y1, cb.d0), Q(dr.x1, dr.y0, cb.d0), Q(dr.x0, dr.y0, cb.d0)]);
  // and the patch of the screen it comes out over
  const out = [dr.x0, dr.x1].flatMap((x) => [dr.y0, dr.y1].flatMap((y) => [Q(x, y, dr.d0), Q(x, y, dr.d1)]));
  const xs = out.map((p) => p.x), ys = out.map((p) => p.y);
  L.drawerBox = { x: Math.floor(Math.min(...xs) - 3), y: Math.floor(Math.min(...ys) - 3) };
  L.drawerBox.width = Math.ceil(Math.max(...xs) + 3) - L.drawerBox.x;
  L.drawerBox.height = Math.ceil(Math.max(...ys) + 3) - L.drawerBox.y;
  // what burns, for the scene to keep alive
  const dp = Q(L.deskLamp.x, L.deskLamp.y + 22, L.deskLamp.d);
  const pp = Q((b.x0 + b.x1) / 2, b.y1 + 8, BACK - 9);
  const sv = Q(L.stove.x, 42, L.stove.d - 22);
  const tp = Q(-hx + 7, p.y1 + 8, (p.d0 + p.d1) / 2);
  const cp = Q(L.cabinetCandle.x, L.cabinetCandle.y + 20, L.cabinetCandle.d);
  L.glows = {
    desk: { x: dp.x, y: dp.y, r: 90 * dp.s }, picture: { x: pp.x, y: pp.y, r: 46 * pp.s }, stove: { x: sv.x, y: sv.y, r: 46 * sv.s },
    painting: { x: tp.x, y: tp.y, r: 40 * tp.s }, candle: { x: cp.x, y: cp.y, r: 70 * cp.s },
  };
  if (photographic) alignRoom4PhotoObjects(L);
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintRoom4(scene, L) {
  const t = scene.textures;
  L.photoArt = room4Photography(scene);
  L.surfaceMaterials = L.photoArt?.surfaces;
  L.furnitureMaterial = L.photoArt?.wood;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  const painting=birdPainting(scene.textures).image;
  if (paintRoom4Interior(ctx, scene, L, CARDS, painting)) {
    ctx.save();
    ctx.filter = `brightness(${L.on.drawer ? 0.76 : 0.48})`;
    topDrawer(ctx, L, L.on.drawer ? 0 : L.drawer.d1 - L.drawer.d0);
    ctx.restore();
  } else {
    paintShell(ctx, L);
    paintWindowWall(ctx, L);
    paintRoom4Window(ctx, L);
    paintBoard(ctx, L);
    paintPicture(ctx, L, painting);
    paintRug(ctx, L);
    paintMoonlight(ctx, L);
    paintRoomDetails(ctx, L, "back");
    paintStove(ctx, L);
    paintCabinet(ctx, L);
    paintRoom4Desk(ctx, L);
    paintRoomDetails(ctx, L, "front");
    if (!paintRoom4Lamp(ctx, L)) greenLamp(ctx, L, L.deskLamp, L.desk, L.on.cards);
    paintGloom(ctx, L);
    vignette(ctx, W, H, L.photoArt ? 0.63 : 0.7);
    grain(ctx, W, H, L.photoArt ? 0.012 : 0.035);
  }
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, paintChest(L, false));
  addCanvasTexture(t, K.open, paintChest(L, true));
  addCanvasTexture(t, K.key, paintKey());
  if (L.on.drawer) DRAWER.forEach((key, i) => addCanvasTexture(t, key, drawerFrame(L, ((L.drawer.d1 - L.drawer.d0) * (i + 1)) / DRAWER.length)));
  return { keys: { ...K, drawer: DRAWER } };
}

export function releaseRoom4Art(textures) {
  for (const key of [...Object.values(K), ...DRAWER]) if (textures.exists(key)) textures.remove(key);
}

// The board: a long strip of cork in an oak frame, six slots ruled on it in
// pencil and an index card pinned over each, a little askew, its number in
// ink; over it a brass picture light on two arms.
function paintBoard(ctx, L) {
  const { Q } = L;
  const b = L.board, on = L.on.cards;
  const a = Q(b.x0, b.y1, BACK), z = Q(b.x1, b.y0, BACK), s = a.s;
  const R = 4, fw = Math.round((b.x1 - b.x0) * R), fh = Math.round((b.y1 - b.y0) * R);
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  const rnd = lcg(31);
  g.fillStyle = "#3e2716";
  g.fillRect(0, 0, fw, fh);
  paintFlatMaterial(g, L.photoArt?.wood, 0, 0, fw, fh, 0.9, 1);
  g.fillStyle = "rgba(255,210,160,0.12)";
  g.fillRect(0, 0, fw, 1.2 * R);
  g.fillStyle = "#1a0f08";
  g.fillRect(4 * R, 4 * R, fw - 8 * R, fh - 8 * R);
  // the cork, lit from above by its lamp
  const ck = g.createLinearGradient(0, 0, 0, fh);
  ck.addColorStop(0, on ? "#a8845a" : "#544230");
  ck.addColorStop(0.5, on ? "#7e5e3c" : "#3e3022");
  ck.addColorStop(1, on ? "#4a3420" : "#281e14");
  g.fillStyle = ck;
  g.fillRect(5.5 * R, 5.5 * R, fw - 11 * R, fh - 11 * R);
  paintFlatMaterial(g, L.photoArt?.cork, 5.5 * R, 5.5 * R, fw - 11 * R, fh - 11 * R, 0.55, 0.9);
  for (let i = 0; !L.photoArt && i < 3200; i++) {
    g.fillStyle = rnd() < 0.55 ? "rgba(40,22,8,0.22)" : "rgba(255,226,180,0.1)";
    g.fillRect(5.5 * R + rnd() * (fw - 11 * R), 5.5 * R + rnd() * (fh - 11 * R), 0.8 + rnd() * 2, 0.8 + rnd() * 1.4);
  }
  const cw = 15 * R, ch = 24 * R, gap = (fw - 16 * R) / 6;
  for (let c = 0; c < 6; c++) {
    const x = 8 * R + gap * (c + 0.5), y = fh * 0.5;
    g.strokeStyle = "rgba(40,26,14,0.4)";
    g.lineWidth = 0.9;
    g.strokeRect(x - cw / 2 - 1.5 * R, y - ch / 2 - 1.5 * R, cw + 3 * R, ch + 3 * R);
    g.save();
    g.translate(x + (rnd() - 0.5) * 2 * R, y + (rnd() - 0.5) * 2.4 * R);
    g.rotate((rnd() - 0.5) * 0.12);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(-cw / 2 + 1.4 * R, -ch / 2 + 1.8 * R, cw, ch);
    const cg = g.createLinearGradient(0, -ch / 2, 0, ch / 2);
    cg.addColorStop(0, on ? "#f2ead2" : "#8e8a7c");
    cg.addColorStop(1, on ? "#c4b999" : "#6a665a");
    g.fillStyle = cg;
    g.fillRect(-cw / 2, -ch / 2, cw, ch);
    paintFlatMaterial(g, L.photoArt?.paper, -cw / 2, -ch / 2, cw, ch, 0.3, 0.86);
    // an index card's blue rule, and its number in ink
    g.fillStyle = "rgba(90,120,170,0.4)";
    g.fillRect(-cw / 2, -ch / 2 + 6 * R, cw, 0.7);
    g.fillStyle = "rgba(28,22,18,0.9)";
    g.font = `700 ${9.5 * R}px "Special Elite", "Courier New", monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(CARDS[c]), 0, 3 * R);
    // its red pin, a spark of the lamp on its head
    g.fillStyle = "#a4281e";
    g.beginPath(); g.arc(0, -ch / 2 + 3 * R, 1.5 * R, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,220,200,0.8)";
    g.beginPath(); g.arc(-0.4 * R, -ch / 2 + 2.6 * R, 0.5 * R, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // the frame's inner edge, in shadow at the top
  const sh = g.createLinearGradient(0, 5.5 * R, 0, 13 * R);
  sh.addColorStop(0, "rgba(0,0,0,0.5)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sh;
  g.fillRect(5.5 * R, 5.5 * R, fw - 11 * R, 7.5 * R);
  // the board's shadow, the board, its light
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(a.x + 1.5 * s, a.y + 2.4 * s, z.x - a.x, z.y - a.y);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(flat, a.x, a.y, z.x - a.x, z.y - a.y);
  pictureLight(ctx, L, b.x0, b.x1, b.y1, on);
}

// A picture light over something hung on the back wall between x0 and x1,
// its top at y: a brass tube on two arms, and — `on` — its light on the
// wall and down the thing under it.
function pictureLight(ctx, L, x0, x1, y, on) {
  const { Q } = L;
  const a = Q(x0, y, BACK), z = Q(x1, y, BACK), s = a.s;
  const inset = Math.min(22, (x1 - x0) * 0.18), arm = Math.min(40, (x1 - x0) * 0.3);
  if (on) soft(ctx, (a.x + z.x) / 2, a.y + 10 * s, (z.x - a.x) * 0.7, 80 * s, WARM, 0.2, "lighter");
  const tube = (x) => Q(x, y + 9, BACK - 9);
  const p0 = tube(x0 + inset), p1 = tube(x1 - inset);
  ctx.strokeStyle = "#2a1e0c";
  ctx.lineWidth = Math.max(1, 1.6 * s);
  for (const x of [x0 + arm, x1 - arm]) {
    const w = Q(x, y + 5, BACK), q = tube(x);
    ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = Math.max(2.4, 5.4 * s);
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  ctx.strokeStyle = on ? "#b08c44" : "#5a4a26";
  ctx.lineWidth = Math.max(1, 2.2 * s);
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y - 1.2 * s); ctx.lineTo(p1.x, p1.y - 1.2 * s); ctx.stroke();
  ctx.lineCap = "butt";
  if (on) soft(ctx, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + 5 * s, (p1.x - p0.x) * 0.5, 12 * s, "255,226,170", 0.5, "lighter");
}

// The same six birds and farmhouse scene, in the dull gilt frame under
// the room's picture light.
function paintPicture(ctx, L, photo) {
  const { Q } = L;
  const p = L.painting, on = L.on.painting;
  const s = Q(-L.half, p.y0, (p.d0 + p.d1) / 2).s;
  const R = 6, fw = Math.round((p.d1 - p.d0) * R), fh = Math.round((p.y1 - p.y0) * R), m = 5 * R;
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  // the frame: gilt gone dull, a dark hollow in its moulding
  const gilt = g.createLinearGradient(0, 0, 0, fh);
  gilt.addColorStop(0, on ? "#7a6230" : "#3e3218");
  gilt.addColorStop(1, on ? "#3a2c12" : "#1e180a");
  g.fillStyle = gilt;
  g.fillRect(0, 0, fw, fh);
  paintFlatMaterial(g, L.photoArt?.gilt, 0, 0, fw, fh, 0.6, 0.9);
  g.fillStyle = "rgba(10,6,2,0.55)";
  g.fillRect(m * 0.36, m * 0.36, fw - m * 0.72, fh - m * 0.72);
  g.fillStyle = gilt;
  g.fillRect(m * 0.62, m * 0.62, fw - m * 1.24, fh - m * 1.24);
  g.fillStyle = "rgba(255,226,160,0.2)";
  g.fillRect(0, 0, fw, 1.2 * R * 0.5);
  // the picture
  const w = fw - m * 2, h = fh - m * 2;
  g.save();
  g.translate(m, m);
  g.beginPath(); g.rect(0, 0, w, h); g.clip();
  g.drawImage(photo,0,0,w,h);
  // old varnish; and with its light out, only the moon on it
  g.fillStyle = "rgba(120,88,30,0.12)";
  g.fillRect(0, 0, w, h);
  if (!on) { g.fillStyle = "rgba(4,6,12,0.55)"; g.fillRect(0, 0, w, h); }
  const sh = g.createLinearGradient(0, 0, 0, h * 0.14);
  sh.addColorStop(0, "rgba(0,0,0,0.5)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h * 0.14);
  g.restore();
  fillPoly(ctx, p.quad.map(q => ({ x: q.x + 2 * s, y: q.y + 3 * s })), "rgba(0,0,0,0.55)");
  ctx.imageSmoothingQuality = "high";
  onWall(ctx, L, -1, p, flat);
  const tube = d => Q(-L.half + 7, p.y1 + 9, d);
  const t0 = tube(p.d0 + 24), t1 = tube(p.d1 - 24);
  ctx.lineCap = "round";
  for (const d of [p.d0 + 35, p.d1 - 35]) {
    const wall = Q(-L.half, p.y1 + 5, d), tip = tube(d);
    ctx.strokeStyle = "#3b2b12"; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(wall.x, wall.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  }
  ctx.strokeStyle = "#22180a"; ctx.lineWidth = 5 * s;
  ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.stroke();
  ctx.strokeStyle = on ? "#b28c47" : "#514024"; ctx.lineWidth = 1.8 * s;
  ctx.beginPath(); ctx.moveTo(t0.x, t0.y - s); ctx.lineTo(t1.x, t1.y - s); ctx.stroke();
  ctx.lineCap = "butt";
  if (on) soft(ctx, (t0.x + t1.x) / 2, (t0.y + t1.y) / 2 + 12 * s, 34 * s, 59 * s, WARM, 0.24, "lighter");
}

// The chest of drawers under the window: oak, three drawers, two brass
// knobs to each; the top one pulled out, and the ends of the old card
// tickets in it showing. A candle on the chest, which is the drawer's light.
function paintCabinet(ctx, L) {
  const { Q } = L;
  const c = L.cabinet, dr = L.drawer, on = L.on.drawer;
  footShadow(ctx, L, c);
  block(ctx, L, { x0: c.x0, x1: c.x1, y0: 0, y1: c.h, d0: c.d0, d1: c.d1 }, { side: "#160d07", top: "#3a2414", front: "#24150c" });
  const face = (x0, y0, x1, y1, d, col) => fillPoly(ctx, [Q(x0, y1, d), Q(x1, y1, d), Q(x1, y0, d), Q(x0, y0, d)], col);
  const knobs = (y, d) => {
    for (const k of [0.24, 0.76]) {
      const q = Q(c.x0 + (c.x1 - c.x0) * k, y, d);
      ctx.fillStyle = "#120c05";
      ctx.beginPath(); ctx.arc(q.x, q.y, 2.3 * q.s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = on ? "#b08c44" : "#5e5028";
      ctx.beginPath(); ctx.arc(q.x - 0.4 * q.s, q.y - 0.4 * q.s, 1.6 * q.s, 0, Math.PI * 2); ctx.fill();
    }
  };
  face(c.x0, 0, c.x1, 5, c.d0, "#100905");
  // the two that are shut
  for (const [y0, y1] of [[8, 32], [35, 59]]) {
    face(c.x0 + 3, y0, c.x1 - 3, y1, c.d0, "#2e1b0f");
    if (L.photoArt) room4Front(ctx, L, L.photoArt.drawer, c.x0 + 3, c.x1 - 3, y0, y1, c.d0);
    face(c.x0 + 3, y1 - 0.9, c.x1 - 3, y1, c.d0, "rgba(4,2,1,0.8)");
    face(c.x0 + 3, y0, c.x1 - 3, y0 + 0.7, c.d0, "rgba(255,206,160,0.1)");
    if (!L.photoArt) knobs((y0 + y1) / 2, c.d0);
  }
  // the top one: shut while its puzzle waits, out once it has been solved
  topDrawer(ctx, L, on ? 0 : dr.d1 - dr.d0);
  candle(ctx, L, L.cabinetCandle, on);
}

// The top drawer, `pull` centimetres out of the chest: shut, or the dark it
// has come out of, the drawer, and the old tickets in it.
function topDrawer(ctx, L, pull) {
  const { Q } = L;
  const c = L.cabinet, on = L.on.drawer;
  const dr = { ...L.drawer, d0: c.d0 - pull, d1: c.d0 };
  const face = (x0, y0, x1, y1, d, col) => fillPoly(ctx, [Q(x0, y1, d), Q(x1, y1, d), Q(x1, y0, d), Q(x0, y0, d)], col);
  const knobs = (y, d) => {
    for (const k of [0.24, 0.76]) {
      const q = Q(c.x0 + (c.x1 - c.x0) * k, y, d);
      ctx.fillStyle = "#120c05";
      ctx.beginPath(); ctx.arc(q.x, q.y, 2.3 * q.s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = on ? "#b08c44" : "#5e5028";
      ctx.beginPath(); ctx.arc(q.x - 0.4 * q.s, q.y - 0.4 * q.s, 1.6 * q.s, 0, Math.PI * 2); ctx.fill();
    }
  };
  if (pull <= 0) {
    face(dr.x0, dr.y0, dr.x1, dr.y1, c.d0, "#2e1b0f");
    if (L.photoArt) room4Front(ctx, L, L.photoArt.drawer, dr.x0, dr.x1, dr.y0, dr.y1, c.d0);
    face(dr.x0, dr.y1 - 0.9, dr.x1, dr.y1, c.d0, "rgba(4,2,1,0.8)");
    face(dr.x0, dr.y0, dr.x1, dr.y0 + 0.7, c.d0, "rgba(255,206,160,0.1)");
    if (!L.photoArt) knobs((dr.y0 + dr.y1) / 2, c.d0);
    return;
  }
  face(dr.x0, dr.y0, dr.x1, dr.y1 + 1, c.d0, "#040302");
  block(ctx, L, dr, { side: "#1c1109", top: "#0b0705", front: "#2e1b0f" });
  const n = 8, step = (dr.x1 - dr.x0 - 6) / n;
  for (let i = 0; pull > 4 && i < n; i++) {
    const x = dr.x0 + 3 + i * step;
    const points = [Q(x, dr.y1, dr.d0 + 2.5), Q(x + step, dr.y1, dr.d0 + 2.5), Q(x + step, dr.y1, dr.d1 - 1), Q(x, dr.y1, dr.d1 - 1)];
    fillPoly(ctx, points, on ? "#c7b994" : "#46473f");
    if (L.photoArt) paintProjectedMaterial(ctx, L.photoArt.paper, (u, v) => Q(x + step * u, dr.y1, dr.d0 + 2.5 + (dr.d1 - dr.d0 - 3.5) * v), 0.9, 1, 2);
    if (i > 0) {
      ctx.save(); ctx.strokeStyle = "#504531"; ctx.lineWidth = 0.6 * points[0].s;
      ctx.setLineDash([0.65 * points[0].s, 1.4 * points[0].s]);
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[3].x, points[3].y); ctx.stroke(); ctx.restore();
    }
  }
  face(dr.x0, dr.y1 - 0.8, dr.x1, dr.y1, dr.d0, "rgba(255,206,160,0.16)");
  if (L.photoArt) room4Front(ctx, L, L.photoArt.drawer, dr.x0, dr.x1, dr.y0, dr.y1, dr.d0);
  else knobs((dr.y0 + dr.y1) / 2, dr.d0);
}

// The drawer coming out, a frame at a time, each only the patch of the
// screen it covers — lit, darkened and grained as the room is under it.
const DRAWER = Array.from({ length: 10 }, (_, i) => "r4_drawer_" + i);
function drawerFrame(L, pull) {
  const b = L.drawerBox;
  const c = makeCanvas(b.width, b.height), ctx = c.getContext("2d");
  // Photo meshes cull against their destination canvas. Project the small
  // moving drawer locally before applying the room's global lighting.
  const drawerLayout = { ...L, Q: (...point) => {
    const p = L.Q(...point);
    return { ...p, x: p.x - b.x, y: p.y - b.y };
  } };
  topDrawer(ctx, drawerLayout, pull);
  if (L.photographic) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(0,0,0,${L.on.drawer ? 0.24 : 0.52})`;
    ctx.fillRect(0, 0, b.width, b.height);
    return c;
  }
  ctx.translate(-b.x, -b.y);
  // the candle's light on its foot spills on to the drawer's front
  const lit = makeCanvas(b.width, b.height), g = lit.getContext("2d");
  const cn = L.Q(L.cabinetCandle.x, L.cabinetCandle.y, L.cabinetCandle.d);
  g.translate(-b.x, -b.y);
  soft(g, cn.x, cn.y, 44 * cn.s, 12 * cn.s, WARM, 0.3);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(c, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(lit, 0, 0); ctx.restore();
  ctx.globalCompositeOperation = "source-atop";
  paintGloom(ctx, L);
  vignette(ctx, L.W, L.H, L.photoArt ? 0.63 : 0.7);
  grain(ctx, L.W, L.H, L.photoArt ? 0.012 : 0.035);
  return c;
}


// the rug in the middle of the room: deep red, a paler border, worn
function paintRug(ctx, L) {
  const { Q, half: hx } = L;
  const rnd = lcg(87);
  const mid = 0.1 * hx, hw = hx * 0.36;
  const strip = (w, d0, d1, col) => fillPoly(ctx, [Q(mid - w, 0, d0), Q(mid + w, 0, d0), Q(mid + w, 0, d1), Q(mid - w, 0, d1)], col);
  strip(hw, 336, 526, "#2e0c10");
  strip(hw - 7, 342, 520, "#6a5a3a");
  strip(hw - 11, 346, 516, "#3c1014");
  if (L.photoArt) {
    paintProjectedMaterial(ctx, L.photoArt.rug, (u, v) => Q(mid - hw + 11 + (hw - 11) * 2 * u, 0, 516 - 170 * v), 1, 6, 8);
    return;
  }
  for (let i = 0; i < 700; i++) {
    const p = Q(mid + (rnd() * 2 - 1) * hw, 0, 338 + rnd() * 186);
    ctx.fillStyle = rnd() < 0.6 ? "rgba(0,0,0,0.2)" : "rgba(255,220,190,0.05)";
    ctx.fillRect(p.x, p.y, 3 * p.s, 0.9 * p.s);
  }
}

// the dark, lifted where the room's lights are — and only by those still burning
function paintGloom(ctx, L) {
  const { Q } = L;
  const w = L.win, on = L.on, g = L.glows;
  const floor = Q(w.x - 30, 0, 470);
  const ds = Q(0, 0, L.desk.d0).s, ps = Q(0, 0, BACK).s;
  gloom(ctx, L, [
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
    { x: g.desk.x + 40 * ds, y: g.desk.y + 10 * ds, rx: 170 * ds, ry: 110 * ds, k: on.cards ? 0.95 : 0.32 },
    { x: g.picture.x, y: g.picture.y + 40 * ps, rx: 130 * ps, ry: 90 * ps, k: on.cards ? 0.95 : 0.36 },
    { x: g.stove.x, y: g.stove.y + 20 * ps, rx: 110 * ps, ry: 100 * ps, k: 0.7 },
    { x: g.painting.x, y: g.painting.y + 34 * ps, rx: 100 * ps, ry: 80 * ps, k: on.painting ? 0.95 : 0.36 },
    { x: g.candle.x, y: g.candle.y + 16 * ps, rx: 120 * ps, ry: 100 * ps, k: on.drawer ? 0.92 : 0.3 },
  ]);
}
