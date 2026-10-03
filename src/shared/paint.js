/** Small helpers for the rooms painted once on a canvas: soft light and
 *  shadow, film grain, colours, seeded randomness, and handing a canvas to
 *  Phaser as a texture. */

/** A soft elliptical pool of colour (`rgbs` as "r,g,b"), strongest at its
 *  centre and gone at its edge; `op` is the canvas composite to paint with
 *  ("lighter" for light). */
export function soft(ctx, cx, cy, rx, ry, rgbs, a, op = "source-over") {
  if (!(rx > 0) || !(ry > 0)) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgbs},${a})`);
  g.addColorStop(0.45, `rgba(${rgbs},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgbs},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

let NOISE = null;
/** A fine film grain over the area, at `alpha`. */
export function grain(ctx, W, H, alpha) {
  if (!NOISE) {
    NOISE = makeCanvas(128, 128);
    const g = NOISE.getContext("2d");
    const img = g.createImageData(128, 128);
    const rnd = lcg(90210);
    for (let i = 0; i < 128 * 128; i++) {
      const v = (rnd() * 255) | 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(NOISE, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A vignette darkening the edges; only where something is painted. */
export function vignette(ctx, W, H, a = 0.6) {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const R0 = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(W * 0.5, H * 0.5, R0 * 0.35, W * 0.5, H * 0.5, R0 * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(4,2,0,${a})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A square of radial gradient, for glows. */
export function radial(size, rgbs, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgbs},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

/** The soft white glow every room tints for its lights. */
export function glowCanvas() {
  return radial(128, "255,255,255", [
    [0, 0.95],
    [0.25, 0.4],
    [0.6, 0.1],
    [1, 0],
  ]);
}

export const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

/** A canvas painted on the CPU: drawn once and handed to WebGL as a plain
 *  copy, where a GPU canvas would stall to sync. */
export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
  return c;
}

/** Hand a canvas to Phaser under `key`, replacing any texture there. */
export function addCanvasTexture(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  return textures.addCanvas(key, canvas);
}

/** Remove every texture named in `keys` (an object or array of keys). */
export function releaseTextures(textures, keys) {
  for (const key of Object.values(keys)) if (textures.exists(key)) textures.remove(key);
}

/** A small seeded random generator: the same picture every time. */
export function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** A path through points ({x, y} or [x, y]), closed. */
export function polygon(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = Array.isArray(p) ? p[0] : p.x;
    const y = Array.isArray(p) ? p[1] : p.y;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
}

/** The scene's synthesized sounds: a burst of filtered noise shaped by
 *  `env(k)` over its length, quiet when the game is muted. */
export function noiseBurst(scene, { dur, type = "bandpass", freq, q = 1, gain, env }) {
  const ac = scene.sound && scene.sound.context;
  const st = scene.services && scene.services.audio && scene.services.audio.state;
  if (!ac || (st && st.muted)) return;
  const vol = st ? st.sfxVol : 0.8;
  try {
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env(i / d.length);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.value = vol * gain;
    src.connect(f);
    f.connect(g);
    g.connect(scene.sound.destination);
    src.start();
  } catch (e) {
    // no sound, then
  }
}

/** A few pure tones that ring and fade: [frequency, gain] pairs. */
export function chime(scene, tones, decay = 0.4) {
  const ac = scene.sound && scene.sound.context;
  const st = scene.services && scene.services.audio && scene.services.audio.state;
  if (!ac || (st && st.muted)) return;
  const vol = st ? st.sfxVol : 0.8;
  try {
    const t = ac.currentTime;
    for (const [f, g0] of tones) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(g0 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
      o.connect(g);
      g.connect(scene.sound.destination);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  } catch (e) {
    // no sound, then
  }
}
