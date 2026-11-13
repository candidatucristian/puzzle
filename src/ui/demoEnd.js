import { DEMO, DEMO_PLACES, PLACES, STEAM_STORE_URL } from "../shared/house.js";
import { passage } from "./passage.js";
import "./styles/demo-end.css";

// The end of the Steam demo (2026-11-06): once every puzzle in the demo's
// rooms is solved, the game darkens a little and says so, as the film's and
// the manor's passages are said (passage.js): the end of the demo, two lines
// of where the house leaves him, and the ways on — the full game's store page
// (only when there is one to go to: STEAM_STORE_URL) and back into the house.
// Shown once of itself, and again whenever the last room's sealed chest is
// tried; the demo's rooms stay open to walk about in after it.
const SEEN = "demo:ended";

// The Steam logo, for the button to the store page (Valve allows it on links
// to a game's Steam page). Its outline is Simple Icons' (CC0), drawn in the
// button's own colour.
const STEAM_LOGO = "M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z";
function steamLogo() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "demo-end-steam");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", STEAM_LOGO);
  svg.append(path);
  return svg;
}

export function mountDemoEnd(scope, { levels, storage, i18n = null, isBusy = () => false, isOpen = () => false, reducedMotion = () => false }) {
  if (!DEMO) return { reset() {} };
  const ids = PLACES.filter((place) => DEMO_PLACES.includes(place.key)).flatMap((place) => place.holds);
  const allSolved = () => ids.every((id) => { const i = levels.indexOf(id); return i < 0 || levels.isCompleted(i); });
  let shown = storage.getItem(SEEN) === "true", waiting = false, was = allSolved(), showing = false;
  const t = (key, fallback) => (i18n ? i18n.t(key) : "") || fallback;

  // once the last answer has been taken and the room has had its moment
  const whenFree = () => {
    if (shown) return;
    if (isOpen() || isBusy()) { scope.later(whenFree, 800); return; }
    show();
  };
  scope.add(levels.subscribe(() => {
    const now = allSolved();
    if (now && !was && !shown && !waiting) { waiting = true; scope.later(whenFree, reducedMotion() ? 600 : 3800); }
    was = now;
  }));
  // (and again whenever the chest that will not open is tried, once it is all solved)
  scope.on(window, "demo:end", () => { if (allSolved() && !showing) show(); });

  function show() {
    if (showing) return;
    shown = true; showing = true;
    storage.setItem(SEEN, "true");
    const make = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });
    const root = make("div", "demo-end");
    root.dataset.i18nAria = 'demoEnd.over';
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", t("demoEnd.over", "End of the demo"));
    const veil = make("div", "demo-end-veil"), shade = make("div", "intro-video-shade"), asides = make("div", "intro-video-asides");
    shade.setAttribute("aria-hidden", "true");
    const node = passage({
      over: t("demoEnd.over", "End of the demo"),
      lines: [
        t("demoEnd.line1", "Three rooms, three keys — and the third chest will not open."),
        t("demoEnd.line2", "The rest of the house, and all that Ivy left in it, waits in the full game."),
      ],
    });
    node.querySelector('.intro-title-over').dataset.i18n = 'demoEnd.over';
    node.querySelectorAll('.intro-title-line').forEach((line, index) => { line.dataset.i18n = `demoEnd.line${index + 1}`; });
    const way = make("div", "demo-end-way");
    const button = (label) => { const b = make("button", "intro-page-play", label); b.type = "button"; return b; };
    // the store page, first and filled; until there is one, shown only on the
    // dev server (to be seen), and taking you to the store's front page
    const store = STEAM_STORE_URL || (import.meta.env.DEV ? "https://store.steampowered.com/" : "");
    if (store) {
      const wish = button("");
      wish.classList.add("is-primary", "has-icon");
      const caption = make('span', '', t('demoEnd.wishlist', 'Add to your wishlist on Steam'));
      caption.dataset.i18n = 'demoEnd.wishlist';
      wish.append(steamLogo(), caption);
      wish.addEventListener("click", () => window.open(store, "_blank", "noopener"));
      way.append(wish);
    }
    const stay = button(t("demoEnd.stay", "Stay in the house"));
    stay.dataset.i18n = 'demoEnd.stay';
    way.append(stay);
    node.append(way);
    asides.append(node);
    root.append(veil, shade, asides);
    document.body.append(root);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-in")));
    scope.later(() => (way.firstElementChild ?? stay).focus({ preventScroll: true }), reducedMotion() ? 0 : 900);

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true; showing = false;
      window.removeEventListener("keydown", onKey, true);
      node.classList.add("is-out");
      root.classList.remove("is-in");
      scope.later(() => root.remove(), reducedMotion() ? 0 : 1200);
    };
    const onKey = (event) => {
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    stay.addEventListener("click", close);
    window.addEventListener("keydown", onKey, true);
    scope.add(() => { window.removeEventListener("keydown", onKey, true); root.remove(); });
  }

  return {
    /** the game begun again: the end is to come again */
    reset() { storage.removeItem(SEEN); shown = false; waiting = false; was = allSolved(); },
  };
}
