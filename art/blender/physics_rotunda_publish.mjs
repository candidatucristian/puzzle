// Publish physics_rotunda.py's native room and the armillary's cyclic poses.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const input = process.argv[2] || '.artifacts/physics-hall-review/render';
const output = 'public/assets/images/Physics';
const meta = JSON.parse(await fs.readFile(path.join(input, 'render.json'), 'utf8'));
await fs.mkdir(output, { recursive: true });
await sharp(path.join(input, 'plate.png')).webp({ quality: 94, effort: 6 }).toFile(path.join(output, 'observatory-native-v2.webp'));
if (meta.armillary) {
  const { width, height } = await sharp(path.join(input, 'motion/00.png')).metadata();
  const { frames, columns } = meta.armillary;
  const composite = Array.from({ length: frames }, (_, i) => ({
    input: path.join(input, `motion/${String(i).padStart(2, '0')}.png`),
    left: (i % columns) * width, top: Math.floor(i / columns) * height,
  }));
  await sharp({ create: { width: width * columns, height: height * Math.ceil(frames / columns), channels: 4, background: '#00000000' } })
    .composite(composite).webp({ lossless: true, effort: 6 }).toFile(path.join(output, 'armillary-native-v2.webp'));
  meta.armillary.frameWidth = width;
  meta.armillary.frameHeight = height;
}
await fs.writeFile('src/levels/top/physicsRender.json', `${JSON.stringify(meta, null, 2)}\n`);
console.log(JSON.stringify({ plate: 'observatory-native-v2.webp', armillary: meta.armillary }));
