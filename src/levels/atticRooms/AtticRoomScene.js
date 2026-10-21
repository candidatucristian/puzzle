import PlainRoomScene from "../house/plainRoom.js";
import { makeCanvas, addCanvasTexture, glowCanvas, vignette } from "../../shared/paint.js";
import { onScreen } from "../../shared/phaserRain.js";

const PHOTO_SIZE = { width: 1659, height: 948 };
const ROOMS = {
  Room12: {
    key: "room12_archive_attic_photo_v1", url: "assets/images/Room12/archive-attic-night-v1.webp",
    window: { cx: 530, rx: 102, top: 120, sill: 359 }, lamp: { x: 884, y: 361, r: 47 },
    panes: [
      [[440, 126], [521, 130], [521, 230], [438, 227]],
      [[535, 132], [617, 135], [617, 234], [535, 231]],
      [[439, 243], [521, 246], [521, 349], [438, 349]],
      [[535, 247], [617, 249], [617, 351], [535, 351]],
    ],
    cutouts: [], seed: 1212,
  },
  Room13: {
    key: "room13_workshop_attic_photo_v1", url: "assets/images/Room13/workshop-attic-night-v1.webp",
    window: { cx: 990, rx: 80, top: 151, sill: 335 }, lamp: { x: 1297, y: 362, r: 48 },
    panes: [
      [[920, 159], [984, 157], [984, 234], [920, 235]],
      [[996, 157], [1059, 156], [1059, 234], [996, 234]],
      [[920, 249], [984, 249], [984, 325], [920, 325]],
      [[996, 249], [1059, 249], [1059, 325], [996, 325]],
    ],
    cutouts: [
      [[1033, 308], [1069, 308], [1069, 349], [1033, 349]],
      [[903, 323], [928, 323], [928, 349], [903, 349]],
    ], seed: 1313,
  },
};

const PLANS = {
  Room12: {
    style: {
      wall: "planks", near: "#262420", far: "#12100e", back: "#1a1815", rail: 0,
      floor: "boards", floorNear: "#2a2118", floorFar: "#14100b", ceiling: "beams", ceilingCol: "#0b0a09", window: "leaded",
    },
    window: { x: -0.35, hw: 0.15, top: 236, sill: 120 },
    hearth: null, chest: null, rug: ["#181512", "#3e3428", "#201c18"],
  },
  Room13: {
    style: {
      wall: "planks", near: "#22221e", far: "#100f0d", back: "#181714", rail: 0,
      floor: "boards", floorNear: "#2a2118", floorFar: "#14100b", ceiling: "beams", ceilingCol: "#0b0a09", window: "sash",
    },
    window: { x: 0.35, hw: 0.17, top: 240, sill: 116 },
    hearth: -0.45, chest: null, rug: ["#161412", "#3a3026", "#1e1a16"],
  },
};

class AtticRoomScene extends PlainRoomScene {
  constructor(place) {
    super(place, PLANS[place]);
    this._photograph = ROOMS[place];
  }

  preload() {
    super.preload();
    const photo = this._photograph;
    if (!this.textures.exists(photo.key)) this.load.image(photo.key, photo.url);
  }

  layout(W, H) {
    const L = super.layout(W, H), photo = this._photograph;
    L.photographic = this.textures.exists(photo.key);
    if (!L.photographic) return L;
    const sx = W / PHOTO_SIZE.width, sy = H / PHOTO_SIZE.height, w = photo.window;
    L.win = { ...L.win, cx: w.cx * sx, rx: w.rx * sx, top: w.top * sy, sill: w.sill * sy };
    L.lamp = { x: photo.lamp.x * sx, y: photo.lamp.y * sy, r: photo.lamp.r * sy };
    L.rain = {
      panes: photo.panes.map(points => onScreen(points, PHOTO_SIZE, W, H)),
      cutouts: photo.cutouts.map(points => onScreen(points, PHOTO_SIZE, W, H)),
      drop: Math.max(0.45, (W / 1920) * 0.62), fog: 0.35, reach: 20, beyond: 0.45, seed: photo.seed,
    };
    return L;
  }

  paint(L) {
    if (!L.photographic) return super.paint(L);
    const canvas = makeCanvas(L.W, L.H), ctx = canvas.getContext("2d");
    ctx.drawImage(this.textures.get(this._photograph.key).getSourceImage(), 0, 0, L.W, L.H);
    // The loft shares the passage's late-night exposure, with local warmth
    // retained around each oil lantern rather than a bright overall wash.
    ctx.fillStyle = "rgba(2,4,6,0.16)"; ctx.fillRect(0, 0, L.W, L.H);
    vignette(ctx, L.W, L.H, 0.2);
    addCanvasTexture(this.textures, this._keys.room, canvas);
    addCanvasTexture(this.textures, this._keys.glow, glowCanvas());
    return this._keys;
  }

  live(L, k, glow) {
    if (!L.photographic) return super.live(L, k);
    this._embers = null;
    const lamp = glow(L.lamp, 0.075, 0xffb66c);
    this.ambientTween({ targets: lamp, alpha: { from: 0.06, to: 0.09 }, duration: 2900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  dustIn(L) {
    return L.photographic ? null : super.dustIn(L);
  }
}

export class Room12Scene extends AtticRoomScene {
  constructor() { super("Room12"); }
}

export class Room13Scene extends AtticRoomScene {
  constructor() { super("Room13"); }
}
