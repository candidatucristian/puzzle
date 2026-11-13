import { SECTIONS, ADVICE, SOUND_NAMES, CANDIDATES } from "./tasks.js";

// The to-do page: the audit (audit.json) and the list's own tasks (tasks.js),
// with the ticks, and what is found of each sound, kept in this browser.
const store = {
  get(key, fallback = null) { try { const v = localStorage.getItem(`todo:${key}`); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`todo:${key}`, JSON.stringify(value)); } catch { /* (private window: the ticks last the visit) */ } },
};
const make = (tag, props = {}, ...children) => {
  const el = Object.assign(document.createElement(tag), props);
  for (const child of children.flat()) if (child != null) el.append(child);
  return el;
};
const tag = (text, kind = "") => make("span", { className: `tag ${kind}`, textContent: text });
const seconds = (s) => (s == null ? "?" : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : `${s.toFixed(1)} s`);
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

const audit = await fetch("./audit.json", { cache: "no-store" }).then((r) => r.json());
document.getElementById("stamp").textContent =
  `Auditul din ${new Date(audit.generated).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" })}`;

// ── what each part counts ───────────────────────────────────────────────────
const sections = document.getElementById("sections");
const counters = [];
function section(id, title, { intro, advice } = {}) {
  const progress = make("span", { className: "progress" });
  const el = make("section", { className: "section", id },
    make("div", { className: "section-head" }, make("h2", { textContent: title }), progress),
    intro ? make("p", { className: "intro", textContent: intro }) : null,
    advice ? make("p", { className: "advice", textContent: advice }) : null);
  sections.append(el);
  return { el, progress };
}
function tally(progress, ticks) {
  const update = () => {
    const done = ticks.filter((t) => t.checked).length;
    progress.replaceChildren(`${done} din ${ticks.length}`, make("i", {}, make("i", { style: `width:${ticks.length ? (100 * done) / ticks.length : 0}%` })));
    renderSummary();
  };
  ticks.forEach((t) => t.addEventListener("change", update));
  counters.push({ progress, ticks, update });
  update();
}
function tick(key, label) {
  const box = make("input", { type: "checkbox", className: "tick", checked: Boolean(store.get(`tick:${key}`, false)) });
  box.setAttribute("aria-label", label);
  box.addEventListener("change", () => store.set(`tick:${key}`, box.checked));
  return box;
}

// ── sounds: listen to each, and write under it what is found out ────────────
// The notes live in todo/notes.json (scripts/todo-notes.mjs, on the dev
// server), keyed by the sound's file: { note, done, updated }. A copy is kept
// in this browser too, for when the file cannot be written.
const notes = await fetch("/__todo/notes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const toFile = notes !== null;
const noteOf = (file) => ({ note: "", done: false, ...store.get(`note:${file}`, {}), ...(notes?.[file] ?? {}) });
async function saveNote(file, value, status) {
  store.set(`note:${file}`, { ...store.get(`note:${file}`, {}), ...value });
  if (!toFile) { status("salvat doar în browser", "is-warn"); return; }
  status("se salvează…");
  try {
    const r = await fetch("/__todo/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: file, value }) });
    if (!r.ok) throw new Error(String(r.status));
    status(`salvat · ${new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`, "is-ok");
  } catch { status("nu s-a salvat: serverul e oprit?", "is-bad"); }
}
// what was typed in the first version of this page (a link and Content ID, in the browser), carried over once
for (const s of audit.sounds) {
  const page = store.get(`sound:${s.file}:page`, ""), cid = store.get(`sound:${s.file}:cid`, ""), ticked = store.get(`tick:sound:${s.file}`, false);
  if (noteOf(s.file).note || (!page && !cid && !ticked)) continue;
  const note = [page, cid ? `Content ID: ${cid === "da" ? "înregistrat" : "nu"}` : ""].filter(Boolean).join("\n");
  saveNote(s.file, { note, done: Boolean(ticked) }, () => {});
  if (notes) notes[s.file] = { ...notes[s.file], note, done: Boolean(ticked) };
}

const player = new Audio();
let playing = null; // { id, seconds, card, button, bar, time }
const PLAY = '<svg viewBox="0 0 10 10"><path d="M2.5 1.2l6.3 3.8-6.3 3.8z"/></svg>', PAUSE = '<svg viewBox="0 0 10 10"><path d="M2.4 1.5h1.8v7H2.4zM5.8 1.5h1.8v7H5.8z"/></svg>';
const clock = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
function follow() {
  if (!playing) return;
  const { bar, time } = playing, length = player.duration;
  bar.style.transform = `scaleX(${Number.isFinite(length) && length ? player.currentTime / length : 0})`;
  time.textContent = `${clock(player.currentTime)} / ${clock(length)}`;
  if (!player.paused) requestAnimationFrame(follow);
}
function stop() {
  if (!playing) return;
  const { card, button, bar, time, seconds: length } = playing;
  card.classList.remove("is-playing");
  button.innerHTML = PLAY; button.title = "Ascultă";
  bar.style.transform = "scaleX(0)"; time.textContent = `0:00 / ${clock(length)}`;
  playing = null;
}
player.addEventListener("ended", stop);
player.addEventListener("play", () => { if (playing) { playing.button.innerHTML = PAUSE; playing.button.title = "Pauză"; } requestAnimationFrame(follow); });
player.addEventListener("pause", () => { if (playing) { playing.button.innerHTML = PLAY; playing.button.title = "Ascultă"; follow(); } });

// one sound: its player, and (unless compact) the box to write in and its tick
function soundCard(sound, { name = SOUND_NAMES[sound.file] ?? sound.file, where, placeholder, compact = false, ticks = [] } = {}) {
  const id = Symbol(sound.file);
  const known = noteOf(sound.file);
  const button = make("button", { className: "play", type: "button", innerHTML: PLAY, title: "Ascultă" });
  const bar = make("i", { className: "bar" });
  const track = make("div", { className: "track", title: "Derulează" }, bar);
  const time = make("span", { className: "time", textContent: `0:00 / ${clock(sound.seconds)}` });
  const status = make("span", { className: "status", textContent: known.updated ? "salvat" : "" });
  const say = (text, kind = "") => { status.textContent = text; status.className = `status ${kind}`; };
  const head = make("div", { className: "sound-head" },
    make("div", { className: "title" }, make("span", { textContent: name }),
      make("span", { className: "tags" }, sound.demo ? tag("demo", "demo") : tag("nu e în demo"))),
    make("div", { className: "meta" },
      make("code", { textContent: sound.file }),
      make("span", { textContent: seconds(sound.seconds) }),
      make("span", { textContent: where ?? (sound.places.join(" · ") || "nu se aude nicăieri") })));
  const card = make("li", { className: `sound ${compact ? "is-compact" : ""}` }, button, head);
  if (!compact) {
    const done = make("input", { type: "checkbox", className: "tick", checked: Boolean(known.done) });
    done.setAttribute("aria-label", `${sound.file}: gata`);
    ticks.push(done);
    const text = make("textarea", { className: "note", rows: 2, value: known.note || "", placeholder });
    text.setAttribute("aria-label", `Notițe despre ${sound.file}`);
    const grow = () => { text.style.height = "auto"; text.style.height = `${text.scrollHeight + 2}px`; };
    let wait = 0;
    text.addEventListener("input", () => { grow(); say("…"); clearTimeout(wait); wait = setTimeout(() => { wait = 0; saveNote(sound.file, { note: text.value }, say); }, 600); });
    text.addEventListener("blur", () => { if (wait) { clearTimeout(wait); wait = 0; saveNote(sound.file, { note: text.value }, say); } });
    card.append(make("label", { className: "done" }, done, make("span", { textContent: "gata" })));
    done.addEventListener("change", () => { card.classList.toggle("is-done", done.checked); saveNote(sound.file, { done: done.checked }, say); });
    card.classList.toggle("is-done", done.checked);
    requestAnimationFrame(grow);
    card.append(make("div", { className: "player" }, track, time), make("div", { className: "write" }, text, status));
  } else {
    card.append(make("div", { className: "player" }, track, time));
  }
  button.addEventListener("click", () => {
    if (playing?.id === id) { if (player.paused) player.play().catch(() => {}); else player.pause(); return; }
    stop();
    playing = { id, seconds: sound.seconds, card, button, bar, time };
    card.classList.add("is-playing");
    player.src = `/${sound.src ?? `assets/sounds/${sound.file}`}`;
    player.play().catch(() => say("nu se poate reda", "is-bad"));
    follow();
  });
  track.addEventListener("pointerdown", (e) => {
    const fresh = playing?.id !== id;
    if (fresh) button.click();
    const seek = (ev) => {
      const r = track.getBoundingClientRect(), k = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      if (playing?.id === id && Number.isFinite(player.duration)) { player.currentTime = k * player.duration; follow(); }
    };
    // (a sound just started knows its length only once its header is in)
    if (fresh && !Number.isFinite(player.duration)) player.addEventListener("loadedmetadata", () => seek(e), { once: true });
    else seek(e);
    track.setPointerCapture(e.pointerId);
    track.addEventListener("pointermove", seek);
    track.addEventListener("pointerup", () => track.removeEventListener("pointermove", seek), { once: true });
  });
  return card;
}

{
  const bySound = Object.fromEntries(audit.sounds.map((s) => [s.file, s]));
  const offered = new Set(CANDIDATES.map((c) => c.file));
  const inGame = audit.sounds.filter((s) => !offered.has(s.file));
  const { el, progress } = section("sounds", `Sunetele jocului (${inGame.length})`, { advice: ADVICE.sounds });
  el.append(make("p", { className: `saved-where ${toFile ? "" : "is-warn"}`, textContent: toFile ? ADVICE.saved : ADVICE.unsaved }));
  const ticks = [];
  // new sounds made to replace one, to be heard beside it
  const fresh = CANDIDATES.filter((c) => bySound[c.file]);
  if (fresh.length) {
    el.append(make("h3", { className: "group is-new", textContent: `De ascultat: făcute nou · ${fresh.length}` }));
    for (const c of fresh) {
      const old = bySound[c.replaces];
      const box = make("ol", { className: "sound-list candidate" },
        soundCard({ ...bySound[c.file], demo: old?.demo ?? false }, {
          name: c.name, where: c.detail, placeholder: "Cum ți se pare? Ce schimb: mai rar, mai repede, mai încet, alt sunet, mai lungă…",
        }),
        old ? soundCard(old, { name: `Cea veche: ${SOUND_NAMES[old.file] ?? old.file}`, where: "de comparat", compact: true }) : null);
      el.append(box);
    }
  }
  const groups = [["Muzică", inGame.filter((s) => s.music)], ["Efecte", inGame.filter((s) => !s.music)]];
  for (const [title, list] of groups) {
    el.append(make("h3", { className: "group", textContent: `${title} · ${list.length}` }));
    el.append(make("ol", { className: "sound-list" }, list.map((sound) => soundCard(sound, {
      ticks, placeholder: "Ce ai aflat: numele adevărat, autorul, linkul de pe Pixabay, Content ID…",
    }))));
  }
  el.append(make("p", { className: "intro made-in-code", textContent: ADVICE.madeInCode }));
  tally(progress, ticks);
}

// ── pictures and films to replace or to confirm ───────────────────────────────
function pictures(id, title, list, { advice, note, doneLabel }) {
  const { el, progress } = section(id, title, { advice });
  const ticks = [];
  const grid = make("div", { className: "pictures" });
  for (const p of [...list].sort((a, b) => Number(b.demo) - Number(a.demo))) {
    const key = `${id}:${p.file}`;
    const done = tick(key, `${p.file} ${doneLabel}`);
    ticks.push(done);
    const src = `/assets/${p.file}`;
    const thumb = /\.mp4$/.test(p.file)
      ? make("video", { className: "thumb is-film", src: `${src}#t=60`, muted: true, preload: "metadata" })
      : make("img", { className: "thumb", src, alt: "", loading: "lazy" });
    const card = make("div", { className: "picture" }, thumb,
      make("div", { className: "body" }, done,
        make("div", {}, make("div", { className: "file", textContent: p.file }),
          make("span", { className: "tags", style: "margin:4px 0 0" }, p.demo ? tag("demo", "demo") : null, tag(mb(p.size)))),
        make("p", { className: "note", textContent: note(p) })));
    const mark = () => card.classList.toggle("is-done", done.checked);
    done.addEventListener("change", mark); mark();
    grid.append(card);
  }
  el.append(grid);
  tally(progress, ticks);
}
const ai = audit.pictures.filter((p) => p.source === "ai");
const unknown = audit.pictures.filter((p) => p.source === "unknown" || p.source === "pixabay");
pictures("ai", "Imagini generate cu AI, încă în joc", ai, {
  advice: ADVICE.ai, doneLabel: "înlocuită",
  note: (p) => (p.demo ? "Se vede în demo. " : "") + `Dovada: ${p.evidence}`,
});
pictures("confirm", "De confirmat: de unde vin", unknown, {
  advice: `${ADVICE.unknown} ${ADVICE.pixabay}`, doneLabel: "lămurită",
  note: (p) => (/IntroVideo/.test(p.file) ? "Filmul de intro: a fost făcut cu AI? Biroul din prolog e potrivit pe ultimul lui cadru." : p.evidence || "Nicio notă în proiect."),
});

// ── type and code ─────────────────────────────────────────────────────────────
{
  const { el, progress } = section("type", "Fonturi și biblioteci de cod", { advice: ADVICE.fonts });
  const ticks = [];
  const rows = make("ul", { className: "rows" });
  for (const f of audit.fonts) {
    const box = tick(`font:${f.name}`, f.name);
    if (f.ok && store.get(`tick:font:${f.name}`) === null) { box.checked = true; store.set(`tick:font:${f.name}`, true); }
    ticks.push(box);
    rows.append(make("li", {}, box, make("span", { className: `state ${f.ok ? "ok" : "todo"}`, textContent: f.ok ? "în regulă" : "de făcut" }),
      make("span", { textContent: f.name }), make("span", { className: "what", textContent: `${f.licence} · ${f.where}${f.note ? ` · ${f.note}` : ""}` })));
  }
  for (const l of audit.libraries) {
    rows.append(make("li", {}, make("span", { style: "width:16px" }), make("span", { className: `state ${l.ok ? "ok" : "todo"}`, textContent: l.ok ? "în regulă" : "de verificat" }),
      make("span", { textContent: `${l.name} ${l.version}` }), make("span", { className: "what", textContent: `licența ${l.licence}` })));
  }
  el.append(rows);
  tally(progress, ticks);
}

// ── the list's own tasks ──────────────────────────────────────────────────────
for (const s of SECTIONS) {
  const { el, progress } = section(s.id, s.title, { intro: s.id === "archive" ? `${s.intro} Acum: ${audit.archive.files} fișiere, ${mb(audit.archive.size)}.` : s.intro });
  const ticks = [];
  for (const t of s.tasks) {
    const box = tick(`task:${t.id}`, t.title);
    ticks.push(box);
    const row = make("div", { className: "task" }, box,
      make("h3", { textContent: t.title }),
      make("span", { className: `who ${t.who === "tu" ? "is-you" : ""}`, textContent: t.who === "tu" ? "tu" : "eu" }),
      t.detail ? make("p", { textContent: t.detail }) : null);
    const mark = () => row.classList.toggle("is-done", box.checked);
    box.addEventListener("change", mark); mark();
    el.append(row);
  }
  tally(progress, ticks);
}

// ── the counts at the top ─────────────────────────────────────────────────────
function renderSummary() {
  const open = (id) => {
    const c = counters.find((x) => x.progress.closest("section")?.id === id);
    return c ? c.ticks.filter((t) => !t.checked).length : 0;
  };
  const tasks = SECTIONS.reduce((n, s) => n + open(s.id), 0);
  const chips = [
    ["sounds", open("sounds"), `sunete de lămurit (din ${counters.find((c) => c.progress.closest("section")?.id === "sounds")?.ticks.length ?? 0})`, open("sounds") ? "is-warn" : "is-ok"],
    ["sounds", audit.sounds.filter((s) => s.music).length, "piese de muzică: Content ID", "is-warn"],
    ["ai", open("ai"), `imagini AI (${ai.filter((p) => p.demo).length} în demo)`, open("ai") ? "is-bad" : "is-ok"],
    ["confirm", open("confirm"), "de confirmat", open("confirm") ? "is-warn" : "is-ok"],
    ["type", open("type"), "fonturi de copiat în joc", open("type") ? "is-warn" : "is-ok"],
    ["steam", tasks, "sarcini rămase", ""],
    ["archive", audit.archive.files, `fișiere scoase (${mb(audit.archive.size)})`, ""],
  ];
  document.getElementById("summary").replaceChildren(...chips.map(([href, n, text, kind]) =>
    make("a", { className: `chip ${kind}`, href: `#${href}` }, make("b", { textContent: n }), make("span", { textContent: text }))));
}
renderSummary();
