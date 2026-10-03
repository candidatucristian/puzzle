import { BOOKS } from "./puzzle.js";
import {
  soft,
  grain,
  vignette,
  glowCanvas,
  rgb,
  makeCanvas,
  addCanvasTexture,
  lcg,
  polygon,
} from "../../shared/paint.js";

/** The library for BOOKSHELF, painted like the game's other storybook
 *  nights: a tall mahogany bookcase full of old books against green damask,
 *  a table lamp glowing on a little table at its side with a cup of tea, a
 *  window full of moon at the other, a ginger cat asleep on the top of the
 *  case. On the third shelf, five books stand pulled a little out, each with
 *  its title in gold on the spine and a paper bookmark in it, numbered.
 *
 *  The room is seen straight on, in one-point perspective from the eye at
 *  VP: what is pulled out of the shelf comes toward us, away from VP.
 *
 *  Painted once per screen size: the room; each of the five books (they can
 *  be pulled); the cat's tail (it sways); a wisp of steam; the glow. */

const K = { room: "bk_room", glow: "bk_glow", tail: "bk_tail", steam: "bk_steam" };
const bookKey = (i) => `bk_book_${i}`;
const WARM = "255,196,120";
const MOON = "150,180,235";
const GOLD = "#e8c46a";
export const BOOK_FONT = 'Georgia, "Times New Roman", serif';
export const MARK_FONT = '"Architects Daughter", Georgia, cursive';

// the colours of old cloth and leather bindings
const BINDINGS = [
  [122, 30, 34],
  [38, 72, 58],
  [34, 52, 92],
  [102, 64, 30],
  [140, 96, 40],
  [74, 34, 70],
  [26, 60, 70],
  [150, 120, 80],
  [60, 40, 26],
  [90, 22, 28],
];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutLibrary(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, S: Math.min(W, H) };
  L.vp = { x: W * 0.47, y: H * 0.42 };
  L.floorY = H * 0.86;
  const caseW = Math.min(W * 0.58, H * 0.95);
  const side = caseW * 0.04;
  const c = { x0: L.vp.x - caseW / 2, x1: L.vp.x + caseW / 2, top: H * 0.07, base: L.floorY, side, w: caseW };
  c.innerTop = H * 0.115;
  c.innerBot = H * 0.8;
  c.board = H * 0.016;
  c.div = side * 0.8;
  const n = 4;
  const rh = (c.innerBot - c.innerTop) / n;
  c.rows = [];
  for (let i = 0; i < n; i++) {
    const top = c.innerTop + i * rh;
    c.rows.push({ top, bot: top + rh - c.board, h: rh - c.board });
  }
  c.bays = [
    { x0: c.x0 + side, x1: L.vp.x - c.div / 2 },
    { x0: L.vp.x + c.div / 2, x1: c.x1 - side },
  ];
  c.back = 0.9; // how deep the shelves go: the back is at this scale
  L.case = c;
  // the five books, placed along the third shelf
  L.special = 2;
  L.pull = 0.075; // how far they stand out
  L.books = placeBooks(L);
  // the little table, the lamp, the window
  L.table = { x: Math.min(W * 0.865, c.x1 + W * 0.11), y: H * 0.665, r: Math.min(W * 0.075, H * 0.1) };
  L.lamp = { x: L.table.x - L.table.r * 0.2, base: L.table.y - L.table.r * 0.05, s: u };
  L.lamp.shadeTop = L.lamp.base - 175 * u;
  L.lamp.shadeBot = L.lamp.base - 108 * u;
  L.lamp.bulb = { x: L.lamp.x, y: L.lamp.shadeBot - 18 * u };
  L.cup = { x: L.table.x + L.table.r * 0.55, y: L.table.y + L.table.r * 0.12, s: u };
  const ww = Math.min(W * 0.115, c.x0 - W * 0.04);
  L.win = { x: Math.max(W * 0.02, c.x0 - ww - W * 0.035), y0: H * 0.14, y1: H * 0.6, w: ww };
  // the cat, asleep on top of the case, its tail over the edge
  L.cat = { x: c.x1 - caseW * 0.16, y: c.top + H * 0.002, s: u };
  L.tail = { x: L.cat.x + 34 * u, y: c.top + H * 0.012 };
  return L;
}

// Every book on the shelves, left to right, row by row: its place, size,
// colour; the five on the third shelf carry their title and bookmark.
function placeBooks(L) {
  const c = L.case;
  const u = L.u;
  const rnd = lcg(4141);
  const books = [];
  let stacks = 0; // each pile gets a different ornament
  // where on the third shelf each of the five stands: a fraction across its bay
  const targets = [
    [0, 0.12],
    [0, 0.5],
    [0, 0.84],
    [1, 0.26],
    [1, 0.7],
  ];
  c.rows.forEach((row, ri) => {
    c.bays.forEach((bay, bi) => {
      let x = bay.x0 + 3 * u;
      const pending = ri === L.special ? targets.map((t, i) => ({ i, bay: t[0], at: bay.x0 + (bay.x1 - bay.x0) * t[1] })).filter((t) => t.bay === bi) : [];
      // now and then a few books lying flat, or an ornament, instead
      const flatAt = ri !== L.special && rnd() < 0.6 ? bay.x0 + (bay.x1 - bay.x0) * (0.15 + rnd() * 0.6) : null;
      let flatDone = false;
      while (x < bay.x1 - 12 * u) {
        const next = pending[0];
        if (next && x >= next.at - 18 * u) {
          const w = 38 * u;
          books.push({ kind: "special", i: next.i, x0: x, x1: x + w, row: ri, h: row.h * 0.72, col: [[96, 24, 30], [30, 58, 84], [44, 74, 50], [110, 70, 28], [64, 36, 76]][next.i], ...BOOKS[next.i] });
          pending.shift();
          x += w + 1.5 * u;
          continue;
        }
        if (flatAt !== null && !flatDone && x >= flatAt) {
          const w = (60 + rnd() * 20) * u;
          if (x + w < bay.x1 - 4 * u) {
            books.push({ kind: "stack", x0: x, x1: x + w, row: ri, n: 3 + Math.floor(rnd() * 2), seed: Math.floor(rnd() * 1e6), what: stacks++ });
            x += w + 3 * u;
            flatDone = true;
            continue;
          }
        }
        const w = (13 + rnd() * 14) * u;
        const room = bay.x1 - 3 * u - x;
        if (room < w) {
          // the last one leans on its neighbour
          if (room > 6 * u) books.push({ kind: "lean", x0: x, x1: bay.x1 - 3 * u, row: ri, h: row.h * (0.8 + rnd() * 0.12), w: (16 + rnd() * 8) * u, col: BINDINGS[Math.floor(rnd() * BINDINGS.length)], seed: Math.floor(rnd() * 1e6) });
          break;
        }
        books.push({ kind: "book", x0: x, x1: x + w, row: ri, h: row.h * (ri === L.special ? 0.62 + rnd() * 0.12 : 0.7 + rnd() * 0.26), col: BINDINGS[Math.floor(rnd() * BINDINGS.length)], seed: Math.floor(rnd() * 1e6) });
        x += w + (rnd() < 0.15 ? 2 * u : 0.6 * u);
      }
    });
  });
  return books;
}

// a point at the shelf front, brought forward by `e` (toward us, away from VP)
function fwd(L, x, y, e) {
  return { x: L.vp.x + (x - L.vp.x) * (1 + e), y: L.vp.y + (y - L.vp.y) * (1 + e) };
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintLibrary(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintWall(ctx, L);
  paintWindow(ctx, L);
  paintFloor(ctx, L);
  paintCase(ctx, L);
  paintCat(ctx, L);
  paintSideTable(ctx, L);
  paintLight(ctx, L);
  vignette(ctx, W, H, 0.55);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  const books = L.books
    .filter((b) => b.kind === "special")
    .sort((a, b) => a.i - b.i)
    .map((b) => {
      const art = paintSpecial(L, b);
      addCanvasTexture(t, bookKey(b.i), art.canvas);
      return { key: bookKey(b.i), x: art.x, y: art.y, w: art.w, h: art.h, cx: art.cx, cy: art.cy };
    });
  addCanvasTexture(t, K.tail, paintTail(L));
  addCanvasTexture(t, K.steam, paintSteam());
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, books };
}

export function releaseLibraryArt(textures) {
  for (const key of [...Object.values(K), ...BOOKS.map((_, i) => bookKey(i))]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// green damask on the walls above dark panelling, the floor's line
function paintWall(ctx, L) {
  const { W, H } = L;
  const g = ctx.createLinearGradient(0, 0, 0, L.floorY);
  g.addColorStop(0, "#0f2420");
  g.addColorStop(0.6, "#1a3a32");
  g.addColorStop(1, "#14302a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, L.floorY);
  // the damask: rows of soft lozenges with a little flower in each
  const step = 46 * L.u;
  ctx.strokeStyle = "rgba(170,210,180,0.06)";
  ctx.fillStyle = "rgba(170,210,180,0.05)";
  ctx.lineWidth = Math.max(1, L.u * 1.2);
  for (let row = 0, y = step * 0.5; y < H * 0.66; row++, y += step) {
    for (let x = (row % 2) * step * 0.5; x < W + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y - step * 0.42);
      ctx.quadraticCurveTo(x + step * 0.3, y, x, y + step * 0.42);
      ctx.quadraticCurveTo(x - step * 0.3, y, x, y - step * 0.42);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, step * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // a picture rail, the panelling below the dado
  const dado = H * 0.66;
  ctx.fillStyle = "#2a160c";
  ctx.fillRect(0, dado, W, L.floorY - dado);
  ctx.fillStyle = "#4a2a16";
  ctx.fillRect(0, dado - H * 0.012, W, H * 0.016);
  ctx.fillStyle = "rgba(255,210,160,0.14)";
  ctx.fillRect(0, dado - H * 0.012, W, Math.max(1, H * 0.003));
  const pw = 90 * L.u;
  for (let x = pw * 0.1; x < W; x += pw) {
    ctx.strokeStyle = "rgba(10,4,1,0.6)";
    ctx.lineWidth = Math.max(1, L.u * 1.5);
    ctx.strokeRect(x, dado + H * 0.03, pw * 0.8, L.floorY - dado - H * 0.06);
    ctx.strokeStyle = "rgba(255,200,150,0.08)";
    ctx.strokeRect(x + 2, dado + H * 0.03 + 2, pw * 0.8, L.floorY - dado - H * 0.06);
  }
  ctx.fillStyle = "#1a0c06";
  ctx.fillRect(0, L.floorY - H * 0.02, W, H * 0.02);
}

// the window: a tall sash full of night, the moon, a branch across it,
// heavy blue curtains; the moonlight falling in onto the floor
function paintWindow(ctx, L) {
  const { H, win } = L;
  const { x, y0, y1, w } = win;
  const arch = w * 0.5;
  const path = (g) => {
    ctx.beginPath();
    ctx.moveTo(x - g, y1 + g);
    ctx.lineTo(x - g, y0 + arch);
    ctx.arc(x + w / 2, y0 + arch, w / 2 + g, Math.PI, Math.PI * 2);
    ctx.lineTo(x + w + g, y1 + g);
    ctx.closePath();
  };
  // its frame
  path(w * 0.09);
  ctx.fillStyle = "#3a2214";
  ctx.fill();
  path(0);
  const sky = ctx.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, "#0a1630");
  sky.addColorStop(0.7, "#1c3a68");
  sky.addColorStop(1, "#2c5288");
  ctx.fillStyle = sky;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rnd = lcg(808);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(235,240,255,${(0.3 + rnd() * 0.6).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x + rnd() * w, y0 + rnd() * (y1 - y0) * 0.7, 0.5 + rnd(), 0, Math.PI * 2);
    ctx.fill();
  }
  const mx = x + w * 0.62;
  const my = y0 + arch * 1.1;
  const mr = w * 0.17;
  soft(ctx, mx, my, mr * 4, mr * 4, "200,215,255", 0.4);
  ctx.fillStyle = "#fbf6e6";
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  // a branch with its leaves, dark against the sky
  ctx.strokeStyle = "#0a1220";
  ctx.fillStyle = "#0a1220";
  ctx.lineCap = "round";
  ctx.lineWidth = w * 0.05;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.1, y0 + (y1 - y0) * 0.45);
  ctx.quadraticCurveTo(x + w * 0.4, y0 + (y1 - y0) * 0.38, x + w * 0.85, y0 + (y1 - y0) * 0.3);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const f = 0.1 + i * 0.09;
    const bx = x - w * 0.1 + w * 0.95 * f;
    const by = y0 + (y1 - y0) * (0.45 - f * 0.15);
    const a = (i % 2 ? -1 : 1) * (0.6 + rnd() * 0.5);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -w * 0.07, w * 0.03, w * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineCap = "butt";
  ctx.restore();
  // the glazing bars
  ctx.strokeStyle = "#2a1810";
  ctx.lineWidth = Math.max(2, w * 0.035);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y0);
  ctx.lineTo(x + w / 2, y1);
  for (const f of [0.42, 0.7]) {
    ctx.moveTo(x, y0 + (y1 - y0) * f);
    ctx.lineTo(x + w, y0 + (y1 - y0) * f);
  }
  ctx.stroke();
  // the sill
  ctx.fillStyle = "#5a3620";
  ctx.fillRect(x - w * 0.16, y1 + w * 0.06, w * 1.32, H * 0.018);
  ctx.fillStyle = "rgba(200,220,255,0.2)";
  ctx.fillRect(x - w * 0.16, y1 + w * 0.06, w * 1.32, Math.max(1, H * 0.003));
  // the curtains
  for (const side of [-1, 1]) {
    const ex = side < 0 ? x - w * 0.22 : x + w * 1.22;
    const inner = side < 0 ? x + w * 0.08 : x + w * 0.92;
    const tie = y0 + (y1 - y0) * 0.55;
    ctx.beginPath();
    ctx.moveTo(ex, y0 - H * 0.04);
    ctx.lineTo(inner, y0 - H * 0.04);
    ctx.bezierCurveTo(inner, y0 + (tie - y0) * 0.5, ex - side * w * 0.05, tie - H * 0.04, ex - side * w * 0.08, tie);
    ctx.bezierCurveTo(ex - side * w * 0.04, tie + H * 0.06, ex - side * w * 0.12, L.floorY - H * 0.1, ex - side * w * 0.1, L.floorY - H * 0.01);
    ctx.lineTo(ex + side * w * 0.04, L.floorY - H * 0.01);
    ctx.closePath();
    const g = ctx.createLinearGradient(Math.min(ex, inner), 0, Math.max(ex, inner), 0);
    for (let i = 0; i <= 5; i++) g.addColorStop(i / 5, i % 2 ? "#0e1e3a" : "#24406e");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = "#c9973c";
    ctx.fillRect(Math.min(ex, ex - side * w * 0.12) - w * 0.02, tie - H * 0.006, w * 0.16, H * 0.012);
  }
  ctx.fillStyle = "#c9973c";
  ctx.fillRect(x - w * 0.3, y0 - H * 0.045, w * 1.6, Math.max(2, H * 0.006));
}

// the floorboards running toward us, a rug before the case
function paintFloor(ctx, L) {
  const { W, H, vp } = L;
  const y0 = L.floorY;
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, "#2a160a");
  g.addColorStop(1, "#5a3218");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H - y0);
  ctx.strokeStyle = "rgba(14,6,2,0.7)";
  ctx.lineWidth = Math.max(1, L.u);
  const k = (H - vp.y) / (y0 - vp.y);
  for (let i = -14; i <= 14; i++) {
    const xb = vp.x + i * 60 * L.u;
    ctx.beginPath();
    ctx.moveTo(xb, y0);
    ctx.lineTo(vp.x + (xb - vp.x) * k, H);
    ctx.stroke();
  }
  // the rug: an oval, deep red, a gold border, lying flat before the case
  const rx = L.case.w * 0.42;
  const ry = (H - y0) * 0.42;
  const cx = vp.x;
  const cy = y0 + (H - y0) * 0.58;
  soft(ctx, cx, cy + ry * 0.1, rx * 1.05, ry * 1.1, "0,0,0", 0.4);
  ctx.fillStyle = "#6a1a1e";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c9973c";
  ctx.lineWidth = Math.max(2, ry * 0.08);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.9, ry * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(201,151,60,0.5)";
  ctx.lineWidth = Math.max(1, ry * 0.03);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.78, ry * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(201,151,60,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.2, ry * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// the bookcase: its cornice, its sides, the shelves and every book on them
// (the five pulled out are painted on their own)
function paintCase(ctx, L) {
  const { H, vp } = L;
  const c = L.case;
  const u = L.u;
  soft(ctx, vp.x, c.base, c.w * 0.62, H * 0.03, "0,0,0", 0.7);
  // the carcass
  const wood = ctx.createLinearGradient(c.x0, 0, c.x1, 0);
  wood.addColorStop(0, "#3a1a0c");
  wood.addColorStop(0.5, "#5a2a14");
  wood.addColorStop(1, "#6a341a");
  ctx.fillStyle = wood;
  ctx.fillRect(c.x0, c.top, c.w, c.base - c.top);
  // each shelf's hollow, then its books
  c.rows.forEach((row, ri) => {
    for (const bay of c.bays) {
      paintHollow(ctx, L, bay, row);
    }
    for (const b of L.books) if (b.row === ri && b.kind !== "special") paintBook(ctx, L, b, row);
    // the shelf board under this row: its front edge
    const by = row.bot;
    const bg = ctx.createLinearGradient(0, by, 0, by + c.board);
    bg.addColorStop(0, "#9a5a30");
    bg.addColorStop(0.3, "#6a3418");
    bg.addColorStop(1, "#3a1a0a");
    ctx.fillStyle = bg;
    ctx.fillRect(c.x0 + c.side * 0.6, by, c.w - c.side * 1.2, c.board);
  });
  // where the five stand, the gap their pulling left at the back shows dark
  for (const b of L.books) {
    if (b.kind !== "special") continue;
    const row = c.rows[b.row];
    ctx.fillStyle = "#0c0604";
    ctx.fillRect(b.x0, row.bot - b.h, b.x1 - b.x0, b.h);
  }
  // the sides and the middle upright, fluted
  const upright = (x0, w) => {
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "#3a1a0a");
    g.addColorStop(0.3, "#7a4022");
    g.addColorStop(0.7, "#5a2c14");
    g.addColorStop(1, "#2a1206");
    ctx.fillStyle = g;
    ctx.fillRect(x0, c.innerTop - H * 0.01, w, c.innerBot - c.innerTop + H * 0.02);
    ctx.strokeStyle = "rgba(20,8,2,0.45)";
    ctx.lineWidth = Math.max(1, u);
    for (const f of [0.3, 0.5, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(x0 + w * f, c.innerTop + H * 0.01);
      ctx.lineTo(x0 + w * f, c.innerBot - H * 0.01);
      ctx.stroke();
    }
  };
  upright(c.x0, c.side);
  upright(c.x1 - c.side, c.side);
  upright(vp.x - c.div / 2, c.div);
  // the cornice: stepped mouldings, standing proud of the case
  const steps = [
    [0, 0.012, "#2a1206"],
    [0.012, 0.022, "#8a4c26"],
    [0.022, 0.032, "#4a2410"],
    [0.032, 0.045, "#6a3418"],
  ];
  for (const [a, b, col] of steps) {
    const over = (0.045 - a) * c.w * 0.6;
    ctx.fillStyle = col;
    ctx.fillRect(c.x0 - over, c.top + H * a, c.w + over * 2, H * (b - a));
  }
  ctx.fillStyle = "rgba(255,210,160,0.18)";
  ctx.fillRect(c.x0 - c.w * 0.027, c.top + H * 0.012, c.w * 1.054, Math.max(1, H * 0.003));
  // a carved shell in the middle of the frieze
  const fx = vp.x;
  const fy = c.top + H * 0.039;
  ctx.fillStyle = "#9a5a30";
  ctx.beginPath();
  ctx.arc(fx, fy, H * 0.016, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = "rgba(30,12,4,0.7)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.sin((i * Math.PI) / 6) * H * 0.016, fy - Math.cos((i * Math.PI) / 6) * H * 0.016);
    ctx.stroke();
  }
  // the plinth
  ctx.fillStyle = "#2a1206";
  ctx.fillRect(c.x0 - c.w * 0.01, c.innerBot, c.w * 1.02, c.base - c.innerBot);
  ctx.fillStyle = "#5a2c14";
  ctx.fillRect(c.x0 - c.w * 0.01, c.innerBot + H * 0.008, c.w * 1.02, H * 0.012);
  ctx.fillStyle = "rgba(255,210,160,0.12)";
  ctx.fillRect(c.x0 - c.w * 0.01, c.innerBot + H * 0.008, c.w * 1.02, Math.max(1, H * 0.002));
  // a little brass ladder rail across the top
  ctx.strokeStyle = "#b8862e";
  ctx.lineWidth = Math.max(2, H * 0.004);
  ctx.beginPath();
  ctx.moveTo(c.x0, c.innerTop + H * 0.004);
  ctx.lineTo(c.x1, c.innerTop + H * 0.004);
  ctx.stroke();
}

// a shelf's hollow: its dark back, its sides, the board above or below seen
// in perspective
function paintHollow(ctx, L, bay, row) {
  const { vp } = L;
  const k = L.case.back;
  const back = (x, y) => ({ x: vp.x + (x - vp.x) * k, y: vp.y + (y - vp.y) * k });
  const fl = { x: bay.x0, y: row.top };
  const fr = { x: bay.x1, y: row.top };
  const nr = { x: bay.x1, y: row.bot };
  const nl = { x: bay.x0, y: row.bot };
  const bl = back(fl.x, fl.y);
  const br = back(fr.x, fr.y);
  const bnr = back(nr.x, nr.y);
  const bnl = back(nl.x, nl.y);
  ctx.save();
  ctx.fillStyle = "#24120a";
  polygon(ctx, [fl, fr, nr, nl]);
  ctx.fill();
  // only what is seen through the opening
  ctx.clip();
  // the back panel
  const g = ctx.createLinearGradient(0, bl.y, 0, bnl.y);
  g.addColorStop(0, "#140804");
  g.addColorStop(1, "#2a160c");
  ctx.fillStyle = g;
  polygon(ctx, [bl, br, bnr, bnl]);
  ctx.fill();
  // the board above (seen from below) or the shelf below (seen from above)
  ctx.fillStyle = "#3a1c0c";
  polygon(ctx, [fl, fr, br, bl]);
  ctx.fill();
  ctx.fillStyle = "#4a2612";
  polygon(ctx, [nl, nr, bnr, bnl]);
  ctx.fill();
  // the sides
  ctx.fillStyle = "#2e160a";
  polygon(ctx, [fl, bl, bnl, nl]);
  ctx.fill();
  polygon(ctx, [fr, br, bnr, nr]);
  ctx.fill();
  // the shadow the shelf above throws in
  soft(ctx, (bay.x0 + bay.x1) / 2, row.top, (bay.x1 - bay.x0) * 0.6, row.h * 0.35, "0,0,0", 0.5);
  ctx.restore();
}

// one book on the shelf: upright, leaning, or a few lying flat
function paintBook(ctx, L, b, row) {
  const u = L.u;
  const rnd = lcg(b.seed || 7);
  const floor = row.bot;
  if (b.kind === "stack") {
    let y = floor;
    for (let i = 0; i < b.n; i++) {
      const th = (9 + rnd() * 7) * u;
      const inset = rnd() * 6 * u;
      const col = BINDINGS[Math.floor(rnd() * BINDINGS.length)];
      const x0 = b.x0 + inset;
      const x1 = b.x1 - (rnd() * 6 * u);
      const g = ctx.createLinearGradient(0, y - th, 0, y);
      g.addColorStop(0, rgb(col[0] * 1.2, col[1] * 1.2, col[2] * 1.2));
      g.addColorStop(1, rgb(col[0] * 0.55, col[1] * 0.55, col[2] * 0.55));
      ctx.fillStyle = g;
      ctx.fillRect(x0, y - th, x1 - x0, th);
      ctx.fillStyle = "rgba(232,196,106,0.6)";
      ctx.fillRect(x0 + 4 * u, y - th * 0.55, x1 - x0 - 8 * u, Math.max(1, th * 0.1));
      y -= th;
    }
    // something on top of the pile: a little brass globe, a potted ivy, or a
    // candle stub
    const what = b.what % 3;
    if (what === 1) {
      const px = (b.x0 + b.x1) / 2;
      const ph = 16 * u;
      const pg = ctx.createLinearGradient(px - 9 * u, 0, px + 9 * u, 0);
      pg.addColorStop(0, "#7a3a1c");
      pg.addColorStop(0.4, "#c8683a");
      pg.addColorStop(1, "#6a2e14");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(px - 10 * u, y - ph);
      ctx.lineTo(px + 10 * u, y - ph);
      ctx.lineTo(px + 7 * u, y);
      ctx.lineTo(px - 7 * u, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#9a4a24";
      ctx.fillRect(px - 11 * u, y - ph - 3 * u, 22 * u, 4 * u);
      // the ivy: a few stems trailing over the edge of the shelf
      ctx.strokeStyle = "#2a4a20";
      ctx.lineWidth = Math.max(1, u * 1.2);
      for (const [dx, len] of [
        [-8, 40],
        [-2, 26],
        [6, 52],
      ]) {
        const sx = px + dx * u;
        const ex = sx + dx * 0.8 * u;
        const ey = y + len * u;
        ctx.beginPath();
        ctx.moveTo(sx, y - ph - 2 * u);
        ctx.quadraticCurveTo(sx + dx * 2 * u, y - ph * 0.4, ex, ey);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const f = i / 5;
          const lx = sx + (ex - sx) * f + (i % 2 ? 4 : -4) * u;
          const ly = y - ph + (ey - y + ph) * f;
          ctx.fillStyle = i % 2 ? "#3a6a2c" : "#4e8a38";
          ctx.beginPath();
          ctx.ellipse(lx, ly, 4.5 * u, 3.2 * u, i % 2 ? 0.6 : -0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? "#3a6a2c" : "#5a9a40";
        ctx.beginPath();
        ctx.ellipse(px + (i - 3) * 4 * u, y - ph - 6 * u - (i % 3) * 3 * u, 5 * u, 3.5 * u, (i - 3) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (what === 0) {
      const gx = (b.x0 + b.x1) / 2;
      const gr = Math.min(16 * u, (y - row.top) * 0.3);
      ctx.fillStyle = "#b8862e";
      ctx.fillRect(gx - 1.5 * u, y - gr * 0.6, 3 * u, gr * 0.6);
      ctx.fillRect(gx - gr * 0.6, y - 3 * u, gr * 1.2, 3 * u);
      const gg = ctx.createRadialGradient(gx - gr * 0.3, y - gr * 1.9, 0, gx, y - gr * 1.6, gr);
      gg.addColorStop(0, "#9ac0c8");
      gg.addColorStop(0.6, "#3a6a74");
      gg.addColorStop(1, "#1a2e34");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(gx, y - gr * 1.6, gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c9973c";
      ctx.lineWidth = Math.max(1, u * 1.4);
      ctx.beginPath();
      ctx.arc(gx, y - gr * 1.6, gr * 1.12, Math.PI * 0.6, Math.PI * 2.4);
      ctx.stroke();
    } else {
      const cx = (b.x0 + b.x1) / 2;
      ctx.fillStyle = "#efe4c8";
      ctx.fillRect(cx - 5 * u, y - 22 * u, 10 * u, 22 * u);
      ctx.fillStyle = "#b8862e";
      ctx.fillRect(cx - 10 * u, y - 3 * u, 20 * u, 3 * u);
    }
    return;
  }
  const [r, g, bl] = b.col;
  const spine = (x0, x1, top) => {
    const gr = ctx.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, rgb(r * 0.45, g * 0.45, bl * 0.45));
    gr.addColorStop(0.3, rgb(r * 1.15, g * 1.15, bl * 1.15));
    gr.addColorStop(0.7, rgb(r * 0.9, g * 0.9, bl * 0.9));
    gr.addColorStop(1, rgb(r * 0.35, g * 0.35, bl * 0.35));
    ctx.fillStyle = gr;
    ctx.fillRect(x0, top, x1 - x0, floor - top);
    const h = floor - top;
    // gilt bands, raised bands, a dark title patch with no title to read
    const style = Math.floor(rnd() * 3);
    ctx.fillStyle = "rgba(232,196,106,0.75)";
    for (const f of [0.07, 0.11, 0.89, 0.93]) ctx.fillRect(x0 + 1, top + h * f, x1 - x0 - 2, Math.max(1, h * 0.012));
    if (style === 0) {
      ctx.fillStyle = "rgba(10,6,4,0.5)";
      ctx.fillRect(x0 + 2 * u, top + h * 0.2, x1 - x0 - 4 * u, h * 0.16);
      ctx.fillStyle = "rgba(232,196,106,0.5)";
      ctx.fillRect(x0 + 4 * u, top + h * 0.27, x1 - x0 - 8 * u, Math.max(1, h * 0.012));
    } else if (style === 1) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      for (const f of [0.3, 0.45, 0.6, 0.75]) ctx.fillRect(x0, top + h * f, x1 - x0, Math.max(1.5, h * 0.02));
      ctx.fillStyle = "rgba(255,230,190,0.12)";
      for (const f of [0.3, 0.45, 0.6, 0.75]) ctx.fillRect(x0, top + h * f - 1, x1 - x0, 1);
    } else {
      ctx.fillStyle = "rgba(232,196,106,0.55)";
      ctx.beginPath();
      ctx.arc((x0 + x1) / 2, top + h * 0.5, (x1 - x0) * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  if (b.kind === "book") {
    spine(b.x0, b.x1, floor - b.h);
    // the tops of the pages, just seen on the shelves below the eye
    if (floor - b.h > L.vp.y) {
      const d = (floor - b.h - L.vp.y) * (1 - L.case.back) * 0.5;
      ctx.fillStyle = "rgba(220,200,160,0.55)";
      ctx.fillRect(b.x0 + 1, floor - b.h - d, b.x1 - b.x0 - 2, d);
    }
    return;
  }
  // leaning on its neighbour: pivot on its foot
  ctx.save();
  ctx.translate(b.x0, floor);
  const ang = Math.atan2(b.x1 - b.x0 - b.w, b.h) * 0.9;
  ctx.rotate(ang);
  ctx.translate(-b.x0, -floor);
  spine(b.x0, b.x0 + b.w, floor - b.h);
  ctx.restore();
}

// One of the five, pulled out toward us: its top with the pages and the
// bookmark standing up out of them, the side of its cover, its spine with the
// title in gold. On its own canvas, with where it goes.
function paintSpecial(L, b) {
  const { vp, u } = L;
  const row = L.case.rows[b.row];
  const e = L.pull;
  const top = row.bot - b.h;
  // the spine as it would be in the shelf, and pulled out
  const a = { x0: b.x0, x1: b.x1, y0: top, y1: row.bot };
  const p0 = fwd(L, a.x0, a.y0, e);
  const p1 = fwd(L, a.x1, a.y1, e);
  const markH = row.h * 0.24;
  const pad = 6 * u;
  const bx0 = Math.min(a.x0, p0.x) - pad;
  const bx1 = Math.max(a.x1, p1.x) + pad;
  const by0 = a.y0 - markH - pad;
  const by1 = p1.y + pad * 2;
  const W2 = bx1 - bx0;
  const H2 = by1 - by0;
  const R = 2;
  const c = makeCanvas(W2 * R, H2 * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.translate(-bx0, -by0);
  const [r, gg, bl] = b.col;
  const col = (k) => rgb(r * k, gg * k, bl * k);
  // its shadow on the shelf
  soft(g, (p0.x + p1.x) / 2 + 4 * u, p1.y, (p1.x - p0.x) * 0.8, 5 * u, "0,0,0", 0.7);
  // the top: the cover boards and the page block between
  const backL = { x: a.x0, y: a.y0 };
  const backR = { x: a.x1, y: a.y0 };
  const frontL = { x: p0.x, y: p0.y };
  const frontR = { x: p1.x, y: p0.y };
  g.fillStyle = col(0.7);
  polygon(g, [backL, backR, frontR, frontL]);
  g.fill();
  const inset = (p1.x - p0.x) * 0.1;
  const pages = g.createLinearGradient(0, backL.y, 0, frontL.y);
  pages.addColorStop(0, "#c8b48a");
  pages.addColorStop(1, "#f4e8cc");
  g.fillStyle = pages;
  polygon(g, [
    { x: backL.x + inset * 0.9, y: backL.y },
    { x: backR.x - inset * 0.9, y: backR.y },
    { x: frontR.x - inset, y: frontR.y - 1 },
    { x: frontL.x + inset, y: frontL.y - 1 },
  ]);
  g.fill();
  g.strokeStyle = "rgba(120,96,60,0.4)";
  g.lineWidth = 0.6;
  for (let k = 1; k < 4; k++) {
    const f = k / 4;
    g.beginPath();
    g.moveTo(backL.x + inset + (frontL.x - backL.x) * f, backL.y + (frontL.y - backL.y) * f);
    g.lineTo(backR.x - inset + (frontR.x - backR.x) * f, backR.y + (frontR.y - backR.y) * f);
    g.stroke();
  }
  // the bookmark: a slip of card standing up out of the pages, its number
  // written on it
  const mx = (backL.x + backR.x + frontL.x + frontR.x) / 4;
  const my = (backL.y + frontL.y) / 2;
  const mw = Math.min((p1.x - p0.x) * 0.62, 26 * u);
  g.save();
  g.translate(mx, my);
  g.rotate((b.i % 2 ? 1 : -1) * 0.05);
  soft(g, 2 * u, -markH * 0.4, mw * 0.7, markH * 0.6, "0,0,0", 0.25);
  const card = g.createLinearGradient(-mw / 2, 0, mw / 2, 0);
  card.addColorStop(0, "#e8dcc0");
  card.addColorStop(0.4, "#fbf3dc");
  card.addColorStop(1, "#d8c8a4");
  g.fillStyle = card;
  g.beginPath();
  g.moveTo(-mw / 2, 0);
  g.lineTo(-mw / 2, -markH);
  g.lineTo(mw / 2, -markH);
  g.lineTo(mw / 2, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(120,96,60,0.5)";
  g.lineWidth = 0.8;
  g.stroke();
  g.fillStyle = "#3a2210";
  g.font = `700 ${Math.round(markH * 0.62)}px ${MARK_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(b.mark), 0, -markH * 0.52);
  g.restore();
  // the side of its cover, on the side toward the eye
  const toward = (a.x0 + a.x1) / 2 < vp.x ? 1 : -1;
  const sx = toward > 0 ? a.x1 : a.x0;
  const sp = toward > 0 ? p1.x : p0.x;
  g.fillStyle = col(0.42);
  polygon(g, [
    { x: sx, y: a.y0 },
    { x: sp, y: p0.y },
    { x: sp, y: p1.y },
    { x: sx, y: a.y1 },
  ]);
  g.fill();
  // the spine
  const sg = g.createLinearGradient(p0.x, 0, p1.x, 0);
  sg.addColorStop(0, col(0.45));
  sg.addColorStop(0.28, col(1.25));
  sg.addColorStop(0.65, col(0.95));
  sg.addColorStop(1, col(0.4));
  g.fillStyle = sg;
  g.beginPath();
  g.roundRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y, 2 * u);
  g.fill();
  const sw = p1.x - p0.x;
  const sh = p1.y - p0.y;
  g.fillStyle = GOLD;
  for (const f of [0.05, 0.085, 0.915, 0.95]) g.fillRect(p0.x + 1.5, p0.y + sh * f, sw - 3, Math.max(1, sh * 0.011));
  // the title, in gold, running down the spine
  const size = Math.min(sw * 0.56, (sh * 0.7) / (b.title.length * 0.78));
  g.save();
  g.translate(p0.x + sw / 2, p0.y + sh / 2);
  g.rotate(Math.PI / 2);
  g.font = `700 ${Math.round(size)}px ${BOOK_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  if ("letterSpacing" in g) g.letterSpacing = `${Math.round(size * 0.12)}px`;
  g.fillStyle = "rgba(0,0,0,0.5)";
  g.fillText(b.title, 1, 1.2);
  g.fillStyle = GOLD;
  g.fillText(b.title, 0, 0);
  g.restore();
  return { canvas: c, x: bx0, y: by0, w: W2, h: H2, cx: (p0.x + p1.x) / 2, cy: (p0.y + p1.y) / 2 };
}

// a ginger cat asleep on top of the case, curled nose to tail
function paintCat(ctx, L) {
  const { x, y, s } = L.cat;
  const k = s;
  soft(ctx, x, y, 60 * k, 6 * k, "0,0,0", 0.5);
  const fur = ctx.createLinearGradient(x - 50 * k, y - 50 * k, x + 50 * k, y);
  fur.addColorStop(0, "#f0a050");
  fur.addColorStop(0.6, "#c86a24");
  fur.addColorStop(1, "#7a3c14");
  // the body, a round loaf
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(x, y - 20 * k, 48 * k, 22 * k, 0, Math.PI, 0);
  ctx.lineTo(x + 48 * k, y);
  ctx.lineTo(x - 48 * k, y);
  ctx.closePath();
  ctx.fill();
  // stripes
  ctx.strokeStyle = "rgba(122,56,16,0.55)";
  ctx.lineWidth = 3 * k;
  ctx.lineCap = "round";
  for (const dx of [-14, 0, 14, 28]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * k, y - 40 * k);
    ctx.quadraticCurveTo(x + (dx + 6) * k, y - 30 * k, x + (dx + 2) * k, y - 22 * k);
    ctx.stroke();
  }
  // the head, tucked down on its paws at the left
  const hx = x - 38 * k;
  const hy = y - 15 * k;
  ctx.fillStyle = "#e08a3c";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 19 * k, 15 * k, -0.15, 0, Math.PI * 2);
  ctx.fill();
  for (const ex of [-1, 1]) {
    ctx.fillStyle = "#d07a30";
    ctx.beginPath();
    ctx.moveTo(hx + ex * 14 * k - 6 * k, hy - 8 * k);
    ctx.lineTo(hx + ex * 16 * k, hy - 24 * k);
    ctx.lineTo(hx + ex * 14 * k + 6 * k, hy - 6 * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4b090";
    ctx.beginPath();
    ctx.moveTo(hx + ex * 14 * k - 3 * k, hy - 9 * k);
    ctx.lineTo(hx + ex * 15.5 * k, hy - 19 * k);
    ctx.lineTo(hx + ex * 14 * k + 3 * k, hy - 8 * k);
    ctx.closePath();
    ctx.fill();
  }
  // shut eyes, a pink nose, a white muzzle and paws
  ctx.fillStyle = "#fbe6cc";
  ctx.beginPath();
  ctx.ellipse(hx + 1 * k, hy + 6 * k, 9 * k, 6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + 14 * k, y - 3 * k, 9 * k, 4 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a2410";
  ctx.lineWidth = 1.6 * k;
  for (const ex of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(hx + ex * 7 * k, hy - 1 * k, 4 * k, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = "#e07a80";
  ctx.beginPath();
  ctx.moveTo(hx - 2.5 * k, hy + 3 * k);
  ctx.lineTo(hx + 2.5 * k, hy + 3 * k);
  ctx.lineTo(hx, hy + 6 * k);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = "butt";
  // the lamp's warmth on its back
  soft(ctx, x + 20 * k, y - 30 * k, 40 * k, 16 * k, WARM, 0.2, "lighter");
}

// the cat's tail, hanging over the edge of the case; its root at the top
function paintTail(L) {
  const k = L.cat.s;
  const w = 36 * k;
  const h = 52 * k;
  const R = 2;
  const c = makeCanvas(w * R, h * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.lineCap = "round";
  // a fat furry tail over the edge, its tip curling up
  const path = () => {
    g.beginPath();
    g.moveTo(w * 0.4, 3 * k);
    g.bezierCurveTo(w * 0.42, h * 0.45, w * 0.3, h * 0.8, w * 0.55, h - 9 * k);
    g.quadraticCurveTo(w * 0.78, h - 6 * k, w * 0.74, h - 18 * k);
  };
  path();
  g.strokeStyle = "#7a3c14";
  g.lineWidth = 14 * k;
  g.stroke();
  const fur = g.createLinearGradient(0, 0, w, 0);
  fur.addColorStop(0, "#f0a050");
  fur.addColorStop(1, "#c86a24");
  g.strokeStyle = fur;
  g.lineWidth = 11.5 * k;
  path();
  g.stroke();
  // its rings
  g.strokeStyle = "rgba(122,56,16,0.55)";
  g.lineWidth = 11.5 * k;
  g.setLineDash([3.5 * k, 8 * k]);
  path();
  g.stroke();
  g.setLineDash([]);
  // the cream tip
  g.fillStyle = "#fbe6cc";
  g.beginPath();
  g.arc(w * 0.74, h - 18 * k, 5.6 * k, 0, Math.PI * 2);
  g.fill();
  return c;
}

// the little round table, its pile of books, the lamp with its pleated
// shade, the cup of tea
function paintSideTable(ctx, L) {
  const { H, u } = L;
  const t = L.table;
  const k = 0.22;
  const floorY = L.floorY + H * 0.06;
  soft(ctx, t.x, floorY, t.r * 1.2, t.r * 0.2, "0,0,0", 0.6);
  // the pedestal and its three feet
  const pg = ctx.createLinearGradient(t.x - 8 * u, 0, t.x + 8 * u, 0);
  pg.addColorStop(0, "#2a1206");
  pg.addColorStop(0.4, "#7a4022");
  pg.addColorStop(1, "#2a1206");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(t.x - 5 * u, t.y);
  ctx.lineTo(t.x + 5 * u, t.y);
  ctx.quadraticCurveTo(t.x + 12 * u, (t.y + floorY) / 2, t.x + 7 * u, floorY - 14 * u);
  ctx.lineTo(t.x - 7 * u, floorY - 14 * u);
  ctx.quadraticCurveTo(t.x - 12 * u, (t.y + floorY) / 2, t.x - 5 * u, t.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a1a0a";
  ctx.lineWidth = 5 * u;
  ctx.lineCap = "round";
  for (const d of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(t.x, floorY - 14 * u);
    ctx.quadraticCurveTo(t.x + d * t.r * 0.4, floorY - 10 * u, t.x + d * t.r * 0.62, floorY + (d === 0 ? 5 : -2) * u);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // the top: a round of mahogany, its edge
  ctx.fillStyle = "#2a1206";
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 6 * u, t.r, t.r * k, 0, 0, Math.PI * 2);
  ctx.fill();
  const tg = ctx.createLinearGradient(t.x - t.r, 0, t.x + t.r, 0);
  tg.addColorStop(0, "#5a2c14");
  tg.addColorStop(0.5, "#8a4a24");
  tg.addColorStop(1, "#4a2410");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, t.r, t.r * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // two books under the lamp
  const lp = L.lamp;
  for (const [dy, w, col] of [
    [0, 0.95, "#2a4a3a"],
    [-9, 0.8, "#6a1e22"],
  ]) {
    const bw = t.r * w;
    ctx.fillStyle = col;
    ctx.fillRect(lp.x - bw / 2, lp.base + dy * u - 9 * u, bw, 9 * u);
    ctx.fillStyle = "rgba(232,196,106,0.5)";
    ctx.fillRect(lp.x - bw / 2 + 3 * u, lp.base + dy * u - 5 * u, bw - 6 * u, Math.max(1, u));
  }
  // the lamp: a brass urn, its stem, the pleated shade
  const by = lp.base - 18 * u;
  const bg = ctx.createLinearGradient(lp.x - 16 * u, 0, lp.x + 16 * u, 0);
  bg.addColorStop(0, "#6a4810");
  bg.addColorStop(0.35, "#f0d080");
  bg.addColorStop(1, "#5a3a0c");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(lp.x, by, 14 * u, 4 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(lp.x - 6 * u, by);
  ctx.bezierCurveTo(lp.x - 22 * u, by - 18 * u, lp.x - 16 * u, by - 40 * u, lp.x - 4 * u, by - 48 * u);
  ctx.lineTo(lp.x + 4 * u, by - 48 * u);
  ctx.bezierCurveTo(lp.x + 16 * u, by - 40 * u, lp.x + 22 * u, by - 18 * u, lp.x + 6 * u, by);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(lp.x - 2 * u, lp.shadeBot, 4 * u, by - 48 * u - lp.shadeBot);
  // the shade, lit from within
  const sTop = lp.shadeTop;
  const sBot = lp.shadeBot;
  const tw = 34 * u;
  const bw2 = 58 * u;
  ctx.beginPath();
  ctx.moveTo(lp.x - tw, sTop);
  ctx.lineTo(lp.x + tw, sTop);
  ctx.lineTo(lp.x + bw2, sBot);
  ctx.quadraticCurveTo(lp.x, sBot + 8 * u, lp.x - bw2, sBot);
  ctx.closePath();
  const sg = ctx.createLinearGradient(lp.x - bw2, 0, lp.x + bw2, 0);
  sg.addColorStop(0, "#c88a3c");
  sg.addColorStop(0.45, "#ffe2a0");
  sg.addColorStop(1, "#b0702c");
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(140,80,20,0.35)";
  ctx.lineWidth = Math.max(1, u);
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(lp.x + (i / 6) * tw, sTop);
    ctx.lineTo(lp.x + (i / 6) * bw2, sBot + 4 * u);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#8a5a20";
  ctx.fillRect(lp.x - tw, sTop - 2 * u, tw * 2, 3 * u);
  ctx.beginPath();
  ctx.ellipse(lp.x, sBot + 2 * u, bw2, 4 * u, 0, 0, Math.PI);
  ctx.strokeStyle = "#8a5a20";
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  // the cup of tea on its saucer
  const cp = L.cup;
  ctx.fillStyle = "#e8e2d4";
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y, 20 * u, 5 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  const cg = ctx.createLinearGradient(cp.x - 12 * u, 0, cp.x + 12 * u, 0);
  cg.addColorStop(0, "#c8c0b0");
  cg.addColorStop(0.4, "#fffaf0");
  cg.addColorStop(1, "#b8b0a0");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(cp.x - 12 * u, cp.y - 16 * u);
  ctx.lineTo(cp.x + 12 * u, cp.y - 16 * u);
  ctx.quadraticCurveTo(cp.x + 11 * u, cp.y - 1 * u, cp.x, cp.y - 1 * u);
  ctx.quadraticCurveTo(cp.x - 11 * u, cp.y - 1 * u, cp.x - 12 * u, cp.y - 16 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#6a3a14";
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y - 16 * u, 11 * u, 3 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e8e2d4";
  ctx.lineWidth = 2.5 * u;
  ctx.beginPath();
  ctx.ellipse(cp.x + 14 * u, cp.y - 10 * u, 5 * u, 4.5 * u, 0, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(60,90,150,0.6)";
  ctx.lineWidth = Math.max(1, u);
  ctx.beginPath();
  ctx.moveTo(cp.x - 11 * u, cp.y - 12 * u);
  ctx.lineTo(cp.x + 11 * u, cp.y - 12 * u);
  ctx.stroke();
}

// the lamp's warm light over the room, the moon's from the window
function paintLight(ctx, L) {
  const { W, H } = L;
  const lp = L.lamp;
  // the light thrown up and down from the shade
  soft(ctx, lp.x, lp.shadeTop - H * 0.08, W * 0.12, H * 0.18, WARM, 0.25, "lighter");
  soft(ctx, lp.x, lp.base, W * 0.2, H * 0.12, WARM, 0.35, "lighter");
  soft(ctx, lp.x - W * 0.12, H * 0.5, W * 0.45, H * 0.45, WARM, 0.16, "lighter");
  // the third shelf is where the lamp reaches best
  const row = L.case.rows[L.special];
  soft(ctx, L.vp.x + L.case.w * 0.1, (row.top + row.bot) / 2, L.case.w * 0.6, row.h * 1.2, WARM, 0.12, "lighter");
  // moonlight from the window, lying on the floor
  const win = L.win;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.moveTo(win.x, win.y1);
  ctx.lineTo(win.x + win.w, win.y1);
  ctx.lineTo(win.x + win.w * 3.2, H);
  ctx.lineTo(win.x + win.w * 0.9, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, win.y1, 0, H);
  g.addColorStop(0, `rgba(${MOON},0)`);
  g.addColorStop(0.5, `rgba(${MOON},0.08)`);
  g.addColorStop(1, `rgba(${MOON},0.02)`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  soft(ctx, win.x + win.w / 2, (win.y0 + win.y1) / 2, win.w * 1.6, (win.y1 - win.y0) * 0.8, MOON, 0.1, "lighter");
}

// a wisp of steam
function paintSteam() {
  const c = makeCanvas(40, 120);
  const g = c.getContext("2d");
  g.lineCap = "round";
  for (const [w, a] of [
    [10, 0.08],
    [5, 0.16],
  ]) {
    g.strokeStyle = `rgba(255,250,240,${a})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(20, 115);
    g.bezierCurveTo(6, 85, 34, 60, 18, 30);
    g.quadraticCurveTo(10, 15, 22, 4);
    g.stroke();
  }
  return c;
}
