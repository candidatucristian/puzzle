// The player's notebook, a spiral notebook open flat: a working page for each
// puzzle (and each place of the house), its notes written on the left leaf
// and its sketch drawn on the right, kept by itself from one visit to the
// next; and the pages saved from it, index tabs out from its right edge —
// first this puzzle's own page, then the saved ones newest first, then one to
// start a new page. Save keeps a copy of the page there; New page starts an
// empty one there (and, left empty, it is not kept); a saved page taken out
// is written on in place, and kept as it is written. Its tools on a plaque
// over its head: write, sketch, rub out, and a ruler for straight lines.
// Opened with the Notebook button or N: it fades in in the middle of the
// game. Nothing is ever written in it but what the player puts there.

import { mountNotebookPencil } from "./notebookPencil.js";
import { mountDrawingSound } from './drawingSound.js';

const PAGE = { w: 560, h: 720 }; // the sketch's own size, in its pixels (the right leaf, upright)
// the pencil's three widths (and the rubber's, with each), its three colours
const SIZES = [2, 4, 8], RUBBERS = [10, 18, 32];
const COLOURS = ["rgba(36,33,28,0.92)", "rgba(30,78,170,0.92)", "rgba(178,38,30,0.92)"];
const PEN = "notebook:pen"; // the width and colour last chosen
const SAVED = "notebook:saved"; // the pages saved: { id, title, from, at, text, sketch }
// (once they were kept in folders: those are emptied into the one list)
const OLD_SHELF = "notebook:folders", OLD_OPEN = "notebook:open-folder";
const DATES = { en: "en-GB", ro: "ro-RO", ru: "ru-RU" };

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// what the notebook says, in the player's language (English without one)
const ENGLISH = {
  noRoom: "The browser has no more room — this is kept until the page is closed.",
  pageNumbered: "Page {n}",
  workingTip: "This puzzle’s own page",
  noteName: "The note’s name",
  noteNameFor: "A name for this note ({page})",
  deleteNote: "Delete this note",
  sureAgain: "Sure? Click again",
  nothingToKeep: "There is nothing on the page to keep yet.",
  kept: "Saved.",
  noteThrown: "“{name}” was thrown away.",
};

export function mountNotebook(scope, { game, audio, levels, dialogs, storage, i18n = null }) {
  const $ = (id) => document.getElementById(id);
  const say_ = (key, params = {}) => i18n
    ? i18n.t(`notebook.${key}`, params)
    : ENGLISH[key].replace(/\{(\w+)\}/g, (_, k) => params[k] ?? "");
  const modal = $("notebook-modal");
  const title = $("notebook-title"), text = $("notebook-text"), sketch = $("notebook-sketch");
  const tools = document.querySelectorAll("[data-notebook-tool]");
  const sizes = document.querySelectorAll("[data-notebook-size]"), colours = document.querySelectorAll("[data-notebook-colour]");
  const shelf = modal?.querySelector(".notebook-shelf"), noteList = $("notebook-notes"), savedCount = $("notebook-saved-count");
  const newPage = $("notebook-new-page");
  const back = $("notebook-back"), noteTitle = $("notebook-note-title"), saveButton = $("notebook-save");
  const write = $("notebook-write");
  const deleteNote = $("notebook-delete-note"), status = $("notebook-status");
  if (!modal || !text || !sketch || !noteList) return { open() {}, get isOpen() { return false; } };
  sketch.width = PAGE.w;
  sketch.height = PAGE.h;
  const ctx = sketch.getContext("2d");
  const drawingSound = mountDrawingSound(scope, { game, audio });
  // on an empty drawing sheet, a pencil that scribbles across it and is gone
  const pencil = mountNotebookPencil(sketch.parentElement);
  let pencilAt = null;
  const quiet = () => { clearTimeout(pencilAt); pencilAt = null; pencil.stop(); };
  scope.add(quiet);
  const when = (at) => new Date(at).toLocaleDateString(DATES[i18n?.language] ?? "en-GB", { day: "numeric", month: "short" });
  // `page` is what lies open: the working page of a puzzle or place, or a note
  let page = null, tool = "pencil", drawing = null, saveTimer = null, statusTimer = null;
  let pen = { size: 0, colour: 0 };
  try { const kept = JSON.parse(storage.getItem(PEN) || "null"); if (kept) pen = { size: Math.min(2, Math.max(0, kept.size | 0)), colour: Math.min(2, Math.max(0, kept.colour | 0)) }; } catch { /* the first one, then */ }
  let saved = readSaved();

  // ── keeping things ──
  function readSaved() {
    const list = (v) => (Array.isArray(v) ? v : []);
    const fine = (n) => n && typeof n.id === "string";
    const tidy = (n) => ({
      id: n.id, title: String(n.title ?? ""), from: n.from ? String(n.from) : "", at: Number(n.at) || Date.now(),
      text: String(n.text ?? ""), sketch: typeof n.sketch === "string" ? n.sketch : null,
    });
    try {
      const kept = storage.getItem(SAVED);
      if (kept !== null) return list(JSON.parse(kept)).filter(fine).map(tidy);
      // (from when they were kept in folders: every note out of every folder)
      const old = list(JSON.parse(storage.getItem(OLD_SHELF) || "[]")).flatMap((f) => list(f?.notes)).filter(fine).map(tidy);
      if (old.length && storage.setItem(SAVED, JSON.stringify(old))) {
        storage.removeItem(OLD_SHELF);
        storage.removeItem(OLD_OPEN);
      }
      return old;
    } catch {
      return [];
    }
  }
  function keepSaved() {
    if (storage.setItem(SAVED, JSON.stringify(saved))) return true;
    say(say_("noRoom"), "warn");
    return false;
  }
  const readPage = (key) => {
    try {
      return JSON.parse(storage.getItem(`notebook:${key}`) || "null");
    } catch {
      return null;
    }
  };
  const note = () => (page?.kind === "note" ? (saved.find((n) => n.id === page.noteId) ?? null) : null);
  const picture = () => (page?.drawn ? sketch.toDataURL("image/png") : null);

  // what is on the page, put away: a working page by its own key, a note in the list
  function save() {
    clearTimeout(saveTimer);
    if (!page) return;
    if (page.kind === "note") {
      const n = note();
      if (!n) return;
      n.text = text.value;
      n.sketch = picture();
      n.title = noteTitle.value.trim() || n.title;
      keepSaved();
      return;
    }
    const blank = !text.value.trim() && !page.drawn;
    if (blank) storage.removeItem(`notebook:${page.key}`);
    else storage.setItem(`notebook:${page.key}`, JSON.stringify({ text: text.value, sketch: picture() }));
  }
  // A new page left as it was made (nothing written, nothing drawn, its name
  // as it was given) is not kept: leaving it takes it away again.
  function leave() {
    lift();
    drawingSound.stop(true);
    save();
    const n = note();
    if (!n || !page.fresh || n.text.trim() || n.sketch || n.title !== page.fresh) return;
    saved = saved.filter((x) => x.id !== n.id);
    keepSaved();
  }
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  };
  scope.add(() => {
    save();
    clearTimeout(statusTimer);
  });

  function say(words, kind = "ok") {
    status.textContent = words;
    status.dataset.kind = kind;
    status.classList.remove("shown");
    void status.offsetWidth;
    status.classList.add("shown");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => status.classList.remove("shown"), 3200);
  }

  // ── the page ──
  function paint(content) {
    lift();
    drawingSound.stop(true);
    text.value = content?.text ?? "";
    ctx.clearRect(0, 0, PAGE.w, PAGE.h);
    page.drawn = false;
    if (content?.sketch) {
      const img = new Image(), shown = page;
      img.onload = () => {
        if (page !== shown) return;
        // (drawn on an older, wider sheet: laid at its head, as large as fits)
        const k = Math.min(1, PAGE.w / img.width, PAGE.h / img.height);
        ctx.drawImage(img, 0, 0, img.width * k, img.height * k);
        page.drawn = true;
      };
      img.src = content.sketch;
    }
  }
  // the working page of the puzzle being played, or else of the place stood in
  function working() {
    if (levels.place && !levels.answering) return { kind: "page", key: `place:${levels.place.key}`, name: levels.place.name };
    const level = levels.definitions[levels.currentIndex];
    return { kind: "page", key: `level:${level.id}`, name: level.name };
  }
  function openWorking() {
    leave();
    page = working();
    paint(readPage(page.key));
    noteTitle.value = "";
    render();
  }
  function openNote(n) {
    quiet();
    leave();
    page = { kind: "note", noteId: n.id, name: n.title };
    paint(n);
    noteTitle.value = n.title;
    render();
    text.focus();
  }

  // ── the saved pages ──
  function render() {
    // the tabs: this puzzle's own page, then the saved ones newest first,
    // each with its name on it
    const items = [workingTab(), ...[...saved].sort((a, b) => b.at - a.at).map(slip)];
    noteList.replaceChildren(...items);
    savedCount.textContent = saved.length ? String(saved.length) : "";
    // the page's own bar and the way to put it away
    const onNote = page?.kind === "note";
    title.textContent = onNote ? (note()?.title ?? "") : (page?.name ?? "");
    back.hidden = !onNote;
    deleteNote.hidden = !onNote;
    saveButton.hidden = onNote;
    noteTitle.placeholder = onNote ? say_("noteName") : say_("noteNameFor", { page: page?.name ?? "" });
    disarm(deleteNote, say_("deleteNote"));
  }
  function slip(n) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "shelf-note";
    b.classList.toggle("open", page?.kind === "note" && page.noteId === n.id);
    // (pointed at: its whole name, where it was written, when)
    b.dataset.tip = `${n.title} · ${n.from ? `${n.from} · ` : ""}${when(n.at)}`;
    const name = document.createElement("span");
    name.className = "note-name";
    name.textContent = n.title;
    b.append(name);
    b.addEventListener("click", () => openNote(n));
    li.append(b);
    return li;
  }
  function workingTab() {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "shelf-note is-working";
    b.classList.toggle("open", page?.kind !== "note");
    b.dataset.tip = say_("workingTip");
    const name = document.createElement("span");
    name.className = "note-name";
    name.textContent = working().name;
    b.append(name);
    b.addEventListener("click", () => { if (page?.kind === "note") openWorking(); });
    li.append(b);
    return li;
  }
  // (the tab just made: the newest saved, after this puzzle's own)
  const newest = () => noteList.querySelector(".shelf-note:not(.is-working)");

  // a button pressed twice to be sure
  function armed(button, ask) {
    if (button.dataset.armed === "true") return true;
    button.dataset.armed = "true";
    button.dataset.label = button.textContent;
    button.textContent = ask;
    setTimeout(() => disarm(button), 2600);
    return false;
  }
  function disarm(button, label) {
    if (button.dataset.armed !== "true") return;
    button.dataset.armed = "false";
    button.textContent = label ?? button.dataset.label;
  }

  // ── putting a note away ──
  scope.on(saveButton, "click", () => {
    if (!page || page.kind === "note") return;
    if (!text.value.trim() && !page.drawn) {
      say(say_("nothingToKeep"), "warn");
      return;
    }
    save();
    const n = { id: uid(), title: noteTitle.value.trim() || page.name, from: page.name, at: Date.now(), text: text.value, sketch: picture() };
    saved.push(n);
    const kept = keepSaved();
    noteTitle.value = "";
    render();
    if (kept) say(say_("kept"));
    if (shelf) shelf.scrollTop = 0;
    newest()?.classList.add("just-kept");
  });
  scope.on(newPage, "click", () => {
    leave(); // (first, so a new page left empty before does not count in its number)
    const n = { id: uid(), title: say_("pageNumbered", { n: saved.length + 1 }), from: "", at: Date.now(), text: "", sketch: null };
    saved.push(n);
    keepSaved();
    openNote(n);
    page.fresh = n.title; // (its name as given: left so, and empty, it goes)
    if (shelf) shelf.scrollTop = 0;
    newest()?.classList.add("just-kept");
  });
  scope.on(deleteNote, "click", () => {
    const n = note();
    if (!n || !armed(deleteNote, say_("sureAgain"))) return;
    saved = saved.filter((x) => x.id !== n.id);
    keepSaved();
    page = null;
    openWorking();
    say(say_("noteThrown", { name: n.title }));
  });
  scope.on(back, "click", openWorking);
  scope.on(noteTitle, "input", () => {
    if (page?.kind === "note") saveSoon();
  });
  scope.on(noteTitle, "change", () => {
    if (page?.kind === "note") {
      save();
      render();
    }
  });
  scope.on(noteTitle, "keydown", (e) => {
    if (e.key === "Enter" && page?.kind !== "note") {
      e.preventDefault();
      saveButton.click();
    }
  });

  // ── the pencil and the rubber ──
  const pos = (e) => {
    const box = sketch.getBoundingClientRect();
    return { x: ((e.clientX - box.left) / box.width) * PAGE.w, y: ((e.clientY - box.top) / box.height) * PAGE.h };
  };
  // a stroke of the pencil (or the rubber) from a to b
  const stroke = (a, b, rubber) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (rubber) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = RUBBERS[pen.size];
    } else {
      ctx.strokeStyle = COLOURS[pen.colour];
      ctx.lineWidth = SIZES[pen.size];
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };
  // (the ruler: the sheet as it was when it was laid down, the line drawn
  //  fresh along it each move, from where it was laid to where it is now)
  let ruled = null, drawingPointer = null;
  scope.on(sketch, "pointerdown", (e) => {
    if (e.button !== 0 || e.isPrimary === false || drawingPointer !== null) return;
    quiet();
    drawingSound.begin();
    sketch.setPointerCapture(e.pointerId);
    drawingPointer = e.pointerId;
    drawing = pos(e);
    ruled = tool === "ruler" ? { from: drawing, sheet: ctx.getImageData(0, 0, PAGE.w, PAGE.h) } : null;
  });
  scope.on(sketch, "pointermove", (e) => {
    if (!drawing || e.pointerId !== drawingPointer) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) { lift(); return; }
    const p = pos(e);
    // Pressure/hover events at the same coordinates are not a pencil stroke.
    if (p.x === drawing.x && p.y === drawing.y) return;
    if (ruled) {
      ctx.putImageData(ruled.sheet, 0, 0);
      stroke(ruled.from, p, false);
    } else {
      stroke(drawing, p, tool === "eraser");
    }
    drawing = p;
    page.drawn = true;
    if (tool !== 'eraser' && p.x >= 0 && p.x <= PAGE.w && p.y >= 0 && p.y <= PAGE.h) drawingSound.move();
    else drawingSound.stop();
  });
  function lift() {
    drawingSound.end();
    ruled = null;
    if (drawing) {
      drawing = null;
      saveSoon();
    }
    const pointer = drawingPointer; drawingPointer = null;
    if (pointer !== null && sketch.hasPointerCapture(pointer)) sketch.releasePointerCapture(pointer);
  }
  const liftPointer = event => { if (event.pointerId === drawingPointer) lift(); };
  scope.on(sketch, "pointerup", liftPointer);
  scope.on(sketch, "pointercancel", liftPointer);
  scope.on(sketch, "lostpointercapture", liftPointer);
  scope.on(window, "pointerup", liftPointer);
  scope.on(window, "blur", () => { lift(); drawingSound.stop(true); });
  scope.on(document, "visibilitychange", () => { if (document.hidden) { lift(); drawingSound.stop(true); } });
  const visibility = new MutationObserver(() => {
    if (modal.classList.contains('hidden') || modal.hidden) { lift(); drawingSound.stop(true); }
  });
  visibility.observe(modal, { attributes: true, attributeFilter: ['class', 'hidden'] });
  scope.add(() => { visibility.disconnect(); lift(); drawingSound.stop(true); });
  const useTool = (name) => {
    lift();
    drawingSound.stop(true);
    tool = name;
    sketch.dataset.tool = tool;
    for (const b of tools) b.setAttribute("aria-pressed", String(b.dataset.notebookTool === name));
  };
  for (const button of tools) scope.on(button, "click", () => useTool(button.dataset.notebookTool));
  // write: the pen to the left leaf, at the end of what is written there
  if (write) scope.on(write, "click", () => {
    text.focus();
    text.setSelectionRange(text.value.length, text.value.length);
  });
  // a width, or a colour: kept for next time; a colour takes the pencil up again
  const showPen = () => {
    sizes.forEach((b, i) => b.setAttribute("aria-pressed", String(i === pen.size)));
    colours.forEach((b, i) => b.setAttribute("aria-pressed", String(i === pen.colour)));
    sketch.style.setProperty("--pen", COLOURS[pen.colour]);
  };
  const choose = (change, pencil) => {
    Object.assign(pen, change);
    storage.setItem(PEN, JSON.stringify(pen));
    if (pencil) useTool("pencil");
    showPen();
  };
  sizes.forEach((b, i) => scope.on(b, "click", () => choose({ size: i }, false)));
  colours.forEach((b, i) => scope.on(b, "click", () => choose({ colour: i }, true)));
  showPen();
  scope.on($("notebook-clear"), "click", () => {
    lift();
    drawingSound.stop(true);
    ctx.clearRect(0, 0, PAGE.w, PAGE.h);
    page.drawn = false;
    saveSoon();
  });
  scope.on(text, "input", saveSoon);
  scope.on($("btn-close-notebook"), "click", () => {
    leave();
    dialogs.close();
  });
  if (i18n) scope.add(i18n.subscribe(() => { if (!modal.classList.contains("hidden")) render(); }));

  return {
    get isOpen() { return !modal.classList.contains("hidden"); },
    open(trigger) {
      void drawingSound.prepare();
      leave(); // (put away by Esc last time, maybe, a new page and empty)
      page = null;
      status.classList.remove("shown");
      openWorking();
      dialogs.open("notebook-modal", trigger);
      text.focus();
      // once it has come out of the index, on a sheet with nothing drawn on it yet
      quiet();
      if (!readPage(page.key)?.sketch && document.documentElement.dataset.reducedMotion !== "true") pencilAt = setTimeout(() => pencil.play(), 380);
    },
    // put away, as it is (the page is kept as it was left)
    close() {
      quiet();
      leave();
      if (!modal.classList.contains("hidden")) dialogs.close();
    },
  };
}
