import { OPENING } from "../shared/story.js";
import { revealTextSegments } from "../shared/textLayout.js";
import { sketchLayer, erase } from "./introSketches.js";
import { makeScore } from "./sketchScore.js";
import { FILM_SCENES } from "./filmSketches.js";

// The opening film, drawn (2026-11-14, in place of the generated film): for
// each of Arthur Wren's lines (story.js OPENING.asides) a drawing in the
// game's thin white pencil puts itself down line by line, the line under it —
// its small heading over it — its words coming up one after another; then
// both are rubbed out and the next comes. Black with grain on it, a score
// made in code under it (sketchScore.js). Nothing recorded, nothing generated.
//
// `count`: how many scenes to play (all by default); `gate`: wait for one
// click first, so the sound may start (not needed after a button press).
// Resolves when it has played, or at once on skip().

const SCENE_MS = 7400;   // a drawing up, read and held
const BETWEEN_MS = 1300; // rubbed out, the dark between two

export function playSketchFilm(parent, { game = null, audio = null, i18n = null, reducedMotion = false, count = FILM_SCENES.length, gate = false } = {}) {
  const root = document.createElement("div");
  root.id = "cold-open";
  root.className = "is-film";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", i18n ? i18n.t("coldOpen.ariaOpening") : "Ashcombe Manor: the opening");
  root.innerHTML = `
    <div class="co-vignette" aria-hidden="true"></div>
    <div class="co-grain" aria-hidden="true"></div>
    <div class="co-flicker" aria-hidden="true"></div>
    <div class="co-caption" aria-live="polite"><p class="co-cap-over"></p><p class="co-cap-line"></p></div>
    <button type="button" class="co-skip" hidden>${i18n ? i18n.t("common.skipShort") : "Skip"}</button>
    ${gate ? `<div class="co-gate"><span class="co-gate-rule" aria-hidden="true"></span>
      <button type="button" class="co-gate-go">${i18n ? i18n.t("intro.clickToBegin") : "Click to begin"}</button>
      <p class="co-gate-note">${i18n ? i18n.t("intro.bestWithSound") : "Best with sound"}</p></div>` : ""}`;
  root.style.setProperty("--co-grain-img", `url(${noiseImage(256)})`);
  if (reducedMotion) root.classList.add("is-still");
  parent.append(root);
  const svg = sketchLayer(root);
  svg.setAttribute("viewBox", "330 90 940 520");
  root.insertBefore(svg, root.querySelector(".co-caption"));
  const caption = root.querySelector(".co-caption"), over = caption.firstElementChild, line = caption.lastElementChild;
  const skipBtn = root.querySelector(".co-skip");
  const score = makeScore(game, audio);
  const asides = (i18n?.getOpening?.() || OPENING).asides;

  // time, which a skip cuts short
  let skipped = false;
  const timers = new Map(), stops = new Set();   // (timer → how to cut its sleep short)
  const sleep = (ms) => new Promise((ok, cut) => {
    if (skipped) { cut(SKIP); return; }
    const t = setTimeout(() => { timers.delete(t); ok(); }, ms);
    timers.set(t, cut);
  });
  const skip = () => {
    if (skipped) return;
    skipped = true;
    for (const [t, cut] of timers) { clearTimeout(t); cut(SKIP); }
    timers.clear();
  };
  skipBtn.addEventListener("click", skip);

  const say = (aside) => {
    caption.classList.remove("is-in", "is-out");
    over.textContent = aside.over || "";
    over.hidden = !aside.over;
    let i = 0;
    line.replaceChildren(...words(aside.lines.join(" "), () => i++));
    requestAnimationFrame(() => requestAnimationFrame(() => caption.classList.add("is-in")));
  };
  const unsay = () => caption.classList.add("is-out");

  async function film() {
    if (gate) await waitForGate(root, score);
    else await score.wake();
    score.start();
    setTimeout(() => { skipBtn.hidden = false; requestAnimationFrame(() => skipBtn.classList.add("is-in")); }, 1800);
    await sleep(900);
    for (let i = 0; i < Math.min(count, FILM_SCENES.length, asides.length); i++) {
      const scene = FILM_SCENES[i];
      score.chord(scene.chord); score.note(scene.note, 0.34);
      const drawn = scene.draw(svg);
      // each drawing framed close on itself
      if (drawn.view) svg.setAttribute("viewBox", drawn.view);
      if (drawn.stop) stops.add(drawn.stop);
      score.pencil(drawn.pencil ?? 3.5);
      await sleep(900);
      say(asides[i]);
      await sleep(SCENE_MS - 900);
      for (const node of [drawn.node, drawn.extra]) if (node) erase(node);
      unsay();
      await sleep(BETWEEN_MS);
      drawn.stop?.(); stops.delete(drawn.stop);
    }
  }

  const done = film().catch((e) => { if (e !== SKIP) console.error("sketch film:", e); }).then(() => {
    for (const stop of stops) stop();
    score.fade(skipped ? 0.6 : 2);
    root.classList.add("is-lifting");
    return new Promise((resolve) => setTimeout(() => { score.stop(); root.remove(); resolve(); }, skipped ? 500 : 1400));
  });
  return { done, skip, root };
}

const SKIP = Symbol("skip");

function waitForGate(root, score) {
  const g = root.querySelector(".co-gate");
  requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add("is-in")));
  return new Promise((go) => g.addEventListener("click", () => {
    const woken = score.wake();
    g.classList.add("is-out");
    setTimeout(() => g.remove(), 900);
    woken.then(go);
  }, { once: true }));
}

// words, each its own span, to come up one after another
function words(text, next) {
  return revealTextSegments(text).map((part) => {
    if (/^\s+$/.test(part)) return document.createTextNode(part);
    const w = document.createElement("span");
    w.className = "co-w";
    w.style.setProperty("--i", next());
    w.textContent = part;
    return w;
  });
}

// a square of grain: light specks, for the film
function noiseImage(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = Math.random(), v = 120 + Math.random() * 135;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = r < 0.5 ? r * 120 : 0;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}
