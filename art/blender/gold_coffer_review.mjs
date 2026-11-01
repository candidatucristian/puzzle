// Composite the real alpha render over the existing room plate for visual review.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const [room = 'Study', plate = 'public/assets/images/Room1/room1-lights-1-render-v7.webp'] = process.argv.slice(2);
const spec = JSON.parse(await readFile(`src/levels/house/rooms/${room}.json`, 'utf8'));
const [left, top, width, height] = spec.chest.box;
for (const [name, pose] of [['closed', '00'], ['open', '12']]) {
  const input = await sharp(`.artifacts/gold-coffer-v2/${room}/pose-${pose}.png`).resize(width, height).png().toBuffer();
  await sharp(plate).resize(1880, 1000).composite([{ input, left, top }]).webp({ quality: 96 })
    .toFile(`.artifacts/gold-coffer-v2/${room}/review-${name}.webp`);
}
console.log(`${room}: closed and open room composites ready for visual inspection.`);
