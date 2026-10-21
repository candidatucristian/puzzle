import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** The five things in the cot that answer a hand, made in three dimensions
 *  (stage3d.js lights them and sets them on the photographed mattress): a
 *  walnut music box with a couple dancing the tango on its turntable, a
 *  little gold Oscar on its base, the red book of Romeo and Juliet, a
 *  painted figure of Charlie Chaplin, a toy hotel. Each is built in metres,
 *  standing on its own foot at the origin, its front toward +z; photographic
 *  materials and fine sculpted details. What moves in each is handed back in
 *  `parts`. */

export function buildToy(id, materials, photograph) {
  return BUILD[id](materials, photograph);
}

const BUILD = { musicbox: musicBox, oscar, book, chaplin, hotel };

// ── materials and the canvases they are painted on ─────────────────────────

const canvasTexture = (w, h, draw, color = true) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

// a seeded scatter, so a texture is painted the same every time
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const mat = {
  brass: () => new THREE.MeshStandardMaterial({ color: 0xc89b4c, metalness: .92, roughness: .4 }),
  lacquer: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: .46, clearcoat: .26, clearcoatRoughness: .42 }),
  // glazed porcelain, for the dancers
  glaze: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: .48, clearcoat: .28, clearcoatRoughness: .35 }),
  paint: (color, roughness = 0.6) => new THREE.MeshStandardMaterial({ color, roughness }),
};

function mesh(geometry, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const box = (w, h, d, material, at) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d, .008) * .16), material, at);
const cyl = (rt, rb, h, material, at, seg = 32) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, at);
const ball = (r, material, at, seg = 24) => mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), material, at);

// a rod from one point to another
function rod(r, material, [x0, y0, z0], [x1, y1, z1], seg = 12) {
  const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(b);
  const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

// Rounded sculpted contours, rather than straight cylinders and cones.
function turned(profile, material, at, folds = 0) {
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  if (folds) {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getX(i), p.getZ(i));
      const f = 1 + Math.sin(a * 9 + p.getY(i) * 125) * folds;
      p.setXYZ(i, p.getX(i) * f, p.getY(i), p.getZ(i) * f);
    }
    geometry.computeVertexNormals();
  }
  return mesh(geometry, material, at);
}

function limb(radius, material, from, to, taper = .72) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), length = a.distanceTo(b);
  const m = turned([[0, 0], [radius * taper, 0], [radius, length * .2], [radius * .92, length * .64], [radius * taper, length], [0, length]], material);
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return m;
}

function panel(points, material, at) {
  const shape = new THREE.Shape(); shape.moveTo(...points[0]);
  points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
  return mesh(new THREE.ExtrudeGeometry(shape, { depth: .0005, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .0002, bevelThickness: .00015 }), material, at);
}

function head(g, { x = 0, y, z = 0, r, skin, hair }) {
  g.add(ball(r, skin, { x, y, z, sy: 1.22, sz: .86 }, 32));
  g.add(ball(r * .24, skin, { x, y: y - r * .06, z: z + r * .85, sy: 1.15, sz: 1.1 }, 16));
  for (const s of [-1, 1]) {
    g.add(ball(r * .2, skin, { x: x + s * r * .91, y: y - r * .02, z, sx: .65 }, 16));
    g.add(ball(r * .065, hair, { x: x + s * r * .34, y: y + r * .21, z: z + r * .79, sy: .5 }, 12));
  }
  g.add(ball(r * 1.025, hair, { x, y: y + r * .54, z: z - r * .2, sy: .65, sz: .9 }, 28));
}

// ── the music box ──────────────────────────────────────────────────────────

function musicBox(materials, photograph) {
  const g = new THREE.Group(), W = 0.15, H = 0.064, D = 0.1, T = 0.007;
  const wood = materials.wood;
  for (const [w, h, d, x, y, z] of [
    [W, H, T, 0, H / 2, D / 2 - T / 2], [W, H, T, 0, H / 2, -D / 2 + T / 2],
    [T, H, D - 2 * T, -W / 2 + T / 2, H / 2, 0], [T, H, D - 2 * T, W / 2 - T / 2, H / 2, 0],
    [W, T, D, 0, T / 2, 0],
  ]) g.add(box(w, h, d, wood, { x, y, z }));
  // a little spray of flowers painted on its front, and a pale stringing round it
  const front = canvasTexture(512, 220, (c, w, h) => {
    // Its original hand-painted floral inlay, projected onto the live front.
    if (photograph) {
      c.drawImage(photograph, 58, 286, 282, 96, 0, 0, w, h);
      return;
    }
    c.strokeStyle = "rgba(226,196,140,.75)"; c.lineWidth = 5; c.strokeRect(14, 14, w - 28, h - 28);
    const flower = (x, y, r, col) => {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.fillStyle = col; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, r * 0.55, a, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#f2dc9c"; c.beginPath(); c.arc(x, y, r * 0.5, 0, Math.PI * 2); c.fill();
    };
    c.strokeStyle = "#5f7a3c"; c.lineWidth = 4; c.beginPath(); c.moveTo(150, 150); c.quadraticCurveTo(256, 120, 360, 150); c.stroke();
    for (const [x, y, a] of [[190, 138, -0.6], [320, 140, 0.6], [256, 128, 0]]) { c.fillStyle = "#6f8a44"; c.beginPath(); c.ellipse(x, y, 18, 8, a, 0, Math.PI * 2); c.fill(); }
    flower(256, 104, 16, "#c86068"); flower(206, 118, 12, "#e2c27a"); flower(306, 118, 12, "#9fb6d8");
  });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, H * 0.86), new THREE.MeshStandardMaterial({ map: front, transparent: true, roughness: 0.5 }));
  decal.position.set(0, H * 0.5, D / 2 + 0.0006);
  g.add(decal);
  // inside: a satin floor over the works, satin round its walls above it
  const satin = materials.lining, floor = H - 0.013;
  g.add(box(W - 2 * T, 0.002, D - 2 * T, satin, { y: floor }));
  for (const [w, d, x, z] of [[W - 2 * T, 0.0015, 0, D / 2 - T - 0.0008], [W - 2 * T, 0.0015, 0, -D / 2 + T + 0.0008], [0.0015, D - 2 * T, -W / 2 + T + 0.0008, 0], [0.0015, D - 2 * T, W / 2 - T - 0.0008, 0]]) {
    g.add(box(w, 0.012, d, satin, { x, y: floor + 0.006, z }));
  }
  // the brass turntable the dancers stand on
  const table = cyl(0.03, 0.031, 0.004, materials.brass, { y: floor + 0.003, z: 0.004 }, 48);
  g.add(table);
  const dancers = tangoDancers();
  dancers.position.set(0, floor + 0.005, 0.004);
  dancers.scale.setScalar(1.35);
  g.add(dancers);
  // the lid, open on its hinges at the back: satin inside, an oval mirror
  const lid = new THREE.Group();
  lid.position.set(0, H, -D / 2);
  const board = box(W, 0.008, D, wood, { y: 0.004, z: D / 2 });
  lid.add(board);
  const inside = box(W - 0.014, 0.0015, D - 0.014, satin, { y: -0.0004, z: D / 2 });
  lid.add(inside);
  const mirror = mesh(new THREE.CircleGeometry(0.026, 48), new THREE.MeshStandardMaterial({ color: 0x999e9d, metalness: .95, roughness: .24, envMapIntensity: .6 }), { y: -0.0015, z: D / 2, rx: Math.PI / 2, sx: 1, sy: 0.72 });
  lid.add(mirror);
  const frame = mesh(new THREE.TorusGeometry(0.0265, 0.0018, 8, 48), materials.brass, { y: -0.0016, z: D / 2, rx: Math.PI / 2, sy: 0.72 });
  lid.add(frame);
  lid.rotation.x = -1.92;
  g.add(lid);
  // Moulded lips and fine pale stringing round the lid and lower plinth.
  for (const y of [.004, H - .002]) {
    for (const z of [-D / 2, D / 2]) g.add(box(W + .002, .003, .003, wood, { y, z }));
    for (const x of [-W / 2, W / 2]) g.add(box(.003, .003, D, wood, { x, y }));
  }
  for (const z of [.004, D - .004]) lid.add(box(W - .006, .0011, .0012, materials.brass, { y: -.0013, z }));
  for (const x of [-W / 2 + .004, W / 2 - .004]) lid.add(box(.0012, .0011, D - .008, materials.brass, { x, y: -.0013, z: D / 2 }));
  for (const x of [-W * 0.3, W * 0.3]) g.add(box(0.012, 0.004, 0.006, mat.brass(), { x, y: H - 0.001, z: -D / 2 - 0.001 }));
  // the key in its right side, turning on its shaft
  const key = new THREE.Group();
  key.position.set(W / 2, H * 0.48, 0);
  key.add(rod(0.0024, mat.brass(), [0, 0, 0], [0.016, 0, 0]));
  for (const s of [-1, 1]) key.add(mesh(new THREE.TorusGeometry(0.0062, 0.0018, 10, 28), mat.brass(), { x: 0.018, y: s * 0.0068, ry: Math.PI / 2 }));
  key.add(ball(0.003, mat.brass(), { x: 0.017 }));
  g.add(key);
  // little brass feet
  for (const x of [-W / 2 + 0.01, W / 2 - 0.01]) for (const z of [-D / 2 + 0.01, D / 2 - 0.01]) g.add(ball(0.004, mat.brass(), { x, y: 0.001, z }));
  return { group: g, parts: { dancers, key, lid } };
}

// a man in black leaning in, a woman in red leaning back against his arm,
// one leg drawn up behind her: glazed porcelain, about six centimetres tall
function tangoDancers() {
  const g = new THREE.Group();
  const black = mat.glaze(0x1d1919), skin = mat.glaze(0xd4b293), red = mat.glaze(0x78202c), white = mat.glaze(0xd6ccba);
  const man = new THREE.Group();
  man.position.set(-.006, 0, -.004);
  for (const [a, b] of [[[-.006, .003, .003], [-.003, .029, 0]], [[.006, .003, -.006], [.003, .029, 0]]]) {
    man.add(limb(.0031, black, a, b));
    man.add(ball(.0033, black, { x: a[0], y: .002, z: a[2] + .002, sy: .6, sz: 1.8 }));
  }
  man.add(turned([[0, 0], [.006, 0], [.0055, .008], [.0072, .019], [.007, .023], [.003, .025], [0, .025]], black, { y: .027, sz: .58 }, .025));
  man.add(panel([[-.0026, .009], [0, -.005], [.0026, .009]], white, { y: .043, z: .0044 }));
  for (const s of [-1, 1]) man.add(panel([[0, .009], [s * .0055, .01], [s * .002, -.007]], black, { y: .043, z: .0049 }));
  man.add(cyl(.0023, .0028, .004, skin, { y: .053 }));
  head(man, { x: .001, y: .059, r: .0046, skin, hair: black });
  man.add(limb(.0024, black, [-.006, .048, 0], [-.009, .04, .007]));
  man.add(limb(.0021, black, [-.009, .04, .007], [.006, .038, .011]));
  man.add(ball(.002, skin, { x: .007, y: .038, z: .011 }));
  man.add(limb(.0024, black, [.006, .049, 0], [.014, .052, .002]));
  man.add(limb(.002, black, [.014, .052, .002], [.019, .061, .003]));
  man.add(ball(.002, skin, { x: .019, y: .061, z: .003 }));
  man.rotation.z = -.1;
  g.add(man);
  const woman = new THREE.Group();
  woman.position.set(.006, 0, .006);
  woman.add(limb(.0023, skin, [0, .003, .003], [0, .026, 0]));
  woman.add(ball(.0026, red, { y: .0017, z: .004, sy: .6, sz: 1.5 }));
  woman.add(limb(.0024, skin, [.003, .024, 0], [.013, .018, -.003]));
  woman.add(limb(.0018, skin, [.013, .018, -.003], [.019, .032, -.006]));
  woman.add(ball(.0021, red, { x: .019, y: .032, z: -.006, sy: .6, sz: 1.5 }));
  woman.add(turned([[0, 0], [.010, 0], [.011, .003], [.0085, .011], [.007, .02], [.004, .027], [.0047, .033], [.0055, .037], [0, .039]], red, { y: .015, sz: .7 }, .16));
  woman.add(ball(.0046, skin, { y: .0535, sx: 1.25, sy: .6, sz: .65 }));
  woman.add(cyl(.0019, .0024, .004, skin, { y: .057 }));
  head(woman, { x: -.001, y: .062, r: .0042, skin, hair: black });
  woman.add(ball(.003, black, { x: .002, y: .063, z: -.004 }));
  woman.add(ball(.0014, red, { x: -.0044, y: .0645, z: .0004 }));
  woman.add(limb(.0018, skin, [-.005, .054, .001], [-.012, .053, 0]));
  woman.add(limb(.0015, skin, [-.012, .053, 0], [-.013, .06, -.003]));
  woman.add(limb(.0018, skin, [.005, .054, 0], [.009, .058, 0]));
  woman.add(limb(.0015, skin, [.009, .058, 0], [.013, .061, -.002]));
  woman.rotation.z = .17;
  g.add(woman);
  g.rotation.y = -.25;
  return g;
}

// ── the little gold man ────────────────────────────────────────────────────

function oscar(materials) {
  const g = new THREE.Group(), gold = materials.gold;
  // the black base, banded in gold, its top seen from above
  g.add(cyl(0.024, 0.026, 0.04, mat.lacquer(0x0c0c0e), { y: 0.02 }, 48));
  g.add(cyl(0.0263, 0.0263, 0.006, gold, { y: 0.018 }, 48));
  g.add(cyl(0.0245, 0.0245, 0.002, gold, { y: 0.041 }, 48));
  // the film reel he stands on
  const reel = canvasTexture(256, 256, (c, w) => {
    c.fillStyle = "#c79a3e"; c.fillRect(0, 0, w, w);
    c.fillStyle = "#3a2608";
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.beginPath(); c.arc(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70, 26, 0, Math.PI * 2); c.fill(); }
  });
  const reelMat = new THREE.MeshStandardMaterial({ map: reel, metalness: 1, roughness: 0.25 });
  g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 48), [gold, reelMat, gold], { y: 0.046 }));
  const body = new THREE.Group();
  // A cast human figure: separate calves, knees, thighs, pelvis and chest.
  for (const s of [-1, 1]) {
    body.add(ball(.0038, gold, { x: s * .004, y: .053, z: .002, sy: .55, sz: 1.7 }));
    body.add(limb(.0032, gold, [s * .004, .055, 0], [s * .0036, .078, -.001]));
    body.add(ball(.003, gold, { x: s * .0036, y: .079, z: .0001 }));
    body.add(limb(.0045, gold, [s * .0036, .08, -.001], [s * .004, .105, 0]));
  }
  body.add(ball(.009, gold, { y: .105, sy: .88, sz: .57 }));
  body.add(turned([[0, 0], [.0065, 0], [.006, .007], [.009, .019], [.0122, .026], [.012, .029], [.005, .033], [0, .033]], gold, { y: .106, sz: .55 }));
  for (const s of [-1, 1]) {
    body.add(ball(.005, gold, { x: s * .0052, y: .129, z: .003, sy: .7, sz: .4 }));
    body.add(ball(.0041, gold, { x: s * .0113, y: .134, sz: .85 }));
    body.add(limb(.0032, gold, [s * .0118, .133, 0], [s * .0122, .12, .003]));
    body.add(limb(.0028, gold, [s * .0122, .12, .003], [-s * .0025, .124, .008]));
    body.add(ball(.0028, gold, { x: -s * .0025, y: .124, z: .008, sx: .8, sy: .7 }));
  }
  body.add(cyl(.003, .004, .007, gold, { y: .143 }));
  head(body, { y: .155, r: .006, skin: gold, hair: gold });
  g.add(body);
  g.add(rod(.0009, gold, [0, .055, .008], [0, .124, .0088]));
  g.add(box(.010, .0015, .002, gold, { y: .122, z: .0092 }));
  g.scale.setScalar(1.22);
  return { group: g, parts: { body } };
}

// ── the book ───────────────────────────────────────────────────────────────

function book(materials) {
  const g = new THREE.Group(), W = .132, T = .028, D = .164, B = .0035;
  const cloth = materials.surfaces.cloth.map, clothMat = materials.cloth;
  // the cover's face: a gilt border and its title, the gilt catching the
  // light — drawn three times: in colour; as where it is metal (white); and
  // as how rough it is (the cloth rough, the gilt smooth)
  const drawCover = (c, w, h, mode) => {
    const gilt = mode !== "colour";
    c.fillStyle = mode === "metal" ? "#000" : mode === "rough" ? "#dadada" : "#7c1a20"; c.fillRect(0, 0, w, h);
    if (!gilt) c.drawImage(cloth.image, 0, 0, w, h);
    if (!gilt) {
      const rnd = lcg(21);
      c.strokeStyle = "rgba(218,179,137,.35)"; c.lineWidth = 4;
      c.strokeRect(3, 3, w - 6, h - 6);
      for (let i = 0; i < 650; i++) {
        const x = rnd() * w, y = rnd() * h;
        if (Math.min(x, y, w - x, h - y) > 22) continue;
        c.fillStyle = `rgba(215,175,134,${.1 + rnd() * .3})`;
        c.fillRect(x, y, 1 + rnd() * 8, 1 + rnd() * 3);
      }
    }
    const ink = mode === "metal" ? "#fff" : mode === "rough" ? "#484848" : "#d9b464";
    c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(48, 30, w - 78, h - 60);
    c.lineWidth = 1.5; c.strokeRect(62, 44, w - 106, h - 88);
    c.fillStyle = ink; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "italic 500 116px Georgia, 'Times New Roman', serif"; c.fillText("Romeo", w / 2 + 14, h * .29, w - 140);
    c.font = "italic 400 48px Georgia, 'Times New Roman', serif"; c.fillText("and", w / 2 + 14, h * .46);
    c.font = "italic 500 110px Georgia, 'Times New Roman', serif"; c.fillText("Juliet", w / 2 + 14, h * .62, w - 140);
    c.font = "400 27px Georgia, serif"; c.fillText("WILLIAM SHAKESPEARE", w / 2 + 14, h * .82);
    if (mode === "colour") { c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, 0, 30, h); }
  };
  const coverMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(1024, 700, (c, w, h) => drawCover(c, w, h, "colour")),
    bumpMap: materials.surfaces.cloth.bumpMap, bumpScale: .00014,
    metalnessMap: canvasTexture(1024, 700, (c, w, h) => drawCover(c, w, h, "metal"), false), metalness: 0.95,
    roughnessMap: canvasTexture(1024, 700, (c, w, h) => drawCover(c, w, h, "rough"), false), roughness: 1,
  });
  const pages = canvasTexture(512, 64, (c, w, h) => {
    c.drawImage(materials.surfaces.paper.map.image, 0, 0, w, h);
    const rnd = lcg(13);
    for (let y = 1; y < h; y += 1.2) {
      c.strokeStyle = `rgba(78,53,29,${.1 + rnd() * .23})`; c.lineWidth = .45;
      c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(w * .48, y + (rnd() - .5) * 2, w, y); c.stroke();
    }
    const edge = c.createLinearGradient(0, 0, 0, h);
    edge.addColorStop(0, "rgba(58,30,13,.32)"); edge.addColorStop(.22, "transparent");
    edge.addColorStop(.8, "transparent"); edge.addColorStop(1, "rgba(58,30,13,.3)");
    c.fillStyle = edge; c.fillRect(0, 0, w, h);
  });
  const pageMat = new THREE.MeshStandardMaterial({ map: pages, roughness: 0.9 });
  const titlePage = canvasTexture(1024, 700, (c, w, h) => {
    c.drawImage(materials.surfaces.paper.map.image, 0, 0, w, h);
    c.fillStyle = "#3a2a1c"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "600 70px Georgia, serif"; c.fillText("ROMEO AND JULIET", w / 2, h * 0.42);
    c.font = "italic 400 40px Georgia, serif"; c.fillText("a tragedy", w / 2, h * 0.56);
  });
  const paper = materials.paper;
  // its back board, its pages, its round spine
  g.add(box(W, B, D, clothMat, { y: B / 2 }));
  g.add(box(W - 0.008, T - 2 * B, D - 0.008, [pageMat, clothMat, new THREE.MeshStandardMaterial({ map: titlePage, roughness: 0.9 }), paper, pageMat, pageMat], { x: 0.003, y: T / 2 }));
  g.add(mesh(new THREE.CylinderGeometry(T / 2, T / 2, D, 24, 1, false, Math.PI, Math.PI), clothMat, { x: -W / 2 + 0.002, y: T / 2, rx: Math.PI / 2 }));
  for (const z of [-D * .35, -D * .22, D * .22, D * .35]) {
    g.add(box(.013, T * .88, .002, clothMat, { x: -W / 2 + .002, y: T / 2, z }));
  }
  // the green ribbon, out from between the pages at its foot
  g.add(box(0.008, 0.0008, 0.034, mat.paint(0x2f5a3a, 0.7), { x: 0.03, y: T * 0.45, z: D / 2 + 0.012, rx: 0.5 }));
  // the front board, hinged at the spine, to be lifted
  const cover = new THREE.Group();
  cover.position.set(-W / 2 + 0.002, T - B / 2, 0);
  cover.add(box(W, B, D, [clothMat, clothMat, coverMat, clothMat, clothMat, clothMat], { x: W / 2 - 0.002 }));
  g.add(cover);
  g.rotation.y = -0.3;
  return { group: g, parts: { cover } };
}

// ── Charlie Chaplin ────────────────────────────────────────────────────────

function chaplin(materials, photograph) {
  const g = new THREE.Group();
  const black = materials.felt, grey = materials.wool, white = materials.surface("paper", { color: 0xc9bfae });
  const skin = mat.glaze(0xd1b497), shoe = mat.lacquer(0x211c19);
  const face = canvasTexture(1024, 512, (c, w, h) => {
    c.fillStyle = "#cdb093"; c.fillRect(0, 0, w, h);
    if (!photograph) return;
    const patch = document.createElement("canvas"); patch.width = 256; patch.height = 320;
    const p = patch.getContext("2d");
    p.drawImage(photograph, 181, 470, 65, 69, 0, 0, 256, 320);
    p.globalCompositeOperation = "destination-in";
    const fade = p.createRadialGradient(128, 154, 68, 128, 154, 158);
    fade.addColorStop(0, "white"); fade.addColorStop(.7, "rgba(255,255,255,.95)"); fade.addColorStop(1, "transparent");
    p.fillStyle = fade; p.fillRect(0, 0, 256, 320);
    c.drawImage(patch, w * .125, h * .19, w * .25, h * .625);
  });
  // Painted soles, shaped shoe uppers and gently crumpled wool trousers.
  for (const s of [-1, 1]) {
    g.add(box(.0145, .0022, .030, shoe, { x: s * .01, y: .0012, z: .005, ry: s * .42 }));
    g.add(ball(1, shoe, { x: s * .01, y: .005, z: .005, sx: .0072, sy: .005, sz: .015, ry: s * .42 }, 32));
    g.add(turned([[0, 0], [.0058, 0], [.007, .004], [.0084, .009], [.0075, .016], [.008, .023], [.0088, .035], [.009, .043], [.006, .049], [0, .049]], grey, { x: s * .007, y: .009, rz: s * -.045, sz: .83 }, .07));
    for (const y of [.017, .021]) g.add(limb(.00045, grey, [s * .007 - .005, y, .0055], [s * .007 + .005, y + .001, .006]));
  }
  g.add(turned([[0, 0], [.0135, 0], [.015, .005], [.012, .014], [.0125, .027], [.015, .036], [.014, .04], [.0045, .044], [0, .044]], black, { y: .052, sz: .58 }, .025));
  g.add(panel([[-.005, .016], [.005, .016], [.004, -.017], [-.004, -.017]], white, { y: .08, z: .0082 }));
  for (const s of [-1, 1]) {
    g.add(panel([[s * .0038, .015], [s * .013, .01], [s * .008, -.001], [s * .01, -.004], [0, -.017]], black, { y: .08, z: .009 }));
    g.add(panel([[s * .004, .016], [s * .001, .007], [s * .007, .013]], white, { y: .08, z: .0098 }));
    g.add(ball(.0017, shoe, { x: s * .002, y: .094, z: .011, sx: 1.25, sy: .6, sz: .5 }));
    g.add(panel([[0, .006], [s * .013, .013], [s * .016, -.007], [s * .004, -.012]], black, { y: .06, z: .008 }));
  }
  for (const y of [.071, .079, .087]) g.add(ball(.00075, materials.brass, { y, z: .0102, sz: .4 }));
  g.add(limb(.0042, black, [-.014, .09, 0], [-.018, .077, .002]));
  g.add(limb(.0036, black, [-.018, .077, .002], [-.019, .065, .005]));
  g.add(ball(.0032, skin, { x: -.019, y: .061, z: .005, sy: 1.3, sz: .8 }));
  g.add(limb(.0042, black, [.014, .09, 0], [.021, .078, .002]));
  g.add(limb(.0035, black, [.021, .078, .002], [.026, .069, .008]));
  g.add(ball(.0032, skin, { x: .027, y: .066, z: .01, sy: 1.2 }));
  const cane = materials.wood;
  g.add(rod(.0013, cane, [.031, .001, .014], [.027, .065, .01], 20));
  g.add(mesh(new THREE.TorusGeometry(.004, .0013, 12, 28, Math.PI), cane, { x: .023, y: .065, z: .01 }));
  g.add(cyl(.0034, .0043, .007, skin, { y: .099 }));
  g.add(ball(.0112, new THREE.MeshStandardMaterial({ map: face, roughness: .7 }), { y: .109, sy: 1.17, sz: .89 }, 48));
  g.add(ball(.0023, skin, { y: .1075, z: .0096, sx: .7, sy: 1.15, sz: 1.05 }));
  for (const s of [-1, 1]) g.add(ball(.0022, skin, { x: s * .0106, y: .109, z: -.001, sx: .5, sy: 1.3 }));
  const hair = mat.paint(0x29231e, .76);
  for (let i = 0; i < 13; i++) {
    const a = i / 12 * Math.PI * 1.4 + .85;
    g.add(ball(.0028, hair, { x: Math.cos(a) * .009, y: .116 + Math.sin(i * 2) * .001, z: Math.sin(a) * .008, sy: .8 }, 20));
  }
  const hat = new THREE.Group();
  hat.position.set(0, 0.118, -0.001);
  hat.add(turned([[0, 0], [.0119, 0], [.012, .003], [.0114, .007], [.0095, .0105], [.0055, .012], [0, .0125]], black, { sz: .9 }));
  hat.add(turned([[.010, 0], [.0145, -.0005], [.017, .0004], [.0173, .0012], [.0155, .0015], [.011, .0005]], black, { sz: .86 }));
  hat.add(cyl(.0121, .0121, .0025, mat.paint(0x292825, .73), { y: .0018, sz: .9 }, 48));
  g.add(hat);
  g.scale.setScalar(1.32);
  return { group: g, parts: { hat } };
}

// ── the toy hotel ──────────────────────────────────────────────────────────

function hotel(materials) {
  const g = new THREE.Group(), W = .125, H = .15, D = .1, base = .006;
  const stone = materials.surface("paint", { color: 0xc1b7a1, roughness: .88 });
  const shutters = materials.surface("paint", { color: 0x61777a, roughness: .88 });
  const dark = mat.paint(0x191712, .85), lights = [];
  g.add(box(W, H, D, materials.paint, { y: H / 2 + base }));
  g.add(box(W + .018, base, D + .018, materials.wood, { y: base / 2 }));
  // Moulded floor courses, eaves and individual corner stones.
  for (const y of [base + .004, .054, .102, H + base]) {
    g.add(box(W + .003, .003, D + .003, stone, { y }));
  }
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) {
    for (let row = 0; row < 12; row++) {
      g.add(box(row % 2 ? .010 : .006, .0095, row % 2 ? .006 : .010, stone, { x, y: base + .007 + row * .012, z }));
    }
  }
  // The windows and their shutters are real recesses and frames, not a
  // drawing on the wall. Each pane has a dim interior behind its mullions.
  function window(parent, x, y) {
    const w = .016, h = .024;
    const frame = new THREE.Group(); frame.position.set(x, y, .0006);
    frame.add(box(w + .004, h + .004, .002, dark));
    const glow = canvasTexture(64, 96, (c, cw, ch) => {
      const shade = c.createLinearGradient(0, 0, cw, 0);
      shade.addColorStop(0, "#292016"); shade.addColorStop(.45, "#c3975d"); shade.addColorStop(1, "#46301b");
      c.fillStyle = shade; c.fillRect(0, 0, cw, ch);
    });
    const glass = new THREE.MeshStandardMaterial({ color: 0x30271c, roughness: .36, metalness: .18,
      emissive: 0xc7863c, emissiveMap: glow, emissiveIntensity: .55 });
    lights.push(glass);
    frame.add(box(w, h, .001, glass, { z: .0013 }));
    for (const s of [-1, 1]) {
      frame.add(box(.0012, h + .003, .002, stone, { x: s * (w / 2 + .0005), z: .002 }));
      frame.add(box(.0058, h + .001, .002, shutters, { x: s * (w / 2 + .005), z: .0008, ry: s * -.1 }));
      for (let k = 0; k < 5; k++) {
        frame.add(box(.0047, .00055, .0009, shutters, { x: s * (w / 2 + .005), y: -.009 + k * .0045, z: .002, rx: -.3 }));
      }
    }
    for (const y0 of [-h / 2, h / 2]) frame.add(box(w + .003, .0015, .0024, stone, { y: y0, z: .002 }));
    frame.add(box(.0009, h, .0018, stone, { z: .0023 }));
    frame.add(box(w, .0009, .0018, stone, { y: -.001, z: .0023 }));
    frame.add(box(w + .008, .0022, .005, stone, { y: -h / 2 - .002, z: .002 }));
    parent.add(frame);
  }
  const front = new THREE.Group(); front.position.z = D / 2;
  const side = new THREE.Group(); side.position.x = W / 2; side.rotation.y = Math.PI / 2;
  for (let row = 0; row < 3; row++) {
    const y = .129 - row * .046;
    for (let col = 0; col < 3; col++) {
      if (row === 2 && col === 1) continue;
      window(front, (col - 1) * .039, y);
    }
    for (let col = 0; col < 2; col++) window(side, (col - .5) * .045, y);
  }
  g.add(front, side);
  // A hipped roof with a short ridge, fine tiles and rounded ridge caps.
  const rw = W / 2 + .009, rd = D / 2 + .009, ridge = .027, rise = .038;
  const roof = new THREE.Group(); roof.position.y = H + base;
  function roofFace(points, uvs) {
    const geometry = new THREE.BufferGeometry(), indices = points.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs.flat(), 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    roof.add(mesh(geometry, materials.tiles));
  }
  roofFace([[-rw, 0, rd], [rw, 0, rd], [ridge, rise, 0], [-ridge, rise, 0]], [[0, 0], [1, 0], [.72, 1], [.28, 1]]);
  roofFace([[rw, 0, -rd], [-rw, 0, -rd], [-ridge, rise, 0], [ridge, rise, 0]], [[0, 0], [1, 0], [.72, 1], [.28, 1]]);
  roofFace([[rw, 0, rd], [rw, 0, -rd], [ridge, rise, 0]], [[0, 0], [1, 0], [.5, 1]]);
  roofFace([[-rw, 0, -rd], [-rw, 0, rd], [-ridge, rise, 0]], [[0, 0], [1, 0], [.5, 1]]);
  for (let x = -ridge; x < ridge; x += .006) roof.add(cyl(.0023, .0023, .0064, materials.tiles, { x, y: rise, rz: Math.PI / 2 }, 16));
  g.add(roof);
  g.add(box(.013, .032, .014, materials.tiles, { x: .034, y: H + .034, z: -.016 }));
  g.add(box(.017, .004, .018, stone, { x: .034, y: H + .051, z: -.016 }));
  g.add(box(.009, .001, .010, dark, { x: .034, y: H + .0533, z: -.016 }));
  // Recessed arched entrance, panelled green doors and brass hardware.
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-.012, 0); doorShape.lineTo(.012, 0); doorShape.lineTo(.012, .03);
  doorShape.absarc(0, .03, .012, 0, Math.PI, false); doorShape.lineTo(-.012, 0);
  const doorMat = materials.surface("paint", { color: 0x405241, roughness: .78 });
  const door = mesh(new THREE.ExtrudeGeometry(doorShape, { depth: .003, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .001, bevelThickness: .0005 }), doorMat, { y: base, z: D / 2 + .001 });
  g.add(door);
  for (const x of [-.006, .006]) {
    g.add(box(.009, .019, .0012, doorMat, { x, y: .023, z: D / 2 + .005 }));
    g.add(box(.009, .006, .0012, doorMat, { x, y: .011, z: D / 2 + .005 }));
    g.add(ball(.0011, materials.brass, { x: x * .3, y: .023, z: D / 2 + .007, sz: .7 }));
  }
  g.add(box(.032, .003, .013, stone, { y: .006, z: D / 2 + .007 }));
  g.add(box(.038, .003, .018, stone, { y: .002, z: D / 2 + .011 }));
  // An enamel HOTEL sign: the clue belongs to the toy itself.
  const sign = canvasTexture(512, 112, (c, w, h) => {
    c.fillStyle = "#ab8a53"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#4b3a25"; c.lineWidth = 8; c.strokeRect(9, 9, w - 18, h - 18);
    c.fillStyle = "#30271c"; c.font = "600 80px Georgia, serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("HOTEL", w / 2, h * .54);
  });
  g.add(box(.056, .013, .003, materials.brass, { y: .064, z: D / 2 + .003 }));
  g.add(mesh(new THREE.PlaneGeometry(.053, .0105), new THREE.MeshStandardMaterial({ map: sign, roughness: .65 }), { y: .064, z: D / 2 + .0046 }));
  const stripes = canvasTexture(256, 128, (c, w, h) => {
    c.drawImage(materials.surfaces.paper.map.image, 0, 0, w, h);
    c.fillStyle = "rgba(119,43,33,.87)";
    for (let i = 0; i < 8; i += 2) c.fillRect(i * w / 8, 0, w / 8, h);
  });
  const awningMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: .94, side: THREE.DoubleSide });
  g.add(mesh(new THREE.CylinderGeometry(.012, .012, .043, 32, 1, true, 0, Math.PI / 2), awningMat, { y: .047, z: D / 2 + .002, rz: Math.PI / 2 }));
  for (let i = 0; i < 8; i++) {
    g.add(ball(.003, i % 2 ? materials.paper : mat.paint(0x7d3027, .9), { x: -.019 + i * .0054, y: .046, z: D / 2 + .014, sx: .92, sy: .7, sz: .2 }, 16));
  }
  for (const x of [-.0205, .0205]) g.add(rod(.0009, materials.brass, [x, .006, D / 2 + .014], [x, .048, D / 2 + .014]));
  const bell = new THREE.Group(); bell.position.set(.034, .024, D / 2 + .007);
  bell.add(turned([[0, 0], [.005, 0], [.0052, .001], [.0035, .002], [.0026, .006], [.001, .007], [0, .007]], materials.brass));
  bell.add(ball(.001, materials.brass, { y: .008 }));
  g.add(bell, box(.011, .0017, .010, stone, { x: .034, y: .023, z: D / 2 + .007 }));
  g.rotation.y = -.42; g.scale.setScalar(.82);
  return { group: g, parts: { lights, bell } };
}
