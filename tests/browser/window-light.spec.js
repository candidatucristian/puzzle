import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { CURTAIN_ALIGNMENT, CURTAIN_START, CURTAIN_TRAVEL } from '../../src/levels/curtain/puzzle.js';
import { VENETIAN_ALIGNMENT, VENETIAN_START } from '../../src/levels/venetian/puzzle.js';

async function open(page, all = false) {
  await page.addInitScript(({ ids, all }) => {
    localStorage.setItem('hasPlayedBefore', 'true');
    if (!localStorage.getItem('puzzleProgress')) localStorage.setItem('puzzleProgress', JSON.stringify({
      version: 3, completedLevelIds: ids.slice(0, 30), unlockedLevelIds: all ? ids : ids.slice(0, 30), lastPlayedLevelId: 'genome',
    }));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced', ambientEffects: false }));
  }, { ids: LEVEL_METADATA.map(level => level.id), all });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
  mkdirSync('.artifacts/after', { recursive: true });
}

async function navigate(page, key) {
  await evaluateApp(page, ({ ui, services }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}

async function drag(page, key, value) {
  const point = await evaluateApp(page, ({ services }, { key, value, travel }) => {
    const scene = services.levels.activeScene, L = scene._L;
    if (key === 'Curtain') {
      const b = scene._dragZone.getBounds(), left = Math.max(0, b.x), right = Math.min(L.width, b.right);
      return { x: (left + right) / 2, y: L.window.y + L.window.h * 0.78,
        dx: (value - scene.position) * L.window.w * travel, dy: 0, W: L.width, H: L.height };
    }
    return { x: scene._pull.x, y: scene._pull.y, dx: 0, dy: (value - scene.tilt) * L.pullTravel, W: L.width, H: L.height };
  }, { key, value, travel: CURTAIN_TRAVEL });
  const box = await page.locator('#game-container > canvas').boundingBox();
  const x = box.x + point.x / point.W * box.width, y = box.y + point.y / point.H * box.height;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + point.dx / point.W * box.width, y + point.dy / point.H * box.height, { steps: 32 });
  await page.mouse.up();
}

test('the three moonlit rooms solve from a completed 30-level save, using real drags and the answer console', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page); await navigate(page, 'Curtain');
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(30);
  expect(await evaluateApp(page, ({ services }) => services.levels.canAccess(31))).toBe(false);
  await page.screenshot({ path: '.artifacts/after/Curtain-open.png' });
  await drag(page, 'Curtain', CURTAIN_ALIGNMENT);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.position)).toBeCloseTo(CURTAIN_ALIGNMENT, 2);
  await page.screenshot({ path: '.artifacts/after/Curtain-aligned.png' });
  await page.locator('#level-code').fill('moth'); await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('TheSill');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await page.screenshot({ path: '.artifacts/after/TheSill-light.png' });
  await page.locator('#level-code').fill('wake'); await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Venetian');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  const city = await evaluateApp(page, ({ services }) => services.levels.activeScene._city.texture.key);
  await page.screenshot({ path: '.artifacts/after/Venetian-noise.png' });
  await drag(page, 'Venetian', VENETIAN_ALIGNMENT);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.tilt)).toBeCloseTo(VENETIAN_ALIGNMENT, 2);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._city.texture.key)).toBe(city);
  await page.mouse.move(10, 10);
  await page.screenshot({ path: '.artifacts/after/Venetian-aligned.png' });
  await page.locator('#level-code').fill('city'); await page.locator('#btn-submit').click();
  await expect(page.locator('#completion-screen')).toBeVisible();
  await expect(page.locator('#completion-chambers')).toHaveText('33 / 33');
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(33);
  expect(errors).toEqual([]);
});

test('curtain and blind preserve adjustment on resize, isolate keyboard input and release masks on replay', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page, true);
  for (const [i, key] of ['Curtain', 'Venetian'].entries()) {
    await navigate(page, key);
    const read = () => evaluateApp(page, ({ services }) => services.levels.activeScene.position ?? services.levels.activeScene.tilt);
    await drag(page, key, 0.45);
    const position = await read(); expect(position).toBeCloseTo(0.45, 2);
    const oldWidth = await evaluateApp(page, ({ services }) => services.levels.activeScene._L.width);
    await page.setViewportSize(i ? { width: 1440, height: 1000 } : { width: 980, height: 720 });
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._L.width)).not.toBe(oldWidth);
    expect(await read()).toBe(position);
    const arrow = i ? 'ArrowDown' : 'ArrowRight';
    await page.locator('#level-code').focus(); await page.keyboard.press(arrow);
    expect(await read()).toBe(position);
    await page.locator('#level-code').evaluate(el => el.blur()); await page.keyboard.press(arrow);
    expect(await read()).toBeCloseTo(position + 0.002, 5);
    await page.locator('#btn-inspect').click();
    await expect(page.locator('#inspection-tools')).toBeVisible();
    await page.keyboard.press(arrow); expect(await read()).toBeCloseTo(position + 0.002, 5);
    // Let Phaser observe the magnified canvas before restoring normal pointer input.
    const magnified = await page.locator('#game-container > canvas').boundingBox();
    await expect.poll(() => evaluateApp(page, ({ game }) => game.scale.canvasBounds.width)).toBeCloseTo(magnified.width, 1);
    await page.keyboard.press('Escape');
    const restored = await page.locator('#game-container > canvas').boundingBox();
    expect(await evaluateApp(page, ({ game }) => game.scale.canvasBounds.width)).toBeCloseTo(restored.width, 1);
    await navigate(page, key);
    expect(await read()).toBe(i ? VENETIAN_START : CURTAIN_START);
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.events.listenerCount('canvas_resized'))).toBe(1);
  }
  await navigate(page, 'TheSill');
  expect(await evaluateApp(page, ({ game }) => game.textures.getTextureKeys().filter(key => key.startsWith('cur_') || key.startsWith('ven_')))).toEqual([]);
  expect(errors).toEqual([]);
});
