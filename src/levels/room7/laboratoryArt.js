import { makeCanvas, soft } from "../../shared/paint.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";
import { paintTestTubeRack } from "../chemistry/glassware.js";
import { drawPhotographicLoupe } from "../../shared/photographicLoupe.js";

const ASSETS = {
  vessels: { key: "r7_bench_vessels", url: "assets/images/Room7/bench-vessels.png" },
  apparatus: { key: "r7_bench_apparatus", url: "assets/images/Room7/bench-apparatus.png" },
  materials: { key: "r7_laboratory_materials", url: "assets/images/Room7/laboratory-materials.png" },
};
const cache = new WeakMap();

export function loadLaboratoryArt(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function laboratoryArt(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.materials)) {
    const atlas = sources.materials, w = atlas.width / 3, h = atlas.height / 2;
    const tile = (col, row, filter) => {
      const canvas = makeCanvas(w - 6, h - 6), g = canvas.getContext("2d");
      g.filter = filter;
      g.drawImage(atlas, col * w + 3, row * h + 3, w - 6, h - 6, 0, 0, canvas.width, canvas.height);
      return canvas;
    };
    const wood = tile(0, 0, "brightness(0.66) saturate(0.72)");
    const across = makeCanvas(wood.height, wood.width), g = across.getContext("2d");
    g.translate(0, across.height); g.rotate(-Math.PI / 2); g.drawImage(wood, 0, 0);
    const baize = makeCanvas(112, 84), baizeCtx = baize.getContext("2d");
    baizeCtx.filter = "brightness(0.86) saturate(0.78)";
    baizeCtx.drawImage(atlas, 1030, 930, 112, 84, 0, 0, 112, 84);
    cache.set(atlas, {
      // Atlas boundaries follow the actual empty gaps, retaining full rims.
      vessels: laboratoryFrames(sources.vessels, [0, 0.207, 0.418, 0.615, 0.79, 1]),
      apparatus: laboratoryFrames(sources.apparatus, [0, 0.33, 0.67, 1]),
      materials: {
        detailed: true,
        wood,
        beamWood: across,
        slate: tile(1, 0, "brightness(0.72) saturate(0.45)"),
        wallPlaster: tile(2, 0, "brightness(0.4) saturate(0.6)"),
        plaster: tile(2, 0, "brightness(0.14) saturate(0.4)"),
        flagstone: tile(0, 1, "brightness(0.46) saturate(0.45)"),
        dado: tile(1, 1, "brightness(0.55) saturate(0.65)"),
        loupe: tile(2, 1, "brightness(0.86) saturate(0.78)"),
        baize,
      },
    });
  }
  return cache.get(sources.materials);
}

// Trim transparent margins once; never remove glass transparency or alter
// the photograph's outline. Each frame remains sharp for the approach zoom.
export function laboratoryFrames(atlas, boundaries) {
  return boundaries.slice(0, -1).map((start, i) => {
    const left = Math.floor(start * atlas.width), right = Math.floor(boundaries[i + 1] * atlas.width);
    const raw = makeCanvas(right - left, atlas.height), g = raw.getContext("2d");
    g.drawImage(atlas, left, 0, raw.width, raw.height, 0, 0, raw.width, raw.height);
    const { data } = g.getImageData(0, 0, raw.width, raw.height);
    let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
    for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) {
      if (data[(y * raw.width + x) * 4 + 3] <= 12) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (x1 < x0) return raw;
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2);
    x1 = Math.min(raw.width - 1, x1 + 2); y1 = Math.min(raw.height - 1, y1 + 2);
    const frame = makeCanvas(x1 - x0 + 1, y1 - y0 + 1), f = frame.getContext("2d");
    f.filter = "brightness(0.9) saturate(0.82)";
    f.drawImage(raw, x0, y0, frame.width, frame.height, 0, 0, frame.width, frame.height);
    return frame;
  });
}

function prop(ctx, L, image, x, y, d, height) {
  const p = L.Q(x, y, d), h = height * p.s, w = h * image.width / image.height;
  soft(ctx, p.x, p.y + 0.2 * p.s, w * 0.52, 1.4 * p.s, "0,0,0", 0.55);
  ctx.drawImage(image, p.x - w / 2, p.y - h, w, h);
  return p;
}

export function paintLaboratoryObjects(ctx, L, rack) {
  const art = L.labArt;
  if (!art) return false;
  const b = L.bench, span = b.x1 - b.x0, h = b.h;
  const [lamp, retort, burner] = art.apparatus;
  const lp = prop(ctx, L, lamp, L.lamp.x, h, L.lamp.d, 44);
  if (L.on) lampFlame(ctx, lp);
  prop(ctx, L, retort, b.x0 + span * 0.18, h, 576, 58);
  const rackAt = L.Q(b.x0 + span * 0.3, h, 574);
  paintTestTubeRack(ctx, rack, rackAt.x, rackAt.y, 40 * rackAt.s);
  for (const [i, bt] of L.bottleRow.entries()) prop(ctx, L, art.vessels[i], bt.x, h, bt.d, bt.shape[1]);

  const g = L.loupe;
  // Same four cloth corners and tabletop height as the original loupe.
  paintProjectedMaterial(ctx, L.labDetails ? art.materials.baize : art.materials.loupe, (u, v) => L.Q(g.x - 15 + 34 * u - v, h + 0.1, g.d + 9 - 15 * v), 1, 3, 3);
  if (L.labDetails) {
    const lens = L.Q(g.x - 5, h + 0.5, g.d);
    drawPhotographicLoupe(ctx, L.labDetails.loupe, lens.x, lens.y, 7.5 * lens.s, true);
  }
  const bp = prop(ctx, L, burner, L.burner.x, h, L.burner.d, 41);
  if (L.on) burnerFlame(ctx, bp);
  return true;
}

function lampFlame(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
  soft(ctx, 0, -27, 8, 10, "255,190,120", 0.5, "lighter");
  const g = ctx.createLinearGradient(0, -31, 0, -24);
  g.addColorStop(0, "rgba(255,178,74,0)"); g.addColorStop(0.5, "#fff1c9"); g.addColorStop(1, "#ffac4c");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -31); ctx.quadraticCurveTo(1.5, -26, 0, -24); ctx.quadraticCurveTo(-1.5, -26, 0, -31); ctx.fill();
  ctx.restore();
}

function burnerFlame(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
  // The photographed nozzle is 17cm high; the flame fits the gap under gauze.
  soft(ctx, 0, -19, 5, 5, "120,160,255", 0.45, "lighter");
  const g = ctx.createLinearGradient(0, -21.8, 0, -17);
  g.addColorStop(0, "rgba(115,166,255,0.1)"); g.addColorStop(0.5, "#7cafff"); g.addColorStop(1, "#d1eaff");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-0.9, -17); ctx.quadraticCurveTo(-1.1, -19.8, 0, -21.8); ctx.quadraticCurveTo(1.1, -19.8, 0.9, -17); ctx.closePath(); ctx.fill();
  ctx.restore();
}
