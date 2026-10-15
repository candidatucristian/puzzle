import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { ProgressStore } from '../../src/core/ProgressStore.js';
import { PLOTTER_BLOCKS, pathSegments, formatPath, plotterLayout } from '../../src/levels/plotter/puzzle.js';
import { GAME_LIDS, polygonVertices, cupboardLayout, readKinetic } from '../../src/levels/kinetic/puzzle.js';
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

test('the four game pieces keep their side counts and left-to-right order', () => {
  assert.deepEqual(GAME_LIDS.map(f => f.sides), [3, 0, 7, 5]);
  assert.deepEqual(GAME_LIDS.map(f => f.rimCount), [3, 1, 7, 5]);
  assert.equal(readKinetic(), 'CAGE');
  for (const lid of GAME_LIDS) {
    const points = polygonVertices(lid.sides, 1);
    assert.equal(points.length, lid.sides);
    if (points.length) {
      const edges = points.map((p, n) => Math.hypot(p.x - points[(n + 1) % points.length].x, p.y - points[(n + 1) % points.length].y));
      assert.ok(edges.every(edge => Math.abs(edge - edges[0]) < 1e-10));
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

test('the games cupboard keeps every lid on its shelf, apart, in order and inside the picture', () => {
  for (const [W, H] of [[910, 876], [1440, 900], [568, 220], [360, 640]]) {
    const L = cupboardLayout(W, H);
    assert.deepEqual(L.lids.map(lid => lid.rimCount), [3, 1, 7, 5], 'the shelf reads left to right');
    for (const [index, lid] of L.lids.entries()) {
      assert.ok(lid.x > L.inner.x0 && lid.x + lid.w < L.inner.x1, 'inside the cupboard');
      assert.ok(Math.abs(lid.y + lid.h - L.shelves[1]) < 1e-9, 'standing on the middle shelf');
      assert.ok(lid.y > L.shelves[0], 'under the shelf above');
      assert.ok(lid.cx - lid.r > lid.x && lid.cx + lid.r < lid.x + lid.w && lid.cy - lid.r > lid.y && lid.cy + lid.r < lid.y + lid.h, 'the piece is on its lid');
      if (index) assert.ok(L.lids[index - 1].x + L.lids[index - 1].w < lid.x, 'the boxes stand apart');
    }
    const c = L.card;
    assert.ok(c.x > 0 && c.y > 0 && c.x + c.w < W && c.y + c.h < H, 'the card can be read');
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
    for (const lid of cupboardLayout(W, H).lids) {
      assert.ok(lid.cx - lid.r > 0 && lid.cx + lid.r < W && lid.cy - lid.r > 0 && lid.cy + lid.r < H);
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
