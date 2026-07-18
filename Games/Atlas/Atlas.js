// ─────────────────────────────────────────────────────────────────────────────
// Level — "ATLAS"  ·  code: HARBOR  ·  chamber XI  ·  align, then read
//
// Drawn in the game's pencil-sketch idiom: a nautical chart with a faint
// grid, a coastline, and fourteen named landmarks scattered across it.
// On the desk rests a punched card — an opaque sheet with six windows cut
// out, each labelled with a small roman numeral (I–VI, NOT in spatial
// order), and a registration mark ⌖ etched near its corner.
//
// The chart hides the same ⌖ mark among its details. Nothing explains any
// of this and nothing snaps: the player must find both marks, lay the card
// so they coincide, and read the landmark isolated by each window — first
// letters, in numeral order:
//
//   I Hollow Cove · II Ashen Point · III Raven Rock ·
//   IV Bone Quay · V Old Mill · VI Rust Fen           →   HARBOR
//
// Every other placement shows a meaningless mix of the eight decoy names.
// There is no in-scene solve detection — the access code is the proof.
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const AT_SKETCH = 0xd8d2c4; // the pencil itself

// the punched card, in local pixels (centre origin)
const AT_SHEET_W = 400;
const AT_SHEET_H = 320;
const AT_MARK_LOCAL = { x: -AT_SHEET_W / 2 + 26, y: -AT_SHEET_H / 2 + 26 };
// six windows: numeral order spells the word; spatial order does not
const AT_HOLES = [
  { n: "I", x: 120, y: -90 },
  { n: "II", x: -40, y: -30 },
  { n: "III", x: -130, y: -110 },
  { n: "IV", x: 60, y: 30 },
  { n: "V", x: -100, y: 90 },
  { n: "VI", x: 150, y: 110 },
];
const AT_HOLE_W = 96;
const AT_HOLE_H = 40;
// target landmark per numeral — initials spell HARBOR
const AT_TARGETS = [
  "Hollow Cove",
  "Ashen Point",
  "Raven Rock",
  "Bone Quay",
  "Old Mill",
  "Rust Fen",
];
// decoy landmarks, as fractions of the canvas
const AT_DECOYS = [
  { n: "Salt Marsh", x: 0.13, y: 0.6 },
  { n: "Gull Cliff", x: 0.18, y: 0.22 },
  { n: "Dead Pines", x: 0.3, y: 0.72 },
  { n: "Iron Shoal", x: 0.12, y: 0.4 },
  { n: "Widow's Watch", x: 0.33, y: 0.16 },
  { n: "Fog Landing", x: 0.26, y: 0.47 },
  { n: "Cinder Hill", x: 0.42, y: 0.68 },
  { n: "Low Bridge", x: 0.44, y: 0.3 },
];

class AtlasScene extends Phaser.Scene {
  constructor() {
    super({ key: "Atlas" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    this.events.once("shutdown", () => this.shutdown());
    this.input.mouse.disableContextMenu();

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ── the pencil: jittered hand-drawn primitives ─────────────────────────────

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
    const steps = 14;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * 1.4;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // a small registration mark: circle + crosshair
  _drawRegMark(g, rnd, x, y, alpha) {
    this._pencilCircle(g, rnd, x, y, 6, 1.1, AT_SKETCH, alpha);
    this._pencilSeg(g, rnd, x - 11, y, x + 11, y, 1, AT_SKETCH, alpha, 0.8);
    this._pencilSeg(g, rnd, x, y - 11, x, y + 11, 1, AT_SKETCH, alpha, 0.8);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    // the chart's frame
    this._chart = {
      x0: W * 0.08,
      y0: H * 0.1,
      x1: W * 0.78,
      y1: H * 0.82,
    };
    // the chart's registration mark — the sheet's anchor point
    this._regMark = { x: W * 0.5, y: H * 0.3 };

    this._drawRoom(W, H);
    this._drawChart(W, H);
    this._drawLandmarks(W, H);
    this._drawTexts(W, H);
    this._makeSheet(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  // the sketched wall/desk behind the chart
  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(8811);
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.9;
      this._pencilSeg(
        g,
        rnd,
        x,
        y,
        x + 14 + rnd() * 30,
        y + (rnd() - 0.5) * 10,
        1,
        AT_SKETCH,
        0.04,
        1.6,
      );
    }
  }

  // frame, grid, coastline, compass rose, hidden registration mark
  _drawChart(W, H) {
    const c = this._chart;
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(4141);

    // paper tint
    g.fillStyle(AT_SKETCH, 0.025);
    g.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);

    // doubled frame
    this._pencilRect(
      g,
      rnd,
      c.x0,
      c.y0,
      c.x1 - c.x0,
      c.y1 - c.y0,
      1.5,
      AT_SKETCH,
      0.5,
      2,
    );
    this._pencilRect(
      g,
      rnd,
      c.x0 - 8,
      c.y0 - 8,
      c.x1 - c.x0 + 16,
      c.y1 - c.y0 + 16,
      1,
      AT_SKETCH,
      0.2,
      2,
    );

    // faint survey grid + coordinates
    const cols = 8;
    const rows = 6;
    const gw = (c.x1 - c.x0) / cols;
    const gh = (c.y1 - c.y0) / rows;
    g.lineStyle(1, AT_SKETCH, 0.06);
    for (let i = 1; i < cols; i++) {
      g.lineBetween(c.x0 + i * gw, c.y0, c.x0 + i * gw, c.y1);
    }
    for (let i = 1; i < rows; i++) {
      g.lineBetween(c.x0, c.y0 + i * gh, c.x1, c.y0 + i * gh);
    }
    for (let i = 0; i < cols; i++) {
      this.add
        .text(c.x0 + (i + 0.5) * gw, c.y0 - 16, String.fromCharCode(65 + i), {
          fontFamily: '"Special Elite", monospace',
          fontSize: "11px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setAlpha(0.6)
        .setDepth(-7);
    }
    for (let i = 0; i < rows; i++) {
      this.add
        .text(c.x0 - 16, c.y0 + (i + 0.5) * gh, String(i + 1), {
          fontFamily: '"Special Elite", monospace',
          fontSize: "11px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setAlpha(0.6)
        .setDepth(-7);
    }

    // a wandering coastline through the chart
    const rndC = this._rng(2727);
    const coast = [];
    const segs = 16;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = c.x0 + (c.x1 - c.x0) * t;
      const midY =
        c.y0 + (c.y1 - c.y0) * (0.52 + Math.sin(t * Math.PI * 2.3) * 0.16);
      coast.push({ x, y: midY + (rndC() - 0.5) * 26 });
    }
    for (let i = 0; i < coast.length - 1; i++) {
      this._pencilSeg(
        g,
        rndC,
        coast[i].x,
        coast[i].y,
        coast[i + 1].x,
        coast[i + 1].y,
        1.3,
        AT_SKETCH,
        0.3,
        2,
      );
    }
    // hatching on the water side of the coast
    for (let i = 1; i < coast.length - 1; i += 2) {
      this._pencilSeg(
        g,
        rndC,
        coast[i].x,
        coast[i].y + 7,
        coast[i].x + 16,
        coast[i].y + 11,
        1,
        AT_SKETCH,
        0.1,
        1.2,
      );
    }

    // compass rose, top right of the chart
    const cx = W * 0.72;
    const cy = H * 0.16;
    this._pencilCircle(g, rnd, cx, cy, 20, 1.2, AT_SKETCH, 0.4);
    this._pencilCircle(g, rnd, cx, cy, 13, 1, AT_SKETCH, 0.25);
    this._pencilSeg(g, rnd, cx, cy + 16, cx, cy - 24, 1.3, AT_SKETCH, 0.5, 1);
    this._pencilSeg(
      g,
      rnd,
      cx - 4,
      cy - 14,
      cx,
      cy - 24,
      1.1,
      AT_SKETCH,
      0.5,
      0.8,
    );
    this._pencilSeg(
      g,
      rnd,
      cx + 4,
      cy - 14,
      cx,
      cy - 24,
      1.1,
      AT_SKETCH,
      0.5,
      0.8,
    );
    this.add
      .text(cx, cy - 34, "N", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "12px",
        color: "#c9bfa4",
      })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(-7);

    // the chart's registration mark — quiet, among everything else
    const rndM = this._rng(9339);
    this._drawRegMark(g, rndM, this._regMark.x, this._regMark.y, 0.4);
  }

  // fourteen named landmarks: six targets placed by the sheet's geometry,
  // eight decoys scattered from fixed fractions
  _drawLandmarks(W, H) {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(6006);

    // where the sheet's centre sits when its mark covers the chart's mark
    const alignedCX = this._regMark.x - AT_MARK_LOCAL.x;
    const alignedCY = this._regMark.y - AT_MARK_LOCAL.y;

    const put = (name, x, y) => {
      this._pencilCircle(g, rnd, x, y - 6, 2.2, 1, AT_SKETCH, 0.55);
      this.add
        .text(x, y + 8, name, {
          fontFamily: '"Special Elite", monospace',
          fontSize: "12px",
          color: "#c9bfa4",
        })
        .setOrigin(0.5)
        .setAlpha(0.8)
        .setDepth(-5);
    };

    for (let i = 0; i < AT_HOLES.length; i++) {
      put(AT_TARGETS[i], alignedCX + AT_HOLES[i].x, alignedCY + AT_HOLES[i].y);
    }
    for (const d of AT_DECOYS) {
      put(d.n, W * d.x, H * d.y);
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "THE CHART SURVIVED. THE SHIP DID NOT.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 11", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── the punched card ────────────────────────────────────────────────────────

  _makeSheet(W, H) {
    // opaque card with the windows punched straight through the texture
    if (this.textures.exists("atlasSheetTex"))
      this.textures.remove("atlasSheetTex");
    const tex = this.textures.createCanvas(
      "atlasSheetTex",
      AT_SHEET_W,
      AT_SHEET_H,
    );
    const ctx = tex.getContext();
    ctx.fillStyle = "#14171d";
    ctx.fillRect(0, 0, AT_SHEET_W, AT_SHEET_H);
    ctx.globalCompositeOperation = "destination-out";
    for (const h of AT_HOLES) {
      ctx.fillRect(
        AT_SHEET_W / 2 + h.x - AT_HOLE_W / 2,
        AT_SHEET_H / 2 + h.y - AT_HOLE_H / 2,
        AT_HOLE_W,
        AT_HOLE_H,
      );
    }
    tex.refresh();

    const cont = this.add.container(W * 0.87, H * 0.78).setDepth(15);
    const img = this.add.image(0, 0, "atlasSheetTex").setAlpha(0.985);
    cont.add(img);

    // pencil dressing: frame, window outlines, numerals, registration mark
    const g = this.add.graphics();
    const rnd = this._rng(7557);
    this._pencilRect(
      g,
      rnd,
      -AT_SHEET_W / 2,
      -AT_SHEET_H / 2,
      AT_SHEET_W,
      AT_SHEET_H,
      1.6,
      AT_SKETCH,
      0.6,
      2,
    );
    for (const h of AT_HOLES) {
      this._pencilRect(
        g,
        rnd,
        h.x - AT_HOLE_W / 2,
        h.y - AT_HOLE_H / 2,
        AT_HOLE_W,
        AT_HOLE_H,
        1.2,
        AT_SKETCH,
        0.5,
        1.2,
      );
    }
    const rndM = this._rng(5115);
    this._drawRegMark(g, rndM, AT_MARK_LOCAL.x, AT_MARK_LOCAL.y, 0.75);
    cont.add(g);

    for (const h of AT_HOLES) {
      const t = this.add
        .text(h.x + AT_HOLE_W / 2 - 4, h.y + AT_HOLE_H / 2 + 3, h.n, {
          fontFamily: '"Special Elite", monospace',
          fontSize: "11px",
          color: "#a49d8a",
        })
        .setOrigin(1, 0);
      cont.add(t);
    }

    const zone = this.add
      .zone(0, 0, AT_SHEET_W, AT_SHEET_H)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    cont.add(zone);

    // world-position tracking, same pattern as every draggable in the game
    zone.on("dragstart", (p) => {
      cont.setDepth(20);
      cont.dragOffX = cont.x - p.worldX;
      cont.dragOffY = cont.y - p.worldY;
      this._paperTick(0.1);
    });
    zone.on("drag", (p) => {
      cont.x = p.worldX + cont.dragOffX;
      cont.y = p.worldY + cont.dragOffY;
    });
    zone.on("dragend", () => {
      cont.setDepth(15);
      this._paperTick(0.08);
    });

    this._sheet = cont;
  }

  _drawVignette(W, H) {
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.5,
      0.5,
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
      0.55,
      0.55,
    );
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0.45,
      0,
      0.45,
      0,
    );
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0.45,
      0,
      0.45,
    );
    vg.fillRect(W - v, 0, v, H);
  }

  _spawnDust(W, H) {
    const rnd = this._rng(3773);
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

  _paperTick(vol) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const dur = 0.05;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 1.6;
      const g = ac.createGain();
      g.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * vol;
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._sheet = null;
    if (this.textures.exists("atlasSheetTex"))
      this.textures.remove("atlasSheetTex");
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    if (this.textures.exists("atlasSheetTex"))
      this.textures.remove("atlasSheetTex");
  }
}
