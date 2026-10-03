import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { ProgressStore } from '../../src/core/ProgressStore.js';
import { CURTAIN_START, CURTAIN_ALIGNMENT, CURTAIN_LETTERS, CURTAIN_HOLES, curtainLightAt, curtainLayout } from '../../src/levels/curtain/puzzle.js';
import { SILL_APERTURES, sillLightAt, sillLayout, aperturePoints } from '../../src/levels/thesill/puzzle.js';
import { VENETIAN_START, VENETIAN_ALIGNMENT, cityLights, blindSlits, lightPassesBlind, venetianLayout } from '../../src/levels/venetian/puzzle.js';

test('the actual curtain apertures leave exactly MOTH out of fifty fixed engravings', () => {
  assert.equal(CURTAIN_LETTERS.length, 50);
  assert.equal(CURTAIN_HOLES.length, 4);
  const visible = position => CURTAIN_LETTERS.filter(letter => curtainLightAt(letter, position)).sort((a, b) => a.x - b.x);
  assert.equal(visible(CURTAIN_START).length, 50);
  assert.equal(visible(CURTAIN_ALIGNMENT).map(letter => letter.letter).join(''), 'MOTH');
  // A whole glyph, not just its centre, fits in every tear at alignment.
  for (const letter of visible(CURTAIN_ALIGNMENT)) for (const x of [-0.019, 0.019]) for (const y of [-0.024, 0.024]) {
    assert.equal(curtainLightAt({ x: letter.x + x, y: letter.y + y }, CURTAIN_ALIGNMENT), true);
  }
  for (const offset of [-0.08, 0.08]) assert.notEqual(visible(CURTAIN_ALIGNMENT + offset).map(l => l.letter).join(''), 'MOTH');
  assert.equal(curtainLightAt({ x: -0.1, y: 0.4 }, CURTAIN_START), false);
});

test('the sill has four distinct light silhouettes and A retains a dark counter', () => {
  assert.equal(SILL_APERTURES.length, 4);
  // Samples of recognisable strokes and spaces, independent of a text font.
  const strokes = [
    [[0.1,0.2],[0.22,0.85],[0.5,0.35],[0.75,0.85],[0.9,0.2]],
    [[0.5,0.1],[0.26,0.6],[0.74,0.6],[0.5,0.65],[0.1,0.9]],
    [[0.1,0.2],[0.1,0.8],[0.5,0.32],[0.5,0.65],[0.8,0.9]],
    [[0.1,0.4],[0.7,0.1],[0.6,0.5],[0.7,0.9]],
  ];
  for (const [i, samples] of strokes.entries()) for (const [x, y] of samples) assert.equal(sillLightAt(i, x, y), true);
  assert.equal(sillLightAt(1, 0.5, 0.4), false, 'A must not become a solid triangle');
  assert.equal(sillLightAt(3, 0.65, 0.3), false, 'E needs its upper gap');
  assert.equal(sillLightAt(3, 0.65, 0.7), false, 'E needs its lower gap');
  assert.equal(sillLightAt(0, 0.5, 0.85), false, 'the two lower strokes of W stay separated');
});

test('one static city image is decoded by the barrier, with no noise passing at alignment', () => {
  const lights = cityLights();
  assert.ok(lights.length > 10000);
  assert.deepEqual(cityLights(), lights, 'rebuilds must not reshuffle the interference');
  const exposed = position => lights.filter(light => lightPassesBlind(light.y, position));
  const answer = exposed(VENETIAN_ALIGNMENT);
  assert.ok(answer.length > 600);
  assert.equal(answer.every(light => light.signal), true);
  assert.equal(answer.length, lights.filter(light => light.signal).length);
  const start = exposed(VENETIAN_START);
  assert.ok(start.filter(light => !light.signal).length > answer.length * 3);
  for (const tilt of [0, 0.25, 0.45, 0.8, 1]) {
    assert.ok(exposed(tilt).some(light => !light.signal));
  }
  // The signal rows actually carry C, I, T and Y, including their dark gaps.
  const raster = [0,1,2,3].map(letter => Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      const x = 0.105 + (letter * 6 + col + 0.5) / 23 * 0.79;
      const y = 0.29 + (row + 0.5) / 7 * 0.43;
      return answer.some(light => Math.abs(light.x - x) < 0.009 && Math.abs(light.y - y) < 0.018) ? '#' : '.';
    }).join('')));
  assert.deepEqual(raster, [
    ['.####','##...','#....','#....','#....','##...','.####'],
    ['#####','..#..','..#..','..#..','..#..','..#..','#####'],
    ['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
    ['#...#','##.##','.#.#.','..#..','..#..','..#..','..#..'],
  ]);
  for (const slit of blindSlits(VENETIAN_ALIGNMENT)) assert.ok(slit.top >= 0 && slit.bottom <= 1 && slit.top < slit.bottom);
});

test('light puzzles keep their apertures and controls inside small and large viewports', () => {
  for (const [W, H] of [[910,876],[1440,900],[568,220],[360,640]]) {
    const curtain = curtainLayout(W, H), p = curtain.patch;
    assert.ok(p.x > 0 && p.y > 0 && p.x + p.size < W && p.y + p.size < H);
    const sill = sillLayout(W, H);
    for (const [i, aperture] of SILL_APERTURES.entries()) for (const q of aperturePoints(sill, i, aperture.outline)) {
      assert.ok(q.x >= 0 && q.x <= W && q.y > 0 && q.y < H);
    }
    const venetian = venetianLayout(W, H);
    assert.ok(venetian.cordX + 12 < W && venetian.pullTop + venetian.pullTravel + 18 < H);
  }
});

test('a completed thirty-room save unlocks Curtain and reaches completion only after CITY', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const old = new ProgressStore(storage, LEVEL_METADATA.slice(0, 30));
  for (let i = 0; i < 30; i++) old.complete(i);
  const current = new ProgressStore(storage, LEVEL_METADATA);
  assert.equal(current.state.completedLevelIds.length, 30);
  assert.equal(current.canAccess(30), true); assert.equal(current.canAccess(31), false); assert.equal(current.canAccess(32), false);
  assert.equal(current.completed, false);
  current.complete(30); assert.equal(current.canAccess(31), true);
  current.complete(31); assert.equal(current.canAccess(32), true); assert.equal(current.completed, false);
  current.complete(32); assert.equal(current.completed, true);
  assert.deepEqual(LEVEL_METADATA.slice(30).map(({ id, key, code, hint }) => [id,key,code,hint.tool,hint.sound]), [
    ['curtain','Curtain','MOTH',false,false], ['thesill','TheSill','WAKE',false,false], ['venetian','Venetian','CITY',false,false],
  ]);
});
