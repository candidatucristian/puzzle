// ═══════════════════════════════════════════════════════════════════════════
// pub.js — the abandoned pub for BILLIARDS, painted NOIR.
//
// Same room, same puzzle, different hour. Rain on the window. One lamp over
// the table, a hard cone of amber in a room gone almost black. Chiaroscuro:
// everything that matters is caught in the light; everything else falls into
// cold blue shadow. The balls still carry their colours — the puzzle needs
// them — but only the lit half shows them. Smoke drifts through the beam.
// Film grain, heavy vignette, a whisper of warm against a wall of cold.
// ═══════════════════════════════════════════════════════════════════════════

import { RACK, POCKETS, POCKET_MARKS, ballColour, isStripe } from "./puzzle.js";
import {
  soft,
  grain,
  vignette,
  glowCanvas,
  makeCanvas,
  addCanvasTexture,
  lcg,
  polygon,
} from "../../shared/paint.js";

const K = { room: "bi_room", glow: "bi_glow", cue: "bi_cue" };
const pocketKey = (i) => `bi_pocket_${i}`;

// ── noir palette ───────────────────────────────────────────────────────────
// Warm amber key (the lamp), cold steel fill (the rainy window), and a deep
// black everything falls back into.
const LAMP = "255,182,102"; // the lamp's amber
const LAMP_HOT = "255,214,150"; // its hottest core
const RAIN = "110,140,180"; // rainy-window blue
const RAIN_COLD = "70,100,150"; // its deepest shade
const SMOKE = "210,205,190"; // haze in the beam

export const CHALK_FONT = '"Architects Daughter", "Special Elite", cursive';
const PLATE_FONT = 'Georgia, "Times New Roman", serif';

// ── layout ─────────────────────────────────────────────────────────────────

export function layoutPub(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  L.vp = { x: W / 2, y: -3 * H };
  L.yt = 3.68 * H;
  L.nearS = 1;
  L.farS = 3.2 / 3.68;
  const hw = Math.min(W * 0.33, H * 0.56);
  L.hw = hw;
  L.hd = hw / 2;
  L.ds = (L.nearS - L.farS) / (2 * L.hd);
  L.sMid = (L.nearS + L.farS) / 2;
  L.r = hw * 0.058;
  L.cushion = hw * 0.035;
  L.rail = hw * 0.12;
  L.railZ = hw * 0.05;
  const c = L.cushion * 0.6;
  L.pockets = [
    { X: -hw - c, D: -L.hd - c, r: hw * 0.085, mark: 0 },
    { X: 0, D: -L.hd - L.cushion * 1.2, r: hw * 0.075, mark: 1 },
    { X: hw + c, D: -L.hd - c, r: hw * 0.085, mark: 2 },
    { X: hw + c, D: L.hd + c, r: hw * 0.085, mark: 3 },
    { X: 0, D: L.hd + L.cushion * 1.2, r: hw * 0.075, mark: 4 },
    { X: -hw - c, D: L.hd + c, r: hw * 0.085, mark: null },
  ];
  for (const p of L.pockets) Object.assign(p, at(L, p.X, p.D, 0));
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
  L.slate = {
    x: W * 0.3,
    y: H * 0.915,
    w: Math.min(W * 0.24, H * 0.36),
    a: -0.05,
  };
  L.slate.h = L.slate.w * 0.46;
  L.stool = { x: W * 0.66, y: H * 0.93, s: u };
  return L;
}

export function at(L, X, D, Z) {
  const s = L.sMid + D * L.ds;
  return { x: L.vp.x + X * s, y: L.vp.y + (L.yt - Z) * s, s };
}

// ── paint entry ─────────────────────────────────────────────────────────────

export function paintPub(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  paintBlack(ctx, L);
  paintFloorNoir(ctx, L);
  paintWindowRain(ctx, L);
  paintFloorThingsNoir(ctx, L);
  paintTableNoir(ctx, L);
  paintRackNoir(ctx, L);
  paintBeam(ctx, L);
  paintSmoke(ctx, L);
  paintNoirGrade(ctx, L);

  vignette(ctx, W, H, 0.82);
  grain(ctx, W, H, 0.055);
  addCanvasTexture(t, K.room, c);

  const pockets = L.pockets
    .filter((p) => p.mark !== null)
    .map((p) => {
      const n = POCKETS[p.mark];
      addCanvasTexture(
        t,
        pocketKey(p.mark),
        paintBall(L.r * p.s * 0.92, n, { sunk: true }),
      );
      return {
        key: pocketKey(p.mark),
        n,
        x: p.x,
        y: p.y,
        r: p.r * p.s,
        mark: p.mark,
      };
    });
  addCanvasTexture(t, K.cue, paintBall(L.r * L.cue.s, 0, {}));
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, pockets };
}

export function releasePubArt(textures) {
  for (const key of [
    ...Object.values(K),
    ...POCKETS.map((_, i) => pocketKey(i)),
  ]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// ── the void: a black canvas with a whisper of cold at the edges ────────────

function paintBlack(ctx, L) {
  const { W, H } = L;
  ctx.fillStyle = "#040506";
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0, "rgba(20,28,42,0.35)");
  g.addColorStop(0.5, "rgba(10,14,22,0.15)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ── floorboards: almost black, only lit where the lamp spills ───────────────

function paintFloorNoir(ctx, L) {
  const { W, H, u } = L;
  const rnd = lcg(1911);
  const lamp = at(L, 0, 0, 0);

  ctx.fillStyle = "#050302";
  ctx.fillRect(0, 0, W, H);

  const bh = 40 * u;
  for (let y = 0; y < H; y += bh) {
    let x = -rnd() * 260 * u;
    while (x < W) {
      const len = (200 + rnd() * 340) * u;

      const cx = x + len / 2;
      const cy = y + bh / 2;
      const dx = (cx - lamp.x) / (W * 0.55);
      const dy = (cy - lamp.y) / (H * 0.75);
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const lit = Math.max(0, 1 - d * 1.6);
      const k = lit * lit;

      const baseR = Math.round(24 + k * 68);
      const baseG = Math.round(14 + k * 42);
      const baseB = Math.round(9 + k * 22);
      ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
      ctx.fillRect(x + 1, y + 1, len - 2, bh - 2);

      if (k > 0.05) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, len - 2, bh - 2);
        ctx.clip();
        const gr = lcg(y * 977 + Math.floor(x));
        for (let i = 0; i < 10; i++) {
          const gy = y + 3 * u + gr() * (bh - 6 * u);
          const bend = (gr() - 0.5) * 8 * u;
          ctx.strokeStyle = `rgba(0,0,0,${(0.15 + gr() * 0.25).toFixed(2)})`;
          ctx.lineWidth = (0.4 + gr() * 1.1) * u;
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.quadraticCurveTo(
            x + len * 0.5,
            gy + bend,
            x + len,
            gy + (gr() - 0.5) * 4 * u,
          );
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(70,100,150,${(0.08 * (1 - k)).toFixed(2)})`;
        ctx.lineWidth = 0.8 * u;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + bh - 2);
        ctx.lineTo(x + len - 2, y + bh - 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(0,0,0,0.9)";
      ctx.fillRect(x + 1, y + bh - 3 * u, len - 2, 2.6 * u);
      ctx.fillStyle = "rgba(0,0,0,0.95)";
      ctx.fillRect(x + len - 2 * u, y + 1, 2 * u, bh - 2);
      x += len;
    }
  }

  for (let i = 0; i < 340; i++) {
    const px = rnd() * W;
    const py = rnd() * H;
    const dx = (px - lamp.x) / (W * 0.5);
    const dy = (py - lamp.y) / (H * 0.7);
    const d = Math.sqrt(dx * dx + dy * dy);
    const lit = Math.max(0, 1 - d * 1.5);
    if (lit < 0.05) continue;
    ctx.fillStyle = `rgba(${LAMP_HOT},${(0.03 + rnd() * 0.1) * lit})`;
    ctx.beginPath();
    ctx.arc(px, py, (0.5 + rnd() * 1.6) * u, 0, Math.PI * 2);
    ctx.fill();
  }

  soft(
    ctx,
    lamp.x,
    lamp.y + L.hw * 0.9,
    L.hw * 2.2,
    L.hw * 1.4,
    LAMP,
    0.14,
    "lighter",
  );
}

// ── the window: rain, cold blue, four panes ─────────────────────────────────

function paintWindowRain(ctx, L) {
  const { W, H, u } = L;
  ctx.save();
  ctx.translate(W * 0.13, H * 0.05);
  ctx.transform(1, 0.2, -0.5, 1, 0, 0);
  const pw = 90 * u;
  const ph = 120 * u;
  const mull = 7 * u;

  const sky = ctx.createLinearGradient(0, 0, pw * 2 + mull, ph * 2 + mull);
  sky.addColorStop(0, `rgba(${RAIN},0.28)`);
  sky.addColorStop(0.5, `rgba(${RAIN_COLD},0.18)`);
  sky.addColorStop(1, `rgba(${RAIN_COLD},0.08)`);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, pw * 2 + mull, ph * 2 + mull);
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(pw, 0, mull, ph * 2 + mull);
  ctx.fillRect(0, ph, pw * 2 + mull, mull);

  const rr = lcg(9001);
  for (let i = 0; i < 130; i++) {
    const rx = rr() * (pw * 2 + mull);
    const ry = rr() * (ph * 2 + mull);
    const rl = (6 + rr() * 22) * u;
    const a = 0.05 + rr() * 0.15;
    ctx.strokeStyle = `rgba(${RAIN},${a.toFixed(3)})`;
    ctx.lineWidth = (0.5 + rr() * 0.8) * u;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rl * 0.15, ry + rl);
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const rx = rr() * (pw * 2 + mull);
    const ry = rr() * (ph * 2 + mull);
    ctx.fillStyle = `rgba(${RAIN},${(0.12 + rr() * 0.2).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(rx, ry, (0.6 + rr() * 1.2) * u, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(-6 * u, ph * 2 + mull, pw * 2 + mull + 12 * u, 4 * u);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(W * 0.14, H * 0.06);
  ctx.transform(1, 0.22, -0.58, 1, 0, 0);
  const fw = 88 * u;
  const fh = 116 * u;
  const fm = 6 * u;
  soft(
    ctx,
    fw + fm,
    fh + fm,
    (fw + fm) * 3,
    (fh + fm) * 3,
    RAIN,
    0.06,
    "lighter",
  );
  for (const [px, py] of [
    [0, 0],
    [fw + fm, 0],
    [0, fh + fm],
    [fw + fm, fh + fm],
  ]) {
    const g = ctx.createLinearGradient(px, py, px + fw, py + fh);
    g.addColorStop(0, `rgba(${RAIN},0.12)`);
    g.addColorStop(0.6, `rgba(${RAIN_COLD},0.05)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(px, py, fw, fh);
  }
  ctx.restore();
}

// ── floor things: a cue, a slate, a stool, a bottle — all mostly black ─────

function paintFloorThingsNoir(ctx, L) {
  const { W, H, u } = L;

  // the cue stick
  ctx.save();
  ctx.translate(W * 0.08, H * 0.045);
  ctx.rotate(0.03);
  soft(ctx, W * 0.22, 8 * u, W * 0.24, 10 * u, "0,0,0", 0.8);
  const len = W * 0.44;
  ctx.fillStyle = "#0a0605";
  ctx.beginPath();
  ctx.moveTo(0, -6.4 * u);
  ctx.lineTo(len, -2.4 * u);
  ctx.lineTo(len, 2.4 * u);
  ctx.lineTo(0, 6.4 * u);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${LAMP},0.35)`;
  ctx.lineWidth = 0.8 * u;
  ctx.beginPath();
  ctx.moveTo(0, -5 * u);
  ctx.lineTo(len - 8 * u, -1.6 * u);
  ctx.stroke();
  ctx.fillStyle = "#050302";
  ctx.fillRect(0, -6.4 * u, len * 0.3, 12.8 * u);
  ctx.fillStyle = `rgba(${LAMP_HOT},0.5)`;
  ctx.fillRect(len - 7 * u, -2.2 * u, 3 * u, 1.2 * u);
  ctx.restore();

  // the chalk slate
  const s = L.slate;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.a);
  soft(ctx, 10 * u, 12 * u, s.w * 0.8, s.h * 0.82, "0,0,0", 0.9);
  const fr = s.h * 0.11;
  ctx.fillStyle = "#0a0605";
  ctx.beginPath();
  ctx.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 5 * u);
  ctx.fill();
  ctx.strokeStyle = `rgba(${LAMP},0.28)`;
  ctx.lineWidth = Math.max(1, u);
  ctx.beginPath();
  ctx.moveTo(-s.w / 2 + 3 * u, -s.h / 2 + 1 * u);
  ctx.lineTo(s.w / 2 - 3 * u, -s.h / 2 + 1 * u);
  ctx.stroke();
  const sg = ctx.createLinearGradient(-s.w / 2, -s.h / 2, s.w / 2, s.h / 2);
  sg.addColorStop(0, "#12181c");
  sg.addColorStop(0.5, "#0a0e12");
  sg.addColorStop(1, "#05080a");
  ctx.fillStyle = sg;
  ctx.fillRect(-s.w / 2 + fr, -s.h / 2 + fr, s.w - fr * 2, s.h - fr * 2);
  soft(
    ctx,
    -s.w * 0.15,
    -s.h * 0.05,
    s.w * 0.5,
    s.h * 0.3,
    RAIN,
    0.05,
    "lighter",
  );
  ctx.fillStyle = "rgba(180,190,200,0.03)";
  ctx.fillRect(-s.w * 0.42, -s.h * 0.34, s.w * 0.55, s.h * 0.22);
  ctx.fillStyle = "rgba(230,235,240,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fs = Math.round(s.h * 0.19);
  ctx.font = `${fs}px ${CHALK_FONT}`;
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 4 * u;
  ctx.fillText("What is missing", 0, -s.h * 0.19);
  ctx.fillText("defines the answer", 0, s.h * 0.13);
  ctx.shadowBlur = 0;
  ctx.restore();

  // chalk
  ctx.save();
  ctx.translate(s.x + s.w * 0.62, s.y + s.h * 0.22);
  ctx.rotate(0.55);
  ctx.fillStyle = "rgba(230,230,225,0.6)";
  ctx.beginPath();
  ctx.roundRect(-12 * u, -3 * u, 24 * u, 6 * u, 3 * u);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(-10 * u, -2.4 * u, 20 * u, 1 * u);
  ctx.restore();

  // the bar stool
  const st = L.stool;
  const k = st.s;
  soft(ctx, st.x + 16 * k, st.y + 12 * k, 58 * k, 46 * k, "0,0,0", 0.85);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 5.5 * k;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(st.x + Math.cos(a) * 18 * k, st.y + Math.sin(a) * 18 * k);
    ctx.lineTo(
      st.x + Math.cos(a) * 42 * k,
      st.y + Math.sin(a) * 42 * k + 7 * k,
    );
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#0a0605";
  ctx.lineWidth = 3.2 * k;
  ctx.beginPath();
  ctx.arc(st.x, st.y + 3 * k, 32 * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${LAMP},0.5)`;
  ctx.lineWidth = 0.9 * k;
  ctx.beginPath();
  ctx.arc(st.x, st.y + 3 * k, 32 * k, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.fillStyle = "#020101";
  ctx.beginPath();
  ctx.arc(st.x, st.y + 2 * k, 27 * k, 0, Math.PI * 2);
  ctx.fill();
  const seatG = ctx.createRadialGradient(
    st.x - 11 * k,
    st.y - 13 * k,
    2 * k,
    st.x,
    st.y,
    26 * k,
  );
  seatG.addColorStop(0, "#5a1a1a");
  seatG.addColorStop(0.35, "#3a1012");
  seatG.addColorStop(0.75, "#180608");
  seatG.addColorStop(1, "#040101");
  ctx.fillStyle = seatG;
  ctx.beginPath();
  ctx.arc(st.x, st.y, 25 * k, 0, Math.PI * 2);
  ctx.fill();
  soft(ctx, st.x - 8 * k, st.y - 10 * k, 22 * k, 14 * k, LAMP, 0.4, "lighter");
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      st.x + Math.cos(a) * 13 * k,
      st.y + Math.sin(a) * 13 * k,
      1.9 * k,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(st.x, st.y, 2.1 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${LAMP},0.35)`;
  ctx.lineWidth = 1 * k;
  ctx.beginPath();
  ctx.moveTo(st.x + 6 * k, st.y + 4 * k);
  ctx.lineTo(st.x + 17 * k, st.y + 13 * k);
  ctx.stroke();

  // the empty bottle
  ctx.save();
  ctx.translate(st.x + 64 * k, st.y + 24 * k);
  ctx.rotate(-0.95);
  soft(ctx, 4 * k, 6 * k, 44 * k, 18 * k, "0,0,0", 0.75);
  const bgg = ctx.createLinearGradient(0, -9 * k, 0, 9 * k);
  bgg.addColorStop(0, "rgba(20,60,32,0.95)");
  bgg.addColorStop(0.5, "rgba(8,32,16,0.95)");
  bgg.addColorStop(1, "rgba(2,10,5,1)");
  ctx.fillStyle = bgg;
  ctx.beginPath();
  ctx.roundRect(-26 * k, -9 * k, 34 * k, 18 * k, 7 * k);
  ctx.fill();
  ctx.fillRect(6 * k, -4 * k, 22 * k, 8 * k);
  ctx.strokeStyle = `rgba(${LAMP_HOT},0.55)`;
  ctx.lineWidth = 0.9 * k;
  ctx.beginPath();
  ctx.moveTo(-22 * k, -6 * k);
  ctx.lineTo(6 * k, -6 * k);
  ctx.stroke();
  ctx.fillStyle = "rgba(200,180,140,0.15)";
  ctx.fillRect(-14 * k, -7 * k, 14 * k, 14 * k);
  ctx.restore();
}

// ── the table, in chiaroscuro ───────────────────────────────────────────────

function paintTableNoir(ctx, L) {
  const { u, hw, hd } = L;
  const cu = L.cushion;
  const rl = L.rail;
  const z = L.railZ;
  const P = (X, D, Z = 0) => at(L, X, D, Z);
  const out = { X: hw + cu + rl, D: hd + cu + rl };

  // shadow on the floor
  const sh = P(0, out.D * 0.25, -hw * 0.6);
  soft(
    ctx,
    sh.x + hw * 0.05,
    sh.y + hw * 0.06,
    out.X * 1.35,
    out.D * 1.45,
    "0,0,0",
    0.95,
  );
  soft(ctx, sh.x, sh.y, out.X * 1.0, out.D * 1.1, "0,0,0", 0.7);

  // the apron
  const nl = P(-out.X, out.D, z);
  const nr = P(out.X, out.D, z);
  const aprH = hw * 0.2;
  ctx.fillStyle = "#040202";
  ctx.beginPath();
  ctx.roundRect(nl.x, nl.y - 2 * u, nr.x - nl.x, aprH, [0, 0, 12 * u, 12 * u]);
  ctx.fill();
  ctx.strokeStyle = `rgba(${LAMP},0.45)`;
  ctx.lineWidth = Math.max(1, u * 1.1);
  ctx.beginPath();
  ctx.moveTo(nl.x + 4 * u, nl.y - 1 * u);
  ctx.lineTo(nr.x - 4 * u, nl.y - 1 * u);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${RAIN_COLD},0.18)`;
  ctx.lineWidth = Math.max(1, u);
  ctx.strokeRect(
    nl.x + hw * 0.14,
    nl.y + aprH * 0.24,
    nr.x - nl.x - hw * 0.28,
    aprH * 0.52,
  );
  for (const lx of [nl.x + hw * 0.05, nr.x - hw * 0.05]) {
    const lg = ctx.createRadialGradient(
      lx - hw * 0.02,
      nl.y + aprH * 0.9,
      2 * u,
      lx,
      nl.y + aprH * 0.95,
      hw * 0.08,
    );
    lg.addColorStop(0, `rgba(${LAMP},0.35)`);
    lg.addColorStop(0.4, "#1a0a04");
    lg.addColorStop(1, "#000000");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(
      lx,
      nl.y + aprH * 0.95,
      hw * 0.062,
      hw * 0.036,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // the rails
  const corner = hw * 0.065;
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
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.95)";
  ctx.shadowBlur = 16 * u;
  ctx.shadowOffsetY = 5 * u;
  ctx.fillStyle = "#060302";
  ctx.fill();
  ctx.restore();
  const warmRim = ctx.createLinearGradient(0, rp[0].y, 0, rp[3].y);
  warmRim.addColorStop(0, `rgba(${LAMP},0.15)`);
  warmRim.addColorStop(0.5, `rgba(${LAMP},0.55)`);
  warmRim.addColorStop(1, `rgba(${LAMP},0.3)`);
  ctx.strokeStyle = warmRim;
  ctx.lineWidth = Math.max(1, u * 1.6);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rp[0].x + corner, rp[0].y);
  ctx.arcTo(rp[1].x, rp[1].y, rp[2].x, rp[2].y, corner);
  ctx.arcTo(rp[2].x, rp[2].y, rp[3].x, rp[3].y, corner);
  ctx.arcTo(rp[3].x, rp[3].y, rp[0].x, rp[0].y, corner);
  ctx.arcTo(rp[0].x, rp[0].y, rp[1].x, rp[1].y, corner);
  ctx.closePath();
  ctx.clip();
  const grn = lcg(731);
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1;
    const d = side * (hd + cu + rl * (0.15 + grn() * 0.75));
    const a = P(-out.X + grn() * hw * 0.5, d, z);
    const b = P(out.X - grn() * hw * 0.5, d, z);
    const nearNear = side > 0;
    ctx.strokeStyle = nearNear
      ? `rgba(${LAMP},${(0.06 + grn() * 0.12).toFixed(2)})`
      : `rgba(0,0,0,${(0.5 + grn() * 0.4).toFixed(2)})`;
    ctx.lineWidth = (0.5 + grn() * 0.9) * u;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const nearLight = P(0, out.D * 0.9, z);
  soft(
    ctx,
    nearLight.x,
    nearLight.y - hw * 0.05,
    hw * 1.4,
    hw * 0.4,
    LAMP,
    0.35,
    "lighter",
  );
  const farRim = P(-out.X * 0.6, -out.D * 0.9, z);
  soft(
    ctx,
    farRim.x,
    farRim.y + hw * 0.03,
    hw * 1.2,
    hw * 0.24,
    RAIN,
    0.22,
    "lighter",
  );
  ctx.restore();

  // the cushions
  const inner = [
    P(-hw - cu, -hd - cu, z),
    P(hw + cu, -hd - cu, z),
    P(hw + cu, hd + cu, z),
    P(-hw - cu, hd + cu, z),
  ];
  polygon(ctx, inner);
  ctx.fillStyle = "#04120a";
  ctx.fill();

  // the felt
  const felt = [P(-hw, -hd), P(hw, -hd), P(hw, hd), P(-hw, hd)];
  polygon(ctx, felt);
  ctx.fillStyle = "#061612";
  ctx.fill();

  ctx.save();
  ctx.clip();
  const mid = P(0, 0, 0);

  soft(ctx, mid.x, mid.y, hw * 1.6, hw * 0.95, LAMP, 0.32, "lighter");
  soft(ctx, mid.x, mid.y, hw * 1.0, hw * 0.6, LAMP_HOT, 0.22, "lighter");
  soft(ctx, mid.x, mid.y, hw * 0.55, hw * 0.35, LAMP_HOT, 0.18, "lighter");

  soft(
    ctx,
    P(-hw * 0.6, -hd * 0.7, 0).x,
    P(-hw * 0.6, -hd * 0.7, 0).y,
    hw * 1.1,
    hd * 1.1,
    RAIN,
    0.09,
    "lighter",
  );

  soft(ctx, felt[0].x, felt[0].y, hw * 0.8, hd * 0.8, "0,0,0", 0.6);
  soft(ctx, felt[1].x, felt[1].y, hw * 0.8, hd * 0.8, "0,0,0", 0.6);
  soft(ctx, felt[3].x, felt[3].y, hw * 0.8, hd * 0.8, "0,0,0", 0.6);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(felt[0].x, felt[0].y, felt[1].x - felt[0].x, cu * 0.6);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(felt[0].x, felt[0].y, cu * 0.55, felt[2].y - felt[0].y);

  for (let i = 0; i < 900; i++) {
    const p = P((grn() * 2 - 1) * hw, (grn() * 2 - 1) * hd);
    const dx = (p.x - mid.x) / (hw * 1.4);
    const dy = (p.y - mid.y) / (hw * 0.9);
    const lit = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
    if (lit < 0.12) continue;
    const warm = grn() < 0.6;
    const a = (0.02 + grn() * 0.05) * lit;
    ctx.fillStyle = warm
      ? `rgba(${LAMP_HOT},${a.toFixed(3)})`
      : `rgba(0,20,10,${a.toFixed(3)})`;
    ctx.fillRect(p.x, p.y, 0.9 * u, 0.9 * u);
  }
  for (let i = 0; i < 4; i++) {
    const p = P((grn() * 1.6 - 0.8) * hw, (grn() * 1.6 - 0.8) * hd);
    soft(ctx, p.x, p.y, 14 * u, 9 * u, "80,110,140", 0.18);
  }
  for (const X of [-hw / 2, hw / 2]) {
    const p = P(X, 0);
    ctx.fillStyle = `rgba(${LAMP_HOT},0.5)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // sights
  const sight = (X, D) => {
    const p = P(X, D, z);
    const k = 4.2 * u * p.s;
    ctx.fillStyle = "#040302";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - k - 0.6 * u);
    ctx.lineTo(p.x + k * 0.75, p.y + 0.6 * u);
    ctx.lineTo(p.x, p.y + k + 0.6 * u);
    ctx.lineTo(p.x - k * 0.75, p.y + 0.6 * u);
    ctx.closePath();
    ctx.fill();
    const pg = ctx.createLinearGradient(
      p.x - k * 0.7,
      p.y - k,
      p.x + k * 0.7,
      p.y + k,
    );
    pg.addColorStop(0, `rgba(${LAMP_HOT},0.85)`);
    pg.addColorStop(0.6, "rgba(180,175,165,0.75)");
    pg.addColorStop(1, "rgba(60,70,90,0.6)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - k);
    ctx.lineTo(p.x + k * 0.7, p.y);
    ctx.lineTo(p.x, p.y + k);
    ctx.lineTo(p.x - k * 0.7, p.y);
    ctx.closePath();
    ctx.fill();
  };
  const midZ = cu + rl * 0.55;
  for (const f of [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]) {
    sight(f * hw, -hd - midZ);
    sight(f * hw, hd + midZ);
  }
  for (const f of [-0.5, 0, 0.5]) {
    sight(-hw - midZ, f * hd);
    sight(hw + midZ, f * hd);
  }

  // pockets
  for (const p of L.pockets) {
    const rr = p.r * p.s;
    ctx.fillStyle = "#050302";
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr * 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${LAMP},0.4)`;
    ctx.lineWidth = Math.max(1, u * 1.2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr * 1.35, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${RAIN_COLD},0.35)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr * 1.35, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${LAMP},0.15)`;
    ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr * 0.98, Math.PI * 0.85, Math.PI * 1.95);
    ctx.stroke();
  }

  // brass plates I–V
  for (const p of L.pockets) {
    if (p.mark === null) continue;
    const isMiddle = p.X === 0;
    const plateX = isMiddle
      ? p.X + hw * 0.16
      : p.X + (p.X < 0 ? 1 : -1) * hw * 0.2;
    const far = p.D < 0;
    const plateD = (far ? -1 : 1) * (hd + cu + rl * 0.55);
    const pp = P(plateX, plateD, z);
    const pw = hw * 0.11 * pp.s;
    const ph = hw * 0.056 * pp.s;

    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.beginPath();
    ctx.roundRect(
      pp.x - pw / 2 + 1.5 * u,
      pp.y - ph / 2 + 2.5 * u,
      pw,
      ph,
      ph * 0.28,
    );
    ctx.fill();
    const bg = ctx.createLinearGradient(0, pp.y - ph / 2, 0, pp.y + ph / 2);
    bg.addColorStop(0, `rgba(${LAMP_HOT},0.95)`);
    bg.addColorStop(0.35, "#a97a28");
    bg.addColorStop(0.75, "#3a2408");
    bg.addColorStop(1, "#100804");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(pp.x - pw / 2, pp.y - ph / 2, pw, ph, ph * 0.28);
    ctx.fill();
    ctx.strokeStyle = `rgba(${LAMP_HOT},0.6)`;
    ctx.lineWidth = Math.max(1, u * 0.9);
    ctx.beginPath();
    ctx.moveTo(pp.x - pw / 2 + 2 * u, pp.y - ph / 2 + u);
    ctx.lineTo(pp.x + pw / 2 - 2 * u, pp.y - ph / 2 + u);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.roundRect(pp.x - pw / 2, pp.y - ph / 2, pw, ph, ph * 0.28);
    ctx.stroke();
    ctx.fillStyle = "#0a0503";
    ctx.font = `700 ${Math.round(ph * 0.74)}px ${PLATE_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(POCKET_MARKS[p.mark], pp.x, pp.y + ph * 0.05);
    ctx.fillStyle = "#1a0e04";
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        pp.x + e * pw * 0.4,
        pp.y,
        Math.max(0.7, ph * 0.08),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // blue chalk cube
  const ch = P(-hw * 0.32, hd + cu + rl * 0.5, z);
  const cs = 11.5 * u * ch.s;
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(ch.x - cs / 2 + 2 * u, ch.y - cs / 2 + 3 * u, cs, cs);
  const cbg = ctx.createLinearGradient(
    ch.x,
    ch.y - cs / 2,
    ch.x,
    ch.y + cs / 2,
  );
  cbg.addColorStop(0, "#3a6ab0");
  cbg.addColorStop(1, "#0e1e40");
  ctx.fillStyle = cbg;
  ctx.fillRect(ch.x - cs / 2, ch.y - cs / 2, cs, cs);
  ctx.fillStyle = `rgba(${RAIN},0.4)`;
  ctx.fillRect(ch.x - cs * 0.3, ch.y - cs * 0.3, cs * 0.6, cs * 0.6);
}

// ── the rack: same shapes, mostly in shadow ─────────────────────────────────

function paintRackNoir(ctx, L) {
  const { r, hw } = L;
  const apex = { X: hw / 2 - r * 2.6, D: 0 };
  const back = hw / 2 + 4 * r * Math.sqrt(3) * 1.02 + r * 1.35;
  const half = 4 * r * 1.02 + r * 2.2;
  const tri = [
    at(L, apex.X, apex.D, r * 0.4),
    at(L, back, -half, r * 0.4),
    at(L, back, half, r * 0.4),
  ];

  ctx.save();
  polygon(ctx, tri);
  ctx.translate(r * 0.5, r * 0.6);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fill();
  ctx.restore();

  polygon(ctx, tri);
  ctx.strokeStyle = "#0a0605";
  ctx.lineWidth = r * 0.55;
  ctx.lineJoin = "round";
  ctx.stroke();
  polygon(ctx, tri);
  ctx.save();
  ctx.translate(-r * 0.05, -r * 0.12);
  ctx.strokeStyle = `rgba(${LAMP},0.55)`;
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  ctx.restore();
  polygon(ctx, tri);
  ctx.save();
  ctx.translate(r * 0.06, r * 0.1);
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = r * 0.14;
  ctx.stroke();
  ctx.restore();

  for (const b of L.rack) {
    const p = at(L, b.X, b.D, 0);
    if (b.n === null) {
      soft(ctx, p.x, p.y, r * p.s * 1.05, r * p.s * 1.05, "30,80,55", 0.28);
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * p.s * 0.88, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    soft(ctx, p.x + r * 0.5, p.y + r * 0.6, r * 1.35, r * 1.05, "0,0,0", 0.85);
    const ball = paintBall(r * b.s, b.n, {});
    const dW = ball.width / 2;
    const dH = ball.height / 2;
    ctx.drawImage(ball, p.x - dW / 2, p.y - dH / 2, dW, dH);
  }

  const c = at(L, L.cue.X, L.cue.D, 0);
  soft(ctx, c.x + r * 0.5, c.y + r * 0.6, r * 1.35, r * 1.05, "0,0,0", 0.85);
}

// ── the lamp's beam: a visible cone of light with smoke in it ──────────────

function paintBeam(ctx, L) {
  const { hw, H } = L;
  const c = at(L, 0, 0, 0);
  const top = { x: c.x, y: c.y - H * 0.55 };

  const coneW = hw * 1.7;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cg = ctx.createLinearGradient(top.x, top.y, c.x, c.y + hw * 0.2);
  cg.addColorStop(0, `rgba(${LAMP_HOT},0.16)`);
  cg.addColorStop(0.5, `rgba(${LAMP},0.11)`);
  cg.addColorStop(1, `rgba(${LAMP},0.02)`);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(top.x - hw * 0.15, top.y);
  ctx.lineTo(top.x + hw * 0.15, top.y);
  ctx.lineTo(c.x + coneW, c.y + hw * 0.35);
  ctx.lineTo(c.x - coneW, c.y + hw * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  soft(ctx, c.x, c.y, hw * 1.35, hw * 0.9, LAMP, 0.28, "lighter");
  soft(ctx, c.x, c.y, hw * 0.7, hw * 0.45, LAMP_HOT, 0.24, "lighter");
  soft(ctx, c.x, c.y, hw * 0.34, hw * 0.22, LAMP_HOT, 0.22, "lighter");
}

// ── smoke drifting through the beam (painted in, static) ────────────────────

function paintSmoke(ctx, L) {
  const { W, H, u } = L;
  const c = at(L, 0, 0, 0);
  const rnd = lcg(7721);
  for (let i = 0; i < 60; i++) {
    const ang = rnd() * Math.PI * 2;
    const rr = Math.pow(rnd(), 0.7) * Math.min(W, H) * 0.4;
    const x = c.x + Math.cos(ang) * rr;
    const y = c.y - H * 0.15 + Math.sin(ang) * rr * 0.6;
    const size = (20 + rnd() * 90) * u;
    const a = (0.02 + rnd() * 0.05) * (1 - rr / (Math.min(W, H) * 0.4));
    soft(ctx, x, y, size, size * (0.5 + rnd() * 0.4), SMOKE, a, "lighter");
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const sx = c.x + (rnd() - 0.5) * W * 0.35;
    const sy = c.y + (rnd() - 0.5) * H * 0.1;
    const g = ctx.createRadialGradient(
      sx,
      sy,
      5 * u,
      sx,
      sy,
      (100 + rnd() * 120) * u,
    );
    g.addColorStop(0, `rgba(${SMOKE},0.045)`);
    g.addColorStop(0.5, `rgba(${SMOKE},0.015)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx - 200 * u, sy - 200 * u, 400 * u, 400 * u);
  }
  ctx.restore();
}

// ── the final grade: cold steel edges, warm amber heart ────────────────────

function paintNoirGrade(ctx, L) {
  const { W, H } = L;
  const c = at(L, 0, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const cool = ctx.createLinearGradient(0, 0, 0, H);
  cool.addColorStop(0, "rgba(120,140,180,0.9)");
  cool.addColorStop(0.55, "rgba(160,170,200,0.85)");
  cool.addColorStop(1, "rgba(180,180,200,0.8)");
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createRadialGradient(
    c.x,
    c.y,
    Math.min(W, H) * 0.08,
    c.x,
    c.y,
    Math.max(W, H) * 0.7,
  );
  g.addColorStop(0, `rgba(${LAMP},0.14)`);
  g.addColorStop(0.5, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── a ball, painted as a real sphere lit by a single amber lamp ────────────
//
// Layered like a renderer:
//   1. flat base pattern (colour / stripe / number)
//   2. diffuse shadow — darkens away from the light point
//   3. warm key tint from the lamp (upper-left)
//   4. cold fill from the rainy window (lower-right)
//   5. felt bounce — a green rise from below
//   6. fresnel — the silhouette darkens all round
//   7. two speculars (broad soft + tiny sharp)
//   8. if sunk, the lower half falls into black
//
// n = 0 is the cue ball. Painted at 2× size; the caller draws at half.

export function paintBall(r, n, { sunk = false } = {}) {
  const R = 2;
  const size = Math.ceil(r * 2.2 * R);
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = size / (2 * R);
  const cy = size / (2 * R);

  const base = n === 0 ? "#f2ece0" : ballColour(n);
  const stripe = n > 0 && isStripe(n);

  const lx = cx - r * 0.4;
  const ly = cy - r * 0.44;
  const fx = cx + r * 0.5;
  const fy = cy + r * 0.55;

  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();

  // ── 1. flat base pattern
  if (stripe) {
    g.fillStyle = "#e8e2d2";
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.save();
    g.translate(cx, cy);
    g.rotate(((n * 47) % 90) * (Math.PI / 180) - 0.5);
    g.fillStyle = base;
    g.beginPath();
    g.ellipse(0, 0, r * 1.55, r * 0.62, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  } else {
    g.fillStyle = base;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  if (!sunk && n > 0) {
    const nx = cx - r * 0.05;
    const ny = cy - r * 0.05;
    const nr = r * 0.44;
    g.fillStyle = "#f6f2e6";
    g.beginPath();
    g.arc(nx, ny, nr, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#0a0a0a";
    g.font = `700 ${Math.round(r * (n > 9 ? 0.5 : 0.58))}px ${PLATE_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), nx, ny + r * 0.03);
  }

  // ── 2. diffuse shadow
  const shadow = g.createRadialGradient(lx, ly, r * 0.06, lx, ly, r * 1.75);
  shadow.addColorStop(0.0, "rgba(0,0,0,0)");
  shadow.addColorStop(0.22, "rgba(0,0,0,0.04)");
  shadow.addColorStop(0.45, "rgba(0,0,0,0.15)");
  shadow.addColorStop(0.68, "rgba(0,0,0,0.42)");
  shadow.addColorStop(0.86, "rgba(0,2,10,0.72)");
  shadow.addColorStop(1.0, "rgba(0,2,10,0.95)");
  g.fillStyle = shadow;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  // ── 3. warm key
  const warm = g.createRadialGradient(lx, ly, 0, lx, ly, r * 1.25);
  warm.addColorStop(0.0, "rgba(255,205,130,0.55)");
  warm.addColorStop(0.32, "rgba(255,190,110,0.26)");
  warm.addColorStop(0.62, "rgba(255,170,90,0.08)");
  warm.addColorStop(1.0, "rgba(255,160,80,0)");
  g.fillStyle = warm;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  // ── 4. cool fill
  const cold = g.createRadialGradient(fx, fy, 0, fx, fy, r * 1.1);
  cold.addColorStop(0.0, "rgba(80,120,190,0.32)");
  cold.addColorStop(0.55, "rgba(70,100,160,0.12)");
  cold.addColorStop(1.0, "rgba(60,90,150,0)");
  g.fillStyle = cold;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  // ── 5. felt bounce
  const bounce = g.createRadialGradient(
    cx,
    cy + r * 0.85,
    0,
    cx,
    cy + r * 0.7,
    r * 0.85,
  );
  bounce.addColorStop(0.0, "rgba(60,130,85,0.32)");
  bounce.addColorStop(0.55, "rgba(50,100,70,0.12)");
  bounce.addColorStop(1.0, "rgba(40,80,60,0)");
  g.fillStyle = bounce;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  // ── 6. fresnel
  const fres = g.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
  fres.addColorStop(0.0, "rgba(0,0,0,0)");
  fres.addColorStop(0.5, "rgba(0,5,15,0.14)");
  fres.addColorStop(0.78, "rgba(0,5,15,0.4)");
  fres.addColorStop(1.0, "rgba(0,3,12,0.82)");
  g.fillStyle = fres;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  // ── 7. speculars
  const sp1 = g.createRadialGradient(lx, ly, 0, lx, ly, r * 0.55);
  sp1.addColorStop(0.0, "rgba(255,250,235,0.85)");
  sp1.addColorStop(0.3, "rgba(255,245,220,0.42)");
  sp1.addColorStop(0.6, "rgba(255,240,210,0.1)");
  sp1.addColorStop(1.0, "rgba(255,240,210,0)");
  g.fillStyle = sp1;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  const hx = lx - r * 0.07;
  const hy = ly - r * 0.09;
  const sp2 = g.createRadialGradient(hx, hy, 0, hx, hy, r * 0.2);
  sp2.addColorStop(0.0, "rgba(255,255,255,1)");
  sp2.addColorStop(0.28, "rgba(255,255,255,0.88)");
  sp2.addColorStop(0.58, "rgba(255,250,230,0.3)");
  sp2.addColorStop(1.0, "rgba(255,250,230,0)");
  g.fillStyle = sp2;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);

  // ── 8. sunk: the lower half falls into the pocket's dark
  if (sunk) {
    const deep = g.createLinearGradient(0, cy - r, 0, cy + r);
    deep.addColorStop(0.0, "rgba(0,0,0,0)");
    deep.addColorStop(0.3, "rgba(0,0,0,0.18)");
    deep.addColorStop(0.62, "rgba(0,0,0,0.58)");
    deep.addColorStop(0.88, "rgba(0,0,0,0.88)");
    deep.addColorStop(1.0, "rgba(0,0,0,0.96)");
    g.fillStyle = deep;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  g.restore();
  return c;
}
