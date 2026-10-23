// Rain falling at night, as the eye sees it. Each drop is drawn out by its
// speed into a streak, brightest at its head: fine, faint and many far off;
// longer, brighter and fewer close to; a very few right before the eye,
// broad and soft. All of it leans with a wind that is never quite steady
// and now and then gusts. It is seen only by the light it falls through —
// warm round a lantern or a lit window, cold against the sky, hardly there
// in the dark — and it comes in sheets, heavier and lighter by turns. Where
// it lands on wet ground each drop rings the water, the ring bending the
// reflections lying in it, and throws up a little spray.
//
// Drawn with WebGL on a canvas of its own, the size of the picture it falls
// over (`source`), which lights it and holds the reflections the rings bend.
// Returns null where WebGL cannot be had: the caller keeps its own rain.

const STREAK_VERTEX = `
attribute vec2 position;
attribute vec2 local;
attribute float alpha;
uniform vec2 size;
varying vec2 vLocal;
varying float vAlpha;
varying vec2 vAt;
void main() {
  vLocal = local; vAlpha = alpha; vAt = position / size;
  vec2 clip = position / size * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const STREAK_FRAGMENT = `
precision mediump float;
uniform sampler2D light;
uniform vec3 tint;
uniform float gain;
varying vec2 vLocal;
varying float vAlpha;
varying vec2 vAt;
void main() {
  float across = exp(-vLocal.x * vLocal.x * 2.6);
  float along = smoothstep(0.0, 0.6, vLocal.y) * (1.0 - smoothstep(0.95, 1.0, vLocal.y));
  float a = min(1.0, across * along * vAlpha);
  // the rain's own grey in the dark; where there is light about, brighter,
  // and the colour of that light
  vec3 lit = texture2D(light, vAt).rgb;
  float lum = dot(lit, vec3(0.3, 0.59, 0.11));
  vec3 hue = lit / max(0.001, max(lit.r, max(lit.g, lit.b)));
  vec3 c = mix(tint, hue, smoothstep(0.08, 0.35, lum)) * min(1.0, 0.55 + lum * gain);
  gl_FragColor = vec4(c * a, a);
}`;

const RING_VERTEX = `
attribute vec2 position;
attribute vec2 centre;
attribute vec3 info;
uniform vec2 size;
varying vec2 vPos;
varying vec2 vCentre;
varying vec3 vInfo;
void main() {
  vPos = position; vCentre = centre; vInfo = info;
  vec2 clip = position / size * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

// a ring on the water: how far out it has gone (info.x, 0 to 1), how far it
// will go (info.y, pixels), how flat the ground lies seen from here (info.z)
const RING_FRAGMENT = `
precision mediump float;
uniform sampler2D photo;
uniform sampler2D ground;
uniform vec2 screen; // (the vertex shader size, at this shader precision)
uniform vec3 sky;
varying vec2 vPos;
varying vec2 vCentre;
varying vec3 vInfo;
void main() {
  vec2 q = (vPos - vCentre) / vec2(1.0, vInfo.z);
  float r = length(q);
  float d = r / vInfo.y;
  float age = vInfo.x, fade = (1.0 - age) * (1.0 - age);
  float x = (d - age) * 8.0;
  float env = (exp(-x * x * 1.4) + 0.5 * exp(-(x + 2.4) * (x + 2.4) * 1.4)) * fade * (1.0 - smoothstep(0.85, 1.0, d));
  if (env < 0.004) discard;
  float slope = (-2.0 * x * exp(-x * x) - (x + 2.4) * exp(-(x + 2.4) * (x + 2.4))) * fade;
  vec2 dir = q / max(r, 0.001);
  vec2 bend = dir * vec2(1.0, vInfo.z) * slope * vInfo.y * 0.14;
  float m = texture2D(ground, vPos / screen).a;
  vec3 seen = texture2D(photo, clamp((vPos + bend) / screen, 0.001, 0.999)).rgb;
  // the side of the ring tipped toward the sky catches it
  seen += sky * max(0.0, -dir.y) * max(0.0, slope) * 0.6;
  float a = m * min(1.0, env * 1.6);
  gl_FragColor = vec4(seen * a, a);
}`;

function program(gl, vertex, fragment) {
  const make = (type, code) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Rain shader could not compile: ${gl.getShaderInfoLog(shader)}`);
    return shader;
  };
  const p = gl.createProgram(), v = make(gl.VERTEX_SHADER, vertex), f = make(gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  gl.deleteShader(v); gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Rain shader could not link: ${gl.getProgramInfoLog(p)}`);
  return p;
}

function surface(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

// the light each part of the picture would throw on rain falling through it:
// the picture, much blurred
function lightOf(source) {
  let c = source;
  for (const k of [4, 8, 16, 32]) {
    const next = surface(source.width / k, source.height / k), g = next.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(c, 0, 0, next.width, next.height);
    c = next;
  }
  const out = surface(source.width / 12, source.height / 12), g = out.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(c, 0, 0, out.width, out.height);
  return out;
}

const LAYERS = [
  // how many (for a 16:9 picture), speed (picture heights a second),
  // streak width (pixels at 1080 high), how bright, where it lands
  { n: 900, speed: [0.62, 0.78], width: 0.7, alpha: [0.45, 0.8], lands: "far" },
  { n: 320, speed: [1.1, 1.38], width: 1.0, alpha: [0.55, 0.9], lands: "ground" },
  { n: 70, speed: [1.9, 2.4], width: 1.7, alpha: [0.5, 0.75], lands: "below" },
  { n: 6, speed: [3.0, 3.4], width: 6.5, alpha: [0.13, 0.2], lands: "below" },
];
const SHUTTER = 1 / 42; // how long the eye holds a drop: its streak's length

/**
 * width, height  the canvas, in pixels (the picture's own)
 * source         the picture the rain falls over
 * ground         a polygon of wet ground, [[x, y], ...], where drops ring the water
 * horizon        how far down the picture the far rain lands (pixels)
 * density        how heavy the rain is
 * pace           how fast it falls (1: as fast as rain falls; slower, its
 *                streaks a little shorter too, but still rain's)
 * still          a picture of it, not moving
 */
export function createRainFall({ width: W, height: H, source, ground = null, horizon = H * 0.8, density = 1, pace = 1, wind = 0.13, seed = 1 }) {
  const canvas = surface(W, H);
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  let state = seed >>> 0 || 1;
  const random = () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rand = (a, z) => a + random() * (z - a);
  const px = H / 1080, k = (W / H / (16 / 9)) * density;
  const owned = [];
  let streaks, rings, buffers;
  try {
    streaks = program(gl, STREAK_VERTEX, STREAK_FRAGMENT);
    rings = program(gl, RING_VERTEX, RING_FRAGMENT);
    owned.push(() => gl.deleteProgram(streaks), () => gl.deleteProgram(rings));
  } catch {
    for (const free of owned) free();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  // the wet ground, as a picture: where the rings may be
  const mask = surface(W / 2, H / 2);
  if (ground) {
    const g = mask.getContext("2d");
    g.scale(0.5, 0.5);
    g.filter = "blur(6px)";
    g.fillStyle = "#fff"; g.beginPath();
    ground.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath(); g.fill();
  }
  const look = mask.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, mask.width, mask.height).data;
  const wetAt = (x, y) => {
    const i = ((y / 2) | 0) * mask.width + ((x / 2) | 0);
    return x >= 0 && y >= 0 && x < W && y < H ? look[i * 4 + 3] / 255 : 0;
  };
  // (each bound to its unit for good, and let go of with the rest)
  [lightOf(source), source, mask].forEach((image, unit) => {
    const t = gl.createTexture();
    owned.push(() => gl.deleteTexture(t));
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
  buffers = [gl.createBuffer(), gl.createBuffer()];
  owned.push(() => buffers.forEach((b) => gl.deleteBuffer(b)));
  gl.useProgram(streaks);
  gl.uniform1i(gl.getUniformLocation(streaks, "light"), 0);
  gl.uniform2f(gl.getUniformLocation(streaks, "size"), W, H);
  gl.uniform3f(gl.getUniformLocation(streaks, "tint"), 0.76, 0.82, 0.92);
  gl.uniform1f(gl.getUniformLocation(streaks, "gain"), 3.2);
  gl.useProgram(rings);
  gl.uniform1i(gl.getUniformLocation(rings, "photo"), 1);
  gl.uniform1i(gl.getUniformLocation(rings, "ground"), 2);
  gl.uniform2f(gl.getUniformLocation(rings, "size"), W, H);
  gl.uniform2f(gl.getUniformLocation(rings, "screen"), W, H);
  gl.uniform3f(gl.getUniformLocation(rings, "sky"), 0.16, 0.19, 0.25);
  const at = (p, name) => gl.getAttribLocation(p, name);
  const streakAttrs = [[at(streaks, "position"), 2, 0], [at(streaks, "local"), 2, 2], [at(streaks, "alpha"), 1, 4]];
  const ringAttrs = [[at(rings, "position"), 2, 0], [at(rings, "centre"), 2, 2], [at(rings, "info"), 3, 4]];

  // the drops
  const lowest = (kind) => (kind === "far" ? horizon + rand(-0.025, 0.035) * H : kind === "ground" ? rand(horizon, H * 1.02) : H + 60 * px);
  const drops = LAYERS.flatMap((L, layer) => Array.from({ length: Math.max(1, Math.round(L.n * k)) }, () => {
    const d = { layer, speed: rand(...L.speed) * H, alpha: rand(...L.alpha), x: rand(-0.15, 1.05) * W, y: rand(-0.1, 1) * H, floor: 0 };
    d.floor = lowest(L.lands);
    return d;
  }));
  const spray = [], ringsLive = [];
  const MAX_RINGS = 90;
  const ring = (x, y) => {
    if (ringsLive.length >= MAX_RINGS) return;
    const depth = Math.max(0, Math.min(1, (y - horizon) / Math.max(1, H - horizon)));
    const reach = (7 + 20 * depth) * px * rand(0.75, 1.25);
    ringsLive.push({ x, y, reach, flat: 0.2 + 0.22 * depth, age: 0, life: rand(0.45, 0.75) });
    // the spray thrown up
    if (spray.length < 160) for (let i = 0; i < 2; i++) spray.push({ x, y, vx: rand(-1, 1) * (30 + 50 * depth) * px, vy: -rand(70, 150) * (0.5 + depth) * px, age: 0, life: rand(0.16, 0.3), floor: y + rand(0, 3) * px });
  };

  // the wind, never quite steady; and the sheets the rain comes in
  // (and whatever wind the scene round it has: setWind)
  let clock = rand(0, 100), gust = 0, gustAt = rand(4, 10), outside = 0;
  const windNow = () => wind + 0.045 * Math.sin(clock * 0.21) + 0.025 * Math.sin(clock * 0.57 + 1.3) + gust + outside;
  const sheet = (x) => 0.76 + 0.24 * Math.sin(x * 0.0042 / px - clock * 0.85 + 2 * Math.sin(x * 0.0011 / px + clock * 0.23));

  const streakData = new Float32Array((drops.length + 200) * 6 * 5);
  const ringData = new Float32Array(MAX_RINGS * 6 * 7);
  // one streak: its head at (x, y), going (dx, dy), `len` long, `w` across
  // (one too thin to draw cleanly is drawn a little wider, and fainter)
  let sn = 0;
  const vertex = (x, y, across, along, alpha) => {
    streakData[sn] = x; streakData[sn + 1] = y; streakData[sn + 2] = across; streakData[sn + 3] = along; streakData[sn + 4] = alpha;
    sn += 5;
  };
  const quad = (x, y, dx, dy, len, w, a) => {
    const wq = Math.max(1.15, w), alpha = a * Math.sqrt(Math.min(1, w / 1.15)), nx = -dy * wq, ny = dx * wq;
    const tx = x - dx * len, ty = y - dy * len;
    vertex(tx + nx, ty + ny, 1, 0, alpha); vertex(tx - nx, ty - ny, -1, 0, alpha); vertex(x + nx, y + ny, 1, 1, alpha);
    vertex(x + nx, y + ny, 1, 1, alpha); vertex(tx - nx, ty - ny, -1, 0, alpha); vertex(x - nx, y - ny, -1, 1, alpha);
  };

  const advance = (dt) => {
    if (dt <= 0) return;
    clock += dt;
    gustAt -= dt;
    if (gustAt <= 0) { gust = rand(0.04, 0.09); gustAt = rand(7, 15); }
    gust *= Math.exp(-dt / 1.8);
    const w = windNow();
    for (const d of drops) {
      d.y += d.speed * pace * dt; d.x += d.speed * pace * w * dt;
      if (d.y > d.floor) {
        const L = LAYERS[d.layer];
        if (L.lands !== "below" && random() < (L.lands === "far" ? 0.04 : 0.32) && wetAt(d.x, d.floor) > 0.5) ring(d.x, d.floor);
        d.y = rand(-0.12, -0.01) * H; d.x = rand(-0.2, 1.02) * W - d.y * w; d.floor = lowest(L.lands);
      }
    }
    for (const s of spray) { s.age += dt; s.vy += 1500 * px * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
    for (let i = spray.length - 1; i >= 0; i--) if (spray[i].age > spray[i].life || spray[i].y > spray[i].floor + 2 * px) spray.splice(i, 1);
    for (const r of ringsLive) r.age += dt;
    for (let i = ringsLive.length - 1; i >= 0; i--) if (ringsLive[i].age > ringsLive[i].life) ringsLive.splice(i, 1);
  };

  const draw = () => {
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // the rings, under the rain
    if (ringsLive.length) {
      let n = 0;
      for (const r of ringsLive) {
        const hw = r.reach * 1.05, hh = r.reach * r.flat * 1.05, info = [r.age / r.life, r.reach, r.flat];
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]]) { ringData.set([r.x + sx * hw, r.y + sy * hh, r.x, r.y, ...info], n); n += 7; }
      }
      gl.useProgram(rings);
      bind(buffers[1], ringData.subarray(0, n), ringAttrs, 7);
      gl.drawArrays(gl.TRIANGLES, 0, n / 7);
    }
    // the streaks
    sn = 0;
    const w = windNow(), dl = Math.hypot(w, 1), dx = w / dl, dy = 1 / dl;
    for (const d of drops) {
      const L = LAYERS[d.layer], len = d.speed * SHUTTER * (0.5 + 0.5 * pace) * (d.layer === 3 ? 1.6 : 1);
      if (d.y < -len) continue;
      quad(d.x, d.y, dx, dy, len, L.width * px, d.alpha * sheet(d.x));
    }
    for (const s of spray) {
      const v = Math.hypot(s.vx, s.vy) || 1;
      quad(s.x, s.y, s.vx / v, s.vy / v, 1.5 * px + v * SHUTTER * 0.6, 0.7 * px, 0.55 * (1 - s.age / s.life));
    }
    gl.useProgram(streaks);
    bind(buffers[0], streakData.subarray(0, sn), streakAttrs, 5);
    gl.drawArrays(gl.TRIANGLES, 0, sn / 5);
  };
  const bind = (buffer, data, attrs, stride) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    for (const [loc] of [...streakAttrs, ...ringAttrs]) if (loc >= 0) gl.disableVertexAttribArray(loc);
    for (const [loc, size, offset] of attrs) {
      if (loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
    }
  };

  // a few seconds of it already falling: rings out on the water
  for (let i = 0; i < 30; i++) advance(1 / 30);
  draw();
  let disposed = false;
  return {
    canvas,
    advance(dt) { if (!disposed) advance(Math.min(0.05, dt)); },
    draw() { if (!disposed) draw(); },
    /** More lean (or less) from the wind of the scene it falls in. */
    setWind(extra) { outside = extra; },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const free of owned.reverse()) free();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
