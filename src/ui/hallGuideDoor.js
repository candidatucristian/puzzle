import { layoutHall, paintDoorSwing } from '../levels/hall/hall.js';
import { hallRenderAsset, paintHallRender } from '../levels/hall/hallRender.js';
import { doorMotion, DOOR_LATCH_MS, DOOR_SWING_MS } from '../levels/hall/doorMotion.js';
import { lookInto } from './guide.js';

// Door I, cut out of the hall's own picture (hallRender.js) and swung by the
// hall's own painter (hall.js), on a small picture of its own that never
// touches the hall scene or its textures. The cut is the window's shape
// exactly, the shut leaf in the middle of it with its numeral above, so the
// picture fills the window edge to edge; going in, the eye swells about the
// doorway and the doorway glides to the middle.
export const GUIDE_DOOR = Object.freeze({ width: 480, height: 560 });
export const GUIDE_DOOR_OPEN_MS = DOOR_LATCH_MS + DOOR_SWING_MS;
const BASE = import.meta.env.BASE_URL;

export const guideDoorPoster = BASE + hallRenderAsset('ground', 'plate').url;

async function picture(game, name) {
  const asset = hallRenderAsset('ground', name);
  if (game.textures?.exists(asset.key)) return game.textures.get(asset.key).getSourceImage();
  const image = new Image();
  image.decoding = 'async';
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Hall introduction image unavailable: ' + name));
    image.src = BASE + asset.url;
  });
  return image;
}

export async function createGuideDoor(game, canvas) {
  const [plate, doors, front] = await Promise.all(['plate', 'doors', 'front'].map(name => picture(game, name)));
  const layout = layoutHall(1856, 1000);
  layout.render = { plate, doors, front };
  const door = layout.doors.find(item => item.number === 1);
  const context = canvas.getContext('2d');
  if (!context) return null;
  // The shared painter can draw offscreen without registering a game texture.
  const textures = { exists: () => false, remove() {}, addCanvas() {} };
  const art = paintDoorSwing({ textures }, layout, door, true);
  // a point on the shut leaf: `along` its width from the hinge side, `down` its height
  const closed = (along, down) => {
    const [tl, tr, br, bl] = door.quad;
    return {
      x: tl.x + (tr.x - tl.x) * along,
      y: tl.y + (tr.y - tl.y) * along + ((bl.y + (br.y - bl.y) * along) - (tl.y + (tr.y - tl.y) * along)) * down,
    };
  };
  // the cut: the window's own proportion, as tall as the leaf and a third
  // more (its numeral above it, the boards at its foot), the leaf in the middle
  const middle = closed(0.5, 0.5);
  const crop = { height: Math.min(layout.H, door.box.height * 1.34) };
  crop.width = crop.height * canvas.width / canvas.height;
  crop.x = Math.min(layout.W - crop.width, Math.max(0, middle.x - crop.width / 2));
  crop.y = Math.min(layout.H - crop.height, Math.max(0, door.box.y - door.box.height * 0.2));
  const scale = canvas.width / crop.width;
  const point = value => [(value.x - crop.x) * scale, (value.y - crop.y) * scale];
  const camera = {
    width: canvas.width, height: canvas.height, zoom: 1, scrollX: 0, scrollY: 0,
    setZoom(value) { this.zoom = value; },
    setScroll(x, y) { this.scrollX = x; this.scrollY = y; },
  };
  const doorway = point(closed(0.5, 0.56));
  // the whole of the hall's picture, in the window's pixels: the eye keeps within it
  const whole = { x: -crop.x * scale, y: -crop.y * scale, width: layout.W * scale, height: layout.H * scale };
  let previous = -1, previousNear = -1;
  const draw = (elapsed, near = 0) => {
    if (previous === elapsed && previousNear === near) return;
    previous = elapsed; previousNear = near;
    const pose = doorMotion(elapsed);
    art.draw(pose.angle, pose.handle);
    lookInto(camera, doorway, near, 2.1, whole);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0f1110'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(camera.zoom, camera.zoom);
    context.translate(-canvas.width / 2 - camera.scrollX, -canvas.height / 2 - camera.scrollY);
    context.translate(-crop.x * scale, -crop.y * scale);
    context.scale(scale, scale);
    // Draw the source images at the current zoom to preserve their detail.
    paintHallRender(context, layout, 'plate');
    context.drawImage(art.canvas, art.box.x, art.box.y, art.box.width, art.box.height);
  };
  draw(0);
  return {
    handle: point(closed(0.86, 0.53)),
    entry: point(closed(0.62, 0.5)),
    draw,
    dispose() { art.canvas.width = art.canvas.height = 1; },
  };
}
