// Room I, version 4 (room_study_v4.py: the study seen low and straight across
// to its back wall): its plate and the chest shut and open, into the game as
// room1-*-render-v4.webp, and where everything fell in the picture
// (src/levels/house/rooms/Study.json). roomRender.js names the version.
//
//   node art/blender/study_publish_v4.mjs
import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';
const source = '.artifacts/room-study-v4';
const target = 'public/assets/images/Room1';
await mkdir(target, { recursive: true });
for (const name of ['lights-1', 'chest-shut', 'chest-open']) {
  const alpha = name.startsWith('chest');
  await sharp(`${source}/${name}.png`)
    .webp(alpha ? { quality: 95, alphaQuality: 100, effort: 6 } : { quality: 92, effort: 6 })
    .toFile(`${target}/room1-${name}-render-v4.webp`);
  console.log(`room1-${name}-render-v4.webp`);
}
await copyFile(`${source}/Study.json`, 'src/levels/house/rooms/Study.json');
console.log('Study.json');
