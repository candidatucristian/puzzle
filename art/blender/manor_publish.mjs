// The manor's render into the game: the picture as webp, and where its
// door, lantern, lit windows and wet ground are in it (src/ui/manorPlate.js).
//
//   node art/blender/manor_publish.mjs <render.png> <render.json> <version>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const [, , png, json, version = "v1"] = process.argv;
const root = (p) => decodeURIComponent(new URL(`../../${p}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");

const name = `ashcombe-exterior-render-${version}`;
await sharp(png).webp({ quality: 90 }).toFile(root(`public/assets/images/Manor/${name}.webp`));

const d = JSON.parse(readFileSync(json, "utf8"));
const r1 = (v) => Math.round(v * 10) / 10;
const pt = ([x, y]) => `[${r1(x)}, ${r1(y)}]`;
const xs = d.door.map((p) => p[0]), ys = d.door.map((p) => p[1]);
const js = `// Where things are in the manor's picture (${name}.webp, ${d.size[0]} × ${d.size[1]}),
// projected from the Blender scene it was rendered from (art/blender/manor.py;
// written by art/blender/manor_publish.mjs — do not edit by hand): the front
// door, the lantern hung over it, the lit windows, the wet drive and
// forecourt the rain rings, and the line where the drive meets the house.

export const MANOR_PICTURE = "${name}.webp";
export const PHOTO = { width: ${d.size[0]}, height: ${d.size[1]} };
export const DOOR = { x: ${r1(Math.min(...xs))}, y: ${r1(Math.min(...ys))}, w: ${r1(Math.max(...xs) - Math.min(...xs))}, h: ${r1(Math.max(...ys) - Math.min(...ys))} };
export const LANTERN = { x: ${r1(d.lantern.at[0])}, y: ${r1(d.lantern.at[1])}, rx: ${r1(d.lantern.rx)}, ry: ${r1(d.lantern.ry)} };
export const WINDOWS = [
${d.windows.map((w) => `  { x: ${r1(w.at[0])}, y: ${r1(w.at[1])}, rx: ${r1(w.rx)}, ry: ${r1(w.ry)} },`).join("\n")}
];
export const GROUND = [${d.ground.map(pt).join(", ")}];
export const HORIZON = ${r1(d.horizon)};
`;
writeFileSync(root("src/ui/manorPlate.js"), js);
console.log("published", name);
