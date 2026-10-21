import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

test('the games cupboard displays the four boxes, responds to knocks, and cleans up on navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', '35');
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced', ambientEffects: false }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
  const navigate = async key => {
    await evaluateApp(page, ({ services, ui }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
    await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  };
  await navigate('Kinetic');
  const cupboardTextures = () => evaluateApp(page, ({ game }) => game.textures.getTextureKeys().filter(key => key.startsWith('gc_')).sort());
  const initialTextures = await cupboardTextures();
  expect(initialTextures.length).toBeGreaterThan(4);

  // Four lids on the shelf
  const lidsCount = await evaluateApp(page, ({ services }) => services.levels.activeScene._lids?.length);
  expect(lidsCount).toBe(4);

  // Resize adjusts layout
  for (const size of [{ width: 1440, height: 1000 }, { width: 980, height: 720 }]) {
    await page.setViewportSize(size);
    await expect.poll(() => evaluateApp(page, ({ services }) => {
      const scene = services.levels.activeScene;
      const container = document.getElementById('game-container').getBoundingClientRect();
      return scene?._L?.width === Math.round(container.width);
    })).toBe(true);
  }

  // Knock on box
  await evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    scene._knock(scene._lids[0]);
  });

  // Navigation to another scene cleans up textures
  await navigate('Genome');
  expect(await cupboardTextures()).toEqual([]);
  await navigate('Kinetic');
  expect(await cupboardTextures()).toEqual(initialTextures);

  expect(errors).toEqual([]);
});
