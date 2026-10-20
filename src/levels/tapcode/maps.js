import { soft, rgb, lcg } from "../../shared/paint.js";

// Charts put away down here and forgotten: the Captain's, by the look of
// them. A squat wooden tub against the wall with rolled maps standing in it
// every which way, two longer rolls leant against the brick behind it, and
// one fallen on the floor in front. Old paper, gone the colour of tea, tied
// with string; their ends show the coil of the sheet. `L.maps` is where they
// stand (x, and s their size); `L.floorY` the floor.
export function paintMaps(ctx, L) {
  const { x, s: k } = L.maps;
  const fy = L.floorY;
  if (L.photographicMaterials?.maps) {
    soft(ctx, x + 8 * k, fy + 12 * k, 74 * k, 10 * k, "0,0,0", 0.7);
    ctx.drawImage(L.photographicMaterials.maps, x - 74 * k, fy - 132 * k, 148 * k, 150 * k);
    return;
  }
  const rnd = lcg(613);
  // the cellar is dark: the paper only catches a little of the light
  const shade = (tone, m) => rgb(tone[0] * m * 0.72, tone[1] * m * 0.72, tone[2] * m * 0.72);
  const PAPER = [[150, 134, 104], [138, 126, 104], [160, 142, 102], [130, 120, 98], [146, 128, 94], [154, 138, 110]];
  const TIES = ["#5e2a1c", "#4a3a26", null];

  // a rolled chart, from its foot (a) to its top (b): the round of the roll
  // lit from above, a line where the outer sheet ends, perhaps a string, and
  // at the top the coil of the paper seen end on
  const roll = (ax, ay, bx, by, r, tone, tie) => {
    const ang = Math.atan2(by - ay, bx - ax), len = Math.hypot(bx - ax, by - ay);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, shade(tone, 0.5));
    g.addColorStop(0.32, shade(tone, 0.92));
    g.addColorStop(0.62, shade(tone, 0.62));
    g.addColorStop(1, shade(tone, 0.28));
    ctx.fillStyle = g;
    ctx.fillRect(0, -r, len, r * 2);
    // the old ink of the chart showing faintly through the outer turn
    ctx.strokeStyle = "rgba(60,44,26,0.22)";
    ctx.lineWidth = Math.max(0.5, 0.6 * k);
    for (let i = 0; i < 3; i++) {
      const s0 = len * (0.25 + rnd() * 0.5);
      ctx.beginPath();
      ctx.moveTo(s0, -r * 0.7);
      ctx.bezierCurveTo(s0 + 6 * k, -r * 0.2, s0 - 4 * k, r * 0.3, s0 + 3 * k, r * 0.7);
      ctx.stroke();
    }
    // where the outer sheet ends, a little proud of the roll
    const edge = len * (0.12 + rnd() * 0.1);
    ctx.strokeStyle = "rgba(30,22,12,0.55)";
    ctx.lineWidth = Math.max(0.6, 0.8 * k);
    ctx.beginPath(); ctx.moveTo(edge, -r); ctx.lineTo(edge + r * 0.5, r); ctx.stroke();
    ctx.strokeStyle = shade(tone, 1.05);
    ctx.lineWidth = Math.max(0.4, 0.5 * k);
    ctx.beginPath(); ctx.moveTo(edge - 0.8 * k, -r); ctx.lineTo(edge - 0.8 * k + r * 0.5, r); ctx.stroke();
    // the string round it
    if (tie) {
      const at = len * (0.5 + rnd() * 0.15);
      ctx.fillStyle = tie;
      ctx.fillRect(at, -r * 1.04, 2.2 * k, r * 2.08);
      ctx.fillStyle = "rgba(255,230,200,0.12)";
      ctx.fillRect(at, -r * 1.04, 2.2 * k, r * 0.7);
    }
    // its end: the coil of the sheet, and the dark of the hollow
    ctx.fillStyle = shade(tone, 0.78);
    ctx.beginPath(); ctx.ellipse(len, 0, r * 0.42, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(48,34,18,0.55)";
    ctx.lineWidth = Math.max(0.4, 0.55 * k);
    for (const f of [0.78, 0.56, 0.34]) {
      ctx.beginPath(); ctx.ellipse(len + (1 - f) * 0.6 * k, 0, r * 0.42 * f, r * f, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "rgba(14,10,6,0.85)";
    ctx.beginPath(); ctx.ellipse(len + 0.5 * k, 0, r * 0.1, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // the tub: its foot on the floor, a little forward of the wall
  const base = fy + 10 * k, w = 80 * k, h = 50 * k, top = base - h, ry = 8.5 * k;
  soft(ctx, x + 8 * k, base + 2 * k, 74 * k, 10 * k, "0,0,0", 0.7);

  // the two long rolls leant against the brick behind it
  soft(ctx, x + 40 * k, fy - 70 * k, 14 * k, 80 * k, "0,0,0", 0.35);
  roll(x + 20 * k, fy + 2 * k, x + 34 * k, fy - 128 * k, 9.5 * k, PAPER[5], TIES[0]);
  roll(x + 36 * k, fy + 4 * k, x + 46 * k, fy - 104 * k, 8.5 * k, PAPER[3], TIES[1]);

  // inside the tub's mouth, dark
  ctx.fillStyle = "#0b0805";
  ctx.beginPath(); ctx.ellipse(x, top, w / 2, ry, 0, 0, Math.PI * 2); ctx.fill();

  // the rolls standing in it, every which way
  for (const [dx0, dx1, up, r, p, t] of [
    [-24, -54, 34, 7.5, 4, 2], [-16, -34, 58, 8.5, 0, 0], [20, 46, 44, 8, 2, 2],
    [-4, -10, 78, 9.5, 1, 2], [10, 26, 64, 9, 4, 1],
  ]) roll(x + dx0 * k, base - 18 * k, x + dx1 * k, top - up * k, r * k, PAPER[p], TIES[t]);

  // the tub's front: staves, two iron hoops, the lip of its rim
  const bw = w * 0.44, by = 6 * k;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, top);
    ctx.ellipse(x, top, w / 2, ry, 0, Math.PI, 0, true);
    ctx.lineTo(x + bw, base);
    ctx.ellipse(x, base, bw, by, 0, 0, Math.PI, false);
    ctx.closePath();
  };
  const wood = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  wood.addColorStop(0, "#140c06");
  wood.addColorStop(0.3, "#3a2816");
  wood.addColorStop(0.55, "#4a341e");
  wood.addColorStop(1, "#0f0905");
  body();
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(0.8, 1 * k);
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.14, top + ry);
    ctx.lineTo(x + i * bw * 0.28, base + by);
    ctx.stroke();
  }
  for (const f of [0.22, 0.78]) {
    const yy = top + (base - top) * f, half = w / 2 + (bw - w / 2) * f, ey = ry + (by - ry) * f;
    const iron = ctx.createLinearGradient(x - half, 0, x + half, 0);
    iron.addColorStop(0, "#08080a");
    iron.addColorStop(0.4, "#43464e");
    iron.addColorStop(1, "#060607");
    ctx.strokeStyle = iron;
    ctx.lineWidth = 4.5 * k;
    ctx.beginPath(); ctx.ellipse(x, yy, half, ey, 0, 0, Math.PI); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#5a4024";
  ctx.lineWidth = 1.6 * k;
  ctx.beginPath(); ctx.ellipse(x, top, w / 2, ry, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = "rgba(200,180,140,0.18)";
  ctx.lineWidth = 0.8 * k;
  ctx.beginPath(); ctx.ellipse(x, top - 0.6 * k, w / 2, ry, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();

  // one fallen out, lying on the floor in front
  soft(ctx, x - 18 * k, fy + 31 * k, 42 * k, 6 * k, "0,0,0", 0.6);
  roll(x - 52 * k, fy + 26 * k, x + 12 * k, fy + 21 * k, 8 * k, PAPER[2], TIES[0]);
}
