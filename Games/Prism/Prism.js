// ─────────────────────────────────────────────────────────────────────────────
// Level — "PRISM"  ·  code: PRISM  ·  very hard  ·  glass-pane stacking
//
// The spiritual sequel to Level 1, turned cruel:
//   · 12 transparent glass panes, scattered and randomly ROTATED
//   · 5 sketched frames on the wall (marked I..V)
//   · each frame needs exactly TWO panes, correctly turned — their etched
//     fragments overlap into one letter: P·R·I·S·M
//   · 2 panes are decoys that belong to no frame
//   · tap a pane to turn it 90°, drag to place it; panes stack transparently
//
// Fairness devices (hard, not hopeless):
//   · each real pane carries a tiny glassmaker's mark (1..5 dots) hinting at
//     its frame — but the decoys carry forged marks (2 and 4 dots)
//   · letters I and S read correctly upside-down; the validators accept it
//
// Same scene contract as the other levels: GAME_LEVELS, initGlobalAudio,
// transitionToLevel(), canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

class PrismScene extends Phaser.Scene {
  constructor() {
    super({ key: "Prism" });
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

  // ── Pane inventory ─────────────────────────────────────────────────────────
  // Strokes live on a 140x140 pane; letters sit in roughly [-30..30]x[-46..46].
  // ok = accepted resting angles. Slot 3 (S) additionally requires both panes
  // to share the same angle (each half alone is point-symmetric junk).

  _pieceDefs() {
    return [
      // P — frame I
      {
        id: "P_A", slot: 0, marks: 1, ok: [0],
        strokes: [
          [[-25, -45], [-25, 45]],
          [[-25, -3], [18, -3]],
        ],
      },
      {
        id: "P_B", slot: 0, marks: 1, ok: [0],
        strokes: [
          [[-25, -45], [18, -45]],
          [[18, -45], [27, -37], [27, -11], [18, -3]],
        ],
      },
      // R — frame II
      {
        id: "R_A", slot: 1, marks: 2, ok: [0],
        strokes: [
          [[-25, -45], [-25, 45]],
          [[-2, -4], [27, 45]],
        ],
      },
      {
        id: "R_B", slot: 1, marks: 2, ok: [0],
        strokes: [
          [[-25, -45], [17, -45]],
          [[17, -45], [26, -37], [26, -12], [17, -4]],
          [[17, -4], [-25, -4]],
        ],
      },
      // I — frame III (reads the same upside-down)
      {
        id: "I_A", slot: 2, marks: 3, ok: [0, 180],
        strokes: [[[0, -45], [0, 45]]],
      },
      {
        id: "I_B", slot: 2, marks: 3, ok: [0, 180],
        strokes: [
          [[-20, -45], [20, -45]],
          [[-20, 45], [20, 45]],
        ],
      },
      // S — frame IV (halves are point-symmetric: angles must MATCH)
      {
        id: "S_A", slot: 3, marks: 4, ok: [0, 180],
        strokes: [
          [[26, -38], [14, -46], [-14, -46], [-26, -36], [-26, -14], [-14, -6], [8, 0]],
        ],
      },
      {
        id: "S_B", slot: 3, marks: 4, ok: [0, 180],
        strokes: [
          [[-26, 38], [-14, 46], [14, 46], [26, 36], [26, 14], [14, 6], [-8, 0]],
        ],
      },
      // M — frame V
      {
        id: "M_A", slot: 4, marks: 5, ok: [0],
        strokes: [
          [[-30, 45], [-30, -45]],
          [[-30, -45], [0, 8]],
        ],
      },
      {
        id: "M_B", slot: 4, marks: 5, ok: [0],
        strokes: [
          [[0, 8], [30, -45]],
          [[30, -45], [30, 45]],
        ],
      },
      // decoys — forged marks, strokes that almost belong somewhere
      {
        id: "X_1", slot: null, marks: 2, ok: [],
        strokes: [
          [[24, -36], [10, -45], [-14, -45], [-25, -33]],
          [[-25, -33], [-25, 20]],
        ],
      },
      {
        id: "X_2", slot: null, marks: 4, ok: [],
        strokes: [
          [[-20, -45], [-20, 45]],
          [[-20, 0], [14, 0]],
        ],
      },
    ];
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.isSolved = false;
    this.pieces = [];
    this.slots = [];

    // ── background gradient (cooler than Level 1 — moonlit atelier) ──
    this.bgGfx = this.add.graphics().setDepth(-10);
    this.drawBg = (w, h) => {
      this.bgGfx.clear();
      this.bgGfx.fillGradientStyle(0x1c2233, 0x1c2233, 0x07080d, 0x07080d, 1);
      this.bgGfx.fillRect(0, 0, w, h);
    };
    this.drawBg(width, height);

    this.roomGfx = this.add.graphics().setDepth(-5);
    this.dropZoneGfx = this.add.graphics().setDepth(-2);

    this.statusText = this.add
      .text(width / 2, 50, "Five frames. Twelve panes. Two of them lie.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    this.subText = this.add
      .text(width / 2, 78, "drag a pane into a frame · tap a pane to turn it", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "14px",
        color: "#8a93a8",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    this.levelText = this.add
      .text(width - 30, 30, "Level 8", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setAlpha(0);
    this.tweens.add({
      targets: this.levelText,
      alpha: 1,
      duration: 2000,
      ease: "Power2",
    });

    this.numeralTexts = [];
    const numerals = ["I", "II", "III", "IV", "V"];
    for (let i = 0; i < 5; i++) {
      this.numeralTexts.push(
        this.add
          .text(0, 0, numerals[i], {
            fontFamily: '"Special Elite", monospace',
            fontSize: "16px",
            color: "#ffffff",
          })
          .setOrigin(0.5)
          .setAlpha(0.28),
      );
    }

    this._layout(width, height);
    this.drawRoom(this.roomGfx, width, height);
    this.drawFrames(false);

    // ── panes: shuffled spawn order, random initial rotation ──
    const defs = Phaser.Utils.Array.Shuffle(this._pieceDefs().slice());
    const cols = 6;
    defs.forEach((def, i) => {
      const col = i % cols;
      const row = (i / cols) | 0;
      const gx =
        width * 0.5 +
        (col - (cols - 1) / 2) * (this.slotW * 1.18) +
        Phaser.Math.Between(-8, 8);
      const gy =
        height * (row === 0 ? 0.66 : 0.85) + Phaser.Math.Between(-6, 6);
      this.createPiece(
        def,
        Phaser.Math.Clamp(gx, 70, width - 70),
        Phaser.Math.Clamp(gy, 120, height - 60),
      );
    });

    // ── drag logic (Level-1 style, plus un-snapping and tap-to-rotate) ──
    this.input.on("dragstart", (pointer, obj) => {
      if (this.isSolved || !obj.pieceDef) return;
      this.children.bringToTop(obj);
      if (obj.slotIndex !== null && obj.slotIndex !== undefined) {
        const s = this.slots[obj.slotIndex];
        Phaser.Utils.Array.Remove(s.plates, obj);
        obj.slotIndex = null;
      }
      if (window.playClick) window.playClick(this);
    });

    this.input.on("drag", (pointer, obj, dragX, dragY) => {
      if (this.isSolved || !obj.pieceDef) return;
      obj.x = dragX;
      obj.y = dragY;
    });

    this.input.on("dragend", (pointer, obj) => {
      if (this.isSolved || !obj.pieceDef) return;
      let best = -1,
        bestD = this.slotW * 0.62;
      this.slots.forEach((s, i) => {
        const d = Phaser.Math.Distance.Between(obj.x, obj.y, s.x, s.y);
        if (d < bestD && s.plates.length < 4) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0) {
        const s = this.slots[best];
        obj.slotIndex = best;
        s.plates.push(obj);
        this.tweens.add({
          targets: obj,
          x: s.x,
          y: s.y,
          duration: 150,
          ease: "Power2",
          onComplete: () => {
            if (window.playClick) window.playClick(this);
            this.checkWin();
          },
        });
      }
    });

    // ── RESIZE ──
    this.events.on("canvas_resized", (size) => {
      const w = size.width,
        h = size.height;
      this.drawBg(w, h);
      this.statusText.setPosition(w / 2, 50);
      this.subText.setPosition(w / 2, 78);
      this.levelText.setPosition(w - 30, 30);
      this._layout(w, h);
      this.drawRoom(this.roomGfx, w, h);
      this.drawFrames(this.isSolved);
      const k = this.slotW / 148;
      this.pieces.forEach((p) => {
        p.setScale(k);
        if (p.slotIndex !== null && p.slotIndex !== undefined) {
          const s = this.slots[p.slotIndex];
          p.setPosition(s.x, s.y);
        } else {
          p.x = Phaser.Math.Clamp(p.x, 70, w - 70);
          p.y = Phaser.Math.Clamp(p.y, 120, h - 60);
        }
      });
    });

    if (!this.skipFadeIn) {
      this.cameras.main.fadeIn(600, 0, 0, 0);
    }
  }

  // frame geometry — recomputed on resize
  _layout(w, h) {
    this.slotW = Phaser.Math.Clamp(Math.min(w / 6.6, 150), 88, 150);
    const gap = this.slotW * 0.22;
    const total = 5 * this.slotW + 4 * gap;
    const x0 = w / 2 - total / 2 + this.slotW / 2;
    const y = h * 0.38;
    for (let i = 0; i < 5; i++) {
      if (!this.slots[i]) this.slots[i] = { plates: [] };
      this.slots[i].x = x0 + i * (this.slotW + gap);
      this.slots[i].y = y;
      this.numeralTexts[i].setPosition(
        this.slots[i].x,
        y + this.slotW / 2 + 18,
      );
    }
  }

  // ── pane construction ──────────────────────────────────────────────────────

  createPiece(def, x, y) {
    const c = this.add.container(x, y);
    c.setSize(128, 128);
    c.setInteractive({ cursor: "grab" });
    this.input.setDraggable(c);

    const gfx = this.add.graphics();
    this.drawPane(gfx, def);
    c.add(gfx);

    c.pieceDef = def;
    c.slotIndex = null;
    c._spin = [90, 180, 270][Phaser.Math.Between(0, 2)];
    c.setAngle(c._spin);
    c.setScale(this.slotW / 148);

    // tap (press+release without movement) rotates the pane 90°
    c.on("pointerup", (pointer) => {
      if (this.isSolved) return;
      const d = Phaser.Math.Distance.Between(
        pointer.downX,
        pointer.downY,
        pointer.upX,
        pointer.upY,
      );
      if (d < 6) this.rotatePiece(c);
    });

    this.pieces.push(c);
  }

  rotatePiece(c) {
    if (this.isSolved || c._spinning) return;
    c._spinning = true;
    c._spin += 90;
    if (window.playClick) window.playClick(this);
    this.tweens.add({
      targets: c,
      angle: c._spin,
      duration: 160,
      ease: "Cubic.easeOut",
      onComplete: () => {
        c._spinning = false;
        c.setAngle(c._spin);
        this.checkWin();
      },
    });
  }

  drawPane(gfx, def) {
    const sketchLine = (pts, alphaMod = 1, thickness = 1.2) => {
      const passes = thickness > 2 ? 3 : 2;
      for (let p = 0; p < passes; p++) {
        gfx.lineStyle(thickness, 0xffffff, (0.8 - p * 0.2) * alphaMod);
        for (let sIdx = 0; sIdx < pts.length - 1; sIdx++) {
          const [x0, y0] = pts[sIdx];
          const [x1, y1] = pts[sIdx + 1];
          gfx.beginPath();
          gfx.moveTo(x0, y0);
          const steps = thickness > 2 ? 8 : 5;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const jx = i < steps ? Phaser.Math.Between(-1, 1) : 0;
            const jy = i < steps ? Phaser.Math.Between(-1, 1) : 0;
            gfx.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
          }
          gfx.strokePath();
        }
      }
    };

    // glass body — translucent, faintly blue, with a diagonal sheen
    const tints = [0xcfe6ff, 0xd8eaff, 0xc8e2f8];
    gfx.fillStyle(tints[Phaser.Math.Between(0, 2)], 0.06);
    gfx.fillRoundedRect(-62, -62, 124, 124, 9);
    gfx.fillStyle(0xffffff, 0.03);
    gfx.fillRoundedRect(-62, -62, 124, 62, 9);
    gfx.lineStyle(8, 0xffffff, 0.045);
    gfx.lineBetween(-44, -60, 8, 60);
    gfx.lineBetween(-16, -60, 30, 60);

    // sketched rim
    sketchLine([[-62, -62], [62, -62]], 0.55, 1.5);
    sketchLine([[62, -62], [62, 62]], 0.55, 1.5);
    sketchLine([[62, 62], [-62, 62]], 0.55, 1.5);
    sketchLine([[-62, 62], [-62, -62]], 0.55, 1.5);

    // faint abstract scratches — noise, like Level 1
    for (let i = 0; i < 3; i++) {
      sketchLine(
        [
          [Phaser.Math.Between(-52, 52), Phaser.Math.Between(-52, 52)],
          [Phaser.Math.Between(-52, 52), Phaser.Math.Between(-52, 52)],
        ],
        0.14,
        1.2,
      );
    }

    // the etched letter fragments
    def.strokes.forEach((pts) => sketchLine(pts, 1.0, 4.5));

    // glassmaker's mark — a tiny cluster of dots, bottom-right
    gfx.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < def.marks; i++) {
      const mx = 40 + (i % 3) * 8;
      const my = 46 + ((i / 3) | 0) * 8;
      gfx.fillCircle(mx, my, 2);
    }
  }

  // ── win logic ──────────────────────────────────────────────────────────────

  _norm(a) {
    return ((Math.round(a) % 360) + 360) % 360;
  }

  checkWin() {
    if (this.isSolved) return;
    const required = [
      ["P_A", "P_B"],
      ["R_A", "R_B"],
      ["I_A", "I_B"],
      ["S_A", "S_B"],
      ["M_A", "M_B"],
    ];
    for (let i = 0; i < 5; i++) {
      const s = this.slots[i];
      if (s.plates.length !== 2) return;
      const ids = s.plates.map((p) => p.pieceDef.id).sort();
      if (ids.join() !== required[i].slice().sort().join()) return;
      for (const p of s.plates) {
        if (!p.pieceDef.ok.includes(this._norm(p._spin))) return;
      }
      // S: both halves must rest at the SAME angle
      if (i === 3) {
        const a = this._norm(s.plates[0]._spin);
        const b = this._norm(s.plates[1]._spin);
        if (a !== b) return;
      }
    }

    this.isSolved = true;
    this.pieces.forEach((p) => {
      this.input.setDraggable(p, false);
      p.disableInteractive();
    });

    this.statusText.setText("The light agrees. Read the glass.");
    this.statusText.setColor("#1aaf7a");
    this.subText.setAlpha(0);
    this.drawFrames(true);

    this.slots.forEach((s, i) => {
      s.plates.forEach((p) => {
        this.tweens.add({
          targets: p,
          scale: p.scale * 1.07,
          duration: 320,
          yoyo: true,
          delay: i * 120,
          ease: "Sine.easeInOut",
        });
      });
    });
  }

  // ── scenery ────────────────────────────────────────────────────────────────

  drawFrames(gold) {
    const g = this.dropZoneGfx;
    g.clear();
    const color = gold ? 0xd9b96a : 0xffffff;
    const alpha = gold ? 0.65 : 0.22;
    const sketchLine = (x0, y0, x1, y1) => {
      g.lineStyle(2, color, alpha);
      g.beginPath();
      g.moveTo(x0, y0);
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const jx = i < steps ? Phaser.Math.Between(-2, 2) : 0;
        const jy = i < steps ? Phaser.Math.Between(-2, 2) : 0;
        g.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
      }
      g.strokePath();
    };
    const hw = this.slotW / 2 + 8;
    this.slots.forEach((s) => {
      sketchLine(s.x - hw, s.y - hw, s.x + hw, s.y - hw);
      sketchLine(s.x + hw, s.y - hw, s.x + hw, s.y + hw);
      sketchLine(s.x + hw, s.y + hw, s.x - hw, s.y + hw);
      sketchLine(s.x - hw, s.y + hw, s.x - hw, s.y - hw);
    });
    this.numeralTexts.forEach((t) =>
      t.setColor(gold ? "#d9b96a" : "#ffffff"),
    );
  }

  drawRoom(g, w, h) {
    g.clear();

    const sketchLine = (x0, y0, x1, y1, alphaMod = 1) => {
      const drawPass = (ox, oy, noise) => {
        g.lineStyle(1.2, 0xffffff, 0.22 * alphaMod);
        g.beginPath();
        g.moveTo(x0 + ox, y0 + oy);
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const jx = i < steps ? Phaser.Math.Between(-noise, noise) : 0;
          const jy = i < steps ? Phaser.Math.Between(-noise, noise) : 0;
          g.lineTo(x0 + (x1 - x0) * t + ox + jx, y0 + (y1 - y0) * t + oy + jy);
        }
        g.strokePath();
      };
      drawPass(0, 0, 0);
      drawPass(-1, 1, 1);
      drawPass(1, -1, 1);
    };

    const vx = w / 2;
    const vy = h * 0.4;
    const bwW = w * 0.7;
    const bwH = h * 0.55;
    const bwL = vx - bwW / 2;
    const bwR = vx + bwW / 2;
    const bwT = vy - bwH * 0.35;
    const bwB = vy + bwH * 0.65;

    const ext = (px, py) => {
      const dx = px - vx;
      const dy = py - vy;
      return { x: vx + dx * 15, y: vy + dy * 15 };
    };

    sketchLine(bwL, bwT, bwR, bwT, 0.8);
    sketchLine(bwL, bwB, bwR, bwB, 0.8);
    sketchLine(bwL, bwT, bwL, bwB, 0.8);
    sketchLine(bwR, bwT, bwR, bwB, 0.8);

    const tl = ext(bwL, bwT);
    const tr = ext(bwR, bwT);
    const bl = ext(bwL, bwB);
    const br = ext(bwR, bwB);

    sketchLine(bwL, bwT, tl.x, tl.y, 0.5);
    sketchLine(bwR, bwT, tr.x, tr.y, 0.5);
    sketchLine(bwL, bwB, bl.x, bl.y, 0.5);
    sketchLine(bwR, bwB, br.x, br.y, 0.5);

    const boardH = h * 0.04;
    sketchLine(bwL, bwB - boardH, bwR, bwB - boardH, 1.5);

    const baseBl = ext(bwL, bwB - boardH);
    const baseBr = ext(bwR, bwB - boardH);
    sketchLine(bwL, bwB - boardH, baseBl.x, baseBl.y, 1.2);
    sketchLine(bwR, bwB - boardH, baseBr.x, baseBr.y, 1.2);

    const numBoards = 8;
    for (let i = 1; i < numBoards; i++) {
      const t = i / numBoards;
      const px = bwL + bwW * t;
      const pExt = ext(px, bwB);
      sketchLine(px, bwB, pExt.x, pExt.y, 0.25);
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  transitionToLevel(levelKey, skipFade = false) {
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

    const levelIndex = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const levelNumber = levelIndex !== -1 ? levelIndex + 1 : "?";

    const nextLvlText = this.add
      .text(width / 2, height / 2, "Level " + levelNumber + "...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "48px",
        color: "#ffffff",
      })
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
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
