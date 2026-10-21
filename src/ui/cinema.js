import { CHAPTERS } from "../shared/story.js";
import { PLACES } from "../shared/house.js";
import { sketchLayer, drawEmblem } from "./introSketches.js";

// The story's moments between the puzzles, told the way a film would:
//   card(lines)       the screen goes black and the lines come up out of it,
//                     one after another; held, and the black lifts — a click
//                     hurries it
// and a chapter card the first time he goes up into each floor's hall — put
// up before the hall is seen, which is gone into behind its black — with the
// emblem of whose floor it is drawn on it in the pencil of the cold open.
// While anything is showing, `busy` is true — the case file waits for it.

const SEEN = "story:seen"; // the chapters already shown
// whose floor each is: the emblem drawn on its chapter card
const EMBLEM = { 1: "ivy", 2: "silas", 3: "orion" };

export function mountCinema(scope, { storage, reducedMotion = () => false, i18n = null }) {
  let seen = read(), busy = 0;
  function read() {
    try { const kept = JSON.parse(storage.getItem(SEEN) || "[]"); return Array.isArray(kept) ? kept : []; } catch { return []; }
  }
  const mark = (id) => { if (!seen.includes(id)) { seen.push(id); storage.setItem(SEEN, JSON.stringify(seen)); } };
  const getChapterData = (storey) => (i18n?.getChapters() || CHAPTERS)[storey];

  // ── a card: black; its lines come up out of the dark one after another,
  // as a film's titles do; held, and the black lifts ──
  const LINE = 900; // ms between one line coming up and the next
  const RISE = 1700; // ms a line takes to come up
  // `sketch`: one of the three emblems, drawn in the pencil over the words
  // `brief`: the words up at once, and the card held a second once black
  function card(lines, { hold = 1500, onDark = null, sketch = null, brief = false } = {}) {
    busy++;
    return new Promise((resolve) => {
      const root = document.createElement("div");
      root.className = "cinema-card";
      root.setAttribute("role", "status");
      const text = document.createElement("div");
      text.className = "cinema-card-text";
      if (sketch) {
        const svg = sketchLayer(text);
        svg.classList.add("cinema-emblem");
        drawEmblem(svg, sketch, 150, brief ? 0.45 : 1);
      }
      lines.forEach((line, i) => {
        const p = document.createElement("p");
        p.className = i ? "cinema-line" : "cinema-line is-first";
        p.textContent = line;
        p.style.animationDelay = `${500 + i * LINE}ms`;
        text.append(p);
      });
      root.append(text);
      document.body.append(root);
      const still = reducedMotion();
      let timer = null, lifting = false;
      const lift = () => {
        if (lifting) return;
        lifting = true;
        scope.cancel(timer);
        root.classList.remove("is-shown");
        scope.later(() => { root.remove(); busy--; resolve(); }, still ? 0 : 900);
      };
      // a click or a key: the first brings every line up at once, the next lifts it
      let hurried = false;
      const hurry = () => {
        if (!hurried) { hurried = true; root.classList.add("is-all"); scope.cancel(timer); timer = scope.later(lift, 900); }
        else lift();
      };
      root.addEventListener("click", hurry);
      const onKey = (e) => { if (root.isConnected && (e.key === "Enter" || e.key === " " || e.key === "Escape")) { e.preventDefault(); e.stopPropagation(); hurry(); } };
      window.addEventListener("keydown", onKey, true);
      scope.add(() => window.removeEventListener("keydown", onKey, true));
      requestAnimationFrame(() => root.classList.add("is-shown"));
      // what is behind it changes only once the screen has gone black
      if (onDark) scope.later(onDark, still ? 0 : 950);
      if (still) { root.classList.add("is-all"); timer = scope.later(lift, 1800); return; }
      // black by 900 ms, then one second up
      if (brief) { root.classList.add("is-all"); hurried = true; timer = scope.later(lift, 1900); return; }
      timer = scope.later(lift, 500 + (lines.length - 1) * LINE + RISE + hold);
    });
  }

  // ── the floors: a chapter card before each floor's hall is first seen ──
  const chapterOf = (key) => {
    const storey = PLACES.find((p) => p.key === key)?.storey;
    return storey && CHAPTERS[storey] && !seen.includes(`chapter:${storey}`) ? storey : null;
  };
  /** Going into a place: if its floor's chapter has not been shown, the card
   *  comes up first and the place is gone into behind it (`go`) — true. If
   *  not, nothing happens here and the caller goes in its own way — false. */
  function chapterBefore(key, go) {
    const storey = chapterOf(key);
    if (!storey) return false;
    mark(`chapter:${storey}`);
    card(getChapterData(storey), { onDark: go, sketch: EMBLEM[storey], brief: true });
    return true;
  }

  /** Into the house by its door: the first time, the screen goes straight
   *  to the first chapter's card, and the house is gone into behind it
   *  (`goIn`) — the hall is first seen as the card lifts. */
  function enterHouse(goIn) {
    if (seen.includes("chapter:1")) { goIn(); return; }
    mark("chapter:1");
    card(getChapterData(1), { onDark: goIn, sketch: EMBLEM[1], brief: true });
  }

  return {
    card, enterHouse, chapterBefore,
    get busy() { return busy > 0; },
    reset() { seen = []; storage.setItem(SEEN, "[]"); },
  };
}
