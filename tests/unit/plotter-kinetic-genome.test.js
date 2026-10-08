import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { ProgressStore } from '../../src/core/ProgressStore.js';
import { PLOTTER_BLOCKS, pathSegments, formatPath, plotterLayout } from '../../src/levels/plotter/puzzle.js';
import { KINETIC_FORMS, polygonVertices, kineticPose, kineticRig, kineticLayout, readKinetic } from '../../src/levels/kinetic/puzzle.js';
import { nurseryLayout } from '../../src/levels/kinetic/nurseryGeometry.js';
import { STANDARD_CODE, GENOME_FRAGMENT, FRAGMENT_TEXT, aminoAcid, translateFragment, genomeLayout } from '../../src/levels/genome/puzzle.js';

// Sample the actual line geometry onto a small bitmap, with positive Y up.
// This catches mirrored letters, swapped blocks, missing strokes and diagonals.
function raster(points) {
  const segments = pathSegments(points);
  return Array.from({ length: 9 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
    const x = col / 2, y = 4 - row / 2;
    const hit = segments.some(([a, b]) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - a.x - t * dx, y - a.y - t * dy) < 0.23;
    });
    return hit ? '#' : '.';
  }).join(''));
}

test('Plotter instructions actually draw P, I, N and G in that order', () => {
  const glyphs = [
    ['#####', '#...#', '#...#', '#...#', '#####', '#....', '#....', '#....', '#....'],
    ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    ['#...#', '##..#', '##..#', '###.#', '#.#.#', '#.###', '#..##', '#..##', '#...#'],
    ['#####', '#....', '#....', '#....', '#.###', '#...#', '#...#', '#...#', '#####'],
  ];
  assert.deepEqual(PLOTTER_BLOCKS.map(raster), glyphs);
  for (const block of PLOTTER_BLOCKS) for (const perLine of [3, 6]) {
    const printed = [...formatPath(block, perLine).matchAll(/\((\d+),(\d+)\)/g)]
      .map(([, x, y]) => ({ x: Number(x), y: Number(y) }));
    assert.deepEqual(printed, block, 'wrapping must preserve every coordinate and its order');
  }
  assert.equal(LEVEL_METADATA[27].code, 'PING');
});

test('the four moving silhouettes preserve their side counts and top-to-bottom order', () => {
  assert.deepEqual(KINETIC_FORMS.map(f => f.sides), [3, 0, 7, 5]);
  assert.deepEqual(KINETIC_FORMS.map(f => f.rimCount), [3, 1, 7, 5]);
  assert.equal(readKinetic(), 'CAGE');
  for (const time of [0, 15000, 45000, 90000, 160000]) {
    const forms = kineticPose(time);
    for (const [i, form] of forms.entries()) {
      const points = polygonVertices(form.sides, form.radius, form.angle);
      assert.equal(points.length, form.sides);
      if (points.length) {
        const edges = points.map((p, n) => Math.hypot(p.x - points[(n + 1) % points.length].x, p.y - points[(n + 1) % points.length].y));
        assert.ok(edges.every(edge => Math.abs(edge - edges[0]) < 1e-10));
      }
      if (i) assert.ok(forms[i - 1].y + forms[i - 1].radius < form.y - form.radius);
    }
  }
  assert.equal(LEVEL_METADATA[28].code, readKinetic());
});

test('the standard genetic code translates the displayed coding DNA and corresponding RNA to SPACE', () => {
  assert.equal(Object.keys(STANDARD_CODE).length, 64);
  assert.ok(Object.keys(STANDARD_CODE).every(codon => /^[TCAG]{3}$/.test(codon)));
  assert.deepEqual(Object.keys(STANDARD_CODE).filter(codon => STANDARD_CODE[codon] === '*').sort(), ['TAA', 'TAG', 'TGA']);
  assert.deepEqual(GENOME_FRAGMENT.map(aminoAcid), ['S', 'P', 'A', 'C', 'E']);
  assert.equal(translateFragment(), 'SPACE');
  assert.equal(translateFragment(['UCU', 'CCU', 'GCU', 'UGU', 'GAA']), 'SPACE');
  assert.equal(aminoAcid(' atg '), 'M');
  assert.equal(aminoAcid('TTT'), 'F');
  assert.equal(aminoAcid('GGG'), 'G');
  for (const invalid of ['T', 'TCTC', 'XXX', '', null, 4]) assert.equal(aminoAcid(invalid), null);
  assert.equal(translateFragment(['TCT', '???']), null);
  assert.equal(LEVEL_METADATA[29].code, translateFragment());
  assert.equal(LEVEL_METADATA[29].hint.tool, true);
});

test('the nursery mobile stays connected, readable and inside the room throughout its sway', () => {
  for (const [W, H] of [[910, 876], [1440, 900], [568, 220], [360, 640]]) {
    const L = kineticLayout(W, H), room = nurseryLayout(W, H);
    const head = room.head;
    assert.ok(head.x > 0 && head.x < W && head.y > 0 && head.y < H);
    for (let time = 0; time < 180000; time += 1337) {
      const rig = kineticRig(time);
      assert.deepEqual(rig.forms.map(form => form.rimCount), [3, 1, 7, 5], 'wind must never reorder the answer');
      assert.equal(rig.rods.length, 3);
      for (const [index, form] of rig.forms.entries()) {
        const r = form.radius * L.size;
        const x = L.x + form.x * L.size, y = L.y + form.y * L.size;
        assert.ok(x - r > 0 && x + r < W && y - r > 0 && y + r < H);
        assert.ok(y + r < head.y, 'the mobile must hang above the sleeping baby');
        assert.ok(Math.cos(form.yaw) > 0.95, 'no polygon turns edge-on and loses countable sides');
        if (index) {
          const prior = rig.forms[index - 1];
          assert.ok(prior.y + prior.radius < form.y - form.radius, 'silhouettes remain vertically separate');
        }
        const holeX = form.x + Math.sin(form.rotation) * form.radius * 0.85;
        const holeY = form.y - Math.cos(form.rotation) * form.radius * 0.85;
        assert.ok(Math.hypot(holeX - form.attachment.x, holeY - form.attachment.y) < 1e-12);
        assert.ok(rig.strings.some(string => Math.hypot(string.x2 - holeX, string.y2 - holeY) < 1e-12),
          'every toy is tied at its painted attachment hole');
      }
    }
  }
});

test('new clues fit desktop, small landscape phones and portrait layouts', () => {
  for (const [W, H] of [[910, 876], [1440, 900], [568, 220], [360, 640]]) {
    const plot = plotterLayout(W, H);
    assert.ok(plot.font >= 9);
    for (const [i, block] of plot.blocks.entries()) {
      assert.ok(block.x > 0 && block.y > 0 && block.x + block.w < W && block.y + block.h < H);
      const lines = formatPath(PLOTTER_BLOCKS[i], plot.perLine).split('\n');
      assert.ok(lines.every(line => line.length * plot.font * 0.61 <= block.w - 16));
      assert.ok(plot.font * (1.25 + lines.length * 1.25) < block.h);
    }
    const kinetic = kineticLayout(W, H);
    for (const form of kineticPose(0)) {
      const x = kinetic.x + form.x * kinetic.size, y = kinetic.y + form.y * kinetic.size, r = form.radius * kinetic.size;
      assert.ok(x - r > 0 && x + r < W && y - r > 0 && y + r < H);
    }
    const genome = genomeLayout(W, H);
    assert.ok(genome.font >= 10);
    assert.ok(FRAGMENT_TEXT.length * genome.font * 0.61 < genome.fragment.w);
  }
});

test('a completed 27-level save retains its answers and unlocks only the next new level', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const oldGame = new ProgressStore(storage, LEVEL_METADATA.slice(0, 27));
  for (let i = 0; i < 27; i++) oldGame.complete(i);
  assert.equal(oldGame.completed, true);
  const newGame = new ProgressStore(storage, LEVEL_METADATA);
  assert.equal(newGame.state.completedLevelIds.length, 27);
  assert.equal(newGame.completed, false);
  assert.equal(newGame.canAccess(27), true);
  assert.equal(newGame.canAccess(28), false);
  assert.equal(newGame.canAccess(29), false);
  newGame.complete(27); newGame.complete(28); newGame.complete(29);
  assert.equal(newGame.state.completedLevelIds.length, 30);
  assert.equal(newGame.canAccess(30), true);
  assert.equal(newGame.canAccess(31), false);
  assert.equal(newGame.completed, false);
});
