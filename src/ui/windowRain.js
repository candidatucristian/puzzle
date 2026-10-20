// Water on the study's glass, measured in the desk photograph's coordinates.
// The bars, books and ornaments are occluders, not part of the wet surface.
const WINDOW = { x: 724, y: 0, w: 716, h: 502 };
const PANES = [
  [[738, 0], [915, 0], [915, 153], [738, 159]],
  [[939, 0], [1158, 0], [1158, 151], [939, 155]],
  [[1183, 0], [1429, 0], [1429, 146], [1183, 150]],
  [[738, 185], [915, 179], [915, 480], [795, 480], [789, 450],
    [779, 438], [779, 418], [760, 401], [755, 311], [738, 309]],
  [[939, 178], [1157, 175], [1157, 484], [939, 480]],
  [[1183, 174], [1427, 168], [1427, 316], [1391, 490], [1183, 485]],
].map(points => points.map(([x, y]) => [x - WINDOW.x, y - WINDOW.y]));
const FIELD_SCALE = 1.5;

function surface(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
  return canvas;
}

function glassMask() {
  const mask = surface(WINDOW.w * FIELD_SCALE, WINDOW.h * FIELD_SCALE);
  const ctx = mask.getContext("2d");
  ctx.scale(FIELD_SCALE, FIELD_SCALE);
  ctx.fillStyle = "#fff";
  for (const points of PANES) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fill();
  }
  return mask;
}

function waterSurface() {
  const field = surface(WINDOW.w * FIELD_SCALE, WINDOW.h * FIELD_SCALE);
  const tracks = surface(field.width, field.height);
  const g = field.getContext("2d"), wet = tracks.getContext("2d");
  // A smooth cap of water. Its slope becomes the lens normal in the shader.
  const bead = surface(64, 64), b = bead.getContext("2d");
  const cap = b.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [at, alpha] of [[0, 1], [.35, .94], [.65, .73], [.85, .44], [.97, .12], [1, 0]]) {
    cap.addColorStop(at, `rgba(255,255,255,${alpha})`);
  }
  b.fillStyle = cap; b.fillRect(0, 0, 64, 64);
  const random = (a, z) => a + Math.random() * (z - a);
  const bounds = PANES.map(points => ({
    l: Math.min(...points.map(p => p[0])) + 8,
    r: Math.max(...points.map(p => p[0])) - 8,
    t: Math.min(...points.map(p => p[1])) + 5,
    b: Math.max(...points.map(p => p[1])) - 5,
  }));
  const makeDrop = (pane, runner = false, initial = false) => {
    const box = bounds[pane];
    return {
      pane, x: random(box.l, box.r), y: random(box.t, initial ? box.b : box.t + (box.b - box.t) * .6),
      r: runner ? random(1.65, 2.6) : random(.35, 1.05),
      v: 0, vx: 0, drift: random(-2, 2), turn: random(.2, 1.5),
      wait: random(.3, 5), grip: random(.8, 1.35), runner, age: initial ? 4 : 0,
    };
  };
  // Small beads stay pinned by surface tension; only a handful are heavy
  // enough to run. There is no repeating rain-strip or synchronized reset.
  const beads = Array.from({ length: 135 }, (_, i) => makeDrop(i % 6, false, true));
  const drops = Array.from({ length: 14 }, (_, i) => makeDrop(i % 6, true, true));
  let drying = 0;
  const stamp = (ctx, d, strength = 1) => {
    const stretch = 1 + Math.min(1.7, d.v / 70);
    const rx = d.r / Math.sqrt(stretch), ry = d.r * stretch;
    ctx.globalAlpha = strength * Math.min(1, d.age / 1.4);
    ctx.drawImage(bead, d.x - rx, d.y - ry, rx * 2, ry * 2);
  };
  const paint = () => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, field.width, field.height);
    g.globalAlpha = 1; g.drawImage(tracks, 0, 0);
    g.setTransform(FIELD_SCALE, 0, 0, FIELD_SCALE, 0, 0);
    for (const d of beads) stamp(g, d, .72);
    for (const d of drops) stamp(g, d);
    g.globalAlpha = 1;
  };
  const advance = dt => {
    // The thin film behind a drop evaporates slowly; it is not a glowing tail.
    // Accumulate drying: sub-byte alpha changes every frame would round to
    // zero and leave permanent trails on an 8-bit canvas.
    drying += dt;
    if (drying >= 1) {
      wet.setTransform(1, 0, 0, 1, 0, 0);
      wet.globalCompositeOperation = "destination-out";
      wet.fillStyle = `rgba(0,0,0,${1 - Math.exp(-drying / 7)})`;
      wet.fillRect(0, 0, tracks.width, tracks.height);
      wet.globalCompositeOperation = "source-over";
      drying = 0;
    }
    wet.setTransform(FIELD_SCALE, 0, 0, FIELD_SCALE, 0, 0);
    wet.lineCap = "round";
    for (const d of beads) d.age += dt;
    for (const d of drops) {
      d.age += dt; d.wait -= dt; d.turn -= dt;
      const beforeX = d.x, beforeY = d.y, box = bounds[d.pane];
      // Collection increases the weight until gravity overcomes adhesion.
      d.r = Math.min(3.15, d.r + dt * .022);
      const speed = d.wait > 0 ? 0 : Math.min(110, Math.max(8, (d.r * d.r - 1.5) * 21 / d.grip));
      d.v += (speed - d.v) * Math.min(1, dt * (speed ? 2.7 : 12));
      if (d.turn <= 0) { d.drift = random(-2.8, 2.8); d.turn = random(.25, 1.6); }
      d.vx += (d.drift - d.vx) * Math.min(1, dt * 3);
      d.x += d.vx * dt * Math.min(1, d.v / 18);
      d.y += d.v * dt;
      d.x = Math.max(box.l, Math.min(box.r, d.x));
      if (d.v > 8) {
        wet.lineWidth = Math.max(.45, d.r * .4);
        wet.strokeStyle = "rgba(255,255,255,.095)";
        wet.beginPath(); wet.moveTo(beforeX, beforeY); wet.lineTo(d.x, d.y); wet.stroke();
        // A running drop gathers the beads in its path; the empty track stays.
        for (const small of beads) {
          if (small.pane !== d.pane || small.age < 1) continue;
          if (Math.abs(small.x - d.x) < d.r + small.r && small.y >= beforeY - d.r && small.y <= d.y + d.r) {
            d.r = Math.min(3.15, Math.sqrt(d.r * d.r + small.r * small.r * .65));
            Object.assign(small, makeDrop(small.pane));
          }
        }
        d.r = Math.max(1.35, d.r - dt * .018);
        if (Math.random() < dt * .14) { d.wait = random(.25, 1.8); d.grip = random(.8, 1.35); }
      }
      if (d.y > box.b) Object.assign(d, makeDrop(d.pane, true));
    }
    // Two moving beads become one larger lens, instead of passing through.
    for (let i = 0; i < drops.length; i++) for (let j = i + 1; j < drops.length; j++) {
      const a = drops[i], c = drops[j];
      if (a.pane !== c.pane || a.age < 1 || c.age < 1 || Math.hypot(a.x - c.x, a.y - c.y) > a.r + c.r) continue;
      a.r = Math.min(3.4, Math.sqrt(a.r * a.r + c.r * c.r));
      a.y = Math.max(a.y, c.y); a.wait = 0;
      Object.assign(c, makeDrop(c.pane, true));
    }
    paint();
  };
  paint();
  return { field, beads, drops, advance };
}

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2((position.x + 1.0) * .5, (1.0 - position.y) * .5);
  gl_Position = vec4(position, 0.0, 1.0);
}`;
const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D photograph;
uniform sampler2D water;
uniform sampler2D glass;
uniform vec2 texel;
void main() {
  float h = texture2D(water, uv).a;
  float alpha = smoothstep(.018, .18, h) * texture2D(glass, uv).a;
  if (alpha < .001) { gl_FragColor = vec4(0.0); return; }
  vec2 slope = vec2(
    texture2D(water, uv + vec2(texel.x, 0.0)).a - texture2D(water, uv - vec2(texel.x, 0.0)).a,
    texture2D(water, uv + vec2(0.0, texel.y)).a - texture2D(water, uv - vec2(0.0, texel.y)).a
  );
  vec3 n = normalize(vec3(slope * 3.8, 1.0));
  // Convex water lenses bend the actual street image, including its lamps.
  vec2 bend = n.xy * vec2(7.5 / 716.0, 7.5 / 502.0);
  vec3 behind = texture2D(photograph, uv).rgb;
  vec3 refracted = texture2D(photograph, clamp(uv + bend, .001, .999)).rgb;
  float rim = pow(1.0 - n.z, 1.8);
  float moon = pow(max(0.0, dot(n, normalize(vec3(-.45, -.65, .6)))), 24.0);
  float lamp = pow(max(0.0, dot(n, normalize(vec3(.6, .3, .55)))), 32.0);
  float nearLamp = exp(-length((uv - vec2(.85, .49)) * vec2(3.0, 1.5)));
  vec3 color = mix(behind, refracted, .88) * (1.0 - rim * .3);
  color += vec3(.48, .62, .78) * moon * .20;
  color += vec3(1.0, .73, .4) * lamp * nearLamp * .24;
  // Premultiplied output keeps the edges clear on a transparent canvas.
  gl_FragColor = vec4(color * alpha, alpha);
}`;

function refractingRenderer(canvas, source, mask, field) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
  if (!gl) return null;
  const owned = [];
  const dispose = () => { for (const release of owned.reverse()) release(); };
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
    const textures = [source, field, mask].map((image, unit) => {
      const texture = gl.createTexture();
      owned.push(() => gl.deleteTexture(texture));
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      for (const parameter of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, parameter, gl.CLAMP_TO_EDGE);
      for (const parameter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, parameter, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(gl.getUniformLocation(program, ["photograph", "water", "glass"][unit]), unit);
      return texture;
    });
    gl.uniform2f(gl.getUniformLocation(program, "texel"), 1 / field.width, 1 / field.height);
    return {
      draw() {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, textures[1]);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, field);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
      dispose() { dispose(); gl.getExtension("WEBGL_lose_context")?.loseContext(); },
    };
  } catch {
    dispose();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
}

// On machines without WebGL, use clipped photographic lenses as well.
function canvasRenderer(canvas, source, mask, model) {
  const ctx = canvas.getContext("2d");
  return {
    draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(canvas.width / WINDOW.w, 0, 0, canvas.height / WINDOW.h, 0, 0);
      for (const d of [...model.beads, ...model.drops]) {
        const stretch = 1 + Math.min(1.7, d.v / 70), rx = d.r / Math.sqrt(stretch), ry = d.r * stretch;
        ctx.save(); ctx.globalAlpha = Math.min(1, d.age / 1.4) * .8;
        ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(source, d.x - rx * .65, d.y - ry * .65, rx * 1.3, ry * 1.3, d.x - rx, d.y - ry, rx * 2, ry * 2);
        ctx.restore();
      }
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0, WINDOW.w, WINDOW.h);
      ctx.globalCompositeOperation = "source-over";
    },
    dispose() {},
  };
}

export function mountWindowRain(scope, { host, image, imageWidth, imageHeight, reducedMotion = false }) {
  let canvas = document.createElement("canvas");
  canvas.className = "prologue-rain";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  let renderer = null, model = null, frame = 0, previous = 0, disposed = false;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
  const dispose = () => {
    if (disposed) return;
    disposed = true; stop(); renderer?.dispose(); canvas.remove();
  };
  scope.add(dispose);
  const resize = (width = host.clientWidth, height = host.clientHeight) => {
    if (disposed || !width || !height) return;
    const cover = Math.max(width / imageWidth, height / imageHeight);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.ceil(WINDOW.w * cover * dpr);
    canvas.height = Math.ceil(WINDOW.h * cover * dpr);
    Object.assign(canvas.style, {
      left: `${(width - imageWidth * cover) / 2 + WINDOW.x * cover}px`,
      top: `${(height - imageHeight * cover) / 2 + WINDOW.y * cover}px`,
      width: `${WINDOW.w * cover}px`, height: `${WINDOW.h * cover}px`,
    });
    renderer?.draw();
  };
  const animate = now => {
    frame = 0;
    if (disposed || !canvas.isConnected) { dispose(); return; }
    const dt = previous ? Math.min(.04, (now - previous) / 1000) : 0;
    previous = now;
    model.advance(dt); renderer.draw();
    frame = requestAnimationFrame(animate);
  };
  const resume = () => {
    if (renderer && !frame && !disposed && !reducedMotion && !document.hidden) frame = requestAnimationFrame(animate);
  };
  scope.on(document, "visibilitychange", () => document.hidden ? stop() : resume());
  image.then(photo => {
    if (!photo || disposed || scope.closed || !host.isConnected) return;
    const source = surface(WINDOW.w, WINDOW.h), mask = glassMask();
    source.getContext("2d").drawImage(photo,
      WINDOW.x / imageWidth * photo.naturalWidth, WINDOW.y / imageHeight * photo.naturalHeight,
      WINDOW.w / imageWidth * photo.naturalWidth, WINDOW.h / imageHeight * photo.naturalHeight,
      0, 0, WINDOW.w, WINDOW.h);
    model = waterSurface();
    renderer = refractingRenderer(canvas, source, mask, model.field);
    const fallback = () => {
      const replacement = canvas.cloneNode();
      canvas.replaceWith(replacement); canvas = replacement;
      renderer = canvasRenderer(canvas, source, mask, model);
      resize(); resume();
    };
    if (!renderer) fallback();
    else scope.on(canvas, "webglcontextlost", event => {
      if (disposed) return;
      event.preventDefault(); stop(); renderer.dispose(); fallback();
    });
    resize(); resume();
  });
  return { resize };
}
