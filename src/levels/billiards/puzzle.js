/** BILLIARDS: a pool table seen from above in an abandoned pub. The balls
 *  stand racked for the break, but five places in the triangle are empty: the
 *  missing balls lie in the pockets, the pockets marked I to V. Seen in the
 *  dark of a pocket a ball shows only its colour, solid or striped — enough,
 *  with the rack, to tell its number. In the pockets' order they are 2, 12, 9,
 *  14, 4; as letters of the alphabet (A1Z26), B L I N D. */

export const BILLIARDS_WORD = "BLIND";

// a standard set: 1–7 solid, 8 black, 9–15 striped in the colours of 1–7
const COLOURS = ["#f2c12e", "#1f4fb4", "#d42a2a", "#5b2c8a", "#f07a1a", "#1e7a3c", "#7a1f24", "#141414"];
export const COLOUR_NAMES = ["yellow", "blue", "red", "purple", "orange", "green", "maroon", "black"];

export function ballColour(n) {
  if (!Number.isInteger(n) || n < 1 || n > 15) throw new RangeError(`No ball ${n}`);
  return COLOURS[n === 8 ? 7 : n > 8 ? n - 9 : n - 1];
}

export function isStripe(n) {
  return n > 8;
}

// the rack, in columns from its apex (pointing up the table) to its foot;
// null where a ball is missing
export const RACK = Object.freeze([
  Object.freeze([1]),
  Object.freeze([11, null]),
  Object.freeze([3, 8, null]),
  Object.freeze([null, 6, 13, 10]),
  Object.freeze([15, null, 7, null, 5]),
]);

// the ball in each marked pocket, I to V
export const POCKETS = Object.freeze([2, 12, 9, 14, 4]);
export const POCKET_MARKS = Object.freeze(["I", "II", "III", "IV", "V"]);

/** The balls of the fifteen not in the rack. */
export function missing(rack = RACK) {
  const there = new Set(rack.flat().filter((n) => n !== null));
  const gone = [];
  for (let n = 1; n <= 15; n++) if (!there.has(n)) gone.push(n);
  return gone;
}

/** A number as a letter of the alphabet: 1 is A, 26 is Z. */
export function letter(n) {
  if (!Number.isInteger(n) || n < 1 || n > 26) throw new RangeError(`No letter ${n}`);
  return String.fromCharCode(64 + n);
}

/** The word the pockets spell, I to V. */
export function readPockets(pockets = POCKETS) {
  return pockets.map(letter).join("");
}
