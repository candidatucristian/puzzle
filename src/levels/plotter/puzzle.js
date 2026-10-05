// Cartesian coordinates: X grows right, Y grows UP. A block starts with
// a lifted pen; every following coordinate is joined to the previous one.
export const PLOTTER_BLOCKS = Object.freeze([
  [[0, 0], [0, 4], [2, 4], [2, 2], [0, 2]], // P
  [[0, 4], [2, 4], [1, 4], [1, 0], [0, 0], [2, 0]], // I
  [[0, 0], [0, 4], [2, 0], [2, 4]], // N
  [[2, 4], [0, 4], [0, 0], [2, 0], [2, 2], [1, 2]], // G
].map(points => Object.freeze(points.map(([x, y]) => Object.freeze({ x, y })))));

export function pathSegments(points) {
  return points.slice(1).map((point, i) => [points[i], point]);
}

export function formatPath(points, perLine = 6) {
  const lines = [];
  for (let i = 0; i < points.length; i += perLine) {
    lines.push((i ? '-> ' : '') + points.slice(i, i + perLine).map(p => `(${p.x},${p.y})`).join(' -> '));
  }
  return lines.join('\n');
}

export function plotterLayout(width, height) {
  const screen = { x: width * 0.075, y: height * 0.115, w: width * 0.85, h: height * 0.75 };
  const columns = width / height > 1.8 ? 2 : 1;
  const rows = 4 / columns;
  const pad = Math.min(28, screen.w * 0.04);
  const header = Math.min(68, screen.h * 0.17), footer = Math.max(40, Math.min(66, screen.h * 0.18));
  const cellW = (screen.w - pad * 2) / columns;
  const cellH = (screen.h - header - footer) / rows;
  const perLine = cellW < 570 ? 3 : 6;
  const longest = Math.max(...PLOTTER_BLOCKS.flatMap(p => formatPath(p, perLine).split('\n').map(s => s.length)));
  const font = Math.max(9, Math.min(21, (cellW - 18) / (longest * 0.61), cellH / (perLine === 3 ? 4.5 : 3.3)));
  const blocks = PLOTTER_BLOCKS.map((_, i) => ({
    x: screen.x + pad + i % columns * cellW,
    y: screen.y + header + Math.floor(i / columns) * cellH,
    w: cellW, h: cellH,
  }));
  return { width, height, screen, font, perLine, blocks };
}
