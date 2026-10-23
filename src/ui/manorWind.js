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
export function loadManorWind() {
  return pending ??= Promise.all(['ashcombe-wind-background-v1.webp', 'ashcombe-wind-trees-v1.webp'].map(async name => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/images/Manor/${name}`;
    await image.decode();
    return image;
  })).then(([background, mask]) => ({ background, mask }));
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
uniform sampler2D plate, behind, matte;
uniform vec4 photo;
uniform vec2 pictureSize;
uniform float time, lean, gust, enableWeather;
varying vec2 uv;
float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 q) {
  return fract(sin(vec2(dot(q, vec2(127.1, 311.7)), dot(q, vec2(269.5, 183.3)))) * 43758.5453);
}
float noise(vec2 q) {
  vec2 i = floor(q), f = fract(q);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
vec2 treeMask(vec2 p) {
  if (any(lessThan(p, vec2(0.))) || any(greaterThan(p, vec2(1.)))) return vec2(0.);
  return texture2D(matte, p).rg;
}
vec2 wind(vec2 p) {
  float height = clamp((.86 - p.y) / .76, 0., 1.);
  float crown = pow(height, 1.32);
  float side = smoothstep(.43, .57, p.x);
  float phase = side * .85 - p.x * 1.35;
  // 60 FPS continuous bough sway + secondary branch whip + leaf cluster flutter
  float sway = lean * 8.5 + sin(time * 1.65 + phase) * (8.5 + 6.0 * lean) + sin(time * .95 - phase * .7) * 4.5;
  float flexibility = .75 + .25 * sin(p.x * 19.) * sin(p.y * 23.);
  float limb = sin(time * 3.1 + noise(p * vec2(7., 5.)) * 6.283 + phase) * (4.0 + 5.2 * gust) * flexibility;
  float bend = sway + limb;
  vec2 cell = p * vec2(70., 36.);
  float n = noise(cell), m = noise(cell + 17.3);
  float shiver = sin(time * (6.5 + 4.5 * n) + m * 6.283) * (1.3 + 2.4 * gust) * cos(m * 3.1);
  return vec2(bend * crown + shiver * sqrt(crown), 0.) / pictureSize;
}
void courtRipples(vec2 p, out vec2 uvDisp, out float waveRelief, out vec3 crestCol) {
  uvDisp = vec2(0.);
  waveRelief = 0.;
  crestCol = vec3(0.);
  if (p.y < .78) return;
  // Exact 3D Blender camera ray-plane intersection onto the z = 0 courtyard flagstones:
  float dyCam = max(.095, p.y - .68);
  float Yw = 3.337 / dyCam;
  float Xw = (p.x - .5) * 1.5 * Yw;
  float courtMask = smoothstep(22.5, 18.0, Yw) * smoothstep(6.6, 7.3, Yw) * smoothstep(4.4, 3.4, abs(Xw));
  if (courtMask < .005) return;
  float waveSum = 0.;
  float crestSum = 0.;
  vec2 gradSum = vec2(0.);
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float scale = 1.35 + fl * .36;
    vec2 g = vec2(Xw, Yw) * scale + vec2(fl * 7.13, fl * 11.7);
    vec2 cid = floor(g);
    vec2 local = fract(g) - .5;
    float rate = .92 + .26 * hash(cid + 5.1);
    float tVal = time * rate + hash(cid + 13.7) * 6.283;
    float cycle = floor(tVal);
    float age = fract(tVal);
    vec2 jit = (hash2(cid + cycle * 3.17) - .5) * .42;
    vec2 delta = local - jit;
    float r = length(delta) / .46;
    if (r < 1.) {
      float fade = (1. - age) * (1. - age * .60);
      float r0 = r - (.10 + age * .82);
      float r1 = r - (.02 + age * .54);
      float r2 = r - (age * .28);
      float w0 = sin(r0 * 28.) * exp(-r0 * r0 * 115.);
      float w1 = .72 * sin(r1 * 32.) * exp(-r1 * r1 * 145.) * step(.10, age);
      float w2 = .45 * sin(r2 * 36.) * exp(-r2 * r2 * 165.) * step(.22, age);
      float crown = 1.30 * cos(r * 18.) * exp(-r * r * 140.) * max(0., 1. - age / .24);
      float w = (w0 + w1 + w2 + crown) * fade;
      vec2 dir = delta / max(r * .46, .01);
      gradSum += dir * w;
      waveSum += w;
      float c = (pow(max(0., w0), 1.35) + .75 * pow(max(0., w1), 1.35) + .48 * pow(max(0., w2), 1.35) + 1.15 * max(0., crown)) * fade;
      crestSum = max(crestSum, c);
    }
  }
  uvDisp = gradSum * vec2(.0024, .0011) * courtMask;
  waveRelief = clamp(waveSum * .28, -.28, .32) * courtMask;
  float lanternCone = exp(-pow(Xw / 1.75, 2.)) * smoothstep(22., 7.5, Yw);
  vec3 waterTint = mix(vec3(.30, .36, .46), vec3(.95, .64, .32), lanternCone * .78);
  crestCol = waterTint * clamp(crestSum, 0., 1.) * .22 * courtMask;
}
vec3 rainStreaks(vec2 p) {
  // 3 depth layers of razor-thin (~1.2px) 60 FPS motion-blurred 3D rain filaments:
  vec2 dir = normalize(vec2(-.17, 1.));
  vec2 perp = vec2(dir.y, -dir.x);
  vec2 q = vec2((p.x - .5) * (pictureSize.x / pictureSize.y), p.y - .5);
  float uBase = dot(q, perp);
  float vBase = dot(q, dir);
  float glint = 0.;
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float cols = 135. + fl * 55.;
    float lenScale = 14.0 + fl * 4.5;
    float uScaled = uBase * cols + fl * 19.3;
    float colId = floor(uScaled);
    float u = fract(uScaled);
    float colHash = hash(vec2(colId, fl * 31.7));
    float fallRate = (.95 - fl * .18) * (.90 + .20 * colHash);
    float vScaled = (vBase - time * fallRate) * lenScale + colHash * 23.0;
    float rowId = floor(vScaled);
    float v = fract(vScaled);
    vec2 cellSeed = vec2(colId * 1.73 + rowId * 3.19, fl * 13.1 + rowId * .71);
    float dropPresent = step(.93, hash(cellSeed));
    float uCenter = .24 + .52 * hash(cellSeed + 7.3);
    float uDist = (u - uCenter) * 5.8;
    float uProfile = exp(-uDist * uDist);
    float vProfile = pow(sin(v * 3.14159), 1.55) * (1.22 - .45 * v);
    glint += dropPresent * uProfile * vProfile * (.58 - fl * .12);
  }
  float dLantern = length((p - vec2(.5, .652)) * vec2(1.8, 1.));
  float dWinC = length((p - vec2(.5, .463)) * vec2(1.8, 1.));
  float dWinL = length((p - vec2(.275, .664)) * vec2(2.2, 1.2));
  float dWinR = length((p - vec2(.725, .664)) * vec2(2.2, 1.2));
  float warm = clamp(exp(-dLantern * 6.5) + .7 * exp(-dWinC * 6.) + .55 * (exp(-dWinL * 7.) + exp(-dWinR * 7.)), 0., 1.);
  vec3 rainCol = mix(vec3(.56, .68, .88), vec3(1., .72, .38), warm);
  return rainCol * glint * .17;
}
void main() {
  vec2 p = (uv - photo.xy) / photo.zw;
  if (any(lessThan(p, vec2(0.))) || any(greaterThan(p, vec2(1.)))) {
    gl_FragColor = vec4(texture2D(plate, uv).rgb, 1.);
    return;
  }
  vec2 at = p;
  for (int i = 0; i < 3; i++) at = p - wind(at);
  vec2 oldMask = treeMask(p), newMask = treeMask(at);
  float before = clamp(oldMask.r + oldMask.g, 0., 1.);
  float after = clamp(newMask.r + newMask.g, 0., 1.);
  vec3 color;
  if (before + after < .001) {
    vec2 uvSample = uv;
    float waveRelief = 0.;
    vec3 crestLight = vec3(0.);
    if (enableWeather > .5) {
      vec2 rDisp;
      courtRipples(p, rDisp, waveRelief, crestLight);
      uvSample = clamp(uv + rDisp * photo.zw, photo.xy, photo.xy + photo.zw);
    }
    color = texture2D(plate, uvSample).rgb * (1. + waveRelief) + crestLight;
  } else {
    vec2 shifted = clamp(photo.xy + at * photo.zw, photo.xy, photo.xy + photo.zw);
    vec3 background = texture2D(behind, uv).rgb;
    vec3 tree = texture2D(plate, shifted).rgb - texture2D(behind, shifted).rgb * (1. - after);
    color = tree + background * (1. - after);
  }
  if (enableWeather > .5) {
    color += rainStreaks(p);
  }
  gl_FragColor = vec4(color, 1.);
}`;

/** An optional WebGL layer; the caller retains its still image on failure. */
export function createManorWind({ source, background, mask, photo, weather = false, onFailure }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'start-painting start-foliage';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = source.width; canvas.height = source.height;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const textures = [], shaders = [];
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
    [source, background, mask].forEach((image, index) => {
      const texture = gl.createTexture();
      textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(gl.getUniformLocation(program, ['plate','behind','matte'][index]), index);
    });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4f(gl.getUniformLocation(program, 'photo'), photo.left / source.width, photo.top / source.height, photo.width / source.width, photo.height / source.height);
    gl.uniform2f(gl.getUniformLocation(program, 'pictureSize'), mask.naturalWidth || mask.width, mask.naturalHeight || mask.height);
    gl.uniform1f(gl.getUniformLocation(program, 'enableWeather'), weather ? 1 : 0);
    const clock = gl.getUniformLocation(program, 'time'), leaning = gl.getUniformLocation(program, 'lean'), gusting = gl.getUniformLocation(program, 'gust');
    return { canvas, dispose, draw(time, lean = 0.6, gust = 0.6) {
      if (disposed || gl.isContextLost()) return;
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
