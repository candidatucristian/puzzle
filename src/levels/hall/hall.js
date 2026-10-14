import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg, polygon } from "../../shared/paint.js";
import { archGeo, paintSkyOn, paintWindowOn, openingPath } from "../telescope/window.js";
import { projectDoor, DOOR_LENGTH as DOOR_LEN } from "./doorMotion.js";
import { paintLeverMount } from "./ironLever.js";
import { layoutGallery, paintGallery } from "../top/gallery.js";
import * as botanic from "./botanic.js";
import * as chemical from "./chemical.js";

/** The ground-floor hall of the manor, at night: a long passage seen down its
 *  length, three closed doors along either wall, and at its far end the
 *  stairs going up to the floor above, the moon coming down them from a
 *  window out of sight; across the foot of them an iron gate in two leaves.
 *  Dark panelling under dark paper, a runner down the
 *  boards and on up the stairs, a pair of candle sconces between the doors,
 *  a chandelier, a long-case clock, and the things a hall gathers. Every
 *  door has its number on it — a Roman numeral carved into its top rail —
 *  and a thread of light under it: there is something behind each.
 *
 *  The hall is drawn in one-point perspective from where we stand: a place
 *  is how far across (X) and down (Y) it is from the eye, and how far away
 *  (z, 1 at the picture, larger further off).
 *
 *  The floor above has a hall of the same plan (`upper`), far gone and put
 *  to chemistry: five doors, a flight of stairs going up to the right where
 *  the sixth would be, tiled walls and floor, copper pipes and laboratory
 *  cupboards. A bare bulb on a flex is worked by the iron lever.
 *
 *  Painted once per screen size: the hall; a glow; the gate's two leaves. */

// each floor's hall has its own pictures
const KEYS = {
  ground: { room: "hl_hall", glow: "hl_glow", gateL: "hl_gate_l", gateR: "hl_gate_r", fog: "hl_fog", pendulum: "hl_pendulum" },
  upper: { room: "hu_hall", glow: "hu_glow" },
  wing: { room: "hw_hall", glow: "hw_glow" },
};
// Only the small doorway is uploaded while its leaf moves.
const SWING = "hl_swing";
const WARM = "255,190,120";
const MOON = "150,178,232";
const END = 4.7; // how far off the end wall is
// where along the walls the doors are, and the sconces between them
const DOORS = [1.32, 2.2, 3.1];
const SCONCES = [2.01, 2.9];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII"];
// The stairs at the far end, going up and away to the floor above: how wide
// they and their opening are (of the hall's half-width), how deep and how
// high one step is, how many there are, and how high the opening's head.
const STAIR = { half: 0.4, open: 0.5, run: 0.16, rise: 0.085, steps: 15, head: -0.52, rail: 0.3 };

// ── where everything is ─────────────────────────────────────────────────────

/** `upper`: the hall of the floor above — the same passage, gone to seed:
 *  doors VII to XII, a window where the stairs are below, one sconce still
 *  alight, and in place of the chandelier a bare bulb on a flex, which is
 *  `bulbOn` until its puzzle is solved. */
/** `wing`: the stone gallery off the top floor, gone to ruin, with doors
 *  XV–XVII (top/gallery.js). */
export function layoutHall(W, H, { upper = false, wing = false, bulbOn = true } = {}) {
  if (wing) return layoutGallery(W, H);
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, upper, wing, worn: upper || wing, bulbOn };
  L.theme = upper ? "chemistry" : "botanic";
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
      // upstairs the first place on the right is not a door: the stairs go up there
      if (upper && side > 0 && i === 0) return;
      // the passage has three: the middle one on the left, the first and the last on the right
      if (wing && (side < 0 ? i !== 1 : i === 1)) return;
      const X = side * L.wall;
      const quad = [L.P(X, L.doorTop, z), L.P(X, L.doorTop, z + DOOR_LEN), L.P(X, L.floor, z + DOOR_LEN), L.P(X, L.floor, z)];
      const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
      L.doors.push({
        side, i, z, quad, number: upper ? 7 + L.doors.length : wing ? 15 + L.doors.length : (side < 0 ? 0 : DOORS.length) + i + 1,
        box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
        sill: L.P(X - side * L.wall * 0.1, L.floor, z + DOOR_LEN / 2),
      });
    });
  }
  // the opening the stairs go up through, on the screen: the two leaves of
  // the iron gate hang in it
  if (!L.worn) {
    const ox = L.wall * STAIR.open;
    const a = L.P(-ox, H * STAIR.head, END), b = L.P(ox, L.floor, END);
    L.gate = { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
    // What is alive in this hall, for the scene. The long-case clock's
    // pendulum: where it hangs from, how long, how big its bob (the clock
    // is painted without it).
    const zc = END - 0.12, cf = L.P(-L.wall * 0.74, L.floor, zc), ck = H / 700 / zc;
    L.clock = { x: cf.x, y: cf.y - 232 * ck, len: 124 * ck, bob: 7.5 * ck };
    // the chandelier's eight wicks, the ones toward us first
    const hub = L.P(0, L.ceil + H * 0.26, 1.9), hk = H / 700 / 1.9;
    L.wicks = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + 0.32)
      .sort((p, q) => Math.sin(q) - Math.sin(p))
      .map((ang) => ({ x: hub.x + Math.cos(ang) * 132 * hk, y: hub.y + (Math.sin(ang) * 132 * 0.22 - 14 - 54) * hk, s: hk }));
    // the shadows the gate's bars throw down the runner in the moon from the stairs
    L.bars = Array.from({ length: 9 }, (_, i) => {
      const X = ox * ((i / 8) * 2 - 1) * 0.92;
      return [L.P(X, L.floor, END - 0.04), L.P(X * 1.5, L.floor, END - 2.3)];
    });
  }
  L.sconces = [];
  // upstairs only the first on the left still has a candle in it
  for (const side of [-1, 1]) for (const z of SCONCES) L.sconces.push({ side, z, dead: (upper && !(side < 0 && z === SCONCES[0])) || (wing && !(side > 0 && z === SCONCES[1])), ...L.P(side * L.wall, -H * 0.2, z) });
  if (upper) {
    // the bulb on its flex, where the chandelier hangs below: what opens the puzzle
    const b = L.P(0, L.ceil + H * 0.36, 1.9), top = L.P(0, L.ceil, 1.9), r = (36 * u) / 1.9;
    L.bulb = { x: b.x, y: b.y, r, top: top.y };
    // the switch that works it, on the right-hand wall between the stairs and the next door
    const sw = L.P(L.wall, H * 0.06, 2.05), sr = (38 * u) / 2.05;
    // A compact iron lever on the wall, standing proud of its slanted mount.
    const slant = 0.62, ph = sr * 2.45, pw = sr * 1.32;
    L.switch = {
      x: sw.x, y: sw.y, r: sr, slant,
      plate: { w: pw, h: ph },
      contact: { x: sw.x - sr * 0.12, y: sw.y + sr * 0.69 },
    };
    L.thing = { level: "lightswitch", label: "Pull the iron lever", box: { x: sw.x - Math.max(30, sr * 1.4), y: sw.y - ph * 0.5 - 5, width: Math.max(46, sr * 2.1), height: ph + 10 } };
    // the stairs going up to the right, where the first right-hand door is below
    L.stairs = { z0: 1.26, z1: 1.9 };
    // where they are on the screen, to be clicked: the way to the top floor
    const pts = [L.P(L.wall, L.doorTop, 1.26), L.P(L.wall, L.doorTop, 1.9), L.P(L.wall, L.floor, 1.9), L.P(L.wall, L.floor, 1.26)];
    const x0 = Math.min(...pts.map((p) => p.x)), y0 = Math.min(...pts.map((p) => p.y));
    L.up = { x: x0, y: y0, width: Math.min(W, Math.max(...pts.map((p) => p.x))) - x0, height: Math.min(H, Math.max(...pts.map((p) => p.y))) - y0 };
  }
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

/** The hall itself, onto a canvas the size of the screen: every floor's. */
export function paintHallOn(ctx, L) {
  const { W, H } = L;
  if (L.wing) { paintGallery(ctx, L, paintDoor); return; }
  paintCeiling(ctx, L);
  if (L.theme === "botanic") botanic.paintSkylight(ctx, L);
  paintFloor(ctx, L);
  if (L.theme === "botanic") botanic.paintFallenLeaves(ctx, L);
  for (const side of [-1, 1]) paintWall(ctx, L, side);
  if (L.theme === "chemistry") chemical.paintPipes(ctx, L);
  if (L.worn) paintEndWindow(ctx, L); else paintEnd(ctx, L);
  paintStairLight(ctx, L);
  if (L.stairs) paintSideStairs(ctx, L, L.stairs, 1, 1);
  for (const d of L.doors) paintDoor(ctx, L, d);
  if (L.worn && L.theme !== "chemistry") paintDecay(ctx, L);
  if (L.theme === "botanic") botanic.paintIvy(ctx, L);
  for (const s of L.sconces) paintSconce(ctx, L, s);
  paintThings(ctx, L);
  if (L.theme === "botanic") botanic.paintBaskets(ctx, L);
  if (L.upper) paintBulb(ctx, L);
  paintGloom(ctx, L);
  vignette(ctx, W, H, L.wing ? 0.9 : 0.75);
  grain(ctx, W, H, 0.035);
}

export function paintHall(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const K = L.wing ? KEYS.wing : L.upper ? KEYS.upper : KEYS.ground;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, W, H);
  paintHallOn(ctx, L);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  if (L.gate) {
    addCanvasTexture(t, K.gateL, paintGateLeaf(L, -1));
    addCanvasTexture(t, K.gateR, paintGateLeaf(L, 1));
  }
  if (K.fog) addCanvasTexture(t, K.fog, paintFogBank());
  if (K.pendulum) addCanvasTexture(t, K.pendulum, paintPendulum(L.clock));
  return { keys: K };
}

/** Cache the room, foreground and lettering once. Redraw just the rigid
 *  door at its exact angle each frame, with supersampled edges. Nothing is
 *  quantized into animation frames, and the surrounding hall stays still. */
export function paintDoorSwing(scene, L, d, lit) {
  const t = scene.textures;
  const X = d.side * L.wall, into = (dist) => d.side * (L.wall + dist);
  const z0 = d.z, z1 = d.z + DOOR_LEN, top = L.doorTop, floor = L.floor, tall = floor - top;
  // the door's width, in the units the hall is measured across: a door is
  // about 0.43 as wide as it is tall
  const wide = tall * 0.43;
  const box = { x: Math.floor(d.box.x) - 2, y: Math.floor(d.box.y) - 2, width: Math.ceil(d.box.width) + 4, height: Math.ceil(d.box.height) + 4 };
  // Keep the edge clean during the camera's approach without uploading a
  // full-screen canvas. Bound the allocation on very large displays.
  const resolution = Math.min(3, 2048 / box.height, Math.sqrt(1500000 / (box.width * box.height)));
  const sheet = (paint) => {
    const c = makeCanvas(box.width * resolution, box.height * resolution);
    const ctx = c.getContext("2d");
    ctx.scale(resolution, resolution);
    ctx.translate(-box.x, -box.y);
    polygon(ctx, d.quad);
    ctx.clip();
    paint(ctx);
    return c;
  };
  const fill = (ctx, pts, style) => { polygon(ctx, pts); ctx.fillStyle = style; ctx.fill(); };
  const glow = lit ? WARM : MOON;
  // ── the room, through the frame
  const room = sheet((ctx) => {
    const deep = wide * 4.2, far = z1 + DOOR_LEN * 2.4, mid = (d.quad[0].x + d.quad[1].x) / 2;
    fill(ctx, d.quad, lit ? "#170d07" : "#07090d");
    // its far wall, its floor running in from the sill, its ceiling
    const wall = ctx.createLinearGradient(0, L.P(X, top, far).y, 0, L.P(X, floor, far).y);
    wall.addColorStop(0, lit ? "#3a2416" : "#10151e");
    wall.addColorStop(0.62, lit ? "#6a4426" : "#1a2230");
    wall.addColorStop(1, lit ? "#2a180c" : "#0c1016");
    fill(ctx, [L.P(X, top - tall * 0.3, far), L.P(into(deep), top - tall * 0.3, far), L.P(into(deep), floor, far), L.P(X, floor, far)], wall);
    // its paper, in stripes
    for (let i = 0; i < 26; i++) {
      const a = L.P(into((deep * i) / 26), top - tall * 0.3, far), b = L.P(into((deep * i) / 26), floor, far);
      ctx.strokeStyle = lit ? "rgba(255,214,170,0.07)" : "rgba(170,190,236,0.05)";
      ctx.lineWidth = Math.max(1, (5 * L.u) / far);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // a dado along it, a picture, the edge of something standing against it
    fill(ctx, [L.P(X, floor - tall * 0.36, far), L.P(into(deep), floor - tall * 0.36, far), L.P(into(deep), floor, far), L.P(X, floor, far)], lit ? "rgba(30,16,8,0.6)" : "rgba(4,6,10,0.6)");
    fill(ctx, [L.P(into(wide * 0.5), floor - tall * 0.78, far), L.P(into(wide * 1.3), floor - tall * 0.78, far), L.P(into(wide * 1.3), floor - tall * 0.52, far), L.P(into(wide * 0.5), floor - tall * 0.52, far)], lit ? "#1c110a" : "#06080c");
    fill(ctx, [L.P(into(wide * 0.6), floor - tall * 0.75, far), L.P(into(wide * 1.2), floor - tall * 0.75, far), L.P(into(wide * 1.2), floor - tall * 0.55, far), L.P(into(wide * 0.6), floor - tall * 0.55, far)], lit ? "#7a5a34" : "#141a26");
    const boards = ctx.createLinearGradient(L.P(X, floor, z0).x, 0, L.P(into(deep), floor, z1).x, 0);
    boards.addColorStop(0, lit ? "#5a3820" : "#131820");
    boards.addColorStop(1, lit ? "#2a180c" : "#080a0e");
    fill(ctx, [L.P(X, floor, z0), L.P(X, floor, far), L.P(into(deep), floor, far), L.P(into(deep), floor, z0)], boards);
    for (let i = 1; i < 7; i++) {
      const a = L.P(into((wide * i) / 2.2), floor, z0), b = L.P(into((wide * i) / 2.2), floor, far);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = Math.max(0.6, L.u / d.z);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // a rug on the boards; a small table against the wall, a lamp on it
    fill(ctx, [L.P(into(wide * 0.5), floor, z0 + 0.1), L.P(into(wide * 0.5), floor, far - 0.2), L.P(into(wide * 2.6), floor, far - 0.2), L.P(into(wide * 2.6), floor, z0 + 0.1)], lit ? "rgba(74,20,24,0.75)" : "rgba(14,18,30,0.75)");
    {
      const tx0 = wide * 1.35, tx1 = wide * 2.05, zt = far - 0.06, th = tall * 0.34;
      fill(ctx, [L.P(into(tx0), floor - th, zt), L.P(into(tx1), floor - th, zt), L.P(into(tx1), floor, zt), L.P(into(tx0), floor, zt)], lit ? "#22130a" : "#06080c");
      const foot = L.P(into((tx0 + tx1) / 2), floor - th, zt), s = (tall * 0.012) / zt;
      ctx.fillStyle = lit ? "#6a5226" : "#161a22";
      ctx.fillRect(foot.x - 1.2 * s, foot.y - 16 * s, 2.4 * s, 16 * s);
      ctx.fillStyle = lit ? "#ffe2a8" : "#222a3a";
      ctx.beginPath(); ctx.moveTo(foot.x - 9 * s, foot.y - 16 * s); ctx.lineTo(foot.x + 9 * s, foot.y - 16 * s); ctx.lineTo(foot.x + 5.5 * s, foot.y - 30 * s); ctx.lineTo(foot.x - 5.5 * s, foot.y - 30 * s); ctx.closePath(); ctx.fill();
      if (lit) soft(ctx, foot.x, foot.y - 22 * s, 46 * s, 46 * s, WARM, 0.75, "lighter");
    }
    // the lamp's light — or the moon's — on the wall and across the floor to the door
    const lamp = L.P(into(wide * 1.7), floor - tall * 0.5, far);
    soft(ctx, lamp.x, lamp.y, box.width * 1.3, box.height * 0.6, glow, lit ? 0.5 : 0.22, "lighter");
    const pool = L.P(into(wide * 0.5), floor, (z0 + z1) / 2);
    soft(ctx, pool.x, pool.y, box.width * 0.9, box.height * 0.16, glow, lit ? 0.5 : 0.2, "lighter");
    // the thickness of the wall, seen in the far jamb; the sill
    const T = wide * 0.18;
    const jamb = ctx.createLinearGradient(L.P(X, 0, z1).x, 0, L.P(into(T), 0, z1).x, 0);
    jamb.addColorStop(0, "#3a2414");
    jamb.addColorStop(1, lit ? "#8a5c34" : "#1a1410");
    fill(ctx, [L.P(X, top, z1), L.P(into(T), top, z1), L.P(into(T), floor, z1), L.P(X, floor, z1)], jamb);
    fill(ctx, [L.P(X, floor, z0), L.P(X, floor, z1), L.P(into(T), floor, z1), L.P(into(T), floor, z0)], lit ? "#6a4426" : "#12100e");
    // the dark along the head of the frame and down its near side
    const head = ctx.createLinearGradient(0, d.box.y, 0, d.box.y + d.box.height * 0.2);
    head.addColorStop(0, "rgba(0,0,0,0.65)");
    head.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = head;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    const near = d.quad[0].x, nearSide = ctx.createLinearGradient(near, 0, near + (mid - near) * 0.5, 0);
    nearSide.addColorStop(0, "rgba(0,0,0,0.5)");
    nearSide.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nearSide;
    ctx.fillRect(box.x, box.y, box.width, box.height);
  });
  // Preserve objects in front of the door, and the hall's original shade.
  // They must not jump in brightness or move with the opening leaf.
  const foreground = sheet((ctx) => {
    if (L.worn && L.theme !== "chemistry") paintDecay(ctx, L);
    for (const s of L.sconces) paintSconce(ctx, L, s);
    paintThings(ctx, L);
    if (L.upper) paintBulb(ctx, L);
    paintGloom(ctx, L);
    vignette(ctx, L.W, L.H, 0.75, "source-over");
    grain(ctx, L.W, L.H, 0.035);
  });
  // Keep the wood, panels and carved number in a single material. Project
  // that material instead of rasterizing hundreds of strokes per frame.
  const face = sheet((ctx) => paintDoor(ctx, L, { ...d, hideHandle: true }));
  const canvas = document.createElement("canvas");
  canvas.width = room.width;
  canvas.height = room.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  // This surface changes every frame. Keep it GPU-backed; the cached art
  // above is CPU-painted once, but readback here would stall the animation.
  const key = `${SWING}_${d.number}`;
  const texture = addCanvasTexture(t, key, canvas);
  let lastAngle = -1, lastHandle = -1, hidden = false;
  const draw = (angle, handle = 0) => {
    const shape = projectDoor(L, d, angle);
    if ((angle === lastAngle && handle === lastHandle) || (hidden && shape.visible === 0)) return shape;
    lastAngle = angle; lastHandle = handle;
    hidden = shape.visible === 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(room, 0, 0);
    ctx.save();
    ctx.scale(resolution, resolution);
    ctx.translate(-box.x, -box.y);
    polygon(ctx, d.quad); ctx.clip();
    const { quad, aperture } = shape;
    if (shape.visible > 0) {
      const Xf = into(wide * Math.sin(angle)), zf = z0 + DOOR_LEN * Math.cos(angle);
      fill(ctx, [quad[3], quad[2], L.P(Xf + d.side * wide * 0.3, floor, zf + 0.05), L.P(X + d.side * wide * 0.3, floor, z0 + 0.05)], `rgba(0,0,0,${0.4 * aperture})`);
      paintMovingDoorFace(ctx, face, box, resolution, d.quad, shape);
      paintDoorHandle(ctx, L, { ...d, handle }, shape.surface);
      fill(ctx, quad, `rgba(3,2,2,${0.32 * Math.sin(angle)})`);
      // The oak has thickness; its moving edge catches the room's light.
      fill(ctx, shape.edge, `rgba(${lit ? "112,73,36" : "48,52,63"},${aperture})`);
      const edge = ctx.createLinearGradient(quad[1].x, 0, quad[1].x + (quad[0].x - quad[1].x) * 0.22, 0);
      edge.addColorStop(0, `rgba(${glow},${(lit ? 0.32 : 0.16) * aperture})`);
      edge.addColorStop(1, `rgba(${glow},0)`);
      fill(ctx, quad, edge);
      ctx.strokeStyle = `rgba(${glow},${(lit ? 0.65 : 0.35) * aperture})`;
      ctx.lineWidth = Math.max(0.6, (1.5 * L.u) / d.z);
      ctx.beginPath(); ctx.moveTo(quad[1].x, quad[1].y); ctx.lineTo(quad[2].x, quad[2].y); ctx.stroke();
    }
    ctx.restore();
    ctx.drawImage(foreground, 0, 0);
    texture.refresh();
    return shape;
  };
  draw(0);
  return { box, key, draw, resolution };
}

// The projection is linear vertically and projective across the leaf.
// Narrow affine strips preserve the original material and its perspective;
// a subpixel overlap avoids seams, and the supersampled outline clips them.
function paintMovingDoorFace(ctx, face, box, resolution, closed, shape) {
  const [tl, tr, br, bl] = closed;
  const columns = 48;
  ctx.save();
  polygon(ctx, shape.quad); ctx.clip();
  for (let i = 0; i < columns; i++) {
    const a0 = i / columns, a1 = (i + 1) / columns, mid = (a0 + a1) / 2;
    const x0 = tl.x + (tr.x - tl.x) * a0, x1 = tl.x + (tr.x - tl.x) * a1;
    const y0 = tl.y + (tr.y - tl.y) * a0, y1 = tl.y + (tr.y - tl.y) * a1;
    const height = bl.y + (br.y - bl.y) * mid - (tl.y + (tr.y - tl.y) * mid);
    const p = shape.surface(a0, 0), q = shape.surface(a1, 0);
    const scaleY = (shape.surface(mid, 1).y - shape.surface(mid, 0).y) / height;
    const scaleX = (q.x - p.x) / (x1 - x0);
    const shear = (q.y - p.y - scaleY * (y1 - y0)) / (x1 - x0);
    const left = Math.min(x0, x1) - 0.25 / resolution;
    const width = Math.abs(x1 - x0) + 0.5 / resolution;
    ctx.save();
    ctx.transform(scaleX, shear, 0, scaleY, p.x - scaleX * x0, p.y - shear * x0 - scaleY * y0);
    ctx.drawImage(face, (left - box.x) * resolution, 0, width * resolution, face.height,
      left, box.y, width, face.height / resolution);
    ctx.restore();
  }
  ctx.restore();
}

// the clock's pendulum, hanging straight: a brass rod and its bob — the scene swings it
function paintPendulum(clock) {
  const R = 3, w = Math.ceil(clock.bob * 2 * R) + 4, h = Math.ceil((clock.len + clock.bob) * R) + 2;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = "#8a6c2c";
  g.fillRect(w / 2 - Math.max(1, 0.5 * R), 0, Math.max(2, R), clock.len * R);
  const bob = g.createRadialGradient(w / 2 - clock.bob * R * 0.35, clock.len * R - clock.bob * R * 0.35, 1, w / 2, clock.len * R, clock.bob * R);
  bob.addColorStop(0, "#f0d890");
  bob.addColorStop(0.55, "#b8923e");
  bob.addColorStop(1, "#4a3812");
  g.fillStyle = bob;
  g.beginPath(); g.arc(w / 2, clock.len * R, clock.bob * R, 0, Math.PI * 2); g.fill();
  return c;
}

// a bank of mist, soft-edged and uneven, for the scene to drift down the hall
function paintFogBank() {
  const w = 512, h = 192;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const rnd = lcg(3131);
  for (let i = 0; i < 46; i++) {
    soft(g, w * (0.12 + rnd() * 0.76), h * (0.3 + rnd() * 0.4), w * (0.07 + rnd() * 0.13), h * (0.12 + rnd() * 0.2), "186,196,214", 0.16);
  }
  return c;
}

export function releaseHallArt(textures) {
  for (const set of Object.values(KEYS)) for (const key of Object.values(set)) if (textures.exists(key)) textures.remove(key);
  for (const key of textures.getTextureKeys()) if (key.startsWith(SWING)) textures.remove(key);
}

// One leaf of the gate across the foot of the stairs: wrought iron, black
// against the moon coming down behind it. A heavy frame, upright bars ending
// in spear heads above a top rail that rises toward the middle, shorter
// bars between them below, a band of rings, a lock on the meeting stile.
// The left leaf is painted; the right is the same, turned over.
function paintGateLeaf(L, side) {
  const w = Math.ceil(L.gate.width / 2), h = Math.ceil(L.gate.height);
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  if (side > 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  const u = h / 100; // a hundredth of its height
  const iron = "#07080a", edge = "rgba(150,172,222,0.4)";
  // how high the top rail is, x across the leaf from its hinge
  const top = (x) => h * (0.2 - 0.1 * Math.pow(x / w, 1.6));
  const bar = (x, y0, y1, t) => {
    ctx.fillStyle = iron;
    ctx.fillRect(x - t / 2, y0, t, y1 - y0);
    ctx.fillStyle = edge;
    ctx.fillRect(x + t / 2 - Math.max(0.6, t * 0.22), y0, Math.max(0.6, t * 0.22), y1 - y0);
  };
  const rail = (y, t) => {
    ctx.fillStyle = iron;
    ctx.fillRect(0, y - t / 2, w, t);
    ctx.fillStyle = edge;
    ctx.fillRect(0, y - t / 2, w, Math.max(0.6, t * 0.2));
  };
  const foot = h - 3 * u, mid = h * 0.6, band = h * 0.47;
  // the upright bars, each ending in a spear head over the top rail
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const x = (w * i) / (n + 1);
    bar(x, top(x) - 9 * u, foot, 1.5 * u);
    ctx.fillStyle = iron;
    ctx.beginPath();
    ctx.moveTo(x, top(x) - 16 * u);
    ctx.lineTo(x + 1.9 * u, top(x) - 10.4 * u);
    ctx.lineTo(x, top(x) - 8.4 * u);
    ctx.lineTo(x - 1.9 * u, top(x) - 10.4 * u);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(x, top(x) - 7.4 * u, 1.3 * u, 0, Math.PI * 2); ctx.fill();
  }
  // the shorter bars between them, below the middle rail
  for (let i = 0; i <= n; i++) bar((w * (i + 0.5)) / (n + 1), mid, foot, 1 * u);
  // a band of rings between two rails
  rail(band, 1.4 * u);
  rail(mid, 1.8 * u);
  ctx.strokeStyle = iron;
  ctx.lineWidth = Math.max(1, 1.1 * u);
  for (let i = 0; i <= n; i++) {
    const x = (w * (i + 0.5)) / (n + 1), r = Math.min((mid - band) / 2 - 0.9 * u, w / (n + 1) / 2 - 1.1 * u);
    ctx.beginPath(); ctx.arc(x, (band + mid) / 2, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(0.5, 0.35 * u);
    ctx.beginPath(); ctx.arc(x, (band + mid) / 2, r, -1.2, 0.4); ctx.stroke();
    ctx.strokeStyle = iron;
    ctx.lineWidth = Math.max(1, 1.1 * u);
  }
  // the top rail, rising toward the middle
  ctx.strokeStyle = iron;
  ctx.lineWidth = 2.2 * u;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) { if (x) ctx.lineTo(x, top(x)); else ctx.moveTo(x, top(x)); }
  ctx.stroke();
  // the frame: the hinge stile, the meeting stile, the bottom rail
  bar(1.6 * u, top(0) - 4 * u, h, 3.2 * u);
  bar(w - 1.3 * u, top(w) - 5 * u, h, 2.6 * u);
  rail(foot, 2.6 * u);
  // the lock, and the ring to pull it by
  ctx.fillStyle = iron;
  ctx.fillRect(w - 7 * u, mid - 9 * u, 7 * u, 8 * u);
  ctx.fillStyle = edge;
  ctx.fillRect(w - 7 * u, mid - 9 * u, 7 * u, 0.6 * u);
  ctx.strokeStyle = "rgba(150,172,222,0.5)";
  ctx.lineWidth = Math.max(0.8, 0.6 * u);
  ctx.beginPath(); ctx.arc(w - 4.6 * u, mid - 3.4 * u, 1.9 * u, 0.4, Math.PI - 0.4); ctx.stroke();
  return c;
}

// the ceiling: dark plaster, a cornice down either side, ribs across it
function paintCeiling(ctx, L) {
  const { P, wall, ceil, u } = L;
  polygon(ctx, [P(-wall, ceil, 0.8), P(wall, ceil, 0.8), P(wall, ceil, END), P(-wall, ceil, END)]);
  ctx.fillStyle = L.theme === "chemistry" ? "#111816" : "#0b0a0c";
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
  if (L.theme === "chemistry") { chemical.paintFloor(ctx, L); return; }
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
    polygon(ctx, [P(-hw, floor, 0.7), P(hw, floor, 0.7), P(hw, floor, END), P(-hw, floor, END)]);
    ctx.fillStyle = col;
    ctx.fill();
  };
  const runner = L.theme === "botanic" ? botanic.RUNNER : null;
  strip(rw, runner ? runner.edge : L.worn ? "#101a17" : "#2e0c10");
  strip(rw * 0.9, runner ? runner.border : L.worn ? "#4a4734" : "#6a5a3a");
  strip(rw * 0.84, runner ? runner.field : L.worn ? "#16261f" : "#3c1014");
  // its pattern: a lozenge every stride, small flowers between
  for (let z = 0.8; z < END - 0.3; z += 0.22) {
    const p = P(0, floor, z);
    ctx.fillStyle = runner ? runner.motif : "rgba(120,96,56,0.5)";
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
  if (L.theme === "chemistry") { chemical.paintWall(ctx, L, side); return; }
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
  band(ceil, floor, L.worn ? "#29221b" : L.theme === "botanic" ? "#1c2c1f" : "#1a2420", L.worn ? "#120e0a" : L.theme === "botanic" ? "#0b140d" : "#0c1210");
  if (L.theme === "botanic") botanic.paintBotanicPaper(ctx, L, side, ceil, dado);
  // the paper's stripe
  else {
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
  }
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
  if (L.theme === "botanic") {
    // pressed specimens, framed, where portraits would hang
    [1.94, 2.83].forEach((z, i) => botanic.paintSpecimen(ctx, L, side, z, (i + (side > 0 ? 1 : 0)) % 2));
    return;
  }
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

// The far end: a wide opening in the end wall, and through it the stairs to
// the floor above — a straight flight going up and away from us, the hall's
// runner carried on up it under brass rods, a balustrade either side. The
// moon comes down the stairwell from a window we cannot see, somewhere
// above: it lies on the treads and on the noses of the steps, and leaves the
// risers dark.
function paintEnd(ctx, L) {
  const { P, wall, floor, ceil, H } = L;
  const a = P(-wall, ceil, END), b = P(wall, floor, END);
  ctx.fillStyle = "#0b100f";
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  // panelling along its foot
  const dado = P(0, floor - H * 0.36, END).y;
  ctx.fillStyle = "#140c07";
  ctx.fillRect(a.x, dado, b.x - a.x, b.y - dado);
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(a.x, dado - 2, b.x - a.x, 4);

  const ox = wall * STAIR.open, sx = wall * STAIR.half, rw = wall * 0.34 * 0.84;
  const head = H * STAIR.head, rise = H * STAIR.rise, n = STAIR.steps;
  const o0 = P(-ox, head, END), o1 = P(ox, floor, END);
  const s = 1 / END; // a pixel at the picture, here
  // the stairwell, dark, and the moon in the top of it
  ctx.fillStyle = "#04060a";
  ctx.fillRect(o0.x, o0.y, o1.x - o0.x, o1.y - o0.y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(o0.x, o0.y, o1.x - o0.x, o1.y - o0.y);
  ctx.clip();
  soft(ctx, L.vp.x - ox * 0.2 * s, o0.y, ox * 1.5 * s, (o1.y - o0.y) * 0.75, MOON, 0.42, "lighter");
  // its two walls, running up beside the flight
  const far = END + n * STAIR.run;
  for (const side of [-1, 1]) {
    polygon(ctx, [P(side * ox, head, END), P(side * ox, head - H, far), P(side * ox, floor - n * rise, far), P(side * ox, floor, END)]);
    const g = ctx.createLinearGradient(0, o0.y, 0, o1.y);
    g.addColorStop(0, side < 0 ? "#1a2430" : "#27364a");
    g.addColorStop(1, "#080b0d");
    ctx.fillStyle = g;
    ctx.fill();
  }
  // the steps, the furthest first: tread, then riser, then the runner on both
  for (let i = n - 1; i >= 0; i--) {
    const z0 = END + i * STAIR.run, z1 = z0 + STAIR.run;
    const y0 = floor - i * rise, y1 = y0 - rise;
    const lit = 0.25 + 0.75 * (i / (n - 1)); // more of the moon the higher we go
    const tread = (hw, col) => {
      polygon(ctx, [P(-hw, y1, z0), P(hw, y1, z0), P(hw, y1, z1), P(-hw, y1, z1)]);
      ctx.fillStyle = col;
      ctx.fill();
    };
    const riser = (hw, col) => {
      const p = P(-hw, y1, z0), q = P(hw, y0, z0);
      ctx.fillStyle = col;
      ctx.fillRect(p.x, p.y, q.x - p.x, q.y - p.y + 0.5);
    };
    if (y1 > 0) {
      tread(sx, "#3a2616");
      tread(rw, "#5a1a20");
      tread(sx, `rgba(${MOON},${(0.3 * lit).toFixed(3)})`);
    }
    riser(sx, "#120a06");
    riser(rw, "#280a0e");
    // the nose of the step, catching the light; the brass rod at its foot
    const p = P(-sx, y1, z0), q = P(sx, y1, z0);
    ctx.fillStyle = `rgba(190,208,240,${(0.2 + 0.5 * lit).toFixed(3)})`;
    ctx.fillRect(p.x, p.y, q.x - p.x, Math.max(1, 2.2 * s * (END / z0)));
    const r0 = P(-rw * 1.08, y0, z0), r1 = P(rw * 1.08, y0, z0);
    ctx.fillStyle = "rgba(196,160,84,0.75)";
    ctx.fillRect(r0.x, r0.y - Math.max(1, 3 * s), r1.x - r0.x, Math.max(0.8, 1.6 * s));
  }
  // the balustrade either side: a baluster to every step, the rail over them
  const railAt = (z) => floor - ((z - END) / STAIR.run) * rise - H * STAIR.rail;
  for (const side of [-1, 1]) {
    const X = side * sx * 1.04;
    ctx.strokeStyle = "#0c0705";
    ctx.lineWidth = Math.max(1, 6 * s);
    for (let i = 0; i < n; i++) {
      for (const k of [0.3, 0.8]) {
        const z = END + (i + k) * STAIR.run;
        const foot = P(X, floor - (i + 1) * rise, z), top = P(X, railAt(z), z);
        ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      }
    }
    const r0 = P(X, railAt(END), END), r1 = P(X, railAt(far), far);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1c110a";
    ctx.lineWidth = Math.max(2, 16 * s);
    ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.stroke();
    ctx.strokeStyle = "rgba(170,190,228,0.5)";
    ctx.lineWidth = Math.max(0.8, 4 * s);
    ctx.beginPath(); ctx.moveTo(r0.x, r0.y - 5 * s); ctx.lineTo(r1.x, r1.y - 3 * s); ctx.stroke();
    ctx.lineCap = "butt";
  }
  ctx.restore();
  // the opening's architrave: a pilaster either side, a deep head over them
  const pw = wall * 0.045 * s;
  const oak = ctx.createLinearGradient(0, o0.y, 0, o1.y);
  oak.addColorStop(0, "#2e1c10");
  oak.addColorStop(1, "#160c07");
  ctx.fillStyle = oak;
  ctx.fillRect(o0.x - pw, o0.y - pw * 1.5, pw, o1.y - o0.y + pw * 1.5);
  ctx.fillRect(o1.x, o0.y - pw * 1.5, pw, o1.y - o0.y + pw * 1.5);
  ctx.fillRect(o0.x - pw * 1.3, o0.y - pw * 1.7, o1.x - o0.x + pw * 2.6, pw * 1.7);
  ctx.fillStyle = "rgba(170,190,228,0.22)";
  ctx.fillRect(o0.x - 1, o0.y, 1.2, o1.y - o0.y);
  ctx.fillRect(o1.x, o0.y, 1.2, o1.y - o0.y);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(o0.x, o0.y, o1.x - o0.x, pw * 0.5);
  // the newel posts at the foot of the flight, a turned ball on each
  for (const side of [-1, 1]) {
    const foot = P(side * sx * 1.04, floor, END - 0.03), top = P(side * sx * 1.04, railAt(END) - H * 0.05, END - 0.03);
    const nw = Math.max(3, 30 * s);
    const g = ctx.createLinearGradient(foot.x - nw / 2, 0, foot.x + nw / 2, 0);
    g.addColorStop(0, "#0e0806");
    g.addColorStop(0.5, "#3c2414");
    g.addColorStop(1, "#0e0806");
    ctx.fillStyle = g;
    ctx.fillRect(foot.x - nw / 2, top.y, nw, foot.y - top.y);
    ctx.fillRect(foot.x - nw * 0.7, top.y, nw * 1.4, nw * 0.4);
    ctx.fillRect(foot.x - nw * 0.7, foot.y - nw * 0.6, nw * 1.4, nw * 0.6);
    ctx.beginPath(); ctx.arc(foot.x, top.y - nw * 0.5, nw * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(190,208,240,0.4)";
    ctx.beginPath(); ctx.arc(foot.x - nw * 0.15, top.y - nw * 0.7, nw * 0.2, 0, Math.PI * 2); ctx.fill();
  }
}

/** A tall arched window with the night in it — sky, moon, hills, its deep
 *  reveal and its sill — as the house has them. `w` is where it is on the
 *  screen: its middle, half its width, its head and its sill; `eye` is the
 *  point the room is seen from, which its reveals run back toward. `shape`
 *  is its build where that is not the house's tall one: how high its arch
 *  is for its half-width, how far down it the moon and the horizon are, and
 *  how big the moon. */
export function paintNightWindow(ctx, W, H, w, eye, { ry = 0.9, moonY = 0.26, moonR = 0.13, horizon = 0.86 } = {}) {
  const geo = archGeo({
    W, H, S: w.rx * 1.25, V: w.rx * 1.25, Wv: w.rx / 0.455,
    archCX: w.cx, archCY: w.top + w.rx * ry, archRX: w.rx, archRY: w.rx * ry, sillY: w.sill,
    eye,
    moon: { x: w.cx + w.rx * 0.28, y: w.top + (w.sill - w.top) * moonY, r: w.rx * moonR },
    horizonY: w.top + (w.sill - w.top) * horizon,
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
}

// The far end of the upper hall: where the stairs are on the floor below,
// a tall arched window — the house's own — with the moon in it.
function paintEndWindow(ctx, L) {
  if (L.theme === "chemistry") { chemical.paintEndBoard(ctx, L); return; }
  const { P, wall, floor, ceil, H, W } = L;
  const a = P(-wall, ceil, END), b = P(wall, floor, END);
  ctx.fillStyle = L.theme === "chemistry" ? "#2c3d35" : "#0b100f";
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  const dado = P(0, floor - H * 0.36, END).y;
  const w = { cx: L.vp.x, rx: (wall * 0.24) / END, top: P(0, -H * 0.52, END).y, sill: dado };
  soft(ctx, w.cx, (w.top + w.sill) / 2, w.rx * 3.4, (w.sill - w.top) * 1.2, MOON, 0.26, "lighter");
  paintNightWindow(ctx, W, H, w, L.vp);
  if (L.theme === "chemistry") { chemical.paintEndDado(ctx, L, { a, b, dado }); return; }
  // the panelling runs on under the sill
  ctx.fillStyle = "#140c07";
  ctx.fillRect(a.x, dado, b.x - a.x, b.y - dado);
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(a.x, dado - 2, b.x - a.x, 4);
  // boards nailed across the window, as across the door: the moon comes between them
  const rnd = lcg(909), s = 1 / END;
  for (let k = 0; k < 5; k++) {
    const y = w.top + (w.sill - w.top) * (0.1 + k * 0.19), ph = (w.sill - w.top) * 0.11;
    ctx.save();
    ctx.translate(w.cx, y + ph / 2);
    ctx.rotate((rnd() - 0.5) * 0.16);
    ctx.fillStyle = k % 2 ? "#221a12" : "#2b2117";
    ctx.fillRect(-w.rx * 1.3, -ph / 2, w.rx * 2.6, ph);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-w.rx * 1.3, ph / 2 - ph * 0.14, w.rx * 2.6, ph * 0.14);
    ctx.fillStyle = "rgba(170,190,236,0.2)";
    ctx.fillRect(-w.rx * 1.3, -ph / 2, w.rx * 2.6, Math.max(0.7, ph * 0.07));
    ctx.fillStyle = "#050607";
    for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(e * w.rx * 1.14, 0, Math.max(1, 5 * H * 0.001 * s * 4), 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}

// Stairs at the side of a hall: an opening in a wall where a door would be,
// and through it a flight going off at right angles — up (`dir` 1) or down
// (-1) — away from the hall on that `side`. Its steps are seen end on, a
// strip of carpet down the middle of them, a rail on the far wall, a newel
// at its foot. `span` is how far along the wall the opening runs.
function paintSideStairs(ctx, L, span, side, dir) {
  const { P, wall, floor, H, u } = L;
  const { z0, z1 } = span;
  const head = L.doorTop, run = wall * 0.075, rise = H * 0.078, n = 12;
  const X0 = side * wall, out = (i) => side * (wall + i * run);
  const quad = [P(X0, head, z0), P(X0, head, z1), P(X0, floor, z1), P(X0, floor, z0)];
  const poly = (pts, fill) => { polygon(ctx, pts); ctx.fillStyle = fill; ctx.fill(); };
  // its architrave
  poly([P(X0, head - H * 0.045, z0 - 0.06), P(X0, head - H * 0.045, z1 + 0.06), P(X0, floor, z1 + 0.06), P(X0, floor, z0 - 0.06)], "#2c1b10");
  poly(quad, "#07090c");
  ctx.save();
  polygon(ctx, quad);
  ctx.clip();
  // the far wall of the stairwell, a little light on it from above
  const fw = [P(X0, head - H, z1), P(out(n + 4), head - H, z1), P(out(n + 4), floor + H, z1), P(X0, floor + H, z1)];
  const g = ctx.createLinearGradient(0, quad[1].y, 0, quad[2].y);
  g.addColorStop(0, dir > 0 ? "#1c2634" : "#12161c");
  g.addColorStop(1, "#0a0d11");
  poly(fw, g);
  // the steps, the furthest first: each a riser facing the hall and a tread beyond it
  for (let i = n - 1; i >= 0; i--) {
    const X = out(i), X1 = out(i + 1), y0 = floor - dir * i * rise, y1 = y0 - dir * rise;
    const lit = dir > 0 ? 0.2 + 0.8 * (i / (n - 1)) : 0.7 * (1 - i / (n - 1));
    if (y1 > 0) {
      poly([P(X, y1, z0), P(X1, y1, z0), P(X1, y1, z1), P(X, y1, z1)], "#33221a");
      poly([P(X, y1, z0 + 0.16), P(X1, y1, z0 + 0.16), P(X1, y1, z1 - 0.16), P(X, y1, z1 - 0.16)], "#16261f");
      poly([P(X, y1, z0), P(X1, y1, z0), P(X1, y1, z1), P(X, y1, z1)], `rgba(${MOON},${(0.2 * lit).toFixed(3)})`);
    }
    if (dir > 0) {
      poly([P(X, y0, z0), P(X, y0, z1), P(X, y1, z1), P(X, y1, z0)], "#130c07");
      poly([P(X, y0, z0 + 0.16), P(X, y0, z1 - 0.16), P(X, y1, z1 - 0.16), P(X, y1, z0 + 0.16)], "#0c1512");
    }
    // the nose of the step
    const a = P(X, dir > 0 ? y1 : y0, z0), b = P(X, dir > 0 ? y1 : y0, z1);
    ctx.strokeStyle = `rgba(190,208,240,${(0.15 + 0.4 * lit).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.8, (2 * u) / z0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // the rail on the far wall, going with the steps
  const r0 = P(X0, floor - H * 0.3, z1 - 0.03), r1 = P(out(n), floor - dir * n * rise - H * 0.3, z1 - 0.03);
  ctx.strokeStyle = "#1c110a";
  ctx.lineWidth = Math.max(1.6, (9 * u) / z1);
  ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.stroke();
  ctx.strokeStyle = "rgba(170,190,228,0.35)";
  ctx.lineWidth = Math.max(0.6, (2 * u) / z1);
  ctx.beginPath(); ctx.moveTo(r0.x, r0.y - (3 * u) / z1); ctx.lineTo(r1.x, r1.y - (3 * u) / z1); ctx.stroke();
  // the dark gathering along the flight
  ctx.fillStyle = dir > 0 ? "rgba(2,3,5,0.28)" : "rgba(2,3,5,0.5)";
  polygon(ctx, quad);
  ctx.fill();
  ctx.restore();
  // the newel at the foot of it, on the hall side
  const foot = P(X0, floor, z1 + 0.02), top = P(X0, floor - H * 0.4, z1 + 0.02), nw = Math.max(3, (30 * u) / z1);
  ctx.strokeStyle = "#2a190e";
  ctx.lineWidth = nw;
  ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(top.x, top.y); ctx.stroke();
  ctx.fillStyle = "#3c2414";
  ctx.beginPath(); ctx.arc(top.x, top.y - nw * 0.4, nw * 0.62, 0, Math.PI * 2); ctx.fill();
}

// What years of nobody have done to the upper hall: the paper come away
// from the walls in sheets, the plaster behind it bare; damp run down from
// the ceiling, and stained it; cracks; cobwebs over the doors; the runner
// worn through and marked; one door boarded across; dust and fallen plaster
// along the foot of the walls. Nothing worse than neglect.
function paintDecay(ctx, L) {
  const { P, wall, floor, ceil, H, u } = L;
  const rnd = lcg(1313);
  const poly = (pts, fill) => { polygon(ctx, pts); ctx.fillStyle = fill; ctx.fill(); };
  const dado = floor - H * 0.36;
  for (const side of [-1, 1]) {
    const X = side * wall;
    // damp, run down from the ceiling
    for (let i = 0; i < 16; i++) {
      const z = 0.8 + rnd() * 3.6, len = H * (0.15 + rnd() * 0.55), w = 0.012 + rnd() * 0.04;
      const top = P(X, ceil, z), bot = P(X, ceil + len, z);
      const g = ctx.createLinearGradient(0, top.y, 0, bot.y);
      g.addColorStop(0, "rgba(2,4,5,0.5)");
      g.addColorStop(1, "rgba(2,4,5,0)");
      poly([P(X, ceil, z), P(X, ceil, z + w), P(X, ceil + len, z + w), P(X, ceil + len, z)], g);
    }
    // the paper come away: a ragged patch of bare plaster, the sheet hanging below it
    for (let i = 0; i < 12; i++) {
      const z = 0.85 + rnd() * 3.3, y = ceil + H * (0.12 + rnd() * 0.5), rz = 0.05 + rnd() * 0.1, ry = H * (0.05 + rnd() * 0.1);
      if (L.doors.some((d) => d.side === side && z > d.z - 0.12 && z < d.z + DOOR_LEN + 0.12 && y + ry > L.doorTop - H * 0.04)) continue;
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2, q = 0.6 + rnd() * 0.5;
        pts.push(P(X, Math.min(dado - 4, y + Math.sin(a) * ry * q), z + Math.cos(a) * rz * q));
      }
      poly(pts, "#2b2a26");
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = Math.max(0.8, (2 * u) / z);
      ctx.stroke();
      // the laths showing through in one or two
      if (rnd() < 0.5) {
        ctx.strokeStyle = "rgba(70,56,40,0.6)";
        for (let k = -2; k <= 2; k++) {
          const p = P(X, y + k * ry * 0.22, z - rz * 0.45), q = P(X, y + k * ry * 0.22, z + rz * 0.45);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      // the sheet that came off it, curling
      poly([P(X, y + ry * 0.7, z - rz * 0.5), P(X, y + ry * 0.7, z + rz * 0.5), P(X - side * wall * 0.03, y + ry * 1.9, z + rz * 0.2), P(X - side * wall * 0.02, y + ry * 1.6, z - rz * 0.4)], "#26312d");
    }
    // cracks in the plaster
    for (let i = 0; i < 4; i++) {
      let z = 0.9 + rnd() * 3.2, y = ceil + rnd() * H * 0.1;
      ctx.strokeStyle = "rgba(1,2,3,0.8)";
      ctx.lineWidth = Math.max(0.7, (1.4 * u) / z);
      ctx.beginPath();
      ctx.moveTo(P(X, y, z).x, P(X, y, z).y);
      for (let k = 0; k < 9; k++) { z += (rnd() - 0.5) * 0.08; y += H * (0.02 + rnd() * 0.05); ctx.lineTo(P(X, y, z).x, P(X, y, z).y); }
      ctx.stroke();
    }
    // cobwebs in the corner over each door
    for (const d of L.doors) {
      if (d.side !== side) continue;
      const c = P(X, L.doorTop - H * 0.04, d.z - 0.02);
      ctx.strokeStyle = "rgba(190,200,220,0.16)";
      ctx.lineWidth = Math.max(0.5, (0.9 * u) / d.z);
      for (let k = 0; k < 6; k++) {
        const q = P(X - side * wall * 0.02 * k, L.doorTop + H * (0.02 + k * 0.035), d.z + 0.02 + k * 0.035);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      for (const f of [0.35, 0.7]) {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const q = P(X - side * wall * 0.02 * k * f, L.doorTop - H * 0.04 + (H * (0.06 + k * 0.035)) * f, d.z - 0.02 + (0.04 + k * 0.035) * f);
          if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
      }
    }
    // dust and fallen plaster along the foot of the wall
    for (let i = 0; i < 90; i++) {
      const z = 0.75 + rnd() * 3.8, p = P(X - side * wall * rnd() * 0.07, floor, z);
      ctx.fillStyle = rnd() < 0.5 ? "rgba(120,118,108,0.4)" : "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, ((2 + rnd() * 7) * u) / z, ((1 + rnd() * 2.4) * u) / z, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // the ceiling: brown rings where the rain has come through
  for (let i = 0; i < 9; i++) {
    const z = 0.9 + rnd() * 3.4, p = P((rnd() * 2 - 1) * wall * 0.9, ceil, z);
    soft(ctx, p.x, p.y, ((60 + rnd() * 120) * u) / z, ((14 + rnd() * 26) * u) / z, rnd() < 0.5 ? "0,0,0" : "40,30,16", 0.45);
  }
  // the runner: worn through in places, marked in others
  for (let i = 0; i < 30; i++) {
    const z = 0.85 + rnd() * 3.6, p = P((rnd() * 2 - 1) * wall * 0.32, floor, z);
    soft(ctx, p.x, p.y, ((18 + rnd() * 70) * u) / z, ((5 + rnd() * 12) * u) / z, rnd() < 0.6 ? "8,5,3" : "0,0,0", 0.8);
  }
  // one door boarded across: three planks, none of them level
  const shut = L.upper && L.doors.find((d) => d.side > 0 && d.i === 1);
  if (shut) {
    const X = shut.side * wall;
    for (let k = 0; k < 3; k++) {
      const y = L.doorTop + (floor - L.doorTop) * (0.2 + k * 0.26), tilt = (rnd() - 0.5) * H * 0.05, ph = H * 0.05;
      const z0 = shut.z - 0.05, z1 = shut.z + DOOR_LEN + 0.05;
      poly([P(X, y, z0), P(X, y + tilt, z1), P(X, y + tilt + ph, z1), P(X, y + ph, z0)], k % 2 ? "#2a2118" : "#33281c");
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = Math.max(0.8, (1.6 * u) / shut.z);
      ctx.stroke();
      ctx.fillStyle = "#07080a";
      for (const [zz, yy] of [[z0 + 0.03, y + ph / 2], [z1 - 0.03, y + tilt + ph / 2]]) { const q = P(X, yy, zz); ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1, (2.4 * u) / zz), 0, Math.PI * 2); ctx.fill(); }
    }
  }
}

// The light. A clear glass bulb on a braided flex from a cracked plaster rose,
// where the chandelier hangs on the floor below: a brass cap, a brown
// bakelite holder with its skirt, the pear of glass with the filament
// standing in it on its glass stem. On the right-hand wall, between the
// stairs and the next door, a little iron lever works it — and from it a
// cloth-covered wire clipped up the wall and across the ceiling to the
// rose. Painted dark: the scene moves the lever and lights the bulb.
function paintBulb(ctx, L) {
  const { P, wall, ceil, u } = L;
  const b = L.bulb, r = b.r;
  // ── the wire: up the wall from the switch, across the ceiling to the rose
  const sw = L.switch, sr = sw.r;
  const up = P(wall, ceil, 2.05), rose = P(0, ceil, 1.9);
  for (const [w, col] of [[3.4, "#050506"], [1.6, "#3a3226"]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, (w * u) / 2);
    ctx.beginPath(); ctx.moveTo(sw.x, sw.y - sr * 0.9); ctx.lineTo(up.x, up.y); ctx.lineTo(rose.x, rose.y); ctx.stroke();
  }
  // the clips that hold it
  ctx.fillStyle = "#6a5a34";
  for (const k of [0.3, 0.62, 0.9]) ctx.fillRect(sw.x - sr * 0.14, sw.y - sr * 0.9 + (up.y - sw.y + sr * 0.9) * k, sr * 0.28, Math.max(1, sr * 0.07));
  for (const k of [0.25, 0.5, 0.75]) { const x = up.x + (rose.x - up.x) * k, y = up.y + (rose.y - up.y) * k; ctx.fillRect(x - sr * 0.1, y - sr * 0.05, sr * 0.2, sr * 0.1); }

  paintLeverMount(ctx, sw);

  // ── the rose on the ceiling, cracked across
  ctx.fillStyle = "#0c0c0d";
  ctx.beginPath(); ctx.ellipse(b.x, b.top + r * 0.16, r * 1.36, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#26262a";
  ctx.beginPath(); ctx.ellipse(b.x, b.top + r * 0.1, r * 1.3, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = Math.max(0.6, r * 0.035);
  ctx.beginPath(); ctx.moveTo(b.x - r * 1.1, b.top + r * 0.04); ctx.lineTo(b.x + r * 0.1, b.top + r * 0.24); ctx.lineTo(b.x + r * 1, b.top + r * 0.14); ctx.stroke();
  // ── the flex: two cords twisted together, a knot above the holder
  const fy0 = b.top + r * 0.3, fy1 = b.y - r * 2.02;
  for (const ph of [0, Math.PI]) {
    ctx.strokeStyle = ph ? "#4a3a26" : "#2a2016";
    ctx.lineWidth = Math.max(1, r * 0.075);
    ctx.beginPath();
    for (let y = fy0, i = 0; y <= fy1; y += r * 0.12, i++) {
      const x = b.x + Math.sin(i * 0.9 + ph) * r * 0.055;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "#2a2016";
  ctx.beginPath(); ctx.ellipse(b.x, fy1 - r * 0.06, r * 0.13, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  // ── the holder: a bakelite cap and skirt, ribbed, a brass collar under it
  const hx = (y0, y1, w0, w1, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(b.x - w0, y0); ctx.lineTo(b.x + w0, y0); ctx.lineTo(b.x + w1, y1); ctx.lineTo(b.x - w1, y1);
    ctx.closePath();
    ctx.fill();
  };
  const bake = ctx.createLinearGradient(b.x - r * 0.5, 0, b.x + r * 0.5, 0);
  bake.addColorStop(0, "#120a06");
  bake.addColorStop(0.35, "#4a2c18");
  bake.addColorStop(0.5, "#6a4428");
  bake.addColorStop(1, "#0e0805");
  hx(fy1, fy1 + r * 0.22, r * 0.16, r * 0.3, bake);
  hx(fy1 + r * 0.22, fy1 + r * 0.72, r * 0.3, r * 0.34, bake);
  hx(fy1 + r * 0.72, fy1 + r * 0.86, r * 0.46, r * 0.5, bake);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  for (let i = 0; i < 4; i++) ctx.fillRect(b.x - r * 0.33, fy1 + r * (0.3 + i * 0.11), r * 0.66, Math.max(0.6, r * 0.03));
  const collar = ctx.createLinearGradient(b.x - r * 0.3, 0, b.x + r * 0.3, 0);
  collar.addColorStop(0, "#3a2a10");
  collar.addColorStop(0.4, "#c8a252");
  collar.addColorStop(1, "#2a1e0c");
  hx(fy1 + r * 0.86, fy1 + r * 1.1, r * 0.3, r * 0.27, collar);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 0; i < 3; i++) ctx.fillRect(b.x - r * 0.3, fy1 + r * (0.9 + i * 0.07), r * 0.6, Math.max(0.5, r * 0.02));
  // ── the bulb: clear glass, a pear; what is behind it shows through, darker
  const neck = fy1 + r * 1.1;
  const glass = () => {
    ctx.beginPath();
    ctx.moveTo(b.x - r * 0.26, neck);
    ctx.bezierCurveTo(b.x - r * 0.3, neck + r * 0.5, b.x - r * 0.94, b.y - r * 0.5, b.x - r * 0.94, b.y + r * 0.06);
    ctx.bezierCurveTo(b.x - r * 0.94, b.y + r * 0.62, b.x - r * 0.5, b.y + r, b.x, b.y + r);
    ctx.bezierCurveTo(b.x + r * 0.5, b.y + r, b.x + r * 0.94, b.y + r * 0.62, b.x + r * 0.94, b.y + r * 0.06);
    ctx.bezierCurveTo(b.x + r * 0.94, b.y - r * 0.5, b.x + r * 0.3, neck + r * 0.5, b.x + r * 0.26, neck);
    ctx.closePath();
  };
  glass();
  const body = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.2, r * 0.1, b.x, b.y, r * 1.1);
  body.addColorStop(0, "rgba(70,84,104,0.2)");
  body.addColorStop(0.7, "rgba(20,26,36,0.42)");
  body.addColorStop(1, "rgba(4,6,10,0.7)");
  ctx.fillStyle = body;
  ctx.fill();
  // the glass stem inside, the two wires up it, the filament between them
  ctx.fillStyle = "rgba(150,170,200,0.2)";
  ctx.beginPath();
  ctx.moveTo(b.x - r * 0.12, neck); ctx.lineTo(b.x + r * 0.12, neck); ctx.lineTo(b.x + r * 0.07, b.y - r * 0.28); ctx.lineTo(b.x - r * 0.07, b.y - r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(120,110,96,0.85)";
  ctx.lineWidth = Math.max(0.6, r * 0.028);
  for (const e of [-1, 1]) { ctx.beginPath(); ctx.moveTo(b.x + e * r * 0.05, b.y - r * 0.3); ctx.lineTo(b.x + e * r * 0.4, b.y + r * 0.12); ctx.stroke(); }
  ctx.strokeStyle = "rgba(150,140,120,0.9)";
  ctx.lineWidth = Math.max(0.5, r * 0.022);
  ctx.beginPath();
  ctx.moveTo(b.x - r * 0.4, b.y + r * 0.12);
  for (let i = 1; i <= 8; i++) ctx.lineTo(b.x - r * 0.4 + (r * 0.8 * i) / 8, b.y + r * (i % 2 ? 0.34 : 0.12));
  ctx.stroke();
  // the glass itself: its rim, a long window-light down one side, a short one, the moon low on it
  glass();
  ctx.strokeStyle = "rgba(170,190,224,0.5)";
  ctx.lineWidth = Math.max(0.6, r * 0.03);
  ctx.stroke();
  ctx.strokeStyle = "rgba(230,240,255,0.55)";
  ctx.lineWidth = Math.max(0.8, r * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(b.x - r * 0.5, b.y - r * 0.5); ctx.quadraticCurveTo(b.x - r * 0.78, b.y - r * 0.05, b.x - r * 0.62, b.y + r * 0.42); ctx.stroke();
  ctx.strokeStyle = "rgba(230,240,255,0.25)";
  ctx.lineWidth = Math.max(0.6, r * 0.04);
  ctx.beginPath(); ctx.moveTo(b.x + r * 0.56, b.y - r * 0.26); ctx.quadraticCurveTo(b.x + r * 0.72, b.y, b.x + r * 0.64, b.y + r * 0.26); ctx.stroke();
  ctx.lineCap = "butt";
  soft(ctx, b.x + r * 0.2, b.y + r * 0.72, r * 0.4, r * 0.16, MOON, 0.3, "lighter");
}

// The moon down the stairwell: it spills out of the opening onto the runner
// at the foot of the stairs and reaches a little way up the hall, and hangs
// in the dusty air in front of the flight.
function paintStairLight(ctx, L) {
  const { P, wall, floor, H, u } = L;
  const ox = wall * STAIR.open;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${Math.round(6 * u)}px)`;
  for (const [z0, z1, k0, k1, a] of [[END - 0.02, END - 1.2, 0.86, 1.1, 0.24], [END - 1.2, END - 2.5, 1.1, 1.36, 0.12], [END - 2.5, END - 3.3, 1.36, 1.5, 0.05]]) {
    polygon(ctx, [P(-ox * k0, floor, z0), P(ox * k0, floor, z0), P(ox * k1, floor, z1), P(-ox * k1, floor, z1)]);
    ctx.fillStyle = `rgba(${MOON},${a})`;
    ctx.fill();
  }
  ctx.filter = `blur(${Math.round(14 * u)}px)`;
  const top = P(0, H * STAIR.head, END), near = P(0, floor, END - 2.6);
  const g = ctx.createLinearGradient(0, top.y, 0, near.y);
  g.addColorStop(0, `rgba(${MOON},0.22)`);
  g.addColorStop(1, `rgba(${MOON},0)`);
  ctx.fillStyle = g;
  polygon(ctx, [P(-ox * 0.8, H * STAIR.head, END), P(ox * 0.8, H * STAIR.head, END), { x: near.x + wall * 0.2, y: near.y }, { x: near.x - wall * 0.2, y: near.y }]);
  ctx.fill();
  ctx.filter = "none";
  ctx.restore();
}

// A door in a wall: its architrave, a heavy leaf of dark oak in six panels, a
// brass knob and keyhole, and under it a thread of light from the room behind.
/** `leafOnly`: only the door itself — no architrave round it, no light at
 *  its keyhole or under it — for a leaf that has left its frame. */
// Lettering is rasterized once for a moving door, never during its swing.
function paintDoorNumber(number) {
  const R = 3, fw = 200, fh = 70;
  const flat = makeCanvas(fw * R, fh * R);
  const g = flat.getContext("2d");
  g.scale(R, R);
  g.font = '700 56px Georgia, "Times New Roman", serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  const put = (dx, dy, fill) => {
    g.fillStyle = fill;
    g.fillText(ROMAN[number - 1], fw / 2 + dx, fh / 2 + 2 + dy);
  };
  put(1.3, 1.4, "rgba(255,214,170,0.22)");
  put(0, 0, "#070403");
  g.save();
  g.globalCompositeOperation = "source-atop";
  put(0.9, 1.1, "#b3a384");
  const rnd = lcg(700 + number);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(20,12,6,${(0.15 + rnd() * 0.4).toFixed(2)})`;
    g.fillRect(rnd() * fw, rnd() * fh, 1 + rnd() * 5, 0.6 + rnd() * 1.4);
  }
  g.restore();
  return flat;
}

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
  ctx.fillStyle = L.theme === "chemistry" ? "#2b3a31" : "#2c1b10";
  ctx.fill();
  polygon(ctx, quad(-0.04, -0.015, 1.04, 1));
  ctx.fillStyle = "#0a0605";
  ctx.fill();
  // the leaf
  polygon(ctx, quad(0, 0, 1, 1));
  const g = ctx.createLinearGradient(tl.x, 0, tr.x, 0);
  g.addColorStop(0, L.theme === "chemistry" ? "#35473b" : "#3a2416");
  g.addColorStop(1, L.theme === "chemistry" ? "#1b2c24" : "#1e120a");
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
    const flat = paintDoorNumber(d.number);
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
  if (!d.hideHandle) paintDoorHandle(ctx, L, d, f);
  if (L.worn) return; // nobody is behind these: no light at the keyhole, none under the door
  // light through the keyhole, and the thread of it under the door
  const kr = Math.max(2, (9 * u) / d.z);
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

// The knob turns before the latch releases, then its spring returns it.
function paintDoorHandle(ctx, L, d, f) {
  const k = f(0.86, 0.53);
  const kr = Math.max(2, (9 * L.u) / d.z);
  ctx.fillStyle = "#3a2a10";
  ctx.beginPath(); ctx.ellipse(k.x, k.y + kr * 1.6, kr * 0.5, kr * 2.4, 0, 0, Math.PI * 2); ctx.fill();
  const turn = (d.handle ?? 0) * 0.65;
  const kg = ctx.createRadialGradient(k.x - kr * 0.42 * Math.cos(Math.PI / 4 + turn), k.y - kr * 0.42 * Math.sin(Math.PI / 4 + turn), kr * 0.1, k.x, k.y, kr);
  kg.addColorStop(0, "#fff0c0");
  kg.addColorStop(0.5, "#c69a42");
  kg.addColorStop(1, "#4a340e");
  ctx.fillStyle = kg;
  ctx.beginPath(); ctx.arc(k.x, k.y, kr, 0, Math.PI * 2); ctx.fill();
}

// a sconce: a brass arm, a candle in a glass, its light on the wall and floor
function paintSconce(ctx, L, s) {
  const { u } = L;
  const k = (u * 1.5) / s.z;
  const x = s.x - s.side * 14 * k;
  if (s.dead) {
    // burnt out long ago: the arm, the cup, a stub of grey wax
    ctx.strokeStyle = "#2c2210";
    ctx.lineWidth = Math.max(1, 3 * k);
    ctx.beginPath(); ctx.moveTo(s.x, s.y + 10 * k); ctx.quadraticCurveTo(x, s.y + 16 * k, x, s.y); ctx.stroke();
    ctx.fillStyle = "#3a2c14";
    ctx.fillRect(x - 6 * k, s.y - 1 * k, 12 * k, 3 * k);
    ctx.fillStyle = "#5a564c";
    ctx.fillRect(x - 2.4 * k, s.y - 5 * k, 4.8 * k, 4 * k);
    return;
  }
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
// end a long-case clock and a coat stand either side of the stairs; between
// the doors a little table with a fern, a chair, an umbrella stand; a trunk.
function paintThings(ctx, L) {
  if (L.theme === "chemistry") { chemical.paintThings(ctx, L); return; }
  const { P, wall, floor, ceil, H } = L;
  const dark = "#070504";
  // ── the chandelier: old bronze on a chain from a plaster rose — a turned
  // stem, eight arms sweeping out and up to their candle cups, a drop of cut
  // glass under each, the candles out; the moon from the stairwell on it
  if (!L.worn) {
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
  // ── the long-case clock, left of the stairs
  if (!L.worn) stand(-1, END - 0.12, wall * 0.26, () => {
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
    // (its pendulum is the scene's, so that it can swing)
  });
  // ── the coat stand, right of the stairs: a coat and a hat on it
  stand(1, END - 0.12, wall * 0.26, () => {
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
    // the botanist's: a straw hat and an apron
    if (L.theme === "botanic") { botanic.paintGardenerOnStand(ctx); return; }
    ctx.fillStyle = "#16181e";
    ctx.beginPath();
    ctx.moveTo(-28, -318); ctx.quadraticCurveTo(-52, -200, -44, -70); ctx.lineTo(-6, -64); ctx.lineTo(-2, -310); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0e0f12";
    ctx.beginPath(); ctx.ellipse(30, -338, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(30, -350, 15, 14, 0, Math.PI, 0); ctx.fill();
  });
  // ── between the first two doors, left: a little table, a fern in a pot
  if (!L.worn) stand(-1, 2.01, 46, () => {
    shadow(52);
    ctx.fillStyle = dark;
    for (const x of [-30, 30]) ctx.fillRect(x - 3, -116, 6, 116);
    const tg = ctx.createLinearGradient(0, -128, 0, -112);
    tg.addColorStop(0, "#5a3a22"); tg.addColorStop(1, "#1e120a");
    ctx.fillStyle = tg;
    ctx.fillRect(-44, -128, 88, 14);
    if (L.theme === "botanic") { botanic.paintTableFern(ctx); return; }
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
  if (L.theme === "botanic") stand(1, 2.01, 60, () => botanic.paintPalm(ctx));
  else if (!L.worn) stand(1, 2.01, 44, () => {
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
  if (L.theme === "botanic") stand(-1, 2.9, 44, () => botanic.paintUrnPlant(ctx));
  else if (!L.worn) stand(-1, 2.9, 40, () => {
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
    if (L.theme === "botanic") botanic.paintPotsAndCan(ctx);
  });
  if (L.upper) {
    // ── upstairs, down the left: barrels, stood and stacked and left
    // An oak cask, standing, seen from a little above: its staves — no two the
    // same brown — bellying out and in again, four iron hoops that go round
    // it (so they dip toward us), rivets on them, the rim standing up round
    // its sunk head, a bung. Light from the right, dark down its left.
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const barrel = (x, y, h = 150, r = 50) => {
      const half = (f) => r * (0.8 + 0.22 * Math.sin(Math.PI * f)); // its half-width, f up it from 0 to 1
      const dip = (f) => half(f) * 0.2; // how far a ring round it dips toward us
      const side = () => {
        ctx.beginPath();
        ctx.moveTo(x - half(0), y);
        for (let i = 1; i <= 12; i++) ctx.lineTo(x - half(i / 12), y - (h * i) / 12);
        for (let i = 12; i >= 0; i--) ctx.lineTo(x + half(i / 12), y - (h * i) / 12);
        ctx.quadraticCurveTo(x, y + dip(0) * 2, x - half(0), y);
        ctx.closePath();
      };
      side();
      ctx.fillStyle = "#3c2817";
      ctx.fill();
      ctx.save();
      side();
      ctx.clip();
      // the staves
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a0 = -1 + (2 * i) / n, a1 = -1 + (2 * (i + 1)) / n;
        const tone = 0.75 + rnd() * 0.5;
        ctx.fillStyle = `rgb(${Math.round(74 * tone)},${Math.round(50 * tone)},${Math.round(30 * tone)})`;
        ctx.beginPath();
        for (let k = 0; k <= 12; k++) { const f = k / 12; const px = x + Math.sin((a0 * Math.PI) / 2) * half(f), py = y - h * f + dip(f) * Math.cos((a0 * Math.PI) / 2); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        for (let k = 12; k >= 0; k--) { const f = k / 12; ctx.lineTo(x + Math.sin((a1 * Math.PI) / 2) * half(f), y - h * f + dip(f) * Math.cos((a1 * Math.PI) / 2)); }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(6,3,1,0.7)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // the grain down it
        ctx.strokeStyle = "rgba(20,10,4,0.25)";
        ctx.lineWidth = 0.8;
        for (let g = 0; g < 2; g++) {
          const am = a0 + (a1 - a0) * (0.3 + rnd() * 0.4);
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) { const f = k / 12; const px = x + Math.sin((am * Math.PI) / 2) * half(f), py = y - h * f + dip(f) * Math.cos((am * Math.PI) / 2); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
          ctx.stroke();
        }
      }
      // round it goes: light on the right, the left in shadow
      const turn = ctx.createLinearGradient(x - r * 1.05, 0, x + r * 1.05, 0);
      turn.addColorStop(0, "rgba(0,0,0,0.72)");
      turn.addColorStop(0.45, "rgba(0,0,0,0.1)");
      turn.addColorStop(0.7, "rgba(190,206,240,0.1)");
      turn.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = turn;
      ctx.fillRect(x - r * 1.2, y - h - 10, r * 2.4, h + 40);
      // the hoops: iron, each riveted where it laps
      for (const f of [0.07, 0.3, 0.7, 0.93]) {
        const w = half(f), cy = y - h * f, d = dip(f), th = 9;
        const iron = ctx.createLinearGradient(x - w, 0, x + w, 0);
        iron.addColorStop(0, "#050506");
        iron.addColorStop(0.6, "#3e434c");
        iron.addColorStop(0.72, "#6e7684");
        iron.addColorStop(1, "#0c0d10");
        ctx.strokeStyle = iron;
        ctx.lineWidth = th;
        ctx.beginPath(); ctx.moveTo(x - w - 2, cy); ctx.quadraticCurveTo(x, cy + d * 2, x + w + 2, cy); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x - w - 2, cy + th / 2); ctx.quadraticCurveTo(x, cy + d * 2 + th / 2, x + w + 2, cy + th / 2); ctx.stroke();
        ctx.fillStyle = "#0a0b0d";
        ctx.beginPath(); ctx.arc(x + w * 0.2, cy + d * 0.96, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(190,200,220,0.5)";
        ctx.beginPath(); ctx.arc(x + w * 0.2 - 0.6, cy + d * 0.96 - 0.6, 0.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // the top: the staves' ends standing up in a rim round the sunk head
      const tw = half(1), td = dip(1);
      ctx.fillStyle = "#1c120a";
      ctx.beginPath(); ctx.ellipse(x, y - h, tw, td, 0, 0, Math.PI * 2); ctx.fill();
      const head = ctx.createLinearGradient(x - tw, 0, x + tw, 0);
      head.addColorStop(0, "#22160c");
      head.addColorStop(1, "#5a3e24");
      ctx.fillStyle = head;
      ctx.beginPath(); ctx.ellipse(x, y - h + td * 0.16, tw * 0.86, td * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y - h + td * 0.16, tw * 0.86, td * 0.8, 0, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = "rgba(6,3,1,0.6)";
      ctx.lineWidth = 1.2;
      for (const fx of [-0.45, 0, 0.42]) { ctx.beginPath(); ctx.moveTo(x + tw * fx, y - h - td); ctx.lineTo(x + tw * fx, y - h + td); ctx.stroke(); }
      const sh = ctx.createLinearGradient(0, y - h - td, 0, y - h + td);
      sh.addColorStop(0, "rgba(0,0,0,0.7)");
      sh.addColorStop(0.5, "rgba(0,0,0,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(x - tw, y - h - td, tw * 2, td * 2);
      ctx.restore();
      ctx.strokeStyle = "rgba(180,196,232,0.35)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x, y - h, tw, td, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      // the bung, low on its belly
      ctx.fillStyle = "#140c07";
      ctx.beginPath(); ctx.ellipse(x + r * 0.3, y - h * 0.5 + dip(0.5) * 0.9, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5e442a";
      ctx.beginPath(); ctx.ellipse(x + r * 0.3 - 0.8, y - h * 0.5 + dip(0.5) * 0.9 - 0.8, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    };
    // A cask on its side, its head toward us and a little round to the right.
    const lying = (x, y, len = 150, r = 48) => {
      const body = ctx.createLinearGradient(0, y - r * 2, 0, y);
      body.addColorStop(0, "#6a4a2c");
      body.addColorStop(0.35, "#4a321c");
      body.addColorStop(1, "#0e0805");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x - len / 2, y - r * 0.3);
      ctx.quadraticCurveTo(x - len / 2, y - r * 2, x - len * 0.2, y - r * 2.06);
      ctx.lineTo(x + len * 0.3, y - r * 2.06);
      ctx.quadraticCurveTo(x + len / 2, y - r * 2, x + len / 2, y - r);
      ctx.quadraticCurveTo(x + len / 2, y, x + len * 0.3, y + r * 0.04);
      ctx.lineTo(x - len * 0.2, y + r * 0.04);
      ctx.quadraticCurveTo(x - len / 2, y, x - len / 2, y - r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "rgba(6,3,1,0.55)";
      ctx.lineWidth = 1.4;
      for (let i = 1; i < 7; i++) { ctx.beginPath(); ctx.moveTo(x - len / 2, y - r * 2 + (r * 2 * i) / 7); ctx.quadraticCurveTo(x, y - r * 2.08 + (r * 2.1 * i) / 7, x + len / 2, y - r * 2 + (r * 2 * i) / 7); ctx.stroke(); }
      for (const fx of [-0.34, -0.1, 0.16, 0.36]) {
        ctx.strokeStyle = "#101114";
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(x + len * fx, y - r * 2.1); ctx.quadraticCurveTo(x + len * fx + r * 0.26, y - r, x + len * fx, y + r * 0.1); ctx.stroke();
        ctx.strokeStyle = "rgba(150,164,190,0.3)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x + len * fx + 4, y - r * 2.1); ctx.quadraticCurveTo(x + len * fx + r * 0.26 + 4, y - r, x + len * fx + 4, y - r * 0.6); ctx.stroke();
      }
      ctx.restore();
      // its head, the boards across it, the rim
      const hx0 = x + len / 2 - r * 0.1;
      ctx.fillStyle = "#120b06";
      ctx.beginPath(); ctx.ellipse(hx0, y - r, r * 0.36, r * 1.0, 0, 0, Math.PI * 2); ctx.fill();
      const hg = ctx.createLinearGradient(0, y - r * 2, 0, y);
      hg.addColorStop(0, "#5a3e24");
      hg.addColorStop(1, "#22150b");
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.ellipse(hx0 + 1, y - r, r * 0.29, r * 0.86, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(6,3,1,0.6)";
      ctx.lineWidth = 1.2;
      for (const fy of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.moveTo(hx0 - r * 0.28, y - r + r * fy); ctx.lineTo(hx0 + r * 0.3, y - r + r * fy); ctx.stroke(); }
      ctx.strokeStyle = "rgba(180,196,232,0.3)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(hx0, y - r, r * 0.36, r * 1.0, 0, -1.3, 0.6); ctx.stroke();
    };
    stand(-1, END - 0.3, wall * 0.3, () => { shadow(110); barrel(-56, 0); barrel(52, 0, 160, 54); barrel(0, -150, 120, 42); });
    stand(-1, 2.92, 54, () => { shadow(70); barrel(0, 0, 156, 52); lying(96, 0, 130, 40); });
    stand(-1, 2.03, 56, () => { shadow(96); barrel(-10, 0, 164, 56); barrel(86, 0, 140, 48); });
  }
}

// the dark of a house asleep: the sconces and the moon down the stairs are all there is
function paintGloom(ctx, L) {
  const { W, H, u } = L;
  const step = Math.max(6, Math.round(10 * u));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const d = Math.hypot((x + step / 2 - L.vp.x) / (W * 0.62), (y + step / 2 - L.vp.y) / (H * 0.74));
      // upstairs the dark comes in closer
      const a = L.wing ? Math.min(0.92, 0.14 + Math.max(0, d - 0.2) * 1.35) : L.theme === "chemistry" ? Math.min(0.9, 0.1 + Math.max(0, d - 0.22) * 1.3) : L.worn ? Math.min(0.9, Math.max(0, d - 0.24) * 1.3) : Math.min(0.8, Math.max(0, d - 0.34) * 1.05);
      if (a <= 0.004) continue;
      ctx.fillStyle = `rgba(3,4,6,${a.toFixed(3)})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}
