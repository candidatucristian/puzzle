// ─────────────────────────────────────────────────────────────────────────────
// Level — "WIRES"  ·  code: FACADE  ·  chamber XIV  ·  read the wires, play
//
// Drawn in the game's pencil-sketch idiom: one central telegraph pole (the
// reference photo's composition) carries five tightly-spaced wires that
// converge at its head and fan out to both screen edges. Six bird
// silhouettes sit ON the wires (never between them). No clef is drawn
// anywhere — realising the wires can be read as a staff IS the puzzle.
//
// Reading: staff lines a third apart; of the seven possible bottom-wire
// letters exactly ONE spells a word. Bottom→top D·F·A·C·E (a tenor-clef
// reading), birds left to right:
//
//   F(w2) · A(w3) · C(w4) · A(w3) · D(w1) · E(w5)   →   FACADE
//
// (Treble EGBDF would read ACECFG-style gibberish — every other shift
// fails too, so the reading is unique.)
//
// Below stands a small sketched piano — one octave, labeled keys, black
// keys in the real 2–3 pattern; every pressed key floats its note name up
// off the key. A sustain pedal toggle sits beside it. Playing
// F–A–C–A–D–E sends the birds off the wires — wings out, flapping — to
// the sound of assets/sounds/Wires/birds_fly.mp3. The access code is the
// word the birds spell:  FACADE
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, WebAudio sounds, same scene contract as the other
// levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const WI_SKETCH = 0xd8d2c4; // the pencil itself
const WI_MELODY = ["F", "A", "C", "A", "D", "E"];

// birds, left to right — every bird sits ON a wire (0 = bottom wire).
// wires read bottom→top as D F A C E, so these spell FACADE
const WI_BIRDS = [
  { note: "F", pos: 1 },
  { note: "A", pos: 2 },
  { note: "C", pos: 3 },
  { note: "A", pos: 2 },
  { note: "D", pos: 0 },
  { note: "E", pos: 4 },
];

// one octave of keys — white letters + the 2–3 black key pattern
const WI_WHITE = ["C", "D", "E", "F", "G", "A", "B", "C"];
const WI_FREQ = {
  C: 261.63, D: 293.66, E: 329.63, F: 349.23,
  G: 392.0, A: 440.0, B: 493.88, C2: 523.25,
  "C#": 277.18, "D#": 311.13, "F#": 369.99, "G#": 415.3, "A#": 466.16,
};
// black key after white index i (none after E=2 and B=6)
const WI_BLACK = { 0: "C#", 1: "D#", 3: "F#", 4: "G#", 5: "A#" };

class WiresScene extends Phaser.Scene {
  constructor() {
    super({ key: "Wires" });
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
    this.load.audio("birds_fly", "assets/sounds/Wires/birds_fly.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    this.events.once("shutdown", () => this.shutdown());
    this.input.mouse.disableContextMenu();

    // survives resizes
    this._flown = false;
    this._sustain = false;
    this._played = [];

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

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    // composition matched to the reference photo (assets/images/wires/
    // birds.png): ONE dark pole just right of centre, five wires converging
    // tightly at its top and fanning out to both screen edges, birds
    // clustered on either side. Tones inverted for the dark theme.
    this._geo = {
      poleX: W * 0.52,
      poleTop: H * 0.13,
      poleBottom: H * 0.6,
      // top-wire heights: at the pole the band is pinched together,
      // at the edges it spreads to full staff spacing (photo perspective)
      yPoleTop: H * 0.155,
      spPole: H * 0.009,
      yLeftTop: H * 0.125,
      yRightTop: H * 0.17,
      spEdge: H * 0.03,
    };

    this._drawRoom(W, H);
    this._drawPoleAndWires(W, H);
    this._makeBirds();
    this._makePiano(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);

    if (this._flown) this._applyFlown(true);
  }

  // wire w (0 = bottom, 4 = top) height at horizontal position x —
  // linear from edge band to the pinched band at the pole, plus sag
  _wireYAt(w, x) {
    const P = this._geo;
    const yPole = P.yPoleTop + (4 - w) * P.spPole;
    let yEdge, t;
    if (x <= P.poleX) {
      yEdge = P.yLeftTop + (4 - w) * P.spEdge;
      t = x / P.poleX; // 0 at left edge → 1 at pole
    } else {
      yEdge = P.yRightTop + (4 - w) * P.spEdge;
      t = (this._W - x) / (this._W - P.poleX); // 0 at right edge → 1 at pole
    }
    const y = yEdge + (yPole - yEdge) * t;
    return y + Math.sin(Math.PI * (1 - t)) * 2.5; // gentle sag mid-span
  }

  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(6446);
    // a low horizon line behind the poles
    this._pencilSeg(g, rnd, 0, H * 0.62, W, H * 0.615, 1, WI_SKETCH, 0.08, 2.6);
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.55;
      this._pencilSeg(g, rnd, x, y, x + 14 + rnd() * 30, y + (rnd() - 0.5) * 10, 1, WI_SKETCH, 0.04, 1.6);
    }
  }

  _drawPoleAndWires(W, H) {
    const P = this._geo;
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(5225);

    // the pole: one solid dark mast, slightly tapered, like the photo
    g.fillStyle(0x15181d, 0.96);
    g.fillPoints(
      [
        { x: P.poleX - 6, y: P.poleTop },
        { x: P.poleX + 6, y: P.poleTop },
        { x: P.poleX + 10, y: P.poleBottom },
        { x: P.poleX - 10, y: P.poleBottom },
      ],
      true,
    );
    this._pencilSeg(g, rnd, P.poleX - 6, P.poleTop, P.poleX - 10, P.poleBottom, 1.4, WI_SKETCH, 0.45, 1.6);
    this._pencilSeg(g, rnd, P.poleX + 6, P.poleTop, P.poleX + 10, P.poleBottom, 1.4, WI_SKETCH, 0.45, 1.6);
    this._pencilSeg(g, rnd, P.poleX - 6, P.poleTop, P.poleX + 6, P.poleTop, 1.6, WI_SKETCH, 0.5, 0.8);
    // wood grain hints
    for (let i = 0; i < 4; i++) {
      const gy = P.poleTop + (P.poleBottom - P.poleTop) * (0.2 + i * 0.2);
      this._pencilSeg(g, rnd, P.poleX - 5, gy, P.poleX + 5, gy + 2, 1, WI_SKETCH, 0.12, 0.8);
    }

    // the head: a short crossbar with insulator knobs where the wires tie,
    // pinched close together like the photo's bracket
    const barY = P.yPoleTop - 8;
    this._pencilSeg(g, rnd, P.poleX - 16, barY, P.poleX + 16, barY, 1.5, WI_SKETCH, 0.5, 1);
    for (let w = 0; w < 5; w++) {
      const y = P.yPoleTop + (4 - w) * P.spPole;
      const kx = P.poleX + (w % 2 === 0 ? -9 : 9); // knobs alternate sides
      g.fillStyle(WI_SKETCH, 0.5);
      g.fillCircle(kx, y, 2);
    }

    // five wires running edge → pole → edge, converging at the head
    this._wireGfx = g;
    for (let w = 0; w < 5; w++) {
      for (const [xa, xb] of [[0, P.poleX], [P.poleX, W]]) {
        const segs = 12;
        let prev = { x: xa, y: this._wireYAt(w, xa) };
        for (let i = 1; i <= segs; i++) {
          const x = xa + ((xb - xa) * i) / segs;
          const p = { x, y: this._wireYAt(w, x) };
          this._pencilSeg(g, rnd, prev.x, prev.y, p.x, p.y, 1.1, WI_SKETCH, 0.36, 0.7);
          prev = p;
        }
      }
    }
  }

  // ── the birds ───────────────────────────────────────────────────────────────

  // a plump, solid bird silhouette in the photo's pose — round chest,
  // small head, thin beak, short slanted tail (tones inverted: light on dark)
  _drawBird(g, rnd, flip) {
    const d = flip ? -1 : 1; // some birds face the other way
    g.fillStyle(0xece7d8, 0.95);
    // chubby body leaning slightly forward
    g.fillEllipse(0, -9, 17, 13);
    g.fillEllipse(2 * d, -12, 12, 11);
    // small head, high on the chest
    g.fillCircle(6 * d, -18, 4.6);
    // thin beak
    g.fillTriangle(10 * d, -19.5, 10 * d, -17, 15.5 * d, -18);
    // short tail, angled down toward the wire
    g.fillTriangle(-6 * d, -9, -17 * d, -2, -7 * d, -4);
    // eye
    g.fillStyle(0x101216, 0.9);
    g.fillCircle(7 * d, -18.6, 0.9);
    // pencil detailing: wing fold + legs down to the wire
    this._pencilSeg(g, rnd, -2 * d, -12, 5 * d, -7, 1, WI_SKETCH, 0.3, 0.8);
    this._pencilSeg(g, rnd, -2, -2, -2.5, 2, 1, WI_SKETCH, 0.55, 0.3);
    this._pencilSeg(g, rnd, 2, -2, 2.5, 2, 1, WI_SKETCH, 0.55, 0.3);
  }

  // one wing, drawn folded at the shoulder origin, pointing up-and-back —
  // during flight its scaleY beats between above and below the body
  _drawWing(g, rnd, s, flip) {
    const d = flip ? -1 : 1;
    g.fillStyle(0xece7d8, 0.95);
    g.fillTriangle(0, 0, -13 * s * d, -7 * s, -3 * s * d, -19 * s);
    g.fillTriangle(0, 0, -3 * s * d, -19 * s, 8 * s * d, -13 * s);
    this._pencilSeg(g, rnd, 0, 0, -3 * s * d, -19 * s, 1, WI_SKETCH, 0.5, 0.8);
    this._pencilSeg(g, rnd, -3 * s * d, -19 * s, 8 * s * d, -13 * s, 1, WI_SKETCH, 0.4, 0.8);
  }

  _makeBirds() {
    this._birds = [];
    if (this._flown) return;
    const rndX = this._rng(3663);
    // clustered left and right of the pole, like the photo's two flocks;
    // left-to-right order still reads F A C A D E
    const xs = [0.16, 0.27, 0.36, 0.62, 0.73, 0.85];

    for (let i = 0; i < WI_BIRDS.length; i++) {
      const b = WI_BIRDS[i];
      const x = this._W * xs[i] + (rndX() - 0.5) * 20;
      const y = this._wireYAt(b.pos, x) - 1; // feet on the wire
      const cont = this.add.container(x, y).setDepth(-5);
      cont.setAngle((rndX() - 0.5) * 8); // each sits a little differently
      const rnd = this._rng(1000 + i * 733);
      const flip = rndX() < 0.45;

      // far wing — behind the body, dimmer
      const wFar = this.add.graphics().setVisible(false).setAlpha(0.65);
      this._drawWing(wFar, rnd, 0.85, flip);
      wFar.setPosition(-2 * (flip ? -1 : 1), -10);
      cont.add(wFar);

      const g = this.add.graphics();
      this._drawBird(g, rnd, flip);
      cont.add(g);

      // near wing — in front, full strength
      const wNear = this.add.graphics().setVisible(false);
      this._drawWing(wNear, rnd, 1, flip);
      wNear.setPosition(1 * (flip ? -1 : 1), -11);
      cont.add(wNear);

      cont._wings = [wNear, wFar];
      this._birds.push(cont);
    }
  }

  // ── the piano ───────────────────────────────────────────────────────────────

  _makePiano(W, H) {
    const kw = Math.min(W * 0.036, 54);
    const kh = kw * 2.9;
    const total = kw * WI_WHITE.length;
    const x0 = W / 2 - total / 2;
    const y0 = H * 0.66;
    const rnd = this._rng(9229);
    const outline = this.add.graphics().setDepth(6);

    this._keys = [];
    for (let i = 0; i < WI_WHITE.length; i++) {
      const kx = x0 + i * kw;
      const body = this.add
        .rectangle(kx + kw / 2, y0 + kh / 2, kw - 3, kh, 0xe8dcc0, 0.92)
        .setDepth(4)
        .setInteractive({ useHandCursor: true });
      this._pencilRect(outline, rnd, kx + 1, y0, kw - 4, kh, 1.2, WI_SKETCH, 0.45, 1.4);

      const letter = i === WI_WHITE.length - 1 ? "C2" : WI_WHITE[i];
      body.on("pointerdown", () => this._pressKey(body, letter, 0xcfc4a6));
      this._keys.push(body);

      // the note's name, written low on the key
      this.add
        .text(kx + kw / 2, y0 + kh - 18, WI_WHITE[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: "15px",
          color: "#4a453a",
        })
        .setOrigin(0.5)
        .setDepth(6);
    }

    // black keys — the 2–3 pattern that lets a player find C
    for (const idxStr of Object.keys(WI_BLACK)) {
      const i = parseInt(idxStr);
      const bx = x0 + (i + 1) * kw;
      const body = this.add
        .rectangle(bx, y0 + kh * 0.31, kw * 0.58, kh * 0.62, 0x14171d, 0.97)
        .setDepth(5)
        .setInteractive({ useHandCursor: true });
      this._pencilRect(outline, rnd, bx - kw * 0.29, y0, kw * 0.58, kh * 0.62, 1.1, WI_SKETCH, 0.5, 1);
      body.on("pointerdown", () => this._pressKey(body, WI_BLACK[i], 0x2c3038));

      // the sharp's name, written low on the black key
      this.add
        .text(bx, y0 + kh * 0.62 - 14, WI_BLACK[i], {
          fontFamily: '"Special Elite", monospace',
          fontSize: "11px",
          color: "#8f8974",
        })
        .setOrigin(0.5)
        .setDepth(6);
    }

    // frame around the keyboard
    this._pencilRect(outline, rnd, x0 - 8, y0 - 8, total + 16, kh + 16, 1.4, WI_SKETCH, 0.5, 2);

    // sustain pedal, right of the keys — a toggle
    const px = x0 + total + 46;
    const py = y0 + kh * 0.72;
    this._pedalGfx = this.add.graphics().setDepth(6);
    this._pedalPos = { x: px, y: py };
    this._drawPedal();
    const pedalZone = this.add
      .zone(px, py, 56, 64)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    pedalZone.on("pointerdown", () => {
      this._sustain = !this._sustain;
      this._paperTick(0.12);
      this._drawPedal();
    });
  }

  _drawPedal() {
    const g = this._pedalGfx;
    g.clear();
    const rnd = this._rng(4884);
    const { x, y } = this._pedalPos;
    const on = this._sustain;
    // the pedal plate, tilted down when engaged
    const tilt = on ? 6 : 0;
    g.fillStyle(on ? 0x2a2e36 : 0x14171d, 0.95);
    g.fillRect(x - 16, y - 22 + tilt, 32, 44 - tilt);
    this._pencilRect(g, rnd, x - 16, y - 22 + tilt, 32, 44 - tilt, 1.2, WI_SKETCH, on ? 0.75 : 0.4, 1.2);
    this._pencilCircle(g, rnd, x, y + 30, 3, 1, WI_SKETCH, on ? 0.7 : 0.35);
  }

  _pressKey(body, letter, downColor) {
    const upColor = body.fillColor;
    body.setFillStyle(downColor, body.fillAlpha);
    this.time.delayedCall(140, () => body.setFillStyle(upColor, body.fillAlpha));
    this._tone(WI_FREQ[letter]);

    // the note's name rises off the key and fades
    const name = letter === "C2" ? "C" : letter;
    const label = this.add
      .text(body.x, body.y - body.height / 2 - 14, name, {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
      })
      .setOrigin(0.5)
      .setDepth(22);
    this.tweens.add({
      targets: label,
      y: label.y - 46,
      alpha: 0,
      duration: 800,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy(),
    });

    // black keys break the phrase on their own — their names aren't letters
    this._played.push(name);
    if (this._played.length > 12) this._played.shift();
    this._checkMelody();
  }

  _checkMelody() {
    if (this._flown) return;
    const tail = this._played.slice(-WI_MELODY.length);
    if (tail.length < WI_MELODY.length) return;
    for (let i = 0; i < WI_MELODY.length; i++) {
      if (tail[i] !== WI_MELODY[i]) return;
    }
    this._flown = true;
    this._flyAway();
  }

  // ── the reward: the birds leave ─────────────────────────────────────────────

  _flyAway() {
    // the recorded flutter of the flock taking off
    try {
      if (
        this.cache.audio.exists("birds_fly") &&
        !(window.GameAudio && window.GameAudio.muted)
      ) {
        this.sound.play("birds_fly", {
          volume: (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.9,
        });
      }
    } catch (e) {}

    const rnd = this._rng(2662);
    this._birds.forEach((cont, i) => {
      const dir = rnd() < 0.5 ? -1 : 1;
      const sx = cont.x;
      const sy = cont.y;
      // takeoff along a curve: a small dip off the wire, then up and away —
      // the WINGS beat (scaleY sweeps them above and below the shoulder),
      // the body itself only tilts with each stroke
      const cx = sx + dir * (60 + rnd() * 70);
      const cy = sy + 24 + rnd() * 16; // control point below: the dip
      const ex = sx + dir * (420 + rnd() * 260);
      const ey = sy - 340 - rnd() * 200;
      const flaps = 7 + Math.floor(rnd() * 3); // full wingbeats over the arc
      const phase = rnd() * Math.PI; // each bird beats out of sync
      const state = { t: 0 };
      cont.setDepth(10);
      if (cont._wings) for (const w of cont._wings) w.setVisible(true);
      this.tweens.add({
        targets: state,
        t: 1,
        duration: 1600 + rnd() * 500,
        delay: i * 130,
        ease: "Sine.easeIn",
        onUpdate: () => {
          const t = state.t;
          const u = 1 - t;
          cont.x = u * u * sx + 2 * u * t * cx + t * t * ex;
          cont.y = u * u * sy + 2 * u * t * cy + t * t * ey;
          const beat = Math.sin(t * flaps * Math.PI * 2 + phase);
          if (cont._wings) {
            // 1 = raised high, negative = swept below the body
            cont._wings[0].scaleY = 0.25 + beat * 1.05;
            cont._wings[1].scaleY = 0.25 + Math.sin(t * flaps * Math.PI * 2 + phase + 0.7) * 0.9;
          }
          cont.angle = dir * (-9 + beat * 5);
          cont.alpha = t < 0.68 ? 1 : Math.max(0, 1 - (t - 0.68) / 0.32);
        },
        onComplete: () => cont.setAlpha(0),
      });
    });
    this.time.delayedCall(2100, () => {
      if (this.statusText) this._applyFlown();
    });
  }

  _applyFlown(instant) {
    for (const b of this._birds) b.setAlpha(0);
    this.statusText.setText("The wires are empty now.");
    this.statusText.setColor("#d9c9a0");
    if (!instant) this._paperTick(0.18);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "FIVE WIRES. SIX BIRDS.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 14", {
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
    const rnd = this._rng(7997);
    for (let i = 0; i < 12; i++) {
      const dx = W * 0.08 + rnd() * W * 0.84;
      const dy = H * 0.08 + rnd() * H * 0.5;
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
          dot.y = H * 0.08 + rnd() * H * 0.45;
          dot.setAlpha(0.08 + rnd() * 0.1);
        },
      });
    }
  }

  // ── sounds ─────────────────────────────────────────────────────────────────

  // a soft piano-ish tone; sustain pedal stretches the release
  _tone(freq) {
    try {
      const ac = this.sound.context;
      if (!ac || (window.GameAudio && window.GameAudio.muted) || !freq) return;
      const t = ac.currentTime;
      const release = this._sustain ? 1.6 : 0.45;
      const master = ac.createGain();
      master.gain.value = (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.3;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      master.connect(lp);
      lp.connect(ac.destination);
      for (const [mult, amp] of [[1, 1], [2, 0.35], [3, 0.12]]) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "triangle";
        o.frequency.value = freq * mult;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + release);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + release + 0.1);
      }
    } catch (e) {}
  }

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

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._birds = [];
    this._keys = [];
    this._pedalGfx = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
