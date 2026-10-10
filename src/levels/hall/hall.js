import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg, polygon } from "../../shared/paint.js";
import { archGeo, paintSkyOn, paintWindowOn, openingPath } from "../telescope/window.js";

/** The ground-floor hall of the manor, at night: a long passage seen down its
 *  length, three closed doors along either wall, a tall window at its far end
 *  with the moon coming in through it (the same window, by the same hand, as
 *  the one the telescope stands at). Dark panelling under dark paper, a
 *  runner down the boards, a pair of candle sconces between the doors, a
 *  chandelier, a long-case clock, and the things a hall gathers. Every door
 *  has its number on it — a Roman numeral in raised brass — and a thread of
 *  light under it: there is
 *  something behind each.
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
const SCONCES = [2.01, 2.9];
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

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
        side, i, z, quad, number: (side < 0 ? 0 : DOORS.length) + i + 1,
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
  paintThings(ctx, L);
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
  // (each hangs in the middle of the wall between two doors, clear of both)
  for (const z of [1.94, 2.83]) {
    const y0 = -H * 0.47, y1 = -H * 0.33;
    const frame = (g0, g1, col) => {
      polygon(ctx, [P(X, y0 - g0, z - g1), P(X, y0 - g0, z + 0.14 + g1), P(X, y1 + g0, z + 0.14 + g1), P(X, y1 + g0, z - g1)]);
      ctx.fillStyle = col;
      ctx.fill();
    };
    frame(H * 0.018, 0.012, "#4a3a1c");
    frame(0, 0, "#0e0c0c");
    const m = P(X, (y0 + y1) / 2 - H * 0.01, z + 0.07);
    soft(ctx, m.x, m.y, (10 * u) / z, (16 * u) / z, "120,100,84", 0.35);
  }
}

// the far end: the tall arched window — sky, moon, hills and all — with its
// deep reveal and its sill, panelling under it
function paintEnd(ctx, L) {
  const { P, wall, floor, ceil, H, W } = L;
  const a = P(-wall, ceil, END), b = P(wall, floor, END);
  ctx.fillStyle = "#0b100f";
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  // panelling along its foot
  const dado = P(0, floor - H * 0.36, END).y;
  ctx.fillStyle = "#140c07";
  ctx.fillRect(a.x, dado, b.x - a.x, b.y - dado);
  ctx.fillStyle = "#24160c";
  ctx.fillRect(a.x, dado - 2, b.x - a.x, 4);
  const w = endWindow(L);
  // its light on the wall round it
  soft(ctx, w.cx, (w.top + w.sill) / 2, w.rx * 3.4, (w.sill - w.top) * 1.2, MOON, 0.26, "lighter");
  const geo = archGeo({
    W, H, S: w.rx * 1.25, V: w.rx * 1.25, Wv: w.rx / 0.455,
    archCX: w.cx, archCY: w.top + w.rx * 0.9, archRX: w.rx, archRY: w.rx * 0.9, sillY: w.sill,
    eye: L.vp,
    moon: { x: w.cx + w.rx * 0.28, y: w.top + (w.sill - w.top) * 0.26, r: w.rx * 0.13 },
    horizonY: w.top + (w.sill - w.top) * 0.86,
    K: 0.94,
  });
  // painted on its own, so the hall's dark can lie on its frame without
  // touching the night in it
  const off = makeCanvas(W, H);
  const o = off.getContext("2d");
  o.save();
  openingPath(o, geo);
  o.clip();
  paintSkyOn(o, geo);
  const m = geo.moon;
  const halo = o.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3.4);
  halo.addColorStop(0, "rgba(200,214,250,.45)");
  halo.addColorStop(1, "rgba(200,214,250,0)");
  o.fillStyle = halo;
  o.fillRect(m.x - m.r * 4, m.y - m.r * 4, m.r * 8, m.r * 8);
  const body = o.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r);
  body.addColorStop(0, "#fbf8ec");
  body.addColorStop(0.75, "#e2dccb");
  body.addColorStop(1, "#b8b29f");
  o.fillStyle = body;
  o.beginPath();
  o.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  o.fill();
  o.restore();
  paintWindowOn(o, geo);
  o.save();
  openingPath(o, geo);
  o.rect(0, 0, W, H);
  o.clip("evenodd");
  o.globalCompositeOperation = "source-atop";
  o.fillStyle = "rgba(4,7,10,.55)";
  o.fillRect(0, 0, W, H);
  o.restore();
  ctx.drawImage(off, 0, 0);
  // the panelling runs on under the sill, in front of the window's foot
  ctx.fillStyle = "#140c07";
  ctx.fillRect(a.x, dado, b.x - a.x, b.y - dado);
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(a.x, dado - 2, b.x - a.x, 4);
}

// where the end window is, on the screen
function endWindow(L) {
  const { P, wall, floor, H } = L;
  const rx = (wall * 0.24) / END;
  return { cx: L.vp.x, rx, top: P(0, -H * 0.52, END).y, sill: P(0, floor - H * 0.36, END).y };
}

// the moon through the window: its beams in the hall's dusty air, and the
// window laid long and pale on the runner
function paintMoonlight(ctx, L) {
  const { P, wall, floor, u } = L;
  const win = endWindow(L);
  const ww = win.rx, top = win.top, sill = win.sill;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // the window on the floor: four panes, stretching toward us
  ctx.filter = `blur(${Math.round(5 * u)}px)`;
  for (const [x0, x1] of [[-1, -0.06], [0.06, 1]]) {
    for (const [z0, z1, a] of [[END - 0.5, END - 1.5, 0.26], [END - 1.6, END - 2.6, 0.17], [END - 2.7, END - 3.3, 0.07]]) {
      const hw = wall * 0.24;
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
  const rows = [[0.13, 0.36], [0.4, 0.66], [0.7, 0.95]]; // under a deep top rail
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
  // Its number: a Roman numeral carved into the top rail and once filled with
  // ivory paint, most of which is still in the cuts. It is made flat first —
  // the cut, its shadowed upper edges, the light on its lower ones — and then
  // laid on the door a sliver at a time, each as tall as the door is there,
  // so it lies in the wood and runs away down the hall with it.
  {
    const R = 3, fw = 200, fh = 70;
    const flat = makeCanvas(fw * R, fh * R);
    const g = flat.getContext("2d");
    g.scale(R, R);
    const text = ROMAN[d.number - 1];
    g.font = '700 56px Georgia, "Times New Roman", serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    const put = (dx, dy, fill) => {
      g.fillStyle = fill;
      g.fillText(text, fw / 2 + dx, fh / 2 + 2 + dy);
    };
    // the wood's light catching the cut's lower-right edge
    put(1.3, 1.4, "rgba(255,214,170,0.22)");
    // the cut itself, dark where the chisel went in
    put(0, 0, "#070403");
    // the old paint lying in it, shadowed along the top and left of the cut
    g.save();
    g.globalCompositeOperation = "source-atop";
    put(0.9, 1.1, "#b3a384");
    // worn thin in places
    const rnd2 = lcg(700 + d.number);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(20,12,6,${(0.15 + rnd2() * 0.4).toFixed(2)})`;
      g.fillRect(rnd2() * fw, rnd2() * fh, 1 + rnd2() * 5, 0.6 + rnd2() * 1.4);
    }
    g.restore();
    // where on the door it goes: the middle of the top rail
    const X = d.side * L.wall;
    const span = [0.3, 0.7];
    const zAt = (k) => d.z + DOOR_LEN * (d.side < 0 ? span[0] + (span[1] - span[0]) * k : span[1] - (span[1] - span[0]) * k);
    const tall = L.floor - L.doorTop;
    const Ytop = L.doorTop + tall * 0.022;
    for (let cx = 0; cx < fw; cx++) {
      const p = L.P(X, Ytop, zAt(cx / fw)), q = L.P(X, Ytop, zAt((cx + 1) / fw));
      ctx.drawImage(flat, cx * R, 0, R, fh * R, Math.min(p.x, q.x), p.y, Math.abs(q.x - p.x) + 0.6, (tall * 0.09) / zAt((cx + 0.5) / fw));
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

// What a hall gathers: a chandelier, unlit, over the middle of it; at the far
// end a long-case clock and a coat stand either side of the window; between
// the doors a little table with a fern, a chair, an umbrella stand; a trunk.
function paintThings(ctx, L) {
  const { P, wall, floor, ceil, H } = L;
  const dark = "#070504";
  // ── the chandelier: old bronze on a chain from a plaster rose — a turned
  // stem, eight arms sweeping out and up to their candle cups, a drop of cut
  // glass under each, the candles out; the moon from the window on it
  {
    const z = 1.9;
    const hub = P(0, ceil + H * 0.26, z);
    const top = P(0, ceil, z);
    const k = H / 700 / z;
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.scale(k, k);
    const drop = (top.y - hub.y) / k; // the ceiling, in these units (negative)
    const bronze = (x0, x1) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, "#1a1208");
      g.addColorStop(0.3, "#6a5226");
      g.addColorStop(0.5, "#a88c4a");
      g.addColorStop(0.72, "#4a3816");
      g.addColorStop(1, "#120c05");
      return g;
    };
    // the rose on the ceiling, the chain down from it
    ctx.fillStyle = "#1c1a1c";
    ctx.beginPath(); ctx.ellipse(0, drop + 4, 44, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5a4620";
    ctx.lineWidth = 3;
    for (let y = drop + 10; y < -96; y += 13) {
      ctx.beginPath(); ctx.ellipse(0, y + 5, 3.6, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const R0 = 132, TILT = 0.22; // the ring of cups: how wide, and how round it looks from below
    const arm = (a, front) => {
      const ex = Math.cos(a) * R0, ey = Math.sin(a) * R0 * TILT - 14;
      // the arm: out low from the stem, then up to its cup
      for (const [w, col] of [[6.5, "#120c05"], [4, front ? "#8a6c34" : "#4a3a1a"], [1.3, front ? "rgba(226,206,150,0.7)" : "rgba(160,170,200,0.3)"]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, 34 + Math.sin(a) * 4);
        ctx.bezierCurveTo(Math.cos(a) * 60, 66 + Math.sin(a) * 12, ex * 0.86, ey + 46, ex, ey + 6);
        ctx.stroke();
      }
      // the drip pan and the cup
      ctx.fillStyle = "#120c05";
      ctx.beginPath(); ctx.ellipse(ex, ey + 6, 15, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bronze(ex - 15, ex + 15);
      ctx.beginPath(); ctx.ellipse(ex, ey + 4, 15, 4.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bronze(ex - 7, ex + 7);
      ctx.fillRect(ex - 6, ey - 8, 12, 12);
      // the candle: wax run down one side, a black wick
      const wax = ctx.createLinearGradient(ex - 5, 0, ex + 5, 0);
      wax.addColorStop(0, "#8a8370");
      wax.addColorStop(0.45, "#e6dfc8");
      wax.addColorStop(1, "#6e6858");
      ctx.fillStyle = wax;
      ctx.fillRect(ex - 4.4, ey - 46, 8.8, 40);
      ctx.beginPath(); ctx.ellipse(ex, ey - 46, 4.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(ex + 1.6, ey - 46, 2.4, 16);
      ctx.fillStyle = "#0a0806";
      ctx.fillRect(ex - 0.7, ey - 52, 1.4, 6);
      // the glass drop under the pan, catching the moon
      ctx.strokeStyle = "rgba(190,206,240,0.4)";
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(ex, ey + 9); ctx.lineTo(ex, ey + 18); ctx.stroke();
      ctx.fillStyle = "rgba(170,190,230,0.34)";
      ctx.beginPath();
      ctx.moveTo(ex, ey + 18); ctx.lineTo(ex + 4, ey + 26); ctx.lineTo(ex, ey + 38); ctx.lineTo(ex - 4, ey + 26);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(240,246,255,0.8)";
      ctx.fillRect(ex - 1.6, ey + 23, 1.4, 5);
    };
    const angles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + 0.32);
    // the arms at the back first
    for (const a of angles) if (Math.sin(a) < 0) arm(a, false);
    // the stem: a vase, a collar, a bowl, and a ball to finish it
    ctx.fillStyle = bronze(-22, 22);
    ctx.beginPath();
    ctx.moveTo(-5, -96);
    ctx.bezierCurveTo(-7, -70, -20, -62, -18, -40);
    ctx.bezierCurveTo(-16, -22, -7, -16, -8, -4);
    ctx.lineTo(-22, 2);
    ctx.bezierCurveTo(-28, 22, -18, 40, -10, 46);
    ctx.lineTo(-6, 60);
    ctx.lineTo(6, 60);
    ctx.lineTo(10, 46);
    ctx.bezierCurveTo(18, 40, 28, 22, 22, 2);
    ctx.lineTo(8, -4);
    ctx.bezierCurveTo(7, -16, 16, -22, 18, -40);
    ctx.bezierCurveTo(20, -62, 7, -70, 5, -96);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    for (const y of [-40, -4, 2, 46]) ctx.fillRect(-24, y, 48, 2);
    ctx.fillStyle = bronze(-9, 9);
    ctx.beginPath(); ctx.arc(0, 70, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, 78); ctx.lineTo(3, 78); ctx.lineTo(0, 92); ctx.closePath(); ctx.fill();
    // then the arms toward us
    for (const a of angles) if (Math.sin(a) >= 0) arm(a, true);
    ctx.restore();
    // the moon on its undersides
    soft(ctx, hub.x, hub.y + 60 * k, 150 * k, 30 * k, MOON, 0.1, "lighter");
  }
  // something standing on the floor against a wall, at a depth: drawn in its
  // own units (1 = a pixel at the picture), its foot at (0, 0), mirrored for
  // the right-hand wall
  const stand = (side, z, inset, draw) => {
    const p = P(side * (wall - inset), floor, z);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale((side < 0 ? 1 : -1) / z, 1 / z);
    ctx.scale(H / 700, H / 700);
    draw();
    ctx.restore();
  };
  const shadow = (w) => soft(ctx, 0, 2, w, 7, "0,0,0", 0.7);
  // ── the long-case clock, left of the window
  stand(-1, END - 0.12, wall * 0.5, () => {
    shadow(40);
    const g = ctx.createLinearGradient(-26, 0, 26, 0);
    g.addColorStop(0, "#1c0f08"); g.addColorStop(0.5, "#3e2414"); g.addColorStop(1, "#140a05");
    ctx.fillStyle = g;
    ctx.fillRect(-26, -30, 52, 30);
    ctx.fillRect(-20, -250, 40, 222);
    ctx.fillRect(-30, -340, 60, 92);
    ctx.beginPath(); ctx.moveTo(-34, -340); ctx.lineTo(0, -372); ctx.lineTo(34, -340); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d8cdb0";
    ctx.beginPath(); ctx.arc(0, -296, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1a120a"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, -296); ctx.lineTo(0, -313); ctx.moveTo(0, -296); ctx.lineTo(9, -290); ctx.stroke();
    ctx.fillStyle = "#0a0605";
    ctx.fillRect(-12, -236, 24, 170);
    ctx.fillStyle = "#b8923e";
    ctx.fillRect(-1.2, -230, 2.4, 120);
    ctx.beginPath(); ctx.arc(0, -104, 9, 0, Math.PI * 2); ctx.fill();
  });
  // ── the coat stand, right of the window: a coat and a hat on it
  stand(1, END - 0.12, wall * 0.5, () => {
    shadow(34);
    ctx.strokeStyle = "#1c120a"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -330); ctx.stroke();
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(d * 30, 0); ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, -306); ctx.quadraticCurveTo(d * 26, -306, d * 30, -326); ctx.stroke();
      ctx.lineWidth = 7;
    }
    ctx.lineCap = "butt";
    ctx.fillStyle = "#16181e";
    ctx.beginPath();
    ctx.moveTo(-28, -318); ctx.quadraticCurveTo(-52, -200, -44, -70); ctx.lineTo(-6, -64); ctx.lineTo(-2, -310); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0e0f12";
    ctx.beginPath(); ctx.ellipse(30, -338, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(30, -350, 15, 14, 0, Math.PI, 0); ctx.fill();
  });
  // ── between the first two doors, left: a little table, a fern in a pot
  stand(-1, 2.01, 46, () => {
    shadow(52);
    ctx.fillStyle = dark;
    for (const x of [-30, 30]) ctx.fillRect(x - 3, -116, 6, 116);
    const tg = ctx.createLinearGradient(0, -128, 0, -112);
    tg.addColorStop(0, "#5a3a22"); tg.addColorStop(1, "#1e120a");
    ctx.fillStyle = tg;
    ctx.fillRect(-44, -128, 88, 14);
    ctx.fillStyle = "#6a4a3a";
    ctx.beginPath(); ctx.moveTo(-20, -128); ctx.lineTo(20, -128); ctx.lineTo(15, -164); ctx.lineTo(-15, -164); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#16301e"; ctx.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i - 5) * 0.26;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -162);
      ctx.quadraticCurveTo(Math.cos(a) * 44, -162 + Math.sin(a) * 70, Math.cos(a) * 70, -150 + Math.sin(a) * 62);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  });
  // ── and right: a hall chair, its tall carved back to the wall
  stand(1, 2.01, 44, () => {
    shadow(46);
    ctx.fillStyle = dark;
    for (const x of [-26, 22]) ctx.fillRect(x, -74, 6, 74);
    const cg = ctx.createLinearGradient(0, -200, 0, -60);
    cg.addColorStop(0, "#3e2616"); cg.addColorStop(1, "#1a0e08");
    ctx.fillStyle = cg;
    ctx.fillRect(-32, -86, 64, 14);
    ctx.beginPath();
    ctx.moveTo(-28, -86); ctx.lineTo(-30, -190); ctx.quadraticCurveTo(0, -214, 30, -190); ctx.lineTo(28, -86); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a1014";
    ctx.fillRect(-22, -176, 44, 76);
  });
  // ── between the last two doors, left: an umbrella stand; right: a trunk
  stand(-1, 2.9, 40, () => {
    shadow(30);
    const g = ctx.createLinearGradient(-22, 0, 22, 0);
    g.addColorStop(0, "#2a1e0c"); g.addColorStop(0.5, "#7a5a22"); g.addColorStop(1, "#22180a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-22, -92); ctx.lineTo(22, -92); ctx.lineTo(17, 0); ctx.lineTo(-17, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#0a0a0c"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-6, -80); ctx.lineTo(-16, -190); ctx.stroke();
    ctx.beginPath(); ctx.arc(-9, -192, 8, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = "#3a2410";
    ctx.beginPath(); ctx.moveTo(8, -80); ctx.lineTo(18, -176); ctx.stroke();
    ctx.lineCap = "butt";
  });
  stand(1, 2.9, 50, () => {
    shadow(60);
    const g = ctx.createLinearGradient(0, -70, 0, 0);
    g.addColorStop(0, "#4a3220"); g.addColorStop(1, "#1a100a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-52, -70, 104, 70, [10, 10, 2, 2]); ctx.fill();
    ctx.fillStyle = "#8a6a2a";
    for (const x of [-34, 30]) ctx.fillRect(x, -70, 6, 70);
    ctx.fillRect(-7, -44, 14, 16);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-52, -46, 104, 2.4);
  });
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
