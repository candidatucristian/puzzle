// ─────────────────────────────────────────────────────────────────────────────
// Level — "GRILLE"  ·  code: RGB  ·  chamber XIII  ·  one glass, three pages
//
// Drawn in the game's pencil-sketch idiom: three pages (I, II, III), each a
// hand-typed 5×5 field of letters — blank until the glass finds them. A
// single stencil — a pane cut with one straight slit — can be dragged onto
// any page (no snap, it rests wherever it's dropped) and turned with the
// ⟳ control; only the five letters under the slit ever show.
//
// Rotating the stencil turns its slit from a row into a column and back.
// Over each page, exactly one of the four turns lines the slit up with a
// real word:
//
//   page I   at 0°    →  R E D · ·
//   page II  at 90°   →  G R E E N
//   page III at 180°  →  B L U E ·
//
// Every other page/turn shows only noise. Read the three words, first
// letter of each, in page order:  R · G · B  →  RGB
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const GR_SKETCH = 0xd8d2c4; // the pencil itself
const GR_CELL = 44;
const GR_GRID = GR_CELL * 5;
const GR_HALF = GR_GRID / 2;

// page grids: row-major, 5×5, '·' = intentionally blank.
// correctRot: 0 = slit is the middle-ish row (row index 1), 1 = 90° (col 3),
// 2 = 180° (row 3). Every other combination in this file is deliberate noise.
const GR_PAGES = [
  { correctRot: 0, rows: ["KXQZV", "RED··", "WJYFH", "TNSLM", "CBPGU"] },
  { correctRot: 1, rows: ["QXZGV", "WYHRF", "KJTEP", "LMSEU", "BCDNA"] },
  { correctRot: 2, rows: ["JKQXZ", "WYHFP", "RMSDT", "BLUE·", "CGHKO"] },
];
const GR_NUMERALS = ["I", "II", "III"];

class GrilleScene extends Phaser.Scene {
  constructor() {
    super({ key: "Grille" });
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

    // discovery + solved state survive resizes
    this._discovered = new Set();
    this._solved = false;
    this._stencilRot = 0;
    this._rotating = false;

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
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, mag), width, color, alpha);
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
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const pageY = H * 0.36;
    this._pages = [
      { x: W * 0.22, y: pageY },
      { x: W * 0.5, y: pageY },
      { x: W * 0.78, y: pageY },
    ];
    this._trayPos = { x: W / 2, y: H * 0.72 };
    this._rotateBtnPos = { x: W / 2, y: H * 0.86 };

    this._drawRoom(W, H);
    this._drawPagesAndTexts(W, H);
    this._drawTray();
    this._makeStencil();
    this._makeRotateButton();
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    this._updateReveal();
    if (this._solved) this._applySolved(true);
  }

  // the sketched wall the pages are pinned to
  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(5511);
    const floorY = H * 0.95;
    const cwx1 = W * 0.09;
    const cwx2 = W * 0.91;
    this._pencilSeg(g, rnd, cwx1, H * 0.06, cwx1, floorY, 1, GR_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, cwx2, H * 0.06, cwx2, floorY, 1, GR_SKETCH, 0.1, 2.4);
    this._pencilSeg(g, rnd, 0, H * 0.035, cwx1, H * 0.06, 1, GR_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, W, H * 0.035, cwx2, H * 0.06, 1, GR_SKETCH, 0.08, 2);
    this._pencilSeg(g, rnd, 0, floorY, W, floorY, 1.4, GR_SKETCH, 0.18, 2);
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.9;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 30, y + (rnd() - 0.5) * 10, 1, GR_SKETCH, 0.04, 1.6);
    }
  }

  // pages: blank 5×5 fields — a letter only shows once the glass finds it
  _drawPagesAndTexts(W, H) {
    this._pageFrames = [];
    this._pageLetterGrid = [];

    for (let p = 0; p < GR_PAGES.length; p++) {
      const page = GR_PAGES[p];
      const cx = this._pages[p].x;
      const cy = this._pages[p].y;

      const g = this.add.graphics().setDepth(-6);
      const rndFrame = this._rng(1000 + p * 91);
      this._pencilRect(g, rndFrame, cx - GR_HALF - 10, cy - GR_HALF - 10, GR_GRID + 20, GR_GRID + 20, 1.4, GR_SKETCH, 0.4, 2);
      g.fillStyle(GR_SKETCH, 0.5);
      g.fillCircle(cx - GR_HALF, cy - GR_HALF - 10, 1.8);
      g.fillCircle(cx + GR_HALF, cy - GR_HALF - 10, 1.8);

      // faint 5×5 grid — so an empty page still reads as "a page"
      const gridG = this.add.graphics().setDepth(-6);
      gridG.lineStyle(1, GR_SKETCH, 0.1);
      for (let i = -2; i <= 2; i++) {
        gridG.lineBetween(cx + (i - 0.5) * GR_CELL, cy - GR_HALF, cx + (i - 0.5) * GR_CELL, cy + GR_HALF);
        gridG.lineBetween(cx - GR_HALF, cy + (i - 0.5) * GR_CELL, cx + GR_HALF, cy + (i - 0.5) * GR_CELL);
      }

      // numeral tag
      const tagG = this.add.graphics().setDepth(-5);
      const rndTag = this._rng(2000 + p * 77);
      this._pencilRect(tagG, rndTag, cx - 20, cy - GR_HALF - 46, 40, 26, 1.2, GR_SKETCH, 0.5, 1.6);
      this.add
        .text(cx, cy - GR_HALF - 33, GR_NUMERALS[p], {
          fontFamily: '"Special Elite", monospace',
          fontSize: "14px",
          color: "#e8dcc0",
        })
        .setOrigin(0.5)
        .setDepth(-4);

      // the letters — jittered position + tilt, seeded per page, hidden
      // until revealed through the slit (see _updateReveal)
      const rndL = this._rng(4000 + p * 131);
      const grid = [];
      for (let r = 0; r < 5; r++) {
        const gridRow = [];
        for (let c = 0; c < 5; c++) {
          const ch = page.rows[r][c];
          const jx = (rndL() - 0.5) * 4;
          const jy = (rndL() - 0.5) * 4;
          const jr = (rndL() - 0.5) * 14;
          if (ch === "·") {
            rndL(); // keep the stream aligned even for blanks
            gridRow.push(null);
            continue;
          }
          const t = this.add
            .text(
              cx + (c - 2) * GR_CELL + jx,
              cy + (r - 2) * GR_CELL + jy,
              ch,
              {
                fontFamily: '"Special Elite", monospace',
                fontSize: "19px",
                color: "#c9bfa4",
              },
            )
            .setOrigin(0.5)
            .setAngle(jr)
            .setAlpha(0)
            .setDepth(-3);
          gridRow.push(t);
        }
        grid.push(gridRow);
      }
      this._pageLetterGrid.push(grid);
      this._pageFrames.push({ x: cx, y: cy, border: g });
    }

    this.statusText = this.add
      .text(W / 2, 40, "GLASS OVER INK.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.subText = this.add
      .text(W / 2, 68, "drag the stencil onto a page, then turn it — see what shows through", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 13", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  _drawTray() {
    const g = this.add.graphics().setDepth(-6);
    const rnd = this._rng(6161);
    const t = this._trayPos;
    const dashW = GR_GRID + 30;
    const dashH = GR_GRID + 30;
    g.lineStyle(1, GR_SKETCH, 0.18);
    const step = 10;
    const x0 = t.x - dashW / 2;
    const y0 = t.y - dashH / 2;
    for (let dx = x0; dx < x0 + dashW - 4; dx += step) {
      g.lineBetween(dx, y0, dx + 5, y0);
      g.lineBetween(dx, y0 + dashH, dx + 5, y0 + dashH);
    }
    for (let dy = y0; dy < y0 + dashH - 4; dy += step) {
      g.lineBetween(x0, dy, x0, dy + 5);
      g.lineBetween(x0 + dashW, dy, x0 + dashW, dy + 5);
    }
    this.add
      .text(t.x, t.y + GR_HALF + 30, "rest the stencil here when done", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "11px",
        color: "#7d7768",
      })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(-5);
  }

  // ── the stencil: a pane cut with one straight slit ──────────────────────────

  // the 5 (col,row) offsets exposed by the slit at rotation 0 — a full row,
  // one cell above centre. Matches how the page grids were authored.
  _slitBaseCells() {
    const cells = [];
    for (let co = -2; co <= 2; co++) cells.push({ co, ro: -1 });
    return cells;
  }

  // rotating (c,r) by 90° `times` — matches how the page grids were authored
  _rotateCR(c, r, times) {
    let cc = c;
    let rr = r;
    for (let i = 0; i < times; i++) {
      const nc = -rr;
      const nr = cc;
      cc = nc;
      rr = nr;
    }
    return { c: cc, r: rr };
  }

  _slitCellsForRotation(steps) {
    return this._slitBase.map(({ co, ro }) => {
      const { c, r } = this._rotateCR(co, ro, ((steps % 4) + 4) % 4);
      return { row: r + 2, col: c + 2 };
    });
  }

  _makeStencil() {
    this._slitBase = this._slitBaseCells();

    const cont = this.add.container(this._trayPos.x, this._trayPos.y).setDepth(15);
    cont.setAngle(this._stencilRot);

    const g = this.add.graphics();
    const rnd = this._rng(9911);
    // a faint pane tint across the whole card
    g.fillStyle(0x1c2028, 0.2);
    g.fillRect(-GR_HALF, -GR_HALF, GR_GRID, GR_GRID);
    // the slit's own edges — a clean cut, crisper than the rest of the frame
    this._pencilSeg(g, rnd, -GR_HALF, -1.5 * GR_CELL, GR_HALF, -1.5 * GR_CELL, 1.4, GR_SKETCH, 0.6, 1);
    this._pencilSeg(g, rnd, -GR_HALF, -0.5 * GR_CELL, GR_HALF, -0.5 * GR_CELL, 1.4, GR_SKETCH, 0.6, 1);
    // outer frame
    this._pencilRect(g, rnd, -GR_HALF, -GR_HALF, GR_GRID, GR_GRID, 1.6, GR_SKETCH, 0.6, 2);

    // corner ornament — the orientation mark, turns with the card
    const markG = this.add.graphics();
    const rndM = this._rng(7733);
    const mx = GR_HALF - 16;
    const my = -GR_HALF + 16;
    this._pencilSeg(markG, rndM, mx - 7, my, mx, my - 7, 1.4, GR_SKETCH, 0.75, 1.2);
    this._pencilSeg(markG, rndM, mx, my - 7, mx + 7, my, 1.4, GR_SKETCH, 0.75, 1.2);
    this._pencilSeg(markG, rndM, mx + 7, my, mx, my + 7, 1.4, GR_SKETCH, 0.75, 1.2);
    this._pencilSeg(markG, rndM, mx, my + 7, mx - 7, my, 1.4, GR_SKETCH, 0.75, 1.2);

    cont.add(g);
    cont.add(markG);

    const zone = this.add
      .zone(0, 0, GR_GRID, GR_GRID)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    cont.add(zone);

    // world-position tracking — dragX/dragY are local-space and would drift
    // under the container's rotation
    zone.on("dragstart", (p) => {
      cont.setDepth(20);
      cont.dragOffX = cont.x - p.worldX;
      cont.dragOffY = cont.y - p.worldY;
      this._paperTick(0.1);
    });
    zone.on("drag", (p) => {
      cont.x = p.worldX + cont.dragOffX;
      cont.y = p.worldY + cont.dragOffY;
      this._updateReveal();
    });
    zone.on("dragend", () => {
      cont.setDepth(15);
      this._checkAlignment();
    });

    this._stencil = cont;
  }

  _makeRotateButton() {
    const pos = this._rotateBtnPos;
    const cont = this.add.container(pos.x, pos.y).setDepth(20);
    const g = this.add.graphics();
    const rnd = this._rng(5050);
    g.lineStyle(1.3, GR_SKETCH, 0.5);
    g.strokeCircle(0, 0, 22);
    cont.add(g);
    const icon = this.add
      .text(0, 0, "⟳", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "24px",
        color: "#c9bfa4",
      })
      .setOrigin(0.5);
    cont.add(icon);
    this.add
      .text(pos.x, pos.y + 34, "ROTATE", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "11px",
        color: "#7d7768",
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.75)
      .setDepth(20);

    const zone = this.add
      .zone(0, 0, 50, 50)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    cont.add(zone);
    zone.on("pointerdown", () => this._rotateStencil(icon, g));
  }

  _rotateStencil(icon, ring) {
    if (this._rotating || !this._stencil) return;
    this._rotating = true;
    this._stencilRot = (this._stencilRot + 90) % 360;
    this._paperTick(0.14);
    this.tweens.add({
      targets: [icon, ring],
      scale: { from: 1, to: 1.15 },
      yoyo: true,
      duration: 140,
    });
    this.tweens.add({
      targets: this._stencil,
      angle: this._stencil.angle + 90,
      duration: 300,
      ease: "Quad.easeInOut",
      onUpdate: () => this._updateReveal(),
      onComplete: () => {
        this._rotating = false;
        this._checkAlignment();
      },
    });
  }

  // ── alignment · solving ──────────────────────────────────────────────────────

  // which page (if any) the stencil currently rests on, within tolerance
  _engagedPage() {
    if (!this._stencil) return -1;
    let nearest = -1;
    let best = Infinity;
    for (let i = 0; i < this._pages.length; i++) {
      const pg = this._pages[i];
      const d = Math.hypot(this._stencil.x - pg.x, this._stencil.y - pg.y);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    return nearest !== -1 && best <= GR_CELL * 1.2 ? nearest : -1;
  }

  // pure visuals: which letters are currently showing through the slit,
  // plus any page already solved permanently keeping its word lit
  _updateReveal() {
    if (!this._pageLetterGrid) return;
    const engaged = this._engagedPage();
    const steps = (Math.round(this._stencilRot / 90) % 4 + 4) % 4;
    const liveCells = engaged !== -1 ? this._slitCellsForRotation(steps) : [];

    for (let p = 0; p < GR_PAGES.length; p++) {
      const revealed = new Set();
      if (this._discovered.has(p)) {
        for (const cell of this._slitCellsForRotation(GR_PAGES[p].correctRot)) {
          revealed.add(cell.row + "," + cell.col);
        }
      }
      if (p === engaged) {
        for (const cell of liveCells) revealed.add(cell.row + "," + cell.col);
      }
      const grid = this._pageLetterGrid[p];
      const color = this._discovered.has(p) ? "#d9c9a0" : "#c9bfa4";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const t = grid[r][c];
          if (!t) continue;
          t.setColor(color);
          t.setAlpha(revealed.has(r + "," + c) ? 0.95 : 0);
        }
      }
    }
  }

  _checkAlignment() {
    this._updateReveal();
    if (!this._stencil || this._solved) return;
    const nearest = this._engagedPage();
    if (nearest === -1) return;

    const rot = (Math.round(this._stencilRot / 90) % 4 + 4) % 4;
    if (rot !== GR_PAGES[nearest].correctRot) return;
    if (this._discovered.has(nearest)) return;

    this._discovered.add(nearest);
    this._pulsePage(nearest);
    this._paperTick(0.2);
    this._updateReveal();

    if (this._discovered.size >= GR_PAGES.length) {
      this._solved = true;
      this._chime();
      this._applySolved();
    }
  }

  _pulsePage(index) {
    const frame = this._pageFrames[index];
    if (!frame) return;
    const glow = this.add
      .circle(frame.x, frame.y, GR_HALF + 20, 0xd9c9a0, 0)
      .setStrokeStyle(2, 0xd9c9a0, 0.5)
      .setDepth(16);
    this.tweens.add({
      targets: glow,
      radius: GR_HALF + 40,
      alpha: { from: 0.6, to: 0 },
      duration: 700,
      ease: "Quad.easeOut",
      onComplete: () => glow.destroy(),
    });
  }

  _applySolved(instant) {
    this.statusText.setText("All three panes align. Read what the glass allowed.");
    this.statusText.setColor("#d9c9a0");
    if (instant) {
      this.subText.setAlpha(0);
      return;
    }
    this.tweens.add({ targets: this.subText, alpha: 0, duration: 400 });
  }

  _drawVignette(W, H) {
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0, 0.45, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.45, 0, 0.45);
    vg.fillRect(W - v, 0, v, H);
  }

  _spawnDust(W, H) {
    const rnd = this._rng(8877);
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
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
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

  _chime() {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const master = ac.createGain();
      master.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.35;
      master.connect(ac.destination);
      const partials = [
        [523.3, 0.9, 2.0],
        [659.3, 0.6, 1.8],
        [784.0, 0.45, 1.6],
      ];
      let delay = 0;
      for (const [f, amp, dur] of partials) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t + delay);
        g.gain.linearRampToValueAtTime(amp, t + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        o.connect(g);
        g.connect(master);
        o.start(t + delay);
        o.stop(t + delay + dur + 0.1);
        delay += 0.09;
      }
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._stencil = null;
    this._pageFrames = [];
    this._pageLetterGrid = [];
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
