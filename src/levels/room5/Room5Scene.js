import Phaser from "phaser";
import RoomScene from "../house/RoomScene.js";
import { layoutRoom5, paintRoom5, releaseRoom5Art, ROOM5_SNOW } from "./room5.js";
import { loadRoomRender } from "../house/roomRender.js";
import { addCandleFlame, flickerCandleFlame } from "../../shared/candleFlame.js";

// ─────────────────────────────────────────────────────────────────────────────
// Room 5, the drawing room (see house/RoomScene.js for what every room does).
// It keeps the key to the last door. Three puzzles are found in it: the trap
// open in the floor before the hearth, the ladder going down it to the cellar;
// the Christmas tree in the far corner; the television left on, on the far
// wall.
//
// The room is a Blender render (room5.js; house/roomRender.js). Each puzzle's
// light burns only until that puzzle is solved: the candle by the trap, the
// lamps on the tree, the television. Live over the render: those lights, the
// snow on the television's glass, the embers in the grate (which stay in),
// dust in the moonbeam.
// ─────────────────────────────────────────────────────────────────────────────

// which puzzle each of the room's lights is lit for
const LIT_FOR = { trap: "tapcode", tree: "pi", tv: "rally" };

export default class Room5Scene extends RoomScene {
  constructor() {
    super("Room5");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room5");
  }

  layout(W, H, levels) {
    const on = {};
    for (const [light, level] of Object.entries(LIT_FOR)) on[light] = !levels.isCompleted(levels.indexOf(level));
    return layoutRoom5(W, H, on);
  }

  paint(L) {
    return paintRoom5(this, L).keys;
  }

  release() {
    releaseRoom5Art(this.textures);
  }

  live(L, k, glow) {
    const on = L.on, g = L.glows;
    // the coals in the grate, glowing up and dying down
    this._embers = glow(g.embers, 0.3, 0xff7a28);
    // the candle by the trap, never still; the tree's lamps, breathing
    this._candle = on.trap ? glow(g.trap, 0.36) : null;
    this._flame = on.trap ? addCandleFlame(this, L.flames.candle) : null;
    if (on.tree) {
      const lamps = glow(g.tree, 0.16);
      this.ambientTween({ targets: lamps, alpha: { from: 0.14, to: 0.2 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    // the television's light, and the snow on its glass: one square of it,
    // shifted every frame, shown through the shape the glass has from here
    this._tube = on.tv ? glow(L.tv.glow, 0.2, L.tv.glow.tint) : null;
    this._snowMask?.destroy();
    this._snow = this._snowMask = null;
    if (!on.tv) return;
    const glass = L.tv.glass;
    this._snowMask = this.make.graphics().fillStyle(0xffffff).fillPoints(glass.quad, true);
    this._snow = this.add.tileSprite(glass.box.x, glass.box.y, glass.box.width, glass.box.height, ROOM5_SNOW)
      .setOrigin(0, 0).setTileScale(Math.max(1, 0.42 * glass.s * 2.4)).setAlpha(0.78).setDepth(-9).setBlendMode(Phaser.BlendModes.SCREEN);
    this._snow.setMask(this._snowMask.createGeometryMask());
  }

  tick(t) {
    this._embers?.setAlpha(0.26 + 0.07 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 7.3));
    this._candle?.setAlpha(0.33 + 0.06 * Math.sin(t * 9) + Math.random() * 0.05);
    flickerCandleFlame(this._flame, t);
    // nothing on but snow: it never holds still, and nor does its light on the room
    this._snow?.setTilePosition(Math.random() * 256, Math.random() * 256);
    this._tube?.setAlpha(0.18 + 0.03 * Math.sin(t * 17.3) + Math.random() * 0.04);
  }

  // with the candle out there is only the moon and the fire on the chest
  chestTint(L) {
    return L.on.trap ? null : 0xa8a0b0;
  }

  dustIn(L) {
    return L.dust;
  }
}
