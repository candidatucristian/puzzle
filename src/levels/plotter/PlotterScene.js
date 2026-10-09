import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel, uiScale } from '../../shared/levelLabel.js';
import { makeCanvas, addCanvasTexture, releaseTextures, soft, grain, vignette } from '../../shared/paint.js';
import { PLOTTER_BLOCKS, formatPath, plotterLayout } from './puzzle.js';
import { deskLayout, paintDesk } from './desk.js';

const ART = ['pl_terminal'];
const MONO = '"Courier New", monospace';

/** Plotter — an engineer's desk at night: a graphic display terminal showing
 * four blocks of coordinates, and beside it the pen plotter they are meant
 * for, its arm idling over a clean sheet. It never draws them for you. */

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
    this._D = L.roomy ? deskLayout(W, H, s) : null;
    if (this._D) paintDesk(ctx, this._D);
    else this._paintTube(ctx, W, H, s, k);
    addCanvasTexture(this.textures, ART[0], canvas);
    this.add.image(0, 0, ART[0]).setOrigin(0).setDisplaySize(W, H).setDepth(-10);
    this._arm = this.add.graphics().setDepth(-3);
    this._writeTube(L, s, k);
  }

  // on a small screen: only the tube, in its worn charcoal case
  _paintTube(ctx, W, H, s, k) {
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
  }

  // what the tube says: the four blocks, and how the machine reads them
  _writeTube(L, s, k) {
    const W = L.width, H = L.height;
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
    this._idle();
    if (!this.ambientMotion) return;
    const s = this._L.screen;
    const y = s.y + 4 + (this._elapsed * 0.018) % (s.h - 12);
    this._scan.fillStyle(0xa3d79c, 0.025); this._scan.fillRect(s.x + 4, y, s.w - 8, 6);
  }

  // the plotter's arm, waiting: it drifts a little along its rails over the
  // corner of the sheet and settles, pen up; its ready lamp beats
  _idle() {
    const D = this._D, g = this._arm;
    if (!D || !g) return;
    g.clear();
    const t = this._elapsed / 1000, u = D.u;
    const a = 0.1 + 0.035 * Math.sin(t * 0.31) + 0.012 * Math.sin(t * 1.7);
    const b = 0.78 + 0.05 * Math.sin(t * 0.23 + 1);
    const far = D.at(a, -0.04), near = D.at(a, 1.04), pen = D.at(a, b);
    // its shadow on the paper, then the arm, lifted clear of the sheet
    g.lineStyle(7 * u, 0x000000, 0.22); g.lineBetween(far.x - 5 * u, far.y + 7 * u, near.x - 7 * u, near.y + 9 * u);
    g.lineStyle(9 * u, 0x1c1e20, 1); g.lineBetween(far.x, far.y - 3 * u, near.x, near.y - 4 * u);
    g.lineStyle(3 * u, 0x8a9096, 1); g.lineBetween(far.x + u, far.y - 5 * u, near.x + u, near.y - 6 * u);
    for (const end of [far, near]) { g.fillStyle(0x2c2e30, 1); g.fillRect(end.x - 9 * u, end.y - 10 * u, 18 * u, 12 * u); }
    // the carriage and the pen in it
    g.fillStyle(0x000000, 0.25); g.fillRect(pen.x - 14 * u, pen.y - 2 * u, 22 * u, 14 * u);
    g.fillStyle(0x3a3e42, 1); g.fillRect(pen.x - 11 * u, pen.y - 15 * u, 22 * u, 20 * u);
    g.fillStyle(0x5a6066, 1); g.fillRect(pen.x - 11 * u, pen.y - 15 * u, 22 * u, 4 * u);
    g.fillStyle(0x14306a, 1); g.fillRect(pen.x - 3.5 * u, pen.y - 24 * u, 7 * u, 26 * u);
    g.fillStyle(0xd8dce0, 1); g.fillRect(pen.x - 1.2 * u, pen.y + 2 * u, 2.4 * u, 4 * u);
    const on = !this.ambientMotion || Math.sin(t * 2.2) > -0.3;
    g.fillStyle(0x6aff8a, on ? 1 : 0.15); g.fillCircle(D.led.x, D.led.y, 3 * u);
    if (on) { g.fillStyle(0x6aff8a, 0.16); g.fillCircle(D.led.x, D.led.y, 9 * u); }
  }

  _teardown() {
    this.tweens.killAll();
    for (const child of this.children.list.slice()) child.destroy();
    releaseTextures(this.textures, ART);
    this._L = null; this._D = null; this._codeTexts = []; this._scan = null; this._arm = null;
  }

  shutdown() { this._teardown(); }
}
