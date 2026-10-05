import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel, uiScale } from '../../shared/levelLabel.js';
import { makeCanvas, addCanvasTexture, releaseTextures, soft, grain, vignette, lcg } from '../../shared/paint.js';
import { FRAGMENT_TEXT, GENOME_FRAGMENT, genomeLayout } from './puzzle.js';

const ART = ['gn_monitor'];
const MONO = '"Courier New", monospace';

export default class GenomeScene extends BasePuzzleScene {
  constructor() { super({ key: 'Genome' }); }

  create() {
    this.beginScene();
    this._elapsed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
  }

  _build(W, H) {
    const L = (this._L = genomeLayout(W, H)), s = L.screen, f = L.fragment;
    const k = uiScale(W, H);
    const canvas = makeCanvas(W * 1.5, H * 1.5), ctx = canvas.getContext('2d');
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#091215'; ctx.fillRect(0, 0, W, H);
    soft(ctx, W * 0.6, H * 0.8, W * 0.6, H * 0.65, '40,93,103', 0.24);
    const bezel = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
    bezel.addColorStop(0, '#38474b'); bezel.addColorStop(0.1, '#1c2c30'); bezel.addColorStop(1, '#101c21');
    ctx.fillStyle = bezel; ctx.beginPath(); ctx.roundRect(s.x - 15 * k, s.y - 20 * k, s.w + 30 * k, s.h + 40 * k, 18 * k); ctx.fill();
    ctx.strokeStyle = '#4e6469'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#081619'; ctx.beginPath(); ctx.roundRect(s.x, s.y, s.w, s.h, 8 * k); ctx.fill();
    soft(ctx, W * 0.52, H * 0.48, s.w * 0.5, s.h * 0.75, '28,102,100', 0.12);
    ctx.strokeStyle = 'rgba(157,221,210,0.04)'; ctx.lineWidth = 0.7;
    for (let x = s.x + 8; x < s.x + s.w; x += 22 * k) {
      ctx.beginPath(); ctx.moveTo(x, s.y + 8); ctx.lineTo(x, s.y + s.h - 8); ctx.stroke();
    }
    for (let y = s.y + 8; y < s.y + s.h; y += 22 * k) {
      ctx.beginPath(); ctx.moveTo(s.x + 8, y); ctx.lineTo(s.x + s.w - 8, y); ctx.stroke();
    }
    grain(ctx, W, H, 0.045); vignette(ctx, W, H, 0.42);
    addCanvasTexture(this.textures, ART[0], canvas);
    this.add.image(0, 0, ART[0]).setOrigin(0).setDisplaySize(W, H).setDepth(-10);
    const text = (x, y, value, size, color = '#a4cec8') => this.add.text(x, y, value, {
      fontFamily: MONO, fontSize: size + 'px', color,
    }).setResolution(2);
    text(s.x + s.w * 0.035, s.y + s.h * 0.045, 'MOLECULAR ARCHIVE  /  DNA', Math.min(16, s.h * 0.065), '#a4bbb9');
    const power = this.add.graphics();
    power.fillStyle(0x95d8bd, 0.75); power.fillCircle(s.x + s.w * 0.952, s.y + s.h * 0.066, Math.max(1.5, 2.5 * k));
    this._helix = this.add.graphics().setDepth(-5);
    const random = lcg(3030), font = Math.min(16, Math.max(10, s.w / 66));
    const length = Math.max(20, Math.floor(s.w * 0.92 / (font * 0.61)));
    this._streams = [0.17, 0.25, 0.69, 0.79].map((y, i) => {
      const sequence = Array.from({ length: length + 64 }, () => 'ACGT'[Math.floor(random() * 4)]).join('');
      return { sequence, length, offset: i * 9,
        text: text(s.x + s.w * 0.04, s.y + s.h * y, '', font, '#729b98').setAlpha(0.32).setDepth(-3) };
    });
    const selected = this.add.graphics().setDepth(-1);
    selected.fillStyle(0x0a2328, 0.97); selected.fillRect(f.x, f.y, f.w, f.h);
    selected.lineStyle(1, 0x8ac4be, 0.55); selected.strokeRect(f.x, f.y, f.w, f.h);
    const corner = Math.min(13 * k, f.h * 0.25);
    selected.lineStyle(2, 0xcce9de, 0.85);
    for (const [x, y, dx, dy] of [[f.x, f.y, 1, 1], [f.x + f.w, f.y, -1, 1],
      [f.x, f.y + f.h, 1, -1], [f.x + f.w, f.y + f.h, -1, -1]]) {
      selected.lineBetween(x, y, x + dx * corner, y); selected.lineBetween(x, y, x, y + dy * corner);
    }
    text(f.x, f.y - Math.max(12, s.h * 0.055), "CODING STRAND  5' -> 3'  /  STANDARD CODE", Math.min(12, s.w / 45, s.h * 0.058), '#8bb8b5');
    this._fragmentText = text(f.x + f.w / 2, f.y + f.h * 0.47, FRAGMENT_TEXT, L.font, '#e0f0df')
      .setOrigin(0.5).setDepth(1).setShadow(0, 0, '#89d2bc', 7, false, true);
    this._reader = this.add.graphics();
    this._clue = text(s.x + s.w / 2, s.y + s.h * 0.92,
      'The building blocks of life spell the answer.', Math.max(9, Math.min(18, s.w / 32, s.h * 0.065)), '#b4c7bf').setOrigin(0.5);
    this._lastFeed = -1;
    this.levelText = drawLevelLabel(this, W, H, { color: '#a7c2bf' });
    this._render();
  }

  update(_time, delta) {
    if (!this._L) return;
    if (this.ambientMotion) this._elapsed += Math.min(delta || 16, 100);
    this._render();
  }

  _render() {
    const { screen: s, fragment: f } = this._L;
    const stamp = Math.floor(this._elapsed / 420);
    if (stamp !== this._lastFeed) {
      for (const stream of this._streams) {
        const offset = (stamp + stream.offset) % 64;
        stream.text.setText(stream.sequence.slice(offset, offset + stream.length));
      }
      this._lastFeed = stamp;
    }
    const helix = this._helix; helix.clear();
    const steps = 30, cy = s.y + s.h * 0.755, amplitude = s.h * 0.085;
    const upper = [], lower = [];
    for (let i = 0; i <= steps; i++) {
      const x = s.x + s.w * (0.06 + i / steps * 0.88);
      const phase = i * 0.44 + this._elapsed * 0.00012;
      const y = Math.sin(phase) * amplitude;
      upper.push({ x, y: cy + y }); lower.push({ x, y: cy - y });
      helix.lineStyle(0.8, 0x77b7b7, 0.13); helix.lineBetween(x, cy + y, x, cy - y);
      helix.fillStyle(0xb1d8c4, 0.15 + 0.10 * Math.cos(phase) ** 2);
      helix.fillCircle(x, cy + y, 1.6); helix.fillCircle(x, cy - y, 1.6);
    }
    helix.lineStyle(1.1, 0x82bfb3, 0.25); helix.strokePoints(upper, false); helix.strokePoints(lower, false);
    this._reader.clear();
    const index = Math.floor(this._elapsed / 1900) % GENOME_FRAGMENT.length;
    const charWidth = this._fragmentText.width / FRAGMENT_TEXT.length;
    const startX = this._fragmentText.x - this._fragmentText.width / 2 + index * 6 * charWidth;
    this._reader.lineStyle(1.4, 0xbee1d1, 0.5);
    this._reader.lineBetween(startX, f.y + f.h * 0.78, startX + charWidth * 3, f.y + f.h * 0.78);
  }

  _teardown() {
    this.tweens.killAll();
    for (const child of this.children.list.slice()) child.destroy();
    releaseTextures(this.textures, ART);
    this._L = null; this._streams = []; this._fragmentText = null; this._helix = null; this._reader = null;
  }

  shutdown() { this._teardown(); }
}
