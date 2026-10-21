// Rain on a window's glass, as it is on a night of steady rain. The glass is
// misted with drops too fine to be seen one by one, which blur what is beyond
// it and catch a little of its light; over the mist, beads of water, each a
// small lens that shows the night behind it tiny and upside down, dark at its
// rim. The rain keeps landing: on the mist, on the beads, which grow. Beads
// that touch run together, and one grown heavy enough runs — stopping,
// starting, wandering a little, keener to go where the glass is already wet —
// gathering the beads in its way, and leaving behind it a clear track through
// the mist, strung with a few small beads, that slowly mists over again.
//
// Drawn with WebGL on a canvas of its own; where WebGL cannot be had, the
// beads alone are drawn, as cut-out lenses of the picture, on a 2D canvas.
// What shows that canvas over the window is the caller's: a DOM element
// (ui/windowRain.js) or a Phaser texture (phaserRain.js).
//
// Everything is measured in the caller's units across the window (`width` x
// `height`): the panes, what stands in front of the glass, and `drop`, how
// large the beads look there (1 for a window about 700 units across).

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function surface(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width)); canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

function trace(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// Each pane, with what stands in front of the glass cut out of it: as a
// picture (`scale` pixels to the unit), and as which pane each unit is in.
function drawGlass(ctx, scale, { panes, cutouts, bars }, paneColor) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  panes.forEach((points, i) => { ctx.fillStyle = paneColor(i); trace(ctx, points); ctx.fill(); });
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = ctx.strokeStyle = "#000";
  for (const points of cutouts) { trace(ctx, points); ctx.fill(); }
  ctx.lineCap = "round";
  for (const { points, width } of bars) {
    ctx.lineWidth = width; ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

// A bead of water as the shader reads it: its surface's slope across and
// down (red, green), how deep the water is (blue), how much bead there is
// (alpha). On upright glass a bead sags, steeper and fuller at its foot.
// Drawn at a few sizes, so that a small one is never a large one squeezed.
const LENS_SIZES = [8, 16, 32, 64, 128];
function lensStamps() {
  return LENS_SIZES.map((size) => {
    const c = surface(size, size), g = c.getContext("2d"), image = g.createImageData(size, size), px = image.data;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const dx = ((i + 0.5) / size) * 2 - 1, dy = ((j + 0.5) / size) * 2 - 1, d = Math.hypot(dx, dy);
      if (d >= 1) continue;
      const R = 1.27 * (1 - 0.14 * dy), base = Math.sqrt(Math.max(0, R * R - 1));
      const k = (j * size + i) * 4;
      px[k] = 128 + (dx / R) * 127;
      px[k + 1] = 128 + (dy / R) * 127;
      px[k + 2] = ((Math.sqrt(R * R - d * d) - base) / (R - base)) * 255;
      px[k + 3] = (1 - smooth(size < 16 ? 0.62 : 0.8, 1, d)) * 255;
    }
    g.putImageData(image, 0, 0);
    return c;
  });
}

function softDisc(inner = 0) {
  const c = surface(64, 64), g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  if (inner) r.addColorStop(inner, "rgba(255,255,255,1)");
  r.addColorStop(inner ? (inner + 1) / 2 : 0.5, "rgba(255,255,255,.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return c;
}

// ── the water ────────────────────────────────────────────────────────────────

function waterOnGlass(W, H, scale, glass, { drop: s, density, random }) {
  const rand = (a, z) => a + random() * (z - a);
  // which pane each unit is in (0: none)
  const lookW = Math.ceil(W), lookH = Math.ceil(H), look = surface(lookW, lookH), lc = look.getContext("2d", { willReadFrequently: true });
  drawGlass(lc, 1, glass, (i) => `rgb(${(i + 1) * 8},0,0)`);
  const lookData = lc.getImageData(0, 0, lookW, lookH).data;
  const paneAt = (x, y) => {
    const xi = x | 0, yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= lookW || yi >= lookH) return 0;
    const k = (yi * lookW + xi) * 4;
    return lookData[k + 3] > 160 ? Math.round(lookData[k] / 8) : 0;
  };
  const spot = () => {
    for (let tries = 0; tries < 16; tries++) {
      const x = random() * W, y = random() * H, pane = paneAt(x, y);
      if (pane) return { x, y, pane };
    }
    return null;
  };
  let area = 0;
  for (let k = 3; k < lookData.length; k += 4) if (lookData[k] > 160) area++;
  const cap = Math.round(Math.min(600, (area / (s * s)) * 9e-4 * density));
  const hitRate = cap * 0.38;
  const slideAt = () => rand(2.0, 2.8) * s;

  // the persistent pictures: the small beads left along tracks (and gathered
  // at the foot of a pane), and the mist
  const fw = Math.ceil(W * scale), fh = Math.ceil(H * scale);
  const field = surface(fw, fh), tracks = surface(fw, fh), mist = surface(fw / 2, fh / 2);
  const g = field.getContext("2d"), wet = tracks.getContext("2d"), fog = mist.getContext("2d");
  const lenses = lensStamps(), eraser = softDisc(0.45), puff = softDisc();
  const lens = (ctx, k, x, y, rx, ry, alpha = 1) => {
    const px = Math.max(rx, ry) * 2 * k;
    const stamp = lenses.find((c) => c.width >= px) || lenses[lenses.length - 1];
    ctx.globalAlpha = alpha;
    ctx.drawImage(stamp, (x - rx) * k, (y - ry) * k, rx * 2 * k, ry * 2 * k);
  };
  const disc = (ctx, image, k, x, y, r, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, (x - r) * k, (y - r) * k, r * 2 * k, r * 2 * k);
  };

  // the mist: not quite even — thinner here and there
  fog.fillStyle = "#fff"; fog.fillRect(0, 0, mist.width, mist.height);
  fog.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 28; i++) disc(fog, puff, scale / 2, random() * W, random() * H, rand(18, 70) * s, rand(0.1, 0.3));
  fog.globalCompositeOperation = "source-over";
  fog.globalAlpha = 1;

  // where the glass has been wet lately, which a running drop would rather follow
  const cell = 3 * s, gw = Math.ceil(W / cell) + 1, gh = Math.ceil(H / cell) + 1, wetness = new Float32Array(gw * gh);
  const wetAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : wetness[((y / cell) | 0) * gw + ((x / cell) | 0)]);
  // the beads, kept by where they are, to find which touch
  const bin = 7 * s, bw = Math.ceil(W / bin) + 1, bh = Math.ceil(H / bin) + 1, bins = Array.from({ length: bw * bh }, () => []);

  const drops = [];
  const bead = (at, r, age = 4) => ({ ...at, r, age, sliding: false, slide: slideAt(), v: 0, vx: 0, drift: 0, turn: 0, wait: 0, travelled: 0, gap: rand(2.5, 7) * s, sag: rand(1, 1.14), dead: false, path: null });
  for (let i = 0; i < cap * 0.86; i++) {
    const at = spot();
    if (!at) break;
    const r = random() < 0.05 ? rand(2.1, 3) * s : (0.35 + 1.3 * random() ** 2.2) * s;
    drops.push(bead(at, r));
  }

  const residue = [];
  let drying = 0, misting = 0;

  const merge = (a, b) => {
    // the smaller runs into the larger; a running drop keeps its way
    const [big, small] = b.sliding && !a.sliding ? [b, a] : a.sliding && !b.sliding ? [a, b] : a.r >= b.r ? [a, b] : [b, a];
    const A = big.r * big.r + small.r * small.r;
    if (!big.sliding) {
      big.x = (big.x * big.r * big.r + small.x * small.r * small.r) / A;
      big.y = Math.max(big.y, (big.y * big.r * big.r + small.y * small.r * small.r) / A);
    }
    big.r = Math.min(4.6 * s, Math.sqrt(A));
    big.age = Math.max(big.age, small.age);
    small.dead = true;
  };

  const advance = (dt) => {
    if (dt <= 0) return;
    // the rain landing: on a bead it is taken in, on bare glass it is a new one
    for (let n = poisson(hitRate * dt, random); n > 0; n--) {
      const at = spot();
      if (!at) continue;
      const rh = rand(0.3, 0.75) * s;
      const near = touching(at.x, at.y, rh);
      if (near) { near.r = Math.min(4.6 * s, Math.sqrt(near.r * near.r + rh * rh * 0.9)); continue; }
      if (drops.length < cap) { drops.push(bead(at, rh, 0)); continue; }
      // the glass as full as it holds: what lands runs into a bead already there
      const into = drops[(random() * drops.length) | 0];
      if (!into.dead && !into.sliding && random() < 0.5) into.r = Math.min(4.6 * s, Math.sqrt(into.r * into.r + rh * rh * 0.9));
    }
    // the mist, gathering again on the glass
    misting += dt * ((area / (s * s)) / (254 * 9));
    fog.globalCompositeOperation = "source-over";
    for (; misting >= 1; misting--) disc(fog, puff, scale / 2, random() * W, random() * H, rand(6, 13) * s, rand(0.22, 0.4));

    for (const d of drops) {
      d.age += dt;
      if (!d.sliding && d.r > d.slide) { d.sliding = true; d.v = 0; d.wait = rand(0, 0.4); d.turn = 0; }
      if (!d.sliding) continue;
      const x0 = d.x, y0 = d.y;
      if (d.wait > 0) d.wait -= dt;
      const target = d.wait > 0 ? 0 : s * Math.min(160, 14 + 55 * Math.max(0, d.r / s - 1.9) ** 1.5);
      d.v += (target - d.v) * Math.min(1, dt * (target ? 3 : 12));
      d.turn -= dt;
      if (d.turn <= 0) {
        // a little to one side or the other, rather toward the wet
        const ahead = d.y + d.r * 2.5, side = d.r * 1.6 + cell;
        const lean = wetAt(d.x + side, ahead) - wetAt(d.x - side, ahead);
        d.drift = Math.max(-0.5, Math.min(0.5, rand(-0.28, 0.28) + lean * 0.35));
        d.turn = rand(0.15, 0.9);
      }
      d.vx += (d.drift * d.v - d.vx) * Math.min(1, dt * 4);
      let x = d.x + d.vx * dt;
      const y = d.y + d.v * dt;
      if (paneAt(x, y + d.r * 0.6) !== d.pane) {
        if (paneAt(d.x, y + d.r * 0.6) !== d.pane) {
          // come to the foot of its pane: it joins the water lying along the bar
          residue.push({ x: d.x, y: d.y + d.r * 0.2, rx: d.r * 1.5, ry: d.r * 0.62, sill: true });
          d.dead = true; d.path = [x0, y0, d.x, d.y];
          continue;
        }
        x = d.x; d.drift = -d.drift; d.vx = 0;
      }
      d.x = x; d.y = y;
      const step = Math.hypot(d.x - x0, d.y - y0);
      if (step > 0) {
        d.path = [x0, y0, d.x, d.y];
        // the water it leaves on the glass as it goes: a film, and now and then a bead
        d.r = Math.max(0.5 * s, d.r - step * 0.0015);
        d.travelled += step;
        if (d.travelled > d.gap) {
          d.travelled = 0; d.gap = rand(2.5, 7) * s;
          if (random() < 0.45) {
            const r = d.r * rand(0.12, 0.22);
            d.r = Math.sqrt(Math.max(0.25 * s * s, d.r * d.r - r * r * 0.8));
            residue.push({ x: d.x + rand(-0.25, 0.25) * d.r, y: d.y - d.r * rand(1, 1.6), rx: r, ry: r * rand(1, 1.25) });
          }
        }
        for (let t = 0; t <= 1; t += 0.5) {
          const wx = x0 + (d.x - x0) * t, wy = y0 + (d.y - y0) * t;
          if (wx >= 0 && wy >= 0 && wx < W && wy < H) wetness[((wy / cell) | 0) * gw + ((wx / cell) | 0)] = 1;
        }
        // held a moment by something on the glass, now and then
        if (d.v > 5 * s && random() < dt * (d.r < d.slide * 1.25 ? 0.38 : 0.12)) d.wait = rand(0.12, 1.1);
      }
      // too little of it left to run on
      if (d.r < d.slide * 0.76) { d.sliding = false; d.v = d.vx = 0; d.slide = slideAt(); }
    }

    // beads that touch run together
    for (const list of bins) list.length = 0;
    for (const d of drops) if (!d.dead) bins[((d.y / bin) | 0) * bw + ((d.x / bin) | 0)]?.push(d);
    for (const d of drops) {
      if (d.dead) continue;
      const cx = (d.x / bin) | 0, cy = (d.y / bin) | 0;
      for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
        if (i < 0 || j < 0 || i >= bw || j >= bh) continue;
        for (const o of bins[j * bw + i]) {
          if (o === d || o.dead || d.dead || o.pane !== d.pane) continue;
          const reach = (d.r + o.r) * (d.sliding || o.sliding ? 0.95 : 0.8);
          if (Math.abs(o.x - d.x) < reach && Math.abs(o.y - d.y) < reach && Math.hypot(o.x - d.x, o.y - d.y) < reach) merge(d, o);
        }
      }
    }
    // the wet drying off, slowly
    const keep = Math.exp(-dt / 30);
    for (let i = 0; i < wetness.length; i++) wetness[i] *= keep;

    // the tracks: a running drop takes up what lies in its way, and clears the mist
    wet.globalCompositeOperation = "destination-out";
    fog.globalCompositeOperation = "destination-out";
    for (const d of drops) {
      if (!d.path) continue;
      const [x0, y0, x1, y1] = d.path;
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (d.r * 0.5)));
      for (let k = 1; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
        disc(wet, eraser, scale, x, y, d.r * 1.05, 1);
        disc(fog, eraser, scale / 2, x, y - d.r * 0.2, d.r * 1.25, 0.85);
      }
      d.path = null;
    }
    wet.globalCompositeOperation = "source-over";
    fog.globalCompositeOperation = "source-over";
    for (const b of residue) lens(wet, scale, b.x, b.y, b.rx, b.ry, b.sill ? 0.8 : 1);
    residue.length = 0;
    // and what is left there drying off, a little at a time (as 8-bit alpha
    // can be taken down)
    drying += dt;
    if (drying >= 0.5) {
      wet.globalCompositeOperation = "destination-out";
      wet.globalAlpha = 1;
      wet.fillStyle = `rgba(0,0,0,${(1 - Math.exp(-drying / 40)).toFixed(4)})`;
      wet.fillRect(0, 0, fw, fh);
      wet.globalCompositeOperation = "source-over";
      drying = 0;
    }
    wet.globalAlpha = fog.globalAlpha = 1;

    let live = 0;
    for (const d of drops) if (!d.dead) drops[live++] = d;
    drops.length = live;
  };

  const touching = (x, y, r) => {
    const cx = (x / bin) | 0, cy = (y / bin) | 0;
    for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
      if (i < 0 || j < 0 || i >= bw || j >= bh) continue;
      for (const o of bins[j * bw + i]) if (!o.dead && Math.hypot(o.x - x, o.y - y) < o.r + r) return o;
    }
    return null;
  };

  // the water as it is now, for the shader
  const compose = () => {
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, fw, fh);
    g.drawImage(tracks, 0, 0);
    for (const d of drops) {
      const grown = Math.min(1, d.age / 0.12);
      if (d.sliding && d.v > 2 * s) {
        // running: drawn out a little, with the neck of water it trails
        const stretch = 1.08 + Math.min(0.45, d.v / (120 * s));
        lens(g, scale, d.x, d.y - d.r * 0.9, d.r * 0.5, d.r * 0.85, 0.9);
        lens(g, scale, d.x, d.y + d.r * 0.08, d.r * 0.94, d.r * stretch);
      } else {
        const r = d.r * (0.55 + 0.45 * grown);
        lens(g, scale, d.x, d.y + r * (d.sag - 1) * 0.5, r, r * d.sag, grown);
      }
    }
    g.globalAlpha = 1;
  };

  // a few seconds of rain before it is first seen, so that the glass is
  // already as it has been all evening: tracks down it, some misted over
  for (let i = 0; i < 150; i++) advance(1 / 30);
  compose();

  return { field, mist, drops, advance, compose, cap };
}

function poisson(mean, random) {
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * (random() + random() + random() - 1.5) * 2));
  let n = 0, p = Math.exp(-mean), sum = p;
  const u = random();
  while (u > sum && n < 100) { n++; p *= mean / n; sum += p; }
  return n;
}

// ── the picture ──────────────────────────────────────────────────────────────

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2((position.x + 1.0) * 0.5, (1.0 - position.y) * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform sampler2D photo;
uniform sampler2D hazy;
uniform sampler2D water;
uniform sampler2D mist;
uniform sampler2D glass;
uniform vec2 reach;
uniform vec2 grain;
uniform float fogging;
uniform vec3 veil;
uniform vec3 lightDir0;
uniform vec3 lightCol0;
uniform vec3 lightDir1;
uniform vec3 lightCol1;
uniform vec2 size;
uniform float dropScale;
uniform float time;
uniform float beyond;
uniform float slant;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

// the rain falling beyond the glass, in two depths: streaks, each the eye's
// smear of one drop, brightest at its head
float falling(vec2 p) {
  float total = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float lane = max(3.0, (4.0 + fi * 3.0) * dropScale);
    float len = (40.0 + fi * 34.0) * dropScale;
    float speed = (1150.0 + fi * 800.0) * dropScale;
    vec2 q = vec2(p.x + p.y * slant, p.y);
    float column = floor(q.x / lane);
    float r = hash(vec2(column, fi + 3.1));
    float y = (q.y - time * speed * (0.8 + 0.4 * r)) / len + r * 37.0;
    float k = floor(y), f = fract(y);
    float present = step(0.8 - fi * 0.06, hash(vec2(column + fi * 17.0, k)));
    float along = smoothstep(0.08, 0.9, f) * (1.0 - smoothstep(0.93, 1.0, f));
    float x = (column + 0.2 + 0.6 * hash(vec2(k, column))) * lane;
    float across = 1.0 - smoothstep(0.0, max(0.6, (0.5 + fi * 0.4) * dropScale), abs(q.x - x));
    total += present * along * across * (0.5 + 0.5 * fi);
  }
  return total;
}

void main() {
  float m = texture2D(glass, uv).a;
  if (m < 0.004) { gl_FragColor = vec4(0.0); return; }
  vec4 w = texture2D(water, uv);
  float cover = smoothstep(0.12, 0.7, w.a);
  vec2 slope = (w.rg - 0.5) * 2.0;
  float fog = texture2D(mist, uv).a * fogging;
  vec3 sharp = texture2D(photo, uv).rgb;
  vec3 soft = texture2D(hazy, uv).rgb;
  // the misted glass: what is beyond it blurred, a little light held in it,
  // and here and there one of its finest drops catching that light
  vec3 pane = mix(sharp, soft, fog) + veil * fog;
  if (beyond > 0.0) pane += (soft * 2.4 + veil * 5.0) * falling(uv * size) * beyond * (1.0 - fog * 0.55);
  pane += (soft * 1.4 + veil * 3.0) * step(0.986, hash(floor(uv * grain))) * fog * 0.55;
  // a bead: the night behind it, small and upside down, dark round its rim,
  // a point of light on it from each light there is
  float nz = sqrt(max(0.0, 1.0 - dot(slope, slope)));
  vec2 at = clamp(uv - slope * reach, vec2(0.002), vec2(0.998));
  vec3 seen = mix(texture2D(photo, at).rgb, texture2D(hazy, at).rgb, 0.3);
  if (beyond > 0.0) seen += (texture2D(hazy, at).rgb * 2.4 + veil * 5.0) * falling(at * size) * beyond;
  float rim = smoothstep(0.3, 0.85, length(slope));
  vec3 n = vec3(slope, nz);
  vec3 bead = seen * (1.1 - rim * 0.6) * (1.0 - w.b * 0.08);
  bead += lightCol0 * 1.6 * pow(max(0.0, dot(n, lightDir0)), 28.0);
  bead += lightCol1 * 1.6 * pow(max(0.0, dot(n, lightDir1)), 40.0);
  vec3 color = mix(pane, bead, cover);
  gl_FragColor = vec4(color * m, m);
}`;

function webglRenderer(canvas, textures, uniforms) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
  if (!gl) return null;
  const owned = [];
  const release = () => { for (const free of owned.reverse()) free(); owned.length = 0; };
  const compile = (type, code) => {
    const shader = gl.createShader(type);
    owned.push(() => gl.deleteShader(shader));
    gl.shaderSource(shader, code); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Rain shader could not compile.");
    return shader;
  };
  try {
    const program = gl.createProgram();
    owned.push(() => gl.deleteProgram(program));
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Rain shader could not link.");
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    owned.push(() => gl.deleteBuffer(buffer));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const names = Object.keys(textures);
    const units = names.map((name, unit) => {
      const texture = gl.createTexture();
      owned.push(() => gl.deleteTexture(texture));
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[name]);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
      return { name, unit, texture };
    });
    for (const [name, value] of Object.entries(uniforms)) {
      const at = gl.getUniformLocation(program, name);
      if (typeof value === "number") gl.uniform1f(at, value);
      else if (value.length === 2) gl.uniform2fv(at, value);
      else gl.uniform3fv(at, value);
    }
    const clock = gl.getUniformLocation(program, "time");
    return {
      draw(changed, time) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform1f(clock, time);
        for (const { name, unit, texture } of units) {
          if (!changed.includes(name)) continue;
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, textures[name]);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
      dispose() { release(); gl.getExtension("WEBGL_lose_context")?.loseContext(); },
    };
  } catch {
    release();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
}

// Without WebGL: each bead a cut-out lens of the picture, upside down.
function canvasRenderer(canvas, W, H, source, glassMask, model) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return {
    draw() {
      const sx = source.width / W, sy = source.height / H;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      for (const d of model.drops) {
        const rx = d.r, ry = d.r * (d.sliding ? 1.3 : d.sag);
        ctx.save(); ctx.globalAlpha = Math.min(1, d.age / 0.12) * 0.85;
        ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
        ctx.translate(d.x, d.y); ctx.scale(-1, -1);
        const reach = rx * 5;
        ctx.drawImage(source, (d.x - reach) * sx, (d.y - reach) * sy, reach * 2 * sx, reach * 2 * sy, -rx, -ry, rx * 2, ry * 2);
        ctx.restore();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(glassMask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    },
    dispose() {},
  };
}

// what is beyond the glass, blurred as the mist blurs it
function blurred(source, radius) {
  let c = source;
  for (let k = 2; k <= radius; k *= 2) {
    const smaller = surface(source.width / k, source.height / k), g = smaller.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(c, 0, 0, smaller.width, smaller.height);
    c = smaller;
  }
  const out = surface(source.width, source.height), g = out.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(c, 0, 0, out.width, out.height);
  return out;
}

function averageColour(source) {
  const one = surface(1, 1), g = one.getContext("2d", { willReadFrequently: true });
  g.drawImage(source, 0, 0, 1, 1);
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
  return [r / 255, gr / 255, b / 255];
}

const unit3 = ([x, y, z]) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };

/**
 * width, height  the window, in the caller's units
 * pixels         canvas pixels to the unit (resize later with setSize)
 * source         a canvas or image of exactly what is behind the glass
 * panes          polygons of glass, [[x, y], ...]
 * cutouts        polygons standing in front of the glass
 * bars           thin things in front of it (leading): { points, width }
 * drop           how large the beads look (1: a window ~700 units across)
 * density        how many there are
 * fog            how misted the glass is (0 to 1)
 * lights         up to two { dir: [x, y, z] (x right, y down, z toward the
 *                eye), colour: [r, g, b] }, the points of light on the beads
 */
export function createRainGlass({
  width: W, height: H, pixels = 1, fieldScale, source, panes, cutouts = [], bars = [],
  drop = 1, density = 1, fog = 0.55, reach = 24, beyond = 0.5, slant = 0.06, lights, seed = 1,
}) {
  let state = seed >>> 0 || 1;
  const random = () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const glass = { panes, cutouts, bars };
  const scale = fieldScale ?? Math.max(1, Math.min(2, pixels));
  const model = waterOnGlass(W, H, scale, glass, { drop, density, random });
  // the glass, for the shader: a little softened at its edges
  const mask = surface(W * scale, H * scale), mc = mask.getContext("2d");
  drawGlass(mc, scale, glass, () => "#fff");
  const canvas = surface(W * pixels, H * pixels);
  const hazy = blurred(source, 8);
  const tone = averageColour(source);
  const [l0, l1] = lights ?? [
    { dir: [-0.42, -0.62, 0.66], colour: [0.16, 0.2, 0.26] },
    { dir: [0.55, -0.25, 0.8], colour: [0.12, 0.1, 0.08] },
  ];
  const dark = { dir: [0, 0, 1], colour: [0, 0, 0] };
  const grainSize = Math.max(0.6, drop * 0.85);
  let renderer = webglRenderer(canvas, { photo: source, hazy, water: model.field, mist: model.mist, glass: mask }, {
    reach: [(reach * drop) / W, (reach * drop) / H],
    grain: [W / grainSize, H / grainSize],
    fogging: fog,
    size: [W, H], dropScale: drop, beyond, slant,
    veil: tone.map((c) => c * 0.16 + 0.006),
    lightDir0: unit3(l0.dir), lightCol0: l0.colour,
    lightDir1: unit3((l1 ?? dark).dir), lightCol1: (l1 ?? dark).colour,
  });
  const webgl = !!renderer;
  if (!renderer) renderer = canvasRenderer(canvas, W, H, source, mask, model);
  let disposed = false, clock = 0;
  const draw = () => {
    if (disposed || !renderer) return;
    model.compose();
    renderer.draw(["water", "mist"], clock);
  };
  draw();
  return {
    canvas,
    webgl,
    /** the rain, `dt` seconds on */
    advance(dt) {
      if (disposed) return;
      model.advance(Math.min(0.05, dt));
      clock = (clock + Math.min(0.05, dt)) % 600;
    },
    draw,
    setSize(width, height) {
      if (disposed) return;
      canvas.width = Math.max(1, Math.ceil(width)); canvas.height = Math.max(1, Math.ceil(height));
      draw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer?.dispose();
      renderer = null;
    },
  };
}
