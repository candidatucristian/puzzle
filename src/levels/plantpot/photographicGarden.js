import { makeCanvas, soft } from "../../shared/paint.js";

const GARDEN = { key: "pp_botanical_garden_photo", url: "assets/images/PlantPot/botanical-garden.webp" };
const BENCH = { key: "pp_potting_bench_photo", url: "assets/images/PlantPot/potting-bench-materials.webp" };
const graded = new WeakMap();

export function loadPhotographicGarden(scene) {
  for (const { key, url } of [GARDEN, BENCH]) {
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }
}

export function gardenPhotographs(scene) {
  const source = key => scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null;
  const bench = source(BENCH.key);
  if (bench && !graded.has(bench)) {
    const canvas = makeCanvas(bench.width, bench.height), g = canvas.getContext("2d");
    // Grade once, retaining the alpha between the legs. Projection uses
    // plain strips, without applying a filter separately to every strip.
    g.filter = "brightness(0.72) saturate(0.78)";
    g.drawImage(bench, 0, 0);
    graded.set(bench, canvas);
  }
  return { garden: source(GARDEN.key), bench: bench ? graded.get(bench) : null };
}

export function paintGardenPhotograph(L, photo) {
  const canvas = makeCanvas(L.W, L.H);
  canvas.getContext("2d").drawImage(photo, 0, 0, L.W, L.H);
  return canvas;
}

export function paintPhotographicBench(ctx, L, depth) {
  const photo = L.benchPhoto;
  if (!photo) return false;
  const { cm, bench, at, H } = L;
  const x0 = at(bench.x0 - 3, 0).x, x1 = at(bench.x1 + 2, 0).x;
  const back = at(0, -depth / 2).y, front = at(0, depth / 2).y;
  const bottom = H * 0.97;
  soft(ctx, (x0 + x1) / 2, bottom, (x1 - x0) * 0.53, 5 * cm, "0,0,0", 0.42);

  // Photographic landmarks: the far and near tabletop edges and the feet.
  // Follow the original bench plane so the existing pot, bucket and lantern
  // keep their positions and rest on the same working surface at every size.
  const sy0 = photo.height * 0.073, sy1 = photo.height * 0.348;
  for (let sy = sy0; sy < sy1; sy += 2) {
    const sh = Math.min(2, sy1 - sy), t = (sy - sy0) / (sy1 - sy0);
    const left = photo.width * (0.081 + (0.004 - 0.081) * t);
    const right = photo.width * (0.922 + (0.996 - 0.922) * t);
    const dx = x0 + 5 * cm * (1 - t), dw = x1 - x0 - 10 * cm * (1 - t);
    const y = back + (front - back) * t;
    ctx.drawImage(photo, left, sy, right - left, sh, dx, y, dw, (front - back) * sh / (sy1 - sy0) + 0.4);
  }
  ctx.drawImage(photo, photo.width * 0.004, sy1, photo.width * 0.992, photo.height * 0.932 - sy1,
    x0, front, x1 - x0, bottom - front);
  return true;
}
