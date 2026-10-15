import { lcg, soft } from "../../shared/paint.js";

// Vegetation for the moonlit garden. Branches carry small, overlapping
// sprays of leaves; gaps, uneven tips and matte foliage describe the crown.
// Local dimensions scale with the plant, so a resize keeps its silhouette.
const TAU = Math.PI * 2;
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const mix = (a, b, t) => a + (b - a) * t;

function leaf(g, x, y, length, width, angle, color) {
  const dx = Math.cos(angle) * length * 0.5, dy = Math.sin(angle) * length * 0.5;
  const nx = -Math.sin(angle) * width, ny = Math.cos(angle) * width;
  g.beginPath(); g.moveTo(x - dx, y - dy);
  g.quadraticCurveTo(x + nx, y + ny, x + dx, y + dy);
  g.quadraticCurveTo(x - nx, y - ny, x - dx, y - dy);
  g.closePath(); g.fillStyle = color; g.fill();
}

function twig(g, a, b, w0, w1, shade = 1) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < 0.01) return;
  const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
  const bend = { x: mix(a.x, b.x, 0.36) + nx * length * 0.04, y: mix(a.y, b.y, 0.36) + ny * length * 0.04 };
  g.beginPath();
  g.moveTo(a.x - nx * w0, a.y - ny * w0);
  g.quadraticCurveTo(bend.x - nx * w0 * 0.7, bend.y - ny * w0 * 0.7, b.x - nx * w1, b.y - ny * w1);
  g.lineTo(b.x + nx * w1, b.y + ny * w1);
  g.quadraticCurveTo(bend.x + nx * w0 * 0.7, bend.y + ny * w0 * 0.7, a.x + nx * w0, a.y + ny * w0);
  g.closePath();
  const paint = g.createLinearGradient(a.x - nx * w0, a.y - ny * w0, a.x + nx * w0, a.y + ny * w0);
  paint.addColorStop(0, rgb(9 * shade, 15 * shade, 15 * shade));
  paint.addColorStop(0.65, rgb(36 * shade, 41 * shade, 35 * shade));
  paint.addColorStop(1, rgb(54 * shade, 59 * shade, 48 * shade));
  g.fillStyle = paint; g.fill();
}

// A cluster is made of matte leaves at different depths. Its small dark
// core has an irregular contour; the individual leaves soften its edge.
function spray(g, c, rnd, detail, shrub = false) {
  const phase = rnd() * TAU, outline = [];
  for (let i = 0; i < 24; i++) {
    const a = i * TAU / 24;
    const r = 0.67 + 0.08 * Math.sin(a * 5 + phase) + rnd() * 0.17;
    outline.push({ x: c.x + Math.cos(a) * c.rx * r, y: c.y + Math.sin(a) * c.ry * r });
  }
  g.beginPath(); outline.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath();
  g.fillStyle = c.back ? "#091815" : "#0c1d17"; g.fill();
  const count = Math.round((shrub ? 180 : 220) * detail);
  const specks = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * TAU, radius = Math.sqrt(rnd());
    const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
    const edge = 0.93 + 0.09 * Math.sin(a * 5 + phase) + 0.035 * Math.sin(a * 11 - phase);
    const z = Math.sqrt(Math.max(0, 1 - radius * radius));
    const light = clamp(0.32 + px * 0.3 - py * 0.4 + z * 0.18 + (rnd() - 0.5) * 0.3);
    specks.push({ x: c.x + px * c.rx * edge, y: c.y + py * c.ry * edge, light, z, a });
  }
  specks.sort((a, b) => a.z - b.z);
  for (const p of specks) {
    const light = p.light * (c.back ? 0.68 : 1) * (c.light ?? 1);
    const length = (shrub ? 3.5 : 3) + rnd() * (shrub ? 3.6 : 3.2);
    const color = rgb(9 + light * 54, 24 + light * 68, 21 + light * 62);
    leaf(g, p.x, p.y, length, length * (0.24 + rnd() * 0.16), p.a * 0.3 - 0.45 + (rnd() - 0.5) * 2.2, color);
    if (!c.back && light > 0.63 && rnd() < 0.13) {
      leaf(g, p.x + 0.25, p.y - 0.35, length * 0.7, length * 0.065, -0.5, "rgba(161,180,169,0.33)");
    }
  }
}

export function paintShrub(g, x, y, radius, seed) {
  const rnd = lcg(seed), scale = radius / 100, clusters = [];
  g.save(); g.translate(x, y); g.scale(scale, scale);
  soft(g, -8, 3, 102, 18, "0,7,5", 0.55);
  for (let i = 0; i < 13; i++) {
    const side = (i / 12 - 0.5) * 2;
    const end = { x: side * 85 + (rnd() - 0.5) * 12, y: -25 - (1 - side * side) * 49 - rnd() * 28 };
    twig(g, { x: side * 11, y: 0 }, end, 2 + rnd() * 1.8, 0.6, 0.8);
    clusters.push({ ...end, rx: 24 + rnd() * 14, ry: 20 + rnd() * 14, back: i % 4 === 0, light: 0.88 + rnd() * 0.2 });
  }
  for (let i = 0; i < 6; i++) {
    clusters.push({
      x: (i / 5 - 0.5) * 142 + (rnd() - 0.5) * 12, y: -23 - rnd() * 18,
      rx: 28 + rnd() * 13, ry: 23 + rnd() * 10, back: false, light: 0.6 + rnd() * 0.25,
    });
  }
  clusters.sort((a, b) => a.y - b.y).forEach(c => spray(g, c, rnd, clamp(radius / 26, 0.5, 1.4), true));
  g.restore();
}

export function paintHedge(g, L, gap) {
  const { W, H, u, near } = L, rnd = lcg(31073);
  const top = x => near(x) - H * 0.011 + u * (Math.sin(x / W * 71) * 1.1 + Math.sin(x / W * 193) * 0.65);
  g.save();
  for (const [left, right] of [[-4, gap.x - gap.w * 1.35], [gap.x + gap.w * 1.35, W + 4]]) {
    g.beginPath(); g.moveTo(left, near(left) + H * 0.012);
    for (let x = left; x <= right; x += 2) g.lineTo(x, top(x));
    g.lineTo(right, near(right) + H * 0.012); g.closePath();
    g.fillStyle = "#10231c"; g.fill();
  }
  for (let i = 0; i < W * 3.5; i++) {
    const x = rnd() * W;
    if (Math.abs(x - gap.x) < gap.w * 1.32) continue;
    const depth = rnd(), y = top(x) + depth * H * 0.022;
    const light = (1 - depth) * 0.48 + rnd() * 0.3;
    leaf(g, x, y, (0.9 + rnd() * 1.7) * u, (0.35 + rnd() * 0.4) * u, rnd() * TAU,
      rgb(8 + light * 44, 21 + light * 52, 21 + light * 59));
  }
  g.restore();
}

export function paintFern(g, x, y, size, seed) {
  const rnd = lcg(seed);
  g.save();
  soft(g, x - size * 0.1, y + 1, size * 0.8, size * 0.12, "1,9,5", 0.38);
  for (let f = 0; f < 7; f++) {
    const side = (f - 3) / 3, reach = size * side * (0.8 + rnd() * 0.3), h = size * (0.65 + rnd() * 0.35);
    const point = t => ({ x: x + reach * t * (0.65 + t * 0.35), y: y - h * Math.sin(t * 1.8) });
    g.beginPath(); g.moveTo(x, y);
    for (let i = 1; i <= 20; i++) { const p = point(i / 20); g.lineTo(p.x, p.y); }
    g.strokeStyle = "#3e5b40"; g.lineWidth = Math.max(0.45, size * 0.019); g.stroke();
    for (let i = 2; i < 18; i++) {
      const t = i / 20, p = point(t), q = point(t + 0.025), angle = Math.atan2(q.y - p.y, q.x - p.x);
      const len = size * 0.25 * Math.sin(t * Math.PI) * (1 - t * 0.45);
      for (const direction of [-1, 1]) {
        const turn = angle + direction * 0.86;
        leaf(g, p.x + Math.cos(turn) * len * 0.4, p.y + Math.sin(turn) * len * 0.4,
          len, len * 0.13, turn, direction < 0 ? "#294534" : "#4b6850");
      }
    }
  }
  g.restore();
}
