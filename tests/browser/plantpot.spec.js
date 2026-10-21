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

test('the garden plant grows 1, 1, 2, 3 and 5 leaves through real bucket drags and preserves growth on resize', async({page}) => {
  test.setTimeout(90000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
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
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._plantArt.leaves.length)).toBe(4);
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
  const upper=await upperLeafOverlap(page);
  expect(upper.areas.every(area=>area>50),'every leaf remains visible').toBe(true);
  expect(upper.ratio,`upper leaves overlap: ${JSON.stringify(upper.pair)}`).toBeLessThan(.01);
  expect(await evaluateApp(page,({services})=>new Set(services.levels.activeScene.leaves.map(l=>l.texture.key)).size)).toBe(4);
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
  expect((await upperLeafOverlap(page)).ratio,'upper blades stay separate on compact screens').toBeLessThan(.03);
  await page.mouse.move(0,0);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/plantpot-review/compact.png'});
  await page.locator('#level-code').fill('FIBONACCI'); await page.locator('#btn-submit').click();
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.place?.key)).toBe('Study');
  await expect(page.locator('#game-container canvas')).not.toHaveAttribute('data-scene-colour','natural');
  expect(errors).toEqual([]);
});
