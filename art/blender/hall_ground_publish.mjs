// The ground-floor hall's renders (hall_ground.py → .artifacts/hall) into the
// game (levels/hall/groundRender.js):
//   hall-ground-render-v1        the hall, without its gate's leaves or the
//                                clock's pendulum
//   hall-ground-doors-render-v1  the same with nothing stood in it (their
//                                shadows kept), for a door to swing open with
//   hall-ground-passby-<n>-render-v1  for each door that something stands
//                                before: the hall without those things (the
//                                bare pass), only where they stand and where
//                                their shadows lay, whole — each table, plant and
//                                stand that lies over any of the door, told
//                                apart by the ids pass — so as one walks in
//                                at the door they are passed by, not walked
//                                into; where each lies, in the reference
//                                picture, in src/levels/hall/hallPassBy.json
//   hall-ground-front-render-v1  what stands in it, alone: the hall's own
//                                pixels where the front pass has something,
//                                so a swinging door slides under them unchanged
//   hall-gate-left/right-render-v1  the gate's two leaves, each in the half
//                                of the opening hall.js hangs it in
//   hall-pendulum-render-v1      the pendulum, in the box hall.js swings it in
// Boxes reckoned as hall.js reckons them, at its reference picture (1856 ×
// 1000), scaled to the render.
//
//   node art/blender/hall_ground_publish.mjs
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
sharp.cache(false);
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const IN = (name) => path(`.artifacts/hall/${name}.png`);
const OUT = (name) => path(`public/assets/images/Botany/${name}.webp`);

const WR = 1856, HR = 1000;
const { width } = await sharp(IN("plate")).metadata();
const s = width / WR;
const vp = { x: WR * 0.5, y: HR * 0.47 }, wall = WR * 0.6, floor = HR * 0.62, END = 4.7;
const P = (X, Y, z) => ({ x: vp.x + X / z, y: vp.y + Y / z });
const box = (x0, y0, x1, y1) => {
  const left = Math.round(x0 * s), top = Math.round(y0 * s);
  return { left, top, width: Math.round(x1 * s) - left, height: Math.round(y1 * s) - top };
};

await sharp(IN("plate")).webp({ quality: 90 }).toFile(OUT("hall-ground-render-v1"));
await sharp(IN("doors")).webp({ quality: 90 }).toFile(OUT("hall-ground-doors-render-v1"));
const alpha = await sharp(IN("front")).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
// (sharp takes an alpha off last of all, so the colour is taken off first)
const colour = await sharp(IN("plate")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
await sharp(colour.data, { raw: colour.info }).joinChannel(alpha.data, { raw: alpha.info }).webp({ quality: 90, alphaQuality: 100 }).toFile(OUT("hall-ground-front-render-v1"));
// ── what stands before each door, to be passed by on the way in ───────────
if (existsSync(IN("ids")) && existsSync(IN("bare"))) {
  const raw = (name) => sharp(IN(name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ids = await raw("ids"), front = await raw("front"), bare = await raw("bare");
  const W = ids.info.width, H = ids.info.height;
  // (each thing in the ids pass is a flat red, 8 × its number)
  const idAt = (i) => (ids.data[i * 4 + 3] > 200 ? Math.round(ids.data[i * 4] / 8) : 0);
  const inside = (q, x, y) => {
    let c = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const [xi, yi] = q[i], [xj, yj] = q[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  // (a mask grown by r pixels every way)
  const dilate = (m, r) => {
    const wide = new Uint8Array(W * H), out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) wide.fill(1, y * W + Math.max(0, x - r), y * W + Math.min(W - 1, x + r) + 1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wide[y * W + x]) for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) out[yy * W + x] = 1;
    return out;
  };
  // where the hall differs for what stands in it (softened, so that only
  // shadows and kept-off light count, not the renders' grain)
  const plate = await raw("plate"), diff = Buffer.alloc(W * H);
  for (let at = 0; at < W * H; at++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(plate.data[at * 4 + c] - bare.data[at * 4 + c]));
    diff[at] = Math.min(255, d * 4);
  }
  const changed = await sharp(diff, { raw: { width: W, height: H, channels: 1 } }).blur(2).extractChannel(0).raw().toBuffer();
  const boxes = {}, GROW = 3, NEAR = 40;
  for (const [side, first] of [[-1, 1], [1, 4]]) for (const [i, z0] of [1.32, 2.2, 3.1].entries()) {
    const n = first + i, X = side * wall, z1 = z0 + 0.5;
    const q = [P(X, HR * -0.3, z0), P(X, HR * -0.3, z1), P(X, floor, z1), P(X, floor, z0)].map((p) => [p.x * s, p.y * s]);
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    // the things over the door
    const over = new Set();
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(H, Math.ceil(Math.max(...ys))); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(W, Math.ceil(Math.max(...xs))); x++) {
        const at = y * W + x;
        if (front.data[at * 4 + 3] > 20 && inside(q, x, y) && idAt(at)) over.add(idAt(at));
      }
    if (!over.size) continue;
    // all of each, and what its standing there did to the hall close round it
    // (its shadow on the boards, the light it kept off the panelling): grown
    // a little so their soft edges go with them
    const hit = new Uint8Array(W * H);
    for (let at = 0; at < W * H; at++) if (over.has(idAt(at))) hit[at] = 1;
    const near = dilate(hit, NEAR), keep = new Uint8Array(W * H);
    for (let at = 0; at < W * H; at++) if (hit[at] || (near[at] && changed[at] > 12)) keep[at] = 1;
    const grown = dilate(keep, GROW);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grown[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(W - 1, x1 + 6); y1 = Math.min(H - 1, y1 + 6);
    const cw = x1 - x0 + 1, chh = y1 - y0 + 1, rgb = Buffer.alloc(cw * chh * 3), mask = Buffer.alloc(cw * chh);
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
      const at = (y + y0) * W + x + x0, o = y * cw + x;
      rgb[o * 3] = bare.data[at * 4]; rgb[o * 3 + 1] = bare.data[at * 4 + 1]; rgb[o * 3 + 2] = bare.data[at * 4 + 2];
      mask[o] = grown[at] ? 255 : 0;
    }
    const soft = await sharp(mask, { raw: { width: cw, height: chh, channels: 1 } }).blur(2).extractChannel(0).raw().toBuffer();
    await sharp(rgb, { raw: { width: cw, height: chh, channels: 3 } }).joinChannel(soft, { raw: { width: cw, height: chh, channels: 1 } })
      .webp({ quality: 90, alphaQuality: 100 }).toFile(OUT(`hall-ground-passby-${n}-render-v1`));
    boxes[n] = [x0 / s, y0 / s, cw / s, chh / s].map((v) => Math.round(v * 100) / 100);
    console.log(`door ${n}: things ${[...over].join(", ")} passed by in ${cw} × ${chh}`);
  }
  writeFileSync(path("src/levels/hall/hallPassBy.json"), JSON.stringify({ ground: boxes }, null, 1) + "\n");
}

// the gate's leaves
const ox = wall * 0.5, a = P(-ox, HR * -0.52, END), b = P(ox, floor, END);
await sharp(IN("gate")).extract(box(a.x, a.y, vp.x, b.y)).webp({ quality: 92, alphaQuality: 100 }).toFile(OUT("hall-gate-left-render-v1"));
await sharp(IN("gate")).extract(box(vp.x, a.y, b.x, b.y)).webp({ quality: 92, alphaQuality: 100 }).toFile(OUT("hall-gate-right-render-v1"));
// the pendulum
const zc = END - 0.12, cf = P(-wall * 0.74, floor, zc), ck = HR / 700 / zc;
const clock = { x: cf.x, y: cf.y - 262 * ck, len: 168 * ck, bob: 16 * ck };
await sharp(IN("pendulum")).extract(box(clock.x - clock.bob, clock.y, clock.x + clock.bob, clock.y + clock.len + clock.bob)).webp({ quality: 95, alphaQuality: 100 }).toFile(OUT("hall-pendulum-render-v1"));
// Forty-nine physical hinge poses, packed into a grid that fits a 4096 px
// texture, including on devices with a smaller maximum texture size.
const motionFile = path(".artifacts/hall/gate-motion.json");
if (existsSync(motionFile)) {
  const motion = JSON.parse(readFileSync(motionFile, "utf8"));
  const { width: frameWidth, height: frameHeight } = await sharp(IN("gate-pose-00")).metadata();
  const width = motion.columns * frameWidth, height = Math.ceil(motion.frames / motion.columns) * frameHeight;
  if (width > 4096 || height > 4096) throw new Error("The gate animation exceeds a 4096 px texture");
  const cells = Array.from({ length: motion.frames }, (_, i) => ({
    input: IN(`gate-pose-${String(i).padStart(2, "0")}`),
    left: (i % motion.columns) * frameWidth, top: Math.floor(i / motion.columns) * frameHeight,
  }));
  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cells).webp({ quality: 94, alphaQuality: 100, effort: 5 }).toFile(OUT("hall-gate-motion-v2"));
  writeFileSync(path("src/levels/hall/hallGate.json"), JSON.stringify({ ...motion, frameWidth, frameHeight }, null, 2) + "\n");
  console.log("published the gate's", motion.frames, "hinge poses in", width, "×", height);
}
console.log("published at", s.toFixed(4), "of the reference");
