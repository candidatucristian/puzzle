// Publish the Cycles frames as one WebP atlas, plus the static fallback.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = new URL('../../.artifacts/hall-guide/', import.meta.url);
const destination = new URL('../../public/assets/images/Interface/', import.meta.url);
const metadata = JSON.parse(await readFile(new URL('door.json', source), 'utf8'));
const { width, height, frames, columns } = metadata;
await mkdir(destination, { recursive: true });
const tiles = await Promise.all(Array.from({length: frames}, async (_, frame) => ({
  input: await readFile(new URL(`door-${String(frame).padStart(2,'0')}.png`,source)),
  left: (frame % columns) * width,
  top: Math.floor(frame / columns) * height,
})));
await sharp({create: {width: width * columns,height: height * Math.ceil(frames / columns),channels: 3,background:'#080b09'}})
  .composite(tiles).webp({quality: 87,effort: 6})
  .toFile(fileURLToPath(new URL('hall-guide-door-atlas-v1.webp',destination)));
await sharp(fileURLToPath(new URL('door-00.png', source))).webp({quality:88})
  .toFile(fileURLToPath(new URL('hall-guide-door-poster-v1.webp',destination)));
await writeFile(new URL('../../src/ui/hallGuideDoor.json',import.meta.url),JSON.stringify(metadata,null,2)+'\n');
console.log('Published hall guide:',frames,'Cycles frames,',width+'×'+height);

