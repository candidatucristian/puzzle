// A small card of tasks, as a film's titles would set them: dark and grained,
// the small heading "Tonight", and the tasks under
// it — each with a box drawn in the game's pencil, ticked in it when done
// (and a soft ding). Used on the Inspector's desk and in front of the manor.
//
//   const card = taskCard([["letter", "Read the letter"], ["file", "Open the case file", { later: true }]], { sounds });
//   host.append(card.node); card.tick("letter"); card.show("file");
//
// A task given `later` is not shown until `show()` brings it in.

const BOX = "M4.2 4.6 C9 4.1 15 4.4 19.6 4.2 C19.9 9 19.7 15 19.8 19.7 C15 19.9 9 19.6 4.4 19.8 C4.1 15 4.3 9 4.2 4.6";
const TICK = "M7.4 12.6 L10.8 16 L18.6 6.6";
const PASSES = ["ink-dark", "ink-white", "ink-over"];

export function taskCard(tasks, { sounds = null, className = "" } = {}) {
  const node = document.createElement("ol");
  node.className = `prologue-tasks ${className}`.trim();
  node.setAttribute("aria-label", "Tonight");
  const items = new Map();
  for (const [key, text, { later = false } = {}] of tasks) {
    const li = document.createElement("li");
    li.dataset.task = key;
    li.innerHTML = `<svg class="task-box" viewBox="0 0 24 24" aria-hidden="true">
        ${PASSES.map((c) => `<path class="${c}" d="${BOX}" />`).join("")}
        ${PASSES.map((c) => `<path class="tick ${c}" pathLength="1" d="${TICK}" />`).join("")}
      </svg><span class="task-text"></span>`;
    li.querySelector(".task-text").textContent = text;
    if (later) li.hidden = true;
    node.append(li);
    items.set(key, li);
  }
  return {
    node,
    /** done: the tick drawn into its box, and the ding */
    tick(key) {
      const li = items.get(key);
      if (!li || li.classList.contains("is-done")) return;
      li.classList.add("is-done");
      li.setAttribute("aria-label", `${li.textContent} — done`);
      sounds?.ping?.();
    },
    /** a task kept back, brought in */
    show(key) {
      const li = items.get(key);
      if (!li || !li.hidden) return;
      li.hidden = false;
      requestAnimationFrame(() => li.classList.add("is-new"));
    },
    /** back as it was: nothing ticked */
    reset() {
      for (const li of items.values()) { li.classList.remove("is-done"); li.removeAttribute("aria-label"); }
    },
  };
}
