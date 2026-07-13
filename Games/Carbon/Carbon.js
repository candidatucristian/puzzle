// ─────────────────────────────────────────────────────────────────────────────
// Level — "CARBON"  ·  code: RIBBON  ·  chamber XII  ·  a true Cardan grille
//
// A light table in a dark archive. Three onion-skin carbon copies of the
// same typed page — thirty-six letters each, all gibberish — and one
// brass stencil card punched with six holes.
//
// The cipher is the classical Cardan grille:
//   · only ONE page bears the same watermark as the stencil's engraving,
//     and the watermark only shows when the page lies on the lit table
//   · lay the stencil on the page and turn it until its mark sits
//     top-left — the six holes isolate six letters:  R I B B O N
//
// The other two pages are traps: through the same holes they spell
// PLATEN and MARGIN — plausible, typewriter-flavoured, and wrong.
//
// Interactions: drag pages / stencil; scroll or right-click on the
// stencil turns it 90°. Canvas-drawn, deterministic, WebAudio sounds.
// Same scene contract as the other levels.
// ─────────────────────────────────────────────────────────────────────────────

// hole positions (row, col) in reading order
const CARBON_HOLES = [
  [0, 1],
  [1, 4],
  [2, 2],
  [3, 5],
  [4, 0],
  [5, 3],
];

// what each page spells through the holes at the correct orientation
const CARBON_WORDS = ["RIBBON", "PLATEN", "MARGIN"]; // page 0 is the true one
const CARBON_MARKS = ["◉", "✕", "▲"]; // page watermarks; stencil is engraved ◉
const CARBON_DESK_ORDER = [1, 0, 2]; // pages fanned on the desk: B, A, C

class CarbonScene extends Phaser.Scene {
  constructor() {
    super({ key: "Carbon" });
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

    this._solved = false;
    this._tableId = null; // which page lies on the light table
    this._grilleRot = 1; // quarter-turns; starts wrong on purpose
    this._grilleSnapped = false;
    this._buildPageGrids();

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

  // 6×6 letter grids: gibberish everywhere except through the holes
  _buildPageGrids() {
    const consonants = "BCDFGHJKLMNPQRSTVWXZ";
    this._grids = [];
    for (let p = 0; p < 3; p++) {
      const rnd = this._rng(1213 + p * 917);
      const grid = Array.from({ length: 6 }, () =>
        Array.from(
          { length: 6 },
          () => consonants[Math.floor(rnd() * consonants.length)],
        ),
      );
      for (let h = 0; h < CARBON_HOLES.length; h++) {
        const [r, c] = CARBON_HOLES[h];
        grid[r][c] = CARBON_WORDS[p][h];
      }
      this._grids.push(grid);
    }
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    const deskY = H * 0.7;
    this._cell = Math.min(H * 0.052, 40);
    this._pad = this._cell * 0.55;
    this._side = 6 * this._cell + 2 * this._pad;
    this._table = { cx: W * 0.5, cy: H * 0.375, s: this._side + 84 };

    this._drawRoom(W, H, deskY);
    this._drawTable();
    this._drawTexts(W, H);

    this._makePages(W, H, deskY);
    this._makeGrille(W, H, deskY);

    this._drawVignette(W, H);
    this._spawnDust(W, H);

    // rebuild after a resize: restore whatever was on the table
    if (this._tableId !== null) {
      const id = this._tableId;
      this._tableId = null;
      this._putPageOnTable(id, true);
      if (this._grilleSnapped) this._snapGrille(true);
    }
    if (this._solved) this._applySolved(true);
  }

  _drawRoom(W, H, deskY) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x201d19, 0x1a1815, 0x100f0d, 0x0e0d0b, 1);
    g.fillRect(0, 0, W, deskY);
    const rnd = this._rng(7373);
    g.fillStyle(0x0c0b0a, 0.15);
    for (let i = 0; i < 8; i++) {
      g.fillEllipse(rnd() * W, rnd() * deskY * 0.8, 60 + rnd() * 140, 30 + rnd() * 60);
    }
    // archive shelving hinted in the gloom
    g.lineStyle(1, 0x000000, 0.25);
    for (let i = 0; i < 4; i++) {
      const y = deskY * 0.16 + i * deskY * 0.2;
      g.lineBetween(0, y, W * 0.16, y);
      g.lineBetween(W * 0.84, y, W, y);
    }
    g.fillStyle(0x0e0d0b, 1);
    g.fillRect(0, deskY - 12, W, 12);
    // desk
    g.fillGradientStyle(0x37301f, 0x3d3523, 0x1a1610, 0x1f1a12, 1);
    g.fillRect(0, deskY, W, H - deskY);
    g.lineStyle(1, 0x000000, 0.22);
    for (let i = 0; i < 14; i++) {
      const y = deskY + 6 + i * ((H - deskY) / 14) + (rnd() - 0.5) * 4;
      g.lineBetween(0, y, W, y + (rnd() - 0.5) * 6);
    }
    g.fillStyle(0x5a4a35, 0.5);
    g.fillRect(0, deskY, W, 2.5);
  }

  _drawTable() {
    const { cx, cy, s } = this._table;
    const g = this.add.graphics().setDepth(-8);
    // steel rim
    g.fillGradientStyle(0x32363e, 0x383c45, 0x14161a, 0x181a20, 1);
    g.fillRoundedRect(cx - s / 2 - 14, cy - s / 2 - 14, s + 28, s + 28, 12);
    g.lineStyle(1.5, 0x05060a, 1);
    g.strokeRoundedRect(cx - s / 2 - 14, cy - s / 2 - 14, s + 28, s + 28, 12);
    g.lineStyle(1, 0x4a4f5c, 0.35);
    g.strokeRoundedRect(cx - s / 2 - 11, cy - s / 2 - 11, s + 22, s + 22, 10);
    // milk glass
    g.fillGradientStyle(0xf2ead6, 0xece2ca, 0xd6cab0, 0xe0d5bb, 1);
    g.fillRoundedRect(cx - s / 2, cy - s / 2, s, s, 6);
    // breathing light
    const glow = this.add.graphics().setDepth(-7);
    glow.fillStyle(0xfff4da, 0.12);
    glow.fillRoundedRect(cx - s / 2, cy - s / 2, s, s, 6);
    this.tweens.add({
      targets: glow,
      alpha: 0.5,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // ── pages ──────────────────────────────────────────────────────────────────

  _makePages(W, H, deskY) {
    this._pages = [];
    const homes = [
      { x: W * 0.24, y: H * 0.855 },
      { x: W * 0.42, y: H * 0.875 },
      { x: W * 0.6, y: H * 0.85 },
    ];
    for (let slot = 0; slot < CARBON_DESK_ORDER.length; slot++) {
      const id = CARBON_DESK_ORDER[slot];
      const home = homes[slot];
      const cont = this.add.container(home.x, home.y).setDepth(8);
      cont.setScale(0.55);
      cont.setAngle((slot - 1) * 4); // lazily fanned
      cont.homeX = home.x;
      cont.homeY = home.y;
      cont.homeAngle = (slot - 1) * 4;
      cont.pageId = id;

      const side = this._side;
      const g = this.add.graphics();
      // onion-skin sheet
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(-side / 2 + 4, -side / 2 + 6, side, side, 3);
      g.fillStyle(0xe9e1cb, 0.95);
      g.fillRoundedRect(-side / 2, -side / 2, side, side, 3);
      g.lineStyle(1, 0x9a8f74, 0.6);
      g.strokeRoundedRect(-side / 2, -side / 2, side, side, 3);
      cont.add(g);

      // typed letters
      const grid = this._grids[id];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const t = this.add
            .text(
              -side / 2 + this._pad + (c + 0.5) * this._cell,
              -side / 2 + this._pad + (r + 0.5) * this._cell,
              grid[r][c],
              {
                fontFamily: '"Special Elite", monospace',
                fontSize: Math.round(this._cell * 0.58) + "px",
                color: "#241f16",
              },
            )
            .setOrigin(0.5)
            .setAlpha(0.82);
          t.gridPos = [r, c];
          cont.add(t);
        }
      }

      // watermark — a ghost until the table's light gets behind it
      const wm = this.add
        .text(-side / 2 + 26, -side / 2 + 28, CARBON_MARKS[id], {
          fontFamily: "Georgia, serif",
          fontSize: Math.round(this._cell * 0.9) + "px",
          color: "#6b5f45",
        })
        .setOrigin(0.5)
        .setAlpha(0.04);
      cont.add(wm);
      cont.watermark = wm;

      const zone = this.add
        .zone(0, 0, side, side)
        .setOrigin(0.5)
        .setInteractive({ draggable: true, useHandCursor: true });
      cont.add(zone);

      // follow the pointer's world position — see the stencil's drag note
      zone.on("dragstart", (p) => {
        cont.setDepth(15);
        cont.dragOffX = cont.x - p.worldX;
        cont.dragOffY = cont.y - p.worldY;
        this.tweens.add({ targets: cont, scale: 1, angle: 0, duration: 130 });
      });
      zone.on("drag", (p) => {
        cont.x = p.worldX + cont.dragOffX;
        cont.y = p.worldY + cont.dragOffY;
      });
      zone.on("dragend", (p) => {
        const t = this._table;
        if (
          Math.abs(p.x - t.cx) < t.s / 2 + 30 &&
          Math.abs(p.y - t.cy) < t.s / 2 + 30
        ) {
          this._putPageOnTable(id);
        } else {
          this._sendPageHome(id);
        }
      });

      this._pages.push(cont);
    }
  }

  _pageById(id) {
    return this._pages.find((c) => c.pageId === id);
  }

  _putPageOnTable(id, instant) {
    if (this._tableId === id) {
      const cme = this._pageById(id);
      this.tweens.add({
        targets: cme,
        x: this._table.cx,
        y: this._table.cy,
        scale: 1,
        angle: 0,
        duration: 150,
      });
      return;
    }
    if (this._tableId !== null) this._sendPageHome(this._tableId);
    this._tableId = id;
    const cont = this._pageById(id);
    cont.setDepth(8);
    this._paperSound(0.2);
    if (instant) {
      cont.x = this._table.cx;
      cont.y = this._table.cy;
      cont.setScale(1);
      cont.setAngle(0);
      cont.watermark.setAlpha(0.16);
    } else {
      this.tweens.add({
        targets: cont,
        x: this._table.cx,
        y: this._table.cy,
        scale: 1,
        angle: 0,
        duration: 200,
        ease: "Quad.easeOut",
      });
      this.tweens.add({
        targets: cont.watermark,
        alpha: 0.16,
        duration: 900,
        delay: 250,
      });
    }
    this._checkSolved();
  }

  _sendPageHome(id) {
    const cont = this._pageById(id);
    if (this._tableId === id) this._tableId = null;
    cont.setDepth(8);
    this._paperSound(0.12);
    this.tweens.add({
      targets: cont,
      x: cont.homeX,
      y: cont.homeY,
      scale: 0.55,
      angle: cont.homeAngle,
      duration: 220,
      ease: "Quad.easeOut",
    });
    this.tweens.add({ targets: cont.watermark, alpha: 0.04, duration: 300 });
    this._unsolveTint();
  }

  // ── the stencil ────────────────────────────────────────────────────────────

  _makeGrille(W, H, deskY) {
    const side = this._side;
    const home = { x: W * 0.79, y: H * 0.85 };
    const cont = this.add.container(home.x, home.y).setDepth(12);
    cont.setScale(0.55);
    cont.setAngle(this._grilleRot * 90);
    cont.homeX = home.x;
    cont.homeY = home.y;
    this._grille = cont;

    const g = this.add.graphics();
    // shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(-side / 2 + 4, -side / 2 + 6, side, side, 4);
    // brass card built cell by cell, skipping the holes
    const isHole = (r, c) => CARBON_HOLES.some(([hr, hc]) => hr === r && hc === c);
    const inner = side - 2 * this._pad;
    // frame margin strips
    g.fillGradientStyle(0x8a6f3c, 0x9b7f47, 0x4a3a1e, 0x5a4726, 1);
    g.fillRoundedRect(-side / 2, -side / 2, side, this._pad, 4);
    g.fillRoundedRect(-side / 2, side / 2 - this._pad, side, this._pad, 4);
    g.fillRect(-side / 2, -side / 2 + this._pad, this._pad, inner);
    g.fillRect(side / 2 - this._pad, -side / 2 + this._pad, this._pad, inner);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (isHole(r, c)) continue;
        g.fillRect(
          -side / 2 + this._pad + c * this._cell - 0.5,
          -side / 2 + this._pad + r * this._cell - 0.5,
          this._cell + 1,
          this._cell + 1,
        );
      }
    }
    // hole rims
    g.lineStyle(1.5, 0x2e2410, 0.9);
    for (const [r, c] of CARBON_HOLES) {
      g.strokeRect(
        -side / 2 + this._pad + c * this._cell + 1,
        -side / 2 + this._pad + r * this._cell + 1,
        this._cell - 2,
        this._cell - 2,
      );
    }
    // edge + engraved mark, top-left when the card reads true
    g.lineStyle(1.5, 0x17110a, 1);
    g.strokeRoundedRect(-side / 2, -side / 2, side, side, 4);
    cont.add(g);
    const mark = this.add
      .text(-side / 2 + 26, -side / 2 + 28, "◉", {
        fontFamily: "Georgia, serif",
        fontSize: Math.round(this._cell * 0.7) + "px",
        color: "#3a2c14",
      })
      .setOrigin(0.5);
    cont.add(mark);

    const zone = this.add
      .zone(0, 0, side, side)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    cont.add(zone);

    // NOTE: dragX/dragY are useless here — Phaser maps them into the
    // container's LOCAL space, so a rotated/scaled card would move the
    // wrong way. Follow the pointer's world position instead.
    zone.on("dragstart", (p) => {
      cont.setDepth(16);
      this._grilleSnapped = false;
      cont.dragOffX = cont.x - p.worldX;
      cont.dragOffY = cont.y - p.worldY;
      this._unsolveTint();
      this.tweens.add({ targets: cont, scale: 1, duration: 130 });
    });
    zone.on("drag", (p) => {
      cont.x = p.worldX + cont.dragOffX;
      cont.y = p.worldY + cont.dragOffY;
    });
    zone.on("dragend", (p) => {
      cont.setDepth(12);
      const t = this._table;
      if (
        this._tableId !== null &&
        Math.abs(p.x - t.cx) < t.s / 2 + 20 &&
        Math.abs(p.y - t.cy) < t.s / 2 + 20
      ) {
        this._snapGrille();
      } else if (
        Math.abs(p.x - t.cx) < t.s / 2 + 20 &&
        Math.abs(p.y - t.cy) < t.s / 2 + 20
      ) {
        // no page beneath — the stencil just lies on the glass
        this._brassSound(0.14);
      } else {
        this.tweens.add({
          targets: cont,
          x: cont.homeX,
          y: cont.homeY,
          scale: 0.55,
          duration: 220,
          ease: "Quad.easeOut",
        });
      }
    });
    zone.on("wheel", () => this._turnGrille());
    zone.on("pointerdown", (p) => {
      if (p.rightButtonDown()) this._turnGrille();
    });
  }

  _snapGrille(instant) {
    const cont = this._grille;
    this._grilleSnapped = true;
    this._brassSound(0.2);
    if (instant) {
      cont.x = this._table.cx;
      cont.y = this._table.cy;
      cont.setScale(1);
    } else {
      this.tweens.add({
        targets: cont,
        x: this._table.cx,
        y: this._table.cy,
        scale: 1,
        duration: 140,
        ease: "Quad.easeOut",
      });
    }
    this._checkSolved();
  }

  _turnGrille() {
    if (this._turning) return;
    this._turning = true;
    this._grilleRot = (this._grilleRot + 1) % 4;
    this._brassSound(0.12);
    this._unsolveTint();
    this.tweens.add({
      targets: this._grille,
      angle: this._grille.angle + 90,
      duration: 200,
      ease: "Quad.easeInOut",
      onComplete: () => {
        this._turning = false;
        this._checkSolved();
      },
    });
  }

  // ── solving ────────────────────────────────────────────────────────────────

  _checkSolved() {
    if (this._solved) return;
    if (this._tableId !== 0) return;
    if (!this._grilleSnapped) return;
    if (this._grilleRot % 4 !== 0) return;
    this._solved = true;
    this._chime();
    this._applySolved();
  }

  _applySolved(instant) {
    // the six revealed letters catch the light
    const page = this._pageById(0);
    for (const child of page.list) {
      if (!child.gridPos) continue;
      const [r, c] = child.gridPos;
      if (CARBON_HOLES.some(([hr, hc]) => hr === r && hc === c)) {
        child.setColor("#8a6f3c");
        child.setAlpha(1);
        if (!instant) {
          this.tweens.add({
            targets: child,
            scale: { from: 1, to: 1.25 },
            yoyo: true,
            duration: 200,
            delay: (r * 6 + c) * 18,
          });
        }
      }
    }
    this.statusText.setText("The stencil agrees.");
    this.statusText.setColor("#d9c9a0");
    this.subText.setAlpha(0);
  }

  // wrong-state housekeeping: gold tint comes off if anything moves
  _unsolveTint() {
    if (this._solved) return; // once earned, it stays
  }

  // ── texts · vignette · dust ────────────────────────────────────────────────

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "Three copies of the same page.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.subText = this.add
      .text(
        W / 2,
        68,
        "drag to the light table · scroll or right-click on the stencil turns it",
        {
          fontFamily: '"Special Elite", monospace',
          fontSize: "13px",
          color: "#a8905f",
        },
      )
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 12", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
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
    const rnd = this._rng(8787);
    const t = this._table;
    for (let i = 0; i < 12; i++) {
      const dx = t.cx - t.s / 2 - 40 + rnd() * (t.s + 80);
      const dy = t.cy - t.s / 2 - 60 + rnd() * (t.s + 100);
      const dot = this.add
        .circle(dx, dy, 0.7 + rnd() * 1.1, 0xffe9c0, 0.1 + rnd() * 0.14)
        .setDepth(-2);
      this.tweens.add({
        targets: dot,
        x: dx + (rnd() * 40 - 20),
        y: dy - (18 + rnd() * 32),
        alpha: 0,
        duration: 8000 + rnd() * 8000,
        delay: rnd() * 5000,
        repeat: -1,
        onRepeat: () => {
          dot.x = t.cx - t.s / 2 - 40 + rnd() * (t.s + 80);
          dot.y = t.cy + rnd() * t.s * 0.4;
          dot.setAlpha(0.1 + rnd() * 0.14);
        },
      });
    }
  }

  // ── sounds ─────────────────────────────────────────────────────────────────

  _burst(freq, q, dur, vol) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = q;
      const g = ac.createGain();
      g.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * vol;
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  _paperSound(vol) {
    this._burst(600, 0.8, 0.12, vol);
  }

  _brassSound(vol) {
    this._burst(1100, 3, 0.05, vol);
  }

  _chime() {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted)) return;
      const t = ac.currentTime;
      const master = ac.createGain();
      master.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.4;
      master.connect(ac.destination);
      const partials = [
        [523.3, 0.9, 2.2],
        [659.3, 0.6, 2.0],
        [784.0, 0.45, 1.8],
        [1046.5, 0.25, 1.4],
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
    this._pages = [];
    this._grille = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
