// Publishes authored Cycles images and the native envelope; no browser or checks.
import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
const source = '.artifacts/decoder-manor-v3';
const target = 'public/assets/images/DecoderBook/v3';
await mkdir(target, { recursive: true });
for (const name of ['folio-open', 'folio-closed', 'diploma-stock', 'diploma-display', 'notes-stock', 'reward-envelope']) {
  await sharp(`${source}/${name}.png`).webp({ quality: 96, alphaQuality: 100, effort: 5 }).toFile(`${target}/${name}.webp`);
}
await copyFile(`${source}/reward-envelope.glb`, `${target}/reward-envelope.glb`);
await copyFile(`${source}/manorArt.json`, 'src/ui/decoderBook/manorArt.json');
await copyFile('public/assets/images/DecoderBook/v2/diploma-stock.webp', `${target}/diploma-print.webp`);
console.log('Published the manor folio, paper cutouts and native reward envelope.');
