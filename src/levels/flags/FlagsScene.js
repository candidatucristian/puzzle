import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import {
  paintTrophies,
  releaseTrophyArt,
  TROPHY_BACKGROUND,
  TROPHY_BACKGROUND_URL,
  TROPHY_MEDAL_FACES,
  TROPHY_MEDAL_FACES_URL,
  TROPHY_BRAZIL_MEDAL,
  TROPHY_BRAZIL_MEDAL_URL,
} from "./trophies.js";
import { FLAG_CODES } from "./flagDesigns.js";
import { makeCanvas, addCanvasTexture, lcg, chime } from "../../shared/paint.js";

// the glass of the window in the picture, as parts of the screen
const GLASS = { x0: 0.846, x1: 0.993, y0: 0.018, y1: 0.748 };
// the microscope standing in front of the glass, in the photo's own pixels
// (1672 × 941): the rain is behind it, never on it
const PHOTO = { w: 1672, h: 941 };
const MICROSCOPE = [
  [1546, 474], [1608, 474], [1614, 556], [1644, 598], [1638, 700], [1660, 786], [1660, 826],
  [1460, 826], [1460, 782], [1496, 766], [1492, 738], [1516, 700], [1484, 672], [1482, 636],
  [1516, 596], [1536, 540],
];
const BEADS = "fl_rain_beads";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "FLAGS"  ·  code: DEBRIEFING   ·  the trophy wall
//
// A botanist's shelves at night, what the Ashcombes won at the International
// Botanical Olympiad: gold cups in laurel, certificates, scrolls, plants in
// clay pots; a window streaming with rain, a microscope against it. From the
// upper shelf's edge hang five medals on broad ribbons, each ribbon its
// country's flag, each medal struck with a plant.
//
// Read left to right. Each flag is a country; each country has its two-letter
// code. Concatenate the codes in that order:
//
//   Germany DE · Brazil BR · Ireland IE · Finland FI · Nigeria NG
//                                                    →  DEBRIEFING
//
// Nothing on screen names a country or a code. The cups and the loose medals
// carry no flag; they are only what was won.
//
// A photoreal cabinet backdrop supports the live, precisely rendered medals;
// on the window, rain as it is on glass: beads held all over it, and now and
// then one grown heavy enough to run — stopping, starting, wandering a
// little — leaving a wet trail that fades; behind the glass, fine rain
// falling slant. A quiet glint now and then on the metal.
//
// The medals hang free: each sways a little on its ribbon from the shelf's
// edge, each in its own time, the disc swinging a touch more than the silk
// and turning slowly on its ring so the light slides across its face. A
// hand passing over one sets it swinging; a click knocks it, and it rings.
// ─────────────────────────────────────────────────────────────────────────────

export default class FlagsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Flags" });
  }

  preload() {
    if (!this.textures.exists(TROPHY_BACKGROUND)) {
      this.load.image(TROPHY_BACKGROUND, TROPHY_BACKGROUND_URL);
    }
    if (!this.textures.exists(TROPHY_MEDAL_FACES)) {
      this.load.image(TROPHY_MEDAL_FACES, TROPHY_MEDAL_FACES_URL);
    }
    if (!this.textures.exists(TROPHY_BRAZIL_MEDAL)) {
      this.load.image(TROPHY_BRAZIL_MEDAL, TROPHY_BRAZIL_MEDAL_URL);
    }
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    // (there is no mouse manager on a touch-only setup)
    if (this.input.mouse) this.input.mouse.disableContextMenu();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    const art = (this._art = paintTrophies(this, W, H, FLAG_CODES));
    const L = (this._L = art.L);
    const K = art.keys;
    this.add.image(0, 0, K.room).setOrigin(0, 0).setDepth(-10);
    this._makeMedals(art.medals);
    // the rain: falling outside, beads held on the glass, runners down it
    const box = (this._glass = { x0: W * GLASS.x0, x1: W * GLASS.x1, y0: H * GLASS.y0, y1: H * GLASS.y1, u: Math.min(W / 1000, H / 600) });
    this._outside = this.add.graphics().setDepth(-9.6);
    addCanvasTexture(this.textures, BEADS, paintBeads(W, H, box));
    const beads = this.add.image(0, 0, BEADS).setOrigin(0, 0).setDepth(-9.5);
    this._rain = this.add.graphics().setDepth(-9);
    // the microscope stands in front of the rain: cut out of all of it
    const scope = (this._scopeShape = this.make.graphics({ x: 0, y: 0, add: false }));
    scope.fillStyle(0xffffff, 1);
    scope.fillPoints(MICROSCOPE.map(([x, y]) => new Phaser.Geom.Point((x / PHOTO.w) * W, (y / PHOTO.h) * H)), true);
    const mask = scope.createGeometryMask();
    mask.setInvertAlpha(true);
    for (const layer of [this._outside, beads, this._rain]) layer.setMask(mask);
    this._fall = makeFall(box);
    this._runners = makeRunners(box);
    this._trails = [];
    this._paintRain(0, 0);
    const firstMedalGlint = L.glints.length - L.medals.length;
    this._glints = L.glints.map((p, i) => ({
      medal: i >= firstMedalGlint ? this._medals[i - firstMedalGlint] : null,
      dx: p.x, dy: p.y,
      img: this.add
        .image(p.x, p.y, K.glint)
        .setDisplaySize(p.s * 0.1, p.s * 0.1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(4),
      ph: i * 2.9,
      sp: 0.35 + (i % 4) * 0.12,
    }));
    this._built = true;
  }

  // ── what moves ─────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._built) return;
    this._paintRain(time, this.ambientMotion ? Math.min(delta || 16, 100) / 1000 : 0);
    this._swingMedals(time, Math.min(delta || 16, 50) / 1000);
    if (!this.ambientMotion) return;
    const t = time / 1000;
    // the light catching the silver, now and then
    for (const g of this._glints) {
      if (g.medal) {
        const md = g.medal, ox = g.dx - md.x, oy = g.dy - (md.y + md.len);
        const c = Math.cos(md.discRot), s = Math.sin(md.discRot);
        g.img.setPosition(md.footX + ox * c - oy * s, md.footY + ox * s + oy * c);
      }
      const a = Math.sin(t * g.sp + g.ph);
      g.img.setAlpha(a > 0.96 ? ((a - 0.96) / 0.04) * 0.38 : 0);
    }
  }

  // ── the medals ─────────────────────────────────────────────────────────────

  // Each medal is its ribbon, turning about the shelf's edge, and its disc
  // hung from the ribbon's foot, with the sheen of the light on its face.
  // The swing is a pendulum's: a knock gives it speed, and it dies away.
  _makeMedals(arts) {
    const place = (p, depth, add = false) => {
      const img = this.add.image(p.px, p.py, p.key).setDepth(depth);
      img.setOrigin((p.px - p.x0) / img.width, (p.py - p.y0) / img.height);
      if (add) img.setBlendMode(Phaser.BlendModes.ADD);
      return img;
    };
    this._medals = arts.map((a, i) => {
      const md = {
        ...a,
        ribbonImg: place(a.ribbon, 2 + i * 0.01),
        discImg: place(a.disc, 2.005 + i * 0.01),
        sheenImg: place(a.sheen, 2.006 + i * 0.01, true).setAlpha(0),
        angle: 0, speed: 0, // the knocked swing, in radians
        period: 1.5 + a.len / (a.r * 6), // a long ribbon swings slower
        phase: i * 1.9 + 0.7,
        footX: a.x, footY: a.y + a.len, discRot: 0,
      };
      // a hand over it, and a knock
      const hit = this.add.zone(a.x, a.my, a.r * 2.2, a.r * 2.2).setDepth(3)
        .setInteractive({ hitArea: new Phaser.Geom.Circle(a.r * 1.1, a.r * 1.1, a.r * 1.1), hitAreaCallback: Phaser.Geom.Circle.Contains, cursor: "pointer" })
        .setData("interactionLabel", "Touch the medal");
      hit.on("pointermove", (p) => {
        const dx = p.x - (p.prevPosition?.x ?? p.x);
        md.speed += Phaser.Math.Clamp(dx * 0.0009, -0.04, 0.04);
      });
      hit.on("pointerdown", (p) => {
        const dir = p.x < a.x ? 1 : -1;
        md.speed += 0.09 * dir;
        const f = [1760, 1976, 1568, 2093, 1865][i % 5];
        chime(this, [[f, 0.018], [f * 2.76, 0.007], [f * 5.4, 0.003]], 1.1);
      });
      return md;
    });
  }

  // the medals as they hang now, `dt` seconds on
  _swingMedals(time, dt) {
    if (!this._medals) return;
    const t = time / 1000, still = !this.ambientMotion;
    for (const md of this._medals) {
      const w = (Math.PI * 2) / md.period;
      // the knock: a damped pendulum
      md.speed += (-w * w * md.angle - 0.9 * md.speed) * dt;
      md.angle += md.speed * dt;
      md.angle = Phaser.Math.Clamp(md.angle, -0.2, 0.2);
      // and the air of the room, always there, never more than a breath
      const idle = still ? 0 : 0.012 * Math.sin(t * w * 0.5 + md.phase) + 0.004 * Math.sin(t * 1.7 + md.phase * 2);
      const rot = md.angle + idle;
      md.ribbonImg.setRotation(rot);
      md.footX = md.x - md.len * Math.sin(rot);
      md.footY = md.y + md.len * Math.cos(rot);
      // the disc swings a little further than the silk, and turns on its ring
      md.discRot = rot * 1.45 + (still ? 0 : 0.01 * Math.sin(t * 2.3 + md.phase));
      const turn = still ? 0 : 0.22 * Math.sin(t * 0.45 + md.phase) + Phaser.Math.Clamp(md.speed * 1.6, -0.5, 0.5);
      const sx = Math.max(0.84, Math.cos(turn));
      for (const img of [md.discImg, md.sheenImg]) img.setPosition(md.footX, md.footY).setRotation(md.discRot).setScale(sx, 1);
      // the light slides over its face as it turns toward the window
      md.sheenImg.setAlpha(still ? 0.1 : Math.max(0, 0.42 * Math.sin(turn * 3 + 0.9)) + 0.04);
    }
  }

  // the rain, moved on by `dt` seconds (none, with the ambience still) and drawn
  _paintRain(time, dt) {
    if (!this._rain || !this._glass) return;
    const box = this._glass, { u } = box, now = time / 1000;
    // behind the glass: fine rain falling slant, faint
    const o = this._outside;
    o.clear();
    for (const s of this._fall) {
      s.y += s.speed * dt; s.x += s.speed * dt * 0.14;
      if (s.y > box.y1) { s.y = box.y0 - s.len; s.x = box.x0 + Math.random() * (box.x1 - box.x0) - s.len * 0.14; }
      const x1 = Math.min(box.x1, s.x + s.len * 0.14), y1 = Math.min(box.y1, s.y + s.len);
      if (s.x < box.x0 || s.y + s.len < box.y0) continue;
      o.lineStyle(Math.max(0.6, 0.7 * u), 0xa9c2da, s.a);
      o.beginPath(); o.moveTo(s.x, Math.max(box.y0, s.y)); o.lineTo(x1, y1); o.strokePath();
    }
    // on the glass: the runners — held, then running a little way, wandering;
    // each leaves its trail of wet behind it
    for (const d of this._runners) {
      if (d.hold > 0) d.hold -= dt;
      else if (dt) {
        d.v = Math.min(d.v + 260 * u * dt, d.vmax);
        const step = d.v * dt;
        d.y += step; d.x += d.wander * dt; d.left -= step;
        if (Math.hypot(d.x - d.lastX, d.y - d.lastY) > 2.5 * u) {
          d.trail.push({ x: d.x, y: d.y - d.r * 0.6, at: now });
          d.lastX = d.x; d.lastY = d.y;
        }
        if (d.left <= 0) runnerRests(d, u);
      }
      if (d.y > box.y1 - d.r) {
        // gone off the foot of the glass: its trail stays to dry, and it begins again higher up
        this._trails.push({ pts: d.trail, w: d.r });
        resetRunner(d, box, false);
      }
    }
    const g = this._rain;
    g.clear();
    const life = 5;
    const strokeTrail = (pts, w) => {
      for (let i = 1; i < pts.length; i++) {
        const k = 1 - (now - pts[i].at) / life;
        if (k <= 0) continue;
        g.lineStyle(Math.max(0.6, w * 0.5), 0x9ecbe8, 0.2 * k);
        g.beginPath(); g.moveTo(pts[i - 1].x, pts[i - 1].y); g.lineTo(pts[i].x, pts[i].y); g.strokePath();
        g.lineStyle(Math.max(0.5, w * 0.2), 0x06101a, 0.16 * k);
        g.beginPath(); g.moveTo(pts[i - 1].x + w * 0.35, pts[i - 1].y); g.lineTo(pts[i].x + w * 0.35, pts[i].y); g.strokePath();
      }
    };
    this._trails = this._trails.filter((tr) => tr.pts.length && now - tr.pts[tr.pts.length - 1].at < life);
    for (const tr of this._trails) strokeTrail(tr.pts, tr.w);
    for (const d of this._runners) {
      while (d.trail.length && now - d.trail[0].at > life) d.trail.shift();
      strokeTrail(d.trail, d.r);
      // the drop itself: a little lens of water, longer while it runs
      const moving = d.hold <= 0 && d.v > 0;
      const rx = d.r, ry = d.r * (moving ? 1.35 : 1.05);
      g.fillStyle(0x040a12, 0.38); g.fillEllipse(d.x + rx * 0.25, d.y + ry * 0.3, rx * 2.1, ry * 2.15);
      g.fillStyle(0x8fbfe0, 0.2); g.fillEllipse(d.x, d.y, rx * 2, ry * 2);
      g.fillStyle(0xd9eeff, 0.34); g.fillEllipse(d.x, d.y + ry * 0.45, rx * 1.1, ry * 0.5);
      g.fillStyle(0xffffff, 0.78); g.fillCircle(d.x - rx * 0.35, d.y - ry * 0.4, Math.max(0.5, rx * 0.24));
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._glints = null;
    this._medals = null;
    this._scopeShape?.destroy();
    this._scopeShape = null;
    this._rain = this._outside = this._glass = null;
    this._runners = this._fall = this._trails = null;
    if (this.textures.exists(BEADS)) this.textures.remove(BEADS);
    releaseTrophyArt(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._glints = null;
    this._medals = null;
    this._scopeShape?.destroy();
    this._scopeShape = null;
    this._rain = this._outside = this._glass = null;
    this._runners = this._fall = this._trails = null;
    if (this.textures.exists(BEADS)) this.textures.remove(BEADS);
    releaseTrophyArt(this.textures);
  }
}

// the beads held all over the glass, painted once: each a little lens of
// water — its shadow below, the window's light gathered in its foot, a point
// of light at its top — most of them small, a few grown into longer blobs;
// and a faint mist over the wet glass
function paintBeads(W, H, box) {
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const { u } = box, bw = box.x1 - box.x0, bh = box.y1 - box.y0;
  g.fillStyle = "rgba(190,215,240,0.035)";
  g.fillRect(box.x0, box.y0, bw, bh);
  const rnd = lcg(4242);
  const bead = (x, y, r, tall = 1) => {
    g.fillStyle = "rgba(3,9,16,0.34)";
    g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.35, r * 1.05, r * 1.1 * tall, 0, 0, Math.PI * 2); g.fill();
    const body = g.createRadialGradient(x, y + r * 0.15, 0, x, y, r * 1.05);
    body.addColorStop(0, "rgba(200,225,245,0.04)"); body.addColorStop(0.75, "rgba(150,185,220,0.12)"); body.addColorStop(1, "rgba(120,160,200,0.28)");
    g.fillStyle = body;
    g.beginPath(); g.ellipse(x, y, r, r * tall, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(215,238,255,0.32)";
    g.beginPath(); g.ellipse(x, y + r * tall * 0.48, r * 0.55, r * 0.24, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.beginPath(); g.arc(x - r * 0.34, y - r * tall * 0.38, Math.max(0.35, r * 0.22), 0, Math.PI * 2); g.fill();
  };
  for (let i = 0; i < 520; i++) {
    const r = (0.45 + rnd() ** 2.2 * 2.6) * u;
    bead(box.x0 + rnd() * bw, box.y0 + rnd() * bh, r);
  }
  for (let i = 0; i < 18; i++) bead(box.x0 + rnd() * bw, box.y0 + rnd() * bh, (2.6 + rnd() * 1.6) * u, 1.3 + rnd() * 0.6);
  return c;
}

// the rain falling outside, seen through the glass
function makeFall(box) {
  const { u } = box;
  return Array.from({ length: 46 }, () => ({
    x: box.x0 + Math.random() * (box.x1 - box.x0),
    y: box.y0 + Math.random() * (box.y1 - box.y0),
    len: (14 + Math.random() * 26) * u,
    speed: (520 + Math.random() * 260) * u,
    a: 0.06 + Math.random() * 0.1,
  }));
}

// the drops that run: each starts somewhere on the glass, held a while
function makeRunners(box) {
  return Array.from({ length: 9 }, () => resetRunner({}, box, true));
}
function resetRunner(d, box, anywhere) {
  const { u } = box;
  d.r = (1.8 + Math.random() * 1.8) * u;
  d.x = box.x0 + d.r + Math.random() * (box.x1 - box.x0 - d.r * 2);
  d.y = box.y0 + (anywhere ? Math.random() * 0.8 : Math.random() * 0.45) * (box.y1 - box.y0);
  d.hold = 0.5 + Math.random() * (anywhere ? 6 : 3);
  d.v = 0; d.vmax = (40 + Math.random() * 90) * u;
  d.left = (12 + Math.random() * 70) * u;
  d.wander = (Math.random() - 0.5) * 10 * u;
  d.trail = []; d.lastX = d.x; d.lastY = d.y;
  return d;
}
// a runner stops a while, as drops do, gathering itself before it goes on
function runnerRests(d, u) {
  d.hold = 0.25 + Math.random() * 2;
  d.v = 0;
  d.left = (10 + Math.random() * 80) * u;
  d.wander = (Math.random() - 0.5) * 10 * u;
}
