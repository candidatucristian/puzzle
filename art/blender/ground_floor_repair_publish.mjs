import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const source='.artifacts/ground-floor-repair';
for(const [room,folder,version]of [['Study','Room1',8],['Room2','Room2',2],['Room3','Room3',3]]) {
  await mkdir(`public/assets/images/${folder}`,{recursive:true});
  await sharp(`${source}/${room}/lights-1.png`).webp({quality:95,effort:6}).toFile(`public/assets/images/${folder}/${folder.toLowerCase()}-lights-1-render-v${version}.webp`);
  console.log(room,'repaired room plate');
}
// Only the port glass moved; preserve every existing puzzle and coffer bound.
const cabinPath='src/levels/house/rooms/Room3.json';
const cabin=JSON.parse(await readFile(cabinPath,'utf8'));
const repairedCabin=JSON.parse(await readFile(`${source}/Room3/Room3.json`,'utf8'));
cabin.panes=repairedCabin.panes;
await writeFile(cabinPath,JSON.stringify(cabin,null,1)+'\n');
const data=JSON.parse(await readFile('src/levels/house/nativeCoffer.json','utf8'));
const target='public/assets/images/Chest/native-v3'; await mkdir(target,{recursive:true});
for(const room of ['Room2','Room3']) {
  const folder=`${source}/${room}/coffer`, info=JSON.parse(await readFile(`${folder}/coffer.json`,'utf8'));
  const frames=[],pieces=[]; let x=0,y=0,rowHeight=0;
  for(let i=0;i<info.poses;i++) {
    const input=`${folder}/pose-${String(i).padStart(2,'0')}.png`, {width,height}=await sharp(input).metadata();
    if(x+width>2048) {x=0;y+=rowHeight+4;rowHeight=0;}
    frames.push([x,y,width,height]);pieces.push({input,left:x,top:y});x+=width+4;rowHeight=Math.max(rowHeight,height);
    if(i===0||i===info.poses-1) await sharp(input).webp({quality:96,alphaQuality:100,effort:6}).toFile(`${target}/${room.toLowerCase()}-chest-${i?'open':'shut'}.webp`);
  }
  await sharp({create:{width:2048,height:y+rowHeight,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(pieces).webp({quality:96,alphaQuality:100,effort:6}).toFile(`${target}/${room.toLowerCase()}-poses.webp`);
  await sharp(`${folder}/key.png`).webp({quality:96,alphaQuality:100,effort:6}).toFile(`${target}/${room.toLowerCase()}-key.webp`);
  data.rooms[room]={...info,artVersion:3,frames};
  console.log(room,'13 coffer poses recalibrated to repaired room light');
}
await writeFile('src/levels/house/nativeCoffer.json',JSON.stringify(data,null,2)+'\n');
