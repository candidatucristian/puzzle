import { CHAPTERS, FIRST_THOUGHTS } from "../shared/story.js";

// The story's moments between the puzzles, told the way a film would:
//   card(lines)       the screen goes black and the lines are typed onto it,
//                     held a moment, and the black lifts — a click hurries it
//   say(text)         one line of the Inspector's thoughts, typed under the
//                     picture like a subtitle, and gone
//   headlights()      a car's lights sweeping the front of the manor, as he
//                     draws up on the drive
// and, watching the house: a chapter card the first time he stands on each
// floor, and his first thought the first time he stands in each place.
// While anything is showing, `busy` is true — the case file waits for it.

const SEEN = "story:seen"; // the chapters and the places he has had his first thought in

export function mountCinema(scope, { levels, storage, reducedMotion = () => false, isBusy = () => false }) {
  let seen = read(), busy = 0, lastPlace = null, active = false;
  function read() {
    try { const kept = JSON.parse(storage.getItem(SEEN) || "[]"); return Array.isArray(kept) ? kept : []; } catch { return []; }
  }
  const mark = (id) => { if (!seen.includes(id)) { seen.push(id); storage.setItem(SEEN, JSON.stringify(seen)); } };

  // ── a card: black, the lines typed, held, lifted ──
  function card(lines, { hold = 1500 } = {}) {
    busy++;
    return new Promise((resolve) => {
      const root = document.createElement("div");
      root.className = "cinema-card";
      root.setAttribute("role", "status");
      const text = document.createElement("div");
      text.className = "cinema-card-text";
      const rows = lines.map((_, i) => { const p = document.createElement("p"); p.className = i ? "cinema-line" : "cinema-line is-first"; text.append(p); return p; });
      root.append(text);
      document.body.append(root);
      const still = reducedMotion();
      let done = false, timer = null;
      const finish = () => {
        if (done) return;
        done = true;
        scope.cancel(timer);
        rows.forEach((p, i) => { p.textContent = lines[i]; });
        root.classList.add("is-typed");
        timer = scope.later(lift, still ? 600 : hold);
      };
      const lift = () => {
        root.classList.remove("is-shown");
        scope.later(() => { root.remove(); busy--; resolve(); }, still ? 0 : 700);
      };
      // a click or a key hurries it on: the first finishes the typing, the next lifts it
      const hurry = () => { if (!done) finish(); else { scope.cancel(timer); lift(); } };
      root.addEventListener("click", hurry);
      const onKey = (e) => { if (root.isConnected && (e.key === "Enter" || e.key === " " || e.key === "Escape")) { e.preventDefault(); e.stopPropagation(); hurry(); } };
      window.addEventListener("keydown", onKey, true);
      scope.add(() => window.removeEventListener("keydown", onKey, true));
      requestAnimationFrame(() => root.classList.add("is-shown"));
      if (still) { finish(); return; }
      // type it, a letter at a time, a pause between the lines
      let line = 0, ch = 0;
      const tick = () => {
        if (done) return;
        if (line >= lines.length) { finish(); return; }
        ch++;
        rows[line].textContent = lines[line].slice(0, ch);
        if (ch >= lines[line].length) { line++; ch = 0; timer = scope.later(tick, 420); return; }
        timer = scope.later(tick, 55 + Math.random() * 45);
      };
      timer = scope.later(tick, 650);
    });
  }

  // ── a thought, as a film would put it: the black bars of the wide screen
  // close in over the picture, a stamp in the top one says where he stands
  // and when, and in the bottom one his thought is typed out; held, and the
  // bars draw back ──
  function say(text, { where = "" } = {}) {
    const host = document.getElementById("game-viewport");
    if (!host) return Promise.resolve();
    busy++;
    return new Promise((resolve) => {
      const still = reducedMotion();
      const frame = document.createElement("div");
      frame.className = "cinema-frame";
      frame.setAttribute("role", "status");
      frame.innerHTML = `<div class="cinema-bar is-top"><span class="cinema-where"></span><span class="cinema-time"></span></div>
        <div class="cinema-bar is-bottom"><p class="cinema-thought-line"></p></div>`;
      frame.querySelector(".cinema-where").textContent = where ? `Ashcombe House — ${where}` : "Ashcombe House";
      frame.querySelector(".cinema-time").textContent = clock();
      const line = frame.querySelector(".cinema-thought-line");
      host.append(frame);
      requestAnimationFrame(() => requestAnimationFrame(() => frame.classList.add("is-on")));
      let ch = still ? text.length : 0;
      const end = () => {
        frame.classList.remove("is-on", "is-typed");
        scope.later(() => { frame.remove(); busy--; resolve(); }, still ? 0 : 1000);
      };
      const tick = () => {
        ch++;
        line.textContent = text.slice(0, ch);
        if (ch < text.length) scope.later(tick, 30 + Math.random() * 26);
        else { frame.classList.add("is-typed"); scope.later(end, 4400); }
      };
      if (still) { line.textContent = text; frame.classList.add("is-typed"); scope.later(end, 5000); }
      else scope.later(tick, 1100);
    });
  }
  // the night going on: a few minutes later for every place he comes to
  function clock() {
    const minutes = 23 * 60 + 38 + seen.filter((id) => id.startsWith("thought:")).length * 4;
    const h = Math.floor(minutes / 60) % 24, m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // ── the car drawing up: its lights across the front of the manor ──
  function headlights() {
    const start = document.getElementById("start-screen");
    if (!start || reducedMotion()) return;
    const sweep = document.createElement("div");
    sweep.className = "cinema-headlights";
    sweep.innerHTML = "<span></span>";
    start.append(sweep);
    scope.later(() => sweep.remove(), 4200);
  }

  // ── watching the house: a chapter card for each floor, a first thought
  // in each place, once each ──
  async function arrive(place) {
    active = true;
    // once the walk in has brought the picture up
    await new Promise((r) => scope.later(r, 500));
    const storey = place.storey;
    if (storey && CHAPTERS[storey] && !seen.includes(`chapter:${storey}`)) {
      mark(`chapter:${storey}`);
      await card(CHAPTERS[storey], { hold: 1300 });
    }
    const thought = FIRST_THOUGHTS[place.key];
    if (thought && !seen.includes(`thought:${place.key}`) && levels.place?.key === place.key) {
      mark(`thought:${place.key}`);
      await new Promise((r) => scope.later(r, 700));
      if (levels.place?.key === place.key) await say(thought, { where: place.name });
    }
    active = false;
  }
  scope.add(levels.subscribe(() => {
    const place = levels.place;
    const key = place?.key ?? null;
    if (key === lastPlace) return;
    lastPlace = key;
    if (!place || active || isBusy()) return;
    const story = place.storey && !seen.includes(`chapter:${place.storey}`);
    const thought = FIRST_THOUGHTS[key] && !seen.includes(`thought:${key}`);
    if (story || thought) arrive(place);
  }));

  return {
    card, say, headlights,
    get busy() { return busy > 0 || active; },
    reset() { seen = []; storage.setItem(SEEN, "[]"); lastPlace = null; },
  };
}
