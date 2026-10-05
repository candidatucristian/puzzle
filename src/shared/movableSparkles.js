import Phaser from "phaser";

const PARTICLES = 12;

function star(g, x, y, radius, alpha) {
  g.lineStyle(Math.max(0.6, radius * 0.22), 0xffe8b5, alpha);
  g.lineBetween(x - radius, y, x + radius, y);
  g.lineBetween(x, y - radius, x, y + radius);
  g.lineStyle(Math.max(0.35, radius * 0.12), 0xffffff, alpha * 0.7);
  g.lineBetween(x - radius * 0.62, y - radius * 0.62, x + radius * 0.62, y + radius * 0.62);
  g.lineBetween(x + radius * 0.62, y - radius * 0.62, x - radius * 0.62, y + radius * 0.62);
}

/** A small, bounded sparkle cue for a draggable puzzle object. */
export function attachMovableSparkles(scene, target, {
  bounds = () => target.getBounds(),
  enabled = () => true,
  padding = 4,
} = {}) {
  const graphics = scene.add.graphics()
    .setDepth(1000)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setData("movableSparkles", true);
  const particles = Array.from({ length: PARTICLES }, () => ({
    age: 1,
    life: 1,
    x: 0,
    y: 0,
    dx: 0,
    rise: 0,
    size: 0,
  }));
  let elapsed = 0, disposed = false;

  function tick(time, delta = 16) {
    if (disposed || !graphics.scene) return;
    graphics.clear();
    if (!enabled() || !target.scene || !target.visible) return;

    const box = bounds();
    if (!box || box.width <= 0 || box.height <= 0) return;
    const dt = Math.min(delta || 16, 100);
    const reducedMotion = !scene.ambientMotion;
    const anchors = [
      [box.x - padding, box.y + box.height * 0.22],
      [box.x + box.width + padding, box.y + box.height * 0.42],
      [box.x + box.width * 0.72, box.y - padding],
    ];
    anchors.forEach(([x, y], index) => {
      const pulse = reducedMotion ? 0.18 : 0.18 + 0.38 * Math.max(0, Math.sin(time / 380 + index * 2.1));
      star(graphics, x, y, 2.2 + pulse * 2.1, pulse);
    });

    if (reducedMotion) {
      for (const particle of particles) particle.age = particle.life;
      return;
    }
    elapsed -= dt;
    if (elapsed <= 0) {
      const particle = particles.find(item => item.age >= item.life);
      if (particle) {
        particle.age = 0;
        particle.life = 480 + Math.random() * 440;
        particle.x = box.x + Math.random() * box.width;
        particle.y = box.y + Math.random() * box.height;
        particle.dx = (Math.random() - 0.5) * 12;
        particle.rise = 9 + Math.random() * 15;
        particle.size = 1.6 + Math.random() * 1.8;
      }
      elapsed = 90 + Math.random() * 120;
    }
    for (const particle of particles) {
      if (particle.age >= particle.life) continue;
      particle.age = Math.min(particle.life, particle.age + dt);
      const progress = particle.age / particle.life;
      const alpha = Math.sin(progress * Math.PI) * 0.78;
      star(graphics, particle.x + particle.dx * progress, particle.y - particle.rise * progress,
        particle.size * (1 - progress * 0.35), alpha);
    }
  }

  scene.events.on("postupdate", tick);
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    scene.events.off("shutdown", destroy);
    scene.events.off("postupdate", tick);
    graphics.destroy();
  };
  scene.events.once("shutdown", destroy);
  return destroy;
}
