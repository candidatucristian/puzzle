import { LETTERS, letterById } from "../shared/story.js";
import { PLACES } from "../shared/house.js";
import { renderLetter } from "./letterPage.js";
import { playArrival } from "./letterArrival.js";

// The case file: everything Inspector Wren gathers in Ashcombe House, kept in
// an old leather police dossier that opens like a book. On its left page the
// index — the letters, clipped in the order they were found, or the rooms
// and how much of each has given up its word; on its right page what is
// chosen — a letter, read on the house's own paper, or the evidence: the
// word each puzzle gave up, typed on a tag with where it was found. Opened
// with the Case file button or C.
//
// A letter found arrives as a letter should (letterArrival.js) and is filed;
// one put off for later, and evidence not yet looked at, put a red mark on
// the Case file button until they have been.

const KEPT = "caseFile:letters"; // the letters found, in order
const READ = "caseFile:read"; // the letters read
const SEEN = "caseFile:seen"; // the evidence looked at: the puzzles whose words have been seen here

// where each Ashcombe left a page for him: the first time he stands there
const PAGES = { Study: "ivy", Upper: "silas", Top: "orion" };

export function mountCaseFile(scope, { levels, dialogs, storage, sounds = null, reducedMotion = () => false, isBusy = () => false }) {
  const $ = (id) => document.getElementById(id);
  const modal = $("casefile-modal"), button = $("btn-casefile");
  const letterList = $("casefile-letter-list"), roomList = $("casefile-room-list"), reader = $("casefile-reader");
  const clues = $("casefile-clue-list"), count = $("casefile-clue-count");
  const tabs = [...document.querySelectorAll("[data-casefile-tab]")];
  if (!modal) return { open() {}, has: () => true, unlock() {}, reveal() {}, reset() {} };
  const load = (key, fallback) => {
    try { const v = JSON.parse(storage.getItem(key) ?? "null"); return Array.isArray(v) ? v : fallback(); } catch { return fallback(); }
  };
  const save = (key, list) => storage.setItem(key, JSON.stringify(list));
  // evidence already won before there was a case file counts as looked at
  const solvedIds = () => PLACES.flatMap((p) => p.holds).filter((id) => { const i = levels.indexOf(id); return i >= 0 && levels.isCompleted(i); });
  let kept = load(KEPT, () => []).filter((id) => letterById(id));
  let read = load(READ, () => [...kept]);
  let seen = load(SEEN, () => solvedIds());
  let current = null, tab = "letters", lastPlace = null, lastSolved = solvedIds().length, arriving = false;
  const queue = [];

  const has = (id) => kept.includes(id);
  function unlock(id, { asRead = false } = {}) {
    if (has(id) || !letterById(id)) return false;
    kept.push(id); save(KEPT, kept);
    if (asRead) markRead(id);
    badge();
    return true;
  }
  function markRead(id) { if (!read.includes(id)) { read.push(id); save(READ, read); } }

  // ── the red mark: something in the file not yet looked at ──
  const news = () => kept.some((id) => !read.includes(id)) || solvedIds().some((id) => !seen.includes(id));
  function badge(pop = false) {
    if (!button) return;
    let mark = button.querySelector(".casefile-alert");
    if (!mark) { mark = document.createElement("span"); mark.className = "casefile-alert"; mark.textContent = "!"; mark.setAttribute("aria-hidden", "true"); button.append(mark); }
    const on = news();
    button.classList.toggle("has-news", on);
    button.setAttribute("aria-label", on ? "Case file — something new" : "Case file");
    if (on && pop) { button.classList.remove("is-popping"); void button.offsetWidth; button.classList.add("is-popping"); }
  }

  // ── the letters: the index, and the one being read ──
  function renderLetters() {
    letterList.replaceChildren();
    LETTERS.forEach((letter, n) => {
      const item = document.createElement("li");
      if (!has(letter.id)) {
        item.className = "dossier-slip is-missing";
        item.innerHTML = `<span class="slip-no"></span><span class="slip-title">Not yet found</span>`;
        item.querySelector(".slip-no").textContent = `No. ${n + 1}`;
        letterList.append(item);
        return;
      }
      const slip = document.createElement("button");
      slip.type = "button";
      slip.className = "dossier-slip" + (letter.id === current ? " is-current" : "") + (read.includes(letter.id) ? "" : " is-unread");
      slip.innerHTML = `<span class="slip-clip" aria-hidden="true"></span><span class="slip-no"></span><span class="slip-title"></span><span class="slip-where"></span>`;
      slip.querySelector(".slip-no").textContent = `No. ${n + 1}`;
      slip.querySelector(".slip-title").textContent = letter.title;
      slip.querySelector(".slip-where").textContent = `Found ${letter.found}`;
      scope.on(slip, "click", () => { showLetter(letter.id); sounds?.open(); });
      item.append(slip);
      letterList.append(item);
    });
  }
  function showLetter(id) {
    const letter = letterById(id);
    current = letter ? id : null;
    if (!letter) {
      reader.replaceChildren();
      const empty = document.createElement("p"); empty.className = "dossier-empty"; empty.textContent = "No letters yet.";
      reader.append(empty);
    } else {
      renderLetter(reader, letter);
      markRead(id);
      badge();
    }
    reader.scrollTop = 0;
    reader.closest(".dossier-page")?.scrollTo(0, 0);
    renderLetters();
  }

  // ── the evidence: the rooms on the left, the tags on the right ──
  function renderEvidence() {
    clues.replaceChildren();
    roomList.replaceChildren();
    let found = 0, all = 0;
    for (const place of PLACES) {
      const held = place.holds.map((id) => levels.indexOf(id)).filter((i) => i >= 0);
      if (!held.length) continue;
      const solved = held.filter((i) => levels.isCompleted(i)).length;
      const row = document.createElement("li");
      row.className = "dossier-room" + (solved === held.length ? " is-done" : "");
      row.innerHTML = `<span class="room-name"></span><span class="room-dots" aria-hidden="true"></span><span class="room-count"></span>`;
      row.querySelector(".room-name").textContent = place.name;
      row.querySelector(".room-dots").textContent = held.map((i) => (levels.isCompleted(i) ? "●" : "○")).join(" ");
      row.querySelector(".room-count").textContent = `${solved}/${held.length}`;
      roomList.append(row);
      for (const index of held) {
        all++;
        const level = levels.definitions[index], won = levels.isCompleted(index);
        if (won) found++;
        const tag = document.createElement("li");
        tag.className = "evidence-tag" + (won ? "" : " is-missing") + (won && !seen.includes(level.id) ? " is-new" : "");
        tag.innerHTML = `<span class="tag-word"></span><span class="tag-where"></span>`;
        tag.querySelector(".tag-word").textContent = won ? level.code : "NOT FOUND";
        tag.querySelector(".tag-where").textContent = won ? `${level.name} · ${place.name}` : place.name;
        clues.append(tag);
      }
    }
    count.textContent = `Evidence ${found} of ${all}`;
  }

  function setTab(name) {
    tab = name;
    for (const t of tabs) t.setAttribute("aria-selected", String(t.dataset.casefileTab === name));
    modal.dataset.tab = name;
    for (const page of modal.querySelectorAll(".dossier-page")) page.scrollTop = 0;
    // the letter's paper is painted to the size it is shown at: again, now it shows
    if (name === "letters" && current) showLetter(current);
    if (name === "clues") {
      renderEvidence();
      // looked at now: the next time they are not new
      seen = [...new Set([...seen, ...solvedIds()])]; save(SEEN, seen);
      badge();
    }
  }
  for (const t of tabs) scope.on(t, "click", () => { if (tab !== t.dataset.casefileTab) sounds?.open(); setTab(t.dataset.casefileTab); });

  function open(trigger, { letter = null, on = null } = {}) {
    const unread = kept.find((id) => !read.includes(id));
    const fresh = solvedIds().some((id) => !seen.includes(id));
    const which = on ?? (letter || unread ? "letters" : fresh ? "clues" : tab);
    showLetter(letter ?? unread ?? current ?? kept[kept.length - 1] ?? null);
    setTab(which);
    sounds?.open();
    dialogs.open("casefile-modal", trigger);
  }
  scope.on($("btn-close-casefile"), "click", () => dialogs.close());

  // ── finding the letters ──
  // a letter found is kept at once; it arrives as soon as nothing else is on
  function reveal(id) {
    if (!unlock(id)) return;
    queue.push(id);
    flush();
  }
  async function flush() {
    if (!queue.length || arriving) return;
    if (dialogs.isOpen || isBusy()) { scope.later(flush, 900); return; }
    const id = queue.shift();
    arriving = true;
    const how = await playArrival(scope, { letter: letterById(id), sounds, target: button, reducedMotion: reducedMotion() });
    arriving = false;
    if (how === "read") markRead(id);
    current = id;
    badge(true);
    if (how !== "read") sounds?.ping();
    flush();
  }
  const everySolved = () => PLACES.every((place) => place.holds.every((id) => {
    const index = levels.indexOf(id);
    return index < 0 || levels.isCompleted(index);
  }));
  scope.add(levels.subscribe(() => {
    // a word won: new evidence, and the mark on the file
    const solved = solvedIds().length;
    if (solved > lastSolved) { badge(true); sounds?.ping(); }
    lastSolved = solved;
    if (!has("invitation")) return;
    const key = levels.place?.key ?? null;
    if (key && key !== lastPlace && PAGES[key] && !has(PAGES[key])) {
      const id = PAGES[key];
      // once the picture has come up
      scope.later(() => { if (levels.place?.key === key) reveal(id); }, 1600);
    }
    lastPlace = key;
    if (everySolved()) reveal("last");
  }));
  badge();

  return {
    open, has, reveal,
    get busy() { return arriving; },
    unlock: (id) => unlock(id, { asRead: true }),
    reset() {
      kept = []; read = []; seen = []; current = null; lastPlace = null; lastSolved = 0; queue.length = 0;
      save(KEPT, kept); save(READ, read); save(SEEN, seen); badge();
    },
  };
}
