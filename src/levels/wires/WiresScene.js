import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { paintMeadow, releaseMeadowArt, ROCK_R } from "./meadow.js";
import { makeSparkleTexture, twinkle, flicker } from "../../shared/glints.js";

const SPARKLE = "wi_sparkle";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "WIRES"  ·  code: FACADE  ·  the morning choir
//
// The minute before sunrise on a country hill. A pole stands on the crest
// with five wires running out of it, dark against a sky going from the last
// deep blue to gold; six small birds sit on them. On the porch of the farm
// below, an old man rocks in his chair playing the harmonica, the lantern
// still burning from the night.
//
// Each bird sits on one wire. Read bottom to top, the wires are D F A C E;
// the birds, left to right, spell F A C A D E. The harmonica (optional
// recording: assets/sounds/Wires/music.mp3) is atmosphere — nothing has to
// be heard or played. Nothing on screen explains the wires either.
//
// The meadow is painted once per screen size (meadow.js). What lives here is
// what moves: the birds breathing and turning their heads, the rocking chair,
// the notes, the chimney smoke, the lantern, the last stars.
// ─────────────────────────────────────────────────────────────────────────────

// left to right — every bird sits ON a wire (0 = the bottom wire)
const WI_BIRDS = [
  { note: "F", pos: 1 },
  { note: "A", pos: 2 },
  { note: "C", pos: 3 },
  { note: "A", pos: 2 },
  { note: "D", pos: 0 },
  { note: "E", pos: 4 },
];
// where along the wires they sit, well clear of the pole where the wires
// close up, so each bird's wire can be told from its neighbours
const BIRD_XS = [0.12, 0.23, 0.34, 0.68, 0.79, 0.9];

const DEG = Math.PI / 180;

export default class WiresScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Wires" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("wires_music", "assets/sounds/Wires/music.mp3");
  }

  create() {
    this.beginScene();
    this.input.mouse.disableContextMenu();

    this._built = false;
    this._birds = [];
    this._notes = [];
    this._rock = null;

    this._music = null;
    this._startMusic();

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // everything that moves continuously is driven from here, not from tweens
  update(time, delta) {
    if (!this._built || !this.ambientMotion) return;
    const dt = Math.min(delta || 16, 100); // no leaps after an inactive tab
    this._updateChair(time);
    this._updateNotes(dt);
    this._updateBirds(time, dt);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._notes = [];
    this._noteTimer = 500;

    const art = (this._art = paintMeadow(this, W, H));
    makeSparkleTexture(this.textures, SPARKLE, "232,238,255");
    this.add.image(0, 0, art.sky).setOrigin(0, 0).setDepth(-20);
    this._makeStars(art);
    this.add.image(0, 0, art.land).setOrigin(0, 0).setDepth(-10);
    this._makeSmoke(art);
    this._makeBirds(art);
    this._makeChair(art);
    this._makeLantern(art);
    this._makeFireflies(art);
    this.add.image(0, 0, art.veil).setOrigin(0, 0).setDepth(18);
    this._drawTexts(W, H);

    this._built = true;
  }

  // the last stars, thick in the deep blue overhead and going out toward
  // the dawn; the brightest of them glint
  _makeStars(art) {
    const { W, H, k, moon } = art.L;
    const rnd = this._rng(8123);
    const glints = [];
    for (let i = 0; i < 70; i++) {
      const x = W * (0.03 + rnd() * 0.94);
      const y = H * (0.012 + rnd() * rnd() * 0.3);
      const fade = Math.max(0, 1 - y / (H * 0.34));
      const size = (3 + rnd() * 4) * k;
      if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 4) continue;
      const star = this.add
        .image(x, y, art.star)
        .setDepth(-19)
        .setBlendMode("ADD")
        .setDisplaySize(size, size)
        .setAlpha(0.12 * fade);
      this.ambientTween({
        targets: star,
        alpha: (0.45 + rnd() * 0.4) * fade,
        duration: 1400 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      if (fade > 0.6 && rnd() < 0.2)
        glints.push({ x, y, size: (14 + rnd() * 12) * k });
    }
    twinkle(this, SPARKLE, glints, rnd, {
      depth: -19,
      alpha: 0.85,
      period: [1800, 3600],
    });
  }

  // fireflies out over the meadow and along the fence, each wandering a
  // little and lighting up now and then
  _makeFireflies(art) {
    const { W, H, hillY, k } = art.L;
    const rnd = this._rng(6161);
    for (let i = 0; i < 16; i++) {
      // the right-hand half of the hill and the grass in front of it — never
      // up among the wires, never over the house
      const x = W * (0.42 + rnd() * 0.55);
      const yTop = hillY(x) + H * 0.02;
      const y = yTop + rnd() * (H * 0.96 - yTop);
      const size = (12 + rnd() * 10) * k;
      const fly = this.add
        .image(x, y, art.glow)
        .setDepth(-4)
        .setBlendMode("ADD")
        .setDisplaySize(size, size)
        .setAlpha(0);
      this.ambientObject(fly);
      this.ambientTween({
        targets: fly,
        x: x + (rnd() - 0.5) * 60 * k,
        y: y - (10 + rnd() * 30) * k,
        duration: 5000 + rnd() * 5000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.ambientTween({
        targets: fly,
        alpha: 0.7 + rnd() * 0.3,
        duration: 500 + rnd() * 700,
        delay: rnd() * 6000,
        hold: 200 + rnd() * 500,
        yoyo: true,
        repeat: -1,
        repeatDelay: 2500 + rnd() * 5000,
        ease: "Sine.easeInOut",
      });
    }
  }

  // someone has lit the stove: thin smoke off the chimney, drifting east
  _makeSmoke(art) {
    const { x, y, k } = art.L.chimney;
    const rnd = this._rng(4411);
    for (let i = 0; i < 6; i++) {
      const size = 14 * k * (1 + rnd() * 0.5);
      const dur = 5200 + rnd() * 2600;
      const puff = this.add
        .image(x, y, art.puff)
        .setDepth(-9)
        .setAlpha(0)
        .setDisplaySize(size, size);
      this.ambientObject(puff);
      this.ambientTween({
        targets: puff,
        y: y - (90 + rnd() * 30) * k,
        x: x + (40 + rnd() * 50) * k,
        displayWidth: size * 3.2,
        displayHeight: size * 3.2,
        duration: dur,
        delay: (i * dur) / 6,
        repeat: -1,
        onUpdate: (tw) => puff.setAlpha(Math.sin(Math.PI * tw.progress) * 0.35),
      });
    }
  }

  // each bird stands with its feet on its wire; the body and the head are
  // separate so it can breathe and turn its head
  _makeBirds(art) {
    this._birds = [];
    const { W, wireY, birdScale: bs } = art.L;
    const rnd = this._rng(3663);
    WI_BIRDS.forEach((b, i) => {
      const x = W * BIRD_XS[i] + (rnd() - 0.5) * 20;
      const y = wireY(b.pos, x);
      const d = rnd() < 0.45 ? -1 : 1;
      const tex = art.birds[d];
      const cont = this.add.container(x, y).setDepth(-5);
      cont.setAngle((rnd() - 0.5) * 6);
      const rig = this.add.container(0, 0);
      const body = this.add
        .image(0, 0, tex.body.key)
        .setOrigin(tex.body.ox, tex.body.oy)
        .setScale(1 / tex.res);
      const head = this.add
        .image(4 * d * bs, -14 * bs, tex.head.key)
        .setOrigin(tex.head.ox, tex.head.oy)
        .setScale(1 / tex.res);
      rig.add([body, head]);
      cont.add(rig);
      cont._rig = rig;
      cont._head = head;
      cont._d = d;
      cont._note = b.note;
      cont._pos = b.pos;
      cont._nextHead = null; // set on the first update
      cont._nextFluff = null;
      cont._fluffAt = 0;
      cont._headA = 0;
      cont._headT = 0;
      cont._breathP = 900 + rnd() * 500; // small birds breathe fast
      cont._breathPh = rnd() * Math.PI * 2;
      this._birds.push(cont);
    });
  }

  // They breathe, jerk their heads round in short snaps the way real birds
  // do, and now and then fluff their feathers.
  _updateBirds(time, dt) {
    const snap = Math.min(1, dt * 0.018);
    for (const b of this._birds) {
      if (b._nextHead === null) {
        b._nextHead = time + 500 + Math.random() * 2500;
        b._nextFluff = time + 4000 + Math.random() * 8000;
      }
      if (time >= b._nextFluff) {
        b._fluffAt = time;
        b._nextFluff = time + 6000 + Math.random() * 9000;
      }
      let fluff = 0;
      if (b._fluffAt) {
        const t = (time - b._fluffAt) / 420;
        if (t < 1) fluff = Math.sin(Math.PI * t) * 0.09;
        else b._fluffAt = 0;
      }
      const br = Math.sin((time / b._breathP) * Math.PI * 2 + b._breathPh);
      b._rig.scaleY = 1 + 0.035 * br + fluff;
      b._rig.scaleX = 1 - 0.012 * br + fluff * 0.8;

      if (time >= b._nextHead) {
        b._headT = Math.random() < 0.25 ? 0 : b._d * (-0.35 + Math.random() * 0.6);
        b._nextHead = time + 700 + Math.random() * 3000;
      }
      b._headA += (b._headT - b._headA) * snap;
      b._head.rotation = b._headA;
    }
  }

  _makeChair(art) {
    const c = art.chair;
    const img = this.add
      .image(c.baseX, c.baseY, c.key)
      .setOrigin(c.ox, c.oy)
      .setScale(1 / c.res)
      .setDepth(-3);
    this._rock = {
      g: img,
      baseX: c.baseX,
      baseY: c.baseY,
      scale: c.scale,
      sceneScale: c.sceneScale,
      tip: c.tip,
      amp: 9 * DEG, // how far it rocks
      bias: -2 * DEG, // leaning back a little more than forward
      period: 2600, // ms for one rock and back
    };
  }

  // The chair rolls on its curved rockers: it turns by θ, and the centre of
  // the rockers' arc moves along by R·θ, so a rocker always touches the floor.
  _updateChair(time) {
    const k = this._rock;
    if (!k) return;
    const th = k.bias + k.amp * Math.sin((time / k.period) * Math.PI * 2);
    const cy = 4 - ROCK_R; // the arc's centre, in the chair's own units
    k.g.rotation = th;
    k.g.x = k.baseX + (ROCK_R * th + cy * Math.sin(th)) * k.scale;
    k.g.y = k.baseY + (cy - cy * Math.cos(th)) * k.scale;
  }

  // the lantern on the porch, still burning: a wide, slow breath of light
  // and, close round the flame, the quick flicker of it
  _makeLantern(art) {
    const { x, y, r } = art.L.lantern;
    const glow = this.add
      .image(x, y, art.glow)
      .setDepth(-2)
      .setBlendMode("ADD")
      .setDisplaySize(r * 6, r * 6)
      .setAlpha(0.55);
    this.ambientTween({
      targets: glow,
      alpha: 0.72,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const flame = this.add
      .image(x, y, art.glow)
      .setDepth(-2)
      .setBlendMode("ADD")
      .setDisplaySize(r * 2.2, r * 2.2)
      .setAlpha(0.6);
    if (this.ambientMotion) this._stopFlame = flicker(this, flame, 0.4, 0.8);
  }

  // ── the notes off the harmonica ────────────────────────────────────────────

  _updateNotes(dt) {
    if (this._rock) {
      this._noteTimer -= dt;
      if (this._noteTimer <= 0) {
        this._spawnNote();
        this._noteTimer = 1800 + Math.random() * 1600; // few, and far between
      }
    }

    for (let i = this._notes.length - 1; i >= 0; i--) {
      const n = this._notes[i];
      n.age += dt;
      const p = n.age / n.life;
      if (p >= 1) {
        n.g.destroy();
        this._notes.splice(i, 1);
        continue;
      }
      const sec = n.age / 1000;
      const rise = 1 - Math.pow(1 - p, 1.5); // up quickly, then floating
      const wobble = Math.sin(sec * n.freq + n.phase);
      n.g.x = n.x0 + n.dx * p + wobble * n.sway * Math.min(1, p * 3);
      n.g.y = n.y0 - n.rise * rise;
      n.g.rotation = n.rot0 + (n.rot1 - n.rot0) * p + wobble * 0.1;
      const pop = p < 0.1 ? 0.6 + (p / 0.1) * 0.4 : 1;
      n.g.setScale((n.sc * pop) / n.res);
      const a = p < 0.12 ? p / 0.12 : p > 0.5 ? (1 - p) / 0.5 : 1;
      n.g.setAlpha(a * 0.8);
    }
  }

  _spawnNote() {
    const k = this._rock;
    if (!k || this._notes.length >= 4) return;

    // the right-hand end of the harmonica, turned with the chair
    const c = Math.cos(k.g.rotation);
    const sn = Math.sin(k.g.rotation);
    const wx = k.g.x + (k.tip.x * c - k.tip.y * sn) * k.scale;
    const wy = k.g.y + (k.tip.x * sn + k.tip.y * c) * k.scale;
    const S = k.sceneScale;
    const tex = this._art.notes[Math.random() < 0.65 ? 0 : 1];
    const g = this.add
      .image(wx, wy, tex.key)
      .setOrigin(tex.ox, tex.oy)
      .setDepth(15)
      .setAlpha(0);

    this._notes.push({
      g,
      res: tex.res,
      x0: wx,
      y0: wy,
      sc: S * (0.85 + Math.random() * 0.25),
      dx: (30 + Math.random() * 60) * S,
      rise: (90 + Math.random() * 80) * S,
      sway: (3 + Math.random() * 5) * S,
      freq: 2 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      rot0: (Math.random() - 0.5) * 0.3,
      rot1: (Math.random() - 0.5) * 0.9,
      life: 3000 + Math.random() * 1200,
      age: 0,
    });
  }

  _startMusic() {
    this._music = this.services.audio.playLevelMusic(this, "wires_music", {
      gain: 0.7,
    });
  }

  _drawTexts(W, H) {
    this.levelText = drawLevelLabel(this, W, H);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  // a resize: everything is painted again from scratch
  _teardown() {
    this._built = false;
    this._stopFlame?.();
    this._stopFlame = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseMeadowArt(this.textures);
    if (this.textures.exists(SPARKLE)) this.textures.remove(SPARKLE);
    this._birds = [];
    this._notes = [];
    this._rock = null;
  }

  shutdown() {
    this._built = false;
    this._music = null;
    this._stopFlame?.();
    this._stopFlame = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseMeadowArt(this.textures);
    if (this.textures.exists(SPARKLE)) this.textures.remove(SPARKLE);
    this._birds = [];
    this._notes = [];
    this._rock = null;
  }
}
