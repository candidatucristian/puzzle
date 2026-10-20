import { createMoonCanvas } from "../../shared/moon.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { drawingRoomMaterials, paintFlatMaterial } from "../house/drawingRoomMaterials.js";
import { paintTreePhotography, treePhotographicProps, photographicGiftArt } from "./photographicTree.js";

/** The Christmas tree for PI, in the drawing room at night: a tall fir in a
 *  wooden tub, nine tiers of boughs, a brass star on its top, glass balls
 *  hung here and there, a parcel or two under it. One more stands a little
 *  apart, tied up in blue paper: that one is the scene's, to be opened — in
 *  it a schoolroom set, a ruler, a protractor and a pair of compasses. Along each tier a string of
 *  small lamps — more holders than lamps alight; which are alight is the
 *  scene's business, so here every holder has its lamp dark. Beside the
 *  tree, the room's tall window with the moon in it, and the moon's light
 *  on the boards.
 *
 *  Painted once per screen size: the room with the tree; a lamp, alight; a
 *  glow; the parcel, tied up and opened; the three things in it. */

const K = {
  room: "pt_room", lamp: "pt_lamp", glow: "pt_glow",
  giftShut: "pt_gift_shut", giftOpen: "pt_gift_open", ruler: "pt_ruler", protractor: "pt_protractor", compasses: "pt_compasses",
};
const MOON = "150,178,232";
// how many holders each tier's string has, top to bottom — always more than
// are ever alight on it, so a light has somewhere to go
const HOLDERS = [4, 4, 6, 6, 8, 11, 10, 11, 12];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutTree(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, S: Math.min(W, H) };
  L.floorY = H * 0.86;
  const cx = W * 0.4, top = H * 0.115, base = L.floorY - 46 * u;
  const tiers = HOLDERS.length, th = (base - top) / tiers;
  const reach = Math.min(W * 0.21, (base - top) * 0.44);
  L.tree = { cx, top, base, th, reach, tiers };
  L.half = (i) => reach * (0.13 + (0.87 * (i + 1)) / tiers);
  // the strings: each sags a little between the tree's two sides
  const rnd = lcg(3141);
  L.rows = HOLDERS.map((n, i) => {
    const y = top + (i + 0.8) * th, hw = L.half(i) * 0.88;
    return Array.from({ length: n }, (_, j) => {
      const t = (j + 0.5) / n, e = t * 2 - 1;
      return { x: cx + e * hw + (rnd() - 0.5) * 4 * u, y: y + (1 - e * e) * th * 0.17 + (rnd() - 0.5) * 3 * u };
    });
  });
  L.lamp = { w: 9 * u, h: 13 * u };
  // the parcel that is opened: where its foot is on the boards, and how big a
  // unit of it is; where each thing in it comes to rest (in those units from
  // the parcel's foot) and how it lies
  L.gift = {
    x: cx + 236 * u, y: L.floorY + 36 * u, s: 1.08 * u,
    toys: [
      { key: "protractor", dx: 78, dy: -7, turn: 0.1 },
      { key: "ruler", dx: 88, dy: 14, turn: -0.07 },
      { key: "compasses", dx: 140, dy: -5, turn: 1.22 },
    ],
  };
  // the window, and the moon in it
  const wx0 = W * 0.69, wx1 = W * 0.89, wy0 = H * 0.09, wy1 = H * 0.63;
  L.win = { x0: wx0, x1: wx1, y0: wy0, y1: wy1 };
  L.moon = { x: wx0 + (wx1 - wx0) * 0.6, y: wy0 + (wy1 - wy0) * 0.26, r: Math.min(W, H) * 0.06 };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintTree(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const props = L.photographic ? treePhotographicProps(scene) : null;
  L.photoLamps = !!props;
  if (L.photographic) {
    paintTreePhotography(ctx, scene, L);
    paintStrings(ctx, L, props?.bulbOff);
  } else {
    paintRoom(ctx, L, drawingRoomMaterials(scene));
    paintWindow(ctx, L);
    paintParcels(ctx, L, false);
    paintTub(ctx, L);
    for (let i = L.tree.tiers - 1; i >= 0; i--) paintTier(ctx, L, i);
    paintStar(ctx, L);
    paintBalls(ctx, L);
    paintStrings(ctx, L);
    paintParcels(ctx, L, true);
    // the room's dark, away from the window
    const dark = ctx.createLinearGradient(L.win.x0, 0, 0, 0);
    dark.addColorStop(0, "rgba(3,3,5,0.1)");
    dark.addColorStop(1, "rgba(3,3,5,0.5)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);
    vignette(ctx, W, H, 0.8);
    grain(ctx, W, H, 0.03);
  }
  addCanvasTexture(t, K.room, c);
  if (props) L.photoLampAspect = props.bulbOn.width / props.bulbOn.height;
  addCanvasTexture(t, K.lamp, props?.bulbOn ?? paintLamp());
  const origins = {};
  const parcels = giftArt(L.gift.s);
  for (const [name, art] of Object.entries(L.photographic ? photographicGiftArt(scene, parcels, L.gift.s) : parcels)) {
    addCanvasTexture(t, K[name], art.canvas);
    origins[name] = { x: art.ox / art.canvas.width, y: art.oy / art.canvas.height };
  }
  L.gift.origins = origins;
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K };
}

/** The tree by itself — tub, boughs, star, glass balls, strings (every lamp
 *  dark), parcels — on a clear sheet W by H, for a room to stand it in.
 *  Gives the sheet and where everything on it is. */
export function paintTreeAlone(W, H) {
  const L = layoutTree(W, H);
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  paintParcels(ctx, L, false);
  paintTub(ctx, L);
  for (let i = L.tree.tiers - 1; i >= 0; i--) paintTier(ctx, L, i);
  paintStar(ctx, L);
  paintBalls(ctx, L);
  paintStrings(ctx, L);
  paintParcels(ctx, L, true);
  // the parcel that is opened, as it stands tied up
  const shut = giftArt(L.gift.s).giftShut;
  ctx.drawImage(shut.canvas, L.gift.x - shut.ox, L.gift.y - shut.oy);
  return { canvas, L };
}

export function releaseTreeArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// the drawing room behind it: red paper over a dark dado, parquet
function paintRoom(ctx, L, materials) {
  const { W, H, u, floorY } = L;
  const rnd = lcg(55);
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, "#160a0d");
  wall.addColorStop(1, "#22101a");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, floorY);
  paintFlatMaterial(ctx, materials?.paper, 0, 0, W, H * 0.66, u, 0.38);
  ctx.fillStyle = "rgba(230,170,170,0.03)";
  for (let x = 0; x < W; x += 26 * u) ctx.fillRect(x, 0, 9 * u, floorY);
  // the dado and its rail, the skirting
  const dy = H * 0.66;
  const dado = ctx.createLinearGradient(0, dy, 0, floorY);
  dado.addColorStop(0, "#22140c");
  dado.addColorStop(1, "#120a06");
  ctx.fillStyle = dado;
  ctx.fillRect(0, dy, W, floorY - dy);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = Math.max(1, 1.4 * u);
  for (let x = 20 * u; x < W; x += 150 * u) ctx.strokeRect(x, dy + 16 * u, 130 * u, floorY - dy - 34 * u);
  ctx.fillStyle = "#33200f";
  ctx.fillRect(0, dy - 4 * u, W, 8 * u);
  ctx.fillStyle = "rgba(255,206,160,0.12)";
  ctx.fillRect(0, dy - 4 * u, W, 1.2 * u);
  ctx.fillStyle = "#0c0704";
  ctx.fillRect(0, floorY - 12 * u, W, 12 * u);
  // the parquet: boards end on, each its own shade
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, "#1c120a");
  floor.addColorStop(1, "#33200f");
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, W, H - floorY);
  paintFlatMaterial(ctx, materials?.wood, 0, floorY, W, H - floorY, u, 0.2, "soft-light");
  const vx = W * 0.5, vy = H * 0.4, k = (H - vy) / (floorY - vy);
  for (let i = -16; i <= 16; i++) {
    const xb = vx + i * W * 0.05;
    if (rnd() < 0.5) {
      ctx.fillStyle = `rgba(0,0,0,${(rnd() * 0.22).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(xb, floorY); ctx.lineTo(xb + W * 0.05, floorY); ctx.lineTo(vx + (xb + W * 0.05 - vx) * k, H); ctx.lineTo(vx + (xb - vx) * k, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(4,2,1,0.7)";
    ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath(); ctx.moveTo(xb, floorY); ctx.lineTo(vx + (xb - vx) * k, H); ctx.stroke();
  }
}

// The window: a tall sash between dark curtains, the night and the moon in
// it, and its light lying on the boards.
function paintWindow(ctx, L) {
  const { H, u, floorY } = L;
  const { x0, x1, y0, y1 } = L.win, m = L.moon;
  const rnd = lcg(808);
  ctx.fillStyle = "#0a0605";
  ctx.fillRect(x0 - 10 * u, y0 - 10 * u, x1 - x0 + 20 * u, y1 - y0 + 22 * u);
  const sky = ctx.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, "#050914");
  sky.addColorStop(0.7, "#101c3a");
  sky.addColorStop(1, "#1e2c50");
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  for (let i = 0; i < 46; i++) {
    const sx = x0 + rnd() * (x1 - x0), sy = y0 + rnd() * (y1 - y0) * 0.8;
    if (Math.hypot(sx - m.x, sy - m.y) < m.r * 2) continue;
    ctx.fillStyle = `rgba(226,234,255,${(0.2 + rnd() * 0.6).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(sx, sy, (0.6 + rnd() * 0.9) * u, 0, Math.PI * 2); ctx.fill();
  }
  // the moon: the disc is 0.36 of its picture
  const size = m.r / 0.36;
  ctx.drawImage(createMoonCanvas(), m.x - size / 2, m.y - size / 2, size, size);
  // the far trees, low
  ctx.fillStyle = "#070c18";
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  for (let i = 0; i <= 16; i++) ctx.lineTo(x0 + ((x1 - x0) * i) / 16, y1 - (y1 - y0) * (0.07 + 0.03 * Math.sin(i * 1.7) + 0.02 * Math.sin(i * 4.1)));
  ctx.lineTo(x1, y1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // its bars
  ctx.fillStyle = "#17100b";
  ctx.fillRect((x0 + x1) / 2 - 3 * u, y0, 6 * u, y1 - y0);
  ctx.fillRect(x0, (y0 + y1) / 2 - 4 * u, x1 - x0, 8 * u);
  ctx.fillStyle = "rgba(170,190,236,0.3)";
  ctx.fillRect((x0 + x1) / 2 + 3 * u, y0, 1.2 * u, y1 - y0);
  ctx.fillRect(x0, (y0 + y1) / 2 + 4 * u, x1 - x0, 1.2 * u);
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(x0 - 16 * u, y1, x1 - x0 + 32 * u, 9 * u);
  // the curtains, drawn back
  for (const s of [-1, 1]) {
    const cx = s < 0 ? x0 : x1, cw = (x1 - x0) * 0.24;
    const g = ctx.createLinearGradient(cx - cw, 0, cx + cw, 0);
    g.addColorStop(0, "#1a070b");
    g.addColorStop(0.5, "#3a1118");
    g.addColorStop(1, "#16060a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - cw, y0 - 22 * u); ctx.lineTo(cx + cw, y0 - 22 * u);
    ctx.lineTo(cx + s * cw * 0.9, y1 + 40 * u); ctx.lineTo(cx - s * cw * 0.1, y1 + 40 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2 * u;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - cw + (cw * 2 * i) / 5, y0 - 22 * u); ctx.lineTo(cx - s * cw * 0.1 + (s * cw * i) / 5, y1 + 40 * u); ctx.stroke(); }
  }
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(x0 - (x1 - x0) * 0.3, y0 - 30 * u, (x1 - x0) * 1.6, 10 * u);
  // the moon on the wall round it and on the floor
  soft(ctx, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 1.5, (y1 - y0) * 0.9, MOON, 0.1, "lighter");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${Math.round(6 * u)}px)`;
  ctx.fillStyle = `rgba(${MOON},0.13)`;
  ctx.beginPath();
  ctx.moveTo(x0 - (x1 - x0) * 0.5, floorY + 8 * u); ctx.lineTo(x1 - (x1 - x0) * 0.4, floorY + 8 * u);
  ctx.lineTo(x1 - (x1 - x0) * 1.1, H); ctx.lineTo(x0 - (x1 - x0) * 1.5, H);
  ctx.closePath();
  ctx.fill();
  ctx.filter = "none";
  ctx.restore();
}

// the tub the tree stands in: staves and two hoops, the trunk going into it
function paintTub(ctx, L) {
  const { u, floorY } = L;
  const { cx, base } = L.tree;
  soft(ctx, cx, floorY + 6 * u, 150 * u, 16 * u, "0,0,0", 0.7);
  ctx.fillStyle = "#1c120a";
  ctx.fillRect(cx - 11 * u, base - 30 * u, 22 * u, 50 * u);
  const y0 = base + 6 * u, y1 = floorY + 4 * u, w0 = 62 * u, w1 = 50 * u;
  const g = ctx.createLinearGradient(cx - w0, 0, cx + w0, 0);
  g.addColorStop(0, "#150d07");
  g.addColorStop(0.45, "#3e2a18");
  g.addColorStop(0.7, "#4a3420");
  g.addColorStop(1, "#110a05");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w0, y0); ctx.lineTo(cx + w0, y0); ctx.lineTo(cx + w1, y1); ctx.lineTo(cx - w1, y1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(cx + (i * w0) / 5, y0); ctx.lineTo(cx + (i * w1) / 5, y1); ctx.stroke(); }
  for (const f of [0.18, 0.78]) {
    const y = y0 + (y1 - y0) * f, w = w0 + (w1 - w0) * f;
    const ig = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    ig.addColorStop(0, "#08080a");
    ig.addColorStop(0.6, "#4e525c");
    ig.addColorStop(1, "#08080a");
    ctx.fillStyle = ig;
    ctx.fillRect(cx - w - u, y - 4 * u, w * 2 + 2 * u, 8 * u);
  }
  ctx.fillStyle = "#0a0806";
  ctx.beginPath(); ctx.ellipse(cx, y0, w0, 6 * u, 0, 0, Math.PI * 2); ctx.fill();
}

// Keep each tier inside its string, including the short cord at either end.
function boughHalfWidth(L, i) {
  const row = L.rows[i], cx = L.tree.cx;
  return Math.min(cx - row[0].x, row[row.length - 1].x - cx) + 8 * L.u;
}

// One tier of boughs: drooping, its lower edge in tips; dark fir
// green, the tier above throwing its shadow down it, the moon along the side
// toward the window.
function paintTier(ctx, L, i) {
  const { u } = L;
  const { cx, top, th } = L.tree;
  const rnd = lcg(900 + i * 31);
  const ya = top + (i - 0.35) * th, yb = top + (i + 1.16) * th, hw = boughHalfWidth(L, i);
  const tips = 5 + i;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(cx, ya);
    ctx.quadraticCurveTo(cx + hw * 0.5, ya + (yb - ya) * 0.62, cx + hw, yb - th * 0.16);
    for (let k = tips; k > 0; k--) {
      const xr = cx + hw * ((k / tips) * 2 - 1), xl = cx + hw * (((k - 1) / tips) * 2 - 1);
      const dip = th * (0.1 + 0.14 * Math.sin((k / tips) * Math.PI));
      ctx.quadraticCurveTo((xr + xl) / 2 + (xr - xl) * 0.2, yb - th * 0.34, xl, yb - th * 0.16 + (k > 1 ? dip : 0));
    }
    ctx.quadraticCurveTo(cx - hw * 0.5, ya + (yb - ya) * 0.62, cx, ya);
    ctx.closePath();
  };
  // its shadow on the tier below
  ctx.save();
  ctx.translate(0, th * 0.14);
  shape();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, ya, 0, yb);
  g.addColorStop(0, "#060d09");
  g.addColorStop(0.6, "#0b1810");
  g.addColorStop(1, "#08120c");
  shape();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // needles: short strokes, down and outward, dark and light
  for (let k = 0; k < 520 + i * 150; k++) {
    const y = ya + Math.sqrt(rnd()) * (yb - ya), w = hw * ((y - ya) / (yb - ya));
    const x = cx + (rnd() * 2 - 1) * w, out = (x - cx) / hw;
    const len = (5 + rnd() * 9) * u;
    ctx.strokeStyle = rnd() < 0.55 ? `rgba(3,8,5,${(0.3 + rnd() * 0.4).toFixed(2)})` : `rgba(${Math.round(25 + rnd() * 24)},${Math.round(49 + rnd() * 30)},${Math.round(33 + rnd() * 20)},${(0.14 + rnd() * 0.3).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.7, (0.8 + rnd() * 0.8) * u);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + out * len * 0.9 + (rnd() - 0.5) * 3 * u, y + len * (0.5 + rnd() * 0.5)); ctx.stroke();
  }
  // the moon down its window side, the dark down the other
  const side = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  side.addColorStop(0, "rgba(0,0,0,0.4)");
  side.addColorStop(0.55, "rgba(0,0,0,0)");
  side.addColorStop(1, `rgba(${MOON},0.045)`);
  ctx.fillStyle = side;
  ctx.fillRect(cx - hw, ya, hw * 2, yb - ya);
  ctx.restore();
}

// the star on the top: five points of brass, the moon on one side of it
function paintStar(ctx, L) {
  const { u } = L;
  const { cx, top, th } = L.tree;
  const y = top - th * 0.2, R = 24 * u, r = 10 * u;
  ctx.fillStyle = "#1c120a";
  ctx.fillRect(cx - 2 * u, y, 4 * u, th * 0.4);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R;
    if (i) ctx.lineTo(cx + Math.cos(a) * q, y + Math.sin(a) * q); else ctx.moveTo(cx + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
  g.addColorStop(0, "#3a2a10");
  g.addColorStop(0.55, "#8a6c34");
  g.addColorStop(1, "#d0b068");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(20,12,4,0.7)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke();
  }
}

// glass balls, hung between the strings: deep colours, the window small in each
function paintBalls(ctx, L) {
  const { u } = L;
  const { cx, top, th, tiers } = L.tree;
  const rnd = lcg(271);
  const glass = [["#5a0e14", "#e06a70"], ["#6a5216", "#f0d890"], ["#10244e", "#7a9ae0"], ["#3c3e46", "#d8dce6"]];
  for (let i = 1; i < tiers; i++) {
    for (let n = 0; n < (i < 4 ? 1 : 2); n++) {
      const x = cx + (rnd() * 2 - 1) * boughHalfWidth(L, i) * 0.65, y = top + (i + 0.36 + rnd() * 0.12) * th, r = (6.5 + rnd() * 3.5) * u;
      const [deep, shine] = glass[Math.floor(rnd() * glass.length)];
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = Math.max(0.7, 0.8 * u);
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y - r - 9 * u); ctx.stroke();
      ctx.fillStyle = "#8a6c34";
      ctx.fillRect(x - 2 * u, y - r - 2.6 * u, 4 * u, 3.4 * u);
      const g = ctx.createRadialGradient(x + r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, shine);
      g.addColorStop(0.4, deep);
      g.addColorStop(1, "#050506");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(220,230,255,0.55)";
      ctx.fillRect(x + r * 0.28, y - r * 0.5, r * 0.22, r * 0.36);
    }
  }
}

// The strings of lamps: a cord along each tier from side to side, a brass
// holder wherever a lamp goes, and in each holder its little glass lamp,
// dark — the scene lights the ones that are alight.
function paintStrings(ctx, L, bulb = null) {
  const { u } = L;
  const { w, h } = L.lamp;
  for (const row of L.rows) {
    ctx.strokeStyle = "#060b07";
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.beginPath();
    row.forEach((p, j) => {
      if (!j) { ctx.moveTo(p.x - 14 * u, p.y - h * 0.9 - 5 * u); ctx.lineTo(p.x, p.y - h * 0.9); return; }
      const q = row[j - 1];
      ctx.quadraticCurveTo((p.x + q.x) / 2, Math.max(p.y, q.y) - h * 0.9 + 5 * u, p.x, p.y - h * 0.9);
    });
    const last = row[row.length - 1];
    ctx.lineTo(last.x + 14 * u, last.y - h * 0.9 - 5 * u);
    ctx.stroke();
    for (const p of row) {
      if (bulb) {
        const height = h * 1.6, width = height * bulb.width / bulb.height;
        ctx.drawImage(bulb, p.x - width / 2, p.y - height * 0.67, width, height);
        continue;
      }
      ctx.fillStyle = "#6a5226";
      ctx.fillRect(p.x - w * 0.3, p.y - h * 0.95, w * 0.6, h * 0.36);
      const g = ctx.createRadialGradient(p.x - w * 0.15, p.y - h * 0.1, 0.5, p.x, p.y, h * 0.6);
      g.addColorStop(0, "#5a5446");
      g.addColorStop(0.5, "#2a2620");
      g.addColorStop(1, "#0c0a08");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(220,230,255,0.3)";
      ctx.beginPath(); ctx.ellipse(p.x + w * 0.14, p.y - h * 0.16, w * 0.09, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// a parcel or two under the tree: paper and ribbon — `front` the ones before the tub
function paintParcels(ctx, L, front) {
  const { u, floorY } = L;
  const { cx } = L.tree;
  const parcels = front
    ? [[-128, 20, 96, 56, "#3a2a1a", "#6a1a1e"]]
    : [[118, 6, 104, 48, "#3c1a1e", "#c8c0a8"]];
  for (const [dx, dy, w, h, paper, ribbon] of parcels) {
    const x = cx + dx * u, y1 = floorY + dy * u, pw = w * u, ph = h * u;
    soft(ctx, x + 6 * u, y1, pw * 0.62, 7 * u, "0,0,0", 0.6);
    const g = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
    g.addColorStop(0, "#0a0806");
    g.addColorStop(0.5, paper);
    g.addColorStop(1, paper);
    ctx.fillStyle = g;
    ctx.fillRect(x - pw / 2, y1 - ph, pw, ph);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x - pw / 2, y1 - ph, pw, 2 * u);
    ctx.fillStyle = ribbon;
    ctx.fillRect(x - 4 * u, y1 - ph, 8 * u, ph);
    ctx.fillRect(x - pw / 2, y1 - ph * 0.56, pw, 7 * u);
    // the bow
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 9 * u, y1 - ph - 4 * u, 9 * u, 5 * u, s * -0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x - pw / 2, y1 - ph, pw * 0.2, ph);
  }
}

// The parcel that is opened, and what is in it — each on a sheet of its own,
// for the scene to stand on the boards and throw about. `k` is how many
// pixels a unit is; each comes with where on its sheet its own middle (for
// the parcel, the middle of its foot) is.
function giftArt(k) {
  const sheet = (w, h, ox, oy, paint) => {
    const canvas = makeCanvas(Math.ceil(w * k), Math.ceil(h * k));
    const g = canvas.getContext("2d");
    g.scale(k, k);
    g.translate(ox, oy);
    paint(g);
    return { canvas, ox: ox * k, oy: oy * k };
  };
  return {
    giftShut: sheet(130, 130, 65, 104, paintGiftShut),
    giftOpen: sheet(190, 140, 95, 104, paintGiftOpen),
    ruler: sheet(134, 24, 67, 12, paintRuler),
    protractor: sheet(100, 62, 50, 36, paintProtractor),
    compasses: sheet(84, 120, 42, 60, paintCompasses),
  };
}

// tied up: a shallow box in dark blue paper, a gold ribbon both ways and a bow
function paintGiftShut(g) {
  soft(g, 2, 3, 56, 9, "0,0,0", 0.6);
  // its top, seen a little from above; then its front
  g.fillStyle = "#2c3f66";
  g.beginPath(); g.moveTo(-36, -44); g.lineTo(36, -44); g.lineTo(44, -26); g.lineTo(-44, -26); g.closePath(); g.fill();
  const front = g.createLinearGradient(-44, 0, 44, 0);
  front.addColorStop(0, "#101a2c");
  front.addColorStop(0.5, "#1e2e4c");
  front.addColorStop(1, "#162238");
  g.fillStyle = front;
  g.fillRect(-44, -26, 88, 26);
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(-44, -26, 88, 1.2);
  // the ribbon: down the front, back across the top, and round the middle
  const gold = g.createLinearGradient(-6, 0, 6, 0);
  gold.addColorStop(0, "#8a6c34");
  gold.addColorStop(0.5, "#d8b868");
  gold.addColorStop(1, "#8a6c34");
  g.fillStyle = gold;
  g.fillRect(-6, -26, 12, 26);
  g.beginPath(); g.moveTo(-5, -44); g.lineTo(5, -44); g.lineTo(6, -26); g.lineTo(-6, -26); g.closePath(); g.fill();
  g.fillStyle = "#b08c44";
  g.beginPath(); g.moveTo(-40, -36.5); g.lineTo(40, -36.5); g.lineTo(42, -32); g.lineTo(-42, -32); g.closePath(); g.fill();
  // the bow: two loops and their tails, a knot between
  for (const s of [-1, 1]) {
    g.fillStyle = "#c8a858";
    g.beginPath();
    g.moveTo(0, -37);
    g.bezierCurveTo(s * 8, -58, s * 30, -56, s * 26, -42);
    g.bezierCurveTo(s * 22, -34, s * 8, -34, 0, -37);
    g.fill();
    g.fillStyle = "#6a5220";
    g.beginPath();
    g.moveTo(s * 5, -40);
    g.bezierCurveTo(s * 10, -50, s * 22, -50, s * 20, -43);
    g.bezierCurveTo(s * 17, -38, s * 9, -38, s * 5, -40);
    g.fill();
    g.fillStyle = "#b08c44";
    g.beginPath(); g.moveTo(0, -36); g.lineTo(s * 16, -22); g.lineTo(s * 10, -20); g.lineTo(s * 12, -27); g.closePath(); g.fill();
  }
  g.fillStyle = "#e0c478";
  g.beginPath(); g.ellipse(0, -37.5, 5, 4, 0, 0, Math.PI * 2); g.fill();
}

// opened: the paper torn down and spread round it, the ribbon thrown aside,
// the lid off and leaning on the back of the box, red tissue in the bottom
function paintGiftOpen(g) {
  const rnd = lcg(1618);
  soft(g, 2, 3, 76, 10, "0,0,0", 0.6);
  g.fillStyle = "#1c2a40";
  g.beginPath();
  g.moveTo(-74, 6);
  for (let i = 0; i <= 10; i++) g.lineTo(-74 + i * 14.4, -(13 + rnd() * 9));
  g.lineTo(72, 8);
  for (let i = 10; i >= 0; i--) g.lineTo(-74 + i * 14.4, 10 + rnd() * 7);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(226,222,206,0.5)";
  g.lineWidth = 1.2;
  g.stroke();
  g.strokeStyle = "#b08c44";
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath(); g.moveTo(-84, 12); g.bezierCurveTo(-66, -4, -50, 22, -30, 15); g.stroke();
  g.lineCap = "butt";
  // the lid, leaning
  g.fillStyle = "#26385a";
  g.beginPath(); g.moveTo(-36, -62); g.lineTo(48, -58); g.lineTo(42, -24); g.lineTo(-42, -24); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.beginPath(); g.moveTo(-36, -62); g.lineTo(48, -58); g.lineTo(47.6, -56.4); g.lineTo(-36.3, -60.4); g.closePath(); g.fill();
  // the box: its inside, the tissue, its front
  g.fillStyle = "#0e0906";
  g.beginPath(); g.moveTo(-42, -24); g.lineTo(42, -24); g.lineTo(50, -4); g.lineTo(-50, -4); g.closePath(); g.fill();
  g.fillStyle = "#4a1620";
  g.beginPath(); g.moveTo(-37, -21); g.lineTo(37, -21); g.lineTo(44, -7); g.lineTo(-44, -7); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,200,200,0.14)";
  g.lineWidth = 0.8;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-36 + rnd() * 72, -20); g.lineTo(-40 + rnd() * 80, -8); g.stroke(); }
  const front = g.createLinearGradient(0, -4, 0, 10);
  front.addColorStop(0, "#4a3220");
  front.addColorStop(1, "#22150c");
  g.fillStyle = front;
  g.fillRect(-50, -4, 100, 14);
  g.fillStyle = "rgba(255,220,180,0.16)";
  g.fillRect(-50, -4, 100, 1.2);
}

// the ruler: boxwood, a brass tip at either end, its inches cut along one edge
function paintRuler(g) {
  const len = 124, wide = 13;
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.fillRect(-len / 2 + 2, -wide / 2 + 3, len, wide);
  const box = g.createLinearGradient(0, -wide / 2, 0, wide / 2);
  box.addColorStop(0, "#dcc084");
  box.addColorStop(1, "#a88848");
  g.fillStyle = box;
  g.fillRect(-len / 2, -wide / 2, len, wide);
  g.fillStyle = "rgba(40,24,8,0.85)";
  for (let i = 0; i <= 48; i++) {
    const tall = i % 8 === 0 ? 0.55 : i % 4 === 0 ? 0.4 : 0.24;
    g.fillRect(-len / 2 + 5 + (i * (len - 10)) / 48, -wide / 2, 0.8, wide * tall);
  }
  g.fillStyle = "#8a6c34";
  g.fillRect(-len / 2, -wide / 2, 3, wide);
  g.fillRect(len / 2 - 3, -wide / 2, 3, wide);
  g.fillStyle = "rgba(255,244,214,0.3)";
  g.fillRect(-len / 2, wide / 2 - 1.3, len, 1.3);
}

// the protractor: a half circle of brass, open in the middle, its degrees cut
// round the rim — lying flat, so seen squat
function paintProtractor(g) {
  const r = 44;
  g.scale(1, 0.52);
  g.translate(0, 22);
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.beginPath(); g.arc(2, 5, r, Math.PI, 0); g.closePath(); g.fill();
  const brass = g.createLinearGradient(-r, -r, r, 0);
  brass.addColorStop(0, "#7a5c26");
  brass.addColorStop(0.5, "#d0b068");
  brass.addColorStop(1, "#8a6c34");
  g.fillStyle = brass;
  g.beginPath();
  g.arc(0, 0, r, Math.PI, 0);
  g.lineTo(r, 8); g.lineTo(-r, 8);
  g.closePath();
  g.arc(0, 0, r * 0.62, 0, Math.PI, true);
  g.closePath();
  g.fill("evenodd");
  g.strokeStyle = "rgba(40,24,8,0.85)";
  g.lineWidth = 0.9;
  for (let d = 0; d <= 180; d += 5) {
    const a = Math.PI + (d * Math.PI) / 180, r0 = r * (d % 30 === 0 ? 0.78 : d % 10 === 0 ? 0.85 : 0.91);
    g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r * 0.985, Math.sin(a) * r * 0.985); g.stroke();
  }
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 8); g.stroke();
  g.strokeStyle = "rgba(255,244,214,0.45)";
  g.beginPath(); g.arc(0, 0, r * 0.99, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
}

// The pair of compasses, standing on its points with its head up (the scene
// lays it down): two tapered steel legs hinged in a round brass head under a
// milled handle; one leg ends in a needle held by a small screw, the other
// in a clamp with a stub of red pencil in it; a brass wing between them,
// with its thumbscrew, to hold them at their spread.
function paintCompasses(g) {
  const head = { x: 0, y: -34 }, needle = { x: -17, y: 50 }, lead = { x: 17, y: 44 };
  const steel = (p, q, w0, w1) => {
    const dx = q.x - p.x, dy = q.y - p.y, n = Math.hypot(dx, dy), nx = -dy / n, ny = dx / n;
    const fill = g.createLinearGradient(p.x - nx * w0, p.y - ny * w0, p.x + nx * w0, p.y + ny * w0);
    fill.addColorStop(0, "#3a3f48");
    fill.addColorStop(0.4, "#c8ced8");
    fill.addColorStop(0.6, "#8a929e");
    fill.addColorStop(1, "#23262c");
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(p.x - nx * w0, p.y - ny * w0); g.lineTo(q.x - nx * w1, q.y - ny * w1);
    g.lineTo(q.x + nx * w1, q.y + ny * w1); g.lineTo(p.x + nx * w0, p.y + ny * w0);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(8,9,12,0.7)";
    g.lineWidth = 0.6;
    g.stroke();
  };
  // the wing: a brass arc from one leg through the other
  g.strokeStyle = "#5a4418";
  g.lineWidth = 3.4;
  g.beginPath(); g.arc(head.x, head.y, 46, Math.PI * 0.5 - 0.3, Math.PI * 0.5 + 0.46); g.stroke();
  g.strokeStyle = "#c8a858";
  g.lineWidth = 1.8;
  g.beginPath(); g.arc(head.x, head.y, 46, Math.PI * 0.5 - 0.3, Math.PI * 0.5 + 0.46); g.stroke();
  // the legs: wide at the head, fine at the foot
  const knee = (to, f) => ({ x: head.x + (to.x - head.x) * f, y: head.y + (to.y - head.y) * f });
  steel(head, knee(needle, 0.84), 4.2, 2.2);
  steel(head, knee(lead, 0.72), 4.2, 2.6);
  // the needle and the little screw that holds it
  g.strokeStyle = "#e4e8f0";
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(knee(needle, 0.82).x, knee(needle, 0.82).y); g.lineTo(needle.x, needle.y); g.stroke();
  g.fillStyle = "#8a6c34";
  g.beginPath(); g.arc(knee(needle, 0.8).x - 2.6, knee(needle, 0.8).y, 1.9, 0, Math.PI * 2); g.fill();
  // the thumbscrew where the wing passes the other leg
  const grip = knee(lead, 0.56);
  g.fillStyle = "#3a2a10";
  g.beginPath(); g.arc(grip.x + 0.6, grip.y + 0.8, 4.4, 0, Math.PI * 2); g.fill();
  const thumb = g.createRadialGradient(grip.x - 1, grip.y - 1, 0.4, grip.x, grip.y, 4);
  thumb.addColorStop(0, "#f0d890");
  thumb.addColorStop(1, "#7a5c26");
  g.fillStyle = thumb;
  g.beginPath(); g.arc(grip.x, grip.y, 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(40,24,8,0.8)";
  g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(grip.x - 2.6, grip.y); g.lineTo(grip.x + 2.6, grip.y); g.stroke();
  // the clamp and the pencil in it
  const clamp = knee(lead, 0.74), ang = Math.atan2(lead.y - head.y, lead.x - head.x) - Math.PI / 2;
  g.save();
  g.translate(clamp.x, clamp.y);
  g.rotate(ang);
  g.fillStyle = "#a03a2c";
  g.fillRect(-2.6, -9, 5.2, 21);
  g.fillStyle = "rgba(255,220,200,0.3)";
  g.fillRect(-1.6, -9, 1, 21);
  g.fillStyle = "#c8a878";
  g.beginPath(); g.moveTo(-2.6, 12); g.lineTo(2.6, 12); g.lineTo(0, 19); g.closePath(); g.fill();
  g.fillStyle = "#1a1a1c";
  g.beginPath(); g.moveTo(-1, 16.4); g.lineTo(1, 16.4); g.lineTo(0, 19); g.closePath(); g.fill();
  const band = g.createLinearGradient(-4, 0, 4, 0);
  band.addColorStop(0, "#5a4418");
  band.addColorStop(0.5, "#d8b868");
  band.addColorStop(1, "#5a4418");
  g.fillStyle = band;
  g.fillRect(-4, -3, 8, 5);
  g.fillStyle = "#8a6c34";
  g.beginPath(); g.arc(5.4, -0.5, 1.9, 0, Math.PI * 2); g.fill();
  g.restore();
  // the head: a brass disc with its pivot screw; over it the milled handle
  const grip2 = g.createLinearGradient(-3.4, 0, 3.4, 0);
  grip2.addColorStop(0, "#3a2a10");
  grip2.addColorStop(0.45, "#e0c478");
  grip2.addColorStop(1, "#4a3816");
  g.fillStyle = grip2;
  g.fillRect(-3.4, head.y - 24, 6.8, 18);
  g.strokeStyle = "rgba(40,24,8,0.6)";
  g.lineWidth = 0.6;
  for (let y = head.y - 23; y < head.y - 7; y += 1.8) { g.beginPath(); g.moveTo(-3.4, y); g.lineTo(3.4, y); g.stroke(); }
  g.fillStyle = "#c8a858";
  g.fillRect(-4.2, head.y - 25.4, 8.4, 2.4);
  const disc = g.createRadialGradient(head.x - 2.4, head.y - 2.4, 0.6, head.x, head.y, 8.4);
  disc.addColorStop(0, "#f4e0a0");
  disc.addColorStop(0.6, "#a88848");
  disc.addColorStop(1, "#3a2a10");
  g.fillStyle = disc;
  g.beginPath(); g.arc(head.x, head.y, 8.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(30,18,6,0.7)";
  g.lineWidth = 0.8;
  g.stroke();
  g.fillStyle = "#4a3816";
  g.beginPath(); g.arc(head.x, head.y, 2.8, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#e8d8a0";
  g.lineWidth = 0.7;
  g.beginPath(); g.moveTo(head.x - 1.9, head.y - 1.2); g.lineTo(head.x + 1.9, head.y + 1.2); g.stroke();
}

// one lamp alight: the glass full of light, white at its heart
function paintLamp() {
  const w = 36, h = 52;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const body = g.createRadialGradient(w / 2, h * 0.52, 1, w / 2, h * 0.5, h * 0.48);
  body.addColorStop(0, "#fffdf2");
  body.addColorStop(0.4, "#ffe6a0");
  body.addColorStop(0.8, "#ffb040");
  body.addColorStop(1, "rgba(255,150,40,0)");
  g.fillStyle = body;
  g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.46, h * 0.47, 0, 0, Math.PI * 2); g.fill();
  return c;
}
