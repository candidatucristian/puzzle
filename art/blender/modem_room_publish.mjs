import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = '.artifacts/modem-native';
const target = 'public/assets/images/Modem/native-v1';
const layout = JSON.parse(await readFile(`${source}/nativeModem.json`, 'utf8'));
await mkdir(target, { recursive: true });
await sharp(`${source}/room.png`).webp({ quality: 98, effort: 6 }).toFile(`${target}/room.webp`);
const { data: base, info } = await sharp(`${source}/room.png`).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
const litPreview = Buffer.from(base);
const smooth = (v) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
for (let i = 0; i < layout.leds.length; i++) {
  const led = layout.leds[i], crop = led.crop;
  const { data: lit, info: litInfo } = await sharp(`${source}/led-${String(i).padStart(2, '0')}.png`)
    .removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  // Border renders are tightly cropped by Cycles, with the same pixel grid
  // as the full plate. Keep only the extra light, including its desk reflection.
  crop.width = litInfo.width; crop.height = litInfo.height;
  const delta = Buffer.alloc(crop.width * crop.height * 3);
  for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
    const p = (y * crop.width + x) * 3;
    const b = ((crop.y + y) * info.width + crop.x + x) * 3;
    // Keep the optical core intact; let the long reflected light disappear
    // gradually into the timber, well before the border of the render crop.
    const side = smooth(Math.min(x, crop.width - 1 - x) / (crop.width * .36));
    const top = smooth(y / 18);
    const tail = smooth((crop.height - 1 - y) / (crop.height * .60));
    const feather = side * top * tail;
    for (let c = 0; c < 3; c++) {
      delta[p + c] = Math.round(Math.max(0, lit[p + c] - base[b + c] - 1) * feather);
      litPreview[b + c] = Math.min(255, litPreview[b + c] + delta[p + c]);
    }
  }
  await sharp(delta, { raw: { width: crop.width, height: crop.height, channels: 3 } })
    .png({ compressionLevel: 9 }).toFile(`${target}/led-${i}.png`);
}
await sharp(litPreview, { raw: { width: info.width, height: info.height, channels: 3 } })
  .webp({ quality: 97 }).toFile(`${source}/lit-preview.webp`);
await writeFile('src/levels/modem/nativeModem.json', JSON.stringify(layout, null, 2) + '\n');
console.log('Router room published: original Cycles plate and twelve separately rendered LED/reflection layers.');
