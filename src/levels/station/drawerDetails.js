import { lcg, soft } from "../../shared/paint.js";

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
}

function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [p, color] of stops) g.addColorStop(p, color);
  return g;
}

function polygon(ctx, points) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.closePath();
}

/** The inside faces sit below a narrow lip; the front board carries a brass pull. */
export function paintDrawerDepth(ctx, W, H, S) {
  const b = S * 0.055, rim = S * 0.014;
  const rnd = lcg(2604);
  const faces = [
    { points: [[rim, rim], [W - rim, rim], [W - b, b * 1.45], [b, b * 1.45]], horizontal: true,
      light: "#6b4b30", dark: "#24170e", from: [0, rim], to: [0, b * 1.45] },
    { points: [[rim, rim], [b, b * 1.45], [b, H - b * 1.75], [rim, H - b * 0.65]], horizontal: false,
      light: "#63432a", dark: "#21160e", from: [rim, 0], to: [b, 0] },
    { points: [[W - rim, rim], [W - b, b * 1.45], [W - b, H - b * 1.75], [W - rim, H - b * 0.65]], horizontal: false,
      light: "#4b301e", dark: "#20140c", from: [W - rim, 0], to: [W - b, 0] },
    { points: [[b, H - b * 1.75], [W - b, H - b * 1.75], [W - rim, H - b * 0.65], [rim, H - b * 0.65]], horizontal: true,
      light: "#67472d", dark: "#25190f", from: [0, H - b * 0.65], to: [0, H - b * 1.75] },
  ];
  for (const face of faces) {
    ctx.save(); polygon(ctx, face.points); ctx.clip();
    ctx.fillStyle = linear(ctx, ...face.from, ...face.to, [[0, face.light], [0.55, "#48311f"], [1, face.dark]]);
    ctx.fillRect(0, 0, W, H);
    const xs = face.points.map(p => p[0]), ys = face.points.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let i = 0; i < 70; i++) {
      ctx.lineWidth = S * (0.00035 + rnd() * 0.001);
      ctx.strokeStyle = rnd() < 0.6 ? "rgba(9,4,1,0.22)" : "rgba(222,179,113,0.13)";
      ctx.beginPath();
      if (face.horizontal) {
        const y = y0 + rnd() * (y1 - y0), bow = (rnd() - 0.5) * b * 0.15;
        ctx.moveTo(x0, y); ctx.bezierCurveTo(W * 0.3, y + bow, W * 0.65, y - bow, x1, y);
      } else {
        const x = x0 + rnd() * (x1 - x0), bow = (rnd() - 0.5) * b * 0.12;
        ctx.moveTo(x, y0); ctx.bezierCurveTo(x + bow, H * 0.3, x - bow, H * 0.7, x, y1);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // A groove where the lining disappears under the sides, and softer contact shadows.
  ctx.strokeStyle = "rgba(8,5,2,0.85)"; ctx.lineWidth = S * 0.003;
  ctx.strokeRect(b, b * 1.45, W - b * 2, H - b * 3.2);
  const depth = S * 0.035;
  for (const [x0, y0, x1, y1, x, y, w, h] of [
    [0, b * 1.45, 0, b * 1.45 + depth, b, b * 1.45, W - b * 2, depth],
    [0, H - b * 1.75, 0, H - b * 1.75 - depth, b, H - b * 1.75 - depth, W - b * 2, depth],
    [b, 0, b + depth, 0, b, b * 1.45, depth, H - b * 3.2],
    [W - b, 0, W - b - depth, 0, W - b - depth, b * 1.45, depth, H - b * 3.2],
  ]) {
    ctx.fillStyle = linear(ctx, x0, y0, x1, y1, [[0, "rgba(0,0,0,0.55)"], [1, "rgba(0,0,0,0)"]]);
    ctx.fillRect(x, y, w, h);
  }
  // Worn lip and exposed front panel, with small brads and scratched varnish.
  ctx.fillStyle = "rgba(218,174,112,0.24)";
  ctx.fillRect(rim, rim, W - rim * 2, S * 0.0015);
  ctx.fillRect(rim, rim, S * 0.0015, H - rim * 2);
  const front = H - b * 0.65;
  ctx.fillStyle = linear(ctx, 0, front, 0, H, [[0, "#86603b"], [0.12, "#4f321d"], [1, "#2d1c10"]]);
  ctx.fillRect(0, front, W, H - front);
  for (let i = 0; i < 40; i++) {
    const y = front + rnd() * (H - front);
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(10,5,2,0.25)" : "rgba(205,161,98,0.14)";
    ctx.lineWidth = S * 0.0007; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + (rnd() - 0.5) * 3); ctx.stroke();
  }
  for (const x of [rim * 0.6, W - rim * 0.6]) for (const y of [b * 1.1, H - b * 1.3]) {
    ellipse(ctx, x, y, S * 0.0026, S * 0.0026, "#100c09");
    ellipse(ctx, x - S * 0.0005, y - S * 0.0007, S * 0.0015, S * 0.0015, "#797367");
  }
  const cy = front + (H - front) * 0.53, half = S * 0.064;
  soft(ctx, W / 2, cy + S * 0.005, half * 1.3, S * 0.009, "0,0,0", 0.7);
  for (const x of [W / 2 - half, W / 2 + half]) {
    ellipse(ctx, x, cy, S * 0.012, S * 0.009, "#281c0d");
    ellipse(ctx, x, cy - S * 0.001, S * 0.0105, S * 0.007, "#a18148");
    ctx.strokeStyle = "#2c2318"; ctx.lineWidth = S * 0.001;
    ctx.beginPath(); ctx.moveTo(x - S * 0.002, cy - S * 0.002); ctx.lineTo(x + S * 0.002, cy + S * 0.002); ctx.stroke();
  }
  const pull = () => {
    ctx.beginPath(); ctx.moveTo(W / 2 - half, cy);
    ctx.bezierCurveTo(W / 2 - half * 0.8, cy + S * 0.01, W / 2 + half * 0.8, cy + S * 0.01, W / 2 + half, cy);
  };
  ctx.lineCap = "round"; pull(); ctx.strokeStyle = "#3c2912"; ctx.lineWidth = S * 0.008; ctx.stroke();
  pull(); ctx.strokeStyle = "#a3834e"; ctx.lineWidth = S * 0.0045; ctx.stroke();
  pull(); ctx.strokeStyle = "#d0b27c"; ctx.lineWidth = S * 0.0012; ctx.stroke(); ctx.lineCap = "butt";
}

function paintYarn(ctx, x, y, r) {
  const rnd = lcg(1703);
  soft(ctx, x + r * 0.12, y + r * 0.27, r * 1.25, r * 0.84, "0,0,0", 0.72);
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
  // The loose end curls across the lining, with a fine shadow below its fibres.
  const loose = () => {
    ctx.beginPath(); ctx.moveTo(0.75, 0.48);
    ctx.bezierCurveTo(1.48, 1.01, 2.78, 0.91, 2.54, 0.18);
    ctx.bezierCurveTo(2.35, -0.39, 1.49, -0.13, 1.8, 0.42);
    ctx.bezierCurveTo(2.06, 0.91, 3.03, 0.47, 3.43, 0.61);
  };
  ctx.save(); ctx.translate(0.012, 0.035); loose(); ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = 0.043; ctx.stroke(); ctx.restore();
  loose(); ctx.strokeStyle = "#b2a183"; ctx.lineWidth = 0.027; ctx.stroke();
  loose(); ctx.strokeStyle = "#e0d3b7"; ctx.lineWidth = 0.009; ctx.stroke();
  // A steel needle passes through the ball; only its point and eye protrude.
  ctx.save(); ctx.rotate(-0.29); ctx.translate(0, -0.1);
  ctx.beginPath(); ctx.moveTo(-1.53, 0); ctx.lineTo(1.49, -0.018);
  ctx.quadraticCurveTo(1.69, -0.06, 1.72, 0); ctx.quadraticCurveTo(1.69, 0.06, 1.49, 0.018); ctx.closePath();
  ctx.fillStyle = linear(ctx, 0, -0.04, 0, 0.04, [[0, "#3b4246"], [0.45, "#e5e8dc"], [0.6, "#979f9f"], [1, "#333d40"]]); ctx.fill();
  ellipse(ctx, 1.59, 0, 0.075, 0.017, "#273026");
  ctx.strokeStyle = "#c9ba97"; ctx.lineWidth = 0.013;
  ctx.beginPath(); ctx.moveTo(1.59, 0.01); ctx.bezierCurveTo(1.98, 0.52, 1.6, 0.74, 1.03, 0.44); ctx.stroke();
  ctx.restore();
  const body = ctx.createRadialGradient(-0.32, -0.38, 0.04, 0.09, 0.07, 1.12);
  body.addColorStop(0, "#d7c8a8"); body.addColorStop(0.5, "#ae9974"); body.addColorStop(1, "#53452f");
  ellipse(ctx, 0, 0, 1, 0.94, body);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 1, 0.94, 0, 0, Math.PI * 2); ctx.clip();
  const wind = (angle, band = false) => {
    ctx.save(); ctx.rotate(angle);
    if (band) { ctx.beginPath(); ctx.rect(-1.1, -0.37, 2.2, 0.67); ctx.clip(); }
    for (let i = -36; i <= 36; i++) {
      const v = i / 37, reach = Math.sqrt(1 - v * v), bow = (1 - v * v) * 0.31;
      const path = () => {
        ctx.beginPath(); ctx.moveTo(-reach, v);
        ctx.bezierCurveTo(-reach * 0.38, v + bow, reach * 0.4, v + bow * 0.81, reach, v);
      };
      path(); ctx.strokeStyle = "rgba(55,40,22,0.7)"; ctx.lineWidth = 0.036; ctx.stroke();
      path(); ctx.strokeStyle = i % 3 ? "#bdaa88" : "#caba99"; ctx.lineWidth = 0.023; ctx.stroke();
      ctx.save(); ctx.translate(-0.003, -0.008); path(); ctx.strokeStyle = "rgba(248,233,197,0.45)"; ctx.lineWidth = 0.007; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  };
  wind(-0.52); wind(0.91, true);
  // Fine broken fibres and uneven fibres at the winding crossings.
  for (let i = 0; i < 700; i++) {
    const px = (rnd() - 0.5) * 2, py = (rnd() - 0.5) * 1.9;
    ctx.strokeStyle = rnd() < 0.6 ? "rgba(244,229,194,0.28)" : "rgba(53,37,20,0.25)";
    ctx.lineWidth = 0.004; ctx.beginPath(); ctx.moveTo(px, py);
    ctx.lineTo(px + (rnd() - 0.5) * 0.075, py + (rnd() - 0.5) * 0.04); ctx.stroke();
  }
  const shade = ctx.createRadialGradient(-0.34, -0.4, 0.17, 0.1, 0.12, 1.12);
  shade.addColorStop(0, "rgba(255,236,191,0.24)"); shade.addColorStop(0.45, "rgba(45,29,15,0)"); shade.addColorStop(1, "rgba(37,24,12,0.65)");
  ctx.fillStyle = shade; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  ctx.restore();
}

function paintButton(ctx, x, y, r, color, angle, holes = 4) {
  soft(ctx, x + r * 0.15, y + r * 0.24, r * 1.3, r * 0.88, "0,0,0", 0.65);
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(1, 0.88);
  ellipse(ctx, 0, r * 0.12, r, r, "#211c15");
  const sheen = ctx.createRadialGradient(-r * 0.4, -r * 0.5, 0, r * 0.1, r * 0.1, r * 1.3);
  sheen.addColorStop(0, color[0]); sheen.addColorStop(0.55, color[1]); sheen.addColorStop(1, color[2]);
  ellipse(ctx, 0, 0, r, r, sheen);
  ctx.strokeStyle = "rgba(255,245,218,0.36)"; ctx.lineWidth = r * 0.065;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.91, Math.PI * 0.95, Math.PI * 1.86); ctx.stroke();
  ctx.strokeStyle = "rgba(30,23,17,0.45)"; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
  ellipse(ctx, 0, 0, r * 0.62, r * 0.62, "rgba(28,24,19,0.12)");
  for (const [xx, yy] of holes === 4 ? [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]] : [[-0.25, 0], [0.25, 0]]) {
    ellipse(ctx, xx * r, yy * r + r * 0.03, r * 0.135, r * 0.135, "rgba(241,225,183,0.5)");
    ellipse(ctx, xx * r, yy * r, r * 0.10, r * 0.10, "#171d14");
  }
  ctx.restore();
}

function paintThimble(ctx, x, y, r) {
  soft(ctx, x + r * 0.13, y + r * 0.5, r * 1.2, r * 0.72, "0,0,0", 0.65);
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.24);
  const body = linear(ctx, -r, 0, r, 0, [[0, "#49453a"], [0.28, "#b3ad96"], [0.4, "#d4cdb4"], [0.62, "#7d7c6c"], [1, "#323a35"]]);
  ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.65); ctx.lineTo(-r * 0.72, -r * 0.7);
  ctx.bezierCurveTo(-r * 0.58, -r * 1.13, r * 0.58, -r * 1.13, r * 0.72, -r * 0.7);
  ctx.lineTo(r * 0.9, r * 0.65); ctx.quadraticCurveTo(0, r * 1.1, -r * 0.9, r * 0.65); ctx.fillStyle = body; ctx.fill();
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
    const xx = (col - 3) * r * 0.18 + (row % 2) * r * 0.06, yy = (row - 3.7) * r * 0.17;
    ellipse(ctx, xx, yy, r * 0.048, r * 0.039, "rgba(34,34,28,0.65)");
    ellipse(ctx, xx - r * 0.005, yy + r * 0.035, r * 0.04, r * 0.015, "rgba(225,215,181,0.48)");
  }
  ellipse(ctx, 0, r * 0.67, r * 0.93, r * 0.31, "#797b68");
  ellipse(ctx, 0, r * 0.68, r * 0.76, r * 0.22, "#22271e");
  ctx.restore();
}

function paintCloth(ctx, x, y, s) {
  const rnd = lcg(331);
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.09);
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = s * 0.07; ctx.shadowOffsetY = s * 0.04;
  polygon(ctx, [[-s * 0.62, -s * 0.32], [s * 0.53, -s * 0.35], [s * 0.6, s * 0.31], [-s * 0.55, s * 0.37]]);
  ctx.fillStyle = "#978d6e"; ctx.fill(); ctx.shadowColor = "transparent";
  ctx.save(); ctx.clip();
  ctx.fillStyle = linear(ctx, -s * 0.6, 0, s * 0.6, s * 0.25, [[0, "#c0b79a"], [0.45, "#a39b7e"], [0.49, "#d0c6a6"], [0.53, "#b9af91"], [1, "#8d866c"]]);
  ctx.fillRect(-s, -s, s * 2, s * 2);
  for (let i = -90; i <= 90; i++) {
    const p = i * s / 140;
    ctx.strokeStyle = i % 2 ? "rgba(242,231,191,0.16)" : "rgba(55,47,27,0.15)";
    ctx.lineWidth = s * 0.0017;
    ctx.beginPath(); ctx.moveTo(-s, p); ctx.lineTo(s, p + s * 0.015); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, -s); ctx.lineTo(p + s * 0.04, s); ctx.stroke();
  }
  ctx.setLineDash([s * 0.014, s * 0.023]); ctx.strokeStyle = "rgba(63,54,34,0.46)"; ctx.lineWidth = s * 0.004;
  polygon(ctx, [[-s * 0.57, -s * 0.27], [s * 0.48, -s * 0.3], [s * 0.55, s * 0.26], [-s * 0.5, s * 0.32]]); ctx.stroke();
  ctx.restore();
  ctx.lineWidth = s * 0.002; ctx.strokeStyle = "rgba(201,192,155,0.65)";
  for (let i = 0; i < 30; i++) {
    const xx = -s * 0.54 + i * s * 0.038, yy = s * (0.37 - (xx / s + 0.55) * 0.053);
    ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + (rnd() - 0.5) * s * 0.02, yy + rnd() * s * 0.035); ctx.stroke();
  }
  ctx.restore();
}

function paintSafetyPin(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.34);
  ctx.lineCap = "round";
  const outline = () => {
    ctx.beginPath(); ctx.moveTo(s * 0.42, -s * 0.11); ctx.lineTo(-s * 0.3, -s * 0.1);
    ctx.bezierCurveTo(-s * 0.65, -s * 0.1, -s * 0.56, s * 0.2, -s * 0.33, s * 0.15);
    ctx.lineTo(s * 0.43, s * 0.055);
    ctx.moveTo(-s * 0.33, s * 0.02); ctx.arc(-s * 0.36, s * 0.04, s * 0.055, -0.4, Math.PI * 1.9);
  };
  ctx.save(); ctx.translate(s * 0.02, s * 0.03); outline(); ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = s * 0.04; ctx.stroke(); ctx.restore();
  outline(); ctx.strokeStyle = "#736c55"; ctx.lineWidth = s * 0.025; ctx.stroke();
  outline(); ctx.strokeStyle = "#c8c4a7"; ctx.lineWidth = s * 0.009; ctx.stroke();
  polygon(ctx, [[s * 0.35, -s * 0.14], [s * 0.49, -s * 0.14], [s * 0.5, s * 0.1], [s * 0.37, s * 0.1]]);
  ctx.fillStyle = linear(ctx, s * 0.35, 0, s * 0.5, 0, [[0, "#525542"], [0.4, "#bcb496"], [1, "#686650"]]); ctx.fill();
  ctx.restore();
}

/** Cached Canvas decorations, arranged in the free bands above and below the clues. */
export function paintSewingBits(ctx, W, H, S) {
  paintYarn(ctx, W * 0.205, H * 0.162, S * 0.059);
  paintThimble(ctx, W * 0.646, H * 0.182, S * 0.022);
  paintCloth(ctx, W * 0.85, H * 0.814, S * 0.16);
  paintSafetyPin(ctx, W * 0.53, H * 0.797, S * 0.082);
  const pearl = ["#e0d6ba", "#b9b69f", "#616956"];
  const horn = ["#9b7951", "#654c31", "#322619"];
  const blue = ["#9caaa7", "#687e80", "#324446"];
  for (const [fx, fy, r, color, angle, holes] of [
    [0.473, 0.153, 0.020, pearl, -0.25, 4],
    [0.516, 0.208, 0.016, horn, 0.5, 4],
    [0.554, 0.127, 0.019, blue, -0.3, 2],
    [0.162, 0.791, 0.018, horn, -0.4, 4],
    [0.199, 0.827, 0.015, pearl, 0.3, 2],
    [0.834, 0.802, 0.015, pearl, -0.7, 4],
  ]) paintButton(ctx, W * fx, H * fy, S * r, color, angle, holes);
}
