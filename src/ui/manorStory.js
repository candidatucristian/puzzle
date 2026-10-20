import { MANOR_STORY } from "../shared/story.js";
import { passage } from "./passage.js";

// The first time he stands before the manor — straight after the desk, the
// letter read and the file opened — the house's own story is told over the
// picture of it, as the film's was told over the film (passage.js): whose it
// was, a floor for each of the three, and what he is to do. Each passage
// stays until Next (or Enter) brings on the one after; the last Next, or
// Skip, ends it. The house's name and the way in (#start-legend) wait under
// it and come up once it is told. Going in by the door ends it too.
export function playManorStory(scope, { reducedMotion = false } = {}) {
  const start = document.getElementById("start-screen");
  if (!start || start.classList.contains("hidden")) return;
  const root = document.createElement("div");
  root.className = "manor-story";
  const shade = document.createElement("div");
  shade.className = "intro-video-shade";
  shade.setAttribute("aria-hidden", "true");
  const asides = document.createElement("div");
  asides.className = "intro-video-asides";
  asides.setAttribute("aria-live", "polite");
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "intro-video-skip";
  skip.textContent = "Skip";
  root.append(shade, asides, skip);
  start.append(root);
  start.classList.add("is-telling");
  requestAnimationFrame(() => { root.classList.add("has-aside"); skip.classList.add("is-in"); });

  let index = 0, node = null, done = false, changing = false;
  // the start screen goes in on any click or key: these are only for the story
  const own = (event) => { event.stopPropagation(); event.preventDefault?.(); };
  const show = () => {
    if (done || changing) return;
    const going = node;
    if (going) { going.classList.add("is-out"); scope.later(() => going.remove(), reducedMotion ? 0 : 650); }
    if (index >= MANOR_STORY.length) { end(); return; }
    const part = MANOR_STORY[index++];
    node = passage(part);
    const next = document.createElement("button");
    next.type = "button";
    next.className = "intro-page-play manor-story-next";
    // how far along the house's story it is: "Next [2/7]"
    const count = document.createElement("span");
    count.className = "next-count";
    count.textContent = `[${index}/${MANOR_STORY.length}]`;
    next.append("Next ", count);
    next.addEventListener("click", (event) => { own(event); show(); });
    node.append(next);
    changing = true;
    // a breath between one passage and the next
    scope.later(() => {
      changing = false;
      if (done) return;
      asides.append(node);
      next.focus({ preventScroll: true });
    }, going ? (reducedMotion ? 0 : 650) : 900);
  };
  const end = () => {
    if (done) return;
    done = true;
    if (node?.isConnected) node.classList.add("is-out");
    root.classList.remove("has-aside");
    skip.classList.remove("is-in");
    start.classList.remove("is-telling");
    watch.disconnect();
    window.removeEventListener("keydown", onKey, true);
    scope.later(() => root.remove(), 1400);
  };
  skip.addEventListener("click", (event) => { own(event); end(); });
  // Enter or Space: the next passage (not the door)
  const onKey = (event) => {
    if (done || !["Enter", " "].includes(event.key) || event.target?.closest?.("#compact-bar")) return;
    own(event);
    show();
  };
  window.addEventListener("keydown", onKey, true);
  // gone in by the door (the start screen hidden): told enough
  const watch = new MutationObserver(() => { if (start.classList.contains("hidden")) end(); });
  watch.observe(start, { attributes: true, attributeFilter: ["class"] });
  scope.add(end);
  show();
}
