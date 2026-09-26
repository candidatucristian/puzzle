// The puzzle is plain arithmetic: four clocks on a wall, a pocket calculator on
// the desk. Read each clock as a number (the colon does not count), add them up,
// and turn the display upside down: 7105 reads SOIL.

/** The times on the wall. Order does not matter; they are all added. */
export const OVERTIME_CLOCKS = Object.freeze(["22:03", "14:11", "11:47", "23:44"]);

/** The calculator's display holds this many digits. */
export const CALCULATOR_DIGITS = 8;

/** The keys, in the order the keypad is laid out (see OvertimeScene). */
export const CALCULATOR_KEYS = Object.freeze([
  "7", "8", "9", "C",
  "4", "5", "6", "+",
  "1", "2", "3",
  "0", "00", "=",
]);

/** A clock face read as a number: "22:03" → 2203. */
export function clockNumber(time) {
  return Number(String(time).replace(":", ""));
}

/** What the four clocks add up to. */
export function overtimeTotal(clocks = OVERTIME_CLOCKS) {
  return clocks.reduce((sum, time) => sum + clockNumber(time), 0);
}

/**
 * What each digit of a seven-segment display looks like once the display is
 * turned through 180°. The display's last digit becomes the first letter.
 */
const UPSIDE_DOWN = Object.freeze({
  0: "O", 1: "I", 2: "Z", 3: "E", 4: "H", 5: "S", 6: "G", 7: "L", 8: "B", 9: "G",
});

/** The word a number spells when the calculator is turned upside down. */
export function readUpsideDown(number) {
  return [...String(number)].reverse().map((digit) => UPSIDE_DOWN[digit] ?? "?").join("");
}

export function overtimeWord() {
  return readUpsideDown(overtimeTotal());
}

// ── the seven-segment glyphs ─────────────────────────────────────────────────
// Segments a (top), b (top right), c (bottom right), d (bottom), e (bottom
// left), f (top left) and g (middle). The scene draws exactly these shapes, so
// the upside-down reading is a property of the drawing, not a coincidence.

export const SEGMENTS = Object.freeze({
  0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg",
  5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg",
  E: "adefg",
});

// Turning a display through 180° swaps top and bottom, left and right.
const TURNED = Object.freeze({ a: "d", b: "e", c: "f", d: "a", e: "b", f: "c", g: "g" });

/** The segments lit on a glyph once it is turned upside down. */
export function turnSegments(segments) {
  return [...segments].map((segment) => TURNED[segment]).sort().join("");
}

// ── the calculator ───────────────────────────────────────────────────────────
// An adding calculator: digits, +, = and C. It is a plain immutable state
// machine, so the scene only draws what this says.

export function createCalculator() {
  return { display: "0", accumulator: null, operator: null, fresh: true, error: false };
}

function settle(state, total) {
  // more digits than the display has: it shows E and waits for C
  if (!Number.isFinite(total) || total > 10 ** CALCULATOR_DIGITS - 1) {
    return { ...state, display: "E", error: true };
  }
  return { ...state, display: String(total) };
}

function typeDigits(state, digits) {
  let display = state.fresh ? "0" : state.display;
  for (const digit of digits) {
    if (display === "0") display = digit;
    else if (display.length < CALCULATOR_DIGITS) display += digit;
  }
  return { ...state, display, fresh: false };
}

function add(state) {
  // "+" pressed again straight away: nothing new to add
  if (state.operator && state.fresh) return state;
  const shown = Number(state.display);
  const total = state.operator ? state.accumulator + shown : shown;
  return settle({ ...state, accumulator: total, operator: "+", fresh: true }, total);
}

function equals(state) {
  if (!state.operator) return state;
  if (state.fresh) return { ...state, accumulator: null, operator: null };
  const total = state.accumulator + Number(state.display);
  return settle({ ...state, accumulator: null, operator: null, fresh: true }, total);
}

/** The state after pressing one key. Unknown keys change nothing. */
export function pressKey(state, key) {
  if (key === "C") return createCalculator();
  if (state.error) return state;
  if (/^\d+$/.test(key)) return typeDigits(state, key);
  if (key === "+") return add(state);
  if (key === "=") return equals(state);
  return state;
}

/** Press a whole sequence, e.g. ["2","2","0","3","+","1","4"]. */
export function pressKeys(keys, state = createCalculator()) {
  return keys.reduce(pressKey, state);
}

/** The keys that type a number, e.g. 2203 → ["2","2","0","3"]. */
export function keysFor(number) {
  return [...String(number)];
}
