import { applyCursors } from "../shared/cursors.js";

// Small notes that say what a control does: a slip of old paper with the
// words in pencil, and the key for it where there is one, held
// under (or over) whatever the pointer rests on or the keyboard comes to.
// Any control with a `title` or a `data-tip` has one — the title is taken
// over, so the browser's own grey box never shows as well; a button that is
// only an icon tells its name. "Map of the house (M)" shows its M as a key.
// The page's sketched pointers are set here too.

const DELAY = 380; // the pointer rests a moment before the note comes
const SELECTOR = "[data-tip], [title], .icon-button[aria-label], .header-button[aria-label]";

export function mountTooltips(scope) {
  applyCursors();
  const tip = document.createElement("div");
  tip.id = "tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  const words = document.createElement("span");
  const key = document.createElement("kbd");
  tip.append(words, key);
  document.body.append(tip);
  scope.add(() => tip.remove());
  let target = null, timer = null;

  // what a control says of itself
  function textOf(el) {
    if (el.hasAttribute("title")) {
      el.dataset.tip = el.getAttribute("title");
      el.removeAttribute("title");
    }
    return el.dataset.tip || el.getAttribute("aria-label") || "";
  }
  function show(el) {
    const said = textOf(el).trim();
    if (!said || !el.isConnected || el.closest("[hidden], .hidden")) return;
    const m = said.match(/^(.*?)\s*\(([^()]{1,5})\)$/);
    words.textContent = m ? m[1] : said;
    key.textContent = m ? m[2] : el.dataset.tipKey ?? "";
    key.hidden = !key.textContent;
    tip.hidden = false;
    tip.classList.remove("shown");
    // under the control, or over it where there is no room below; never off the page
    const box = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const below = box.bottom + t.height + 14 < window.innerHeight;
    const x = Math.min(window.innerWidth - t.width - 8, Math.max(8, box.left + box.width / 2 - t.width / 2));
    tip.style.left = `${x}px`;
    tip.style.top = `${below ? box.bottom + 9 : box.top - t.height - 9}px`;
    tip.dataset.side = below ? "below" : "above";
    tip.style.setProperty("--arrow", `${Math.min(t.width - 12, Math.max(12, box.left + box.width / 2 - x))}px`);
    void tip.offsetWidth;
    tip.classList.add("shown");
  }
  function hide() {
    clearTimeout(timer);
    target = null;
    tip.classList.remove("shown");
    tip.hidden = true;
  }
  function aim(el, now = false) {
    if (el === target) return;
    hide();
    if (!el) return;
    target = el;
    // the title goes at once, so the browser does not show its own
    textOf(el);
    timer = setTimeout(() => show(el), now ? 0 : DELAY);
  }
  const find = (node) => node?.closest?.(SELECTOR) ?? null;
  scope.on(document, "pointerover", (e) => { if (e.pointerType !== "touch") aim(find(e.target)); });
  scope.on(document, "pointerdown", hide);
  scope.on(document, "focusin", (e) => { if (e.target.matches?.(":focus-visible")) aim(find(e.target), true); });
  scope.on(document, "focusout", hide);
  scope.on(document, "keydown", (e) => { if (e.key === "Escape") hide(); });
  scope.on(window, "scroll", hide, true);
  scope.on(window, "blur", hide);
}
