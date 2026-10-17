import { makeCanvas, soft } from "../../shared/paint.js";
import { drawPhotographicLoupe } from "../../shared/photographicLoupe.js";

const ASSETS = {
  vessels: { key: "ch_photo_vessels", url: "assets/images/Room7/puzzle-vessels.png" },
  loupe: { key: "ch_photo_magnifier", url: "assets/images/Room7/magnifying-glass.png" },
  shelf: { key: "ch_photo_shelf", url: "assets/images/Room7/apothecary-shelf.png" },
  props: { key: "ch_photo_small_props", url: "assets/images/Room7/lab-small-props.png" },
  paper: { key: "ch_photo_chart_paper", url: "assets/images/CaseFile/letter-paper-v2.png" },
};
const cache = new WeakMap();

export function loadChemistryDetails(scene) {
  for (const { key, url } of Object.values(ASSETS)) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function chemistryDetails(scene) {
  if (!Object.values(ASSETS).every(({ key }) => scene.textures.exists(key))) return null;
  const sources = Object.fromEntries(Object.entries(ASSETS).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
  if (!cache.has(sources.vessels)) {
    const crop = (source, x, y, w, h, brightness = 0.84) => {
      const c = makeCanvas(w, h), g = c.getContext("2d");
      g.filter = `brightness(${brightness}) saturate(0.75)`;
      g.drawImage(source, x, y, w, h, 0, 0, w, h);
      return c;
    };
    cache.set(sources.vessels, {
      vessels: [[31, 390, 276, 532], [329, 243, 302, 680], [658, 440, 268, 482], [964, 74, 240, 850], [1224, 516, 283, 409]].map(box => crop(sources.vessels, ...box, 0.9)),
      loupe: crop(sources.loupe, 0, 0, sources.loupe.width, sources.loupe.height, 0.93),
      shelf: crop(sources.shelf, 28, 92, 1484, 840),
      bindings: [[647, 317, 80, 371], [736, 306, 90, 382], [837, 320, 78, 368]].map(box => crop(sources.shelf, ...box)),
      props: [[34, 40, 752, 923], [849, 398, 657, 543]].map(box => crop(sources.props, ...box)),
      paper: crop(sources.paper, 31, 50, 964, 1425, 0.86),
    });
  }
  return cache.get(sources.vessels);
}

// Front edge of each photographed meniscus, measured within its fixed crop.
// Native graduations are anchored to it; image-generated text is never a clue.
const LEVEL_HEIGHT = [227 / 532, 154 / 680, 194 / 482, 607 / 850, 240 / 409];

export function photographicBottle(L, b, R) {
  const image = L.photoDetails?.vessels[b.i];
  if (!image) return null;
  const h = b.h, w = h * image.width / image.height;
  const cw = Math.max(b.w * 1.5, w * 1.12), ch = h * 1.14;
  const c = makeCanvas(cw * R, ch * R), g = c.getContext("2d");
  const ox = cw / 2, oy = ch - h * 0.05;
  g.scale(R, R); g.translate(ox, oy);
  soft(g, 0, 0, w * 0.55, h * 0.018, "0,0,0", 0.55);
  g.drawImage(image, -w / 2, -h, w, h);
  const level = -h * LEVEL_HEIGHT[b.i], bottom = -h * 0.09;
  const division = (level - bottom) / b.n;
  const yAt = value => bottom + division * value;
  const sx = w * 0.17, long = w * 0.16;
  const fs = Math.max(2.8, Math.min(3.8, b.w * 0.04));
  const stroke = (x0, y0, x1, y1, width, opacity) => {
    g.lineWidth = width;
    g.strokeStyle = "rgba(5,12,14,0.5)";
    g.beginPath(); g.moveTo(x0 + 0.25, y0 + 0.25); g.lineTo(x1 + 0.25, y1 + 0.25); g.stroke();
    g.strokeStyle = `rgba(245,249,237,${opacity})`;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  };
  stroke(sx, bottom, sx, yAt(b.capacity), 0.3, 0.74);
  g.font = `600 ${fs}px Arial, Helvetica, sans-serif`;
  g.textAlign = "right"; g.textBaseline = "middle";
  for (let i = 0; i <= Math.round(b.capacity / b.step); i++) {
    const value = i * b.step, y = yAt(value), major = i % b.major === 0, mid = i % b.mid === 0;
    const len = long * (major ? 1 : mid ? 0.62 : 0.36);
    stroke(sx, y, sx - len, y, major ? 0.4 : 0.28, major ? 0.96 : 0.78);
    if (major && i > 0) {
      g.fillStyle = "rgba(4,10,12,0.58)"; g.fillText(String(value), sx - len - fs * 0.2 + 0.25, y + 0.3);
      g.fillStyle = "rgba(249,251,239,0.96)"; g.fillText(String(value), sx - len - fs * 0.2, y);
    }
  }
  g.textAlign = "left"; g.font = `600 ${fs * 0.86}px Arial, Helvetica, sans-serif`;
  g.fillStyle = "rgba(245,249,237,0.84)"; g.fillText("ml", sx + fs * 0.3, yAt(b.capacity));
  return {
    canvas: c, ox: ox / cw, oy: oy / ch, x: b.x, y: b.y,
    liquid: { x0: -w * 0.14, x1: w * 0.14, top: level, bot: bottom },
    glow: !!b.glow, colour: b.liquid,
  };
}

export function photographicLoupe(L, held = false) {
  const image = L.photoDetails?.loupe;
  if (!image) return null;
  const lp = L.loupe, r = lp.r, n = lp.n;
  const cw = held ? r * 6 : 300 * n, ch = held ? r * 6 : 120 * n;
  const c = makeCanvas(cw * 2, ch * 2), g = c.getContext("2d");
  g.scale(2, 2);
  const x = held ? cw * 0.5 : 90 * n, y = ch * 0.5;
  if (!held) soft(g, x + 14 * n, y + 6 * n, 110 * n, 26 * n, "0,0,0", 0.5);
  drawPhotographicLoupe(g, image, x, y - (held ? 0 : 5 * n), held ? r : 50 * n, !held);
  return { canvas: c, x: lp.x, y: lp.y, ox: x / cw, oy: 0.5 };
}

export function photoProp(ctx, image, x, y, height) {
  const w = height * image.width / image.height;
  soft(ctx, x, y, w * 0.52, height * 0.025, "0,0,0", 0.56);
  ctx.drawImage(image, x - w / 2, y - height, w, height);
}

export function photographicNearThings(ctx, L) {
  if (!L.photoDetails || !L.labArt) return false;
  const { u, labArt, photoDetails } = L, tw = L.bench.hw;
  const point = (x, s) => ({ x: L.vp.x + x * s, y: L.vp.y + L.topY * s, s });
  photoProp(ctx, labArt.apparatus[0], L.lamp.x, L.lamp.y, 176 * L.lamp.s);
  const mortar = point(-0.45 * tw, 0.97);
  photoProp(ctx, photoDetails.props[0], mortar.x, mortar.y, 78 * mortar.s * u);
  const cl = L.loupe, n = cl.n;
  ctx.save();
  ctx.translate(cl.x + 16 * n, cl.y + 2 * n); ctx.scale(1, 0.42); ctx.rotate(-0.06);
  soft(ctx, 6 * n, 10 * n, 150 * n, 96 * n, "0,0,0", 0.45);
  ctx.drawImage(labArt.materials.baize, -128 * n, -80 * n, 256 * n, 160 * n);
  ctx.restore();
  const bu = L.burner;
  photoProp(ctx, labArt.apparatus[2], bu.x, bu.y, 190 * bu.s * u);
  const matches = point(0.6 * tw, 0.99), image = photoDetails.props[1];
  photoProp(ctx, image, matches.x, matches.y, 44 * matches.s * u * image.height / image.width);
  return true;
}
