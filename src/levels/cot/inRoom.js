import { soft, makeCanvas } from "../../shared/paint.js";
import { TOYS } from "./puzzle.js";
import { BELONGINGS } from "./art.js";
import { COT_PHOTOS, cotPhotograph, cotObject } from "./photography.js";

const PHOTO={width:1659,height:948};
const BED={x:825,y:390,w:264,h:330};
const fronts=new WeakMap();

export function cotQuad(L) {
  return [[827,516],[1092,516],[1092,722],[827,722]].map(([x,y])=>({x:x*L.W/PHOTO.width,y:y*L.H/PHOTO.height}));
}

// The overview uses the same photographed toys as the puzzle. Its front
// spindles are laid back over them, so they stay visibly inside the cot.
export function paintCotInRoom(ctx,L,scene) {
  if(!scene)return;
  const photo=cotPhotograph(scene,COT_PHOTOS.overview);
  if(!photo)return;
  ctx.save();ctx.scale(L.W/PHOTO.width,L.H/PHOTO.height);
  soft(ctx,BED.x+BED.w*.5,714,147,20,"0,0,0",.58);
  ctx.filter="brightness(.72) saturate(.72)";
  ctx.drawImage(photo,BED.x,BED.y,BED.w,BED.h);
  const decorations=BELONGINGS.filter(t=>t.id!=="pillow");
  for(const t of [...TOYS,...decorations].sort((a,b)=>a.b-b.b)) {
    const source=cotObject(scene,t.id);if(!source)continue;
    const h=BED.h*({musicbox:.10,oscar:.115,book:.07,chaplin:.115,hotel:.13,
      blanket:.055,bootees:.05,rattle:.045,teddy:.10,rabbit:.08,train:.065,firetruck:.06,
      duck:.065,rockingHorse:.09,blocks:.06,ball:.065,rings:.085,top:.06,elephant:.08}[t.id]);
    const w=h*source.width/source.height;
    const x=BED.x+BED.w*(.1+.8*t.a),y=BED.y+BED.h*(.63+.14*t.b);
    ctx.filter="brightness(.59) saturate(.72)";
    ctx.drawImage(source,x-w/2,y-h*(t.origin??(t.id==="book"?.5:.97)),w,h);
    if(t.id==="musicbox") {
      const pair=cotObject(scene,"dancers"),dh=h*.47,dw=dh*pair.width/pair.height;
      ctx.drawImage(pair,x-w*.028-dw/2,y-h*.37-dh*.97,dw,dh);
    }
    if(t.id==="chaplin") {
      const hat=cotObject(scene,"hat"),hw=w*.53,hh=hw*hat.height/hat.width;
      ctx.drawImage(hat,x-hw/2,y-h*.88-hh*.92,hw,hh);
    }
  }
  ctx.filter="brightness(.72) saturate(.72)";
  ctx.drawImage(front(photo),BED.x,BED.y,BED.w,BED.h);
  ctx.restore();
}

function front(photo) {
  if(fronts.has(photo))return fronts.get(photo);
  const c=makeCanvas(photo.width,photo.height),g=c.getContext("2d");
  g.drawImage(photo,0,0);
  const image=g.getImageData(0,0,c.width,c.height),d=image.data;
  const centers=Array.from({length:12},(_,i)=>.111+i*.0702);
  const columns=Array.from({length:c.width},(_,x)=>centers.some(cx=>Math.abs(x/c.width-cx)<.012));
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    const a=x/c.width,b=y/c.height,p=(y*c.width+x)*4;
    const post=(a<.079||a>.92)&&b>.385;
    const rail=a>.065&&a<.945&&((b>.449&&b<.488)||(b>.758&&b<.823));
    const spindle=b>.475&&b<.766&&columns[x];
    if(!post&&!rail&&!spindle)d[p+3]=0;
  }
  g.putImageData(image,0,0);fronts.set(photo,c);return c;
}
