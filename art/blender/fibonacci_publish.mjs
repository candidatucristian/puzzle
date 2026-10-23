// Package the real Cycles render and its individually rendered game objects.
// node art/blender/fibonacci_publish.mjs [.artifacts/fibonacci-blender]
import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const from=resolve(process.argv[2]||'.artifacts/fibonacci-garden');
const to=resolve('public/assets/images/PlantPot/Blender');
await mkdir(to,{recursive:true});
const data=JSON.parse(await readFile(resolve(from,'scene.json'),'utf8'));
const [W,H]=data.size;
const plantOnly=process.argv.includes('--plant-only');
const bucketFrom=plantOnly&&(data.artVersion??0)<3?resolve('.artifacts/fibonacci-blender'):from;
const version='v'+(data.artVersion??data.botanicalVersion??1);
async function bounds(name,folder=from) {
  const {data:rgba,info}=await sharp(resolve(folder,name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,y0=info.height,x1=-1,y1=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(rgba[(y*info.width+x)*4+3]>5){
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
  }
  if(x1<x0)throw new Error('Empty Blender render: '+name);
  x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(W-1,x1+3);y1=Math.min(H-1,y1+3);
  return {left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};
}
if(!plantOnly)await sharp(resolve(from,'background.png')).webp({quality:95,effort:6}).toFile(resolve(to,data.backgroundFile??'garden-v1.webp'));
const actors=[await bounds('stems')];
const root=[data.bench[0]-28*data.cm,data.bench[1]-17.3*data.cm];
const stemRect=await bounds('stems');
if(stemRect.left<0||stemRect.top<0||stemRect.left+stemRect.width>W||stemRect.top+stemRect.height>H)throw new Error('Plant does not fit the render');
const {data:stemPixels,info:stemInfo}=await sharp(resolve(from,'stems.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {data:rimMask}=await sharp(resolve(from,'stems-occlusion.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(rimMask.length!==stemPixels.length)throw new Error('Stem visibility pass must use the same camera resolution');
for(let i=3;i<stemPixels.length;i+=4)stemPixels[i]=Math.min(stemPixels[i],rimMask[i]);
await sharp(stemPixels,{raw:{width:stemInfo.width,height:stemInfo.height,channels:4}}).extract(stemRect).webp({quality:97,alphaQuality:100,effort:6}).toFile(resolve(to,`stems-${version}.webp`));
data.stemBox=[(stemRect.left-root[0])/data.cm,(stemRect.top-root[1])/data.cm,stemRect.width/data.cm,stemRect.height/data.cm];
data.leaves=[];
for(let i=0;i<12;i++){
  const name=`leaf-${String(i).padStart(2,'0')}`,rect=await bounds(name),anchor=data.leafNodes[i].anchor;
  actors.push(rect);
  await sharp(resolve(from,name+'.png')).extract(rect).webp({quality:97,alphaQuality:100,effort:6}).toFile(resolve(to,`${name}-${version}.webp`));
  data.leaves.push({file:`${name}-${version}.webp`,ox:(anchor[0]-rect.left)/rect.width,oy:(anchor[1]-rect.top)/rect.height});
}
const rects=[];
for(let i=0;i<6;i++)rects.push(await bounds('bucket-'+i,bucketFrom));
const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top));
const rect={left,top,width:Math.max(...rects.map(r=>r.left+r.width))-left,height:Math.max(...rects.map(r=>r.top+r.height))-top};
actors.push(rect);
const minX=Math.min(...actors.map(r=>r.left)),minY=Math.min(...actors.map(r=>r.top));
data.playBox=[minX,minY,Math.max(...actors.map(r=>r.left+r.width))-minX,Math.max(...actors.map(r=>r.top+r.height))-minY];
data.bucketOrigin={ox:(data.bucketAnchor[0]-left)/rect.width,oy:(data.bucketAnchor[1]-top)/rect.height};
if(!plantOnly)for(let i=0;i<6;i++)await sharp(resolve(from,`bucket-${i}.png`)).extract(rect).webp({quality:96,alphaQuality:100,effort:6}).toFile(resolve(to,`bucket-${i}-${data.bucketVersion??'v1'}.webp`));
if(data.contactShadow||data.conservatory){
  const foot=[data.bench[0]+36*data.cm,data.bench[1]];
  const shadowRect={left:Math.max(0,Math.floor(foot[0]-31*data.cm)),top:Math.max(0,Math.floor(foot[1]-10*data.cm)),width:Math.ceil(62*data.cm),height:Math.ceil(18*data.cm)};
  shadowRect.width=Math.min(W-shadowRect.left,shadowRect.width);shadowRect.height=Math.min(H-shadowRect.top,shadowRect.height);
  // Compare denoised luminance over a small neighbourhood. Per-channel
  // ratios amplify Monte Carlo variance in the wood's dark blue channel.
  const ref=await sharp(resolve(from,'background.png')).extract(shadowRect).removeAlpha().blur(2).raw().toBuffer();
  const lit=await sharp(resolve(from,'bucket-shadow-plate.png')).extract(shadowRect).removeAlpha().blur(2).raw().toBuffer();
  const rgba=Buffer.alloc(shadowRect.width*shadowRect.height*4);
  for(let i=0;i<ref.length/3;i++){
    const base=.2126*ref[i*3]+.7152*ref[i*3+1]+.0722*ref[i*3+2];
    const shade=.2126*lit[i*3]+.7152*lit[i*3+1]+.0722*lit[i*3+2];
    const darkening=base>15?Math.max(0,1-shade/base):0;
    rgba[i*4+3]=Math.round(Math.max(0,Math.min(.88,(darkening-.025)/.975))*255);
  }
  const file=`bucket-shadow-${version}.webp`;
  await sharp(rgba,{raw:{width:shadowRect.width,height:shadowRect.height,channels:4}}).median(5).blur(1).webp({lossless:true,effort:6}).toFile(resolve(to,file));
  data.shadow={file,ox:(foot[0]-shadowRect.left)/shadowRect.width,oy:(foot[1]-shadowRect.top)/shadowRect.height};
}
if(data.window&&!plantOnly)await sharp(resolve(from,'window.png')).webp({quality:97,alphaQuality:100,effort:6}).toFile(resolve(to,data.window.file));
await writeFile('src/levels/plantpot/blenderPlantData.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({published:to,size:data.size,leaves:data.leaves.length,bucketOrigin:data.bucketOrigin,cm:data.cm}));
