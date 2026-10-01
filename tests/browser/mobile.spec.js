import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

// Runs under the "phone" project only: an emulated Pixel 7 held sideways,
// with touch, a coarse pointer and an 863×360 viewport.

async function open(page, { unlocked = true } = {}) {
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
}
async function navigate(page, key) {
  await evaluateApp(page, ({ ui, services }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}
async function sceneState(page, expression) {
  return evaluateApp(page, ({ services }, expression) => new Function('scene', 'services', `return (${expression})`)(services.levels.activeScene, services), expression);
}
async function screenshot(page, name) {
  mkdirSync('.artifacts/after', { recursive: true });
  await page.screenshot({ path: `.artifacts/after/phone-${name}.png` });
}

test('a phone is not blocked: the compact bar, a tap to begin, and the room filling the screen', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page, { unlocked: false });
  await expect(page.locator('#rotate-prompt')).toBeHidden();
  await expect(page.locator('#compact-bar')).toBeVisible();
  await expect(page.locator('#start-prompt')).toHaveText('Tap to begin');
  await expect(page.locator('html')).toHaveAttribute('data-compact', 'true');
  await page.locator('#btn-continue').tap();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('BinaryTree');
  const canvas = await page.locator('#game-container > canvas').boundingBox();
  const viewport = page.viewportSize();
  expect(canvas.width).toBeGreaterThan(viewport.width * 0.95);
  expect(canvas.height).toBeGreaterThan(viewport.height * 0.6);
  // the console sits on one row at the bottom, inside the screen
  const submit = await page.locator('#btn-submit').boundingBox();
  const hint = await page.locator('#btn-info').boundingBox();
  const volume = await page.locator('#vol-icon-ui').boundingBox();
  expect(Math.abs(submit.y - hint.y)).toBeLessThan(12);
  expect(Math.abs(submit.y - volume.y)).toBeLessThan(16);
  expect(hint.x + hint.width).toBeLessThanOrEqual(viewport.width);
  await screenshot(page, 'room');
  expect(errors).toEqual([]);
});

test('the menu and the levels panel slide in as drawers and close again', async ({ page }) => {
  await open(page);
  await page.locator('#btn-continue').tap();
  await expect(page.locator('#sidebar')).not.toBeInViewport();
  await page.locator('#compact-menu').tap();
  await expect(page.locator('#sidebar')).toBeInViewport();
  await expect(page.locator('#btn-howto')).toBeVisible();
  await screenshot(page, 'menu');
  await page.locator('#drawer-scrim').tap({ position: { x: page.viewportSize().width - 30, y: 200 } });
  await expect(page.locator('#sidebar')).not.toBeInViewport();
  await page.locator('#compact-levels').tap();
  await expect(page.locator('#right-sidebar')).toBeInViewport();
  await screenshot(page, 'levels');
  // choosing a room closes the drawer and opens the room
  await page.locator('.level-btn').nth(9).tap();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Telescope');
  await expect(page.locator('#right-sidebar')).not.toBeInViewport();
  // a dialog from the drawer: open, readable, closable
  await page.locator('#compact-menu').tap(); await page.locator('#btn-howto').tap();
  await expect(page.locator('#howto-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('.howto-touch')).toBeVisible();
  await expect(page.locator('#btn-close-howto')).toBeInViewport();
  await page.locator('#btn-close-howto').tap();
  await expect(page.locator('#howto-modal')).toHaveClass(/hidden/);
  await expect(page.locator('#sidebar')).not.toBeInViewport();
});

test('taps operate the rooms: the code box, the telescope, a board row and the TV knob', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.locator('#btn-continue').tap();
  await navigate(page, 'BinaryTree');
  // the code box takes the on-screen keyboard's text and EXECUTE accepts it
  await page.locator('#level-code').tap(); await page.keyboard.type('cabbage');
  await page.locator('#btn-submit').tap();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('PlantPot');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await navigate(page, 'Telescope');
  // a tap on the telescope goes to the glass
  const box = await page.locator('#game-container > canvas').boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.54, box.y + box.height * 0.43);
  await expect.poll(() => sceneState(page, 'scene.phase')).toBe(2);
  await screenshot(page, 'telescope');
  // a tap on a departures row reaches the row
  await navigate(page, 'Station');
  await evaluateApp(page, ({ services }) => { services.levels.activeScene._respinRow = row => { services.levels.activeScene._tappedRow = row; }; });
  const row = JSON.parse(await sceneState(page, 'JSON.stringify({x: scene._cells[2][0].txt.x, y: scene._cells[2][0].txt.y})'));
  await page.touchscreen.tap(box.x + row.x, box.y + row.y);
  await expect.poll(() => sceneState(page, 'scene._tappedRow')).toBe(2);
  // the TV's knob turns under a finger (the auto-tuning is stopped first)
  await navigate(page, 'TV');
  await evaluateApp(page, ({ services }) => services.levels.activeScene._autoTimer.remove(false));
  const channel = await sceneState(page, 'scene._channel');
  await page.locator('.da-btn[data-dir="1"]').tap();
  expect(await sceneState(page, 'scene._channel')).toBe((channel + 1) % 4);
  await screenshot(page, 'tv');
  expect(errors).toEqual([]);
});

test('a portrait phone is asked to turn, and the rooms survive the turn', async ({ page }) => {
  await open(page);
  await page.locator('#btn-continue').tap();
  await navigate(page, 'Wires');
  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#rotate-prompt')).toBeVisible();
  await screenshot(page, 'portrait');
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#rotate-prompt')).toBeHidden();
  await page.waitForTimeout(600); // the responsive scene rebuild uses a 350 ms debounce
  expect(await sceneState(page, 'scene._built')).toBe(true);
  expect(await sceneState(page, "scene.events.listenerCount('canvas_resized')")).toBe(1);
});
