import test from "node:test";
import assert from "node:assert/strict";
import { LevelManager } from "../../src/core/LevelManager.js";
import { ProgressStore } from "../../src/core/ProgressStore.js";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";

function setup() {
  const definitions = [
    { id: "one", key: "One", code: "FIRST", altCode: "1" },
    { id: "two", key: "Two", code: "SECOND", altCode: null },
    { id: "three", key: "Three", code: "THIRD", altCode: null },
  ];
  const progress = new ProgressStore(null, definitions);
  const manager = new LevelManager(definitions, progress);
  const calls = [];
  const active = new Set(["Boot"]);
  const scenes = Object.fromEntries(definitions.map(({ key }) => [key, { key }]));
  manager.attach({ scene: {
    isActive: (key) => active.has(key),
    getScene: (key) => scenes[key],
    stop: (key) => { active.delete(key); calls.push(["stop", key]); },
    start: (key, data) => { active.add(key); calls.push(["start", key, data]); },
  } });
  return { manager, progress, active, calls, scenes };
}

test("navigation rejects invalid/locked levels and replaces active scenes on replay", () => {
  const { manager, calls, active, scenes } = setup();
  assert.equal(manager.activeScene, null);
  for (const index of [-1, 1, 3, "0", 0.5]) assert.equal(manager.navigate(index), false);
  assert.deepEqual(calls, []);
  assert.equal(manager.navigate(0), true);
  assert.deepEqual([...active], ["One"]);
  assert.equal(manager.activeScene, scenes.One);
  assert.deepEqual(calls, [["stop", "Boot"], ["start", "One", { skipFade: true }]]);
  manager.navigate(0);
  assert.deepEqual(calls.slice(-2), [["stop", "One"], ["start", "One", { skipFade: true }]]);
});

test("answers are normalized, alternatives work, and submitting unlocks without starting transitions", () => {
  const { manager, calls, progress } = setup();
  manager.navigate(0);
  const callsBeforeSubmit = calls.length;
  for (const answer of ["wrong", "", "  ", undefined, 1]) {
    assert.deepEqual(manager.submit(answer), { correct: false, isLast: false, nextIndex: null });
  }
  assert.equal(progress.unlockedIndex, 0);
  assert.deepEqual(manager.submit("  1  "), { correct: true, isLast: false, nextIndex: 1 });
  assert.equal(manager.unlockedIndex, 1);
  assert.equal(manager.currentIndex, 0);
  assert.equal(calls.length, callsBeforeSubmit);
  assert.equal(manager.navigate(1), true);
  assert.deepEqual(manager.submit(" second "), { correct: true, isLast: false, nextIndex: 2 });
  assert.deepEqual(progress.state.completedLevelIds, ["one", "two"]);
});

test("the last accepted answer completes the game and replay cannot duplicate completion", () => {
  const { manager, progress } = setup();
  manager.navigate(0);
  manager.submit("FIRST");
  manager.navigate(1);
  manager.submit("SECOND");
  manager.navigate(2);
  assert.equal(manager.completed, false);
  assert.deepEqual(manager.submit("THIRD"), { correct: true, isLast: true, nextIndex: null });
  assert.equal(manager.completed, true);
  manager.submit("THIRD");
  manager.navigate(0);
  manager.submit("FIRST");
  assert.deepEqual(progress.state.completedLevelIds, ["one", "two", "three"]);
});

test("subscriptions report changes, unsubscribe detaches and reset removes unlocks", () => {
  const { manager } = setup();
  const states = [];
  const unsubscribe = manager.subscribe((state) => states.push(state));
  manager.navigate(0);
  manager.submit("FIRST");
  manager.navigate(1);
  manager.reset();
  assert.deepEqual(states.at(-1), { currentIndex: 0, unlockedIndex: 0, completed: false });
  assert.equal(manager.canAccess(1), false);
  const count = states.length;
  unsubscribe();
  manager.navigate(0);
  assert.equal(states.length, count);
});

test("forced preview navigation never grants progress or accepts a locked answer", () => {
  const { manager, progress } = setup();
  assert.equal(manager.navigate(2, { force: true }), true);
  assert.equal(manager.currentIndex, 2);
  assert.equal(progress.currentIndex, 0);
  assert.equal(manager.canAccess(2), false);
  assert.equal(manager.submit("THIRD").correct, false);
  assert.equal(manager.completed, false);
});

test("the catalog preserves the current game's accepted answers and Info requirements", () => {
  assert.equal(LEVEL_METADATA.length, 27);
  assert.equal(new Set(LEVEL_METADATA.map(({ id }) => id)).size, LEVEL_METADATA.length);
  assert.deepEqual(LEVEL_METADATA.map(({ code }) => code), [
    "CABBAGE", "FIBO", "19334488111", "ROTOR", "HEADACHE", "GEORGE", "POWER", "VOID",
    "HTTPS", "ORION", "FACADE", "EXIT", "PI", "GO", "DEBRIEFING", "ESCAPE", "SILVER", "SOIL", "NIGHT",
    "LOST", "SIGHT", "FOCUS", "BLIND", "TRAIN", "1024", "DROP", "FACE",
  ]);
  assert.deepEqual(LEVEL_METADATA.filter(({ hint }) => hint.tool).map(({ key }) => key),
    ["Lightswitch", "Modem", "Telescope", "Wires", "Crossing", "Flags", "TapCode", "Fireworks", "Chemistry", "Metro", "Resistors"]);
  assert.equal(LEVEL_METADATA.some(({ hint }) => hint.sound), false);
  for (const level of LEVEL_METADATA) {
    assert.ok(level.hint.text && level.description);
    assert.ok(Object.isFrozen(level));
    assert.ok(Object.isFrozen(level.hint));
  }
});
