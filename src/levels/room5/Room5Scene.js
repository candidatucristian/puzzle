import Phaser from "phaser";
import PlainRoomScene from "../house/plainRoom.js";
import { layoutTrap, paintTrap } from "./trapdoor.js";
import { layoutRoomTree, paintRoomTree } from "./roomTree.js";
import { layoutRoomTv, paintRoomTv, paintSnow } from "./roomTv.js";
import { addCanvasTexture } from "../../shared/paint.js";
import { loadDrawingRoomFinishes, drawingRoomFinishes } from "../house/drawingRoomMaterials.js";

const SNOW = "room5_snow"; // the television's snow, kept moving over its glass

/** Room 5, the drawing room: deep red paper over a dark dado, parquet, a tall
 *  sash window between its curtains, a hearth on the left. It keeps the key
 *  to the last door. Three puzzles are found in it. A trap stands open in the
 *  floor before the hearth, and an iron ladder goes down it to the cellar
 *  (trapdoor.js); the candle left beside the trap burns until that puzzle
 *  is solved. And between the hearth and the window stands a Christmas tree
 *  (roomTree.js), whose lamps burn until its puzzle is. And on the right-hand wall
 *  corner a television has been left on, its tube full of snow (roomTv.js),
 *  until its puzzle is. */
export default class Room5Scene extends PlainRoomScene {
  constructor() {
    super("Room5", {
      style: {
        wall: "paper", near: "#2c1418", far: "#150a0c", back: "#1c0e11", mark: "rgba(230,170,170,0.035)",
        floor: "herringbone", floorNear: "#33200f", floorFar: "#180e08", ceiling: "plain", ceilingCol: "#0c0a0a", window: "sash",
      },
      window: { x: 0.36, hw: 0.15, top: 266, sill: 104 },
      hearth: -0.36,
      chest: 0.74,
      rug: ["#0e1626", "#5a5440", "#12203a"],
    });
  }

  preload() {
    super.preload();
    loadDrawingRoomFinishes(this);
  }

  layout(W, H, levels) {
    const L = super.layout(W, H);
    L.surfaceMaterials = drawingRoomFinishes(this);
    layoutTrap(L, !levels.isCompleted(levels.indexOf("tapcode")));
    layoutRoomTree(L, !levels.isCompleted(levels.indexOf("pi")));
    layoutRoomTv(L, !levels.isCompleted(levels.indexOf("rally")));
    return L;
  }

  paintDetails(ctx, L) {
    paintRoomTv(ctx, L);
    paintRoomTree(ctx, L);
    paintTrap(ctx, L);
  }

  live(L, k) {
    super.live(L, k);
    this._tube = null;
    // the candle by the trap and the lamps on the tree, each while it
    // burns, breathing very slightly; the television's light, while it is
    // on, never still
    for (const [thing, a] of [[L.trap, 0.2], [L.tree, 0.16], [L.tv, 0.2]]) {
      if (!thing.on) continue;
      const g = thing.glow;
      const lamp = this.add.image(g.x, g.y, k.glow).setDisplaySize(g.r * 2, g.r * 2).setTint(g.tint ?? 0xffc078).setBlendMode(Phaser.BlendModes.ADD).setAlpha(a).setDepth(-8);
      if (thing === L.tv) { this._tube = lamp; continue; }
      this.ambientTween({ targets: lamp, alpha: { from: a * 0.85, to: a * 1.25 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    // the snow on the television's glass: one square of it, shifted every
    // frame, shown through the shape the glass has from here
    this._snowMask?.destroy();
    this._snow = this._snowMask = null;
    if (!L.tv.on) return;
    const g = L.tv.glass;
    addCanvasTexture(this.textures, SNOW, paintSnow());
    this._snowMask = this.make.graphics().fillStyle(0xffffff).fillPoints(g.quad, true);
    this._snow = this.add.tileSprite(g.box.x, g.box.y, g.box.width, g.box.height, SNOW).setOrigin(0, 0).setTileScale(Math.max(1, g.grain * 2.4)).setAlpha(0.78).setDepth(-9);
    this._snow.setMask(this._snowMask.createGeometryMask());
  }

  release() {
    super.release();
    if (this.textures.exists(SNOW)) this.textures.remove(SNOW);
  }

  tick(t) {
    super.tick(t);
    // nothing on but snow: it never holds still, and nor does its light on the room
    this._snow?.setTilePosition(Math.random() * 256, Math.random() * 256);
    this._tube?.setAlpha(0.18 + 0.03 * Math.sin(t * 17.3) + Math.random() * 0.04);
  }
}
