// Package the inspected Cycles plate and the landmarks from its own camera.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const input = resolve(root, process.argv[2] || '.artifacts/basement-native/render');
const output = resolve(root, 'public/assets/images/TapCode');
const meta = JSON.parse(await readFile(resolve(input, 'render.json'), 'utf8'));
const expected = [[1, 5], [4, 4], [1, 3], [1, 1], [4, 1], [1, 5]];
if (JSON.stringify(meta.cluePairs) !== JSON.stringify(expected) || meta.engravedMarks !== 31 ||
    meta.rack.columns !== 5 || meta.rack.rows !== 5) {
  throw new Error('The rendered cellar must preserve all six cipher pairs and the 5 by 5 rack.');
}
const image = sharp(resolve(input, 'plate.png'));
const size = await image.metadata();
if (Math.abs(size.width / size.height - meta.width / meta.height) > .002) {
  throw new Error('Blender plate dimensions do not match its exported camera.');
}
await mkdir(output, { recursive: true });
await image.webp({ quality: 95, effort: 6 }).toFile(resolve(output, 'cellar-native-v1.webp'));
await writeFile(resolve(root, 'src/levels/tapcode/nativeCellar.json'), `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Published native cellar ${size.width} x ${size.height}, 31 engraved marks, 25 rack openings.`);
