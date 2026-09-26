import { test, expect } from '@playwright/test';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

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
  await page.addInitScript(lastIndex => {
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', String(lastIndex));
    localStorage.setItem('hasPlayedBefore', 'true');
  }, LEVEL_METADATA.length - 1);
  await page.goto('/');
  await expect(page).toHaveURL(/\/puzzle\/$/);
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('.level-btn')).toHaveCount(LEVEL_METADATA.length);
  await page.keyboard.press('Enter');
  await expect(page.locator('#start-screen')).toBeHidden();
  await expect(page.locator('#level-veil')).not.toHaveClass(/cover/);

  for (let index = 0; index < LEVEL_METADATA.length; index++) {
    await test.step(`Open level ${index + 1}`, async () => {
      const tile = page.locator('.level-btn').nth(index);
      await expect(tile).toHaveAttribute('aria-disabled', 'false');
      await tile.click();
      await expect(tile).toHaveAttribute('aria-current', 'step');
      await expect(page.locator('#level-veil')).not.toHaveClass(/cover/);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#game-container > canvas')).toBeVisible();
      await page.locator('#btn-info').click();
      await expect(page.locator('#info-modal')).toBeVisible();
      await expect(page.locator('#info-text')).not.toBeEmpty();
      await page.locator('#btn-close-info').click();
      expect(errors, `Runtime errors after level ${index + 1}`).toEqual([]);
      expect(failedAssets, `Failed resources after level ${index + 1}`).toEqual([]);
    });
  }
  for (const asset of [
    'images/PlantPot/leaf.png', 'sounds/PlantPot/wateringplant.mp3',
    'sounds/MobilePhone/keypad.mp3', 'images/Lightswitch/Samuel.png',
    'images/TV/astronomy.jpg', 'sounds/TV/staticsound.mp3',
    'sounds/Modem/hardwaresound.mp3', 'sounds/Wires/music.mp3', 'sounds/Rally/wroom.mp3',
  ]) {
    expect(localRequests.has(`/puzzle/assets/${asset}`), `The published level requested ${asset}`).toBe(true);
  }
  expect([...localRequests].filter(path => !path.startsWith('/puzzle/') && path !== '/')).toEqual([]);
  expect([...localRequests].filter(path => path.includes('/src/'))).toEqual([]);
});
