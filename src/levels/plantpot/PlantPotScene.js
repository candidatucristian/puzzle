import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { makeMoonTexture } from "../../shared/moon.js";
import { paintGarden, releaseGardenArt, makeCanvas, LANTERN, POT_X, BUCKET_X } from "./garden.js";
import {
  paintPlantArt,
  releasePlantArt,
  paintStems,
  POT,
  BUCKET,
  RES,
  WATER_LEVELS,
} from "./plant.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "PLANT POT"  ·  code: FIBO / FIBONACCI  ·  water the plant
//
// A garden at night under a full moon, told as simply as the valley through
// the telescope's window. On the potting bench in front of us, beside a
// storm lantern, stand a terracotta pot and a zinc bucket of water. Drag the
// bucket to the pot and it pours; each pour grows the plant one branch, and
// each new branch brings its leaves: 1, 1, 2, 3, 5. Five pours, and the plant
// has grown the sequence that bears a name. The scenery holds no formula and
// nothing on screen explains the counting.
//
// The garden is painted once per screen size (garden.js), the pot and the
// bucket too (plant.js); the stems are painted live as they grow, and the
// leaves are the level's own leaf image (assets/images/PlantPot/leaf.png).
// What moves is driven from here: the lantern's flame, fireflies over the
// grass, the grass in the corners stirring, the stars, now and then a
// shooting star.
// ─────────────────────────────────────────────────────────────────────────────

// the plant's skeleton, in cm from the middle of the soil: one segment per
// pour, each a curve from `from` to `to`, `w0` to `w1` thick
const SEGMENTS = [
  { from: { x: 0, y: 0 }, cp: { x: 5, y: -13 }, to: { x: -2.4, y: -26 }, w0: 2.4, w1: 1.7 },
  { from: { x: -2.4, y: -26 }, cp: { x: -8, y: -39 }, to: { x: 3, y: -53 }, w0: 1.7, w1: 1.05 },
  { from: { x: -2.4, y: -26 }, cp: { x: 12, y: -27 }, to: { x: 28, y: -37 }, w0: 1.15, w1: 0.55 },
  { from: { x: 3, y: -53 }, cp: { x: -10, y: -51 }, to: { x: -26, y: -65 }, w0: 1.0, w1: 0.5 },
  { from: { x: 3, y: -53 }, cp: { x: 6, y: -69 }, to: { x: 17, y: -85 }, w0: 0.95, w1: 0.45 },
];

// the leaves each pour brings — 1, 1, 2, 3 and 5 — where on the new branch
// (t along it) and which way they point (0 up, + clockwise)
const LEAF_DEFS = [
  [{ seg: 0, t: 0.6, angle: 35, scale: 1 }],
  [{ seg: 1, t: 0.4, angle: -35, scale: 1 }],
  [
    { seg: 2, t: 0.4, angle: 25, scale: 0.9 },
    { seg: 2, t: 0.85, angle: 55, scale: 0.9 },
  ],
  [
    { seg: 3, t: 0.3, angle: -20, scale: 0.85 },
    { seg: 3, t: 0.6, angle: -45, scale: 0.85 },
    { seg: 3, t: 0.9, angle: -70, scale: 0.85 },
  ],
  [
    { seg: 4, t: 0.18, angle: 20, scale: 0.75 },
    { seg: 4, t: 0.38, angle: -15, scale: 0.75 },
    { seg: 4, t: 0.58, angle: 35, scale: 0.75 },
    { seg: 4, t: 0.78, angle: -5, scale: 0.75 },
    { seg: 4, t: 0.96, angle: 45, scale: 0.75 },
  ],
];

// the leaf image (assets/images/PlantPot/leaf.png, 378 × 508): its stalk at
// the lower left, the leaf leaning 45° right of upright; drawn the size it
// always was — 0.034 cm to one of its pixels, a leaf about 17 cm long
const LEAF_IMAGE = { ox: 0.05, oy: 0.95, turn: -45, cmPerPx: 0.034 };

// the stems' canvas: the plant's reach, in cm from the soil
const PLANT_BOX = { x0: -46, x1: 40, y0: -100, y1: 4 };
const TIP = -80; // degrees the bucket tips to pour
const DEG = Math.PI / 180;

export default class PlantPotScene extends BasePuzzleScene {
  constructor() {
    super({ key: "PlantPot" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.image("leaf", "assets/images/PlantPot/leaf.png");
    this.load.audio("wateringplant", "assets/sounds/PlantPot/wateringplant.mp3");
  }

  create() {
    this.beginScene();

    // the puzzle's state, kept across resizes
    this.isSolved = false;
    this.isAnimating = false;
    this.currentStep = 0;
    this.canPour = true;

    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    // drag the bucket to the pot; close enough and it pours
    this.input.on("dragstart", (pointer, obj) => {
      if (obj !== this.bucket || this.isSolved || this.isAnimating) return;
      const p = this._local(pointer);
      this._dragOffset = { x: obj.x - p.x, y: obj.y - p.y };
      this.services.audio.playClick(this);
    });
    this.input.on("drag", (pointer, obj) => {
      if (obj !== this.bucket || this.isSolved || this.isAnimating || this.currentStep >= 5) return;
      const p = this._local(pointer);
      const off = this._dragOffset || { x: 0, y: 0 };
      obj.x = Math.max(-75, Math.min(75, p.x + off.x));
      obj.y = Math.max(-95, Math.min(-BUCKET.h / 2, p.y + off.y));
      this._placeBucketShadow();
      const pour = this._pourPoint();
      const d = Math.hypot(obj.x - pour.x, obj.y - pour.y);
      if (d > 28) this.canPour = true;
      if (d < 17 && this.canPour) {
        this.canPour = false;
        this.triggerPour();
      }
    });
    this.input.on("dragend", (pointer, obj) => {
      // let go anywhere else and the bucket goes back to its place
      if (obj !== this.bucket || this.isAnimating) return;
      this.tweens.add({
        targets: this.bucket,
        x: BUCKET_X,
        y: -BUCKET.h / 2,
        duration: 320,
        ease: "Sine.easeOut",
        onUpdate: () => this._placeBucketShadow(),
      });
    });

    if (!this.skipFadeIn) {
      const { width, height } = this.cameras.main;
      const veil = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0).setDepth(100);
      const title = this.add
        .text(width / 2, height / 2, "Level " + this._levelNumber() + "...", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.tweens.add({
        targets: [veil, title],
        alpha: 0,
        duration: 1000,
        delay: 500,
        onComplete: () => {
          veil.destroy();
          title.destroy();
        },
      });
    }
  }

  _levelNumber() {
    const i = this.services.levels.definitions
      ? this.services.levels.definitions.findIndex((l) => l.key === this.scene.key)
      : -1;
    return i !== -1 ? i + 1 : "?";
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._fireflies = [];
    this._sway = [];
    this._drops = [];
    this._stream = null;
    this._shoot = null;
    this._shootTimer = 3500 + Math.random() * 4000;

    const art = (this._art = paintGarden(this, W, H));
    const L = (this._L = art.L);
    const K = art.keys;
    this.add.image(0, 0, K.sky).setOrigin(0, 0).setDepth(-30);
    this._makeMoon(L);
    this._makeStars(L, K);
    this._shootGfx = this.add.graphics().setDepth(-28);
    this.add.image(0, 0, K.land).setOrigin(0, 0).setDepth(-20);
    this._makeFireflies();

    this._makeBench(L);
    this._makeLantern(L);
    this._makeTufts(L);
    this.add.image(0, 0, K.veil).setOrigin(0, 0).setDisplaySize(W, H).setDepth(18);
    this._drawTexts(W, H);
    this._built = true;
  }

  // the same moon that hangs over the valley through the telescope: one
  // texture, painted once and kept for the session
  _makeMoon(L) {
    makeMoonTexture(this.textures, "tele_moon");
    const { x, y, r } = L.moon;
    this.add
      .image(x, y, "tele_moon")
      .setDepth(-29)
      .setDisplaySize((r * 2) / 0.72, (r * 2) / 0.72);
  }

  // stars in the open sky: most of them faint points, a few bright ones
  // that glint, each breathing at its own pace
  _makeStars(L, K) {
    const { W, H, S } = L;
    const rnd = this._rng(8123);
    const k = Math.max(0.8, Math.min(1.4, S / 800));
    let bright = 0;
    for (let i = 0; i < 70; i++) {
      const x = W * (0.02 + rnd() * 0.96);
      const y = H * (0.02 + Math.pow(rnd(), 1.15) * 0.5);
      const glint = rnd() < 0.16 && bright < 8;
      if (!L.inSky(x, y)) continue;
      if (y < 78 && x > W * 0.3 && x < W * 0.7) continue; // the title
      if (y < 70 && x > W - 170) continue; // the level's number
      if (glint) bright++;
      const size = (glint ? 11 + rnd() * 6 : 3 + rnd() * 4) * k;
      const star = this.add
        .image(x, y, glint ? K.sparkle : K.star)
        .setDepth(-29)
        .setBlendMode("ADD")
        .setDisplaySize(size, size)
        .setAlpha(0.25);
      this.ambientTween({
        targets: star,
        alpha: glint ? 0.75 + rnd() * 0.25 : 0.45 + rnd() * 0.45,
        duration: 1200 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // tall grass in the bottom corners, dark against the slope, stirring
  _makeTufts(L) {
    const rnd = this._rng(2024);
    for (const fx of [0.015, 0.06, 0.115, 0.885, 0.94, 0.99]) {
      const x = L.W * fx + (rnd() - 0.5) * 16;
      const s = (L.u * (0.8 + rnd() * 0.5)) / 2; // the tuft is painted at twice its size
      const img = this.add
        .image(x, L.H + 4, this._art.keys.tuft)
        .setOrigin(0.5, 1)
        .setScale(s)
        .setDepth(12);
      this._sway.push({ img, amp: 0.045, ph: rnd() * 6.28, sp: 1.1 + rnd() * 0.7 });
    }
  }

  _makeFireflies() {
    const { W, H } = this._L;
    const rnd = this._rng(777);
    for (let i = 0; i < 16; i++) {
      const front = rnd() < 0.25;
      const img = this.add
        .image(0, 0, this._art.keys.firefly)
        .setBlendMode("ADD")
        .setDepth(front ? 6 : -9)
        .setAlpha(0);
      const s = (front ? 18 : 10 + rnd() * 6) * this._L.u;
      img.setDisplaySize(s, s);
      this._fireflies.push({
        img,
        x: W * rnd(),
        y: H * (0.5 + rnd() * (front ? 0.45 : 0.3)),
        vx: 0,
        vy: 0,
        ph: rnd() * 100,
        blink: 2 + rnd() * 3,
        seed: rnd() * 1000,
      });
    }
  }

  // ── the bench: pot, plant, bucket ──────────────────────────────────────────

  _makeBench(L) {
    const cm = L.cm;
    // everything on the bench lives in centimetres, about the bench-top middle
    const bench = (this.bench = this.add.container(L.bench.x, L.bench.y).setScale(cm).setDepth(0));
    const soilY = POT.soilY;
    this._soil = { x: POT_X, y: soilY };
    this._lantern = { x: LANTERN.x - POT_X, y: LANTERN.flameY - soilY }; // from the soil, cm
    const art = (this._plantArt = paintPlantArt(this.textures, cm));
    const k = 1 / (cm * RES);
    const potBack = this.add.image(POT_X, 0, art.pot.back).setOrigin(art.pot.ox, art.pot.oy).setScale(k);
    this.wet = this.add.image(POT_X, 0, art.pot.wet).setOrigin(art.pot.ox, art.pot.oy).setScale(k);
    this.wet.setAlpha(Math.min(1, this.currentStep * 0.3));
    // the stems, painted live onto their own canvas
    const px = cm * RES;
    const box = PLANT_BOX;
    const key = "pp_stems";
    if (this.textures.exists(key)) this.textures.remove(key);
    this._stemsCanvas = makeCanvas((box.x1 - box.x0) * px, (box.y1 - box.y0) * px);
    this._stemsTex = this.textures.addCanvas(key, this._stemsCanvas);
    this._stemsOrigin = { x: -box.x0 * px, y: -box.y0 * px };
    this._stemPx = px;
    this.stems = this.add
      .image(POT_X + box.x0, soilY + box.y0, key)
      .setOrigin(0, 0)
      .setScale(k);
    this.leafLayer = this.add.container(0, 0);
    const potFront = this.add.image(POT_X, 0, art.pot.front).setOrigin(art.pot.ox, art.pot.oy).setScale(k);
    this._grown = SEGMENTS.map((_, i) => (i < this.currentStep ? 1 : 0));
    this._paintStems();
    this.leaves = [];
    for (let s = 0; s < Math.min(this.currentStep, 5); s++) this._addLeaves(s, false);

    // the bucket: its shadow on the planks, then the bucket, at its level
    this.bucketShadow = this.add.image(BUCKET_X, -0.3, art.shadow).setOrigin(0.44, 0.5).setScale(k);
    const level = Math.min(WATER_LEVELS - 1, this.currentStep);
    this.bucket = this.add
      .image(BUCKET_X, -BUCKET.h / 2, art.buckets[level])
      .setOrigin(art.bucketOrigin.ox, art.bucketOrigin.oy)
      .setScale(k);
    if (!this.isSolved && this.currentStep < 5) {
      this.bucketGlints = this.add.container(BUCKET_X, -BUCKET.h / 2);
      this._bucketSparklePool = [];
      for (const [i, x, y] of [
        [0, -BUCKET.topR - 2, -7],
        [1, BUCKET.topR + 2, -1],
        [2, -BUCKET.footR - 3, BUCKET.h / 2 - 1],
        [3, 2, -BUCKET.h / 2 - 3],
      ]) {
        const glint = this.add.image(x, y, this._art.keys.sparkle)
          .setBlendMode("ADD")
          .setTint(0xffe7b0)
          .setDisplaySize(12 / cm, 12 / cm)
          .setAlpha(0.2);
        const scale = glint.scaleX;
        glint.setScale(scale * 0.65);
        this.bucketGlints.add(glint);
        this.ambientTween({
          targets: glint,
          alpha: 0.72,
          scaleX: scale * 1.05,
          scaleY: scale * 1.05,
          duration: 380,
          delay: 250 + i * 440,
          yoyo: true,
          repeat: -1,
          repeatDelay: 1100 + i * 160,
          ease: "Sine.easeInOut",
        });
      }
      for (let i = 0; i < 16; i++) {
        const image = this.add.image(0, 0, this._art.keys.sparkle)
          .setBlendMode("ADD")
          .setTint(i % 3 === 0 ? 0xffc977 : 0xffedc2)
          .setVisible(false);
        this.bucketGlints.add(image);
        this._bucketSparklePool.push({ image, age: 0, life: 0, x: 0, y: 0, drift: 0, rise: 0, size: 0 });
      }
      this._bucketSparkleTimer = 100;
    }
    this.streamGfx = this.add.graphics();
    this.dropLayer = this.add.container(0, 0);
    const objects = [potBack, this.wet, this.leafLayer, this.stems, potFront, this.bucketShadow, this.bucket];
    if (this.bucketGlints) objects.push(this.bucketGlints);
    bench.add([...objects, this.streamGfx, this.dropLayer]);

    if (!this.isSolved && this.currentStep < 5) {
      this.bucket.setInteractive({ cursor: "grab" });
      this.input.setDraggable(this.bucket);
    }
  }

  // the lantern's flame: breathing, and now and then a gutter
  _makeLantern(L) {
    const f = L.flame;
    const glow = this.add.image(f.x, f.y, this._art.keys.glow).setBlendMode("ADD").setDepth(1);
    const size = 44 * L.cm;
    glow.setDisplaySize(size, size).setAlpha(0.55);
    const core = this.add.image(f.x, f.y, this._art.keys.glow).setBlendMode("ADD").setDepth(1.1);
    core.setDisplaySize(12 * L.cm, 16 * L.cm).setAlpha(0.8);
    this._flame = { glow, core, size };
  }

  // ── what moves ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._built) return;
    this._updateStream();
    if (this.bucketGlints && this.bucket) {
      this.bucketGlints.setPosition(this.bucket.x, this.bucket.y).setRotation(this.bucket.rotation);
      this._updateBucketSparkles(Math.min(delta || 16, 100));
    }
    for (const f of this._fireflies) f.img.setVisible(this.ambientMotion);
    this._shootGfx.setVisible(this.ambientMotion);
    if (!this.ambientMotion) return;
    const t = time / 1000;
    const dt = Math.min(delta || 16, 100);
    const wind = 0.55 * Math.sin(t * 0.63) + 0.3 * Math.sin(t * 1.71 + 1.2) + 0.15 * Math.sin(t * 3.1 + 0.4);

    for (const s of this._sway) s.img.rotation = s.amp * (wind * 0.8 + 0.35 * Math.sin(t * s.sp + s.ph));

    // the flame
    const f = this._flame;
    const flick = 0.9 + 0.06 * Math.sin(t * 13.1) + 0.04 * Math.sin(t * 23.7 + 1) + 0.05 * Math.sin(t * 2.3);
    f.glow.setAlpha(0.5 * flick);
    f.glow.setDisplaySize(f.size * (0.97 + 0.03 * flick), f.size * (0.97 + 0.03 * flick));
    f.core.setAlpha(0.75 * flick);

    this._updateFireflies(t, dt);
    this._updateShootingStar(dt);
  }

  // fireflies drift and wander, glowing up and dying down, each to its own time
  _updateFireflies(t, dt) {
    const { W, H, u } = this._L;
    for (const f of this._fireflies) {
      const s = f.seed;
      f.vx += (Math.sin(t * 0.7 + s) + Math.sin(t * 1.9 + s * 2)) * 0.004 * u * dt;
      f.vy += (Math.cos(t * 0.8 + s * 1.3) + Math.sin(t * 2.3 + s)) * 0.003 * u * dt;
      f.vx *= 0.96;
      f.vy *= 0.96;
      f.x += f.vx;
      f.y += f.vy;
      if (f.x < -20) f.x = W + 20;
      if (f.x > W + 20) f.x = -20;
      f.y = Math.max(H * 0.45, Math.min(H * 0.98, f.y));
      const phase = (t + f.ph) % f.blink;
      const on = phase < 1.1 ? Math.sin((phase / 1.1) * Math.PI) : 0;
      f.img.setPosition(f.x, f.y).setAlpha(0.95 * on);
    }
  }

  _launchShootingStar() {
    const { W, H, u } = this._L;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const ang = (22 + Math.random() * 18) * DEG;
    this._shoot = {
      x: dir > 0 ? W * (0.05 + Math.random() * 0.4) : W * (0.55 + Math.random() * 0.4),
      y: H * (0.04 + Math.random() * 0.16),
      dx: Math.cos(ang) * dir,
      dy: Math.sin(ang),
      speed: (700 + Math.random() * 400) * u,
      tail: (70 + Math.random() * 50) * u,
      life: 700 + Math.random() * 400,
      age: 0,
    };
  }

  _updateShootingStar(dt) {
    if (!this._shoot) {
      this._shootTimer -= dt;
      if (this._shootTimer <= 0) {
        this._launchShootingStar();
        this._shootTimer = 7000 + Math.random() * 9000;
      }
    }
    const g = this._shootGfx;
    g.clear();
    const sh = this._shoot;
    if (!sh) return;
    sh.age += dt;
    const p = sh.age / sh.life;
    if (p >= 1) {
      this._shoot = null;
      return;
    }
    const dist = (sh.speed * sh.age) / 1000;
    const hx = sh.x + sh.dx * dist;
    const hy = sh.y + sh.dy * dist;
    const tail = Math.min(sh.tail, dist);
    const fade = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1;
    for (let i = 0; i < 10; i++) {
      const a0 = i / 10;
      const a1 = (i + 1) / 10;
      g.lineStyle(1.6 * (1 - a0) + 0.3, 0xeef2ff, fade * (1 - a0) * 0.85);
      g.lineBetween(hx - sh.dx * tail * a0, hy - sh.dy * tail * a0, hx - sh.dx * tail * a1, hy - sh.dy * tail * a1);
    }
    g.fillStyle(0xffffff, fade);
    g.fillCircle(hx, hy, 1.4);
  }

  // ── pouring and growing ────────────────────────────────────────────────────

  _local(pointer) {
    return { x: (pointer.x - this.bench.x) / this.bench.scaleX, y: (pointer.y - this.bench.y) / this.bench.scaleY };
  }

  // where the bucket's middle must be for its lip, tipped, to hang over the
  // middle of the pot
  _pourPoint() {
    const lip = this._lipOffset(TIP);
    return { x: POT_X + 1.5 - lip.x, y: -POT.h - 6 - lip.y };
  }

  // the pouring lip (the rim's left end), from the bucket's middle, tipped
  _lipOffset(deg) {
    const a = deg * DEG;
    const lx = -(BUCKET.topR - 0.3);
    const ly = -BUCKET.h / 2;
    return { x: lx * Math.cos(a) - ly * Math.sin(a), y: lx * Math.sin(a) + ly * Math.cos(a) };
  }

  _placeBucketShadow() {
    const b = this.bucket;
    const lift = Math.max(0, -BUCKET.h / 2 - b.y);
    this.bucketShadow.x = b.x;
    this.bucketShadow.setAlpha(Math.max(0, 1 - lift / 25));
  }

  _updateBucketSparkles(delta) {
    if (!this.ambientMotion || !this.bucketGlints.visible) {
      this._resetBucketSparkles();
      return;
    }
    this._bucketSparkleTimer -= delta;
    if (this._bucketSparkleTimer <= 0) {
      this._spawnBucketSparkle();
      this._bucketSparkleTimer = 80 + Math.random() * 100;
    }
    for (const particle of this._bucketSparklePool) {
      if (particle.age >= particle.life) continue;
      particle.age = Math.min(particle.life, particle.age + delta);
      const progress = particle.age / particle.life;
      particle.image.setPosition(
        particle.x + particle.drift * progress,
        particle.y - particle.rise * progress,
      );
      particle.image.setAlpha(Math.sin(progress * Math.PI) * 0.82);
      particle.image.setScale((particle.size * (1 - progress * 0.45)) / particle.image.width);
      if (progress >= 1) particle.image.setVisible(false);
    }
  }

  _spawnBucketSparkle() {
    const particle = this._bucketSparklePool.find(item => item.age >= item.life);
    if (!particle) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    particle.age = 0;
    particle.life = 550 + Math.random() * 400;
    particle.x = side * (BUCKET.topR * (0.45 + Math.random() * 0.5));
    particle.y = -BUCKET.h * (0.15 + Math.random() * 0.65);
    particle.drift = (Math.random() - 0.5) * 5;
    particle.rise = 7 + Math.random() * 8;
    particle.size = 6 + Math.random() * 4;
    particle.image
      .setPosition(particle.x, particle.y)
      .setDisplaySize(particle.size, particle.size)
      .setAlpha(0.82)
      .setVisible(true);
  }

  _resetBucketSparkles() {
    if (!this._bucketSparklePool) return;
    this._bucketSparkleTimer = 100;
    for (const particle of this._bucketSparklePool) {
      particle.age = particle.life;
      particle.image.setVisible(false);
    }
  }

  triggerPour() {
    if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
    this.isAnimating = true;
    this.bucketGlints?.setVisible(false);
    this._resetBucketSparkles();
    this._pouring = this.currentStep;
    this.input.setDraggable(this.bucket, false);
    this.services.audio.playSfx("wateringplant", 1, this);
    this._pourAndGrow(this.currentStep);
  }

  _pourAndGrow(step) {
    const pour = this._pourPoint();
    // over the pot, and tip
    this.tweens.add({
      targets: this.bucket,
      x: pour.x,
      y: pour.y,
      angle: TIP,
      duration: 400,
      ease: "Sine.easeInOut",
      onUpdate: () => this._placeBucketShadow(),
      onComplete: () => {
        // the level drops while it is tipped, where the water cannot be seen
        this.bucket.setTexture(this._plantArt.buckets[Math.min(WATER_LEVELS - 1, step + 1)]);
        this._stream = { start: this.time.now, dur: 1000, step };
        this.time.delayedCall(1000, () => {
          this._stream = null;
          this.streamGfx.clear();
          this.tweens.add({
            targets: this.bucket,
            x: BUCKET_X,
            y: -BUCKET.h / 2,
            angle: 0,
            duration: 400,
            ease: "Sine.easeInOut",
            onUpdate: () => this._placeBucketShadow(),
            onComplete: () => {
              this.canPour = true;
            },
          });
          this._grow(step);
        });
      },
    });
  }

  // the water, pouring from the lip onto the soil: a stream that thins as it
  // falls, drops flung off it, a splash where it lands; the soil darkening
  _updateStream() {
    const s = this._stream;
    const g = this.streamGfx;
    if (!s) return;
    const p = Math.min(1, (this.time.now - s.start) / s.dur);
    const flow = Math.sin(Math.PI * Math.min(1, p * 1.15)); // swells, then thins
    const lip = this._lipOffset(this.bucket.angle);
    const x0 = this.bucket.x + lip.x;
    const y0 = this.bucket.y + lip.y;
    const x1 = this._soil.x + 1;
    const y1 = this._soil.y;
    g.clear();
    if (flow > 0.02) {
      const N = 12;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const q = i / N;
        // leaves the lip moving left, then falls
        const x = x0 + (x1 - x0) * (1 - (1 - q) * (1 - q)) + Math.sin(this.time.now / 60 + q * 9) * 0.12 * q;
        const y = y0 + (y1 - y0) * q * q;
        pts.push({ x, y, w: (2.4 - q * 1.1) * (0.35 + 0.65 * flow) });
      }
      // the body of the water, its bright core, and the lantern caught
      // along its near edge
      for (const [col, a, k, dx] of [
        [0x6f95b0, 0.55, 1, 0],
        [0xcfe2f2, 0.75, 0.5, 0.1],
        [0xffffff, 0.85, 0.16, 0.25],
        [0xffc890, 0.8, 0.14, -0.55],
      ]) {
        for (let i = 1; i < pts.length; i++) {
          g.lineStyle(Math.max(0.12, pts[i].w * k), col, a);
          g.lineBetween(pts[i - 1].x + dx * pts[i - 1].w, pts[i - 1].y, pts[i].x + dx * pts[i].w, pts[i].y);
        }
      }
      // where it lands: a pale ring of splash on the soil
      g.lineStyle(0.35, 0xdfeaf5, 0.45 * flow);
      g.strokeEllipse(x1, y1, 3.2 + Math.sin(this.time.now / 45) * 0.4, 0.7);
    }
    // drops flung off the stream, a splash off the soil
    if (flow > 0.2 && Math.random() < 0.7) this._drop(x1 + (Math.random() - 0.5) * 3, y1 - 0.3, true);
    if (flow > 0.3 && Math.random() < 0.35) this._drop(x0 + (x1 - x0) * 0.4, y0 + (y1 - y0) * 0.2, false);
    this.wet.setAlpha(Math.min(1, s.step * 0.3 + 0.3 * p));
  }

  _drop(x, y, splash) {
    const d = this.add.image(x, y, this._plantArt.drop).setScale(0.045 + Math.random() * 0.05);
    this.dropLayer.add(d);
    const vx = (Math.random() - 0.5) * (splash ? 9 : 4);
    const vy = splash ? -(3 + Math.random() * 5) : 1;
    const g = 60;
    const life = splash ? 380 : 300;
    const x0 = x;
    const y0 = y;
    this.tweens.addCounter({
      from: 0,
      to: life / 1000,
      duration: life,
      onUpdate: (tw) => {
        const s = tw.getValue();
        d.x = x0 + vx * s;
        d.y = y0 + vy * s + 0.5 * g * s * s;
        d.setAlpha(1 - s / (life / 1000));
      },
      onComplete: () => d.destroy(),
    });
  }

  // the new branch draws itself out, then its leaves open along it
  _grow(step) {
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 800,
      ease: "Sine.easeOut",
      onUpdate: (tw) => {
        this._grown[step] = tw.getValue();
        this._paintStems();
      },
      onComplete: () => {
        this._grown[step] = 1;
        this._paintStems();
        this._addLeaves(step, true, () => {
          this.currentStep = step + 1;
          this._pouring = null;
          if (this.currentStep >= 5) this.finishLevel();
          else {
            this.isAnimating = false;
            this.input.setDraggable(this.bucket, true);
            this.bucketGlints?.setVisible(true);
          }
        });
      },
    });
  }

  _paintStems() {
    const ctx = this._stemsCanvas.getContext("2d");
    paintStems(ctx, this._stemPx, this._stemsOrigin, SEGMENTS, this._grown, this._lantern);
    this._stemsTex.refresh();
  }

  _segPoint(seg, t) {
    const m = 1 - t;
    return {
      x: m * m * seg.from.x + 2 * m * t * seg.cp.x + t * t * seg.to.x,
      y: m * m * seg.from.y + 2 * m * t * seg.cp.y + t * t * seg.to.y,
    };
  }

  // the leaves a pour brings (the level's own leaf image, its stalk at the
  // lower left, the leaf pointing up and right — turned back 45° so that
  // angle 0 points straight up); `grow` animates them opening, else they are
  // simply there (a rebuild)
  _addLeaves(step, grow, onDone) {
    const defs = LEAF_DEFS[step];
    defs.forEach((d, i) => {
      const seg = SEGMENTS[d.seg];
      const p = this._segPoint(seg, d.t);
      const angle = d.angle + LEAF_IMAGE.turn;
      const leaf = this.add
        .image(this._soil.x + p.x, this._soil.y + p.y, "leaf")
        .setOrigin(LEAF_IMAGE.ox, LEAF_IMAGE.oy)
        .setAngle(angle);
      leaf.baseAngle = angle;
      const full = LEAF_IMAGE.cmPerPx * d.scale;
      leaf.setScale(grow ? 0 : full);
      leaf.setInteractive({ cursor: "pointer" });
      leaf.on("pointerdown", () => this._swing(leaf));
      this.leafLayer.add(leaf);
      this.leaves.push(leaf);
      if (grow) {
        this.tweens.add({
          targets: leaf,
          scaleX: full,
          scaleY: full,
          duration: 500,
          delay: i * 220,
          ease: "Back.easeOut",
        });
      }
    });
    if (!grow) return;
    this.time.delayedCall((defs.length - 1) * 220 + 510, () => onDone && onDone());
  }

  // a leaf touched: it swings on its stalk and settles
  _swing(leaf) {
    if (leaf.isSwinging) return;
    leaf.isSwinging = true;
    this.tweens.add({
      targets: leaf,
      angle: leaf.baseAngle + 12 + Math.random() * 10,
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        leaf.angle = leaf.baseAngle;
        leaf.isSwinging = false;
      },
    });
  }

  finishLevel() {
    this.isSolved = true;
    this.isAnimating = false;
    this.bucket.disableInteractive();
    this.bucketGlints?.setVisible(false);
    // a small reward: a star falls
    if (!this._shoot) this._launchShootingStar();
  }

  _drawTexts(W, H) {
    this.levelText = drawLevelLabel(this, W, H, { y: 30, ease: "Power2" });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  // a resize: everything is painted again at the new size, the plant as
  // grown as it was — a pour caught halfway is simply finished
  _teardown() {
    this._built = false;
    if (this._pouring !== null && this._pouring !== undefined) {
      this.currentStep = this._pouring + 1;
      this._pouring = null;
      this.isAnimating = false;
      this.canPour = true;
      if (this.currentStep >= 5) this.isSolved = true;
    }
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._releaseArt();
  }

  _releaseArt() {
    releaseGardenArt(this.textures);
    releasePlantArt(this.textures);
    if (this.textures.exists("pp_stems")) this.textures.remove("pp_stems");
  }

  shutdown() {
    this._built = false;
    this._pouring = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._releaseArt();
  }
}
