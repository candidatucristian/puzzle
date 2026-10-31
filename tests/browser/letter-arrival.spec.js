import { test, expect } from '@playwright/test';
import {mkdirSync} from 'node:fs';
import { evaluateApp } from './app.js';

// Three letters found, the first already read: two wait in the side panel.
async function boot(page, { reduced = false } = {}) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(reduced => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation', 'ivy', 'silas']));
    localStorage.setItem('caseFile:read', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: reduced ? 'reduced' : 'system', ambientEffects: false }));
    localStorage.setItem('hasPlayedBefore', 'true'); localStorage.setItem('house:entered', 'true');
  }, reduced);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => { ui.showGame(); services.levels.enterHall(); });
  await expect(page.locator('.waiting-letter')).toHaveCount(2);
}
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('caseFile:read')));
const missing = response => /CaseFile\/letter\//.test(response.url()) && response.status() >= 400;

test('a letter waiting in the side panel goes onto the desk, is opened there, and is filed once', async ({ page }) => {
  const errors = [];
  const videos=[];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request',request=>{if(/assets\/video\/letter-/.test(request.url()))videos.push(request.url());});
  page.on('response', response => { if (missing(response)) errors.push(`${response.status()} ${response.url()}`); });
  await boot(page);
  await expect(page.locator('.waiting-letter img.wl-envelope').first()).toHaveAttribute('src', /CaseFile\/letter\/envelope-sealed\.webp$/);
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveCount(1);
  await expect(page.locator('.waiting-letter.is-in-flight')).toHaveCount(1);
  await expect(page.locator('.arrival canvas.arrival-model')).toBeVisible();
  await expect(page.locator('.arrival video')).toHaveCount(0);
  // The actual Blender clip moves meshes; there is no video element or movie request.
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'opening', { timeout: 8000 });
  await expect.poll(()=>page.locator('.arrival').evaluate(node=>Number(node.dataset.progress))).toBeGreaterThan(.3);
  mkdirSync('.artifacts/letter-animation-review',{recursive:true});
  await page.screenshot({path:'.artifacts/letter-animation-review/opening.png'});
  await page.setViewportSize({width:1100,height:800});
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 15000 });
  await expect.poll(()=>page.locator('.arrival-model').evaluate(canvas=>Number(canvas.dataset.frame))).toBeGreaterThanOrEqual(155);
  await expect(page.locator('.arrival .letter-page.is-writing')).toHaveCount(0);
  await page.screenshot({path:'.artifacts/letter-animation-review/reading.png'});
  await expect(page.locator('.arrival .letter-words')).toContainText('Ivy');
  await expect(page.locator('.arrival .letter-wax')).toHaveCount(0);
  // not filed until it is filed
  expect(await read(page)).toEqual(['invitation']);
  await page.keyboard.press('Tab');
  await expect(page.locator('.arrival-file')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'filing');
  // more keys while it goes change nothing
  await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
  // The same physical folds close and the letter returns into its envelope.
  await expect.poll(()=>page.locator('.arrival').evaluate(node=>Number(node.dataset.progress))).toBeLessThan(.8);
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.waiting-letter')).toHaveCount(1);
  expect(await read(page)).toEqual(['invitation', 'ivy']);
  await expect(page.locator('#btn-casefile')).toBeFocused();
  expect(errors).toEqual([]);
  expect(videos).toEqual([]);
});

test('a letter that comes by itself waits on the desk, and can be put away for later', async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => {
    const [{ Scope }, { playArrival }, { LETTERS }] = await Promise.all([
      import('/src/shared/Scope.js'), import('/src/ui/letterArrival.js'), import('/src/shared/story.js'),
    ]);
    window.arrivalScope = new Scope();
    window.arrival = playArrival(window.arrivalScope, { letter: LETTERS[2], target: document.querySelector('#btn-casefile') });
  });
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'waiting', { timeout: 8000 });
  await expect(page.locator('.arrival .env')).toBeFocused();
  await expect(page.locator('.arrival canvas.arrival-model')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 4000 });
  expect(await page.evaluate(() => window.arrival)).toBe('later');
  expect(await read(page)).toEqual(['invitation']);
  await page.evaluate(() => window.arrivalScope.dispose());
});

test('without its 3D model the letter is still there to be read and filed', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/CaseFile/letter/**', route => route.abort());
  await boot(page);
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 12000 });
  await expect(page.locator('.arrival .letter-words')).toContainText('Ivy');
  await page.locator('.arrival-file').click();
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 4000 });
  expect(await read(page)).toEqual(['invitation', 'ivy']);
  expect(errors).toEqual([]);
});

test('disposing an opening letter releases its scene and does not file an unread letter',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await boot(page);
  await page.evaluate(async()=>{
    const [{Scope},{playArrival},{LETTERS}]=await Promise.all([
      import('/src/shared/Scope.js'),import('/src/ui/letterArrival.js'),import('/src/shared/story.js'),
    ]);
    window.arrivalScope=new Scope();
    window.arrival=playArrival(window.arrivalScope,{letter:LETTERS[2],target:document.querySelector('#btn-casefile')});
  });
  await expect(page.locator('.arrival')).toHaveAttribute('data-state','waiting',{timeout:8000});
  await page.locator('.arrival .env').click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state','opening');
  await page.evaluate(()=>window.arrivalScope.dispose());
  await expect(page.locator('.arrival')).toHaveCount(0);
  expect(await page.evaluate(()=>window.arrival)).toBe('later');
  expect(await read(page)).toEqual(['invitation']);
  expect(errors).toEqual([]);
});

test('a supplied letter-open.mp4 is played by Audio while the Blender animation supplies the picture',async({page})=>{
  const rate=8000,samples=rate*8,wav=Buffer.alloc(44+samples*2);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*220/rate)*80),44+i*2);
  await page.route('**/assets/sounds/letter-open.mp4',route=>route.fulfill({status:200,contentType:'audio/wav',body:wav}));
  await page.addInitScript(()=>{
    window.letterRecordings=[];
    window.Audio=new Proxy(window.Audio,{construct(Target,args){
      const element=Reflect.construct(Target,args);
      if(String(args[0]).includes('sounds/letter-open.mp4'))window.letterRecordings.push(element);
      return element;
    }});
  });
  await boot(page);
  await evaluateApp(page,({game,services})=>{services.audio.setMasterVolume(1);services.audio.setSfxVolume(.5);game.sound.context.resume();});
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state','opening',{timeout:8000});
  await expect.poll(()=>page.evaluate(()=>window.letterRecordings[0]?.currentTime??0)).toBeGreaterThan(.05);
  expect(await page.evaluate(()=>window.letterRecordings[0] instanceof HTMLAudioElement)).toBe(true);
  await expect(page.locator('.arrival video')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.arrival')).toHaveAttribute('data-state','reading');
  await page.locator('.arrival-file').click();
  await expect(page.locator('.arrival')).toHaveCount(0,{timeout:6000});
  expect(await page.evaluate(()=>window.letterRecordings.every(a=>a.paused&&!a.getAttribute('src')))).toBe(true);
});
