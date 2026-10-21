import { test, expect } from '@playwright/test';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { evaluateApp, openHints } from '../browser/app.js';

test('the production build opens every level through the real UI from a subdirectory', async ({ page, request }) => {
  const forbidden = await request.get('/puzzle/..%2Fpackage.json');
  expect(forbidden.status()).toBe(403);
  const missing = await request.get('/puzzle/assets/missing-file.mp3');
  expect(missing.status()).toBe(404);
  const sample = await request.get('/puzzle/assets/sounds/global/click.mp3', { headers: { Range: 'bytes=0-15' } });
  expect(sample.status()).toBe(206);
  expect(sample.headers()['content-type']).toBe('audio/mpeg');
  expect((await sample.body()).length).toBe(16);

  const errors = [], failedAssets = [], localRequests = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', resource => {
    const url = new URL(resource.url());
    if (url.protocol === 'http:' && url.origin === 'http://127.0.0.1:4173') localRequests.add(url.pathname);
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400) {
      failedAssets.push(`${response.status()} ${url.pathname}`);
    }
  });
  page.on('requestfailed', resource => {
    if (new URL(resource.url()).origin === 'http://127.0.0.1:4173') {
      failedAssets.push(`${resource.failure()?.errorText} ${resource.url()}`);
    }
  });
  await page.addInitScript(() => {
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', '40');
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('house:entered', 'true');
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/puzzle\/$/);
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
  await expect(page.locator('#start-screen')).toBeHidden();
  await expect(page.locator('#level-veil')).not.toHaveClass(/cover/);

  for (let index = 0; index < LEVEL_METADATA.length; index++) {
    await test.step(`Open level ${index + 1}`, async () => {
      await evaluateApp(page, ({ ui }, index) => ui.navigate(index, { quick: true }), index);
      await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.currentIndex)).toBe(index);
      await expect(page.locator('#level-veil')).not.toHaveClass(/cover/);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#game-container > canvas')).toBeVisible();
      await openHints(page);
      await expect(page.locator('#right-sidebar-wrapper')).toHaveClass(/drawer-open/);
      await expect(page.locator('#hint-list li')).toHaveCount(1);
      await expect(page.locator('#hint-list p')).not.toBeEmpty();
      await page.locator('#btn-next-hint').click();
      await expect(page.locator('#hint-list li')).toHaveCount(2);
      await page.locator('#right-sidebar [data-close-drawer]').click();
      expect(errors, `Runtime errors after level ${index + 1}`).toEqual([]);
      expect(failedAssets, `Failed resources after level ${index + 1}`).toEqual([]);
    });
  }
  for (const asset of [
    'images/PlantPot/leaf.webp', 'sounds/PlantPot/wateringplant.mp3',
    'sounds/MobilePhone/keypad.mp3', 'sounds/Lightswitch/switchsound.mp3',
    'images/TV/astronomy.webp', 'sounds/TV/staticsound.mp3',
    'sounds/Modem/hardwaresound.mp3', 'sounds/Wires/music.mp3', 'sounds/Rally/wroom.mp3',
  ]) {
    expect(localRequests.has(`/puzzle/assets/${asset}`), `The published level requested ${asset}`).toBe(true);
  }
  expect([...localRequests].filter(path => !path.startsWith('/puzzle/') && path !== '/')).toEqual([]);
  expect([...localRequests].filter(path => path.includes('/src/'))).toEqual([]);
});
