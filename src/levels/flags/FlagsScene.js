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
import { chime } from "../../shared/paint.js";
import { addRainGlass, onScreen } from "../../shared/phaserRain.js";
// the window's glass, in the render's own pixels; the leads and iron bars
// across it; and the microscope standing in front of it, a part at a time:
// the rain is on the glass, never on the lead or the brass
import { PHOTO, GLASS, LEADING, MICROSCOPE } from "./trophyWall.js";

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
// A rendered bookcase (render/trophies.py) supports the live, precise medals;
// on the window, rain as it is on glass (shared/rainGlass.js): the glass
// misted, beads held all over it, and now and then one grown heavy enough to
// run, clearing a track through the mist; beyond the glass, rain falling. A
// quiet glint now and then on the metal.
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
    // the rain on the window
    const glass = onScreen(GLASS, PHOTO, W, H), sx = W / PHOTO.width;
    addRainGlass(this, {
      rect: { x: Math.floor(glass[0][0]), y: 0, w: Math.ceil(W - glass[0][0]), h: Math.ceil(glass[2][1]) },
      picture: this.textures.get(K.room).getSourceImage(),
      panes: [glass], cutouts: MICROSCOPE.map((part) => onScreen(part, PHOTO, W, H)),
      bars: LEADING.map((lead) => ({ points: onScreen(lead.points, PHOTO, W, H), width: lead.width * sx })),
      drop: Math.max(0.55, (W / 1920) * 1.1), fog: 0.5, reach: 22, beyond: 0.45,
      // the moon's light, cold, from above; the room's lamp, warm, from the left
      lights: [
        { dir: [0.3, -0.7, 0.65], colour: [0.13, 0.17, 0.24] },
        { dir: [-0.7, -0.1, 0.7], colour: [0.2, 0.13, 0.06] },
      ],
      seed: 5150,
    });
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

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._glints = null;
    this._medals = null;
    releaseTrophyArt(this.textures);
  }

  shutdown() {
    this._built = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._glints = null;
    this._medals = null;
    releaseTrophyArt(this.textures);
  }
}
