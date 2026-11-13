// Publishes letter_held.py's renders for the game:
//   public/assets/images/CaseFile/letter/held/<id>.webp        the sheet held up, at rest (1920×1080, transparent round it)
//   public/assets/images/CaseFile/letter/held/<id>-icon.webp   the sheet alone, small (the side panel)
//   public/assets/video/letters/<id>-lifted.webm               its being lifted into view (VP9 with alpha)
//   src/ui/letterHeld.json   where the sheet and its words lie on the picture,
//                            and how long the film is
// (The game itself lies behind the sheet, blurred: letterArrival.js.)
//
//   node art/blender/letter_held_publish.mjs [--only ivy,orion] [--crf 26]
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const root = fileURLToPath(new URL("../../", import.meta.url));
const from = `${root}.artifacts/letter-pages/held/`;
const pictures = `${root}public/assets/images/CaseFile/letter/held/`;
const films = `${root}public/assets/video/letters/`;
const FFMPEG = "C:/Users/crist/Tools/ffmpeg-dl/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe";
const opt = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const only = opt("--only", "").split(",").filter(Boolean);
mkdirSync(pictures, { recursive: true }); mkdirSync(films, { recursive: true });
const layout = JSON.parse(readFileSync(`${from}letterHeld.json`, "utf8"));
const outPath = `${root}src/ui/letterHeld.json`;
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
for (const [id, page] of Object.entries(layout)) {
  if (only.length && !only.includes(id)) continue;
  const still = `${from}${id}-still.png`;
  await sharp(still).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(`${pictures}${id}.webp`);
  // the icon: the sheet cut out of the still
  const [W, H] = page.frame, [x0, y0, x1, y1] = page.sheet, m = 0.006;
  const box = { left: Math.round((x0 - m) * W), top: Math.round((y0 - m) * H) };
  box.width = Math.round((x1 + m) * W) - box.left; box.height = Math.round((y1 + m) * H) - box.top;
  await sharp(still).extract(box).resize({ height: 200, width: 200, fit: "inside" }).webp({ quality: 86, alphaQuality: 100 }).toFile(`${pictures}${id}-icon.webp`);
  execFileSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(page.film.fps), "-start_number", "0",
    "-i", `${from}${id}-film/f%04d.png`, "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuva420p",
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", opt("--crf", "26"), "-deadline", "good", "-cpu-used", "1",
    "-row-mt", "1", "-auto-alt-ref", "0", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-an", `${films}${id}-lifted.webm`], { stdio: "inherit" });
  rmSync(`${films}${id}-lifted.mp4`, { force: true });   // (the opaque film with the room in it, superseded)
  out[id] = { frame: page.frame, sheet: page.sheet, text: page.text, film: { seconds: page.film.seconds } };
  console.log("published", id);
}
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
