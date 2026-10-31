import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {evaluateApp} from './app.js';

async function point(page,id) {
  return evaluateApp(page,({services},id)=>{
    const s=services.levels.activeScene,t=s._toys[id];
    const b=t.zone.getBounds();
    return {x:b.centerX,y:b.centerY,W:s.scale.width,H:s.scale.height};
  },id);
}
async function coordinates(page,p) {
  const b=await page.locator('#game-container canvas:not(.live-room)').boundingBox();
  return {x:b.x+p.x/p.W*b.width,y:b.y+p.y/p.H*b.height};
}
async function click(page,id) {
  const p=await coordinates(page,await point(page,id));await page.mouse.click(p.x,p.y);
}
const state=page=>evaluateApp(page,({services})=>{
  const s=services.levels.activeScene;
  return {key:s?.scene.key,built:s?._built,positions:s?._positions,state:s?._state};
});

const alignment=page=>evaluateApp(page,({services})=>{
  const s=services.levels.activeScene,L=s._L;
  let error=0;
  for(const [a,b]of[[0,0],[1,0],[0,1],[1,1],[.5,.5]]) {
    const p=L.at(a,b),q=s._stage.plane(p.x,p.y);
    error=Math.max(error,Math.abs(a-q.a),Math.abs(b-q.b));
  }
  const plate=s.children.list.find(o=>o.texture?.key==='cot_native_room');
  const bounds=plate.getBounds();
  return {error,stretch:Math.abs(plate.scaleX-plate.scaleY),
    gap:Math.max(0,bounds.left,bounds.top,L.W-bounds.right,L.H-bounds.bottom)};
});

const cluesInView=page=>evaluateApp(page,({services})=>{
  const s=services.levels.activeScene;
  return Object.keys(s._toys).every(id=>{
    const b=s._stage.bounds(id);
    return b.x>=0&&b.y>=0&&b.x+b.w<=s.scale.width&&b.y+b.h<=s.scale.height;
  });
});

test('His Cot keeps its fifteen decorative belongings fixed and lets only the five clues move and interact',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    localStorage.setItem('caseFile:letters',JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort',JSON.stringify({motion:'reduced'}));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0,{timeout:30000});
  await evaluateApp(page,({ui,services})=>{ui.showGame();services.levels.enterPlace('Room6');});
  await expect.poll(async()=>(await state(page)).key).toBe('Room6');
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene.cameras.main.fadeEffect.isRunning)).toBe(false);
  mkdirSync('.artifacts/cot-review',{recursive:true});
  await page.locator('#game-viewport').screenshot({path:'.artifacts/cot-review/room6.png'});
  const cot=await evaluateApp(page,({services})=>{
    const s=services.levels.activeScene,b=s._L.things.find(t=>t.level==='cot').box;
    return {x:b.x+b.width/2,y:b.y+b.height/2,W:s.scale.width,H:s.scale.height};
  });
  const cp=await coordinates(page,cot);await page.mouse.click(cp.x,cp.y);
  await expect.poll(async()=>(await state(page)).key).toBe('Cot');
  await expect.poll(async()=>(await state(page)).built).toBe(true);
  const projection=await alignment(page);
  expect(projection.error,'live toy camera matches all four rendered mattress corners').toBeLessThan(.00001);
  expect(projection.stretch,'the Cycles photograph retains its proportions').toBe(0);
  expect(projection.gap,'the photograph fills every edge of the game viewport').toBeLessThan(.01);
  expect(await cluesInView(page)).toBe(true);
  await expect(page.locator('#game-container canvas:not(.live-room)')).toHaveCSS('filter','none');
  expect(await evaluateApp(page,({services})=>Object.values(services.levels.activeScene._toys)
    .filter(t=>t.zone.input?.draggable).map(t=>t.id).sort())).toEqual(['book','chaplin','hotel','musicbox','oscar']);
  expect(await evaluateApp(page,({services})=>services.levels.activeScene._L.all.length)).toBe(20);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/cot-review/initial.png'});
  for(const id of ['duck','train','rockingHorse','ball','teddy','rabbit']) {
    const p=await coordinates(page,await evaluateApp(page,({services},id)=>{
      const s=services.levels.activeScene,t=s._L.belongings.find(t=>t.id===id);
      return {x:t.x,y:t.y+t.h*(.5-t.origin),W:s.scale.width,H:s.scale.height};
    },id));
    await page.mouse.move(p.x,p.y);await page.mouse.down();
    await page.mouse.move(p.x+16,p.y+9,{steps:6});await page.mouse.up();
    expect((await state(page)).positions,id+' remains fixed').toEqual({});
  }
  for(const[id,event]of[['musicbox','dance'],['oscar','glint'],['book','open'],['chaplin','hat'],['hotel','bell']]){
    await click(page,id);
    await expect.poll(async()=>Boolean((await state(page)).state[event]),{message:id+' responds to a click'}).toBe(true);
  }
  await page.locator('#game-viewport').screenshot({path:'.artifacts/cot-review/hotel-lit.png'});
  for(const id of ['book','musicbox','hotel','chaplin','oscar']){
    const p=await coordinates(page,await point(page,id));
    await page.mouse.move(p.x,p.y);await page.mouse.down();
    await page.mouse.move(p.x+16,p.y+9,{steps:6});await page.mouse.up();
    await expect.poll(async()=>Boolean((await state(page)).positions[id]),{message:id+' can be dragged'}).toBe(true);
  }
  const moved=(await state(page)).positions;
  await page.setViewportSize({width:1280,height:820});
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene._L.W)).toBeLessThan(1180);
  expect((await state(page)).positions).toEqual(moved);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/cot-review/moved.png'});
  await evaluateApp(page,({services})=>services.preferences.set({motion:'system'}));
  const turn=(await state(page)).state.turn;
  await expect.poll(async()=>(await state(page)).state.turn).toBeGreaterThan(turn);
  await click(page,'chaplin');
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene._stage.toys.chaplin.parts.hat.position.y)).toBeGreaterThan(.118);
  const p=await coordinates(page,await point(page,'hotel'));
  await page.mouse.move(p.x,p.y);await page.mouse.down();
  await page.mouse.move(-100,1200,{steps:10});await page.mouse.up();
  expect(await evaluateApp(page,({services})=>{
    const s=services.levels.activeScene,b=s._stage.bounds('hotel');
    return b.x>=0&&b.x+b.w<=s.scale.width&&b.y+b.h<s._L.frontTop;
  })).toBe(true);
  await page.setViewportSize({width:915,height:412});
  await expect.poll(async()=>{
    const b=await page.locator('#game-viewport').boundingBox();
    return evaluateApp(page,({services},b)=>Math.abs(services.levels.activeScene._L.W-b.width),b);
  }).toBeLessThan(3);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/cot-review/compact.png'});
  const compactProjection=await alignment(page);
  expect(compactProjection.error).toBeLessThan(.00001);
  expect(compactProjection.gap,'compact landscape has no side bars').toBeLessThan(.01);
  expect(await cluesInView(page)).toBe(true);
  await page.setViewportSize({width:640,height:960});
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.activeScene._L.W)).toBeLessThan(640);
  const portraitProjection=await alignment(page);
  expect(portraitProjection.stretch).toBe(0);
  expect(portraitProjection.gap).toBeLessThan(.01);
  await page.locator('#game-viewport').screenshot({path:'.artifacts/cot-review/portrait.png'});
  await page.setViewportSize({width:1280,height:820});
  await expect(page.locator('#rotate-prompt')).toBeHidden();
  await evaluateApp(page,({services})=>services.preferences.set({motion:'reduced'}));
  await page.locator('#btn-replay').click();
  await expect.poll(async()=>Object.keys((await state(page)).positions||{}).length).toBe(0);
  await expect.poll(async()=>(await state(page)).built).toBe(true);
  await page.locator('#level-code').fill('TORCH');await page.locator('#btn-submit').click();
  await expect.poll(()=>evaluateApp(page,({services})=>services.levels.place?.key)).toBe('Room6');
  expect(errors).toEqual([]);
});

