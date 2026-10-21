import PlainRoomScene from "../house/plainRoom.js";
import { makeCanvas, addCanvasTexture, glowCanvas, vignette } from "../../shared/paint.js";
import { onScreen } from "../../shared/phaserRain.js";

const PHOTO = { key: "room11_physics_study_night_v1", url: "assets/images/Room11/physics-study-night-v1.webp", width: 1659, height: 948 };
const PLAN = {
  style: {
    wall: "plaster", near: "#252820", far: "#11140f", back: "#1a1e17", rail: 0,
    dado: { kind: "boards", h: 96, near: "#261b12", far: "#100b07", back: "#1d140d", rail: "#49331d", railFar: "#1a120a", railBack: "#312214" },
    floor: "herringbone", floorNear: "#34271b", floorFar: "#17110c", ceiling: "coffers", ceilingCol: "#0c0d0d", window: "sash",
  },
  window: { x: 0.38, hw: 0.16, top: 256, sill: 108 },
  hearth: null, chest: null,
  rug: ["#191912", "#3c3426", "#26251b"],
};

// Each glass pane is separate: the mullions and sash rail stay dry. The
// coil and galvanometer overlap the bottom row in the room photograph.
const PANES = [[942, 1024], [1034, 1110], [1119, 1196]].flatMap(([x0, x1]) =>
  [[87, 186], [195, 281], [294, 469]].map(([y0, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]));
const INSTRUMENTS = [
  [[938, 424], [1008, 424], [1008, 535], [938, 535]],
  [[1055, 433], [1179, 433], [1179, 552], [1055, 552]],
  [[1080, 409], [1158, 409], [1158, 438], [1080, 438]],
];

export default class Room11Scene extends PlainRoomScene {
  constructor() {
    super("Room11", PLAN);
  }

  preload() {
    super.preload();
    if (!this.textures.exists(PHOTO.key)) this.load.image(PHOTO.key, PHOTO.url);
  }

  layout(W, H) {
    const L = super.layout(W, H);
    L.photographic = this.textures.exists(PHOTO.key);
    if (!L.photographic) return L;
    const sx = W / PHOTO.width, sy = H / PHOTO.height;
    L.win = { ...L.win, cx: 1070 * sx, rx: 131 * sx, top: 84 * sy, sill: 479 * sy };
    L.lamp = { x: 692 * sx, y: 405 * sy, r: 62 * sy };
    L.rain = {
      panes: PANES.map(points => onScreen(points, PHOTO, W, H)),
      cutouts: INSTRUMENTS.map(points => onScreen(points, PHOTO, W, H)),
      drop: Math.max(0.45, (W / 1920) * 0.62), fog: 0.35, reach: 20, beyond: 0.45, seed: 1111,
    };
    return L;
  }

  paint(L) {
    if (!L.photographic) return super.paint(L);
    const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
    ctx.drawImage(this.textures.get(PHOTO.key).getSourceImage(), 0, 0, L.W, L.H);
    vignette(ctx, L.W, L.H, 0.12);
    addCanvasTexture(this.textures, this._keys.room, canvas);
    addCanvasTexture(this.textures, this._keys.glow, glowCanvas());
    return this._keys;
  }

  live(L, k, glow) {
    if (!L.photographic) return super.live(L, k);
    this._embers = null;
    const lamp = glow(L.lamp, 0.065, 0xffc078);
    this.ambientTween({ targets: lamp, alpha: { from: 0.055, to: 0.075 }, duration: 3400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  dustIn(L) {
    return L.photographic ? null : super.dustIn(L);
  }
}
