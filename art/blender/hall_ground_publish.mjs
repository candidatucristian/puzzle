// The ground-floor hall's renders (hall_ground.py → .artifacts/hall) into the
// game (levels/hall/groundRender.js):
//   hall-ground-render-v1        the hall, without its gate's leaves or the
//                                clock's pendulum
//   hall-ground-doors-render-v1  the same with nothing stood in it (their
//                                shadows kept), for a door to swing open with
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
