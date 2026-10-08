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
 *  liquid, each with a fine printed scale; a magnifying glass lies on its
 *  cloth at the front, to read them by.
 *
 *  Painted once per screen size: the room; each bottle, and again as the
 *  lens shows it; the magnifying glass, lying and held; the flames; a
 *  bubble; a wisp of steam; the glow. */

const K = {
  room: "ch_room",
  glow: "ch_glow",
  blue: "ch_blue_flame",
  flame: "ch_flame",
  bubble: "ch_bubble",
  steam: "ch_steam",
  loupe: "ch_loupe",
  lens: "ch_lens",
};
const bottleKey = (i) => `ch_bottle_${i}`;
const zoomKey = (i) => `ch_bottle_zoom_${i}`;
// how much the magnifying glass enlarges
const ZOOM = 3.2;
const WARM = "255,190,110";
const BLUE = "120,160,255";
const LABEL_FONT = 'Georgia, "Times New Roman", serif';

// Each vessel's scale: its capacity, the size of one division, and how many
// divisions make a middling and a long (numbered) one. The liquid stands at
// the bottle's own number.
const SHAPES = [
  { shape: "conical", h: 0.27, w: 0.16, liquid: [214, 230, 120], capacity: 10, step: 0.5, mid: 2, major: 4, scaleTop: 0.58 }, // fluorine
  { shape: "round", h: 0.31, w: 0.15, liquid: [140, 196, 250], capacity: 10, step: 0.5, mid: 2, major: 4, scaleTop: 0.46 }, // oxygen
  { shape: "jar", h: 0.23, w: 0.15, liquid: [34, 32, 36], capacity: 10, step: 0.5, mid: 2, major: 4, scaleTop: 0.66 }, // carbon
  { shape: "tall", h: 0.4, w: 0.1, liquid: [120, 255, 110], capacity: 100, step: 1, mid: 5, major: 10, scaleTop: 0.74, glow: true }, // uranium
  { shape: "beaker", h: 0.22, w: 0.14, liquid: [250, 214, 40], capacity: 20, step: 1, mid: 5, major: 5, scaleTop: 0.82 }, // sulfur
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
  L.lamp = { x: lp.x, y: lp.y, s: lp.s * u * 1.08 };
  L.lamp.flame = { x: lp.x, y: lp.y - 96 * L.lamp.s };
  // the magnifying glass on its cloth at the front, and the lens in the hand
  const mg = P(L, 0.08 * tw, L.topY, 0.955);
  L.loupe = { x: mg.x, y: mg.y, n: mg.s * u, r: 92 * u, zoom: ZOOM };
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
  // the chart keeps a little of the lamp, enough to be read in the gloom
  ctx.globalAlpha = 0.42;
  paintPoster(ctx, L);
  ctx.globalAlpha = 1;
  vignette(ctx, W, H, 0.55);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  const bottles = L.bottles.map((b) => {
    const art = paintBottle(L, b, 2);
    addCanvasTexture(t, bottleKey(b.i), art.canvas);
    // the same vessel as the lens shows it
    addCanvasTexture(t, zoomKey(b.i), paintBottle(L, b, ZOOM).canvas);
    return { key: bottleKey(b.i), zoomKey: zoomKey(b.i), ...art };
  });
  const loupe = paintLoupe(L);
  addCanvasTexture(t, K.loupe, loupe.canvas);
  addCanvasTexture(t, K.lens, paintLens(L.loupe.r));
  addCanvasTexture(t, K.blue, paintBlueFlame());
  addCanvasTexture(t, K.flame, paintFlame());
  addCanvasTexture(t, K.bubble, paintBubble());
  addCanvasTexture(t, K.steam, paintSteam());
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, bottles, loupe };
}

export function releaseLabArt(textures) {
  for (const key of [...Object.values(K), ...BOTTLES.flatMap((_, i) => [bottleKey(i), zoomKey(i)])]) {
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

// at the front: the oil lamp, a mortar and pestle, the magnifying glass's cloth,
// the burner with its tripod and the flask boiling on it
function paintNearThings(ctx, L) {
  const { u } = L;
  const tw = L.bench.hw;
  // the oil lamp: a brass foot and stem, a round font of oil, the burner's
  // gallery and wick wheel, a tall glass chimney (its flame is the scene's)
  const lp = L.lamp;
  const k = lp.s;
  soft(ctx, lp.x + 14 * k, lp.y + 2 * k, 62 * k, 12 * k, "0,0,0", 0.65);
  const brass = ctx.createLinearGradient(lp.x - 32 * k, 0, lp.x + 32 * k, 0);
  brass.addColorStop(0, "#4a300a");
  brass.addColorStop(0.2, "#b88a34");
  brass.addColorStop(0.36, "#fbe6a8");
  brass.addColorStop(0.55, "#b4842e");
  brass.addColorStop(1, "#3e2606");
  // the foot: a stepped disc
  ctx.fillStyle = "#2e1c06";
  ctx.beginPath();
  ctx.ellipse(lp.x, lp.y - 1 * k, 32 * k, 8.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.ellipse(lp.x, lp.y - 5 * k, 32 * k, 8.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(lp.x - 32 * k, lp.y - 5 * k, 64 * k, 4 * k);
  ctx.strokeStyle = "rgba(40,22,2,0.6)";
  ctx.lineWidth = Math.max(0.6, k);
  ctx.beginPath();
  ctx.ellipse(lp.x, lp.y - 6 * k, 22 * k, 5.4 * k, 0, 0, Math.PI * 2);
  ctx.stroke();
  // the stem, turned on a lathe
  ctx.beginPath();
  ctx.moveTo(lp.x - 14 * k, lp.y - 8 * k);
  ctx.bezierCurveTo(lp.x - 4 * k, lp.y - 12 * k, lp.x - 4 * k, lp.y - 18 * k, lp.x - 9 * k, lp.y - 22 * k);
  ctx.bezierCurveTo(lp.x - 3 * k, lp.y - 26 * k, lp.x - 4 * k, lp.y - 30 * k, lp.x - 7 * k, lp.y - 34 * k);
  ctx.lineTo(lp.x + 7 * k, lp.y - 34 * k);
  ctx.bezierCurveTo(lp.x + 4 * k, lp.y - 30 * k, lp.x + 3 * k, lp.y - 26 * k, lp.x + 9 * k, lp.y - 22 * k);
  ctx.bezierCurveTo(lp.x + 4 * k, lp.y - 18 * k, lp.x + 4 * k, lp.y - 12 * k, lp.x + 14 * k, lp.y - 8 * k);
  ctx.closePath();
  ctx.fill();
  // the font: a flattened brass globe, a seam round its middle
  const fy = lp.y - 50 * k;
  ctx.beginPath();
  ctx.moveTo(lp.x - 7 * k, lp.y - 33 * k);
  ctx.bezierCurveTo(lp.x - 40 * k, lp.y - 36 * k, lp.x - 40 * k, lp.y - 64 * k, lp.x - 11 * k, lp.y - 68 * k);
  ctx.lineTo(lp.x + 11 * k, lp.y - 68 * k);
  ctx.bezierCurveTo(lp.x + 40 * k, lp.y - 64 * k, lp.x + 40 * k, lp.y - 36 * k, lp.x + 7 * k, lp.y - 33 * k);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  soft(ctx, lp.x, lp.y - 34 * k, 34 * k, 12 * k, "30,14,0", 0.6);
  soft(ctx, lp.x - 12 * k, fy - 8 * k, 9 * k, 7 * k, "255,255,240", 0.7, "lighter");
  ctx.strokeStyle = "rgba(50,28,4,0.55)";
  ctx.lineWidth = Math.max(0.6, 1.1 * k);
  ctx.beginPath();
  ctx.ellipse(lp.x, fy, 33 * k, 4 * k, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
  // the burner: a collar, a pierced gallery holding the chimney, the wick
  // wheel on its little arm
  ctx.strokeStyle = "#8a6420";
  ctx.lineWidth = 2.4 * k;
  ctx.beginPath();
  ctx.moveTo(lp.x + 10 * k, lp.y - 74 * k);
  ctx.lineTo(lp.x + 23 * k, lp.y - 74 * k);
  ctx.stroke();
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.ellipse(lp.x + 25 * k, lp.y - 74 * k, 3 * k, 5.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(lp.x - 12 * k, lp.y - 72 * k, 24 * k, 5 * k);
  ctx.fillRect(lp.x - 10 * k, lp.y - 80 * k, 20 * k, 9 * k);
  ctx.beginPath();
  ctx.moveTo(lp.x - 10 * k, lp.y - 79 * k);
  ctx.lineTo(lp.x - 16 * k, lp.y - 92 * k);
  ctx.lineTo(lp.x + 16 * k, lp.y - 92 * k);
  ctx.lineTo(lp.x + 10 * k, lp.y - 79 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(30,16,2,0.7)";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(lp.x + i * 5.6 * k, lp.y - 86 * k, 1.5 * k, 3 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the chimney: thin glass, swelling round the flame, a long throat
  const chimney = () => {
    ctx.beginPath();
    ctx.moveTo(lp.x - 14 * k, lp.y - 91 * k);
    ctx.bezierCurveTo(lp.x - 30 * k, lp.y - 104 * k, lp.x - 28 * k, lp.y - 128 * k, lp.x - 13 * k, lp.y - 142 * k);
    ctx.bezierCurveTo(lp.x - 9 * k, lp.y - 152 * k, lp.x - 10 * k, lp.y - 170 * k, lp.x - 10 * k, lp.y - 186 * k);
    ctx.lineTo(lp.x + 10 * k, lp.y - 186 * k);
    ctx.bezierCurveTo(lp.x + 10 * k, lp.y - 170 * k, lp.x + 9 * k, lp.y - 152 * k, lp.x + 13 * k, lp.y - 142 * k);
    ctx.bezierCurveTo(lp.x + 28 * k, lp.y - 128 * k, lp.x + 30 * k, lp.y - 104 * k, lp.x + 14 * k, lp.y - 91 * k);
    ctx.closePath();
  };
  chimney();
  const glass = ctx.createLinearGradient(lp.x - 26 * k, 0, lp.x + 26 * k, 0);
  glass.addColorStop(0, "rgba(255,225,170,0.34)");
  glass.addColorStop(0.2, "rgba(255,244,214,0.12)");
  glass.addColorStop(0.75, "rgba(255,236,196,0.1)");
  glass.addColorStop(1, "rgba(255,215,150,0.32)");
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.save();
  ctx.clip();
  soft(ctx, lp.x, lp.y - 114 * k, 24 * k, 26 * k, "255,214,140", 0.35, "lighter");
  ctx.strokeStyle = "rgba(255,255,245,0.6)";
  ctx.lineWidth = 2.2 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(lp.x - 18 * k, lp.y - 104 * k);
  ctx.quadraticCurveTo(lp.x - 22 * k, lp.y - 120 * k, lp.x - 13 * k, lp.y - 134 * k);
  ctx.stroke();
  ctx.lineWidth = 1.4 * k;
  ctx.beginPath();
  ctx.moveTo(lp.x - 6 * k, lp.y - 150 * k);
  ctx.lineTo(lp.x - 6 * k, lp.y - 180 * k);
  ctx.stroke();
  ctx.lineCap = "butt";
  // a little soot gathering in the throat
  soft(ctx, lp.x, lp.y - 180 * k, 12 * k, 14 * k, "20,14,10", 0.35);
  ctx.restore();
  chimney();
  ctx.strokeStyle = "rgba(255,240,210,0.5)";
  ctx.lineWidth = Math.max(0.6, 1 * k);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,246,225,0.7)";
  ctx.beginPath();
  ctx.ellipse(lp.x, lp.y - 186 * k, 10 * k, 2.4 * k, 0, 0, Math.PI * 2);
  ctx.stroke();
  // the wick, where the flame sits
  ctx.fillStyle = "#1a120a";
  ctx.fillRect(lp.x - 3 * k, lp.y - 98 * k, 6 * k, 7 * k);
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
  // a square of green baize, where the magnifying glass is kept
  const cl = L.loupe;
  const n = cl.n;
  ctx.save();
  ctx.translate(cl.x + 16 * n, cl.y + 2 * n);
  ctx.scale(1, 0.42);
  ctx.rotate(-0.06);
  soft(ctx, 6 * n, 10 * n, 150 * n, 96 * n, "0,0,0", 0.45);
  const baize = ctx.createLinearGradient(-130 * n, 0, 130 * n, 0);
  baize.addColorStop(0, "#35583e");
  baize.addColorStop(1, "#1c3424");
  ctx.fillStyle = baize;
  ctx.beginPath();
  ctx.roundRect(-128 * n, -80 * n, 256 * n, 160 * n, 5 * n);
  ctx.fill();
  ctx.strokeStyle = "rgba(190,220,180,0.22)";
  ctx.lineWidth = 2 * n;
  ctx.setLineDash([7 * n, 5 * n]);
  ctx.strokeRect(-118 * n, -70 * n, 236 * n, 140 * n);
  ctx.setLineDash([]);
  // a fold pressed into it
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 3 * n;
  ctx.beginPath();
  ctx.moveTo(-128 * n, 6 * n);
  ctx.lineTo(128 * n, -2 * n);
  ctx.stroke();
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
  // the rest of the room falls away into the dark: the light is the bench's
  const dark = ctx.createRadialGradient(W * 0.5, H * 0.74, H * 0.16, W * 0.5, H * 0.74, Math.max(W * 0.62, H * 0.95));
  dark.addColorStop(0, "rgba(3,5,9,0)");
  dark.addColorStop(0.3, "rgba(3,5,9,0.18)");
  dark.addColorStop(0.62, "rgba(3,5,9,0.6)");
  dark.addColorStop(1, "rgba(3,5,9,0.86)");
  ctx.save();
  ctx.translate(0, H * 0.74);
  ctx.scale(1, 0.62);
  ctx.translate(0, -H * 0.74);
  ctx.fillStyle = dark;
  ctx.fillRect(0, -H, W, H * 3);
  ctx.restore();
  // a warm pool on the boards, under the lamp and the glass
  soft(ctx, W * 0.46, H * 0.8, W * 0.34, H * 0.13, WARM, 0.16, "lighter");
}

// One of the five vessels, as a real piece of laboratory glass: thick walls
// that darken toward their edges, the liquid's surface seen a little from
// above, and a scale printed on the front in white enamel — fine divisions,
// numbered at the long ones, too small to read without a lens. The liquid's
// front edge sits exactly on its own division. Painted at `R` pixels to the
// unit, so the same drawing serves the bench and the magnifying glass. The
// canvas origin is the middle of the foot.
function paintBottle(L, b, R) {
  const w = b.w;
  const h = b.h;
  const cw = w * 1.5;
  const ch = h * 1.14;
  const c = makeCanvas(cw * R, ch * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  const ox = cw / 2; // the foot's middle
  const oy = ch - h * 0.05;
  g.translate(ox, oy);
  const [lr, lg, lb] = b.liquid;
  const tone = (k, add = 0) => rgb(Math.min(255, lr * k + add), Math.min(255, lg * k + add), Math.min(255, lb * k + add));
  const scaleBottom = -h * 0.08;
  const scaleTop = -h * b.scaleTop;
  const graduationY = (value) => scaleBottom + (scaleTop - scaleBottom) * (value / b.capacity);
  const level = graduationY(b.n);
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
      return w * (depth <= 0.8 ? 0.5 : 0.5 - ((depth - 0.8) / 0.08) * 0.3);
    }
    return w * 0.5;
  };
  const topY = b.shape === "jar" ? -h * 0.82 : -h * (b.shape === "tall" ? 0.96 : 0.94);
  const neck = b.shape === "jar" ? w * 0.3 : b.shape === "beaker" ? 0 : w * (b.shape === "tall" ? 0.2 : 0.12);
  // how round the vessel's circles look from where we stand
  const tilt = 0.2;
  // the shape of the glass, foot at 0, rising to -h
  const outline = () => {
    g.beginPath();
    if (b.shape === "conical") {
      g.moveTo(-w * 0.5, -h * 0.02);
      g.lineTo(-w * 0.12, -h * 0.72);
      g.lineTo(-w * 0.12, -h * 0.94);
      g.lineTo(w * 0.12, -h * 0.94);
      g.lineTo(w * 0.12, -h * 0.72);
      g.lineTo(w * 0.5, -h * 0.02);
      g.quadraticCurveTo(0, h * 0.045, -w * 0.5, -h * 0.02);
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
      g.quadraticCurveTo(0, h * 0.04, -w * 0.46, -h * 0.04);
    } else if (b.shape === "tall") {
      // a measuring cylinder: straight walls, a short shoulder, a neck
      g.moveTo(-w * 0.5, -h * 0.015);
      g.lineTo(-w * 0.5, -h * 0.8);
      g.quadraticCurveTo(-w * 0.5, -h * 0.86, -w * 0.2, -h * 0.88);
      g.lineTo(-w * 0.2, -h * 0.96);
      g.lineTo(w * 0.2, -h * 0.96);
      g.lineTo(w * 0.2, -h * 0.88);
      g.quadraticCurveTo(w * 0.5, -h * 0.86, w * 0.5, -h * 0.8);
      g.lineTo(w * 0.5, -h * 0.015);
      g.quadraticCurveTo(0, h * 0.03, -w * 0.5, -h * 0.015);
    } else {
      g.moveTo(-w * 0.5, -h * 0.03);
      g.lineTo(-w * 0.5, -h * 0.94);
      g.lineTo(-w * 0.57, -h * 0.985);
      g.lineTo(w * 0.5, -h * 0.985);
      g.lineTo(w * 0.5, -h * 0.03);
      g.quadraticCurveTo(0, h * 0.045, -w * 0.5, -h * 0.03);
    }
    g.closePath();
  };
  // its shadow on the bench, thrown right by the lamp, and the liquid's
  // colour pooled in it where the light comes through
  soft(g, w * 0.16, 0, w * 0.66, w * 0.11, "0,0,0", 0.62);
  soft(g, w * 0.2, h * 0.012, w * 0.4, w * 0.06, `${lr},${lg},${lb}`, b.glow ? 0.5 : 0.22, "lighter");
  if (b.shape === "round") {
    const ring = g.createLinearGradient(-w * 0.34, 0, w * 0.34, 0);
    ring.addColorStop(0, "#5a3418");
    ring.addColorStop(0.35, "#c89058");
    ring.addColorStop(1, "#4a2a12");
    g.fillStyle = "#2a180a";
    g.beginPath();
    g.ellipse(0, -h * 0.012, w * 0.34, h * 0.036, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ring;
    g.beginPath();
    g.ellipse(0, -h * 0.034, w * 0.34, h * 0.036, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2e1a0c";
    g.beginPath();
    g.ellipse(0, -h * 0.04, w * 0.24, h * 0.022, 0, 0, Math.PI * 2);
    g.fill();
  }
  // the far wall of the glass, seen through the near one
  outline();
  g.fillStyle = "rgba(6,14,20,0.5)";
  g.fill();
  g.save();
  outline();
  g.clip();
  // the room behind, faintly, and the glass's own green-grey
  const glass = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  glass.addColorStop(0, "rgba(150,200,205,0.5)");
  glass.addColorStop(0.1, "rgba(190,230,235,0.2)");
  glass.addColorStop(0.3, "rgba(160,205,215,0.07)");
  glass.addColorStop(0.72, "rgba(160,205,215,0.06)");
  glass.addColorStop(0.92, "rgba(170,215,225,0.2)");
  glass.addColorStop(1, "rgba(90,140,155,0.5)");
  g.fillStyle = glass;
  g.fillRect(-w, -h * 1.1, w * 2, h * 1.3);
  // the liquid: a rounded column, bright where the lamp comes through it,
  // deepening to the bottom
  const ry = Math.max(w * 0.022, halfWidthAt(level) * tilt * 0.5);
  const body = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  body.addColorStop(0, tone(0.26));
  body.addColorStop(0.14, tone(0.62));
  body.addColorStop(0.36, tone(1.06, 10));
  body.addColorStop(0.6, tone(0.9));
  body.addColorStop(0.86, tone(0.56));
  body.addColorStop(1, tone(0.22));
  g.globalAlpha = b.glow ? 0.95 : 0.88;
  g.fillStyle = body;
  g.fillRect(-w, level - ry, w * 2, h);
  g.globalAlpha = 1;
  const deep = g.createLinearGradient(0, level, 0, 0);
  deep.addColorStop(0, "rgba(0,0,0,0)");
  deep.addColorStop(1, b.glow ? "rgba(0,30,0,0.3)" : "rgba(0,0,0,0.42)");
  g.fillStyle = deep;
  g.fillRect(-w, level, w * 2, h);
  // the lamp's light caught in the foot of the liquid
  soft(g, -w * 0.08, -h * 0.03, w * 0.3, h * 0.035, "255,255,255", 0.2, "lighter");
  // its surface, seen a little from above; the bright meniscus along the
  // front edge is where the scale is read
  const rx = halfWidthAt(level - ry) * 0.97;
  const top = g.createLinearGradient(0, level - ry * 2, 0, level);
  top.addColorStop(0, tone(0.5));
  top.addColorStop(1, tone(1.18, 30));
  g.fillStyle = top;
  g.beginPath();
  g.ellipse(0, level - ry, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = tone(1.3, 90);
  g.globalAlpha = 0.9;
  g.lineWidth = Math.max(0.35, w * 0.008);
  g.beginPath();
  g.ellipse(0, level - ry, rx, ry, 0, 0.04 * Math.PI, 0.96 * Math.PI);
  g.stroke();
  g.globalAlpha = 0.35;
  g.beginPath();
  g.ellipse(0, level - ry, rx, ry, 0, 1.04 * Math.PI, 1.96 * Math.PI);
  g.stroke();
  g.globalAlpha = 1;
  // the printed scale: a spine, and divisions to its left, the long ones
  // numbered
  const narrow = Math.min(halfWidthAt(scaleTop), halfWidthAt(scaleBottom));
  const sx = narrow * 0.5;
  const long = Math.min(w * 0.2, narrow * 0.8);
  const fs = Math.max(2.9, Math.min(3.9, w * 0.04));
  const enamel = (alpha) => `rgba(250,252,242,${alpha})`;
  const steps = Math.round(b.capacity / b.step);
  const stroke = (x0, y0, x1, y1, lw, alpha) => {
    g.lineWidth = lw;
    g.strokeStyle = "rgba(4,10,12,0.5)";
    g.beginPath();
    g.moveTo(x0 + 0.25, y0 + 0.25);
    g.lineTo(x1 + 0.25, y1 + 0.25);
    g.stroke();
    g.strokeStyle = enamel(alpha);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  };
  stroke(sx, scaleBottom, sx, scaleTop, 0.34, 0.85);
  g.font = `600 ${fs}px Arial, Helvetica, sans-serif`;
  g.textAlign = "right";
  g.textBaseline = "middle";
  for (let i = 0; i <= steps; i++) {
    const value = i * b.step;
    const y = graduationY(value);
    const major = i % b.major === 0;
    const mid = i % b.mid === 0;
    const len = long * (major ? 1 : mid ? 0.62 : 0.36);
    stroke(sx, y, sx - len, y, major ? 0.42 : 0.3, major ? 0.95 : mid ? 0.85 : 0.7);
    if (major && i > 0) {
      g.fillStyle = "rgba(4,10,12,0.55)";
      g.fillText(String(value), sx - len - fs * 0.22 + 0.25, y + 0.3);
      g.fillStyle = enamel(0.95);
      g.fillText(String(value), sx - len - fs * 0.22, y + 0.05);
    }
  }
  g.textAlign = "left";
  g.font = `600 ${fs * 0.86}px Arial, Helvetica, sans-serif`;
  g.fillStyle = enamel(0.85);
  g.fillText("ml", sx + fs * 0.3, scaleTop);
  // the glass in front: a long window of lamplight down the left, a thin
  // return of it on the right, the walls going dark where they turn away
  const shine = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  shine.addColorStop(0, "rgba(0,0,0,0.3)");
  shine.addColorStop(0.07, "rgba(255,255,255,0)");
  shine.addColorStop(0.13, "rgba(255,255,255,0.5)");
  shine.addColorStop(0.2, "rgba(255,255,255,0.1)");
  shine.addColorStop(0.3, "rgba(255,255,255,0)");
  shine.addColorStop(0.84, "rgba(255,255,255,0)");
  shine.addColorStop(0.9, "rgba(255,240,210,0.22)");
  shine.addColorStop(0.95, "rgba(255,255,255,0)");
  shine.addColorStop(1, "rgba(0,0,0,0.34)");
  if (b.shape === "conical" || b.shape === "round") {
    // the walls lean, so the light runs along them, not straight down
    g.lineCap = "round";
    g.strokeStyle = "rgba(255,255,255,0.42)";
    g.lineWidth = w * 0.035;
    g.beginPath();
    if (b.shape === "conical") {
      g.moveTo(-w * 0.37, -h * 0.1);
      g.lineTo(-w * 0.135, -h * 0.56);
    } else {
      const r = w * 0.5;
      g.arc(0, -(r + h * 0.05), r * 0.8, Math.PI * 0.84, Math.PI * 1.36);
    }
    g.stroke();
    g.strokeStyle = "rgba(255,240,210,0.2)";
    g.lineWidth = w * 0.018;
    g.beginPath();
    if (b.shape === "conical") {
      g.moveTo(w * 0.4, -h * 0.08);
      g.lineTo(w * 0.2, -h * 0.46);
    } else {
      const r = w * 0.5;
      g.arc(0, -(r + h * 0.05), r * 0.86, -Math.PI * 0.2, Math.PI * 0.22);
    }
    g.stroke();
    g.lineCap = "butt";
    // a small square of window-light on the shoulder
    soft(g, -w * 0.06, -h * 0.82, w * 0.03, h * 0.08, "255,255,255", 0.3, "lighter");
  } else {
    g.fillStyle = shine;
    g.fillRect(-w, -h * 1.1, w * 2, h * 1.3);
  }
  g.restore();
  // the wall's thickness: a dark line and a light one, close together
  outline();
  g.strokeStyle = "rgba(10,22,28,0.85)";
  g.lineWidth = Math.max(0.9, w * 0.022);
  g.stroke();
  outline();
  g.strokeStyle = "rgba(215,242,248,0.62)";
  g.lineWidth = Math.max(0.4, w * 0.008);
  g.stroke();
  // the heavy foot, a ring of thick glass catching the light
  if (b.shape !== "round") {
    const fw = b.shape === "jar" ? w * 0.44 : w * 0.48;
    g.strokeStyle = "rgba(235,252,255,0.55)";
    g.lineWidth = Math.max(0.5, w * 0.012);
    g.beginPath();
    g.ellipse(0, -h * 0.012, fw, fw * tilt * 0.5, 0, 0.08 * Math.PI, 0.92 * Math.PI);
    g.stroke();
    g.strokeStyle = "rgba(235,252,255,0.2)";
    g.beginPath();
    g.ellipse(0, -h * 0.03, fw * 0.96, fw * tilt * 0.5, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // the mouth: an open ring, the far lip seen through the near one
  const lip = neck || w * 0.52;
  const lipRy = Math.max(h * 0.008, lip * tilt * 0.55);
  g.beginPath();
  g.ellipse(neck ? 0 : -w * 0.02, topY, lip, lipRy, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(10,20,26,0.55)";
  g.fill();
  g.strokeStyle = "rgba(232,252,255,0.8)";
  g.lineWidth = Math.max(0.5, w * 0.014);
  g.stroke();
  // corks and stoppers
  if (neck) {
    if (b.shape === "jar") {
      const stopper = g.createLinearGradient(-neck, 0, neck, 0);
      stopper.addColorStop(0, "rgba(90,130,142,0.75)");
      stopper.addColorStop(0.3, "rgba(235,252,252,0.82)");
      stopper.addColorStop(0.55, "rgba(150,195,205,0.6)");
      stopper.addColorStop(1, "rgba(60,100,116,0.78)");
      g.fillStyle = stopper;
      g.beginPath();
      g.ellipse(0, topY - h * 0.005, neck * 1.08, neck * 0.26, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-neck * 0.2, topY - h * 0.07, neck * 0.4, h * 0.06);
      g.beginPath();
      g.arc(0, topY - h * 0.1, neck * 0.42, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.7)";
      g.lineWidth = Math.max(0.4, w * 0.01);
      g.beginPath();
      g.arc(0, topY - h * 0.1, neck * 0.3, Math.PI * 0.95, Math.PI * 1.5);
      g.stroke();
    } else {
      const cork = g.createLinearGradient(-neck, 0, neck, 0);
      cork.addColorStop(0, "#553318");
      cork.addColorStop(0.28, "#a87543");
      cork.addColorStop(0.45, "#dab27a");
      cork.addColorStop(0.72, "#96643a");
      cork.addColorStop(1, "#472a14");
      g.fillStyle = cork;
      g.beginPath();
      g.moveTo(-neck * 1.12, topY - h * 0.055);
      g.lineTo(neck * 1.12, topY - h * 0.055);
      g.lineTo(neck * 0.9, topY + h * 0.04);
      g.quadraticCurveTo(0, topY + h * 0.04 + lipRy, -neck * 0.9, topY + h * 0.04);
      g.closePath();
      g.fill();
      g.fillStyle = "#e2bf8c";
      g.beginPath();
      g.ellipse(0, topY - h * 0.055, neck * 1.12, neck * 0.3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(70,40,18,0.5)";
      const rnd = lcg(40 + b.i);
      for (let i = 0; i < 9; i++) {
        g.fillRect((rnd() * 1.6 - 0.8) * neck, topY - h * 0.04 + rnd() * h * 0.06, neck * 0.12, Math.max(0.3, h * 0.004));
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

// The magnifying glass lying on its cloth: a brass ring round the lens, a
// turned dark handle. Returned with the place it lies.
function paintLoupe(L) {
  const lp = L.loupe;
  const n = lp.n;
  const R = 2;
  const cw = 250 * n;
  const ch = 120 * n;
  const c = makeCanvas(cw * R, ch * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.translate(cw * 0.36, ch * 0.5);
  const rx = 50 * n;
  const ry = 22 * n;
  const lift = 5 * n; // the ring's thickness, standing off the cloth
  soft(g, 14 * n, 8 * n, 120 * n, 30 * n, "0,0,0", 0.55);
  // the handle, lying away to the right
  g.save();
  g.rotate(0.1);
  const wood = g.createLinearGradient(0, -8 * n, 0, 8 * n);
  wood.addColorStop(0, "#6a3a22");
  wood.addColorStop(0.3, "#3a1c10");
  wood.addColorStop(1, "#140804");
  g.fillStyle = wood;
  g.beginPath();
  g.moveTo(rx + 16 * n, -5 * n);
  g.bezierCurveTo(rx + 50 * n, -9 * n, rx + 86 * n, -8 * n, rx + 104 * n, -6 * n);
  g.quadraticCurveTo(rx + 112 * n, 0, rx + 104 * n, 6 * n);
  g.bezierCurveTo(rx + 86 * n, 8 * n, rx + 50 * n, 9 * n, rx + 16 * n, 5 * n);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(255,200,150,0.3)";
  g.lineWidth = 1.2 * n;
  g.beginPath();
  g.moveTo(rx + 22 * n, -3.5 * n);
  g.quadraticCurveTo(rx + 60 * n, -6.5 * n, rx + 98 * n, -4 * n);
  g.stroke();
  const ferrule = g.createLinearGradient(0, -6 * n, 0, 6 * n);
  ferrule.addColorStop(0, "#f4dc98");
  ferrule.addColorStop(0.5, "#b88a34");
  ferrule.addColorStop(1, "#5a3c0c");
  g.fillStyle = ferrule;
  g.fillRect(rx - 2 * n, -4 * n, 20 * n, 8 * n);
  g.fillRect(rx + 14 * n, -6 * n, 5 * n, 12 * n);
  g.restore();
  // the ring's outer wall, then the lens in it
  const brass = g.createLinearGradient(-rx, 0, rx, 0);
  brass.addColorStop(0, "#5a3c0c");
  brass.addColorStop(0.3, "#f6e0a0");
  brass.addColorStop(0.55, "#b08430");
  brass.addColorStop(1, "#4a300a");
  g.fillStyle = "#3a2608";
  g.beginPath();
  g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = brass;
  g.beginPath();
  g.ellipse(0, -lift, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(-rx, -lift, rx * 2, lift);
  g.beginPath();
  g.ellipse(0, -lift, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  const lens = g.createLinearGradient(-rx, -ry, rx, ry);
  lens.addColorStop(0, "#9ab8c0");
  lens.addColorStop(0.45, "#3a5058");
  lens.addColorStop(1, "#1a2a30");
  g.fillStyle = lens;
  g.beginPath();
  g.ellipse(0, -lift, rx * 0.86, ry * 0.82, 0, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.clip();
  // the cloth's weave seen through it, swollen; the lamp's reflection
  soft(g, 6 * n, -lift + 4 * n, rx * 0.7, ry * 0.6, "70,110,80", 0.5);
  soft(g, -rx * 0.4, -lift - ry * 0.4, rx * 0.5, ry * 0.4, "255,240,210", 0.55, "lighter");
  g.restore();
  g.strokeStyle = "rgba(255,250,220,0.6)";
  g.lineWidth = 1.2 * n;
  g.beginPath();
  g.ellipse(0, -lift, rx * 0.93, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.6);
  g.stroke();
  return { canvas: c, x: lp.x, y: lp.y, ox: 0.36, oy: 0.5 };
}

// The glass held up to the eye: the lens (clear; what is under it is drawn by
// the scene), its brass ring, the handle going off to the lower right.
function paintLens(r) {
  const R = 2;
  const half = r * 2.5;
  const c = makeCanvas(half * 2 * R, half * 2 * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.translate(half, half);
  // the handle
  g.save();
  g.rotate(0.72);
  soft(g, r * 1.7, r * 0.08, r * 0.75, r * 0.2, "0,0,0", 0.4);
  const wood = g.createLinearGradient(0, -r * 0.13, 0, r * 0.13);
  wood.addColorStop(0, "#7a4428");
  wood.addColorStop(0.35, "#42200f");
  wood.addColorStop(1, "#160904");
  g.fillStyle = wood;
  g.beginPath();
  g.moveTo(r * 1.26, -r * 0.085);
  g.bezierCurveTo(r * 1.6, -r * 0.15, r * 2.05, -r * 0.14, r * 2.26, -r * 0.1);
  g.quadraticCurveTo(r * 2.36, 0, r * 2.26, r * 0.1);
  g.bezierCurveTo(r * 2.05, r * 0.14, r * 1.6, r * 0.15, r * 1.26, r * 0.085);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(255,205,160,0.35)";
  g.lineWidth = r * 0.02;
  g.beginPath();
  g.moveTo(r * 1.32, -r * 0.055);
  g.quadraticCurveTo(r * 1.8, -r * 0.1, r * 2.2, -r * 0.065);
  g.stroke();
  const ferrule = g.createLinearGradient(0, -r * 0.1, 0, r * 0.1);
  ferrule.addColorStop(0, "#f8e2a2");
  ferrule.addColorStop(0.5, "#b88a34");
  ferrule.addColorStop(1, "#5a3c0c");
  g.fillStyle = ferrule;
  g.fillRect(r * 1.02, -r * 0.065, r * 0.26, r * 0.13);
  g.fillRect(r * 1.24, -r * 0.1, r * 0.06, r * 0.2);
  g.restore();
  // the lens: the glass's own faint colour, darker at its edge, a soft
  // reflection of the lamp across the top
  const tint = g.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
  tint.addColorStop(0, "rgba(200,230,235,0.02)");
  tint.addColorStop(0.8, "rgba(120,170,180,0.08)");
  tint.addColorStop(1, "rgba(10,30,36,0.5)");
  g.fillStyle = tint;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(255,250,235,0.3)";
  g.lineWidth = r * 0.05;
  g.lineCap = "round";
  g.beginPath();
  g.arc(0, 0, r * 0.84, Math.PI * 1.1, Math.PI * 1.42);
  g.stroke();
  g.strokeStyle = "rgba(255,250,235,0.14)";
  g.lineWidth = r * 0.025;
  g.beginPath();
  g.arc(0, 0, r * 0.84, Math.PI * 0.14, Math.PI * 0.3);
  g.stroke();
  g.lineCap = "butt";
  // the ring
  const ring = (radius, width, colour) => {
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.beginPath();
    g.arc(0, 0, radius, 0, Math.PI * 2);
    g.stroke();
  };
  ring(r * 1.05, r * 0.16, "rgba(0,0,0,0.35)");
  const brass = g.createLinearGradient(-r, -r, r, r);
  brass.addColorStop(0, "#fbe9b0");
  brass.addColorStop(0.3, "#c89a40");
  brass.addColorStop(0.6, "#7a5416");
  brass.addColorStop(1, "#c8a04c");
  ring(r * 1.04, r * 0.11, brass);
  ring(r * 1.09, r * 0.014, "rgba(40,24,4,0.8)");
  ring(r * 0.99, r * 0.014, "rgba(40,24,4,0.7)");
  ring(r * 1.04, r * 0.02, "rgba(255,246,210,0.45)");
  return c;
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
