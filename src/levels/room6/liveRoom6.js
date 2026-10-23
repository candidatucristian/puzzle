import * as THREE from "three";
import { createLiveRoom, liveRoomSupported } from "../../shared/liveRoom.js";
import { FLAG_CODES } from "../flags/flagDesigns.js";
import { RIBBON } from "../flags/trophies.js";
import DATA from "./room6Live.json";

// ─────────────────────────────────────────────────────────────────────────────
// Room VI, alive (shared/liveRoom.js; its plates, depth, probes and mobile
// from art/blender/room_vi_live.py). In the cabinet his five medals hang on
// their ribbons from the brass rod, in the case and not on its glass: each
// ribbon over the rod and down to its ring, in its country's colours, each
// medal struck with its plant (art/blender/medal_maps.mjs), the Brazilian
// one enamelled; they stir in the air of the room, and swing when a hand
// passes over them, and the cabinet's light throws their shadows on the
// velvet. Over the cot the mobile turns, slowly, its stars and its cloud
// each swaying on its thread, and its shadow goes round on the wall behind.
// Dust turns in the light from the window; a cloud goes over the moon now
// and then; the garden moves in the wind.
// ─────────────────────────────────────────────────────────────────────────────

const AT = "assets/images/Room6/live/";
const KEY = {
  plate: "room6_live_plate", dim: "room6_live_dim", glass: "room6_live_glass", depth: "room6_live_depth",
  cabinet: "room6_live_probe_cabinet", mobile: "room6_live_probe_mobile", model: "room6_live_mobile",
};
// each country's medal, by its die
const DIE = { DE: "de_leaf", BR: "br_flag", IE: "ie_shamrock", FI: "fi_sprig", NG: "ng_flower" };
const map = (die, kind) => `room6_live_medal_${die}_${kind}`;

export function loadRoom6Live(scene) {
  if (!liveRoomSupported()) return;
  const image = (key, file) => { if (!scene.textures.exists(key)) scene.load.image(key, AT + file); };
  const binary = (key, file) => { if (!scene.cache.binary.exists(key)) scene.load.binary(key, AT + file); };
  image(KEY.plate, "plate.webp"); image(KEY.dim, "plate-dim.webp"); image(KEY.glass, "glass.webp");
  // (the depth is exact, byte for byte: lossless)
  image(KEY.depth, "depth.webp");
  binary(KEY.cabinet, "probe-cabinet.hdr"); binary(KEY.mobile, "probe-mobile.hdr"); binary(KEY.model, "mobile.glb");
  for (const die of Object.values(DIE)) for (const kind of ["color", "orm", "normal"]) image(map(die, kind), `medals/${die}-${kind}.webp`);
}

export function room6LiveReady(scene) {
  return liveRoomSupported()
    && [KEY.plate, KEY.dim, KEY.glass, KEY.depth].every((k) => scene.textures.exists(k))
    && [KEY.cabinet, KEY.mobile, KEY.model].every((k) => scene.cache.binary.exists(k));
}

/** The picture the room is, for the rain on its window and for previews. */
export const room6LivePlate = (scene) => scene.textures.get(KEY.plate).getSourceImage();

/** The room, alive, behind the scene's canvas; `lit` whether the cabinet's
 *  light still burns. Returns { frame(view), offsetAt(z), dispose() }. */
export function mountRoom6Live(scene, { lit }) {
  const source = (key) => scene.textures.get(key).getSourceImage();
  const room = createLiveRoom({
    under: scene.game.canvas, data: DATA,
    plate: source(KEY.plate), dim: source(KEY.dim), depth: source(KEY.depth),
    glass: { image: source(KEY.glass), box: DATA.glass, depth: 5.2 },
    // (the eye does not follow the pointer: the room stays put under the hand;
    // were it to, the back wall and its window would stay where they are)
    steady: 7.65,
  });
  const cabinetLight = room.probe(scene.cache.binary.get(KEY.cabinet));
  const nurseryLight = room.probe(scene.cache.binary.get(KEY.mobile));

  const medals = hangMedals(room, scene, cabinetLight, lit);
  dust(room);
  let mobile = null, gone = false;
  room.model(scene.cache.binary.get(KEY.model)).then((gltf) => {
    if (gone) return;
    mobile = turnMobile(room, gltf, nurseryLight);
  }).catch(() => {});

  return {
    frame: (seconds, camera, hold) => room.frame(seconds, {
      zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY, width: camera.width, height: camera.height,
    }, hold),
    offsetAt: (z) => room.shiftAt(z),
    medals,
    get mobile() { return mobile; },
    dispose: () => { gone = true; room.dispose(); },
  };
}

// ── the medals ───────────────────────────────────────────────────────────────

const R = 0.05, THICK = 0.005;            // a medal's radius and thickness
const RIBBON_LONG = 0.14, RIBBON_WIDE = 0.042;

// A ribbon's silk in its country's colours, flat as it was woven: the stripes
// run down it; Finland's cross, Brazil's globe on its band.
function ribbonCloth(code) {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const g = c.getContext("2d");
  const rib = RIBBON[code], n = rib.stripes.length;
  rib.stripes.forEach((col, i) => { g.fillStyle = col; g.fillRect((i * 64) / n, 0, 64 / n + 1, 256); });
  if (rib.cross) {
    g.fillStyle = rib.cross;
    g.fillRect(64 * 0.38, 0, 64 * 0.24, 256);
    g.fillRect(0, 256 * 0.34, 64, 64 * 0.24);
  }
  if (rib.globe) {
    g.fillStyle = "#1a2f78"; g.beginPath(); g.arc(32, 256 * 0.46, 64 * 0.17, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(242,239,230,.9)"; g.lineWidth = 2.2;
    g.beginPath(); g.arc(28, 256 * 0.46 + 14, 16, -2.2, -1.0); g.stroke();
  }
  // the weave, faintly
  g.fillStyle = "rgba(0,0,0,.06)";
  for (let y = 0; y < 256; y += 2) g.fillRect(0, y, 64, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// The ribbon's shape: over the rod from behind, and straight down the front
// to the ring, narrowing a little; across it runs along the rod (Blender's y).
function ribbonShape(rho) {
  const path = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI;
    path.push({ x: rho * Math.cos(a), z: rho * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) });
  }
  for (let i = 1; i <= 16; i++) path.push({ x: rho, z: (-i / 16) * RIBBON_LONG, nx: 1, nz: 0 });
  let run = 0;
  const along = path.map((p, i) => (run += i ? Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z) : 0));
  const position = [], normal = [], uv = [], index = [];
  path.forEach((p, i) => {
    const v = 1 - along[i] / run, half = (RIBBON_WIDE / 2) * (1 - 0.16 * Math.max(0, -p.z / RIBBON_LONG));
    for (const side of [-1, 1]) {
      position.push(p.x, side * half, p.z);
      normal.push(p.nx, 0, p.nz);
      uv.push(side < 0 ? 0 : 1, v);
    }
    if (i) { const a = (i - 1) * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

function medalDisc(scene, code, env) {
  const die = DIE[code];
  const tex = (kind, colour) => {
    const t = new THREE.Texture(scene.textures.get(map(die, kind)).getSourceImage());
    t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4; t.needsUpdate = true;
    return t;
  };
  const orm = tex("orm");
  const face = new THREE.MeshStandardMaterial({
    map: tex("color", true), normalMap: tex("normal"), roughnessMap: orm, metalnessMap: orm,
    metalness: 1, roughness: 1, envMap: env,
  });
  const sides = code === "BR" ? 10 : 64;
  const start = code === "BR" ? Math.PI / 2 - Math.PI / 10 : 0;
  const metal = (rough, k) => new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.42 * k, 0.3 * k, 0.17 * k), metalness: 1, roughness: rough, envMap: env });
  const disc = new THREE.Group();
  const front = new THREE.Mesh(new THREE.CircleGeometry(R, sides, start), face);
  front.position.z = THICK / 2;
  const back = new THREE.Mesh(new THREE.CircleGeometry(R, sides, start), metal(0.62, 0.35));
  back.rotation.y = Math.PI; back.position.z = -THICK / 2;
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(R, R, THICK, sides, 1, true, start + Math.PI / 2), metal(0.32, 1));
  edge.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0062, 0.0013, 8, 24), metal(0.4, 0.9));
  ring.position.y = R + 0.004; ring.rotation.y = Math.PI / 2;
  disc.add(front, back, edge, ring);
  disc.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { disc, materials: [face, back.material, edge.material, ring.material] };
}

function hangMedals(room, scene, env, lit) {
  const rod = DATA.rod, rho = rod.radius + 0.0015;
  // the face turned to the room (+x), its top up (+z), its right along the rod (+y)
  const facing = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
  const hangs = FLAG_CODES.map((code, i) => {
    const hang = new THREE.Group();
    hang.position.set(rod.x, DATA.medals[i].y, rod.z);
    const silk = new THREE.MeshPhysicalMaterial({
      map: ribbonCloth(code), roughness: 0.6, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.6, 0.6, 0.6),
      side: THREE.DoubleSide, envMap: env, envMapIntensity: 0.8,
    });
    const ribbon = new THREE.Mesh(ribbonShape(rho), silk);
    ribbon.castShadow = true;
    // the medal on its ring, free to turn a little on it
    const pivot = new THREE.Group();
    pivot.position.set(rho + THICK / 2 + 0.001, 0, -RIBBON_LONG - 0.004);
    const { disc, materials } = medalDisc(scene, code, env);
    disc.quaternion.setFromRotationMatrix(facing);
    disc.position.z = -(R + 0.004);
    pivot.add(disc);
    hang.add(ribbon, pivot);
    room.world.add(hang);
    return {
      hang, pivot, materials: [...materials, silk],
      angle: 0, speed: 0, twist: 0, spin: 0,
      period: 1.35 + i * 0.07, phase: i * 1.7 + 0.4, hits: [ribbon, ...disc.children],
    };
  });
  // the cabinet's light: what of it reaches them, and their shadows
  const glow = lit ? 1 : 0.35;
  for (const h of hangs) for (const m of h.materials) m.envMapIntensity = (m.envMapIntensity ?? 1) * glow;
  const c = DATA.cabinet, mid = (c.y[0] + c.y[1]) / 2, long = c.y[1] - c.y[0];
  room.shadow({
    at: [c.glass - 0.06, mid, c.z[1] - 0.02], to: [c.velvet + 0.1, mid, 1.6], angle: 1.25, blur: 9, opacity: lit ? 0.42 : 0.2,
    intensity: lit ? 0.5 : 0.06, colour: 0xffd2a0,
    sheets: [
      { middle: [c.velvet + 0.004, mid, (c.z[0] + c.z[1]) / 2], size: [c.z[1] - c.z[0], long], facing: [1, 0, 0] },
      { middle: [(c.velvet + c.glass) / 2, mid, c.floor + 0.003], size: [c.glass - c.velvet, long], facing: [0, 0, 1] },
    ],
  });

  // the air stirs them; a hand passing over swings them; each swing dies away
  const hitList = hangs.flatMap((h) => h.hits);
  const lastPointer = room.pointer.clone();
  room.onFrame((t, dt, still) => {
    const across = room.pointer.x - lastPointer.x, moved = room.pointer.distanceTo(lastPointer);
    lastPointer.copy(room.pointer);
    if (!still && moved > 0.002) {
      const hit = room.pick(hitList)[0];
      const h = hit && hangs.find((x) => x.hits.includes(hit.object));
      if (h) { h.speed += THREE.MathUtils.clamp(across * 12, -0.5, 0.5); h.spin += Math.min(0.8, moved * 14) * Math.sign(across || 1); }
    }
    for (const h of hangs) {
      const w = (Math.PI * 2) / h.period;
      h.speed += (-w * w * h.angle - 0.8 * h.speed) * dt;
      h.angle = THREE.MathUtils.clamp(h.angle + h.speed * dt, -0.35, 0.35);
      h.spin += (-3 * h.twist - 0.9 * h.spin) * dt;
      h.twist = THREE.MathUtils.clamp(h.twist + h.spin * dt, -0.9, 0.9);
      const air = still ? 0 : 0.025 * Math.sin(t * w * 0.5 + h.phase) + 0.008 * Math.sin(t * 1.9 + h.phase * 2);
      h.hang.rotation.y = h.angle + air;
      h.pivot.rotation.z = h.twist + (still ? 0 : 0.12 * Math.sin(t * 0.37 + h.phase));
      h.pivot.rotation.y = (h.angle + air) * 0.4;
    }
  });
  return hangs;
}

// ── the mobile over the cot ─────────────────────────────────────────────────

function turnMobile(room, gltf, env) {
  const all = gltf.scene;
  const root = all.getObjectByName("mobile");
  const drops = [0, 1, 2].map((i) => all.getObjectByName(`drop${i}`)).filter(Boolean);
  all.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.material.envMap = env;
    o.material.envMapIntensity = 1;
  });
  room.scene.add(all);
  const m = DATA.mobile;
  room.shadow({
    at: m.light.at, to: [m.pivot[0], m.wall, m.pivot[2] - 0.35], angle: 0.7, blur: 14, opacity: 0.28,
    intensity: 4.5, colour: 0xe4ead8,
    sheets: [{ middle: [m.pivot[0], m.wall - 0.004, m.pivot[2] - 0.35], size: [1.9, 1.9], facing: [0, -1, 0] }],
  });
  const turn0 = root.rotation.y;
  const rest = drops.map((d) => d.rotation.clone());
  room.onFrame((t, _dt, still) => {
    if (still) return;
    // round, slowly, on the air of the room; each drop swaying on its thread
    root.rotation.y = turn0 + t * 0.075 + 0.25 * Math.sin(t * 0.11);
    root.rotation.x = 0.015 * Math.sin(t * 0.43);
    // (and each turns on its own thread, the way a felt star does, so that
    // it is seen more than it is seen edge on)
    drops.forEach((d, i) => {
      d.rotation.x = rest[i].x + 0.06 * Math.sin(t * 0.8 + i * 2.1);
      d.rotation.z = rest[i].z + 0.05 * Math.sin(t * 0.63 + i * 1.3);
      d.rotation.y = rest[i].y - (root.rotation.y - turn0) + 0.55 * Math.sin(t * 0.29 + i * 2.4);
    });
  });
  return root;
}

// ── dust in the window's light ──────────────────────────────────────────────

function dust(room) {
  const n = 260, position = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    position[i * 3] = -2.1 + Math.random() * 2.4;
    position[i * 3 + 1] = 4.6 + Math.random() * 3;
    position[i * 3 + 2] = 0.3 + Math.random() * 3;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const w = DATA.window.glass;
  const uniforms = {
    time: { value: 0 }, scale: { value: 1 },
    // the window's light, from the glass down into the room
    from: { value: new THREE.Vector3((w[0][0] + w[1][0]) / 2, w[0][1] - 0.2, 2.4) },
    to: { value: new THREE.Vector3(-0.5, 4.4, 0.2) },
  };
  const motes = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute float seed; uniform float time, scale; uniform vec3 from, to; varying float vGlow;
      void main() {
        float s = seed * 6.2831;
        vec3 p = position + vec3(sin(time * .09 + s * 3.) * .14, cos(time * .07 + s * 5.) * .12, sin(time * .05 + s * 7.) * .16 - .05 * sin(time * .03 + s));
        vec3 ab = to - from; float k = clamp(dot(p - from, ab) / dot(ab, ab), 0., 1.);
        float d = length(p - (from + ab * k));
        vGlow = smoothstep(.85, .1, d) * (.55 + .45 * sin(time * (.6 + seed) + s * 9.));
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.2, .0045 * scale / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vGlow;
      void main() {
        float r = length(gl_PointCoord - .5);
        float a = smoothstep(.5, .0, r) * vGlow * .5;
        gl_FragColor = vec4(vec3(.72, .82, 1.) * a, 1.);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
  }));
  motes.frustumCulled = false;
  motes.renderOrder = 40;
  room.world.add(motes);
  room.onFrame((t, _dt, still) => {
    motes.visible = !still;
    uniforms.time.value = t;
    uniforms.scale.value = room.renderer.getDrawingBufferSize(new THREE.Vector2()).y * 0.5 * room.camera.projectionMatrix.elements[5];
  });
}
