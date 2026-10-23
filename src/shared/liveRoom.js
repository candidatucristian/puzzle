import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** A room rendered in Blender, made to live (art/blender/room_vi_live.py
 *  makes what it is built from).
 *
 *  Behind the game's canvas, in its own WebGL canvas, the room's plate is
 *  laid down through the very camera Blender rendered it with — and with
 *  how far every pixel of it is, so that what moves can be set among it in
 *  three dimensions: in front of what is nearer, behind what is further,
 *  lit by the room as it was seen from where it hangs (a light probe), with
 *  its shadow on what is behind it. The eye can move a little (parallax:
 *  the plate is drawn again from where the eye has gone, by its depth), a
 *  cloud can pass over the moon (a second plate, the moon dimmed), and what
 *  is out beyond the window can move in the wind.
 *
 *  The game's canvas is drawn over it with nothing where the room is, only
 *  what is clicked and what glints; when the game's camera walks up to
 *  something, this follows it (frame's `view`).
 *
 *  data       what room_vi_live.py writes: the picture's size, the camera
 *             (its matrix, lens, sensor, shift), the depth's encoding
 *  plate, dim, depth   the pictures (images), and `glass`: { image, box }
 *             what a glass in the room lays over what is behind it, in its
 *             box of the picture, to be laid back over what moves there
 *  under      the game's canvas, which this goes behind
 *  parallax   how far the eye follows the pointer, in metres (none unless
 *             asked: the room stays put under the hand)
 *  steady     how far off what stays where it is when the eye moves (the
 *             back wall, its window): nearer things move across it, the way
 *             a room does when you lean in its doorway */
export function liveRoomSupported() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export function createLiveRoom({ under, data, plate, dim = plate, depth, glass = null, exposure = 0.5, parallax = 0, steady = Infinity }) {
  const canvas = document.createElement("canvas");
  canvas.className = "live-room";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;z-index:-1;pointer-events:none;";
  under.parentElement.insertBefore(canvas, under);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // (as Blender's AgX, its exposure; the plate itself is drawn as it is)
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 2 ** exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  // Blender's axes (z up) inside, three.js's (y up) outside
  const world = new THREE.Group();
  world.rotation.x = -Math.PI / 2;
  scene.add(world);

  // ── the camera, Blender's ────────────────────────────────────────────────
  const [PW, PH] = data.size;
  const cam = data.camera;
  const eye = new THREE.Matrix4().makeRotationX(-Math.PI / 2).multiply(new THREE.Matrix4().set(...cam.matrix.flat()));
  const near = cam.near ?? 0.05, far = cam.far ?? 100;
  const hw = (near * cam.sensor) / 2 / cam.lens, hh = (hw * PH) / PW;
  const [sx, sy] = cam.shift.map((s) => s * 2 * hw);
  const lens = new THREE.Matrix4().makePerspective(-hw + sx, hw + sx, hh + sy, -hh + sy, near, far);
  const camera = new THREE.PerspectiveCamera();
  camera.matrixAutoUpdate = false;
  // how far the picture slides for each metre of the eye's moving, at a
  // metre's depth (in the picture's 0..1 across and up)
  const slide = new THREE.Vector2(cam.lens / cam.sensor, (cam.lens / cam.sensor) * (PW / PH));

  // ── the plate, drawn from where the eye is, telling how far it is ────────
  const picture = (image, nearest = false) => {
    const t = new THREE.Texture(image);
    t.colorSpace = THREE.NoColorSpace;
    t.generateMipmaps = false;
    t.minFilter = t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  };
  const enc = data.depth;
  const view = new THREE.Vector3(1, 0, 0); // zoom, and where the game's camera has gone, in NDC
  const shiftUV = new THREE.Vector2();
  const uniforms = {
    plate: { value: picture(plate) }, dim: { value: picture(dim) }, depthMap: { value: picture(depth, true) },
    view: { value: view }, shiftUV: { value: shiftUV },
    cloud: { value: 0 }, time: { value: 0 }, wind: { value: 0 },
    enc: { value: new THREE.Vector2(1 / enc.near - 1 / enc.far, 1 / enc.far) },
    clip: { value: new THREE.Vector2(near, far) },
    outside: { value: data.window?.outside ?? 1e9 },
  };
  const DEPTH_GLSL = /* glsl */ `
    uniform sampler2D depthMap; uniform vec2 enc;
    float metres(vec2 uv) {
      vec2 d = texture2D(depthMap, uv).rg;
      return 1. / (((d.r * 65280. + d.g * 255.) / 65535.) * enc.x + enc.y);
    }`;
  const QUAD_VERTEX = /* glsl */ `
    uniform vec3 view; varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4((position.xy + view.yz) * view.x, 0., 1.); }`;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D plate, dim; uniform vec2 shiftUV, clip;
      uniform float cloud, time, wind, outside;
      varying vec2 vUv;
      ${DEPTH_GLSL}
      void main() {
        // where this pixel's light was in the picture, the eye having moved
        vec2 uv = vUv;
        for (int i = 0; i < 4; i++) uv = vUv + shiftUV / metres(uv);
        float z = metres(uv);
        // the garden beyond the glass, in the wind
        if (z > outside) {
          float g = sin(time * .55 + uv.y * 11.) * .6 + sin(time * 1.6 + uv.y * 37. + uv.x * 23.) * .4;
          vec2 blown = uv + vec2(g * .0008 * wind, 0.);
          if (metres(blown) > outside) uv = blown;
        }
        gl_FragColor = vec4(mix(texture2D(plate, uv).rgb, texture2D(dim, uv).rgb, cloud), 1.);
        gl_FragDepth = ((clip.y + clip.x) * z - 2. * clip.y * clip.x) / ((clip.y - clip.x) * z) * .5 + .5;
      }`,
    depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth, toneMapped: false,
  }));
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1;
  scene.add(backdrop);

  // a glass's reflections, laid back over what moves behind it
  if (glass) {
    const [gx, gy, gw, gh] = glass.box;
    const sheen = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { ...uniforms, glass: { value: picture(glass.image) }, box: { value: new THREE.Vector4(gx / PW, gy / PH, gw / PW, gh / PH) }, at: { value: glass.depth ?? 5 } },
      vertexShader: QUAD_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D glass; uniform vec4 box; uniform vec2 shiftUV; uniform float at; uniform float cloud;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv + shiftUV / at;
          vec2 g = vec2((uv.x - box.x) / box.z, ((1. - uv.y) - box.y) / box.w);
          if (any(lessThan(g, vec2(0.))) || any(greaterThan(g, vec2(1.)))) discard;
          gl_FragColor = vec4(texture2D(glass, vec2(g.x, 1. - g.y)).rgb * (1. - cloud * .5), 1.);
        }`,
      blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    }));
    sheen.frustumCulled = false;
    sheen.renderOrder = 50;
    scene.add(sheen);
  }

  // ── the light of the room, as it was seen from somewhere in it ───────────
  const pmrem = new THREE.PMREMGenerator(renderer);
  const probe = (buffer) => {
    const hdr = new RGBELoader().setDataType(THREE.HalfFloatType).parse(buffer);
    const t = new THREE.DataTexture(hdr.data, hdr.width, hdr.height, THREE.RGBAFormat, hdr.type);
    t.colorSpace = THREE.LinearSRGBColorSpace;
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.flipY = true;
    t.needsUpdate = true;
    const env = pmrem.fromEquirectangular(t).texture;
    t.dispose();
    return env;
  };
  const model = (buffer) => new Promise((resolve, reject) => new GLTFLoader().parse(buffer, "", resolve, reject));

  // A light of the room for what moves (the plate has it already), and the
  // shadow it casts, falling on the plate: a sheet laid just in front of what
  // the shadow falls on. `at`, `to`, the sheet's middle and size: Blender's.
  // With no `intensity` it lights nothing, and only casts the shadow.
  const shadows = [];
  const shadow = ({ at, to, angle = 1.1, blur = 6, opacity = 0.35, intensity = 0, colour = 0xffffff, sheets }) => {
    const light = new THREE.SpotLight(colour, intensity || 1e-4, 0, angle, 1, intensity ? 2 : 0);
    light.position.set(...at);
    light.target.position.set(...to);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.radius = blur;
    light.shadow.blurSamples = 12;
    light.shadow.bias = -0.0005;
    light.shadow.camera.near = 0.05;
    light.shadow.camera.far = 12;
    world.add(light, light.target);
    for (const { middle, size, facing } of sheets) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.ShadowMaterial({ opacity }));
      sheet.position.set(...middle);
      // the plane's normal (+z) turned to face along `facing`
      sheet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...facing).normalize());
      sheet.receiveShadow = true;
      sheet.renderOrder = 10;
      world.add(sheet);
    }
    shadows.push(light);
    return light;
  };

  // ── each frame ───────────────────────────────────────────────────────────
  const tickers = new Set();
  let still = false, last = 0;
  const eyeAt = new THREE.Vector2(), eyeTo = new THREE.Vector2();
  const moved = new THREE.Matrix4(), walked = new THREE.Matrix4();
  const pointer = new THREE.Vector2(0, 0);
  const onPointer = (event) => {
    const box = under.getBoundingClientRect();
    if (!box.width) return;
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, 1 - ((event.clientY - box.top) / box.height) * 2);
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  // a cloud over the moon now and then, the wind in its gusts
  const weather = (t) => {
    const swell = (a, b) => Math.max(0, Math.sin(t * a + b));
    return {
      cloud: 0.62 * swell(0.071, 1.3) ** 3 * (0.6 + 0.4 * Math.sin(t * 0.23)),
      wind: 0.45 + 0.55 * swell(0.17, 0.4) ** 2 + 0.2 * Math.sin(t * 0.9),
    };
  };

  let size = "";
  const fit = () => {
    const w = under.clientWidth, h = under.clientHeight, x = under.offsetLeft, y = under.offsetTop;
    const now = `${w}x${h}@${x},${y}`;
    if (now === size || !w || !h) return;
    size = now;
    canvas.style.left = `${x}px`; canvas.style.top = `${y}px`;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    renderer.setSize(w, h, false);
  };

  // the game's canvas breathes (house-tools.css), and may be moved a little
  // (ui/lookAround.js); this, in time with it and moved with it
  const breathe = () => {
    if (canvas.style.translate !== under.style.translate) canvas.style.translate = under.style.translate;
    const breath = (el) => el.getAnimations?.().find((a) => a.animationName === "breathe");
    const theirs = breath(under), mine = breath(canvas);
    if (theirs && mine && Math.abs((mine.currentTime ?? 0) - (theirs.currentTime ?? 0)) > 8) mine.currentTime = theirs.currentTime;
  };

  /** One frame: `seconds`, the game camera's `zoom` and `scroll` (its walk
   *  up to something), and whether everything should hold `still`. */
  const frame = (seconds, { zoom = 1, scrollX = 0, scrollY = 0, width = 1, height = 1 } = {}, hold = false) => {
    fit();
    breathe();
    still = hold;
    const dt = Math.min(0.05, Math.max(0, seconds - last));
    last = seconds;
    // the eye drifts after the pointer, a few centimetres, and breathes
    if (still || !parallax) eyeTo.set(0, 0);
    else eyeTo.set(pointer.x * parallax + Math.sin(seconds * 0.21) * parallax * 0.1, pointer.y * parallax * 0.45 + Math.sin(seconds * 0.17 + 1) * parallax * 0.08);
    eyeAt.lerp(eyeTo, still ? 1 : 1 - Math.exp(-dt * 2.2));
    camera.matrix.copy(eye).multiply(moved.makeTranslation(eyeAt.x, eyeAt.y, 0));
    camera.matrixWorldNeedsUpdate = true;
    shiftUV.set(eyeAt.x * slide.x, eyeAt.y * slide.y);
    // the picture held where it is at `steady`; and the game's camera walking
    // up to something: its zoom, round the middle
    view.set(zoom, (-2 * scrollX) / width + (2 * shiftUV.x) / steady, (2 * scrollY) / height + (2 * shiftUV.y) / steady);
    camera.projectionMatrix.copy(walked.set(
      zoom, 0, 0, zoom * view.y,
      0, zoom, 0, zoom * view.z,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ).multiply(lens));
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const w = still ? { cloud: 0, wind: 0 } : weather(seconds);
    uniforms.cloud.value = w.cloud;
    uniforms.wind.value = w.wind;
    uniforms.time.value = seconds;
    for (const tick of tickers) tick(seconds, dt, still);
    renderer.render(scene, camera);
  };

  /** Where something `z` metres off has slid to, in the game's pixels. */
  const shiftAt = (z) => ({ x: (shiftUV.x / steady - shiftUV.x / z) * under.clientWidth, y: (shiftUV.y / z - shiftUV.y / steady) * under.clientHeight });

  const raycaster = new THREE.Raycaster();
  /** What of `objects` is under the pointer, nearest first. */
  const pick = (objects) => {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, true);
  };

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("pointermove", onPointer);
    tickers.clear();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      for (const m of [o.material].flat()) {
        if (!m) continue;
        for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
        for (const u of Object.values(m.uniforms ?? {})) if (u.value?.isTexture) u.value.dispose();
        m.dispose();
      }
    });
    for (const light of shadows) light.shadow.map?.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();
  };

  return {
    canvas, renderer, scene, world, camera, pointer,
    probe, model, shadow, pick, shiftAt, frame, dispose,
    onFrame: (tick) => { tickers.add(tick); return () => tickers.delete(tick); },
    get still() { return still; },
  };
}
