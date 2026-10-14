import { lcg, soft, polygon, makeCanvas, addCanvasTexture } from "../../shared/paint.js";

// A small collection for the physicist: a celestial ceiling, one brass
// armillary sphere and a wall-mounted demonstration pendulum. The sphere's
// inner rings turn on a small canvas; its pedestal stays painted in the room.
const TAU = Math.PI * 2;
const line = (g, points, color, width = 1) => {
  g.beginPath();
  points.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
  g.strokeStyle = color; g.lineWidth = width; g.stroke();
};
const ellipse = (g, x, y, rx, ry, color) => {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fillStyle = color; g.fill();
};
const gradient = (g, x0, y0, x1, y1, stops) => {
  const paint = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, color]) => paint.addColorStop(at, color));
  return paint;
};

export function paintPlanetarium(g, L, at) {
  const rnd = lcg(1867), u = L.u;
  g.save();
  // The projection follows the dome's curved plaster, including its rim.
  const rim = [];
  for (let d = -104; d <= 104; d += 2) rim.push(at(d, 0.8));
  polygon(g, [{ x: -L.W, y: -L.H }, { x: L.W * 2, y: -L.H }, ...rim.reverse()]);
  g.clip();
  soft(g, L.W * 0.5, L.H * 0.09, L.W * 0.44, L.H * 0.28, "76,105,151", 0.12, "lighter");

  // A few hairline coordinate arcs, with an engraved scale by the cornice.
  for (const lift of [12, 28]) {
    const points = [];
    for (let d = -82; d <= 82; d += 1) points.push(at(d, lift));
    line(g, points, "rgba(152,170,196,0.12)", Math.max(0.45, u * 0.55));
  }
  const scale = [];
  for (let d = -90; d <= 90; d++) scale.push(at(d, 2.2));
  line(g, scale, "rgba(168,154,109,0.36)", Math.max(0.6, u * 0.7));
  for (let d = -88; d <= 88; d += 2) {
    line(g, [at(d, 2.2), at(d, d % 10 === 0 ? 4 : 2.9)], "rgba(184,169,124,0.4)", Math.max(0.5, u * 0.6));
  }

  // Tiny varied points of light, without oversized flares or star icons.
  for (let i = 0; i < 108; i++) {
    const p = at((rnd() - 0.5) * 164, 5 + rnd() * 48);
    if (p.y < 2 || p.y > L.H * 0.32) continue;
    const radius = (0.3 + rnd() * 0.48) * u, alpha = 0.24 + rnd() * 0.42;
    ellipse(g, p.x, p.y, radius, radius, `rgba(202,216,234,${alpha})`);
  }

  // Familiar silhouettes on a decorative chart: Cassiopeia, Cygnus, Lyra.
  // Their lines, like the graticule, curve over the actual ceiling surface.
  const groups = [
    { at: [-43, 13], points: [[-12, 3], [-6, -2], [0, 3], [5, -1], [11, 7]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]], warm: 1 },
    { at: [1, 16], points: [[0, 14], [0, 5], [0, -8], [-13, 3], [13, 6]], edges: [[0, 1], [1, 2], [3, 1], [1, 4]], warm: -1 },
    { at: [43, 14], points: [[-8, 8], [-3, 3], [6, 4], [8, -3], [-1, -4]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]], warm: -1 },
  ];
  for (const group of groups) {
    const surface = group.points.map(([d, lift]) => [group.at[0] + d, group.at[1] + lift]);
    for (const [a, b] of group.edges) {
      const points = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        points.push(at(surface[a][0] * (1 - t) + surface[b][0] * t, surface[a][1] * (1 - t) + surface[b][1] * t));
      }
      line(g, points, "rgba(151,180,212,0.38)", Math.max(0.55, u * 0.7));
    }
    surface.forEach(([d, lift], i) => {
      const p = at(d, lift), r = (i === 0 ? 1.55 : 1.05) * u;
      const color = i === group.warm ? "225,204,161" : "202,221,243";
      soft(g, p.x, p.y, r * 4, r * 4, color, 0.19, "lighter");
      ellipse(g, p.x, p.y, r, r, `rgba(${color},0.92)`);
      ellipse(g, p.x - r * 0.13, p.y - r * 0.13, r * 0.35, r * 0.35, "rgba(246,246,232,0.85)");
    });
  }
  g.restore();
}

// Lathed walnut and brass: several narrow highlights describe the rounded
// surface, with fine wear instead of an outline around the entire object.
function lathe(g, y0, y1, profile, metal = false) {
  const width = Math.max(...profile.map(([, r]) => r));
  const points = profile.map(([t, r]) => ({ x: -r, y: y0 + (y1 - y0) * t }));
  for (const [t, r] of [...profile].reverse()) points.push({ x: r, y: y0 + (y1 - y0) * t });
  polygon(g, points);
  g.fillStyle = gradient(g, -width, 0, width, 0, metal
    ? [[0, "#302a1c"], [0.18, "#8a794d"], [0.36, "#c1af79"], [0.46, "#9b8759"], [0.7, "#615233"], [1, "#211c15"]]
    : [[0, "#130e0b"], [0.24, "#403121"], [0.4, "#634c32"], [0.53, "#4a3724"], [0.8, "#271d14"], [1, "#120e0b"]]);
  g.fill();
}

export function paintArmillaryBase(g, L) {
  const foot = L.armillary, k = foot.s;
  g.save(); g.translate(foot.x, foot.y); g.scale(k, k);
  soft(g, 7, 3, 49, 8, "0,0,0", 0.67);
  // A narrow turned pedestal, keeping the doors and the window clear.
  ellipse(g, 0, -2, 32, 9, "#130e0a");
  lathe(g, -4, -17, [[0, 30], [0.14, 30], [0.3, 25], [0.72, 24], [1, 17]]);
  lathe(g, -16, -69, [[0, 17], [0.1, 17], [0.17, 11], [0.27, 8], [0.65, 7], [0.84, 11], [0.93, 15], [1, 15]]);
  lathe(g, -69, -80, [[0, 23], [0.22, 27], [0.35, 27], [0.72, 30], [1, 30]]);
  ellipse(g, 0, -80, 30, 8, "#4d3b27");
  ellipse(g, 0, -80.3, 27, 6.5, "#33291d");
  lathe(g, -81, -100, [[0, 11], [0.13, 12], [0.24, 8], [0.4, 5], [0.76, 4], [1, 8]], true);
  const rnd = lcg(721);
  for (let i = 0; i < 42; i++) {
    const y = -18 - rnd() * 49, x = (rnd() - 0.5) * 13;
    line(g, [{ x, y }, { x: x + 0.4, y: y - 2 - rnd() * 4 }], "rgba(170,135,83,0.08)", 0.35);
  }

  g.restore();
}

function paintArmillaryGlobe(g, phase) {
  g.save();
  // The bands are actual intersecting planes in 3-D. Sorting their small
  // faces gives proper near/far occlusion around the globe and the axle.
  const view = ([x, y, z]) => {
    const yaw = -0.38, pitch = 0.16;
    const xx = x * Math.cos(yaw) + z * Math.sin(yaw), zz = z * Math.cos(yaw) - x * Math.sin(yaw);
    return { x: xx, y: y * Math.cos(pitch) - zz * Math.sin(pitch), z: zz * Math.cos(pitch) + y * Math.sin(pitch) };
  };
  const pieces = [];
  const band = (radius, width, basisA, basisB, scaleMarks = false, turn = 0) => {
    const cos = Math.cos(turn), sin = Math.sin(turn);
    const point = (a, r) => {
      const [x, y, z] = basisA.map((v, i) => r * (v * Math.cos(a) + basisB[i] * Math.sin(a)));
      return view([x * cos + z * sin, y, z * cos - x * sin]);
    };
    const n = 160;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n, b = (i + 1) * TAU / n;
      const p = [point(a, radius - width / 2), point(b, radius - width / 2), point(b, radius + width / 2), point(a, radius + width / 2)];
      const light = 0.56 + 0.3 * Math.cos(a + 1.2) + 0.1 * Math.sin(a * 7);
      const rgb = [168, 144, 91].map(c => Math.round(c * light));
      pieces.push({ z: p.reduce((s, q) => s + q.z, 0) / 4, draw: () => {
        polygon(g, p); g.fillStyle = `rgb(${rgb.join(",")})`; g.fill();
        line(g, [p[3], p[2]], "rgba(220,207,159,0.55)", 0.38);
        line(g, [p[0], p[1]], "rgba(25,24,17,0.65)", 0.45);
        if (scaleMarks && i % 2 === 0) line(g, [point(a, radius + width * 0.35), point(a, radius - width * (i % 10 === 0 ? 0.33 : 0.02))], "rgba(32,30,20,0.8)", 0.4);
      } });
    }
  };
  // Horizon, meridian, equator, colure and the inclined ecliptic band.
  band(35, 3.2, [1, 0, 0], [0, 0, 1], true);
  band(32.8, 2.5, [1, 0, 0], [0, 1, 0], true);
  band(28.5, 1.2, [1, 0, 0], [0, 0.4, 0.9165], false, phase);
  band(28.5, 1.2, [0, 1, 0], [0, 0, 1], false, phase);
  band(30, 4.1, [0.92, -0.392, 0], [0.1568, 0.368, 0.9165], true, phase);
  const axis0 = view([0, -36, 0]), axis1 = view([0, 36, 0]);
  pieces.push({ z: 0.1, draw: () => {
    line(g, [axis0, axis1], "#9f8d5a", 1.3);
    const ball = g.createRadialGradient(-2.4, -2.8, 0.3, 0, 0, 6.8);
    ball.addColorStop(0, "#bcbd9b"); ball.addColorStop(0.25, "#6e8c7b"); ball.addColorStop(0.65, "#425b53"); ball.addColorStop(1, "#142323");
    ellipse(g, 0, 0, 6.8, 6.8, ball);
    line(g, [{ x: -5, y: 0 }, { x: 0, y: 1.5 }, { x: 5.5, y: 0 }], "rgba(177,165,115,0.45)", 0.55);
  } });
  pieces.sort((a, b) => b.z - a.z).forEach(p => p.draw());
  for (const p of [axis0, axis1]) ellipse(g, p.x, p.y, 2.2, 1.4, "#a38e5d");
  g.restore();
}

export function createArmillaryArt(scene, L, key, shade, phase = 0) {
  const foot = L.armillary, k = foot.s, cx = foot.x, cy = foot.y - 130 * k;
  const radius = 39 * k + 2;
  const box = { x: Math.floor(cx - radius), y: Math.floor(cy - radius), width: Math.ceil(radius * 2 + 1), height: Math.ceil(radius * 2 + 1) };
  const density = 2;
  const canvas = makeCanvas(box.width * density, box.height * density), g = canvas.getContext("2d");
  // Cache the room's light over this tiny patch, so a moving ring has the
  // same moonlight, shadow and grain as the stationary pedestal below it.
  const mask = makeCanvas(canvas.width, canvas.height), m = mask.getContext("2d");
  m.setTransform(density, 0, 0, density, -box.x * density, -box.y * density);
  shade(m, L);
  const texture = addCanvasTexture(scene.textures, key, canvas);
  const image = scene.add.image(box.x, box.y, key).setOrigin(0, 0).setDisplaySize(box.width, box.height).setDepth(-9);
  const draw = angle => {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.save();
    g.translate((cx - box.x) * density, (cy - box.y) * density); g.scale(k * density, k * density);
    paintArmillaryGlobe(g, angle);
    g.restore();
    g.save(); g.globalCompositeOperation = "source-atop"; g.drawImage(mask, 0, 0); g.restore();
    texture.refresh();
  };
  draw(phase);
  return {
    image, box, phase, elapsed: 0,
    update(delta) {
      const step = Math.min(delta, 100);
      this.phase = (this.phase + step * TAU / 48000) % TAU;
      this.elapsed += step;
      if (this.elapsed < 50) return;
      this.elapsed %= 50;
      draw(this.phase);
    },
  };
}

// A compact laboratory pendulum, at rest, on a walnut mounting board.
// Coordinates here belong to the unrolled wall, before its projection.
export function paintPendulum(g, x, y) {
  g.save(); g.translate(x, y);
  soft(g, 4, 81, 48, 100, "0,0,0", 0.4);
  g.fillStyle = "#130f0b"; g.fillRect(-33, -3, 66, 171);
  g.fillStyle = gradient(g, -31, 0, 31, 0, [[0, "#493722"], [0.25, "#342a1e"], [0.75, "#2c251b"], [1, "#57412a"]]);
  g.fillRect(-31, -1, 62, 166);
  g.strokeStyle = "#776446"; g.lineWidth = 0.8; g.strokeRect(-28, 2, 56, 160);
  for (const yy of [8, 156]) for (const xx of [-23, 23]) {
    ellipse(g, xx, yy, 1.7, 1.7, "#8e805d");
    line(g, [{ x: xx - 1, y: yy }, { x: xx + 1, y: yy }], "#211e16", 0.6);
  }
  // Graduated arc behind the bob, not a clock face.
  g.beginPath(); g.arc(0, 23, 112, Math.PI * 0.43, Math.PI * 0.57);
  g.strokeStyle = "#a5966f"; g.lineWidth = 5; g.stroke();
  for (let i = -6; i <= 6; i++) {
    const a = Math.PI / 2 + i * 0.034;
    line(g, [{ x: Math.cos(a) * 109, y: 23 + Math.sin(a) * 109 }, { x: Math.cos(a) * (i % 3 ? 112 : 114), y: 23 + Math.sin(a) * (i % 3 ? 112 : 114) }], "#353328", 0.6);
  }
  g.fillStyle = "#7b7358"; g.fillRect(-13, 15, 26, 9);
  ellipse(g, 0, 24, 4, 4, "#b4aa86");
  line(g, [{ x: 2, y: 26 }, { x: 2, y: 126 }], "rgba(0,0,0,0.7)", 2.5);
  line(g, [{ x: 0, y: 26 }, { x: 0, y: 126 }], "#9ca49a", 1.2);
  line(g, [{ x: -0.4, y: 26 }, { x: -0.4, y: 125 }], "#d0ccb2", 0.45);
  const bob = g.createRadialGradient(-4, 112, 0.8, 0, 117, 13);
  bob.addColorStop(0, "#ded0a0"); bob.addColorStop(0.24, "#b29d65"); bob.addColorStop(0.65, "#79663e"); bob.addColorStop(1, "#302b1d");
  ellipse(g, 0, 117, 12, 12, bob);
  line(g, [{ x: 0, y: 129 }, { x: 0, y: 133 }], "#b2a276", 1);
  g.restore();
}
