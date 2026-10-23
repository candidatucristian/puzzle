import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const input = process.argv[2] || '.artifacts/top-passage-review/render';
const output = 'public/assets/images/Attic';
const meta = JSON.parse(await fs.readFile(path.join(input, 'render.json'), 'utf8'));
await fs.mkdir(output, { recursive: true });
await sharp(path.join(input, 'plate.png')).webp({ quality: 94, effort: 6 })
  .toFile(path.join(output, 'top-passage-native-v1.webp'));
for (const door of meta.doors) {
  const count = door.frames + door.latchFrames;
  const sample = path.join(input, `${door.number}/00.png`);
  const source = await sharp(sample).metadata();
  const scale = Math.min(1, 680 / source.height, 500 / source.width);
  const width = Math.round(source.width * scale), height = Math.round(source.height * scale);
  const rows = Math.ceil(count / door.columns);
  const edge = 5;
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><defs><filter id="s"><feGaussianBlur stdDeviation="1.4"/></filter></defs><rect x="${edge}" y="${edge}" width="${width-edge*2}" height="${height-edge*2}" fill="white" filter="url(#s)"/></svg>`);
  const images = [];
  for (let i = 0; i < count; i++) {
    const buffer = await sharp(path.join(input, `${door.number}/${String(i).padStart(2, '0')}.png`))
      .resize(width, height).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    images.push({ input: buffer, left: i % door.columns * width, top: Math.floor(i / door.columns) * height });
  }
  await sharp({ create: { width: width * door.columns, height: height * rows, channels: 4, background: '#00000000' } })
    .composite(images).webp({ quality: 94, alphaQuality: 100, effort: 6 })
    .toFile(path.join(output, `passage-door-${door.number}-native-v1.webp`));
  door.frameWidth = width; door.frameHeight = height;
}
await fs.writeFile('src/levels/top/passageRender.json', `${JSON.stringify(meta, null, 2)}\n`);
console.log(JSON.stringify({ plate: 'top-passage-native-v1.webp', doors: meta.doors.map(d => ({ number: d.number, frames: d.frames + d.latchFrames, width: d.frameWidth * d.columns, height: d.frameHeight * Math.ceil((d.frames+d.latchFrames)/d.columns) })) }));
