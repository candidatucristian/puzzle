import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { glowCanvas, addCanvasTexture } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import DRAWER from "./ticketDrawer.json";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "STATION"  ·  code: EXIT  ·  observation + ordering
//
// Room IV's chest of drawers, its top drawer pulled out and looked down into
// by candlelight: hundreds of old card tickets standing in rows at the back,
// and in front, laid out in two rows, eight of them — one for each train of
// the departures board (rows.js), in the board's own scrambled order. Each is
// printed with its destination, its time and its platform, and stamped with
// what became of its train. Four are stamped BOARDING, and in each of those
// four destinations one letter was struck from a low slug: it sits a little
// lower than the rest, askew. Read those letters in order of departure time.
//
// The drawer is a Blender render (art/blender/ticket_drawer.py; the tickets'
// faces from ticket_faces.mjs, made from rows.js): every word on every
// ticket is in the picture. Nothing in it moves; the candle's light breathes
// over it.
// ─────────────────────────────────────────────────────────────────────────────

const PLATE = `ticket_drawer_v${DRAWER.version}`;
const GLOW = "ticket_drawer_glow";

export default class TicketsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Station" });
  }

  init(data) {
    this.skipFadeIn = data?.skipFade ?? true;
  }

  preload() {
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, `assets/images/Station/ticket-drawer-v${DRAWER.version}.webp`);
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#050403");
    if (!this.textures.exists(GLOW)) addCanvasTexture(this.textures, GLOW, glowCanvas());
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const f = fitRender(W, H, DRAWER);
    if (this.textures.exists(PLATE)) {
      this.add.image(f.x, f.y, PLATE).setOrigin(0, 0).setDisplaySize(DRAWER.width * f.s, DRAWER.height * f.s);
    }
    // the candle, never quite still: its light swells and sinks a little,
    // most where it falls brightest, by the drawer's front on the left
    const at = f.at(DRAWER.candle.at), r = DRAWER.candle.r * f.s;
    const light = this.add.image(at.x, at.y, GLOW)
      .setDisplaySize(r * 2, r * 2)
      .setTint(0xffb066)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.2);
    this._flicker(light);
  }

  _flicker(light) {
    const next = () => {
      if (!light.scene) return;
      this.ambientTween({
        targets: light,
        alpha: 0.14 + Math.random() * 0.14,
        duration: 180 + Math.random() * 620,
        ease: "Sine.easeInOut",
        onComplete: next,
      });
    };
    next();
  }

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
