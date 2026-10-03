import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel } from '../../shared/levelLabel.js';
import { releaseTextures } from '../../shared/paint.js';
import { sillLayout } from './puzzle.js';
import { SILL_ART, paintSill } from './sill.js';

export default class TheSillScene extends BasePuzzleScene {
  constructor() { super({ key: 'TheSill' }); }

  create() {
    this.beginScene(); this._build(this.scale.width, this.scale.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
  }

  _build(W, H) {
    this._L = sillLayout(W, H); paintSill(this.textures, this._L);
    this.add.image(0, 0, SILL_ART.room).setOrigin(0).setDisplaySize(W, H);
    this._clue = this.add.text(W / 2, H * 0.963, 'Read the light, not the dark.', {
      fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: Math.max(10, Math.min(16, H * 0.024)) + 'px', color: '#aebcca',
    }).setOrigin(0.5);
    this.levelText = drawLevelLabel(this, W, H, { color: '#aebcca' });
  }

  _teardown() {
    this.tweens.killAll();
    for (const child of this.children.list.slice()) child.destroy();
    releaseTextures(this.textures, SILL_ART); this._L = null;
  }

  shutdown() { this._teardown(); }
}
