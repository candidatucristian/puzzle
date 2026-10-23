import render from './nativeCellar.json';

const PLATE = 'tapcode_cellar_native_v1';

export function loadNativeCellar(scene) {
  if (!scene.textures.exists(PLATE)) {
    scene.load.image(PLATE, 'assets/images/TapCode/cellar-native-v1.webp');
  }
}

// Every live effect uses the same uniform transform as the Blender plate.
// Center cropping preserves the modeled proportions at wider viewports.
export function paintNativeCellar(ctx, scene, L) {
  if (!scene.textures.exists(PLATE)) return false;
  const scale = Math.max(L.W / render.width, L.H / render.height);
  const x = (L.W - render.width * scale) / 2;
  const y = (L.H - render.height * scale) / 2;
  const px = value => x + value * scale;
  const py = value => y + value * scale;
  ctx.drawImage(scene.textures.get(PLATE).getSourceImage(), x, y,
    render.width * scale, render.height * scale);
  L.nativeRender = true;
  L.native = { scale, x, y, width: render.width, height: render.height,
    rack: render.rack, cluePairs: render.cluePairs };
  L.u = scale;
  L.floorY = py(render.floorY);
  L.ceilY = py(render.ceilY);
  L.exit = { x: px(render.exit.x), y: py(render.exit.y) };
  L.ladder = { ...L.ladder, x: L.exit.x };
  L.candle = { x: px(render.candle.x), y: py(render.candle.y), s: render.candle.s * scale };
  L.drip = { x: px(render.drip.x), y0: py(render.drip.y0), y1: py(render.drip.y1) };
  L.slab = { ...L.slab, x0: px(render.slab.x0), y0: py(render.slab.y0),
    cx: px(render.slab.x0 + render.slab.w / 2), w: render.slab.w * scale, h: render.slab.h * scale };
  return true;
}
