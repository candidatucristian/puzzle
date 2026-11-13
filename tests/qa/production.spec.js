import { test, expect, boot, stand, evaluateApp } from './helpers.js';

test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== 'production', 'Requires the published artifact, with development code removed.');
});

for (const query of ['render', 'sketch']) {
  test(`published demo ignores the developer ?${query} shortcut`, async ({ page }) => {
    await boot(page, { fresh: true }); await page.goto(`./?${query}`);
    await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#start-screen')).toBeVisible();
    expect(await evaluateApp(page, ({ game }) => game.scene.isActive('Room6'))).toBe(false);
  });
}

test('a stored development flag cannot open content beyond the published demo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('devMode', '1'));
  await boot(page, { keys: ['Room2', 'Room3', 'Room4', 'Room5', 'Room6'] });
  await expect(page.locator('#start-menu [data-menu="dev"]')).toBeHidden();
  await expect(page.locator('#players-online')).toBeHidden();
  await stand(page, 'Hall');
  expect(await evaluateApp(page, ({ services }) => services.levels.rooms.filter(r => r.open).map(r => r.key))).toEqual(['Study', 'Room2', 'Room3']);
  expect(await evaluateApp(page, ({ services }) => services.levels.enterPlace('Room4'))).toBe(false);
});

test('published assets use the subdirectory and support media ranges without serving source files', async ({ page, request }) => {
  const paths = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.origin === new URL(test.info().project.use.baseURL).origin) paths.push(url.pathname);
  });
  await boot(page);
  expect((await request.get('/puzzle/..%2Fpackage.json')).status()).toBe(403);
  expect((await request.get('/puzzle/src/main.js')).status()).toBe(404);
  const media = await request.get('/puzzle/assets/sounds/global/ui-click.mp3', { headers: { Range: 'bytes=0-15' } });
  expect(media.status()).toBe(206); expect((await media.body()).length).toBe(16);
  expect(paths.filter(p => p !== '/' && !p.startsWith('/puzzle/'))).toEqual([]);
  expect(paths.filter(p => p.includes('/src/'))).toEqual([]);
});
