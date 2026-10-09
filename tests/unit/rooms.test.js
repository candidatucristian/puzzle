import test from "node:test";
import assert from "node:assert/strict";
import { BOOKS, BOOKSHELF_WORD, readShelf, readBook } from "../../src/levels/bookshelf/puzzle.js";
import { BOTTLES, CHEMISTRY_WORD, ELEMENTS, readBottles, cellOf } from "../../src/levels/chemistry/puzzle.js";
import {
  RACK,
  POCKETS,
  BILLIARDS_WORD,
  missing,
  readPockets,
  ballColour,
  isStripe,
} from "../../src/levels/billiards/puzzle.js";
import { METRO_STATIONS, METRO_WORD, NATO, natoLetter, stationWord, readLine } from "../../src/levels/metro/puzzle.js";
import {
  RESISTORS,
  RESISTORS_CODE,
  BAND_DIGITS,
  BAND_PAINT,
  bandDigit,
  resistorOhms,
  ohmsLabel,
  readFirstBands,
} from "../../src/levels/resistors/puzzle.js";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";

const code = (key) => LEVEL_METADATA.find((l) => l.key === key).code;

test("the bookmarks index the titles: SIGHT", () => {
  assert.deepEqual(BOOKS.map((b) => b.title), ["SHADOW", "MIRROR", "MAGIC", "HOUND", "WATER"]);
  assert.deepEqual(BOOKS.map((b) => b.mark), [1, 2, 3, 1, 3]);
  assert.equal(readShelf(), BOOKSHELF_WORD);
  assert.equal(code("Bookshelf"), BOOKSHELF_WORD);
  assert.throws(() => readBook({ title: "MAGIC", mark: 6 }), RangeError);
});

test("the bottles' numbers are atomic numbers: FOCUS", () => {
  assert.equal(ELEMENTS.length, 118);
  assert.deepEqual([...BOTTLES], [9, 8, 6, 92, 16]);
  assert.equal(readBottles(), CHEMISTRY_WORD);
  assert.equal(code("Chemistry"), CHEMISTRY_WORD);
  // every element has a cell of its own on the poster
  const cells = new Set(ELEMENTS.map((_, i) => JSON.stringify(cellOf(i + 1))));
  assert.equal(cells.size, 118);
  assert.deepEqual(cellOf(26), { row: 4, col: 8 }); // iron
  assert.deepEqual(cellOf(92), { row: 10, col: 6 }); // uranium, among the actinides
});

test("the missing balls lie in the pockets, I to V: BLIND", () => {
  assert.deepEqual(missing(), [2, 4, 9, 12, 14]);
  assert.deepEqual([...POCKETS].sort((a, b) => a - b), missing());
  assert.equal(RACK.flat().length, 15);
  assert.equal(readPockets(), BILLIARDS_WORD);
  assert.equal(code("Billiards"), BILLIARDS_WORD);
  // in a pocket only colour and stripe show: those tell each missing ball apart
  const looks = POCKETS.map((n) => `${ballColour(n)}${isStripe(n) ? " stripe" : ""}`);
  assert.equal(new Set(looks).size, POCKETS.length);
  assert.equal(ballColour(9), ballColour(1));
  assert.equal(ballColour(8), "#141414");
});

test("the line's stations are the phonetic alphabet: PYLON", () => {
  assert.deepEqual([...METRO_STATIONS], ["Papa Wharf", "Yankee Dock", "Lima Road", "Oscar Square", "November Street"]);
  assert.equal(NATO.length, 26);
  assert.equal(readLine(), METRO_WORD);
  assert.equal(code("Metro"), METRO_WORD);
  assert.deepEqual(METRO_STATIONS.map(stationWord), ["Papa", "Yankee", "Lima", "Oscar", "November"]);
  // both spellings of the first letter, and the official ones, read the same
  assert.equal(natoLetter("Alpha"), "A");
  assert.equal(natoLetter("alfa"), "A");
  assert.equal(natoLetter("X-ray"), "X");
  assert.equal(natoLetter("Zulu"), "Z");
  assert.throws(() => natoLetter("Square"), RangeError);
  // no station on the lit line can be read two ways
  assert.equal(new Set(METRO_STATIONS.map((s) => natoLetter(stationWord(s)))).size, 5);
});

test("the first bands of the four resistors read 1024", () => {
  assert.equal(Object.keys(BAND_DIGITS).length, 10);
  assert.deepEqual(Object.values(BAND_DIGITS), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(RESISTORS.map((bands) => bands[0]), ["brown", "black", "red", "yellow"]);
  assert.equal(readFirstBands(), RESISTORS_CODE);
  assert.equal(code("Resistors"), RESISTORS_CODE);
  assert.equal(bandDigit("Orange"), 3);
  assert.throws(() => bandDigit("gold"), RangeError);
  // every band has a paint, and the resistors are real values
  for (const bands of RESISTORS) for (const colour of bands) assert.ok(BAND_PAINT[colour], colour);
  assert.deepEqual(RESISTORS.map((bands) => ohmsLabel(resistorOhms(bands))), ["1 kΩ", "1 Ω", "22 kΩ", "4.7 kΩ"]);
});
