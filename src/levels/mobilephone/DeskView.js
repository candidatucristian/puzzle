import { PENCIL as MP_SKETCH } from "../../shared/theme.js";
const MP_FONT = '"Special Elite", monospace';

/** Owns the desk and the graphics used by the phone vibration effects. */
export default class DeskView {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }

  build(W, H, layout) {
    for (const o of this.objects) o.destroy();
    this.objects = [];
    const add = (o) => {
      this.objects.push(o);
      return o;
    };
    const P = layout;
    const u = H / 720;
    const rnd = this.scene._rng(3131);

    // wooden desk, seen from above, under a lamp in the top-left corner
    const g = add(this.scene.add.graphics().setDepth(-10));
    g.fillGradientStyle(0x1b1713, 0x1a1612, 0x0e0c0a, 0x0d0b09, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(0xffcf8a, 0.022);
      g.fillCircle(W * 0.02, -H * 0.05, Math.max(W, H) * (0.12 + i * 0.1));
    }
    // planks and wood grain
    const seams = [0.2, 0.5, 0.8];
    for (let p = 0; p < 4; p++) {
      const top = p === 0 ? 0 : H * seams[p - 1];
      const bot = p < 3 ? H * seams[p] : H;
      for (let k = 0; k < 5; k++) {
        const y0 = top + (bot - top) * (0.12 + k * 0.19) + (rnd() - 0.5) * 6;
        const amp = 2 + rnd() * 4;
        const freq = 0.004 + rnd() * 0.006;
        const ph = rnd() * 6.28;
        const pts = [];
        for (let x = -10; x <= W + 40; x += 40)
          pts.push({ x, y: y0 + Math.sin(x * freq + ph) * amp });
        this.scene._drawPath(g, pts, 1, MP_SKETCH, 0.045 + rnd() * 0.03);
      }
    }
    for (const f of seams) {
      const y = H * f;
      this.scene._pencilSeg(
        g,
        rnd,
        -10,
        y + 3,
        W + 10,
        y + 3,
        1.4,
        0x000000,
        0.35,
        1.5,
      );
      this.scene._pencilSeg(
        g,
        rnd,
        -10,
        y,
        W + 10,
        y + (rnd() - 0.5) * 4,
        1.2,
        MP_SKETCH,
        0.16,
        2,
      );
    }
    for (const [kx, ky] of [
      [0.13, 0.62],
      [0.86, 0.36],
    ]) {
      for (let r = 1; r <= 3; r++)
        this.scene._pencilEllipse(
          g,
          rnd,
          W * kx,
          H * ky,
          9 * r * u,
          4 * r * u,
          1,
          MP_SKETCH,
          0.07,
        );
    }

    // the things on the desk, only if there's room beside the phone
    const Lw = P.x - 200 * P.s;
    this.mug = null;
    if (Lw > 150) {
      const lx = Lw * 0.5;
      const rx = W - Lw * 0.5;
      const items = add(this.scene.add.graphics().setDepth(-8));
      const mr = Math.min(Lw * 0.2, H * 0.1);
      this.mug = { cx: lx + Lw * 0.08, cy: H * 0.34, r: mr };
      this._drawMug(items, rnd, this.mug.cx, this.mug.cy, mr);
      this._drawPencil(
        items,
        rnd,
        rx - Lw * 0.04,
        H * 0.74,
        Math.min(Lw * 0.7, H * 0.5),
        -0.42,
      );
      this._drawNote(
        add,
        rx + Lw * 0.02,
        H * 0.32,
        Math.min(Lw * 0.42, H * 0.27),
      );
    }

    // coffee ripples, the screen's glow on the desk, buzz marks
    this.rippleGfx = add(this.scene.add.graphics().setDepth(-7));
    const glow = add(this.scene.add.graphics().setDepth(-6));
    const gy = P.y - 218 * P.s;
    for (let i = 6; i >= 1; i--) {
      glow.fillStyle(0xa8d67c, 0.025);
      glow.fillEllipse(P.x, gy, (220 + i * 55) * P.s, (160 + i * 45) * P.s);
    }
    this.screenGlow = glow;
    this.buzzGfx = add(this.scene.add.graphics().setDepth(1));

    // vignette
    const vg = add(this.scene.add.graphics().setDepth(15));
    const v = Math.min(W, H) * 0.24;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.7,
      0.7,
      0,
      0,
    );
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0,
      0.8,
      0.8,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.55,
      0,
      0.55,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.7,
      0,
      0.7,
    );
    vg.fillRect(W - v, 0, v, H);
  }

  // a mug of coffee, seen from above (its surface ripples when the phone buzzes)
  _drawMug(g, rnd, cx, cy, R) {
    // shadows
    g.fillStyle(0x000000, 0.32).fillCircle(
      cx + R * 0.14,
      cy + R * 0.18,
      R * 1.03,
    );
    g.fillStyle(0x000000, 0.32).fillRoundedRect(
      cx - R * 1.36,
      cy - R * 0.16 + R * 0.18,
      R * 0.62,
      R * 0.32,
      R * 0.15,
    );
    // handle
    g.fillStyle(0x23272d).fillRoundedRect(
      cx - R * 1.5,
      cy - R * 0.16,
      R * 0.62,
      R * 0.32,
      R * 0.15,
    );
    this.scene._pencilRoundRect(
      g,
      rnd,
      cx - R * 1.5,
      cy - R * 0.16,
      R * 0.62,
      R * 0.32,
      R * 0.15,
      1.3,
      MP_SKETCH,
      0.55,
      0.5,
    );
    // cup
    g.fillStyle(0x23272d).fillCircle(cx, cy, R);
    this.scene._pencilCircle(g, rnd, cx, cy, R, 1.6, MP_SKETCH, 0.65);
    // coffee
    g.fillStyle(0x1f130b).fillCircle(cx, cy, R * 0.84);
    g.fillStyle(0x3b2616, 0.55).fillCircle(
      cx + R * 0.05,
      cy + R * 0.05,
      R * 0.6,
    );
    this.scene._pencilCircle(g, rnd, cx, cy, R * 0.86, 1, MP_SKETCH, 0.35);
    g.fillStyle(0xffe0b0, 0.14).fillEllipse(
      cx - R * 0.32,
      cy - R * 0.42,
      R * 0.5,
      R * 0.14,
    );
    // an old coffee ring on the desk
    this.scene._pencilArc(
      g,
      rnd,
      cx + R * 1.3,
      cy + R * 1.05,
      R * 0.78,
      0.4,
      5.3,
      1.2,
      0x8a6038,
      0.22,
    );
  }

  // a pencil lying on the desk
  _drawPencil(g, rnd, cx, cy, L, ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const T = (lx, ly) => ({
      x: cx + lx * c - ly * s,
      y: cy + lx * s + ly * c,
    });
    const w = L * 0.055;
    const x0 = -L / 2;
    const xE = x0 + L * 0.07; // eraser | ferrule
    const xF = xE + L * 0.06; // ferrule | body
    const xB = L / 2 - L * 0.16; // body | sharpened wood
    const xW = L / 2 - L * 0.035; // wood | graphite
    const poly = (pts, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillPoints(
        pts.map(([a, b]) => T(a, b)),
        true,
      );
    };
    const seg = (a, b, alpha = 0.6, width = 1.2) => {
      const p = T(...a);
      const q = T(...b);
      this.scene._pencilSeg(g, rnd, p.x, p.y, q.x, q.y, width, MP_SKETCH, alpha, 0.5);
    };

    // shadow
    g.fillStyle(0x000000, 0.3);
    g.fillPoints(
      [
        [x0, -w / 2],
        [xB, -w / 2],
        [L / 2, 0],
        [xB, w / 2],
        [x0, w / 2],
      ].map(([a, b]) => {
        const p = T(a, b);
        return { x: p.x + 6, y: p.y + 8 };
      }),
      true,
    );
    poly(
      [
        [x0, -w / 2],
        [xE, -w / 2],
        [xE, w / 2],
        [x0, w / 2],
      ],
      0x6e4546,
    );
    poly(
      [
        [xE, -w / 2],
        [xF, -w / 2],
        [xF, w / 2],
        [xE, w / 2],
      ],
      0x5d6166,
    );
    poly(
      [
        [xF, -w / 2],
        [xB, -w / 2],
        [xB, w / 2],
        [xF, w / 2],
      ],
      0x5a4b22,
    );
    poly(
      [
        [xB, -w / 2],
        [xW, -w * 0.16],
        [xW, w * 0.16],
        [xB, w / 2],
      ],
      0x8a7456,
    );
    poly(
      [
        [xW, -w * 0.16],
        [L / 2, 0],
        [xW, w * 0.16],
      ],
      0x2b2b2b,
    );
    // outline and facets
    seg([x0, -w / 2], [xB, -w / 2]);
    seg([x0, w / 2], [xB, w / 2]);
    seg([x0, -w / 2], [x0, w / 2]);
    seg([xB, -w / 2], [L / 2, 0]);
    seg([xB, w / 2], [L / 2, 0]);
    seg([xE, -w / 2], [xE, w / 2], 0.5, 1);
    seg([xF, -w / 2], [xF, w / 2], 0.5, 1);
    seg([xE + (xF - xE) * 0.5, -w / 2], [xE + (xF - xE) * 0.5, w / 2], 0.3, 1);
    seg([xF, -w * 0.17], [xB, -w * 0.17], 0.22, 1);
    seg([xF, w * 0.17], [xB, w * 0.17], 0.22, 1);
    seg([xB, -w / 2], [xB, w / 2], 0.35, 1);
  }

  // a sticky note with a scribbled warning
  _drawNote(add, cx, cy, S) {
    const rnd = this.scene._rng(777);
    const c = add(this.scene.add.container(cx, cy).setDepth(-8).setAngle(6));
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRect(-S / 2 + 6, -S / 2 + 8, S, S);
    g.fillStyle(0x2c2921).fillRect(-S / 2, -S / 2, S, S);
    g.fillStyle(MP_SKETCH, 0.05).fillRect(-S / 2, -S / 2, S, S);
    g.fillStyle(0x000000, 0.14).fillRect(-S / 2, -S / 2, S, S * 0.13);
    this.scene._pencilRect(g, rnd, -S / 2, -S / 2, S, S, 1.3, MP_SKETCH, 0.55, 1.2);
    c.add(g);

    const fs = Math.round(S * 0.1);
    const tx = -S * 0.38;
    const ty = -S * 0.3;
    const note = this.scene.add
      .text(tx, ty, "don't answer\nif you don't\nknow who's\ncalling.", {
        fontFamily: MP_FONT,
        fontSize: fs + "px",
        color: "#d9cfb4",
        lineSpacing: Math.round(S * 0.035),
      })
      .setAlpha(0.85);
    c.add(note);
    // "don't" underlined twice, in a hurry
    const ul = this.scene.add.graphics();
    this.scene._pencilSeg(
      ul,
      rnd,
      tx,
      ty + fs * 1.15,
      tx + fs * 3,
      ty + fs * 1.2,
      1,
      MP_SKETCH,
      0.55,
      0.8,
    );
    this.scene._pencilSeg(
      ul,
      rnd,
      tx + 2,
      ty + fs * 1.32,
      tx + fs * 2.8,
      ty + fs * 1.34,
      1,
      MP_SKETCH,
      0.4,
      0.8,
    );
    c.add(ul);
  }

  destroy() {
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.mug = this.rippleGfx = this.screenGlow = this.buzzGfx = null;
  }
}
