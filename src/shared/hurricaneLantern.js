import { soft, lcg } from "./paint.js";

// A hurricane lantern, looked down on a little: the round oil tank with its
// filler cap, the burner and its wick wheel, the glass globe with the flame
// in it, the two air tubes that rise from the tank's shoulders and turn in
// to the chimney, the wire guard, the vented hood and the bail to carry it
// by. Old red paint on tin, worn to the metal on its edges; brass at the
// burner. Lit, everything on it is lit by its own flame; out, the glass is
// dark and the tin only catches what light there is.
//
// (x, y) is the middle of its foot on the screen, `u` pixels to the
// centimetre; the flame is 11.6 cm up, and the top of the bail 32 cm. With
// `halo` false it throws no light round itself (a scene that moves the
// lantern moves its light as well).
export function paintHurricaneLantern(ctx, x, y, u, lit = true, halo = true) {
  const T = 0.42; // how round a level ring looks from up here
  const fy = y - 11.6 * u; // the flame
  const ring = (cy, r, a0 = 0, a1 = Math.PI * 2) => {
    ctx.beginPath();
    ctx.ellipse(x, cy, r, r * T, 0, a0, a1);
  };
  const rnd = lcg(909);
  const RED = "#7a2a1e";
  // the light it throws on the air round it
  if (lit && halo) soft(ctx, x, fy - 2 * u, 50 * u, 40 * u, "255,170,90", 0.16, "lighter");

  // the bail, hanging up and back over the hood
  ctx.strokeStyle = "#2a2622";
  ctx.lineWidth = Math.max(0.9, 0.5 * u);
  ctx.beginPath();
  ctx.moveTo(x - 7.4 * u, y - 17 * u);
  ctx.bezierCurveTo(x - 9.5 * u, y - 37 * u, x + 9.5 * u, y - 37 * u, x + 7.4 * u, y - 17 * u);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,190,130,0.35)";
  ctx.lineWidth = Math.max(0.5, 0.18 * u);
  ctx.beginPath();
  ctx.moveTo(x - 7.1 * u, y - 19 * u);
  ctx.bezierCurveTo(x - 8.8 * u, y - 35.6 * u, x + 8.8 * u, y - 35.6 * u, x + 7.1 * u, y - 19 * u);
  ctx.stroke();

  // the air tubes: up from the tank's shoulders, round the glass, in to the hood
  for (const s of [-1, 1]) {
    const tube = (w, col) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + s * 6.1 * u, y - 4.2 * u);
      ctx.bezierCurveTo(x + s * 8.2 * u, y - 8 * u, x + s * 8.4 * u, y - 17 * u, x + s * 6.6 * u, y - 20.5 * u);
      ctx.quadraticCurveTo(x + s * 5.6 * u, y - 23.4 * u, x + s * 2.4 * u, y - 24 * u);
      ctx.stroke();
      ctx.lineCap = "butt";
    };
    tube(1.9, "#160806");
    tube(1.45, s < 0 ? "#5e2016" : "#4a1810");
    // the flame on the side of the tube that faces it
    if (!lit) continue;
    ctx.save();
    ctx.translate(-s * 0.36 * u, 0);
    tube(0.34, "rgba(255,170,110,0.55)");
    ctx.restore();
  }

  // ── the tank: a low drum, its top a shallow dome
  const tr = 6.9 * u, th = 4.6 * u;
  const tank = new Path2D();
  tank.moveTo(x - tr, y - th);
  tank.lineTo(x - tr, y);
  tank.ellipse(x, y, tr, tr * T, 0, Math.PI, 0, true);
  tank.lineTo(x + tr, y - th);
  tank.closePath();
  metal(ctx, tank, x - tr, x + tr, RED);
  ctx.save();
  ctx.clip(tank);
  // a rolled seam round its foot, rust coming through, the paint scuffed
  ctx.strokeStyle = "rgba(10,4,2,0.55)";
  ctx.lineWidth = 0.5 * u;
  ring(y - 1.1 * u, tr, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,180,130,0.2)";
  ctx.lineWidth = 0.2 * u;
  ring(y - 1.5 * u, tr, 0, Math.PI);
  ctx.stroke();
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = rnd() < 0.55 ? "rgba(40,16,6,0.4)" : "rgba(170,96,50,0.3)";
    ctx.fillRect(x + (rnd() * 2 - 1) * tr, y - th + rnd() * (th + tr * T), (0.2 + rnd() * 0.6) * u, (0.15 + rnd() * 0.4) * u);
  }
  ctx.restore();
  // its top: red in the flame's light, darker toward its rim
  ring(y - th, tr);
  const tg = ctx.createRadialGradient(x, y - th - 0.6 * u, 1 * u, x, y - th, tr);
  tg.addColorStop(0, lit ? "#d86a44" : "#7a3424");
  tg.addColorStop(0.5, lit ? "#9a3a26" : "#5a2418");
  tg.addColorStop(1, lit ? "#3c140c" : "#2a0e08");
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,196,150,0.4)";
  ctx.lineWidth = Math.max(0.5, 0.2 * u);
  ring(y - th, tr - 0.15 * u, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  // the filler cap, toward us on the right
  {
    const cx = x + 3.9 * u, cy = y - th + 1.1 * u, r = 1.25 * u;
    ctx.fillStyle = "#140a06";
    ctx.beginPath(); ctx.ellipse(cx, cy + 0.2 * u, r * 1.1, r * T * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a4a1c";
    ctx.fillRect(cx - r, cy - 0.9 * u, r * 2, 0.9 * u);
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * T, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#d6ae5a";
    ctx.beginPath(); ctx.ellipse(cx, cy - 0.9 * u, r, r * T, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,244,210,0.7)";
    ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - 1 * u, r * 0.35, r * T * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ── the burner: a brass collar pierced for air, the wick wheel on its stem
  const br = 3 * u, b0 = y - th - 0.2 * u, b1 = y - th - 2.9 * u;
  const brass = ctx.createLinearGradient(x - br, 0, x + br, 0);
  brass.addColorStop(0, "#2a1c08");
  brass.addColorStop(0.3, "#b08a3c");
  brass.addColorStop(0.5, "#f0d48a");
  brass.addColorStop(0.72, "#8a6626");
  brass.addColorStop(1, "#1e1406");
  ctx.fillStyle = brass;
  ctx.fillRect(x - br, b1, br * 2, b0 - b1);
  ctx.beginPath(); ctx.ellipse(x, b0, br, br * T, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#1a1006";
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x + i * 0.78 * u, b0 - 1.1 * u + Math.cos((i / 3) * 1.4) * br * T * 0.8, 0.22 * u * Math.cos((i / 3) * 1.3), 0.3 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#5a4216";
  ctx.lineWidth = 0.4 * u;
  ctx.beginPath(); ctx.moveTo(x + br * 0.9, b0 - 1.2 * u); ctx.lineTo(x + 5.3 * u, b0 - 1.5 * u); ctx.stroke();
  ctx.fillStyle = "#c8a04e";
  ctx.beginPath(); ctx.ellipse(x + 5.6 * u, b0 - 1.5 * u, 0.5 * u, 1 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a2a0c";
  ctx.beginPath(); ctx.ellipse(x + 5.7 * u, b0 - 1.5 * u, 0.2 * u, 0.6 * u, 0, 0, Math.PI * 2); ctx.fill();

  // ── the glass: a pear-shaped globe, clear, full of the flame's light
  const g0 = b1, g1 = y - 21.2 * u; // its foot and its neck
  const globe = new Path2D();
  globe.moveTo(x - 3.1 * u, g0);
  globe.bezierCurveTo(x - 7.2 * u, g0 - 3 * u, x - 6.8 * u, g1 + 4.4 * u, x - 3 * u, g1);
  globe.lineTo(x + 3 * u, g1);
  globe.bezierCurveTo(x + 6.8 * u, g1 + 4.4 * u, x + 7.2 * u, g0 - 3 * u, x + 3.1 * u, g0);
  globe.closePath();
  const gg = ctx.createRadialGradient(x, fy, 0.4 * u, x, fy - 1.5 * u, 8.5 * u);
  gg.addColorStop(0, lit ? "rgba(255,246,214,0.98)" : "rgba(70,72,78,0.45)");
  gg.addColorStop(0.22, lit ? "rgba(255,214,138,0.92)" : "rgba(54,56,62,0.45)");
  gg.addColorStop(0.6, lit ? "rgba(226,146,62,0.62)" : "rgba(36,38,44,0.5)");
  gg.addColorStop(1, lit ? "rgba(120,62,22,0.4)" : "rgba(20,20,24,0.55)");
  ctx.fillStyle = gg;
  ctx.fill(globe);
  ctx.save();
  ctx.clip(globe);
  // soot gathered under the neck; the far side of the glass, a darker ring
  const soot = ctx.createLinearGradient(0, g1, 0, g1 + 5 * u);
  soot.addColorStop(0, "rgba(36,18,8,0.7)");
  soot.addColorStop(1, "rgba(36,18,8,0)");
  ctx.fillStyle = soot;
  ctx.fillRect(x - 8 * u, g1, 16 * u, 5 * u);
  ctx.strokeStyle = "rgba(90,44,14,0.35)";
  ctx.lineWidth = 0.3 * u;
  ring(fy + 1.2 * u, 5.6 * u, Math.PI, Math.PI * 2);
  ctx.stroke();
  // the wick and its flame: a blue root, an amber body, a white heart
  ctx.fillStyle = "#2a1a0c";
  ctx.fillRect(x - 0.7 * u, g0 - 1.6 * u, 1.4 * u, 1.8 * u);
  const flame = (w, h, col) => {
    if (!lit) return;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, fy - h * 0.62 * u);
    ctx.bezierCurveTo(x + w * 0.5 * u, fy - h * 0.1 * u, x + w * u, fy + h * 0.3 * u, x, fy + h * 0.42 * u);
    ctx.bezierCurveTo(x - w * u, fy + h * 0.3 * u, x - w * 0.5 * u, fy - h * 0.1 * u, x, fy - h * 0.62 * u);
    ctx.fill();
  };
  flame(1.5, 5.4, "rgba(255,170,60,0.9)");
  flame(1.05, 4.2, "#ffe9a8");
  flame(0.55, 2.6, "#fffdf0");
  if (lit) soft(ctx, x, fy + 2 * u, 1.3 * u, 0.7 * u, "120,160,255", 0.5, "lighter");
  // the glass itself: a long window-light down its left, a short one right
  ctx.strokeStyle = "rgba(255,255,244,0.55)";
  ctx.lineWidth = Math.max(0.8, 0.55 * u);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 4.3 * u, g1 + 5 * u);
  ctx.quadraticCurveTo(x - 5.9 * u, fy - 0.5 * u, x - 4.5 * u, g0 - 2.6 * u);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,244,0.3)";
  ctx.lineWidth = Math.max(0.6, 0.3 * u);
  ctx.beginPath();
  ctx.moveTo(x + 4.6 * u, g1 + 6 * u);
  ctx.quadraticCurveTo(x + 5.6 * u, fy - 1 * u, x + 4.9 * u, fy + 1.5 * u);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  // its outline: thin, dark where it turns away
  ctx.strokeStyle = "rgba(60,28,10,0.6)";
  ctx.lineWidth = Math.max(0.6, 0.22 * u);
  ctx.stroke(globe);

  // the wire guard: two rings round the glass, a wire up the front
  ctx.strokeStyle = "#231d18";
  ctx.lineWidth = Math.max(0.8, 0.36 * u);
  ring(fy + 2.2 * u, 6.9 * u, 0, Math.PI);
  ctx.stroke();
  ring(fy - 4.2 * u, 6.5 * u, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = lit ? "rgba(255,180,120,0.3)" : "rgba(170,180,200,0.12)";
  ctx.lineWidth = Math.max(0.4, 0.14 * u);
  ring(fy + 2.05 * u, 6.9 * u, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();
  ring(fy - 4.35 * u, 6.5 * u, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();

  // ── the hood: a flange over the neck, a pierced chimney, a domed cap
  const h0 = g1 + 0.3 * u;
  ctx.fillStyle = "#140806";
  ring(h0 + 0.3 * u, 4.4 * u);
  ctx.fill();
  const hood = new Path2D();
  hood.moveTo(x - 4.2 * u, h0);
  hood.ellipse(x, h0, 4.2 * u, 4.2 * u * T, 0, Math.PI, 0, true);
  hood.lineTo(x + 2.7 * u, h0 - 4.2 * u);
  hood.lineTo(x - 2.7 * u, h0 - 4.2 * u);
  hood.closePath();
  metal(ctx, hood, x - 4.2 * u, x + 4.2 * u, RED);
  // the flame under it, on its lower edge
  ctx.strokeStyle = lit ? "rgba(255,170,100,0.5)" : "rgba(0,0,0,0)";
  ctx.lineWidth = Math.max(0.5, 0.24 * u);
  ring(h0 - 0.1 * u, 4.1 * u, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // the vents
  ctx.fillStyle = "#0c0504";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(x + i * 1.05 * u, h0 - 2.2 * u + Math.cos((i / 2) * 1.3) * 0.5 * u, 0.3 * u * Math.cos((i / 2) * 1.1), 0.7 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the cap, and the ring the bail hooks on
  const capY = h0 - 4.2 * u;
  ctx.fillStyle = "#1c0a07";
  ring(capY + 0.2 * u, 3.3 * u);
  ctx.fill();
  const cg = ctx.createRadialGradient(x - 0.8 * u, capY - 1 * u, 0.3 * u, x, capY - 0.3 * u, 3.3 * u);
  cg.addColorStop(0, "#b85036");
  cg.addColorStop(0.6, "#6a2418");
  cg.addColorStop(1, "#240c08");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(x, capY - 0.2 * u, 3.1 * u, 1.7 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a2622";
  ctx.lineWidth = Math.max(0.7, 0.3 * u);
  ctx.beginPath();
  ctx.ellipse(x, capY - 2.2 * u, 0.9 * u, 1 * u, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// painted tin: dark at the edges, the flame's warmth on the near side of it
function metal(ctx, path, x0, x1, colour) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "#1a0c08");
  g.addColorStop(0.25, colour);
  g.addColorStop(0.45, "#c46a4a");
  g.addColorStop(0.6, colour);
  g.addColorStop(1, "#120806");
  ctx.fillStyle = g;
  ctx.fill(path);
}
