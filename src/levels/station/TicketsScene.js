import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { STATION_ROWS } from "./rows.js";
import { paintTickets, releaseTicketArt } from "./tickets.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "STATION"  ·  code: EXIT  ·  observation + ordering
//
// The puzzle of the departures board (StationScene.js), as it is found in
// the house: a drawer pulled open, and in it a row of old card tickets — one
// for each of the board's trains, in the board's own scrambled order. Each
// is printed with its destination, its time and its platform, and stamped
// with what became of its train. Four are stamped BOARDING, and each of
// those four destinations has one letter that does not belong (see rows.js).
// Read the wrong letters in order of departure time.
//
// The drawer is painted once per screen size (tickets.js). Nothing in it
// moves; only the candle's light breathes over it.
// ─────────────────────────────────────────────────────────────────────────────

export default class TicketsScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Station" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const art = paintTickets(this, W, H, STATION_ROWS);
    this.add.image(0, 0, art.keys.drawer).setOrigin(0, 0).setDepth(-10);
    // the candle, never quite still
    const light = this.add
      .image(art.light.x, art.light.y, art.keys.glow)
      .setDisplaySize(art.light.r * 2, art.light.r * 2)
      .setTint(0xffc078)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.1)
      .setDepth(-9);
    this.ambientTween({ targets: light, alpha: { from: 0.07, to: 0.14 }, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseTicketArt(this.textures);
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseTicketArt(this.textures);
  }
}
