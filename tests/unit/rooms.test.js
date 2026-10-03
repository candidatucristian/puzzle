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
