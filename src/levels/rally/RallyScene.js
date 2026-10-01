import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { paintStage, releaseStageArt, groundLight, CAR_LANES } from "./stage.js";
import { paintCarsSteps, releaseCarArt, relativeYaw, frameAt, FRAME_COUNT } from "./cars.js";
import { paintPeople, releasePeopleArt, FLAG_FRAMES } from "./people.js";
import { drawPodium, releasePodiumArt, RY_WINNERS } from "./podium.js";
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
// The finish of a night stage: a floodlit gravel oval cut into a pine forest,
// the timing hut and the red flying-finish board across the line, a marshal
// in orange with the chequered flag, spectators behind the tape. Six rally
// cars come round the bend and through the line in a fixed order, each with
// its race number on the door:
//
//   19  9  12  22  5  18   →   S I L V E R
//
// Nothing on screen says "alphabet". The numbers are the only text in the
// scene. The cars come in bunches, like a real stage — one alone, two close,
// two in line, the last two tight — each with a whoosh as it crosses the line
// (assets/sounds/Rally/wroom.mp3 — optional; the level stays silent and fully
// solvable without it). When the last car is through, the floodlights go out,
// the marshal lowers his flag, and the top three of the stage come up on a
// board with their cups. That is the end: the race runs once (the game's
// restart button brings it back).
//
// The stage is painted once per screen size (stage.js), the people with it
// (people.js); the cars are real 3D models rendered at every angle the drive
// needs (cars.js) and placed by the track's one projection (track.js) — so a
// car is seen from the front coming round the bend, side-on at the line, from
// behind as it goes, and is never tilted or squashed by hand.
// ─────────────────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;
const MOONLIT = [86, 96, 122]; // what the floodlit things fall to at the end

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

  update(time, delta) {
    // the cars are rendered a slice per frame while the stage waits
    if (this._carJob) this._pumpCars(12);
    this._updateStones(Math.min(delta || 16, 50));
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._lights = []; // everything that goes dark when the stage ends
    this._dim = []; // floodlit things that fall to moonlight
    this._cars = [];
    this._crowd = [];
    this._stones = [];
    this._puffs = new Set();
    this._lamp = 1; // how much of the floodlight is still on
    this._carArt = null;

    const art = (this._art = paintStage(this, W, H));
    const L = (this._L = art.L);
    const K = art.keys;
    this._finishX = L.finishX;
    this._carLen = L.carLenPx;

    // (the smooth layers are painted small; they are stretched to the screen)
    this.add.image(0, 0, K.sky).setOrigin(0, 0).setDisplaySize(W, H).setDepth(-30);
    this.add.image(art.moon.x, art.moon.y, K.moon).setDepth(-29.8);
    this._light(this.add.image(0, 0, K.dome).setOrigin(0, 0).setDisplaySize(W, H).setDepth(-29.5).setBlendMode("ADD"));
    this._makeStars(art);
    this.add.image(0, art.landY, K.land).setOrigin(0, 0).setDepth(-20);
    this._light(this.add.image(0, art.landLitY, K.landLit).setOrigin(0, 0).setDepth(-19).setBlendMode("ADD"));
    this._dim.push(this.add.image(0, 0, K.props).setOrigin(0, 0).setDepth(-15));
    for (const g of art.glares) {
      this._light(
        this.add.image(g.x, g.y, K.glow).setDepth(-14).setBlendMode("ADD").setDisplaySize(g.size, g.size * 0.8),
      );
    }
    // the hut's window and the bulbs over the tent stay lit after the stage
    const win = art.window;
    this.add
      .image(win.x, win.y, K.glow)
      .setDepth(-14)
      .setBlendMode("ADD")
      .setDisplaySize(win.w * 3.2, win.h * 3.6)
      .setAlpha(0.45);
    for (const b of art.festoon) {
      const s = Math.max(5, L.px(L.tent.z) * L.m * 0.9);
      this.add.image(b.x, b.y, K.glow).setDepth(-14).setBlendMode("ADD").setDisplaySize(s, s).setAlpha(0.7);
    }
    this._makePeople();
    this._dim.push(this.add.image(0, art.frontY, K.front).setOrigin(0, 0).setDepth(5));
    this._light(this.add.image(0, 0, K.haze).setOrigin(0, 0).setDisplaySize(W, H).setDepth(8).setBlendMode("ADD"));
    this.add.image(0, 0, K.veil).setOrigin(0, 0).setDisplaySize(W, H).setDepth(18);
    this._drawTexts(W, H);

    if (this._finished) {
      // rebuilt after the race (a resize): straight to the dark stage and the podium
      this._showFinal();
      return;
    }
    // the cars are modelled for exactly this camera: how far down it looks
    // at them, and how big they are at the line
    const pitch = Math.atan2(L.camH - 0.7 * L.m, L.wzFinish) / DEG;
    this._carJob = paintCarsSteps(this.textures, {
      numbers: RY_NUMBERS,
      carLenPx: L.carLenPx,
      pitchDeg: pitch,
      res: Math.min(2, 280 / L.carLenPx),
    });
    // a beat of quiet before the first car
    this.time.delayedCall(RALLY_START_DELAY_MS, () => this._runRace());
  }

  _light(obj) {
    this._lights.push(obj);
    return obj;
  }

  // the stars that still show through the glow, twinkling
  _makeStars(art) {
    const { W, H, moon } = art.L;
    const rnd = this._rng(8123);
    const k = Math.max(0.8, Math.min(1.4, Math.min(W, H) / 800));
    for (let i = 0; i < 34; i++) {
      const x = W * (0.02 + rnd() * 0.96);
      const y = H * (0.01 + Math.pow(rnd(), 1.3) * 0.32);
      if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 5) continue;
      const fade = 1 - Math.max(0, (y - H * 0.18) / (H * 0.16));
      const size = (3 + rnd() * 4) * k;
      const star = this.add
        .image(x, y, art.keys.star)
        .setDepth(-29)
        .setBlendMode("ADD")
        .setDisplaySize(size, size)
        .setAlpha(0.15 * fade);
      this.ambientTween({
        targets: star,
        alpha: (0.45 + rnd() * 0.45) * fade,
        duration: 1300 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ── the people ─────────────────────────────────────────────────────────────

  _makePeople() {
    const L = this._L;
    const P = (this._people = paintPeople(this.textures, L, (x, z) => groundLight(L, x, z)));
    const rnd = this._rng(4545);
    for (const c of P.crowd) {
      const img = this.add
        .image(c.x, c.y, P.key, c.frame)
        .setOrigin(c.ox, c.oy)
        .setScale(1 / P.res)
        .setDepth(-12 - c.z * 0.01);
      this._dim.push(img);
      const person = { img, x: c.x, y: c.y, frame: c.frame, cheerFrame: c.cheerFrame, h: img.displayHeight * 0.62 };
      // shifting from foot to foot, no two alike
      img.setAngle((rnd() - 0.5) * 1.6);
      this.ambientTween({
        targets: img,
        angle: (rnd() - 0.5) * 1.6 + (rnd() < 0.5 ? 1.4 : -1.4),
        duration: 1600 + rnd() * 2200,
        delay: rnd() * 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this._crowd.push(person);
    }

    // the marshal, and his flag arm pivoting at the shoulder
    const M = P.marshal;
    const body = this.add
      .image(M.x, M.y, P.key, M.frame)
      .setOrigin(M.ox, M.oy)
      .setScale(1 / P.res)
      .setDepth(-11.9);
    const arm = this.add
      .image(M.shoulder.x, M.shoulder.y, P.key, M.arms[0].frame)
      .setOrigin(M.arms[0].ox, M.arms[0].oy)
      .setScale(1 / P.res)
      .setDepth(-11.89);
    this._dim.push(body, arm);
    this._flag = arm;
    this._flagUp = true;
    this._flagFast = false;
    this._flagFrame = 0;
    let tick = 0;
    this._flagTimer = this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        if (!this._flagUp || !this.ambientMotion) return;
        tick++;
        if (!this._flagFast && tick % 3) return;
        this._flagFrame = (this._flagFrame + 1) % FLAG_FRAMES;
        this._flag.setFrame(M.arms[this._flagFrame].frame, false, false);
      },
    });
    this._flagSway();
  }

  // the crowd jumps and throws its arms up as a car crosses, rippling out
  // from the line
  _cheer() {
    if (!this.ambientMotion) return;
    const fx = this._finishX;
    const rnd = this._rng(Math.round(this.time.now) + 5);
    for (const p of this._crowd) {
      const d = Math.abs(p.x - fx);
      if (d > this._W * 0.45) continue;
      const delay = d * 0.3 + rnd() * 110;
      const jumps = rnd() < 0.4 ? 1 : 0;
      this.time.delayedCall(delay, () => p.img.setFrame(p.cheerFrame, false, false));
      this.tweens.add({
        targets: p.img,
        y: p.y - p.h * (0.05 + rnd() * 0.05),
        duration: 170,
        delay,
        yoyo: true,
        repeat: jumps,
        ease: "Quad.easeOut",
        onComplete: () => {
          p.img.y = p.y;
          this.time.delayedCall(250 + rnd() * 500, () => p.img.setFrame(p.frame, false, false));
        },
      });
    }
  }

  // a slow sway while the flag is up
  _flagSway() {
    if (!this._flag) return;
    this._flag.setAngle(-6);
    this.ambientTween({
      targets: this._flag,
      angle: 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  _waveFlag() {
    if (!this.ambientMotion) return;
    if (!this._flag || !this._flagUp) return;
    this._flagFast = true;
    this.tweens.add({
      targets: this._flag,
      angle: { from: -24, to: 28 },
      duration: 210,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this._flagFast = false;
      },
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

  // ── the end of the stage ───────────────────────────────────────────────────

  // the last car is through: the floodlights go out, the flag drops
  _lightsOut() {
    // from here on the stage stays dark: a resize rebuilds it as it is now
    this._finished = true;
    for (const layer of this._lights) {
      this.tweens.add({ targets: layer, alpha: 0, duration: 650, ease: "Quad.easeIn" });
    }
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 650,
      ease: "Quad.easeIn",
      onUpdate: (tw) => this._moonlight(tw.getValue()),
    });
    this._lowerFlag();
  }

  // everything the floodlights lit, left under the moon
  _moonlight(t) {
    this._lamp = 1 - t;
    const c = MOONLIT.map((v) => Math.round(255 + (v - 255) * t));
    const tint = (c[0] << 16) | (c[1] << 8) | c[2];
    for (const obj of this._dim) if (obj.active) obj.setTint(tint);
    for (const puff of this._puffs) puff.setTint(this._dustTint(puff._lit));
  }

  // how a car, or dust, looks where the floodlight falls with strength
  // `lit` (1 at the line) — fading to the moon's blue as the lamps go out
  _lightTint(lit, floor = 0.42) {
    const on = Math.min(1, floor + (1 - floor) * lit) * this._lamp;
    const off = 1 - this._lamp;
    const r = Math.round(255 * Math.min(1, on + (off * MOONLIT[0]) / 255));
    const g = Math.round(255 * Math.min(1, on + (off * MOONLIT[1]) / 255));
    const b = Math.round(255 * Math.min(1, on + (off * MOONLIT[2]) / 255));
    return (r << 16) | (g << 8) | b;
  }

  _dustTint(lit) {
    const c = this._lightTint(lit, 0.25);
    // a warm cast: the gravel's own colour in the dust
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    return (r << 16) | (Math.round(g * 0.95) << 8) | Math.round(b * 0.86);
  }

  // rebuilt after the race is over: dark stage, flag down, podium up
  _showFinal() {
    for (const layer of this._lights) layer.setAlpha(0);
    this._moonlight(1);
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

  // run the rendering job for up to `ms`; when it finishes, make the cars
  _pumpCars(ms) {
    const t0 = performance.now();
    let step;
    do step = this._carJob.next();
    while (!step.done && performance.now() - t0 < ms);
    if (!step.done) return;
    this._carJob = null;
    this._makeCars(step.value);
  }

  _makeCars(art) {
    this._carArt = art;
    const glowKey = this._art.keys.glow;
    this._cars = art.keys.map((key, i) => {
      const view = () =>
        this.add
          .image(-9999, 0, key, "0")
          .setOrigin(art.origin.x, art.origin.y)
          .setVisible(false);
      const lamps = art.frames[0].lamps.map((l) =>
        this.add
          .image(-9999, 0, l.kind === "tail" ? glowKey : art.glare)
          .setBlendMode("ADD")
          .setTint(l.kind === "tail" ? 0xff3322 : 0xffffff)
          .setVisible(false),
      );
      // the pool its lamps throw on the gravel ahead
      const pool = this.add.image(-9999, 0, glowKey).setBlendMode("ADD").setVisible(false);
      return { i, a: view(), b: view(), lamps, pool, lane: CAR_LANES[i] };
    });
  }

  // a car u of the way along the drive: where it is, which way it is seen
  // from, how much light is on it, and its lamps
  _placeCar(car, u) {
    const L = this._L;
    const art = this._carArt;
    const at = L.carAt(u, car.lane);
    const { i, t } = frameAt(relativeYaw(at.wx, at.wz, at.heading));
    const s = at.scale / art.res;
    // nearer cars draw over the ones still further away
    const depth = 0.5 - 0.05 / at.scale;
    const tint = this._lightTint(groundLight(L, at.wx, at.wz));
    car.a.setFrame(String(i)).setPosition(at.x, at.y).setScale(s).setDepth(depth).setTint(tint).setVisible(true);
    if (t > 0.02 && i < FRAME_COUNT - 1) {
      car.b.setFrame(String(i + 1)).setPosition(at.x, at.y).setScale(s).setDepth(depth + 1e-4).setTint(tint);
      car.b.setAlpha(t).setVisible(true);
    } else car.b.setVisible(false);

    const fa = art.frames[i].lamps;
    const fb = art.frames[Math.min(FRAME_COUNT - 1, i + 1)].lamps;
    const len = this._carLen * at.scale;
    car.lamps.forEach((img, j) => {
      const la = fa[j];
      const lb = fb[j];
      const facing = la.facing + (lb.facing - la.facing) * t;
      if (facing < 0.03) {
        img.setVisible(false);
        return;
      }
      const x = at.x + (la.x + (lb.x - la.x) * t) * s;
      const y = at.y + (la.y + (lb.y - la.y) * t) * s;
      let size;
      let alpha;
      if (la.kind === "pod") {
        size = len * (0.28 + 0.6 * facing * facing);
        alpha = Math.min(1, 1.2 * Math.pow(facing, 1.3));
      } else if (la.kind === "head") {
        size = len * (0.2 + 0.4 * facing * facing);
        alpha = Math.min(1, 0.9 * Math.pow(facing, 1.3));
      } else {
        size = len * 0.22;
        alpha = Math.min(0.9, facing);
      }
      img.setPosition(x, y).setDisplaySize(size, size).setAlpha(alpha).setDepth(depth + 2e-4).setVisible(true);
    });

    // the headlamps on the gravel: a long pool some metres ahead, flattened
    // by the angle we see the ground at
    const ch = Math.cos(at.heading);
    const sh = Math.sin(at.heading);
    const ahead = 8 * L.m;
    const pw = at.wx + ch * ahead;
    const pz = at.wz + sh * ahead;
    const pp = L.P(pw, 0, pz);
    const k = L.px(pz) * L.m;
    const along = 11;
    const across = 4.5;
    car.pool
      .setPosition(pp.x, pp.y)
      .setDisplaySize(k * (Math.abs(ch) * along + Math.abs(sh) * across), k * (L.camH / pz) * (Math.abs(sh) * along + Math.abs(ch) * across))
      .setDepth(0.5 - 0.05 / L.track.scaleAtY(pp.y) - 2e-3)
      .setAlpha(0.3)
      .setVisible(true);
    return at;
  }

  // ms from the start of the recording to its loudest moment. That is when the
  // car passes you, so that is the moment that has to land on the line. Measured
  // from the file itself, so a replacement wroom.mp3 stays in sync too.
  _soundLead() {
    if (this._lead !== undefined) return this._lead;
    let lead = RALLY_SOUND_LEAD_MS;
    try {
      const buf = this.cache.audio.exists("wroom") && this.cache.audio.get("wroom");
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
    // the cars must be ready before the first one leaves
    if (this._carJob) this._pumpCars(Infinity);
    if (!this._carArt) return;
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
    const Lc = this._carLen;
    const x0 = -Lc * 0.7;
    const x1 = W + Lc * 0.7;
    let crossed = false;
    let lastDust = x0;

    // The tween still runs a plain number dead straight in time, so every
    // crossing lands exactly when planRallyRound says it does. That number is
    // only a parameter: where it puts the car on screen is the oval's business,
    // which way it is seen from follows from where it is and where it heads,
    // and how big it is drawn from how far below the horizon it stands.
    const drive = { p: x0 };
    const ride = () => this._placeCar(car, (drive.p - x0) / (x1 - x0));
    ride();
    this.tweens.add({
      targets: drive,
      p: x1,
      duration: (x1 - x0) / speed,
      ease: "Linear",
      onUpdate: () => {
        const at = ride();
        if (!crossed && drive.p >= this._finishX) {
          crossed = true;
          this._cheer();
          this._waveFlag();
        }
        if (drive.p - lastDust >= Lc * 0.22) {
          lastDust = drive.p;
          this._dust(at);
        }
      },
      onComplete: () => {
        car.a.setVisible(false);
        car.b.setVisible(false);
        car.pool.setVisible(false);
        for (const l of car.lamps) l.setVisible(false);
      },
    });
  }

  // gravel dust off the rear wheels, left hanging in the light where it was
  // thrown, billowing and settling; and now and then a stone
  _dust(at) {
    if (!this.ambientMotion) return;
    const L = this._L;
    const ch = Math.cos(at.heading);
    const sh = Math.sin(at.heading);
    const back = -1.55 * L.m;
    for (const side of [-1, 1]) {
      const lat = side * 0.77 * L.m;
      const wx = at.wx + ch * back - sh * lat;
      const wz = at.wz + sh * back + ch * lat;
      const p = L.P(wx, 0, wz);
      const mpx = L.px(wz) * L.m; // pixels per metre there
      const scale = L.track.scaleAtY(p.y);
      const lit = groundLight(L, wx, wz);
      const size = mpx * (0.7 + Math.random() * 0.5);
      // the wheel on our side throws the dust we see; the far one's is
      // mostly behind the car
      const peak = side < 0 ? 0.34 : 0.22;
      const puff = this.add
        .image(p.x, p.y - mpx * 0.2, this._art.keys.dust)
        .setDepth(0.5 - 0.05 / scale - 1e-3)
        .setDisplaySize(size, size * 0.75)
        .setRotation(Math.random() * Math.PI * 2)
        .setAlpha(0);
      puff._lit = lit;
      puff.setTint(this._dustTint(lit));
      this._puffs.add(puff);
      this.tweens.add({
        targets: puff,
        x: p.x - ch * mpx * (0.6 + Math.random()) + mpx * (0.3 + Math.random() * 0.6),
        y: p.y - mpx * (0.7 + Math.random() * 1.1),
        displayWidth: size * (3.4 + Math.random() * 1.4),
        displayHeight: size * (2.2 + Math.random()),
        rotation: puff.rotation + (Math.random() - 0.5),
        duration: 1700 + Math.random() * 1300,
        ease: "Sine.easeOut",
        onUpdate: (tw) => {
          const q = tw.progress;
          puff.setAlpha(peak * (q < 0.08 ? q / 0.08 : Math.pow(1 - (q - 0.08) / 0.92, 1.3)));
        },
        onComplete: () => {
          this._puffs.delete(puff);
          puff.destroy();
        },
      });
      if (side < 0 && Math.random() < 0.7) this._stone(p.x, p.y, mpx, ch, scale);
    }
  }

  // a stone flicked up by a tyre, falling back onto the gravel
  _stone(x, y, mpx, ch, scale) {
    const r = Math.max(1, mpx * 0.07);
    const obj = this.add
      .rectangle(x, y - r, r, r, 0x2b2621)
      .setDepth(0.5 - 0.05 / scale + 1e-3);
    this._stones.push({
      obj,
      x,
      y: y - r,
      ground: y,
      vx: (-ch * (2 + Math.random() * 3) + (Math.random() - 0.5)) * mpx,
      vy: -(2.5 + Math.random() * 3) * mpx,
      g: 9.8 * mpx,
    });
  }

  _updateStones(dtMs) {
    if (!this._stones.length) return;
    const dt = dtMs / 1000;
    for (let i = this._stones.length - 1; i >= 0; i--) {
      const s = this._stones[i];
      s.vy += s.g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y >= s.ground || !s.obj.active) {
        s.obj.destroy();
        this._stones.splice(i, 1);
        continue;
      }
      s.obj.setPosition(s.x, s.y);
    }
  }

  // the car crossing the line — assets/sounds/Rally/wroom.mp3; silent if absent
  _whoosh() {
    this.services.audio.playSfx("wroom", 1, this);
  }

  _drawTexts(W, H) {
    this.levelText = drawLevelLabel(this, W, H);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _releaseArt() {
    releaseStageArt(this.textures);
    releaseCarArt(this.textures);
    releasePeopleArt(this.textures);
    releasePodiumArt(this.textures);
  }

  // a resize: everything is painted again from scratch
  _teardown() {
    this._round = (this._round || 0) + 1; // orphan any pending round callbacks
    this._carJob = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._releaseArt();
    this._cars = [];
    this._crowd = [];
    this._stones = [];
    this._puffs = new Set();
    this._lights = [];
    this._dim = [];
    this._flag = null;
    this._podium = null;
  }

  shutdown() {
    this._round = (this._round || 0) + 1;
    this._carJob = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._releaseArt();
    this._cars = [];
    this._crowd = [];
    this._stones = [];
    this._puffs = new Set();
  }
}
