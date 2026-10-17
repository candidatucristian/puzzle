import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { gloom } from "../house/roomKit.js";
import { paintNightWindow } from "../hall/hall.js";
import { paintPassage } from "./doorway.js";
import { paintPlanetarium, paintArmillaryBase, createArmillaryArt, paintPendulum } from "./observatory.js";
import { physicsMaterials, paintPhysicsWindow, paintPhysicsTelescope } from "./materials.js";
import { paintFlatMaterial, paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

/** The top floor of the manor: not a passage but a round room under a dome,
 *  and of a piece with the halls below — the same drab striped paper over
 *  the same oak dado, the same oak doors — and as long shut up. We stand
 *  just inside it, in very little light. Its wall goes round in front of us,
 *  and in it one door, numbered XI, on the right of the curve — with a
 *  sconce either side of the window, of which two
 *  still have a candle alight. Further round on the left an archway opens
 *  on a passage, and an iron gate hangs across it. The paper has come away in places and the
 *  damp has run down from the cornice; there are cobwebs over the doors. In
 *  the middle of the wall, facing us, the window the telescope looks out of
 *  — the very one its puzzle is played at: wide and low-arched, its sheer
 *  curtains tied back, the moon over the valley — and before it the
 *  telescope on its tripod. The floor is parquet, laid in zigzag, dull now
 *  and dusty. Above the cornice a celestial chart follows the blue dome,
 *  between dark ribs; a small brass armillary stands by the left wall and
 *  a small demonstration pendulum hangs beside the door.
 *  At our right hand, the stairs we came up by:
 *  a round well in the floor, the steps winding down it about a post, and a
 *  balustrade of turned oak round its rim.
 *
 *  Measured in centimetres about the room's middle: a place on the wall is
 *  how far round it is (degrees; 0 straight ahead, negative to the left) and
 *  how high. The wall is painted flat, as if unrolled, and laid on the curve
 *  a sliver at a time.
 *
 *  Painted once per screen size: the room; a glow. */

const K = { room: "tp_room", glow: "tp_glow", armillary: "tp_armillary" };
const WARM = "255,190,120";
const MOON = "150,178,232";
const EYE = 150; // how high we look from
const R = 380; // the room's radius
const ZC = 330; // how far ahead of us its middle is
const WALL = 330; // the height of the wall, to the cornice
const SWEEP = 104; // how far round, either way, the wall is painted
const KX = 13, KY = 2; // the unrolled wall: pixels to a degree, to a centimetre
const DOOR = { half: 7, tall: 214 };
// the window: how far round it reaches either way, how high its sill; and how
// it is built — the telescope's own window (see telescope/window.js)
const WIN = { half: 20, sill: 104, tall: 1.04, shape: { ry: 0.495, moonY: 0.17, moonR: 0.077, horizon: 0.9 } };
// the well the stairs come up by: where in the room, and how wide
const WELL = { x: 255, z: 380, r: 85 };
// the doors, left to right: how far round each is, and its number
const DOORS = [[32, "XI"]];
// the archway on the left, and the passage beyond it: how far round, how wide
// either way, how high to the spring of its arch and to its crown
const PASS = { deg: -68, half: 8, spring: 215, tall: 215 };
// the sconces: how far round each is, and whether its candle is still alight
const SCONCES = [[-23, true], [42.5, true]];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutRotunda(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  const f = Math.min(W * 0.56, H * 1.02); // how far off the picture is, in pixels
  const cx = W * 0.5, cy = H * 0.46;
  L.P = (X, Y, Z) => ({ x: cx + (f * X) / Z, y: cy - (f * (Y - EYE)) / Z, s: f / Z });
  // a place on the wall, or (r short of R) on a circle inside it
  L.on = (deg, y, r = R) => { const a = (deg * Math.PI) / 180; return L.P(r * Math.sin(a), y, ZC + r * Math.cos(a)); };
  L.doors = DOORS.map(([deg, number]) => {
    const quad = [L.on(deg - DOOR.half, DOOR.tall), L.on(deg + DOOR.half, DOOR.tall), L.on(deg + DOOR.half, 0), L.on(deg - DOOR.half, 0)];
    const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    return { deg, number, quad, box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } };
  });
  {
    const a = (PASS.deg - PASS.half) * Math.PI / 180, b = (PASS.deg + PASS.half) * Math.PI / 180;
    const left = { x: R * Math.sin(a), z: ZC + R * Math.cos(a) }, right = { x: R * Math.sin(b), z: ZC + R * Math.cos(b) };
    const width = Math.hypot(right.x - left.x, right.z - left.z);
    const ux = (right.x - left.x) / width, uz = (right.z - left.z) / width;
    const project = (x, y, depth = 0) => L.P((left.x + right.x) / 2 + ux * x - uz * depth, y, (left.z + right.z) / 2 + uz * x + ux * depth);
    const half = width / 2;
    const quad = [project(-half, PASS.tall), project(half, PASS.tall), project(half, 0), project(-half, 0)];
    const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    L.passage = { half, project, spring: PASS.spring, tall: PASS.tall, quad, box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } };
  }
  L.sconces = SCONCES.map(([deg, lit]) => ({ deg, dead: !lit, ...L.on(deg, 196, R - 14) }));
  // the telescope, before the window
  const foot = L.P(34, 0, ZC + R - 118), h = 172 * foot.s;
  L.scope = { x: foot.x, y: foot.y, h };
  L.thing = { level: "telescope", label: "Look through the telescope", box: { x: foot.x - h * 0.5, y: foot.y - h * 1.04, width: h * 0.86, height: h * 1.06 } };
  // Tucked against the wall between the passage and the window, well clear
  // of the opening. The smaller pedestal sits just inside the skirting.
  const armillary = L.on(-51, 0, R - 26);
  L.armillary = { ...armillary, s: armillary.s * 0.62 };
  // the window is flat in the wall, which is as good as flat there
  L.eye = { x: cx, y: cy };
  const rx = L.on(WIN.half, 0).x - cx, sill = L.on(0, WIN.sill).y;
  L.win = { x: cx - rx, y: sill - rx * WIN.tall, width: rx * 2, height: rx * WIN.tall };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintRotunda(scene, L, armillaryPhase = 0) {
  const t = scene.textures;
  L.physicsMaterials = physicsMaterials(scene);
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#04060b";
  ctx.fillRect(0, 0, W, H);
  paintDome(ctx, L);
  paintFloor(ctx, L);
  paintWall(ctx, L);
  paintPassage(ctx, L);
  {
    const v = L.win;
    if (!paintPhysicsWindow(ctx, L)) paintNightWindow(ctx, W, H, { cx: v.x + v.width / 2, rx: v.width / 2, top: v.y, sill: v.y + v.height }, L.eye, WIN.shape);
  }
  paintMoonlight(ctx, L);
  paintArmillaryBase(ctx, L);
  if (!paintPhysicsTelescope(ctx, L)) paintTelescope(ctx, L.scope.x, L.scope.y, L.scope.h);
  paintStairs(ctx, L);
  paintShade(ctx, L);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  const armillary = createArmillaryArt(scene, L, K.armillary, paintShade, armillaryPhase);
  return { keys: K, armillary };
}

function paintShade(ctx, L) {
  const { W, H } = L;
  // the dark, lifted by the window and by each candle
  const w = L.win;
  const well = L.P(WELL.x, 40, WELL.z);
  gloom(ctx, L, [
    { x: W * 0.5, y: H * 0.08, rx: W * 0.65, ry: H * 0.31, k: 0.78 },
    { x: w.x + w.width / 2, y: w.y + w.height * 0.5, rx: w.width * 1.3, ry: w.height * 1.7, k: 0.85 },
    { x: w.x + w.width / 2, y: H * 0.84, rx: W * 0.55, ry: H * 0.36, k: 0.6 },
    { x: well.x, y: well.y, rx: W * 0.2, ry: H * 0.34, k: 0.6 },
    ...L.sconces.filter((s) => !s.dead).map((s) => ({ x: s.x, y: s.y, rx: 200 * s.s, ry: 210 * s.s, k: 0.75 })),
    // what of the moon and the candles reaches the doors at the sides
    { x: W * 0.12, y: H * 0.48, rx: W * 0.25, ry: H * 0.52, k: 0.88 },
    { x: W * 0.84, y: H * 0.42, rx: W * 0.2, ry: H * 0.4, k: 0.25 },
  ]);
  vignette(ctx, W, H, 0.7, "source-over");
  grain(ctx, W, H, 0.035);
}

export function releaseRotundaArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

const fill = (ctx, pts, style) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
};

// The observatory dome: midnight-blue plaster and a quiet celestial chart.
function paintDome(ctx, L) {
  const rnd = lcg(808);
  const at = (deg, lift) => { const k = (lift * Math.PI) / 180; return L.on(deg, WALL + 200 * Math.sin(k), R * Math.cos(k)); };
  for (let lift = 0; lift < 70; lift += 5) {
    const pts = [];
    for (let d = -SWEEP; d <= SWEEP; d += 4) pts.push(at(d, lift));
    for (let d = SWEEP; d >= -SWEEP; d -= 4) pts.push(at(d, lift + 5));
    const v = lift / 70;
    fill(ctx, pts, `rgb(${Math.round(26 - v * 10)},${Math.round(35 - v * 13)},${Math.round(52 - v * 17)})`);
    if (L.physicsMaterials) for (let d = -SWEEP; d < SWEEP; d += 8) {
      paintProjectedMaterial(ctx, L.physicsMaterials.dome, (u, v) => at(d + Math.min(8, SWEEP - d) * u, lift + 5 * v), 0.82, 2, 2);
    }
  }
  // the damp in it, spreading up from the cornice
  for (let i = 0; i < 9; i++) {
    const p = at((rnd() * 2 - 1) * 84, 3 + rnd() * 26);
    soft(ctx, p.x, p.y, (60 + rnd() * 110) * L.u, (26 + rnd() * 40) * L.u, "6,6,5", 0.3 + rnd() * 0.3);
  }
  // cracks, wandering up it
  ctx.strokeStyle = "rgba(4,4,5,0.6)";
  ctx.lineWidth = Math.max(0.7, L.u);
  for (let i = 0; i < 7; i++) {
    let d = (rnd() * 2 - 1) * 80, lift = 1 + rnd() * 8;
    ctx.beginPath();
    for (let s = 0; s < 7; s++) {
      const p = at(d, lift);
      if (s) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
      d += (rnd() - 0.5) * 7; lift += 3 + rnd() * 6;
    }
    ctx.stroke();
  }
  paintPlanetarium(ctx, L, at);
  // the ribs: dark oak, a little light along each
  for (let d = -90; d <= 90; d += 22.5) {
    for (const [w, col] of [[6, "#160e09"], [1.2, "rgba(170,186,220,0.16)"]]) {
      ctx.strokeStyle = w === 6 && L.physicsMaterials ? ctx.createPattern(L.physicsMaterials.oak, "repeat") : col;
      ctx.lineWidth = Math.max(1, w * L.u);
      ctx.beginPath();
      for (let lift = 0; lift <= 70; lift += 5) { const p = at(d, lift); if (lift) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
  }
}

// The floor: parquet — short oak blocks laid in zigzag, each row leaning the
// other way — gone dull, and the dust lying on it.
function paintFloor(ctx, L) {
  const { W, H } = L;
  const rnd = lcg(212);
  const rim = [];
  for (let d = -SWEEP; d <= SWEEP; d += 3) rim.push(L.on(d, 0));
  ctx.beginPath();
  ctx.moveTo(-10, H + 10);
  rim.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(W + 10, H + 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, L.on(0, 0).y, 0, H);
  g.addColorStop(0, "#241a11");
  g.addColorStop(1, "#46331f");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const cw = 34, bh = 11;
  ctx.strokeStyle = "rgba(5,3,1,0.6)";
  for (let c = 0, x = -748; x < 748; x += cw, c++) {
    for (let z = 236; z < 730; z += bh) {
      const z0 = c % 2 ? z + cw : z, z1 = c % 2 ? z : z + cw;
      const k = rnd();
      const plank = L.physicsMaterials?.planks[(c * 7 + Math.round(z / bh)) % 8];
      if (plank) paintProjectedMaterial(ctx, plank, (u, v) => L.P(x + cw * u, 0, z0 + (z1 - z0) * u + bh * v), 1);
      fill(ctx, [L.P(x, 0, z0), L.P(x + cw, 0, z1), L.P(x + cw, 0, z1 + bh), L.P(x, 0, z0 + bh)], k < 0.5 ? `rgba(0,0,0,${(k * 0.34).toFixed(3)})` : `rgba(255,206,160,${((k - 0.5) * 0.1).toFixed(3)})`);
      ctx.lineWidth = Math.max(0.5, 0.26 * L.P(x, 0, z0).s);
      ctx.stroke();
    }
  }
  // the dust on it, thicker toward the wall
  for (let i = 0; i < 26; i++) {
    const p = L.on(rnd() * 360 - 180, 0, 120 + rnd() * 250);
    if (!(p.s > 0) || p.s > 6) continue;
    soft(ctx, p.x, p.y, (70 + rnd() * 90) * p.s, (22 + rnd() * 30) * p.s, "150,146,136", 0.04 + rnd() * 0.05);
  }
  // the dark lying along the foot of the wall
  ctx.strokeStyle = "rgba(2,2,3,0.5)";
  ctx.lineWidth = 14 * L.u;
  ctx.beginPath();
  rim.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

// The wall, unrolled: the house's paper over its oak dado — the paper come
// away in places, the damp run down it — the cornice, the doors each in its
// architrave with its number carved in its top rail, and the sconces. (The
// window is put in afterwards, over the paper.)
function wallFlat(L) {
  const fw = SWEEP * 2 * KX, fh = WALL * KY;
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  const rnd = lcg(515);
  const materials = L.physicsMaterials;
  const X = (deg) => (deg + SWEEP) * KX, Y = (y) => (WALL - y) * KY;
  const box = (d0, y0, d1, y1, style) => { g.fillStyle = style; g.fillRect(X(d0), Y(y1), (d1 - d0) * KX, (y1 - y0) * KY); };
  // the paper: drab, faintly striped, gone brown with the years
  const paper = g.createLinearGradient(0, 0, 0, fh);
  paper.addColorStop(0, "#231d17");
  paper.addColorStop(1, "#2b241c");
  g.fillStyle = paper;
  g.fillRect(0, 0, fw, fh);
  paintFlatMaterial(g, materials?.paper, 0, 0, fw, Y(98), 0.72, 1);
  g.fillStyle = "rgba(255,226,180,0.04)";
  for (let d = -SWEEP; d < SWEEP; d += 1.6) g.fillRect(X(d), 0, KX * 0.5, Y(100));
  // the damp, run down from the cornice
  for (let i = 0; i < 14; i++) {
    const x = rnd() * fw, w = 26 + rnd() * 90, len = 80 + rnd() * 300;
    const damp = g.createLinearGradient(0, Y(302), 0, Y(302) + len);
    damp.addColorStop(0, `rgba(5,6,5,${(0.3 + rnd() * 0.35).toFixed(2)})`);
    damp.addColorStop(1, "rgba(5,6,5,0)");
    g.fillStyle = damp;
    g.fillRect(x, Y(302), w, len);
  }
  // where the paper has come away: bare plaster, and the sheet hanging under it
  for (const [deg, y, r] of [[-53.5, 270, 3.4], [-11, 280, 3], [42.5, 266, 4], [70, 254, 4]]) {
    const edge = [];
    for (let a = 0; a < Math.PI * 2; a += 0.5) { const q = 0.7 + rnd() * 0.5; edge.push([X(deg + Math.cos(a) * r * q), Y(y + Math.sin(a) * r * 4.4 * q)]); }
    g.beginPath();
    edge.forEach(([x, yy], i) => (i ? g.lineTo(x, yy) : g.moveTo(x, yy)));
    g.closePath();
    g.fillStyle = "#35322c";
    g.fill();
    g.strokeStyle = "rgba(4,3,2,0.6)";
    g.lineWidth = 2;
    g.stroke();
    // the sheet, curled over
    g.beginPath();
    g.moveTo(X(deg - r * 0.7), Y(y - r * 3));
    g.lineTo(X(deg + r * 0.6), Y(y - r * 3.4));
    g.lineTo(X(deg + r * 0.2), Y(y - r * 8.4));
    g.lineTo(X(deg - r * 0.5), Y(y - r * 6.6));
    g.closePath();
    g.fillStyle = "#191410";
    g.fill();
    g.strokeStyle = "rgba(255,226,180,0.12)";
    g.lineWidth = 1.4;
    g.stroke();
  }
  // the cornice: a deep moulding, dark
  box(-SWEEP, 302, SWEEP, WALL, "#17100b");
  paintFlatMaterial(g, materials?.across, 0, 0, fw, (WALL - 302) * KY, 0.55, 0.8);
  box(-SWEEP, 300, SWEEP, 303, "#2e1e12");
  box(-SWEEP, 316, SWEEP, 317, "rgba(255,206,160,0.08)");
  // the dado: oak panels under a rail
  const dado = g.createLinearGradient(0, Y(98), 0, Y(0));
  dado.addColorStop(0, "#2a1a10");
  dado.addColorStop(1, "#120a06");
  box(-SWEEP, 0, SWEEP, 98, dado);
  paintFlatMaterial(g, materials?.oak, 0, Y(98), fw, 98 * KY, 0.6, 1);
  for (let d = -SWEEP + 1; d < SWEEP; d += 9) {
    g.strokeStyle = "rgba(4,2,1,0.75)";
    g.lineWidth = 2;
    g.strokeRect(X(d + 1), Y(86), 7 * KX, 68 * KY);
    g.strokeStyle = "rgba(255,206,160,0.07)";
    g.strokeRect(X(d + 1) + 2, Y(86) + 2, 7 * KX, 68 * KY);
    if (materials) {
      const x = X(d + 1), y = Y(86), w = 7 * KX, h = 68 * KY;
      g.fillStyle = "rgba(0,0,0,0.24)"; g.fillRect(x + 3, y + 3, w - 6, h - 6);
      g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(x, y, w, 3);
      g.fillStyle = "rgba(205,168,119,0.16)"; g.fillRect(x, y + h - 2, w, 2);
    }
  }
  box(-SWEEP, 96, SWEEP, 102, "#3e2616");
  paintFlatMaterial(g, materials?.across, 0, Y(102), fw, 6 * KY, 0.42, 0.85);
  box(-SWEEP, 101, SWEEP, 102, "rgba(255,206,160,0.08)");
  box(-SWEEP, 0, SWEEP, 9, "#0c0704");
  // ── the doors
  for (const [deg, number] of DOORS) {
    const x0 = X(deg - DOOR.half), w = DOOR.half * 2 * KX, y0 = Y(DOOR.tall), h = DOOR.tall * KY;
    // the architrave, a keyblock over it
    g.fillStyle = "#2c1b10";
    g.fillRect(x0 - 18, y0 - 22, w + 36, h + 22);
    paintFlatMaterial(g, materials?.frame, x0 - 18, y0 - 22, w + 36, h + 22, 0.4, 1);
    g.fillStyle = "rgba(255,206,160,0.08)";
    g.fillRect(x0 - 18, y0 - 22, w + 36, 2.4);
    g.fillStyle = "#0a0605";
    g.fillRect(x0 - 5, y0 - 5, w + 10, h + 5);
    // the leaf: oak, dull; six sunk panels
    const leaf = g.createLinearGradient(x0, 0, x0 + w, 0);
    leaf.addColorStop(0, "#2c1b10");
    leaf.addColorStop(0.5, "#3a2416");
    leaf.addColorStop(1, "#1e120a");
    g.fillStyle = leaf;
    g.fillRect(x0, y0, w, h);
    paintFlatMaterial(g, materials?.oak, x0, y0, w, h, 0.65, 1);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = rnd() < 0.6 ? "rgba(6,3,1,0.16)" : "rgba(255,200,150,0.05)";
      g.fillRect(x0 + rnd() * w, y0, 1 + rnd() * 2, h);
    }
    for (const [b0, b1] of [[0.14, 0.36], [0.4, 0.66], [0.7, 0.95]]) {
      for (const [a0, a1] of [[0.1, 0.46], [0.54, 0.9]]) {
        g.fillStyle = "rgba(6,3,2,0.42)";
        g.fillRect(x0 + w * a0, y0 + h * b0, w * (a1 - a0), h * (b1 - b0));
        g.strokeStyle = "rgba(255,206,160,0.16)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x0 + w * a0, y0 + h * b1); g.lineTo(x0 + w * a1, y0 + h * b1); g.lineTo(x0 + w * a1, y0 + h * b0);
        g.stroke();
      }
    }
    // its number: small, cut into the top rail with a chisel — the lit edge
    // of the cut, the dark of it, and what is left of the paint it was
    // filled with, worn out of it in places
    g.font = '600 25px Georgia, "Times New Roman", serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    const ty = y0 + h * 0.07;
    g.fillStyle = "rgba(255,214,170,0.2)";
    g.fillText(number, x0 + w / 2 + 1, ty + 1.2);
    g.fillStyle = "#070403";
    g.fillText(number, x0 + w / 2, ty);
    g.fillStyle = "rgba(150,138,110,0.55)";
    g.fillText(number, x0 + w / 2 + 0.5, ty + 0.6);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = "rgba(20,12,7,0.55)";
      g.fillRect(x0 + w / 2 - 34 + rnd() * 68, ty - 12 + rnd() * 24, 1 + rnd() * 3, 1 + rnd() * 2);
    }
    // the knob and its plate
    const kx = x0 + w * 0.86, ky = y0 + h * 0.53;
    g.fillStyle = "#3a2a10";
    g.beginPath(); g.ellipse(kx, ky + 16, 5, 24, 0, 0, Math.PI * 2); g.fill();
    const knob = g.createRadialGradient(kx - 3, ky - 3, 1, kx, ky, 10);
    knob.addColorStop(0, "#d8c890");
    knob.addColorStop(0.5, "#8a6c34");
    knob.addColorStop(1, "#2a1e0c");
    g.fillStyle = knob;
    g.beginPath(); g.arc(kx, ky, 10, 0, Math.PI * 2); g.fill();
  }
  // ── the sconces: a brass arm gone dull, and a candle — alight in two of
  // them, a cold stub in the others
  for (const [deg, lit] of SCONCES) {
    const x = X(deg), y = Y(196);
    if (materials) {
      if (lit) soft(g, x, y - 20, 150, 200, WARM, 0.3, "lighter");
      const image = materials.sconce, h = 80, w = h * image.width / image.height;
      g.drawImage(image, x - w * 0.68, y - 30, w, h);
      if (lit) {
        g.fillStyle = "#fff4cc";
        g.beginPath(); g.ellipse(x, y - 42, 4, 12, 0, 0, Math.PI * 2); g.fill();
        soft(g, x, y - 42, 34, 40, WARM, 0.6, "lighter");
      }
      continue;
    }
    if (lit) soft(g, x, y - 20, 150, 200, WARM, 0.3, "lighter");
    g.strokeStyle = "#5a4418";
    g.lineWidth = 5;
    g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x, y); g.stroke();
    g.lineCap = "butt";
    g.fillStyle = "#7a5c26";
    g.beginPath(); g.ellipse(x, y + 2, 15, 7, 0, 0, Math.PI); g.fill();
    g.beginPath(); g.ellipse(x, y + 44, 9, 13, 0, 0, Math.PI * 2); g.fill();
    if (!lit) continue; // burnt down to nothing
    g.fillStyle = "#efe6cc";
    g.fillRect(x - 4.4, y - 30, 8.8, 28);
    g.fillStyle = "#fff4cc";
    g.beginPath(); g.ellipse(x, y - 42, 5, 12, 0, 0, Math.PI * 2); g.fill();
    soft(g, x, y - 42, 34, 40, WARM, 0.6, "lighter");
  }
  if (materials) g.drawImage(materials.pendulum, X(42.5) - 33, Y(180) - 3, 66, 171);
  else paintPendulum(g, X(42.5), Y(180));
  // ── cobwebs: across the corners over the doors, and one in the window's head
  const web = (x, y, r, dir) => {
    g.strokeStyle = "rgba(200,206,218,0.2)";
    g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * (Math.PI / 2);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + dir * Math.cos(a) * r, y + Math.sin(a) * r); g.stroke();
    }
    for (const k of [0.35, 0.6, 0.85]) {
      g.beginPath();
      for (let i = 0; i <= 4; i++) {
        const a = (i / 4) * (Math.PI / 2), q = k * (i % 4 ? 0.9 : 1);
        if (i) g.lineTo(x + dir * Math.cos(a) * r * q, y + Math.sin(a) * r * q); else g.moveTo(x + dir * Math.cos(a) * r * q, y + Math.sin(a) * r * q);
      }
      g.stroke();
    }
  };
  web(X(DOORS[0][0] + DOOR.half) + 18, Y(DOOR.tall) - 22, 64, -1);
  web(X(PASS.deg - PASS.half) - 16, Y(PASS.spring + 30), 60, 1);
  return flat;
}

function paintWall(ctx, L) {
  const flat = wallFlat(L);
  const { W } = L;
  // the moon's light on the wall round the window goes on the unrolled wall's picture
  for (let c = 0; c < flat.width; c++) {
    const d0 = c / KX - SWEEP, d1 = (c + 1) / KX - SWEEP;
    const a = L.on(d0, WALL), b = L.on(d1, 0);
    if (Math.max(a.x, b.x) < -4 || Math.min(a.x, b.x) > W + 4) continue;
    ctx.drawImage(flat, c, 0, 1, flat.height, a.x, a.y, Math.max(0.6, b.x - a.x) + 0.6, L.on(d0, 0).y - a.y);
  }
  // round the curve the wall turns from the light: darker toward the sides
  for (const side of [-1, 1]) {
    const x0 = L.on(side * 30, 0).x, x1 = side < 0 ? 0 : W;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "rgba(2,3,6,0)");
    g.addColorStop(1, "rgba(2,3,6,0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), L.H);
  }
}

// the moon through the window: a little of it round the window, and a pale
// shape of it lying across the floor toward us, fainter as it comes
function paintMoonlight(ctx, L) {
  const w = L.win;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  soft(ctx, w.x + w.width / 2, w.y + w.height / 2, w.width * 1.1, w.height * 0.9, MOON, 0.1, "lighter");
  ctx.filter = `blur(${Math.round(9 * L.u)}px)`;
  for (const [z0, z1, h0, h1, a] of [[ZC + R - 24, 570, 122, 150, 0.16], [570, 430, 150, 186, 0.1], [430, 290, 186, 232, 0.05]]) {
    fill(ctx, [L.P(-h0, 0, z0), L.P(h0, 0, z0), L.P(h1, 0, z1), L.P(-h1, 0, z1)], `rgba(${MOON},${a})`);
  }
  ctx.filter = "none";
  ctx.restore();
}

// The telescope: brass on a wooden tripod, its long tube up toward the moon.
// (x, y) is where it stands; h how tall it is.
function paintTelescope(ctx, x, y, h) {
  const hub = { x: x - h * 0.02, y: y - h * 0.56 };
  soft(ctx, x, y, h * 0.36, h * 0.05, "0,0,0", 0.7);
  const leg = (fx, fy, w, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.4, h * w);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(x + h * fx, y + h * fy); ctx.stroke();
    ctx.lineCap = "butt";
  };
  leg(0.06, -0.05, 0.03, "#1c1109");
  leg(-0.27, 0, 0.036, "#3a2414");
  leg(0.25, 0.01, 0.036, "#2a1a0e");
  // the brass shoes on the legs, the brace between them, the head it turns on
  ctx.fillStyle = "#8a6c34";
  for (const [fx, fy] of [[-0.27, 0], [0.25, 0.01]]) { ctx.beginPath(); ctx.arc(x + h * fx, y + h * fy, h * 0.018, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = "#5a4418";
  ctx.lineWidth = Math.max(1, h * 0.012);
  ctx.beginPath(); ctx.moveTo(x - h * 0.15, y - h * 0.24); ctx.lineTo(x + h * 0.14, y - h * 0.23); ctx.stroke();
  ctx.fillStyle = "#8a6c34";
  ctx.beginPath(); ctx.arc(hub.x, hub.y, h * 0.036, 0, Math.PI * 2); ctx.fill();
  // the tube: wide at the far end, drawing in to the eyepiece at ours
  const ang = -2.05;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const far = { x: hub.x + dx * h * 0.48, y: hub.y + dy * h * 0.48 }, near = { x: hub.x - dx * h * 0.28, y: hub.y - dy * h * 0.28 };
  const tube = (p, q, r0, r1) => {
    const g = ctx.createLinearGradient(p.x - nx * r0, p.y - ny * r0, p.x + nx * r0, p.y + ny * r0);
    g.addColorStop(0, "#2a1e0c");
    g.addColorStop(0.35, "#c8a252");
    g.addColorStop(0.55, "#f0d890");
    g.addColorStop(1, "#4a3816");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x - nx * r0, p.y - ny * r0); ctx.lineTo(q.x - nx * r1, q.y - ny * r1);
    ctx.lineTo(q.x + nx * r1, q.y + ny * r1); ctx.lineTo(p.x + nx * r0, p.y + ny * r0);
    ctx.closePath();
    ctx.fill();
  };
  const mid = { x: hub.x + dx * h * 0.06, y: hub.y + dy * h * 0.06 };
  tube(near, mid, h * 0.024, h * 0.032);
  tube(mid, far, h * 0.042, h * 0.05);
  ctx.strokeStyle = "#3a2a10";
  ctx.lineWidth = Math.max(1, h * 0.014);
  for (const k of [0.06, 0.3, 0.46]) {
    const c = { x: hub.x + dx * h * k, y: hub.y + dy * h * k }, r = h * 0.053;
    ctx.beginPath(); ctx.moveTo(c.x - nx * r, c.y - ny * r); ctx.lineTo(c.x + nx * r, c.y + ny * r); ctx.stroke();
  }
  // the little finder riding on it, the eyepiece, the moon along its length
  tube({ x: mid.x + nx * h * 0.062 + dx * h * 0.04, y: mid.y + ny * h * 0.062 + dy * h * 0.04 }, { x: mid.x + nx * h * 0.062 + dx * h * 0.22, y: mid.y + ny * h * 0.062 + dy * h * 0.22 }, h * 0.012, h * 0.014);
  ctx.fillStyle = "#16120a";
  ctx.beginPath(); ctx.arc(near.x - dx * h * 0.02, near.y - dy * h * 0.02, h * 0.024, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(200,216,250,0.55)";
  ctx.lineWidth = Math.max(0.7, h * 0.008);
  ctx.beginPath(); ctx.moveTo(mid.x - nx * h * 0.04, mid.y - ny * h * 0.04); ctx.lineTo(far.x - nx * h * 0.045, far.y - ny * h * 0.045); ctx.stroke();
}

// Turned wood standing on the floor: `foot` and `top` are where its two ends
// are on the screen, `profile` how thick it is on the way up — pairs of how
// far up (0 to 1) and half its thickness in centimetres. Lit from the left.
function turned(ctx, foot, top, profile, wood = null) {
  const s = foot.s, widest = Math.max(...profile.map(([, hw]) => hw)) * s;
  const at = (t) => ({ x: foot.x + (top.x - foot.x) * t, y: foot.y + (top.y - foot.y) * t });
  ctx.beginPath();
  profile.forEach(([t, hw], i) => { const p = at(t); if (i) ctx.lineTo(p.x - hw * s, p.y); else ctx.moveTo(p.x - hw * s, p.y); });
  for (let i = profile.length - 1; i >= 0; i--) { const p = at(profile[i][0]); ctx.lineTo(p.x + profile[i][1] * s, p.y); }
  ctx.closePath();
  const g = ctx.createLinearGradient(foot.x - widest, 0, foot.x + widest, 0);
  g.addColorStop(0, "#0e0805");
  g.addColorStop(0.3, "#4a3020");
  g.addColorStop(0.46, "#64452b");
  g.addColorStop(1, "#0b0604");
  ctx.fillStyle = g;
  ctx.fill();
  if (wood) {
    ctx.save(); ctx.clip();
    paintFlatMaterial(ctx, wood, foot.x - widest, Math.min(foot.y, top.y), widest * 2, Math.abs(top.y - foot.y), Math.max(0.04, foot.s * 0.14), 0.85, "soft-light");
    ctx.restore();
  }
}

const BALUSTER = [[0, 3.4], [0.07, 3.4], [0.09, 2], [0.16, 2.4], [0.3, 4], [0.42, 3.2], [0.56, 1.7], [0.8, 1.5], [0.88, 2.4], [0.93, 1.8], [1, 2.6]];
const POST = [[0, 7.5], [0.1, 7.5], [0.12, 5.6], [0.86, 5.6], [0.88, 7.5], [0.94, 7.5], [0.95, 4], [1, 4]];

// The stairs we came up by, at our right hand: a round well in the floor, the
// steps winding down it about a post in its middle, each a wedge lower than
// the last and darker; round the rim a balustrade of turned oak under a
// handrail, open on the side toward the room between two posts.
function paintStairs(ctx, L) {
  const at = (a, y, r = WELL.r) => L.P(WELL.x + r * Math.cos(a), y, WELL.z + r * Math.sin(a));
  const GAP = 0.42, STEP = 0.38, RISE = 18, RAIL = 92;
  const ring = (y, r) => { const pts = []; for (let a = 0; a < Math.PI * 2; a += 0.1) pts.push(at(a, y, r)); return pts; };
  const trace = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
  const mid = L.P(WELL.x, 0, WELL.z);
  // its shadow on the floor, and the curb round the rim
  soft(ctx, mid.x, mid.y, (WELL.r + 60) * mid.s, (WELL.r + 60) * mid.s * 0.42, "0,0,0", 0.5);
  fill(ctx, ring(0, WELL.r + 8), "#1c110a");
  // ── down the well
  ctx.save();
  trace(ring(0, WELL.r));
  ctx.clip();
  ctx.fillStyle = "#020304";
  ctx.fillRect(0, 0, L.W, L.H);
  // its wall, going down into the dark
  for (let y = 0; y > -280; y -= 40) {
    const v = 1 + y / 280;
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      fill(ctx, [at(a, y), at(a + 0.11, y), at(a + 0.11, y - 41), at(a, y - 41)], `rgb(${Math.round(6 + 22 * v)},${Math.round(6 + 20 * v)},${Math.round(8 + 20 * v)})`);
    }
  }
  // the steps, the lowest first: a tread, and the riser up from it to the next
  for (let i = 15; i >= 0; i--) {
    const a1 = Math.PI - GAP - i * STEP, a0 = a1 - STEP, y = -(i + 1) * RISE;
    const lit = Math.max(0, 1 - i / 12);
    const tone = (r, g, b) => `rgb(${Math.round(8 + r * lit)},${Math.round(6 + g * lit)},${Math.round(5 + b * lit)})`;
    fill(ctx, [at(a1, y, 9), at(a1, y), at((a0 + a1) / 2, y), at(a0, y), at(a0, y, 9)], tone(112, 96, 84));
    if (L.physicsMaterials) {
      ctx.save(); ctx.clip();
      paintProjectedMaterial(ctx, L.physicsMaterials.stone, (u, v) => at(a0 + (a1 - a0) * u, y, 9 + (WELL.r - 9) * v), lit * 0.8, 3, 2);
      ctx.restore();
    }
    fill(ctx, [at(a1, y, 9), at(a1, y), at(a1, y + RISE), at(a1, y + RISE, 9)], tone(44, 34, 26));
    // the nose of the tread above, catching the light
    const p = at(a1, y + RISE, 9), q = at(a1, y + RISE);
    ctx.strokeStyle = `rgba(200,214,244,${(0.08 + 0.3 * lit).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.8, 1.6 * p.s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  // the post they wind about
  turned(ctx, L.P(WELL.x, -300, WELL.z), mid, [[0, 9], [1, 9]], L.physicsMaterials?.oak);
  ctx.restore();
  // the edge of the floor round the well
  trace(ring(0, WELL.r));
  ctx.strokeStyle = "rgba(255,214,170,0.16)";
  ctx.lineWidth = Math.max(1, 2.4 * mid.s);
  ctx.stroke();
  // ── above the floor, the furthest first: the balusters and the two posts
  // at the opening, the post in the middle, and the handrail — which lies
  // over the heads of the balusters under it, so the far half of it goes on
  // after the far balusters and the near half last of all
  const parts = [];
  const from = Math.PI + GAP, span = Math.PI * 2 - GAP * 2, n = 30;
  for (let i = 1; i < n; i++) {
    const a = from + (span * i) / n;
    parts.push({ z: WELL.z + WELL.r * Math.sin(a), draw: () => turned(ctx, at(a, 0), at(a, RAIL), BALUSTER, L.physicsMaterials?.oak) });
  }
  const ball = (p, r) => {
    const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, "#7a5636");
    g.addColorStop(0.6, "#3a2414");
    g.addColorStop(1, "#0e0805");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.clip();
    paintFlatMaterial(ctx, L.physicsMaterials?.oak, p.x - r, p.y - r, r * 2, r * 2, Math.max(0.04, r * 0.015), 0.75, "soft-light");
    ctx.restore();
  };
  for (const a of [from, from + span]) {
    parts.push({ z: WELL.z + WELL.r * Math.sin(a) + 0.4, draw: () => {
      const top = at(a, 112);
      turned(ctx, at(a, 0), top, POST, L.physicsMaterials?.oak);
      ball({ x: top.x, y: top.y - 5.5 * top.s }, 6.5 * top.s);
    } });
  }
  parts.push({ z: WELL.z, draw: () => {
    const top = L.P(WELL.x, 124, WELL.z);
    turned(ctx, mid, top, [[0, 9], [0.9, 9], [0.92, 11], [0.97, 11], [0.98, 6], [1, 6]], L.physicsMaterials?.oak);
    ball({ x: top.x, y: top.y - 7 * top.s }, 8.5 * top.s);
  } });
  const m = 44;
  for (let i = 0; i < m; i++) {
    const a = from + (span * i) / m, b = from + (span * (i + 1)) / m;
    parts.push({ z: Math.sin((a + b) / 2) > 0 ? WELL.z + 0.2 : -Infinity, draw: () => {
      // its side, and the top of it where the hand goes
      fill(ctx, [at(a, RAIL - 1, WELL.r + 4.5), at(b, RAIL - 1, WELL.r + 4.5), at(b, RAIL + 6, WELL.r + 4.5), at(a, RAIL + 6, WELL.r + 4.5)], "#24150c");
      fill(ctx, [at(a, RAIL - 1, WELL.r - 4.5), at(b, RAIL - 1, WELL.r - 4.5), at(b, RAIL + 6, WELL.r - 4.5), at(a, RAIL + 6, WELL.r - 4.5)], "#1c1009");
      fill(ctx, [at(a, RAIL + 6, WELL.r - 4.5), at(b, RAIL + 6, WELL.r - 4.5), at(b, RAIL + 6, WELL.r + 4.5), at(a, RAIL + 6, WELL.r + 4.5)], "#553a25");
      if (L.physicsMaterials) {
        paintProjectedMaterial(ctx, L.physicsMaterials.across, (u, v) => at(a + (b - a) * u, RAIL + 6, WELL.r - 4.5 + 9 * v), 0.8);
        paintProjectedMaterial(ctx, L.physicsMaterials.across, (u, v) => at(a + (b - a) * u, RAIL + 6 - 7 * v, WELL.r + 4.5), 0.45);
      }
      const p = at(a, RAIL + 6, WELL.r - 1.5), q = at(b, RAIL + 6, WELL.r - 1.5);
      ctx.strokeStyle = "rgba(220,228,246,0.22)";
      ctx.lineWidth = Math.max(0.7, 1.1 * p.s);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    } });
  }
  parts.sort((p, q) => q.z - p.z).forEach((p) => p.draw());
}
