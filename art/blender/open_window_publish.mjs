import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const source='.artifacts/open-window';
const target='public/assets/images/Telescope/native-v1';
const metadata=JSON.parse(await readFile(`${source}/nativeWindow.json`,'utf8'));
await mkdir(target,{recursive:true});
for(const name of ['window','quiet','approach']) {
  await sharp(`${source}/${name}.png`).webp({quality:97,effort:6}).toFile(`${target}/${name}.webp`);
}
await writeFile('src/levels/telescope/nativeWindow.json',JSON.stringify(metadata,null,2)+'\n');
console.log('The Open Window: published native sky, Moon, window, telescope approach and matching constellation coordinates.');
