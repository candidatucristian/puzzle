import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { layoutCabin, paintCabin, releaseCabinArt, MAP_FONT } from "./cabin.js";
import { COMPASS_BEARINGS } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "COMPASS"  ·  code: LOST  ·  compass bearings → a walk → letters
//
// A pirate ship at night, the captain's cabin seen from its door, dark and
// picked out in gold, its timbers creaking. Over the chart table hangs the
// ship's compass in its gilded gimbal ring, upright, its face to us, and its
// needle has gone mad: it spins, stops dead on a bearing, jumps to the next,
// spins again. On the table lies the map, folded and sealed; opened, it
// shows four lines of bearings in the captain's hand:
//
//   180 180 90 · 270 180 180 90 90 0 0 270 · 270 270 180 90 90 180 270 270
//   · 90 90 270 180 180
//
// North is 0, east 90, south 180, west 270 — and since the compass hangs
// facing us, that is up, right, down, left on its card. Each bearing is one
// step that way, each line one letter: down, down, right is L. The four walks
// draw L O S T.
//
// The needle points out the very same bearings, line by line: a spin between
// two letters, then one bearing after another, each held — and where a line
// repeats a bearing, the needle starts away and comes back to it. A tap on
// the glass starts it again from the first letter.
// ─────────────────────────────────────────────────────────────────────────────

const SPIN = 1400; // ms the needle spins wild before a letter
const SPIN_END = 3200; // ... and after the last one, before the word again
const HOLD = 1400; // ms on each bearing
const ARRIVE = 700; // more time on the first bearing after a spin
const KICK = 380; // °/s a repeated bearing throws the needle off by

export default class CompassScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Compass" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("creakingwood", "assets/sounds/Compass/creakingwood.mp3");
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._startCreaking();
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const L = layoutCabin(W, H);
    const art = paintCabin(this, L);
    const k = art.keys;
    const inv = 1 / art.res;
    this._L = L;
    this._art = art;

    // the night through the stern window, behind the cabin (the window is
    // left open in it); it rolls with the ship
    this._view = this.add.image(L.win.x, L.win.cy, k.view).setDepth(-12);
    this._glitter = this.add
      .image(L.win.x, L.win.cy, k.glitter)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-11);
    this.add.image(0, 0, k.room).setOrigin(0, 0).setDepth(-10);
    // the map lies in the dark, just catching the moon
    this._folded = this.add
      .image(L.map.x, L.map.y, k.folded)
      .setScale(inv)
      .setTint(0x9aa2b8)
      .setDepth(-9);
    // the moon's light through the window, and the dust turning in it
    this._beams = this.add
      .image(0, 0, k.beams)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-3);
    this._makeDust(L, k.glow);

    // the candle's flame and its light
    const cd = L.candle;
    this._flame = this.add
      .image(cd.x, cd.flameY, k.flame)
      .setOrigin(0.5, 0.95)
      .setDisplaySize(cd.size * 0.45, cd.size)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-8);
    this._candleGlow = this.add
      .image(cd.x, cd.flameY - cd.size * 0.4, k.glow)
      .setDisplaySize(cd.size * 4, cd.size * 4)
      .setTint(0xffb860)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.35)
      .setDepth(-8);
    this._flameH = cd.size;

    // the compass, hanging from the beam: everything on it swings together
    const c = L.compass;
    const drop = c.y - L.pivot.y;
    this._compass = this.add.container(L.pivot.x, L.pivot.y).setDepth(-7);
    // the compass is in the night too: its gold dimmed, the needle still clear
    const body = this.add
      .image(0, drop, k.body)
      .setOrigin(0.5, art.body.oy)
      .setScale(inv)
      .setTint(0x8a847c);
    this._lockGlow = this.add
      .image(0, drop, k.glow)
      .setDisplaySize(c.r * 0.32, c.r * 0.32)
      .setTint(0xffd27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this._shade = this.add
      .image(c.r * 0.03, drop + c.r * 0.05, k.shade)
      .setOrigin(0.5, art.needle.oy)
      .setScale(inv);
    this._needleImg = this.add
      .image(0, drop, k.needle)
      .setOrigin(0.5, art.needle.oy)
      .setScale(inv)
      .setTint(0xd8d4d0);
    const glass = this.add.image(0, drop, k.glass).setScale(inv).setAlpha(0.7);
    this._compass.add([
      body,
      this._lockGlow,
      this._shade,
      this._needleImg,
      glass,
    ]);
    this._drop = drop;

    // the lantern and its light, which swing together
    const lan = L.lantern;
    this._lantern = this.add
      .image(lan.x, lan.y, k.lantern)
      .setOrigin(0.5, 0)
      .setScale(inv)
      .setDepth(-5);
    this._roomGlow = this.add
      .image(0, 0, k.glow)
      .setDisplaySize(W * 0.7, H * 0.85)
      .setTint(0xffa050)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.025)
      .setDepth(-6);
    this._flameGlow = this.add
      .image(0, 0, k.glow)
      .setDisplaySize(lan.s * 110, lan.s * 110)
      .setTint(0xffc070)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.4)
      .setDepth(-4);

    // a tap on the glass, and the map on the table
    const glassZone = this.add
      .zone(c.x, c.y, c.r * 2.2, c.r * 2.2)
      .setInteractive({
        hitArea: new Phaser.Geom.Circle(c.r * 1.1, c.r * 1.1, c.r * 1.1),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true,
      })
      .setData("interactionLabel", "Tap the glass")
      .setDepth(5)
      .on("pointerdown", () => this._tapGlass());
    const m = L.map;
    const mapZone = this.add
      .zone(m.x, m.y, m.w * 1.1, m.h * 1.4)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Open the map")
      .setDepth(5)
      .on("pointerdown", () => this._openMap());
    this._zones = [glassZone, mapZone];

    this.levelText = drawLevelLabel(this, W, H);

    this._steps = program();
    this._needle = this._needle || {
      a: 0,
      w: 0,
      step: 0,
      t: 0,
      locked: false,
      shove: 0,
    };
    this._sheet = null;
  }

  // motes of dust drifting slowly through the moonbeams, catching the light
  _makeDust(L, glow) {
    const b = L.beam;
    const rnd = this._rng(4040);
    const inBeam = (k, f) => {
      const y = b.top.y + (b.bottom.y - b.top.y) * f;
      const x0 = b.top.x0 + (b.bottom.x0 - b.top.x0) * f;
      const x1 = b.top.x1 + (b.bottom.x1 - b.top.x1) * f;
      return { x: x0 + (x1 - x0) * k, y };
    };
    for (let i = 0; i < 46; i++) {
      const p = inBeam(rnd(), 0.08 + rnd() * 0.8);
      const size = L.S * (0.004 + rnd() * 0.006);
      const mote = this.add
        .image(p.x, p.y, glow)
        .setDisplaySize(size, size)
        .setTint(0xdce6ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(-2);
      if (!this.ambientMotion) {
        mote.setAlpha(0.3 + rnd() * 0.3);
        continue;
      }
      const drift = () => {
        const q = inBeam(rnd(), 0.08 + rnd() * 0.8);
        mote.setPosition(q.x, q.y);
        this.tweens.add({
          targets: mote,
          x: q.x + (rnd() - 0.5) * L.S * 0.06,
          y: q.y + L.S * (0.01 + rnd() * 0.04),
          duration: 6000 + rnd() * 8000,
          onUpdate: (tw) =>
            mote.setAlpha(
              Math.sin(Math.PI * tw.progress) * (0.35 + 0.3 * rnd()),
            ),
          onComplete: drift,
        });
      };
      this.time.delayedCall(rnd() * 6000, drift);
    }
  }

  // ── the needle ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._L) return;
    const dt = Math.min(delta || 16, 50) / 1000;
    this._roll(time / 1000);
    this._dance(dt);
  }

  _dance(dt) {
    const d = this._needle;
    const step = this._steps[d.step];
    const calm = this.reducedMotion;
    d.t += dt * 1000;
    if (step.spin) {
      if (calm) {
        // one slow, steady turn instead of the madness
        d.w = 360 / (step.spin / 1000);
      } else {
        // thrown about: shoved one way, then the other, never still
        d.shove -= dt;
        if (d.shove <= 0) {
          d.w += (Math.random() < 0.5 ? -1 : 1) * (300 + Math.random() * 700);
          d.shove = 0.12 + Math.random() * 0.25;
        }
        d.w = Phaser.Math.Clamp(d.w * Math.exp(-0.8 * dt), -1100, 1100);
      }
    } else {
      // drawn to its bearing like a real needle: past it, back, and still
      const err = wrap(d.a - step.to);
      d.w += (-60 * err - (calm ? 16 : 9) * d.w) * dt;
      if (!d.locked && Math.abs(err) < 1.5 && Math.abs(d.w) < 12) {
        d.locked = true;
        this._lock(step.to);
      }
    }
    d.a = (((d.a + d.w * dt) % 360) + 360) % 360;
    this._needleImg.setAngle(d.a);
    this._shade.setAngle(d.a);
    if (d.t >= (step.spin || step.hold)) {
      d.step = (d.step + 1) % this._steps.length;
      d.t = 0;
      d.locked = false;
      const next = this._steps[d.step];
      if (next.kick && !calm) d.w += (Math.random() < 0.5 ? -1 : 1) * KICK;
    }
  }

  // the needle comes to rest: a click in the bowl, the degree lit on the card
  _lock(bearing) {
    const r = this._L.compass.r;
    const a = ((bearing - 90) * Math.PI) / 180;
    this.tweens.killTweensOf(this._lockGlow);
    this._lockGlow
      .setPosition(Math.cos(a) * r * 0.92, this._drop + Math.sin(a) * r * 0.92)
      .setAlpha(0.8);
    this.tweens.add({
      targets: this._lockGlow,
      alpha: 0,
      duration: 1100,
      ease: "Quad.easeIn",
    });
    this._tick();
  }

  _tapGlass() {
    const d = this._needle;
    d.step = 0;
    d.t = 0;
    d.locked = false;
    d.w += (Math.random() < 0.5 ? -1 : 1) * 600;
    this._clink();
  }

  // the ship's roll: the sea tilting in the window and its moon road
  // glittering, the compass swaying a little on its hook, the lantern
  // swinging on its chain and its light swinging with it
  _roll(t) {
    const L = this._L;
    const on = this.ambientMotion && !this.reducedMotion ? 1 : 0;
    const roll = on * (Math.sin(t * 0.9) * 1.8 + Math.sin(t * 0.37 + 1) * 0.8);
    this._view.setAngle(roll);
    this._glitter
      .setAngle(roll)
      .setAlpha(0.75 + on * 0.25 * Math.sin(t * 3.1) * Math.sin(t * 1.7));
    this._compass.setAngle(-roll * 0.5);
    const flick = on * (Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.5);
    this._flame
      .setDisplaySize(
        this._flameH * (0.45 - flick * 0.03),
        this._flameH * (1 + flick * 0.08),
      )
      .setAngle(flick * 4);
    this._candleGlow.setAlpha(0.32 + flick * 0.05);
    // the moonlight breathes as clouds pass and the ship rolls
    this._beams.setAlpha(
      0.9 + on * (0.07 * Math.sin(t * 0.5) + 0.03 * Math.sin(t * 1.7)),
    );
    const swing =
      on * (Math.sin(t * 0.9 - 0.4) * 6 + Math.sin(t * 0.37 + 0.6) * 2);
    this._lantern.setAngle(swing);
    const a = (swing * Math.PI) / 180;
    const drop = this._art.lantern.flameDrop;
    const fx = L.lantern.x - Math.sin(a) * drop;
    const fy = L.lantern.y + Math.cos(a) * drop;
    this._flameGlow
      .setPosition(fx, fy)
      .setAlpha(0.36 + on * Math.random() * 0.08);
    this._roomGlow.setPosition(fx + (fx - L.lantern.x) * 6, fy + L.H * 0.18);
  }

  // ── the map ────────────────────────────────────────────────────────────────

  _openMap() {
    if (this._sheet) return;
    const L = this._L;
    const art = this._art;
    const sh = art.sheet;
    const inv = 1 / art.res;
    this._rustle();
    // the room is out of reach while the map is open
    for (const z of this._zones) z.disableInteractive();

    const veil = this.add
      .rectangle(0, 0, L.W, L.H, 0x050302, 0.7)
      .setOrigin(0, 0)
      .setAlpha(0)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
      .setData("interactionLabel", "Fold the map");
    const cont = this.add.container(L.W / 2, L.H * 0.47).setDepth(31);
    cont.add(
      this.add
        .image(L.S * 0.008, L.S * 0.014, art.keys.sheet)
        .setScale(inv)
        .setTint(0x000000)
        .setAlpha(0.5),
    );
    cont.add(this.add.image(0, 0, art.keys.sheet).setScale(inv));

    // the bearings, a line for each letter, in the captain's hand
    const lines = COMPASS_BEARINGS.map((line, i) =>
      this.add
        .text(
          -sh.w / 2 + sh.textX,
          -sh.h / 2 + sh.lines[i].y,
          line.map((b) => `${b}°`).join("  ·  "),
          {
            fontFamily: MAP_FONT,
            fontSize: Math.round(sh.w * 0.05) + "px",
            color: "#3a2210",
          },
        )
        .setOrigin(0, 0.5)
        .setAngle(i % 2 ? 0.6 : -0.8),
    );
    const widest = Math.max(...lines.map((t) => t.width));
    if (widest > sh.w * 0.82) {
      const size = Math.floor(sh.w * 0.05 * ((sh.w * 0.82) / widest));
      for (const t of lines) t.setFontSize(size);
    }
    cont.add(lines);

    // it comes up off the table and unfolds
    const from = { x: L.map.x, y: L.map.y };
    this._folded.setVisible(false);
    cont
      .setPosition(from.x, from.y)
      .setScale(0.28, 0.12)
      .setAngle(-7)
      .setAlpha(0.4);
    this.tweens.add({ targets: veil, alpha: 1, duration: 360 });
    this.tweens.add({
      targets: cont,
      x: L.W / 2,
      y: L.H * 0.47,
      angle: -1.2,
      scaleX: 1,
      alpha: 1,
      duration: 420,
      ease: "Cubic.easeOut",
    });
    this.tweens.add({
      targets: cont,
      scaleY: 1,
      duration: 560,
      delay: 80,
      ease: "Back.easeOut",
    });

    veil.on("pointerdown", () => this._closeMap());
    this._sheet = { veil, cont, from, closing: false };
  }

  _closeMap() {
    const s = this._sheet;
    if (!s || s.closing) return;
    s.closing = true;
    this._rustle();
    this.tweens.add({ targets: s.veil, alpha: 0, duration: 320 });
    this.tweens.add({
      targets: s.cont,
      x: s.from.x,
      y: s.from.y,
      scaleX: 0.28,
      scaleY: 0.12,
      angle: -7,
      alpha: 0,
      duration: 360,
      ease: "Cubic.easeIn",
      onComplete: () => {
        s.veil.destroy();
        s.cont.destroy();
        if (this._sheet !== s) return;
        this._sheet = null;
        this._folded.setVisible(true);
        for (const z of this._zones) z.setInteractive();
      },
    });
  }

  // ── sounds ─────────────────────────────────────────────────────────────────

  _ac() {
    const ac = this.sound && this.sound.context;
    const st =
      this.services && this.services.audio && this.services.audio.state;
    if (!ac || (st && st.muted)) return null;
    return { ac, vol: st ? st.sfxVol : 0.8 };
  }

  // a short burst of filtered noise, shaped by `env(k)` over its length
  _noise(dur, type, freq, q, gain, env) {
    const a = this._ac();
    if (!a) return;
    try {
      const { ac, vol } = a;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * env(i / d.length);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ac.createGain();
      g.gain.value = vol * gain;
      src.connect(f);
      f.connect(g);
      g.connect(this.sound.destination);
      src.start();
    } catch (e) {}
  }

  // the ship's timbers creaking all the while, quietly
  _startCreaking() {
    try {
      if (!this.cache.audio.exists("creakingwood")) return;
      this.services.audio
        .addSceneSound(this, "creakingwood", { loop: true, gain: 0.3 })
        ?.play();
    } catch (e) {}
  }

  // the needle settling on its pivot: a tiny dry click
  _tick() {
    this._noise(0.04, "bandpass", 2600, 3, 0.09, (k) => Math.exp(-k * 9));
  }

  // old paper, unfolded or folded
  _rustle() {
    this._noise(
      0.42,
      "highpass",
      1800,
      0.7,
      0.16,
      (k) =>
        (0.35 + 0.65 * Math.random() * Math.random()) * Math.sin(k * Math.PI),
    );
  }

  // a fingernail on the compass glass
  _clink() {
    const a = this._ac();
    if (!a) return;
    try {
      const { ac, vol } = a;
      const t = ac.currentTime;
      for (const [f, g0] of [
        [2350, 0.06],
        [3720, 0.03],
      ]) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(g0 * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
        o.connect(g);
        g.connect(this.sound.destination);
        o.start(t);
        o.stop(t + 0.3);
      }
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseCabinArt(this.textures);
    this._sheet = null;
    this._zones = [];
    this._view = this._glitter = this._beams = null;
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseCabinArt(this.textures);
    this._L = null;
    this._needle = null;
  }
}

// the needle's whole round: a spin before each letter, then its bearings one
// by one; a bearing that repeats the one before is marked by a kick
function program() {
  const steps = [];
  COMPASS_BEARINGS.forEach((line) => {
    steps.push({ spin: SPIN });
    line.forEach((to, i) =>
      steps.push({
        to,
        hold: HOLD + (i ? 0 : ARRIVE),
        kick: i > 0 && line[i - 1] === to,
      }),
    );
  });
  steps.push({ spin: SPIN_END });
  return steps;
}

// an angle brought into -180..180
function wrap(deg) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}
