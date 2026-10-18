import { soft, polygon, lcg, grain, vignette, makeCanvas } from "../../shared/paint.js";
import { DOOR_LENGTH } from "../hall/doorMotion.js";
import { paintAttic } from "./attic.js";

/** The gallery off the top floor: a long stone passage under a barrel vault,
 *  given up to the weather years ago — and dark. The only light is an iron
 *  lantern by each of its two doors, still burning, so that each door
 *  stands in its own warm pool with the dark between them; past the last,
 *  nothing can be made out at all.
 *
 *  Old ashlar, every block its own shade, dirt in the joints; transverse
 *  arches on pilasters dividing the vault into bays; big worn flagstones and
 *  a rotted runner down the middle. Moss up the foot of the walls and in the
 *  joints of the floor, stones come down from the vault, a rusted water pipe
 *  along the right-hand wall with a joint that leaks into a pool (the scene
 *  keeps it dripping, `L.leak`). The doors are the house's own (passed in).
 *
 *  It shares the halls' projection: P(X, Y, z), X across, Y down from the
 *  eye (the floor is positive), z away from us. */

const END = 6.4;
const BAYS = [1.55, 2.75, 3.95, 5.15];
const WARM = "255,178,96", MOON = "150,178,232";
const fill = (g, points, style) => { polygon(g, points); g.fillStyle = style; g.fill(); };
const line = (g, points, style, width = 1) => {
  g.beginPath(); points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.strokeStyle = style; g.lineWidth = width; g.stroke();
};
const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

/** A confined attic passage, sharing the halls' projection and door contract. */
export function layoutGallery(W, H) {
  const L = { W, H, u: Math.min(W / 1000, H / 700), wing: true, worn: true, theme: "attic" };
  L.ambientLight = 0.3;
  L.vp = { x: W * 0.5, y: H * 0.45 };
  // Normalised landmarks match the photographic plate at every screen size.
  L.wall = W * 0.5;
  L.floor = H * 0.72;
  L.ceil = -H * 0.82;
  L.spring = -H * 0.41;
  L.doorTop = L.floor - H * 1.08;
  L.P = (X, Y, z) => ({ x: L.vp.x + X / z, y: L.vp.y + Y / z, s: 1 / z });
  // two doors, facing each other across it: XII on the left, XIII on the right
  L.doors = [[-1, 1.8], [1, 1.8]].map(([side, z], i) => {
    const X = side * L.wall;
    const quad = [L.P(X, L.doorTop, z), L.P(X, L.doorTop, z + DOOR_LENGTH), L.P(X, L.floor, z + DOOR_LENGTH), L.P(X, L.floor, z)];
    const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    return { side, z, i, number: 12 + i, quad,
      box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
      sill: L.P(X - side * L.wall * 0.07, L.floor, z + DOOR_LENGTH / 2),
    };
  });
  // a lantern on the wall by each door, on the side toward us, at the height of its head
  L.sconces = L.doors.map((d) => ({ side: d.side, z: d.z - 0.13, dead: false, ...L.P(d.side * L.wall * 0.985, L.doorTop + H * 0.1, d.z - 0.13) }));
  // the water pipe along the right-hand wall under the spring of the vault, and its leaking joint
  L.pipes = { X: L.wall * 0.975, Y: L.spring + H * 0.06, r: H * 0.014, leakZ: 2.85 };
  const at = L.P(L.pipes.X, L.pipes.Y + L.pipes.r, L.pipes.leakZ), foot = L.P(L.pipes.X * 0.965, L.floor, L.pipes.leakZ);
  L.leak = { x: at.x, y0: at.y, y1: foot.y, s: 2 * L.u * at.s };
  return L;
}

// a strip of points across the vault at depth z, from the left spring over the crown to the right
function arch(L, z, inset = 0) {
  return Array.from({ length: 41 }, (_, i) => {
    const a = (i * Math.PI) / 40;
    return L.P(-(L.wall - inset) * Math.cos(a), L.spring - (L.spring - L.ceil - inset) * Math.sin(a), z);
  });
}

// ── the stone ───────────────────────────────────────────────────────────────

// fine grit over a surface: specks lighter and darker, many of them
function grit(g, L, at, n, rnd, size = 1.4) {
  for (let i = 0; i < n; i++) {
    const p = at(rnd(), rnd());
    g.fillStyle = rnd() < 0.55 ? `rgba(0,0,0,${(0.08 + rnd() * 0.2).toFixed(2)})` : `rgba(200,196,182,${(0.03 + rnd() * 0.07).toFixed(2)})`;
    const s = Math.max(0.6, size * L.u * p.s * (0.5 + rnd()));
    g.fillRect(p.x, p.y, s, s);
  }
}

// The walls: ashlar in courses, each block its own grey-brown, the joints
// dark with dirt, a little light along the top of each block.
function walls(g, L, rnd) {
  const { H, P, wall, floor, spring } = L;
  const rows = 9, rh = (floor - spring) / rows;
  for (const side of [-1, 1]) {
    const X = side * wall;
    fill(g, [P(X, spring, 0.6), P(X, spring, END), P(X, floor, END), P(X, floor, 0.6)], "#1c1b19");
    for (let r = 0; r < rows; r++) {
      const y0 = spring + r * rh, y1 = y0 + rh;
      for (let z = 0.6 - (r % 2) * 0.21; z < END; z += 0.42) {
        const z0 = Math.max(0.6, z), z1 = Math.min(END, z + 0.42);
        if (z1 <= z0) continue;
        const k = 0.75 + rnd() * 0.4, warm = rnd() * 6;
        fill(g, [P(X, y0, z0), P(X, y0, z1), P(X, y1, z1), P(X, y1, z0)], rgb(58 * k + warm, 55 * k + warm * 0.6, 50 * k));
        // its weathered face
        const face = (a, b) => P(X, y0 + rh * b, z0 + (z1 - z0) * a);
        grit(g, L, face, 26, rnd);
        if (rnd() < 0.3) { const c = face(0.2 + rnd() * 0.6, 0.3 + rnd() * 0.5); soft(g, c.x, c.y, (wall * 0.03) / z0, (rh * 0.4) / z0, "0,0,0", 0.25); }
        // its joints: a dark line along the foot and down the far end, a light one along the top
        line(g, [P(X, y1, z0), P(X, y1, z1)], "rgba(6,6,5,0.75)", Math.max(0.7, (2.2 * L.u) / z0));
        line(g, [P(X, y0, z1), P(X, y1, z1)], "rgba(6,6,5,0.6)", Math.max(0.6, (1.6 * L.u) / z1));
        line(g, [P(X, y0 + 2, z0), P(X, y0 + 2, z1)], "rgba(220,214,196,0.06)", Math.max(0.5, L.u / z0));
      }
    }
    // a plinth course along the foot, standing a little proud
    fill(g, [P(X, floor - H * 0.06, 0.6), P(X, floor - H * 0.06, END), P(X, floor, END), P(X, floor, 0.6)], "rgba(10,10,9,0.45)");
    line(g, [P(X, floor - H * 0.06, 0.6), P(X, floor - H * 0.06, END)], "rgba(200,196,180,0.08)", L.u);
  }
}

// The vault: a barrel of the same stone, its courses running away from us,
// joints staggered; darker toward the crown.
function vault(g, L, rnd) {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI;
    const at = (a, z) => L.P(-L.wall * Math.cos(a), L.spring - (L.spring - L.ceil) * Math.sin(a), z);
    for (let z = 0.6 - (i % 2) * 0.2; z < END; z += 0.4) {
      const z0 = Math.max(0.6, z), z1 = Math.min(END, z + 0.4);
      if (z1 <= z0) continue;
      const k = 0.55 + rnd() * 0.3 - Math.sin((a0 + a1) / 2) * 0.12;
      fill(g, [at(a0, z0), at(a1, z0), at(a1, z1), at(a0, z1)], rgb(52 * k, 50 * k, 46 * k));
      grit(g, L, (u, v) => at(a0 + (a1 - a0) * u, z0 + (z1 - z0) * v), 12, rnd);
      line(g, [at(a0, z1), at(a1, z1)], "rgba(5,5,4,0.6)", Math.max(0.5, (1.4 * L.u) / z1));
    }
    line(g, Array.from({ length: 12 }, (_, j) => at(a1, 0.6 + ((END - 0.6) * j) / 11)), "rgba(5,5,4,0.7)", Math.max(0.6, L.u));
  }
}

// The floor: big flagstones, no two alike, worn hollow, dirt in the joints;
// down the middle the runner, rotted, its border gone dark.
function floor(g, L, rnd) {
  const { P, wall, floor: y } = L;
  let z = 0.6;
  while (z < END) {
    const len = 0.32 + rnd() * 0.16, z1 = Math.min(END, z + len);
    let x = -wall;
    while (x < wall) {
      const w = wall * (0.3 + rnd() * 0.22), x1 = Math.min(wall, x + w);
      const k = 0.7 + rnd() * 0.35;
      fill(g, [P(x, y, z), P(x1, y, z), P(x1, y, z1), P(x, y, z1)], rgb(50 * k, 48 * k, 44 * k));
      grit(g, L, (a, b) => P(x + (x1 - x) * a, y, z + (z1 - z) * b), 20, rnd, 1.8);
      // worn hollow in the middle, where the feet went
      const c = P((x + x1) / 2, y, (z + z1) / 2);
      soft(g, c.x, c.y, ((x1 - x) * 0.4) / ((z + z1) / 2), (L.H * 0.012) / ((z + z1) / 2), "200,196,180", 0.05);
      line(g, [P(x, y, z), P(x1, y, z), P(x1, y, z1)], "rgba(4,4,3,0.8)", Math.max(0.7, (2 * L.u) / z));
      x = x1;
    }
    z = z1;
  }
  // the runner: once deep red, now near black, holes rotted through it
  const run = (a, b, style) => fill(g, [P(wall * a, y - 0.5, 0.6), P(wall * b, y - 0.5, 0.6), P(wall * b, y - 0.5, END), P(wall * a, y - 0.5, END)], style);
  run(-0.3, 0.3, "#1e1012");
  run(-0.27, 0.27, "#2a1416");
  run(-0.22, 0.22, "#22111a");
  for (const s of [-1, 1]) run(s * 0.265, s * 0.255, "rgba(120,96,60,0.22)");
  grit(g, L, (a, b) => P(wall * (a * 0.6 - 0.3), y - 0.5, 0.6 + b * (END - 0.6)), 600, rnd, 2);
  for (let i = 0; i < 14; i++) {
    const zz = 0.8 + rnd() * 4.8, p = P((rnd() * 2 - 1) * wall * 0.24, y - 0.6, zz);
    soft(g, p.x, p.y, (L.wall * (0.03 + rnd() * 0.06)) / zz, (L.H * (0.01 + rnd() * 0.015)) / zz, rnd() < 0.6 ? "40,40,36" : "0,0,0", 0.7);
  }
}

// The transverse arches: a pilaster up each wall and a band of voussoirs over
// the vault, a little proud of it, at each bay.
function arches(g, L, rnd) {
  const { P, H, wall, floor, spring } = L;
  for (const z of [...BAYS].reverse()) {
    const d = 0.07, inset = H * 0.07;
    // the band over the vault: its underside, its face toward us
    const outer = arch(L, z), inner = arch(L, z, inset), back = arch(L, z + d, inset);
    fill(g, [...inner, ...back.slice().reverse()], "#1a1917");
    for (let i = 0; i < 40; i += 2) {
      const k = 0.7 + rnd() * 0.3;
      fill(g, [outer[i], outer[i + 2], inner[i + 2], inner[i]], rgb(66 * k, 62 * k, 56 * k));
      line(g, [outer[i], inner[i]], "rgba(5,5,4,0.7)", Math.max(0.6, (1.6 * L.u) / z));
    }
    line(g, inner, "rgba(220,212,190,0.08)", Math.max(0.6, (1.4 * L.u) / z));
    // the pilasters
    for (const side of [-1, 1]) {
      const X = side * wall, Xi = side * (wall - inset);
      fill(g, [P(Xi, spring, z), P(Xi, spring, z + d), P(Xi, floor, z + d), P(Xi, floor, z)], "#141312");
      for (let y = spring; y < floor; y += H * 0.16) {
        const k = 0.72 + rnd() * 0.3, y1 = Math.min(floor, y + H * 0.16);
        fill(g, [P(X, y, z), P(Xi, y, z), P(Xi, y1, z), P(X, y1, z)], rgb(64 * k, 60 * k, 55 * k));
        line(g, [P(X, y1, z), P(Xi, y1, z)], "rgba(5,5,4,0.7)", Math.max(0.6, (1.6 * L.u) / z));
      }
      grit(g, L, (a, b) => P(X + (Xi - X) * a, spring + (floor - spring) * b, z), 60, rnd);
    }
  }
}

// a door in the stone: deep jambs and a lintel of bigger blocks, a step before it; the door itself the house's own
function door(g, L, d, paintDoor, rnd) {
  const { P, H } = L;
  const X = d.side * L.wall, z0 = d.z - 0.05, z1 = d.z + DOOR_LENGTH + 0.05, top = L.doorTop - H * 0.08;
  fill(g, [P(X, top, z0), P(X, top, z1), P(X, L.floor, z1), P(X, L.floor, z0)], "#0c0b0a");
  for (const [a, b] of [[z0, d.z], [d.z + DOOR_LENGTH, z1]]) {
    for (let y = top; y < L.floor; y += H * 0.18) {
      const k = 0.78 + rnd() * 0.3;
      fill(g, [P(X, y, a), P(X, y, b), P(X, Math.min(L.floor, y + H * 0.18), b), P(X, Math.min(L.floor, y + H * 0.18), a)], rgb(68 * k, 64 * k, 58 * k));
      line(g, [P(X, y, a), P(X, y, b)], "rgba(5,5,4,0.7)", Math.max(0.6, (1.6 * L.u) / a));
    }
  }
  fill(g, [P(X, top, z0), P(X, top, z1), P(X, L.doorTop, z1), P(X, L.doorTop, z0)], rgb(74, 70, 63));
  line(g, [P(X, L.doorTop, z0), P(X, L.doorTop, z1)], "rgba(5,5,4,0.8)", Math.max(0.8, (2 * L.u) / d.z));
  if (paintDoor) paintDoor(g, L, d); else fill(g, d.quad, "#211b1a");
  // the step
  fill(g, [P(X, L.floor - 2, d.z - 0.02), P(X, L.floor - 2, d.z + DOOR_LENGTH + 0.02), P(X - d.side * L.wall * 0.06, L.floor - 2, d.z + DOOR_LENGTH + 0.02), P(X - d.side * L.wall * 0.06, L.floor - 2, d.z - 0.02)], "#3a3732");
}

// A lantern on its iron bracket: a little house of glass with a candle in it,
// and its light — warm across the door beside it, on the stone round it, and
// in a pool on the floor before it.
function lantern(g, L, s, d) {
  const k = L.u / s.z, x = s.x - s.side * 20 * k, y = s.y - 24 * k;
  // the light it gives: over the door, the wall, the floor
  const mid = L.P(d.side * L.wall, (L.doorTop + L.floor) / 2, d.z + DOOR_LENGTH * 0.45);
  soft(g, mid.x, mid.y, d.box.width * 0.9, d.box.height * 0.6, WARM, 0.32, "lighter");
  soft(g, x, y, 260 * k, 300 * k, WARM, 0.32, "lighter");
  const pool = L.P(s.side * L.wall * 0.8, L.floor, d.z + 0.2);
  soft(g, pool.x, pool.y, (L.wall * 0.42) / d.z, (L.H * 0.06) / d.z, WARM, 0.3, "lighter");
  // the bracket
  line(g, [{ x: s.x, y: y + 34 * k }, { x: s.x, y: y - 32 * k }, { x, y: y - 39 * k }, { x, y: y - 25 * k }], "#0e0f10", 5 * k);
  line(g, [{ x: s.x - k, y: y - 32 * k }, { x: x - k, y: y - 39 * k }], "#7a6a4a", 1.4 * k);
  // the glass, the frame of it, its roof
  const glass = g.createLinearGradient(x - 12 * k, 0, x + 12 * k, 0);
  glass.addColorStop(0, "#7a4a24"); glass.addColorStop(0.5, "#ffd890"); glass.addColorStop(1, "#a06a30");
  fill(g, [{ x: x - 12 * k, y: y - 23 * k }, { x: x + 12 * k, y: y - 23 * k }, { x: x + 9 * k, y: y + 22 * k }, { x: x - 9 * k, y: y + 22 * k }], glass);
  g.strokeStyle = "#141516"; g.lineWidth = 2.5 * k; g.stroke();
  line(g, [{ x, y: y - 24 * k }, { x, y: y + 24 * k }], "#2a2620", 2 * k);
  fill(g, [{ x: x - 16 * k, y: y - 24 * k }, { x, y: y - 38 * k }, { x: x + 16 * k, y: y - 24 * k }], "#1c1e1f");
  line(g, [{ x: x - 16 * k, y: y - 24 * k }, { x: x + 16 * k, y: y - 24 * k }], "#8a7650", 1.6 * k);
  soft(g, x, y + 2 * k, 22 * k, 28 * k, "255,220,160", 0.7, "lighter");
}

// What the weather has done: moss up the foot of the walls and the pilasters
// and in the floor's joints, cracks, stones come down from the vault, the
// rusted pipe and its leak, the wall streaked under it and the pool it makes.
function ruin(g, L, rnd) {
  const { H, P, wall, floor: y, spring, u } = L;
  const moss = (p, w, h, a = 0.75) => {
    soft(g, p.x, p.y, w, h, "26,48,24", a);
    for (let i = 0; i < 24; i++) {
      g.fillStyle = rnd() < 0.65 ? `rgba(${Math.round(36 + rnd() * 36)},${Math.round(66 + rnd() * 46)},${Math.round(28 + rnd() * 24)},${(0.3 + rnd() * 0.45).toFixed(2)})` : "rgba(6,10,6,0.55)";
      g.beginPath(); g.arc(p.x + (rnd() - 0.5) * w * 1.6, p.y + (rnd() - 0.5) * h * 1.3, Math.max(0.7, w * (0.02 + rnd() * 0.05)), 0, Math.PI * 2); g.fill();
    }
  };
  // damp run down the stone from the vault
  for (let i = 0; i < 16; i++) {
    const side = rnd() < 0.5 ? -1 : 1, z = 0.8 + rnd() * 5;
    const a = P(side * wall, spring, z), b = P(side * wall, spring + (y - spring) * (0.3 + rnd() * 0.6), z);
    const s = g.createLinearGradient(a.x, a.y, b.x, b.y);
    s.addColorStop(0, "rgba(6,8,6,0.6)"); s.addColorStop(1, "rgba(6,8,6,0)");
    fill(g, [P(side * wall, spring, z), P(side * wall, spring, z + 0.06 + rnd() * 0.1), b, P(side * wall, b.y, z)], s);
  }
  // cracks
  for (let i = 0; i < 9; i++) {
    const side = rnd() < 0.5 ? -1 : 1, z0 = 0.9 + rnd() * 4.5;
    let yy = spring + (y - spring) * rnd() * 0.5, z = z0;
    const pts = [P(side * wall, yy, z)];
    for (let k = 0; k < 6; k++) { yy += H * (0.03 + rnd() * 0.05); z += (rnd() - 0.5) * 0.1; pts.push(P(side * wall, Math.min(y, yy), z)); }
    line(g, pts, "rgba(2,2,2,0.8)", Math.max(0.7, (1.5 * u) / z0));
  }
  // stones come down, lying where they fell
  for (let i = 0; i < 9; i++) {
    const z = 1 + rnd() * 4.6, x = (rnd() < 0.5 ? -1 : 1) * wall * (0.4 + rnd() * 0.5);
    for (let k = 0; k < 3; k++) {
      const q = P(x + (rnd() - 0.5) * wall * 0.12, y, z - 0.05 + rnd() * 0.1), w = ((18 + rnd() * 28) * u) / z;
      soft(g, q.x, q.y, w * 1.2, w * 0.25, "0,0,0", 0.7);
      fill(g, [{ x: q.x - w * 0.6, y: q.y }, { x: q.x - w * 0.4, y: q.y - w * 0.5 }, { x: q.x + w * 0.5, y: q.y - w * 0.42 }, { x: q.x + w * 0.62, y: q.y }], rnd() < 0.5 ? "#3a3833" : "#47443d");
      line(g, [{ x: q.x - w * 0.4, y: q.y - w * 0.5 }, { x: q.x + w * 0.5, y: q.y - w * 0.42 }], "rgba(220,212,190,0.12)", Math.max(0.6, u / z));
    }
  }
  // moss
  for (const side of [-1, 1]) {
    for (let z = 0.8; z < END; z += 0.2 + rnd() * 0.28) {
      if (rnd() < 0.2) continue;
      moss(P(side * wall, y - H * (0.02 + rnd() * 0.12), z), (wall * (0.05 + rnd() * 0.08)) / z, (H * (0.04 + rnd() * 0.1)) / z);
      if (rnd() < 0.5) moss(P(side * wall * (0.65 + rnd() * 0.3), y, z), (wall * (0.04 + rnd() * 0.05)) / z, (H * 0.012) / z, 0.55);
    }
  }
  for (const z of BAYS) for (const side of [-1, 1]) moss(P(side * wall * 0.95, y - H * 0.06, z), (wall * 0.07) / z, (H * 0.12) / z);
  // ── the pipe and its leak
  const { X, Y, r, leakZ } = L.pipes;
  const tube = (z0, z1, rr, col) => fill(g, [P(X, Y - rr, z0), P(X, Y - rr, z1), P(X, Y + rr, z1), P(X, Y + rr, z0)], col);
  tube(0.6, END, r, "#0f1012");
  tube(0.6, END, r * 0.45, "#22252a");
  tube(0.6, END, r * 0.14, "rgba(170,190,220,0.4)");
  for (let z = 0.85; z < END; z += 0.6) {
    tube(z, z + 0.05, r * 1.5, "#1a1c1e");
    line(g, [P(X, Y - r * 1.4, z + 0.025), P(wall, Y - r * 2.6, z + 0.025)], "#0b0c0e", Math.max(1, (5 * u) / z));
  }
  for (let i = 0; i < 70; i++) {
    const z = 0.7 + rnd() * (END - 0.8), p = P(X, Y + (rnd() - 0.5) * r * 1.7, z);
    g.fillStyle = `rgba(${Math.round(110 + rnd() * 50)},${Math.round(50 + rnd() * 24)},22,${(0.3 + rnd() * 0.4).toFixed(2)})`;
    g.fillRect(p.x, p.y, Math.max(1, (8 * u) / z), Math.max(1, (3 * u) / z));
  }
  const wet = g.createLinearGradient(0, P(wall, Y, leakZ).y, 0, P(wall, y, leakZ).y);
  wet.addColorStop(0, "rgba(8,14,8,0.8)"); wet.addColorStop(0.5, "rgba(26,46,24,0.6)"); wet.addColorStop(1, "rgba(6,10,8,0.7)");
  fill(g, [P(wall, Y, leakZ - 0.06), P(wall, Y, leakZ + 0.08), P(wall, y, leakZ + 0.16), P(wall, y, leakZ - 0.14)], wet);
  for (let i = 0; i < 34; i++) {
    const p = P(X, Y + (rnd() - 0.2) * r * 2.4, leakZ + (rnd() - 0.5) * 0.07);
    g.fillStyle = rnd() < 0.5 ? `rgba(196,204,190,${(0.2 + rnd() * 0.4).toFixed(2)})` : `rgba(60,104,66,${(0.3 + rnd() * 0.4).toFixed(2)})`;
    g.beginPath(); g.arc(p.x, p.y, Math.max(0.8, ((2 + rnd() * 3.5) * u) / leakZ), 0, Math.PI * 2); g.fill();
  }
  const pool = P(wall * 0.84, y, leakZ);
  g.save();
  g.beginPath();
  g.ellipse(pool.x, pool.y, (wall * 0.2) / leakZ, (H * 0.026) / leakZ, 0, 0, Math.PI * 2);
  g.ellipse(pool.x - (wall * 0.12) / leakZ, pool.y + (H * 0.012) / leakZ, (wall * 0.12) / leakZ, (H * 0.016) / leakZ, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(3,5,7,0.88)";
  g.fill();
  g.clip();
  soft(g, pool.x - (wall * 0.04) / leakZ, pool.y, (wall * 0.12) / leakZ, (H * 0.018) / leakZ, WARM, 0.35, "lighter");
  g.restore();
  moss(P(wall, Y + H * 0.08, leakZ), (wall * 0.1) / leakZ, (H * 0.14) / leakZ);
}

// The dark: everywhere but where a lantern burns. Worked out on a coarse grid
// and laid on smooth; deeper than the house's other rooms, and total at the
// far end of the gallery.
function darkness(g, L, lights) {
  const { W, H } = L;
  const step = 8, gw = Math.ceil(W / step), gh = Math.ceil(H / step);
  const small = makeCanvas(gw, gh);
  const s = small.getContext("2d");
  const img = s.createImageData(gw, gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let dark = 1;
      for (const l of lights) {
        const d = Math.hypot(((x + 0.5) * step - l.x) / l.rx, ((y + 0.5) * step - l.y) / l.ry);
        const t = Math.max(0, 1 - d);
        dark *= 1 - l.k * t * t * (3 - 2 * t);
      }
      const i = (y * gw + x) * 4;
      img.data[i] = 2; img.data[i + 1] = 2; img.data[i + 2] = 3;
      img.data[i + 3] = Math.round(255 * 0.94 * dark);
    }
  }
  s.putImageData(img, 0, 0);
  g.save();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(small, 0, 0, gw * step, gh * step);
  g.restore();
}

/** The gallery, onto a canvas the size of the screen. `paintDoor(g, L, d)`
 *  paints a door (the halls' own). */
export function paintGallery(g, L, paintDoor) {
  if (L.atticMaterials) { paintAttic(g, L, paintDoor); return; }
  const { W, H, P } = L;
  const rnd = lcg(1717);
  g.fillStyle = "#050505"; g.fillRect(0, 0, W, H);
  vault(g, L, rnd);
  walls(g, L, rnd);
  floor(g, L, rnd);
  // the far end: a wall of the same stone, too far and too dark to see
  fill(g, [P(-L.wall, L.ceil, END), P(L.wall, L.ceil, END), P(L.wall, L.floor, END), P(-L.wall, L.floor, END)], "#0a0a09");
  arches(g, L, rnd);
  for (const d of L.doors) door(g, L, d, paintDoor, rnd);
  ruin(g, L, rnd);
  L.doors.forEach((d, i) => lantern(g, L, L.sconces[i], d));
  // the dark, lifted only round each door and its lantern — and very little
  // from behind us, where the rotunda's candles are
  const lights = [{ x: W * 0.5, y: H * 1.05, rx: W * 0.6, ry: H * 0.45, k: 0.45 }];
  L.doors.forEach((d, i) => {
    const s = L.sconces[i], mid = P(d.side * L.wall, (L.doorTop + L.floor) / 2, d.z + DOOR_LENGTH * 0.4);
    lights.push({ x: mid.x, y: mid.y, rx: d.box.width * 1.6 + 60 * L.u, ry: d.box.height * 0.85, k: 0.97 });
    lights.push({ x: s.x, y: s.y, rx: (220 * L.u) / s.z, ry: (240 * L.u) / s.z, k: 0.9 });
  });
  darkness(g, L, lights);
  // a breath of the moon somewhere far off, so the dark is not flat
  const far = P(0, -H * 0.1, END);
  soft(g, far.x, far.y, W * 0.06, H * 0.12, MOON, 0.04, "lighter");
  vignette(g, W, H, 0.8);
  grain(g, W, H, 0.04);
}
