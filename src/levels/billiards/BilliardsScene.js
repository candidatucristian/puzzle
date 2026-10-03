// ═══════════════════════════════════════════════════════════════════════════
// BilliardsScene.js — Level "BILLIARDS"  ·  code: BLIND
//
// An abandoned pub at night, a pool table seen from above under its lamp.
// The balls stand racked for the break, but five places in the triangle are
// empty: 2, 4, 9, 12 and 14 are gone. They lie in the pockets, five of which
// are marked I to V on little brass plates; down in a pocket a ball shows only
// its colour and whether it is striped, which — with the rack, and the set's
// colours (1–7 solid, 9–15 striped in the same colours) — tells its number:
//
//   I blue solid 2 · II purple stripe 12 · III yellow stripe 9
//   IV green stripe 14 · V purple solid 4
//
// The chalk slate on the floor says WHAT IS MISSING DEFINES THE ANSWER. In
// the pockets' order, 2 12 9 14 4 as letters of the alphabet: B L I N D.
//
// A click on a pocket rattles the ball in it; the cue ball can be nudged.
// ═══════════════════════════════════════════════════════════════════════════

import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { noiseBurst, chime } from "../../shared/paint.js";
import { layoutPub, paintPub, releasePubArt } from "./pub.js";

export default class BilliardsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Billiards" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    if (!this.skipFadeIn) this.cameras.main.fadeIn(900, 0, 0, 0);
  }

  _build(W, H) {
    const L = layoutPub(W, H);
    const art = paintPub(this, L);
    const k = art.keys;
    this._L = L;
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);

    // the balls down in the marked pockets
    for (const p of art.pockets) {
      const img = this.add.image(p.x, p.y, p.key).setScale(0.5).setDepth(-6);
      this.add
        .zone(p.x, p.y, p.r * 2.6, p.r * 2.6)
        .setInteractive({
          hitArea: new Phaser.Geom.Circle(p.r * 1.3, p.r * 1.3, p.r * 1.3),
          hitAreaCallback: Phaser.Geom.Circle.Contains,
          useHandCursor: true,
        })
        .setData("interactionLabel", "Look in the pocket")
        .setDepth(5)
        .on("pointerdown", () => this._rattle(img, p));
    }

    // the cue ball, to be nudged
    const cue = this.add
      .image(L.cue.x, L.cue.y, k.cue)
      .setScale(0.5)
      .setDepth(-6);
    cue
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Nudge the cue ball")
      .on("pointerdown", () => this._nudge(cue, L));

    // the lamp's light — a warm cone in the noir dark
    this._lamp = this.add
      .image(L.vp.x, (L.pockets[0].y + L.pockets[3].y) / 2, k.glow)
      .setDisplaySize(L.hw * 2.8, L.hw * 1.6)
      .setTint(0xffb666)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.12)
      .setDepth(-5);

    this._flicker = 0;

    // motes of dust drifting through the beam
    for (let i = 0; i < 18; i++) {
      const x0 = L.vp.x + (Math.random() - 0.5) * L.hw * 2;
      const y0 = this._lamp.y + (Math.random() - 0.5) * L.hw;
      const m = this.add
        .image(x0, y0, k.glow)
        .setDisplaySize(4 * L.u, 4 * L.u)
        .setTint(0xffe0b0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-4);
      this.ambientObject(m);
      this.ambientTween({
        targets: m,
        x: x0 + (Math.random() - 0.5) * 60 * L.u,
        y: y0 - (20 + Math.random() * 40) * L.u,
        alpha: { from: 0, to: 0.35 + Math.random() * 0.4 },
        duration: 4000 + Math.random() * 4000,
        delay: Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.levelText = drawLevelLabel(this, W, H);
  }

  update(time, delta) {
    if (!this._L) return;
    if (this.ambientMotion && !this.reducedMotion) {
      // the old lamp — steady, but now and then it dips and buzzes back
      if (this._flicker <= 0 && Math.random() < 0.0025) this._flicker = 420;
      if (this._flicker > 0) {
        this._flicker -= delta || 16;
        this._lamp.setAlpha(Math.random() < 0.5 ? 0.02 : 0.1);
        if (this._flicker <= 0) this._lamp.setAlpha(0.12);
      } else {
        // slow breathing of the lamp, the noir heartbeat of the room
        this._lamp.setAlpha(0.12 + Math.sin(time * 0.0006) * 0.012);
      }
    }
  }

  // the ball in a pocket rattles in its leather
  _rattle(img, p) {
    if (img.getData("busy")) return;
    img.setData("busy", true);
    this._clack(0.7);
    this.tweens.add({
      targets: img,
      x: { from: p.x - 2 * this._L.u, to: p.x + 2 * this._L.u },
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        img.setX(p.x);
        if (img.active) img.setData("busy", false);
      },
    });
  }

  // the cue ball rolls a little way up the cloth and stops, then is put back
  _nudge(cue, L) {
    if (cue.getData("busy")) return;
    cue.setData("busy", true);
    noiseBurst(this, {
      dur: 0.5,
      type: "lowpass",
      freq: 500,
      q: 0.5,
      gain: 0.15,
      env: (k) => (1 - k) * (0.7 + 0.3 * Math.random()),
    });
    this.tweens.add({
      targets: cue,
      x: L.cue.x + L.hw * 0.12,
      angle: 120,
      duration: 700,
      ease: "Cubic.easeOut",
      yoyo: true,
      hold: 700,
      onComplete: () => {
        cue.setAngle(0);
        if (cue.active) cue.setData("busy", false);
      },
    });
  }

  // two balls touching: a short hard click
  _clack(k = 1) {
    chime(
      this,
      [
        [2600, 0.05 * k],
        [4100, 0.025 * k],
      ],
      0.08,
    );
    noiseBurst(this, {
      dur: 0.03,
      type: "highpass",
      freq: 2500,
      q: 0.7,
      gain: 0.2 * k,
      env: (x) => Math.exp(-x * 6),
    });
  }

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releasePubArt(this.textures);
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releasePubArt(this.textures);
    this._L = null;
  }
}
