import { createRainGlass } from "./rainGlass.js";
import { createRainFall } from "./rainFall.js";

let serial = 0;

// A canvas of rain shown in a scene at `box`: moved on and drawn again each
// frame while the scene runs and its ambience moves, and let go of with the
// scene, or with its image.
function show(scene, rain, { x, y, w, h }, depth, name) {
  const key = `${name}_${++serial}`;
  const texture = scene.textures.addImage(key, rain.canvas);
  const image = scene.add.image(x, y, key).setOrigin(0, 0).setDisplaySize(w, h).setDepth(depth);
  const still = () => !(scene.ambientMotion ?? true) || scene.reducedMotion;
  const tick = (_time, delta) => {
    if (still()) return;
    rain.advance(Math.min(delta || 16, 50) / 1000);
    rain.draw();
    texture.source[0].update();
  };
  scene.events.on("update", tick);
  let gone = false;
  // (from the image's own destroying, it is not destroyed again)
  const dispose = (destroying) => {
    if (gone) return;
    gone = true;
    scene.events.off("update", tick);
    scene.events.off("shutdown", dispose);
    if (destroying !== true && image.scene) image.destroy();
    if (scene.textures.exists(key)) scene.textures.remove(key);
    rain.dispose();
  };
  image.once("destroy", () => dispose(true));
  scene.events.once("shutdown", dispose);
  return { image, dispose };
}

/** Rain on a window in a Phaser scene's picture (rainGlass.js): shown just
 *  over that picture, kept running while the scene runs and the ambience
 *  moves, and let go of with the scene, or with its image.
 *
 *  rect      the window's box on the screen, { x, y, w, h }
 *  picture   the canvas (or image) the scene shows there, and
 *  from      where that box is in it, if it is not drawn at the screen's size
 *  panes, cutouts, bars   as rainGlass has them, in screen coordinates
 *  depth     the image's, just over the picture's
 *  pixels    canvas pixels to the screen's */
export function addRainGlass(scene, { rect, picture, from, panes, cutouts = [], bars = [], depth = -9.9, pixels = 2, ...look }) {
  if (!picture) return null;
  // (only what is in the picture: a window running up out of it stops there)
  let { x, y, w, h } = rect;
  if (!from) {
    const right = Math.min(x + w, picture.width), bottom = Math.min(y + h, picture.height);
    x = Math.max(0, x); y = Math.max(0, y); w = right - x; h = bottom - y;
    from = { x, y, w, h };
  }
  if (w < 4 || h < 4) return null;
  const local = (points) => points.map(([px, py]) => [px - x, py - y]);
  const source = document.createElement("canvas");
  source.width = Math.ceil(w); source.height = Math.ceil(h);
  source.getContext("2d").drawImage(picture, from.x, from.y, from.w, from.h, 0, 0, source.width, source.height);
  const rain = createRainGlass({
    width: w, height: h, pixels, source,
    panes: panes.map(local), cutouts: cutouts.map(local),
    bars: bars.map((bar) => ({ ...bar, points: local(bar.points) })),
    ...look,
  });
  return show(scene, rain, { x, y, w, h }, depth, "rain_glass");
}

/** A polygon given in a photograph's pixels, on a screen that photograph is
 *  stretched over. */
export function onScreen(points, photo, W, H) {
  return points.map(([x, y]) => [(x / photo.width) * W, (y / photo.height) * H]);
}

/** The box round some polygons. */
export function boxOf(polygons, pad = 0) {
  const xs = polygons.flat().map((p) => p[0]), ys = polygons.flat().map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad), y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad) - x, h: Math.ceil(Math.max(...ys) + pad) - y };
}

/** Rain falling over a scene's whole picture (rainFall.js), lit by it, and
 *  ringing the water on its wet `ground` (a polygon on the screen).
 *  width, height  the screen's, if the picture is not drawn at its size
 *  Returns null where WebGL cannot be had. */
export function addRainFall(scene, { picture, width = picture?.width, height = picture?.height, ground = null, depth = -10, ...look }) {
  if (!picture || !width || !height) return null;
  const rain = createRainFall({ width: Math.ceil(width), height: Math.ceil(height), source: picture, ground, ...look });
  return rain ? show(scene, rain, { x: 0, y: 0, w: width, h: height }, depth, "rain_fall") : null;
}
