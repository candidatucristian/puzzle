// Publish only the woodland background. Existing foreground layers retain
// their original files, camera registration and watering mechanics.
import sharp from 'sharp';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const from=resolve(process.argv[2]??'.artifacts/fibonacci-forest');
const render=JSON.parse(await readFile(resolve(from,'scene.json'),'utf8'));
const file='src/levels/plantpot/blenderPlantData.json';
const data=JSON.parse(await readFile(file,'utf8'));
if(String(data.size)!==String(render.size))throw new Error('Publish the full-resolution forest render, not its preview');
const patch={backgroundFile:render.backgroundFile,backgroundVersion:render.backgroundVersion,woodland:true};
await sharp(resolve(from,'background.png')).webp({quality:96,effort:6}).toFile(resolve('public/assets/images/PlantPot/Blender',patch.backgroundFile));
Object.assign(data,patch);
await writeFile(file,JSON.stringify(data,null,2)+'\n');
const rawFile='.artifacts/fibonacci-garden/scene.json';
const raw=JSON.parse(await readFile(rawFile,'utf8'));Object.assign(raw,patch);
await copyFile(resolve(from,'background.png'),'.artifacts/fibonacci-garden/background.png');
await writeFile(rawFile,JSON.stringify(raw,null,2)+'\n');
console.log(JSON.stringify({published:patch.backgroundFile,size:data.size}));
