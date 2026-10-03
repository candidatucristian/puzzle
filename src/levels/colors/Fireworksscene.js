import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import {
  layoutParis,
  paintParis,
  releaseParisArt,
  burnColour,
  FW_FONT,
} from "./paris.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "FIREWORKS"  ·  code: NIGHT  ·  hexadecimal colours → ASCII
//
// New Year's Eve in Paris, on a terrace above the Seine. The clock on the
// bench says midnight, the Eiffel Tower sparkles, and five fireworks go up
// over the city one after another. Each burns in its own colour, and the tag
// that hangs from it gives that colour's exact hex code:
//
//   1 · #4E2233    2 · #492244    3 · #472255    4 · #482266    5 · #542277
//
// The brass plate on the clock says READ THE RED: in #RRGGBB the red is the
// first two digits — 4E 49 47 48 54 — and as ASCII letters those spell
// N I G H T. (Each firework burns in its hex raised to full brightness, so
// it is the same hue as its code, only bright enough to see in the sky.)
//
// The background is a picture (FW_BG, made with an image generator: Paris at
// night, the clock on the bench at midnight, an empty brass plate, no
// fireworks). Over it, live: the fireworks and their tags, their light, the
// clock's red second hand, READ THE RED on the plate, the tower's sparkle. All
// of them are placed by FW_SPOTS, as fractions of the picture, so that a new
// picture only needs its spots measured. If the picture can't be loaded the
// painted Paris (paris.js) stands in for it.
//
// The show runs round and round; a click on the clock starts it again from
// the first firework.
// ─────────────────────────────────────────────────────────────────────────────

// the background picture, and where things are in it (fractions of its width
// and height — measure them on the picture you use)
// baked: true — the picture already has the fireworks (and the notebook with
// the codes) painted in it: the scene doesn't send up new ones, it makes the
// painted ones flare again, one after another, in their order. Set it to false
// for a picture with an empty sky (and the clock): then the scene sends the
// fireworks up itself and hangs a tag with its code under each.
export const FW_BG = {
  key: "fw_bg",
  url: "assets/images/fireworks/paris.png",
  baked: true,
};
export const FW_SPOTS = {
  bursts: [
    { x: 0.2, y: 0.122 },
    { x: 0.335, y: 0.273 },
    { x: 0.45, y: 0.132 },
    { x: 0.667, y: 0.239 },
    { x: 0.863, y: 0.278 },
  ],
  burstR: 0.076, // a burst's radius, as a fraction of the picture's width
  clock: { x: 0.29, y: 0.71, r: 0.05 }, // the clock face: centre and radius
  plate: { x: 0.29, y: 0.83, w: 0.12, h: 0.025 }, // the empty brass plate
  tower: {
    top: { x: 0.544, y: 0.07 },
    left: { x: 0.477, y: 0.49 },
    right: { x: 0.608, y: 0.49 },
  },
  lamp: { x: 0.073, y: 0.157 },
  river: { y0: 0.55, y1: 0.75 },
  horizon: 0.45,
};

export const FW_CODES = ["#4E2233", "#492244", "#472255", "#482266", "#542277"];
const FW_EVERY = 2600; // ms between two fireworks going up
const FW_PAUSE = 2600; // ms of quiet after the fifth, before the show repeats
const FW_RISE = 900; // ms the rocket climbs
const FW_LIFE = 2300; // ms the burst burns
const FW_TAG = 3300; // ms its tag stays up

export default class FireworksScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Fireworks" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    if (!this.textures.exists(FW_BG.key)) this.load.image(FW_BG.key, FW_BG.url);
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);

    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const L = this.textures.exists(FW_BG.key)
      ? this._layoutPicture(W, H)
      : layoutParis(W, H);
    // the painted Paris still makes the small textures (glow, glint); its
    // room is only shown when there is no picture
    const art = paintParis(this, L.painted ? L : layoutParis(W, H));
    this._L = L;
    this._art = L.towerPts ? { ...art, towerPts: L.towerPts } : art;

    this._baked = !!(L.picture && FW_BG.baked);
    if (L.picture) {
      this.add
        .image(L.picture.x, L.picture.y, FW_BG.key)
        .setOrigin(0, 0)
        .setScale(L.picture.k)
        .setDepth(-10);
    }
    if (L.picture && !this._baked) {
      // READ THE RED, engraved on the clock's plate
      const p = L.plate;
      this.add
        .text(p.x, p.y, "READ THE RED", {
          fontFamily: FW_FONT,
          fontSize: Math.max(10, Math.round(p.h * 0.62)) + "px",
          color: "#4a0e0e",
        })
        .setOrigin(0.5)
        .setShadow(0.8, 1, "rgba(255,236,190,0.55)", 0)
        .setDepth(-7);
    } else if (!L.picture) {
      this.add.image(0, 0, art.room).setOrigin(0, 0).setDepth(-10);
    }

    // the fireworks' light: a flash on the sky, its echo on the river
    this._flash = this.add
      .image(0, 0, art.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(-9);
    this._echo = this.add
      .image(0, 0, art.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(-9);
    this._sparks = this.add
      .graphics()
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-8);
    this._tags = [];

    // the tower's sparkle, the lamp's flame
    this._glints = [];
    for (let i = 0; i < 18; i++) {
      this._glints.push({
        img: this.add
          .image(0, 0, art.glint)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setDepth(-9),
        life: 0,
      });
    }
    this._lampGlow = this.add
      .image(L.lamp.x, L.lamp.y, art.glow)
      .setDisplaySize(L.S * 0.3, L.S * 0.3)
      .setTint(0xffc078)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.4)
      .setDepth(-9);

    if (!this._baked) {
      this._makeSecondHand(L);
      this._makeClockTouch(L);
    }
    this.levelText = drawLevelLabel(this, W, H);

    // the show: fireworks one after another, round and round
    this._show = { t: 0, live: [], fired: -1 };
  }

  // the picture covers the screen (cropped at the edges if it must); every
  // spot is mapped from the picture onto the screen
  _layoutPicture(W, H) {
    const src = this.textures.get(FW_BG.key).getSourceImage();
    const iw = src.width;
    const ih = src.height;
    const k = Math.max(W / iw, H / ih);
    const ox = (W - iw * k) / 2;
    const oy = (H - ih * k) / 2;
    const P = (f) => ({ x: ox + f.x * iw * k, y: oy + f.y * ih * k });
    const sp = FW_SPOTS;
    const S = Math.min(W, H);
    const R = sp.burstR * iw * k;
    const clock = P(sp.clock);
    const plate = P(sp.plate);
    const L = {
      W,
      H,
      S,
      picture: { x: ox, y: oy, k },
      bursts: sp.bursts.map((b) => ({ ...P(b), r: R })),
      clock: {
        x: clock.x,
        base: clock.y + sp.clock.r * iw * k,
        w: sp.clock.r * iw * k * 2.4,
        h: sp.clock.r * iw * k * 2.4,
        face: { x: clock.x, y: clock.y, r: sp.clock.r * iw * k },
      },
      plate: {
        x: plate.x,
        y: plate.y,
        w: sp.plate.w * iw * k,
        h: sp.plate.h * ih * k,
      },
      lamp: P(sp.lamp),
      horizon: oy + sp.horizon * ih * k,
      river: { y0: oy + sp.river.y0 * ih * k, y1: oy + sp.river.y1 * ih * k },
      rail: { x0: W * 0.45 },
    };
    // points on the tower for its sparkle: inside its outline, a narrow spire
    const t = {
      top: P(sp.tower.top),
      left: P(sp.tower.left),
      right: P(sp.tower.right),
    };
    const pts = [];
    for (let i = 0; i < 60; i++) {
      const v = Math.pow(Math.random(), 0.8);
      const y = t.top.y + (t.left.y - t.top.y) * v;
      const half = ((t.right.x - t.left.x) / 2) * Math.pow(v, 1.8);
      const cx = t.top.x + ((t.left.x + t.right.x) / 2 - t.top.x) * v;
      pts.push({ x: cx + (Math.random() * 2 - 1) * half * 0.8, y });
    }
    L.towerPts = pts;
    return L;
  }

  // the clock's red second hand, ticking past midnight
  _makeSecondHand(L) {
    const f = L.clock.face;
    const g = this.add.graphics();
    g.lineStyle(Math.max(1.2, f.r * 0.025), 0xc4161c, 1);
    g.lineBetween(0, f.r * 0.2, 0, -f.r * 0.86);
    g.fillStyle(0xc4161c, 1).fillCircle(0, 0, Math.max(2, f.r * 0.06));
    g.fillStyle(0xf0d08a, 1).fillCircle(0, 0, Math.max(1, f.r * 0.025));
    this._hand = this.add.container(f.x, f.y, [g]).setDepth(-7);
    this._sec = 0;
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this._sec = (this._sec + 1) % 60;
        if (this._hand) this._hand.setAngle(this._sec * 6);
      },
    });
  }

  // a click on the clock: midnight again, the show from the first firework
  _makeClockTouch(L) {
    const c = L.clock;
    const zone = this.add
      .zone(c.x, c.base - c.h / 2, c.w, c.h)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
    zone.on("pointerdown", () => {
      this._chime();
      this._sec = 0;
      if (this._hand) this._hand.setAngle(0);
      for (const tag of this._tags) tag.destroy();
      this._tags = [];
      this._show = { t: 0, live: [], fired: -1 };
    });
  }

  // ── the show ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._L || !this._show) return;
    const dt = Math.min(delta || 16, 100);
    const show = this._show;
    const L = this._L;
    const cycle = FW_CODES.length * FW_EVERY + FW_PAUSE;
    show.t += dt;
    if (show.t >= cycle) {
      show.t -= cycle;
      show.fired = -1;
    }
    // the next rocket goes up
    const due = Math.floor(show.t / FW_EVERY);
    if (due < FW_CODES.length && due > show.fired) {
      show.fired = due;
      this._launch(due);
    }
    this._drawShow(dt);
    this._sparkleTower(dt);
    this._lampGlow.setAlpha(0.36 + Math.random() * 0.08);
    void L;
  }

  _launch(i) {
    const b = this._L.bursts[i];
    const rnd = Math.random;
    this._show.live.push({
      i,
      b,
      col: burnColour(FW_CODES[i]),
      age: this._baked ? FW_RISE : 0,
      baked: this._baked,
      from: { x: b.x + (rnd() - 0.5) * b.r * 0.4, y: this._L.horizon },
      sparks: null,
    });
  }

  _burst(fw) {
    const { b } = fw;
    const sparks = [];
    const n = 170;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.05;
      const sp = b.r * 3.1 * (0.78 + Math.random() * 0.28);
      sparks.push({
        x: b.x,
        y: b.y,
        px: b.x,
        py: b.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        tw: Math.random(),
      });
    }
    // a smaller, paler ring inside
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = b.r * 3.1 * (0.25 + Math.random() * 0.3);
      sparks.push({
        x: b.x,
        y: b.y,
        px: b.x,
        py: b.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        tw: Math.random(),
        inner: true,
      });
    }
    if (fw.baked) {
      // over a firework already in the picture: fewer, finer sparks
      fw.sparks = sparks.filter((_, k) => k % 2 === 0);
      for (const p of fw.sparks) {
        p.vx *= 0.9;
        p.vy *= 0.9;
      }
    } else {
      fw.sparks = sparks;
    }
    this._flashAt(fw);
    if (!fw.baked) this._hangTag(fw);
    this._boom();
  }

  // the burst lights the sky round it, and the river under it
  _flashAt(fw) {
    const { b } = fw;
    const L = this._L;
    this._flash
      .setPosition(b.x, b.y)
      .setDisplaySize(b.r * 6, b.r * 6)
      .setTint(fw.col)
      .setAlpha(fw.baked ? 0.4 : 0.55);
    this.tweens.add({
      targets: this._flash,
      alpha: 0,
      duration: 1200,
      ease: "Quad.easeOut",
    });
    if (b.x > L.rail.x0) {
      const ry = L.river.y0 + (L.river.y1 - L.river.y0) * 0.35;
      this._echo
        .setPosition(b.x, ry)
        .setDisplaySize(b.r * 1.6, (L.river.y1 - L.river.y0) * 0.8)
        .setTint(fw.col)
        .setAlpha(0.4);
      this.tweens.add({
        targets: this._echo,
        alpha: 0,
        duration: 1400,
        ease: "Quad.easeOut",
      });
    }
  }

  // the tag that hangs from it: its number, and its colour's exact code
  _hangTag(fw) {
    const { b, i } = fw;
    const S = this._L.S;
    const w = Math.max(84, b.r * 0.95);
    const h = w * 0.5;
    const drop = b.r * 0.95;
    const cont = this.add
      .container(b.x, b.y + b.r * 0.2)
      .setDepth(6)
      .setAlpha(0);
    const g = this.add.graphics();
    g.lineStyle(1, 0xd8c08a, 0.7);
    g.lineBetween(0, 0, 0, drop - h / 2);
    g.fillStyle(0x000000, 0.45).fillRoundedRect(
      -w / 2 + 2,
      drop - h / 2 + 3,
      w,
      h,
      h * 0.18,
    );
    g.fillStyle(0x1a1420, 0.92).fillRoundedRect(
      -w / 2,
      drop - h / 2,
      w,
      h,
      h * 0.18,
    );
    g.lineStyle(Math.max(1.5, S * 0.003), 0xc8a050, 1).strokeRoundedRect(
      -w / 2,
      drop - h / 2,
      w,
      h,
      h * 0.18,
    );
    g.lineStyle(1, 0xc8a050, 0.45).strokeRoundedRect(
      -w / 2 + 3,
      drop - h / 2 + 3,
      w - 6,
      h - 6,
      h * 0.14,
    );
    cont.add(g);
    const fs = Math.round(h * 0.34);
    cont.add(
      this.add
        .text(0, drop - h * 0.2, String(i + 1), {
          fontFamily: FW_FONT,
          fontSize: Math.round(fs * 0.95) + "px",
          color: "#e8d4a0",
        })
        .setOrigin(0.5),
    );
    cont.add(
      this.add
        .text(0, drop + h * 0.18, FW_CODES[i], {
          fontFamily: FW_FONT,
          fontSize: fs + "px",
          color: "#f6ecd8",
        })
        .setOrigin(0.5),
    );
    this._tags.push(cont);
    this.tweens.add({ targets: cont, alpha: 1, duration: 280 });
    this.tweens.add({
      targets: cont,
      angle: { from: -3, to: 3 },
      duration: 1400,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
    });
    this.time.delayedCall(FW_TAG, () => {
      if (!cont.active) return;
      this.tweens.add({
        targets: cont,
        alpha: 0,
        duration: 420,
        onComplete: () => {
          this._tags = this._tags.filter((t) => t !== cont);
          cont.destroy();
        },
      });
    });
  }

  _drawShow(dt) {
    const g = this._sparks;
    g.clear();
    const s = dt / 1000;
    const live = this._show.live;
    for (let n = live.length - 1; n >= 0; n--) {
      const fw = live[n];
      fw.age += dt;
      const { b } = fw;
      if (fw.age < FW_RISE) {
        // the rocket climbing, a short trail of sparks behind it
        const k = fw.age / FW_RISE;
        const e = 1 - (1 - k) * (1 - k);
        const x = fw.from.x + (b.x - fw.from.x) * e;
        const y = fw.from.y + (b.y - fw.from.y) * e;
        for (let j = 0; j < 8; j++) {
          const kk = Math.max(0, e - j * 0.025);
          const tx = fw.from.x + (b.x - fw.from.x) * kk;
          const ty = fw.from.y + (b.y - fw.from.y) * kk;
          g.fillStyle(0xffd9a0, 0.8 * (1 - j / 8)).fillCircle(
            tx,
            ty,
            Math.max(0.8, 2 - j * 0.2),
          );
        }
        g.fillStyle(0xffffff, 1).fillCircle(x, y, 2.2);
        continue;
      }
      if (!fw.sparks) this._burst(fw);
      const t = fw.age - FW_RISE;
      if (t > FW_LIFE) {
        live.splice(n, 1);
        continue;
      }
      const life = 1 - t / FW_LIFE;
      const drag = Math.exp(-1.7 * s);
      const grav = b.r * 0.38;
      for (const p of fw.sparks) {
        p.vx *= drag;
        p.vy = p.vy * drag + grav * s;
        p.x += p.vx * s;
        p.y += p.vy * s;
        // each spark leaves a trail behind it that fades toward its tail
        (p.trail || (p.trail = [{ x: b.x, y: b.y }])).push({ x: p.x, y: p.y });
        if (p.trail.length > 9) p.trail.shift();
        let a = Math.pow(life, 1.2);
        if (life < 0.35)
          a *= 0.45 + 0.55 * Math.abs(Math.sin((t + p.tw * 1000) * 0.03));
        const col = t < 140 ? 0xffffff : p.inner ? 0xffe6f2 : fw.col;
        const tr = p.trail;
        const n = tr.length;
        // a soft glow along the newest stretch of it
        g.lineStyle(p.inner ? 3 : 5, col, a * 0.18);
        g.lineBetween(
          tr[Math.max(0, n - 4)].x,
          tr[Math.max(0, n - 4)].y,
          p.x,
          p.y,
        );
        for (let k = 1; k < n; k++) {
          const f = k / (n - 1);
          g.lineStyle(p.inner ? 1.1 : 1.7, col, a * f * (p.inner ? 0.7 : 1));
          g.lineBetween(tr[k - 1].x, tr[k - 1].y, tr[k].x, tr[k].y);
        }
        if (!p.inner) g.fillStyle(0xffffff, a * 0.85).fillCircle(p.x, p.y, 1.2);
      }
      // the bright heart of it, in the first moment
      if (t < 300)
        g.fillStyle(0xffffff, 1 - t / 300).fillCircle(
          b.x,
          b.y,
          b.r * 0.12 * (1 - t / 300),
        );
    }
  }

  // the tower sparkling, as it does on the hour at night
  _sparkleTower(dt) {
    const pts = this._art.towerPts;
    for (const gl of this._glints) {
      if (gl.life <= 0) {
        if (Math.random() < 0.06) {
          const p = pts[Math.floor(Math.random() * pts.length)];
          const size = this._L.S * (0.012 + Math.random() * 0.016);
          gl.img.setPosition(p.x, p.y).setDisplaySize(size, size);
          gl.life = 220 + Math.random() * 260;
          gl.max = gl.life;
        } else {
          gl.img.setAlpha(0);
          continue;
        }
      }
      gl.life -= dt;
      gl.img.setAlpha(Math.max(0, Math.sin((gl.life / gl.max) * Math.PI)));
    }
  }

  // ── sounds ─────────────────────────────────────────────────────────────────

  _ac() {
    const ac = this.sound && this.sound.context;
    const st =
      this.services && this.services.audio && this.services.audio.state;
    if (!ac || (st && st.muted)) return null;
    return { ac, vol: st ? st.sfxVol : 0.8 };
  }

  // a firework far off: a soft low thump, a crackle after it
  _boom() {
    const a = this._ac();
    if (!a) return;
    try {
      const { ac, vol } = a;
      const t = ac.currentTime;
      const dur = 1.2;
      const buf = ac.createBuffer(
        1,
        Math.floor(ac.sampleRate * dur),
        ac.sampleRate,
      );
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const k = i / d.length;
        const thump = Math.exp(-k * 18);
        const crackle = k > 0.15 && Math.random() < 0.004 ? 0.8 : 0;
        d[i] = (Math.random() * 2 - 1) * (thump + crackle * Math.exp(-k * 3));
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      const g = ac.createGain();
      g.gain.value = vol * 0.35;
      src.connect(lp);
      lp.connect(g);
      g.connect(this.sound.destination);
      src.start(t + 0.15);
    } catch (e) {}
  }

  // the clock's chime
  _chime() {
    const a = this._ac();
    if (!a) return;
    try {
      const { ac, vol } = a;
      const t = ac.currentTime;
      for (const [f, g0] of [
        [880, 0.2],
        [1320, 0.08],
        [1760, 0.05],
      ]) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(g0 * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 2.2);
        o.connect(g);
        g.connect(this.sound.destination);
        o.start(t);
        o.stop(t + 2.3);
      }
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseParisArt(this.textures);
    this._tags = [];
    this._glints = [];
    this._show = null;
    this._hand = null;
    this._L = null;
  }

  shutdown() {
    this._onResize = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseParisArt(this.textures);
  }
}
