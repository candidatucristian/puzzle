// Publish only the two menu tools, from their registered Cycles photographs.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const input = '.artifacts/archive-tools-v1';
const output = 'public/assets/images/ArchiveTools/native-v1';
await mkdir(output, { recursive: true });
const encode = image => image.webp({ quality: 96, alphaQuality: 100, effort: 6 });
for (const name of ['casefile', 'notebook', 'notebook-icon', 'casefile-icon']) {
  await encode(sharp(`${input}/${name}.png`)).toFile(`${output}/${name}.webp`);
}
const { width, height } = await sharp(`${input}/casefile.png`).metadata();
const cuts = [0, Math.round(width * 340 / 1480), Math.round(width * 412 / 1480), width];
for (const [i, name] of ['left', 'hinge', 'right'].entries()) {
  await encode(sharp(`${input}/casefile.png`).extract({ left: cuts[i], top: 0, width: cuts[i + 1] - cuts[i], height }))
    .toFile(`${output}/casefile-${name}.webp`);
}
await writeFile(`${output}/provenance.json`, JSON.stringify({
  renderer: 'Blender 4.5 Cycles', source: 'art/blender/archive_tools.py',
  dimensions: { casefile: [width, height] },
  slicing: { referenceWidth: 1480, left: [0, 340], hinge: [340, 412], right: [412, 1480] },
  materials: ['Poly Haven brown_leather (CC0)', 'Poly Haven crepe_satin (CC0)', 'Procedural cotton paper, linen thread and aged metal'],
}, null, 2) + '\n');
console.log('Published both archive tools and registered dossier slices.');
