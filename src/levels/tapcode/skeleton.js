import { soft, rgb } from "../../shared/paint.js";

const PALE = "150,170,214"; // what comes down the hatch

// Whoever cut the marks, long since bones: slumped against the wall, knees
// drawn up, one wrist still in the shackle bolted to the brick, the other
// arm fallen across a knee, the skull sunk on the chest. Old bone, stained
// and dull. `L.skel` is where it sits (x, and s its size); `L.floorY` the floor.
export function paintSkeleton(ctx, L) {
  const { x, s: k } = L.skel;
  const y = L.floorY - 3 * k;
  const P = (dx, dy) => [x + dx * k, y + dy * k];
  const BONE = [168, 156, 128];
  const tone = (m) => rgb(BONE[0] * m, BONE[1] * m, BONE[2] * m);
  // a long bone: a shaft that narrows in the middle, swelling to its ends,
  // lit on the side toward the hatch
  const bone = (a, b, w, m = 1) => {
    const [ax, ay] = P(...a);
    const [bx, by] = P(...b);
    const ang = Math.atan2(by - ay, bx - ax);
    const len = Math.hypot(bx - ax, by - ay);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    const hw = (w * k) / 2;
    const g = ctx.createLinearGradient(0, -hw * 1.6, 0, hw * 1.6);
    g.addColorStop(0, tone(1.05 * m));
    g.addColorStop(0.5, tone(0.8 * m));
    g.addColorStop(1, tone(0.42 * m));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -hw * 1.25);
    ctx.quadraticCurveTo(len * 0.5, -hw * 0.55, len, -hw * 1.25);
    ctx.quadraticCurveTo(len + hw * 1.3, 0, len, hw * 1.25);
    ctx.quadraticCurveTo(len * 0.5, hw * 0.55, 0, hw * 1.25);
    ctx.quadraticCurveTo(-hw * 1.3, 0, 0, -hw * 1.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(20,16,10,0.55)";
    ctx.lineWidth = Math.max(0.6, 0.7 * k);
    ctx.stroke();
    // the knuckle of the joint at each end
    ctx.fillStyle = "rgba(30,24,16,0.35)";
    for (const ex of [0, len]) {
      ctx.beginPath();
      ctx.ellipse(ex, hw * 0.3, hw * 0.5, hw * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  // its shadow on the floor and the wall behind
  soft(ctx, x + 6 * k, y + 2 * k, 58 * k, 9 * k, "0,0,0", 0.7);
  soft(ctx, x - 2 * k, y - 66 * k, 46 * k, 76 * k, "0,0,0", 0.45);
  // the shackle's bolt in the wall, the chain down to the wrist
  const [bx, by] = P(-34, -168);
  ctx.fillStyle = "#14151a";
  ctx.beginPath();
  ctx.arc(bx, by, 6 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(150,165,195,0.25)";
  ctx.beginPath();
  ctx.arc(bx - 1.5 * k, by - 1.5 * k, 2 * k, 0, Math.PI * 2);
  ctx.fill();
  soft(ctx, bx, by + 14 * k, 4 * k, 22 * k, "60,40,20", 0.35); // rust run down the stone
  for (let i = 0; i < 4; i++) {
    const [cx, cy] = P(-34 - i * 0.4, -161 + i * 4.6);
    const along = i % 2 === 0;
    for (const [col, lw] of [
      ["#0e0f12", 3.4],
      ["#4e4a46", 1.6],
    ]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw * k;
      ctx.beginPath();
      ctx.ellipse(cx, cy, (along ? 2.4 : 1.2) * k, 3.4 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // the spine, slumped against the wall: small vertebrae, each in shadow below
  for (let i = 0; i < 12; i++) {
    const [vx, vy] = P(-3 + i * 0.35, -30 - i * 5.4);
    ctx.fillStyle = tone(0.35);
    ctx.beginPath();
    ctx.ellipse(vx, vy + 1.2 * k, 3.4 * k, 2.2 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tone(0.72 + (i % 3) * 0.06);
    ctx.beginPath();
    ctx.ellipse(vx, vy, 3 * k, 1.8 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the ribs: six thin pairs curving round from the spine
  const [rx, ry] = P(0, -76);
  for (let i = 0; i < 6; i++) {
    const yy = ry - 16 * k + i * 5.6 * k;
    const rw = (13 - Math.abs(i - 2) * 1.3) * k;
    for (const d of [-1, 1]) {
      ctx.strokeStyle = "rgba(14,10,6,0.7)";
      ctx.lineWidth = 2.6 * k;
      ctx.beginPath();
      ctx.moveTo(rx + d * 2 * k, yy - 2 * k);
      ctx.bezierCurveTo(rx + d * rw * 1.25, yy - 3 * k, rx + d * rw * 1.3, yy + 6 * k, rx + d * rw * 0.45, yy + 8 * k);
      ctx.stroke();
      ctx.strokeStyle = tone(d < 0 ? 0.95 : 0.62);
      ctx.lineWidth = 1.5 * k;
      ctx.stroke();
    }
  }
  ctx.fillStyle = tone(0.7);
  ctx.beginPath();
  ctx.moveTo(rx - 2 * k, ry - 18 * k);
  ctx.lineTo(rx + 2 * k, ry - 18 * k);
  ctx.lineTo(rx + 1.4 * k, ry + 6 * k);
  ctx.lineTo(rx - 1.4 * k, ry + 6 * k);
  ctx.closePath();
  ctx.fill();
  // the pelvis: two winged hip bones round the base of the spine
  const [px, py] = P(0, -24);
  for (const d of [-1, 1]) {
    ctx.fillStyle = tone(0.35);
    ctx.beginPath();
    ctx.ellipse(px + d * 7 * k, py - 1 * k, 8.5 * k, 4.6 * k, d * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tone(d < 0 ? 0.88 : 0.6);
    ctx.beginPath();
    ctx.ellipse(px + d * 7 * k, py - 1.6 * k, 7.6 * k, 3.8 * k, d * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(10,8,6,0.8)";
    ctx.beginPath();
    ctx.ellipse(px + d * 4.5 * k, py + 0.5 * k, 1.8 * k, 2 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // collarbones, the chained arm raised to the shackle, its hand hanging
  bone([-18, -94], [-2, -90], 2.4, 0.9);
  bone([2, -90], [16, -93], 2.4, 0.7);
  bone([-19, -94], [-31, -122], 3.4);
  bone([-31, -122], [-33, -144], 2.8);
  const [wx, wy] = P(-33, -146);
  ctx.fillStyle = "#0e0f12";
  ctx.beginPath();
  ctx.roundRect(wx - 7 * k, wy - 3.6 * k, 14 * k, 7.2 * k, 2 * k);
  ctx.fill();
  ctx.fillStyle = "#4a4640";
  ctx.fillRect(wx - 5.5 * k, wy - 2.6 * k, 11 * k, 1.5 * k);
  for (const d of [-3, -1, 1, 3]) bone([-33 + d * 0.9, -150], [-33 + d * 1.3, -158 + Math.abs(d) * 0.8], 1.3, 0.85);
  // the skull, sunk forward on the chest: the cranium, the cheekbones, deep
  // sockets, the nose's hollow, the upper teeth, the jaw fallen a little open
  const [sx, sy] = P(6, -106);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(0.55);
  const sk = ctx.createRadialGradient(-5 * k, -6 * k, 1 * k, 0, 0, 15 * k);
  sk.addColorStop(0, tone(1.05));
  sk.addColorStop(0.65, tone(0.76));
  sk.addColorStop(1, tone(0.4));
  ctx.fillStyle = "rgba(10,8,6,0.6)";
  ctx.beginPath();
  ctx.ellipse(0.8 * k, 0.8 * k, 12.5 * k, 13.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = sk;
  ctx.beginPath();
  ctx.ellipse(0, -2 * k, 11.5 * k, 12.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // the face: narrower, the cheekbones flaring
  ctx.beginPath();
  ctx.moveTo(-9.5 * k, 2 * k);
  ctx.lineTo(-10.5 * k, 7 * k);
  ctx.lineTo(-6 * k, 12.5 * k);
  ctx.lineTo(6 * k, 12.5 * k);
  ctx.lineTo(10.5 * k, 7 * k);
  ctx.lineTo(9.5 * k, 2 * k);
  ctx.closePath();
  ctx.fill();
  // the sockets: deep, a little irregular, darkest at the top
  ctx.fillStyle = "#0a0806";
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * 1.5 * k, 1 * k);
    ctx.quadraticCurveTo(d * 3 * k, -2.5 * k, d * 7.5 * k, -1.5 * k);
    ctx.quadraticCurveTo(d * 9 * k, 2.5 * k, d * 7 * k, 6 * k);
    ctx.quadraticCurveTo(d * 3.5 * k, 7 * k, d * 1.5 * k, 4.5 * k);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, 6 * k);
  ctx.lineTo(1.8 * k, 9.5 * k);
  ctx.lineTo(0, 10.2 * k);
  ctx.lineTo(-1.8 * k, 9.5 * k);
  ctx.closePath();
  ctx.fill();
  // the upper teeth
  ctx.fillStyle = tone(0.9);
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.roundRect(i * 1.55 * k - 0.65 * k, 11.8 * k, 1.3 * k, 2.6 * k, 0.4 * k);
    ctx.fill();
  }
  // the jaw, hanging a little open
  ctx.fillStyle = tone(0.55);
  ctx.beginPath();
  ctx.moveTo(-8.5 * k, 9 * k);
  ctx.quadraticCurveTo(-7 * k, 19 * k, 0, 19.5 * k);
  ctx.quadraticCurveTo(7 * k, 19 * k, 8.5 * k, 9 * k);
  ctx.lineTo(6 * k, 11 * k);
  ctx.quadraticCurveTo(0, 16.5 * k, -6 * k, 11 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = tone(0.7);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.roundRect(i * 1.55 * k - 0.6 * k, 14.6 * k, 1.2 * k, 2 * k, 0.4 * k);
    ctx.fill();
  }
  // a crack across the crown, the stains of years
  ctx.strokeStyle = "rgba(30,20,12,0.55)";
  ctx.lineWidth = Math.max(0.6, 0.7 * k);
  ctx.beginPath();
  ctx.moveTo(-4 * k, -13 * k);
  ctx.lineTo(-1 * k, -9 * k);
  ctx.lineTo(-2.5 * k, -6 * k);
  ctx.stroke();
  soft(ctx, 4 * k, -6 * k, 6 * k, 5 * k, "70,50,26", 0.35);
  ctx.restore();
  // the legs, knees drawn up, and the bones of the feet
  bone([-8, -22], [-21, -55], 4.2);
  bone([-21, -55], [-25, -6], 3.4, 0.85);
  bone([8, -22], [28, -53], 4.2, 0.75);
  bone([28, -53], [37, -6], 3.4, 0.62);
  for (const [fx, d, m] of [
    [-25, -1, 0.85],
    [37, 1, 0.6],
  ]) {
    for (let t = 0; t < 4; t++) bone([fx, -5], [fx + d * (9 + t), -1 + t * 1.2], 1.4, m);
  }
  // the free arm, fallen across the right knee, its fingers hanging
  bone([16, -93], [24, -62], 3.2, 0.7);
  bone([24, -62], [40, -54], 2.6, 0.62);
  for (let t = 0; t < 4; t++) bone([40, -54], [44 + t * 0.8, -46 + t * 0.6], 1.2, 0.62);
  // the light from the hatch on its near side; the rest in the cellar's dark
  soft(ctx, x - 16 * k, y - 84 * k, 26 * k, 66 * k, PALE, 0.12, "lighter");
  soft(ctx, x + 22 * k, y - 50 * k, 30 * k, 60 * k, "0,0,0", 0.25);
}
