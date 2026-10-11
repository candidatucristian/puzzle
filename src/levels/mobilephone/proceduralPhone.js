import { canvasTexture, ellipse, linear, noiseField, radial, random, rounded, stipple } from "./materials.js";

/** Rounded-surface normals give the shell a broad bevel and material reflections. */
function drawPolymer(ctx) {
  const canvas = document.createElement("canvas");
  canvas.width = 660;
  canvas.height = 1376;
  const surface = canvas.getContext("2d");
  const pixels = surface.createImageData(canvas.width, canvas.height);
  const noise = noiseField(50321);
  for (let py = 0; py < canvas.height; py++) {
    const y = py / 2 - 288;
    for (let px = 0; px < canvas.width; px++) {
      const x = px / 2 - 165;
      // The distance to a rounded rectangle approximates the bevel under the
      // exact silhouette. The face itself has a gentle convex curvature.
      const qx = Math.abs(x) - 99, qy = Math.abs(y - 54) - 282;
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const length = Math.hypot(ox, oy);
      const distance = 48 - (length + Math.min(Math.max(qx, qy), 0));
      const bevel = Math.max(0, Math.min(1, 1 - distance / 17));
      const ex = length > 0 ? ox / length : qx > qy ? 1 : 0;
      const ey = length > 0 ? oy / length : qx > qy ? 0 : 1;
      const pore = noise(x * 0.87, y * 0.87);
      let nx = Math.sign(x) * ex * bevel * 0.8 + x * 0.0011;
      let ny = Math.sign(y - 54) * ey * bevel * 0.8 + (y - 54) * 0.0001;
      nx += (noise(x * 0.87 + 0.7, y * 0.87) - pore) * 0.13;
      ny += (noise(x * 0.87, y * 0.87 + 0.7) - pore) * 0.13;
      const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
      const diffuse = Math.max(0, -nx * 0.49 - ny * 0.56 + nz * 0.67);
      const reflection = Math.pow(Math.max(0, -nx * 0.268 - ny * 0.306 + nz * 0.914), 42);
      const grain = (pore - 0.5) * 10 + (noise(x * 0.031, y * 0.037) - 0.5) * 4;
      const value = 43 * (0.38 + diffuse * 0.76) + reflection * 91 + grain;
      const i = (py * canvas.width + px) * 4;
      pixels.data[i] = value * 1.015;
      pixels.data[i + 1] = value * 1.04;
      pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  surface.putImageData(pixels, 0, 0);
  ctx.drawImage(canvas, -165, -288, 330, 688);
}

function shellPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-98, -274);
  ctx.bezierCurveTo(-45, -287, 60, -287, 106, -271);
  ctx.bezierCurveTo(141, -260, 149, -230, 153, -171);
  ctx.bezierCurveTo(159, -40, 157, 195, 146, 303);
  ctx.bezierCurveTo(142, 350, 135, 374, 96, 383);
  ctx.bezierCurveTo(40, 394, -63, 391, -107, 377);
  ctx.bezierCurveTo(-137, 367, -146, 330, -150, 276);
  ctx.bezierCurveTo(-159, 123, -160, -113, -151, -206);
  ctx.bezierCurveTo(-147, -248, -132, -266, -98, -274);
  ctx.closePath();
}

function drawAntenna(ctx) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 6;
  rounded(ctx, 94, -391, 38, 133, 17, "#141612");
  ctx.restore();
  rounded(ctx, 95, -391, 35, 132, 16, linear(ctx, 95, 0, 130, 0, [
    [0, "#242a25"], [0.15, "#51574d"], [0.34, "#343b33"], [0.8, "#191d18"], [1, "#0e100e"],
  ]));
  ctx.save();
  ctx.beginPath(); ctx.roundRect(95, -391, 35, 132, 16); ctx.clip();
  stipple(ctx, 122, 94, -391, 39, 133, 3500, 0.12, 0.55);
  ctx.strokeStyle = "rgba(228,228,200,0.22)";
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(99, -304); ctx.lineTo(99, -371);
  ctx.quadraticCurveTo(100, -385, 113, -387); ctx.stroke();
  for (const y of [-289, -285, -270]) {
    rounded(ctx, 94, y, 40, 2.6, 1, "rgba(2,5,3,0.7)");
    rounded(ctx, 96, y + 2.6, 32, 0.7, 0.2, "rgba(218,220,191,0.14)");
  }
  ctx.restore();
}

function drawShell(ctx) {
  shellPath(ctx);
  ctx.fillStyle = linear(ctx, -160, -250, 150, 290, [
    [0, "#71766b"], [0.08, "#545952"], [0.25, "#292d28"],
    [0.7, "#0e120f"], [0.9, "#282c28"], [1, "#4b4d44"],
  ]);
  ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = "#11150f"; ctx.stroke();

  ctx.save();
  ctx.translate(-0.8, -3); ctx.scale(0.957, 0.981);
  shellPath(ctx);
  ctx.clip();
  drawPolymer(ctx);
  ctx.fillStyle = radial(ctx, -91, -173, 2, 305, [[0, "rgba(246,218,162,0.07)"], [1, "rgba(246,218,162,0)"]]);
  ctx.fillRect(-163, -287, 326, 684);
  ctx.restore();

  ctx.lineWidth = 0.65; ctx.strokeStyle = "rgba(203,197,164,0.11)";
  ctx.beginPath(); ctx.moveTo(137, -157);
  ctx.bezierCurveTo(146, 0, 144, 230, 134, 309); ctx.stroke();

  // Small wear marks confined to the exposed edge of the plastic.
  const rnd = random(321);
  ctx.lineWidth = 0.45; ctx.strokeStyle = "rgba(197,195,161,0.11)";
  for (let i = 0; i < 65; i++) {
    const x = -141 + rnd() * 4, y = -197 + rnd() * 440;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1 + rnd() * 2, y + 2 + rnd() * 6); ctx.stroke();
  }
}

function drawSpeaker(ctx) {
  rounded(ctx, -47, -244, 94, 20, 10, linear(ctx, 0, -244, 0, -224, [
    [0, "#080c08"], [0.5, "#161d15"], [1, "#555c4e"],
  ]));
  rounded(ctx, -44, -241.5, 88, 15, 7, "#20271e", "rgba(0,0,0,0.45)", 1);
  for (let i = 0; i < 9; i++) {
    const x = -32 + i * 8;
    ellipse(ctx, x, -233, 2.9, 3.4, "rgba(192,199,173,0.27)");
    ellipse(ctx, x - 0.2, -234, 2.8, 3, "#080d08");
    ellipse(ctx, x - 0.2, -234.8, 1.8, 1.4, "#000300");
  }
}

function drawDisplay(ctx, screen) {
  const { x, y, w, h } = screen;
  const left = x - w / 2, top = y - h / 2;
  rounded(ctx, left - 14, top - 15, w + 28, h + 30, 16,
    linear(ctx, left, top, left + w, top + h, [[0, "#080c09"], [0.6, "#111810"], [1, "#626655"]]));
  rounded(ctx, left - 12, top - 12, w + 24, h + 24, 14,
    linear(ctx, left, top, left + w, top + h, [[0, "#787e68"], [0.12, "#3a4537"], [0.45, "#101b12"], [1, "#080d08"]]),
    "rgba(2,7,3,0.8)", 1.5);
  rounded(ctx, left - 7, top - 7, w + 14, h + 14, 9, "#111b10", "rgba(164,176,132,0.2)", 0.8);
  rounded(ctx, left, top, w, h, 5, linear(ctx, left, top, left + w, top + h, [
    [0, "#a0ab7b"], [0.35, "#9ca977"], [0.7, "#8d9c6c"], [1, "#7e8b5b"],
  ]));
  ctx.save();
  ctx.beginPath(); ctx.roundRect(left, top, w, h, 5); ctx.clip();
  stipple(ctx, 537, left, top, w, h, 20000, 0.06, 0.43);
  ctx.fillStyle = linear(ctx, 0, top, 0, top + 14, [[0, "rgba(8,19,3,0.48)"], [1, "rgba(8,19,3,0)"]]);
  ctx.fillRect(left, top, w, 14);
  ctx.fillStyle = linear(ctx, left, top, left + w, top + h, [
    [0, "rgba(243,244,209,0.02)"], [0.28, "rgba(243,244,209,0.08)"],
    [0.29, "rgba(243,244,209,0.12)"], [0.56, "rgba(243,244,209,0.01)"], [1, "rgba(243,244,209,0)"],
  ]);
  ctx.fillRect(left, top, w, h);
  ctx.restore();
  rounded(ctx, left + 0.5, top + 0.5, w - 1, h - 1, 5, null, "rgba(35,49,21,0.7)", 1);
  ctx.strokeStyle = "rgba(232,237,197,0.24)"; ctx.lineWidth = 0.75;
  ctx.beginPath(); ctx.moveTo(left + 5, top + h + 1); ctx.lineTo(left + w - 5, top + h + 1); ctx.stroke();
}

function well(ctx, x, y, w, h, rocker = false) {
  const r = rocker ? h / 2 : Math.min(13, h * 0.32);
  rounded(ctx, x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 5, r + 2,
    linear(ctx, x, y - h / 2, x, y + h / 2, [[0, "#080e08"], [0.7, "#10190f"], [1, "#626954"]]));
  rounded(ctx, x - w / 2, y - h / 2, w, h + 1, r, "#080e08");
}

/** A convex rubber cap with a dark lower lip and a soft upper bevel. */
function drawKey(ctx, w, h, rocker = false) {
  const r = rocker ? h / 2 : h * 0.3;
  rounded(ctx, 0.7, 0.7, w - 1.4, h - 1.4, r, "#080e09");
  rounded(ctx, 1.8, 1.1, w - 3.6, h - 3.2, r - 0.6,
    linear(ctx, 0, 0, w * 0.7, h, [[0, "#979b8b"], [0.11, "#767c70"], [0.3, "#444d40"], [0.72, "#353d31"], [1, "#151c13"]]));
  ctx.save();
  ctx.beginPath(); ctx.roundRect(3, 2.2, w - 6, h - 6, r - 2); ctx.clip();
  ctx.fillStyle = radial(ctx, w * 0.3, h * 0.12, 0, w * 0.86,
    [[0, "rgba(196,197,168,0.12)"], [1, "rgba(196,197,168,0)"]]);
  ctx.fillRect(0, 0, w, h);
  stipple(ctx, Math.round(w * h), 0, 0, w, h, Math.round(w * h * 2), 0.13, 0.55);
  ctx.restore();
  ctx.strokeStyle = "rgba(206,212,181,0.3)"; ctx.lineWidth = 0.65;
  ctx.beginPath(); ctx.moveTo(4, h * 0.54); ctx.quadraticCurveTo(3, 3.2, r + 4, 3.2);
  ctx.lineTo(w - r - 4, 3.2); ctx.stroke();
  if (rocker) {
    const radius = h * 0.39;
    ellipse(ctx, w / 2, h / 2 + 1.4, radius + 2, radius + 2, "#050e05");
    ellipse(ctx, w / 2, h / 2, radius, radius,
      linear(ctx, 0, h * 0.1, 0, h * 0.9, [[0, "#606c58"], [0.17, "#444f3b"], [1, "#263420"]]));
    ctx.beginPath(); ctx.arc(w / 2, h / 2, radius - 1.5, Math.PI * 0.91, Math.PI * 1.7);
    ctx.strokeStyle = "rgba(215,219,187,0.36)"; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

export function prepareHandset(scene, art, point) {
  const key = art.key, scale = art.scale;
  const screen = { ...point(art.screen.x, art.screen.y), w: art.screen.width * scale, h: art.screen.height * scale };
  canvasTexture(scene, key, art.width, art.height, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2); ctx.scale(1 / scale, 1 / scale);
    drawAntenna(ctx);
    for (const y of [-170, -111])
      rounded(ctx, -158, y, 9, 34, 4, linear(ctx, -158, 0, -149, 0, [[0, "#575f50"], [0.5, "#151d13"], [1, "#050b04"]]));
    drawShell(ctx);
    drawSpeaker(ctx);
    drawDisplay(ctx, screen);
    for (const y of art.keys.y) for (const x of art.keys.x) {
      const p = point(x, y); well(ctx, p.x, p.y, art.keys.width * scale, art.keys.height * scale);
    }
    for (const x of art.softKeys.x) {
      const p = point(x, art.softKeys.y); well(ctx, p.x, p.y, art.softKeys.width * scale, art.softKeys.height * scale);
    }
    const p = point(art.rocker.x, art.rocker.y);
    well(ctx, p.x, p.y, art.rocker.width * scale, art.rocker.height * scale, true);
    for (const x of [-15, 0, 15]) {
      ellipse(ctx, x, 343.8, 3.7, 4, "rgba(180,190,156,0.28)");
      ellipse(ctx, x, 342.8, 3.2, 3.5, "#060d05");
    }
  });
  for (const [part, rocker] of [[art.keys, false], [art.softKeys, false], [art.rocker, true]]) {
    canvasTexture(scene, part.key, part.width, part.height, (ctx, w, h) => {
      ctx.scale(1 / scale, 1 / scale);
      drawKey(ctx, w * scale, h * scale, rocker);
    });
  }
  canvasTexture(scene, "mp_contact_shadow_code", 424, 846, (ctx) => {
    ctx.translate(212, 423);
    ctx.shadowColor = "rgba(0,0,0,0.72)"; ctx.shadowBlur = 17;
    ctx.shadowOffsetX = 12; ctx.shadowOffsetY = 15;
    ctx.scale(0.93, 0.98);
    shellPath(ctx); ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fill();
  });
  canvasTexture(scene, "mp_lcd_glow_code", 256, 256, (ctx) => {
    ctx.fillStyle = radial(ctx, 128, 128, 10, 128, [
      [0, "rgba(166,191,99,0.2)"], [0.45, "rgba(144,171,87,0.07)"], [1, "rgba(144,171,87,0)"],
    ]);
    ctx.fillRect(0, 0, 256, 256);
  });
}
