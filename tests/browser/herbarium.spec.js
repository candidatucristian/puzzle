import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

const state = page => evaluateApp(page, ({ services }) => {
  const s = services.levels.activeScene;
  return { key: s?.scene.key, built: s?._built, photographic: s?._L?.photographic, spread: s?._spread, turning: s?._turning };
});

async function clickScenePoint(page, p) {
  const box = await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(box.x + p.x / p.W * box.width, box.y + p.y / p.H * box.height);
}

async function turn(page, side, spread) {
  const p = await evaluateApp(page, ({ services }, side) => {
    const s = services.levels.activeScene, z = s._zones[side];
    return { x: z.x + z.width * .7, y: z.y + z.height * .5, W: s.scale.width, H: s.scale.height };
  }, side);
  await clickScenePoint(page, p);
  if (spread !== undefined) await expect.poll(async () => (await state(page)).spread).toBe(spread);
}

test('the herbarium opens from Room VI, keeps all five photographic pages readable and survives a resize during a page turn', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => { ui.showGame(); services.levels.enterPlace('Room6'); });
  await expect.poll(async () => (await state(page)).key).toBe('Room6');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.cameras.main.fadeEffect.isRunning)).toBe(false);
  mkdirSync('.artifacts/herbarium-review', { recursive: true });
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/herbarium-review/room6.png' });
  const book = await evaluateApp(page, ({ services }) => {
    const s = services.levels.activeScene, b = s._L.things.find(t => t.level === 'herbarium').box;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, W: s.scale.width, H: s.scale.height };
  });
  await clickScenePoint(page, book);
  await expect.poll(async () => (await state(page)).key).toBe('Herbarium');
  await expect.poll(async () => (await state(page)).built).toBe(true);
  expect((await state(page)).photographic).toBe(true);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/herbarium-review/pages-1-2.png' });
  await turn(page, 'right', 1);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/herbarium-review/pages-3-4.png' });
  await turn(page, 'right', 2);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._zones.right.input.enabled)).toBe(false);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/herbarium-review/page-5.png' });
  await turn(page, 'left', 1);
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system' }));
  await turn(page, 'left');
  await expect.poll(async () => (await state(page)).turning).toBe(true);
  await page.setViewportSize({ width: 1100, height: 760 });
  await expect.poll(async () => (await state(page)).spread).toBe(0);
  await expect.poll(async () => (await state(page)).turning).toBe(false);
  await turn(page, 'right', 1);
  await page.setViewportSize({ width: 915, height: 412 });
  await expect.poll(async () => {
    const box = await page.locator('#game-viewport').boundingBox();
    return evaluateApp(page, ({ services }, box) => Math.max(Math.abs(services.levels.activeScene._L.W - box.width), Math.abs(services.levels.activeScene._L.H - box.height)), box);
  }).toBeLessThan(3);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/herbarium-review/compact.png' });
  expect(await evaluateApp(page, ({ services }) => {
    const s = services.levels.activeScene, b = s._L.book;
    return b.x >= 0 && b.y >= 0 && b.x + b.w <= s.scale.width && b.y + b.h <= s.scale.height;
  })).toBe(true);
  await page.locator('#level-code').fill('HEDGE');
  await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room6');
  expect(errors).toEqual([]);
});

