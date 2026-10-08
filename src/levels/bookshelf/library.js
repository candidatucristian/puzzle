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

/** The library for BOOKSHELF, late at night: a tall mahogany bookcase full
 *  of old books against green damask, the one lamp burning on a little table
 *  at its side with a cup of tea, the rest of the room gone to shadow; a
 *  window full of moon at the other side, a tabby cat asleep on the top of
 *  the case. On the third shelf, five books stand pulled a little out, each with
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
const BOOK_FONT = 'Georgia, "Times New Roman", serif';
const MARK_FONT = '"Architects Daughter", Georgia, cursive';

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
  L.table = { x: Math.min(W * 0.865, c.x1 + W * 0.11), y: H * 0.665, r: Math.min(W * 0.085, H * 0.115) };
  L.lamp = { x: L.table.x - L.table.r * 0.2, base: L.table.y - L.table.r * 0.05, s: u };
  L.lamp.shadeTop = L.lamp.base - 175 * u;
  L.lamp.shadeBot = L.lamp.base - 108 * u;
  L.lamp.bulb = { x: L.lamp.x, y: L.lamp.shadeBot - 18 * u };
  L.cup = { x: L.table.x + L.table.r * 0.5, y: L.table.y + L.table.r * 0.07, s: u };
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

// How dark the room is at a place: nothing by the lamp, deep in the corners.
function gloom(L, x, y) {
  const lp = L.lamp;
  const d = Math.hypot((x - lp.x) / (L.W * 0.9), (y - lp.shadeBot) / (L.H * 1.25));
  // the window keeps its own light
  const win = L.win;
  const wd = Math.hypot((x - win.x - win.w / 2) / (win.w * 1.1), (y - (win.y0 + win.y1) / 2) / ((win.y1 - win.y0) * 0.75));
  const open = 1 - 0.72 * Math.min(1, Math.max(0, 1.5 - wd));
  return Math.min(0.84, Math.max(0, d - 0.08) * 1.15) * open;
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
  paintGloom(ctx, L);
  vignette(ctx, W, H, 0.7);
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
  g.addColorStop(0, "#0c1c19");
  g.addColorStop(0.6, "#173029");
  g.addColorStop(1, "#112621");
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
  sky.addColorStop(0, "#060c1c");
  sky.addColorStop(0.7, "#12264a");
  sky.addColorStop(1, "#1c3a64");
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
  const moon = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  moon.addColorStop(0, "#fffdf2");
  moon.addColorStop(0.7, "#ece6d2");
  moon.addColorStop(1, "#c4c2bc");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  // its seas
  ctx.save();
  ctx.clip();
  for (const [dx, dy, r, a] of [
    [-0.3, -0.25, 0.34, 0.16],
    [0.25, -0.05, 0.28, 0.13],
    [-0.05, 0.4, 0.3, 0.12],
    [0.45, 0.45, 0.16, 0.1],
  ]) {
    soft(ctx, mx + dx * mr, my + dy * mr, r * mr, r * mr * 0.85, "90,96,110", a * 2.2);
  }
  ctx.restore();
  // thin cloud drifting under it
  soft(ctx, x + w * 0.4, my + mr * 2.2, w * 0.7, mr * 0.7, "150,170,210", 0.16);
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
    // heavy velvet: deep folds, each catching a little of the moon
    for (let i = 0; i <= 8; i++) {
      g.addColorStop(i / 8, i % 2 ? "#070e1e" : i % 4 ? "#16284a" : "#1c3158");
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = "#c9973c";
    ctx.fillRect(Math.min(ex, ex - side * w * 0.12) - w * 0.02, tie - H * 0.006, w * 0.16, H * 0.012);
  }
  ctx.fillStyle = "#c9973c";
  ctx.fillRect(x - w * 0.3, y0 - H * 0.045, w * 1.6, Math.max(2, H * 0.006));
}

// the floorboards running toward us, worn and waxed, a Persian rug before
// the case
function paintFloor(ctx, L) {
  const { W, H, vp, u } = L;
  const y0 = L.floorY;
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, "#1e1008");
  g.addColorStop(1, "#4a2a14");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H - y0);
  const k = (H - vp.y) / (y0 - vp.y);
  const rnd = lcg(271);
  // each board its own tone, its joints, its grain
  for (let i = -15; i < 15; i++) {
    const xa = vp.x + i * 60 * u;
    const xb = vp.x + (i + 1) * 60 * u;
    const tone = rnd();
    ctx.fillStyle = tone < 0.5 ? `rgba(0,0,0,${(0.04 + tone * 0.3).toFixed(2)})` : `rgba(255,190,130,${((tone - 0.5) * 0.1).toFixed(3)})`;
    polygon(ctx, [
      { x: xa, y: y0 },
      { x: xb, y: y0 },
      { x: vp.x + (xb - vp.x) * k, y: H },
      { x: vp.x + (xa - vp.x) * k, y: H },
    ]);
    ctx.fill();
    ctx.strokeStyle = "rgba(8,3,1,0.8)";
    ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    ctx.moveTo(xa, y0);
    ctx.lineTo(vp.x + (xa - vp.x) * k, H);
    ctx.stroke();
    // an end joint somewhere along it
    const f = 0.15 + rnd() * 0.7;
    const s = 1 + (k - 1) * f;
    const jy = vp.y + (y0 - vp.y) * s;
    ctx.beginPath();
    ctx.moveTo(vp.x + (xa - vp.x) * s, jy);
    ctx.lineTo(vp.x + (xb - vp.x) * s, jy);
    ctx.stroke();
    // grain
    ctx.strokeStyle = "rgba(10,4,1,0.22)";
    ctx.lineWidth = 0.7;
    for (let j = 0; j < 3; j++) {
      const xg = xa + (xb - xa) * (0.2 + rnd() * 0.6);
      ctx.beginPath();
      ctx.moveTo(xg, y0);
      ctx.lineTo(vp.x + (xg - vp.x) * k, H);
      ctx.stroke();
    }
  }
  // the rug, lying square to the case: a dark red field, borders, a medallion
  const at = (fx, fz) => {
    // fx across (-1..1), fz from the case (0) toward us (1)
    const s = 1.03 + (k - 1.03) * (0.06 + fz * 0.8);
    return { x: vp.x + fx * L.case.w * 0.4 * s, y: vp.y + (y0 - vp.y) * s };
  };
  const quad = (m) => [at(-1 + m, m * 1.2), at(1 - m, m * 1.2), at(1 - m, 1 - m * 1.2), at(-1 + m, 1 - m * 1.2)];
  const a = at(0, 0.5);
  soft(ctx, a.x, a.y + 4 * u, L.case.w * 0.5, (H - y0) * 0.5, "0,0,0", 0.45);
  // the fringe at its two ends
  ctx.strokeStyle = "rgba(214,196,160,0.5)";
  ctx.lineWidth = Math.max(0.8, u);
  for (const fz of [0, 1]) {
    for (let i = 0; i <= 60; i++) {
      const p = at(-1 + i / 30, fz);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (rnd() - 0.5) * 2 * u, p.y + (fz ? 7 : -4) * u);
      ctx.stroke();
    }
  }
  polygon(ctx, quad(0));
  ctx.fillStyle = "#3e0e12";
  ctx.fill();
  ctx.save();
  ctx.clip();
  polygon(ctx, quad(0.03));
  ctx.fillStyle = "#1c1c2c";
  ctx.fill();
  polygon(ctx, quad(0.075));
  ctx.fillStyle = "#5a1418";
  ctx.fill();
  // the border's running pattern
  ctx.fillStyle = "rgba(196,150,72,0.6)";
  for (let i = 0; i < 44; i++) {
    const f = -0.94 + (i / 43) * 1.88;
    for (const fz of [0.055, 0.945]) {
      const p = at(f, fz);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 3.2 * u, 1.3 * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 9; i++) {
    const fz = 0.12 + (i / 8) * 0.76;
    for (const f of [-0.955, 0.955]) {
      const p = at(f, fz);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 3.2 * u, 1.3 * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the field: a lattice of little flowers, a medallion in the middle
  ctx.fillStyle = "rgba(20,22,44,0.55)";
  for (let r = 0; r < 6; r++) {
    for (let cI = 0; cI < 22; cI++) {
      const p = at(-0.86 + (cI + (r % 2) * 0.5) * 0.08, 0.16 + r * 0.135);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4 * u, 1.6 * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const m = at(0, 0.5);
  const mrx = L.case.w * 0.15;
  const mry = (H - y0) * 0.2;
  ctx.fillStyle = "#1c1c2c";
  ctx.beginPath();
  ctx.moveTo(m.x - mrx, m.y);
  ctx.quadraticCurveTo(m.x - mrx * 0.4, m.y - mry * 0.9, m.x, m.y - mry);
  ctx.quadraticCurveTo(m.x + mrx * 0.4, m.y - mry * 0.9, m.x + mrx, m.y);
  ctx.quadraticCurveTo(m.x + mrx * 0.4, m.y + mry * 0.9, m.x, m.y + mry);
  ctx.quadraticCurveTo(m.x - mrx * 0.4, m.y + mry * 0.9, m.x - mrx, m.y);
  ctx.fill();
  ctx.strokeStyle = "rgba(196,150,72,0.7)";
  ctx.lineWidth = Math.max(1, 1.6 * u);
  ctx.stroke();
  ctx.fillStyle = "#7a2024";
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, mrx * 0.45, mry * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(196,150,72,0.7)";
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, mrx * 0.14, mry * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // the wool's nap, worn paler where feet have gone
  for (let i = 0; i < 500; i++) {
    const p = at(rnd() * 2 - 1, rnd());
    ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.14)" : "rgba(255,220,190,0.05)";
    ctx.fillRect(p.x, p.y, 2.4 * u, 0.9 * u);
  }
  soft(ctx, m.x - mrx * 1.2, m.y + mry * 0.6, mrx * 1.1, mry * 0.9, "220,200,180", 0.07);
  ctx.restore();
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
    // the shelf above keeps the lamp off the books' heads
    for (const bay of c.bays) {
      const sh = ctx.createLinearGradient(0, row.top, 0, row.top + row.h * 0.5);
      sh.addColorStop(0, "rgba(0,0,0,0.78)");
      sh.addColorStop(0.35, "rgba(0,0,0,0.34)");
      sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(bay.x0, row.top, bay.x1 - bay.x0, row.h * 0.5);
      // and the uprights shade the ends
      for (const [ex, dir] of [[bay.x0, 1], [bay.x1, -1]]) {
        const eg = ctx.createLinearGradient(ex, 0, ex + dir * 22 * u, 0);
        eg.addColorStop(0, "rgba(0,0,0,0.5)");
        eg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = eg;
        ctx.fillRect(Math.min(ex, ex + dir * 22 * u), row.top, 22 * u, row.h);
      }
    }
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
    // standing out, it shades the neighbours away from the lamp
    soft(ctx, b.x0 - 9 * u, row.bot - b.h * 0.45, 16 * u, b.h * 0.6, "0,0,0", 0.55);
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
  // each stands a little further in or out, so catches more or less light
  const set = 0.66 + rnd() * 0.34;
  const [r, g, bl] = b.col.map((v) => v * set);
  const spine = (x0, x1, top) => {
    const gr = ctx.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, rgb(r * 0.45, g * 0.45, bl * 0.45));
    gr.addColorStop(0.3, rgb(r * 1.15, g * 1.15, bl * 1.15));
    gr.addColorStop(0.7, rgb(r * 0.9, g * 0.9, bl * 0.9));
    gr.addColorStop(1, rgb(r * 0.35, g * 0.35, bl * 0.35));
    ctx.fillStyle = gr;
    ctx.fillRect(x0, top, x1 - x0, floor - top);
    const h = floor - top;
    // the dark between it and its neighbour, the worn head and tail
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x0, top, Math.max(1, u * 0.9), h);
    ctx.fillStyle = "rgba(255,225,190,0.16)";
    ctx.fillRect(x0 + 1, top, x1 - x0 - 2, Math.max(1, u * 1.2));
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x0, floor - h * 0.03, x1 - x0, h * 0.03);
    // scuffs in the cloth
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = rnd() < 0.5 ? "rgba(255,230,200,0.07)" : "rgba(0,0,0,0.14)";
      ctx.fillRect(x0 + rnd() * (x1 - x0) * 0.7, top + rnd() * h, (x1 - x0) * (0.2 + rnd() * 0.3), Math.max(0.8, h * 0.006));
    }
    // gilt bands, raised bands, a dark title patch with no title to read
    const style = Math.floor(rnd() * 3);
    ctx.fillStyle = `rgba(214,176,92,${(0.3 + rnd() * 0.4).toFixed(2)})`;
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
  card.addColorStop(0, "#b8a47c");
  card.addColorStop(0.35, "#e6d6b0");
  card.addColorStop(1, "#a8946c");
  g.fillStyle = card;
  // an old slip of paper, its top torn, a corner dog-eared
  const tear = lcg(60 + b.i);
  g.beginPath();
  g.moveTo(-mw / 2, 0);
  g.lineTo(-mw / 2, -markH * 0.96);
  for (let k = 1; k <= 6; k++) g.lineTo(-mw / 2 + (mw * k) / 7, -markH * (0.94 + tear() * 0.07));
  g.lineTo(mw / 2 - mw * 0.16, -markH);
  g.lineTo(mw / 2, -markH * 0.86);
  g.lineTo(mw / 2, 0);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(70,52,28,0.55)";
  g.lineWidth = 0.7;
  g.stroke();
  // foxing, and the shade of the pages it stands in
  for (let k = 0; k < 5; k++) soft(g, (tear() - 0.5) * mw * 0.8, -tear() * markH, mw * 0.14, mw * 0.12, "120,80,30", 0.22);
  const foot = g.createLinearGradient(0, -markH * 0.3, 0, 0);
  foot.addColorStop(0, "rgba(40,24,8,0)");
  foot.addColorStop(1, "rgba(40,24,8,0.45)");
  g.fillStyle = foot;
  g.fillRect(-mw / 2, -markH * 0.3, mw, markH * 0.3);
  g.fillStyle = "#2a1a0c";
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
  // old leather: its grain, the rubbed joints, raised bands at head and tail
  g.save();
  g.beginPath();
  g.roundRect(p0.x, p0.y, sw, sh, 2 * u);
  g.clip();
  const lr = lcg(90 + b.i);
  for (let k = 0; k < 260; k++) {
    g.fillStyle = lr() < 0.55 ? "rgba(0,0,0,0.16)" : "rgba(255,235,210,0.06)";
    g.fillRect(p0.x + lr() * sw, p0.y + lr() * sh, 1 + lr() * 2.2, 0.8 + lr() * 1.2);
  }
  for (const f of [0.14, 0.86]) {
    const by = p0.y + sh * f;
    const band = g.createLinearGradient(0, by - sh * 0.012, 0, by + sh * 0.014);
    band.addColorStop(0, "rgba(255,235,205,0.3)");
    band.addColorStop(0.5, "rgba(255,235,205,0.04)");
    band.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = band;
    g.fillRect(p0.x, by - sh * 0.012, sw, sh * 0.026);
  }
  g.fillStyle = "rgba(255,225,190,0.14)";
  g.fillRect(p0.x, p0.y, sw, Math.max(1, 1.4 * u));
  const worn = g.createLinearGradient(0, p1.y - sh * 0.05, 0, p1.y);
  worn.addColorStop(0, "rgba(0,0,0,0)");
  worn.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = worn;
  g.fillRect(p0.x, p1.y - sh * 0.05, sw, sh * 0.05);
  g.restore();
  g.fillStyle = "#c9a552";
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
  const gilt = g.createLinearGradient(-sh * 0.35, 0, sh * 0.35, 0);
  gilt.addColorStop(0, "#b8923e");
  gilt.addColorStop(0.5, GOLD);
  gilt.addColorStop(1, "#c9a552");
  g.fillStyle = gilt;
  g.fillText(b.title, 0, 0);
  g.restore();
  // the room's dark lies on it as on everything else, but less: it stands
  // out into the lamplight
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = `rgba(5,7,11,${(gloom(L, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2) * 0.55).toFixed(3)})`;
  g.fillRect(bx0, by0, W2, H2);
  g.globalCompositeOperation = "source-over";
  return { canvas: c, x: bx0, y: by0, w: W2, h: H2, cx: (p0.x + p1.x) / 2, cy: (p0.y + p1.y) / 2 };
}

// a tabby cat asleep on top of the case, a dark loaf of fur against the
// wall, the lamp finding only the edge of its back
function paintCat(ctx, L) {
  const { x, y, s } = L.cat;
  const k = s;
  const rnd = lcg(77);
  soft(ctx, x, y, 62 * k, 6 * k, "0,0,0", 0.6);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(x - 52 * k, y);
    ctx.bezierCurveTo(x - 58 * k, y - 16 * k, x - 44 * k, y - 26 * k, x - 30 * k, y - 27 * k);
    ctx.bezierCurveTo(x - 16 * k, y - 44 * k, x + 22 * k, y - 46 * k, x + 38 * k, y - 34 * k);
    ctx.bezierCurveTo(x + 54 * k, y - 26 * k, x + 54 * k, y - 8 * k, x + 48 * k, y);
    ctx.closePath();
  };
  body();
  const fur = ctx.createLinearGradient(x - 40 * k, y - 46 * k, x + 40 * k, y);
  fur.addColorStop(0, "#3a2a1e");
  fur.addColorStop(0.5, "#5a4028");
  fur.addColorStop(1, "#2a1c12");
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the tabby's bars, broken, following the curve of its side
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const bx = x - 22 * k + i * 8.5 * k;
    ctx.strokeStyle = "rgba(18,10,6,0.55)";
    ctx.lineWidth = (2 + rnd() * 2) * k;
    ctx.beginPath();
    ctx.moveTo(bx, y - 46 * k);
    ctx.quadraticCurveTo(bx + 7 * k, y - 28 * k, bx + (rnd() * 6 - 1) * k, y - (10 + rnd() * 8) * k);
    ctx.stroke();
  }
  // fur: short strokes lying back along the body
  for (let i = 0; i < 520; i++) {
    const fx = x - 54 * k + rnd() * 106 * k;
    const fy = y - rnd() * 46 * k;
    const len = (3 + rnd() * 4) * k;
    ctx.strokeStyle = rnd() < 0.5 ? "rgba(150,112,70,0.2)" : "rgba(10,6,4,0.26)";
    ctx.lineWidth = Math.max(0.5, 0.7 * k);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + len, fy + len * (0.25 + ((fx - x) / (60 * k)) * 0.5));
    ctx.stroke();
  }
  // the haunch folded under, the dark where the body meets the wood
  soft(ctx, x + 26 * k, y - 8 * k, 22 * k, 14 * k, "110,80,50", 0.25);
  soft(ctx, x, y + 2 * k, 60 * k, 9 * k, "0,0,0", 0.6);
  // the lamp along its back
  ctx.strokeStyle = "rgba(255,196,120,0.3)";
  ctx.lineWidth = 5 * k;
  ctx.beginPath();
  ctx.moveTo(x + 2 * k, y - 43 * k);
  ctx.bezierCurveTo(x + 24 * k, y - 46 * k, x + 46 * k, y - 34 * k, x + 51 * k, y - 14 * k);
  ctx.stroke();
  ctx.restore();
  // the head, laid on its paws, turned a little toward us; ears
  const hx = x - 38 * k;
  const hy = y - 13 * k;
  for (const ex of [-1, 1]) {
    ctx.fillStyle = "#33241a";
    ctx.beginPath();
    ctx.moveTo(hx + ex * 9 * k - 5 * k, hy - 9 * k);
    ctx.quadraticCurveTo(hx + ex * 12 * k, hy - 22 * k, hx + ex * 13.5 * k, hy - 22 * k);
    ctx.quadraticCurveTo(hx + ex * 15 * k, hy - 14 * k, hx + ex * 9 * k + 6 * k, hy - 6 * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(150,96,84,0.55)";
    ctx.beginPath();
    ctx.moveTo(hx + ex * 9.5 * k - 2 * k, hy - 10 * k);
    ctx.quadraticCurveTo(hx + ex * 12 * k, hy - 18 * k, hx + ex * 13 * k, hy - 18 * k);
    ctx.lineTo(hx + ex * 10 * k + 3 * k, hy - 9 * k);
    ctx.closePath();
    ctx.fill();
  }
  const head = ctx.createRadialGradient(hx + 4 * k, hy - 4 * k, 2 * k, hx, hy, 18 * k);
  head.addColorStop(0, "#6a4c30");
  head.addColorStop(1, "#2e2016");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 16 * k, 12.5 * k, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // the brow's stripes, the shut eyes, the muzzle and nose
  ctx.strokeStyle = "rgba(18,10,6,0.6)";
  ctx.lineWidth = 1.3 * k;
  for (const dx of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.moveTo(hx + dx * k, hy - 11.5 * k);
    ctx.lineTo(hx + dx * 0.6 * k, hy - 5.5 * k);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(10,6,4,0.85)";
  ctx.lineWidth = 1.1 * k;
  for (const ex of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + ex * 3.2 * k, hy - 0.6 * k);
    ctx.quadraticCurveTo(hx + ex * 6.4 * k, hy + 1.2 * k, hx + ex * 9.4 * k, hy - 1.6 * k);
    ctx.stroke();
  }
  soft(ctx, hx, hy + 5.5 * k, 7 * k, 4.5 * k, "196,176,150", 0.55);
  ctx.fillStyle = "#6a3c3a";
  ctx.beginPath();
  ctx.moveTo(hx - 1.8 * k, hy + 2.6 * k);
  ctx.lineTo(hx + 1.8 * k, hy + 2.6 * k);
  ctx.lineTo(hx, hy + 4.8 * k);
  ctx.closePath();
  ctx.fill();
  // whiskers, hardly seen
  ctx.strokeStyle = "rgba(230,220,200,0.3)";
  ctx.lineWidth = Math.max(0.5, 0.5 * k);
  for (const ex of [-1, 1]) {
    for (const dy of [-1, 1.5]) {
      ctx.beginPath();
      ctx.moveTo(hx + ex * 4 * k, hy + 5.5 * k);
      ctx.lineTo(hx + ex * 17 * k, hy + (5.5 + dy * 2) * k);
      ctx.stroke();
    }
  }
  // a forepaw under its chin
  const paw = ctx.createLinearGradient(0, y - 6 * k, 0, y);
  paw.addColorStop(0, "#6a4c30");
  paw.addColorStop(1, "#2a1c12");
  ctx.fillStyle = paw;
  ctx.beginPath();
  ctx.ellipse(hx + 13 * k, y - 3 * k, 10 * k, 3.6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
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
  g.strokeStyle = "#1c120a";
  g.lineWidth = 13 * k;
  g.stroke();
  const fur = g.createLinearGradient(0, 0, w, 0);
  fur.addColorStop(0, "#4a3422");
  fur.addColorStop(0.6, "#6a4a2c");
  fur.addColorStop(1, "#3a281a");
  g.strokeStyle = fur;
  g.lineWidth = 11.5 * k;
  path();
  g.stroke();
  // its rings
  g.strokeStyle = "rgba(16,9,5,0.6)";
  g.lineWidth = 11.5 * k;
  g.setLineDash([3.5 * k, 8 * k]);
  path();
  g.stroke();
  g.setLineDash([]);
  // the dark tip
  g.fillStyle = "#1c120a";
  g.beginPath();
  g.arc(w * 0.74, h - 18 * k, 5.2 * k, 0, Math.PI * 2);
  g.fill();
  return c;
}

// the little tripod table: a round mahogany top with a moulded edge on a
// turned column and three curved legs; on it two books, the lamp with its
// pleated shade, a cup of coffee on its saucer
function paintSideTable(ctx, L) {
  const { H, u } = L;
  const t = L.table;
  const k = 0.2; // how round the top looks from where we stand
  const floorY = L.floorY + H * 0.06;
  const edge = 7 * u; // the top's thickness
  const wood = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#1c0c05");
    g.addColorStop(0.3, "#6a3418");
    g.addColorStop(0.42, "#9a5a30");
    g.addColorStop(0.6, "#5a2a12");
    g.addColorStop(1, "#170a04");
    return g;
  };
  // its shadow on the boards, thrown wide by the lamp above
  soft(ctx, t.x, floorY + 2 * u, t.r * 1.5, t.r * 0.26, "0,0,0", 0.7);
  // the three legs: the far one first, then the two that come toward us
  const hub = floorY - 46 * u;
  const leg = (dx, footY, back) => {
    const fx = t.x + dx * t.r * 0.74;
    const w = (back ? 5 : 7) * u;
    ctx.beginPath();
    ctx.moveTo(t.x + dx * 4 * u, hub - 16 * u);
    ctx.bezierCurveTo(t.x + dx * t.r * 0.42, hub - 18 * u, t.x + dx * t.r * 0.5, footY - 12 * u, fx, footY - 5 * u);
    ctx.quadraticCurveTo(fx + dx * 7 * u, footY - 1 * u, fx + dx * 2 * u, footY);
    ctx.lineTo(fx - dx * 6 * u, footY);
    ctx.bezierCurveTo(t.x + dx * t.r * 0.42, footY - 6 * u, t.x + dx * t.r * 0.3, hub + w, t.x + dx * 3 * u, hub + 4 * u);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, hub - 18 * u, 0, footY);
    g.addColorStop(0, back ? "#3a1c0c" : "#7a4020");
    g.addColorStop(0.5, back ? "#2a1408" : "#4a2410");
    g.addColorStop(1, "#140803");
    ctx.fillStyle = g;
    ctx.fill();
    if (!back) {
      // the light along the top of its curve
      ctx.strokeStyle = "rgba(255,200,140,0.22)";
      ctx.lineWidth = Math.max(0.8, 1.3 * u);
      ctx.beginPath();
      ctx.moveTo(t.x + dx * 8 * u, hub - 15 * u);
      ctx.bezierCurveTo(t.x + dx * t.r * 0.42, hub - 17 * u, t.x + dx * t.r * 0.5, footY - 13 * u, fx - dx * 2 * u, footY - 6 * u);
      ctx.stroke();
    }
  };
  // the far leg, going straight back: seen end on, short
  ctx.fillStyle = "#1e0e06";
  ctx.beginPath();
  ctx.moveTo(t.x - 4 * u, hub - 10 * u);
  ctx.lineTo(t.x + 4 * u, hub - 10 * u);
  ctx.lineTo(t.x + 5 * u, floorY - 16 * u);
  ctx.lineTo(t.x - 5 * u, floorY - 16 * u);
  ctx.closePath();
  ctx.fill();
  leg(-1, floorY - 2 * u, false);
  leg(1, floorY + 3 * u, false);
  // the column, turned on the lathe: a ring under the top, a long vase, a
  // collar where the legs join
  const top = t.y + edge;
  const profile = [
    [0, 10],
    [0.04, 10],
    [0.07, 5],
    [0.12, 4.5],
    [0.16, 7],
    [0.2, 4],
    [0.34, 5],
    [0.56, 10.5],
    [0.7, 11],
    [0.8, 6.5],
    [0.84, 9],
    [0.88, 9],
    [0.92, 6],
    [1, 7],
  ];
  const colH = hub - top;
  ctx.beginPath();
  profile.forEach(([f, w], i) => {
    const y = top + colH * f;
    if (i) ctx.lineTo(t.x + w * u, y);
    else ctx.moveTo(t.x + w * u, y);
  });
  for (let i = profile.length - 1; i >= 0; i--) ctx.lineTo(t.x - profile[i][1] * u, top + colH * profile[i][0]);
  ctx.closePath();
  ctx.fillStyle = wood(t.x - 11 * u, t.x + 11 * u);
  ctx.fill();
  // the rings' shadows, the shade of the top over it
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  for (const f of [0.07, 0.2, 0.8, 0.92]) ctx.fillRect(t.x - 11 * u, top + colH * f, 22 * u, Math.max(1, 1.5 * u));
  const under = ctx.createLinearGradient(0, top, 0, top + colH * 0.4);
  under.addColorStop(0, "rgba(0,0,0,0.75)");
  under.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = under;
  ctx.fillRect(t.x - 12 * u, top, 24 * u, colH * 0.4);
  // the top: its underside's shadow, its moulded edge, the polished round
  soft(ctx, t.x, t.y + edge + 5 * u, t.r * 0.9, t.r * k * 0.8, "0,0,0", 0.6);
  ctx.fillStyle = "#170a04";
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + edge, t.r * 0.97, t.r * k * 0.97, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wood(t.x - t.r, t.x + t.r);
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + edge * 0.5, t.r, t.r * k, 0, 0, Math.PI);
  ctx.lineTo(t.x - t.r, t.y);
  ctx.lineTo(t.x + t.r, t.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = Math.max(0.8, u);
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + edge * 0.55, t.r * 0.995, t.r * k, 0, 0.05 * Math.PI, 0.95 * Math.PI);
  ctx.stroke();
  const tg = ctx.createRadialGradient(L.lamp.x, t.y - t.r * k * 0.2, t.r * 0.05, t.x, t.y, t.r);
  tg.addColorStop(0, "#b06a38");
  tg.addColorStop(0.45, "#7a3e1c");
  tg.addColorStop(1, "#3a1a0a");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, t.r, t.r * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the figure in the veneer, the lamp lying in the polish
  const rnd = lcg(633);
  ctx.lineWidth = Math.max(0.6, 0.8 * u);
  for (let i = 0; i < 16; i++) {
    const gy = t.y - t.r * k + rnd() * t.r * k * 2;
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(30,12,4,0.3)" : "rgba(255,200,140,0.08)";
    ctx.beginPath();
    ctx.moveTo(t.x - t.r, gy);
    ctx.bezierCurveTo(t.x - t.r * 0.3, gy + (rnd() - 0.5) * 5 * u, t.x + t.r * 0.3, gy + (rnd() - 0.5) * 5 * u, t.x + t.r, gy + (rnd() - 0.5) * 3 * u);
    ctx.stroke();
  }
  soft(ctx, L.lamp.x + t.r * 0.1, t.y + t.r * k * 0.15, t.r * 0.6, t.r * k * 0.55, "255,214,150", 0.4, "lighter");
  ctx.restore();
  ctx.strokeStyle = "rgba(255,214,160,0.35)";
  ctx.lineWidth = Math.max(0.8, 1.2 * u);
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, t.r * 0.995, t.r * k * 0.99, 0, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  // two books under the lamp, lying a little askew
  const lp = L.lamp;
  soft(ctx, lp.x + 4 * u, lp.base + 2 * u, t.r * 0.62, 6 * u, "0,0,0", 0.6);
  for (const [dy, w, dx, col] of [
    [0, 1, 0, [34, 62, 50]],
    [-10, 0.84, -3, [92, 26, 30]],
  ]) {
    const bw = t.r * w;
    const x0 = lp.x - bw / 2 + dx * u;
    const y0 = lp.base + dy * u - 10 * u;
    const cg = ctx.createLinearGradient(0, y0, 0, y0 + 10 * u);
    cg.addColorStop(0, rgb(col[0] * 1.5, col[1] * 1.5, col[2] * 1.5));
    cg.addColorStop(0.25, rgb(col[0], col[1], col[2]));
    cg.addColorStop(1, rgb(col[0] * 0.4, col[1] * 0.4, col[2] * 0.4));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(x0, y0, bw, 10 * u, [2 * u, 1, 1, 2 * u]);
    ctx.fill();
    // the page block showing at the fore-edge, the gilt line on the cover
    ctx.fillStyle = "#cdbb92";
    ctx.fillRect(x0 + bw - 5 * u, y0 + 2 * u, 4 * u, 6.4 * u);
    ctx.fillStyle = "rgba(60,44,20,0.4)";
    for (let i = 1; i < 4; i++) ctx.fillRect(x0 + bw - 5 * u, y0 + 2 * u + i * 1.6 * u, 4 * u, Math.max(0.5, 0.4 * u));
    ctx.fillStyle = "rgba(214,176,92,0.55)";
    ctx.fillRect(x0 + 5 * u, y0 + 4.6 * u, bw - 14 * u, Math.max(1, 0.9 * u));
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x0 + 3 * u, y0, Math.max(1, u), 10 * u);
  }
  // the lamp: a brass urn, its stem, the pleated shade
  const by = lp.base - 20 * u;
  const bg = ctx.createLinearGradient(lp.x - 18 * u, 0, lp.x + 18 * u, 0);
  bg.addColorStop(0, "#4a300a");
  bg.addColorStop(0.22, "#b88a34");
  bg.addColorStop(0.38, "#f6e0a0");
  bg.addColorStop(0.58, "#a87a2a");
  bg.addColorStop(1, "#3a2406");
  ctx.fillStyle = "#2a1a06";
  ctx.beginPath();
  ctx.ellipse(lp.x, by + 2.5 * u, 16 * u, 4.5 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(lp.x, by, 16 * u, 4.5 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(lp.x - 6 * u, by - 1 * u);
  ctx.bezierCurveTo(lp.x - 24 * u, by - 18 * u, lp.x - 17 * u, by - 40 * u, lp.x - 4 * u, by - 48 * u);
  ctx.lineTo(lp.x - 4 * u, by - 54 * u);
  ctx.lineTo(lp.x + 4 * u, by - 54 * u);
  ctx.lineTo(lp.x + 4 * u, by - 48 * u);
  ctx.bezierCurveTo(lp.x + 17 * u, by - 40 * u, lp.x + 24 * u, by - 18 * u, lp.x + 6 * u, by - 1 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(lp.x - 6.5 * u, by - 50 * u, 13 * u, 2.4 * u);
  ctx.fillRect(lp.x - 1.8 * u, lp.shadeBot, 3.6 * u, by - 54 * u - lp.shadeBot);
  soft(ctx, lp.x - 6 * u, by - 26 * u, 4 * u, 9 * u, "255,255,240", 0.55, "lighter");
  // the urn's own shade, under the lampshade
  const us = ctx.createLinearGradient(0, lp.shadeBot, 0, by - 30 * u);
  us.addColorStop(0, "rgba(40,20,0,0.5)");
  us.addColorStop(1, "rgba(40,20,0,0)");
  ctx.fillStyle = us;
  ctx.fillRect(lp.x - 5 * u, lp.shadeBot, 10 * u, by - 30 * u - lp.shadeBot);
  // the shade, lit from within: brightest round the bulb
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
  sg.addColorStop(0, "#a8702c");
  sg.addColorStop(0.5, "#f0cc88");
  sg.addColorStop(1, "#98601e");
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  soft(ctx, lp.x, sBot - 20 * u, 44 * u, 40 * u, "255,244,200", 0.75, "lighter");
  ctx.lineWidth = Math.max(1, u);
  for (let i = -9; i <= 9; i++) {
    ctx.strokeStyle = i % 2 ? "rgba(120,66,14,0.32)" : "rgba(255,240,200,0.14)";
    ctx.beginPath();
    ctx.moveTo(lp.x + (i / 9) * tw, sTop);
    ctx.lineTo(lp.x + (i / 9) * bw2, sBot + 5 * u);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#6a4418";
  ctx.fillRect(lp.x - tw - u, sTop - 2 * u, tw * 2 + 2 * u, 3.4 * u);
  ctx.beginPath();
  ctx.moveTo(lp.x - bw2, sBot);
  ctx.quadraticCurveTo(lp.x, sBot + 8 * u, lp.x + bw2, sBot);
  ctx.strokeStyle = "#6a4418";
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  // the cup of coffee on its saucer, a spoon laid by it
  const cp = L.cup;
  const q = 1.05 * u;
  soft(ctx, cp.x + 5 * q, cp.y + 2 * q, 24 * q, 5 * q, "0,0,0", 0.6);
  // the saucer: a rim, a well
  const china = ctx.createLinearGradient(cp.x - 20 * q, 0, cp.x + 20 * q, 0);
  china.addColorStop(0, "#8e8778");
  china.addColorStop(0.35, "#f6f0e2");
  china.addColorStop(0.6, "#d4ccba");
  china.addColorStop(1, "#7a7366");
  ctx.fillStyle = "#5e584c";
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y + 1.4 * q, 19 * q, 4.6 * q, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = china;
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y, 20 * q, 4.8 * q, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(176,140,60,0.8)";
  ctx.lineWidth = Math.max(0.6, 0.7 * q);
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y, 19.2 * q, 4.4 * q, 0, 0, Math.PI * 2);
  ctx.stroke();
  soft(ctx, cp.x, cp.y, 11 * q, 2.6 * q, "60,50,36", 0.4);
  // the spoon
  ctx.save();
  ctx.translate(cp.x - 10 * q, cp.y + 1.6 * q);
  ctx.rotate(-0.08);
  const silver = ctx.createLinearGradient(0, -1.5 * q, 0, 1.5 * q);
  silver.addColorStop(0, "#f4f2ea");
  silver.addColorStop(1, "#6e6c66");
  ctx.fillStyle = silver;
  ctx.fillRect(-9 * q, -0.6 * q, 14 * q, 1.2 * q);
  ctx.beginPath();
  ctx.ellipse(6 * q, 0, 3.4 * q, 1.5 * q, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the cup: a bowl narrowing to its foot, a gilt rim, the handle
  ctx.strokeStyle = "#cfc7b6";
  ctx.lineWidth = 2.4 * q;
  ctx.beginPath();
  ctx.ellipse(cp.x + 12.5 * q, cp.y - 9.5 * q, 5 * q, 4.6 * q, 0.2, -Math.PI * 0.55, Math.PI * 0.6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,250,0.5)";
  ctx.lineWidth = 0.7 * q;
  ctx.beginPath();
  ctx.ellipse(cp.x + 12.5 * q, cp.y - 9.5 * q, 5.6 * q, 5.2 * q, 0.2, -Math.PI * 0.5, 0);
  ctx.stroke();
  ctx.fillStyle = china;
  ctx.beginPath();
  ctx.moveTo(cp.x - 12 * q, cp.y - 16 * q);
  ctx.bezierCurveTo(cp.x - 12 * q, cp.y - 6 * q, cp.x - 8 * q, cp.y - 2 * q, cp.x - 5 * q, cp.y - 1.6 * q);
  ctx.lineTo(cp.x - 5.5 * q, cp.y - 0.2 * q);
  ctx.quadraticCurveTo(cp.x, cp.y + 1.2 * q, cp.x + 5.5 * q, cp.y - 0.2 * q);
  ctx.lineTo(cp.x + 5 * q, cp.y - 1.6 * q);
  ctx.bezierCurveTo(cp.x + 8 * q, cp.y - 2 * q, cp.x + 12 * q, cp.y - 6 * q, cp.x + 12 * q, cp.y - 16 * q);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  // a band of blue pattern round it, the shade under its belly
  ctx.strokeStyle = "rgba(40,64,120,0.7)";
  ctx.lineWidth = 0.8 * q;
  for (const dy of [-12.6, -9.8]) {
    ctx.beginPath();
    ctx.ellipse(cp.x, cp.y + dy * q, 12.4 * q, 2.4 * q, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(40,64,120,0.6)";
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cp.x + i * 2.7 * q, cp.y - 9 * q + Math.sqrt(Math.max(0, 1 - (i / 4.6) ** 2)) * 2.3 * q, 0.7 * q, 0, Math.PI * 2);
    ctx.fill();
  }
  const belly = ctx.createLinearGradient(0, cp.y - 8 * q, 0, cp.y);
  belly.addColorStop(0, "rgba(30,24,14,0)");
  belly.addColorStop(1, "rgba(30,24,14,0.5)");
  ctx.fillStyle = belly;
  ctx.fillRect(cp.x - 13 * q, cp.y - 8 * q, 26 * q, 9 * q);
  ctx.restore();
  // its mouth: the rim, the far wall inside, the coffee and the lamp in it
  ctx.fillStyle = "#e8e0ce";
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y - 16 * q, 12 * q, 3.2 * q, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1408";
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y - 15.4 * q, 10.6 * q, 2.5 * q, 0, 0, Math.PI * 2);
  ctx.fill();
  soft(ctx, cp.x - 3 * q, cp.y - 15.8 * q, 4.5 * q, 1 * q, "255,220,160", 0.6, "lighter");
  ctx.strokeStyle = "rgba(176,140,60,0.9)";
  ctx.lineWidth = Math.max(0.6, 0.7 * q);
  ctx.beginPath();
  ctx.ellipse(cp.x, cp.y - 16 * q, 12 * q, 3.2 * q, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// the dark of the room, away from the lamp; the moon keeps a little of the
// window's side
function paintGloom(ctx, L) {
  const { W, H, u } = L;
  const step = Math.max(6, Math.round(10 * u));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const a = gloom(L, x + step / 2, y + step / 2);
      if (a <= 0.004) continue;
      ctx.fillStyle = `rgba(5,7,11,${a.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
  const win = L.win;
  soft(ctx, win.x + win.w * 0.5, (win.y0 + win.y1) / 2, win.w * 1.1, (win.y1 - win.y0) * 0.6, MOON, 0.1, "lighter");
  // the moon along the near side of the case
  const c = L.case;
  const edge = ctx.createLinearGradient(c.x0, 0, c.x0 + c.side * 1.4, 0);
  edge.addColorStop(0, `rgba(${MOON},0.1)`);
  edge.addColorStop(1, `rgba(${MOON},0)`);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = edge;
  ctx.fillRect(c.x0, c.innerTop, c.side * 1.4, c.innerBot - c.innerTop);
  ctx.restore();
}

// the lamp's warm light over the room, the moon's from the window
function paintLight(ctx, L) {
  const { W, H, u } = L;
  const lp = L.lamp;
  // what gets out of the shade: a cone up the wall, a wider one down
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [y0, y1, w0, w1, a] of [
    [lp.shadeTop, lp.shadeTop - H * 0.5, 34 * u, 200 * u, 0.22],
    [lp.shadeBot, lp.shadeBot + H * 0.34, 58 * u, 240 * u, 0.2],
  ]) {
    const g2 = ctx.createLinearGradient(0, y0, 0, y1);
    g2.addColorStop(0, `rgba(${WARM},${a})`);
    g2.addColorStop(1, `rgba(${WARM},0)`);
    ctx.fillStyle = g2;
    ctx.filter = `blur(${Math.round(14 * u)}px)`;
    polygon(ctx, [
      { x: lp.x - w0, y: y0 },
      { x: lp.x + w0, y: y0 },
      { x: lp.x + w1, y: y1 },
      { x: lp.x - w1, y: y1 },
    ]);
    ctx.fill();
  }
  ctx.filter = "none";
  ctx.restore();
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
  g.addColorStop(0.5, `rgba(${MOON},0.16)`);
  g.addColorStop(1, `rgba(${MOON},0.07)`);
  ctx.fillStyle = g;
  ctx.filter = `blur(${Math.round(10 * L.u)}px)`;
  ctx.fill();
  ctx.filter = "none";
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
