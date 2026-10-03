import test from "node:test";
import assert from "node:assert/strict";
import { COMPASS_BEARINGS, COMPASS_WORD, drawBearings, walk } from "../../src/levels/compass/puzzle.js";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";

test("each line of bearings on the map draws one letter of LOST", () => {
  assert.equal(COMPASS_WORD, "LOST");
  assert.equal(LEVEL_METADATA.find(({ key }) => key === "Compass").code, COMPASS_WORD);
  assert.deepEqual(COMPASS_BEARINGS.map(drawBearings), [
    ["#..", "#..", "#..", "#..", "###"],
    ["#####", "#...#", "#...#", "#...#", "#####"],
    ["#####", "#....", "#####", "....#", "#####"],
    ["#####", "..#..", "..#..", "..#..", "..#.."],
  ]);
  // north is up, east right, south down, west left
  assert.deepEqual(walk([0, 90, 180, 270]), [[0, 0], [0, -1], [1, -1], [1, 0], [0, 0]]);
  assert.throws(() => walk([45]), RangeError);
});
