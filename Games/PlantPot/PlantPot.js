// PLANT POT: o grădină sub cerul nopții. Udă planta de 5 ori și ea crește
// după șirul lui Fibonacci (1, 1, 2, 3, 5 frunze).
//
// Decorul e desenat "cu creionul" și animat din update(): stelele sclipesc,
// trece din când în când o stea căzătoare, iarba și florile se
// leagănă în vânt, iar grădinarul respiră. Ghiveciul e colorat (teracotă);
// găleata cu apă și planta sunt exact ca înainte.

const PP_PENCIL = 0xd8d2c4;

class PlantPotScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlantPot" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.image("leaf", "assets/images/PlantPot/leaf.png");
    this.load.audio(
      "wateringplant",
      "assets/sounds/PlantPot/wateringplant.mp3",
    );
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── State ── (înaintea decorului: la restart scena păstrează valorile vechi)
    this.isSolved = false;
    this.isAnimating = false;
    this.currentStep = 0;
    this.fibSeq = [1, 1, 2, 3, 5];
    this.canPour = true;

    // ── Decorul animat ─────────────────────────────────────────────────────
    this._scn = null;
    this._buildScenery(width, height);

    this.statusText = this.add
      .text(width / 2, 50, "Who am I? ...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "22px",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(width - 30, 30, "Level " + this._levelNumber(this.scene.key), {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);

    this.tweens.add({
      targets: this.levelText,
      alpha: 1,
      duration: 2000,
      ease: "Power2",
    });

    // ── Scale factor ────────────────────────────────────────────────────────
    let scaleFactor = Math.min(1, height / 600) * 0.85;

    // ── mainContainer lăsat mai jos ───────────────────────────────────────
    this.mainContainer = this.add.container(
      width * 0.48,
      height * 0.89 - 215 * scaleFactor,
    );
    this.mainContainer.setScale(scaleFactor);

    // ── Noduri tree ───────────────────────────────────────────────────────
    const n0 = { x: 0, y: 55 };
    const nMid = { x: -12, y: -75 };
    const nT = { x: 15, y: -210 };
    const nBR = { x: 140, y: -130 };
    const nBL = { x: -130, y: -270 };
    const nBR2 = { x: 85, y: -370 };

    this.segments = [
      { from: n0, to: nMid, cp: { x: 25, y: -10 } },
      { from: nMid, to: nT, cp: { x: -40, y: -140 } },
      { from: nMid, to: nBR, cp: { x: 60, y: -80 } },
      { from: nT, to: nBL, cp: { x: -50, y: -200 } },
      { from: nT, to: nBR2, cp: { x: 30, y: -290 } },
    ];

    this.segWidths = [16, 10, 6, 6, 6];
    this.segGfx = this.segments.map(() => this.add.graphics());

    // ── plantContainer — poziție locală în mainContainer ─────────────────
    this.PLANT_LOCAL_X = -130;
    this.PLANT_LOCAL_Y = 60;

    this.plantContainer = this.add.container(
      this.PLANT_LOCAL_X,
      this.PLANT_LOCAL_Y,
    );

    this.potGfx = this.add.graphics();
    this.drawPot(this.potGfx);
    this.potRimGfx = this.add.graphics();
    this.drawPotRim(this.potRimGfx);
    this.plantContainer.add([this.potGfx, ...this.segGfx, this.potRimGfx]);

    // ── Frunze ─────────────────────────────────────────────────────────────
    this.leafDefs = [
      [{ segIdx: 0, t: 0.6, ox: 0, oy: 0, angle: 35, scale: 1 }],
      [{ segIdx: 1, t: 0.4, ox: 0, oy: 0, angle: -35, scale: 1 }],
      [
        { segIdx: 2, t: 0.4, ox: 0, oy: 0, angle: 25, scale: 0.9 },
        { segIdx: 2, t: 0.85, ox: 0, oy: 0, angle: 55, scale: 0.9 },
      ],
      [
        { segIdx: 3, t: 0.3, ox: 0, oy: 0, angle: -20, scale: 0.85 },
        { segIdx: 3, t: 0.6, ox: 0, oy: 0, angle: -45, scale: 0.85 },
        { segIdx: 3, t: 0.9, ox: 0, oy: 0, angle: -70, scale: 0.85 },
      ],
      [
        { segIdx: 4, t: 0.18, ox: 0, oy: 0, angle: 20, scale: 0.75 },
        { segIdx: 4, t: 0.38, ox: 0, oy: 0, angle: -15, scale: 0.75 },
        { segIdx: 4, t: 0.58, ox: 0, oy: 0, angle: 35, scale: 0.75 },
        { segIdx: 4, t: 0.78, ox: 0, oy: 0, angle: -5, scale: 0.75 },
        { segIdx: 4, t: 0.96, ox: 0, oy: 0, angle: 45, scale: 0.75 },
      ],
    ];

    // ── bucketContainer — poziție locală în mainContainer ─────────────────
    this.BUCKET_HOME_X = 150;
    this.BUCKET_HOME_Y = 162;

    this.bucketContainer = this.add.container(
      this.BUCKET_HOME_X,
      this.BUCKET_HOME_Y,
    );
    this.bucketContainer.setSize(100, 100).setInteractive({ cursor: "grab" });
    this.bucketGfx = this.add.graphics();
    this.waterFillGfx = this.add.graphics();
    this.drawBucket(this.bucketGfx, this.waterFillGfx, 1.0);
    this.bucketContainer.add([this.waterFillGfx, this.bucketGfx]);
    this.input.setDraggable(this.bucketContainer);

    // Asamblăm containerul principal
    this.mainContainer.add([this.plantContainer, this.bucketContainer]);

    // ── Drag Handlers ──────────────────────────────────────────────────────
    this.input.on("dragstart", (pointer, gameObject) => {
      if (this.isSolved || this.isAnimating) return;
      this.mainContainer.bringToTop(gameObject);
      let localMouseX =
        (pointer.x - this.mainContainer.x) / this.mainContainer.scaleX;
      let localMouseY =
        (pointer.y - this.mainContainer.y) / this.mainContainer.scaleY;
      gameObject.dragOffsetX = gameObject.x - localMouseX;
      gameObject.dragOffsetY = gameObject.y - localMouseY;
      if (window.playClick) window.playClick(this);
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
      let localMouseX =
        (pointer.x - this.mainContainer.x) / this.mainContainer.scaleX;
      let localMouseY =
        (pointer.y - this.mainContainer.y) / this.mainContainer.scaleY;
      gameObject.x = localMouseX + gameObject.dragOffsetX;
      gameObject.y = localMouseY + gameObject.dragOffsetY;
      const pourTargetX = this.plantContainer.x + 45;
      const pourTargetY = this.plantContainer.y - 15;
      const dist = Phaser.Math.Distance.Between(
        this.bucketContainer.x,
        this.bucketContainer.y,
        pourTargetX,
        pourTargetY,
      );
      if (dist > 100) {
        this.canPour = true;
      }
      if (dist < 60 && this.canPour) {
        this.canPour = false;
        this.triggerPour();
      }
    });

    // ── Resize ─────────────────────────────────────────────────────────────
    // păstrăm referința ca să scoatem listener-ul la shutdown
    this._onResize = (size) => {
      this._buildScenery(size.width, size.height);
      this.statusText.setPosition(size.width / 2, 50);
      this.levelText.setPosition(size.width - 30, 30);
      let newScale = Math.min(1, size.height / 600) * 0.85;
      this.mainContainer.setPosition(
        size.width * 0.48,
        size.height * 0.89 - 215 * newScale,
      );
      this.mainContainer.setScale(newScale);
    };
    this.events.on("canvas_resized", this._onResize);

    if (!this.skipFadeIn) {
      const fadeOverlay = this.add
        .rectangle(0, 0, width, height, 0x000000)
        .setOrigin(0, 0)
        .setDepth(100);
      const nextLvlText = this.add
        .text(
          width / 2,
          height / 2,
          "Level " + this._levelNumber(this.scene.key) + "...",
          {
            fontFamily: '"Special Elite", monospace',
            fontSize: "48px",
            color: "#ffffff",
          },
        )
        .setOrigin(0.5)
        .setDepth(101);
      this.tweens.add({
        targets: [fadeOverlay, nextLvlText],
        alpha: 0,
        duration: 1000,
        delay: 500,
        onComplete: () => {
          fadeOverlay.destroy();
          nextLvlText.destroy();
        },
      });
    }
  }

  _levelNumber(key) {
    const i = window.GAME_LEVELS
      ? window.GAME_LEVELS.findIndex((l) => l.key === key)
      : -1;
    return i !== -1 ? i + 1 : "?";
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ANIMAȚIILE DECORULUI (rulează în fiecare cadru)
  // ══════════════════════════════════════════════════════════════════════════

  update(time, delta) {
    const s = this._scn;
    if (!s) return;
    const dt = Math.min(delta || 16, 100); // fără salturi după un tab inactiv
    const t = time / 1000;

    // vântul: rafale lente și neregulate, comune pentru iarbă, flori și frunze
    const wind =
      0.55 * Math.sin(t * 0.63) +
      0.3 * Math.sin(t * 1.71 + 1.2) +
      0.15 * Math.sin(t * 3.1 + 0.4);

    this._drawStars(t);
    this._updateShootingStar(dt);

    s.moonGlow.setAlpha(0.85 + 0.15 * Math.sin(t * 0.8));

    for (const p of s.plants)
      p.g.rotation = p.amp * (wind * 0.8 + 0.35 * Math.sin(t * p.sp + p.ph));

    this._drawGrass(t, wind);

    // grădinarul respiră și își mută ușor greutatea
    s.gardener.scaleY = s.gardenerScale * (1 + 0.012 * Math.sin(t * 1.5));
    s.gardener.rotation = 0.012 * Math.sin(t * 0.5);
  }

  _drawStars(t) {
    const g = this._scn.starGfx;
    g.clear();
    for (const s of this._scn.stars) {
      // două frecvențe amestecate → sclipire neregulată, ca la stelele reale
      const tw =
        0.5 +
        0.35 * Math.sin(t * s.sp + s.ph) +
        0.15 * Math.sin(t * s.sp * 2.7 + s.ph * 1.3);
      const a = s.base * (0.25 + 0.75 * tw);
      if (s.spark) {
        g.fillStyle(s.col, a * 0.08);
        g.fillCircle(s.x, s.y, s.rad * 4);
      }
      g.fillStyle(s.col, a);
      g.fillCircle(s.x, s.y, s.rad * (0.85 + 0.25 * tw));
      if (s.spark) {
        const L = 2 + 5 * Math.pow(Math.max(0, tw), 3);
        g.lineStyle(0.7, s.col, a * 0.8);
        g.lineBetween(s.x - L, s.y, s.x + L, s.y);
        g.lineBetween(s.x, s.y - L, s.x, s.y + L);
      }
    }
  }

  _launchShootingStar() {
    const s = this._scn;
    const { W, H, u } = s;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const ang = Phaser.Math.DegToRad(22 + Math.random() * 18);
    const speed = (700 + Math.random() * 400) * u;
    s.shoot = {
      x:
        dir > 0
          ? W * (0.05 + Math.random() * 0.4)
          : W * (0.55 + Math.random() * 0.4),
      y: H * (0.04 + Math.random() * 0.16),
      dx: Math.cos(ang) * dir,
      dy: Math.sin(ang),
      speed,
      tail: (70 + Math.random() * 50) * u,
      life: 700 + Math.random() * 400,
      age: 0,
    };
  }

  _updateShootingStar(dt) {
    const s = this._scn;
    if (!s.shoot) {
      s.shootTimer -= dt;
      if (s.shootTimer <= 0) {
        this._launchShootingStar();
        s.shootTimer = 7000 + Math.random() * 9000;
      }
    }
    const g = s.shootGfx;
    g.clear();
    const sh = s.shoot;
    if (!sh) return;
    sh.age += dt;
    const p = sh.age / sh.life;
    if (p >= 1) {
      s.shoot = null;
      return;
    }
    const dist = (sh.speed * sh.age) / 1000;
    const hx = sh.x + sh.dx * dist;
    const hy = sh.y + sh.dy * dist;
    const tail = Math.min(sh.tail, dist);
    const fade = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1;
    const segs = 10;
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs;
      const a1 = (i + 1) / segs;
      g.lineStyle(1.6 * (1 - a0) + 0.3, 0xeef2ff, fade * (1 - a0) * 0.85);
      g.lineBetween(
        hx - sh.dx * tail * a0,
        hy - sh.dy * tail * a0,
        hx - sh.dx * tail * a1,
        hy - sh.dy * tail * a1,
      );
    }
    g.fillStyle(0xffffff, fade);
    g.fillCircle(hx, hy, 1.4);
  }

  _drawGrass(t, wind) {
    const s = this._scn;
    const g = s.grassGfx;
    g.clear();
    for (const tf of s.tufts) {
      const sway = wind * 0.35 + Math.sin(t * 2.1 + tf.x * 0.035) * 0.12;
      g.lineStyle(1, PP_PENCIL, tf.alpha);
      for (const b of tf.blades) {
        const bx = tf.x + b.dx;
        const by = tf.y;
        const ang = b.lean + sway * b.flex;
        const mx = bx + Math.sin(ang * 0.5) * b.len * 0.5;
        const my = by - Math.cos(ang * 0.5) * b.len * 0.5;
        const tx = mx + Math.sin(ang) * b.len * 0.5;
        const ty = my - Math.cos(ang) * b.len * 0.5;
        g.lineBetween(bx, by, mx, my);
        g.lineBetween(mx, my, tx, ty);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CONSTRUCȚIA DECORULUI (se refac la resize)
  // ══════════════════════════════════════════════════════════════════════════

  _buildScenery(W, H) {
    if (this._scn) {
      for (const o of this._scn.objs) o.destroy();
    }
    const u = Math.min(W / 1000, H / 650);
    const scn = {
      W,
      H,
      u,
      objs: [],
      ground: H * 0.72,
      moon: { x: W * 0.85, y: H * 0.17, r: 24 * u },
      shoot: null,
      shootTimer: 3500 + Math.random() * 4000,
    };
    this._scn = scn;
    const add = (o) => {
      scn.objs.push(o);
      return o;
    };

    this._buildSky(scn, add);
    this._buildMoon(scn, add);
    this._buildStars(scn, add);
    scn.shootGfx = add(this.add.graphics().setDepth(-20.5));
    this._buildHills(scn, add);
    this._buildBigTrees(scn, add);
    this._buildGround(scn, add);
    this._buildFence(scn, add);
    this._buildBench(scn, add);
    this._buildPlants(scn, add);
    this._buildGardener(scn, add);
    this._buildGrass(scn, add);
  }

  // stelele nu apar peste plantă, titlu, lună sau "Level N"
  _starBlocked(scn, x, y) {
    const { W, H, moon } = scn;
    if (x < 0 || x > W || y < 0 || y > H * 0.47) return true;
    if (x > W * 0.26 && x < W * 0.59 && y > H * 0.17) return true;
    if (y < 78 && x > W * 0.3 && x < W * 0.7) return true;
    if (y < 70 && x > W - 170) return true;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 2.6) return true;
    return false;
  }

  _buildSky(scn, add) {
    const { W, H } = scn;
    const g = add(this.add.graphics().setDepth(-22));
    g.fillGradientStyle(0x040810, 0x070d19, 0x0c1614, 0x0e1712, 1);
    g.fillRect(0, 0, W, H);
    // lumină slabă deasupra orizontului
    g.fillGradientStyle(
      0x2a4644,
      0x2a4644,
      0x2a4644,
      0x2a4644,
      0,
      0,
      0.16,
      0.16,
    );
    g.fillRect(0, H * 0.28, W, H * 0.28);

    // Calea Lactee: o dâră fină de praf de stele, în stânga sus
    const r = this._rng(2718);
    const ax = 0,
      ay = H * 0.34,
      bx = W * 0.46,
      by = -H * 0.02;
    const len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let i = 0; i < 190; i++) {
      const t = r();
      const off = (r() + r() + r() - 1.5) * H * 0.055;
      const x = ax + (bx - ax) * t + nx * off;
      const y = ay + (by - ay) * t + ny * off;
      const alpha = 0.07 + r() * 0.18;
      const rad = 0.35 + r() * 0.55;
      if (this._starBlocked(scn, x, y)) continue;
      g.fillStyle(0xcdd8ee, alpha);
      g.fillCircle(x, y, rad);
    }
  }

  _buildMoon(scn, add) {
    const { x: mx, y: my, r: R } = scn.moon;
    const r = this._rng(1969);

    const glow = add(this.add.graphics().setDepth(-20));
    for (let i = 7; i >= 1; i--) {
      glow.fillStyle(0xcad6ea, 0.016);
      glow.fillCircle(mx, my, R * (1 + i * 0.5));
    }
    scn.moonGlow = glow;

    const g = add(this.add.graphics().setDepth(-19.5));
    // partea din umbră (abia vizibilă)
    g.fillStyle(0x131b28, 1);
    g.fillCircle(mx, my, R);
    this._pencilCircle(g, r, mx, my, R, 1, PP_PENCIL, 0.2);

    // secera luminată
    const k = 0.42;
    const outer = [];
    const inner = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 24;
      outer.push({ x: mx + R * Math.cos(a), y: my + R * Math.sin(a) });
      inner.push({ x: mx + k * R * Math.cos(a), y: my + R * Math.sin(a) });
    }
    g.fillStyle(0xebe5d3, 0.95);
    g.fillPoints([...outer, ...inner.slice().reverse()], true);
    this._pencilArc(
      g,
      r,
      mx,
      my,
      R,
      -Math.PI / 2,
      Math.PI / 2,
      1.3,
      PP_PENCIL,
      0.85,
    );
    this._drawPath(g, inner, 1, PP_PENCIL, 0.35);

    // cratere
    g.fillStyle(0xbdb6a3, 0.4);
    g.fillCircle(
      mx + R * 0.7 * Math.cos(-0.45),
      my + R * 0.7 * Math.sin(-0.45),
      R * 0.11,
    );
    g.fillCircle(
      mx + R * 0.78 * Math.cos(0.55),
      my + R * 0.78 * Math.sin(0.55),
      R * 0.08,
    );
    g.fillCircle(
      mx + R * 0.62 * Math.cos(0.1),
      my + R * 0.62 * Math.sin(0.1),
      R * 0.06,
    );
  }

  _buildStars(scn, add) {
    const { W, H } = scn;
    const r = this._rng(8123);
    scn.stars = [];
    let tries = 0;
    while (scn.stars.length < 95 && tries < 800) {
      tries++;
      const x = W * (0.02 + r() * 0.96);
      const y = H * (0.03 + r() * 0.44);
      const rad = 0.5 + r() * 0.95;
      const base = 0.35 + r() * 0.5;
      const sp = 0.7 + r() * 2.3;
      const ph = r() * Math.PI * 2;
      const tint = r();
      if (this._starBlocked(scn, x, y)) continue;
      scn.stars.push({
        x,
        y,
        rad,
        base,
        sp,
        ph,
        col: tint < 0.18 ? 0xf3e5c4 : tint < 0.36 ? 0xc8d9ff : 0xdfe5f0,
        spark: scn.stars.length % 9 === 0,
      });
    }
    scn.starGfx = add(this.add.graphics().setDepth(-21));
  }

  _hillLayer(g, r, fy, fill, alpha) {
    const { W, H } = this._scn;
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const x = -10 + ((W + 20) * i) / 64;
      pts.push({ x, y: fy(x) });
    }
    g.fillStyle(fill, 1);
    g.fillPoints(
      [...pts, { x: W + 10, y: H + 10 }, { x: -10, y: H + 10 }],
      true,
    );
    for (let i = 1; i < pts.length; i++)
      this._pencilSeg(
        g,
        r,
        pts[i - 1].x,
        pts[i - 1].y,
        pts[i].x,
        pts[i].y,
        1.2,
        PP_PENCIL,
        alpha,
        0.6,
      );
  }

  _buildHills(scn, add) {
    const { W, H } = scn;
    const r = this._rng(6446);
    scn.farY = (x) =>
      H *
      (0.505 +
        0.017 * Math.sin((x / W) * 7.1 + 0.6) +
        0.009 * Math.sin((x / W) * 17.3 + 2.1));
    scn.midY = (x) =>
      H *
      (0.582 +
        0.022 * Math.sin((x / W) * 5.3 + 2.4) +
        0.008 * Math.sin((x / W) * 12.7 + 1));

    // dealurile îndepărtate, cu copaci mici și plopi
    const far = add(this.add.graphics().setDepth(-18));
    const FAR = 0x0e1815;
    this._hillLayer(far, r, scn.farY, FAR, 0.3);
    for (const [fx, type, fh] of [
      [0.075, "poplar", 0.07],
      [0.66, "round", 0.04],
      [0.7, "poplar", 0.075],
      [0.97, "round", 0.05],
    ]) {
      const bx = W * fx;
      const by = scn.farY(bx) + 2;
      if (type === "poplar") this._poplar(far, r, bx, by, H * fh, FAR, 0.3);
      else this._roundTree(far, r, bx, by, H * fh, FAR, 0.3);
    }

    // dealul din mijloc, cu tufișuri
    const mid = add(this.add.graphics().setDepth(-17));
    const MID = 0x0b1310;
    this._hillLayer(mid, r, scn.midY, MID, 0.42);
    for (const [fx, fh] of [[0.66, 0.024]])
      this._bush(mid, r, W * fx, scn.midY, H * fh, MID, 0.4);
  }

  _buildBigTrees(scn, add) {
    const { W, H } = scn;
    const r = this._rng(9229);
    const g = add(this.add.graphics().setDepth(-16));
    // copacul mare din stânga
    this._bigTree(g, r, W * 0.165, H * 0.675, H * 0.36, 0x0c1411);
    // un copac mai mic în dreapta, în spatele grădinarului
    this._bigTree(
      g,
      r,
      W * 0.905,
      scn.midY(W * 0.905) + H * 0.065,
      H * 0.25,
      0x0c1411,
    );
  }

  _buildGround(scn, add) {
    const { W, H, u, ground } = scn;
    const r = this._rng(3141);
    const g = add(this.add.graphics().setDepth(-15));

    // pământul grădinii
    scn.groundY = (x) => ground + H * 0.004 * Math.sin((x / W) * 9 + 1.3);
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const x = -10 + ((W + 20) * i) / 48;
      pts.push({ x, y: scn.groundY(x) });
    }
    g.fillStyle(0x090f0c, 1);
    g.fillPoints(
      [...pts, { x: W + 10, y: H + 10 }, { x: -10, y: H + 10 }],
      true,
    );
    for (let i = 1; i < pts.length; i++)
      this._pencilSeg(
        g,
        r,
        pts[i - 1].x,
        pts[i - 1].y,
        pts[i].x,
        pts[i].y,
        1.1,
        PP_PENCIL,
        0.28,
        0.5,
      );

    // cărarea care iese prin poarta din gard spre câmp
    const toPx = (arr) => arr.map(([fx, fy]) => ({ x: W * fx, y: H * fy }));
    scn.pathL = this._catmull(
      toPx([
        [0.5, 0.588],
        [0.506, 0.655],
        [0.54, 0.705],
        [0.62, 0.78],
        [0.69, 0.85],
        [0.725, 0.93],
        [0.735, 1.02],
      ]),
      8,
    );
    scn.pathR = this._catmull(
      toPx([
        [0.51, 0.588],
        [0.565, 0.655],
        [0.61, 0.705],
        [0.71, 0.78],
        [0.79, 0.85],
        [0.86, 0.93],
        [0.9, 1.02],
      ]),
      8,
    );
    g.fillStyle(0x131912, 1);
    g.fillPoints([...scn.pathL, ...scn.pathR.slice().reverse()], true);
    for (const edge of [scn.pathL, scn.pathR])
      for (let i = 1; i < edge.length; i++)
        this._pencilSeg(
          g,
          r,
          edge[i - 1].x,
          edge[i - 1].y,
          edge[i].x,
          edge[i].y,
          1.1,
          PP_PENCIL,
          0.34,
          0.5,
        );
  }

  _buildFence(scn, add) {
    const { W, H, u, ground } = scn;
    const r = this._rng(5150);
    const g = add(this.add.graphics().setDepth(-13));
    const fh = H * 0.09;
    const pw = Math.max(7, 9 * u);

    // șipcile orizontale (în spatele ulucilor)
    for (const [a, b] of [
      [0, 0.37],
      [0.63, 1],
    ]) {
      for (const k of [0.035, 0.066]) {
        const y = ground - H * k;
        g.fillStyle(0x121813, 1);
        g.fillRect(W * a, y - 2.5 * u, W * (b - a), 5 * u);
        this._pencilSeg(
          g,
          r,
          W * a,
          y - 2.5 * u,
          W * b,
          y - 2.5 * u,
          1,
          PP_PENCIL,
          0.4,
          0.8,
        );
        this._pencilSeg(
          g,
          r,
          W * a,
          y + 2.5 * u,
          W * b,
          y + 2.5 * u,
          1,
          PP_PENCIL,
          0.22,
          0.8,
        );
      }
    }

    // ulucile
    for (let i = 0; i < 24; i++) {
      const x = W * (0.02 + i * 0.042);
      if (x > W * 0.355 && x < W * 0.62) continue;
      const lean = (r() - 0.5) * 2;
      const top = ground - fh + (r() - 0.5) * 3;
      const pts = [
        [x, ground],
        [x + lean, top + 5 * u],
        [x + lean + pw / 2, top],
        [x + lean + pw, top + 5 * u],
        [x + pw, ground],
      ];
      g.fillStyle(0x141b16, 1);
      g.fillPoints(this._polyPts(pts), true);
      this._pencilPath(g, r, pts, 1.1, 0.5, 0.4);
      this._pencilSeg(
        g,
        r,
        x + pw * 0.5,
        ground - 3,
        x + lean + pw * 0.5,
        top + 9 * u,
        1,
        PP_PENCIL,
        0.1,
        0.4,
      );
    }

    // stâlpii porții
    for (const px of [W * 0.37, W * 0.63]) {
      const pw2 = 11 * u;
      const top = ground - fh * 1.15;
      g.fillStyle(0x151c17, 1);
      g.fillRect(px - pw2 / 2, top, pw2, ground - top);
      this._pencilRect(
        g,
        r,
        px - pw2 / 2,
        top,
        pw2,
        ground - top,
        1.2,
        PP_PENCIL,
        0.55,
        0.5,
      );
      g.fillStyle(0x151c17, 1);
      g.fillCircle(px, top - 4 * u, 5 * u);
      this._pencilCircle(g, r, px, top - 4 * u, 5 * u, 1.1, PP_PENCIL, 0.55);
    }
  }

  _buildBench(scn, add) {
    const { W, H } = scn;
    const r = this._rng(4040);
    const sc = Math.min(1, H / 600) * 0.85;
    const benchY = H * 0.89;
    const left = W * 0.48 - 206 * sc;
    const right = W * 0.48 + 215 * sc;
    const th = 10 * sc;
    const legW = 9 * sc;
    const footY = H * 0.995;
    const g = add(this.add.graphics().setDepth(-12));

    const legs = [left + 18 * sc, right - 18 * sc - legW];
    const braceY = benchY + th + (footY - benchY - th) * 0.55;
    g.fillStyle(0x17130f, 1);
    g.fillRect(legs[0], braceY - 2.5 * sc, legs[1] + legW - legs[0], 5 * sc);
    this._pencilSeg(
      g,
      r,
      legs[0],
      braceY - 2.5 * sc,
      legs[1] + legW,
      braceY - 2.5 * sc,
      1,
      PP_PENCIL,
      0.35,
      0.6,
    );
    this._pencilSeg(
      g,
      r,
      legs[0],
      braceY + 2.5 * sc,
      legs[1] + legW,
      braceY + 2.5 * sc,
      1,
      PP_PENCIL,
      0.22,
      0.6,
    );
    for (const lx of legs) {
      g.fillStyle(0x17130f, 1);
      g.fillRect(lx, benchY + th, legW, footY - benchY - th);
      this._pencilSeg(
        g,
        r,
        lx,
        benchY + th,
        lx - 1,
        footY,
        1.2,
        PP_PENCIL,
        0.5,
        0.5,
      );
      this._pencilSeg(
        g,
        r,
        lx + legW,
        benchY + th,
        lx + legW + 1,
        footY,
        1.2,
        PP_PENCIL,
        0.4,
        0.5,
      );
    }

    // blatul mesei de lucru (ghiveciul și găleata stau pe el)
    g.fillStyle(0x1e1914, 1);
    g.fillRect(left, benchY, right - left, th);
    this._pencilRect(
      g,
      r,
      left,
      benchY,
      right - left,
      th,
      1.3,
      PP_PENCIL,
      0.62,
      0.6,
    );
    for (let i = 0; i < 5; i++) {
      const gy = benchY + th * (0.3 + r() * 0.4);
      const gx = left + (right - left) * r() * 0.8;
      this._pencilSeg(
        g,
        r,
        gx,
        gy,
        gx + (right - left) * (0.08 + r() * 0.12),
        gy + (r() - 0.5) * 1.5,
        1,
        PP_PENCIL,
        0.14,
        0.4,
      );
    }
  }

  _buildPlants(scn, add) {
    const { W, H, u } = scn;
    const r = this._rng(9001);
    scn.plants = [];
    const tints = [0xe8a4b4, 0xc4b0ea, 0xf0c09a, 0xeedb9c, 0xb4d2ee];
    [
      [0.9, 0.89, 90, "leafy"],
      [0.955, 0.875, 110, "daisy"],
    ].forEach(([fx, fy, size, type], i) => {
      const g = add(
        this.add
          .graphics()
          .setDepth(fy < 0.75 ? -12.5 : -11)
          .setPosition(W * fx, H * fy),
      );
      const s = size * u;
      this._drawGardenPlant(g, r, s, type, tints[i % tints.length]);
      scn.plants.push({
        g,
        amp: 0.035 + r() * 0.03,
        ph: r() * 6.28,
        sp: 0.8 + r() * 0.6,
      });
    });
  }

  // o plantă din grădină, desenată în jurul bazei (0,0), ca să se legene din rădăcină
  _drawGardenPlant(g, r, s, type, tint) {
    const stem = [
      [0, 0],
      [-s * 0.05, -s * 0.45],
      [s * 0.06, -s],
    ];
    const stemX = (y) => {
      const t = -y / s;
      return t < 0.45
        ? -s * 0.05 * (t / 0.45)
        : -s * 0.05 + s * 0.11 * ((t - 0.45) / 0.55);
    };

    // frunzele
    const leafN = type === "leafy" ? 5 : type === "tulip" ? 2 : 3;
    const step = type === "leafy" ? 0.15 : 0.2;
    for (let i = 0; i < leafN; i++) {
      const yy = -s * (0.14 + i * step);
      const dir = i % 2 ? 1 : -1;
      const L =
        s *
        (type === "tulip" ? 0.36 : type === "leafy" ? 0.28 : 0.24) *
        (1 - i * 0.07);
      const ang = dir > 0 ? -0.55 - r() * 0.25 : Math.PI + 0.55 + r() * 0.25;
      const x0 = stemX(yy);
      const pts = this._leafPts(
        x0,
        yy,
        L,
        L * (type === "tulip" ? 0.18 : 0.3),
        ang,
      );
      g.fillStyle(0x16241c, 1);
      g.fillPoints(pts, true);
      this._drawPath(g, [...pts, pts[0]], 1.1, PP_PENCIL, 0.55);
      this._pencilSeg(
        g,
        r,
        x0,
        yy,
        x0 + Math.cos(ang) * L * 0.85,
        yy + Math.sin(ang) * L * 0.85,
        1,
        PP_PENCIL,
        0.25,
        0.3,
      );
    }
    this._pencilPath(g, r, stem, 1.4, 0.65, 0.5);

    // floarea
    const tx = s * 0.06;
    const ty = -s;
    if (type === "daisy") {
      const pl = Math.max(4, s * 0.09);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const pts = this._ellipsePts(
          tx + Math.cos(a) * pl * 0.75,
          ty + Math.sin(a) * pl * 0.75,
          pl * 0.62,
          pl * 0.26,
          a,
          10,
        );
        g.fillStyle(0xf1ece0, 0.32);
        g.fillPoints(pts, true);
        this._drawPath(g, [...pts, pts[0]], 1, PP_PENCIL, 0.55);
      }
      g.fillStyle(0xe7c35f, 0.8);
      g.fillCircle(tx, ty, pl * 0.38);
      this._pencilCircle(g, r, tx, ty, pl * 0.38, 1, PP_PENCIL, 0.6);
    } else if (type === "tulip") {
      const cw = Math.max(4, s * 0.075);
      const ch = cw * 1.5;
      const pts = [
        [tx - cw, ty - ch * 0.9],
        [tx - cw * 0.35, ty - ch * 0.55],
        [tx, ty - ch],
        [tx + cw * 0.35, ty - ch * 0.55],
        [tx + cw, ty - ch * 0.9],
        [tx + cw * 0.85, ty - ch * 0.2],
        [tx, ty + ch * 0.05],
        [tx - cw * 0.85, ty - ch * 0.2],
      ];
      g.fillStyle(tint, 0.55);
      g.fillPoints(this._polyPts(pts), true);
      this._pencilPath(g, r, [...pts, pts[0]], 1.1, 0.7, 0.3);
      this._pencilSeg(
        g,
        r,
        tx,
        ty - ch * 0.1,
        tx,
        ty - ch * 0.85,
        1,
        PP_PENCIL,
        0.3,
        0.2,
      );
    } else {
      // boboci mici
      for (const [bx, by, br] of [
        [tx, ty, 0.045],
        [tx - s * 0.1, ty + s * 0.09, 0.035],
        [tx + s * 0.09, ty + s * 0.14, 0.03],
      ]) {
        g.fillStyle(tint, 0.5);
        g.fillCircle(bx, by, Math.max(2, s * br));
        this._pencilCircle(
          g,
          r,
          bx,
          by,
          Math.max(2, s * br),
          1,
          PP_PENCIL,
          0.55,
        );
      }
    }
  }

  _buildGardener(scn, add) {
    const { W, H, u } = scn;
    const s = u * 0.9;
    const r = this._rng(5555);
    const g = add(
      this.add
        .graphics()
        .setDepth(-11)
        .setPosition(W * 0.77, H * 0.88)
        .setScale(s),
    );
    const shape = (pts, fill, alpha = 0.7, width = 1.2) => {
      if (fill !== null) {
        g.fillStyle(fill, 1);
        g.fillPoints(this._polyPts(pts), true);
      }
      this._pencilPath(g, r, pts, width, alpha, 0.4);
    };
    const CLOTH = 0x19211d;

    // lopata (în spate)
    shape(
      [
        [-51, -114],
        [-50, -23],
      ],
      null,
      0.6,
      1.7,
    );
    shape(
      [
        [-57, -123],
        [-43, -123],
        [-43, -114],
        [-57, -114],
        [-57, -123],
      ],
      0x1d201e,
      0.55,
    );
    shape(
      [
        [-59, -24],
        [-41, -24],
        [-43, -7],
        [-50, 0],
        [-57, -7],
        [-59, -24],
      ],
      0x1b1f1e,
      0.62,
    );

    // picioarele și cizmele
    shape(
      [
        [-14, -47],
        [-17, -10],
        [-27, -6],
        [-27, 0],
        [-9, 0],
        [-3, -45],
      ],
      0x121714,
      0.65,
    );
    shape(
      [
        [4, -46],
        [13, -12],
        [12, -3],
        [30, -3],
        [31, -8],
        [21, -13],
        [19, -47],
      ],
      0x121714,
      0.65,
    );
    this._pencilSeg(g, r, -16.5, -16, -6, -16, 1, PP_PENCIL, 0.4, 0.3);
    this._pencilSeg(g, r, 12, -18, 22, -18, 1, PP_PENCIL, 0.4, 0.3);

    // trunchiul, șorțul, buzunarul
    shape(
      [
        [-9, -115],
        [-25, -103],
        [-28, -62],
        [-17, -48],
        [19, -48],
        [26, -72],
        [18, -105],
        [7, -115],
      ],
      CLOTH,
      0.72,
    );
    shape(
      [
        [-10, -108],
        [-13, -57],
        [17, -57],
        [10, -108],
      ],
      0x232c26,
      0.5,
    );
    shape(
      [
        [-7, -85],
        [10, -85],
        [9, -73],
        [-6, -73],
        [-7, -85],
      ],
      null,
      0.35,
      1,
    );
    this._pencilSeg(g, r, -10, -108, -4, -114, 1, PP_PENCIL, 0.35, 0.3);
    this._pencilSeg(g, r, 10, -108, 4, -114, 1, PP_PENCIL, 0.35, 0.3);

    // brațele, cu mânecile suflecate
    shape(
      [
        [-24, -99],
        [-42, -83],
        [-53, -99],
        [-47, -106],
        [-38, -95],
        [-27, -110],
      ],
      CLOTH,
      0.7,
    );
    shape(
      [
        [20, -102],
        [34, -82],
        [24, -66],
        [18, -70],
        [24, -84],
        [13, -98],
      ],
      CLOTH,
      0.7,
    );
    this._pencilSeg(g, r, -33, -91, -32.5, -102.5, 1.1, PP_PENCIL, 0.45, 0.3);
    this._pencilSeg(g, r, 27, -92, 18.5, -91, 1.1, PP_PENCIL, 0.45, 0.3);
    g.fillStyle(0x3a3a34, 1);
    g.fillCircle(-50, -102, 3.5);
    g.fillCircle(21, -68, 3.2);
    this._pencilCircle(g, r, -50, -102, 3.5, 1, PP_PENCIL, 0.5);
    this._pencilCircle(g, r, 21, -68, 3.2, 1, PP_PENCIL, 0.5);

    // fața
    shape(
      [
        [-15, -137],
        [-13, -118],
        [0, -112],
        [12, -121],
        [14, -137],
      ],
      0x33332e,
      0.55,
    );

    // pălăria de paie
    shape(
      [
        [-23, -145],
        [-18, -163],
        [-4, -167],
        [11, -160],
        [15, -144],
      ],
      0x2c2a20,
      0.62,
    );
    for (let i = 0; i < 5; i++) {
      const hx = -17 + i * 7;
      this._pencilSeg(
        g,
        r,
        hx,
        -148,
        hx + 4,
        -161 + Math.abs(i - 2) * 1.5,
        1,
        PP_PENCIL,
        0.16,
        0.3,
      );
    }
    this._pencilSeg(g, r, -22, -148, 14, -147, 2, PP_PENCIL, 0.45, 0.3);
    shape(
      [
        [-36, -143],
        [-16, -148],
        [20, -145],
        [31, -139],
        [5, -136],
        [-36, -143],
      ],
      0x2f2c22,
      0.72,
    );

    scn.gardener = g;
    scn.gardenerScale = s;
  }

  _buildGrass(scn, add) {
    const { W, H, u, ground } = scn;
    const r = this._rng(2024);
    scn.tufts = [];
    const make = (x, y, big) => {
      if (this._inPath(scn, x, y, 4 * u)) return;
      const persp = 0.55 + ((y - ground) / (H - ground)) * 0.75;
      const n = 3 + Math.floor(r() * 2);
      const blades = [];
      for (let i = 0; i < n; i++) {
        blades.push({
          dx: (i - (n - 1) / 2) * 2.2 * u * persp,
          len: (6 + r() * 9) * u * persp * (big ? 1.3 : 1),
          lean: (i - (n - 1) / 2) * 0.28 + (r() - 0.5) * 0.2,
          flex: 0.6 + r() * 0.8,
        });
      }
      scn.tufts.push({ x, y, blades, alpha: 0.3 + r() * 0.22 });
    };
    // iarba din grădină (nu pe masa de lucru)
    for (let i = 0; i < 16; i++) {
      const x = r() * W;
      const y = H * (0.745 + r() * 0.245);
      if (x > W * 0.27 && x < W * 0.67 && y < H * 0.925) continue;
      make(x, y, false);
    }
    // iarbă mai înaltă la baza gardului
    for (let i = 0; i < 6; i++) {
      const x = r() * W;
      make(x, scn.groundY(x) + 1.5, true);
    }
    scn.grassGfx = add(this.add.graphics().setDepth(-10));
  }

  // ── copaci și tufișuri ────────────────────────────────────────────────────

  _bigTree(g, r, bx, by, h, fill) {
    const tw = h * 0.07;
    const L = [
      [bx - tw, by + 2],
      [bx - tw * 0.72, by - h * 0.2],
      [bx - tw * 0.55, by - h * 0.42],
      [bx - tw * 0.45, by - h * 0.6],
    ];
    const R = [
      [bx + tw * 0.45, by - h * 0.6],
      [bx + tw * 0.52, by - h * 0.42],
      [bx + tw * 0.7, by - h * 0.2],
      [bx + tw * 1.05, by + 2],
    ];
    g.fillStyle(0x111713, 1);
    g.fillPoints(this._polyPts([...L, ...R]), true);
    this._pencilPath(g, r, L, 1.3, 0.55, 0.5);
    this._pencilPath(g, r, R, 1.3, 0.45, 0.5);
    for (let i = 0; i < 4; i++) {
      const yy = by - h * (0.08 + r() * 0.4);
      const xx = bx + (r() - 0.5) * tw * 0.8;
      this._pencilSeg(
        g,
        r,
        xx,
        yy,
        xx + (r() - 0.5) * 2,
        yy - h * 0.06,
        1,
        PP_PENCIL,
        0.18,
        0.3,
      );
    }
    // ramuri
    this._pencilPath(
      g,
      r,
      [
        [bx - tw * 0.2, by - h * 0.44],
        [bx - h * 0.1, by - h * 0.56],
        [bx - h * 0.2, by - h * 0.62],
      ],
      1.5,
      0.5,
      0.5,
    );
    this._pencilPath(
      g,
      r,
      [
        [bx + tw * 0.2, by - h * 0.5],
        [bx + h * 0.09, by - h * 0.6],
        [bx + h * 0.19, by - h * 0.66],
      ],
      1.3,
      0.5,
      0.5,
    );

    // coroana: bucle pe marginea unei elipse; conturăm întâi, apoi umplem
    // puțin mai mic, ca să rămână doar silueta
    const cx = bx;
    const cy = by - h * 0.72;
    const RX = h * 0.27;
    const RY = h * 0.18;
    const lobes = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + r() * 0.2;
      const rr = h * (0.085 + r() * 0.045) * (Math.sin(a) > 0.3 ? 0.85 : 1);
      lobes.push({
        x: cx + Math.cos(a) * RX,
        y: cy + Math.sin(a) * RY,
        r: rr,
        a,
      });
    }
    // luna e în dreapta-sus: marginile de acolo sunt mai luminate
    for (const l of lobes) {
      const lit = Math.max(0, Math.cos(l.a + Math.PI / 4));
      this._pencilCircle(g, r, l.x, l.y, l.r, 1.2, PP_PENCIL, 0.3 + 0.35 * lit);
    }
    g.fillStyle(fill, 1);
    g.fillEllipse(cx, cy, RX * 2, RY * 2);
    for (const l of lobes) g.fillCircle(l.x, l.y, Math.max(1, l.r - 2));
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      this._pencilArc(
        g,
        r,
        cx + Math.cos(a) * RX * 0.85 * d,
        cy + Math.sin(a) * RY * 0.85 * d,
        h * 0.03,
        Math.PI * 1.1,
        Math.PI * 1.9,
        1,
        PP_PENCIL,
        0.13,
      );
    }
    return { cx, cy, rx: RX, ry: RY };
  }

  _roundTree(g, r, bx, by, h, fill, alpha) {
    const trunkH = h * 0.38;
    const tw = Math.max(2, h * 0.07);
    g.fillStyle(fill, 1);
    g.fillRect(bx - tw / 2, by - trunkH - 2, tw, trunkH + 2);
    this._pencilSeg(
      g,
      r,
      bx - tw / 2,
      by,
      bx - tw / 2 + 0.5,
      by - trunkH,
      1,
      PP_PENCIL,
      alpha,
      0.4,
    );
    this._pencilSeg(
      g,
      r,
      bx + tw / 2,
      by,
      bx + tw / 2 - 0.5,
      by - trunkH,
      1,
      PP_PENCIL,
      alpha,
      0.4,
    );
    const r0 = h * 0.26;
    const cy = by - trunkH - r0 * 0.55;
    const lobes = [
      [0, 0, 1],
      [-0.8, 0.3, 0.7],
      [0.82, 0.25, 0.74],
      [-0.3, -0.85, 0.72],
      [0.45, -0.72, 0.62],
    ].map(([ox, oy, k]) => [bx + ox * r0, cy + oy * r0, k * r0]);
    for (const [x, y, rr] of lobes)
      this._pencilCircle(g, r, x, y, rr, 1.1, PP_PENCIL, alpha);
    g.fillStyle(fill, 1);
    for (const [x, y, rr] of lobes) g.fillCircle(x, y, Math.max(1, rr - 1.8));
  }

  _poplar(g, r, bx, by, h, fill, alpha) {
    const w = h * 0.26;
    const left = [];
    const right = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = by - h * (0.08 + 0.92 * t);
      const hw =
        (w / 2) * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.75);
      left.push([bx - hw, y]);
      right.push([bx + hw, y]);
    }
    this._pencilSeg(g, r, bx, by, bx, by - h * 0.1, 1, PP_PENCIL, alpha, 0.3);
    g.fillStyle(fill, 1);
    g.fillPoints(this._polyPts([...left, ...right.slice().reverse()]), true);
    this._pencilPath(
      g,
      r,
      [...left, ...right.slice().reverse()],
      1.1,
      alpha,
      0.4,
    );
  }

  _bush(g, r, bx, groundFn, h, fill, alpha) {
    const lobes = [
      [-h * 0.9, h * 0.25, h * 0.62],
      [0, h * 0.05, h * 0.88],
      [h * 0.85, h * 0.3, h * 0.58],
    ].map(([ox, oy, rr]) => ({
      x: bx + ox,
      y: groundFn(bx + ox) + 2 + oy,
      r: rr,
      oy,
    }));
    for (const l of lobes) {
      const cut = Math.asin(Math.min(0.9, l.oy / l.r));
      this._pencilArc(
        g,
        r,
        l.x,
        l.y,
        l.r,
        Math.PI + cut,
        Math.PI * 2 - cut,
        1.1,
        PP_PENCIL,
        alpha,
      );
    }
    g.fillStyle(fill, 1);
    for (const l of lobes) g.fillCircle(l.x, l.y, Math.max(1, l.r - 1.6));
  }

  // ── creionul: primitive desenate "de mână" ────────────────────────────────

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  _sketchSeg(rnd, x1, y1, x2, y2, mag) {
    const pts = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      const off = (rnd() - 0.5) * 2 * mag;
      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  _drawPath(g, pts, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < pts.length - 1; i++)
      g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }

  // linia principală + o umbră fină decalată, ca la creion
  _pencilSeg(g, rnd, x1, y1, x2, y2, width, color, alpha, mag = 2) {
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1, y1, x2, y2, mag),
      width,
      color,
      alpha,
    );
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1 + 1.2, y1 + 1, x2 + 1.2, y2 + 1, mag),
      width * 0.6,
      color,
      alpha * 0.35,
    );
  }

  _pencilPath(g, rnd, pts, width, alpha, mag = 0.6) {
    for (let i = 1; i < pts.length; i++)
      this._pencilSeg(
        g,
        rnd,
        pts[i - 1][0],
        pts[i - 1][1],
        pts[i][0],
        pts[i][1],
        width,
        PP_PENCIL,
        alpha,
        mag,
      );
  }

  _pencilRect(g, rnd, x, y, w, h, width, color, alpha, mag = 2) {
    const o = 4; // corner overshoot
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(
      g,
      rnd,
      x + w,
      y - o,
      x + w,
      y + h + o,
      width,
      color,
      alpha,
      mag,
    );
    this._pencilSeg(
      g,
      rnd,
      x + w + o,
      y + h,
      x - o,
      y + h,
      width,
      color,
      alpha,
      mag,
    );
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = Math.max(14, Math.round(r * 0.9));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.2;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _pencilArc(g, rnd, cx, cy, r, a0, a1, width, color, alpha) {
    const steps = Math.max(6, Math.ceil((Math.abs(a1 - a0) * r) / 6));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const jr = r + (rnd() - 0.5) * 1.2;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  _polyPts(arr) {
    return arr.map(([x, y]) => ({ x, y }));
  }

  _ellipsePts(cx, cy, rx, ry, ang = 0, n = 14) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      pts.push({ x: cx + ex * c - ey * s, y: cy + ex * s + ey * c });
    }
    return pts;
  }

  _leafPts(x, y, len, wid, ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const P = (lx, ly) => ({ x: x + lx * c - ly * s, y: y + lx * s + ly * c });
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push(P(t * len, -wid * Math.sin(Math.PI * t) * (1 - 0.25 * t)));
    }
    for (let i = 7; i >= 1; i--) {
      const t = i / 8;
      pts.push(P(t * len, wid * 0.8 * Math.sin(Math.PI * t) * (1 - 0.25 * t)));
    }
    return pts;
  }

  // curbă netedă (Catmull-Rom) prin puncte
  _catmull(pts, n = 8) {
    const out = [];
    const f = (a, b, c, d, t) => {
      const t2 = t * t;
      const t3 = t2 * t;
      return (
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3)
      );
    };
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < n; j++) {
        const t = j / n;
        out.push({
          x: f(p0.x, p1.x, p2.x, p3.x, t),
          y: f(p0.y, p1.y, p2.y, p3.y, t),
        });
      }
    }
    out.push({ ...pts[pts.length - 1] });
    return out;
  }

  _pathEdgeX(edge, y) {
    for (let i = 0; i < edge.length - 1; i++) {
      const a = edge[i];
      const b = edge[i + 1];
      if ((y >= a.y && y <= b.y) || (y >= b.y && y <= a.y)) {
        const t = (y - a.y) / (b.y - a.y || 1);
        return a.x + (b.x - a.x) * t;
      }
    }
    return null;
  }

  _inPath(scn, x, y, pad = 0) {
    const xl = this._pathEdgeX(scn.pathL, y);
    const xr = this._pathEdgeX(scn.pathR, y);
    return xl !== null && xr !== null && x > xl - pad && x < xr + pad;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PUZZLE-UL (neschimbat)
  // ══════════════════════════════════════════════════════════════════════════

  triggerPour() {
    if (this.isSolved || this.isAnimating || this.currentStep >= 5) return;
    this.isAnimating = true;
    this.input.setDraggable(this.bucketContainer, false);
    if (this.cache.audio.exists("wateringplant")) {
      this.sound.play("wateringplant", { volume: 1 });
    }
    this.pourAndGrow();
  }

  // puncte de-a lungul unei curbe Bézier pătratice
  _qPts(x0, y0, cx, cy, x1, y1, n = 14) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: this.qBez(t, x0, cx, x1), y: this.qBez(t, y0, cy, y1) });
    }
    return pts;
  }

  drawPot(g) {
    g.clear();

    // ── culoarea: lut ars (teracotă), sub conturul alb ──
    // corpul ghiveciului
    const body = [
      ...this._qPts(-55, 50, 0, 65, 55, 50),
      ...this._qPts(55, 50, 45, 110, 30, 150).slice(1),
      ...this._qPts(30, 150, 0, 160, -30, 150).slice(1),
      ...this._qPts(-30, 150, -45, 110, -55, 50).slice(1),
    ];
    g.fillStyle(0x9a5232, 1);
    g.fillPoints(body, true);
    // umbră pe partea dreaptă, pentru volum
    g.fillStyle(0x6e3820, 0.55);
    g.fillPoints(
      [
        ...this._qPts(55, 50, 45, 110, 30, 150),
        ...this._qPts(18, 152, 32, 110, 40, 58),
      ],
      true,
    );
    // lumină pe partea stângă
    g.lineStyle(5, 0xcf8358, 0.3);
    const hi = this._qPts(-42, 72, -36, 110, -24, 144);
    for (let i = 1; i < hi.length; i++)
      g.lineBetween(hi[i - 1].x, hi[i - 1].y, hi[i].x, hi[i].y);
    // pământul din ghiveci
    g.fillStyle(0x2b1d15, 1);
    g.fillPoints(
      [
        ...this._qPts(-55, 50, 0, 35, 55, 50),
        ...this._qPts(55, 50, 0, 65, -55, 50).slice(1),
      ],
      true,
    );
    g.fillStyle(0x4a3526, 0.8);
    for (const [px, py] of [
      [-30, 48],
      [-12, 45],
      [22, 47],
      [36, 51],
      [-38, 52],
    ])
      g.fillCircle(px, py, 1.4);

    g.lineStyle(1.2, 0xffffff, 0.7);
    const sketchCurve = (x0, y0, cx, cy, x1, y1) => {
      const d = (ox, oy, dcx, dcy, alphaMod) => {
        g.lineStyle(1.2, 0xffffff, 0.7 * alphaMod);
        g.beginPath();
        g.moveTo(x0 + ox, y0 + oy);
        for (let i = 1; i <= 12; i++) {
          let t = i / 12;
          g.lineTo(
            this.qBez(t, x0 + ox, cx + dcx, x1 + ox),
            this.qBez(t, y0 + oy, cy + dcy, y1 + oy),
          );
        }
        g.strokePath();
      };
      d(0, 0, 0, 0, 1);
      d(-1, 1, 1, -1, 0.6);
      d(1, -1, -1, 1, 0.4);
    };
    sketchCurve(-55, 50, 0, 35, 55, 50);
    sketchCurve(-55, 50, 0, 65, 55, 50);
    sketchCurve(-45, 55, 0, 62, 45, 55);
    sketchCurve(-55, 50, -45, 110, -30, 150);
    sketchCurve(55, 50, 45, 110, 30, 150);
    sketchCurve(-30, 150, 0, 160, 30, 150);
  }

  // buza ghiveciului: stă în fața tulpinii, deci planta pare înfiptă în pământ
  drawPotRim(g) {
    g.clear();
    const band = [
      ...this._qPts(-55, 50, 0, 65, 55, 50),
      ...this._qPts(52.9, 62, 0, 77, -52.9, 62),
    ];
    g.fillStyle(0xb3643d, 1);
    g.fillPoints(band, true);
    const stroke = (pts, alpha) => {
      g.lineStyle(1.2, 0xffffff, alpha);
      for (let i = 1; i < pts.length; i++)
        g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    };
    stroke(this._qPts(-55, 50, 0, 65, 55, 50), 0.7);
    stroke(this._qPts(-54, 51, 1, 64, 56, 49), 0.3);
    stroke(this._qPts(-52.9, 62, 0, 77, 52.9, 62), 0.45);
  }

  drawBucket(gOutline, gWater, waterRatio) {
    gOutline.clear();
    gWater.clear();
    gOutline.lineStyle(1.2, 0xffffff, 0.7);
    const sketchCurve = (x0, y0, cx, cy, x1, y1) => {
      const d = (ox, oy, dcx, dcy, alphaMod) => {
        gOutline.lineStyle(1.2, 0xffffff, 0.7 * alphaMod);
        gOutline.beginPath();
        gOutline.moveTo(x0 + ox, y0 + oy);
        for (let i = 1; i <= 12; i++) {
          let t = i / 12;
          gOutline.lineTo(
            this.qBez(t, x0 + ox, cx + dcx, x1 + ox),
            this.qBez(t, y0 + oy, cy + dcy, y1 + oy),
          );
        }
        gOutline.strokePath();
      };
      d(0, 0, 0, 0, 1);
      d(-1, 1, 1, -1, 0.6);
      d(1, -1, -1, 1, 0.4);
    };
    sketchCurve(-38, -35, 0, -100, 38, -35);
    gOutline.fillStyle(0xffffff, 0.8);
    gOutline.fillCircle(-38, -35, 3.5);
    gOutline.fillCircle(38, -35, 3.5);
    sketchCurve(-38, -35, 0, -20, 38, -35);
    sketchCurve(-38, -35, 0, -14, 38, -35);
    sketchCurve(-38, -35, 0, -50, 38, -35);
    sketchCurve(-38, -35, -34, 10, -26, 45);
    sketchCurve(38, -35, 34, 10, 26, 45);
    sketchCurve(-26, 45, 0, 58, 26, 45);
    sketchCurve(-26, 45, 0, 32, 26, 45);
    gOutline.lineStyle(1, 0xffffff, 0.3);
    sketchCurve(-28, -25, -24, 10, -18, 35);
    gOutline.lineStyle(1, 0xffffff, 0.15);
    sketchCurve(28, -25, 24, 10, 18, 35);

    if (waterRatio > 0.02) {
      let wH = 80 * waterRatio;
      let wY = 45 - wH;
      let t = (45 - wY) / 80;
      let wX = 26 + t * 12;
      gWater.fillStyle(0x00e5ff, 0.55);
      gWater.beginPath();
      gWater.moveTo(-wX, wY);
      gWater.lineTo(wX, wY);
      gWater.lineTo(26, 45);
      for (let i = 1; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(this.qBez(ct, 26, 0, -26), this.qBez(ct, 45, 58, 45));
      }
      gWater.closePath();
      gWater.fillPath();
      gWater.fillStyle(0x00e5ff, 0.9);
      gWater.beginPath();
      for (let i = 0; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(
          this.qBez(ct, -wX, 0, wX),
          this.qBez(ct, wY, wY + wX * 0.35, wY),
        );
      }
      for (let i = 0; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(
          this.qBez(ct, wX, 0, -wX),
          this.qBez(ct, wY, wY - wX * 0.35, wY),
        );
      }
      gWater.closePath();
      gWater.fillPath();
      gWater.lineStyle(1, 0xffffff, 0.4);
      gWater.beginPath();
      gWater.moveTo(-wX + 4, wY + wX * 0.1);
      for (let i = 1; i <= 10; i++) {
        let ct = i / 10;
        gWater.lineTo(
          this.qBez(ct, -wX + 4, 0, wX - 4),
          this.qBez(ct, wY + wX * 0.1, wY + wX * 0.3, wY + wX * 0.1),
        );
      }
      gWater.strokePath();
    }
  }

  qBez(t, p0, cp, p1) {
    const mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * cp + t * t * p1;
  }

  getSegPoint(seg, t) {
    const cp = seg.cp || { x: seg.to.x, y: seg.from.y };
    return {
      x: this.qBez(t, seg.from.x, cp.x, seg.to.x),
      y: this.qBez(t, seg.from.y, cp.y, seg.to.y),
    };
  }

  drawSegment(gfx, seg, progress, lineWidth) {
    gfx.clear();
    const cp = seg.cp || { x: seg.to.x, y: seg.from.y };
    const STEPS = 60;
    gfx.fillStyle(0x6d4c41, 1);
    for (let s = 0; s <= STEPS; s++) {
      const t = (s / STEPS) * progress;
      const x = this.qBez(t, seg.from.x, cp.x, seg.to.x);
      const y = this.qBez(t, seg.from.y, cp.y, seg.to.y);
      const currentWidth = lineWidth * (1 - t * 0.4);
      gfx.fillCircle(x, y, currentWidth / 2);
    }
  }

  pourAndGrow() {
    const step = this.currentStep;
    this.tweens.addCounter({
      from: 1 - step / 5,
      to: 1 - (step + 1) / 5,
      duration: 1200,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        this.drawBucket(this.bucketGfx, this.waterFillGfx, tween.getValue());
      },
    });
    const pourLocalX = this.plantContainer.x + 45;
    const pourLocalY = this.plantContainer.y - 15;
    this.tweens.add({
      targets: this.bucketContainer,
      angle: -80,
      x: pourLocalX,
      y: pourLocalY,
      duration: 400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: this.bucketContainer,
            angle: 0,
            x: this.BUCKET_HOME_X,
            y: this.BUCKET_HOME_Y,
            duration: 400,
            ease: "Sine.easeInOut",
            onComplete: () => {
              this.canPour = true;
            },
          });
        });
      },
    });
    this.time.delayedCall(400, () => {
      let dropsPoured = 0;
      this.time.addEvent({
        delay: 15,
        repeat: 55,
        callback: () => {
          let rad = Phaser.Math.DegToRad(this.bucketContainer.angle);
          let cos = Math.cos(rad);
          let sin = Math.sin(rad);
          let lipLocalX = this.bucketContainer.x + (-38 * cos - -35 * sin);
          let lipLocalY = this.bucketContainer.y + (-38 * sin + -35 * cos);
          const dropGfx = this.add.graphics();
          dropGfx.fillStyle(0x00e5ff, 0.9);
          dropGfx.fillEllipse(
            0,
            0,
            Phaser.Math.Between(3, 5),
            Phaser.Math.Between(6, 12),
          );
          dropGfx.setPosition(
            lipLocalX + Phaser.Math.Between(-5, 5),
            lipLocalY + Phaser.Math.Between(-5, 5),
          );
          dropGfx.rotation = Phaser.Math.DegToRad(
            -15 + Phaser.Math.Between(-5, 5),
          );
          this.mainContainer.add(dropGfx);
          const targetX = this.plantContainer.x + Phaser.Math.Between(-15, 15);
          const targetY = this.plantContainer.y + 55;
          this.tweens.add({
            targets: dropGfx,
            x: targetX,
            duration: 350 + Phaser.Math.Between(0, 100),
            ease: "Linear",
          });
          this.tweens.add({
            targets: dropGfx,
            y: targetY,
            duration: 350 + Phaser.Math.Between(0, 100),
            ease: "Quad.easeIn",
            alpha: { from: 1, to: 0 },
            onComplete: () => {
              dropGfx.destroy();
              dropsPoured++;
              if (dropsPoured === 56) {
                this.growCurrentSegment(step);
              }
            },
          });
        },
      });
    });
  }

  growCurrentSegment(step) {
    const seg = this.segments[step];
    const gfx = this.segGfx[step];
    const lw = this.segWidths[step];
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 800,
      ease: "Sine.easeOut",
      onUpdate: (tween) => {
        this.drawSegment(gfx, seg, tween.getValue(), lw);
      },
      onComplete: () => {
        this.drawSegment(gfx, seg, 1, lw);
        this.spawnLeaves(step, () => {
          this.currentStep++;
          if (this.currentStep >= 5) {
            this.finishLevel();
          } else {
            this.isAnimating = false;
          }
        });
      },
    });
  }

  spawnLeaves(step, onDone) {
    const defs = this.leafDefs[step];
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const seg = this.segments[d.segIdx];
      const pos = this.getSegPoint(seg, d.t);
      const leafImg = this.add.image(pos.x + d.ox, pos.y + d.oy, "leaf");
      const BASE_SCALE = 0.17;
      const ANGLE_OFFSET = -45;
      leafImg.setOrigin(0.05, 0.95);
      leafImg.setAngle(d.angle + ANGLE_OFFSET);
      leafImg.baseAngle = d.angle + ANGLE_OFFSET;
      leafImg.setScale(0);
      leafImg.setInteractive({ cursor: "pointer" });
      leafImg.on("pointerdown", () => {
        if (leafImg.isSwinging) return;
        leafImg.isSwinging = true;
        this.tweens.add({
          targets: leafImg,
          angle: leafImg.baseAngle + Phaser.Math.Between(12, 22),
          duration: 150,
          yoyo: true,
          repeat: 1,
          ease: "Sine.easeInOut",
          onComplete: () => {
            leafImg.angle = leafImg.baseAngle;
            leafImg.isSwinging = false;
          },
        });
      });
      this.plantContainer.addAt(leafImg, 0);
      const finalScale = (d.scale || 1) * BASE_SCALE;
      this.tweens.add({
        targets: leafImg,
        scaleX: finalScale,
        scaleY: finalScale,
        duration: 500,
        delay: i * 220,
        ease: "Back.easeOut",
      });
    }
    const totalDelay = (defs.length - 1) * 220 + 510;
    this.time.delayedCall(totalDelay, () => {
      this.input.setDraggable(this.bucketContainer, true);
      onDone();
    });
  }

  finishLevel() {
    this.isSolved = true;
    this.statusText.setText(
      "Nature's sequence is complete. Whose name does it bear?",
    );
    this.statusText.setColor("#1aaf7a");
    // mică recompensă: trece o stea căzătoare
    if (this._scn && !this._scn.shoot) this._launchShootingStar();
  }

  transitionToLevel(levelKey, skipFade = false) {
    if (levelKey === this.scene.key && skipFade) {
      this.scene.restart({ skipFade: true });
      return;
    }
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (window.playSuccess) window.playSuccess(this);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const fadeOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0, 0)
      .setDepth(100)
      .setAlpha(0);
    const nextLvlText = this.add
      .text(
        width / 2,
        height / 2,
        "Level " + this._levelNumber(levelKey) + "...",
        {
          fontFamily: '"Special Elite", monospace',
          fontSize: "48px",
          color: "#ffffff",
        },
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setAlpha(0);
    this.tweens.add({
      targets: [fadeOverlay, nextLvlText],
      alpha: 1,
      duration: 1000,
      onComplete: () => {
        this.scene.start(levelKey, { skipFade: false });
      },
    });
  }

  shutdown() {
    if (this._onResize) this.events.off("canvas_resized", this._onResize);
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._scn = null;
  }
}
