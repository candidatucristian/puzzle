import { makeCanvas } from "./garden.js";

const ATLAS = {key:"pp_laurel_atlas_v1",url:"assets/images/PlantPot/laurel-growth-atlas-v1.webp"};
const cache = new WeakMap();

export function loadPlantPhotography(scene) {
  if (!scene.textures.exists(ATLAS.key)) scene.load.image(ATLAS.key, ATLAS.url);
}

export function plantPhotographs(textures) {
  if (!textures.exists(ATLAS.key)) return null;
  const atlas = textures.get(ATLAS.key).getSourceImage();
  if (cache.has(atlas)) return cache.get(atlas);
  const parts = Array.from({length:6}, (_,i) => {
    const w=atlas.width/3,h=atlas.height/2,c=makeCanvas(w,h),g=c.getContext("2d");
    g.drawImage(atlas,(i%3)*w,Math.floor(i/3)*h,w,h,0,0,w,h);
    const data=g.getImageData(0,0,w,h).data;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      if(data[(y*w+x)*4+3]<28)continue;
      x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    }
    if(x1<x0)throw new Error(`Missing botanical atlas cell ${i}`);
    const crop=makeCanvas(x1-x0+1,y1-y0+1),cg=crop.getContext("2d");
    // The foreground needs readable midtones against the detailed canopy.
    // Keep the photographed veins and warm/cool lighting; lift exposure on
    // living tissue without changing the pot or the garden's night grade.
    cg.filter=i===2?"brightness(1.35) contrast(1.05) saturate(1)":i<4
      ?"brightness(1.85) contrast(1.08) saturate(1.04)":i===5
        ?"brightness(1.55) contrast(1.05) saturate(.95)":"brightness(.9) saturate(.88)";
    cg.drawImage(c,x0,y0,crop.width,crop.height,0,0,crop.width,crop.height);
    // The narrow stalk, rather than the blade's bounding-box centre, is
    // where a leaf attaches. Measure its last few opaque rows.
    let sum=0,weight=0;
    for(let y=Math.max(y0,y1-5);y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const a=data[(y*w+x)*4+3]/255;if(a<.2)continue;
      sum+=(x-x0)*a;weight+=a;
    }
    return {image:crop,ox:weight?sum/weight/crop.width:.5,oy:1};
  });
  const result={leaves:parts.slice(0,4),pot:parts[4].image,stem:parts[5].image};
  cache.set(atlas,result);return result;
}
