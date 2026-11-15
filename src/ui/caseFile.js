import { LETTERS, letterById } from "../shared/story.js";
import { PLACES } from "../shared/house.js";
import { playArrival, letterPageIcon, prepareLetterPage } from "./letterArrival.js";
import { isDevMode } from "../shared/devMode.js";
import { mountCaseBook } from "./caseBook.js";
import { roomPage, evidencePage, letterSpread } from "./caseBookPages.js";
import "./styles/casebook.css";

// The case file: everything Inspector Wren gathers in Ashcombe House, kept in
// a book whose leaves turn like the manual's (since 2026-11-06; caseBook.js).
// A spread for each room he can go into, in the order of the doors: on the
// left the room — its number, its name, what he noted there; on the right
// the word each of its puzzles gave up, typed, with what it was won from.
// Then a spread for each letter filed, in the order they were found. Opened
// with the Case file button or C, at a letter not yet read, a room with new
// evidence, or else the room he is in.
//
// The three pages the Ashcombes left, one on each floor, wait when found: the
// page itself, small, in the side panel, under the notes, marked "!" — opened when the
// player chooses, it arrives as a letter should (letterArrival.js), and only
// once read is it filed here. The last letter arrives by itself. One put off
// for later, and evidence not yet looked at, put a red mark on the Case file
// button until they have been.

const KEPT = "caseFile:letters"; // the letters found, in order
const READ = "caseFile:read"; // the letters read
const SEEN = "caseFile:seen"; // the evidence looked at: the puzzles whose words have been seen here

// where each Ashcombe left a page for him: the first time he stands there —
// each floor's own hall (Ivy's as soon as he comes into the house)
const PAGES = { Hall: "ivy", Upper: "silas", Top: "orion" };
const WAITS = Object.values(PAGES); // these wait in the side panel until opened

// File each hall's numbered rooms together, including rooms whose definitions
// were appended later in house.js. This leaves V and VI before the upper floor.
const FILE_PLACES = [...new Set(PLACES.flatMap(place => [
  place,
  ...(place.doors ?? []).map(key => PLACES.find(candidate => candidate.key === key)).filter(Boolean),
]))];

// the letter itself, small, lying in the side panel: each its own paper
// (letterArrival.js; Ivy's garden-book page, Silas's note-book page, the back
// of Orion's star chart)
function pageIcon(id) {
  const image = document.createElement("img");
  image.className = "wl-page"; image.alt = ""; image.draggable = false;
  image.src = letterPageIcon(id);
  return image;
}

export function mountCaseFile(scope, { levels, dialogs, storage, sounds = null, reducedMotion = () => false, isBusy = () => false, i18n = null }) {
  const $ = (id) => document.getElementById(id);
  const modal = $("casefile-modal"), button = $("btn-casefile");
  if (!modal?.querySelector(".casebook-book")) return { open() {}, has: () => true, unlock() {}, reveal() {}, reset() {} };
  const t = (key, params, fallback) => (i18n ? i18n.t(key, params ?? {}) : "") || fallback;
  const load = (key, fallback) => {
    try { const v = JSON.parse(storage.getItem(key) ?? "null"); return Array.isArray(v) ? v : fallback(); } catch { return fallback(); }
  };
  const save = (key, list) => storage.setItem(key, JSON.stringify(list));
  // evidence already won before there was a case file counts as looked at
  const solvedIds = () => PLACES.flatMap((p) => p.holds).filter((id) => { const i = levels.indexOf(id); return i >= 0 && levels.isCompleted(i); });
  let kept = load(KEPT, () => []).filter((id) => letterById(id));
  let read = load(READ, () => [...kept]);
  let seen = load(SEEN, () => solvedIds());
  let lastPlace = null, lastSolved = solvedIds().length, arriving = false;
  const queue = [];

  const has = (id) => kept.includes(id);
  // found but not yet opened: waiting in the side panel, not yet in the file
  const waits = (id) => WAITS.includes(id) && has(id) && !read.includes(id);
  const filed = (id) => has(id) && !waits(id);
  function unlock(id, { asRead = false } = {}) {
    if (has(id) || !letterById(id)) return false;
    kept.push(id); save(KEPT, kept);
    if (asRead) markRead(id);
    badge();
    return true;
  }
  function markRead(id) { if (!read.includes(id)) { read.push(id); save(READ, read); } }

  // ── the red mark: something in the file not yet looked at ──
  const news = () => kept.some((id) => filed(id) && !read.includes(id)) || solvedIds().some((id) => !seen.includes(id));
  function badge(pop = false) {
    if (!button) return;
    let mark = button.querySelector(".casefile-alert");
    if (!mark) { mark = document.createElement("span"); mark.className = "casefile-alert"; mark.textContent = "!"; mark.setAttribute("aria-hidden", "true"); button.append(mark); }
    const on = news();
    button.classList.toggle("has-news", on);
    button.setAttribute("aria-label", i18n ? i18n.t(on ? "casefile.newItems" : "header.casefile") : on ? "Case file — something new" : "Case file");
    if (on && pop) { button.classList.remove("is-popping"); void button.offsetWidth; button.classList.add("is-popping"); }
  }

  // ── the book: what is in it now ──
  const ROMAN_NAME = /\b([IVXLC]+)$/;
  function spreadsNow() {
    const list = [], title = t("casefile.title", null, "The Ashcombe Case");
    const notFound = t("casefile.notFound", null, "NOT FOUND"), newWord = t("casefile.newEvidence", null, "New");
    const notEntered = t("casefile.notEntered", null, "I have not been in here yet.");
    let page = 1, number = 0;
    for (const place of FILE_PLACES) {
      const held = place.holds.map((id) => levels.indexOf(id)).filter((i) => i >= 0);
      if (!held.length) continue;
      // only the rooms he can go into, or has been in
      const state = levels.placeState(place.key);
      if (!state?.open && !state?.visited) continue;
      const local = i18n?.getPlace(place.key);
      const name = local?.name ?? place.name;
      const numeral = ROMAN_NAME.exec(place.name)?.[1] ?? null;
      const notes = state.visited ? (local?.story ?? place.story ?? []) : [];
      const items = held.map((index) => {
        number += 1;
        const level = levels.definitions[index], won = levels.isCompleted(index);
        return { number, won, word: level.code, name: i18n ? i18n.getLevelName(level) : level.name, isNew: won && !seen.includes(level.id) };
      });
      const solved = items.filter((item) => item.won).length;
      const count = t("casefile.evidenceCount", { found: solved, all: items.length }, `Evidence ${solved} of ${items.length}`);
      const n = page; page += 2;
      list.push({
        kind: "room", place: place.key, ids: place.holds,
        mark: numeral ?? (local?.floor ?? name).charAt(0).toUpperCase(), tip: name,
        text: [name, ...(notes.length ? notes : [notEntered]), ...items.map((item) => (item.won ? `${item.word} — ${item.name}` : notFound)), count].join("\n"),
        draw: (left, right) => {
          roomPage(left, { head: title, numeral, name, notes, notEntered, n });
          evidencePage(right, { head: t("casefile.tabEvidence", null, "Evidence"), items, count, newWord, notFound, n: n + 1 });
        },
      });
    }
    const lettersWord = t("casefile.tabLetters", null, "Letters"), sign = t("casefile.marginSign", null, "— A. W.");
    LETTERS.filter((letter) => filed(letter.id)).forEach((base, k) => {
      const letter = i18n?.getLetter(base.id) || base;
      const index = LETTERS.findIndex((entry) => entry.id === base.id);
      const number = `${String(index + 1).padStart(2, "0")} / ${String(LETTERS.length).padStart(2, "0")}`;
      const origin = letter.found ? t("casefile.foundWhere", { where: letter.found }, `Found ${letter.found}`) : "";
      const n = page; page += 2;
      list.push({
        kind: "letter", letter: base.id,
        mark: k === 0 ? "\u2709" : null, tip: lettersWord,
        text: [letter.title, origin, letter.dateline, letter.salutation, ...(letter.body ?? []), letter.signature, letter.postscript, letter.margin && `${letter.margin} ${sign}`].filter(Boolean).join("\n"),
        draw: (left, right) => letterSpread(left, right, { head: lettersWord, number, title: letter.title, origin, letter, sign, n }),
      });
    });
    return list;
  }

  // a spread come to lie open: a letter is read, a room's evidence looked at
  function landed(spread) {
    if (spread.kind === "letter") markRead(spread.letter);
    else {
      const won = solvedIds().filter((id) => spread.ids.includes(id) && !seen.includes(id));
      if (won.length) { seen = [...seen, ...won]; save(SEEN, seen); }
    }
    badge();
  }
  const book = mountCaseBook(scope, { modal, sounds, onLand: landed });

  function open(trigger, { letter = null } = {}) {
    const list = spreadsNow();
    const unread = kept.find((id) => filed(id) && !read.includes(id));
    const want = letter ?? unread;
    let at = want ? list.findIndex((spread) => spread.letter === want) : -1;
    if (at < 0) {
      // a room with evidence not looked at yet, or else the one he is in
      const fresh = solvedIds().filter((id) => !seen.includes(id));
      at = list.findIndex((spread) => spread.kind === "room" && spread.ids.some((id) => fresh.includes(id)));
      if (at < 0) {
        const here = levels.place?.key ?? levels.homeOf(levels.currentIndex)?.key;
        at = list.findIndex((spread) => spread.place === here);
      }
    }
    sounds?.open();
    dialogs.open("casefile-modal", trigger);
    void book.show(list, Math.max(0, at));
  }
  scope.on($("btn-close-casefile"), "click", () => dialogs.close());

  // ── finding the letters ──
  // one of the three pages: kept at once, and left waiting in the side panel
  // for the player to open; any other letter arrives as soon as nothing else is on
  function reveal(id) {
    if (!unlock(id)) return;
    if (WAITS.includes(id)) { renderWaiting(id); sounds?.ping(); return; }
    queue.push(id);
    flush();
  }

  // the pages waiting under the notes: each marked "!", nothing written,
  // opened by a click — and gone from here once read and filed
  const shelf = $("index-letters");
  function renderWaiting(fresh = null) {
    if (!shelf) return;
    const list = kept.filter(waits);
    shelf.replaceChildren(...list.map((id) => {
      const letter = i18n?.getLetter(id) || letterById(id);
      const env = document.createElement("button");
      env.type = "button";
      env.className = "waiting-letter" + (id === fresh ? " is-new" : "");
      env.dataset.waitingLetter = id;
      env.setAttribute("aria-label", `${t('casefile.letterFound', null, 'A letter found')}: ${letter.title} — ${t('casefile.openLetter', null, 'Open the letter')}`);
      env.title = letter.title;
      const mark = document.createElement("span");
      mark.className = "wl-alert";
      mark.textContent = "!";
      mark.setAttribute("aria-hidden", "true");
      env.append(pageIcon(id), mark);
      env.addEventListener("click", () => openWaiting(id, env.querySelector(".wl-page")));
      return env;
    }));
    shelf.hidden = list.length === 0;
    // Have the waiting pages' pictures ready before they are opened.
    for (const id of list) void prepareLetterPage(id);
    renderDevLetters();
  }

  // Dev mode (dev server only): the floors' three pages put back in the side
  // panel unread, to be opened again; and the last letter, to be seen at once
  // (and whatever else the game hands in: the two introductions, to be seen again)
  let devRow = null;
  const devLinks = [];
  function renderDevLetters() {
    if (!shelf) return;
    if (!isDevMode()) { devRow?.remove(); devRow = null; return; }
    if (!devRow) {
      devRow = document.createElement("div");
      devRow.className = "dev-letters";
      const link = (label, action) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = label;
        b.addEventListener("click", action);
        return b;
      };
      devRow.append(
        link("↺ Reset letters", () => {
          for (const id of WAITS) if (!has(id)) kept.push(id);
          read = read.filter((id) => !WAITS.includes(id));
          save(KEPT, kept); save(READ, read); badge(); renderWaiting();
        }),
        link("▶ Last letter", () => {
          if (arriving || dialogs.isOpen) return;
          if (!queue.includes("last")) queue.push("last");
          flush();
        }),
        ...devLinks.map(([label, action]) => link(label, () => { if (!dialogs.isOpen) action(); })),
      );
    }
    shelf.after(devRow);
  }
  async function openWaiting(id, origin) {
    if (arriving || dialogs.isOpen || isBusy() || !waits(id)) return;
    arriving = true;
    const letter = i18n?.getLetter(id) || letterById(id);
    const how = await playArrival(scope, { letter, page: id, sounds, target: button, origin, reducedMotion: reducedMotion(), i18n });
    arriving = false;
    if (scope.closed) return;
    if (how === "read") { markRead(id); badge(true); }
    renderWaiting();
    if (how !== "read") shelf?.querySelector(`[data-waiting-letter="${id}"]`)?.focus({ preventScroll: true });
  }
  async function flush() {
    if (!queue.length || arriving) return;
    if (dialogs.isOpen || isBusy()) { scope.later(flush, 900); return; }
    const id = queue.shift();
    arriving = true;
    const letter = i18n?.getLetter(id) || letterById(id);
    const how = await playArrival(scope, { letter, page: id, sounds, target: button, reducedMotion: reducedMotion(), i18n });
    arriving = false;
    if (scope.closed) return;
    if (how === "read") markRead(id);
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
  renderWaiting();
  if (i18n) scope.add(i18n.subscribe(() => { badge(); renderWaiting(); if (!modal.classList.contains("hidden")) book.redraw(spreadsNow()); }));

  return {
    open, has, reveal,
    /** Dev mode: one more link under the waiting letters. */
    devLink(label, action) { devLinks.push([label, action]); devRow?.remove(); devRow = null; renderDevLetters(); },
    get busy() { return arriving; },
    unlock: (id) => unlock(id, { asRead: true }),
    reset() {
      kept = []; read = []; seen = []; lastPlace = null; lastSolved = 0; queue.length = 0;
      save(KEPT, kept); save(READ, read); save(SEEN, seen); badge(); renderWaiting();
    },
  };
}
