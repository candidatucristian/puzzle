import { soft, grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { BOTTLES, FLASK_ML, MEASURES_WORD } from "./puzzle.js";

/** The laboratory sink for MEASURES, painted: white tiles gone grey, a
 *  fireclay sink let into a slate counter, a brass swan-neck tap over it;
 *  on the slate two plain glass bottles — 500 ml and 300 ml etched on their
 *  shoulders, nothing else — and a volumetric flask with one ring round its
 *  neck, 400 ml on its bulb, a strip of blue litmus hung in it.
 *
 *  The vessels are painted as glass alone, about their middles; the scene
 *  pours the water in them (see `interior`, `waterIn`). */

export const KEYS = { room: "ms_room", glass: (i) => `ms_glass_${i}` };
const RES = 2;

export function layoutSink(W, H) {
  const u = Math.min(W / 1000, H / 620);
  const L = { W, H, u };
  L.counter = H * 0.68; // the slate's top
  L.front = H * 0.9;
  L.sink = { x0: W * 0.07, x1: W * 0.33, y: L.counter + 8 * u };
  L.tap = { x: W * 0.2, spout: { x: W * 0.2 + 2 * u, y: L.counter - 170 * u } };
  // the vessels: the two bottles and the flask, each its shape in local
  // centimetres-as-pixels about its middle, and where it stands
  const bottle = (cap, w, h, neckW, neckH) => ({ kind: "bottle", cap, w, h, neckW, neckH, top: -h / 2 - neckH, bottom: h / 2 });
  L.vessels = [
    { ...bottle(BOTTLES[0], 76 * u, 182 * u, 28 * u, 30 * u), x: W * 0.47 },
    { ...bottle(BOTTLES[1], 64 * u, 146 * u, 24 * u, 26 * u), x: W * 0.6 },
    { kind: "flask", cap: 0, r: 58 * u, neckW: 22 * u, neckH: 142 * u, x: W * 0.79 },
  ];
  for (const v of L.vessels) {
    if (v.kind === "flask") { v.top = -v.r - v.neckH; v.bottom = v.r; }
    v.y = L.counter - v.bottom; // standing on the slate
    v.poly = interior(v);
    v.area = area(v.poly);
  }
  // the flask: its bulb holds 380 ml, as a real one is made, so that 400
  // stands up its neck — and there, the ring
  const f = L.vessels[2], ri = f.r - 2.2 * f.neckW / 26;
  f.cap = f.area / ((Math.PI * ri * ri) / 380);
  f.ring = surface(f, FLASK_ML / f.cap);
  return L;
}

// a vessel's inside as a polygon about its middle (y down), its glass a little in
function interior(v) {
  const t = 2.2 * v.neckW / 26;
  if (v.kind === "flask") {
    // down the right of the neck, round the bulb, up the left of the neck
    const nw = v.neckW / 2 - t, R = v.r - t, a0 = Math.asin(nw / R);
    const pts = [{ x: nw, y: v.top + t }];
    for (let k = 0; k <= 40; k++) {
      const a = -Math.PI / 2 + a0 + (k / 40) * (Math.PI * 2 - a0 * 2);
      pts.push({ x: Math.cos(a) * R, y: Math.sin(a) * R });
    }
    pts.push({ x: -nw, y: v.top + t });
    return pts;
  }
  const hw = v.w / 2 - t, nw = v.neckW / 2 - t, sh = -v.h / 2 + v.w * 0.32;
  return [
    { x: nw, y: v.top + t }, { x: nw, y: -v.h / 2 }, { x: hw, y: sh }, { x: hw, y: v.h / 2 - t - 4 },
    { x: hw - 4, y: v.h / 2 - t }, { x: -hw + 4, y: v.h / 2 - t }, { x: -hw, y: v.h / 2 - t - 4 },
    { x: -hw, y: sh }, { x: -nw, y: -v.h / 2 }, { x: -nw, y: v.top + t },
  ];
}

export function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p.x * q.y - q.x * p.y; }
  return Math.abs(a) / 2;
}

// the part of a polygon on the low side of a line: points p with p·n ≥ c
function clip(poly, n, c) {
  const out = [], inside = (p) => p.x * n.x + p.y * n.y >= c;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], pi = inside(p), qi = inside(q);
    if (pi) out.push(p);
    if (pi !== qi) {
      const dp = p.x * n.x + p.y * n.y - c, dq = q.x * n.x + q.y * n.y - c, t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

/** The water in a vessel turned through `angle`, `frac` of it full: the
 *  polygon (in the vessel's own frame) of what lies under a level surface,
 *  of just the area that much water takes — and the surface's two ends. */
export function waterIn(v, frac, angle) {
  if (frac <= 0.0005) return null;
  // "down" in the room, seen in the vessel's own frame
  const n = { x: Math.sin(angle), y: Math.cos(angle) };
  const proj = v.poly.map((p) => p.x * n.x + p.y * n.y);
  let lo = Math.min(...proj), hi = Math.max(...proj);
  const goal = v.area * Math.min(1, frac);
  for (let k = 0; k < 28; k++) {
    const mid = (lo + hi) / 2;
    if (area(clip(v.poly, n, mid)) > goal) lo = mid; else hi = mid;
  }
  const c = (lo + hi) / 2, poly = clip(v.poly, n, c);
  // the surface: the edge of the clipped polygon that lies on the line
  const on = poly.filter((p) => Math.abs(p.x * n.x + p.y * n.y - c) < 0.01);
  return { poly, surface: on.length >= 2 ? [on[0], on[on.length - 1]] : null };
}

// where the surface stands, upright, `frac` full (its height in the frame)
function surface(v, frac) {
  const w = waterIn(v, frac, 0);
  return w?.surface ? w.surface[0].y : v.bottom;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintSink(scene, L) {
  addCanvasTexture(scene.textures, KEYS.room, paintRoom(L));
  L.vessels.forEach((v, i) => addCanvasTexture(scene.textures, KEYS.glass(i), paintGlass(L, v)));
}

export function releaseSink(textures) {
  for (const k of [KEYS.room, KEYS.glass(0), KEYS.glass(1), KEYS.glass(2)]) if (textures.exists(k)) textures.remove(k);
}

/** A glass texture's size on screen and where its middle is in it. */
export function glassBox(v, u) {
  const pad = 8 * u;
  const w = (v.kind === "flask" ? v.r * 2 : v.w) + pad * 2, h = v.bottom - v.top + pad * 2;
  return { w, h, ox: w / 2, oy: -v.top + pad };
}

function paintRoom(L) {
  const { W, H, u, counter, front } = L;
  const c = makeCanvas(W, H), g = c.getContext("2d");
  const rnd = lcg(4404);
  // the wall above, dark; the tiles behind the counter: white once, small,
  // their grout gone grey, the light of the lamp on them
  g.fillStyle = "#101312"; g.fillRect(0, 0, W, counter);
  const tileTop = counter - 300 * u, ts = 30 * u;
  g.fillStyle = "#3a3c38"; g.fillRect(0, tileTop, W, counter - tileTop);
  for (let y = tileTop, r = 0; y < counter; y += ts, r++) {
    for (let x = (r % 2) * 0 - ts * 0.1; x < W; x += ts) {
      const k = 0.8 + rnd() * 0.12;
      g.fillStyle = `rgb(${Math.round(150 * k)},${Math.round(152 * k)},${Math.round(144 * k)})`;
      g.fillRect(x + 1.2 * u, y + 1.2 * u, ts - 2.4 * u, ts - 2.4 * u);
      g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 1.2 * u, y + 1.2 * u, ts - 2.4 * u, 1.4 * u);
    }
  }
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, tileTop, W, 3 * u);
  // the dark of the room over all of it; the lamp's light from above, middle-left
  const dark = g.createLinearGradient(0, 0, 0, counter);
  dark.addColorStop(0, "rgba(0,0,0,0.9)"); dark.addColorStop(0.5, "rgba(0,0,0,0.62)"); dark.addColorStop(1, "rgba(0,0,0,0.42)");
  g.fillStyle = dark; g.fillRect(0, 0, W, counter);
  soft(g, W * 0.48, counter - 120 * u, W * 0.5, 220 * u, "255,214,170", 0.18, "lighter");
  for (let i = 0; i < 30; i++) soft(g, rnd() * W, tileTop + rnd() * (counter - tileTop), 20 + rnd() * 50, 10 + rnd() * 30, "60,50,30", 0.05);
  // the slate counter
  const slate = g.createLinearGradient(0, counter, 0, front);
  slate.addColorStop(0, "#202628"); slate.addColorStop(1, "#151a1c");
  g.fillStyle = slate; g.fillRect(0, counter, W, front - counter);
  soft(g, W * 0.6, counter + 30 * u, W * 0.4, 50 * u, "255,214,170", 0.1, "lighter");
  g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0, counter, W, 2 * u);
  g.fillStyle = "#2e3538"; g.fillRect(0, front, W, 8 * u);
  g.fillStyle = "rgba(220,235,240,0.16)"; g.fillRect(0, front, W, 1.2 * u);
  g.fillStyle = "#0a0806"; g.fillRect(0, front + 8 * u, W, H - front);
  // the sink let into it: the fireclay rim, the deep white bowl, the drain
  const s = L.sink, sw = s.x1 - s.x0, sy = counter + 6 * u, sh = (front - counter) * 0.66;
  g.fillStyle = "#c9c6bc"; g.beginPath(); g.roundRect(s.x0, sy, sw, sh, 6 * u); g.fill();
  const bowl = g.createLinearGradient(0, sy, 0, sy + sh);
  bowl.addColorStop(0, "#565652"); bowl.addColorStop(0.4, "#8e8c84"); bowl.addColorStop(1, "#b8b5ac");
  g.fillStyle = bowl; g.beginPath(); g.roundRect(s.x0 + 9 * u, sy + 7 * u, sw - 18 * u, sh - 13 * u, 4 * u); g.fill();
  g.fillStyle = "#2a2a28"; g.beginPath(); g.ellipse(s.x0 + sw / 2, sy + sh * 0.62, 11 * u, 4 * u, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#9a9a94"; g.lineWidth = 1.4 * u; g.stroke();
  g.fillStyle = "rgba(120,140,150,0.25)"; g.beginPath(); g.ellipse(s.x0 + sw * 0.45, sy + sh * 0.7, sw * 0.24, 6 * u, 0, 0, Math.PI * 2); g.fill();
  // the tap: a brass pillar out of the slate behind the sink, its swan neck over it
  const tx = L.tap.x, base = counter - 2 * u, sp = L.tap.spout;
  const brass = (x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, "#3a2808"); gr.addColorStop(0.45, "#e2c27a"); gr.addColorStop(1, "#5a4012"); return gr; };
  g.fillStyle = brass(tx - 26 * u, tx - 12 * u); g.fillRect(tx - 26 * u, base - 90 * u, 14 * u, 90 * u);
  g.strokeStyle = "#c9a457"; g.lineWidth = 9 * u; g.lineCap = "round";
  g.beginPath(); g.moveTo(tx - 19 * u, base - 86 * u); g.bezierCurveTo(tx - 19 * u, base - 210 * u, sp.x, base - 220 * u, sp.x, sp.y + 4 * u); g.stroke();
  g.strokeStyle = "rgba(255,240,200,0.5)"; g.lineWidth = 2 * u;
  g.beginPath(); g.moveTo(tx - 22 * u, base - 86 * u); g.bezierCurveTo(tx - 22 * u, base - 206 * u, sp.x - 3 * u, base - 214 * u, sp.x - 3 * u, sp.y); g.stroke();
  g.lineCap = "butt";
  g.fillStyle = "#3a2808"; g.fillRect(sp.x - 5 * u, sp.y, 10 * u, 6 * u);
  // its cross handle
  g.fillStyle = brass(tx - 40 * u, tx + 2 * u); g.fillRect(tx - 40 * u, base - 72 * u, 42 * u, 6 * u);
  g.beginPath(); g.arc(tx - 19 * u, base - 69 * u, 6 * u, 0, Math.PI * 2); g.fill();
  soft(g, tx - 19 * u, base, 30 * u, 6 * u, "0,0,0", 0.6);
  // the vessels' shadows on the slate
  for (const v of L.vessels) soft(g, v.x + 8 * u, counter + 2 * u, (v.kind === "flask" ? v.r : v.w / 2) * 1.2, 7 * u, "0,0,0", 0.6);
  vignette(g, W, H, 0.7);
  grain(g, W, H, 0.025);
  return c;
}

// the glass alone: faint, its edges bright where they turn from us, a
// shine down one side, what is etched on it
function paintGlass(L, v) {
  const { u } = L, R = RES, box = glassBox(v, u);
  const c = makeCanvas(box.w * R, box.h * R), g = c.getContext("2d");
  g.scale(R, R); g.translate(box.ox, box.oy);
  const outline = () => {
    g.beginPath();
    if (v.kind === "flask") {
      const nw = v.neckW / 2, a0 = Math.asin(nw / v.r);
      g.moveTo(-nw, v.top); g.lineTo(-nw, -v.r * Math.cos(a0));
      g.arc(0, 0, v.r, -Math.PI / 2 - a0, -Math.PI / 2 + a0, true);
      g.lineTo(nw, v.top);
    } else {
      const hw = v.w / 2, nw = v.neckW / 2, sh = -v.h / 2 + v.w * 0.32;
      g.moveTo(-nw, v.top); g.lineTo(-nw, -v.h / 2); g.quadraticCurveTo(-hw, -v.h / 2 + v.w * 0.06, -hw, sh);
      g.lineTo(-hw, v.h / 2 - 5 * u); g.quadraticCurveTo(-hw, v.h / 2, -hw + 5 * u, v.h / 2);
      g.lineTo(hw - 5 * u, v.h / 2); g.quadraticCurveTo(hw, v.h / 2, hw, v.h / 2 - 5 * u);
      g.lineTo(hw, sh); g.quadraticCurveTo(hw, -v.h / 2 + v.w * 0.06, nw, -v.h / 2); g.lineTo(nw, v.top);
    }
  };
  outline(); g.closePath(); g.fillStyle = "rgba(190,215,220,0.07)"; g.fill();
  // the edges, brighter at the sides where the glass turns away
  outline(); g.strokeStyle = "rgba(225,240,245,0.55)"; g.lineWidth = 1.4 * u; g.stroke();
  outline(); g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 0.5 * u; g.stroke();
  // the rim of the mouth, seen a little from above
  g.strokeStyle = "rgba(230,245,250,0.7)"; g.lineWidth = 1.2 * u;
  g.beginPath(); g.ellipse(0, v.top, v.neckW / 2 + 1.5 * u, 2.6 * u, 0, 0, Math.PI * 2); g.stroke();
  // a shine down the left, a fainter one right
  const shineH = v.kind === "flask" ? v.r * 1.2 : v.h * 0.7, shineX = v.kind === "flask" ? -v.r * 0.6 : -v.w / 2 + 7 * u;
  g.fillStyle = "rgba(255,255,255,0.32)"; g.beginPath(); g.roundRect(shineX, -shineH / 2, 3 * u, shineH, 1.5 * u); g.fill();
  g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.roundRect(-shineX - 5 * u, -shineH / 2 + 10 * u, 2 * u, shineH * 0.7, 1 * u); g.fill();
  // what is etched on it: white, frosted
  g.fillStyle = "rgba(235,240,240,0.7)"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `500 ${Math.round(11 * u)}px Georgia, serif`;
  if (v.kind === "flask") {
    g.fillText(`${FLASK_ML} ml`, 0, v.r * 0.28);
    g.font = `${Math.round(7 * u)}px Georgia, serif`; g.fillText("20 °C", 0, v.r * 0.5);
    // the one ring round its neck
    g.strokeStyle = "rgba(240,245,245,0.85)"; g.lineWidth = 1.1 * u;
    g.beginPath(); g.ellipse(0, v.ring, v.neckW / 2, 2.4 * u, 0, 0, Math.PI * 2); g.stroke();
  } else {
    g.fillText(`${v.cap} ml`, 0, -v.h / 2 + v.w * 0.42);
  }
  return c;
}

/** The litmus strip hung in the flask's neck, blue, or turned red with
 *  the word showing on it, paler (`turn` from 0 to 1). */
export function paintLitmus(L, turn) {
  const { u } = L, f = L.vessels[2], R = RES;
  const w = 8 * u, h = (f.ring - f.top) + 6 * u;
  const c = makeCanvas(w * R, h * R), g = c.getContext("2d");
  g.scale(R, R);
  const mix = (a, b) => a.map((x, i) => Math.round(x + (b[i] - x) * turn));
  const col = mix([86, 110, 176], [190, 48, 62]);
  g.fillStyle = `rgb(${col.join(",")})`; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(0, 0, w * 0.3, h);
  if (turn > 0) {
    g.save(); g.globalAlpha = turn * 0.85;
    g.fillStyle = "rgba(255,226,220,0.9)"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${Math.round(w * 0.82)}px Georgia, serif`;
    const letters = MEASURES_WORD.split(""), step = Math.min(w * 1.05, (h - 10 * u) / letters.length);
    letters.forEach((ch, i) => g.fillText(ch, w / 2, h - 6 * u - (letters.length - 1 - i) * step - step / 2));
    g.restore();
  }
  return { canvas: c, w, h };
}
