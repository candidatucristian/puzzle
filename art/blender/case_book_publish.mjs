// The case book (case_book.py, case_book_tab.py → .artifacts/case-book) into
// the game: the open book, alone on nothing but its shadow; its index tabs;
// and where its two top sheets lie in the picture (src/ui/caseBookArt.json) —
// caseBook.js cuts its pages out of it.
//
//   node art/blender/case_book_publish.mjs
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const art = JSON.parse(readFileSync(path(".artifacts/case-book/caseBook.json"), "utf8"));
// (and its index tabs, case_book_tab.py: where in their picture the root is)
art.tab = JSON.parse(readFileSync(path(".artifacts/case-book/caseBookTab.json"), "utf8"));
mkdirSync(path("public/assets/images/CaseFile"), { recursive: true });
const out = `public/assets/images/CaseFile/case-book-v${art.version}.webp`;
await sharp(path(".artifacts/case-book/book.png")).webp({ quality: 90, alphaQuality: 90, effort: 6 }).toFile(path(out));
for (const key of ["tab", "tab-here"]) {
  await sharp(path(`.artifacts/case-book/${key}.png`)).webp({ quality: 92, alphaQuality: 92, effort: 6 }).toFile(path(`public/assets/images/CaseFile/case-book-${key}-v${art.version}.webp`));
}
writeFileSync(path("src/ui/caseBookArt.json"), JSON.stringify(art, null, 1) + "\n");
console.log(out, "src/ui/caseBookArt.json");
