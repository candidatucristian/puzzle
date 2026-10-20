import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

const state = page => evaluateApp(page, ({ services }) => {
  const s = services.levels.activeScene;
  return {
    photographic: s._L?.photographic,
    held: [...s._up],
    tubes: s._tubes.map(t => ({ id: t.id, k: t.k, y: t.img.y, home: t.home.y, top: t.img.getBounds().top })),
  };
});

async function clickTube(page, id) {
  const p = await evaluateApp(page, ({ services }, id) => {
    const s = services.levels.activeScene, img = s.children.getByName(`phials-tube-${id}`);
    const b = img.getBounds();
    return { x: b.centerX, y: b.top + b.height * .27, W: s.scale.width, H: s.scale.height };
  }, id);
  const b = await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(b.x + p.x / p.W * b.width, b.y + p.y / p.H * b.height);
}

async function resize(page, width, height) {
  await page.setViewportSize({ width, height });
  await expect.poll(async () => {
    const box = await page.locator('#game-viewport').boundingBox();
    const size = await evaluateApp(page, ({ services }) => {
      const s = services.levels.activeScene;
      return { width: s._L.W, height: s._L.H };
    });
    return Math.max(Math.abs(box.width - size.width), Math.abs(box.height - size.height));
  }).toBeLessThan(3);
}

test('photographic phials lift independently, stay usable after resizing, and retain the original solution', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'system' }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => {
    ui.showGame();
    services.levels.enterPlace('Room7');
  });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Room7');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._L?.photographic)).toBe(true);
  mkdirSync('.artifacts/phials-review', { recursive: true });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.cameras.main.fadeEffect.isRunning)).toBe(false);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/phials-review/room7.png' });
  const rack = await evaluateApp(page, ({ services }) => {
    const s = services.levels.activeScene, b = s._L.things.find(t => t.level === 'phials').box;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, W: s.scale.width, H: s.scale.height };
  });
  const room = await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(room.x + rack.x / rack.W * room.width, room.y + rack.y / rack.H * room.height);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Phials');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._built)).toBe(true);
  expect((await state(page)).photographic).toBe(true);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/phials-review/initial.png' });
  await clickTube(page, 'yellow');
  await expect.poll(async () => (await state(page)).tubes[0].k).toBe(1);
  expect((await state(page)).held).toEqual([0]);
  await clickTube(page, 'blue');
  await expect.poll(async () => (await state(page)).tubes[2].k).toBe(1);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/phials-review/held.png' });
  for (const t of (await state(page)).tubes) expect(t.top).toBeGreaterThanOrEqual(0);
  await clickTube(page, 'yellow');
  await resize(page, 1100, 760);
  await expect.poll(async () => (await state(page)).held).toEqual([2]);
  await expect.poll(async () => (await state(page)).tubes[0].k).toBe(0);
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced' }));
  await clickTube(page, 'empty');
  await expect.poll(async () => (await state(page)).tubes[1].k).toBe(1);
  await resize(page, 915, 412);
  for (const t of (await state(page)).tubes) expect(t.top).toBeGreaterThanOrEqual(0);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/phials-review/compact.png' });
  await clickTube(page, 'blue');
  await clickTube(page, 'empty');
  await expect.poll(async () => (await state(page)).held).toEqual([]);
  await resize(page, 1440, 1000);
  await page.locator('#btn-replay').click();
  await expect.poll(async () => (await state(page)).held).toEqual([]);
  await page.locator('#level-code').fill('GREEN');
  await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room7');
  expect(errors).toEqual([]);
});
