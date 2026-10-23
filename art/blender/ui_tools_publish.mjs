// Publishes all Blender 4.5 Cycles UI renders from .artifacts/blender-ui/
// into public/assets/images/CaseFile/ and public/assets/images/Interface/ as WebP.
//
//   node art/blender/ui_tools_publish.mjs
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");

const root = (p) =>
  decodeURIComponent(new URL(`../../${p}`, import.meta.url).pathname).replace(
    /^\/(\w:)/,
    "$1"
  );

const srcDir = root(".artifacts/blender-ui");
const caseFileDir = root("public/assets/images/CaseFile");
const interfaceDir = root("public/assets/images/Interface");

mkdirSync(caseFileDir, { recursive: true });
mkdirSync(interfaceDir, { recursive: true });

const ASSETS = [
  // Case File & Notebook shared 3D Blender materials
  { name: "dossier-cover-board-v4", dest: caseFileDir, quality: 92, trim: true },
  { name: "dossier-leather-real-v1", dest: caseFileDir, quality: 90, trim: false },
  { name: "dossier-paper-aged-v3", dest: caseFileDir, quality: 92, trim: true },
  { name: "dossier-index-aged-v3", dest: caseFileDir, quality: 92, trim: true },
  { name: "dossier-sheet-v2", dest: caseFileDir, quality: 92, trim: true },
  { name: "dossier-steel-binding-v3", dest: caseFileDir, quality: 94, trim: true },
  { name: "letter-paper-v2", dest: caseFileDir, quality: 92, trim: true },
  { name: "red-wax-seal", dest: caseFileDir, quality: 94, trim: true },
  { name: "envelope-back", dest: caseFileDir, quality: 92, trim: true },
  { name: "evidence-tag-3d", dest: caseFileDir, quality: 92, trim: true },
  // Notebook 3D folder tabs & sketch pad
  { name: "notebook-folder-tab-3d", dest: caseFileDir, quality: 92, trim: true },
  { name: "notebook-folder-tab-open-3d", dest: caseFileDir, quality: 92, trim: true },
  { name: "notebook-sketch-paper-3d", dest: caseFileDir, quality: 90, trim: false },
  // Map 3D drafting board & folded vellum sheet
  { name: "map-board-3d", dest: caseFileDir, quality: 92, trim: true },
  // 3D Header Buttons
  { name: "btn-map-3d", dest: interfaceDir, quality: 94, trim: true },
  { name: "btn-notebook-3d", dest: interfaceDir, quality: 94, trim: true },
  { name: "btn-casefile-3d", dest: interfaceDir, quality: 94, trim: true },
];

for (const item of ASSETS) {
  const inPath = path.join(srcDir, `${item.name}.png`);
  if (!existsSync(inPath)) continue;
  const outPath = path.join(item.dest, `${item.name}.webp`);
  let pipeline = sharp(inPath);
  if (item.trim) {
    pipeline = pipeline.trim({ threshold: 2 });
  }
  await pipeline
    .webp({ quality: item.quality, alphaQuality: 100 })
    .toFile(outPath);
  console.log(`Published: ${path.relative(root(""), outPath)}`);
}

