import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { makeCanvas, addCanvasTexture, releaseTextures, lcg } from "../../shared/paint.js";
import { RIPPLE_STONES, RIPPLE_TARGETS, RIPPLE_ROUND_MS, RIPPLE_CYCLE_MS, rippleLayout, rippleFrame, convergence } from "./puzzle.js";
import { RIPPLE_ART, STONE_FONT, paintStreet, neonReflection } from "./street.js";

export default class RipplesScene extends BasePuzzleScene {
  constructor() { super({ key: "Ripples" }); }

  create() {
    this.beginScene();
    this._elapsed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
  }

  _build(W, H) {
    const L = (this._L = rippleLayout(W, H));
    const art = paintStreet(this.textures, L);
    this.add.image(0, 0, RIPPLE_ART.street).setOrigin(0).setScale(1 / art.res).setDepth(-10);
    this._waterCanvas = makeCanvas(Math.ceil(W / 2), Math.ceil(H / 2));
    this._water = addCanvasTexture(this.textures, RIPPLE_ART.water, this._waterCanvas);
    this._reflection = neonReflection(this._waterCanvas.width, this._waterCanvas.height);
    this.add.image(0, 0, RIPPLE_ART.water).setOrigin(0).setDisplaySize(W, H).setDepth(-9);
    this._rings = this.add.graphics().setDepth(-5);
    this._rain = this.add.graphics().setDepth(4);
    const random = lcg(2607);
    this._rainLines = Array.from({ length: 80 }, () => ({ x: random(), y: random(), speed: 0.3 + random() * 0.65, length: 5 + random() * 14 }));
    this._letters = RIPPLE_STONES.map(stone => ({
      stone,
      meetings: RIPPLE_TARGETS.map((_, round) => convergence(stone, round)),
      text: this.add.text(L.x + stone.x * L.size, L.y + stone.y * L.size, stone.letter, {
        fontFamily: STONE_FONT, fontSize: Math.max(10, L.size * 0.032) + "px", color: "#fff0e7",
        shadow: { offsetX: 0, offsetY: 0, color: "#ed565e", blur: 10, fill: true },
      }).setOrigin(0.5).setAlpha(0).setDepth(-3),
    }));
    this.levelText = drawLevelLabel(this, W, H, { color: "#acb6c2" });
    this._waterAt = -Infinity;
    this._render();
  }

  update(_time, delta) {
    if (!this._L) return;
    // The three clue-bearing drops continue with decorative motion disabled.
    this._elapsed += Math.min(delta || 16, 100);
    this._render();
  }

  _render() {
    const L = this._L, S = L.size;
    const { waves, localTime } = rippleFrame(this._elapsed);
    const g = this._rings;
    g.clear();
    const roundFade = Math.min(1, (RIPPLE_ROUND_MS - localTime) / 650);
    for (const wave of waves) {
      const x = L.x + wave.x * S, y = L.y + wave.y * S;
      // A tiny persistent dimple locates each of the three fixed sources.
      g.lineStyle(1, 0xadb5c8, 0.30); g.strokeCircle(x, y, Math.max(2, S * 0.004));
      if (wave.age > -350 && wave.age < 0) {
        const fall = 1 + wave.age / 350;
        const dy = (1 - fall * fall) * S * 0.19;
        g.lineStyle(1.5, 0xe2e9f5, 0.6 * fall);
        g.lineBetween(x - 2, y - dy - S * 0.025, x, y - dy);
      }
      if (!wave.active) continue;
      const radius = wave.radius * S;
      const opacity = Math.min(1, wave.age / 100) * roundFade * Math.max(0.15, 1 - wave.radius * 0.45);
      // Broad refracted red light, a dark trough, then the precise crest.
      g.lineStyle(Math.max(3, S * 0.009), 0xbf273e, opacity * 0.11); g.strokeCircle(x, y, radius);
      g.lineStyle(Math.max(2, S * 0.004), 0x020810, opacity * 0.55); g.strokeCircle(x, y, radius + 2);
      g.lineStyle(Math.max(0.8, S * 0.0015), 0xb6c9db, opacity * 0.65); g.strokeCircle(x, y, radius);
      g.lineStyle(0.75, 0xe46c79, opacity * 0.32); g.strokeCircle(x, y, Math.max(0, radius - S * 0.006));
      if (wave.age < 400) {
        const a = 1 - wave.age / 400;
        g.fillStyle(0xf2dbd7, a * 0.7); g.fillCircle(x, y, Math.max(1, S * 0.004 * a));
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3;
          g.fillCircle(x + Math.cos(angle) * wave.age * S * 0.000035,
            y + Math.sin(angle) * wave.age * S * 0.000035, 0.8 * a);
        }
      }
    }
    // Leave a wet gleam long enough to read. It is computed from agreement
    // of all three distances, including between animation frames.
    const cycle = this._elapsed % RIPPLE_CYCLE_MS;
    for (const entry of this._letters) {
      let light = 0;
      entry.meetings.forEach((meet, round) => {
        if (meet.strength < 0.55) return;
        const age = cycle - round * RIPPLE_ROUND_MS - meet.at;
        if (age < -65 || age > 2150) return;
        const fade = age < 0 ? 1 + age / 65 : Math.min(1, (2150 - age) / 900);
        light = Math.max(light, fade * meet.strength);
      });
      entry.text.setAlpha(light * 0.92);
      if (light > 0) {
        const x = L.x + entry.stone.x * S, y = L.y + entry.stone.y * S;
        g.lineStyle(S * 0.028, 0xea6a77, light * 0.045); g.strokeCircle(x, y, S * 0.019);
      }
    }
    if (this._elapsed - this._waterAt > 33) {
      this._drawWater(waves);
      this._waterAt = this._elapsed;
    }
    this._rain.clear();
    if (this.ambientMotion) {
      for (const line of this._rainLines) {
        const y = ((line.y + this._elapsed * 0.00035 * line.speed) % 1) * L.height;
        const x = line.x * L.width;
        this._rain.lineStyle(0.7, x > L.width * 0.7 ? 0xd97985 : 0x8da5bc, 0.11);
        this._rain.lineBetween(x, y, x + line.length * 0.23, y + line.length);
      }
    }
  }

  _drawWater(waves) {
    const canvas = this._waterCanvas, ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const time = this.ambientMotion ? this._elapsed : 0;
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) {
      let shift = Math.sin(y * 0.23 + time * 0.0018) * 2 + Math.sin(y * 0.061 - time * 0.0009) * 3;
      const point = { x: (W * 1.68 - this._L.x) / this._L.size, y: (y * 2 - this._L.y) / this._L.size };
      for (const wave of waves) {
        if (!wave.active) continue;
        const d = Math.hypot(point.x - wave.x, point.y - wave.y) - wave.radius;
        shift += Math.sin(d * 110) * Math.exp(-d * d * 90) * 5;
      }
      ctx.globalAlpha = 0.52 + 0.22 * Math.sin(y * 1.71 + time * 0.0006) ** 2;
      ctx.drawImage(this._reflection, 0, y, W, Math.min(2, H - y), shift, y, W, Math.min(2, H - y));
    }
    this._water.refresh();
  }

  _teardown() {
    this.tweens.killAll();
    for (const object of this.children.list.slice()) object.destroy();
    releaseTextures(this.textures, RIPPLE_ART);
    this._L = null; this._letters = []; this._water = null;
    this._waterCanvas = null; this._reflection = null;
  }

  shutdown() { this._teardown(); }
}
