import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel, uiScale } from '../../shared/levelLabel.js';
import { makeCanvas, addCanvasTexture, releaseTextures, soft, grain, vignette } from '../../shared/paint.js';
import { kineticLayout, kineticPose, polygonVertices } from './puzzle.js';

const ART = ['ki_gallery'];

export default class KineticScene extends BasePuzzleScene {
  constructor() { super({ key: 'Kinetic' }); }

  create() {
    this.beginScene();
    this._elapsed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
  }

  _build(W, H) {
    const L = (this._L = kineticLayout(W, H)), k = uiScale(W, H);
    const canvas = makeCanvas(W * 1.5, H * 1.5), ctx = canvas.getContext('2d');
    ctx.scale(1.5, 1.5);
    const wall = ctx.createLinearGradient(0, 0, W, H);
    wall.addColorStop(0, '#bab5aa'); wall.addColorStop(0.45, '#d4cec2'); wall.addColorStop(1, '#a7a397');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
    soft(ctx, W * 0.34, H * 0.25, W * 0.53, H * 0.85, '255,247,221', 0.36, 'screen');
    soft(ctx, W * 0.58, H * 0.93, L.size * 0.26, L.size * 0.035, '49,42,34', 0.13);
    grain(ctx, W, H, 0.045); vignette(ctx, W, H, 0.12);
    addCanvasTexture(this.textures, ART[0], canvas);
    this.add.image(0, 0, ART[0]).setOrigin(0).setDisplaySize(W, H).setDepth(-10);
    this._shadows = this.add.graphics().setDepth(-5);
    this._rods = this.add.graphics().setDepth(-2);
    this._faces = this.add.graphics();
    const label = this.add.graphics();
    const labelH = Math.max(30, H * 0.085);
    const x = Math.min(W * 0.05, 36), y = H - labelH - 8 * k;
    const labelW = Math.min(W * 0.69, 395 * k);
    label.fillStyle(0xede7d9, 0.63); label.fillRect(x, y, labelW, labelH);
    label.lineStyle(0.8, 0x6c6456, 0.34); label.lineBetween(x, y, x + labelW, y);
    this._clue = this.add.text(x + 8 * k, y + 5 * k, 'ONE UNBROKEN CURVE COUNTS AS ONE', {
      fontFamily: '"Courier New", monospace', fontSize: Math.min(12, labelW / 21, labelH * 0.34) + 'px', color: '#403c35',
    }).setResolution(2);
    this.add.text(x + 8 * k, y + labelH * 0.56, 'A study of boundaries. Read from above.', {
      fontFamily: 'Georgia, serif', fontSize: Math.min(12, labelW / 22, labelH * 0.30) + 'px', color: '#625b4e',
    }).setResolution(2);
    this.levelText = drawLevelLabel(this, W, H, { color: '#5b554b' });
    this._render();
  }

  update(_time, delta) {
    if (!this._L) return;
    if (this.ambientMotion) this._elapsed += Math.min(delta || 16, 100);
    this._render();
  }

  _render() {
    const L = this._L, S = L.size, k = uiScale(L.width, L.height);
    const pose = kineticPose(this._elapsed);
    this._forms = pose.map(form => {
      const x = L.x + form.x * S, y = L.y + form.y * S, r = form.radius * S;
      const points = polygonVertices(form.sides, r, form.angle).map(p => ({ x: x + p.x, y: y + p.y }));
      const top = form.sides ? points.reduce((a, p) => p.y < a.y ? p : a) : { x, y: y - r };
      return { ...form, x, y, r, points, top };
    });
    const [triangle, circle, heptagon, pentagon] = this._forms;
    const shift = Math.sin(this._elapsed * 0.00009) * S * 0.008;
    const a = { x: triangle.top.x, y: L.y + S * 0.10 };
    const b = { x: L.x + S * 0.11 + shift, y: L.y + S * 0.12 };
    const c = { x: L.x - S * 0.13 + shift, y: L.y + S * 0.32 };
    const d = { x: circle.top.x, y: L.y + S * 0.30 };
    const e = { x: heptagon.top.x, y: L.y + S * 0.51 };
    const f = { x: pentagon.top.x, y: L.y + S * 0.53 };
    const onBar = (x, p, q) => ({ x, y: p.y + (q.y - p.y) * (x - p.x) / (q.x - p.x) });
    const root = onBar(L.x - S * 0.025, a, b), second = onBar(b.x, c, d), third = onBar(c.x, e, f);
    const rods = this._rods; rods.clear();
    const segment = (p, q, width, alpha) => {
      rods.lineStyle(width, 0x393b38, alpha); rods.lineBetween(p.x, p.y, q.x, q.y);
    };
    segment({ x: root.x, y: 0 }, root, Math.max(0.8, k), 0.8);
    for (const [p, q] of [[a, b], [c, d], [e, f]]) segment(p, q, Math.max(1.5, S * 0.003), 0.95);
    for (const [p, q] of [[b, second], [c, third], [a, triangle.top], [d, circle.top], [e, heptagon.top], [f, pentagon.top]]) segment(p, q, Math.max(0.6, k * 0.85), 0.78);
    for (const p of [root, second, third]) {
      rods.lineStyle(1, 0x343932, 0.9); rods.strokeCircle(p.x, p.y, 2.2 * k);
    }
    const shadows = this._shadows, faces = this._faces; shadows.clear(); faces.clear();
    for (const form of this._forms) {
      shadows.fillStyle(0x413b30, 0.075);
      if (form.sides) shadows.fillPoints(form.points.map(p => ({ x: p.x + S * 0.07, y: p.y + S * 0.035 })), true);
      else shadows.fillCircle(form.x + S * 0.07, form.y + S * 0.035, form.r);
      faces.fillStyle(form.color, 1);
      faces.lineStyle(Math.max(0.8, k), 0x39392e, 0.8);
      if (form.sides) { faces.fillPoints(form.points, true); faces.strokePoints(form.points, true); }
      else { faces.fillCircle(form.x, form.y, form.r); faces.strokeCircle(form.x, form.y, form.r); }
      // A rim glint leaves each sheet flat and its silhouette unambiguous.
      faces.lineStyle(Math.max(0.8, k), form.light, 0.8);
      if (form.sides) {
        for (const [i, p] of form.points.entries()) {
          const q = form.points[(i + 1) % form.points.length];
          if ((p.y + q.y) / 2 < form.y - form.r * 0.2) faces.lineBetween(p.x, p.y, q.x, q.y);
        }
      } else {
        faces.beginPath(); faces.arc(form.x, form.y, form.r - 0.6, Math.PI * 1.08, Math.PI * 1.8); faces.strokePath();
      }
      // A tiny rivet attaches each suspended sheet to its actual upper rim.
      faces.fillStyle(0xd8d0b8, 0.85); faces.fillCircle(form.top.x, form.top.y + 2 * k, 1.25 * k);
    }
  }

  _teardown() {
    this.tweens.killAll();
    for (const child of this.children.list.slice()) child.destroy();
    releaseTextures(this.textures, ART);
    this._L = null; this._forms = []; this._faces = null; this._shadows = null; this._rods = null;
  }

  shutdown() { this._teardown(); }
}
