// After Hours' office (overtime_office.py → .artifacts/overtime-office) into
// the game: the plate, every colon dark; each colon lit, cut out of the
// second render with a margin for its glow and packed into one small atlas;
// and where everything the game keeps alive fell in the picture
// (src/levels/overtime/officeRender.json).
//
//   node art/blender/overtime_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/overtime-office"), target = path("public/assets/images/Overtime");
mkdirSync(target, { recursive: true });
const office = JSON.parse(readFileSync(`${source}/officeRender.json`, "utf8"));
const v = office.version;

const plate = await sharp(`${source}/plate.png`).metadata();
const K = plate.width / office.width;            // render pixels a reference pixel
await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/office-plate-v${v}.webp`);
console.log(`office-plate-v${v}.webp`);

// each colon lit, a margin round it for the glow it throws
const PAD = 7;
const pieces = [];
let x = 0, height = 0;
for (const colon of office.colons) {
  const [bx, by, bw, bh] = colon.box;
  const left = Math.max(0, Math.floor((bx - PAD) * K)), top = Math.max(0, Math.floor((by - PAD) * K));
  const w = Math.ceil((bw + PAD * 2) * K), h = Math.ceil((bh + PAD * 2) * K);
  const input = await sharp(`${source}/lit.png`).extract({ left, top, width: w, height: h }).png().toBuffer();
  // (how much the two renders differ round the cut's edge: should be nothing)
  const a = await sharp(`${source}/lit.png`).extract({ left, top, width: w, height: h }).raw().toBuffer();
  const b = await sharp(`${source}/plate.png`).extract({ left, top, width: w, height: h }).raw().toBuffer();
  let edge = 0, n = 0;
  const ch = a.length / (w * h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (xx > 1 && yy > 1 && xx < w - 2 && yy < h - 2) continue;
    const i = (yy * w + xx) * ch;
    edge += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3;
  }
  console.log(`colon ${colon.clock}: ${w}×${h}, edge differs by ${(edge / n).toFixed(2)} / 255`);
  pieces.push({ clock: colon.clock, input, frame: [x, 0, w, h], box: [left / K, top / K, w / K, h / K].map((q) => +q.toFixed(3)) });
  x += w + 2; height = Math.max(height, h);
}
await sharp({ create: { width: x, height, channels: 3, background: "#000" } })
  .composite(pieces.map((p) => ({ input: p.input, left: p.frame[0], top: 0 })))
  .webp({ lossless: true }).toFile(`${target}/office-colons-v${v}.webp`);
console.log(`office-colons-v${v}.webp`);

const layout = { ...office, colons: pieces.map(({ clock, frame, box }) => ({ clock, frame, box })) };
writeFileSync(path("src/levels/overtime/officeRender.json"), JSON.stringify(layout, null, 1) + "\n");
console.log("officeRender.json");
