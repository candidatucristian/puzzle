import test from "node:test";
import assert from "node:assert/strict";
import { SafeStorage } from "../../src/core/SafeStorage.js";
import { ProgressStore, PROGRESS_KEY, PROGRESS_VERSION } from "../../src/core/ProgressStore.js";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";

function memory(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("unavailable storage keeps session writes and removals without exposing stale values", () => {
  const storage = new SafeStorage({
    getItem: () => "old value",
    setItem: () => { throw new Error("Quota exceeded"); },
    removeItem: () => { throw new Error("Access denied"); },
  });
  storage.setItem("volume", 0.2);
  assert.equal(storage.getItem("volume"), "0.2");
  storage.removeItem("volume");
  assert.equal(storage.getItem("volume"), null);

  const unavailable = new SafeStorage({ getItem: () => { throw new Error("Access denied"); } });
  assert.equal(unavailable.getItem("progress"), null);
  unavailable.setItem("progress", "saved this session");
  assert.equal(unavailable.getItem("progress"), "saved this session");
});

test("malformed or absent legacy progress starts at the first level", () => {
  for (const saved of [undefined, "", "garbage", "Infinity", "NaN", "-1", "3.5"]) {
    const backend = memory({ puzzleProgressSchema: "2" });
    if (saved !== undefined) backend.setItem("puzzleUnlockedLevel", saved);
    const progress = new ProgressStore(backend, LEVEL_METADATA);
    assert.equal(progress.currentIndex, 0, String(saved));
    assert.equal(progress.unlockedIndex, 0);
    assert.equal(progress.completed, false);
    assert.equal(progress.canAccess(1), false);
    assert.equal(JSON.parse(backend.getItem(PROGRESS_KEY)).version, PROGRESS_VERSION);
  }
});

test("schema 2 saves preserve highest unlocked without completing that level", () => {
  const progress = new ProgressStore(memory({
    puzzleProgressSchema: "2", puzzleUnlockedLevel: "16",
  }), LEVEL_METADATA);
  assert.equal(progress.currentIndex, 16);
  assert.equal(progress.state.lastPlayedLevelId, "rally");
  assert.equal(progress.unlockedIndex, 16);
  assert.equal(progress.state.completedLevelIds.length, 16);
  assert.equal(progress.completed, false);
  // finishing Rally unlocks the level after it, Overtime, and so on to the
  // last one; only then is the game complete
  const last = LEVEL_METADATA.length - 1;
  for (let i = 16; i < last; i++) {
    assert.equal(progress.complete(i), true);
    assert.equal(progress.completed, false);
    assert.equal(progress.unlockedIndex, i + 1);
  }
  assert.equal(progress.complete(last), true);
  assert.equal(progress.completed, true);
});

test("the original 21-level saves retain the historical migration mapping", () => {
  for (const [saved, expected] of [[0, 0], [11, 11], [12, 12], [13, 12], [14, 13], [15, 14], [16, 14], [17, 15], [20, 15]]) {
    const progress = new ProgressStore(memory({
      puzzleProgressSchema: "1", puzzleUnlockedLevel: String(saved),
    }), LEVEL_METADATA);
    assert.equal(progress.currentIndex, expected, `Legacy index ${saved}`);
    assert.equal(progress.state.completedLevelIds.length, expected);
  }
});

test("oversized numeric saves clamp to an existing level", () => {
  const progress = new ProgressStore(memory({
    puzzleProgressSchema: "2", puzzleUnlockedLevel: "999",
  }), LEVEL_METADATA);
  assert.equal(progress.currentIndex, LEVEL_METADATA.length - 1);
  assert.equal(progress.completed, false);
});

test("damaged modern saves do not resurrect obsolete numeric progress", () => {
  for (const raw of ["{", "null", "[]", '{"version":3,"completedLevelIds":"all"}', '{"version":4,"completedLevelIds":[]}']) {
    const progress = new ProgressStore(memory({
      [PROGRESS_KEY]: raw, puzzleProgressSchema: "2", puzzleUnlockedLevel: "16",
    }), LEVEL_METADATA);
    assert.equal(progress.currentIndex, 0);
    assert.deepEqual(progress.state.completedLevelIds, []);
  }
});

test("completed and unlocked identities survive insertion, reorder and replay", () => {
  const oldOrder = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const backend = memory();
  const original = new ProgressStore(backend, oldOrder);
  original.complete(0);
  original.visit(1);
  original.complete(1);
  original.visit(2);

  const reordered = [{ id: "new" }, { id: "c" }, { id: "a" }, { id: "d" }, { id: "b" }];
  const migrated = new ProgressStore(backend, reordered);
  assert.equal(migrated.currentIndex, 1);
  assert.deepEqual(migrated.state.completedLevelIds, ["a", "b"]);
  assert.equal(migrated.canAccess(0), true);
  assert.equal(migrated.canAccess(1), true);
  assert.equal(migrated.canAccess(4), true);
  migrated.visit(2);
  assert.equal(migrated.canAccess(1), true, "replay must not relock the previously unlocked level");
  assert.equal(migrated.completed, false);
  const reloaded = new ProgressStore(backend, reordered);
  assert.equal(reloaded.currentIndex, 2);
  assert.equal(reloaded.canAccess(1), true);
});

test("removed level IDs and duplicated values are sanitized; new IDs are not marked complete", () => {
  const backend = memory({ [PROGRESS_KEY]: JSON.stringify({
    version: PROGRESS_VERSION,
    completedLevelIds: ["a", "a", "removed", null, 2],
    unlockedLevelIds: ["removed", "a", "a"],
    lastPlayedLevelId: "removed",
  }) });
  const progress = new ProgressStore(backend, [{ id: "a" }, { id: "replacement" }, { id: "c" }]);
  assert.deepEqual(progress.state.completedLevelIds, ["a"]);
  assert.deepEqual(progress.state.unlockedLevelIds, ["a", "replacement"]);
  assert.equal(progress.currentIndex, 1);
  assert.equal(progress.canAccess(2), false);
  assert.equal(progress.completed, false);
});

test("state snapshots cannot mutate saved progress; reset clears progress and preserves preferences", () => {
  const backend = memory({ puzzleProgressSchema: "2", puzzleUnlockedLevel: "5", musicVol: "0.3" });
  const progress = new ProgressStore(backend, LEVEL_METADATA);
  progress.state.completedLevelIds.push("rally");
  progress.state.unlockedLevelIds.push("rally");
  assert.equal(progress.canAccess(16), false);
  assert.equal(progress.state.completedLevelIds.includes("rally"), false);
  progress.reset();
  assert.equal(progress.currentIndex, 0);
  assert.equal(progress.unlockedIndex, 0);
  assert.deepEqual(progress.state.completedLevelIds, []);
  assert.equal(backend.getItem("puzzleUnlockedLevel"), null);
  assert.equal(backend.getItem("puzzleProgressSchema"), null);
  assert.equal(backend.getItem("musicVol"), "0.3");
  assert.equal(new ProgressStore(backend, LEVEL_METADATA).currentIndex, 0);
});

test("locked and invalid levels cannot be visited or completed", () => {
  const progress = new ProgressStore(memory(), LEVEL_METADATA);
  for (const index of [-1, 1, 16, 17, 0.5, "0", NaN]) {
    assert.equal(progress.canAccess(index), false);
    assert.equal(progress.visit(index), false);
    assert.equal(progress.complete(index), false);
  }
  assert.deepEqual(progress.state.completedLevelIds, []);
});
