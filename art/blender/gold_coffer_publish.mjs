// Install native Cycles coffer poses and keys without changing any room plate.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const source = '.artifacts/gold-coffer-v2';
const target = 'public/assets/images/Chest/native-v2';
await mkdir(target, { recursive: true });
const data = { version: 2, poses: 13, rooms: {} };
for (const room of ['Study', 'Room2', 'Room3', 'Room4', 'Room5']) {
  const info = JSON.parse(await readFile(`${source}/${room}/coffer.json`, 'utf8'));
  const frames = [], pieces = [];
  let x = 0, y = 0, rowHeight = 0;
  for (let i = 0; i < data.poses; i++) {
    const input = `${source}/${room}/pose-${String(i).padStart(2, '0')}.png`;
    const { width, height } = await sharp(input).metadata();
    if (x + width > 2048) { x = 0; y += rowHeight + 4; rowHeight = 0; }
    frames.push([x, y, width, height]); pieces.push({ input, left: x, top: y });
    x += width + 4; rowHeight = Math.max(rowHeight, height);
    if (i === 0 || i === data.poses - 1) {
      await sharp(input).webp({ quality: 96, alphaQuality: 100, effort: 6 })
        .toFile(`${target}/${room.toLowerCase()}-chest-${i ? 'open' : 'shut'}.webp`);
    }
  }
  await sharp({ create: { width: 2048, height: y + rowHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(pieces).webp({ quality: 96, alphaQuality: 100, effort: 6 }).toFile(`${target}/${room.toLowerCase()}-poses.webp`);
  await sharp(`${source}/${room}/key.png`).webp({ quality: 96, alphaQuality: 100, effort: 6 }).toFile(`${target}/${room.toLowerCase()}-key.webp`);
  data.rooms[room] = { ...info, frames };
  console.log(room, '13 physical poses and matching room-lit key');
}
await sharp(`${source}/key-neutral.png`).webp({ quality: 96, alphaQuality: 100, effort: 6 }).toFile(`${target}/key.webp`);
await sharp({ create: { width: 1920, height: 1120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: `${source}/fallback-closed.png`, left: 0, top: 0 }, { input: `${source}/fallback-open.png`, left: 960, top: 0 }])
  .webp({ quality: 96, alphaQuality: 100, effort: 6 }).toFile(`${target}/coffer-states.webp`);
for (const state of ['closed', 'open']) {
  await sharp(`${source}/hero-${state}.png`).webp({ quality: 96, effort: 6 }).toFile(`${target}/preview-${state}.webp`);
}
await writeFile('src/levels/house/nativeCoffer.json', JSON.stringify(data, null, 2) + '\n');
console.log('Published the coffer and key throughout rooms I–V.');
