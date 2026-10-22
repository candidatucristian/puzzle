// Pointers sketched in pencil-white over a dark edge like the rest of the
// game's lettering, each line gone over twice the way a quick drawing is. A
// little hand for everything that can be clicked — every button, every thing
// in a puzzle; only the ways through the house say where they go: a doorway
// with an arrow going into it for a door, the arrow alone once it stands
// open, stairs, a ladder, an archway for a passage, a padlock for a locked
// door and a key for one its key will open.
// And the notebook's pencil and rubber. Each falls back to the ordinary pointer.

const svg = (body, x, y) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g fill='none' stroke-linecap='round' stroke-linejoin='round'>${body}</g></svg>`)}") ${x} ${y}`;
// the line inked dark, drawn over in white, and gone over once more, lightly
const sketch = (path) =>
  `<path d='${path}' stroke='#0b0b0c' stroke-width='2.9' stroke-opacity='.85'/>` +
  `<path d='${path}' stroke='#f1ece0' stroke-width='1.2'/>` +
  `<path d='${path}' transform='translate(.6 -.45)' stroke='#ffffff' stroke-width='.55' stroke-opacity='.5'/>`;
// A short, slim filled arrow in the same warm white ink as the Back arrow.
const filledArrow = (path, highlight) =>
  `<path d='${path}' fill='#0b0b0c' stroke='#0b0b0c' stroke-width='2' stroke-opacity='.8'/>` +
  `<path d='${path}' fill='#ece7db'/>` +
  `<path d='${highlight}' transform='translate(.6 -.45)' stroke='#fff' stroke-opacity='.45' stroke-width='.4'/>`;

const SHAPES = {
  // an empty doorway; the gold arrow is added below
  door: ["M15 29V4h13v25M11 29h20", 22, 17],
  // the door already open: only the arrow, going on in
  enter: ["", 26, 16],
  // the same two for a door on the left-hand wall: the way in points left
  doorLeft: ["M17 29V4H4v25M21 29H1", 10, 17],
  enterLeft: ["", 5, 16],
  stairs: ["M3.5 28h6.5v-6h6.5v-6h6.5v-6h6M5 14.5l8-8M7.6 6.5H13v5.4", 16, 16],
  ladder: ["M10 3v26M22 3v26M10 8h12M10 14h12M10 20h12M10 26h12", 16, 16],
  passage: ["M4 29.5V13a12 12 0 0 1 24 0v16.5M11.5 29.5V16.5a4.5 4.5 0 0 1 9 0v13M3 29.5h26M16 25v2", 16, 18],
  locked: ["M10 14V10a6 6 0 0 1 12 0v4M7 14h18v14H7zM16 19v4", 16, 18],
  hand: ["M12.5 20.3V5.2a2.1 2.1 0 0 1 4.2 0V14M16.7 13.2v-1.6a2.1 2.1 0 0 1 4.2 0v3M20.9 13.8a2.1 2.1 0 0 1 4.2 0v5.7c0 5.4-3.4 9.5-8.6 9.5h-1.6c-3 0-5-1.3-6.6-3.9l-3.6-5.6a2.1 2.1 0 0 1 3.5-2.4l2.3 3.1H12.5", 14, 3],
  pencil: ["M4.5 27.5l1.6-6.1L21 6.5l4.5 4.5-14.9 14.9zM18.5 9l4.5 4.5M6.1 21.4l4.5 4.5", 4, 27],
  rubber: ["M5 21.5L16.5 10l7.5 7.5L12.5 29h-4zM10.5 16l7.5 7.5M12.5 29H27", 7, 27],
  key: ["M3.5 16a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0zM14.5 16H29M24 16v4.5M28 16v3.5M7.4 16h3.2", 16, 16],
};
const FALLBACK = { locked: "not-allowed", pencil: "crosshair", rubber: "crosshair" };
const ARROWS = {
  door: ["M4.7 16.15H14.8V12.3L22.2 17l-7.4 4.7v-3.85H4.7z", "M5.3 16.45h9.5"],
  doorLeft: ["M27.3 16.15H17.2V12.3L9.8 17l7.4 4.7v-3.85H27.3z", "M26.7 16.45h-9.5"],
  enter: ["M5 15.15h13.8V11.8L27 16l-8.2 4.2v-4.35H5z", "M5.7 15.5h12.8"],
  enterLeft: ["M27 15.15H13.2V11.8L5 16l8.2 4.2v-4.35H27z", "M26.3 15.5H13.5"],
};

export const CURSORS = Object.fromEntries(Object.entries(SHAPES).map(([name, [path, x, y]]) => {
  const [arrow, highlight] = ARROWS[name] ?? [];
  const body = sketch(path) + (arrow ? filledArrow(arrow, highlight) : "");
  return [name, `${svg(body, x, y)}, ${FALLBACK[name] ?? "pointer"}`];
}));

/** The pointer for something that says, when hovered, `label`: the way
 *  through for a door, a stair, a passage — and the hand for all the rest.
 *  `side` is the wall a door is in, -1 the left: its arrow points that way. */
export function cursorFor(label = "", side = 1) {
  if (/^unlock/i.test(label)) return CURSORS.key;
  if (/\block/i.test(label)) return CURSORS.locked; // "Locked", never "the clocks"
  if (/(ladder|climb down)/i.test(label)) return CURSORS.ladder;
  if (/(stairs|climb|go up)/i.test(label)) return CURSORS.stairs;
  if (/passage/i.test(label)) return CURSORS.passage;
  if (/^go in/i.test(label)) return side < 0 ? CURSORS.enterLeft : CURSORS.enter;
  if (/(door|gate|enter)/i.test(label)) return side < 0 ? CURSORS.doorLeft : CURSORS.door;
  return CURSORS.hand;
}

/** The same pointers for the page around the picture, as CSS variables:
 *  --cursor-hand, --cursor-door, … */
export function applyCursors(root = document.documentElement) {
  for (const [name, value] of Object.entries(CURSORS)) root.style.setProperty(`--cursor-${name}`, value);
}
