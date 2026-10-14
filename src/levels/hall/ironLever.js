import { makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The small cast-iron mounting, fixed to the wall. The handle is separate
 *  so it can travel on its pivot without replacing the surrounding art. */
export function paintLeverMount(ctx, s) {
  const { w, h } = s.plate;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.transform(s.slant, -0.16, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.beginPath(); ctx.roundRect(-w / 2 - 2, -h / 2 + 2.5, w + 2, h, w * 0.16); ctx.fill();
  const iron = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  iron.addColorStop(0, "#656b6b");
  iron.addColorStop(0.16, "#383f40");
  iron.addColorStop(0.7, "#222729");
  iron.addColorStop(1, "#121719");
  ctx.fillStyle = iron;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.16); ctx.fill();
  ctx.strokeStyle = "#111517"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = "rgba(173,181,174,0.36)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-w * 0.42, h * 0.35); ctx.lineTo(-w * 0.42, -h * 0.39);
  ctx.quadraticCurveTo(-w * 0.42, -h * 0.46, -w * 0.28, -h * 0.46); ctx.lineTo(w * 0.28, -h * 0.46); ctx.stroke();
  // A narrow worn guide, its lower contact blackened by the arc.
  ctx.fillStyle = "#090d0f";
  ctx.beginPath(); ctx.roundRect(-w * 0.16, -h * 0.31, w * 0.32, h * 0.65, w * 0.12); ctx.fill();
  ctx.strokeStyle = "#59605e"; ctx.lineWidth = 0.65;
  ctx.beginPath(); ctx.moveTo(w * 0.17, -h * 0.27); ctx.lineTo(w * 0.17, h * 0.31); ctx.stroke();
  ctx.fillStyle = "#72533a"; ctx.fillRect(-w * 0.22, h * 0.27, w * 0.44, h * 0.06);
  ctx.fillStyle = "#100e0c"; ctx.fillRect(-w * 0.18, h * 0.3, w * 0.36, h * 0.035);
  // Slotted fasteners, with rust in the recesses and rubbed silver edges.
  for (const sign of [-1, 1]) {
    const y = sign * h * 0.4, radius = w * 0.105;
    ctx.fillStyle = "#151615";
    ctx.beginPath(); ctx.arc(0.5, y + 0.5, radius + 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#737772";
    ctx.beginPath(); ctx.arc(0, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#202724"; ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.moveTo(-radius * 0.65, y - radius * 0.3 * sign); ctx.lineTo(radius * 0.65, y + radius * 0.3 * sign); ctx.stroke();
  }
  const rnd = lcg(581);
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = i % 3 ? "rgba(152,127,91,0.14)" : "rgba(174,186,183,0.12)";
    ctx.fillRect((rnd() - 0.5) * w * 0.8, (rnd() - 0.5) * h * 0.85, 0.5 + rnd() * 1.1, 0.45);
  }
  ctx.restore();
}

/** An iron toggle pulled down against its spring, held through the signal,
 *  then released by the short. One small texture and one spark graphic are
 *  reused across pulls, and both are owned by the hall's lifetime. */
export class IronLever {
  constructor(scene, s, glow) {
    this.scene = scene;
    this.s = s;
    this.amount = 0;
    this.phase = "rest";
    this.sparks = [];
    this.sparkAge = 1;
    this.key = `${scene.sys.settings.key}_iron_lever`;
    this.box = { x: s.x - s.r * 1.2, y: s.y - s.r * 1.3, width: s.r * 1.85, height: s.r * 2.6 };
    this.canvas = makeCanvas(this.box.width * 3, this.box.height * 3);
    this.ctx = this.canvas.getContext("2d");
    this.texture = addCanvasTexture(scene.textures, this.key, this.canvas);
    this.image = scene.add.image(this.box.x, this.box.y, this.key).setOrigin(0, 0)
      .setDisplaySize(this.box.width, this.box.height).setDepth(-9);
    this.flash = scene.add.image(s.contact.x, s.contact.y, glow).setDisplaySize(s.r * 2.8, s.r * 3.2)
      .setTint(0xc7e2ff).setBlendMode("ADD").setAlpha(0).setDepth(-8.7);
    this.trails = scene.add.graphics().setDepth(-7.8).setBlendMode("ADD");
    this._draw();
  }

  pull() {
    this._stopMotion();
    this.phase = "pulling";
    if (this.scene.reducedMotion) {
      this.amount = 1; this.phase = "held"; this._draw();
      return;
    }
    this.motion = this.scene.tweens.add({
      targets: this, amount: 1, duration: 230, ease: "Sine.easeInOut",
      onUpdate: () => this._draw(), onComplete: () => { this.phase = "held"; this.motion = null; },
    });
  }

  trip() {
    this._stopMotion();
    const releasedFrom = this.amount;
    this.sparkAge = 0;
    this.phase = "returning";
    const scale = this.s.r / 22;
    this.sparks = this.scene.reducedMotion ? [] : Array.from({ length: 13 }, (_, i) => ({
      vx: -(32 + Math.random() * 95) * scale, vy: (-80 + Math.random() * 120) * scale,
      life: 0.2 + Math.random() * 0.22, delay: i < 9 ? 0 : 0.045,
      color: i % 4 ? 0xffcc79 : 0xecf4ff,
    }));
    if (this.scene.reducedMotion) {
      this.amount = 0; this.phase = "rest"; this._draw();
      return;
    }
    this.motion = this.scene.tweens.addCounter({
      from: 0, to: 0.44, duration: 440, ease: "Linear",
      onUpdate: (tween) => {
        const t = tween.getValue();
        // The spring accelerates the handle into its stop. The small,
        // diminishing rebounds are reflected off that stop, never past it.
        this.amount = releasedFrom * Math.abs(Math.exp(-18 * t) * (Math.cos(28 * t) + (18 / 28) * Math.sin(28 * t)));
        this._draw();
      },
      onComplete: () => { this.amount = 0; this.phase = "rest"; this.motion = null; this._draw(); },
    });
  }

  _draw() {
    const ctx = this.ctx, r = this.s.r, box = this.box;
    const theta = -1.14 + this.amount * 2.28;
    const x = -Math.cos(theta) * r * 0.72, y = Math.sin(theta) * r * 0.95;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.scale(this.canvas.width / box.width, this.canvas.height / box.height);
    ctx.translate(this.s.x - box.x, this.s.y - box.y);
    ctx.lineCap = "round";
    // The handle's shadow slides across the mounting as it projects out.
    ctx.save(); ctx.translate(2.5 + Math.cos(theta), 2);
    ctx.strokeStyle = "rgba(0,0,0,0.48)"; ctx.lineWidth = r * 0.24;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
    const rod = ctx.createLinearGradient(x - r * 0.12, y, x + r * 0.16, y);
    rod.addColorStop(0, "#171d20"); rod.addColorStop(0.35, "#bbc1bc");
    rod.addColorStop(0.52, "#818e8e"); rod.addColorStop(1, "#333d42");
    ctx.strokeStyle = "#101719"; ctx.lineWidth = r * 0.22;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke();
    ctx.strokeStyle = rod; ctx.lineWidth = r * 0.14; ctx.stroke();
    // A short, rounded iron grip on the rod, with worn machining marks.
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(y, x) + Math.PI / 2);
    const grip = ctx.createLinearGradient(-r * 0.13, 0, r * 0.13, 0);
    grip.addColorStop(0, "#2a3438"); grip.addColorStop(0.32, "#a6b1ad");
    grip.addColorStop(0.55, "#798885"); grip.addColorStop(1, "#222c32");
    ctx.fillStyle = grip; ctx.strokeStyle = "#111a20"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(-r * 0.13, -r * 0.24, r * 0.26, r * 0.48, r * 0.1); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(17,25,28,0.48)"; ctx.lineWidth = 0.5;
    for (const yy of [-0.1, 0, 0.1]) { ctx.beginPath(); ctx.moveTo(-r * 0.09, r * yy); ctx.lineTo(r * 0.09, r * yy); ctx.stroke(); }
    ctx.restore();
    // The fixed axle hides the root of the moving rod.
    const hub = ctx.createRadialGradient(-r * 0.055, -r * 0.07, 0, 0, 0, r * 0.22);
    hub.addColorStop(0, "#b1b7ac"); hub.addColorStop(0.35, "#7c8885");
    hub.addColorStop(0.7, "#404c4e"); hub.addColorStop(1, "#172023");
    ctx.fillStyle = hub; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.19, r * 0.23, -0.16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#182024"; ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.06); ctx.lineTo(r * 0.06, r * 0.06); ctx.stroke();
    ctx.restore();
    this.texture.refresh();
  }

  update(delta) {
    if (this.sparkAge > 0.55) return;
    this.sparkAge += delta / 1000;
    const age = this.sparkAge, s = this.s, g = this.trails, scale = s.r / 22;
    const { x, y } = s.contact;
    this.flash.setAlpha((this.scene.reducedMotion ? 0.14 : 0.5) * Math.exp(-age * 28));
    g.clear();
    if (!this.scene.reducedMotion) {
      if (age < 0.075) {
        const points = [[x + 2 * scale, y], [x - 3 * scale, y - 2 * scale], [x - scale, y - 5 * scale], [x - 7 * scale, y - 7 * scale]];
        for (const [width, alpha] of [[3, 0.14], [0.85, 0.9]]) {
          g.lineStyle(width * scale, 0xdceeff, alpha * (1 - age / 0.075));
          g.beginPath(); g.moveTo(...points[0]);
          points.slice(1).forEach(([px, py]) => g.lineTo(px, py)); g.strokePath();
        }
      }
      for (const spark of this.sparks) {
        const t = age - spark.delay;
        if (t < 0 || t >= spark.life) continue;
        const back = Math.max(0, t - 0.024), gravity = 230 * scale;
        const px = x + spark.vx * t, py = y + spark.vy * t + gravity * t * t;
        const tailX = x + spark.vx * back, tailY = y + spark.vy * back + gravity * back * back;
        const alpha = Math.pow(1 - t / spark.life, 0.7);
        g.lineStyle(2.3 * scale, spark.color, alpha * 0.12); g.lineBetween(tailX, tailY, px, py);
        g.lineStyle(Math.max(0.6, 0.8 * scale), spark.color, alpha); g.lineBetween(tailX, tailY, px, py);
      }
    }
    if (age > 0.55) { g.clear(); this.flash.setAlpha(0); this.sparks = []; }
  }

  _stopMotion() {
    // Phaser may already have destroyed the tween during scene shutdown.
    if (this.motion?.parent) this.motion.remove();
    this.motion = null;
  }

  destroy() {
    this._stopMotion();
    this.image.destroy(); this.flash.destroy(); this.trails.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    this.sparks = [];
  }
}
