import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";
import {
  OVERTIME_CLOCKS,
  CALCULATOR_DIGITS,
  CALCULATOR_KEYS,
  SEGMENTS,
  clockNumber,
  overtimeTotal,
  overtimeWord,
  readUpsideDown,
  turnSegments,
  createCalculator,
  pressKey,
  pressKeys,
  keysFor,
} from "../../src/levels/overtime/puzzle.js";

test("the clocks are real 24-hour times, all different, and include 22:03 and 14:11", () => {
  assert.equal(OVERTIME_CLOCKS.length, 4);
  assert.equal(new Set(OVERTIME_CLOCKS).size, 4);
  for (const time of OVERTIME_CLOCKS) {
    assert.match(time, /^\d\d:\d\d$/);
    const [hours, minutes] = time.split(":").map(Number);
    assert.ok(hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59, `${time} is a valid time`);
  }
  assert.ok(OVERTIME_CLOCKS.includes("22:03") && OVERTIME_CLOCKS.includes("14:11"));
  assert.equal(clockNumber("22:03"), 2203);
  assert.equal(clockNumber("14:11"), 1411);
});

test("the clocks add up to 7105, which reads SOIL upside down, the configured answer", () => {
  assert.equal(overtimeTotal(), 2203 + 1411 + 1147 + 2344);
  assert.equal(overtimeTotal(), 7105);
  assert.equal(readUpsideDown(7105), "SOIL");
  assert.equal(overtimeWord(), "SOIL");
  const level = LEVEL_METADATA.find(({ id }) => id === "overtime");
  assert.equal(overtimeWord(), level.code);
  assert.equal(level.key, "Overtime");
  assert.equal(level.altCode, null);
});

test("no other reading of the clocks gives a word: minutes and reversed sums are not the answer", () => {
  // the answer must come from the intended arithmetic, not from another way of adding
  const minutes = OVERTIME_CLOCKS.map((t) => t.split(":").map(Number)).reduce((sum, [h, m]) => sum + h * 60 + m, 0);
  assert.notEqual(readUpsideDown(minutes), "SOIL");
  const hoursOnly = OVERTIME_CLOCKS.reduce((sum, t) => sum + Number(t.slice(0, 2)), 0);
  assert.notEqual(readUpsideDown(hoursOnly), "SOIL");
  assert.notEqual(String(overtimeTotal()), "SOIL");
});

test("every digit's segments, turned upside down, are the glyph of the letter it is read as", () => {
  const letters = { 0: "abcdef", 1: "ef", 2: "abdeg", 3: "adefg", 4: "cefg", 5: "acdfg", 7: "def", 8: "abcdefg", 9: "acdefg", 6: "abcdfg" };
  for (const [digit, expected] of Object.entries(letters)) {
    assert.equal(turnSegments(SEGMENTS[digit]), [...expected].sort().join(""), `digit ${digit}`);
  }
  // the four digits actually on the display read S, O, I, L
  assert.deepEqual([..."5017"].map((digit) => readUpsideDown(digit)), ["S", "O", "I", "L"]);
  assert.equal(turnSegments(SEGMENTS[7]), "def", "a 7 turned over is an L");
  assert.equal(turnSegments(SEGMENTS[0]), SEGMENTS[0], "0 is O either way up");
  assert.equal(turnSegments(SEGMENTS[5]), SEGMENTS[5], "5 is S either way up");
  assert.equal(readUpsideDown(38079), "GLOBE");
});

test("the calculator types digits, ignores leading zeros, and stops at eight digits", () => {
  const show = (keys) => pressKeys(keys).display;
  assert.equal(pressKeys([]).display, "0");
  assert.equal(show(["0", "0", "7"]), "7");
  assert.equal(show(["0", "0"]), "0");
  assert.equal(show(["1", "00"]), "100");
  assert.equal(show(["1", "2", "3", "4", "5", "6", "7", "8", "9"]), "12345678");
  assert.equal(CALCULATOR_DIGITS, 8);
});

test("adding the four clocks on the calculator ends on 7105, with a running total along the way", () => {
  let state = createCalculator();
  const shown = [];
  for (const number of [2203, 1411, 1147, 2344]) {
    for (const key of keysFor(number)) state = pressKey(state, key);
    shown.push(state.display);
    state = pressKey(state, "+");
    shown.push(state.display);
  }
  assert.deepEqual(shown, ["2203", "2203", "1411", "3614", "1147", "4761", "2344", "7105"]);
  // the last "+" already shows the total; "=" just confirms it
  assert.equal(state.display, "7105");
  assert.equal(pressKey(state, "=").display, "7105");
  // or finish with "=" instead of a last "+"
  const viaEquals = pressKeys([..."2203", "+", ..."1411", "+", ..."1147", "+", ..."2344", "="]);
  assert.equal(viaEquals.display, "7105");
  assert.equal(readUpsideDown(viaEquals.display), "SOIL");
});

test("= and + behave like a real adding calculator in the odd cases", () => {
  // "=" right after "+", and "=" with nothing pending, change nothing visible
  assert.equal(pressKeys(["5", "+", "="]).display, "5");
  assert.equal(pressKeys(["5", "="]).display, "5");
  // "+" twice in a row adds nothing extra
  assert.equal(pressKeys(["5", "+", "+", "3", "="]).display, "8");
  // a digit after "=" starts a fresh number, and + carries on from a result
  assert.equal(pressKeys(["5", "+", "3", "=", "9"]).display, "9");
  assert.equal(pressKeys(["5", "+", "3", "=", "+", "2", "="]).display, "10");
  // C clears everything, even mid-sum
  assert.deepEqual(pressKeys(["5", "+", "3", "C"]), createCalculator());
  assert.equal(pressKeys(["5", "+", "3", "C", "4", "="]).display, "4");
});

test("too big a total shows E and the calculator waits for C", () => {
  const big = pressKeys([..."99999999", "+", "1", "="]);
  assert.equal(big.display, "E");
  assert.equal(big.error, true);
  assert.equal(pressKey(big, "5").display, "E");
  assert.equal(pressKey(big, "+").display, "E");
  assert.equal(pressKey(big, "C").display, "0");
  // exactly eight digits is fine
  assert.equal(pressKeys([..."99999998", "+", "1", "="]).display, "99999999");
});

test("the keypad has every key the puzzle needs and nothing that does not exist", () => {
  for (const key of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "+", "=", "C"]) {
    assert.ok(CALCULATOR_KEYS.includes(key), `key ${key}`);
  }
  assert.equal(new Set(CALCULATOR_KEYS).size, CALCULATOR_KEYS.length);
  // unknown keys are ignored rather than corrupting the display
  assert.deepEqual(pressKey(createCalculator(), "x"), createCalculator());
});
