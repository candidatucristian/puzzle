// Room VI drawn instead of photographed: a trial of the house in the manual's
// own hand (ui/manual/) — white pencil on dark paper, each line gone over
// twice, gold only where there is gold. Everything stands where the
// photograph has it (in its pixels, 1659 x 948), so that what is clicked —
// the medal cabinet, the herbarium, the cot, the family photograph — and the
// rain on the window fall exactly where they did. Shown in place of the
// photograph when the address asks for it (?sketch).

import { addCanvasTexture, glowCanvas, makeCanvas, soft, vignette } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { stroke, line, box, ring, fill, GOLD } from "../../ui/manual/sketch.js";
import { room6CabinetPoint, room6Medals } from "./photographicRoom.js";

const PHOTO = { width: 1659, height: 948 };
const HERBARIUM = [[684, 584], [786, 581], [779, 569], [692, 571]];
const PORTRAIT = { x: 886, y: 194, w: 142, h: 210 };
const VP = { x: 860, y: 430 }; // where the floor's boards run to

/** the trial, asked for by the address */
export const sketching = () => typeof location !== "undefined" && new URLSearchParams(location.search).has("sketch");

// ── the pencil's own few ways of drawing ────────────────────────────────────

const pale = (a) => `rgba(235,229,214,${a})`;
const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
function shape(ctx, pts, color, alpha = 1) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; poly(ctx, pts); ctx.fill(); ctx.restore(); }

// light laid on with the side of the pencil: close strokes, at a slant, inside a shape
function hatch(ctx, pts, { gap = 8, slant = -0.75, alpha = 0.1, width = 1 } = {}) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  ctx.save();
  poly(ctx, pts); ctx.clip();
  ctx.strokeStyle = pale(alpha); ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath();
  const reach = (y1 - y0) * Math.abs(slant);
  for (let x = x0 - reach; x < x1 + reach; x += gap) { ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0) * -slant, y0); }
  ctx.stroke();
  ctx.restore();
}

// ── the room itself ─────────────────────────────────────────────────────────

const WALL = { left: 362, right: 1356, top: 95, floor: 683, rail: 505 };

function paper(ctx) {
  ctx.fillStyle = "#151412";
  ctx.fillRect(0, 0, PHOTO.width, PHOTO.height);
  const g = document.createElement("canvas");
  g.width = g.height = 256;
  const gc = g.getContext("2d"), img = gc.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.random() < 0.5 ? 9 : 3; }
  gc.putImageData(img, 0, 0);
  ctx.save(); ctx.fillStyle = ctx.createPattern(g, "repeat"); ctx.fillRect(0, 0, PHOTO.width, PHOTO.height); ctx.restore();
}

function walls(ctx) {
  const { left: l, right: r, top: t, floor: f } = WALL;
  // the back wall a little lighter, the side walls darker, as the light lies
  shape(ctx, [[l, t], [r, t], [r, f], [l, f]], pale(1), 0.03);
  shape(ctx, [[0, 0], [l, t], [l, f], [0, 830]], "#000", 0.22);
  shape(ctx, [[r, t], [1659, 20], [1659, 820], [r, f]], "#000", 0.2);
  // the ceiling and its coffers
  shape(ctx, [[0, 0], [1659, 0], [1659, 20], [r, t], [l, t]], "#000", 0.3);
  line(ctx, l, t, r, t, { width: 1.8, alpha: 0.7, seed: 1 });
  line(ctx, l + 28, t - 30, r - 22, t - 30, { width: 1.4, alpha: 0.35, seed: 2 });
  line(ctx, 200, 18, 1500, 18, { width: 1.4, alpha: 0.25, seed: 3 });
  for (let i = 0; i <= 6; i++) {
    const bx = l + ((r - l) * i) / 6;
    line(ctx, bx, t, VP.x + (bx - VP.x) * 2.4, 0, { width: 1.3, alpha: 0.3, seed: 4 + i });
  }
  // the corners, and where the walls meet the ceiling
  line(ctx, l, t, l, f, { width: 1.8, alpha: 0.6, seed: 12 });
  line(ctx, r, t, r, f, { width: 1.8, alpha: 0.6, seed: 13 });
  line(ctx, l, t, 60, 0, { width: 1.6, alpha: 0.5, seed: 14 });
  line(ctx, r, t, 1600, 0, { width: 1.6, alpha: 0.5, seed: 15 });
}

function wainscot(ctx) {
  const { left: l, right: r, floor: f, rail } = WALL;
  // the rail and the skirting along the back wall
  line(ctx, l, rail, r, rail, { width: 1.8, alpha: 0.65, seed: 20 });
  line(ctx, l, rail + 8, r, rail + 8, { width: 1, alpha: 0.35, seed: 21 });
  line(ctx, l, f - 13, r, f - 13, { width: 1.4, alpha: 0.45, seed: 22 });
  line(ctx, l, f, r, f, { width: 2, alpha: 0.7, seed: 23 });
  // its panels
  const stiles = [l, 520, 680, 840, 1000, 1180, r];
  for (let i = 0; i < stiles.length - 1; i++) box(ctx, stiles[i] + 16, rail + 24, stiles[i + 1] - stiles[i] - 32, f - rail - 52, { width: 1.1, alpha: 0.32, seed: 24 + i });
  // and along the right-hand wall, coming toward us
  line(ctx, r, rail, 1659, 537, { width: 1.8, alpha: 0.55, seed: 31 });
  line(ctx, r, f, 1659, 800, { width: 2, alpha: 0.6, seed: 32 });
  for (const k of [0.33, 0.66]) { const x = r + (1659 - r) * k; line(ctx, x, rail + 6 + 32 * k, x, f + 117 * k - 6, { width: 1.1, alpha: 0.3, seed: 33 + k * 10 }); }
}

// ── the arched window, the night beyond it ──────────────────────────────────

const arch = (cx, cy, rx, ry, from, to, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
  const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
  return [cx + rx * Math.cos(a), cy - ry * Math.sin(a)];
});

function windowArch(ctx) {
  // the glass: the night, deep blue, the trees black against it
  const glass = [...arch(677, 232, 75, 72, 180, 0), [752, 486], [602, 486]];
  ctx.save();
  poly(ctx, glass); ctx.clip();
  const sky = ctx.createLinearGradient(0, 160, 0, 486);
  sky.addColorStop(0, "#22334a"); sky.addColorStop(0.55, "#16233a"); sky.addColorStop(1, "#0d1522");
  ctx.fillStyle = sky; ctx.fillRect(590, 150, 180, 340);
  ctx.fillStyle = "#070b10";
  for (const [x, w, top] of [[612, 34, 250], [652, 28, 300], [705, 40, 230], [740, 26, 280]]) {
    ctx.beginPath(); ctx.moveTo(x - w, 486);
    for (let y = 486; y > top; y -= 14) ctx.lineTo(x - w * ((y - top) / (486 - top)) * (0.7 + 0.3 * Math.sin(y)), y);
    ctx.lineTo(x, top - 12);
    for (let y = top; y < 486; y += 14) ctx.lineTo(x + w * ((y - top) / (486 - top)) * (0.7 + 0.3 * Math.cos(y)), y);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // its frame: the recess round it, the bars across it
  stroke(ctx, [...arch(677, 232, 112, 118, 180, 0), [789, 500]], { width: 1.6, alpha: 0.55, seed: 40 });
  line(ctx, 565, 232, 565, 500, { width: 1.6, alpha: 0.55, seed: 41 });
  stroke(ctx, [...arch(677, 232, 84, 82, 180, 0)], { width: 1.4, alpha: 0.6, seed: 42 });
  stroke(ctx, glass, { width: 1.8, alpha: 0.8, close: true, seed: 43 });
  fill(ctx, 671, 158, 12, 330, "#0b0b0a", 1);
  for (const y of [270, 377]) fill(ctx, 600, y, 154, 7, "#0b0b0a", 1);
  line(ctx, 671, 160, 671, 486, { width: 1.2, alpha: 0.55, seed: 44 });
  line(ctx, 683, 160, 683, 486, { width: 1.2, alpha: 0.55, seed: 45 });
  for (const y of [270, 277, 377, 384]) line(ctx, 602, y, 752, y, { width: 1.1, alpha: 0.5, seed: 46 + y });
  // the sill, catching the light
  stroke(ctx, [[556, 494], [798, 494], [804, 505], [550, 505]], { width: 1.6, alpha: 0.75, close: true, seed: 50 });
  hatch(ctx, [[556, 494], [798, 494], [804, 505], [550, 505]], { gap: 5, alpha: 0.14 });
}

function portrait(ctx) {
  const { x, y, w, h } = PORTRAIT;
  fill(ctx, x, y, w, h, "#0f0e0c", 1);
  box(ctx, x, y, w, h, { color: GOLD, width: 2.2, alpha: 0.8, seed: 60 });
  box(ctx, x + 9, y + 9, w - 18, h - 18, { color: GOLD, width: 1.1, alpha: 0.5, seed: 61 });
  // the family: the mother standing, the two children before her
  const figure = (cx, top, s, seed) => {
    ring(ctx, cx, top + 11 * s, 9 * s, 11 * s, { width: 1.2, alpha: 0.55, seed });
    stroke(ctx, [[cx - 26 * s, top + 70 * s], [cx - 20 * s, top + 34 * s], [cx, top + 25 * s], [cx + 20 * s, top + 34 * s], [cx + 26 * s, top + 70 * s]], { width: 1.2, alpha: 0.5, seed: seed + 1 });
  };
  figure(x + w / 2, y + 30, 1.3, 62);
  figure(x + w / 2 - 30, y + 105, 0.95, 64);
  figure(x + w / 2 + 30, y + 112, 0.85, 66);
}

// ── the floor and the rug ───────────────────────────────────────────────────

function floor(ctx) {
  const { left: l, right: r, floor: f } = WALL;
  const area = [[0, 830], [l, f], [r, f], [1659, 800], [1659, 948], [0, 948]];
  shape(ctx, area, "#000", 0.18);
  ctx.save();
  poly(ctx, area); ctx.clip();
  // the boards, running away toward the wall
  for (let x = -900; x <= 2600; x += 46) {
    const k = (f - VP.y) / (948 - VP.y), bx = VP.x + (x - VP.x) * k;
    line(ctx, bx, f, x, 948, { width: 1, alpha: 0.13, seed: 70 + x });
  }
  ctx.restore();
  // the moonlight come in at the window, lying on the boards
  hatch(ctx, [[570, 690], [790, 690], [860, 790], [500, 790]], { gap: 6, alpha: 0.06, slant: -1.1 });
}

function rug(ctx) {
  const outer = [[440, 765], [1240, 765], [1420, 948], [262, 948]];
  shape(ctx, outer, "#000", 0.22);
  stroke(ctx, outer, { width: 1.8, alpha: 0.6, close: true, seed: 80 });
  stroke(ctx, [[470, 780], [1210, 780], [1370, 948], [312, 948]], { width: 1.1, alpha: 0.35, seed: 81 });
  // its pattern, worn: a few lozenges
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9, y = 860, x = 380 + 900 * t;
    stroke(ctx, [[x, y - 16], [x + 26, y], [x, y + 16], [x - 26, y]], { width: 1, alpha: 0.18, close: true, seed: 82 + i });
  }
}

// ── the table under the window, the fern, her herbarium ─────────────────────

function table(ctx) {
  shape(ctx, [[535, 570], [810, 570], [810, 584], [535, 584]], "#0e0d0b");
  for (const [x0, x1] of [[548, 560], [785, 797]]) shape(ctx, [[x0, 584], [x1, 584], [x1 - 1, 681], [x0 + 1, 681]], "#0e0d0b");
  stroke(ctx, [[535, 570], [810, 570], [810, 584], [535, 584]], { width: 1.8, alpha: 0.8, close: true, seed: 90 });
  stroke(ctx, [[548, 584], [549, 681], [560, 681], [560, 584]], { width: 1.5, alpha: 0.7, seed: 91 });
  stroke(ctx, [[785, 584], [786, 681], [797, 681], [797, 584]], { width: 1.5, alpha: 0.7, seed: 92 });
  line(ctx, 560, 640, 785, 640, { width: 1.2, alpha: 0.45, seed: 93 });
  hatch(ctx, [[535, 570], [810, 570], [810, 574], [535, 574]], { gap: 4, alpha: 0.2 });
}

function fern(ctx) {
  // the pot
  shape(ctx, [[582, 544], [620, 544], [614, 571], [588, 571]], "#100e0c");
  stroke(ctx, [[580, 544], [622, 544], [614, 571], [588, 571]], { width: 1.5, alpha: 0.75, close: true, seed: 100 });
  line(ctx, 581, 550, 621, 550, { width: 1, alpha: 0.45, seed: 101 });
  // its fronds: arched out from the middle, little leaves along each
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI * (0.12 + (0.76 * i) / 10), len = 52 + ((i * 37) % 24), droop = 0.0035 * (1 + (i % 3));
    const pts = [];
    for (let s = 0; s <= 10; s++) {
      const d = (len * s) / 10;
      pts.push([601 + Math.cos(a) * d, 544 + Math.sin(a) * d + droop * d * d]);
    }
    stroke(ctx, pts, { width: 1.1, alpha: 0.65, seed: 102 + i });
    for (let s = 2; s < 10; s++) {
      const [x, y] = pts[s], [nx, ny] = pts[s + 1], dx = nx - x, dy = ny - y, n = Math.hypot(dx, dy) || 1;
      const leaf = 6 * (1 - s / 12);
      line(ctx, x, y, x - (dy / n) * leaf + dx * 0.3, y + (dx / n) * leaf + dy * 0.3, { width: 0.9, alpha: 0.45, seed: 120 + i * 10 + s });
      line(ctx, x, y, x + (dy / n) * leaf + dx * 0.3, y - (dx / n) * leaf + dy * 0.3, { width: 0.9, alpha: 0.45, seed: 121 + i * 10 + s });
    }
  }
}

function herbarium(ctx) {
  const [fl, fr, br, bl] = HERBARIUM;
  const down = 7;
  shape(ctx, [fl, fr, [fr[0], fr[1] + down], [fl[0], fl[1] + down]], pale(1), 0.55);
  shape(ctx, [fl, fr, br, bl], "#2b3f27", 0.95);
  stroke(ctx, [fl, fr, br, bl], { width: 1.4, alpha: 0.85, close: true, seed: 140 });
  stroke(ctx, [fl, fr, [fr[0], fr[1] + down], [fl[0], fl[1] + down]], { width: 1, alpha: 0.6, close: true, seed: 141 });
  stroke(ctx, [[722, 576], [750, 575]], { color: GOLD, width: 1.6, alpha: 0.85, seed: 142 });
}

// ── his cot, against the back wall by the stair ─────────────────────────────

function cot(ctx) {
  // the mattress and what lies in it, behind the front rail
  shape(ctx, [[842, 560], [1073, 560], [1073, 690], [842, 690]], "#0d0c0a", 0.85);
  line(ctx, 868, 530, 1050, 530, { width: 1.6, alpha: 0.6, seed: 150 });
  line(ctx, 846, 628, 1070, 628, { width: 1.2, alpha: 0.45, seed: 151 });
  // a bear's head and a ball, just over the rail
  ring(ctx, 912, 548, 14, 13, { width: 1.3, alpha: 0.7, seed: 152 });
  ring(ctx, 901, 536, 5, 5, { width: 1.1, alpha: 0.6, seed: 153 });
  ring(ctx, 923, 536, 5, 5, { width: 1.1, alpha: 0.6, seed: 154 });
  ring(ctx, 1010, 552, 10, 10, { width: 1.3, alpha: 0.65, seed: 155 });
  // the posts, the rails, the spindles
  for (const [x, y0, y1] of [[840, 538, 716], [1075, 538, 716], [868, 515, 690], [1050, 515, 690]]) {
    stroke(ctx, [[x - 4, y1], [x - 4, y0], [x + 4, y0], [x + 4, y1]], { width: 1.5, alpha: x === 868 || x === 1050 ? 0.45 : 0.85, seed: 160 + x });
    ring(ctx, x, y0 - 6, 6, 6, { width: 1.3, alpha: 0.7, seed: 161 + x });
  }
  line(ctx, 844, 560, 1071, 560, { width: 2, alpha: 0.85, seed: 170 });
  line(ctx, 844, 690, 1071, 690, { width: 2, alpha: 0.8, seed: 171 });
  for (let x = 858; x < 1062; x += 16) line(ctx, x, 562, x, 688, { width: 1.1, alpha: 0.6, seed: 172 + x });
  // the mobile over it: its arm, and what turns on it
  stroke(ctx, [[868, 515], [868, 430], [880, 412], [930, 404], [985, 410]], { width: 1.4, alpha: 0.7, seed: 180 });
  for (const [x, len, kind] of [[920, 40, "star"], [950, 52, "moon"], [980, 38, "star"]]) {
    line(ctx, x, 406, x, 406 + len, { width: 0.8, alpha: 0.4, seed: 181 + x });
    const y = 412 + len;
    if (kind === "moon") stroke(ctx, arch(x, y, 8, 8, 60, 300, 12), { color: GOLD, width: 1.5, alpha: 0.9, seed: 182 });
    else stroke(ctx, Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3.5 : 8; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; }), { color: GOLD, width: 1.3, alpha: 0.9, seed: 183 + x });
  }
}

// ── the spiral stair in the corner, up through the ceiling ──────────────────

function stair(ctx) {
  const cx = 1272, floorY = 762, R = 168, k = 0.2, rise = 44, steps = 14;
  // the well it goes up through, and the light come down it
  shape(ctx, arch(1290, 30, 200, 44, 0, 360, 40), "#000", 0.55);
  stroke(ctx, arch(1290, 30, 200, 44, 200, 340, 30), { width: 1.4, alpha: 0.5, seed: 200 });
  // the treads, round the post, each a little higher and further round
  const tread = (i) => {
    const phi = (0.95 - i * 0.45), y = floorY - 50 - i * rise; // its angle round the post, its height
    const at = (a, r = R) => [cx + Math.sin(a) * r, y + Math.cos(a) * r * k];
    return { phi, y, at };
  };
  const rail = [];
  for (let i = steps - 1; i >= 0; i--) {
    const { phi, y, at } = tread(i);
    const a0 = phi - 0.2, a1 = phi + 0.2, front = Math.cos(phi) > -0.2;
    const top = [[cx - 7, y], at(a0), at(phi), at(a1), [cx + 7, y]];
    shape(ctx, [...top, ...top.slice().reverse().map(([x, yy]) => [x, yy + 9])], "#0e0c0a");
    stroke(ctx, top, { width: 1.5, alpha: front ? 0.85 : 0.45, close: true, seed: 210 + i });
    if (front) hatch(ctx, top, { gap: 5, alpha: 0.12 });
    line(ctx, at(a0)[0], at(a0)[1], at(a0)[0], at(a0)[1] + 9, { width: 1.1, alpha: front ? 0.6 : 0.3, seed: 230 + i });
    // its baluster, up to the rail
    const [bx, by] = at(phi, R - 6);
    line(ctx, bx, by, bx, by - 92, { width: 1, alpha: front ? 0.55 : 0.28, seed: 250 + i });
  }
  for (let s = 0; s <= 130; s++) {
    const i = (s / 130) * (steps - 1), phi = 0.95 - i * 0.45, y = floorY - 50 - i * rise - 92;
    rail.push([cx + Math.sin(phi) * (R - 6), y + Math.cos(phi) * (R - 6) * k]);
  }
  stroke(ctx, rail, { width: 2.4, alpha: 0.85, seed: 270 });
  stroke(ctx, rail.map(([x, y]) => [x, y + 6]), { width: 1, alpha: 0.4, seed: 271 });
  // the post, iron, from the floor up out of sight
  fill(ctx, cx - 7, 40, 14, floorY - 40, "#0b0a09", 1);
  line(ctx, cx - 7, 40, cx - 7, floorY, { width: 1.6, alpha: 0.75, seed: 280 });
  line(ctx, cx + 7, 40, cx + 7, floorY, { width: 1.6, alpha: 0.75, seed: 281 });
  ring(ctx, cx, floorY, 26, 6, { width: 1.4, alpha: 0.6, seed: 282 });
}

// ── the medal cabinet against the left-hand wall ────────────────────────────

function cabinet(ctx, L) {
  const at = (u, v) => { const p = room6CabinetPoint(L, u, v); return [(p.x * PHOTO.width) / L.W, (p.y * PHOTO.height) / L.H]; };
  const c = L.cabinet, v0 = (c.h - c.glass.y1) / c.h, v1 = (c.h - c.glass.y0) / c.h;
  // the end of it toward us, the front, the cornice over both
  const end = [[46, 150], at(0, 0), at(0, 1), [52, 842]];
  const front = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
  shape(ctx, end, "#11100e");
  shape(ctx, front, "#0f0e0c");
  stroke(ctx, end, { width: 1.8, alpha: 0.8, close: true, seed: 300 });
  stroke(ctx, front, { width: 1.8, alpha: 0.85, close: true, seed: 301 });
  stroke(ctx, [[36, 132], at(0, -0.035), [at(1, -0.035)[0] + 8, at(1, -0.035)[1]], [at(1, 0)[0] + 8, at(1, 0)[1]], at(0, 0), [44, 150]], { width: 1.8, alpha: 0.8, close: true, seed: 302 });
  hatch(ctx, [[36, 132], at(0, -0.035), at(0, 0), [44, 150]], { gap: 5, alpha: 0.12 });
  // the end's carved upright and its panels
  for (const k of [0.25, 0.75]) { const x = 46 + (at(0, 0)[0] - 46) * k; line(ctx, x, 160 + 30 * k, x, 838 - 10 * k, { width: 1.1, alpha: 0.4, seed: 303 + k * 10 }); }
  box(ctx, 70, 580, 90, 220, { width: 1.1, alpha: 0.35, seed: 306 });
  // the glazed case: green velvet behind the glass
  const glass = [at(0.04, v0), at(0.96, v0), at(0.96, v1), at(0.04, v1)];
  shape(ctx, glass, "#13261c", 0.85);
  stroke(ctx, glass, { width: 1.5, alpha: 0.8, close: true, seed: 310 });
  // the brass light along its top, and the cups on its shelf below
  stroke(ctx, [at(0.08, v0 + 0.02), at(0.92, v0 + 0.02)], { color: GOLD, width: 2, alpha: 0.9, seed: 311 });
  for (const [u, s] of [[0.2, 1], [0.48, 1.2], [0.76, 0.95]]) {
    const [x, y] = at(u, v1 - 0.015), h = 70 * s;
    stroke(ctx, [[x - 16 * s, y - h], [x - 14 * s, y - h * 0.62], [x - 4 * s, y - h * 0.45], [x - 3 * s, y - h * 0.2], [x - 12 * s, y - 5], [x + 12 * s, y - 5], [x + 3 * s, y - h * 0.2], [x + 4 * s, y - h * 0.45], [x + 14 * s, y - h * 0.62], [x + 16 * s, y - h]], { color: GOLD, width: 1.5, alpha: 0.85, seed: 320 + u * 10 });
    stroke(ctx, arch(x - 17 * s, y - h * 0.82, 7 * s, 10 * s, 90, 270, 10), { color: GOLD, width: 1.2, alpha: 0.7, seed: 321 });
    stroke(ctx, arch(x + 17 * s, y - h * 0.82, 7 * s, 10 * s, -90, 90, 10), { color: GOLD, width: 1.2, alpha: 0.7, seed: 322 });
  }
  line(ctx, ...at(0.04, v1 - 0.012), ...at(0.96, v1 - 0.012), { width: 1.2, alpha: 0.5, seed: 330 });
  // the cupboard under it: two panelled doors, their knobs
  stroke(ctx, [at(0.5, v1 + 0.03), at(0.5, 0.97)], { width: 1.3, alpha: 0.65, seed: 331 });
  for (const [u0, u1] of [[0.08, 0.44], [0.56, 0.92]]) stroke(ctx, [at(u0, v1 + 0.07), at(u1, v1 + 0.07), at(u1, 0.92), at(u0, 0.92)], { width: 1.1, alpha: 0.45, close: true, seed: 332 + u0 * 10 });
  for (const u of [0.46, 0.54]) { const [x, y] = at(u, (v1 + 0.97) / 2); ring(ctx, x, y, 3, 3, { color: GOLD, width: 1.2, alpha: 0.8, seed: 340 }); }
  line(ctx, ...at(0, v1 + 0.015), ...at(1, v1 + 0.015), { width: 1.4, alpha: 0.6, seed: 341 });
}

/** Room VI, drawn: painted into the room's texture as the photograph would be */
export function paintRoom6Sketch(scene, L, keys) {
  const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(L.W / PHOTO.width, L.H / PHOTO.height);
  paper(ctx);
  walls(ctx);
  windowArch(ctx);
  wainscot(ctx);
  portrait(ctx);
  floor(ctx);
  rug(ctx);
  table(ctx);
  fern(ctx);
  herbarium(ctx);
  cot(ctx);
  stair(ctx);
  cabinet(ctx, L);
  ctx.restore();
  // his medals, behind the cabinet's glass, as the photograph has them
  const face = (u, v) => room6CabinetPoint(L, u, v);
  const sx = L.W / PHOTO.width, sy = L.H / PHOTO.height;
  paintProjectedMaterial(ctx, room6Medals(scene, L), face, 0.85, 20, 4);
  // the light there is: the moon at the window, the cabinet's lamp while it burns, down the stair's well
  soft(ctx, 677 * sx, 330 * sy, 150 * sx, 220 * sy, "120,150,200", 0.07, "lighter");
  soft(ctx, 680 * sx, 740 * sy, 210 * sx, 60 * sy, "150,170,210", 0.05, "lighter");
  soft(ctx, 1290 * sx, 60 * sy, 260 * sx, 160 * sy, "235,229,214", 0.05, "lighter");
  if (L.on.flags) {
    const lamp = L.glows.flags;
    soft(ctx, lamp.x, lamp.y + 20 * sy, lamp.r * 1.4, lamp.r * 2.2, "255,195,130", 0.09, "lighter");
  }
  vignette(ctx, L.W, L.H, 0.32, "source-over");
  addCanvasTexture(scene.textures, keys.room, canvas);
  addCanvasTexture(scene.textures, keys.glow, glowCanvas());
  return keys;
}

