import { test, expect, boot, stand, sceneIs, clickThing, answer, enterDoor, evaluateApp } from './helpers.js';

test('map and case book open by keyboard, turn pages, resize and return focus without leaking input', async ({ page }) => {
  await boot(page, { keys: ['Room2', 'Room3'], completed: ['binarytree', 'plantpot', 'cryptex'], visited: ['Hall', 'Study', 'Room2'] });
  await stand(page, 'Room2');
  await page.locator('#btn-map').focus(); await page.keyboard.press('m');
  await expect(page.locator('#map-modal')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#btn-map')).toBeFocused();
  await page.keyboard.press('c'); await expect(page.locator('#casefile-modal')).toBeVisible();
  const folio = page.locator('.casebook-folio');
  const first = await folio.textContent();
  await page.keyboard.press('ArrowRight'); await expect(folio).not.toHaveText(first);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('.casebook-canvas')).toBeVisible();
  await expect.poll(async () => {
    const box = await page.locator('.casebook-book').boundingBox();
    return box.y >= 0 && box.y + box.height <= 720;
  }).toBe(true);
  const box = await page.locator('.casebook-book').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  await page.keyboard.press('Escape'); await expect(page.locator('#btn-casefile')).toBeFocused();
  expect(await evaluateApp(page, ({ game }) => game.input.keyboard.enabled)).toBe(true);
});

test('a hall letter is opened, filed once and remains filed after reload', async ({ page }) => {
  test.setTimeout(90000); await boot(page); await stand(page, 'Hall');
  await page.locator('.waiting-letter').first().click();
  await expect(page.locator('.arrival')).toHaveAttribute('data-state', 'reading', { timeout: 15000 });
  await page.setViewportSize({ width: 1280, height: 720 });
  const box = await page.locator('.letter-sheet').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1281);
  expect(box.y + box.height).toBeLessThanOrEqual(721);
  await page.locator('.arrival-file').click();
  await expect(page.locator('.arrival')).toHaveCount(0, { timeout: 15000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('caseFile:read')).filter(id => id === 'ivy').length)).toBe(1);
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await stand(page, 'Hall'); await expect(page.locator('.waiting-letter')).toHaveCount(0);
});

for (const language of ['en', 'ro', 'ru']) {
  test(`all three rooms expose translated hints and persist settings in ${language}`, async ({ page }) => {
    test.setTimeout(100000); await boot(page, { language, keys: ['Room2', 'Room3'] });
    for (const [home, id] of [['Study', 'cryptex'], ['Room2', 'overtime'], ['Room3', 'mobilephone']]) {
      await stand(page, home); await clickThing(page, id);
      await page.locator('#btn-hint').click(); await expect(page.locator('#hint-list li')).toHaveCount(1);
      await expect(page.locator('#hint-list')).not.toContainText('undefined');
      await expect(page.locator('#hint-list p')).not.toBeEmpty();
      await page.keyboard.press('Escape');
    }
    expect(await evaluateApp(page, ({ services }) => services.i18n.language)).toBe(language);
    await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
    expect(await evaluateApp(page, ({ services }) => services.i18n.language)).toBe(language);
  });
}

test('typing M, C and Z into an answer does not activate map, case book or magnifier', async ({ page }) => {
  await boot(page); await stand(page); await clickThing(page, 'binarytree');
  await page.locator('#level-code').pressSequentially('mcz');
  await expect(page.locator('#level-code')).toHaveValue('mcz');
  await expect(page.locator('#map-modal')).toBeHidden(); await expect(page.locator('#casefile-modal')).toBeHidden();
  await page.locator('#level-code').fill(''); await page.locator('#btn-submit').click();
  await expect(page.locator('#answer-feedback')).not.toBeEmpty();
  await expect(page.locator('#level-code')).toBeFocused();
  await page.locator('#level-code').fill('C'); await expect(page.locator('#answer-feedback')).toHaveText('');
});

test('a corrupted save falls back to a playable first room', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('puzzleProgress', '{broken');
    localStorage.setItem('puzzleHints', '{broken');
  });
  await boot(page, { fresh: true }); await stand(page); await clickThing(page, 'binarytree');
  await answer(page, 'CABBAGE', 'Study');
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(1);
});

test('denied persistent storage still permits solving, hints and in-session progress', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Denied', 'SecurityError'); } });
  });
  await page.goto('/'); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced' }));
  await stand(page); await clickThing(page, 'binarytree');
  await page.locator('#btn-hint').click(); await expect(page.locator('#hint-list li')).toHaveCount(1);
  await page.keyboard.press('Escape'); await answer(page, 'CABBAGE', 'Study');
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(1);
  expect(await evaluateApp(page, ({ services }) => services.progress.persisted)).toBe(false);
});

test('the demo remains playable without third-party internet services', async ({ page }) => {
  const origin = new URL(test.info().project.use.baseURL).origin;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.protocol.startsWith('http') && url.origin !== origin ? route.abort() : route.continue();
  });
  await boot(page, { keys: ['Room2', 'Room3'] });
  for (const [home, id] of [['Study', 'binarytree'], ['Room2', 'modem'], ['Room3', 'mobilephone']]) {
    await stand(page, home); await clickThing(page, id);
    await expect(page.locator('#game-container > canvas')).toBeVisible();
  }
});

test('key insertion by the real hall door consumes its key and survives reload', async ({ page }) => {
  await boot(page, { keys: ['Room2'] }); await stand(page, 'Hall'); await enterDoor(page, 'Room2');
  expect(await evaluateApp(page, ({ services }) => services.progress.state.usedKeys)).toEqual(['Room2']);
  expect(await evaluateApp(page, ({ services }) => services.levels.keys.some(k => k.key === 'Room2'))).toBe(false);
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await stand(page, 'Hall'); expect(await evaluateApp(page, ({ services }) => services.levels.rooms.find(r => r.key === 'Room2').open)).toBe(true);
});
