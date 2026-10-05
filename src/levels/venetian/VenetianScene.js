import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel } from '../../shared/levelLabel.js';
import { attachMovableSparkles } from '../../shared/movableSparkles.js';
import { releaseTextures } from '../../shared/paint.js';
import { adjustmentKeys } from '../../shared/windowLight.js';
import { VENETIAN_START, VENETIAN_ROWS, clampTilt, blindSlits, venetianLayout } from './puzzle.js';
import { VENETIAN_ART, paintVenetian } from './city.js';

export default class VenetianScene extends BasePuzzleScene {
  constructor() { super({ key: 'Venetian' }); }

  create() {
    this.beginScene(); this.tilt = VENETIAN_START;
    this._build(this.scale.width, this.scale.height);
    this._releaseKeys = adjustmentKeys(this, 'ArrowUp', 'ArrowDown', step => this._setTilt(this.tilt + step));
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
  }

  _build(W, H) {
    const L = (this._L = venetianLayout(W, H)), w = L.window;
    paintVenetian(this.textures, L);
    this.add.image(0, 0, VENETIAN_ART.room).setOrigin(0).setDisplaySize(W, H).setDepth(-20);
    this._city = this.add.image(w.x, w.y, VENETIAN_ART.city).setOrigin(0).setDisplaySize(w.w, w.h).setDepth(-15);
    this._maskShape = this.make.graphics({}, false);
    this._slitMask = this._maskShape.createGeometryMask(); this._city.setMask(this._slitMask);
    this._slats = this.add.graphics().setDepth(-10); this._cord = this.add.graphics();
    const grip = Math.max(24, Math.min(44, W * 0.055));
    this._pull = this.add.zone(L.cordX, 0, grip, Math.max(grip, H * 0.075))
      .setInteractive({ draggable: true, cursor: 'ns-resize' }).setData('interactionLabel', 'Tilt the slats · draw the cord up or down');
    this._movableSparklesCleanup = attachMovableSparkles(this, this._pull, { padding: 3 });
    this._pull.on('dragstart', pointer => { this._dragStart = { y: pointer.y, tilt: this.tilt }; });
    this._pull.on('drag', pointer => {
      if (this._dragStart) this._setTilt(this._dragStart.tilt + (pointer.y - this._dragStart.y) / L.pullTravel);
    });
    this._pull.on('dragend', () => { this._dragStart = null; });
    const font = Math.max(10, Math.min(16, H * 0.024));
    this._clue = this.add.text(W / 2, H * 0.954, 'Focus through the noise.', {
      fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: font + 'px', color: '#aebcca',
    }).setOrigin(0.5);
    this.add.text(L.cordX, H * 0.854, 'TILT', {
      fontFamily: '"Special Elite", monospace', fontSize: Math.max(8, font * 0.58) + 'px', color: '#677685',
    }).setOrigin(0.5);
    this.levelText = drawLevelLabel(this, W, H, { color: '#a1b2c6' }); this._render();
  }

  _setTilt(value) { this.tilt = clampTilt(value); this._render(); }

  _render() {
    if (!this._L) return;
    const L = this._L, w = L.window, slits = blindSlits(this.tilt);
    const mask = this._maskShape; mask.clear(); mask.fillStyle(0xffffff);
    const slats = this._slats; slats.clear();
    let end = 0;
    const slat = (top, bottom) => {
      if (bottom <= top) return;
      const y = w.y + top * w.h, h = (bottom - top) * w.h;
      slats.fillStyle(0x131d29); slats.fillRect(w.x, y, w.w, h);
      slats.fillStyle(0x283441, 0.38); slats.fillRect(w.x, y, w.w, Math.min(h * 0.22, 2.5));
      slats.lineStyle(0.65, 0x556574, 0.26); slats.lineBetween(w.x, y + h - 0.5, w.x + w.w, y + h - 0.5);
    };
    for (const slit of slits) {
      slat(end, slit.top);
      mask.fillRect(w.x, w.y + slit.top * w.h, w.w, (slit.bottom - slit.top) * w.h);
      end = slit.bottom;
    }
    slat(end, 1);
    // Narrow ladder cords run in front of the slats, outside the letter strokes.
    for (const x of [w.x + w.w * 0.04, w.x + w.w * 0.96]) {
      slats.lineStyle(1.1, 0x080f18, 0.9); slats.lineBetween(x, w.y, x, w.y + w.h);
      for (let i = 0; i < VENETIAN_ROWS; i++) slats.lineBetween(x - 2, w.y + (i + 0.4) / VENETIAN_ROWS * w.h, x + 2, w.y + (i + 0.4) / VENETIAN_ROWS * w.h);
    }
    const pullY = L.pullTop + this.tilt * L.pullTravel; this._pull.y = pullY;
    const c = this._cord; c.clear();
    c.lineStyle(1.3, 0x9da6a8, 0.75); c.lineBetween(L.cordX, L.cordTop, L.cordX, pullY);
    c.lineStyle(1, 0x556575, 0.5); c.lineBetween(L.cordX + 4, L.cordTop, L.cordX + 4, L.pullTop + L.pullTravel * 0.65);
    const s = Math.max(5, Math.min(10, L.height * 0.012));
    c.fillStyle(0x3f4244); c.fillRoundedRect(L.cordX - s * 0.63, pullY - s, s * 1.26, s * 2.9, s * 0.42);
    c.lineStyle(1, 0x9a9d98, 0.7); c.lineBetween(L.cordX - s * 0.35, pullY - s * 0.65, L.cordX - s * 0.35, pullY + s * 1.35);
    c.fillStyle(0x252c32); c.fillEllipse(L.cordX, pullY + s * 1.8, s * 1.24, s * 0.5);
  }

  _teardown() {
    this._movableSparklesCleanup?.();
    this._movableSparklesCleanup = null;
    this._dragStart = null;
    this._city?.clearMask(); this._slitMask?.destroy(); this._maskShape?.destroy();
    this.tweens.killAll();
    for (const child of this.children.list.slice()) child.destroy();
    releaseTextures(this.textures, VENETIAN_ART);
    this._L = null; this._city = null; this._slitMask = null; this._maskShape = null;
  }

  shutdown() { this._releaseKeys?.(); this._teardown(); }
}
