import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

async function open(page, { unlocked = false, start = true } = {}) {
  await page.addInitScript(unlocked => {
    if (!localStorage.getItem('puzzleComfort')) localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
    if (unlocked && !localStorage.getItem('puzzleProgress')) {
      localStorage.setItem('puzzleProgressSchema', '2');
      localStorage.setItem('puzzleUnlockedLevel', '17');
    }
    localStorage.setItem('hasPlayedBefore', 'true');
  }, unlocked);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  if (start) await page.locator('#btn-continue').click();
}
async function navigate(page, key) {
  await evaluateApp(page, ({ ui, services }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}
async function screenshot(page, name) {
  mkdirSync('.artifacts/after', { recursive: true });
  await page.screenshot({ path: `.artifacts/after/UX-${name}.png` });
}

test('hints reveal individually, remember each room, and reset with the game', async ({ page }) => {
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await expect(page.locator('#hint-list')).not.toContainText('three breaths');
  await page.locator('#btn-next-hint').click();
  await expect(page.locator('#hint-list li')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(2);
  await page.locator('#btn-next-hint').click();
  await expect(page.locator('#btn-next-hint')).toBeDisabled();
  await expect(page.locator('#hint-list li')).toHaveCount(3);
  await screenshot(page, 'hints');
  await page.keyboard.press('Escape');
  await navigate(page, 'Wires'); await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await page.locator('#btn-continue').click(); await navigate(page, 'Cryptex');
  await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(3);
  await page.keyboard.press('Escape'); await page.locator('#btn-options').click();
  await page.locator('#btn-new').click(); await page.locator('#btn-new').click();
  await expect(page.locator('#progress-count')).toHaveText('0 / 27 solved');
  expect(await evaluateApp(page, ({ services }) => services.hints.count('cryptex'))).toBe(0);
  expect(await evaluateApp(page, ({ services }) => services.preferences.reducedMotion)).toBe(true);
});

test('progress, solved rooms, thumbnails and Continue survive reload', async ({ page }) => {
  await open(page);
  await expect(page.locator('.level-btn').nth(1)).toBeDisabled();
  await page.locator('#level-code').fill('CABBAGE'); await page.locator('#btn-submit').click();
  await expect(page.locator('#progress-count')).toHaveText('1 / 27 solved');
  await expect(page.locator('.level-btn.solved')).toHaveCount(1);
  await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.level-btn').nth(1).locator('img')).toBeVisible({ timeout: 12000 });
  await expect(page.locator('#save-status')).toHaveText('Saved on this device');
  await screenshot(page, 'progress');
  await page.reload();
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('#btn-continue')).toHaveText('Continue · Level 2');
  await expect(page.locator('#start-progress')).toContainText('1 of 27 rooms solved');
  await screenshot(page, 'continue');
  await page.locator('#btn-continue').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('PlantPot');
  await expect(page.locator('.level-btn').nth(1).locator('img')).toBeVisible();
});

test('inspection magnifies Phaser and DOM together and does not operate the puzzle', async ({ page }) => {
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  const candle = page.locator('.candle-action');
  await candle.hover();
  await expect(page.locator('#interaction-cue')).toHaveText('Put out the candle');
  const initial = await candle.boundingBox();
  await page.locator('#btn-inspect').click();
  await expect(page.locator('#inspection-tools')).toBeVisible();
  expect((await candle.boundingBox()).width).toBeCloseTo(initial.width * 2, 1);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(false);
  await page.locator('#inspection-glass').click({ position: { x: 300, y: 200 } });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  await expect(page.locator('#inspection-zoom')).toHaveText('2.5×');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle.clicks)).toBe(0);
  await screenshot(page, 'inspect');
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-inspect')).toBeFocused();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(true);
  await candle.click();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle.clicks)).toBe(1);
  await page.locator('#btn-inspect').click();
  await page.locator('#btn-options').click();
  await expect(page.locator('#inspection-tools')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#btn-inspect').click(); await navigate(page, 'TV');
  await expect(page.locator('#inspection-tools')).toBeHidden();
  // the set tunes itself every four seconds; the readings below must not straddle a tick
  await evaluateApp(page, ({ services }) => services.levels.activeScene._autoTimer.remove(false));
  const channel = await evaluateApp(page, ({ services }) => services.levels.activeScene._channel);
  await page.locator('#btn-inspect').click(); await page.keyboard.press('ArrowRight');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe(channel);
  await page.keyboard.press('Escape');
  await page.locator('.da-btn[data-dir="1"]').focus(); await page.keyboard.press('Enter');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe((channel + 1) % 4);
});

test('comfort controls apply immediately, persist, and follow device preferences', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  await page.locator('#btn-options').click();
  await page.locator('#grain-slider').fill('0');
  await page.locator('#reading-size').selectOption('1.3');
  await page.locator('#reading-size').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('#motion-setting')).toBeFocused();
  await page.locator('#ambient-effects').uncheck();
  await expect(page.locator('#film-grain')).toHaveCSS('opacity', '0');
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('#btn-close-options')).toBeInViewport();
  await screenshot(page, 'comfort');
  await page.locator('#btn-close-options').click();
  await page.waitForTimeout(500); // the responsive scene rebuild uses a 350 ms debounce
  await page.locator('#btn-info').click();
  await page.locator('#btn-next-hint').click(); await page.locator('#btn-next-hint').click();
  await expect(page.locator('#btn-close-info')).toBeInViewport();
  const panel = await page.locator('#info-modal .modal-content').boundingBox();
  expect(panel.y).toBeGreaterThanOrEqual(30);
  expect(panel.y + panel.height).toBeLessThanOrEqual(738);
  await screenshot(page, 'hints-large');
  await page.keyboard.press('Escape');
  const frame = await evaluateApp(page, ({ services }) => services.levels.activeScene.candle._frame);
  await page.waitForTimeout(300);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle._frame)).toBe(frame);
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await page.locator('#btn-continue').click(); await page.locator('#btn-options').click();
  await expect(page.locator('#grain-slider')).toHaveValue('0');
  await expect(page.locator('#reading-size')).toHaveValue('1.3');
  await expect(page.locator('#ambient-effects')).not.toBeChecked();
  await page.locator('#motion-setting').selectOption('system');
  await page.locator('#ambient-effects').check();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  expect(errors).toEqual([]);
});

test('reduced effects retain Morse, router signals and race progression', async ({ page }) => {
  await open(page, { unlocked: true }); await navigate(page, 'Lightswitch');
  await evaluateApp(page, ({ services }) => { services.levels.activeScene.time.timeScale = 10; });
  await page.locator('#blk-switch').focus(); await page.keyboard.press('Enter');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._letterIdx)).toBe(1);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._busy)).toBe(false);
  await navigate(page, 'Modem');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._timerEvents.length)).toBeGreaterThan(0);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._leds.slice(5, 7).some(led => led.core.alpha > 0))).toBe(true);
  await navigate(page, 'Rally');
  await evaluateApp(page, ({ services }) => {
    services.levels.activeScene.time.timeScale = 20;
    services.levels.activeScene.tweens.timeScale = 20;
  });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._finished), { timeout: 25000 }).toBe(true);
});

test('unavailable storage reports session-only progress while still allowing play', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
  await page.goto('/'); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => { services.preferences.set({ motion: 'reduced' }); ui.showGame(); ui.navigate(0); });
  await expect(page.locator('#save-status')).toHaveText('Progress kept for this session only');
  await page.locator('#level-code').fill('CABBAGE'); await page.locator('#btn-submit').click();
  await expect(page.locator('#progress-count')).toHaveText('1 / 27 solved');
});
