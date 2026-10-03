// Edges, not drawn crossings, determine a node's degree. The four marked
// nodes are part of this same graph, including the second node's blind branch.
export const VERTEX_NODES = Object.freeze([
  [0.20, 0.52], [0.40, 0.30], [0.61, 0.68], [0.81, 0.46],
  [0.12, 0.36], [0.23, 0.15], [0.48, 0.085], [0.74, 0.15], [0.90, 0.27],
  [0.945, 0.53], [0.79, 0.83], [0.56, 0.90], [0.28, 0.84], [0.065, 0.64],
  [0.31, 0.38], [0.49, 0.44], [0.64, 0.27], [0.72, 0.57], [0.44, 0.74],
  [0.30, 0.65], [0.57, 0.55], [0.82, 0.32], [0.48, 0.18], [0.14, 0.73],
].map(([x, y], id) => Object.freeze({ id, x, y })));
export const VERTEX_MARKED = Object.freeze([0, 1, 2, 3]);

export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

const branches = [
  [0, 4], [0, 5], [0, 14], [0, 15], [0, 19], [0, 13],
  [1, 15],
  [2, 17], [2, 11], [2, 18],
  [3, 21], [3, 8], [3, 9], [3, 10], [3, 17],
];
const struts = [
  [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 4],
  [4, 14], [5, 14], [5, 22], [6, 22], [6, 16], [7, 16], [7, 21], [8, 21], [9, 17],
  [10, 17], [11, 18], [12, 18], [12, 19], [13, 23], [23, 12], [23, 19],
  [14, 15], [14, 19], [14, 22], [15, 16], [15, 20], [15, 19], [15, 22], [16, 22],
  [16, 21], [16, 20], [16, 17], [17, 20], [17, 21], [18, 19], [18, 20], [19, 20],
  [6, 8], [7, 9], [9, 11], [10, 18], [11, 19], [4, 22], [5, 16], [8, 17], [12, 20],
].filter(([a, b]) => VERTEX_MARKED.every(id => segmentDistance(VERTEX_NODES[id], VERTEX_NODES[a], VERTEX_NODES[b]) > 0.055));

export const VERTEX_EDGES = Object.freeze([...branches, ...struts].map(Object.freeze));
export function degree(id, edges = VERTEX_EDGES) {
  return edges.filter(([a, b]) => a === id || b === id).length;
}
export function readVertex() {
  return [...VERTEX_MARKED].sort((a, b) => VERTEX_NODES[a].x - VERTEX_NODES[b].x)
    .map(id => String.fromCharCode(64 + degree(id))).join("");
}
export function vertexLayout(width, height) {
  const w = Math.min(width * 0.95, height * 1.1);
  const h = w * 0.78;
  return { width, height, w, h, x: (width - w) / 2, y: (height - h) / 2 - height * 0.015 };
}
