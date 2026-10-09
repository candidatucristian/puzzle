import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

async function openGame(page) {
  await page.addInitScript(() => {
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  // Begin without requesting browser fullscreen, keeping the chosen viewport.
  await page.keyboard.press('Enter');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('BinaryTree');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await page.evaluate(() => document.fonts.ready);
}

async function answerRow(page) {
  const boxes = await Promise.all(['#level-code', '#btn-submit', '#btn-replay'].map(selector =>
    page.locator(selector).boundingBox()));
  for (const box of boxes) expect(box).not.toBeNull();
  const [answer, submit, restart] = boxes;
  expect(answer.width).toBeGreaterThan(60);
  expect(answer.x + answer.width).toBeLessThanOrEqual(submit.x + 1);
  expect(restart.x).toBeCloseTo(submit.x + submit.width + 8, 0);
  expect(answer.y).toBeCloseTo(submit.y, 0);
  expect(restart.y).toBeCloseTo(submit.y, 0);
  expect(restart.height).toBeCloseTo(submit.height, 0);
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
  }
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1280, height: 720 },
  { width: 960, height: 700 },
  { width: 740, height: 360 },
]) {
  const phone = viewport.height <= 360;
  test.describe(`quiet shell at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: phone, isMobile: phone });

    test('the room blends into its compact frame and controls fit the screen', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await openGame(page);
      await expect.poll(async () => {
        const room = await page.locator('#game-viewport').boundingBox();
        const canvas = await page.locator('#game-container > canvas').boundingBox();
        return Math.abs(room.width - canvas.width) + Math.abs(room.height - canvas.height);
      }).toBeLessThan(3);
      mkdirSync('.artifacts/after', { recursive: true });
      await page.screenshot({ path: `.artifacts/after/night-${viewport.width}x${viewport.height}.png` });

      const frame = await page.locator('#game-viewport').evaluate(element => {
        const style = getComputedStyle(element);
        return ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth']
          .map(property => Number.parseFloat(style[property]));
      });
      expect(frame).toEqual([0, 0, 0, 0]);
      const header = await page.locator('#compact-bar').boundingBox();
      const sidebar = await page.locator('#sidebar').boundingBox();
      const room = await page.locator('#game-viewport').boundingBox();
      expect(header.height).toBeLessThanOrEqual(60);
      expect(sidebar.width).toBeLessThanOrEqual(230);
      expect(room.x + room.width).toBeLessThanOrEqual(sidebar.x + 1);
      if (phone) expect(room.height).toBeGreaterThan(viewport.height * 0.6);

      for (const selector of ['#compact-bar', '#sidebar', '#game-viewport', '#input-area']) {
        const box = await page.locator(selector).boundingBox();
        expect(box.x, selector).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, selector).toBeLessThanOrEqual(viewport.width + 1);
      }
      expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)))
        .toBeLessThanOrEqual(viewport.width + 1);
      await answerRow(page);
      await expect(page.locator('#sidebar')).toBeInViewport();
      expect(errors).toEqual([]);
    });
  });
}

test('the answer row supports keyboard feedback, solving and restarting without losing progress', async ({ page }) => {
  await openGame(page);
  await answerRow(page);
  const answer = page.locator('#level-code');
  const feedback = page.locator('#answer-feedback');
  await answer.focus();
  await page.keyboard.press('Enter');
  await expect(feedback).toHaveAttribute('data-state', 'info');
  await expect(feedback).toBeVisible();
  await expect(answer).toBeFocused();
  await answer.fill('wrong');
  await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('aria-invalid', 'true');
  await expect(feedback).toBeVisible();
  await answer.fill(LEVEL_METADATA[0].code.toLowerCase());
  await expect(feedback).toHaveText('');
  await page.keyboard.press('Enter');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.currentIndex)).toBe(1);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-current', 'step');
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(1);

  await evaluateApp(page, ({ services }) => {
    window.shellRestartCount = 0;
    services.levels.activeScene.events.once('shutdown', () => { window.shellRestartCount++; });
  });
  await page.locator('#btn-replay').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.shellRestartCount)).toBe(1);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(LEVEL_METADATA[1].key);
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(1);
});

test('first-time play opens directly and keeps the quiet frame through the next room', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  expect(await page.evaluate(() => localStorage.getItem('hasPlayedBefore'))).toBeNull();
  expect(await evaluateApp(page, ({ services }) => services.preferences.state.grain)).toBe(0);
  await page.locator('#btn-continue').click();
  await expect(page.locator('#intro-screen')).toBeHidden();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('BinaryTree');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await page.locator('#level-code').fill(LEVEL_METADATA[0].code);
  await page.keyboard.press('Enter');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('PlantPot');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-current', 'step');
  await page.evaluate(() => document.fonts.ready);
  mkdirSync('.artifacts/after', { recursive: true });
  await page.screenshot({ path: '.artifacts/after/night-garden.png' });
  expect(errors).toEqual([]);
});

test('room notes close with Escape and restore focus to their trigger', async ({ page }) => {
  await openGame(page);
  const trigger = page.locator('#compact-menu');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#right-sidebar-wrapper')).toHaveClass(/drawer-open/);
  await expect(page.locator('#right-sidebar-wrapper [data-close-drawer]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#right-sidebar-wrapper')).not.toHaveClass(/drawer-open/);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('the direct Hint button reveals a hint and receives focus when the dialog closes', async ({ page }) => {
  await openGame(page);
  const trigger = page.locator('#btn-hint');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#info-modal')).toBeVisible();
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await expect(page.locator('#right-sidebar-wrapper')).not.toHaveClass(/drawer-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#info-modal')).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await page.locator('#btn-close-info').click();
  await expect(trigger).toBeFocused();
});
