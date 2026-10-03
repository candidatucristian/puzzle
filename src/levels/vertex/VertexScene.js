import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel, uiScale } from "../../shared/levelLabel.js";
import { VERTEX_NODES, VERTEX_EDGES, VERTEX_MARKED, vertexLayout } from "./puzzle.js";

export default class VertexScene extends BasePuzzleScene {
  constructor() { super({ key: "Vertex" }); }

  create() {
    this.beginScene();
    this._elapsed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
  }

  _build(W, H) {
    const L = (this._L = vertexLayout(W, H));
    const k = uiScale(W, H);
    this.add.rectangle(0, 0, W, H, 0x071221).setOrigin(0).setDepth(-10);
    const paper = this.add.graphics().setDepth(-9);
    // White construction lines on blue-black drafting paper.
    const spacing = Math.max(20, L.w / 32);
    paper.lineStyle(0.6, 0xffffff, 0.026);
    for (let x = W / 2 % spacing; x < W; x += spacing) paper.lineBetween(x, 0, x, H);
    for (let y = H / 2 % spacing; y < H; y += spacing) paper.lineBetween(0, y, W, y);
    const margin = 26 * k;
    paper.lineStyle(0.8, 0xffffff, 0.19);
    for (const [x, y, dx, dy] of [[margin, margin, 1, 1], [W - margin, margin, -1, 1],
      [margin, H - margin, 1, -1], [W - margin, H - margin, -1, -1]]) {
      paper.lineBetween(x, y, x + dx * 18 * k, y);
      paper.lineBetween(x, y, x, y + dy * 18 * k);
    }
    const point = node => ({ x: L.x + node.x * L.w, y: L.y + node.y * L.h });
    this._points = VERTEX_NODES.map(point);
    const wire = this.add.graphics().setDepth(-5);
    for (const [i, [a, b]] of VERTEX_EDGES.entries()) {
      const p = this._points[a], q = this._points[b];
      const marked = VERTEX_MARKED.includes(a) || VERTEX_MARKED.includes(b);
      wire.lineStyle(Math.max(0.8, k), 0xffffff, marked ? 0.66 : 0.22 + (i % 5) * 0.055);
      wire.lineBetween(p.x, p.y, q.x, q.y);
    }
    for (const node of VERTEX_NODES) {
      if (VERTEX_MARKED.includes(node.id)) continue;
      const p = this._points[node.id];
      wire.fillStyle(0xffffff, 0.55); wire.fillCircle(p.x, p.y, Math.max(1, 1.4 * k));
    }
    // These are actual endpoints, not additional lines or spokes; their
    // quiet halos identify which four degrees the player needs to count.
    this._pulses = this.add.graphics().setDepth(1);
    this.add.text(margin + 4 * k, H - 42 * k, "Degree of connection", {
      fontFamily: '"Special Elite", monospace', fontSize: Math.round(18 * k) + "px", color: "#c2cbd6",
    }).setAlpha(0.76);
    this.add.text(margin + 4 * k, 40 * k, "GEOMETRIC STUDY", {
      fontFamily: '"Special Elite", monospace', fontSize: Math.round(11 * k) + "px", color: "#aeb9c8", letterSpacing: 3,
    }).setAlpha(0.42);
    this.levelText = drawLevelLabel(this, W, H, { color: "#c0c9d6" });
    this._render();
  }

  update(_time, delta) {
    if (!this._L) return;
    this._elapsed += Math.min(delta || 16, 100);
    this._render();
  }

  _render() {
    const g = this._pulses;
    const k = uiScale(this._L.width, this._L.height);
    g.clear();
    VERTEX_MARKED.forEach((id, index) => {
      const p = this._points[id];
      const phase = ((this._elapsed - index * 1450) % 7200 + 7200) % 7200;
      const light = phase < 1700 ? Math.sin(phase / 1700 * Math.PI) ** 2 : 0;
      g.fillStyle(0xffffff, 0.025 + light * 0.045); g.fillCircle(p.x, p.y, (12 + light * 5) * k);
      g.lineStyle(1, 0xffffff, 0.28 + light * 0.36); g.strokeCircle(p.x, p.y, (5.5 + light * 2) * k);
      // A dark backing keeps all the incident ends distinguishable at Inspect zoom.
      g.fillStyle(0x071221, 1); g.fillCircle(p.x, p.y, 3.5 * k);
      g.fillStyle(0xffffff, 0.64 + light * 0.36); g.fillCircle(p.x, p.y, 2 * k);
    });
  }

  _teardown() {
    this.tweens.killAll();
    for (const object of this.children.list.slice()) object.destroy();
    this._L = null; this._points = []; this._pulses = null;
  }

  shutdown() { this._teardown(); }
}
