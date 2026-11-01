// The Night Circuit (levels/rally) for Blender: everything the game reckons
// about its stage and its cars, at the picture the level is now drawn at
// (1880 × 1000, fitted to the screen), written out for rally_stage.py and
// rally_cars.py to build and render the same thing in Cycles.
//
//   .artifacts/rally/stage.json   the track's one projection (the eye, the
//                                 horizon, the lens), the oval, the masts and
//                                 their lamps, the hut, the board, the tape
//                                 and its posts, the crowd, the bales, the
//                                 tent, the vans, the forest, the moon
//   .artifacts/rally/car.json     the car's mesh (cars.js's own: x forward,
//                                 y up, z to its left), what each face of it
//                                 is, its lamps
//   .artifacts/rally/cars.json    the views: the cell every one is drawn in,
//                                 where the car's foot is in it, pixels to a
//                                 metre, each view's yaw and where its lamps
//                                 fall (the game reads this)
//   .artifacts/rally/livery-<c>-{right,left,top}.png, dirt.png
//   .artifacts/rally/js-car-<c>.png  the game's own software render, to check
//                                 the Blender views against
//
//   node art/blender/rally_export.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { layoutStage } from "../../src/levels/rally/stage.js";
import { renderCars, LIVERIES, NUMBER_PANEL, FRAME_COUNT, frameYaw, CAR_INTERNALS } from "../../src/levels/rally/cars.js";
import { RALLY_NUMBERS } from "../../src/levels/rally/puzzle.js";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const OUT = path(".artifacts/rally/");
mkdirSync(OUT, { recursive: true });

export const REF = { W: 1880, H: 1000 };
const L = layoutStage(REF.W, REF.H);
const T = L.T;
const round = (v) => Math.round(v * 1e5) / 1e5;

// ── the stage ──────────────────────────────────────────────────────────────
const stage = {
  ref: REF, horizonY: L.horizonY, camH: L.camH, m: L.m, carM: L.carM, carLenPx: L.carLenPx, wzFinish: L.wzFinish,
  track: { A: T.A, B: T.B, ZC: T.ZC, RZ: T.RZ, TW: T.TW, THETA0: T.THETA0, THETA1: T.THETA1 },
  masts: L.masts, lamps: L.lamps.map((l) => ({ x: l.x, h: l.h, z: l.z, ax: l.ax, ay: l.ay, az: l.az, outer: Math.acos(l.cosOut) * 180 / Math.PI, inner: Math.acos(l.cosIn) * 180 / Math.PI, I: l.I })),
  hut: L.hut, sign: L.sign, cellFar: L.cellFar, cellNear: L.cellNear, marshal: L.marshal,
  tapeRuns: L.tapeRuns.map((run) => run.map((p) => ({ x: round(p.x), z: round(p.z) }))),
  crowd: L.crowd, bales: L.bales.map((b) => ({ x: round(b.x), z: round(b.z), tx: round(b.tx), tz: round(b.tz), seed: b.seed })),
  tent: L.tent, vans: L.vans, forestZ: L.forestZ, moon: L.moon,
};
writeFileSync(`${OUT}stage.json`, JSON.stringify(stage, null, 1));

// ── the car ────────────────────────────────────────────────────────────────
const { carMesh, bodyKind, liveryAt, dirtAt, PART, LAMPS, XR, XF } = CAR_INTERNALS;
const mesh = carMesh();
// (the body's faces split finer wherever what they are changes across them
// — a window's edge, a lamp's — so those edges come out clean, not stepped)
const pos = Array.from(mesh.pos), nrm = Array.from(mesh.nrm), part = Array.from(mesh.part);
const idx = [], kinds = [];
const vert = (p, n, pt) => { pos.push(...p); nrm.push(...n); part.push(pt); return pos.length / 3 - 1; };
const at = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
const nat = (i) => [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]];
const kindAt = (p, n) => { const l = Math.hypot(...n) || 1; return bodyKind(p[0], p[1], p[2], n[0] / l, n[1] / l, n[2] / l); };
const mid = new Map();
const half = (i, j) => {
  const key = i < j ? `${i},${j}` : `${j},${i}`;
  if (!mid.has(key)) {
    const a = at(i), b = at(j), na = nat(i), nb = nat(j);
    mid.set(key, vert(a.map((v, k) => (v + b[k]) / 2), na.map((v, k) => (v + nb[k]) / 2), part[i]));
  }
  return mid.get(key);
};
function face(a, b, c, depth) {
  const pa = at(a), pb = at(b), pc = at(c);
  const n = nat(a).map((v, k) => v + nat(b)[k] + nat(c)[k]);
  const centre = pa.map((v, k) => (v + pb[k] + pc[k]) / 3);
  const k0 = kindAt(centre, n);
  const same = [[pa, nat(a)], [pb, nat(b)], [pc, nat(c)]].every(([p, nn]) => kindAt(p.map((v, k) => v * 0.8 + centre[k] * 0.2), nn) === k0);
  if (same || depth === 0) { idx.push(a, b, c); kinds.push(k0); return; }
  const ab = half(a, b), bc = half(b, c), ca = half(c, a);
  face(a, ab, ca, depth - 1); face(ab, b, bc, depth - 1); face(ca, bc, c, depth - 1); face(ab, bc, ca, depth - 1);
}
for (let t = 0; t < mesh.idx.length / 3; t++) {
  const [a, b, c] = [mesh.idx[t * 3], mesh.idx[t * 3 + 1], mesh.idx[t * 3 + 2]];
  if (mesh.part[a] !== PART.BODY) { idx.push(a, b, c); kinds.push(255); continue; }
  face(a, b, c, 4);
}
writeFileSync(`${OUT}car.json`, JSON.stringify({
  pos: pos.map(round), part, idx, kind: kinds,
  parts: PART, lamps: LAMPS, liveries: LIVERIES, panel: NUMBER_PANEL, numbers: RALLY_NUMBERS, xr: XR, xf: XF,
}));

// ── the liveries, as pictures of the car's side and top ────────────────────
const X0 = XR - 0.05, X1 = XF + 0.05, SX = 1024, Y1 = 1.6, SY = Math.round(SX * Y1 / (X1 - X0)), ZT = 1.0, SZ = Math.round(SX * 2 * ZT / (X1 - X0));
const px = (v) => Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(0, v), 1 / 2.2))));
const out = [0, 0, 0, 0];
async function picture(w, h, at, file, overlay) {
  const buf = Buffer.alloc(w * h * 3);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    at(i, j, out);
    const o = (j * w + i) * 3; buf[o] = px(out[0]); buf[o + 1] = px(out[1]); buf[o + 2] = px(out[2]);
  }
  let img = sharp(buf, { raw: { width: w, height: h, channels: 3 } });
  if (overlay) img = sharp(await img.png().toBuffer()).composite(overlay);
  await img.png().toFile(file);
}
const panelSvg = (number, w, h, mirror) => {
  const r = h * 0.12, e = h * 0.045, size = h * 0.78;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <g transform="${mirror ? `translate(${w} 0) scale(-1 1)` : ""}">
    <rect width="${w}" height="${h}" rx="${r}" fill="#101010"/>
    <rect x="${e}" y="${e}" width="${w - 2 * e}" height="${h - 2 * e}" rx="${r - e}" fill="#f6f3ea"/>
    <text x="${w / 2}" y="${h / 2 + size * 0.36}" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="${size}" fill="#0b0b0b">${number}</text>
    </g></svg>`);
};
const pw = Math.round((NUMBER_PANEL.x1 - NUMBER_PANEL.x0) / (X1 - X0) * SX), ph = Math.round((NUMBER_PANEL.y1 - NUMBER_PANEL.y0) / Y1 * SY);
const pleft = Math.round((NUMBER_PANEL.x0 - X0) / (X1 - X0) * SX), ptop = Math.round((Y1 - NUMBER_PANEL.y1) / Y1 * SY);
for (const [c, liv] of LIVERIES.entries()) {
  const side = (i, j, o) => { liveryAt(c, liv, X0 + (i + 0.5) / SX * (X1 - X0), Y1 * (1 - (j + 0.5) / SY), -0.9, 0, o); };
  const top = (i, j, o) => { liveryAt(c, liv, X0 + (i + 0.5) / SX * (X1 - X0), 1.2, ZT * (1 - 2 * (j + 0.5) / SZ), 1, o); };
  const n = RALLY_NUMBERS[c];
  // (seen from its right, the car's nose is to the right; from its left, the picture is seen through, mirrored)
  await picture(SX, SY, side, `${OUT}livery-${c}-right.png`, [{ input: panelSvg(n, pw, ph, false), left: pleft, top: ptop }]);
  await picture(SX, SY, side, `${OUT}livery-${c}-left.png`, [{ input: panelSvg(n, pw, ph, true), left: pleft, top: ptop }]);
  await picture(SX, SZ, top, `${OUT}livery-${c}-top.png`);
}
await picture(SX, SY, (i, j, o) => { const d = dirtAt(X0 + (i + 0.5) / SX * (X1 - X0), Y1 * (1 - (j + 0.5) / SY), -0.9); o[0] = o[1] = o[2] = d; }, `${OUT}dirt.png`);

// ── the views, as the game reckons them ────────────────────────────────────
const pitchDeg = Math.atan2(L.camH - 0.7 * L.carM, L.wzFinish) * 180 / Math.PI;
const set = renderCars({ carLenPx: L.carLenPx, pitchDeg, res: 2, liveries: LIVERIES, panels: [] });
writeFileSync(`${OUT}cars.json`, JSON.stringify({
  carLenPx: L.carLenPx, pitchDeg, res: set.res, ppm: set.ppm, cell: set.cell, frames: set.frames,
  yaws: Array.from({ length: FRAME_COUNT }, (_, i) => frameYaw(i)), cols: 6,
}, null, 1));
for (const [c] of LIVERIES.entries()) {
  const { w, h } = set.cell, cols = 6, rows = Math.ceil(FRAME_COUNT / cols);
  const comps = set.images[c].map((px_, i) => ({ input: Buffer.from(px_.buffer), raw: { width: w, height: h, channels: 4 }, left: (i % cols) * w, top: Math.floor(i / cols) * h }));
  await sharp({ create: { width: w * cols, height: h * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(`${OUT}js-car-${c}.png`);
}
console.log("rally export:", `cell ${set.cell.w}×${set.cell.h}`, `ppm ${set.ppm.toFixed(2)}`, `pitch ${pitchDeg.toFixed(2)}°`);
