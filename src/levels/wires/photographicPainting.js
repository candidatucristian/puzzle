import {makeCanvas,lcg,soft,grain} from "../../shared/paint.js";
import {PICTURE,WIRE_BIRDS,wireY} from "./puzzle.js";

export const WIRES_PHOTOS = Object.freeze({
  landscape:{key:"wi_farmhouse_dawn_v1",url:"assets/images/Wires/farmhouse-dawn-v1.webp"},
  birds:{key:"wi_perched_sparrows_v1",url:"assets/images/Wires/perched-sparrows-v1.webp"},
  frame:{key:"wi_antique_frame_v1",url:"assets/images/Wires/antique-frame-v1.webp"},
});
const compositions=new WeakMap();
const CROPS=[
  [0,0,550,512,352,447], [650,0,375,512,798,445], [1030,0,506,512,1316,444],
  [65,512,455,512,240,940], [525,512,510,512,805,945], [1045,512,491,512,1294,944],
];

export function loadWiresPhotography(scene,withFrame=true) {
  for(const [name,asset] of Object.entries(WIRES_PHOTOS)) {
    if(name==="frame"&&!withFrame)continue;
    if(!scene.textures.exists(asset.key))scene.load.image(asset.key,asset.url);
  }
}

function birdCrop(atlas,definition) {
  const [x,y,w,h,fx,fy]=definition,sx=atlas.width/1536,sy=atlas.height/1024;
  const c=makeCanvas(w,h),g=c.getContext("2d");
  g.drawImage(atlas,x*sx,y*sy,w*sx,h*sy,0,0,w,h);
  const data=g.getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let py=0;py<h;py++)for(let px=0;px<w;px++) {
    if(data[(py*w+px)*4+3]<25)continue;
    x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);
  }
  if(x1<x0)throw new Error("The sparrow photograph is empty.");
  const image=makeCanvas(x1-x0+1,y1-y0+1),p=image.getContext("2d");
  p.filter="brightness(.78) saturate(.8)";
  p.drawImage(c,x0,y0,image.width,image.height,0,0,image.width,image.height);
  return {image,fx:fx-x-x0,fy:fy-y-y0};
}

export function birdPainting(textures) {
  const photo=textures.get(WIRES_PHOTOS.landscape.key).getSourceImage();
  const atlas=textures.get(WIRES_PHOTOS.birds.key).getSourceImage();
  if(compositions.has(photo))return compositions.get(photo);
  const {width:W,height:H,poleX}=PICTURE,c=makeCanvas(W,H),g=c.getContext("2d");
  // Keep the landscape's aspect: only the quiet foreground is cropped to
  // the picture's landscape opening. No part of the clue is cropped.
  const scale=W/photo.width;
  g.drawImage(photo,0,0,W,photo.height*scale);
  for(let w=0;w<5;w++) {
    const y=wireY(w,poleX);
    g.strokeStyle="#28231f";g.lineWidth=2.4;g.lineCap="round";
    for(const [a,b] of [[0,poleX-12],[poleX+12,W]]) {
      g.beginPath();
      for(let x=a;x<=b;x+=3) {const y=wireY(w,x);if(x===a)g.moveTo(x,y);else g.lineTo(x,y);}
      g.lineTo(b,wireY(w,b));g.stroke();
    }
    // Small dark iron fittings and aged ceramic insulators on the real pole.
    g.strokeStyle="#333333";g.lineWidth=3;g.beginPath();g.moveTo(poleX-17,y+5);g.lineTo(poleX+17,y+5);g.stroke();
    for(const s of [-1,1]) {
      g.fillStyle="#6d756f";g.beginPath();g.ellipse(poleX+s*14,y+1,4,3.7,0,0,Math.PI*2);g.fill();
      g.strokeStyle="#9a9d89";g.lineWidth=.7;g.beginPath();g.ellipse(poleX+s*14,y-.4,4,1.3,0,0,Math.PI*2);g.stroke();
    }
  }
  const birds=WIRE_BIRDS.map((definition,i)=>{
    const sprite=birdCrop(atlas,CROPS[i]),height=36,scale=height/sprite.image.height;
    const x=definition.x*W,y=wireY(definition.pos,x);
    g.drawImage(sprite.image,x-sprite.fx*scale,y-sprite.fy*scale,sprite.image.width*scale,height);
    return {...definition,x,y,height,foot:{x,y}};
  });
  // A restrained matte photographic print, with no animated overlays inside it.
  grain(g,W,H,.008,true);
  const result={image:c,birds,wireY};compositions.set(photo,result);return result;
}

export function layoutBirdPainting(W,H) {
  const border=Math.max(17,Math.min(W,H)*.057),ratio=PICTURE.width/PICTURE.height;
  const width=Math.min(W*.9-border*2,(H*.88-border*2)*ratio),height=width/ratio;
  const image={x:(W-width)/2,y:(H-height)/2,width,height};
  return {W,H,border,image,frame:{x:image.x-border,y:image.y-border,width:width+border*2,height:height+border*2}};
}

function drawFrame(g,source,box,border) {
  // Nine-slice the photographed moulding: all carved corners keep their
  // aspect, and the same natural frame can fit the full picture at any size.
  const sx=[0,174,1362,1536].map(x=>x/1536*source.width);
  const sy=[0,170,850,1024].map(y=>y/1024*source.height);
  const dx=[box.x,box.x+border,box.x+box.width-border,box.x+box.width];
  const dy=[box.y,box.y+border,box.y+box.height-border,box.y+box.height];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++) {
    if(row===1&&col===1)continue;
    g.drawImage(source,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],
      dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
  }
}

export function paintBirdPainting(textures,L) {
  const c=makeCanvas(L.W,L.H),g=c.getContext("2d"),rnd=lcg(9281);
  g.imageSmoothingQuality="high";
  const wall=g.createRadialGradient(L.W*.5,L.H*.2,0,L.W*.5,L.H*.5,Math.hypot(L.W,L.H)*.65);
  wall.addColorStop(0,"#2b251e");wall.addColorStop(.65,"#141311");wall.addColorStop(1,"#060809");
  g.fillStyle=wall;g.fillRect(0,0,L.W,L.H);
  for(let i=0;i<1800;i++){g.fillStyle=`rgba(173,153,123,${rnd()*.025})`;g.fillRect(rnd()*L.W,rnd()*L.H,1,1);}
  const f=L.frame,p=L.image;
  soft(g,L.W/2,f.y+f.height*.62,f.width*.54,f.height*.57,"0,0,0",.55);
  const art=birdPainting(textures);
  g.drawImage(art.image,p.x-1,p.y-1,p.width+2,p.height+2);
  drawFrame(g,textures.get(WIRES_PHOTOS.frame.key).getSourceImage(),f,L.border);
  return {canvas:c,birds:art.birds.map(b=>({...b,x:p.x+b.x/PICTURE.width*p.width,y:p.y+b.y/PICTURE.height*p.height})),image:p};
}
