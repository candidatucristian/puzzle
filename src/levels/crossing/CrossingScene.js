import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import {
  code39Bars,
  CROSSING_BACKGROUND,
  CROSSING_BACKGROUND_URL,
  paintStreet,
  paintFrame,
  releaseStreetArt,
} from "./street.js";
import { addRainFall } from "../../shared/phaserRain.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "CROSSING"  ·  code: GO   ·  read the stripes
//
// A rain-dark Exeter street, photographed at night: old brick and stone,
// warm shop windows, a distant church, and broken reflections on the road.
//
// The crossing runs straight away from you, up the screen: wide at your
// feet, narrow at the far curb. Its stripes — the rungs of the zebra — are
// stacked in depth, and they run wide and narrow like the barcode on a
// packet. The bars and gaps are real Code 39 glyphs (no * sentinels — just
// the letters), read from where you stand, bottom to top:
//
//   G O   →   GO
//
// The ten worn white bars keep the Code 39 clue legible without looking like
// a barcode graphic. Fine rain keeps the otherwise photographic scene alive.
//
// Found in the house, this same scene appears as a small framed painting.
// ─────────────────────────────────────────────────────────────────────────────

const CR_WORD = "GO";

const CR_WARM = 0xffdf9e; // lit windows and lamplight
const CR_CAT = 0x07080c; // the cat, darker than the night
const CR_RIM = 0x9fb4e6; // the moon on its edges

export default class CrossingScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Crossing" });
  }

  preload() {
    if (!this.textures.exists(CROSSING_BACKGROUND)) {
      this.load.image(CROSSING_BACKGROUND, CROSSING_BACKGROUND_URL);
    }
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();

    // found in the house, the street is a painting of itself
    const levels = this.services.levels;
    this._still = Boolean(levels.homeOf(levels.definitions.findIndex((l) => l.key === "Crossing")));
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // Code 39 bars, without start/stop sentinels, keep a plausible stripe count.
  // the stripes, as fractions of the way from our feet (0) to the far curb (1)
  _bars() {
    return code39Bars(CR_WORD);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const photo = this.textures.get(CROSSING_BACKGROUND).getSourceImage();
    const art = paintStreet(this, W, H, this._bars(), { still: this._still, photo });
    this._art = art;
    this._baseY = art.baseY;
    this._curbY = art.curbY;

    this.add.image(0, 0, art.city).setOrigin(0, 0).setDepth(-20);
    if (this._still) { this._hang(W, H, art); return; }
    this._makeRain(W, H);
  }

  // the rain over the street (shared/rainFall.js): lit by the lamps and the
  // shop windows it falls past, and ringing the water on the road
  _makeRain(W, H) {
    const curb = this._curbY;
    if (addRainFall(this, {
      picture: this.textures.get(this._art.city).getSourceImage(),
      ground: [[0, curb + 4], [W, curb + 4], [W, H], [0, H]], horizon: curb,
      density: 0.9, wind: -0.07, seed: 7551,
    })) return;
    this._makeStreaks(W, H);
  }

  // (without WebGL: a few streaks falling)
  _makeStreaks(W, H) {
    const rnd = this._rng(7551);
    const S = Math.min(W, H);
    const count = Math.min(42, Math.max(24, Math.round((W * H) / 30000)));
    for (let i = 0; i < count; i++) {
      const length = S * (0.014 + rnd() * 0.014);
      const streak = this.add.graphics();
      streak.lineStyle(Math.max(0.65, S * 0.00075), 0xdce6f0, 0.85);
      streak.beginPath();
      streak.moveTo(0, 0);
      streak.lineTo(-S * 0.002, length);
      streak.strokePath();
      streak.setDepth(-10).setPosition(-length, -length).setAlpha(0);
      this.ambientObject(streak);

      const fall = () => {
        if (!streak.scene) return;
        const x = rnd() * W;
        streak.setPosition(x, -length - rnd() * H * 0.18);
        streak.setAlpha(0.1 + rnd() * 0.16);
        this.ambientTween({
          targets: streak,
          x: x - W * 0.018,
          y: H + length,
          alpha: 0,
          duration: 2100 + rnd() * 2500,
          ease: "Linear",
          onComplete: fall,
        });
      };
      this.time.delayedCall(rnd() * 2400, fall);
    }
  }

  // In the house, the street hangs in its gilt frame on a dark wall.
  _hang(W, H, art) {
    const ZOOM = 0.84;
    for (const p of art.far) this.add.rectangle(p.x, p.y, 3, 4, CR_WARM, 0.45).setDepth(-12);
    for (const w of art.windows) {
      this.add.image(w.x, w.y, art.glow).setDisplaySize(w.w * 3.2, w.h * 3.2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4).setDepth(-7);
      this.add.image(w.x, w.y, w.key).setDisplaySize(w.w, w.h).setAlpha(0.9).setDepth(-6);
    }
    this.add.image(W / 2, H / 2, paintFrame(this, W, H, ZOOM)).setDepth(30);
    this.cameras.main.setZoom(ZOOM);
  }

  // a few stars that twinkle
  _makeStars(W, H, art) {
    const rnd = this._rng(7551);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.4;
      if (Math.abs(x - W * 0.5) < W * 0.08 && y < H * 0.25) continue;
      const size = 3 + rnd() * 4;
      const dot = this.add
        .image(x, y, art.star)
        .setDisplaySize(size, size)
        .setAlpha(0.15 + rnd() * 0.25)
        .setDepth(-19);
      this.ambientObject(dot);
      this.ambientTween({
        targets: dot,
        alpha: 0.55 + rnd() * 0.35,
        duration: 1400 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // a few far windows in the skyline, still awake
  _makeFarWindows(art) {
    const rnd = this._rng(6447);
    for (const p of art.far) {
      const dot = this.add
        .rectangle(p.x, p.y, 3, 4, CR_WARM, 0.55)
        .setDepth(-12);
      this.ambientObject(dot);
      this.ambientTween({
        targets: dot,
        alpha: 0.2,
        duration: 2000 + rnd() * 2000,
        delay: rnd() * 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // the lit rooms, breathing slowly as lamps are turned and curtains move
  _makeWindows(art) {
    const rnd = this._rng(4313);
    for (const w of art.windows) {
      const glow = this.add
        .image(w.x, w.y, art.glow)
        .setDisplaySize(w.w * 3.2, w.h * 3.2)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.5)
        .setDepth(-7);
      const pane = this.add
        .image(w.x, w.y, w.key)
        .setDisplaySize(w.w, w.h)
        .setDepth(-6);
      pane.setAlpha(0.85 + rnd() * 0.15);
      this.ambientTween({
        targets: [pane, glow],
        alpha: { from: pane.alpha, to: pane.alpha - 0.18 },
        duration: 2200 + rnd() * 2600,
        delay: rnd() * 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  _makeSmoke(x, y, key) {
    const rnd = this._rng(Math.round(x));
    const S = Math.min(this._W, this._H);
    for (let i = 0; i < 4; i++) {
      const size = S * (0.016 + rnd() * 0.01);
      const puff = this.add
        .image(x, y, key)
        .setDisplaySize(size, size)
        .setAlpha(0.35)
        .setDepth(-9);
      const drift = (rnd() - 0.3) * S * 0.04;
      const dur = 5200 + rnd() * 2400;
      this.ambientObject(puff);
      this.ambientTween({
        targets: puff,
        y: y - S * 0.06 - rnd() * S * 0.03,
        x: x + drift,
        scaleX: puff.scaleX * 2.6,
        scaleY: puff.scaleY * 2.6,
        alpha: 0,
        duration: dur,
        delay: i * (dur / 4),
        repeat: -1,
        onRepeat: () => {
          puff.setPosition(x, y);
          puff.setDisplaySize(size, size);
          puff.setAlpha(0.35);
        },
      });
    }
  }

  // slow steam breathing out of the manhole
  _makeSteam(x, y, key) {
    const rnd = this._rng(Math.round(x) * 3 + 7);
    const S = Math.min(this._W, this._H);
    for (let i = 0; i < 5; i++) {
      const size = S * (0.03 + rnd() * 0.02);
      const puff = this.add
        .image(x + (rnd() - 0.5) * 10, y, key)
        .setDisplaySize(size, size)
        .setAlpha(0.22)
        .setDepth(-5);
      const drift = (rnd() - 0.5) * S * 0.05;
      const dur = 6400 + rnd() * 3000;
      this.ambientObject(puff);
      this.ambientTween({
        targets: puff,
        y: y - S * 0.1 - rnd() * S * 0.05,
        x: x + drift,
        scaleX: puff.scaleX * 2.6,
        scaleY: puff.scaleY * 2.6,
        alpha: 0,
        duration: dur,
        delay: i * (dur / 5),
        repeat: -1,
        onRepeat: () => {
          puff.setPosition(x + (rnd() - 0.5) * 10, y);
          puff.setDisplaySize(size, size);
          puff.setAlpha(0.22);
        },
      });
    }
  }

  // the walking figure, its green breathing
  _makeWalkSignal(art) {
    const w = this.add
      .image(art.walk.x, art.walk.y, art.walk.key)
      .setDisplaySize(art.walk.size * 2, art.walk.size * 2)
      .setDepth(-3);
    this.ambientTween({
      targets: w,
      alpha: 0.55,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // The cat alternates a seated pause with a short walk along the far sidewalk.
  _drawCat(W, H) {
    const cx = W * 0.62;
    const cy = this._curbY - 2; // sitting on the far sidewalk, at the curb
    const s = H * 0.03; // body height scale
    const cont = this.add.container(cx, cy).setDepth(-4);
    const g = this.add.graphics();

    // its shadow, from the shop's light behind it
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s * 0.1, 0, s * 1.8, s * 0.22);
    // seated silhouette: haunches, chest, head, ears
    g.fillStyle(CR_CAT, 1);
    g.fillEllipse(0, -s * 0.5, s * 1.3, s * 1.05); // haunches
    g.fillEllipse(s * 0.42, -s * 0.85, s * 0.75, s * 1.25); // upright chest
    g.fillCircle(s * 0.5, -s * 1.62, s * 0.42); // head
    g.fillTriangle(
      s * 0.24,
      -s * 1.82,
      s * 0.38,
      -s * 2.12,
      s * 0.52,
      -s * 1.9,
    ); // ear
    g.fillTriangle(
      s * 0.52,
      -s * 1.92,
      s * 0.66,
      -s * 2.16,
      s * 0.76,
      -s * 1.78,
    ); // ear
    // the moon on its back and its head, so it reads against the night
    g.lineStyle(1.2, CR_RIM, 0.45);
    g.beginPath();
    g.arc(s * 0.5, -s * 1.62, s * 0.42, Math.PI * 1.05, Math.PI * 1.75, false);
    g.strokePath();
    g.beginPath();
    g.arc(0, -s * 0.5, s * 0.6, Math.PI * 1.1, Math.PI * 1.55, false);
    g.strokePath();
    cont.add(g);

    // the tail: its own graphics so it can sway
    const tail = this.add.graphics();
    tail.lineStyle(2.4, CR_CAT, 1);
    tail.beginPath();
    tail.arc(-s * 1.1, -s * 0.16, s * 0.62, -0.3, Math.PI * 0.8, false);
    tail.strokePath();
    cont.add(tail);
    this.ambientTween({
      targets: tail,
      angle: 14,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // two warm eyes that blink shut now and then
    const eyes = this.add.container(0, -s * 1.64);
    for (const ex of [s * 0.38, s * 0.6]) {
      eyes.add(this.add.ellipse(ex, 0, s * 0.12, s * 0.1, CR_WARM, 0.95));
    }
    cont.add(eyes);
    const blink = () => {
      this.ambientTween({
        targets: eyes,
        scaleY: 0.08,
        duration: 90,
        yoyo: true,
        onComplete: () => {
          this.time.delayedCall(2200 + Math.random() * 3800, blink);
        },
      });
    };
    this.time.delayedCall(1600, blink);

    // A separate walking silhouette keeps the seated cat from sliding across the curb.
    const walking = this.add.graphics().setVisible(false);
    cont.add(walking);
    const drawWalk = (phase) => {
      walking.clear();
      const bob = Math.sin(phase * 2) * s * 0.035;
      walking.fillStyle(0x000000, 0.35);
      walking.fillEllipse(0, 0, s * 2, s * 0.22);
      walking.fillStyle(CR_CAT, 1);
      walking.fillEllipse(0, -s * 0.7 + bob, s * 1.7, s * 0.72);
      walking.fillCircle(s * 0.8, -s * 1.02 + bob, s * 0.34);
      walking.fillTriangle(
        s * 0.53,
        -s * 1.16 + bob,
        s * 0.57,
        -s * 1.55 + bob,
        s * 0.78,
        -s * 1.25 + bob,
      );
      walking.fillTriangle(
        s * 0.82,
        -s * 1.26 + bob,
        s * 1.02,
        -s * 1.49 + bob,
        s * 1.08,
        -s * 1.07 + bob,
      );
      walking.lineStyle(1, CR_RIM, 0.4);
      // along the body's own (flattened) curve, so it lies on its back
      walking.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * (1.15 + (0.7 * i) / 12);
        const px = Math.cos(a) * s * 0.85;
        const py = -s * 0.7 + bob + Math.sin(a) * s * 0.36;
        if (i) walking.lineTo(px, py);
        else walking.moveTo(px, py);
      }
      walking.strokePath();
      // Diagonal pairs of paws take turns supporting the body.
      for (let i = 0; i < 4; i++) {
        const hip = (i < 2 ? -0.5 : 0.5) * s + (i % 2) * s * 0.08;
        const step = phase + (i === 0 || i === 3 ? 0 : Math.PI);
        const foot = hip + Math.sin(step) * s * 0.22;
        const lift = Math.max(0, Math.cos(step)) * s * 0.12;
        walking.lineStyle(s * 0.13, CR_CAT, 1);
        walking.lineBetween(hip, -s * 0.55 + bob, foot, -lift);
      }
      const sway = Math.sin(phase * 0.5) * s * 0.12;
      walking.lineStyle(2.2, CR_CAT, 1);
      walking.beginPath();
      walking.moveTo(-s * 0.7, -s * 0.65 + bob);
      walking.lineTo(-s * 1.1, -s * 0.95 + sway);
      walking.lineTo(-s * 1.3, -s * 1.45 + sway);
      walking.lineTo(-s * 1.14, -s * 1.62 + sway);
      walking.strokePath();
      walking.fillStyle(CR_WARM, 0.85);
      walking.fillEllipse(s * 0.97, -s * 1.06 + bob, s * 0.1, s * 0.07);
    };
    let headLeft = true;
    const stroll = () => {
      const destination = W * (headLeft ? 0.39 : 0.64);
      cont.setScale(headLeft ? -1 : 1, 1);
      g.setVisible(false);
      tail.setVisible(false);
      eyes.setVisible(false);
      walking.setVisible(true);
      const duration = (Math.abs(destination - cont.x) / (W * 0.035)) * 1000;
      const startX = cont.x;
      drawWalk(0);
      this.ambientTween({
        targets: cont,
        x: destination,
        duration,
        ease: "Linear",
        onUpdate: () => drawWalk(Math.abs(cont.x - startX) / (s * 0.6)),
        onComplete: () => {
          walking.setVisible(false);
          g.setVisible(true);
          tail.setVisible(true);
          eyes.setVisible(true);
          headLeft = !headLeft;
          this.time.delayedCall(2200 + Math.random() * 2800, stroll);
        },
      });
    };
    this.time.delayedCall(2400, stroll);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    // destroy rather than just detach, then free the painted street
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseStreetArt(this.textures);
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseStreetArt(this.textures);
  }
}
