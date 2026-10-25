import { renderBox } from "./hallRender.js";
import SWITCH from "./hallSwitch.json";

// The bulb's switch on the chemist's floor (art/blender/hall_chem.py): a
// double-pole knife switch on a slate panel by the stairs. Its two copper
// blades and their ebonite handle are rendered at every angle they swing
// through, from fallen open to shut in the jaws, and shut once more with the
// bulb alight; the panel itself is in the hall's picture, these lie over it.
const SHEET = { key: "hall_chem_switch_render_v1", url: "assets/images/Chemistry/hall-chem-switch-render-v1.webp" };

export function loadLightSwitch(scene) {
  if (!scene.textures.exists(SHEET.key)) {
    scene.load.spritesheet(SHEET.key, SHEET.url, { frameWidth: SWITCH.frameWidth, frameHeight: SWITCH.frameHeight });
  }
}

/** Thrown up into its jaws against its spring, held through the signal,
 *  then knocked open by the short, sparks out of the jaws. The frames are
 *  loaded once; the switch owns only its images and their sparks. */
export class LightSwitch {
  constructor(scene, L, glow) {
    this.scene = scene;
    this.r = L.switch.r;
    this.amount = 0;
    this.phase = "rest";
    this.sparks = [];
    this.sparkAge = 1;
    const box = renderBox(L, SWITCH.box), jaws = renderBox(L, [...SWITCH.contact, 0, 0]);
    this.contact = { x: jaws.x, y: jaws.y };
    // where it takes a click: the panel, and the blades fallen out from it
    this.hit = renderBox(L, SWITCH.hit);
    const drawn = scene.textures.exists(SHEET.key);
    const frame = (n) => scene.add.image(box.x, box.y, SHEET.key, n).setOrigin(0, 0).setDisplaySize(box.width, box.height);
    this.image = drawn ? frame(0).setDepth(-9) : null;
    this.lit = drawn ? frame(SWITCH.frames).setDepth(-8.95).setAlpha(0) : null;
    this.flash = scene.add.image(this.contact.x, this.contact.y, glow).setDisplaySize(this.r * 2.8, this.r * 3.2)
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
    const scale = this.r / 22;
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
        // The spring throws the blades open against their stop. The small,
        // dying rebounds come back off that stop, never past it.
        this.amount = releasedFrom * Math.abs(Math.exp(-18 * t) * (Math.cos(28 * t) + (18 / 28) * Math.sin(28 * t)));
        this._draw();
      },
      onComplete: () => { this.amount = 0; this.phase = "rest"; this.motion = null; this._draw(); },
    });
  }

  /** Worked as any switch is, once its puzzle is solved: thrown up into its
   *  jaws, on; pulled out of them, off — no short, no sparks. */
  set(on, animate = true) {
    this._stopMotion();
    const to = on ? 1 : 0;
    this.phase = on ? "held" : "rest";
    if (!animate || this.scene.reducedMotion) {
      this.amount = to; this._draw();
      return;
    }
    this.motion = this.scene.tweens.add({
      targets: this, amount: to, duration: 230, ease: "Sine.easeInOut",
      onUpdate: () => this._draw(), onComplete: () => { this.motion = null; },
    });
  }

  /** The bulb's light on the shut blades, as much as it is alight. */
  light(level) {
    this.lit?.setAlpha(level);
  }

  _draw() {
    this.image?.setFrame(Math.round(this.amount * (SWITCH.frames - 1)));
  }

  update(delta) {
    if (this.sparkAge > 0.55) return;
    this.sparkAge += delta / 1000;
    const age = this.sparkAge, g = this.trails, scale = this.r / 22;
    const { x, y } = this.contact;
    this.flash.setAlpha((this.scene.reducedMotion ? 0.14 : 0.5) * Math.exp(-age * 28));
    g.clear();
    if (!this.scene.reducedMotion) {
      // the arc, as the blades leave the jaws
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
    this.image?.destroy(); this.lit?.destroy(); this.flash.destroy(); this.trails.destroy();
    this.sparks = [];
  }
}
