import { lcg, makeCanvas, soft } from "../../shared/paint.js";

// The lawn is a soft, continuous sward at a distance. Close to the window
// it resolves into overlapping, tapered leaves, rather than straight marks.
// All detail is seeded and painted only when the garden changes size.
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const hash = (x, y) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ 27183;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u;
  const b = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return a * (1 - v) + b * v;
}
const ground = (x, d) => ({ x: (x - 0.52) * 7 / (0.18 + d), y: (1 - d) * 4 / (0.22 + d) });

export function paintTurfBase(g, L) {
  const { W, H } = L, top = H * 0.232;
  const c = makeCanvas(W / 2, (H - top) / 2), ctx = c.getContext("2d");
  const image = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    const d = y / c.height, yy = 0.232 + d * 0.768;
    for (let x = 0; x < c.width; x++) {
      const nx = x / c.width, p = ground(nx, d);
      const patch = noise(p.x, p.y) * 0.58 + noise(p.x * 3.8, p.y * 3.8) * 0.29 + noise(p.x * 11, p.y * 11) * 0.13;
      const moon = Math.exp(-(((nx - 0.6) / 0.47) ** 2 + ((yy - 0.45) / 0.3) ** 2));
      const fleck = (hash(x, y) - 0.5) * 3, k = 0.8 + patch * 0.4;
      const i = (y * c.width + x) * 4;
      image.data[i] = (12 + moon * 13) * k + fleck;
      image.data[i + 1] = (24 + moon * 20) * k + fleck;
      image.data[i + 2] = (21 + moon * 23) * k + fleck;
      image.data[i + 3] = 230;
    }
  }
  ctx.putImageData(image, 0, 0);
  g.drawImage(c, 0, top, W, H - top);
}

const GREENS = [[37, 63, 45], [46, 66, 44], [33, 58, 48], [50, 67, 47], [27, 49, 39]];

function blade(g, x, y, height, lean, width, color, rim) {
  const tip = { x: x + lean, y: y - height };
  g.beginPath();
  g.moveTo(x - width * 0.5, y);
  g.quadraticCurveTo(x + lean * 0.12 - width * 0.7, y - height * 0.64, tip.x, tip.y);
  g.quadraticCurveTo(x + lean * 0.3 + width * 0.55, y - height * 0.48, x + width * 0.5, y);
  g.closePath(); g.fillStyle = color; g.fill();
  if (rim) {
    // The fold catches light on part of a leaf, never outlining the tuft.
    g.beginPath(); g.moveTo(x, y - height * 0.12);
    g.quadraticCurveTo(x + lean * 0.17, y - height * 0.6, tip.x, tip.y);
    g.strokeStyle = rim; g.lineWidth = width * 0.21; g.stroke();
  }
  return tip;
}

function tuft(g, L, t, rnd) {
  const { x, y, depth: d, rough } = t;
  const k = L.u * (0.14 + 1.35 * Math.pow(d, 1.15));
  const spread = (3.1 + rnd() * 4.6) * k;
  const h = (3.3 + rnd() * 6) * k * (1 + rough * 0.85);
  const moon = Math.exp(-(((x / L.W - 0.61) / 0.52) ** 2 + ((y / L.H - 0.47) / 0.43) ** 2));
  const color = GREENS[Math.floor(rnd() * GREENS.length)];
  const tone = (0.55 + rnd() * 0.58) * (0.7 + moon * 0.52);
  const rgb = color.map((c, i) => Math.round(c * tone + moon * [6, 9, 15][i]));
  const alpha = 0.46 + d * 0.34;
  const fill = g.createLinearGradient(0, y, 0, y - h);
  fill.addColorStop(0, `rgba(9,20,16,${alpha})`);
  fill.addColorStop(0.48, `rgba(${rgb.join(",")},${alpha})`);
  fill.addColorStop(1, `rgba(${rgb.map(c => c + 7).join(",")},${alpha * 0.87})`);
  const wind = Math.sin(x / L.W * 23 - y / L.H * 17) * 0.18;
  const count = 4 + Math.floor(rnd() * 5);
  if (d > 0.45 && rough > 0.3) soft(g, x - h * 0.22, y + k, spread * 1.5, k * 1.1, "0,7,5", 0.23);
  for (let i = 0; i < count; i++) {
    const fan = (rnd() - 0.5) * 1.45;
    const xx = x + (rnd() - 0.5) * spread, yy = y + (rnd() - 0.5) * k * 1.4;
    const len = h * (0.5 + rnd() * 0.65), lean = len * (fan + wind + (rnd() - 0.5) * 0.5);
    const width = (0.3 + rnd() * 0.6) * k;
    const lit = i % 3 === 0 && d > 0.15;
    const tip = blade(g, xx, yy, len, lean, width, i === 0 ? "rgba(5,15,12,0.62)" : fill,
      lit ? `rgba(153,178,159,${0.1 + moon * 0.16})` : null);
    // A sparse pin of dew on a bent leaf in the moonlit part of the lawn.
    if (i === 2 && d > 0.35 && moon > 0.55 && rnd() < 0.045) {
      g.fillStyle = "rgba(191,211,207,0.5)";
      g.beginPath(); g.ellipse(tip.x, tip.y + k * 0.2, k * 0.36, k * 0.22, -0.3, 0, Math.PI * 2); g.fill();
    }
  }
  if (d > 0.4 && rough > 0.65 && rnd() < 0.06) {
    // Occasional fine seed heads among the longer grass at the margins.
    const lean = h * (wind + (rnd() - 0.5) * 0.6), tipY = y - h * 1.65;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x, y - h, x + lean, tipY);
    g.lineWidth = k * 0.34; g.strokeStyle = "rgba(121,132,98,0.44)"; g.stroke();
    for (let j = 0; j < 4; j++) {
      const yy = tipY + j * k * 1.3, xx = x + lean * (1 - j * 0.025);
      g.beginPath(); g.moveTo(xx, yy + k); g.lineTo(xx + (j % 2 ? -1 : 1) * k * (0.6 + j * 0.18), yy - k);
      g.strokeStyle = "rgba(155,161,126,0.46)"; g.lineWidth = k * 0.65; g.stroke();
    }
  }
}

export function paintGrass(g, L, pathAt) {
  const { W, H } = L, top = H * 0.232, rnd = lcg(17713), tufts = [];
  const pathAtY = y => pathAt(Math.pow(clamp((H + 4 - y) / (H + 4 - top)), 1 / 0.72));
  // A dense underlayer of short, independent leaves joins the larger tufts.
  // The distant lawn reads as texture; isolated clumps never float on a
  // smooth green plane. These fine strokes stay below the taller leaves.
  const carpet = lcg(31019), fineCount = Math.min(110000, Math.round(W * H / 17));
  const colors = ["rgba(67,93,75,0.3)", "rgba(100,124,109,0.23)", "rgba(35,62,48,0.5)", "rgba(4,17,13,0.34)", "rgba(86,99,68,0.23)"];
  g.save(); g.lineCap = "round";
  for (let i = 0; i < fineCount; i++) {
    const d = carpet(), x = carpet() * W, y = top + d * (H - top);
    const path = pathAtY(y);
    if (Math.abs(x - path.x) < path.w + 0.7) continue;
    const k = L.u * (0.12 + Math.pow(d, 1.1) * 1.45);
    const h = (0.9 + carpet() * 4.8) * k, lean = (carpet() - 0.5) * h * 1.6;
    g.strokeStyle = colors[Math.floor(carpet() * colors.length)];
    g.lineWidth = Math.max(0.22, (0.2 + carpet() * 0.36) * k);
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + lean * 0.14, y - h * 0.67, x + lean, y - h);
    g.stroke();
  }
  g.restore();
  const count = Math.min(9500, Math.round(W * H / 175));
  for (let i = 0; i < count; i++) {
    const depth = Math.pow(rnd(), 0.79), y = top + depth * (H - top), x = rnd() * W;
    const path = pathAtY(y), distance = Math.abs(x - path.x) - path.w;
    if (distance < 1) continue;
    const p = ground(x / W, depth), patch = noise(p.x * 2.4, p.y * 2.4);
    if (rnd() > 0.65 + patch * 0.35) continue;
    const edge = clamp((Math.abs(x / W - 0.5) - 0.22) * 5);
    const rough = Math.max(edge * depth, clamp(1 - distance / (12 + depth * 30)));
    tufts.push({ x, y, depth, rough });
  }
  // Fine roots belong outside the gravel; only their bent tips cross its
  // edge. They break up its clean border without filling in the path.
  for (let i = 0; i < 340; i++) {
    const k = rnd(), path = pathAt(k), depth = clamp((path.y - top) / (H - top));
    for (const side of [-1, 1]) {
      const x = path.x + side * (path.w + (1 + rnd() * 7) * L.u * (0.2 + depth));
      tufts.push({ x, y: path.y, depth, rough: 0.75 + rnd() * 0.25 });
    }
  }
  tufts.sort((a, b) => a.y - b.y);
  g.save();
  for (const t of tufts) tuft(g, L, t, rnd);
  g.restore();
}
