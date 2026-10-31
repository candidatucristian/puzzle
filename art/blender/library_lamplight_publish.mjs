// Puzzle data preparation and publication of the original Cycles library.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { BOOKS } from '../../src/levels/bookshelf/puzzle.js';

const source = '.artifacts/library-lamplight';
const target = 'public/assets/images/Bookshelf/native-v1';
await mkdir(source, { recursive: true });
await writeFile(`${source}/books.json`, JSON.stringify(BOOKS, null, 2));
if (!process.argv.includes('--prepare')) {
  await mkdir(target, { recursive: true });
  const layout = JSON.parse(await readFile(`${source}/library.json`, 'utf8'));
  await sharp(`${source}/plate.png`).webp({ quality: 95, effort: 6 }).toFile(`${target}/library.webp`);
  const pieces = [];
  let x = 0, y = 0, rowHeight = 0;
  for (const book of layout.books) {
    book.frames = [];
    for (let pose = 0; pose < layout.poses; pose++) {
      const input = `${source}/book-${book.index}-${pose}.png`;
      const { width, height } = await sharp(input).metadata();
      if (x + width > 2048) { x = 0; y += rowHeight + 2; rowHeight = 0; }
      pieces.push({ input, left: x, top: y });
      book.frames.push([x, y, width, height]);
      x += width + 2;
      rowHeight = Math.max(rowHeight, height);
    }
  }
  await sharp({ create: { width: 2048, height: y + rowHeight, channels: 4, background: '#090807' } })
    .composite(pieces).webp({ quality: 97, effort: 6 }).toFile(`${target}/books.webp`);
  await writeFile('src/levels/bookshelf/nativeLibrary.json', `${JSON.stringify(layout, null, 2)}\n`);
  console.log(`Published Cycles library and ${pieces.length} physical book poses.`);
}
