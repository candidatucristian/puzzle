import { makeCanvas, lcg } from "./paint.js";

/** The house's envelope — the one on the desk in the ROTOR study, and the
 *  only one there is: cream paper, back up, the side and bottom flaps
 *  folded in to meet under the tip of the top flap, which lies a paper's
 *  thickness proud; on the tip a blob of red wax, raised and glossy, a ring
 *  pressed into it.
 *
 *  It is painted in its own plane, wherever that lies:
 *    env.at(a, b)   where on the screen a point of it is — `a` across it from
 *                   −w/2 to w/2, `b` from its near edge (−d/2) to its far
 *                   edge (d/2)
 *    env.w, env.d   its width and depth, in those units
 *    env.k          how many pixels one unit is there
 *    env.seal       { x, y, rx, ry } the wax on the screen
 *  and look says how it is lit:
 *    left, right    the paper's colour at either side (css)
 *    wax            the wax's colour (css)
 *    shadow         its soft contact shadow on what it lies on
 *    shine          the light's glint on the wax
 *  A scene that lights in two layers paints it once into each. */
export function paintEnvelope(ctx, env, look) {
  const { w, d, at, k, seal } = env;
  const quad = [at(-w / 2, -d / 2), at(w / 2, -d / 2), at(w / 2, d / 2), at(-w / 2, d / 2)];
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
  // it rests on something: a soft contact shadow round it
  if (look.shadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = k * 0.6;
    ctx.shadowOffsetY = k * 0.12;
    poly(quad);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();
  }
  const gr = ctx.createLinearGradient(quad[0].x, 0, quad[1].x, 0);
  gr.addColorStop(0, look.left);
  gr.addColorStop(1, look.right);
  poly(quad);
  ctx.fillStyle = gr;
  ctx.fill();
  // the folds: side and bottom flaps meeting under the top flap's tip
  const tip = at(0, d * 0.14);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = Math.max(0.8, k * 0.05);
  for (const a of [at(-w / 2, -d / 2), at(w / 2, -d / 2)]) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
  // the top flap sits a paper's thickness proud: a crisper edge
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = k * 0.25;
  ctx.shadowOffsetY = k * 0.06;
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, k * 0.07);
  for (const a of [at(-w / 2, d / 2), at(w / 2, d / 2)]) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
  ctx.restore();
  // the seal: a blob of wax, raised and glossy
  const { rx, ry } = seal;
  ctx.save();
  ctx.translate(seal.x, seal.y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = look.wax;
  for (const [ox, oy, rr] of [[0, 0, 1], [-0.7, 0.35, 0.36], [0.76, -0.2, 0.3], [0.42, 0.62, 0.32]]) {
    ctx.beginPath();
    ctx.arc(ox * rx, oy * rx, rr * rx, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, rx * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (look.shine) {
    const gx = seal.x + rx * 0.35, gy = seal.y - ry * 0.3, sx = rx * 0.35, sy = ry * 0.25;
    if (sx > 0 && sy > 0) {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.scale(sx, sy);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(255,210,170,0.55)");
      g.addColorStop(1, "rgba(255,210,170,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  }
}

/** The letter out of the envelope, unfolded: aged paper, fold creases, the
 *  unmarked seal. The canvas carries a margin for the paper's shadow; the
 *  image goes centred. Added to `textures` as `key`. */
export function paintLetter(textures, key, w, h) {
  const m = Math.round(Math.min(w, h) * 0.06);
  const cv = makeCanvas(w + 2 * m, h + 2 * m);
  const g = cv.getContext("2d");
  const rnd = lcg(909);
  const edge = [];
  const jag = () => (rnd() - 0.5) * 1.6;
  for (let x = 0; x <= w; x += 12) edge.push([m + x, m + jag()]);
  for (let y = 0; y <= h; y += 12) edge.push([m + w + jag(), m + y]);
  for (let x = w; x >= 0; x -= 12) edge.push([m + x, m + h + jag()]);
  for (let y = h; y >= 0; y -= 12) edge.push([m + jag(), m + y]);
  const sheet = () => {
    g.beginPath();
    edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  g.save();
  g.shadowColor = "rgba(0,0,0,0.65)";
  g.shadowBlur = m * 0.8;
  g.shadowOffsetY = m * 0.25;
  sheet();
  g.fillStyle = "#000";
  g.fill();
  g.restore();

  g.save();
  sheet();
  g.clip();
  const base = g.createLinearGradient(m, 0, m + w, 0);
  base.addColorStop(0, "#cdb994");
  base.addColorStop(1, "#e6d4ad"); // the candle is off to the right
  g.fillStyle = base;
  g.fillRect(m, m, w, h);
  // fibres
  for (let i = 0; i < (w * h) / 60; i++) {
    const x = m + rnd() * w;
    const y = m + rnd() * h;
    const a = rnd() * Math.PI;
    const l = 2 + rnd() * 6;
    g.strokeStyle =
      rnd() < 0.5 ? "rgba(120,90,50,0.07)" : "rgba(255,248,230,0.1)";
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // the four panels it was folded into lie at slightly different angles
  const fx = m + w * 0.5;
  const fy = m + h * 0.48;
  g.fillStyle = "rgba(60,40,15,0.07)";
  g.fillRect(m, m, fx - m, fy - m);
  g.fillStyle = "rgba(255,250,235,0.06)";
  g.fillRect(fx, fy, m + w - fx, m + h - fy);
  g.fillStyle = "rgba(60,40,15,0.035)";
  g.fillRect(m, fy, fx - m, m + h - fy);
  const crease = (x0, y0, x1, y1, ox, oy) => {
    g.lineWidth = 1.3;
    g.strokeStyle = "rgba(90,65,35,0.28)";
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.lineWidth = 1;
    g.strokeStyle = "rgba(255,250,235,0.4)";
    g.beginPath();
    g.moveTo(x0 + ox, y0 + oy);
    g.lineTo(x1 + ox, y1 + oy);
    g.stroke();
  };
  crease(fx, m, fx, m + h, 1.3, 0);
  crease(m, fy, m + w, fy, 0, 1.3);
  // a coffee ring, long dried, and a tired edge
  g.strokeStyle = "rgba(120,80,30,0.09)";
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(
    m + w * 0.2,
    m + h * 0.22,
    w * 0.07,
    w * 0.065,
    0.3,
    0.4,
    Math.PI * 1.8,
  );
  g.stroke();
  const age = g.createRadialGradient(
    m + w / 2,
    m + h / 2,
    Math.min(w, h) * 0.3,
    m + w / 2,
    m + h / 2,
    Math.hypot(w, h) * 0.55,
  );
  age.addColorStop(0, "rgba(110,75,35,0)");
  age.addColorStop(1, "rgba(110,75,35,0.32)");
  g.fillStyle = age;
  g.fillRect(m, m, w, h);
  g.restore();

  seal(g, m + w - 64, m + h - 60, 21);
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, cv);
  return key;
}

// the wax on the letter, where the envelope was sealed
function seal(g, x, y, r) {
  g.fillStyle = "#6e150c";
  for (const [ox, oy, rr] of [
    [0, 0, 1],
    [-0.72, 0.38, 0.38],
    [0.76, -0.28, 0.31],
    [0.42, 0.66, 0.33],
  ]) {
    g.beginPath();
    g.arc(x + ox * r, y + oy * r, rr * r, 0, Math.PI * 2);
    g.fill();
  }
  const body = g.createRadialGradient(
    x - r * 0.3,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r * 0.85,
  );
  body.addColorStop(0, "#b3402c");
  body.addColorStop(1, "#7a1a0f");
  g.fillStyle = body;
  g.beginPath();
  g.arc(x - 1, y - 2, r * 0.82, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = "rgba(60,8,4,0.8)";
  g.beginPath();
  g.arc(x, y, r * 0.64, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = "rgba(220,120,95,0.35)";
  g.beginPath();
  g.arc(x, y + 1, r * 0.64, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.2)";
  g.beginPath();
  g.ellipse(
    x - r * 0.32,
    y - r * 0.45,
    r * 0.26,
    r * 0.1,
    -0.3,
    0,
    Math.PI * 2,
  );
  g.fill();
}

/** Reading what was in the envelope, as in the ROTOR study: the room goes
 *  dark, the letter lies unfolded in the middle, and a click anywhere puts it
 *  down again. `fill(container, box)` writes on it — box is the sheet on the
 *  screen. Returns { container, isOpen, open(), close() }; `onOpen` and
 *  `onClose` are told as it starts to open and once it has gone. */
export function letterOverlay(scene, W, H, { key, fill, onOpen, onClose, depth = 60 }) {
  const ov = scene.add.container(0, 0).setDepth(depth).setVisible(false);
  const dark = scene.add.rectangle(0, 0, W, H, 0x05030a, 0.78).setOrigin(0, 0).setInteractive();
  ov.add(dark);
  const bw = Math.min(W * 0.62, 540);
  const bhh = Math.min(H * 0.62, 430);
  const box = { x: W / 2 - bw / 2, y: H / 2 - bhh / 2, w: bw, h: bhh };
  ov.add(scene.add.image(W / 2, H / 2, paintLetter(scene.textures, key, bw, bhh)));
  fill?.(ov, box);
  ov.add(
    scene.add
      .text(W / 2, box.y + bhh - 18, "click anywhere to put it down", { fontFamily: '"Special Elite", monospace', fontSize: "12px", color: "#6b5a44" })
      .setOrigin(0.5)
      .setAlpha(0.9),
  );
  let open = false;
  const api = {
    container: ov,
    get isOpen() { return open; },
    open() {
      if (open) return;
      open = true;
      onOpen?.();
      scene.services.audio.playClick(scene);
      ov.setVisible(true).setAlpha(0);
      scene.tweens.add({ targets: ov, alpha: 1, duration: 220 });
    },
    close() {
      if (!open) return;
      scene.tweens.add({
        targets: ov,
        alpha: 0,
        duration: 180,
        onComplete: () => {
          ov.setVisible(false);
          open = false;
          onClose?.();
        },
      });
    },
  };
  dark.on("pointerdown", () => api.close());
  return api;
}
