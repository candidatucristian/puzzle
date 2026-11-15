// Publishes puzzle_letter.py's renders: every letter opened in a puzzle, the
// same sheet with its own words, its shadow in its alpha. Each goes beside
// its puzzle's other pictures; src/shared/paperLetter.js shows them.
//
//   node art/blender/puzzle_letter_publish.mjs
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const root = fileURLToPath(new URL("../../", import.meta.url));
const LETTERS = {
  cryptex: "public/assets/images/Cryptex/native-v1/letter-open.webp",
  compass: "public/assets/images/Compass/native-bottle-v1/letter.webp",
};
for (const [id, to] of Object.entries(LETTERS)) {
  const from = `${root}.artifacts/puzzle-letters/${id}.png`;
  if (!existsSync(from)) { console.log("not rendered:", id); continue; }
  await sharp(from).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(`${root}${to}`);
  console.log("published", id, "→", to);
}
