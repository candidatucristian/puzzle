import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { layoutPark, paintPark, releaseParkArt } from "./park.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "FIREWORKS"  ·  code: NIGHT  ·  hexadecimal colours → ASCII
//
// Midnight over Paris, in a little park: a full moon, the Tower far off, a
// pond with the moon in it, an old lantern. On the gravel path stands a green
// bench, a card tied to its back — FRESH PAINT — and tied to the top of its
// back, left behind after some party, five balloons. Each is matt, one flat
// colour and nothing else, and that colour is exact. From the highest down:
//
//   #4E2233 · #492244 · #472255 · #482266 · #542277
//
// A colour picker reads them off the screen. In #RRGGBB the red is the first
// two digits — 4E 49 47 48 54 — and as ASCII letters those spell N I G H T.
//
// The whole park is painted (park.js). Live over it: the balloons swaying on
// their strings in the night air, fireflies over the lawn, the Tower's faint
// sparkle, the moon breaking on the pond, the lantern's flame. Nothing is
// drawn over the balloons, so their colours stay true.
//
// (The scene keeps its old key and file name: saves and the level order know
// it as "Fireworks".)
// ─────────────────────────────────────────────────────────────────────────────

const FW_CODES = ["#4E2233", "#492244", "#472255", "#482266", "#542277"];

export default class FireworksScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Fireworks" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  static codes() {
    return FW_CODES.slice();
  }

  create() {
    this.beginScene();
    this._t = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const L = (this._L = layoutPark(W, H, FW_CODES));
    const art = (this._art = paintPark(this, L));
    const k = art.keys;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the lantern's flame, never quite still
    this._lampGlow = this.add
      .image(L.lamp.x, L.lamp.y, k.glow)
      .setDisplaySize(L.S * 0.34, L.S * 0.34)
      .setTint(0xffc078)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.4)
      .setDepth(-9);

    // the Tower's sparkle, the moon breaking on the pond
    this._glints = [];
    for (let i = 0; i < 20; i++) {
      this._glints.push({
        img: this.add.image(0, 0, k.glint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(-9),
        life: 0,
        pond: i >= 14,
      });
    }

    // fireflies over the lawn
    this._flies = [];
    for (let i = 0; i < 16; i++) {
      const f = {
        img: this.add
          .image(0, 0, k.glow)
          .setTint(0xd8ff90)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setDepth(-5),
        x: Math.random() * W,
        y: L.horizon + (H - L.horizon) * (0.12 + Math.random() * 0.7),
        ph: Math.random() * 10,
        sp: 0.4 + Math.random() * 0.6,
        size: (5 + Math.random() * 5) * L.u,
      };
      f.img.setDisplaySize(f.size, f.size);
      this._flies.push(f);
    }

    // the balloons and their strings
    this._strings = this.add.graphics().setDepth(-8);
    this._balloons = art.balloons.map((b) => {
      const img = this.add
        .image(b.x, b.y, b.key)
        .setOrigin(0.5, 0.413)
        .setScale(0.5)
        .setDepth(-7 + b.i * 0.01);
      return { ...b, img, ph: b.i * 1.7 + 0.4 };
    });

    this.levelText = drawLevelLabel(this, W, H);
    this._pose();
  }

  // ── the night air ──────────────────────────────────────────────────────────

  update(_time, delta) {
    if (!this._L) return;
    const dt = Math.min(delta || 16, 100);
    const moving = this.ambientMotion && !this.reducedMotion;
    if (moving) this._t += dt;
    this._pose();
    if (!moving) return;
    this._sparkle(dt);
    this._fly();
    this._lampGlow.setAlpha(0.36 + Math.random() * 0.08);
  }

  // where every balloon is now, and its string from the bench's back
  _pose() {
    const L = this._L;
    const t = this._t / 1000;
    const g = this._strings;
    g.clear();
    // one slow breath of wind for all of them, and each its own small bobbing
    const wind = Math.sin(t * 0.37) * 0.6 + Math.sin(t * 0.83 + 1.1) * 0.4;
    for (const o of this._balloons) {
      const r = o.r;
      const height = (L.knot.y - o.y) / L.H; // the higher, the further it leans
      const x = o.x + (wind * 0.42 * height * 2.6 + Math.sin(t * 0.9 + o.ph) * 0.07) * r * 2;
      const y = o.y + Math.sin(t * 0.7 + o.ph * 1.3) * r * 0.06;
      const lean = (x - o.x) / (r * 9) + Math.sin(t * 0.6 + o.ph) * 0.03;
      o.img.setPosition(x, y).setRotation(lean);
      // the knot under it, where the string is tied
      const kx = x - Math.sin(lean) * r * 1.52;
      const ky = y + Math.cos(lean) * r * 1.52;
      // the string: slack near the bench, straight under the balloon
      const cx = L.knot.x + (kx - L.knot.x) * 0.25 + wind * r * 0.3;
      const cy = L.knot.y + (ky - L.knot.y) * 0.62;
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(L.knot.x, L.knot.y),
        new Phaser.Math.Vector2(cx, cy),
        new Phaser.Math.Vector2(kx, ky),
      );
      g.lineStyle(Math.max(1, 1.1 * L.u), 0xdfe4f2, 0.62);
      curve.draw(g, 24);
    }
    // the knot on the bench's back
    g.fillStyle(0xdfe4f2, 0.8).fillCircle(L.knot.x, L.knot.y, Math.max(1.6, 2.2 * L.u));
    g.lineStyle(Math.max(1, 1.1 * L.u), 0xdfe4f2, 0.6);
    g.lineBetween(L.knot.x, L.knot.y, L.knot.x - 5 * L.u, L.knot.y + 9 * L.u);
    g.lineBetween(L.knot.x, L.knot.y, L.knot.x + 4 * L.u, L.knot.y + 10 * L.u);
  }

  // the Tower sparkling as it does on the hour; the moon in pieces on the pond
  _sparkle(dt) {
    const L = this._L;
    const pts = this._art.towerPts;
    for (const gl of this._glints) {
      if (gl.life <= 0) {
        if (Math.random() < (gl.pond ? 0.03 : 0.012)) {
          let p;
          let size;
          if (gl.pond) {
            const sx = Math.min(L.pond.x + L.pond.rx * 0.7, Math.max(L.pond.x - L.pond.rx * 0.7, L.moon.x));
            p = { x: sx + (Math.random() - 0.5) * L.pond.rx * 0.34, y: L.pond.y + (Math.random() - 0.5) * L.pond.ry * 1.5 };
            size = L.S * (0.008 + Math.random() * 0.012);
          } else {
            p = pts[Math.floor(Math.random() * pts.length)];
            size = L.S * (0.005 + Math.random() * 0.006);
          }
          gl.img.setPosition(p.x, p.y).setDisplaySize(size, gl.pond ? size * 0.5 : size);
          gl.life = gl.max = 220 + Math.random() * (gl.pond ? 700 : 260);
        } else {
          gl.img.setAlpha(0);
          continue;
        }
      }
      gl.life -= dt;
      gl.img.setAlpha(Math.max(0, Math.sin((gl.life / gl.max) * Math.PI)) * (gl.pond ? 0.7 : 0.3));
    }
  }

  // fireflies: wandering, each lighting and going out in its own time
  _fly() {
    const L = this._L;
    const t = this._t / 1000;
    for (const f of this._flies) {
      const x = f.x + Math.sin(t * 0.21 * f.sp + f.ph) * 70 * L.u + Math.sin(t * 0.9 + f.ph * 2) * 8 * L.u;
      const y = f.y + Math.cos(t * 0.17 * f.sp + f.ph * 1.7) * 26 * L.u + Math.sin(t * 1.3 + f.ph) * 5 * L.u;
      const blink = Math.max(0, Math.sin(t * 0.8 * f.sp + f.ph * 3));
      f.img.setPosition(x, y).setAlpha(blink ** 3 * 0.85);
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseParkArt(this.textures);
    this._balloons = [];
    this._glints = [];
    this._flies = [];
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseParkArt(this.textures);
    this._L = null;
  }
}
