import { RACK, POCKETS, POCKET_MARKS, ballColour, isStripe } from "./puzzle.js";
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

/** The abandoned pub for BILLIARDS, painted like the game's storybook
 *  nights: a pool table seen from above under its lamp's warm light, the
 *  rest of the room dark and dusty, the moon laying a window across the
 *  floor. On the felt: the cue ball, and the rack with five balls missing;
 *  the missing five lie in the pockets marked I to V, showing only their
 *  colours. On the floor, a chalk slate: WHAT IS MISSING DEFINES THE ANSWER.
 *
 *  The table is seen from high up, a little in perspective: across it X,
 *  along it (away from us) D, up from the felt Z; the far side a little
 *  smaller than the near.
 *
 *  Painted once per screen size: the room; each pocketed ball and the cue
 *  ball (they can be touched); the glow. */

const K = { room: "bi_room", glow: "bi_glow", cue: "bi_cue" };
const pocketKey = (i) => `bi_pocket_${i}`;
const WARM = "255,206,140";
const MOON = "150,180,235";
export const CHALK_FONT = '"Architects Daughter", "Special Elite", cursive';
const PLATE_FONT = 'Georgia, "Times New Roman", serif';

// ── where everything is ─────────────────────────────────────────────────────

export function layoutPub(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  L.vp = { x: W / 2, y: -3 * H };
  L.yt = 3.68 * H; // the felt, below the eye
  L.nearS = 1;
  L.farS = 3.2 / 3.68;
  const hw = Math.min(W * 0.33, H * 0.56); // half the playing length
  L.hw = hw;
  L.hd = hw / 2; // half its width
  L.ds = (L.nearS - L.farS) / (2 * L.hd);
  L.sMid = (L.nearS + L.farS) / 2;
  L.r = hw * 0.058; // a ball
  L.cushion = hw * 0.035;
  L.rail = hw * 0.12;
  L.railZ = hw * 0.05;
  // the pockets: four corners and the two middles, and which are marked
  const c = L.cushion * 0.6;
  L.pockets = [
    { X: -hw - c, D: -L.hd - c, r: hw * 0.085, mark: 0 }, // I: far left
    { X: 0, D: -L.hd - L.cushion * 1.2, r: hw * 0.075, mark: 1 }, // II: far middle
    { X: hw + c, D: -L.hd - c, r: hw * 0.085, mark: 2 }, // III: far right
    { X: hw + c, D: L.hd + c, r: hw * 0.085, mark: 3 }, // IV: near right
    { X: 0, D: L.hd + L.cushion * 1.2, r: hw * 0.075, mark: 4 }, // V: near middle
    { X: -hw - c, D: L.hd + c, r: hw * 0.085, mark: null }, // near left: unmarked, empty
  ];
  for (const p of L.pockets) Object.assign(p, at(L, p.X, p.D, 0));
  // the rack, its apex on the foot spot, pointing up the table; the cue
  // ball on the head spot
  const r = L.r;
  L.rack = [];
  RACK.forEach((col, ci) => {
    col.forEach((n, j) => {
      const X = hw / 2 + ci * r * Math.sqrt(3) * 1.02;
      const D = (j - (col.length - 1) / 2) * r * 2.04;
      L.rack.push({ n, X, D, ...at(L, X, D, r) });
    });
  });
  L.cue = { X: -hw / 2, D: 0, ...at(L, -hw / 2, 0, r) };
  // on the floor: the slate, a stool knocked over
  L.slate = { x: W * 0.3, y: H * 0.915, w: Math.min(W * 0.24, H * 0.36), a: -0.05 };
  L.slate.h = L.slate.w * 0.46;
  L.stool = { x: W * 0.66, y: H * 0.93, s: u };
  return L;
}

// a point of the table: across X, along D, up Z → the screen, and its scale
export function at(L, X, D, Z) {
  const s = L.sMid + D * L.ds;
  return { x: L.vp.x + X * s, y: L.vp.y + (L.yt - Z) * s, s };
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintPub(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintFloor(ctx, L);
  paintFloorThings(ctx, L);
  paintTable(ctx, L);
  paintRack(ctx, L);
  paintLight(ctx, L);
  vignette(ctx, W, H, 0.62);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  const pockets = L.pockets
    .filter((p) => p.mark !== null)
    .map((p) => {
      const n = POCKETS[p.mark];
      addCanvasTexture(t, pocketKey(p.mark), paintBall(L.r * p.s * 0.92, n, { sunk: true }));
      return { key: pocketKey(p.mark), n, x: p.x, y: p.y, r: p.r * p.s, mark: p.mark };
    });
  addCanvasTexture(t, K.cue, paintBall(L.r * L.cue.s, 0, {}));
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, pockets };
}

export function releasePubArt(textures) {
  for (const key of [...Object.values(K), ...POCKETS.map((_, i) => pocketKey(i))]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// old floorboards under years of dust, the moon's window laid across them
function paintFloor(ctx, L) {
  const { W, H, u } = L;
  ctx.fillStyle = "#1e130c";
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(1201);
  const bh = 34 * u;
  for (let y = 0, i = 0; y < H; y += bh, i++) {
    let x = -rnd() * 200 * u;
    while (x < W) {
      const len = (160 + rnd() * 220) * u;
      const k = 0.7 + rnd() * 0.35;
      ctx.fillStyle = rgb(70 * k, 46 * k, 30 * k);
      ctx.fillRect(x + 1, y + 1, len - 2, bh - 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 1, y + bh - 4 * u, len - 2, 3 * u);
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = "rgba(255,220,180,0.04)";
        ctx.fillRect(x + rnd() * len, y + 3 * u + rnd() * (bh - 8 * u), (30 + rnd() * 80) * u, 1);
      }
      x += len;
    }
  }
  // dust lying on everything
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(200,190,170,${(0.04 + rnd() * 0.08).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, (0.6 + rnd() * 1.6) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  soft(ctx, W * 0.5, H * 0.5, W * 0.7, H * 0.7, "120,100,80", 0.08);
  // the moon through a window: four panes of pale light across the floor
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(W * 0.12, H * 0.1);
  ctx.transform(1, 0.18, -0.55, 1, 0, 0);
  const pw = 70 * u;
  const ph = 90 * u;
  for (const [px, py] of [
    [0, 0],
    [pw + 8 * u, 0],
    [0, ph + 8 * u],
    [pw + 8 * u, ph + 8 * u],
  ]) {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, `rgba(${MOON},0.12)`);
    g.addColorStop(1, `rgba(${MOON},0.05)`);
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
}

// what lies about on the floor: a cue dropped by the wall, the slate with
// its chalk, a stool knocked over, an empty bottle
function paintFloorThings(ctx, L) {
  const { W, H, u } = L;
  // the cue, along the top
  ctx.save();
  ctx.translate(W * 0.1, H * 0.055);
  ctx.rotate(0.02);
  soft(ctx, W * 0.2, 6 * u, W * 0.22, 6 * u, "0,0,0", 0.5);
  const len = W * 0.42;
  const cg = ctx.createLinearGradient(0, -5 * u, 0, 5 * u);
  cg.addColorStop(0, "#e8c890");
  cg.addColorStop(0.5, "#b08050");
  cg.addColorStop(1, "#5a3a1a");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(0, -6 * u);
  ctx.lineTo(len, -2.5 * u);
  ctx.lineTo(len, 2.5 * u);
  ctx.lineTo(0, 6 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1210";
  ctx.fillRect(0, -6 * u, len * 0.3, 12 * u);
  ctx.fillStyle = "#e8e0d0";
  ctx.fillRect(len - 6 * u, -2.6 * u, 3 * u, 5.2 * u);
  ctx.fillStyle = "#2a5aa0";
  ctx.fillRect(len - 3 * u, -2.6 * u, 3 * u, 5.2 * u);
  ctx.restore();
  // the slate, lying on the floor, the chalk beside it
  const s = L.slate;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.a);
  soft(ctx, 8 * u, 10 * u, s.w * 0.6, s.h * 0.62, "0,0,0", 0.6);
  ctx.fillStyle = "#6a4222";
  ctx.beginPath();
  ctx.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 4 * u);
  ctx.fill();
  const fr = s.h * 0.1;
  const sg = ctx.createLinearGradient(-s.w / 2, -s.h / 2, s.w / 2, s.h / 2);
  sg.addColorStop(0, "#2e3432");
  sg.addColorStop(1, "#1c201f");
  ctx.fillStyle = sg;
  ctx.fillRect(-s.w / 2 + fr, -s.h / 2 + fr, s.w - fr * 2, s.h - fr * 2);
  // old chalk wiped off, ghosts of scores
  ctx.fillStyle = "rgba(220,220,210,0.06)";
  ctx.fillRect(-s.w * 0.4, -s.h * 0.3, s.w * 0.5, s.h * 0.25);
  soft(ctx, s.w * 0.2, s.h * 0.15, s.w * 0.3, s.h * 0.2, "220,220,210", 0.08);
  ctx.fillStyle = "rgba(240,240,232,0.88)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fs = Math.round(s.h * 0.2);
  ctx.font = `${fs}px ${CHALK_FONT}`;
  ctx.fillText("What is missing", 0, -s.h * 0.2);
  ctx.fillText("defines the answer", 0, s.h * 0.12);
  ctx.restore();
  ctx.save();
  ctx.translate(s.x + s.w * 0.6, s.y + s.h * 0.2);
  ctx.rotate(0.6);
  ctx.fillStyle = "#f4f2ea";
  ctx.beginPath();
  ctx.roundRect(-12 * u, -3 * u, 24 * u, 6 * u, 3 * u);
  ctx.fill();
  ctx.restore();
  // a bar stool left standing, seen from above: its footrest ring and legs
  // splayed out below, the round buttoned seat on top
  const st = L.stool;
  const k = st.s;
  soft(ctx, st.x + 14 * k, st.y + 10 * k, 52 * k, 40 * k, "0,0,0", 0.6);
  ctx.strokeStyle = "#2a1a0c";
  ctx.lineWidth = 5 * k;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(st.x + Math.cos(a) * 18 * k, st.y + Math.sin(a) * 18 * k);
    ctx.lineTo(st.x + Math.cos(a) * 40 * k, st.y + Math.sin(a) * 40 * k + 6 * k);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#8a6a2a";
  ctx.lineWidth = 3 * k;
  ctx.beginPath();
  ctx.arc(st.x, st.y + 3 * k, 31 * k, 0, Math.PI * 2);
  ctx.stroke();
  const seat = ctx.createRadialGradient(st.x - 8 * k, st.y - 9 * k, 3 * k, st.x, st.y, 26 * k);
  seat.addColorStop(0, "#b03a3a");
  seat.addColorStop(0.7, "#7a1e22");
  seat.addColorStop(1, "#3a0c0e");
  ctx.fillStyle = "#2a1a0c";
  ctx.beginPath();
  ctx.arc(st.x, st.y + 2 * k, 26 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = seat;
  ctx.beginPath();
  ctx.arc(st.x, st.y, 24 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(20,4,4,0.6)";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(st.x + Math.cos(a) * 12 * k, st.y + Math.sin(a) * 12 * k, 1.6 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(st.x, st.y, 1.8 * k, 0, Math.PI * 2);
  ctx.fill();
  // a split in the old leather, the dust on it
  ctx.strokeStyle = "rgba(240,200,170,0.25)";
  ctx.lineWidth = 1.2 * k;
  ctx.beginPath();
  ctx.moveTo(st.x + 6 * k, st.y + 4 * k);
  ctx.lineTo(st.x + 16 * k, st.y + 12 * k);
  ctx.stroke();
  // an empty bottle rolled against its foot
  ctx.save();
  ctx.translate(st.x + 62 * k, st.y + 22 * k);
  ctx.rotate(-0.9);
  const bg = ctx.createLinearGradient(0, -9 * k, 0, 9 * k);
  bg.addColorStop(0, "rgba(120,200,140,0.7)");
  bg.addColorStop(0.4, "rgba(40,110,60,0.85)");
  bg.addColorStop(1, "rgba(10,40,20,0.9)");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(-26 * k, -9 * k, 34 * k, 18 * k, 6 * k);
  ctx.fill();
  ctx.fillRect(6 * k, -4 * k, 20 * k, 8 * k);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-22 * k, -6 * k, 26 * k, 2 * k);
  ctx.restore();
}

// The table: its shadow, its legs' feet, the apron along the near side, the
// wooden rails with their sights and the brass plates by the pockets, the
// cushions, the felt, the pockets.
function paintTable(ctx, L) {
  const { u, hw, hd } = L;
  const cu = L.cushion;
  const rl = L.rail;
  const z = L.railZ;
  const P = (X, D, Z = 0) => at(L, X, D, Z);
  const out = { X: hw + cu + rl, D: hd + cu + rl };
  // its shadow on the floor
  const sh = P(0, out.D * 0.2, -hw * 0.6);
  soft(ctx, sh.x, sh.y, out.X * 1.15, out.D * 1.25, "0,0,0", 0.8);
  // the apron along the near side (seen), and the turned legs at its corners
  const nl = P(-out.X, out.D, z);
  const nr = P(out.X, out.D, z);
  const aprH = hw * 0.2;
  const ag = ctx.createLinearGradient(0, nl.y, 0, nl.y + aprH);
  ag.addColorStop(0, "#5a2a14");
  ag.addColorStop(1, "#24100a");
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.roundRect(nl.x, nl.y - 2 * u, nr.x - nl.x, aprH, [0, 0, 10 * u, 10 * u]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,200,150,0.15)";
  ctx.lineWidth = Math.max(1, u * 1.5);
  ctx.strokeRect(nl.x + hw * 0.12, nl.y + aprH * 0.25, nr.x - nl.x - hw * 0.24, aprH * 0.5);
  for (const lx of [nl.x + hw * 0.05, nr.x - hw * 0.05]) {
    const lg = ctx.createLinearGradient(lx - hw * 0.05, 0, lx + hw * 0.05, 0);
    lg.addColorStop(0, "#2a1208");
    lg.addColorStop(0.4, "#7a4022");
    lg.addColorStop(1, "#1a0a04");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(lx, nl.y + aprH * 0.95, hw * 0.06, hw * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the rails: a frame of mahogany round the playing field, raised
  const corner = hw * 0.06;
  const rp = [
    P(-out.X, -out.D, z),
    P(out.X, -out.D, z),
    P(out.X, out.D, z),
    P(-out.X, out.D, z),
  ];
  ctx.beginPath();
  ctx.moveTo(rp[0].x + corner, rp[0].y);
  ctx.arcTo(rp[1].x, rp[1].y, rp[2].x, rp[2].y, corner);
  ctx.arcTo(rp[2].x, rp[2].y, rp[3].x, rp[3].y, corner);
  ctx.arcTo(rp[3].x, rp[3].y, rp[0].x, rp[0].y, corner);
  ctx.arcTo(rp[0].x, rp[0].y, rp[1].x, rp[1].y, corner);
  ctx.closePath();
  const rg = ctx.createLinearGradient(rp[0].x, rp[0].y, rp[2].x, rp[2].y);
  rg.addColorStop(0, "#7a3a1c");
  rg.addColorStop(0.5, "#5a2a12");
  rg.addColorStop(1, "#6a3218");
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,210,160,0.25)";
  ctx.lineWidth = Math.max(1, u * 1.5);
  ctx.stroke();
  // the wood's grain along the rails
  const rnd = lcg(77);
  ctx.strokeStyle = "rgba(30,10,4,0.25)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? -1 : 1;
    const d = side * (hd + cu + rl * (0.2 + rnd() * 0.6));
    const a = P(-out.X + rnd() * hw * 0.4, d, z);
    const b = P(out.X - rnd() * hw * 0.4, d, z);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // the cushions: green rubber noses along the inside of the rails
  const inner = [P(-hw - cu, -hd - cu, z), P(hw + cu, -hd - cu, z), P(hw + cu, hd + cu, z), P(-hw - cu, hd + cu, z)];
  polygon(ctx, inner);
  ctx.fillStyle = "#16502e";
  ctx.fill();
  // the felt
  const felt = [P(-hw, -hd), P(hw, -hd), P(hw, hd), P(-hw, hd)];
  polygon(ctx, felt);
  const fg = ctx.createLinearGradient(0, felt[0].y, 0, felt[2].y);
  fg.addColorStop(0, "#1a6a40");
  fg.addColorStop(1, "#22784a");
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the cushions' shadow on the felt along the far and left sides
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(felt[0].x, felt[0].y, felt[1].x - felt[0].x, cu * 0.6);
  // dust and a few old chalk marks on the cloth
  for (let i = 0; i < 160; i++) {
    const p = P((rnd() * 2 - 1) * hw, (rnd() * 2 - 1) * hd);
    ctx.fillStyle = `rgba(210,220,200,${(0.04 + rnd() * 0.07).toFixed(3)})`;
    ctx.fillRect(p.x, p.y, (1 + rnd() * 2) * u, (1 + rnd() * 2) * u);
  }
  for (let i = 0; i < 3; i++) {
    const p = P((rnd() * 1.6 - 0.8) * hw, (rnd() * 1.6 - 0.8) * hd);
    soft(ctx, p.x, p.y, 10 * u, 6 * u, "90,140,200", 0.25);
  }
  // the spots: head and foot
  for (const X of [-hw / 2, hw / 2]) {
    const p = P(X, 0);
    ctx.fillStyle = "rgba(240,240,230,0.5)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // the sights: mother-of-pearl diamonds along the rails
  const sight = (X, D) => {
    const p = P(X, D, z);
    const k = 4 * u * p.s;
    ctx.fillStyle = "#f0ece0";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - k);
    ctx.lineTo(p.x + k * 0.7, p.y);
    ctx.lineTo(p.x, p.y + k);
    ctx.lineTo(p.x - k * 0.7, p.y);
    ctx.closePath();
    ctx.fill();
  };
  const mid = cu + rl * 0.55;
  for (const f of [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]) {
    sight(f * hw, -hd - mid);
    sight(f * hw, hd + mid);
  }
  for (const f of [-0.5, 0, 0.5]) {
    sight(-hw - mid, f * hd);
    sight(hw + mid, f * hd);
  }
  // the pockets: a leather lip round a dark hole cut through cushion and rail
  for (const p of L.pockets) {
    const rr = p.r * p.s;
    ctx.fillStyle = "#2a1a10";
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr * 1.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,210,160,0.2)";
    ctx.lineWidth = Math.max(1, u);
    ctx.stroke();
    const hg = ctx.createRadialGradient(p.x, p.y - rr * 0.2, rr * 0.1, p.x, p.y, rr);
    hg.addColorStop(0, "#020101");
    hg.addColorStop(1, "#140c08");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  // the brass plates by the marked pockets, each with its numeral
  for (const p of L.pockets) {
    if (p.mark === null) continue;
    const far = p.D < 0;
    const isMiddle = p.X === 0;
    const plateX = isMiddle ? p.X + hw * 0.16 : p.X + (p.X < 0 ? 1 : -1) * hw * 0.2;
    const plateD = (far ? -1 : 1) * (hd + cu + rl * 0.55);
    const pp = P(plateX, plateD, z);
    const pw = hw * 0.1 * pp.s;
    const ph = hw * 0.052 * pp.s;
    const bg = ctx.createLinearGradient(pp.x - pw / 2, pp.y - ph / 2, pp.x + pw / 2, pp.y + ph / 2);
    bg.addColorStop(0, "#f4d88a");
    bg.addColorStop(0.5, "#c9973c");
    bg.addColorStop(1, "#8a6420");
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(pp.x - pw / 2 + 1, pp.y - ph / 2 + 1.5, pw, ph, ph * 0.25);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(pp.x - pw / 2, pp.y - ph / 2, pw, ph, ph * 0.25);
    ctx.fill();
    ctx.fillStyle = "#3a2408";
    ctx.font = `700 ${Math.round(ph * 0.72)}px ${PLATE_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(POCKET_MARKS[p.mark], pp.x, pp.y + ph * 0.04);
    ctx.fillStyle = "#6a4810";
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(pp.x + e * pw * 0.4, pp.y, Math.max(0.8, ph * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // a blue cube of chalk on the near rail
  const ch = P(-hw * 0.32, hd + cu + rl * 0.5, z);
  const cs = 11 * u * ch.s;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(ch.x - cs / 2 + 2, ch.y - cs / 2 + 3, cs, cs);
  ctx.fillStyle = "#2a5aa0";
  ctx.fillRect(ch.x - cs / 2, ch.y - cs / 2, cs, cs);
  ctx.fillStyle = "#6a9ad8";
  ctx.fillRect(ch.x - cs * 0.3, ch.y - cs * 0.3, cs * 0.6, cs * 0.6);
}

// the triangle of balls, five gone from it, in its wooden frame
function paintRack(ctx, L) {
  const { u, r, hw } = L;
  // the frame: a triangle of wood a little larger than the balls
  const apex = { X: hw / 2 - r * 2.6, D: 0 };
  const back = hw / 2 + 4 * r * Math.sqrt(3) * 1.02 + r * 1.35;
  const half = 4 * r * 1.02 + r * 2.2;
  const tri = [at(L, apex.X, apex.D, r * 0.4), at(L, back, -half, r * 0.4), at(L, back, half, r * 0.4)];
  polygon(ctx, tri);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = r * 0.55;
  ctx.lineJoin = "round";
  ctx.save();
  ctx.translate(2 * u, 3 * u);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#a06a3a";
  ctx.lineWidth = r * 0.42;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,170,0.3)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  ctx.lineJoin = "miter";
  for (const b of L.rack) {
    if (b.n === null) {
      // where a ball stood: a faint clean round in the dust
      const p = at(L, b.X, b.D, 0);
      soft(ctx, p.x, p.y, r * p.s * 0.9, r * p.s * 0.9, "30,100,60", 0.35);
      continue;
    }
    const p = at(L, b.X, b.D, 0);
    soft(ctx, p.x + r * 0.35, p.y + r * 0.45, r * 1.1, r * 0.9, "0,0,0", 0.55);
    const ball = paintBall(r * b.s, b.n, {});
    ctx.drawImage(ball, b.x - (ball.width / 2) / 2, b.y - (ball.height / 2) / 2, ball.width / 2, ball.height / 2);
  }
  // the cue ball's shadow (the ball itself is the scene's)
  const c = at(L, L.cue.X, L.cue.D, 0);
  soft(ctx, c.x + r * 0.35, c.y + r * 0.45, r * 1.1, r * 0.9, "0,0,0", 0.55);
}

// The light: the lamp over the table, warm on the cloth, falling off at the
// rails into the dark of the room.
function paintLight(ctx, L) {
  const { W, H, hw } = L;
  const c = at(L, 0, 0, 0);
  soft(ctx, c.x, c.y, hw * 1.15, hw * 0.75, WARM, 0.32, "lighter");
  soft(ctx, c.x, c.y, hw * 0.6, hw * 0.4, WARM, 0.18, "lighter");
  soft(ctx, c.x, c.y, W * 0.7, H * 0.7, WARM, 0.06, "lighter");
}

// A ball seen from above: a lit sphere, its number in a white round (or,
// sunk in a pocket's dark, only its colour and stripe). n = 0 is the cue
// ball. Painted at twice its size, centred.
export function paintBall(r, n, { sunk = false }) {
  const R = 2;
  const size = Math.ceil(r * 2.2 * R);
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = size / R / 2;
  const cy = size / R / 2;
  const base = n === 0 ? "#f4f0e4" : ballColour(n);
  const stripe = n > 0 && isStripe(n);
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = stripe ? "#f4f0e4" : base;
  g.fillRect(0, 0, size, size);
  if (stripe) {
    // the band round it, seen across its top, a little turned
    g.save();
    g.translate(cx, cy);
    g.rotate(((n * 47) % 90) * (Math.PI / 180) - 0.6);
    g.fillStyle = base;
    g.beginPath();
    g.ellipse(0, 0, r * 1.2, r * 0.56, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  if (!sunk && n > 0) {
    // the number in its white round
    g.fillStyle = "#f8f6ee";
    g.beginPath();
    g.arc(cx - r * 0.06, cy - r * 0.04, r * 0.44, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#141414";
    g.font = `700 ${Math.round(r * (n > 9 ? 0.5 : 0.58))}px ${PLATE_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), cx - r * 0.06, cy - r * 0.02);
  }
  // the light on it: lit from above, shadowed round its lower edge
  const shade = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r * 1.05);
  shade.addColorStop(0, "rgba(255,255,255,0)");
  shade.addColorStop(0.65, "rgba(0,0,0,0.08)");
  shade.addColorStop(1, `rgba(0,0,0,${sunk ? 0.75 : 0.5})`);
  g.fillStyle = shade;
  g.fillRect(0, 0, size, size);
  if (sunk) {
    // down in the pocket: the near side in deep shadow
    const dark = g.createLinearGradient(0, cy - r, 0, cy + r);
    dark.addColorStop(0, "rgba(0,0,0,0.05)");
    dark.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = dark;
    g.fillRect(0, 0, size, size);
  }
  g.restore();
  g.fillStyle = `rgba(255,250,235,${sunk ? 0.55 : 0.85})`;
  g.beginPath();
  g.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2);
  g.fill();
  return c;
}
