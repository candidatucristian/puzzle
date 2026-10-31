// Ivy's Herbarium (herbarium_desk.py → .artifacts/herbarium-desk) into the
// game: the table with her album open on it; each of her five pages, its
// plants on its sheet; and where the top sheets lie in the book's picture
// (src/levels/herbarium/herbariumDesk.json).
//
//   node art/blender/herbarium_publish.mjs
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/herbarium-desk"), target = path("public/assets/images/Herbarium");
mkdirSync(target, { recursive: true });
const { version: v } = JSON.parse(readFileSync(`${source}/herbariumDesk.json`, "utf8"));
await sharp(`${source}/desk.png`).webp({ quality: 90 }).toFile(`${target}/desk-v${v}.webp`);
for (let i = 0; i < 5; i++) await sharp(`${source}/page-${i}.png`).webp({ quality: 92 }).toFile(`${target}/sheet-${i + 1}-v${v}.webp`);
copyFileSync(`${source}/herbariumDesk.json`, path("src/levels/herbarium/herbariumDesk.json"));
console.log(`desk-v${v}.webp`, `sheet-1…5-v${v}.webp`, "herbariumDesk.json");
