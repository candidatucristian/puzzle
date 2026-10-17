import { TAP_WORD, tapPair } from "./puzzle.js";
import { paintMaps } from "./maps.js";
import { soft, grain, vignette, glowCanvas, rgb, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The cellar for TAPCODE, under the house: no window, and no light but what
 *  comes down the hatch and a candle on a stool. A brick wall, damp to the
 *  knee and furred with lime; joists overhead; a stone floor. On the left
 *  the iron ladder we came down by, the open trap above it and a little of
 *  the room's light falling through. A water pipe comes in on the right,
 *  runs along under the joists and turns down to the floor; one of its
 *  joints weeps, and there is a puddle under it. Barrels, a crate of empty
 *  bottles in straw, and against the wall a tub of old rolled charts, put
 *  away down here and forgotten (maps.js).
 *
 *  Let into the brick, in the candle's light, a smooth stone no bigger than
 *  it needs to be, and cut into it the message: six lines of tally marks,
 *  two clusters in each. On the right a bottle rack, five holes by five,
 *  empty.
 *
 *  Painted once per screen size: the cellar. The candle's flame, a glow, the
 *  drip and the damp air are live in the scene. */

const K = { room: "tc_room", flame: "tc_flame", glow: "tc_glow", fog: "tc_fog" };
export const CELLAR_MATERIALS_KEY = "tc_cellar_materials";
export const CELLAR_MATERIALS_URL = "assets/images/TapCode/cellar-background.png";
const WARM = "255,182,104";
const PALE = "150,170,214"; // what comes down the hatch
const BRICK_SURFACES = [[430, 205, 105, 35], [650, 252, 100, 34], [495, 390, 90, 35], [680, 440, 95, 32]];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutCellar(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u, S: Math.min(W, H) };
  L.floorY = H * 0.77;
  L.ceilY = H * 0.075;
  L.vp = { x: W * 0.5, y: H * 0.42 };
  // Keep the original room geometry and the space beside the square grid.
  const n = TAP_WORD.length;
  const gap = Math.min(W * 0.0085, 10.5);
  const clusterGap = gap * 3.4;
  const sw = 8 * gap + clusterGap + W * 0.05;
  const sh = H * 0.31;
  L.slab = { cx: W * 0.6, x0: W * 0.6 - sw / 2, y0: H * 0.27, w: sw, h: sh, gap, clusterGap, n };
  L.slab.lineH = sh / (n + 0.6);
  L.slab.markH = Math.min(L.slab.lineH * 0.42, 17);
  L.ladder = { x: W * 0.175, half: 31 * u };
  // the pipe: along under the joists from the right, down to the floor; the joint that weeps
  const py = L.ceilY + 46 * u, r = 11 * u;
  L.pipe = { y: py, r, turn: W * 0.4, leak: W * 0.47 };
  L.drip = { x: L.pipe.leak, y0: py + r * 1.5, y1: L.floorY + 20 * u };
  L.puddle = { x: L.pipe.leak + 8 * u, y: L.floorY + 26 * u, rx: 96 * u, ry: 17 * u };
  L.stool = { x: W * 0.72, s: u };
  L.candle = { x: L.stool.x, y: L.floorY - 104 * u, s: u };
  const rw = Math.min(W * 0.125, H * 0.24);
  L.maps = { x: W * 0.342, s: u * 1.05 };
  L.rack = { x0: W * 0.905 - rw, y0: L.floorY - rw - 14 * u, w: rw };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintCellar(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  // Sample only material surfaces from the photograph. Architecture, props
  // and the square lattice keep their original perspective and coordinates.
  const materials = t.exists(CELLAR_MATERIALS_KEY)
    ? t.get(CELLAR_MATERIALS_KEY).getSourceImage()
    : null;
  paintWall(ctx, L, materials);
  paintJoists(ctx, L);
  paintFloor(ctx, L, materials);
  paintHatch(ctx, L);
  paintPipe(ctx, L);
  paintSlab(ctx, L, materials);
  paintCarvedZ(ctx, L);
  paintRack(ctx, L);
  paintBarrel(ctx, L, W * 0.05, L.floorY + 16 * L.u, 92 * L.u, 128 * L.u);
  paintBarrel(ctx, L, W * 0.112, L.floorY + 4 * L.u, 80 * L.u, 112 * L.u);
  paintCrate(ctx, L);
  paintMaps(ctx, L);
  paintLadder(ctx, L);
  paintPuddle(ctx, L);
  paintStool(ctx, L);
  paintCarvingTools(ctx, L);
  paintCandleLight(ctx, L);
  paintDamp(ctx, L);
  vignette(ctx, W, H, 0.85);
  grain(ctx, W, H, 0.03);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.flame, paintFlame());
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.fog, paintFogBank());
  return { keys: K };
}

export function releaseCellarArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// These small crops contain only brick, stone or limestone grain, never
// furniture or a room view. The original painter supplies every outline.
function paintMaterial(ctx, photo, crop, x, y, w, h, opacity, brightness) {
  if (!photo) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(dimmed(photo, brightness), ...crop, x, y, w, h);
  ctx.restore();
}

// The photograph dimmed and greyed once for each brightness it is used at,
// and kept: a filter on every brick, hundreds of them, held the cellar dark
// for a second each time it was gone into.
const DIMMED = new WeakMap();
function dimmed(photo, brightness) {
  if (!DIMMED.has(photo)) DIMMED.set(photo, new Map());
  const cache = DIMMED.get(photo);
  if (!cache.has(brightness)) {
    const c = makeCanvas(photo.width, photo.height), g = c.getContext("2d");
    g.filter = `brightness(${brightness}) saturate(0.7)`;
    g.drawImage(photo, 0, 0);
    cache.set(brightness, c);
  }
  return cache.get(brightness);
}

// The wall: old brick in dark mortar, no two bricks one colour; lime come
// out of it in pale blooms, a patch of render still holding, and the damp
// risen from the floor to knee height, green at its edge.
function paintWall(ctx, L, materials) {
  const { W, H, u, floorY } = L;
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, W, floorY + 2);
  const rnd = lcg(2001);
  const rows = 17, bh = floorY / rows, bw = bh * 2.5, pad = Math.max(1, 1.5 * u);
  for (let r = 0; r < rows; r++) {
    const y = r * bh;
    for (let x = -((r % 2) * 0.5 + 0.1) * bw; x < W; x += bw) {
      const k = 0.7 + rnd() * 0.5, red = 0.7 + rnd() * 0.6;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, rgb(58 * k * red, 38 * k, 32 * k));
      g.addColorStop(1, rgb(38 * k * red, 26 * k, 23 * k));
      ctx.fillStyle = g;
      ctx.fillRect(x + pad, y + pad, bw - pad * 2, bh - pad * 2);
      const face = BRICK_SURFACES[((r * 7 + Math.round(x / bw)) % BRICK_SURFACES.length + BRICK_SURFACES.length) % BRICK_SURFACES.length];
      paintMaterial(ctx, materials, face, x + pad, y + pad, bw - pad * 2, bh - pad * 2, 0.72, 0.66);
      ctx.fillStyle = "rgba(255,220,200,0.04)";
      ctx.fillRect(x + pad, y + pad, bw - pad * 2, Math.max(1, bh * 0.06));
      // its face: pitted, a corner gone here and there
      for (let j = 0; j < 5; j++) {
        ctx.fillStyle = `rgba(0,0,0,${(0.15 + rnd() * 0.3).toFixed(2)})`;
        ctx.fillRect(x + pad + rnd() * (bw - pad * 2), y + pad + rnd() * (bh - pad * 2), (1 + rnd() * 3) * u, (1 + rnd() * 2) * u);
      }
      if (rnd() < 0.12) soft(ctx, x + bw * rnd(), y + bh * rnd(), bw * 0.3, bh * 0.5, "0,0,0", 0.5);
    }
  }
  // a patch of render that has not fallen yet
  ctx.save();
  ctx.beginPath();
  const rx = W * 0.27, ry = H * 0.2;
  for (let a = 0; a < Math.PI * 2; a += 0.35) {
    const q = 0.75 + rnd() * 0.5, x = rx + Math.cos(a) * W * 0.075 * q, y = ry + Math.sin(a) * H * 0.1 * q;
    if (a) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#2e2d2b";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 2 * u;
  ctx.stroke();
  ctx.restore();
  // lime, come out of the brick in blooms
  for (let i = 0; i < 26; i++) soft(ctx, W * rnd(), floorY * (0.1 + rnd() * 0.85), bw * (0.5 + rnd() * 1.6), bh * (0.5 + rnd() * 1.6), "200,198,186", 0.03 + rnd() * 0.06);
  // the damp: run down in streaks, and risen from the floor
  for (let i = 0; i < 12; i++) {
    const sx = W * rnd(), sl = floorY * (0.2 + rnd() * 0.5), sy = floorY * rnd() * 0.4;
    const g = ctx.createLinearGradient(0, sy, 0, sy + sl);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.3, "rgba(6,10,8,0.34)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, (8 + rnd() * 26) * u, sl);
  }
  const rise = ctx.createLinearGradient(0, floorY - H * 0.24, 0, floorY);
  rise.addColorStop(0, "rgba(6,12,9,0)");
  rise.addColorStop(0.25, "rgba(20,34,22,0.2)");
  rise.addColorStop(1, "rgba(3,6,5,0.66)");
  ctx.fillStyle = rise;
  ctx.fillRect(0, floorY - H * 0.24, W, H * 0.24);
  for (let i = 0; i < 30; i++) soft(ctx, W * rnd(), floorY - H * (0.14 + rnd() * 0.1), (20 + rnd() * 60) * u, (8 + rnd() * 18) * u, "40,70,40", 0.08);
  // the candle's warmth on it, to the right
  soft(ctx, L.candle.x, L.candle.y - H * 0.05, W * 0.36, H * 0.45, WARM, 0.2, "lighter");
}

// overhead: the floor of the room above, on its joists — their ends toward us
function paintJoists(ctx, L) {
  const { W, u, ceilY } = L;
  const rnd = lcg(77);
  ctx.fillStyle = "#070605";
  ctx.fillRect(0, 0, W, ceilY);
  const step = W / 13;
  for (let x = step * 0.3; x < W; x += step) {
    const jw = 30 * u;
    const g = ctx.createLinearGradient(x, 0, x + jw, 0);
    g.addColorStop(0, "#1c130c");
    g.addColorStop(0.5, "#33241a");
    g.addColorStop(1, "#120c07");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, jw, ceilY + 10 * u);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + rnd() * jw, 0, 1, ceilY + 10 * u);
  }
  // the dark under them
  const g = ctx.createLinearGradient(0, ceilY, 0, ceilY + 70 * u);
  g.addColorStop(0, "rgba(0,0,0,0.7)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, ceilY, W, 70 * u);
}

// The floor: big flagstones running toward us, dark, wet in the joints.
function paintFloor(ctx, L, materials) {
  const { W, H, u, floorY, vp } = L;
  const g = ctx.createLinearGradient(0, floorY, 0, H);
  g.addColorStop(0, "#131518");
  g.addColorStop(1, "#24262a");
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY, W, H - floorY);
  if (materials) {
    // Each stone is clipped to the original floor's vanishing point.
    const ys = [floorY, ...[0.18, 0.42, 0.72].map(f => floorY + (H - floorY) * f), H];
    const projectX = (x, y) => vp.x + (x - vp.x) * (y - vp.y) / (floorY - vp.y);
    for (let row = 0; row < ys.length - 1; row++) {
      const y0 = ys[row], y1 = ys[row + 1];
      for (let i = -10; i < 10; i++) {
        const xa = vp.x + i * W * 0.085, xb = xa + W * 0.085;
        const xs = [projectX(xa, y0), projectX(xb, y0), projectX(xb, y1), projectX(xa, y1)];
        if (Math.max(...xs) < 0 || Math.min(...xs) > W) continue;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(xs[0], y0); ctx.lineTo(xs[1], y0); ctx.lineTo(xs[2], y1); ctx.lineTo(xs[3], y1); ctx.closePath(); ctx.clip();
        paintMaterial(ctx, materials, [460 + ((i + 10 + row) % 3) * 74, 923, 150, 70], Math.min(...xs), y0, Math.max(...xs) - Math.min(...xs), y1 - y0, 0.65, 0.58);
        ctx.restore();
      }
    }
  }
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = Math.max(1, 1.4 * u);
  const k = (H - vp.y) / (floorY - vp.y);
  for (let i = -10; i <= 10; i++) {
    const xb = vp.x + i * W * 0.085;
    ctx.beginPath(); ctx.moveTo(xb, floorY); ctx.lineTo(vp.x + (xb - vp.x) * k, H); ctx.stroke();
  }
  for (const f of [0.18, 0.42, 0.72]) {
    const y = floorY + (H - floorY) * f;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = "rgba(190,205,235,0.04)";
    ctx.fillRect(0, y + 1.5, W, 1);
  }
  const rnd = lcg(404);
  for (let i = 0; i < 30; i++) soft(ctx, W * rnd(), floorY + (H - floorY) * rnd(), (30 + rnd() * 90) * u, (6 + rnd() * 14) * u, rnd() < 0.6 ? "0,0,0" : "120,130,140", 0.1);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, floorY - 1, W, Math.max(2, 3 * u));
}

// The hatch: the trap open in the ceiling over the ladder, a little of the
// room's light in it and falling down the wall and onto the floor.
function paintHatch(ctx, L) {
  const { H, u, ceilY, floorY } = L;
  const x = L.ladder.x, hw = 64 * u;
  // the opening between two joists, its edge
  ctx.fillStyle = "#3a465e";
  ctx.fillRect(x - hw, 0, hw * 2, ceilY + 8 * u);
  const up = ctx.createLinearGradient(0, 0, 0, ceilY + 8 * u);
  up.addColorStop(0, "rgba(190,204,236,0.5)");
  up.addColorStop(1, "rgba(60,72,100,0.1)");
  ctx.fillStyle = up;
  ctx.fillRect(x - hw, 0, hw * 2, ceilY + 8 * u);
  ctx.fillStyle = "#0c0906";
  ctx.fillRect(x - hw - 8 * u, 0, 8 * u, ceilY + 12 * u);
  ctx.fillRect(x + hw, 0, 8 * u, ceilY + 12 * u);
  ctx.fillRect(x - hw - 8 * u, ceilY + 6 * u, hw * 2 + 16 * u, 7 * u);
  // what falls through it
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const shaft = ctx.createLinearGradient(0, ceilY, 0, floorY);
  shaft.addColorStop(0, `rgba(${PALE},0.16)`);
  shaft.addColorStop(1, `rgba(${PALE},0.03)`);
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(x - hw, ceilY); ctx.lineTo(x + hw, ceilY); ctx.lineTo(x + hw * 2.1, floorY); ctx.lineTo(x - hw * 2.1, floorY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  soft(ctx, x, floorY + (H - floorY) * 0.26, hw * 2.6, (H - floorY) * 0.24, PALE, 0.14, "lighter");
}

// The ladder: two iron rails bolted to the wall and going up through the
// hatch, round rungs between them, all of it rusted; the light from above
// on the upper rungs.
function paintLadder(ctx, L) {
  const { u, floorY, ceilY } = L;
  const { x, half } = L.ladder;
  const top = -10, foot = floorY + 12 * u;
  soft(ctx, x + 8 * u, foot, half * 2.2, 7 * u, "0,0,0", 0.6);
  // the stays that hold it off the wall
  ctx.fillStyle = "#0c0c0e";
  for (const y of [ceilY + 60 * u, (ceilY + floorY) / 2, floorY - 60 * u]) {
    for (const s of [-1, 1]) ctx.fillRect(x + s * half - 5 * u, y, 10 * u, 6 * u);
  }
  const rungs = [];
  for (let y = foot - 34 * u; y > 0; y -= 44 * u) rungs.push(y);
  for (const y of rungs) {
    const lit = Math.max(0, 1 - (y - ceilY) / (floorY * 0.7));
    const g = ctx.createLinearGradient(0, y - 4 * u, 0, y + 4 * u);
    g.addColorStop(0, rgb(52 + 90 * lit, 50 + 96 * lit, 54 + 110 * lit));
    g.addColorStop(0.5, "#2a2422");
    g.addColorStop(1, "#0a0909");
    ctx.fillStyle = g;
    ctx.fillRect(x - half, y - 4 * u, half * 2, 8 * u);
  }
  for (const s of [-1, 1]) {
    const rx = x + s * half, rw = 9 * u;
    const g = ctx.createLinearGradient(rx - rw / 2, 0, rx + rw / 2, 0);
    g.addColorStop(0, "#4a4442");
    g.addColorStop(0.4, "#2c2624");
    g.addColorStop(1, "#0b0a0a");
    ctx.fillStyle = g;
    ctx.fillRect(rx - rw / 2, top, rw, foot - top);
    // the light from above down its upper length
    const lit = ctx.createLinearGradient(0, ceilY, 0, floorY * 0.6);
    lit.addColorStop(0, "rgba(190,204,236,0.5)");
    lit.addColorStop(1, "rgba(190,204,236,0)");
    ctx.fillStyle = lit;
    ctx.fillRect(rx - rw / 2, top, rw * 0.3, foot - top);
  }
  // rust, where the damp gets at it
  const rnd = lcg(515);
  for (let i = 0; i < 70; i++) {
    const s = rnd() < 0.5 ? -1 : 1, y = ceilY + rnd() * (foot - ceilY);
    ctx.fillStyle = `rgba(${Math.round(120 + rnd() * 50)},${Math.round(56 + rnd() * 24)},24,${(0.2 + rnd() * 0.4).toFixed(2)})`;
    ctx.fillRect(x + s * half - 4 * u + rnd() * 8 * u, y, (1 + rnd() * 3) * u, (2 + rnd() * 7) * u);
  }
}

// The pipe: cast iron, painted once; in from the right under the joists,
// a collar every so often and a strap to the wall, an elbow, and down to
// the floor with a stopcock on the way. One collar weeps: it is furred
// green and white, wet underneath, and the wall behind it is stained.
function paintPipe(ctx, L) {
  const { W, u, floorY } = L;
  const { y, r, turn, leak } = L.pipe;
  const rnd = lcg(909);
  // its shadow on the wall
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(turn, y + r * 0.9, W - turn, r * 1.3);
  ctx.fillRect(turn + r * 0.6, y, r * 1.6, floorY - y);
  // the stain behind the weeping collar, run down the wall
  const st = ctx.createLinearGradient(0, y, 0, y + floorY * 0.5);
  st.addColorStop(0, "rgba(40,66,44,0.5)");
  st.addColorStop(0.4, "rgba(120,74,30,0.22)");
  st.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = st;
  ctx.beginPath();
  ctx.moveTo(leak - 16 * u, y); ctx.lineTo(leak + 16 * u, y); ctx.lineTo(leak + 5 * u, y + floorY * 0.5); ctx.lineTo(leak - 7 * u, y + floorY * 0.5);
  ctx.closePath();
  ctx.fill();
  const along = ctx.createLinearGradient(0, y - r, 0, y + r);
  along.addColorStop(0, "#5c626a");
  along.addColorStop(0.3, "#444950");
  along.addColorStop(1, "#111214");
  const down = ctx.createLinearGradient(turn - r, 0, turn + r, 0);
  down.addColorStop(0, "#3a3e44");
  down.addColorStop(0.35, "#565b63");
  down.addColorStop(1, "#101113");
  ctx.fillStyle = down;
  ctx.fillRect(turn - r, y, r * 2, floorY - y + 4 * u);
  ctx.fillStyle = along;
  ctx.fillRect(turn, y - r, W - turn, r * 2);
  // the elbow
  ctx.fillStyle = "#3e4248";
  ctx.beginPath(); ctx.arc(turn, y, r * 1.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath(); ctx.arc(turn - r * 0.3, y - r * 0.4, r * 0.5, 0, Math.PI * 2); ctx.fill();
  // rust and old paint
  for (let i = 0; i < 160; i++) {
    const onRun = rnd() < 0.6;
    const px = onRun ? turn + rnd() * (W - turn) : turn - r + rnd() * r * 2, py = onRun ? y - r + rnd() * r * 2 : y + rnd() * (floorY - y);
    ctx.fillStyle = rnd() < 0.7 ? `rgba(${Math.round(110 + rnd() * 50)},${Math.round(50 + rnd() * 26)},22,${(0.15 + rnd() * 0.35).toFixed(2)})` : "rgba(0,0,0,0.3)";
    ctx.fillRect(px, py, (2 + rnd() * 7) * u, (1 + rnd() * 3) * u);
  }
  // collars and straps along the run
  const collar = (cx, wet) => {
    const g = ctx.createLinearGradient(0, y - r * 1.5, 0, y + r * 1.5);
    g.addColorStop(0, "#6a7078");
    g.addColorStop(0.35, "#474c54");
    g.addColorStop(1, "#0e0f11");
    ctx.fillStyle = g;
    ctx.fillRect(cx - 7 * u, y - r * 1.5, 14 * u, r * 3);
    ctx.fillStyle = "#17181b";
    for (const dy of [-0.95, 0, 0.95]) { ctx.beginPath(); ctx.arc(cx, y + dy * r, 2.4 * u, 0, Math.PI * 2); ctx.fill(); }
    if (!wet) return;
    // furred with lime and green, wet along its underside, a bead gathering
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rnd() < 0.5 ? `rgba(196,204,190,${(0.2 + rnd() * 0.4).toFixed(2)})` : `rgba(60,104,66,${(0.25 + rnd() * 0.4).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(cx + (rnd() - 0.5) * 22 * u, y + r * (0.2 + rnd() * 1.4), (1.5 + rnd() * 3.5) * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(190,214,240,0.5)";
    ctx.fillRect(cx - 16 * u, y + r * 0.82, 32 * u, 1.6 * u);
  };
  for (const cx of [leak, leak + W * 0.17, leak + W * 0.34]) collar(cx, cx === leak);
  ctx.fillStyle = "#0d0d0f";
  for (const cx of [leak + W * 0.085, leak + W * 0.255, leak + W * 0.43]) ctx.fillRect(cx - 3 * u, y - r * 2.4, 6 * u, r * 3.5);
  // the stopcock on the way down: a little red wheel
  const vy = y + (floorY - y) * 0.5;
  ctx.fillStyle = "#34383e";
  ctx.fillRect(turn - r * 1.5, vy - 9 * u, r * 3, 18 * u);
  ctx.strokeStyle = "#7a1e16";
  ctx.lineWidth = 4.4 * u;
  ctx.beginPath(); ctx.arc(turn, vy, 19 * u, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3 * u;
  for (let a = 0; a < Math.PI; a += Math.PI / 3) { ctx.beginPath(); ctx.moveTo(turn - Math.cos(a) * 19 * u, vy - Math.sin(a) * 19 * u); ctx.lineTo(turn + Math.cos(a) * 19 * u, vy + Math.sin(a) * 19 * u); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,160,140,0.3)";
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath(); ctx.arc(turn, vy, 20 * u, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
  ctx.fillStyle = "#1a1b1e";
  ctx.beginPath(); ctx.arc(turn, vy, 4.5 * u, 0, Math.PI * 2); ctx.fill();
}

// what the weeping collar has made on the floor: still water, the candle in it
function paintPuddle(ctx, L) {
  const p = L.puddle;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
  ctx.ellipse(p.x + p.rx * 0.6, p.y + p.ry * 0.5, p.rx * 0.5, p.ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(4,6,9,0.8)";
  ctx.fill();
  ctx.clip();
  soft(ctx, p.x + p.rx * 0.9, p.y, p.rx * 0.7, p.ry * 1.2, WARM, 0.3, "lighter");
  soft(ctx, p.x - p.rx * 0.5, p.y - p.ry * 0.3, p.rx * 0.5, p.ry * 0.6, PALE, 0.16, "lighter");
  ctx.restore();
  ctx.strokeStyle = "rgba(200,214,240,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
}

// The message stone: one block of grey limestone let into the brick in a
// bed of lime mortar — hand-cut, so none of its sides is quite straight;
// its corners knocked off, a crack run in from one of them, the damp come
// down its face. The candle is warm across it. Cut into it, the six lines
// of marks, each two clusters: the row, then the column.
function paintSlab(ctx, L, materials) {
  const { u } = L;
  const s = L.slab;
  const rnd = lcg(5115);
  // its outline: along each side in short runs, a little in and out, and
  // the corners cut across
  const pts = [];
  const corners = [[s.x0, s.y0], [s.x0 + s.w, s.y0], [s.x0 + s.w, s.y0 + s.h], [s.x0, s.y0 + s.h]];
  corners.forEach(([ax, ay], c) => {
    const [bx, by] = corners[(c + 1) % 4];
    const nx = (by - ay) / Math.hypot(bx - ax, by - ay), ny = -(bx - ax) / Math.hypot(bx - ax, by - ay);
    for (let i = 0; i <= 8; i++) {
      const t = 0.035 + (0.93 * i) / 8, j = (rnd() - 0.5) * 3.2 * u;
      pts.push({ x: ax + (bx - ax) * t + nx * j, y: ay + (by - ay) * t + ny * j });
    }
  });
  const trace = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
  // the bed it is set in: lime mortar, pale and crumbling, dark where the stone stands out of it
  trace();
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#6e6a5e";
  ctx.lineWidth = 11 * u;
  ctx.stroke();
  for (let i = 0; i < 120; i++) {
    const p = pts[Math.floor(rnd() * pts.length)];
    ctx.fillStyle = rnd() < 0.5 ? "rgba(20,18,14,0.5)" : "rgba(170,166,150,0.3)";
    ctx.fillRect(p.x + (rnd() - 0.5) * 12 * u, p.y + (rnd() - 0.5) * 12 * u, (1 + rnd() * 2.5) * u, (1 + rnd() * 2) * u);
  }
  ctx.save();
  ctx.translate(2.5 * u, 3.5 * u);
  trace();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  ctx.restore();
  // the stone
  const g = ctx.createLinearGradient(s.x0, s.y0, s.x0 + s.w, s.y0 + s.h);
  g.addColorStop(0, "#3c3f43");
  g.addColorStop(0.55, "#4c4b4a");
  g.addColorStop(1, "#63564a");
  trace();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  paintMaterial(ctx, materials, [830, 325, 175, 205], s.x0, s.y0, s.w, s.h, 0.6, 0.8);
  // its face: the grain of the stone, its beds, mottling, pits
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = rnd() < 0.55 ? `rgba(0,0,0,${(0.06 + rnd() * 0.16).toFixed(3)})` : `rgba(235,230,214,${(0.03 + rnd() * 0.08).toFixed(3)})`;
    ctx.fillRect(s.x0 + rnd() * s.w, s.y0 + rnd() * s.h, (0.6 + rnd() * 1.6) * u, (0.6 + rnd() * 1.2) * u);
  }
  for (let i = 0; i < 5; i++) {
    const y = s.y0 + s.h * (0.08 + rnd() * 0.84);
    ctx.strokeStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "230,224,206"},0.07)`;
    ctx.lineWidth = (1 + rnd() * 2.4) * u;
    ctx.beginPath();
    ctx.moveTo(s.x0, y);
    ctx.bezierCurveTo(s.x0 + s.w * 0.3, y + (rnd() - 0.5) * 16 * u, s.x0 + s.w * 0.7, y + (rnd() - 0.5) * 16 * u, s.x0 + s.w, y + (rnd() - 0.5) * 10 * u);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    soft(ctx, s.x0 + rnd() * s.w, s.y0 + rnd() * s.h, s.w * (0.08 + rnd() * 0.16), s.h * (0.05 + rnd() * 0.1), rnd() < 0.55 ? "0,0,0" : "220,215,200", 0.08);
  }
  for (let i = 0; i < 12; i++) {
    const px = s.x0 + rnd() * s.w, py = s.y0 + rnd() * s.h, pr = (1.2 + rnd() * 2.2) * u;
    ctx.fillStyle = "rgba(6,6,8,0.6)";
    ctx.beginPath(); ctx.ellipse(px, py, pr, pr * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,226,190,0.2)";
    ctx.beginPath(); ctx.ellipse(px + pr * 0.5, py + pr * 0.5, pr * 0.8, pr * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  // the damp, come down it from the top; a little green where it stays wet
  for (const [fx, wide, len] of [[0.16, 0.1, 0.5], [0.72, 0.07, 0.3]]) {
    soft(ctx, s.x0 + s.w * (fx + wide / 2), s.y0, s.w * wide * 0.9, s.h * len, "8,12,10", 0.34);
  }
  for (let i = 0; i < 8; i++) soft(ctx, s.x0 + s.w * (0.1 + rnd() * 0.2), s.y0 + s.h * rnd() * 0.3, (4 + rnd() * 9) * u, (3 + rnd() * 6) * u, "50,84,52", 0.14);
  // a crack, run in from the lower left corner
  let cx = s.x0 + 2 * u, cy = s.y0 + s.h - 4 * u;
  const crack = [[cx, cy]];
  for (let i = 0; i < 6; i++) { cx += (8 + rnd() * 14) * u; cy -= (3 + rnd() * 12) * u; crack.push([cx, cy]); }
  for (const [col, wide, off] of [["rgba(4,4,6,0.85)", 1.4, 0], ["rgba(255,226,190,0.2)", 0.7, 1.2]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(0.7, wide * u);
    ctx.beginPath();
    crack.forEach(([px, py], i) => (i ? ctx.lineTo(px + off * u, py + off * u) : ctx.moveTo(px + off * u, py + off * u)));
    ctx.stroke();
  }
  // its edges: the arris lit along the top, in its own shadow along the foot, and chipped
  const edge = ctx.createLinearGradient(0, s.y0, 0, s.y0 + 7 * u);
  edge.addColorStop(0, "rgba(226,230,240,0.22)");
  edge.addColorStop(1, "rgba(226,230,240,0)");
  ctx.fillStyle = edge;
  ctx.fillRect(s.x0, s.y0, s.w, 7 * u);
  const foot = ctx.createLinearGradient(0, s.y0 + s.h - 12 * u, 0, s.y0 + s.h);
  foot.addColorStop(0, "rgba(0,0,0,0)");
  foot.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = foot;
  ctx.fillRect(s.x0, s.y0 + s.h - 12 * u, s.w, 12 * u);
  for (const [fx, fy] of [[0.97, 0.03], [0.02, 0.4], [0.6, 0.985], [0.985, 0.72]]) soft(ctx, s.x0 + s.w * fx, s.y0 + s.h * fy, (7 + rnd() * 7) * u, (5 + rnd() * 5) * u, "8,8,10", 0.7);
  soft(ctx, s.x0 + s.w, s.y0 + s.h * 0.8, s.w * 0.9, s.h * 0.75, WARM, 0.22, "lighter");
  ctx.restore();
  paintSlabMarks(ctx, L);
}

// The marks, line by line, centred on the original message stone.
function paintSlabMarks(ctx, L) {
  const { u } = L;
  const s = L.slab;
  const top = s.y0 + s.lineH * 0.9;
  for (let i = 0; i < s.n; i++) {
    const pair = tapPair(TAP_WORD[i]);
    if (!pair) continue;
    const [row, col] = pair;
    const y = top + i * s.lineH;
    const mr = lcg(7000 + i * 53);
    const total = (row - 1) * s.gap + s.clusterGap + (col - 1) * s.gap;
    let x = s.cx - total / 2;
    for (let k = 0; k < row; k++) { carve(ctx, mr, x, y, s.markH, u); x += s.gap; }
    x += s.clusterGap - s.gap;
    for (let k = 0; k < col; k++) { carve(ctx, mr, x, y, s.markH, u); x += s.gap; }
  }
}

// A hand-cut Z just beyond the rack's last row: a deep groove with a broken
// lip, tiny pale chips, and fresh limestone dust falling onto the floor.
function paintCarvedZ(ctx, L) {
  const { u, rack } = L;
  const cell = rack.w / 5, z = cell * 0.36;
  const x = rack.x0 + 5.5 * cell, y = rack.y0 + 4.5 * cell;
  ctx.save();
  const points = [
    [x - z, y - z * 0.78], [x - z * 0.15, y - z * 0.8],
    [x + z, y - z * 0.76], [x + z * 0.55, y - z * 0.22],
    [x - z * 0.64, y + z * 0.68], [x + z * 0.95, y + z * 0.72],
  ];
  const stroke = (color, width, dx, dy) => {
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "square";
    ctx.lineJoin = "bevel";
    ctx.stroke();
  };
  stroke("rgba(0,0,0,0.82)", Math.max(3, z * 0.19), 1.8 * u, 2.2 * u);
  stroke("rgba(31,29,27,0.94)", Math.max(2.4, z * 0.14), 0, 0);
  stroke("rgba(224,213,190,0.72)", Math.max(0.9, z * 0.035), -1.3 * u, -1.5 * u);
  // Fresh flakes cling to the broken lower lip of the cut.
  const rnd = lcg(707);
  for (let i = 0; i < 18; i++) {
    const px = x + (rnd() - 0.5) * z * 2.2;
    const py = y + z * (0.82 + rnd() * 0.42);
    const r = (0.45 + rnd() * 1.1) * u;
    ctx.fillStyle = rnd() < 0.6 ? "rgba(211,203,185,0.7)" : "rgba(106,98,84,0.52)";
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.2, r * 0.65, rnd() * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function paintCarvingTools(ctx, L) {
  const { u, floorY, rack } = L;
  const cell = rack.w / 5;
  const x = rack.x0 + 5.5 * cell, y = floorY + 18 * u;
  const rnd = lcg(8117);
  soft(ctx, x - 3 * u, y, cell * 1.05, 6 * u, "178,164,135", 0.2);
  // A shallow scatter follows the wall down to the floor, with a few chips
  // among the fine powder. Its flattened shape lies on the existing floor.
  for (let i = 0; i < 145; i++) {
    const px = x + (rnd() + rnd() - 1) * cell * 1.35;
    const py = y + (rnd() - 0.5) * 12 * u;
    const r = (0.25 + rnd() * 1.35) * u;
    ctx.fillStyle = rnd() < 0.6 ? "rgba(191,181,158,0.6)" : "rgba(112,103,87,0.66)";
    ctx.beginPath(); ctx.moveTo(px - r, py); ctx.lineTo(px + r * 0.65, py - r * 0.45); ctx.lineTo(px + r, py + r * 0.5); ctx.closePath(); ctx.fill();
  }
  // One narrow steel masonry chisel, resting beside the dust.
  ctx.save();
  ctx.translate(x - 16 * u, y + 15 * u);
  ctx.rotate(0.16);
  ctx.scale(u, u);
  soft(ctx, 2, 4, 58, 5, "0,0,0", 0.7);
  const steel = ctx.createLinearGradient(0, -8, 0, 8);
  steel.addColorStop(0, "#3c4648"); steel.addColorStop(0.24, "#b4b7ab");
  steel.addColorStop(0.45, "#6e7876"); steel.addColorStop(0.72, "#384344"); steel.addColorStop(1, "#141b1d");
  ctx.fillStyle = steel;
  ctx.beginPath(); ctx.moveTo(-55, -8); ctx.lineTo(-34, -4); ctx.lineTo(46, -4);
  ctx.lineTo(48, -6); ctx.lineTo(53, -5); ctx.lineTo(54, 5); ctx.lineTo(48, 6);
  ctx.lineTo(45, 4); ctx.lineTo(-34, 4); ctx.lineTo(-55, 8); ctx.closePath(); ctx.fill();
  // The sharpened bevel and the long facets catch different light.
  ctx.fillStyle = "#959c93";
  ctx.beginPath(); ctx.moveTo(-55, -8); ctx.lineTo(-48, -6.8); ctx.lineTo(-48, 6.8); ctx.lineTo(-55, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(235,225,198,0.7)"; ctx.lineWidth = 0.75;
  ctx.beginPath(); ctx.moveTo(-55, -6.5); ctx.lineTo(-55, 6.3); ctx.moveTo(-33, -2.7); ctx.lineTo(45, -2.7); ctx.stroke();
  ctx.strokeStyle = "rgba(5,12,15,0.65)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-34, 2.5); ctx.lineTo(46, 2.5); ctx.stroke();
  for (let i = 0; i < 40; i++) {
    const px = -42 + rnd() * 88, py = -3 + rnd() * 6;
    ctx.strokeStyle = rnd() < 0.55 ? "rgba(227,219,191,0.2)" : "rgba(29,35,35,0.44)";
    ctx.lineWidth = 0.3 + rnd() * 0.35;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 2 + rnd() * 7, py + (rnd() - 0.5) * 0.6); ctx.stroke();
  }
  ctx.fillStyle = "#3b4342";
  ctx.beginPath(); ctx.ellipse(52, 0, 2.4, 5.4, -0.12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(194,194,175,0.42)"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.ellipse(52, -0.5, 1.8, 4.4, -0.12, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// one mark cut in the stone: a dark groove, its lip lit by the candle on the
// right, a little stone dust at its foot
function carve(ctx, rnd, x, y, h, u) {
  const lean = (rnd() - 0.5) * 1.8 * u;
  const a = { x: x - lean, y: y - h / 2 };
  const b = { x: x + lean, y: y + h / 2 };
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(10,10,14,0.92)";
  ctx.lineWidth = Math.max(1.6, 2.1 * u);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.strokeStyle = "rgba(255,214,160,0.5)";
  ctx.lineWidth = Math.max(0.7, 0.8 * u);
  ctx.beginPath(); ctx.moveTo(a.x + 1.3 * u, a.y + 1.6 * u); ctx.lineTo(b.x + 1.3 * u, b.y - 1 * u); ctx.stroke();
  ctx.lineCap = "butt";
  soft(ctx, b.x + 1 * u, b.y + 2.6 * u, 3.4 * u, 1.4 * u, "210,205,190", 0.25);
}

// The original square wooden lattice: five columns by five rows, open
// square cells, two feet, dust and the cobweb across its upper corner.
function paintRack(ctx, L) {
  const { u, floorY } = L;
  const { x0, y0, w } = L.rack;
  const cell = w / 5, bar = Math.max(3, 6 * u);
  soft(ctx, x0 + w / 2, floorY + 6 * u, w * 0.6, 9 * u, "0,0,0", 0.6);
  ctx.fillStyle = "#17100a";
  for (const fx of [0.08, 0.84]) ctx.fillRect(x0 + w * fx, y0 + w, w * 0.08, floorY - y0 - w + 4 * u);
  // the dark of its holes, a little of the brick's colour deep in each
  ctx.fillStyle = "#050404";
  ctx.fillRect(x0, y0, w, w);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) soft(ctx, x0 + (c + 0.5) * cell, y0 + (r + 0.62) * cell, cell * 0.4, cell * 0.3, "70,46,36", 0.16);
  // its bars
  const wood = (x, y, bw, bhh, upright) => {
    const g = upright ? ctx.createLinearGradient(x, 0, x + bw, 0) : ctx.createLinearGradient(0, y, 0, y + bhh);
    g.addColorStop(0, "#6a5236");
    g.addColorStop(0.5, "#4a3824");
    g.addColorStop(1, "#1c140c");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, bw, bhh);
  };
  for (let i = 0; i <= 5; i++) wood(x0 + i * cell - bar / 2, y0 - bar / 2, bar, w + bar, true);
  for (let i = 0; i <= 5; i++) wood(x0 - bar / 2, y0 + i * cell - bar / 2, w + bar, bar, false);
  // dust on every ledge, a cobweb in the top right hole
  ctx.fillStyle = "rgba(190,186,170,0.2)";
  for (let i = 1; i <= 5; i++) ctx.fillRect(x0, y0 + i * cell - bar / 2 - 1.4 * u, w, 1.4 * u);
  ctx.strokeStyle = "rgba(210,214,224,0.22)";
  ctx.lineWidth = 1;
  const wx = x0 + w - bar / 2, wy = y0 + bar / 2;
  for (let i = 0; i <= 3; i++) { const a = (i / 3) * (Math.PI / 2); ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - Math.cos(a) * cell * 0.9, wy + Math.sin(a) * cell * 0.9); ctx.stroke(); }
  for (const k of [0.4, 0.7]) { ctx.beginPath(); ctx.arc(wx, wy, cell * 0.9 * k, Math.PI / 2, Math.PI); ctx.stroke(); }
}

// a barrel standing on its end: staves, three iron hoops, the light from the hatch on it
function paintBarrel(ctx, L, x, base, w, h) {
  const { u } = L;
  soft(ctx, x + 6 * u, base, w * 0.6, 9 * u, "0,0,0", 0.65);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.4, base - h);
    ctx.lineTo(x + w * 0.4, base - h);
    ctx.quadraticCurveTo(x + w * 0.58, base - h / 2, x + w * 0.4, base);
    ctx.lineTo(x - w * 0.4, base);
    ctx.quadraticCurveTo(x - w * 0.58, base - h / 2, x - w * 0.4, base - h);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, "#150d07");
  g.addColorStop(0.3, "#3c2a1a");
  g.addColorStop(0.6, "#4a3622");
  g.addColorStop(1, "#0e0805");
  shape();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.115, base - h);
    ctx.quadraticCurveTo(x + i * w * 0.165, base - h / 2, x + i * w * 0.115, base);
    ctx.stroke();
  }
  for (const f of [0.1, 0.5, 0.9]) {
    const y = base - h * f, bulge = 1 - Math.pow(Math.abs(f - 0.5) * 2, 2) * 0.28;
    const ig = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    ig.addColorStop(0, "#08080a");
    ig.addColorStop(0.35, "#4a4e58");
    ig.addColorStop(1, "#070708");
    ctx.fillStyle = ig;
    ctx.fillRect(x - w * 0.56 * bulge, y - 5 * u, w * 1.12 * bulge, 10 * u);
  }
  ctx.restore();
  // its head, seen a little from above
  ctx.fillStyle = "#2a1c10";
  ctx.beginPath(); ctx.ellipse(x, base - h, w * 0.4, 7 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(190,204,236,0.2)";
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath(); ctx.ellipse(x, base - h, w * 0.4, 7 * u, 0, Math.PI, Math.PI * 2); ctx.stroke();
}

// a crate of empty bottles packed in straw
function paintCrate(ctx, L) {
  const { W, u, floorY } = L;
  const x = W * 0.258, base = floorY + 22 * u, w = 104 * u, h = 62 * u;
  soft(ctx, x + 6 * u, base, w * 0.62, 8 * u, "0,0,0", 0.6);
  // the bottles' necks and the straw, standing out of it
  const rnd = lcg(818);
  for (const dx of [-0.3, -0.06, 0.2, 0.36]) {
    const bx = x + dx * w, by = base - h;
    const g = ctx.createLinearGradient(bx - 7 * u, 0, bx + 7 * u, 0);
    g.addColorStop(0, "#0c1a12");
    g.addColorStop(0.4, "#2e4a34");
    g.addColorStop(1, "#060c08");
    ctx.fillStyle = g;
    ctx.fillRect(bx - 9 * u, by - 16 * u, 18 * u, 18 * u);
    ctx.fillRect(bx - 4 * u, by - 40 * u, 8 * u, 26 * u);
    ctx.fillStyle = "rgba(200,230,210,0.25)";
    ctx.fillRect(bx - 2.6 * u, by - 38 * u, 1.4 * u, 34 * u);
  }
  ctx.strokeStyle = "rgba(170,140,70,0.6)";
  ctx.lineWidth = 1.1 * u;
  for (let i = 0; i < 40; i++) {
    const sx = x + (rnd() - 0.5) * w * 0.9;
    ctx.beginPath(); ctx.moveTo(sx, base - h + 3 * u); ctx.lineTo(sx + (rnd() - 0.5) * 22 * u, base - h - (4 + rnd() * 16) * u); ctx.stroke();
  }
  // its slats
  for (let i = 0; i < 3; i++) {
    const y = base - h + i * (h / 3);
    const g = ctx.createLinearGradient(0, y, 0, y + h / 3);
    g.addColorStop(0, "#5a4226");
    g.addColorStop(1, "#2c1e10");
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y + 1.5 * u, w, h / 3 - 3 * u);
  }
  ctx.fillStyle = "#3e2c18";
  for (const s of [-1, 1]) ctx.fillRect(x + s * (w / 2 - 7 * u) - 6 * u, base - h, 12 * u, h);
  ctx.fillStyle = "#0a0a0c";
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + s * (w / 2 - 7 * u), base - h + (i + 0.5) * (h / 3), 1.8 * u, 0, Math.PI * 2); ctx.fill(); }
}

// a three-legged stool, the candle's saucer on it
function paintStool(ctx, L) {
  const { u, floorY } = L;
  const x = L.stool.x;
  const seat = floorY - 72 * u;
  soft(ctx, x + 6 * u, floorY + 2 * u, 46 * u, 8 * u, "0,0,0", 0.6);
  ctx.strokeStyle = "#4a2e18";
  ctx.lineWidth = 6 * u;
  ctx.lineCap = "round";
  for (const d of [-1, 0, 1]) {
    ctx.beginPath(); ctx.moveTo(x + d * 18 * u, seat + 4 * u); ctx.lineTo(x + d * 30 * u, floorY + (d === 0 ? 4 : -1) * u); ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = "#3a2010";
  ctx.beginPath(); ctx.ellipse(x, seat + 4 * u, 36 * u, 9 * u, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(x - 36 * u, 0, x + 36 * u, 0);
  g.addColorStop(0, "#6a4022");
  g.addColorStop(0.6, "#a06a3a");
  g.addColorStop(1, "#5a3418");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, seat, 36 * u, 9 * u, 0, 0, Math.PI * 2); ctx.fill();
  // the candle in its saucer, wax run down
  const cy = L.candle.y;
  ctx.fillStyle = "#8a6a2a";
  ctx.beginPath(); ctx.ellipse(x, seat - 2 * u, 15 * u, 4 * u, 0, 0, Math.PI * 2); ctx.fill();
  const cg = ctx.createLinearGradient(x - 7 * u, 0, x + 7 * u, 0);
  cg.addColorStop(0, "#d8c49a");
  cg.addColorStop(0.4, "#fff4d8");
  cg.addColorStop(1, "#b09870");
  ctx.fillStyle = cg;
  ctx.fillRect(x - 7 * u, cy, 14 * u, seat - 3 * u - cy);
  ctx.fillStyle = "#fff8e6";
  ctx.beginPath(); ctx.ellipse(x, cy, 7 * u, 2.2 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + 2 * u, cy, 3 * u, 14 * u, 1.5 * u); ctx.fill();
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + 0.5 * u, cy - 4 * u); ctx.stroke();
}

// the candle's light over everything near it
function paintCandleLight(ctx, L) {
  const { W, H, floorY } = L;
  const c = L.candle;
  soft(ctx, c.x, floorY + H * 0.06, W * 0.22, H * 0.09, WARM, 0.28, "lighter");
  soft(ctx, c.x, c.y, W * 0.12, H * 0.16, WARM, 0.18, "lighter");
}

// the candle's flame: white heart, gold, a touch of orange; origin at its foot
function paintFlame() {
  const w = 32, h = 72;
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

// The air down here: the whole cellar sunk in dark away from its two
// lights, and a damp haze lying low along the floor.
function paintDamp(ctx, L) {
  const { W, H, floorY } = L;
  ctx.fillStyle = "rgba(3,4,6,0.3)";
  ctx.fillRect(0, 0, W, H);
  const far = ctx.createLinearGradient(L.ladder.x + W * 0.1, 0, L.slab.x0, 0);
  far.addColorStop(0, "rgba(2,3,4,0)");
  far.addColorStop(0.5, "rgba(2,3,4,0.34)");
  far.addColorStop(1, "rgba(2,3,4,0)");
  ctx.fillStyle = far;
  ctx.fillRect(0, 0, W, H);
  const rnd = lcg(9090);
  for (let i = 0; i < 14; i++) {
    soft(ctx, W * rnd(), floorY + (H - floorY) * (rnd() * 0.8 - 0.2), W * (0.12 + rnd() * 0.18), H * (0.03 + rnd() * 0.05), "96,106,112", 0.05 + rnd() * 0.04);
  }
}

// a bank of the damp air, soft-edged, for the scene to drift across the floor
function paintFogBank() {
  const w = 512, h = 160;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const rnd = lcg(3131);
  for (let i = 0; i < 40; i++) {
    soft(g, w * (0.1 + rnd() * 0.8), h * (0.35 + rnd() * 0.35), w * (0.08 + rnd() * 0.14), h * (0.12 + rnd() * 0.18), "120,130,138", 0.14);
  }
  return c;
}
