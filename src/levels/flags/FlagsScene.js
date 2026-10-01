import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { paintHarbour, releaseHarbourArt, FLAG_FRAMES } from "./harbour.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "FLAGS"  ·  code: DEBRIEFING   ·  dress the ship
//
// A harbour at dusk, painted like a background from an animated film: the
// sun going down into the sea and laying a road of gold across it, the sky
// burning from gold to violet with the first stars out, the lighthouse on
// the headland just lit and turning, a little boat at anchor with a lantern
// in her rigging, gulls going home — and on the quay, a line strung between
// two old harbour lamps, lit, dressed with five national flags, pegged on
// and stirring in the breeze, the sunset shining through them.
//
// Read left to right. Each flag is a country; each country has its two-letter
// code. Concatenate the codes in hanging order:
//
//   Germany DE · Brazil BR · Ireland IE · Finland FI · Nigeria NG
//                                                    →  DEBRIEFING
//
// Nothing on screen names a country or a code, and nothing snaps. The access
// code is the proof.
//
// The harbour is painted once per screen size (harbour.js); what moves is
// driven from here: the flags' folds and their sway, the clouds drifting, the
// gulls, the boat riding the swell and her lantern, the lighthouse's beam,
// the lamps, the stars, the glints on the water.
// ─────────────────────────────────────────────────────────────────────────────

// hanging order — the initials of the countries spell the code
const FL_FLAGS = ["DE", "BR", "IE", "FI", "NG"];

export default class FlagsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Flags" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    // (there is no mouse manager on a touch-only setup)
    if (this.input.mouse) this.input.mouse.disableContextMenu();

    this._flagPhase = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const art = (this._art = paintHarbour(this, W, H, FL_FLAGS));
    const L = (this._L = art.L);
    const K = art.keys;
    const ADD = Phaser.BlendModes.ADD;
    this.add.image(0, 0, K.sky).setOrigin(0, 0).setDepth(-30);
    this._stars = art.stars.map((s, i) => ({
      img: this.add
        .image(s.x, s.y, K.star)
        .setDisplaySize(s.s * 7 * L.u, s.s * 7 * L.u)
        .setBlendMode(ADD)
        .setDepth(-29.5),
      ph: i * 1.9,
      sp: 1.2 + (i % 5) * 0.35,
    }));
    // clouds heaped on the horizon, drifting very slowly; the sea and the
    // hills in front of them hide their feet
    this._clouds = art.clouds.map((c) => ({
      img: this.add.image(c.x, c.y, c.key).setOrigin(0.5, c.oy).setDepth(-29),
      speed: (2 + Math.random() * 2) * L.u, // px a second, drifting left
    }));
    this.add.image(0, 0, K.land).setOrigin(0, 0).setDepth(-27);
    this._makeBeacon(art, K);
    this._makeGlints(L, K);
    this._makeGulls(L, K);
    const b = art.boat;
    this._boat = this.add
      .image(b.x, b.y, K.boat)
      .setOrigin(b.ox, b.oy)
      .setScale(1 / art.res)
      .setDepth(-22);
    this._boatLight = {
      ...b.lantern,
      img: this.add
        .image(b.x, b.y, K.glow)
        .setBlendMode(ADD)
        .setDisplaySize(26 * L.u, 26 * L.u)
        .setDepth(-21.9),
    };
    this.add.image(0, 0, K.front).setOrigin(0, 0).setDepth(-10);
    // the harbour lamps' light, never quite steady
    this._lamps = art.lamps.map((p, i) => ({
      img: this.add
        .image(p.x, p.y, K.glow)
        .setBlendMode(ADD)
        .setDisplaySize(L.postW * 12, L.postW * 12)
        .setDepth(-9),
      ph: i * 2.7,
    }));
    this._flags = art.flags.map((f, i) => ({
      img: this.add
        .image(f.x, f.y, f.key, 0)
        .setOrigin(0.5, f.oy)
        .setScale(1 / art.res)
        .setRotation(f.angle)
        .setDepth(2 + i * 0.01),
      angle: f.angle,
      ph: i * 1.7,
    }));
    this.add
      .image(0, 0, K.veil)
      .setOrigin(0, 0)
      .setDisplaySize(W, H)
      .setDepth(18);
    this._drawTexts(W);
    this._built = true;
  }

  // the lighthouse's lamp, turning: its beam swings out across the sea and
  // round behind, and flashes as it comes round to face us
  _makeBeacon(art, K) {
    const L = art.L;
    const p = art.beacon;
    this._beamScale = (L.W * 0.42) / 512;
    this._beam = this.add
      .image(p.x, p.y, K.beam)
      .setOrigin(0, 0.5)
      .setScale(this._beamScale, (L.H * 0.1) / 128)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-26);
    this._flash = this.add
      .image(p.x, p.y, K.glow)
      .setDisplaySize(L.lighthouse.w * 11, L.lighthouse.w * 11)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(-25.9);
  }

  // the sunset glinting on the wave tops: most of it on the sun's road,
  // a little everywhere else; each glint catching the light and losing it
  _makeGlints(L, K) {
    this._glints = [];
    const rnd = this._rng(5150);
    for (let i = 0; i < 36; i++) {
      const t = Math.pow(rnd(), 0.9);
      const y = L.horizon + 4 + t * (L.pier - L.horizon - 12);
      const onRoad = i < 26;
      const spread = L.S * (0.02 + t * 0.2);
      const x = onRoad
        ? L.sun.x + (rnd() + rnd() - 1) * spread
        : L.W * (0.02 + rnd() * 0.96);
      const s = (5 + t * 9 + rnd() * 4) * L.u;
      const img = this.add
        .image(x, y, K.glint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(s, s)
        .setDepth(-24)
        .setAlpha(0);
      this._glints.push({
        img,
        ph: rnd() * 10,
        sp: 1.5 + rnd() * 2.5,
        peak: onRoad ? 0.35 : 0.2,
      });
    }
  }

  // two gulls going home across the sunset
  _makeGulls(L, K) {
    this._gulls = [0, 1].map((i) => ({
      img: this.add
        .image(-50, 0, K.gull, 0)
        .setScale((0.5 + i * 0.12) * L.u)
        .setDepth(-23),
      x: L.W * (0.3 + i * 0.35),
      y0: L.H * (0.46 + i * 0.05),
      speed: (18 + i * 7) * L.u,
      ph: i * 2.3,
    }));
  }

  _drawTexts(W) {
    this.levelText = this.add
      .text(
        W - 30,
        28,
        "Level " +
          (this.services.levels.definitions.findIndex(
            (l) => l.key === this.scene.key,
          ) +
            1),
        {
          fontFamily: '"Special Elite", monospace',
          fontSize: "28px",
          color: "#fff1dc",
        },
      )
      .setOrigin(1, 0)
      .setShadow(0, 2, "rgba(20,12,48,0.95)", 8, false, true)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── what moves ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._built || !this.ambientMotion) return;
    const t = time / 1000;
    const dt = Math.min(delta || 16, 100) / 1000;
    const L = this._L;
    const breeze = 0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.23 + 1);

    // the flags: their folds run with the breeze — the phase is added up
    // frame by frame, so a change in the breeze changes the speed only (it
    // used to be time × speed, which jumped backwards and raced as the
    // minutes went by) — and they sway on the line
    this._flagPhase += dt * (6 + 3 * breeze);
    for (const f of this._flags) {
      f.img.setFrame(Math.floor(this._flagPhase + f.ph * 3) % FLAG_FRAMES);
      f.img.rotation =
        f.angle +
        0.03 * breeze * Math.sin(t * 1.3 + f.ph) +
        0.01 * Math.sin(t * 3.1 + f.ph * 2);
    }

    for (const c of this._clouds) {
      c.img.x -= c.speed * dt;
      if (c.img.x < -c.img.displayWidth / 2)
        c.img.x = L.W + c.img.displayWidth / 2;
    }

    for (const g of this._gulls) {
      g.x += g.speed * dt;
      if (g.x > L.W + 60) g.x = -60;
      g.img.setPosition(g.x, g.y0 + Math.sin(t * 0.7 + g.ph) * L.H * 0.02);
      // a few slow wingbeats, then a long glide
      const beat = (t * 1.6 + g.ph) % 4;
      g.img.setFrame(beat < 1.2 ? Math.floor(beat * 5) % 3 : 1);
    }

    // the boat on the swell, her lantern swinging with her
    const rot = 0.035 * Math.sin(t * 0.9);
    this._boat.rotation = rot;
    this._boat.y = L.boat.y + Math.sin(t * 0.9 + 0.8) * 1.5 * L.u;
    const bl = this._boatLight;
    bl.img.setPosition(
      this._boat.x + bl.dx * Math.cos(rot) - bl.dy * Math.sin(rot),
      this._boat.y + bl.dx * Math.sin(rot) + bl.dy * Math.cos(rot),
    );
    bl.img.setAlpha(0.75 + 0.2 * Math.sin(t * 6.1) * Math.sin(t * 2.3));

    // the lighthouse: a turn every eight seconds or so
    const th = t * 0.8;
    const c = Math.cos(th);
    const s = Math.sin(th);
    this._beam.scaleX = this._beamScale * c;
    this._beam.setAlpha(Math.abs(c) * (0.55 + 0.35 * s));
    this._flash.setAlpha(Math.pow(Math.max(0, s), 6) * 0.95);

    for (const lamp of this._lamps) {
      lamp.img.setAlpha(
        0.92 +
          0.1 * Math.sin(t * 7.3 + lamp.ph) * Math.sin(t * 3.1 + lamp.ph * 2) +
          0.04 * Math.sin(t * 17 + lamp.ph),
      );
    }

    for (const st of this._stars) {
      st.img.setAlpha(0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph)));
    }

    for (const g of this._glints) {
      const a = Math.sin(t * g.sp + g.ph);
      g.img.setAlpha(a > 0.55 ? ((a - 0.55) / 0.45) * g.peak : 0);
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._flags = null;
    releaseHarbourArt(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._flags = null;
    releaseHarbourArt(this.textures);
  }
}
