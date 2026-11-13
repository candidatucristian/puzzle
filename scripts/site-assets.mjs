// The pictures, type and icons the website (site/, ashcombemanor.com) shows,
// made from the game's own: the manor at night as the start screen has it
// (with its wind), the first three rooms made smaller, a picture for links
// shared on social sites, the favicon and the typeface. Written into
// site/public/, which is not kept in git: run before the site is served or
// built (npm run dev:site / build:site do).
//
//   node scripts/site-assets.mjs
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const GAME = join(ROOT, "public/assets");
const OUT = join(ROOT, "site/public");
rmSync(OUT, { recursive: true, force: true });
const copy = (from, to) => { mkdirSync(dirname(join(OUT, to)), { recursive: true }); copyFileSync(join(GAME, from), join(OUT, to)); };

// the manor, its trees' matte and what they uncover (src/ui/manorExterior.js
// and manorWind.js read them from assets/images/Manor/)
for (const name of ["ashcombe-exterior-render-v2.webp", "ashcombe-wind-background-v1.webp", "ashcombe-wind-trees-v1.webp"])
  copy(`images/Manor/${name}`, `assets/images/Manor/${name}`);

// the first three rooms, each as its room's own plate shows it
mkdirSync(join(OUT, "images"), { recursive: true });
const ROOMS = [["Room1/room1-lights-1-render-v12.webp", "room-1"], ["Room2/room2-lights-1-render-v11.webp", "room-2"], ["Room3/room3-lights-1-render-v3.webp", "room-3"]];
for (const [from, name] of ROOMS)
  await sharp(join(GAME, "images", from)).resize({ width: 1440 }).webp({ quality: 82 }).toFile(join(OUT, "images", `${name}.webp`));

// the picture a shared link shows: the manor, 1200 x 630
await sharp(join(GAME, "images/Manor/ashcombe-exterior-render-v2.webp"))
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .modulate({ brightness: 1.15 })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(join(OUT, "images/og.jpg"));

// the favicon, as the game has it
for (const name of ["manor.svg", "manor-32.png", "manor-180.png", "manor-192.png", "manor-512.png"])
  copy(`images/favicon/${name}`, `favicon/${name}`);

// the typeface of the start screen (SIL Open Font License, its text beside it)
for (const name of ["ibm-plex-sans-latin-variable.woff2", "ibm-plex-sans-latin-ext-variable.woff2", "IBM-Plex-OFL.txt"])
  copy(`fonts/ui/${name}`, `fonts/${name}`);

console.log("site/public written");
