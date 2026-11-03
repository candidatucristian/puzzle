/** Fine object contours with a few small, twinkling stars along their edges. */
const GOLD = 0xd4b478;
const IVORY = 0xffebbc;

function perimeter(points) {
  let length = 0;
  const edges = points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const size = Math.hypot(b.x - a.x, b.y - a.y);
    const edge = { a, b, start: length, size };
    length += size;
    return edge;
  });
  return { points, edges: edges.filter(edge => edge.size > 0), length };
}

function along(path, distance) {
  const d = ((distance % path.length) + path.length) % path.length;
  const edge = path.edges.find(edge => d < edge.start + edge.size) ?? path.edges[path.edges.length - 1];
  const t = (d - edge.start) / edge.size;
  return {
    x: edge.a.x + (edge.b.x - edge.a.x) * t,
    y: edge.a.y + (edge.b.y - edge.a.y) * t,
    nx: (edge.b.y - edge.a.y) / edge.size,
    ny: -(edge.b.x - edge.a.x) / edge.size,
  };
}

function glint(graphics, point, radius, alpha) {
  const inner = radius * 0.25;
  graphics.fillStyle(IVORY, alpha);
  graphics.fillPoints([
    { x: point.x, y: point.y - radius },
    { x: point.x + inner, y: point.y - inner },
    { x: point.x + radius, y: point.y },
    { x: point.x + inner, y: point.y + inner },
    { x: point.x, y: point.y + radius },
    { x: point.x - inner, y: point.y + inner },
    { x: point.x - radius, y: point.y },
    { x: point.x - inner, y: point.y - inner },
  ], true);
  graphics.lineStyle(0.5, 0xfff5d9, alpha * 0.45);
  const diagonal = radius * 0.46;
  graphics.lineBetween(point.x - diagonal, point.y - diagonal, point.x + diagonal, point.y + diagonal);
  graphics.lineBetween(point.x - diagonal, point.y + diagonal, point.x + diagonal, point.y - diagonal);
  graphics.fillStyle(0xfffcf0, alpha);
  graphics.fillCircle(point.x, point.y, 0.65);
}

export function attachContourSparkles(scene, target, polygons) {
  const paths = polygons.filter(points => points.length >= 3).map(perimeter).filter(path => path.length > 0);
  const graphics = scene.add.graphics().setDepth(6).setData('roomContourSparkles', true);
  const unit = Math.max(0.65, Math.min(scene._L.u, 1.3));
  const first = paths[0]?.points[0];
  const offset = first ? (first.x * 17 + first.y * 11) % 2400 : 0;
  let hovered = false, disposed = false;
  const over = () => { hovered = true; };
  const out = () => { hovered = false; };

  function draw(time = 0) {
    if (disposed || !graphics.scene) return;
    graphics.clear();
    if (!target.scene || !target.visible) return;
    const still = scene.reducedMotion || !scene.ambientMotion;
    const elapsed = time + offset;
    paths.forEach(path => {
      // A fine, readable edge without a surrounding halo.
      graphics.lineStyle((hovered ? 0.95 : 0.8) * unit, GOLD, hovered ? 0.4 : 0.2);
      graphics.strokePoints(path.points, true);

    });
    if (!paths.length) return;

    // Two alternating slots keep the glitter sparse: at most one small
    // star per object group, appearing and fading close to its silhouette.
    for (let slot = 0; slot < (still ? 1 : 2); slot++) {
      const localTime = elapsed + slot * 1200;
      const cycle = still ? 0 : Math.floor(localTime / 2400);
      const age = still ? 550 : localTime % 2400;
      if (age >= 1100) continue;
      const path = paths[(cycle * 2 + slot) % paths.length];
      const progress = age / 1100;
      const pulse = still ? 0.7 : Math.sin(Math.PI * progress) ** 2;
      const position = (0.18 + slot * 0.43 + (cycle % 7) * 0.137) * path.length + progress * 3 * unit;
      const point = along(path, position);
      point.x += point.nx * 1.5 * unit;
      point.y += point.ny * 1.5 * unit;
      const radius = (1.5 + pulse * (hovered ? 2.5 : 2.1)) * unit;
      glint(graphics, point, radius, (hovered ? 1 : 0.95) * pulse);
      // Two nearby grains make the flash read as glitter, within a few
      // pixels of the star instead of scattering over the room.
      graphics.fillStyle(IVORY, pulse * 0.55);
      graphics.fillCircle(point.x + 3.2 * unit, point.y - 2 * unit, 0.5 * unit);
      graphics.fillCircle(point.x - 2.4 * unit, point.y + 2.8 * unit, 0.4 * unit);
    }
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    target.off('pointerover', over);
    target.off('pointerout', out);
    target.off('destroy', dispose);
    scene.input.off('gameout', out);
    scene.events.off('postupdate', draw);
    scene.events.off('shutdown', dispose);
    graphics.destroy();
  };
  target.on('pointerover', over);
  target.on('pointerout', out);
  target.once('destroy', dispose);
  scene.input.on('gameout', out);
  scene.events.on('postupdate', draw);
  scene.events.once('shutdown', dispose);
  draw();
  return dispose;
}
