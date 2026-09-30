import Phaser from "phaser";

/** The candle's life. Its wax is baked into the study's two layers; here are
 * the flame, the light round it, the ember and the smoke — and a transparent
 * button over the candle, so it can be blown out from the keyboard too.
 *
 * The flame is painted once, as a strip of frames of a real candle flame:
 * a faint orange mantle, a yellow body, a white-hot heart, the dark zone
 * round the wick and the blue at its root. It quivers through them, leans
 * with the breath, shrinks as it weakens, and a soft bloom breathes round it. */

const FLAME = "cx_flame";
const HALO = "cx_flame_halo";
const CORE = "cx_flame_core";
const EMBER = "cx_ember";
const FRAMES = 16;
const COLS = 8;
const FW = 72; // one frame
const FH = 160;
const BASE = 146; // where the wick is, in a frame
const TEX_W = 34; // the flame's width, in a frame, at rest
const TEX_H = 124; // ...and its height

export default class Candle {
  constructor(scene, { isBlocked, onExtinguished }) {
    this.scene = scene;
    this.isBlocked = isBlocked;
    this.onExtinguished = onExtinguished;
    this.clicks = 0;
    this.lightState = { level: 1, bend: 0 };
    this._timers = new Set();
  }

  build(art) {
    this.removeDom();
    this.art = art;
    this.reducedMotion =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.smokeSince = null;
    this._frame = Math.random() * FRAMES;
    this._lastT = null;
    makeTextures(this.scene.textures);
    const { wick, scale: k, height, radius } = art;
    const add = this.scene.add;
    const ADD = Phaser.BlendModes.ADD;
    this.halo = add.image(wick.x, wick.y, HALO).setBlendMode(ADD).setDepth(7.9);
    this.flame = add
      .image(wick.x, wick.y, FLAME, 0)
      .setOrigin(0.5, BASE / FH)
      .setDepth(8);
    this.core = add
      .image(wick.x, wick.y, CORE)
      .setBlendMode(ADD)
      .setDepth(8.05);
    this.ember = add
      .image(wick.x, wick.y, EMBER)
      .setBlendMode(ADD)
      .setDepth(8.1)
      .setAlpha(0);
    this.smoke = add.graphics().setDepth(9);

    const el = document.createElement("div");
    el.className = "scene-dom-overlay cryptex-candle";
    el.style.left = `${wick.x - (radius + 1.1) * k}px`;
    el.style.top = `${wick.y - 3 * k}px`;
    el.style.width = `${(radius + 1.1) * k * 2}px`;
    el.style.height = `${(height + 4) * k}px`;
    el.innerHTML =
      '<button type="button" class="candle-action" aria-label="Put out the candle"></button>';
    el.querySelector("button").addEventListener("click", (event) => {
      event.stopPropagation();
      this.blow(event);
    });
    const box = document.getElementById("game-container");
    if (box) box.appendChild(el);
    this.dom = el;
    this.refresh(true);
    this.update(this.scene.time.now);
  }

  refresh(instant = false) {
    const strength = (3 - this.clicks) / 3;
    const button = this.dom?.querySelector("button");
    if (button) button.disabled = strength === 0;
    this.scene.tweens.killTweensOf(this.lightState);
    if (instant) Object.assign(this.lightState, { level: strength, bend: 0 });
    else
      this.scene.tweens.add({
        targets: this.lightState,
        level: strength,
        duration: 650,
        ease: "Sine.easeInOut",
      });
  }

  // One click is one breath: the flame bows away from it, nearly goes, and
  // comes back smaller; the third takes it
  blow(event) {
    const button = this.dom?.querySelector("button");
    if (this.isBlocked() || this.clicks >= 3 || button?.disabled) return;
    this.clicks++;
    this.scene.services.audio.playClick(this.scene);
    if (button) button.disabled = true;
    const target = (3 - this.clicks) / 3;
    const fx = this.lightState;
    const rect = this.dom.getBoundingClientRect();
    const dir =
      event?.clientX && event.clientX < rect.left + rect.width / 2 ? 1 : -1;
    this.scene.tweens.killTweensOf(fx);
    const from = fx.level;
    const steps = this.reducedMotion
      ? [[target, 0, 600]]
      : target
        ? [
            [from * 0.3, dir * 0.85, 130],
            [from * 0.45, dir * 0.6, 120],
            [target * 0.75, -dir * 0.1, 200],
            [target, 0, 300],
          ]
        : [
            [from * 0.35, dir * 0.9, 120],
            [from * 0.15, dir * 1.1, 140],
            [0, dir * 0.6, 160],
          ];
    const next = (i) => {
      if (i >= steps.length) return;
      const [level, bend, duration] = steps[i];
      this.scene.tweens.add({
        targets: fx,
        level,
        bend,
        duration,
        ease: "Sine.easeInOut",
        onComplete: () => next(i + 1),
      });
    };
    next(0);
    if (!target) {
      this._later(() => {
        this.smokeSince = this.scene.time.now;
      }, 330);
      this._later(() => this.onExtinguished(), 900);
    } else
      this._later(() => {
        if (button?.isConnected) button.disabled = false;
      }, 820);
  }

  update(time) {
    if (!this.flame || !this.art) return;
    const fx = this.lightState;
    const t = this.reducedMotion ? 0 : time / 1000;
    const dt =
      this._lastT === null
        ? 0
        : Math.min(0.1, Math.max(0, (time - this._lastT) / 1000));
    this._lastT = time;
    const flicker =
      1 + 0.016 * Math.sin(t * 7.1) + 0.009 * Math.sin(t * 19.3 + 1);
    const level = Phaser.Math.Clamp(fx.level * flicker, 0, 1);
    this.wallLight?.setAlpha(level);
    const { wick, scale: k } = this.art;
    const on = level > 0.005;
    this.flame.setVisible(on);
    this.core.setVisible(on);
    this.halo.setVisible(on);
    if (on) {
      // it quivers at a flame's own uneven pace
      if (!this.reducedMotion)
        this._frame +=
          dt * (17 + 7 * Math.sin(t * 1.7) + 4 * Math.sin(t * 4.3));
      const h = k * (1.05 + 1.95 * level) * flicker; // about 3 cm tall, burning well
      const w = k * (0.6 + 0.32 * level);
      const lean =
        fx.bend * 0.85 +
        (this.reducedMotion
          ? 0
          : 0.03 * Math.sin(t * 3.7) + 0.02 * Math.sin(t * 1.3));
      this.flame
        .setFrame(Math.floor(this._frame) % FRAMES)
        .setScale(w / TEX_W, h / TEX_H)
        .setRotation(lean)
        .setAlpha(Math.min(1, level * 5));
      const up = (f) => ({
        x: wick.x + Math.sin(lean) * h * f,
        y: wick.y - Math.cos(lean) * h * f,
      });
      const c = up(0.34);
      this.core
        .setPosition(c.x, c.y)
        .setDisplaySize(k * 1.5, k * 2.3 * (0.6 + 0.4 * level))
        .setRotation(lean)
        .setAlpha(0.75 * level);
      const g = up(0.5);
      this.halo
        .setPosition(g.x, g.y)
        .setDisplaySize(k * (9 + 7 * level), k * (11 + 8 * level))
        .setAlpha(0.55 * level * flicker * flicker);
    }
    this._drawSmoke();
  }

  // After the last breath: the wick's tip glows, flickers and cools; a
  // thread of smoke rises off it, curling and thinning out
  _drawSmoke() {
    const g = this.smoke;
    g.clear();
    if (this.smokeSince === null) {
      this.ember.setAlpha(0);
      return;
    }
    const age = (this.scene.time.now - this.smokeSince) / 1000;
    if (age > 5) {
      this.smokeSince = null;
      this.ember.setAlpha(0);
      return;
    }
    const { wick, scale: k } = this.art;
    const cool = Math.max(0, 1 - age / 3.4);
    this.ember
      .setPosition(wick.x, wick.y)
      .setDisplaySize(k * 1.5, k * 1.5)
      .setAlpha(
        cool * cool * (0.8 + 0.2 * Math.sin(age * 23) * Math.sin(age * 7)),
      );
    if (this.reducedMotion) return;
    const fade = Math.max(0, 1 - age / 5);
    const top = Math.min(15, age * 9); // how far it has risen, in cm
    const N = 56;
    let px = wick.x,
      py = wick.y;
    for (let j = 1; j <= N; j++) {
      const u = j / N;
      const rise = u * top;
      const curl =
        Math.sin(rise * 0.55 - age * 1.8) * rise * 0.16 +
        Math.sin(rise * 1.3 - age * 0.9 + 1) * rise * 0.07;
      const x = wick.x + curl * k;
      const y = wick.y - rise * k;
      const a = fade * (1 - u) * (1 - 0.45 * u);
      g.lineStyle(k * (0.3 + u * 1.1), 0xb4b0a8, a * 0.07).lineBetween(
        px,
        py,
        x,
        y,
      );
      g.lineStyle(k * (0.07 + u * 0.22), 0xdcd8d0, a * 0.3).lineBetween(
        px,
        py,
        x,
        y,
      );
      px = x;
      py = y;
    }
  }

  _later(callback, delay) {
    const timer = this.scene.time.delayedCall(delay, () => {
      this._timers.delete(timer);
      callback();
    });
    this._timers.add(timer);
    return timer;
  }

  removeDom() {
    for (const timer of this._timers) timer.remove(false);
    this._timers.clear();
    this.dom?.remove();
    this.dom = null;
    for (const obj of [
      this.flame,
      this.core,
      this.halo,
      this.ember,
      this.smoke,
    ])
      obj?.destroy();
    this.flame = this.core = this.halo = this.ember = this.smoke = null;
  }

  destroy() {
    this.removeDom();
    this.scene.tweens.killTweensOf(this.lightState);
    this.wallLight = null;
  }
}

// ── the painted flame ───────────────────────────────────────────────────────

function makeTextures(textures) {
  if (!textures.exists(FLAME)) {
    const t = textures.addCanvas(FLAME, paintFlames());
    for (let f = 0; f < FRAMES; f++)
      t.add(f, 0, (f % COLS) * FW, Math.floor(f / COLS) * FH, FW, FH);
  }
  if (!textures.exists(HALO))
    textures.addCanvas(
      HALO,
      radial(128, [
        [0, "rgba(255,200,120,0.6)"],
        [0.22, "rgba(255,176,90,0.28)"],
        [0.55, "rgba(255,140,60,0.08)"],
        [1, "rgba(255,120,40,0)"],
      ]),
    );
  if (!textures.exists(CORE))
    textures.addCanvas(
      CORE,
      radial(64, [
        [0, "rgba(255,252,236,0.95)"],
        [0.4, "rgba(255,238,190,0.5)"],
        [1, "rgba(255,220,150,0)"],
      ]),
    );
  if (!textures.exists(EMBER))
    textures.addCanvas(
      EMBER,
      radial(32, [
        [0, "rgba(255,190,110,1)"],
        [0.2, "rgba(255,110,40,0.9)"],
        [0.55, "rgba(230,60,15,0.3)"],
        [1, "rgba(200,40,10,0)"],
      ]),
    );
}

// FRAMES frames of a candle flame, the wick at (FW / 2, BASE) in each
function paintFlames() {
  const rows = Math.ceil(FRAMES / COLS);
  const c = document.createElement("canvas");
  c.width = FW * COLS;
  c.height = FH * rows;
  const g = c.getContext("2d");
  // how wide the flame is along its height: round at the root, fullest a
  // third of the way up, drawn out to a point
  const width = (u) =>
    Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(u, 0.7))), 0.85) *
    (1 - 0.3 * u);
  for (let f = 0; f < FRAMES; f++) {
    const ph = (f / FRAMES) * Math.PI * 2;
    const cx = (f % COLS) * FW;
    const cy = Math.floor(f / COLS) * FH;
    const ox = cx + FW / 2;
    const oy = cy + BASE;
    const len =
      TEX_H * (1 + 0.05 * Math.sin(ph) + 0.03 * Math.sin(ph * 2 + 1.3));
    const half = (TEX_W / 2) * (1 + 0.05 * Math.sin(ph * 3 + 0.7));
    const sway = 0.05 * Math.sin(ph + 0.4) + 0.025 * Math.sin(ph * 2 - 0.8);
    const outline = (sw, sh, lift = 0) => {
      g.beginPath();
      for (const side of [-1, 1]) {
        for (let j = 0; j <= 30; j++) {
          const u = (side < 0 ? j : 30 - j) / 30;
          const x =
            ox +
            sway * len * u * u +
            Math.sin(u * 5 - ph * 2) * u * u * half * 0.22 +
            side * half * sw * width(u);
          const y = oy - lift - len * sh * u;
          if (side < 0 && j === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
      }
      g.closePath();
    };
    g.save();
    g.beginPath();
    g.rect(cx, cy, FW, FH);
    g.clip();
    // the faint outer mantle
    g.save();
    g.shadowColor = "rgba(255,120,30,0.8)";
    g.shadowBlur = 9;
    outline(1.35, 1.06);
    g.fillStyle = "rgba(255,128,40,0.32)";
    g.fill();
    g.restore();
    // the body: gold, going orange and thin toward the tip
    const body = g.createLinearGradient(0, oy, 0, oy - len);
    body.addColorStop(0, "rgba(255,176,76,0.95)");
    body.addColorStop(0.14, "rgba(255,206,104,1)");
    body.addColorStop(0.52, "rgba(255,196,88,0.98)");
    body.addColorStop(0.82, "rgba(255,146,48,0.8)");
    body.addColorStop(1, "rgba(255,110,30,0)");
    g.save();
    g.shadowColor = "rgba(255,170,70,0.9)";
    g.shadowBlur = 5;
    outline(1, 1);
    g.fillStyle = body;
    g.fill();
    g.restore();
    // the white-hot heart
    const heart = g.createLinearGradient(
      0,
      oy - len * 0.05,
      0,
      oy - len * 0.78,
    );
    heart.addColorStop(0, "rgba(255,255,240,0)");
    heart.addColorStop(0.16, "rgba(255,253,238,0.96)");
    heart.addColorStop(0.6, "rgba(255,245,205,0.9)");
    heart.addColorStop(1, "rgba(255,230,160,0)");
    g.save();
    g.shadowColor = "rgba(255,250,220,0.9)";
    g.shadowBlur = 4;
    outline(0.58, 0.78, len * 0.04);
    g.fillStyle = heart;
    g.fill();
    g.restore();
    // the dark, cooler zone round the wick
    g.save();
    g.translate(ox, oy - len * 0.08);
    g.scale(half * 0.34, len * 0.1);
    const dark = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    dark.addColorStop(0, "rgba(96,62,110,0.45)");
    dark.addColorStop(1, "rgba(96,62,110,0)");
    g.fillStyle = dark;
    g.fillRect(-1, -1, 2, 2);
    g.restore();
    // and the blue at its root
    g.save();
    g.shadowColor = "rgba(80,140,255,0.9)";
    g.shadowBlur = 3;
    g.strokeStyle = "rgba(120,160,255,0.65)";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(
      ox,
      oy - len * 0.06,
      half * 0.56,
      len * 0.07,
      0,
      Math.PI * 0.12,
      Math.PI * 0.88,
    );
    g.stroke();
    g.restore();
    g.restore();
  }
  return c;
}

function radial(size, stops) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [o, col] of stops) r.addColorStop(o, col);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}
