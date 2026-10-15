import Phaser from 'phaser';
import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { lcg, noiseBurst } from '../../shared/paint.js';
import { readKinetic } from './puzzle.js';
import { paintCupboard, releaseCupboardArt } from './cupboard.js';

/** The games cupboard — in Room 6, the games room: a tall oak cupboard with
 *  its doors open, games stacked flat on its top and bottom shelves, and on
 *  the middle shelf four boxes standing face out, each with one big wooden
 *  game piece painted on its lid: a triangle, a disc, a heptagon, a
 *  pentagon. Count each piece's sides — the card pinned inside the door says
 *  how a curve counts — and read them left to right: 3, 1, 7, 5 → CAGE.
 *  A knock on a box rocks it on the shelf; that is all it does. */
export default class KineticScene extends BasePuzzleScene {
  constructor() { super({ key: 'Kinetic' }); }

  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  static code() { return readKinetic(); }

  _build(W, H) {
    const art = (this._art = paintCupboard(this.textures, W, H));
    const L = (this._L = art.L);
    this.add.image(0, 0, art.keys.room).setOrigin(0).setDepth(0);
    // the four boxes on the middle shelf, each to be knocked
    this._lids = art.lids.map((b) => {
      const img = this.add.image(b.x, b.y, b.key).setOrigin(0.5, b.oy).setScale(1 / art.res).setDepth(2);
      const zone = this.add.zone(b.lid.x, b.lid.y, b.lid.w, b.lid.h).setOrigin(0).setDepth(5)
        .setInteractive({ useHandCursor: true }).setData('interactionLabel', 'Knock on the box');
      zone.on('pointerdown', () => this._knock(img));
      return img;
    });
    // the words on the card inside the door
    const c = L.card;
    this.add.text(c.x + c.w / 2, c.y + c.h * 0.58, 'One unbroken curve\ncounts as one.', {
      fontFamily: '"Special Elite", "Courier New", monospace',
      fontSize: Math.max(7, Math.round(c.w * 0.078)) + 'px',
      color: '#3a2a18', align: 'center', lineSpacing: 2,
    }).setOrigin(0.5).setRotation(-0.04).setResolution(2).setDepth(3);
    // the lamp's light on the middle shelf, barely breathing
    const sh = L.shelves;
    const glow = this.add.image(W / 2, sh[1] - (sh[1] - sh[0]) * 0.45, art.keys.glow)
      .setDisplaySize((L.x1 - L.x0) * 1.2, (sh[1] - sh[0]) * 1.6)
      .setTint(0xffc884).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.16).setDepth(4);
    this.ambientTween({ targets: glow, alpha: { from: 0.16, to: 0.12 }, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // dust turning slowly in that light
    const rnd = lcg(29811);
    this._motes = Array.from({ length: 22 }, () => {
      const x = L.inner.x0 + rnd() * (L.inner.x1 - L.inner.x0), y = sh[0] + rnd() * (sh[1] - sh[0]);
      const mote = this.add.image(x, y, art.keys.glow).setDisplaySize(3 * L.u + 1, 3 * L.u + 1)
        .setTint(0xffe2b8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(4.5);
      this.ambientObject(mote);
      this.ambientTween({ targets: mote, x: x + (rnd() - 0.5) * 40 * L.u, y: y + (rnd() - 0.3) * 30 * L.u,
        alpha: { from: 0, to: 0.2 + rnd() * 0.3 }, duration: 4000 + rnd() * 4000, delay: rnd() * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return mote;
    });
  }

  // A knock: the box rocks back against the cupboard and settles, the pieces
  // inside it rattling.
  _knock(img) {
    if (img.getData('rocking')) return;
    img.setData('rocking', true);
    noiseBurst(this, { dur: 0.09, type: 'lowpass', freq: 260, gain: 0.7, env: (k) => (1 - k) ** 3 });
    this.time.delayedCall(70, () => noiseBurst(this, { dur: 0.22, type: 'bandpass', freq: 2200, q: 2, gain: 0.12, env: (k) => (1 - k) ** 2 * (0.6 + 0.4 * Math.sin(k * 60)) }));
    if (this.reducedMotion) { img.setData('rocking', false); return; }
    this.tweens.add({ targets: img, angle: { from: 0, to: 2.6 }, duration: 110, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
      onComplete: () => { img.setAngle(0); img.setData('rocking', false); } });
  }

  _teardown() {
    this.tweens.killAll(); this.time.removeAllEvents();
    for (const child of this.children.list.slice()) child.destroy();
    releaseCupboardArt(this.textures);
    this._L = null; this._art = null; this._lids = []; this._motes = [];
  }

  shutdown() { this._teardown(); }
}
