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
  const L = { W, H, u, style: STYLE };
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

/** How a room is built: what its walls are and their colours (toward us, far
 *  off, and on the back wall), the dado under them if it has one, the
 *  picture rail, the skirting, the floor, the ceiling, the window. A room
 *  takes this and changes what is its own (see roomStyle). */
export const STYLE = {
  wall: "paper", // "paper" striped, "panel" wood to the ceiling, "planks" limewashed boards, "plaster" bare
  near: "#1b2622", far: "#0e1513", back: "#101816", mark: "rgba(170,200,180,0.035)",
  dado: { h: 96, kind: "panels", near: "#2a1a10", far: "#150c07", back: "#1a100a", rail: "#3e2616", railFar: "#1c1009", railBack: "#32200f" },
  rail: 248, // the picture rail's height, or 0 for none
  skirt: "#140b06", skirtBack: "#0b0604",
  floor: "boards", // "boards", "herringbone" parquet, "deck" wide planks, "flags" of stone
  floorNear: "#2c1d13", floorFar: "#150e09",
  ceiling: "plain", ceilingCol: "#0b0a0c", // "plain", "coffers", "beams"
  window: "arch", // "arch" the tall one, "sash" with curtains, "round" a port, "leaded" small and high
};

/** A room's own build: the house's, with what it changes. */
export function roomStyle(own = {}) {
  return { ...STYLE, ...own, dado: own.dado === null ? null : own.dado ? { ...STYLE.dado, ...own.dado } : STYLE.dado };
}

// One wall, dressed as the room's style says. `M(a, y)` is where on the screen
// a place on the wall is — a along it in centimetres, y up it — `a0`..`a1`
// its length, `tone(near, far)` the paint for a colour that is `near` at our
// end and `far` at the other. Done in two goes, so that a window can go in
// between: the wall itself, then what stands in front of its foot.
function wallUpper(ctx, L, M, a0, a1, tone, rnd) {
  const st = L.style, top = L.top;
  const band = (y0, y1, fill) => fillPoly(ctx, [M(a0, y0), M(a1, y0), M(a1, y1), M(a0, y1)], fill);
  const line = (a, y0, y1, col, w) => {
    const p = M(a, y0), q = M(a, y1);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(0.6, w * p.s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  };
  band(0, top, tone(st.near, st.far));
  const foot = st.dado ? st.dado.h : 0;
  if (st.wall === "paper") {
    for (let a = a0; a < a1; a += 11) line(a, foot, top, st.mark, 2.2);
  } else if (st.wall === "planks") {
    // boards up and down, no two quite the same, the limewash thin on them
    for (let a = a0; a < a1; a += 15) {
      fillPoly(ctx, [M(a, foot), M(Math.min(a1, a + 15), foot), M(Math.min(a1, a + 15), top), M(a, top)], rnd() < 0.5 ? `rgba(0,0,0,${(rnd() * 0.16).toFixed(3)})` : `rgba(210,224,236,${(rnd() * 0.05).toFixed(3)})`);
      line(a, foot, top, "rgba(2,4,6,0.6)", 0.5);
    }
  } else if (st.wall === "panel") {
    // wood to the ceiling: tall panels between stiles, a frieze of small ones over them
    for (let a = a0 + 4; a < a1 - 20; a += 66) {
      for (const [y0, y1] of [[foot + 12, top - 62], [top - 52, top - 14]]) {
        const pts = [M(a + 6, y0), M(a + 60, y0), M(a + 60, y1), M(a + 6, y1)];
        fillPoly(ctx, pts, "rgba(0,0,0,0.16)");
        ctx.strokeStyle = "rgba(3,2,1,0.8)";
        ctx.lineWidth = Math.max(0.8, 0.8 * pts[0].s);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,206,160,0.1)";
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.stroke();
      }
    }
    for (let i = 0; i < (a1 - a0) * 0.5; i++) line(a0 + rnd() * (a1 - a0), foot, top, rnd() < 0.6 ? "rgba(0,0,0,0.07)" : "rgba(255,210,170,0.02)", 0.6 + rnd() * 1.4);
  } else {
    // bare plaster: patched, stained, cracked here and there
    for (let i = 0; i < (a1 - a0) * 0.2; i++) {
      const p = M(a0 + rnd() * (a1 - a0), rnd() * top);
      soft(ctx, p.x, p.y, (10 + rnd() * 40) * p.s, (8 + rnd() * 30) * p.s, rnd() < 0.6 ? "0,0,0" : "150,146,128", 0.1 + rnd() * 0.1);
    }
    for (let i = 0; i < 3; i++) {
      let a = a0 + rnd() * (a1 - a0), y = top - rnd() * 60;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = Math.max(0.6, 0.3 * M(a, y).s);
      ctx.beginPath();
      ctx.moveTo(M(a, y).x, M(a, y).y);
      for (let k = 0; k < 8; k++) { a += (rnd() - 0.5) * 14; y -= 6 + rnd() * 14; ctx.lineTo(M(a, y).x, M(a, y).y); }
      ctx.stroke();
    }
  }
  if (st.rail) band(st.rail - 2, st.rail + 2, tone(st.dado?.rail ?? "#3e2616", st.dado?.railFar ?? "#1c1009"));
}
function wallLower(ctx, L, M, a0, a1, tone, isBack) {
  const st = L.style, d = st.dado;
  const band = (y0, y1, fill) => fillPoly(ctx, [M(a0, y0), M(a1, y0), M(a1, y1), M(a0, y1)], fill);
  if (d) {
    band(0, d.h, isBack ? d.back : tone(d.near, d.far));
    if (d.kind === "panels") {
      ctx.strokeStyle = "rgba(4,2,1,0.7)";
      for (let a = a0 + 8; a < a1 - 30; a += 62) {
        polygon(ctx, [M(a + 6, d.h - 10), M(a + 56, d.h - 10), M(a + 56, 18), M(a + 6, 18)]);
        ctx.lineWidth = Math.max(0.8, 0.7 * M(a, 0).s);
        ctx.stroke();
      }
    } else {
      // match-boarding: narrow boards up and down
      for (let a = a0; a < a1; a += 12) {
        const p = M(a, 10), q = M(a, d.h - 3);
        ctx.strokeStyle = "rgba(2,3,5,0.6)";
        ctx.lineWidth = Math.max(0.6, 0.4 * p.s);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    band(d.h - 3, d.h + 3, isBack ? d.railBack : tone(d.rail, d.railFar));
  }
  band(0, 10, isBack ? st.skirtBack : tone(st.skirt, st.skirtBack));
}

/** The room itself: its ceiling, its floor, its two side walls. */
export function paintShell(ctx, L) {
  const { Q, half: hx, top, u } = L;
  const st = L.style;
  const rnd = lcg(311);
  // ── the ceiling
  fillPoly(ctx, [Q(-hx, top, NEAR), Q(hx, top, NEAR), Q(hx, top, BACK), Q(-hx, top, BACK)], st.ceilingCol);
  if (st.ceiling === "beams") {
    // heavy timbers across it, the furthest first: the underside, then the face toward us
    for (let d = BACK - 40; d > NEAR; d -= 78) {
      fillPoly(ctx, [Q(-hx, top - 16, d), Q(hx, top - 16, d), Q(hx, top - 16, d + 20), Q(-hx, top - 16, d + 20)], "#120c08");
      fillPoly(ctx, [Q(-hx, top, d), Q(hx, top, d), Q(hx, top - 16, d), Q(-hx, top - 16, d)], "#22160e");
      const p = Q(-hx, top - 16, d), q = Q(hx, top - 16, d);
      ctx.strokeStyle = "rgba(255,206,160,0.08)";
      ctx.lineWidth = Math.max(0.8, 0.6 * p.s);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
  } else if (st.ceiling === "coffers") {
    // a grid of moulded ribs, a sunk square between each four
    const rib = (pts) => { fillPoly(ctx, pts, "#1c120b"); ctx.strokeStyle = "rgba(255,206,160,0.07)"; ctx.lineWidth = 1; ctx.stroke(); };
    for (let d = NEAR; d < BACK; d += 70) rib([Q(-hx, top, d), Q(hx, top, d), Q(hx, top, d + 9), Q(-hx, top, d + 9)]);
    for (let x = -hx; x <= hx; x += (2 * hx) / 8) rib([Q(x - 4.5, top, NEAR), Q(x + 4.5, top, NEAR), Q(x + 4.5, top, BACK), Q(x - 4.5, top, BACK)]);
  }
  // ── the floor
  polygon(ctx, [Q(-hx, 0, NEAR), Q(hx, 0, NEAR), Q(hx, 0, BACK), Q(-hx, 0, BACK)]);
  const fg = ctx.createLinearGradient(0, Q(0, 0, BACK).y, 0, L.H);
  fg.addColorStop(0, st.floorFar);
  fg.addColorStop(1, st.floorNear);
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const tint = () => { const k = rnd(); return k < 0.5 ? `rgba(0,0,0,${(k * 0.3).toFixed(3)})` : `rgba(255,214,170,${((k - 0.5) * 0.07).toFixed(3)})`; };
  if (st.floor === "herringbone") {
    // parquet laid in zigzag: short blocks, each column leaning the other way
    const cw = 30, bh = 10;
    for (let c = 0, x = -hx; x < hx; x += cw, c++) {
      for (let d = NEAR - cw; d < BACK; d += bh) {
        const up = c % 2 === 0;
        fillPoly(ctx, [Q(x, 0, up ? d : d + cw), Q(x + cw, 0, up ? d + cw : d), Q(x + cw, 0, (up ? d + cw : d) + bh), Q(x, 0, (up ? d : d + cw) + bh)], tint());
        ctx.strokeStyle = "rgba(4,2,1,0.6)";
        ctx.lineWidth = Math.max(0.6, 0.8 * u);
        ctx.stroke();
      }
    }
  } else if (st.floor === "flags") {
    // stone flags in courses, each course shifted, worn hollow in the middle
    for (let r = 0, d = NEAR; d < BACK; d += 58, r++) {
      for (let x = -hx - (r % 2 ? 36 : 0); x < hx; x += 72) {
        fillPoly(ctx, [Q(x + 1, 0, d + 1), Q(x + 71, 0, d + 1), Q(x + 71, 0, d + 57), Q(x + 1, 0, d + 57)], rnd() < 0.5 ? `rgba(0,0,0,${(rnd() * 0.3).toFixed(3)})` : `rgba(170,176,186,${(rnd() * 0.09).toFixed(3)})`);
        polygon(ctx, [Q(x, 0, d), Q(x + 72, 0, d), Q(x + 72, 0, d + 58), Q(x, 0, d + 58)]);
        ctx.strokeStyle = "rgba(2,3,4,0.85)";
        ctx.lineWidth = Math.max(1, 1.6 * u);
        ctx.stroke();
      }
    }
  } else {
    // boards running to the back wall: narrow ones, or the wide planks of a deck
    const n = st.floor === "deck" ? 11 : 18;
    for (let i = 0; i <= n; i++) {
      const x = -hx + (2 * hx * i) / n, x2 = x + (2 * hx) / n;
      if (i < n) fillPoly(ctx, [Q(x, 0, NEAR), Q(x2, 0, NEAR), Q(x2, 0, BACK), Q(x, 0, BACK)], tint());
      const a = Q(x, 0, NEAR), b = Q(x, 0, BACK);
      ctx.strokeStyle = "rgba(4,2,1,0.75)";
      ctx.lineWidth = Math.max(1, (st.floor === "deck" ? 2.4 : 1.4) * u);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (st.floor === "deck" && i < n) {
        // where one plank ends and the next begins, and the pegs that hold them
        for (let k = 0; k < 2; k++) {
          const d = NEAR + rnd() * (BACK - NEAR);
          const p = Q(x, 0, d), q = Q(x2, 0, d);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          ctx.fillStyle = "rgba(4,2,1,0.7)";
          for (const f of [0.2, 0.8]) { const g = Q(x + (x2 - x) * f, 0, d + 4); ctx.beginPath(); ctx.arc(g.x, g.y, Math.max(1, 0.9 * g.s), 0, Math.PI * 2); ctx.fill(); }
        }
      }
    }
  }
  ctx.restore();
  // ── the side walls
  for (const side of [-1, 1]) {
    const X = side * hx;
    const M = (a, y) => Q(X, y, a);
    const tone = (near, far) => {
      const g = ctx.createLinearGradient(Q(X, 0, BACK).x, 0, Q(X, 0, NEAR + 60).x, 0);
      g.addColorStop(0, far);
      g.addColorStop(1, near);
      return g;
    };
    wallUpper(ctx, L, M, NEAR, BACK, tone, rnd);
    wallLower(ctx, L, M, NEAR, BACK, tone, false);
  }
}

// The night in a window that is not the tall arched one: sky going from
// near-black to deep blue, a few stars, the moon, a dark line of hills.
// `shape` lays the path of the glass; `box` is its bounds on the screen.
function nightThrough(ctx, shape, box) {
  const rnd = lcg(4410);
  ctx.save();
  shape();
  ctx.clip();
  const sky = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  sky.addColorStop(0, "#03060e");
  sky.addColorStop(0.6, "#0c1834");
  sky.addColorStop(1, "#1d2d52");
  ctx.fillStyle = sky;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const unit = Math.min(box.w, box.h);
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = `rgba(220,230,255,${(0.2 + rnd() * 0.5).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(box.x + rnd() * box.w, box.y + rnd() * box.h * 0.8, Math.max(0.5, unit * 0.006 * (0.6 + rnd())), 0, Math.PI * 2); ctx.fill();
  }
  const mx = box.x + box.w * 0.62, my = box.y + box.h * 0.32, mr = unit * 0.1;
  soft(ctx, mx, my, mr * 4, mr * 4, "200,214,250", 0.4, "lighter");
  const body = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  body.addColorStop(0, "#fbf8ec");
  body.addColorStop(0.75, "#e2dccb");
  body.addColorStop(1, "#b8b29f");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0a1122";
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + box.h);
  for (let i = 0; i <= 12; i++) ctx.lineTo(box.x + (box.w * i) / 12, box.y + box.h * (0.86 + 0.04 * Math.sin(i * 1.3) + 0.02 * Math.sin(i * 3.1)));
  ctx.lineTo(box.x + box.w, box.y + box.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A tall sash window between heavy curtains, a pelmet over them.
function sashWindow(ctx, L) {
  const w = L.win, h = w.sill - w.top, s = L.Q(0, 0, BACK).s;
  const x0 = w.cx - w.rx;
  ctx.fillStyle = "#150c07";
  ctx.fillRect(x0 - 5 * s, w.top - 5 * s, w.rx * 2 + 10 * s, h + 10 * s);
  nightThrough(ctx, () => { ctx.beginPath(); ctx.rect(x0, w.top, w.rx * 2, h); }, { x: x0, y: w.top, w: w.rx * 2, h });
  // the sashes: a meeting rail across the middle, four panes to each
  ctx.fillStyle = "#1a110b";
  ctx.fillRect(x0, w.top + h / 2 - 1.6 * s, w.rx * 2, 3.2 * s);
  for (const y of [w.top + h * 0.25, w.top + h * 0.75]) ctx.fillRect(x0, y - 0.7 * s, w.rx * 2, 1.4 * s);
  ctx.fillRect(w.cx - 0.8 * s, w.top, 1.6 * s, h);
  ctx.fillStyle = "rgba(170,190,236,0.3)";
  ctx.fillRect(w.cx + 0.8 * s, w.top, 0.5 * s, h);
  ctx.fillRect(x0, w.top + h / 2 + 1.6 * s, w.rx * 2, 0.5 * s);
  // the sill
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(x0 - 9 * s, w.sill + 4 * s, w.rx * 2 + 18 * s, 5 * s);
  ctx.fillStyle = "rgba(170,190,236,0.3)";
  ctx.fillRect(x0 - 9 * s, w.sill + 4 * s, w.rx * 2 + 18 * s, 0.7 * s);
  // the curtains: dark red, drawn back and tied, falling well below the sill
  for (const e of [-1, 1]) {
    const out = w.cx + e * (w.rx + 26 * s), inn = w.cx + e * (w.rx - 10 * s), foot = w.sill + 62 * s, tie = w.top + h * 0.62;
    ctx.beginPath();
    ctx.moveTo(out, w.top - 12 * s);
    ctx.lineTo(inn - e * 4 * s, w.top - 12 * s);
    ctx.quadraticCurveTo(inn - e * 2 * s, tie - 30 * s, w.cx + e * (w.rx + 6 * s), tie);
    ctx.quadraticCurveTo(inn + e * 6 * s, tie + 40 * s, w.cx + e * (w.rx - 2 * s), foot);
    ctx.lineTo(out, foot);
    ctx.closePath();
    const g = ctx.createLinearGradient(out, 0, inn, 0);
    g.addColorStop(0, "#14060a");
    g.addColorStop(1, "#3a0e14");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      const x = out - e * (4 + i * 6) * s;
      ctx.strokeStyle = i % 2 ? "rgba(0,0,0,0.45)" : "rgba(170,150,200,0.1)";
      ctx.lineWidth = Math.max(0.8, 1.6 * s);
      ctx.beginPath(); ctx.moveTo(x, w.top - 12 * s); ctx.quadraticCurveTo(x - e * 3 * s, tie, x + e * 2 * s, foot); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#8a6a2a";
    ctx.fillRect(Math.min(out, w.cx + e * (w.rx + 2 * s)), tie - 1.6 * s, Math.abs(out - (w.cx + e * (w.rx + 2 * s))), 3.2 * s);
  }
  // the pelmet over them, its fringe
  ctx.fillStyle = "#2a0a10";
  ctx.fillRect(x0 - 30 * s, w.top - 26 * s, w.rx * 2 + 60 * s, 16 * s);
  ctx.fillStyle = "#8a6a2a";
  ctx.fillRect(x0 - 30 * s, w.top - 11 * s, w.rx * 2 + 60 * s, 1.6 * s);
  ctx.fillStyle = "rgba(255,206,160,0.1)";
  ctx.fillRect(x0 - 30 * s, w.top - 26 * s, w.rx * 2 + 60 * s, 1 * s);
}

// A round window, as a ship has: a heavy brass ring bolted to the wall, a
// cross of glazing bars.
function roundWindow(ctx, L) {
  const w = L.win, s = L.Q(0, 0, BACK).s;
  const cy = (w.top + w.sill) / 2, r = w.rx;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath(); ctx.arc(w.cx + 2 * s, cy + 3 * s, r + 7 * s, 0, Math.PI * 2); ctx.fill();
  const brass = ctx.createLinearGradient(w.cx - r, cy - r, w.cx + r, cy + r);
  brass.addColorStop(0, "#3a2a10");
  brass.addColorStop(0.5, "#8a6c34");
  brass.addColorStop(1, "#2a1e0c");
  ctx.fillStyle = brass;
  ctx.beginPath(); ctx.arc(w.cx, cy, r + 7 * s, 0, Math.PI * 2); ctx.fill();
  nightThrough(ctx, () => { ctx.beginPath(); ctx.arc(w.cx, cy, r, 0, Math.PI * 2); }, { x: w.cx - r, y: cy - r, w: r * 2, h: r * 2 });
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath(); ctx.arc(w.cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#2a1e0c";
  ctx.lineWidth = Math.max(1, 1.8 * s);
  ctx.beginPath(); ctx.moveTo(w.cx - r, cy); ctx.lineTo(w.cx + r, cy); ctx.moveTo(w.cx, cy - r); ctx.lineTo(w.cx, cy + r); ctx.stroke();
  // the bolts round the ring, the moon on its lower edge
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    ctx.fillStyle = "#1a1208";
    ctx.beginPath(); ctx.arc(w.cx + Math.cos(a) * (r + 3.6 * s), cy + Math.sin(a) * (r + 3.6 * s), Math.max(1, 1.1 * s), 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(190,206,246,0.4)";
  ctx.lineWidth = Math.max(0.8, 0.7 * s);
  ctx.beginPath(); ctx.arc(w.cx, cy, r + 6.4 * s, 0.3, 2.2); ctx.stroke();
}

// A small window set high and deep in a thick wall, its glass in lead.
function leadedWindow(ctx, L) {
  const w = L.win, h = w.sill - w.top, s = L.Q(0, 0, BACK).s;
  const x0 = w.cx - w.rx, deep = 9 * s;
  // the reveal: the thickness of the wall, lit on the side toward the moon
  ctx.fillStyle = "#0c0b09";
  ctx.fillRect(x0 - deep, w.top - deep, w.rx * 2 + deep * 2, h + deep * 2);
  fillPoly(ctx, [{ x: x0 - deep, y: w.top - deep }, { x: x0, y: w.top }, { x: x0, y: w.sill }, { x: x0 - deep, y: w.sill + deep }], "rgba(150,170,214,0.2)");
  fillPoly(ctx, [{ x: x0 - deep, y: w.sill + deep }, { x: x0, y: w.sill }, { x: x0 + w.rx * 2, y: w.sill }, { x: x0 + w.rx * 2 + deep, y: w.sill + deep }], "rgba(150,170,214,0.3)");
  nightThrough(ctx, () => { ctx.beginPath(); ctx.rect(x0, w.top, w.rx * 2, h); }, { x: x0, y: w.top, w: w.rx * 2, h });
  // the leads: diamonds, and two iron bars across
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, w.top, w.rx * 2, h); ctx.clip();
  ctx.strokeStyle = "rgba(8,9,10,0.9)";
  ctx.lineWidth = Math.max(0.8, 0.6 * s);
  const step = 9 * s;
  for (let k = -h; k < w.rx * 2 + h; k += step) {
    ctx.beginPath(); ctx.moveTo(x0 + k, w.top); ctx.lineTo(x0 + k + h, w.sill); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0 + k + h, w.top); ctx.lineTo(x0 + k, w.sill); ctx.stroke();
  }
  ctx.lineWidth = Math.max(1.4, 1.6 * s);
  for (const fy of [0.34, 0.68]) { ctx.beginPath(); ctx.moveTo(x0, w.top + h * fy); ctx.lineTo(x0 + w.rx * 2, w.top + h * fy); ctx.stroke(); }
  ctx.restore();
}

/** The back wall, and the window in it. */
export function paintWindowWall(ctx, L) {
  const { Q, half: hx, top, W, H } = L;
  const st = L.style;
  const a = Q(-hx, top, BACK), b = Q(hx, 0, BACK);
  const M = (x, y) => Q(x, y, BACK);
  // the back wall is all one distance off: one colour to a thing
  const tone = (near, far) => (far === st.far ? st.back : far);
  wallUpper(ctx, L, M, -hx, hx, tone, lcg(77));
  const w = L.win;
  // the moon's light on the wall round the window
  soft(ctx, w.cx, (w.top + w.sill) / 2, w.rx * 3, (w.sill - w.top) * 1.1, MOON, 0.24, "lighter");
  if (st.window === "sash") sashWindow(ctx, L);
  else if (st.window === "round") roundWindow(ctx, L);
  else if (st.window === "leaded") leadedWindow(ctx, L);
  else paintNightWindow(ctx, W, H, w, L.vp);
  // what stands in front of the wall's foot runs on under the sill
  wallLower(ctx, L, M, -hx, hx, tone, true);
  // the corners, where the walls meet
  for (const side of [-1, 1]) {
    const x0 = Q(side * hx, 0, BACK).x, x1 = Q(side * (hx - 70), 0, BACK).x;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), a.y, Math.abs(x1 - x0), b.y - a.y);
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
