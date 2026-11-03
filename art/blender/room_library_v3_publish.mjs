// Publish only Room II's reviewed Cycles assets and matching camera geometry.
import sharp from 'sharp';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { BOOKS } from '../../src/levels/bookshelf/puzzle.js';

const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const source = option('--source', '.artifacts/room-library-v3');
const roomVersion = Number(option('--version', '3'));
const cofferVersion = Number(option('--coffer-version', '4'));
await mkdir(source, { recursive: true });
await writeFile(`${source}/books.json`, JSON.stringify(BOOKS, null, 2) + '\n');
if (process.argv.includes('--prepare')) process.exit(0);

const target = 'public/assets/images/Room2';
const cofferTarget = `public/assets/images/Chest/native-v${cofferVersion}`;
await mkdir(target, { recursive: true });
await mkdir(cofferTarget, { recursive: true });
const layout = JSON.parse(await readFile(`${source}/room.json`, 'utf8'));
const metadata = await sharp(`${source}/lights-1.png`).metadata();
if (Math.abs(metadata.width / metadata.height - layout.width / layout.height) > .002) {
  throw new Error('Room photograph and projected coordinates have different aspect ratios.');
}
await sharp(`${source}/lights-1.png`).webp({ quality: 96, effort: 6 })
  .toFile(`${target}/room2-lights-1-render-v${roomVersion}.webp`);

const frames = [], pieces = [];
let x = 0, y = 0, rowHeight = 0;
for (let pose = 0; pose < 13; pose++) {
  const input = `${source}/pose-${String(pose).padStart(2, '0')}.png`;
  const { width, height } = await sharp(input).metadata();
  if (x + width > 2048) { x = 0; y += rowHeight + 4; rowHeight = 0; }
  frames.push([x, y, width, height]); pieces.push({ input, left: x, top: y });
  x += width + 4; rowHeight = Math.max(rowHeight, height);
  if (pose === 0 || pose === 12) {
    await sharp(input).webp({ quality: 97, alphaQuality: 100, effort: 6 })
      .toFile(`${cofferTarget}/room2-chest-${pose ? 'open' : 'shut'}.webp`);
  }
}
await sharp({ create: { width: 2048, height: y + rowHeight, channels: 4, background: '#00000000' } })
  .composite(pieces).webp({ quality: 97, alphaQuality: 100, effort: 6 }).toFile(`${cofferTarget}/room2-poses.webp`);
await sharp(`${source}/key.png`).webp({ quality: 97, alphaQuality: 100, effort: 6 }).toFile(`${cofferTarget}/room2-key.webp`);
const coffers = JSON.parse(await readFile('src/levels/house/nativeCoffer.json', 'utf8'));
coffers.rooms.Room2 = { room: 'Room2', crop: layout.chest.box, poses: 13, artVersion: cofferVersion, frames };
await copyFile(`${source}/room.json`, 'src/levels/house/rooms/Room2.json');
await writeFile('src/levels/house/nativeCoffer.json', JSON.stringify(coffers, null, 2) + '\n');
console.log(`Published Room II at ${metadata.width} × ${metadata.height}, its camera geometry and 13 coffer poses.`);
