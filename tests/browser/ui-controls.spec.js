import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

async function open(page) {
  await page.addInitScript(lastIndex => {
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', String(lastIndex));
    localStorage.setItem('hasPlayedBefore', 'true');
  }, LEVEL_METADATA.length - 1);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await page.locator('#btn-continue').click();
}

test('settings own the arrow keys and nested help restores the same settings session', async ({ page }) => {
  await open(page);
  await evaluateApp(page, ({ ui, services }) => ui.navigate(services.levels.definitions.findIndex(level => level.key === 'TV'), { quick: true }));
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('TV');
  const channel = await evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    scene._autoTimer.remove(false);
    return scene._channel;
  });

  await page.locator('#vol-slider-ui').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#vol-slider-ui')).toHaveValue('0.99');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe(channel);

  await page.locator('#btn-options').click();
  await page.locator('#music-slider').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#music-slider')).toHaveValue('0.51');
  await expect(page.locator('#music-slider')).toHaveAttribute('aria-valuetext', '51%');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe(channel);

  await page.locator('#btn-howto').click();
  expect(await evaluateApp(page, ({ game }) => game.input.keyboard.enabled)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-howto')).toBeFocused();
  await expect(page.locator('#music-slider')).toHaveValue('0.51');
  expect(await evaluateApp(page, ({ game }) => game.input.keyboard.enabled)).toBe(false);
  await page.locator('#btn-close-options').click();
  expect(await evaluateApp(page, ({ game }) => game.input.keyboard.enabled)).toBe(true);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe((channel + 1) % 4);
});

test('leaving reset confirmation cancels it without deleting progress', async ({ page }) => {
  await open(page);
  const completedBefore = await evaluateApp(page, ({ services }) => services.levels.completedCount);
  await page.locator('#btn-options').click();
  await page.locator('#btn-new').click();
  await expect(page.locator('#btn-new')).toHaveClass(/armed/);
  await page.locator('#btn-howto').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-new')).not.toHaveClass(/armed/);
  await page.locator('#btn-new').click();
  await expect(page.locator('#btn-new')).toHaveClass(/armed/);
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(completedBefore);
  await page.keyboard.press('Tab');
  await expect(page.locator('#btn-new')).not.toHaveClass(/armed/);
  await page.keyboard.press('Escape');
});

test('answer feedback is readable and clears as soon as the player edits or changes rooms', async ({ page }) => {
  await open(page);
  await page.locator('#btn-submit').click();
  await expect(page.locator('#answer-feedback')).toContainText('Enter the answer');
  await expect(page.locator('#level-code')).toBeFocused();
  await page.locator('#level-code').fill('WRONG');
  await page.locator('#btn-submit').click();
  await expect(page.locator('#answer-feedback')).toContainText('does not unlock');
  await expect(page.locator('#level-code')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#level-code').fill('C');
  await expect(page.locator('#answer-feedback')).toHaveText('Follow the clues in the room. Press Enter to submit.');
  await expect(page.locator('#level-code')).toHaveAttribute('aria-invalid', 'false');
  await page.locator('#btn-submit').click();
  await evaluateApp(page, ({ ui }) => ui.navigate(1, { quick: true }));
  await expect(page.locator('#answer-feedback')).toHaveText('Follow the clues in the room. Press Enter to submit.');
  await expect(page.locator('#level-code')).toHaveAttribute('aria-invalid', 'false');
});
