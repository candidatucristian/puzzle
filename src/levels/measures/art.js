import { makeCanvas, addCanvasTexture, lcg, glowCanvas } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import { BOTTLES, FLASK_ML, MEASURES_WORD } from "./puzzle.js";
import SINK from "./measuresLevel.json";

/** Room VIII's sink counter, rendered (art/blender/room_weighing.py --view
 *  measures): the plate, the flask alone in clear glass, its shadow alone on
 *  the slate, and where it all fell (measuresLevel.json) — with the camera
 *  that saw it, for the bottles drawn live in three dimensions (stage3d.js)
 *  to be seen as the render sees them. Water stays separate from the glass so
 *  its surface remains level during a pour (see `interior`, `waterIn`). The
 *  blue strip burns to reveal the answer once the water reaches the flask's
 *  400 ml ring. */

export const KEYS = { room: "ms_room", glass: (i) => `ms_glass_${i}`, glow: "ms_glow", flame: "ms_flame" };
export const RENDER = {
  plate: `ms_sink_plate_v${SINK.version}`,
  flask: `ms_flask_v${SINK.version}`,
  shadow: `ms_flask_shadow_v${SINK.version}`,
};
const RES = 2;

export function loadSink(scene) {
  for (const [key, file] of [[RENDER.plate, "sink-plate"], [RENDER.flask, "flask"], [RENDER.shadow, "flask-shadow"]]) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Measures/${file}-v${SINK.version}.webp`);
  }
}

const boxOf = (points) => {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

export function layoutSink(W, H) {
  const f = fitRender(W, H, SINK), s = f.s, at = (p) => f.at(p);
  // the 500 ml bottle stands twenty centimetres at the row: everything the
  // scene measures in `u` is measured from that
  const u = (20 * SINK.scale * s) / 212;
  const L = { W, H, u, fit: f };
  L.counter = f.y + SINK.counter * s; // the slate's top, under the row
  // the camera that saw it, and where its whole picture lies on the screen
  L.camera = { ...SINK.camera, frame: { x: f.x, y: f.y, w: SINK.width * s, h: SINK.height * s } };
  const spout = at(SINK.tap.spout), tap = boxOf(SINK.tap.hit.map(at));
  L.tap = { x: spout.x, spout, hit: { x: tap.x, y: tap.y, w: tap.w, h: Math.max(tap.h, L.counter - tap.y) } };
  const sink = boxOf(SINK.sink.hit.map(at));
  L.sink = { x0: sink.x, x1: sink.x + sink.w, y: sink.y, drain: at(SINK.sink.drain), hitY: sink.y + sink.h / 2, hitH: Math.max(sink.h, 70 * u) };
  // nothing carried is lifted past the foot of the window, where the rain is
  L.sill = f.y + SINK.sill * s;
  L.rain = {
    panes: SINK.panes.map((pane) => pane.map(at)), cutouts: [],
    drop: Math.max(0.5, (W / 1920) * 0.85), fog: 0.5, reach: 24, beyond: 0.5,
    // the moon, over the trees; the lamp by the sink, warm, on the right
    lights: [
      { dir: [-0.1, -0.75, 0.65], colour: [0.14, 0.18, 0.25] },
      { dir: [0.75, -0.15, 0.65], colour: [0.26, 0.17, 0.08] },
    ],
    seed: 9902,
  };
  // the vessels: the two bottles (drawn in three dimensions to these
  // measures) and the flask (rendered), each about its middle
  const bottle = (cap, w, h, neckW, neckH) => ({ kind: "bottle", cap, w, h, neckW, neckH, top: -h / 2 - neckH, bottom: h / 2 });
  const F = SINK.flask, middle = at(F.at), shadow = F.shadow.box;
  const flask = {
    kind: "flask", cap: 0, x: middle.x, y: middle.y,
    r: F.r * s, neckW: F.neckW * s, top: F.top * s, bottom: F.bottom * s, ring: F.ring * s,
    poly: F.poly.map(([x, y]) => ({ x: x * s, y: y * s })),
    // the picture of it: its size, and where its middle is in it
    box: { w: F.box[2] * s, h: F.box[3] * s, ox: (F.at[0] - F.box[0]) * s, oy: (F.at[1] - F.box[1]) * s },
    shadow: { y: f.y + shadow[1] * s, w: shadow[2] * s, h: shadow[3] * s, ox: (F.at[0] - shadow[0]) / shadow[2] },
  };
  L.vessels = [
    { ...bottle(BOTTLES[0], 100 * u, 182 * u, 42 * u, 30 * u), x: f.x + SINK.bottles[0].x * s },
    { ...bottle(BOTTLES[1], 82 * u, 146 * u, 36 * u, 26 * u), x: f.x + SINK.bottles[1].x * s },
    flask,
  ];
  for (const v of L.vessels) {
    if (v.kind === "bottle") { v.y = L.counter - v.bottom; v.poly = interior(v); }
    v.area = area(v.poly);
  }
  // the flask holds, to its brim, whatever makes 400 ml stand at its ring
  flask.cap = FLASK_ML * flask.area / area(clip(flask.poly, { x: 0, y: 1 }, flask.ring));
  return L;
}

// a bottle's inside as a polygon about its middle (y down), its glass a little in
function interior(v) {
  const t = 2.2 * v.neckW / 26;
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

// ── painting ────────────────────────────────────────────────────────────────

export function paintSink(scene, L) {
  addCanvasTexture(scene.textures, KEYS.room, plate(scene, L));
  L.vessels.forEach((v, i) => { if (v.kind === "bottle") addCanvasTexture(scene.textures, KEYS.glass(i), paintGlass(L, v)); });
  addCanvasTexture(scene.textures, KEYS.glow, glowCanvas());
  addCanvasTexture(scene.textures, KEYS.flame, paintFlame());
}

export function releaseSink(textures) {
  for (const k of [KEYS.room, KEYS.glass(0), KEYS.glass(1), KEYS.glow, KEYS.flame]) if (textures.exists(k)) textures.remove(k);
}

/** A glass's picture on screen: its size and where its middle is in it. */
export function glassBox(v, u) {
  if (v.box) return v.box;
  const pad = 8 * u;
  const w = v.w + pad * 2, h = v.bottom - v.top + pad * 2;
  return { w, h, ox: w / 2, oy: -v.top + pad };
}

// the render laid over the screen, covering it, never stretched: what the
// scene shows, and what the bottles are seen through
function plate(scene, L) {
  const c = makeCanvas(L.W, L.H), g = c.getContext("2d"), f = L.fit;
  g.fillStyle = "#060607"; g.fillRect(0, 0, L.W, L.H);
  if (scene.textures.exists(RENDER.plate)) g.drawImage(scene.textures.get(RENDER.plate).getSourceImage(), f.x, f.y, SINK.width * f.s, SINK.height * f.s);
  return c;
}

// a bottle's glass, drawn, for when the bottles cannot be had in three
// dimensions: faint, its edges bright where they turn from us, a shine down
// one side, its capacity etched on it
function paintGlass(L, v) {
  const { u } = L, R = RES, box = glassBox(v, u);
  const c = makeCanvas(box.w * R, box.h * R), g = c.getContext("2d");
  g.scale(R, R); g.translate(box.ox, box.oy);
  const outline = () => {
    const hw = v.w / 2, nw = v.neckW / 2, sh = -v.h / 2 + v.w * 0.32;
    g.beginPath();
    g.moveTo(-nw, v.top); g.lineTo(-nw, -v.h / 2); g.quadraticCurveTo(-hw, -v.h / 2 + v.w * 0.06, -hw, sh);
    g.lineTo(-hw, v.h / 2 - 5 * u); g.quadraticCurveTo(-hw, v.h / 2, -hw + 5 * u, v.h / 2);
    g.lineTo(hw - 5 * u, v.h / 2); g.quadraticCurveTo(hw, v.h / 2, hw, v.h / 2 - 5 * u);
    g.lineTo(hw, sh); g.quadraticCurveTo(hw, -v.h / 2 + v.w * 0.06, nw, -v.h / 2); g.lineTo(nw, v.top);
  };
  outline(); g.closePath(); g.fillStyle = "rgba(190,215,220,0.07)"; g.fill();
  outline(); g.strokeStyle = "rgba(225,240,245,0.55)"; g.lineWidth = 1.4 * u; g.stroke();
  outline(); g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 0.5 * u; g.stroke();
  g.strokeStyle = "rgba(230,245,250,0.7)"; g.lineWidth = 1.2 * u;
  g.beginPath(); g.ellipse(0, v.top, v.neckW / 2 + 1.5 * u, 2.6 * u, 0, 0, Math.PI * 2); g.stroke();
  const shineH = v.h * 0.7, shineX = -v.w / 2 + 7 * u;
  g.fillStyle = "rgba(255,255,255,0.32)"; g.beginPath(); g.roundRect(shineX, -shineH / 2, 3 * u, shineH, 1.5 * u); g.fill();
  g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.roundRect(-shineX - 5 * u, -shineH / 2 + 10 * u, 2 * u, shineH * 0.7, 1 * u); g.fill();
  g.fillStyle = "rgba(235,240,240,0.7)"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `500 ${Math.round(13 * u)}px Georgia, serif`;
  g.fillText(`${v.cap} ml`, 0, -v.h / 2 + v.w * 0.42);
  return c;
}

/** A cobalt paper fuse: its blue coating burns from top to bottom, leaving
 *  the pale letters in charred fibres strictly behind the advancing ember. */
export function paintLitmus(L, turn, existing = null) {
  const { u } = L, f = L.vessels[2], R = RES;
  const w = Math.min(17 * u, f.neckW * 0.62), h = (f.ring - f.top) + 6 * u;
  const c = existing ?? makeCanvas(w * R, h * R), g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.scale(R, R);
  const blue = g.createLinearGradient(0, 0, w, 0);
  blue.addColorStop(0, "#1c324e"); blue.addColorStop(.38, "#41658d"); blue.addColorStop(1, "#223d63");
  g.fillStyle = blue; g.fillRect(0, 0, w, h);
  const rnd = lcg(812);
  for (let i = 0; i < 180; i++) {
    g.fillStyle = `rgba(180,204,225,${.025 + rnd() * .08})`;
    g.fillRect(rnd() * w, rnd() * h, .45 * u, (1 + rnd() * 4) * u);
  }
  if (turn > 0) {
    const edge = h * turn;
    g.save(); g.beginPath(); g.rect(0, 0, w, edge); g.clip();
    const ash = g.createLinearGradient(0, 0, w, 0);
    ash.addColorStop(0, "#191714"); ash.addColorStop(.5, "#3b342b"); ash.addColorStop(1, "#171616");
    g.fillStyle = ash; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) {
      g.fillStyle = `rgba(157,136,105,${.06 + rnd() * .15})`;
      g.fillRect(rnd() * w, rnd() * h, (.3 + rnd()) * u, (.5 + rnd() * 2) * u);
    }
    g.fillStyle = "#eee2c8"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `600 ${Math.round(w * .84)}px Georgia, serif`;
    const step = Math.min(w * 1.3, (h - 12 * u) / MEASURES_WORD.length);
    [...MEASURES_WORD].forEach((letter, i) => g.fillText(letter, w / 2, (h - step * 4) / 2 + (i + .5) * step));
    g.restore();
    if (turn < 1) {
      const ember = g.createLinearGradient(0, edge - 3 * u, 0, edge + 2 * u);
      ember.addColorStop(0, "rgba(151,42,9,0)"); ember.addColorStop(.6, "#f5ac4e"); ember.addColorStop(1, "rgba(83,23,7,0)");
      g.fillStyle = ember; g.fillRect(0, edge - 3 * u, w, 5 * u);
    }
  }
  return { canvas: c, w, h };
}

function paintFlame() {
  const c = makeCanvas(96, 192), g = c.getContext("2d");
  const flame = g.createLinearGradient(0, 10, 0, 188);
  flame.addColorStop(0, "rgba(224,78,9,0)");
  flame.addColorStop(.35, "rgba(242,109,20,.48)");
  flame.addColorStop(.75, "rgba(255,171,58,.92)");
  flame.addColorStop(1, "rgba(186,72,8,0)");
  g.fillStyle = flame;
  g.beginPath(); g.moveTo(45, 186);
  g.bezierCurveTo(0, 164, 19, 114, 36, 91);
  g.bezierCurveTo(52, 65, 53, 30, 44, 8);
  g.bezierCurveTo(85, 53, 67, 86, 74, 106);
  g.bezierCurveTo(101, 156, 78, 179, 45, 186); g.fill();
  const core = g.createLinearGradient(0, 95, 0, 184);
  core.addColorStop(0, "rgba(255,224,151,0)");
  core.addColorStop(.6, "#fff1ba"); core.addColorStop(1, "rgba(255,213,122,.3)");
  g.fillStyle = core;
  g.beginPath(); g.moveTo(46, 182); g.bezierCurveTo(23, 163, 43, 130, 51, 100);
  g.bezierCurveTo(66, 138, 76, 166, 46, 182); g.fill();
  return c;
}
