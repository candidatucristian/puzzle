// Publish Room I with the desk lamp off and all four candles lit.
//   node art/blender/study_dark_publish.mjs
import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';

const source = '.artifacts/room-study-candlelight';
const target = 'public/assets/images/Room1';
await mkdir(target, { recursive: true });
for (const name of ['lights-1', 'chest-shut', 'chest-open']) {
  const alpha = name.startsWith('chest');
  await sharp(`${source}/${name}.png`)
    .webp(alpha ? { quality: 95, alphaQuality: 100, effort: 6 } : { quality: 92, effort: 6 })
    .toFile(`${target}/room1-${name}-render-v6.webp`);
  console.log(`room1-${name}-render-v6.webp`);
}
await copyFile(`${source}/Study.json`, 'src/levels/house/rooms/Study.json');
console.log('Study.json');
