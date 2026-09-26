import { createCar } from "./cars.js";
import { drawPodium, RY_WINNERS } from "./podium.js";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { PENCIL } from "../../shared/theme.js";
import {
  RALLY_NUMBERS as RY_NUMBERS,
  RALLY_START_DELAY_MS,
  RALLY_SOUND_LEAD_MS,
  rallyLetters,
  rallyWord,
  measureWhooshLead,
  planRallyRound,
} from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "RALLY"  ·  code: SILVER   ·  read the numbers
//
// Drawn in the game's pencil-sketch idiom: the finish of a night rally stage.
// A gravel road runs left to right in front of us, floodlit from two towers,
// with a chequered gantry over the line and a bank of spectators standing
// behind the tape on the far side. Six cars come through in a fixed order, each
// with its race number painted on the door:
//
//   19  9  12  22  5  18   →   S I L V E R
//
// Nothing on screen says "alphabet". The numbers are the only text in the
// scene. The cars come in bunches, like a real stage — one alone, two close,
// two in line, the last two tight — each with a whoosh as it crosses the line
// (assets/sounds/Rally/wroom.mp3 — optional; the level stays silent and fully
// solvable without it). When the last car is through, the floodlights and
// lanterns go out and the marshal lowers his flag, and the top three of the
// stage come up on a board with their cups. That is the end: the race runs once
// (the game's restart button brings it back).
//
// All jitter is deterministic (seeded), so the sketch holds still across
// redraws. Canvas-drawn, with lifecycle provided by BasePuzzleScene.
// ─────────────────────────────────────────────────────────────────────────────

const RY_SKETCH = PENCIL; // the pencil itself
const RY_WARM = 0xffdf9e; // floodlight and headlamp colour
export default class RallyScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Rally" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    // optional: the level is silent (and still solvable) until this file exists
    this.load.audio("wroom", "assets/sounds/Rally/wroom.mp3");
  }

  create() {
    this.beginScene();

    this._finished = false; // a fresh visit: the race has not run yet
    this._build(this.cameras.main.width, this.cameras.main.height);

    this._resize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._resize);

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── what the level means (read by the tests, never shown to the player) ────

  static numbers() {
    return RY_NUMBERS.slice();
  }

  static letters() {
    return rallyLetters();
  }

  static word() {
    return rallyWord();
  }

  static winners() {
    return RY_WINNERS.map((w) => ({ ...w }));
  }

  // ── the pencil: jittered hand-drawn primitives (shared idiom) ──────────────

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 16, mag = 1.4) {
    super._pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps, mag);
  }

  // a closed polygon: near-black fill, pencil outline
  _pencilPoly(g, rnd, pts, fill, fillAlpha, width, alpha, mag = 1) {
    if (fill !== null) {
      g.fillStyle(fill, fillAlpha);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fillPath();
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      this._pencilSeg(
        g,
        rnd,
        a[0],
        a[1],
        b[0],
        b[1],
        width,
        RY_SKETCH,
        alpha,
        mag,
      );
    }
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    // the stage, from the far tape down to the near tape
    this._roadTop = H * 0.62;
    this._roadBot = H * 0.8;
    this._finishX = W * 0.6;
    // the scenery — people, gantry, tape — is scaled off one metre; the cars
    // themselves run smaller than that metre would make them, so they don't
    // crowd the frame
    this._m = Math.min(W * 0.22, H * 0.36) / 4;
    this._carLen = Math.min(W * 0.16, H * 0.27);
    this._crowd = [];
    this._cars = [];
    this._lights = []; // everything that goes dark when the stage ends
    // the marshal stands just past the line; the few spectators stand behind him
    this._marshalX = this._finishX + W * 0.085;

    this._drawSky(W, H);
    this._drawTreeline(W, H);
    this._drawFloodlight(W * 0.13, 1);
    this._drawFloodlight(W * 0.9, -1);
    this._drawBank(W, H);
    this._drawCrowd(W, H);
    this._drawRoad(W, H);
    this._drawFinishLine(W, H);
    this._drawTape(W, H);
    this._drawLanterns(W, H);
    this._drawMarshal(W, H);
    this._drawGantry(W, H);
    this._buildCars(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);

    if (this._finished) {
      // rebuilt after the race (a resize): straight to the dark stage and the podium
      this._showFinal();
    } else {
      // a beat of quiet before the first car
      this.time.delayedCall(RALLY_START_DELAY_MS, () => this._runRace());
    }
  }

  // ── night, forest, floodlit bank ───────────────────────────────────────────

  _drawSky(W, H) {
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(0x0b0d12, 0x0d0f15, 0x07080b, 0x090a0d, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(4021);
    for (let i = 0; i < 34; i++) {
      const dot = this.add
        .circle(rnd() * W, rnd() * H * 0.36, 0.6 + rnd() * 1, 0xffffff, 1)
        .setAlpha(0.12 + rnd() * 0.25)
        .setDepth(-19);
      this.tweens.add({
        targets: dot,
        alpha: 0.5 + rnd() * 0.3,
        duration: 1400 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // a slim moon between the towers
    const mg = this.add.graphics().setDepth(-18);
    const mr = Math.min(W, H) * 0.036;
    const mx = W * 0.46;
    const my = H * 0.15;
    mg.fillStyle(0xffffff, 0.03);
    mg.fillCircle(mx, my, mr * 2.1);
    mg.fillStyle(0xe8e2d2, 0.1);
    mg.fillCircle(mx, my, mr);
    this._pencilCircle(mg, rnd, mx, my, mr, 1.3, RY_SKETCH, 0.45);
    this._pencilCircle(
      mg,
      rnd,
      mx - mr * 0.3,
      my - mr * 0.2,
      mr * 0.22,
      1,
      RY_SKETCH,
      0.25,
    );
    this._pencilCircle(
      mg,
      rnd,
      mx + mr * 0.35,
      my + mr * 0.25,
      mr * 0.15,
      1,
      RY_SKETCH,
      0.2,
    );

    // two thin drifting cloud strokes
    const cg = this.add.graphics().setDepth(-18);
    for (const cy of [H * 0.09, H * 0.23]) {
      const cx = W * (0.25 + rnd() * 0.4);
      const cw = W * (0.1 + rnd() * 0.12);
      this._pencilSeg(
        cg,
        rnd,
        cx,
        cy,
        cx + cw,
        cy + (rnd() - 0.5) * 6,
        1.2,
        RY_SKETCH,
        0.08,
        2,
      );
      this._pencilSeg(
        cg,
        rnd,
        cx + cw * 0.2,
        cy + 6,
        cx + cw * 0.85,
        cy + 5,
        1,
        RY_SKETCH,
        0.05,
        2,
      );
    }
  }

  // pines along the horizon — the stage runs through a forest
  _drawTreeline(W, H) {
    const g = this.add.graphics().setDepth(-16);
    const rnd = this._rng(6113);
    const base = H * 0.47;
    // one quiet row of pines — the stage runs through a forest, no more than that
    const layers = [
      { fill: 0x0a0c0f, lift: 0, hMin: 0.04, hMax: 0.08, alpha: 0.09 },
    ];
    for (const L of layers) {
      const pts = [[-10, base]];
      let x = -10;
      while (x < W + 10) {
        const w = 14 + rnd() * 20;
        const h = H * (L.hMin + rnd() * (L.hMax - L.hMin));
        const top = base - L.lift - h;
        // three tiers per pine, so it reads as a pine and not a spike
        pts.push([x + w * 0.05, base - L.lift - h * 0.28]);
        pts.push([x + w * 0.2, base - L.lift - h * 0.3]);
        pts.push([x + w * 0.12, base - L.lift - h * 0.55]);
        pts.push([x + w * 0.3, base - L.lift - h * 0.55]);
        pts.push([x + w * 0.5, top]);
        pts.push([x + w * 0.7, base - L.lift - h * 0.55]);
        pts.push([x + w * 0.88, base - L.lift - h * 0.55]);
        pts.push([x + w * 0.8, base - L.lift - h * 0.3]);
        pts.push([x + w * 0.95, base - L.lift - h * 0.28]);
        x += w;
      }
      pts.push([W + 10, base], [W + 10, base + 4], [-10, base + 4]);
      g.fillStyle(L.fill, 1);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fillPath();
      g.lineStyle(1, RY_SKETCH, L.alpha);
      for (let i = 0; i < pts.length - 4; i++) {
        g.lineBetween(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      }
    }
  }

  // the spectators' bank: a grassy slope between the forest and the stage
  _drawBank(W, H) {
    const g = this.add.graphics().setDepth(-14);
    const rnd = this._rng(2909);
    const top = H * 0.47;
    const bot = this._roadTop;
    g.fillGradientStyle(0x0f1216, 0x0f1216, 0x15181d, 0x15181d, 1);
    g.fillRect(0, top, W, bot - top);
    this._pencilSeg(g, rnd, 0, top, W, top, 1.4, RY_SKETCH, 0.16, 2);
    // a few tufts of grass, denser toward the top of the slope
    for (let i = 0; i < 60; i++) {
      const x = rnd() * W;
      const t = rnd();
      const y = top + 4 + t * (bot - top - 8);
      const h = 2 + rnd() * 4;
      g.lineStyle(1, RY_SKETCH, 0.03 + (1 - t) * 0.05);
      g.lineBetween(x, y, x + (rnd() - 0.5) * 2, y - h);
      g.lineBetween(x + 2, y, x + 3 + (rnd() - 0.5) * 2, y - h * 0.7);
    }
  }

  // a lattice mast with a bank of lamps, throwing real cones onto the stage
  _drawFloodlight(px, dir) {
    const W = this._W;
    const H = this._H;
    const g = this.add.graphics().setDepth(-11);
    const rnd = this._rng(Math.round(px) * 7 + 3);
    const base = H * 0.585;
    const top = H * 0.18;
    const wb = 5;
    const wt = 3;

    // mast: two rails, cross-braces
    this._pencilSeg(
      g,
      rnd,
      px - wb,
      base,
      px - wt,
      top,
      1.4,
      RY_SKETCH,
      0.4,
      0.9,
    );
    this._pencilSeg(
      g,
      rnd,
      px + wb,
      base,
      px + wt,
      top,
      1.4,
      RY_SKETCH,
      0.4,
      0.9,
    );
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const y0 = base + ((top - base) * i) / steps;
      const y1 = base + ((top - base) * (i + 1)) / steps;
      const h0 = wb + ((wt - wb) * i) / steps;
      const h1 = wb + ((wt - wb) * (i + 1)) / steps;
      g.lineStyle(1, RY_SKETCH, 0.2);
      g.lineBetween(px - h0, y0, px + h1, y1);
      g.lineBetween(px + h0, y0, px - h1, y1);
    }

    // lamp bank, angled inward
    const hx = px + dir * 6;
    const hy = top - 4;
    g.fillStyle(0x0d0f13, 1);
    g.fillRect(hx - 17, hy - 9, 34, 15);
    this._pencilSeg(
      g,
      rnd,
      hx - 17,
      hy - 9,
      hx + 17,
      hy - 9,
      1.2,
      RY_SKETCH,
      0.5,
      0.5,
    );
    this._pencilSeg(
      g,
      rnd,
      hx - 17,
      hy + 6,
      hx + 17,
      hy + 6,
      1.2,
      RY_SKETCH,
      0.5,
      0.5,
    );
    this._pencilSeg(
      g,
      rnd,
      hx - 17,
      hy - 9,
      hx - 17,
      hy + 6,
      1.2,
      RY_SKETCH,
      0.5,
      0.5,
    );
    this._pencilSeg(
      g,
      rnd,
      hx + 17,
      hy - 9,
      hx + 17,
      hy + 6,
      1.2,
      RY_SKETCH,
      0.5,
      0.5,
    );
    // the bulbs and their glow live on their own layer, so they can go out
    const lamp = this.add.graphics().setDepth(-11);
    lamp.fillStyle(RY_WARM, 0.05);
    lamp.fillCircle(hx, hy, 46);
    lamp.fillStyle(RY_WARM, 0.1);
    lamp.fillCircle(hx, hy, 24);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        lamp.fillStyle(RY_WARM, 0.92);
        lamp.fillCircle(hx - 12 + c * 8, hy - 4 + r * 8, 2.6);
      }
    }
    this._lights.push(lamp);

    // the cone: layered wedges from the lamps down to a pool on the gravel
    const gx = px + dir * W * 0.2;
    const gy = this._roadBot + 6;
    const layers = [
      [W * 0.19, 0.02],
      [W * 0.12, 0.026],
      [W * 0.06, 0.032],
    ];
    const cone = this.add.graphics().setDepth(-9);
    for (const [s, a] of layers) {
      cone.fillStyle(RY_WARM, a);
      cone.fillTriangle(hx, hy + 6, gx - s, gy, gx + s, gy);
    }
    const mid = (this._roadTop + this._roadBot) / 2 + 10;
    cone.fillStyle(RY_WARM, 0.03);
    cone.fillEllipse(gx, mid, W * 0.4, H * 0.1);
    cone.fillStyle(RY_WARM, 0.04);
    cone.fillEllipse(gx, mid, W * 0.24, H * 0.06);
    this._lights.push(cone);
  }

  // ── the stage: gravel, the line, the tape, the gantry ──────────────────────

  _drawRoad(W, H) {
    const g = this.add.graphics().setDepth(-10);
    const rnd = this._rng(1777);
    const top = this._roadTop;
    const bot = this._roadBot;

    // the gravel itself, a shade darker toward us
    g.fillGradientStyle(0x16181d, 0x16181d, 0x121418, 0x121418, 1);
    g.fillRect(0, top, W, bot - top);
    // the near verge, all the way down to our feet
    g.fillStyle(0x0f1114, 1);
    g.fillRect(0, bot, W, H - bot);

    this._pencilSeg(g, rnd, 0, top, W, top, 1.5, RY_SKETCH, 0.32, 1.6);
    this._pencilSeg(g, rnd, 0, bot, W, bot, 1.5, RY_SKETCH, 0.38, 1.6);
    this._pencilSeg(g, rnd, 0, bot + 5, W, bot + 5, 1, RY_SKETCH, 0.16, 1.6);

    // two long ruts where the tyres have been all day
    for (const t of [0.34, 0.7]) {
      const y = top + (bot - top) * t;
      this._pencilSeg(
        g,
        rnd,
        0,
        y,
        W * 0.5,
        y + (rnd() - 0.5) * 3,
        1.1,
        RY_SKETCH,
        0.1,
        2,
      );
      this._pencilSeg(
        g,
        rnd,
        W * 0.5,
        y,
        W,
        y + (rnd() - 0.5) * 3,
        1.1,
        RY_SKETCH,
        0.1,
        2,
      );
    }

    // loose stones: small far away, bigger near us
    for (let i = 0; i < 110; i++) {
      const t = rnd();
      const y = top + 3 + t * (bot - top - 6);
      const r = 0.5 + t * 1.4 + rnd() * 0.6;
      g.fillStyle(RY_SKETCH, 0.04 + rnd() * 0.07);
      g.fillCircle(rnd() * W, y, r);
    }
    for (let i = 0; i < 40; i++) {
      const y = bot + 8 + rnd() * (H - bot - 12);
      const t = (y - bot) / (H - bot);
      g.fillStyle(RY_SKETCH, 0.03 + rnd() * 0.05);
      g.fillCircle(rnd() * W, y, 1 + t * 2 + rnd());
    }
  }

  // bilinear point inside the finish band: u across the band, t far(0) → near(1)
  _finishPt(u, t) {
    const W = this._W;
    const fx = this._finishX;
    const yFar = this._roadTop + 3;
    const yNear = this._roadBot - 3;
    const skew = W * 0.015;
    const width = W * (0.03 + 0.012 * t);
    const cx = fx + skew * (1 - 2 * t);
    return [cx - width / 2 + width * u, yFar + (yNear - yFar) * t];
  }

  _drawFinishLine(W, H) {
    const g = this.add.graphics().setDepth(-8);
    const rnd = this._rng(3303);
    const cols = 2;
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = this._finishPt(c / cols, r / rows);
        const b = this._finishPt((c + 1) / cols, r / rows);
        const d = this._finishPt(c / cols, (r + 1) / rows);
        const e = this._finishPt((c + 1) / cols, (r + 1) / rows);
        const light = (r + c) % 2 === 0;
        g.fillStyle(light ? 0xdcd6c8 : 0x0a0b0d, light ? 0.78 : 0.7);
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.lineTo(e[0], e[1]);
        g.lineTo(d[0], d[1]);
        g.closePath();
        g.fillPath();
      }
    }
    // worn edges and a few scuffs, like the rest of the paint in this game
    const p0 = this._finishPt(0, 0);
    const p1 = this._finishPt(1, 0);
    const p2 = this._finishPt(1, 1);
    const p3 = this._finishPt(0, 1);
    this._pencilSeg(
      g,
      rnd,
      p0[0],
      p0[1],
      p1[0],
      p1[1],
      1,
      RY_SKETCH,
      0.35,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      p1[0],
      p1[1],
      p2[0],
      p2[1],
      1,
      RY_SKETCH,
      0.35,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      p2[0],
      p2[1],
      p3[0],
      p3[1],
      1,
      RY_SKETCH,
      0.35,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      p3[0],
      p3[1],
      p0[0],
      p0[1],
      1,
      RY_SKETCH,
      0.35,
      0.6,
    );
    for (let i = 0; i < 10; i++) {
      const [x, y] = this._finishPt(rnd(), rnd());
      g.fillStyle(0x000000, 0.1);
      g.fillEllipse(x, y, 6 + rnd() * 8, 2 + rnd() * 2);
    }
  }

  // the few spectators stand right behind the marshal
  _crowdSpan() {
    const W = this._W;
    return [this._marshalX - W * 0.075, this._marshalX + W * 0.165];
  }

  // tape on stakes, only where the spectators are: between them and the road
  _drawTape(W, H) {
    const m = this._m;
    const [sx0, sx1] = this._crowdSpan();
    const gap = (sx1 - sx0) / 5;
    const runs = [
      {
        y: this._roadTop + 3,
        h: m * 0.68,
        gap,
        depth: -6,
        alpha: 0.34,
        seed: 8802,
      },
    ];
    this._stakes = [];
    for (const run of runs) {
      const g = this.add.graphics().setDepth(run.depth);
      const rnd = this._rng(run.seed);
      const xs = [];
      for (let i = 0; i <= 5; i++) xs.push(sx0 + i * gap);
      this._stakes = xs.map((x) => ({ x, y: run.y - run.h }));
      for (const x of xs) {
        this._pencilSeg(
          g,
          rnd,
          x,
          run.y,
          x,
          run.y - run.h,
          1.6,
          RY_SKETCH,
          run.alpha,
          0.5,
        );
        g.fillStyle(RY_SKETCH, run.alpha * 0.8);
        g.fillCircle(x, run.y - run.h, 1.8);
      }
      // two strands of tape, sagging a little between the stakes, hazard-striped
      for (const k of [0.92, 0.6]) {
        for (let i = 0; i < xs.length - 1; i++) {
          const x0 = xs[i];
          const x1 = xs[i + 1];
          const y = run.y - run.h * k;
          const sag = 3 + rnd() * 2;
          const seg = 8;
          let px = x0;
          let py = y;
          for (let s = 1; s <= seg; s++) {
            const t = s / seg;
            const nx = x0 + (x1 - x0) * t;
            const ny = y + Math.sin(t * Math.PI) * sag;
            const on = (i * seg + s) % 2 === 0;
            g.lineStyle(
              on ? 2.4 : 2,
              on ? 0xdcd6c8 : 0x0a0b0d,
              on ? run.alpha * 0.9 : 0.8,
            );
            g.lineBetween(px, py, nx, ny);
            px = nx;
            py = ny;
          }
        }
      }
    }
  }

  // three storm lanterns hung on the tape stakes; they go out with the floodlights
  _drawLanterns(W, H) {
    const rnd = this._rng(4747);
    const glow = this.add.graphics().setDepth(-5.6);
    const body = this.add.graphics().setDepth(-5.5);
    const s = Math.max(0.8, this._m / 62);
    for (const i of [0, 2, 5]) {
      const st = this._stakes && this._stakes[i];
      if (!st) continue;
      const lx = st.x;
      const ly = st.y + 8 * s; // hangs just under the top of the stake
      glow.fillStyle(RY_WARM, 0.045);
      glow.fillCircle(lx, ly + 6 * s, 34 * s);
      glow.fillStyle(RY_WARM, 0.09);
      glow.fillCircle(lx, ly + 6 * s, 16 * s);
      // hook, cage, glass, flame
      body.lineStyle(1.2, RY_SKETCH, 0.45);
      body.lineBetween(lx, st.y, lx, ly - 4 * s);
      body.fillStyle(0x0d0f13, 1);
      body.fillRect(lx - 4 * s, ly - 4 * s, 8 * s, 15 * s);
      this._pencilSeg(
        body,
        rnd,
        lx - 4 * s,
        ly - 4 * s,
        lx + 4 * s,
        ly - 4 * s,
        1.2,
        RY_SKETCH,
        0.5,
        0.3,
      );
      this._pencilSeg(
        body,
        rnd,
        lx - 4 * s,
        ly + 11 * s,
        lx + 4 * s,
        ly + 11 * s,
        1.2,
        RY_SKETCH,
        0.5,
        0.3,
      );
      body.lineStyle(1, RY_SKETCH, 0.4);
      body.lineBetween(lx - 4 * s, ly - 4 * s, lx - 4 * s, ly + 11 * s);
      body.lineBetween(lx + 4 * s, ly - 4 * s, lx + 4 * s, ly + 11 * s);
    }
    // the flames are what goes out; cage and hook stay
    const flames = this.add.graphics().setDepth(-5.4);
    for (const i of [0, 2, 5]) {
      const st = this._stakes && this._stakes[i];
      if (!st) continue;
      flames.fillStyle(RY_WARM, 0.95);
      flames.fillEllipse(st.x, st.y + 14 * s, 3.4 * s, 7 * s);
      flames.fillStyle(0xffffff, 0.6);
      flames.fillEllipse(st.x, st.y + 15 * s, 1.4 * s, 3.4 * s);
    }
    this._lights.push(glow, flames);
  }

  // the finish gantry, seen at a slant: two posts, a chequered banner between
  _drawGantry(W, H) {
    const m = this._m;
    const fx = this._finishX;
    const skew = W * 0.045;
    const near = {
      x: fx - skew,
      base: this._roadBot + 10,
      top: this._roadBot + 10 - m * 5.6,
    };
    const far = {
      x: fx + skew,
      base: this._roadTop + 2,
      top: this._roadTop + 2 - m * 3.3,
    };
    const rnd = this._rng(5150);

    // far post: behind the cars
    const gf = this.add.graphics().setDepth(2);
    this._pencilSeg(
      gf,
      rnd,
      far.x - 3,
      far.base,
      far.x - 3,
      far.top,
      1.4,
      RY_SKETCH,
      0.4,
      0.6,
    );
    this._pencilSeg(
      gf,
      rnd,
      far.x + 3,
      far.base,
      far.x + 3,
      far.top,
      1.4,
      RY_SKETCH,
      0.4,
      0.6,
    );
    gf.fillStyle(0x0d0f13, 1);
    gf.fillRect(far.x - 3, far.top, 6, far.base - far.top);

    // banner + beam + near post: in front of them
    const g = this.add.graphics().setDepth(7);
    const nh = m * 0.95;
    const fh = m * 0.55;
    const pt = (u, v) => {
      // u along the beam (near → far), v down the banner (0 top → 1 bottom)
      const x = near.x + (far.x - near.x) * u;
      const top = near.top + (far.top - near.top) * u;
      const h = nh + (fh - nh) * u;
      return [x, top + h * v];
    };
    const cols = 10;
    const rows = 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const a = pt(c / cols, r / rows);
        const b = pt((c + 1) / cols, r / rows);
        const d = pt(c / cols, (r + 1) / rows);
        const e = pt((c + 1) / cols, (r + 1) / rows);
        const light = (c + r) % 2 === 0;
        g.fillStyle(light ? 0xdcd6c8 : 0x0a0b0d, light ? 0.85 : 0.92);
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.lineTo(e[0], e[1]);
        g.lineTo(d[0], d[1]);
        g.closePath();
        g.fillPath();
      }
    }
    const q0 = pt(0, 0);
    const q1 = pt(1, 0);
    const q2 = pt(1, 1);
    const q3 = pt(0, 1);
    this._pencilSeg(
      g,
      rnd,
      q0[0],
      q0[1],
      q1[0],
      q1[1],
      1.6,
      RY_SKETCH,
      0.55,
      0.8,
    );
    this._pencilSeg(
      g,
      rnd,
      q1[0],
      q1[1],
      q2[0],
      q2[1],
      1.2,
      RY_SKETCH,
      0.45,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      q2[0],
      q2[1],
      q3[0],
      q3[1],
      1.2,
      RY_SKETCH,
      0.45,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      q3[0],
      q3[1],
      q0[0],
      q0[1],
      1.2,
      RY_SKETCH,
      0.45,
      0.6,
    );
    // the beam it hangs from, and a second, lighter line above it
    this._pencilSeg(
      g,
      rnd,
      near.x,
      near.top - 5,
      far.x,
      far.top - 4,
      1.5,
      RY_SKETCH,
      0.5,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      near.x,
      near.top - 10,
      far.x,
      far.top - 8,
      1,
      RY_SKETCH,
      0.22,
      0.6,
    );

    // near post: a tube with a base plate, and the timing box strapped to it
    g.fillStyle(0x0d0f13, 1);
    g.fillRect(near.x - 3.5, near.top - 10, 7, near.base - near.top + 10);
    this._pencilSeg(
      g,
      rnd,
      near.x - 3.5,
      near.base,
      near.x - 3.5,
      near.top - 10,
      1.5,
      RY_SKETCH,
      0.5,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      near.x + 3.5,
      near.base,
      near.x + 3.5,
      near.top - 10,
      1.5,
      RY_SKETCH,
      0.5,
      0.6,
    );
    this._pencilSeg(
      g,
      rnd,
      near.x - 12,
      near.base,
      near.x + 12,
      near.base,
      1.4,
      RY_SKETCH,
      0.45,
      0.5,
    );
    // low on the post, under the height of a door plate
    const bx = near.x - 14;
    const by = near.base - m * 0.62;
    g.fillStyle(0x15181d, 1);
    g.fillRect(bx, by, 10, 16);
    g.lineStyle(1, RY_SKETCH, 0.45);
    g.strokeRect(bx, by, 10, 16);
    g.fillStyle(RY_WARM, 0.85);
    g.fillCircle(bx + 5, by + 5, 1.8);
  }

  // ── people ─────────────────────────────────────────────────────────────────

  // One standing figure, feet at the local origin, k = pixels per metre.
  // opts: arms "down" | "one" | "both" | "left", flag, hat, lit = side the floodlight is on
  _person(g, rnd, k, o) {
    // single light strokes: at this size a doubled pencil line turns to mush
    const line = o.line === undefined ? 0.24 : o.line;
    const seg = (x1, y1, x2, y2, w, a) => {
      g.lineStyle(w, RY_SKETCH, a);
      g.lineBetween(x1 * k, y1 * k, x2 * k, y2 * k);
    };
    const lw = Math.max(1.2, k * 0.05);

    // legs (dark trousers), then torso over them
    g.lineStyle(k * 0.09, o.trousers || 0x0c0e11, 1);
    g.lineBetween(-0.09 * k, -0.82 * k, -0.11 * k, 0);
    g.lineBetween(0.09 * k, -0.82 * k, 0.11 * k, 0);
    seg(-0.14, -0.82, -0.15, 0, lw, line);
    seg(0.14, -0.82, 0.15, 0, lw, line);
    g.fillStyle(o.tone, 1);
    g.beginPath();
    g.moveTo(-0.23 * k, -1.45 * k);
    g.lineTo(0.23 * k, -1.45 * k);
    g.lineTo(0.19 * k, -0.78 * k);
    g.lineTo(-0.19 * k, -0.78 * k);
    g.closePath();
    g.fillPath();
    seg(-0.23, -1.45, 0.23, -1.45, lw, line);
    seg(-0.23, -1.45, -0.19, -0.78, lw, line);
    seg(0.23, -1.45, 0.19, -0.78, lw, line);

    // arms
    const left = o.arms === "both" ? [-0.4, -1.88] : [-0.27, -0.95];
    // "left": only the left arm — the right one is drawn separately (the marshal's)
    const right =
      o.arms === "left"
        ? null
        : o.arms === "down"
          ? [0.27, -0.95]
          : [0.4, -1.88];
    seg(-0.23, -1.42, left[0], left[1], lw * 1.3, line + 0.06);
    if (right) seg(0.23, -1.42, right[0], right[1], lw * 1.3, line + 0.06);

    // head (and a hat, on some)
    const hy = -1.6 * k;
    g.fillStyle(o.tone, 1);
    g.fillCircle(0, hy, 0.115 * k);
    g.lineStyle(lw, RY_SKETCH, line + 0.04);
    g.strokeCircle(0, hy, 0.115 * k);
    if (o.hat) {
      g.fillStyle(o.tone, 1);
      g.beginPath();
      g.arc(0, hy - 0.01 * k, 0.125 * k, Math.PI, Math.PI * 2);
      g.closePath();
      g.fillPath();
      seg(-0.13, -1.62, 0.13, -1.62, lw, 0.45);
    }

    // a pennant on a stick, now and then
    if (o.flag && right) {
      const hx = right[0];
      const hyy = right[1];
      seg(hx, hyy + 0.1, hx + 0.02, hyy - 0.72, lw, 0.45);
      g.fillStyle(RY_SKETCH, 0.22);
      g.fillTriangle(
        (hx + 0.02) * k,
        (hyy - 0.72) * k,
        (hx + 0.34) * k,
        (hyy - 0.6) * k,
        (hx + 0.02) * k,
        (hyy - 0.46) * k,
      );
    }

    // floodlight catching one shoulder and one cheek
    g.lineStyle(Math.max(1, k * 0.04), RY_WARM, 0.2);
    const side = o.lit;
    g.lineBetween(side * 0.23 * k, -1.44 * k, side * 0.19 * k, -0.9 * k);
    g.beginPath();
    g.arc(
      0,
      hy,
      0.115 * k,
      side > 0 ? -1.1 : Math.PI - 0.5,
      side > 0 ? 0.5 : Math.PI + 1.1,
    );
    g.strokePath();
  }

  _drawCrowd(W, H) {
    const k0 = this._m * 0.6; // far side: smaller than the cars' metre
    const rows = [
      { y: this._roadTop - 5, k: k0, depth: -12, seed: 111 },
      {
        y: this._roadTop - 5 - k0 * 0.7,
        k: k0 * 0.88,
        depth: -12.2,
        seed: 222,
      },
    ];
    const tones = [0x1a1d23, 0x1f2229, 0x22262d, 0x181b20];
    // only the ones standing behind the marshal — nobody anywhere else
    const [sx0, sx1] = this._crowdSpan();
    for (const row of rows) {
      const rnd = this._rng(row.seed);
      const step = row.k * 0.78;
      for (
        let x = sx0 + rnd() * step;
        x < sx1;
        x += step * (0.8 + rnd() * 0.7)
      ) {
        if (rnd() < 0.15) continue; // a gap in the crowd
        const cheer = rnd() < 0.4;
        const g = this.add.graphics().setDepth(row.depth);
        g.setPosition(x, row.y);
        this._person(g, rnd, row.k * (0.94 + rnd() * 0.12), {
          tone: tones[Math.floor(rnd() * tones.length)],
          arms: cheer ? (rnd() < 0.5 ? "both" : "one") : "down",
          flag: cheer && rnd() < 0.3,
          hat: rnd() < 0.3,
          lit: x < W / 2 ? -1 : 1,
        });
        // a slow sway from the feet, no two alike
        g.setAngle((rnd() - 0.5) * 3);
        this.tweens.add({
          targets: g,
          angle: (rnd() - 0.5) * 3 + (rnd() < 0.5 ? 2.4 : -2.4),
          duration: 1400 + rnd() * 1800,
          delay: rnd() * 1500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this._crowd.push({ g, x, y: row.y, k: row.k });
      }
    }
  }

  // the crowd jumps as a car crosses, ripples out from the line
  _cheer() {
    const fx = this._finishX;
    const rnd = this._rng(Math.round(this.time.now) + 5);
    for (const p of this._crowd) {
      const d = Math.abs(p.x - fx);
      if (d > this._W * 0.42) continue;
      this.tweens.add({
        targets: p.g,
        y: p.y - (4 + rnd() * 5),
        duration: 170,
        delay: d * 0.25 + rnd() * 90,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }

  // the marshal on the far edge, chequered flag in hand
  _drawMarshal(W, H) {
    const k = this._m * 0.72;
    const x = this._marshalX;
    const y = this._roadTop + H * 0.012;
    const rnd = this._rng(6262);

    const g = this.add.graphics().setDepth(-5);
    g.setPosition(x, y);
    // the same figure, in a hi-vis vest and a helmet — minus the flag arm
    this._person(g, rnd, k, {
      tone: 0x33373b,
      arms: "left",
      flag: false,
      hat: true,
      lit: 1,
      line: 0.5,
      trousers: 0x14161a,
    });
    // the vest, with its two reflective bands
    g.fillStyle(0xdcd6c8, 0.42);
    g.fillRect(-0.2 * k, -1.42 * k, 0.4 * k, 0.6 * k);
    g.fillStyle(0x0a0b0d, 0.5);
    g.fillRect(-0.2 * k, -1.24 * k, 0.4 * k, 0.05 * k);
    g.fillRect(-0.2 * k, -1.06 * k, 0.4 * k, 0.05 * k);
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(0, 2, k * 0.6, k * 0.12);

    // the raised arm and the flag are one piece, pivoting at the shoulder, so
    // the whole thing can drop when the stage is over
    const arm = this.add.graphics().setDepth(-4.9);
    arm.setPosition(x + 0.23 * k, y - 1.42 * k);
    const hx = 0.17 * k;
    const hy = -0.46 * k; // the hand
    arm.lineStyle(Math.max(1.6, k * 0.065), RY_SKETCH, 0.55);
    arm.lineBetween(0, 0, hx, hy);
    const len = k * 0.95;
    this._pencilSeg(
      arm,
      rnd,
      hx,
      hy + 0.1 * k,
      hx + 0.02 * k,
      hy - len,
      1.6,
      RY_SKETCH,
      0.55,
      0.3,
    );
    const cs = k * 0.15;
    for (let cx = 0; cx < 4; cx++) {
      for (let cy = 0; cy < 3; cy++) {
        const light = (cx + cy) % 2 === 0;
        arm.fillStyle(light ? 0xdcd6c8 : 0x0a0b0d, light ? 0.85 : 0.9);
        arm.fillRect(hx + 0.02 * k + cx * cs, hy - len + cy * cs, cs, cs);
      }
    }
    arm.lineStyle(1, RY_SKETCH, 0.4);
    arm.strokeRect(hx + 0.02 * k, hy - len, cs * 4, cs * 3);
    this._flag = arm;
    this._flagUp = true;
    this._flagSway();
  }

  // a slow sway while the flag is up
  _flagSway() {
    if (!this._flag) return;
    this._flag.setAngle(-6);
    this.tweens.add({
      targets: this._flag,
      angle: 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  _waveFlag() {
    if (!this._flag || !this._flagUp) return;
    this.tweens.add({
      targets: this._flag,
      angle: { from: -22, to: 26 },
      duration: 210,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
    });
  }

  // arm and flag hang down: the stage is closed
  _lowerFlag() {
    if (!this._flag) return;
    this._flagUp = false;
    this.tweens.killTweensOf(this._flag);
    this.tweens.add({
      targets: this._flag,
      angle: 150,
      duration: 900,
      ease: "Sine.easeInOut",
    });
  }

  // ── floodlights and lanterns ───────────────────────────────────────────────

  // the last car is through: everything that was lit goes out, the flag drops
  _lightsOut() {
    // from here on the stage stays dark: a resize rebuilds it as it is now
    this._finished = true;
    for (const layer of this._lights || []) {
      this.tweens.add({
        targets: layer,
        alpha: 0,
        duration: 650,
        ease: "Quad.easeIn",
      });
    }
    this._lowerFlag();
  }

  // rebuilt after the race is over: dark stage, flag down, podium up
  _showFinal() {
    for (const layer of this._lights || []) layer.setAlpha(0);
    if (this._flag) {
      this.tweens.killTweensOf(this._flag);
      this._flagUp = false;
      this._flag.setAngle(150);
    }
    this._podium = drawPodium(this, this._W, this._H, false);
  }

  _showPodium() {
    this._podium = drawPodium(this, this._W, this._H, true);
  }

  // ── the cars ───────────────────────────────────────────────────────────────

  _buildCars(W, H) {
    this._groundY = H * 0.755;
    // each car keeps to its own line on the gravel, a few pixels apart
    this._lanes = [0, -1, 1, -0.5, 0.8, -0.8].map((n) => n * H * 0.012);
    this._cars = RY_NUMBERS.map((n, i) => createCar(
      this, { length: this._carLen, groundY: this._groundY + this._lanes[i] }, n, i,
    ));
  }

  // ── the rounds: bunches of cars through the line, then lights out ─────────

  // ms from the start of the recording to its loudest moment. That is when the
  // car passes you, so that is the moment that has to land on the line. Measured
  // from the file itself, so a replacement wroom.mp3 stays in sync too.
  _soundLead() {
    if (this._lead !== undefined) return this._lead;
    let lead = RALLY_SOUND_LEAD_MS;
    try {
      const buf =
        this.cache.audio.exists("wroom") && this.cache.audio.get("wroom");
      if (buf && typeof buf.getChannelData === "function" && buf.length > 0) {
        lead = measureWhooshLead(buf.getChannelData(0), buf.sampleRate);
      }
    } catch (e) {}
    this._lead = lead;
    return lead;
  }

  // one round: every car's launch, whoosh and crossing worked out from
  // RALLY_CROSS_MS, so the order and spacing at the line are exactly as written
  _planRound() {
    return planRallyRound({
      width: this._W,
      carLength: this._carLen,
      finishX: this._finishX,
      soundLead: this._soundLead(),
    });
  }

  // The race, once: cars and whooshes as planned, then the last car has just
  // gone by — lights out, flag down — and the podium comes up. It does not repeat;
  // the game's restart button runs it again.
  _runRace() {
    const race = (this._round = (this._round || 0) + 1);
    const { plan, base, lightsOut, podiumAt } = this._planRound();
    const at = (ms, fn) =>
      this.time.delayedCall(ms + base, () => {
        if (this._round === race) fn();
      });
    for (const p of plan) {
      at(p.launch, () => this._launchCar(p.i, p.speed));
      at(p.whoosh, () => this._whoosh());
    }
    at(lightsOut, () => this._lightsOut());
    at(podiumAt, () => this._showPodium());
  }

  _launchCar(i, speed) {
    const car = this._cars && this._cars[i];
    if (!car) return;
    const W = this._W;
    const L = this._carLen;
    const c = car.container;
    const x0 = -L * 0.7;
    const x1 = W + L * 0.7;
    let crossed = false;
    let lastDust = x0;

    c.setVisible(true);
    c.x = x0;
    this.tweens.add({
      targets: c,
      x: x1,
      duration: (x1 - x0) / speed,
      ease: "Linear",
      onUpdate: () => {
        if (!crossed && c.x >= this._finishX) {
          crossed = true;
          this._cheer();
          this._waveFlag();
        }
        if (c.x - lastDust >= 46) {
          lastDust = c.x;
          this._dust(c.x - L * 0.36, c.y);
        }
      },
      onComplete: () => {
        c.setVisible(false);
        c.x = -L * 2;
      },
    });
  }

  // gravel dust kicked up behind the rear wheel, left hanging where it fell
  _dust(x, groundY) {
    const L = this._carLen;
    const puff = this.add
      .circle(
        x,
        groundY - L * 0.03,
        L * 0.03 + Math.random() * L * 0.025,
        RY_SKETCH,
        0.09,
      )
      .setDepth(4);
    this.tweens.add({
      targets: puff,
      x: x - L * 0.1,
      y: puff.y - L * (0.08 + Math.random() * 0.1),
      scale: 2.6,
      alpha: 0,
      duration: 600 + Math.random() * 400,
      ease: "Sine.easeOut",
      onComplete: () => puff.destroy(),
    });
  }

  // the car crossing the line — assets/sounds/Rally/wroom.mp3; silent if absent
  _whoosh() {
    this.services.audio.playSfx("wroom", 1, this);
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, ".", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(
        W - 30,
        28,
        "Level " +
          (this.services.levels.definitions.findIndex((l) => l.key === this.scene.key) + 1),
        {
          fontFamily: '"Special Elite", monospace',
          fontSize: "28px",
          color: "#e8dcc0",
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._round = (this._round || 0) + 1; // orphan any pending round callbacks
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._cars = [];
    this._crowd = [];
  }

  shutdown() {
    this._round = (this._round || 0) + 1;
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
