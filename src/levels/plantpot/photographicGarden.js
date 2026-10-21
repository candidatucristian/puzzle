import { makeCanvas, soft } from "../../shared/paint.js";

const GARDEN = { key: "pp_botanical_garden_photo", url: "assets/images/PlantPot/botanical-garden.webp" };
const BENCH = { key: "pp_potting_bench_night_v2", url: "assets/images/PlantPot/potting-bench-night-v2.webp" };
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
    // One photographic object, with the same restrained night exposure as
    // the terrace. Alpha stays intact between all four legs.
    g.filter = "brightness(.86) saturate(.8)";
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

export function paintPhotographicBench(ctx, L) {
  const photo = L.benchPhoto;
  if (!photo) return false;
  const { cm, bench, at } = L;
  const x0 = at(bench.x0 - 3, 0).x, x1 = at(bench.x1 + 2, 0).x;
  // Keep the photographed perspective and proportions: no separate stretch
  // of tabletop strips or legs. The middle of its top is the working plane.
  const width=(x1-x0)/.98,height=width*photo.height/photo.width;
  const x=x0-width*.01,y=bench.y-height*.174,feet=y+height*.943;
  soft(ctx,x+width*.5,feet-1.2*cm,width*.48,5.5*cm,"0,0,0",.18);
  for(const fx of [.081,.918]) {
    soft(ctx,x+width*fx,feet,4.6*cm,1.35*cm,"0,0,0",.58);
    soft(ctx,x+width*fx+4*cm,feet-.5*cm,8*cm,2*cm,"0,0,0",.2);
  }
  ctx.drawImage(photo,x,y,width,height);
  return true;
}
