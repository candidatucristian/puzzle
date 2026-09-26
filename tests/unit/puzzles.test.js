import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";
import { TAP_GRID, TAP_WORD, tapPair, letterFromTapPair } from "../../src/levels/tapcode/puzzle.js";
import { BINARY_PATHS, BINARY_LEAVES, decodeBinaryPath, decodeBinaryMessage } from "../../src/levels/binarytree/puzzle.js";

test("the six carved TapCode clues decode to the answer accepted by the game", () => {
  const carvedPairs = [...TAP_WORD].map(tapPair);
  assert.deepEqual(carvedPairs, [[1, 5], [4, 3], [1, 3], [1, 1], [3, 5], [1, 5]]);
  const decoded = carvedPairs.map(([row, column]) => letterFromTapPair(row, column)).join("");
  assert.equal(decoded, LEVEL_METADATA.find(({ id }) => id === "tapcode").code);
});

test("all 25 TapCode squares round-trip uniquely and K has exactly C's counts", () => {
  const alphabet = TAP_GRID.join("");
  assert.equal(new Set(alphabet).size, 25);
  assert.equal(alphabet.includes("K"), false);
  const observedPairs = new Set();
  for (const letter of alphabet) {
    const [row, column] = tapPair(letter);
    assert.ok(row >= 1 && row <= 5);
    assert.ok(column >= 1 && column <= 5);
    observedPairs.add(`${row},${column}`);
    assert.equal(letterFromTapPair(row, column), letter);
  }
  assert.equal(observedPairs.size, 25);
  assert.deepEqual(tapPair("K"), tapPair("C"));
  assert.deepEqual(tapPair("K"), [1, 3]);
  assert.equal(letterFromTapPair(...tapPair("K")), "C");
});

test("TapCode rejects empty/multiple characters and non-grid coordinates", () => {
  for (const letter of ["", "AB", "A ", "3", "!", "a", null, undefined]) {
    assert.equal(tapPair(letter), null);
  }
  for (const pair of [[0, 1], [1, 0], [6, 1], [1, 6], [-1, 5], [1.5, 2], [1, "2"], [NaN, 1]]) {
    assert.equal(letterFromTapPair(...pair), null);
  }
});

test("all eight three-fork BinaryTree paths reach the displayed leaf in left-to-right order", () => {
  const paths = ["LLL", "LLR", "LRL", "LRR", "RLL", "RLR", "RRL", "RRR"];
  assert.deepEqual(paths.map(decodeBinaryPath), [...BINARY_LEAVES]);
  assert.equal(new Set(paths.map(decodeBinaryPath)).size, 8);
  assert.equal(decodeBinaryPath("RLR"), "C");
  assert.equal(decodeBinaryPath("LRL"), "A");
});

test("the seven displayed BinaryTree paths preserve repeated letters and match the accepted answer", () => {
  assert.equal(BINARY_PATHS.length, 7);
  assert.equal(decodeBinaryMessage(), "CABBAGE");
  assert.equal(decodeBinaryMessage(), LEVEL_METADATA.find(({ id }) => id === "binarytree").code);
  assert.equal(decodeBinaryMessage(["LLL", "LLL"]), "BB");
});

test("invalid BinaryTree paths cannot silently produce partial answers", () => {
  for (const path of ["", "L", "LL", "LLLL", "101", "lrl", " LRL", "LXR", null, undefined]) {
    assert.equal(decodeBinaryPath(path), null);
  }
  assert.equal(decodeBinaryMessage(["RLR", "bad", "LRL"]), null);
  assert.equal(decodeBinaryMessage([]), null);
  assert.equal(decodeBinaryMessage("RLR"), null);
  assert.ok(Object.isFrozen(BINARY_PATHS));
  assert.ok(Object.isFrozen(BINARY_LEAVES));
  assert.ok(Object.isFrozen(TAP_GRID));
});
