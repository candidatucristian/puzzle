// The Olympiad's medals as the live room hangs them (levels/room6/
// liveRoom6.js): for each, from its die (the height map reliefs.mjs draws,
// as medals.py strikes it), the three maps a real-time metal needs —
//   <name>-color.webp   bright where it stands proud and was rubbed, gone to
//                       patina where it lies low; the Brazilian one's enamel
//   <name>-orm.webp     roughness in green, metalness in blue (glTF's way)
//   <name>-normal.webp  the relief, as the light should find it
//
//   node art/blender/medal_maps.mjs [dies] [out]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const sharp = require("sharp");
const DIES = process.argv[2] ?? "C:/Users/crist/Tools/render/assets/medals";
const OUT = process.argv[3] ?? new URL("../../public/assets/images/Room6/live/medals", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
mkdirSync(OUT, { recursive: true });
const N = 256;

// the metal bright and its patina, linear (as medals.py has them)
const MEDALS = {
  de_leaf: [[0.5, 0.33, 0.18], [0.05, 0.035, 0.022]],
  br_fern: [[0.56, 0.37, 0.2], [0.055, 0.04, 0.024]],
  ie_shamrock: [[0.7, 0.69, 0.66], [0.06, 0.058, 0.054]],
  fi_sprig: [[0.8, 0.58, 0.25], [0.1, 0.065, 0.025]],
  ng_flower: [[0.72, 0.36, 0.22], [0.075, 0.035, 0.022]],
  br_flag: [[0.58, 0.4, 0.21], [0.055, 0.04, 0.024]],
};

const grey = async (path, size = N) => {
  const { data, info } = await sharp(path).resize(size, size, { kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) out[i] = data[i * info.channels] / 255;
  return out;
};
const rgb = async (path) => {
  const { data, info } = await sharp(path).resize(N, N, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, ch: info.channels };
};
const srgb = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// a little value noise, for where the patina gathers
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const noise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y) => noise(x, y) * 0.5 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.2;
const write = (buf, name) => sharp(buf, { raw: { width: N, height: N, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/${name}.webp`);

for (const [name, [bright, patina]] of Object.entries(MEDALS)) {
  const h = await grey(`${DIES}/${name}_height.png`);
  const enamel = name === "br_flag" ? await rgb(`${DIES}/${name}_enamel.png`) : null;
  const cells = name === "br_flag" ? await grey(`${DIES}/${name}_cells.png`) : null;
  const colour = Buffer.alloc(N * N * 3), orm = Buffer.alloc(N * N * 3), normal = Buffer.alloc(N * N * 3);
  const at = (x, y) => h[Math.min(N - 1, Math.max(0, y)) * N + Math.min(N - 1, Math.max(0, x))];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, v = h[i];
    // rubbed bright on what stands proud, patina where it lies low or gathers
    const worn = Math.max(0, smooth(0.34, 0.52, v) - 0.45 * smooth(0.4, 0.7, fbm(x / 22, y / 22)));
    const k = cells ? cells[i] * (fbm(x / 9 + 40, y / 9) > 0.72 ? 0 : 1) : 0;
    for (let c = 0; c < 3; c++) {
      const metal = patina[c] * 2.2 + (bright[c] - patina[c] * 2.2) * worn;
      const glaze = enamel ? (enamel.data[i * enamel.ch + c] / 255) ** 2.2 * 0.62 : 0;
      colour[i * 3 + c] = srgb(metal * (1 - k) + glaze * k);
    }
    orm[i * 3] = 255;
    orm[i * 3 + 1] = Math.round(255 * ((0.62 - 0.32 * worn) * (1 - k) + 0.34 * k));
    // (patina is no longer bright metal: an oxide, dull and coloured)
    orm[i * 3 + 2] = Math.round(255 * (0.3 + 0.7 * worn) * (1 - k));
    // the relief's slope, from its die (a struck relief is about a twentieth
    // of the medal's radius high); green up the picture, as three.js reads it
    const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
    const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
    const s = 0.05 * N / 2;
    let nx = -gx * s, ny = gy * s, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    normal[i * 3] = Math.round((nx * 0.5 + 0.5) * 255);
    normal[i * 3 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    normal[i * 3 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
  }
  await write(colour, `${name}-color`); await write(orm, `${name}-orm`); await write(normal, `${name}-normal`);
  console.log("maps", name);
}
