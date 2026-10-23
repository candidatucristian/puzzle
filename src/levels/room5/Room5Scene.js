import Phaser from "phaser";
import RoomScene from "../house/RoomScene.js";
import { layoutRoom5, paintRoom5, releaseRoom5Art, ROOM5_SNOW } from "./room5.js";
import { loadRoomRender } from "../house/roomRender.js";

// ─────────────────────────────────────────────────────────────────────────────
// Room 5, the drawing room (see house/RoomScene.js for what every room does).
// It keeps the key to the last door. Three puzzles are found in it: the trap
// open in the floor before the hearth, the ladder going down it to the cellar;
// the Christmas tree in the far corner; the television left on, on the far
// wall.
//
// The room is a Blender render (room5.js; house/roomRender.js), lit by the
// lamps on the tree and the moon. Live over it: the tree's lamps, breathing;
// the snow on the television's glass and its light on the room, never still;
// dust in the moonbeam.
// ─────────────────────────────────────────────────────────────────────────────

export default class Room5Scene extends RoomScene {
  constructor() {
    super("Room5");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room5");
  }

  layout(W, H) {
    return layoutRoom5(W, H);
  }

  paint(L) {
    return paintRoom5(this, L).keys;
  }

  release() {
    releaseRoom5Art(this.textures);
  }

  live(L, k, glow) {
    // the tree's lamps, breathing
    const lamps = glow(L.glows.tree, 0.14);
    this.ambientTween({ targets: lamps, alpha: { from: 0.12, to: 0.18 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    // the television's light, and the snow on its glass: one square of it,
    // shifted every frame, shown through the shape the glass has from here
    this._tube = glow(L.tv.glow, 0.16, L.tv.glow.tint);
    this._snowMask?.destroy();
    const glass = L.tv.glass;
    this._snowMask = this.make.graphics().fillStyle(0xffffff).fillPoints(glass.quad, true);
    this._snow = this.add.tileSprite(glass.box.x, glass.box.y, glass.box.width, glass.box.height, ROOM5_SNOW)
      .setOrigin(0, 0).setTileScale(Math.max(1, 0.42 * glass.s * 2.4)).setAlpha(0.78).setDepth(-9).setBlendMode(Phaser.BlendModes.SCREEN);
    this._snow.setMask(this._snowMask.createGeometryMask());
  }

  tick(t) {
    // nothing on but snow: it never holds still, and nor does its light on the room
    this._snow?.setTilePosition(Math.random() * 256, Math.random() * 256);
    this._tube?.setAlpha(0.14 + 0.03 * Math.sin(t * 17.3) + Math.random() * 0.04);
  }

  dustIn(L) {
    return L.dust;
  }
}
