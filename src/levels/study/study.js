import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg, polygon } from "../../shared/paint.js";
import { paintKey } from "../../shared/keyArt.js";
import { alignStudyPhotography, alignStudyObjects, paintStudyPhotography, paintStudyFlame, STUDY_FLAME } from "./photographicRoom.js";
import {
  WARM, BACK, roomLayout, chestAt, thingAt, fillPoly, block, onWall, paintShell, paintWindowWall, paintMoonlight,
  footShadow, paintChest, gloom,
} from "../house/roomKit.js";

/** The study, the first room off the hall, at night. Seen from just inside
 *  its door: the back wall with a tall window and the moon in it, a side wall
 *  at either hand. A lamp is lit on a table to the left, and under it stands
 *  a glass case of earth with something growing in it. By the window a
 *  writing desk with a candle burning on it, and on the wall over the desk
 *  a brass cipher wheel on its walnut plaque. On the window's sill a
 *  terracotta pot with something just come up in it: the window looks out
 *  on the garden. Bookshelves down the left.
 *
 *  Those three things open puzzles; here they are only themselves, small,
 *  enough to know them by.
 *
 *  The room is measured in centimetres: x across from the middle, y up from
 *  the floor, d away from the eye — which is a standing person's, 150 up,
 *  with the picture three metres in front of it.
 *
 *  On the desk too, a small gilt chest. It is shut until the room's three
 *  puzzles are solved; then it opens of itself and gives up a key.
 *
 *  Painted once per screen size: the room; a glow; the chest, shut and
 *  open; the key. */

const K = { room: "sd_room", glow: "sd_glow", shut: "sd_chest_shut", open: "sd_chest_open", key: "sd_key" };

// ── where everything is ─────────────────────────────────────────────────────

/** `lampOn`: whether the lamp on the table is alight — it is, until the case
 *  under it has given up its puzzle; after that it is turned right down.
 *  `candleOn`: the candle on the desk, which burns until the cipher wheel
 *  over it has been solved, and is then out. */
export function layoutStudy(W, H, { lampOn = true, candleOn = true, photographic = false } = {}) {
  const L = roomLayout(W, H);
  if (photographic) alignStudyPhotography(L);
  L.lampOn = lampOn;
  L.candleOn = candleOn;
  const { Q, half: hx } = L;
  // the lamp table, left, with the glass case on it
  const t = (L.table = { x0: -0.6 * hx, x1: -0.22 * hx, d0: 400, d1: 458, h: 72 });
  const tw = t.x1 - t.x0;
  L.tank = { x0: t.x0 + tw * 0.42, x1: t.x0 + tw * 0.95, d0: 414, d1: 446, y0: t.h, y1: t.h + 50, soil: t.h + 24 };
  L.lamp = { x: t.x0 + tw * 0.2, d: 432, y: t.h };
  // the window in the back wall
  const wc = Q(0.1 * hx, 0, BACK);
  L.win = { cx: wc.x, rx: 0.2 * hx * wc.s, top: Q(0, 288, BACK).y, sill: Q(0, 104, BACK).y, x: 0.1 * hx, hw: 0.2 * hx };
  // the writing desk beside it, a candle on it, the cipher wheel on the wall over it
  const k = (L.desk = { x0: 0.4 * hx, x1: 0.84 * hx, d0: 500, d1: 560, h: 76 });
  const kw = k.x1 - k.x0;
  L.wheel = { x: k.x0 + kw * 0.44, y: 152, r: 24, plaque: 30 };
  L.candle = { x: k.x0 + kw * 0.8, d: 540, y: k.h };
  // the little chest on the desk's left end
  L.chest = { x0: k.x0 + kw * 0.1, x1: k.x0 + kw * 0.28, d0: 524, d1: 539, y0: k.h + 1, y1: k.h + 8.5, lid: 5.5 };
  chestAt(L);
  // down the left-hand wall, the books
  L.shelf = { d0: 372, d1: 566, y0: 0, y1: 236 };
  if (photographic) alignStudyObjects(L);

  // what opens a puzzle: its outline to click in, the box its glints keep to
  const things = [];
  const thing = (level, label, pts) => things.push(thingAt(level, label, pts));
  const a = L.tank;
  thing("binarytree", "Look into the glass case", [Q(a.x0, a.y1, a.d1), Q(a.x1, a.y1, a.d1), Q(a.x1, a.y0, a.d0), Q(a.x0, a.y0, a.d0)]);
  const w = L.win;
  thing("plantpot", "Look out at the garden", [{ x: w.cx - w.rx, y: w.top }, { x: w.cx + w.rx, y: w.top }, { x: w.cx + w.rx, y: w.sill }, { x: w.cx - w.rx, y: w.sill }]);
  const c = L.wheel;
  thing("cryptex", "Look at the cipher wheel", [Q(c.x - c.plaque, c.y + c.plaque, BACK), Q(c.x + c.plaque, c.y + c.plaque, BACK), Q(c.x + c.plaque, c.y - c.plaque, BACK), Q(c.x - c.plaque, c.y - c.plaque, BACK)]);
  L.things = things;
  // the two flames of the room, for the scene to keep alive
  const lp = Q(L.lamp.x, L.lamp.y + 34, L.lamp.d);
  L.lampGlow = { x: lp.x, y: lp.y, r: 150 * lp.s };
  const cp = Q(L.candle.x, L.candle.y + 27, L.candle.d);
  L.flame = { x: cp.x, y: cp.y, r: 46 * cp.s };
  if (photographic) {
    L.lampGlow = L.photoLamp;
    L.flame = L.photoFlame;
  }
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintStudy(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  if (!paintStudyPhotography(ctx, scene, L)) {
    paintShell(ctx, L);
    paintWindowWall(ctx, L);
    paintPlate(ctx, L);
    paintWheel(ctx, L);
    paintPot(ctx, L);
    paintShelves(ctx, L);
    paintRug(ctx, L);
    paintMoonlight(ctx, L);
    paintDesk(ctx, L);
    paintTable(ctx, L);
    paintGloom(ctx, L);
    vignette(ctx, W, H, 0.7);
    grain(ctx, W, H, 0.035);
  }
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, paintChest(L, false));
  addCanvasTexture(t, K.open, paintChest(L, true));
  addCanvasTexture(t, K.key, paintKey());
  if (L.photographic) paintStudyFlame(t);
  return { keys: K };
}

export function releaseStudyArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
  if (textures.exists(STUDY_FLAME)) textures.remove(STUDY_FLAME);
}

// the bookshelves down the left-hand wall
function paintShelves(ctx, L) {
  const at = L.shelf;
  const R = 2, fw = (at.d1 - at.d0) * R, fh = (at.y1 - at.y0) * R;
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  const rnd = lcg(52);
  g.fillStyle = "#1c110a";
  g.fillRect(0, 0, fw, fh);
  g.fillStyle = "#070403";
  g.fillRect(8 * R, 8 * R, fw - 16 * R, fh - 16 * R);
  const spines = ["#3a1a16", "#1e2a24", "#2a2418", "#1a2230", "#3a2c16", "#2c1620", "#20201c", "#3c2a20"];
  const rows = 5, rh = (fh - 16 * R) / rows;
  for (let r = 0; r < rows; r++) {
    const base = 8 * R + (r + 1) * rh - 3 * R;
    let x = 10 * R;
    while (x < fw - 14 * R) {
      const bw = (2.4 + rnd() * 3.6) * R, bh = rh * (0.62 + rnd() * 0.26);
      if (rnd() < 0.08) { x += bw * 1.6; continue; } // a gap, a book leaning out of it
      g.fillStyle = spines[Math.floor(rnd() * spines.length)];
      g.fillRect(x, base - bh, bw - 0.6, bh);
      g.fillStyle = "rgba(255,220,170,0.1)";
      g.fillRect(x, base - bh, 0.8, bh);
      if (rnd() < 0.5) {
        g.fillStyle = "rgba(190,160,90,0.4)";
        g.fillRect(x + 0.6, base - bh * (0.74 + rnd() * 0.1), bw - 1.8, 1.4);
        g.fillRect(x + 0.6, base - bh * 0.22, bw - 1.8, 1);
      }
      x += bw;
    }
    // the shelf board, and the shadow it throws on the books below
    g.fillStyle = "#2a1a0e";
    g.fillRect(8 * R, base, fw - 16 * R, 3 * R);
    const sh = g.createLinearGradient(0, base + 3 * R, 0, base + 16 * R);
    sh.addColorStop(0, "rgba(0,0,0,0.75)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sh;
    g.fillRect(8 * R, base + 3 * R, fw - 16 * R, 13 * R);
  }
  // its cornice
  g.fillStyle = "#2e1c10";
  g.fillRect(0, 0, fw, 7 * R);
  onWall(ctx, L, -1, at, flat);
}

// On the back wall, left of the window, over the lamp: a botanist's plate
// pinned up — a whole plant drawn the way a textbook draws one, in sepia ink
// on paper gone cream: its flower and a bud, its leaves up the stem, the line
// of the ground drawn through it and the earth below in section, and the root
// going down, branching, fine hairs on its ends. Beside it the flower cut in
// half and a seed, each in its own ring; a ruled border; leader lines out to
// the margin where the parts were once labelled, too small now to be read.
function paintPlate(ctx, L) {
  const hx = L.half;
  // wide and low: hung under the picture rail, well clear of the case on the table below
  const cx = -0.5 * hx, w = 140, h = 98, y0 = 146;
  const a = L.Q(cx - w / 2, y0 + h, BACK), b = L.Q(cx + w / 2, y0, BACK);
  const flat = plantPlate();
  // its shadow on the wall, then the sheet, curling a little off it at the foot
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(a.x + 3 * a.s, a.y + 4 * a.s, b.x - a.x, b.y - a.y);
  ctx.drawImage(flat, a.x, a.y, b.x - a.x, b.y - a.y);
  // the lamp's light across its lower half, the room's dark over the top
  const g = ctx.createLinearGradient(0, a.y, 0, b.y);
  g.addColorStop(0, "rgba(16,11,6,0.6)");
  g.addColorStop(0.6, "rgba(16,11,6,0.38)");
  g.addColorStop(1, "rgba(16,11,6,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  if (L.lampOn) soft(ctx, (a.x + b.x) / 2, b.y, (b.x - a.x) * 0.9, (b.y - a.y) * 0.6, WARM, 0.14, "lighter");
  // two brass pins at its top corners
  for (const x of [a.x + 4 * a.s, b.x - 4 * a.s]) {
    const y = a.y + 4 * a.s;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.arc(x + 1.2 * a.s, y + 1.5 * a.s, 1.6 * a.s, 0, Math.PI * 2); ctx.fill();
    const pg = ctx.createRadialGradient(x - 0.5 * a.s, y - 0.5 * a.s, 0.2 * a.s, x, y, 1.7 * a.s);
    pg.addColorStop(0, "#f4dc9a"); pg.addColorStop(1, "#6a4a16");
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(x, y, 1.7 * a.s, 0, Math.PI * 2); ctx.fill();
  }
}

// the plate itself, drawn flat, 1000 by 700: the plant down the left of it,
// the details in their rings to the right
function plantPlate() {
  const W = 1000, H = 700;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const rnd = lcg(1871);
  // the paper: cream, gone brown at its edges, foxed here and there
  g.fillStyle = "#e4d8b8";
  g.fillRect(0, 0, W, H);
  const edge = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8);
  edge.addColorStop(0, "rgba(120,84,40,0)");
  edge.addColorStop(1, "rgba(120,84,40,0.4)");
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(140,96,48,${(0.04 + rnd() * 0.08).toFixed(3)})`;
    g.beginPath(); g.arc(rnd() * W, rnd() * H, 3 + rnd() * 14, 0, Math.PI * 2); g.fill();
  }
  // the curl at the bottom right corner
  g.fillStyle = "rgba(0,0,0,0.12)";
  g.beginPath(); g.moveTo(W, H - 70); g.quadraticCurveTo(W - 30, H - 30, W - 70, H); g.lineTo(W, H); g.closePath(); g.fill();

  const ink = (alpha = 0.85) => `rgba(66,44,24,${alpha})`;
  // drawn a little heavier than a real plate, so it holds at the size it is seen at
  const line = (wd, alpha) => { g.strokeStyle = ink(alpha); g.lineWidth = wd * 1.9; g.lineCap = "round"; g.lineJoin = "round"; };
  // the ruled border, two lines
  line(2.2, 0.8); g.strokeRect(26, 26, W - 52, H - 52);
  line(0.9, 0.7); g.strokeRect(34, 34, W - 68, H - 68);
  // the title: a plate number, and a line of fine script under it
  g.fillStyle = ink(0.85);
  g.font = 'italic 26px Georgia, "Times New Roman", serif';
  g.textAlign = "center";
  g.fillText("Plate I.", W / 2, 76);
  const scribble = (x, y, len, seed) => {
    // a line of handwriting, too small to read: little loops along a baseline
    const r = lcg(seed);
    line(1, 0.7);
    g.beginPath(); g.moveTo(x, y);
    for (let px = x; px < x + len; px += 4) g.lineTo(px + 2, y - 2 - r() * 4), g.lineTo(px + 4, y + r() * 1.5);
    g.stroke();
  };
  scribble(W / 2 - 110, 102, 220, 3);

  // the plant is drawn in its own measure, 600 by 806, set into the left of the sheet
  g.save();
  g.translate(150, 26);
  g.scale(0.8, 0.8);
  const ground = 470; // the line of the ground
  const sx = 250; // the stem
  // the earth, in section: the ground's line, stippled below it, fading down
  line(1.8, 0.85);
  g.beginPath(); g.moveTo(60, ground); g.bezierCurveTo(160, ground - 6, 340, ground + 6, 450, ground - 2); g.stroke();
  for (let i = 0; i < 900; i++) {
    const x = 62 + rnd() * 386, y = ground + 4 + Math.pow(rnd(), 1.6) * 230;
    g.fillStyle = ink(0.12 + (1 - (y - ground) / 240) * 0.35);
    g.fillRect(x, y, 1.6, 1.6);
  }
  for (let i = 0; i < 9; i++) {
    // pebbles
    const x = 80 + rnd() * 360, y = ground + 20 + rnd() * 150, r = 4 + rnd() * 6;
    line(1, 0.5); g.beginPath(); g.ellipse(x, y, r, r * 0.7, rnd(), 0, Math.PI * 2); g.stroke();
  }
  // the root: a taproot going down and tapering, laterals off it, each branching, fine hairs
  const root = (x, y, angle, len, width, depth) => {
    const ex = x + Math.sin(angle) * len, ey = y + Math.cos(angle) * len;
    const cxp = x + Math.sin(angle + (rnd() - 0.5) * 0.6) * len * 0.5, cyp = y + Math.cos(angle) * len * 0.5;
    line(width, 0.85);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cxp, cyp, ex, ey); g.stroke();
    if (depth > 0) {
      const n = depth === 3 ? 7 : 3;
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1), mt = 1 - t;
        const px = mt * mt * x + 2 * mt * t * cxp + t * t * ex, py = mt * mt * y + 2 * mt * t * cyp + t * t * ey;
        const side = i % 2 ? 1 : -1;
        root(px, py, angle + side * (0.7 + rnd() * 0.5), len * (0.45 + rnd() * 0.2) * (1 - t * 0.4), width * 0.55, depth - 1);
      }
    } else {
      // the hairs near the tip
      line(0.5, 0.45);
      for (let k = 0; k < 6; k++) {
        const t = 0.5 + k * 0.08, px = x + (ex - x) * t, py = y + (ey - y) * t;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rnd() - 0.5) * 10, py + 3 + rnd() * 5); g.stroke();
      }
    }
  };
  root(sx, ground, 0.02, 250, 3.4, 3);
  // the stem: up from the ground, a slight lean, drawn with both its edges
  const stemTop = 170;
  const stemAt = (t) => ({ x: sx + Math.sin(t * Math.PI) * 14 - t * 6, y: ground - (ground - stemTop) * t });
  line(1.6, 0.9);
  for (const off of [-4, 4]) {
    g.beginPath();
    for (let t = 0; t <= 1.001; t += 0.05) { const p = stemAt(t); const w = off * (1 - t * 0.45); if (t) g.lineTo(p.x + w, p.y); else g.moveTo(p.x + w, p.y); }
    g.stroke();
  }
  // leaves up it, alternate: each an outline with its midrib and veins, hatched on its shaded half
  const leaf = (x, y, angle, len, wd) => {
    g.save(); g.translate(x, y); g.rotate(angle);
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.3, -wd, len * 0.75, -wd * 0.8, len, 0);
    g.bezierCurveTo(len * 0.75, wd * 0.8, len * 0.3, wd, 0, 0);
    g.fillStyle = "rgba(120,140,90,0.12)"; g.fill();
    line(1.4, 0.88); g.stroke();
    line(0.9, 0.75); g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.96, 0); g.stroke();
    line(0.6, 0.55);
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      for (const d of [-1, 1]) { g.beginPath(); g.moveTo(len * t, 0); g.quadraticCurveTo(len * (t + 0.05), d * wd * 0.35, len * (t + 0.1), d * wd * 0.62 * Math.sin(Math.PI * t)); g.stroke(); }
    }
    // hatching on the lower half
    g.save();
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.75, wd * 0.8, len * 0.3, wd, 0, 0); g.lineTo(len, 0); g.closePath();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(len, 0); g.bezierCurveTo(len * 0.75, wd * 0.8, len * 0.3, wd, 0, 0); g.clip();
    line(0.5, 0.35);
    for (let k = -wd; k < len; k += 5) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + wd, wd); g.stroke(); }
    g.restore();
    g.restore();
  };
  [[0.18, -1, 92, 26], [0.34, 1, 100, 28], [0.5, -1, 84, 24], [0.66, 1, 70, 20], [0.8, -1, 52, 15]].forEach(([t, d, len, wd]) => {
    const p = stemAt(t);
    leaf(p.x + d * 4, p.y, d < 0 ? Math.PI + 0.45 : -0.45, len, wd);
  });
  // a bud, closed, on a short stalk
  const bp = stemAt(0.72);
  line(1.2, 0.85);
  g.beginPath(); g.moveTo(bp.x + 4, bp.y); g.quadraticCurveTo(bp.x + 40, bp.y - 20, bp.x + 52, bp.y - 50); g.stroke();
  g.beginPath(); g.ellipse(bp.x + 54, bp.y - 62, 9, 15, 0.3, 0, Math.PI * 2); g.stroke();
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(bp.x + 50, bp.y - 52); g.quadraticCurveTo(bp.x + 54 + d * 12, bp.y - 60, bp.x + 56 + d * 4, bp.y - 74); g.stroke(); }
  // the flower: petals round a disc, the disc stippled
  const fp = stemAt(1);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    g.save(); g.translate(fp.x, fp.y - 18); g.rotate(a);
    g.beginPath(); g.moveTo(0, -10); g.bezierCurveTo(-14, -30, -10, -52, 0, -56); g.bezierCurveTo(10, -52, 14, -30, 0, -10);
    g.fillStyle = "rgba(220,190,120,0.18)"; g.fill();
    line(1.3, 0.85); g.stroke();
    line(0.5, 0.45); g.beginPath(); g.moveTo(0, -14); g.lineTo(0, -50); g.stroke();
    g.restore();
  }
  g.beginPath(); g.arc(fp.x, fp.y - 18, 13, 0, Math.PI * 2); g.fillStyle = "rgba(90,60,30,0.25)"; g.fill(); line(1.3, 0.85); g.stroke();
  for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 11; g.fillStyle = ink(0.6); g.fillRect(fp.x + Math.cos(a) * r, fp.y - 18 + Math.sin(a) * r, 1.4, 1.4); }
  // the details, each in a ring: the flower cut through, and a seed
  // (the details stand out to the right, in the sheet's wide margin)
  g.save();
  g.translate(250, -40);
  const ring = (x, y, r) => { line(1, 0.7); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); };
  ring(470, 230, 62);
  line(1.2, 0.85);
  g.beginPath(); g.moveTo(440, 270); g.quadraticCurveTo(470, 280, 500, 270); g.lineTo(492, 210); g.quadraticCurveTo(470, 196, 448, 210); g.closePath(); g.stroke();
  for (const x of [458, 470, 482]) { g.beginPath(); g.moveTo(x, 262); g.lineTo(x + (x - 470) * 0.2, 214); g.stroke(); g.beginPath(); g.arc(x + (x - 470) * 0.2, 211, 3, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.ellipse(470, 250, 9, 6, 0, 0, Math.PI * 2); g.stroke();
  ring(470, 400, 44);
  g.beginPath(); g.ellipse(470, 400, 14, 22, 0.4, 0, Math.PI * 2); g.stroke();
  line(0.6, 0.5); g.beginPath(); g.moveTo(462, 384); g.quadraticCurveTo(470, 400, 476, 418); g.stroke();
  g.restore();
  // the leader lines out to the margins, and the labels on them
  const label = (fx, fy, tx, ty, seed) => {
    line(0.8, 0.65);
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(tx, ty); g.stroke();
    g.beginPath(); g.arc(fx, fy, 1.8, 0, Math.PI * 2); g.fillStyle = ink(0.8); g.fill();
    const left = tx < 300;
    scribble(left ? tx - 64 : tx + 4, ty + 3, 60, seed);
  };
  label(fp.x - 30, fp.y - 40, 110, 150, 11);
  label(stemAt(0.34).x + 60, stemAt(0.34).y - 4, 380, 330, 12);
  label(stemAt(0.5).x - 50, stemAt(0.5).y + 4, 110, 300, 13);
  label(sx + 4, ground + 100, 110, 560, 14);
  label(sx + 70, ground + 120, 390, 600, 15);
  label(60 + 30, ground + 2, 110, 470 - 30, 16);
  // the figure numbers by the details
  g.font = 'italic 16px Georgia, serif';
  g.fillStyle = ink(0.8);
  g.fillText("2.", 670, 132);
  g.fillText("3.", 682, 322);
  g.fillText("1.", sx - 70, 720);
  g.restore();

  // and along the foot of the right half, how it began: the seed in the earth,
  // its first root, the shoot come up with its two seed-leaves, the seedling
  const gy = 560;
  line(1.4, 0.85);
  g.beginPath(); g.moveTo(560, gy); g.bezierCurveTo(680, gy - 4, 820, gy + 4, 960, gy - 1); g.stroke();
  for (let i = 0; i < 420; i++) {
    const x = 562 + rnd() * 396, y = gy + 3 + Math.pow(rnd(), 1.5) * 80;
    g.fillStyle = ink(0.1 + (1 - (y - gy) / 84) * 0.3);
    g.fillRect(x, y, 1.6, 1.6);
  }
  const seed = (x, y) => { line(1.3, 0.85); g.beginPath(); g.ellipse(x, y, 9, 6, -0.3, 0, Math.PI * 2); g.stroke(); line(0.6, 0.5); g.beginPath(); g.moveTo(x - 5, y + 1); g.quadraticCurveTo(x, y - 3, x + 5, y - 2); g.stroke(); };
  const rootling = (x, y, len, side) => {
    line(1.2, 0.85); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + len * 0.5, x - 2, y + len); g.stroke();
    line(0.7, 0.6);
    for (let k = 1; k <= side; k++) { const py = y + (len * k) / (side + 1); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + 1, py); g.lineTo(x + d * (8 + k * 2), py + 7); g.stroke(); } }
  };
  const seedLeaves = (x, y, s) => {
    line(1.2, 0.85);
    for (const d of [-1, 1]) { g.beginPath(); g.ellipse(x + d * 9 * s, y - 3 * s, 10 * s, 5 * s, d * -0.4, 0, Math.PI * 2); g.stroke(); }
  };
  // 1: the seed
  seed(610, gy + 24);
  // 2: split, its root going down, the shoot hooked over still under the ground
  seed(700, gy + 22);
  rootling(704, gy + 27, 34, 0);
  line(1.2, 0.85); g.beginPath(); g.moveTo(700, gy + 17); g.quadraticCurveTo(702, gy + 4, 712, gy + 8); g.stroke();
  // 3: through the ground, its two seed-leaves opening
  line(1.3, 0.85); g.beginPath(); g.moveTo(790, gy + 20); g.lineTo(790, gy - 34); g.stroke();
  seedLeaves(790, gy - 34, 1);
  rootling(790, gy + 20, 46, 2);
  // 4: the seedling, its first true leaves over the seed-leaves
  line(1.4, 0.85); g.beginPath(); g.moveTo(900, gy + 18); g.quadraticCurveTo(904, gy - 40, 900, gy - 92); g.stroke();
  seedLeaves(902, gy - 46, 1.1);
  for (const d of [-1, 1]) {
    line(1.2, 0.85);
    g.beginPath(); g.moveTo(900, gy - 90);
    g.bezierCurveTo(900 + d * 10, gy - 110, 900 + d * 30, gy - 112, 900 + d * 36, gy - 100);
    g.bezierCurveTo(900 + d * 26, gy - 92, 900 + d * 12, gy - 90, 900, gy - 90); g.stroke();
  }
  rootling(900, gy + 18, 62, 3);
  // arrows between them, and their numbers
  line(1, 0.7);
  for (const x of [640, 735, 838]) { g.beginPath(); g.moveTo(x, gy - 60); g.lineTo(x + 30, gy - 60); g.moveTo(x + 24, gy - 64); g.lineTo(x + 30, gy - 60); g.lineTo(x + 24, gy - 56); g.stroke(); }
  g.font = 'italic 15px Georgia, serif';
  g.fillStyle = ink(0.8);
  ["4.", "5.", "6.", "7."].forEach((n, i) => g.fillText(n, [610, 704, 790, 900][i], gy + 112));
  return c;
}

// on the window's sill, against the night: a terracotta pot, and in it a
// shoot with its first two leaves, the moon on one side of everything
function paintPot(ctx, L) {
  const w = L.win;
  const p = L.Q(w.x + w.hw * 0.46, 104, BACK - 6), s = p.s;
  const y = p.y - 1.5 * s; // standing on the sill board
  soft(ctx, p.x, y, 13 * s, 2.6 * s, "0,0,0", 0.6);
  const clay = ctx.createLinearGradient(p.x - 8 * s, 0, p.x + 8 * s, 0);
  clay.addColorStop(0, "#8a9cb8");
  clay.addColorStop(0.16, "#7a4a34");
  clay.addColorStop(0.6, "#4e2c1e");
  clay.addColorStop(1, "#22120c");
  ctx.fillStyle = clay;
  ctx.beginPath();
  ctx.moveTo(p.x - 7.4 * s, y - 13 * s);
  ctx.lineTo(p.x + 7.4 * s, y - 13 * s);
  ctx.lineTo(p.x + 5.2 * s, y);
  ctx.lineTo(p.x - 5.2 * s, y);
  ctx.closePath();
  ctx.fill();
  // its rim, and the earth in it
  ctx.fillRect(p.x - 8.4 * s, y - 16 * s, 16.8 * s, 3.6 * s);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(p.x - 8.4 * s, y - 12.6 * s, 16.8 * s, 0.8 * s);
  ctx.fillStyle = "#140c07";
  ctx.beginPath(); ctx.ellipse(p.x, y - 16 * s, 7.6 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  // the shoot
  ctx.strokeStyle = "#3e6a34";
  ctx.lineWidth = Math.max(1, 1.1 * s);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(p.x, y - 16 * s);
  ctx.quadraticCurveTo(p.x + 2.4 * s, y - 24 * s, p.x - 0.6 * s, y - 32 * s);
  ctx.stroke();
  ctx.lineCap = "butt";
  for (const [ang, col] of [[-0.6, "#2e5630"], [Math.PI + 0.6, "#7e9eb0"]]) {
    ctx.save();
    ctx.translate(p.x - 0.6 * s, y - 32 * s);
    ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4.5 * s, -4 * s, 9 * s, 0);
    ctx.quadraticCurveTo(4.5 * s, 4 * s, 0, 0);
    ctx.fill();
    ctx.restore();
  }
}

// The cipher wheel, on the wall over the desk: a walnut plaque, and on it two
// rings of brass, one inside the other, the alphabet cut round each — the
// outer fixed, the inner free to turn on its hub. The candle below lights it.
function paintWheel(ctx, L) {
  const wh = L.wheel;
  const c = L.Q(wh.x, wh.y, BACK), s = c.s;
  const r = wh.r * s, pl = wh.plaque * s;
  // the candle's light on the wall here
  if (L.candleOn) soft(ctx, c.x + 30 * s, c.y + 40 * s, 110 * s, 90 * s, WARM, 0.16, "lighter");
  // the plaque, standing a little off the wall
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath(); ctx.roundRect(c.x - pl - 2 * s, c.y - pl - 3 * s, pl * 2, pl * 2, 3 * s); ctx.fill();
  const wd = ctx.createLinearGradient(c.x - pl, c.y - pl, c.x + pl, c.y + pl);
  wd.addColorStop(0, "#24140b");
  wd.addColorStop(1, "#56361f");
  ctx.fillStyle = wd;
  ctx.beginPath(); ctx.roundRect(c.x - pl, c.y - pl, pl * 2, pl * 2, 3 * s); ctx.fill();
  ctx.save();
  ctx.clip();
  const rnd = lcg(77);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.2)" : "rgba(255,200,150,0.05)";
    ctx.fillRect(c.x - pl, c.y - pl + rnd() * pl * 2, pl * 2, Math.max(0.6, rnd() * 1.4 * s));
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,210,160,0.16)";
  ctx.lineWidth = Math.max(0.6, 0.6 * s);
  ctx.beginPath(); ctx.roundRect(c.x - pl + 2 * s, c.y - pl + 2 * s, pl * 2 - 4 * s, pl * 2 - 4 * s, 2 * s); ctx.stroke();
  // the wheel's shadow on the plaque, thrown up and to the left by the candle
  soft(ctx, c.x - 2.5 * s, c.y - 3 * s, r * 1.12, r * 1.12, "0,0,0", 0.6);
  // brass, lit from below on the right
  const brass = (rad, hi, lo) => {
    const g = ctx.createRadialGradient(c.x + rad * 0.45, c.y + rad * 0.5, rad * 0.05, c.x, c.y, rad * 1.1);
    g.addColorStop(0, hi);
    g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.fill();
  };
  const ring = (rad, a, w = 0.7) => {
    ctx.strokeStyle = `rgba(20,12,4,${a})`;
    ctx.lineWidth = Math.max(0.6, w * s);
    ctx.beginPath(); ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.stroke();
  };
  // the alphabet round a ring, each letter standing on the rim
  const letters = (rad, size, turn) => {
    ctx.fillStyle = "rgba(26,16,6,0.9)";
    ctx.font = `700 ${Math.max(3, size).toFixed(1)}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 26; i++) {
      const a = ((i + turn) / 26) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.translate(c.x + Math.cos(a) * rad, c.y + Math.sin(a) * rad);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(String.fromCharCode(65 + i), 0, 0);
      ctx.restore();
    }
  };
  // the outer ring, fixed
  brass(r, "#e8c878", "#5e4418");
  ring(r, 0.8, 0.9);
  ring(r * 0.72, 0.75);
  letters(r * 0.86, r * 0.19, 0);
  // the inner disk, turned a few letters round
  brass(r * 0.7, "#f2d68c", "#6e5220");
  ring(r * 0.46, 0.55);
  letters(r * 0.58, r * 0.17, 5);
  // its engraved middle: spokes, a boss, the screw it turns on
  ctx.strokeStyle = "rgba(30,18,6,0.5)";
  ctx.lineWidth = Math.max(0.5, 0.5 * s);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * r * 0.16, c.y + Math.sin(a) * r * 0.16);
    ctx.lineTo(c.x + Math.cos(a) * r * 0.44, c.y + Math.sin(a) * r * 0.44);
    ctx.stroke();
  }
  brass(r * 0.15, "#fff0b8", "#7a5a22");
  ring(r * 0.15, 0.8);
  ctx.fillStyle = "#1a1006";
  ctx.fillRect(c.x - r * 0.09, c.y - 0.4 * s, r * 0.18, 0.8 * s);
  // the pointer at the top of the plaque, and the light along the rim
  ctx.fillStyle = "#c8a04e";
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - r * 0.98);
  ctx.lineTo(c.x - 2 * s, c.y - r - 4 * s);
  ctx.lineTo(c.x + 2 * s, c.y - r - 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,236,190,0.55)";
  ctx.lineWidth = Math.max(0.6, 0.8 * s);
  ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.97, 0.2, 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.68, 0.3, 1.4); ctx.stroke();
}

// a rug in the middle of the boards: deep red, a paler border, worn
function paintRug(ctx, L) {
  const { Q, half: hx } = L;
  const rnd = lcg(87);
  const strip = (hw, d0, d1, col) => fillPoly(ctx, [Q(-hw + 0.08 * hx, 0, d0), Q(hw + 0.08 * hx, 0, d0), Q(hw + 0.08 * hx, 0, d1), Q(-hw + 0.08 * hx, 0, d1)], col);
  const hw = hx * 0.36;
  strip(hw, 330, 520, "#2e0c10");
  strip(hw - 7, 336, 514, "#6a5a3a");
  strip(hw - 11, 340, 510, "#3c1014");
  ctx.fillStyle = "rgba(120,96,56,0.26)";
  for (let d = 362; d < 500; d += 44) {
    const p = Q(0.08 * hx, 0, d), q = Q(0.08 * hx, 0, d + 22), r = Q(0.08 * hx, 0, d + 44);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x + hw * 0.3 * q.s, q.y);
    ctx.lineTo(r.x, r.y);
    ctx.lineTo(q.x - hw * 0.3 * q.s, q.y);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 700; i++) {
    const p = Q(0.08 * hx + (rnd() * 2 - 1) * hw, 0, 332 + rnd() * 186);
    ctx.fillStyle = rnd() < 0.6 ? "rgba(0,0,0,0.2)" : "rgba(255,220,190,0.05)";
    ctx.fillRect(p.x, p.y, 3 * p.s, 0.9 * p.s);
  }
}

// the writing desk by the window: a pedestal either side of the kneehole,
// and on its leather top a candle
function paintDesk(ctx, L) {
  const { Q } = L;
  const k = L.desk;
  const oak = { side: "#160d07", top: "#3a2414", front: "#24150c" };
  footShadow(ctx, L, k);
  const ped = (k.x1 - k.x0) * 0.3;
  block(ctx, L, { ...k, y0: 0, y1: k.h - 13, x1: k.x0 + ped }, oak);
  block(ctx, L, { ...k, y0: 0, y1: k.h - 13, x0: k.x1 - ped }, oak);
  // the dark of the kneehole
  fillPoly(ctx, [Q(k.x0 + ped, 0, k.d0 + 4), Q(k.x1 - ped, 0, k.d0 + 4), Q(k.x1 - ped, k.h - 13, k.d0 + 4), Q(k.x0 + ped, k.h - 13, k.d0 + 4)], "#050302");
  block(ctx, L, { ...k, y0: k.h - 13, y1: k.h - 3 }, oak);
  block(ctx, L, { x0: k.x0 - 3, x1: k.x1 + 3, d0: k.d0 - 3, d1: k.d1, y0: k.h - 3, y1: k.h }, { side: "#1c1009", top: "#4a2e1a", front: "#3a2212" });
  // the leather let into the top
  fillPoly(ctx, [Q(k.x0 + 6, k.h, k.d0 + 5), Q(k.x1 - 6, k.h, k.d0 + 5), Q(k.x1 - 6, k.h, k.d1 - 6), Q(k.x0 + 6, k.h, k.d1 - 6)], "#18301f");
  // drawers, each with its brass pull
  const s = Q(0, 0, k.d0).s;
  const drawer = (x0, x1, y0, y1) => {
    const a = Q(x0, y1, k.d0), b = Q(x1, y0, k.d0);
    ctx.strokeStyle = "rgba(4,2,1,0.8)";
    ctx.lineWidth = Math.max(0.8, 0.7 * s);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.fillStyle = "rgba(255,200,150,0.05)";
    ctx.fillRect(a.x, a.y, b.x - a.x, 1.2 * s);
    ctx.fillStyle = "#a8863e";
    ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(1.2, 1.5 * s), 0, Math.PI * 2); ctx.fill();
  };
  for (const [x0, x1] of [[k.x0 + 3, k.x0 + ped - 3], [k.x1 - ped + 3, k.x1 - 3]]) {
    for (const [y0, y1] of [[5, 22], [25, 42], [45, 60]]) drawer(x0, x1, y0, y1);
  }
  drawer(k.x0 + ped + 3, k.x1 - ped - 3, k.h - 11, k.h - 5);

  // ── the candle: a brass chamberstick, a stub of wax, its flame
  const cn = L.candle, c = Q(cn.x, cn.y, cn.d), u = c.s;
  if (L.candleOn) soft(ctx, c.x, c.y, 60 * u, 16 * u, WARM, 0.3, "lighter");
  ctx.fillStyle = "#1a1208";
  ctx.beginPath(); ctx.ellipse(c.x, c.y, 9 * u, 2.8 * u, 0, 0, Math.PI * 2); ctx.fill();
  const br = ctx.createLinearGradient(c.x - 9 * u, 0, c.x + 9 * u, 0);
  br.addColorStop(0, "#3a2a10"); br.addColorStop(0.45, "#d0aa58"); br.addColorStop(1, "#2a1e0c");
  ctx.fillStyle = br;
  ctx.beginPath(); ctx.ellipse(c.x, c.y - 1 * u, 9 * u, 2.6 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(c.x - 2.6 * u, c.y - 6 * u, 5.2 * u, 5 * u);
  const wax = ctx.createLinearGradient(c.x - 2 * u, 0, c.x + 2 * u, 0);
  wax.addColorStop(0, "#b8ab8a"); wax.addColorStop(0.5, "#f4ecd4"); wax.addColorStop(1, "#8e8468");
  ctx.fillStyle = wax;
  ctx.fillRect(c.x - 2 * u, c.y - 22 * u, 4 * u, 16.5 * u);
  ctx.fillStyle = "#1a120a";
  ctx.fillRect(c.x - 0.3 * u, c.y - 24 * u, 0.6 * u, 2.4 * u);
  if (!L.candleOn) {
    // out: the wax gone cold and grey, a last thread of smoke off the wick
    ctx.fillStyle = "rgba(10,12,20,0.5)";
    ctx.fillRect(c.x - 2 * u, c.y - 22 * u, 4 * u, 16.5 * u);
    ctx.strokeStyle = "rgba(150,160,190,0.14)";
    ctx.lineWidth = Math.max(0.6, 0.5 * u);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 24.5 * u);
    ctx.bezierCurveTo(c.x + 2.4 * u, c.y - 30 * u, c.x - 2.6 * u, c.y - 35 * u, c.x + 1 * u, c.y - 42 * u);
    ctx.stroke();
    return;
  }
  const top = ctx.createLinearGradient(0, c.y - 22 * u, 0, c.y - 15 * u);
  top.addColorStop(0, "rgba(255,214,150,0.75)");
  top.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = top;
  ctx.fillRect(c.x - 2 * u, c.y - 22 * u, 4 * u, 7 * u);
  soft(ctx, c.x, c.y - 27 * u, 26 * u, 26 * u, WARM, 0.5, "lighter");
  const fl = ctx.createLinearGradient(0, c.y - 32 * u, 0, c.y - 23 * u);
  fl.addColorStop(0, "#ffd070"); fl.addColorStop(0.5, "#fff2c8"); fl.addColorStop(1, "#ff9a3a");
  ctx.fillStyle = fl;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 32.5 * u);
  ctx.quadraticCurveTo(c.x + 2.6 * u, c.y - 26 * u, c.x, c.y - 23.4 * u);
  ctx.quadraticCurveTo(c.x - 2.6 * u, c.y - 26 * u, c.x, c.y - 32.5 * u);
  ctx.fill();
}

// the lamp table: a small oak table, a shaded lamp on it — alight, or turned
// right down once the case has been solved — and the
// glass case in its light — dark earth, pale roots forking down through it,
// a seedling coming up
function paintTable(ctx, L) {
  const { Q } = L;
  const t = L.table;
  const oak = { side: "#1a0f08", top: "#4e3220", front: "#2c1a0e" };
  footShadow(ctx, L, t, 0.6);
  // the far legs, the near legs, the apron and the top
  for (const [d0, d1] of [[t.d1 - 6, t.d1], [t.d0, t.d0 + 6]]) {
    for (const [x0, x1] of [[t.x0 + 3, t.x0 + 9], [t.x1 - 9, t.x1 - 3]]) block(ctx, L, { x0, x1, d0, d1, y0: 0, y1: t.h - 4 }, oak);
  }
  block(ctx, L, { x0: t.x0 + 3, x1: t.x1 - 3, d0: t.d0 + 1, d1: t.d1 - 1, y0: t.h - 14, y1: t.h - 4 }, oak);
  block(ctx, L, { ...t, x0: t.x0 - 3, x1: t.x1 + 3, d0: t.d0 - 3, d1: t.d1 + 3, y0: t.h - 4, y1: t.h }, oak);
  // the lamp's light lying on the table top
  const lm = L.lamp, pool = Q(lm.x + 14, t.h, lm.d);
  const lit = L.lampOn ? 1 : 0.2; // how much of its light the lamp is giving
  ctx.save();
  polygon(ctx, [Q(t.x0 - 3, t.h, t.d0 - 3), Q(t.x1 + 3, t.h, t.d0 - 3), Q(t.x1 + 3, t.h, t.d1 + 3), Q(t.x0 - 3, t.h, t.d1 + 3)]);
  ctx.clip();
  soft(ctx, pool.x, pool.y, 70 * pool.s, 22 * pool.s, WARM, 0.5 * lit, "lighter");
  ctx.restore();

  // ── the lamp: a turned brass foot and stem, a pleated silk shade
  const b = Q(lm.x, lm.y, lm.d), u = b.s;
  // its light on the wall behind and in the air round it
  soft(ctx, b.x, b.y - 40 * u, 190 * u, 150 * u, WARM, 0.17 * lit, "lighter");
  const br = ctx.createLinearGradient(b.x - 8 * u, 0, b.x + 8 * u, 0);
  br.addColorStop(0, "#2a1e0c"); br.addColorStop(0.4, "#c8a252"); br.addColorStop(1, "#1e1408");
  ctx.fillStyle = "#120c05";
  ctx.beginPath(); ctx.ellipse(b.x, b.y, 8.6 * u, 2.6 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = br;
  ctx.beginPath(); ctx.ellipse(b.x, b.y - 1 * u, 8 * u, 2.4 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(b.x - 5 * u, b.y - 1.6 * u);
  ctx.quadraticCurveTo(b.x - 1.4 * u, b.y - 5 * u, b.x - 1.6 * u, b.y - 10 * u);
  ctx.quadraticCurveTo(b.x - 4 * u, b.y - 15 * u, b.x - 1.2 * u, b.y - 20 * u);
  ctx.lineTo(b.x - 1.2 * u, b.y - 27 * u);
  ctx.lineTo(b.x + 1.2 * u, b.y - 27 * u);
  ctx.lineTo(b.x + 1.2 * u, b.y - 20 * u);
  ctx.quadraticCurveTo(b.x + 4 * u, b.y - 15 * u, b.x + 1.6 * u, b.y - 10 * u);
  ctx.quadraticCurveTo(b.x + 1.4 * u, b.y - 5 * u, b.x + 5 * u, b.y - 1.6 * u);
  ctx.closePath();
  ctx.fill();
  // the shade, lit from inside: brightest low down where the bulb is
  const sy0 = b.y - 44 * u, sy1 = b.y - 24 * u, sw0 = 8.5 * u, sw1 = 15 * u;
  const shade = () => {
    ctx.beginPath();
    ctx.moveTo(b.x - sw0, sy0);
    ctx.lineTo(b.x + sw0, sy0);
    ctx.lineTo(b.x + sw1, sy1);
    ctx.quadraticCurveTo(b.x, sy1 + 3.4 * u, b.x - sw1, sy1);
    ctx.closePath();
  };
  shade();
  const sg = ctx.createRadialGradient(b.x, sy1 - 5 * u, 1, b.x, sy1 - 5 * u, 20 * u);
  sg.addColorStop(0, L.lampOn ? "#fff0c4" : "#8a6a3c");
  sg.addColorStop(0.45, L.lampOn ? "#f0bc74" : "#5a3c1e");
  sg.addColorStop(1, L.lampOn ? "#9a5c2a" : "#2e1c0e");
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.save();
  shade();
  ctx.clip();
  ctx.strokeStyle = "rgba(90,46,16,0.3)";
  ctx.lineWidth = Math.max(0.5, 0.5 * u);
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(b.x + (i / 6) * sw0, sy0); ctx.lineTo(b.x + (i / 6) * sw1, sy1 + 3 * u); ctx.stroke();
  }
  ctx.fillStyle = "rgba(60,30,10,0.55)";
  ctx.fillRect(b.x - sw1, sy0, sw1 * 2, 1.6 * u);
  ctx.restore();
  soft(ctx, b.x, sy1 - 6 * u, 46 * u, 40 * u, WARM, 0.4 * lit, "lighter");

  // ── the glass case
  const a = L.tank;
  const f = (x, y) => Q(x, y, a.d0), k = (x, y) => Q(x, y, a.d1);
  const s = f(0, 0).s;
  const rnd = lcg(19);
  // its far glass and the far brass
  fillPoly(ctx, [k(a.x0, a.y0), k(a.x1, a.y0), k(a.x1, a.y1), k(a.x0, a.y1)], "rgba(20,30,28,0.55)");
  // the earth: its top, seen from above, and its face against the near glass
  fillPoly(ctx, [f(a.x0, a.soil), f(a.x1, a.soil), k(a.x1, a.soil), k(a.x0, a.soil)], "#2a1b10");
  for (let i = 0; i < 90; i++) {
    const p = Q(a.x0 + rnd() * (a.x1 - a.x0), a.soil, a.d0 + rnd() * (a.d1 - a.d0));
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.4)" : "rgba(150,110,70,0.3)";
    ctx.fillRect(p.x, p.y, 1.6 * s, 0.8 * s);
  }
  const p0 = f(a.x0, a.soil), p1 = f(a.x1, a.y0);
  const eg = ctx.createLinearGradient(p0.x, 0, p1.x, 0);
  eg.addColorStop(0, "#4a2f1a");
  eg.addColorStop(1, "#22140b");
  ctx.fillStyle = eg;
  ctx.fillRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rnd() < 0.55 ? "rgba(0,0,0,0.35)" : "rgba(170,125,80,0.22)";
    ctx.fillRect(p0.x + rnd() * (p1.x - p0.x), p0.y + rnd() * (p1.y - p0.y), (0.8 + rnd() * 1.6) * s, (0.5 + rnd()) * s);
  }
  // the roots: one coming down from the seedling, forking, and forking again
  const rx = (a.x0 + a.x1) / 2;
  const root = (x, y, spread, depth, w) => {
    if (depth === 0) return;
    for (const e of [-1, 1]) {
      const nx = x + e * spread, ny = y - 6.4;
      const p = f(x, y), q = f(nx, ny);
      ctx.strokeStyle = "rgba(214,194,154,0.75)";
      ctx.lineWidth = Math.max(0.7, w * s);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + (q.x - p.x) * 0.75, p.y + (q.y - p.y) * 0.35, q.x, q.y);
      ctx.stroke();
      root(nx, ny, spread * 0.5, depth - 1, w * 0.72);
    }
  };
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(226,208,170,0.8)";
  ctx.lineWidth = Math.max(0.8, 1.1 * s);
  ctx.beginPath(); ctx.moveTo(f(rx, a.soil).x, f(rx, a.soil).y); ctx.lineTo(f(rx, a.soil - 3).x, f(rx, a.soil - 3).y); ctx.stroke();
  root(rx, a.soil - 3, 11, 3, 0.9);
  // the seedling: a stem, two pairs of leaves, lit warm on the lamp's side
  const st = Q(rx, a.soil, a.d0 + 1), v = st.s;
  ctx.strokeStyle = "#4e7a3a";
  ctx.lineWidth = Math.max(1, 1.1 * v);
  ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.quadraticCurveTo(st.x + 1.6 * v, st.y - 8 * v, st.x, st.y - 16 * v); ctx.stroke();
  const leaf = (x, y, ang, size, col) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.5, -size * 0.42, size, 0);
    ctx.quadraticCurveTo(size * 0.5, size * 0.42, 0, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,40,16,0.5)";
    ctx.lineWidth = Math.max(0.4, 0.3 * v);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 0.9, 0); ctx.stroke();
    ctx.restore();
  };
  leaf(st.x + 0.6 * v, st.y - 8 * v, -0.5, 7.5 * v, "#3c6a30");
  leaf(st.x + 0.6 * v, st.y - 8 * v, Math.PI + 0.5, 7.5 * v, "#6c9a4a");
  leaf(st.x, st.y - 16 * v, -0.95, 6 * v, "#44783a");
  leaf(st.x, st.y - 16 * v, Math.PI + 0.95, 6 * v, "#82b05a");
  ctx.lineCap = "butt";
  // the near glass: hardly there, a little green, the lamp sliding down it
  const g0 = f(a.x0, a.y1), g1 = f(a.x1, a.y0);
  const gl = ctx.createLinearGradient(g0.x, g0.y, g1.x, g1.y);
  gl.addColorStop(0, "rgba(255,214,160,0.16)");
  gl.addColorStop(0.35, "rgba(190,230,214,0.05)");
  gl.addColorStop(1, "rgba(10,20,18,0.2)");
  ctx.fillStyle = gl;
  ctx.fillRect(g0.x, g0.y, g1.x - g0.x, g1.y - g0.y);
  ctx.save();
  ctx.beginPath(); ctx.rect(g0.x, g0.y, g1.x - g0.x, g1.y - g0.y); ctx.clip();
  ctx.fillStyle = "rgba(255,236,206,0.1)";
  for (const [o, wd] of [[0.1, 0.07], [0.22, 0.025]]) {
    const gw = g1.x - g0.x, gh = g1.y - g0.y;
    fillPoly(ctx, [{ x: g0.x + gw * (o + 0.22), y: g0.y }, { x: g0.x + gw * (o + 0.22 + wd), y: g0.y }, { x: g0.x + gw * (o + wd), y: g0.y + gh }, { x: g0.x + gw * o, y: g0.y + gh }], "rgba(255,236,206,0.1)");
  }
  ctx.restore();
  // the side glass toward the room, and the open top's far and side edges
  fillPoly(ctx, [f(a.x1, a.y0), k(a.x1, a.y0), k(a.x1, a.y1), f(a.x1, a.y1)], "rgba(150,200,190,0.07)");
  // its brass frame: every edge we can see
  const edge = (p, q, w, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, w * s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  };
  const dull = "#5a4418", bright = "#c8a04e";
  edge(k(a.x0, a.y1), k(a.x1, a.y1), 1, dull);
  edge(k(a.x1, a.y1), k(a.x1, a.y0), 1, dull);
  edge(f(a.x0, a.y1), k(a.x0, a.y1), 1, dull);
  edge(f(a.x1, a.y1), k(a.x1, a.y1), 1.2, dull);
  edge(f(a.x1, a.y0), k(a.x1, a.y0), 1.2, dull);
  edge(f(a.x0, a.y0), f(a.x1, a.y0), 1.8, "#7a5c26");
  edge(f(a.x1, a.y0), f(a.x1, a.y1), 1.5, "#7a5c26");
  edge(f(a.x0, a.y1), f(a.x1, a.y1), 1.5, bright);
  edge(f(a.x0, a.y0), f(a.x0, a.y1), 1.6, bright);
}

// The dark of a house asleep, lifted only where there is a light: the lamp,
// the window and what it throws on the floor, the candle.
// Worked out coarse and laid on smooth.
function paintGloom(ctx, L) {
  const { Q } = L;
  const lamp = Q(L.lamp.x, L.lamp.y + 30, L.lamp.d), w = L.win;
  const floor = Q(w.x - 30, 0, 470), candle = L.flame;
  const lights = [
    { x: lamp.x + 30 * lamp.s, y: lamp.y, rx: 250 * lamp.s, ry: 190 * lamp.s, k: L.lampOn ? 1 : 0.42 },
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
    { x: candle.x - 30 * Q(0, 0, L.candle.d).s, y: candle.y + 6, rx: 130 * Q(0, 0, L.candle.d).s, ry: 90 * Q(0, 0, L.candle.d).s, k: L.candleOn ? 0.95 : 0.3 },
  ];
  gloom(ctx, L, lights);
}
