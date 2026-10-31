import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { fitRender } from "../../shared/renderFit.js";
import FRAME from "./dawnFrame.json";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "WIRES"  ·  code: FACADE  ·  Room IV's picture
//
// The picture on Room IV's back wall, close to, under its brass light: the
// last minute before sunrise over English country — the old stone cottage, its
// porch lantern still burning and an old man in a rocking chair with his
// harmonica; a telegraph pole on the hilltop meadow, five wires on it, and on
// the wires six blackbirds; the valley under its mist below.
//
// The five wires are a stave, bottom to top D F A C E; the birds, left to
// right, sit on F A C A D E (puzzle.js WIRE_BIRDS). The game never says so.
//
// The picture is a Blender render (art/blender/dawn_country.py, the birds put
// where WIRE_BIRDS has them), framed on the wall in another
// (art/blender/dawn_frame.py); Room IV hangs the same picture. It is still,
// as a picture is; the harmonica recording is only the room's air.
// ─────────────────────────────────────────────────────────────────────────────

const PLATE = `wi_dawn_frame_v${FRAME.version}`;

export default class WiresScene extends BasePuzzleScene {
  constructor() { super({ key: "Wires" }); }

  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  preload() {
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, `assets/images/Wires/dawn-frame-v${FRAME.version}.webp`);
    if (!this.cache.audio.exists("wires_music")) this.load.audio("wires_music", "assets/sounds/Wires/music.mp3");
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#060505");
    const canvas = this.game.canvas;
    canvas.dataset.sceneColour = "natural";
    this._sceneCleanups.add(() => { delete canvas.dataset.sceneColour; });
    this._music = this.services.audio.playLevelMusic(this, "wires_music", { gain: 0.7 });
    this._build(this.scale.width, this.scale.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const f = fitRender(W, H, FRAME);
    if (this.textures.exists(PLATE)) {
      this.add.image(f.x, f.y, PLATE).setOrigin(0, 0).setDisplaySize(FRAME.width * f.s, FRAME.height * f.s);
    }
  }

  _teardown() {
    for (const child of this.children.list.slice()) child.destroy();
  }

  shutdown() {
    this._music = null;
  }
}
