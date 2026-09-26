import { PENCIL as RY_SKETCH } from "../../shared/theme.js";
import { ryBez } from "./geometry.js";
const RY_WARM = 0xffdf9e;
export const RY_WINNERS = [
  { place: 1, name: "Alan Brown", cup: "gold" },
  { place: 2, name: "Chad Dawson", cup: "silver" },
  { place: 3, name: "Eugene Fontaine", cup: "bronze" },
];
const RY_CUPS = { gold: 0xd4b04a, silver: 0xc3c7cf, bronze: 0xb27a45 };

// a trophy cup in one metal, centred on (0, 0), h pixels tall
function drawCup(g, h, color) {
  const shade = (c, k) =>
    (Math.round(((c >> 16) & 255) * k) << 16) |
    (Math.round(((c >> 8) & 255) * k) << 8) |
    Math.round((c & 255) * k);
  const dark = shade(color, 0.6);
  const px = (pts) => pts.map(([x, y]) => ({ x: x * h, y: y * h }));
  const lw = Math.max(1.2, h * 0.025);

  // handles, behind the bowl
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 14;
      pts.push({
        x: side * (0.31 + Math.cos(a) * 0.15) * h,
        y: (-0.27 + Math.sin(a) * 0.17) * h,
      });
    }
    g.lineStyle(h * 0.065, color, 1);
    g.strokePoints(pts, false);
  }

  // bowl: two mirrored curves from the rim down to the stem
  const left = ryBez([-0.32, -0.5], [-0.37, -0.12], [-0.09, 0.03], 10);
  const mirror = left.map(([x, y]) => [-x, y]);
  const bowl = px([...left, ...[...mirror].reverse()]);
  g.fillStyle(color, 1);
  g.fillPoints(bowl, true);
  // the shaded half and a highlight, so it reads as metal
  g.fillStyle(dark, 0.4);
  g.fillPoints(px([[0, -0.5], ...mirror, [0, 0.03]]), true);
  g.lineStyle(h * 0.05, 0xffffff, 0.45);
  g.lineBetween(-0.22 * h, -0.42 * h, -0.13 * h, -0.08 * h);
  // rim: the open top of the cup
  g.fillStyle(color, 1);
  g.fillEllipse(0, -0.5 * h, 0.66 * h, 0.1 * h);
  g.fillStyle(dark, 1);
  g.fillEllipse(0, -0.5 * h, 0.56 * h, 0.06 * h);

  // stem, knop, foot, base
  const foot = px([[-0.13, 0.3], [0.13, 0.3], [0.2, 0.38], [-0.2, 0.38]]);
  g.fillStyle(color, 1);
  g.fillRect(-0.07 * h, 0.03 * h, 0.14 * h, 0.27 * h);
  g.fillStyle(dark, 0.35);
  g.fillRect(0, 0.03 * h, 0.07 * h, 0.27 * h);
  g.fillStyle(color, 1);
  g.fillEllipse(0, 0.16 * h, 0.2 * h, 0.06 * h);
  g.fillPoints(foot, true);
  g.fillStyle(dark, 1);
  g.fillRect(-0.25 * h, 0.38 * h, 0.5 * h, 0.12 * h);
  g.fillStyle(color, 0.5);
  g.fillRect(-0.25 * h, 0.38 * h, 0.5 * h, 0.025 * h);

  // pencil over all of it
  g.lineStyle(lw, RY_SKETCH, 0.5);
  g.strokePoints(bowl, true);
  g.strokeEllipse(0, -0.5 * h, 0.66 * h, 0.1 * h);
  g.strokeRect(-0.07 * h, 0.03 * h, 0.14 * h, 0.27 * h);
  g.strokePoints(foot, true);
  g.strokeRect(-0.25 * h, 0.38 * h, 0.5 * h, 0.12 * h);
}

// The top three, on a board over the dark stage. Third place comes up first,
// then second, then the winner. animate = false builds it already complete.
export function drawPodium(scene, W, H, animate) {
  const s = Math.max(0.6, Math.min(W / 1100, H / 720, 1.1));
  const pw = 520 * s;
  const rowH = 76 * s;
  const head = 74 * s;
  const ph = head + rowH * 3 + 24 * s;
  const left = W / 2 - pw / 2;
  const top = H * 0.47 - ph / 2;
  const rnd = scene._rng(7717);
  const font = '"Special Elite", monospace';

  // the board: dark, ruled in pencil
  const frame = scene.add.graphics();
  frame.fillStyle(0x0b0d11, 0.95);
  frame.fillRect(left, top, pw, ph);
  const corners = [
    [left, top],
    [left + pw, top],
    [left + pw, top + ph],
    [left, top + ph],
  ];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    scene._pencilSeg(frame, rnd, a[0], a[1], b[0], b[1], 1.6, RY_SKETCH, 0.55, 1.2);
  }
  frame.lineStyle(1, RY_SKETCH, 0.16);
  frame.strokeRect(left + 8 * s, top + 8 * s, pw - 16 * s, ph - 16 * s);
  // a rule under the title, with a small diamond in the middle
  const ry = top + 62 * s;
  frame.lineStyle(1.2, RY_SKETCH, 0.3);
  frame.lineBetween(left + 40 * s, ry, W / 2 - 10, ry);
  frame.lineBetween(W / 2 + 10, ry, left + pw - 40 * s, ry);
  frame.fillStyle(RY_SKETCH, 0.5);
  frame.fillPoints(
    [
      { x: W / 2, y: ry - 4 },
      { x: W / 2 + 4, y: ry },
      { x: W / 2, y: ry + 4 },
      { x: W / 2 - 4, y: ry },
    ],
    true,
  );

  const title = scene.add
    .text(W / 2, top + 34 * s, "TOP 3", {
      fontFamily: font,
      fontSize: Math.round(28 * s) + "px",
      color: "#e8dcc0",
      letterSpacing: 8,
    })
    .setOrigin(0.5);

  const rows = RY_WINNERS.map((w, i) => {
    const y = top + head + rowH * (i + 0.5);
    const row = scene.add.container(0, y);
    const h = (i === 0 ? 62 : 56) * s;
    const cup = scene.add.graphics();
    cup.setPosition(left + 84 * s, 0);
    if (i === 0) {
      // the gold one catches the light
      cup.fillStyle(RY_WARM, 0.05);
      cup.fillCircle(0, 0, h * 0.95);
      cup.fillStyle(RY_WARM, 0.07);
      cup.fillCircle(0, 0, h * 0.62);
    }
    drawCup(cup, h, RY_CUPS[w.cup]);
    const label = scene.add
      .text(left + 150 * s, 0, w.place + ". " + w.name, {
        fontFamily: font,
        fontSize: Math.round(27 * s) + "px",
        color: i === 0 ? "#f3e7bf" : "#e0d8c4",
      })
      .setOrigin(0, 0.5);
    row.add([cup, label]);
    row._cup = cup;
    if (i === 0) {
      // a couple of sparkles on the gold cup
      for (const [dx, dy, r] of [
        [0.5, -0.46, 5],
        [-0.55, -0.12, 4],
      ]) {
        const sp = scene.add.graphics();
        sp.setPosition(left + 84 * s + dx * h, dy * h);
        sp.lineStyle(1.3, 0xfff1c9, 0.9);
        sp.lineBetween(-r * s, 0, r * s, 0);
        sp.lineBetween(0, -r * s, 0, r * s);
        sp.setAlpha(0.15);
        row.add(sp);
        scene.tweens.add({
          targets: sp,
          alpha: 0.9,
          duration: 900 + i * 300 + r * 120,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }
    if (i < 2) {
      frame.lineStyle(1, RY_SKETCH, 0.14);
      frame.lineBetween(
        left + 30 * s,
        top + head + rowH * (i + 1),
        left + pw - 30 * s,
        top + head + rowH * (i + 1),
      );
    }
    return row;
  });

  const podium = scene.add.container(0, 0, [frame, title, ...rows]).setDepth(25);

  if (!animate) return podium;
  frame.setAlpha(0);
  title.setAlpha(0);
  rows.forEach((row) => row.setAlpha(0));
  scene.tweens.add({
    targets: [frame, title],
    alpha: 1,
    duration: 700,
    ease: "Sine.easeOut",
  });
  [2, 1, 0].forEach((idx, k) => {
    const row = rows[idx];
    const ty = row.y;
    const delay = 800 + k * 750;
    row.y = ty + 14 * s;
    scene.tweens.add({
      targets: row,
      alpha: 1,
      y: ty,
      duration: 520,
      delay,
      ease: "Cubic.easeOut",
    });
    scene.tweens.add({
      targets: row._cup,
      scale: { from: 0.55, to: 1 },
      duration: 520,
      delay,
      ease: "Back.easeOut",
    });
  });

  return podium;
}
