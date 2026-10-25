import { LETTERS, letterById } from "../shared/story.js";
import { PLACES } from "../shared/house.js";
import { renderLetter } from "./letterPage.js";
import { playArrival, letterArt, prepareLetterFilm } from "./letterArrival.js";
import { paintEnvelope } from "../shared/envelope.js";

// The case file: everything Inspector Wren gathers in Ashcombe House, kept in
// an old leather police dossier. On its left page the
// index — the letters, in the order they were found, or the rooms
// and how much of each has given up its word; on its right page what is
// chosen — a letter, read on the house's own paper, or the evidence: the
// word each puzzle gave up, typed on a tag with where it was found. Opened
// with the Case file button or C.
//
// The three pages the Ashcombes left, one on each floor, wait when found: an
// envelope in the side panel, under the notes, marked "!" — opened when the
// player chooses, it arrives as a letter should (letterArrival.js), and only
// once read is it filed here. The last letter arrives by itself. One put off
// for later, and evidence not yet looked at, put a red mark on the Case file
// button until they have been.

const KEPT = "caseFile:letters"; // the letters found, in order
const READ = "caseFile:read"; // the letters read
const SEEN = "caseFile:seen"; // the evidence looked at: the puzzles whose words have been seen here

// where each Ashcombe left a page for him: the first time he stands there
const PAGES = { Study: "ivy", Upper: "silas", Top: "orion" };
const WAITS = Object.values(PAGES); // these wait in the side panel until opened

// File each hall's numbered rooms together, including rooms whose definitions
// were appended later in house.js. This leaves V and VI before the upper floor.
const FILE_PLACES = [...new Set(PLACES.flatMap(place => [
  place,
  ...(place.doors ?? []).map(key => PLACES.find(candidate => candidate.key === key)).filter(Boolean),
]))];

// the house's envelope (shared/envelope.js — the ROTOR study's), back up, its
// red wax on the flap: a letter waiting in the side panel
function envelopeIcon() {
  const image = document.createElement("img");
  image.className = "wl-envelope"; image.alt = "";
  image.src = letterArt("envelope-sealed");
  image.addEventListener("error", () => image.replaceWith(proceduralEnvelopeIcon()), {once: true});
  return image;
}
function proceduralEnvelopeIcon() {
  const W = 152, H = 104;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.className = "wl-envelope";
  c.setAttribute("aria-hidden", "true");
  const g = c.getContext("2d");
  const w = 17, d = 11, q = (W * 0.82) / w;
  const at = (a, b) => ({ x: W / 2 + a * q, y: H / 2 - b * q });
  const seal = at(0, d * 0.14);
  paintEnvelope(g, { w, d, at, k: q, seal: { x: seal.x, y: seal.y - 0.3 * q, rx: 1.9 * q, ry: 1.9 * q } }, {
    left: "#cdbf9f", right: "#ece2c6", wax: "#9e2318", shadow: true, shine: true,
  });
  return c;
}

export function mountCaseFile(scope, { levels, dialogs, storage, sounds = null, reducedMotion = () => false, isBusy = () => false, i18n = null }) {
  const $ = (id) => document.getElementById(id);
  const modal = $("casefile-modal"), button = $("btn-casefile");
  const letterList = $("casefile-letter-list"), roomList = $("casefile-room-list"), reader = $("casefile-reader");
  const clues = $("casefile-clue-list"), count = $("casefile-clue-count");
  const letterCount = $("casefile-letter-count"), documentTitle = $("casefile-document-title"), documentNumber = $("casefile-document-number");
  const reading = modal?.querySelector(".dossier-reading");
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
  let selectedRoom = null;
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

  // ── the letters: the index, and the one being read ──
  function renderLetters() {
    letterList.replaceChildren();
    const found = LETTERS.filter(letter => filed(letter.id)).length;
    letterCount.textContent = i18n ? i18n.t("casefile.letterCount", { found, all: LETTERS.length }) : `${found} of ${LETTERS.length} filed`;
    LETTERS.forEach((baseLetter, n) => {
      const letter = i18n?.getLetter(baseLetter.id) || baseLetter;
      const item = document.createElement("li");
      if (!filed(letter.id)) {
        item.className = "dossier-slip is-missing";
        const notFoundText = i18n ? i18n.t('casefile.notYetFound') : "Not yet found";
        item.innerHTML = `<span class="slip-no" aria-hidden="true"></span><span class="slip-title"></span>`;
        item.querySelector(".slip-no").textContent = String(n + 1).padStart(2, "0");
        item.querySelector(".slip-title").textContent = notFoundText;
        letterList.append(item);
        return;
      }
      const slip = document.createElement("button");
      slip.type = "button";
      slip.dataset.letter = letter.id;
      if (letter.id === current) slip.setAttribute("aria-current", "true");
      slip.className = "dossier-slip" + (letter.id === current ? " is-current" : "") + (read.includes(letter.id) ? "" : " is-unread");
      slip.innerHTML = `<span class="slip-no" aria-hidden="true"></span><span class="slip-title"></span>`;
      slip.querySelector(".slip-no").textContent = String(n + 1).padStart(2, "0");
      slip.querySelector(".slip-title").textContent = letter.title;
      item.append(slip);
      letterList.append(item);
    });
  }
  function showLetter(id) {
    const letter = i18n?.getLetter(id) || letterById(id);
    current = letter ? id : null;
    documentTitle.textContent = letter?.title ?? (i18n ? i18n.t("casefile.tabLetters") : "Letters");
    $("casefile-document-origin").textContent = letter ? (i18n ? i18n.t("casefile.foundWhere", { where: letter.found }) : `Found ${letter.found}`) : "";
    documentNumber.textContent = letter ? `${String(LETTERS.findIndex(entry => entry.id === id) + 1).padStart(2, "0")} / ${String(LETTERS.length).padStart(2, "0")}` : "";
    if (!letter) {
      reader.replaceChildren();
      const empty = document.createElement("p"); empty.className = "dossier-empty";
      empty.textContent = i18n ? i18n.t('casefile.noLetters') : "No letters yet.";
      reader.append(empty);
    } else {
      renderLetter(reader, letter, { paper: false, seal: false });
      markRead(id);
      badge();
    }
    reading.scrollTop = 0;
    renderLetters();
  }
  scope.on(letterList, "click", event => {
    const slip = event.target.closest("button[data-letter]");
    if (!slip) return;
    showLetter(slip.dataset.letter);
    letterList.querySelector('[aria-current="true"]')?.focus({ preventScroll: true });
    sounds?.open();
  });

  // ── the evidence: the rooms on the left, the tags on the right ──
  function renderEvidence() {
    clues.replaceChildren();
    roomList.replaceChildren();
    let found = 0, all = 0;
    const addRoom = (key, name, solved, total) => {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.room = key ?? "all";
      button.className = "dossier-room" + (solved === total ? " is-done" : "");
      if (key === selectedRoom) button.setAttribute("aria-current", "true");
      button.innerHTML = `<span class="room-name"></span><span class="room-count"></span>`;
      button.querySelector(".room-name").textContent = name;
      button.querySelector(".room-count").textContent = `${solved} / ${total}`;
      row.append(button);
      roomList.append(row);
      return button;
    };
    const allRooms = addRoom(null, i18n ? i18n.t("casefile.allRooms") : "All rooms", 0, 0);
    for (const place of FILE_PLACES) {
      const held = place.holds.map((id) => levels.indexOf(id)).filter((i) => i >= 0);
      if (!held.length) continue;
      const solved = held.filter((i) => levels.isCompleted(i)).length;
      const placeName = (i18n?.getPlace(place.key)?.name) ?? place.name;
      addRoom(place.key, placeName, solved, held.length);
      for (const index of held) {
        all++;
        const level = levels.definitions[index], won = levels.isCompleted(index);
        if (won) found++;
        if (selectedRoom && selectedRoom !== place.key) continue;
        const tag = document.createElement("li");
        tag.dataset.evidence = level.id;
        tag.className = "evidence-tag" + (won ? "" : " is-missing") + (won && !seen.includes(level.id) ? " is-new" : "");
        tag.innerHTML = `<span class="tag-topline"><span class="tag-number"></span><span class="tag-status"></span></span><span class="tag-word"></span><span class="tag-where"></span>`;
        tag.querySelector(".tag-number").textContent = String(all).padStart(2, "0");
        tag.querySelector(".tag-status").textContent = won && !seen.includes(level.id) ? (i18n ? i18n.t("casefile.newEvidence") : "New") : "";
        tag.querySelector(".tag-word").textContent = won ? level.code : (i18n ? i18n.t('casefile.notFound') : "NOT FOUND");
        tag.querySelector(".tag-where").textContent = won ? `${level.name} · ${placeName}` : placeName;
        clues.append(tag);
      }
    }
    allRooms.querySelector(".room-count").textContent = `${found} / ${all}`;
    allRooms.classList.toggle("is-done", found === all);
    const place = PLACES.find(place => place.key === selectedRoom);
    $("casefile-evidence-title").textContent = place ? (i18n?.getPlace(place.key)?.name ?? place.name) : (i18n ? i18n.t("casefile.tabEvidence") : "Evidence");
    const held = place?.holds.map(id => levels.indexOf(id)).filter(index => index >= 0);
    const summary = held ? { found: held.filter(index => levels.isCompleted(index)).length, all: held.length } : { found, all };
    count.textContent = i18n ? i18n.t('casefile.evidenceCount', summary) : `Evidence ${summary.found} of ${summary.all}`;
  }
  scope.on(roomList, "click", event => {
    const room = event.target.closest("button[data-room]");
    if (!room) return;
    selectedRoom = room.dataset.room === "all" ? null : room.dataset.room;
    renderEvidence();
    clues.scrollTop = 0;
    roomList.querySelector('[aria-current="true"]')?.focus({ preventScroll: true });
    sounds?.open();
  });

  function setTab(name) {
    tab = name;
    for (const t of tabs) {
      const selected = t.dataset.casefileTab === name;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      for (const id of t.getAttribute("aria-controls").split(" ")) $(id).hidden = !selected;
    }
    modal.dataset.tab = name;
    for (const page of modal.querySelectorAll(".dossier-index")) page.scrollTop = 0;
    if (name === "letters") showLetter(current);
    if (name === "clues") {
      renderEvidence();
      clues.scrollTop = 0;
      // looked at now: the next time they are not new
      seen = [...new Set([...seen, ...solvedIds()])]; save(SEEN, seen);
      badge();
    }
  }
  for (const t of tabs) {
    scope.on(t, "click", () => { if (tab !== t.dataset.casefileTab) sounds?.open(); setTab(t.dataset.casefileTab); });
    scope.on(t, "keydown", event => {
      const index = tabs.indexOf(t);
      const next = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : null;
      if (!next) return;
      event.preventDefault();
      setTab(next.dataset.casefileTab);
      next.focus();
    });
  }

  function open(trigger, { letter = null, on = null } = {}) {
    const unread = kept.find((id) => filed(id) && !read.includes(id));
    const fresh = solvedIds().some((id) => !seen.includes(id));
    if (fresh) selectedRoom = null;
    const which = on ?? (letter || unread ? "letters" : fresh ? "clues" : tab);
    showLetter(letter ?? unread ?? (current && filed(current) ? current : null) ?? kept.filter(filed).at(-1) ?? null);
    setTab(which);
    sounds?.open();
    dialogs.open("casefile-modal", trigger);
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

  // the envelopes waiting under the notes: each marked "!", nothing written,
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
      env.setAttribute("aria-label", `A letter found: ${letter.title} — open it`);
      env.title = letter.title;
      const mark = document.createElement("span");
      mark.className = "wl-alert";
      mark.textContent = "!";
      mark.setAttribute("aria-hidden", "true");
      env.append(envelopeIcon(), mark);
      scope.on(env, "click", () => openWaiting(id, env.querySelector(".wl-envelope")));
      return env;
    }));
    shelf.hidden = list.length === 0;
    // a letter waiting: its film loading meanwhile, so it plays the moment it is opened
    if (list.length && !reducedMotion()) prepareLetterFilm();
  }
  async function openWaiting(id, origin) {
    if (arriving || dialogs.isOpen || isBusy() || !waits(id)) return;
    arriving = true;
    const letter = i18n?.getLetter(id) || letterById(id);
    const how = await playArrival(scope, { letter, sounds, target: button, origin, reducedMotion: reducedMotion(), i18n });
    arriving = false;
    if (scope.closed) return;
    if (how === "read") { markRead(id); current = id; badge(true); }
    renderWaiting();
    if (how !== "read") shelf?.querySelector(`[data-waiting-letter="${id}"]`)?.focus({ preventScroll: true });
  }
  async function flush() {
    if (!queue.length || arriving) return;
    if (dialogs.isOpen || isBusy()) { scope.later(flush, 900); return; }
    const id = queue.shift();
    arriving = true;
    const letter = i18n?.getLetter(id) || letterById(id);
    const how = await playArrival(scope, { letter, sounds, target: button, reducedMotion: reducedMotion(), i18n });
    arriving = false;
    if (scope.closed) return;
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
  renderWaiting();
  if (i18n) scope.add(i18n.subscribe(() => { badge(); if (!modal.classList.contains("hidden")) setTab(tab); }));

  return {
    open, has, reveal,
    get busy() { return arriving; },
    unlock: (id) => unlock(id, { asRead: true }),
    reset() {
      kept = []; read = []; seen = []; current = null; selectedRoom = null; lastPlace = null; lastSolved = 0; queue.length = 0;
      save(KEPT, kept); save(READ, read); save(SEEN, seen); badge(); renderWaiting();
    },
  };
}
