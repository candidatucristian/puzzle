// The web demo's build: `npm run build:demo` → dist-demo/. The hall and Rooms
// I to III only (DEMO_PLACES in src/shared/house.js). vite.config.js turns this
// on for `--mode demo`, and with it:
//  - registry.js and config.js leave out the scenes of the rooms past the
//    demo's and of the puzzles in them (__DEMO_BUILD__);
//  - nothing that ships gives away a puzzle the demo does not hold: their
//    answers, hint texts and working notes are taken out of metadata.js,
//    hints.js and the three locales as they are built (the demo's own puzzles
//    keep their answers and hints, and lose only the working notes);
//  - the modules of the rooms and puzzles it does not hold are dropped whole,
//    data and all;
//  - the pictures and sounds of the later rooms and puzzles are left out of
//    dist-demo — each folder only if nothing in the demo's code names it,
//    save those only the floors up the stairs load;
//  - the original film is left out: the demo plays IntroVideo-web.mp4.
import { readFileSync, readdirSync, rmSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES, DEMO_PLACES, DEMO_SEALED } from "../src/shared/house.js";
import { compressBuild } from "./compress-assets.mjs";

// (import.meta.url, which Vite keeps true when it bundles the config)
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const source = (file) => readFileSync(join(ROOT, file), "utf8");

// the levels, as metadata.js lists them (its array is JSON)
const ARRAY = "const metadata = ";
function metadataArray(code) {
  const start = code.indexOf(ARRAY) + ARRAY.length, end = code.indexOf("\n];", start) + 2;
  if (start < ARRAY.length || end < 2) throw new Error("demo build: metadata.js has changed shape");
  return { start, end, levels: JSON.parse(code.slice(start, end)) };
}
const LEVELS = metadataArray(source("src/levels/metadata.js")).levels;
// (the halls up the stairs can be walked into, but their puzzles are shut in
// the demo: they are left out like the later rooms', answers and all)
const IN_DEMO = new Set(PLACES.filter((place) => DEMO_PLACES.includes(place.key)).flatMap((place) => place.holds).filter((id) => !DEMO_SEALED.includes(id)));
const LEFT_OUT = LEVELS.filter((level) => !IN_DEMO.has(level.id));

// the asset folders that may go: the later puzzles', the later rooms', and
// the upper floors'
const FOLDERS = [...new Set([
  ...LEFT_OUT.map((level) => level.key),
  ...PLACES.filter((place) => !DEMO_PLACES.includes(place.key) && /^Room\d+$/.test(place.key)).map((place) => place.key),
  "Attic", "Crossing", "Colors",
])];
// ...and those that go even though the demo's code names them: only the
// floors up the stairs load them (HallScene.js: the upper hall its Chemistry
// plates and the light switch's sounds, the top passage its Attic), and the
// demo's build has no scenes for those floors (core/config.js)
// (the Chemistry hall's plates and the light switch's sounds ship since
// 2026-11-13: the demo walks into that hall; the top passage's Attic does not)
const UPSTAIRS_ONLY = ["images/Attic"];

// the folders under src/levels/ the demo plays in: the hall's, its rooms', and
// those of the puzzles in them (read off registry.js's imports). Every other
// folder's modules are marked free of side effects, so that the bundler drops
// them whole where the demo uses nothing of them — not only their scenes, but
// the data they work out as they load (a puzzle's answer among it).
const REGISTRY = source("src/levels/registry.js");
const folderOf = Object.fromEntries([...REGISTRY.matchAll(/^import (\w+) from "\.\/(\w+)\//gm)].map(([, name, dir]) => [name, dir]));
const sceneOf = Object.fromEntries([...REGISTRY.matchAll(/^\s+(\w+): (\w+Scene),\s*$/gm)].map(([, key, name]) => [key, name]));
const PLAYED = new Set(["hall", "house", "study", "room2", "room3", "top", ...LEVELS.filter((level) => IN_DEMO.has(level.id)).map((level) => {
  const dir = folderOf[sceneOf[level.key]];
  if (!dir) throw new Error(`demo build: no folder found in registry.js for ${level.key}`);
  return dir;
})]);

const asModule = async (code) => import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const size = (path) => {
  const stat = statSync(path);
  return stat.isDirectory() ? readdirSync(path).reduce((n, name) => n + size(join(path, name)), 0) : stat.size;
};
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

export function demoBuild() {
  let outDir = "";
  return {
    name: "demo-build",
    enforce: "pre",
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    async transform(code, id) {
      const file = id.replace(/\\/g, "/").split("?")[0];
      if (file.endsWith("/src/levels/metadata.js")) {
        const { start, end, levels } = metadataArray(code);
        for (const level of levels) {
          level.description = "";
          level.references = [];
          if (IN_DEMO.has(level.id)) continue;
          level.code = null;
          level.altCode = null;
          level.hint = { ...level.hint, text: "" };
        }
        return { code: code.slice(0, start) + JSON.stringify(levels, null, 2) + code.slice(end), map: null };
      }
      if (file.endsWith("/src/levels/hints.js")) {
        const { HINT_DETAILS } = await asModule(code);
        const kept = Object.fromEntries(Object.entries(HINT_DETAILS).map(([id, steps]) => [id, IN_DEMO.has(id) ? steps : []]));
        return { code: `export const HINT_DETAILS = ${JSON.stringify(kept, null, 2)};\n`, map: null };
      }
      const locale = /\/src\/locales\/(\w+)\.js$/.exec(file);
      if (locale) {
        const strings = (await asModule(code))[locale[1]];
        if (!strings) throw new Error(`demo build: ${file} does not export ${locale[1]}`);
        for (const id of Object.keys(strings.levelHints ?? {})) if (!IN_DEMO.has(id)) strings.levelHints[id] = [];
        return { code: `export const ${locale[1]} = ${JSON.stringify(strings, null, 2)};\n`, map: null };
      }
      const level = /\/src\/levels\/(\w+)\/.*\.(js|json)$/.exec(file);
      if (level && !PLAYED.has(level[1])) return { code, map: null, moduleSideEffects: false };
      return null;
    },
    async closeBundle() {
      if (!outDir || !existsSync(join(outDir, "assets"))) return;
      // what the demo's own code says, to keep any folder it names
      const chunks = readdirSync(join(outDir, "assets")).filter((name) => /\.(js|css)$/.test(name));
      const said = [readFileSync(join(outDir, "index.html"), "utf8"), ...chunks.map((name) => readFileSync(join(outDir, "assets", name), "utf8"))].join("\n");
      let gone = 0;
      const kept = [];
      for (const kind of ["images", "sounds"]) {
        for (const folder of FOLDERS) {
          const path = join(outDir, "assets", kind, folder);
          if (!existsSync(path)) continue;
          if (said.includes(`${kind}/${folder}/`) && !UPSTAIRS_ONLY.includes(`${kind}/${folder}`)) { kept.push(`${kind}/${folder}`); continue; }
          gone += size(path);
          rmSync(path, { recursive: true, force: true });
        }
      }
      const film = join(outDir, "assets", "video", "IntroVideo.mp4");
      if (existsSync(film)) { gone += size(film); rmSync(film); }
      console.log(`\n[demo] ${IN_DEMO.size} puzzles in the demo, ${LEFT_OUT.length} left out with their answers and hints`);
      console.log(`[demo] later rooms' and puzzles' pictures and sounds left out: ${mb(gone)}; the demo is ${mb(size(outDir))}`);
      if (kept.length) console.log(`[demo] kept, because the demo's code names them: ${kept.join(", ")}`);
      // and what is left, made smaller for the net (scripts/compress-assets.mjs)
      await compressBuild(outDir, "demo");
      console.log(`[demo] the demo, compressed: ${mb(size(outDir))}`);
    },
  };
}
