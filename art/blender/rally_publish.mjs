// The Night Circuit's Blender renders (.artifacts/rally: rally_stage.py,
// rally_cars.py, rally_board.py) into the game: public/assets/images/Rally/v1/
// and src/levels/rally/rallyRender.json (what is where, for rallyRender.js).
//
//   stage-lit, stage-dark      the stage, its floodlights on and out
//   front-lit, front-dark      what stands between us and the cars
//   car-<c>                    each car's views, four across
//   people                     every spectator (standing; arms up), the
//                              marshal, his flag arm in its three flutters
//   board                      the top three's board, its cups and names, the
//                              tape's PLAY and SP and the broadcaster's caption
//   tv                         the television on the wall, its glass clear
//
//   node art/blender/rally_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
sharp.cache(false);
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const IN = (rel) => path(`.artifacts/rally/${rel}`);
const VERSION = 1;
const OUT = path(`public/assets/images/Rally/v${VERSION}`);
mkdirSync(OUT, { recursive: true });
const webp = (img, name, alpha = true) => img.webp(alpha ? { quality: 92, alphaQuality: 100, effort: 5 } : { quality: 90, effort: 5 }).toFile(`${OUT}/${name}.webp`);
const json = (rel) => JSON.parse(readFileSync(IN(rel), "utf8"));
const stage = json("stage.json"), cars = json("cars.json"), car = json("car.json"), people = json("people/people.json"), board = json("board/board.json");

// ── the stage ──────────────────────────────────────────────────────────────
await webp(sharp(IN("lit.png")), "stage-lit", false);
await webp(sharp(IN("dark.png")), "stage-dark", false);
await webp(sharp(IN("front-lit.png")), "front-lit");
await webp(sharp(IN("front-dark.png")), "front-dark");

// ── the cars ───────────────────────────────────────────────────────────────
const COLS = 4, { w: cw, h: ch } = cars.cell, rows = Math.ceil(cars.yaws.length / COLS);
for (let c = 0; c < car.liveries.length; c++) {
  const comps = cars.yaws.map((_, i) => ({ input: IN(`cars/car-${c}-${String(i).padStart(2, "0")}.png`), left: (i % COLS) * cw, top: Math.floor(i / COLS) * ch }));
  await webp(sharp({ create: { width: cw * COLS, height: ch * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps), `car-${c}`);
}

// ── packing pictures into one atlas ────────────────────────────────────────
async function pack(name, items, maxW = 2048) {
  // items: {name, input (buffer), w, h}
  const order = items.slice().sort((a, b) => b.h - a.h);
  let x = 0, y = 0, rowH = 0;
  for (const it of order) {
    if (x + it.w > maxW) { x = 0; y += rowH + 2; rowH = 0; }
    it.x = x; it.y = y; x += it.w + 2; rowH = Math.max(rowH, it.h);
  }
  const H = y + rowH;
  await webp(sharp({ create: { width: maxW, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(items.map((it) => ({ input: it.input, left: it.x, top: it.y }))), name);
  return Object.fromEntries(items.map((it) => [it.name, [it.x, it.y, it.w, it.h]]));
}
// a picture laid into a bigger box, at its own place in the picture
async function into(file, box, union, k) {
  const left = Math.max(0, Math.round((box[0] - union[0]) * k)), top = Math.max(0, Math.round((box[1] - union[1]) * k));
  const img = await sharp(file).toBuffer(), m = await sharp(img).metadata();
  const W = Math.max(Math.round(union[2] * k), left + m.width), H = Math.max(Math.round(union[3] * k), top + m.height);
  return { input: await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: img, left, top }]).png().toBuffer(), w: W, h: H };
}
const unite = (...boxes) => {
  const x0 = Math.min(...boxes.map((b) => b[0])), y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2])), y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
};

// ── the people ─────────────────────────────────────────────────────────────
const k = people.scale;
const items = [], crowd = [];
for (const p of people.crowd) {
  const u = unite(p.still, p.cheer);
  const a = await into(IN(`people/spectator-${p.i}.png`), p.still, u, k);
  const b = await into(IN(`people/spectator-${p.i}-up.png`), p.cheer, u, k);
  items.push({ name: `p${p.i}`, ...a }, { name: `p${p.i}_up`, ...b });
  crowd.push({ frame: `p${p.i}`, cheerFrame: `p${p.i}_up`, ox: (p.feet[0] - u[0]) / u[2], oy: (p.feet[1] - u[1]) / u[3], x: p.feet[0], y: p.feet[1], z: p.z });
}
const M = people.marshal;
const body = await into(IN("people/marshal.png"), M.body, M.body, k);
items.push({ name: "marshal", ...body });
const armU = unite(...M.arms);
const arms = [];
for (let f = 0; f < M.arms.length; f++) {
  const a = await into(IN(`people/flag-arm-${f}.png`), M.arms[f], armU, k);
  items.push({ name: `arm${f}`, ...a });
  arms.push({ frame: `arm${f}`, ox: (M.shoulder[0] - armU[0]) / armU[2], oy: (M.shoulder[1] - armU[1]) / armU[3] });
}
const peopleAtlas = await pack("people", items);
const marshal = { frame: "marshal", ox: (M.feet[0] - M.body[0]) / M.body[2], oy: (M.feet[1] - M.body[1]) / M.body[3], x: M.feet[0], y: M.feet[1], arms, shoulder: { x: M.shoulder[0], y: M.shoulder[1] } };

// ── the board, its cups and names, the tape's lettering ────────────────────
const B = (n) => IN(`board/${n}.png`);
const bItems = [];
for (const n of ["board", "cup-gold", "cup-silver", "cup-bronze", "name-1", "name-2", "name-3", "osd-play", "osd-sp", "caption"]) {
  const m = await sharp(B(n)).metadata();
  bItems.push({ name: n, input: await sharp(B(n)).png().toBuffer(), w: m.width, h: m.height });
}
const boardAtlas = await pack("board", bItems, 2400);
await webp(sharp(B("tv")), "tv");

writeFileSync(path("src/levels/rally/rallyRender.json"), JSON.stringify({
  version: VERSION, ref: stage.ref,
  cars: { cell: cars.cell, res: cars.res, cols: COLS, frames: cars.frames, liveries: car.liveries.map((l) => l.name) },
  people: { res: k, atlas: peopleAtlas, crowd, marshal },
  board: { ...board, atlas: boardAtlas },
}, null, 1) + "\n");
console.log("rally: stage, front, 6 cars, people", Object.keys(peopleAtlas).length, "board", Object.keys(boardAtlas).length, "tv");
