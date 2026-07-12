// ─────────────────────────────────────────────────────────────────────────────
// Level — "TELESCOPE"  ·  code: ORION  ·  hard  ·  TOOL (Braille alphabet)
//
// PHASE 1 (ROOM): the image assets/images/Telescope/Telescope.jpg with a slow
//   breathing zoom, cinematic vignette and a subtle prompt.
//   Click anywhere → transition (zoom + lens iris) into the sky.
// PHASE 2 (SKY): looking through the eyepiece. Pan a 2.6x2.0-screen sky with
//   inertia, mouse-wheel zoom, a Milky Way band, a cratered moon, slow
//   drifting night clouds (TelescopeDesign look), decoy constellations wired
//   with star-chart lines, twinkling stars and frequent shooting stars.
//   Connected (wired) stars use a sharp 4-point sparkle design — no halo.
//   Hidden among them: 5 star groups that LOOK like constellations but whose
//   stars align on perfect 2x3 grids — Braille cells spelling O·R·I·O·N.
//
//   O = 1,3,5   R = 1,2,3,5   I = 2,4   O = 1,3,5   N = 1,3,4,5  →  ORION
//   (cell numbering:  1 4 / 2 5 / 3 6)
//
// Drop-in replacement: keeps the scene key, GAME_LEVELS, initGlobalAudio,
// GameAudio, replay(), transitionToLevel(), canvas_resized.
// ─────────────────────────────────────────────────────────────────────────────

const BRAILLE = {
  A: [1],
  B: [1, 2],
  C: [1, 4],
  D: [1, 4, 5],
  E: [1, 5],
  F: [1, 2, 4],
  G: [1, 2, 4, 5],
  H: [1, 2, 5],
  I: [2, 4],
  J: [2, 4, 5],
  K: [1, 3],
  L: [1, 2, 3],
  M: [1, 3, 4],
  N: [1, 3, 4, 5],
  O: [1, 3, 5],
  P: [1, 2, 3, 4],
  Q: [1, 2, 3, 4, 5],
  R: [1, 2, 3, 5],
  S: [2, 3, 4],
  T: [2, 3, 4, 5],
  U: [1, 3, 6],
  V: [1, 2, 3, 6],
  W: [2, 4, 5, 6],
  X: [1, 3, 4, 6],
  Y: [1, 3, 4, 5, 6],
  Z: [1, 3, 5, 6],
};

// dot number -> [col(-1|+1), row(-1|0|+1)]
const BRAILLE_DOT_POS = {
  1: [-1, -1],
  2: [-1, 0],
  3: [-1, 1],
  4: [1, -1],
  5: [1, 0],
  6: [1, 1],
};

// Gameplay / atmosphere tuning — everything you might want to tweak is here.
const TUNE = {
  WORLD_W: 2.6, // sky width, in screens
  WORLD_H: 2.0, // sky height, in screens
  SCOPE_R: 0.43, // eyepiece radius as a fraction of min(W,H) — a bit bigger
  STAR_DENSITY: 78, // decorative stars per screen
  MILKYWAY_STARS: 340, // tiny stars in the Milky Way band
  DECOY_COUNT: 5, // decoy constellations (lines, irregular shapes)
  ZOOM_MIN: 1.0,
  ZOOM_MAX: 1.6,
  INERTIA_DAMP: 0.9, // pan braking after release
  DECOY_LINE_ALPHA: 0.06, // decoy constellation lines — barely there, unimportant
  CELL_LINE_ALPHA: 0.5, // Braille-cell lines — the only strong connections
  TWINKLE: 1.7, // global multiplier on star twinkle amplitude (higher = sparklier)
  MOON_POS: [0.84, 0.16], // moon center, as fractions of the sky world
  MOON_SIZE: 0.3, // moon diameter as a fraction of min(W,H)
  CLOUD_COUNT: 9, // drifting night clouds (TelescopeDesign look)
  CLOUD_SPEED: [6, 20], // horizontal drift in px/s (min, max)
  METEOR_EVERY: [2400, 6500], // ms between shooting stars (min, max)
  METEOR_BURST: 0.4, // chance a spawn brings a second meteor
  FOCUS_TIME: 1.5, // seconds for the "eye adjusting" defocus → focus
};

const PHASE = { ROOM: 0, TRANSITION: 1, SKY: 2 };

class TelescopeScene extends Phaser.Scene {
  constructor() {
    super({ key: "Telescope" });
  }

  init(data) {
    this.skipFadeIn =
      data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
    this.load.image("telescope_room", "assets/images/Telescope/Telescope.jpg");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    const cfg = (window.GAME_LEVELS || []).find((l) => l.key === "Telescope");
    this.ANSWER = cfg && cfg.code ? cfg.code.toUpperCase() : "ORION";

    this.isSolved = false;
    this.phase = PHASE.ROOM;

    this._dragging = false;
    this._velX = 0;
    this._velY = 0;
    this._zoom = 1;
    this._focus = 0; // 1 = fully defocused, 0 = sharp
    this._lastCreak = 0;
    this._amb = null;
    this._cricketTimer = null;
    this._meteors = [];
    this._nextMeteor = 0;

    this._W = this.cameras.main.width;
    this._H = this.cameras.main.height;

    this._buildRoom(true);
    this._startAmbient();

    this.input.on("pointerdown", (p) => this._onDown(p));
    this.input.on("pointermove", (p) => this._onMove(p));
    this.input.on("pointerup", () => this._onUp());
    this.input.on("pointerupoutside", () => this._onUp());
    this.input.on("wheel", (p, objs, dx, dy) => this._onWheel(dy));

    this.events.on("canvas_resized", ({ width, height }) => {
      this._W = width;
      this._H = height;
      const wasSky = this.phase !== PHASE.ROOM;
      this._teardown();
      if (wasSky) {
        this._buildSky(1);
        this._focus = 0;
      } else this._buildRoom(true);
    });
  }

  // ── PHASE 1 · The room with the telescope ─────────────────────────────────

  _buildRoom(fadeIn) {
    this.phase = PHASE.ROOM;
    this.input.setDefaultCursor("pointer");
    const W = this._W,
      H = this._H;

    this._room = this.add.container(0, 0).setDepth(1);

    // safety backdrop
    const bg = this.add.graphics();
    bg.fillStyle(0x04050a, 1).fillRect(0, 0, W, H);
    this._room.add(bg);

    if (this.textures.exists("telescope_room")) {
      const img = this.add.image(W / 2, H / 2, "telescope_room");
      const src = this.textures.get("telescope_room").getSourceImage();
      const cover = Math.max(W / src.width, H / src.height);
      img.setScale(cover);
      this._room.add(img);
      this._roomImg = img;
      this._roomBaseScale = cover;

      // slow breathing zoom — the room feels alive
      this._breath = this.tweens.add({
        targets: img,
        scale: cover * 1.035,
        duration: 9000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      this._roomImg = null;
      this._drawRoomFallback(W, H);
    }

    // cinematic edge vignette
    const vg = this.add.graphics();
    const v = Math.min(W, H) * 0.22;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.85,
      0.85,
      0,
      0,
    );
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0,
      0.85,
      0.85,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.7,
      0,
      0.7,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.7,
      0,
      0.7,
    );
    vg.fillRect(W - v, 0, v, H);
    this._room.add(vg);

    // subtle prompt, fades in after 1.6s and keeps pulsing
    const hint = this.add
      .text(W / 2, H * 0.92, "Look at your fingers", {
        fontFamily: '"Courier New", monospace',
        fontSize: Math.max(14, Math.round(Math.min(W, H) * 0.024)) + "px",
        color: "#cfd8ea",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this._room.add(hint);
    this.tweens.add({
      targets: hint,
      alpha: 0.55,
      delay: 1600,
      duration: 900,
      onComplete: () =>
        this.tweens.add({
          targets: hint,
          alpha: 0.2,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        }),
    });

    if (fadeIn && !this.skipFadeIn) {
      this._room.setAlpha(0);
      this.tweens.add({ targets: this._room, alpha: 1, duration: 700 });
    }
  }

  // simple painted fallback if the image is missing (never a blank screen)
  _drawRoomFallback(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a1226, 0x0a1226, 0x030509, 0x030509, 1);
    g.fillRect(0, 0, W, H);
    // window with sky
    const wx = W * 0.18,
      wy = H * 0.12,
      ww = W * 0.42,
      wh = H * 0.55;
    g.fillStyle(0x0d1b3a, 1).fillRoundedRect(wx, wy, ww, wh, 10);
    g.lineStyle(6, 0x1c1610, 1).strokeRoundedRect(wx, wy, ww, wh, 10);
    g.lineBetween(wx + ww / 2, wy, wx + ww / 2, wy + wh);
    g.lineBetween(wx, wy + wh / 2, wx + ww, wy + wh / 2);
    for (let i = 0; i < 40; i++) {
      g.fillStyle(0xffffff, 0.3 + Math.random() * 0.6);
      g.fillCircle(
        wx + 8 + Math.random() * (ww - 16),
        wy + 8 + Math.random() * (wh - 16),
        0.6 + Math.random() * 1.2,
      );
    }
    // telescope silhouette
    g.fillStyle(0x11100d, 1);
    g.save();
    g.translateCanvas(W * 0.62, H * 0.58);
    g.rotateCanvas(-0.55);
    g.fillRoundedRect(-W * 0.02, -H * 0.24, W * 0.045, H * 0.34, 8);
    g.restore();
    g.lineStyle(7, 0x11100d, 1);
    g.lineBetween(W * 0.62, H * 0.62, W * 0.56, H * 0.9);
    g.lineBetween(W * 0.62, H * 0.62, W * 0.68, H * 0.9);
    g.lineBetween(W * 0.62, H * 0.62, W * 0.62, H * 0.92);
    this._room.add(g);
  }

  // ── Transition: room → sky ────────────────────────────────────────────────

  _enterSky() {
    if (this.phase !== PHASE.ROOM) return;
    this.phase = PHASE.TRANSITION;
    this.input.setDefaultCursor("default");

    if (window.GameAudio && !window.GameAudio.muted) {
      const s = this.sound.get("ui_click") || this.sound.add("ui_click");
      s.play({ volume: (window.GameAudio.sfxVol || 0.8) * 0.8 });
    }
    this._whoosh();

    if (this._breath) {
      this._breath.stop();
      this._breath = null;
    }

    // zoom toward the center + fade — "leaning into the eyepiece"
    if (this._roomImg) {
      this.tweens.add({
        targets: this._roomImg,
        scale: this._roomBaseScale * 1.55,
        duration: 750,
        ease: "Cubic.easeIn",
      });
    }
    this.tweens.add({
      targets: [this._room],
      alpha: 0,
      duration: 750,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this._room.destroy(true);
        this._room = null;
        this._roomImg = null;
        this._buildSky(0); // start with the iris closed
        const iris = { r: 0 };
        this.tweens.add({
          targets: iris,
          r: 1,
          duration: 800,
          ease: "Cubic.easeOut",
          onUpdate: () => this._setIris(iris.r),
          onComplete: () => {
            this._setIris(1);
            this.phase = PHASE.SKY;
            this._focus = 1; // eye adjusting: blurry → sharp
            this.input.setDefaultCursor("grab");
            this._showSkyHint();
          },
        });
      },
    });
  }

  _exitSky() {
    if (this.phase !== PHASE.SKY) return;
    this.phase = PHASE.TRANSITION;
    this.input.setDefaultCursor("default");
    this._whoosh(true);
    const iris = { r: 1 };
    this.tweens.add({
      targets: iris,
      r: 0,
      duration: 550,
      ease: "Cubic.easeIn",
      onUpdate: () => this._setIris(iris.r),
      onComplete: () => {
        this._teardown();
        this._buildRoom(false);
        this._room.setAlpha(0);
        this.tweens.add({ targets: this._room, alpha: 1, duration: 600 });
      },
    });
  }

  // ── PHASE 2 · The sky through the eyepiece ────────────────────────────────

  _buildSky(irisT) {
    const W = this._W,
      H = this._H;
    const R = Math.min(W, H) * TUNE.SCOPE_R;
    const cx = W / 2,
      cy = H * 0.46;
    this._scope = { cx, cy, R };
    this._zoom = 1;
    this._velX = 0;
    this._velY = 0;
    this._meteors = [];
    this._nextMeteor = this.time.now + 900; // first meteor arrives quickly

    const worldW = W * TUNE.WORLD_W,
      worldH = H * TUNE.WORLD_H;
    this._world = { w: worldW, h: worldH };

    // black housing of the eyepiece
    this.add.graphics().setDepth(0).fillStyle(0x030407, 1).fillRect(0, 0, W, H);

    // pannable container, visible only through the circular mask
    this._sky = this.add
      .container((W - worldW) / 2, (H - worldH) / 2)
      .setDepth(1);
    this._starGfx = this.add.graphics();
    this._sky.add(this._starGfx);

    this._maskG = this.add.graphics().setVisible(false);
    this._sky.setMask(this._maskG.createGeometryMask());

    this._scopeGfx = this.add.graphics().setDepth(2);
    this._setIris(irisT);

    this._makeSkyContents(W, H, worldW, worldH);
    this._drawBackButton(W, H);

    if (this.phase !== PHASE.TRANSITION) {
      this.phase = PHASE.SKY;
      this.input.setDefaultCursor("grab");
    }
  }

  // iris: t∈[0..1] — mask + bezel drawn at the current radius
  _setIris(t) {
    if (!this._scope || !this._maskG) return;
    const { cx, cy, R } = this._scope;
    const r = Math.max(1, R * t);
    this._maskG.clear();
    this._maskG.fillStyle(0xffffff, 1).fillCircle(cx, cy, r);
    this._drawScope(cx, cy, r, t);
  }

  _drawScope(cx, cy, R, t) {
    const g = this._scopeGfx;
    g.clear();

    // vignette hugging the rim — darkest at the very edge, clear center
    // (keeps the view clean even when the bright moon slides under it)
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      const rr = R * (0.86 + 0.14 * k);
      g.lineStyle(R * 0.035, 0x000000, 0.03 + k * k * 0.3);
      g.strokeCircle(cx, cy, rr);
    }

    // faint chromatic aberration right at the edge — lens realism
    g.lineStyle(1.4, 0x6f8dff, 0.2).strokeCircle(cx, cy, R * 0.985);
    g.lineStyle(1.2, 0xff9a5e, 0.14).strokeCircle(cx, cy, R * 0.965);

    // fine reticle (only once the iris is mostly open)
    if (t > 0.5) {
      const a = (t - 0.5) * 2;
      g.lineStyle(1, 0x9fb4d0, 0.14 * a);
      g.lineBetween(cx - R * 0.9, cy, cx + R * 0.9, cy);
      g.lineBetween(cx, cy - R * 0.9, cx, cy + R * 0.9);
      g.lineStyle(1, 0x9fb4d0, 0.26 * a);
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = Phaser.Math.DegToRad(deg);
        const r1 = R * 0.14,
          r2 = R * 0.19;
        g.lineBetween(
          cx + Math.cos(rad) * r1,
          cy + Math.sin(rad) * r1,
          cx + Math.cos(rad) * r2,
          cy + Math.sin(rad) * r2,
        );
      }
    }

    // brass bezel
    g.lineStyle(R * 0.11, 0x241f14, 1);
    g.strokeCircle(cx, cy, R + R * 0.055);
    g.lineStyle(R * 0.06, 0x6a5a34, 1);
    g.strokeCircle(cx, cy, R + R * 0.02);
    g.lineStyle(2, 0xa89252, 0.7);
    g.strokeCircle(cx, cy, R + R * 0.085);
    // bezel glint
    g.lineStyle(2, 0xe8d9a0, 0.35);
    g.beginPath();
    g.arc(
      cx,
      cy,
      R + R * 0.02,
      Phaser.Math.DegToRad(200),
      Phaser.Math.DegToRad(250),
    );
    g.strokePath();
  }

  // ── Sky contents ──────────────────────────────────────────────────────────

  _makeSkyContents(W, H, worldW, worldH) {
    this._stars = [];
    this._decoys = [];
    this._cells = [];

    const scaleRef = Math.min(W, H);
    // roomier cells → they read as small constellations, not tight blobs
    const dx = scaleRef * 0.066;
    const dy = scaleRef * 0.058;
    const rSignal = Math.max(1.9, scaleRef * 0.0044);
    this._clearR = Math.max(dx, dy) * 2.8;

    // the moon lives here (world coords) — nothing important may hide under it
    const moonR = (scaleRef * TUNE.MOON_SIZE) / 2;
    const moonX = worldW * TUNE.MOON_POS[0],
      moonY = worldH * TUNE.MOON_POS[1];
    const nearMoon = (x, y, pad) =>
      (x - moonX) ** 2 + (y - moonY) ** 2 < (moonR * (pad || 1.5)) ** 2;

    // 1) the Braille cells — spread left→right, in reading order.
    //    Rendered exactly like decoy constellations (lines + varied stars),
    //    so only the perfect 2x3 alignment gives them away.
    const letters = this.ANSWER.split("");
    const n = letters.length;
    letters.forEach((ch, i) => {
      const cxw = Phaser.Math.Linear(
        worldW * 0.22,
        worldW * 0.78,
        n > 1 ? i / (n - 1) : 0.5,
      );
      const cyw = worldH * 0.5 + Math.sin(i * 1.35 + 0.6) * worldH * 0.21;

      const pts = (BRAILLE[ch] || []).map((num) => {
        const [c, r] = BRAILLE_DOT_POS[num];
        return { x: cxw + (c * dx) / 2, y: cyw + r * dy };
      });

      this._cells.push({
        cx: cxw,
        cy: cyw,
        pts: this._constellationPath(pts),
        reveal: 0, // lines draw themselves only while the reticle rests here
        r: this._clearR * 1.15,
      });

      pts.forEach((p, k) => {
        this._stars.push({
          x: p.x,
          y: p.y,
          r: rSignal * (0.9 + (((k * 37 + i * 13) % 10) / 10) * 0.45), // varied sizes
          base: 0.9,
          amp: 0.1,
          spd: 1.3,
          phase: 0, // synced, subtle pulse
          tint: k % 3 === 0 ? 0xeaf4ff : 0xffffff, // crisp icy white
          signal: true,
        });
      });
    });

    // 2) Milky Way — a diagonal band of tiny stars
    const mwA = { x: 0, y: worldH * 0.72 },
      mwB = { x: worldW, y: worldH * 0.24 };
    for (let k = 0; k < TUNE.MILKYWAY_STARS; k++) {
      const t = Math.random();
      const gx = Phaser.Math.Linear(mwA.x, mwB.x, t);
      const gy =
        Phaser.Math.Linear(mwA.y, mwB.y, t) +
        (Math.random() + Math.random() + Math.random() - 1.5) * worldH * 0.09;
      if (this._nearCell(gx, gy)) continue;
      this._stars.push({
        x: gx,
        y: gy,
        r: 0.4 + Math.random() * 0.9,
        base: 0.1 + Math.random() * 0.24,
        amp: 0.06 + Math.random() * 0.1,
        spd: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        tint: 0xcfd8ee,
        signal: false,
      });
    }

    // 3) decoy constellations: irregular shapes with lines — the same visual
    //    language as the Braille cells, hiding them in plain sight
    for (let d = 0; d < TUNE.DECOY_COUNT; d++) {
      let ox,
        oy,
        tries = 0;
      do {
        ox = worldW * (0.12 + Math.random() * 0.76);
        oy = worldH * (0.14 + Math.random() * 0.72);
        tries++;
      } while (
        (this._nearCell(ox, oy, this._clearR * 2.2) || nearMoon(ox, oy, 2.2)) &&
        tries < 40
      );
      if (tries >= 40) continue;

      const pts = [{ x: ox, y: oy }];
      let ang = Math.random() * Math.PI * 2;
      const steps = 4 + Math.floor(Math.random() * 3);
      for (let s = 0; s < steps; s++) {
        ang += (Math.random() - 0.5) * 2.1;
        const len = dx * (1.2 + Math.random() * 1.2);
        pts.push({
          x: pts[pts.length - 1].x + Math.cos(ang) * len,
          y: pts[pts.length - 1].y + Math.sin(ang) * len,
        });
      }
      if (pts.some((p) => this._nearCell(p.x, p.y) || nearMoon(p.x, p.y)))
        continue;
      const dcx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const dcy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const dr =
        Math.max(
          ...pts.map((p) => Phaser.Math.Distance.Between(p.x, p.y, dcx, dcy)),
        ) + dx;
      this._decoys.push({ pts, cx: dcx, cy: dcy, r: dr, reveal: 0 });
      pts.forEach((p) =>
        this._stars.push({
          x: p.x,
          y: p.y,
          r: 1.2 + Math.random() * 0.9,
          base: 0.55 + Math.random() * 0.2,
          amp: 0.14 + Math.random() * 0.12,
          spd: 0.8 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
          tint: Math.random() < 0.3 ? 0xbfd4ff : 0xffffff,
          signal: false,
          wired: true, // connected by lines → same sharp design as the cells
        }),
      );
    }

    // 4) general decorative scatter, with varied astronomical tints
    const tints = [0xffffff, 0xffffff, 0xbfd4ff, 0xffe9c9, 0xd7e6ff];
    const count = Math.floor(((worldW * worldH) / (W * H)) * TUNE.STAR_DENSITY);
    for (let k = 0; k < count; k++) {
      const x = Math.random() * worldW,
        y = Math.random() * worldH;
      if (this._nearCell(x, y)) continue;
      this._stars.push({
        x,
        y,
        r: 0.6 + Math.random() * 1.7,
        base: 0.24 + Math.random() * 0.44,
        amp: 0.12 + Math.random() * 0.22,
        spd: 0.6 + Math.random() * 2.4,
        phase: Math.random() * Math.PI * 2,
        tint: tints[(Math.random() * tints.length) | 0],
        signal: false,
      });
    }

    // 5) the moon — drawn over the starfield, like the TelescopeDesign layer
    this._makeMoonTexture("tele_moon");
    this._moon = this.add.image(moonX, moonY, "tele_moon");
    // texture disc is 72% of the canvas; scale so the DISC hits MOON_SIZE
    this._moon.setDisplaySize((moonR * 2) / 0.72, (moonR * 2) / 0.72);
    this._sky.add(this._moon);

    // 6) night clouds drifting slowly across the sky, above stars and moon
    this._makeCloudTexture("tele_cloud0", 11);
    this._makeCloudTexture("tele_cloud1", 47);
    this._clouds = [];
    for (let k = 0; k < TUNE.CLOUD_COUNT; k++) {
      const sp = this.add.image(
        Math.random() * worldW,
        worldH * (0.05 + Math.random() * 0.85),
        "tele_cloud" + (k % 2),
      );
      sp.setScale((1.0 + Math.random() * 1.6) * (scaleRef / 700));
      if (Math.random() < 0.5) sp.setFlipX(true);
      sp._baseAlpha = 0.4 + Math.random() * 0.35;
      sp.setAlpha(sp._baseAlpha);
      sp._speed = Phaser.Math.FloatBetween(...TUNE.CLOUD_SPEED);
      this._sky.add(sp);
      this._clouds.push(sp);
    }
  }

  // cratered moon with soft halo, painted once onto a canvas texture
  _makeMoonTexture(key) {
    if (this.textures.exists(key)) return;
    const S = 512;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d");
    const cx = S / 2,
      cy = S / 2,
      R = S * 0.36;

    // atmospheric halo
    const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, S * 0.5);
    halo.addColorStop(0, "rgba(205,218,255,0.30)");
    halo.addColorStop(0.45, "rgba(205,218,255,0.09)");
    halo.addColorStop(1, "rgba(205,218,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);

    // disc, lit from the upper left
    const disc = ctx.createRadialGradient(
      cx - R * 0.35,
      cy - R * 0.4,
      R * 0.1,
      cx,
      cy,
      R,
    );
    disc.addColorStop(0, "#f7f4ea");
    disc.addColorStop(0.55, "#ddd8c9");
    disc.addColorStop(0.85, "#b9b3a4");
    disc.addColorStop(1, "#8e897c");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // deterministic surface — same moon every night (warm the LCG up first,
    // otherwise the first draws cluster in one corner)
    let seed = 987611;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 8; i++) rnd();

    // maria: a few large, very soft dark plains
    for (let i = 0; i < 5; i++) {
      const mx = cx + (rnd() * 2 - 1) * R * 0.5;
      const my = cy + (rnd() * 2 - 1) * R * 0.5;
      const mr = R * (0.22 + rnd() * 0.2);
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      mg.addColorStop(0, "rgba(104,101,94,0.26)");
      mg.addColorStop(0.7, "rgba(104,101,94,0.12)");
      mg.addColorStop(1, "rgba(104,101,94,0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    // craters: mostly small and subtle, a couple of large ones; soft floors,
    // faint sunlit rim upper-left, faint inner shadow lower-right
    for (let i = 0; i < 30; i++) {
      const ang = rnd() * Math.PI * 2;
      const dist = Math.sqrt(rnd()) * R * 0.9;
      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist;
      const cr =
        i < 4 ? R * (0.06 + rnd() * 0.04) : R * (0.015 + rnd() * 0.035);
      const fg = ctx.createRadialGradient(px, py, cr * 0.2, px, py, cr);
      fg.addColorStop(0, "rgba(96,92,84,0.20)");
      fg.addColorStop(0.8, "rgba(96,92,84,0.14)");
      fg.addColorStop(1, "rgba(96,92,84,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(px, py, cr, 0, Math.PI * 2);
      ctx.fill();
      if (cr > R * 0.04) {
        ctx.lineWidth = Math.max(1, cr * 0.16);
        ctx.strokeStyle = "rgba(255,252,240,0.13)";
        ctx.beginPath();
        ctx.arc(px, py, cr * 0.85, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        ctx.strokeStyle = "rgba(60,58,52,0.15)";
        ctx.beginPath();
        ctx.arc(px, py, cr * 0.6, Math.PI * 0.05, Math.PI * 0.95);
        ctx.stroke();
      }
    }

    // terminator shading toward the lower right
    const sh = ctx.createRadialGradient(
      cx - R * 0.5,
      cy - R * 0.55,
      R * 0.2,
      cx,
      cy,
      R * 1.15,
    );
    sh.addColorStop(0, "rgba(0,0,10,0)");
    sh.addColorStop(0.75, "rgba(10,14,30,0.05)");
    sh.addColorStop(1, "rgba(10,14,30,0.45)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.textures.addCanvas(key, c);
  }

  // wispy night cloud: overlapping soft blobs on a transparent canvas.
  // Every blob stays fully inside the canvas — a clipped blob would show
  // as a hard straight edge drifting across the sky.
  _makeCloudTexture(key, seedInit) {
    if (this.textures.exists(key)) return;
    const CW = 560,
      CH = 240;
    const c = document.createElement("canvas");
    c.width = CW;
    c.height = CH;
    const ctx = c.getContext("2d");
    let seed = seedInit * 1013904 + 12345;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 8; i++) rnd();
    for (let i = 0; i < 34; i++) {
      const t = rnd(); // position along the cloud
      const wave = Math.sin(t * Math.PI); // fat middle, thin fading ends
      const br = (16 + rnd() * 52) * (0.4 + wave * 0.6);
      let bx = CW * (0.5 + (t - 0.5) * 0.74);
      bx = Math.min(Math.max(bx, br + 2), CW - br - 2);
      const by =
        CH * 0.5 + (rnd() * 2 - 1) * Math.max(0, CH * 0.5 - br - 2) * 0.6;
      const a = (0.035 + rnd() * 0.045) * (0.3 + wave * 0.7);
      const gg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      gg.addColorStop(0, "rgba(196,209,238," + a.toFixed(3) + ")");
      gg.addColorStop(0.65, "rgba(196,209,238," + (a * 0.5).toFixed(3) + ")");
      gg.addColorStop(1, "rgba(196,209,238,0)");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    this.textures.addCanvas(key, c);
  }

  // sharp 4-point sparkle: long N/E/S/W points, short diagonals — no halo
  _fillSparkle(g, x, y, R, color, alpha) {
    const inner = R * 0.22;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI / 4) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? R : inner;
      pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr });
    }
    g.fillStyle(color, alpha);
    g.fillPoints(pts, true);
  }

  // order points into a natural-looking constellation path (nearest neighbor)
  _constellationPath(pts) {
    if (pts.length < 2) return pts.slice();
    const rest = pts.slice(1);
    const path = [pts[0]];
    while (rest.length) {
      const last = path[path.length - 1];
      let bi = 0,
        bd = Infinity;
      rest.forEach((p, i) => {
        const d2 = (p.x - last.x) ** 2 + (p.y - last.y) ** 2;
        if (d2 < bd) {
          bd = d2;
          bi = i;
        }
      });
      path.push(rest.splice(bi, 1)[0]);
    }
    return path;
  }

  _nearCell(x, y, radius) {
    const r = radius || this._clearR;
    for (const c of this._cells) {
      if (Math.abs(x - c.cx) < r && Math.abs(y - c.cy) < r) return true;
    }
    return false;
  }

  _drawBackButton(W, H) {
    const r = Math.max(16, Math.min(W, H) * 0.028);
    const bx = r + 18,
      by = r + 18;
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x241f14, 1).fillCircle(bx, by, r + 3);
    g.fillStyle(0x6a5a34, 1).fillCircle(bx, by, r);
    g.lineStyle(1.5, 0xa89252, 0.8).strokeCircle(bx, by, r);
    const t = this.add
      .text(bx, by, "↩", {
        fontFamily: "monospace",
        fontSize: Math.round(r * 1.1) + "px",
        color: "#1e1808",
      })
      .setOrigin(0.5)
      .setDepth(6);

    const zone = this.add
      .zone(bx, by, (r + 6) * 2, (r + 6) * 2)
      .setOrigin(0.5)
      .setDepth(7)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerdown", (p) => {
      p.event.stopPropagation();
      this._backHit = true;
    });
    this._backZone = zone;
    this._backParts = [g, t];
  }

  _showSkyHint() {
    const W = this._W,
      H = this._H;
    const hint = this.add
      .text(
        W / 2,
        this._scope.cy + this._scope.R + 26,
        "drag to explore · scroll to zoom",
        {
          fontFamily: '"Courier New", monospace',
          fontSize: Math.max(12, Math.round(Math.min(W, H) * 0.02)) + "px",
          color: "#8fa4c4",
        },
      )
      .setOrigin(0.5)
      .setDepth(4)
      .setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: 0.6,
      duration: 700,
      onComplete: () =>
        this.tweens.add({
          targets: hint,
          alpha: 0,
          delay: 3200,
          duration: 900,
          onComplete: () => hint.destroy(),
        }),
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  _onDown(p) {
    if (this.phase === PHASE.ROOM) {
      this._enterSky();
      return;
    }
    if (this.phase !== PHASE.SKY) return;
    if (this._backHit) return; // click landed on the back button
    this._dragging = true;
    this._velX = 0;
    this._velY = 0;
    this._lastX = p.x;
    this._lastY = p.y;
    this.input.setDefaultCursor("grabbing");
  }

  _onMove(p) {
    if (this.phase !== PHASE.SKY || !this._dragging || !this._sky) return;
    const dx = p.x - this._lastX,
      dy = p.y - this._lastY;
    this._lastX = p.x;
    this._lastY = p.y;
    this._panBy(dx, dy);
    this._velX = dx;
    this._velY = dy;
    if (Math.abs(dx) + Math.abs(dy) > 3) this._creak();
  }

  _onUp() {
    if (this._backHit) {
      this._backHit = false;
      if (this.phase === PHASE.SKY) this._exitSky();
      return;
    }
    if (this._dragging && this.phase === PHASE.SKY)
      this.input.setDefaultCursor("grab");
    this._dragging = false;
  }

  _onWheel(dy) {
    if (this.phase !== PHASE.SKY || !this._sky) return;
    const old = this._zoom;
    this._zoom = Phaser.Math.Clamp(
      this._zoom - dy * 0.0012,
      TUNE.ZOOM_MIN,
      TUNE.ZOOM_MAX,
    );
    if (this._zoom === old) return;
    // keep the point under the eyepiece center fixed while zooming
    const { cx, cy } = this._scope;
    const wx = (cx - this._sky.x) / old,
      wy = (cy - this._sky.y) / old;
    this._sky.setScale(this._zoom);
    this._sky.x = cx - wx * this._zoom;
    this._sky.y = cy - wy * this._zoom;
    this._clampSky();
  }

  _panBy(dx, dy) {
    this._sky.x += dx;
    this._sky.y += dy;
    this._clampSky();
  }

  _clampSky() {
    const z = this._zoom;
    const minX = this._W - this._world.w * z,
      minY = this._H - this._world.h * z;
    const nx = Phaser.Math.Clamp(this._sky.x, Math.min(minX, 0), 0);
    const ny = Phaser.Math.Clamp(this._sky.y, Math.min(minY, 0), 0);
    if (nx !== this._sky.x) this._velX = 0;
    if (ny !== this._sky.y) this._velY = 0;
    this._sky.x = nx;
    this._sky.y = ny;
  }

  // ── Render loop ───────────────────────────────────────────────────────────

  update() {
    const dt = this.game.loop.delta / 1000;

    // pan inertia
    if (this.phase === PHASE.SKY && this._sky && !this._dragging) {
      if (Math.abs(this._velX) > 0.05 || Math.abs(this._velY) > 0.05) {
        this._panBy(this._velX, this._velY);
        this._velX *= TUNE.INERTIA_DAMP;
        this._velY *= TUNE.INERTIA_DAMP;
      }
    }

    // "eye adjusting" focus pull after the iris opens
    if (this._focus > 0) {
      this._focus = Math.max(0, this._focus - dt / TUNE.FOCUS_TIME);
    }

    // stars + constellation lines + meteors
    if (this._starGfx && this._stars && this.phase !== PHASE.ROOM) {
      const t = this.time.now / 1000;
      const g = this._starGfx;
      const f = this._focus; // 1 = blurry, 0 = sharp
      const blurR = 1 + 2.4 * f;
      const blurA = 1 - 0.55 * f;
      const cellA = TUNE.CELL_LINE_ALPHA * (1 - f);
      const decoyA = TUNE.DECOY_LINE_ALPHA * (1 - f);
      g.clear();

      // the lines exist only while the reticle rests on a constellation:
      // aim at one and its wiring draws itself star by star, chart-style,
      // then fades away once the eyepiece drifts off
      const wx = (this._scope.cx - this._sky.x) / this._zoom;
      const wy = (this._scope.cy - this._sky.y) / this._zoom;

      const aim = (o) => {
        const on = Phaser.Math.Distance.Between(wx, wy, o.cx, o.cy) < o.r;
        o.reveal = Phaser.Math.Clamp(
          o.reveal + (on ? dt / 0.55 : -dt / 0.4),
          0,
          1,
        );
      };

      // progressive star-to-star drawing along the path
      const drawPath = (pts, reveal, passes) => {
        const total = pts.length - 1;
        if (total < 1 || reveal <= 0) return;
        const prog = reveal * total;
        for (const [width, color, alpha] of passes) {
          g.lineStyle(width, color, alpha);
          for (let i = 0; i < total; i++) {
            const t = Phaser.Math.Clamp(prog - i, 0, 1);
            if (t <= 0) break;
            g.lineBetween(
              pts[i].x,
              pts[i].y,
              Phaser.Math.Linear(pts[i].x, pts[i + 1].x, t),
              Phaser.Math.Linear(pts[i].y, pts[i + 1].y, t),
            );
          }
        }
      };

      for (const d of this._decoys) {
        aim(d);
        if (d.reveal > 0.01 && decoyA > 0.005) {
          drawPath(d.pts, d.reveal, [
            [1, 0x8fa8cc, decoyA * Math.min(1, d.reveal * 1.5)],
          ]);
        }
      }
      for (const c of this._cells) {
        aim(c);
        if (c.reveal > 0.01 && cellA > 0.01) {
          const a = cellA * Math.min(1, c.reveal * 1.5);
          drawPath(c.pts, c.reveal, [
            [3, 0x5c79b8, a * 0.45],
            [1, 0xd4e2ff, a],
          ]);
        }
      }

      for (const s of this._stars) {
        // twinkle — stronger amplitude, plus a faster sparkle beat on top
        let a = s.base + s.amp * TUNE.TWINKLE * Math.sin(t * s.spd + s.phase);
        const sparkle = Math.max(0, Math.sin(t * s.spd * 1.9 + s.phase * 1.7));
        a = Phaser.Math.Clamp(a * blurA, 0, 1);

        if (s.signal || s.wired) {
          // connected stars: crisp 4-point sparkle, no halo. The points
          // breathe with the twinkle so they stay alive without any glow.
          const R = s.r * (2.7 + sparkle * 0.9) * blurR;
          this._fillSparkle(g, s.x, s.y, R, s.tint, a);
          // hot white core — keeps the center razor sharp
          g.fillStyle(0xffffff, Phaser.Math.Clamp(a + 0.1, 0, 1));
          g.fillCircle(s.x, s.y, Math.max(0.8, s.r * 0.5) * blurR);
          // Braille stars only: hairline long rays, extra needle-like
          if (s.signal && f < 0.4) {
            const len = R * (1.3 + sparkle * 0.45);
            g.lineStyle(0.7, s.tint, a * 0.75);
            g.lineBetween(s.x - len, s.y, s.x + len, s.y);
            g.lineBetween(s.x, s.y - len, s.x, s.y + len);
          }
        } else {
          // background scatter: small round stars, faint glow on the biggest
          if (s.r > 1.4) {
            g.fillStyle(s.tint, a * 0.1);
            g.fillCircle(s.x, s.y, s.r * 2.6 * blurR);
          }
          g.fillStyle(s.tint, Phaser.Math.Clamp(a + 0.05, 0, 1));
          g.fillCircle(s.x, s.y, s.r * blurR);
          if (f < 0.5 && s.r > 1.6) {
            const spikeA = (a * 0.35 + sparkle * 0.3) * (1 - f * 2);
            if (spikeA > 0.02) {
              const len = s.r * (2.0 + sparkle * 2.2) * blurR;
              g.lineStyle(0.7, s.tint, spikeA);
              g.lineBetween(s.x - len, s.y, s.x + len, s.y);
              g.lineBetween(s.x, s.y - len, s.x, s.y + len);
            }
          }
        }
      }

      this._updateMeteors(g, dt);

      // clouds drift slowly to the right and wrap, like the CSS reference;
      // moon and clouds ease in with the same "eye adjusting" focus pull
      if (this._moon) this._moon.setAlpha(1 - 0.5 * f);
      if (this._clouds) {
        for (const cl of this._clouds) {
          cl.x += cl._speed * dt;
          const hw = (cl.width * cl.scaleX) / 2;
          if (cl.x - hw > this._world.w) cl.x = -hw;
          cl.setAlpha(cl._baseAlpha * (1 - 0.6 * f));
        }
      }
    }

    // keep the synthesized ambience in sync with mute / sfx volume
    if (this._amb && this._amb.master) {
      const muted = window.GameAudio && window.GameAudio.muted;
      const vol = window.GameAudio ? window.GameAudio.sfxVol : 0.8;
      this._amb.master.gain.value = muted ? 0 : vol * 0.5;
    }
  }

  _spawnMeteor() {
    // spawn near the currently visible area so it actually crosses the view
    const vx0 = -this._sky.x / this._zoom,
      vy0 = -this._sky.y / this._zoom;
    this._meteors.push({
      x: vx0 + Math.random() * (this._W / this._zoom),
      y: vy0 + Math.random() * ((this._H * 0.55) / this._zoom),
      ang: Phaser.Math.DegToRad(15 + Math.random() * 40),
      len: 150 + Math.random() * 140,
      p: 0,
      speed: 1.2 + Math.random() * 0.9,
    });
  }

  _updateMeteors(g, dt) {
    const now = this.time.now;
    if (this.phase === PHASE.SKY && now > this._nextMeteor) {
      this._nextMeteor = now + Phaser.Math.Between(...TUNE.METEOR_EVERY);
      this._spawnMeteor();
      if (Math.random() < TUNE.METEOR_BURST) {
        this.time.delayedCall(200 + Math.random() * 500, () => {
          if (this.phase === PHASE.SKY) this._spawnMeteor();
        });
      }
    }
    for (let i = this._meteors.length - 1; i >= 0; i--) {
      const m = this._meteors[i];
      m.p += dt * m.speed;
      if (m.p >= 1) {
        this._meteors.splice(i, 1);
        continue;
      }
      const hx = m.x + Math.cos(m.ang) * m.len * m.p * 2;
      const hy = m.y + Math.sin(m.ang) * m.len * m.p * 2;
      const trail = m.len * 0.55,
        segs = 7;
      const fade = Math.sin(m.p * Math.PI);
      for (let s2 = 0; s2 < segs; s2++) {
        const f0 = s2 / segs,
          f1 = (s2 + 1) / segs;
        g.lineStyle(1.6 * (1 - f0), 0xffffff, fade * (1 - f0) * 0.85);
        g.lineBetween(
          hx - Math.cos(m.ang) * trail * f0,
          hy - Math.sin(m.ang) * trail * f0,
          hx - Math.cos(m.ang) * trail * f1,
          hy - Math.sin(m.ang) * trail * f1,
        );
      }
    }
  }

  // ── Synthesized ambience: wind, crickets, tripod creak ────────────────────

  _startAmbient() {
    try {
      const ac = this.sound.context;
      const master = ac.createGain();
      master.gain.value = 0;
      master.connect(ac.destination);

      const dur = 2;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const wind = ac.createBufferSource();
      wind.buffer = buf;
      wind.loop = true;
      const wlp = ac.createBiquadFilter();
      wlp.type = "lowpass";
      wlp.frequency.value = 360;
      const wg = ac.createGain();
      wg.gain.value = 0.45;
      wind.connect(wlp);
      wlp.connect(wg);
      wg.connect(master);
      wind.start();

      this._amb = { ac, master, wind, wg };

      this._cricketTimer = this.time.addEvent({
        delay: 380,
        loop: true,
        callback: () => {
          if (Math.random() < 0.55) this._chirp();
        },
      });
    } catch (e) {
      this._amb = null;
    }
  }

  _chirp() {
    if (!this._amb) return;
    const ac = this._amb.ac,
      t = ac.currentTime;
    for (let k = 0; k < 2; k++) {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = "sine";
      o.frequency.value = 4100 + Math.random() * 500;
      const st = t + k * 0.06;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.22, st + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.05);
      o.connect(g);
      g.connect(this._amb.master);
      o.start(st);
      o.stop(st + 0.07);
    }
  }

  _creak() {
    if (!this._amb) return;
    const now = this.time.now;
    if (now - this._lastCreak < 200) return;
    this._lastCreak = now;
    const ac = this._amb.ac,
      dur = 0.2;
    const buf = ac.createBuffer(
      1,
      Math.floor(ac.sampleRate * dur),
      ac.sampleRate,
    );
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.4);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 300 + Math.random() * 140;
    bp.Q.value = 9;
    const g = ac.createGain();
    g.gain.value = 0.5;
    src.connect(bp);
    bp.connect(g);
    g.connect(this._amb.master);
    src.start();
  }

  // short "whoosh" on transitions (filtered noise sweep)
  _whoosh(reverse) {
    if (!this._amb) return;
    try {
      const ac = this._amb.ac,
        t = ac.currentTime,
        dur = 0.7;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(reverse ? 2200 : 260, t);
      lp.frequency.exponentialRampToValueAtTime(
        reverse ? 260 : 2200,
        t + dur * 0.8,
      );
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(lp);
      lp.connect(g);
      g.connect(this._amb.master);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  _stopAmbient() {
    try {
      if (this._amb) {
        if (this._amb.wind) {
          this._amb.wind.stop();
          this._amb.wind.disconnect();
        }
        if (this._amb.master) this._amb.master.disconnect();
      }
    } catch (e) {}
    this._amb = null;
    if (this._cricketTimer) {
      this._cricketTimer.remove(false);
      this._cricketTimer = null;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    if (this._sky) this._sky.clearMask(true);
    this.children.removeAll(true);
    this._sky = null;
    this._starGfx = null;
    this._maskG = null;
    this._scopeGfx = null;
    this._room = null;
    this._roomImg = null;
    this._backZone = null;
    this._backParts = null;
    this._stars = null;
    this._decoys = null;
    this._cells = null;
    this._moon = null;
    this._clouds = null;
    this._meteors = [];
    this._focus = 0;
    this._dragging = false;
    this._backHit = false;
  }

  replay() {
    this._teardown();
    this.phase = PHASE.ROOM;
    this._buildRoom(false);
  }

  transitionToLevel(levelKey, skipFade = false) {
    this._stopAmbient();
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (!this.isSolved && window.playSuccess) window.playSuccess(this);
    this.isSolved = true;

    const W = this._W,
      H = this._H;
    const ov = this.add
      .rectangle(0, 0, W, H, 0x000000)
      .setOrigin(0, 0)
      .setDepth(200)
      .setAlpha(0);
    const idx = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const lb = this.add
      .text(W / 2, H / 2, "Level " + (idx + 1) + "...", {
        fontFamily: "monospace",
        fontSize: "42px",
        color: "#00ff44",
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setAlpha(0);
    this.tweens.add({
      targets: [ov, lb],
      alpha: 1,
      duration: 1000,
      onComplete: () => this.scene.start(levelKey, { skipFade: false }),
    });
  }

  shutdown() {
    this._stopAmbient();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
