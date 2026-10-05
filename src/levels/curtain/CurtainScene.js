import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel } from '../../shared/levelLabel.js';
import { attachMovableSparkles } from '../../shared/movableSparkles.js';
import { releaseTextures } from '../../shared/paint.js';
import { adjustmentKeys } from '../../shared/windowLight.js';
import { CURTAIN_START, CURTAIN_WIDTH, CURTAIN_TRAVEL, CURTAIN_HOLES, clampCurtain, curtainLayout, curtainLeft, curtainShift, tearOutline } from './puzzle.js';
import { CURTAIN_ART, paintCurtainRoom } from './room.js';

export default class CurtainScene extends BasePuzzleScene {
  constructor() { super({ key: 'Curtain' }); }

  create() {
    this.beginScene();
    this.position = CURTAIN_START;
    this._build(this.scale.width, this.scale.height);
    this._releaseKeys = adjustmentKeys(this, 'ArrowLeft', 'ArrowRight', step => this._setPosition(this.position + step));
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
  }

  _build(W, H) {
    const L = (this._L = curtainLayout(W, H)), p = L.patch, w = L.window;
    this._art = paintCurtainRoom(this.textures, L);
    this.add.image(0, 0, CURTAIN_ART.room).setOrigin(0).setDisplaySize(W, H).setDepth(-20);
    this._beams = this.add.graphics().setDepth(-15);
    this._light = this.add.image(p.x, p.y, CURTAIN_ART.light).setOrigin(0).setDisplaySize(p.size, p.size).setDepth(-10);
    this._maskShape = this.make.graphics({}, false);
    this._lightMask = this._maskShape.createGeometryMask(); this._light.setMask(this._lightMask);
    this._cloth = this.add.image(0, w.y, CURTAIN_ART.cloth).setOrigin(0).setDisplaySize(this._art.clothWidth, this._art.clothHeight);
    this._rings = this.add.graphics().setDepth(1);
    this._dragZone = this.add.zone(0, w.y, this._art.clothWidth, this._art.clothHeight).setOrigin(0)
      .setInteractive({ draggable: true, cursor: 'ew-resize' }).setData('interactionLabel', 'Draw the curtain · drag left or right');
    this._movableSparklesCleanup = attachMovableSparkles(this, this._dragZone, {
      bounds: () => ({
        x: this._cloth.x + this._art.clothWidth - 3,
        y: this._cloth.y,
        width: 6,
        height: this._art.clothHeight,
      }),
      padding: 4,
    });
    this._dragZone.on('dragstart', pointer => { this._dragStart = { x: pointer.x, position: this.position }; });
    this._dragZone.on('drag', pointer => {
      if (this._dragStart) this._setPosition(this._dragStart.position + (pointer.x - this._dragStart.x) / (w.w * CURTAIN_TRAVEL));
    });
    this._dragZone.on('dragend', () => { this._dragStart = null; });
    const font = Math.max(10, Math.min(16, W * 0.022, H * 0.024));
    this._clue = this.add.text(W * 0.5, H * 0.963, 'Let the shadows guide your eyes.', {
      fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: font + 'px', color: '#aebcca',
    }).setOrigin(0.5);
    this.add.text(W * 0.07, H * 0.89, 'DRAW THE\nCURTAIN', {
      fontFamily: '"Special Elite", monospace', fontSize: Math.max(8, font * 0.64) + 'px', color: '#637182', lineSpacing: 4,
    }).setAlpha(0.8);
    this.levelText = drawLevelLabel(this, W, H, { color: '#9fabbc', y: 7 });
    this._render();
  }

  _setPosition(value) { this.position = clampCurtain(value); this._render(); }

  _render() {
    if (!this._L) return;
    const { patch: p, window: w } = this._L;
    const left = curtainLeft(this.position), shift = curtainShift(this.position);
    this._cloth.x = w.x + left * w.w; this._dragZone.x = this._cloth.x;
    const mask = this._maskShape; mask.clear(); mask.fillStyle(0xffffff);
    if (left > 0) mask.fillRect(p.x, p.y, Math.min(1, left) * p.size, p.size);
    const right = Math.max(0, left + CURTAIN_WIDTH);
    if (right < 1) mask.fillRect(p.x + right * p.size, p.y, (1 - right) * p.size, p.size);
    for (const hole of CURTAIN_HOLES) {
      mask.fillPoints(tearOutline(hole, shift).map(q => ({ x: p.x + q.x * p.size, y: p.y + q.y * p.size })), true);
    }
    const beams = this._beams; beams.clear();
    for (const hole of CURTAIN_HOLES) {
      const hx = hole.x + shift;
      if (hx < 0.04 || hx > 0.96) continue;
      const sx = w.x + hx * w.w, sy = w.y + hole.y * w.h;
      const tx = p.x + hx * p.size, ty = p.y + hole.y * p.size;
      beams.fillStyle(0xc9ddfc, 0.05);
      beams.fillPoints([{ x: sx - w.w * 0.014, y: sy }, { x: sx + w.w * 0.014, y: sy },
        { x: tx + p.size * 0.032, y: ty }, { x: tx - p.size * 0.032, y: ty }], true);
    }
    const rings = this._rings; rings.clear(); rings.lineStyle(1.2, 0x79818b, 0.7);
    for (let i = 0; i < 18; i++) {
      const x = this._cloth.x + (i + 0.4) * this._art.clothWidth / 18;
      if (x > 0 && x < this._L.width) {
        rings.strokeEllipse(x, this._art.railY + 4, Math.max(3, w.w * 0.017), this._L.height * 0.029);
      }
    }
  }

  _teardown() {
    this._movableSparklesCleanup?.();
    this._movableSparklesCleanup = null;
    this._dragStart = null;
    this._light?.clearMask(); this._lightMask?.destroy(); this._maskShape?.destroy();
    this.tweens.killAll();
    for (const child of this.children.list.slice()) child.destroy();
    releaseTextures(this.textures, CURTAIN_ART);
    this._L = null; this._light = null; this._lightMask = null; this._maskShape = null;
  }

  shutdown() { this._releaseKeys?.(); this._teardown(); }
}
