import { soft, lcg, polygon, makeCanvas } from "../../shared/paint.js";
import { ELEMENTS, cellOf } from "../chemistry/puzzle.js";

// The second floor belongs to the chemist: glazed tiles, copper services,
// old reagent cupboards and glass apparatus. Everything uses the hall's
// projection; doors, the electrical experiment and the stairs stay in place.
const END = 4.7;
const TAU = Math.PI * 2;
const charts = new Map();
const fill = (ctx, points, color) => { polygon(ctx, points); ctx.fillStyle = color; ctx.fill(); };
const line = (ctx, points, color, width = 1) => {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  points.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
  ctx.stroke();
};
const ellipse = (ctx, x, y, rx, ry, color) => {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
};
function gradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

export function paintFloor(ctx, L) {
  const { P, wall, floor, u, H } = L;
  const rnd = lcg(2941), step = wall / 6;
  ctx.save();
  polygon(ctx, [P(-wall, floor, 0.7), P(wall, floor, 0.7), P(wall, floor, END), P(-wall, floor, END)]);
  ctx.fillStyle = "#171d1b"; ctx.fill(); ctx.clip();
  for (let row = 0, z = 0.68; z < END; z += 0.19, row++) {
    for (let col = 0; col < 12; col++) {
      const x = -wall + col * step, gap = step * 0.012, inset = 0.0025;
      const pale = (col + row) % 2 === 0;
      const k = 0.82 + rnd() * 0.19;
      const rgb = pale ? [64, 68, 58] : [26, 36, 34];
      const pts = [P(x + gap, floor, z + inset), P(x + step - gap, floor, z + inset), P(x + step - gap, floor, z + 0.19 - inset), P(x + gap, floor, z + 0.19 - inset)];
      fill(ctx, pts, `rgb(${rgb.map(c => Math.round(c * k)).join(",")})`);
      line(ctx, [pts[0], pts[1]], pale ? "rgba(176,176,146,0.2)" : "rgba(111,137,126,0.12)", Math.max(0.4, u / z));
      for (let n = 0; n < 4; n++) {
        const p = P(x + rnd() * step, floor, z + rnd() * 0.19);
        ctx.fillStyle = n % 2 ? "rgba(17,23,19,0.15)" : "rgba(194,194,159,0.08)";
        ctx.fillRect(p.x, p.y, 3 * u / z, 0.7 * u / z);
      }
    }
  }
  // a scuffed polish, rather than a carpet
  const shade = gradient(ctx, 0, P(0, floor, END).y, 0, H, [[0, "rgba(5,13,16,0.55)"], [0.55, "rgba(16,21,20,0.08)"], [1, "rgba(17,14,10,0.15)"]]);
  ctx.fillStyle = shade; ctx.fillRect(0, 0, L.W, H);
  const moon = P(0, floor, 3.4);
  soft(ctx, moon.x, moon.y, wall * 0.2, H * 0.1, "123,162,175", 0.1, "lighter");
  ctx.restore();
}

export function paintWall(ctx, L, side) {
  const { P, H, wall, floor, ceil, u } = L, X = side * wall;
  const rnd = lcg(side < 0 ? 105 : 907), dado = floor - H * 0.46;
  const quad = (y0, y1, z0 = 0.7, z1 = END) => [P(X, y0, z0), P(X, y0, z1), P(X, y1, z1), P(X, y1, z0)];
  fill(ctx, quad(ceil, floor), gradient(ctx, P(X, 0, 0.8).x, 0, P(X, 0, END).x, 0, [[0, "#2c322b"], [0.5, "#202923"], [1, "#121d1b"]]));
  ctx.save(); polygon(ctx, quad(ceil, dado)); ctx.clip();
  // Mineral flecks and irregular wash in the old lime plaster.
  for (let i = 0; i < 1300; i++) {
    const z = 0.72 + rnd() * 4, y = ceil + rnd() * (dado - ceil), p = P(X, y, z);
    ctx.fillStyle = i % 4 ? "rgba(176,175,145,0.045)" : "rgba(13,26,22,0.1)";
    ctx.fillRect(p.x, p.y, (0.6 + rnd() * 2) * u / z, (0.6 + rnd() * 3) * u / z);
  }
  ctx.restore();
  fill(ctx, quad(dado, floor), "#162724");
  const tileH = H * 0.056, tileZ = 0.16;
  for (let row = 0, y = dado; y < floor; y += tileH, row++) {
    for (let z = 0.65 - (row % 2) * tileZ / 2; z < END; z += tileZ) {
      const k = 0.8 + rnd() * 0.3;
      const tile = quad(y + H * 0.0015, Math.min(floor, y + tileH - H * 0.0015), z + 0.002, z + tileZ - 0.002);
      fill(ctx, tile, `rgb(${Math.round(40 * k)},${Math.round(66 * k)},${Math.round(58 * k)})`);
      line(ctx, [tile[0], tile[1]], "rgba(130,151,123,0.15)", Math.max(0.35, u / z));
      line(ctx, [tile[3], tile[2]], "rgba(3,15,13,0.35)", Math.max(0.35, u / z));
    }
  }
  fill(ctx, quad(dado - H * 0.014, dado + H * 0.008), "#192823");
  fill(ctx, quad(dado - H * 0.014, dado - H * 0.011), "#65725a");
  fill(ctx, quad(floor - H * 0.035, floor), "#11201c");
  fill(ctx, quad(ceil, ceil + H * 0.04), "#28382e");
  fill(ctx, quad(ceil + H * 0.038, ceil + H * 0.043), "#71806a");
  // Charts are laid onto the wall in perspective, like the framed specimens below.
  wallChart(ctx, L, side, 1.38, 1.77, -H * 0.56, -H * 0.36, 0);
  wallChart(ctx, L, side, 2.78, 2.98, -H * 0.48, -H * 0.29, 1);
}

function chart(kind) {
  if (charts.has(kind)) return charts.get(kind);
  const c = makeCanvas(600, 380), g = c.getContext("2d"), rnd = lcg(kind + 901);
  g.fillStyle = "#292a20"; g.fillRect(0, 0, 600, 380);
  g.fillStyle = "#7a7455"; g.fillRect(5, 5, 590, 370);
  g.fillStyle = "#b2ab8a"; g.fillRect(11, 11, 578, 358);
  g.fillStyle = "#373b30"; g.textAlign = "center"; g.font = "20px Georgia";
  g.fillText(kind ? "LABORATORY APPARATUS" : "TABLE OF THE ELEMENTS", 300, 45);
  line(g, [{ x: 38, y: 59 }, { x: 562, y: 59 }], "#676b51", 1);
  if (!kind) {
    for (let n = 1; n <= ELEMENTS.length; n++) {
      const cell = cellOf(n);
      const x = 29 + (cell.col - 1) * 30, y = 78 + (cell.row - 1) * 26;
      g.fillStyle = n % 3 ? "#9fa58a" : "#b1a281";
      g.fillRect(x, y, 28, 24);
      g.fillStyle = "#404b3d"; g.font = "8px Georgia"; g.fillText(String(n), x + 14, y + 8);
      g.font = "12px Georgia"; g.fillText(ELEMENTS[n - 1], x + 14, y + 20);
    }
  } else {
    g.strokeStyle = "#4a5b4c"; g.lineWidth = 2.3;
    for (const [i, kind] of ["round", "flask", "jar"].entries()) {
      g.save(); g.translate(115 + i * 183, 276); vesselPath(g, 86, 158, kind); g.stroke(); g.restore();
    }
    for (let i = 0; i < 3; i++) {
      g.fillStyle = "#4a5140"; g.font = "italic 14px Georgia"; g.fillText(["Florence flask", "Conical flask", "Reagent bottle"][i], 115 + i * 183, 307);
    }
  }
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = i % 4 ? "rgba(65,58,33,0.08)" : "rgba(220,211,166,0.2)";
    g.fillRect(12 + rnd() * 576, 12 + rnd() * 356, 1 + rnd() * 2, 1);
  }
  charts.set(kind, c);
  return c;
}

function wallChart(ctx, L, side, z0, z1, top, bottom, kind) {
  const image = chart(kind), X = side * L.wall;
  const zAt = t => side < 0 ? z0 + t * (z1 - z0) : z1 - t * (z1 - z0);
  for (let x = 0; x < image.width; x += 2) {
    const z = zAt((x + 1) / image.width), p = L.P(X, top, zAt(x / image.width)), q = L.P(X, top, zAt((x + 2) / image.width));
    ctx.drawImage(image, x, 0, 2, image.height, Math.min(p.x, q.x), p.y, Math.abs(q.x - p.x) + 0.6, (bottom - top) / z);
  }
}

export function paintPipes(ctx, L) {
  const { P, wall, ceil, H, u } = L;
  for (const side of [-1, 1]) {
    for (const [n, thick] of [5.5, 3].entries()) {
      const y = ceil + H * (0.085 + n * 0.037), x = side * (wall - H * 0.018);
      for (const [offset, width, color] of [[0.6, 1.5, "rgba(0,0,0,0.3)"], [0, 1, "#241b12"], [-0.15, 0.65, "#79563a"], [-0.3, 0.16, "#b08e60"]]) {
        const top = y + thick * u * (offset - width / 2), bottom = y + thick * u * (offset + width / 2);
        fill(ctx, [P(x, top, 0.8), P(x, top, END), P(x, bottom, END), P(x, bottom, 0.8)], color);
      }
      for (let z = 1.05; z < END; z += 0.48) {
        const p = P(x, y, z), size = thick * u / z;
        line(ctx, [{ x: p.x, y: p.y - size }, { x: p.x + side * size * 0.2, y: p.y + size }], "#87816a", Math.max(1, 3 * u / z));
      }
    }
  }
  // A pressure dial on the feed, set up above the first left-hand bench.
  const p = P(-wall + H * 0.025, -H * 0.39, 2.03), s = H / 700 / 2.03;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s * 0.7, s);
  ellipse(ctx, 1, 2, 19, 19, "#111815"); ellipse(ctx, 0, 0, 17, 17, "#7a7254"); ellipse(ctx, 0, 0, 13.5, 13.5, "#afa98a");
  for (let i = 0; i < 11; i++) { const a = 0.8 + i * 0.47; line(ctx, [{ x: Math.cos(a) * 10, y: Math.sin(a) * 10 }, { x: Math.cos(a) * 12, y: Math.sin(a) * 12 }], "#323a30", 0.65); }
  line(ctx, [{ x: -1, y: 2 }, { x: 7, y: -7 }], "#3f3326", 1.2); ellipse(ctx, 0, 0, 1.7, 1.7, "#424633");
  ctx.restore();
}

export function paintEndDado(ctx, L, { a, b, dado }) {
  ctx.fillStyle = "#253b34"; ctx.fillRect(a.x, dado, b.x - a.x, b.y - dado);
  const size = L.H * 0.056 / END;
  for (let y = dado; y < b.y; y += size) line(ctx, [{ x: a.x, y }, { x: b.x, y }], "#172b25", 0.7);
  for (let x = a.x; x < b.x; x += size * 2.2) line(ctx, [{ x, y: dado }, { x, y: b.y }], "#172b25", 0.7);
  ctx.fillStyle = "#758068"; ctx.fillRect(a.x, dado - 2, b.x - a.x, 2);
}

// Glassware is drawn in local bench units, with the base at y=0. The wall
// remains visible through the vessel; only the rim and curved edges reflect.
function vesselPath(ctx, w, h, kind) {
  const r = w / 2;
  ctx.beginPath();
  if (kind === "round") {
    ctx.moveTo(-r * 0.2, -h); ctx.lineTo(-r * 0.2, -h * 0.58);
    ctx.bezierCurveTo(-r * 0.22, -h * 0.52, -r, -h * 0.52, -r, -h * 0.28);
    ctx.bezierCurveTo(-r, -h * 0.07, -r * 0.62, 0, 0, 0);
    ctx.bezierCurveTo(r * 0.62, 0, r, -h * 0.07, r, -h * 0.28);
    ctx.bezierCurveTo(r, -h * 0.52, r * 0.22, -h * 0.52, r * 0.2, -h * 0.58); ctx.lineTo(r * 0.2, -h);
  } else if (kind === "flask") {
    ctx.moveTo(-r * 0.2, -h); ctx.lineTo(-r * 0.2, -h * 0.66);
    ctx.lineTo(-r * 0.97, -h * 0.07); ctx.quadraticCurveTo(-r * 1.04, 0, -r * 0.82, 0);
    ctx.lineTo(r * 0.82, 0); ctx.quadraticCurveTo(r * 1.04, 0, r * 0.97, -h * 0.07); ctx.lineTo(r * 0.2, -h * 0.66); ctx.lineTo(r * 0.2, -h);
  } else {
    ctx.moveTo(-r * 0.37, -h); ctx.lineTo(-r * 0.37, -h * 0.83);
    ctx.bezierCurveTo(-r * 0.37, -h * 0.74, -r, -h * 0.79, -r, -h * 0.65);
    ctx.lineTo(-r, -h * 0.06); ctx.quadraticCurveTo(-r, 0, -r * 0.8, 0);
    ctx.lineTo(r * 0.8, 0); ctx.quadraticCurveTo(r, 0, r, -h * 0.06);
    ctx.lineTo(r, -h * 0.65); ctx.bezierCurveTo(r, -h * 0.79, r * 0.37, -h * 0.74, r * 0.37, -h * 0.83); ctx.lineTo(r * 0.37, -h);
  }
  ctx.closePath();
}

function vessel(ctx, x, y, w, h, { kind = "jar", liquid = "75,108,92", level = 0.4, amber = false, label = "", stoppered = false } = {}) {
  ctx.save(); ctx.translate(x, y);
  soft(ctx, 1, 1.5, w * 0.67, w * 0.12, "0,0,0", 0.5);
  vesselPath(ctx, w, h, kind);
  ctx.fillStyle = amber ? "rgba(100,59,20,0.38)" : "rgba(97,145,145,0.08)"; ctx.fill();
  ctx.save(); ctx.clip();
  const water = gradient(ctx, 0, -h * level, 0, 0, [[0, `rgba(${liquid},0.57)`], [0.7, `rgba(${liquid},0.35)`], [1, "rgba(12,31,27,0.68)"]]);
  ctx.fillStyle = water; ctx.fillRect(-w, -h * level, w * 2, h * level);
  ellipse(ctx, 0, -h * level, w * 0.53, w * 0.065, `rgba(${liquid},0.58)`);
  ctx.fillStyle = gradient(ctx, -w / 2, 0, w / 2, 0, [[0, "rgba(9,20,17,0.5)"], [0.13, "rgba(186,208,185,0.26)"], [0.2, "rgba(162,195,180,0.02)"], [0.7, "rgba(0,0,0,0.08)"], [0.89, "rgba(206,216,185,0.24)"], [1, "rgba(3,16,12,0.42)"]]);
  ctx.fillRect(-w / 2, -h, w, h + 1);
  line(ctx, [{ x: -w * 0.31, y: -h * 0.61 }, { x: -w * 0.33, y: -h * 0.13 }], "rgba(206,223,204,0.32)", w * 0.045);
  ctx.restore();
  vesselPath(ctx, w, h, kind); ctx.strokeStyle = amber ? "rgba(167,137,81,0.5)" : "rgba(165,202,186,0.49)"; ctx.lineWidth = 0.65; ctx.stroke();
  const neck = w * (kind === "jar" ? 0.185 : 0.1);
  ctx.strokeStyle = "rgba(208,219,194,0.55)";
  ctx.beginPath(); ctx.ellipse(0, -h, neck + 0.8, 1.2, 0, 0, TAU); ctx.stroke();
  if (stoppered) {
    ctx.fillStyle = gradient(ctx, -neck, 0, neck, 0, [[0, "#53432d"], [0.4, "#a38b60"], [1, "#4d4131"]]);
    ctx.fillRect(-neck, -h - 5, neck * 2, 6); ellipse(ctx, 0, -h - 5, neck, 1.2, "#a8976b");
  }
  if (label) {
    ctx.fillStyle = "#b3ab87"; ctx.fillRect(-w * 0.35, -h * 0.48, w * 0.7, h * 0.2);
    ctx.strokeStyle = "#726f53"; ctx.lineWidth = 0.35; ctx.strokeRect(-w * 0.32, -h * 0.465, w * 0.64, h * 0.17);
    ctx.fillStyle = "#35402f"; ctx.font = `${Math.min(7, w * 0.2)}px Georgia`; ctx.textAlign = "center"; ctx.fillText(label, 0, -h * 0.35, w * 0.6);
  }
  ctx.restore();
}

function cabinet(ctx, width, height, glass = false) {
  const rnd = lcg(Math.round(width * height));
  soft(ctx, 4, 3, width * 0.7, 7, "0,0,0", 0.7);
  ctx.fillStyle = "#101c18"; ctx.fillRect(-width / 2, -height, width, height);
  ctx.fillStyle = gradient(ctx, -width / 2, 0, width / 2, 0, [[0, "#26392e"], [0.4, "#394e3b"], [1, "#17291f"]]);
  ctx.fillRect(-width / 2 + 3, -height + 4, width - 6, height - 11);
  const rows = glass ? 3 : 2;
  for (let row = 0; row < rows; row++) {
    const y = -height + 11 + row * (height - 23) / rows, h = (height - 23) / rows - 5;
    for (const side of [-1, 1]) {
      const x = side < 0 ? -width / 2 + 8 : 3, w = width / 2 - 11;
      ctx.fillStyle = glass ? "#101d18" : "#23372a"; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#55654b"; ctx.lineWidth = 0.7; ctx.strokeRect(x, y, w, h);
      if (glass) {
        for (let i = 0; i < 3; i++) vessel(ctx, x + w * (i + 0.6) / 3.2, y + h - 3, w * 0.22, h * (0.48 + rnd() * 0.26), { amber: i % 2 === 0, label: ["NaCl", "Cu", "Fe"][i], stoppered: true, liquid: i % 2 ? "50,102,105" : "103,77,32" });
        ctx.fillStyle = "rgba(141,176,153,0.07)"; ctx.fillRect(x + w * 0.1, y + 1, w * 0.14, h - 2);
      } else {
        ellipse(ctx, x + w / 2, y + h * 0.42, 4, 1.5, "#918765");
        line(ctx, [{ x: x + w / 2 - 3, y: y + h * 0.43 }, { x: x + w / 2 + 3, y: y + h * 0.43 }], "#373a28", 0.8);
      }
    }
  }
  ctx.fillStyle = "#0c1714"; ctx.fillRect(-width / 2 - 3, -height - 5, width + 6, 7);
  ctx.fillStyle = "#697365"; ctx.fillRect(-width / 2 - 3, -height - 5, width + 6, 1.2);
  ctx.strokeStyle = "rgba(158,167,119,0.11)"; ctx.lineWidth = 0.45;
  for (let i = 0; i < 45; i++) {
    const x = (rnd() - 0.5) * width, y = -rnd() * height;
    line(ctx, [{ x, y }, { x: x + rnd() * 4, y: y + rnd() * 1.5 }], "rgba(158,167,119,0.11)", 0.45);
  }
}

export function paintThings(ctx, L) {
  const { P, floor, H } = L;
  const on = (top, draw) => { ctx.save(); ctx.translate(top.x, top.y); ctx.scale(top.k, top.k); draw(); ctx.restore(); };
  // the furthest first: a tall glazed cabinet of reagents in the far left
  // corner, past the last door so as to keep clear of it; a rack of test tubes
  // on its cabinet, right; then by the nearer doors a still, left, and the
  // balance, right, clear of the lever on the wall over it
  labCabinet(ctx, L, -1, 4.2, 4.5, { height: 0.62, rows: 4, cols: 2, glass: true, depth: 0.1 });
  on(labCabinet(ctx, L, 1, 2.76, 3.05), () => paintTubeRack(ctx));
  on(labCabinet(ctx, L, -1, 1.87, 2.15), () => paintStill(ctx));
  on(labCabinet(ctx, L, 1, 1.95, 2.17), () => paintBalance(ctx));
  // A long apothecary counter beneath the blackboard, with drawers and bottles.
  const back = P(0, floor, END - 0.05), k = H / 700 / END;
  ctx.save(); ctx.translate(back.x, back.y); ctx.scale(k, k);
  cabinet(ctx, 620, 170);
  const rnd = lcg(713);
  for (let i = 0; i < 13; i++) vessel(ctx, -271 + i * 44, -177, 24 + rnd() * 8, 48 + rnd() * 37, { amber: i % 3 !== 0, label: ["NaCl", "Cu", "Fe", "S"][i % 4], stoppered: true, liquid: i % 3 ? "114,82,33" : "65,111,113", level: 0.48 });
  ctx.restore();
}

// ── the end wall: a blackboard where the window was ──────────────────────────
// A school blackboard on the end wall: a heavy oak frame, the slate gone grey
// with old chalk, and on it a chemist's working in chalk — a benzene ring,
// equations balanced and one crossed out, a flask over a flame, a molecule
// of water with its angle, a molar mass worked out — rubbed out here and
// there and written over. A tray along its foot with the chalk and the duster.
let board = null;
function blackboard() {
  if (board) return board;
  const W = 1400, H = 640;
  const c = makeCanvas(W, H), g = c.getContext("2d"), rnd = lcg(4040);
  // the slate: near black, greyed by years of chalk wiped across it
  g.fillStyle = "#161b19"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 220;
    const s = g.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, `rgba(210,214,206,${(0.03 + rnd() * 0.05).toFixed(3)})`);
    s.addColorStop(1, "rgba(210,214,206,0)");
    g.fillStyle = s; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // the swing of a duster: long pale arcs
  g.strokeStyle = "rgba(220,222,214,0.035)"; g.lineCap = "round";
  for (let i = 0; i < 18; i++) {
    g.lineWidth = 30 + rnd() * 40;
    const x = rnd() * W, y = rnd() * H;
    g.beginPath(); g.arc(x, y + 200, 200 + rnd() * 120, -Math.PI * (0.65 + rnd() * 0.1), -Math.PI * (0.35 - rnd() * 0.1)); g.stroke();
  }
  // chalk: each stroke twice, a little apart, as chalk catches on the slate
  const chalk = (draw, alpha = 0.78, width = 3.2) => {
    for (const [dx, dy, a] of [[0, 0, alpha], [0.9, -0.6, alpha * 0.45]]) {
      g.save(); g.translate(dx, dy);
      g.strokeStyle = `rgba(236,236,226,${a})`; g.fillStyle = `rgba(236,236,226,${a})`;
      g.lineWidth = width; g.lineCap = "round"; g.lineJoin = "round";
      draw(); g.restore();
    }
  };
  const write = (text, x, y, size, alpha = 0.8, angle = 0) => chalk(() => {
    g.save(); g.translate(x, y); g.rotate(angle);
    g.font = `${size}px "Architects Daughter", "Segoe Print", "Comic Sans MS", cursive`;
    g.fillText(text, 0, 0); g.restore();
  }, alpha);
  // a benzene ring, its hydrogens round it
  const bx = 190, by = 210, br = 78;
  chalk(() => {
    g.beginPath();
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + (i / 6) * Math.PI * 2; const x = bx + Math.cos(a) * br, y = by + Math.sin(a) * br; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    g.beginPath(); g.arc(bx, by, br * 0.55, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i / 6) * Math.PI * 2; g.beginPath(); g.moveTo(bx + Math.cos(a) * br, by + Math.sin(a) * br); g.lineTo(bx + Math.cos(a) * (br + 34), by + Math.sin(a) * (br + 34)); g.stroke(); }
  });
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i / 6) * Math.PI * 2; write("H", bx + Math.cos(a) * (br + 50) - 9, by + Math.sin(a) * (br + 50) + 10, 28); }
  write("C₆H₆", bx - 42, by + 168, 34);
  // the equations, down the middle, one struck through and done again
  write("2H₂ + O₂  →  2H₂O", 430, 120, 42);
  write("CH₄ + O₂  →  CO₂ + H₂O", 430, 200, 40, 0.55);
  chalk(() => { g.beginPath(); g.moveTo(420, 186); g.lineTo(860, 176); g.stroke(); }, 0.6, 2.6);
  write("CH₄ + 2O₂  →  CO₂ + 2H₂O", 430, 270, 40);
  write("NaCl + AgNO₃  →  AgCl↓ + NaNO₃", 430, 350, 36, 0.72);
  write("ΔH < 0", 440, 420, 36);
  chalk(() => { g.beginPath(); g.moveTo(430, 296); g.quadraticCurveTo(650, 306, 900, 292); g.stroke(); }, 0.5, 2.4);
  // a flask over a flame, bubbles rising in it
  const fx = 1080, fy = 300;
  chalk(() => {
    g.beginPath(); g.moveTo(fx - 18, fy - 150); g.lineTo(fx - 18, fy - 90); g.lineTo(fx - 70, fy); g.quadraticCurveTo(fx - 76, fy + 12, fx - 60, fy + 12);
    g.lineTo(fx + 60, fy + 12); g.quadraticCurveTo(fx + 76, fy + 12, fx + 70, fy); g.lineTo(fx + 18, fy - 90); g.lineTo(fx + 18, fy - 150); g.stroke();
    g.beginPath(); g.moveTo(fx - 56, fy - 22); g.quadraticCurveTo(fx, fy - 30, fx + 56, fy - 22); g.stroke();
    for (const [x, y, r] of [[-20, -8, 6], [10, -16, 4], [26, -4, 5], [-4, -40, 3.5], [6, -64, 3]]) { g.beginPath(); g.arc(fx + x, fy + y, r, 0, Math.PI * 2); g.stroke(); }
    // the flame under it, and the tripod
    g.beginPath(); g.moveTo(fx - 16, fy + 70); g.quadraticCurveTo(fx - 18, fy + 40, fx, fy + 24); g.quadraticCurveTo(fx + 18, fy + 40, fx + 16, fy + 70); g.stroke();
    g.beginPath(); g.moveTo(fx - 70, fy + 18); g.lineTo(fx - 86, fy + 110); g.moveTo(fx + 70, fy + 18); g.lineTo(fx + 86, fy + 110); g.moveTo(fx - 80, fy + 18); g.lineTo(fx + 80, fy + 18); g.stroke();
  });
  write("Δ", fx + 40, fy + 70, 34);
  // water, as balls and sticks, and its angle
  const wx = 1150, wy = 500;
  chalk(() => {
    g.beginPath(); g.arc(wx, wy, 26, 0, Math.PI * 2); g.stroke();
    for (const d of [-1, 1]) {
      const hx = wx + d * 78, hy = wy + 52;
      g.beginPath(); g.moveTo(wx + d * 18, wy + 18); g.lineTo(hx - d * 12, hy - 8); g.stroke();
      g.beginPath(); g.arc(hx, hy, 16, 0, Math.PI * 2); g.stroke();
    }
    g.beginPath(); g.arc(wx, wy, 58, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  });
  write("O", wx - 10, wy + 10, 26); write("H", wx - 88, wy + 62, 22); write("H", wx + 70, wy + 62, 22);
  write("104.5°", wx - 40, wy + 108, 26, 0.7);
  // figures down the left foot: a molar mass worked out, underlined twice
  write("M(H₂O) = 2·1 + 16", 90, 450, 32, 0.75);
  write("= 18 g/mol", 230, 500, 32, 0.75);
  chalk(() => { g.beginPath(); g.moveTo(222, 512); g.lineTo(410, 508); g.moveTo(222, 520); g.lineTo(404, 518); g.stroke(); }, 0.6, 2.2);
  write("pH = −log[H⁺]", 600, 540, 34, 0.6, -0.02);
  // a word rubbed half out
  write("valence", 820, 470, 30, 0.22);
  return (board = c);
}

/** The end wall, plastered dark, and the blackboard on it, over the counter. */
export function paintEndBoard(ctx, L) {
  const { P, wall, floor, ceil, H } = L;
  const a = P(-wall, ceil, END), b = P(wall, floor, END);
  ctx.fillStyle = gradient(ctx, 0, a.y, 0, b.y, [[0, "#141c19"], [1, "#1c2925"]]);
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  const dado = P(0, floor - H * 0.36, END).y;
  paintEndDado(ctx, L, { a, b, dado });
  // the board: its frame of oak, the slate, the chalk on it, the tray
  const tl = P(-wall * 0.6, -H * 0.56, END), br = P(wall * 0.6, floor - H * 0.43, END);
  const fw = (br.x - tl.x) * 0.025;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(tl.x - fw + 3, tl.y - fw + 4, br.x - tl.x + fw * 2, br.y - tl.y + fw * 2);
  ctx.fillStyle = gradient(ctx, 0, tl.y - fw, 0, br.y + fw, [[0, "#4a3220"], [0.5, "#33220f"], [1, "#24170b"]]);
  ctx.fillRect(tl.x - fw, tl.y - fw, br.x - tl.x + fw * 2, br.y - tl.y + fw * 2);
  ctx.fillStyle = "rgba(255,214,160,0.12)";
  ctx.fillRect(tl.x - fw, tl.y - fw, br.x - tl.x + fw * 2, Math.max(1, fw * 0.2));
  ctx.drawImage(blackboard(), tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  // the hall's dark over it, deeper toward its foot
  ctx.fillStyle = gradient(ctx, 0, tl.y, 0, br.y, [[0, "rgba(4,6,6,0.15)"], [1, "rgba(4,6,6,0.45)"]]);
  ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  // the tray: a ledge of oak, two sticks of chalk and a stub, the felt duster
  const ty = br.y + fw, th = fw * 1.4;
  ctx.fillStyle = "#3a2716"; ctx.fillRect(tl.x - fw * 1.6, ty - fw * 0.2, br.x - tl.x + fw * 3.2, th);
  ctx.fillStyle = "rgba(255,214,160,0.16)"; ctx.fillRect(tl.x - fw * 1.6, ty - fw * 0.2, br.x - tl.x + fw * 3.2, Math.max(1, th * 0.18));
  const s = (br.x - tl.x) / 1400;
  for (const [x, len] of [[0.18, 70], [0.24, 46], [0.31, 22]]) {
    ctx.fillStyle = "#d8d6cc";
    ctx.beginPath(); ctx.roundRect(tl.x + (br.x - tl.x) * x, ty - 9 * s, len * s, 9 * s, 4 * s); ctx.fill();
  }
  const dx = tl.x + (br.x - tl.x) * 0.7;
  ctx.fillStyle = "#2a2018"; ctx.beginPath(); ctx.roundRect(dx, ty - 26 * s, 120 * s, 26 * s, 4 * s); ctx.fill();
  ctx.fillStyle = "#8c8a80"; ctx.fillRect(dx + 4 * s, ty - 6 * s, 112 * s, 6 * s);
}

// ── the cabinets, standing in the hall itself ───────────────────────────────
// A cabinet against a wall, built in the hall's own projection: its front of
// drawers faces across the hall and is seen at a slant, its end faces us, its
// top is seen from above. Oak, gone dark with varnish; brass handles and
// card-holders; the edges catching what light there is. Returns where the
// middle of its top is on the screen, and the scale there, for what stands on it.
export function labCabinet(ctx, L, side, z0, z1, { depth = 0.11, height = 0.3, rows = 3, cols = 3, glass = false } = {}) {
  const { P, wall, floor, H } = L;
  const Xw = side * wall, Xf = side * (wall - wall * depth), top = floor - H * height;
  const face = (Y, t, X = Xf) => P(X, Y, z0 + (z1 - z0) * t);
  const quad = (pts, fillStyle) => { polygon(ctx, pts); ctx.fillStyle = fillStyle; ctx.fill(); };
  const kAt = (t) => (H / 700) / (z0 + (z1 - z0) * t);
  // its shadow on the floor
  const sh = P((Xw + Xf) / 2, floor, (z0 + z1) / 2);
  soft(ctx, sh.x, sh.y, Math.abs(P(Xf, floor, z0).x - P(Xw, floor, z1).x) * 0.8, (H * 0.03) / z0, "0,0,0", 0.7);
  // the front, all of it, then its drawers
  const front = [face(top, 0), face(top, 1), face(floor, 1), face(floor, 0)];
  quad(front, gradient(ctx, front[0].x, 0, front[1].x, 0, [[0, "#3a2718"], [1, "#1c120a"]]));
  const plinth = H * 0.025, frame = 0.05;
  const cell = (r, c) => {
    const y0 = top + (floor - plinth - top) * (r / rows), y1 = top + (floor - plinth - top) * ((r + 1) / rows);
    const t0 = c / cols, t1 = (c + 1) / cols;
    const pad = (y1 - y0) * 0.09, padT = (t1 - t0) * frame;
    return { y0: y0 + pad, y1: y1 - pad, t0: t0 + padT, t1: t1 - padT };
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = cell(r, c), glazed = glass && r < rows - 1;
      const pts = [face(d.y0, d.t0), face(d.y0, d.t1), face(d.y1, d.t1), face(d.y1, d.t0)];
      const mid = (d.t0 + d.t1) / 2, k = kAt(mid);
      if (glazed) {
        // a glazed door: the dark inside, bottles on the shelf, the glass's sheen
        quad(pts, "#0b0e0c");
        for (let i = 0; i < 3; i++) {
          const p = face(d.y1 - (d.y1 - d.y0) * 0.04, d.t0 + (d.t1 - d.t0) * (0.22 + i * 0.28));
          // as tall as the shelf on the screen allows, its stopper clear of the shelf above
          const shelfH = face(d.y1, d.t0 + (d.t1 - d.t0) * (0.22 + i * 0.28)).y - face(d.y0, d.t0 + (d.t1 - d.t0) * (0.22 + i * 0.28)).y;
          vessel(ctx, p.x, p.y, 15 * k * (1 + (i % 2) * 0.2), shelfH * (0.5 + (i % 3) * 0.1), { amber: i % 2 === 0, stoppered: true, liquid: i % 2 ? "50,102,105" : "103,77,32" });
        }
        quad([face(d.y0, d.t0), face(d.y0, d.t0 + (d.t1 - d.t0) * 0.18), face(d.y1, d.t0 + (d.t1 - d.t0) * 0.1), face(d.y1, d.t0)], "rgba(170,200,190,0.07)");
        ctx.strokeStyle = "#3a2718"; ctx.lineWidth = Math.max(0.8, 2 * k);
        polygon(ctx, pts); ctx.stroke();
      } else {
        // a drawer: its face, a dark gap round it, light along its top edge
        quad(pts, gradient(ctx, pts[0].x, pts[0].y, pts[2].x, pts[2].y, [[0, "#4e3622"], [0.6, "#352313"], [1, "#24170c"]]));
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = Math.max(0.6, 1.2 * k);
        polygon(ctx, pts); ctx.stroke();
        ctx.strokeStyle = "rgba(255,214,160,0.16)";
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
        // a brass card-holder, the card in it
        const card = face(d.y0 + (d.y1 - d.y0) * 0.27, mid);
        ctx.fillStyle = "#8a7444"; ctx.fillRect(card.x - 4 * k, card.y - 3 * k, 8 * k, 6 * k);
        ctx.fillStyle = "#cbbf9a"; ctx.fillRect(card.x - 3.2 * k, card.y - 2.2 * k, 6.4 * k, 4.4 * k);
      }
      // the brass handle, its shadow under it
      const h = face(d.y0 + (d.y1 - d.y0) * (glazed ? 0.5 : 0.6), glazed ? d.t1 - (d.t1 - d.t0) * 0.08 : mid);
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(h.x + 1.5 * k, h.y + 2 * k, 3.2 * k, 2.6 * k, 0, 0, Math.PI * 2); ctx.fill();
      const bg = ctx.createLinearGradient(h.x, h.y - 3 * k, h.x, h.y + 3 * k);
      bg.addColorStop(0, "#f2d692"); bg.addColorStop(0.5, "#a07a34"); bg.addColorStop(1, "#4a3410");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(h.x, h.y, 3.2 * k, 2.6 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // the plinth at its foot
  quad([face(floor - plinth, 0), face(floor - plinth, 1), face(floor, 1), face(floor, 0)], "#120b06");
  // its end, toward us: plain, in shadow
  const end = [P(Xw, top, z0), P(Xf, top, z0), P(Xf, floor, z0), P(Xw, floor, z0)];
  quad(end, gradient(ctx, end[0].x, 0, end[1].x, 0, [[0, "#1a110a"], [1, "#2c1e12"]]));
  // the top: oak, lit, a thicker edge standing proud
  const lid = H * 0.012, over = side * wall * 0.006, Xo = Xf - over;
  const topQuad = [P(Xo, top - lid, z0 - 0.006), P(Xw, top - lid, z0 - 0.006), P(Xw, top - lid, z1 + 0.006), P(Xo, top - lid, z1 + 0.006)];
  quad(topQuad, gradient(ctx, topQuad[0].x, topQuad[0].y, topQuad[2].x, topQuad[2].y, [[0, "#6a4a2c"], [1, "#3a2816"]]));
  quad([P(Xo, top - lid, z0 - 0.006), P(Xw, top - lid, z0 - 0.006), P(Xw, top, z0 - 0.006), P(Xo, top, z0 - 0.006)], "#2a1c10");
  quad([P(Xo, top - lid, z0 - 0.006), P(Xo, top - lid, z1 + 0.006), P(Xo, top, z1 + 0.006), P(Xo, top, z0 - 0.006)], "#4a321c");
  ctx.strokeStyle = "rgba(255,220,170,0.22)"; ctx.lineWidth = Math.max(0.6, kAt(0));
  const e0 = P(Xo, top - lid, z0 - 0.006), e1 = P(Xo, top - lid, z1 + 0.006);
  ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
  const m = P((Xw + Xf) / 2, top - lid, (z0 + z1) / 2);
  return { x: m.x, y: m.y, k: kAt(0.5) };
}

// ── what stands on them, drawn in their own units (a pixel at the picture) ──

// a test tube: glass, a rolled lip, a round foot, the liquid in it and its
// meniscus, the light down one side of the glass
function testTube(ctx, x, y, len, r, liquid, level) {
  ctx.save(); ctx.translate(x, y);
  const body = () => { ctx.beginPath(); ctx.moveTo(-r, -len); ctx.lineTo(-r, -r); ctx.arc(0, -r, r, Math.PI, 0, true); ctx.lineTo(r, -len); ctx.closePath(); };
  body();
  ctx.fillStyle = "rgba(150,190,180,0.1)"; ctx.fill();
  ctx.save(); body(); ctx.clip();
  const lt = -len * level;
  const lg = ctx.createLinearGradient(-r, 0, r, 0);
  lg.addColorStop(0, `rgba(${liquid},0.55)`); lg.addColorStop(0.4, `rgba(${liquid},0.9)`); lg.addColorStop(1, `rgba(${liquid},0.6)`);
  ctx.fillStyle = lg; ctx.fillRect(-r, lt, r * 2, len);
  ctx.fillStyle = `rgba(${liquid.split(",").map((v) => Math.min(255, +v + 70)).join(",")},0.7)`;
  ctx.beginPath(); ctx.ellipse(0, lt, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.32)"; ctx.fillRect(-r * 0.7, -len * 0.95, r * 0.28, len * 0.85);
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(r * 0.55, -len, r * 0.45, len);
  ctx.restore();
  body(); ctx.strokeStyle = "rgba(200,225,215,0.7)"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = "rgba(220,235,228,0.85)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, -len, r * 1.18, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** A rack of test tubes: a wooden rack, two rails bored for six tubes, the
 *  tubes in it with what was being tried in them; one lying beside, stoppered. */
export function paintTubeRack(ctx) {
  const wood = (x, y, w, h, light) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, light ? "#b08454" : "#8a6038"); g.addColorStop(1, "#4a3018");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  soft(ctx, 0, 1, 70, 6, "0,0,0", 0.6);
  wood(-58, -6, 116, 6, false);
  for (const x of [-58, 52]) wood(x, -62, 6, 58, true);
  const colours = ["120,40,40", "60,110,150", "200,170,60", "70,140,80", "150,80,160", "230,200,180"];
  const levels = [0.45, 0.6, 0.3, 0.52, 0.38, 0.2];
  // the tubes, behind the front rail
  for (let i = 0; i < 6; i++) testTube(ctx, -42 + i * 17, -4, 66 + (i % 2) * 4, 5, colours[i], levels[i]);
  // the rails, bored, over them
  wood(-60, -46, 120, 7, true);
  wood(-60, -22, 120, 5, false);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(-42 + i * 17, -46, 6, 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
  // one tube lying on the bench, a cork in it
  ctx.save(); ctx.translate(30, -2); ctx.rotate(-Math.PI / 2 + 0.06);
  testTube(ctx, 0, 0, 62, 5, "120,40,40", 0.35);
  ctx.fillStyle = "#a07848"; ctx.fillRect(-4.6, -70, 9.2, 10);
  ctx.restore();
}

/** A chemist's balance under nobody's hand: a mahogany base on brass feet,
 *  a column, the beam across it with its pointer and scale, a pan hung on
 *  three wires from either end; a box of weights beside it, open. */
export function paintBalance(ctx) {
  const brass = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#5a3e12"); g.addColorStop(0.3, "#e8c97a"); g.addColorStop(0.55, "#b08a3a"); g.addColorStop(1, "#4a3008");
    return g;
  };
  soft(ctx, 0, 1, 80, 7, "0,0,0", 0.65);
  // the base
  const bg = ctx.createLinearGradient(0, -16, 0, 0);
  bg.addColorStop(0, "#6a2e1c"); bg.addColorStop(1, "#2e120a");
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-62, -16, 124, 13, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,200,160,0.22)"; ctx.fillRect(-62, -16, 124, 1.5);
  for (const x of [-56, 50]) { ctx.fillStyle = brass(x, x + 6); ctx.fillRect(x, -4, 6, 4); }
  // the column
  ctx.fillStyle = brass(-4, 4); ctx.fillRect(-4, -118, 8, 102);
  ctx.fillStyle = brass(-8, 8); ctx.fillRect(-8, -22, 16, 6);
  ctx.beginPath(); ctx.arc(0, -120, 6, 0, Math.PI * 2); ctx.fill();
  // the beam, very nearly level, and the pointer down from it to the scale
  ctx.save(); ctx.translate(0, -120); ctx.rotate(-0.02);
  ctx.fillStyle = brass(-60, 60);
  ctx.beginPath(); ctx.moveTo(-58, -1.5); ctx.lineTo(0, -5); ctx.lineTo(58, -1.5); ctx.lineTo(58, 1.5); ctx.lineTo(0, 3); ctx.lineTo(-58, 1.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a1e0a"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 74); ctx.stroke();
  ctx.restore();
  // the scale the pointer swings over
  ctx.fillStyle = "#d8cfae"; ctx.beginPath(); ctx.roundRect(-14, -52, 28, 9, 2); ctx.fill();
  ctx.strokeStyle = "#3a2e1a"; ctx.lineWidth = 0.7;
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 2.4, -52); ctx.lineTo(i * 2.4, -52 + (i % 5 === 0 ? 6 : 3.5)); ctx.stroke(); }
  // the pans, hung
  for (const d of [-1, 1]) {
    const x = d * 56, y = -120 + d * 1.2;
    ctx.strokeStyle = "rgba(200,180,120,0.85)"; ctx.lineWidth = 0.7;
    for (const o of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + o, -58); ctx.stroke(); }
    ctx.fillStyle = brass(x - 18, x + 18);
    ctx.beginPath(); ctx.ellipse(x, -57, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x, -57.5, 15, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  // a small weight in the left pan
  ctx.fillStyle = brass(-61, -51); ctx.fillRect(-60, -64, 8, 7); ctx.fillRect(-58, -67, 4, 3);
  // the box of weights, its lid back, the weights in their velvet
  ctx.save(); ctx.translate(86, 0);
  ctx.fillStyle = "#3a1e10"; ctx.fillRect(-18, -12, 36, 12);
  ctx.fillStyle = "#5a1a20"; ctx.fillRect(-15, -11, 30, 6);
  for (const [x, h] of [[-10, 7], [-2, 5], [5, 4], [11, 3]]) { ctx.fillStyle = brass(-18, 18); ctx.fillRect(x - 2, -11 - h, 4, h); }
  ctx.fillStyle = "#2a1408"; ctx.save(); ctx.translate(-18, -12); ctx.rotate(-1.9); ctx.fillRect(0, 0, 36, 3); ctx.restore();
  ctx.restore();
}

/** A distillation set up and left: a stand with its clamp, a round flask
 *  over a spirit lamp, the condenser sloping down from its neck into a
 *  receiving flask, a bottle of reagent by it. */
export function paintStill(ctx) {
  ellipse(ctx, -36, 2, 29, 5, "#151d19");
  line(ctx, [{ x: -52, y: 0 }, { x: -52, y: -137 }], "#8a907e", 2.6);
  line(ctx, [{ x: -52, y: -90 }, { x: -15, y: -90 }], "#a8a688", 2);
  // the spirit lamp, its blue flame
  ellipse(ctx, -15, -4, 12, 3, "#2a3a34");
  ctx.fillStyle = "rgba(120,160,150,0.35)"; ctx.beginPath(); ctx.ellipse(-15, -10, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
  soft(ctx, -15, -24, 10, 14, "120,170,255", 0.5, "lighter");
  vessel(ctx, -15, -28, 53, 94, { kind: "round", liquid: "72,135,126", level: 0.31 });
  ctx.save(); ctx.translate(-15, -120); ctx.rotate(0.49);
  ctx.fillStyle = "rgba(121,166,151,0.16)"; ctx.fillRect(0, -4, 80, 8);
  ctx.strokeStyle = "rgba(171,200,178,0.7)"; ctx.lineWidth = 0.7; ctx.strokeRect(0, -4, 80, 8);
  line(ctx, [{ x: -4, y: 0 }, { x: 89, y: 0 }], "#8aab9d", 1.3);
  for (const x of [7, 72]) { ctx.fillStyle = "#896b3e"; ctx.fillRect(x, -5, 3, 10); }
  ctx.restore();
  vessel(ctx, 56, -2, 29, 64, { kind: "flask", liquid: "116,144,100", level: 0.34 });
  vessel(ctx, -70, -1, 19, 42, { amber: true, stoppered: true, liquid: "96,91,48" });
}
