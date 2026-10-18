import { lcg, soft } from "../../shared/paint.js";
import { block, fillPoly, footShadow } from "../house/roomKit.js";
import { paintRoom4Bookcase, paintRoom4Chair, paintRoom4Firewood, paintRoom4Stove } from "./photographicRoom.js";

function gradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
}

function round(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}

function stoveBody(ctx) {
  ctx.beginPath(); ctx.moveTo(-24, -85);
  ctx.bezierCurveTo(-31, -76, -37, -55, -34, -35);
  ctx.quadraticCurveTo(-33, -19, -23, -15); ctx.lineTo(23, -15);
  ctx.quadraticCurveTo(33, -19, 34, -35);
  ctx.bezierCurveTo(37, -55, 31, -76, 24, -85); ctx.closePath();
}

/** Cast iron, a recessed firebox, charred wood and real hardware, all geometry. */
export function paintStove(ctx, L) {
  if (paintRoom4Stove(ctx, L)) return;
  const { Q } = L, st = L.stove;
  const f = Q(st.x, 0, st.d), u = f.s;
  block(ctx, L, { x0: st.x - 42, x1: st.x + 42, d0: st.d - 39, d1: st.d + 27, y0: 0, y1: 4 },
    { side: "#101114", front: "#25262a", top: "#3e3b37" });
  soft(ctx, f.x + 6 * u, f.y + 4 * u, 40 * u, 10 * u, "0,0,0", 0.8);
  soft(ctx, f.x, f.y + 8 * u, 51 * u, 15 * u, "244,113,37", 0.22, "lighter");
  ctx.save(); ctx.translate(f.x, f.y); ctx.scale(u, u);
  const rnd = lcg(4721);
  // Cylindrical flue, collars and a wall bracket.
  const pipeTop = -L.top + 34;
  round(ctx, -6, pipeTop, 12, -88 - pipeTop, 2,
    gradient(ctx, -6, 0, 6, 0, [[0, "#101416"], [0.28, "#454b4d"], [0.46, "#303638"], [1, "#0c1011"]]));
  round(ctx, -6, pipeTop, 35, 12, 4,
    gradient(ctx, 0, pipeTop, 0, pipeTop + 12, [[0, "#494f50"], [0.4, "#272d2e"], [1, "#0d1112"]]));
  for (const y of [-108, -174, pipeTop + 13]) {
    round(ctx, -7, y, 14, 3, 0.6, "#15191a");
    round(ctx, -6.3, y, 12, 0.6, 0.2, "#687071");
  }
  ctx.strokeStyle = "#111415"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-6, -160); ctx.lineTo(-13, -160); ctx.lineTo(-13, -165); ctx.stroke();
  // Splayed feet and their small casting details.
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#16191a";
    ctx.beginPath(); ctx.moveTo(side * 19, -21); ctx.lineTo(side * 27, -19);
    ctx.lineTo(side * 31, -3); ctx.lineTo(side * 25, -3); ctx.closePath(); ctx.fill();
    round(ctx, side < 0 ? -32 : 24, -5, 9, 2.6, 1, "#303234");
    ctx.strokeStyle = "#565653"; ctx.lineWidth = 0.65;
    ctx.beginPath(); ctx.moveTo(side * 25, -18); ctx.lineTo(side * 28, -5); ctx.stroke();
  }
  stoveBody(ctx);
  ctx.fillStyle = gradient(ctx, -36, -60, 37, -30, [[0, "#12181a"], [0.19, "#4c5253"], [0.35, "#343a3c"], [0.7, "#202526"], [1, "#080d0e"]]);
  ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 4900; i++) {
    ctx.fillStyle = rnd() < 0.5 ? "rgba(188,184,164,0.1)" : "rgba(0,0,0,0.22)";
    ctx.fillRect(-36 + rnd() * 72, -86 + rnd() * 73, 0.15 + rnd() * 0.3, 0.1 + rnd() * 0.18);
  }
  soft(ctx, -20, -43, 19, 47, "146,176,190", 0.055, "lighter");
  soft(ctx, 0, -30, 39, 26, "210,92,26", 0.07, "lighter");
  ctx.restore();
  ellipse(ctx, 0, -85, 28, 5.2, "#141a1b");
  ellipse(ctx, 0, -87, 29, 4.5, gradient(ctx, -29, 0, 29, 0, [[0, "#596061"], [0.35, "#373d3e"], [1, "#131818"]]));
  ellipse(ctx, 0, -87.4, 20, 2.8, "#272c2d");
  ctx.strokeStyle = "rgba(177,189,185,0.2)"; ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.ellipse(0, -87, 27, 3.7, 0, Math.PI, Math.PI * 1.9); ctx.stroke();

  // The door's deep frame, firebrick lining and a dark cavity behind the flame.
  round(ctx, -23, -73, 46, 51, [12, 12, 5, 5], "#0b1011");
  round(ctx, -21, -71, 42, 47, [11, 11, 4, 4], gradient(ctx, -21, -71, 21, -24,
    [[0, "#6b6c61"], [0.14, "#383d37"], [0.65, "#171d1b"], [1, "#6e4d32"]]));
  round(ctx, -18.5, -68.5, 37, 42, [9, 9, 3, 3], "#100907");
  ctx.save(); ctx.beginPath(); ctx.roundRect(-18.5, -68.5, 37, 42, [9, 9, 3, 3]); ctx.clip();
  ctx.fillStyle = gradient(ctx, 0, -69, 0, -27, [[0, "#100d0a"], [0.53, "#391a0e"], [1, "#b14613"]]);
  ctx.fillRect(-19, -69, 38, 44);
  ctx.strokeStyle = "rgba(5,3,2,0.65)"; ctx.lineWidth = 0.65;
  for (let row = 0; row < 5; row++) {
    const y = -67 + row * 8;
    ctx.beginPath(); ctx.moveTo(-19, y); ctx.lineTo(19, y); ctx.stroke();
    for (let x = -22 + (row % 2) * 8; x < 20; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke();
    }
  }
  soft(ctx, 0, -37, 22, 26, "213,58,7", 0.35, "lighter");
  // Uneven, curling tongues of fire: translucent tips and pale inner cores.
  // Their widths and bends vary independently, instead of repeating a triangle.
  const flame = (x, y, w, h, lean, core = false) => {
    ctx.beginPath(); ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 1.4, y - h * 0.24, x + lean - w * 0.7, y - h * 0.41, x + lean * 0.5 - w * 0.2, y - h * 0.69);
    ctx.bezierCurveTo(x + lean * 0.8, y - h * 0.79, x + lean * 0.7 - w * 0.2, y - h * 0.92, x + lean, y - h);
    ctx.bezierCurveTo(x + lean * 0.45 + w * 0.6, y - h * 0.75, x - lean * 0.4 + w * 0.2, y - h * 0.48, x + w * 0.85, y - h * 0.38);
    ctx.bezierCurveTo(x + w * 1.1, y - h * 0.19, x + w * 0.7, y - h * 0.03, x + w, y); ctx.closePath();
    ctx.fillStyle = gradient(ctx, 0, y - h, 0, y, core
      ? [[0, "rgba(255,183,56,0)"], [0.5, "rgba(255,207,102,0.7)"], [1, "#ffe6b0"]]
      : [[0, "rgba(202,48,5,0)"], [0.2, "rgba(233,86,11,0.38)"], [0.55, "rgba(246,147,33,0.86)"], [1, "#ffcc76"]]);
    ctx.fill();
  };
  for (const [x, h, w, lean] of [[-12, 25, 4, 5], [-3, 36, 4.3, -5], [9, 29, 4.5, 6], [-7, 18, 3, -4], [3, 24, 4, 5], [15, 17, 2.8, -4]]) {
    flame(x, -30, w, h, lean);
    flame(x - 0.4, -30, w * 0.5, h * 0.64, lean * 0.7, true);
  }
  for (const [x, y, angle] of [[-5, -35, -0.16], [7, -31, 0.2]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    round(ctx, -14, -3.5, 28, 7, 2, gradient(ctx, 0, -3.5, 0, 3.5, [[0, "#322216"], [0.5, "#110e0a"], [1, "#201008"]]));
    for (let k = 0; k < 18; k++) {
      const xx = -13 + rnd() * 26;
      ctx.strokeStyle = rnd() < 0.6 ? "#66270c" : "#c95513"; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.moveTo(xx, -2.6); ctx.lineTo(xx + 1 + rnd() * 2, 2.5); ctx.stroke();
    }
    ctx.restore();
  }
  for (let i = 0; i < 33; i++) ellipse(ctx, -18 + rnd() * 36, -28 + rnd() * 3, 0.6 + rnd(), 0.3 + rnd() * 0.5,
    rnd() > 0.35 ? "#b23c0c" : "#ffc065");
  // Thin cast grate bars stand in front of the fire, with reflected lower edges.
  for (let x = -13; x <= 14; x += 6.5) {
    round(ctx, x, -50, 1.15, 25, 0.35, "#10120f");
    round(ctx, x - 0.25, -40, 0.35, 13, 0.1, "rgba(202,104,46,0.5)");
  }
  round(ctx, -19, -31, 38, 2, 0.5, "#20170f");
  ctx.restore();
  // Hinges, latch, ash drawer and embossed air vents.
  for (const y of [-62, -35]) {
    round(ctx, -25.5, y, 5.5, 6, 1, "#4a4f4b");
    round(ctx, -24.5, y, 1.1, 6, 0.4, "#7f8271");
  }
  ctx.strokeStyle = "#777063"; ctx.lineWidth = 2.1;
  ctx.beginPath(); ctx.moveTo(20, -48); ctx.lineTo(27, -49); ctx.lineTo(29, -44); ctx.stroke();
  round(ctx, 26.5, -47, 4.5, 8.5, 1.7, "#1c201c");
  round(ctx, 26.7, -46.6, 0.7, 6, 0.3, "#b29b72");
  round(ctx, -24, -20.5, 48, 6.5, 2, "#171c1b");
  round(ctx, -23, -20.5, 46, 0.8, 0.3, "#6d6453");
  round(ctx, -6, -18.5, 12, 2, 0.8, "#595448");
  for (const x of [-15, -10, -5, 0, 5, 10, 15]) round(ctx, x, -79, 2.2, 3.5, 1, "#0e1515");
  for (const [x, y] of [[-25, -74], [25, -74], [-27, -25], [27, -25]]) {
    ellipse(ctx, x, y, 1.15, 1.15, "#121817"); ellipse(ctx, x - 0.2, y - 0.3, 0.72, 0.7, "#6a6b5b");
  }
  ctx.restore();
}

function paintBookcase(ctx, L) {
  if (paintRoom4Bookcase(ctx, L)) return;
  const { Q } = L, hx = L.half;
  const b = { x0: 0.015 * hx, x1: 0.255 * hx, d0: 568, d1: 597, h: 182 };
  footShadow(ctx, L, b);
  block(ctx, L, { ...b, y0: 0, y1: b.h }, { side: "#24170e", top: "#66503a", front: "#291a10" });
  const face = (x0, x1, y0, y1, fill, d = b.d0 - 0.5) => fillPoly(ctx, [Q(x0, y1, d), Q(x1, y1, d), Q(x1, y0, d), Q(x0, y0, d)], fill);
  face(b.x0 + 4, b.x1 - 4, 9, 176, "#0f0c09");
  const rnd = lcg(693), colors = ["#414634", "#694839", "#3b4244", "#6c5a36", "#44302e"];
  for (const bottom of [12, 51, 90, 129]) {
    let x = b.x0 + 5;
    while (x < b.x1 - 8) {
      const width = 3.2 + rnd() * 3.1, height = 26 + rnd() * 8;
      face(x, x + width, bottom, bottom + height, colors[Math.floor(rnd() * colors.length)]);
      face(x, x + 0.6, bottom + 1, bottom + height - 1, "rgba(193,162,113,0.15)");
      for (const y of [bottom + 4, bottom + height - 5]) face(x + 0.6, x + width - 0.6, y, y + 0.5, "#9b8150");
      if (rnd() > 0.6) face(x + width * 0.22, x + width * 0.78, bottom + height * 0.48, bottom + height * 0.69, "#aaa080");
      x += width + 0.5;
    }
    face(b.x0 + 2, b.x1 - 2, bottom - 4, bottom - 0.3, "#533b24", b.d0 - 2);
    face(b.x0 + 2, b.x1 - 2, bottom - 0.8, bottom, "#88704a", b.d0 - 2);
  }
  for (const x of [b.x0, b.x1 - 3.3]) {
    face(x, x + 3.3, 4, 179, "#503822", b.d0 - 3);
    face(x + 0.4, x + 0.9, 8, 177, "#786044", b.d0 - 3);
  }
  block(ctx, L, { x0: b.x0 - 2, x1: b.x1 + 2, d0: b.d0 - 3, d1: b.d1, y0: 179, y1: 184 },
    { side: "#39281a", top: "#665039", front: "#533c25" });
}

function paintDeskItems(ctx, L) {
  const { Q } = L, d = L.desk, x = d.x0 + (d.x1 - d.x0) * 0.44;
  for (let i = 0; i < 3; i++) {
    const y = d.h + 0.5 + i * 0.5;
    fillPoly(ctx, [Q(x - 14 + i, y, 529), Q(x + 13 + i, y, 532), Q(x + 11 + i, y, 554), Q(x - 15 + i, y, 551)],
      i === 2 ? "#9c9174" : "#73664c");
  }
  const a = Q(x - 8, d.h + 2.1, 536), b = Q(x + 9, d.h + 2.1, 537);
  ctx.strokeStyle = "rgba(48,38,23,0.5)"; ctx.lineWidth = 0.5;
  for (let j = 0; j < 4; j++) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y - j * 2); ctx.lineTo(b.x - j % 2 * 7, b.y - j * 2); ctx.stroke();
  }
  const ink = Q(x - 23, d.h + 2, 552);
  ctx.save(); ctx.translate(ink.x, ink.y); ctx.scale(ink.s, ink.s);
  round(ctx, -3.5, -7, 7, 7, 1.2, gradient(ctx, -3, 0, 3, 0, [[0, "#101617"], [0.35, "#425656"], [0.65, "#142428"], [1, "#030708"]]));
  ellipse(ctx, 0, -7.2, 3.1, 1.2, "#7a6950"); ellipse(ctx, 0, -7.3, 1.8, 0.7, "#080c0a");
  ctx.strokeStyle = "#756042"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(21, -6); ctx.stroke();
  ctx.restore();
}

// The chair pulled up to the desk, as it was left: turned to the desk, so it
// is its back that is seen — the back legs running on up into the posts of
// the back, a curved crest rail and a vase-shaped splat between them, a
// leather seat nailed round in brass, stretchers low between the legs. It is
// painted from the far side to the near, so the back stands in front of the
// seat as it does in the room.
function paintChair(ctx, L) {
  if (paintRoom4Chair(ctx, L)) return;
  const { Q } = L, d = L.desk, x = d.x0 + (d.x1 - d.x0) * 0.56;
  const near = 418, far = 456; // the back of the chair (towards us), its front (towards the desk)
  const seat = 45; // the seat's height
  const wood = { side: "#221710", top: "#7c5c40", front: "#4a3420" };
  const backWood = { side: "#2a1c12", top: "#8a6848", front: "#3c2a1a" };
  // a shape drawn flat in the plane of the back
  const inPlane = (pts, depth, fill) => fillPoly(ctx, pts.map(([px, py]) => Q(px, py, depth)), fill);
  const shadow = Q(x, 0, (near + far) / 2);
  soft(ctx, shadow.x, shadow.y, 46 * L.u, 13 * L.u, "0,0,0", 0.7);
  // the front legs, by the desk, and the stretchers between all four
  for (const side of [-1, 1]) block(ctx, L, { x0: x + side * 19 - 1.5, x1: x + side * 19 + 1.5, d0: far - 3, d1: far, y0: 0, y1: seat }, wood);
  block(ctx, L, { x0: x - 18, x1: x + 18, d0: far - 2.5, d1: far - 1, y0: 13, y1: 15 }, wood);
  for (const side of [-1, 1]) block(ctx, L, { x0: x + side * 19 - 0.8, x1: x + side * 19 + 0.8, d0: near + 2, d1: far - 2, y0: 10, y1: 12 }, wood);
  // the seat: its frame, and the leather stretched over it
  block(ctx, L, { x0: x - 22, x1: x + 22, d0: near - 1, d1: far + 1, y0: seat - 5, y1: seat }, wood);
  fillPoly(ctx, [Q(x - 21, seat + 1.6, near), Q(x + 21, seat + 1.6, near), Q(x + 20, seat + 1.2, far), Q(x - 20, seat + 1.2, far)], "#3a241d");
  fillPoly(ctx, [Q(x - 14, seat + 1.7, near + 6), Q(x + 10, seat + 1.7, near + 8), Q(x + 8, seat + 1.4, far - 10), Q(x - 12, seat + 1.4, far - 12)], "rgba(150,96,70,0.16)");
  for (let i = 0; i < 9; i++) {
    const p = Q(x - 20 + i * 5, seat - 0.8, near - 1.2);
    ellipse(ctx, p.x, p.y, 0.45 * p.s, 0.45 * p.s, "#a8915f");
  }
  // the back: the back legs going on up as its posts
  const top = 104;
  for (const side of [-1, 1]) {
    block(ctx, L, { x0: x + side * 20 - 1.8, x1: x + side * 20 + 1.8, d0: near - 3.5, d1: near, y0: 0, y1: top }, backWood);
    // a finial on each, turned
    const f = Q(x + side * 20, top + 2, near - 1.8);
    ellipse(ctx, f.x, f.y, 2.3 * f.s, 2.6 * f.s, "#5a4029");
    ellipse(ctx, f.x - 0.6 * f.s, f.y - 0.9 * f.s, 0.9 * f.s, 0.9 * f.s, "rgba(214,170,120,0.35)");
  }
  const plane = near - 2.2;
  // the low rail just above the seat, and the crest rail, curved up in the middle
  inPlane([[x - 18.5, 58], [x + 18.5, 58], [x + 18.5, 62], [x - 18.5, 62]], plane, "#3a2818");
  const crest = [];
  for (let i = 0; i <= 12; i++) { const k = i / 12, px = x - 19 + 38 * k; crest.push([px, 97 + Math.sin(k * Math.PI) * 5]); }
  for (let i = 12; i >= 0; i--) { const k = i / 12, px = x - 19 + 38 * k; crest.push([px, 90 + Math.sin(k * Math.PI) * 3]); }
  inPlane(crest, plane, "#43301e");
  // the light along its top
  const ridge = crest.slice(0, 13);
  inPlane(ridge.concat([...ridge].reverse().map(([px, py]) => [px, py - 1.2])), plane - 0.2, "rgba(220,176,124,0.22)");
  // the splat: a vase between the rails, waisted and swelling
  inPlane([[x - 3.5, 62], [x - 6.5, 68], [x - 5.5, 76], [x - 2.6, 82], [x - 4.2, 87], [x - 5.2, 91], [x + 5.2, 91], [x + 4.2, 87], [x + 2.6, 82], [x + 5.5, 76], [x + 6.5, 68], [x + 3.5, 62]], plane, "#3f2c1b");
  inPlane([[x - 1.2, 64], [x - 3.8, 69], [x - 3, 76], [x - 1, 81], [x - 0.2, 81], [x - 1.6, 76], [x - 2.2, 69], [x - 0.2, 64]], plane - 0.2, "rgba(214,168,118,0.16)");
  // the lamp on the desk catches the near edge of each post
  for (const side of [-1, 1]) {
    const a = Q(x + side * 20 - side * 1.8, 2, near - 3.5), b = Q(x + side * 20 - side * 1.8, top, near - 3.5);
    ctx.strokeStyle = "rgba(226,176,118,0.2)"; ctx.lineWidth = Math.max(0.6, 0.8 * a.s);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
}

function paintFirewood(ctx, L) {
  const photographed = paintRoom4Firewood(ctx, L);
  const st = L.stove, p = L.Q(st.x + 43, 0, st.d - 42);
  if (!photographed) {
    soft(ctx, p.x, p.y + 3 * p.s, 24 * p.s, 8 * p.s, "0,0,0", 0.7);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
    const rnd = lcg(741);
    ctx.beginPath(); ctx.moveTo(-18, -29); ctx.lineTo(18, -29); ctx.lineTo(14, -2); ctx.quadraticCurveTo(0, 3, -14, -2); ctx.closePath();
    ctx.fillStyle = gradient(ctx, -18, 0, 18, 0, [[0, "#6d4f2f"], [0.4, "#8c6b41"], [1, "#3b2a1b"]]); ctx.fill();
    ctx.save(); ctx.clip();
    for (let y = -26; y < 0; y += 2.4) {
      ctx.strokeStyle = "rgba(24,14,7,0.65)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-19, y); ctx.quadraticCurveTo(0, y + 3, 19, y); ctx.stroke();
    }
    for (let x = -17; x < 18; x += 3) {
      ctx.strokeStyle = "rgba(203,157,93,0.28)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(x, -29); ctx.lineTo(x * 0.75, 1); ctx.stroke();
    }
    ctx.restore();
    ellipse(ctx, 0, -29, 19, 5.3, "#795e3b"); ellipse(ctx, 0, -29.5, 16.5, 3.9, "#160e08");
    for (let i = 0; i < 7; i++) {
      ctx.save(); ctx.translate(-12 + i * 4.1, -30 - rnd() * 4); ctx.rotate(-0.7 + rnd() * 1.4);
      const length = 11 + rnd() * 9;
      round(ctx, -3, -length, 6, length, 1.5, "#392b1c");
      ctx.strokeStyle = "#786046"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-1.5, -length + 1); ctx.lineTo(-1.2, -1); ctx.stroke();
      ellipse(ctx, 0, -length, 3, 1.7, "#b29569");
      ellipse(ctx, 0, -length, 1.6, 0.8, "#786046");
      ctx.restore();
    }
    ctx.strokeStyle = "#a28251"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, -28, 17, 16, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  const tools = L.Q(st.x - 43, 0, st.d + 8);
  ctx.save(); ctx.translate(tools.x, tools.y); ctx.scale(tools.s, tools.s);
  ellipse(ctx, 0, -1.4, 10, 3, "#202322");
  round(ctx, -1, -57, 2, 55, 0.5, "#52534b");
  round(ctx, -10, -55, 20, 1.4, 0.5, "#696350");
  for (const x of [-7, 0, 7]) {
    ctx.strokeStyle = "#656252"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(x, -51, 2, Math.PI, Math.PI * 3); ctx.moveTo(x, -49); ctx.lineTo(x, -11); ctx.stroke();
    if (x < 0) round(ctx, x - 2.6, -14, 5.2, 9, 1, "#202321");
    else if (x > 0) { ctx.beginPath(); ctx.moveTo(x, -11); ctx.lineTo(x + 4, -8); ctx.stroke(); }
  }
  ctx.restore();
}

/** Non-interactive furnishings never overlap the three puzzle hit areas. */
export function paintRoomDetails(ctx, L, layer) {
  if (layer === "back") paintBookcase(ctx, L);
  else { paintDeskItems(ctx, L); paintChair(ctx, L); paintFirewood(ctx, L); }
}
