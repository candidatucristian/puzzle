// Original chart/dial artwork and publication of the Cycles bottle diorama.
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {COMPASS_BEARINGS} from '../../src/levels/compass/puzzle.js';
const require=createRequire(import.meta.url),sharp=require('sharp');
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=`${root}/.artifacts/captains-bottle`,target=`${root}/public/assets/images/Compass/native-bottle-v1`;
mkdirSync(source,{recursive:true});mkdirSync(target,{recursive:true});

const marks=[];
for(let i=0;i<360;i++){
  const a=i*Math.PI/180,outer=914,inner=i%30===0?835:i%10===0?863:i%5===0?885:901;
  marks.push(`<path d="M${1024+Math.sin(a)*inner},${1024-Math.cos(a)*inner}L${1024+Math.sin(a)*outer},${1024-Math.cos(a)*outer}" stroke="#514937" stroke-width="${i%30===0?5:2}"/>`);
  if(i%30===0)marks.push(`<text x="${1024+Math.sin(a)*767}" y="${1024-Math.cos(a)*767}" font-size="125" text-anchor="middle" dominant-baseline="central" fill="#443c2c">${i}</text>`);
}
let rose='';
for(let i=0;i<16;i++){
  const a=i*Math.PI/8,r=i%4===0?460:i%2===0?370:265;
  const pt=(t,len)=>`${1024+Math.sin(t)*len},${1024-Math.cos(t)*len}`;
  rose+=`<path d="M1024,1024L${pt(a-.07,115)}L${pt(a,r)}Z" fill="${i%2?'#b0a17b':'#594f38'}"/><path d="M1024,1024L${pt(a,r)}L${pt(a+.07,115)}Z" fill="#d8ca9f" stroke="#83744e" stroke-width="2"/>`;
}
const dial=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" style="font-family:Georgia,serif"><defs><radialGradient id="paper"><stop stop-color="#ded7bd"/><stop offset=".8" stop-color="#d0c6a9"/><stop offset="1" stop-color="#afa07d"/></radialGradient></defs><rect width="2048" height="2048" fill="url(#paper)"/><circle cx="1024" cy="1024" r="940" fill="none" stroke="#6b6045" stroke-width="5"/>${marks.join('')}${rose}${[['N',1024,444],['E',1604,1024],['S',1024,1604],['W',444,1024]].map(([t,x,y])=>`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="146" fill="#392f20">${t}</text>`).join('')}<circle cx="1024" cy="1024" r="118" fill="#c4b88e" stroke="#7a6946" stroke-width="4"/></svg>`;
await sharp(Buffer.from(dial.replaceAll('font-size="146"','font-size="170"'))).png().toFile(`${source}/dial.png`);

const bearings=COMPASS_BEARINGS.map((line,i)=>`<text x="1280" y="${850+i*175}" text-anchor="middle" font-size="69" font-style="italic" fill="#443522">${line.map(b=>`${b}°`).join('   ·   ')}</text>`).join('');
const chart=`<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1600" style="font-family:Georgia,serif"><defs><filter id="age"><feTurbulence baseFrequency=".045" numOctaves="3" seed="37"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".10"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs><rect width="2560" height="1600" fill="#d9c9a5"/><g filter="url(#age)"><rect x="90" y="80" width="2380" height="1440" rx="8" fill="none" stroke="#8b7350" stroke-width="4"/><rect x="107" y="97" width="2346" height="1406" fill="none" stroke="#9e8760" stroke-width="2"/><text x="1280" y="215" text-anchor="middle" font-size="75" font-style="italic" fill="#4a3925">The Captain’s Bearings</text><g stroke="#786345" fill="none" stroke-width="4"><path d="M300 530C325 475 393 486 409 444S485 388 537 416S603 347 667 359S731 407 767 377S837 395 866 437S936 421 974 460S1025 466 1057 508S1050 557 1014 574S1023 619 962 637S905 610 868 651S804 657 757 640S692 691 655 664S620 604 577 633S500 597 452 625S401 571 365 574S310 581 300 530Z"/><path d="M280 536C310 455 384 462 392 425S482 365 538 395S607 324 665 334S742 377 766 354S858 373 881 418S956 398 992 441S1045 451 1077 501S1069 577 1036 591S1034 636 966 661" stroke-width="1.7"/><path d="M471 522Q615 480 669 526T867 522" stroke-dasharray="9 15"/><path d="M851 505l34 34m-34 0l34-34" stroke-width="7"/><path d="M605 474l17-30 18 30m-9-11 15-21 20 32M728 589l20-34 21 34" stroke-width="2.5"/></g><g transform="translate(1830 505)" stroke="#766144" fill="none"><circle r="168" stroke-width="3"/><circle r="151" stroke-width="1.5"/><path d="M0-220V220M-220 0H220M-110-110L110 110M-110 110L110-110" stroke-width="3"/><path d="M0-154L-22 0L0 110L22 0Z" fill="#9c855b"/><text x="0" y="-245" text-anchor="middle" font-size="48" fill="#675135" stroke="none">N</text></g>${bearings}<path d="M1280 1450h840" stroke="#8c7856" stroke-width="2"/><text x="2060" y="1435" text-anchor="end" font-size="36" font-style="italic" fill="#766345">the chart table</text></g></svg>`;
await sharp(Buffer.from(chart)).png().toFile(`${source}/chart.png`);
if(process.argv.includes('--prepare'))process.exit(0);

const layout=JSON.parse(readFileSync(`${source}/nativeBottle.json`,'utf8'));
await sharp(`${source}/room.png`).webp({quality:95}).toFile(`${target}/room.webp`);
await sharp(`${source}/map.png`).webp({quality:96}).toFile(`${target}/map.webp`);
const {tile,columns,count,crop}=layout.needle;
const pieces=[];
for(let i=0;i<count;i++){
  const pixels=await sharp(`${source}/needle-${String(i).padStart(3,'0')}.png`).resize(tile,tile,{fit:'fill'}).ensureAlpha().raw().toBuffer();
  for(let y=0;y<tile;y++)for(let x=0;x<tile;x++)pixels[(y*tile+x)*4+3]=Math.round(255*Math.min(1,Math.min(x,y,tile-1-x,tile-1-y)/6));
  const input=await sharp(pixels,{raw:{width:tile,height:tile,channels:4}}).png().toBuffer();
  pieces.push({input,left:(i%columns)*tile,top:Math.floor(i/columns)*tile});
}
await sharp({create:{width:columns*tile,height:Math.ceil(count/columns)*tile,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite(pieces).webp({quality:94,alphaQuality:100}).toFile(`${target}/needle.webp`);
writeFileSync(`${root}/src/levels/compass/nativeBottle.json`,JSON.stringify({...layout,needle:{...layout.needle,crop}},null,1)+'\n');
console.log('Published native captain’s cabin in a bottle',layout.width,layout.height,count,'needle positions');
