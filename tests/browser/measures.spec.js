import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

async function open(page) {
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => {
    ui.showGame();
    services.levels.enterPlace('Room8');
    services.levels.navigate(services.levels.indexOf('measures'));
  });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._built)).toBe(true);
  mkdirSync('.artifacts/measures-review', { recursive: true });
}

const state = page => evaluateApp(page, ({ services }) => {
  const s = services.levels.activeScene;
  return { bottles: s._ml, flask: s._flaskMl, atLine: s._atLine, burn: s._turned, busy: s._busy, flame: s._burnFlame?.visible };
});

async function click(page, name) {
  const p = await evaluateApp(page, ({ services }, name) => {
    const s = services.levels.activeScene, z = s.children.getByName(name);
    return { x: z.x, y: z.y, W: s.scale.width, H: s.scale.height };
  }, `measures-${name}`);
  const box = await page.locator('#game-container canvas').boundingBox();
  await page.mouse.click(box.x + p.x / p.W * box.width, box.y + p.y / p.H * box.height);
}

async function action(page, bottle, target) {
  await click(page, `vessel-${bottle}`);
  await click(page, target);
  await expect.poll(async () => (await state(page)).busy).toBe(false);
}

async function measure400(page) {
  await action(page, 0, 'tap');
  await action(page, 0, 'vessel-1');
  await action(page, 1, 'sink');
  await action(page, 0, 'vessel-1');
  await action(page, 0, 'tap');
  await action(page, 0, 'vessel-1');
  expect((await state(page)).bottles).toEqual([400, 300]);
}

test('real pours reject a wrong amount, then 400 ml burns the strip and leaves a persistent answer', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/measures-review/initial.png' });
  await action(page, 1, 'tap');
  await action(page, 1, 'vessel-2');
  await expect.poll(async () => (await state(page)).flask).toBe(0);
  expect((await state(page)).atLine).toBe(false);
  expect((await state(page)).burn).toBe(0);
  await measure400(page);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/measures-review/measured.png' });
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system' }));
  await action(page, 0, 'vessel-2');
  await expect.poll(async () => (await state(page)).burn).toBeGreaterThan(.45);
  expect((await state(page)).flame).toBe(true);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/measures-review/burning.png' });
  const before = (await state(page)).burn;
  await page.setViewportSize({ width: 1280, height: 820 });
  await expect.poll(async () => (await state(page)).burn).toBeGreaterThan(before);
  expect((await state(page)).flask).toBe(400);
  await expect.poll(async () => (await state(page)).burn).toBe(1);
  await expect.poll(async () => (await state(page)).flame).toBe(false);
  await page.locator('#game-viewport').screenshot({ path: '.artifacts/measures-review/revealed.png' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  expect((await state(page)).burn).toBe(1);
  await page.locator('#level-code').fill('ACID');
  await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room8');
  expect(errors).toEqual([]);
});

test('resizing an active fill preserves exact measures and reduced motion reveals the answer without fire', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system' }));
  await click(page, 'vessel-0');
  await click(page, 'tap');
  await expect.poll(async () => (await state(page)).bottles[0]).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1100, height: 760 });
  await expect.poll(async () => (await state(page)).busy).toBe(false);
  expect((await state(page)).bottles).toEqual([500, 0]);
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced' }));
  await action(page, 0, 'vessel-1');
  await action(page, 1, 'sink');
  await action(page, 0, 'vessel-1');
  await action(page, 0, 'tap');
  await action(page, 0, 'vessel-1');
  await action(page, 0, 'vessel-2');
  expect(await state(page)).toMatchObject({ flask: 400, atLine: true, burn: 1, flame: false });
  await page.locator('#btn-replay').click();
  await expect.poll(async () => (await state(page)).burn).toBe(0);
  expect((await state(page)).bottles).toEqual([0, 0]);
  expect((await state(page)).flask).toBe(0);
  expect(errors).toEqual([]);
});
