import Phaser from "phaser";
import RoomScene from "../house/RoomScene.js";
import { layoutRoom3, paintRoom3, releaseRoom3Art, SHIP_BOTTLE } from "./room3.js";

// ─────────────────────────────────────────────────────────────────────────────
// The captain's room: the third room off the hall (see house/RoomScene.js for
// what every room does). Three puzzles are found in it: the ship in the
// bottle on the table to the left — a click goes into the bottle, and aboard
// — the chess game left on the games table, the old mobile telephone on the
// writing desk. The gilt chest is on that desk's far end.
//
// The room is painted (room3.js); the bottle keeps its own detailed texture.
// Each puzzle has its own light, and each
// light burns only until its puzzle is solved: the ship's lantern by the
// bottle, the candle on the games table, the lamp over the telephone and the
// telephone's own screen. Live over the painting: those lights — the screen
// coming and going, as a telephone's does when it is ringing — and dust in
// the moonbeam.
// ─────────────────────────────────────────────────────────────────────────────

// which puzzle each of the room's lights is lit for
const LIT_FOR = { ship: "compass", chess: "chessboard", phone: "mobilephone" };

export default class Room3Scene extends RoomScene {
  constructor() {
    super("Room3");
  }

  preload() {
    this.load.image(SHIP_BOTTLE.key, SHIP_BOTTLE.url);
  }

  layout(W, H, levels) {
    const on = {};
    for (const [light, level] of Object.entries(LIT_FOR)) on[light] = !levels.isCompleted(levels.indexOf(level));
    return layoutRoom3(W, H, on);
  }

  paint(L) {
    return paintRoom3(this, L).keys;
  }

  release() {
    releaseRoom3Art(this.textures);
  }

  live(L, k, glow) {
    const on = L.on, g = L.glows;
    // Keep the original table position and hit area. A separate full-resolution
    // image retains the fine rigging and glass when the camera walks up to it.
    const { box } = L.things.find(thing => thing.level === "compass");
    const source = this.textures.get(SHIP_BOTTLE.key).getSourceImage();
    const scale = Math.min(box.width / source.width, box.height / source.height);
    const width = source.width * scale, height = source.height * scale;
    const left = box.x + (box.width - width) / 2, bottom = box.y + box.height;
    // Contact shadows at the two supports in the source image.
    for (const [x, y] of [[0.142, 0.039], [0.656, 0.011]]) {
      this.add.image(left + width * x, bottom - height * y, k.glow)
        .setDisplaySize(width * 0.15, height * 0.09)
        .setTint(0x000000).setAlpha(0.48).setDepth(-9.1);
    }
    this._bottle = this.add.image(box.x + box.width / 2, box.y + box.height, SHIP_BOTTLE.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(width, height)
      .setTint(on.ship ? 0xc1b5a1 : 0x384251)
      .setDepth(-9);
    // the lantern and the candle, never still; the lamp, breathing
    this._flames = [on.ship && glow(g.lantern, 0.34), on.chess && glow(g.flame, 0.4)].filter(Boolean);
    if (on.phone) {
      const lamp = glow(g.desk, 0.18);
      this.ambientTween({ targets: lamp, alpha: { from: 0.15, to: 0.22 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    // the telephone's screen, lighting and dimming as it rings
    this._screen = on.phone
      ? this.add.image(g.screen.x, g.screen.y, k.glow).setDisplaySize(g.screen.r * 2, g.screen.r * 2).setTint(0x78ff78).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(-7)
      : null;
  }

  tick(t) {
    this._flames.forEach((flame, i) => flame.setAlpha(0.34 + 0.06 * Math.sin(t * 9 + i * 2) + Math.random() * 0.05));
    this._screen?.setAlpha(t % 3 < 1.6 ? 0.25 + 0.3 * Math.abs(Math.sin(t * 6)) : 0.12);
  }

  // with the desk lamp out there is only the moon on the chest
  chestTint(L) {
    return L.on.phone ? null : 0x9aa0b8;
  }

  dustIn(L) {
    const w = L.win;
    return { x: w.cx - w.rx * 1.8, y: w.top, width: w.rx * 3, height: L.H * 0.8 - w.top };
  }
}
