import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel, uiScale } from '../../shared/levelLabel.js';
import { makeCanvas, addCanvasTexture, releaseTextures, soft, grain, vignette } from '../../shared/paint.js';
import { PLOTTER_BLOCKS, formatPath, plotterLayout } from './puzzle.js';

const ART = ['pl_terminal'];
const MONO = '"Courier New", monospace';

export default class PlotterScene extends BasePuzzleScene {
  constructor() { super({ key: 'Plotter' }); }

  create() {
    this.beginScene();
    this._elapsed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
  }

  _build(W, H) {
    const L = (this._L = plotterLayout(W, H)), s = L.screen;
    const k = uiScale(W, H);
    const canvas = makeCanvas(W * 1.5, H * 1.5), ctx = canvas.getContext('2d');
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#080b09'; ctx.fillRect(0, 0, W, H);
    soft(ctx, W * 0.5, H * 0.48, W * 0.6, H * 0.6, '68,97,64', 0.16);
    // Recessed glass, a worn charcoal case and tiny bezel screws.
    ctx.fillStyle = '#242a23'; ctx.beginPath();
    ctx.roundRect(s.x - 18 * k, s.y - 22 * k, s.w + 36 * k, s.h + 44 * k, 26 * k); ctx.fill();
    ctx.strokeStyle = '#42483b'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#080f0b'; ctx.beginPath(); ctx.roundRect(s.x, s.y, s.w, s.h, 17 * k); ctx.fill();
    soft(ctx, W * 0.5, H * 0.46, s.w * 0.62, s.h * 0.8, '32,112,61', 0.19);
    ctx.strokeStyle = 'rgba(116,151,109,0.2)'; ctx.lineWidth = 2; ctx.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
    for (let y = s.y + 3; y < s.y + s.h - 2; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(s.x + 3, y, s.w - 6, 1);
    }
    for (const x of [s.x - 9 * k, s.x + s.w + 9 * k]) for (const y of [s.y - 12 * k, s.y + s.h + 12 * k]) {
      ctx.fillStyle = '#111710'; ctx.beginPath(); ctx.arc(x, y, 2.5 * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#747a63'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - k, y); ctx.lineTo(x + k, y); ctx.stroke();
    }
    grain(ctx, W, H, 0.055); vignette(ctx, W, H, 0.42);
    addCanvasTexture(this.textures, ART[0], canvas);
    this.add.image(0, 0, ART[0]).setOrigin(0).setDisplaySize(W, H).setDepth(-10);
    const pad = Math.min(28, s.w * 0.04);
    const text = (x, y, value, size, alpha = 1) => this.add.text(x, y, value, {
      fontFamily: MONO, fontSize: size + 'px', color: '#a7dca3',
      shadow: { color: '#54c478', blur: 5, fill: true },
    }).setResolution(2).setAlpha(alpha);
    text(s.x + pad, s.y + s.h * 0.045, 'VECTOR TERMINAL  /  04 PATHS', Math.min(15, s.h * 0.055), 0.64);
    this._codeTexts = [];
    for (const [i, block] of L.blocks.entries()) {
      text(block.x, block.y, `BLOCK ${i + 1}`, L.font * 0.77, 0.6);
      const code = text(block.x, block.y + L.font * 1.25, formatPath(PLOTTER_BLOCKS[i], L.perLine), L.font);
      code.setLineSpacing(L.font * 0.25);
      this._codeTexts.push(code);
      const rules = this.add.graphics();
      rules.lineStyle(0.7, 0x8bc189, 0.12);
      rules.lineBetween(block.x, block.y + block.h - 10, block.x + block.w - 20, block.y + block.h - 10);
    }
    const hintSize = Math.max(10, Math.min(18, s.w / 40, s.h * 0.055));
    const guideSize = Math.max(9, Math.min(11, s.w / 50));
    const guideY = s.y + s.h - 8 * k - guideSize * 1.3;
    this._clue = text(s.x + pad, guideY - hintSize * 1.35 - 5 * k, 'Become the machine. Trace the path.', hintSize, 0.93);
    text(s.x + pad, guideY, 'X RIGHT   /   Y UP   /   RESET AT EACH BLOCK', guideSize, 0.57);
    this._scan = this.add.graphics().setDepth(-2);
    this.levelText = drawLevelLabel(this, W, H, { color: '#96ae8d' });
    this._render();
  }

  update(_time, delta) {
    if (!this._L) return;
    if (this.ambientMotion) this._elapsed += Math.min(delta || 16, 100);
    this._render();
  }

  _render() {
    this._scan.clear();
    if (!this.ambientMotion) return;
    const s = this._L.screen;
    const y = s.y + 4 + (this._elapsed * 0.018) % (s.h - 12);
    this._scan.fillStyle(0xa3d79c, 0.025); this._scan.fillRect(s.x + 4, y, s.w - 8, 6);
  }

  _teardown() {
    this.tweens.killAll();
    for (const child of this.children.list.slice()) child.destroy();
    releaseTextures(this.textures, ART);
    this._L = null; this._codeTexts = []; this._scan = null;
  }

  shutdown() { this._teardown(); }
}
