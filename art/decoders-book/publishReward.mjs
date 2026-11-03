// Exports the real Cycles renders. This script does not open a browser.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, '.artifacts/decoder-reward-v2');
const target = path.join(root, 'public/assets/images/DecoderBook/v2');
const art = JSON.parse(await readFile(path.join(source, 'art.json'), 'utf8'));
await mkdir(target, { recursive: true });
await sharp(path.join(source, 'stage.png')).webp({ quality: 95 }).toFile(path.join(target, 'stage.webp'));
await sharp(path.join(source, 'stage.png')).extract({ left: 0, top: 0, width: 550, height: 1000 })
  .webp({ quality: 93 }).toFile(path.join(target, 'desk-detail.webp'));
await sharp(path.join(source, 'diploma-stock.png')).webp({ quality: 96, alphaQuality: 100 }).toFile(path.join(target, 'diploma-stock.webp'));
await sharp(path.join(source, `cover-${String(art.frameCount - 1).padStart(2, '0')}.png`))
  .webp({ quality: 94, alphaQuality: 100 }).toFile(path.join(target, 'cover-open.webp'));
for (const [pose, label] of [[0, 'closed'], [art.frameCount - 1, 'open']]) {
  const combined = await sharp(path.join(source, 'stage.png')).resize(art.frameWidth, art.frameHeight)
    .composite([{ input: path.join(source, `cover-${String(pose).padStart(2, '0')}.png`) }])
    .png().toBuffer();
  const picture = sharp(combined);
  if (label === 'closed') picture.extract({ left: 440, top: 100, width: 500, height: 400 });
  await picture.webp({ quality: 95 }).toFile(path.join(target, `folio-${label}.webp`));
}

const cellWidth = art.frameWidth + 4, cellHeight = art.frameHeight + 4;
const atlasWidth = cellWidth * 4, atlasHeight = cellHeight * 3;
const frames = [], atlases = [];
for (let first = 0; first < art.frameCount; first += 12) {
  const atlas = atlases.length, filename = `opening-${atlas}.webp`, overlays = [];
  for (let local = 0; local < 12 && first + local < art.frameCount; local++) {
    const x = local % 4 * cellWidth + 2, y = Math.floor(local / 4) * cellHeight + 2;
    overlays.push({ input: path.join(source, `cover-${String(first + local).padStart(2, '0')}.png`), left: x, top: y });
    frames.push({ atlas, x, y });
  }
  await sharp({ create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(overlays).webp({ quality: 94, alphaQuality: 100, effort: 5 }).toFile(path.join(target, filename));
  atlases.push({ file: filename, width: atlasWidth, height: atlasHeight });
}
await writeFile(path.join(root, 'src/ui/decoderBook/rewardArt.json'), JSON.stringify({ ...art, atlases, frames }, null, 2) + '\n');
console.log('Decoder folio, diploma stock and opening atlases exported.');
