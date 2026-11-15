import test from "node:test";
import assert from "node:assert/strict";
import { BOOKS, BOOKSHELF_WORD, readShelf, readBook } from "../../src/levels/bookshelf/puzzle.js";
import { BOTTLES, CHEMISTRY_WORD, ELEMENTS, readBottles, cellOf } from "../../src/levels/chemistry/puzzle.js";
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

