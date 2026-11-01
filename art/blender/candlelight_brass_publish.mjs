import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const source='.artifacts/candlelight-brass';
const target='public/assets/images/Cryptex/native-v1';
await mkdir(target,{recursive:true});
// the opened letter, alone (cipher_letter.py): its own shadow in its alpha
async function letter(){
  await sharp(`${source}/letter-open.png`).webp({quality:94,alphaQuality:100,effort:6}).toFile(`${target}/letter-open.webp`);
  console.log('Candlelight and Brass: published the opened letter.');
}
//   node art/blender/candlelight_brass_publish.mjs [--letter]   (--letter: only the letter)
if(process.argv.includes('--letter')){await letter();process.exit(0);}
const meta=JSON.parse(await readFile(`${source}/nativeCryptex.json`,'utf8'));
for(let mask=0;mask<8;mask++) await sharp(`${source}/candles-${mask}.png`).webp({quality:95,effort:6}).toFile(`${target}/candles-${mask}.webp`);
for(const name of ['outer-lume']) await sharp(`${source}/${name}.png`).webp({quality:96,effort:6}).toFile(`${target}/${name}.webp`);
const [left,top,width,height]=meta.wheel.crop;
await sharp(`${source}/rotor.png`).extract({left,top,width,height}).webp({quality:97,alphaQuality:100,effort:6}).toFile(`${target}/rotor.webp`);
await sharp(`${source}/flames.png`).png().toFile(`${target}/flames.png`);
await writeFile('src/levels/cryptex/nativeCryptex.json',JSON.stringify(meta,null,2)+'\n');
await letter();
console.log('Candlelight and Brass: published eight native light states, rotor, flame atlas and camera landmarks.');
