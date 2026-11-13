import { test, expect, boot, stand, sceneIs, clickThing, evaluateApp } from './helpers.js';

test('three tours of all nine puzzles leave one active scene, release overlays and keep texture counts bounded', async ({ page }) => {
  test.setTimeout(180000); await boot(page, { keys: ['Room2', 'Room3'] });
  const samples = [];
  for (let round = 0; round < 3; round++) {
    for (const [room, ids] of [['Study', ['binarytree', 'plantpot', 'cryptex']], ['Room2', ['cot', 'overtime', 'modem']], ['Room3', ['compass', 'chessboard', 'mobilephone']]]) {
      await stand(page, room);
      for (const id of ids) {
        await clickThing(page, id);
        await page.locator('#btn-leave').click(); await sceneIs(page, room);
        expect(await evaluateApp(page, ({ game }) => game.scene.getScenes(true).map(s => s.scene.key))).toEqual([room]);
        await expect(page.locator('.cryptex-candle')).toHaveCount(0);
      }
    }
    samples.push(await evaluateApp(page, ({ game }) => ({
      textures: game.textures.getTextureKeys().length,
      sounds: game.sound.sounds.length,
      canvases: document.querySelectorAll('#game-container > canvas').length,
    })));
  }
  expect(samples[2].textures).toBeLessThanOrEqual(samples[0].textures + 2);
  expect(samples[2].sounds).toBeLessThanOrEqual(samples[0].sounds + 2);
  expect(samples.map(s => s.canvases)).toEqual([1, 1, 1]);
  await test.info().attach('lifecycle-counts', { body: JSON.stringify(samples, null, 2), contentType: 'application/json' });
});
