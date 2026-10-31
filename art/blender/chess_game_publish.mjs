// The Unfinished Game (chess_game.py → .artifacts/chess-game) into the game:
// the plate, the board without its pieces; one atlas of the eight pieces and
// their eight shadows, each where its render was cut from; and where they
// all fall in the picture (src/levels/chessboard/chessGame.json).
//
//   node art/blender/chess_game_publish.mjs [--check <png>]   (--check: the
//   plate with everything laid back on, to compare with a still)
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const source = path(".artifacts/chess-game"), target = path("public/assets/images/Chessboard");
mkdirSync(target, { recursive: true });
const game = JSON.parse(readFileSync(`${source}/chessGame.json`, "utf8"));
const v = game.version;

await sharp(`${source}/plate.png`).webp({ quality: 90 }).toFile(`${target}/chess-plate-v${v}.webp`);
console.log(`chess-plate-v${v}.webp`);

// the pieces and their shadows (soft: kept at half the size), packed in
// shelves, the tallest first
const items = [];
for (const [i, p] of game.pieces.entries()) {
  items.push({ i, kind: "piece", file: `${source}/piece-${i}.png`, crop: p.crop, w: p.crop[2], h: p.crop[3] });
  const [, , sw, sh] = p.shadowCrop, w = Math.ceil(sw / 2), h = Math.ceil(sh / 2);
  const input = await sharp(`${source}/shadow-${i}.png`).resize(w, h).png().toBuffer();
  items.push({ i, kind: "shadow", file: `${source}/shadow-${i}.png`, input, crop: p.shadowCrop, w, h });
}
const ROW = 2048;
let cx = 0, cy = 0, shelf = 0, width = 0;
for (const it of [...items].sort((a, b) => b.h - a.h)) {
  if (cx + it.w > ROW) { cx = 0; cy += shelf + 2; shelf = 0; }
  it.frame = [cx, cy, it.w, it.h];
  cx += it.w + 2; shelf = Math.max(shelf, it.h); width = Math.max(width, cx);
}
const height = cy + shelf;
await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(items.map((it) => ({ input: it.input ?? it.file, left: it.frame[0], top: it.frame[1] })))
  .webp({ quality: 92, alphaQuality: 100 }).toFile(`${target}/chess-pieces-v${v}.webp`);
console.log(`chess-pieces-v${v}.webp`, `${width}×${height}`);

const check = process.argv.indexOf("--check");
if (check > 0) {
  const order = items.filter((it) => it.kind === "shadow").concat(items.filter((it) => it.kind === "piece").sort((a, b) => game.pieces[b.i].rank - game.pieces[a.i].rank));
  await sharp(`${source}/plate.png`).composite(order.map((it) => ({ input: it.file, left: it.crop[0], top: it.crop[1] }))).png().toFile(process.argv[check + 1]);
  console.log("check", process.argv[check + 1]);
}

for (const it of items) {
  const p = game.pieces[it.i];
  if (it.kind === "piece") p.frame = it.frame; else p.shadowFrame = it.frame;
}
for (const p of game.pieces) { delete p.crop; delete p.shadowCrop; }
writeFileSync(path("src/levels/chessboard/chessGame.json"), JSON.stringify({ ...game, atlas: [width, height] }, null, 1) + "\n");
console.log("chessGame.json");
