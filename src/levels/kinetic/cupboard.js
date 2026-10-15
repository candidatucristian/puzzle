import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from '../../shared/paint.js';
import { cupboardLayout, polygonVertices } from './puzzle.js';

/** The games cupboard, painted like the game's storybook nights: in the games
 *  room, against its grey-green plaster, a tall oak cupboard with both its
 *  doors standing open. On the top shelf and the bottom one the games are
 *  stacked flat, only their spines showing, with a box of chessmen and a
 *  pack of cards; on the middle shelf four boxes stand face out, side by
 *  side, and on each lid is painted one big wooden game piece. A card is
 *  pinned inside the right-hand door. A lamp over the cupboard, out of the
 *  picture, lights the middle shelf.
 *
 *  Painted once per screen size: the room and the cupboard; each lid, so
 *  that it can be knocked and rock on the shelf; the glow. The card's words
 *  are the scene's. */

const K = { room: 'gc_room', glow: 'gc_glow' };
const lidKey = (i) => `gc_lid_${i}`;
const R = 2; // the lids are painted at twice their size

export function paintCupboard(textures, W, H) {
  const L = cupboardLayout(W, H);
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  paintWall(g, L);
  paintDoors(g, L);
  paintCase(g, L);
  paintStacks(g, L);
  paintCard(g, L);
  // the lamp over the cupboard: its light falls on the middle shelf
  soft(g, W / 2, L.shelves[1] - (L.shelves[1] - L.shelves[0]) * 0.4, (L.x1 - L.x0) * 0.62, (L.shelves[1] - L.shelves[0]) * 0.9, '255,200,140', 0.2, 'lighter');
  vignette(g, W, H, 0.66);
  grain(g, W, H, 0.03);
  addCanvasTexture(textures, K.room, c);
  addCanvasTexture(textures, K.glow, glowCanvas());
  const lids = L.lids.map((lid, i) => {
    const art = paintLid(lid);
    addCanvasTexture(textures, lidKey(i), art.canvas);
    return { key: lidKey(i), x: lid.x + lid.w / 2, y: lid.y + lid.h, oy: art.oy, lid };
  });
  return { L, keys: K, res: R, lids };
}

export function releaseCupboardArt(textures) {
  for (const key of [...Object.values(K), ...[0, 1, 2, 3].map(lidKey)]) if (textures.exists(key)) textures.remove(key);
}

const grad = (g, x0, y0, x1, y1, stops) => {
  const r = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((col, i) => r.addColorStop(i / (stops.length - 1), col));
  return r;
};

// The games room's wall behind: grey-green plaster, a dark dado, the boards.
function paintWall(g, L) {
  const { W, H } = L;
  g.fillStyle = grad(g, 0, 0, 0, H, ['#141a19', '#1d2523', '#161c1b']);
  g.fillRect(0, 0, W, H);
  const rnd = lcg(61);
  for (let i = 0; i < 40; i++) soft(g, rnd() * W, rnd() * H * 0.7, (20 + rnd() * 80) * L.u, (14 + rnd() * 50) * L.u, rnd() < 0.6 ? '0,0,0' : '150,160,150', 0.06);
  const dado = H * 0.7;
  g.fillStyle = grad(g, 0, dado, 0, L.y1, ['#1c1814', '#120e0a']);
  g.fillRect(0, dado, W, L.y1 - dado);
  g.fillStyle = '#2e2620'; g.fillRect(0, dado - 4 * L.u, W, 6 * L.u);
  g.fillStyle = grad(g, 0, L.y1, 0, H, ['#1e170f', '#2a2016']);
  g.fillRect(0, L.y1, W, H - L.y1);
  soft(g, W / 2, L.y1 + 4 * L.u, (L.x1 - L.x0) * 0.75, 18 * L.u, '0,0,0', 0.8);
}

// The two doors, swung open toward us: each a tall panelled leaf seen
// edge-on, narrowing away from its hinge, its inside face to us.
function paintDoors(g, L) {
  const { y0, y1, door } = L;
  const h = y1 - y0;
  for (const side of [-1, 1]) {
    const hx = side < 0 ? L.x0 : L.x1, ox = hx + side * door.w;
    const lift = h * 0.035;
    const pts = [[hx, y0 + L.frame * 0.4], [ox, y0 - lift], [ox, y1 + lift * 0.6], [hx, y1 - L.frame * 0.3]];
    g.fillStyle = grad(g, hx, 0, ox, 0, side < 0 ? ['#3a2616', '#4e3420'] : ['#3a2616', '#4e3420']);
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    // its two sunk panels, following its slant
    for (const [a, b] of [[0.06, 0.46], [0.54, 0.94]]) {
      const lerp = (k, t) => [hx + (ox - hx) * k, (pts[0][1] + (pts[1][1] - pts[0][1]) * k) * (1 - t) + (pts[3][1] + (pts[2][1] - pts[3][1]) * k) * t];
      const q = [lerp(0.16, a), lerp(0.84, a), lerp(0.84, b), lerp(0.16, b)];
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,210,170,0.08)'; g.lineWidth = Math.max(1, 1.2 * L.u); g.stroke();
    }
    // its outer edge, catching the lamp
    g.strokeStyle = 'rgba(255,214,170,0.22)'; g.lineWidth = Math.max(1, 2 * L.u);
    g.beginPath(); g.moveTo(ox, y0 - lift); g.lineTo(ox, y1 + lift * 0.6); g.stroke();
    // the hinges
    g.fillStyle = '#8a6c34';
    for (const t of [0.12, 0.88]) g.fillRect(hx - 2 * L.u, y0 + h * t, 4 * L.u, 14 * L.u);
  }
}

// The case: an oak carcass with a moulded cornice and plinth, dark inside,
// two shelves.
function paintCase(g, L) {
  const { x0, x1, y0, y1, frame, inner, u } = L;
  g.fillStyle = grad(g, x0, 0, x1, 0, ['#2a1a0e', '#4a3020', '#3a2616', '#24160c']);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // the cornice and the plinth
  g.fillStyle = grad(g, 0, y0 - frame * 0.6, 0, y0 + frame * 0.4, ['#6a4a2c', '#3a2616']);
  g.fillRect(x0 - frame * 0.4, y0 - frame * 0.6, x1 - x0 + frame * 0.8, frame);
  g.fillStyle = 'rgba(255,220,170,0.22)'; g.fillRect(x0 - frame * 0.4, y0 - frame * 0.6, x1 - x0 + frame * 0.8, 1.5 * u);
  g.fillStyle = '#1e120a'; g.fillRect(x0 - frame * 0.25, y1 - frame * 0.7, x1 - x0 + frame * 0.5, frame * 0.7);
  // the inside: dark, warmer toward the middle shelf
  g.fillStyle = grad(g, 0, inner.y0, 0, inner.y1, ['#0c0806', '#1a120c', '#0e0a06']);
  g.fillRect(inner.x0, inner.y0, inner.x1 - inner.x0, inner.y1 - inner.y0);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(inner.x0, inner.y0, inner.x1 - inner.x0, 6 * u);
  // the shelves: a board each, its front edge lit
  for (const y of [...L.shelves, inner.y1]) {
    g.fillStyle = grad(g, 0, y, 0, y + frame * 0.45, ['#6a4a2c', '#3a2616']);
    g.fillRect(inner.x0, y, inner.x1 - inner.x0, frame * 0.45);
    g.fillStyle = 'rgba(255,220,170,0.25)'; g.fillRect(inner.x0, y, inner.x1 - inner.x0, 1.2 * u);
    soft(g, (inner.x0 + inner.x1) / 2, y - 2 * u, (inner.x1 - inner.x0) * 0.48, 5 * u, '0,0,0', 0.5);
  }
}

// What else is kept here: games stacked flat on the top and bottom shelves,
// only their spines showing; a box of chessmen, open; a pack of cards.
function paintStacks(g, L) {
  const { inner, shelves, u } = L;
  const rnd = lcg(4417);
  const cols = ['#5a2a24', '#24365a', '#3e4a2a', '#6a5424', '#4a2a4a', '#2a4a4a', '#5a3a1e'];
  const stack = (x, w, base, n) => {
    let y = base;
    for (let i = 0; i < n; i++) {
      const h = (9 + rnd() * 6) * u, dx = (rnd() - 0.5) * 8 * u, ww = w * (0.85 + rnd() * 0.15);
      y -= h;
      g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      g.fillRect(x + dx, y, ww, h - 0.8 * u);
      g.fillStyle = 'rgba(255,230,190,0.18)'; g.fillRect(x + dx, y, ww, 1.2 * u);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + dx + ww * 0.12, y + h * 0.4, ww * 0.76, 1 * u);
    }
  };
  const iw = inner.x1 - inner.x0;
  // the top shelf
  stack(inner.x0 + iw * 0.05, iw * 0.3, shelves[0], 5);
  stack(inner.x0 + iw * 0.62, iw * 0.32, shelves[0], 4);
  // a box of chessmen, its lid off, between them
  const bx = inner.x0 + iw * 0.4, bw = iw * 0.17, by = shelves[0] - 16 * u;
  g.fillStyle = '#3a2414'; g.fillRect(bx, by, bw, 16 * u);
  g.fillStyle = '#1a0e08'; g.fillRect(bx + 2 * u, by + 2 * u, bw - 4 * u, 5 * u);
  for (let i = 0; i < 6; i++) {
    const px = bx + bw * (0.14 + i * 0.145), light = i % 2 === 0;
    g.fillStyle = light ? '#d8c8a8' : '#1a1410';
    g.beginPath(); g.ellipse(px, by - 2 * u, 2.6 * u, 3 * u, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(px - 1.6 * u, by - 1 * u, 3.2 * u, 4 * u);
    g.beginPath(); g.arc(px, by - 6.5 * u, 1.8 * u, 0, Math.PI * 2); g.fill();
  }
  // the bottom shelf
  stack(inner.x0 + iw * 0.06, iw * 0.36, inner.y1, 6);
  stack(inner.x0 + iw * 0.56, iw * 0.38, inner.y1, 5);
  // a pack of cards on top of the right-hand pile, its back patterned
  const cx = inner.x0 + iw * 0.47, cy = inner.y1 - 9 * u;
  g.fillStyle = '#e8e0d0'; g.fillRect(cx, cy, iw * 0.07, 9 * u);
  g.fillStyle = '#8a2a24'; g.fillRect(cx + 1.4 * u, cy + 1.4 * u, iw * 0.07 - 2.8 * u, 6 * u);
}

// The card pinned inside the right-hand door: a slip of old paper, a brass
// drawing pin; the scene writes on it.
function paintCard(g, L) {
  const c = L.card, u = L.u;
  g.save();
  g.translate(c.x + c.w / 2, c.y + c.h / 2); g.rotate(-0.04);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(-c.w / 2 + 3 * u, -c.h / 2 + 4 * u, c.w, c.h);
  g.fillStyle = grad(g, -c.w / 2, 0, c.w / 2, 0, ['#d8ccb0', '#e8dcc0']);
  g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  const pin = g.createRadialGradient(-1, -c.h / 2 + 5 * u, 0.5, 0, -c.h / 2 + 6 * u, 3.4 * u);
  pin.addColorStop(0, '#fff0b8'); pin.addColorStop(1, '#8a6420');
  g.fillStyle = pin; g.beginPath(); g.arc(0, -c.h / 2 + 6 * u, 3.2 * u, 0, Math.PI * 2); g.fill();
  g.restore();
}

// A game's box, standing face out: its lid, a colour of its own, a gilt
// rule round the edge, and in the middle one big wooden game piece, bevelled,
// lying on the lid's painted field. Returned with `oy`, how far down the
// canvas its foot is.
function paintLid(lid) {
  const w = lid.w, h = lid.h, pad = Math.max(4, w * 0.04);
  const c = makeCanvas((w + pad * 2) * R, (h + pad * 2) * R), g = c.getContext('2d');
  g.scale(R, R); g.translate(pad, pad);
  // the box: its shadow on the back of the cupboard, its sides, its lid
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(w * 0.04, h * 0.02, w, h);
  g.fillStyle = grad(g, 0, 0, w, 0, [shade(lid.box, 1.25), lid.box, shade(lid.box, 0.7)]);
  g.fillRect(0, 0, w, h);
  // the field and the gilt rule round it
  const f = w * 0.08;
  g.fillStyle = shade(lid.box, 0.82); g.fillRect(f, f, w - f * 2, h - f * 2);
  g.strokeStyle = '#c8a050'; g.lineWidth = Math.max(1, w * 0.012);
  g.strokeRect(f * 0.55, f * 0.55, w - f * 1.1, h - f * 1.1);
  g.strokeStyle = 'rgba(200,160,80,0.45)'; g.lineWidth = Math.max(0.6, w * 0.006);
  g.strokeRect(f * 1.1, f * 1.1, w - f * 2.2, h - f * 2.2);
  // little gilt curls in the corners
  g.strokeStyle = 'rgba(220,180,100,0.7)'; g.lineWidth = Math.max(0.6, w * 0.008);
  for (const [x, y, a] of [[f * 1.1, f * 1.1, 0], [w - f * 1.1, f * 1.1, Math.PI / 2], [w - f * 1.1, h - f * 1.1, Math.PI], [f * 1.1, h - f * 1.1, -Math.PI / 2]]) {
    g.beginPath(); g.arc(x + Math.cos(a + Math.PI / 4) * f * 0.6, y + Math.sin(a + Math.PI / 4) * f * 0.6, f * 0.35, a + Math.PI, a + Math.PI * 2.3); g.stroke();
  }
  // the piece: its shadow, its body, a bevel lit from the upper left
  const cx = w / 2, cy = h * 0.52, r = lid.r;
  const outline = (rr, dx = 0, dy = 0) => {
    g.beginPath();
    if (lid.sides === 0) g.arc(cx + dx, cy + dy, rr, 0, Math.PI * 2);
    else polygonVertices(lid.sides, rr).forEach((p, i) => (i ? g.lineTo(cx + dx + p.x, cy + dy + p.y) : g.moveTo(cx + dx + p.x, cy + dy + p.y)));
    g.closePath();
  };
  outline(r, r * 0.08, r * 0.12); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
  outline(r); g.fillStyle = shade(lid.piece, 0.62); g.fill();
  outline(r * 0.86); g.fillStyle = grad(g, cx - r, cy - r, cx + r, cy + r, [shade(lid.piece, 1.25), lid.piece, shade(lid.piece, 0.8)]); g.fill();
  outline(r); g.strokeStyle = 'rgba(20,10,4,0.55)'; g.lineWidth = Math.max(1, r * 0.035); g.stroke();
  // a little shine
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.beginPath(); g.ellipse(cx - r * 0.3, cy - r * 0.32, r * 0.22, r * 0.1, -0.6, 0, Math.PI * 2); g.fill();
  // the lamp's light on the top of the lid, the shelf's dark at its foot
  g.fillStyle = grad(g, 0, 0, 0, h, ['rgba(255,220,170,0.16)', 'rgba(255,220,170,0)', 'rgba(0,0,0,0.25)']);
  g.fillRect(0, 0, w, h);
  return { canvas: c, oy: (pad + h) / (h + pad * 2) };
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
