import test from 'node:test';
import assert from 'node:assert/strict';
import { LevelManager } from '../../src/core/LevelManager.js';
import { ProgressStore } from '../../src/core/ProgressStore.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { DEMO } from '../../src/shared/house.js';

function session(memory = new Map()) {
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  const progress = new ProgressStore(storage, LEVEL_METADATA);
  const levels = new LevelManager(LEVEL_METADATA, progress);
  const active = new Set(['Boot']);
  levels.attach({ scene: { isActive: key => active.has(key), stop: key => active.delete(key),
    start: key => active.add(key), getScene: key => ({ key }) } });
  return { levels, progress, active, memory };
}
function solveRoom(levels, id) {
  const index = levels.indexOf(id);
  assert.equal(levels.navigate(index), true);
  assert.equal(levels.submit(LEVEL_METADATA[index].code).correct, true);
}

test('the demo starts in Room I and grants a key only after every puzzle in the room', { skip: !DEMO }, () => {
  const { levels } = session();
  assert.equal(levels.enterPlace('Room2'), false);
  assert.equal(levels.enterPlace('Study'), true);
  assert.deepEqual(levels.nearby.indexes.map(i => LEVEL_METADATA[i].id), ['binarytree', 'plantpot', 'cryptex']);
  for (const id of ['cryptex', 'binarytree']) { solveRoom(levels, id); assert.equal(levels.keyWaitingIn('Study'), null); }
  solveRoom(levels, 'plantpot');
  assert.equal(levels.keyWaitingIn('Study'), 'Room2');
  assert.equal(levels.takeKey('Room2'), true); assert.equal(levels.takeKey('Room2'), false);
  assert.equal(levels.enterPlace('Room2'), true);
});

test('Room II offers exactly His Cot, After Hours and the router and unlocks Room III', { skip: !DEMO }, () => {
  const { levels, progress } = session(); levels.takeKey('Room2'); levels.enterPlace('Room2');
  assert.deepEqual(new Set(levels.nearby.indexes.map(i => LEVEL_METADATA[i].id)), new Set(['cot', 'overtime', 'modem']));
  for (const id of ['modem', 'cot', 'overtime']) solveRoom(levels, id);
  assert.equal(levels.keyWaitingIn('Room2'), 'Room3');
  levels.takeKey('Room3'); assert.equal(levels.enterPlace('Room3'), true);
  assert.deepEqual(progress.state.usedKeys, ['Room2', 'Room3']);
  assert.equal(levels.keys.length, 0);
});

test('completing Room III seals the demo chest without awarding Room IV', { skip: !DEMO }, () => {
  const { levels } = session(); levels.takeKey('Room3'); levels.enterPlace('Room3');
  for (const id of ['compass', 'chessboard', 'mobilephone']) solveRoom(levels, id);
  assert.equal(levels.chestSealed('Room3'), true); assert.equal(levels.keyWaitingIn('Room3'), null);
  assert.equal(levels.placeState('Room3').finished, true);
  assert.equal(levels.enterPlace('Room4'), false);
});

test('old full-game keys cannot lift demo boundaries and room keys persist across reload', { skip: !DEMO }, () => {
  const { levels, memory } = session();
  for (const key of ['Room2', 'Room3', 'Room4', 'Room5', 'Room6']) levels.takeKey(key);
  levels.enterPlace('Room2');
  const reloaded = session(memory).levels;
  assert.equal(reloaded.enterPlace('Room2'), true);
  assert.equal(reloaded.keys.some(k => k.key === 'Room2'), false);
  assert.equal(reloaded.enterPlace('Room4'), false);
  // (the gate opens in the demo since 2026-11-13; what is up there stays shut)
  assert.equal(reloaded.enterPlace('Upper'), true);
  assert.equal(reloaded.enterPlace('Room7'), false);
});

test('reset stops the old scene and clears its place, keys, visited rooms and completion', () => {
  const { levels, progress, active } = session();
  levels.enterPlace('Study'); solveRoom(levels, 'binarytree'); levels.takeKey('Room2');
  levels.reset();
  assert.equal(active.size, 0); assert.equal(levels.place, null);
  assert.deepEqual(progress.state.completedLevelIds, []);
  assert.deepEqual(progress.state.keys, []); assert.deepEqual(progress.state.visitedPlaces, []);
  assert.deepEqual(progress.state.unlockedLevelIds, ['binarytree']);
});
