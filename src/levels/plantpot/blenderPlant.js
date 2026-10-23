// Every new image in this level is rendered from art/blender/fibonacci.py.
// Landmarks come from its camera; the twelve leaves are separate 3D renders
// at their real scene positions, not copies rotated under different light.
import data from './blenderPlantData.json';
import {makeCanvas} from '../../shared/paint.js';

const ROOT='assets/images/PlantPot/Blender/';
const REV='v'+(data.artVersion??data.botanicalVersion??1);
const GARDEN='pp_blender_garden_'+(data.backgroundVersion??REV),STEMS='pp_blender_stems_'+REV;
const leafKey=i=>'pp_blender_leaf_'+REV+'_'+i;
const bucketKey=i=>'pp_blender_bucket_'+REV+'_'+i;
const SHADOW='pp_blender_shadow_'+REV;
const WINDOW='pp_blender_window_v'+(data.window?.version??1);
export const fibonacciSkeleton=data.skeleton;
export const fibonacciLeafDefinitions=data.leafDefinitions;

export function loadFibonacciRender(scene) {
  const images=[[GARDEN,data.backgroundFile??'garden-v1.webp'],[STEMS,`stems-${REV}.webp`],
    ...data.leaves.map((leaf,i)=>[leafKey(i),leaf.file]),
    ...Array.from({length:6},(_,i)=>[bucketKey(i),`bucket-${i}-${data.bucketVersion??'v1'}.webp`])];
  if(data.shadow)images.push([SHADOW,data.shadow.file]);
  if(data.window)images.push([WINDOW,data.window.file]);
  for(const [key,file] of images)if(!scene.textures.exists(key))scene.load.image(key,ROOT+file);
}
export const hasFibonacciRender=textures=>textures.exists(GARDEN)&&textures.exists(STEMS)&&data.leaves.every((_,i)=>textures.exists(leafKey(i)))&&Array.from({length:6},(_,i)=>bucketKey(i)).every(key=>textures.exists(key));

function windowEdges(L) {
  if(!data.window)return {side:0,top:0,bottom:0};
  const room=Math.max(0,L.H-L.W*.4);
  return {side:Math.min(L.W*.085,L.H*.13),
    top:L.H*.01+Math.min(L.H*.03,room*.06),
    bottom:L.H*.035+Math.min(L.H*.05,room*.13)};
}

export function alignFibonacciGarden(L) {
  const [W,H]=data.size;
  const frame=windowEdges(L);
  // Keep the full growing shoot and the pail inside the crop on wide screens.
  // The garden covers the clear opening, with the frame filling the edges.
  const box=data.playBox ?? [W*.28,H*.16,W*.38,H*.58];
  const margin=Math.min(16,L.H*.025);
  const cover=Math.max(L.W/W,L.H/H);
  // A wide viewport has a little extra room behind its physical jambs.
  // Use it to fit every leaf and the pail above the sill. The picture still
  // covers the whole clear aperture, including its tapered modeled reveals.
  const apertureCover=Math.max((L.W-frame.side*1.3)/W,(L.H-(frame.top+frame.bottom)*.65)/H);
  const actorFit=Math.min((L.W-frame.side*2-6)/box[2],(L.H-frame.top-frame.bottom-6)/box[3]);
  const scale=data.window?Math.max(apertureCover,Math.min(cover,actorFit)):cover;
  let left=(L.W-W*scale)/2,top=(L.H-H*scale)/2;
  const keepInside=(offset,span,start,size,viewport,before,after)=>{
    const inset=Math.min(margin,Math.max(0,(viewport-before-after-size*scale)/2));
    const lo=before+inset-start*scale,hi=viewport-after-inset-(start+size)*scale;
    if(lo<=hi)offset=Math.max(lo,Math.min(hi,offset));
    return Math.max(viewport-after*.65-span,Math.min(before*.65,offset));
  };
  left=keepInside(left,W*scale,box[0],box[2],L.W,frame.side,frame.side);
  top=keepInside(top,H*scale,box[1],box[3],L.H,frame.top,frame.bottom);
  const point=([x,y])=>({x:left+x*scale,y:top+y*scale});
  const center=point(data.bench);
  L.cm=data.cm*scale;
  L.bench={...L.bench,...center};
  L.at=(x,y)=>({x:L.bench.x+x*L.cm,y:L.bench.y+y*L.cm});
  L.flame=point(data.flame);
  L.photographic=true;L.blender=true;
  L.conservatory=Boolean(data.conservatory);
  L.setting=data.setting??(L.conservatory?'interior':'exterior');
  L.inSky=()=>false;
  L.render={left,top,width:W*scale,height:H*scale};
  if(data.window)L.windowFrame={left:frame.side,top:frame.top,right:L.W-frame.side,bottom:L.H-frame.bottom};
  return L;
}

export function paintFibonacciGarden(L,textures) {
  const image=textures.get(GARDEN).getSourceImage(),canvas=makeCanvas(L.W,L.H),ctx=canvas.getContext('2d');
  ctx.fillStyle='#000';ctx.fillRect(0,0,L.W,L.H);
  const p=L.render;ctx.drawImage(image,p.left,p.top,p.width,p.height);
  return canvas;
}

// The foreground belongs to the player's window, so it stays at the screen
// edges while the garden uses a uniform cover crop behind it. Nine slices
// retain the modeled corners and let the sill recede on very wide screens.
export function paintFibonacciWindow(L,textures) {
  if(!data.window||!textures.exists(WINDOW))return null;
  const image=textures.get(WINDOW).getSourceImage();
  const [W,H]=data.window.size,[l,t,r,b]=data.window.borders;
  const {side,top,bottom}=windowEdges(L);
  const sx=[0,l,W-r,W],sy=[0,t,H-b,H];
  const dx=[0,side,L.W-side,L.W],dy=[0,top,L.H-bottom,L.H];
  const canvas=makeCanvas(L.W,L.H),ctx=canvas.getContext('2d');
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    if(row===1&&col===1)continue;
    ctx.drawImage(image,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],
      dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
  }
  L.windowFrame={left:side,top,right:L.W-side,bottom:L.H-bottom};
  return canvas;
}

export function fibonacciParts(textures) {
  if(!hasFibonacciRender(textures))return null;
  return {
    buckets:Array.from({length:6},(_,i)=>bucketKey(i)),bucketOrigin:data.bucketOrigin,
    bucketLip:data.bucketLipOffset,
    spriteScale:1/data.cm,
    shadow:data.shadow&&textures.exists(SHADOW)?{key:SHADOW,...data.shadow,scale:1/data.cm}:null,
    leaves:data.leaves.map((leaf,i)=>({key:leafKey(i),ox:leaf.ox,oy:leaf.oy,cmPerPixel:1/data.cm,rendered:true})),
    stems:{image:textures.get(STEMS).getSourceImage(),box:data.stemBox},
  };
}
