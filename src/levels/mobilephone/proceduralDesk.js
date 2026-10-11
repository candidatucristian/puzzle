import { canvasTexture, ellipse, linear, noiseField, radial, random, rounded, stipple } from "./materials.js";

/** Walnut fibres follow a warped grain field, with separate pores and lighting. */
function drawWalnut(ctx, W, H) {
  const noise = noiseField(92817);
  const pixels = ctx.createImageData(W, H);
  const data = pixels.data;
  const lampX = Float32Array.from({ length: W }, (_, x) => Math.exp(-Math.pow((x - W * 0.06) / (W * 0.78), 2)));
  for (let y = 0; y < H; y++) {
    const warmY = Math.exp(-Math.pow((y + H * 0.12) / (H * 0.8), 2));
    const board = y < H * 0.2 ? 0.98 : y < H * 0.64 ? 1.07 : 0.93;
    for (let x = 0; x < W; x++) {
      const broad = noise(x * 0.003, y * 0.009);
      const bend = (noise(x * 0.005, y * 0.018) - 0.5) * 17;
      const flow = y + bend + Math.sin(x * 0.0029 + y * 0.0102) * 9;
      const phase = flow * 0.36 + noise(x * 0.008, y * 0.095) * 3;
      const vein = Math.pow(0.5 + 0.5 * Math.sin(phase), 10);
      const fibre = noise(x * 0.029, flow * 0.41);
      const pore = noise(x * 0.42, y * 0.72);
      const value = (0.62 + (broad - 0.5) * 0.38 + (fibre - 0.5) * 0.26 - vein * 0.17 + (pore - 0.5) * 0.075) * board;
      const light = 0.77 + lampX[x] * warmY * 0.87;
      const cool = x / W;
      const i = (y * W + x) * 4;
      data[i] = (105 * value + 6) * light;
      data[i + 1] = (66 * value + 4) * light;
      data[i + 2] = (38 * value + 3) * light + cool * cool * 5;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);

  const rnd = random(9703);
  // Recessed joins have an irregular dark groove and a very restrained lip.
  for (const y of [H * 0.2, H * 0.64]) {
    ctx.strokeStyle = "rgba(8,5,2,0.5)"; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(0, y);
    ctx.bezierCurveTo(W * 0.25, y - 1.5, W * 0.66, y + 1.3, W, y - 0.5); ctx.stroke();
    ctx.strokeStyle = "rgba(212,170,105,0.11)"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(0, y + 1.8); ctx.lineTo(W, y + 1.4); ctx.stroke();
  }
  for (let i = 0; i < 360; i++) {
    const x = rnd() * W, y = rnd() * H, length = 3 + rnd() ** 3 * 63;
    ctx.strokeStyle = `rgba(205,167,109,${0.025 + rnd() * 0.065})`;
    ctx.lineWidth = 0.35 + rnd() * 0.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y + (rnd() - 0.5) * 3); ctx.stroke();
  }
  // Worn polish catches the lamp across a broad, barely visible reflection.
  ctx.fillStyle = radial(ctx, W * 0.18, H * 0.06, 0, W * 0.7,
    [[0, "rgba(215,162,78,0.06)"], [0.5, "rgba(215,162,78,0.025)"], [1, "rgba(215,162,78,0)"]]);
  ctx.fillRect(0, 0, W, H);
}

function drawCup(ctx) {
  const cx = 196, cy = 146, R = 103;
  const handle = new Path2D();
  handle.ellipse(cx - 112, cy + 1, 44, 25, -0.05, 0, Math.PI * 2);
  handle.ellipse(cx - 115, cy + 1, 24, 12, -0.05, 0, Math.PI * 2);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 14; ctx.shadowOffsetY = 19;
  ctx.fillStyle = "#77715d"; ctx.fill(handle, "evenodd");
  ellipse(ctx, cx, cy, R, R, "#514737");
  ctx.restore();
  ctx.fillStyle = linear(ctx, cx - 160, cy - 25, cx - 100, cy + 24, [
    [0, "#b5aa88"], [0.18, "#efe4c6"], [0.45, "#d2c5a6"], [0.78, "#938367"], [1, "#544d3b"],
  ]);
  ctx.fill(handle, "evenodd");

  ellipse(ctx, cx + 1, cy + 2, R, R,
    linear(ctx, cx - R, cy - R, cx + R, cy + R, [[0, "#f5ead0"], [0.35, "#d1c4a1"], [0.7, "#aca080"], [1, "#6e6249"]]));
  ellipse(ctx, cx, cy - 0.7, R - 3, R - 3,
    radial(ctx, cx - 8, cy - 10, 72, 106, [[0, "#9d8c66"], [0.45, "#c9ba96"], [0.75, "#ebe1c7"], [0.92, "#f2e9d2"], [1, "#9f9477"]]));
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R - 4, 0, Math.PI * 2); ctx.clip();
  stipple(ctx, 6301, cx - R, cy - R, R * 2, R * 2, 18000, 0.035, 0.6);
  ctx.restore();

  // The dark inner wall is deeper on the side facing away from the lamp.
  ellipse(ctx, cx, cy, 86, 86,
    linear(ctx, cx - 60, cy - 65, cx + 62, cy + 62, [[0, "#302310"], [0.4, "#665032"], [0.74, "#a58a60"], [1, "#bca783"]]));
  ellipse(ctx, cx, cy + 2, 79, 79,
    radial(ctx, cx - 24, cy - 31, 0, 125, [[0, "#322416"], [0.4, "#1c160e"], [0.73, "#0e100c"], [1, "#16140c"]]));
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy + 2, 78.5, 0, Math.PI * 2); ctx.clip();
  const rnd = random(765);
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2;
    const radius = 74 + rnd() * 4;
    const r = 0.4 + rnd() ** 2 * 2;
    const x = cx + Math.cos(a) * radius, y = cy + 2 + Math.sin(a) * radius;
    ellipse(ctx, x, y, r, r, "rgba(177,125,59,0.4)");
    ellipse(ctx, x + 0.1, y - 0.2, r * 0.55, r * 0.55, "rgba(13,13,6,0.8)");
    ellipse(ctx, x - r * 0.4, y - r * 0.4, r * 0.24, r * 0.16, "rgba(231,193,126,0.43)");
  }
  ctx.save(); ctx.filter = "blur(4px)";
  ellipse(ctx, cx - 47, cy - 21, 8, 26, "rgba(246,228,186,0.15)");
  ellipse(ctx, cx - 44, cy - 27, 3, 16, "rgba(246,235,213,0.22)");
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = "rgba(251,244,220,0.58)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(cx, cy, 100, 3.4, 4.92); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.strokeStyle = "rgba(233,223,192,0.36)";
  ctx.beginPath(); ctx.arc(cx, cy, 87, 0.2, 1.7); ctx.stroke();
}

function drawCoffeeRing(ctx) {
  const rnd = random(534);
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(65,28,8,${0.035 + rnd() * 0.035})`;
    ctx.lineWidth = 0.6 + rnd() * 2.7;
    ctx.beginPath(); ctx.ellipse(110 + rnd() * 2, 110 + rnd() * 2, 82 + rnd() * 4, 79 + rnd() * 4,
      -0.1, rnd() * 0.5, Math.PI * (1.52 + rnd() * 0.4)); ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2, radius = 83 + rnd() * 10;
    ellipse(ctx, 110 + Math.cos(a) * radius, 110 + Math.sin(a) * radius,
      0.7 + rnd() * 3.7, 0.8 + rnd() * 2.5, "rgba(34,16,5,0.22)");
  }
}

function paperPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(13, 12); ctx.lineTo(316, 12); ctx.lineTo(314, 226);
  ctx.quadraticCurveTo(306, 245, 288, 247); ctx.lineTo(13, 247); ctx.closePath();
}

function drawPaper(ctx) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 7;
  paperPath(ctx); ctx.fillStyle = "#b8a887"; ctx.fill();
  ctx.restore();
  paperPath(ctx);
  ctx.fillStyle = linear(ctx, 15, 12, 310, 248, [[0, "#ddd1b2"], [0.5, "#d3c5a4"], [1, "#b9a781"]]); ctx.fill();
  ctx.save(); ctx.clip();
  stipple(ctx, 311, 0, 0, 330, 260, 55000, 0.10, 0.9);
  const rnd = random(7612);
  for (let i = 0; i < 350; i++) {
    const x = rnd() * 330, y = rnd() * 260;
    ctx.strokeStyle = "rgba(92,69,36,0.065)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1 + rnd() * 3, y + rnd() * 1.5); ctx.stroke();
  }
  ctx.fillStyle = radial(ctx, 319, 252, 2, 37, [[0, "rgba(85,61,28,0.2)"], [1, "rgba(85,61,28,0)"]]);
  ctx.fillRect(265, 198, 65, 62);
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(288, 247); ctx.quadraticCurveTo(296, 230, 314, 226);
  ctx.quadraticCurveTo(307, 249, 288, 247);
  ctx.fillStyle = linear(ctx, 290, 227, 311, 248, [[0, "#aea080"], [0.48, "#e1d6b9"], [0.8, "#f2e6c8"], [1, "#b4a481"]]); ctx.fill();
  ctx.strokeStyle = "rgba(234,222,191,0.28)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(13, 247); ctx.lineTo(13, 12); ctx.lineTo(316, 12); ctx.stroke();
}

function brass(ctx, top, bottom) {
  return linear(ctx, 0, top, 0, bottom, [
    [0, "#4d3821"], [0.18, "#b3955e"], [0.32, "#e5d1a0"], [0.4, "#82673a"],
    [0.57, "#4d3a21"], [0.79, "#af8a4d"], [0.94, "#d3b575"], [1, "#4b3820"],
  ]);
}

function drawPen(ctx) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.72)"; ctx.shadowBlur = 9;
  ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 7;
  rounded(ctx, 19, 24, 316, 27, 12, "#11160e");
  ctx.restore();
  rounded(ctx, 19, 24, 313, 26, 11, linear(ctx, 0, 24, 0, 50, [
    [0, "#080d08"], [0.14, "#30372c"], [0.27, "#626557"], [0.36, "#262f23"],
    [0.6, "#0a1209"], [0.85, "#11190f"], [1, "#293022"],
  ]));
  for (const [x, w] of [[31, 4], [143, 5], [152, 2], [295, 4], [311, 3]])
    rounded(ctx, x, 23.4, w, 27, 0.8, brass(ctx, 23, 51));
  rounded(ctx, 318, 27, 21, 19, 4, linear(ctx, 0, 27, 0, 46, [[0, "#5a614e"], [0.26, "#1c2919"], [0.8, "#060e05"], [1, "#394230"]]));
  for (let x = 321; x < 337; x += 2) rounded(ctx, x, 28, 0.6, 17, 0.2, "rgba(0,0,0,0.4)");
  // A tapered fountain-pen nib, including its slit and breather hole.
  ctx.beginPath(); ctx.moveTo(334, 28); ctx.bezierCurveTo(350, 27, 371, 32, 391, 37);
  ctx.bezierCurveTo(371, 42, 349, 47, 334, 45); ctx.closePath();
  ctx.fillStyle = brass(ctx, 27, 47); ctx.fill();
  ctx.strokeStyle = "rgba(236,219,173,0.52)"; ctx.lineWidth = 0.65; ctx.stroke();
  ctx.strokeStyle = "#372a19"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(355, 36.5); ctx.lineTo(390, 37); ctx.stroke();
  ellipse(ctx, 355, 36.5, 1.6, 1.6, "#302417");
  ctx.strokeStyle = "rgba(64,44,20,0.55)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(339, 31); ctx.quadraticCurveTo(350, 35, 348, 36.5);
  ctx.quadraticCurveTo(350, 39, 339, 42); ctx.stroke();
  rounded(ctx, 43, 26, 85, 3.5, 1.6, "rgba(0,0,0,0.5)");
  rounded(ctx, 41, 23.6, 87, 3.3, 1.5, brass(ctx, 23, 28));
  ellipse(ctx, 126, 26, 3.2, 2.5, "#b29764");
  ctx.strokeStyle = "rgba(235,227,195,0.13)"; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(161, 29.5); ctx.lineTo(286, 29.5); ctx.stroke();
}

export function prepareDesk(scene, art) {
  canvasTexture(scene, art.key, art.width, art.height, drawWalnut);
  canvasTexture(scene, "mp_cup_code", 340, 312, drawCup);
  canvasTexture(scene, "mp_coffee_ring_code", 220, 220, drawCoffeeRing);
  canvasTexture(scene, "mp_note_code", 330, 270, drawPaper);
  canvasTexture(scene, "mp_pen_code", 414, 82, drawPen);
}
