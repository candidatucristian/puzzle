/** The small lights the night rooms share: a four-point sparkle and the
 *  twinkle that keeps it alive. Painted once per key
 *  onto a canvas texture; a scene removes the key when it releases its art. */

// a sharp four-point star with a soft core — the glint on a lens, a mote
// crossing a lamp, the brightest star in a window
export function makeSparkleTexture(textures, key, rgb = "255,255,255") {
  if (textures.exists(key)) textures.remove(key);
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const m = S / 2;
  const core = ctx.createRadialGradient(m, m, 0, m, m, S * 0.22);
  core.addColorStop(0, `rgba(${rgb},0.9)`);
  core.addColorStop(0.5, `rgba(${rgb},0.25)`);
  core.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = `rgba(${rgb},0.95)`;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? S * 0.07 : i % 4 === 0 ? S * 0.48 : S * 0.3;
    ctx.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  textures.addCanvas(key, c);
  return key;
}

/** Sparkles that come and go: each one brightens, turns a little and fades
 *  on its own clock. `points` gives {x, y, size} for each; the scene's
 *  ambient tweens pause them with the motion preference. */
export function twinkle(scene, key, points, rnd, opts = {}) {
  const { depth = 0, alpha = 0.9, period = [1400, 3200], blend = "ADD" } = opts;
  const out = [];
  for (const p of points) {
    const img = scene.add
      .image(p.x, p.y, key)
      .setDisplaySize(p.size, p.size)
      .setBlendMode(blend)
      .setDepth(depth)
      .setAlpha(0)
      .setAngle(rnd() * 90);
    if (opts.ambient !== false) scene.ambientObject(img);
    scene.ambientTween({
      targets: img,
      alpha: alpha * (0.6 + rnd() * 0.4),
      angle: img.angle + 25 + rnd() * 30,
      duration: period[0] + rnd() * (period[1] - period[0]),
      delay: rnd() * period[1],
      yoyo: true,
      repeat: -1,
      hold: rnd() * 400,
      repeatDelay: rnd() * 2600,
      ease: "Sine.easeInOut",
    });
    out.push(img);
  }
  return out;
}

/** A flame or an old tube: never quite still. Returns a stop function. */
export function flicker(scene, target, lo, hi, speed = 1) {
  let alive = true;
  const step = () => {
    if (!alive || !target.active) return;
    scene.tweens.add({
      targets: target,
      alpha: lo + Math.random() * (hi - lo),
      duration: (90 + Math.random() * 260) / speed,
      onComplete: step,
    });
  };
  step();
  return () => {
    alive = false;
  };
}
