import RoomScene from "../house/RoomScene.js";
import { glowCanvas, makeCanvas, addCanvasTexture, noiseBurst } from "../../shared/paint.js";
import { renderedLayout, paintRoomRender, roomRenderPicture, hasRoomRender, loadRoomRender } from "../house/roomRender.js";
import ROOM7 from "../house/rooms/Room7.json";

// ─────────────────────────────────────────────────────────────────────────────
// The laboratory: the first room off the chemist's hall, behind door VII
// (see house/RoomScene.js for what every room does), seen across his bench.
// The bench stands free in the middle of the room as he left it: an oil lamp
// at one end, a retort on its stand and a rack of test tubes at the back, five
// graduated bottles of coloured liquid in a row, a flask on a tripod over a
// Bunsen burner, the magnifying glass on its green cloth. On the back wall the
// faded periodic table over a shelf of jars; the window and the moon, the
// counter of sinks under it and at its end a little rack of phials. Down the
// left-hand wall his bookcase, and among the books his notebook — a click
// draws it a little way out of its shelf, and it is opened. A cabinet of
// glassware on the right. The bottles are one puzzle, the notebook another,
// the phials a third. The oil lamp is the room's one light, with the moon;
// the burner is out.
//
// The room is a Blender render (art/blender/room_lab.py; house/roomRender.js),
// and the notebook coming out of its shelf in six frames. Blender wrote down
// where everything fell in the picture (house/rooms/Room7.json).
// ─────────────────────────────────────────────────────────────────────────────

const K = { room: "room7_room", glow: "room7_glow" };
const NOTEBOOK = Array.from({ length: 6 }, (_, i) => `room7_notebook_${i}`);

export default class Room7Scene extends RoomScene {
  constructor() {
    super("Room7");
  }

  preload() {
    super.preload();
    loadRoomRender(this, "Room7");
  }

  layout(W, H) {
    const L = renderedLayout(W, H, ROOM7);
    // his notebook is drawn out of its shelf before it is opened
    const notebook = L.things.find((thing) => thing.level === "molecules");
    if (notebook) notebook.before = true;
    L.notebookBox = L.extra.notebook;
    if (L.rain) L.rain.seed = 7707;
    return L;
  }

  paint(L) {
    const c = makeCanvas(L.W, L.H), ctx = c.getContext("2d");
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, L.W, L.H);
    const rendered = hasRoomRender(this, "Room7");
    if (rendered) paintRoomRender(ctx, this, "Room7", L);
    addCanvasTexture(this.textures, K.room, c);
    addCanvasTexture(this.textures, K.glow, glowCanvas());
    const b = L.notebookBox;
    if (rendered) NOTEBOOK.forEach((key, i) => addCanvasTexture(this.textures, key, roomRenderPicture(this, "Room7", `notebook-${i}`, Math.round(b.width), Math.round(b.height))));
    return { ...K, notebook: NOTEBOOK };
  }

  release() {
    for (const key of [...Object.values(K), ...NOTEBOOK]) if (this.textures.exists(key)) this.textures.remove(key);
  }

  live(L, k, glow) {
    // the oil lamp, breathing; the uranium's own faint green
    const lamp = glow(L.glows.lamp, 0.18);
    this.ambientTween({ targets: lamp, alpha: { from: 0.15, to: 0.21 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    glow(L.glows.uranium, 0.16, 0x78ff6e);
  }

  // His notebook taken from the shelf: it slides a little way toward the
  // room, and stops — and then it is opened.
  open(thing, L, k, animate) {
    const frames = k.notebook, last = frames.length - 1, b = L.notebookBox;
    const book = this.add.image(b.x, b.y, frames[animate ? 0 : last]).setOrigin(0, 0).setDisplaySize(b.width, b.height).setDepth(-9);
    if (!animate) return 0;
    const ms = 420, pull = { t: 0 };
    this.tweens.add({ targets: pull, t: 1, duration: ms, ease: "Cubic.easeOut", onUpdate: () => book.setTexture(frames[Math.round(pull.t * last)]).setDisplaySize(b.width, b.height) });
    noiseBurst(this, { dur: ms / 1000, type: "lowpass", freq: 1400, q: 0.7, gain: 0.26, env: (x) => Math.min(1, x / 0.05) * (1 - x) ** 1.7 * (0.8 + 0.2 * Math.sin(x * 64)) });
    this.time.delayedCall(ms - 60, () => noiseBurst(this, { dur: 0.1, type: "lowpass", freq: 300, gain: 0.45, env: (x) => (1 - x) ** 3 }));
    return ms;
  }

  dustIn(L) {
    return L.dust;
  }
}
