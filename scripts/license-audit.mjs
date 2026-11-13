// The licence audit behind the to-do page (todo/, http://127.0.0.1:5173/todo/):
// every file the game ships, where it comes from as far as the project can
// show it, and what is still to be found out. Writes todo/audit.json.
//
//   node scripts/license-audit.mjs
//
// Where a file comes from is read off the evidence the project keeps:
//   - Blender: a script under art/ names the file, or publishes into its folder
//   - AI:      a prompt note (docs/asset-provenance/ai-prompts/) names it
//   - known:   a licence or source note beside it (fonts, favicon, manor)
//   - unknown: nothing says — to be confirmed by hand
// Sounds are all Pixabay downloads whose pages were not kept (docs/SOUND_SOURCES.md).
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, openSync, readSync, closeSync } from "node:fs";
import { join, relative, sep, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES, DEMO_PLACES } from "../src/shared/house.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : []);
const rel = (file) => relative(ROOT, file).split(sep).join("/");
const read = (file) => readFileSync(file, "utf8");
const stem = (name) => name.replace(/\.[^.]+$/, "");

// ── what the game's code says ───────────────────────────────────────────────
const SRC = [...walk(join(ROOT, "src")), join(ROOT, "index.html")].filter((f) => /\.(js|json|css|html)$/.test(f)).map((f) => [rel(f), read(f)]);
const PUBLIC = walk(join(ROOT, "public")).map(rel);
const sharing = new Map();
for (const f of PUBLIC) sharing.set(basename(f), (sharing.get(basename(f)) ?? 0) + 1);
const namedBy = (file) => {
  const path = file.replace(/^public\//, ""), base = basename(file);
  return SRC.filter(([, text]) => text.includes(path) || (sharing.get(base) === 1 && text.includes(base))).map(([f]) => f);
};

// the demo: the hall and Rooms I to III, and the folders of their puzzles
const REGISTRY = read(join(ROOT, "src/levels/registry.js"));
const META = read(join(ROOT, "src/levels/metadata.js"));
const LEVELS = JSON.parse(META.slice(META.indexOf("const metadata = ") + 17, META.indexOf("\n];") + 2));
const folderOf = Object.fromEntries([...REGISTRY.matchAll(/^import (\w+) from "\.\/(\w+)\//gm)].map(([, name, dir]) => [name, dir]));
const sceneOf = Object.fromEntries([...REGISTRY.matchAll(/^\s+(\w+): (\w+Scene),\s*$/gm)].map(([, key, name]) => [key, name]));
const IN_DEMO = new Set(PLACES.filter((p) => DEMO_PLACES.includes(p.key)).flatMap((p) => p.holds));
const levelOfDir = Object.fromEntries(LEVELS.map((l) => [folderOf[sceneOf[l.key]], l]));
const placeOf = Object.fromEntries(PLACES.flatMap((p) => p.holds.map((id) => [id, p])));
const DEMO_DIRS = new Set(["hall", "house", "study", "room2", "room3", ...LEVELS.filter((l) => IN_DEMO.has(l.id)).map((l) => folderOf[sceneOf[l.key]])]);
const where = (srcFile) => {
  const dir = /^src\/levels\/(\w+)\//.exec(srcFile)?.[1];
  if (!dir) return { label: "peste tot (interfață)", demo: true };
  const level = levelOfDir[dir];
  if (level) return { label: `${level.name} (${placeOf[level.id]?.name ?? "?"})`, demo: IN_DEMO.has(level.id) };
  const named = { hall: "Holul", house: "Casa (comun)", study: "Room I", room2: "Room II", room3: "Room III", top: "Etajul de sus" }[dir] ?? dir;
  return { label: named, demo: DEMO_DIRS.has(dir) };
};
const ASSET_DEMO = new Set(["ArchiveTools", "BinaryTree", "Botany", "CaseFile", "Chessboard", "Chest", "Compass", "Cot", "Cryptex", "InspectorDesk", "Interface",
  "Manor", "MobilePhone", "Modem", "Overtime", "PlantPot", "Prologue", "Room1", "Room2", "Room3", "favicon"]);

// ── sounds: their length, what plays them, and what the record says ───────────
function duration(file) {
  const fd = openSync(file, "r"), head = Buffer.alloc(Math.min(statSync(file).size, 262144));
  readSync(fd, head, 0, head.length, 0); closeSync(fd);
  const size = statSync(file).size;
  if (head.toString("latin1", 0, 4) === "RIFF") {
    let at = 12, rate = 0;
    while (at + 8 < head.length) {
      const id = head.toString("latin1", at, at + 4), len = head.readUInt32LE(at + 4);
      if (id === "fmt ") rate = head.readUInt32LE(at + 16);
      if (id === "data") return rate ? len / rate : null;
      at += 8 + len + (len % 2);
    }
    return null;
  }
  let at = 0;
  if (head.toString("latin1", 0, 3) === "ID3") at = 10 + ((head[6] << 21) | (head[7] << 14) | (head[8] << 7) | head[9]);
  while (at + 4 < head.length && !(head[at] === 0xff && (head[at + 1] & 0xe0) === 0xe0)) at++;
  if (at + 4 >= head.length) return null;
  const v = (head[at + 1] >> 3) & 3, bri = head[at + 2] >> 4, sri = (head[at + 2] >> 2) & 3, mono = (head[at + 3] >> 6) === 3;
  const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const rate = RATES[v]?.[sri], bitrate = (v === 3 ? BR1 : BR2)[bri] * 1000, perFrame = v === 3 ? 1152 : 576;
  if (!rate || !bitrate) return null;
  const side = v === 3 ? (mono ? 17 : 32) : (mono ? 9 : 17);
  const xing = head.toString("latin1", at + 4 + side, at + 8 + side);
  if ((xing === "Xing" || xing === "Info") && head.readUInt32BE(at + 8 + side) & 1) return (head.readUInt32BE(at + 12 + side) * perFrame) / rate;
  return ((size - at) * 8) / bitrate;
}
const RECORD = existsSync(join(ROOT, "docs/SOUND_SOURCES.md")) ? read(join(ROOT, "docs/SOUND_SOURCES.md")) : "";
const recorded = (path) => {
  const row = RECORD.split("\n").find((line) => line.startsWith(`| \`${path}\``));
  if (!row) return { page: "", contentId: "" };
  const cells = row.split("|").map((c) => c.trim());
  return { page: cells[3] ?? "", contentId: cells[4] ?? "" };
};
const MUSIC = new Set(["global/background.mp3", "HisCot/musicbox-cumparsita.mp3", "Wires/music.mp3", "global/solved.mp3"]);
const sounds = PUBLIC.filter((f) => /\.(mp3|wav|ogg)$/.test(f)).map((file) => {
  const path = file.replace(/^public\/assets\/sounds\//, "");
  // (named outright, or through a numbered template such as name${n}.mp3)
  let by = namedBy(file).filter((f) => !f.endsWith("metadata.js"));
  const numbered = /^(.*?[a-z])\d+\.\w+$/.exec(basename(file))?.[1];
  if (!by.length && numbered) by = SRC.filter(([, text]) => text.includes(`${numbered}\${`)).map(([f]) => f);
  const places = [...new Map(by.map((f) => [where(f).label, where(f)])).values()];
  // the light switch's sounds are loaded by the upper hall alone, which the demo does not hold
  if (/^Lightswitch\//.test(path)) places.forEach((p) => { if (p.label === "Holul") { p.label = "Holul de sus"; p.demo = false; } });
  const seconds = duration(join(ROOT, file));
  return {
    file: path, src: `assets/sounds/${path}`, size: statSync(join(ROOT, file)).size, seconds: seconds && Math.round(seconds * 10) / 10,
    music: MUSIC.has(path), playedBy: by, places: places.map((p) => p.label), demo: places.some((p) => p.demo),
    ...recorded(`assets/sounds/${path}`),
  };
});
// the intro film's own sound track (heard in the demo too), played from the
// web copy, which starts at once
function filmSeconds(file) {
  const data = readFileSync(file), at = data.indexOf("mvhd");
  if (at < 0) return null;
  const v1 = data[at + 4] === 1, scale = data.readUInt32BE(at + (v1 ? 24 : 16));
  const length = v1 ? Number(data.readBigUInt64BE(at + 28)) : data.readUInt32BE(at + 20);
  return scale ? length / scale : null;
}
const FILM = "public/assets/video/IntroVideo.mp4", FILM_WEB = "public/assets/video/IntroVideo-web.mp4";
if (existsSync(join(ROOT, FILM))) {
  const played = existsSync(join(ROOT, FILM_WEB)) ? FILM_WEB : FILM, seconds = filmSeconds(join(ROOT, played));
  sounds.push({
    file: "video/IntroVideo.mp4", src: played.replace(/^public\//, ""), film: true, size: statSync(join(ROOT, FILM)).size,
    seconds: seconds && Math.round(seconds * 10) / 10, music: true, playedBy: ["src/ui/introVideo.js"],
    places: ["filmul de la început"], demo: true, page: "", contentId: "",
  });
}
sounds.sort((a, b) => Number(b.music) - Number(a.music) || Number(b.demo) - Number(a.demo) || (b.seconds ?? 0) - (a.seconds ?? 0));

// ── pictures, films and models: where each comes from ─────────────────────────
const ART = walk(join(ROOT, "art")).filter((f) => /\.(py|mjs|js|cjs)$/.test(f)).map((f) => [rel(f), read(f)]);
// the prompt notes: those moved out of public/, and those kept beside a scene's code
const PROMPTS = [...walk(join(ROOT, "docs/asset-provenance/ai-prompts")), ...walk(join(ROOT, "src")).filter((f) => /\.prompts?\.md$/.test(f))].map((f) => [rel(f), read(f)]);
// the earlier register (2026-09-30), for what it recorded of a file's source
const OLD = (() => {
  const file = join(ROOT, "docs/ASSET_LICENSES.csv");
  if (!existsSync(file)) return new Map();
  const cells = (line) => { const out = []; let cell = "", quoted = false;
    for (let i = 0; i < line.length; i++) { const c = line[i];
      if (quoted) { if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
      else if (c === '"') quoted = true; else if (c === ",") { out.push(cell); cell = ""; } else cell += c; }
    out.push(cell); return out; };
  const [head, ...rows] = read(file).trim().split(/\r?\n/);
  const keys = cells(head);
  // keyed by folder and name without its extension: a .jpg recorded then is the .webp shipped now
  return new Map(rows.map((row) => Object.fromEntries(keys.map((k, i) => [k, cells(row)[i]]))).map((r) => [stem(r.path.replace(/^public\/assets\//, "")), r]));
})();
// the folders a Blender script publishes into
const publishes = new Map();
for (const [f, text] of ART) for (const m of text.matchAll(/assets\/images\/([A-Za-z0-9]+)/g)) {
  if (!publishes.has(m[1])) publishes.set(m[1], new Set());
  publishes.get(m[1]).add(f);
}
const NOTES = { favicon: "Desenat pentru joc (favicon/about.txt)", Manor: "Randat în Blender (art/blender/manor.py; Manor/wind-sources.md)" };
const pictures = PUBLIC.filter((f) => /\.(webp|png|jpe?g|svg|glb|gltf|hdr|mp4)$/.test(f) && !/\/fonts\//.test(f)).map((file) => {
  const path = file.replace(/^public\/assets\//, ""), base = basename(file), top = path.split("/")[1] ?? path.split("/")[0];
  // (a generic name like materials.webp is in many folders: a prompt names it
  //  only if it also names the folder, or no other file shares the name)
  const distinct = sharing.get(base) === 1;
  // (the whole name: materials.png is not potting-bench-materials.png)
  const mentions = new RegExp(`(^|[^A-Za-z0-9_-])${stem(base).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(png|webp|jpe?g)`);
  const prompt = PROMPTS.find(([f, text]) => mentions.test(text) && (distinct || f.includes(`/${top}/`)));
  const script = ART.find(([, text]) => text.includes(base) && (distinct || text.includes(path.split("/").slice(-2).join("/"))));
  const old = OLD.get(stem(path));
  let source = "unknown", evidence = "";
  if (prompt) { source = "ai"; evidence = prompt[0]; }
  else if (script) { source = "blender"; evidence = script[0]; }
  else if (/images\/Room\d+\/room\d+-[\w-]+-render-v\d+\.webp$/.test(file)) { source = "blender"; evidence = "art/blender/room_<cameră>.py + room_publish.mjs"; }
  else if (old && /Pixabay/.test(old.provenance)) { source = "pixabay"; evidence = `registrul din ${old.checked_on}: ${old.provenance}`; }
  else if (/^video\//.test(path)) { source = "unknown"; evidence = "film: de confirmat cum a fost făcut"; }
  else if (NOTES[top]) { source = "blender"; evidence = NOTES[top]; }
  else if (publishes.has(top)) { source = "blender?"; evidence = `un script Blender publică în ${top}/: ${[...publishes.get(top)].slice(0, 2).join(", ")}`; }
  const by = namedBy(file);
  return { file: path, size: statSync(join(ROOT, file)).size, source, evidence, named: by.length > 0, demo: ASSET_DEMO.has(top) || /^video\/(IntroVideo-web|key-unlock)/.test(path) };
});

// ── type, code, and the removed files waiting to be deleted ───────────────────
const fonts = [
  { name: "Etude Noire", licence: "CC BY 4.0 (creditat în Credits)", where: "assets/fonts/EtudeNoir", ok: true },
  { name: "IBM Plex Sans / Mono", licence: "SIL OFL 1.1, textul licenței alături", where: "assets/fonts/ui", ok: true },
  { name: "DM Serif Display", licence: "SIL OFL 1.1, textul licenței alături", where: "assets/fonts/ui", ok: true },
  { name: "Cormorant Garamond", licence: "SIL OFL 1.1, textul licenței alături", where: "assets/fonts/ui", ok: true },
  ...(/fonts\.googleapis\.com/.test(read(join(ROOT, "index.html"))) ? [
    { name: "Architects Daughter", licence: "SIL OFL 1.1", where: "Google Fonts (CDN)", ok: false, note: "de copiat în joc (versiunea Steam rulează fără internet)" },
    { name: "Dancing Script", licence: "SIL OFL 1.1", where: "Google Fonts (CDN)", ok: false, note: "de copiat în joc" },
    { name: "Special Elite", licence: "Apache 2.0", where: "Google Fonts (CDN)", ok: false, note: "de copiat în joc" },
  ] : []),
];
const pkg = JSON.parse(read(join(ROOT, "package.json")));
const libraries = Object.keys(pkg.dependencies ?? {}).map((name) => {
  const meta = JSON.parse(read(join(ROOT, "node_modules", name, "package.json")));
  return { name, version: meta.version, licence: meta.license ?? "?", ok: /^(MIT|BSD|ISC|Apache)/.test(meta.license ?? "") };
});
const archived = walk(join(ROOT, ".artifacts/removed-assets")).map((f) => ({ file: rel(f), size: statSync(f).size }));

const audit = {
  generated: new Date().toISOString(),
  sounds, pictures, fonts, libraries,
  archive: { folder: ".artifacts/removed-assets", files: archived.length, size: archived.reduce((n, a) => n + a.size, 0) },
};
writeFileSync(join(ROOT, "todo/audit.json"), JSON.stringify(audit, null, 1));
const count = (list, test) => list.filter(test).length;
console.log(`todo/audit.json: ${sounds.length} sounds (${count(sounds, (s) => s.music)} music), ${pictures.length} pictures/films: ` +
  `${count(pictures, (p) => p.source === "blender")} Blender, ${count(pictures, (p) => p.source === "blender?")} probably Blender, ` +
  `${count(pictures, (p) => p.source === "ai")} AI, ${count(pictures, (p) => p.source === "unknown")} unknown; archive ${archived.length} files`);
