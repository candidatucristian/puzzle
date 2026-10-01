import { drawRoom } from "./room.js";
import { drawWindow, releaseWindowArt } from "./window.js";
import { makeMoonTexture } from "../../shared/moon.js";
import { ConstellationHover, HOVER_TUNE } from "./constellations.js";
import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "TELESCOPE"  ·  code: ORION  ·  TOOL (Braille alphabet)
//
// PHASE 1 (ROOM): a pencil sketch of a child on tiptoe at a telescope, aimed
//   out the window. Click the telescope to go to the glass.
// PHASE 2 (SKY): the same window, right up close — a tall arch filling the
//   screen, sheer curtains tied back either side, a moonlit valley beyond.
//   Five groups of stars sit on perfect 2×3 grids — Braille cells (dot layout
//   1 4 / 2 5 / 3 6), read left to right. Hovering one draws its
//   constellation, star by star (see constellations.js).
//
//   O = 1,3,5   R = 1,2,3,5   I = 2,4   O = 1,3,5   N = 1,3,4,5  →  ORION
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

// vertical slots, deliberately out of order so the cells never line up in a
// tidy diagonal across the window
const ROW_ORDER = [2, 4, 0, 3, 1, 5, 6];

const TUNE = {
  CELL_W: 0.054, // width of a 2×3 cell, as a fraction of min(W,H)
  CELL_H: 0.05, // row pitch of a cell, same units
  STAR_COUNT: 90, // background decorative stars
  TWINKLE: 1.4, // global multiplier on star twinkle amplitude
  // the hover itself — speed, line strength, halo, ghost dots, chime — is
  // tuned in HOVER_TUNE, in constellations.js
};

const PHASE = { ROOM: 0, TRANSITION: 1, SKY: 2 };

export default class TelescopeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Telescope" });
  }

  init(data) {
    this.skipFadeIn =
      data && data.skipFade !== undefined ? data.skipFade : true;
  }

  // ── the pencil: jittered hand-drawn primitives ────────────────────────────

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha) {
    super._pencilCircle(g, rnd, cx, cy, r, width, color, alpha, 14, 1.4);
  }

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

  create() {
    this.beginScene();

    const cfg = (this.services.levels.definitions || []).find(
      (l) => l.key === "Telescope",
    );
    this.ANSWER = cfg && cfg.code ? cfg.code.toUpperCase() : "ORION";

    this.isSolved = false;
    this.phase = PHASE.ROOM;
    this._transitionTarget = PHASE.ROOM;
    this._pointerOut = false;
    this._backHit = false;
    this._groups = [];
    this._hover = null;

    this._W = this.cameras.main.width;
    this._H = this.cameras.main.height;

    this._buildRoom(true);
    this._startAmbient();

    this.input.on("pointerdown", (p) => this._onDown(p));
    this.input.on("pointermove", (p) => this._onMove(p));
    this.input.on("pointerup", () => this._onUp());
    this.input.on("pointerupoutside", () => this._onUp());
    // Phaser stops updating the pointer once it leaves the canvas, so without
    // this a constellation drawn just before the cursor wanders off stays lit
    this.input.on("gameout", () => {
      this._pointerOut = true;
    });
    this.input.on("gameover", () => {
      this._pointerOut = false;
    });

    this.listenToResize(({ width, height }) => {
      this._W = width;
      this._H = height;
      const target =
        this.phase === PHASE.TRANSITION ? this._transitionTarget : this.phase;
      this._teardown();
      // Resizing cancels the animation that would normally end the transition.
      this.phase = target;
      if (target === PHASE.SKY) this._buildSky();
      else this._buildRoom(true);
    });
  }

  // ── PHASE 1 · The room with the telescope ─────────────────────────────────

  _buildRoom(fadeIn) {
    this.phase = PHASE.ROOM;
    this.input.setDefaultCursor("default");
    const W = this._W,
      H = this._H;

    this._room = this.add.container(0, 0).setDepth(1);

    const bg = this.add.graphics();
    bg.fillStyle(0x04050a, 1).fillRect(0, 0, W, H);
    this._room.add(bg);

    // the sketch lives in a centred container so the breathing zoom (and the
    // lean-in zoom on click) scale it around the middle of the screen
    const sk = this.add.container(W / 2, H / 2);
    this._room.add(sk);
    this._roomSketch = sk;
    this._roomArch = drawRoom(this, sk, W, H);

    this._breath = this.ambientTween({
      targets: sk,
      scale: 1.035,
      duration: 9000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this._makeRoomTwinkles(sk);

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

    const hint = this.add
      .text(W / 2, H * 0.92, "", {
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
        this.ambientTween({
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
      this.ambientTween({
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

  // ── Transition: room → window ─────────────────────────────────────────────

  _enterSky() {
    if (this.phase !== PHASE.ROOM) return;
    this._transitionTarget = PHASE.SKY;
    this.phase = PHASE.TRANSITION;
    this.input.setDefaultCursor("default");

    this.services.audio.playSfx("click", 0.8, this);
    this._whoosh();

    if (this._breath) {
      this._breath.stop();
      this._breath = null;
    }

    // a breath backward, then a dive INTO the window
    const H = this._H;
    if (this._roomSketch && !this.reducedMotion) {
      this.tweens.add({
        targets: this._roomSketch,
        scale: 0.93,
        duration: 320,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: this._roomSketch,
            scale: 2.1,
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
      delay: this.reducedMotion ? 0 : 460,
      duration: this.reducedMotion ? 1 : 480,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this._room.destroy(true);
        this._room = null;
        this._roomSketch = null;
        this._buildSky();
        if (!this.reducedMotion) this.cameras.main.fadeIn(420, 0, 0, 0);
        this.phase = PHASE.SKY;
      },
    });
  }

  _exitSky() {
    if (this.phase !== PHASE.SKY) return;
    this._transitionTarget = PHASE.ROOM;
    this.phase = PHASE.TRANSITION;
    this.input.setDefaultCursor("default");
    this._whoosh(true);
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this._teardown();
      this._buildRoom(false);
      this.cameras.main.fadeIn(420, 0, 0, 0);
    });
  }

  // ── PHASE 2 · At the glass ────────────────────────────────────────────────

  _buildSky() {
    const W = this._W,
      H = this._H;
    const { geo, backdrop, frame } = drawWindow(this, W, H);
    this._geo = geo;
    backdrop.setDepth(0);

    const scaleRef = Math.min(W, H);
    const dx = scaleRef * TUNE.CELL_W;
    const dy = scaleRef * TUNE.CELL_H;
    const area = geo.content;

    this._stars = [];
    this._groups = [];

    // the moon hangs where the window's painted moonlight expects it
    makeMoonTexture(this.textures, "tele_moon");
    const moonR = geo.moon.r;
    this._moon = this.add
      .image(geo.moon.x, geo.moon.y, "tele_moon")
      .setDepth(1);
    this._moon.setDisplaySize((moonR * 2) / 0.72, (moonR * 2) / 0.72);

    // 1) the Braille cells — one per character, spread left to right in
    //    reading order across the clear sky between the curtains. Every cell
    //    uses the same exact 2×3 grid, with no jitter at all: that perfect
    //    alignment is what marks them out from the scattered stars around.
    const letters = this.ANSWER.split("");
    const n = letters.length;
    const cellRnd = this._rng(2861);
    const pad = Math.max(20, scaleRef * 0.022);
    // every cell claims the full 2×3 footprint, so the hover areas are even
    const marginX = dx / 2 + pad;
    const top = area.y0 + dy + pad;
    const bottom = area.y1 - dy - pad;
    // on a narrow screen the hover boxes shrink so neighbours never overlap
    const spacing =
      n > 1 ? (area.x1 - area.x0 - marginX * 2) / (n - 1) : Infinity;
    const hoverPad = Math.max(6, Math.min(pad, (spacing - dx) / 2 - 2));

    letters.forEach((ch, i) => {
      const cx = Phaser.Math.Linear(
        area.x0 + marginX,
        area.x1 - marginX,
        n > 1 ? i / (n - 1) : 0.5,
      );
      const slot = ROW_ORDER[i % ROW_ORDER.length] % Math.max(n, 1);
      const cy = Phaser.Math.Linear(top, bottom, (slot + 0.5) / Math.max(n, 1));

      // dots in ascending number — the order the constellation draws in
      const dots = BRAILLE[ch] || [];
      dots.forEach((num, j) => {
        const [col, row] = BRAILLE_DOT_POS[num];
        this._stars.push({
          x: cx + (col * dx) / 2,
          y: cy + row * dy,
          r: scaleRef * 0.003 * (0.85 + cellRnd() * 0.3),
          base: 0.85,
          amp: 0.12,
          spd: 1.2 + cellRnd() * 0.4,
          phase: cellRnd() * Math.PI * 2,
          tint: 0xeaf4ff,
          signal: true,
          cell: i,
          dot: j,
        });
      });

      this._groups.push({
        dots,
        cx,
        cy,
        box: {
          x0: cx - dx / 2 - hoverPad,
          x1: cx + dx / 2 + hoverPad,
          y0: cy - dy - hoverPad,
          y1: cy + dy + hoverPad,
        },
      });
    });

    this._hover = new ConstellationHover(this, {
      cells: this._groups,
      dx,
      dy,
      S: scaleRef,
    });

    // 2) background scatter — plain stars across the open sky (not behind
    //    the curtains or the hills), kept clear of the cells and the moon
    const nearGroup = (x, y) =>
      this._groups.some(
        (gr) =>
          Math.abs(x - gr.cx) < dx / 2 + pad && Math.abs(y - gr.cy) < dy + pad,
      );
    const nearMoon = (x, y) =>
      Phaser.Math.Distance.Between(x, y, this._moon.x, this._moon.y) <
      moonR * 1.6;

    const bgRnd = this._rng(5531);
    const tints = [0xffffff, 0xffffff, 0xbfd4ff, 0xffe9c9, 0xd7e6ff];
    const sky = {
      x0: geo.hole.wl,
      x1: geo.hole.wr,
      y0: geo.hole.top,
      y1: geo.horizonY,
    };
    for (let k = 0; k < TUNE.STAR_COUNT; k++) {
      let x,
        y,
        tries = 0;
      do {
        x = sky.x0 + bgRnd() * (sky.x1 - sky.x0);
        y = sky.y0 + bgRnd() * (sky.y1 - sky.y0);
        tries++;
      } while (
        (!geo.inSky(x, y) || nearGroup(x, y) || nearMoon(x, y)) &&
        tries < 20
      );
      if (tries >= 20) continue;
      this._stars.push({
        x,
        y,
        r: 0.6 + bgRnd() * 1.5,
        base: 0.22 + bgRnd() * 0.4,
        amp: 0.12 + bgRnd() * 0.2,
        spd: 0.6 + bgRnd() * 2.2,
        phase: bgRnd() * Math.PI * 2,
        tint: tints[(bgRnd() * tints.length) | 0],
        signal: false,
      });
    }

    this._starGfx = this.add.graphics().setDepth(2);
    frame.setDepth(3);
    this._drawBackButton(W, H);

    if (this.phase !== PHASE.TRANSITION) this.phase = PHASE.SKY;
  }

  _drawBackButton(W, H) {
    const r = Math.max(16, Math.min(W, H) * 0.028);
    const bx = r + 18,
      by = r + 18;
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x241f14, 1).fillCircle(bx, by, r + 3);
    g.fillStyle(0x6a5a34, 1).fillCircle(bx, by, r);
    g.lineStyle(1.5, 0xa89252, 0.8).strokeCircle(bx, by, r);
    this.add
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
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  _onDown(p) {
    if (this.phase === PHASE.ROOM && this._roomScopeHit(p)) {
      this.game.events.emit("puzzle:interaction", {
        label: "",
        pressed: true,
        x: p.x,
        y: p.y,
      });
      this._enterSky();
    }
  }

  _onMove(p) {
    if (this.phase !== PHASE.ROOM) return;
    // hand cursor only over the telescope — that's the way in
    this.input.setDefaultCursor(this._roomScopeHit(p) ? "pointer" : "default");
    this.game.events.emit("puzzle:interaction", {
      label: this._roomScopeHit(p) ? "Look through the telescope" : "",
    });
  }

  _onUp() {
    if (!this._backHit) return;
    this._backHit = false;
    this._exitSky();
  }

  // ── Render loop ───────────────────────────────────────────────────────────

  update(time, delta) {
    this._updateAmbience();
    if (this.phase === PHASE.ROOM || !this._starGfx || !this._stars) return;
    const dt = Math.min(delta / 1000, 0.1);
    const t = this.ambientMotion ? this.time.now / 1000 : 0;
    const g = this._starGfx;
    g.clear();

    const ptr = this.input.activePointer;
    const live =
      ptr &&
      this.input.enabled &&
      !this._pointerOut &&
      this.phase === PHASE.SKY;
    const px = live ? ptr.x : NaN,
      py = live ? ptr.y : NaN;

    // the hovered cell draws its constellation, star by star, and the rest
    // of the sky steps back a little while it does
    const onCell = this._hover ? this._hover.update(dt, px, py, t) : false;
    if (this.phase === PHASE.SKY) {
      this.input.setDefaultCursor(onCell ? "pointer" : "default");
    }
    const focus = this._hover ? this._hover.focus : 0;
    const dim = 1 - HOVER_TUNE.FOCUS_DIM * focus;

    for (const s of this._stars) {
      let a = s.base + s.amp * TUNE.TWINKLE * Math.sin(t * s.spd + s.phase);
      const sparkle = Math.max(0, Math.sin(t * s.spd * 1.9 + s.phase * 1.7));
      a = Phaser.Math.Clamp(a, 0, 1);

      if (s.signal) {
        // a star brightens as its constellation's line reaches it
        const lit = this._hover ? this._hover.lit(s.cell, s.dot) : 0;
        const la = Phaser.Math.Clamp(a + 0.15 * lit, 0, 1);
        const R = s.r * (2.2 + sparkle * 0.6) * (1 + 0.35 * lit);
        this._fillSparkle(g, s.x, s.y, R, s.tint, la);
        g.fillStyle(0xffffff, Phaser.Math.Clamp(la + 0.1, 0, 1));
        g.fillCircle(s.x, s.y, Math.max(0.8, s.r * 0.5 * (1 + 0.4 * lit)));
      } else {
        a *= dim;
        if (s.r > 1.4) {
          g.fillStyle(s.tint, a * 0.1);
          g.fillCircle(s.x, s.y, s.r * 2.4);
        }
        g.fillStyle(s.tint, Phaser.Math.Clamp(a + 0.05, 0, 1));
        g.fillCircle(s.x, s.y, s.r);
      }
    }
  }

  // ── Synthesized ambience: night wind and crickets ─────────────────────────

  // The night comes in through the open window: wind and crickets play at the
  // glass and during the dive to it, not in the room, and follow mute and the
  // effects volume. (The gain used to be set only at the window, so the first
  // dive's whoosh went unheard and the room stayed noisy after a visit.)
  _updateAmbience() {
    const amb = this._amb;
    if (!amb || !amb.master) return;
    const st = this.services.audio.state;
    const vol = st ? (st.muted ? 0 : st.sfxVol) : 0.8;
    const target = this.phase === PHASE.ROOM ? 0 : vol * 0.5;
    if (target === this._ambTarget) return;
    this._ambTarget = target;
    const now = amb.ac.currentTime;
    amb.master.gain.cancelScheduledValues(now);
    amb.master.gain.setTargetAtTime(target, now, 0.12);
  }

  _startAmbient() {
    this._ambTarget = null;
    try {
      const ac = this.sound.context;
      const master = ac.createGain();
      master.gain.value = 0;
      master.connect(this.sound.destination);

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
    // destroy rather than just detach: removeAll(true) only took objects off
    // the display list, and a detached zone stays interactive — the back
    // button used to go on catching clicks, invisibly, in the room
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseWindowArt(this.textures);
    this._hover = null;
    this._room = null;
    this._roomSketch = null;
    this._roomArch = null;
    this._backZone = null;
    this._starGfx = null;
    this._stars = null;
    this._groups = [];
    this._moon = null;
    this._geo = null;
    this._backHit = false;
  }

  replay() {
    this._teardown();
    this.phase = PHASE.ROOM;
    this._buildRoom(false);
  }

  shutdown() {
    this._stopAmbient();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._hover = null;
    releaseWindowArt(this.textures);
  }
}
