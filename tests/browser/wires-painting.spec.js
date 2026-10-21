import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {evaluateApp} from './app.js';

const scene=page=>evaluateApp(page,({services})=>{
  const s=services.levels.activeScene;return {key:s?.scene.key,built:s?._built};
});
test('Room IV opens the realistic bird painting, preserves FACADE and unlocks its chest',async({page})=>{
  const errors=[],oldAssets=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/images/Crossing/'))oldAssets.push(r.url());});
  page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)errors.push(`${r.status()}: ${r.url()}`);});
  await page.addInitScript(()=>{
    localStorage.setItem('caseFile:letters',JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort',JSON.stringify({motion:'reduced'}));
    localStorage.setItem('puzzleProgress',JSON.stringify({version:3,completedLevelIds:['sequence','station'],
      unlockedLevelIds:['sequence','station'],lastPlayedLevelId:'sequence',keys:['Room4'],usedKeys:['Room4'],visitedPlaces:['Room4']}));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0,{timeout:30000});
  await evaluateApp(page,({ui,services})=>{ui.showGame();services.levels.enterPlace('Room4');});
  await expect.poll(async()=>(await scene(page)).key).toBe('Room4');
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene.cameras.main.fadeEffect.isRunning)).toBe(false);
  const target=await evaluateApp(page,({services})=>{
    const s=services.levels.activeScene,t=s._L.things.find(t=>t.level==='wires');
    return {x:t.box.x+t.box.width/2,y:t.box.y+t.box.height/2,W:s.scale.width,H:s.scale.height};
  });
  mkdirSync('.artifacts/wires-painting-review',{recursive:true});
  await page.locator('#game-viewport').screenshot({path:'.artifacts/wires-painting-review/room4.png'});
  const b=await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(b.x+target.x/target.W*b.width,b.y+target.y/target.H*b.height);
  await expect.poll(async()=>(await scene(page)).key).toBe('Wires');
  await expect.poll(async()=>(await scene(page)).built).toBe(true);
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._birds.map(b=>b.note).join(''))).toBe('FACADE');
  expect(await evaluateApp(page,({services})=>services.levels.homeOf(services.levels.indexOf('wires')).key)).toBe('Room4');
  await expect(page.locator('#game-container canvas')).toHaveCSS('filter','none');
  await page.mouse.move(0,0);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/wires-painting-review/painting.png'});
  await evaluateApp(page,({services})=>services.preferences.set({motion:'system',ambientEffects:true}));
  const first=await page.locator('#game-container canvas').screenshot();
  await page.evaluate(()=>new Promise(resolve=>{let n=20;const frame=()=>--n?requestAnimationFrame(frame):resolve();requestAnimationFrame(frame);}));
  expect((await page.locator('#game-container canvas').screenshot()).equals(first),'the framed picture stays still').toBe(true);
  await page.setViewportSize({width:915,height:412});
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene._H)).toBeLessThan(400);
  expect(await evaluateApp(page,({services})=>{
    const s=services.levels.activeScene,p=s._art.image;
    return s._birds.length===6&&s._birds.every(b=>b.x>p.x&&b.x<p.x+p.width&&b.y>p.y+15&&b.y<p.y+p.height);
  })).toBe(true);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/wires-painting-review/compact.png'});
  await page.locator('#level-code').fill('GO');await page.locator('#btn-submit').click();
  expect((await scene(page)).key).toBe('Wires');
  await page.locator('#level-code').fill('FACADE');await page.locator('#btn-submit').click();
  await expect.poll(async()=>(await scene(page)).key).toBe('Room4');
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._L.on.painting)).toBe(false);
  expect(await evaluateApp(page,({services})=>services.levels.keyWaitingIn('Room4'))).toBe('Room5');
  await expect.poll(()=>evaluateApp(page,({services})=>Boolean(services.levels.activeScene.children.list
    .find(c=>c.getData?.('interactionLabel')==='Take the key'&&c.input?.enabled)))).toBe(true);
  const key=await evaluateApp(page,({services})=>{
    const s=services.levels.activeScene,k=s.children.list.find(c=>c.getData?.('interactionLabel')==='Take the key'),r=k.getBounds();
    return {x:r.centerX,y:r.centerY,W:s.scale.width,H:s.scale.height};
  });
  const canvas=await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(canvas.x+key.x/key.W*canvas.width,canvas.y+key.y/key.H*canvas.height);
  expect(await evaluateApp(page,({services})=>services.levels.placeState('Room4').finished)).toBe(true);
  expect(oldAssets).toEqual([]);expect(errors).toEqual([]);
});
