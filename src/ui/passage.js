// A passage of the opening's story, as it is set over a picture: the small
// line over it, the person it is of (set large), and its words — the first
// line the lead. Used over the opening film (introVideo.js) and before the
// manor (manorStory.js), so the two read as one telling.
export function passage({ over, name, lines }) {
  const make = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });
  const node = make("div", name ? "intro-aside is-person" : "intro-aside");
  if (over) node.append(make("p", "intro-title-over", over));
  if (name) node.append(make("p", "intro-aside-name", name));
  lines.forEach((line, i) => node.append(make("p", i ? "intro-title-line" : "intro-title-line is-lead", line)));
  return node;
}
