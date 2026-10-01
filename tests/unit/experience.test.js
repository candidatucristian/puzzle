import test from 'node:test';
import assert from 'node:assert/strict';
import { SafeStorage } from '../../src/core/SafeStorage.js';
import { ProgressStore, PROGRESS_KEY } from '../../src/core/ProgressStore.js';
import { ComfortPreferences, COMFORT_KEY, COMFORT_DEFAULTS } from '../../src/core/ComfortPreferences.js';
import { HintStore, HINTS_KEY } from '../../src/core/HintStore.js';
import { RoomPreviewStore, PREVIEWS_KEY } from '../../src/core/RoomPreviewStore.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

function memory() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

test('each room has three distinct, progressively available hints', () => {
  const storage = new SafeStorage(memory());
  const hints = new HintStore(storage, LEVEL_METADATA);
  const progress = new ProgressStore(storage, LEVEL_METADATA);
  const before = progress.state;
  for (const room of LEVEL_METADATA) {
    assert.equal(room.hint.steps.length, 3);
    assert.equal(new Set(room.hint.steps).size, 3);
    assert.ok(room.hint.steps.every(step => typeof step === 'string' && step.trim().length > 10));
    assert.equal(hints.count(room.id), 0);
    assert.equal(hints.reveal(room.id), 1);
  }
  assert.equal(hints.reveal('cryptex'), 2);
  assert.equal(hints.reveal('cryptex'), 3);
  assert.equal(hints.reveal('cryptex'), 3);
  const reloaded = new HintStore(storage, [...LEVEL_METADATA].reverse());
  assert.equal(reloaded.count('cryptex'), 3);
  assert.equal(reloaded.count('overtime'), 1);
  reloaded.reset();
  assert.equal(new HintStore(storage, LEVEL_METADATA).count('cryptex'), 0);
  assert.deepEqual(progress.state, before, 'help must never change completion or unlock rooms');
});

test('damaged optional hint and preference saves do not prevent loading', () => {
  const storage = new SafeStorage(memory());
  storage.setItem(HINTS_KEY, JSON.stringify({ cryptex: 900, tv: -1, flags: '2', removed: 1 }));
  const hints = new HintStore(storage, LEVEL_METADATA);
  assert.equal(hints.count('cryptex'), 3);
  assert.equal(hints.count('tv'), 0);
  assert.equal(hints.count('flags'), 0);
  assert.equal(hints.reveal('removed'), 0);
  storage.setItem(COMFORT_KEY, '{broken');
  assert.deepEqual(new ComfortPreferences(storage).state, COMFORT_DEFAULTS);
  storage.setItem(COMFORT_KEY, JSON.stringify({ grain: 999, textScale: 10, motion: 'always', ambientEffects: 'no' }));
  assert.deepEqual(new ComfortPreferences(storage).state, { ...COMFORT_DEFAULTS, grain: 100 });
});

test('comfort persists independently and respects live device reduced motion', () => {
  const storage = new SafeStorage(memory());
  const prefs = new ComfortPreferences(storage);
  prefs.set({ grain: 0, textScale: 1.3, motion: 'reduced', ambientEffects: false });
  const reload = new ComfortPreferences(storage);
  assert.deepEqual(reload.state, prefs.state);
  let calls = 0;
  const unsubscribe = reload.subscribe(() => calls++);
  reload.set({ motion: 'system', ambientEffects: true });
  assert.equal(reload.ambientMotion, true);
  reload.setSystemMotion(true);
  assert.equal(reload.reducedMotion, true);
  assert.equal(reload.ambientMotion, false);
  reload.setSystemMotion(false);
  assert.equal(reload.ambientMotion, true);
  assert.equal(calls, 3);
  unsubscribe();
  reload.set({ grain: 40 });
  assert.equal(calls, 3);
});

test('storage failures are reported per key without losing the current session', () => {
  const backend = memory();
  const storage = new SafeStorage(backend);
  const progress = new ProgressStore(storage, LEVEL_METADATA);
  assert.equal(progress.persisted, true);
  const originalWrite = backend.setItem;
  backend.setItem = (key, value) => {
    if (key === PREVIEWS_KEY) throw new Error('Quota exceeded');
    originalWrite(key, value);
  };
  const previews = new RoomPreviewStore(storage, LEVEL_METADATA);
  const png = 'data:image/png;base64,aGVsbG8=';
  assert.equal(previews.set('binarytree', png), true);
  assert.equal(previews.get('binarytree'), png);
  assert.equal(progress.persisted, true, 'an optional preview failure must not report the progress save as lost');
  backend.setItem = () => { throw new Error('Storage blocked'); };
  progress.complete(0);
  assert.equal(progress.persisted, false);
  assert.deepEqual(progress.state.completedLevelIds, ['binarytree']);
  assert.equal(storage.isPersisted(PROGRESS_KEY), false);
});

test('room previews accept only small embedded images for known rooms and reset cleanly', () => {
  const storage = new SafeStorage(memory());
  const png = 'data:image/png;base64,aGVsbG8=';
  storage.setItem(PREVIEWS_KEY, JSON.stringify({ tv: png, removed: png, cryptex: 'https://example.com/image.png' }));
  const previews = new RoomPreviewStore(storage, LEVEL_METADATA);
  assert.equal(previews.get('tv'), png);
  assert.equal(previews.get('removed'), undefined);
  assert.equal(previews.get('cryptex'), undefined);
  assert.equal(previews.set('tv', 'data:image/svg+xml;base64,aGVsbG8='), false);
  assert.equal(previews.set('tv', `data:image/png;base64,${'a'.repeat(32000)}`), false);
  previews.reset();
  assert.equal(new RoomPreviewStore(storage, LEVEL_METADATA).get('tv'), undefined);
});

test('the level veil numbers every level in Roman numerals, well past twenty-one', async () => {
  const { toRoman } = await import('../../src/ui/transitions.js');
  assert.deepEqual([1, 4, 9, 14, 18, 21, 22, 40, 44, 49, 50].map(toRoman),
    ['I', 'IV', 'IX', 'XIV', 'XVIII', 'XXI', 'XXII', 'XL', 'XLIV', 'XLIX', 'L']);
});
