import PUZZLE from "./puzzle.json";

// Rewind (Room XI): four of Orion's ways of keeping time stand on his
// windowsill — a brass clock, a tear-off calendar, a sand-glass marked in
// minutes, a candle marked in hours — and each, touched, runs backwards and
// stops: the clock at 7 o'clock, the calendar on the 18th, the sand risen to
// 14, the candle grown back to 22. In a room where everything runs the wrong
// way the alphabet does too: A is 26 and Z is 1, so 7 18 14 22 is T I M E.
//
// FROM is where each lies now, TO where it stops (art/blender/rewind_*.py
// renders them from this same file).

export const REWIND = PUZZLE;
export const NUMBERS = [PUZZLE.clock.to[0], PUZZLE.calendar.to, PUZZLE.glass.to, PUZZLE.candle.to];

/** A number as a letter of the alphabet run backwards: 26 → A, 1 → Z. */
export function backwardsLetter(n) {
  return String.fromCharCode("Z".charCodeAt(0) + 1 - n);
}

/** What the four numbers spell, read left to right. */
export function rewindWord(numbers = NUMBERS) {
  return numbers.map(backwardsLetter).join("");
}
