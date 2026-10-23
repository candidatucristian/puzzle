import RoomScene from "./RoomScene.js";
import { glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { renderedLayout, paintRoomRender, hasRoomRender, loadRoomRender } from "./roomRender.js";

/** A room of the house with no puzzle in it: a place to stand, its story
 *  told by what is in it (shared/house.js). It is one Blender render
 *  (art/blender/room_<name>.py, house/roomRender.js) and keeps alive over it
 *  only what burns there — `lights`: { glow name: tint } — the rain on its
 *  window, and dust in the moonlight. `spec` is the room's
 *  house/rooms/<Room>.json, as Blender wrote it. */
export default class QuietRoomScene extends RoomScene {
  constructor(place, spec, lights = {}) {
    super(place);
    this.spec = spec;
    this.lights = lights;
    const id = place.toLowerCase();
    this._keys = { room: `${id}_room`, glow: `${id}_glow` };
  }

  preload() {
    super.preload();
    loadRoomRender(this, this.place);
  }

  layout(W, H) {
    const L = renderedLayout(W, H, this.spec);
    if (L.rain) L.rain.seed = Number(this.place.replace(/\D/g, "")) * 101;
    return L;
  }

  paint(L) {
    const c = makeCanvas(L.W, L.H), ctx = c.getContext("2d");
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, L.W, L.H);
    if (hasRoomRender(this, this.place)) paintRoomRender(ctx, this, this.place, L);
    addCanvasTexture(this.textures, this._keys.room, c);
    addCanvasTexture(this.textures, this._keys.glow, glowCanvas());
    return this._keys;
  }

  release() {
    for (const key of Object.values(this._keys)) if (this.textures.exists(key)) this.textures.remove(key);
  }

  live(L, k, glow) {
    // whatever burns here, breathing very slightly
    this._burning = [];
    for (const [name, tint] of Object.entries(this.lights)) {
      const at = L.glows[name];
      if (!at) continue;
      const a = name === "embers" ? 0.26 : 0.1;
      const light = glow(at, a, tint);
      if (name === "embers") this._burning.push(light);
      else this.ambientTween({ targets: light, alpha: { from: a * 0.8, to: a * 1.2 }, duration: 3100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  tick(t) {
    for (const embers of this._burning ?? []) embers.setAlpha(0.24 + 0.07 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 7.3));
  }

  dustIn(L) {
    return L.dust;
  }
}
