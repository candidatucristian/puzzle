// A correct answer, as a piece of cinema (2026-11-14: "vreau să se strângă
// toate într-o formă șerpuită și după aia să se lovească în inputul de cod,
// să vibreze puțin ecranul").
//
//   gather   sparks rise off the things the puzzle was worked with and wheel
//            into a vortex over them, each with its trail of light;
//   serpent  the vortex unwinds into one winding ribbon, a bright head and a
//            fading tail, that flies, gathering speed, to the case file;
//   strike   the head hits the case file: it flares gold and jumps, a shock
//            ring and a spray of sparks go out from it, the screen shakes;
//            the rest of the ribbon pours in after it (the answer filed);
//   out      the light dies away, and the player goes back to the room.
//
// (Into the code box at first; into the case file since the user asked, the
// same day, slower and with a bigger shake.)
//
// Drawn on one canvas laid over the page (it must cross from the picture to
// the case file over it), in added light; nothing under it is moved but the play
// area's one shake (transform). With motion reduced: only the box's glow.
import { chime, noiseBurst } from "../shared/paint.js";

const N = 220;                 // sparks
const GATHER = 950;            // the vortex, before the ribbon leaves it
const STREAM = 780;            // from the head leaving to the tail leaving
const TRAVEL = 900;            // each spark's flight along the ribbon
const HIT = GATHER + TRAVEL;   // the head reaches the case file
export const SOLVE_STRIKE_MS = GATHER + STREAM + TRAVEL + 650;

const ease = {
  in: (t) => t * t * t,
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// a soft spark of warm light, drawn once
let spark = null;
function sparkSprite() {
  if (spark) return spark;
  const s = 64, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d"), r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, "rgba(255,252,240,1)");
  r.addColorStop(0.18, "rgba(255,226,160,0.85)");
  r.addColorStop(0.45, "rgba(255,180,80,0.28)");
  r.addColorStop(1, "rgba(255,150,40,0)");
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  return (spark = c);
}

// the things the puzzle was worked with, on the page: its interactive objects
function sources(scene, rect, k) {
  const W = scene.cameras.main.width, H = scene.cameras.main.height, found = [];
  for (const o of scene.children.list) {
    if (!o.input?.enabled || typeof o.getBounds !== "function" || !o.visible) continue;
    let b;
    try { b = o.getBounds(); } catch { continue; }
    const area = b.width * b.height;
    if (area < 120 || area > W * H * 0.35 || b.centerX < 0 || b.centerX > W || b.centerY < 0 || b.centerY > H) continue;
    found.push({ x: rect.left + b.centerX * k, y: rect.top + b.centerY * k, r: Math.max(14, Math.min(Math.hypot(b.width, b.height) / 2, 160)) * k });
  }
  found.sort((a, b) => Math.hypot(a.x - rect.left - rect.width / 2, a.y - rect.top - rect.height / 2) - Math.hypot(b.x - rect.left - rect.width / 2, b.y - rect.top - rect.height / 2));
  return found.length ? found.slice(0, 4) : [{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: Math.min(rect.width, rect.height) * 0.15 }];
}

// a point along the ribbon's winding way from the vortex down to the box:
// a cubic curve swung out to one side and back, with a slither over it that
// dies away as it nears the box
function along(path, t, lane) {
  const { a, b, c, d, side, wave } = path, u = 1 - t;
  const x = u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x;
  const y = u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y;
  const dx = 3 * u * u * (b.x - a.x) + 6 * u * t * (c.x - b.x) + 3 * t * t * (d.x - c.x);
  const dy = 3 * u * u * (b.y - a.y) + 6 * u * t * (c.y - b.y) + 3 * t * t * (d.y - c.y);
  const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const slither = Math.sin(t * Math.PI * 3.2 + side) * wave * (1 - t) ** 1.4 + lane * (1 - t) ** 2;
  return { x: x + nx * slither, y: y + ny * slither };
}

function sounds(scene) {
  return {
    whoosh: () => noiseBurst(scene, { dur: 0.75, type: "bandpass", freq: 700, q: 0.7, gain: 0.16, env: (k) => Math.sin(Math.PI * k) ** 1.6 * (0.6 + 0.4 * k) }),
    strike: () => {
      noiseBurst(scene, { dur: 0.32, type: "lowpass", freq: 260, q: 0.9, gain: 0.5, env: (k) => (1 - k) ** 2.4 });
      chime(scene, [[1318.5, 0.05], [1975.5, 0.035], [2637, 0.02]], 1.1);
    },
  };
}

/** Plays the solve from `scene`'s things into the code box; returns how long it takes. */
export function playSolveStrike(scene, { reducedMotion = false } = {}) {
  const box = document.getElementById("btn-casefile") || document.querySelector("#input-area .input-wrapper");
  const gameCanvas = scene?.game?.canvas;
  if (!box || !gameCanvas || !scene?.sys?.isActive?.()) return 0;
  const target = box.getBoundingClientRect();
  const strike = () => {
    box.classList.remove("is-struck", "is-receiving"); void box.offsetWidth;
    box.classList.add("is-struck", "is-receiving");
    setTimeout(() => box.classList.remove("is-struck", "is-receiving"), 1600);
  };
  if (reducedMotion || !gameCanvas.getBoundingClientRect) { strike(); return 900; }

  const rect = gameCanvas.getBoundingClientRect(), k = rect.width / (scene.cameras.main.width || rect.width);
  const from = sources(scene, rect, k);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const layer = document.createElement("canvas");
  layer.className = "solve-strike";
  layer.width = Math.round(innerWidth * dpr); layer.height = Math.round(innerHeight * dpr);
  document.body.append(layer);
  const g = layer.getContext("2d");
  g.scale(dpr, dpr);
  const sprite = sparkSprite();

  // the vortex: over the things, a little above their middle
  const cx = from.reduce((s, p) => s + p.x, 0) / from.length;
  const cy = Math.min(...from.map((p) => p.y)) - Math.min(70, rect.height * 0.08);
  const vortex = { x: cx, y: Math.max(rect.top + 40, cy) };
  const hit = { x: target.left + target.width * 0.5, y: target.top + target.height * 0.5 };
  const dx = hit.x - vortex.x, dy = hit.y - vortex.y, span = Math.hypot(dx, dy) || 1;
  const nx = -dy / span, ny = dx / span, swing = Math.min(260, span * 0.55);
  const path = {
    a: vortex,
    b: { x: vortex.x + dx * 0.15 + nx * swing, y: vortex.y + dy * 0.15 + ny * swing },
    c: { x: vortex.x + dx * 0.72 - nx * swing * 0.85, y: vortex.y + dy * 0.72 - ny * swing * 0.85 },
    d: hit, side: Math.random() * 6.28, wave: Math.min(70, span * 0.12),
  };

  const sparks = Array.from({ length: N }, (_, i) => {
    const src = from[i % from.length], a = Math.random() * 6.283, d = Math.random() * src.r;
    return {
      sx: src.x + Math.cos(a) * d, sy: src.y + Math.sin(a) * d,
      born: Math.random() * 220,
      turn: (Math.random() < 0.5 ? -1 : 1) * (2.6 + Math.random() * 1.8),
      leave: GATHER + (i / N) * STREAM,
      lane: (Math.random() - 0.5) * 34 * (0.35 + 0.65 * Math.random()),
      size: (i < 8 ? 3 - i * 0.2 : 0.8 + Math.random() * 1.1),
      trail: [],
      landed: false,
    };
  });
  const burst = [];
  const dim = document.createElement("div");
  dim.className = "solve-dim";
  // dark all round, the code box kept in its own pool of light
  dim.style.background = `radial-gradient(ellipse ${Math.round(Math.max(110, target.width * 1.6))}px ${Math.round(Math.max(90, target.height * 2.2))}px at ${Math.round(hit.x)}px ${Math.round(hit.y)}px, rgba(6,5,3,0) 0%, rgba(6,5,3,0) 40%, rgba(6,5,3,0.86) 100%)`;
  document.body.append(dim);
  // (each step its own easing, the whole linear, so the dark holds to the very strike)
  const dimFor = HIT + 820;
  dim.animate?.([
    { opacity: 0, easing: "ease-out" },
    { opacity: 0.8, offset: 420 / dimFor, easing: "linear" },
    { opacity: 0.8, offset: (HIT - 20) / dimFor, easing: "ease-out" },
    { opacity: 0.22, offset: (HIT + 110) / dimFor, easing: "ease-in-out" },
    { opacity: 0 },
  ], { duration: dimFor, easing: "linear", fill: "forwards" });
  const sfx = sounds(scene);
  const shake = () => {
    const area = document.getElementById("play-area");
    if (!area?.animate) return;
    const frames = [];
    for (let i = 0; i <= 28; i++) {
      const f = (1 - i / 28) ** 1.35, q = i / 28;
      const x = i === 28 ? 0 : (Math.sin(i * 2.9 + 0.7) * 22 + (Math.random() - 0.5) * 9) * f;
      const y = i === 28 ? 0 : (Math.cos(i * 3.7) * 16 + (Math.random() - 0.5) * 7) * f;
      const sc = 1 + 0.024 * (1 - q) ** 3;
      frames.push({ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`, offset: q });
    }
    area.animate(frames, { duration: 950, easing: "linear" });
  };

  let start = null, raf = 0, struck = false, whooshed = false, done = false;
  const finish = () => {
    if (done) return;
    done = true; cancelAnimationFrame(raf); layer.remove(); dim.remove();
    scene.events?.off?.("shutdown", finish);
  };
  scene.events?.once?.("shutdown", () => setTimeout(finish, 1200));

  const frame = (now) => {
    if (start === null) start = now;
    const t = now - start;
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalCompositeOperation = "lighter";

    if (!whooshed && t > GATHER - 80) { whooshed = true; sfx.whoosh(); }
    if (!struck && t >= HIT) {
      struck = true; strike(); shake(); sfx.strike();
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.2 + Math.random() * 0.7;
        burst.push({ x: hit.x, y: hit.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.9, life: 380 + Math.random() * 420, age: 0 });
      }
    }

    // the vortex's warm heart, while it holds its sparks
    const held = clamp(t / GATHER) * (1 - clamp((t - GATHER) / STREAM));
    if (held > 0) {
      const hr = 40 + 70 * held;
      g.globalAlpha = 0.5 * held;
      g.drawImage(sprite, vortex.x - hr * 1.4, vortex.y - hr, hr * 2.8, hr * 2);
      g.globalAlpha = 1;
    }

    // the sparks: wheeling in the vortex, then down the ribbon
    for (const s of sparks) {
      if (t < s.born) continue;
      let x, y, glow = 1;
      if (t < s.leave) {
        // up off their thing and round into the vortex, the wheel drawing in
        const q = clamp((t - s.born) / (s.leave - s.born));
        const e = ease.out(clamp(q * 1.4));
        const a0 = Math.atan2(s.sy - vortex.y, s.sx - vortex.x), d0 = Math.hypot(s.sx - vortex.x, s.sy - vortex.y);
        const a = a0 + s.turn * q * 2.4, d = d0 * (1 - e) + (22 + Math.abs(s.lane) * 1.6) * e;
        x = vortex.x + Math.cos(a) * d; y = vortex.y + Math.sin(a) * d * 0.62;
        glow = 0.35 + 0.65 * clamp(q * 2);
      } else {
        const q = clamp((t - s.leave) / TRAVEL);
        if (q >= 1) {
          if (!s.landed) { s.landed = true; if (struck && Math.random() < 0.3) burst.push({ x: hit.x + (Math.random() - 0.5) * target.width * 0.5, y: hit.y, vx: (Math.random() - 0.5) * 0.5, vy: -0.2 - Math.random() * 0.3, life: 260, age: 0 }); }
          s.trail.length = 0;
          continue;
        }
        ({ x, y } = along(path, ease.in(q), s.lane));
        glow = 1;
      }
      s.trail.push(x, y);
      if (s.trail.length > 20) s.trail.splice(0, 2);
      // embers shed off the ribbon as it dives
      if (t >= s.leave && Math.random() < 0.035) burst.push({ x, y, vx: (Math.random() - 0.5) * 0.12, vy: 0.02 + Math.random() * 0.06, life: 420 + Math.random() * 380, age: 0, small: true });
      // its trail, thinning behind it
      const tr = s.trail;
      for (let j = 2; j < tr.length; j += 2) {
        const f = j / tr.length;
        g.strokeStyle = `rgba(255,${190 + Math.round(50 * f)},${110 + Math.round(90 * f)},${(0.5 * f * glow).toFixed(3)})`;
        g.lineWidth = s.size * 2.1 * f;
        g.beginPath(); g.moveTo(tr[j - 2], tr[j - 1]); g.lineTo(tr[j], tr[j + 1]); g.stroke();
      }
      const r = s.size * 8.5 * glow;
      g.globalAlpha = glow;
      g.drawImage(sprite, x - r, y - r, r * 2, r * 2);
      g.globalAlpha = 1;
    }

    // the strike: a ring going out from the box, and its sparks
    if (struck) {
      const since = t - HIT;
      if (since < 520) {
        const q = since / 520, rr = 12 + ease.out(q) * 190;
        g.strokeStyle = `rgba(255,224,160,${(0.55 * (1 - q)).toFixed(3)})`;
        g.lineWidth = 3 * (1 - q) + 0.5;
        g.beginPath(); g.ellipse(hit.x, hit.y, rr, rr * 0.8, 0, 0, Math.PI * 2); g.stroke();
        const fr = 60 + q * 140;
        g.globalAlpha = 0.9 * (1 - q) ** 2;
        g.drawImage(sprite, hit.x - fr * 1.6, hit.y - fr * 0.7, fr * 3.2, fr * 1.4);
        g.globalAlpha = 1;
      }
    }
    // the sparks thrown off: embers from the ribbon, and the spray of the strike
    for (const p of burst) {
      if (p.age >= p.life) continue;
      p.age += 16.7; p.vy += (p.small ? 0.0004 : 0.0018) * 16.7; p.x += p.vx * 16.7; p.y += p.vy * 16.7;
      const f = 1 - p.age / p.life, r = (p.small ? 2.5 : 5) * f + 1;
      g.globalAlpha = f;
      g.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;

    if (t < SOLVE_STRIKE_MS) raf = requestAnimationFrame(frame);
    else finish();
  };
  raf = requestAnimationFrame(frame);
  return SOLVE_STRIKE_MS;
}
