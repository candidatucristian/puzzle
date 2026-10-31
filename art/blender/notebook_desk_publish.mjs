// Silas's Notebook (notebook_desk.py → .artifacts/notebook-desk) into the
// game: the desk with the notebook open on it, and where the book's own
// picture lies in it and its top sheets in that (src/levels/molecules/notebookDesk.json).
//
//   node art/blender/notebook_desk_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const desk = JSON.parse(readFileSync(path(".artifacts/notebook-desk/notebookDesk.json"), "utf8"));
mkdirSync(path("public/assets/images/Molecules"), { recursive: true });
await sharp(path(".artifacts/notebook-desk/desk.png")).webp({ quality: 92 }).toFile(path(`public/assets/images/Molecules/notebook-desk-v${desk.version}.webp`));
writeFileSync(path("src/levels/molecules/notebookDesk.json"), JSON.stringify(desk, null, 1) + "\n");
console.log(`notebook-desk-v${desk.version}.webp`, "notebookDesk.json");
