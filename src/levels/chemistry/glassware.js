import { makeCanvas, soft } from "../../shared/paint.js";
import { BACK, footShadow, onWall } from "../house/roomKit.js";

export const LAB_FIXTURES = {
  cabinet: { key: "lab_glassware_cabinet_photo", url: "assets/images/Room7/glassware-cabinet.webp?v=2" },
  rack: { key: "lab_test_tube_rack", url: "assets/images/Room7/test-tube-rack.webp" },
  washing: { key: "lab_washing_station", url: "assets/images/Room7/washing-station.webp" },
};

// Trim only the transparent margins; material detail and the alpha of the
// glass stay in the source. Room lighting is applied by the normal painter.
const cache = new WeakMap();
function cutout(source, name, box, brightness = 0.8) {
  if (!cache.has(source)) cache.set(source, new Map());
  const frames = cache.get(source);
  if (!frames.has(name)) {
    const [x, y, w, h] = box, canvas = makeCanvas(w, h), g = canvas.getContext("2d");
    g.filter = `brightness(${brightness}) saturate(0.68)`;
    g.drawImage(source, x, y, w, h, 0, 0, w, h);
    frames.set(name, canvas);
  }
  return frames.get(name);
}

export function paintGlassCabinet(ctx, L, source) {
  const flat = cutout(source, "cabinet", [116, 12, 1304, 996], 1.02);
  // The cupboard front stands a little proud of the left wall.
  onWall(ctx, { ...L, half: L.half - 12 }, -1, L.wallShelves, flat);
}

export function paintTestTubeRack(ctx, source, x, y, width) {
  const flat = cutout(source, "rack", [48, 91, 1440, 842], 0.83);
  const h = width * flat.height / flat.width;
  soft(ctx, x, y, width * 0.55, width * 0.055, "0,0,0", 0.55);
  ctx.drawImage(flat, x - width / 2, y - h, width, h);
}

export function paintWashingStation(ctx, L, source) {
  const station = cutout(source, "station", [8, 68, 1012, 1392], 0.86);
  const { washing, sinks } = L;
  footShadow(ctx, L, { ...sinks, d1: BACK }, 0.72);
  ctx.drawImage(station, washing.x, washing.y, washing.width, washing.height);
}
