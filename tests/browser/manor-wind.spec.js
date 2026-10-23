import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {evaluateApp} from './app.js';
import sharp from 'sharp';

async function outside(page,motion='system') {
  await page.addInitScript(motion=>{
    localStorage.setItem('caseFile:letters',JSON.stringify(['invitation']));
    localStorage.setItem('story:seen',JSON.stringify(['chapter:1']));
    localStorage.setItem('house:entered','true');
    localStorage.setItem('hasPlayedBefore','true');
    localStorage.setItem('puzzleComfort',JSON.stringify({motion,ambientEffects:true}));
  },motion);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('#start-film')).toHaveAttribute('data-architecture','ready',{timeout:30000});
}

test('the rendered trees move while the manor facade and the tree roots stay fixed',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await outside(page);
  await expect(page.locator('.start-foliage')).toBeVisible();
  mkdirSync('.artifacts/manor-wind',{recursive:true});
  await page.locator('#game-viewport').screenshot({path:'.artifacts/manor-wind/in-game.png'});
  const change=await page.evaluate(async()=>{
    const {loadManorExterior,paintManorExterior}=await import('/src/ui/manorExterior.js');
    const {loadManorWind,createManorWind}=await import('/src/ui/manorWind.js');
    const image=await loadManorExterior(),assets=await loadManorWind();
    const W=1280,H=665;
    const source=document.createElement('canvas'),background=document.createElement('canvas');
    for(const canvas of [source,background]){canvas.width=W;canvas.height=H;}
    const scene=paintManorExterior(source.getContext('2d'),W,H,image);
    paintManorExterior(background.getContext('2d'),W,H,assets.background);
    const wind=createManorWind({source,background,mask:assets.mask,photo:scene.photo});
    if(!wind)throw new Error('The wind renderer did not initialize');
    const gl=wind.canvas.getContext('webgl');
    const read=time=>{
      wind.draw(time);
      const bytes=new Uint8Array(W*H*4);
      gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      return {bytes,image:wind.canvas.toDataURL('image/png')};
    };
    const a=read(0),b=read(6);
    const counts={left:0,right:0,facade:0,roots:0};
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=((H-y-1)*W+x)*4;
      const d=Math.max(...[0,1,2].map(k=>Math.abs(a.bytes[i+k]-b.bytes[i+k])));
      if(!d)continue;
      if(x<W*.42&&y<H*.7)counts.left++;
      if(x>W*.61&&y<H*.7)counts.right++;
      if(x>W*.43&&x<W*.58&&y>H*.3&&y<H*.85)counts.facade++;
      if(y>H*.86)counts.roots++;
    }
    wind.dispose();
    return {...counts,frames:[a.image,b.image]};
  });
  for(const [index,data] of change.frames.entries())writeFileSync(`.artifacts/manor-wind/phase-${index}.png`,Buffer.from(data.split(',')[1],'base64'));
  expect(change.left).toBeGreaterThan(500);
  expect(change.right).toBeGreaterThan(500);
  expect(change.facade).toBe(0);
  expect(change.roots).toBe(0);
  expect(errors).toEqual([]);
});

test('wind is visibly animated by the actual start screen clock at its displayed size',async({page})=>{
  await outside(page);
  await expect(page.locator('.start-foliage')).toBeVisible();
  await expect(page.locator('#start-film .start-painting').first()).toHaveCSS('visibility','hidden');
  const result=await page.evaluate(async()=>{
    const canvas=document.querySelector('.start-foliage');
    const gl=canvas.getContext('webgl'),W=canvas.width,H=canvas.height;
    const {loadManorExterior,paintManorExterior}=await import('/src/ui/manorExterior.js');
    const reference=document.createElement('canvas');reference.width=W;reference.height=H;
    const scene=paintManorExterior(reference.getContext('2d'),W,H,await loadManorExterior());
    const p=scene.photo,frames=[];
    let first,peak=0;
    for(let frame=0;frame<24;frame++){
      await new Promise(requestAnimationFrame);
      const bytes=new Uint8Array(W*H*4);
      gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      if(!first)first=bytes;
      let difference=0,count=0;
      // Crown and branch pixels in the main, visible part of the image,
      // excluding the faded top edge. Read the live screen, not a shader
      // manually advanced by this test.
      for(let y=Math.ceil(p.top+p.height*.12);y<p.top+p.height*.57;y++)
        for(let x=Math.ceil(p.left+p.width*.10);x<p.left+p.width*.38;x++){
          const i=((H-y-1)*W+x)*4;
          difference+=Math.max(...[0,1,2].map(k=>Math.abs(bytes[i+k]-first[i+k])));
          count++;
        }
      peak=Math.max(peak,difference/count);
      frames.push(canvas.toDataURL('image/png'));
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    return {frames,peak,width:W,height:H};
  });
  mkdirSync('.artifacts/manor-wind',{recursive:true});
  const frames=[];
  for(const data of result.frames)frames.push(await sharp(Buffer.from(data.split(',')[1],'base64')).ensureAlpha().raw().toBuffer());
  await sharp(Buffer.concat(frames),{raw:{width:result.width,height:result.height*frames.length,channels:4,pageHeight:result.height}})
    .webp({quality:88,loop:1,delay:Array(frames.length).fill(150),effort:4})
    .toFile('.artifacts/manor-wind/visible-wind.webp');
  writeFileSync('.artifacts/manor-wind/visible-wind.json',JSON.stringify({peakMeanPixelChange:result.peak,width:result.width,height:result.height,frames:frames.length},null,2));
  expect(result.peak).toBeGreaterThan(.4);
});

test('branches sway along one fixed axis without vertical or orbital motion',async({page})=>{
  await outside(page);
  const change=await page.evaluate(async()=>{
    const {createManorWind}=await import('/src/ui/manorWind.js');
    const W=320,H=180;
    const source=document.createElement('canvas'),background=document.createElement('canvas'),mask=document.createElement('canvas');
    for(const c of [source,background,mask]){c.width=W;c.height=H;}
    const ctx=source.getContext('2d'),pixels=ctx.createImageData(W,H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=(y*W+x)*4;
      pixels.data[i]=Math.round(100+70*Math.sin(x*.19));
      pixels.data[i+1]=Math.floor(y/6)%2?210:35;
      pixels.data[i+2]=80;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    background.getContext('2d').drawImage(source,0,0);
    mask.getContext('2d').fillStyle='#f00';mask.getContext('2d').fillRect(0,0,W,H);
    const wind=createManorWind({source,background,mask,photo:{left:0,top:0,width:W,height:H}});
    const gl=wind.canvas.getContext('webgl');
    let first,horizontal=0,vertical=0;
    for(const time of [0,3,7,11]){
      wind.draw(time);
      const bytes=new Uint8Array(W*H*4);
      gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      if(!first)first=bytes;
      for(let y=4;y<H-4;y++)for(let x=4;x<W-4;x++){
        const i=(y*W+x)*4;
        // Red varies only across the image; green only between rows.
        // Moving side to side must change red without moving a green row.
        if(bytes[i]!==first[i])horizontal++;
        if(bytes[i+1]!==first[i+1])vertical++;
      }
    }
    wind.dispose();
    return {horizontal,vertical};
  });
  expect(change.horizontal).toBeGreaterThan(1000);
  expect(change.vertical).toBe(0);
});

test('wind respects comfort settings and survives resize, graphics loss, manor entry and return',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await outside(page,'reduced');
  await expect(page.locator('.start-foliage')).toHaveCount(0);
  await evaluateApp(page,({services})=>services.preferences.set({motion:'system'}));
  await expect(page.locator('.start-foliage')).toBeVisible();
  await page.setViewportSize({width:1100,height:760});
  await expect.poll(()=>page.locator('.start-foliage').evaluate(c=>c.width)).toBeLessThan(1180);
  await expect(page.locator('.start-foliage')).toBeVisible();
  await evaluateApp(page,({services})=>services.preferences.set({ambientEffects:false}));
  await expect(page.locator('.start-foliage')).toHaveCount(0);
  await evaluateApp(page,({services})=>services.preferences.set({ambientEffects:true}));
  await expect(page.locator('.start-foliage')).toBeVisible();
  await page.locator('.start-foliage').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.locator('.start-foliage')).toHaveCount(0);
  await expect(page.locator('#start-film .start-painting').first()).toHaveCSS('visibility','visible');
  await evaluateApp(page,({services})=>{services.preferences.set({ambientEffects:false});services.preferences.set({ambientEffects:true});});
  await expect(page.locator('.start-foliage')).toBeVisible();
  await page.locator('#start-door').click();
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene?.scene.key)).toBe('Hall');
  await expect(page.locator('#start-screen')).toBeHidden();
  await expect(page.locator('.start-foliage')).toHaveCount(0);
  await page.locator('#btn-leave').click();
  await expect(page.locator('#start-screen')).toBeVisible();
  await expect(page.locator('.start-foliage')).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.start-foliage')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('unavailable wind textures leave the original exterior and doorway usable',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/ashcombe-wind-*',route=>route.abort());
  await outside(page);
  await expect(page.locator('.start-foliage')).toHaveCount(0);
  await expect(page.locator('#start-film .start-painting').first()).toHaveCSS('visibility','visible');
  await page.locator('#start-door').click();
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene?.scene.key)).toBe('Hall');
  expect(errors).toEqual([]);
});
