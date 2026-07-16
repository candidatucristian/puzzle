// ─────────────────────────────────────────────────────────────────────────────
// Level — "TELESCOPE"  ·  code: ORION  ·  hard  ·  TOOL (Braille alphabet)
//
// PHASE 1 (ROOM): a pencil-sketch of the scene (a child on tiptoe at a
//   telescope, aimed out an arched window at a starry sky — drawn in code,
//   no image assets) with a slow breathing zoom, vignette and a prompt.
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
  }

  // ── the pencil: jittered hand-drawn primitives (same idiom as the other
  //    sketch levels — deterministic, so the drawing never flickers) ─────────

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  _sketchSeg(rnd, x1, y1, x2, y2, mag) {
    const pts = [{ x: x1, y: y1 }];
    const steps = 3;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const off = (rnd() - 0.5) * 2 * mag;
      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  _drawPath(g, pts, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < pts.length - 1; i++) {
      g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
  }

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

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    const steps = 14;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.4;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // arc from a1 to a2 (radians), jittered
  _pencilArc(g, rnd, cx, cy, rx, ry, a1, a2, width, color, alpha) {
    const steps = 12;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a1 + ((a2 - a1) * i) / steps;
      const jr = 1 + (rnd() - 0.5) * 0.02;
      pts.push({
        x: cx + Math.cos(a) * rx * jr,
        y: cy + Math.sin(a) * ry * jr,
      });
    }
    this._drawPath(g, pts, width, color, alpha);
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
    this.input.setDefaultCursor("default");
    const W = this._W,
      H = this._H;

    this._room = this.add.container(0, 0).setDepth(1);

    // safety backdrop
    const bg = this.add.graphics();
    bg.fillStyle(0x04050a, 1).fillRect(0, 0, W, H);
    this._room.add(bg);

    // the sketch lives in a centred container so the breathing zoom (and the
    // lean-in zoom on click) scale it around the middle of the screen
    const sk = this.add.container(W / 2, H / 2);
    this._room.add(sk);
    this._roomSketch = sk;
    this._drawRoomSketch(sk, W, H);

    // slow breathing zoom — the room feels alive
    this._breath = this.tweens.add({
      targets: sk,
      scale: 1.035,
      duration: 9000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // twinkling stars in the window — small points breathing in and out
    this._makeRoomTwinkles(sk);

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
      .text(W / 2, H * 0.92, "Close your eyes and dream", {
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

  // the whole room, hand-sketched — recreates the old reference image
  // (child on tiptoe at a telescope, arched window, starry sky) in pencil
  _drawRoomSketch(sk, W, H) {
    const SK = 0xd8d2c4;
    const g = this.add.graphics();
    sk.add(g);
    // container is centred — draw in local coords
    const X = (f) => W * f - W / 2;
    const Y = (f) => H * f - H / 2;
    const rnd = this._rng(7317);

    // paper: the dark room
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(-W / 2, -H / 2, W, H);

    // ── the arched window ──
    const wl = X(0.34);
    const wr = X(0.66);
    const archCX = X(0.5);
    const archCY = Y(0.33);
    const archRX = W * 0.16;
    const archRY = H * 0.15;
    const sillY = Y(0.62);

    // the sky, seen through the opening
    g.fillStyle(0x0b0f16, 1);
    g.fillRect(wl, archCY, wr - wl, sillY - archCY);
    g.fillEllipse(archCX, archCY, archRX * 2, archRY * 2);

    // stars — kept inside the opening
    const rndS = this._rng(4194);
    for (let i = 0; i < 34; i++) {
      const x = wl + rndS() * (wr - wl);
      const y = Y(0.19) + rndS() * (sillY - Y(0.19));
      const inArch =
        y >= archCY ||
        Math.pow((x - archCX) / archRX, 2) +
          Math.pow((y - archCY) / archRY, 2) <=
          0.94;
      if (!inArch) continue;
      g.fillStyle(0xffffff, 0.25 + rndS() * 0.6);
      g.fillCircle(x, y, 0.6 + rndS() * 1.2);
    }
    // a few 4-point sparkles, like the drawing's bright stars
    for (const [fx, fy, s] of [
      [0.44, 0.26, 5],
      [0.58, 0.33, 6],
      [0.51, 0.45, 4],
      [0.63, 0.52, 5],
    ]) {
      const x = X(fx);
      const y = Y(fy);
      g.lineStyle(1, 0xffffff, 0.8);
      g.lineBetween(x - s, y, x + s, y);
      g.lineBetween(x, y - s, x, y + s);
    }

    // window frame: arch + jambs + sill, doubled pencil strokes
    this._pencilArc(
      g,
      rnd,
      archCX,
      archCY,
      archRX,
      archRY,
      Math.PI,
      Math.PI * 2,
      2,
      SK,
      0.55,
    );
    this._pencilArc(
      g,
      rnd,
      archCX,
      archCY,
      archRX + 7,
      archRY + 7,
      Math.PI,
      Math.PI * 2,
      1.2,
      SK,
      0.3,
    );
    this._pencilSeg(g, rnd, wl, archCY, wl, sillY, 2, SK, 0.55, 1.6);
    this._pencilSeg(g, rnd, wr, archCY, wr, sillY, 2, SK, 0.55, 1.6);
    this._pencilSeg(g, rnd, wl - 7, archCY, wl - 7, sillY, 1.2, SK, 0.3, 1.6);
    this._pencilSeg(g, rnd, wr + 7, archCY, wr + 7, sillY, 1.2, SK, 0.3, 1.6);
    // sill
    this._pencilSeg(g, rnd, X(0.3), sillY, X(0.7), sillY, 2.2, SK, 0.55, 1.6);
    this._pencilSeg(
      g,
      rnd,
      X(0.31),
      sillY + 9,
      X(0.69),
      sillY + 9,
      1.4,
      SK,
      0.35,
      1.6,
    );

    // opened shutters, one each side, with two panes
    const shutter = (xIn, xOut, topIn, topOut) => {
      this._pencilSeg(g, rnd, xIn, topIn, xOut, topOut, 1.6, SK, 0.45, 1.4);
      this._pencilSeg(g, rnd, xOut, topOut, xOut, Y(0.665), 1.6, SK, 0.45, 1.4);
      this._pencilSeg(g, rnd, xOut, Y(0.665), xIn, sillY, 1.6, SK, 0.45, 1.4);
      const midT = (topIn + topOut) / 2 + 6;
      const midB = (sillY + Y(0.665)) / 2;
      this._pencilSeg(
        g,
        rnd,
        (xIn + xOut) / 2,
        midT,
        (xIn + xOut) / 2,
        midB,
        1,
        SK,
        0.3,
        1.2,
      );
      this._pencilSeg(
        g,
        rnd,
        xIn,
        (topIn + sillY) / 2,
        xOut,
        (topOut + Y(0.665)) / 2,
        1,
        SK,
        0.3,
        1.2,
      );
    };
    shutter(wl - 8, X(0.245), Y(0.245), Y(0.185));
    shutter(wr + 8, X(0.755), Y(0.245), Y(0.185));

    // ── the telescope, aimed out the window ──
    const eye = { x: X(0.472), y: Y(0.505) }; // eyepiece end
    const obj = { x: X(0.615), y: Y(0.345) }; // objective end
    const tdx = obj.x - eye.x;
    const tdy = obj.y - eye.y;
    const tlen = Math.hypot(tdx, tdy);
    const nx = -tdy / tlen;
    const ny = tdx / tlen;
    const tw = W * 0.011; // half-width of the tube
    g.fillStyle(0x171a20, 0.95);
    g.fillPoints(
      [
        { x: eye.x + nx * tw, y: eye.y + ny * tw },
        { x: obj.x + nx * tw * 1.25, y: obj.y + ny * tw * 1.25 },
        { x: obj.x - nx * tw * 1.25, y: obj.y - ny * tw * 1.25 },
        { x: eye.x - nx * tw, y: eye.y - ny * tw },
      ],
      true,
    );
    this._pencilSeg(
      g,
      rnd,
      eye.x + nx * tw,
      eye.y + ny * tw,
      obj.x + nx * tw * 1.25,
      obj.y + ny * tw * 1.25,
      1.6,
      SK,
      0.6,
      1.2,
    );
    this._pencilSeg(
      g,
      rnd,
      eye.x - nx * tw,
      eye.y - ny * tw,
      obj.x - nx * tw * 1.25,
      obj.y - ny * tw * 1.25,
      1.6,
      SK,
      0.6,
      1.2,
    );
    // objective ring + eyepiece stub
    this._pencilSeg(
      g,
      rnd,
      obj.x + nx * tw * 1.35,
      obj.y + ny * tw * 1.35,
      obj.x - nx * tw * 1.35,
      obj.y - ny * tw * 1.35,
      2,
      SK,
      0.65,
      0.8,
    );
    const eb = { x: eye.x - tdx * 0.06, y: eye.y - tdy * 0.06 };
    this._pencilSeg(
      g,
      rnd,
      eye.x + nx * tw * 0.6,
      eye.y + ny * tw * 0.6,
      eb.x + nx * tw * 0.6,
      eb.y + ny * tw * 0.6,
      1.4,
      SK,
      0.55,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      eye.x - nx * tw * 0.6,
      eye.y - ny * tw * 0.6,
      eb.x - nx * tw * 0.6,
      eb.y - ny * tw * 0.6,
      1.4,
      SK,
      0.55,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      eb.x + nx * tw * 0.6,
      eb.y + ny * tw * 0.6,
      eb.x - nx * tw * 0.6,
      eb.y - ny * tw * 0.6,
      1.4,
      SK,
      0.55,
      0.6,
    );
    // a band on the tube
    const bm = { x: eye.x + tdx * 0.55, y: eye.y + tdy * 0.55 };
    this._pencilSeg(
      g,
      rnd,
      bm.x + nx * tw * 1.1,
      bm.y + ny * tw * 1.1,
      bm.x - nx * tw * 1.1,
      bm.y - ny * tw * 1.1,
      1.2,
      SK,
      0.4,
      0.6,
    );

    // tripod under the tube's balance point
    const hub = { x: X(0.535), y: Y(0.575) };
    this._pencilSeg(g, rnd, bm.x, bm.y, hub.x, hub.y, 1.4, SK, 0.5, 1);
    this._pencilCircle(g, rnd, hub.x, hub.y, 4, 1.2, SK, 0.5);
    this._pencilSeg(
      g,
      rnd,
      hub.x,
      hub.y,
      X(0.465),
      Y(0.875),
      1.6,
      SK,
      0.55,
      1.6,
    );
    this._pencilSeg(
      g,
      rnd,
      hub.x,
      hub.y,
      X(0.605),
      Y(0.875),
      1.6,
      SK,
      0.55,
      1.6,
    );
    this._pencilSeg(
      g,
      rnd,
      hub.x,
      hub.y,
      X(0.545),
      Y(0.895),
      1.6,
      SK,
      0.55,
      1.6,
    );
    // leg spreader
    this._pencilSeg(
      g,
      rnd,
      X(0.497),
      Y(0.73),
      X(0.573),
      Y(0.73),
      1,
      SK,
      0.3,
      1,
    );

    // ── the sill props: lantern and a potted plant ──
    const lx = X(0.6);
    const ly = sillY - 4;
    this._pencilSeg(g, rnd, lx - 7, ly, lx + 7, ly, 1.2, SK, 0.5, 0.6);
    this._pencilSeg(
      g,
      rnd,
      lx - 7,
      ly - H * 0.045,
      lx + 7,
      ly - H * 0.045,
      1.2,
      SK,
      0.5,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      lx - 7,
      ly,
      lx - 7,
      ly - H * 0.045,
      1.2,
      SK,
      0.5,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      lx + 7,
      ly,
      lx + 7,
      ly - H * 0.045,
      1.2,
      SK,
      0.5,
      0.6,
    );
    this._pencilArc(
      g,
      rnd,
      lx,
      ly - H * 0.045,
      7,
      6,
      Math.PI,
      Math.PI * 2,
      1.1,
      SK,
      0.45,
    );
    g.fillStyle(0xe8dcc0, 0.55);
    g.fillCircle(lx, ly - H * 0.022, 2.4);
    g.fillStyle(0xe8dcc0, 0.07);
    g.fillCircle(lx, ly - H * 0.022, 10);
    // plant
    const px = X(0.645);
    const py = sillY - 2;
    this._pencilSeg(
      g,
      rnd,
      px - 8,
      py - H * 0.03,
      px + 8,
      py - H * 0.03,
      1.2,
      SK,
      0.5,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      px - 8,
      py - H * 0.03,
      px - 5,
      py,
      1.2,
      SK,
      0.5,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      px + 8,
      py - H * 0.03,
      px + 5,
      py,
      1.2,
      SK,
      0.5,
      0.6,
    );
    this._pencilSeg(g, rnd, px - 5, py, px + 5, py, 1.2, SK, 0.5, 0.6);
    for (const [dx, dy] of [
      [-7, -22],
      [0, -26],
      [7, -21],
      [-3, -24],
      [4, -25],
    ]) {
      this._pencilSeg(
        g,
        rnd,
        px,
        py - H * 0.03,
        px + dx,
        py - H * 0.03 + dy,
        1.1,
        SK,
        0.45,
        1.2,
      );
    }

    // ── left wall: two shelves with books, a small plant on top ──
    for (const [fy, n] of [
      [0.26, 6],
      [0.38, 5],
    ]) {
      const sy = Y(fy);
      this._pencilSeg(g, rnd, X(0.075), sy, X(0.205), sy, 1.6, SK, 0.4, 1.4);
      this._pencilSeg(
        g,
        rnd,
        X(0.08),
        sy + 4,
        X(0.09),
        sy + 12,
        1,
        SK,
        0.25,
        0.6,
      );
      this._pencilSeg(
        g,
        rnd,
        X(0.19),
        sy + 4,
        X(0.2),
        sy + 12,
        1,
        SK,
        0.25,
        0.6,
      );
      const rndB = this._rng(600 + n * 37);
      for (let i = 0; i < n; i++) {
        const bx = X(0.09) + i * (W * 0.016) + rndB() * 4;
        const bh = H * (0.028 + rndB() * 0.016);
        this._pencilSeg(g, rnd, bx, sy, bx, sy - bh, 1.3, SK, 0.35, 0.8);
      }
    }
    for (const [dx, dy] of [
      [-6, -16],
      [0, -19],
      [6, -15],
    ]) {
      this._pencilSeg(
        g,
        rnd,
        X(0.115),
        Y(0.26) - H * 0.02,
        X(0.115) + dx,
        Y(0.26) - H * 0.02 + dy,
        1,
        SK,
        0.3,
        1,
      );
    }
    this._pencilSeg(
      g,
      rnd,
      X(0.108),
      Y(0.26),
      X(0.122),
      Y(0.26),
      1.1,
      SK,
      0.35,
      0.5,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.108),
      Y(0.26),
      X(0.111),
      Y(0.24),
      1.1,
      SK,
      0.35,
      0.5,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.122),
      Y(0.26),
      X(0.119),
      Y(0.24),
      1.1,
      SK,
      0.35,
      0.5,
    );

    // ── right wall: pinned papers, a desk and chair ──
    for (const [fx, fy, tilt] of [
      [0.83, 0.27, 2],
      [0.885, 0.33, -3],
    ]) {
      const pxr = X(fx);
      const pyr = Y(fy);
      const pw = W * 0.032;
      const ph = H * 0.055;
      this._pencilSeg(
        g,
        rnd,
        pxr,
        pyr + tilt,
        pxr + pw,
        pyr - tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      this._pencilSeg(
        g,
        rnd,
        pxr + pw,
        pyr - tilt,
        pxr + pw,
        pyr + ph - tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      this._pencilSeg(
        g,
        rnd,
        pxr + pw,
        pyr + ph - tilt,
        pxr,
        pyr + ph + tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      this._pencilSeg(
        g,
        rnd,
        pxr,
        pyr + ph + tilt,
        pxr,
        pyr + tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      g.fillStyle(SK, 0.45);
      g.fillCircle(pxr + pw / 2, pyr - tilt / 2, 1.4);
    }
    // desk
    this._pencilSeg(
      g,
      rnd,
      X(0.79),
      Y(0.585),
      X(0.955),
      Y(0.585),
      1.8,
      SK,
      0.45,
      1.4,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.8),
      Y(0.585),
      X(0.8),
      Y(0.72),
      1.3,
      SK,
      0.35,
      1,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.945),
      Y(0.585),
      X(0.945),
      Y(0.72),
      1.3,
      SK,
      0.35,
      1,
    );
    // books on the desk
    this._pencilSeg(
      g,
      rnd,
      X(0.815),
      Y(0.575),
      X(0.86),
      Y(0.575),
      1.3,
      SK,
      0.35,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.818),
      Y(0.565),
      X(0.855),
      Y(0.565),
      1.2,
      SK,
      0.3,
      0.6,
    );
    // chair
    this._pencilCircle(g, rnd, X(0.885), Y(0.635), H * 0.02, 1.3, SK, 0.35);
    this._pencilSeg(
      g,
      rnd,
      X(0.885),
      Y(0.655),
      X(0.885),
      Y(0.73),
      1.2,
      SK,
      0.3,
      0.8,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.862),
      Y(0.75),
      X(0.908),
      Y(0.73),
      1.2,
      SK,
      0.3,
      0.8,
    );

    // ── floor: skirting line and a fringed rug under the scene ──
    this._pencilSeg(
      g,
      rnd,
      -W / 2,
      Y(0.745),
      W / 2,
      Y(0.74),
      1.2,
      SK,
      0.18,
      2.4,
    );
    this._pencilSeg(g, rnd, X(0.33), Y(0.8), X(0.71), Y(0.8), 1.4, SK, 0.35, 2);
    this._pencilSeg(
      g,
      rnd,
      X(0.71),
      Y(0.8),
      X(0.75),
      Y(0.915),
      1.4,
      SK,
      0.35,
      2,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.75),
      Y(0.915),
      X(0.29),
      Y(0.915),
      1.4,
      SK,
      0.35,
      2,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.29),
      Y(0.915),
      X(0.33),
      Y(0.8),
      1.4,
      SK,
      0.35,
      2,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.345),
      Y(0.825),
      X(0.695),
      Y(0.825),
      1,
      SK,
      0.2,
      1.6,
    );
    this._pencilSeg(
      g,
      rnd,
      X(0.315),
      Y(0.89),
      X(0.725),
      Y(0.89),
      1,
      SK,
      0.2,
      1.6,
    );
    // fringes
    for (let i = 0; i < 9; i++) {
      const fx1 = X(0.3 + i * 0.05);
      this._pencilSeg(
        g,
        rnd,
        fx1,
        Y(0.918),
        fx1 - 2,
        Y(0.932),
        1,
        SK,
        0.25,
        0.4,
      );
    }

    // the window opening, in local coords — the meteor spawner uses it
    this._roomArch = { wl, wr, archCY, sillY };
  }

  // a handful of stars in the window that slowly brighten and dim
  _makeRoomTwinkles(sk) {
    if (!this._roomArch) return;
    const a = this._roomArch;
    const rnd = this._rng(5959);
    const pad = 40;
    for (let i = 0; i < 12; i++) {
      const x = a.wl + pad + rnd() * (a.wr - a.wl - pad * 2);
      const y = a.archCY - 20 + rnd() * (a.sillY - a.archCY - 40);
      const dot = this.add.circle(x, y, 0.7 + rnd() * 1.1, 0xffffff, 1);
      dot.setAlpha(0.15 + rnd() * 0.3);
      sk.add(dot);
      this.tweens.add({
        targets: dot,
        alpha: 0.65 + rnd() * 0.3,
        duration: 1200 + rnd() * 2200,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
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

    // a breath backward, then a fast dive INTO the window
    const W = this._W;
    const H = this._H;
    if (this._roomSketch) {
      this.tweens.add({
        targets: this._roomSketch,
        scale: 0.93,
        duration: 320,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: this._roomSketch,
            scale: 2.1,
            // scaling happens around screen centre — shifting the container
            // down keeps the window (which sits above centre) in frame
            y: H / 2 + H * 0.1 * (2.1 - 1),
            duration: 620,
            ease: "Cubic.easeIn",
          });
        },
      });
    }
    this.tweens.add({
      targets: [this._room],
      alpha: 0,
      delay: 460,
      duration: 480,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this._room.destroy(true);
        this._room = null;
        this._roomSketch = null;
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

    // ── silvered bezel with TWO stacked graduated rings ──
    // band radii: inner dial hugs the glass, outer dial sits above it
    const in0 = R * 1.008;
    const in1 = R * 1.052;
    const out0 = R * 1.062;
    const out1 = R * 1.118;

    // metal base under everything
    g.lineStyle(R * 0.13, 0x1c1f24, 1);
    g.strokeCircle(cx, cy, (in0 + out1) / 2);
    // inner band: darker silver
    g.lineStyle(in1 - in0, 0x8d949e, 1);
    g.strokeCircle(cx, cy, (in0 + in1) / 2);
    // outer band: brighter silver
    g.lineStyle(out1 - out0, 0xb9bfc8, 1);
    g.strokeCircle(cx, cy, (out0 + out1) / 2);
    // machined lips and the groove separating the two dials
    g.lineStyle(1.6, 0xe4e8ee, 0.85).strokeCircle(cx, cy, out1 + 1.5);
    g.lineStyle(1.4, 0x51565e, 0.95).strokeCircle(cx, cy, (in1 + out0) / 2);
    g.lineStyle(1.3, 0xe4e8ee, 0.5).strokeCircle(cx, cy, in0 - 1);

    // outer dial graduations: every 5°, engraved dark, bold every 30°
    for (let deg = 0; deg < 360; deg += 5) {
      const rad = Phaser.Math.DegToRad(deg);
      const major = deg % 30 === 0;
      const rA = out1 - 1;
      const rB = major ? out0 + 1 : out0 + (out1 - out0) * 0.45;
      g.lineStyle(major ? 2 : 1, 0x14161a, major ? 0.9 : 0.6);
      g.lineBetween(
        cx + Math.cos(rad) * rA,
        cy + Math.sin(rad) * rA,
        cx + Math.cos(rad) * rB,
        cy + Math.sin(rad) * rB,
      );
    }
    // inner dial graduations: finer pitch, offset half a step — a second
    // independent scale, like paired azimuth/declination rings
    for (let deg = 5; deg < 365; deg += 10) {
      const rad = Phaser.Math.DegToRad(deg);
      const major = (deg - 5) % 90 === 0;
      const rA = in1 - 1;
      const rB = major ? in0 + 1 : in0 + (in1 - in0) * 0.5;
      g.lineStyle(major ? 1.8 : 1, 0x14161a, major ? 0.85 : 0.55);
      g.lineBetween(
        cx + Math.cos(rad) * rA,
        cy + Math.sin(rad) * rA,
        cx + Math.cos(rad) * rB,
        cy + Math.sin(rad) * rB,
      );
    }

    // cold glint sweeping the upper-left of both bands
    g.lineStyle(2.2, 0xf2f4f8, 0.4);
    g.beginPath();
    g.arc(
      cx,
      cy,
      (out0 + out1) / 2,
      Phaser.Math.DegToRad(200),
      Phaser.Math.DegToRad(250),
    );
    g.strokePath();
    g.lineStyle(1.6, 0xf2f4f8, 0.25);
    g.beginPath();
    g.arc(
      cx,
      cy,
      (in0 + in1) / 2,
      Phaser.Math.DegToRad(205),
      Phaser.Math.DegToRad(245),
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

  // is the pointer over the sketched telescope (tube, mount or tripod)?
  _roomScopeHit(p) {
    if (!this._roomSketch) return false;
    const W = this._W;
    const H = this._H;
    const s = this._roomSketch.scaleX || 1;
    const ox = this._roomSketch.x;
    const oy = this._roomSketch.y;
    const pt = (fx, fy) => ({
      x: ox + (W * fx - W / 2) * s,
      y: oy + (H * fy - H / 2) * s,
    });
    const distSeg = (P, A, B) => {
      const abx = B.x - A.x;
      const aby = B.y - A.y;
      const t = Phaser.Math.Clamp(
        ((P.x - A.x) * abx + (P.y - A.y) * aby) / (abx * abx + aby * aby || 1),
        0,
        1,
      );
      return Math.hypot(P.x - (A.x + abx * t), P.y - (A.y + aby * t));
    };
    const segs = [
      [pt(0.472, 0.505), pt(0.615, 0.345), 34], // the tube
      [pt(0.535, 0.575), pt(0.465, 0.875), 18], // tripod legs
      [pt(0.535, 0.575), pt(0.605, 0.875), 18],
      [pt(0.535, 0.575), pt(0.545, 0.895), 18],
    ];
    return segs.some(([A, B, tol]) => distSeg(p, A, B) <= tol);
  }

  _onDown(p) {
    if (this.phase === PHASE.ROOM) {
      if (this._roomScopeHit(p)) this._enterSky();
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
    if (this.phase === PHASE.ROOM) {
      // hand cursor only over the telescope — that's the way in
      this.input.setDefaultCursor(
        this._roomScopeHit(p) ? "pointer" : "default",
      );
      return;
    }
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
    this._roomSketch = null;
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
