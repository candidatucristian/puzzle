import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {evaluateApp} from './app.js';

const state=page=>evaluateApp(page,({services})=>{
  const s=services.levels.activeScene;
  return {key:s?.scene.key,built:s?._built,spread:s?._spread,turning:s?._turning};
});
async function clickPoint(page,p) {
  const b=await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(b.x+p.x/p.W*b.width,b.y+p.y/p.H*b.height);
}
async function turn(page,side) {
  await clickPoint(page,await evaluateApp(page,({services},side)=>{
    const s=services.levels.activeScene,z=s._zones[side];
    return {x:z.x+z.width*.65,y:z.y+z.height*.5,W:s.scale.width,H:s.scale.height};
  },side));
}
test('the chemistry notebook uses sketches and notes, turns all four pages and returns to the laboratory after SHIP',async({page})=>{
  const errors=[],models=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('molecular-models.webp'))models.push(r.url());});
  await page.addInitScript(()=>{
    localStorage.setItem('caseFile:letters',JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort',JSON.stringify({motion:'reduced'}));
  });
  await page.goto('/');await expect(page.locator('#loading-screen')).toHaveCount(0,{timeout:30000});
  await evaluateApp(page,({ui,services})=>{ui.showGame();services.levels.enterPlace('Room7');});
  await expect.poll(async()=>(await state(page)).key).toBe('Room7');
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene.cameras.main.fadeEffect.isRunning)).toBe(false);
  await clickPoint(page,await evaluateApp(page,({services})=>{
    const s=services.levels.activeScene,b=s._L.things.find(t=>t.level==='molecules').box;
    return {x:b.x+b.width/2,y:b.y+b.height/2,W:s.scale.width,H:s.scale.height};
  }));
  await expect.poll(async()=>(await state(page)).key).toBe('Molecules');
  await expect.poll(async()=>(await state(page)).built).toBe(true);
  mkdirSync('.artifacts/chemistry-notebook-review',{recursive:true});
  await page.locator('#game-viewport').screenshot({path:'.artifacts/chemistry-notebook-review/pages-1-2.png'});
  await turn(page,'right');await expect.poll(async()=>(await state(page)).spread).toBe(1);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/chemistry-notebook-review/pages-3-4.png'});
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._zones.right.input.enabled)).toBe(false);
  await evaluateApp(page,({services})=>services.preferences.set({motion:'system'}));
  await turn(page,'left');await expect.poll(async()=>(await state(page)).turning).toBe(true);
  await page.setViewportSize({width:1100,height:760});
  await expect.poll(async()=>(await state(page)).spread).toBe(0);
  await expect.poll(async()=>(await state(page)).turning).toBe(false);
  await page.setViewportSize({width:915,height:412});
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene._L.H)).toBeLessThan(412);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/chemistry-notebook-review/compact.png'});
  await page.locator('#level-code').fill('SHIP');await page.locator('#btn-submit').click();
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.place?.key)).toBe('Room7');
  expect(models).toEqual([]);expect(errors).toEqual([]);
});
