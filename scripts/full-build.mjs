// The whole game for the web (`npm run build:full` → dist-full/): every room
// and every puzzle, the demo's locks off (house.js reads __FULL_BUILD__), and
// every door open without its key (ALL_DOORS_OPEN). Like the web demo, it
// plays the film re-encoded for the web (IntroVideo-web.mp4), so the 52 MB
// original is left out of the output.
import { existsSync, rmSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const size = (path) => statSync(path).isDirectory() ? readdirSync(path).reduce((n, name) => n + size(join(path, name)), 0) : statSync(path).size;
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

export function fullBuild() {
  let outDir = "";
  return {
    name: "full-build",
    apply: "build",
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const film = join(outDir, "assets", "video", "IntroVideo.mp4");
      if (existsSync(film)) rmSync(film);
      if (existsSync(outDir)) console.log(`[full] the whole game, every door open: ${mb(size(outDir))}`);
    },
  };
}
