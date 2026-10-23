// Package the original Blender render, the unquantized tree coverage, and the 3D storm animation frames.
// node art/blender/manor_wind_publish.mjs [.artifacts/manor-wind] [.artifacts/manor/frames]
import sharp from 'sharp';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
const source=resolve(process.argv[2]||'.artifacts/manor-wind');
const framesDir=resolve(process.argv[3]||'.artifacts/manor/frames');
const target=resolve('public/assets/images/Manor');
await mkdir(target,{recursive:true});
await sharp(resolve(source,'clean.png')).webp({quality:94,effort:6}).toFile(resolve(target,'ashcombe-wind-background-v1.webp'));
await sharp(resolve(source,'trees-mask.png')).webp({lossless:true,effort:6}).toFile(resolve(target,'ashcombe-wind-trees-v1.webp'));
for(let i=0;i<8;i++){
  const framePath=resolve(framesDir,`frame_0${i}.png`);
  if(existsSync(framePath)){
    await sharp(framePath).webp({quality:90,effort:5}).toFile(resolve(target,`ashcombe-wind-storm-${i}.webp`));
  }
}
console.log('Published Blender background, lossless tree matte, and 8-frame 3D storm loop.');
