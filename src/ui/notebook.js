// The player's notebook. A working page for each puzzle (and each place of the
// house), written on and drawn on in pencil and kept by itself from one visit
// to the next; and beside it a shelf of folders — ten at most — to keep notes
// in. Save puts a copy of the page into the folder that is open; a note taken
// out of a folder is written on in place, and kept as it is written. Opened
// with the Notebook button or N: it slides in from the right, where the index
// stands aside for it. Nothing is ever written in it but what the player puts
// there.

import { mountNotebookPencil } from "./notebookPencil.js";

const PAGE = { w: 640, h: 300 }; // the sketch's own size, in its pixels
// the pencil's three widths (and the rubber's, with each), its three colours
const SIZES = [2, 4, 8], RUBBERS = [10, 18, 32];
const COLOURS = ["rgba(36,33,28,0.92)", "rgba(30,78,170,0.92)", "rgba(178,38,30,0.92)"];
const PEN = "notebook:pen"; // the width and colour last chosen
const MAX_FOLDERS = 10;
const SHELF = "notebook:folders"; // the folders and the notes in them
const OPEN = "notebook:open-folder"; // the folder last opened
const DATES = { en: "en-GB", ro: "ro-RO", ru: "ru-RU" };

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// what the notebook says, in the player's language (English without one)
const ENGLISH = {
  noRoom: "The browser has no more room — this is kept until the page is closed.",
  shelfFull: "The shelf is full",
  newFolder: "+ New folder",
  inFolder: "In “{name}”",
  emptyFolder: "Nothing kept here yet.",
  noteName: "The note’s name",
  noteNameFor: "A name for this note ({page})",
  newFolderFallback: "a new folder",
  deleteNote: "Delete this note",
  folderOpenTip: "Open — double-click to rename",
  folderBin: "Throw away this folder",
  folderBinAria: "Throw away the folder “{name}”",
  sure: "Sure?",
  sureAgain: "Sure? Click again",
  folderThrown: "The folder “{name}” was thrown away.",
  folderName: "Folder name",
  folderNumbered: "Folder {n}",
  shelfLimit: "Ten folders is all the shelf holds.",
  notesFolder: "Notes",
  nothingToKeep: "There is nothing on the page to keep yet.",
  keptIn: "Kept in “{name}”.",
  noteThrown: "“{name}” was thrown away.",
};

export function mountNotebook(scope, { levels, dialogs, storage, i18n = null }) {
  const $ = (id) => document.getElementById(id);
  const say_ = (key, params = {}) => i18n
    ? i18n.t(`notebook.${key}`, params)
    : ENGLISH[key].replace(/\{(\w+)\}/g, (_, k) => params[k] ?? "");
  const modal = $("notebook-modal");
  const title = $("notebook-title"), text = $("notebook-text"), sketch = $("notebook-sketch");
  const tools = document.querySelectorAll("[data-notebook-tool]");
  const sizes = document.querySelectorAll("[data-notebook-size]"), colours = document.querySelectorAll("[data-notebook-colour]");
  const folderList = $("notebook-folders"), folderCount = $("notebook-folder-count"), newFolder = $("notebook-new-folder");
  const notesWrap = $("notebook-notes-wrap"), notesLabel = $("notebook-notes-label"), noteList = $("notebook-notes");
  const back = $("notebook-back"), noteTitle = $("notebook-note-title"), saveButton = $("notebook-save");
  const saveFolder = $("notebook-save-folder"), deleteNote = $("notebook-delete-note"), status = $("notebook-status");
  if (!modal || !text || !sketch || !folderList) return { open() {}, get isOpen() { return false; } };
  sketch.width = PAGE.w;
  sketch.height = PAGE.h;
  const ctx = sketch.getContext("2d");
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
  let folders = readShelf(), openId = storage.getItem(OPEN);

  // ── keeping things ──
  function readShelf() {
    try {
      const kept = JSON.parse(storage.getItem(SHELF) || "[]");
      return Array.isArray(kept)
        ? kept.filter((f) => f && typeof f.id === "string").slice(0, MAX_FOLDERS)
          .map((f) => ({ id: f.id, name: String(f.name || "Folder"), notes: Array.isArray(f.notes) ? f.notes : [] }))
        : [];
    } catch {
      return [];
    }
  }
  function keepShelf() {
    if (storage.setItem(SHELF, JSON.stringify(folders))) return true;
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
  const folder = (id = openId) => folders.find((f) => f.id === id) ?? null;
  const note = () => (page?.kind === "note" ? (folder(page.folderId)?.notes.find((n) => n.id === page.noteId) ?? null) : null);
  const picture = () => (page?.drawn ? sketch.toDataURL("image/png") : null);

  // what is on the page, put away: a working page by its own key, a note in its folder
  function save() {
    clearTimeout(saveTimer);
    if (!page) return;
    if (page.kind === "note") {
      const n = note();
      if (!n) return;
      n.text = text.value;
      n.sketch = picture();
      n.title = noteTitle.value.trim() || n.title;
      keepShelf();
      return;
    }
    const blank = !text.value.trim() && !page.drawn;
    if (blank) storage.removeItem(`notebook:${page.key}`);
    else storage.setItem(`notebook:${page.key}`, JSON.stringify({ text: text.value, sketch: picture() }));
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
    text.value = content?.text ?? "";
    ctx.clearRect(0, 0, PAGE.w, PAGE.h);
    page.drawn = false;
    if (content?.sketch) {
      const img = new Image(), shown = page;
      img.onload = () => {
        if (page !== shown) return;
        ctx.drawImage(img, 0, 0);
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
    save();
    page = working();
    paint(readPage(page.key));
    noteTitle.value = "";
    render();
  }
  function openNote(f, n) {
    quiet();
    save();
    page = { kind: "note", folderId: f.id, noteId: n.id, name: n.title };
    paint(n);
    noteTitle.value = n.title;
    render();
    text.focus();
  }

  // ── the shelf ──
  function render() {
    // the folders, the open one standing open
    folderList.replaceChildren(...folders.map((f) => folderItem(f)));
    folderCount.textContent = `${folders.length} / ${MAX_FOLDERS}`;
    newFolder.disabled = folders.length >= MAX_FOLDERS;
    newFolder.textContent = folders.length >= MAX_FOLDERS ? say_("shelfFull") : say_("newFolder");
    // the notes in the open one
    const open = folder();
    notesWrap.hidden = !open;
    if (open) {
      notesLabel.textContent = say_("inFolder", { name: open.name });
      const items = [...open.notes].sort((a, b) => b.at - a.at).map((n) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "shelf-note";
        b.classList.toggle("open", page?.kind === "note" && page.noteId === n.id);
        const name = document.createElement("span");
        name.className = "note-name";
        name.textContent = n.title;
        const meta = document.createElement("span");
        meta.className = "note-meta";
        meta.textContent = `${n.from ? `${n.from} · ` : ""}${when(n.at)}`;
        b.append(name, meta);
        b.addEventListener("click", () => openNote(open, n));
        li.append(b);
        return li;
      });
      if (!items.length) {
        const li = document.createElement("li");
        li.className = "shelf-empty";
        li.textContent = say_("emptyFolder");
        items.push(li);
      }
      noteList.replaceChildren(...items);
    }
    // the page's own bar and the way to put it away
    const onNote = page?.kind === "note";
    title.textContent = onNote ? `${folder(page.folderId)?.name ?? ""} › ${note()?.title ?? ""}` : (page?.name ?? "");
    back.hidden = !onNote;
    deleteNote.hidden = !onNote;
    saveButton.hidden = onNote;
    noteTitle.placeholder = onNote ? say_("noteName") : say_("noteNameFor", { page: page?.name ?? "" });
    saveFolder.textContent = open ? `“${open.name}”` : say_("newFolderFallback");
    disarm(deleteNote, say_("deleteNote"));
  }

  function folderItem(f) {
    const li = document.createElement("li");
    li.className = "shelf-folder";
    li.classList.toggle("open", f.id === openId);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "folder-tab";
    b.setAttribute("aria-pressed", String(f.id === openId));
    b.title = say_("folderOpenTip");
    const name = document.createElement("span");
    name.className = "folder-name";
    name.textContent = f.name;
    const count = document.createElement("span");
    count.className = "folder-count";
    count.textContent = String(f.notes.length);
    b.append(name, count);
    b.addEventListener("click", () => {
      openId = f.id;
      storage.setItem(OPEN, f.id);
      render();
    });
    b.addEventListener("dblclick", () => rename(li, f));
    const bin = document.createElement("button");
    bin.type = "button";
    bin.className = "folder-bin";
    bin.textContent = "×";
    bin.setAttribute("aria-label", say_("folderBinAria", { name: f.name }));
    bin.title = say_("folderBin");
    bin.addEventListener("click", () => {
      // asked twice: a folder thrown away takes its notes with it
      if (!armed(bin, say_("sure"))) return;
      folders = folders.filter((x) => x.id !== f.id);
      if (page?.kind === "note" && page.folderId === f.id) {
        page = null;
        openWorking();
      }
      if (openId === f.id) {
        openId = folders[0]?.id ?? null;
        storage.setItem(OPEN, openId ?? "");
      }
      keepShelf();
      render();
      say(say_("folderThrown", { name: f.name }));
    });
    li.append(b, bin);
    return li;
  }

  // a name written in on the spot, for a new folder or an old one
  function nameField(initial, done) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "folder-input";
    input.maxLength = 24;
    input.value = initial;
    input.placeholder = say_("folderName");
    input.spellcheck = false;
    input.autocomplete = "off";
    let finished = false;
    const finish = (keep) => {
      if (finished) return;
      finished = true;
      done(keep ? input.value.trim() : null);
    };
    input.addEventListener("keydown", (e) => {
      // Esc here only lets go of the name, it does not close the notebook
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        finish(false);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      }
    });
    input.addEventListener("blur", () => finish(true));
    return input;
  }
  function rename(li, f) {
    const input = nameField(f.name, (name) => {
      if (name && name !== f.name) {
        f.name = name;
        keepShelf();
      }
      render();
    });
    li.replaceChildren(input);
    input.focus();
    input.select();
  }
  function makeFolder(name, then) {
    if (folders.length >= MAX_FOLDERS) {
      say(say_("shelfLimit"), "warn");
      return null;
    }
    const f = { id: uid(), name: name || say_("folderNumbered", { n: folders.length + 1 }), notes: [] };
    folders.push(f);
    openId = f.id;
    storage.setItem(OPEN, f.id);
    keepShelf();
    then?.(f);
    render();
    return f;
  }
  scope.on(newFolder, "click", () => {
    if (folders.length >= MAX_FOLDERS) return;
    const li = document.createElement("li");
    li.className = "shelf-folder new";
    const input = nameField("", (name) => {
      if (name === null) render();
      else makeFolder(name);
    });
    li.append(input);
    folderList.append(li);
    input.focus();
  });

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
    const into = folder() ?? makeFolder(say_("notesFolder"));
    if (!into) return;
    const n = { id: uid(), title: noteTitle.value.trim() || `${page.name}`, from: page.name, at: Date.now(), text: text.value, sketch: picture() };
    into.notes.push(n);
    const kept = keepShelf();
    noteTitle.value = "";
    render();
    if (kept) say(say_("keptIn", { name: into.name }));
    noteList.querySelector(".shelf-note")?.classList.add("just-kept");
  });
  scope.on(deleteNote, "click", () => {
    const f = folder(page?.folderId), n = note();
    if (!f || !n || !armed(deleteNote, say_("sureAgain"))) return;
    f.notes = f.notes.filter((x) => x.id !== n.id);
    keepShelf();
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
  scope.on(sketch, "pointerdown", (e) => {
    quiet();
    sketch.setPointerCapture(e.pointerId);
    drawing = pos(e);
  });
  scope.on(sketch, "pointermove", (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = RUBBERS[pen.size];
    } else {
      ctx.strokeStyle = COLOURS[pen.colour];
      ctx.lineWidth = SIZES[pen.size];
    }
    ctx.beginPath();
    ctx.moveTo(drawing.x, drawing.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
    drawing = p;
    page.drawn = true;
  });
  const lift = () => {
    if (drawing) {
      drawing = null;
      saveSoon();
    }
  };
  scope.on(sketch, "pointerup", lift);
  scope.on(sketch, "pointercancel", lift);
  const useTool = (name) => {
    tool = name;
    sketch.dataset.tool = tool;
    for (const b of tools) b.setAttribute("aria-pressed", String(b.dataset.notebookTool === name));
  };
  for (const button of tools) scope.on(button, "click", () => useTool(button.dataset.notebookTool));
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
    ctx.clearRect(0, 0, PAGE.w, PAGE.h);
    page.drawn = false;
    saveSoon();
  });
  scope.on(text, "input", saveSoon);
  scope.on($("btn-close-notebook"), "click", () => {
    save();
    dialogs.close();
  });
  if (i18n) scope.add(i18n.subscribe(() => { if (!modal.classList.contains("hidden")) render(); }));

  return {
    get isOpen() { return !modal.classList.contains("hidden"); },
    open(trigger) {
      if (!folder()) openId = folders[0]?.id ?? null;
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
      save();
      if (!modal.classList.contains("hidden")) dialogs.close();
    },
  };
}
