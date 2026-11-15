// A room's puzzles downloaded quietly, before they are gone into (2026-11-14:
// on the net, each puzzle waited on its own pictures when it was clicked).
//
// When a door is opened (HallScene) the room's own pictures go first, then
// its puzzles'; once the room is entered (sceneAssetLoading.js) its puzzles
// carry on, since the room's own loading took the line from them. Only the
// downloads are made, at low priority, into sceneImageDownloads.js's cache:
// nothing is decoded or put on the GPU until the puzzle is entered, and a
// puzzle entered while its picture is still coming takes that download over.
//
// What a puzzle loads is read from its own preload(), run against a stand-in
// loader that writes down what it is asked for and loads nothing.
import { PLACES } from "../shared/house.js";
import { warmSceneImages } from "./sceneImageDownloads.js";

const found = new WeakMap();
const fetched = new Set();
// a puzzle's own extra, once: a class's static prefetch() (the cot's three.js)
const prepared = new WeakSet();
const SOUND_DELAY = 1500; // the pictures first

// the files a scene's preload() asks for: [{ type, key, url }]
function preloadOf(scene) {
  if (found.has(scene)) return found.get(scene);
  const files = [];
  found.set(scene, files);
  // (the class's own preload: the instance's is wrapped to start a loading session)
  const preload = Object.getPrototypeOf(scene)?.preload;
  if (typeof preload !== "function") return files;
  let path = "";
  const note = (type) => (key, url) => {
    const entries = key && typeof key === "object" ? (Array.isArray(key) ? key : [key]) : [{ key, url }];
    for (const entry of entries) {
      const raw = entry.url ?? entry.urls;
      const first = Array.isArray(raw) ? raw.find((u) => typeof u === "string") : raw;
      if (typeof entry.key === "string" && typeof first === "string") files.push({ type, key: entry.key, url: path + first });
    }
    return loader;
  };
  const loader = new Proxy({}, {
    get(_, prop) {
      if (typeof prop === "symbol" || prop === "then") return undefined;
      if (prop === "setPath") return (p = "") => { path = p; return loader; };
      if (prop === "path" || prop === "baseURL" || prop === "prefix") return "";
      if (prop === "image" || prop === "spritesheet" || prop === "audio") return note(prop);
      if (prop === "isLoading") return () => false;
      return () => loader;
    },
  });
  try { preload.call(Object.create(scene, { load: { value: loader } })); } catch { /* a preload that needs more than this: skipped */ }
  return files;
}

function puzzleFiles(game, placeKey) {
  const place = PLACES.find((p) => p.key === placeKey);
  const levels = game.services?.levels;
  if (!place?.holds?.length || !levels) return [];
  const files = [];
  for (const id of place.holds) {
    if (id === place.plays || levels.puzzleSealed?.(id)) continue;
    const level = levels.definitions.find((l) => l.id === id);
    const scene = level?.scene && game.scene.scenes.find((s) => s instanceof level.scene);
    if (scene) files.push(...preloadOf(scene));
    if (typeof level?.scene?.prefetch === "function" && !prepared.has(level.scene)) {
      prepared.add(level.scene);
      Promise.resolve().then(() => level.scene.prefetch()).catch(() => prepared.delete(level.scene));
    }
  }
  return files;
}

const soundAt = (url) => {
  try {
    const parsed = new URL(url, document.baseURI);
    return parsed.origin === new URL(document.baseURI).origin ? parsed.href : null;
  } catch { return null; }
};

/** Downloads, quietly, the puzzles a place holds — after `first` (that
 *  place's own pictures, when its door is opened). */
export function prefetchPlacePuzzles(scene, placeKey, first = []) {
  if (typeof document === "undefined") return;
  const files = puzzleFiles(scene.game, placeKey);
  const pictures = files.filter((f) => f.type === "image" || f.type === "spritesheet");
  warmSceneImages(scene, [...first, ...pictures]);
  // the sounds into the browser's own cache, once each
  const sounds = files.filter((f) => f.type === "audio" && !scene.cache.audio.exists(f.key)).map((f) => soundAt(f.url)).filter((u) => u && !fetched.has(u));
  if (!sounds.length) return;
  setTimeout(() => {
    for (const url of sounds) {
      if (fetched.has(url)) continue;
      fetched.add(url);
      fetch(url, { priority: "low", credentials: "same-origin" }).then((r) => (r.ok ? r.blob() : null)).catch(() => fetched.delete(url));
    }
  }, SOUND_DELAY);
}

/** Whether a place holds puzzles to fetch ahead (a scene key). */
export function holdsPuzzles(key) {
  const place = PLACES.find((p) => p.key === key);
  return Boolean(place?.holds?.some((id) => id !== place.plays));
}
