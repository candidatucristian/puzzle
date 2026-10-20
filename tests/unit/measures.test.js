import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutSink, waterIn, area } from '../../src/levels/measures/art.js';
import { FLASK_ML, pour, toTheLine } from '../../src/levels/measures/puzzle.js';

test('the widened photographic glass preserves liquid volume and a horizontal surface during tilts', () => {
  for (const [width, height] of [[1000, 620], [1180, 822], [840, 430], [1660, 948]]) {
    const L = layoutSink(width, height);
    for (const v of L.vessels) for (const fraction of [.1, .4, .8, 1]) for (const angle of [-2, -1.2, 0, 1.25]) {
      const water = waterIn(v, fraction, angle);
      assert.ok(Math.abs(area(water.poly) / v.area - fraction) < .00001);
      const [p, q] = water.surface;
      const down = point => point.x * Math.sin(angle) + point.y * Math.cos(angle);
      assert.ok(Math.abs(down(p) - down(q)) < .001);
    }
    const flask = L.vessels[2];
    assert.ok(flask.ring > flask.top && flask.ring < -flask.r);
    assert.ok(Math.abs(waterIn(flask, FLASK_ML / flask.cap, 0).surface[0].y - flask.ring) < .001);
  }
});

test('only the exact 400 ml solution can ignite the strip', () => {
  let levels = [500, 0];
  levels = pour(levels, 0, 1).levels;
  levels[1] = 0;
  levels = pour(levels, 0, 1).levels;
  levels[0] = 500;
  levels = pour(levels, 0, 1).levels;
  assert.deepEqual(levels, [400, 300]);
  assert.equal(toTheLine(levels[0]), true);
  for (const amount of [0, 100, 200, 300, 399.9, 400.1, 500]) assert.equal(toTheLine(amount), false);
});
