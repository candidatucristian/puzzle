// The files in public/ that the game no longer loads: older versions of a
// render the code has moved past (it names the current one, or reads its
// version from a JSON beside the scene), and notes that were never meant to
// ship (the prompt files). Each rule says where its current version is read
// from; a file any source names outright is never listed.
//
//   node scripts/unused-assets.mjs            list them, with their size
//   node scripts/unused-assets.mjs --json     the same as JSON (the to-do page reads it)
//   node scripts/unused-assets.mjs --move     move them to .artifacts/removed-assets/<date>/,
//                                             where they wait to be deleted by hand
import { readFileSync, readdirSync, statSync, mkdirSync, renameSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const json = (file) => JSON.parse(readFileSync(join(ROOT, file), "utf8"));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const rel = (file) => relative(ROOT, file).split(sep).join("/");

// every source that can name an asset: the game's, and the tools that still
// read one (a Blender script that starts from an older render keeps it)
const tools = ["art", "tools", "scripts"].flatMap((dir) => (existsSync(join(ROOT, dir)) ? walk(join(ROOT, dir)) : []))
  .filter((f) => /\.(js|mjs|cjs|py)$/.test(f) && !f.endsWith("unused-assets.mjs"));
const sources = [...walk(join(ROOT, "src")), join(ROOT, "index.html"), ...walk(join(ROOT, "public")).filter((f) => /\.webmanifest$/.test(f)), ...tools]
  .filter((f) => /\.(js|mjs|cjs|py|json|css|html|webmanifest)$/.test(f));
const corpus = sources.map((f) => readFileSync(f, "utf8")).join("\n");
// named by its path, or by its file name where no other file shares it (a
// name like room.webp is in every version's folder, and names none of them)
const PUBLIC = walk(join(ROOT, "public")).map(rel);
const sharing = new Map();
for (const file of PUBLIC) { const base = file.split("/").pop(); sharing.set(base, (sharing.get(base) ?? 0) + 1); }
const named = (path) => {
  const base = path.split("/").pop();
  return corpus.includes(path.replace(/^public\//, "")) || (sharing.get(base) === 1 && corpus.includes(base));
};

// where each scene reads its current version
const COFFER = json("src/levels/house/nativeCoffer.json");
const chestVersion = (room) => COFFER.rooms[room]?.artVersion ?? COFFER.version;
const ROOM_OF = { study: "Study", room2: "Room2", room3: "Room3", room4: "Room4", room5: "Room5", room6: "Room6" };
const PLANT = json("src/levels/plantpot/blenderPlantData.json");
const PLANT_KEEP = new Set([...PLANT.leaves.map((l) => l.file), PLANT.shadow?.file, PLANT.backgroundFile, PLANT.window?.file,
  `stems-v${PLANT.artVersion ?? PLANT.botanicalVersion}.webp`, ...Array.from({ length: 6 }, (_, i) => `bucket-${i}-${PLANT.bucketVersion}.webp`)]);
const ROOM_RENDER = readFileSync(join(ROOT, "src/levels/house/roomRender.js"), "utf8");
const roomVersion = (folder) => Number(new RegExp(`folder: "${folder}", version: (\\d+)`).exec(ROOM_RENDER)?.[1] ?? NaN);

const RULES = [
  { why: "older render of the Old Tree (nativeTree.json)", test: (p) => /BinaryTree\/old-tree-native-v(\d+)\.webp$/.exec(p)?.[1], keep: () => json("src/levels/binarytree/nativeTree.json").version },
  { why: "older render of the library bookcase (nativeLibrary.json)", test: (p) => /Bookshelf\/native-v(\d+)\//.exec(p)?.[1], keep: () => json("src/levels/bookshelf/nativeLibrary.json").version },
  { why: "older render of the cot (nativeArt.js loads native-v5)", test: (p) => /Cot\/native-v(\d+)\//.exec(p)?.[1], keep: () => 5 },
  { why: "older render of the router (nativeModem.json)", test: (p) => /Modem\/native-v(\d+)\//.exec(p)?.[1], keep: () => json("src/levels/modem/nativeModem.json").version },
  { why: "older render of the office (officeRender.json)", test: (p) => /Overtime\/office-\w+-v(\d+)\.webp$/.exec(p)?.[1], keep: () => json("src/levels/overtime/officeRender.json").version },
  { why: "older room render (roomRender.js)", test: (p) => /images\/(Room[123])\/room[123]-lights-1-render-v(\d+)\.webp$/.exec(p)?.slice(1), keep: ([folder]) => roomVersion(folder), version: ([, v]) => v },
  { why: "a room's chest rendered in the room's folder: the chests now come from Chest/ (roomRender.js)", test: (p) => /images\/Room\d+\/room\d+-chest-(open|shut)-render-v\d+\.webp$/.test(p) ? "x" : null, keep: () => "none" },
  // (checked by hand on 2026-11-07: neither the game nor any tool under art/,
  //  tools/ or scripts/ names these, by path, by name or by a template)
  { why: "named nowhere: neither the game nor its tools load it (checked by hand)", keep: () => "none", byHand: true,
    test: (p) => [
      "Attic/narrow-passage-photo-v2.webp", "Attic/storage.webp", "Attic/surface-atlas.webp", "Attic/walnut-door-worn-v1.webp",
      "Chest/gold-chest-states.webp", "Cot/cot-closeup-v1.webp", "Cot/cot-room-v1.webp", "Cryptex/rotor-photographic-v1.webp",
      "PlantPot/potting-bench-materials.webp", "Prologue/inspector-desk.webp", "Prologue/inspector-nameplate.webp", "Prologue/inspector-nameplate-v2.webp",
      "Room6/room6-photographic-v1.webp", "Room6/sisters-portraits-v1.webp", "Telescope/refractor.webp", "Compass/cabin-photographic-v1.webp",
      "Lightswitch/Samuel.png", "Lightswitch/Samuel.webp", "PlantPot/leaf.webp",
      // (the old favicon set, replaced by the manor-*.png set: favicon/about.txt)
      "favicon/android-chrome-192x192.png", "favicon/android-chrome-512x512.png", "favicon/apple-touch-icon.png", "favicon/favicon-32x32.png",
    ].some((name) => p.endsWith(`images/${name}`)) ? "x" : null },
  { why: "older render of a room's chest (nativeCoffer.json)", test: (p) => { const m = /Chest\/native-v(\d+)\/(study|room\d)-/.exec(p); return m && ROOM_OF[m[2]] ? m.slice(1) : null; }, keep: ([, room]) => chestVersion(ROOM_OF[room]), version: ([v]) => v },
  { why: "older Blender plant, pail or garden (blenderPlantData.json)", test: (p) => /PlantPot\/Blender\/([^/]+\.webp)$/.exec(p)?.[1], keep: () => null, judge: (file) => !PLANT_KEEP.has(file) },
  { why: "older Room VI portrait or plate (nurseryPortraits.js / photographicRoom.js)", test: (p) => /Room6\/(botanical-family-portrait(-night)?-v\d+\.webp|room6-blender-realistic-v\d+\.webp)$/.exec(p)?.[1], keep: () => null,
    judge: (file) => !["botanical-family-portrait-night-v5.webp", "room6-blender-realistic-v5.webp"].includes(file) },
  { why: "image-generation prompt notes: never loaded, and they belong with the art's records, not in the game", test: (p) => /\.prompts?\.md$|\/prompt\.md$|\/prompts\.md$/.test(p) ? "x" : null, keep: () => "none" },
];

// The photographic fallbacks: modules whose load function no scene calls any
// more (the scenes draw their Blender renders instead). A picture only they
// name is never loaded. (Their code is still there: to-do page.)
const GAME = sources.filter((f) => !tools.includes(f)).map((f) => [rel(f), readFileSync(f, "utf8")]);
const DEAD = [
  ["src/levels/binarytree/photographicTerrarium.js", "loadTerrariumPhotography"], ["src/levels/cot/photography.js", "loadCotPhotography"],
  ["src/levels/cryptex/photographicMaterials.js", "loadCryptexPhotography"], ["src/levels/plantpot/photographicGarden.js", "loadPhotographicGarden"],
  ["src/levels/plantpot/photographicPlant.js", "loadPlantPhotography"], ["src/levels/compass/photographicCabin.js", "loadCabinPhotography"],
  ["src/levels/bookshelf/photographicLibrary.js", "loadLibraryPhotography"], ["src/levels/telescope/photographicWindow.js", "loadWindowPhotography"],
].filter(([file]) => existsSync(join(ROOT, file))) // (some deleted 2026-11-13)
  .filter(([, fn]) => !GAME.some(([, text]) => new RegExp(`(?<!function )\\b${fn}\\(`).test(text))).map(([file]) => file);
const onlyDead = (path) => {
  const base = path.split("/").pop();
  const by = GAME.filter(([, text]) => text.includes(path.replace(/^public\//, "")) || text.includes(base)).map(([f]) => f);
  return by.length > 0 && by.every((f) => DEAD.includes(f));
};
RULES.push({ why: "loaded only by a photographic fallback no scene calls any more (generated pictures)", test: (p) => /\.(webp|png|jpe?g)$/.test(p) && onlyDead(p) ? "x" : null, keep: () => "none" });

const unused = [];
for (const file of PUBLIC) {
  if (onlyDead(file)) { unused.push({ file, why: RULES.at(-1).why, size: statSync(join(ROOT, file)).size }); continue; }
  // (the list checked by hand stands even where a comment still names a file)
  const byHand = RULES.find((rule) => rule.byHand);
  if (byHand.test(file)) { unused.push({ file, why: byHand.why, size: statSync(join(ROOT, file)).size }); continue; }
  if (named(file) && !/\.md$/.test(file)) continue;
  for (const rule of RULES) {
    const hit = rule.test(file);
    if (!hit) continue;
    const gone = rule.judge ? rule.judge(hit) : String(rule.version ? rule.version(hit) : hit) !== String(rule.keep(hit));
    if (gone) unused.push({ file, why: rule.why, size: statSync(join(ROOT, file)).size });
    break;
  }
}

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const total = unused.reduce((n, u) => n + u.size, 0);
if (process.argv.includes("--json")) { console.log(JSON.stringify({ total, files: unused }, null, 1)); process.exit(0); }
if (process.argv.includes("--move")) {
  const dest = join(ROOT, ".artifacts/removed-assets", new Date().toISOString().slice(0, 10));
  for (const { file } of unused) {
    const to = join(dest, file);
    mkdirSync(dirname(to), { recursive: true });
    if (existsSync(join(ROOT, file))) renameSync(join(ROOT, file), to);
  }
  console.log(`moved ${unused.length} files (${mb(total)}) to ${rel(dest)}`);
  process.exit(0);
}
const byWhy = Object.groupBy(unused, (u) => u.why);
for (const [why, list] of Object.entries(byWhy)) {
  console.log(`\n${why} — ${list.length} files, ${mb(list.reduce((n, u) => n + u.size, 0))}`);
  for (const u of list) console.log(`   ${u.file}`);
}
console.log(`\n${unused.length} files, ${mb(total)}`);
