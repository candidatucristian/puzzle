import PUZZLE from "./puzzle.json";

// The counting frame (Room XI): five ebony rods make four spaces, and in each
// space two black blocks ride on wires — one high, one low — each at one of
// three places: 0 against the left rod, 1 in the middle, 2 against the right.
// The blocks are not the figures: they are the holes in them. Whatever white
// is left between the rods and round the blocks is the figure.
//
// MARKS are where the blocks stood for years — the clean places in the dust
// (art/blender/counting_frame.py renders them from this same file) — and
// START where they lie now, knocked out of place. Both are [high, low] for
// each space, left to right.

export const MARKS = PUZZLE.marks;
export const START = PUZZLE.start;
export const PLACES = 3;

// [high, low] → the figure the white makes. A high block on the left leaves
// the figure's upper right standing, in the middle a closed loop, on the
// right its upper left; the low block the same below. Three ways have no
// figure: a 6 turned round, an E, an e.
const FIGURES = {
  "2,0": "5",
  "1,0": "9",
  "0,0": "3",
  "2,1": "6",
  "1,1": "8",
  "0,2": "2",
};

/** What one space reads, or null when the white makes no figure. */
export function readSpace([high, low]) {
  return FIGURES[`${high},${low}`] ?? null;
}

/** What the whole frame reads, a "?" for each space that makes no figure. */
export function readFrame(places) {
  return places.map((space) => readSpace(space) ?? "?").join("");
}
