// ═══════════════════════════════════════════════════════════════════════════
// puzzle.js — BILLIARDS puzzle data & logic
//
// A pool table seen from above in an abandoned pub. The balls stand racked
// for the break, but five places in the triangle are empty: the missing balls
// lie in the pockets, the pockets marked I to V. Seen in the dark of a pocket
// a ball shows only its colour, solid or striped — enough, with the rack, to
// tell its number. In the pockets' order they are 2, 12, 9, 14, 4; as letters
// of the alphabet (A1Z26), B L I N D.
// ═══════════════════════════════════════════════════════════════════════════

export const BILLIARDS_WORD = "BLIND";

// a standard set: 1–7 solid, 8 black, 9–15 striped in the colours of 1–7
const COLOURS = [
  "#f2c12e", // 1 / 9  — yellow
  "#1f4fb4", // 2 / 10 — blue
  "#d42a2a", // 3 / 11 — red
  "#5b2c8a", // 4 / 12 — purple
  "#f07a1a", // 5 / 13 — orange
  "#1e7a3c", // 6 / 14 — green
  "#7a1f24", // 7 / 15 — maroon
  "#141414", // 8      — black
];

/** The hex colour of a numbered ball. 8 is black; 9–15 reuse 1–7's colours. */
export function ballColour(n) {
  if (!Number.isInteger(n) || n < 1 || n > 15)
    throw new RangeError(`No ball ${n}`);
  return COLOURS[n === 8 ? 7 : n > 8 ? n - 9 : n - 1];
}

/** True for the striped balls, 9–15. */
export function isStripe(n) {
  return n > 8;
}

/**
 * The rack, in columns from its apex (pointing up the table) to its foot.
 * `null` marks a missing ball.
 */
export const RACK = Object.freeze([
  Object.freeze([1]),
  Object.freeze([11, null]),
  Object.freeze([3, 8, null]),
  Object.freeze([null, 6, 13, 10]),
  Object.freeze([15, null, 7, null, 5]),
]);

/** The ball sunk in each marked pocket, in the order I to V. */
export const POCKETS = Object.freeze([2, 12, 9, 14, 4]);

/** The Roman numerals stamped on the brass plates by the marked pockets. */
export const POCKET_MARKS = Object.freeze(["I", "II", "III", "IV", "V"]);

/** The balls of the fifteen that are not in the rack. */
export function missing(rack = RACK) {
  const there = new Set(rack.flat().filter((n) => n !== null));
  const gone = [];
  for (let n = 1; n <= 15; n++) if (!there.has(n)) gone.push(n);
  return gone;
}

/** A number as a letter of the alphabet: 1 is A, 26 is Z. */
function letter(n) {
  if (!Number.isInteger(n) || n < 1 || n > 26)
    throw new RangeError(`No letter ${n}`);
  return String.fromCharCode(64 + n);
}

/** The word the pockets spell, I to V. */
export function readPockets(pockets = POCKETS) {
  return pockets.map(letter).join("");
}
