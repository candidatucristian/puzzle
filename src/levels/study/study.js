import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg, polygon } from "../../shared/paint.js";
import { paintNightWindow } from "../hall/hall.js";
import { paintKey } from "../../shared/keyArt.js";

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
const WARM = "255,190,120";
const MOON = "150,178,232";
const EYE = 150; // how high we look from
const F = 300; // how far off the picture is
const BACK = 600; // and the back wall
const NEAR = 250; // where the walls leave the picture, behind us

// ── where everything is ─────────────────────────────────────────────────────

/** `lampOn`: whether the lamp on the table is alight — it is, until the case
 *  under it has given up its puzzle; after that it is turned right down.
 *  `candleOn`: the candle on the desk, which burns until the cipher wheel
 *  over it has been solved, and is then out. */
export function layoutStudy(W, H, { lampOn = true, candleOn = true } = {}) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, lampOn, candleOn };
  L.vp = { x: W * 0.5, y: H * 0.44 };
  L.cm = (H * 0.6) / EYE; // a centimetre at the picture, in pixels
  L.half = Math.max(W * 0.62, H) / L.cm; // half the room's width
  L.top = EYE + (H * 0.72) / L.cm; // the ceiling
  L.Q = (x, y, d) => {
    const z = d / F;
    return { x: L.vp.x + (x * L.cm) / z, y: L.vp.y + ((EYE - y) * L.cm) / z, s: L.cm / z };
  };
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
  {
    const c = L.chest, pts = [];
    for (const x of [c.x0, c.x1]) for (const d of [c.d0, c.d1 + 12]) for (const y of [c.y0, c.y1 + c.lid + 22]) pts.push(Q(x, y, d));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), pad = 6;
    c.box = { x: Math.floor(Math.min(...xs) - pad), y: Math.floor(Math.min(...ys) - pad) };
    c.box.width = Math.ceil(Math.max(...xs) + pad) - c.box.x;
    c.box.height = Math.ceil(Math.max(...ys) + pad) - c.box.y;
    const m = Q((c.x0 + c.x1) / 2, c.y1 + 2, (c.d0 + c.d1) / 2);
    c.mouth = { x: m.x, y: m.y, s: m.s };
    // the chest itself on the screen, and two places on it a glint may show
    const a = Q(c.x0, c.y1 + c.lid, c.d1), b = Q(c.x1, c.y0, c.d0);
    c.hit = { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
    c.glints = [Q(c.x1 - 2, c.y1 + c.lid * 0.9, (c.d0 + c.d1) / 2), Q(c.x0 + (c.x1 - c.x0) * 0.62, c.y1 - 1, c.d0), Q(c.x0 + 3, c.y1 + c.lid * 0.7, c.d0 + 3)];
  }
  // down the left-hand wall, the books
  L.shelf = { d0: 372, d1: 566, y0: 0, y1: 236 };

  // what opens a puzzle: its outline to click in, the box its glints keep to
  const things = [];
  const thing = (level, label, pts) => {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    things.push({ level, label, quad: pts, box });
  };
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
  paintShell(ctx, L);
  paintWindowWall(ctx, L);
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
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.shut, paintChest(L, false));
  addCanvasTexture(t, K.open, paintChest(L, true));
  addCanvasTexture(t, K.key, paintKey());
  return { keys: K };
}

export function releaseStudyArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

const fillPoly = (ctx, pts, style) => {
  polygon(ctx, pts);
  ctx.fillStyle = style;
  ctx.fill();
};

// The chest: a small coffer of gilded wood, bound with darker bronze straps,
// a lock plate on its front, a barrel lid. Painted by the room's own eye on
// a canvas of its own (laid at L.chest.box), shut or open — open, the lid
// stands back on its hinges and shows its red lining, and the box is empty.
// The candle is on its right: it is brightest there.
function paintChest(L, open) {
  const c = L.chest, box = c.box;
  const cv = makeCanvas(box.width, box.height);
  const ctx = cv.getContext("2d");
  ctx.translate(-box.x, -box.y);
  const Q = L.Q;
  const s = Q(0, 0, c.d0).s;
  const r = (c.d1 - c.d0) / 2;
  const gold = (xa, xb, k = 1) => {
    const g = ctx.createLinearGradient(xa, 0, xb, 0);
    const col = (R, G, B) => `rgb(${Math.round(R * k)},${Math.round(G * k)},${Math.round(B * k)})`;
    g.addColorStop(0, col(126, 88, 12));
    g.addColorStop(0.4, col(220, 168, 40));
    g.addColorStop(0.72, col(255, 214, 92));
    g.addColorStop(0.9, col(255, 244, 176));
    g.addColorStop(1, col(240, 190, 70));
    return g;
  };
  const xa = Q(c.x0, 0, c.d0).x, xb = Q(c.x1, 0, c.d0).x;
  // a place on the lid: how far round its barrel (0 the front edge, 1 the
  // hinge), turned back on the hinge when the chest is open
  const swing = open ? 1.9 : 0;
  const lidAt = (x, k) => {
    const dd = -r - r * Math.cos(k * Math.PI), yy = c.lid * Math.sin(k * Math.PI);
    return Q(x, c.y1 + (-dd * Math.sin(swing) + yy * Math.cos(swing)), c.d1 + dd * Math.cos(swing) + yy * Math.sin(swing));
  };
  const lid = () => {
    const N = 10;
    for (let i = 0; i < N; i++) {
      const k0 = i / N, k1 = (i + 1) / N;
      fillPoly(ctx, [lidAt(c.x0, k0), lidAt(c.x1, k0), lidAt(c.x1, k1), lidAt(c.x0, k1)],
        open ? `rgb(${Math.round(96 - 50 * k0)},${Math.round(22 - 10 * k0)},${Math.round(26 - 12 * k0)})` : gold(xa, xb, 0.62 + 0.5 * Math.sin((k0 + 0.18) * Math.PI)));
    }
    // its end, toward the middle of the room
    const end = [];
    for (let i = 0; i <= N; i++) end.push(lidAt(c.x0, i / N));
    fillPoly(ctx, end, open ? "#6a4c10" : "#9a741c");
    // the straps over it, and its rim
    for (const f of [0.2, 0.8]) {
      const x0 = c.x0 + (c.x1 - c.x0) * (f - 0.035), x1 = c.x0 + (c.x1 - c.x0) * (f + 0.035);
      for (let i = 0; i < N; i++) {
        fillPoly(ctx, [lidAt(x0, i / N), lidAt(x1, i / N), lidAt(x1, (i + 1) / N), lidAt(x0, (i + 1) / N)], open ? "rgba(30,8,8,0.5)" : "rgba(156,108,20,0.92)");
      }
    }
    if (!open) {
      // the candle running along the crown of the lid
      const p = lidAt(c.x0 + (c.x1 - c.x0) * 0.3, 0.4), q = lidAt(c.x1 - (c.x1 - c.x0) * 0.04, 0.4);
      ctx.strokeStyle = "rgba(255,252,224,0.75)";
      ctx.lineWidth = Math.max(0.8, 0.5 * s);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    if (!open) {
      // a row of beading just above the lid's front edge
      ctx.fillStyle = "rgba(255,248,206,0.8)";
      for (let i = 1; i < 14; i++) {
        const p = lidAt(c.x0 + ((c.x1 - c.x0) * i) / 14, 0.1);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, 0.26 * s), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = open ? "#e6c060" : "rgba(110,74,10,0.9)";
    ctx.lineWidth = Math.max(1, 0.7 * s);
    ctx.beginPath();
    const a = lidAt(c.x0, 0), b = lidAt(c.x1, 0);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  // what it throws on the leather
  const foot = Q((c.x0 + c.x1) / 2, c.y0, (c.d0 + c.d1) / 2);
  soft(ctx, foot.x - 4 * s, foot.y + 1 * s, (c.x1 - c.x0) * 0.62 * s, r * 0.9 * s, "0,0,0", 0.6);
  // four little ball feet
  for (const [x, d] of [[c.x0 + 1.2, c.d1 - 1], [c.x1 - 1.2, c.d1 - 1], [c.x0 + 1.2, c.d0 + 0.6], [c.x1 - 1.2, c.d0 + 0.6]]) {
    const p = Q(x, c.y0 - 0.5, d);
    ctx.fillStyle = "#7a5610";
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, 0.9 * s), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,240,180,0.7)";
    ctx.beginPath(); ctx.arc(p.x + 0.25 * s, p.y - 0.25 * s, Math.max(0.4, 0.3 * s), 0, Math.PI * 2); ctx.fill();
  }
  if (open) lid();
  // the box: its end, then its front
  fillPoly(ctx, [Q(c.x0, c.y0, c.d0), Q(c.x0, c.y0, c.d1), Q(c.x0, c.y1, c.d1), Q(c.x0, c.y1, c.d0)], "#8c6616");
  const f0 = Q(c.x0, c.y1, c.d0), f1 = Q(c.x1, c.y0, c.d0);
  ctx.fillStyle = gold(xa, xb);
  ctx.fillRect(f0.x, f0.y, f1.x - f0.x, f1.y - f0.y);
  // chased work on the front: a faint diaper of lozenges
  ctx.save();
  ctx.beginPath(); ctx.rect(f0.x, f0.y, f1.x - f0.x, f1.y - f0.y); ctx.clip();
  ctx.strokeStyle = "rgba(120,80,8,0.26)";
  ctx.lineWidth = Math.max(0.5, 0.25 * s);
  for (let i = -6; i < 14; i++) {
    for (const dir of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(f0.x + i * 3.2 * s, dir > 0 ? f0.y : f1.y);
      ctx.lineTo(f0.x + (i + 4) * 3.2 * s, dir > 0 ? f1.y : f0.y);
      ctx.stroke();
    }
  }
  // the straps, each with its rivets; the box's foot in shadow
  for (const f of [0.2, 0.8]) {
    const x = f0.x + (f1.x - f0.x) * f, w = (f1.x - f0.x) * 0.07;
    ctx.fillStyle = "#a87a1a";
    ctx.fillRect(x - w / 2, f0.y, w, f1.y - f0.y);
    ctx.fillStyle = "rgba(90,58,6,0.7)";
    ctx.fillRect(x - w / 2, f0.y, Math.max(0.6, 0.3 * s), f1.y - f0.y);
    ctx.fillStyle = "rgba(255,244,190,0.6)";
    ctx.fillRect(x + w / 2 - Math.max(0.6, 0.3 * s), f0.y, Math.max(0.6, 0.3 * s), f1.y - f0.y);
    ctx.fillStyle = "rgba(255,250,214,0.95)";
    for (const y of [0.22, 0.78]) { ctx.beginPath(); ctx.arc(x, f0.y + (f1.y - f0.y) * y, Math.max(0.7, 0.42 * s), 0, Math.PI * 2); ctx.fill(); }
  }
  // a raised border round the front, a leaf in each corner
  const bw = f1.x - f0.x, bh = f1.y - f0.y, inset = 0.9 * s;
  ctx.strokeStyle = "rgba(96,62,6,0.75)";
  ctx.lineWidth = Math.max(0.6, 0.3 * s);
  ctx.strokeRect(f0.x + inset, f0.y + inset, bw - inset * 2, bh - inset * 2);
  ctx.strokeStyle = "rgba(255,248,206,0.6)";
  ctx.strokeRect(f0.x + inset + 0.4 * s, f0.y + inset + 0.4 * s, bw - inset * 2, bh - inset * 2);
  ctx.fillStyle = "rgba(255,246,196,0.85)";
  for (const [cx, cy] of [[f0.x + inset, f0.y + inset], [f1.x - inset, f0.y + inset], [f0.x + inset, f1.y - inset], [f1.x - inset, f1.y - inset]]) {
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.7, 0.5 * s), 0, Math.PI * 2); ctx.fill();
  }
  // a bright line under the lid's edge, as polished metal has
  const shine = ctx.createLinearGradient(f0.x, 0, f1.x, 0);
  shine.addColorStop(0, "rgba(255,252,224,0)");
  shine.addColorStop(0.55, "rgba(255,252,224,0.55)");
  shine.addColorStop(1, "rgba(255,252,224,0.2)");
  ctx.fillStyle = shine;
  ctx.fillRect(f0.x, f0.y + (f1.y - f0.y) * 0.12, f1.x - f0.x, Math.max(0.8, 0.5 * s));
  const sh = ctx.createLinearGradient(0, f1.y - 3 * s, 0, f1.y);
  sh.addColorStop(0, "rgba(60,34,0,0)");
  sh.addColorStop(1, "rgba(60,34,0,0.5)");
  ctx.fillStyle = sh;
  ctx.fillRect(f0.x, f1.y - 3 * s, f1.x - f0.x, 3 * s);
  ctx.restore();
  // the lock plate and its keyhole
  const lx = (f0.x + f1.x) / 2, ly = f0.y + (f1.y - f0.y) * 0.34;
  ctx.fillStyle = "#8a6212";
  ctx.beginPath(); ctx.roundRect(lx - 2.2 * s, ly - 2.4 * s, 4.4 * s, 5.4 * s, 0.8 * s); ctx.fill();
  ctx.fillStyle = "#fff0b0";
  ctx.beginPath(); ctx.roundRect(lx - 1.8 * s, ly - 2 * s, 3.6 * s, 4.6 * s, 0.6 * s); ctx.fill();
  ctx.fillStyle = "#1a0e02";
  ctx.beginPath(); ctx.arc(lx, ly - 0.2 * s, 0.62 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(lx - 0.3 * s, ly, 0.6 * s, 1.6 * s);
  // a garnet set either side of the lock, a spark in each
  for (const e of [-1, 1]) {
    const gx = lx + e * (f1.x - f0.x) * 0.17, gy = f0.y + (f1.y - f0.y) * 0.5, gr = Math.max(1, 0.85 * s);
    ctx.fillStyle = "#6a4a0c";
    ctx.beginPath(); ctx.arc(gx, gy, gr * 1.35, 0, Math.PI * 2); ctx.fill();
    const gem = ctx.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, gr * 0.1, gx, gy, gr);
    gem.addColorStop(0, "#ff9a8a");
    gem.addColorStop(0.5, "#b0182a");
    gem.addColorStop(1, "#3a0610");
    ctx.fillStyle = gem;
    ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
  }
  if (open) {
    // the mouth of it: the red lining going down into the dark, nothing in it
    const m = [Q(c.x0, c.y1, c.d0), Q(c.x1, c.y1, c.d0), Q(c.x1, c.y1, c.d1), Q(c.x0, c.y1, c.d1)];
    polygon(ctx, m);
    const g = ctx.createLinearGradient(0, m[2].y, 0, m[0].y);
    g.addColorStop(0, "#5a1418");
    g.addColorStop(1, "#150406");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#e6c26a";
    ctx.lineWidth = Math.max(1, 0.6 * s);
    ctx.stroke();
  } else {
    lid();
    // the hasp coming down over the lock
    ctx.fillStyle = "#c89426";
    ctx.fillRect(lx - 0.9 * s, f0.y - 1.4 * s, 1.8 * s, 2.4 * s);
  }
  // the candle on its right-hand corner
  const edge = Q(c.x1, c.y1, c.d0);
  soft(ctx, edge.x - 1 * s, edge.y + 2 * s, 5 * s, 7 * s, "255,240,190", 0.5, "lighter");
  return cv;
}

// A block standing square to the room: the faces of it we can see — the side
// toward the middle of the room, the top if it is below the eye, the front.
function block(ctx, L, b, tone) {
  const { Q } = L;
  const { x0, x1, y0, y1, d0, d1 } = b;
  if (x1 < 0) fillPoly(ctx, [Q(x1, y0, d0), Q(x1, y0, d1), Q(x1, y1, d1), Q(x1, y1, d0)], tone.side);
  if (x0 > 0) fillPoly(ctx, [Q(x0, y0, d0), Q(x0, y0, d1), Q(x0, y1, d1), Q(x0, y1, d0)], tone.side);
  if (y1 < EYE) fillPoly(ctx, [Q(x0, y1, d0), Q(x1, y1, d0), Q(x1, y1, d1), Q(x0, y1, d1)], tone.top);
  fillPoly(ctx, [Q(x0, y0, d0), Q(x1, y0, d0), Q(x1, y1, d0), Q(x0, y1, d0)], tone.front);
}

// Something flat on a side wall — made as a flat picture first, then laid on
// the wall a sliver at a time so that it runs away into the room with it.
// Facing the left wall the near end is at our left; facing the right, at our
// right: either way the picture reads left to right across the screen.
function onWall(ctx, L, side, at, flat) {
  const X = side * L.half;
  const n = flat.width;
  for (let i = 0; i < n; i++) {
    const dAt = (k) => (side < 0 ? at.d0 + (at.d1 - at.d0) * k : at.d1 - (at.d1 - at.d0) * k);
    const p = L.Q(X, at.y1, dAt(i / n)), q = L.Q(X, at.y0, dAt((i + 1) / n));
    ctx.drawImage(flat, i, 0, 1, flat.height, Math.min(p.x, q.x), p.y, Math.abs(q.x - p.x) + 0.6, q.y - p.y);
  }
}

// the room itself: ceiling, boards, the papered walls over their oak dado
function paintShell(ctx, L) {
  const { Q, half: hx, top, u } = L;
  const rnd = lcg(311);
  fillPoly(ctx, [Q(-hx, top, NEAR), Q(hx, top, NEAR), Q(hx, top, BACK), Q(-hx, top, BACK)], "#0b0a0c");
  // the floor: dark oak boards running to the back wall
  polygon(ctx, [Q(-hx, 0, NEAR), Q(hx, 0, NEAR), Q(hx, 0, BACK), Q(-hx, 0, BACK)]);
  const fg = ctx.createLinearGradient(0, Q(0, 0, BACK).y, 0, L.H);
  fg.addColorStop(0, "#150e09");
  fg.addColorStop(1, "#2c1d13");
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const x = -hx + (2 * hx * i) / n, x2 = x + (2 * hx) / n;
    const tone = rnd();
    if (i < n) {
      fillPoly(ctx, [Q(x, 0, NEAR), Q(x2, 0, NEAR), Q(x2, 0, BACK), Q(x, 0, BACK)],
        tone < 0.5 ? `rgba(0,0,0,${(tone * 0.3).toFixed(3)})` : `rgba(255,200,150,${((tone - 0.5) * 0.06).toFixed(3)})`);
    }
    const a = Q(x, 0, NEAR), b = Q(x, 0, BACK);
    ctx.strokeStyle = "rgba(4,2,1,0.75)";
    ctx.lineWidth = Math.max(1, 1.4 * u);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
  // the side walls
  for (const side of [-1, 1]) {
    const X = side * hx;
    const band = (y0, y1, near, far) => {
      polygon(ctx, [Q(X, y0, NEAR), Q(X, y0, BACK), Q(X, y1, BACK), Q(X, y1, NEAR)]);
      const g = ctx.createLinearGradient(Q(X, 0, BACK).x, 0, Q(X, 0, NEAR + 60).x, 0);
      g.addColorStop(0, far);
      g.addColorStop(1, near);
      ctx.fillStyle = g;
      ctx.fill();
    };
    band(0, top, "#1b2622", "#0e1513");
    ctx.save();
    polygon(ctx, [Q(X, top, NEAR), Q(X, top, BACK), Q(X, 96, BACK), Q(X, 96, NEAR)]);
    ctx.clip();
    for (let d = NEAR; d < BACK; d += 11) {
      const a = Q(X, top, d), b = Q(X, 96, d);
      ctx.strokeStyle = "rgba(170,200,180,0.035)";
      ctx.lineWidth = Math.max(0.6, 2.2 * a.s);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
    band(0, 96, "#2a1a10", "#150c07");
    band(93, 99, "#3e2616", "#1c1009");
    band(246, 250, "#3e2616", "#1c1009");
    band(0, 10, "#140b06", "#090504");
    ctx.strokeStyle = "rgba(4,2,1,0.7)";
    for (let d = NEAR + 8; d < BACK - 30; d += 62) {
      polygon(ctx, [Q(X, 86, d + 6), Q(X, 86, d + 56), Q(X, 18, d + 56), Q(X, 18, d + 6)]);
      ctx.lineWidth = Math.max(0.8, 0.7 * Q(X, 0, d).s);
      ctx.stroke();
    }
  }
}

// the back wall, and the window in it
function paintWindowWall(ctx, L) {
  const { Q, half: hx, top, W, H } = L;
  const a = Q(-hx, top, BACK), b = Q(hx, 0, BACK), s = a.s;
  const yAt = (y) => Q(0, y, BACK).y;
  ctx.fillStyle = "#101816";
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  // the paper's stripe
  ctx.strokeStyle = "rgba(170,200,180,0.035)";
  ctx.lineWidth = Math.max(0.6, 2.2 * s);
  for (let x = -hx; x < hx; x += 11) {
    const p = Q(x, 0, BACK);
    ctx.beginPath(); ctx.moveTo(p.x, a.y); ctx.lineTo(p.x, yAt(96)); ctx.stroke();
  }
  ctx.fillStyle = "#32200f";
  ctx.fillRect(a.x, yAt(250), b.x - a.x, 4 * s);
  const w = L.win;
  // the moon's light on the wall round the window
  soft(ctx, w.cx, (w.top + w.sill) / 2, w.rx * 3, (w.sill - w.top) * 1.1, MOON, 0.24, "lighter");
  paintNightWindow(ctx, W, H, w, L.vp);
  // the dado runs on under the sill: rail, panels, skirting
  ctx.fillStyle = "#1a100a";
  ctx.fillRect(a.x, yAt(96), b.x - a.x, b.y - yAt(96));
  ctx.fillStyle = "#32200f";
  ctx.fillRect(a.x, yAt(99), b.x - a.x, 6 * s);
  ctx.fillStyle = "#0b0604";
  ctx.fillRect(a.x, yAt(10), b.x - a.x, 10 * s);
  ctx.strokeStyle = "rgba(4,2,1,0.7)";
  ctx.lineWidth = Math.max(0.8, 0.7 * s);
  for (let x = -hx + 8; x < hx - 30; x += 62) {
    const p = Q(x + 6, 86, BACK), q = Q(x + 56, 18, BACK);
    ctx.strokeRect(p.x, p.y, q.x - p.x, q.y - p.y);
  }
  // the corners, where the walls meet
  for (const side of [-1, 1]) {
    const g = ctx.createLinearGradient(Q(side * hx, 0, BACK).x, 0, Q(side * (hx - 70), 0, BACK).x, 0);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(Q(side * hx, 0, BACK).x, Q(side * (hx - 70), 0, BACK).x), a.y, 70 * s, b.y - a.y);
  }
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

// the moon through the window: its beam in the room's dusty air, and the
// window laid long and pale across the rug
function paintMoonlight(ctx, L) {
  const { Q, u } = L;
  const w = L.win;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${Math.round(5 * u)}px)`;
  // the panes on the floor, leaning a little toward the left as they come
  const lean = (d) => (BACK - d) * -0.22;
  for (const [x0, x1] of [[-1, -0.06], [0.06, 1]]) {
    for (const [d0, d1, a] of [[572, 500, 0.4], [494, 424, 0.27], [418, 366, 0.13]]) {
      const sp = (d) => 1 + (BACK - d) * 0.0012;
      fillPoly(ctx, [
        Q(w.x + lean(d0) + x0 * w.hw * sp(d0), 0, d0), Q(w.x + lean(d0) + x1 * w.hw * sp(d0), 0, d0),
        Q(w.x + lean(d1) + x1 * w.hw * sp(d1), 0, d1), Q(w.x + lean(d1) + x0 * w.hw * sp(d1), 0, d1),
      ], `rgba(${MOON},${a})`);
    }
  }
  // the beam itself, from the glass down to that patch
  ctx.filter = `blur(${Math.round(16 * u)}px)`;
  const n0 = Q(w.x + lean(400) - w.hw * 1.2, 0, 400), n1 = Q(w.x + lean(400) + w.hw * 1.2, 0, 400);
  const g = ctx.createLinearGradient(0, w.top, 0, n0.y);
  g.addColorStop(0, `rgba(${MOON},0.3)`);
  g.addColorStop(1, `rgba(${MOON},0)`);
  fillPoly(ctx, [{ x: w.cx - w.rx, y: w.top + w.rx }, { x: w.cx + w.rx, y: w.top + w.rx }, n1, n0], g);
  for (const dx of [-0.6, 0, 0.6]) {
    const g2 = ctx.createLinearGradient(0, w.sill, 0, n0.y);
    g2.addColorStop(0, `rgba(${MOON},0.2)`);
    g2.addColorStop(1, `rgba(${MOON},0)`);
    const mx = (n0.x + n1.x) / 2, mw = (n1.x - n0.x) / 2;
    fillPoly(ctx, [
      { x: w.cx + (dx - 0.22) * w.rx, y: w.sill - (w.sill - w.top) * 0.4 }, { x: w.cx + (dx + 0.22) * w.rx, y: w.sill - (w.sill - w.top) * 0.4 },
      { x: mx + (dx + 0.3) * mw, y: n0.y }, { x: mx + (dx - 0.3) * mw, y: n0.y },
    ], g2);
  }
  ctx.filter = "none";
  ctx.restore();
}

// what stands on the floor throws a soft dark under itself
function footShadow(ctx, L, b, a = 0.7) {
  const p = L.Q((b.x0 + b.x1) / 2, 0, (b.d0 + b.d1) / 2);
  soft(ctx, p.x, p.y, ((b.x1 - b.x0) / 2 + 14) * p.s, ((b.d1 - b.d0) / 2 + 10) * p.s * 0.5, "0,0,0", a);
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
  const { W, H, Q } = L;
  const lamp = Q(L.lamp.x, L.lamp.y + 30, L.lamp.d), w = L.win;
  const floor = Q(w.x - 30, 0, 470), candle = L.flame;
  const lights = [
    { x: lamp.x + 30 * lamp.s, y: lamp.y, rx: 250 * lamp.s, ry: 190 * lamp.s, k: L.lampOn ? 1 : 0.42 },
    { x: w.cx, y: (w.top + w.sill) / 2, rx: w.rx * 3, ry: (w.sill - w.top) * 0.95, k: 0.95 },
    { x: floor.x, y: floor.y, rx: 230 * floor.s, ry: 80 * floor.s, k: 0.7 },
    { x: candle.x - 30 * Q(0, 0, L.candle.d).s, y: candle.y + 6, rx: 130 * Q(0, 0, L.candle.d).s, ry: 90 * Q(0, 0, L.candle.d).s, k: L.candleOn ? 0.95 : 0.3 },
  ];
  const step = 8, gw = Math.ceil(W / step), gh = Math.ceil(H / step);
  const small = makeCanvas(gw, gh);
  const g = small.getContext("2d");
  const img = g.createImageData(gw, gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let dark = 1;
      for (const l of lights) {
        const d = Math.hypot(((x + 0.5) * step - l.x) / l.rx, ((y + 0.5) * step - l.y) / l.ry);
        const t = Math.max(0, 1 - d);
        dark *= 1 - l.k * t * t * (3 - 2 * t);
      }
      const i = (y * gw + x) * 4;
      img.data[i] = 3; img.data[i + 1] = 4; img.data[i + 2] = 6;
      img.data[i + 3] = Math.round(255 * 0.8 * dark);
    }
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, gw * step, gh * step);
  ctx.restore();
}
