import { test, expect, boot, stand, sceneIs, evaluateApp } from './helpers.js';

test('fresh menu: Continue is disabled, arrow navigation skips it, and options restore focus', async ({ page }) => {
  await boot(page, { fresh: true });
  const start = page.locator('#start-menu');
  await expect(page.locator('#intro-video')).toHaveCount(0);
  await expect(start.locator('[data-menu="continue"]')).toBeDisabled();
  await start.locator('[data-menu="new"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(start.locator('[data-menu="options"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#options-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(start.locator('[data-menu="options"]')).toBeFocused();
});

test('the language popup consumes Escape before closing settings', async ({ page }) => {
  await boot(page);
  await page.locator('#start-menu [data-menu="options"]').click();
  await page.locator('#st-tab-options').click();
  await page.locator('#language-select').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#st-lang-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#st-lang-menu')).toBeHidden();
  await expect(page.locator('#options-modal')).toBeVisible();
  await expect(page.locator('#language-select')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#options-modal')).toBeHidden();
});

test('exit keeps keyboard focus inside its overlay and Escape returns to the menu', async ({ page }) => {
  await page.addInitScript(() => { window.close = () => {}; });
  await boot(page);
  await page.locator('#start-menu [data-menu="exit"]').click();
  await expect(page.locator('#start-exit')).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement.closest('#start-exit')))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#start-exit')).toHaveCount(0);
  await expect(page.locator('#start-menu [data-menu="exit"]')).toBeFocused();
  expect(await evaluateApp(page, ({ game, services }) => game.sound.volume === services.audio.state.masterVol)).toBe(true);
});

test('settings: native sliders and nested help retain values and restore puzzle input', async ({ page }) => {
  await boot(page); await stand(page);
  for (let round = 0; round < 3; round++) {
    await page.locator('#btn-options').click();
    expect(await evaluateApp(page, ({ game, services }) => !game.input.keyboard.enabled && !services.levels.activeScene.input.enabled)).toBe(true);
    await page.locator('#st-tab-sounds').click();
    await page.locator('#music-slider').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#music-slider')).toHaveValue(String(.51 + round * .01));
    await page.locator('#st-tab-options').click();
    await page.locator('#btn-howto').click();
    await expect(page.locator('#howto-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#options-modal')).toBeVisible();
    await expect(page.locator('#btn-howto')).toBeFocused();
    await page.keyboard.press('Escape');
    expect(await evaluateApp(page, ({ game, services }) => game.input.keyboard.enabled && services.levels.activeScene.input.enabled)).toBe(true);
  }
});

test('settings reset cancels an in-flight walk before showing the fresh menu', async ({ page }) => {
  await boot(page, { motion: 'system' }); await stand(page, 'Hall');
  await evaluateApp(page, ({ game }) => game.events.emit('house:go', { place: 'Study' }));
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(true);
  await page.locator('#btn-options').click();
  await page.locator('#st-tab-options').click();
  await page.locator('#btn-new').click(); await page.locator('#btn-new').click();
  await expect(page.locator('#start-screen')).toBeVisible();
  await page.waitForTimeout(2400);
  expect(await evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(0);
  expect(await evaluateApp(page, ({ services }) => services.progress.state.visitedPlaces)).toEqual([]);
  expect(await evaluateApp(page, ({ services }) => services.progress.state.unlockedLevelIds)).toEqual(['binarytree']);
  await expect(page.locator('#start-menu [data-menu="continue"]')).toBeDisabled();
});

test('Continue enters the hall and Escape returns to the title without resetting progress', async ({ page }) => {
  await boot(page, { completed: ['binarytree'], visited: ['Hall', 'Study'] });
  await page.locator('#start-menu [data-menu="continue"]').click(); await sceneIs(page, 'Hall');
  await page.locator('#btn-leave').click();
  await expect(page.locator('#start-screen')).toBeVisible();
  await expect(page.locator('#start-menu [data-menu="continue"]')).toBeEnabled();
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(1);
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }]) {
  test(`menu and settings remain within ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await boot(page, { fresh: true });
    for (const selector of ['#start-menu', '#start-menu [data-menu="new"]', '#start-menu [data-menu="exit"]']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    await page.locator('#start-menu [data-menu="options"]').click();
    for (const tab of ['options', 'video', 'sounds']) {
      await page.locator(`#st-tab-${tab}`).click();
      await expect(page.locator(`#st-panel-${tab}`)).toBeVisible();
      const box = await page.locator(`#st-panel-${tab}`).boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    await page.screenshot({ path: test.info().outputPath(`settings-${viewport.width}.png`) });
  });
}
