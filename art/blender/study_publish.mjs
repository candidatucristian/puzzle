// Publish Room I's plate, matching chest cutouts, then its projected hotspots.
// Usage: node art/blender/study_publish.mjs
import sharp from 'sharp';
import {copyFile, mkdir} from 'node:fs/promises';
const source='.artifacts/room-study';
const target='public/assets/images/Room1';
await mkdir(target,{recursive:true});
for (const name of ['lights-1','chest-shut','chest-open']) {
  const alpha=name.startsWith('chest');
  await sharp(`${source}/${name}.png`)
    .webp(alpha?{quality:95,alphaQuality:100,effort:6}:{quality:94,effort:6})
    .toFile(`${target}/room1-${name}-render-v3.webp`);
}
await copyFile(`${source}/Study.json`,'src/levels/house/rooms/Study.json');
console.log('Room I: published the matching specimen book, existing chest states and interaction layout.');
