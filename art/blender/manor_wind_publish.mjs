// Package the original Blender render and the unquantized tree coverage.
// node art/blender/manor_wind_publish.mjs [.artifacts/manor-wind]
import sharp from 'sharp';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
const source=resolve(process.argv[2]||'.artifacts/manor-wind');
const target=resolve('public/assets/images/Manor');
await mkdir(target,{recursive:true});
await sharp(resolve(source,'clean.png')).webp({quality:94,effort:6}).toFile(resolve(target,'ashcombe-wind-background-v1.webp'));
await sharp(resolve(source,'trees-mask.png')).webp({lossless:true,effort:6}).toFile(resolve(target,'ashcombe-wind-trees-v1.webp'));
console.log('Published Blender background and lossless tree matte.');
