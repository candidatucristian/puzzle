import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";
import { RIPPLE_SOURCES, RIPPLE_STONES, RIPPLE_TARGETS, RIPPLE_MEET_MS, RIPPLE_ROUND_MS, RIPPLE_CYCLE_MS,
  dropTimes, rippleFrame, convergence, readConvergences, rippleLayout } from "../../src/levels/ripples/puzzle.js";
import { VERTEX_NODES, VERTEX_MARKED, VERTEX_EDGES, degree, readVertex, segmentDistance, vertexLayout } from "../../src/levels/vertex/puzzle.js";

test("three real circular fronts meet at each answer stone in the same frame", () => {
  assert.equal(RIPPLE_SOURCES.length, 3);
  for (const [round, target] of RIPPLE_TARGETS.entries()) {
    assert.ok(dropTimes(round).every(t => t > 0 && t < RIPPLE_MEET_MS));
    const { waves } = rippleFrame(round * RIPPLE_ROUND_MS + RIPPLE_MEET_MS);
    assert.equal(waves.length, 3);
    for (const wave of waves) {
      assert.equal(wave.active, true);
      assert.ok(Math.abs(Math.hypot(wave.x - target.x, wave.y - target.y) - wave.radius) < 1e-12);
    }
    // Test the entire set of engraved stones, including false two-ring crossings.
    const meeting = RIPPLE_STONES.filter(s => convergence(s, round).strength > 0.55);
    assert.deepEqual(meeting.map(s => s.id), [target.id]);
  }
  assert.equal(readConvergences(), "DROP");
  assert.equal(LEVEL_METADATA[25].id, "ripples");
  assert.equal(LEVEL_METADATA[25].code, readConvergences());
});

test("rain repeats without changing its sources, and circles survive different aspect ratios", () => {
  for (const time of [0, 900, 3200, 7111, RIPPLE_CYCLE_MS - 1]) {
    assert.deepEqual(rippleFrame(time), rippleFrame(time + RIPPLE_CYCLE_MS));
    for (const [W, H] of [[910, 876], [1440, 900], [568, 200], [360, 640]]) {
      const L = rippleLayout(W, H);
      assert.ok(L.x >= 0 && L.y >= 0 && L.x + L.size <= W && L.y + L.size <= H);
      for (const wave of rippleFrame(time).waves) {
        assert.ok(Number.isFinite(wave.radius) && wave.radius >= 0);
        const rx = (wave.x + wave.radius) * L.size - wave.x * L.size;
        const ry = (wave.y + wave.radius) * L.size - wave.y * L.size;
        assert.ok(Math.abs(rx - ry) < 1e-9);
      }
    }
  }
});

test("Vertex's displayed graph has precisely the four degrees for FACE", () => {
  assert.equal(new Set(VERTEX_EDGES.map(e => [...e].sort((a, b) => a - b).join("-"))).size, VERTEX_EDGES.length);
  for (const [a, b] of VERTEX_EDGES) {
    assert.notEqual(a, b);
    assert.ok(VERTEX_NODES[a] && VERTEX_NODES[b]);
  }
  assert.deepEqual(VERTEX_MARKED.map(id => degree(id)), [6, 1, 3, 5]);
  assert.equal(readVertex(), "FACE");
  assert.equal(LEVEL_METADATA[26].id, "vertex");
  assert.equal(LEVEL_METADATA[26].code, readVertex());
});

test("marked nodes have distinct outgoing directions and no false nearby connections", () => {
  for (const id of VERTEX_MARKED) {
    const p = VERTEX_NODES[id];
    const angles = [];
    for (const [a, b] of VERTEX_EDGES) {
      if (a !== id && b !== id) {
        assert.ok(segmentDistance(p, VERTEX_NODES[a], VERTEX_NODES[b]) > 0.035, `edge ${a}-${b} passes node ${id}`);
      } else {
        const q = VERTEX_NODES[a === id ? b : a];
        angles.push(Math.atan2(q.y - p.y, q.x - p.x));
      }
    }
    for (let i = 0; i < angles.length; i++) for (let j = i + 1; j < angles.length; j++) {
      const gap = Math.acos(Math.cos(angles[i] - angles[j]));
      assert.ok(gap > 0.25, `node ${id} has indistinguishable outgoing edges`);
    }
  }
  for (const [W, H] of [[910, 876], [1440, 900], [568, 200], [360, 640]]) {
    const L = vertexLayout(W, H);
    const xs = VERTEX_MARKED.map(id => L.x + VERTEX_NODES[id].x * L.w);
    assert.deepEqual([...xs].sort((a, b) => a - b), xs);
    assert.ok(L.x >= 0 && L.y >= 0 && L.y + L.h <= H);
  }
});
