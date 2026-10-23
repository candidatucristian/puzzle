// Publish only the foreground plate; retain the accepted outdoor artwork.
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const from=resolve(process.argv[2]??'.artifacts/fibonacci-window');
const window=JSON.parse(await readFile(resolve(from,'window.json'),'utf8'));
await sharp(resolve(from,'window.png')).webp({quality:97,alphaQuality:100,effort:6}).toFile(resolve('public/assets/images/PlantPot/Blender',window.file));
for(const file of ['src/levels/plantpot/blenderPlantData.json','.artifacts/fibonacci-garden/scene.json']){
  const data=JSON.parse(await readFile(file,'utf8'));
  data.window=window;
  await writeFile(file,JSON.stringify(data,null,2)+'\n');
}
console.log(JSON.stringify({published:window.file,size:window.size}));
