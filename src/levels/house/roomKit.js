import { soft, makeCanvas, lcg, polygon } from "../../shared/paint.js";
import { paintNightWindow } from "../hall/hall.js";

/** What the rooms off the hall are all made of: the way a room is measured
 *  and seen, its shell — boards, papered walls over an oak dado, a ceiling —
 *  the back wall with its night window and the moon coming in through it,
 *  blocks of furniture square to the room, things laid flat on a side wall,
 *  the dark that is lifted only where there is a light, and the little gilt
 *  chest every room keeps its key in.
 *
 *  A room is measured in centimetres: x across from the middle, y up from
 *  the floor, d away from the eye — which is a standing person's, 150 up,
 *  with the picture three metres in front of it. */

export const WARM = "255,190,120";
export const MOON = "150,178,232";
export const EYE = 150; // how high we look from
export const F = 300; // how far off the picture is
export const BACK = 600; // and the back wall
export const NEAR = 250; // where the walls leave the picture, behind us

/** A room's measure for a screen: where the eye is, how big a centimetre
 *  is, how wide and high the room, and Q, which says where on the screen a
 *  place in the room is (and how many pixels a centimetre is there). */
export function roomLayout(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  L.vp = { x: W * 0.5, y: H * 0.44 };
  L.cm = (H * 0.6) / EYE; // a centimetre at the picture, in pixels
  L.half = Math.max(W * 0.62, H) / L.cm; // half the room's width
  L.top = EYE + (H * 0.72) / L.cm; // the ceiling
  L.Q = (x, y, d) => {
    const z = d / F;
    return { x: L.vp.x + (x * L.cm) / z, y: L.vp.y + ((EYE - y) * L.cm) / z, s: L.cm / z };
  };
  return L;
}

/** Something that opens a puzzle: its outline to click in, and the box its
 *  glints keep to. */
export function thingAt(level, label, pts) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  return { level, label, quad: pts, box };
}

/** Works out, for the chest the layout has put at L.chest (x0, x1, d0, d1,
 *  y0, y1, lid — in centimetres), everything the screen needs of it: the
 *  canvas it is painted on, its mouth, where it is pointed at, where its
 *  glints show. */
export function chestAt(L) {
  const { Q } = L;
  const c = L.chest, pts = [];
  for (const x of [c.x0, c.x1]) for (const d of [c.d0, c.d1 + 12]) for (const y of [c.y0, c.y1 + c.lid + 22]) pts.push(Q(x, y, d));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), pad = 6;
  c.box = { x: Math.floor(Math.min(...xs) - pad), y: Math.floor(Math.min(...ys) - pad) };
  c.box.width = Math.ceil(Math.max(...xs) + pad) - c.box.x;
  c.box.height = Math.ceil(Math.max(...ys) + pad) - c.box.y;
  const m = Q((c.x0 + c.x1) / 2, c.y1 + 2, (c.d0 + c.d1) / 2);
  c.mouth = { x: m.x, y: m.y, s: m.s };
  const a = Q(c.x0, c.y1 + c.lid, c.d1), b = Q(c.x1, c.y0, c.d0);
  c.hit = { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
  c.glints = [Q(c.x1 - 2, c.y1 + c.lid * 0.9, (c.d0 + c.d1) / 2), Q(c.x0 + (c.x1 - c.x0) * 0.62, c.y1 - 1, c.d0), Q(c.x0 + 3, c.y1 + c.lid * 0.7, c.d0 + 3)];
  return c;
}

export const fillPoly = (ctx, pts, style) => {
  polygon(ctx, pts);
  ctx.fillStyle = style;
  ctx.fill();
};

/** The dark of a house asleep, lifted only where there is a light. Each
 *  light is { x, y, rx, ry, k }: where on the screen, how far it reaches, how
 *  much of the dark it takes away. Worked out coarse and laid on smooth. */
export function gloom(ctx, L, lights) {
  const { W, H } = L;
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

// The chest: a small coffer of gilded wood, bound with darker bronze straps,
// a lock plate on its front, a barrel lid. Painted by the room's own eye on
// a canvas of its own (laid at L.chest.box), shut or open — open, the lid
// stands back on its hinges and shows its red lining, and the box is empty.
// The candle is on its right: it is brightest there.
export function paintChest(L, open) {
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
export function block(ctx, L, b, tone) {
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
export function onWall(ctx, L, side, at, flat) {
  const X = side * L.half;
  const n = flat.width;
  for (let i = 0; i < n; i++) {
    const dAt = (k) => (side < 0 ? at.d0 + (at.d1 - at.d0) * k : at.d1 - (at.d1 - at.d0) * k);
    const p = L.Q(X, at.y1, dAt(i / n)), q = L.Q(X, at.y0, dAt((i + 1) / n));
    ctx.drawImage(flat, i, 0, 1, flat.height, Math.min(p.x, q.x), p.y, Math.abs(q.x - p.x) + 0.6, q.y - p.y);
  }
}

// the room itself: ceiling, boards, the papered walls over their oak dado
export function paintShell(ctx, L) {
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
export function paintWindowWall(ctx, L) {
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

// the moon through the window: its beam in the room's dusty air, and the
// window laid long and pale across the rug
export function paintMoonlight(ctx, L) {
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
export function footShadow(ctx, L, b, a = 0.7) {
  const p = L.Q((b.x0 + b.x1) / 2, 0, (b.d0 + b.d1) / 2);
  soft(ctx, p.x, p.y, ((b.x1 - b.x0) / 2 + 14) * p.s, ((b.d1 - b.d0) / 2 + 10) * p.s * 0.5, "0,0,0", a);
}
