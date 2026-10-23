import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {evaluateApp} from './app.js';

const state = page => evaluateApp(page, ({services}) => {
  const s = services.levels.activeScene;
  return {key:s?.scene.key, built:s?._built, step:s?.currentStep, leaves:s?.leaves?.length, animating:s?.isAnimating, solved:s?.isSolved};
});

async function pour(page) {
  const p = await evaluateApp(page, ({services}) => {
    const s = services.levels.activeScene, b = s.bench, p = s._pourPoint();
    return {x:b.x+s.bucket.x*b.scaleX, y:b.y+s.bucket.y*b.scaleY,
      px:b.x+p.x*b.scaleX, py:b.y+p.y*b.scaleY, W:s.scale.width, H:s.scale.height};
  });
  const box = await page.locator('#game-container canvas').boundingBox();
  const screen = (x,y) => ({x:box.x+x/p.W*box.width,y:box.y+y/p.H*box.height});
  const a = screen(p.x,p.y), b = screen(p.px,p.py);
  await page.mouse.move(a.x,a.y); await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:12}); await page.mouse.up();
}

async function upperLeafOverlap(page) {
  return evaluateApp(page,({services})=>{
    const s=services.levels.activeScene,W=s.scale.width,H=s.scale.height;
    const c=document.createElement('canvas');c.width=W;c.height=H;
    const g=c.getContext('2d',{willReadFrequently:true});
    const masks=s.leaves.map(leaf=>{
      g.resetTransform();g.clearRect(0,0,W,H);
      const m=leaf.getWorldTransformMatrix();
      g.setTransform(m.a,m.b,m.c,m.d,m.tx,m.ty);
      g.drawImage(leaf.texture.getSourceImage(),-leaf.displayOriginX,-leaf.displayOriginY);
      const rgba=g.getImageData(0,0,W,H).data,bits=new Uint8Array(W*H);
      let area=0;
      for(let p=0;p<bits.length;p++)if(rgba[p*4+3]>96){bits[p]=1;area++;}
      return {bits,area};
    });
    let ratio=0,pair=null;
    // Test the visible blades, including their relationship to older leaves;
    // empty corners of rotated rectangular sprites are allowed to overlap.
    for(let i=7;i<masks.length;i++)for(let j=0;j<i;j++) {
      let shared=0;
      for(let p=0;p<masks[i].bits.length;p++)shared+=masks[i].bits[p]&masks[j].bits[p];
      const overlap=shared/Math.max(1,Math.min(masks[i].area,masks[j].area));
      if(overlap>ratio){ratio=overlap;pair=[i,j];}
    }
    return {ratio,pair,areas:masks.map(m=>m.area)};
  });
}

async function expectFullScene(page,checkPlant=false) {
  const view=await evaluateApp(page,({services},checkPlant)=>{
    const s=services.levels.activeScene,{W,H,render}=s._L;
    const bounds=checkPlant?s.leaves.map(leaf=>{
      const b=leaf.getBounds();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};
    }):[];
    if(checkPlant){const b=s.bucket.getBounds();bounds.push({x:b.x,y:b.y,right:b.right,bottom:b.bottom,label:'water pail'});}
    const sky=s.textures.get(s._art.keys.sky).getSourceImage().getContext('2d');
    const corners=[[0,0],[W-1,0],[0,H-1],[W-1,H-1]].map(([x,y])=>sky.getImageData(x,y,1,1).data[3]);
    const frame=s.textures.exists(s._art.keys.window)?s.textures.get(s._art.keys.window).getSourceImage().getContext('2d'):null;
    const windowPixels=frame?[[1,H/2],[W-2,H/2],[W/2,H-2],[W/2,H/2]].map(([x,y])=>frame.getImageData(Math.floor(x),Math.floor(y),1,1).data[3]):[];
    return {W,H,render,bounds,corners,windowFrame:s._L.windowFrame,windowPixels};
  },checkPlant);
  expect(view.render.left,'picture extends behind the left jamb').toBeLessThanOrEqual(view.windowFrame.left*.65+.01);
  expect(view.render.top,'picture extends behind the lintel').toBeLessThanOrEqual(view.windowFrame.top*.65+.01);
  expect(view.render.left+view.render.width,'picture extends behind the right jamb').toBeGreaterThanOrEqual(view.W-(view.W-view.windowFrame.right)*.65-.01);
  expect(view.render.top+view.render.height,'picture extends behind the sill').toBeGreaterThanOrEqual(view.H-(view.H-view.windowFrame.bottom)*.65-.01);
  expect(view.corners,'all four picture corners are filled').toEqual([255,255,255,255]);
  expect(view.windowFrame,'the garden is seen through the foreground window').toBeTruthy();
  expect(view.windowPixels,'solid side jambs and sill surround a clear opening').toEqual([255,255,255,0]);
  for(const [i,b] of view.bounds.entries()) {
    const label=b.label??`leaf ${i+1}`;
    expect(b.x,`${label} stays inside the left edge`).toBeGreaterThanOrEqual(-2);
    expect(b.y,`${label} stays inside the top edge`).toBeGreaterThanOrEqual(-2);
    expect(b.right,`${label} stays inside the right edge`).toBeLessThanOrEqual(view.W+2);
    expect(b.bottom,`${label} stays inside the bottom edge`).toBeLessThanOrEqual(view.H+2);
    expect(b.x,`${label} remains inside the window opening`).toBeGreaterThanOrEqual(view.windowFrame.left-2);
    expect(b.y,`${label} clears the top of the window`).toBeGreaterThanOrEqual(view.windowFrame.top-2);
    expect(b.right,`${label} clears the right jamb`).toBeLessThanOrEqual(view.windowFrame.right+2);
    expect(b.bottom,`${label} remains above the sill`).toBeLessThanOrEqual(view.windowFrame.bottom+2);
  }
}

test('the garden plant grows 1, 1, 2, 3 and 5 leaves through real bucket drags and preserves growth on resize', async({page}) => {
  test.setTimeout(90000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const plantImages=[];page.on('request',r=>{if(r.url().includes('/assets/images/PlantPot/'))plantImages.push(r.url());});
  page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)errors.push(`${r.status()}: ${r.url()}`);});
  await page.addInitScript(()=>{
    localStorage.setItem('caseFile:letters',JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort',JSON.stringify({motion:'reduced',ambientEffects:false}));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0,{timeout:30000});
  await evaluateApp(page,({ui,services})=>{
    ui.showGame(); const i=services.levels.definitions.findIndex(l=>l.key==='PlantPot');
    services.levels.discover(i); services.levels.navigate(i);
  });
  await expect.poll(async()=>(await state(page)).key).toBe('PlantPot');
  await expect.poll(async()=>(await state(page)).built).toBe(true);
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._plantArt.leaves.length)).toBe(12);
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._L.blender)).toBe(true);
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._L.setting)).toBe('exterior');
  await expectFullScene(page);
  await expect(page.locator('#game-container canvas')).toHaveCSS('filter','none');
  mkdirSync('.artifacts/plantpot-review',{recursive:true});
  await page.locator('#game-viewport').screenshot({path:'.artifacts/plantpot-review/empty.png'});
  let previous=0;
  for(const [i,count] of [1,1,2,3,5].entries()) {
    await pour(page);
    await expect.poll(async()=>(await state(page)).step,{timeout:10000}).toBe(i+1);
    expect((await state(page)).leaves-previous).toBe(count); previous+=count;
    await expect.poll(async()=>(await state(page)).animating).toBe(false);
    await page.locator('#game-viewport').screenshot({path:`.artifacts/plantpot-review/step-${i+1}.png`});
  }
  expect((await state(page)).solved).toBe(true);
  await expectFullScene(page,true);
  const upper=await upperLeafOverlap(page);
  expect(upper.areas.every(area=>area>50),'every leaf remains visible').toBe(true);
  expect(upper.ratio,`upper leaves overlap: ${JSON.stringify(upper.pair)}`).toBeLessThan(.01);
  expect(await evaluateApp(page,({services})=>new Set(services.levels.activeScene.leaves.map(l=>l.texture.key)).size)).toBe(12);
  await page.locator('#btn-replay').click();
  await expect.poll(async()=>(await state(page)).step).toBe(0);
  await expect.poll(async()=>(await state(page)).built).toBe(true);
  // Resizing in the middle of a real pour completes that one growth stage.
  await pour(page);
  await expect.poll(async()=>(await state(page)).animating).toBe(true);
  await page.setViewportSize({width:1280,height:820});
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene._L.W)).toBeLessThan(1180);
  await expect.poll(async()=>(await state(page)).step).toBe(1);
  expect((await state(page)).leaves).toBe(1);
  for(let i=1;i<5;i++) {
    await pour(page);
    await expect.poll(async()=>(await state(page)).step,{timeout:10000}).toBe(i+1);
    await expect.poll(async()=>(await state(page)).animating).toBe(false);
  }
  await page.locator('#game-viewport').screenshot({path:'.artifacts/plantpot-review/resized.png'});
  await page.setViewportSize({width:915,height:412});
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene._L.H)).toBeLessThan(400);
  expect((await state(page)).leaves).toBe(12);
  await expectFullScene(page,true);
  expect((await upperLeafOverlap(page)).ratio,'upper blades stay separate on compact screens').toBeLessThan(.03);
  await page.mouse.move(0,0);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/plantpot-review/compact.png'});
  await page.locator('#level-code').fill('FIBONACCI'); await page.locator('#btn-submit').click();
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.place?.key)).toBe('Study');
  await expect(page.locator('#game-container canvas')).not.toHaveAttribute('data-scene-colour','natural');
  expect(errors).toEqual([]);
  expect(plantImages.length).toBeGreaterThan(10);
  expect(plantImages.every(url=>url.includes('/PlantPot/Blender/')),'the puzzle only loads Blender image assets').toBe(true);
  expect(plantImages.some(url=>url.includes('/forest-v6.webp')),'the moonlit woodland is visible beyond the window').toBe(true);
  expect(plantImages.some(url=>url.includes('/conservatory-')),'no indoor background is loaded').toBe(false);
  expect(plantImages.some(url=>url.includes('/window-v1.webp')),'the foreground is a rendered Blender window').toBe(true);
});
