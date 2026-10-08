import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { noiseBurst, chime } from "../../shared/paint.js";
import { layoutLab, paintLab, releaseLabArt } from "./lab.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "CHEMISTRY"  ·  code: FOCUS  ·  atomic numbers → symbols
//
// An old laboratory at night, lit by a Bunsen burner and an oil lamp. On the
// bench stand five graduated bottles of coloured liquid, their printed scales
// too fine to read by eye. A magnifying glass lies on its cloth: picked up, it
// becomes the pointer, and under it each liquid is seen to stand at:
//
//   9 · 8 · 6 · 92 · 16
//
// A faded periodic table hangs on the wall. The numbers are atomic numbers:
// fluorine F, oxygen O, carbon C, uranium U, sulfur S — F O C U S. (Each
// liquid has its element's colour: pale yellow, pale blue, black, a glowing
// uranium green, sulfur yellow.)
//
// A click on a bottle swirls it; a click on the burner turns up the gas. The
// glass is put back by clicking its cloth (or Escape).
// ─────────────────────────────────────────────────────────────────────────────

export default class ChemistryScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Chemistry" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    this.input.on("pointermove", (p) => this._follow(p));
    this.input.keyboard?.on("keydown-ESC", () => this._putDown());
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    this._movableSparkleCleanups = [];
    const L = layoutLab(W, H);
    const art = paintLab(this, L);
    const k = art.keys;
    this._L = L;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the five bottles, and the bubbles rising in them
    this._bottles = art.bottles.map((b) => {
      const img = this.add
        .image(b.x, b.y, b.key)
        .setOrigin(b.ox, b.oy)
        .setScale(0.5)
        .setDepth(-6)
        .setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 10 })
        .setData("interactionLabel", "Swirl the bottle");
      img.on("pointerdown", () => this._swirl(img, b));
      if (b.glow) {
        const glow = this.add
          .image(b.x, b.y + b.liquid.top * 0.6, k.glow)
          .setDisplaySize(L.u * 170, L.u * 220)
          .setTint(0x70ff70)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.35)
          .setDepth(-7);
        this.ambientTween({ targets: glow, alpha: { from: 0.25, to: 0.45 }, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
      for (let i = 0; i < 4; i++) this._bubble(b, k.bubble, i * 700 + Math.random() * 500);
      return img;
    });

    // the burner's blue flame, the flask's steam, the oil lamp's flame
    const bu = L.burner;
    this._blue = this.add
      .image(bu.mouth.x, bu.mouth.y, k.blue)
      .setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-5);
    this._blueH = 34 * L.u * bu.s;
    this._boost = 0;
    this.add
      .image(bu.mouth.x, bu.mouth.y - this._blueH * 0.4, k.glow)
      .setDisplaySize(L.u * 150, L.u * 150)
      .setTint(0x6080ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.45)
      .setDepth(-5);
    this._gasZone = this.add
      .zone(bu.x, bu.y - 50 * L.u * bu.s, 70 * L.u * bu.s, 110 * L.u * bu.s)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Turn up the gas")
      .setDepth(5);
    this._gasZone.on("pointerdown", () => this._gas());
    const f = L.flask;
    for (let i = 0; i < 3; i++) {
      const s = this.add
        .image(f.x + (i - 1) * 3 * L.u, f.y - f.r * 2.1, k.steam)
        .setOrigin(0.5, 1)
        .setScale(0.4 * L.u)
        .setAlpha(0)
        .setDepth(-5);
      this.ambientObject(s);
      this.ambientTween({
        targets: s,
        y: { from: f.y - f.r * 2.1, to: f.y - f.r * 2.1 - 30 * L.u },
        alpha: { from: 0.8, to: 0 },
        duration: 2400,
        delay: i * 800,
        repeat: -1,
        ease: "Sine.easeOut",
      });
    }
    for (let i = 0; i < 5; i++) {
      const bub = this.add
        .image(f.x + (Math.random() - 0.5) * f.r, f.y + f.r * 0.6, k.bubble)
        .setDisplaySize(5 * L.u, 5 * L.u)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-5);
      this.ambientObject(bub);
      this.ambientTween({
        targets: bub,
        y: f.y - f.r * 0.1,
        alpha: { from: 0.9, to: 0.2 },
        duration: 700 + Math.random() * 400,
        delay: Math.random() * 900,
        repeat: -1,
      });
    }
    const lp = L.lamp;
    this._flame = this.add
      .image(lp.flame.x, lp.flame.y, k.flame)
      .setOrigin(0.5, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-5);
    this._flameH = 26 * lp.s;
    this._lampGlow = this.add
      .image(lp.flame.x, lp.flame.y - this._flameH * 0.4, k.glow)
      .setDisplaySize(lp.s * 150, lp.s * 150)
      .setTint(0xffb860)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.6)
      .setDepth(-5);
    this._buildLoupe(art);
    this.levelText = drawLevelLabel(this, W, H);
  }

  // The magnifying glass: lying on its cloth until it is picked up; then the
  // lens follows the pointer, and inside its ring the room is drawn again,
  // enlarged about the point it is held over.
  _buildLoupe(art) {
    const L = this._L;
    const k = art.keys;
    const lp = art.loupe;
    const Z = L.loupe.zoom;
    this._held = false;
    this._loupe = this.add
      .image(lp.x, lp.y, k.loupe)
      .setOrigin(lp.ox, lp.oy)
      .setScale(0.5)
      .setDepth(-4)
      .setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 10 })
      .setData("interactionLabel", "Pick up the magnifying glass");
    this._movableSparkleCleanups.push(
      attachMovableSparkles(this, this._loupe, { padding: 3, enabled: () => !this._held }),
    );
    this._loupe.on("pointerdown", (p) => this._pickUp(p));
    // its cloth, where it is put back
    this._cloth = this.add
      .zone(lp.x + 16 * L.loupe.n, lp.y, 250 * L.loupe.n, 80 * L.loupe.n)
      .setDepth(6)
      .setData("interactionLabel", "Put the magnifying glass down")
      .on("pointerdown", () => this._putDown());
    this._zoom = this.add.container(0, 0).setDepth(40).setVisible(false);
    this._zoom.add(this.add.image(0, 0, k.room).setOrigin(0, 0).setScale(Z));
    for (const b of art.bottles) {
      this._zoom.add(this.add.image(b.x * Z, b.y * Z, b.zoomKey).setOrigin(b.ox, b.oy));
    }
    this._lensMask = this.make.graphics();
    this._lensMask.fillStyle(0xffffff).fillCircle(0, 0, L.loupe.r);
    this._zoom.setMask(this._lensMask.createGeometryMask());
    this._lens = this.add.image(0, 0, k.lens).setScale(0.5).setDepth(41).setVisible(false);
  }

  _pickUp(pointer) {
    if (this._held) return;
    this._held = true;
    this._loupe.setVisible(false).disableInteractive();
    this._bottles.forEach((img) => img.disableInteractive());
    this._gasZone.disableInteractive();
    this._cloth.setInteractive({ cursor: "none" });
    this._zoom.setVisible(true);
    this._lens.setVisible(true);
    this.input.setDefaultCursor("none");
    this._follow(pointer);
    chime(this, [[2600, 0.03]], 0.25);
  }

  _putDown() {
    if (!this._held) return;
    this._held = false;
    this._zoom.setVisible(false);
    this._lens.setVisible(false);
    this._cloth.disableInteractive();
    this._loupe.setVisible(true).setInteractive();
    this._bottles.forEach((img) => img.setInteractive());
    this._gasZone.setInteractive();
    this.input.setDefaultCursor("default");
    noiseBurst(this, { dur: 0.12, type: "lowpass", freq: 500, q: 0.7, gain: 0.12, env: (k) => 1 - k });
  }

  _follow(pointer) {
    if (!this._held || !this._L) return;
    const Z = this._L.loupe.zoom;
    this._lens.setPosition(pointer.x, pointer.y);
    this._lensMask.setPosition(pointer.x, pointer.y);
    this._zoom.setPosition(pointer.x * (1 - Z), pointer.y * (1 - Z));
  }

  // a bubble rising through a bottle's liquid, over and over
  _bubble(b, key, delay) {
    const L = this._L;
    const q = b.liquid;
    const x = b.x + q.x0 + Math.random() * (q.x1 - q.x0);
    const size = (2.5 + Math.random() * 3) * L.u;
    const bub = this.add
      .image(x, b.y + q.bot, key)
      .setDisplaySize(size, size)
      .setTint(Phaser.Display.Color.GetColor(...b.colour.map((c) => Math.min(255, c + 90))))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(-5);
    this.ambientObject(bub);
    this.ambientTween({
      targets: bub,
      y: b.y + q.top + size,
      x: x + (Math.random() - 0.5) * 6 * L.u,
      alpha: { from: 0.8, to: 0.3 },
      duration: 1800 + Math.random() * 1400,
      delay,
      repeat: -1,
      ease: "Sine.easeIn",
    });
  }

  update(time) {
    if (!this._L) return;
    const t = time / 1000;
    const on = this.ambientMotion && !this.reducedMotion ? 1 : 0;
    const flick = on * (Math.sin(t * 17) * 0.5 + Math.sin(t * 9.3) * 0.5);
    this._boost = Math.max(0, this._boost - 0.012);
    const bh = this._blueH * (1 + this._boost * 0.9 + flick * 0.05);
    this._blue.setDisplaySize(bh * 0.4, bh);
    const lf = on * (Math.sin(t * 11) * 0.5 + Math.sin(t * 6.1) * 0.5);
    this._flame.setDisplaySize(this._flameH * (0.45 - lf * 0.03), this._flameH * (1 + lf * 0.08)).setAngle(lf * 3);
    this._lampGlow.setAlpha(0.55 + lf * 0.06);
  }

  // the bottle swirled: it rocks on its foot and rings against the bench
  _swirl(img, b) {
    if (img.getData("busy")) return;
    img.setData("busy", true);
    chime(this, [
      [1900 + b.i * 140, 0.05],
      [3100 + b.i * 90, 0.025],
    ], 0.5);
    this.tweens.add({
      targets: img,
      angle: { from: 0, to: 5 },
      duration: 120,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        img.setAngle(0);
        if (img.active) img.setData("busy", false);
      },
    });
  }

  // the gas turned up: the flame roars a moment
  _gas() {
    this._boost = 1;
    noiseBurst(this, {
      dur: 1.1,
      type: "bandpass",
      freq: 600,
      q: 0.5,
      gain: 0.18,
      env: (k) => Math.min(1, k * 8) * (1 - k),
    });
  }

  _teardown() {
    this._movableSparkleCleanups?.forEach(cleanup => cleanup());
    this._movableSparkleCleanups = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._dropLoupe();
    releaseLabArt(this.textures);
    this._bottles = [];
    this._L = null;
  }

  // the glass let go of, with the scene: the pointer is the pointer again
  _dropLoupe() {
    this._lensMask?.destroy();
    this._lensMask = null;
    this._held = false;
    this.input.setDefaultCursor("default");
  }

  shutdown() {
    this._onResize = null;
    this._dropLoupe();
    this._movableSparkleCleanups?.forEach(cleanup => cleanup());
    this._movableSparkleCleanups = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseLabArt(this.textures);
    this._L = null;
  }
}
