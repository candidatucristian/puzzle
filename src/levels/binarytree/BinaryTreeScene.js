import {  } from "../../shared/puzzleSounds.js";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { PENCIL } from "../../shared/theme.js";
import { BINARY_PATHS as BT_CODES, BINARY_LEAVES as BT_LEAVES } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "BINARY TREE"  ·  code: CABBAGE   ·  fork, then read
//
// Drawn in the game's pencil-sketch idiom: a tree of 8 lettered leaves
// (shuffled — NOT alphabetical) reached from START by three forks each.
// A note pinned above the tree lists seven paths:
//
//   RLR  LRL  LLL  LLL  LRL  LLR  LRR
//
// Nothing in the scene explains the notation and nothing is interactive —
// the player must realise on their own that each letter picks a branch
// (L = left, R = right) and walk the tree by eye. Leaf order, root-first,
// L=0/R=1:  B G A E D C H F
//
//   RLR→C · LRL→A · LLL→B · LLL→B · LRL→A · LLR→G · LRR→E   →   CABBAGE
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, with lifecycle provided by BasePuzzleScene.
// ─────────────────────────────────────────────────────────────────────────────

const BT_SKETCH = PENCIL; // the pencil itself

export default class BinaryTreeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "BinaryTree" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this.input.mouse.disableContextMenu();

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = 14;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.6;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const treeX0 = W * 0.1;
    const treeX1 = W * 0.9;
    const treeW = treeX1 - treeX0;
    const depthY = [H * 0.27, H * 0.44, H * 0.6, H * 0.77];

    // node[depth][index] = {x,y}
    this._nodes = [];
    for (let d = 0; d < 4; d++) {
      const count = Math.pow(2, d);
      const row = [];
      for (let i = 0; i < count; i++) {
        row.push({ x: treeX0 + (treeW * (i + 0.5)) / count, y: depthY[d] });
      }
      this._nodes.push(row);
    }

    this._drawRoom(W, H);
    this._drawEdges();
    this._drawNodes();
    this._drawNote(W, depthY[0]);
    this._drawTexts(W, H);
    this._makeChips(W, depthY[0]);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  // the sketched wall the tree is pinned to
  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(7171);
    const floorY = H * 0.9;
    const cwx1 = W * 0.09;
    const cwx2 = W * 0.91;
    this._pencilSeg(g, rnd, cwx1, H * 0.06, cwx1, floorY, 1, BT_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, cwx2, H * 0.06, cwx2, floorY, 1, BT_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, 0, H * 0.035, cwx1, H * 0.06, 1, BT_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, W, H * 0.035, cwx2, H * 0.06, 1, BT_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, 0, H * 0.995, cwx1 * 1.6, floorY, 1, BT_SKETCH, 0.09, 2);
    this._pencilSeg(g, rnd, W, H * 0.995, W - cwx1 * 1.6, floorY, 1, BT_SKETCH, 0.09, 2);
    this._pencilSeg(g, rnd, 0, floorY, W, floorY, 1.4, BT_SKETCH, 0.2, 2);
    for (let i = 0; i < 3; i++) {
      const y = floorY + 20 + i * ((H - floorY) / 3.4);
      this._pencilSeg(g, rnd, W * 0.04, y, W * 0.96, y + (rnd() - 0.5) * 6, 1, BT_SKETCH, 0.05, 2.4);
    }
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.9;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 30, y + (rnd() - 0.5) * 10, 1, BT_SKETCH, 0.04, 1.6);
    }
  }

  // straight-lined edges between forks, shortened to clear the node marks
  _drawEdges() {
    const g = this.add.graphics().setDepth(-4);
    const rnd = this._rng(2233);
    const radiusAt = [22, 8, 8, 15];
    for (let d = 0; d < 3; d++) {
      for (let p = 0; p < this._nodes[d].length; p++) {
        const a = this._nodes[d][p];
        for (const ci of [2 * p, 2 * p + 1]) {
          const b = this._nodes[d + 1][ci];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const ra = radiusAt[d];
          const rb = radiusAt[d + 1];
          this._pencilSeg(
            g,
            rnd,
            a.x + ux * ra,
            a.y + uy * ra,
            b.x - ux * rb,
            b.y - uy * rb,
            1.3,
            BT_SKETCH,
            0.32,
            1.6,
          );
        }
      }
    }
    this._edgeGfx = g;
  }

  _drawNodes() {
    const g = this.add.graphics().setDepth(-3);
    // root — a pinned tag reading START
    const root = this._nodes[0][0];
    const rndR = this._rng(9001);
    this._pencilRect(g, rndR, root.x - 44, root.y - 16, 88, 32, 1.4, BT_SKETCH, 0.55, 1.6);
    this.add
      .text(root.x, root.y, "START", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "14px",
        color: "#e8dcc0",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(-2);

    // forks at depth 1 and 2 — plain unlabeled knots
    const rndF = this._rng(4501);
    for (let d = 1; d <= 2; d++) {
      for (const n of this._nodes[d]) {
        this._pencilCircle(g, rndF, n.x, n.y, 6, 1.2, BT_SKETCH, 0.5);
      }
    }

    // leaves — round tags, letters deliberately out of alphabetical order
    this._leafLabels = [];
    const rndL = this._rng(6601);
    for (let i = 0; i < 8; i++) {
      const n = this._nodes[3][i];
      this._pencilCircle(g, rndL, n.x, n.y, 15, 1.3, BT_SKETCH, 0.6);
      const letter = BT_LEAVES[i];
      const t = this.add
        .text(n.x, n.y, letter, {
          fontFamily: '"Special Elite", monospace',
          fontSize: "17px",
          color: "#c9bfa4",
        })
        .setOrigin(0.5)
        .setDepth(-2);
      this._leafLabels.push(t);
    }
    this._nodeGfx = g;
  }

  // the pinned note above START, listing the seven paths
  _drawNote(W, rootY) {
    const nw = Math.min(W * 0.56, 660);
    const nh = 58;
    const nx = W / 2 - nw / 2;
    const ny = rootY - 120;
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(3311);

    this._pencilRect(g, rnd, nx, ny, nw, nh, 1.3, BT_SKETCH, 0.42, 2);
    g.fillStyle(BT_SKETCH, 0.5);
    g.fillCircle(nx + 10, ny + 9, 1.8);
    g.fillCircle(nx + nw - 10, ny + 9, 1.8);

    this._noteRect = { x: nx, y: ny, w: nw, h: nh };
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "EVERY FORK REMEMBERS.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level " + (this.services.levels.definitions.findIndex((l) => l.key === this.scene.key) + 1), {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── the seven written paths — just ink on the note, nothing to click ───────

  _makeChips(W, rootY) {
    this._chips = [];
    const r = this._noteRect;
    const cx0 = r.x;
    const cw = r.w / BT_CODES.length;
    for (let i = 0; i < BT_CODES.length; i++) {
      const cx = cx0 + cw * (i + 0.5);
      const cy = r.y + r.h / 2;
      const t = this.add
        .text(cx, cy, BT_CODES[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: "18px",
          color: "#c9bfa4",
          letterSpacing: 2,
        })
        .setOrigin(0.5)
        .setDepth(-2);
      this._chips.push(t);
    }
  }

  _spawnDust(W, H) {
    const rnd = this._rng(8801);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.08 + rnd() * W * 0.84;
      const dy = H * 0.1 + rnd() * H * 0.6;
      const dot = this.add
        .circle(dx, dy, 0.7 + rnd() * 1, 0xffffff, 0.08 + rnd() * 0.1)
        .setDepth(-2);
      this.tweens.add({
        targets: dot,
        x: dx + (rnd() * 44 - 22),
        y: dy + 24 + rnd() * 40,
        alpha: 0,
        duration: 8000 + rnd() * 8000,
        delay: rnd() * 5000,
        repeat: -1,
        onRepeat: () => {
          dot.x = W * 0.08 + rnd() * W * 0.84;
          dot.y = H * 0.1 + rnd() * H * 0.5;
          dot.setAlpha(0.08 + rnd() * 0.1);
        },
      });
    }
  }

  // ── sounds ─────────────────────────────────────────────────────────────────



  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._chips = [];
    this._leafLabels = [];
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
