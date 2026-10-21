import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

test.use({ hasTouch: true });

async function openPortrait(page, touch = false) {
  const p = await evaluateApp(page, ({ services }) => {
    const s = services.levels.activeScene, b = s._portraitZone.getBounds();
    return { x: b.centerX, y: b.centerY, W: s.scale.width, H: s.scale.height };
  });
  const canvas = await page.locator('#game-container canvas').boundingBox();
  const x = canvas.x + p.x / p.W * canvas.width, y = canvas.y + p.y / p.H * canvas.height;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(page.getByRole('dialog', { name: 'Ivy and Rose Ashcombe · 1959' })).toBeVisible();
}

test('the vertical family portrait can be inspected by mouse or touch, resized, closed and revisited without leaving the room', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    // Touch is supported in the store app; handheld browsers have their own
    // desktop-only gate. Exercise the app's supported input mode here.
    window.Capacitor = { isNativePlatform: () => true };
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => { ui.showGame(); services.levels.enterPlace('Room6'); });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Room6');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.cameras.main.fadeEffect.isRunning)).toBe(false);
  await expect(page.locator('#game-container canvas')).toHaveCSS('filter', 'none');
  mkdirSync('.artifacts/cot-review', { recursive: true });
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/cot-review/portrait-room.png' });
  const progress = await evaluateApp(page, ({ services }) => services.levels.completedCount);
  await openPortrait(page);
  const viewer = page.getByRole('dialog', { name: 'Ivy and Rose Ashcombe · 1959' });
  const image = viewer.getByRole('img');
  const size = await image.boundingBox();
  expect(size.height).toBeGreaterThan(size.width);
  await expect(viewer.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(false);
  await page.keyboard.press('m');
  await expect(page.locator('#map-modal')).toBeHidden();
  await page.screenshot({ path: '.artifacts/cot-review/portrait-open.png' });
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  expect(await evaluateApp(page, ({ services }) => services.levels.place.key)).toBe('Room6');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(true);

  await openPortrait(page);
  await viewer.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(viewer).toBeHidden();
  await openPortrait(page);
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(viewer).toBeVisible();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._L.W)).toBeLessThan(900);
  const compact = await image.boundingBox();
  expect(compact.y).toBeGreaterThanOrEqual(0);
  expect(compact.y + compact.height).toBeLessThanOrEqual(412);
  await page.screenshot({ path: '.artifacts/cot-review/portrait-compact.png' });
  await page.mouse.click(5, 405);
  await expect(viewer).toBeHidden();
  await openPortrait(page, true);
  await viewer.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(viewer).toBeHidden();
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(progress);

  await openPortrait(page, true);
  await evaluateApp(page, ({ services }) => services.levels.enterHall());
  await expect(page.locator('.nursery-portrait-viewer')).toHaveCount(0);
  await expect(page.locator('#game-container canvas')).not.toHaveCSS('filter', 'none');
  await evaluateApp(page, ({ services }) => services.levels.enterPlace('Room6'));
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Room6');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.cameras.main.fadeEffect.isRunning)).toBe(false);
  await openPortrait(page, true);
  expect(errors).toEqual([]);
});
