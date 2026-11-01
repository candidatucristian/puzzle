import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const input='.artifacts/archive-black-v2', output='public/assets/images/ArchiveTools/native-v2';
await mkdir(output,{recursive:true});
const encode=im=>im.webp({quality:96,alphaQuality:100,effort:6});
for(const name of ['casefile','notebook','settings','notebook-icon','casefile-icon']) {
  await encode(sharp(`${input}/${name}.png`)).toFile(`${output}/${name}.webp`);
}
const {width,height}=await sharp(`${input}/casefile.png`).metadata();
const cuts=[0,Math.round(width*340/1480),Math.round(width*412/1480),width];
for(const [i,name]of ['left','hinge','right'].entries()) {
  await encode(sharp(`${input}/casefile.png`).extract({left:cuts[i],top:0,width:cuts[i+1]-cuts[i],height})).toFile(`${output}/casefile-${name}.webp`);
}
await writeFile(`${output}/provenance.json`,JSON.stringify({renderer:'Blender 4.5 Cycles',source:'art/blender/archive_black.py',samples:384,
  materials:['Black dyed calfskin from CC0 Poly Haven brown_leather scan','Procedural oxidised, foxed cotton paper','Dark linen, tarnished nickel, blackened corners'],
  slicing:{referenceWidth:1480,left:[0,340],hinge:[340,412],right:[412,1480]},
},null,2)+'\n');
console.log('Published black leather archive set: Settings, Notebook, Case file and icons.');
