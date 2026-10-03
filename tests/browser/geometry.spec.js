import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { RIPPLE_MEET_MS, RIPPLE_ROUND_MS } from '../../src/levels/ripples/puzzle.js';

async function openRipples(page) {
  await page.addInitScript(index => {
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', String(index));
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced', ambientEffects: false }));
  }, LEVEL_METADATA.findIndex(level => level.id === 'ripples'));
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => {
    ui.showGame();
    ui.navigate(services.levels.definitions.findIndex(level => level.id === 'ripples'), { quick: true });
  });
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}

test('Ripples exposes only the actual three-wave meetings, preserves phase on resize and replays', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await openRipples(page);
  const before = await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed);
  // Essential water still moves when decorative motion is disabled.
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBeGreaterThan(before + 100);
  mkdirSync('.artifacts/after', { recursive: true });
  for (const [round, letter] of [...'DROP'].entries()) {
    await evaluateApp(page, ({ services }, time) => {
      const scene = services.levels.activeScene;
      scene.sys.sceneUpdate = () => {}; // hold an exact physical instant for visual inspection
      scene._elapsed = time;
      scene._render();
    }, round * RIPPLE_ROUND_MS + RIPPLE_MEET_MS);
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._letters
      .filter(entry => entry.text.alpha > 0.5).map(entry => entry.stone.letter))).toEqual([letter]);
    if (round === 0) await page.screenshot({ path: '.artifacts/after/Ripples-convergence.png' });
  }
  const phase = await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed);
  const width = await evaluateApp(page, ({ services }) => services.levels.activeScene._L.width);
  await page.setViewportSize({ width: 980, height: 720 });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._L.width)).not.toBe(width);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBe(phase);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._letters
    .filter(entry => entry.text.alpha > 0.5).map(entry => entry.stone.letter))).toEqual(['P']);
  await evaluateApp(page, ({ ui, services }) => {
    ui.navigate(services.levels.currentIndex, { quick: true });
  });
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBeLessThan(RIPPLE_ROUND_MS);
  expect(errors).toEqual([]);
});

test('DROP unlocks Vertex, Inspect magnifies its connections, and FACE completes the game', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await openRipples(page);
  await page.locator('#level-code').fill('drop');
  await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Vertex');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  const before = await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBeGreaterThan(before + 100);
  await page.locator('#btn-inspect').click();
  await expect(page.locator('#inspection-tools')).toBeVisible();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(false);
  await page.locator('#inspection-glass').click({ position: { x: 200, y: 160 } });
  await page.keyboard.press('Escape');
  await expect(page.locator('#inspection-tools')).toBeHidden();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(true);
  await page.locator('#level-code').fill('face');
  await page.locator('#btn-submit').click();
  await expect(page.locator('#completion-screen')).toBeVisible();
  await expect(page.locator('#completion-chambers')).toHaveText('27 / 27');
  expect(errors).toEqual([]);
});
