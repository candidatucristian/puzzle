// ═══════════════════════════════════════════════════════════════════════════
// pub.js — the abandoned pub for BILLIARDS.
//
// The room is real space, in centimetres, seen by one camera standing at the
// long side of the table and looking down across it: the table has legs, an
// apron, rails with thickness, pockets that go down into it; the balls are
// spheres standing on the cloth, each with its shadow. One billiard lamp —
// three green shades on a brass bar — hangs over the table and is the only
// warm light; the window at the back is rain and street lamps, and lays a
// cold patch on the boards. Everything else goes to the dark.
//
// Painted once per screen size: the room; the ball down in each marked pocket
// (they rattle); the cue ball (it can be nudged); the glow.
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

const LAMP = "255,188,112"; // the lamp's amber
const LAMP_HOT = "255,224,170"; // its hottest core
const RAIN = "120,150,195"; // the window's cold blue
const SODIUM = "255,160,70"; // street lamps beyond the glass

const CHALK_FONT = '"Architects Daughter", "Special Elite", cursive';
const PLATE_FONT = 'Georgia, "Times New Roman", serif';

// ── layout ─────────────────────────────────────────────────────────────────

export function layoutPub(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  // the camera: raised, tilted down, at the middle of the table's long side
  const focal = Math.min(H * 1.14, W * 0.66);
  const cx = W / 2;
  const cy = H * 0.47;
  const eyeY = 250;
  const pitch = 0.6;
  const sp = Math.sin(pitch);
  const cp = Math.cos(pitch);
  // X across, Y up from the floor, Z away from us
  L.P = (X, Y, Z) => {
    const dy = Y - eyeY;
    const depth = Z * cp - dy * sp;
    const up = dy * cp + Z * sp;
    const s = focal / depth;
    return { x: cx + X * s, y: cy - up * s, s };
  };
  L.T = 80; // the cloth's height
  L.Zc = 215; // the table's middle
  L.WZ = 400; // the back wall
  L.hw = 99; // half the cloth's length
  L.hd = 49.5; // half its width
  L.cu = 5; // cushion
  L.rl = 15; // rail
  L.railH = 4.6; // how far the rails stand above the cloth
  L.r = 5.8; // a ball
  const { hw, hd, cu, r } = L;
  const c = cu * 0.4;
  L.pockets = [
    { X: -hw - c, D: -hd - c, r: 9.2, mark: 0 },
    { X: 0, D: -hd - cu - 1.5, r: 8.4, mark: 1 },
    { X: hw + c, D: -hd - c, r: 9.2, mark: 2 },
    { X: hw + c, D: hd + c, r: 9.2, mark: 3 },
    { X: 0, D: hd + cu + 1.5, r: 8.4, mark: 4 },
    { X: -hw - c, D: hd + c, r: 9.2, mark: null },
  ];
  for (const p of L.pockets) Object.assign(p, at(L, p.X, p.D, L.railH));
  L.rackX = 24;
  L.rack = [];
  RACK.forEach((col, ci) => {
    col.forEach((n, j) => {
      const X = L.rackX + ci * r * Math.sqrt(3) * 1.02;
      const D = (j - (col.length - 1) / 2) * r * 2.04;
      L.rack.push({ n, X, D, ...at(L, X, D, r) });
    });
  });
  L.cue = { X: -52, D: 4, ...at(L, -52, 4, r) };
  L.cue.to = at(L, -52 + 14, 4, r);
  // where the lamp's light lies, and how wide the table is on the screen
  L.spot = at(L, 0, 0, 0);
  L.span = at(L, hw, 0, 0).x - L.spot.x;
  return L;
}

// a place on the table: X along it, D across it toward us, h above the cloth
function at(L, X, D, h = 0) {
  return L.P(X, L.T + h, L.Zc - D);
}

// How dark the room is at a place on the screen: nothing under the lamp,
// deep in the corners; the window keeps its own light.
function gloom(L, x, y) {
  const d = Math.hypot((x - L.spot.x) / (L.W * 0.72), (y - L.spot.y) / (L.H * 0.66));
  const win = L.win;
  let open = 1;
  if (win) {
    const wd = Math.hypot((x - win.x) / win.rx, (y - win.y) / win.ry);
    open = 1 - 0.75 * Math.min(1, Math.max(0, 1.6 - wd));
  }
  return Math.min(0.86, Math.max(0, d - 0.3) * 1.15) * open;
}

// draw flat on a plane: `o` its origin on the screen, `ex` and `ey` one unit
// along its two axes
function plane(ctx, o, ex, ey, draw) {
  ctx.save();
  ctx.transform(ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, o.x, o.y);
  draw();
  ctx.restore();
}

// flat on the table at a place: x along it, y toward us, in centimetres
function onTable(ctx, L, X, D, h, draw) {
  plane(ctx, at(L, X, D, h), at(L, X + 1, D, h), at(L, X, D + 1, h), draw);
}

// a level circle in the room, as the camera sees it
function ring(ctx, L, X, D, h, rad, n = 32) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = at(L, X + Math.cos(a) * rad, D + Math.sin(a) * rad, h);
    if (i) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  }
  ctx.closePath();
}

// ── paint entry ─────────────────────────────────────────────────────────────

export function paintPub(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  paintFloor(ctx, L);
  paintWall(ctx, L);
  paintWindowLight(ctx, L);
  paintTable(ctx, L);
  paintRack(ctx, L);
  paintLeaningCue(ctx, L);
  paintGloom(ctx, L);
  paintLamp(ctx, L);

  vignette(ctx, W, H, 0.7);
  grain(ctx, W, H, 0.04);
  addCanvasTexture(t, K.room, c);

  const pockets = L.pockets
    .filter((p) => p.mark !== null)
    .map((p) => {
      const n = POCKETS[p.mark];
      addCanvasTexture(t, pocketKey(p.mark), paintSunk(L, p, n));
      return { key: pocketKey(p.mark), n, x: p.x, y: p.y, r: p.r * p.s, mark: p.mark };
    });
  addCanvasTexture(
    t,
    K.cue,
    paintBall(L.r * L.cue.s, 0, { lean: -L.cue.X / L.hw, dim: gloom(L, L.cue.x, L.cue.y) * 0.5 }),
  );
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, pockets };
}

export function releasePubArt(textures) {
  for (const key of [...Object.values(K), ...POCKETS.map((_, i) => pocketKey(i))]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// ── the floor: old boards running away from us ──────────────────────────────

function paintFloor(ctx, L) {
  const { W, H, P, u } = L;
  ctx.fillStyle = "#0c0705";
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(1911);
  const z0 = -60;
  const z1 = L.WZ;
  const bw = 15;
  for (let X = -480; X < 480; X += bw) {
    const a = P(X, 0, z0);
    const b = P(X + bw, 0, z0);
    const c = P(X + bw, 0, z1);
    const d = P(X, 0, z1);
    const k = 0.75 + rnd() * 0.5;
    ctx.fillStyle = `rgb(${Math.round(58 * k)},${Math.round(36 * k)},${Math.round(22 * k)})`;
    polygon(ctx, [a, b, c, d]);
    ctx.fill();
    // the gap beside it, a joint or two along it, its grain
    ctx.strokeStyle = "rgba(4,2,1,0.85)";
    ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
    for (let j = 0; j < 2; j++) {
      const z = z0 + rnd() * (z1 - z0);
      const p = P(X, 0, z);
      const q = P(X + bw, 0, z);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(0.5, 0.7 * u);
    for (let j = 0; j < 3; j++) {
      const gx = X + bw * (0.15 + rnd() * 0.7);
      const p = P(gx, 0, z0);
      const q = P(gx + (rnd() - 0.5) * 3, 0, z1);
      ctx.strokeStyle = rnd() < 0.6 ? "rgba(8,4,2,0.3)" : "rgba(255,200,150,0.05)";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }
  // the lamp's spill on the boards round the table
  const f = P(0, 0, L.Zc - 20);
  soft(ctx, f.x, f.y, L.span * 1.9, L.span * 0.7, LAMP, 0.22, "lighter");
}

// ── the back wall: paper over panelling, the window, the slate, the cues ────

function paintWall(ctx, L) {
  const { P, u, WZ } = L;
  const Wp = (X, Y) => P(X, Y, WZ);
  const rect = (x0, y0, x1, y1) => polygon(ctx, [Wp(x0, y1), Wp(x1, y1), Wp(x1, y0), Wp(x0, y0)]);
  const dado = 96;
  // the paper: a dark green, a faint stripe in it
  rect(-560, dado, 560, 320);
  ctx.fillStyle = "#12241e";
  ctx.fill();
  for (let X = -560; X < 560; X += 14) {
    rect(X, dado, X + 7, 320);
    ctx.fillStyle = "rgba(190,220,190,0.035)";
    ctx.fill();
  }
  // the panelling under the dado rail
  rect(-560, 0, 560, dado);
  const wg = ctx.createLinearGradient(0, Wp(0, dado).y, 0, Wp(0, 0).y);
  wg.addColorStop(0, "#3a2012");
  wg.addColorStop(1, "#1e0f08");
  ctx.fillStyle = wg;
  ctx.fill();
  for (let X = -540; X < 540; X += 62) {
    rect(X + 6, 18, X + 56, dado - 12);
    ctx.strokeStyle = "rgba(6,3,1,0.75)";
    ctx.lineWidth = Math.max(1, 1.6 * u);
    ctx.stroke();
    rect(X + 9, 21, X + 53, dado - 15);
    ctx.strokeStyle = "rgba(255,200,150,0.07)";
    ctx.lineWidth = Math.max(0.6, u);
    ctx.stroke();
  }
  rect(-560, dado - 3, 560, dado + 3);
  ctx.fillStyle = "#4a2a16";
  ctx.fill();
  rect(-560, dado + 2, 560, dado + 3);
  ctx.fillStyle = "rgba(255,210,160,0.2)";
  ctx.fill();
  rect(-560, 0, 560, 11);
  ctx.fillStyle = "#170b06";
  ctx.fill();
  // where the wall meets the boards
  const base = Wp(0, 0);
  const sh = ctx.createLinearGradient(0, base.y, 0, base.y + 40 * u);
  sh.addColorStop(0, "rgba(0,0,0,0.7)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, base.y, L.W, 40 * u);

  paintWindow(ctx, L, Wp, rect);
  paintSlate(ctx, L, Wp, rect);
  paintCueRack(ctx, L, Wp, rect);
}

// the window: a tall sash, the night and the rain on it, street lamps blurred
// beyond the wet glass
function paintWindow(ctx, L, Wp, rect) {
  const { u } = L;
  const x0 = -312;
  const x1 = -182;
  const y0 = 72;
  const y1 = 300;
  const mid = Wp((x0 + x1) / 2, 130);
  L.win = { x: mid.x, y: mid.y, rx: (Wp(x1, 130).x - Wp(x0, 130).x) * 0.8, ry: (Wp(0, y0).y - Wp(0, 190).y) * 0.6 };
  // the frame, standing a little proud of the wall
  rect(x0 - 9, y0 - 9, x1 + 9, y1);
  ctx.fillStyle = "#24140b";
  ctx.fill();
  rect(x0, y0, x1, y1);
  ctx.save();
  ctx.clip();
  const top = Wp(0, 200).y;
  const bot = Wp(0, y0).y;
  const sky = ctx.createLinearGradient(0, top, 0, bot);
  sky.addColorStop(0, "#0a1322");
  sky.addColorStop(1, "#1a2c48");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, L.W, L.H);
  // the houses across the street, a few windows lit in them
  const rnd = lcg(9001);
  let hx = x0;
  while (hx < x1) {
    const w = 18 + rnd() * 26;
    const h = 96 + rnd() * 34;
    rect(hx, y0, hx + w, h);
    ctx.fillStyle = "#070b14";
    ctx.fill();
    for (let wy = y0 + 8; wy < h - 6; wy += 9) {
      for (let wx = hx + 3; wx < hx + w - 5; wx += 7) {
        if (rnd() < 0.2) {
          rect(wx, wy, wx + 3.4, wy + 4.6);
          ctx.fillStyle = `rgba(${SODIUM},${(0.35 + rnd() * 0.45).toFixed(2)})`;
          ctx.fill();
        }
      }
    }
    hx += w;
  }
  // street lamps and a sign, swollen by the water on the glass
  for (const [X, Y, rad, col, a] of [
    [-286, 108, 20, SODIUM, 0.75],
    [-226, 122, 15, SODIUM, 0.6],
    [-200, 96, 11, "230,60,60", 0.55],
    [-258, 138, 9, "200,220,255", 0.5],
    [-300, 150, 12, SODIUM, 0.35],
  ]) {
    const p = Wp(X, Y);
    soft(ctx, p.x, p.y, rad * p.s, rad * p.s * 0.85, col, a, "lighter");
    soft(ctx, p.x, p.y, rad * p.s * 0.3, rad * p.s * 0.28, "255,250,235", a * 0.8, "lighter");
  }
  // rain: runs down the pane, and the beads between them
  ctx.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const X = x0 + rnd() * (x1 - x0);
    const Y = y0 + rnd() * 120;
    const len = 6 + rnd() * 26;
    const a = Wp(X, Y + len);
    const b = Wp(X + (rnd() - 0.5) * 2.4, Y);
    ctx.strokeStyle = `rgba(200,220,245,${(0.08 + rnd() * 0.2).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.6, (0.5 + rnd() * 0.9) * u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = "rgba(225,238,255,0.5)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, Math.max(0.8, 1.1 * u), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 160; i++) {
    const p = Wp(x0 + rnd() * (x1 - x0), y0 + rnd() * 120);
    ctx.fillStyle = `rgba(215,230,250,${(0.12 + rnd() * 0.3).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (0.5 + rnd() * 1.1) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = "butt";
  // the room's dark, reflected faintly in the glass
  ctx.fillStyle = "rgba(4,8,14,0.22)";
  ctx.fillRect(0, 0, L.W, L.H);
  ctx.restore();
  // the glazing bars, the sill
  ctx.fillStyle = "#1c0f08";
  rect((x0 + x1) / 2 - 2.6, y0, (x0 + x1) / 2 + 2.6, y1);
  ctx.fill();
  rect(x0, 128, x1, 133);
  ctx.fill();
  ctx.fillStyle = `rgba(${RAIN},0.28)`;
  rect((x0 + x1) / 2 - 2.6, y0, (x0 + x1) / 2 - 1.6, y1);
  ctx.fill();
  rect(x0, 132, x1, 133);
  ctx.fill();
  rect(x0 - 16, y0 - 15, x1 + 16, y0 - 7);
  ctx.fillStyle = "#3a2214";
  ctx.fill();
  rect(x0 - 16, y0 - 8.4, x1 + 16, y0 - 7);
  ctx.fillStyle = `rgba(${RAIN},0.55)`;
  ctx.fill();
  // its cold light on the wall round it
  soft(ctx, L.win.x, L.win.y, L.win.rx * 2.2, L.win.ry * 2.4, RAIN, 0.12, "lighter");
}

// the slate, hung on the wall for the scores: someone has chalked a line on it
function paintSlate(ctx, L, Wp, rect) {
  const { u } = L;
  const x0 = 128;
  const x1 = 262;
  const y0 = 84;
  const y1 = 150;
  // its shadow on the paper, its frame
  rect(x0 + 3, y0 - 5, x1 + 5, y1 - 3);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  rect(x0, y0, x1, y1);
  const fg = ctx.createLinearGradient(0, Wp(0, y1).y, 0, Wp(0, y0).y);
  fg.addColorStop(0, "#6a4424");
  fg.addColorStop(1, "#2e1a0c");
  ctx.fillStyle = fg;
  ctx.fill();
  rect(x0 + 5, y0 + 5, x1 - 5, y1 - 5);
  ctx.fillStyle = "#141a1c";
  ctx.fill();
  ctx.save();
  ctx.clip();
  // old wipings of the cloth, ghosts of scores
  const rnd = lcg(404);
  for (let i = 0; i < 9; i++) {
    const p = Wp(x0 + 10 + rnd() * (x1 - x0 - 20), y0 + 8 + rnd() * (y1 - y0 - 16));
    soft(ctx, p.x, p.y, (20 + rnd() * 40) * u, (6 + rnd() * 10) * u, "200,210,215", 0.05);
  }
  const mid = Wp((x0 + x1) / 2, (y0 + y1) / 2);
  plane(ctx, mid, Wp((x0 + x1) / 2 + 1, (y0 + y1) / 2), Wp((x0 + x1) / 2, (y0 + y1) / 2 - 1), () => {
    ctx.fillStyle = "rgba(236,238,232,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `13px ${CHALK_FONT}`;
    ctx.fillText("What is missing", 0, -11);
    ctx.fillText("defines the answer", 0, 11);
    // the chalk skips on the slate's grain
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(0,0,0,${(0.2 + rnd() * 0.4).toFixed(2)})`;
      ctx.fillRect(-60 + rnd() * 120, -22 + rnd() * 44, 0.3 + rnd() * 1.2, 0.3);
    }
  });
  ctx.restore();
  // the ledge under it, a stub of chalk on it
  rect(x0 - 2, y0 - 4, x1 + 2, y0);
  ctx.fillStyle = "#7a5230";
  ctx.fill();
  rect(x0 + 30, y0, x0 + 40, y0 + 2.6);
  ctx.fillStyle = "rgba(240,240,232,0.9)";
  ctx.fill();
}

// the cue rack: a shelf with cups, a clip rail above, three cues standing
function paintCueRack(ctx, L, Wp, rect) {
  const x0 = 318;
  const x1 = 388;
  // the cues, from their butts up out of sight
  [330, 351, 372].forEach((X, i) => {
    const y0 = 36;
    const y1 = 190;
    const mid = 36 + (y1 - y0) * 0.32;
    polygon(ctx, [Wp(X - 1.9, y0), Wp(X + 1.9, y0), Wp(X + 1.3, mid), Wp(X - 1.3, mid)]);
    ctx.fillStyle = ["#2a0e0a", "#101820", "#1c1208"][i];
    ctx.fill();
    polygon(ctx, [Wp(X - 1.3, mid), Wp(X + 1.3, mid), Wp(X + 0.8, y1), Wp(X - 0.8, y1)]);
    const a = Wp(X - 1.3, 0);
    const b = Wp(X + 1.3, 0);
    const g = ctx.createLinearGradient(a.x, 0, b.x, 0);
    g.addColorStop(0, "#8a6a3a");
    g.addColorStop(0.4, "#e2c690");
    g.addColorStop(1, "#6a4c24");
    ctx.fillStyle = g;
    ctx.fill();
    polygon(ctx, [Wp(X + 2.2, y0), Wp(X + 4.4, y0), Wp(X + 2.4, y1), Wp(X + 1.4, y1)]);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
  });
  // the shelf they stand on, the rail that holds them
  rect(x0, 30, x1, 37);
  ctx.fillStyle = "#4a2c16";
  ctx.fill();
  rect(x0, 36, x1, 37);
  ctx.fillStyle = "rgba(255,210,160,0.25)";
  ctx.fill();
  rect(x0, 126, x1, 132);
  ctx.fillStyle = "#3a2010";
  ctx.fill();
}

// ── the window's light: a cold patch across the boards ──────────────────────

function paintWindowLight(ctx, L) {
  const { P, WZ, u } = L;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${Math.round(7 * u)}px)`;
  // four panes of it, the bars' shadows between
  for (const [xa, xb] of [
    [-310, -250],
    [-244, -184],
  ]) {
    for (const [za, zb, a] of [
      [WZ - 14, WZ - 70, 0.3],
      [WZ - 78, WZ - 170, 0.2],
    ]) {
      // it falls in at a slant, toward the table
      const s0 = ((WZ - za) / 170) * 110;
      const s1 = ((WZ - zb) / 170) * 110;
      polygon(ctx, [P(xa + s0, 0, za), P(xb + s0, 0, za), P(xb + s1, 0, zb), P(xa + s1, 0, zb)]);
      ctx.fillStyle = `rgba(${RAIN},${a})`;
      ctx.fill();
    }
  }
  ctx.filter = "none";
  ctx.restore();
}

// ── the table ───────────────────────────────────────────────────────────────

function paintTable(ctx, L) {
  const { P, u, hw, hd, cu, rl, T, Zc } = L;
  const rh = L.railH;
  const A = (X, D, h = 0) => at(L, X, D, h);
  const oX = hw + cu + rl; // the table's outer edge
  const oD = hd + cu + rl;
  const rnd = lcg(731);

  // its shadow on the boards: the lamp is straight above, so it lies under it
  ctx.save();
  ctx.filter = `blur(${Math.round(16 * u)}px)`;
  polygon(ctx, [P(-oX - 12, 0, Zc + oD + 8), P(oX + 12, 0, Zc + oD + 8), P(oX + 16, 0, Zc - oD - 14), P(-oX - 16, 0, Zc - oD - 14)]);
  ctx.fillStyle = "rgba(0,0,0,0.92)";
  ctx.fill();
  ctx.filter = "none";
  ctx.restore();

  // the two near legs: square, tapering to brass feet
  const apronBot = -26;
  for (const side of [-1, 1]) {
    const x0 = side * (oX - 4);
    const x1 = side * (oX - 22);
    const zf = Zc - oD + 3; // their front face
    const zb = zf + 18;
    const taper = 4;
    // the face that looks toward the middle of the room
    polygon(ctx, [P(x1, T + apronBot, zf), P(x1, T + apronBot, zb), P(x1 + side * taper, 0, zb - taper), P(x1 + side * taper, 0, zf + 1)]);
    ctx.fillStyle = "#120805";
    ctx.fill();
    const f = [P(x0, T + apronBot, zf), P(x1, T + apronBot, zf), P(x1 + side * taper, 0, zf + 1), P(x0 - side * taper, 0, zf + 1)];
    polygon(ctx, f);
    const lg = ctx.createLinearGradient(f[0].x, 0, f[1].x, 0);
    lg.addColorStop(0, "#1a0b05");
    lg.addColorStop(0.5, "#4a2612");
    lg.addColorStop(1, "#2a140a");
    ctx.fillStyle = lg;
    ctx.fill();
    const dk = ctx.createLinearGradient(0, f[0].y, 0, f[2].y);
    dk.addColorStop(0, "rgba(0,0,0,0.7)");
    dk.addColorStop(0.35, "rgba(0,0,0,0.2)");
    dk.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = dk;
    ctx.fill();
    polygon(ctx, [P(x0 - side * taper * 0.92, 7, zf + 1), P(x1 + side * taper * 0.92, 7, zf + 1), P(x1 + side * taper, 0, zf + 1), P(x0 - side * taper, 0, zf + 1)]);
    ctx.fillStyle = "#8a6424";
    ctx.fill();
  }

  // the apron: the long front of the table, a moulded panel in it
  const ap = [A(-oX, oD, rh), A(oX, oD, rh), A(oX, oD, apronBot), A(-oX, oD, apronBot)];
  polygon(ctx, ap);
  const ag = ctx.createLinearGradient(0, ap[0].y, 0, ap[2].y);
  ag.addColorStop(0, "#6a3a1c");
  ag.addColorStop(0.12, "#3e1e0e");
  ag.addColorStop(1, "#150a05");
  ctx.fillStyle = ag;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    const h = rh + (apronBot - rh) * rnd();
    const a = A(-oX, oD, h);
    const b = A(oX, oD, h + (rnd() - 0.5) * 3);
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(8,3,1,0.35)" : "rgba(255,190,130,0.06)";
    ctx.lineWidth = Math.max(0.6, u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
  for (const [inset, col] of [
    [0, "rgba(4,2,1,0.8)"],
    [1.2, "rgba(255,200,150,0.1)"],
  ]) {
    polygon(ctx, [A(-oX + 26 + inset, oD, -5 - inset), A(oX - 26 - inset, oD, -5 - inset), A(oX - 26 - inset, oD, apronBot + 5 + inset), A(-oX + 26 + inset, oD, apronBot + 5 + inset)]);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 1.4 * u);
    ctx.stroke();
  }

  // the cloth
  const felt = [A(-hw - cu, -hd - cu), A(hw + cu, -hd - cu), A(hw + cu, hd + cu), A(-hw - cu, hd + cu)];
  polygon(ctx, felt);
  ctx.fillStyle = "#0a3a28";
  ctx.fill();
  ctx.save();
  ctx.clip();
  onTable(ctx, L, 0, 0, 0, () => {
    // three pools of light under the three shades, running into one
    for (const x of [-44, 0, 44]) {
      const g = ctx.createRadialGradient(x, 0, 4, x, 0, 86);
      g.addColorStop(0, "rgba(120,220,150,0.5)");
      g.addColorStop(0.35, "rgba(70,170,110,0.24)");
      g.addColorStop(1, "rgba(40,120,80,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-140, -90, 280, 180);
    }
    const warm = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    warm.addColorStop(0, `rgba(${LAMP_HOT},0.2)`);
    warm.addColorStop(1, `rgba(${LAMP},0)`);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = warm;
    ctx.fillRect(-140, -90, 280, 180);
    ctx.globalCompositeOperation = "source-over";
    // the ends of the table fall off into shadow
    const ends = ctx.createLinearGradient(-hw - cu, 0, hw + cu, 0);
    ends.addColorStop(0, "rgba(0,8,4,0.6)");
    ends.addColorStop(0.22, "rgba(0,8,4,0)");
    ends.addColorStop(0.78, "rgba(0,8,4,0)");
    ends.addColorStop(1, "rgba(0,8,4,0.6)");
    ctx.fillStyle = ends;
    ctx.fillRect(-140, -90, 280, 180);
    // the nap of the cloth, chalk marks, a worn track from the break
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = rnd() < 0.5 ? "rgba(190,255,210,0.06)" : "rgba(0,20,10,0.12)";
      ctx.fillRect((rnd() * 2 - 1) * (hw + cu), (rnd() * 2 - 1) * (hd + cu), 0.9, 0.35);
    }
    for (let i = 0; i < 7; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(150,190,230,0.16)");
      g.addColorStop(1, "rgba(150,190,230,0)");
      ctx.save();
      ctx.translate((rnd() * 1.7 - 0.85) * hw, (rnd() * 1.6 - 0.8) * hd);
      ctx.scale(3 + rnd() * 5, 2 + rnd() * 3);
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    // the spots
    ctx.fillStyle = "rgba(230,240,225,0.5)";
    for (const x of [-hw / 2, hw / 2]) {
      ctx.beginPath();
      ctx.arc(x, 0, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();

  // the cushions: between the pockets, a sloping top and the dark under the
  // nose where it overhangs the cloth
  const gapC = 13; // room left for a corner pocket
  const gapM = 9.5; // and a middle one
  const cushion = (pts) => {
    // pts: nose line a→b on the cloth's edge, c→d at the rail
    const [a, b, c2, d] = pts;
    const nose = [A(a.X, a.D, 3.6), A(b.X, b.D, 3.6)];
    const backT = [A(c2.X, c2.D, rh), A(d.X, d.D, rh)];
    const footL = [A(a.X + (d.X - a.X) * 0.5, a.D + (d.D - a.D) * 0.5, 0), A(b.X + (c2.X - b.X) * 0.5, b.D + (c2.D - b.D) * 0.5, 0)];
    polygon(ctx, [nose[0], nose[1], footL[1], footL[0]]);
    ctx.fillStyle = "#03140d";
    ctx.fill();
    polygon(ctx, [nose[0], nose[1], backT[0], backT[1]]);
    const midX = (a.X + b.X) / 2;
    const k = Math.max(0.25, 1 - Math.abs(midX) / 150);
    ctx.fillStyle = `rgb(${Math.round(16 + 26 * k)},${Math.round(70 + 60 * k)},${Math.round(48 + 36 * k)})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(190,255,210,0.22)";
    ctx.lineWidth = Math.max(0.8, 1.1 * u);
    ctx.beginPath();
    ctx.moveTo(nose[0].x, nose[0].y);
    ctx.lineTo(nose[1].x, nose[1].y);
    ctx.stroke();
  };
  const shade = (X0, X1, D, toward) => {
    // the cushion's shadow lying on the cloth along it
    const a = A(X0, D, 0);
    const b = A(X1, D, 0);
    const c2 = A(X1, D + toward * 3, 0);
    const d = A(X0, D + toward * 3, 0);
    polygon(ctx, [a, b, c2, d]);
    ctx.fillStyle = "rgba(0,10,5,0.4)";
    ctx.fill();
  };
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -hw + gapC - 4 : gapM;
    const x1 = s < 0 ? -gapM : hw - gapC + 4;
    shade(x0, x1, -hd, 1);
    // far
    cushion([{ X: x0, D: -hd }, { X: x1, D: -hd }, { X: x1 + 3, D: -hd - cu }, { X: x0 - 3, D: -hd - cu }]);
    // near
    cushion([{ X: x0, D: hd }, { X: x1, D: hd }, { X: x1 + 3, D: hd + cu }, { X: x0 - 3, D: hd + cu }]);
    // the end cushion on this side
    const X = s * hw;
    const Xo = s * (hw + cu);
    cushion([{ X, D: -hd + gapC - 4 }, { X, D: hd - gapC + 4 }, { X: Xo, D: hd - gapC + 7 }, { X: Xo, D: -hd + gapC - 7 }]);
  }

  // the rails: polished wood all round, the lamp lying along them
  const rail = (pts, lit) => {
    polygon(ctx, pts);
    const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[3].x, pts[3].y);
    g.addColorStop(0, lit ? "#7a4422" : "#4a2612");
    g.addColorStop(0.5, lit ? "#5a2e14" : "#3a1c0c");
    g.addColorStop(1, lit ? "#3a1c0c" : "#22100a");
    ctx.fillStyle = g;
    ctx.fill();
  };
  const iX = hw + cu;
  const iD = hd + cu;
  rail([A(-oX, -oD, rh), A(oX, -oD, rh), A(iX, -iD, rh), A(-iX, -iD, rh)], true); // far
  rail([A(-iX, -iD, rh), A(-iX, iD, rh), A(-oX, oD, rh), A(-oX, -oD, rh)], false); // left
  rail([A(iX, -iD, rh), A(iX, iD, rh), A(oX, oD, rh), A(oX, -oD, rh)], false); // right
  rail([A(-iX, iD, rh), A(iX, iD, rh), A(oX, oD, rh), A(-oX, oD, rh)], true); // near
  // grain and sheen, clipped to the whole frame
  ctx.save();
  ctx.beginPath();
  for (const p of [A(-oX, -oD, rh), A(oX, -oD, rh), A(oX, oD, rh), A(-oX, oD, rh)]) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  for (const p of [A(-iX, -iD, rh), A(-iX, iD, rh), A(iX, iD, rh), A(iX, -iD, rh)]) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip("evenodd");
  for (let i = 0; i < 46; i++) {
    const long = i % 3 !== 0;
    const side = rnd() < 0.5 ? -1 : 1;
    const off = rnd() * rl;
    const a = long ? A(-oX, side * (iD + off), rh) : A(side * (iX + off), -oD, rh);
    const b = long ? A(oX, side * (iD + off + (rnd() - 0.5) * 2), rh) : A(side * (iX + off), oD, rh);
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(10,4,1,0.35)" : "rgba(255,200,140,0.08)";
    ctx.lineWidth = Math.max(0.6, (0.5 + rnd()) * u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // the three shades reflected in the polish of the long rails
  for (const D of [-(iD + rl * 0.5), iD + rl * 0.5]) {
    for (const X of [-44, 0, 44]) {
      onTable(ctx, L, X, D, rh, () => {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(${LAMP_HOT},0.5)`);
        g.addColorStop(1, `rgba(${LAMP},0)`);
        ctx.scale(34, 6);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(-1, -1, 2, 2);
      });
    }
  }
  ctx.restore();
  // the mitres at the corners, the edge of the frame catching the light
  ctx.strokeStyle = "rgba(6,2,1,0.6)";
  ctx.lineWidth = Math.max(0.8, u);
  for (const [sx, sd] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const a = A(sx * iX, sd * iD, rh);
    const b = A(sx * oX, sd * oD, rh);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const e0 = A(-oX, oD, rh);
  const e1 = A(oX, oD, rh);
  ctx.strokeStyle = `rgba(${LAMP_HOT},0.45)`;
  ctx.lineWidth = Math.max(1, 1.5 * u);
  ctx.beginPath();
  ctx.moveTo(e0.x, e0.y);
  ctx.lineTo(e1.x, e1.y);
  ctx.stroke();

  // the sights: mother-of-pearl diamonds let into the rails
  const sight = (X, D) => {
    onTable(ctx, L, X, D, rh, () => {
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(1.1, 0);
      ctx.lineTo(0, 2);
      ctx.lineTo(-1.1, 0);
      ctx.closePath();
      const g = ctx.createLinearGradient(-1.5, -2.6, 1.5, 2.6);
      g.addColorStop(0, "#fff8e6");
      g.addColorStop(0.5, "#c8c6c0");
      g.addColorStop(1, "#7a8aa0");
      ctx.fillStyle = g;
      ctx.fill();
    });
  };
  for (const f of [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]) {
    sight(f * hw, -(iD + rl * 0.5));
    sight(f * hw, iD + rl * 0.5);
  }
  for (const f of [-0.5, 0, 0.5]) {
    sight(-(iX + rl * 0.5), f * hd);
    sight(iX + rl * 0.5, f * hd);
  }

  // the pockets: a leather collar let into the rail, the hole going down
  for (const p of L.pockets) {
    ring(ctx, L, p.X, p.D, rh + 0.4, p.r * 1.42);
    const cg = ctx.createLinearGradient(0, p.y - p.r * p.s, 0, p.y + p.r * p.s);
    cg.addColorStop(0, "#1a0f08");
    cg.addColorStop(1, "#3a2414");
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = `rgba(${LAMP},0.3)`;
    ctx.lineWidth = Math.max(0.8, 1.2 * u);
    ctx.stroke();
    // the stitching round it
    ring(ctx, L, p.X, p.D, rh + 0.4, p.r * 1.24);
    ctx.setLineDash([2.4 * u, 2.4 * u]);
    ctx.strokeStyle = "rgba(210,180,130,0.3)";
    ctx.lineWidth = Math.max(0.6, 0.8 * u);
    ctx.stroke();
    ctx.setLineDash([]);
    ring(ctx, L, p.X, p.D, rh, p.r);
    ctx.fillStyle = "#020101";
    ctx.fill();
    // the far side of the hole, where the lamp gets a little way down it
    ctx.save();
    ring(ctx, L, p.X, p.D, rh, p.r);
    ctx.clip();
    const top = at(L, p.X, p.D - p.r, rh);
    const wall = ctx.createLinearGradient(0, top.y, 0, top.y + p.r * p.s * 0.75);
    wall.addColorStop(0, "rgba(84,54,30,0.9)");
    wall.addColorStop(1, "rgba(10,6,3,0)");
    ctx.fillStyle = wall;
    ctx.fillRect(p.x - p.r * p.s * 1.2, top.y, p.r * p.s * 2.4, p.r * p.s * 0.75);
    ctx.restore();
  }

  // the brass plates, I to V, screwed to the rail by their pockets
  for (const p of L.pockets) {
    if (p.mark === null) continue;
    const X = p.X === 0 ? 22 : p.X + (p.X < 0 ? 1 : -1) * 25;
    const D = (p.D < 0 ? -1 : 1) * (iD + rl * 0.5);
    onTable(ctx, L, X, D, rh + 0.3, () => {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.roundRect(-8.4, -4.2, 18, 9.6, 1.4);
      ctx.fill();
      const g = ctx.createLinearGradient(0, -4.6, 0, 4.6);
      g.addColorStop(0, "#f6dc98");
      g.addColorStop(0.4, "#c79a3e");
      g.addColorStop(1, "#7a5416");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-9, -4.6, 18, 9.2, 1.4);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,36,6,0.7)";
      ctx.lineWidth = 0.4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,246,210,0.6)";
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(8, -4);
      ctx.stroke();
      ctx.fillStyle = "#1c1004";
      ctx.font = `700 7.6px ${PLATE_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(POCKET_MARKS[p.mark], 0, 0.5);
      ctx.fillStyle = "#4a3008";
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(e * 7.6, 0, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // a cube of blue chalk left on the near rail
  const cb = [-34, iD + rl * 0.45];
  const s = 3.4;
  const tl = (dx, dd, h) => A(cb[0] + dx, cb[1] + dd, rh + h);
  onTable(ctx, L, cb[0] + 1, cb[1] + 0.6, rh, () => {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-2.2, -2.2, 5, 5);
  });
  polygon(ctx, [tl(-s / 2, s / 2, s), tl(s / 2, s / 2, s), tl(s / 2, s / 2, 0), tl(-s / 2, s / 2, 0)]);
  ctx.fillStyle = "#1c3c74";
  ctx.fill();
  polygon(ctx, [tl(-s / 2, -s / 2, s), tl(s / 2, -s / 2, s), tl(s / 2, s / 2, s), tl(-s / 2, s / 2, s)]);
  ctx.fillStyle = "#4a7ac4";
  ctx.fill();
  onTable(ctx, L, cb[0], cb[1], rh + s, () => {
    ctx.fillStyle = "#2a528e";
    ctx.beginPath();
    ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── the rack: the wooden triangle, the balls standing in it ────────────────

function paintRack(ctx, L) {
  const { r, u } = L;
  const d = r * Math.sqrt(3) * 1.02;
  const w = r * 1.3;
  const fh = r * 0.72;
  const Aa = { X: L.rackX - 2 * w, D: 0 };
  const B = { X: L.rackX + 4 * d + w, D: -(4.08 * r + 1.732 * w) };
  const C = { X: B.X, D: -B.D };
  const side = (p, q, lit) => {
    const a0 = at(L, p.X, p.D, 0);
    const b0 = at(L, q.X, q.D, 0);
    const a1 = at(L, p.X, p.D, fh);
    const b1 = at(L, q.X, q.D, fh);
    polygon(ctx, [a1, b1, b0, a0]);
    ctx.fillStyle = lit ? "#6a4424" : "#2a160a";
    ctx.fill();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a0d06";
    ctx.lineWidth = 2.6 * a1.s;
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.stroke();
    ctx.strokeStyle = "#b08050";
    ctx.lineWidth = 1.7 * a1.s;
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y - 0.4 * u);
    ctx.lineTo(b1.x, b1.y - 0.4 * u);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,236,200,0.4)";
    ctx.lineWidth = 0.5 * a1.s;
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y - 0.9 * u);
    ctx.lineTo(b1.x, b1.y - 0.9 * u);
    ctx.stroke();
    ctx.lineCap = "butt";
  };
  // its shadow on the cloth
  onTable(ctx, L, 0, 0, 0, () => {
    ctx.strokeStyle = "rgba(0,10,5,0.55)";
    ctx.lineWidth = 3.4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(Aa.X + 0.8, Aa.D);
    ctx.lineTo(B.X + 0.8, B.D);
    ctx.lineTo(C.X + 0.8, C.D);
    ctx.closePath();
    ctx.stroke();
    ctx.lineJoin = "miter";
  });
  // the far side and the foot of the triangle, behind the balls
  side(Aa, B, true);
  side(B, C, false);
  // where a ball stood and is gone: a ring in the chalk dust
  for (const b of L.rack) {
    if (b.n !== null) continue;
    onTable(ctx, L, b.X, b.D, 0, () => {
      ctx.strokeStyle = "rgba(0,14,8,0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  // the balls, the far ones first
  const balls = L.rack.filter((b) => b.n !== null).sort((a, b) => a.D - b.D);
  for (const b of balls) ballShadow(ctx, L, b.X, b.D);
  ballShadow(ctx, L, L.cue.X, L.cue.D);
  for (const b of balls) {
    const ball = paintBall(r * b.s, b.n, { lean: -b.X / L.hw });
    ctx.drawImage(ball, b.x - ball.width / 4, b.y - ball.height / 4, ball.width / 2, ball.height / 2);
  }
  // the near side, in front of them
  side(Aa, C, false);
}

// a ball's shadow: close under it, pushed a little away from the lamp
function ballShadow(ctx, L, X, D) {
  const r = L.r;
  onTable(ctx, L, X + (X / L.hw) * r * 0.5, D + (D / L.hd) * r * 0.3 + r * 0.1, 0, () => {
    const g = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r * 1.25);
    g.addColorStop(0, "rgba(0,8,4,0.85)");
    g.addColorStop(0.6, "rgba(0,8,4,0.45)");
    g.addColorStop(1, "rgba(0,8,4,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
  });
}

// ── a cue left leaning on the corner of the table ───────────────────────────

function paintLeaningCue(ctx, L) {
  const { P, T, Zc, hw, hd, cu, rl, u } = L;
  const butt = { X: hw + cu + rl + 34, Y: 0, Z: Zc - hd - cu - rl - 34 };
  const rest = { X: hw + cu + rl - 2, Y: T + L.railH + 1, Z: Zc - hd - cu - rl + 6 };
  const pt = (k) => P(butt.X + (rest.X - butt.X) * k, butt.Y + (rest.Y - butt.Y) * k, butt.Z + (rest.Z - butt.Z) * k);
  const seg = (k0, k1, w0, w1, fill) => {
    const a = pt(k0);
    const b = pt(k1);
    const n = { x: -(b.y - a.y), y: b.x - a.x };
    const len = Math.hypot(n.x, n.y) || 1;
    n.x /= len;
    n.y /= len;
    polygon(ctx, [
      { x: a.x + n.x * w0 * a.s, y: a.y + n.y * w0 * a.s },
      { x: b.x + n.x * w1 * b.s, y: b.y + n.y * w1 * b.s },
      { x: b.x - n.x * w1 * b.s, y: b.y - n.y * w1 * b.s },
      { x: a.x - n.x * w0 * a.s, y: a.y - n.y * w0 * a.s },
    ]);
    ctx.fillStyle = fill;
    ctx.fill();
    return { a, b, n };
  };
  // its shadow on the boards
  const f0 = P(butt.X, 0, butt.Z);
  const f1 = P(rest.X + 30, 0, rest.Z + 40);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 6 * u;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(f0.x, f0.y);
  ctx.lineTo(f1.x, f1.y);
  ctx.stroke();
  ctx.lineCap = "butt";
  seg(0, 0.5, 1.7, 1.45, "#1c0c08");
  const sh = seg(0.5, 1.42, 1.45, 0.7, "#c9a66a");
  seg(0.5, 0.56, 1.5, 1.42, "#8a6424");
  seg(1.42, 1.45, 0.7, 0.68, "#f2ece0");
  seg(1.45, 1.465, 0.68, 0.66, "#3a6ab0");
  // the light along its upper edge
  ctx.strokeStyle = "rgba(255,240,210,0.5)";
  ctx.lineWidth = Math.max(0.6, u);
  ctx.beginPath();
  ctx.moveTo(sh.a.x - sh.n.x * 1 * sh.a.s, sh.a.y - sh.n.y * 1 * sh.a.s);
  ctx.lineTo(sh.b.x - sh.n.x * 0.5 * sh.b.s, sh.b.y - sh.n.y * 0.5 * sh.b.s);
  ctx.stroke();
}

// ── the billiard lamp: three green shades on a brass bar, on chains ────────

function paintLamp(ctx, L) {
  const { P, Zc, u } = L;
  const barY = 194;
  const topY = 188;
  const botY = 168;
  // the haze under each shade, down to the cloth
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${Math.round(12 * u)}px)`;
  for (const X of [-44, 0, 44]) {
    const a = P(X - 17, botY, Zc);
    const b = P(X + 17, botY, Zc);
    const c = at(L, X + 70, 10, 0);
    const d = at(L, X - 70, 10, 0);
    const g = ctx.createLinearGradient(0, a.y, 0, c.y);
    g.addColorStop(0, `rgba(${LAMP_HOT},0.12)`);
    g.addColorStop(1, `rgba(${LAMP},0)`);
    ctx.fillStyle = g;
    polygon(ctx, [a, b, c, d]);
    ctx.fill();
  }
  ctx.filter = "none";
  ctx.restore();
  // the chains, up out of sight
  ctx.strokeStyle = "#5a4418";
  ctx.lineWidth = Math.max(1, 1.6 * u);
  ctx.setLineDash([3 * u, 2 * u]);
  for (const X of [-52, 52]) {
    const a = P(X, barY, Zc);
    const b = P(X * 0.72, 330, Zc);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // the bar
  const b0 = P(-64, barY, Zc);
  const b1 = P(64, barY, Zc);
  const bw = 3.2 * b0.s;
  const bg = ctx.createLinearGradient(0, b0.y - bw / 2, 0, b0.y + bw / 2);
  bg.addColorStop(0, "#f2d88e");
  bg.addColorStop(0.5, "#a87a2a");
  bg.addColorStop(1, "#3a2606");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(b0.x, b0.y - bw / 2, b1.x - b0.x, bw, bw / 2);
  ctx.fill();
  for (const X of [-44, 0, 44]) {
    const circle = (Y, rad) => {
      const pts = [];
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        pts.push(P(X + Math.cos(a) * rad, Y, Zc + Math.sin(a) * rad));
      }
      return pts;
    };
    const bot = circle(botY, 19);
    const top = circle(topY, 6);
    const pc = P(X, botY, Zc);
    const pt = P(X, topY, Zc);
    const rb = 19 * pc.s;
    const rt = 6 * pt.s;
    // the stem to the bar
    const st = P(X, barY, Zc);
    ctx.fillStyle = "#8a6424";
    ctx.fillRect(pt.x - 1.2 * pt.s, st.y, 2.4 * pt.s, pt.y - st.y);
    // the shade: its skirt, its sloping side, its cap
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(pt.x - rt, pt.y);
      ctx.lineTo(pt.x + rt, pt.y);
      ctx.lineTo(pc.x + rb, pc.y);
      for (let i = 1; i < 18; i++) ctx.lineTo(bot[i].x, bot[i].y);
      ctx.lineTo(pc.x - rb, pc.y);
      ctx.closePath();
    };
    body();
    const g = ctx.createLinearGradient(pc.x - rb, 0, pc.x + rb, 0);
    g.addColorStop(0, "#0a2a1a");
    g.addColorStop(0.3, "#2a8a5a");
    g.addColorStop(0.42, "#5ac08a");
    g.addColorStop(0.62, "#1c6a44");
    g.addColorStop(1, "#082214");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // the glass glows a little where the bulb is close behind it
    soft(ctx, pc.x, pc.y, rb * 0.9, rb * 0.5, "150,255,190", 0.35, "lighter");
    const dk = ctx.createLinearGradient(0, pt.y, 0, pc.y);
    dk.addColorStop(0, "rgba(0,0,0,0.4)");
    dk.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dk;
    ctx.fillRect(pc.x - rb, pt.y - rt, rb * 2, pc.y - pt.y + rt);
    ctx.restore();
    polygon(ctx, top);
    ctx.fillStyle = "#a87a2a";
    ctx.fill();
    // the lit rim of the skirt, and the light under it
    ctx.strokeStyle = `rgba(${LAMP_HOT},0.9)`;
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.beginPath();
    ctx.moveTo(pc.x + rb, pc.y);
    for (let i = 1; i < 18; i++) ctx.lineTo(bot[i].x, bot[i].y);
    ctx.lineTo(pc.x - rb, pc.y);
    ctx.stroke();
    soft(ctx, pc.x, bot[9].y + 4 * u, rb * 1.3, rb * 0.5, LAMP_HOT, 0.4, "lighter");
  }
}

// ── the dark of the room, away from the lamp ────────────────────────────────

function paintGloom(ctx, L) {
  const { W, H, u } = L;
  const step = Math.max(6, Math.round(10 * u));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const a = gloom(L, x + step / 2, y + step / 2);
      if (a <= 0.004) continue;
      ctx.fillStyle = `rgba(4,6,10,${a.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
  // the lamp, warm over the middle of everything
  soft(ctx, L.spot.x, L.spot.y, L.span * 1.3, L.span * 0.6, LAMP, 0.1, "lighter");
}

// ── the ball down in a pocket ───────────────────────────────────────────────
//
// Only what shows through the mouth of the hole: the top of the ball, its
// colour and whether it is striped, going down into the dark. The picture is
// centred on the pocket.

function paintSunk(L, p, n) {
  const rs = p.r * p.s;
  const R = 2;
  const size = Math.ceil(rs * 2.6);
  const c = makeCanvas(size * R, size * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.translate(size / 2 - p.x, size / 2 - p.y);
  // what shows: the mouth of the hole, and whatever of the ball stands above it
  ring(g, L, p.X, p.D, L.railH, p.r * 0.97);
  g.rect(p.x - rs * 1.3, p.y - rs * 1.3, rs * 2.6, rs * 1.3);
  g.clip();
  const b = at(L, p.X, p.D + 0.4, L.railH - L.r * 0.5);
  const rb = L.r * b.s * 0.97;
  const ball = paintBall(rb, n, { sunk: true, lean: -p.X / L.hw });
  g.drawImage(ball, b.x - ball.width / 4, b.y - ball.height / 4, ball.width / 2, ball.height / 2);
  // the near lip's shadow across it, and the room's dark
  const near = at(L, p.X, p.D + p.r, L.railH);
  const lip = g.createLinearGradient(0, near.y - rs * 0.5, 0, near.y);
  lip.addColorStop(0, "rgba(0,0,0,0)");
  lip.addColorStop(1, "rgba(0,0,0,0.8)");
  g.fillStyle = lip;
  g.fillRect(p.x - rs * 1.3, near.y - rs * 0.5, rs * 2.6, rs * 0.55);
  g.fillStyle = `rgba(4,6,10,${(gloom(L, p.x, p.y) * 0.3).toFixed(3)})`;
  g.fillRect(p.x - rs * 1.3, p.y - rs * 1.3, rs * 2.6, rs * 2.6);
  return c;
}

// ── a ball: a sphere under the lamp ────────────────────────────────────────
//
// Seen from above and in front, lit from straight overhead: the light sits
// high on it, the underside goes to the cloth's dark green, the three shades
// show as three small glints. A striped ball is white with a band of its
// colour round it; the number sits on the upper face, turned toward us.
// `lean` (−1..1) is where the lamp is, left or right of the ball. n = 0 is
// the cue ball. Painted at twice its size.

function paintBall(r, n, { sunk = false, lean = 0, dim = 0 } = {}) {
  const R = 2;
  const size = Math.ceil(r * 2.2 * R);
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.scale(R, R);
  const cx = size / (2 * R);
  const cy = size / (2 * R);
  const base = n === 0 ? "#f1ebdc" : ballColour(n);
  const stripe = n > 0 && isStripe(n);
  const lx = cx + lean * r * 0.34;
  const ly = cy - r * 0.52;

  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();

  // the colour: all of it, or a band round a white ball
  g.fillStyle = base;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  const turn = sunk ? 0.75 : ((n * 53) % 50) / 100 - 0.25;
  if (stripe) {
    g.save();
    g.translate(cx, cy);
    g.rotate(turn);
    g.fillStyle = "#ece6d6";
    g.beginPath();
    g.ellipse(0, -r * 1.02, r * 1.1, r * 0.56, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0, r * 1.06, r * 1.1, r * 0.52, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  if (!sunk && n > 0) {
    // the number's white round, on the face turned up toward us
    const nx = cx + Math.sin(turn) * r * 0.1;
    const ny = cy - r * 0.16;
    g.save();
    g.translate(nx, ny);
    g.scale(1, 0.9);
    g.fillStyle = "#f6f1e4";
    g.beginPath();
    g.arc(0, 0, r * 0.46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#0c0a08";
    g.font = `700 ${(r * (n > 9 ? 0.56 : 0.66)).toFixed(1)}px ${PLATE_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), 0, r * 0.04);
    g.restore();
  }

  // the shade of a sphere lit from above
  const shadow = g.createRadialGradient(lx, ly, r * 0.1, lx, ly + r * 0.1, r * 1.75);
  shadow.addColorStop(0, "rgba(0,0,0,0)");
  shadow.addColorStop(0.35, "rgba(0,0,0,0.05)");
  shadow.addColorStop(0.62, "rgba(0,4,8,0.34)");
  shadow.addColorStop(0.82, "rgba(0,4,8,0.68)");
  shadow.addColorStop(1, "rgba(0,4,8,0.9)");
  g.fillStyle = shadow;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // the lamp's warmth on top of it
  const warm = g.createRadialGradient(lx, ly, 0, lx, ly, r * 1.1);
  warm.addColorStop(0, "rgba(255,214,150,0.34)");
  warm.addColorStop(0.6, "rgba(255,190,110,0.08)");
  warm.addColorStop(1, "rgba(255,180,100,0)");
  g.fillStyle = warm;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // the cloth's green, thrown back up under it
  const bounce = g.createRadialGradient(cx, cy + r * 1.0, 0, cx, cy + r * 0.9, r * 0.8);
  bounce.addColorStop(0, "rgba(70,170,110,0.4)");
  bounce.addColorStop(1, "rgba(50,120,80,0)");
  g.fillStyle = bounce;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // the window, cold, low on the side toward it
  const cold = g.createRadialGradient(cx - r * 0.86, cy - r * 0.05, 0, cx - r * 0.86, cy - r * 0.05, r * 0.5);
  cold.addColorStop(0, "rgba(140,175,230,0.3)");
  cold.addColorStop(1, "rgba(120,150,210,0)");
  g.fillStyle = cold;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // its edge turning away
  const edge = g.createRadialGradient(cx, cy, r * 0.74, cx, cy, r);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(0.7, "rgba(0,4,10,0.22)");
  edge.addColorStop(1, "rgba(0,3,8,0.7)");
  g.fillStyle = edge;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // the polish: a soft bloom, and the three shades as three glints in a row
  const bloom = g.createRadialGradient(lx, ly, 0, lx, ly, r * 0.5);
  bloom.addColorStop(0, "rgba(255,250,236,0.55)");
  bloom.addColorStop(1, "rgba(255,244,220,0)");
  g.fillStyle = bloom;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  for (const k of [-1, 0, 1]) {
    const gx = lx + k * r * 0.2;
    const gy = ly - r * 0.06 + Math.abs(k) * r * 0.025;
    const glint = g.createRadialGradient(gx, gy, 0, gx, gy, r * 0.085);
    glint.addColorStop(0, "rgba(255,255,255,1)");
    glint.addColorStop(0.5, "rgba(255,255,250,0.75)");
    glint.addColorStop(1, "rgba(255,250,230,0)");
    g.fillStyle = glint;
    g.fillRect(gx - r * 0.1, gy - r * 0.1, r * 0.2, r * 0.2);
  }
  if (dim > 0) {
    g.fillStyle = `rgba(4,6,10,${dim.toFixed(3)})`;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  g.restore();
  return c;
}
