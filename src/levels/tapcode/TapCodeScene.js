import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { layoutCellar, paintCellar, releaseCellarArt } from "./cellar.js";
import { loadNativeCellar } from "./nativeCellar.js";
import { HOUSE_BACK } from "../../shared/house.js";
import { CURSORS } from "../../shared/cursors.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "TAPCODE"  ·  code: ESCAPE   ·  count the knocks
//
// The cellar under the house, down an iron ladder: brick, joists overhead,
// no window. A little light falls through the hatch; the rest is a candle
// on a stool, warm on a smooth stone let into the wall where somebody cut
// a message in a prisoner's tap code — a 5×5 grid of letters, A to Y,
// with the Z it has no room for past the end of the last row; each letter
// two numbers: the row in marks, then the column in marks.
//
//        1 2 3 4 5
//     1  A B C D E
//     2  F G H I J
//     3  K L M N O
//     4  P Q R S T
//     5  U V W X Y  Z
//
//   (1,5)(4,4)(1,3)(1,1)(4,1)(1,5)   →   E S C A P E
//
// Six lines, two clusters of marks each. Nothing names the cipher; the
// longest cluster is five, and the bottle rack against the wall is a grid of
// five by five, empty, with a Z scratched on the wall past the end of its
// bottom row. A water pipe runs along
// under the joists and weeps at one joint into a puddle; barrels, a crate,
// and a tub of old rolled charts against the wall.
// ─────────────────────────────────────────────────────────────────────────────

export default class TapCodeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "TapCode" });
  }

  preload() {
    loadNativeCellar(this);
    this.load.audio("waterdrop", "assets/sounds/global/waterdrop.mp3");
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    // Keep navigation clear of the rack's last row and carved Z on short screens.
    document.getElementById("btn-leave")?.classList.toggle("basement-compact-back", W / H > 2.3);
    const L = layoutCellar(W, H);
    const k = paintCellar(this, L).keys;
    this._L = L;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the candle: its flame and its warm glow, never quite still
    const c = L.candle;
    this._flameH = 22 * c.s;
    this._flame = this.add
      .image(c.x, c.y - 3 * c.s, k.flame)
      .setOrigin(0.5, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-6);
    this._glowAlpha = L.nativeRender ? 0.16 : 0.5;
    const glowSize = c.s * (L.nativeRender ? 74 : 170);
    this._glow = this.add
      .image(c.x, c.y - this._flameH * 0.5, k.glow)
      .setDisplaySize(glowSize, glowSize)
      .setTint(0xffb860)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(this._glowAlpha)
      .setDepth(-6);

    this._makeDrip(L, k.glow);
    this._makeMotes(L, k.glow);
    this._makeFog(L, k.fog);
    this._makeExit(L);
  }

  _makeExit(L) {
    // Stay between the rails, just inside the opening above the top rung.
    const x = Phaser.Math.Clamp(L.exit?.x ?? L.ladder.x, 32, L.W - 32);
    const y = Phaser.Math.Clamp(L.exit?.y ?? L.ceilY * 0.65, 32, L.H - 32);
    const size = Phaser.Math.Clamp(32 * L.u, 28, 38);
    const arrow = this.add.graphics({ x, y }).setDepth(10).setAlpha(0.82);
    const points = [
      { x: 0, y: -size / 2 }, { x: size * 0.31, y: -size * 0.13 },
      { x: size * 0.08, y: -size * 0.13 }, { x: size * 0.08, y: size / 2 },
      { x: -size * 0.08, y: size / 2 }, { x: -size * 0.08, y: -size * 0.13 },
      { x: -size * 0.31, y: -size * 0.13 },
    ];
    arrow.lineStyle(3, 0x090b0d, 0.85).strokePoints(points, true);
    arrow.fillStyle(0xece7db).fillPoints(points, true);
    this.add.zone(x, y, 56, 56).setDepth(11).setName("basement-exit")
      .setInteractive({ cursor: CURSORS.ladder })
      .setData("interactionLabel", "Climb up to Room V")
      .on("pointerover", () => arrow.setAlpha(1))
      .on("pointerout", () => arrow.setAlpha(0.82))
      .on("pointerdown", () => this.game.events.emit(HOUSE_BACK));
  }

  // The weeping joint: a bead of water gathers under it, lets go, falls the
  // height of the cellar and rings the puddle — over and over, and each time
  // it is heard (assets/sounds/global/waterdrop.mp3).
  _makeDrip(L, key) {
    const d = L.drip, u = L.u;
    const bead = this.add.image(d.x, d.y0, key).setTint(0xcfe0ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(-5).setAlpha(0);
    this.ambientObject(bead);
    const plink = () => this.services.audio.playSfx("waterdrop", 0.45 + Math.random() * 0.2, this);
    const fall = () => {
      // with nothing moving, the drop is still heard
      if (!this.ambientMotion || this.reducedMotion) { plink(); return; }
      bead.setPosition(d.x, d.y0).setDisplaySize(2 * u, 2 * u).setAlpha(0.9);
      this.tweens.add({
        targets: bead,
        displayWidth: 7 * u,
        displayHeight: 9 * u,
        duration: 900,
        ease: "Sine.easeIn",
        onComplete: () => {
          this.tweens.add({
            targets: bead,
            y: d.y1,
            displayWidth: 4 * u,
            displayHeight: 16 * u,
            duration: 520,
            ease: "Quad.easeIn",
            onComplete: () => {
              bead.setAlpha(0);
              plink();
              for (const wait of [0, 170]) {
                const ring = this.add.ellipse(d.x, d.y1 + 3 * u, 12 * u, 3 * u).setStrokeStyle(Math.max(1, 1.2 * u), 0xc8d8f0, 0.55).setDepth(-5).setAlpha(0);
                this.tweens.add({ targets: ring, scaleX: 7, scaleY: 5, alpha: { from: 0.8, to: 0 }, delay: wait, duration: 1100, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
              }
            },
          });
        },
      });
    };
    this.time.addEvent({ delay: 2300, loop: true, callback: fall });
    this.time.delayedCall(600, fall);
  }

  // the damp air drifting slowly, low along the floor
  _makeFog(L, key) {
    const { W, H, floorY } = L;
    for (let i = 0; i < 3; i++) {
      const y = floorY + (H - floorY) * (0.22 + i * 0.25);
      const fog = this.add
        .image(W * (i % 2 ? 0.25 : 0.7), y, key)
        .setDisplaySize(W * (0.75 + i * 0.12), H * (0.07 + i * 0.015))
        .setTint(0x8f9aa2)
        .setAlpha(0.018 + i * 0.006)
        .setDepth(-4);
      this.ambientTween({
        targets: fog,
        x: fog.x + (i % 2 ? 1 : -1) * W * 0.16,
        duration: 16000 + i * 5000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // dust turning in the light that falls through the hatch
  _makeMotes(L, key) {
    const x0 = L.ladder.x;
    for (let i = 0; i < 9; i++) {
      const t = Math.random();
      const x = x0 + (Math.random() - 0.5) * (70 + t * 110) * L.u;
      const top = Math.max(0, L.ceilY);
      const y = top + t * (L.floorY - top);
      const m = this.add
        .image(x, y, key)
        .setDisplaySize(2.6 * L.u, 2.6 * L.u)
        .setTint(0xc8d8ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-5);
      this.ambientObject(m);
      this.ambientTween({
        targets: m,
        x: x + (Math.random() - 0.5) * 30 * L.u,
        y: y + (Math.random() - 0.3) * 30 * L.u,
        alpha: { from: 0, to: 0.12 + Math.random() * 0.15 },
        duration: 4000 + Math.random() * 4000,
        delay: Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  update(time) {
    if (!this._L) return;
    const on = this.ambientMotion && !this.reducedMotion ? 1 : 0;
    const t = time / 1000;
    const f = on * (Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.5);
    this._flame.setDisplaySize(this._flameH * (0.45 - f * 0.03), this._flameH * (1 + f * 0.08)).setAngle(f * 3);
    this._glow.setAlpha(this._glowAlpha + f * (this._L.nativeRender ? 0.018 : 0.06));
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    releaseCellarArt(this.textures);
    this._L = null;
  }

  shutdown() {
    document.getElementById("btn-leave")?.classList.remove("basement-compact-back");
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseCellarArt(this.textures);
    this._L = null;
  }
}
