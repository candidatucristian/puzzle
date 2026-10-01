import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { paintRootBox, releaseRootBoxArt } from "./rootbox.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "BINARY TREE"  ·  code: CABBAGE   ·  fork, then read
//
// A root-view box on a shelf by a sunny window. Behind its glass front a
// seedling's root goes down through the soil and forks three times, to eight
// tips. The gardener has marked the glass in white grease pencil — START
// where the root begins, a letter under each tip (shuffled — NOT
// alphabetical) — and a strip of masking tape across the front of the box
// reads, in marker:
//
//   RLR  LRL  LLL  LLL  LRL  LLR  LRR
//
// Nothing in the scene explains the notation and nothing is interactive —
// the player must realise on their own that each letter picks a branch at a
// fork (L = left, R = right) and follow the root by eye. Tips, left to
// right, L=0/R=1:  B G A E D C H F
//
//   RLR→C · LRL→A · LLL→B · LLL→B · LRL→A · LLR→G · LRR→E   →   CABBAGE
//
// The room and the box are painted once per screen size (rootbox.js); what
// moves is driven from here: the shadows of leaves outside stirring in the
// patch of sun on the wall, dust turning in the light, now and then a drop
// running down the misted glass. Lifecycle provided by BasePuzzleScene.
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const art = (this._art = paintRootBox(this, W, H));
    this._L = art.L;
    this.add.image(0, 0, art.keys.wall).setOrigin(0, 0).setDepth(-20);
    this._makeDapple(art);
    this.add.image(0, 0, art.keys.box).setOrigin(0, 0).setDepth(-10);
    this._makeDrops();
    this._makeMotes(art);
    this.add.image(0, 0, art.keys.veil).setOrigin(0, 0).setDisplaySize(W, H).setDepth(18);
    this._drawTexts(W);
    this._built = true;
  }

  // the shadows of leaves outside the window, in the patch of sun on the
  // wall: masked to the patch, and behind the box, so only where the wall
  // shows
  _makeDapple(art) {
    const d = (this._dappleAt = art.dapple);
    this._dapple = this.add
      .image(d.x, d.y, art.keys.dapple)
      .setOrigin(0, 0)
      .setScale(d.scale)
      .setDepth(-19);
    const shape = (this._dappleShape = this.make.graphics({}, false));
    shape.fillStyle(0xffffff);
    shape.fillPoints(art.L.sun.map(([x, y]) => ({ x, y })), true);
    this._dapple.setMask(shape.createGeometryMask());
  }

  // dust turning in the sunlight on the left: specks that drift and wheel,
  // catching the light and losing it
  _makeMotes(art) {
    this._motes = [];
    for (let i = 0; i < 18; i++) {
      const img = this.add
        .image(0, 0, art.keys.mote)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-4)
        .setAlpha(0);
      const m = { img };
      this._respawnMote(m, Math.random());
      this._motes.push(m);
    }
  }

  _respawnMote(m, age = 0) {
    const { W, H, u } = this._L;
    m.x = W * (0.02 + Math.random() * 0.4);
    m.y = H * (0.03 + Math.random() * 0.45);
    m.vx = (Math.random() - 0.3) * 0.006 * u; // px a millisecond
    m.vy = (0.1 + Math.random() * 0.5) * 0.004 * u;
    m.ttl = 7000 + Math.random() * 9000;
    m.age = age * m.ttl;
    m.ph = Math.random() * 10;
    m.peak = 0.25 + Math.random() * 0.45;
    const s = (2 + Math.random() * 3.5) * u;
    m.img.setDisplaySize(s, s);
  }

  // now and then a drop gathers in the mist at the top of the glass and
  // runs a little way down
  _makeDrops() {
    this._drops = [];
    this._dropTimer = 3000 + Math.random() * 3000;
    this._trails = this.add.graphics().setDepth(-9.5);
  }

  _spawnDrop() {
    const { W, H, u, glass, top } = this._L;
    // clear of the stem and of START
    let x = W / 2;
    while (Math.abs(x - W / 2) < W * 0.16) x = glass.x0 + 20 + Math.random() * (glass.x1 - glass.x0 - 40);
    const s = u * (0.26 + Math.random() * 0.12);
    const img = this.add.image(x, 0, this._art.keys.drop).setDepth(-9).setScale(s).setAlpha(0);
    this._drops.push({
      img,
      x,
      y0: top + H * (0.035 + Math.random() * 0.04),
      fall: H * (0.03 + Math.random() * 0.06),
      width: Math.max(1, 5 * s),
      gather: 900,
      slide: 1400 + Math.random() * 1600,
      fade: 900,
      age: 0,
    });
  }

  _updateDrops(dt) {
    this._dropTimer -= dt;
    if (this._dropTimer <= 0) {
      this._spawnDrop();
      this._dropTimer = 7000 + Math.random() * 7000;
    }
    const g = this._trails;
    g.clear();
    for (const d of this._drops.slice()) {
      d.age += dt;
      let y = d.y0;
      let a = 1;
      if (d.age < d.gather) a = d.age / d.gather;
      else if (d.age < d.gather + d.slide) {
        const p = (d.age - d.gather) / d.slide;
        y = d.y0 + d.fall * p * p;
      } else {
        y = d.y0 + d.fall;
        a = 1 - (d.age - d.gather - d.slide) / d.fade;
      }
      if (a <= 0) {
        d.img.destroy();
        this._drops.splice(this._drops.indexOf(d), 1);
        continue;
      }
      d.img.setPosition(d.x, y).setAlpha(a);
      // the wet track it leaves, catching a little of the window
      if (y > d.y0 + 1) {
        g.lineStyle(d.width, 0xfff4e4, 0.08 * a);
        g.lineBetween(d.x, d.y0, d.x, y - 10 * d.img.scaleY);
      }
    }
  }

  _drawTexts(W) {
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

  // ── what moves ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._built) return;
    for (const m of this._motes) m.img.setVisible(this.ambientMotion);
    if (!this.ambientMotion) return;
    const t = time / 1000;
    const dt = Math.min(delta || 16, 100);
    const u = this._L.u;

    // a breeze outside: the leaves' shadows stir
    const d = this._dappleAt;
    this._dapple.x = d.x + u * (7 * Math.sin(t * 0.43) + 3 * Math.sin(t * 1.27 + 1.1) + 1.2 * Math.sin(t * 2.9));
    this._dapple.y = d.y + u * (3 * Math.sin(t * 0.61 + 2) + 1.2 * Math.sin(t * 1.9));

    for (const m of this._motes) {
      m.age += dt;
      if (m.age >= m.ttl) this._respawnMote(m);
      m.x += (m.vx + Math.sin(t * 0.7 + m.ph) * 0.004 * u) * dt;
      m.y += (m.vy + Math.cos(t * 0.5 + m.ph * 1.3) * 0.003 * u) * dt;
      const life = Math.sin((Math.PI * m.age) / m.ttl);
      const glint = 0.55 + 0.45 * Math.sin(t * 2.3 + m.ph * 3);
      m.img.setPosition(m.x, m.y).setAlpha(m.peak * life * glint);
    }

    this._updateDrops(dt);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._releaseArt();
  }

  _releaseArt() {
    if (this._dappleShape) {
      this._dappleShape.destroy();
      this._dappleShape = null;
    }
    this._drops = [];
    this._motes = [];
    releaseRootBoxArt(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._releaseArt();
  }
}
