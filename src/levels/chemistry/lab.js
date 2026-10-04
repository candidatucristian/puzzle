import { BOTTLES, ELEMENTS, cellOf, familyOf } from "./puzzle.js";
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

/** The old laboratory for CHEMISTRY, painted like the game's storybook
 *  nights: stone walls, a faded periodic table pinned up, a shelf of jars,
 *  and the workbench seen in perspective, lit by a Bunsen burner's blue flame
 *  and an oil lamp. Across the bench stand five graduated bottles of coloured
 *  liquid, each filled exactly to its etched atomic-number mark.
 *
 *  Painted once per screen size: the room; each bottle (they can be swirled);
 *  the flames; a bubble; a wisp of steam; the glow. */

const K = {
  room: "ch_room",
  glow: "ch_glow",
  blue: "ch_blue_flame",
  flame: "ch_flame",
  bubble: "ch_bubble",
  steam: "ch_steam",
};
const bottleKey = (i) => `ch_bottle_${i}`;
const WARM = "255,190,110";
const BLUE = "120,160,255";
const LABEL_FONT = 'Georgia, "Times New Roman", serif';

// Each bottle has ten readable scale divisions; the marked value and meniscus
// share one calibrated scale. The capacities keep the etched numbers legible
// while letting the liquid meet its own graduation.
const SHAPES = [
  { shape: "conical", h: 0.27, w: 0.16, liquid: [214, 230, 120], capacity: 10, scaleTop: 0.58 }, // fluorine
  { shape: "round", h: 0.31, w: 0.15, liquid: [140, 196, 250], capacity: 10, scaleTop: 0.55 }, // oxygen
  { shape: "jar", h: 0.23, w: 0.15, liquid: [34, 32, 36], capacity: 10, scaleTop: 0.66 }, // carbon
  { shape: "tall", h: 0.33, w: 0.1, liquid: [120, 255, 110], capacity: 100, scaleTop: 0.66, glow: true }, // uranium
  { shape: "beaker", h: 0.22, w: 0.14, liquid: [250, 214, 40], capacity: 20, scaleTop: 0.82 }, // sulfur
];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutLab(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, S: Math.min(W, H) };
  L.vp = { x: W / 2, y: H * 0.3 };
  L.topY = 0.63 * H;
  L.bench = { hw: Math.min(0.44 * W, 0.66 * H), nearS: 1, farS: 0.55, thick: 0.05 * H };
  const tw = L.bench.hw;
  // the poster: the table's 18 columns, 10 rows and a title, on a sheet
  const pw = Math.min(W * 0.42, H * 0.68);
  L.poster = { x0: W * 0.05, y0: H * 0.06, w: pw, h: pw * 0.66 };
  L.shelf = { x0: W * 0.62, x1: W * 0.95, y: H * 0.36 };
  // the five bottles across the middle of the bench
  L.bottles = BOTTLES.map((n, i) => {
    const s = 0.8;
    const base = P(L, (-0.64 + i * 0.32) * tw, L.topY, s);
    const sh = SHAPES[i];
    return { ...sh, n, i, s, x: base.x, y: base.y, h: sh.h * H * s, w: sh.w * H * s };
  });
  // the burner, front right, its tripod and flask; the oil lamp, front left
  const bp = P(L, 0.8 * tw, L.topY, 0.95);
  L.burner = { x: bp.x, y: bp.y, s: bp.s, u };
  L.burner.mouth = { x: bp.x, y: bp.y - 60 * u * bp.s };
  L.flask = { x: bp.x, y: bp.y - 128 * u * bp.s, r: 30 * u * bp.s };
  const lp = P(L, -0.84 * tw, L.topY, 0.94);
  L.lamp = { x: lp.x, y: lp.y, s: lp.s * u };
  L.lamp.flame = { x: lp.x, y: lp.y - 92 * u * lp.s };
  return L;
}

// a point on (or above) the bench: across x, down from the eye y, nearness s
function P(L, x, y, s) {
  return { x: L.vp.x + x * s, y: L.vp.y + y * s, s };
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintLab(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintWall(ctx, L);
  paintPoster(ctx, L);
  paintShelf(ctx, L);
  paintBench(ctx, L);
  paintFarThings(ctx, L);
  paintNearThings(ctx, L);
  paintLight(ctx, L);
  vignette(ctx, W, H, 0.55);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  const bottles = L.bottles.map((b) => {
    const art = paintBottle(L, b);
    addCanvasTexture(t, bottleKey(b.i), art.canvas);
    return { key: bottleKey(b.i), ...art };
  });
  addCanvasTexture(t, K.blue, paintBlueFlame());
  addCanvasTexture(t, K.flame, paintFlame());
  addCanvasTexture(t, K.bubble, paintBubble());
  addCanvasTexture(t, K.steam, paintSteam());
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, bottles };
}

export function releaseLabArt(textures) {
  for (const key of [...Object.values(K), ...BOTTLES.map((_, i) => bottleKey(i))]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// old stone, a timber beam along the top, the wall's foot behind the bench
function paintWall(ctx, L) {
  const { W, H, u } = L;
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  g.addColorStop(0, "#141c22");
  g.addColorStop(1, "#24302e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // the stones, in courses, each a little different
  const rnd = lcg(303);
  const ch = 46 * u;
  for (let row = 0, y = 0; y < H * 0.72; row++, y += ch) {
    let x = -(row % 2) * 40 * u;
    while (x < W) {
      const w = (70 + rnd() * 50) * u;
      const k = 0.8 + rnd() * 0.35;
      ctx.fillStyle = rgb(52 * k, 62 * k, 62 * k);
      ctx.beginPath();
      ctx.roundRect(x + 2 * u, y + 2 * u, w - 4 * u, ch - 4 * u, 6 * u);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(x + 4 * u, y + 3 * u, w - 8 * u, 3 * u);
      x += w;
    }
  }
  // the dark between the stones is shadow; soften the whole wall
  ctx.fillStyle = "rgba(10,14,18,0.35)";
  ctx.fillRect(0, 0, W, H);
  // a beam overhead
  const bg = ctx.createLinearGradient(0, 0, 0, H * 0.035);
  bg.addColorStop(0, "#140a04");
  bg.addColorStop(1, "#3a2210");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H * 0.035);
}

// The periodic table, pinned up long ago: the paper gone yellow, the colours
// washed out, stained by damp, a corner torn. Every element in its place.
function paintPoster(ctx, L) {
  const { u } = L;
  const p = L.poster;
  const { x0, y0, w, h } = p;
  ctx.save();
  ctx.translate(x0 + w / 2, y0 + h / 2);
  ctx.rotate(-0.012);
  ctx.translate(-w / 2, -h / 2);
  soft(ctx, w / 2 + 6 * u, h / 2 + 8 * u, w * 0.58, h * 0.6, "0,0,0", 0.5);
  // the sheet, its bottom right corner torn away
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.86);
  ctx.lineTo(w * 0.97, h * 0.9);
  ctx.lineTo(w * 0.955, h * 0.94);
  ctx.lineTo(w * 0.93, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const pg = ctx.createLinearGradient(0, 0, w, h);
  pg.addColorStop(0, "#d8ccaa");
  pg.addColorStop(1, "#b8a880");
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the title
  const m = w * 0.03;
  ctx.fillStyle = "rgba(60,48,30,0.55)";
  ctx.font = `700 ${Math.round(h * 0.055)}px ${LABEL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PERIODIC TABLE OF THE ELEMENTS", w / 2, h * 0.07);
  // the cells
  const cw = (w - m * 2) / 18;
  const top = h * 0.14;
  const rh = (h - top - m) / 9.4;
  const colours = {
    alkali: [232, 120, 100],
    earth: [240, 170, 100],
    transition: [230, 200, 120],
    post: [170, 200, 160],
    metalloid: [140, 200, 180],
    nonmetal: [150, 190, 230],
    halogen: [170, 160, 230],
    noble: [210, 150, 210],
    inner: [220, 170, 150],
  };
  for (let z = 1; z <= ELEMENTS.length; z++) {
    const { row, col } = cellOf(z);
    const ry = row <= 7 ? row - 1 : row - 1.6;
    const cx = m + (col - 1) * cw;
    const cy = top + ry * rh;
    const [r, g, b] = colours[familyOf(z)];
    ctx.fillStyle = `rgba(${r},${g},${b},0.42)`;
    ctx.fillRect(cx + 0.6, cy + 0.6, cw - 1.2, rh - 1.2);
    ctx.strokeStyle = "rgba(80,64,40,0.35)";
    ctx.lineWidth = 0.6;
    ctx.strokeRect(cx + 0.6, cy + 0.6, cw - 1.2, rh - 1.2);
    ctx.fillStyle = "rgba(40,30,20,0.55)";
    ctx.font = `${Math.max(4, Math.round(rh * 0.24))}px ${LABEL_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(String(z), cx + cw * 0.1, cy + rh * 0.08);
    ctx.fillStyle = "rgba(40,30,20,0.62)";
    ctx.font = `700 ${Math.max(5, Math.round(rh * 0.42))}px ${LABEL_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ELEMENTS[z - 1], cx + cw / 2, cy + rh * 0.6);
  }
  // the years on it: a wash of pale, the damp's brown tide marks
  ctx.fillStyle = "rgba(220,210,180,0.22)";
  ctx.fillRect(0, 0, w, h);
  const rnd = lcg(55);
  for (let i = 0; i < 7; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h;
    const sr = (0.08 + rnd() * 0.14) * w;
    soft(ctx, sx, sy, sr, sr * 0.8, "120,90,40", 0.22);
    ctx.strokeStyle = "rgba(120,86,40,0.25)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * 0.7, sr * 0.55, rnd(), 0, Math.PI * 2);
    ctx.stroke();
  }
  soft(ctx, w * 0.5, h * 0.5, w * 0.7, h * 0.7, "60,50,30", 0.0);
  ctx.restore();
  // the edge of the sheet, and the torn corner curling
  ctx.strokeStyle = "rgba(80,64,40,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // brass tacks
  for (const [tx, ty] of [
    [w * 0.02, h * 0.025],
    [w * 0.98, h * 0.025],
    [w * 0.02, h * 0.97],
  ]) {
    ctx.fillStyle = "#c9973c";
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,240,190,0.7)";
    ctx.beginPath();
    ctx.arc(tx - u, ty - u, 1.2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// a shelf on brackets, apothecary jars and a few old books on it
function paintShelf(ctx, L) {
  const { H, u } = L;
  const s = L.shelf;
  const y = s.y;
  // jars
  const rnd = lcg(919);
  let x = s.x0 + 10 * u;
  const contents = [
    [90, 140, 70],
    [170, 90, 50],
    [200, 190, 150],
    [60, 90, 130],
    [140, 60, 80],
    [110, 150, 120],
  ];
  let i = 0;
  while (x < s.x1 - 40 * u) {
    if (i === 3) {
      // a few books leaning
      for (let k = 0; k < 3; k++) {
        const bw = 12 * u;
        const bh = (60 + rnd() * 20) * u;
        ctx.fillStyle = ["#5a1e1e", "#2a3e5a", "#4a3a1e"][k];
        ctx.fillRect(x, y - bh, bw, bh);
        ctx.fillStyle = "rgba(232,196,106,0.5)";
        ctx.fillRect(x, y - bh + 8 * u, bw, 2 * u);
        x += bw + u;
      }
      x += 10 * u;
      i++;
      continue;
    }
    const jw = (34 + rnd() * 16) * u;
    const jh = (50 + rnd() * 40) * u;
    const [r, g, b] = contents[i % contents.length];
    soft(ctx, x + jw / 2, y, jw * 0.7, 4 * u, "0,0,0", 0.5);
    // the glass
    ctx.fillStyle = "rgba(160,200,200,0.16)";
    ctx.beginPath();
    ctx.roundRect(x, y - jh, jw, jh, 6 * u);
    ctx.fill();
    // what is in it
    ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;
    ctx.beginPath();
    ctx.roundRect(x + 3 * u, y - jh * 0.62, jw - 6 * u, jh * 0.62 - 3 * u, 4 * u);
    ctx.fill();
    // its lid and label
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(x - 2 * u, y - jh - 7 * u, jw + 4 * u, 8 * u);
    ctx.fillStyle = "rgba(230,215,180,0.75)";
    ctx.fillRect(x + jw * 0.2, y - jh * 0.45, jw * 0.6, jh * 0.18);
    ctx.fillStyle = "rgba(60,40,20,0.5)";
    ctx.fillRect(x + jw * 0.28, y - jh * 0.37, jw * 0.44, Math.max(1, u * 1.2));
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + 4 * u, y - jh + 4 * u, 3 * u, jh * 0.7);
    x += jw + 12 * u;
    i++;
  }
  // the board and its brackets
  const bg = ctx.createLinearGradient(0, y, 0, y + H * 0.02);
  bg.addColorStop(0, "#8a5a30");
  bg.addColorStop(1, "#3a200c");
  ctx.fillStyle = bg;
  ctx.fillRect(s.x0 - 10 * u, y, s.x1 - s.x0 + 20 * u, H * 0.02);
  ctx.fillStyle = "#1e120a";
  for (const bx of [s.x0 + 20 * u, s.x1 - 30 * u]) {
    ctx.beginPath();
    ctx.moveTo(bx, y + H * 0.02);
    ctx.lineTo(bx + 10 * u, y + H * 0.02);
    ctx.lineTo(bx + 10 * u, y + H * 0.08);
    ctx.closePath();
    ctx.fill();
  }
}

// the workbench: a thick oak top running away from us, worn and stained, its
// front edge
function paintBench(ctx, L) {
  const { W, H, u } = L;
  const b = L.bench;
  const y = L.topY;
  const nl = P(L, -b.hw, y, b.nearS);
  const nr = P(L, b.hw, y, b.nearS);
  const fl = P(L, -b.hw, y, b.farS);
  const fr = P(L, b.hw, y, b.farS);
  // the wall's foot and the floor beyond the bench's ends
  ctx.fillStyle = "#120c08";
  ctx.fillRect(0, fl.y - H * 0.02, W, H);
  // the top
  polygon(ctx, [fl, fr, nr, nl]);
  const g = ctx.createLinearGradient(0, fl.y, 0, nl.y);
  g.addColorStop(0, "#3a2414");
  g.addColorStop(1, "#6a4224");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rnd = lcg(515);
  const n = 8;
  for (let i = 1; i < n; i++) {
    const x = -b.hw + (2 * b.hw * i) / n;
    const a = P(L, x, y, b.nearS);
    const c = P(L, x, y, b.farS);
    ctx.strokeStyle = "rgba(18,8,2,0.55)";
    ctx.lineWidth = Math.max(1, u * 1.2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = (rnd() * 2 - 1) * b.hw;
    const a = P(L, x, y, b.nearS);
    const c = P(L, x + (rnd() - 0.5) * 20 * u, y, b.farS);
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(20,10,4,0.2)" : "rgba(255,210,160,0.06)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  }
  // old stains and a scorch mark
  for (let i = 0; i < 5; i++) {
    const p = P(L, (rnd() * 1.6 - 0.8) * b.hw, y, b.farS + rnd() * (b.nearS - b.farS));
    soft(ctx, p.x, p.y, 30 * u * p.s, 10 * u * p.s, i === 0 ? "10,6,2" : "60,30,10", 0.35);
  }
  ctx.restore();
  // the front edge
  const th = b.thick;
  const fg = ctx.createLinearGradient(0, nl.y, 0, nl.y + th);
  fg.addColorStop(0, "#a07048");
  fg.addColorStop(0.15, "#5a361a");
  fg.addColorStop(1, "#24140a");
  ctx.fillStyle = fg;
  ctx.fillRect(nl.x, nl.y, nr.x - nl.x, th);
  ctx.fillStyle = "#0e0804";
  ctx.fillRect(nl.x, nl.y + th, nr.x - nl.x, H);
}

// at the back of the bench: a rack of test tubes, a retort on its stand
function paintFarThings(ctx, L) {
  const { u } = L;
  const tw = L.bench.hw;
  // the test-tube rack
  const r = P(L, -0.5 * tw, L.topY, 0.6);
  const k = r.s * u;
  soft(ctx, r.x, r.y, 70 * k, 8 * k, "0,0,0", 0.6);
  ctx.fillStyle = "#6a4222";
  ctx.fillRect(r.x - 62 * k, r.y - 10 * k, 124 * k, 10 * k);
  ctx.fillRect(r.x - 62 * k, r.y - 46 * k, 124 * k, 8 * k);
  ctx.fillRect(r.x - 62 * k, r.y - 46 * k, 6 * k, 46 * k);
  ctx.fillRect(r.x + 56 * k, r.y - 46 * k, 6 * k, 46 * k);
  const tubes = [
    [230, 80, 90],
    [90, 170, 230],
    [240, 200, 80],
    [120, 220, 140],
    [200, 120, 220],
  ];
  tubes.forEach(([cr, cg, cb], i) => {
    const tx = r.x - 44 * k + i * 22 * k;
    const top = r.y - 82 * k;
    ctx.fillStyle = "rgba(200,230,240,0.2)";
    ctx.beginPath();
    ctx.roundRect(tx - 6 * k, top, 12 * k, 80 * k, [0, 0, 6 * k, 6 * k]);
    ctx.fill();
    const lvl = (0.35 + (i % 3) * 0.15) * 80 * k;
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.8)`;
    ctx.beginPath();
    ctx.roundRect(tx - 5 * k, top + 80 * k - lvl, 10 * k, lvl - 1 * k, [0, 0, 5 * k, 5 * k]);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(tx - 4 * k, top + 4 * k, 2 * k, 60 * k);
  });
  ctx.fillStyle = "#7a4c28";
  ctx.fillRect(r.x - 62 * k, r.y - 46 * k, 124 * k, 4 * k);
  // the retort: a glass belly on a ring, its long neck reaching out
  const rt = P(L, 0.3 * tw, L.topY, 0.58);
  const q = rt.s * u;
  soft(ctx, rt.x, rt.y, 50 * q, 6 * q, "0,0,0", 0.6);
  ctx.fillStyle = "#1e1a16";
  ctx.fillRect(rt.x - 36 * q, rt.y - 6 * q, 72 * q, 6 * q);
  ctx.fillRect(rt.x - 30 * q, rt.y - 150 * q, 5 * q, 146 * q);
  ctx.strokeStyle = "#2a2420";
  ctx.lineWidth = 4 * q;
  ctx.beginPath();
  ctx.ellipse(rt.x, rt.y - 70 * q, 34 * q, 8 * q, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rt.x - 28 * q, rt.y - 70 * q);
  ctx.lineTo(rt.x - 34 * q, rt.y - 70 * q);
  ctx.stroke();
  const belly = ctx.createRadialGradient(rt.x - 10 * q, rt.y - 108 * q, 4 * q, rt.x, rt.y - 98 * q, 40 * q);
  belly.addColorStop(0, "rgba(220,240,250,0.35)");
  belly.addColorStop(1, "rgba(150,190,210,0.18)");
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.arc(rt.x, rt.y - 98 * q, 36 * q, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(210,90,140,0.65)";
  ctx.beginPath();
  ctx.arc(rt.x, rt.y - 98 * q, 34 * q, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(190,225,240,0.4)";
  ctx.lineWidth = 9 * q;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(rt.x + 22 * q, rt.y - 124 * q);
  ctx.quadraticCurveTo(rt.x + 60 * q, rt.y - 150 * q, rt.x + 120 * q, rt.y - 108 * q);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 3 * q;
  ctx.beginPath();
  ctx.arc(rt.x - 6 * q, rt.y - 104 * q, 24 * q, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
}

// at the front: the oil lamp, a mortar and pestle, a notebook of sketches,
// the burner with its tripod and the flask boiling on it
function paintNearThings(ctx, L) {
  const { u } = L;
  const tw = L.bench.hw;
  // the oil lamp: a brass font, a glass chimney (its flame is the scene's)
  const lp = L.lamp;
  const k = lp.s;
  soft(ctx, lp.x + 10 * k, lp.y, 50 * k, 10 * k, "0,0,0", 0.6);
  const brass = ctx.createLinearGradient(lp.x - 30 * k, 0, lp.x + 30 * k, 0);
  brass.addColorStop(0, "#6a4810");
  brass.addColorStop(0.35, "#f0d080");
  brass.addColorStop(1, "#5a3a0c");
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.ellipse(lp.x, lp.y - 4 * k, 30 * k, 8 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(lp.x - 8 * k, lp.y - 6 * k);
  ctx.lineTo(lp.x + 8 * k, lp.y - 6 * k);
  ctx.lineTo(lp.x + 6 * k, lp.y - 26 * k);
  ctx.bezierCurveTo(lp.x + 34 * k, lp.y - 30 * k, lp.x + 34 * k, lp.y - 58 * k, lp.x + 10 * k, lp.y - 62 * k);
  ctx.lineTo(lp.x - 10 * k, lp.y - 62 * k);
  ctx.bezierCurveTo(lp.x - 34 * k, lp.y - 58 * k, lp.x - 34 * k, lp.y - 30 * k, lp.x - 6 * k, lp.y - 26 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(lp.x - 14 * k, lp.y - 70 * k, 28 * k, 8 * k);
  const glass = ctx.createLinearGradient(lp.x - 14 * k, 0, lp.x + 14 * k, 0);
  glass.addColorStop(0, "rgba(255,230,180,0.25)");
  glass.addColorStop(0.4, "rgba(255,250,230,0.45)");
  glass.addColorStop(1, "rgba(255,220,160,0.2)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(lp.x - 12 * k, lp.y - 70 * k);
  ctx.bezierCurveTo(lp.x - 22 * k, lp.y - 90 * k, lp.x - 10 * k, lp.y - 110 * k, lp.x - 9 * k, lp.y - 140 * k);
  ctx.lineTo(lp.x + 9 * k, lp.y - 140 * k);
  ctx.bezierCurveTo(lp.x + 10 * k, lp.y - 110 * k, lp.x + 22 * k, lp.y - 90 * k, lp.x + 12 * k, lp.y - 70 * k);
  ctx.closePath();
  ctx.fill();
  // a mortar and pestle
  const mp = P(L, -0.45 * tw, L.topY, 0.97);
  const m = mp.s * u;
  soft(ctx, mp.x + 6 * m, mp.y, 40 * m, 8 * m, "0,0,0", 0.6);
  const stone = ctx.createLinearGradient(mp.x - 30 * m, 0, mp.x + 30 * m, 0);
  stone.addColorStop(0, "#8a8478");
  stone.addColorStop(0.4, "#d8d0c0");
  stone.addColorStop(1, "#6a6458");
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(mp.x - 32 * m, mp.y - 30 * m);
  ctx.quadraticCurveTo(mp.x - 30 * m, mp.y, mp.x, mp.y);
  ctx.quadraticCurveTo(mp.x + 30 * m, mp.y, mp.x + 32 * m, mp.y - 30 * m);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4a4438";
  ctx.beginPath();
  ctx.ellipse(mp.x, mp.y - 30 * m, 32 * m, 8 * m, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(mp.x + 8 * m, mp.y - 32 * m);
  ctx.rotate(0.55);
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.roundRect(-5 * m, -46 * m, 10 * m, 50 * m, 5 * m);
  ctx.fill();
  ctx.restore();
  // the notebook: open, two pages of sketches of flasks and bubbles
  const nb = P(L, 0.1 * tw, L.topY, 0.96);
  const n = nb.s * u;
  ctx.save();
  ctx.translate(nb.x, nb.y);
  ctx.scale(1, 0.42);
  ctx.rotate(-0.08);
  soft(ctx, 8 * n, 10 * n, 120 * n, 80 * n, "0,0,0", 0.5);
  ctx.fillStyle = "#4a2a14";
  ctx.fillRect(-112 * n, -74 * n, 224 * n, 148 * n);
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? "#ece0c4" : "#f4ead2";
    ctx.fillRect(side < 0 ? -106 * n : 1 * n, -68 * n, 105 * n, 136 * n);
  }
  ctx.strokeStyle = "rgba(60,40,20,0.55)";
  ctx.lineWidth = 2 * n;
  // a flask sketched on the left page, little bubbles over it
  ctx.beginPath();
  ctx.moveTo(-62 * n, -40 * n);
  ctx.lineTo(-62 * n, -10 * n);
  ctx.lineTo(-84 * n, 40 * n);
  ctx.lineTo(-24 * n, 40 * n);
  ctx.lineTo(-46 * n, -10 * n);
  ctx.lineTo(-46 * n, -40 * n);
  ctx.stroke();
  for (const [bx, by, br] of [
    [-50, -52, 4],
    [-58, -60, 3],
    [-52, -66, 2],
  ]) {
    ctx.beginPath();
    ctx.arc(bx * n, by * n, br * n, 0, Math.PI * 2);
    ctx.stroke();
  }
  // scribbled notes on the right page, too faint to read
  ctx.strokeStyle = "rgba(60,40,20,0.3)";
  ctx.lineWidth = 2.5 * n;
  for (let i = 0; i < 7; i++) {
    const ly = -52 * n + i * 16 * n;
    ctx.beginPath();
    ctx.moveTo(12 * n, ly);
    for (let j = 0; j < 8; j++) ctx.lineTo((12 + j * 10 + 5) * n, ly + (j % 2 ? -3 : 3) * n);
    ctx.stroke();
  }
  ctx.restore();
  // the burner: a brass tube on a round foot, its gas tap and red hose
  const bu = L.burner;
  const b = bu.s * u;
  soft(ctx, bu.x + 10 * b, bu.y, 60 * b, 10 * b, "0,0,0", 0.6);
  ctx.strokeStyle = "#8a2a20";
  ctx.lineWidth = 8 * b;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bu.x + 14 * b, bu.y - 10 * b);
  ctx.bezierCurveTo(bu.x + 60 * b, bu.y, bu.x + 70 * b, bu.y - 50 * b, bu.x + 96 * b, bu.y - 60 * b);
  ctx.stroke();
  ctx.lineCap = "butt";
  const bb = ctx.createLinearGradient(bu.x - 28 * b, 0, bu.x + 28 * b, 0);
  bb.addColorStop(0, "#5a3a0c");
  bb.addColorStop(0.35, "#e8c070");
  bb.addColorStop(1, "#4a2e08");
  ctx.fillStyle = bb;
  ctx.beginPath();
  ctx.ellipse(bu.x, bu.y - 4 * b, 28 * b, 8 * b, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(bu.x - 7 * b, bu.y - 60 * b, 14 * b, 56 * b);
  ctx.fillStyle = "#2a1a08";
  ctx.fillRect(bu.x - 8 * b, bu.y - 22 * b, 16 * b, 7 * b);
  ctx.fillStyle = "rgba(255,240,200,0.4)";
  ctx.fillRect(bu.x - 4 * b, bu.y - 58 * b, 2.5 * b, 36 * b);
  // the tripod and its gauze
  const f = L.flask;
  const ty = f.y + f.r * 0.9;
  ctx.strokeStyle = "#1e1a16";
  ctx.lineWidth = 3.5 * b;
  for (const d of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(bu.x + d * 30 * b, ty);
    ctx.lineTo(bu.x + d * 52 * b, bu.y + (d === 0 ? 4 : -2) * b);
    ctx.stroke();
  }
  ctx.fillStyle = "#2a2622";
  ctx.beginPath();
  ctx.ellipse(bu.x, ty, 40 * b, 8 * b, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(160,150,140,0.5)";
  ctx.beginPath();
  ctx.ellipse(bu.x, ty - 1 * b, 34 * b, 6 * b, 0, 0, Math.PI * 2);
  ctx.fill();
  // the flask boiling on it
  const fg = ctx.createRadialGradient(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.1, f.x, f.y, f.r);
  fg.addColorStop(0, "rgba(220,240,250,0.45)");
  fg.addColorStop(1, "rgba(150,190,210,0.2)");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(f.x - f.r * 0.22, f.y - f.r * 2.1, f.r * 0.44, f.r * 1.3);
  ctx.fillStyle = "rgba(240,110,150,0.75)";
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r * 0.94, 0.05 * Math.PI, 0.95 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2.5 * b;
  ctx.beginPath();
  ctx.arc(f.x - f.r * 0.1, f.y - f.r * 0.05, f.r * 0.7, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  // a box of matches by it
  const mb = P(L, 0.6 * tw, L.topY, 0.99);
  const mm = mb.s * u;
  ctx.save();
  ctx.translate(mb.x, mb.y);
  ctx.scale(1, 0.5);
  ctx.rotate(0.3);
  ctx.fillStyle = "#c8302a";
  ctx.fillRect(-22 * mm, -14 * mm, 44 * mm, 28 * mm);
  ctx.fillStyle = "#f0d8a0";
  ctx.fillRect(-14 * mm, -8 * mm, 28 * mm, 16 * mm);
  ctx.restore();
}

// the lights: the oil lamp warm on the left, the burner blue on the right
function paintLight(ctx, L) {
  const { W, H } = L;
  soft(ctx, L.lamp.flame.x, L.lamp.flame.y, W * 0.32, H * 0.36, WARM, 0.22, "lighter");
  soft(ctx, W * 0.36, H * 0.8, W * 0.36, H * 0.14, WARM, 0.18, "lighter");
  soft(ctx, L.burner.mouth.x, L.burner.mouth.y, W * 0.22, H * 0.25, BLUE, 0.14, "lighter");
  // the poster in the lamp's light, the bottles too
  soft(ctx, L.poster.x0 + L.poster.w * 0.4, L.poster.y0 + L.poster.h * 0.6, L.poster.w * 0.6, L.poster.h * 0.6, WARM, 0.1, "lighter");
  soft(ctx, W * 0.5, H * 0.66, W * 0.4, H * 0.14, WARM, 0.1, "lighter");
}

// One of the five bottles, rendered as a small glass object with a calibrated
// meniscus and etched scale. Its canvas origin is the middle of its foot.
function paintBottle(L, b) {
  const { u } = L;
  const R = 2;
  const w = b.w;
  const h = b.h;
  const cw = w * 1.4;
  const ch = h * 1.12;
  const c = makeCanvas(cw * R, ch * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const ox = cw / 2; // the foot's middle
  const oy = ch - h * 0.04;
  g.translate(ox, oy);
  const [lr, lg, lb] = b.liquid;
  const scaleBottom = -h * 0.08;
  const scaleTop = -h * b.scaleTop;
  const level = scaleBottom + (scaleTop - scaleBottom) * (b.n / b.capacity);
  const graduationY = (value) =>
    scaleBottom + (scaleTop - scaleBottom) * (value / b.capacity);
  const halfWidthAt = (y) => {
    const depth = -y / h;
    if (b.shape === "conical") {
      return w * (depth <= 0.72 ? 0.5 - (0.38 * depth) / 0.72 : 0.12);
    }
    if (b.shape === "round") {
      const r = w * 0.5;
      const cy = -(r + h * 0.05);
      const d = y - cy;
      return Math.abs(d) <= r ? Math.sqrt(r * r - d * d) : w * 0.1;
    }
    if (b.shape === "jar") {
      return w * (depth <= 0.72 ? 0.46 : 0.46 - ((depth - 0.72) / 0.1) * 0.18);
    }
    if (b.shape === "tall") {
      return w * (depth <= 0.66 ? 0.5 : 0.5 - ((depth - 0.66) / 0.14) * 0.32);
    }
    return w * 0.5;
  };
  const topY = b.shape === "jar" ? -h * 0.82 : -h * (b.shape === "tall" ? 0.95 : 0.94);
  const neck = b.shape === "jar" ? w * 0.3 : b.shape === "beaker" ? 0 : w * (b.shape === "tall" ? 0.19 : 0.12);
  const k = 0.18;
  // the shape of the glass, foot at 0, rising to -h
  const outline = () => {
    g.beginPath();
    if (b.shape === "conical") {
      g.moveTo(-w * 0.5, 0);
      g.lineTo(-w * 0.12, -h * 0.72);
      g.lineTo(-w * 0.12, -h * 0.94);
      g.lineTo(w * 0.12, -h * 0.94);
      g.lineTo(w * 0.12, -h * 0.72);
      g.lineTo(w * 0.5, 0);
    } else if (b.shape === "round") {
      // a round belly sitting in its cork ring, a long neck
      const r = w * 0.5;
      const cy = -(r + h * 0.05);
      const nw = w * 0.1;
      const a = Math.asin(nw / r);
      g.moveTo(-nw, -h * 0.94);
      g.arc(0, cy, r, -Math.PI / 2 - a, -Math.PI / 2 + a, true);
      g.lineTo(nw, -h * 0.94);
    } else if (b.shape === "jar") {
      g.moveTo(-w * 0.46, -h * 0.04);
      g.quadraticCurveTo(-w * 0.5, -h * 0.4, -w * 0.46, -h * 0.72);
      g.quadraticCurveTo(-w * 0.44, -h * 0.8, -w * 0.28, -h * 0.82);
      g.lineTo(w * 0.28, -h * 0.82);
      g.quadraticCurveTo(w * 0.44, -h * 0.8, w * 0.46, -h * 0.72);
      g.quadraticCurveTo(w * 0.5, -h * 0.4, w * 0.46, -h * 0.04);
      g.quadraticCurveTo(0, h * 0.02, -w * 0.46, -h * 0.04);
    } else if (b.shape === "tall") {
      g.moveTo(-w * 0.5, -h * 0.03);
      g.lineTo(-w * 0.5, -h * 0.66);
      g.quadraticCurveTo(-w * 0.5, -h * 0.76, -w * 0.18, -h * 0.8);
      g.lineTo(-w * 0.18, -h * 0.95);
      g.lineTo(w * 0.18, -h * 0.95);
      g.lineTo(w * 0.18, -h * 0.8);
      g.quadraticCurveTo(w * 0.5, -h * 0.76, w * 0.5, -h * 0.66);
      g.lineTo(w * 0.5, -h * 0.03);
      g.quadraticCurveTo(0, h * 0.02, -w * 0.5, -h * 0.03);
    } else {
      g.moveTo(-w * 0.5, -h * 0.03);
      g.lineTo(-w * 0.5, -h * 0.94);
      g.lineTo(-w * 0.56, -h * 0.98);
      g.lineTo(w * 0.42, -h * 0.98);
      g.lineTo(w * 0.5, -h * 0.94);
      g.lineTo(w * 0.5, -h * 0.03);
      g.quadraticCurveTo(0, h * 0.02, -w * 0.5, -h * 0.03);
    }
    g.closePath();
  };
  // The bottle's cast shadow and its turned, thick glass foot.
  soft(g, w * 0.12, 0, w * 0.6, w * 0.1, "0,0,0", 0.6);
  if (b.shape === "round") {
    const ring = g.createLinearGradient(-w * 0.3, 0, w * 0.3, 0);
    ring.addColorStop(0, "#7a4a24");
    ring.addColorStop(0.4, "#c89058");
    ring.addColorStop(1, "#6a3c1c");
    g.fillStyle = ring;
    g.beginPath();
    g.ellipse(0, -h * 0.03, w * 0.32, h * 0.035, 0, 0, Math.PI * 2);
    g.fill();
  }
  // The glass body: a dark silhouette under a cool, curved reflection.
  outline();
  g.fillStyle = "rgba(8,18,24,0.42)";
  g.fill();
  outline();
  const glass = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  glass.addColorStop(0, "rgba(115,165,180,0.42)");
  glass.addColorStop(0.12, "rgba(245,255,255,0.32)");
  glass.addColorStop(0.28, "rgba(205,235,242,0.09)");
  glass.addColorStop(0.68, "rgba(190,225,236,0.06)");
  glass.addColorStop(0.88, "rgba(225,248,255,0.25)");
  glass.addColorStop(1, "rgba(75,120,140,0.42)");
  g.fillStyle = glass;
  g.fill();
  // Colored liquid with a shaded body and a curved, glossy meniscus.
  g.save();
  outline();
  g.clip();
  const lq = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  lq.addColorStop(0, rgb(lr * 0.36, lg * 0.36, lb * 0.36));
  lq.addColorStop(0.16, rgb(lr * 0.72, lg * 0.72, lb * 0.72));
  lq.addColorStop(0.46, rgb(Math.min(255, lr * 1.08), Math.min(255, lg * 1.08), Math.min(255, lb * 1.08)));
  lq.addColorStop(0.82, rgb(lr * 0.78, lg * 0.78, lb * 0.78));
  lq.addColorStop(1, rgb(lr * 0.34, lg * 0.34, lb * 0.34));
  g.globalAlpha = b.glow ? 0.92 : 0.82;
  g.fillStyle = lq;
  g.fillRect(-w, level, w * 2, h);
  g.globalAlpha = 1;
  const meniscus = g.createLinearGradient(0, level - w * 0.1, 0, level + w * 0.12);
  meniscus.addColorStop(0, rgb(Math.min(255, lr * 1.3 + 35), Math.min(255, lg * 1.3 + 35), Math.min(255, lb * 1.3 + 35)));
  meniscus.addColorStop(0.45, rgb(Math.min(255, lr * 1.08 + 14), Math.min(255, lg * 1.08 + 14), Math.min(255, lb * 1.08 + 14)));
  meniscus.addColorStop(1, rgb(lr * 0.46, lg * 0.46, lb * 0.46));
  g.fillStyle = meniscus;
  g.beginPath();
  g.ellipse(0, level, halfWidthAt(level) * 0.94, w * k * 0.56, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.58)";
  g.lineWidth = Math.max(0.7, w * 0.012);
  g.beginPath();
  g.ellipse(-w * 0.015, level - w * 0.006, halfWidthAt(level) * 0.72, w * k * 0.27, 0, Math.PI * 1.08, Math.PI * 1.88);
  g.stroke();
  g.restore();
  // Millilitre-style divisions are etched into the glass; the emphasized
  // graduation is the same height as the liquid surface.
  const markFont = Math.max(6.5, Math.min(11.5, w * 0.17));
  g.save();
  outline();
  g.clip();
  g.textAlign = "right";
  g.textBaseline = "middle";
  g.font = `700 ${markFont}px ${LABEL_FONT}`;
  g.lineCap = "round";
  const divisions = Array.from({ length: 21 }, (_, i) => ({
    value: (b.capacity * i) / 20,
    major: i % 2 === 0,
  }));
  if (!divisions.some(({ value }) => Math.abs(value - b.n) < 0.001)) {
    divisions.push({ value: b.n, major: true });
  }
  divisions.sort((a, b) => a.value - b.value);
  for (const { value } of divisions) {
    const y = graduationY(value);
    const isTarget = Math.abs(value - b.n) < 0.001;
    const major = isTarget || divisions.some((mark) => mark.value === value && mark.major);
    const edge = halfWidthAt(y) * 0.78;
    const length = w * (major ? 0.16 : 0.09);
    g.strokeStyle = isTarget ? "rgba(255,255,235,0.98)" : major ? "rgba(221,246,250,0.78)" : "rgba(221,246,250,0.56)";
    g.lineWidth = isTarget ? Math.max(1.4, w * 0.024) : major ? Math.max(0.9, w * 0.012) : Math.max(0.7, w * 0.009);
    g.beginPath();
    g.moveTo(edge - length, y);
    g.lineTo(edge, y);
    g.stroke();
    if (isTarget) {
      const tx = edge - length - w * 0.025;
      g.lineWidth = Math.max(1, markFont * 0.15);
      g.strokeStyle = "rgba(8,20,24,0.78)";
      g.strokeText(String(b.n), tx, y);
      g.fillStyle = "rgba(255,255,238,0.98)";
      g.fillText(String(b.n), tx, y);
    }
  }
  g.restore();
  // The double glass edge and heavy base catch the lamp like a real vessel.
  outline();
  g.strokeStyle = "rgba(14,28,34,0.82)";
  g.lineWidth = Math.max(1.8, 2.2 * u);
  g.stroke();
  outline();
  g.strokeStyle = "rgba(220,245,250,0.7)";
  g.lineWidth = Math.max(0.8, 1.15 * u);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.52)";
  g.lineWidth = Math.max(1.2, w * 0.035);
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-w * 0.34, -h * 0.12);
  g.bezierCurveTo(-w * 0.39, -h * 0.28, -w * 0.33, -h * 0.46, -w * 0.36, -h * 0.61);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = Math.max(0.7, w * 0.012);
  g.beginPath();
  g.moveTo(-w * 0.22, -h * 0.16);
  g.quadraticCurveTo(-w * 0.29, -h * 0.36, -w * 0.23, -h * 0.49);
  g.stroke();
  g.lineCap = "butt";
  g.beginPath();
  g.ellipse(0, -h * 0.015, w * 0.43, h * 0.026, 0, 0, Math.PI * 2);
  g.strokeStyle = "rgba(238,255,255,0.72)";
  g.lineWidth = Math.max(1, w * 0.018);
  g.stroke();
  const lipWidth = neck || w * 0.5;
  g.beginPath();
  g.ellipse(0, topY, lipWidth, h * 0.018, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(12,24,30,0.5)";
  g.fill();
  g.strokeStyle = "rgba(232,252,255,0.75)";
  g.lineWidth = Math.max(0.8, w * 0.015);
  g.stroke();
  // Corks and stoppers have a shaded profile and fine natural ridges.
  if (neck) {
    if (b.shape === "jar") {
      const stopper = g.createLinearGradient(-neck, 0, neck, 0);
      stopper.addColorStop(0, "rgba(105,145,155,0.65)");
      stopper.addColorStop(0.45, "rgba(225,248,248,0.72)");
      stopper.addColorStop(1, "rgba(85,125,140,0.68)");
      g.fillStyle = stopper;
      g.beginPath();
      g.ellipse(0, topY + h * 0.01, neck * 1.05, neck * 0.25, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(0, topY - h * 0.07, neck * 0.42, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.76)";
      g.stroke();
    } else {
      const cork = g.createLinearGradient(-neck, 0, neck, 0);
      cork.addColorStop(0, "#654021");
      cork.addColorStop(0.28, "#a87543");
      cork.addColorStop(0.5, "#d7ad75");
      cork.addColorStop(0.72, "#a16e3e");
      cork.addColorStop(1, "#513118");
      g.fillStyle = cork;
      g.beginPath();
      g.moveTo(-neck * 1.15, topY - h * 0.06);
      g.quadraticCurveTo(0, topY - h * 0.1, neck * 1.15, topY - h * 0.06);
      g.lineTo(neck * 0.92, topY + h * 0.045);
      g.quadraticCurveTo(0, topY + h * 0.075, -neck * 0.92, topY + h * 0.045);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(55,30,14,0.6)";
      g.lineWidth = Math.max(0.6, u * 0.8);
      for (const x of [-0.42, 0, 0.42]) {
        g.beginPath();
        g.moveTo(neck * x, topY - h * 0.045);
        g.lineTo(neck * x * 0.84, topY + h * 0.035);
        g.stroke();
      }
    }
  }
  // where the liquid is (for bubbles), from the foot
  const inner = b.shape === "conical" ? 0.3 : b.shape === "round" ? 0.32 : 0.36;
  return {
    canvas: c,
    ox: ox / cw,
    oy: oy / ch,
    x: b.x,
    y: b.y,
    liquid: { x0: -w * inner, x1: w * inner, top: level, bot: -h * 0.06 },
    glow: !!b.glow,
    colour: b.liquid,
  };
}

// the Bunsen burner's flame: a pale blue inner cone in a deeper blue one;
// origin at its foot
function paintBlueFlame() {
  const w = 40;
  const h = 100;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const cone = (k, col) => {
    g.beginPath();
    g.moveTo(w / 2, h * (1 - k));
    g.bezierCurveTo(w * (0.5 + 0.35 * Math.min(1, k + 0.2)), h * (1 - k * 0.55), w * 0.82, h * 0.96, w / 2, h);
    g.bezierCurveTo(w * 0.18, h * 0.96, w * (0.5 - 0.35 * Math.min(1, k + 0.2)), h * (1 - k * 0.55), w / 2, h * (1 - k));
    g.closePath();
    g.fillStyle = col;
    g.fill();
  };
  cone(0.98, "rgba(60,70,255,0.45)");
  cone(0.8, "rgba(60,120,255,0.7)");
  cone(0.42, "rgba(140,200,255,0.9)");
  return c;
}

// an oil lamp's flame: white at the heart, gold, a touch of orange
function paintFlame() {
  const w = 32;
  const h = 72;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const path = (k) => {
    g.beginPath();
    g.moveTo(w / 2, h * (0.02 + (1 - k) * 0.3));
    g.bezierCurveTo(w * (0.5 + 0.42 * k), h * 0.45, w * (0.5 + 0.38 * k), h * 0.98, w / 2, h * 0.98);
    g.bezierCurveTo(w * (0.5 - 0.38 * k), h * 0.98, w * (0.5 - 0.42 * k), h * 0.45, w / 2, h * (0.02 + (1 - k) * 0.3));
    g.closePath();
  };
  path(1);
  const og = g.createLinearGradient(0, 0, 0, h);
  og.addColorStop(0, "rgba(255,120,40,0)");
  og.addColorStop(0.35, "rgba(255,150,50,0.85)");
  og.addColorStop(1, "rgba(255,190,90,0.95)");
  g.fillStyle = og;
  g.fill();
  path(0.6);
  g.fillStyle = "rgba(255,236,170,0.95)";
  g.fill();
  path(0.3);
  g.fillStyle = "#fffdf4";
  g.fill();
  return c;
}

// a bubble: a ring of light with a glint
function paintBubble() {
  const c = makeCanvas(24, 24);
  const g = c.getContext("2d");
  g.strokeStyle = "rgba(255,255,255,0.85)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(12, 12, 9, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.25)";
  g.fill();
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(9, 8, 2.2, 0, Math.PI * 2);
  g.fill();
  return c;
}

// a wisp of steam
function paintSteam() {
  const c = makeCanvas(40, 120);
  const g = c.getContext("2d");
  g.lineCap = "round";
  for (const [lw, a] of [
    [12, 0.08],
    [6, 0.16],
  ]) {
    g.strokeStyle = `rgba(240,245,255,${a})`;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(20, 115);
    g.bezierCurveTo(6, 85, 34, 60, 18, 30);
    g.quadraticCurveTo(10, 15, 22, 4);
    g.stroke();
  }
  return c;
}
