import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { gloom } from "../house/roomKit.js";

/** The top floor of the manor: not a passage but a round room under a dome,
 *  and of a piece with the halls below — the same drab striped paper over
 *  the same oak dado, the same oak doors — and as long shut up. We stand
 *  just inside it. Its wall goes round in front of us, and in it five doors,
 *  numbered XII to XVI, set round the curve — three to the left, two to the
 *  right — with sconces between them, of which two still have a candle
 *  alight. The paper has come away in places and the damp has run down from
 *  the cornice; there are cobwebs over the doors. In the middle of the wall,
 *  facing us, a tall arched window with the moon in it, and before the
 *  window the telescope on its tripod. The floor is bare boards laid in
 *  rings round a star let into them, dull now and dusty. Above the cornice
 *  the dome begins: plaster, stained and cracked, between dark ribs. At our
 *  right hand, the balustrade round the head of the stairs we came up by.
 *
 *  Measured in centimetres about the room's middle: a place on the wall is
 *  how far round it is (degrees; 0 straight ahead, negative to the left) and
 *  how high. The wall is painted flat, as if unrolled, and laid on the curve
 *  a sliver at a time.
 *
 *  Painted once per screen size: the room; a glow. */

const K = { room: "tp_room", glow: "tp_glow" };
const WARM = "255,190,120";
const MOON = "150,178,232";
const EYE = 150; // how high we look from
const R = 380; // the room's radius
const ZC = 330; // how far ahead of us its middle is
const WALL = 330; // the height of the wall, to the cornice
const SWEEP = 104; // how far round, either way, the wall is painted
const KX = 13, KY = 2; // the unrolled wall: pixels to a degree, to a centimetre
const DOOR = { half: 7.6, tall: 214 };
const WIN = { half: 12.5, sill: 96, spring: 236, top: 300 };
// the doors, left to right: how far round each is, and its number
const DOORS = [[-70, "XII"], [-47, "XIII"], [-25, "XIV"], [31, "XV"], [56, "XVI"]];
// the sconces: how far round each is, and whether its candle is still alight
const SCONCES = [[-58.5, false], [-36, true], [19, true], [43.5, false]];

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
  L.sconces = SCONCES.map(([deg, lit]) => ({ deg, dead: !lit, ...L.on(deg, 196, R - 14) }));
  // the telescope, before the window
  const foot = L.P(34, 0, ZC + R - 118), h = 172 * foot.s;
  L.scope = { x: foot.x, y: foot.y, h };
  L.thing = { level: "telescope", label: "Look through the telescope", box: { x: foot.x - h * 0.5, y: foot.y - h * 1.04, width: h * 0.86, height: h * 1.06 } };
  const a = L.on(-WIN.half, WIN.top), b = L.on(WIN.half, WIN.sill);
  L.win = { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintRotunda(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#04060b";
  ctx.fillRect(0, 0, W, H);
  paintDome(ctx, L);
  paintFloor(ctx, L);
  paintWall(ctx, L);
  paintMoonlight(ctx, L);
  paintTelescope(ctx, L.scope.x, L.scope.y, L.scope.h);
  paintStairhead(ctx, L);
  // the dark, lifted by the window and by each candle
  const w = L.win;
  gloom(ctx, L, [
    { x: w.x + w.width / 2, y: w.y + w.height * 0.5, rx: w.width * 2.6, ry: w.height * 1.5, k: 0.95 },
    { x: w.x + w.width / 2, y: H * 0.84, rx: W * 0.6, ry: H * 0.36, k: 0.9 },
    { x: W * 0.86, y: H * 0.72, rx: W * 0.2, ry: H * 0.3, k: 0.6 },
    ...L.sconces.filter((s) => !s.dead).map((s) => ({ x: s.x, y: s.y, rx: 230 * s.s, ry: 230 * s.s, k: 0.9 })),
    // what of the moon and the candles reaches the doors at the sides
    { x: W * 0.1, y: H * 0.5, rx: W * 0.22, ry: H * 0.5, k: 0.5 },
    { x: W * 0.84, y: H * 0.45, rx: W * 0.2, ry: H * 0.45, k: 0.5 },
  ]);
  vignette(ctx, W, H, 0.7);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K };
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

// the dome: plaster, grey in the moon, stained and cracked, between dark ribs
function paintDome(ctx, L) {
  const rnd = lcg(808);
  const at = (deg, lift) => { const k = (lift * Math.PI) / 180; return L.on(deg, WALL + 200 * Math.sin(k), R * Math.cos(k)); };
  for (let lift = 0; lift < 70; lift += 5) {
    const pts = [];
    for (let d = -SWEEP; d <= SWEEP; d += 4) pts.push(at(d, lift));
    for (let d = SWEEP; d >= -SWEEP; d -= 4) pts.push(at(d, lift + 5));
    const v = lift / 70;
    fill(ctx, pts, `rgb(${Math.round(30 - v * 12)},${Math.round(30 - v * 12)},${Math.round(34 - v * 12)})`);
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
  // the ribs: dark oak, a little light along each
  for (let d = -90; d <= 90; d += 22.5) {
    for (const [w, col] of [[6, "#160e09"], [1.2, "rgba(170,186,220,0.16)"]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, w * L.u);
      ctx.beginPath();
      for (let lift = 0; lift <= 70; lift += 5) { const p = at(d, lift); if (lift) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
  }
}

// The floor: bare boards laid in rings about the middle of the room, and
// there a star of sixteen points let into them in two woods — gone dull,
// and the dust lying on it.
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
  g.addColorStop(0, "#221810");
  g.addColorStop(1, "#40301f");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // the rings of boards
  for (let r = R; r > 60; r -= 32) {
    for (let d = -180; d < 180; d += 9) {
      const pts = [L.on(d, 0, r), L.on(d + 9, 0, r), L.on(d + 9, 0, r - 32), L.on(d, 0, r - 32)];
      if (pts.some((p) => !(p.s > 0) || p.s > 40)) continue; // behind us
      const k = rnd();
      fill(ctx, pts, k < 0.5 ? `rgba(0,0,0,${(k * 0.28).toFixed(3)})` : `rgba(255,206,160,${((k - 0.5) * 0.07).toFixed(3)})`);
      ctx.strokeStyle = "rgba(5,3,1,0.6)";
      ctx.lineWidth = Math.max(0.6, L.u);
      ctx.stroke();
    }
  }
  // the star in the middle
  for (let i = 0; i < 16; i++) {
    const d = i * 22.5, tip = i % 2 ? 150 : 96;
    const pts = [L.on(d, 0, tip), L.on(d + 11, 0, 44), L.on(0, 0, 0), L.on(d - 11, 0, 44)];
    fill(ctx, pts, i % 2 ? "#75634a" : "#1c120b");
    fill(ctx, [pts[0], pts[1], pts[2]], "rgba(0,0,0,0.22)");
  }
  ctx.strokeStyle = "rgba(12,7,4,0.7)";
  ctx.lineWidth = Math.max(1, 1.6 * L.u);
  for (const r of [164, 176]) {
    ctx.beginPath();
    for (let d = -180; d <= 180; d += 6) { const p = L.on(d, 0, r); if (d === -180) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
  // the dust on it, thicker toward the wall
  for (let i = 0; i < 26; i++) {
    const p = L.on(rnd() * 360 - 180, 0, 120 + rnd() * 250);
    if (!(p.s > 0) || p.s > 6) continue;
    soft(ctx, p.x, p.y, (70 + rnd() * 90) * p.s, (22 + rnd() * 30) * p.s, "150,146,136", 0.05 + rnd() * 0.06);
  }
  ctx.restore();
}

// The wall, unrolled: the house's paper over its oak dado — the paper come
// away in places, the damp run down it — the cornice, the doors each in its
// architrave with its number carved in its top rail, the sconces, and the
// window with the night in it.
function wallFlat() {
  const fw = SWEEP * 2 * KX, fh = WALL * KY;
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  const rnd = lcg(515);
  const X = (deg) => (deg + SWEEP) * KX, Y = (y) => (WALL - y) * KY;
  const box = (d0, y0, d1, y1, style) => { g.fillStyle = style; g.fillRect(X(d0), Y(y1), (d1 - d0) * KX, (y1 - y0) * KY); };
  // the paper: drab, faintly striped, gone brown with the years
  const paper = g.createLinearGradient(0, 0, 0, fh);
  paper.addColorStop(0, "#231d17");
  paper.addColorStop(1, "#2b241c");
  g.fillStyle = paper;
  g.fillRect(0, 0, fw, fh);
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
  for (const [deg, y, r] of [[-81, 256, 5], [-36, 270, 3.4], [43.5, 264, 4.4], [72, 250, 4]]) {
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
  box(-SWEEP, 300, SWEEP, 303, "#2e1e12");
  box(-SWEEP, 316, SWEEP, 317, "rgba(255,206,160,0.08)");
  // the dado: oak panels under a rail
  const dado = g.createLinearGradient(0, Y(98), 0, Y(0));
  dado.addColorStop(0, "#2a1a10");
  dado.addColorStop(1, "#120a06");
  box(-SWEEP, 0, SWEEP, 98, dado);
  for (let d = -SWEEP + 1; d < SWEEP; d += 9) {
    g.strokeStyle = "rgba(4,2,1,0.75)";
    g.lineWidth = 2;
    g.strokeRect(X(d + 1), Y(86), 7 * KX, 68 * KY);
    g.strokeStyle = "rgba(255,206,160,0.07)";
    g.strokeRect(X(d + 1) + 2, Y(86) + 2, 7 * KX, 68 * KY);
  }
  box(-SWEEP, 96, SWEEP, 102, "#3e2616");
  box(-SWEEP, 101, SWEEP, 102, "rgba(255,206,160,0.08)");
  box(-SWEEP, 0, SWEEP, 9, "#0c0704");
  // ── the window: tall, round-headed, the night in it
  const wx0 = X(-WIN.half), wx1 = X(WIN.half), wm = (wx0 + wx1) / 2, wr = (wx1 - wx0) / 2;
  const opening = (inset = 0) => {
    g.beginPath();
    g.moveTo(wx0 + inset, Y(WIN.sill));
    g.lineTo(wx0 + inset, Y(WIN.spring));
    g.ellipse(wm, Y(WIN.spring), wr - inset, (WIN.top - WIN.spring) * KY - inset, 0, Math.PI, 0);
    g.lineTo(wx1 - inset, Y(WIN.sill));
    g.closePath();
  };
  opening(-9 * KY);
  g.fillStyle = "#24160c";
  g.fill();
  opening();
  g.save();
  g.clip();
  const sky = g.createLinearGradient(0, Y(WIN.top), 0, Y(WIN.sill));
  sky.addColorStop(0, "#03060e");
  sky.addColorStop(0.6, "#0c1834");
  sky.addColorStop(1, "#1d2d52");
  g.fillStyle = sky;
  g.fillRect(wx0, Y(WIN.top), wx1 - wx0, (WIN.top - WIN.sill) * KY);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(220,230,255,${(0.2 + rnd() * 0.6).toFixed(2)})`;
    g.beginPath(); g.arc(wx0 + rnd() * (wx1 - wx0), Y(WIN.sill + 30 + rnd() * (WIN.top - WIN.sill - 30)), 0.8 + rnd() * 1.3, 0, Math.PI * 2); g.fill();
  }
  const mx = wm + wr * 0.34, my = Y(238), mr = 20;
  soft(g, mx, my, mr * 4.4, mr * 4.4, "200,214,250", 0.4, "lighter");
  const body = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  body.addColorStop(0, "#fbf8ec");
  body.addColorStop(0.75, "#e2dccb");
  body.addColorStop(1, "#b8b29f");
  g.fillStyle = body;
  g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
  // the land, low and dark
  g.fillStyle = "#0a1122";
  g.beginPath();
  g.moveTo(wx0, Y(WIN.sill));
  for (let i = 0; i <= 12; i++) g.lineTo(wx0 + ((wx1 - wx0) * i) / 12, Y(WIN.sill + 20 + 7 * Math.sin(i * 1.3) + 3 * Math.sin(i * 3.1)));
  g.lineTo(wx1, Y(WIN.sill));
  g.closePath();
  g.fill();
  // its bars
  g.fillStyle = "#1a110b";
  g.fillRect(wm - 3, Y(WIN.top), 6, (WIN.top - WIN.sill) * KY);
  for (const y of [146, 196, WIN.spring]) g.fillRect(wx0, Y(y) - 2.5, wx1 - wx0, 5);
  g.fillStyle = "rgba(170,190,236,0.35)";
  g.fillRect(wm + 3, Y(WIN.top), 1.4, (WIN.top - WIN.sill) * KY);
  for (const y of [146, 196, WIN.spring]) g.fillRect(wx0, Y(y) + 2.5, wx1 - wx0, 1.2);
  // the dust on the glass, and a crack across one pane
  g.fillStyle = "rgba(170,176,190,0.07)";
  g.fillRect(wx0, Y(WIN.top), wx1 - wx0, (WIN.top - WIN.sill) * KY);
  g.strokeStyle = "rgba(210,220,240,0.4)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(wx0 + 6, Y(176)); g.lineTo(wx0 + wr * 0.4, Y(166)); g.lineTo(wx0 + wr * 0.56, Y(150));
  g.moveTo(wx0 + wr * 0.4, Y(166)); g.lineTo(wx0 + wr * 0.7, Y(172));
  g.stroke();
  g.restore();
  box(-WIN.half - 2.2, WIN.sill - 5, WIN.half + 2.2, WIN.sill + 1, "#2c1b10");
  box(-WIN.half - 2.2, WIN.sill, WIN.half + 2.2, WIN.sill + 1, "rgba(170,190,236,0.35)");
  // ── the doors
  for (const [deg, number] of DOORS) {
    const x0 = X(deg - DOOR.half), w = DOOR.half * 2 * KX, y0 = Y(DOOR.tall), h = DOOR.tall * KY;
    // the architrave, a keyblock over it
    g.fillStyle = "#2c1b10";
    g.fillRect(x0 - 18, y0 - 22, w + 36, h + 22);
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
    // its number: carved in the top rail, the cuts filled with old ivory paint
    g.font = '700 46px Georgia, "Times New Roman", serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    const ty = y0 + h * 0.07;
    g.fillStyle = "rgba(255,214,170,0.25)";
    g.fillText(number, x0 + w / 2 + 1.6, ty + 1.8);
    g.fillStyle = "#070403";
    g.fillText(number, x0 + w / 2, ty);
    g.fillStyle = "rgba(170,156,124,0.8)";
    g.fillText(number, x0 + w / 2 + 0.8, ty + 1);
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
  web(X(-70 - DOOR.half) - 18, Y(DOOR.tall) - 22, 70, 1);
  web(X(-25 + DOOR.half) + 18, Y(DOOR.tall) - 22, 56, -1);
  web(X(56 - DOOR.half) - 18, Y(DOOR.tall) - 22, 64, 1);
  web(wx0 + 4, Y(WIN.spring) + 4, 60, 1);
  return flat;
}

function paintWall(ctx, L) {
  const flat = wallFlat();
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

// the moon through the window: its light round the window, and long across the floor
function paintMoonlight(ctx, L) {
  const w = L.win;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  soft(ctx, w.x + w.width / 2, w.y + w.height / 2, w.width * 1.9, w.height * 0.9, MOON, 0.2, "lighter");
  ctx.filter = `blur(${Math.round(7 * L.u)}px)`;
  for (const [d0, d1] of [[-WIN.half + 1, -1], [1, WIN.half - 1]]) {
    for (const [r0, r1, a] of [[R - 6, R - 150, 0.3], [R - 160, R - 330, 0.2], [R - 340, R - 520, 0.1]]) {
      const pts = [L.on(d0, 0, r0), L.on(d1, 0, r0), L.on(d1 * (r1 > 0 ? 1.5 : -3), 0, Math.abs(r1) || 1), L.on(d0 * (r1 > 0 ? 1.5 : -3), 0, Math.abs(r1) || 1)];
      if (r1 <= 0) { pts[2] = L.P(d1 * 9, 0, ZC + r1); pts[3] = L.P(d0 * 9, 0, ZC + r1); }
      fill(ctx, pts, `rgba(${MOON},${a})`);
    }
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

// the head of the stairs, at our right hand: a balustrade going round the well
function paintStairhead(ctx, L) {
  const at = (a, y) => L.P(236 + 112 * Math.cos(a), y, 262 + 112 * Math.sin(a));
  const posts = [];
  for (let a = Math.PI * 0.62; a <= Math.PI * 1.5; a += 0.2) posts.push(a);
  for (const a of posts) {
    const foot = at(a, 0), top = at(a, 92);
    ctx.strokeStyle = "#3a2414";
    ctx.lineWidth = Math.max(2, 5 * foot.s);
    ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    ctx.strokeStyle = "rgba(255,206,160,0.3)";
    ctx.lineWidth = Math.max(0.8, 1.4 * foot.s);
    ctx.beginPath(); ctx.moveTo(foot.x - 1.6 * foot.s, foot.y); ctx.lineTo(top.x - 1.6 * foot.s, top.y); ctx.stroke();
  }
  // the handrail, the light along the top of it
  for (const [w, col, dy] of [[9, "#4a2e1a", 0], [2.4, "rgba(255,214,170,0.4)", -3]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.4, w * at(posts[0], 96).s);
    ctx.beginPath();
    posts.forEach((a, i) => { const p = at(a, 96); if (i) ctx.lineTo(p.x, p.y + dy * p.s); else ctx.moveTo(p.x, p.y + dy * p.s); });
    ctx.stroke();
  }
  // the newel where it begins
  const n0 = at(posts[0], 0), n1 = at(posts[0], 112);
  ctx.strokeStyle = "#4a2e1a";
  ctx.lineWidth = Math.max(4, 13 * n0.s);
  ctx.beginPath(); ctx.moveTo(n0.x, n0.y); ctx.lineTo(n1.x, n1.y); ctx.stroke();
  ctx.fillStyle = "#6a4426";
  ctx.beginPath(); ctx.arc(n1.x, n1.y - 6 * n0.s, 9 * n0.s, 0, Math.PI * 2); ctx.fill();
}
