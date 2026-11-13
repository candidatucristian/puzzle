// Adapt existing Blender/Cycles renders for 4096px GPUs, without changing puzzle coordinates.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const audit = '.artifacts/review-2026-11-12';
await mkdir(audit,{recursive:true});
const metadataFile = 'src/levels/bookshelf/nativeLibrary.json';
const backupFile = audit+'/nativeLibrary-v5.json';
let original;
try { original = JSON.parse(await readFile(backupFile,'utf8')); }
catch {
  original = JSON.parse(await readFile(metadataFile,'utf8'));
  if (original.version !== 5) throw new Error('Expected original library version 5 before repacking.');
  await writeFile(backupFile,JSON.stringify(original,null,2)+'\n');
}
const layout = structuredClone(original);
layout.version = 6;
const source = 'public/assets/images/Bookshelf/native-v5';
const target = 'public/assets/images/Bookshelf/native-v6';
await mkdir(target,{recursive:true});
await copyFile(source+'/library.webp',target+'/library.webp');
const pieces = [];
let left = 0, top = 0, rowHeight = 0;
for(const book of layout.books) {
  const frames = [];
  for(const [x,y,width,height]of book.frames) {
    if(left+width>4096) { left=0;top+=rowHeight+2;rowHeight=0; }
    const input = await sharp(source+'/books.webp').extract({left:x,top:y,width,height}).png().toBuffer();
    pieces.push({input,left,top});
    frames.push([left,top,width,height]);
    left+=width+2;rowHeight=Math.max(rowHeight,height);
  }
  book.frames=frames;
}
const atlasHeight=top+rowHeight;
if(atlasHeight>4096)throw new Error('Repacked atlas still exceeds the compatibility limit.');
await sharp({create:{width:4096,height:atlasHeight,channels:4,background:'#090807'}})
  .composite(pieces).webp({quality:97,effort:6}).toFile(target+'/books.webp');
await writeFile(metadataFile,JSON.stringify(layout,null,2)+'\n');
const adapted=[];
for(const [from,to]of [
  ['public/assets/images/Chemistry/bench-zoom-v2.webp','public/assets/images/Chemistry/bench-zoom-v2-4096.webp'],
  ['public/assets/images/Rally/v1/tv.webp','public/assets/images/Rally/v1/tv-4096.webp'],
]) {
  const info = await sharp(from).resize({width:4096,height:4096,fit:'inside',withoutEnlargement:true})
    .webp({quality:96,alphaQuality:100,effort:6}).toFile(to);
  adapted.push({file:to,width:info.width,height:info.height,bytes:info.size});
}
console.log(JSON.stringify({library:{frames:pieces.length,width:4096,height:atlasHeight},adapted},null,2));

