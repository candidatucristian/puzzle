// The letter on the desk (letter_film.py → .artifacts/letter-film) into the
// game (ui/letterArrival.js): the film of it opened, and backward and faster
// the film of it folded up again (letter_film_encode.py); its first and last
// frames; the envelope alone for the side panel; and what the game needs to
// know of them — where the paper lies in the last frame, where the envelope
// lies in the first, and when to make each sound (src/ui/letterFilm.json).
//
//   node art/blender/letter_film_publish.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const path = (rel) => decodeURIComponent(new URL(`../../${rel}`, import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const BLENDER = "C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe";
const IN = (name) => path(`.artifacts/letter-film/${name}`);
const IMAGES = path("public/assets/images/CaseFile/letter");
mkdirSync(IMAGES, { recursive: true });

const film = JSON.parse(readFileSync(IN("letterFilm.json"), "utf8"));
const encode = (args) => execFileSync(BLENDER, ["-b", "--factory-startup", "-P", path("art/blender/letter_film_encode.py"), "--", ...args], { stdio: "inherit" });
const fold = film.fold;
encode(["--from", "1", "--to", String(film.frames), "--out", "public/assets/video/letter-open.mp4"]);
encode(["--from", String(fold.from), "--to", String(fold.to), "--step", String(fold.step), "--out", "public/assets/video/letter-fold.mp4"]);

const frame = (n) => IN(`frame-${String(n).padStart(4, "0")}.png`);
await sharp(frame(1)).webp({ quality: 86 }).toFile(`${IMAGES}/letter-first.webp`);
await sharp(frame(film.frames)).webp({ quality: 86 }).toFile(`${IMAGES}/letter-last.webp`);
await sharp(IN("envelope.png")).webp({ quality: 90, alphaQuality: 100 }).toFile(`${IMAGES}/envelope-sealed.webp`);

// the folding film runs backward from the last frame, `step` frames at a time
const foldFrames = Math.floor((fold.from - fold.to) / fold.step) + 1;
const inFold = (n) => Math.round(((fold.from - n) / fold.step / film.fps) * 1000) / 1000;
writeFileSync(path("src/ui/letterFilm.json"), JSON.stringify({
  width: film.width, height: film.height, paper: film.paper, envelope: film.envelope, icon: film.icon,
  open: { src: "letter-open.mp4", duration: film.frames / film.fps, cues: film.cues },
  fold: { src: "letter-fold.mp4", duration: foldFrames / film.fps, cues: Object.fromEntries(Object.entries(fold.cues).map(([k, n]) => [k, inFold(n)])) },
  stills: { first: "letter-first.webp", last: "letter-last.webp", envelope: "envelope-sealed.webp" },
}, null, 2) + "\n");
console.log("published: letter-open.mp4, letter-fold.mp4, stills, envelope; src/ui/letterFilm.json");
