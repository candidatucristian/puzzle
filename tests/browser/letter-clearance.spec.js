import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('a returning letter stays above the open flap and enters the envelope mouth',async({page})=>{
  await page.goto('/tests/browser/fixtures/letter-clearance.html');
  await page.evaluate(async()=>{await window.reviewReady;});
  const snapshots=[];
  for(let frame=80;frame>=56;frame--){
    snapshots.push(await page.evaluate(frame=>window.letterProbe(frame),frame));
  }
  const exposed=snapshots.filter(s=>s.external>0);
  expect(exposed.length,'the sample includes the exposed sheet approaching the mouth').toBeGreaterThan(10);
  for(const s of exposed){
    expect(s.gap,`frame ${s.frame}: the sheet must be in front of the open flap`).toBeGreaterThan(.001);
  }
  const {pocket}=snapshots.at(-1);
  expect(pocket.bottom-pocket.floor,'the sheet clears the envelope back').toBeGreaterThan(.001);
  expect(pocket.roof-pocket.top,'the sheet stays underneath the front pocket').toBeGreaterThan(.0005);
  expect(pocket.frontEdge,'the whole sheet is inside before the flap closes').toBeGreaterThan(-.54);
  mkdirSync('.artifacts/letter-clearance-review',{recursive:true});
  for(const frame of [80,76,72,68,64,60,56]){
    await page.evaluate(frame=>window.letterProbe(frame),frame);
    await page.screenshot({path:`.artifacts/letter-clearance-review/frame-${frame}.png`});
  }
});
