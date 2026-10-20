import { makeCanvas, vignette } from "../../shared/paint.js";

export const TREE_PHOTOGRAPH = "pi_tree_photographic_v2";
const PROPS = "pi_tree_props_photographic_v1";
const SIZE = { width: 1659, height: 948 };
const propsCache = new WeakMap();

export function loadTreePhotography(scene) {
  for (const [key, url] of [
    [TREE_PHOTOGRAPH, "assets/images/Pi/lit-tree-photographic-v2.png"],
    [PROPS, "assets/images/Pi/tree-props-photographic-v1.png"],
  ]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function alignTreePhotography(L, reference) {
  const sx = L.W / SIZE.width, sy = L.H / SIZE.height;
  L.photographic = true;
  L.floorY = 768 * sy;
  // Keep every holder and its seeded spacing, fitted to the real boughs.
  L.rows = reference.rows.map((row, tier) => row.map(p => ({
    x: (589 + (p.x - reference.tree.cx) / reference.tree.reach * 320) * sx,
    y: (155 + tier * 68 + (p.y - reference.tree.top - (tier + 0.8) * reference.tree.th) / reference.tree.th * 68) * sy,
  })));
  L.win = { x0: 1136 * sx, x1: 1465 * sx, y0: 88 * sy, y1: 549 * sy };
  L.moon = { x: 1391 * sx, y: 157 * sy, r: 35 * Math.min(sx, sy) };
  L.gift.x = 1035 * sx; L.gift.y = 886 * sy;
}

export function paintTreePhotography(ctx, scene, L) {
  ctx.save();
  ctx.filter = "brightness(0.83) saturate(0.9)";
  ctx.drawImage(scene.textures.get(TREE_PHOTOGRAPH).getSourceImage(), 0, 0, L.W, L.H);
  ctx.restore();
  vignette(ctx, L.W, L.H, 0.23);
}

export function treePhotographicProps(scene) {
  if (!scene.textures.exists(PROPS)) return null;
  const source = scene.textures.get(PROPS).getSourceImage();
  if (!propsCache.has(source)) {
    // Actual clear gaps differ from equal atlas cells; retain each whole lid.
    const boxes = {
      giftShut: [0, 0, 445, 425], giftOpen: [445, 0, 510, 425], bulbOff: [955, 0, 325, 425],
      ruler: [0, 425, 550, 410], protractor: [550, 425, 420, 410], compasses: [970, 425, 310, 410],
      bulbOn: [0, 835, 425, 445],
    };
    const crop = ([x, y, w, h]) => {
      const raw = makeCanvas(w, h), g = raw.getContext("2d");
      g.drawImage(source, x / 1280 * source.width, y / 1280 * source.height,
        w / 1280 * source.width, h / 1280 * source.height, 0, 0, w, h);
      const pixels = g.getImageData(0, 0, w, h), data = pixels.data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const at = (py * w + px) * 4, r = data[at], green = data[at + 1], b = data[at + 2];
        // Remove pure-colour cutout fringe, retaining gold, paper and glass.
        if ((r > 160 && r > green * 2 && r > b * 1.8) ||
            (green > 160 && green > r * 1.8 && green > b * 1.8) ||
            (r > 215 && green > 215 && b < 25)) data[at + 3] = 0;
        if (data[at + 3] <= 12) continue;
        x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
      }
      g.putImageData(pixels, 0, 0);
      if (x1 < x0) return raw;
      const trimmed = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
      trimmed.getContext("2d").drawImage(raw, x0, y0, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
      return trimmed;
    };
    propsCache.set(source, Object.fromEntries(Object.entries(boxes).map(([name, box]) => [name, crop(box)])));
  }
  return propsCache.get(source);
}

export function photographicGiftArt(scene, originals, unit) {
  const props = treePhotographicProps(scene);
  if (!props) return originals;
  const bounds = { giftShut: [100, 76], giftOpen: [150, 95], ruler: [126, 18], protractor: [90, 52], compasses: [60, 100] };
  return Object.fromEntries(Object.entries(originals).map(([key, art]) => {
    const image = props[key], [maxW, maxH] = bounds[key];
    const canvas = makeCanvas(art.canvas.width, art.canvas.height), ctx = canvas.getContext("2d");
    const scale = Math.min(maxW / image.width, maxH / image.height) * unit;
    const width = image.width * scale, height = image.height * scale;
    ctx.drawImage(image, art.ox - width / 2, art.oy - height * (key.startsWith("gift") ? 1 : 0.5), width, height);
    return [key, { ...art, canvas }];
  }));
}
