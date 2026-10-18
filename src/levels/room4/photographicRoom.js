import { makeCanvas, soft } from "../../shared/paint.js";
import { BACK, block, fillPoly, footShadow } from "../house/roomKit.js";
import { writingDesk } from "../house/furniture.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

const ASSETS = {
  surfaces: { key: "r4_photographic_surfaces", url: "assets/images/Room4/surface-atlas.png" },
  furniture: { key: "r4_photographic_furniture", url: "assets/images/Room4/furniture-fronts.png" },
  props: { key: "r4_photographic_props", url: "assets/images/Room4/room-props.png" },
};
const cache = new WeakMap();

export function loadRoom4Photography(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function room4Photography(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.surfaces)) {
    const crop = (source, x, y, w, h, brightness = 1) => {
      const c = makeCanvas(w, h), g = c.getContext("2d");
      g.filter = `brightness(${brightness})`;
      g.drawImage(source, x, y, w, h, 0, 0, c.width, c.height);
      return c;
    };
    const trim = (source, x, y, w, h) => {
      const raw = crop(source, x, y, w, h), g = raw.getContext("2d");
      const { data } = g.getImageData(0, 0, raw.width, raw.height);
      let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
      for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) {
        if (data[(y * raw.width + x) * 4 + 3] <= 12) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      return x1 < x0 ? raw : crop(raw, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0.9);
    };
    const atlas = sources.surfaces, w = atlas.width / 3, h = atlas.height / 3;
    const tile = (col, row, brightness) => crop(atlas, col * w + 3, row * h + 3, w - 6, h - 6, brightness);
    const wood = tile(0, 1, 0.83), beam = tile(0, 2, 0.6);
    const across = makeCanvas(beam.height, beam.width), g = across.getContext("2d");
    g.translate(0, across.height); g.rotate(-Math.PI / 2); g.drawImage(beam, 0, 0);
    // Use the actual empty gaps, rather than cutting the broad desk into
    // thirds or clipping the chair's crest at an imaginary atlas midpoint.
    const boundaries = [0, 0.482, 0.71, 1];
    const furniture = boundaries.slice(0, -1).map((left, i) => trim(sources.furniture, left * sources.furniture.width, 0, (boundaries[i + 1] - left) * sources.furniture.width, sources.furniture.height));
    const pw = sources.props.width / 2, ph = sources.props.height;
    const props = [[0, 0, pw, ph * 0.4785], [pw, 0, pw, ph * 0.508], [0, ph * 0.4785, pw, ph * 0.5215], [pw, ph * 0.508, pw, ph * 0.492]].map(box => trim(sources.props, ...box));
    cache.set(atlas, {
      surfaces: { detailed: true, cleanPlaster: true, wallPlaster: tile(0, 0, 0.68), plaster: tile(0, 0, 0.27), flagstone: tile(1, 0, 0.7), beamWood: across, wood },
      wood, rug: tile(2, 0, 0.78), cork: tile(1, 1, 0.9), paper: tile(2, 1, 0.94), gilt: tile(2, 2, 0.82), glass: tile(1, 2, 0.83),
      desk: furniture[0], bookcase: furniture[1], drawer: furniture[2],
      stove: props[0], lamp: props[1], chair: props[2], basket: props[3],
    });
  }
  return cache.get(sources.surfaces);
}

export function room4Front(ctx, L, image, x0, x1, y0, y1, depth) {
  paintProjectedMaterial(ctx, image, (u, v) => L.Q(x0 + (x1 - x0) * u, y1 - (y1 - y0) * v, depth), 1, 4, 2);
}

function prop(ctx, L, image, x, y, depth, height, width = null) {
  const p = L.Q(x, y, depth), h = height * p.s, w = width == null ? h * image.width / image.height : width * p.s;
  soft(ctx, p.x, p.y + p.s, w * 0.45, 3 * p.s, "0,0,0", 0.55);
  ctx.drawImage(image, p.x - w / 2, p.y - h, w, h);
}

export function paintRoom4Desk(ctx, L) {
  writingDesk(ctx, L, L.desk);
  if (!L.photoArt) return;
  const k = L.desk;
  room4Front(ctx, L, L.photoArt.desk, k.x0 - 3, k.x1 + 3, 0, k.h - 1, k.d0 - 0.1);
}

export function paintRoom4Bookcase(ctx, L) {
  if (!L.photoArt) return false;
  const b = { x0: L.half * 0.015, x1: L.half * 0.255, d0: 568, d1: 597, h: 182 };
  footShadow(ctx, L, b);
  block(ctx, L, { ...b, y0: 0, y1: b.h }, { side: "#24170e", top: "#66503a", front: "#100c08" });
  room4Front(ctx, L, L.photoArt.bookcase, b.x0, b.x1, 0, b.h, b.d0 - 0.1);
  return true;
}

export function paintRoom4Chair(ctx, L) {
  if (!L.photoArt) return false;
  const k = L.desk;
  prop(ctx, L, L.photoArt.chair, k.x0 + (k.x1 - k.x0) * 0.56, 0, 418, 106, 44);
  return true;
}

export function paintRoom4Lamp(ctx, L) {
  if (!L.photoArt) return false;
  const lm = L.deskLamp, k = L.desk, { Q } = L;
  if (L.on.cards) {
    const pool = Q(lm.x + 26, k.h, lm.d - 6), p = Q(lm.x, lm.y + 22, lm.d);
    ctx.save();
    fillPoly(ctx, [Q(k.x0 - 3, k.h, k.d0 - 3), Q(k.x1 + 3, k.h, k.d0 - 3), Q(k.x1 + 3, k.h, k.d1), Q(k.x0 - 3, k.h, k.d1)], "rgba(0,0,0,0)"); ctx.clip();
    soft(ctx, pool.x, pool.y, 62 * pool.s, 20 * pool.s, "255,190,120", 0.4, "lighter"); ctx.restore();
    soft(ctx, p.x, p.y, 68 * p.s, 52 * p.s, "255,190,120", 0.13, "lighter");
  }
  prop(ctx, L, L.photoArt.lamp, lm.x, lm.y, lm.d, 31, 27);
  if (L.on.cards) {
    const p = Q(lm.x, lm.y + 23, lm.d);
    soft(ctx, p.x, p.y, 10 * p.s, 4 * p.s, "132,222,158", 0.18, "lighter");
  }
  return true;
}

export function paintRoom4Stove(ctx, L) {
  if (!L.photoArt) return false;
  const { Q } = L, st = L.stove, p = Q(st.x, 0, st.d);
  const b = { x0: st.x - 42, x1: st.x + 42, d0: st.d - 39, d1: st.d + 27, y0: 0, y1: 4 };
  block(ctx, { ...L, furnitureMaterial: null }, b, { side: "#101114", front: "#25262a", top: "#3e3b37" });
  paintProjectedMaterial(ctx, L.photoArt.surfaces.flagstone, (u, v) => Q(b.x0 + (b.x1 - b.x0) * u, 4, b.d1 - (b.d1 - b.d0) * v), 0.9, 3, 2);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
  const pipeTop = -L.top + 34;
  const metal = ctx.createLinearGradient(-6, 0, 6, 0);
  metal.addColorStop(0, "#0c1012"); metal.addColorStop(0.28, "#41484a"); metal.addColorStop(0.48, "#2c3335"); metal.addColorStop(1, "#0b1011");
  ctx.fillStyle = metal; ctx.fillRect(-6, pipeTop, 12, -87 - pipeTop);
  ctx.fillStyle = "#252c2f"; ctx.beginPath(); ctx.roundRect(-6, pipeTop, 35, 12, 4); ctx.fill();
  for (const y of [-108, -174, pipeTop + 13]) {
    ctx.fillStyle = "#111719"; ctx.fillRect(-7, y, 14, 3);
    ctx.fillStyle = "rgba(136,155,160,0.3)"; ctx.fillRect(-6, y, 12, 0.6);
  }
  ctx.restore();
  prop(ctx, L, L.photoArt.stove, st.x, 4, st.d, 90, 70);
  return true;
}

export function paintRoom4Firewood(ctx, L) {
  if (!L.photoArt) return false;
  const st = L.stove;
  prop(ctx, L, L.photoArt.basket, st.x + 43, 0, st.d - 42, 46, 38);
  return true;
}

export function paintRoom4Window(ctx, L) {
  if (!L.photoArt) return;
  const w = L.win;
  ctx.drawImage(L.photoArt.glass, w.cx - w.rx, w.top, w.rx * 2, w.sill - w.top);
  const s = L.Q(0, 0, BACK).s;
  ctx.strokeStyle = "rgba(160,180,207,0.25)"; ctx.lineWidth = Math.max(0.6, 0.5 * s);
  ctx.strokeRect(w.cx - w.rx, w.top, w.rx * 2, w.sill - w.top);
}
