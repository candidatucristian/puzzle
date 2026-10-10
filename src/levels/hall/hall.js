import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg, polygon } from "../../shared/paint.js";

/** The ground-floor hall of the manor, at night: a long passage seen down its
 *  length, three closed doors along either wall, a tall window at its far end
 *  with the moon coming in through it. Dark panelling under dark paper, a
 *  runner down the boards, a pair of candle sconces between the doors. A
 *  thread of light shows under every door: there is something behind each.
 *
 *  The hall is drawn in one-point perspective from where we stand: a place
 *  is how far across (X) and down (Y) it is from the eye, and how far away
 *  (z, 1 at the picture, larger further off).
 *
 *  Painted once per screen size: the hall; a glow. */

const K = { room: "hl_hall", glow: "hl_glow" };
const WARM = "255,190,120";
const MOON = "150,178,232";
const END = 4.7; // how far off the end wall is
// where along the walls the doors are, and the sconces between them
const DOORS = [1.32, 2.2, 3.1];
const DOOR_LEN = 0.5;
const SCONCES = [1.98, 2.88];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutHall(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  L.vp = { x: W * 0.5, y: H * 0.47 };
  L.wall = Math.max(W * 0.6, H * 0.95); // half the hall's width, at the picture
  L.floor = H * 0.62;
  L.ceil = -H * 0.66;
  L.doorTop = L.floor - H * 0.92; // the doors' heads
  L.P = (X, Y, z) => ({ x: L.vp.x + X / z, y: L.vp.y + Y / z, s: 1 / z });
  // the six doors: left wall then right, nearest first; each a quadrangle
  L.doors = [];
  for (const side of [-1, 1]) {
    DOORS.forEach((z, i) => {
      const X = side * L.wall;
      const quad = [L.P(X, L.doorTop, z), L.P(X, L.doorTop, z + DOOR_LEN), L.P(X, L.floor, z + DOOR_LEN), L.P(X, L.floor, z)];
      const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
      L.doors.push({
        side, i, z, quad,
        box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
        sill: L.P(X - side * L.wall * 0.1, L.floor, z + DOOR_LEN / 2),
      });
    });
  }
  L.sconces = [];
  for (const side of [-1, 1]) for (const z of SCONCES) L.sconces.push({ side, z, ...L.P(side * L.wall, -H * 0.2, z) });
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintHall(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  paintCeiling(ctx, L);
  paintFloor(ctx, L);
  for (const side of [-1, 1]) paintWall(ctx, L, side);
  paintEnd(ctx, L);
  paintMoonlight(ctx, L);
  for (const d of L.doors) paintDoor(ctx, L, d);
  for (const s of L.sconces) paintSconce(ctx, L, s);
  paintGloom(ctx, L);
  vignette(ctx, W, H, 0.75);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K };
}

export function releaseHallArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// the ceiling: dark plaster, a cornice down either side, ribs across it
function paintCeiling(ctx, L) {
  const { P, wall, ceil, u } = L;
  polygon(ctx, [P(-wall, ceil, 0.8), P(wall, ceil, 0.8), P(wall, ceil, END), P(-wall, ceil, END)]);
  ctx.fillStyle = "#0b0a0c";
  ctx.fill();
  ctx.strokeStyle = "rgba(60,54,60,0.5)";
  for (let z = 1; z < END; z += 0.45) {
    const a = P(-wall, ceil, z), b = P(wall, ceil, z);
    ctx.lineWidth = Math.max(0.6, (5 * u) / z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
}

// the floor: dark oak boards running to the far end, a long runner down the
// middle of them — deep red, a paler border, worn along its centre
function paintFloor(ctx, L) {
  const { P, wall, floor, u } = L;
  const rnd = lcg(64);
  polygon(ctx, [P(-wall, floor, 0.7), P(wall, floor, 0.7), P(wall, floor, END), P(-wall, floor, END)]);
  const g = ctx.createLinearGradient(0, P(0, floor, END).y, 0, L.H);
  g.addColorStop(0, "#120c08");
  g.addColorStop(1, "#2a1c12");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const X = -wall + (2 * wall * i) / n;
    const a = P(X, floor, 0.7), b = P(X, floor, END);
    const tone = rnd();
    if (i < n) {
      polygon(ctx, [a, P(X + (2 * wall) / n, floor, 0.7), P(X + (2 * wall) / n, floor, END), b]);
      ctx.fillStyle = tone < 0.5 ? `rgba(0,0,0,${(tone * 0.3).toFixed(3)})` : `rgba(255,200,150,${((tone - 0.5) * 0.06).toFixed(3)})`;
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(4,2,1,0.75)";
    ctx.lineWidth = Math.max(1, 1.4 * u);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // the runner
  const rw = wall * 0.34;
  const strip = (hw, col) => {
    polygon(ctx, [P(-hw, floor, 0.7), P(hw, floor, 0.7), P(hw, floor, END - 0.25), P(-hw, floor, END - 0.25)]);
    ctx.fillStyle = col;
    ctx.fill();
  };
  strip(rw, "#2e0c10");
  strip(rw * 0.9, "#6a5a3a");
  strip(rw * 0.84, "#3c1014");
  // its pattern: a lozenge every stride, small flowers between
  for (let z = 0.8; z < END - 0.3; z += 0.22) {
    const p = P(0, floor, z);
    ctx.fillStyle = "rgba(120,96,56,0.5)";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - (11 * u) / z);
    ctx.lineTo(p.x + (rw * 0.3) / z, p.y);
    ctx.lineTo(p.x, p.y + (11 * u) / z);
    ctx.lineTo(p.x - (rw * 0.3) / z, p.y);
    ctx.closePath();
    ctx.fill();
    for (const d of [-1, 1]) {
      const q = P(d * rw * 0.62, floor, z + 0.11);
      ctx.beginPath();
      ctx.ellipse(q.x, q.y, (9 * u) / z, (4 * u) / z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 900; i++) {
    const z = 0.7 + rnd() * (END - 1);
    const p = P((rnd() * 2 - 1) * rw, floor, z);
    ctx.fillStyle = rnd() < 0.6 ? "rgba(0,0,0,0.2)" : "rgba(255,220,190,0.05)";
    ctx.fillRect(p.x, p.y, (4 * u) / z, (1.6 * u) / z);
  }
  ctx.restore();
}

// a wall: dark paper with a faint stripe over a dado of panelled oak, a
// picture rail, a skirting; a portrait hung between the doors
function paintWall(ctx, L, side) {
  const { P, wall, floor, ceil, H, u } = L;
  const X = side * wall;
  const band = (y0, y1, near, far) => {
    polygon(ctx, [P(X, y0, 0.7), P(X, y0, END), P(X, y1, END), P(X, y1, 0.7)]);
    const g = ctx.createLinearGradient(P(X, 0, END).x, 0, P(X, 0, 0.9).x, 0);
    g.addColorStop(0, far);
    g.addColorStop(1, near);
    ctx.fillStyle = g;
    ctx.fill();
  };
  const dado = floor - H * 0.36;
  band(ceil, floor, "#1a2420", "#0c1210");
  // the paper's stripe
  ctx.save();
  polygon(ctx, [P(X, ceil, 0.7), P(X, ceil, END), P(X, dado, END), P(X, dado, 0.7)]);
  ctx.clip();
  for (let z = 0.72; z < END; z += 0.07) {
    const a = P(X, ceil, z), b = P(X, dado, z);
    ctx.strokeStyle = "rgba(170,200,180,0.035)";
    ctx.lineWidth = Math.max(0.6, (6 * u) / z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
  band(dado, floor, "#2a1a10", "#120a06");
  band(dado - H * 0.012, dado + H * 0.012, "#3e2616", "#1a0e08");
  band(-H * 0.5, -H * 0.485, "#3e2616", "#1a0e08");
  band(floor - H * 0.035, floor, "#140b06", "#080403");
  // the dado's panels
  ctx.strokeStyle = "rgba(4,2,1,0.7)";
  for (let z = 0.75; z < END - 0.2; z += 0.3) {
    const a = P(X, dado + H * 0.04, z + 0.03), b = P(X, dado + H * 0.04, z + 0.27);
    const c = P(X, floor - H * 0.06, z + 0.27), d = P(X, floor - H * 0.06, z + 0.03);
    ctx.lineWidth = Math.max(0.8, (2 * u) / z);
    polygon(ctx, [a, b, c, d]);
    ctx.stroke();
  }
  // portraits: dark canvases in dull gilt, nobody's face quite to be made out
  for (const z of [1.9, 2.8]) {
    const y0 = -H * 0.42, y1 = -H * 0.28;
    const frame = (g0, g1, col) => {
      polygon(ctx, [P(X, y0 - g0, z - g1), P(X, y0 - g0, z + 0.16 + g1), P(X, y1 + g0, z + 0.16 + g1), P(X, y1 + g0, z - g1)]);
      ctx.fillStyle = col;
      ctx.fill();
    };
    frame(H * 0.02, 0.016, "#4a3a1c");
    frame(0, 0, "#0e0c0c");
    const m = P(X, (y0 + y1) / 2 - H * 0.01, z + 0.08);
    soft(ctx, m.x, m.y, (10 * u) / z, (16 * u) / z, "120,100,84", 0.35);
  }
}

// the far end: a tall arched window, the moon behind its bars, a small table
// under it with a vase on it
function paintEnd(ctx, L) {
  const { P, wall, floor, ceil, H, u } = L;
  const a = P(-wall, ceil, END), b = P(wall, floor, END);
  ctx.fillStyle = "#0b100f";
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  const s = 1 / END;
  // panelling along its foot
  const dado = P(0, floor - H * 0.36, END).y;
  ctx.fillStyle = "#140c07";
  ctx.fillRect(a.x, dado, b.x - a.x, b.y - dado);
  // the window
  const ww = wall * 0.3 * s, wx = L.vp.x;
  const top = P(0, -H * 0.5, END).y, sill = P(0, floor - H * 0.36, END).y;
  const path = (g) => {
    ctx.beginPath();
    ctx.moveTo(wx - ww - g, sill + g);
    ctx.lineTo(wx - ww - g, top + ww);
    ctx.arc(wx, top + ww, ww + g, Math.PI, 0);
    ctx.lineTo(wx + ww + g, sill + g);
    ctx.closePath();
  };
  soft(ctx, wx, (top + sill) / 2, ww * 4, (sill - top) * 1.1, MOON, 0.3, "lighter");
  path(5 * u * s * 3);
  ctx.fillStyle = "#1c120a";
  ctx.fill();
  path(0);
  const sky = ctx.createLinearGradient(0, top, 0, sill);
  sky.addColorStop(0, "#1a2a52");
  sky.addColorStop(1, "#3a5486");
  ctx.fillStyle = sky;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const mx = wx + ww * 0.3, my = top + ww * 1.1, mr = ww * 0.36;
  soft(ctx, mx, my, mr * 5, mr * 5, "210,224,255", 0.6, "lighter");
  ctx.fillStyle = "#fbf8ea";
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  // a bare branch across it
  ctx.strokeStyle = "#0a1020";
  ctx.lineWidth = Math.max(1, 2.4 * u * s * 3);
  ctx.beginPath();
  ctx.moveTo(wx - ww, sill - (sill - top) * 0.3);
  ctx.quadraticCurveTo(wx, sill - (sill - top) * 0.5, wx + ww, sill - (sill - top) * 0.62);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#1c120a";
  ctx.lineWidth = Math.max(1.4, 3 * u * s * 3);
  ctx.beginPath();
  ctx.moveTo(wx, top); ctx.lineTo(wx, sill);
  for (const f of [0.38, 0.68]) { ctx.moveTo(wx - ww, top + (sill - top) * f); ctx.lineTo(wx + ww, top + (sill - top) * f); }
  ctx.stroke();
  // the table and its vase, dark against the window's light on the wall
  const ty = P(0, floor - H * 0.27, END).y, fy = P(0, floor, END).y;
  ctx.fillStyle = "#0a0605";
  ctx.fillRect(wx - ww * 1.2, ty, ww * 2.4, Math.max(2, 5 * u * s * 3));
  for (const d of [-1, 1]) ctx.fillRect(wx + d * ww * 1.05 - 1.5 * u * s * 3, ty, 3 * u * s * 3, fy - ty);
  ctx.beginPath();
  ctx.ellipse(wx - ww * 0.8, ty - ww * 0.3, ww * 0.16, ww * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// the moon through the window: its beams in the hall's dusty air, and the
// window laid long and pale on the runner
function paintMoonlight(ctx, L) {
  const { P, wall, floor, H, u } = L;
  const s = 1 / END;
  const ww = wall * 0.3 * s;
  const top = P(0, -H * 0.5, END).y, sill = P(0, floor - H * 0.36, END).y;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // the window on the floor: four panes, stretching toward us
  ctx.filter = `blur(${Math.round(5 * u)}px)`;
  for (const [x0, x1] of [[-1, -0.06], [0.06, 1]]) {
    for (const [z0, z1, a] of [[END - 0.5, END - 1.5, 0.26], [END - 1.6, END - 2.6, 0.17], [END - 2.7, END - 3.3, 0.07]]) {
      const hw = wall * 0.3;
      const spread = (z) => 1 + (END - z) * 0.1;
      polygon(ctx, [P(x0 * hw * spread(z0), floor, z0), P(x1 * hw * spread(z0), floor, z0), P(x1 * hw * spread(z1), floor, z1), P(x0 * hw * spread(z1), floor, z1)]);
      ctx.fillStyle = `rgba(${MOON},${a})`;
      ctx.fill();
    }
  }
  // the beams themselves, from the glass down to that patch
  ctx.filter = `blur(${Math.round(14 * u)}px)`;
  const near = P(0, floor, END - 2.9);
  const g = ctx.createLinearGradient(0, top, 0, near.y);
  g.addColorStop(0, `rgba(${MOON},0.2)`);
  g.addColorStop(1, `rgba(${MOON},0)`);
  ctx.fillStyle = g;
  polygon(ctx, [{ x: L.vp.x - ww, y: top + ww }, { x: L.vp.x + ww, y: top + ww }, { x: near.x + wall * 0.19, y: near.y }, { x: near.x - wall * 0.19, y: near.y }]);
  ctx.fill();
  // three shafts in it, where the bars leave gaps
  for (const dx of [-0.6, 0, 0.6]) {
    const g2 = ctx.createLinearGradient(0, sill, 0, near.y);
    g2.addColorStop(0, `rgba(${MOON},0.14)`);
    g2.addColorStop(1, `rgba(${MOON},0)`);
    ctx.fillStyle = g2;
    polygon(ctx, [{ x: L.vp.x + (dx - 0.22) * ww, y: sill - (sill - top) * 0.4 }, { x: L.vp.x + (dx + 0.22) * ww, y: sill - (sill - top) * 0.4 }, { x: near.x + (dx + 0.3) * wall * 0.26, y: near.y }, { x: near.x + (dx - 0.3) * wall * 0.26, y: near.y }]);
    ctx.fill();
  }
  ctx.filter = "none";
  ctx.restore();
}

// A door in a wall: its architrave, a heavy leaf of dark oak in six panels, a
// brass knob and keyhole, and under it a thread of light from the room behind.
function paintDoor(ctx, L, d) {
  const { H, u } = L;
  const [tl, tr, br, bl] = d.quad; // near top, far top, far foot, near foot
  // a place on the door: a along it (0 at the near edge), b down it
  const f = (a, b) => {
    const top = { x: tl.x + (tr.x - tl.x) * a, y: tl.y + (tr.y - tl.y) * a };
    const bot = { x: bl.x + (br.x - bl.x) * a, y: bl.y + (br.y - bl.y) * a };
    return { x: top.x + (bot.x - top.x) * b, y: top.y + (bot.y - top.y) * b };
  };
  const quad = (a0, b0, a1, b1) => [f(a0, b0), f(a1, b0), f(a1, b1), f(a0, b1)];
  // the architrave
  polygon(ctx, quad(-0.12, -0.05, 1.12, 1));
  ctx.fillStyle = "#2c1b10";
  ctx.fill();
  polygon(ctx, quad(-0.04, -0.015, 1.04, 1));
  ctx.fillStyle = "#0a0605";
  ctx.fill();
  // the leaf
  polygon(ctx, quad(0, 0, 1, 1));
  const g = ctx.createLinearGradient(tl.x, 0, tr.x, 0);
  g.addColorStop(0, "#3a2416");
  g.addColorStop(1, "#1e120a");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // grain down it
  const rnd = lcg(300 + d.i * 7 + (d.side > 0 ? 50 : 0));
  for (let i = 0; i < 26; i++) {
    const a = rnd();
    const p = f(a, 0), q = f(a + (rnd() - 0.5) * 0.04, 1);
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(6,3,1,0.3)" : "rgba(255,200,150,0.05)";
    ctx.lineWidth = Math.max(0.5, (1.2 * u) / d.z);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.restore();
  // six panels: each sunk, dark on its upper and near edges, lit on the others
  const rows = [[0.05, 0.3], [0.34, 0.62], [0.66, 0.95]];
  for (const [b0, b1] of rows) {
    for (const [a0, a1] of [[0.1, 0.46], [0.54, 0.9]]) {
      polygon(ctx, quad(a0, b0, a1, b1));
      ctx.fillStyle = "rgba(6,3,2,0.5)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,206,160,0.1)";
      ctx.lineWidth = Math.max(0.6, (1.4 * u) / d.z);
      ctx.beginPath();
      ctx.moveTo(f(a0, b1).x, f(a0, b1).y);
      ctx.lineTo(f(a1, b1).x, f(a1, b1).y);
      ctx.lineTo(f(a1, b0).x, f(a1, b0).y);
      ctx.stroke();
    }
  }
  // the knob and its plate, on the edge away from the hinges
  const k = f(0.86, 0.53);
  const kr = Math.max(2, (9 * u) / d.z);
  ctx.fillStyle = "#3a2a10";
  ctx.beginPath(); ctx.ellipse(k.x, k.y + kr * 1.6, kr * 0.5, kr * 2.4, 0, 0, Math.PI * 2); ctx.fill();
  const kg = ctx.createRadialGradient(k.x - kr * 0.3, k.y - kr * 0.3, kr * 0.1, k.x, k.y, kr);
  kg.addColorStop(0, "#fff0c0");
  kg.addColorStop(0.5, "#c69a42");
  kg.addColorStop(1, "#4a340e");
  ctx.fillStyle = kg;
  ctx.beginPath(); ctx.arc(k.x, k.y, kr, 0, Math.PI * 2); ctx.fill();
  // light through the keyhole, and the thread of it under the door
  const hole = f(0.86, 0.6);
  soft(ctx, hole.x, hole.y, kr * 0.9, kr * 1.2, WARM, 0.9, "lighter");
  ctx.strokeStyle = `rgba(${WARM},0.95)`;
  ctx.lineWidth = Math.max(1.2, (3.4 * u) / d.z);
  ctx.beginPath();
  ctx.moveTo(f(0.03, 0.996).x, f(0.03, 0.996).y);
  ctx.lineTo(f(0.97, 0.996).x, f(0.97, 0.996).y);
  ctx.stroke();
  // and where it falls on the boards before it
  soft(ctx, d.sill.x, d.sill.y, (L.wall * 0.16) / d.z, (H * 0.03) / d.z, WARM, 0.36, "lighter");
}

// a sconce: a brass arm, a candle in a glass, its light on the wall and floor
function paintSconce(ctx, L, s) {
  const { u } = L;
  const k = (u * 1.5) / s.z;
  const x = s.x - s.side * 14 * k;
  soft(ctx, s.x - s.side * 6 * k, s.y - 10 * k, 120 * k, 150 * k, WARM, 0.22, "lighter");
  soft(ctx, x, s.y - 18 * k, 40 * k, 50 * k, WARM, 0.3, "lighter");
  ctx.strokeStyle = "#6a4a16";
  ctx.lineWidth = Math.max(1, 3 * k);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(s.x, s.y + 10 * k);
  ctx.quadraticCurveTo(x, s.y + 16 * k, x, s.y);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = "#8a6420";
  ctx.fillRect(x - 6 * k, s.y - 1 * k, 12 * k, 3 * k);
  ctx.fillStyle = "#e8dcc0";
  ctx.fillRect(x - 2.4 * k, s.y - 13 * k, 4.8 * k, 12 * k);
  ctx.fillStyle = "#fff4cc";
  ctx.beginPath();
  ctx.ellipse(x, s.y - 18 * k, 2.6 * k, 6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
}

// the dark of a house asleep: the sconces and the moon are all there is
function paintGloom(ctx, L) {
  const { W, H, u } = L;
  const step = Math.max(6, Math.round(10 * u));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const d = Math.hypot((x + step / 2 - L.vp.x) / (W * 0.62), (y + step / 2 - L.vp.y) / (H * 0.74));
      const a = Math.min(0.8, Math.max(0, d - 0.34) * 1.05);
      if (a <= 0.004) continue;
      ctx.fillStyle = `rgba(3,4,6,${a.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}
