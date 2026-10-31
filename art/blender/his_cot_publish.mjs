// Original sheet print and native material atlas; publish Cycles plates.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const root = fileURLToPath(new URL("../../", import.meta.url));
const out = `${root}/.artifacts/his-cot-native`;
const dest = `${root}/public/assets/images/Cot/native-v1`;
mkdirSync(out, { recursive: true });
mkdirSync(dest, { recursive: true });

let stars = "";
for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
  const x = 28 + col * 64 + (row % 2) * 20, y = 28 + row * 64;
  if ((row + col) % 3) {
    const points = Array.from({ length: 10 }, (_, j) => {
      const a = j * Math.PI / 5 - Math.PI / 2, r = j % 2 ? 2.3 : 5;
      return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`;
    }).join(" ");
    stars += `<polygon points="${points}" fill="#72888e" opacity=".53"/>`;
  } else stars += `<path d="M${x + 3},${y - 6}a6,6 0 1,0 0,12a4.8,5.7 0 0,1 0,-12" fill="#778b91" opacity=".48"/>`;
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#c9c0a8"/>${stars}</svg>`))
  .png().toFile(`${out}/sheet-print.png`);

// The same photographed CC0 surfaces already used by the house. All live
// toys use this atlas instead of the old generated nursery material image.
const scans = "C:/Users/crist/Tools/render/assets/textures";
const tile = 512;
const specs = [
  ["rosewood_veneer1", { r: 105, g: 65, b: 42 }],
  ["leather_red_02", { r: 138, g: 38, b: 42 }],
  [null, { r: 191, g: 177, b: 144 }],
  ["brown_leather", { r: 172, g: 145, b: 94 }],
  ["velour_velvet", { r: 145, g: 142, b: 131 }],
  ["distressed_painted_planks", { r: 188, g: 178, b: 153 }],
  [null, { r: 121, g: 55, b: 39 }],
  ["crepe_satin", { r: 139, g: 158, b: 164 }],
  ["quatrefoil_jacquard_fabric", { r: 192, g: 185, b: 167 }],
];
const patches = [];
for (const [i, [id, tint]] of specs.entries()) {
  let input;
  const scan = id && `${scans}/${id}/Diffuse.jpg`;
  if (scan && existsSync(scan)) {
    const { data } = await sharp(scan).resize(tile, tile, { fit: "cover" }).greyscale().normalise()
      .raw().toBuffer({ resolveWithObject: true });
    const pixels = Buffer.alloc(tile * tile * 3), colour = Object.values(tint);
    for (let p = 0; p < tile * tile; p++) {
      const relief = .60 + data[p] / 255 * .40;
      for (let c = 0; c < 3; c++) pixels[p * 3 + c] = Math.round(colour[c] * relief);
    }
    input = await sharp(pixels, { raw: { width: tile, height: tile, channels: 3 } }).png().toBuffer();
  } else {
    const pixels = Buffer.alloc(tile * tile * 3);
    let seed = 19610603 + i;
    for (let y = 0; y < tile; y++) for (let x = 0; x < tile; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = (seed / 4294967296 - .5) * 8;
      const mortar = i === 6 && (y % 48 < 2 || (x + (Math.floor(y / 48) % 2) * 32) % 64 < 2);
      for (let c = 0; c < 3; c++) pixels[(y * tile + x) * 3 + c] = Math.max(0, Math.min(255, Object.values(tint)[c] + noise - (mortar ? 30 : 0)));
    }
    input = await sharp(pixels, { raw: { width: tile, height: tile, channels: 3 } }).png().toBuffer();
  }
  patches.push({ input, left: (i % 3) * tile, top: Math.floor(i / 3) * tile });
}
await sharp({ create: { width: tile * 3, height: tile * 3, channels: 3, background: "#221e18" } })
  .composite(patches).webp({ quality: 94 }).toFile(`${dest}/materials.webp`);
if (process.argv.includes("--prepare")) process.exit(0);

for (const name of ["room", "front"]) {
  await sharp(`${out}/${name}.png`).webp({ quality: name === "room" ? 94 : 96, alphaQuality: 100 })
    .toFile(`${dest}/${name}.webp`);
  console.log(`Published Cot/native-v1/${name}.webp`);
}
const layout = JSON.parse(readFileSync(`${out}/nativeCot.json`, "utf8"));
writeFileSync(`${root}/src/levels/cot/nativeCot.json`, JSON.stringify(layout, null, 1) + "\n");
console.log(`Published nativeCot.json (${layout.width} × ${layout.height})`);
