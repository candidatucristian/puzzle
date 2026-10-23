// The wind in the real Blender trees. Their antialiased matte identifies
// every twig and leaf; a second Blender render supplies what they uncover.
// The facade, gates and sky are sampled in place, so only the trees move.

/** The wind over the park, `t` seconds in: a breeze that never quite
 *  settles, and every so often a gust that comes through, bends everything
 *  and goes. About 0.3 at its quietest, nearly 2 at a gust's height; the
 *  trees, the leaves it tears off, the fog and the rain all go by it. */
export function windAt(t) {
  const pulse = (period, offset, sharpness) => Math.max(0, Math.sin(((t + offset) / period) * Math.PI * 2)) ** sharpness;
  return 0.55 + 0.16 * Math.sin(t * 0.27) + 0.1 * Math.sin(t * 0.61 + 1.7) + 0.75 * pulse(13, 0, 6) + 0.45 * pulse(8.5, 3.1, 8);
}

let pending;
const STORM_FRAME_COUNT = 8;
export function loadManorWind() {
  const names = [
    'ashcombe-wind-background-v1.webp',
    'ashcombe-wind-trees-v1.webp',
    ...Array.from({ length: STORM_FRAME_COUNT }, (_, i) => `ashcombe-wind-storm-${i}.webp`),
  ];
  return pending ??= Promise.all(names.map(async name => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/images/Manor/${name}`;
    await image.decode();
    return image;
  })).then(([background, mask, ...frames]) => ({ background, mask, frames }));
}

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
  gl_Position = vec4(position, 0., 1.);
}`;
const FRAGMENT = `
precision highp float;
uniform sampler2D plate, behind, matte, plateNext;
uniform vec4 photo;
uniform vec2 pictureSize;
uniform float time, lean, gust, frameMix, hasStormFrames;
varying vec2 uv;
float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 q) {
  vec2 i = floor(q), f = fract(q);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
vec2 treeMask(vec2 p) {
  if (any(lessThan(p, vec2(0.))) || any(greaterThan(p, vec2(1.)))) return vec2(0.);
  return texture2D(matte, p).rg;
}
vec2 wind(vec2 p, float scale) {
  float height = clamp((.86 - p.y) / .76, 0., 1.);
  float crown = pow(height, 1.35);
  float side = smoothstep(.43, .57, p.x);
  float phase = side * .55;
  float sway = lean * 20. + sin(time * .85 + phase) * (2.5 + 4. * lean);
  float flexibility = .7 + .3 * sin(p.x * 19.) * sin(p.y * 23.);
  float limb = sin(time * 1.6 + noise(p * vec2(7., 5.)) * 6.283 + phase) * (1.5 + 4. * gust) * flexibility;
  float bend = sway + limb;
  vec2 cell = p * vec2(70., 36.);
  float n = noise(cell), m = noise(cell + 17.3);
  float shiver = sin(time * (5. + 4. * n) + m * 6.283) * (.5 + 1.8 * gust) * cos(m * 3.1);
  return vec2((bend * crown + shiver * sqrt(crown)) * scale, 0.) / pictureSize;
}
void main() {
  if (hasStormFrames > .5) {
    float s = frameMix * frameMix * (3. - 2. * frameMix);
    vec3 f0 = texture2D(plate, uv).rgb;
    vec3 f1 = texture2D(plateNext, uv).rgb;
    gl_FragColor = vec4(mix(f0, f1, s), 1.);
    return;
  }
  vec3 original = texture2D(plate, uv).rgb;
  vec2 p = (uv - photo.xy) / photo.zw;
  vec2 at = p;
  for (int i = 0; i < 3; i++) at = p - wind(at, 1.);
  vec2 oldMask = treeMask(p), newMask = treeMask(at);
  float before = clamp(oldMask.r + oldMask.g, 0., 1.);
  float after = clamp(newMask.r + newMask.g, 0., 1.);
  if (before + after < .001) {
    gl_FragColor = vec4(original, 1.);
    return;
  }
  vec2 shifted = photo.xy + at * photo.zw;
  vec3 background = texture2D(behind, uv).rgb;
  vec3 tree = texture2D(plate, shifted).rgb - texture2D(behind, shifted).rgb * (1. - after);
  gl_FragColor = vec4(tree + background * (1. - after), 1.);
}`;

/** An optional WebGL layer; the caller retains its still image on failure. */
export function createManorWind({ source, background, mask, photo, frames, onFailure }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'start-painting start-foliage';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = source.width; canvas.height = source.height;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const textures = [], shaders = [], frameTextures = [];
  let program, buffer, disposed = false;
  const lost = event => { event.preventDefault(); if (!disposed) onFailure?.(); };
  canvas.addEventListener('webglcontextlost', lost);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener('webglcontextlost', lost);
    for (const texture of textures) gl.deleteTexture(texture);
    for (const shader of shaders) gl.deleteShader(shader);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  };
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const makeTex = image => {
      const texture = gl.createTexture();
      textures.push(texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      return texture;
    };
    [source, background, mask].forEach((image, index) => {
      gl.activeTexture(gl.TEXTURE0 + index);
      makeTex(image);
      gl.uniform1i(gl.getUniformLocation(program, ['plate','behind','matte'][index]), index);
    });
    const useStorm = Array.isArray(frames) && frames.length >= 2;
    if (useStorm) {
      for (const frameCanvas of frames) frameTextures.push(makeTex(frameCanvas));
    }
    gl.uniform1i(gl.getUniformLocation(program, 'plateNext'), 3);
    gl.uniform1f(gl.getUniformLocation(program, 'hasStormFrames'), useStorm ? 1 : 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4f(gl.getUniformLocation(program, 'photo'), photo.left / source.width, photo.top / source.height, photo.width / source.width, photo.height / source.height);
    gl.uniform2f(gl.getUniformLocation(program, 'pictureSize'), mask.naturalWidth || mask.width, mask.naturalHeight || mask.height);
    const clock = gl.getUniformLocation(program, 'time'), leaning = gl.getUniformLocation(program, 'lean'), gusting = gl.getUniformLocation(program, 'gust'), mixing = gl.getUniformLocation(program, 'frameMix');
    return { canvas, dispose, draw(time, lean = 0.6, gust = 0.6) {
      if (disposed || gl.isContextLost()) return;
      if (useStorm) {
        const n = frameTextures.length;
        const pos = (((time * 1.65) % n) + n) % n;
        const i0 = Math.floor(pos), i1 = (i0 + 1) % n;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, frameTextures[i0]);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, frameTextures[i1]);
        gl.uniform1f(mixing, pos - i0);
      }
      gl.uniform1f(clock, time);
      gl.uniform1f(leaning, lean);
      gl.uniform1f(gusting, gust);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } };
  } catch {
    dispose();
    return null;
  }
}
