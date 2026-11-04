// Room I, version 5 (room_study_v5.py, 2026-11-03: matte, lit by its desk
// lamp, the tall bookcase gone for a rose on the wall, no candle alight):
// its plate as room1-lights-1-render-v9.webp and where everything fell in the
// picture (src/levels/house/rooms/Study.json); with --coffer, its coffer's
// thirteen poses and key rendered in that same light (gold_coffer_rooms.py
// --room Study) into Chest/native-v<n>, for Room I alone — the other rooms'
// coffers untouched. roomRender.js names the plate's version.
//
//   node art/blender/study_publish_v5.mjs [--coffer 7]
import sharp from 'sharp';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const source = '.artifacts/room-study-v5', target = 'public/assets/images/Room1';
await mkdir(target, { recursive: true });
// (--plate n: the plate's version; v10 since 2026-11-04, its desk lamp out)
const plate = option('--plate', '9');
await sharp(`${source}/lights-1.png`).webp({ quality: 92, effort: 6 }).toFile(`${target}/room1-lights-1-render-v${plate}.webp`);
console.log(`room1-lights-1-render-v${plate}.webp`);
await copyFile(`${source}/Study.json`, 'src/levels/house/rooms/Study.json');
console.log('Study.json');

const cofferVersion = option('--coffer', null);
if (cofferVersion) {
  const from = '.artifacts/gold-coffer-v2/Study', to = `public/assets/images/Chest/native-v${cofferVersion}`;
  await mkdir(to, { recursive: true });
  const info = JSON.parse(await readFile(`${from}/coffer.json`, 'utf8'));
  const frames = [], pieces = [];
  let x = 0, y = 0, rowHeight = 0;
  for (let i = 0; i < 13; i++) {
    const input = `${from}/pose-${String(i).padStart(2, '0')}.png`;
    const { width, height } = await sharp(input).metadata();
    if (x + width > 2048) { x = 0; y += rowHeight + 4; rowHeight = 0; }
    frames.push([x, y, width, height]); pieces.push({ input, left: x, top: y });
    x += width + 4; rowHeight = Math.max(rowHeight, height);
    if (i === 0 || i === 12) await sharp(input).webp({ quality: 96, alphaQuality: 100, effort: 6 }).toFile(`${to}/study-chest-${i ? 'open' : 'shut'}.webp`);
  }
  await sharp({ create: { width: 2048, height: y + rowHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(pieces).webp({ quality: 96, alphaQuality: 100, effort: 6 }).toFile(`${to}/study-poses.webp`);
  await sharp(`${from}/key.png`).webp({ quality: 96, alphaQuality: 100, effort: 6 }).toFile(`${to}/study-key.webp`);
  const coffers = JSON.parse(await readFile('src/levels/house/nativeCoffer.json', 'utf8'));
  coffers.rooms.Study = { ...info, frames, artVersion: Number(cofferVersion) };
  await writeFile('src/levels/house/nativeCoffer.json', JSON.stringify(coffers, null, 2) + '\n');
  console.log(`Room I's coffer: 13 poses and its key, native-v${cofferVersion}`);
}
